#!/usr/bin/env node
/** アニバーサリー LL-bp5 ライブ（μ's クロス）の分類回帰 */
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
    id: "LL-bp5-001-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (!cl.scorePlusOrPreconditions) errs.push("scorePlusOrPreconditions");
      if (cl.minYellRevealedLiveCount !== 2) errs.push("minYellRevealedLiveCount");
      if (cl.minStageDistinctHeartSlots !== 5) errs.push("minStageDistinctHeartSlots");
      if (!cl.scorePlusOrStageMoved) errs.push("scorePlusOrStageMoved");
      if (!cl.scoreHeartColorSlots || cl.scoreHeartColorSlots.length !== 6) errs.push("scoreHeartColorSlots");
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant");
      return errs;
    },
  },
  {
    id: "LL-bp5-002-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minDistinctMemberGroups !== 3) errs.push("minDistinctMemberGroups");
      if (!cl.grantToCenterMember) errs.push("grantToCenterMember");
      if (cl.grantAllHeartCount !== 1) errs.push("grantAllHeartCount");
      if (!cl.requiresOnStage) errs.push("requiresOnStage");
      return errs;
    },
  },
  {
    id: "LL-bp5-002-L",
    trigger: "live_success",
    expectTemplate: "live_success_recover_waiting_diff_group",
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
  const raw = cardAbilityRawText(card);
  const seg = splitAbilityByTriggers(raw).find((s) => s.trigger === c.trigger);
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
