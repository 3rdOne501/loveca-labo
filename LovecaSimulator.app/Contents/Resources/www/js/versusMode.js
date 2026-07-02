/**
 * 対戦モード（一人二役＝Firestore 不要 / オンライン＝任意で Firestore）
 */
import {
  getCurrentCloudUser,
  getEffectiveCloudUser,
  isCloudSyncAvailable,
  onCloudUserChange,
  signInAsGuest,
} from "./cloudAuth.js";
import { showToast } from "./ui.js";
import {
  STORAGE_ACTIVE_PRESET_ID,
  STORAGE_PLAY_RESUME,
  STORAGE_VERSUS_LAST_ROOM,
  STORAGE_VERSUS_ONLINE_SESSION,
} from "./config.js";
import {
  createVersusRoom,
  fetchVersusMatchDoc,
  joinVersusRoom,
  isVersusMatchAvailable,
  leaveVersusRoom,
  setVersusDeckReady,
  startVersusMatch,
  subscribeVersusMatch,
  validateVersusMainDeck,
  versusOpponentLabel,
  versusRoleForUid,
} from "./versusMatch.js";
import {
  deckMapFromVersusMatchField,
  isBuiltInStarterDeckId,
  loadDeckLibrary,
  normalizeDeckMapCounts,
} from "./deckLibrary.js";
import { getSampleDeckRecipes } from "./sampleDeckRecipes.js";
import { ensureGoogleSession } from "./cloudAuth.js";

/** @typedef {(payload: object) => void} VersusPlayStartFn */
/** @typedef {() => Record<string, number>} GetDeckMapFn */

/** @type {VersusPlayStartFn|null} */
let onEnterVersusPlay = null;
/** @type {GetDeckMapFn|null} */
let getCurrentDeckMap = null;

/** @type {'localPractice'|'localDual'} */
let selectedSoloDualMode = "localPractice";

var SOLO_DUAL_MODE_HINTS = {
  localPractice:
    "ソロプレイのように自由に操作できます。画面上部の「〇〇に切替」でいつでも上下の盤面を入れ替えられます（ターン・フェイズの厳密管理なし）。",
  localDual:
    "対戦モードと同じフェイズ進行です。「ターン終了して〇〇に切り替え」で手番と盤面が切り替わります（手札・ライブは全面公開）。",
};

/** @type {(() => void)|null} */
let activeUnsub = null;
/** @type {string|null} */
let activeRoomCode = null;
/** @type {import('./versusMatch.js').VersusMatchDoc|null} */
let lastLobbyMatch = null;
/** @type {number} */
let lobbyRenderRaf = 0;
/** @type {Promise<boolean>|null} */
let versusRestorePromise = null;

function el(id) {
  return document.getElementById(id);
}

function clearPlayResumeStorage() {
  try {
    sessionStorage.removeItem(STORAGE_PLAY_RESUME);
  } catch (_) {
    /* noop */
  }
}

function deckHasCards(deckMap) {
  if (!deckMap || typeof deckMap !== "object") return false;
  var keys = Object.keys(deckMap);
  for (var i = 0; i < keys.length; i++) {
    if (Math.floor(Number(deckMap[keys[i]]) || 0) > 0) return true;
  }
  return false;
}

function setOnlineSectionVisible() {
  var wrap = el("dlg-versus-online-wrap");
  var hint = el("dlg-versus-online-hint");
  var u = getCurrentCloudUser() || getEffectiveCloudUser();
  var cloudOk = isCloudSyncAvailable();
  var fsOk = isVersusMatchAvailable();
  var online = fsOk && !!u;
  if (wrap) {
    wrap.hidden = !cloudOk;
    if (u && cloudOk) {
      try {
        wrap.open = true;
      } catch (_) {
        /* noop */
      }
    }
  }
  if (hint) {
    if (online) {
      hint.textContent =
        "①ルーム作成 → コード共有 ②相手が参加 ③両者「準備完了」→ ホストが「対戦開始」。公開ゾーンとスコア集計を同期し、相手対象の効果は対応カードで自動適用・選択リクエストされます（手札・ライブの表面は非公開）。";
    } else if (u && cloudOk && !fsOk) {
      hint.textContent =
        "ログイン済みですが Firestore に接続できません。ページを再読込するか、Firebase の Firestore を有効化してください。";
    } else if (cloudOk) {
      hint.textContent =
        "Google ログインなしでも「ルーム作成／参加」を押すとゲストとして自動ログインします（Google ログインはデッキのクラウド保存に利用）。";
    } else {
      hint.textContent = "オンラインルームを使うには Firebase 設定（firebaseConfig.js）が必要です。";
    }
  }
}

function stopSubscription() {
  if (activeUnsub) {
    try {
      activeUnsub();
    } catch (_) {
      /* noop */
    }
    activeUnsub = null;
  }
}

function setLobbyStatus(text) {
  var st = el("dlg-versus-lobby-status");
  if (st) st.textContent = text || "";
}

function versusMatchHasOpponent(match) {
  return !!(match && match.hostUid && match.guestUid);
}

function hasPlayResumeForVersusRoom(roomCode) {
  try {
    var raw = sessionStorage.getItem(STORAGE_PLAY_RESUME);
    if (!raw) return false;
    var pr = JSON.parse(raw);
    if (!pr || pr.v !== 1 || !pr.board) return false;
    if (!pr.versusOnline || !pr.versusOnline.roomCode) return false;
    return (
      String(pr.versusOnline.roomCode).toUpperCase() === String(roomCode || "").toUpperCase()
    );
  } catch (_) {
    return false;
  }
}

/** 対戦プレイ画面へ入る直前に inPlay が立っているときだけ盤面スナップショットを復元する */
function shouldResumeVersusPlayForRoom(roomCode) {
  var saved = readVersusOnlineSession();
  if (!saved || !saved.inPlay) return false;
  if (
    String(saved.roomCode || "").toUpperCase() !== String(roomCode || "").toUpperCase()
  ) {
    return false;
  }
  return hasPlayResumeForVersusRoom(roomCode);
}

/** @param {import('./versusMatch.js').VersusMatchDoc} match @param {import('./versusMatch.js').VersusRole} myRole */
function deckMapForVersusEnter(match, myRole) {
  var raw =
    myRole === "host" ? match.hostDeckMap : match.guestDeckMap;
  var fromMatch = deckMapFromVersusMatchField(raw);
  if (deckHasCards(fromMatch)) return fromMatch;
  if (getCurrentDeckMap) {
    var local = normalizeDeckMapCounts(getCurrentDeckMap() || {});
    if (deckHasCards(local)) return local;
  }
  return fromMatch;
}

/** @param {import('./versusMatch.js').VersusMatchDoc} match @param {import('./versusMatch.js').VersusRole} myRole */
function buildVersusOnlineEnterPayload(match, myRole) {
  return {
    mode: "online",
    sessionKey: match.roomCode,
    roomCode: match.roomCode,
    myRole: myRole,
    match: match,
    deckMap: deckMapForVersusEnter(match, myRole),
    resumeFromStorage: shouldResumeVersusPlayForRoom(match.roomCode),
  };
}

/** @param {string} roomCode */
export function rememberVersusRoomCode(roomCode) {
  if (!roomCode) return;
  try {
    localStorage.setItem(STORAGE_VERSUS_LAST_ROOM, String(roomCode).toUpperCase());
  } catch (_) {
    /* noop */
  }
}

export function getRememberedVersusRoomCode() {
  try {
    return localStorage.getItem(STORAGE_VERSUS_LAST_ROOM) || "";
  } catch (_) {
    return "";
  }
}

/** ルーム退出・追い出し時にローカル／セッションのルーム記憶をすべて消す */
export function forgetVersusRoomPersistence() {
  try {
    localStorage.removeItem(STORAGE_VERSUS_LAST_ROOM);
  } catch (_) {
    /* noop */
  }
  clearVersusOnlineSession();
  clearPlayResumeStorage();
  try {
    if (typeof window !== "undefined") {
      delete window.__llocgVersusPendingLobbyRoom;
      delete window.__llocgVersusAutoEnterPending;
      delete window.__llocgVersusLobbyAutoEnterSeq;
    }
  } catch (_) {
    /* noop */
  }
  lastLobbyMatch = null;
  stopSubscription();
  activeRoomCode = null;
  var disp = el("dlg-versus-room-code-display");
  if (disp) disp.textContent = "——";
  var inp = /** @type {HTMLInputElement|null} */ (el("dlg-versus-room-code"));
  if (inp) inp.value = "";
  updateVersusLobbyButtons(null, null);
}

function openVersusLobbyDialog() {
  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  if (!dlg) {
    showToast("対戦ダイアログが見つかりません。ページを再読込してください。");
    return false;
  }
  var uOpen = getEffectiveCloudUser();
  setLobbyStatus(
    (uOpen ? "ログイン: " + (uOpen.displayName || uOpen.email || "Google") + " · " : "") +
      "対面・オンラインどちらでも各プレイヤーが自分の端末で盤面を操作。勝敗は成功ライブ3枚（相手2枚以下）。",
  );
  var saved = readVersusOnlineSession();
  var pending =
    typeof window !== "undefined" && window.__llocgVersusPendingLobbyRoom
      ? String(window.__llocgVersusPendingLobbyRoom)
      : "";
  var code = (saved && saved.roomCode) || pending || "";
  if (code) setLobbyRoomCode(code);
  else updateVersusLobbyButtons(null, null);
  if (code && saved && saved.roomCode && !activeRoomCode) watchRoom(code);
  else if (code && pending && !activeRoomCode) watchRoom(code);
  if (typeof window !== "undefined" && window.__llocgVersusPendingLobbyRoom) {
    delete window.__llocgVersusPendingLobbyRoom;
  }
  setOnlineSectionVisible();
  refreshVersusLocalDualDeckSelect();
  refreshVersusSoloModePick();
  try {
    if (dlg.open) {
      dlg.focus();
      return true;
    }
    dlg.showModal();
    return true;
  } catch (err) {
    console.warn("[versus] showModal failed:", err);
    showToast("対戦ウィンドウを開けませんでした。ブラウザを再読込してください。");
    return false;
  }
}

function setLobbyRoomCode(code) {
  var inp = /** @type {HTMLInputElement|null} */ (el("dlg-versus-room-code"));
  if (inp && code) inp.value = code;
  var disp = el("dlg-versus-room-code-display");
  if (disp) disp.textContent = code || "——";
}

function isVersusPlayScreenMounted() {
  try {
    return !!(
      typeof window !== "undefined" &&
      window.__llocgVersusPlayMounted &&
      !document.getElementById("view-game")?.hidden
    );
  } catch (_) {
    return false;
  }
}

function updateVersusLobbyButtons(match, myRole) {
  var btnCreate = el("dlg-versus-create");
  var btnJoin = el("dlg-versus-join");
  var btnReady = el("dlg-versus-ready");
  var btnStart = el("dlg-versus-start");
  var btnOpenPlay = el("dlg-versus-open-play");
  if (!match || !myRole) {
    if (btnCreate) btnCreate.hidden = false;
    if (btnJoin) btnJoin.hidden = false;
    if (btnReady) btnReady.hidden = true;
    if (btnStart) btnStart.hidden = true;
    if (btnOpenPlay) btnOpenPlay.hidden = true;
    return;
  }
  var u = getCurrentCloudUser();
  var isHost = myRole === "host";
  var inRoom = !!(match && myRole && u);
  var inLobby = match.status === "lobby" || match.status === "waiting";
  if (btnCreate) btnCreate.hidden = inRoom;
  if (btnJoin) btnJoin.hidden = inRoom;
  if (btnReady) {
    btnReady.hidden = !inRoom || !inLobby;
    var ready = isHost ? match.hostDeckReady : match.guestDeckReady;
    btnReady.textContent = ready ? "デッキ準備済み" : "このデッキで準備完了";
    btnReady.disabled = !!ready;
  }
  if (btnStart) {
    btnStart.hidden = !inRoom || !isHost || !inLobby;
    var canStart = !!(match.hostDeckReady && match.guestDeckReady && match.guestUid);
    btnStart.disabled = !canStart;
    btnStart.textContent = canStart ? "対戦開始" : "対戦開始（相手の準備待ち）";
  }
  if (btnOpenPlay) {
    var showOpen =
      inRoom && match.status === "playing" && !isVersusPlayScreenMounted();
    btnOpenPlay.hidden = !showOpen;
    btnOpenPlay.textContent = shouldResumeVersusPlayForRoom(match.roomCode)
      ? "対戦画面へ（続きから）"
      : "対戦画面へ";
  }
}

function scheduleRenderLobbyMatch(match) {
  lastLobbyMatch = match;
  if (lobbyRenderRaf) return;
  lobbyRenderRaf = requestAnimationFrame(function () {
    lobbyRenderRaf = 0;
    renderLobbyMatch(lastLobbyMatch);
  });
}

function renderLobbyMatch(match) {
  lastLobbyMatch = match;
  var u = getCurrentCloudUser();
  if (!match || !u) {
    setLobbyStatus("オンライン: ルームに参加していません。");
    updateVersusLobbyButtons(null, null);
    return;
  }
  var myRole = versusRoleForUid(match, u.uid);
  if (!myRole) {
    setLobbyStatus("このルームの参加者ではありません。コードで参加してください。");
    updateVersusLobbyButtons(null, null);
    return;
  }
  var isHost = myRole === "host";
  activeRoomCode = match.roomCode;
  setLobbyRoomCode(match.roomCode);
  var opp = versusOpponentLabel(match, myRole);
  var mySl =
    myRole === "host"
      ? Math.floor(Number(match.hostSuccessLiveCount) || 0)
      : Math.floor(Number(match.guestSuccessLiveCount) || 0);
  var oppSl =
    myRole === "host"
      ? Math.floor(Number(match.guestSuccessLiveCount) || 0)
      : Math.floor(Number(match.hostSuccessLiveCount) || 0);
  var status = "オンライン ルーム " + match.roomCode + " · 相手: " + opp;
  if (match.status === "waiting") status += " · 相手の参加を待っています…";
  else if (match.status === "lobby") {
    status += isHost
      ? " · 両者の準備ができたら「対戦開始」"
      : " · 準備完了後、ホストの開始を待機";
  }
  else if (match.status === "playing") {
    status += " · 対戦中（成功ライブ あなた " + mySl + " / 相手 " + oppSl + "）";
  } else if (match.status === "ended") {
    if (match.winnerRole === myRole) status += " · あなたの勝ち";
    else if (match.winnerRole) status += " · あなたの負け";
    else status += " · 引き分け";
  }
  setLobbyStatus(status);
  updateVersusLobbyButtons(match, myRole);
  maybeAutoEnterVersusPlayFromLobby(match, myRole);
}

/** @param {{ allowResume?: boolean, silent?: boolean }} [opts] */
function enterVersusPlayFromLobby(opts) {
  if (!lastLobbyMatch || lastLobbyMatch.status !== "playing") return;
  var u = getCurrentCloudUser() || getEffectiveCloudUser();
  if (!u || !u.uid || typeof onEnterVersusPlay !== "function") return;
  var myRole = versusRoleForUid(lastLobbyMatch, u.uid);
  if (!myRole) return;
  if (!versusMatchHasOpponent(lastLobbyMatch)) {
    showToast("相手の参加を待っています");
    return;
  }
  var allowResume = !!(opts && opts.allowResume === true);
  var payload = buildVersusOnlineEnterPayload(lastLobbyMatch, myRole);
  if (!allowResume) {
    payload.resumeFromStorage = false;
    clearPlayResumeStorage();
  }
  if (!deckHasCards(payload.deckMap)) {
    showToast("デッキを準備してからプレイ画面へ進んでください");
    return;
  }
  persistVersusOnlineSession(lastLobbyMatch.roomCode, myRole, true);
  onEnterVersusPlay(payload);
  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  try {
    dlg?.close();
  } catch (_) {
    /* noop */
  }
  if (!(opts && opts.silent)) {
    showToast(payload.resumeFromStorage ? "対戦画面へ（続きから）" : "対戦画面へ", {
      duration: 4000,
    });
  }
}

/** @param {import('./versusMatch.js').VersusMatchDoc} match @param {import('./versusMatch.js').VersusRole} myRole */
function maybeAutoEnterVersusPlayFromLobby(match, myRole) {
  if (!match || match.status !== "playing" || !myRole) return;
  if (isVersusPlayScreenMounted()) return;
  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  if (!dlg || !dlg.open) return;
  if (typeof window !== "undefined" && window.__llocgVersusLobbyAutoEnterSeq === match.rematchSeq) {
    return;
  }
  try {
    if (typeof window !== "undefined") {
      window.__llocgVersusLobbyAutoEnterSeq = Math.max(
        0,
        Math.floor(Number(match.rematchSeq) || 0),
      );
    }
  } catch (_) {
    /* noop */
  }
  enterVersusPlayFromLobby({ allowResume: true, silent: true });
}

function watchRoom(roomCode) {
  stopSubscription();
  activeRoomCode = roomCode;
  rememberVersusRoomCode(roomCode);
  activeUnsub = subscribeVersusMatch(
    roomCode,
    function (match) {
      scheduleRenderLobbyMatch(match);
    },
    function () {
      setLobbyStatus(
        "ルーム情報の取得に失敗しました（権限エラー）。firestore.rules をデプロイしてから再読込してください。",
      );
      updateVersusLobbyButtons(null, null);
    },
  );
}

function deckRoleLabelsFromSlot(slot) {
  if (!slot || typeof slot !== "object") {
    return { keyCardNos: [], keyCard2Nos: [], keyCard3Nos: [], middleCardNos: [] };
  }
  return {
    keyCardNos: Array.isArray(slot.keyCardNos) ? slot.keyCardNos : [],
    keyCard2Nos: Array.isArray(slot.keyCard2Nos) ? slot.keyCard2Nos : [],
    keyCard3Nos: Array.isArray(slot.keyCard3Nos) ? slot.keyCard3Nos : [],
    middleCardNos: Array.isArray(slot.middleCardNos) ? slot.middleCardNos : [],
  };
}

function hostDeckLabelFromLibrary() {
  var lib = loadDeckLibrary();
  var activeId = "";
  try {
    activeId = localStorage.getItem(STORAGE_ACTIVE_PRESET_ID) || "";
  } catch (_) {
    /* noop */
  }
  if (activeId && lib && Array.isArray(lib.slots)) {
    for (var i = 0; i < lib.slots.length; i++) {
      var s = lib.slots[i];
      if (s && s.id === activeId && s.name) return String(s.name);
    }
  }
  return "メインデッキ";
}

function deckRoleLabelsFromSample(recipe) {
  if (!recipe || typeof recipe !== "object") {
    return { keyCardNos: [], keyCard2Nos: [], keyCard3Nos: [], middleCardNos: [] };
  }
  return {
    keyCardNos: Array.isArray(recipe.keyCardNos) ? recipe.keyCardNos : [],
    keyCard2Nos: Array.isArray(recipe.keyCard2Nos) ? recipe.keyCard2Nos : [],
    keyCard3Nos: Array.isArray(recipe.keyCard3Nos) ? recipe.keyCard3Nos : [],
    middleCardNos: Array.isArray(recipe.middleCardNos) ? recipe.middleCardNos : [],
  };
}

/** @param {string} id */
export function resolveLocalDualOpponentDeck(id) {
  var key = String(id || "").trim();
  if (!key) return null;
  if (key.indexOf("sample:") === 0) {
    var sid = key.slice(7);
    var recipes = getSampleDeckRecipes();
    for (var r = 0; r < recipes.length; r++) {
      var recipe = recipes[r];
      if (!recipe || recipe.id !== sid || !deckHasCards(recipe.deck)) continue;
      return {
        deckMap: normalizeDeckMapCounts(recipe.deck),
        roleLabels: deckRoleLabelsFromSample(recipe),
        label: String(recipe.name || sid),
      };
    }
    return null;
  }
  var lib = loadDeckLibrary();
  var slots = lib && Array.isArray(lib.slots) ? lib.slots : [];
  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];
    if (!slot || slot.id !== key || !deckHasCards(slot.deck)) continue;
    return {
      deckMap: normalizeDeckMapCounts(slot.deck),
      roleLabels: deckRoleLabelsFromSlot(slot),
      label: String(slot.name || key),
    };
  }
  return null;
}

export function refreshVersusLocalDualDeckSelect() {
  var sel = /** @type {HTMLSelectElement|null} */ (el("dlg-versus-local-dual-deck"));
  if (!sel) return;
  var lib = loadDeckLibrary();
  var slots = lib && Array.isArray(lib.slots) ? lib.slots : [];
  var prev = sel.value;
  sel.replaceChildren();
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "相手デッキを選択…";
  sel.appendChild(placeholder);
  var hostMap = getCurrentDeckMap ? normalizeDeckMapCounts(getCurrentDeckMap() || {}) : {};
  var hostFp = JSON.stringify(hostMap);
  var added = 0;

  function appendOpt(value, label, sameAsMain) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label + (sameAsMain ? "（メインと同じ）" : "");
    sel.appendChild(opt);
    added++;
  }

  var samples = getSampleDeckRecipes();
  for (var s = 0; s < samples.length; s++) {
    var recipe = samples[s];
    if (!recipe || !recipe.id || !deckHasCards(recipe.deck)) continue;
    var same = JSON.stringify(normalizeDeckMapCounts(recipe.deck)) === hostFp;
    appendOpt("sample:" + recipe.id, "[サンプル] " + String(recipe.name || recipe.id), same);
  }
  for (var j = 0; j < slots.length; j++) {
    var slot = slots[j];
    if (!slot || !slot.id || !deckHasCards(slot.deck)) continue;
    var tag = isBuiltInStarterDeckId(slot.id) ? "[サンプル] " : "[登録] ";
    var sameSlot = JSON.stringify(normalizeDeckMapCounts(slot.deck)) === hostFp;
    appendOpt(slot.id, tag + String(slot.name || slot.id), sameSlot);
  }
  if (prev) {
    for (var k = 0; k < sel.options.length; k++) {
      if (sel.options[k].value === prev) {
        sel.value = prev;
        break;
      }
    }
  }
  sel.disabled = added === 0;
}

export function refreshVersusSoloModePick() {
  document.querySelectorAll("[data-versus-solo-mode]").forEach(function (btn) {
    if (!(btn instanceof HTMLElement)) return;
    var mode = btn.getAttribute("data-versus-solo-mode");
    var on = mode === selectedSoloDualMode;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.classList.toggle("dlg-versus-mode-pick-btn--on", on);
  });
  var hint = el("dlg-versus-solo-mode-hint");
  if (hint) {
    hint.textContent = SOLO_DUAL_MODE_HINTS[selectedSoloDualMode] || "";
  }
}

function startSoloDualVersus() {
  var deck = getCurrentDeckMap && getCurrentDeckMap();
  if (!deckHasCards(deck)) {
    showToast("メインデッキにカードを入れてください");
    return;
  }
  var sel = /** @type {HTMLSelectElement|null} */ (el("dlg-versus-local-dual-deck"));
  var oppId = sel && sel.value ? String(sel.value).trim() : "";
  if (!oppId) {
    showToast("相手のデッキを選択してください");
    return;
  }
  var oppResolved = resolveLocalDualOpponentDeck(oppId);
  if (!oppResolved || !deckHasCards(oppResolved.deckMap)) {
    showToast("選択した相手デッキを読み込めませんでした");
    return;
  }
  var hostV60 = validateVersusMainDeck(deck || {});
  if (!hostV60.ok) {
    showToast(hostV60.message || "公式戦ではメインデッキ60枚が必要です（練習はこのまま開始できます）", {
      duration: 5000,
    });
  }
  var oppMap = oppResolved.deckMap;
  var oppV60 = validateVersusMainDeck(oppMap);
  if (!oppV60.ok) {
    showToast(
      "相手デッキ: " +
        (oppV60.message || "60枚未満です") +
        "（練習はこのまま開始できます）",
      { duration: 5000 },
    );
  }
  if (typeof onEnterVersusPlay !== "function") return;
  var mode = selectedSoloDualMode === "localDual" ? "localDual" : "localPractice";
  onEnterVersusPlay({
    mode: mode,
    sessionKey: mode === "localDual" ? "local-dual" : "local-practice",
    deckMap: hostV60.ok ? hostV60.map : deck,
    opponentDeckMap: oppV60.ok ? oppV60.map : oppMap,
    hostDeckLabel: hostDeckLabelFromLibrary(),
    guestDeckLabel: oppResolved.label || "相手デッキ",
    opponentDeckRoleLabels: oppResolved.roleLabels || {},
  });
  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  try {
    dlg?.close();
  } catch (_) {
    /* noop */
  }
}

/**
 * @param {{ onEnterVersusPlay: VersusPlayStartFn, getCurrentDeckMap: GetDeckMapFn }} opts
 */
export function initVersusMode(opts) {
  onEnterVersusPlay = opts.onEnterVersusPlay;
  getCurrentDeckMap = opts.getCurrentDeckMap;
  window.__llocgStartSoloDualVersus = function () {
    startSoloDualVersus();
  };
  window.__llocgOpenVersusLobby = openVersusLobbyDialog;

  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  var btnOpen = el("btn-start-versus");
  var btnClose = el("dlg-versus-lobby-close");
  var btnSoloDual = el("dlg-versus-start-solo-dual");
  var btnCreate = el("dlg-versus-create");
  var btnJoin = el("dlg-versus-join");
  var btnReady = el("dlg-versus-ready");
  var btnStart = el("dlg-versus-start");
  var btnOpenPlay = el("dlg-versus-open-play");
  var btnLeave = el("dlg-versus-leave");

  function refreshVersusButton() {
    if (!btnOpen) return;
    btnOpen.disabled = false;
    var u = getEffectiveCloudUser();
    btnOpen.title = u
      ? "一人二役・オンライン対戦（" + (u.displayName || u.email || "Google") + "）"
      : "一人二役（ログイン不要）・オンラインルーム（Google ログイン）";
    setOnlineSectionVisible();
  }

  onCloudUserChange(refreshVersusButton);
  refreshVersusButton();

  if (!window.__llocgVersusOpenDelegated) {
    window.__llocgVersusOpenDelegated = true;
    document.addEventListener(
      "click",
      function (ev) {
        var t = ev.target;
        if (!(t instanceof Element)) return;
        var hit = t.closest("#btn-start-versus");
        if (!hit || hit.disabled) return;
        openVersusLobbyDialog();
      },
      true,
    );
  }

  btnClose?.addEventListener("click", function () {
    dlg?.close();
  });

  btnSoloDual?.addEventListener("click", function () {
    startSoloDualVersus();
  });

  document.querySelectorAll("[data-versus-solo-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-versus-solo-mode");
      if (mode !== "localPractice" && mode !== "localDual") return;
      selectedSoloDualMode = mode;
      refreshVersusSoloModePick();
    });
  });
  refreshVersusSoloModePick();

  btnCreate?.addEventListener("click", async function () {
    var u = getCurrentCloudUser() || getEffectiveCloudUser();
    if (!u) {
      /* Google 未ログインでもゲスト（匿名）で続行できる */
      showToast("ゲストとしてログインしています…", { duration: 3000 });
      u = await signInAsGuest();
      if (!u) return;
    }
    if (!isVersusMatchAvailable()) {
      showToast("Firestore が使えません。再読込するか Firebase で Firestore を有効化してください。", {
        duration: 8000,
      });
      return;
    }
    var deck = getCurrentDeckMap && getCurrentDeckMap();
    try {
      var created = await createVersusRoom(deck || {});
      if (created.deckWarning) {
        showToast(created.deckWarning, { duration: 6000 });
      }
      showToast("ルームを作成しました: " + created.roomCode + "（相手にこのコードを伝えてください）", {
        duration: 8000,
      });
      watchRoom(created.roomCode);
      persistVersusOnlineSession(created.roomCode, "host", false);
    } catch (err) {
      showToast(String(err.message || err), { duration: 10000 });
    }
  });

  btnJoin?.addEventListener("click", async function () {
    var u = getCurrentCloudUser() || getEffectiveCloudUser();
    if (!u) {
      showToast("ゲストとしてログインしています…", { duration: 3000 });
      u = await signInAsGuest();
      if (!u) return;
    }
    var codeInp = /** @type {HTMLInputElement|null} */ (el("dlg-versus-room-code"));
    var code = codeInp && codeInp.value ? codeInp.value.trim() : "";
    var deck = getCurrentDeckMap && getCurrentDeckMap();
    if (!code) {
      showToast("ルームコードを入力してください");
      return;
    }
    try {
      var joined = await joinVersusRoom(code, deck || {});
      if (joined.deckWarning) {
        showToast(joined.deckWarning, { duration: 6000 });
      }
      showToast("ルーム " + joined.roomCode + " に参加しました");
      watchRoom(joined.roomCode);
      var joinRole = versusRoleForUid(joined.match, u.uid);
      if (joinRole) persistVersusOnlineSession(joined.roomCode, joinRole, false);
    } catch (err) {
      showToast(String(err.message || err), { duration: 10000 });
    }
  });

  btnReady?.addEventListener("click", async function () {
    if (!activeRoomCode) return;
    var u = getCurrentCloudUser();
    if (!u) return;
    var deck = getCurrentDeckMap && getCurrentDeckMap();
    var role = lastLobbyMatch ? versusRoleForUid(lastLobbyMatch, u.uid) : null;
    if (!role) return;
    try {
      await setVersusDeckReady(activeRoomCode, role, deck || {});
      showToast("デッキ準備を送信しました");
    } catch (err) {
      showToast(String(err.message || err));
    }
  });

  btnStart?.addEventListener("click", async function () {
    if (!activeRoomCode) return;
    try {
      await startVersusMatch(activeRoomCode);
      clearPlayResumeStorage();
      showToast("対戦を開始しました（先攻は無作為）");
      enterVersusPlayFromLobby({ allowResume: false, silent: true });
    } catch (err) {
      showToast(String(err.message || err));
    }
  });

  btnOpenPlay?.addEventListener("click", function () {
    enterVersusPlayFromLobby({ allowResume: true });
  });

  btnLeave?.addEventListener("click", async function () {
    var u = getCurrentCloudUser();
    var code = activeRoomCode;
    stopSubscription();
    activeRoomCode = null;
    if (code && u && u.uid) {
      try {
        await leaveVersusRoom(code, u.uid);
      } catch (err) {
        console.warn("[versus] leave failed:", err);
      }
    }
    forgetVersusRoomPersistence();
    if (typeof window.__llocgResetPlayFromVersusLeave === "function") {
      window.__llocgResetPlayFromVersusLeave();
    }
    setLobbyStatus("ルームから退出しました。再読込してもこのルームには戻りません。");
    showToast("ルームから退出しました");
  });
}

export function teardownVersusModeSession(opts) {
  var skipLeave = opts && opts.skipLeaveRoom === true;
  var u = getCurrentCloudUser() || getEffectiveCloudUser();
  var code = activeRoomCode;
  stopSubscription();
  activeRoomCode = null;
  if (!skipLeave && code && u && u.uid) {
    leaveVersusRoom(code, u.uid).catch(function (err) {
      console.warn("[versus] leave failed:", err);
    });
    forgetVersusRoomPersistence();
    if (typeof window.__llocgResetPlayFromVersusLeave === "function") {
      window.__llocgResetPlayFromVersusLeave();
    }
  } else if (!skipLeave) {
    forgetVersusRoomPersistence();
  } else {
    /* skipLeaveRoom=true はリロード(pagehide)や「ロビーへ」で【ルームに残る】ケース。
     * このとき STORAGE_PLAY_RESUME を消すと、直前に flush した自盤スナップショットが失われ、
     * 再入場（対戦画面へ）が新規開幕デッキで始まってしまう（＝リロードで盤面が消えるバグ）。
     * よってここでは resume を消さず、自動再入場フラグのみ解除する。 */
    delete window.__llocgVersusAutoEnterPending;
  }
}

export function getActiveVersusRoomCode() {
  return activeRoomCode;
}

/** @param {string} roomCode @param {VersusRole} myRole @param {boolean} inPlay */
export function persistVersusOnlineSession(roomCode, myRole, inPlay) {
  if (!roomCode || !myRole) return;
  rememberVersusRoomCode(roomCode);
  try {
    sessionStorage.setItem(
      STORAGE_VERSUS_ONLINE_SESSION,
      JSON.stringify({
        v: 1,
        roomCode: String(roomCode).toUpperCase(),
        myRole: myRole,
        inPlay: !!inPlay,
        savedAt: Date.now(),
      }),
    );
  } catch (_) {
    /* noop */
  }
}

/** ルーム監視は続けつつ「プレイ中」フラグだけ下ろす（ソロ開始時など） */
export function markVersusSessionLobbyOnly() {
  var saved = readVersusOnlineSession();
  if (saved && saved.roomCode && saved.myRole) {
    persistVersusOnlineSession(saved.roomCode, saved.myRole, false);
  }
}

/** プレイ画面を離れるがルームには残る（オンライン対戦） */
export function pauseVersusOnlineToLobby() {
  const saved = readVersusOnlineSession();
  if (saved && saved.roomCode && saved.myRole) {
    persistVersusOnlineSession(saved.roomCode, saved.myRole, false);
  }
  stopSubscription();
  activeRoomCode = saved && saved.roomCode ? saved.roomCode : activeRoomCode;
}

export function clearVersusOnlineSession() {
  try {
    sessionStorage.removeItem(STORAGE_VERSUS_ONLINE_SESSION);
  } catch (_) {
    /* noop */
  }
}

function readVersusOnlineSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_VERSUS_ONLINE_SESSION);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.roomCode) return null;
    return s;
  } catch (_) {
    return null;
  }
}

/**
 * 再読み込み後にオンライン対戦ルームへ復帰する。
 * @param {VersusPlayStartFn} onEnterPlay
 * @returns {Promise<boolean>}
 */
function markVersusPendingLobbyRoom(roomCode) {
  if (!roomCode) return;
  rememberVersusRoomCode(roomCode);
  try {
    if (typeof window !== "undefined") {
      window.__llocgVersusPendingLobbyRoom = String(roomCode).toUpperCase();
    }
  } catch (_) {
    /* noop */
  }
}

export async function tryRestoreVersusOnlineSession(onEnterPlay) {
  if (versusRestorePromise) return versusRestorePromise;
  versusRestorePromise = (async function () {
    try {
      const saved = readVersusOnlineSession();
      if (!saved || !saved.roomCode) {
        return false;
      }
      if (!isVersusMatchAvailable()) return false;
      try {
        await ensureGoogleSession();
      } catch (_) {
        /* noop */
      }
      const u = getCurrentCloudUser() || getEffectiveCloudUser();
      if (!u || !u.uid) return false;
      const match = await fetchVersusMatchDoc(saved.roomCode);
      if (!match) {
        forgetVersusRoomPersistence();
        return false;
      }
      const myRole = versusRoleForUid(match, u.uid);
      if (!myRole) {
        forgetVersusRoomPersistence();
        return false;
      }
      activeRoomCode = match.roomCode;
      rememberVersusRoomCode(match.roomCode);
      persistVersusOnlineSession(match.roomCode, myRole, !!saved.inPlay);

      watchRoom(match.roomCode);
      if (match.status === "playing" && saved.inPlay && typeof onEnterPlay === "function") {
        if (!versusMatchHasOpponent(match)) {
          markVersusPendingLobbyRoom(match.roomCode);
          persistVersusOnlineSession(match.roomCode, myRole, false);
          return false;
        }
        var payload = buildVersusOnlineEnterPayload(match, myRole);
        if (!deckHasCards(payload.deckMap)) {
          markVersusPendingLobbyRoom(match.roomCode);
          persistVersusOnlineSession(match.roomCode, myRole, false);
          return false;
        }
        persistVersusOnlineSession(match.roomCode, myRole, true);
        onEnterPlay(payload);
        return true;
      }
      markVersusPendingLobbyRoom(match.roomCode);
      persistVersusOnlineSession(match.roomCode, myRole, false);
      return false;
    } finally {
      try {
        if (typeof window !== "undefined") window.__llocgVersusBootRestoreDone = true;
      } catch (_) {
        /* noop */
      }
    }
  })();
  return versusRestorePromise;
}
