#!/usr/bin/env node
/** Liella! bp2 / NEXTSTEP（PL!SP-bp2）代表カードの分類・パターン回帰 */
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
  { id: "PL!SP-bp2-001-P", trigger: "toujyou", expectTemplate: "toujou_wait_pick_hand" },
  {
    id: "PL!SP-bp2-002-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 3) errs.push("deckTopCount");
      if (cl.filters?.minCost !== 11) errs.push("minCost");
      return errs;
    },
  },
  {
    id: "PL!SP-bp2-006-P",
    trigger: "toujyou",
    expectTemplate: "toujou_baton_discarded_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" ? [] : ["seriesTag"]),
  },
  { id: "PL!SP-bp2-006-P", trigger: "kidou", expectTemplate: "kidou_hand_discard_trigger_ability" },
  { id: "PL!SP-bp2-008-P", trigger: "kidou", expectTemplate: "live_start_position_change" },
  { id: "PL!SP-bp2-009-P", trigger: "live_start", expectTemplate: "live_start_hand_blade_per" },
  { id: "PL!SP-bp2-010-P", trigger: "live_start", expectTemplate: "live_start_yell_reveal_reduction" },
  { id: "PL!SP-bp2-011-P", trigger: "toujyou", expectTemplate: "toujou_wait_pick_opp_live" },
  { id: "PL!SP-bp2-013-N", trigger: "toujyou", expectTemplate: "waiting_reorder_deck_top" },
  { id: "PL!SP-bp2-015-N", trigger: "jidou", expectTemplate: "jidou_yell_grant_jouji_no_bh" },
  { id: "PL!SP-bp2-023-L", trigger: "live_start", expectTemplate: "live_card_score_plus" },
  { id: "PL!SP-bp2-025-L", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
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
  console.error(`\n${failed} liella-bp2 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} liella-bp2 cases passed`);
