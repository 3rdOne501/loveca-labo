#!/usr/bin/env node
/** ブースターパック まじかる♡とり～と: 全レアリティの分類診断。未対応は既知集合のみ許可。 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";
import { classifyJidouAutoSegment, jidouEffectIsAutomated } from "../js/jidouAutoEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const PRODUCT = "ブースターパック まじかる♡とり～と";

const KNOWN_UNIMPLEMENTED = new Set([
  "LL-bp8-001-R＋",
  "PL!-bp8-002-P",
  "PL!-bp8-002-R",
  "PL!-bp8-003-P",
  "PL!-bp8-003-P＋",
  "PL!-bp8-003-R＋",
  "PL!-bp8-003-SEC",
  "PL!-bp8-004-P",
  "PL!-bp8-004-R",
  "PL!-bp8-009-P",
  "PL!-bp8-009-P＋",
  "PL!-bp8-009-R＋",
  "PL!-bp8-009-SEC",
  "PL!-bp8-010-N",
  "PL!-bp8-013-N",
  "PL!-bp8-021-L",
  "PL!-bp8-021-SECL",
  "PL!-bp8-023-L",
  "PL!-bp8-023-SECL",
  "PL!-bp8-025-L",
  "PL!HS-bp8-001-P",
  "PL!HS-bp8-001-R",
  "PL!HS-bp8-002-P",
  "PL!HS-bp8-002-R",
  "PL!HS-bp8-003-P",
  "PL!HS-bp8-003-R",
  "PL!HS-bp8-005-P",
  "PL!HS-bp8-005-R",
  "PL!HS-bp8-007-P",
  "PL!HS-bp8-007-P＋",
  "PL!HS-bp8-007-R＋",
  "PL!HS-bp8-007-SEC",
  "PL!HS-bp8-008-P",
  "PL!HS-bp8-008-P＋",
  "PL!HS-bp8-008-R＋",
  "PL!HS-bp8-008-SEC",
  "PL!HS-bp8-014-N",
  "PL!HS-bp8-016-N",
  "PL!HS-bp8-017-L",
  "PL!HS-bp8-017-SECL",
  "PL!HS-bp8-018-L",
  "PL!HS-bp8-018-SECL",
  "PL!HS-bp8-019-L",
  "PL!HS-bp8-020-L",
  "PL!HS-bp8-021-L",
  "PL!HS-bp8-021-SECL",
  "PL!N-bp8-001-P",
  "PL!N-bp8-001-P＋",
  "PL!N-bp8-001-R＋",
  "PL!N-bp8-001-SEC",
  "PL!N-bp8-005-P",
  "PL!N-bp8-005-P＋",
  "PL!N-bp8-005-R＋",
  "PL!N-bp8-005-SEC",
  "PL!N-bp8-008-P",
  "PL!N-bp8-008-R",
  "PL!N-bp8-009-P",
  "PL!N-bp8-009-P＋",
  "PL!N-bp8-009-R＋",
  "PL!N-bp8-009-SEC",
  "PL!N-bp8-010-P",
  "PL!N-bp8-010-R",
  "PL!N-bp8-011-P",
  "PL!N-bp8-011-R",
  "PL!N-bp8-021-N",
  "PL!N-bp8-028-L",
  "PL!N-bp8-029-L",
  "PL!N-bp8-030-L"
]);

function isManualSeg(card, seg) {
  if (seg.trigger === "jouji") return !classifyJoujiSegment(seg.text);
  if (seg.trigger === "jidou") {
    const cl = classifyJidouAutoSegment(seg.text, card) || { template: "jidou_manual" };
    return !jidouEffectIsAutomated(cl.template);
  }
  if (!seg.trigger) return false;
  const cl = classifyCardAbility(card, seg.trigger, seg.text);
  return (
    !abilityEffectIsAutomated(cl.template) &&
    cl.template !== "ability_sequence" &&
    cl.template !== "passive_track"
  );
}

const errors = [];
let scanned = 0;
let unimplemented = 0;
let automated = 0;
let energy = 0;

for (const [id, card] of Object.entries(cards).sort()) {
  if (card.product !== PRODUCT) continue;
  if (card.type === "エネルギー") {
    energy++;
    const raw = cardAbilityRawText(card);
    if (raw && raw.replace(/\{\{[^}]+\}\}/g, "").trim()) {
      errors.push(`${id} energy has ability text`);
    }
    continue;
  }
  const raw = cardAbilityRawText(card) || "";
  if (!raw.trim()) {
    scanned++;
    automated++;
    continue;
  }
  scanned++;
  const segs = splitAbilityByTriggers(raw);
  const manuals = segs.filter((seg) => isManualSeg(card, seg));
  if (manuals.length) {
    unimplemented++;
    if (!KNOWN_UNIMPLEMENTED.has(id)) {
      errors.push(`${id}: new unimplemented ${manuals.map((s) => s.trigger).join(",")}`);
    }
  } else {
    automated++;
    if (KNOWN_UNIMPLEMENTED.has(id)) {
      errors.push(`${id}: was unimplemented, now classified — update docs/magical-treat-verification-list.md`);
    }
  }
}

if (errors.length) {
  console.error("audit-magical-treat-text FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `audit-magical-treat-text OK: scanned=${scanned} automated=${automated} unimplemented=${unimplemented} energy=${energy}`,
);
