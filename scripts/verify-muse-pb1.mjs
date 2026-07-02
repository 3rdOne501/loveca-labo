#!/usr/bin/env node
/** μ's pb1（PL!-pb1）メンバー・ライブ代表カードの分類回帰 */
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
  { id: "PL!-pb1-001-R", trigger: "kidou", expectTemplate: "deck_reveal_until_pick" },
  { id: "PL!-pb1-002-R", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!-pb1-002-R", trigger: "live_start", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!-pb1-002-R", trigger: "jouji", jouji: true, expectTemplate: "heart_per_opponent_wait" },
  { id: "PL!-pb1-003-R", trigger: "toujyou", expectTemplate: "activate_energy",
    check: (cl) =>
      cl.energyActiveUnitKind === "series_stage_members" && cl.energyActiveUnitSeries === "Printemps"
        ? []
        : ["energy per Printemps member"],
  },
  { id: "PL!-pb1-004-R", trigger: "toujyou", expectTemplate: "toujou_success_live_score_tiered" },
  { id: "PL!-pb1-005-R", trigger: "toujyou", expectTemplate: "draw_from_deck" },
  { id: "PL!-pb1-006-R", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!-pb1-007-R", trigger: "kidou", expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) => {
      const errs = [];
      if (cl.handDiscardToWaiting !== 3) errs.push("handDiscardToWaiting");
      if (!cl.handDiscardReducedPerSuccessLive) errs.push("slHandDiscardReduce");
      if (cl.filters?.pickType !== "ライブ") errs.push("pickType");
      if (cl.filters?.seriesTag !== "μ's") errs.push("pickSeries");
      if (cl.filters?.minStageSeriesMembers !== 2) errs.push("other lilywhite");
      return errs;
    },
  },
  { id: "PL!-pb1-008-R", trigger: "toujyou", expectTemplate: "toujou_multi_wait_draw_per_count" },
  { id: "PL!-pb1-009-R", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!-pb1-009-R", trigger: "toujyou", segIndex: 1, expectTemplate: "toujou_turn_block_effect_activate" },
  { id: "PL!-pb1-010-R", trigger: "live_start", expectTemplate: "grant_jouji_session" },
  { id: "PL!-pb1-011-R", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!-pb1-012-R", trigger: "toujyou", expectTemplate: "activate_stage_members_up_to" },
  { id: "PL!-pb1-013-R", trigger: "kidou", expectTemplate: "kidou_hand_reveal_grant_if_live" },
  { id: "PL!-pb1-014-R", trigger: "jouji", jouji: true, expectTemplate: "hand_cost_reduce" },
  { id: "PL!-pb1-015-R", trigger: "toujyou", expectTemplate: "toujou_bibi_wait_opp_active_wait" },
  { id: "PL!-pb1-015-R", trigger: "live_start", expectTemplate: "toujou_bibi_wait_opp_active_wait" },
  { id: "PL!-pb1-015-R", trigger: "jidou", jidou: true, expectTemplate: "jidou_opp_wait_draw" },
  { id: "PL!-pb1-016-R", trigger: "toujyou", expectTemplate: "deck_top_pick_recover" },
  { id: "PL!-pb1-017-R", trigger: "toujyou", expectTemplate: "toujou_self_wait_draw_then_conditional_discard" },
  { id: "PL!-pb1-018-R", trigger: "toujyou", expectTemplate: "toujou_both_wait_to_empty_stage" },
  { id: "PL!-pb1-019-N", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  { id: "PL!-pb1-024-N", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  { id: "PL!-pb1-025-N", trigger: "kidou", expectTemplate: "kidou_stage_wait_pick_hand" },
  { id: "PL!-pb1-028-L", trigger: "live_start", expectTemplate: "live_start_activate_series_score_by_unwait" },
  { id: "PL!-pb1-029-L", trigger: "live_start", expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.maxOwnSuccessLiveCount !== 0) errs.push("emptySuccessLive");
      if (cl.filters?.requiresStageOnlySeries !== "lilywhite") errs.push("lilywhiteOnly");
      return errs;
    },
  },
  { id: "PL!-pb1-030-L", trigger: "live_start", expectTemplate: "live_start_need_heart_reduce_fixed" },
  { id: "PL!-pb1-030-L", trigger: "live_success", expectTemplate: "live_success_recover_from_waiting",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minDistinctSeriesMemberNames !== 2) errs.push("distinctBiBi");
      if (cl.filters?.distinctSeriesMemberNamesTag !== "BiBi") errs.push("distinctTag");
      if (cl.recoverPickFilters?.seriesTag !== "BiBi") errs.push("recoverSeries");
      return errs;
    },
  },
  { id: "PL!-pb1-031-L", trigger: "live_success", expectTemplate: "yell_resolution_pick_hand" },
  { id: "PL!-pb1-032-L", trigger: "live_success", expectTemplate: "draw_from_deck",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.minSuccessLiveSeriesTag !== "μ's") errs.push("slSeries");
      if (cl.filters?.minLiveFrameCount != null) errs.push("liveFrameNotSl");
      return errs;
    },
  },
];

const NO_ABILITY = [
  "PL!-pb1-020-N",
  "PL!-pb1-021-N",
  "PL!-pb1-022-N",
  "PL!-pb1-023-N",
  "PL!-pb1-026-N",
  "PL!-pb1-027-N",
  "PL!-pb1-033-L",
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

if (failed) { console.error(`\nverify-muse-pb1: ${failed} failed`); process.exit(1); }
console.log(`\nverify-muse-pb1: ${CASES.length + NO_ABILITY.length} OK`);
