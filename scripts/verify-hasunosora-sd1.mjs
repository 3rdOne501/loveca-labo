#!/usr/bin/env node
/** 蓮ノ空 sd1（PL!HS-sd1）スタートデッキ代表カードの分類回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!HS-sd1-001-SD",
    trigger: "jidou",
    expectTemplate: "jidou_baton_leave_activate_energy",
    check: (cl) =>
      cl.energyActiveCount === 2 && cl.filters?.seriesTag === "蓮ノ空" && cl.filters?.minCost === 10
        ? []
        : ["baton leave E2"],
  },
  {
    id: "PL!HS-sd1-002-SD",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) =>
      cl.steps?.some((s) => s.template === "deck_top_pick_recover") &&
      cl.steps?.some((s) => s.template === "grant_jouji_session") &&
      cl.handDiscardToWaiting === 2
        ? []
        : ["peek+grant"],
  },
  {
    id: "PL!HS-sd1-003-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.grantExcludeSelf &&
      cl.grantToStageSeriesTag === "蓮ノ空" &&
      cl.costEnergy &&
      cl.bladeGain === 1
        ? []
        : ["other member E blade"],
  },
  {
    id: "PL!HS-sd1-004-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional &&
      cl.handDiscardToWaiting === 1 &&
      cl.handDiscardSeriesTag === "蓮ノ空" &&
      cl.filters?.pickType === "メンバー"
        ? []
        : ["opt discard member"],
  },
  {
    id: "PL!HS-sd1-005-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.requiresBatonFromSeriesTag === "蓮ノ空" &&
      cl.excludeBatonPartnerCharacterName === "徒町小鈴" &&
      cl.filters?.pickType === "ライブ"
        ? []
        : ["baton excl live"],
  },
  {
    id: "PL!HS-sd1-006-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_named_stage_activate_recover_wait",
    check: (cl) =>
      cl.energyActiveCount === 1 &&
      cl.filters?.seriesTag === "蓮ノ空" &&
      cl.filters?.pickType === "ライブ" &&
      cl.filters?.namedStageMemberList?.length === 3
        ? []
        : ["named E live"],
  },
  {
    id: "PL!HS-sd1-008-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) => cl.deckDrawCount === 2 && cl.effectDiscardCount === 1 ? [] : ["draw2 discard1"],
  },
  {
    id: "PL!HS-sd1-008-SD",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) =>
      cl.grantExcludeSelf &&
      cl.handDiscardSeriesTag === "蓮ノ空" &&
      cl.handDiscardExact === 2 &&
      cl.grantHeartSlotCount === 2
        ? []
        : ["other heart2"],
  },
  {
    id: "PL!HS-sd1-009-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!HS-sd1-013-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_deck_top_wait_if_all_heart",
    check: (cl) => (cl.deckTopCount === 3 && cl.requiredHeartSlot === 5 ? [] : ["mill3 heart05"]),
  },
  {
    id: "PL!HS-sd1-014-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && cl.filters?.seriesTag === "蓮ノ空"
        ? []
        : ["opt recover"],
  },
  {
    id: "PL!HS-sd1-015-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  {
    id: "PL!HS-sd1-017-SD",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 1 &&
      cl.effectDiscardCount === 1 &&
      cl.filters?.seriesTag === "蓮ノ空"
        ? []
        : ["niji on stage draw1"],
  },
  {
    id: "PL!HS-sd1-018-SD",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.cardScoreGrant === 1 &&
      cl.filters?.minStageSeriesMembers === 3 &&
      cl.filters?.requiresWaitingLiveNameContains === "DreamBelievers"
        ? []
        : ["stage3 dream believers"],
  },
  {
    id: "PL!HS-sd1-020-SD",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_series_member_blade_grant",
    check: (cl) =>
      cl.filters?.seriesTag === "蓮ノ空" && cl.bladeGainPerDiscarded === 1 ? [] : ["hand blade grant"],
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
  const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.expectTemplate);
  }
}

for (const id of [
  "PL!HS-sd1-007-SD",
  "PL!HS-sd1-010-SD",
  "PL!HS-sd1-011-SD",
  "PL!HS-sd1-012-SD",
  "PL!HS-sd1-016-SD",
  "PL!HS-sd1-019-SD",
]) {
  const card = cards[id];
  if (!card) {
    console.error("MISSING", id);
    failed++;
    continue;
  }
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) {
    console.log("OK", id, "no ability");
    continue;
  }
  const triggered = splitAbilityByTriggers(raw).filter((s) => s.trigger);
  if (!triggered.length) {
    console.log("OK", id, "no triggered ability");
    continue;
  }
  let bad = false;
  for (const seg of triggered) {
    const cl = classifyCardAbility(card, seg.trigger, seg.text);
    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      console.error("FAIL", id, seg.trigger, "not automated", cl.template);
      bad = true;
    }
  }
  if (!bad) console.log("OK", id, "ability segments automated");
  else failed++;
}

if (failed) {
  console.error(failed + " failure(s)");
  process.exit(1);
}
console.log("verify-hasunosora-sd1 OK (" + CASES.length + " cases)");
