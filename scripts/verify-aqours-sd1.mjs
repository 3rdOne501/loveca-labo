#!/usr/bin/env node
/** Aqours sd1（PL!S-sd1）スタートデッキ代表カードの分類回帰 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jidou?:boolean, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-sd1-001-SD",
    trigger: "jidou",
    expectTemplate: "jidou_yell_grant_heart_per_live_capped",
    jidou: true,
    check: (cl) =>
      cl.heartSlot === 2 && cl.heartGrantCap === 3 ? [] : ["heart02 cap3"],
  },
  {
    id: "PL!S-sd1-002-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "Aqours" && cl.handDiscardToWaiting === 1
        ? []
        : ["aqours optional"],
  },
  {
    id: "PL!S-sd1-003-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "Aqours" && cl.deckTopCount === 5
        ? []
        : ["peek live"],
  },
  {
    id: "PL!S-sd1-004-SD",
    trigger: "live_start",
    expectTemplate: "draw_then_hand_to_deck_top",
    check: (cl) =>
      cl.optional && cl.deckDrawCount === 1 && cl.effectHandToDeckTopCount === 2
        ? []
        : ["opt draw2 top"],
  },
  {
    id: "PL!S-sd1-005-SD",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!S-sd1-006-SD",
    trigger: "toujyou",
    expectTemplate: "kidou_waiting_to_empty_stage",
    check: (cl) =>
      cl.optional &&
      cl.filters?.seriesTag === "Aqours" &&
      cl.filters?.maxCost === 2 &&
      cl.filters?.pickType === "メンバー"
        ? []
        : ["empty stage aqours c2"],
  },
  {
    id: "PL!S-sd1-007-SD",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" &&
      cl.filters?.pickType === "ライブ" &&
      cl.filters?.minScore === 1
        ? []
        : ["aqours score live"],
  },
  {
    id: "PL!S-sd1-008-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  {
    id: "PL!S-sd1-009-SD",
    trigger: "live_start",
    expectTemplate: "live_start_hand_reveal_deck_place_blade",
    check: (cl) =>
      cl.optional && cl.filters?.seriesTag === "Aqours" && cl.bladeGain === 1 ? [] : ["reveal blade"],
  },
  {
    id: "PL!S-sd1-013-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_to_waiting",
    check: (cl) => (cl.deckTopCount === 5 ? [] : ["mill5"]),
  },
  {
    id: "PL!S-sd1-014-SD",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
  },
  {
    id: "PL!S-sd1-015-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!S-sd1-017-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_to_deck_bottom",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.effectDiscardCount === 1 ? [] : ["draw1 bottom1"],
  },
  {
    id: "PL!S-sd1-018-SD",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_to_deck_bottom",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.effectDiscardCount === 1 ? [] : ["draw1 bottom1"],
  },
  {
    id: "PL!S-sd1-019-SD",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
  },
  {
    id: "PL!S-sd1-020-SD",
    trigger: "live_success",
    expectTemplate: "live_success_draw_per_series_then_discard_same",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" ? [] : ["aqours series draw"],
  },
  {
    id: "PL!S-sd1-022-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.grantToStageSeriesTag === "Aqours" &&
      cl.grantToStageSeriesMax === 99 &&
      cl.bladeGain === 1
        ? []
        : ["stage aqours blade"],
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
  const cl = c.jidou
    ? classifyJidouAutoSegment(seg.text)
    : classifyCardAbility(card, c.trigger, seg.text);
  const tmpl = c.jidou ? cl.template : cl.template;
  const errs = [];
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (!c.jidou && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
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
  "PL!S-sd1-010-SD",
  "PL!S-sd1-011-SD",
  "PL!S-sd1-012-SD",
  "PL!S-sd1-016-SD",
  "PL!S-sd1-021-SD",
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
console.log(`\nAll ${CASES.length + 5} checks passed`);
