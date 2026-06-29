#!/usr/bin/env node
/** µ's sd1（PL!-sd1）: カード文と分類の整合性監査 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isMusSd1(id) {
  return /^PL!-sd1-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isMusSd1(id)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const j = classifyJoujiSegment(seg.text);
      if (j.kind === "jouji_manual") errors.push(`${id} jouji: manual`);
      continue;
    }
    if (!seg.trigger) continue;
    const cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      errors.push(`${id} ${seg.trigger}: not automated (${cl.template})`);
      continue;
    }
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/控え室から/.test(plain) && /成功ライブカード置き場にカードが/.test(plain)) {
      if (cl.template === "toujou_success_live_pick_hand") {
        errors.push(`${id} ${seg.trigger}: wait pick misclass as success_live_pick`);
      }
    }

    if (/それらの中にライブカードがある場合/.test(plain) && /控え室に置く/.test(plain)) {
      if (cl.template === "draw_from_deck") {
        errors.push(`${id} ${seg.trigger}: mill+conditional draw misclass as draw_from_deck`);
      }
    }

    if (/公開したカードを自分の成功ライブカード置き場に置く/.test(plain)) {
      if (cl.template === "toujou_success_live_pick_hand") {
        errors.push(`${id} ${seg.trigger}: hand reveal swap misclass`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} mus-sd1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-mus-sd1-text OK");
