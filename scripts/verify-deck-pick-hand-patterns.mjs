#!/usr/bin/env node
/**
 * 「山札見る→手札に加える→残り控え室」および
 * ライブ開始時の手札コスト→常時付与パターンの一括回帰検証。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCardAbility, splitAbilityByTriggers } from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards)) {
  const ab = card.ability || "";
  if (!ab.trim()) continue;
  for (const seg of splitAbilityByTriggers(ab)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    const cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
      if (/登場させるか、手札に加える/.test(plain)) {
        if (cl.template !== "deck_top_pick_enter_or_hand") {
          errors.push(`${id} ${seg.trigger}: enter_or_hand expected, got ${cl.template}`);
        }
        continue;
      }
      if (cl.template === "deck_top_to_waiting") {
        errors.push(`${id} ${seg.trigger}: deck_top_to_waiting but text has hand recover`);
        continue;
      }
      if (cl.template === "deck_top_pick_recover") {
        const maxM =
          plain.match(/(\d+)枚まで(?:公開して)?手札に加/) ||
          plain.match(/(\d+)枚まで公開して手札に加/) ||
          (plain.match(/その中から1枚を手札に加え/) ? ["", "1"] : null) ||
          plain.match(/カードを(\d+)枚手札に加/);
        if (maxM && Number(maxM[1]) > 1 && cl.deckTopPickMax !== Number(maxM[1])) {
          errors.push(`${id} ${seg.trigger}: deckTopPickMax want ${maxM[1]} got ${cl.deckTopPickMax}`);
        }
        if (/各グループ名につき1枚ずつ/.test(plain) && !cl.deckTopPickDistinctGroup) {
          errors.push(`${id} ${seg.trigger}: deckTopPickDistinctGroup missing`);
        }
      }
    }

    if (/手札の同じユニット名を持つカード(\d+)枚/.test(plain) && /ライブ終了時まで/.test(plain)) {
      if (cl.template !== "live_start_hand_discard_same_unit_grant") {
        errors.push(`${id} ${seg.trigger}: same_unit_grant expected, got ${cl.template}`);
      }
    }
    if (/手札の同じグループ名を持つカード(\d+)枚/.test(plain) && /ライブ終了時まで/.test(plain)) {
      if (cl.template !== "live_start_hand_discard_same_group_grant") {
        errors.push(`${id} ${seg.trigger}: same_group_grant expected, got ${cl.template}`);
      }
    }
    if (
      /手札を(\d+)枚まで控え室/.test(plain) &&
      /置いたカード1枚につき/.test(plain) &&
      /ライブ終了時まで/.test(plain) &&
      !/ステージのメンバー1人は/.test(plain)
    ) {
      if (cl.template !== "live_start_hand_discard_optional_blade_per") {
        errors.push(`${id} ${seg.trigger}: optional_blade_per expected, got ${cl.template}`);
      }
    }
    if (
      /手札の『([^』]+)』のメンバーカードを(\d+)枚まで控え室/.test(plain) &&
      /ステージのメンバー1人は/.test(plain)
    ) {
      if (cl.template !== "live_start_hand_discard_series_member_blade_grant") {
        errors.push(`${id} ${seg.trigger}: series_member_blade expected, got ${cl.template}`);
      }
    }
    if (
      /手札の/.test(plain) &&
      /合計(\d+)枚/.test(plain) &&
      /「/.test(plain) &&
      /控え室/.test(plain) &&
      /ライブ終了時まで/.test(plain)
    ) {
      if (cl.template !== "live_start_hand_named_discard_grant_jouji") {
        errors.push(`${id} ${seg.trigger}: named_discard_grant_jouji expected, got ${cl.template}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} deck-pick/hand-cost pattern issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("verify-deck-pick-hand-patterns OK");
