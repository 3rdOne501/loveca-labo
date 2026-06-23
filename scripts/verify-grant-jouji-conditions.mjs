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
    id: "PL!S-pb1-006-R",
    name: "津島善子 kidou",
    trigger: "kidou",
    segIndex: 0,
    expect: {
      template: "kidou_reveal_live_opp_decline_grant",
      bladeGain: 4,
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
