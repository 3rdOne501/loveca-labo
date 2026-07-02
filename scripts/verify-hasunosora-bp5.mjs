#!/usr/bin/env node
/** 蓮ノ空 bp5 / Anniversary2026（PL!HS-bp5）メンバー・ライブ代表カードの分類回帰 */
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
    id: "PL!HS-bp5-001-P",
    trigger: "toujyou",
    expectTemplate: "deck_mill_conditional_blade_grant",
    check: (cl) => (cl.deckTopCount === 4 && cl.bladeGain === 2 ? [] : ["mill4 blade2"]),
  },
  {
    id: "PL!HS-bp5-001-P",
    trigger: "kidou",
    expectTemplate: "kidou_wait_pick_hand",
    check: (cl) => (cl.costEnergyCount === 2 && cl.perTurnLimit === 1 ? [] : ["E2"]),
  },
  {
    id: "PL!HS-bp5-002-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "blade_conditional",
    check: (cl) => (cl.minDistinctCostStageMembers === 3 ? [] : ["distinct cost 3"]),
  },
  {
    id: "PL!HS-bp5-003-P",
    trigger: "jidou",
    jidou: true,
    expectTemplate: "jidou_leave_stage_position_change",
  },
  {
    id: "PL!HS-bp5-003-P",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_group_member_grant",
    check: (cl) =>
      cl.handDiscardExact === 1 &&
      cl.grantToDiscardedCardGroupMember &&
      cl.requiredHeartSlot === 1
        ? []
        : ["group member heart01"],
  },
  {
    id: "PL!HS-bp5-004-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "blade_per_stage_member",
    check: (cl) =>
      cl.bladePer === 2 && cl.excludeSeriesTag === "スリーズブーケ" ? [] : ["blade per member"],
  },
  {
    id: "PL!HS-bp5-005-P",
    trigger: "live_start",
    expectTemplate: "live_start_dollcostra_cost_set_grant_if",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.seriesTag !== "DOLLCHESTRA") errs.push("series");
      if (cl.grantFollowupMinSelfPrintedCost !== 10) errs.push("cost10");
      if (cl.requiredHeartSlot !== 5) errs.push("heart5");
      if (cl.handDiscardToWaiting) errs.push("no generic hand discard");
      return errs;
    },
  },
  {
    id: "PL!HS-bp5-006-P",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_same_group_grant",
    check: (cl) => (cl.handDiscardToWaiting === 2 ? [] : ["discard2"]),
  },
  {
    id: "PL!HS-bp5-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "EdelNote" && cl.handDiscardToWaiting === 2 ? [] : ["edelnote"],
  },
  {
    id: "PL!HS-bp5-008-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 5 &&
      cl.costSelfWait &&
      cl.costHandDiscardOptional &&
      cl.filters?.seriesTag === "蓮ノ空"
        ? []
        : ["deck5 hasunosora wait"],
  },
  {
    id: "PL!HS-bp5-013-N",
    trigger: "live_start",
    expectTemplate: "live_start_deck_top_if_all_members_grant",
    check: (cl) => (cl.deckTopCount === 3 && cl.bladeGain === 2 ? [] : ["mill3 blade2"]),
  },
  {
    id: "PL!HS-bp5-017-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.optional && cl.costEnergy && cl.filters?.seriesTag === "蓮ノ空" && cl.cardScoreGrant === 1
        ? []
        : ["optional E score+1"],
  },
  {
    id: "PL!HS-bp5-020-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.filters?.minCost === 10 && cl.filters?.seriesTag === "蓮ノ空" ? [] : ["c10+ hasunosora"]),
  },
  {
    id: "PL!HS-bp5-011-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
  },
  {
    id: "PL!HS-bp5-014-N",
    trigger: "jidou",
    jidou: true,
    expectTemplate: "jidou_area_move_grant_jouji",
  },
  {
    id: "PL!HS-bp5-016-N",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.filters?.maxCost === 4 && cl.handDiscardToWaiting === 1 ? [] : ["c4 discard"]),
  },
  {
    id: "PL!HS-bp5-018-L",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "extra_series_tags_all_zones",
    check: (cl) =>
      JSON.stringify(cl.extraSeriesTags) ===
      JSON.stringify(["スリーズブーケ", "DOLLCHESTRA", "みらくらぱーく！"])
        ? []
        : ["extra series"],
  },
  {
    id: "PL!HS-bp5-019-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_per_unit",
    check: (cl) =>
      cl.needHeartReduceUnitKind === "live_area_other_series" &&
      cl.needHeartReduceSlotKey === "heart04" &&
      cl.needHeartReducePerUnit === 2
        ? []
        : ["live area reduce"],
  },
  {
    id: "PL!HS-bp5-021-L",
    trigger: "live_start",
    segIndex: 0,
    expectTemplate: "live_start_pick_stage_member_printed_hearts_remap",
    check: (cl) => (cl.printedHeartsRemapSlot === 1 ? [] : ["remap heart01"]),
  },
  {
    id: "PL!HS-bp5-021-L",
    trigger: "live_start",
    segIndex: 1,
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.filters?.minStageSeriesMembers === 3 && cl.filters?.minStageSeriesMembersTag === "みらくらぱーく！"
        ? []
        : ["mirapark 3"],
  },
  {
    id: "PL!HS-bp5-022-L",
    trigger: "live_start",
    expectTemplate: "ability_pick_one",
    check: (cl) => {
      const errs = [];
      if (!cl.optional || cl.costEnergyCount !== 2) errs.push("optional E2");
      if (cl.filters?.seriesTag !== "EdelNote") errs.push("edelnote");
      if (cl.filters?.minCostMemberOnStage !== 9 && cl.filters?.minCost !== 9) errs.push("stage c9+");
      if (!cl.abilityChoices || cl.abilityChoices.length !== 2) errs.push("choices");
      return errs;
    },
  },
];

const NO_ABILITY = [
  "PL!HS-bp5-009-N",
  "PL!HS-bp5-010-N",
  "PL!HS-bp5-012-N",
  "PL!HS-bp5-015-N",
];

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
  console.error(`\nverify-hasunosora-bp5: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-hasunosora-bp5: ${CASES.length + NO_ABILITY.length} OK`);
