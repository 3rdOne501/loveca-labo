#!/usr/bin/env node
/** 蓮ノ空 PR（PL!HS-PR）代表カードの分類回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!HS-PR-001-PR",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 3 && cl.handDiscardToWaiting === 1 ? [] : ["deck3"]),
  },
  {
    id: "PL!HS-PR-001-PR",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => (cl.costEnergy && cl.costEnergyCount === 2 && cl.bladeGain === 1 ? [] : ["E2 blade1"]),
  },
  {
    id: "PL!HS-PR-016-PR",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_same_unit_grant",
    check: (cl) => (cl.handDiscardExact === 2 && cl.bladeGain === 2 ? [] : ["unit2 blade2"]),
  },
  {
    id: "PL!HS-PR-019-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_deck_top_wait_if_all_heart",
    check: (cl) =>
      cl.deckTopCount === 3 && cl.requiredHeartSlot === 4 ? [] : ["deck3 heart04 grant"],
  },
  {
    id: "PL!HS-PR-021-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_deck_top_wait_if_all_heart",
    check: (cl) =>
      cl.deckTopCount === 3 && cl.requiredHeartSlot === 1 ? [] : ["deck3 heart01 grant"],
  },
  {
    id: "PL!HS-PR-021-RM",
    trigger: "toujyou",
    expectTemplate: "toujou_deck_top_wait_if_all_heart",
    check: (cl) =>
      cl.deckTopCount === 3 && cl.requiredHeartSlot === 1 ? [] : ["deck3 heart01 grant"],
  },
  {
    id: "PL!HS-PR-020-PR",
    trigger: "live_start",
    expectTemplate: "live_start_optional_energy_waiting_reorder_deck_top",
    check: (cl) => (cl.deckTopPickCount === 2 && cl.costEnergy ? [] : ["E reorder2"]),
  },
  {
    id: "PL!HS-PR-022-PR",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) =>
      cl.costEnergy && cl.hasOptionalCost && cl.costEnergyCount === 1 && cl.bladeGain === 2
        ? []
        : ["E1 blade2 optional"],
  },
  {
    id: "PL!HS-PR-027-PR",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) =>
      cl.filters?.pickFilterAlternatives?.length === 2 ? [] : ["member or live pick"],
  },
  {
    id: "PL!HS-PR-028-PR",
    trigger: "live_success",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.minStageOverflowHeartMembers === 1 && cl.deckDrawCount === 1
        ? []
        : ["overflow heart draw"],
  },
  {
    id: "PL!HS-PR-028-PR",
    trigger: "live_success",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.minStageOverflowHeartMembers === 1 && cl.deckDrawCount === 1
        ? []
        : ["overflow draw"],
  },
  {
    id: "PL!HS-PR-029-PR",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.costEnergy && cl.requiredHeartSlot === 1 && cl.hasOptionalCost ? [] : ["E heart01"],
  },
  {
    id: "PL!HS-PR-031-PR",
    trigger: "toujyou",
    expectTemplate: "draw_until_hand_size",
    check: (cl) => (cl.targetHandSize === 5 ? [] : ["hand5"]),
  },
  {
    id: "PL!HS-PR-032-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.filters?.pickType === "ライブ" && cl.filters?.minScore === 6 ? [] : ["live score6+"],
  },
];

let failed = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const raw = cardAbilityRawText(card);
  const seg = splitAbilityByTriggers(raw).find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("NO_SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  if (cl.template !== c.expectTemplate) {
    console.error("TEMPLATE", c.id, c.trigger, "expected", c.expectTemplate, "got", cl.template);
    failed++;
    continue;
  }
  if (
    !abilityEffectIsAutomated(cl.template) &&
    cl.template !== "passive_track" &&
    cl.template !== "ability_sequence"
  ) {
    console.error("NOT_AUTO", c.id, cl.template);
    failed++;
    continue;
  }
  if (c.check) {
    const errs = c.check(cl);
    if (errs.length) {
      console.error("CHECK", c.id, c.trigger, errs.join(", "));
      failed++;
      continue;
    }
  }
  console.log("OK", c.id, c.trigger, cl.template);
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("All", CASES.length, "cases passed");
