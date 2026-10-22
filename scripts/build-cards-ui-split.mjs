#!/usr/bin/env node
/**
 * data/cards.json（正本・検証用フル）から、起動用の軽量 UI カタログと能力オーバーレイを生成する。
 *
 *   data/cards-ui.json      … デッキ一覧・絞り込み用（ability / faq / _img なし）
 *   data/cards-ability.json … card_no → ability 文字列（空は省略）
 *
 * 用法: node scripts/build-cards-ui-split.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "data/cards.json");
const OUT_UI = path.join(ROOT, "data/cards-ui.json");
const OUT_AB = path.join(ROOT, "data/cards-ability.json");

const UI_KEEP = new Set([
  "card_no",
  "name",
  "type",
  "product",
  "series",
  "unit",
  "rare",
  "rare_list",
  "cost",
  "score",
  "blade",
  "base_heart",
  "need_heart",
  "blade_heart",
  "special_heart",
  "img",
]);

const raw = JSON.parse(readFileSync(SRC, "utf8"));
if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
  console.error("build-cards-ui-split: cards.json がオブジェクトではありません");
  process.exit(1);
}

/** @type {Record<string, unknown>} */
const ui = {
  _meta: {
    v: 1,
    kind: "ui",
    source: "data/cards.json",
    builtAt: new Date().toISOString(),
  },
};
/** @type {Record<string, string>} */
const ability = {
  _meta: /** @type {any} */ ({
    v: 1,
    kind: "ability",
    source: "data/cards.json",
    builtAt: new Date().toISOString(),
  }),
};

let cardCount = 0;
let abilityCount = 0;
for (const key of Object.keys(raw)) {
  if (key.startsWith("_")) continue;
  const card = raw[key];
  if (!card || typeof card !== "object") continue;
  cardCount++;
  /** @type {Record<string, unknown>} */
  const slim = {};
  for (const f of UI_KEEP) {
    if (card[f] !== undefined) slim[f] = card[f];
  }
  if (!slim.card_no) slim.card_no = key;
  ui[key] = slim;
  const ab = card.ability;
  if (typeof ab === "string" && ab.trim()) {
    ability[key] = ab;
    abilityCount++;
  }
}

mkdirSync(path.dirname(OUT_UI), { recursive: true });
writeFileSync(OUT_UI, JSON.stringify(ui));
writeFileSync(OUT_AB, JSON.stringify(ability));

const fullBytes = Buffer.byteLength(JSON.stringify(raw));
const uiBytes = Buffer.byteLength(JSON.stringify(ui));
const abBytes = Buffer.byteLength(JSON.stringify(ability));
console.log(
  "build-cards-ui-split: OK cards=" +
    cardCount +
    " ability=" +
    abilityCount +
    " full≈" +
    Math.round(fullBytes / 1024) +
    "KB ui≈" +
    Math.round(uiBytes / 1024) +
    "KB ability≈" +
    Math.round(abBytes / 1024) +
    "KB boot≈" +
    Math.round(uiBytes / 1024) +
    "KB (was≈" +
    Math.round(fullBytes / 1024) +
    "KB)",
);
