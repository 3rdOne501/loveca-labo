#!/usr/bin/env node
/** Liella! bp7 / MELLOWMOMENT（PL!SP-bp7）メンバー代表カードの分類・パターン回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, segHint?:RegExp, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!SP-bp7-001-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_while_under_series_host" && rule.seriesTag === "Liella!"
        ? []
        : ["under host blade"];
    },
  },
  {
    id: "PL!SP-bp7-001-P",
    trigger: "jidou",
    expectTemplate: "jidou_leave_baton_self_under_partner",
  },
  {
    id: "PL!SP-bp7-002-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "stage_cost_plus" &&
        rule.minEnergy === 7 &&
        rule.opponentMoreEnergy &&
        rule.stageCostPlus === 2
        ? []
        : ["cost+2 E7>"];
    },
  },
  {
    id: "PL!SP-bp7-003-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    segHint: /1枚につき/,
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_per_member_under" && rule.bladePer === 1 ? [] : ["blade per under"];
    },
  },
  {
    id: "PL!SP-bp7-003-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    segHint: /3枚以上/,
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "live_score_plus" && rule.minMemberCardsUnder === 3 ? [] : ["under3 score"];
    },
  },
  {
    id: "PL!SP-bp7-003-P",
    trigger: "kidou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const errs = [];
      if (!cl.steps || cl.steps.length < 2) errs.push("steps");
      else {
        if (cl.steps[0].template !== "kidou_hand_reveal_to_under") errs.push("reveal under");
        if (cl.steps[1].template !== "draw_from_deck") errs.push("draw");
      }
      const costs = cl.filters?.costsAnyOf || cl.steps?.[0]?.filters?.costsAnyOf;
      if (!costs || costs[0] !== 10 || costs[1] !== 20) errs.push("costs 10|20");
      if (cl.deckDrawCount !== 2 && cl.steps?.[1]?.deckDrawCount !== 2) errs.push("draw2");
      return errs;
    },
  },
  {
    id: "PL!SP-bp7-004-P",
    trigger: "live_start",
    expectTemplate: "waiting_to_deck_bottom_blade_if_moved_no_bh",
    check: (cl) =>
      cl.waitingToDeckCount === 3 &&
      cl.bladeGain === 2 &&
      cl.filters?.seriesTag === "Liella!" &&
      !cl.filters?.requiresNoBladeHeart
        ? []
        : ["deck bottom if noBH"],
  },
  {
    id: "PL!SP-bp7-005-P",
    trigger: "jidou",
    expectTemplate: "jidou_enter_or_energy_returned_energy_wait",
    segHint: /登場するか/,
  },
  {
    id: "PL!SP-bp7-005-P",
    trigger: "jidou",
    expectTemplate: "jidou_move_or_energy_draw_grant",
    segHint: /エネルギー置き場にエネルギーが置かれたとき/,
  },
  {
    id: "PL!SP-bp7-006-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.costEnergyToDeck && cl.filters?.seriesTag === "Liella!" ? [] : ["E to deck recover"],
  },
  {
    id: "PL!SP-bp7-006-P",
    trigger: "live_success",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.stageArea === "center" &&
      cl.requiresEnergyReturnedToDeckThisTurn &&
      cl.liveScoreGrant === 1
        ? []
        : ["center E-return score"],
  },
  {
    id: "PL!SP-bp7-007-P",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.costEnergyToDeck && cl.costEnergyToDeckCount === 2 && cl.bladeGain === 3 ? [] : ["E2 blade3"],
  },
  {
    id: "PL!SP-bp7-007-P",
    trigger: "live_success",
    expectTemplate: "energy_deck_to_wait",
    segHint: /エネルギーデッキから/,
    check: (cl) => (cl.energySkipNextActivate ? [] : ["skip activate"]),
  },
  {
    id: "PL!SP-bp7-007-P",
    trigger: "live_success",
    expectTemplate: "activate_energy",
    segHint: /相手より多い/,
  },
  {
    id: "PL!SP-bp7-008-P",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.costSelfWait && cl.deckDrawCount === 1 ? [] : ["wait draw1"]),
  },
  {
    id: "PL!SP-bp7-008-P",
    trigger: "jidou",
    expectTemplate: "jidou_self_wait_area_move_activate",
  },
  {
    id: "PL!SP-bp7-009-P",
    trigger: "live_start",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.stageArea === "center" && cl.oppWaitMaxPrintedBlade === 2 ? [] : ["opp blade≤2"]),
  },
  {
    id: "PL!SP-bp7-010-P",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.pickAny && cl.energyToDeckCount === 1 ? [] : ["any + E deck"]),
  },
  {
    id: "PL!SP-bp7-011-P",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.costHandDiscardAll && cl.deckDrawCount === 6 && cl.optional ? [] : ["discard all draw6"],
  },
  {
    id: "PL!SP-bp7-012-N",
    trigger: "toujyou",
    expectTemplate: "waiting_pick_to_deck",
    check: (cl) =>
      cl.waitingToDeckCount === 3 && cl.deckDrawCount === 1 && cl.waitingToDeckDest === "bottom"
        ? []
        : ["3 tags draw"],
  },
  {
    id: "PL!SP-bp7-013-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_conditional" &&
        rule.minStageSeriesMembers === 3 &&
        rule.minStageSeriesMembersTag === "KALEIDOSCORE"
        ? []
        : ["KALEIDOSCORE3"];
    },
  },
  {
    id: "PL!SP-bp7-014-N",
    trigger: "jidou",
    expectTemplate: "jidou_area_move_grant_jouji",
  },
  {
    id: "PL!SP-bp7-015-N",
    trigger: "live_start",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.costEnergy &&
      cl.filters?.minStageSeriesMembers === 3 &&
      cl.filters?.minStageSeriesMembersTag === "CatChu!"
        ? []
        : ["CatChu!3 E"],
  },
  {
    id: "PL!SP-bp7-016-N",
    trigger: "jidou",
    expectTemplate: "jidou_move_or_energy_draw_grant",
  },
  {
    id: "PL!SP-bp7-017-N",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) => (cl.energySkipNextActivate ? [] : ["skip"]),
  },
  {
    id: "PL!SP-bp7-018-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.handDiscardToWaiting === 1 &&
      cl.costHandDiscardPickType === "ライブ" &&
      cl.deckTopCount === 5 &&
      cl.filters?.pickType == null
        ? []
        : ["live cost any pick"],
  },
  {
    id: "PL!SP-bp7-019-N",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.filters?.pickType === "ライブ" &&
      cl.filters?.seriesTag == null &&
      cl.filters?.minStageSeriesMembers === 3 &&
      cl.filters?.minStageSeriesMembersTag === "5yncri5e!"
        ? []
        : ["stage tag ≠ pick"],
  },
  {
    id: "PL!SP-bp7-020-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.opponentMoreEnergy && rule.bladeFlat === 2 ? [] : ["E> blade2"];
    },
  },
  {
    id: "PL!SP-bp7-021-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.opponentMoreEnergy && rule.heartFlat?.[6] === 1 ? [] : ["E> heart06"];
    },
  },
  {
    id: "PL!SP-bp7-022-N",
    trigger: "kidou",
    expectTemplate: "live_start_position_change",
    check: (cl) => (cl.costEnergyToDeck && cl.costEnergyToDeckCount === 1 ? [] : ["E PC"]),
  },
  {
    id: "PL!SP-bp7-023-SECL",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_deck_top",
    check: (cl) => (cl.optional && cl.filters?.seriesTag === "Liella!" ? [] : ["yell Liella! top"]),
  },
  {
    id: "PL!SP-bp7-024-SECL",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.minEnergyAdvantageOverOpponent === 2 && cl.cardScoreGrant === 1 ? [] : ["E adv ≥2"],
  },
  {
    id: "PL!SP-bp7-025-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.grantToNamedStageMember === "嵐千砂都" && cl.bladeGain === 1 ? [] : ["named blade"],
  },
  {
    id: "PL!SP-bp7-026-L",
    trigger: "live_start",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.costEnergyToDeck &&
      cl.filters?.characterNameOnStage === "葉月恋" &&
      cl.deckDrawCount === 2 &&
      cl.effectDiscardCount === 1
        ? []
        : ["恋 draw2"],
  },
  {
    id: "PL!SP-bp7-027-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.costEnergyToDeck && cl.requiresMoreEnergyThanOpponent && cl.cardScoreGrant === 1
        ? []
        : ["E> score"],
  },
  {
    id: "PL!SP-bp7-027-L",
    trigger: "live_success",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) => (cl.energySkipNextActivate ? [] : ["skip activate"]),
  },
  {
    id: "PL!SP-bp7-028-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_waiting_shuffle_deck_bottom_grant",
    check: (cl) =>
      cl.waitingToDeckCount === 9 &&
      cl.waitingToDeckExact &&
      cl.grantToAllStageMembers &&
      cl.bladeGain === 1 &&
      cl.filters?.seriesTag === "Liella!"
        ? []
        : ["9 shuffle grant"],
  },
  {
    id: "PL!SP-bp7-028-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.requiresYellRevealedAllSeriesTag === "Liella!" && cl.cardScoreGrant === 1
        ? []
        : ["yell all Liella!"],
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
  const segs = splitAbilityByTriggers(cardAbilityRawText(card));
  const seg = c.segHint
    ? segs.find((s) => s.trigger === c.trigger && c.segHint.test(s.text))
    : segs.find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  /** @type {any} */
  let cl;
  if (c.trigger === "jidou") {
    cl = classifyJidouAutoSegment(seg.text, card) || { template: "jidou_manual" };
  } else {
    cl = classifyCardAbility(card, c.trigger, seg.text);
  }
  const errs = [];
  if (c.trigger === "jouji") {
    /* via check */
  } else if (c.trigger === "jidou") {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  } else {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errs.push("not automated");
    }
  }
  if (c.check) errs.push(...c.check(cl, seg));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

if (failed) {
  console.error(`\nverify-liella-bp7: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-liella-bp7: ${CASES.length} OK`);
