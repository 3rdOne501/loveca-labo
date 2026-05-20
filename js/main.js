import { loadCardDatabase, prefetchDeckCardImagesFromMap, getCard } from "./cards.js";
import {
  STORAGE_PLAY_RESUME,
  STORAGE_BUILDER_UI_RESTORE_FLAG,
  STORAGE_VERSUS_ONLINE_SESSION,
  APP_MODULE_CACHE_BUST,
} from "./config.js";
import {
  initVersusMode,
  teardownVersusModeSession,
  tryRestoreVersusOnlineSession,
  persistVersusOnlineSession,
  clearVersusOnlineSession,
  pauseVersusOnlineToLobby,
  getRememberedVersusRoomCode,
} from "./versusMode.js";
import { normalizeDeckMapCounts } from "./deckLibrary.js";
import { initDeckBuilder, loadDeckBundleFromStorage } from "./deckbuilder.js";
import { initPublishedSampleRecipes } from "./sampleDeckRecipes.js";
import { prefetchGameStatusArtBundledEarly } from "./gameStatusIcons.js";
import { showToast } from "./ui.js";

/** プレイ画面（約1.5万行）— 起動時に読み込まない（デッキ画面だけで固まるのを防ぐ） */
/** @type {Promise<typeof import('./simulator.js')>|null} */
let simulatorModulePromise = null;
function loadSimulatorModule() {
  if (!simulatorModulePromise) {
    simulatorModulePromise = import("./simulator.js");
  }
  return simulatorModulePromise;
}
function teardownDeckPileLayoutWatchers() {
  if (simulatorModulePromise) {
    simulatorModulePromise
      .then(function (m) {
        m.teardownDeckPileLayoutWatchers();
      })
      .catch(function () {
        /* noop */
      });
  }
}
import {
  initCloudAuthIfConfigured,
  isCloudSyncAvailable,
  onCloudUserChange,
  getCurrentCloudUser,
  getEffectiveCloudUser,
  ensureGoogleSession,
  isCloudAuthEnvironmentSupported,
  signInWithGoogle,
  signOutCloud,
} from "./cloudAuth.js";
import { getPlayerDisplayName, setPlayerDisplayName } from "./playerProfile.js";

/** 強制リロード用の一時クエリをアドレスバーから外す（ブックマーク汚染防止） */
function stripHardReloadQueryFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("_reload")) return;
    u.searchParams.delete("_reload");
    const q = u.searchParams.toString();
    history.replaceState({}, "", u.pathname + (q ? "?" + q : "") + u.hash);
  } catch (_) {
    /* noop */
  }
}
stripHardReloadQueryFromUrl();

/** 狭い画面で UI が収まるよう控えめに縮小（ブラウザのページズームそのものは変更しない） */
function applyPageAutoScale() {
  try {
    var w = window.innerWidth;
    var s = 1;
    if (w < 360) s = 0.86;
    else if (w < 420) s = 0.9;
    else if (w < 520) s = 0.94;
    else if (w < 720) s = 0.97;
    document.documentElement.style.setProperty("--ll-page-scale", String(s));
    document.body.classList.toggle("ll-page-auto-scaled", s < 0.999);
  } catch (_) {
    /* noop */
  }
}
applyPageAutoScale();
window.addEventListener("resize", applyPageAutoScale);

try {
  var buildMeta = document.querySelector('meta[name="loveca-build"]');
  var buildTag = buildMeta && buildMeta.content ? String(buildMeta.content).trim() : "";
  if (buildTag && APP_MODULE_CACHE_BUST && buildTag !== APP_MODULE_CACHE_BUST) {
    var uMismatch = new URL(window.location.href);
    var reloadKey = "llocg_build_reload_" + APP_MODULE_CACHE_BUST;
    var reloadAlreadyTried = false;
    try {
      reloadAlreadyTried = sessionStorage.getItem(reloadKey) === "1";
    } catch (_) {
      /* noop */
    }
    if (!reloadAlreadyTried && !uMismatch.searchParams.has("_reload")) {
      try {
        sessionStorage.setItem(reloadKey, "1");
      } catch (_) {
        /* noop */
      }
      uMismatch.searchParams.set("_reload", String(Date.now()));
      window.location.replace(uMismatch.toString());
    } else if (reloadAlreadyTried) {
      console.warn(
        "[Loveca Labo] index.html loveca-build (" +
          buildTag +
          ") !== APP_MODULE_CACHE_BUST (" +
          APP_MODULE_CACHE_BUST +
          "); update the meta tag to stop cache mismatch",
      );
    }
  }
  console.info("[Loveca Labo] build=" + (buildTag || APP_MODULE_CACHE_BUST || "?"));
} catch (_) {
  /* noop */
}

let appStarted = false;
let versusModeReady = false;
/** @type {string|null} */
let activeVersusRoomMounted = null;
/** @type {HTMLElement|null} */
let viewDeckRef = null;
/** @type {HTMLElement|null} */
let viewGameRef = null;

function resetPlayFromVersusLeave() {
  activeVersusRoomMounted = null;
  try {
    delete window.__llocgVersusPlayMounted;
  } catch (_) {
    /* noop */
  }
  clearPlayResumeStorage();
  teardownDeckPileLayoutWatchers();
  if (viewGameRef) viewGameRef.hidden = true;
  if (viewDeckRef) viewDeckRef.hidden = false;
  document.body.classList.remove(
    "play-mode",
    "play-versus-mode",
    "play-spectator-mode",
    "live-turn-pick-mode",
    "live-stats-after-begin",
    "zone-hints-visible",
    "versus-my-turn",
    "versus-opponent-turn",
    "versus-live-phase",
    "llocg-effect-dialog-peek",
  );
  try {
    if (typeof window.__llocgRestoreDeckBuilderUi === "function") {
      window.__llocgRestoreDeckBuilderUi({ reopenCatalog: true });
    }
  } catch (_) {
    /* noop */
  }
}

window.__llocgResetPlayFromVersusLeave = resetPlayFromVersusLeave;

function clearPlayResumeStorage() {
  try {
    sessionStorage.removeItem(STORAGE_PLAY_RESUME);
  } catch (_) {
    /* noop */
  }
}

/** 起動時の自動復元でメインスレッドが塞がるのを防ぐ（対戦ルーム文脈では盤面スナップショットを捨てる） */
function sanitizeBootSessionStorage() {
  try {
    var versusRoom =
      getRememberedVersusRoomCode() ||
      (typeof window !== "undefined" && window.__llocgVersusPendingLobbyRoom
        ? String(window.__llocgVersusPendingLobbyRoom)
        : "");
    if (versusRoom) {
      clearPlayResumeStorage();
      var rawVs = sessionStorage.getItem(STORAGE_VERSUS_ONLINE_SESSION);
      if (rawVs) {
        var vs = JSON.parse(rawVs);
        if (vs && vs.v === 1 && vs.roomCode && vs.inPlay) {
          vs.inPlay = false;
          vs.savedAt = Date.now();
          sessionStorage.setItem(STORAGE_VERSUS_ONLINE_SESSION, JSON.stringify(vs));
        }
      }
    }
    var rawPr = sessionStorage.getItem(STORAGE_PLAY_RESUME);
    if (rawPr && rawPr.length > 400000) {
      clearPlayResumeStorage();
    }
  } catch (_) {
    /* noop */
  }
}

/**
 * 直前のプレイ盤面がセッションにあればプレイ画面へ復帰する。
 * @returns {boolean} 復元を開始したか
 */
function tryResumePlaySession(viewDeck, viewGame) {
  try {
    const raw = sessionStorage.getItem(STORAGE_PLAY_RESUME);
    if (!raw) return false;
    if (raw.length > 600000) {
      clearPlayResumeStorage();
      return false;
    }
    const pr = JSON.parse(raw);
    if (
      !pr ||
      pr.v !== 1 ||
      !pr.board ||
      typeof pr.board !== "object" ||
      !pr.board.deckMeta ||
      typeof pr.board.deckMeta !== "object" ||
      !pr.board.deckMeta.activePlayDeckMap ||
      typeof pr.board.deckMeta.activePlayDeckMap !== "object"
    ) {
      return false;
    }
    const deckMap = normalizeDeckMapCounts(pr.board.deckMeta.activePlayDeckMap);
    const dm = pr.board.deckMeta;
    viewDeck.hidden = true;
    viewGame.hidden = false;
    document.body.classList.add("play-mode");
    requestAnimationFrame(function () {
      setTimeout(function () {
        loadSimulatorModule()
          .then(function (sim) {
            sim.mountSimulator(viewGame, deckMap, {
              onBackToDeck() {
                teardownDeckPileLayoutWatchers();
                clearPlayResumeStorage();
                viewGame.hidden = true;
                viewDeck.hidden = false;
                document.body.classList.remove("play-mode");
                document.body.classList.remove("live-turn-pick-mode");
                document.body.classList.remove("zone-hints-visible");
                try {
                  if (typeof window.__llocgRestoreDeckBuilderUi === "function") {
                    window.__llocgRestoreDeckBuilderUi({ reopenCatalog: true });
                  }
                } catch (_) {
                  /* noop */
                }
              },
              deckRoleLabels: {
                keyCardNos: Array.isArray(dm.keyCardNos) ? dm.keyCardNos : [],
                keyCard2Nos: Array.isArray(dm.keyCard2Nos) ? dm.keyCard2Nos : [],
                keyCard3Nos: Array.isArray(dm.keyCard3Nos) ? dm.keyCard3Nos : [],
                middleCardNos: Array.isArray(dm.middleCardNos) ? dm.middleCardNos : [],
              },
              resumeFromStorage: true,
            });
          })
          .catch(function (err) {
            console.error(err);
            teardownDeckPileLayoutWatchers();
            clearPlayResumeStorage();
            document.body.classList.remove("play-mode");
            viewGame.hidden = true;
            viewDeck.hidden = false;
            showToast("前回の盤面の復元に失敗しました。デッキ画面からやり直してください。");
          });
      }, 0);
    });
    return true;
  } catch (_) {
    return false;
  }
}

function hideBootToolbar() {
  const b = document.getElementById("boot-toolbar");
  if (b) b.hidden = true;
}

function showBootToolbar(msg) {
  const b = document.getElementById("boot-toolbar");
  if (b) b.hidden = false;
  const st = document.getElementById("load-status");
  if (st && msg) st.textContent = msg;
}

function showAppBootLoading() {
  const ov = document.getElementById("app-boot-overlay");
  if (ov) {
    ov.hidden = false;
    ov.setAttribute("aria-busy", "true");
  }
  const line = document.getElementById("app-boot-message");
  if (line) line.textContent = "カードデータベースを読み込んでいます・・・";
  document.body.classList.add("app-boot-loading");
}

function hideAppBootLoading() {
  const ov = document.getElementById("app-boot-overlay");
  if (ov) {
    ov.hidden = true;
    ov.removeAttribute("aria-busy");
  }
  const det = document.getElementById("app-boot-detail");
  if (det) det.textContent = "";
  document.body.classList.remove("app-boot-loading");
}

function enterVersusPlay(viewDeck, viewGame, payload) {
  const deckMap = normalizeDeckMapCounts(payload.deckMap || {});
  const spectatorMode = payload.spectatorMode === true || payload.myRole === "spectator";
  if (!spectatorMode && (!deckMap || !Object.keys(deckMap).length)) {
    showToast("対戦用デッキを読み込めませんでした");
    return;
  }
  var sessionKey = payload.sessionKey || payload.roomCode || "local";
  if (activeVersusRoomMounted === sessionKey && !viewGame.hidden) return;
  activeVersusRoomMounted = sessionKey;
  try {
    prefetchDeckCardImagesFromMap(deckMap, getCard);
  } catch (_) {
    /* noop */
  }
  const bundle = loadDeckBundleFromStorage();
  if (payload.mode === "online") {
    persistVersusOnlineSession(payload.roomCode, payload.myRole, true);
    if (!payload.resumeFromStorage) clearPlayResumeStorage();
  } else {
    clearVersusOnlineSession();
    clearPlayResumeStorage();
  }
  const dlg = document.getElementById("dlg-versus-lobby");
  if (dlg && typeof dlg.close === "function") {
    try {
      dlg.close();
    } catch (_) {
      /* noop */
    }
  }
  viewDeck.hidden = true;
  viewGame.hidden = false;
  document.body.classList.add("play-mode");
  requestAnimationFrame(function () {
    setTimeout(function () {
      loadSimulatorModule()
        .then(function (sim) {
          sim.mountSimulator(viewGame, deckMap, {
            versusMatch:
              payload.mode === "local"
                ? { mode: "local" }
                : {
                    mode: "online",
                    roomCode: payload.roomCode,
                    myRole: payload.myRole,
                    match: payload.match,
                    spectatorMode: spectatorMode,
                  },
            resumeFromStorage: !!payload.resumeFromStorage,
            onBackToDeck(opts) {
              teardownDeckPileLayoutWatchers();
              var wasOnlineVersus =
                payload.mode === "online" &&
                payload.roomCode &&
                payload.myRole &&
                payload.myRole !== "spectator";
              if (opts && opts.leaveRoom === true) {
                teardownVersusModeSession();
                clearVersusOnlineSession();
                resetPlayFromVersusLeave();
                return;
              }
              if (wasOnlineVersus && !(opts && opts.leaveRoom === true)) {
                try {
                  if (typeof window.__llocgFlushVersusPlayPersist === "function") {
                    window.__llocgFlushVersusPlayPersist();
                  }
                } catch (_) {
                  /* noop */
                }
                persistVersusOnlineSession(payload.roomCode, payload.myRole, false);
                pauseVersusOnlineToLobby();
                teardownVersusModeSession({ skipLeaveRoom: true });
              } else {
                teardownVersusModeSession();
                clearVersusOnlineSession();
              }
              activeVersusRoomMounted = null;
              delete window.__llocgVersusPlayMounted;
              clearPlayResumeStorage();
              viewGame.hidden = true;
              viewDeck.hidden = false;
              document.body.classList.remove("play-mode");
              document.body.classList.remove("play-versus-mode");
              document.body.classList.remove("live-turn-pick-mode");
              document.body.classList.remove("zone-hints-visible");
              try {
                if (typeof window.__llocgRestoreDeckBuilderUi === "function") {
                  window.__llocgRestoreDeckBuilderUi({ reopenCatalog: true });
                }
              } catch (_) {
                /* noop */
              }
            },
            deckRoleLabels: {
              keyCardNos: bundle.keyCardNos,
              keyCard2Nos: bundle.keyCard2Nos,
              keyCard3Nos: bundle.keyCard3Nos,
              middleCardNos: bundle.middleCardNos,
            },
          });
          window.__llocgVersusPlayMounted = sessionKey;
          showToast(
            payload.mode === "local"
              ? "簡易対戦: 相手の成功ライブ枚数は画面上の＋／−で入力してください"
              : "オンライン対戦: 成功ライブ枚数は自動同期されます",
          );
        })
        .catch(function (err) {
          console.error(err);
          activeVersusRoomMounted = null;
          teardownDeckPileLayoutWatchers();
          document.body.classList.remove("play-mode");
          document.body.classList.remove("play-versus-mode");
          viewGame.hidden = true;
          viewDeck.hidden = false;
          var errMsg = err && err.message ? String(err.message) : String(err || "");
          showToast(
            errMsg
              ? "対戦プレイ画面の初期化に失敗しました: " + errMsg
              : "対戦プレイ画面の初期化に失敗しました",
            { duration: 10000 },
          );
        });
    }, 0);
  });
}

function startApp(viewDeck, viewGame, statusEl) {
  viewDeckRef = viewDeck;
  viewGameRef = viewGame;
  if (statusEl) statusEl.textContent = "";
  hideAppBootLoading();
  hideBootToolbar();
  if (!appStarted) {
    appStarted = true;
    try {
      prefetchGameStatusArtBundledEarly();
    } catch (_) {
      /* noop */
    }
    initDeckBuilder(viewDeck, {
      onStartGame: (deckMap) => {
        try {
          prefetchDeckCardImagesFromMap(deckMap || {}, getCard);
        } catch (_) {
          /* noop */
        }
        const bundle = loadDeckBundleFromStorage();
        clearPlayResumeStorage();
        viewDeck.hidden = true;
        viewGame.hidden = false;
        document.body.classList.add("play-mode");
        requestAnimationFrame(function () {
          setTimeout(function () {
            loadSimulatorModule()
              .then(function (sim) {
                sim.mountSimulator(viewGame, deckMap, {
                  onBackToDeck() {
                    teardownDeckPileLayoutWatchers();
                    clearPlayResumeStorage();
                    viewGame.hidden = true;
                    viewDeck.hidden = false;
                    document.body.classList.remove("play-mode");
                    document.body.classList.remove("live-turn-pick-mode");
                    document.body.classList.remove("zone-hints-visible");
                    try {
                      if (typeof window.__llocgRestoreDeckBuilderUi === "function") {
                        window.__llocgRestoreDeckBuilderUi({ reopenCatalog: true });
                      }
                    } catch (_) {
                      /* noop */
                    }
                  },
                  deckRoleLabels: {
                    keyCardNos: bundle.keyCardNos,
                    keyCard2Nos: bundle.keyCard2Nos,
                    keyCard3Nos: bundle.keyCard3Nos,
                    middleCardNos: bundle.middleCardNos,
                  },
                });
              })
              .catch(function (err) {
                console.error(err);
                teardownDeckPileLayoutWatchers();
                document.body.classList.remove("play-mode");
                document.body.classList.remove("live-turn-pick-mode");
                document.body.classList.remove("zone-hints-visible");
                viewGame.hidden = true;
                viewDeck.hidden = false;
                showToast("プレイ画面の初期化に失敗しました。ページを再読み込みしてお試しください。");
              });
          }, 0);
        });
      },
    });
    resumeSessionsAfterBoot(viewDeck, viewGame);
  } else {
    location.reload();
  }
}

function resumeSessionsAfterBoot(viewDeck, viewGame) {
  sanitizeBootSessionStorage();
  window.setTimeout(function () {
    tryRestoreVersusOnlineSession(function () {
      /* 起動時はプレイ画面へ入れない（ユーザーがロビー／プレイへ進む） */
    })
      .then(function () {
        try {
          var pending =
            typeof window !== "undefined" && window.__llocgVersusPendingLobbyRoom
              ? String(window.__llocgVersusPendingLobbyRoom)
              : "";
          if (pending) {
            showToast(
              "ルーム " +
                pending +
                " の続きがあります。「簡易対戦」→ ロビーで「ルームに入室」を押してください。",
              { duration: 8000 },
            );
          }
        } catch (_) {
          /* noop */
        }
        window.__llocgVersusBootRestoreDone = true;
      })
      .catch(function () {
        window.__llocgVersusBootRestoreDone = true;
      });
  }, 0);
}

/** オンライン対戦の復帰待ちがあるときはソロ用 STORAGE_PLAY_RESUME で上書きしない */
function readVersusOnlineSessionForResumeGate() {
  try {
    var raw = sessionStorage.getItem(STORAGE_VERSUS_ONLINE_SESSION);
    if (!raw) return false;
    var s = JSON.parse(raw);
    if (s && s.v === 1 && s.roomCode && s.inPlay === true) return true;
  } catch (_) {
    /* noop */
  }
  try {
    if (typeof window !== "undefined" && window.__llocgVersusPendingLobbyRoom) return true;
  } catch (_) {
    /* noop */
  }
  return !!getRememberedVersusRoomCode();
}

function tryLoadDatabase(viewDeck, viewGame, statusEl) {
  showAppBootLoading();
  Promise.all([
    loadCardDatabase(statusEl),
    initPublishedSampleRecipes().catch(function (e) {
      console.warn("[ll-ocg-tools] sample recipes init failed:", e);
    }),
  ])
    .then(() => {
      try {
        const b = loadDeckBundleFromStorage();
        prefetchDeckCardImagesFromMap(b.map || {}, getCard);
      } catch (_) {
        /* noop */
      }
      try {
        startApp(viewDeck, viewGame, statusEl);
      } catch (err) {
        console.error(err);
        hideAppBootLoading();
        showBootToolbar("初期化に失敗しました。再読込または再試行してください。");
      }
    })
    .catch((e) => {
      const msg = String(e.message || e);
      hideAppBootLoading();
      if (statusEl) statusEl.textContent = msg;
      showBootToolbar(msg);
    });
}

document.addEventListener("keydown", function (ev) {
  const t = ev.target;
  const inField =
    t &&
    ((t.closest && t.closest("input")) ||
      (t.closest && t.closest("textarea")) ||
      (t.closest && t.closest("select")));

  if (ev.key === "Escape") {
    const open = document.querySelector("dialog[open]");
    if (open) {
      ev.preventDefault();
      open.close();
    }
    return;
  }

  /* デッキ編集画面: / で検索フォーカス */
  if (
    !document.body.classList.contains("play-mode") &&
    !inField &&
    (ev.key === "/" || ev.key === "／")
  ) {
    ev.preventDefault();
    document.getElementById("search-text")?.focus();
    return;
  }

  if (!document.body.classList.contains("play-mode")) return;
  if (inField) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

  if (ev.key === "u" || ev.key === "U") {
    ev.preventDefault();
    document.getElementById("btn-undo")?.click();
    return;
  }
  if (ev.key === "r" || ev.key === "R") {
    ev.preventDefault();
    document.getElementById("btn-redo")?.click();
    return;
  }
  if (ev.key === "?" || (ev.shiftKey && ev.key === "/")) {
    ev.preventDefault();
    const d = document.getElementById("dlg-help");
    if (d && typeof d.showModal === "function") d.showModal();
  }
});

const status = document.getElementById("load-status");
const viewDeck = document.getElementById("view-deck");
const viewGame = document.getElementById("view-game");

document.getElementById("boot-retry")?.addEventListener("click", () => {
  tryLoadDatabase(viewDeck, viewGame, status);
});

function wirePageReloadButtons() {
  if (typeof window !== "undefined" && window.__llocgPageReloadDelegated === "1") return;
  if (typeof window !== "undefined") window.__llocgPageReloadDelegated = "1";

  const doHardReload = (ev) => {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    const u = new URL(window.location.href);
    u.searchParams.set("_reload", String(Date.now()));
    window.location.replace(u.toString());
  };

  // プレイ画面初期化で DOM が差し替わると直接バインドが死ぬため document に委譲する
  document.addEventListener(
    "click",
    function (ev) {
      const t = ev.target;
      const el = t instanceof Element ? t : t && /** @type {Node} */ (t).parentElement;
      if (!el || typeof el.closest !== "function") return;
      const hit = el.closest("#btn-reload-builder, #btn-reload-play");
      if (!hit) return;
      if (hit.id === "btn-reload-builder") {
        try {
          if (typeof window.__llocgPersistDeckBuilderUi === "function") {
            window.__llocgPersistDeckBuilderUi();
          }
          sessionStorage.setItem(STORAGE_BUILDER_UI_RESTORE_FLAG, "1");
        } catch (_) {
          /* noop */
        }
      }
      if (hit.id === "btn-reload-play" && document.body.classList.contains("play-versus-mode")) {
        try {
          if (typeof window.__llocgFlushVersusPlayPersist === "function") {
            window.__llocgFlushVersusPlayPersist();
          }
        } catch (_) {
          /* noop */
        }
      }
      doHardReload(ev);
    },
    { capture: true },
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wirePageReloadButtons);
} else {
  wirePageReloadButtons();
}

function initVersusModeEarly() {
  if (versusModeReady) return;
  versusModeReady = true;
  try {
    initVersusMode({
      onEnterVersusPlay: function (payload) {
        if (!appStarted) {
          showToast("カードデータの読み込み完了後に対戦を開始してください（あと数秒）", {
            duration: 5000,
          });
          return;
        }
        enterVersusPlay(viewDeck, viewGame, payload);
      },
      getCurrentDeckMap: function () {
        return loadDeckBundleFromStorage().map;
      },
    });
  } catch (err) {
    console.error("[versus] initVersusMode failed:", err);
    versusModeReady = false;
  }
}

function wireCloudAuthBar() {
  const bar = document.getElementById("cloud-auth-bar");
  const statusEl = document.getElementById("cloud-auth-status");
  const avatarEl = /** @type {HTMLImageElement|null} */ (
    document.getElementById("cloud-auth-avatar")
  );
  const signInBtn = document.getElementById("cloud-auth-signin");
  const signOutBtn = document.getElementById("cloud-auth-signout");
  const playerNameWrap = document.getElementById("player-display-name-wrap");
  const playerNameInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("input-player-display-name")
  );
  if (!bar || !signInBtn || !signOutBtn) return;
  if (playerNameInput && playerNameInput.dataset.wiredDisplayName !== "1") {
    playerNameInput.dataset.wiredDisplayName = "1";
    playerNameInput.value = getPlayerDisplayName();
    playerNameInput.addEventListener("change", function () {
      setPlayerDisplayName(playerNameInput.value);
    });
    playerNameInput.addEventListener("blur", function () {
      setPlayerDisplayName(playerNameInput.value);
    });
  }
  signInBtn.addEventListener("click", () => {
    signInWithGoogle();
  });
  signOutBtn.addEventListener("click", () => {
    signOutCloud();
  });

  /* Firebase 初期化前に直近ログインのキャッシュがあれば、ログインバーを即時表示して
     仮にログイン中の名前を出す。初期化後に onCloudUserChange で正式な値で上書きされる。 */
  bar.hidden = false;

  function paintAuthBar(user) {
    const effective = user || getEffectiveCloudUser();
    if (!isCloudSyncAvailable() && !effective) {
      if (statusEl) statusEl.textContent = "未ログイン";
      signInBtn.hidden = false;
      signOutBtn.hidden = true;
      if (!isCloudAuthEnvironmentSupported()) {
        signInBtn.title = "オフラインアプリではポップアップで Google ログインします";
      } else {
        signInBtn.title = "Google でログイン";
      }
      return;
    }
    bar.hidden = false;
    if (effective) {
      if (playerNameWrap) playerNameWrap.hidden = false;
      if (playerNameInput && document.activeElement !== playerNameInput) {
        var savedName = getPlayerDisplayName();
        if (savedName) playerNameInput.value = savedName;
      }
      if (statusEl) {
        var label = effective.displayName || effective.email || "ログイン中";
        statusEl.textContent = user ? label : label + "（復元中）";
      }
      if (avatarEl) {
        if (effective.photoURL) {
          avatarEl.src = effective.photoURL;
          avatarEl.hidden = false;
        } else {
          avatarEl.removeAttribute("src");
          avatarEl.hidden = true;
        }
      }
      signInBtn.hidden = true;
      signOutBtn.hidden = false;
    } else {
      if (playerNameWrap) playerNameWrap.hidden = true;
      if (statusEl) statusEl.textContent = "未ログイン";
      if (avatarEl) {
        avatarEl.removeAttribute("src");
        avatarEl.hidden = true;
      }
      signInBtn.hidden = false;
      signOutBtn.hidden = true;
    }
  }

  paintAuthBar(getEffectiveCloudUser());

  initCloudAuthIfConfigured()
    .then((ok) => {
      if (!ok) return;
      bar.hidden = false;
      return ensureGoogleSession();
    })
    .then(function () {
      paintAuthBar(getCurrentCloudUser());
    })
    .catch((err) => {
      console.warn("[main] cloudAuth init failed:", err);
    });

  onCloudUserChange((user) => {
    paintAuthBar(user);
  });
}

function wireAppDialogBackdropClicks() {
  document.querySelectorAll("dialog.app-dialog").forEach(function (dlg) {
    if (dlg.dataset.backdropWired === "1") return;
    dlg.dataset.backdropWired = "1";
    dlg.addEventListener("click", function (ev) {
      if (ev.target !== dlg) return;
      if (document.body.classList.contains("play-mode")) {
        if (dlg.id === "dlg-versus-lobby") {
          try {
            dlg.close();
          } catch (_) {
            /* noop */
          }
          return;
        }
        if (typeof window.__llocgPeekBoardFromDialog === "function") {
          window.__llocgPeekBoardFromDialog(dlg);
          return;
        }
      }
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    wireCloudAuthBar();
    wireAppDialogBackdropClicks();
  });
} else {
  wireCloudAuthBar();
  wireAppDialogBackdropClicks();
}

initVersusModeEarly();

window.addEventListener("pagehide", function () {
  if (!document.body.classList.contains("play-versus-mode")) return;
  try {
    if (typeof window.__llocgFlushVersusPlayPersist === "function") {
      window.__llocgFlushVersusPlayPersist();
    }
  } catch (_) {
    /* noop */
  }
  teardownVersusModeSession({ skipLeaveRoom: true });
});

tryLoadDatabase(viewDeck, viewGame, status);
