#!/usr/bin/env node
/** Aqours sd1（PL!S-sd1）: カード文と分類の整合性監査 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isAqoursSd1(id) {
  return /^PL!S-sd1-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isAqoursSd1(id)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
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

    if (/ライブカード1枚につき/.test(plain) && /heart_02|heart02/.test(seg.text)) {
      if (cl.template === "jidou_yell_grant_jouji") {
        errors.push(`${id} jidou: yell heart per live misclass as grant_jouji`);
      }
    }

    if (/そうした場合/.test(plain) && /手札\d+枚を好きな順番でデッキの上に置/.test(plain)) {
      if (cl.template === "draw_from_deck") {
        errors.push(`${id} ${seg.trigger}: optional draw+hand top misclass as draw_from_deck`);
      }
    }

    if (/スコアを持つ/.test(plain) && /控え室から/.test(plain) && /ライブカード/.test(plain)) {
      if (cl.filters?.minScore == null) {
        errors.push(`${id} ${seg.trigger}: score live filter missing minScore`);
      }
    }

    if (/手札の『Aqours』のカードを1枚公開/.test(plain) && /デッキの一番上か一番下/.test(plain)) {
      if (cl.template === "grant_jouji_session") {
        errors.push(`${id} ${seg.trigger}: hand reveal deck misclass as grant_jouji_session`);
      }
    }

    if (/ステージにいる『Aqours』のメンバーは/.test(plain) && /ブレード/.test(seg.text)) {
      if (cl.grantToStageSeriesTag !== "Aqours") {
        errors.push(`${id} ${seg.trigger}: stage aqours blade grant target missing`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} aqours-sd1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-aqours-sd1-text OK");
