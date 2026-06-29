#!/usr/bin/env node
/** 蓮ノ空 sd1（PL!HS-sd1）: カード文と分類の整合性監査 */
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

function isHasunosoraSd1(id) {
  return /^PL!HS-sd1-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isHasunosoraSd1(id)) continue;
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
      !(seg.trigger === "jouji" && cl.template === "passive_track")
    ) {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/このメンバー以外の『蓮ノ空』のメンバー1人は/.test(plain) && /ブレード/.test(seg.text)) {
      if (cl.template === "optional_energy_blade_until_live_end") {
        errors.push(`${id} ${seg.trigger}: other-member blade misclass as self optional E blade`);
      }
      if (cl.template === "grant_jouji_session" && !cl.grantExcludeSelf) {
        errors.push(`${id} ${seg.trigger}: other-member grant missing grantExcludeSelf`);
      }
    }

    if (/「[^」]+」以外の『蓮ノ空』のメンバーからバトンタッチ/.test(plain) && seg.trigger === "toujyou") {
      if (!cl.requiresBatonFromSeriesTag || !cl.excludeBatonPartnerCharacterName) {
        errors.push(`${id} ${seg.trigger}: baton exclude character missing`);
      }
    }

    if (/エネルギーを1枚アクティブ/.test(plain) && /大沢瑠璃乃/.test(plain) && seg.trigger === "toujyou") {
      if (cl.template !== "toujou_named_stage_activate_recover_wait") {
        errors.push(`${id} ${seg.trigger}: named stage activate recover misclassified as ${cl.template}`);
      }
    }

    if (/すべて.*heart05|heart_05/.test(seg.text) && /デッキの上からカードを3枚控え室/.test(plain)) {
      if (cl.template !== "toujou_deck_top_wait_if_all_heart" || cl.requiredHeartSlot !== 5) {
        errors.push(`${id} ${seg.trigger}: heart05 mill grant missing`);
      }
    }

    if (/選んだハートを2つ得る/.test(plain) && /このメンバー以外/.test(plain)) {
      if (cl.template === "heart_color_pick_grant" && !cl.grantExcludeSelf) {
        errors.push(`${id} ${seg.trigger}: heart pick grant missing grantExcludeSelf`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} hasunosora-sd1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-hasunosora-sd1-text OK");
