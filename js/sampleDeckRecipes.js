/**
 * デッキ構築画面「サンプルリスト」用レシピ。
 * 既定: `getBuiltInSampleDeckRecipes()`。サイト直下に `sample-deck-recipes.public.json`
 * を置いて fetch すると全員がその一覧を読みます（開発者モードで編集後は JSON をダウンロードして同ファイルをデプロイ）。
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
  SAMPLE_DECK_RECIPES_PUBLIC_FILENAME,
} from "./config.js";
import { cloneDeckMap } from "./deckLibrary.js";

/** 開発者モード用（UI プロンプトと照合） */
export const SAMPLE_DEVELOPER_PASSCODE = "nira1102";

/** UI・説明文用の上限（実データはこの件数まで増やせます） */
export const SAMPLE_DECK_RECIPES_MAX = 20;

/**
 * @typedef {{ id: string, name: string, deck: Record<string, number>, keyCardNos: string[], keyCard2Nos: string[], keyCard3Nos: string[], middleCardNos: string[], thumbnailCardNo: string, noteLines?: string[] }} SampleDeckRecipe
 */

/** fetch 済み一覧。null は「未設定＝組み込みにフォールバック」 */
let publishedRecipesCache = /** @type {SampleDeckRecipe[] | null} */ (null);

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
export function normalizeSampleRecipesArray(parsed) {
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

/**
 * ページ読込時に呼ぶ。`sample-deck-recipes.public.json` があれば全員共通の一覧として採用。
 * @returns {Promise<void>}
 */
export function initPublishedSampleRecipes() {
  return (async function () {
    publishedRecipesCache = null;
    try {
      var u = new URL(SAMPLE_DECK_RECIPES_PUBLIC_FILENAME, window.location.href);
      var r = await fetch(u.toString(), { cache: "no-store" });
      if (!r.ok) return;
      var data = await r.json();
      var v = normalizeSampleRecipesArray(data);
      if (v.length) publishedRecipesCache = v;
    } catch (_) {
      publishedRecipesCache = null;
    }
  })();
}

/** 開発者モードで一覧を更新した直後にメモリへ反映（fetch より優先される） */
export function setPublishedSampleRecipesCache(recipes) {
  publishedRecipesCache = recipes && recipes.length ? recipes.slice() : null;
}

/** @returns {SampleDeckRecipe[]} */
export function getSampleDeckRecipes() {
  if (publishedRecipesCache != null && publishedRecipesCache.length > 0) {
    return publishedRecipesCache;
  }
  return getBuiltInSampleDeckRecipes();
}

/**
 * @param {SampleDeckRecipe[]} recipes
 */
export function downloadPublishedSampleRecipesJson(recipes) {
  try {
    var json = JSON.stringify(recipes, null, 2);
    var blob = new Blob([json], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = SAMPLE_DECK_RECIPES_PUBLIC_FILENAME;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error(e);
  }
}
