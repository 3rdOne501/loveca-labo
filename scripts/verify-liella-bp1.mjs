#!/usr/bin/env node
/** Liella! bp1（PL!SP-bp1）代表カードの分類・パターン回帰 */
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
    id: "PL!SP-bp1-002-R＋",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => {
      const errs = [];
      if (cl.stageArea !== "left") errs.push("stageArea left");
      if (cl.deckDrawCount !== 2) errs.push("deckDrawCount");
      if (!cl.costEnergy || cl.costEnergyCount !== 2) errs.push("costEnergy");
      return errs;
    },
  },
  { id: "PL!SP-bp1-003-R＋", trigger: "kidou", expectTemplate: "kidou_reveal_hand_cost_threshold" },
  {
    id: "PL!SP-bp1-005-R",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" && cl.deckTopCount === 5 ? [] : ["filters/deckTop"]),
  },
  {
    id: "PL!SP-bp1-007-R＋",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.filters?.minEnergyCount === 11 && cl.filters?.pickType === "ライブ" ? [] : ["energy/live"]),
  },
  { id: "PL!SP-bp1-008-R", trigger: "toujyou", expectTemplate: "draw_then_conditional_extra_draw" },
  { id: "PL!SP-bp1-010-R", trigger: "kidou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!SP-bp1-012-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  {
    id: "PL!SP-bp1-023-L",
    trigger: "live_success",
    expectTemplate: "live_score_higher_energy_wait",
    check: (cl) => (cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["dual-mode filter"]),
  },
  { id: "PL!SP-bp1-024-L", trigger: "live_start", expectTemplate: "live_start_named_member_heart_blades" },
  { id: "PL!SP-bp1-024-L", trigger: "live_success", expectTemplate: "live_success_characters_draw" },
  {
    id: "PL!SP-bp1-026-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_set_fixed",
    check: (cl) => (cl.filters?.minDistinctStageAndWaitingNames === 5 ? [] : ["distinct names"]),
  },
  {
    id: "PL!SP-bp1-027-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.cardScoreGrant === 1 && cl.filters?.minEnergyCount === 12 ? [] : ["score/energy"]),
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
  console.error(`\n${failed} liella-bp1 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} liella-bp1 cases passed`);
