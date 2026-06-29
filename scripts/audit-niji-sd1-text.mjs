#!/usr/bin/env node
/** 虹ヶ咲 sd1（PL!N-sd1）: カード文と分類の整合性監査 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isNijiSd1(id) {
  return /^PL!N-sd1-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isNijiSd1(id)) continue;
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
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/ほかの『虹ヶ咲』のメンバー/.test(plain) && /ブレード/.test(seg.text)) {
      if (cl.template === "optional_energy_blade_until_live_end") {
        errors.push(`${id} ${seg.trigger}: other-member blade misclass as self optional E blade`);
      }
      if (cl.template === "grant_jouji_session" && !cl.grantExcludeSelf) {
        errors.push(`${id} ${seg.trigger}: other-member grant missing grantExcludeSelf`);
      }
    }

    if (/『虹ヶ咲』のライブカード/.test(plain) && seg.trigger === "toujyou") {
      if (cl.filters?.pickType !== "ライブ") {
        errors.push(`${id} ${seg.trigger}: niji live peek missing pickType live`);
      }
    }

    if (/ブレード.*合計が10以上/.test(plain) && /このカードのスコア/.test(plain)) {
      if (cl.filters?.minStageMemberBladeSum !== 10) {
        errors.push(`${id} ${seg.trigger}: stage blade sum 10 precondition missing`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} niji-sd1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-niji-sd1-text OK");
