#!/usr/bin/env node
/** 任意Eのみコストの自動ウェイト（解決時ダイアログ省略）回帰 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import {
  classifiedAbilityIsOptionalEnergyOnlyCost,
  TEMPLATE_OPTIONAL_ENERGY_ONLY_AUTO_PAY,
} from "../js/abilityRuntimeMeta.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

/** @type {Array<{id:string, trigger:string, check?:(cl:any)=>string[]}>} */
const CASES = [
  {
    id: "PL!SP-pb2-040-N",
    trigger: "live_start",
    check: (cl) =>
      classifiedAbilityIsOptionalEnergyOnlyCost(cl) && cl.costEnergyCount === 1 && cl.bladeGain === 2
        ? []
        : ["auto-pay eligible"],
  },
  {
    id: "PL!HS-PR-018-RM",
    trigger: "live_start",
    check: (cl) =>
      classifiedAbilityIsOptionalEnergyOnlyCost(cl) && cl.costEnergyCount === 1 ? [] : ["auto-pay eligible"],
  },
  {
    id: "PL!SP-bp2-022-N",
    trigger: "live_start",
    check: (cl) =>
      classifiedAbilityIsOptionalEnergyOnlyCost(cl) && cl.template === "optional_energy_blade_until_live_end"
        ? []
        : ["auto-pay eligible"],
  },
  {
    id: "PL!SP-bp4-022-N",
    trigger: "live_start",
    check: (cl) =>
      cl.costEnergyVariable && !classifiedAbilityIsOptionalEnergyOnlyCost(cl) ? [] : ["variable excluded"],
  },
  {
    id: "PL!HS-PR-001-PR",
    trigger: "live_start",
    check: (cl) =>
      cl.template === "optional_energy_blade_until_live_end" &&
      classifiedAbilityIsOptionalEnergyOnlyCost(cl) &&
      cl.costEnergyCount === 2
        ? []
        : ["E2 blade auto-pay"],
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
    console.error("NO_SEG", c.id, c.trigger);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger, seg.text);
  const errs = c.check ? c.check(cl) : [];
  if (errs.length) {
    console.error("FAIL", c.id, errs.join("; "));
    failed++;
  } else {
    console.log("OK", c.id, cl.template);
  }
}

if (!simSrc.includes("classifiedAbilityIsOptionalEnergyOnlyCost")) {
  console.error("FAIL simulator missing classifiedAbilityIsOptionalEnergyOnlyCost");
  failed++;
}
if (!simSrc.includes("autoPayFixedActiveEnergy")) {
  console.error("FAIL simulator missing autoPayFixedActiveEnergy");
  failed++;
}
if (!/pending\.length === 1[\s\S]{0,120}pending\[0\]\.mandatory/.test(simSrc)) {
  console.error("FAIL optional-only pending must not auto-orchestrate (pending[0].mandatory guard)");
  failed++;
}
if (!TEMPLATE_OPTIONAL_ENERGY_ONLY_AUTO_PAY.includes("optional_energy_blade_until_live_end")) {
  console.error("FAIL template list missing optional_energy_blade_until_live_end");
  failed++;
}

if (failed) {
  console.error(`\n${failed} optional-energy-auto-pay case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} optional-energy-auto-pay cases passed`);
