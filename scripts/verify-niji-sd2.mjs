#!/usr/bin/env node
/** 虹ヶ咲 sd2 cheer（PL!N-sd2）スタートデッキ代表カードの分類回帰（メンバー＋ライブ） */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, segHint?:RegExp, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!N-sd2-001-SD2",
    trigger: "kidou",
    expectTemplate: "kidou_wait_pick_hand",
    check: (cl) =>
      cl.costEnergy &&
      cl.costEnergyCount === 2 &&
      cl.filters?.seriesTag === "虹ヶ咲" &&
      cl.filters?.pickType === "ライブ"
        ? []
        : ["E2 niji live"],
  },
  {
    id: "PL!N-sd2-003-SD2",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "hand_cost_reduce" &&
        rule.handCostReduce === 2 &&
        rule.requiresSuccessLiveSeriesTag === "虹ヶ咲"
        ? []
        : ["hand cost reduce series"];
    },
  },
  {
    id: "PL!N-sd2-004-SD2",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check: (cl) => (cl.bladeGain === 2 && cl.costEnergy ? [] : ["E blade2"]),
  },
  {
    id: "PL!N-sd2-005-SD2",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
    check: (cl) =>
      cl.handDiscardToWaiting === 2 && cl.grantHeartSlotCount === 2 ? [] : ["discard2 heart×2"],
  },
  {
    id: "PL!N-sd2-006-SD2",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.costPickMemberWait &&
      cl.bladeGain === 2 &&
      cl.filters?.seriesTag === "虹ヶ咲" &&
      cl.grantToConditionalAreaMember !== true
        ? []
        : ["self blade after wait"],
  },
  {
    id: "PL!N-sd2-007-SD2",
    trigger: "live_success",
    expectTemplate: "draw_then_conditional_extra_draw",
    check: (cl) =>
      cl.deckDrawCount === 1 &&
      cl.extraDrawCount === 1 &&
      cl.extraDrawCondType === "opponentLiveSuccessThisTurn" &&
      cl.effectDiscardCount === 1
        ? []
        : ["opp success extra"],
  },
  {
    id: "PL!N-sd2-009-SD2",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 3 && cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["look3 niji"],
  },
  {
    id: "PL!N-sd2-010-SD2",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.deckDrawCount === 2 ? [] : ["draw2"]),
  },
  {
    id: "PL!N-sd2-010-SD2",
    trigger: "jidou",
    expectTemplate: "jidou_own_member_wait_discard_activate",
  },
  {
    id: "PL!N-sd2-011-SD2",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) =>
      cl.handDiscardToWaiting === 1 && cl.filters?.pickType === "ライブ" ? [] : ["discard live"],
  },
  {
    id: "PL!N-sd2-013-SD2",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) =>
      cl.filters?.requiresStageOnlySeries === "虹ヶ咲" && cl.oppWaitMaxPrintedBlade === 2
        ? []
        : ["only niji blade≤2"],
  },
  {
    id: "PL!N-sd2-015-SD2",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.costSelfWait && cl.handDiscardToWaiting === 1 && cl.deckDrawCount === 1
        ? []
        : ["wait discard draw"],
  },
  {
    id: "PL!N-sd2-016-SD2",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!N-sd2-017-SD2",
    trigger: "live_start",
    expectTemplate: "activate_stage_members_up_to",
    check: (cl) => (cl.costEnergy && cl.optional ? [] : ["optional E activate"]),
  },
  {
    id: "PL!N-sd2-019-SD2",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.requiredHeartSlot === 5 ? [] : ["heart05"]),
  },
  {
    id: "PL!N-sd2-019-SD2",
    trigger: "live_start",
    expectTemplate: "live_start_opp_wait_max_cost",
    check: (cl) => (cl.oppWaitMaxCost === 2 || cl.filters?.maxCost === 2 ? [] : ["opp C≤2"]),
  },
  {
    id: "PL!N-sd2-021-SD2",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.filters?.maxCost === 4 || cl.oppWaitMaxCost === 4 ? [] : ["opp C≤4"]),
  },
  {
    id: "PL!N-sd2-024-SD2",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  {
    id: "PL!N-sd2-002-SD2",
    trigger: "toujyou",
    expectTemplate: "none",
  },
  {
    id: "PL!N-sd2-025-SD2",
    trigger: "live_start",
    expectTemplate: "activate_stage_members_up_to",
    check: (cl) =>
      cl.activateMax === 1 && cl.filters?.seriesTag === "虹ヶ咲" ? [] : ["activate 1 niji"],
  },
  {
    id: "PL!N-sd2-026-SD2",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      !cl.bladeGain &&
      cl.requiredHeartSlot === 2 &&
      cl.grantHeartSlotCount === 2 &&
      cl.grantToStageSeriesTag === "虹ヶ咲" &&
      cl.minPickedMemberBlade === 4
        ? []
        : ["blade≥4 heart02×2"],
  },
  {
    id: "PL!N-sd2-027-SD2",
    trigger: "live_start",
    expectTemplate: "live_start_optional_wait_members_score_per",
    check: (cl) =>
      cl.waitMembersMax === 3 &&
      cl.cardScoreGrant === 1 &&
      cl.filters?.seriesTag === "虹ヶ咲"
        ? []
        : ["wait≤3 score+1"],
  },
];

let failed = 0;
let caseCount = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const raw = cardAbilityRawText(card);
  if (c.expectTemplate === "none") {
    caseCount++;
    if (raw && raw.trim()) {
      failed++;
      console.error("FAIL", c.id, "expected no ability");
    } else {
      console.log("OK", c.id, "no ability");
    }
    continue;
  }
  const segs = splitAbilityByTriggers(raw);
  const seg = c.segHint
    ? segs.find((s) => s.trigger === c.trigger && c.segHint.test(s.text))
    : segs.find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  caseCount++;
  /** @type {any} */
  let cl;
  if (c.trigger === "jidou") {
    cl = classifyJidouAutoSegment(seg.text, card) || { template: "jidou_manual" };
  } else {
    cl = classifyCardAbility(card, c.trigger, seg.text);
  }
  const errs = [];
  if (c.trigger === "jouji") {
    /* via check */
  } else if (c.trigger === "jidou") {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  } else {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errs.push("not automated");
    }
  }
  if (c.check) errs.push(...c.check(cl, seg));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

if (failed) {
  console.error(`\nverify-niji-sd2: ${failed} failed`);
  process.exit(1);
}
console.log(`\nverify-niji-sd2: ${caseCount} OK`);
