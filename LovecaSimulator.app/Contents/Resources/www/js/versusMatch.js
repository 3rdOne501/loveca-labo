/**
 * オンライン対戦ルーム（Firestore）。総合ルール ver.1.06 の 2 人対戦向け。
 * Google ログイン（cloudAuth）必須。
 */
import { LIVE_WINS, MAIN_SIZE } from "./config.js";
import { getCloudFirestore, getCurrentCloudUser } from "./cloudAuth.js";
import { normalizeDeckMapCounts } from "./deckLibrary.js";

const COLLECTION = "versusMatches";
const RULES_VERSION = "1.06";
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** @typedef {'host'|'guest'} VersusRole */
/** @typedef {'waiting'|'lobby'|'playing'|'ended'} VersusMatchStatus */

/**
 * @typedef {Object} VersusMatchDoc
 * @property {number} v
 * @property {string} rulesVersion
 * @property {string} roomCode
 * @property {VersusMatchStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} hostUid
 * @property {string|null} hostName
 * @property {string|null} hostPhotoURL
 * @property {string|null} guestUid
 * @property {string|null} guestName
 * @property {string|null} guestPhotoURL
 * @property {boolean} hostDeckReady
 * @property {boolean} guestDeckReady
 * @property {Record<string, number>|null} hostDeckMap
 * @property {Record<string, number>|null} guestDeckMap
 * @property {VersusRole|null} firstPlayerRole
 * @property {VersusRole|null} activePlayerRole
 * @property {number} hostSuccessLiveCount
 * @property {number} guestSuccessLiveCount
 * @property {boolean} hostConceded
 * @property {boolean} guestConceded
 * @property {VersusRole|null} winnerRole
 * @property {string|null} endedReason
 */

export function isVersusMatchAvailable() {
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

function matchRef(roomCode) {
  const { db, api } = fs();
  return api.doc(db, COLLECTION, String(roomCode).toUpperCase());
}

function randomRoomCode() {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return s;
}

function userSummary(u) {
  return {
    uid: u.uid,
    displayName: u.displayName || null,
    photoURL: u.photoURL || null,
    email: u.email || null,
  };
}

function deckMapForVersus(deckMap) {
  const v = validateVersusMainDeck(deckMap);
  if (v.ok) return { map: v.map, warning: null };
  const map = normalizeDeckMapCounts(deckMap || {});
  let total = 0;
  Object.keys(map).forEach(function (k) {
    total += Math.max(0, Math.floor(Number(map[k]) || 0));
  });
  if (total <= 0) {
    return { map: null, warning: "メインデッキにカードを入れてください。" };
  }
  return {
    map: map,
    warning: v.message || "メインデッキは60枚推奨です（練習用としてルームを作成します）。",
  };
}

function formatVersusFirestoreError(err) {
  const code = err && err.code ? String(err.code) : "";
  if (code === "permission-denied") {
    return (
      "Firestore の書き込み権限がありません。Firebase コンソール → Firestore → ルール に " +
      "versusMatches のルールを追加してください（リポジトリの firestore.rules を参照）。"
    );
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return "Firestore に接続できません。ネットワークを確認して再試行してください。";
  }
  return err && err.message ? String(err.message) : String(err || "ルーム操作に失敗しました");
}

/** @param {Record<string, number>} deckMap */
export function validateVersusMainDeck(deckMap) {
  const map = normalizeDeckMapCounts(deckMap || {});
  let total = 0;
  Object.keys(map).forEach(function (k) {
    total += Math.max(0, Math.floor(Number(map[k]) || 0));
  });
  if (total !== MAIN_SIZE) {
    return {
      ok: false,
      message: "メインデッキは " + MAIN_SIZE + " 枚（メンバー48・ライブ12）である必要があります（現在 " + total + " 枚）。",
    };
  }
  return { ok: true, map: map };
}

/**
 * @param {Record<string, number>} deckMap
 * @returns {Promise<{ roomCode: string, match: VersusMatchDoc }>}
 */
export async function createVersusRoom(deckMap) {
  const user = requireUser();
  const prepared = deckMapForVersus(deckMap);
  if (!prepared.map) throw new Error(prepared.warning || "デッキが不正です。");
  const { api } = fs();
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 8; attempt++) {
    const roomCode = randomRoomCode();
    const ref = matchRef(roomCode);
    /** @type {VersusMatchDoc} */
    const doc = {
      v: 1,
      rulesVersion: RULES_VERSION,
      roomCode: roomCode,
      status: "waiting",
      createdAt: now,
      updatedAt: now,
      hostUid: user.uid,
      hostName: user.displayName,
      hostPhotoURL: user.photoURL,
      guestUid: null,
      guestName: null,
      guestPhotoURL: null,
      hostDeckReady: true,
      guestDeckReady: false,
      hostDeckMap: prepared.map,
      guestDeckMap: null,
      firstPlayerRole: null,
      activePlayerRole: null,
      hostSuccessLiveCount: 0,
      guestSuccessLiveCount: 0,
      hostConceded: false,
      guestConceded: false,
      winnerRole: null,
      endedReason: null,
    };
    try {
      await api.setDoc(ref, doc);
      return { roomCode: roomCode, match: doc, deckWarning: prepared.warning };
    } catch (err) {
      if (attempt >= 7) throw new Error(formatVersusFirestoreError(err));
    }
  }
  throw new Error("ルーム作成に失敗しました。もう一度お試しください。");
}

/**
 * @param {string} roomCode
 * @param {Record<string, number>} deckMap
 */
export async function joinVersusRoom(roomCode, deckMap) {
  const user = requireUser();
  const prepared = deckMapForVersus(deckMap);
  if (!prepared.map) throw new Error(prepared.warning || "デッキが不正です。");
  const code = String(roomCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("ルームコードは英数字6文字です。");
  const { api } = fs();
  const ref = matchRef(code);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
  if (!snap.exists()) throw new Error("ルームが見つかりません。コードの打ち間違い、または Firestore ルール未更新の可能性があります。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status === "ended") throw new Error("このルームは終了しています。");
  if (data.hostUid === user.uid) {
    throw new Error(
      "自分が作成したルームです。別の Google アカウント（シークレットウィンドウなど）で「コードで参加」してください。",
    );
  }
  if (data.guestUid && data.guestUid !== user.uid) {
    throw new Error("このルームには別のプレイヤーが参加済みです。");
  }
  const now = new Date().toISOString();
  try {
    await api.updateDoc(ref, {
      guestUid: user.uid,
      guestName: user.displayName,
      guestPhotoURL: user.photoURL,
      guestDeckReady: true,
      guestDeckMap: prepared.map,
      status: data.status === "playing" ? "playing" : "lobby",
      /* waiting → lobby（ゲスト参加済み） */
      updatedAt: now,
    });
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
  const snap2 = await api.getDoc(ref);
  return {
    roomCode: code,
    match: /** @type {VersusMatchDoc} */ (snap2.data()),
    deckWarning: prepared.warning,
  };
}

/**
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {Record<string, number>} deckMap
 */
export async function setVersusDeckReady(roomCode, role, deckMap) {
  requireUser();
  const prepared = deckMapForVersus(deckMap);
  if (!prepared.map) throw new Error(prepared.warning || "デッキが不正です。");
  const { api } = fs();
  const ref = matchRef(roomCode);
  const patch =
    role === "host"
      ? { hostDeckReady: true, hostDeckMap: prepared.map, updatedAt: new Date().toISOString() }
      : { guestDeckReady: true, guestDeckMap: prepared.map, updatedAt: new Date().toISOString() };
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/** ホストのみ: 先攻を無作為に決めて対戦開始（総合ルール 6.2.1.4） */
export async function startVersusMatch(roomCode) {
  const user = requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.hostUid !== user.uid) throw new Error("ルーム作成者のみが対戦を開始できます。");
  if (!data.guestUid) throw new Error("相手の参加を待っています。");
  if (!data.hostDeckReady || !data.guestDeckReady) {
    throw new Error("両プレイヤーのデッキ準備が完了するまで開始できません。");
  }
  const firstPlayerRole = Math.random() < 0.5 ? "host" : "guest";
  const now = new Date().toISOString();
  await api.updateDoc(ref, {
    status: "playing",
    firstPlayerRole: firstPlayerRole,
    activePlayerRole: firstPlayerRole,
    updatedAt: now,
    hostSuccessLiveCount: 0,
    guestSuccessLiveCount: 0,
    hostConceded: false,
    guestConceded: false,
    winnerRole: null,
    endedReason: null,
  });
}

/**
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {{ successLiveCount?: number }} patch
 */
export async function pushVersusPublicState(roomCode, role, patch) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const p = { updatedAt: new Date().toISOString() };
  if (patch && typeof patch.successLiveCount === "number") {
    const n = Math.max(0, Math.floor(patch.successLiveCount));
    if (role === "host") p.hostSuccessLiveCount = n;
    else p.guestSuccessLiveCount = n;
  }
  await api.updateDoc(ref, p);
}

/** @param {string} roomCode @param {VersusRole} role */
export async function concedeVersusMatch(roomCode, role) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status === "ended") return;
  const winnerRole = role === "host" ? "guest" : "host";
  const patch = {
    status: "ended",
    winnerRole: winnerRole,
    endedReason: "concede",
    updatedAt: new Date().toISOString(),
  };
  if (role === "host") patch.hostConceded = true;
  else patch.guestConceded = true;
  await api.updateDoc(ref, patch);
}

/**
 * 総合ルール 1.2.1.1 に基づく勝敗判定（成功ライブ 3 枚以上 vs 相手 2 枚以下）
 * @param {VersusMatchDoc} match
 * @returns {{ winnerRole: VersusRole|null, draw: boolean, reason: string|null }}
 */
export function evaluateVersusWinFromCounts(match) {
  if (!match) return { winnerRole: null, draw: false, reason: null };
  const h = Math.max(0, Math.floor(Number(match.hostSuccessLiveCount) || 0));
  const g = Math.max(0, Math.floor(Number(match.guestSuccessLiveCount) || 0));
  const hostWins = h >= LIVE_WINS && g < LIVE_WINS - 1;
  const guestWins = g >= LIVE_WINS && h < LIVE_WINS - 1;
  if (hostWins && guestWins) return { winnerRole: null, draw: true, reason: "simultaneous" };
  if (hostWins) return { winnerRole: "host", draw: false, reason: "success_live" };
  if (guestWins) return { winnerRole: "guest", draw: false, reason: "success_live" };
  if (h >= LIVE_WINS && g >= LIVE_WINS) return { winnerRole: null, draw: true, reason: "success_live_tie" };
  return { winnerRole: null, draw: false, reason: null };
}

/**
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function reportVersusWinIfEligible(roomCode, role) {
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status === "ended") return;
  const ev = evaluateVersusWinFromCounts(data);
  if (!ev.winnerRole && !ev.draw) return;
  await api.updateDoc(ref, {
    status: "ended",
    winnerRole: ev.draw ? null : ev.winnerRole,
    endedReason: ev.reason,
    updatedAt: new Date().toISOString(),
  });
}

/** @param {string} roomCode @param {string} uid */
export async function leaveVersusRoom(roomCode, uid) {
  if (!roomCode || !uid) return;
  const x = getCloudFirestore();
  if (!x) return;
  const { api } = x;
  const ref = matchRef(roomCode);
  try {
    const snap = await api.getDoc(ref);
    if (!snap.exists()) return;
    const data = /** @type {VersusMatchDoc} */ (snap.data());
    if (data.status === "playing") {
      const winnerRole = data.hostUid === uid ? "guest" : "host";
      await api.updateDoc(ref, {
        status: "ended",
        winnerRole: winnerRole,
        endedReason: "disconnect",
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    if (data.hostUid === uid) {
      await api.deleteDoc(ref);
    } else if (data.guestUid === uid) {
      await api.updateDoc(ref, {
        guestUid: null,
        guestName: null,
        guestPhotoURL: null,
        guestDeckReady: false,
        guestDeckMap: null,
        status: "waiting",
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("[versusMatch] leave failed:", err);
  }
}

/**
 * @param {string} roomCode
 * @param {(match: VersusMatchDoc|null) => void} onChange
 * @returns {() => void}
 */
export function subscribeVersusMatch(roomCode, onChange) {
  const x = getCloudFirestore();
  if (!x) {
    onChange(null);
    return function () {};
  }
  const { db, api } = x;
  const ref = api.doc(db, COLLECTION, String(roomCode).toUpperCase());
  return api.onSnapshot(
    ref,
    function (snap) {
      onChange(snap.exists() ? /** @type {VersusMatchDoc} */ (snap.data()) : null);
    },
    function (err) {
      console.warn("[versusMatch] snapshot error:", err);
      onChange(null);
    },
  );
}

/** @param {VersusMatchDoc} match @param {string} uid */
export function versusRoleForUid(match, uid) {
  if (!match || !uid) return null;
  if (match.hostUid === uid) return "host";
  if (match.guestUid === uid) return "guest";
  return null;
}

/** @param {VersusMatchDoc} match @param {VersusRole} myRole */
export function versusOpponentLabel(match, myRole) {
  if (!match || !myRole) return "相手";
  if (myRole === "host") return match.guestName || "ゲスト";
  return match.hostName || "ホスト";
}
