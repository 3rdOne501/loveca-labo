#!/usr/bin/env node
/** 虹ヶ咲 PR（PL!N-PR）代表カードの分類回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!N-PR-004-PR",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["deck3"]),
  },
  {
    id: "PL!N-PR-003-PR",
    trigger: "kidou",
    expectTemplate: "kidou_reveal_all_hand_deck_top_live",
    check: (cl) =>
      cl.deckTopCount === 5 && cl.filters?.pickType === "ライブ" && cl.filters?.minStageMembers === 2
        ? []
        : ["deck5 live minStage2"],
  },
  {
    id: "PL!N-PR-008-PR",
    trigger: "kidou",
    expectTemplate: "kidou_reveal_all_hand_deck_top_live",
  },
  {
    id: "PL!N-PR-010-PR",
    trigger: "kidou",
    expectTemplate: "kidou_reveal_all_hand_deck_top_live",
  },
  {
    id: "PL!N-PR-020-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!N-PR-020-PR"].ability);
      return rule.exactStageMemberCount === 2 && rule.bladeFlat === 1 ? [] : ["stage2 blade1"];
    },
  },
  {
    id: "PL!N-PR-021-PR",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) =>
      cl.filters?.pickFilterAlternatives?.length === 2 &&
      cl.filters.pickFilterAlternatives[0].maxCost === 2 &&
      cl.filters.pickFilterAlternatives[1].pickMaxScore === 2
        ? []
        : ["member2 or live2"],
  },
  {
    id: "PL!N-PR-022-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_emma_punch_answer",
    check: (cl) => (cl.bladeGain === 1 && cl.requiresConditionConfirm ? [] : ["emma punch"]),
  },
  {
    id: "PL!N-PR-023-PR",
    trigger: "jidou",
    expectTemplate: "jidou_yell_grant_jouji",
    check: () => {
      const rule = classifyJidouAutoSegment(cards["PL!N-PR-023-PR"].ability);
      return rule.minYellSameGroupMemberCount === 3 ? [] : ["group3"];
    },
  },
  {
    id: "PL!N-PR-024-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!N-PR-024-PR"].ability);
      return rule.minCombinedSuccessLive === 4 && rule.bladeFlat === 2 ? [] : ["succ4 blade2"];
    },
  },
  {
    id: "PL!N-PR-025-PR",
    trigger: "jidou",
    expectTemplate: "jidou_enter_or_baton_draw",
    check: () => {
      const rule = classifyJidouAutoSegment(cards["PL!N-PR-025-PR"].ability);
      return rule.eventKind === "enter_or_baton" && rule.deckDrawCount === 1 ? [] : ["enter draw"];
    },
  },
  {
    id: "PL!N-PR-026-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_to_member_under",
    check: (cl) =>
      cl.filters?.seriesTag === "虹ヶ咲" && cl.filters?.maxCost === 9 ? [] : ["niji9 under"],
  },
  {
    id: "PL!N-PR-027-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!N-PR-027-PR"].ability);
      return rule.minTotalMembersBothStages === 6 && rule.heartFlat?.[2] === 1 ? [] : ["both6 heart02"];
    },
  },
  {
    id: "PL!N-PR-028-PR",
    trigger: "toujyou",
    expectTemplate: "draw_until_hand_size",
    check: (cl) => (cl.targetHandSize === 5 ? [] : ["hand5"]),
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
  const raw = cardAbilityRawText(card);
  const seg = splitAbilityByTriggers(raw).find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("NO_SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  if (cl.template !== c.expectTemplate) {
    console.error("TEMPLATE", c.id, "expected", c.expectTemplate, "got", cl.template);
    failed++;
    continue;
  }
  if (!abilityEffectIsAutomated(cl.template) && cl.template !== "passive_track") {
    console.error("NOT_AUTO", c.id, cl.template);
    failed++;
    continue;
  }
  if (c.check) {
    const errs = c.check(cl);
    if (errs.length) {
      console.error("CHECK", c.id, errs.join(", "));
      failed++;
      continue;
    }
  }
  console.log("OK", c.id, c.trigger, cl.template);
}

if (failed) {
  console.error(failed, "failed");
  process.exit(1);
}
console.log("All", CASES.length, "cases passed");
