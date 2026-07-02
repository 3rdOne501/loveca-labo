#!/usr/bin/env node
/** Aqours pb1（PL!S-pb1）メンバー・ライブ代表カードの分類回帰 */
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
  { id: "PL!S-pb1-001-R", trigger: "toujyou", expectTemplate: "toujou_wait_pick_hand" },
  { id: "PL!S-pb1-002-R", trigger: "toujyou", expectTemplate: "toujou_opp_optional_live_discard_or_score" },
  { id: "PL!S-pb1-003-R", trigger: "live_start", expectTemplate: "live_start_optional_hearts_wild" },
  { id: "PL!S-pb1-003-R", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
  { id: "PL!S-pb1-004-R", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  { id: "PL!S-pb1-005-R", trigger: "jouji", jouji: true, expectTemplate: "blade_conditional" },
  { id: "PL!S-pb1-006-R", trigger: "kidou", expectTemplate: "kidou_reveal_live_opp_decline_grant" },
  { id: "PL!S-pb1-007-R", trigger: "live_success", expectTemplate: "yell_resolution_energy_wait" },
  { id: "PL!S-pb1-008-R", trigger: "live_start", expectTemplate: "deck_top_look_reorder" },
  { id: "PL!S-pb1-009-R", trigger: "jouji", jouji: true, expectTemplate: "blade_conditional" },
  { id: "PL!S-pb1-013-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      const alts = cl.filters?.pickFilterAlternatives;
      if (!alts || alts.length !== 2) errs.push("pickFilterAlternatives");
      else {
        if (alts[0]?.pickType !== "メンバー" || alts[0]?.minPrintedHeartBySlot?.[4] !== 2) errs.push("memberHeart");
        if (alts[1]?.pickType !== "ライブ" || alts[1]?.minNeedHeartSlot !== 4 || alts[1]?.minNeedHeartValue !== 2) errs.push("liveHeart");
      }
      return errs;
    },
  },
  { id: "PL!S-pb1-014-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!S-pb1-015-N", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!S-pb1-016-N", trigger: "live_start", expectTemplate: "optional_energy_blade_until_live_end" },
  { id: "PL!S-pb1-017-N", trigger: "live_start", expectTemplate: "optional_energy_blade_until_live_end" },
  { id: "PL!S-pb1-018-N", trigger: "live_start", expectTemplate: "optional_energy_blade_until_live_end" },
  { id: "PL!S-pb1-019-L", trigger: "live_start", expectTemplate: "live_start_disable_self_live_success_if" },
  { id: "PL!S-pb1-019-L", trigger: "live_success", expectTemplate: "live_success_opponent_energy_deck_wait" },
  { id: "PL!S-pb1-020-L", trigger: "live_start", expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minStageSeriesHeartSlotTotal !== 10) errs.push("heartTotal");
      if (cl.filters?.minStageSeriesHeartSlot !== 4) errs.push("heartSlot");
      if (cl.filters?.minStageSeriesHeartSlotTag !== "Aqours") errs.push("heartTag");
      return errs;
    },
  },
  { id: "PL!S-pb1-021-L", trigger: "live_success", expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minStageSeriesHeartSlotTotal !== 4) errs.push("heartTotal");
      if (cl.filters?.minStageSeriesHeartSlot !== 5) errs.push("heartSlot");
      if (!cl.filters?.requiresOpponentSucceededLiveZeroSurplusThisTurn) errs.push("oppZeroSurplus");
      return errs;
    },
  },
  { id: "PL!S-pb1-022-L", trigger: "live_success", expectTemplate: "live_success_tie_block_success_live" },
];

const NO_ABILITY = [
  "PL!S-pb1-010-N",
  "PL!S-pb1-011-N",
  "PL!S-pb1-012-N",
  "PL!S-pb1-023-L",
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
  else if (c.check) {
    const extra = c.check(cl);
    if (extra.length) { failed++; console.error("FAIL", c.id, c.trigger, extra.join("; ")); }
    else console.log("OK", c.id, c.trigger);
  }
  else console.log("OK", c.id, c.trigger);
}

for (const id of NO_ABILITY) {
  const card = cards[id];
  if (!card) { console.error("MISSING", id); failed++; continue; }
  const raw = cardAbilityRawText(card);
  if (raw && raw.trim()) { failed++; console.error("FAIL", id, "expected no ability"); }
  else console.log("OK", id, "no ability");
}

if (failed) { console.error(`\nverify-aqours-pb1: ${failed} failed`); process.exit(1); }
console.log(`\nverify-aqours-pb1: ${CASES.length + NO_ABILITY.length} OK`);
