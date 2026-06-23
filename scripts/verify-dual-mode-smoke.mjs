#!/usr/bin/env node
/**
 * デュアル盤対応のスモーク検証（相手参照カードの分類・ヘルパー存在）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCardAbility, cardAbilityRawText, splitAbilityByTriggers } from "../js/abilityEffects.js";
import { OPPONENT_DUAL_DELEGATE_HELPERS } from "../js/abilityRuntimeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

/** @type {Array<{id:string, trigger:string, check:string}>} */
const CASES = [
  { id: "PL!-bp4-001-P", trigger: "live_start", check: "requiresOwnStageCostSumLowerThanOpponent" },
  { id: "PL!-bp3-026-L", trigger: "live_success", check: "requiresOwnStageHeartTotalHigherThanOpponent" },
  { id: "PL!-bp5-024-L", trigger: "live_start", check: "ability_pick_one" },
  { id: "PL!S-bp5-002-R＋", trigger: "live_start", check: "live_start_side_cost_equal_opp_wait" },
  { id: "PL!-PR-014-PR", trigger: "toujyou", check: "toujou_opp_hand_reveal_no_live_draw" },
  { id: "PL!SP-pb2-009-R", trigger: "toujyou", check: "optional_pick_member_wait_opp_blade_gap" },
  { id: "PL!N-bp5-007-AR", trigger: "live_start", check: "requiresSuccessLiveCountTieWithOpponent" },
  { id: "PL!-bp5-021-L", trigger: "live_start", check: "live_start_sunny_day_song_tiered" },
  { id: "PL!N-bp4-001-P", trigger: "live_success", check: "energy_less_than_opponent_wait" },
  { id: "PL!S-pb1-008-P＋", trigger: "live_start", check: "deck_top_look_reorder_dual" },
  { id: "PL!HS-cl1-012-CL", trigger: "live_success", check: "requiresLiveScoreTieWithOpponent" },
  { id: "PL!-bp5-111-P＋", trigger: "kidou", check: "kidou_hand_discard_activate_wait_opp_bonus" },
];

let failed = 0;

for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  const cl = classifyCardAbility(card, c.trigger, seg && seg.text);
  const errs = [];
  if (c.check === "requiresOwnStageCostSumLowerThanOpponent") {
    if (!cl.filters?.requiresOwnStageCostSumLowerThanOpponent) errs.push("filter missing");
  } else if (c.check === "requiresOwnStageHeartTotalHigherThanOpponent") {
    if (!cl.filters?.requiresOwnStageHeartTotalHigherThanOpponent) errs.push("heart filter missing");
  } else if (c.check === "requiresSuccessLiveCountTieWithOpponent") {
    if (!cl.filters?.requiresSuccessLiveCountTieWithOpponent) errs.push("success live tie filter missing");
  } else if (c.check === "requiresLiveScoreTieWithOpponent") {
    if (!cl.filters?.requiresLiveScoreTieWithOpponent) errs.push("live score tie filter missing");
  } else if (c.check === "deck_top_look_reorder_dual") {
    if (cl.template !== "deck_top_look_reorder") errs.push(`template ${cl.template}`);
    if (!cl.pickSelfOrOpponent) errs.push("pickSelfOrOpponent missing");
    if (!simSrc.includes("openPickSelfOrOpponentDialog")) errs.push("dual pick dialog missing");
  } else if (c.check === "energy_less_than_opponent_wait") {
    if (cl.template !== "energy_less_than_opponent_wait") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("countOpponentEnergyCards")) errs.push("countOpponentEnergyCards missing");
  } else if (cl.template !== c.check) {
    errs.push(`template ${cl.template} != ${c.check}`);
  }
  if (!simSrc.includes("isDualOpponentBoardMode")) errs.push("no dual mode in simulator");
  const needDelegate =
    c.check.indexOf("optional_pick") >= 0 ||
    c.check.indexOf("opp_hand") >= 0 ||
    c.check.indexOf("side_cost_equal") >= 0 ||
    c.check === "ability_pick_one" ||
    c.check === "live_start_sunny_day_song_tiered";
  if (needDelegate) {
    const has =
      simSrc.includes(`cl.template === "${c.check}"`) ||
      (c.check === "ability_pick_one" && simSrc.includes('cl.template === "live_success_pick_options"'));
    if (!has) errs.push("handler marker missing");
    const delegateOk = OPPONENT_DUAL_DELEGATE_HELPERS.some((fn) => simSrc.includes(fn));
    if (!delegateOk) errs.push("dual delegate helpers missing");
  }
  if (
    c.check === "requiresOwnStageCostSumLowerThanOpponent" ||
    c.check === "requiresOwnStageHeartTotalHigherThanOpponent" ||
    c.check === "requiresSuccessLiveCountTieWithOpponent"
  ) {
    if (!simSrc.includes("opponentStageTotalPrintedCost")) errs.push("opponent cost helper missing");
  }
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.check);
  }
}

if (failed) {
  console.error(`\n${failed} dual-mode smoke check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} dual-mode smoke checks passed`);
