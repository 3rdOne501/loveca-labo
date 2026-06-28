#!/usr/bin/env node
/** 虹ヶ咲 bp4 / SAPPHIREMOON（PL!N-bp4）代表カードの分類・パターン回帰 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!N-bp4-001-P",
    trigger: "live_success",
    expectTemplate: "energy_less_than_opponent_wait",
  },
  {
    id: "PL!N-bp4-002-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_player_deck_top_peek",
  },
  {
    id: "PL!N-bp4-003-P",
    trigger: "live_success",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["requiresLiveScoreHigherThanOpponent"],
  },
  {
    id: "PL!N-bp4-004-P",
    trigger: "live_start",
    expectTemplate: "live_start_draw_opp_wait",
    check: (cl) => (cl.filters?.maxCost === 9 ? [] : ["oppWait maxCost 9"]),
  },
  {
    id: "PL!N-bp4-004-P",
    trigger: "live_start",
    expectTemplate: "waiting_to_deck_top_by_opp_wait_count",
    check: (cl) => (cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["seriesTag"]),
  },
  { id: "PL!N-bp4-005-P", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  {
    id: "PL!N-bp4-006-P",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      if (steps.length !== 2) return ["steps.length"];
      if (steps[0].template !== "toujou_hand_stage_enter") return ["step0"];
      if (steps[1].template !== "toujou_self_wait_if_hand_enter_bh") return ["step1"];
      return [];
    },
  },
  {
    id: "PL!N-bp4-007-P",
    trigger: "toujyou",
    expectTemplate: "toujou_both_wait_pick_live_hand",
  },
  {
    id: "PL!N-bp4-007-P",
    trigger: "jouji",
    expectTemplate: "blade_conditional",
    jouji: true,
    check: (cl) => (cl.minCombinedEnergy === 15 ? [] : ["minCombinedEnergy 15"]),
  },
  {
    id: "PL!N-bp4-007-P",
    trigger: "live_success",
    expectTemplate: "both_players_energy_deck_wait",
  },
  {
    id: "PL!N-bp4-009-P",
    trigger: "live_start",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.filters?.requiresOwnStageCostSumLowerThanOpponent && cl.deckDrawCount === 2
        ? []
        : ["cost sum / draw"],
  },
  { id: "PL!N-bp4-010-P", trigger: "toujyou", expectTemplate: "success_live_waiting_swap" },
  {
    id: "PL!N-bp4-010-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_live_frame_match_success_live_grant",
  },
  {
    id: "PL!N-bp4-011-P",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
  },
  {
    id: "PL!N-bp4-011-P",
    trigger: "live_success",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 5 && cl.filters?.seriesTag === "虹ヶ咲" && cl.deckTopPickMax === 1
        ? []
        : ["deck top recover"],
  },
  {
    id: "PL!N-bp4-012-P",
    trigger: "jouji",
    expectTemplate: "live_score_plus",
    jouji: true,
    check: (cl) =>
      cl.minOpponentSuccessLiveScoreSum === 6 && cl.liveScorePlus === 1 ? [] : ["opp SL score 6"],
  },
  {
    id: "PL!N-bp4-025-L",
    trigger: "live_start",
    expectTemplate: "live_start_yell_blade_remap_slot",
  },
  {
    id: "PL!N-bp4-026-L",
    trigger: "jidou",
    expectTemplate: "jidou_waiting_to_hand_place_named_live",
  },
  {
    id: "PL!N-bp4-028-L",
    trigger: "live_start",
    expectTemplate: "live_start_tiered_waiting_distinct_score",
  },
  {
    id: "PL!N-bp4-030-L",
    trigger: "live_success",
    expectTemplate: "live_success_pick_options",
  },
];

let failed = 0;

for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const segs = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger === c.trigger);
  let seg = null;
  for (const s of segs) {
    const trial = c.jouji ? classifyJoujiSegment(s.text) : classifyCardAbility(card, c.trigger, s.text);
    const trialTmpl = c.jouji ? trial.kind : trial.template;
    if (trialTmpl === c.expectTemplate) {
      seg = s;
      break;
    }
  }
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger, c.expectTemplate);
    failed++;
    continue;
  }
  const cl = c.jouji ? classifyJoujiSegment(seg.text) : classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  const tmpl = c.jouji ? cl.kind : cl.template;
  if (tmpl !== c.expectTemplate) errs.push(`template ${tmpl}`);
  if (!c.jouji && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, c.expectTemplate, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.expectTemplate);
  }
}

if (failed) {
  console.error(`\n${failed} niji-bp4 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} niji-bp4 cases passed`);
