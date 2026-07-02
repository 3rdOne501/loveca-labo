#!/usr/bin/env node
/** 虹ヶ咲 bp3 / 夏、はじまる。（PL!N-bp3）代表カードの分類・パターン回帰 */
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
    id: "PL!N-bp3-001-P",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) => {
      const errs = [];
      if (cl.energyUnderCount !== 1 || cl.deckDrawCount !== 1) errs.push("E under draw1");
      if (!cl.grantToAllStageMembers || cl.bladeGain !== 2) errs.push("all blade2");
      return errs;
    },
  },
  {
    id: "PL!N-bp3-003-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_trigger_ability",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.maxCost === 4 ? [] : ["filters"],
  },
  { id: "PL!N-bp3-007-P", trigger: "kidou", expectTemplate: "kidou_self_wait_hand_enter_energy" },
  {
    id: "PL!N-bp3-009-P",
    trigger: "live_start",
    expectTemplate: "live_start_waiting_deck_bottom_tiered",
  },
  {
    id: "PL!N-bp3-010-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
  },
  { id: "PL!N-bp3-011-P", trigger: "toujyou", expectTemplate: "toujou_opp_stage_member_match_grant" },
  {
    id: "PL!N-bp3-013-N",
    trigger: "toujyou",
    expectTemplate: "toujou_optional_energy_under",
    check: (cl) =>
      cl.energyUnderCount === 1 && cl.deckDrawCount === 2 && cl.optional ? [] : ["E1 draw2"],
  },
  { id: "PL!N-bp3-017-N", trigger: "toujyou", expectTemplate: "optional_self_wait_opp_stage" },
  { id: "PL!N-bp3-017-N", trigger: "live_start", expectTemplate: "optional_self_wait_opp_stage" },
  {
    id: "PL!N-bp3-025-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_energy_under_return_grant",
    check: (cl) =>
      cl.grantHeartCountPerEnergy === 3 && cl.requiredHeartSlot === 2 ? [] : ["heart grant meta"],
  },
  {
    id: "PL!N-bp3-026-L",
    trigger: "live_start",
    expectTemplate: "live_start_tiered_success_live_scores",
    check: (cl) =>
      Array.isArray(cl.tierSuccessLiveScores) &&
      cl.tierSuccessLiveScores.includes(1) &&
      cl.tierSuccessLiveScores.includes(5)
        ? []
        : ["tier scores 1/5"],
  },
  {
    id: "PL!N-bp3-027-L",
    trigger: "live_success",
    expectTemplate: "live_success_surplus_heart_energy_wait",
    check: (cl) => {
      const errs = [];
      if (cl.surplusHeartSlot !== 4) errs.push("surplus heart04");
      if (cl.filters?.minStageSeriesMembers !== 1) errs.push("stage niji");
      if (cl.filters?.minStageSeriesMembersTag !== "虹ヶ咲") errs.push("stage tag");
      return errs;
    },
  },
  {
    id: "PL!N-bp3-028-L",
    trigger: "live_start",
    expectTemplate: "live_start_per_series_member_deck_look_reveal_score",
    check: (cl) => {
      const errs = [];
      if (cl.deckTopCount !== 1) errs.push("deckTopCount");
      if (cl.cardScoreGrant !== 1) errs.push("score +1");
      if (cl.filters?.seriesTag !== "虹ヶ咲") errs.push("seriesTag");
      return errs;
    },
  },
  {
    id: "PL!N-bp3-030-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.requiresYellRevealedAllBladeHeart ? [] : ["yell ALL blade heart"]),
  },
  {
    id: "PL!N-bp3-031-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus_per_unit",
    check: (cl) => (cl.scoreUnitKind === "waiting_stage_members" ? [] : ["scoreUnitKind"]),
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
  if (!abilityEffectIsAutomated(cl.template)) errs.push("not automated");
  if (c.check) errs.push(...c.check(cl));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

for (const id of ["PL!N-bp3-029-L", "PL!N-bp3-032-L"]) {
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
  console.error(`\n${failed} niji-bp3 case(s) failed`);
  process.exit(1);
}
const totalCases = CASES.length + 2;
console.log(`\nAll ${totalCases} niji-bp3 cases passed`);
