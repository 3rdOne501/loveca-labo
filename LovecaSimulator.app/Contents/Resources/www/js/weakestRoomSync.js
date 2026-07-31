/**
 * ラブカ最弱カード会議のルーム同期（Firestore）。
 * Google ログイン（cloudAuth）必須。
 *
 * 票は entries/{id} の votes マップに uid をキーにして書くため、
 * 同時投票でもドット記法の更新どうしがぶつからない（カウンタ加算のレースも起きない）。
 */
import { getCloudFirestore, getCurrentCloudUser } from "./cloudAuth.js";
import { getPlayerDisplayName } from "./playerProfile.js";

const COLLECTION = "weakestRooms";
const ENTRIES = "entries";
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LEN = 5;
const ROOM_TTL_DAYS = 7;

export const WEAKEST_MAX_TITLE_LEN = 40;
export const WEAKEST_MAX_CATEGORY_LEN = 24;
export const WEAKEST_MAX_COMMENT_LEN = 120;
export const WEAKEST_MAX_CATEGORIES = 12;

/**
 * @typedef {Object} WeakestCategoryFilter
 * @property {string[]} types メンバー / ライブ
 * @property {string[]} schools μ's / Aqours / 虹ヶ咲 / Liella! / 蓮ノ空
 * @property {string[]} products cards.json の product
 */

/**
 * @typedef {Object} WeakestCategory
 * @property {string} id
 * @property {string} name
 * @property {WeakestCategoryFilter} filter
 * @property {number} order
 * @property {string} createdAt
 * @property {string} createdBy
 */

/**
 * @typedef {Object} WeakestMember
 * @property {string} name
 * @property {string|null} photoURL
 * @property {string} joinedAt
 * @property {string} lastSeenAt
 */

/**
 * @typedef {Object} WeakestRoomDoc
 * @property {number} v
 * @property {string} code
 * @property {string} title
 * @property {'open'|'closed'} status
 * @property {string} hostUid
 * @property {string|null} hostName
 * @property {string|null} hostPhotoURL
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} expiresAt
 * @property {Record<string, WeakestMember>} members
 * @property {Record<string, WeakestCategory>} categories
 */

/**
 * @typedef {Object} WeakestVote
 * @property {string} name
 * @property {string|null} photoURL
 * @property {string} comment
 * @property {string} at
 */

/**
 * @typedef {Object} WeakestEntryDoc
 * @property {string} id
 * @property {number} v
 * @property {string} cardNo
 * @property {string} categoryId
 * @property {string} byUid
 * @property {string} byName
 * @property {string|null} byPhotoURL
 * @property {string} comment
 * @property {string} createdAt
 * @property {Record<string, WeakestVote>} votes
 */

export function isWeakestRoomAvailable() {
  return !!getCloudFirestore();
}

function fs() {
  const x = getCloudFirestore();
  if (!x) throw new Error("Firestore が利用できません。Google ログインの設定を確認してください。");
  return x;
}

function requireUser() {
  const u = getCurrentCloudUser();
  if (!u || !u.uid) throw new Error("Google ログインが必要です。");
  return u;
}

export function getWeakestMyUid() {
  const u = getCurrentCloudUser();
  return u && u.uid ? String(u.uid) : "";
}

function myName(user) {
  return getPlayerDisplayName() || user.displayName || (user.email ? String(user.email).split("@")[0] : "") || "ゲスト";
}

/** @param {string} code */
export function normalizeWeakestRoomCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function roomRef(code) {
  const { db, api } = fs();
  return api.doc(db, COLLECTION, normalizeWeakestRoomCode(code));
}

function entriesCol(code) {
  const { db, api } = fs();
  return api.collection(db, COLLECTION, normalizeWeakestRoomCode(code), ENTRIES);
}

function entryRef(code, entryId) {
  const { db, api } = fs();
  return api.doc(db, COLLECTION, normalizeWeakestRoomCode(code), ENTRIES, String(entryId));
}

function randomRoomCode() {
  let s = "";
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return s;
}

function formatWeakestFirestoreError(err) {
  const code = err && err.code ? String(err.code) : "";
  if (code === "permission-denied") {
    return (
      "Firestore の権限がありません。Firebase コンソール → Firestore → ルール に " +
      "weakestRooms のルールを追加してください（リポジトリの firestore.rules を参照）。"
    );
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return "Firestore に接続できません。ネットワークを確認して再試行してください。";
  }
  return err && err.message ? String(err.message) : String(err || "ルーム操作に失敗しました");
}

function nowIso() {
  return new Date().toISOString();
}

function expiryIso() {
  return new Date(Date.now() + ROOM_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** @param {string} s @param {number} max */
function trimText(s, max) {
  return String(s == null ? "" : s)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** 部門とカード番号から決まる ID。同じ部門への二重推薦をドキュメント ID の重複として弾ける。 */
export function weakestEntryId(categoryId, cardNo) {
  return String(categoryId) + "__" + String(cardNo).replace(/\//g, "_");
}

/** @param {WeakestEntryDoc|null} entry */
export function weakestEntryVoteCount(entry) {
  if (!entry || !entry.votes) return 0;
  return Object.keys(entry.votes).length;
}

/** @param {WeakestEntryDoc|null} entry @param {string} uid */
export function weakestEntryHasVote(entry, uid) {
  return !!(entry && entry.votes && uid && entry.votes[uid]);
}

/** @param {WeakestRoomDoc|null} room */
export function weakestSortedCategories(room) {
  const map = (room && room.categories) || {};
  return Object.keys(map)
    .map(function (id) {
      return map[id];
    })
    .filter(Boolean)
    .sort(function (a, b) {
      const oa = Number(a.order) || 0;
      const ob = Number(b.order) || 0;
      if (oa !== ob) return oa - ob;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
}

/** @param {WeakestRoomDoc|null} room @param {string} uid */
export function isWeakestHost(room, uid) {
  return !!(room && uid && room.hostUid === uid);
}

/**
 * @param {string} title
 * @returns {Promise<{ code: string, room: WeakestRoomDoc }>}
 */
export async function createWeakestRoom(title) {
  const user = requireUser();
  const { api } = fs();
  const name = myName(user);
  const now = nowIso();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomRoomCode();
    const ref = roomRef(code);
    try {
      const existing = await api.getDoc(ref);
      if (existing.exists()) continue;
    } catch (err) {
      throw new Error(formatWeakestFirestoreError(err));
    }
    /** @type {WeakestRoomDoc} */
    const doc = {
      v: 1,
      code: code,
      title: trimText(title, WEAKEST_MAX_TITLE_LEN) || "ラブカ最弱カード会議",
      status: "open",
      hostUid: user.uid,
      hostName: name,
      hostPhotoURL: user.photoURL || null,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiryIso(),
      members: {
        [user.uid]: { name: name, photoURL: user.photoURL || null, joinedAt: now, lastSeenAt: now },
      },
      categories: {},
    };
    try {
      await api.setDoc(ref, doc);
      return { code: code, room: doc };
    } catch (err) {
      if (attempt >= 7) throw new Error(formatWeakestFirestoreError(err));
    }
  }
  throw new Error("ルーム作成に失敗しました。もう一度お試しください。");
}

/**
 * @param {string} rawCode
 * @returns {Promise<{ code: string, room: WeakestRoomDoc }>}
 */
export async function joinWeakestRoom(rawCode) {
  const user = requireUser();
  const code = normalizeWeakestRoomCode(rawCode);
  if (code.length !== ROOM_CODE_LEN) {
    throw new Error("ルームコードは英数字" + ROOM_CODE_LEN + "文字です。");
  }
  const { api } = fs();
  const ref = roomRef(code);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  if (!snap.exists()) {
    throw new Error("ルームが見つかりません。コードの打ち間違い、または Firestore ルール未更新の可能性があります。");
  }
  const data = /** @type {WeakestRoomDoc} */ (snap.data());
  if (data.status === "closed") throw new Error("この会議は終了しています。");
  const now = nowIso();
  const name = myName(user);
  const existing = (data.members || {})[user.uid];
  try {
    await api.updateDoc(ref, {
      ["members." + user.uid]: {
        name: name,
        photoURL: user.photoURL || null,
        joinedAt: existing && existing.joinedAt ? existing.joinedAt : now,
        lastSeenAt: now,
      },
      updatedAt: now,
    });
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  return { code: code, room: data };
}

/**
 * @param {string} code
 * @param {(room: WeakestRoomDoc|null) => void} onChange
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function watchWeakestRoom(code, onChange, onError) {
  const { api } = fs();
  return api.onSnapshot(
    roomRef(code),
    function (snap) {
      onChange(snap.exists() ? /** @type {WeakestRoomDoc} */ (snap.data()) : null);
    },
    function (err) {
      console.warn("[weakestRoom] room snapshot error:", err);
      if (typeof onError === "function") onError(err);
      else onChange(null);
    },
  );
}

/**
 * @param {string} code
 * @param {(entries: WeakestEntryDoc[]) => void} onChange
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function watchWeakestEntries(code, onChange, onError) {
  const { api } = fs();
  return api.onSnapshot(
    entriesCol(code),
    function (snap) {
      /** @type {WeakestEntryDoc[]} */
      const list = [];
      snap.forEach(function (d) {
        const data = d.data();
        if (data) list.push(Object.assign({ id: d.id }, data));
      });
      onChange(list);
    },
    function (err) {
      console.warn("[weakestRoom] entries snapshot error:", err);
      if (typeof onError === "function") onError(err);
      else onChange([]);
    },
  );
}

/**
 * ホストのみ。部門を追加する。
 * @param {string} code
 * @param {{ name: string, filter?: Partial<WeakestCategoryFilter> }} input
 * @returns {Promise<WeakestCategory>}
 */
export async function addWeakestCategory(code, input) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {WeakestRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("部門の追加は会議の作成者のみできます。");
  const current = weakestSortedCategories(room);
  if (current.length >= WEAKEST_MAX_CATEGORIES) {
    throw new Error("部門は最大 " + WEAKEST_MAX_CATEGORIES + " 個までです。");
  }
  const name = trimText(input && input.name, WEAKEST_MAX_CATEGORY_LEN);
  if (!name) throw new Error("部門名を入力してください。");
  const filter = input && input.filter ? input.filter : {};
  const now = nowIso();
  /** @type {WeakestCategory} */
  const category = {
    id: "cat_" + Math.random().toString(36).slice(2, 10),
    name: name,
    filter: {
      types: Array.isArray(filter.types) ? filter.types.slice(0, 4) : [],
      schools: Array.isArray(filter.schools) ? filter.schools.slice(0, 10) : [],
      products: Array.isArray(filter.products) ? filter.products.slice(0, 30) : [],
    },
    order: current.length ? Number(current[current.length - 1].order || 0) + 1 : 0,
    createdAt: now,
    createdBy: user.uid,
  };
  try {
    await api.updateDoc(ref, {
      ["categories." + category.id]: category,
      updatedAt: now,
    });
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  return category;
}

/**
 * ホストのみ。部門と、その部門に推薦されたカードをまとめて削除する。
 * @param {string} code
 * @param {string} categoryId
 */
export async function removeWeakestCategory(code, categoryId) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {WeakestRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("部門の削除は会議の作成者のみできます。");
  try {
    const all = await api.getDocs(entriesCol(code));
    const jobs = [];
    all.forEach(function (d) {
      const data = d.data();
      if (data && data.categoryId === categoryId) jobs.push(api.deleteDoc(entryRef(code, d.id)));
    });
    await Promise.all(jobs);
    await api.updateDoc(ref, {
      ["categories." + categoryId]: api.deleteField(),
      updatedAt: nowIso(),
    });
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
}

/**
 * ホストのみ。部門名を変更する。
 * @param {string} code
 * @param {string} categoryId
 * @param {string} name
 */
export async function renameWeakestCategory(code, categoryId, name) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {WeakestRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("部門名の変更は会議の作成者のみできます。");
  const next = trimText(name, WEAKEST_MAX_CATEGORY_LEN);
  if (!next) throw new Error("部門名を入力してください。");
  try {
    await api.updateDoc(ref, {
      ["categories." + categoryId + ".name"]: next,
      updatedAt: nowIso(),
    });
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
}

/**
 * カードを部門に推薦する。推薦者は自動で1票入れる。
 * @param {string} code
 * @param {{ cardNo: string, categoryId: string, comment?: string }} input
 * @returns {Promise<WeakestEntryDoc>}
 */
export async function nominateWeakestCard(code, input) {
  const user = requireUser();
  const { api } = fs();
  const cardNo = String((input && input.cardNo) || "").trim();
  const categoryId = String((input && input.categoryId) || "").trim();
  if (!cardNo || !categoryId) throw new Error("カードと部門を指定してください。");
  const id = weakestEntryId(categoryId, cardNo);
  const ref = entryRef(code, id);
  const now = nowIso();
  const name = myName(user);
  const comment = trimText(input && input.comment, WEAKEST_MAX_COMMENT_LEN);
  let existing;
  try {
    existing = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  if (existing.exists()) {
    const err = new Error("このカードはすでにこの部門に挙がっています。");
    err.code = "weakest/duplicate-entry";
    err.entryId = id;
    throw err;
  }
  /** @type {WeakestEntryDoc} */
  const doc = {
    id: id,
    v: 1,
    cardNo: cardNo,
    categoryId: categoryId,
    byUid: user.uid,
    byName: name,
    byPhotoURL: user.photoURL || null,
    comment: comment,
    createdAt: now,
    votes: {
      [user.uid]: { name: name, photoURL: user.photoURL || null, comment: comment, at: now },
    },
  };
  try {
    await api.setDoc(ref, doc);
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  await touchWeakestPresence(code);
  return doc;
}

/**
 * 推薦者本人またはホストのみ。
 * @param {string} code
 * @param {string} entryId
 */
export async function removeWeakestEntry(code, entryId) {
  requireUser();
  const { api } = fs();
  try {
    await api.deleteDoc(entryRef(code, entryId));
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
}

/**
 * 賛成票のトグル。votes マップの自分のキーだけを触るので同時投票でも競合しない。
 * @param {string} code
 * @param {string} entryId
 * @param {{ comment?: string }} [opts]
 * @returns {Promise<boolean>} 投票後に自分の票が入っているか
 */
export async function toggleWeakestVote(code, entryId, opts) {
  const user = requireUser();
  const { api } = fs();
  const ref = entryRef(code, entryId);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  if (!snap.exists()) throw new Error("このカードはすでに取り下げられています。");
  const data = /** @type {WeakestEntryDoc} */ (snap.data());
  const voted = !!(data.votes && data.votes[user.uid]);
  try {
    if (voted) {
      await api.updateDoc(ref, { ["votes." + user.uid]: api.deleteField() });
    } else {
      await api.updateDoc(ref, {
        ["votes." + user.uid]: {
          name: myName(user),
          photoURL: user.photoURL || null,
          comment: trimText(opts && opts.comment, WEAKEST_MAX_COMMENT_LEN),
          at: nowIso(),
        },
      });
    }
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
  await touchWeakestPresence(code);
  return !voted;
}

/**
 * 自分の票にコメント（理由）を付け直す。
 * @param {string} code
 * @param {string} entryId
 * @param {string} comment
 */
export async function setWeakestVoteComment(code, entryId, comment) {
  const user = requireUser();
  const { api } = fs();
  try {
    await api.updateDoc(entryRef(code, entryId), {
      ["votes." + user.uid + ".comment"]: trimText(comment, WEAKEST_MAX_COMMENT_LEN),
    });
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
}

/** 在席を知らせる。失敗しても致命ではないので投げない。 @param {string} code */
export async function touchWeakestPresence(code) {
  const u = getCurrentCloudUser();
  const x = getCloudFirestore();
  if (!u || !u.uid || !x) return;
  try {
    await x.api.updateDoc(roomRef(code), { ["members." + u.uid + ".lastSeenAt"]: nowIso() });
  } catch (err) {
    console.warn("[weakestRoom] presence update failed:", err);
  }
}

/** @param {string} code */
export async function leaveWeakestRoom(code) {
  const u = getCurrentCloudUser();
  const x = getCloudFirestore();
  if (!code || !u || !u.uid || !x) return;
  try {
    await x.api.updateDoc(roomRef(code), {
      ["members." + u.uid]: x.api.deleteField(),
      updatedAt: nowIso(),
    });
  } catch (err) {
    console.warn("[weakestRoom] leave failed:", err);
  }
}

/** ホストのみ。会議を終了してルームごと削除する。 @param {string} code */
export async function closeWeakestRoom(code) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const room = /** @type {WeakestRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("会議を終了できるのは作成者のみです。");
  try {
    const all = await api.getDocs(entriesCol(code));
    const jobs = [];
    all.forEach(function (d) {
      jobs.push(api.deleteDoc(entryRef(code, d.id)));
    });
    await Promise.all(jobs);
    await api.deleteDoc(ref);
  } catch (err) {
    throw new Error(formatWeakestFirestoreError(err));
  }
}
