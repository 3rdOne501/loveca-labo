/**
 * ティアリストの端末内保存と、サイト内公開（Firestore `publicTierLists`）。
 * 公開の投稿・更新・削除は Google ログイン必須。閲覧は未ログインでも可。
 */
import {
  getCloudFirestore,
  getCurrentCloudUser,
  initCloudAuthIfConfigured,
  isCloudSyncAvailable,
  isGoogleCloudUser,
  isGuestCloudUser,
  signInWithGoogle,
} from "./cloudAuth.js";
import { getPlayerDisplayName } from "./playerProfile.js";

const COLLECTION = "publicTierLists";
const LOCAL_KEY = "llocg.tierlist.saved.v1";
const DOC_VERSION = 1;
const LOCAL_MAX = 24;
export const PUBLIC_TIERLIST_LIST_LIMIT = 40;
export const PUBLIC_TIERLISTS_PER_USER_MAX = 20;
const TITLE_MAX = 40;
const NOTE_MAX = 200;
const TIER_LABEL_MAX = 16;
const TIER_MAX = 10;
const ENTRY_MAX = 400;
const POOL_ID = "pool";

/**
 * @typedef {Object} TierListSnapshotTier
 * @property {string} id
 * @property {string} label
 * @property {number} order
 * @property {string} color
 */

/**
 * @typedef {Object} TierListSnapshotEntry
 * @property {string} id
 * @property {string} tierId
 * @property {number} orderInTier
 * @property {string} [cardNo]
 * @property {string} [charId]
 */

/**
 * @typedef {Object} TierListSnapshot
 * @property {number} v
 * @property {string} title
 * @property {string} note
 * @property {'card'|'character'} kind
 * @property {TierListSnapshotTier[]} tiers
 * @property {TierListSnapshotEntry[]} entries
 * @property {string} ownerUid
 * @property {string|null} ownerName
 * @property {string|null} ownerPhotoURL
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {TierListSnapshot & { id: string }} PublicTierListEntry
 * @typedef {TierListSnapshot & { localId: string, savedAt: string, publicId: string|null }} LocalTierListEntry
 */

function fs() {
  const h = getCloudFirestore();
  if (!h) throw new Error("Firebase が未初期化です。ネットワークと firebaseConfig を確認してください。");
  return h;
}

async function ensureCloudReady() {
  if (isCloudSyncAvailable()) return true;
  try {
    await initCloudAuthIfConfigured();
  } catch (err) {
    console.warn("[tierListLibrary] init failed:", err);
  }
  return isCloudSyncAvailable();
}

function trimText(raw, max) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function sanitizeColor(raw) {
  const s = String(raw || "").trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  return "#888888";
}

function sanitizeTierId(raw) {
  const s = String(raw || "").trim();
  if (!/^[A-Za-z0-9_-]{1,24}$/.test(s) || s === POOL_ID) return "";
  return s;
}

function sanitizeItemId(raw) {
  return String(raw || "")
    .trim()
    .replace(/\//g, "_")
    .slice(0, 80);
}

/**
 * ルームの現在地を保存・公開用のスナップショットにする。
 * @param {object|null|undefined} room
 * @param {object[]} entries
 * @returns {TierListSnapshot}
 */
export function snapshotFromTierListBoard(room, entries) {
  const kind = room && room.kind === "character" ? "character" : "card";
  const title =
    trimText(room && room.title, TITLE_MAX) ||
    (kind === "character" ? "ラブカ キャラティアリスト" : "ラブカ ティアリスト");
  /** @type {TierListSnapshotTier[]} */
  const tiers = [];
  const tierMap = (room && room.tiers) || {};
  Object.keys(tierMap).forEach(function (key) {
    const t = tierMap[key];
    const id = sanitizeTierId((t && t.id) || key);
    if (!id) return;
    tiers.push({
      id: id,
      label: trimText((t && t.label) || id, TIER_LABEL_MAX) || id,
      order: Number(t && t.order) || 0,
      color: sanitizeColor(t && t.color),
    });
  });
  tiers.sort(function (a, b) {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
  if (tiers.length > TIER_MAX) tiers.length = TIER_MAX;
  const allowed = {};
  tiers.forEach(function (t) {
    allowed[t.id] = true;
  });
  if (!tiers.length) throw new Error("保存できるティアがありません。");
  /** @type {TierListSnapshotEntry[]} */
  const outEntries = [];
  const seen = new Set();
  (entries || []).forEach(function (e) {
    if (!e || outEntries.length >= ENTRY_MAX) return;
    const tierId = String(e.tierId || "");
    if (tierId !== POOL_ID && !allowed[tierId]) return;
    const cardNo = sanitizeItemId(e.cardNo);
    const charId = sanitizeItemId(e.charId).toLowerCase();
    const id = kind === "character" ? charId : cardNo;
    if (!id || seen.has(id)) return;
    seen.add(id);
    /** @type {TierListSnapshotEntry} */
    const row = {
      id: id,
      tierId: tierId === POOL_ID ? POOL_ID : tierId,
      orderInTier: Number.isFinite(Number(e.orderInTier)) ? Number(e.orderInTier) : outEntries.length * 1000,
    };
    if (kind === "character") row.charId = charId;
    else row.cardNo = cardNo;
    outEntries.push(row);
  });
  const now = new Date().toISOString();
  return {
    v: DOC_VERSION,
    title: title,
    note: "",
    kind: kind,
    tiers: tiers,
    entries: outEntries,
    ownerUid: "",
    ownerName: null,
    ownerPhotoURL: null,
    createdAt: now,
    updatedAt: now,
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function writeLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

/** @returns {LocalTierListEntry[]} */
export function listLocalTierLists() {
  return readLocal()
    .filter(function (row) {
      return row && row.localId && row.title && Array.isArray(row.tiers);
    })
    .sort(function (a, b) {
      return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
    });
}

/**
 * @param {TierListSnapshot} snapshot
 * @returns {LocalTierListEntry}
 */
export function saveLocalTierList(snapshot) {
  const snap = snapshotFromStored(snapshot);
  const now = new Date().toISOString();
  /** @type {LocalTierListEntry} */
  const row = Object.assign({}, snap, {
    localId: "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
    savedAt: now,
    publicId: null,
    updatedAt: now,
  });
  const list = readLocal();
  list.unshift(row);
  writeLocal(list.slice(0, LOCAL_MAX));
  return row;
}

/** @param {string} localId @param {string|null} publicId */
export function linkLocalTierListPublicId(localId, publicId) {
  const list = readLocal();
  const row = list.find(function (r) {
    return r && r.localId === localId;
  });
  if (!row) return;
  row.publicId = publicId ? String(publicId) : null;
  writeLocal(list);
}

/** @param {string} localId */
export function deleteLocalTierList(localId) {
  writeLocal(
    readLocal().filter(function (r) {
      return !r || r.localId !== localId;
    }),
  );
}

/**
 * @param {unknown} raw
 * @returns {TierListSnapshot}
 */
function snapshotFromStored(raw) {
  if (!raw || typeof raw !== "object") throw new Error("リストの内容が不正です。");
  const src = /** @type {TierListSnapshot} */ (raw);
  return snapshotFromTierListBoard(
    { title: src.title, kind: src.kind, tiers: tiersArrayToMap(src.tiers) },
    src.entries || [],
  );
}

/** @param {TierListSnapshotTier[]|undefined} tiers */
function tiersArrayToMap(tiers) {
  /** @type {Record<string, TierListSnapshotTier>} */
  const map = {};
  (tiers || []).forEach(function (t) {
    if (t && t.id) map[t.id] = t;
  });
  return map;
}

/**
 * 閲覧用。ルーム同期はしない。
 * @param {TierListSnapshot} snapshot
 */
export function tierListSnapshotAsRoom(snapshot) {
  /** @type {Record<string, TierListSnapshotTier>} */
  const tiers = {};
  (snapshot.tiers || []).forEach(function (t) {
    tiers[t.id] = t;
  });
  const room = {
    v: DOC_VERSION,
    code: "",
    title: snapshot.title,
    kind: snapshot.kind,
    status: "closed",
    hostUid: snapshot.ownerUid || "",
    hostName: snapshot.ownerName,
    hostPhotoURL: snapshot.ownerPhotoURL,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    expiresAt: "",
    members: {},
    tiers: tiers,
  };
  const entries = (snapshot.entries || []).map(function (e) {
    return {
      id: e.id,
      v: DOC_VERSION,
      kind: snapshot.kind,
      cardNo: e.cardNo || "",
      charId: e.charId || "",
      tierId: e.tierId,
      orderInTier: e.orderInTier,
      byUid: snapshot.ownerUid || "",
      byName: snapshot.ownerName || "",
      byPhotoURL: snapshot.ownerPhotoURL,
      placedAt: snapshot.updatedAt,
      movedAt: snapshot.updatedAt,
      movedByUid: snapshot.ownerUid || "",
      movedByName: snapshot.ownerName || "",
    };
  });
  return { room: room, entries: entries };
}

async function ensureGoogleUser() {
  if (!(await ensureCloudReady())) {
    throw new Error("Firebase を初期化できませんでした。ネットワークと firebaseConfig を確認してください。");
  }
  if (isGoogleCloudUser()) return getCurrentCloudUser();
  if (isGuestCloudUser()) {
    throw new Error("公開には Google ログインが必要です。右上から Google でログインしてください。");
  }
  const u = await signInWithGoogle();
  if (!u || isGuestCloudUser()) throw new Error("Google ログインが完了しませんでした。");
  return u;
}

function newPublicId() {
  return "tl-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function formatError(err) {
  const code = err && err.code ? String(err.code) : "";
  const msg = err && err.message ? String(err.message) : String(err || "不明なエラー");
  if (code === "permission-denied" || /permission/i.test(msg)) {
    return "権限がありません。Google ログインと、Firestore ルールの publicTierLists を確認してください。";
  }
  if (code === "unavailable" || /network/i.test(msg)) return "ネットワークエラーです。接続を確認して再試行してください。";
  return (code ? code + " — " : "") + msg;
}

/**
 * @param {any} raw
 * @param {string} id
 * @returns {PublicTierListEntry|null}
 */
function normalizePublicDoc(raw, id) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tiers)) return null;
  try {
    const snap = snapshotFromStored(raw);
    snap.ownerUid = String(raw.ownerUid || "");
    snap.ownerName = raw.ownerName != null ? String(raw.ownerName) : null;
    snap.ownerPhotoURL = raw.ownerPhotoURL != null ? String(raw.ownerPhotoURL) : null;
    snap.note = trimText(raw.note, NOTE_MAX);
    snap.createdAt = typeof raw.createdAt === "string" ? raw.createdAt : snap.createdAt;
    snap.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : snap.updatedAt;
    return Object.assign({ id: String(id) }, snap);
  } catch (_) {
    return null;
  }
}

function toFirestoreDoc(snapshot, user, createdAt) {
  const now = new Date().toISOString();
  return {
    v: DOC_VERSION,
    title: snapshot.title,
    note: trimText(snapshot.note, NOTE_MAX),
    kind: snapshot.kind,
    tiers: snapshot.tiers,
    entries: snapshot.entries,
    ownerUid: user.uid,
    ownerName: getPlayerDisplayName() || user.displayName || null,
    ownerPhotoURL: user.photoURL || null,
    createdAt: createdAt || now,
    updatedAt: now,
  };
}

/** @returns {Promise<PublicTierListEntry[]>} */
export async function listPublicTierLists() {
  if (!(await ensureCloudReady())) return [];
  const { db, api } = fs();
  const col = api.collection(db, COLLECTION);
  let snap;
  try {
    if (typeof api.query === "function" && typeof api.orderBy === "function" && typeof api.limit === "function") {
      snap = await api.getDocs(api.query(col, api.orderBy("updatedAt", "desc"), api.limit(PUBLIC_TIERLIST_LIST_LIMIT)));
    } else {
      snap = await api.getDocs(col);
    }
  } catch (err) {
    const msg = err && err.message ? String(err.message) : String(err || "");
    if (/index|failed-precondition/i.test(msg)) snap = await api.getDocs(col);
    else throw new Error(formatError(err));
  }
  /** @type {PublicTierListEntry[]} */
  const out = [];
  snap.forEach(function (docSnap) {
    const entry = normalizePublicDoc(docSnap.data(), docSnap.id);
    if (entry) out.push(entry);
  });
  out.sort(function (a, b) {
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
  return out.slice(0, PUBLIC_TIERLIST_LIST_LIMIT);
}

async function countOwned(ownerUid) {
  const { db, api } = fs();
  const col = api.collection(db, COLLECTION);
  let snap;
  try {
    if (typeof api.query === "function" && typeof api.where === "function") {
      snap = await api.getDocs(api.query(col, api.where("ownerUid", "==", ownerUid)));
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
 * @param {TierListSnapshot} snapshot
 * @param {string} [existingId] 自分の公開を上書きするとき
 * @returns {Promise<PublicTierListEntry>}
 */
export async function publishTierListSnapshot(snapshot, existingId) {
  const user = await ensureGoogleUser();
  if (!user) throw new Error("Google ログインが必要です。");
  const snap = snapshotFromStored(snapshot);
  const { db, api } = fs();
  const id = String(existingId || "").trim();
  if (id) {
    const ref = api.doc(db, COLLECTION, id);
    let prev;
    try {
      prev = await api.getDoc(ref);
    } catch (err) {
      throw new Error(formatError(err));
    }
    if (prev.exists()) {
      const data = prev.data() || {};
      if (String(data.ownerUid || "") !== user.uid) {
        throw new Error("自分の公開リストだけ更新できます。");
      }
      const doc = toFirestoreDoc(snap, user, typeof data.createdAt === "string" ? data.createdAt : undefined);
      try {
        await api.setDoc(ref, doc);
      } catch (err) {
        throw new Error(formatError(err));
      }
      return /** @type {PublicTierListEntry} */ (Object.assign({ id: id }, doc));
    }
  }
  const owned = await countOwned(user.uid);
  if (owned >= PUBLIC_TIERLISTS_PER_USER_MAX) {
    throw new Error("公開上限（" + PUBLIC_TIERLISTS_PER_USER_MAX + " 件）に達しています。不要な公開を削除してください。");
  }
  const freshId = newPublicId();
  const doc = toFirestoreDoc(snap, user);
  try {
    await api.setDoc(api.doc(db, COLLECTION, freshId), doc);
  } catch (err) {
    throw new Error(formatError(err));
  }
  return /** @type {PublicTierListEntry} */ (Object.assign({ id: freshId }, doc));
}

/** @param {string} id */
export async function deletePublicTierList(id) {
  const user = await ensureGoogleUser();
  if (!user) throw new Error("Google ログインが必要です。");
  const docId = String(id || "").trim();
  if (!docId) throw new Error("公開リストが見つかりません。");
  const { db, api } = fs();
  const ref = api.doc(db, COLLECTION, docId);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatError(err));
  }
  if (!snap.exists()) throw new Error("公開リストが見つかりません。");
  const data = snap.data();
  if (!data || String(data.ownerUid || "") !== user.uid) throw new Error("自分の公開だけ削除できます。");
  try {
    await api.deleteDoc(ref);
  } catch (err) {
    throw new Error(formatError(err));
  }
}
