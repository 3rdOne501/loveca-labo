#!/usr/bin/env node
/** Liella! sd1 DUO（PL!SP-sd1）スタートデッキ代表カードの分類回帰 */
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
    id: "PL!SP-sd1-001-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_draw_per_energy_unit",
    check: (cl) =>
      cl.energyPerDrawUnit === 6 && cl.deckDrawCount === 1 ? [] : ["energy6 draw1"],
  },
  {
    id: "PL!SP-sd1-002-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_hand_stage_enter",
    check: (cl) =>
      cl.allowOccupiedStageColumn &&
      cl.filters?.seriesTag === "Liella!" &&
      cl.filters?.maxCost === 4
        ? []
        : ["occupy liella c4"],
  },
  {
    id: "PL!SP-sd1-003-SD",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 2 && cl.bladeGain === 5 ? [] : ["opt discard2 blade5"],
  },
  {
    id: "PL!SP-sd1-004-SD",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.liveScoreGrant === 1 && !cl.bladeGain ? [] : ["live score +1"]),
  },
  {
    id: "PL!SP-sd1-005-SD",
    trigger: "kidou",
    expectTemplate: "kidou_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!SP-sd1-006-SD",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!SP-sd1-007-SD",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.costEnergy &&
      cl.costEnergyCount === 2 &&
      cl.filters?.seriesTag === "Liella!" &&
      cl.filters?.pickType === "メンバー"
        ? []
        : ["E2 liella member"],
  },
  {
    id: "PL!SP-sd1-008-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.costEnergy && cl.deckTopCount === 3 ? [] : ["opt E peek3"],
  },
  {
    id: "PL!SP-sd1-009-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional &&
      cl.costEnergy &&
      cl.deckTopCount === 5 &&
      cl.filters?.minEnergyCount === 9
        ? []
        : ["E9 peek5"],
  },
  {
    id: "PL!SP-sd1-011-SD",
    trigger: "kidou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) => (cl.costEnergy && cl.costEnergyCount === 2 ? [] : ["E2 energy deck"]),
  },
  {
    id: "PL!SP-sd1-014-SD",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && !cl.costEnergy ? [] : ["opt discard1 energy"],
  },
  {
    id: "PL!SP-sd1-016-SD",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && !cl.costEnergy ? [] : ["opt discard1 energy"],
  },
  {
    id: "PL!SP-sd1-017-SD",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.costEnergy && cl.deckTopCount === 3 ? [] : ["opt E peek3"],
  },
  {
    id: "PL!SP-sd1-026-SD",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.cardScoreGrant === 1 && cl.filters?.minEnergyCount === 9 ? [] : ["E9 score+1"],
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
  "PL!SP-sd1-010-SD",
  "PL!SP-sd1-012-SD",
  "PL!SP-sd1-013-SD",
  "PL!SP-sd1-015-SD",
  "PL!SP-sd1-018-SD",
  "PL!SP-sd1-019-SD",
  "PL!SP-sd1-020-SD",
  "PL!SP-sd1-021-SD",
  "PL!SP-sd1-022-SD",
  "PL!SP-sd1-023-SD",
  "PL!SP-sd1-024-SD",
  "PL!SP-sd1-025-SD",
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
console.log("verify-liella-sd1 OK (" + CASES.length + " cases)");
