#!/usr/bin/env node
/** Liella! bp7 / MELLOWMOMENT（PL!SP-bp7）: カード文と分類の整合性監査（メンバー中心） */
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

function isLiellaBp7(id, card) {
  if (card.type === "エネルギー") return false;
  return /^PL!SP-bp7-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isLiellaBp7(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/エネルギーが\d+枚以上あり、かつ/.test(plain) && /コストを/.test(plain)) {
        if (rule?.kind !== "stage_cost_plus" || rule.minEnergy == null || !rule.opponentMoreEnergy) {
          errors.push(`${id} jouji: stage_cost_plus conditions missing`);
        }
      }
      if (/下に置かれているメンバーカード1枚につき/.test(plain)) {
        if (rule?.kind !== "blade_per_member_under") {
          errors.push(`${id} jouji: blade_per_member_under misclassified (${rule?.kind})`);
        }
      }
      if (/下にメンバーカードが\d+枚以上/.test(plain) && /スコア/.test(plain)) {
        if (rule?.kind !== "live_score_plus" || rule.minMemberCardsUnder == null) {
          errors.push(`${id} jouji: minMemberCardsUnder missing`);
        }
      }
      if (/『[^』]+』のメンバーが\d+人いるかぎり/.test(plain)) {
        if (rule?.minStageSeriesMembers == null) {
          errors.push(`${id} jouji: minStageSeriesMembers missing`);
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

    if (/コストが10か20のメンバーカードを1枚公開/.test(plain) && /下に置く/.test(plain)) {
      const step0 = cl.template === "ability_sequence" ? cl.steps?.[0] : cl;
      const costs = step0?.filters?.costsAnyOf || cl.filters?.costsAnyOf;
      if (!costs || costs.join() !== "10,20") {
        errors.push(`${id} kidou: costsAnyOf 10|20 missing (${cl.template})`);
      }
    }

    if (
      /控え室から『[^』]+』のメンバーカード\d+枚/.test(plain) &&
      /デッキの一番下に置いてもよい/.test(plain) &&
      /ブレードハートを持たない/.test(plain) &&
      /ライブ終了時まで/.test(plain)
    ) {
      if (cl.template !== "waiting_to_deck_bottom_blade_if_moved_no_bh") {
        errors.push(`${id} live_start: blade-if-moved-no-bh misclassified as ${cl.template}`);
      }
    }

    if (/このターン、自分のエネルギーがエネルギー置き場からエネルギーデッキに置かれていた場合/.test(plain)) {
      if (!cl.requiresEnergyReturnedToDeckThisTurn) {
        errors.push(`${id} ${seg.trigger}: requiresEnergyReturnedToDeckThisTurn missing`);
      }
      if (cl.stageArea !== "center" && /\{\{center/.test(seg.text)) {
        errors.push(`${id} ${seg.trigger}: center stageArea missing`);
      }
    }

    if (
      /ステージから控え室に置く/.test(plain) &&
      /エネルギーデッキに置く/.test(plain) &&
      /その後、自分の控え室からカードを1枚手札/.test(plain)
    ) {
      if (!cl.energyToDeckCount || !cl.pickAny) {
        errors.push(`${id} kidou: energyToDeckCount/pickAny missing`);
      }
    }

    if (/手札をすべて控え室に置いてもよい/.test(plain) && /カードを\d+枚引/.test(plain)) {
      if (!cl.costHandDiscardAll) {
        errors.push(`${id} ${seg.trigger}: costHandDiscardAll missing`);
      }
    }

    if (
      /手札のライブカードを1枚控え室に置いてもよい/.test(plain) &&
      /デッキの上からカードを\d+枚見る/.test(plain)
    ) {
      if (cl.costHandDiscardPickType !== "ライブ" || cl.handDiscardToWaiting !== 1) {
        errors.push(`${id} ${seg.trigger}: live hand discard cost missing`);
      }
      if (cl.filters?.pickType === "ライブ") {
        errors.push(`${id} ${seg.trigger}: deck pick wrongly restricted to live`);
      }
    }

    if (
      /ステージに『[^』]+』のメンバーが\d+人以上いる場合/.test(plain) &&
      /控え室からライブカードを1枚手札/.test(plain)
    ) {
      if (cl.filters?.seriesTag != null) {
        errors.push(`${id} ${seg.trigger}: recover seriesTag should be null`);
      }
      if (cl.filters?.minStageSeriesMembersTag == null) {
        errors.push(`${id} ${seg.trigger}: minStageSeriesMembersTag missing`);
      }
    }

    if (/エネルギーが相手より(\d+)枚以上多い場合/.test(plain) && /このカードのスコアを/.test(plain)) {
      if (cl.minEnergyAdvantageOverOpponent == null) {
        errors.push(`${id} ${seg.trigger}: minEnergyAdvantageOverOpponent missing`);
      }
    }

    if (
      /控え室にある『[^』]+』のメンバーカードを\d+枚選び/.test(plain) &&
      /シャッフルし、デッキの一番下に置いてもよい/.test(plain) &&
      /そうしたとき/.test(plain)
    ) {
      if (cl.template !== "live_start_optional_waiting_shuffle_deck_bottom_grant") {
        errors.push(`${id} live_start: waiting-shuffle-grant misclassified as ${cl.template}`);
      }
    }

    if (/公開された自分のカードがすべて『([^』]+)』の場合/.test(plain) && /このカードのスコアを/.test(plain)) {
      if (!cl.requiresYellRevealedAllSeriesTag) {
        errors.push(`${id} ${seg.trigger}: requiresYellRevealedAllSeriesTag missing`);
      }
    }
  }
}

if (errors.length) {
  console.error("audit-liella-bp7-text FAILED:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("audit-liella-bp7-text: OK");
