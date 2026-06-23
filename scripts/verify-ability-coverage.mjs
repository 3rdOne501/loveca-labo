#!/usr/bin/env node
/**
 * 能力カバレッジの回帰チェック（命令23）。
 * 用法: node scripts/verify-ability-coverage.mjs
 * 失敗時 exit 1 — CI や sync 前の smoke に使える。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {Record<string, { maxManual?: number, minAutomated?: number }>} */
const THRESHOLDS = {
  kidou: { maxManual: 30 },
  toujyou: { maxManual: 80 },
  live_start: { maxManual: 45 },
  live_success: { maxManual: 20 },
  jidou: { maxManual: 0, minAutomated: 90 },
};

function loadIndex(name) {
  return JSON.parse(readFileSync(join(ROOT, "data", name), "utf8"));
}

function main() {
  execSync("node scripts/build-ability-index.mjs", { cwd: ROOT, stdio: "pipe" });

  /** @type {string[]} */
  const errors = [];
  let autoTotal = 0;
  let manualTotal = 0;

  for (const trigger of ["kidou", "toujyou", "live_start", "live_success"]) {
    const idx = loadIndex(`${trigger}-index.json`);
    const manual = idx.cards.filter((c) => c.template === "guided_manual" || c.automated === false).length;
    const automated = idx.total - manual;
    autoTotal += automated;
    manualTotal += manual;
    const th = THRESHOLDS[trigger];
    console.log(`${trigger}: total=${idx.total} automated=${automated} manual=${manual}`);
    if (th.maxManual != null && manual > th.maxManual) {
      errors.push(`${trigger} manual ${manual} exceeds max ${th.maxManual}`);
    }
  }

  const jidou = loadIndex("jidou-index.json");
  const jidouManual = jidou.cards.filter((c) => c.template === "jidou_manual").length;
  const jidouAuto = jidou.cards.length - jidouManual;
  console.log(`jidou: total=${jidou.cards.length} automated=${jidouAuto} manual=${jidouManual}`);
  if (jidouManual > (THRESHOLDS.jidou.maxManual ?? 0)) {
    errors.push(`jidou manual ${jidouManual} exceeds max ${THRESHOLDS.jidou.maxManual}`);
  }
  if (jidouAuto < (THRESHOLDS.jidou.minAutomated ?? 0)) {
    errors.push(`jidou automated ${jidouAuto} below min ${THRESHOLDS.jidou.minAutomated}`);
  }

  autoTotal += jidouAuto;
  manualTotal += jidouManual;
  console.log(`\n合計: automated=${autoTotal} guided_manual=${manualTotal}`);

  execSync("node scripts/verify-ability-handlers.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-p2-ability-smoke.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node --check js/abilityEffects.js js/joujiEffects.js js/jidouAutoEffects.js js/abilityRuntimeMeta.js js/simulator.js", {
    cwd: ROOT,
    stdio: "inherit",
  });

  if (errors.length) {
    console.error("\nverify-ability-coverage FAILED:");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }
  console.log("\nverify-ability-coverage OK");
}

main();
