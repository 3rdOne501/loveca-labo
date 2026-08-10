#!/usr/bin/env node
/**
 * data/cards.json を前回スナップショット（data/card-inventory.json）と比較し、
 * 新規追加・削除・能力テキスト変更のカードを検出する。
 * 新規カードは能力分類まで走らせ、自動化済み / 要ハンドラ対応を切り分けて報告する。
 *
 * 用法:
 *   node scripts/check-new-cards.mjs               … 差分を表示（インベントリは更新しない）
 *   node scripts/check-new-cards.mjs --write       … 差分表示のうえインベントリを現状で更新
 *   node scripts/check-new-cards.mjs --json        … 機械可読 JSON を stdout に出力
 *   node scripts/check-new-cards.mjs --markdown P  … Markdown レポートを P に書き出す
 *   node scripts/check-new-cards.mjs --exit-code   … 新規/変更があれば exit 10
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";
import { classifyJoujiSegment, listNativeJoujiSegmentRaws } from "../js/joujiEffects.js";
import {
  classifyJidouAutoSegment,
  jidouEffectIsAutomated,
  listNativeJidouSegmentRaws,
} from "../js/jidouAutoEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_PATH = path.join(ROOT, "data/cards.json");
const INVENTORY_PATH = path.join(ROOT, "data/card-inventory.json");

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagValue = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};

function loadJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function cardIds(catalog) {
  return Object.keys(catalog).filter((k) => !k.startsWith("_"));
}

const TRIGGER_KEYS = ["kidou", "toujyou", "live_start", "live_success"];

/** audit-card-coverage.mjs と同じ「対応済み」判定（passive_track は素通しなので対応扱い） */
function isCovered(template) {
  if (!template) return false;
  if (template === "none") return true;
  if (template === "guided_manual" || template === "jidou_manual" || template === "unclassified") {
    return false;
  }
  if (template === "passive_track") return true;
  try {
    if (abilityEffectIsAutomated(template)) return true;
  } catch (_) {}
  try {
    if (jidouEffectIsAutomated(template)) return true;
  } catch (_) {}
  return false;
}

/** 起動/登場/ライブ開始/ライブ成功 + 常時 + 自動 をまとめて分類し、未対応セグメントを返す */
function classifyNewCard(card) {
  const raw = cardAbilityRawText(card);
  /** @type {{trigger:string, template:string, automated:boolean, effect:string}[]} */
  const segments = [];
  if (raw) {
    for (const seg of splitAbilityByTriggers(raw)) {
      // 常時・自動は専用分類器で別途評価するため、ここでは誘発 4 種のみ見る
      if (!TRIGGER_KEYS.includes(seg.trigger)) continue;
      let cl;
      try {
        cl = classifyCardAbility(card, seg.trigger, seg.text);
      } catch (err) {
        segments.push({
          trigger: seg.trigger,
          template: `ERROR: ${err && err.message ? err.message : err}`,
          automated: false,
          effect: plain(seg.text),
        });
        continue;
      }
      segments.push({
        trigger: seg.trigger,
        template: cl.template,
        automated: isCovered(cl.template),
        effect: plain(seg.text),
      });
    }
  }
  for (const segRaw of listNativeJoujiSegmentRaws(card)) {
    // 常時は classifyJoujiSegment が rule を返した時点で joujiEffects 側の処理対象
    const rule = classifyJoujiSegment(segRaw);
    segments.push({
      trigger: "jouji",
      template: rule ? rule.kind : "unclassified",
      automated: !!rule,
      effect: plain(segRaw),
    });
  }
  for (const segRaw of listNativeJidouSegmentRaws(card)) {
    const cl = classifyJidouAutoSegment(segRaw);
    segments.push({
      trigger: "jidou",
      template: cl.template,
      automated: isCovered(cl.template),
      effect: plain(segRaw),
    });
  }
  return segments;
}

function plain(text) {
  return String(text || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function main() {
  if (!fs.existsSync(CARDS_PATH)) {
    console.error("data/cards.json がありません。scripts/sync-cards-json.sh を先に実行してください。");
    process.exit(1);
  }
  const catalog = loadJson(CARDS_PATH, null);
  if (!catalog || typeof catalog !== "object") {
    console.error("data/cards.json を JSON として読めません。");
    process.exit(1);
  }

  const ids = cardIds(catalog);
  const inventory = loadJson(INVENTORY_PATH, null);
  const firstRun = !inventory;
  const knownIds = new Set(inventory && Array.isArray(inventory.ids) ? inventory.ids : []);
  const knownAbility = (inventory && inventory.abilityHashes) || {};

  const added = firstRun ? [] : ids.filter((id) => !knownIds.has(id));
  const removed = firstRun ? [] : [...knownIds].filter((id) => !ids.includes(id));
  const abilityChanged = firstRun
    ? []
    : ids.filter(
        (id) =>
          knownIds.has(id) &&
          knownAbility[id] !== undefined &&
          knownAbility[id] !== String(catalog[id] && catalog[id].ability ? catalog[id].ability : ""),
      );

  /** @type {Record<string, {ids:string[]}>} */
  const byProduct = {};
  for (const id of added) {
    const p = (catalog[id] && catalog[id].product) || "(不明)";
    (byProduct[p] = byProduct[p] || { ids: [] }).ids.push(id);
  }

  const details = added.map((id) => {
    const card = catalog[id];
    const segments = classifyNewCard(card);
    return {
      card_no: id,
      name: (card && card.name) || "",
      type: (card && card.type) || "",
      product: (card && card.product) || "",
      hasAbility: segments.length > 0,
      needsWork: segments.filter((s) => !s.automated),
      segments,
    };
  });

  const needsWork = details.filter((d) => d.needsWork.length > 0);

  const result = {
    generatedAt: new Date().toISOString(),
    firstRun,
    totalCards: ids.length,
    previousTotal: firstRun ? null : knownIds.size,
    added: added.length,
    removed: removed.length,
    abilityChanged: abilityChanged.length,
    addedByProduct: Object.fromEntries(
      Object.entries(byProduct).map(([p, v]) => [p, v.ids.length]),
    ),
    addedIds: added,
    removedIds: removed,
    abilityChangedIds: abilityChanged,
    needsWorkCount: needsWork.length,
    details,
  };

  if (hasFlag("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result, byProduct, needsWork);
  }

  const mdPath = flagValue("--markdown");
  if (mdPath) {
    const abs = path.isAbsolute(mdPath) ? mdPath : path.join(ROOT, mdPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, renderMarkdown(result, byProduct, needsWork), "utf8");
    if (!hasFlag("--json")) console.log(`\nレポート: ${path.relative(ROOT, abs)}`);
  }

  if (hasFlag("--write")) {
    const abilityHashes = {};
    for (const id of ids) {
      abilityHashes[id] = String(catalog[id] && catalog[id].ability ? catalog[id].ability : "");
    }
    fs.writeFileSync(
      INVENTORY_PATH,
      JSON.stringify(
        { updatedAt: new Date().toISOString(), count: ids.length, ids: ids.sort(), abilityHashes },
        null,
        0,
      ) + "\n",
      "utf8",
    );
    if (!hasFlag("--json")) console.log(`インベントリ更新: data/card-inventory.json（${ids.length} 枚）`);
  }

  if (hasFlag("--exit-code") && (added.length || removed.length || abilityChanged.length)) {
    process.exit(10);
  }
}

function printHuman(result, byProduct, needsWork) {
  if (result.firstRun) {
    console.log(`初回スキャン: ${result.totalCards} 枚を記録します（--write でインベントリ作成）`);
    return;
  }
  console.log(`カード総数: ${result.totalCards}（前回 ${result.previousTotal}）`);
  console.log(`新規 ${result.added} / 削除 ${result.removed} / 能力テキスト変更 ${result.abilityChanged}`);
  if (!result.added && !result.removed && !result.abilityChanged) {
    console.log("更新はありません。");
    return;
  }
  if (result.added) {
    console.log("\n■ 新規カード（商品別）");
    for (const [p, v] of Object.entries(byProduct).sort((a, b) => b[1].ids.length - a[1].ids.length)) {
      console.log(`  ${String(v.ids.length).padStart(4)}  ${p}`);
    }
  }
  if (result.removedIds.length) console.log(`\n■ 削除: ${result.removedIds.join(", ")}`);
  if (result.abilityChangedIds.length) {
    console.log(`\n■ 能力テキスト変更: ${result.abilityChangedIds.join(", ")}`);
  }
  if (needsWork.length) {
    console.log(`\n■ 要ハンドラ対応 ${needsWork.length} 枚`);
    for (const d of needsWork.slice(0, 40)) {
      const t = d.needsWork.map((s) => `${s.trigger}:${s.template}`).join(", ");
      console.log(`  ${d.card_no} ${d.name} — ${t}`);
    }
    if (needsWork.length > 40) console.log(`  … ほか ${needsWork.length - 40} 枚`);
  } else if (result.added) {
    console.log("\n新規カードはすべて既存テンプレートで分類できています。");
  }
}

function renderMarkdown(result, byProduct, needsWork) {
  const lines = [
    "# カードリスト更新レポート",
    "",
    `生成: ${result.generatedAt}`,
    "",
    `- カード総数: **${result.totalCards}**（前回 ${result.previousTotal ?? "-"}）`,
    `- 新規: **${result.added}** / 削除: ${result.removed} / 能力テキスト変更: ${result.abilityChanged}`,
    "",
  ];
  if (result.added) {
    lines.push("## 新規カード（商品別）", "", "| 枚数 | 商品 |", "|---|---|");
    for (const [p, v] of Object.entries(byProduct).sort((a, b) => b[1].ids.length - a[1].ids.length)) {
      lines.push(`| ${v.ids.length} | ${p} |`);
    }
    lines.push("");
  }
  if (needsWork.length) {
    lines.push(
      `## 要ハンドラ対応（${needsWork.length} 枚）`,
      "",
      "| card_no | 名前 | 未対応セグメント | カード文 |",
      "|---|---|---|---|",
    );
    for (const d of needsWork) {
      const t = d.needsWork.map((s) => `${s.trigger}:\`${s.template}\``).join("<br>");
      const eff = d.needsWork.map((s) => s.effect.replace(/\|/g, "\\|")).join("<br>");
      lines.push(`| ${d.card_no} | ${d.name} | ${t} | ${eff} |`);
    }
    lines.push("");
  } else if (result.added) {
    lines.push("## 要ハンドラ対応", "", "なし（新規カードはすべて既存テンプレートで分類済み）", "");
  }
  if (result.removedIds.length) {
    lines.push("## 削除されたカード", "", result.removedIds.join(", "), "");
  }
  if (result.abilityChangedIds.length) {
    lines.push("## 能力テキストが変わったカード", "", result.abilityChangedIds.join(", "), "");
  }
  return lines.join("\n");
}

main();
