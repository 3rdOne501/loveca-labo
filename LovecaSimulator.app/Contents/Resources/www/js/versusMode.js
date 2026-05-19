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
  createVersusRoom,
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

function el(id) {
  return document.getElementById(id);
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
  var online = isVersusMatchAvailable() && !!getCurrentCloudUser();
  if (wrap) wrap.hidden = !isCloudSyncAvailable();
  if (hint) {
    hint.textContent = online
      ? "Google ログイン済み — ルームで成功ライブ枚数を自動同期できます。"
      : isCloudSyncAvailable()
        ? "オンラインルームを使うには Google でログインしてください。"
        : "オンラインルームを使うには Firebase 設定（firebaseConfig.js）が必要です。";
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
  var u = getCurrentCloudUser();
  var isHost = myRole === "host";
  var inRoom = !!(match && myRole && u);
  if (btnCreate) btnCreate.hidden = inRoom;
  if (btnJoin) btnJoin.hidden = inRoom;
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
  if (btnEnter) {
    btnEnter.hidden = !inRoom || match.status !== "playing";
  }
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
    setLobbyStatus("このルームの参加者ではありません。");
    updateVersusLobbyButtons(null, null);
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

  if (match.status === "playing" && typeof onEnterVersusPlay === "function") {
    var deckMap =
      myRole === "host"
        ? match.hostDeckMap || (getCurrentDeckMap && getCurrentDeckMap())
        : match.guestDeckMap || (getCurrentDeckMap && getCurrentDeckMap());
    if (deckMap && Object.keys(deckMap).length) {
      window.__llocgVersusAutoEnterPending = {
        mode: "online",
        sessionKey: match.roomCode,
        roomCode: match.roomCode,
        myRole: myRole,
        match: match,
        deckMap: deckMap,
      };
    }
  }
}

function watchRoom(roomCode) {
  stopSubscription();
  activeRoomCode = roomCode;
  activeUnsub = subscribeVersusMatch(roomCode, function (match) {
    renderLobbyMatch(match);
    if (match && match.status === "playing" && window.__llocgVersusAutoEnterPending) {
      var pending = window.__llocgVersusAutoEnterPending;
      delete window.__llocgVersusAutoEnterPending;
      if (typeof onEnterVersusPlay === "function") onEnterVersusPlay(pending);
    }
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

  var dlg = /** @type {HTMLDialogElement|null} */ (el("dlg-versus-lobby"));
  var btnOpen = el("btn-start-versus");
  var btnClose = el("dlg-versus-lobby-close");
  var btnLocal = el("dlg-versus-start-local");
  var btnCreate = el("dlg-versus-create");
  var btnJoin = el("dlg-versus-join");
  var btnReady = el("dlg-versus-ready");
  var btnStart = el("dlg-versus-start");
  var btnEnter = el("dlg-versus-enter-play");
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

  btnOpen?.addEventListener("click", function () {
    if (!dlg || typeof dlg.showModal !== "function") {
      showToast("対戦ダイアログが見つかりません。ページを再読込してください。");
      return;
    }
    var uOpen = getEffectiveCloudUser();
    setLobbyStatus(
      (uOpen
        ? "ログイン: " + (uOpen.displayName || uOpen.email || "Google") + " · "
        : "") +
        "対面・オンラインどちらでも各プレイヤーが自分の端末で盤面を操作。勝敗は成功ライブ3枚（相手2枚以下）。",
    );
    setLobbyRoomCode("");
    updateVersusLobbyButtons(null, null);
    setOnlineSectionVisible();
    dlg.showModal();
  });

  btnClose?.addEventListener("click", function () {
    dlg?.close();
  });

  btnLocal?.addEventListener("click", function () {
    startLocalVersus();
  });

  btnCreate?.addEventListener("click", async function () {
    var u = getCurrentCloudUser();
    if (!u) {
      showToast("オンラインルームには Google ログインが必要です");
      signInWithGoogle();
      return;
    }
    if (!isVersusMatchAvailable()) {
      showToast("Firestore が使えません。firebaseConfig.js を確認してください。");
      return;
    }
    var deck = getCurrentDeckMap && getCurrentDeckMap();
    var v = validateVersusMainDeck(deck || {});
    if (!v.ok) {
      showToast(v.message || "デッキを60枚に整えてください");
      return;
    }
    try {
      var created = await createVersusRoom(v.map);
      showToast("ルームを作成しました: " + created.roomCode);
      watchRoom(created.roomCode);
    } catch (err) {
      showToast(String(err.message || err));
    }
  });

  btnJoin?.addEventListener("click", async function () {
    var u = getCurrentCloudUser();
    if (!u) {
      showToast("オンラインルームには Google ログインが必要です");
      signInWithGoogle();
      return;
    }
    var codeInp = /** @type {HTMLInputElement|null} */ (el("dlg-versus-room-code"));
    var code = codeInp && codeInp.value ? codeInp.value.trim() : "";
    var deck = getCurrentDeckMap && getCurrentDeckMap();
    var v = validateVersusMainDeck(deck || {});
    if (!v.ok) {
      showToast(v.message || "デッキを60枚に整えてください");
      return;
    }
    try {
      var joined = await joinVersusRoom(code, v.map);
      showToast("ルーム " + joined.roomCode + " に参加しました");
      watchRoom(joined.roomCode);
    } catch (err) {
      showToast(String(err.message || err));
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

  btnEnter?.addEventListener("click", function () {
    var pending = window.__llocgVersusAutoEnterPending;
    if (pending && typeof onEnterVersusPlay === "function") {
      delete window.__llocgVersusAutoEnterPending;
      onEnterVersusPlay(pending);
      dlg?.close();
    }
  });

  btnLeave?.addEventListener("click", async function () {
    var u = getCurrentCloudUser();
    if (activeRoomCode && u) await leaveVersusRoom(activeRoomCode, u.uid);
    stopSubscription();
    activeRoomCode = null;
    setLobbyStatus("ルームから退出しました。");
    updateVersusLobbyButtons(null, null);
    showToast("ルームから退出しました");
  });
}

export function teardownVersusModeSession() {
  stopSubscription();
  var u = getCurrentCloudUser();
  if (activeRoomCode && u) leaveVersusRoom(activeRoomCode, u.uid);
  activeRoomCode = null;
  delete window.__llocgVersusAutoEnterPending;
}

export function getActiveVersusRoomCode() {
  return activeRoomCode;
}
