#!/usr/bin/env node
/** Liella! bp4 / SAPPHIREMOON（PL!SP-bp4）代表カードの分類回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const LIVE_CASES = [
  {
    id: "PL!SP-bp4-023-L",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = (cl.steps || []).map((s) => s.template);
      const want = ["live_start_dazzling_named_liella_grant", "live_start_yell_blade_remap_slot"];
      return want.every((t) => steps.includes(t)) ? [] : ["steps " + steps.join(",")];
    },
  },
  {
    id: "PL!SP-bp4-024-L",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      if (steps.length !== 2) return ["steps.length"];
      const score = steps.find((s) => s.template === "live_card_score_plus");
      const grant = steps.find((s) => s.template === "grant_jouji_session");
      const errs = [];
      if (!score) errs.push("score step");
      if (!grant) errs.push("grant step");
      if (score && !score.filters?.requiresCenterSeriesCostHigherThanOpponent) errs.push("center cost cmp");
      if (grant && grant.bladeGain !== 2) errs.push("bladeGain 2");
      if (grant && grant.stageArea !== "left") errs.push("stageArea left");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-025-L",
    trigger: "live_start",
    expectTemplate: "live_start_center_series_blade_set",
    check: (cl) => (cl.bladeSetCount === 3 && cl.filters?.seriesTag === "Liella!" ? [] : ["blade set 3"]),
  },
  {
    id: "PL!SP-bp4-025-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.requiresCenterMemberMovedThisTurn && cl.cardScoreGrant === 1 ? [] : ["center moved score"],
  },
  {
    id: "PL!SP-bp4-026-L",
    trigger: "live_success",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = cl.steps || [];
      if (steps.length !== 2) return ["steps.length"];
      const score = steps[0];
      const draw = steps[1];
      const errs = [];
      if (score.template !== "live_card_score_plus") errs.push("step0 score");
      if (draw.template !== "draw_then_hand_discard") errs.push("step1 draw");
      if (score.filters?.minDistinctYellRevealedMemberNames !== 5) errs.push("yell distinct 5");
      if (draw.filters?.minEnergyCount !== 11) errs.push("energy 11");
      if (score.filters?.minEnergyCount != null) errs.push("score must not require energy");
      if (draw.filters?.minDistinctYellRevealedMemberNames != null) errs.push("draw must not require yell");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-027-L",
    trigger: "live_success",
    expectTemplate: "live_success_formation_change",
    check: (cl) => (cl.filters?.requiresStageOnlySeries === "Liella!" ? [] : ["Liella only"]),
  },
  {
    id: "PL!SP-bp4-028-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) =>
      cl.cardScoreGrant === 1 && cl.filters?.requiresAnyActiveEnergy ? [] : ["active energy +1"],
  },
];

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const MEMBER_CASES = [
  {
    id: "PL!SP-bp4-001-P",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) =>
      cl.filters?.requiresStageOnlySeries === "Liella!" && cl.filters?.minEnergyCount === 7
        ? []
        : ["Liella only + E7"],
  },
  {
    id: "PL!SP-bp4-002-P",
    trigger: "toujyou",
    expectTemplate: "toujou_deck_top_liella_live_pick",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" && cl.filters?.minTotalNeedHeart === 8 ? [] : ["liella live peek"]),
  },
  {
    id: "PL!SP-bp4-003-P",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) => {
      const errs = [];
      if (cl.deckDrawCount !== 2) errs.push("draw 2");
      if (cl.effectDiscardCount !== 2) errs.push("discard 2");
      if (!cl.stageAreas?.includes("left") || !cl.stageAreas?.includes("right")) errs.push("left/right");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-005-P",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) => {
      const errs = [];
      if (cl.requiresBatonFromSeriesTag !== "Liella!") errs.push("baton Liella");
      if (cl.filters?.minEnergyCount !== 7) errs.push("E7");
      if (cl.energyWaitCount !== 2) errs.push("ED wait 2");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-006-P",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) => {
      const pf = cl.preconditionFilters || {};
      const errs = [];
      if (pf.minDistinctYellRevealedMemberNames !== 3) errs.push("yell distinct 3");
      if (pf.distinctYellRevealedSeriesTag !== "Liella!") errs.push("yell series");
      if (cl.filters?.pickType !== "ライブ") errs.push("pick live");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-010-P",
    trigger: "kidou",
    expectTemplate: "energy_deck_to_wait",
    check: (cl) => (cl.costSelfWait && cl.energyWaitCount === 1 ? [] : ["self wait ED1"]),
  },
  {
    id: "PL!SP-bp4-012-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.hasOptionalCost && cl.costEnergy && cl.requiredHeartSlot === 2 ? [] : ["optional E heart02"],
  },
  {
    id: "PL!SP-bp4-013-N",
    trigger: "toujyou",
    expectTemplate: "live_start_position_change",
    check: (cl) => (cl.optional ? [] : ["optional position change"]),
  },
  {
    id: "PL!SP-bp4-015-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  {
    id: "PL!SP-bp4-018-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "Liella!" ? [] : ["Liella series"]),
  },
  {
    id: "PL!SP-bp4-019-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  {
    id: "PL!SP-bp4-004-P",
    trigger: "toujyou",
    expectTemplate: "toujou_liella_double_baton_center",
    check: (cl) =>
      cl.filters?.seriesTag === "Liella!" && cl.filters?.maxCost === 4 ? [] : ["baton center"],
  },
  {
    id: "PL!SP-bp4-008-P",
    trigger: "toujyou",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = (cl.steps || []).map((s) => s.template);
      const errs = [];
      if (steps[0] !== "draw_then_hand_discard") errs.push("step0 draw");
      if (steps[1] !== "activate_energy") errs.push("step1 energy");
      if (cl.steps?.[0]?.stageArea !== "left") errs.push("left draw");
      if (cl.steps?.[1]?.stageArea !== "right") errs.push("right energy");
      if (cl.steps?.[1]?.energyActiveCount !== 2) errs.push("activate 2");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-017-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.bladeGain !== 2) errs.push("blade 2");
      if (cl.stageArea !== "left") errs.push("left");
      if (!cl.filters?.requiresSelfMovedThisTurn) errs.push("self moved");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-020-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.bladeGain !== 2) errs.push("blade 2");
      if (cl.stageArea !== "right") errs.push("right");
      if (!cl.filters?.requiresSelfMovedThisTurn) errs.push("self moved");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-022-N",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => {
      const errs = [];
      if (!cl.costEnergyVariable) errs.push("variable pay");
      if (cl.optionalEnergyMaxPay !== 2) errs.push("max pay 2");
      if (cl.bladeGainPerEnergy !== 1) errs.push("per energy blade");
      if (cl.bladeGain !== 0) errs.push("fixed blade");
      return errs;
    },
  },
];

/** @type {Array<{id:string, check:(rule:any)=>string[]}>} */
const JIDOU_CASES = [
  {
    id: "PL!SP-bp4-007-P",
    check: (rule) => {
      const errs = [];
      if (rule?.template !== "jidou_area_move_wait_pick_hand") errs.push("template");
      if (rule?.eventKind !== "area_move") errs.push("area_move");
      if (rule?.filters?.seriesTag !== "Liella!") errs.push("Liella");
      if (rule?.filters?.maxCost !== 3) errs.push("score 3");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-011-P",
    check: (rule) => {
      const errs = [];
      if (rule?.template !== "jidou_area_move_opp_wait") errs.push("template");
      if (rule?.eventKind !== "enter_or_baton") errs.push("enter_or_baton");
      if (rule?.altEventKind !== "area_move") errs.push("alt area_move");
      if (rule?.oppWaitMaxPrintedBlade !== 3) errs.push("blade 3");
      return errs;
    },
  },
  {
    id: "PL!SP-bp4-016-N",
    check: (rule) =>
      rule?.template === "jidou_energy_placed_grant" && rule?.eventKind === "energy_placed" ? [] : ["energy placed grant"],
  },
];

/** @type {Array<{id:string, check:(rule:any)=>string[]}>} */
const JOUJI_CASES = [
  {
    id: "PL!SP-bp4-003-P",
    check: (rule) =>
      rule?.kind === "blade_conditional" && rule?.bladeFlat === 2 && rule?.stageAreas?.includes("center")
        ? []
        : ["center blade 2"],
  },
  {
    id: "PL!SP-bp4-005-P",
    check: (rule) =>
      rule?.kind === "blade_conditional" && rule?.bladeFlat === 3 && rule?.minEnergy === 10 ? [] : ["E10 blade 3"],
  },
  {
    id: "PL!SP-bp4-009-P",
    check: (rule) =>
      rule?.kind === "blade_if_lower_stage_cost_sum" && rule?.bladeFlat === 3 && rule?.requiresStageOnly
        ? []
        : ["lower cost blade 3"],
  },
  {
    id: "PL!SP-bp4-021-N",
    check: (rule) =>
      rule?.kind === "blade_conditional" && rule?.opponentMoreEnergy && rule?.heartFlat?.[6] === 1
        ? []
        : ["opp E heart06"],
  },
];

const CASES = [...LIVE_CASES, ...MEMBER_CASES];

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
    const trial = classifyCardAbility(card, c.trigger, s.text);
    if (trial.template === c.expectTemplate) {
      seg = s;
      break;
    }
  }
  const cl =
    c.expectTemplate === "ability_sequence"
      ? classifyCardAbility(card, c.trigger)
      : seg
        ? classifyCardAbility(card, c.trigger, seg.text)
        : classifyCardAbility(card, c.trigger);
  if (!cl) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const errs = [];
  if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.expectTemplate);
  }
}

for (const jc of JIDOU_CASES) {
  const card = cards[jc.id];
  if (!card) {
    console.error("MISSING", jc.id);
    failed++;
    continue;
  }
  const ab = String(card.ability || "");
  const seg =
    ab.split(/\n/).find((s) => /jidou|自動/.test(s)) ||
    ab.match(/\{\{jidou[^}]+\}\}[\s\S]*?(?=\{\{kidou|\{\{toujyou|\{\{live_start|$)/)?.[0] ||
    ab;
  const rule = classifyJidouAutoSegment(seg);
  const extra = jc.check(rule);
  if (extra.length) {
    failed++;
    console.error("FAIL jidou", jc.id, extra.join("; "), rule);
  } else {
    console.log("OK jidou", jc.id, rule?.template);
  }
}

for (const jc of JOUJI_CASES) {
  const card = cards[jc.id];
  if (!card) {
    console.error("MISSING", jc.id);
    failed++;
    continue;
  }
  const ab = String(card.ability || "");
  const seg =
    ab.split(/\n/).find((s) => /jyouji|常時/.test(s)) ||
    ab.match(/\{\{jyouji[^}]+\}\}[\s\S]*?(?=\{\{kidou|\{\{toujyou|\{\{live_start|$)/)?.[0] ||
    ab;
  const rule = classifyJoujiSegment(seg);
  const extra = jc.check(rule);
  if (extra.length) {
    failed++;
    console.error("FAIL jouji", jc.id, extra.join("; "), rule);
  } else {
    console.log("OK jouji", jc.id, rule?.kind);
  }
}

for (const id of ["PL!SP-bp4-014-N", "PL!SP-bp4-029-L", "PL!SP-bp4-030-L"]) {
  const card = cards[id];
  if (!card) {
    console.error("MISSING", id);
    failed++;
    continue;
  }
  const triggered = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger);
  if (triggered.length) {
    failed++;
    console.error("FAIL", id, "expected no triggered ability");
  } else {
    console.log("OK", id, "no triggered ability");
  }
}

if (failed) {
  console.error(`\n${failed} liella-bp4 case(s) failed`);
  process.exit(1);
}
const totalCases = CASES.length + JIDOU_CASES.length + JOUJI_CASES.length + 3;
console.log(`\nAll ${totalCases} liella-bp4 cases passed`);
