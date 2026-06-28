#!/usr/bin/env node
/** Aqours bp2 / NEXTSTEP（PL!S-bp2）代表カードの分類・パターン回帰 */
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
    id: "PL!S-bp2-002-P",
    trigger: "jidou",
    expectTemplate: "jidou_leave_stage_hand_pick_recover",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" && cl.handDiscardToWaiting === 1 ? [] : ["filters/cost"],
  },
  { id: "PL!S-bp2-003-P", trigger: "jidou", expectTemplate: "jidou_yell_grant_heart" },
  { id: "PL!S-bp2-004-P", trigger: "jidou", expectTemplate: "jidou_yell_retry_no_live" },
  {
    id: "PL!S-bp2-005-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 7) errs.push("deckTopCount");
      if (cl.deckTopPickMax !== 3) errs.push("deckTopPickMax");
      if (!cl.filters?.heartSlotsAny || cl.filters.heartSlotsAny.length !== 3) errs.push("heartSlotsAny");
      return errs;
    },
  },
  { id: "PL!S-bp2-006-P", trigger: "toujyou", expectTemplate: "toujou_wait_enter_cost_sum" },
  {
    id: "PL!S-bp2-007-P",
    trigger: "live_start",
    expectTemplate: "live_start_hand_live_to_deck_bottom_look",
    check: (cl) => (cl.deckTopCount === 2 ? [] : ["deckTopCount"]),
  },
  { id: "PL!S-bp2-008-P", trigger: "toujyou", expectTemplate: "waiting_to_deck_bottom" },
  { id: "PL!S-bp2-021-L", trigger: "live_success", expectTemplate: "yell_resolution_pick_deck_bottom" },
  {
    id: "PL!S-bp2-022-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.cardScoreGrant === 2 ? [] : ["cardScoreGrant"]),
  },
  { id: "PL!S-bp2-024-L", trigger: "live_success", expectTemplate: "draw_then_hand_discard" },
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
  console.error(`\n${failed} aqours-bp2 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} aqours-bp2 cases passed`);
