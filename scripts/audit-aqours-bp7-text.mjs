#!/usr/bin/env node
/** Aqours bp7 / MELLOWMOMENT（PL!S-bp7）: カード文と分類の整合性監査（メンバー） */
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

function isAqoursBp7(id, card) {
  if (card.type === "エネルギー") return false;
  return /^PL!S-bp7-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isAqoursBp7(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/正面のエリアにいる/.test(plain) && /失う/.test(plain)) {
        if (rule?.kind !== "opp_across_lose_blade") {
          errors.push(`${id} jouji: across lose blade misclassified (${rule?.kind})`);
        }
      }
      if (/相手のエネルギーが自分より多い/.test(plain) && !rule?.opponentHasMoreEnergy) {
        errors.push(`${id} jouji: opponentHasMoreEnergy missing`);
      }
      if (/ステージにメンバーが(\d+)人以上/.test(plain) && rule?.minStageMemberCount == null) {
        errors.push(`${id} jouji: minStageMemberCount missing`);
      }
      if (/デッキの上から行う代わりにデッキの下から行う/.test(plain) && rule?.kind !== "yell_from_deck_bottom") {
        errors.push(`${id} jouji: yell_from_deck_bottom misclassified (${rule?.kind})`);
      }
      continue;
    }
    if (seg.trigger === "jidou") {
      const jcl = classifyJidouAutoSegment(seg.text);
      if (!jcl || jcl.template === "jidou_manual") errors.push(`${id} jidou: unclassified`);
      continue;
    }
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

    if (
      /バトンタッチして登場した場合/.test(plain) &&
      /手札のカードを3枚まで選び/.test(plain) &&
      /デッキの下に置く/.test(plain) &&
      /カードを3枚引/.test(plain)
    ) {
      if (cl.template !== "toujou_baton_both_keep_hand_shuffle_deck_bottom_draw") {
        errors.push(`${id} toujyou: baton keep-hand shuffle misclassified as ${cl.template}`);
      }
    }

    if (
      /デッキの下からカードを\d+枚控え室に置く/.test(plain) &&
      /それらがすべて『/.test(plain) &&
      /ライブ終了時まで/.test(plain)
    ) {
      if (cl.template !== "deck_mill_conditional_grant") {
        errors.push(`${id} ${seg.trigger}: mill-all-series grant misclassified as ${cl.template}`);
      }
    }

    if (/残りを好きな順番でデッキの下に置く/.test(plain) && /デッキの上からカードを/.test(plain)) {
      if (cl.template !== "deck_top_look_reorder" || cl.deckLookRemainTo !== "bottom") {
        errors.push(`${id} toujyou: remain-to-bottom misclassified`);
      }
    }

    if (
      /控え室から『[^』]+』のメンバーカードを3枚まで/.test(plain) &&
      /デッキの下に置く/.test(plain) &&
      /1枚につき/.test(plain)
    ) {
      if (cl.template !== "waiting_to_deck_bottom_blade_per") {
        errors.push(`${id} live_start: waiting deck-bottom blade-per misclassified as ${cl.template}`);
      }
    }

    if (/すべてのメンバーがアクティブ状態の場合/.test(plain) && /必要ハート/.test(plain)) {
      if (!cl.filters?.requiresAllStageMembersActive) {
        errors.push(`${id} live_start: requiresAllStageMembersActive missing`);
      }
    }

    if (
      /デッキの下からカードを1枚控え室に置く/.test(plain) &&
      /メンバーカードの場合/.test(plain) &&
      /必要ハート/.test(plain)
    ) {
      if (cl.template !== "deck_mill_conditional_need_heart_reduce") {
        errors.push(`${id} live_start: mill→need-heart misclassified as ${cl.template}`);
      }
    }

  }
}

if (errors.length) {
  console.error("audit-aqours-bp7-text FAIL:");
  errors.forEach((e) => console.error(" ", e));
  process.exit(1);
}
console.log("audit-aqours-bp7-text OK");
