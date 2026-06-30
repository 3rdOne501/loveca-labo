#!/usr/bin/env node
/** μ's bp6 / RoyalHoliday（PL!-bp6）メンバー代表カードの分類・パターン回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!-bp6-001-P",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minLiveFrameCount !== 1) errs.push("minLiveFrameCount");
      if (cl.filters?.minLiveFrameSeriesTag !== "μ's") errs.push("minLiveFrameSeriesTag");
      if (cl.stageArea !== "center") errs.push("stageArea");
      if (cl.grantToStageSeriesTag !== "μ's" || cl.grantToStageSeriesMax !== 99) {
        errs.push("grantAllMuseStage");
      }
      if (cl.bladeGain !== 1) errs.push("bladeGain");
      return errs;
    },
  },
  {
    id: "PL!-bp6-001-P",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.filters?.requiresYellRevealedNoBladeHeartMember && cl.filters?.seriesTag === "μ's"
        ? []
        : ["yell nobh / seriesTag"],
  },
  {
    id: "PL!-bp6-002-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_no_ability_or_jouji",
    check: (cl) => (!cl.optional && !cl.hasOptionalCost ? [] : ["must-not-skip-peek"]),
  },
  {
    id: "PL!-bp6-004-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 5 && cl.hasOptionalCost && cl.filters?.seriesTag === "μ's" ? [] : ["deck5 muse"],
  },
  {
    id: "PL!-bp6-003-P",
    trigger: "live_start",
    expectTemplate: "live_start_hand_reveal_under_heart_grant",
    check: (cl) => (cl.filters?.maxCost === 2 && cl.filters?.seriesTag === "μ's" ? [] : ["cost/series"]),
  },
  {
    id: "PL!-bp6-003-P",
    trigger: "live_success",
    expectTemplate: "live_success_enter_under_member",
    check: (cl) => (cl.filters?.maxCost === 2 ? [] : ["maxCost"]),
  },
  {
    id: "PL!-bp6-005-P",
    trigger: "toujyou",
    expectTemplate: "toujou_hand_discard_wait_heart_dual_pick",
    check: (cl) => (cl.requiredHeartSlot === 3 ? [] : ["requiredHeartSlot"]),
  },
  {
    id: "PL!-bp6-007-P",
    trigger: "live_success",
    expectTemplate: "deck_top_reveal_hand_score_grant",
    check: (cl) => (cl.grantIfNoBhMember && cl.liveScoreGrant === 1 ? [] : ["nobh score"]),
  },
  {
    id: "PL!-bp6-008-P",
    trigger: "kidou",
    expectTemplate: "kidou_self_wait_activate_other",
    check: (cl) => (cl.costSelfWait && cl.perTurnLimit === 1 ? [] : ["self wait"]),
  },
  {
    id: "PL!-bp6-006-P",
    trigger: "kidou",
    expectTemplate: "kidou_heart_color_deck_reveal_pick",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 5) errs.push("deckTopCount");
      if (cl.deckRevealMatchCount !== 5) errs.push("deckRevealMatchCount");
      if (cl.bladeGain !== 3) errs.push("bladeGain");
      if (cl.filters?.seriesTag !== "μ's") errs.push("seriesTag");
      return errs;
    },
  },
  {
    id: "PL!-bp6-011-N",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 2 && cl.effectDiscardCount === 2 ? [] : ["draw2 discard2"],
  },
  {
    id: "PL!-bp6-012-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.requiresSuccessLiveSeriesTag === "Printemps" ? [] : ["printemps sl"];
    },
  },
  {
    id: "PL!-bp6-016-N",
    trigger: "live_success",
    expectTemplate: "deck_top_look_reorder",
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["deck3"]),
  },
  {
    id: "PL!-bp6-009-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.leftRightSideExactPrintedBlade === 2 && rule?.liveScorePlus === 1 ? [] : ["jouji side blade"];
    },
  },
  {
    id: "PL!-bp6-010-N",
    trigger: "kidou",
    expectTemplate: "kidou_self_to_wait_opp_wait",
    check: (cl) => (cl.oppWaitMaxCost === 4 ? [] : ["oppWaitMaxCost"]),
  },
  {
    id: "PL!-bp6-013-N",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.filters?.minSuccessLiveScoreSum === 6 && cl.filters?.seriesTag === "μ's" ? [] : ["sl score/series"],
  },
  {
    id: "PL!-bp6-019-L",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      const errs = [];
      if (rule?.kind !== "grant_hand_series_cost_reduce") errs.push("kind");
      if (rule?.handCostReduceMinCost !== 17) errs.push("minCost");
      if (rule?.handCostReduceSeriesTag !== "μ's") errs.push("seriesTag");
      if (!rule?.requiresSuccessLiveSelf) errs.push("requiresSuccessLiveSelf");
      return errs;
    },
  },
  {
    id: "PL!-bp6-020-L",
    trigger: "jidou",
    segHint: /ポジションチェンジ/,
    expectTemplate: "jidou_center_muse_ability_position_change",
    check: (_cl, seg) => {
      const cl = classifyJidouAutoSegment(seg.text);
      return cl.resolvedAbilityKind === "live_start" ? [] : ["resolvedAbilityKind live_start"];
    },
  },
  {
    id: "PL!-bp6-020-L",
    trigger: "jidou",
    segHint: /移動している場合/,
    expectTemplate: "jidou_center_muse_ability_score_if_moved",
    check: (_cl, seg) => {
      const cl = classifyJidouAutoSegment(seg.text);
      return cl.resolvedAbilityKind === "live_success" ? [] : ["resolvedAbilityKind live_success"];
    },
  },
  {
    id: "PL!-bp6-021-L",
    trigger: "live_success",
    expectTemplate: "live_success_optional_stage_to_waiting_score_recover",
    check: (cl) => {
      const errs = [];
      if (!cl.optional) errs.push("optional");
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant");
      if (cl.filters?.seriesTag !== "μ's") errs.push("seriesTag");
      if (cl.recoverPickFilters?.seriesTag !== "μ's") errs.push("recoverSeries");
      return errs;
    },
  },
  {
    id: "PL!-bp6-022-L",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      const errs = [];
      if (rule?.kind !== "success_live_live_need_heart_reduce") errs.push("kind");
      if (rule?.minLivePrintedScore !== 5) errs.push("minLivePrintedScore");
      if (rule?.seriesTag !== "μ's") errs.push("seriesTag");
      if (rule?.needHeartReduceMap?.heart0 !== 2) errs.push("heart0 reduce");
      return errs;
    },
  },
  {
    id: "PL!-bp6-023-L",
    trigger: "live_success",
    expectTemplate: "draw_then_conditional_extra_draw",
    check: (cl) =>
      cl.extraDrawCondType === "successLiveSeries" && cl.extraDrawCondSeriesTag === "μ's"
        ? []
        : ["extra draw cond"],
  },
  {
    id: "PL!-bp6-024-L",
    trigger: "jouji",
    expectTemplate: "jouji_success_live_waiting_substitute",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "success_live_waiting_substitute" && rule?.seriesTag === "μ's" ? [] : ["substitute"];
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
  const segs = splitAbilityByTriggers(cardAbilityRawText(card));
  const seg = c.segHint
    ? segs.find((s) => s.trigger === c.trigger && c.segHint.test(s.text))
    : segs.find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (c.trigger === "jidou") {
    const jcl = classifyJidouAutoSegment(seg.text);
    if (jcl.template !== c.expectTemplate) errs.push(`template ${jcl.template}`);
    if (!abilityEffectIsAutomated(jcl.template)) errs.push("not automated");
  } else if (c.trigger !== "jouji") {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    if (!abilityEffectIsAutomated(cl.template)) errs.push("not automated");
  } else if (c.expectTemplate !== "passive_track" && cl.template !== c.expectTemplate) {
    errs.push(`template ${cl.template}`);
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
  console.error(`\n${failed} muse-bp6 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} muse-bp6 cases passed`);
