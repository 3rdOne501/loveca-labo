#!/usr/bin/env node
/** Aqours PR（PL!S-PR）: カード文と分類の整合性監査 */
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

function isAqoursPr(id) {
  return /^PL!S-PR-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isAqoursPr(id)) continue;
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

    if (/自分か相手を選ぶ.*控え室.*ライブカード.*デッキの一番下/.test(plain.replace(/\n/g, ""))) {
      if (
        cl.template !== "live_start_pick_player_waiting_deck_bottom" ||
        cl.filters?.pickType !== "ライブ" ||
        !cl.deckDrawOnSuccess
      ) {
        errors.push(`${id} ${seg.trigger}: pick-player live deck-bottom draw misclassified`);
      }
    }

    if (/自分か相手のステージにコスト13以上/.test(plain) && seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.minCost13OnAnyStage !== 13 || rule.bladeFlat !== 2) {
        errors.push(`${id} jouji: cost13 blade2 not parsed`);
      }
    }

    if (/同じグループ名.*3枚以上/.test(plain) && seg.trigger === "jidou") {
      const rule = classifyJidouAutoSegment(seg.text);
      if (rule.template !== "jidou_yell_grant_jouji" || rule.minYellSameGroupMemberCount !== 3) {
        errors.push(`${id} jidou: yell same-group 3+ misclassified`);
      }
    }

    if (/ステージにメンバーが合計6人/.test(plain) && seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.minTotalMembersBothStages !== 6) {
        errors.push(`${id} jouji: both-stage 6 members not parsed`);
      }
    }

    applyPrCrossCuttingChecks(id, seg, plain, cl, errors);
  }
}

if (errors.length) {
  console.error(`${errors.length} aqours-pr issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-aqours-pr-text OK");
