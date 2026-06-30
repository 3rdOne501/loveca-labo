#!/usr/bin/env node
/** 全スクール PR: verify + audit を一括実行 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCRIPTS = [
  "verify-muse-pr.mjs",
  "audit-muse-pr-text.mjs",
  "verify-aqours-pr.mjs",
  "audit-aqours-pr-text.mjs",
  "verify-niji-pr.mjs",
  "audit-niji-pr-text.mjs",
  "verify-liella-pr.mjs",
  "audit-liella-pr-text.mjs",
  "verify-hasunosora-pr.mjs",
  "audit-hasunosora-pr-text.mjs",
  "verify-ll-pr.mjs",
  "audit-ll-pr-text.mjs",
];

let failed = 0;
for (const name of SCRIPTS) {
  const r = spawnSync("node", [path.join(ROOT, "scripts", name)], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const last = out.trim().split("\n").filter(Boolean).pop() || "";
  if (r.status !== 0) {
    failed++;
    console.error("FAIL", name);
    console.error(out.trim());
  } else {
    console.log("OK", name, "—", last);
  }
}

if (failed) {
  console.error(`\n${failed} PR script(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${SCRIPTS.length} PR scripts passed`);
