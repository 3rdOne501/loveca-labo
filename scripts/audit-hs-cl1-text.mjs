#!/usr/bin/env node
/** 蓮ノ空 cl1（PL!HS-cl1）メンバー・ライブ: カード文と分類の整合性監査 */
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

function isHsCl1(id) {
  return /^PL!HS-cl1-\d{3}-CL$/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards)) {
  if (!isHsCl1(id)) continue;
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

    if (/デッキの上からカードを1枚見る/.test(plain) && /控え室に置いてもよい/.test(plain)) {
      if (cl.template !== "deck_top_peek_optional_wait") {
        errors.push(`${id} ${seg.trigger}: peek optional wait expected`);
      }
    }

    if (/以下から1つを選ぶ/.test(plain) && /デッキの上からカードを3枚控え室/.test(plain)) {
      if (cl.template !== "ability_pick_one" || !cl.abilityChoices || cl.abilityChoices.length !== 2) {
        errors.push(`${id} toujyou: deck mill or opp wait choices`);
      }
    }

    if (/コスト4以上9以下/.test(plain)) {
      if (cl.filters?.minCost !== 4 || cl.filters?.maxCost !== 9) {
        errors.push(`${id} live_success: cost range 4-9`);
      }
    }

    if (/コスト10以上の『蓮ノ空』のメンバー1人は/.test(plain)) {
      if (cl.template !== "grant_jouji_session" || cl.grantToStageSeriesTag !== "蓮ノ空") {
        errors.push(`${id} live_start: grant jouji series member`);
      }
      if (cl.grantToStageSeriesMax !== 1) errors.push(`${id} live_start: pick one member`);
    }

    if (/以下から1つを選ぶ/.test(plain) && /支払ってもよい/.test(plain)) {
      if (cl.template !== "live_success_pick_options") errors.push(`${id} live_success: pick options`);
    }

    if (/合計スコアが同じ場合/.test(plain)) {
      if (!cl.preconditionFilters?.requiresLiveScoreTieWithOpponent) {
        errors.push(`${id} live_success: score tie precondition`);
      }
    }
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PL!HS-cl1 audit OK");
