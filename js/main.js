import { loadCardDatabase, prefetchDeckCardImagesFromMap, getCard } from "./cards.js";
import { STORAGE_PLAY_RESUME, STORAGE_BUILDER_UI_RESTORE_FLAG } from "./config.js";
import { normalizeDeckMapCounts } from "./deckLibrary.js";
import { initDeckBuilder, loadDeckBundleFromStorage } from "./deckbuilder.js";
import { initPublishedSampleRecipes } from "./sampleDeckRecipes.js";
import { prefetchGameStatusArtBundledEarly } from "./gameStatusIcons.js";
import { mountSimulator, teardownDeckPileLayoutWatchers } from "./simulator.js";
import { showToast } from "./ui.js";
import {
  initCloudAuthIfConfigured,
  isCloudSyncAvailable,
  onCloudUserChange,
  signInWithGoogle,
  signOutCloud,
} from "./cloudAuth.js";

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

let appStarted = false;

function clearPlayResumeStorage() {
  try {
    sessionStorage.removeItem(STORAGE_PLAY_RESUME);
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
        try {
          mountSimulator(viewGame, deckMap, {
            onBackToDeck() {
              teardownDeckPileLayoutWatchers();
              clearPlayResumeStorage();
              viewGame.hidden = true;
              viewDeck.hidden = false;
              document.body.classList.remove("play-mode");
              document.body.classList.remove("live-turn-pick-mode");
              document.body.classList.remove("zone-hints-visible");
              document.body.classList.remove("stage-member-emphasis");
            },
            deckRoleLabels: {
              keyCardNos: Array.isArray(dm.keyCardNos) ? dm.keyCardNos : [],
              keyCard2Nos: Array.isArray(dm.keyCard2Nos) ? dm.keyCard2Nos : [],
              keyCard3Nos: Array.isArray(dm.keyCard3Nos) ? dm.keyCard3Nos : [],
              middleCardNos: Array.isArray(dm.middleCardNos) ? dm.middleCardNos : [],
            },
            resumeFromStorage: true,
          });
        } catch (err) {
          console.error(err);
          teardownDeckPileLayoutWatchers();
          clearPlayResumeStorage();
          document.body.classList.remove("play-mode");
          document.body.classList.remove("stage-member-emphasis");
          viewGame.hidden = true;
          viewDeck.hidden = false;
          showToast("前回の盤面の復元に失敗しました。デッキ画面からやり直してください。");
        }
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

function startApp(viewDeck, viewGame, statusEl) {
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
            try {
              mountSimulator(viewGame, deckMap, {
                onBackToDeck() {
                  teardownDeckPileLayoutWatchers();
                  clearPlayResumeStorage();
                  viewGame.hidden = true;
                  viewDeck.hidden = false;
                  document.body.classList.remove("play-mode");
                  document.body.classList.remove("live-turn-pick-mode");
                  document.body.classList.remove("zone-hints-visible");
                  document.body.classList.remove("stage-member-emphasis");
                },
                deckRoleLabels: {
                  keyCardNos: bundle.keyCardNos,
                  keyCard2Nos: bundle.keyCard2Nos,
                  keyCard3Nos: bundle.keyCard3Nos,
                  middleCardNos: bundle.middleCardNos,
                },
              });
            } catch (err) {
              console.error(err);
              teardownDeckPileLayoutWatchers();
              document.body.classList.remove("play-mode");
              document.body.classList.remove("live-turn-pick-mode");
              document.body.classList.remove("zone-hints-visible");
              document.body.classList.remove("stage-member-emphasis");
              viewGame.hidden = true;
              viewDeck.hidden = false;
              showToast("プレイ画面の初期化に失敗しました。ページを再読み込みしてお試しください。");
            }
          }, 0);
        });
      },
    });
    tryResumePlaySession(viewDeck, viewGame);
  } else {
    location.reload();
  }
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

function wireCloudAuthBar() {
  const bar = document.getElementById("cloud-auth-bar");
  const statusEl = document.getElementById("cloud-auth-status");
  const avatarEl = /** @type {HTMLImageElement|null} */ (
    document.getElementById("cloud-auth-avatar")
  );
  const signInBtn = document.getElementById("cloud-auth-signin");
  const signOutBtn = document.getElementById("cloud-auth-signout");
  if (!bar || !signInBtn || !signOutBtn) return;
  signInBtn.addEventListener("click", () => {
    signInWithGoogle();
  });
  signOutBtn.addEventListener("click", () => {
    signOutCloud();
  });

  initCloudAuthIfConfigured()
    .then((ok) => {
      if (!ok) return;
      bar.hidden = false;
    })
    .catch((err) => {
      console.warn("[main] cloudAuth init failed:", err);
    });

  onCloudUserChange((user) => {
    if (!isCloudSyncAvailable()) return;
    bar.hidden = false;
    if (user) {
      if (statusEl) {
        statusEl.textContent = user.displayName || user.email || "ログイン中";
      }
      if (avatarEl) {
        if (user.photoURL) {
          avatarEl.src = user.photoURL;
          avatarEl.hidden = false;
        } else {
          avatarEl.removeAttribute("src");
          avatarEl.hidden = true;
        }
      }
      signInBtn.hidden = true;
      signOutBtn.hidden = false;
    } else {
      if (statusEl) statusEl.textContent = "未ログイン";
      if (avatarEl) {
        avatarEl.removeAttribute("src");
        avatarEl.hidden = true;
      }
      signInBtn.hidden = false;
      signOutBtn.hidden = true;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireCloudAuthBar);
} else {
  wireCloudAuthBar();
}

tryLoadDatabase(viewDeck, viewGame, status);
