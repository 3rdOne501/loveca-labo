#!/usr/bin/env node
/** Aqours bp2 / NEXTSTEP（PL!S-bp2）代表カードの分類・パターン回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, jouji?:boolean, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-bp2-001-P",
    trigger: "jouji",
    jouji: true,
    expectTemplate: "blade_conditional",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      const errs = [];
      if (rule?.kind !== "blade_conditional") errs.push("blade_conditional");
      if (rule?.bladeFlat !== 3) errs.push("blade 3");
      if (rule?.maxOwnSuccessLive !== 0) errs.push("own SL 0");
      if (rule?.minOpponentSuccessLive !== 1) errs.push("opp SL 1+");
      return errs;
    },
  },
  {
    id: "PL!S-bp2-002-P",
    trigger: "jidou",
    expectTemplate: "jidou_leave_stage_hand_pick_recover",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" && cl.handDiscardToWaiting === 1 ? [] : ["filters/cost"],
  },
  { id: "PL!S-bp2-003-P", trigger: "jidou", expectTemplate: "jidou_yell_grant_heart" },
  { id: "PL!S-bp2-004-P", trigger: "jidou", expectTemplate: "jidou_yell_retry_no_live" },
  {
    id: "PL!S-bp2-005-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 7) errs.push("deckTopCount");
      if (cl.deckTopPickMax !== 3) errs.push("deckTopPickMax");
      if (!cl.filters?.heartSlotsAny || cl.filters.heartSlotsAny.length !== 3) errs.push("heartSlotsAny");
      return errs;
    },
  },
  { id: "PL!S-bp2-006-P", trigger: "toujyou", expectTemplate: "toujou_wait_enter_cost_sum",
    check: (cl) => {
      const errs = [];
      if (!cl.optional || !cl.hasOptionalCost) errs.push("optional energy");
      if (cl.waitEnterMaxCount !== 2) errs.push("enterPickMax 2");
      if (cl.waitEnterMaxCostSum !== 4) errs.push("cost sum 4");
      return errs;
    },
  },
  { id: "PL!S-bp2-007-P", trigger: "jidou", expectTemplate: "jidou_yell_draw",
    check: (cl) => {
      const errs = [];
      if (cl.deckDrawCount !== 1) errs.push("draw 1");
      if (!cl.filters?.maxHandCount || cl.filters.maxHandCount !== 7) errs.push("hand max 7");
      return errs;
    },
  },
  {
    id: "PL!S-bp2-007-P",
    trigger: "live_start",
    expectTemplate: "live_start_hand_live_to_deck_bottom_look",
    check: (cl) => (cl.deckTopCount === 2 ? [] : ["deckTopCount"]),
  },
  { id: "PL!S-bp2-008-P", trigger: "toujyou", expectTemplate: "waiting_to_deck_bottom" },
  {
    id: "PL!S-bp2-009-P",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "ライブ" ? [] : ["pick live"]),
  },
  {
    id: "PL!S-bp2-010-N",
    trigger: "toujyou",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 2 && cl.effectDiscardCount === 2 ? [] : ["draw2 discard2"],
  },
  {
    id: "PL!S-bp2-016-N",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => (cl.filters?.pickType === "メンバー" ? [] : ["pick member"]),
  },
  { id: "PL!S-bp2-021-L", trigger: "live_success", expectTemplate: "yell_resolution_pick_deck_bottom",
    check: (cl) => {
      const errs = [];
      if (cl.deckPickMax !== 1) errs.push("deckPickMax 1");
      if (cl.filters?.pickType !== "ライブ") errs.push("pick live");
      return errs;
    },
  },
  {
    id: "PL!S-bp2-022-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 2) errs.push("cardScoreGrant");
      if (!cl.filters?.requiresDeckRefreshedThisTurn) errs.push("deck refresh filter");
      return errs;
    },
  },
  {
    id: "PL!S-bp2-023-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (!cl.grantToAllStageMembers) errs.push("all stage members");
      if (cl.grantPickStageMembersMax) errs.push("must not pick one");
      if (cl.bladeGain !== 1) errs.push("blade 1");
      if (cl.filters?.requiresOtherSeriesLiveOnFrameTag !== "Aqours") errs.push("frame series");
      if (cl.filters?.requiresOtherSeriesLiveOnFrameExcludeName !== "MY舞☆TONIGHT") errs.push("exclude name");
      return errs;
    },
  },
  {
    id: "PL!S-bp2-024-L",
    trigger: "live_success",
    expectTemplate: "draw_then_hand_discard",
    check: (cl) =>
      cl.deckDrawCount === 2 && cl.effectDiscardCount === 1 ? [] : ["draw2 discard1"],
  },
  {
    id: "PL!S-bp2-025-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.grantPickStageMembersMax !== 1) errs.push("pick 1");
      if (cl.bladeGain !== 2) errs.push("blade 2");
      if (cl.filters?.minSuccessLiveCount !== 2) errs.push("sl 2+");
      if (cl.grantToAllStageMembers) errs.push("must not grant all");
      if (!cl.requiresOnStage) errs.push("requiresOnStage");
      return errs;
    },
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
  const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = c.jouji
    ? classifyJoujiSegment(seg.text)
    : classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (c.jouji) {
    if (c.expectTemplate !== cl.kind) errs.push(`kind ${cl.kind}`);
  } else {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    if (!abilityEffectIsAutomated(cl.template)) errs.push("not automated");
  }
  if (c.check) errs.push(...c.check(cl, seg));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

for (const id of ["PL!S-bp2-019-L", "PL!S-bp2-020-L", "PL!S-bp2-026-L"]) {
  const card = cards[id];
  if (!card) {
    console.error("MISSING", id);
    failed++;
    continue;
  }
  const raw = cardAbilityRawText(card);
  if (raw && raw.trim()) {
    failed++;
    console.error("FAIL", id, "expected no ability");
  } else {
    console.log("OK", id, "no ability");
  }
}

{
  const id = "PL!S-bp2-008-P";
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  const seg = splitAbilityByTriggers(raw).find((s) => s.trigger === "jouji");
  if (!seg) {
    failed++;
    console.error("MISSING SEG", id, "jouji");
  } else {
    const rule = classifyJoujiSegment(seg.text);
    const grantM = String(seg.text).match(/「([\s\S]+?)」を得る/);
    const grantRule = grantM ? classifyJoujiSegment(grantM[1]) : null;
    const errs = [];
    if (rule?.kind !== "stage_all_areas_grant_quoted") errs.push("grant quoted kind");
    if (rule?.seriesTag !== "Aqours") errs.push("series Aqours");
    if (grantRule?.kind !== "yell_reveal_live_score_tiered") errs.push("grant yell tier");
    if (grantRule?.liveScorePlus !== 1 || grantRule?.liveScorePlusHigh !== 2) errs.push("tier +1/+2");
    if (errs.length) {
      failed++;
      console.error("FAIL", id, "jouji", errs.join("; "));
    } else {
      console.log("OK", id, "jouji");
    }
  }
}

{
  const id = "PL!S-bp2-024-L";
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  const seg = splitAbilityByTriggers(raw).find((s) => s.trigger === "jouji");
  if (!seg) {
    failed++;
    console.error("MISSING SEG", id, "jouji");
  } else {
    const jr = classifyJoujiSegment(seg.text);
    if (jr.kind !== "cannot_place_on_success_live") {
      failed++;
      console.error("FAIL", id, "jouji", "kind " + jr.kind);
    } else {
      console.log("OK", id, "jouji");
    }
  }
}

if (failed) {
  console.error(`\n${failed} aqours-bp2 case(s) failed`);
  process.exit(1);
}
const totalCases = CASES.length + 5;
console.log(`\nAll ${totalCases} aqours-bp2 cases passed`);
