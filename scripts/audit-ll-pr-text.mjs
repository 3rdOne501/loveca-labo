#!/usr/bin/env node
/** LL-PR: カード文と分類の整合性監査 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";
import { applyPrCrossCuttingChecks } from "./lib/pr-audit-common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isLlPr(id) {
  return /^LL-PR-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isLlPr(id)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (!seg.trigger) continue;
    const cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      errors.push(`${id} ${seg.trigger}: not automated (${cl.template})`);
      continue;
    }
    if (!abilityEffectIsAutomated(cl.template)) {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/相手に何が好き？/.test(plain)) {
      if (cl.template !== "live_start_love_screem_opp_answer") {
        errors.push(`${id} live_start: love scream misclassified`);
      }
      if (!cl.bladeGain || cl.bladeGain < 1) {
        errors.push(`${id} live_start: else-answer blade grant missing`);
      }
    }

    applyPrCrossCuttingChecks(id, seg, plain, cl, errors);
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("LL-PR audit OK");
