#!/usr/bin/env node
/** µ's bp4 / SAPPHIREMOON（PL!-bp4）代表カードの分類回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCardAbility, cardAbilityRawText, splitAbilityByTriggers } from "../js/abilityEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

const T_LIVE = "ライブ";

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const LIVE_CASES = [
  {
    id: "PL!-bp4-019-L",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (cl) => (cl.filters?.seriesTag === "μ's" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!-bp4-020-L",
    trigger: "live_start",
    expectTemplate: "live_start_position_change",
    check: (cl) =>
      cl.filters?.requiresStageOnlySeries === "μ's" && cl.requiresOnStage ? [] : ["position change filters"],
  },
  {
    id: "PL!-bp4-021-L",
    trigger: "live_start",
    expectTemplate: "live_start_success_score_tiered_reduce_score",
    check: (cl) => {
      const errs = [];
      if (cl.successScoreLowMin !== 6) errs.push("lowMin 6");
      if (cl.successScoreHighMin !== 9) errs.push("highMin 9");
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant 1");
      if (cl.needHeartReduceMap?.heart0 !== 1) errs.push("heart0 reduce");
      return errs;
    },
  },
  {
    id: "PL!-bp4-022-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 2) errs.push("grant 2");
      if (cl.filters?.stageArea !== "center") errs.push("center");
      if (cl.filters?.minStageAreaMemberBlade !== 9) errs.push("blade 9");
      if (cl.filters?.seriesTag !== "μ's") errs.push("series");
      return errs;
    },
  },
  {
    id: "PL!-bp4-023-L",
    trigger: "live_success",
    expectTemplate: "live_success_surplus_heart_slot_draw",
    check: (cl) => {
      const errs = [];
      if (cl.surplusHeartSlot !== 1) errs.push("slot 1");
      if (cl.deckDrawCount !== 1) errs.push("draw 1");
      if (cl.minSurplusHeartSlotCount !== 1) errs.push("min slot count");
      if (cl.template === "draw_from_deck") errs.push("must not be unconditional draw");
      return errs;
    },
  },
  {
    id: "PL!-bp4-024-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.bladeGain !== 1) errs.push("blade 1");
      if (cl.grantToStageSeriesTag !== "μ's") errs.push("series");
      if (cl.grantToStageSeriesMax !== 1) errs.push("max 1");
      return errs;
    },
  },
];

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const MEMBER_CASES = [
  {
    id: "PL!-bp4-001-P",
    trigger: "live_start",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.requiresOwnStageCostSumLowerThanOpponent && cl.deckDrawCount === 1 ? [] : ["cost sum draw"],
  },
  {
    id: "PL!-bp4-002-P",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) => {
      const errs = [];
      if (cl.handDiscardToWaiting !== 2) errs.push("discard 2");
      if (cl.filters?.seriesTag !== "μ's") errs.push("series");
      if (cl.filters?.pickType !== T_LIVE) errs.push("pickType live");
      if (cl.filters?.minSuccessLiveScoreSum !== 6) errs.push("sl sum 6");
      return errs;
    },
  },
  {
    id: "PL!-bp4-003-P",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === T_LIVE ? [] : ["pickType live"]),
  },
  {
    id: "PL!-bp4-004-P",
    trigger: "toujyou",
    expectTemplate: "activate_energy",
    check: (cl) =>
      cl.energyActiveCount === 2 && cl.filters?.minSuccessLiveScoreSum === 6 ? [] : ["activate 2 energy"],
  },
  {
    id: "PL!-bp4-005-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.filters?.maxCost === 2 ? [] : ["maxCost 2"]),
  },
  {
    id: "PL!-bp4-005-P",
    trigger: "live_start",
    expectTemplate: "live_start_position_change",
    check: (cl) => {
      const errs = [];
      if (!cl.positionExcludeCenter) errs.push("exclude center");
      if (cl.filters?.forbidStageMemberMinBlade !== 5) errs.push("forbid blade 5");
      if (cl.filters?.forbidStageMemberMinBladeSeries !== "μ's") errs.push("forbid series");
      return errs;
    },
  },
  {
    id: "PL!-bp4-006-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "μ's" && cl.filters?.minSuccessLiveScoreSum === 3
        ? []
        : ["peek recover"],
  },
  {
    id: "PL!-bp4-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_success_live_low_score_grant",
    check: (cl) => (cl.filters?.minSuccessLiveCount === 1 ? [] : ["minSuccessLiveCount 1"]),
  },
  {
    id: "PL!-bp4-009-P",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_active_wait",
  },
  {
    id: "PL!-bp4-010-N",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => (cl.bladeGain === 2 && cl.costEnergy ? [] : ["blade cost"]),
  },
  {
    id: "PL!-bp4-011-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.grantToCenterSeriesTag !== "μ's") errs.push("center series");
      if (cl.bladeGain !== 2) errs.push("blade 2");
      if (cl.costSelfWait !== true) errs.push("optional wait");
      return errs;
    },
  },
  {
    id: "PL!-bp4-013-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (!cl.grantExcludeSelf) errs.push("exclude self");
      if (cl.grantPickStageMembersMax !== 1) errs.push("pick 1");
      if (cl.requiredHeartSlot !== 1) errs.push("heart01");
      return errs;
    },
  },
  {
    id: "PL!-bp4-014-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (!cl.filters?.requiresLiveFrameNoStartSuccessAbility) errs.push("no LS/LS-success live");
      if (!cl.grantExcludeSelf) errs.push("exclude self");
      if (cl.bladeGain !== 2) errs.push("blade 2");
      if (cl.filters?.pickType === T_LIVE) errs.push("must not pickType live");
      return errs;
    },
  },
  {
    id: "PL!-bp4-016-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.minSuccessLiveScoreSum === 3 && cl.deckDrawCount === 1 ? [] : ["draw sl3"],
  },
  {
    id: "PL!-bp4-017-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.grantToCenterSeriesTag !== "μ's") errs.push("center series");
      if (cl.bladeGain !== 1) errs.push("blade 1");
      return errs;
    },
  },
];

/** @type {Array<{id:string, check:(rule:any)=>string[]}>} */
const JOUJI_CASES = [
  {
    id: "PL!-bp4-019-L",
    check: (rule) =>
      rule?.kind === "success_live_self_score_if_series_on_stage" &&
      rule.seriesTag === "μ's" &&
      rule.successLiveScorePlus === 5
        ? []
        : ["019 jouji score rule"],
  },
  {
    id: "PL!-bp4-020-L",
    check: (rule) => {
      const errs = [];
      if (rule?.kind !== "blade_conditional") errs.push("blade_conditional");
      if (!rule?.requiresSuccessLiveSelf) errs.push("requiresSuccessLiveSelf");
      if (!rule?.stageAreas?.includes("center")) errs.push("center");
      if (rule?.grantMemberSeriesTag !== "μ's") errs.push("grantMemberSeriesTag");
      if (rule?.bladeFlat !== 1) errs.push("bladeFlat 1");
      return errs;
    },
  },
  {
    id: "PL!-bp4-002-P",
    check: (rule) => {
      const errs = [];
      if (!rule?.requiresLiveFrameNoStartSuccessAbility) errs.push("no LS/LS-success live");
      if (rule?.heartFlat?.[6] !== 2) errs.push("heart06 x2");
      return errs;
    },
  },
  {
    id: "PL!-bp4-005-P",
    check: (rule) =>
      rule?.kind === "live_score_plus" && rule?.stageAreas?.includes("center") && rule?.liveScorePlus === 1
        ? []
        : ["005 center score"],
  },
  {
    id: "PL!-bp4-008-P",
    check: (rule) =>
      rule?.kind === "stage_cost_plus" && rule?.stageCostPlus === 3 && rule?.minSuccessLiveScoreSum === 6
        ? []
        : ["008 stage cost"],
  },
  {
    id: "PL!-bp4-018-N",
    check: (rule) => {
      const errs = [];
      if (!rule?.ownSuccessScoreBeatsOpponent) errs.push("beats opponent");
      if (rule?.bladeFlat !== 2) errs.push("blade 2");
      return errs;
    },
  },
];

const CASES = [...LIVE_CASES, ...MEMBER_CASES];

let failed = 0;

for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("missing card", c.id);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger);
  const extra = c.check ? c.check(cl) : [];
  if (cl.template !== c.expectTemplate || extra.length) {
    console.error("FAIL", c.id, c.trigger, "got", cl.template, "want", c.expectTemplate, extra);
    failed++;
  } else {
    console.log("ok", c.id, c.trigger, cl.template);
  }
}

for (const jc of JOUJI_CASES) {
  const card = cards[jc.id];
  const ab = String(card.ability || "");
  const seg =
    ab.split(/\n/).find((s) => /jyouji|常時/.test(s)) ||
    ab.match(/\{\{jyouji[^}]+\}\}[\s\S]*?(?=\{\{kidou|\{\{toujyou|\{\{live_start|$)/)?.[0] ||
    ab;
  const rule = classifyJoujiSegment(seg);
  const extra = jc.check(rule);
  if (extra.length) {
    console.error("FAIL jouji", jc.id, extra, rule);
    failed++;
  } else {
    console.log("ok jouji", jc.id, rule?.kind || rule);
  }
}

for (const id of ["PL!-bp4-012-N", "PL!-bp4-015-N"]) {
  const card = cards[id];
  if (!card) {
    console.error("missing card", id);
    failed++;
    continue;
  }
  const triggered = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger);
  if (triggered.length) {
    console.error("FAIL", id, "expected no triggered ability");
    failed++;
  } else {
    console.log("ok", id, "no triggered ability");
  }
}

if (failed) {
  console.error(failed, "case(s) failed");
  process.exit(1);
}
const totalCases = CASES.length + JOUJI_CASES.length + 2;
console.log("verify-mus-bp4: all", totalCases, "cases passed");
