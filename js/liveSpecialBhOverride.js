/**
 * ユーザー手動オーバーライド: ライブカードを「ドローエール／音符ライブ／どちらでもない」と
 * 明示的に上書き保存する仕組み（cards.js の自動判定が誤検出してしまう個別カード向け）。
 *
 *   - 値 "draw-yell"  → そのカード番号は強制的にドローエール扱い
 *   - 値 "note-live"  → そのカード番号は強制的に音符ライブ（スコア）扱い
 *   - 値 "none"       → どちらの特殊 BH にも該当しない扱い（強制 false）
 *   - キー未登録      → ヒューリスティック判定にフォールバック
 *
 * カード番号は cards.js の `normalizeCardCatalogLookupKey` に揃えるため、利用側で正規化して
 * から get/set を呼ぶこと（このモジュール内では渡された文字列をそのまま保存キーとする）。
 *
 * 保存先: `localStorage["llocg_live_special_bh_override"]` に JSON で `{ <card_no>: <kind> }` を格納。
 */

const STORAGE_KEY = "llocg_live_special_bh_override";

/** @typedef {"draw-yell" | "note-live" | "none"} SpecialBhKind */

/** @type {Record<string, SpecialBhKind> | null} メモリキャッシュ */
let cached = null;

function readAllRaw() {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        /** @type {Record<string, SpecialBhKind>} */
        const safe = {};
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (v === "draw-yell" || v === "note-live" || v === "none") safe[k] = v;
        }
        cached = safe;
        return cached;
      }
    }
  } catch (_) {
    /* noop */
  }
  cached = {};
  return cached;
}

function writeAll(obj) {
  cached = Object.assign({}, obj || {});
  try {
    if (Object.keys(cached).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    }
  } catch (_) {
    /* localStorage 不可時は黙ってメモリに残す */
  }
  notifyChangeListeners();
}

/** @type {Set<() => void>} */
const listeners = new Set();
function notifyChangeListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (_) {
      /* noop */
    }
  });
}

/**
 * @param {string} normalizedCardNo
 * @returns {SpecialBhKind | null}
 */
export function getLiveSpecialBhOverride(normalizedCardNo) {
  if (!normalizedCardNo) return null;
  const all = readAllRaw();
  const v = all[normalizedCardNo];
  return v === "draw-yell" || v === "note-live" || v === "none" ? v : null;
}

/**
 * @param {string} normalizedCardNo
 * @param {SpecialBhKind | null | undefined} kind
 */
export function setLiveSpecialBhOverride(normalizedCardNo, kind) {
  if (!normalizedCardNo) return;
  const all = Object.assign({}, readAllRaw());
  if (kind === "draw-yell" || kind === "note-live" || kind === "none") {
    all[normalizedCardNo] = kind;
  } else {
    delete all[normalizedCardNo];
  }
  writeAll(all);
}

/** @returns {Record<string, SpecialBhKind>} 現在の保存内容（コピー）。 */
export function dumpLiveSpecialBhOverrides() {
  return Object.assign({}, readAllRaw());
}

/**
 * 上書きが変わったときに呼ばれるリスナー登録。返り値で解除。
 * @param {() => void} fn
 */
export function onLiveSpecialBhOverrideChange(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** メモリキャッシュを破棄して localStorage から読み直す（クラウド同期で外部上書きされた直後等に呼ぶ） */
export function invalidateLiveSpecialBhOverrideCache() {
  cached = null;
  notifyChangeListeners();
}
