/**
 * 公開デッキ投稿（Firestore `publicDecks`）。
 * 投稿・更新・削除は Google ログイン必須。閲覧は未ログインでも可。
 */
import { MAIN_SIZE, MAX_COPIES_PER_CARD } from "./config.js";
import {
  getCloudFirestore,
  getCurrentCloudUser,
  isGoogleCloudUser,
  isGuestCloudUser,
  isCloudSyncAvailable,
  initCloudAuthIfConfigured,
  signInWithGoogle,
} from "./cloudAuth.js";
import { getPlayerDisplayName } from "./playerProfile.js";
import { normalizeDeckMapCounts } from "./deckLibrary.js";

const COLLECTION = "publicDecks";
const DOC_VERSION = 1;
/** 一覧に出す最大件数 */
export const PUBLIC_DECK_LIST_LIMIT = 60;
/** 1 ユーザーあたりの投稿上限 */
export const PUBLIC_DECKS_PER_USER_MAX = 12;
const NAME_MAX = 40;
const NOTE_MAX = 400;

/**
 * @typedef {Object} PublicDeckDoc
 * @property {number} v
 * @property {string} name
 * @property {string} note
 * @property {Record<string, number>} deck
 * @property {string[]} keyCardNos
 * @property {string[]} keyCard2Nos
 * @property {string[]} keyCard3Nos
 * @property {string[]} middleCardNos
 * @property {string|null} thumbnailCardNo
 * @property {string} ownerUid
 * @property {string|null} ownerName
 * @property {string|null} ownerPhotoURL
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {PublicDeckDoc & { id: string }} PublicDeckEntry
 */

function fs() {
  const h = getCloudFirestore();
  if (!h) throw new Error("Firebase が未初期化です。ネットワークと firebaseConfig を確認してください。");
  return h;
}

/**
 * Firebase 初期化がまだ／一度失敗している場合に、その場で初期化を試みる。
 * 起動直後にボタンを押したケースや CDN 一時失敗からの復帰用。
 * @returns {Promise<boolean>} 利用可能になったか
 */
async function ensureCloudReadyForPublicDecks() {
  if (isCloudSyncAvailable()) return true;
  try {
    await initCloudAuthIfConfigured();
  } catch (err) {
    console.warn("[publicDecks] initCloudAuthIfConfigured failed:", err);
  }
  return isCloudSyncAvailable();
}

function sanitizeCardNoList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const n = String(list[i] || "").trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function sanitizeName(raw) {
  const s = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
  return s || "無題のデッキ";
}

function sanitizeNote(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, NOTE_MAX);
}

/**
 * @param {Record<string, number>} deckMap
 * @returns {{ ok: boolean, map: Record<string, number>|null, message?: string }}
 */
export function validateDeckMapForPublicPost(deckMap) {
  const map = normalizeDeckMapCounts(deckMap || {});
  let total = 0;
  for (const k of Object.keys(map)) {
    const n = map[k];
    if (!Number.isFinite(n) || n < 1 || n > MAX_COPIES_PER_CARD) {
      return { ok: false, map: null, message: "カード枚数が不正です（各カード 1〜" + MAX_COPIES_PER_CARD + " 枚）。" };
    }
    total += n;
  }
  if (total < 1) {
    return { ok: false, map: null, message: "デッキが空です。" };
  }
  if (total !== MAIN_SIZE) {
    return {
      ok: false,
      map: null,
      message: "メインデッキは " + MAIN_SIZE + " 枚である必要があります（現在 " + total + " 枚）。",
    };
  }
  return { ok: true, map };
}

/** Google ログイン済みか（ゲスト除外） */
export function isGoogleUserForPublicDecks() {
  return isGoogleCloudUser();
}

/**
 * 投稿用に Google セッションを確保する。未ログイン／ゲストなら Google ログインを促す。
 * @returns {Promise<import('./cloudAuth.js').CloudUserSummary|null>}
 */
export async function ensureGoogleUserForPublicDecks() {
  if (!isCloudSyncAvailable()) {
    const ok = await ensureCloudReadyForPublicDecks();
    if (!ok) {
      throw new Error(
        "Firebase を初期化できませんでした。ネットワーク接続・広告ブロック・firebaseConfig.js を確認し、http://localhost で開き直してください。",
      );
    }
  }
  if (isGoogleUserForPublicDecks()) return getCurrentCloudUser();
  if (isGuestCloudUser()) {
    throw new Error("投稿には Google ログインが必要です（ゲストでは投稿できません）。右上から Google でログインしてください。");
  }
  const u = await signInWithGoogle();
  if (!u || isGuestCloudUser()) {
    throw new Error("Google ログインが完了しませんでした。");
  }
  return u;
}

function newPublicDeckId() {
  return (
    "pd-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * @param {any} raw
 * @param {string} id
 * @returns {PublicDeckEntry|null}
 */
function normalizePublicDeckDoc(raw, id) {
  if (!raw || typeof raw !== "object") return null;
  const deck = normalizeDeckMapCounts(raw.deck || {});
  if (!Object.keys(deck).length) return null;
  const name = sanitizeName(raw.name);
  const thumb =
    raw.thumbnailCardNo != null && String(raw.thumbnailCardNo).trim()
      ? String(raw.thumbnailCardNo).trim()
      : null;
  return {
    id: String(id),
    v: typeof raw.v === "number" ? raw.v : DOC_VERSION,
    name,
    note: sanitizeNote(raw.note),
    deck,
    keyCardNos: sanitizeCardNoList(raw.keyCardNos),
    keyCard2Nos: sanitizeCardNoList(raw.keyCard2Nos),
    keyCard3Nos: sanitizeCardNoList(raw.keyCard3Nos),
    middleCardNos: sanitizeCardNoList(raw.middleCardNos),
    thumbnailCardNo: thumb,
    ownerUid: String(raw.ownerUid || ""),
    ownerName: raw.ownerName != null ? String(raw.ownerName) : null,
    ownerPhotoURL: raw.ownerPhotoURL != null ? String(raw.ownerPhotoURL) : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

/**
 * @returns {Promise<PublicDeckEntry[]>}
 */
export async function listPublicDecks(limitCount) {
  await ensureCloudReadyForPublicDecks();
  const { db, api } = fs();
  const lim = Math.min(
    Math.max(1, Number(limitCount) || PUBLIC_DECK_LIST_LIMIT),
    PUBLIC_DECK_LIST_LIMIT,
  );
  const col = api.collection(db, COLLECTION);
  let snap;
  try {
    if (typeof api.query === "function" && typeof api.orderBy === "function" && typeof api.limit === "function") {
      const q = api.query(col, api.orderBy("createdAt", "desc"), api.limit(lim));
      snap = await api.getDocs(q);
    } else {
      snap = await api.getDocs(col);
    }
  } catch (err) {
    const msg = err && err.message ? String(err.message) : String(err || "");
    if (/index|failed-precondition/i.test(msg) && typeof api.getDocs === "function") {
      snap = await api.getDocs(col);
    } else {
      throw new Error(formatPublicDeckError(err));
    }
  }
  /** @type {PublicDeckEntry[]} */
  const out = [];
  snap.forEach(function (docSnap) {
    const entry = normalizePublicDeckDoc(docSnap.data(), docSnap.id);
    if (entry) out.push(entry);
  });
  out.sort(function (a, b) {
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
  return out.slice(0, lim);
}

/**
 * @param {string} ownerUid
 * @returns {Promise<number>}
 */
async function countPublicDecksByOwner(ownerUid) {
  const { db, api } = fs();
  const col = api.collection(db, COLLECTION);
  let snap;
  try {
    if (typeof api.query === "function" && typeof api.where === "function") {
      const q = api.query(col, api.where("ownerUid", "==", ownerUid));
      snap = await api.getDocs(q);
    } else {
      snap = await api.getDocs(col);
    }
  } catch (_) {
    snap = await api.getDocs(col);
  }
  let n = 0;
  snap.forEach(function (docSnap) {
    const d = docSnap.data();
    if (d && String(d.ownerUid || "") === ownerUid) n += 1;
  });
  return n;
}

/**
 * @param {{
 *   name: string,
 *   note?: string,
 *   deck: Record<string, number>,
 *   keyCardNos?: string[],
 *   keyCard2Nos?: string[],
 *   keyCard3Nos?: string[],
 *   middleCardNos?: string[],
 *   thumbnailCardNo?: string|null,
 * }} payload
 * @returns {Promise<PublicDeckEntry>}
 */
export async function publishPublicDeck(payload) {
  const user = await ensureGoogleUserForPublicDecks();
  if (!user) throw new Error("Google ログインが必要です。");
  const prepared = validateDeckMapForPublicPost(payload && payload.deck);
  if (!prepared.ok || !prepared.map) {
    throw new Error(prepared.message || "デッキが不正です。");
  }
  const owned = await countPublicDecksByOwner(user.uid);
  if (owned >= PUBLIC_DECKS_PER_USER_MAX) {
    throw new Error(
      "投稿上限（" + PUBLIC_DECKS_PER_USER_MAX + " 件）に達しています。不要な投稿を削除してから再度お試しください。",
    );
  }
  const { db, api } = fs();
  const id = newPublicDeckId();
  const now = new Date().toISOString();
  const thumbRaw = payload.thumbnailCardNo != null ? String(payload.thumbnailCardNo).trim() : "";
  const thumbnailCardNo =
    thumbRaw && prepared.map[thumbRaw] ? thumbRaw : Object.keys(prepared.map).sort()[0] || null;
  /** @type {PublicDeckDoc} */
  const doc = {
    v: DOC_VERSION,
    name: sanitizeName(payload.name),
    note: sanitizeNote(payload.note),
    deck: prepared.map,
    keyCardNos: sanitizeCardNoList(payload.keyCardNos),
    keyCard2Nos: sanitizeCardNoList(payload.keyCard2Nos),
    keyCard3Nos: sanitizeCardNoList(payload.keyCard3Nos),
    middleCardNos: sanitizeCardNoList(payload.middleCardNos),
    thumbnailCardNo,
    ownerUid: user.uid,
    ownerName: getPlayerDisplayName() || user.displayName || null,
    ownerPhotoURL: user.photoURL || null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await api.setDoc(api.doc(db, COLLECTION, id), doc);
  } catch (err) {
    throw new Error(formatPublicDeckError(err));
  }
  return /** @type {PublicDeckEntry} */ ({ ...doc, id });
}

/**
 * @param {string} deckId
 * @returns {Promise<void>}
 */
export async function deletePublicDeck(deckId) {
  const user = await ensureGoogleUserForPublicDecks();
  if (!user) throw new Error("Google ログインが必要です。");
  const id = String(deckId || "").trim();
  if (!id) throw new Error("デッキ ID が不正です。");
  const { db, api } = fs();
  const ref = api.doc(db, COLLECTION, id);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatPublicDeckError(err));
  }
  if (!snap.exists()) throw new Error("投稿が見つかりません。");
  const data = snap.data();
  if (!data || String(data.ownerUid || "") !== user.uid) {
    throw new Error("自分の投稿のみ削除できます。");
  }
  try {
    await api.deleteDoc(ref);
  } catch (err) {
    throw new Error(formatPublicDeckError(err));
  }
}

/**
 * @param {string|null|undefined} thumbnailCardNo
 * @param {Record<string, number>} deck
 * @returns {string}
 */
export function effectivePublicDeckThumbnailCardNo(thumbnailCardNo, deck) {
  const t = thumbnailCardNo != null ? String(thumbnailCardNo).trim() : "";
  if (t && deck && deck[t]) return t;
  const keys = Object.keys(deck || {}).filter(function (k) {
    return (deck[k] || 0) > 0;
  });
  keys.sort();
  return keys[0] || "";
}

function formatPublicDeckError(err) {
  const code = err && err.code ? String(err.code) : "";
  const msg = err && err.message ? String(err.message) : String(err || "不明なエラー");
  if (code === "permission-denied" || /permission/i.test(msg)) {
    return (
      "権限がありません。Google ログイン済みか、Firebase の Firestore ルールに publicDecks が反映されているか確認してください。"
    );
  }
  if (code === "unavailable" || /network/i.test(msg)) {
    return "ネットワークエラーです。接続を確認して再試行してください。";
  }
  return (code ? code + " — " : "") + msg;
}
