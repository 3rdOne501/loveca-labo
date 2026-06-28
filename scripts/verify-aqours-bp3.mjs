#!/usr/bin/env node
/** Aqours bp3 / 夏、はじまる。（PL!S-bp3）代表カードの分類・パターン回帰 */
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
  { id: "PL!S-bp3-001-P", trigger: "kidou", expectTemplate: "kidou_wait_member_grant_jouji" },
  {
    id: "PL!S-bp3-002-P",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_self_score",
    check: (cl) => (cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["scoreHigherThanOpp"]),
  },
  {
    id: "PL!S-bp3-006-P",
    trigger: "kidou",
    expectTemplate: "kidou_self_wait_stage_member_swap_recover",
    check: (cl) => (cl.filters?.seriesTag === "Aqours" && cl.costSelfWait ? [] : ["series/cost"]),
  },
  {
    id: "PL!S-bp3-007-P",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.costEnergy && cl.perTurnLimit === 1 ? [] : ["draw/cost/limit"],
  },
  { id: "PL!S-bp3-012-N", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  {
    id: "PL!S-bp3-019-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_set_fixed",
    check: (cl) => (cl.cardScoreSet === 4 ? [] : ["cardScoreSet"]),
  },
  { id: "PL!S-bp3-020-L", trigger: "jidou", expectTemplate: "jidou_yell_retry_low_bh" },
  {
    id: "PL!S-bp3-024-L",
    trigger: "live_start",
    expectTemplate: "ability_pick_one",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" && cl.filters?.minCost === 9 && cl.filters?.maxCost === 4
        ? []
        : ["filters"],
  },
  {
    id: "PL!S-bp3-025-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.cardScoreGrant === 1 ? [] : ["cardScoreGrant"]),
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
  console.error(`\n${failed} aqours-bp3 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} aqours-bp3 cases passed`);
