#!/usr/bin/env node
/** 虹ヶ咲 bp5 / Anniversary2026（PL!N-bp5）メンバー・ライブ: カード文と分類の整合性監査 */
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
  const ids = Object.keys(cards).filter((k) => k.match(new RegExp(`PL!N-bp5-${num}-`)));
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

for (let n = 1; n <= 30; n++) {
  const num = String(n).padStart(3, "0");
  const id = repIdForNum(num);
  if (!id) continue;
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) {
    if (["017", "018", "020", "024", "025"].includes(num)) continue;
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

    if (/デッキの一番上から4枚目に置いてもよい/.test(plain) && cl.template === "ability_sequence") {
      const step1 = cl.steps?.[1];
      if (step1?.template !== "toujou_optional_wait_to_deck_top") {
        errors.push(`${id} toujyou: wait-to-deck-top step misclassified`);
      }
    }

    if (/コスト\d+以上のブレードハートを持たない.*バトンタッチ/.test(plain)) {
      const jcl = classifyJidouAutoSegment(seg.text);
      if (jcl?.template !== "jidou_leave_baton_partner_bh_threshold_energy") {
        errors.push(`${id} jidou: baton partner bh threshold energy`);
      }
    }

    if (/余剰ハートが0個/.test(plain) || (/余剰ハート/.test(plain) && /0個/.test(plain))) {
      if (!cl.filters?.requiresZeroSurplusHearts) {
        errors.push(`${id} live_success: zero surplus hearts filter`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} niji-bp5 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-niji-bp5-text OK");
