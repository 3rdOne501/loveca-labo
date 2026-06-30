#!/usr/bin/env node
/** Aqours bp5 / Anniversary2026（PL!S-bp5）メンバー・ライブ代表カードの分類回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-bp5-001-P",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.requiresBatonFromNoAbilityMember ? [] : ["baton no-ability draw"],
  },
  {
    id: "PL!S-bp5-001-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "grant_hand_no_ability_cost_reduce" && rule?.handCostReduce === 1
        ? []
        : ["no-ability hand cost -1"];
    },
  },
  {
    id: "PL!S-bp5-002-P",
    trigger: "live_start",
    expectTemplate: "live_start_side_cost_equal_opp_wait",
  },
  {
    id: "PL!S-bp5-003-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional && cl.hasOptionalCost && cl.filters?.seriesTag === "Aqours" && cl.filters?.pickType === "ライブ"
        ? []
        : ["optional live recover"],
  },
  {
    id: "PL!S-bp5-004-P",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    check: (cl) => {
      const errs = [];
      if (cl.abilityChoices?.length !== 2) errs.push("choices");
      if (cl.abilityChoices?.[0] && !/Aqours/.test(cl.abilityChoices[0])) errs.push("choice0 aqours");
      if (cl.abilityChoices?.[1] && !/SaintSnow|ポジションチェンジ/.test(cl.abilityChoices[1])) {
        errs.push("choice1 saint snow");
      }
      return errs;
    },
  },
  {
    id: "PL!S-bp5-005-P",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) => {
      const errs = [];
      if (!cl.optional || cl.handDiscardToWaiting !== 1) errs.push("optional discard");
      if (JSON.stringify(cl.heartPickSlots) !== JSON.stringify([3, 4, 5])) errs.push("heart slots");
      if (!cl.grantToEnteredMembersThisTurn || cl.grantExcludeSeriesTag !== "Aqours") errs.push("entered grant");
      if (cl.heartPerSuccessLive) errs.push("not per SL");
      return errs;
    },
  },
  {
    id: "PL!S-bp5-006-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 5 &&
      cl.costSelfWait &&
      cl.costHandDiscardOptional &&
      !cl.hasOptionalCost
        ? []
        : ["peek5 mandatory wait optional hand"],
  },
  {
    id: "PL!S-bp5-007-P",
    trigger: "live_success",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 4 && cl.optional && cl.filters?.pickType === "メンバー" && cl.filters?.heartSlotsAny?.[0] === 4
        ? []
        : ["deck4 heart04 member"],
  },
  {
    id: "PL!S-bp5-008-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "live_score_plus",
    check: (cl) => (cl.opponentExtraHeartSurplus === 2 ? [] : ["opp surplus 2"]),
  },
  {
    id: "PL!S-bp5-011-N",
    trigger: "toujyou",
    expectTemplate: "toujou_grant_opp_live_need_heart_if_stage_hearts",
  },
  {
    id: "PL!S-bp5-013-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.filters?.minLiveFrameNeedHeartSlotSum === 4 ? [] : ["live need heart 4"]),
  },
  {
    id: "PL!S-bp5-017-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.filters?.minLiveFrameNeedHeartSlotSum === 4 ? [] : ["live need heart 4"]),
  },
  {
    id: "PL!S-bp5-009-P",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.bladeGain === 2 ? [] : ["blade2"]),
  },
  {
    id: "PL!S-bp5-010-N",
    trigger: "toujyou",
    expectTemplate: "toujou_grant_opp_live_need_heart_if_stage_hearts",
  },
  {
    id: "PL!S-bp5-014-N",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_to_deck_bottom",
    check: (cl) => (cl.deckDrawCount === 1 ? [] : ["draw1"]),
  },
  {
    id: "PL!S-bp5-015-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) => (cl.deckTopCount === 10 ? [] : ["mill10"]),
  },
  {
    id: "PL!S-bp5-016-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.bladeGain === 2 && cl.filters?.requiresStageMemberHigherThanAllOpponent ? [] : ["opp cost blade2"],
  },
  {
    id: "PL!S-bp5-111-P＋",
    trigger: "kidou",
    expectTemplate: "live_start_position_change",
  },
  {
    id: "PL!S-bp5-222-P＋",
    trigger: "kidou",
    expectTemplate: "live_start_position_change",
  },
  {
    id: "PL!S-bp5-019-L",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) =>
      cl.preconditionFilters?.minEitherSuccessLiveCount === 2 &&
      cl.handPickMax === 2 &&
      cl.filters?.pickType === "メンバー"
        ? []
        : ["yell pick"],
  },
  {
    id: "PL!S-bp5-020-L",
    trigger: "live_success",
    expectTemplate: "live_success_surplus_heart_score_plus",
    check: (cl) =>
      cl.minSurplusHearts === 3 && cl.cardScoreGrant === 1 && cl.loseAllSurplusHearts ? [] : ["surplus heart"],
  },
  {
    id: "PL!S-bp5-022-L",
    trigger: "live_start",
    expectTemplate: "live_start_moved_members_blade_grant",
    check: (cl) => (cl.grantToMovedMembersThisTurn && cl.bladeGain === 1 ? [] : ["moved blade"]),
  },
  {
    id: "PL!S-bp5-022-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.cardScoreGrant === 1 ? [] : ["score+1"]),
  },
  {
    id: "PL!S-bp5-023-L",
    trigger: "live_start",
    expectTemplate: "live_start_waiting_lives_reorder_deck_top",
    check: (cl) =>
      cl.deckTopPickMax === 4 &&
      cl.minStagePresenceSeriesCostSum === 20 &&
      JSON.stringify(cl.waitingSeriesTags) === JSON.stringify(["Aqours", "SaintSnow"])
        ? []
        : ["waiting lives reorder"],
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
    console.error("NO_SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = c.jouji
    ? classifyJoujiSegment(seg.text)
    : classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (c.jouji) {
    if (c.expectTemplate !== cl.kind) errs.push(`template ${cl.kind}`);
  } else if (c.trigger === "jouji") {
    if (c.expectTemplate !== "passive_track") errs.push("jouji passive_track expected");
  } else {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    if (!abilityEffectIsAutomated(cl.template)) errs.push("not automated");
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
  console.error(`\nverify-aqours-bp5: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-aqours-bp5: ${CASES.length} OK`);
