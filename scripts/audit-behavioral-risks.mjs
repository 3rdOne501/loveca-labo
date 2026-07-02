#!/usr/bin/env node
/**
 * 能力セグメントごとの行動リスク（バグ・モード制限・手動依存）を総合監査。
 * 用法: node scripts/audit-behavioral-risks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";
import { classifyJidouAutoSegment, jidouEffectIsAutomated } from "../js/jidouAutoEffects.js";
import {
  ABILITY_PLACEMENT_RUNTIME_TEMPLATES,
  JIDOU_AUTO_TEMPLATES,
  TEMPLATES_META_IN_EXECUTE_BODY,
} from "../js/abilityRuntimeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SEGMENT_TRIGGERS = ["kidou", "toujyou", "live_start", "live_success", "jouji", "jidou"];

/** @type {Record<string, string>} */
const ISSUE_SEVERITY = {
  jouji_yell_score_bug: "confirmed_bug",
  either_success_live_wrong_filters: "confirmed_bug",
  yell_resolution_at_live_success: "confirmed_bug",
  handler_missing: "confirmed_bug",
  jouji_unparsed: "high_risk",
  opp_wait_blade_mismatch: "high_risk",
  both_players_partial: "high_risk",
  window_confirm_dependency: "high_risk",
  solo_opponent_prompt: "mode_limited",
  versus_online_skip: "mode_limited",
  unautomated: "acceptable_manual",
};

const SEVERITY_RANK = {
  confirmed_bug: 4,
  high_risk: 3,
  mode_limited: 2,
  acceptable_manual: 1,
};

const SOLO_OPPONENT_TEMPLATE_KEYS = new Set([
  "energy_less_than_opponent_wait",
  "live_success_tie_block_success_live",
]);

const SOLO_OPPONENT_FILTER_KEYS = [
  "requiresOpponentHandLead",
  "requiresLiveScoreTieWithOpponent",
  "requiresOwnStageHeartTotalHigherThanOpponent",
  "requiresOwnStageCostSumLowerThanOpponent",
  "requiresSuccessLiveCountTieWithOpponent",
];

/** @param {string} src @param {string} startMarker @param {string} endMarker */
function sectionBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return src.slice(start, end);
}

/** @param {string} chunk @returns {Set<string>} */
function templatesFromChunk(chunk) {
  const set = new Set();
  const re = /cl\.template\s*===\s*["']([a-z0-9_]+)["']/g;
  let m;
  while ((m = re.exec(chunk))) set.add(m[1]);
  return set;
}

function segmentPlainText(raw) {
  return String(raw || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
}

/** 能力文中のインライン {{jyouji}} 参照をスキップ（abilityEffects と同ロジック） */
function isInlineJoujiReference(segs, index) {
  if (index <= 0 || !segs[index] || segs[index].trigger !== "jouji") return false;
  const prev = segs[index - 1];
  if (!prev || !prev.trigger || prev.trigger === "jouji") return false;
  const prevPlain = segmentPlainText(prev.text);
  const plain = segmentPlainText(segs[index].text);
  if (/[かも]$/.test(prevPlain) || /または$/.test(prevPlain)) {
    if (/^能力を持/.test(plain)) return true;
  }
  const prevText = String(prev.text || "");
  if (/「/.test(prevText) && !/」/.test(prevText)) return true;
  if (/ライブ終了時まで/.test(prevText) && /を得る/.test(String(segs[index].text || ""))) return true;
  return false;
}

/** @param {string} body @param {string} tmpl @returns {string} */
function handlerChunkForTemplate(body, tmpl) {
  const marker = `cl.template === "${tmpl}"`;
  const idx = body.indexOf(marker);
  if (idx < 0) return "";
  const slice = body.slice(idx, idx + 14000);
  const next = slice.search(/\n    if \(cl\.template === "/);
  return next > 0 ? slice.slice(0, next) : slice;
}

/** @param {string} executeBody @param {string} runJidou @param {string} runJidouLiveCard @returns {Set<string>} */
function discoverVersusOnlineSkipTemplates(executeBody, runJidou, runJidouLiveCard) {
  /** @type {Set<string>} */
  const out = new Set();
  for (const body of [executeBody, runJidou, runJidouLiveCard]) {
    const re = /if \(cl\.template === "([a-z0-9_]+)"\)/g;
    let m;
    while ((m = re.exec(body))) {
      const tmpl = m[1];
      const chunk = handlerChunkForTemplate(body, tmpl);
      if (
        /versusOnlineActive\(\)/.test(chunk) &&
        !/whenOpponentPlayMode\(/.test(chunk) &&
        /* Phase 4: online 効果プロトコル経由なら「スキップ」ではない */
        !/runVersusOnlineOpponent(Mutate|Choice)\(/.test(chunk) &&
        /相手/.test(chunk) &&
        /(finishResolved|finishGuided|showToast\([^)]*相手)/.test(chunk)
      ) {
        out.add(tmpl);
      }
    }
  }
  return out;
}

/** @param {string} executeBody @param {string} runJidou @param {string} runJidouLiveCard @returns {Set<string>} */
function discoverWindowConfirmTemplates(executeBody, runJidou, runJidouLiveCard) {
  /** @type {Set<string>} */
  const out = new Set();
  for (const body of [executeBody, runJidou, runJidouLiveCard]) {
    const re = /if \(cl\.template === "([a-z0-9_]+)"\)/g;
    let m;
    while ((m = re.exec(body))) {
      const tmpl = m[1];
      const chunk = handlerChunkForTemplate(body, tmpl);
      if (/window\.confirm/.test(chunk) && !TEMPLATES_META_IN_EXECUTE_BODY.includes(tmpl)) {
        out.add(tmpl);
      }
    }
  }
  return out;
}

function plain(seg) {
  return String(seg || "").replace(/\{\{[^}]*\}\}/g, "");
}

function loadHandlerSets(simSrc) {
  const executeBody = sectionBetween(
    simSrc,
    "function executeAbilityBody(inst, cl, kind, finishResolved, finishGuided)",
    "\n  function removeStageMemberToWaiting(memberInst)",
  );
  const runJidou = sectionBetween(
    simSrc,
    "function runJidouAutoEffect(memberInst, cl, segRaw, segIndex, ctx)",
    "function finishJidouAutoRender()",
  );
  const runJidouLiveCard = sectionBetween(
    simSrc,
    "function runJidouLiveCardAutoEffect(liveInst, cl, segRaw, segIndex, ctx)",
    "function fireJidouAutoForLiveCard(liveInst, eventKind, ctx)",
  );
  const runJidouLiveBoard = sectionBetween(
    simSrc,
    "function runJidouLiveBoardEffect(liveInst, cl, segRaw, segIndex, ctx)",
    "function fireJidouOnStageMemberAbilityResolved(memberInst, triggerKind)",
  );
  const executeTemplates = templatesFromChunk(executeBody);
  const jidouTemplates = new Set([
    ...templatesFromChunk(runJidou),
    ...templatesFromChunk(runJidouLiveCard),
    ...templatesFromChunk(runJidouLiveBoard),
  ]);
  const placementRuntime = new Set(ABILITY_PLACEMENT_RUNTIME_TEMPLATES);
  const jidouAutomated = new Set(JIDOU_AUTO_TEMPLATES);

  /** @param {string} tmpl */
  function templateHasHandler(tmpl) {
    if (!tmpl || tmpl === "none") return true;
    if (TEMPLATES_META_IN_EXECUTE_BODY.includes(tmpl)) return true;
    if (placementRuntime.has(tmpl)) return true;
    if (jidouAutomated.has(tmpl)) {
      return jidouTemplates.has(tmpl) || executeTemplates.has(tmpl);
    }
    if (abilityEffectIsAutomated(tmpl)) {
      return executeTemplates.has(tmpl);
    }
    if (jidouEffectIsAutomated(tmpl)) {
      return jidouTemplates.has(tmpl) || executeTemplates.has(tmpl);
    }
    return true;
  }

  const yellResolutionArchive =
    simSrc.includes("liveTurnYellRevealedCardIds") && simSrc.includes("yellResolutionRevealPool");
  const opponentStatOnlineSupport =
    simSrc.includes("getVersusOpponentPublicBoardNow") && simSrc.includes("whenOpponentPlayMode");

  return {
    executeBody,
    runJidou,
    yellResolutionArchive,
    opponentStatOnlineSupport,
    versusSkipTemplates: discoverVersusOnlineSkipTemplates(executeBody, runJidou, runJidouLiveCard),
    windowConfirmTemplates: discoverWindowConfirmTemplates(executeBody, runJidou, runJidouLiveCard),
    templateHasHandler,
  };
}

/**
 * @param {object} ctx
 * @returns {Array<object>}
 */
function checkSegment(ctx) {
  const { card, id, trig, text, segRaw, cl, tmpl, handlers } = ctx;
  /** @type {Array<{issueType: string, severity: string, detail: string}>} */
  const issues = [];

  function push(issueType, detail) {
    issues.push({
      issueType,
      severity: ISSUE_SEVERITY[issueType] || "high_risk",
      detail,
    });
  }

  if (tmpl === "guided_manual" || tmpl === "jidou_manual") {
    push("unautomated", `template=${tmpl}`);
  }

  if (trig === "jouji" && tmpl === "passive_track") {
    const rule = classifyJoujiSegment(segRaw || text);
    if (!rule) {
      push("jouji_unparsed", "classifyJoujiSegment returned null");
    } else if (
      /エールにより公開|エールによって公開/.test(text) &&
      rule.kind === "stage_all_areas_series_distinct_score"
    ) {
      push(
        "jouji_yell_score_bug",
        `エール条件付きだが kind=${rule.kind}（常時スコア付与の疑い）`,
      );
    }
  }

  const filters = Object.assign({}, cl?.preconditionFilters || {}, cl?.filters || {});
  if (
    /自分か相手の成功ライブ/.test(text) &&
    (filters.minSuccessLiveCount != null || filters.minOpponentSuccessLiveCount != null)
  ) {
    push(
      "either_success_live_wrong_filters",
      `minSuccessLiveCount=${filters.minSuccessLiveCount} minOpponentSuccessLiveCount=${filters.minOpponentSuccessLiveCount}（minEitherSuccessLiveCount のみであるべき）`,
    );
  }

  if (
    tmpl === "optional_self_wait_opp_stage" &&
    /元々ブレード|ブレード.*以下/.test(text) &&
    (cl.oppWaitMaxPrintedBlade == null || cl.oppWaitMaxPrintedBlade === undefined)
  ) {
    push("opp_wait_blade_mismatch", "blade limit in text but oppWaitMaxPrintedBlade unset");
  }

  if (
    trig === "live_success" &&
    /^yell_resolution_/.test(tmpl) &&
    !handlers.yellResolutionArchive
  ) {
    push(
      "yell_resolution_at_live_success",
      `${tmpl} on live_success — uses resolutionArea at live success FX, not yell moment`,
    );
  }

  if (SOLO_OPPONENT_TEMPLATE_KEYS.has(tmpl) && !handlers.opponentStatOnlineSupport) {
    push("solo_opponent_prompt", `template=${tmpl} requires solo opponent board input`);
  }
  if (!handlers.opponentStatOnlineSupport) {
    for (const fk of SOLO_OPPONENT_FILTER_KEYS) {
      const v = filters[fk];
      if (v != null && v !== false) {
        push("solo_opponent_prompt", `filter ${fk}=${JSON.stringify(v)}`);
        break;
      }
    }
  }

  if (handlers.versusSkipTemplates.has(tmpl) && /相手/.test(text)) {
    push("versus_online_skip", `template=${tmpl} skips opponent ops when versusOnlineActive()`);
  }

  if (/自分と相手はそれぞれ/.test(text) && !/both_|toujou_both|_both_/.test(tmpl)) {
    push("both_players_partial", `双方効果テキストだが template=${tmpl}`);
  }

  if (handlers.windowConfirmTemplates.has(tmpl)) {
    push("window_confirm_dependency", `template=${tmpl} uses window.confirm for core effect path`);
  }

  if (
    tmpl &&
    tmpl !== "none" &&
    tmpl !== "guided_manual" &&
    tmpl !== "jidou_manual" &&
    tmpl !== "passive_track" &&
    (abilityEffectIsAutomated(tmpl) || jidouEffectIsAutomated(tmpl)) &&
    !handlers.templateHasHandler(tmpl)
  ) {
    push("handler_missing", `automated template=${tmpl} has no simulator handler`);
  }

  return issues;
}

function main() {
  const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
  const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");
  const handlers = loadHandlerSets(simSrc);

  const cardIds = Object.keys(cards);
  /** @type {Array<object>} */
  const findings = [];
  /** @type {Record<string, number>} */
  const countByIssueType = {};
  let segmentsScanned = 0;

  for (const id of cardIds) {
    const card = cards[id];
    const raw = cardAbilityRawText(card);
    if (!raw) continue;

    const segs = splitAbilityByTriggers(raw);
    for (let si = 0; si < segs.length; si++) {
      const seg = segs[si];
      const trig = seg.trigger;
      if (!trig || !SEGMENT_TRIGGERS.includes(trig)) continue;
      if (trig === "jouji" && isInlineJoujiReference(segs, si)) continue;

      const text = plain(seg.text);
      const segPlain = segmentPlainText(seg.text);
      if (!segPlain || segPlain === "/" || segPlain === "を得る。" || segPlain === "を得る") continue;

      segmentsScanned += 1;

      let cl;
      let tmpl;
      try {
        if (trig === "jidou") {
          cl = classifyJidouAutoSegment(seg.text);
          tmpl = (cl && cl.template) || "jidou_manual";
        } else {
          cl = classifyCardAbility(card, trig, seg.text);
          tmpl = (cl && cl.template) || "none";
        }
      } catch (e) {
        findings.push({
          id,
          name: card.name || "",
          trigger: trig,
          template: "classify_error",
          issueType: "classify_error",
          severity: "high_risk",
          detail: e.message,
          textPreview: text.slice(0, 120),
        });
        countByIssueType.classify_error = (countByIssueType.classify_error || 0) + 1;
        continue;
      }

      const issues = checkSegment({
        card,
        id,
        trig,
        text,
        segRaw: seg.text,
        cl,
        tmpl,
        handlers,
      });

      for (const iss of issues) {
        const dedupeKey = `${id}::${iss.issueType}`;
        if (findings.some((f) => f.dedupeKey === dedupeKey)) continue;

        countByIssueType[iss.issueType] = (countByIssueType[iss.issueType] || 0) + 1;
        findings.push({
          dedupeKey,
          id,
          name: card.name || "",
          trigger: trig,
          template: tmpl,
          issueType: iss.issueType,
          severity: iss.severity,
          detail: iss.detail,
          textPreview: text.slice(0, 120),
        });
      }
    }
  }

  /** @type {Map<string, {id: string, name: string, maxSeverity: string, maxRank: number, issues: object[]}>} */
  const byCard = new Map();
  for (const f of findings) {
    const rank = SEVERITY_RANK[f.severity] || 0;
    if (!byCard.has(f.id)) {
      byCard.set(f.id, {
        id: f.id,
        name: f.name,
        maxSeverity: f.severity,
        maxRank: rank,
        issues: [f],
      });
    } else {
      const row = byCard.get(f.id);
      row.issues.push(f);
      if (rank > row.maxRank) {
        row.maxRank = rank;
        row.maxSeverity = f.severity;
      }
    }
  }

  const topCards = [...byCard.values()]
    .sort((a, b) => b.maxRank - a.maxRank || b.issues.length - a.issues.length || a.id.localeCompare(b.id))
    .slice(0, 30);

  const output = {
    generatedAt: new Date().toISOString(),
    totalCards: cardIds.length,
    segmentsScanned,
    findingCount: findings.length,
    uniqueCardsWithFindings: byCard.size,
    countByIssueType,
    countBySeverity: Object.fromEntries(
      Object.entries(
        findings.reduce((acc, f) => {
          acc[f.severity] = (acc[f.severity] || 0) + 1;
          return acc;
        }, {}),
      ),
    ),
    versusOnlineSkipTemplates: [...handlers.versusSkipTemplates].sort(),
    windowConfirmTemplates: [...handlers.windowConfirmTemplates].sort(),
    findings,
    topCards: topCards.map((c) => ({
      id: c.id,
      name: c.name,
      maxSeverity: c.maxSeverity,
      issueCount: c.issues.length,
      issues: c.issues.map((i) => ({
        issueType: i.issueType,
        severity: i.severity,
        trigger: i.trigger,
        template: i.template,
        detail: i.detail,
      })),
    })),
  };

  const outPath = path.join(ROOT, "docs/behavioral-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log("=== BEHAVIORAL RISK AUDIT ===");
  console.log(`Total cards scanned: ${cardIds.length}`);
  console.log(`Segments scanned: ${segmentsScanned}`);
  console.log(`Findings (deduped): ${findings.length}`);
  console.log(`Unique cards with findings: ${byCard.size}`);
  console.log("");
  console.log("Count per issue type:");
  const sortedTypes = Object.entries(countByIssueType).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [k, v] of sortedTypes) {
    console.log(`  ${k}: ${v} (${ISSUE_SEVERITY[k] || "?"})`);
  }
  console.log("");
  console.log("Top 30 highest-severity unique cards:");
  topCards.forEach((c, i) => {
    console.log(`${i + 1}. [${c.maxSeverity}] ${c.id} ${c.name} (${c.issues.length} issues)`);
    for (const iss of c.issues) {
      console.log(`   - ${iss.issueType}: ${iss.detail} (${iss.trigger}=${iss.template})`);
    }
  });
  console.log(`\nwritten: ${path.relative(ROOT, outPath)}`);
}

main();
