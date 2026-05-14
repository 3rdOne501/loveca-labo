/**
 * デッキ構築画面「サンプルリスト」用レシピ（10〜20件程度を想定。現状は試験公開2件）。
 * 公開カードDBに依存するため、環境によっては未登録番号警告が出ます。
 *
 * 制作者: `STORAGE_SAMPLE_RECIPES_OVERRIDE`（UI の「サンプルレシピ上書き」または
 * `localStorage.setItem('llocg_sample_recipes_override_v1', JSON.stringify([...]))`）で
 * このブラウザのみ既定サンプルを差し替えられます。
 */
import {
  BUILTIN_LOVE_ORANGE_2611_PRESET_NAME,
  BUILTIN_STARTER_PRESET_NAME,
  DEFAULT_LOVE_ORANGE_2611_DECK_MAP,
  DEFAULT_LOVE_ORANGE_2611_KEY2_CARD_NOS,
  DEFAULT_LOVE_ORANGE_2611_KEY3_CARD_NOS,
  DEFAULT_LOVE_ORANGE_2611_KEY_CARD_NOS,
  DEFAULT_LOVE_ORANGE_2611_MIDDLE_CARD_NOS,
  DEFAULT_LOVE_ORANGE_2611_THUMBNAIL_CARD_NO,
  DEFAULT_STARTER_DECK_MAP,
  DEFAULT_STARTER_KEY2_CARD_NOS,
  DEFAULT_STARTER_KEY3_CARD_NOS,
  DEFAULT_STARTER_KEY_CARD_NOS,
  DEFAULT_STARTER_MIDDLE_CARD_NOS,
  DEFAULT_STARTER_THUMBNAIL_CARD_NO,
  MAX_COPIES_PER_CARD,
  STORAGE_SAMPLE_RECIPES_OVERRIDE,
} from "./config.js";
import { cloneDeckMap } from "./deckLibrary.js";

/** UI・説明文用の上限（実データはこの件数まで増やせます） */
export const SAMPLE_DECK_RECIPES_MAX = 20;

/**
 * @typedef {{ id: string, name: string, deck: Record<string, number>, keyCardNos: string[], keyCard2Nos: string[], keyCard3Nos: string[], middleCardNos: string[], thumbnailCardNo: string, noteLines?: string[] }} SampleDeckRecipe
 */

/** @returns {SampleDeckRecipe[]} */
export function getBuiltInSampleDeckRecipes() {
  return [
    {
      id: "sample-builtin-10axis-miraste",
      name: BUILTIN_STARTER_PRESET_NAME,
      deck: cloneDeckMap(DEFAULT_STARTER_DECK_MAP),
      keyCardNos: [...DEFAULT_STARTER_KEY_CARD_NOS],
      keyCard2Nos: [...DEFAULT_STARTER_KEY2_CARD_NOS],
      keyCard3Nos: [...DEFAULT_STARTER_KEY3_CARD_NOS],
      middleCardNos: [...DEFAULT_STARTER_MIDDLE_CARD_NOS],
      thumbnailCardNo: DEFAULT_STARTER_THUMBNAIL_CARD_NO,
      noteLines: [
        "ツール同梱の大会向けサンプル（メンバー48＋ライブ12）。",
        "キー／キ②／キ③／中間は既定のままです。コピー後に登録デッキタブで変更できます。",
      ],
    },
    {
      id: "sample-builtin-love-orange-2611",
      name: BUILTIN_LOVE_ORANGE_2611_PRESET_NAME,
      deck: cloneDeckMap(DEFAULT_LOVE_ORANGE_2611_DECK_MAP),
      keyCardNos: [...DEFAULT_LOVE_ORANGE_2611_KEY_CARD_NOS],
      keyCard2Nos: [...DEFAULT_LOVE_ORANGE_2611_KEY2_CARD_NOS],
      keyCard3Nos: [...DEFAULT_LOVE_ORANGE_2611_KEY3_CARD_NOS],
      middleCardNos: [...DEFAULT_LOVE_ORANGE_2611_MIDDLE_CARD_NOS],
      thumbnailCardNo: DEFAULT_LOVE_ORANGE_2611_THUMBNAIL_CARD_NO,
      noteLines: [
        "ツール同梱のサンプル「ラブユーランジュ2611」構成です。",
        "ソロプレイはそのままメインデッキへ読み込んで開始します。",
      ],
    },
  ];
}

/** @param {unknown} deck */
function normalizeDeckRecord(deck) {
  if (!deck || typeof deck !== "object" || Array.isArray(deck)) return null;
  /** @type {Record<string, number>} */
  const o = {};
  for (const [k0, v0] of Object.entries(deck)) {
    const key = String(k0 || "").trim();
    if (!key) continue;
    let n = typeof v0 === "number" ? Math.floor(v0) : parseInt(String(v0).trim(), 10);
    if (!Number.isInteger(n) || n <= 0) continue;
    n = Math.min(n, MAX_COPIES_PER_CARD);
    o[key] = n;
  }
  return Object.keys(o).length ? o : null;
}

/** @param {unknown} arr */
function normalizeStringList(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const s = x != null ? String(x).trim() : "";
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** @param {unknown} parsed */
function normalizeSampleRecipesArray(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) return [];
  /** @type {SampleDeckRecipe[]} */
  const out = [];
  for (let i = 0; i < parsed.length && out.length < SAMPLE_DECK_RECIPES_MAX; i++) {
    const row = parsed[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    var idRaw = row.id != null ? String(row.id).trim() : "";
    var nameRaw = row.name != null ? String(row.name).trim() : "";
    if (!idRaw || !nameRaw) continue;
    const deckNorm = normalizeDeckRecord(row.deck);
    if (!deckNorm) continue;
    /** @type {SampleDeckRecipe} */
    var rec = {
      id: idRaw,
      name: nameRaw,
      deck: deckNorm,
      keyCardNos: normalizeStringList(row.keyCardNos),
      keyCard2Nos: normalizeStringList(row.keyCard2Nos),
      keyCard3Nos: normalizeStringList(row.keyCard3Nos),
      middleCardNos: normalizeStringList(row.middleCardNos),
      thumbnailCardNo: row.thumbnailCardNo != null ? String(row.thumbnailCardNo).trim() : "",
    };
    var nl = row.noteLines;
    if (Array.isArray(nl)) {
      rec.noteLines = nl
        .map(function (ln) {
          return String(ln != null ? ln : "").trim();
        })
        .filter(Boolean);
      if (rec.noteLines.length === 0) delete rec.noteLines;
    }
    out.push(rec);
  }
  return out;
}

/** @returns {SampleDeckRecipe[]} */
export function getSampleDeckRecipes() {
  try {
    var raw = localStorage.getItem(STORAGE_SAMPLE_RECIPES_OVERRIDE);
    if (raw && raw.trim()) {
      const parsed = JSON.parse(raw);
      const v = normalizeSampleRecipesArray(parsed);
      if (v.length) return v;
    }
  } catch (_) {
    /* noop */
  }
  return getBuiltInSampleDeckRecipes();
}

/** 編集テキスト欄用: 上書きがあればその内容、無ければリポジトリ既定の整形 JSON */
export function formatSampleRecipesForEditor() {
  try {
    const raw = localStorage.getItem(STORAGE_SAMPLE_RECIPES_OVERRIDE);
    if (raw && raw.trim()) {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    }
  } catch (_) {
    /* fall through */
  }
  return JSON.stringify(getBuiltInSampleDeckRecipes(), null, 2);
}

/**
 * @param {string} jsonText
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function parseAndSaveSampleRecipesOverride(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "JSON の構文が正しくありません" };
  }
  const norm = normalizeSampleRecipesArray(parsed);
  if (!norm.length) return { ok: false, error: "有効なレシピが1件以上必要です（id・name・deck を確認）" };
  try {
    localStorage.setItem(STORAGE_SAMPLE_RECIPES_OVERRIDE, JSON.stringify(norm));
  } catch (e) {
    return {
      ok: false,
      error:
        e && /** @type {{ name?: string }} */ (e).name === "QuotaExceededError"
          ? "保存容量が足りません。"
          : "localStorage への保存に失敗しました。",
    };
  }
  return { ok: true };
}

export function clearSampleRecipesOverride() {
  try {
    localStorage.removeItem(STORAGE_SAMPLE_RECIPES_OVERRIDE);
  } catch (_) {
    /* noop */
  }
}
