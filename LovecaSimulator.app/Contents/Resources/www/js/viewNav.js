/**
 * 全画面ビュー切り替え（デッキ編集 / プレイ / デッキ一覧 / ビンゴ）。
 */

/** @typedef {'deck'|'game'|'deck-browse'|'bingo'} AppViewId */

const VIEW_IDS = {
  deck: "view-deck",
  game: "view-game",
  "deck-browse": "view-deck-browse",
  bingo: "view-bingo",
};

/** @type {AppViewId|null} */
let activeView = null;

/**
 * @param {AppViewId} viewId
 * @param {{ deckBrowseMode?: string }} [opts]
 */
export function showAppView(viewId, opts) {
  opts = opts || {};
  const targetEl = document.getElementById(VIEW_IDS[viewId] || "");
  if (!targetEl && viewId !== "deck") {
    viewId = "deck";
  }
  activeView = viewId;
  let anyShown = false;
  Object.keys(VIEW_IDS).forEach(function (key) {
    const el = document.getElementById(VIEW_IDS[key]);
    if (!el) return;
    const show = key === viewId;
    el.hidden = !show;
    if (show) anyShown = true;
  });
  if (!anyShown) {
    const deckEl = document.getElementById(VIEW_IDS.deck);
    if (deckEl) {
      deckEl.hidden = false;
      activeView = "deck";
      viewId = "deck";
    }
  }
  document.body.classList.toggle("play-mode", viewId === "game");
  document.body.classList.toggle("deck-browse-mode", viewId === "deck-browse");
  document.body.classList.toggle("bingo-mode", viewId === "bingo");
  if (viewId === "deck-browse" && opts.deckBrowseMode) {
    document.body.dataset.deckBrowseMode = String(opts.deckBrowseMode);
  } else {
    delete document.body.dataset.deckBrowseMode;
  }
  window.dispatchEvent(
    new CustomEvent("llocg:viewchange", {
      detail: { view: viewId, deckBrowseMode: opts.deckBrowseMode || null },
    }),
  );
}

/** @returns {AppViewId|null} */
export function getActiveAppView() {
  return activeView;
}

export function showDeckBuilderView() {
  showAppView("deck");
}

export function showDeckBrowseView(mode) {
  showAppView("deck-browse", { deckBrowseMode: mode || "samples" });
}

export function showBingoView() {
  showAppView("bingo");
}
