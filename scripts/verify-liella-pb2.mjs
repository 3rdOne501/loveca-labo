#!/usr/bin/env node
/** Liella! pb2（PL!SP-pb2）代表カードの分類・パターン回帰 */
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
  {
    id: "PL!SP-pb2-001-R",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_enter_or_hand",
  },
  {
    id: "PL!SP-pb2-002-R",
    trigger: "kidou",
    expectTemplate: "ability_sequence",
    check: (cl) => ((cl.steps || []).length >= 2 ? [] : ["steps"]),
  },
  { id: "PL!SP-pb2-003-R", trigger: "live_success", expectTemplate: "live_success_liella_effect_moved_score" },
  { id: "PL!SP-pb2-005-R", trigger: "toujyou", expectTemplate: "toujou_baton_discarded_under" },
  {
    id: "PL!SP-pb2-009-R",
    trigger: "toujyou",
    expectTemplate: "optional_pick_member_wait_opp_blade_gap",
    check: (cl) => (cl.oppBladeGapMin != null ? [] : ["oppBladeGapMin"]),
  },
  {
    id: "PL!SP-pb2-009-R",
    trigger: "live_start",
    expectTemplate: "optional_pick_member_wait_opp_blade_gap",
    check: (cl) => (cl.oppBladeGapMin != null ? [] : ["oppBladeGapMin"]),
  },
  {
    id: "PL!SP-pb2-010-R",
    trigger: "live_start",
    expectTemplate: "live_start_mandatory_energy_deck_unless_hand_discard",
  },
  { id: "PL!SP-pb2-011-R", trigger: "jidou", expectTemplate: "jidou_center_member_move_choice" },
  {
    id: "PL!SP-pb2-010-R",
    trigger: "live_success",
    expectTemplate: "live_success_pick_options",
  },
  {
    id: "PL!SP-pb2-000-R",
    trigger: "toujyou",
    expectTemplate: "toujou_baton_discarded_series_per_card",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!SP-pb2-004-R",
    trigger: "live_success",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.drawOrPreconditions && cl.requiresLiveAreaScoreAbovePrinted && cl.requiresYellRevealedOwnLiveCard
        ? []
        : ["drawOrPreconditions"],
  },
  {
    id: "PL!SP-pb2-006-R",
    trigger: "jidou",
    expectTemplate: "jidou_live_success_or_area_move_wait_under",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!SP-pb2-007-R",
    trigger: "live_success",
    expectTemplate: "live_success_optional_energy_recover_waiting",
    check: (cl) => (cl.costEnergyCount === 3 && cl.optional ? [] : ["cost/optional"]),
  },
  {
    id: "PL!SP-pb2-008-R",
    trigger: "live_success",
    expectTemplate: "live_success_yell_nobh_series_score_capped",
    check: (cl) => (cl.liveScoreCapMax === 2 ? [] : ["liveScoreCapMax"]),
  },
  {
    id: "PL!SP-pb2-011-R",
    trigger: "live_start",
    expectTemplate: "live_start_position_change",
  },
  { id: "PL!SP-pb2-012-R", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  {
    id: "PL!SP-pb2-013-R",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => ((cl.steps || []).length >= 2 ? [] : ["steps"]),
  },
  { id: "PL!SP-pb2-014-R", trigger: "toujyou", expectTemplate: "toujou_optional_all_members_relocate" },
  { id: "PL!SP-pb2-015-R", trigger: "toujyou", expectTemplate: "toujou_wait_pick_hand" },
  {
    id: "PL!SP-pb2-017-R",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 5 ? [] : ["deckTopCount"]),
  },
  { id: "PL!SP-pb2-018-R", trigger: "live_start", expectTemplate: "activate_energy" },
  {
    id: "PL!SP-pb2-020-R",
    trigger: "jidou",
    expectTemplate: "jidou_yell_optional_hand_live_extra_yell",
  },
  {
    id: "PL!SP-pb2-022-R",
    trigger: "jidou",
    expectTemplate: "jidou_series_member_to_center_blade_grant",
    check: (cl) => (cl.bladeGain === 4 ? [] : ["bladeGain"]),
  },
  {
    id: "PL!SP-pb2-023-N",
    trigger: "jouji",
    expectTemplate: "energy_tier_hearts",
  },
  { id: "PL!SP-pb2-025-N", trigger: "toujyou", expectTemplate: "live_start_position_change" },
  { id: "PL!SP-pb2-028-N", trigger: "jidou", expectTemplate: "jidou_area_move_activate_energy" },
  {
    id: "PL!SP-pb2-029-N",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.oppWaitMaxCost === 2 ? [] : ["oppWaitMaxCost"]),
  },
  { id: "PL!SP-pb2-030-N", trigger: "live_start", expectTemplate: "heart_color_pick_replace" },
  { id: "PL!SP-pb2-036-N", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  {
    id: "PL!SP-pb2-040-N",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => (cl.optional && cl.costEnergy ? [] : ["optional E"]),
  },
  {
    id: "PL!SP-pb2-045-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus_per_unit",
    check: (cl) => {
      const errs = [];
      if (cl.scoreUnitKind !== "series_stage_members_min_hearts") errs.push("scoreUnitKind");
      if (cl.minMemberHeartTotal !== 4) errs.push("minMemberHeartTotal");
      if (cl.scoreUnitSeries !== "Liella!") errs.push("scoreUnitSeries");
      if (cl.cardScorePerUnit !== 1) errs.push("cardScorePerUnit");
      return errs;
    },
  },
  {
    id: "PL!SP-pb2-046-L",
    trigger: "jouji",
    expectTemplate: "block_stage_member_live_start",
    check: (cl) => (cl.requiresInLiveFrames === true ? [] : ["requiresInLiveFrames"]),
  },
  {
    id: "PL!SP-pb2-046-L",
    trigger: "live_success",
    expectTemplate: "live_success_score_if_stage_live_start_member",
    check: (cl) => (cl.cardScoreGrant === 1 ? [] : ["cardScoreGrant"]),
  },
  {
    id: "PL!SP-pb2-047-L",
    trigger: "live_start",
    expectTemplate: "live_start_opp_wait_max_cost",
    check: (cl) => {
      const errs = [];
      if (!cl.optional || !cl.hasOptionalCost) errs.push("optional cost");
      if (cl.handDiscardToWaiting !== 1) errs.push("handDiscard");
      if (cl.oppWaitMaxCost !== 2) errs.push("oppWaitMaxCost");
      if (cl.filters?.requiresStageOnlySeries !== "Liella!") errs.push("requiresStageOnlySeries");
      return errs;
    },
  },
  {
    id: "PL!SP-pb2-048-L",
    trigger: "live_start",
    expectTemplate: "live_start_distinct_series_need_heart_shift_score",
    check: (cl) => {
      const errs = [];
      if (cl.scoreUnitSeries !== "CatChu!") errs.push("series");
      if (cl.needHeartReducePerUnitMap?.heart0 !== 2) errs.push("reduce heart0");
      if (cl.needHeartIncreasePerUnitMap?.heart02 !== 1) errs.push("increase heart02");
      if (cl.scoreIfNeedHeartSlotAtLeast?.slotKey !== "heart02") errs.push("score slot");
      if (cl.scoreIfNeedHeartSlotAtLeast?.min !== 9) errs.push("score min");
      return errs;
    },
  },
  {
    id: "PL!SP-pb2-049-L",
    trigger: "live_success",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      const errs = [];
      if (steps.length !== 2) errs.push("steps.length");
      if (steps[0]?.template !== "yell_resolution_count_energy_wait") errs.push("step0");
      if (steps[0]?.minResolutionCards !== 5) errs.push("step0 minResolutionCards");
      if (steps[0]?.filters?.seriesTag !== "KALEIDOSCORE") errs.push("step0 series");
      if (steps[1]?.template !== "live_card_score_plus") errs.push("step1");
      if (steps[1]?.filters?.minEnergyCount !== 11) errs.push("step1 minEnergy");
      if (steps[0]?.optional || steps[0]?.hasOptionalCost) errs.push("step0 optional inherit");
      return errs;
    },
  },
  {
    id: "PL!SP-pb2-050-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_formation_change",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minStageSeriesMembers !== 2) errs.push("minStageSeriesMembers");
      if (cl.filters?.minStageSeriesMembersTag !== "5yncri5e!") errs.push("series tag");
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
  const seg = c.trigger === "live_success" && c.id === "PL!SP-pb2-049-L"
    ? null
    : splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  if (c.trigger !== "live_success" || c.id !== "PL!SP-pb2-049-L") {
    if (!seg) {
      console.error("MISSING SEG", c.id, c.trigger);
      failed++;
      continue;
    }
  }
  const cl =
    c.trigger === "jouji"
      ? classifyJoujiSegment(seg.text)
      : classifyCardAbility(card, c.trigger, seg ? seg.text : null);
  const errs = [];
  const tmpl = c.trigger === "jouji" ? cl.kind : cl.template;
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (
    c.trigger !== "jouji" &&
    cl.template !== "ability_sequence" &&
    !abilityEffectIsAutomated(cl.template)
  ) {
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
  console.error(`\n${failed} liella-pb2 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} liella-pb2 cases passed`);
