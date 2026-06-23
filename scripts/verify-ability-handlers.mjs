#!/usr/bin/env node
/**
 * abilityEffects の automated template と simulator の handler 実装の対応を検査。
 * 用法: node scripts/verify-ability-handlers.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { abilityEffectIsAutomated } from "../js/abilityEffects.js";
import { jidouEffectIsAutomated } from "../js/jidouAutoEffects.js";
import {
  JIDOU_AUTO_TEMPLATES,
  TEMPLATE_HANDLES_OWN_COST,
  TEMPLATES_META_IN_EXECUTE_BODY,
  ABILITY_PLACEMENT_RUNTIME_TEMPLATES,
  OPPONENT_DUAL_DELEGATE_HELPERS,
} from "../js/abilityRuntimeMeta.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string} path @returns {string} */
function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

/** @param {string} chunk @returns {Set<string>} */
function templatesFromChunk(chunk) {
  const set = new Set();
  const re = /cl\.template\s*===\s*["']([a-z0-9_]+)["']/g;
  let m;
  while ((m = re.exec(chunk))) set.add(m[1]);
  return set;
}

/** @param {string} src @returns {Set<string>} */
function templatesFromTypedef(src) {
  const set = new Set();
  const re = /\|'([a-z0-9_]+)'/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] !== "AbilityTemplate") set.add(m[1]);
  }
  return set;
}

/** @param {string} src @param {string} startMarker @param {string} endMarker */
function sectionBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return src.slice(start, end);
}

function loadIndexTemplates() {
  /** @type {Set<string>} */
  const used = new Set();
  for (const tr of ["kidou", "toujyou", "live_start", "live_success"]) {
    const idx = JSON.parse(read(`data/${tr}-index.json`));
    for (const row of idx.cards || []) {
      if (row.template) used.add(row.template);
    }
  }
  const jidou = JSON.parse(read("data/jidou-index.json"));
  for (const row of jidou.cards || []) {
    if (row.template) used.add(row.template);
  }
  return used;
}

function main() {
  const abilitySrc = read("js/abilityEffects.js");
  const simSrc = read("js/simulator.js");
  const typedefAll = templatesFromTypedef(abilitySrc);
  const indexTemplates = loadIndexTemplates();

  /** @type {Set<string>} */
  const automated = new Set();
  for (const t of typedefAll) {
    if (abilityEffectIsAutomated(t)) automated.add(t);
  }
  for (const t of indexTemplates) {
    if (abilityEffectIsAutomated(t)) automated.add(t);
  }

  /** @type {Set<string>} */
  const jidouAutomated = new Set(JIDOU_AUTO_TEMPLATES);
  for (const t of indexTemplates) {
    if (jidouEffectIsAutomated(t)) jidouAutomated.add(t);
  }

  const executeBodyChunk = sectionBetween(
    simSrc,
    "function executeAbilityBody(inst, cl, kind, finishResolved, finishGuided)",
    "\n  function removeStageMemberToWaiting(memberInst)",
  );
  const executeBodyTemplates = templatesFromChunk(executeBodyChunk);

  const runJidouChunk = sectionBetween(
    simSrc,
    "function runJidouAutoEffect(memberInst, cl, segRaw, segIndex, ctx)",
    "function finishJidouAutoRender()",
  );
  const runJidouTemplates = templatesFromChunk(runJidouChunk);

  const placementRuntime = new Set(ABILITY_PLACEMENT_RUNTIME_TEMPLATES);

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  for (const t of automated) {
    if (t === "none" || TEMPLATES_META_IN_EXECUTE_BODY.includes(t)) continue;
    if (placementRuntime.has(t)) continue;
    if (jidouAutomated.has(t)) {
      if (!runJidouTemplates.has(t) && !executeBodyTemplates.has(t)) {
        warnings.push(`automated jidou "${t}" has no runJidouAutoEffect / executeAbilityBody handler`);
      }
      continue;
    }
    if (!executeBodyTemplates.has(t)) {
      errors.push(`automated template "${t}" missing executeAbilityBody handler`);
    }
  }

  for (const t of executeBodyTemplates) {
    if (TEMPLATES_META_IN_EXECUTE_BODY.includes(t) || t === "none") continue;
    if (jidouAutomated.has(t)) {
      warnings.push(`executeAbilityBody references jidou template "${t}" (prefer runJidouAutoEffect only)`);
    }
    if (!automated.has(t)) {
      warnings.push(`executeAbilityBody handler "${t}" not in abilityEffectIsAutomated`);
    }
  }

  for (const t of TEMPLATE_HANDLES_OWN_COST) {
    if (!simSrc.includes("templateHandlesOwnCost")) {
      errors.push("simulator.js must use templateHandlesOwnCost from abilityRuntimeMeta.js");
      break;
    }
    if (!automated.has(t) && !jidouAutomated.has(t)) {
      warnings.push(`TEMPLATE_HANDLES_OWN_COST "${t}" not automated`);
    }
  }

  for (const t of ABILITY_PLACEMENT_RUNTIME_TEMPLATES) {
    if (!automated.has(t)) {
      warnings.push(`ABILITY_PLACEMENT_RUNTIME "${t}" not automated`);
    }
    if (!simSrc.includes("placeLiveOnSuccessLiveArea")) {
      errors.push(`placement runtime template "${t}" requires placeLiveOnSuccessLiveArea in simulator.js`);
    }
  }

  console.log("=== verify-ability-handlers ===\n");
  console.log(`typedef templates: ${typedefAll.size}`);
  console.log(`index templates: ${indexTemplates.size}`);
  console.log(`automated (abilityEffectIsAutomated): ${automated.size}`);
  console.log(`jidou automated: ${jidouAutomated.size}`);
  console.log(`executeAbilityBody handlers: ${executeBodyTemplates.size}`);
  console.log(`runJidouAutoEffect handlers: ${runJidouTemplates.size}`);
  console.log(`TEMPLATE_HANDLES_OWN_COST: ${TEMPLATE_HANDLES_OWN_COST.length}`);
  console.log(`ABILITY_PLACEMENT_RUNTIME: ${ABILITY_PLACEMENT_RUNTIME_TEMPLATES.length}`);

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.slice(0, 25).forEach((w) => console.log("  ! " + w));
    if (warnings.length > 25) console.log(`  ... +${warnings.length - 25} more`);
  }

  if (errors.length) {
    console.error(`\nFAILED (${errors.length}):`);
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  console.log("\nverify-ability-handlers OK");
}

main();
