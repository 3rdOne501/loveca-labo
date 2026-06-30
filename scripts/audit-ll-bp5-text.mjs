#!/usr/bin/env node
/** アニバーサリー LL-bp5 ライブ: カード文と分類の整合性監査 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isLlBp5Live(id, card) {
  return /^LL-bp5-\d{3}-L$/.test(id) && card.type === "ライブ";
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards)) {
  if (!isLlBp5Live(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (!seg.trigger) continue;
    const cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      errors.push(`${id} ${seg.trigger}: not automated (${cl.template})`);
      continue;
    }
    if (!abilityEffectIsAutomated(cl.template)) {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/ライブカードが2枚以上あるか/.test(plain) && /合計5種類以上あるか/.test(plain)) {
      if (!cl.scorePlusOrPreconditions) errors.push(`${id} live_success: missing scorePlusOrPreconditions`);
      if (cl.minYellRevealedLiveCount !== 2) errors.push(`${id} live_success: yell live count`);
      if (cl.minStageDistinctHeartSlots !== 5) errors.push(`${id} live_success: distinct heart slots`);
      if (!cl.scorePlusOrStageMoved) errors.push(`${id} live_success: stage moved OR`);
    }

    if (/グループ名がそれぞれ異なるメンバーが3人以上/.test(plain) && /センターエリア/.test(plain)) {
      if (cl.template !== "grant_jouji_session") errors.push(`${id} live_start: grant_jouji misclassified`);
      if (cl.filters?.minDistinctMemberGroups !== 3) errors.push(`${id} live_start: minDistinctMemberGroups`);
      if (!cl.grantToCenterMember || !cl.grantAllHeartCount) {
        errors.push(`${id} live_start: center all-heart grant`);
      }
    }

    if (/控え室にある/.test(plain) && /すべてのメンバーと異なるグループ名/.test(plain)) {
      if (cl.template !== "live_success_recover_waiting_diff_group") {
        errors.push(`${id} live_success: recover diff group misclassified`);
      }
    }
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("LL-bp5 live audit OK");
