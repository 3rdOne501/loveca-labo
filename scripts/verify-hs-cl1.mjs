#!/usr/bin/env node
/** 蓮ノ空 cl1（PL!HS-cl1）メンバー・ライブ代表カードの分類回帰 */
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
    id: "PL!HS-cl1-001-CL",
    trigger: "live_start",
    expectTemplate: "deck_top_peek_optional_wait",
    check: (cl) => (cl.deckTopCount === 1 && cl.optional ? [] : ["peek/opt"]),
  },
  {
    id: "PL!HS-cl1-002-CL",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.optional && cl.costEnergy && cl.filters?.seriesTag === "DOLLCHESTRA" ? [] : ["e/doll"],
  },
  {
    id: "PL!HS-cl1-003-CL",
    trigger: "kidou",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.costSelfWait &&
      cl.grantToStageSeriesTag === "みらくらぱーく！" &&
      cl.grantToStageSeriesMax === 1 &&
      cl.bladeGain === 1
        ? []
        : ["grant"],
  },
  {
    id: "PL!HS-cl1-004-CL",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    check: (cl) =>
      cl.abilityChoices?.length === 2 && cl.abilityChoices[1]?.includes("コスト2以下") ? [] : ["choices"],
  },
  {
    id: "PL!HS-cl1-005-CL",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => (cl.optional && cl.costEnergy && cl.bladeGain === 2 ? [] : ["blade"]),
  },
  {
    id: "PL!HS-cl1-006-CL",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.bladeGain === 3 ? [] : ["blade3"]),
  },
  {
    id: "PL!HS-cl1-007-CL",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.optional && cl.handDiscardToWaiting === 1 && cl.deckTopCount === 3 && cl.deckTopPickMax === 1
        ? []
        : ["recover"],
  },
  {
    id: "PL!HS-cl1-008-CL",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "蓮ノ空" ? [] : ["series"]),
  },
  {
    id: "PL!HS-cl1-009-CL",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minCost !== 4) errs.push("minCost");
      if (cl.filters?.maxCost !== 9) errs.push("maxCost");
      if (cl.filters?.seriesTag !== "蓮ノ空") errs.push("seriesTag");
      return errs;
    },
  },
  {
    id: "PL!HS-cl1-010-CL",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.grantToStageSeriesTag !== "蓮ノ空") errs.push("grantToStageSeriesTag");
      if (cl.grantToStageSeriesMax !== 1) errs.push("grantToStageSeriesMax");
      if (cl.filters?.minCost !== 10) errs.push("minCost");
      if (cl.bladeGain !== 2) errs.push("bladeGain");
      return errs;
    },
  },
  {
    id: "PL!HS-cl1-011-CL",
    trigger: "live_success",
    expectTemplate: "live_success_pick_options",
    check: (cl) => {
      const errs = [];
      if (!cl.optional || !cl.costEnergy) errs.push("optional/cost");
      if (cl.filters?.minLiveFrameCount !== 2) errs.push("minLiveFrameCount");
      if (!cl.abilityChoices || cl.abilityChoices.length !== 2) errs.push("choices");
      return errs;
    },
  },
  {
    id: "PL!HS-cl1-012-CL",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) =>
      cl.preconditionFilters?.requiresLiveScoreTieWithOpponent && cl.filters?.minCost === 9
        ? []
        : ["tie/minCost"],
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
    console.error("NO_SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  if (cl.template !== c.expectTemplate) {
    console.error("TEMPLATE", c.id, "expected", c.expectTemplate, "got", cl.template);
    failed++;
    continue;
  }
  if (!abilityEffectIsAutomated(cl.template)) {
    console.error("NOT_AUTO", c.id, cl.template);
    failed++;
    continue;
  }
  if (c.check) {
    const errs = c.check(cl);
    if (errs.length) {
      console.error("CHECK", c.id, errs.join(", "));
      failed++;
      continue;
    }
  }
  console.log("OK", c.id, c.trigger, cl.template);
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("All", CASES.length, "cases passed");
