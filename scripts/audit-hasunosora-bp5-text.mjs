#!/usr/bin/env node
/** 蓮ノ空 bp5 / Anniversary2026（PL!HS-bp5）メンバー・ライブ: カード文と分類の整合性監査 */
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
  const ids = Object.keys(cards).filter((k) => k.match(new RegExp(`PL!HS-bp5-${num}-`)));
  return (
    ids.find((k) => k.endsWith("-P")) ||
    ids.find((k) => k.endsWith("-N")) ||
    ids.find((k) => k.endsWith("-L")) ||
    ids.find((k) => k.endsWith("-R")) ||
    null
  );
}

/** @type {string[]} */
const errors = [];

for (let n = 1; n <= 22; n++) {
  const num = String(n).padStart(3, "0");
  const id = repIdForNum(num);
  if (!id) continue;
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) {
    if (["009", "010", "012", "015"].includes(num)) continue;
    errors.push(`${id}: ability missing`);
    continue;
  }

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (!seg.trigger) {
      errors.push(`${id}: unsplit ability segment (trigger null)`);
      continue;
    }
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

    if (/DOLLCHESTRA/.test(plain) && /コストが10以上/.test(plain) && /ライブ終了時まで/.test(plain)) {
      if (cl.template !== "live_start_dollcostra_cost_set_grant_if") {
        errors.push(`${id} live_start: dollcostra cost set grant`);
      }
    }

    if (/ライブカード置き場にあるこのカード以外の『蓮ノ空』/.test(plain) && /heart04/.test(plain)) {
      if (cl.template !== "live_start_need_heart_reduce_per_unit") {
        errors.push(`${id} live_start: live area other series heart reduce`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} hasunosora-bp5 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-hasunosora-bp5-text OK");
