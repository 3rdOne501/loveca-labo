/**
 * ステータス欄（カード詳細ダイアログ）で wiki トークンをゲーム UI アイコンに差す。
 * 画像はプロジェクト直下の assets/game-icons/ に置く。
 */

export const GAME_STATUS_ICON_BASE = "assets/game-icons/";

/** 公式カードのアイコンに相当（ローカル PNG 未収録時のデータ URL） */
export const GAME_ICON_ENERGY_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" role="img">` +
      `<circle cx="20" cy="20" r="18" fill="#fdd835" stroke="#fff" stroke-width="3"/>` +
      `<path fill="#37474f" d="m22 6-12 16h9l-3 12 13-17h-8z"/>` +
      `</svg>`,
  );

const STEM_TO_FILENAME = /** @type {Record<string, string>} */ ({
  heart_00: "heart0.png",
  heart00: "heart0.png",
  heart0: "heart0.png",
  heart_01: "heart01.png",
  heart01: "heart01.png",
  heart_02: "heart02.png",
  heart02: "heart02.png",
  heart_03: "heart03.png",
  heart03: "heart03.png",
  heart_04: "heart04.png",
  heart04: "heart04.png",
  heart_05: "heart05.png",
  heart05: "heart05.png",
  heart_06: "heart06.png",
  heart06: "heart06.png",
  icon_all: "heart7.png",
  heart_07: "heart7.png",
  heart07: "heart7.png",
  heart7: "heart7.png",
  icon_blade: "blade.png",
  blade: "blade.png",
  icon_energy: "__ENERGY__",
  icon_score: "score.png",
  score: "score.png",
  jyouji: "jouji.png",
  jouji: "jouji.png",
  kidou: "kidou.png",
  live_start: "live-start.png",
  livestart: "live-start.png",
  turn1: "turn-once.png",
  turn_once: "turn-once.png",
  "ターン1回": "turn-once.png",
});

export function wikiAbilityFileStemToIconHref(stem) {
  var s = String(stem || "")
    .trim()
    .replace(/\.(png|gif|webp|jpg|jpeg)$/i, "")
    .toLowerCase();
  var hit = STEM_TO_FILENAME[s];
  if (!hit) return null;
  if (hit === "__ENERGY__") return GAME_ICON_ENERGY_DATA_URI;
  return GAME_STATUS_ICON_BASE + hit;
}

export function escapeAttrHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @returns {string} */
export function htmlStatusGameIconImg(alt, href) {
  if (!href) return "";
  var a = escapeAttrHtml(alt || "");
  return (
    '<img src="' +
    escapeAttrHtml(href) +
    '" alt="' +
    a +
    '"' +
    ' class="status-inline-game-icon"' +
    ' draggable="false"' +
    ' loading="lazy"' +
    ' decoding="async"' +
    " />"
  );
}
