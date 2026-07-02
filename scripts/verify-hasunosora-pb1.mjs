#!/usr/bin/env node
/** 蓮ノ空 pb1（PL!HS-pb1）代表カードの分類・パターン回帰 */
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
    id: "PL!HS-pb1-001-R",
    trigger: "jidou",
    expectTemplate: "jidou_series_enter_pay_energy",
    check: (cl) => (cl.filters?.seriesTag === "スリーズブーケ" ? [] : ["seriesTag"]),
  },
  { id: "PL!HS-pb1-003-R", trigger: "toujyou", expectTemplate: "toujou_hand_discard_draw_plus" },
  {
    id: "PL!HS-pb1-004-R",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      if (steps.length !== 2) return ["steps.length"];
      if (steps[1].template !== "toujou_wait_pick_hand") return ["step2"];
      if (steps[0].deckTopCount !== 3) return ["deckTopCount"];
      return [];
    },
  },
  { id: "PL!HS-pb1-005-R", trigger: "live_start", expectTemplate: "live_start_number_reveal_grant_if" },
  {
    id: "PL!HS-pb1-008-R",
    trigger: "toujyou",
    expectTemplate: "toujou_both_sides_wait_all_printed_blade",
    check: (cl) => (cl.oppWaitMaxPrintedBlade === 3 ? [] : ["oppWaitMaxPrintedBlade"]),
  },
  {
    id: "PL!HS-pb1-010-R",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_wait_if_high_cost_on_stage",
  },
  {
    id: "PL!HS-pb1-011-R",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 3 && cl.deckTopPickMax === 1 && cl.handDiscardToWaiting === 1 ? [] : ["pick/recover"],
  },
  { id: "PL!HS-pb1-012-R", trigger: "toujyou", expectTemplate: "toujou_both_shuffle_deck_bottom_grant_if" },
  { id: "PL!HS-pb1-014-R", trigger: "toujyou", expectTemplate: "toujou_opp_front_position_change" },
  {
    id: "PL!HS-pb1-025-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.filters?.waitingSeriesMemberTag === "蓮ノ空" && cl.filters?.minWaitingSeriesMemberCount === 10
        ? []
        : ["grant_jouji filters"],
  },
  {
    id: "PL!HS-pb1-025-L",
    trigger: "live_success",
    expectTemplate: "live_success_recover_from_waiting",
    check: (cl) => (cl.filters?.maxHandCount === 6 ? [] : ["maxHandCount"]),
  },
  { id: "PL!HS-pb1-026-L", trigger: "live_start", expectTemplate: "live_start_need_heart_reduce_fixed" },
  {
    id: "PL!HS-pb1-029-L",
    trigger: "live_start",
    expectTemplate: "live_start_overflow_heart_tiered_draw_reduce",
  },
  {
    id: "PL!HS-pb1-027-L",
    trigger: "live_success",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) => (cl.deckTopCount === 4 && cl.optional ? [] : ["deckTop/optional"]),
  },
  { id: "PL!HS-pb1-028-L", trigger: "live_start", expectTemplate: "live_start_trigger_stage_member_live_start" },
  { id: "PL!HS-pb1-030-L", trigger: "live_start", expectTemplate: "live_start_edelnote_blade_heart_pair" },
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
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  if (cl.template !== "ability_sequence" && !abilityEffectIsAutomated(cl.template)) errs.push("not automated");
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

if (failed) {
  console.error(`\n${failed} hasunosora-pb1 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} hasunosora-pb1 cases passed`);
