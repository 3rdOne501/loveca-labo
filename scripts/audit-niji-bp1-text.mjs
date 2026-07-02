#!/usr/bin/env node
/** 虹ヶ咲 bp1: カード文と分類の整合性監査（横展開修正の入力） */
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
import { auditCommonAbilityPatterns } from "./audit-common-patterns.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @param {string} id @param {object} card */
function isNijiBp1(id, card) {
  return /-bp1-/.test(id) && (card.series || "").includes("虹ヶ咲");
}

function cardNum(id) {
  const m = id.match(/bp1-(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort(
  (a, b) => cardNum(a[0]) - cardNum(b[0]) || a[0].localeCompare(b[0]),
)) {
  if (!isNijiBp1(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    let cl;
    if (seg.trigger === "jouji") {
      const jr = classifyJoujiSegment(seg.text);
      if (jr.template === "jouji_manual") errors.push(`${id} jouji: manual`);
      continue;
    }
    if (!seg.trigger) continue;
    cl = classifyCardAbility(card, seg.trigger, seg.text);

    if (!cl.template || cl.template === "none" || cl.template === "guided_manual") {
      errors.push(`${id} ${seg.trigger}: not automated (${cl.template})`);
      continue;
    }
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    const enM = plain.match(/エネルギーを(\d+)枚アクティブにする/);
    if (enM && cl.template === "activate_energy") {
      const want = Number(enM[1]) || 1;
      if ((cl.energyActiveCount || 1) !== want) {
        errors.push(`${id} ${seg.trigger}: energyActiveCount want ${want} got ${cl.energyActiveCount || 1}`);
      }
    }

    if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
      if (cl.template === "deck_top_to_waiting") {
        errors.push(`${id} ${seg.trigger}: deck_top_to_waiting misclass (hand recover)`);
      }
    }

    if (cl.template === "deck_top_pick_recover") {
      const maxM =
        plain.match(/(\d+)枚まで(?:公開して)?手札に加/) ||
        (plain.match(/その中から1枚を手札に加え/) ? ["", "1"] : null);
      if (maxM && Number(maxM[1] || 1) > 1 && cl.deckTopPickMax !== Number(maxM[1])) {
        errors.push(`${id} ${seg.trigger}: deckTopPickMax want ${maxM[1]} got ${cl.deckTopPickMax}`);
      }
    }

    if (/手札を(\d+)枚控え室/.test(plain.split("：")[0] || plain)) {
      const costPart = plain.split(/：|:/)[0] || "";
      const hm = costPart.match(/手札を(\d+)枚控え室/);
      if (hm && cl.handDiscardToWaiting !== Number(hm[1])) {
        if (
          !cl.steps &&
          cl.template !== "live_start_hand_named_discard_grant_jouji" &&
          cl.template !== "draw_then_hand_discard"
        ) {
          errors.push(
            `${id} ${seg.trigger}: handDiscardToWaiting want ${hm[1]} got ${cl.handDiscardToWaiting}`,
          );
        }
      }
    }

    if (/このターン.*ステージに.*登場している/.test(plain) || /ステージに.*が登場している場合/.test(plain)) {
      if (cl.template === "activate_energy" && !cl.requiresSeriesOnStage && !cl.filters?.seriesTag) {
        errors.push(`${id} ${seg.trigger}: missing series-on-stage condition`);
      }
    }

    if (cl.template === "ability_sequence") {
      const steps = cl.steps || [];
      if (!steps.length) errors.push(`${id} toujyou: ability_sequence empty steps`);
    }

    if (cl.template === "grant_jouji_session" && /手札を1枚控え室/.test(plain.split("：")[0] || "")) {
      if (!/ライブ終了時まで/.test(plain)) {
        errors.push(`${id} ${seg.trigger}: grant_jouji hand cost unhandled pattern`);
      }
    }

    errors.push(...auditCommonAbilityPatterns({ id, trigger: seg.trigger, plain, cl }));
  }
}

if (errors.length) {
  console.error(`${errors.length} niji-bp1 issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log("audit-niji-bp1-text OK");
