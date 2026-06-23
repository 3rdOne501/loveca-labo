#!/usr/bin/env node
/**
 * 条件付き grant_jouji_session 系カードの分類がテキストと一致するか検証する。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  classifyCardAbility,
  listNativeLiveStartSegmentRaws,
  listNativeKidouSegmentRaws,
  listNativeToujouSegmentRaws,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/cards.json"), "utf8"));

/** @type {Array<{id:string, name:string, trigger:string, expect:Record<string, unknown>, segIndex?:number}>} */
const CASES = [
  {
    id: "PL!S-bp2-025-L",
    name: "青空Jumping Heart",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      grantPickStageMembersMax: 1,
      bladeGain: 2,
      "filters.minSuccessLiveCount": 2,
    },
  },
  {
    id: "PL!SP-bp4-024-L",
    name: "ノンフィクション!! seg2",
    trigger: "live_start",
    segIndex: 1,
    expect: {
      template: "grant_jouji_session",
      stageArea: "left",
      grantToConditionalAreaMember: true,
      bladeGain: 2,
      "filters.seriesTag": "Liella!",
      "filters.minStageHeartSlot": 2,
      "filters.minStageHeartCount": 3,
      "filters.stageArea": "left",
    },
  },
  {
    id: "PL!HS-pb1-025-L",
    name: "抱きしめる花びら live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      grantToStageSeriesTag: "蓮ノ空",
      requiredHeartSlot: 4,
      "filters.minWaitingSeriesMemberCount": 10,
      "filters.waitingSeriesMemberTag": "蓮ノ空",
    },
  },
  {
    id: "PL!S-bp6-002-R＋",
    name: "桜内梨子",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      grantAllHeartCount: 2,
      "filters.requiresLiveFrameOnlySeries": "Aqours",
      "filters.minLiveFrameNeedHeartSlotSum": 12,
    },
  },
  {
    id: "PL!S-bp5-013-N",
    name: "黒澤ダイヤ live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      requiredHeartSlot: 4,
      "filters.minLiveFrameNeedHeartSlotSum": 4,
    },
  },
  {
    id: "PL!S-pb1-006-R",
    name: "津島善子 kidou",
    trigger: "kidou",
    segIndex: 0,
    expect: {
      template: "kidou_reveal_live_opp_decline_grant",
      bladeGain: 4,
    },
  },
  {
    id: "PL!N-bp3-005-R＋",
    name: "宮下愛 live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      liveScoreGrant: 1,
      minStageEntriesThisTurn: 2,
    },
  },
  {
    id: "PL!N-bp4-010-R＋",
    name: "三船栞子 live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_pick_live_frame_match_success_live_grant",
      requiredHeartSlot: 4,
      "filters.seriesTag": "虹ヶ咲",
    },
  },
  {
    id: "PL!SP-sd2-003-SD2",
    name: "嵐千砂都 live_success",
    trigger: "live_success",
    segIndex: 0,
    expect: {
      template: "draw_then_conditional_extra_draw",
      extraDrawCondType: "selfMovedThisTurn",
      deckDrawCount: 1,
      extraDrawCount: 1,
    },
  },
  {
    id: "PL!N-bp5-007-R＋",
    name: "優木せつ菜 live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      requiredHeartSlot: 2,
      "filters.requiresSuccessLiveCountTieWithOpponent": true,
    },
  },
  {
    id: "PL!HS-bp6-004-R",
    name: "百生吟子 live_start",
    trigger: "live_start",
    segIndex: 1,
    expect: {
      template: "live_start_optional_hand_discard_named_followup_blade",
      discardFollowupCharacterName: "百生吟子",
      bladeGain: 1,
      followupBladeGain: 1,
    },
  },
  {
    id: "PL!SP-bp5-027-L",
    name: "HOT PASSION!! live_success",
    trigger: "live_success",
    segIndex: 0,
    expect: {
      template: "live_success_optional_energy_wait_opp_draw",
      optional: true,
      energyWaitCount: 1,
      oppDeckDrawCount: 1,
    },
  },
  {
    id: "LL-PR-004-PR",
    name: "愛♡スクリ～ム！ live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_love_screem_opp_answer",
      bladeGain: 1,
    },
  },
  {
    id: "PL!SP-bp2-011-R",
    name: "鬼塚冬毬 toujyou",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_wait_pick_opp_live",
    },
  },
  {
    id: "PL!-pb1-018-R",
    name: "矢澤にこ toujyou",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_both_wait_to_empty_stage",
      "filters.maxCost": 2,
    },
  },
  {
    id: "PL!-bp5-007-R",
    name: "東條希 toujyou",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_baton_both_trim_hand_draw",
      targetHandSize: 3,
      deckDrawCount: 3,
    },
  },
  {
    id: "PL!N-bp4-007-R＋",
    name: "優木せつ菜 toujyou",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_both_wait_pick_live_hand",
      "filters.pickType": "ライブ",
    },
  },
  {
    id: "PL!N-bp3-011-R",
    name: "ミア・テイラー toujyou",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_opp_stage_member_match_grant",
      excludeCharacterName: "ミア・テイラー",
      bladeGain: 2,
    },
  },
  {
    id: "PL!N-PR-022-PR",
    name: "エマ・ヴェルデ toujyou",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_opp_emma_punch_answer",
      optional: true,
      requiresConditionConfirm: true,
      bladeGain: 1,
    },
  },
  {
    id: "PL!S-pb1-006-R",
    name: "津島善子 kidou",
    trigger: "kidou",
    segIndex: 0,
    expect: {
      template: "kidou_reveal_live_opp_decline_grant",
      bladeGain: 4,
    },
  },
  {
    id: "PL!-pb1-030-L",
    name: "Cutie Panther live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_need_heart_reduce_fixed",
      "filters.requiresOpponentWaitMember": true,
    },
  },
  {
    id: "PL!-bp6-024-L",
    name: "錯覚CROSSROADS jouji",
    trigger: "jouji",
    segIndex: 0,
    expect: {
      template: "jouji_success_live_waiting_substitute",
    },
  },
  {
    id: "PL!S-bp5-002-R＋",
    name: "桜内梨子 live_start side equal",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_side_cost_equal_opp_wait",
    },
  },
  {
    id: "PL!S-pb1-002-R",
    name: "桜内梨子 toujou opp live discard",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_opp_optional_live_discard_or_score",
    },
  },
  {
    id: "PL!-PR-014-PR",
    name: "園田海未 toujou opp hand reveal",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_opp_hand_reveal_no_live_draw",
      revealCount: 3,
    },
  },
  {
    id: "PL!-pb1-015-R",
    name: "西木野真姫 toujou bibi opp active",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_bibi_wait_opp_active_wait",
      stageArea: "center",
      "filters.seriesTag": "BiBi",
    },
  },
  {
    id: "PL!SP-pb2-003-R",
    name: "嵐千砂都 live_success liella moved",
    trigger: "live_success",
    segIndex: 0,
    expect: {
      template: "live_success_liella_effect_moved_score",
      liveScoreGrant: 1,
      "filters.seriesTag": "Liella!",
    },
  },
  {
    id: "PL!SP-pb2-005-R",
    name: "葉月恋 toujou baton under",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_baton_discarded_under",
      "filters.seriesTag": "Liella!",
    },
  },
  {
    id: "PL!SP-pb2-007-R",
    name: "米女メイ live_success recover",
    trigger: "live_success",
    segIndex: 0,
    expect: {
      template: "live_success_optional_energy_recover_waiting",
      optional: true,
      "recoverPickFilters.pickType": "ライブ",
      "filters.seriesTag": "Liella!",
    },
  },
  {
    id: "PL!SP-pb2-008-R",
    name: "若菜四季 live_success yell nobh cap",
    trigger: "live_success",
    segIndex: 0,
    expect: {
      template: "live_success_yell_nobh_series_score_capped",
      liveScoreGrant: 1,
      liveScoreCapMax: 2,
      "filters.seriesTag": "Liella!",
    },
  },
  {
    id: "PL!SP-pb2-009-R",
    name: "鬼塚夏美 toujou blade gap",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "optional_pick_member_wait_opp_blade_gap",
      oppBladeGapMin: 2,
      optional: true,
      "filters.seriesTag": "Liella!",
    },
  },
  {
    id: "PL!SP-pb2-009-R",
    name: "鬼塚夏美 live_start blade gap",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "optional_pick_member_wait_opp_blade_gap",
      oppBladeGapMin: 2,
      optional: true,
      "filters.seriesTag": "Liella!",
    },
  },
  {
    id: "PL!SP-pb2-010-R",
    name: "ウィーン live_start hand or energy deck",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_mandatory_energy_deck_unless_hand_discard",
    },
  },
  {
    id: "PL!SP-pb2-045-L",
    name: "絶対的LOVER live_start score per unit",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_card_score_plus_per_unit",
      scoreUnitKind: "series_stage_members_min_hearts",
      scoreUnitSeries: "Liella!",
      minMemberHeartTotal: 4,
      cardScorePerUnit: 1,
    },
  },
  {
    id: "PL!-pb1-015-R",
    name: "西木野真姫 live_start BiBi wait",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "toujou_bibi_wait_opp_active_wait",
      optional: true,
      stageArea: "center",
    },
  },
  {
    id: "PL!-bp4-019-L",
    name: "Angelic Angel jouji success live score",
    trigger: "jouji",
    segIndex: 0,
    expect: {
      template: "passive_track",
    },
  },
  {
    id: "PL!SP-pb2-050-L",
    name: "Jellyfish live_start formation",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_optional_formation_change",
      optional: true,
      "filters.minStageSeriesMembers": 2,
      "filters.minStageSeriesMembersTag": "5yncri5e!",
    },
  },
  {
    id: "PL!HS-bp2-007-P",
    name: "百生吟子 live_start same-name grant",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "grant_jouji_session",
      grantToSameNameAsDiscardedMember: true,
      handDiscardToWaiting: 1,
      requiredHeartSlot: 4,
      bladeGain: 1,
    },
  },
  {
    id: "PL!HS-bp6-014-R",
    name: "安養寺姫芽 kidou discard self",
    trigger: "kidou",
    segIndex: 0,
    expect: {
      template: "kidou_discard_self_draw_grant",
      requiresInHandOnly: true,
      deckDrawCount: 1,
      bladeGain: 1,
    },
  },
  {
    id: "PL!N-bp3-025-L",
    name: "Awakening Promise live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_optional_energy_under_return_grant",
      optional: true,
      grantHeartCountPerEnergy: 3,
      requiredHeartSlot: 2,
    },
  },
  {
    id: "PL!N-pb1-003-P＋",
    name: "桜坂しずく kidou discard self",
    trigger: "kidou",
    segIndex: 0,
    expect: {
      template: "kidou_discard_self_draw_grant",
      grantToStageSeriesTag: "虹ヶ咲",
      costEnergy: true,
      costEnergyCount: 2,
    },
  },
  {
    id: "PL!N-pb1-039-L",
    name: "Stellar Stream live_start",
    trigger: "live_start",
    segIndex: 0,
    expect: {
      template: "live_start_stellar_stream_grant",
      minNeedHeartValue: 3,
      grantHeartSlotCount: 4,
      requiredHeartSlot: 6,
    },
  },
  {
    id: "PL!SP-pb2-000-DUO",
    name: "DUO toujyou baton series",
    trigger: "toujyou",
    segIndex: 0,
    expect: {
      template: "toujou_baton_discarded_series_per_card",
      batonDiscardedSeriesTag: "Liella!",
      deckDrawCount: 1,
      bladeGain: 2,
    },
  },
];

function getSegRaw(card, trigger, segIndex) {
  if (trigger === "live_start") return listNativeLiveStartSegmentRaws(card)[segIndex];
  if (trigger === "kidou") return listNativeKidouSegmentRaws(card)[segIndex];
  if (trigger === "toujyou") return listNativeToujouSegmentRaws(card)[segIndex];
  return splitAbilityByTriggers(card.ability).filter((s) => s.trigger === trigger)[segIndex]?.text;
}

function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

let failed = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING CARD", c.id);
    failed++;
    continue;
  }
  const segRaw = getSegRaw(card, c.trigger, c.segIndex ?? 0);
  const cl = classifyCardAbility(card, c.trigger, segRaw);
  const errors = [];
  for (const [key, want] of Object.entries(c.expect)) {
    const got = getPath(cl, key);
    if (got !== want) errors.push(`${key}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
  if (errors.length) {
    failed++;
    console.error("FAIL", c.id, c.name);
    errors.forEach((e) => console.error(" ", e));
  } else {
    console.log("OK", c.id, c.name, cl.template);
  }
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} cases passed`);
