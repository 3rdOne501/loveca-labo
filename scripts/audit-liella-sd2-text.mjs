#!/usr/bin/env node
/** Liella! sd2 cheer（PL!SP-sd2）: カード文と分類の整合性監査 */
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

function isLiellaSd2(id) {
  return /^PL!SP-sd2-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isLiellaSd2(id)) continue;
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

    if (/ポジションチェンジしてもよい/.test(plain) && seg.trigger === "toujyou") {
      if (cl.template !== "live_start_position_change" || !cl.optional) {
        errors.push(`${id} ${seg.trigger}: toujyou optional position change misclassified`);
      }
    }

    if (/起動.*ポジションチェンジする/.test(plain.replace(/\n/g, "")) && seg.trigger === "kidou") {
      if (cl.template !== "live_start_position_change" || !cl.costEnergy || cl.costEnergyCount !== 2) {
        errors.push(`${id} ${seg.trigger}: kidou E2 position change misclassified`);
      }
    }

    if (/このターン.*エリアを移動している場合.*さらにカードを1枚引く/.test(plain)) {
      if (
        cl.template !== "draw_then_conditional_extra_draw" ||
        cl.extraDrawCondType !== "selfMovedThisTurn"
      ) {
        errors.push(`${id} ${seg.trigger}: self-moved extra draw misclassified`);
      }
    }

    if (/成功ライブカード置き場にカードが2枚以上/.test(plain) && /必要ハート/.test(plain)) {
      if (cl.template !== "live_start_need_heart_set_fixed" || cl.cardScoreGrant !== 5) {
        errors.push(`${id} ${seg.trigger}: need heart set + score5 misclassified`);
      }
      if (cl.filters?.minSuccessLiveCount !== 2) {
        errors.push(`${id} ${seg.trigger}: minSuccessLiveCount 2 missing`);
      }
    }

    if (/このメンバーと.*ほかの『Liella!』のメンバー1人は/.test(plain)) {
      if (cl.template !== "grant_jouji_session" || cl.grantToSelfAndOtherSeriesTag !== "Liella!") {
        errors.push(`${id} ${seg.trigger}: self+other Liella grant misclassified`);
      }
      if (cl.filters?.minEnergyCount !== 7) {
        errors.push(`${id} ${seg.trigger}: minEnergyCount 7 missing`);
      }
    }

    if (/エリアを移動したすべての『Liella!』のメンバー/.test(plain)) {
      if (cl.template !== "live_start_moved_members_blade_grant") {
        errors.push(`${id} ${seg.trigger}: moved Liella blade grant misclassified`);
      }
      if (cl.filters?.seriesTag !== "Liella!") {
        errors.push(`${id} ${seg.trigger}: Liella! series filter missing`);
      }
    }

    if (seg.trigger === "jouji" && /自分のステージにコスト13以上/.test(plain)) {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.minCost13OnAnyStage !== 13) {
        errors.push(`${id} jouji: minCost13OnOwnStage not parsed`);
      }
    }

    if (seg.trigger === "jouji" && /センター/.test(plain) && /ブレード/.test(plain)) {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule.stageAreas?.includes("center") || rule.bladeFlat !== 4) {
        errors.push(`${id} jouji: center blade4 not parsed`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} liella-sd2 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-liella-sd2-text OK");
