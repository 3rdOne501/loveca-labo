#!/usr/bin/env node
/** µ's sd1（PL!-sd1）スタートデッキ代表カードの分類回帰 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!-sd1-001-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.filters?.pickType === "ライブ" && cl.filters?.minSuccessLiveCount === 2 ? [] : ["wait pick sl2"],
  },
  {
    id: "PL!-sd1-001-SD",
    trigger: "jouji",
    expectTemplate: "blade_per_own_success_live",
    jouji: true,
  },
  { id: "PL!-sd1-002-SD", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  {
    id: "PL!-sd1-003-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.filters?.seriesTag === "μ's" && cl.filters?.maxCost === 4 ? [] : ["muse member c4"],
  },
  {
    id: "PL!-sd1-003-SD",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) => (cl.handDiscardToWaiting === 1 && cl.optional ? [] : ["optional discard heart"]),
  },
  {
    id: "PL!-sd1-004-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "μ's" && cl.deckTopCount === 5 ? [] : ["peek live"],
  },
  {
    id: "PL!-sd1-005-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!-sd1-006-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_success_live_hand_reveal_swap",
    check: (cl) => (cl.optional ? [] : ["optional reveal swap"]),
  },
  {
    id: "PL!-sd1-007-SD",
    trigger: "toujyou",
    expectTemplate: "deck_mill_conditional_draw",
    check: (cl) =>
      cl.deckTopCount === 5 && cl.deckDrawCount === 1 ? [] : ["mill5 draw1"],
  },
  {
    id: "PL!-sd1-008-SD",
    trigger: "kidou",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) =>
      cl.deckTopCount === 10 && cl.costEnergy && cl.costEnergyCount === 2 ? [] : ["E2 mill10"],
  },
  {
    id: "PL!-sd1-009-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.filters?.minWaitingSeriesCardCount === 25 &&
      cl.filters?.waitingSeriesCardTag === "μ's" &&
      cl.liveScoreGrant === 1
        ? []
        : ["wait25 score+1"],
  },
  {
    id: "PL!-sd1-011-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && cl.deckTopCount === 3 ? [] : ["discard peek3"],
  },
  {
    id: "PL!-sd1-015-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.filters?.pickType === "メンバー" && cl.deckTopCount === 5 ? [] : ["member peek5"],
  },
  {
    id: "PL!-sd1-016-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 3 && cl.handDiscardToWaiting === 1 ? [] : ["peek3"]),
  },
  {
    id: "PL!-sd1-019-SD",
    trigger: "live_success",
    expectTemplate: "deck_top_look_reorder",
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["look 3"]),
  },
  {
    id: "PL!-sd1-022-SD",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_per_success_live",
  },
];

/** @type {Array<{id:string, check:(rule:any)=>string[]}>} */
const JOUJI_CASES = [];

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
  const cl = c.jouji
    ? classifyJoujiSegment(seg.text)
    : classifyCardAbility(card, c.trigger, seg.text);
  const tmpl = c.jouji ? cl.kind : cl.template;
  const errs = [];
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (!c.jouji && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.expectTemplate);
  }
}

for (const id of [
  "PL!-sd1-010-SD",
  "PL!-sd1-013-SD",
  "PL!-sd1-014-SD",
  "PL!-sd1-017-SD",
  "PL!-sd1-018-SD",
  "PL!-sd1-020-SD",
  "PL!-sd1-021-SD",
]) {
  const card = cards[id];
  if (!card) {
    console.error("MISSING", id);
    failed++;
    continue;
  }
  const triggered = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger);
  if (triggered.length) {
    failed++;
    console.error("FAIL", id, "expected no triggered ability");
  } else {
    console.log("OK", id, "no triggered ability");
  }
}

if (failed) {
  console.error(`\n${failed} mus-sd1 case(s) failed`);
  process.exit(1);
}
const totalCases = CASES.length + 7;
console.log(`\nAll ${totalCases} mus-sd1 cases passed`);
