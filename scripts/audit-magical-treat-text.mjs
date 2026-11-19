#!/usr/bin/env node
/** ブースターパック まじかる♡とり～と: 全レアリティが自動分類であること。新規の手動分類は失敗。 */
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

const KNOWN_UNIMPLEMENTED = new Set();

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
