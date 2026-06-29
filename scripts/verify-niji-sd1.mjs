#!/usr/bin/env node
/** 虹ヶ咲 sd1（PL!N-sd1）スタートデッキ代表カードの分類回帰 */
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
    id: "PL!N-sd1-001-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 5 &&
      cl.deckTopPickMax === 1 &&
      cl.filters?.seriesTag === "虹ヶ咲" &&
      cl.filters?.pickType === "ライブ"
        ? []
        : ["peek5 live1"],
  },
  {
    id: "PL!N-sd1-001-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.grantToStageSeriesTag === "虹ヶ咲" &&
      cl.grantExcludeSelf &&
      cl.costEnergy &&
      cl.bladeGain === 1
        ? []
        : ["E grant other niji blade"],
  },
  {
    id: "PL!N-sd1-002-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && cl.deckTopCount === 3 ? [] : ["opt peek3"],
  },
  {
    id: "PL!N-sd1-003-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && cl.deckTopCount === 3 ? [] : ["opt peek3"],
  },
  {
    id: "PL!N-sd1-004-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.optional && cl.bladeGain === 2 && cl.handDiscardToWaiting === 1 ? [] : ["opt discard blade2"],
  },
  {
    id: "PL!N-sd1-005-SD",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.pickType === "メンバー" ? [] : ["niji member"],
  },
  {
    id: "PL!N-sd1-006-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  {
    id: "PL!N-sd1-007-SD",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.pickType === "ライブ" ? [] : ["niji live"],
  },
  {
    id: "PL!N-sd1-008-SD",
    trigger: "toujyou",
    expectTemplate: "activate_energy",
    check: (cl) => (cl.energyActiveCount === 2 ? [] : ["E2 active"]),
  },
  {
    id: "PL!N-sd1-009-SD",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.costEnergy &&
      cl.costEnergyCount === 2 &&
      cl.filters?.pickType === "ライブ" &&
      cl.filters?.seriesTag === "虹ヶ咲"
        ? []
        : ["E2 niji live"],
  },
  {
    id: "PL!N-sd1-010-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 2 && cl.effectDiscardCount === 1 ? [] : ["draw2 discard1"],
  },
  {
    id: "PL!N-sd1-010-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.costEnergy &&
      cl.costEnergyCount === 2 &&
      cl.requiredHeartSlot === 4 &&
      cl.optional
        ? []
        : ["E2 heart04"],
  },
  {
    id: "PL!N-sd1-011-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!N-sd1-013-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.effectDiscardCount === 1 ? [] : ["draw1 discard1"],
  },
  {
    id: "PL!N-sd1-021-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
  },
  {
    id: "PL!N-sd1-022-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
  },
  {
    id: "PL!N-sd1-028-SD",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.cardScoreGrant === 1 && cl.filters?.minStageMemberBladeSum === 10 ? [] : ["blade10 score+1"],
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
  "PL!N-sd1-012-SD",
  "PL!N-sd1-014-SD",
  "PL!N-sd1-015-SD",
  "PL!N-sd1-016-SD",
  "PL!N-sd1-017-SD",
  "PL!N-sd1-018-SD",
  "PL!N-sd1-019-SD",
  "PL!N-sd1-020-SD",
  "PL!N-sd1-023-SD",
  "PL!N-sd1-024-SD",
  "PL!N-sd1-025-SD",
  "PL!N-sd1-026-SD",
  "PL!N-sd1-027-SD",
]) {
  const card = cards[id];
  if (!card) {
    console.error("MISSING", id);
    failed++;
    continue;
  }
  const triggered = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger);
  if (triggered.length) {
    failed++;
    console.error("FAIL", id, "expected no triggered ability");
  } else {
    console.log("OK", id, "no triggered ability");
  }
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length + 13} checks passed`);
