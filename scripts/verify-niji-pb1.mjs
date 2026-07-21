#!/usr/bin/env node
/** 虹ヶ咲 pb1（PL!N-pb1）メンバー・ライブ代表カードの分類回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, jidou?:boolean, segIndex?:number, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!N-pb1-001-R",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check(cl) {
      const errs = [];
      if (cl.filters?.minExactCostMemberOnStage !== 11) errs.push("minExactCostMemberOnStage");
      if (!cl.filters?.excludeSelfFromStageCostCheck) errs.push("excludeSelf");
      return errs;
    },
  },
  { id: "PL!N-pb1-001-R", trigger: "jouji", jouji: true, expectTemplate: "blade_conditional" },
  { id: "PL!N-pb1-002-R", trigger: "toujyou", expectTemplate: "toujou_optional_energy_under" },
  { id: "PL!N-pb1-002-R", trigger: "jouji", jouji: true, expectTemplate: "live_score_if_energy_below" },
  { id: "PL!N-pb1-003-R", trigger: "kidou", expectTemplate: "kidou_discard_self_draw_grant" },
  { id: "PL!N-pb1-004-R", trigger: "jouji", jouji: true, expectTemplate: "blade_conditional" },
  { id: "PL!N-pb1-004-R", trigger: "live_start", expectTemplate: "live_start_position_change" },
  { id: "PL!N-pb1-005-R", trigger: "jidou", jidou: true, expectTemplate: "jidou_on_cost_enter_draw" },
  { id: "PL!N-pb1-006-R", trigger: "kidou", expectTemplate: "activate_energy" },
  { id: "PL!N-pb1-007-R", trigger: "jouji", jouji: true, expectTemplate: "blade_if_live_need_all_colors" },
  { id: "PL!N-pb1-008-R", trigger: "jouji", jouji: true, expectTemplate: "hand_cost_reduce_if_wait_series_on_stage" },
  { id: "PL!N-pb1-008-R", trigger: "toujyou", expectTemplate: "toujou_pick_member_or_energy" },
  {
    id: "PL!N-pb1-009-R",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check(cl) {
      const errs = [];
      if (cl.deckDrawCount !== 1) errs.push("deckDrawCount");
      if (!cl.requiresNoBhMemberFromLiveFrameToWaitingThisTurn) errs.push("noBhLiveFrame");
      if (!cl.grantHeartSlotMap?.heart03 || !cl.grantHeartSlotMap?.heart05 || !cl.grantHeartSlotMap?.heart06) {
        errs.push("grantHeartSlotMap");
      }
      return errs;
    },
  },
  { id: "PL!N-pb1-010-R", trigger: "toujyou", expectTemplate: "ability_pick_one" },
  { id: "PL!N-pb1-011-R", trigger: "jouji", jouji: true, expectTemplate: "blade_per_energy_below" },
  { id: "PL!N-pb1-011-R", trigger: "kidou", expectTemplate: "kidou_energy_under_pick_waiting_hand" },
  { id: "PL!N-pb1-012-R", trigger: "jidou", jidou: true, expectTemplate: "jidou_on_cost_enter_energy_wait" },
  { id: "PL!N-pb1-012-R", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
  { id: "PL!N-pb1-013-R", trigger: "toujyou", expectTemplate: "toujou_hand_stage_enter" },
  { id: "PL!N-pb1-014-R", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!N-pb1-015-R", trigger: "toujyou", expectTemplate: "toujou_hand_stage_enter" },
  { id: "PL!N-pb1-016-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-pb1-017-R", trigger: "toujyou", expectTemplate: "toujou_hand_stage_enter" },
  { id: "PL!N-pb1-018-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-pb1-019-R", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!N-pb1-020-R", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!N-pb1-021-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-pb1-022-R", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!N-pb1-023-R", trigger: "toujyou", expectTemplate: "toujou_hand_stage_enter" },
  { id: "PL!N-pb1-024-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-pb1-028-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-pb1-034-N", trigger: "live_start", expectTemplate: "heart_color_pick_replace" },
  { id: "PL!N-pb1-035-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!N-pb1-036-N", trigger: "live_start", expectTemplate: "heart_color_pick_replace" },
  { id: "PL!N-pb1-037-L", trigger: "live_start", expectTemplate: "live_start_series_activation_score" },
  {
    id: "PL!N-pb1-038-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check(cl) {
      const errs = [];
      if (cl.minNeedHeartSlot !== 1 || cl.minNeedHeartValue !== 4) errs.push("needHeart");
      return errs;
    },
  },
  {
    id: "PL!N-pb1-039-L",
    trigger: "live_start",
    expectTemplate: "live_start_stellar_stream_grant",
    check(cl) {
      const errs = [];
      if (cl.minNeedHeartSlot !== 1 || cl.minNeedHeartValue !== 3) errs.push("needHeart");
      if (cl.grantHeartSlotCount !== 4) errs.push("grantHeartSlotCount");
      return errs;
    },
  },
];

const NO_ABILITY = [
  "PL!N-pb1-025-N",
  "PL!N-pb1-026-N",
  "PL!N-pb1-027-N",
  "PL!N-pb1-029-N",
  "PL!N-pb1-030-N",
  "PL!N-pb1-031-N",
  "PL!N-pb1-032-N",
  "PL!N-pb1-033-N",
  "PL!N-pb1-040-L",
];

let failed = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) { console.error("MISSING", c.id); failed++; continue; }
  const segMatches = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger === c.trigger);
  const seg = segMatches[c.segIndex ?? 0];
  if (!seg) { console.error("NO_SEG", c.id, c.trigger); failed++; continue; }
  const cl = c.jouji ? classifyJoujiSegment(seg.text) : c.jidou ? classifyJidouAutoSegment(seg.text) : classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  const tmpl = c.jouji ? cl.kind : c.jidou ? cl.template : cl.template;
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (c.check) errs.push(...c.check(cl));
  if (!c.jouji && !c.jidou && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") errs.push("not automated");
  if (errs.length) { failed++; console.error("FAIL", c.id, c.trigger, errs.join("; ")); }
  else console.log("OK", c.id, c.trigger);
}

for (const id of NO_ABILITY) {
  const card = cards[id];
  if (!card) { console.error("MISSING", id); failed++; continue; }
  const raw = cardAbilityRawText(card);
  if (raw && raw.trim()) { failed++; console.error("FAIL", id, "expected no ability"); }
  else console.log("OK", id, "no ability");
}

if (failed) { console.error(`\nverify-niji-pb1: ${failed} failed`); process.exit(1); }
console.log(`\nverify-niji-pb1: ${CASES.length + NO_ABILITY.length} OK`);
