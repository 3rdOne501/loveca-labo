#!/usr/bin/env node
/** Liella! sd1 DUO（PL!SP-sd1）: カード文と分類の整合性監査 */
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

function isLiellaSd1(id) {
  return /^PL!SP-sd1-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isLiellaSd1(id)) continue;
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

    if (/自分のエネルギー\d+枚につき.*カードを\d+枚引/.test(plain) && seg.trigger === "toujyou") {
      if (cl.template !== "toujou_draw_per_energy_unit") {
        errors.push(`${id} ${seg.trigger}: per-energy draw misclassified as ${cl.template}`);
      }
    }

    if (/既にメンバーがいるエリア/.test(plain) && /ステージに登場/.test(plain)) {
      if (cl.template === "toujou_hand_stage_enter" && !cl.allowOccupiedStageColumn) {
        errors.push(`${id} ${seg.trigger}: occupied column enter missing allowOccupiedStageColumn`);
      }
    }

    if (/自分のエネルギーが9枚以上/.test(plain) && /このカードのスコア/.test(plain)) {
      if (cl.filters?.minEnergyCount !== 9) {
        errors.push(`${id} ${seg.trigger}: minEnergyCount 9 precondition missing`);
      }
    }

    if (/自分のエネルギーが9枚以上/.test(plain) && /デッキの上から/.test(plain)) {
      if (cl.filters?.minEnergyCount !== 9) {
        errors.push(`${id} ${seg.trigger}: deck peek minEnergyCount 9 missing`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} liella-sd1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-liella-sd1-text OK");
