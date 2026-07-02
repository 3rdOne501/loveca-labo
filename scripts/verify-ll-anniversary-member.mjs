#!/usr/bin/env node
/** アニバーサリー クロスメンバー（LL-bp*-001-R＋）代表カードの分類・パターン回帰 */
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
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

/** @type {Array<{id:string, trigger:string, expectTemplate?:string, check?:(cl:any, seg?:any)=>string[]}>} */
const CASES = [
  {
    id: "LL-bp1-001-R＋",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
  },
  {
    id: "LL-bp1-001-R＋",
    trigger: "live_start",
    expectTemplate: "live_start_hand_named_discard_grant_jouji",
    check(cl) {
      const e = [];
      if ((cl.characterNames || []).length !== 3) e.push("characterNames!=3");
      if (cl.handDiscardTotalCount !== 3) e.push("handDiscardTotalCount!=3");
      if (/live_start_hand_named_discard_grant_jouji[\s\S]*?minPick:\s*needHandN/.test(simSrc)) {
        e.push("optional named discard must allow minPick 0");
      }
      return e;
    },
  },
  {
    id: "LL-bp2-001-R＋",
    trigger: "live_start",
    expectTemplate: "live_start_hand_discard_blade_per",
    check(cl) {
      const e = [];
      if (cl.bladeGain !== 1) e.push("bladeGain!=1");
      if ((cl.characterNames || []).length !== 3) e.push("characterNames");
      if (!simSrc.includes("String(h.id) === String(inst.id)")) e.push("self-discard");
      return e;
    },
  },
  {
    id: "LL-bp3-001-R＋",
    trigger: "kidou",
    expectTemplate: "kidou_wait_shuffle_deck_bottom_activate",
    check(cl) {
      const e = [];
      if (cl.waitPickCount !== 6) e.push("waitPickCount!=6");
      if (cl.energyActiveCount !== 6) e.push("energyActiveCount!=6");
      if (!simSrc.includes("memberNameMatchesCharacter(nm, charFilter")) e.push("name match");
      return e;
    },
  },
  {
    id: "LL-bp3-001-R＋",
    trigger: "live_start",
    expectTemplate: "optional_energy_blade_until_live_end",
    check(cl) {
      return cl.costEnergyCount === 6 && cl.bladeGain === 3 ? [] : ["E6 blade3"];
    },
  },
  {
    id: "LL-bp4-001-R＋",
    trigger: "toujyou",
    expectTemplate: "deck_peek_pick_then_opp_wait",
    check(cl) {
      const e = [];
      if (cl.deckPeekCount !== 5) e.push("peek!=5");
      if ((cl.pickNamedMembers || []).length !== 3) e.push("names");
      if (cl.oppWaitMaxPrintedBlade !== 3) e.push("oppBlade3");
      return e;
    },
  },
  {
    id: "LL-bp4-001-R＋",
    trigger: "live_start",
    expectTemplate: "deck_peek_pick_then_opp_wait",
    check(cl) {
      return cl.oppWaitCostFromPicked ? [] : ["oppWaitCostFromPicked"];
    },
  },
  {
    id: "LL-bp6-001-R＋",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check(cl) {
      return cl.deckTopCount === 6 && cl.deckTopPickMax === 2 ? [] : ["deck6 pick2"];
    },
  },
  {
    id: "LL-bp6-001-R＋",
    trigger: "live_start",
    expectTemplate: "live_start_hand_named_discard_hearts_grant",
    check(cl) {
      const e = [];
      if ((cl.characterNames || []).length !== 3) e.push("characterNames");
      if (!simSrc.includes("grantUnionHeartColorsFromDiscardedUntilLiveEnd")) {
        e.push("union heart grant helper");
      }
      if (!simSrc.includes("playBonusHeartSlotsAlways")) e.push("live-end hearts");
      return e;
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
    console.error("MISSING SEGMENT", c.id, c.trigger);
    failed++;
    continue;
  }
  if (c.trigger === "jouji") {
    const rule = classifyJoujiSegment(seg.text);
    if (!rule) {
      failed++;
      console.error("FAIL", c.id, c.trigger, "jouji unparsed");
    } else {
      console.log("OK", c.id, c.trigger, rule.kind);
    }
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = [];
  if (c.expectTemplate && cl.template !== c.expectTemplate) {
    errs.push(`template ${cl.template} != ${c.expectTemplate}`);
  }
  if (cl.template === "guided_manual") errs.push("guided_manual");
  if (cl.template && !abilityEffectIsAutomated(cl.template) && cl.template !== "ability_sequence") {
    errs.push(`not automated: ${cl.template}`);
  }
  if (c.check) errs.push(...c.check(cl, seg));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, cl.template);
  }
}

// LL-bp2 jouji segments
const bp2 = cards["LL-bp2-001-R＋"];
if (bp2) {
  for (const s of splitAbilityByTriggers(cardAbilityRawText(bp2))) {
    if (s.trigger !== "jouji") continue;
    const rule = classifyJoujiSegment(s.text);
    const plain = s.text.replace(/\{\{[^}]+\}\}/g, "");
    const want =
      /手札1枚につき.*1少なく/.test(plain.replace(/\s+/g, ""))
        ? "hand_cost_per_other_hand"
        : /バトンタッチで控え室に置けない/.test(plain.replace(/\s+/g, ""))
          ? "cannot_baton_to_waiting"
          : null;
    if (!rule || (want && rule.kind !== want)) {
      failed++;
      console.error("FAIL", "LL-bp2-001-R＋", "jouji", want, rule?.kind);
    } else {
      console.log("OK", "LL-bp2-001-R＋", "jouji", rule.kind);
    }
  }
}

if (failed) {
  console.error(`\n${failed} ll-anniversary-member case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} ll-anniversary-member cases passed`);
