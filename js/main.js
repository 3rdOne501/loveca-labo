import {
  getEffectiveCardsJsonUrl,
  loadCardDatabase,
  setCardsJsonUrlOverride,
} from "./cards.js";
import { initDeckBuilder, loadDeckBundleFromStorage } from "./deckbuilder.js";
import { mountSimulator, teardownDeckPileLayoutWatchers } from "./simulator.js";
import { showToast } from "./ui.js";

let appStarted = false;

function hideBootToolbar() {
  const b = document.getElementById("boot-toolbar");
  if (b) b.hidden = true;
}

function showBootToolbar(msg) {
  const b = document.getElementById("boot-toolbar");
  const inp = document.getElementById("boot-cards-url");
  if (inp && !inp.value) inp.value = getEffectiveCardsJsonUrl();
  if (b) b.hidden = false;
  const st = document.getElementById("load-status");
  if (st && msg) st.textContent = msg;
}

function startApp(viewDeck, viewGame, statusEl) {
  if (statusEl) statusEl.textContent = "";
  hideBootToolbar();
  if (!appStarted) {
    appStarted = true;
    initDeckBuilder(viewDeck, {
      onStartGame: (deckMap) => {
        const bundle = loadDeckBundleFromStorage();
        viewDeck.hidden = true;
        viewGame.hidden = false;
        document.body.classList.add("play-mode");
        requestAnimationFrame(function () {
          setTimeout(function () {
            try {
              mountSimulator(viewGame, deckMap, {
                onBackToDeck() {
                  teardownDeckPileLayoutWatchers();
                  viewGame.hidden = true;
                  viewDeck.hidden = false;
                  document.body.classList.remove("play-mode");
                  document.body.classList.remove("live-turn-pick-mode");
                  document.body.classList.remove("zone-hints-visible");
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
              viewGame.hidden = true;
              viewDeck.hidden = false;
              showToast("プレイ画面の初期化に失敗しました。ページを再読み込みしてお試しください。");
            }
          }, 0);
        });
      },
    });
  } else {
    location.reload();
  }
}

function tryLoadDatabase(viewDeck, viewGame, statusEl) {
  loadCardDatabase(statusEl)
    .then(() => startApp(viewDeck, viewGame, statusEl))
    .catch((e) => {
      const msg = String(e.message || e);
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

document.getElementById("boot-apply-reload")?.addEventListener("click", () => {
  const inp = document.getElementById("boot-cards-url");
  const v = inp ? inp.value : "";
  setCardsJsonUrlOverride(v.trim());
  location.reload();
});

tryLoadDatabase(viewDeck, viewGame, status);
