#!/usr/bin/env node
/** Aqours bp6 / RoyalHoliday（PL!S-bp6）: カード文と分類の整合性監査 */
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

function isAqoursBp6(id, card) {
  return /^PL!S-bp6-\d{3}-/.test(id) && card.type !== "エネルギー";
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isAqoursBp6(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
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

    if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
      if (cl.template === "deck_top_to_waiting") {
        errors.push(`${id} ${seg.trigger}: deck_top_to_waiting misclass (hand recover)`);
      }
    }

    if (/ステージにいるメンバーがすべて『Aqours』/.test(plain) && /デッキの一番上か一番下/.test(plain)) {
      if (cl.template !== "draw_then_hand_to_deck_top" || !cl.requiresStageMembersAllSeriesTag) {
        errors.push(`${id} live_start: all-Aqours draw deck misclassified`);
      }
    }

    if (/相手のエネルギーが自分より多い/.test(plain) && seg.trigger === "live_success") {
      if (cl.template !== "live_card_score_plus") {
        errors.push(`${id} live_success: opp-more-energy score misclassified`);
      }
    }

    if (/相手は余剰ハートをすべて失う/.test(plain)) {
      if (cl.template !== "live_success_opp_lose_surplus_score") {
        errors.push(`${id} live_success: opp surplus loss misclassified`);
      }
    }

    if (/カードを2枚引/.test(plain) && /控え室から登場している場合/.test(plain)) {
      if (cl.template === "ability_sequence") {
        errors.push(`${id} toujyou: draw+wait grant should not be ability_sequence`);
      }
      if (/手札を1枚控え室に置/.test(plain) && cl.template !== "toujou_draw_discard_if_from_waiting") {
        errors.push(`${id} toujyou: draw+discard from waiting misclassified`);
      }
    }

    if (/右サイドエリアか左サイドエリア/.test(plain) && /コスト13以上/.test(plain)) {
      if (
        cl.template !== "optional_self_wait_opp_stage" ||
        cl.oppWaitMinCost !== 13 ||
        !cl.requiresEnteredFromWaiting
      ) {
        errors.push(`${id} toujyou: opp side min-cost13 wait misclassified`);
      }
    }

    if (/エールにより公開された自分のカードの中にライブカードがある場合/.test(plain)) {
      if (cl.template !== "live_card_score_plus" || !cl.requiresYellRevealedOwnLiveCard) {
        errors.push(`${id} live_success: yell-revealed live score misclassified`);
      }
    }
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PL!S-bp6 audit OK");
