#!/usr/bin/env node
/** 虹ヶ咲 bp3 / 夏、はじまる。（PL!N-bp3）: カード文と分類の整合性監査 */
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

function isNijiBp3(id, card) {
  return /-bp3-/.test(id) && ((card.series || "").includes("虹ヶ咲") || id.startsWith("PL!N-bp3"));
}

function cardNum(id) {
  const m = id.match(/bp3-(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort(
  (a, b) => cardNum(a[0]) - cardNum(b[0]) || a[0].localeCompare(b[0]),
)) {
  if (!isNijiBp3(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      if (classifyJoujiSegment(seg.text).template === "jouji_manual") errors.push(`${id} jouji: manual`);
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
  }
}

if (errors.length) {
  console.error(`${errors.length} niji-bp3 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-niji-bp3-text OK");
