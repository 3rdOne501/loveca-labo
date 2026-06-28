#!/usr/bin/env node
/**
 * 相手盤面に関わる能力を全件列挙（対戦モード本格実装用レジストリ）。
 * 用法: node scripts/audit-opponent-board-effects.mjs
 * 出力: docs/opponent-board-effects-registry.json
 *       docs/opponent-board-effects-registry.md
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
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

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

const KIND_LABELS = {
  read_compare: "相手状態の参照・比較（前提条件）",
  pick_self_or_opponent: "自分か相手の盤面を選んで解決",
  mutate_opponent_stage: "相手ステージ（ウェイト・アクティブ・退場等）",
  mutate_opponent_hand: "相手手札（捨て・公開・加える等）",
  mutate_opponent_waiting: "相手控え室",
  mutate_opponent_deck: "相手山札",
  mutate_opponent_live: "相手ライブ置き場",
  mutate_opponent_energy: "相手エネルギー",
  mutate_opponent_success_live: "相手成功ライブ置き場",
  both_players: "自分と相手はそれぞれ（同時処理）",
  opponent_choice: "相手の選択・任意行動",
  passive_opponent: "常時（相手状態を参照）",
  guided_manual: "手動ガイド（相手参照あり）",
};

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
  /function opponentStageTotalPrintedCost[\s\S]{0,4000}isDualOpponentBoardMode/.test(simSrc);

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
  return OPPONENT_DUAL_DELEGATE_HELPERS.some((fn) => chunk.indexOf(fn) >= 0);
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
  return Object.assign({}, cl.preconditionFilters || {}, cl.filters || {});
}

/** @param {string} text @param {import('../js/abilityEffects.js').ClassifiedAbility} cl @param {string} tmpl */
function detectOpponentKinds(text, cl, tmpl) {
  /** @type {Set<string>} */
  const kinds = new Set();
  const stripped = text.replace(SELF_ONLY_JIDOU_META, "");
  const f = mergedAbilityFilters(cl);

  if (tmpl === "guided_manual") kinds.add("guided_manual");
  if (tmpl === "passive_track" || tmpl === "jouji") kinds.add("passive_opponent");

  if (cl.pickSelfOrOpponent) kinds.add("pick_self_or_opponent");
  if (cl.oppWaitCount || cl.oppWaitMaxCost != null || cl.oppWaitMaxPrintedBlade != null || cl.oppWaitCostFromPicked) {
    kinds.add("mutate_opponent_stage");
  }
  if (cl.oppDeckDrawCount) kinds.add("mutate_opponent_deck");
  if (cl.grantOppLiveNeedHeart || cl.inactiveOpponentJoujiLiveNeedHeartBump) {
    kinds.add("mutate_opponent_live");
  }

  const readKeys = [
    "requiresOwnStageCostSumLowerThanOpponent",
    "requiresOwnStageHeartTotalHigherThanOpponent",
    "requiresCenterSeriesCostHigherThanOpponent",
    "requiresOwnSeriesCostSumHigherThanOpponent",
    "requiresStageMemberHigherThanAllOpponent",
    "requiresLiveScoreHigherThanOpponent",
    "requiresLiveScoreTieWithOpponent",
    "requiresSuccessLiveCountTieWithOpponent",
    "requiresOpponentHandLead",
    "requiresOpponentWaitMember",
    "minOpponentSuccessLiveCount",
    "minEitherSuccessLiveCount",
  ];
  if (readKeys.some((k) => f[k])) kinds.add("read_compare");
  if (f.minOpponentSuccessLiveCount != null) kinds.add("mutate_opponent_success_live");
  if (tmpl === "energy_less_than_opponent_wait") kinds.add("read_compare");

  if (/自分と相手はそれぞれ/.test(stripped)) kinds.add("both_players");
  if (/相手は/.test(stripped) && !/相手は見ない/.test(stripped)) kinds.add("opponent_choice");
  if (/相手のステージ/.test(stripped)) kinds.add("mutate_opponent_stage");
  if (/相手の手札/.test(stripped)) kinds.add("mutate_opponent_hand");
  if (/相手の控え室/.test(stripped)) kinds.add("mutate_opponent_waiting");
  if (/相手の山札|相手.*デッキ/.test(stripped)) kinds.add("mutate_opponent_deck");
  if (/相手のライブ/.test(stripped)) kinds.add("mutate_opponent_live");
  if (/相手のエネルギー/.test(stripped)) kinds.add("mutate_opponent_energy");
  if (/相手の成功ライブ/.test(stripped)) kinds.add("mutate_opponent_success_live");
  if (/相手より|相手の.*より/.test(stripped) && !kinds.has("read_compare")) kinds.add("read_compare");
  if (/自分か相手/.test(stripped) && !kinds.has("pick_self_or_opponent")) {
    if (/成功ライブ|ステージ|控え室|手札|ライブ/.test(stripped)) {
      kinds.add("read_compare");
    }
  }

  if (/^jidou_opp_/.test(tmpl) || tmpl === "jidou_area_move_opp_wait" || tmpl === "jidou_series_enter_opp_wait") {
    kinds.add("mutate_opponent_waiting");
  }
  if (/opp_/.test(tmpl) && tmpl.indexOf("opp_wait") < 0) {
    if (tmpl.indexOf("hand") >= 0) kinds.add("mutate_opponent_hand");
    if (tmpl.indexOf("stage") >= 0 || tmpl.indexOf("wait") >= 0) kinds.add("mutate_opponent_stage");
    if (tmpl.indexOf("energy") >= 0) kinds.add("mutate_opponent_energy");
    if (tmpl.indexOf("live") >= 0) kinds.add("mutate_opponent_live");
    if (tmpl.indexOf("deck") >= 0) kinds.add("mutate_opponent_deck");
  }

  if (kinds.size === 0 && /相手/.test(stripped)) kinds.add("read_compare");
  return [...kinds].sort();
}

/** @param {import('../js/abilityEffects.js').ClassifiedAbility} cl @param {string} tmpl @param {string} handler */
function resolveDualStatus(cl, tmpl, handler) {
  if (tmpl === "guided_manual") return "guided_manual";
  if (tmpl === "passive_track" || tmpl === "jouji") return "passive_track";
  if (placementRuntime.has(tmpl)) return "placement_runtime";

  const mf = mergedAbilityFilters(cl);
  const hasHandler = !!handler;
  let dualOk = chunkHasDualSupport(handler);
  if (
    !dualOk &&
    hasHandler &&
    preconditionHelpersDual &&
    new RegExp(PRECONDITION_FILTER_KEYS).test(handler)
  ) {
    dualOk = true;
  }
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
      mf.minEitherSuccessLiveCount != null ||
      mf.minOpponentSuccessLiveCount != null)
  ) {
    dualOk = true;
  }
  if (
    !dualOk &&
    tmpl === "yell_resolution_pick_hand" &&
    handler.indexOf("checkYellRevealedPreconditionFilters") >= 0 &&
    preconditionHelpersDual
  ) {
    dualOk = true;
  }
  if (!dualOk && cl && cl.pickSelfOrOpponent && handler.indexOf("openPickSelfOrOpponentDialog") >= 0) {
    dualOk = true;
  }

  const soloManual = chunkSoloManualOnly(handler);
  if (soloManual && !dualOk) return "solo_manual";
  if (dualOk && soloManual) return "dual_and_solo_manual";
  if (dualOk) return "dual_ok";
  if (!hasHandler) return "handler_unknown";
  return "dual_gap";
}

/** @param {string} id */
function setPrefix(id) {
  const m = id.match(/^(PL![A-Z!]*(?:-[a-z0-9]+)?)/i);
  return m ? m[1] : id.split("-").slice(0, 2).join("-");
}

/** @type {Array<object>} */
const rows = [];

for (const id of Object.keys(cards).sort()) {
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw) continue;
  const segs = splitAbilityByTriggers(raw).filter((s) => s.trigger);
  for (const seg of segs) {
    const trig = seg.trigger;
    const text = plain(seg.text);
    if (!/相手/.test(text)) continue;

    let cl;
    try {
      cl = classifyCardAbility(card, trig, seg.text);
    } catch (_) {
      continue;
    }
    const tmpl = cl && cl.template;
    if (!tmpl || tmpl === "none") continue;
    if (isOpponentMetaOnlyReference(text, tmpl)) continue;
    if (JIDOU_OPPONENT_TRIGGER_SELF_EFFECT.has(tmpl)) continue;

    const automated = abilityEffectIsAutomated(tmpl) || tmpl === "passive_track" || tmpl === "ability_sequence";
    const handler = handlerChunkForTemplate(tmpl);
    const kinds = detectOpponentKinds(text, cl, tmpl);
    const dualStatus = resolveDualStatus(cl, tmpl, handler);

    rows.push({
      id,
      name: card.name,
      set: setPrefix(id),
      trig,
      tmpl,
      automated,
      kinds,
      dualStatus,
      text: text.replace(/\s+/g, " ").trim().slice(0, 200),
    });
  }
}

const bySet = new Map();
for (const r of rows) {
  if (!bySet.has(r.set)) bySet.set(r.set, []);
  bySet.get(r.set).push(r);
}

const kindCounts = {};
for (const r of rows) {
  for (const k of r.kinds) {
    kindCounts[k] = (kindCounts[k] || 0) + 1;
  }
}

const dualCounts = {};
for (const r of rows) {
  dualCounts[r.dualStatus] = (dualCounts[r.dualStatus] || 0) + 1;
}

const payload = {
  generatedAt: new Date().toISOString(),
  purpose:
    "対戦モード（localDual / オンライン）本格実装時の実装・テスト計画用。ソロ代行入力で動くカードも含む。",
  totalEntries: rows.length,
  uniqueCards: new Set(rows.map((r) => r.id)).size,
  kindCounts,
  dualStatusCounts: dualCounts,
  rows,
};

fs.writeFileSync(path.join(ROOT, "docs/opponent-board-effects-registry.json"), JSON.stringify(payload, null, 2));

const md = [];
md.push("# 相手盤面効果レジストリ");
md.push("");
md.push("対戦モード（デュアル盤・オンライン）を本格実装するときの参照用。**相手の盤面・状態に関わる能力**を全件記録する。");
md.push("");
md.push("- **再生成**: `node scripts/audit-opponent-board-effects.mjs`");
md.push("- **機械可読**: [opponent-board-effects-registry.json](./opponent-board-effects-registry.json)");
md.push("- **デュアル未対応の疑い（高リスクのみ）**: [dual-mode-gap-audit.json](./dual-mode-gap-audit.json)（`node scripts/audit-dual-mode-gaps.mjs`）");
md.push("- **手動プレイ確認**: [play-verification-list.md](./play-verification-list.md)");
md.push("");
md.push(`生成: ${payload.generatedAt.slice(0, 10)} — **${payload.totalEntries}** 能力セグメント / **${payload.uniqueCards}** 枚`);
md.push("");
md.push("## dualStatus（実装状況の目安）");
md.push("");
md.push("| 値 | 意味 |");
md.push("|----|------|");
md.push("| `dual_ok` | デュアル盤分岐または委譲ヘルパーあり |");
md.push("| `dual_and_solo_manual` | デュアル対応だがソロ手入力も併存 |");
md.push("| `solo_manual` | ソロの相手代行入力のみ（デュアル分岐なし） |");
md.push("| `dual_gap` | 自動化済みだがデュアル分岐が未検出 |");
md.push("| `passive_track` | 常時効果（実行時ハンドラなし） |");
md.push("| `placement_runtime` | 成功ライブ移動等、別経路で処理 |");
md.push("| `guided_manual` | 手動ガイド |");
md.push("| `handler_unknown` | ハンドラ未検出 |");
md.push("");
md.push("## 相互作用種別（kinds）");
md.push("");
for (const [k, label] of Object.entries(KIND_LABELS)) {
  md.push(`- \`${k}\` (${kindCounts[k] || 0}): ${label}`);
}
md.push("");
md.push("## dualStatus 集計");
md.push("");
for (const [k, n] of Object.entries(dualCounts).sort((a, b) => b[1] - a[1])) {
  md.push(`- \`${k}\`: ${n}`);
}
md.push("");
md.push("## セット別一覧");
md.push("");

const prioritySets = [
  "PL!SP-bp2",
  "PL!S-bp2",
  "PL!HS-bp2",
  "PL!N-bp3",
  "PL!S-bp3",
  "PL!-bp3",
  "PL!N-bp4",
  "PL!SP-pb2",
];

const sortedSets = [...bySet.keys()].sort((a, b) => {
  const pa = prioritySets.indexOf(a);
  const pb = prioritySets.indexOf(b);
  if (pa >= 0 && pb >= 0) return pa - pb;
  if (pa >= 0) return -1;
  if (pb >= 0) return 1;
  return a.localeCompare(b);
});

for (const set of sortedSets) {
  const list = bySet.get(set);
  md.push(`### ${set} (${list.length})`);
  md.push("");
  md.push("| ID | 名前 | タイミング | template | kinds | dualStatus |");
  md.push("|----|------|------------|----------|-------|------------|");
  for (const r of list) {
    md.push(
      `| ${r.id} | ${r.name} | ${r.trig} | \`${r.tmpl}\` | ${r.kinds.join(", ")} | \`${r.dualStatus}\` |`,
    );
  }
  md.push("");
}

fs.writeFileSync(path.join(ROOT, "docs/opponent-board-effects-registry.md"), md.join("\n"));

console.log(`opponent-board-effects: ${rows.length} entries, ${payload.uniqueCards} cards`);
console.log("written: docs/opponent-board-effects-registry.json");
console.log("written: docs/opponent-board-effects-registry.md");
