#!/usr/bin/env node
/** 虹ヶ咲 PR（PL!N-PR）: カード文と分類の整合性監査 */
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
import { applyPrCrossCuttingChecks } from "./lib/pr-audit-common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isNijiPr(id) {
  return /^PL!N-PR-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isNijiPr(id)) continue;
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
    if (
      !abilityEffectIsAutomated(cl.template) &&
      cl.template !== "ability_sequence" &&
      cl.template !== "passive_track"
    ) {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/手札をすべて公開/.test(plain) && /公開した手札の中にライブカードがない/.test(plain)) {
      if (cl.template !== "kidou_reveal_all_hand_deck_top_live" || cl.filters?.pickType !== "ライブ") {
        errors.push(`${id} kidou: reveal-all-hand deck-live misclassified`);
      }
      if (cl.filters?.minStageMembers !== 2) {
        errors.push(`${id} kidou: other-member-on-stage not parsed`);
      }
    }

    if (/コスト2以下のメンバーカードか、スコア２以下のライブカード/.test(plain)) {
      if (!cl.filters?.pickFilterAlternatives || cl.filters.pickFilterAlternatives.length !== 2) {
        errors.push(`${id} ${seg.trigger}: member-or-live yell pick misclassified`);
      }
    }

    if (/同じグループ名.*3枚以上/.test(plain) && seg.trigger === "jidou") {
      const rule = classifyJidouAutoSegment(seg.text);
      if (rule.template !== "jidou_yell_grant_jouji" || rule.minYellSameGroupMemberCount !== 3) {
        errors.push(`${id} jidou: yell same-group 3+ misclassified`);
      }
    }

    if (/成功ライブカード置き場にカードが合計4枚以上/.test(plain) && seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.minCombinedSuccessLive !== 4) {
        errors.push(`${id} jouji: combined success live 4+ not parsed`);
      }
    }

    if (/ステージにメンバーが合計6人/.test(plain) && seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.minTotalMembersBothStages !== 6) {
        errors.push(`${id} jouji: both-stage 6 members not parsed`);
      }
    }

    if (/エマパンチ/.test(plain) && seg.trigger === "toujyou") {
      if (cl.template !== "toujou_opp_emma_punch_answer") {
        errors.push(`${id} toujyou: emma punch misclassified`);
      }
    }

    applyPrCrossCuttingChecks(id, seg, plain, cl, errors);
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PL!N-PR audit OK");
