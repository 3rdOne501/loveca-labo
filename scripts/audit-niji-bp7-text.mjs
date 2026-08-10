#!/usr/bin/env node
/** 虹ヶ咲 bp7 / MELLOWMOMENT（PL!N-bp7）: カード文と分類の整合性監査（メンバー中心・ライブも走査） */
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

function isNijiBp7(id, card) {
  if (card.type === "エネルギー") return false;
  return /^PL!N-bp7-\d{3}-/.test(id);
}

/** @type {string[]} */
const errors = [];

for (const [id, card] of Object.entries(cards).sort()) {
  if (!isNijiBp7(id, card)) continue;
  const raw = cardAbilityRawText(card);
  if (!raw || !raw.trim()) continue;

  for (const seg of splitAbilityByTriggers(raw)) {
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    if (seg.trigger === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      if (!rule) errors.push(`${id} jouji: unclassified`);
      if (/下にあるエネルギーカード1枚につき/.test(plain) && /heart_0?\d/i.test(seg.text)) {
        if (rule?.kind !== "heart_per_energy_below") {
          errors.push(`${id} jouji: heart_per_energy_below misclassified (${rule?.kind})`);
        }
      }
      if (/エネルギーが\d+枚より多い/.test(plain) && /差に等しい/.test(plain)) {
        if (rule?.kind !== "heart_per_energy_above") {
          errors.push(`${id} jouji: heart_per_energy_above misclassified (${rule?.kind})`);
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

    if (
      /デッキの上からカードを\d+枚控え室に置く/.test(plain) &&
      /このメンバーの下に置く/.test(plain) &&
      /元々持つハートは/.test(plain) &&
      /同じになる/.test(plain)
    ) {
      if (cl.template !== "kidou_mill_waiting_under_copy_printed_hearts") {
        errors.push(`${id} kidou: mill-under-copy-hearts misclassified as ${cl.template}`);
      }
    }

    if (/下に置かれている名前の異なるメンバーカード1枚につき/.test(plain)) {
      if (!cl.bladePerDistinctNameUnder) {
        errors.push(`${id} live_start: bladePerDistinctNameUnder missing`);
      }
    }

    if (
      /これにより控え室に置いたカードの中に/.test(plain) &&
      /以下から1つを選ぶ/.test(plain)
    ) {
      if (cl.template !== "deck_mill_conditional_pick_one") {
        errors.push(`${id} kidou: mill conditional pick-one misclassified as ${cl.template}`);
      }
    }

    if (
      /控え室からブレードハートを持たないメンバーカードを/.test(plain) &&
      /デッキの下に置いてもよい/.test(plain) &&
      /1枚につき/.test(plain) &&
      /アクティブ/.test(plain)
    ) {
      if (cl.template !== "waiting_to_deck_bottom_activate_per") {
        errors.push(`${id} toujyou: waiting activate-per misclassified as ${cl.template}`);
      }
    }

    if (/自分と相手はそれぞれ/.test(plain) && /デッキの上から/.test(plain) && /控え室/.test(plain)) {
      if (cl.template !== "deck_top_to_waiting" || !cl.millBothPlayers) {
        errors.push(`${id} toujyou: millBothPlayers missing (${cl.template})`);
      }
    }

    if (
      /メンバー1人をウェイトにしてもよい/.test(plain) &&
      /好きなハートの色を1つ指定/.test(plain)
    ) {
      if (cl.template !== "heart_color_pick_grant" || !cl.costPickMemberWait) {
        errors.push(`${id} live_start: wait+heart color misclassified as ${cl.template}`);
      }
    }

    if (/名前の異なる『[^』]+』のメンバーが\d+人いる/.test(plain) && !/以上/.test(plain.match(/名前の異なる『[^』]+』のメンバーが\d+人いる[^。]*/)?.[0] || "")) {
      if (cl.filters?.minDistinctSeriesMemberNames == null) {
        errors.push(`${id} ${seg.trigger}: minDistinctSeriesMemberNames missing for 人いる`);
      }
    }

    if (
      /ステージに『[^』]+』のメンバーが\d+人いる/.test(plain) &&
      !/名前の異なる/.test(plain) &&
      !/以上/.test(plain.match(/ステージに『[^』]+』のメンバーが\d+人いる[^。]*/)?.[0] || "")
    ) {
      if (cl.filters?.minStageSeriesMembers == null) {
        errors.push(`${id} ${seg.trigger}: minStageSeriesMembers missing for 人いる`);
      }
    }

    if (
      /ブレードハートを持たない『[^』]+』のメンバーカードを1枚公開して手札に加えてもよい/.test(plain)
    ) {
      if (!cl.filters?.requiresNoBladeHeart) {
        errors.push(`${id} ${seg.trigger}: requiresNoBladeHeart missing`);
      }
    }

    if (
      /デッキの上からカードを\d+枚控え室に置く/.test(plain) &&
      /ブレードハートの色がある場合/.test(plain) &&
      /ライブ終了時まで/.test(plain)
    ) {
      if (
        cl.template !== "deck_mill_conditional_grant" ||
        cl.millRequireDistinctBladeHeartColors == null
      ) {
        errors.push(`${id} ${seg.trigger}: mill BH-color grant misclassified as ${cl.template}`);
      }
    }

    if (
      /エールにより公開された自分のカードの中に/.test(plain) &&
      /種類以上ある場合/.test(plain) &&
      /このカードのスコアを/.test(plain)
    ) {
      if (cl.filters?.minYellRevealedHeartColorKinds == null) {
        errors.push(`${id} ${seg.trigger}: minYellRevealedHeartColorKinds missing`);
      }
    }

    if (
      /手札を\d+枚まで控え室に置いてもよい/.test(plain) &&
      /枚数に等しい数まで選ぶ/.test(plain) &&
      /ブレード/.test(plain + seg.text)
    ) {
      if (cl.template !== "live_start_hand_discard_optional_blade_pick_equal") {
        errors.push(`${id} ${seg.trigger}: hand-discard blade-pick misclassified as ${cl.template}`);
      }
    }

    if (
      /エールにより公開された自分のカードの中に/.test(plain) &&
      /ブレードハートを持たないメンバーカードが\d+枚以上/.test(plain)
    ) {
      if (cl.filters?.minYellRevealedNoBladeHeartMembers == null) {
        errors.push(`${id} ${seg.trigger}: minYellRevealedNoBladeHeartMembers missing`);
      }
    }

    if (/ほかのすべてのメンバーより多くの/.test(plain) && /ブレード/.test(plain + seg.text)) {
      if (!cl.requiresStrictlyMostBladesBothStages) {
        errors.push(`${id} ${seg.trigger}: requiresStrictlyMostBladesBothStages missing`);
      }
    }

    if (
      /控え室にあるすべてのカードをシャッフルし、デッキの下に置いてもよい/.test(plain) &&
      /そうしたとき/.test(plain)
    ) {
      if (cl.template !== "live_start_optional_shuffle_all_waiting_grant") {
        errors.push(`${id} ${seg.trigger}: shuffle-all-waiting grant misclassified as ${cl.template}`);
      }
    }

    if (
      /下にあるすべてのエネルギーカードを、自分のエネルギー置き場にウェイト状態で置いてもよい/.test(
        plain,
      )
    ) {
      if (cl.template !== "live_success_under_energy_to_area_score") {
        errors.push(`${id} ${seg.trigger}: under-energy-to-area score misclassified as ${cl.template}`);
      }
    }
  }
}

if (errors.length) {
  console.error("audit-niji-bp7-text FAILED:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log("audit-niji-bp7-text: OK");
