#!/usr/bin/env node
/** μ's bp5 / Anniversary2026（PL!-bp5）メンバー・ライブ代表カードの分類・パターン回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!-bp5-001-P",
    trigger: "live_success",
    expectTemplate: "deck_top_count_live_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCountOffset !== 2) errs.push("deckTopCountOffset");
      if (!cl.hasOptionalCost || cl.handDiscardToWaiting !== 1) errs.push("optional hand discard");
      return errs;
    },
  },
  {
    id: "PL!-bp5-002-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 5 || cl.filters?.minCost !== 9 || cl.filters?.seriesTag !== "μ's") {
        errs.push("deck5 muse");
      }
      if (!cl.costSelfWait || !cl.costHandDiscardOptional || cl.hasOptionalCost) {
        errs.push("mandatory wait + optional hand");
      }
      return errs;
    },
  },
  {
    id: "PL!-bp5-003-P",
    trigger: "kidou",
    expectTemplate: "kidou_hand_discard_series_branch",
    check: (cl) =>
      cl.deckTopCount === 4 && cl.deckPickCount === 2 && cl.branchSeriesTag === "μ's" && cl.costEnergyCount === 2
        ? []
        : ["branch/deck/cost"],
  },
  {
    id: "PL!-bp5-003-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.minDistinctNameStageMembers === 3 && rule?.heartFlat?.[3] === 1 ? [] : ["distinct3 heart03"];
    },
  },
  {
    id: "PL!-bp5-004-P",
    trigger: "kidou",
    expectTemplate: "kidou_opp_wait_group_discount_energy",
    check: (cl) =>
      cl.filters?.maxCost === 10 && cl.energyCostDiscountPerGroup === 1 ? [] : ["opp wait discount"],
  },
  {
    id: "PL!-bp5-004-P",
    trigger: "jidou",
    expectTemplate: "jidou_yell_grant_jouji_nobh_members",
    check: (cl) => (cl.perTurnLimit === 1 ? [] : ["perTurnLimit"]),
  },
  {
    id: "PL!-bp5-005-P",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_active",
    check: (cl) => (cl.filters?.minSuccessLiveScoreSum === 6 ? [] : ["sl score 6"]),
  },
  {
    id: "PL!-bp5-006-P",
    trigger: "live_start",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.filters?.minLiveFrameCount === 2 ? [] : ["live frame 2"]),
  },
  {
    id: "PL!-bp5-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_baton_both_trim_hand_draw",
    check: (cl) =>
      cl.targetHandSize === 3 && cl.deckDrawCount === 3 ? [] : ["trim/draw 3"],
  },
  {
    id: "PL!-bp5-008-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.minSuccessLiveScoreSum === 6 && rule?.heartFlat?.[3] === 2 ? [] : ["sl6 heart03x2"];
    },
  },
  {
    id: "PL!-bp5-009-P",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.handDiscardToWaiting === 2 &&
      cl.filters?.minNeedHeartSlot === 6 &&
      cl.filters?.minNeedHeartValue === 3
        ? []
        : ["discard2 heart06x3"],
  },
  {
    id: "PL!-bp5-010-N",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const errs = [];
      if (!cl.hasOptionalCost || cl.handDiscardToWaiting !== 1) errs.push("parent optional cost");
      const steps = cl.steps || [];
      if (steps[0]?.template !== "deck_top_to_waiting" || steps[0]?.deckTopCount !== 3) {
        errs.push("step0 mill3");
      }
      if (steps[0]?.optional || steps[0]?.hasOptionalCost) errs.push("step0 must not inherit optional");
      if (steps[1]?.template !== "toujou_wait_pick_hand" || steps[1]?.filters?.seriesTag !== "A-RISE") {
        errs.push("step1 A-RISE pick");
      }
      return errs;
    },
  },
  {
    id: "PL!-bp5-011-N",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) =>
      cl.heartPerSuccessLive &&
      JSON.stringify(cl.heartPickSlots) === JSON.stringify([4, 5, 6])
        ? []
        : ["heart pick 4/5/6 per SL"],
  },
  {
    id: "PL!-bp5-013-N",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) =>
      !cl.optional && !cl.costSelfWait && cl.oppWaitMaxCost === 4 ? [] : ["mandatory opp C4"],
  },
  {
    id: "PL!-bp5-014-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 4 &&
      JSON.stringify(cl.filters?.heartSlotsAny) === JSON.stringify([5, 6])
        ? []
        : ["deck4 heart05/06"],
  },
  {
    id: "PL!-bp5-015-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.filters?.minSuccessLiveScoreSum === 3 ? [] : ["sl score 3"]),
  },
  {
    id: "PL!-bp5-111-P＋",
    trigger: "kidou",
    expectTemplate: "kidou_hand_discard_activate_wait_opp_bonus",
    check: (cl) => (cl.perTurnLimit === 1 && cl.filters?.pickType === "ライブ" ? [] : ["kidou bonus"]),
  },
  {
    id: "PL!-bp5-111-P＋",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_per_series_on_stage_except_self" &&
        rule?.seriesTag === "A-RISE" &&
        rule?.heartFlat?.[5] === 1
        ? []
        : ["arise per member heart05"];
    },
  },
  {
    id: "PL!-bp5-222-P＋",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 3 || !cl.costSelfWait) errs.push("wait peek3 pick");
      if (!cl.costHandDiscardOptional || cl.hasOptionalCost) errs.push("optional hand only");
      return errs;
    },
  },
  {
    id: "PL!-bp5-333-P＋",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) =>
      cl.optional && cl.costSelfWait && cl.oppWaitMaxCost === 9 ? [] : ["optional self wait opp C9"],
  },
  {
    id: "PL!-bp5-333-P＋",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_if_self_wait" && rule?.heartFlat?.[5] === 1 ? [] : ["wait heart05"];
    },
  },
  {
    id: "PL!-bp5-020-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_per_unit",
    check: (cl) =>
      cl.needHeartReduceUnitKind === "center_series_heart_pairs" &&
      cl.needHeartReduceUnitSeries === "μ's" &&
      cl.needHeartReduceUnitSlot === 3 &&
      cl.needHeartReduceUnitDivisor === 2 &&
      cl.needHeartReduceMaxCount === 3
        ? []
        : ["center muse heart03 pairs"],
  },
  {
    id: "PL!-bp5-021-L",
    trigger: "live_start",
    expectTemplate: "live_start_sunny_day_song_tiered",
    check: (cl) =>
      cl.filters?.minStageMembers === 1 &&
      cl.sunnyGrantSeriesTag === "μ's" &&
      cl.sunnyGrantHeartSlot === 3 &&
      cl.cardScoreGrant === 1
        ? []
        : ["sunny tiered"],
  },
  {
    id: "PL!-bp5-022-L",
    trigger: "live_start",
    expectTemplate: "live_start_score_plus_per_success_live",
    check: (cl) => {
      const errs = [];
      if (cl.scoreUnitKind !== "success_live_cards") errs.push("scoreUnitKind");
      if (cl.cardScorePerUnit !== 2) errs.push("cardScorePerUnit");
      const inc = cl.needHeartIncreasePerUnitMap || {};
      if (inc.heart01 !== 1 || inc.heart03 !== 1 || inc.heart06 !== 1 || inc.heart0 !== 1) {
        errs.push("needHeartIncrease");
      }
      return errs;
    },
  },
  {
    id: "PL!-bp5-023-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_per_unit",
    check: (cl) =>
      cl.needHeartReduceUnitKind === "stage_members_other_color" &&
      JSON.stringify(cl.needHeartReduceExcludeSlots) === JSON.stringify([1, 6])
        ? []
        : ["other color reduce"],
  },
  {
    id: "PL!-bp5-024-L",
    trigger: "live_start",
    expectTemplate: "ability_pick_one",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minStageSeriesMembersTag !== "A-RISE") errs.push("arise precondition");
      if (!cl.abilityChoices || cl.abilityChoices.length !== 2) errs.push("choices");
      if (cl.abilityChoices?.[0] && !/ブレード/.test(cl.abilityChoices[0])) errs.push("choice0 blade label");
      if (cl.abilityChoices?.[1] && !/ブレード/.test(cl.abilityChoices[1])) errs.push("choice1 blade label");
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
  const segs = splitAbilityByTriggers(cardAbilityRawText(card));
  const seg = segs.find((s) => s.trigger === c.trigger);
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
  } else if (c.trigger === "jouji") {
    if (c.expectTemplate !== "passive_track") {
      if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    }
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
  console.error(`\nverify-muse-bp5: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-muse-bp5: ${CASES.length} OK`);
