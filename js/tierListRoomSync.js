/**
 * ラブカ ティアリストメーカーのルーム同期（Firestore）。
 * Google ログイン（cloudAuth）必須。参加者全員がカードの配置・移動できる。
 */
import { getCloudFirestore, getCurrentCloudUser } from "./cloudAuth.js";
import { getPlayerDisplayName } from "./playerProfile.js";

const COLLECTION = "tierListRooms";
const ENTRIES = "entries";
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LEN = 5;
const ROOM_TTL_DAYS = 7;

export const TIERLIST_MAX_TITLE_LEN = 40;
export const TIERLIST_MAX_TIER_LABEL_LEN = 16;
export const TIERLIST_MAX_TIERS = 10;
/** 未配置プール。tiers マップには入れず、クライアントと entries.tierId だけで扱う */
export const TIERLIST_POOL_ID = "pool";
/** ルーム種別: カード表 / キャラ表（ドンジャラと同じメンバーアイコン） */
export const TIERLIST_KIND_CARD = "card";
export const TIERLIST_KIND_CHARACTER = "character";

export const TIERLIST_DEFAULT_TIERS = [
  { id: "S", label: "S", order: 0, color: "#ff7f7f" },
  { id: "A", label: "A", order: 1, color: "#ffbf7f" },
  { id: "B", label: "B", order: 2, color: "#ffdf7f" },
  { id: "C", label: "C", order: 3, color: "#ffff7f" },
  { id: "D", label: "D", order: 4, color: "#bfff7f" },
];

/**
 * @typedef {Object} TierListTier
 * @property {string} id
 * @property {string} label
 * @property {number} order
 * @property {string} color
 */

/**
 * @typedef {Object} TierListMember
 * @property {string} name
 * @property {string|null} photoURL
 * @property {string} joinedAt
 * @property {string} lastSeenAt
 */

/**
 * @typedef {Object} TierListRoomDoc
 * @property {number} v
 * @property {string} code
 * @property {string} title
 * @property {'card'|'character'} [kind]
 * @property {'open'|'closed'} status
 * @property {string} hostUid
 * @property {string|null} hostName
 * @property {string|null} hostPhotoURL
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} expiresAt
 * @property {Record<string, TierListMember>} members
 * @property {Record<string, TierListTier>} tiers
 */

/**
 * @typedef {Object} TierListEntryDoc
 * @property {string} id
 * @property {number} v
 * @property {'card'|'character'} [kind]
 * @property {string} [cardNo]
 * @property {string} [charId]
 * @property {string} tierId
 * @property {number} orderInTier
 * @property {string} byUid
 * @property {string} byName
 * @property {string|null} byPhotoURL
 * @property {string} placedAt
 * @property {string} movedAt
 * @property {string} movedByUid
 * @property {string} movedByName
 */

export function isTierListRoomAvailable() {
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

export function getTierListMyUid() {
  const u = getCurrentCloudUser();
  return u && u.uid ? String(u.uid) : "";
}

function myName(user) {
  return getPlayerDisplayName() || user.displayName || (user.email ? String(user.email).split("@")[0] : "") || "ゲスト";
}

/** @param {string} code */
export function normalizeTierListRoomCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function roomRef(code) {
  const { db, api } = fs();
  return api.doc(db, COLLECTION, normalizeTierListRoomCode(code));
}

function entriesCol(code) {
  const { db, api } = fs();
  return api.collection(db, COLLECTION, normalizeTierListRoomCode(code), ENTRIES);
}

function entryRef(code, cardNo) {
  const { db, api } = fs();
  return api.doc(db, COLLECTION, normalizeTierListRoomCode(code), ENTRIES, sanitizeCardNo(cardNo));
}

/** @param {string} cardNo */
export function sanitizeCardNo(cardNo) {
  return String(cardNo || "")
    .trim()
    .replace(/\//g, "_");
}

/** @param {string} charId */
export function sanitizeCharId(charId) {
  return String(charId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

/** @param {TierListRoomDoc|null|undefined} room */
export function tierListRoomKind(room) {
  return room && room.kind === TIERLIST_KIND_CHARACTER ? TIERLIST_KIND_CHARACTER : TIERLIST_KIND_CARD;
}

/** @param {TierListEntryDoc|null|undefined} entry */
export function tierListEntryItemId(entry) {
  if (!entry) return "";
  if (entry.charId) return String(entry.charId);
  if (entry.cardNo) return String(entry.cardNo);
  return String(entry.id || "");
}

function randomRoomCode() {
  let s = "";
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return s;
}

function formatTierListFirestoreError(err) {
  const code = err && err.code ? String(err.code) : "";
  if (code === "permission-denied") {
    return (
      "Firestore の権限がありません。Firebase コンソール → Firestore → ルール に " +
      "tierListRooms のルールを追加してください（リポジトリの firestore.rules を参照）。"
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

/** @param {TierListRoomDoc|null} room */
export function tierListSortedTiers(room) {
  const map = (room && room.tiers) || {};
  return Object.keys(map)
    .map(function (id) {
      return map[id];
    })
    .filter(Boolean)
    .sort(function (a, b) {
      const oa = Number(a.order) || 0;
      const ob = Number(b.order) || 0;
      if (oa !== ob) return oa - ob;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
}

/** @param {TierListRoomDoc|null} room @param {string} uid */
export function isTierListHost(room, uid) {
  return !!(room && uid && room.hostUid === uid);
}

/** @param {TierListRoomDoc|null} room @param {string} tierId */
export function isValidTierListTierId(room, tierId) {
  if (!tierId) return false;
  if (tierId === TIERLIST_POOL_ID) return true;
  return !!(room && room.tiers && room.tiers[tierId]);
}

/**
 * @param {string} title
 * @param {{ kind?: 'card'|'character' }} [opts]
 * @returns {Promise<{ code: string, room: TierListRoomDoc }>}
 */
export async function createTierListRoom(title, opts) {
  const user = requireUser();
  const { api } = fs();
  const name = myName(user);
  const now = nowIso();
  const kind =
    opts && opts.kind === TIERLIST_KIND_CHARACTER ? TIERLIST_KIND_CHARACTER : TIERLIST_KIND_CARD;
  /** @type {Record<string, TierListTier>} */
  const tiers = {};
  TIERLIST_DEFAULT_TIERS.forEach(function (t) {
    tiers[t.id] = Object.assign({}, t);
  });
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomRoomCode();
    const ref = roomRef(code);
    try {
      const existing = await api.getDoc(ref);
      if (existing.exists()) continue;
    } catch (err) {
      throw new Error(formatTierListFirestoreError(err));
    }
    const defaultTitle = kind === TIERLIST_KIND_CHARACTER ? "ラブカ キャラティアリスト" : "ラブカ ティアリスト";
    /** @type {TierListRoomDoc} */
    const doc = {
      v: 1,
      code: code,
      title: trimText(title, TIERLIST_MAX_TITLE_LEN) || defaultTitle,
      kind: kind,
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
      tiers: tiers,
    };
    try {
      await api.setDoc(ref, doc);
      return { code: code, room: doc };
    } catch (err) {
      if (attempt >= 7) throw new Error(formatTierListFirestoreError(err));
    }
  }
  throw new Error("ルーム作成に失敗しました。もう一度お試しください。");
}

/**
 * @param {string} rawCode
 * @returns {Promise<{ code: string, room: TierListRoomDoc }>}
 */
export async function joinTierListRoom(rawCode) {
  const user = requireUser();
  const code = normalizeTierListRoomCode(rawCode);
  if (code.length !== ROOM_CODE_LEN) {
    throw new Error("ルームコードは英数字" + ROOM_CODE_LEN + "文字です。");
  }
  const { api } = fs();
  const ref = roomRef(code);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
  if (!snap.exists()) {
    throw new Error("ルームが見つかりません。コードの打ち間違い、または Firestore ルール未更新の可能性があります。");
  }
  const data = /** @type {TierListRoomDoc} */ (snap.data());
  if (data.status === "closed") throw new Error("このティアリストは終了しています。");
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
    throw new Error(formatTierListFirestoreError(err));
  }
  return { code: code, room: data };
}

/**
 * @param {string} code
 * @param {(room: TierListRoomDoc|null) => void} onChange
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function watchTierListRoom(code, onChange, onError) {
  const { api } = fs();
  return api.onSnapshot(
    roomRef(code),
    function (snap) {
      onChange(snap.exists() ? /** @type {TierListRoomDoc} */ (snap.data()) : null);
    },
    function (err) {
      console.warn("[tierListRoom] room snapshot error:", err);
      if (typeof onError === "function") onError(err);
      else onChange(null);
    },
  );
}

/**
 * @param {string} code
 * @param {(entries: TierListEntryDoc[]) => void} onChange
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function watchTierListEntries(code, onChange, onError) {
  const { api } = fs();
  return api.onSnapshot(
    entriesCol(code),
    function (snap) {
      /** @type {TierListEntryDoc[]} */
      const list = [];
      snap.forEach(function (d) {
        const data = d.data();
        if (data) list.push(Object.assign({ id: d.id }, data));
      });
      onChange(list);
    },
    function (err) {
      console.warn("[tierListRoom] entries snapshot error:", err);
      if (typeof onError === "function") onError(err);
      else onChange([]);
    },
  );
}

/**
 * @param {string} code
 * @param {string} title
 */
export async function setTierListTitle(code, title) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {TierListRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("タイトル変更は作成者のみできます。");
  const next = trimText(title, TIERLIST_MAX_TITLE_LEN);
  if (!next) throw new Error("タイトルを入力してください。");
  try {
    await api.updateDoc(ref, { title: next, updatedAt: nowIso() });
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
}

/**
 * @param {string} code
 * @param {{ label: string, color?: string }} input
 * @returns {Promise<TierListTier>}
 */
export async function addTierListTier(code, input) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {TierListRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("ティアの追加は作成者のみできます。");
  const current = tierListSortedTiers(room);
  if (current.length >= TIERLIST_MAX_TIERS) {
    throw new Error("ティアは最大 " + TIERLIST_MAX_TIERS + " 個までです。");
  }
  const label = trimText(input && input.label, TIERLIST_MAX_TIER_LABEL_LEN);
  if (!label) throw new Error("ティア名を入力してください。");
  const id = "T_" + Math.random().toString(36).slice(2, 10);
  const color = String((input && input.color) || "#9fd3ff").trim() || "#9fd3ff";
  /** @type {TierListTier} */
  const tier = {
    id: id,
    label: label,
    order: current.length ? Number(current[current.length - 1].order || 0) + 1 : 0,
    color: color.slice(0, 24),
  };
  try {
    await api.updateDoc(ref, {
      ["tiers." + id]: tier,
      updatedAt: nowIso(),
    });
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
  return tier;
}

/**
 * @param {string} code
 * @param {string} tierId
 * @param {{ label?: string, color?: string }} patch
 */
export async function updateTierListTier(code, tierId, patch) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {TierListRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("ティアの編集は作成者のみできます。");
  if (!room.tiers || !room.tiers[tierId]) throw new Error("そのティアはありません。");
  /** @type {Record<string, unknown>} */
  const updates = { updatedAt: nowIso() };
  if (patch && patch.label != null) {
    const label = trimText(patch.label, TIERLIST_MAX_TIER_LABEL_LEN);
    if (!label) throw new Error("ティア名を入力してください。");
    updates["tiers." + tierId + ".label"] = label;
  }
  if (patch && patch.color != null) {
    const color = String(patch.color).trim().slice(0, 24);
    if (color) updates["tiers." + tierId + ".color"] = color;
  }
  try {
    await api.updateDoc(ref, updates);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
}

/**
 * ホストのみ。ティア削除時、そのティアのカードは未配置へ移す。
 * @param {string} code
 * @param {string} tierId
 */
export async function removeTierListTier(code, tierId) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {TierListRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("ティアの削除は作成者のみできます。");
  if (!room.tiers || !room.tiers[tierId]) throw new Error("そのティアはありません。");
  if (tierListSortedTiers(room).length <= 1) throw new Error("最後の 1 ティアは削除できません。");
  const now = nowIso();
  const name = myName(user);
  try {
    const all = await api.getDocs(entriesCol(code));
    const jobs = [];
    all.forEach(function (d) {
      const data = d.data();
      if (data && data.tierId === tierId) {
        jobs.push(
          api.updateDoc(entryRef(code, d.id), {
            tierId: TIERLIST_POOL_ID,
            orderInTier: Date.now(),
            movedAt: now,
            movedByUid: user.uid,
            movedByName: name,
          }),
        );
      }
    });
    await Promise.all(jobs);
    await api.updateDoc(ref, {
      ["tiers." + tierId]: api.deleteField(),
      updatedAt: now,
    });
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
}

/**
 * カードまたはキャラを配置・移動する。全員可。
 * @param {string} code
 * @param {{ cardNo?: string, charId?: string, tierId: string, orderInTier?: number }} input
 * @returns {Promise<TierListEntryDoc>}
 */
export async function placeTierListCard(code, input) {
  const user = requireUser();
  const { api } = fs();
  const tierId = String((input && input.tierId) || "").trim();
  const roomSnap = await api.getDoc(roomRef(code));
  if (!roomSnap.exists()) throw new Error("ルームが見つかりません。");
  const room = /** @type {TierListRoomDoc} */ (roomSnap.data());
  if (!isValidTierListTierId(room, tierId)) throw new Error("行き先のティアが不正です。");
  const kind = tierListRoomKind(room);
  const cardNo = String((input && input.cardNo) || "").trim();
  const charId = sanitizeCharId((input && input.charId) || "");
  if (kind === TIERLIST_KIND_CHARACTER) {
    if (!charId) throw new Error("キャラを指定してください。");
  } else if (!cardNo) {
    throw new Error("カードを指定してください。");
  }
  const id = kind === TIERLIST_KIND_CHARACTER ? charId : sanitizeCardNo(cardNo);
  const ref = entryRef(code, id);
  const now = nowIso();
  const name = myName(user);
  const orderInTier =
    input && Number.isFinite(Number(input.orderInTier)) ? Number(input.orderInTier) : Date.now();
  let existing;
  try {
    existing = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
  if (existing.exists()) {
    try {
      await api.updateDoc(ref, {
        tierId: tierId,
        orderInTier: orderInTier,
        movedAt: now,
        movedByUid: user.uid,
        movedByName: name,
      });
    } catch (err) {
      throw new Error(formatTierListFirestoreError(err));
    }
    await touchTierListPresence(code);
    const data = /** @type {TierListEntryDoc} */ (existing.data());
    return Object.assign({}, data, {
      id: id,
      tierId: tierId,
      orderInTier: orderInTier,
      movedAt: now,
      movedByUid: user.uid,
      movedByName: name,
    });
  }
  /** @type {TierListEntryDoc} */
  const doc =
    kind === TIERLIST_KIND_CHARACTER
      ? {
          id: id,
          v: 1,
          kind: TIERLIST_KIND_CHARACTER,
          charId: charId,
          tierId: tierId,
          orderInTier: orderInTier,
          byUid: user.uid,
          byName: name,
          byPhotoURL: user.photoURL || null,
          placedAt: now,
          movedAt: now,
          movedByUid: user.uid,
          movedByName: name,
        }
      : {
          id: id,
          v: 1,
          kind: TIERLIST_KIND_CARD,
          cardNo: cardNo,
          tierId: tierId,
          orderInTier: orderInTier,
          byUid: user.uid,
          byName: name,
          byPhotoURL: user.photoURL || null,
          placedAt: now,
          movedAt: now,
          movedByUid: user.uid,
          movedByName: name,
        };
  try {
    await api.setDoc(ref, doc);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
  await touchTierListPresence(code);
  return doc;
}

/**
 * @param {string} code
 * @param {{ cardNo: string, tierId: string, orderInTier: number }} input
 */
export async function reorderTierListCard(code, input) {
  return placeTierListCard(code, input);
}

/**
 * 追加者またはホストのみ削除可。
 * @param {string} code
 * @param {string} itemId cardNo または charId
 */
export async function removeTierListCard(code, itemId) {
  const user = requireUser();
  const { api } = fs();
  const roomSnap = await api.getDoc(roomRef(code));
  const room = roomSnap.exists() ? /** @type {TierListRoomDoc} */ (roomSnap.data()) : null;
  const kind = tierListRoomKind(room);
  const id =
    kind === TIERLIST_KIND_CHARACTER ? sanitizeCharId(itemId) : sanitizeCardNo(itemId);
  if (!id) throw new Error(kind === TIERLIST_KIND_CHARACTER ? "キャラを指定してください。" : "カードを指定してください。");
  const ref = entryRef(code, id);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
  if (!snap.exists()) return;
  const data = /** @type {TierListEntryDoc} */ (snap.data());
  if (data.byUid !== user.uid && !(room && room.hostUid === user.uid)) {
    throw new Error(
      kind === TIERLIST_KIND_CHARACTER
        ? "キャラの削除は追加者または作成者のみできます。"
        : "カードの削除は追加者または作成者のみできます。",
    );
  }
  try {
    await api.deleteDoc(ref);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
  await touchTierListPresence(code);
}

/** @param {string} code */
export async function touchTierListPresence(code) {
  const u = getCurrentCloudUser();
  const x = getCloudFirestore();
  if (!u || !u.uid || !x) return;
  try {
    await x.api.updateDoc(roomRef(code), { ["members." + u.uid + ".lastSeenAt"]: nowIso() });
  } catch (err) {
    console.warn("[tierListRoom] presence update failed:", err);
  }
}

/** @param {string} code */
export async function leaveTierListRoom(code) {
  const u = getCurrentCloudUser();
  const x = getCloudFirestore();
  if (!code || !u || !u.uid || !x) return;
  try {
    await x.api.updateDoc(roomRef(code), {
      ["members." + u.uid]: x.api.deleteField(),
      updatedAt: nowIso(),
    });
  } catch (err) {
    console.warn("[tierListRoom] leave failed:", err);
  }
}

/** @param {string} code */
export async function closeTierListRoom(code) {
  const user = requireUser();
  const { api } = fs();
  const ref = roomRef(code);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const room = /** @type {TierListRoomDoc} */ (snap.data());
  if (room.hostUid !== user.uid) throw new Error("終了できるのは作成者のみです。");
  try {
    const all = await api.getDocs(entriesCol(code));
    const jobs = [];
    all.forEach(function (d) {
      jobs.push(api.deleteDoc(entryRef(code, d.id)));
    });
    await Promise.all(jobs);
    await api.deleteDoc(ref);
  } catch (err) {
    throw new Error(formatTierListFirestoreError(err));
  }
}
