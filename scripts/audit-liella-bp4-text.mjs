#!/usr/bin/env node
/** Liella! bp4 / SAPPHIREMOON（PL!SP-bp4）: カード文と分類の整合性監査 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isLiellaBp4(id, card) {
  return /-bp4-/.test(id) && ((card.series || "").includes("スーパースター") || id.startsWith("PL!SP-bp4"));
}

function cardNum(id) {
  const m = id.match(/bp4-(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort(
  (a, b) => cardNum(a[0]) - cardNum(b[0]) || a[0].localeCompare(b[0]),
)) {
  if (!isLiellaBp4(id, card)) continue;
  if (cardNum(id) > 30) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const j = classifyJoujiSegment(seg.text);
      if (j.kind === "jouji_manual") errors.push(`${id} jouji: manual`);
      continue;
    }
    if (seg.trigger === "jidou") {
      const j = classifyJidouAutoSegment(seg.text);
      if (!j.template || j.template === "jidou_manual") errors.push(`${id} jidou: manual`);
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

    if (cl.template === "draw_from_deck" && /このカードのスコア/.test(plain)) {
      errors.push(`${id} ${seg.trigger}: draw_from_deck misclass for score effect`);
    }

    if (/『Liella!』/.test(plain) && cl.filters?.seriesTag !== "Liella!" && cl.template !== "ability_sequence") {
      if (/控え室|山札|エール/.test(plain)) {
        errors.push(`${id} ${seg.trigger}: Liella! seriesTag missing`);
      }
    }

    if (/のみで/.test(plain) && /ステージ/.test(plain) && !cl.filters?.requiresStageOnlySeries) {
      if (/エネルギーデッキ/.test(plain)) {
        errors.push(`${id} ${seg.trigger}: requiresStageOnlySeries missing`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} liella-bp4 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-liella-bp4-text OK");
