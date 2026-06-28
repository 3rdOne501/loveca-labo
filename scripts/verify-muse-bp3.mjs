#!/usr/bin/env node
/** μ's bp3 / 夏、はじまる。（PL!-bp3）代表カードの分類・パターン回帰 */
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
    id: "PL!-bp3-003-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "μ's" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!-bp3-004-P",
    trigger: "toujyou",
    expectTemplate: "draw_per_stage_member_discard",
  },
  {
    id: "PL!-bp3-004-P",
    trigger: "live_start",
    expectTemplate: "toujou_success_live_pick_hand",
    check: (cl) => (cl.filters?.seriesTag === "μ's" ? [] : ["seriesTag"]),
  },
  {
    id: "PL!-bp3-007-P",
    trigger: "live_start",
    expectTemplate: "deck_top_pick_recover",
    check: (cl) => (cl.deckTopCount === 3 ? [] : ["deckTopCount"]),
  },
  { id: "PL!-bp3-009-P", trigger: "kidou", expectTemplate: "heart_color_pick_grant" },
  {
    id: "PL!-bp3-022-L",
    trigger: "live_start",
    expectTemplate: "live_start_deck_reveal_both_stage_members_score",
  },
  {
    id: "PL!-bp3-023-L",
    trigger: "live_start",
    expectTemplate: "live_start_need_heart_reduce_fixed",
    check: (cl) =>
      cl.needHeartReduceMap?.heart0 === 2 ? [] : ["needHeartReduceMap"],
  },
  {
    id: "PL!-bp3-024-L",
    trigger: "live_start",
    expectTemplate: "heart_color_pick_grant",
  },
  {
    id: "PL!-bp3-026-L",
    trigger: "live_success",
    expectTemplate: "live_card_score_plus",
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

if (failed) {
  console.error(`\n${failed} muse-bp3 case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} muse-bp3 cases passed`);
