/**
 * デッキ構築画面「サンプルリスト」用レシピ。
 * 既定: 組み込み1件。`sample-deck-recipes.public.json` を index と同階層に置くと fetch で上書き。
 */
import {
  BUILTIN_STARTER_PRESET_NAME,
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

/** @type {string} sessionStorage — 開発者（サンプル編集）モード */
export const SESSION_SAMPLE_DEV_KEY = "llocg_sample_dev_mode_v1";

/** 開発者モード（管理者）が有効か */
export function isSampleDevMode() {
  try {
    return sessionStorage.getItem(SESSION_SAMPLE_DEV_KEY) === "1";
  } catch (_) {
    return false;
  }
}

const IDB_NAME = "llocg-sample-deploy";
const IDB_STORE = "kv";
const IDB_KEY_DEPLOY_DIR = "deploy-directory-handle";

/**
 * @typedef {{ id: string, name: string, deck: Record<string, number>, keyCardNos: string[], keyCard2Nos: string[], keyCard3Nos: string[], middleCardNos: string[], thumbnailCardNo: string, noteLines?: string[] }} SampleDeckRecipe
 */

/** fetch 済み一覧。null は「未設定＝組み込みにフォールバック」 */
let publishedRecipesCache = /** @type {SampleDeckRecipe[] | null} */ (null);

/** ユーザーがブラウザ内で編集したローカル上書き（リロード後も復元させるため localStorage 永続化）。
 * `setPublishedSampleRecipesCache` の都度ここにもコピーし、`initPublishedSampleRecipes` で
 * fetch 結果より優先して当てる。null/未設定の時は fetch 内容を素のまま使う。 */
const STORAGE_KEY_LOCAL_OVERRIDE = "llocg_sample_recipes_local_override";

function readLocalOverrideRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_OVERRIDE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const norm = normalizeSampleRecipesArray(parsed);
    return norm.length ? norm : null;
  } catch (_) {
    return null;
  }
}

function writeLocalOverrideRaw(recipes) {
  try {
    if (!Array.isArray(recipes) || recipes.length === 0) {
      localStorage.removeItem(STORAGE_KEY_LOCAL_OVERRIDE);
      return;
    }
    localStorage.setItem(STORAGE_KEY_LOCAL_OVERRIDE, JSON.stringify(recipes));
  } catch (_) {
    /* noop */
  }
}

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
        "ツール同梱の大会向けサンプルデッキ。",
        "キー／キ②／キ③／中間は既定のままです。",
      ],
    },
  ];
}

/**
 * サムネ用カード番号（未指定時はキー① → デッキ内の先頭番号）
 * @param {SampleDeckRecipe | null | undefined} recipe
 * @returns {string}
 */
export function effectiveSampleThumbnailCardNo(recipe) {
  if (!recipe || !recipe.deck) return "";
  var t = recipe.thumbnailCardNo != null ? String(recipe.thumbnailCardNo).trim() : "";
  if (t && (recipe.deck[t] || 0) > 0) return t;
  var k = Array.isArray(recipe.keyCardNos) ? recipe.keyCardNos[0] : "";
  if (k && (recipe.deck[k] || 0) > 0) return String(k).trim();
  var keys = Object.keys(recipe.deck).sort();
  for (var i = 0; i < keys.length; i++) {
    if ((recipe.deck[keys[i]] || 0) > 0) return keys[i];
  }
  return "";
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
  for (let i = 0; i < parsed.length; i++) {
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

function idbOpen() {
  return new Promise(function (resolve, reject) {
    var r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = function () {
      if (!r.result.objectStoreNames.contains(IDB_STORE)) {
        r.result.createObjectStore(IDB_STORE);
      }
    };
    r.onsuccess = function () {
      resolve(r.result);
    };
    r.onerror = function () {
      reject(r.error);
    };
  });
}

/** @param {string} key */
function idbGet(key) {
  return idbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, "readonly");
      var g = tx.objectStore(IDB_STORE).get(key);
      g.onsuccess = function () {
        resolve(g.result);
      };
      g.onerror = function () {
        reject(g.error);
      };
    });
  });
}

/** @param {string} key @param {unknown} val */
function idbPut(key, val) {
  return idbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = function () {
        resolve(undefined);
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  });
}

/**
 * @param {FileSystemDirectoryHandle} dir
 * @returns {Promise<boolean>}
 */
async function ensureDirWritePermission(dir) {
  try {
    var opts = { mode: "readwrite" };
    if ((await dir.queryPermission(opts)) === "granted") return true;
    if ((await dir.requestPermission(opts)) === "granted") return true;
  } catch (_) {}
  return false;
}

/**
 * @param {FileSystemDirectoryHandle} dir
 * @param {Blob} blob
 */
async function writeSampleJsonToDirectory(dir, blob) {
  var fh = await dir.getFileHandle(SAMPLE_DECK_RECIPES_PUBLIC_FILENAME, { create: true });
  var w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

/**
 * ページ読込時に呼ぶ。
 * @returns {Promise<void>}
 */
export function initPublishedSampleRecipes() {
  return (async function () {
    publishedRecipesCache = null;
    /* まず localStorage のローカル上書きを当てる（ユーザーの直近編集がここに残っている）。 */
    var local = readLocalOverrideRaw();
    if (local && local.length) {
      publishedRecipesCache = local;
    }
    try {
      var u = new URL(SAMPLE_DECK_RECIPES_PUBLIC_FILENAME, window.location.href);
      /* Pages / CDN の古い応答を避ける（同一 URL の fetch キャッシュをすり抜ける） */
      u.searchParams.set("v", String(Date.now()));
      var r = await fetch(u.toString(), { cache: "no-store" });
      if (!r.ok) return;
      var data = await r.json();
      var v = normalizeSampleRecipesArray(data);
      /* ローカル上書きが既にあるなら、そちらを優先（編集後リロード対策）。
         未設定 or 空の場合は公開ファイルを採用。 */
      if (!local || local.length === 0) {
        if (v.length) publishedRecipesCache = v;
      }
    } catch (_) {
      if (!local || local.length === 0) publishedRecipesCache = null;
    }
  })();
}

export function setPublishedSampleRecipesCache(recipes) {
  publishedRecipesCache = recipes && recipes.length ? recipes.slice() : null;
  /* ローカル上書きにも保存して、リロード後も「最後に編集した内容」を維持できるようにする。 */
  writeLocalOverrideRaw(publishedRecipesCache || []);
}

/** ユーザー操作で「公開ファイル（fetch 内容）の値に戻す」ためのリセット。 */
export function clearLocalSampleRecipesOverride() {
  try { localStorage.removeItem(STORAGE_KEY_LOCAL_OVERRIDE); } catch (_) { /* noop */ }
}

/** 現在ローカル上書きが効いているかを UI 側で表示できるよう公開。 */
export function hasLocalSampleRecipesOverride() {
  return !!readLocalOverrideRaw();
}

/** @returns {SampleDeckRecipe[]} */
export function getSampleDeckRecipes() {
  if (publishedRecipesCache != null && publishedRecipesCache.length > 0) {
    return publishedRecipesCache;
  }
  return getBuiltInSampleDeckRecipes();
}

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

/**
 * index.html と同じフォルダへ保存: 保存済みディレクトリハンドルまたはフォルダ選択。
 * 非対応ブラウザは保存ダイアログ／ダウンロード。
 * @param {SampleDeckRecipe[]} recipes
 * @returns {Promise<{ ok: boolean, mode: "project"|"picker"|"download"|"aborted" }>}
 */
export function savePublishedSampleRecipesToDisk(recipes) {
  return (async function () {
    var json = JSON.stringify(recipes, null, 2);
    var blob = new Blob([json], { type: "application/json;charset=utf-8" });

    /** @type {FileSystemDirectoryHandle | null | undefined} */
    var dir = null;
    try {
      dir = /** @type {FileSystemDirectoryHandle | undefined} */ (await idbGet(IDB_KEY_DEPLOY_DIR));
    } catch (_) {
      dir = null;
    }
    if (dir && (await ensureDirWritePermission(dir))) {
      try {
        await writeSampleJsonToDirectory(dir, blob);
        return { ok: true, mode: "project" };
      } catch (e) {
        console.error(e);
      }
    }

    if (typeof window !== "undefined" && typeof window.showDirectoryPicker === "function") {
      try {
        dir = await window.showDirectoryPicker({ mode: "readwrite" });
        if (!(await ensureDirWritePermission(dir))) {
          return { ok: false, mode: "aborted" };
        }
        await writeSampleJsonToDirectory(dir, blob);
        try {
          await idbPut(IDB_KEY_DEPLOY_DIR, dir);
        } catch (e2) {
          console.warn(e2);
        }
        return { ok: true, mode: "project" };
      } catch (e) {
        if (e && /** @type {{ name?: string }} */ (e).name === "AbortError") {
          return { ok: false, mode: "aborted" };
        }
        console.error(e);
      }
    }

    if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
      try {
        var handle = await window.showSaveFilePicker({
          suggestedName: SAMPLE_DECK_RECIPES_PUBLIC_FILENAME,
          types: [
            {
              description: "JSON",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        var writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { ok: true, mode: "picker" };
      } catch (e) {
        if (e && /** @type {{ name?: string }} */ (e).name === "AbortError") {
          return { ok: false, mode: "aborted" };
        }
        console.error(e);
        downloadPublishedSampleRecipesJson(recipes);
        return { ok: true, mode: "download" };
      }
    }
    downloadPublishedSampleRecipesJson(recipes);
    return { ok: true, mode: "download" };
  })();
}
