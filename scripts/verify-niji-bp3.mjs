#!/usr/bin/env node
/** 虹ヶ咲 bp3 / 夏、はじまる。（PL!N-bp3）代表カードの分類・パターン回帰 */
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
    id: "PL!N-bp3-003-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_trigger_ability",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.maxCost === 4 ? [] : ["filters"],
  },
  { id: "PL!N-bp3-007-P", trigger: "kidou", expectTemplate: "kidou_self_wait_hand_enter_energy" },
  {
    id: "PL!N-bp3-009-P",
    trigger: "live_start",
    expectTemplate: "live_start_waiting_deck_bottom_tiered",
  },
  {
    id: "PL!N-bp3-010-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
  },
  { id: "PL!N-bp3-011-P", trigger: "toujyou", expectTemplate: "toujou_opp_stage_member_match_grant" },
  { id: "PL!N-bp3-017-N", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!N-bp3-017-N", trigger: "live_start", expectTemplate: "optional_self_wait_opp_stage" },
  {
    id: "PL!N-bp3-025-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_energy_under_return_grant",
  },
  {
    id: "PL!N-bp3-028-L",
    trigger: "live_start",
    expectTemplate: "deck_top_to_waiting",
  },
  {
    id: "PL!N-bp3-031-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus_per_unit",
    check: (cl) => (cl.scoreUnitKind === "waiting_stage_members" ? [] : ["scoreUnitKind"]),
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
  const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  if (!abilityEffectIsAutomated(cl.template)) errs.push("not automated");
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

if (failed) {
  console.error(`\n${failed} niji-bp3 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} niji-bp3 cases passed`);
