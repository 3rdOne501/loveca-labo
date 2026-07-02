#!/usr/bin/env node
/**
 * docs/*-verification-list.md: 代表IDの存在と、備考の明らかな誤り（他カードコピー等）を検出。
 * 備考は cards.json の ability を開いて書く（card-fix-similarity-batch 手順7）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cardAbilityRawText } from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @param {string} raw */
function abilityCorpus(raw) {
  const s = String(raw || "");
  const plain = s.replace(/\{\{[^}]+\}\}/g, " ");
  const hearts = [];
  for (const m of s.matchAll(/\{\{heart_0?(\d)[^}]*\}\}/gi)) {
    hearts.push(`heart0${m[1]}`);
  }
  return (plain + " " + hearts.join(" ")).replace(/\s+/g, " ").trim();
}

/**
 * 「PL!S-bp6-001-P/R」「PL!S-PR-025–028-PR」「PL!N-bp5-008-P 他」等の
 * 複合表記から cards.json に実在する代表IDを解決する。
 * @param {string} rawId
 * @returns {string | null}
 */
function resolveRepresentativeId(rawId) {
  const full = String(rawId).trim();
  if (cards[full]) return full;
  const noOthers = full.replace(/\s*他\s*$/, "").trim();
  if (cards[noOthers]) return noOthers;
  const first = noOthers.split(/\s*\/\s*/)[0].replace(/[–—][0-9０-９]+/, "").trim();
  if (cards[first]) return first;
  const suffixM = noOthers.match(/(-[A-Z0-9＋+]+)$/);
  if (suffixM && cards[first + suffixM[1]]) return first + suffixM[1];
  return null;
}

/** @param {string} line */
function parseTableRow(line) {
  if (!/^\| \[[ x]\]/.test(line)) return null;
  const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
  const id = cols.find((c) => /^(PL!|LL-)/.test(c));
  if (!id) return null;
  const idx = cols.indexOf(id);
  const templateCol = cols[idx + 2] || "";
  const note = cols[idx + 3] || "";
  if (/（能力なし）|（常時のみ）/.test(templateCol)) return null;
  return { id, note };
}

/** 備考に書いてはいけない誤パターン（カード文に該当語が無い場合 FAIL） */
const NOTE_MUST_HAVE_IN_ABILITY = [
  [/ライブ不可/, /ライブできない/],
  [/→ALL|必要ハートALL/, /heart_0|heart0|ALLブレード|icon_b_all|b_all/],
  [/成功ライブ置き場不可/, /成功ライブ.*(?:置.*(?:できない|ない)|置くことができない)/],
  [/他メンバーなし→ライブ不可/, /ほかのメンバーがいない.*ライブできない/],
];

/** @type {string[]} */
const errors = [];
const files = fs
  .readdirSync(path.join(ROOT, "docs"))
  .filter((f) => f.endsWith("-verification-list.md") && f !== "play-verification-list.md");

for (const file of files) {
  for (const line of fs.readFileSync(path.join(ROOT, "docs", file), "utf8").split("\n")) {
    const row = parseTableRow(line);
    if (!row) continue;
    const repId = resolveRepresentativeId(row.id);
    const card = repId ? cards[repId] : null;
    if (!card) {
      errors.push(`${file} ${row.id}: cards.json に存在しない`);
      continue;
    }
    const corpus = abilityCorpus(cardAbilityRawText(card));
    for (const [noteRe, abilityRe] of NOTE_MUST_HAVE_IN_ABILITY) {
      if (row.note && noteRe.test(row.note) && !abilityRe.test(corpus)) {
        errors.push(`${file} ${row.id}: 備考 "${row.note}" がカード文と矛盾`);
      }
    }
  }
}

if (errors.length) {
  console.error(`${errors.length} verification-list issue(s):`);
  errors.forEach((e) => console.error("  FAIL", e));
  process.exit(1);
}
console.log(`audit-verification-list-notes OK (${files.length} files)`);
