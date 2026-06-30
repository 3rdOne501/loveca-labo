#!/usr/bin/env node
/** μ's bp5 / Anniversary2026（PL!-bp5）メンバー・ライブ: カード文と分類の整合性監査 */
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

function isMuseBp5Member(id, card) {
  if (card.type !== "メンバー") return false;
  return /^PL!-bp5-(0\d{2}|111|222|333)-/.test(id);
}

function isMuseBp5Live(id, card) {
  return /^PL!-bp5-0(19|2[0-4])-L$/.test(id) && card.type === "ライブ";
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards)) {
  if (!isMuseBp5Member(id, card) && !isMuseBp5Live(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/名前が異なるメンバーが3人以上/.test(plain) && rule?.minDistinctNameStageMembers !== 3) {
        errors.push(`${id} jouji: missing distinct-name-3 condition`);
      }
      if (/成功ライブカード置き場にあるカードのスコアの合計が/.test(plain) && rule?.minSuccessLiveScoreSum == null) {
        errors.push(`${id} jouji: missing successLive score sum condition`);
      }
      if (/このメンバーがウェイト状態であるかぎり/.test(plain) && !rule?.heartFlat) {
        errors.push(`${id} jouji: self-wait heart grant missing heartFlat`);
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
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    errors.push(...auditCommonAbilityPatterns({ id, trigger: seg.trigger, plain, cl }));

    if (/コスト9以上の『μ's』/.test(plain) && cl.template === "deck_top_pick_recover") {
      if (cl.filters?.minCost !== 9 || cl.filters?.seriesTag !== "μ's") {
        errors.push(`${id} ${seg.trigger}: muse C9+ filter missing`);
      }
    }

    if (/センターエリアに『μ's』/.test(plain) && /heart0.*減らす/.test(plain)) {
      if (cl.template !== "live_start_need_heart_reduce_per_unit") {
        errors.push(`${id} live_start: center muse heart reduce misclassified`);
      }
    }

    if (/SUNNY DAY SONG|自分のステージにメンバーが1人以上いる場合.*2人以上いる場合/.test(plain)) {
      if (cl.template !== "live_start_sunny_day_song_tiered") {
        errors.push(`${id} live_start: sunny day song misclassified`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} muse-bp5 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-muse-bp5-text OK");
