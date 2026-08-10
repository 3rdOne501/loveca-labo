#!/usr/bin/env node
/** Aqours bp7 / MELLOWMOMENT（PL!S-bp7）メンバー代表カードの分類・パターン回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, segHint?:RegExp, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-bp7-001-P",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const errs = [];
      if (!cl.steps || cl.steps.length < 2) errs.push("steps");
      else {
        if (cl.steps[0].template !== "toujou_wait_pick_hand") errs.push("step0 wait_pick");
        if (cl.steps[0].filters?.minCost !== 10) errs.push("minCost10");
        if (cl.steps[1].template !== "grant_jouji_session") errs.push("step1 grant");
        if (cl.steps[1].bladeGain !== 2) errs.push("blade2");
        const names = cl.steps[1].grantIfRecoveredNames || [];
        if (names.indexOf("桜内梨子") < 0 || names.indexOf("渡辺曜") < 0) errs.push("grantIfNames");
      }
      return errs;
    },
  },
  {
    id: "PL!S-bp7-002-P",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.minCostMemberOnStage === 9 && cl.filters?.seriesTag === "Aqours" ? [] : ["stage C9 Aqours"],
  },
  {
    id: "PL!S-bp7-003-P",
    trigger: "toujyou",
    expectTemplate: "deck_peek_relocate",
    segHint: /デッキの一番上/,
  },
  {
    id: "PL!S-bp7-003-P",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    segHint: /以下から1つを選ぶ/,
    check: (cl) => ((cl.abilityChoices || []).length >= 2 ? [] : ["2 choices"]),
  },
  {
    id: "PL!S-bp7-004-P",
    trigger: "toujyou",
    expectTemplate: "toujou_baton_both_keep_hand_shuffle_deck_bottom_draw",
    check: (cl) =>
      cl.requiresBatonFromSeriesTag === "Aqours" && cl.handKeepMax === 3 && cl.deckDrawCount === 3
        ? []
        : ["baton keep3 draw3"],
  },
  {
    id: "PL!S-bp7-004-P",
    trigger: "live_start",
    expectTemplate: "deck_top_look_reorder",
    check: (cl) => (cl.deckLookFrom === "bottom" && cl.deckTopCount === 3 ? [] : ["bottom3"]),
  },
  {
    id: "PL!S-bp7-005-P",
    trigger: "toujyou",
    expectTemplate: "waiting_member_under_stage",
  },
  {
    id: "PL!S-bp7-005-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_grant_series_with_member_under" && rule.seriesTag === "Aqours"
        ? []
        : ["under blade Aqours"];
    },
  },
  {
    id: "PL!S-bp7-005-P",
    trigger: "kidou",
    expectTemplate: "kidou_self_and_other_resolve_toujou",
  },
  {
    id: "PL!S-bp7-006-P",
    trigger: "live_start",
    expectTemplate: "deck_mill_conditional_grant",
    check: (cl) =>
      cl.deckTopCount === 3 &&
      cl.millRequireAllSeriesMembers === "Aqours" &&
      cl.requiredHeartSlot === 4
        ? []
        : ["bottom3 all Aqours heart04"],
  },
  {
    id: "PL!S-bp7-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.maxCost !== 2) errs.push("maxCost2");
      const names = cl.optionalEnterRecoveredNames || [];
      if (names.indexOf("津島善子") < 0 || names.indexOf("黒澤ルビィ") < 0) errs.push("optEnter");
      return errs;
    },
  },
  {
    id: "PL!S-bp7-007-P",
    trigger: "live_start",
    expectTemplate: "waiting_to_deck_bottom_blade_per",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" && cl.waitingToDeckCount === 3 && cl.waitingToDeckUpTo
        ? []
        : ["Aqours upTo3 blade"],
  },
  {
    id: "PL!S-bp7-008-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_look_reorder",
    check: (cl) =>
      cl.deckTopCount === 3 && cl.deckLookRemainTo === "bottom" ? [] : ["remain bottom"],
  },
  {
    id: "PL!S-bp7-008-P",
    trigger: "live_start",
    expectTemplate: "deck_bottom_optional_mill_named_hand",
  },
  {
    id: "PL!S-bp7-009-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "opp_across_lose_blade" && rule.oppAcrossMaxCost === 4 ? [] : ["across4"];
    },
  },
  {
    id: "PL!S-bp7-010-N",
    trigger: "toujyou",
    expectTemplate: "deck_peek_relocate",
  },
  {
    id: "PL!S-bp7-011-N",
    trigger: "kidou",
    expectTemplate: "deck_mill_conditional_grant",
    check: (cl) =>
      cl.costSelfWait &&
      cl.deckTopCount === 2 &&
      cl.millRequireAllSeriesMembers === "Aqours" &&
      cl.millActivateSelf &&
      cl.bladeGain === 2
        ? []
        : ["wait mill2 activate blade2"],
  },
  {
    id: "PL!S-bp7-012-N",
    trigger: "toujyou",
    expectTemplate: "toujou_optional_all_members_relocate",
    check: (cl) => {
      const tags = cl.requiresStageOnlySeriesAny || [];
      return cl.formationChange &&
        tags.indexOf("Aqours") >= 0 &&
        tags.indexOf("SaintSnow") >= 0 &&
        cl.bladeGain === 2
        ? []
        : ["FC Aqours|SaintSnow blade2"];
    },
  },
  {
    id: "PL!S-bp7-013-N",
    trigger: "toujyou",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
    check: (cl) => (cl.deckBottomPickMax === 2 ? [] : ["max2"]),
  },
  {
    id: "PL!S-bp7-014-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.opponentHasMoreEnergy && rule.heartFlat && rule.heartFlat[2] === 1
        ? []
        : ["opp energy heart02"];
    },
  },
  {
    id: "PL!S-bp7-015-N",
    trigger: "live_start",
    expectTemplate: "deck_mill_conditional_grant",
    check: (cl) =>
      cl.deckTopCount === 1 && cl.millRequireLive && cl.requiredHeartSlot === 2 ? [] : ["mill1 live heart02"],
  },
  {
    id: "PL!S-bp7-016-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.minStageMemberCount === 3 &&
        rule.heartFlat &&
        rule.heartFlat[2] === 1 &&
        rule.heartFlat[4] === 1 &&
        rule.heartFlat[5] === 1
        ? []
        : ["stage3 hearts245"];
    },
  },
  {
    id: "PL!S-bp7-017-N",
    trigger: "toujyou",
    expectTemplate: "deck_mill_conditional_grant",
    check: (cl) => {
      const map = cl.grantHeartSlotMap || {};
      return cl.millRequireMemberMinCost === 10 && map.heart02 === 1 && map.heart05 === 1
        ? []
        : ["cost10 heart02+05"];
    },
  },
  {
    id: "PL!S-bp7-018-N",
    trigger: "toujyou",
    expectTemplate: "pick_stage_member_to_center",
  },
  {
    id: "PL!S-bp7-019-L",
    trigger: "live_success",
    expectTemplate: "waiting_pick_to_deck",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" &&
      cl.waitingToDeckDest === "bottom" &&
      cl.waitingToDeckCount === 2 &&
      cl.waitingToDeckUpTo
        ? []
        : ["Aqours upTo2 bottom"],
  },
  {
    id: "PL!S-bp7-020-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_fixed",
    segHint: /すべてのメンバーがアクティブ/,
    check: (cl) =>
      cl.filters?.requiresAllStageMembersActive && cl.needHeartReduceMap?.heart0 === 1
        ? []
        : ["allActive heart0"],
  },
  {
    id: "PL!S-bp7-020-L",
    trigger: "live_start",
    expectTemplate: "deck_mill_conditional_need_heart_reduce",
    segHint: /デッキの下から/,
    check: (cl) =>
      cl.deckMillFrom === "bottom" &&
      cl.deckTopCount === 1 &&
      cl.millRequireSeriesMember === "Aqours" &&
      cl.needHeartReduceMap?.heart0 === 1
        ? []
        : ["mill1 Aqours heart0"],
  },
  {
    id: "PL!S-bp7-021-L",
    trigger: "live_start",
    expectTemplate: "live_start_deck_bottom_mill_member_tier",
    check: (cl) =>
      cl.filters?.minStageMembers === 3 &&
      cl.deckBottomMillCount === 5 &&
      cl.millMemberDrawThreshold === 3 &&
      cl.cardScoreGrant === 1
        ? []
        : ["stage3 mill5 tier"],
  },
  {
    id: "PL!S-bp7-022-L",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "yell_from_deck_bottom" ? [] : ["yell bottom"];
    },
  },
  {
    id: "PL!S-bp7-022-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" &&
      Array.isArray(cl.requiresYellRevealedSeriesHeartSlots) &&
      cl.requiresYellRevealedSeriesHeartSlots.join() === "2,4,5" &&
      cl.cardScoreGrant === 1
        ? []
        : ["hearts 2/4/5 score+1"],
  },
  {
    id: "PL!S-bp7-023-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_energy_to_deck_opp_adv_score",
    check: (cl) =>
      cl.costEnergyToDeck &&
      cl.filters?.minStageSeriesMembers === 2 &&
      cl.filters?.minStageSeriesMembersTag === "Aqours"
        ? []
        : ["E to deck Aqours2"],
  },
  {
    id: "PL!S-bp7-024-L",
    trigger: "live_start",
    expectTemplate: "live_start_pick_stage_member_printed_hearts_remap",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" && cl.printedHeartsRemapSlot === 4 ? [] : ["remap heart04"],
  },
  {
    id: "PL!S-bp7-025-L",
    trigger: "live_success",
    expectTemplate: "live_success_pick_options",
    check: (cl) => ((cl.abilityChoices || []).length >= 2 ? [] : ["2 choices"]),
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
  if (c.trigger === "jouji") {
    if (c.expectTemplate !== "passive_track" && cl.template !== c.expectTemplate) {
      errs.push(`template ${cl.template}`);
    }
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
  console.error(`\nverify-aqours-bp7: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-aqours-bp7: ${CASES.length} OK`);
