#!/usr/bin/env node
/** Aqours bp5 / Anniversary2026（PL!S-bp5）メンバー・ライブ: カード文と分類の整合性監査 */
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

function isAqoursBp5Member(id, card) {
  if (card.type !== "メンバー" || !id.startsWith("PL!S-bp5-")) return false;
  const m = id.match(/bp5-(\d+)/);
  if (!m) return false;
  const n = parseInt(m[1], 10);
  return (n >= 1 && n <= 18) || n === 111 || n === 222;
}

function isAqoursBp5Live(id, card) {
  if (card.type !== "ライブ" || !id.startsWith("PL!S-bp5-")) return false;
  const m = id.match(/bp5-(\d+)-L/);
  if (!m) return false;
  const n = parseInt(m[1], 10);
  return n >= 19 && n <= 23;
}

function isAqoursBp5Card(id, card) {
  return isAqoursBp5Member(id, card) || isAqoursBp5Live(id, card);
}

/** @type {string[]} */
const errors = [];
const seenNums = new Set();

for (const [id, card] of Object.entries(cards)) {
  if (!isAqoursBp5Member(id, card) && !isAqoursBp5Live(id, card)) continue;
  const num = id.match(/bp5-(\d+)/)?.[1];
  if (!num || seenNums.has(num)) continue;
  seenNums.add(num);

  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) {
    if (["012", "018", "021"].includes(num)) continue;
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
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/能力を持たないメンバーカードを自分の手札から登場させるためのコストは/.test(plain)) {
        if (rule?.kind !== "grant_hand_no_ability_cost_reduce") {
          errors.push(`${id} jouji: no-ability hand cost reduce`);
        }
      }
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

    if (/能力を持たないメンバーからバトンタッチして登場した場合/.test(plain)) {
      if (cl.template !== "draw_from_deck" || !cl.requiresBatonFromNoAbilityMember) {
        errors.push(`${id} toujyou: baton from no-ability draw`);
      }
    }

    if (/デッキの上からカードを10枚控え室に置く/.test(plain)) {
      if (cl.template !== "deck_top_to_waiting" || cl.deckTopCount !== 10) {
        errors.push(`${id} toujyou: mill 10`);
      }
    }

    if (/それぞれのコストよりコストが高いメンバーが自分のステージにいる/.test(plain)) {
      if (!cl.filters?.requiresStageMemberHigherThanAllOpponent) {
        errors.push(`${id} live_start: opp-all-lower precondition`);
      }
    }

    if (/このターンに登場したメンバー.*以外/.test(plain) && cl.template === "heart_color_pick_grant") {
      if (!cl.grantToEnteredMembersThisTurn || !cl.grantExcludeSeriesTag) {
        errors.push(`${id} live_start: entered-members heart grant flags`);
      }
    }

    if (/エールにより公開された自分のカードの中から、メンバーカードを2枚まで手札に加/.test(plain)) {
      if (cl.template !== "yell_resolution_pick_hand" || cl.filters?.pickType !== "メンバー" || cl.handPickMax !== 2) {
        errors.push(`${id} live_success: yell member pick2`);
      }
      if (cl.preconditionFilters?.minEitherSuccessLiveCount !== 2) {
        errors.push(`${id} live_success: either success live 2+`);
      }
    }

    if (/自分が余剰ハートを3つ以上持っている場合、それらをすべて失い/.test(plain)) {
      if (
        cl.template !== "live_success_surplus_heart_score_plus" ||
        cl.minSurplusHearts !== 3 ||
        !cl.loseAllSurplusHearts
      ) {
        errors.push(`${id} live_success: surplus heart score+1`);
      }
    }

    if (/エールにより公開されている自分のライブカードの枚数が.*相手のライブカードの枚数より多い/.test(plain)) {
      if (cl.template !== "live_card_score_plus" || cl.cardScoreGrant !== 1) {
        errors.push(`${id} live_success: yell live count score+1`);
      }
    }

    if (/『Aqours』と『SaintSnow』のライブカードを4枚まで好きな順番でデッキの上に置/.test(plain)) {
      if (
        cl.template !== "live_start_waiting_lives_reorder_deck_top" ||
        cl.deckTopPickMax !== 4 ||
        cl.minStagePresenceSeriesCostSum !== 20
      ) {
        errors.push(`${id} live_start: waiting lives deck top`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} aqours-bp5 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-aqours-bp5-text OK");
