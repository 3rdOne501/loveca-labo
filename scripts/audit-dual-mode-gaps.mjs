#!/usr/bin/env node
/**
 * 自動化済み能力のうち、相手参照があり対戦（デュアル盤）で手動フォールバックが残る疑いを列挙。
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
import {
  ABILITY_PLACEMENT_RUNTIME_TEMPLATES,
  OPPONENT_DUAL_DELEGATE_HELPERS,
} from "../js/abilityRuntimeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

function sectionBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return src.slice(start, end);
}

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
const executeChoiceBody = sectionBetween(
  simSrc,
  "function executeAbilityChoiceText(text, inst, cl, kind, onDone)",
  "function openAbilityMultiChoiceDialog",
);

const placementRuntime = new Set(ABILITY_PLACEMENT_RUNTIME_TEMPLATES);

const preconditionHelpersDual =
  /function checkAbilityBoardPickFilters[\s\S]{0,14000}isDualOpponentBoardMode/.test(simSrc) &&
  /function opponentStageTotalPrintedCost[\s\S]{0,4000}isDualOpponentBoardMode/.test(simSrc) &&
  /requiresLiveScoreHigherThanOpponent/.test(simSrc) &&
  /countOpponentEnergyCards/.test(simSrc);

const SELF_ONLY_JIDOU_META =
  /\(対戦相手のカードの効果でも発動する[。.]?\)|\(相手のカードの効果でも発動する[。.]?\)/;

const JIDOU_OPPONENT_TRIGGER_SELF_EFFECT = new Set(["jidou_opp_wait_draw", "jidou_energy_placed_grant"]);

const PRECONDITION_FILTER_KEYS = [
  "checkAbility(?:LiveStart|LiveSuccess|Toujyou|Kidou)Preconditions",
  "checkCardScorePlusPreconditions",
  "ownSeriesCostSumHigherThanOpponent",
  "opponentStageTotal",
  "countBothPlayersStageMembers",
  "countOpponentSuccessLiveCards",
  "countOpponentHandCards",
  "countOpponentEnergyCards",
  "soloEnergyLessThanOpponent",
  "ownLiveScoreEstimate",
  "opponentLiveScoreEstimate",
  "setBlockEffectMemberActivateTurn",
  "setLiveSessionBlockSuccessLivePlacement",
].join("|");

/** @param {string} tmpl @returns {string} */
function handlerChunkForTemplate(tmpl) {
  const marker = `cl.template === "${tmpl}"`;
  let idx = executeBody.indexOf(marker);
  let src = executeBody;
  if (idx < 0) {
    idx = runJidou.indexOf(marker);
    src = runJidou;
  }
  if (idx < 0) return "";
  const slice = src.slice(idx, idx + 12000);
  const next = slice.search(/\n    if \(cl\.template === "/);
  let chunk = next > 0 ? slice.slice(0, next) : slice;
  if (tmpl === "ability_pick_one" || tmpl === "live_success_pick_options") {
    chunk += executeChoiceBody;
  }
  if (tmpl === "ability_sequence") {
    chunk += sectionBetween(simSrc, "function executeAbilitySequence(", "function executeAbilityBody(");
  }
  return chunk;
}

/** @param {string} chunk */
function chunkHasDualSupport(chunk) {
  if (!chunk) return false;
  if (/isDualOpponentBoardMode/.test(chunk)) return true;
  return OPPONENT_DUAL_DELEGATE_HELPERS.some(function (fn) {
    return chunk.indexOf(fn) >= 0;
  });
}

/** @param {string} chunk */
function chunkSoloManualOnly(chunk) {
  if (!chunk) return false;
  if (chunkHasDualSupport(chunk)) return false;
  if (/window\.(prompt|confirm)/.test(chunk)) return true;
  if (/soloOpponentHasWait|soloOpponentSuccessLiveCount|soloOpponentStageMemberCount|soloOpponentStageHeartTotal/.test(chunk)) {
    return true;
  }
  if (/（手動）/.test(chunk)) return true;
  return false;
}

function plain(seg) {
  return String(seg || "").replace(/\{\{[^}]*\}\}/g, "");
}

/** @param {string} text @param {string} tmpl */
function isOpponentMetaOnlyReference(text, tmpl) {
  const stripped = text.replace(SELF_ONLY_JIDOU_META, "");
  if (!/相手/.test(stripped)) return true;
  if (
    (tmpl === "jidou_area_move_grant_jouji" ||
      tmpl === "jidou_area_move_draw" ||
      tmpl === "jidou_energy_placed_grant") &&
    SELF_ONLY_JIDOU_META.test(text) &&
    !/相手の(ステージ|手札|控え室|ライブ|エネルギー|成功ライブ)/.test(stripped)
  ) {
    return true;
  }
  if (tmpl === "kidou_hand_reveal_grant_if_live" && /相手は見ない/.test(text)) return true;
  return false;
}

/** @param {import('../js/abilityEffects.js').ClassifiedAbility} cl */
function mergedAbilityFilters(cl) {
  return Object.assign({}, cl && cl.preconditionFilters, cl && cl.filters);
}

/** @param {import('../js/abilityEffects.js').ClassifiedAbility} cl */
function classifiedStepsDualOk(cl) {
  const steps = cl && cl.steps;
  if (!Array.isArray(steps) || !steps.length) return false;
  return steps.every(function (step) {
    const stepChunk = handlerChunkForTemplate(step.template);
    if (chunkHasDualSupport(stepChunk)) return true;
    if (
      preconditionHelpersDual &&
      step.filters &&
      (step.filters.requiresCenterSeriesCostHigherThanOpponent ||
        step.filters.requiresOwnStageCostSumLowerThanOpponent ||
        step.filters.requiresOwnStageHeartTotalHigherThanOpponent ||
        step.filters.requiresLiveScoreHigherThanOpponent ||
        step.filters.requiresLiveScoreTieWithOpponent ||
        step.filters.minOpponentSuccessLiveCount != null)
    ) {
      return true;
    }
    return chunkSoloManualOnly(stepChunk) === false && new RegExp(PRECONDITION_FILTER_KEYS).test(stepChunk);
  });
}

const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
/** @type {Array<object>} */
const rows = [];

for (const id of Object.keys(cards)) {
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw) continue;
  const segs = splitAbilityByTriggers(raw).filter((s) => s.trigger);
  for (const seg of segs) {
    const trig = seg.trigger;
    let cl;
    try {
      cl = classifyCardAbility(card, trig, seg.text);
    } catch (_) {
      continue;
    }
    const tmpl = cl && cl.template;
    if (!tmpl || tmpl === "none" || tmpl === "guided_manual") continue;
    if (!abilityEffectIsAutomated(tmpl) && tmpl !== "passive_track" && tmpl !== "ability_sequence") continue;

    const text = plain(seg.text);
    if (!/相手/.test(text)) continue;
    if (isOpponentMetaOnlyReference(text, tmpl)) continue;
    if (JIDOU_OPPONENT_TRIGGER_SELF_EFFECT.has(tmpl)) continue;

    if (placementRuntime.has(tmpl)) continue;

    const handler = handlerChunkForTemplate(tmpl);
    const hasHandler = !!handler;
    let dualOk = chunkHasDualSupport(handler);
    if (!dualOk && tmpl === "ability_sequence") {
      dualOk = classifiedStepsDualOk(cl);
    }
    if (
      !dualOk &&
      hasHandler &&
      preconditionHelpersDual &&
      new RegExp(PRECONDITION_FILTER_KEYS).test(handler)
    ) {
      dualOk = true;
    }
    const mf = mergedAbilityFilters(cl);
    if (
      !dualOk &&
      cl &&
      preconditionHelpersDual &&
      (mf.requiresLiveScoreHigherThanOpponent ||
        mf.requiresLiveScoreTieWithOpponent ||
        mf.requiresOpponentHandLead != null ||
        mf.requiresCenterSeriesCostHigherThanOpponent ||
        mf.requiresOwnStageCostSumLowerThanOpponent ||
        mf.requiresOwnStageHeartTotalHigherThanOpponent ||
        mf.minEitherSuccessLiveCount != null)
    ) {
      dualOk = true;
    }
    if (!dualOk && cl && cl.pickSelfOrOpponent && handler.indexOf("openPickSelfOrOpponentDialog") >= 0) {
      dualOk = true;
    }
    const soloManual = chunkSoloManualOnly(handler);

    const flags = [];
    if (tmpl === "passive_track") flags.push("passive_track(実行時ハンドラなし)");
    if (!hasHandler && tmpl !== "passive_track") flags.push("handler未検出");
    if (soloManual) flags.push("ソロ入力のみ");
    if (!dualOk && hasHandler && tmpl !== "passive_track") flags.push("デュアル分岐なし");
    if (dualOk && /（手動）/.test(handler) && !/isDualOpponentBoardMode/.test(handler)) {
      flags.push("デュアル+ソロ手動併存");
    }

    const risk =
      (flags.includes("ソロ入力のみ") ? 4 : 0) +
      (flags.includes("デュアル+ソロ手動併存") ? 3 : 0) +
      (flags.includes("デュアル分岐なし") && tmpl !== "passive_track" ? 2 : 0) +
      (flags.includes("handler未検出") ? 2 : 0) +
      (flags.includes("passive_track(実行時ハンドラなし)") ? 1 : 0);

    if (risk < 2) continue;

    rows.push({
      id,
      name: card.name,
      trig,
      tmpl,
      risk,
      flags,
      text: text.slice(0, 120),
    });
  }
}

rows.sort((a, b) => b.risk - a.risk || a.id.localeCompare(b.id));

const byKey = new Map();
for (const r of rows) {
  const k = `${r.name}||${r.trig}||${r.tmpl}||${r.flags.join(",")}`;
  if (!byKey.has(k)) byKey.set(k, { ...r, variants: [r.id] });
  else byKey.get(k).variants.push(r.id);
}
const deduped = [...byKey.values()];

console.log("=== DUAL-MODE GAP AUDIT (automated + 相手参照) ===");
console.log("候補:", deduped.length);
console.log("");
deduped.slice(0, 40).forEach((r, i) => {
  console.log(
    `${i + 1}. [${r.risk}] ${r.id}${r.variants.length > 1 ? ` +${r.variants.length - 1}` : ""} ${r.name}`,
  );
  console.log(`   ${r.trig}=${r.tmpl} | ${r.flags.join(" / ")}`);
});
if (deduped.length > 40) console.log(`... +${deduped.length - 40} more`);

fs.writeFileSync(
  path.join(ROOT, "docs/dual-mode-gap-audit.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: deduped.length, rows: deduped }, null, 2),
);
console.log("\nwritten: docs/dual-mode-gap-audit.json");
