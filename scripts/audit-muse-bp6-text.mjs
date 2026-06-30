#!/usr/bin/env node
/** μ's bp6 / RoyalHoliday（PL!-bp6）メンバー: カード文と分類の整合性監査 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function isMuseBp6Member(id, card) {
  return /^PL!-bp6-\d{3}-/.test(id) && card.type === "メンバー";
}

function isMuseBp6Live(id, card) {
  return /^PL!-bp6-0(19|2[0-4])-L$/.test(id) && card.type === "ライブ";
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards)) {
  if (!isMuseBp6Member(id, card) && !isMuseBp6Live(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/成功ライブカード置き場に『/.test(plain) && !rule?.requiresSuccessLiveSeriesTag) {
        errors.push(`${id} jouji: missing successLive series condition`);
      }
      if (/右サイドエリアと左サイドエリア/.test(plain) && rule?.leftRightSideExactPrintedBlade == null) {
        errors.push(`${id} jouji: missing side blade condition`);
      }
      if (/ライブカードの必要ハート/.test(plain) && /減らす/.test(plain) && rule?.kind !== "success_live_live_need_heart_reduce") {
        errors.push(`${id} jouji: misclass live need heart reduce`);
      }
      continue;
    }
    if (seg.trigger === "jidou") {
      const jcl = classifyJidouAutoSegment(seg.text);
      if (!jcl || jcl.template === "jidou_manual") errors.push(`${id} jidou: unclassified`);
      if (/ライブ開始時.*能力が解決/.test(plain) && jcl?.resolvedAbilityKind !== "live_start") {
        errors.push(`${id} jidou: missing live_start resolvedAbilityKind`);
      }
      if (/ライブ成功時.*能力が解決/.test(plain) && jcl?.resolvedAbilityKind !== "live_success") {
        errors.push(`${id} jidou: missing live_success resolvedAbilityKind`);
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

    if (
      /エールにより公開/.test(plain) &&
      /ブレードハートを持たない/.test(plain) &&
      cl.template === "draw_then_hand_discard" &&
      !cl.filters?.requiresYellRevealedNoBladeHeartMember
    ) {
      errors.push(`${id} ${seg.trigger}: missing yell nobh precondition`);
    }

    if (/ライブカード置き場に『/.test(plain) && cl.template === "grant_jouji_session") {
      if (cl.filters?.minLiveFrameCount == null) {
        errors.push(`${id} ${seg.trigger}: missing live frame series precondition`);
      }
    }

    if (
      /デッキの上からカードを5枚公開/.test(plain) &&
      /指定した色/.test(plain) &&
      cl.template === "heart_color_pick_grant"
    ) {
      errors.push(`${id} ${seg.trigger}: heart_color misclass for deck reveal`);
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} muse-bp6 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-muse-bp6-text OK");
