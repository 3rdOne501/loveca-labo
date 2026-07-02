#!/usr/bin/env node
/** Aqours pb1（PL!S-pb1）効果検証リスト: カード文と分類の整合性監査 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";
import { auditCommonAbilityPatterns } from "./audit-common-patterns.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function repIdForNum(num) {
  const ids = Object.keys(cards).filter((k) => k.match(new RegExp(`PL!S-pb1-${num}-`)));
  return ids.find((k) => k.endsWith("-P")) || ids.find((k) => k.endsWith("-R")) || ids.find((k) => k.endsWith("-N")) || ids.find((k) => k.endsWith("-L")) || null;
}

/** @type {string[]} */
const errors = [];
const skipNoAbility = new Set(["010","011","012","023"]);

for (let n = 1; n <= 23; n++) {
  const num = String(n).padStart(3, "0");
  const id = repIdForNum(num);
  if (!id) continue;
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) {
    if (skipNoAbility.has(num)) continue;
    if (card.type === "エネルギー") continue;
    errors.push(`${id}: ability missing`);
    continue;
  }

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (!seg.trigger) { errors.push(`${id}: unsplit segment`); continue; }
    if (seg.trigger === "jouji") {
      if (!classifyJoujiSegment(seg.text)) errors.push(`${id} jouji: unclassified`);
      continue;
    }
    if (seg.trigger === "jidou") {
      const jcl = classifyJidouAutoSegment(seg.text);
      if (!jcl || jcl.template === "jidou_manual") errors.push(`${id} jidou: unclassified`);
      continue;
    }
    const cl = classifyCardAbility(card, seg.trigger, seg.text);
    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      errors.push(`${id} ${seg.trigger}: not automated (${cl.template})`);
      continue;
    }
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }
    errors.push(...auditCommonAbilityPatterns({ id, trigger: seg.trigger, plain, cl }));
  }
}

if (errors.length) {
  console.error(`${errors.length} aqours-pb1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-aqours-pb1-text OK");
