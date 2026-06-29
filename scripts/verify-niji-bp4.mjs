#!/usr/bin/env node
/** 虹ヶ咲 bp4 / SAPPHIREMOON（PL!N-bp4）代表カードの分類・パターン回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, jidou?:boolean, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!N-bp4-001-P",
    trigger: "live_success",
    expectTemplate: "energy_less_than_opponent_wait",
  },
  {
    id: "PL!N-bp4-002-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_player_deck_top_peek",
  },
  {
    id: "PL!N-bp4-003-P",
    trigger: "live_success",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["requiresLiveScoreHigherThanOpponent"],
  },
  {
    id: "PL!N-bp4-004-P",
    trigger: "live_start",
    expectTemplate: "live_start_draw_opp_wait",
    check: (cl) => (cl.filters?.maxCost === 9 ? [] : ["oppWait maxCost 9"]),
  },
  {
    id: "PL!N-bp4-004-P",
    trigger: "live_start",
    expectTemplate: "waiting_to_deck_top_by_opp_wait_count",
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!N-bp4-017-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pickType member"]),
  },
  {
    id: "PL!N-bp4-020-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
  },
  {
    id: "PL!N-bp4-005-P",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.oppWaitCount === 2 && cl.handDiscardToWaiting === 1 ? [] : ["opp wait 2 / discard"]),
  },
  {
    id: "PL!N-bp4-006-P",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      if (steps.length !== 2) return ["steps.length"];
      if (steps[0].template !== "toujou_hand_stage_enter") return ["step0"];
      if (steps[1].template !== "toujou_self_wait_if_hand_enter_bh") return ["step1"];
      return [];
    },
  },
  {
    id: "PL!N-bp4-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_both_wait_pick_live_hand",
  },
  {
    id: "PL!N-bp4-007-P",
    trigger: "jouji",
    expectTemplate: "blade_conditional",
    jouji: true,
    check: (cl) => (cl.minCombinedEnergy === 15 ? [] : ["minCombinedEnergy 15"]),
  },
  {
    id: "PL!N-bp4-007-P",
    trigger: "live_success",
    expectTemplate: "both_players_energy_deck_wait",
  },
  {
    id: "PL!N-bp4-009-P",
    trigger: "live_start",
    expectTemplate: "draw_then_hand_to_deck_top",
    check: (cl) => {
      const errs = [];
      if (cl.deckDrawCount !== 2) errs.push("draw 2");
      if (cl.effectHandToDeckTopCount !== 1) errs.push("hand top 1");
      if (!cl.filters?.requiresOwnStageCostSumLowerThanOpponent) errs.push("cost sum cmp");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-011-P",
    trigger: "live_success",
    expectTemplate: "live_success_deck_wait_pick_live",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 5) errs.push("mill 5");
      if (cl.minDistinctLiveNames !== 3) errs.push("distinct 3");
      if (cl.filters?.seriesTag !== "虹ヶ咲") errs.push("series");
      if (cl.template === "deck_top_pick_recover") errs.push("must not be pick_recover");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-013-N",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => (cl.bladeGain === 2 && cl.costEnergyCount === 1 ? [] : ["blade/cost"]),
  },
  {
    id: "PL!N-bp4-016-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_look_reorder",
    check: (cl) => (cl.deckTopCount === 2 && cl.costSelfWait ? [] : ["look 2 self wait"]),
  },
  {
    id: "PL!N-bp4-018-N",
    trigger: "jidou",
    expectTemplate: "jidou_self_active_to_wait_draw_discard",
  },
  {
    id: "PL!N-bp4-021-N",
    trigger: "toujyou",
    expectTemplate: "toujou_optional_wait_to_deck_top",
  },
  {
    id: "PL!N-bp4-023-N",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) => {
      const errs = [];
      if (!cl.hasOptionalCost) errs.push("optional cost");
      if (!cl.costPickMemberWait) errs.push("pick wait");
      if (cl.filters?.seriesTag !== "虹ヶ咲") errs.push("series 虹ヶ咲");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-008-P",
    trigger: "kidou",
    expectTemplate: "kidou_energy_or_activate_member",
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" && cl.perTurnLimit === 1 ? [] : ["kidou filters"]),
  },
  { id: "PL!N-bp4-010-P", trigger: "toujyou", expectTemplate: "success_live_waiting_swap" },
  {
    id: "PL!N-bp4-010-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_live_frame_match_success_live_grant",
  },
  {
    id: "PL!N-bp4-011-P",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
  },
  {
    id: "PL!N-bp4-012-P",
    trigger: "jouji",
    expectTemplate: "live_score_plus",
    jouji: true,
    check: (cl) =>
      cl.minOpponentSuccessLiveScoreSum === 6 && cl.liveScorePlus === 1 ? [] : ["opp SL score 6"],
  },
  {
    id: "PL!N-bp4-027-L",
    trigger: "live_start",
    expectTemplate: "live_start_score_plus_per_named_success_live",
    check: (cl) => {
      const errs = [];
      if (cl.namedSuccessLiveCard !== "EMOTION") errs.push("namedSuccessLiveCard");
      if (cl.cardScorePerUnit !== 2) errs.push("cardScorePerUnit 2");
      if (!cl.needHeartIncreasePerUnitMap?.heart0 || cl.needHeartIncreasePerUnitMap.heart0 !== 3) {
        errs.push("needHeart heart0 x3");
      }
      return errs;
    },
  },
  {
    id: "PL!N-bp4-029-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant 1");
      if (cl.bladeGain !== 1) errs.push("bladeGain 1");
      if (!cl.filters?.requiresFirstGameLivePhase) errs.push("requiresFirstGameLivePhase");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-031-L",
    trigger: "live_start",
    expectTemplate: "draw_then_hand_to_deck_top",
    check: (cl) => {
      const errs = [];
      if (cl.deckDrawCount !== 3) errs.push("draw 3");
      if (cl.effectHandToDeckTopCount !== 3) errs.push("hand top 3");
      if (cl.requiresStageAllAreasSeriesTag !== "虹ヶ咲") errs.push("all areas tag");
      if (cl.minStageSeriesPrintedCostSum !== 20) errs.push("cost sum 20");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-025-L",
    trigger: "live_start",
    expectTemplate: "live_start_yell_blade_remap_slot",
    check: (cl) => (cl.yellBladeRemapSlot === 5 ? [] : ["remap slot 5 blue"]),
  },
  {
    id: "PL!N-bp4-025-L",
    trigger: "live_success",
    expectTemplate: "live_success_yell_series_members_all_hearts_score",
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!N-bp4-026-L",
    trigger: "jidou",
    expectTemplate: "jidou_waiting_to_hand_place_named_live",
    jidou: true,
    check: (cl) => {
      const errs = [];
      if (cl.namedLiveCard !== "DIVE!") errs.push("namedLiveCard");
      if (cl.liveSetLimitPenalty !== 1) errs.push("limit penalty");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-026-L",
    trigger: "jidou",
    expectTemplate: "jidou_live_placed_grant_stage_member",
    jidou: true,
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!N-bp4-028-L",
    trigger: "live_start",
    expectTemplate: "live_start_tiered_waiting_distinct_score",
    check: (cl) => {
      const errs = [];
      if (cl.tierWaitingDistinctMin !== 4) errs.push("tier 4");
      if (cl.tierWaitingDistinctHigh !== 6) errs.push("tier 6");
      if (cl.cardScoreGrantHigh !== 2) errs.push("score +2");
      if (cl.filters?.seriesTag !== "虹ヶ咲") errs.push("series");
      return errs;
    },
  },
  {
    id: "PL!N-bp4-030-L",
    trigger: "live_success",
    expectTemplate: "live_success_pick_options",
    check: (cl) => {
      const errs = [];
      if (cl.choiceBoostSeriesTag !== "虹ヶ咲") errs.push("boost tag");
      if (cl.choiceBoostMax !== 2) errs.push("boost max 2");
      if ((cl.abilityChoices || []).length !== 2) errs.push("2 choices");
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
  const segs = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger === c.trigger);
  let seg = null;
  for (const s of segs) {
    const trial = c.jouji
      ? classifyJoujiSegment(s.text)
      : c.jidou
        ? classifyJidouAutoSegment(s.text)
        : classifyCardAbility(card, c.trigger, s.text);
    const trialTmpl = c.jouji ? trial.kind : trial.template;
    if (trialTmpl === c.expectTemplate) {
      seg = s;
      break;
    }
  }
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger, c.expectTemplate);
    failed++;
    continue;
  }
  const cl = c.jouji ? classifyJoujiSegment(seg.text) : c.jidou ? classifyJidouAutoSegment(seg.text) : classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  const tmpl = c.jouji ? cl.kind : cl.template;
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (!c.jouji && !c.jidou && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, c.expectTemplate, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.expectTemplate);
  }
}

for (const id of [
  "PL!N-bp4-014-N",
  "PL!N-bp4-015-N",
  "PL!N-bp4-019-N",
  "PL!N-bp4-022-N",
  "PL!N-bp4-024-N",
  "PL!N-bp4-032-L",
]) {
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
  console.error(`\n${failed} niji-bp4 case(s) failed`);
  process.exit(1);
}
const totalCases = CASES.length + 6;
console.log(`\nAll ${totalCases} niji-bp4 cases passed`);
