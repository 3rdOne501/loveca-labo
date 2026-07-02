#!/usr/bin/env node
/** Liella! bp5 / Anniversary2026（PL!SP-bp5）メンバー・ライブ: カード文と分類の整合性監査 */
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

function repIdForNum(num) {
  const ids = Object.keys(cards).filter((k) => k.match(new RegExp(`PL!SP-bp5-${num}-`)));
  return (
    ids.find((k) => k.endsWith("-P")) ||
    ids.find((k) => k.endsWith("-N")) ||
    ids.find((k) => k.endsWith("-L")) ||
    ids.find((k) => k.endsWith("-R")) ||
    null
  );
}

/** @type {string[]} */
const errors = [];

for (let n = 1; n <= 27; n++) {
  const num = String(n).padStart(3, "0");
  const id = repIdForNum(num);
  if (!id) continue;
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) {
    if (["018", "019", "022"].includes(num)) continue;
    errors.push(`${id}: ability missing`);
    continue;
  }

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (!seg.trigger) {
      errors.push(`${id}: unsplit ability segment (trigger null)`);
      continue;
    }
    if (seg.trigger === "jouji") {
      if (!classifyJoujiSegment(seg.text)) errors.push(`${id} jouji: unclassified`);
      continue;
    }
    if (seg.trigger === "jidou") {
      const jcl = classifyJidouAutoSegment(seg.text);
      if (!jcl || jcl.template === "jidou_manual") errors.push(`${id} jidou: unclassified`);
      continue;
    }
    const cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      errors.push(`${id} ${seg.trigger}: not automated (${cl.template})`);
      continue;
    }
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    errors.push(...auditCommonAbilityPatterns({ id, trigger: seg.trigger, plain, cl }));

    if (/山札の上からカードを1枚控え室に置くことを4回まで繰り返してもよい/.test(plain)) {
      if (cl.template !== "live_start_mill_loop_blade_grant" || cl.millMaxRepeat !== 4) {
        errors.push(`${id} live_start: mill loop blade grant`);
      }
    }

    if (/『SunnyPassion』のメンバーカードかブレードハートを持つ『Liella!』のメンバー/.test(plain)) {
      const alts = cl.filters?.pickFilterAlternatives;
      if (!alts || alts.length !== 2) errors.push(`${id} ${seg.trigger}: sunny/liella bh OR pick missing`);
    }

    if (/ほかのメンバーがエリアを移動している場合/.test(plain) && /カードを1枚引/.test(plain)) {
      if (cl.template !== "draw_from_deck" || !cl.filters?.requiresOtherStageMemberMovedThisTurn) {
        errors.push(`${id} ${seg.trigger}: other member moved draw misclassified`);
      }
    }

    if (seg.trigger === "jouji" && /『Liella!』のメンバーがこのターンにエリアを移動しているかぎり/.test(plain)) {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.kind !== "hand_cost_reduce" || rule.requiresSeriesMemberMovedThisTurn !== "Liella!") {
        errors.push(`${id} jouji: liella moved hand cost reduce misclassified`);
      }
    }

    if (/デッキの上からカードを3枚控え室に置く：このメンバーはポジションチェンジ/.test(plain)) {
      if (cl.template !== "kidou_deck_top_wait_position_change" || cl.deckTopCount !== 3) {
        errors.push(`${id} kidou: deck mill3 position change misclassified`);
      }
    }

    if (/このターン中にエリアを移動したメンバー1人は/.test(plain) && /ハートを1つ選ぶ/.test(plain)) {
      if (cl.template !== "live_start_moved_members_pick_heart_grant") {
        errors.push(`${id} live_start: moved members heart pick`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} liella-bp5 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-liella-bp5-text OK");
