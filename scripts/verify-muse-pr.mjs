#!/usr/bin/env node
/** μ's PR（PL!-PR）代表カードの分類回帰 */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!-PR-001-PR",
    trigger: "jidou",
    expectTemplate: "jidou_leave_stage_activate_one",
    check: (_cl, seg) =>
      classifyJidouAutoSegment(seg.text).eventKind === "leave_stage" ? [] : ["eventKind leave_stage"],
  },
  {
    id: "PL!-PR-002-PR",
    trigger: "jidou",
    expectTemplate: "jidou_leave_stage_activate_one",
  },
  {
    id: "PL!-PR-003-PR",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.handDiscardToWaiting === 2 &&
      cl.filters?.minNeedHeartSlot === 3 &&
      cl.filters?.minNeedHeartValue === 3
        ? []
        : ["discard2 heart03x3"],
  },
  {
    id: "PL!-PR-004-PR",
    trigger: "kidou",
    expectTemplate: "kidou_hand_cost_wait_pick_hand",
    check: (cl) =>
      cl.filters?.minNeedHeartSlot === 1 && cl.filters?.minNeedHeartValue === 3 ? [] : ["heart01x3"],
  },
  {
    id: "PL!-PR-005-PR",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
    check: (cl) =>
      (cl.abilityChoices || []).some((c) => /すべてのコスト2以下/.test(c)) ? [] : ["opp wait all c2 choice"],
  },
  {
    id: "PL!-PR-006-PR",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
  },
  {
    id: "PL!-PR-007-PR",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.filters?.maxCost === 4 ? [] : ["opp c4"]),
  },
  {
    id: "PL!-PR-007-PR",
    trigger: "live_start",
    expectTemplate: "optional_self_wait_opp_stage",
    check: (cl) => (cl.costSelfWait && cl.oppWaitMaxCost === 4 ? [] : ["live_start self-wait opp c4"]),
  },
  {
    id: "PL!-PR-008-PR",
    trigger: "toujyou",
    expectTemplate: "ability_pick_one",
  },
  {
    id: "PL!-PR-009-PR",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
  },
  {
    id: "PL!-PR-009-PR",
    trigger: "live_start",
    expectTemplate: "optional_self_wait_opp_stage",
  },
  {
    id: "PL!-PR-012-PR",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.costSelfWait && cl.handDiscardToWaiting === 1 && cl.deckDrawCount === 1 ? [] : ["wait discard draw"],
  },
  {
    id: "PL!-PR-014-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_hand_reveal_no_live_draw",
  },
  {
    id: "PL!-PR-015-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_hand_stage_enter",
    check: (cl) =>
      cl.requiresBatonFromLowerCostMember && cl.filters?.maxCost === 4 ? [] : ["baton low c4"],
  },
  {
    id: "PL!-PR-017-PR",
    trigger: "kidou",
    expectTemplate: "kidou_stage_wait_pick_hand",
    check: (cl) =>
      cl.filters?.seriesTag === "μ's" &&
      cl.filters?.minSuccessLiveScoreSum === 9 &&
      cl.energyActiveCount === 2
        ? []
        : ["mus sl9 E2"],
  },
  {
    id: "PL!-PR-018-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.filters?.minScore === 6 ? [] : ["score6"]),
  },
];

/** @type {string[]} */
const errors = [];

for (const tc of CASES) {
  const card = cards[tc.id];
  if (!card) {
    errors.push(`${tc.id}: card missing`);
    continue;
  }
  const raw = cardAbilityRawText(card);
  const segs = splitAbilityByTriggers(raw);
  const seg = tc.segHint
    ? segs.find((s) => s.trigger === tc.trigger && tc.segHint.test(s.text))
    : segs.find((s) => s.trigger === tc.trigger);
  if (!seg) {
    errors.push(`${tc.id}: trigger ${tc.trigger} missing`);
    continue;
  }
  const cl = classifyCardAbility(card, tc.trigger, seg.text);
  if (tc.trigger === "jidou") {
    const jcl = classifyJidouAutoSegment(seg.text);
    if (jcl.template !== tc.expectTemplate) {
      errors.push(`${tc.id} ${tc.trigger}: expected ${tc.expectTemplate}, got ${jcl.template}`);
      continue;
    }
    if (!abilityEffectIsAutomated(jcl.template)) {
      errors.push(`${tc.id} ${tc.trigger}: not automated`);
      continue;
    }
    if (tc.check) {
      const sub = tc.check(cl, seg);
      if (sub.length) errors.push(`${tc.id} ${tc.trigger}: ${sub.join(", ")}`);
    }
    continue;
  }
  if (cl.template !== tc.expectTemplate) {
    errors.push(`${tc.id} ${tc.trigger}: expected ${tc.expectTemplate}, got ${cl.template}`);
    continue;
  }
  if (!abilityEffectIsAutomated(cl.template) && cl.template !== "passive_track") {
    errors.push(`${tc.id} ${tc.trigger}: not automated`);
    continue;
  }
  if (tc.check) {
    const sub = tc.check(cl);
    if (sub.length) errors.push(`${tc.id} ${tc.trigger}: ${sub.join(", ")}`);
  }
}

if (errors.length) {
  console.error(`${errors.length} verify-muse-pr failure(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log(`verify-muse-pr OK (${CASES.length} cases)`);
