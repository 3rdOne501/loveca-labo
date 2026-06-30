#!/usr/bin/env node
/** Liella! PR（PL!SP-PR）代表カードの分類回帰 */
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!SP-PR-004-PR",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
  },
  {
    id: "PL!SP-PR-003-PR",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.filters?.minEnergyCount === 7 ? [] : ["energy7"]),
  },
  {
    id: "PL!SP-PR-009-PR",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = (cl.steps || []).map((s) => s.template);
      if (!steps.includes("grant_jouji_session") || !steps.includes("followup_draw_if_live_discarded")) {
        return ["steps " + steps.join(",")];
      }
      if (!cl.handDiscardToWaiting || !cl.hasOptionalCost) return ["optional hand cost"];
      const grant = cl.steps.find((s) => s.template === "grant_jouji_session");
      return grant?.bladeGain === 1 ? [] : ["blade1"];
    },
  },
  {
    id: "PL!SP-PR-010-PR",
    trigger: "toujyou",
    expectTemplate: "draw_from_deck",
    check: (cl) => (cl.filters?.minEnergyCount === 7 ? [] : ["energy7"]),
  },
  {
    id: "PL!SP-PR-011-PR",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) => {
      const steps = (cl.steps || []).map((s) => s.template);
      return steps.includes("followup_draw_if_live_discarded") ? [] : ["followup draw"];
    },
  },
  {
    id: "PL!SP-PR-012-PR",
    trigger: "live_start",
    expectTemplate: "ability_sequence",
    check: (cl) => (cl.handDiscardToWaiting === 1 && cl.hasOptionalCost ? [] : ["hand cost"]),
  },
  {
    id: "PL!SP-PR-016-PR",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check: (cl) =>
      cl.filters?.pickFilterAlternatives?.length === 2 ? [] : ["member or live pick"],
  },
  {
    id: "PL!SP-PR-017-PR",
    trigger: "kidou",
    expectTemplate: "draw_from_deck",
    check: (cl) =>
      cl.costSelfWait && cl.handDiscardToWaiting === 1 && cl.deckDrawCount === 1 ? [] : ["wait discard draw"],
  },
  {
    id: "PL!SP-PR-018-PR",
    trigger: "live_success",
    expectTemplate: "yell_resolution_count_energy_wait",
    check: (cl) =>
      cl.filters?.seriesTag === "Liella!" && cl.minResolutionCards === 7 ? [] : ["liella7 energy"],
  },
  {
    id: "PL!SP-PR-020-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_hand_stage_enter",
    check: (cl) =>
      cl.requiresBatonFromLowerCostMember && cl.filters?.maxCost === 4 ? [] : ["baton c4"],
  },
  {
    id: "PL!SP-PR-021-PR",
    trigger: "live_start",
    expectTemplate: "live_start_opp_wait_if_stage_hearts",
    check: (cl) =>
      cl.minStageHeartTotal === 5 && cl.oppWaitMaxCost === 2 ? [] : ["heart5 opp2"],
  },
  {
    id: "PL!SP-PR-022-PR",
    trigger: "jouji",
    expectTemplate: "passive_track",
    check: () => {
      const rule = classifyJoujiSegment(cards["PL!SP-PR-022-PR"].ability);
      return rule.minTotalMembersBothStages === 6 && rule.heartFlat?.[2] === 1 ? [] : ["both6 heart02"];
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
  if (!abilityEffectIsAutomated(cl.template) && cl.template !== "passive_track" && cl.template !== "ability_sequence") {
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
