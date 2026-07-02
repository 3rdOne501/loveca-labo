#!/usr/bin/env node
/** 全スクール pb1: カード文と分類の整合性監査 */
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

/** @type {Array<{prefix:string, label:string}>} */
const SCHOOLS = [
  { prefix: "PL!-pb1-", label: "muse" },
  { prefix: "PL!S-pb1-", label: "aqours" },
  { prefix: "PL!N-pb1-", label: "niji" },
  { prefix: "PL!SP-pb1-", label: "liella" },
];

function cardNum(id) {
  const m = id.match(/pb1-(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** @type {string[]} */
const errors = [];

for (const { prefix, label } of SCHOOLS) {
  for (const [id, card] of Object.entries(cards).sort(
    (a, b) => cardNum(a[0]) - cardNum(b[0]) || a[0].localeCompare(b[0]),
  )) {
    if (!id.startsWith(prefix) || card.type === "エネルギー") continue;
    const raw = cardAbilityRawText(card);
    if (!raw?.trim()) continue;

    for (const seg of splitAbilityByTriggers(raw)) {
      const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
      if (seg.trigger === "jouji") {
        const jr = classifyJoujiSegment(seg.text);
        if (!jr?.kind) errors.push(`[${label}] ${id} jouji: manual`);
        continue;
      }
      if (!seg.trigger) continue;
      const cl = classifyCardAbility(card, seg.trigger, seg.text);

      if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
        errors.push(`[${label}] ${id} ${seg.trigger}: not automated (${cl.template})`);
        continue;
      }
      if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
        errors.push(`[${label}] ${id} ${seg.trigger}: template not automated ${cl.template}`);
      }

      if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
        if (cl.template === "deck_top_to_waiting") {
          errors.push(`[${label}] ${id} ${seg.trigger}: deck_top_to_waiting misclass (hand recover)`);
        }
      }

      if (cl.template === "deck_top_pick_recover") {
        const maxM =
          plain.match(/(\d+)枚まで(?:公開して)?手札に加/) ||
          (plain.match(/その中から1枚を手札に加え/) ? ["", "1"] : null);
        if (maxM && Number(maxM[1] || 1) > 1 && cl.deckTopPickMax !== Number(maxM[1])) {
          errors.push(`[${label}] ${id} ${seg.trigger}: deckTopPickMax want ${maxM[1]} got ${cl.deckTopPickMax}`);
        }
        const lookM = plain.match(/上からカードを(\d+)枚見る/);
        if (lookM && cl.deckTopCount !== Number(lookM[1])) {
          errors.push(`[${label}] ${id} ${seg.trigger}: deckTopCount want ${lookM[1]} got ${cl.deckTopCount}`);
        }
      }

      if (cl.template === "draw_from_deck" && /このカードのスコア/.test(plain)) {
        errors.push(`[${label}] ${id} ${seg.trigger}: draw_from_deck misclass for score effect`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} pb1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-pb1-text OK (muse / aqours / niji / liella)");
