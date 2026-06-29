#!/usr/bin/env node
/**
 * 虹ヶ咲 bp1（PL!N-bp1 / LL-bp1 虹ヶ咲）代表カードの分類・パターン回帰。
 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  { id: "LL-bp1-001-R＋", trigger: "live_start", expectTemplate: "live_start_hand_named_discard_grant_jouji" },
  { id: "PL!N-bp1-001-R", trigger: "live_start", expectTemplate: "optional_energy_blade_until_live_end" },
  { id: "PL!N-bp1-002-R＋", trigger: "kidou", expectTemplate: "kidou_wait_to_stage" },
  {
    id: "PL!N-bp1-003-R＋",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["seriesTag"]),
  },
  { id: "PL!N-bp1-004-R", trigger: "toujyou", expectTemplate: "activate_energy" },
  {
    id: "PL!N-bp1-005-R",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.handDiscardToWaiting === 1 ? [] : ["handDiscardToWaiting"]),
  },
  {
    id: "PL!N-bp1-006-R＋",
    trigger: "kidou",
    expectTemplate: "activate_energy",
    segmentIncludes: "エネルギーを2枚アクティブ",
    check: (cl) => (cl.energyActiveCount === 2 ? [] : ["energyActiveCount"]),
  },
  { id: "PL!N-bp1-007-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover", check: (cl) => (cl.deckTopPickMax === 1 ? [] : ["deckTopPickMax"]) },
  { id: "PL!N-bp1-008-R", trigger: "kidou", expectTemplate: "kidou_hand_cost_wait_pick_hand" },
  { id: "PL!N-bp1-009-R", trigger: "toujyou", expectTemplate: "ability_sequence", check: (cl) => {
    const steps = cl.steps || [];
    if (steps.length !== 2) return ["steps.length"];
    if (steps[1].template !== "toujou_wait_pick_hand") return ["step2"];
    return [];
  }},
  { id: "PL!N-bp1-010-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-bp1-011-R", trigger: "toujyou", expectTemplate: "deck_reveal_until_live" },
  { id: "PL!N-bp1-012-R＋", trigger: "kidou", expectTemplate: "kidou_wait_pick_hand" },
  {
    id: "PL!N-bp1-026-L",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) => {
      const errs = [];
      if (!cl.preconditionFilters?.requiresLiveScoreHigherThanOpponent) errs.push("precond score");
      if (cl.filters?.seriesTag !== "虹ヶ咲") errs.push("seriesTag");
      return errs;
    },
  },
  {
    id: "PL!N-bp1-027-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus_per_unit",
    check: (cl) => {
      const errs = [];
      if (cl.scoreUnitKind !== "distinct_heart_colors_on_stage_members") errs.push("scoreUnitKind");
      if (cl.scoreUnitSeries !== "虹ヶ咲") errs.push("scoreUnitSeries");
      if (!(cl.scoreHeartColorSlots && cl.scoreHeartColorSlots.length >= 4)) errs.push("scoreHeartColorSlots");
      return errs;
    },
  },
  {
    id: "PL!N-bp1-028-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant");
      if (!cl.costEnergy || cl.costEnergyCount !== 2) errs.push("costEnergy");
      if (!cl.optional || !cl.hasOptionalCost) errs.push("optional");
      if (cl.filters?.minStageSeriesMembers !== 1) errs.push("minStageSeriesMembers");
      return errs;
    },
  },
  {
    id: "PL!N-bp1-029-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.cardScoreGrant === 2 && cl.filters?.minLiveFrameCount === 3 ? [] : ["score/liveFrame"]),
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
  const segs = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger === c.trigger);
  const seg = c.segmentIncludes
    ? segs.find((s) => s.text.includes(c.segmentIncludes))
    : segs[0];
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  let cl;
  if (c.trigger === "jouji") {
    cl = classifyJoujiSegment(seg.text);
  } else {
    cl = classifyCardAbility(card, c.trigger, seg.text);
  }
  const errs = [];
  if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  if (c.trigger !== "jouji" && cl.template !== "passive_track" && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

if (failed) {
  console.error(`\n${failed} niji-bp1 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} niji-bp1 cases passed`);
