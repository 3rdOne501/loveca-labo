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

  execSync("node scripts/verify-dual-mode-smoke.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-versus-online-static.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-play-checklist.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-deck-pick-hand-patterns.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-niji-bp1.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-niji-bp1-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-liella-bp1.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-liella-bp1-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-hasunosora-bp1.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-hasunosora-bp1-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-hasunosora-pb1.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-hasunosora-pb1-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-hasunosora-bp2.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-hasunosora-bp2-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-liella-bp2.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-liella-bp2-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-liella-pb2.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-liella-pb2-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-aqours-bp2.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-aqours-bp2-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-niji-bp3.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-niji-bp3-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-aqours-bp3.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-aqours-bp3-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-muse-bp3.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-muse-bp3-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-niji-bp4.mjs", { cwd: ROOT, stdio: "inherit" });
  execSync("node scripts/verify-liella-bp4.mjs", { cwd: ROOT, stdio: "inherit" });
  execSync("node scripts/verify-mus-bp4.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-niji-bp4-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-ll-anniversary-member.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-ll-anniversary-member-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-muse-bp5.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-muse-bp5-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-aqours-bp5.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-aqours-bp5-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-niji-bp5.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-niji-bp5-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-liella-bp5.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-liella-bp5-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/verify-hasunosora-bp5.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-hasunosora-bp5-text.mjs", { cwd: ROOT, stdio: "inherit" });

  execSync("node scripts/audit-verification-list-notes.mjs", { cwd: ROOT, stdio: "inherit" });

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
