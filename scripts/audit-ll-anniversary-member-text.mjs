#!/usr/bin/env node
/** アニバーサリー クロスメンバー（LL-bp*-001-R＋）: カード文と分類の整合性監査 */
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

/** @param {string} id */
function isAnniversaryCrossMember(id) {
  return /^LL-bp[1-6]-001-R/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isAnniversaryCrossMember(id)) continue;
  if (card.type === "エネルギー") continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
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

    if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
      if (cl.template === "deck_top_to_waiting") {
        errors.push(`${id} ${seg.trigger}: deck_top_to_waiting misclass (hand recover)`);
      }
    }

    if (/デッキの上からカードを6枚見る/.test(plain) && /2枚手札に加え/.test(plain)) {
      if (cl.template !== "deck_top_pick_recover" || cl.deckTopPickMax !== 2) {
        errors.push(`${id} ${seg.trigger}: deck6 pick2 misclassified`);
      }
    }

    if (/合計6枚をシャッフルしてデッキの一番下/.test(plain)) {
      if (cl.template !== "kidou_wait_shuffle_deck_bottom_activate") {
        errors.push(`${id} kidou: shuffle6 misclassified`);
      }
    }

    if (/公開したカードのコスト以下/.test(plain) && /元々持つ.*ブレード/.test(plain)) {
      if (cl.template !== "deck_peek_pick_then_opp_wait") {
        errors.push(`${id} ${seg.trigger}: peek pick opp wait misclassified`);
      }
    }

    if (/ハートの色1つにつき/.test(plain)) {
      if (cl.template !== "live_start_hand_named_discard_hearts_grant") {
        errors.push(`${id} live_start: named discard hearts misclassified`);
      }
    }

    if (/合計\d+枚.*控え室.*ライブ終了時まで/.test(plain.replace(/\s+/g, ""))) {
      if (cl.template !== "live_start_hand_named_discard_grant_jouji") {
        errors.push(`${id} live_start: named discard grant misclassified`);
      } else if ((cl.characterNames || []).some((n) => /ライブ|スコア|ブレード/.test(n))) {
        errors.push(`${id} live_start: grant text leaked into characterNames`);
      }
    }
  }
}

if (errors.length) {
  console.error("audit-ll-anniversary-member-text FAILED:");
  errors.forEach((e) => console.error("  -", e));
  process.exit(1);
}
console.log(`audit-ll-anniversary-member-text OK (${Object.keys(cards).filter(isAnniversaryCrossMember).length} cards)`);
