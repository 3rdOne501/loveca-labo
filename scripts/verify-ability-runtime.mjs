#!/usr/bin/env node
/**
 * 能力実行の静的監査（handler 存在に加え、到達不能パス・sequence 整合を検査）。
 * 用法: node scripts/verify-ability-runtime.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { abilityEffectIsAutomated } from "../js/abilityEffects.js";
import { jidouEffectIsAutomated } from "../js/jidouAutoEffects.js";
import {
  JIDOU_AUTO_TEMPLATES,
  TEMPLATES_META_IN_EXECUTE_BODY,
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

/** @param {string} src @param {string} startMarker @param {string} endMarker */
function sectionBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return src.slice(start, end);
}

function loadHandlerTemplates(simSrc) {
  const executeBodyChunk = sectionBetween(
    simSrc,
    "function executeAbilityBody(inst, cl, kind, finishResolved, finishGuided)",
    "\n  function removeStageMemberToWaiting(memberInst)",
  );
  const runJidouChunk = sectionBetween(
    simSrc,
    "function runJidouAutoEffect(memberInst, cl, segRaw, segIndex, ctx)",
    "function finishJidouAutoRender()",
  );
  return {
    executeBody: templatesFromChunk(executeBodyChunk),
    runJidou: templatesFromChunk(runJidouChunk),
    executeBodyChunk,
  };
}

function templateHasHandler(template, handlers) {
  if (TEMPLATES_META_IN_EXECUTE_BODY.includes(template)) return true;
  if (JIDOU_AUTO_TEMPLATES.includes(template)) {
    return handlers.runJidou.has(template) || handlers.executeBody.has(template);
  }
  return handlers.executeBody.has(template);
}

function checkAbilitySequenceSteps() {
  /** @type {string[]} */
  const errors = [];
  for (const tr of ["kidou", "toujyou", "live_start", "live_success"]) {
    const idx = JSON.parse(read(`data/${tr}-index.json`));
    for (const row of idx.cards || []) {
      if (row.template !== "ability_sequence") continue;
      const steps = row.steps || [];
      if (steps.length < 2) {
        errors.push(`${row.card_no} ${tr}: ability_sequence has ${steps.length} step(s)`);
        continue;
      }
      for (let si = 0; si < steps.length; si++) {
        const st = steps[si];
        const stepTemplate = typeof st === "string" ? st : st && st.template;
        if (!stepTemplate) {
          errors.push(`${row.card_no} ${tr}: step ${si} missing template`);
        }
      }
    }
  }
  return errors;
}

function checkPreconditionConsistency(simSrc) {
  /** @type {string[]} */
  const warnings = [];
  const checks = [
    {
      name: "checkAbilityLiveSuccessPreconditions",
      mustInclude: ["checkAbilityBoardPickFilters", "checkAbilityLiveSuccessAreaFilters"],
    },
    {
      name: "checkAbilityLiveStartPreconditions",
      mustInclude: ["checkAbilityBoardPickFilters", "checkAbilityLiveSuccessAreaFilters"],
    },
    {
      name: "checkAbilityToujouPreconditions",
      mustInclude: ["checkAbilityBoardPickFilters", "checkAbilityLiveSuccessAreaFilters"],
    },
    {
      name: "checkAbilityKidouPreconditions",
      mustInclude: ["checkAbilityBoardPickFilters"],
      mustExclude: ["checkAbilityLiveSuccessAreaFilters"],
    },
  ];
  for (const c of checks) {
    const re = new RegExp(`function ${c.name}\\([\\s\\S]*?\\n  \\}`, "m");
    const m = simSrc.match(re);
    if (!m) {
      warnings.push(`${c.name} not found in simulator.js`);
      continue;
    }
    const body = m[0];
    for (const need of c.mustInclude || []) {
      if (!body.includes(need)) warnings.push(`${c.name} should call ${need}`);
    }
    for (const ban of c.mustExclude || []) {
      if (body.includes(ban)) warnings.push(`${c.name} should not call ${ban}`);
    }
  }
  return warnings;
}

/** executeAbilityBody 内: showToast 直後 return で finishResolved/finishGuided 未到達 */
function checkExecuteBodyAbortPaths(executeBodyChunk) {
  /** @type {string[]} */
  const errors = [];
  const lines = executeBodyChunk.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/showToast\(/.test(lines[i])) continue;
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      if (!/^\s+return;\s*$/.test(lines[j])) continue;
      const block = lines.slice(i, j + 1).join("\n");
      if (block.includes("finishResolved") || block.includes("finishGuided") || block.includes("abortResolved")) {
        break;
      }
      errors.push(`executeAbilityBody showToast→return without finish (near line ${i + 1} in body)`);
      break;
    }
  }
  return errors;
}

function checkRegressionHelpers(simSrc) {
  /** @type {string[]} */
  const errors = [];
  if (!simSrc.includes("successLiveAreaLiveCardCount")) {
    errors.push("successLiveAreaLiveCardCount helper missing");
  }
  if (!/function successLiveAreaLiveCardCount[\s\S]*?T_LIVE/.test(simSrc)) {
    errors.push("successLiveAreaLiveCardCount should filter T_LIVE only");
  }
  if (!simSrc.includes("playBonusLiveScore")) {
    errors.push("playBonusLiveScore scoring path missing");
  }
  if (!simSrc.includes("liveScoreEffectBonus")) {
    errors.push("liveScoreEffectBonus scoring path missing");
  }
  if (!/戻すカードはドロー時点では山札に含めない/.test(simSrc)) {
    errors.push("mulligan: draw-before-return comment/logic missing");
  }
  if (!/count != null && Number.isFinite\(Number\(count\)\)/.test(simSrc)) {
    errors.push("grantHeartSlotUntilLiveEnd: zero-count guard missing");
  }
  return errors;
}

function main() {
  execSync("node scripts/build-ability-index.mjs", { cwd: ROOT, stdio: "pipe" });

  const simSrc = read("js/simulator.js");
  const handlers = loadHandlerTemplates(simSrc);

  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  errors.push(...checkExecuteBodyAbortPaths(handlers.executeBodyChunk));
  errors.push(...checkRegressionHelpers(simSrc));
  warnings.push(...checkPreconditionConsistency(simSrc));
  errors.push(...checkAbilitySequenceSteps());

  /** ability_sequence の各 step template に handler があるか */
  for (const tr of ["kidou", "toujyou", "live_start", "live_success"]) {
    const idx = JSON.parse(read(`data/${tr}-index.json`));
    for (const row of idx.cards || []) {
      if (row.template !== "ability_sequence") continue;
      for (const st of row.steps || []) {
        const t = typeof st === "string" ? st : st && st.template;
        if (!t || t === "none" || t === "guided_manual") continue;
        if (!abilityEffectIsAutomated(t) && !jidouEffectIsAutomated(t)) {
          warnings.push(`${row.card_no} ${tr} sequence step "${t}" not automated`);
          continue;
        }
        if (!templateHasHandler(t, handlers)) {
          errors.push(`${row.card_no} ${tr} sequence step "${t}" missing handler`);
        }
      }
    }
  }

  /** automated template（index 出現分）の handler 再確認 */
  /** @type {Set<string>} */
  const indexTemplates = new Set();
  for (const tr of ["kidou", "toujyou", "live_start", "live_success"]) {
    const idx = JSON.parse(read(`data/${tr}-index.json`));
    for (const row of idx.cards || []) {
      if (row.template) indexTemplates.add(row.template);
      for (const st of row.steps || []) {
        if (st && st.template) indexTemplates.add(st.template);
        else if (typeof st === "string") indexTemplates.add(st);
      }
    }
  }
  const jidouIdx = JSON.parse(read("data/jidou-index.json"));
  for (const row of jidouIdx.cards || []) {
    if (row.template) indexTemplates.add(row.template);
  }

  for (const t of indexTemplates) {
    if (t === "none" || TEMPLATES_META_IN_EXECUTE_BODY.includes(t)) continue;
    const auto = abilityEffectIsAutomated(t) || jidouEffectIsAutomated(t);
    if (!auto) continue;
    if (!templateHasHandler(t, handlers)) {
      errors.push(`index template "${t}" missing handler (runtime check)`);
    }
  }

  console.log("=== verify-ability-runtime ===\n");
  console.log(`executeAbilityBody handlers: ${handlers.executeBody.size}`);
  console.log(`runJidouAutoEffect handlers: ${handlers.runJidou.size}`);
  console.log(`index templates checked: ${indexTemplates.size}`);

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.slice(0, 20).forEach((w) => console.log("  ! " + w));
    if (warnings.length > 20) console.log(`  ... +${warnings.length - 20} more`);
  }

  if (errors.length) {
    console.error(`\nFAILED (${errors.length}):`);
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  console.log("\nverify-ability-runtime OK");
}

main();
