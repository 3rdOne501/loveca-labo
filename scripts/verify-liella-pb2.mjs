#!/usr/bin/env node
/** Liella! pb2（PL!SP-pb2）代表カードの分類・パターン回帰 */
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
    id: "PL!SP-pb2-001-R",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_enter_or_hand",
  },
  {
    id: "PL!SP-pb2-002-R",
    trigger: "kidou",
    expectTemplate: "ability_sequence",
    check: (cl) => ((cl.steps || []).length >= 2 ? [] : ["steps"]),
  },
  { id: "PL!SP-pb2-003-R", trigger: "live_success", expectTemplate: "live_success_liella_effect_moved_score" },
  { id: "PL!SP-pb2-005-R", trigger: "toujyou", expectTemplate: "toujou_baton_discarded_under" },
  {
    id: "PL!SP-pb2-009-R",
    trigger: "toujyou",
    expectTemplate: "optional_pick_member_wait_opp_blade_gap",
    check: (cl) => (cl.oppBladeGapMin != null ? [] : ["oppBladeGapMin"]),
  },
  {
    id: "PL!SP-pb2-009-R",
    trigger: "live_start",
    expectTemplate: "optional_pick_member_wait_opp_blade_gap",
    check: (cl) => (cl.oppBladeGapMin != null ? [] : ["oppBladeGapMin"]),
  },
  {
    id: "PL!SP-pb2-010-R",
    trigger: "live_start",
    expectTemplate: "live_start_mandatory_energy_deck_unless_hand_discard",
  },
  { id: "PL!SP-pb2-011-R", trigger: "jidou", expectTemplate: "jidou_center_member_move_choice" },
  { id: "PL!SP-pb2-045-L", trigger: "live_start", expectTemplate: "live_card_score_plus_per_unit" },
  { id: "PL!SP-pb2-048-L", trigger: "live_start", expectTemplate: "live_start_distinct_series_need_heart_shift_score" },
  { id: "PL!SP-pb2-050-L", trigger: "live_start", expectTemplate: "live_start_optional_formation_change" },
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
  console.error(`\n${failed} liella-pb2 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} liella-pb2 cases passed`);
