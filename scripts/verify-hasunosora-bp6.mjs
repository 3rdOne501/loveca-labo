#!/usr/bin/env node
/** 蓮ノ空 bp6（PL!HS-bp6）メンバー・ライブ代表カードの分類回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, jidou?:boolean, segIndex?:number}>} */
const CASES = [
  { id: "PL!HS-bp6-001-P", trigger: "toujyou", expectTemplate: "deck_top_count_stage_plus" },
  { id: "PL!HS-bp6-001-P", trigger: "live_success", expectTemplate: "yell_resolution_pick_deck_top" },
  { id: "PL!HS-bp6-002-P", trigger: "jouji", jouji: true, expectTemplate: "blade_conditional" },
  { id: "PL!HS-bp6-003-P", trigger: "toujyou", expectTemplate: "toujou_wait_pick_hand" },
  { id: "PL!HS-bp6-003-P", trigger: "live_start", expectTemplate: "grant_jouji_session" },
  { id: "PL!HS-bp6-004-P", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!HS-bp6-004-P", trigger: "live_start", expectTemplate: "live_start_opp_wait_max_cost" },
  { id: "PL!HS-bp6-004-P", trigger: "live_start", segIndex: 1, expectTemplate: "live_start_optional_hand_discard_named_followup_blade" },
  { id: "PL!HS-bp6-005-P", trigger: "live_start", expectTemplate: "live_start_hand_discard_cost_boost_grant_if" },
  { id: "PL!HS-bp6-005-P", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
  { id: "PL!HS-bp6-006-P", trigger: "jouji", jouji: true, expectTemplate: "hand_cost_per_series_on_stage" },
  { id: "PL!HS-bp6-006-P", trigger: "jouji", jouji: true, segIndex: 1, expectTemplate: "baton_series_only" },
  { id: "PL!HS-bp6-006-P", trigger: "live_success", expectTemplate: "live_success_wait_skip_next_activate" },
  { id: "PL!HS-bp6-007-P", trigger: "jidou", jidou: true, expectTemplate: "jidou_series_enter_opp_wait" },
  { id: "PL!HS-bp6-008-P", trigger: "toujyou", expectTemplate: "ability_sequence" },
  { id: "PL!HS-bp6-008-P", trigger: "live_start", expectTemplate: "live_start_activate_self_if_low_score_live" },
  { id: "PL!HS-bp6-009-R", trigger: "live_start", expectTemplate: "grant_jouji_session" },
  { id: "PL!HS-bp6-010-R", trigger: "live_start", expectTemplate: "draw_from_deck" },
  { id: "PL!HS-bp6-011-R", trigger: "kidou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!HS-bp6-012-R", trigger: "toujyou", expectTemplate: "activate_energy" },
  { id: "PL!HS-bp6-013-R", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage", check: (cl) => (cl.excludedUnit === "DOLLCHESTRA" && cl.oppWaitMaxPrintedBlade === 3 ? [] : ["exclude/blade"]) },
  { id: "PL!HS-bp6-013-R", trigger: "live_start", expectTemplate: "live_start_opp_wait_exclude_unit" },
  { id: "PL!HS-bp6-014-R", trigger: "kidou", expectTemplate: "kidou_discard_self_draw_grant" },
  { id: "PL!HS-bp6-015-R", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!HS-bp6-016-R", trigger: "kidou", expectTemplate: "kidou_waiting_to_empty_stage" },
  { id: "PL!HS-bp6-017-N", trigger: "jidou", jidou: true, expectTemplate: "jidou_leave_stage_hand_pick_recover" },
  { id: "PL!HS-bp6-018-N", trigger: "jidou", jidou: true, expectTemplate: "jidou_leave_stage_hand_grant_member" },
  { id: "PL!HS-bp6-019-N", trigger: "jidou", jidou: true, expectTemplate: "jidou_leave_stage_draw_discard" },
  { id: "PL!HS-bp6-020-N", trigger: "toujyou", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!HS-bp6-022-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!HS-bp6-025-L", trigger: "live_start", expectTemplate: "grant_jouji_session" },
  { id: "PL!HS-bp6-025-L", trigger: "live_success", expectTemplate: "live_success_recover_from_waiting" },
  { id: "PL!HS-bp6-027-L", trigger: "jidou", jidou: true, expectTemplate: "jidou_yell_discard_nobh_series_multi_extra_yell" },
  { id: "PL!HS-bp6-028-L", trigger: "live_success", expectTemplate: "deck_top_look_reorder" },
  { id: "PL!HS-bp6-029-L", trigger: "live_start", expectTemplate: "live_start_tiered_stage_cost_deck_look" },
  { id: "PL!HS-bp6-030-L", trigger: "live_start", expectTemplate: "draw_then_hand_discard" },
  { id: "PL!HS-bp6-031-L", trigger: "live_start", expectTemplate: "live_start_optional_shuffle_deck_bottom_grant_if" },
  { id: "PL!HS-bp6-032-L", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
];

const NO_ABILITY = [
  "PL!HS-bp6-021-N",
  "PL!HS-bp6-023-N",
  "PL!HS-bp6-024-N",
  "PL!HS-bp6-026-L",
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

if (failed) { console.error(`\nverify-hasunosora-bp6: ${failed} failed`); process.exit(1); }
console.log(`\nverify-hasunosora-bp6: ${CASES.length + NO_ABILITY.length} OK`);
