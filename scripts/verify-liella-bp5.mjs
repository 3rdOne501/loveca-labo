#!/usr/bin/env node
/** Liella! bp5 / Anniversary2026（PL!SP-bp5）メンバー・ライブ代表カードの分類回帰 */
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
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, jidou?:boolean, segIndex?:number, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!SP-bp5-001-P",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    check: (cl) => (cl.optional && cl.filters?.maxCost === 4 ? [] : ["optional c4"]),
  },
  {
    id: "PL!SP-bp5-001-P",
    trigger: "live_start",
    expectTemplate: "ability_pick_one",
  },
  {
    id: "PL!SP-bp5-001-P",
    trigger: "kidou",
    expectTemplate: "kidou_wait_or_hand_for_energy",
    check: (cl) => (cl.handDiscardToWaiting === 1 ? [] : ["hand discard"]),
  },
  {
    id: "PL!SP-bp5-002-P",
    trigger: "kidou",
    expectTemplate: "draw_then_hand_discard",
  },
  {
    id: "PL!SP-bp5-003-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "grant_hand_series_cost_reduce",
    check: (cl) =>
      cl.handCostReduce === 2 && cl.handCostReduceTargetCost === 10 && cl.handCostReduceSeriesTag === "Liella!"
        ? []
        : ["hand cost reduce"],
  },
  {
    id: "PL!SP-bp5-003-P",
    trigger: "live_start",
    expectTemplate: "live_start_activate_liella_and_energy",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" ? [] : ["liella"]),
  },
  {
    id: "PL!SP-bp5-004-P",
    trigger: "jidou",
    jidou: true,
    expectTemplate: "jidou_move_or_energy_draw_grant",
    check: (cl) => (cl.perTurnLimit === 1 && cl.deckDrawCount === 1 ? [] : ["draw1"]),
  },
  {
    id: "PL!SP-bp5-005-P",
    trigger: "kidou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 3 || cl.costMilledSeriesTag !== "Liella!") errs.push("mill3 liella");
      if (!cl.bladeGainPerCostMilledMember || cl.bladeGain !== 0) errs.push("per-member blade");
      return errs;
    },
  },
  {
    id: "PL!SP-bp5-005-P",
    trigger: "jidou",
    jidou: true,
    expectTemplate: "jidou_card_to_waiting_pick_hand",
    check: (cl) => (cl.optionalPayEnergy === 1 ? [] : ["optional E"]),
  },
  {
    id: "PL!SP-bp5-006-P",
    trigger: "kidou",
    expectTemplate: "kidou_deck_top_wait_position_change",
    check: (cl) => (cl.deckTopCount === 3 && cl.perTurnLimit === 1 ? [] : ["mill3 turn1"]),
  },
  {
    id: "PL!SP-bp5-007-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 5 && cl.deckTopPickMax === 3 ? [] : ["deck5 pick3"]),
  },
  {
    id: "PL!SP-bp5-008-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 5 || cl.filters?.minCost !== 9 || cl.filters?.seriesTag !== "Liella!") {
        errs.push("deck5 c9");
      }
      if (!cl.costSelfWait || !cl.costHandDiscardOptional || cl.hasOptionalCost) {
        errs.push("mandatory wait optional hand");
      }
      return errs;
    },
  },
  {
    id: "PL!SP-bp5-009-P",
    trigger: "live_start",
    expectTemplate: "live_start_mill_loop_blade_grant",
    check: (cl) =>
      cl.millMaxRepeat === 4 && cl.selfWaitIfMilledLive && cl.bladeGain === 1 ? [] : ["mill loop"],
  },
  {
    id: "PL!SP-bp5-010-P",
    trigger: "toujyou",
    expectTemplate: "toujou_both_center_position_change",
  },
  {
    id: "PL!SP-bp5-011-P",
    trigger: "jouji",
    jouji: true,
    segIndex: 0,
    expectTemplate: "blade_conditional",
    check: (cl) =>
      cl.stageAreas?.[0] === "left" && cl.heartFlat?.[2] === 3 ? [] : ["left heart02"],
  },
  {
    id: "PL!SP-bp5-012-N",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "blade_if_liella_live_need_sum",
    check: (cl) =>
      cl.minTotalNeedHeart === 8 && cl.liveSeriesTag === "Liella!" && cl.heartFlat?.[3] === 1
        ? []
        : ["need sum"],
  },
  {
    id: "PL!SP-bp5-013-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const alts = cl.filters?.pickFilterAlternatives;
      if (!alts || alts.length !== 2) return ["pick alts"];
      const sunny = alts.find((a) => a.seriesTag === "SunnyPassion");
      const liella = alts.find((a) => a.seriesTag === "Liella!" && a.requiresHasBladeHeart);
      return sunny && liella ? [] : ["sunny or liella bh"];
    },
  },
  {
    id: "PL!SP-bp5-015-N",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.bladeGain === 2 && cl.requiresSelfInStageArea === "center" ? [] : ["center blade2"],
  },
  {
    id: "PL!SP-bp5-016-N",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "blade_conditional",
    check: (cl) => (cl.minEnergy === 10 ? [] : ["energy 10+"]),
  },
  {
    id: "PL!SP-bp5-017-N",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "hand_cost_reduce",
    check: (cl) =>
      cl.handCostReduce === 2 && cl.requiresSeriesMemberMovedThisTurn === "Liella!" ? [] : ["liella moved -2"],
  },
  {
    id: "PL!SP-bp5-025-L",
    trigger: "live_success",
    expectTemplate: "optional_energy_card_score_plus_per_unit",
    check: (cl) =>
      cl.energyUnitsPerScore === 4 && cl.cardScorePerEnergyUnit === 1 ? [] : ["E4 per score+1"],
  },
  {
    id: "PL!SP-bp5-111-P＋",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "live_score_plus",
    check: (cl) => (cl.exactEnergy === 8 ? [] : ["energy exactly 8"]),
  },
  {
    id: "PL!SP-bp5-111-P＋",
    trigger: "kidou",
    expectTemplate: "kidou_energy_deck_pick_live",
    check: (cl) => (cl.costEnergyCount === 2 ? [] : ["E2"]),
  },
  {
    id: "PL!SP-bp5-222-P＋",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "live_score_plus",
    check: (cl) => (cl.exactEnergy === 8 ? [] : ["energy exactly 8"]),
  },
  {
    id: "PL!SP-bp5-222-P＋",
    trigger: "live_start",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) => (cl.optional ? [] : ["optional E deck wait"]),
  },
  {
    id: "PL!SP-bp5-014-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.filters?.requiresOtherStageMemberMovedThisTurn ? [] : ["draw1 other moved"],
  },
  {
    id: "PL!SP-bp5-020-N",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
  },
  {
    id: "PL!SP-bp5-021-N",
    trigger: "kidou",
    expectTemplate: "energy_deck_to_wait",
  },
  {
    id: "PL!SP-bp5-023-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 2) errs.push("score+2");
      if (!cl.requiresYellRevealedOwnLiveCard) errs.push("yell live");
      if (cl.filters?.minEitherSuccessLiveCount !== 2) errs.push("sl2");
      return errs;
    },
  },
  {
    id: "PL!SP-bp5-024-L",
    trigger: "live_start",
    expectTemplate: "live_start_moved_members_pick_heart_grant",
    check: (cl) => (cl.filters?.requiresStageMemberMovedThisTurn ? [] : ["moved"]),
  },
  {
    id: "PL!SP-bp5-026-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" ? [] : ["liella"]),
  },
  {
    id: "PL!SP-bp5-027-L",
    trigger: "live_success",
    expectTemplate: "live_success_optional_energy_wait_opp_draw",
    check: (cl) => (cl.optional ? [] : ["optional"]),
  },
];

const NO_ABILITY = ["PL!SP-bp5-018-N", "PL!SP-bp5-019-N", "PL!SP-bp5-022-N"];

let failed = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const segMatches = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger === c.trigger);
  const seg = segMatches[c.segIndex ?? 0];
  if (!seg) {
    console.error("NO_SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = c.jouji
    ? classifyJoujiSegment(seg.text)
    : c.jidou
      ? classifyJidouAutoSegment(seg.text)
      : classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  const tmpl = c.jouji ? cl.kind : cl.template;
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (!c.jouji && !c.jidou && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl, seg));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

for (const id of NO_ABILITY) {
  const card = cards[id];
  if (!card) {
    console.error("MISSING", id);
    failed++;
    continue;
  }
  const raw = cardAbilityRawText(card);
  if (raw && raw.trim()) {
    failed++;
    console.error("FAIL", id, "expected no ability");
  } else {
    console.log("OK", id, "no ability");
  }
}

if (failed) {
  console.error(`\nverify-liella-bp5: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-liella-bp5: ${CASES.length + NO_ABILITY.length} OK`);
