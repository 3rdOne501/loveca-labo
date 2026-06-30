#!/usr/bin/env node
/** 蓮ノ空 PR（PL!HS-PR）: カード文と分類の整合性監査 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";
import { applyPrCrossCuttingChecks } from "./lib/pr-audit-common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isHasunosoraPr(id) {
  return /^PL!HS-PR-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isHasunosoraPr(id)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (!seg.trigger) continue;
    const cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (!seg.trigger && /必要ハートを確認する時/.test(plain)) {
      continue;
    }

    if (!cl.template || cl.template === "none") {
      if (/必要ハートを確認する時.*任意の色のハート/.test(plain)) continue;
      errors.push(`${id} ${seg.trigger || "none"}: not automated (${cl.template})`);
      continue;
    }
    if (cl.template === "guided_manual") {
      if (/必要ハートを確認する時.*任意の色のハート/.test(plain)) continue;
      errors.push(`${id} ${seg.trigger}: guided_manual`);
      continue;
    }
    if (
      !abilityEffectIsAutomated(cl.template) &&
      cl.template !== "ability_sequence" &&
      cl.template !== "passive_track"
    ) {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/それらがすべて.*heart04.*メンバー|それらがすべて.*を持つメンバー/.test(plain + seg.text)) {
      if (
        /heart_04|heart04|h04/i.test(seg.text) &&
        cl.template !== "toujou_deck_top_wait_if_all_heart"
      ) {
        errors.push(`${id} toujyou: deck mill heart04 grant misclassified`);
      }
      if (
        /heart_01|heart01|h01/i.test(seg.text) &&
        cl.template !== "toujou_deck_top_wait_if_all_heart"
      ) {
        errors.push(`${id} toujyou: deck mill heart01 grant misclassified`);
      }
    }

    if (/元々持つハートの数より多い数のハートを持つ/.test(plain) && seg.trigger === "live_success") {
      if (
        cl.template !== "draw_from_deck" ||
        cl.filters?.minStageOverflowHeartMembers !== 1
      ) {
        errors.push(`${id} live_success: overflow-heart draw misclassified`);
      }
    }

    if (/コスト2以下のメンバーカードか、スコア２以下のライブカード/.test(plain)) {
      if (!cl.filters?.pickFilterAlternatives || cl.filters.pickFilterAlternatives.length !== 2) {
        errors.push(`${id} ${seg.trigger}: member-or-live yell pick misclassified`);
      }
    }

    if (/スコア6以上のライブカード/.test(plain) && seg.trigger === "toujyou") {
      if (cl.filters?.minScore !== 6 || cl.filters?.pickType !== "ライブ") {
        errors.push(`${id} toujyou: live score6+ recover misclassified`);
      }
    }

    applyPrCrossCuttingChecks(id, seg, plain, cl, errors);
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PL!HS-PR audit OK");
