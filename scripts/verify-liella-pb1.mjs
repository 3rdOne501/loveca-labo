#!/usr/bin/env node
/** Liella! pb1（PL!SP-pb1）メンバー・ライブ代表カードの分類回帰 */
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
  { id: "PL!SP-pb1-001-R", trigger: "live_start", expectTemplate: "live_start_pay_or_hand_discard" },
  { id: "PL!SP-pb1-001-R", trigger: "live_success", expectTemplate: "optional_energy_live_score_plus" },
  {
    id: "PL!SP-pb1-002-R",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "live_score_plus",
    check(cl) {
      return cl.minEnergy === 12 ? [] : ["minEnergy"];
    },
  },
  { id: "PL!SP-pb1-003-R", trigger: "toujyou", expectTemplate: "toujou_rotate_stage_areas" },
  { id: "PL!SP-pb1-004-R", trigger: "live_start", expectTemplate: "energy_deck_to_wait" },
  { id: "PL!SP-pb1-004-R", trigger: "live_success", expectTemplate: "draw_from_deck" },
  { id: "PL!SP-pb1-005-R", trigger: "toujyou", expectTemplate: "energy_deck_to_wait" },
  { id: "PL!SP-pb1-006-R", trigger: "jidou", jidou: true, expectTemplate: "jidou_area_move_grant_jouji" },
  { id: "PL!SP-pb1-007-R", trigger: "live_start", expectTemplate: "activate_energy" },
  { id: "PL!SP-pb1-008-R", trigger: "toujyou", expectTemplate: "toujou_draw_then_position_change" },
  { id: "PL!SP-pb1-009-R", trigger: "toujyou", expectTemplate: "draw_from_deck" },
  {
    id: "PL!SP-pb1-010-R",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "stage_cost_plus",
    check(cl) {
      const errs = [];
      if (cl.minEnergy !== 10) errs.push("minEnergy");
      if (!cl.requiresStageOnly) errs.push("requiresStageOnly");
      return errs;
    },
  },
  { id: "PL!SP-pb1-011-R", trigger: "toujyou", expectTemplate: "toujou_optional_self_wait_recover" },
  { id: "PL!SP-pb1-015-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!SP-pb1-016-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!SP-pb1-017-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!SP-pb1-018-N", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  { id: "PL!SP-pb1-020-N", trigger: "jidou", jidou: true, expectTemplate: "jidou_area_move_draw" },
  { id: "PL!SP-pb1-021-N", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  {
    id: "PL!SP-pb1-023-L",
    trigger: "live_start",
    expectTemplate: "live_start_activate_energy_all_active_score",
    check(cl) {
      const errs = [];
      if (cl.energyActiveCount !== 6) errs.push("energyActiveCount");
      if (cl.filters?.minDistinctSeriesMemberNames !== 2) errs.push("distinctMembers");
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant");
      return errs;
    },
  },
  {
    id: "PL!SP-pb1-024-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check(cl) {
      const errs = [];
      if (cl.filters?.minDistinctSeriesMemberNames !== 2) errs.push("distinctMembers");
      if (cl.filters?.distinctSeriesMemberNamesTag !== "KALEIDOSCORE") errs.push("seriesTag");
      return errs;
    },
  },
  { id: "PL!SP-pb1-025-L", trigger: "live_start", expectTemplate: "live_start_need_heart_reduce_per_enter_or_move" },
];

const NO_ABILITY = [
  "PL!SP-pb1-012-N",
  "PL!SP-pb1-013-N",
  "PL!SP-pb1-014-N",
  "PL!SP-pb1-019-N",
  "PL!SP-pb1-022-N",
  "PL!SP-pb1-026-L",
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

if (failed) { console.error(`\nverify-liella-pb1: ${failed} failed`); process.exit(1); }
console.log(`\nverify-liella-pb1: ${CASES.length + NO_ABILITY.length} OK`);
