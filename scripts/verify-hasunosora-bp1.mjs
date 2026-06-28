#!/usr/bin/env node
/** 蓮ノ空 bp1（PL!HS-bp1）代表カードの分類・パターン回帰 */
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
    id: "PL!HS-bp1-001-R",
    trigger: "toujyou",
    expectTemplate: "activate_energy",
    check: (cl) => (cl.energyActiveCount === 2 ? [] : ["energyActiveCount"]),
  },
  { id: "PL!HS-bp1-002-R", trigger: "kidou", expectTemplate: "kidou_self_to_wait_recover" },
  { id: "PL!HS-bp1-003-R＋", trigger: "kidou", expectTemplate: "kidou_wait_pick_hand" },
  { id: "PL!HS-bp1-005-R", trigger: "toujyou", expectTemplate: "toujou_optional_hand_discard_draw" },
  { id: "PL!HS-bp1-008-R", trigger: "toujyou", expectTemplate: "toujou_deck_top_wait_if_all_members" },
  {
    id: "PL!HS-bp1-009-R",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.filters?.seriesTag === "みらくらぱーく！" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!HS-bp1-011-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 5 ? [] : ["deckTopCount"]),
  },
  { id: "PL!HS-bp1-021-L", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
  {
    id: "PL!HS-bp1-022-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant");
      if (cl.filters?.minYellRevealedSeriesMemberCount !== 10) errs.push("minYell count");
      if (cl.filters?.yellRevealedSeriesMemberTag !== "蓮ノ空") errs.push("yell series tag");
      return errs;
    },
  },
  {
    id: "PL!HS-bp1-023-L",
    trigger: "live_success",
    expectTemplate: "live_score_higher_energy_wait",
    check: (cl) => (cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["dual-mode filter"]),
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
  console.error(`\n${failed} hasunosora-bp1 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} hasunosora-bp1 cases passed`);
