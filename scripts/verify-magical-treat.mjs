#!/usr/bin/env node
/** ブースターパック まじかる♡とり～と（bp8）分類スナップショット回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

const PRODUCT = "ブースターパック まじかる♡とり～と";

/** @type {Array<{id:string, trigger:string, expectTemplate:string, hint?:string}>} */
const CASES = [
  {
    "id": "LL-bp8-001-R＋",
    "trigger": "toujyou",
    "expectTemplate": "deck_top_to_waiting",
    "hint": ""
  },
  {
    "id": "LL-bp8-001-R＋",
    "trigger": "live_success",
    "expectTemplate": "deck_top_peek_optional_wait",
    "hint": ""
  },
  {
    "id": "LL-bp8-001-R＋",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": ""
  },
  {
    "id": "LL-bp8-001-R＋",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp3-026-SECL",
    "trigger": "live_start",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!-bp3-026-SECL",
    "trigger": "live_success",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!-bp8-001-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:blade_conditional",
    "hint": ""
  },
  {
    "id": "PL!-bp8-002-P",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp8-003-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": ""
  },
  {
    "id": "PL!-bp8-003-P",
    "trigger": "kidou",
    "expectTemplate": "deck_top_pick_recover",
    "hint": ""
  },
  {
    "id": "PL!-bp8-004-P",
    "trigger": "kidou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp8-005-P",
    "trigger": "jidou",
    "expectTemplate": "jidou_leave_stage_hand_pick_recover",
    "hint": ""
  },
  {
    "id": "PL!-bp8-005-P",
    "trigger": "live_start",
    "expectTemplate": "live_start_yell_blade_remap_slot",
    "hint": ""
  },
  {
    "id": "PL!-bp8-006-P",
    "trigger": "kidou",
    "expectTemplate": "kidou_wait_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!-bp8-007-P",
    "trigger": "toujyou",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!-bp8-008-P",
    "trigger": "live_success",
    "expectTemplate": "yell_resolution_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!-bp8-009-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:blade_conditional",
    "hint": ""
  },
  {
    "id": "PL!-bp8-009-P",
    "trigger": "kidou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp8-010-N",
    "trigger": "kidou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp8-011-N",
    "trigger": "live_start",
    "expectTemplate": "optional_self_wait_opp_stage",
    "hint": ""
  },
  {
    "id": "PL!-bp8-012-N",
    "trigger": "kidou",
    "expectTemplate": "kidou_hand_cost_wait_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!-bp8-013-N",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": ""
  },
  {
    "id": "PL!-bp8-014-N",
    "trigger": "toujyou",
    "expectTemplate": "draw_from_deck",
    "hint": ""
  },
  {
    "id": "PL!-bp8-015-N",
    "trigger": "live_success",
    "expectTemplate": "draw_then_hand_discard",
    "hint": ""
  },
  {
    "id": "PL!-bp8-017-N",
    "trigger": "toujyou",
    "expectTemplate": "deck_top_pick_recover",
    "hint": ""
  },
  {
    "id": "PL!-bp8-018-N",
    "trigger": "live_start",
    "expectTemplate": "optional_energy_blade_until_live_end",
    "hint": ""
  },
  {
    "id": "PL!-bp8-019-L",
    "trigger": "live_start",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!-bp8-020-L",
    "trigger": "live_start",
    "expectTemplate": "live_start_opp_wait_max_cost",
    "hint": ""
  },
  {
    "id": "PL!-bp8-021-L",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp8-022-L",
    "trigger": "live_success",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!-bp8-023-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!-bp8-023-L",
    "trigger": "live_success",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!-bp8-024-L",
    "trigger": "live_start",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!-bp8-025-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp5-020-SECL",
    "trigger": "live_start",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-001-P",
    "trigger": "toujyou",
    "expectTemplate": "activate_energy",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-001-P",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-002-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:blade_conditional",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-002-P",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-003-P",
    "trigger": "toujyou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-003-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:blade_conditional",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-004-P",
    "trigger": "toujyou",
    "expectTemplate": "draw_from_deck",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-004-P",
    "trigger": "kidou",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-005-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-005-P",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-006-P",
    "trigger": "toujyou",
    "expectTemplate": "ability_pick_one",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-007-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-007-P",
    "trigger": "toujyou",
    "expectTemplate": "deck_top_pick_recover",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-008-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-008-P",
    "trigger": "kidou",
    "expectTemplate": "kidou_self_to_wait_recover",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-009-N",
    "trigger": "toujyou",
    "expectTemplate": "toujou_optional_wait_to_deck_top",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-010-N",
    "trigger": "live_start",
    "expectTemplate": "toujou_wait_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-011-N",
    "trigger": "toujyou",
    "expectTemplate": "toujou_wait_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-012-N",
    "trigger": "toujyou",
    "expectTemplate": "ability_sequence",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-013-N",
    "trigger": "live_start",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-014-N",
    "trigger": "toujyou",
    "expectTemplate": "draw_from_deck",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-014-N",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-015-N",
    "trigger": "toujyou",
    "expectTemplate": "deck_top_look_reorder",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-016-N",
    "trigger": "live_success",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-017-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-018-L",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-019-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": "支払ってもよい：自分の控え室にあるすべてのコスト9以下のメンバーカードをシャッフ"
  },
  {
    "id": "PL!HS-bp8-019-L",
    "trigger": "live_start",
    "expectTemplate": "live_card_score_plus",
    "hint": "自分のステージに『スリーズブーケ』のメンバーがおり、かつ自分のデッキにカードが3"
  },
  {
    "id": "PL!HS-bp8-020-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": "メンバー2人をウェイトにしてもよい：このカードの必要ハートを減らす。これによりウ"
  },
  {
    "id": "PL!HS-bp8-020-L",
    "trigger": "live_start",
    "expectTemplate": "live_card_score_plus",
    "hint": "ライブ終了時まで、『DOLLCHESTRA』のメンバー1人のコストを＋５する。そ"
  },
  {
    "id": "PL!HS-bp8-021-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-022-L",
    "trigger": "live_start",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-022-L",
    "trigger": "live_success",
    "expectTemplate": "live_success_recover_from_waiting",
    "hint": ""
  },
  {
    "id": "PL!HS-bp8-023-L",
    "trigger": "live_start",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!N-bp3-030-SECL",
    "trigger": "live_success",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-001-P",
    "trigger": "toujyou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-001-P",
    "trigger": "live_success",
    "expectTemplate": "draw_then_hand_discard",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-002-P",
    "trigger": "kidou",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-003-P",
    "trigger": "live_success",
    "expectTemplate": "deck_top_pick_recover",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-004-P",
    "trigger": "kidou",
    "expectTemplate": "kidou_hand_cost_wait_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-004-P",
    "trigger": "live_start",
    "expectTemplate": "heart_color_pick_grant",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-005-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:unclassified",
    "hint": "手札にあるこのメンバーカードのコストは、自分のエネルギーデッキのカード1枚につき"
  },
  {
    "id": "PL!N-bp8-005-P",
    "trigger": "jouji",
    "expectTemplate": "jouji:blade_conditional",
    "hint": "自分のステージにいるすべての『虹ヶ咲』のメンバーと相手のステージにいるすべてのメ"
  },
  {
    "id": "PL!N-bp8-005-P",
    "trigger": "kidou",
    "expectTemplate": "kidou_energy_under_pick_waiting_hand",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-006-P",
    "trigger": "toujyou",
    "expectTemplate": "deck_top_pick_recover",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-007-P",
    "trigger": "live_start",
    "expectTemplate": "heart_color_pick_grant",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-008-P",
    "trigger": "kidou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-009-P",
    "trigger": "kidou",
    "expectTemplate": "draw_from_deck",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-009-P",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-010-P",
    "trigger": "live_success",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-011-P",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-011-P",
    "trigger": "live_success",
    "expectTemplate": "deck_top_to_waiting",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-012-P",
    "trigger": "live_success",
    "expectTemplate": "draw_from_deck",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-014-N",
    "trigger": "live_start",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-016-N",
    "trigger": "toujyou",
    "expectTemplate": "optional_self_wait_opp_stage",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-017-N",
    "trigger": "kidou",
    "expectTemplate": "kidou_stage_wait_pick_hand",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-018-N",
    "trigger": "live_start",
    "expectTemplate": "live_start_opp_wait_max_cost",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-019-N",
    "trigger": "live_start",
    "expectTemplate": "heart_color_pick_grant",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-021-N",
    "trigger": "kidou",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-022-N",
    "trigger": "jouji",
    "expectTemplate": "jouji:blade_conditional",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-023-N",
    "trigger": "live_start",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-024-N",
    "trigger": "jidou",
    "expectTemplate": "jidou_leave_baton_partner_energy_under",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-025-L",
    "trigger": "live_success",
    "expectTemplate": "draw_from_deck",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-026-L",
    "trigger": "live_start",
    "expectTemplate": "live_card_score_plus",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-027-L",
    "trigger": "live_success",
    "expectTemplate": "live_success_pick_options",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-028-L",
    "trigger": "live_start",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-029-L",
    "trigger": "live_success",
    "expectTemplate": "guided_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-030-L",
    "trigger": "jidou",
    "expectTemplate": "jidou_manual",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-030-L",
    "trigger": "live_success",
    "expectTemplate": "deck_top_to_waiting",
    "hint": ""
  },
  {
    "id": "PL!N-bp8-031-L",
    "trigger": "live_success",
    "expectTemplate": "grant_jouji_session",
    "hint": ""
  }
];

let failed = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const segs = splitAbilityByTriggers(cardAbilityRawText(card));
  const seg = c.hint
    ? segs.find((s) => s.trigger === c.trigger && s.text.replace(/\{\{[^}]+\}\}/g, "").includes(c.hint))
    : segs.find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger, c.hint || "");
    failed++;
    continue;
  }
  let actual;
  if (c.trigger === "jouji") {
    const rule = classifyJoujiSegment(seg.text);
    actual = rule ? `jouji:${rule.kind}` : "jouji:unclassified";
  } else if (c.trigger === "jidou") {
    actual = (classifyJidouAutoSegment(seg.text, card) || { template: "jidou_manual" }).template;
  } else {
    actual = classifyCardAbility(card, c.trigger, seg.text).template;
  }
  if (actual !== c.expectTemplate) {
    failed++;
    console.error("FAIL", c.id, c.trigger, `expected ${c.expectTemplate} got ${actual}`);
  } else {
    console.log("OK", c.id, c.trigger, actual);
  }
}

if (failed) {
  console.error(`\nverify-magical-treat: ${failed} failed / ${CASES.length}`);
  process.exit(1);
}
console.log(`\nverify-magical-treat: ${CASES.length} OK (product=${PRODUCT})`);
