#!/usr/bin/env node
/**
 * カードテキスト一括監査スクリプト（読み取り専用・分析のみ）
 *
 * 出力:
 *  - docs/card-classification-baseline.json … 全カード×全トリガーの分類結果（回帰比較用）
 *  - docs/touched-cards.md                   … 過去に触れたカード/テンプレートの除外リスト
 *  - docs/uncovered-cards.md                 … 未対応かつ未修正のカード一覧（カテゴリ分け）
 *
 * 使い方:
 *  node scripts/audit-card-coverage.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";
import { jidouEffectIsAutomated } from "../js/jidouAutoEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });

const CARD_NO_RE = /(?:PL![A-Za-z]*|LLE|LL)(?:-[0-9A-Za-z!]+)+/g;

function loadCards() {
  const raw = fs.readFileSync(path.join(ROOT, "data", "cards.json"), "utf8");
  return JSON.parse(raw);
}

function isAutomatedTemplate(t) {
  if (!t) return false;
  if (t === "none" || t === "guided_manual" || t === "jidou_manual") return false;
  try {
    if (abilityEffectIsAutomated(t)) return true;
  } catch (_) {}
  try {
    if (jidouEffectIsAutomated(t)) return true;
  } catch (_) {}
  // passive_track（常時・自動の素通し）は「対応扱い」にしておく
  if (t === "passive_track") return true;
  return false;
}

/** カードを分類し、未対応トリガーの一覧を返す */
function classifyCard(card) {
  const raw = cardAbilityRawText(card);
  const segs = splitAbilityByTriggers(raw).filter((s) => s.trigger);
  const triggers = [...new Set(segs.map((s) => s.trigger))];
  const perTrigger = {};
  const perTriggerFull = {};
  const uncoveredTriggers = [];
  for (const trig of triggers) {
    let cl;
    try {
      cl = classifyCardAbility(card, trig);
    } catch (e) {
      cl = { template: "ERROR:" + e.message };
    }
    const tmpl = cl && cl.template;
    perTrigger[trig] = tmpl;
    // 回帰比較用: template + filters を併記（条件追加で既存挙動が変わらないか検証）
    perTriggerFull[trig] = { template: tmpl, filters: (cl && cl.filters) || null };
    if (!isAutomatedTemplate(tmpl)) uncoveredTriggers.push(trig);
  }
  return { triggers, perTrigger, perTriggerFull, uncoveredTriggers, hasAbility: triggers.length > 0 };
}

/** ざっくりカテゴリ推定（未対応カードのグルーピング用） */
function categorize(card, trig) {
  const t = cardAbilityRawText(card);
  const seg = (splitAbilityByTriggers(t).find((s) => s.trigger === trig) || {}).text || "";
  const tags = [];
  if (/必要ハート/.test(seg)) tags.push("need_heart変更");
  if (/このターン中にエリアを移動/.test(seg)) tags.push("移動メンバー参照");
  if (/エールにより公開/.test(seg)) tags.push("エール公開参照");
  if (/バトンタッチ/.test(seg)) tags.push("バトンタッチ条件");
  if (/相手/.test(seg)) tags.push("相手参照(ソロ入力)");
  if (/成功ライブ/.test(seg)) tags.push("成功ライブ置き場参照");
  if (/ライブの合計スコア|このカードのスコア/.test(seg)) tags.push("スコア変更");
  if (/ブレード/.test(seg)) tags.push("ブレード付与");
  if (/を得る/.test(seg) && /ハート/.test(seg)) tags.push("ハート付与");
  if (/引[くき]/.test(seg)) tags.push("ドロー");
  if (/ウェイト/.test(seg)) tags.push("ウェイト操作");
  if (/アクティブ/.test(seg)) tags.push("アクティブ操作");
  if (/控え室/.test(seg)) tags.push("控え室操作");
  if (/デッキ|山札/.test(seg)) tags.push("デッキ操作");
  if (/場合|かぎり/.test(seg)) tags.push("条件付き");
  if (!tags.length) tags.push("その他");
  return tags;
}

function collectTouchedFromCode() {
  const touched = new Set();
  const jsDir = path.join(ROOT, "js");
  for (const f of fs.readdirSync(jsDir)) {
    if (!f.endsWith(".js")) continue;
    const txt = fs.readFileSync(path.join(jsDir, f), "utf8");
    const m = txt.match(CARD_NO_RE);
    if (m) m.forEach((x) => touched.add(x));
  }
  return touched;
}

function collectTouchedFromTranscripts() {
  const touched = new Set();
  const base = path.join(
    process.env.HOME || "/Users/kaneko_kai",
    ".cursor",
    "projects",
  );
  const files = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".jsonl")) files.push(full);
    }
  }
  walk(base);
  for (const f of files) {
    let txt;
    try {
      txt = fs.readFileSync(f, "utf8");
    } catch (_) {
      continue;
    }
    const m = txt.match(CARD_NO_RE);
    if (m) m.forEach((x) => touched.add(x));
  }
  return { touched, fileCount: files.length };
}

function main() {
  const cards = loadCards();
  const ids = Object.keys(cards);

  // 1) baseline 分類ダンプ
  const baseline = {};
  const classified = {};
  for (const id of ids) {
    const c = classifyCard(cards[id]);
    classified[id] = c;
    baseline[id] = c.perTriggerFull;
  }
  fs.writeFileSync(
    path.join(DOCS, "card-classification-baseline.json"),
    JSON.stringify(baseline, null, 2),
  );

  // 2) TOUCHED リスト
  // 定義: 「baselineで既に自動化済み(covered)のカード」＋「コードでカード番号が直接参照されているカード」。
  // ※ 履歴(jsonl)のカード番号走査は『現在のセッション』自身を含み自己汚染するため、
  //   除外判定には使わず informational として discussed-cards.md にのみ出力する。
  const codeTouched = new Set([...collectTouchedFromCode()].filter((x) => cards[x]));
  const coveredTouched = new Set(
    ids.filter((id) => classified[id].hasAbility && classified[id].uncoveredTriggers.length === 0),
  );
  const touched = new Set([...codeTouched, ...coveredTouched]);

  let touchedMd = "# TOUCHED（修正対象から除外）\n\n";
  touchedMd += `- 既に自動化済み(covered): ${coveredTouched.size} 件\n`;
  touchedMd += `- コードでカード番号を直接参照: ${codeTouched.size} 件\n`;
  touchedMd += `- 合算(重複除く): ${touched.size} 件\n\n`;
  touchedMd += "## コード参照カード（ハードコード対応あり・特に変更注意）\n\n";
  [...codeTouched].sort().forEach((x) => (touchedMd += `- ${x}\n`));
  fs.writeFileSync(path.join(DOCS, "touched-cards.md"), touchedMd);

  // informational: 履歴で言及されたカード（除外には使わない）
  try {
    const { touched: trTouched, fileCount } = collectTouchedFromTranscripts();
    const discussed = [...trTouched].filter((x) => cards[x]).sort();
    let dMd = "# 履歴で言及されたカード（informational・除外には未使用）\n\n";
    dMd += `- 走査jsonl: ${fileCount} ファイル\n`;
    dMd += `- 言及カード(実在): ${discussed.length} 件\n\n`;
    discussed.forEach((x) => (dMd += `- ${x}\n`));
    fs.writeFileSync(path.join(DOCS, "discussed-cards.md"), dMd);
  } catch (_) {}

  // 3) 未対応かつ未修正カード（カテゴリ分け）
  const uncovered = [];
  for (const id of ids) {
    const c = classified[id];
    if (!c.hasAbility) continue;
    if (!c.uncoveredTriggers.length) continue;
    if (touched.has(id)) continue; // 既に触れたカードは除外
    uncovered.push(id);
  }

  // カテゴリ集計
  const byCategory = {};
  for (const id of uncovered) {
    const c = classified[id];
    for (const trig of c.uncoveredTriggers) {
      const tags = categorize(cards[id], trig);
      const key = tags.join(" / ");
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(`${id} [${trig}]`);
    }
  }

  let uncMd = "# 未対応かつ未修正カード（修正候補）\n\n";
  uncMd += `- 全カード: ${ids.length}\n`;
  uncMd += `- 能力あり: ${ids.filter((id) => classified[id].hasAbility).length}\n`;
  uncMd += `- 未対応(touched除外後): ${uncovered.length} 件\n\n`;
  const cats = Object.keys(byCategory).sort(
    (a, b) => byCategory[b].length - byCategory[a].length,
  );
  for (const cat of cats) {
    uncMd += `## ${cat} （${byCategory[cat].length}件）\n\n`;
    byCategory[cat].sort().forEach((x) => (uncMd += `- ${x}\n`));
    uncMd += "\n";
  }
  fs.writeFileSync(path.join(DOCS, "uncovered-cards.md"), uncMd);

  // コンソールサマリ
  console.log("=== AUDIT SUMMARY ===");
  console.log("total cards          :", ids.length);
  console.log("cards with ability   :", ids.filter((id) => classified[id].hasAbility).length);
  console.log("TOUCHED (excluded)   :", touched.size);
  console.log("uncovered (to fix)   :", uncovered.length);
  console.log("categories           :", cats.length);
  console.log("");
  console.log("top categories:");
  cats.slice(0, 15).forEach((c) => console.log("  -", byCategory[c].length, "  ", c));
  console.log("");
  console.log("outputs written to docs/:");
  console.log("  - card-classification-baseline.json");
  console.log("  - touched-cards.md");
  console.log("  - uncovered-cards.md");
}

main();
