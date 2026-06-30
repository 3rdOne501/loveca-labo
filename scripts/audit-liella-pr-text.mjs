#!/usr/bin/env node
/** Liella! PR（PL!SP-PR）: カード文と分類の整合性監査 */
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
import { applyPrCrossCuttingChecks } from "./lib/pr-audit-common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isLiellaPr(id) {
  return /^PL!SP-PR-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isLiellaPr(id)) continue;
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

    if (/これによりライブカードを控え室に置いた場合/.test(plain) && seg.trigger === "live_start") {
      const steps = (cl.steps || []).map((s) => s.template);
      if (cl.template !== "ability_sequence" || !steps.includes("followup_draw_if_live_discarded")) {
        errors.push(`${id} live_start: live-discard followup draw miscomposed`);
      }
      if (!cl.handDiscardToWaiting) {
        errors.push(`${id} live_start: optional hand discard cost missing on sequence`);
      }
    }

    if (/エネルギーが7枚以上/.test(plain) && seg.trigger === "toujyou") {
      if (cl.filters?.minEnergyCount !== 7) {
        errors.push(`${id} toujyou: energy7 precondition missing`);
      }
    }

    if (/コスト2以下のメンバーカードか、スコア２以下のライブカード/.test(plain)) {
      if (!cl.filters?.pickFilterAlternatives || cl.filters.pickFilterAlternatives.length !== 2) {
        errors.push(`${id} ${seg.trigger}: member-or-live yell pick misclassified`);
      }
    }

    if (/『Liella!』のカードが7枚以上/.test(plain)) {
      if (
        cl.template !== "yell_resolution_count_energy_wait" ||
        cl.filters?.seriesTag !== "Liella!" ||
        cl.minResolutionCards !== 7
      ) {
        errors.push(`${id} live_success: liella yell 7+ energy misclassified`);
      }
    }

    if (/コストが低いメンバーからバトンタッチ/.test(plain)) {
      if (!cl.requiresBatonFromLowerCostMember) {
        errors.push(`${id} toujyou: lower-cost baton requirement missing`);
      }
    }

    if (/ステージにメンバーが合計6人/.test(plain) && seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (rule.minTotalMembersBothStages !== 6) {
        errors.push(`${id} jouji: both-stage 6 members not parsed`);
      }
    }

    if (/ハートが合計5つ以上/.test(plain) && /相手のステージ/.test(plain)) {
      if (cl.template !== "live_start_opp_wait_if_stage_hearts" || cl.minStageHeartTotal !== 5) {
        errors.push(`${id} live_start: stage hearts opp wait misclassified`);
      }
    }

    applyPrCrossCuttingChecks(id, seg, plain, cl, errors);
  }
}

if (errors.length) {
  console.error("AUDIT FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PL!SP-PR audit OK");
