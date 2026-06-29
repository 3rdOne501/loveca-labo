#!/usr/bin/env node
/** 蓮ノ空 bp2 / NEXTSTEP（PL!HS-bp2）代表カードの分類・パターン回帰 */
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
  { id: "PL!HS-bp2-001-P", trigger: "kidou", expectTemplate: "kidou_wait_pick_hand" },
  { id: "PL!HS-bp2-006-P", trigger: "toujyou", expectTemplate: "toujou_optional_all_members_relocate" },
  {
    id: "PL!HS-bp2-009-P",
    trigger: "toujyou",
    expectTemplate: "toujou_baton_series_heart_grant",
    check: (cl) => (cl.filters?.seriesTag === "みらくらぱーく！" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!HS-bp2-010-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 5 && cl.optional ? [] : ["deckTop/optional"]),
  },
  {
    id: "PL!HS-bp2-011-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) => (cl.deckTopCount === 5 && !cl.optional ? [] : ["deckTopCount/optional"]),
  },
  { id: "PL!HS-bp2-012-N", trigger: "jidou", expectTemplate: "jidou_leave_stage_deck_look_pick" },
  { id: "PL!HS-bp2-004-P", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  {
    id: "PL!HS-bp2-005-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "みらくらぱーく！" && cl.filters?.minStageMembers === 2
        ? []
        : ["optional/mira/minStage"],
  },
  {
    id: "PL!HS-bp2-005-P",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) =>
      cl.bladeGain === 2 && cl.filters?.requiresAllStageAreasFilled ? [] : ["blade/all areas"],
  },
  {
    id: "PL!HS-bp2-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => {
      const errs = [];
      if (cl.requiresBatonFromLowerCostSeriesTag !== "スリーズブーケ") errs.push("baton series");
      if (cl.filters?.seriesTag !== "蓮ノ空") errs.push("recover 蓮ノ空");
      if (cl.filters?.pickType !== "ライブ") errs.push("pick live");
      return errs;
    },
  },
  {
    id: "PL!HS-bp2-014-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.grantPlayerCannotLiveUntilLiveEnd ? [] : ["cannot live"]),
  },
  {
    id: "PL!HS-bp2-017-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.filters?.minWaitingAnyCardCount === 10 ? [] : ["wait 10"]),
  },
  { id: "PL!HS-bp2-018-N", trigger: "toujyou", expectTemplate: "toujou_main_phase_live_from_waiting" },
  {
    id: "PL!HS-bp2-019-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_set_choice",
    check: (cl) => (cl.filters?.minStageSeriesMembers === 1 ? [] : ["stage series"]),
  },
  {
    id: "PL!HS-bp2-020-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus_per_unit",
    check: (cl) =>
      cl.scoreUnitKind === "distinct_name_series_stage_members" && cl.filters?.seriesTag === "蓮ノ空"
        ? []
        : ["scoreUnitKind/series"],
  },
  {
    id: "PL!HS-bp2-021-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_fixed",
    check: (cl) =>
      cl.needHeartReduceMap?.heart04 === 1 && cl.filters?.requiresBatonMembersThisTurn === 2
        ? []
        : ["heart04/baton"],
  },
  {
    id: "PL!HS-bp2-022-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.cardScoreGrant === 1 && cl.filters?.minWaitingSeriesLiveCount === 3 ? [] : ["score/waiting"],
  },
  {
    id: "PL!HS-bp2-023-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_fixed",
    check: (cl) => (cl.needHeartReduceMap?.heart05 === 1 ? [] : ["heart05"]),
  },
  {
    id: "PL!HS-bp2-024-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_fixed",
    check: (cl) =>
      cl.needHeartReduceMap?.heart0 === 3 &&
      cl.filters?.requiresNamedMemberPairCostOrder?.smaller === "徒町小鈴"
        ? []
        : ["heart0/pair"],
  },
  {
    id: "PL!HS-bp2-025-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_fixed",
    check: (cl) => (cl.needHeartReduceMap?.heart01 === 1 ? [] : ["heart01"]),
  },
  {
    id: "PL!HS-bp2-026-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 2) errs.push("score +2");
      const areas = cl.filters?.requiresStageNamedMemberAreas;
      if (!areas || areas.length !== 3) errs.push("area layout");
      return errs;
    },
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
  console.error(`\n${failed} hasunosora-bp2 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} hasunosora-bp2 cases passed`);
