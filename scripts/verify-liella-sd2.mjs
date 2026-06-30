#!/usr/bin/env node
/** Liella! sd2 cheer（PL!SP-sd2）スタートデッキ代表カードの分類回帰 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!SP-sd2-001-SD2",
    trigger: "live_start",
    expectTemplate: "live_start_draw_then_formation_change",
    check: (cl) => (cl.deckDrawCount === 1 ? [] : ["draw1"]),
  },
  {
    id: "PL!SP-sd2-002-SD2",
    trigger: "kidou",
    expectTemplate: "live_start_position_change",
    check: (cl) =>
      cl.costEnergy && cl.costEnergyCount === 2 && cl.perTurnLimit === 1 ? [] : ["E2 turn1"],
  },
  {
    id: "PL!SP-sd2-003-SD2",
    trigger: "live_success",
    expectTemplate: "draw_then_conditional_extra_draw",
    check: (cl) => (cl.extraDrawCondType === "selfMovedThisTurn" ? [] : ["selfMoved"]),
  },
  {
    id: "PL!SP-sd2-005-SD2",
    trigger: "toujyou",
    expectTemplate: "live_start_position_change",
    check: (cl) => (cl.optional && cl.hasOptionalCost ? [] : ["optional"]),
  },
  {
    id: "PL!SP-sd2-006-SD2",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.costEnergy &&
      cl.costEnergyCount === 2 &&
      cl.filters?.seriesTag === "Liella!" &&
      cl.filters?.pickType === "ライブ"
        ? []
        : ["E2 liella live"],
  },
  {
    id: "PL!SP-sd2-008-SD2",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!SP-sd2-008-SD2"].ability);
      return rule.minCost13OnAnyStage === 13 && rule.heartFlat?.[3] === 1 ? [] : ["cost13 heart03"];
    },
  },
  {
    id: "PL!SP-sd2-009-SD2",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.deckDrawCount === 1 ? [] : ["draw1"]),
  },
  {
    id: "PL!SP-sd2-020-SD2",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.grantToSelfAndOtherSeriesTag === "Liella!" &&
      cl.filters?.minEnergyCount === 7 &&
      cl.bladeGain === 1
        ? []
        : ["self+other E7 blade1"],
  },
  {
    id: "PL!SP-sd2-023-SD2",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_set_fixed",
    check: (cl) =>
      cl.cardScoreGrant === 5 &&
      cl.filters?.minSuccessLiveCount === 2 &&
      cl.needHeartSetMap?.heart02 === 3
        ? []
        : ["score5 succ2 hearts"],
  },
  {
    id: "PL!SP-sd2-025-SD2",
    trigger: "live_start",
    expectTemplate: "live_start_moved_members_blade_grant",
    check: (cl) =>
      cl.filters?.seriesTag === "Liella!" && cl.bladeGain === 1 ? [] : ["liella blade"],
  },
];

/** @type {string[]} */
const errors = [];

for (const tc of CASES) {
  const card = cards[tc.id];
  if (!card) {
    errors.push(`${tc.id}: card missing`);
    continue;
  }
  const raw = cardAbilityRawText(card);
  const seg = splitAbilityByTriggers(raw).find((s) => s.trigger === tc.trigger);
  if (!seg) {
    errors.push(`${tc.id}: trigger ${tc.trigger} missing`);
    continue;
  }
  const cl = classifyCardAbility(card, tc.trigger, seg.text);
  if (cl.template !== tc.expectTemplate) {
    errors.push(`${tc.id} ${tc.trigger}: expected ${tc.expectTemplate}, got ${cl.template}`);
    continue;
  }
  if (!abilityEffectIsAutomated(cl.template) && cl.template !== "passive_track") {
    errors.push(`${tc.id} ${tc.trigger}: not automated`);
    continue;
  }
  if (tc.check) {
    const sub = tc.check(cl);
    if (sub.length) errors.push(`${tc.id} ${tc.trigger}: ${sub.join(", ")}`);
  }
}

if (errors.length) {
  console.error(`${errors.length} verify-liella-sd2 failure(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log(`verify-liella-sd2 OK (${CASES.length} cases)`);
