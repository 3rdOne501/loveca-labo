/**
 * 対戦モード（簡易＝Firestore 不要 / オンライン＝任意で Firestore）
 */
import {
  getCurrentCloudUser,
  getEffectiveCloudUser,
  isCloudSyncAvailable,
  onCloudUserChange,
  signInWithGoogle,
} from "./cloudAuth.js";
import { showToast } from "./ui.js";
import {
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
import { ensureGoogleSession } from "./cloudAuth.js";

/** @typedef {(payload: object) => void} VersusPlayStartFn */
/** @typedef {() => Record<string, number>} GetDeckMapFn */

/** @type {VersusPlayStartFn|null} */
let onEnterVersusPlay = null;
/** @type {GetDeckMapFn|null} */
let getCurrentDeckMap = null;

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
        "①ルーム作成 → コード共有 ②相手が参加 ③両者「準備完了」→ ホストが「対戦開始」。公開ゾーンのみ同期（手札・ライブの表面は非公開）。";
    } else if (u && cloudOk && !fsOk) {
      hint.textContent =
        "ログイン済みですが Firestore に接続できません。ページを再読込するか、Firebase の Firestore を有効化してください。";
    } else if (cloudOk) {
      hint.textContent = "オンラインルームを使うには Google でログインしてください。";
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

/** @param {import('./versusMatch.js').VersusMatchDoc} match @param {import('./versusMatch.js').VersusRole} myRole */
function buildVersusOnlineEnterPayload(match, myRole) {
  if (myRole === "spectator") {
    return {
      mode: "online",
      sessionKey: match.roomCode + ":spectator",
      roomCode: match.roomCode,
      myRole: "spectator",
      match: match,
      deckMap: {},
      resumeFromStorage: false,
      spectatorMode: true,
    };
  }
  var deckMap =
    myRole === "host"
      ? match.hostDeckMap || (getCurrentDeckMap && getCurrentDeckMap())
      : match.guestDeckMap || (getCurrentDeckMap && getCurrentDeckMap());
  return {
    mode: "online",
    sessionKey: match.roomCode,
    roomCode: match.roomCode,
    myRole: myRole,
    match: match,
    deckMap: deckMap || {},
    resumeFromStorage: hasPlayResumeForVersusRoom(match.roomCode),
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
  var last = getRememberedVersusRoomCode();
  var code = (saved && saved.roomCode) || pending || last || "";
  if (code) setLobbyRoomCode(code);
  else updateVersusLobbyButtons(null, null);
  if (code && !activeRoomCode) watchRoom(code);
  if (typeof window !== "undefined" && window.__llocgVersusPendingLobbyRoom) {
    delete window.__llocgVersusPendingLobbyRoom;
  }
  setOnlineSectionVisible();
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

function updateVersusLobbyButtons(match, myRole) {
  var btnCreate = el("dlg-versus-create");
  var btnJoin = el("dlg-versus-join");
  var btnReady = el("dlg-versus-ready");
  var btnStart = el("dlg-versus-start");
  var btnEnter = el("dlg-versus-enter-play");
  var btnRejoin = el("dlg-versus-rejoin-room");
  var btnSpectate = el("dlg-versus-spectate");
  var u = getCurrentCloudUser();
  var isHost = myRole === "host";
  var isSpectator = myRole === "spectator";
  var inRoom = !!(match && myRole && u);
  if (btnCreate) btnCreate.hidden = inRoom;
  if (btnJoin) btnJoin.hidden = inRoom;
  if (isSpectator) {
    if (btnReady) btnReady.hidden = true;
    if (btnStart) btnStart.hidden = true;
    if (btnRejoin) btnRejoin.hidden = true;
    if (btnEnter) btnEnter.hidden = true;
    if (btnSpectate) {
      btnSpectate.hidden = match.status !== "playing";
    }
    return;
  }
  if (btnSpectate) btnSpectate.hidden = true;
  if (btnReady) {
    btnReady.hidden = !inRoom || match.status === "playing" || match.status === "ended";
    var ready = isHost ? match.hostDeckReady : match.guestDeckReady;
    btnReady.textContent = ready ? "デッキ準備済み" : "このデッキで準備完了";
    btnReady.disabled = !!ready;
  }
  if (btnStart) {
    btnStart.hidden = !inRoom || !isHost || match.status !== "lobby";
    btnStart.disabled = !(match.hostDeckReady && match.guestDeckReady && match.guestUid);
  }
  if (btnRejoin) {
    btnRejoin.hidden = !inRoom || match.status !== "playing";
  }
  if (btnEnter) {
    btnEnter.hidden = !inRoom || match.status !== "playing";
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
  if (myRole === "spectator") {
    var specN = Array.isArray(match.spectatorUids) ? match.spectatorUids.length : 0;
    setLobbyStatus(
      "観戦モード · ルーム " +
        match.roomCode +
        "（プレイヤー: " +
        (match.hostName || "ホスト") +
        " / " +
        (match.guestName || "ゲスト未参加") +
        " · 観戦者 " +
        specN +
        " 人）",
    );
    updateVersusLobbyButtons(match, myRole);
    return;
  }
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
  else if (match.status === "lobby") status += " · ホストが「対戦開始」を押すまで待機";
  else if (match.status === "playing") {
    status += " · 対戦中（成功ライブ あなた " + mySl + " / 相手 " + oppSl + "）";
  } else if (match.status === "ended") {
    if (match.winnerRole === myRole) status += " · あなたの勝ち";
    else if (match.winnerRole) status += " · あなたの負け";
    else status += " · 引き分け";
  }
  setLobbyStatus(status);
  updateVersusLobbyButtons(match, myRole);
}

function watchRoom(roomCode) {
  stopSubscription();
  activeRoomCode = roomCode;
  rememberVersusRoomCode(roomCode);
  activeUnsub = subscribeVersusMatch(roomCode, function (match) {
    scheduleRenderLobbyMatch(match);
  });
}

function startLocalVersus() {
  var deck = getCurrentDeckMap && getCurrentDeckMap();
  if (!deckHasCards(deck)) {
    showToast("メインデッキにカードを入れてください");
    return;
  }
  var v60 = validateVersusMainDeck(deck || {});
  if (!v60.ok) {
    showToast(v60.message || "公式戦ではメインデッキ60枚が必要です（練習はこのまま開始できます）", {
      duration: 5000,
    });
  }
  if (typeof onEnterVersusPlay !== "function") return;
  onEnterVersusPlay({
    mode: "local",
    sessionKey: "local",
    deckMap: v60.ok ? v60.map : deck,
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
  window.__llocgStartLocalVersus = function () {
    startLocalVersus();
  };
  window.__llocgOpenVersusLobby = openVersusLobbyDialog;

  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  var btnOpen = el("btn-start-versus");
  var btnClose = el("dlg-versus-lobby-close");
  var btnLocal = el("dlg-versus-start-local");
  var btnCreate = el("dlg-versus-create");
  var btnJoin = el("dlg-versus-join");
  var btnReady = el("dlg-versus-ready");
  var btnStart = el("dlg-versus-start");
  var btnEnter = el("dlg-versus-enter-play");
  var btnRejoin = el("dlg-versus-rejoin-room");
  var btnLeave = el("dlg-versus-leave");

  function refreshVersusButton() {
    if (!btnOpen) return;
    btnOpen.disabled = false;
    var u = getEffectiveCloudUser();
    btnOpen.title = u
      ? "簡易対戦（" + (u.displayName || u.email || "Google") + " としてプレイ）"
      : "簡易対戦（Firestore 不要）— 相手の成功ライブ枚数を手入力";
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

  btnLocal?.addEventListener("click", function () {
    startLocalVersus();
  });

  btnCreate?.addEventListener("click", async function () {
    var u = getCurrentCloudUser() || getEffectiveCloudUser();
    if (!u) {
      showToast("オンラインルームには Google ログインが必要です");
      signInWithGoogle();
      return;
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
      showToast("オンラインルームには Google ログインが必要です");
      signInWithGoogle();
      return;
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
      if (joined.joinedAs === "spectator") {
        showToast("ルーム " + joined.roomCode + " を観戦者として参加しました");
      } else {
        showToast("ルーム " + joined.roomCode + " に参加しました");
      }
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
      showToast("対戦を開始しました（先攻は無作為）");
    } catch (err) {
      showToast(String(err.message || err));
    }
  });

  function enterVersusPlayFromLobby() {
    if (!lastLobbyMatch || lastLobbyMatch.status !== "playing") return;
    var u = getCurrentCloudUser() || getEffectiveCloudUser();
    if (!u || !u.uid || typeof onEnterVersusPlay !== "function") return;
    var myRole = versusRoleForUid(lastLobbyMatch, u.uid);
    if (!myRole) return;
    if (!versusMatchHasOpponent(lastLobbyMatch)) {
      showToast("相手の参加を待っています");
      return;
    }
    var payload = buildVersusOnlineEnterPayload(lastLobbyMatch, myRole);
    if (!deckHasCards(payload.deckMap)) {
      showToast("デッキを準備してからプレイ画面へ進んでください");
      return;
    }
    persistVersusOnlineSession(lastLobbyMatch.roomCode, myRole, true);
    onEnterVersusPlay(payload);
    dlg?.close();
  }

  btnEnter?.addEventListener("click", enterVersusPlayFromLobby);
  btnRejoin?.addEventListener("click", enterVersusPlayFromLobby);

  function enterSpectatorViewFromLobby() {
    if (!lastLobbyMatch || lastLobbyMatch.status !== "playing") {
      showToast("対戦が開始されると観戦できます");
      return;
    }
    var u = getCurrentCloudUser() || getEffectiveCloudUser();
    if (!u || !u.uid || typeof onEnterVersusPlay !== "function") return;
    var myRole = versusRoleForUid(lastLobbyMatch, u.uid);
    if (myRole !== "spectator") return;
    clearPlayResumeStorage();
    persistVersusOnlineSession(lastLobbyMatch.roomCode, "spectator", true);
    onEnterVersusPlay(buildVersusOnlineEnterPayload(lastLobbyMatch, "spectator"));
    dlg?.close();
  }

  el("dlg-versus-spectate")?.addEventListener("click", enterSpectatorViewFromLobby);

  btnLeave?.addEventListener("click", async function () {
    var u = getCurrentCloudUser();
    if (activeRoomCode && u) await leaveVersusRoom(activeRoomCode, u.uid);
    stopSubscription();
    activeRoomCode = null;
    clearVersusOnlineSession();
    clearPlayResumeStorage();
    if (typeof window.__llocgResetPlayFromVersusLeave === "function") {
      window.__llocgResetPlayFromVersusLeave();
    }
    setLobbyStatus("ルームから退出しました。");
    updateVersusLobbyButtons(null, null);
    showToast("ルームから退出しました");
  });
}

export function teardownVersusModeSession(opts) {
  stopSubscription();
  var skipLeave = opts && opts.skipLeaveRoom === true;
  var u = getCurrentCloudUser() || getEffectiveCloudUser();
  if (!skipLeave && activeRoomCode && u) {
    leaveVersusRoom(activeRoomCode, u.uid);
    clearVersusOnlineSession();
  } else if (!skipLeave) {
    clearVersusOnlineSession();
  }
  clearPlayResumeStorage();
  if (!skipLeave && typeof window.__llocgResetPlayFromVersusLeave === "function") {
    window.__llocgResetPlayFromVersusLeave();
  }
  activeRoomCode = null;
  delete window.__llocgVersusAutoEnterPending;
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
        const last = getRememberedVersusRoomCode();
        if (last) markVersusPendingLobbyRoom(last);
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
        clearVersusOnlineSession();
        return false;
      }
      const myRole = versusRoleForUid(match, u.uid);
      if (!myRole) {
        clearVersusOnlineSession();
        return false;
      }
      activeRoomCode = match.roomCode;
      rememberVersusRoomCode(match.roomCode);
      persistVersusOnlineSession(match.roomCode, myRole, !!saved.inPlay);

      watchRoom(match.roomCode);
      if (match.status === "playing" && saved.inPlay && typeof onEnterPlay === "function") {
        if (myRole === "spectator") {
          persistVersusOnlineSession(match.roomCode, "spectator", true);
          onEnterPlay(buildVersusOnlineEnterPayload(match, "spectator"));
          return true;
        }
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
