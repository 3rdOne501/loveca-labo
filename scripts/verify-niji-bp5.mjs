#!/usr/bin/env node
/** 虹ヶ咲 bp5 / Anniversary2026（PL!N-bp5）メンバー・ライブ代表カードの分類回帰 */
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
    id: "PL!N-bp5-001-P",
    trigger: "jidou",
    jidou: true,
    expectTemplate: "jidou_yell_distinct_bh_tier_grant",
    check: (cl) =>
      cl.yellDistinctBhMinForHeart === 3 && cl.yellDistinctBhMinForJouji === 6 && cl.yellGrantHeartSlot === 1
        ? []
        : ["bh tier thresholds"],
  },
  {
    id: "PL!N-bp5-002-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "live_score_plus",
    check: (cl) => (cl.mostHeartsOnBothStages && cl.liveScorePlus === 1 ? [] : ["most hearts"]),
  },
  {
    id: "PL!N-bp5-003-P",
    trigger: "kidou",
    expectTemplate: "kidou_hand_discard_wait_live_score_pay",
    check: (cl) => (cl.handDiscardToWaiting === 1 && cl.perTurnLimit === 1 ? [] : ["hand discard"]),
  },
  {
    id: "PL!N-bp5-004-P",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) =>
      cl.costSelfWait && cl.optional && cl.oppWaitExactPrintedBlade === 4 ? [] : ["self wait/exact blade"],
  },
  {
    id: "PL!N-bp5-004-P",
    trigger: "live_start",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.oppWaitExactPrintedBlade === 4 ? [] : ["exact blade 4"]),
  },
  {
    id: "PL!N-bp5-005-P",
    trigger: "jidou",
    jidou: true,
    expectTemplate: "jidou_leave_baton_partner_bh_threshold_energy",
    check: (cl) =>
      cl.energyActiveCount === 2 &&
      cl.batonPartnerBhThreshold === 10 &&
      cl.batonPartnerDrawBhThreshold === 15 &&
      cl.filters?.seriesTag === "虹ヶ咲"
        ? []
        : ["baton bh threshold"],
  },
  {
    id: "PL!N-bp5-006-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "cannot_self_activate",
  },
  {
    id: "PL!N-bp5-006-P",
    trigger: "live_success",
    expectTemplate: "live_success_self_wait_if_others",
  },
  {
    id: "PL!N-bp5-008-P",
    trigger: "kidou",
    expectTemplate: "activate_energy",
    check: (cl) => (cl.energyActiveCount === 2 ? [] : ["activate 2"]),
  },
  {
    id: "PL!N-bp5-009-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 5 || cl.filters?.minCost !== 9 || cl.filters?.seriesTag !== "虹ヶ咲") {
        errs.push("deck5 niji");
      }
      if (!cl.costSelfWait || !cl.costHandDiscardOptional || cl.hasOptionalCost || cl.optional) {
        errs.push("mandatory wait optional hand");
      }
      return errs;
    },
  },
  {
    id: "PL!N-bp5-012-P",
    trigger: "kidou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.energyUnderCount !== 1) errs.push("energyUnderCount");
      if (cl.deckDrawCount !== 1) errs.push("deckDrawCount");
      if (cl.requiredHeartSlot !== 1) errs.push("requiredHeartSlot");
      return errs;
    },
  },
  {
    id: "PL!N-bp5-013-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.filters?.requiresAnyStageMemberWithEnergyUnder && cl.requiredHeartSlot === 1
        ? []
        : ["energy under precondition"],
  },
  {
    id: "PL!N-bp5-007-P",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 2 && cl.minSurplusHearts === 1 ? [] : ["draw2 surplus1"],
  },
  {
    id: "PL!N-bp5-015-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.bladeGain === 2 &&
      Array.isArray(cl.requiresStageCollectiveHeartSlots) &&
      cl.requiresStageCollectiveHeartSlots.length === 6
        ? []
        : ["collective hearts/blade"],
  },
  {
    id: "PL!N-bp5-016-N",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
  },
  {
    id: "PL!N-bp5-023-N",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
  },
  {
    id: "PL!N-bp5-007-P",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.filters?.requiresSuccessLiveCountTieWithOpponent ? [] : ["sl tie"]),
  },
  {
    id: "PL!N-bp5-010-P",
    trigger: "live_success",
    expectTemplate: "surplus_heart_score_modifier",
    check: (cl) => (cl.filters?.requiresZeroSurplusHearts ? [] : ["zero surplus"]),
  },
  {
    id: "PL!N-bp5-011-P",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    check: (cl) => (cl.abilityChoices?.length === 2 ? [] : ["choices"]),
  },
  {
    id: "PL!N-bp5-014-N",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.costEnergy &&
      cl.costEnergyCount === 2 &&
      cl.filters?.seriesTag === "虹ヶ咲" &&
      cl.handDiscardToWaiting === 1
        ? []
        : ["E2 hand discard niji live"],
  },
  {
    id: "PL!N-bp5-012-P",
    trigger: "live_success",
    expectTemplate: "live_score_higher_energy_wait",
    check: (cl) => (cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["score higher"]),
  },
  {
    id: "PL!N-bp5-019-N",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.optional && cl.hasOptionalCost ? [] : ["optional"]),
  },
  {
    id: "PL!N-bp5-021-N",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      const errs = [];
      if (steps[0]?.template !== "deck_top_to_waiting" || steps[0]?.deckTopCount !== 2) errs.push("step0 mill");
      if (steps[1]?.template !== "toujou_optional_wait_to_deck_top") errs.push("step1 deck top");
      if (steps[0]?.optional || steps[0]?.hasOptionalCost) errs.push("step0 optional inherit");
      return errs;
    },
  },
  {
    id: "PL!N-bp5-022-N",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["niji series"]),
  },
  {
    id: "PL!N-bp5-026-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.cardScoreGrant === 1 &&
      Array.isArray(cl.requiresStageCollectiveHeartSlots) &&
      cl.requiresStageCollectiveHeartSlots.length === 6
        ? []
        : ["collective hearts/score"],
  },
  {
    id: "PL!N-bp5-026-L",
    trigger: "live_success",
    expectTemplate: "live_success_recover_from_waiting",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.requiresSelfScoreEquals === 3 ? [] : ["score3 niji"],
  },
  {
    id: "PL!N-bp5-027-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 1 || cl.filters?.minEitherSuccessLiveCount !== 2) errs.push("sl2");
      if (cl.filters?.minDistinctStageMemberNames !== 3) errs.push("distinct3");
      return errs;
    },
  },
  {
    id: "PL!N-bp5-028-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_set_fixed",
    check: (cl) =>
      cl.needHeartSetMap?.heart02 === 6 && cl.cardScoreGrant === 2 ? [] : ["heart02x6 score+2"],
  },
  {
    id: "PL!N-bp5-029-L",
    trigger: "live_start",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) =>
      cl.deckTopCount === 4 && cl.filters?.characterNameOnStage === "中須かすみ" ? [] : ["mill4 kasumi"],
  },
  {
    id: "PL!N-bp5-030-L",
    trigger: "jidou",
    jidou: true,
    segIndex: 0,
    expectTemplate: "jidou_member_live_start_grant_all_heart",
  },
  {
    id: "PL!N-bp5-030-L",
    trigger: "jidou",
    jidou: true,
    segIndex: 1,
    expectTemplate: "jidou_member_live_success_draw",
    check: (cl) => (cl.deckDrawCount === 1 ? [] : ["draw1"]),
  },
];

const NO_ABILITY = ["PL!N-bp5-017-N", "PL!N-bp5-018-N", "PL!N-bp5-020-N", "PL!N-bp5-024-N", "PL!N-bp5-025-L"];

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
  console.error(`\nverify-niji-bp5: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-niji-bp5: ${CASES.length + NO_ABILITY.length} OK`);
