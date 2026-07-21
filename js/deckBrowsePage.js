/**
 * デッキ一覧フルページ（サンプル / 登録 / 投稿）のシェル初期化。
 * 描画・操作は deckbuilder が __llocgDeckBrowse API で提供。
 */
import { showDeckBuilderView } from "./viewNav.js";

export function initDeckBrowsePage() {
  document.getElementById("btn-deck-browse-back")?.addEventListener("click", function () {
    showDeckBuilderView();
  });

  document.querySelectorAll("[data-deck-browse-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-deck-browse-tab");
      if (!mode) return;
      if (typeof window.__llocgDeckBrowse !== "undefined" && window.__llocgDeckBrowse.open) {
        window.__llocgDeckBrowse.open(mode);
      }
    });
  });

  document.getElementById("btn-deck-browse-refresh")?.addEventListener("click", function () {
    if (typeof window.__llocgDeckBrowse !== "undefined" && window.__llocgDeckBrowse.refreshPublic) {
      window.__llocgDeckBrowse.refreshPublic();
    }
  });

  document.getElementById("btn-deck-browse-restore-builtin")?.addEventListener("click", function () {
    if (typeof window.__llocgDeckBrowse !== "undefined" && window.__llocgDeckBrowse.restoreBuiltin) {
      window.__llocgDeckBrowse.restoreBuiltin();
    }
  });

  window.addEventListener("llocg:viewchange", function (ev) {
    var d = ev && ev.detail;
    if (!d || d.view !== "deck-browse") return;
    if (typeof window.__llocgDeckBrowse !== "undefined" && window.__llocgDeckBrowse.open) {
      window.__llocgDeckBrowse.open(d.deckBrowseMode || "samples", { skipNav: true });
    }
  });
}
