/**
 * オンライン対戦ルーム（Firestore）。総合ルール ver.1.06 の 2 人対戦向け。
 * Google ログイン（cloudAuth）必須。
 */
import { LIVE_WINS, MAIN_SIZE } from "./config.js";
import { getCloudFirestore, getCurrentCloudUser } from "./cloudAuth.js";
import { getPlayerDisplayName } from "./playerProfile.js";
import { normalizeDeckMapCounts } from "./deckLibrary.js";
import { buildVersusBoardFirestorePatch } from "./versusBoardSync.js";

const COLLECTION = "versusMatches";
const RULES_VERSION = "1.06";
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** @typedef {'host'|'guest'} VersusRole */
/** @typedef {'waiting'|'lobby'|'playing'|'ended'} VersusMatchStatus */
/** @typedef {'firstMulligan'|'secondMulligan'|'firstNormal'|'secondNormal'|'live'} VersusPhase */
/** @typedef {'opening'|'main'} VersusPhaseLegacy */
/** @typedef {'set'|'perf'|'judgment'|'successFx'} VersusLiveStep */

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
 * @property {number} [turnNumber]
 * @property {string|null} [hostLastAction]
 * @property {string|null} [guestLastAction]
 * @property {import('./versusBoardSync.js').VersusPublicBoard|null} [hostBoardPublic]
 * @property {import('./versusBoardSync.js').VersusPublicBoard|null} [guestBoardPublic]
 * @property {string|null} [hostBoardAt]
 * @property {string|null} [guestBoardAt]
 * @property {VersusPhase|VersusPhaseLegacy} [versusPhase]
 * @property {VersusLiveStep|null} [liveStep]
 * @property {boolean} [hostLiveSetDone]
 * @property {boolean} [guestLiveSetDone]
 * @property {boolean} [hostPerfDone]
 * @property {boolean} [guestPerfDone]
 * @property {boolean} [hostLiveComplete]
 * @property {boolean} [guestLiveComplete]
 * @property {number|null} [hostLivePerfScore]
 * @property {number|null} [guestLivePerfScore]
 * @property {'none'|'success'|'fail'} [hostLiveVerdict]
 * @property {'none'|'success'|'fail'} [guestLiveVerdict]
 * @property {boolean} [hostLiveHadCards]
 * @property {boolean} [guestLiveHadCards]
 * @property {boolean} [hostSuccessFxDone]
 * @property {boolean} [guestSuccessFxDone]
 * @property {'hostWin'|'guestWin'|'draw'|null} [liveJudgmentOutcome]
 * @property {number} [liveJudgmentSeq]
 * @property {boolean} [successLiveFirstLocked]
 * @property {string|null} [hostEffectCardNo]
 * @property {string|null} [guestEffectCardNo]
 * @property {VersusEffectUi|null} [hostEffectUi]
 * @property {VersusEffectUi|null} [guestEffectUi]
 * @property {VersusBoardActionRequest|null} [boardActionRequest]
 * @property {boolean} [hostOpeningMulliganDone]
 * @property {boolean} [guestOpeningMulliganDone]
 * @property {number} [rematchSeq]
 */

/**
 * @typedef {Object} VersusEffectUi
 * @property {string} cardNo
 * @property {string|null} [instId]
 * @property {'toujyou'|'kidou'|'live_start'|'live_success'} kind
 * @property {string} title
 * @property {string} bodyPlain
 */

/**
 * @typedef {Object} VersusBoardActionRequest
 * @property {string} id
 * @property {VersusRole} fromRole
 * @property {'undo'|'redo'|'deck_face_up'|'res_deck_top'|'res_deck_shuffle'} action
 * @property {'pending'|'approved'|'denied'} status
 * @property {string} requestedAt
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
  for (let i = 0; i < 4; i++) {
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
      hostName: getPlayerDisplayName() || user.displayName || null,
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
      turnNumber: 0,
      hostLastAction: null,
      guestLastAction: null,
      hostBoardPublic: null,
      guestBoardPublic: null,
      hostBoardAt: null,
      guestBoardAt: null,
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
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error("ルームコードは英数字4文字です。");
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
    throw new Error("このルームは満員です。別のルームを作成するか、参加者の退出をお待ちください。");
  }
  const now = new Date().toISOString();
  try {
    await api.updateDoc(ref, {
      guestUid: user.uid,
      guestName: getPlayerDisplayName() || user.displayName || null,
      guestPhotoURL: user.photoURL,
      guestDeckReady: true,
      guestDeckMap: prepared.map,
      status: data.status === "playing" ? "playing" : "lobby",
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
    joinedAs: "guest",
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
    turnNumber: 1,
    hostLastAction: null,
    guestLastAction: null,
    versusPhase: "firstMulligan",
    hostOpeningMulliganDone: false,
    guestOpeningMulliganDone: false,
    rematchSeq: 0,
    liveStep: null,
    hostLiveSetDone: false,
    guestLiveSetDone: false,
    hostPerfDone: false,
    guestPerfDone: false,
    hostLiveComplete: false,
    guestLiveComplete: false,
    hostLivePerfScore: null,
    guestLivePerfScore: null,
    hostLiveVerdict: "none",
    guestLiveVerdict: "none",
    hostLiveHadCards: false,
    guestLiveHadCards: false,
    hostSuccessFxDone: false,
    guestSuccessFxDone: false,
    liveJudgmentOutcome: null,
    liveJudgmentSeq: 0,
    successLiveFirstLocked: false,
    hostEffectCardNo: null,
    guestEffectCardNo: null,
    hostEffectUi: null,
    guestEffectUi: null,
    boardActionRequest: null,
  });
}

/** @param {VersusMatchDoc|null|undefined} match */
export function versusSecondPlayerRole(match) {
  if (!match || !match.firstPlayerRole) return null;
  return match.firstPlayerRole === "host" ? "guest" : "host";
}

/**
 * 旧フィールドを含め正規化（7.1.2 先攻通常→後攻通常→ライブ）
 * @param {VersusMatchDoc|null|undefined} match
 * @returns {VersusPhase}
 */
/** @param {VersusMatchDoc|null|undefined} match @param {VersusRole|null} role */
export function hasVersusRoleCompletedOpeningMulligan(match, role) {
  if (!match || !role) return false;
  return role === "host" ? match.hostOpeningMulliganDone === true : match.guestOpeningMulliganDone === true;
}

/**
 * 開幕マリガン未完了なら first/secondMulligan へ（6.2.1.6）
 * @param {VersusMatchDoc|null|undefined} match
 * @returns {VersusPhase}
 */
export function normalizeVersusPhase(match) {
  if (!match) return "firstNormal";
  const p = match.versusPhase;
  if (
    p === "firstMulligan" ||
    p === "secondMulligan" ||
    p === "firstNormal" ||
    p === "secondNormal" ||
    p === "live"
  ) {
    if (match.turnNumber === 1 && p !== "live") {
      const fp = match.firstPlayerRole;
      const second = versusSecondPlayerRole(match);
      if (fp && second) {
        const firstDone = hasVersusRoleCompletedOpeningMulligan(match, fp);
        const secondDone = hasVersusRoleCompletedOpeningMulligan(match, second);
        if (!firstDone) return "firstMulligan";
        if (!secondDone) return "secondMulligan";
        if (p === "firstMulligan" || p === "secondMulligan") return "firstNormal";
      }
    }
    return p;
  }
  const fp = match.firstPlayerRole;
  const ap = match.activePlayerRole;
  if (p === "opening") {
    if (ap && fp && ap !== fp) return "secondMulligan";
    return "firstMulligan";
  }
  if (p === "main") {
    if (ap && fp && ap === fp) return "firstNormal";
    return "secondNormal";
  }
  return "firstNormal";
}

/** @param {VersusMatchDoc|null|undefined} match @returns {VersusLiveStep|null} */
export function getVersusLiveStep(match) {
  if (!match || normalizeVersusPhase(match) !== "live") return null;
  const s = match.liveStep;
  if (s === "set" || s === "perf" || s === "judgment" || s === "successFx") return s;
  return "set";
}

/** @param {VersusMatchDoc|null|undefined} match */
export function isVersusLivePhase(match) {
  return !!(match && match.status === "playing" && normalizeVersusPhase(match) === "live");
}

/** @param {VersusMatchDoc|null|undefined} match @param {VersusRole|null} role */
export function isVersusFirstPlayer(match, role) {
  return !!(match && role && match.firstPlayerRole === role);
}

/**
 * UI 用フェーズ説明
 * @param {VersusMatchDoc|null|undefined} match
 * @param {VersusRole|null} myRole
 */
export function describeVersusFlowForRole(match, myRole) {
  if (!match || !myRole) return "";
  const phase = normalizeVersusPhase(match);
  const fp = match.firstPlayerRole;
  const second = versusSecondPlayerRole(match);
  const mineFirst = myRole === fp;
  const active = match.activePlayerRole;
  const mineActive = active === myRole;

  if (phase === "firstMulligan") {
    if (mineActive && mineFirst) return "開幕マリガン（先攻・あなた）";
    if (!mineActive && mineFirst) return "開幕マリガン（先攻・相手）";
    if (mineActive && !mineFirst) return "開幕マリガン（先攻側・あなた）";
    return "開幕マリガン（先攻・相手）";
  }
  if (phase === "secondMulligan") {
    if (mineActive && !mineFirst) return "開幕マリガン（後攻・あなた）";
    if (!mineActive && !mineFirst) return "開幕マリガン（後攻・相手）";
    if (mineActive && mineFirst) return "開幕マリガン（後攻側・あなた）";
    return "開幕マリガン（後攻・相手）";
  }
  if (phase === "firstNormal") {
    if (mineActive && mineFirst) return "先攻通常フェイズ（あなたの手番）";
    if (mineActive && !mineFirst) return "先攻通常フェイズ（あなたの手番・先攻側）";
    if (!mineActive && mineFirst) return "先攻通常フェイズ（相手の手番）";
    return "先攻通常フェイズ（相手の手番）";
  }
  if (phase === "secondNormal") {
    if (mineActive && !mineFirst) return "後攻通常フェイズ（あなたの手番）";
    if (mineActive && mineFirst) return "後攻通常フェイズ（あなたの手番・後攻側）";
    if (!mineActive && !mineFirst) return "後攻通常フェイズ（相手の手番）";
    return "後攻通常フェイズ（相手の手番）";
  }
  const step = getVersusLiveStep(match);
  if (step === "set") {
    if (mineActive && mineFirst) return "ライブカードセット（先攻・あなた）";
    if (mineActive && !mineFirst) return "ライブカードセット（後攻・あなた）";
    if (!mineActive && mineFirst) return "ライブカードセット（先攻・相手）";
    return "ライブカードセット（後攻・相手）";
  }
  if (step === "perf") {
    if (mineActive && mineFirst) return "先攻パフォーマンス（あなた）";
    if (mineActive && !mineFirst) return "後攻パフォーマンス（あなた）";
    if (!mineActive && mineFirst) return "先攻パフォーマンス（相手）";
    return "後攻パフォーマンス（相手）";
  }
  if (step === "judgment") return "ライブ勝敗判定フェイズ";
  if (step === "successFx") {
    if (mineActive && mineFirst) return "ライブ成功時効果（先攻から）";
    if (mineActive && !mineFirst) return "ライブ成功時効果（後攻・あなた）";
    if (!mineActive && mineFirst) return "ライブ成功時効果（先攻・相手）";
    return "ライブ成功時効果（後攻・相手）";
  }
  void second;
  return "ライブフェイズ";
}

/** @param {VersusMatchDoc|null|undefined} match @param {VersusRole|null} role */
export function canRoleActInVersus(match, role) {
  if (!match || match.status !== "playing" || !role) return false;
  const phase = normalizeVersusPhase(match);
  if (phase !== "live") {
    return match.activePlayerRole === role;
  }
  const step = getVersusLiveStep(match);
  if (step === "judgment") return false;
  return match.activePlayerRole === role;
}

/** @param {VersusMatchDoc|null|undefined} match @param {VersusRole|null} role */
export function isVersusTurnForRole(match, role) {
  return canRoleActInVersus(match, role);
}

/** @param {VersusMatchDoc|null|undefined} match */
export function versusBothLiveSetDone(match) {
  if (!match) return false;
  return match.hostLiveSetDone === true && match.guestLiveSetDone === true;
}

/** @param {VersusMatchDoc|null|undefined} match */
export function versusBothSuccessFxDone(match) {
  if (!match) return false;
  return match.hostSuccessFxDone === true && match.guestSuccessFxDone === true;
}

/** @param {VersusMatchDoc|null|undefined} match */
export function versusBothLivePerfScoresReady(match) {
  if (!match) return false;
  return (
    Number.isFinite(Number(match.hostLivePerfScore)) &&
    Number.isFinite(Number(match.guestLivePerfScore))
  );
}

/**
 * ライブ勝敗判定の解決（両者未セット／両者失敗はスキップ、一方成功一方失敗は成功側の勝ち、それ以外はスコア比較）
 * @param {VersusMatchDoc|null|undefined} match
 * @returns {{ kind: 'skip' } | { kind: 'outcome', outcome: 'hostWin'|'guestWin' } | { kind: 'scores', outcome: 'hostWin'|'guestWin'|'draw' } | { kind: 'pending' }}
 */
export function resolveVersusLiveJudgmentOutcome(match) {
  if (!match) return { kind: "pending" };
  /** @param {unknown} v */
  function normVerdict(v) {
    return v === "success" || v === "fail" ? v : "none";
  }
  var bothPerfDone = match.hostPerfDone === true && match.guestPerfDone === true;
  if (bothPerfDone) {
    var hv = normVerdict(match.hostLiveVerdict);
    var gv = normVerdict(match.guestLiveVerdict);
    if (hv === "none" && gv === "none") return { kind: "skip" };
    if (hv === "fail" && gv === "fail") return { kind: "skip" };
    if (hv === "success" && gv === "fail") return { kind: "outcome", outcome: "hostWin" };
    if (gv === "success" && hv === "fail") return { kind: "outcome", outcome: "guestWin" };
  }
  if (!versusBothLivePerfScoresReady(match)) return { kind: "pending" };
  var h = Number.isFinite(Number(match.hostLivePerfScore))
    ? Math.max(0, Math.floor(Number(match.hostLivePerfScore)))
    : 0;
  var g = Number.isFinite(Number(match.guestLivePerfScore))
    ? Math.max(0, Math.floor(Number(match.guestLivePerfScore)))
    : 0;
  /** @type {'hostWin'|'guestWin'|'draw'} */
  var outcome = "draw";
  if (h > g) outcome = "hostWin";
  else if (g > h) outcome = "guestWin";
  return { kind: "scores", outcome: outcome };
}

/** @param {VersusMatchDoc|null} match @param {VersusRole} myRole */
export function versusOpponentLastAction(match, myRole) {
  if (!match || !myRole) return null;
  return myRole === "host" ? match.guestLastAction : match.hostLastAction;
}

/**
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {{ successLiveCount?: number, lastAction?: string }} patch
 */
/**
 * 場・手札の公開スナップショット（オンライン対戦専用）
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {import('./versusBoardSync.js').VersusPublicBoard} boardPublic
 */
export async function pushVersusBoardPublic(roomCode, role, boardPublic) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const p = buildVersusBoardFirestorePatch(role, boardPublic);
  try {
    await api.updateDoc(ref, p);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

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
  if (patch && patch.lastAction != null && String(patch.lastAction).trim()) {
    const txt = String(patch.lastAction).trim().slice(0, 120);
    if (role === "host") p.hostLastAction = txt;
    else p.guestLastAction = txt;
  }
  try {
    await api.updateDoc(ref, p);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/**
 * 手番を相手に渡す（activePlayerRole を切り替え）
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function advanceVersusTurn(roomCode, role) {
  return endVersusTurn(roomCode, role);
}

/**
 * 開幕マリガン確定（先攻→後攻→先攻通常へ）
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function completeVersusOpeningMulligan(roomCode, role) {
  const user = requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status !== "playing") throw new Error("対戦中ではありません。");
  if (!canRoleActInVersus(data, role)) {
    throw new Error("あなたのマリガン順番ではありません。");
  }
  const fp = data.firstPlayerRole;
  const second = versusSecondPlayerRole(data);
  if (!fp || !second) throw new Error("先攻が未設定です。");
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  const phase = normalizeVersusPhase(data);
  const now = new Date().toISOString();
  /** @type {Record<string, unknown>} */
  const patch = { updatedAt: now };
  patch[actionField] = "マリガン完了";

  if (phase === "firstMulligan") {
    if (role !== fp) throw new Error("先攻プレイヤーのマリガンです。");
    patch.versusPhase = "secondMulligan";
    patch.activePlayerRole = second;
    if (role === "host") patch.hostOpeningMulliganDone = true;
    else patch.guestOpeningMulliganDone = true;
  } else if (phase === "secondMulligan") {
    if (role !== second) throw new Error("後攻プレイヤーのマリガンです。");
    patch.versusPhase = "firstNormal";
    patch.activePlayerRole = fp;
    if (role === "host") patch.hostOpeningMulliganDone = true;
    else patch.guestOpeningMulliganDone = true;
  } else {
    throw new Error("マリガンフェイズではありません。");
  }
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
  void user;
}

/**
 * ターン終了（通常フェイズ・ライブ遷移）
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function endVersusTurn(roomCode, role) {
  const user = requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  let snap;
  try {
    snap = await api.getDoc(ref);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status !== "playing") throw new Error("対戦中ではありません。");
  if (!canRoleActInVersus(data, role)) {
    throw new Error("あなたのターンではありません。相手の操作を待ってください。");
  }
  const fp = data.firstPlayerRole;
  const second = versusSecondPlayerRole(data);
  if (!fp || !second) throw new Error("先攻が未設定です。");
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  const phase = normalizeVersusPhase(data);
  const now = new Date().toISOString();
  /** @type {Record<string, unknown>} */
  const patch = { updatedAt: now };
  patch[actionField] = "ターン終了";

  if (phase === "live") {
    throw new Error("ライブフェイズ中です。セット完了・ライブ開始・パフォーマンス完了で進めてください。");
  }
  if (phase === "firstMulligan" || phase === "secondMulligan") {
    throw new Error("開幕マリガン中です。「マリガン実行」で確定してください。");
  }

  if (phase === "firstNormal") {
    if (role !== fp) {
      throw new Error("先攻プレイヤーの通常フェイズです。");
    }
    patch.versusPhase = "secondNormal";
    patch.activePlayerRole = second;
  } else if (phase === "secondNormal") {
    if (role !== second) {
      throw new Error("後攻プレイヤーの通常フェイズです。");
    }
    patch.versusPhase = "live";
    patch.liveStep = "set";
    patch.activePlayerRole = fp;
    patch.hostLiveSetDone = false;
    patch.guestLiveSetDone = false;
    patch.hostPerfDone = false;
    patch.guestPerfDone = false;
    patch.hostLiveComplete = false;
    patch.guestLiveComplete = false;
    patch.hostLivePerfScore = null;
    patch.guestLivePerfScore = null;
    patch.hostLiveVerdict = "none";
    patch.guestLiveVerdict = "none";
    patch.hostLiveHadCards = false;
    patch.guestLiveHadCards = false;
    patch.hostSuccessFxDone = false;
    patch.guestSuccessFxDone = false;
    patch.liveJudgmentOutcome = null;
    patch.liveJudgmentSeq = 0;
  } else {
    throw new Error("不明なフェーズです。");
  }
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
  void user;
}

/**
 * 8.2 ライブカードセット完了（先攻→後攻）
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function reportVersusLiveSetComplete(roomCode, role) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status !== "playing" || normalizeVersusPhase(data) !== "live") {
    throw new Error("ライブフェイズ中ではありません。");
  }
  if (getVersusLiveStep(data) !== "set") {
    throw new Error("ライブカードセットフェイズではありません。");
  }
  if (!canRoleActInVersus(data, role)) {
    throw new Error("あなたのセット順番ではありません。");
  }
  const fp = data.firstPlayerRole;
  const second = versusSecondPlayerRole(data);
  if (!fp || !second) throw new Error("先攻が未設定です。");
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  const setFlag = role === "host" ? "hostLiveSetDone" : "guestLiveSetDone";
  const patch = { updatedAt: new Date().toISOString() };
  patch[actionField] = "ライブセット完了";
  patch[setFlag] = true;

  if (role === fp) {
    patch.activePlayerRole = second;
  } else {
    const hostDone = role === "host" ? true : data.hostLiveSetDone === true;
    const guestDone = role === "guest" ? true : data.guestLiveSetDone === true;
    if (hostDone && guestDone) {
      patch.liveStep = "perf";
      patch.activePlayerRole = fp;
    } else if (fp) {
      patch.activePlayerRole = fp;
    }
  }
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/**
 * 8.3 パフォーマンス完了（先攻→後攻→成功時効果へ）
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {number} [liveScore] ライブスコア（勝敗判定用）
 * @param {{ verdict?: 'none'|'success'|'fail', hadCards?: boolean }} [liveMeta]
 */
export async function reportVersusLivePerfComplete(roomCode, role, liveScore, liveMeta) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status !== "playing" || normalizeVersusPhase(data) !== "live") {
    throw new Error("ライブフェイズ中ではありません。");
  }
  if (getVersusLiveStep(data) !== "perf") {
    throw new Error("パフォーマンスフェイズではありません。");
  }
  if (!canRoleActInVersus(data, role)) {
    throw new Error("あなたのパフォーマンス順番ではありません。");
  }
  const fp = data.firstPlayerRole;
  const second = versusSecondPlayerRole(data);
  if (!fp || !second) throw new Error("先攻が未設定です。");
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  const perfFlag = role === "host" ? "hostPerfDone" : "guestPerfDone";
  const scoreField = role === "host" ? "hostLivePerfScore" : "guestLivePerfScore";
  const patch = { updatedAt: new Date().toISOString() };
  patch[actionField] = "パフォーマンス完了";
  patch[perfFlag] = true;
  patch[scoreField] = Math.max(0, Math.floor(Number(liveScore) || 0));
  if (liveMeta && typeof liveMeta === "object") {
    const verdictField = role === "host" ? "hostLiveVerdict" : "guestLiveVerdict";
    const hadField = role === "host" ? "hostLiveHadCards" : "guestLiveHadCards";
    const v = liveMeta.verdict;
    if (v === "success" || v === "fail" || v === "none") patch[verdictField] = v;
    if (liveMeta.hadCards === true) patch[hadField] = true;
    else if (liveMeta.hadCards === false) patch[hadField] = false;
  }

  if (role === fp) {
    patch.activePlayerRole = second;
  } else if (role === second) {
    patch.liveStep = "successFx";
    patch.activePlayerRole = fp;
    patch.hostPerfDone = true;
    patch.guestPerfDone = true;
    patch.hostSuccessFxDone = false;
    patch.guestSuccessFxDone = false;
  }
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/** @deprecated reportVersusLivePerfComplete を使用 */
export async function reportVersusLiveComplete(roomCode, role) {
  return reportVersusLivePerfComplete(roomCode, role);
}

/**
 * 8.4 ライブ成功時効果を先攻→後攻の順で処理し終えた報告
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function reportVersusSuccessFxDone(roomCode, role) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status !== "playing" || normalizeVersusPhase(data) !== "live") {
    throw new Error("ライブフェイズ中ではありません。");
  }
  if (getVersusLiveStep(data) !== "successFx") {
    throw new Error("ライブ成功時効果の処理順番ではありません。");
  }
  if (!canRoleActInVersus(data, role)) {
    throw new Error("あなたの成功時効果処理順番ではありません。");
  }
  const fp = data.firstPlayerRole;
  const second = versusSecondPlayerRole(data);
  if (!fp || !second) throw new Error("先攻が未設定です。");
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  const fxFlag = role === "host" ? "hostSuccessFxDone" : "guestSuccessFxDone";
  const patch = { updatedAt: new Date().toISOString() };
  patch[actionField] = "成功時効果 完了";
  patch[fxFlag] = true;

  if (role === fp) {
    patch.activePlayerRole = second;
  } else {
    const hostFx = role === "host" ? true : data.hostSuccessFxDone === true;
    const guestFx = role === "guest" ? true : data.guestSuccessFxDone === true;
    if (hostFx && guestFx) {
      const afterFx = Object.assign({}, data, patch, {
        hostSuccessFxDone: true,
        guestSuccessFxDone: true,
      });
      const resolved = resolveVersusLiveJudgmentOutcome(afterFx);
      if (resolved.kind === "skip") {
        patch.versusPhase = "firstNormal";
        patch.liveStep = null;
        patch.activePlayerRole = fp;
        patch.hostLiveSetDone = false;
        patch.guestLiveSetDone = false;
        patch.hostPerfDone = false;
        patch.guestPerfDone = false;
        patch.hostLiveComplete = false;
        patch.guestLiveComplete = false;
        patch.hostLivePerfScore = null;
        patch.guestLivePerfScore = null;
        patch.hostLiveVerdict = "none";
        patch.guestLiveVerdict = "none";
        patch.hostLiveHadCards = false;
        patch.guestLiveHadCards = false;
        patch.hostSuccessFxDone = false;
        patch.guestSuccessFxDone = false;
        patch.liveJudgmentOutcome = null;
        patch.turnNumber = Math.max(1, Math.floor(Number(data.turnNumber) || 1)) + 1;
      } else {
        patch.liveStep = "judgment";
        patch.activePlayerRole = fp;
      }
    } else if (fp) {
      patch.activePlayerRole = fp;
    }
  }
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/**
 * ライブスコア勝敗判定（ホストのみ・両者のスコア報告後）
 * @param {string} roomCode
 */
export async function commitVersusLiveJudgment(roomCode) {
  const user = requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.hostUid !== user.uid) {
    throw new Error("勝敗判定はルーム作成者（ホスト）のみが確定できます。");
  }
  if (data.status !== "playing" || normalizeVersusPhase(data) !== "live") {
    throw new Error("ライブフェイズ中ではありません。");
  }
  if (getVersusLiveStep(data) !== "judgment") {
    throw new Error("ライブ勝敗判定フェイズではありません。");
  }
  if (data.liveJudgmentOutcome) return;
  const resolved = resolveVersusLiveJudgmentOutcome(data);
  if (resolved.kind === "pending" || resolved.kind === "skip") return;
  /** @type {'hostWin'|'guestWin'|'draw'} */
  const outcome =
    resolved.kind === "outcome" || resolved.kind === "scores" ? resolved.outcome : "draw";
  const seq = Math.max(0, Math.floor(Number(data.liveJudgmentSeq) || 0)) + 1;
  try {
    await api.updateDoc(ref, {
      liveJudgmentOutcome: outcome,
      liveJudgmentSeq: seq,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/**
 * 勝敗判定表示後に次の通常フェイズへ（ホストのみ）
 * @param {string} roomCode
 */
export async function finishVersusLiveJudgment(roomCode) {
  const user = requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.hostUid !== user.uid) return;
  if (data.status !== "playing" || normalizeVersusPhase(data) !== "live") return;
  if (getVersusLiveStep(data) !== "judgment") return;
  const resolved = resolveVersusLiveJudgmentOutcome(data);
  if (!data.liveJudgmentOutcome && resolved.kind !== "skip") return;
  const fp = data.firstPlayerRole;
  const patch = {
    versusPhase: "firstNormal",
    liveStep: null,
    activePlayerRole: fp || data.activePlayerRole,
    hostLiveSetDone: false,
    guestLiveSetDone: false,
    hostPerfDone: false,
    guestPerfDone: false,
    hostLiveComplete: false,
    guestLiveComplete: false,
    hostLivePerfScore: null,
    guestLivePerfScore: null,
    hostLiveVerdict: "none",
    guestLiveVerdict: "none",
    hostLiveHadCards: false,
    guestLiveHadCards: false,
    hostSuccessFxDone: false,
    guestSuccessFxDone: false,
    liveJudgmentOutcome: null,
    turnNumber: Math.max(1, Math.floor(Number(data.turnNumber) || 1)) + 1,
    updatedAt: new Date().toISOString(),
  };
  try {
    await api.updateDoc(ref, patch);
  } catch (err) {
    throw new Error(formatVersusFirestoreError(err));
  }
}

/**
 * 成功ライブに最初に置いたプレイヤーを先攻に（1回のみ）
 * @param {string} roomCode
 * @param {VersusRole} role
 */
export async function claimVersusFirstFromSuccessLive(roomCode, role) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.successLiveFirstLocked) return;
  try {
    await api.updateDoc(ref, {
      firstPlayerRole: role,
      successLiveFirstLocked: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[versusMatch] claim first from SL failed:", err);
  }
}

/**
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {string|null} cardNo
 */
/**
 * @param {string} roomCode
 * @param {VersusRole} role
 * @param {VersusEffectUi|null} ui
 */
export async function pushVersusEffectUi(roomCode, role, ui) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const uiField = role === "host" ? "hostEffectUi" : "guestEffectUi";
  const cardField = role === "host" ? "hostEffectCardNo" : "guestEffectCardNo";
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  try {
    if (!ui || !ui.cardNo) {
      await api.updateDoc(ref, {
        [uiField]: null,
        [cardField]: null,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    await api.updateDoc(ref, {
      [uiField]: ui,
      [cardField]: String(ui.cardNo),
      [actionField]: "効果発動",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[versusMatch] effect ui push failed:", err);
  }
}

/** @param {string} roomCode @param {VersusRole} role @param {string|null} cardNo @param {VersusEffectUi|null} [ui] */
export async function pushVersusEffectHighlight(roomCode, role, cardNo, ui) {
  if (!cardNo && !ui) return;
  var payload =
    ui && ui.cardNo
      ? ui
      : {
          cardNo: String(cardNo),
          instId: null,
          kind: "kidou",
          title: "効果の処理",
          bodyPlain: "",
        };
  await pushVersusEffectUi(roomCode, role, payload);
}

/** @param {string} roomCode @param {VersusRole} role */
export async function clearVersusEffectHighlight(roomCode, role) {
  await pushVersusEffectUi(roomCode, role, null);
}

function newBoardActionRequestId() {
  return "req-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/**
 * @param {string} roomCode
 * @param {VersusRole} fromRole
 * @param {VersusBoardActionRequest['action']} action
 */
export async function requestVersusBoardAction(roomCode, fromRole, action) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const cur = /** @type {VersusMatchDoc} */ (snap.data());
  if (cur.boardActionRequest && cur.boardActionRequest.status === "pending") {
    throw new Error("相手の承認待ちの操作が残っています。");
  }
  const req = {
    id: newBoardActionRequestId(),
    fromRole: fromRole,
    action: action,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  try {
    await api.updateDoc(ref, {
      boardActionRequest: req,
      updatedAt: new Date().toISOString(),
    });
    return req;
  } catch (err) {
    console.warn("[versusMatch] board action request failed:", err);
    throw err;
  }
}

/**
 * @param {string} roomCode
 * @param {VersusRole} responderRole
 * @param {boolean} approved
 */
export async function respondVersusBoardAction(roomCode, responderRole, approved) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  const req = data.boardActionRequest;
  if (!req || req.status !== "pending") return;
  if (req.fromRole === responderRole) {
    throw new Error("自分のリクエストには応答できません。");
  }
  await api.updateDoc(ref, {
    boardActionRequest: Object.assign({}, req, {
      status: approved ? "approved" : "denied",
    }),
    updatedAt: new Date().toISOString(),
  });
}

/** @param {string} roomCode */
export async function clearVersusBoardActionRequest(roomCode) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  try {
    await api.updateDoc(ref, {
      boardActionRequest: null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[versusMatch] clear board action request failed:", err);
  }
}

/** @param {string} roomCode @param {VersusRole} role */
/**
 * 投了後の次ゲーム準備（ホストのみ・6.2.1.4〜6 相当の開幕前まで）
 * @param {string} roomCode
 */
export async function resetVersusMatchForNextGame(roomCode) {
  const user = requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません。");
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.hostUid !== user.uid) {
    throw new Error("次のゲームの準備はルーム作成者（ホスト）のみ行えます。");
  }
  if (data.status !== "ended") {
    throw new Error("対戦終了後にのみ次のゲームを準備できます。");
  }
  const firstPlayerRole = Math.random() < 0.5 ? "host" : "guest";
  const now = new Date().toISOString();
  const seq = Math.max(0, Math.floor(Number(data.rematchSeq) || 0)) + 1;
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
    turnNumber: 1,
    hostLastAction: null,
    guestLastAction: null,
    versusPhase: "firstMulligan",
    hostOpeningMulliganDone: false,
    guestOpeningMulliganDone: false,
    rematchSeq: seq,
    liveStep: null,
    hostLiveSetDone: false,
    guestLiveSetDone: false,
    hostPerfDone: false,
    guestPerfDone: false,
    hostLiveComplete: false,
    guestLiveComplete: false,
    hostLivePerfScore: null,
    guestLivePerfScore: null,
    hostLiveVerdict: "none",
    guestLiveVerdict: "none",
    hostLiveHadCards: false,
    guestLiveHadCards: false,
    hostSuccessFxDone: false,
    guestSuccessFxDone: false,
    liveJudgmentOutcome: null,
    liveJudgmentSeq: 0,
    successLiveFirstLocked: false,
    hostEffectCardNo: null,
    guestEffectCardNo: null,
    hostEffectUi: null,
    guestEffectUi: null,
    boardActionRequest: null,
  });
}

export async function concedeVersusMatch(roomCode, role) {
  requireUser();
  const { api } = fs();
  const ref = matchRef(roomCode);
  const snap = await api.getDoc(ref);
  if (!snap.exists()) return;
  const data = /** @type {VersusMatchDoc} */ (snap.data());
  if (data.status === "ended") return;
  const winnerRole = role === "host" ? "guest" : "host";
  const actionField = role === "host" ? "hostLastAction" : "guestLastAction";
  const patch = {
    status: "ended",
    winnerRole: winnerRole,
    endedReason: "concede",
    updatedAt: new Date().toISOString(),
  };
  patch[actionField] = "投了";
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
/** @param {string} roomCode @returns {Promise<VersusMatchDoc|null>} */
export async function fetchVersusMatchDoc(roomCode) {
  if (!roomCode) return null;
  const x = getCloudFirestore();
  if (!x) return null;
  const { api } = x;
  try {
    const snap = await api.getDoc(matchRef(roomCode));
    return snap.exists() ? /** @type {VersusMatchDoc} */ (snap.data()) : null;
  } catch (err) {
    console.warn("[versusMatch] fetch failed:", err);
    return null;
  }
}

/**
 * @param {string} roomCode
 * @param {(match: VersusMatchDoc|null) => void} onChange
 * @param {(() => void)=} onError
 * @returns {() => void}
 */
export function subscribeVersusMatch(roomCode, onChange, onError) {
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
      if (typeof onError === "function") onError(err);
      else onChange(null);
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
