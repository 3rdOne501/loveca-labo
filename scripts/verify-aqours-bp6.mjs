#!/usr/bin/env node
/** Aqours bp6 / RoyalHoliday（PL!S-bp6）代表カードの分類・パターン回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, segHint?:RegExp, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!S-bp6-001-P",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) =>
      cl.oppWaitMinCost === 13 &&
      cl.requiresEnteredFromWaiting &&
      cl.oppWaitStageAreas?.join() === "left,right"
        ? []
        : ["oppWaitMin13 sides waiting"],
  },
  {
    id: "PL!S-bp6-002-P",
    trigger: "jidou",
    expectTemplate: "jidou_live_zone_to_waiting_deck",
    check: (cl) => (cl.filters?.seriesTag === "Aqours" ? [] : ["series"]),
  },
  {
    id: "PL!S-bp6-002-P",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.filters?.minLiveFrameNeedHeartSlotSum === 12 && cl.grantAllHeartCount === 2 ? [] : ["heart12 all2"],
  },
  {
    id: "PL!S-bp6-003-P",
    trigger: "kidou",
    expectTemplate: "kidou_self_wait_stage_member_swap_recover",
    check: (cl) => (cl.filters?.seriesTag === "Aqours" ? [] : ["series"]),
  },
  {
    id: "PL!S-bp6-004-P",
    trigger: "live_start",
    expectTemplate: "live_start_live_frame_pick_deck_top",
    check: (cl) =>
      cl.filters?.pickType === "ライブ" && cl.excludeTriggerOnPick === "live_start" ? [] : ["no-ability live"],
  },
  {
    id: "PL!S-bp6-005-P",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) =>
      cl.deckTopCount === 2 &&
      cl.filters?.pickType === "メンバー" &&
      cl.filters?.heartSlotsAny?.join() === "2,4,5"
        ? []
        : ["deck2 hearts245"],
  },
  {
    id: "PL!S-bp6-006-P",
    trigger: "toujyou",
    expectTemplate: "toujou_draw_grant_if_from_waiting",
    check: (cl) => (cl.deckDrawCount === 2 && cl.bladeGain === 3 ? [] : ["draw2 blade3"]),
  },
  {
    id: "PL!S-bp6-007-P",
    trigger: "live_start",
    expectTemplate: "live_start_pay_or_discard_conditional_grant_members",
    check: (cl) =>
      cl.filters?.maxOwnSuccessLiveCount === 0 && cl.filters?.minOpponentSuccessLiveCount === 2
        ? []
        : ["success live cond"],
  },
  {
    id: "PL!S-bp6-009-P",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: (_cl, seg) => {
      const rule = classifyJoujiSegment(seg.text);
      return rule?.kind === "blade_conditional" && rule?.bladeFlat === 1 ? [] : ["succ diff blade"];
    },
  },
  {
    id: "PL!S-bp6-009-P",
    trigger: "live_success",
    expectTemplate: "yell_reveal_series_live_score_plus",
    check: (cl) => (cl.filters?.seriesTag === "Aqours" ? [] : ["series"]),
  },
  {
    id: "PL!S-bp6-010-N",
    trigger: "live_start",
    expectTemplate: "grant_jouji_session",
    check: (cl) =>
      cl.filters?.minLiveFrameNeedHeartSlotSum === 4 && cl.requiredHeartSlot === 2 ? [] : ["heart02 sum4"],
  },
  {
    id: "PL!S-bp6-011-N",
    trigger: "toujyou",
    expectTemplate: "toujou_draw_discard_if_from_waiting",
    check: (cl) =>
      cl.deckDrawCount === 2 && cl.handDiscardToWaiting === 1 && cl.requiresEnteredFromWaiting
        ? []
        : ["draw2 discard1 waiting"],
  },
  {
    id: "PL!S-bp6-013-N",
    trigger: "toujyou",
    expectTemplate: "grant_jouji_session",
    check: (cl) => (cl.bladeGain === 2 ? [] : ["blade2"]),
  },
  {
    id: "PL!S-bp6-015-N",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.oppWaitMaxCost === 2 ? [] : ["oppWaitMax2"]),
  },
  {
    id: "PL!S-bp6-019-L",
    trigger: "live_start",
    expectTemplate: "draw_then_hand_to_deck_top",
    check: (cl) =>
      cl.requiresStageMembersAllSeriesTag === "Aqours" &&
      cl.handToDeckTopOrBottom &&
      cl.cardScoreGrant === 1
        ? []
        : ["aqours all score draw deck"],
  },
  {
    id: "PL!S-bp6-020-L",
    trigger: "live_start",
    expectTemplate: "ability_pick_one",
  },
  {
    id: "PL!S-bp6-021-L",
    trigger: "jidou",
    expectTemplate: "jidou_yell_discard_nobh_series_extra_yell",
    check: (cl) => (cl.filters?.seriesTag === "Aqours" ? [] : ["series"]),
  },
  {
    id: "PL!S-bp6-022-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.cardScoreGrant === 1 ? [] : ["score1"]),
  },
  {
    id: "PL!S-bp6-023-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
    check: (cl) => (cl.requiresYellRevealedOwnLiveCard && cl.cardScoreGrant === 1 ? [] : ["yell live score1"]),
  },
  {
    id: "PL!S-bp6-024-L",
    trigger: "live_success",
    expectTemplate: "live_success_opp_lose_surplus_score",
    check: (cl) =>
      cl.cardScoreGrant === 1 && cl.minOppSurplusHeartsLost === 2 ? [] : ["opp surplus score"],
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
  const segs = splitAbilityByTriggers(cardAbilityRawText(card));
  const seg = c.segHint
    ? segs.find((s) => s.trigger === c.trigger && c.segHint.test(s.text))
    : segs.find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (c.trigger === "jidou") {
    const jcl = classifyJidouAutoSegment(seg.text);
    if (jcl.template !== c.expectTemplate) errs.push(`template ${jcl.template}`);
    if (!abilityEffectIsAutomated(jcl.template)) errs.push("not automated");
  } else if (c.trigger !== "jouji") {
    if (cl.template !== c.expectTemplate) errs.push(`template ${cl.template}`);
    if (!abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
      errs.push("not automated");
    }
  } else if (c.expectTemplate !== "passive_track" && cl.template !== c.expectTemplate) {
    errs.push(`template ${cl.template}`);
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
  console.error(`\n${failed} aqours-bp6 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} aqours-bp6 cases passed`);
