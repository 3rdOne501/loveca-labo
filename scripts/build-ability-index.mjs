#!/usr/bin/env node
/**
 * cards.json の能力分類カバレッジを監査し data/*-index.json を再生成する。
 * 用法: node scripts/build-ability-index.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  abilityEffectIsAutomated,
  abilityPlainText,
  splitAbilityByTriggers,
  cardAbilityRawText,
} from "../js/abilityEffects.js";
import { classifyJoujiSegment, listNativeJoujiSegmentRaws } from "../js/joujiEffects.js";
import {
  classifyJidouAutoSegment,
  listNativeJidouSegmentRaws,
  jidouEffectIsAutomated,
} from "../js/jidouAutoEffects.js";
import { T_MEMBER } from "../js/config.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_PATH = join(ROOT, "data/cards.json");
const DATA_DIR = join(ROOT, "data");

/** @type {Record<string, string>} */
const TRIGGER_LABEL = {
  kidou: "起動",
  toujyou: "登場",
  live_start: "ライブ開始",
  live_success: "ライブ成功",
};

const TRIGGER_KEYS = ["kidou", "toujyou", "live_start", "live_success"];

function segmentPlainForIndex(text) {
  return String(text || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nativeSegmentsForTrigger(card, trigger) {
  const raw = cardAbilityRawText(card);
  if (!raw) return [];
  const segs = splitAbilityByTriggers(raw);
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== trigger) continue;
    const plain = segmentPlainForIndex(segs[i].text);
    if (!plain || plain === "/" || plain === "を得る。" || plain === "を得る") continue;
    if (i > 0) {
      const prev = segs[i - 1];
      if (prev.trigger && prev.trigger !== trigger) {
        const prevText = String(prev.text || "");
        if (/「/.test(prevText) && !/」/.test(prevText) && /ライブ終了時まで/.test(prevText)) continue;
      }
    }
    out.push(segs[i].text);
  }
  return out;
}

function buildTriggerIndex(catalog, trigger) {
  /** @type {object[]} */
  const cards = [];
  for (const card of Object.values(catalog)) {
    if (!card || card.type !== T_MEMBER || !card.ability) continue;
    const segRaws = nativeSegmentsForTrigger(card, trigger);
    if (!segRaws.length) {
      const cl = classifyCardAbility(card, trigger);
      if (cl.template === "none") continue;
      segRaws.push(abilityRawSegmentForTriggerFallback(card, trigger));
    }
    for (const segRaw of segRaws) {
      if (!segRaw) continue;
      const cl = classifyCardAbility(card, trigger, segRaw);
      /** @type {Record<string, unknown>} */
      const row = {
        card_no: card.card_no || "",
        name: card.name || "",
        template: cl.template,
        automated: abilityEffectIsAutomated(cl.template),
        optional: !!(cl.optional || cl.hasOptionalCost),
        perTurn: cl.perTurnLimit != null ? cl.perTurnLimit : null,
        effect: segmentPlainForIndex(segRaw).slice(0, 240),
      };
      if (cl.template === "ability_sequence" && Array.isArray(cl.steps) && cl.steps.length) {
        row.steps = cl.steps.map((st) => st.template);
      }
      cards.push(row);
    }
  }
  /** @type {Record<string, number>} */
  const byTemplate = {};
  for (const row of cards) {
    byTemplate[row.template] = (byTemplate[row.template] || 0) + 1;
  }
  return {
    generated: new Date().toISOString().slice(0, 10),
    trigger,
    total: cards.length,
    byTemplate,
    cards,
  };
}

function abilityRawSegmentForTriggerFallback(card, trigger) {
  const segs = splitAbilityByTriggers(cardAbilityRawText(card));
  for (const s of segs) {
    if (s.trigger === trigger) return s.text;
  }
  return "";
}

function buildJoujiUnclassified(catalog) {
  /** @type {object[]} */
  const snippets = [];
  for (const card of Object.values(catalog)) {
    if (!card || card.type !== T_MEMBER) continue;
    const raws = listNativeJoujiSegmentRaws(card);
    for (const segRaw of raws) {
      if (!classifyJoujiSegment(segRaw)) {
        snippets.push({
          card_no: card.card_no || "",
          name: card.name || "",
          snippet: segmentPlainForIndex(segRaw).slice(0, 320),
        });
      }
    }
  }
  return snippets;
}

function clusterManualRows(allManual) {
  /** @type {Map<string, { count: number, examples: string[], effect: string }>} */
  const map = new Map();
  for (const row of allManual) {
    const key = row.effect.replace(/\d+/g, "N").slice(0, 72);
    const cur = map.get(key) || { count: 0, examples: [], effect: row.effect.slice(0, 120) };
    cur.count++;
    if (cur.examples.length < 3) cur.examples.push(row.card_no);
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([pattern, v]) => ({ pattern, ...v }))
    .sort((a, b) => b.count - a.count);
}

function writeAbilityManualClustersMd(clusterRows) {
  const lines = [
    "# guided_manual クラスタ一覧（build-ability-index 自動生成）",
    "",
    `生成日: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "| 件数 | 代表 card_no | パターン概要 |",
    "|------|-------------|-------------|",
  ];
  for (const row of clusterRows.slice(0, 80)) {
    lines.push(`| ${row.count} | ${row.examples.join(", ")} | ${row.effect.replace(/\|/g, "\\|")} |`);
  }
  writeFileSync(join(DATA_DIR, "ability-manual-clusters.md"), lines.join("\n") + "\n", "utf8");
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const catalog = JSON.parse(readFileSync(CARDS_PATH, "utf8"));

  /** @type {object[]} */
  const allManual = [];
  let manualTotal = 0;
  let autoTotal = 0;

  for (const trigger of TRIGGER_KEYS) {
    const index = buildTriggerIndex(catalog, trigger);
    const outPath = join(DATA_DIR, `${trigger === "toujyou" ? "toujyou" : trigger}-index.json`);
    writeFileSync(outPath, JSON.stringify(index, null, 2) + "\n", "utf8");
    const manual = index.cards.filter((c) => c.template === "guided_manual").length;
    manualTotal += manual;
    autoTotal += index.cards.length - manual;
    console.log(
      `${TRIGGER_LABEL[trigger] || trigger}: ${index.total} segments, guided_manual=${manual}, automated=${index.total - manual}`,
    );
    index.cards
      .filter((c) => c.template === "guided_manual")
      .forEach((c) => allManual.push({ ...c, trigger }));
  }

  const joujiSnippets = buildJoujiUnclassified(catalog);
  writeFileSync(
    join(DATA_DIR, "jouji-unclassified-snippets.json"),
    JSON.stringify(joujiSnippets, null, 2) + "\n",
    "utf8",
  );
  console.log(`常時 unclassified: ${joujiSnippets.length}`);

  /** @type {object[]} */
  const jidouCards = [];
  for (const card of Object.values(catalog)) {
    if (!card || card.type !== T_MEMBER) continue;
    for (const segRaw of listNativeJidouSegmentRaws(card)) {
      const cl = classifyJidouAutoSegment(segRaw);
      jidouCards.push({
        card_no: card.card_no || "",
        name: card.name || "",
        template: cl.template,
        automated: jidouEffectIsAutomated(cl.template),
        eventKind: cl.eventKind || null,
        effect: segmentPlainForIndex(segRaw).slice(0, 240),
      });
    }
  }
  const jidouManual = jidouCards.filter((c) => c.template === "jidou_manual").length;
  writeFileSync(
    join(DATA_DIR, "jidou-index.json"),
    JSON.stringify(
      {
        generated: new Date().toISOString().slice(0, 10),
        trigger: "jidou",
        total: jidouCards.length,
        automated: jidouCards.length - jidouManual,
        guided_manual: jidouManual,
        cards: jidouCards,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(
    `自動: ${jidouCards.length} segments, jidou_manual=${jidouManual}, automated=${jidouCards.length - jidouManual}`,
  );

  const clusters = clusterManualRows(allManual);
  writeAbilityManualClustersMd(clusters);

  console.log(`\n合計: automated=${autoTotal}, guided_manual=${manualTotal}`);
  console.log(`出力: data/*-index.json, data/jouji-unclassified-snippets.json, data/ability-manual-clusters.md`);
}

main();
