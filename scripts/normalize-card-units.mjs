#!/usr/bin/env node
import fs from "node:fs";
import { canonicalizeUnitName } from "../js/cardGroups.js";

const file = process.argv[2];
if (!file) throw new Error("usage: node scripts/normalize-card-units.mjs <cards.json>");
const cards = JSON.parse(fs.readFileSync(file, "utf8"));
let changed = 0;
for (const card of Object.values(cards)) {
  if (!card || typeof card !== "object" || !card.unit) continue;
  const unit = canonicalizeUnitName(card.unit);
  if (unit !== card.unit) { card.unit = unit; changed++; }
}
if (changed) fs.writeFileSync(file, JSON.stringify(cards, null, 4) + "\n");
console.log(`normalize-card-units: ${changed} cards normalized`);
