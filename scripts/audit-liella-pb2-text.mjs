#!/usr/bin/env node
/** Liella! pb2（PL!SP-pb2）: カード文と分類の整合性監査 */
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

function isLiellaPb2(id, card) {
  return /-pb2-/.test(id) && ((card.series || "").includes("スーパースター") || id.startsWith("PL!SP-pb2"));
}

function cardNum(id) {
  const m = id.match(/pb2-(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort(
  (a, b) => cardNum(a[0]) - cardNum(b[0]) || a[0].localeCompare(b[0]),
)) {
  if (!isLiellaPb2(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const jr = classifyJoujiSegment(seg.text);
      if (jr.template === "jouji_manual") errors.push(`${id} jouji: manual`);
      if (/ライブ開始時.*発動しない/.test(plain) && jr.kind !== "block_stage_member_live_start") {
        errors.push(`${id} jouji: expected block_stage_member_live_start`);
      }
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

    if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
      if (cl.template === "deck_top_to_waiting") {
        errors.push(`${id} ${seg.trigger}: deck_top_to_waiting misclass (hand recover)`);
      }
    }

    if (/元々持つブレード/.test(plain) && cl.template === "optional_pick_member_wait_opp_blade_gap") {
      if (cl.oppBladeGapMin == null) errors.push(`${id} ${seg.trigger}: oppBladeGapMin missing`);
    }

    if (cl.template === "draw_from_deck" && /このカードのスコア/.test(plain)) {
      errors.push(`${id} ${seg.trigger}: draw_from_deck misclass for score effect`);
    }

    if (
      /名前の異なる『[^』]+』のメンバー1人につき/.test(plain) &&
      /必要ハート/.test(plain) &&
      /減らし/.test(plain) &&
      /増やす/.test(plain) &&
      cl.template !== "live_start_distinct_series_need_heart_shift_score"
    ) {
      errors.push(`${id} ${seg.trigger}: need_heart_shift_score misclass`);
    }

    if (
      /メンバーが『[^』]+』のみ/.test(plain) &&
      /相手のステージ/.test(plain) &&
      /ウェイト/.test(plain) &&
      cl.template !== "live_start_opp_wait_max_cost"
    ) {
      errors.push(`${id} ${seg.trigger}: stage-only-series opp wait misclass`);
    }

    if (
      seg.trigger === "live_success" &&
      /ライブ開始時.*能力を持つメンバーがいる/.test(plain) &&
      /このカードのスコア/.test(plain) &&
      cl.template !== "live_success_score_if_stage_live_start_member"
    ) {
      errors.push(`${id} live_success: ls-member score misclass`);
    }

    if (
      seg.trigger === "live_success" &&
      /元々のスコアより高いスコアのライブカードがある/.test(plain) &&
      /エールにより公開/.test(plain) &&
      cl.template === "draw_from_deck" &&
      !cl.drawOrPreconditions
    ) {
      errors.push(`${id} live_success: drawOrPreconditions missing for buffed-live OR yell draw`);
    }

    if (id === "PL!SP-pb2-049-L" && seg.trigger === "live_success") {
      const full = classifyCardAbility(card, "live_success", null);
      if (full.template !== "ability_sequence" || (full.steps || []).length < 2) {
        errors.push(`${id} live_success: expected ability_sequence composite`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} liella-pb2 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-liella-pb2-text OK");
