#!/usr/bin/env node
/** 蓮ノ空 pb1（PL!HS-pb1）: カード文と分類の整合性監査 */
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
import { auditCommonAbilityPatterns } from "./audit-common-patterns.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isHasunosoraPb1(id, card) {
  return /-pb1-/.test(id) && ((card.series || "").includes("蓮ノ空") || id.startsWith("PL!HS-pb1"));
}

function cardNum(id) {
  const m = id.match(/pb1-(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort(
  (a, b) => cardNum(a[0]) - cardNum(b[0]) || a[0].localeCompare(b[0]),
)) {
  if (!isHasunosoraPb1(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const jr = classifyJoujiSegment(seg.text);
      if (jr.template === "jouji_manual") errors.push(`${id} jouji: manual`);
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

    if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
      if (cl.template === "deck_top_to_waiting") {
        errors.push(`${id} ${seg.trigger}: deck_top_to_waiting misclass (hand recover)`);
      }
    }

    if (cl.template === "deck_top_pick_recover") {
      const maxM =
        plain.match(/(\d+)枚まで(?:公開して)?手札に加/) ||
        (plain.match(/その中から1枚を手札に加え/) ? ["", "1"] : null);
      if (maxM && Number(maxM[1] || 1) > 1 && cl.deckTopPickMax !== Number(maxM[1])) {
        errors.push(`${id} ${seg.trigger}: deckTopPickMax want ${maxM[1]} got ${cl.deckTopPickMax}`);
      }
      const lookM = plain.match(/上からカードを(\d+)枚見る/);
      if (lookM && cl.deckTopCount !== Number(lookM[1])) {
        errors.push(`${id} ${seg.trigger}: deckTopCount want ${lookM[1]} got ${cl.deckTopCount}`);
      }
    }

    if (cl.template === "draw_from_deck" && /このカードのスコア/.test(plain)) {
      errors.push(`${id} ${seg.trigger}: draw_from_deck misclass for score effect`);
    }

    errors.push(...auditCommonAbilityPatterns({ id, trigger: seg.trigger, plain, cl }));
  }
}

if (errors.length) {
  console.error(`${errors.length} hasunosora-pb1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-hasunosora-pb1-text OK");
