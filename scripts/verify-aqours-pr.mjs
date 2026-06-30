#!/usr/bin/env node
/** Aqours PR（PL!S-PR）代表カードの分類回帰 */
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
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-PR-013-PR",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 3 && cl.handDiscardToWaiting === 1 ? [] : ["deck3"]),
  },
  {
    id: "PL!S-PR-016-PR",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.bladeGain === 1 ? [] : ["blade1"]),
  },
  {
    id: "PL!S-PR-029-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!S-PR-029-PR"].ability);
      return rule.minCost13OnAnyStage === 13 && rule.bladeFlat === 2 ? [] : ["cost13 blade2"];
    },
  },
  {
    id: "PL!S-PR-037-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!S-PR-037-PR"].ability);
      return rule.exactStageMemberCount === 2 && rule.heartFlat?.[5] === 1 ? [] : ["stage2 heart05"];
    },
  },
  {
    id: "PL!S-PR-039-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!S-PR-039-PR"].ability);
      return rule.minCombinedSuccessLive === 4 && rule.bladeFlat === 2 ? [] : ["succ4 blade2"];
    },
  },
  {
    id: "PL!S-PR-040-PR",
    trigger: "jidou",
    expectTemplate: "jidou_yell_grant_jouji",
    check: () => {
      const rule = classifyJidouAutoSegment(cards["PL!S-PR-040-PR"].ability);
      return rule.minYellSameGroupMemberCount === 3 ? [] : ["group3"];
    },
  },
  {
    id: "PL!S-PR-041-PR",
    trigger: "toujyou",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
    check: (cl) =>
      cl.filters?.pickType === "ライブ" && cl.deckDrawOnSuccess === 1 ? [] : ["live draw1"],
  },
  {
    id: "PL!S-PR-042-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!S-PR-042-PR"].ability);
      return rule.minTotalMembersBothStages === 6 && rule.heartFlat?.[2] === 1 ? [] : ["6 heart02"];
    },
  },
  {
    id: "PL!S-PR-013-PR",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) =>
      cl.costEnergy && cl.costEnergyCount === 2 && cl.bladeGain === 2 ? [] : ["E2 blade2"],
  },
  {
    id: "PL!S-PR-025-PR",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["member"]),
  },
  {
    id: "PL!S-PR-026-PR",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["live"]),
  },
  {
    id: "PL!S-PR-027-PR",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["member"]),
  },
  {
    id: "PL!S-PR-028-PR",
    trigger: "toujyou",
    expectTemplate: "deck_top_look_reorder",
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["deck3"]),
  },
  {
    id: "PL!S-PR-030-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!S-PR-030-PR"].ability);
      return rule.minCost13OnAnyStage === 13 && rule.bladeFlat === 2 ? [] : ["cost13 blade2"];
    },
  },
  {
    id: "PL!S-PR-038-PR",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.costSelfWait && cl.deckDrawCount === 1 ? [] : ["wait draw"]),
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
  console.error(`${errors.length} verify-aqours-pr failure(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log(`verify-aqours-pr OK (${CASES.length} cases)`);
