#!/usr/bin/env node
/** 虹ヶ咲 bp7 / MELLOWMOMENT（PL!N-bp7）メンバー代表カードの分類・パターン回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, segHint?:RegExp, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!N-bp7-001-P",
    trigger: "jidou",
    expectTemplate: "jidou_energy_under_placed_energy_wait",
  },
  {
    id: "PL!N-bp7-002-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.filters?.minStageSeriesMembers === 3 && cl.filters?.minStageSeriesMembersTag === "QU4RTZ"
        ? []
        : ["QU4RTZ3"],
  },
  {
    id: "PL!N-bp7-003-P",
    trigger: "kidou",
    expectTemplate: "kidou_mill_waiting_under_copy_printed_hearts",
    check: (cl) =>
      cl.deckTopCount === 5 &&
      cl.filters?.seriesTag === "虹ヶ咲" &&
      cl.filters?.maxCost === 17
        ? []
        : ["mill5 under C17"],
  },
  {
    id: "PL!N-bp7-003-P",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.bladePerDistinctNameUnder && cl.bladeGain === 1 ? [] : ["blade per under"]),
  },
  {
    id: "PL!N-bp7-004-P",
    trigger: "kidou",
    expectTemplate: "kidou_energy_under_opp_wait_by_under",
  },
  {
    id: "PL!N-bp7-005-P",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    check: (cl) =>
      cl.filters?.minDistinctSeriesMemberNames === 2 &&
      cl.filters?.distinctSeriesMemberNamesTag === "DiverDiva" &&
      (cl.abilityChoices || []).length >= 2
        ? []
        : ["DiverDiva2 choices"],
  },
  {
    id: "PL!N-bp7-006-P",
    trigger: "kidou",
    expectTemplate: "deck_top_look_reorder",
    segHint: /カードを4枚見る/,
    check: (cl) => (cl.deckTopCount === 4 && cl.costEnergy ? [] : ["look4 E"]),
  },
  {
    id: "PL!N-bp7-006-P",
    trigger: "kidou",
    expectTemplate: "deck_mill_conditional_pick_one",
    segHint: /カードを3枚控え室に置く/,
    check: (cl) =>
      cl.deckTopCount === 3 &&
      cl.millRequireSeriesTag === "虹ヶ咲" &&
      (cl.abilityChoices || []).length >= 2
        ? []
        : ["mill3 pick-one"],
  },
  {
    id: "PL!N-bp7-007-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    segHint: /下にあるエネルギーカード1枚につき/,
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "heart_per_energy_below" && rule.heartPerSlot?.[2] === 1
        ? []
        : ["heart per under E"];
    },
  },
  {
    id: "PL!N-bp7-007-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    segHint: /6枚より多い/,
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "heart_per_energy_above" && rule.energyAboveExclusive === 6
        ? []
        : ["heart above 6"];
    },
  },
  {
    id: "PL!N-bp7-007-P",
    trigger: "live_success",
    expectTemplate: "energy_deck_under_member",
  },
  {
    id: "PL!N-bp7-008-P",
    trigger: "toujyou",
    expectTemplate: "waiting_to_deck_bottom_activate_per",
    check: (cl) =>
      cl.waitingToDeckCount === 4 &&
      cl.energyActivePerMoved === 1 &&
      cl.filters?.requiresNoBladeHeart
        ? []
        : ["activate per no-BH"],
  },
  {
    id: "PL!N-bp7-009-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) => (cl.deckTopCount === 7 && cl.millBothPlayers ? [] : ["both mill7"]),
  },
  {
    id: "PL!N-bp7-010-P",
    trigger: "kidou",
    expectTemplate: "kidou_energy_under_waiting_enter",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.maxCost === 2 ? [] : ["C2 enter"],
  },
  {
    id: "PL!N-bp7-011-P",
    trigger: "jidou",
    expectTemplate: "jidou_self_deck_to_waiting_discard_recover",
  },
  {
    id: "PL!N-bp7-011-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "play_cost_reduce_shuffle_waiting_members" ? [] : ["play cost reduce"];
    },
  },
  {
    id: "PL!N-bp7-011-P",
    trigger: "live_success",
    expectTemplate: "waiting_pick_to_deck",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "虹ヶ咲" && cl.waitingToDeckDest === "top"
        ? []
        : ["wait to top"],
  },
  {
    id: "PL!N-bp7-012-P",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) =>
      cl.costPickMemberWait && cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["wait heart color"],
  },
  {
    id: "PL!N-bp7-013-N",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.minStageSeriesMembers === 3 &&
      cl.filters?.minStageSeriesMembersTag === "A・ZU・NA"
        ? []
        : ["AZUNA3"],
  },
  {
    id: "PL!N-bp7-014-N",
    trigger: "jidou",
    expectTemplate: "jidou_leave_stage_recover_no_cost",
  },
  {
    id: "PL!N-bp7-015-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
  },
  {
    id: "PL!N-bp7-016-N",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) => (cl.costEnergy && cl.optional ? [] : ["optional E heart"]),
  },
  {
    id: "PL!N-bp7-017-N",
    trigger: "toujyou",
    expectTemplate: "energy_deck_under_member",
    check: (cl) => (cl.optional && cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["optional under"]),
  },
  {
    id: "PL!N-bp7-018-N",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 5 &&
      cl.filters?.seriesTag === "虹ヶ咲" &&
      cl.filters?.requiresNoBladeHeart
        ? []
        : ["no-BH pick5"],
  },
  {
    id: "PL!N-bp7-019-N",
    trigger: "jidou",
    expectTemplate: "jidou_leave_baton_partner_energy_under",
  },
  {
    id: "PL!N-bp7-020-N",
    trigger: "toujyou",
    expectTemplate: "deck_mill_conditional_grant",
    check: (cl) =>
      cl.deckTopCount === 3 &&
      cl.deckMillFrom === "top" &&
      cl.millRequireDistinctBladeHeartColors === 2 &&
      cl.requiredHeartSlot === 4
        ? []
        : ["mill3 BH colors heart04"],
  },
  {
    id: "PL!N-bp7-021-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!N-bp7-022-N",
    trigger: "jidou",
    expectTemplate: "jidou_own_member_wait_discard_activate",
  },
  {
    id: "PL!N-bp7-023-N",
    trigger: "kidou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.costSelfWait && cl.deckDrawCount === 2 && cl.effectDiscardCount === 2 ? [] : ["wait draw2 discard2"],
  },
  {
    id: "PL!N-bp7-024-N",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.filters?.minStageSeriesMembers === 3 &&
      cl.filters?.minStageSeriesMembersTag === "R3BIRTH" &&
      cl.requiredHeartSlot === 1
        ? []
        : ["R3BIRTH3 heart01"],
  },
  {
    id: "PL!N-bp7-025-SECL",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.grantToStageSeriesTag === "虹ヶ咲" && cl.grantToStageSeriesMax === 1 && cl.bladeGain === 1
        ? []
        : ["blade1 pick"],
  },
  {
    id: "PL!N-bp7-025-SECL",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.filters?.minYellRevealedHeartColorKinds === 3 && cl.cardScoreGrant === 1
        ? []
        : ["yell 3 kinds"],
  },
  {
    id: "PL!N-bp7-026-SECL",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_optional_blade_pick_equal",
    check: (cl) =>
      cl.handDiscardMax === 2 && cl.bladeGain === 1 && cl.grantToStageSeriesTag === "虹ヶ咲"
        ? []
        : ["discard=blade pick"],
  },
  {
    id: "PL!N-bp7-026-SECL",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.filters?.minYellRevealedNoBladeHeartMembers === 2 && cl.cardScoreGrant === 1
        ? []
        : ["yell noBH 2"],
  },
  {
    id: "PL!N-bp7-027-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.grantPickStageMembersMax === 1 &&
      cl.requiresStrictlyMostBladesBothStages &&
      cl.filters?.seriesTag === "虹ヶ咲"
        ? []
        : ["most blades"],
  },
  {
    id: "PL!N-bp7-028-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_shuffle_all_waiting_grant",
    check: (cl) =>
      cl.optional && cl.grantToStageSeriesTag === "虹ヶ咲" && cl.requiredHeartSlot === 1
        ? []
        : ["shuffle grant"],
  },
  {
    id: "PL!N-bp7-029-L",
    trigger: "live_success",
    expectTemplate: "live_success_under_energy_to_area_score",
    check: (cl) =>
      cl.optional && cl.minEnergyCountAfterMove === 10 && cl.cardScoreGrant === 1
        ? []
        : ["under E score"],
  },
  {
    id: "PL!N-bp7-030-L",
    trigger: "live_success",
    expectTemplate: "deck_top_look_reorder",
    segHint: /カードを3枚見る/,
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["look3"]),
  },
  {
    id: "PL!N-bp7-030-L",
    trigger: "live_success",
    expectTemplate: "live_return_hand_then_discard",
    segHint: /手札に戻す/,
  },
  {
    id: "PL!N-bp7-031-L",
    trigger: "live_success",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["mill3"]),
  },
  {
    id: "PL!N-bp7-031-L",
    trigger: "jidou",
    expectTemplate: "jidou_ability_mill_pick_live_score",
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
  /** @type {any} */
  let cl;
  if (c.trigger === "jidou") {
    cl = classifyJidouAutoSegment(seg.text, card) || { template: "jidou_manual" };
  } else {
    cl = classifyCardAbility(card, c.trigger, seg.text);
  }
  const errs = [];
  if (c.trigger === "jouji") {
    /* template checked via check / classifyJoujiSegment */
  } else if (c.trigger === "jidou") {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
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
  console.error(`\nverify-niji-bp7: ${failed} failed`);
  process.exit(1);
}

/** ミア周辺ランタイム配線（山札→控え室ミル後の自動／プレイ時コスト減／バトン先出し） */
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");
const wiringErrs = [];
if (!/function revealCardsSentFromDeckToWaiting[\s\S]*fireJidouAfterDeckMilledByAbility\(milledInWaiting/.test(simSrc)) {
  wiringErrs.push("revealCardsSentFromDeckToWaiting must fire jidou for milled-in-waiting");
}
if (!/プレイ時任意コスト変更[\s\S]{0,400}_playCostReduce/.test(simSrc)) {
  wiringErrs.push("_playCostReduce must apply outside hand-only gate");
}
if (!/play-cost-reduce-shuffle-waiting/.test(simSrc) || !/preBatonCompleted/.test(simSrc)) {
  wiringErrs.push("play_cost_reduce_shuffle must pre-baton before shuffle");
}
if (!/バトン元を先に控え室へ入れてからシャッフル/.test(simSrc)) {
  wiringErrs.push("missing pre-baton shuffle comment/path");
}
if (wiringErrs.length) {
  console.error("FAIL mia-waiting wiring:", wiringErrs.join("; "));
  process.exit(1);
}
console.log("OK mia-waiting runtime wiring");

console.log(`\nverify-niji-bp7: ${CASES.length} OK`);
