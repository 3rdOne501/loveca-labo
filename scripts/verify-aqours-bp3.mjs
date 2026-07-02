#!/usr/bin/env node
/** Aqours bp3 / 夏、はじまる。（PL!S-bp3）代表カードの分類・パターン回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-bp3-001-P",
    trigger: "kidou",
    expectTemplate: "kidou_wait_member_grant_jouji",
    check: (cl) =>
      cl.stageArea === "center" && cl.perTurnLimit === 1 && cl.costPickMemberWait ? [] : ["center/limit/wait"],
  },
  {
    id: "PL!S-bp3-002-P",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_self_score",
    check: (cl) => (cl.filters?.requiresLiveScoreHigherThanOpponent ? [] : ["scoreHigherThanOpp"]),
  },
  {
    id: "PL!S-bp3-003-P",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.deckDrawCount === 3 && cl.optional ? [] : ["draw3 optional"]),
  },
  {
    id: "PL!S-bp3-003-P",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_optional_blade_per",
    check: (cl) => (cl.bladeGainPerDiscarded === 2 && cl.handDiscardMax === 2 ? [] : ["blade per discard"]),
  },
  {
    id: "PL!S-bp3-004-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 4 && cl.filters?.pickType === "メンバー" ? [] : ["peek4 member"]),
  },
  {
    id: "PL!S-bp3-005-P",
    trigger: "live_success",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.deckDrawCount === 1 && cl.filters?.requiresOwnYellRevealCountLessThanOpponent
        ? []
        : ["draw1 yell count filter"],
  },
  {
    id: "PL!S-bp3-006-P",
    trigger: "kidou",
    expectTemplate: "kidou_self_wait_stage_member_swap_recover",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.seriesTag !== "Aqours" || !cl.costSelfWait) errs.push("series/cost");
      if (cl.stageArea !== "center") errs.push("center only");
      return errs;
    },
  },
  {
    id: "PL!S-bp3-007-P",
    trigger: "kidou",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
    check: (cl) =>
      cl.deckDrawOnSuccess === 1 &&
      cl.costEnergy &&
      cl.perTurnLimit === 1 &&
      cl.filters?.pickType === "ライブ"
        ? []
        : ["draw/cost/limit"],
  },
  {
    id: "PL!S-bp3-008-P",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) => {
      const errs = [];
      if (cl.filters?.pickType !== "ライブ") errs.push("pick live");
      if (cl.energyActiveCount !== 4) errs.push("energy 4");
      if (cl.energyOnPickedLiveFilters?.minScore !== 6) errs.push("picked minScore 6");
      if (cl.energyOnPickedLiveFilters?.seriesTag !== "Aqours") errs.push("picked Aqours");
      if (cl.filters?.minScore != null) errs.push("must not gate pick by score");
      return errs;
    },
  },
  {
    id: "PL!S-bp3-009-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 6 && cl.filters?.seriesTag === "Aqours" && cl.filters?.pickType === "メンバー"
        ? []
        : ["peek6 Aqours member"],
  },
  {
    id: "PL!S-bp3-010-N",
    trigger: "toujyou",
    expectTemplate: "activate_stage_members_up_to",
    check: (cl) => (cl.activateMax === 1 ? [] : ["activate 1"]),
  },
  {
    id: "PL!S-bp3-011-N",
    trigger: "toujyou",
    expectTemplate: "activate_stage_members_up_to",
    check: (cl) => (cl.activateMax === 1 ? [] : ["activate 1"]),
  },
  { id: "PL!S-bp3-012-N", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  {
    id: "PL!S-bp3-016-N",
    trigger: "jouji",
    expectTemplate: "passive_track",
    skipAutomatedCheck: true,
  },
  {
    id: "PL!S-bp3-017-N",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
  },
  {
    id: "PL!S-bp3-019-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_set_fixed",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreSet !== 4) errs.push("cardScoreSet");
      if (cl.minSurplusHeartsOrYellAllBh !== 2) errs.push("surplus/bh or");
      if (cl.requiresConditionConfirm) errs.push("must not need confirm");
      return errs;
    },
  },
  { id: "PL!S-bp3-020-L", trigger: "jidou", expectTemplate: "jidou_yell_retry_low_bh" },
  {
    id: "PL!S-bp3-021-L",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (!cl.optionalWaitingMemberToDeckTop) errs.push("wait deck top");
      if (!cl.grantPickStageMembersMax) errs.push("pick 1");
      if (cl.bladeGain !== 1) errs.push("blade 1");
      return errs;
    },
  },
  {
    id: "PL!S-bp3-024-L",
    trigger: "live_start",
    expectTemplate: "ability_pick_one",
    check: (cl) =>
      cl.filters?.seriesTag === "Aqours" && cl.filters?.minCost === 9 && cl.filters?.maxCost === 4
        ? []
        : ["filters"],
  },
  {
    id: "PL!S-bp3-025-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus",
    check: (cl) => {
      const errs = [];
      if (cl.cardScoreGrant !== 1) errs.push("cardScoreGrant");
      if (cl.grantPickStageMembersMax !== 1) errs.push("pick 1");
      if (cl.minPickedMemberBlade !== 6) errs.push("blade 6+");
      if (cl.filters?.seriesTag !== "Aqours") errs.push("series");
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
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
  if (!c.skipAutomatedCheck && !abilityEffectIsAutomated(cl.template)) errs.push("not automated");
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

for (const id of ["PL!S-bp3-022-L", "PL!S-bp3-023-L"]) {
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

if (failed) {
  console.error(`\n${failed} aqours-bp3 case(s) failed`);
  process.exit(1);
}
const totalCases = CASES.length + 2;
console.log(`\nAll ${totalCases} aqours-bp3 cases passed`);
