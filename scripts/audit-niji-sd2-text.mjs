#!/usr/bin/env node
/** 虹ヶ咲 sd2 cheer（PL!N-sd2）: カード文と分類の整合性監査 */
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

function isNijiSd2(id, card) {
  if (card.type === "エネルギー") return false;
  return /^PL!N-sd2-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isNijiSd2(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/成功ライブカード置き場に『/.test(plain) && /手札にあるこのメンバーカードのコスト/.test(plain)) {
        if (rule?.kind !== "hand_cost_reduce" || !rule.requiresSuccessLiveSeriesTag) {
          errors.push(`${id} jouji: hand_cost_reduce series condition missing`);
        }
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
    if (
      !abilityEffectIsAutomated(cl.template) &&
      cl.template !== "ability_sequence" &&
      cl.template !== "passive_track"
    ) {
      errors.push(`${id} ${seg.trigger}: template not automated ${cl.template}`);
    }

    if (/そのハートを([０-９\d]+)つ得る/.test(plain) && /好きなハートの色を1つ指定/.test(plain)) {
      const n = Number(String(plain.match(/そのハートを([０-９\d]+)つ得る/)[1]).replace(/[０-９]/g, (d) =>
        String("０１２３４５６７８９".indexOf(d)),
      ));
      if (cl.template === "heart_color_pick_grant" && cl.grantHeartSlotCount !== n) {
        errors.push(`${id} ${seg.trigger}: grantHeartSlotCount expected ${n} got ${cl.grantHeartSlotCount}`);
      }
    }

    if (
      /メンバー1人をウェイトにしてもよい：/.test(plain) &&
      /ライブ終了時まで/.test(plain) &&
      /ブレード/.test(plain + seg.text) &&
      !/そのメンバーは/.test(plain)
    ) {
      if (cl.grantToConditionalAreaMember === true) {
        errors.push(`${id} ${seg.trigger}: should grant to self, not waited member`);
      }
    }

    if (/相手もライブを成功している場合/.test(plain) && /さらにカードを.*引/.test(plain)) {
      if (
        cl.template !== "draw_then_conditional_extra_draw" ||
        cl.extraDrawCondType !== "opponentLiveSuccessThisTurn"
      ) {
        errors.push(`${id} ${seg.trigger}: opp-success conditional draw misclassified as ${cl.template}`);
      }
    }

    if (
      /を([０-９\d]+)つ以上持つ『/.test(plain) &&
      /\{\{[^}]*blade[^}]*\}\}/i.test(seg.text.split(/つ以上持つ/)[0] || "") &&
      /ライブ終了時まで/.test(plain) &&
      /heart_0/i.test(seg.text) &&
      /メンバー1人は/.test(plain)
    ) {
      const n = Number(
        String(plain.match(/を([０-９\d]+)つ以上持つ『/)[1]).replace(/[０-９]/g, (d) =>
          String("０１２３４５６７８９".indexOf(d)),
        ),
      );
      if (cl.bladeGain) {
        errors.push(`${id} ${seg.trigger}: condition blade must not set bladeGain (got ${cl.bladeGain})`);
      }
      if (cl.minPickedMemberBlade !== n) {
        errors.push(
          `${id} ${seg.trigger}: minPickedMemberBlade expected ${n} got ${cl.minPickedMemberBlade}`,
        );
      }
      if (!cl.requiredHeartSlot || !cl.grantHeartSlotCount) {
        errors.push(`${id} ${seg.trigger}: expected heart grant slots`);
      }
    }
  }
}

if (errors.length) {
  console.error("audit-niji-sd2-text FAILED:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("audit-niji-sd2-text: OK");
