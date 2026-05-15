/**
 * 効果／ステータス欄の wiki トークン向けゲーム UI アイコン。
 * （assets/game-icons の PNG が単色ダミーのため SVG で描く）
 */

export const GAME_STATUS_ICON_BASE = "assets/game-icons/";

export function wikiAbilityStemNormalize(stem) {
  return String(stem || "")
    .trim()
    .replace(/\.(png|gif|webp|jpg|jpeg)$/i, "")
    .toLowerCase();
}

/** @type {Record<string, string>} */
const STEM_ALIAS = /** @type {Record<string, string>} */ ({
  heart_00: "h00",
  heart00: "h00",
  heart0: "h00",
  heart_01: "h01",
  heart01: "h01",
  heart_02: "h02",
  heart02: "h02",
  heart_03: "h03",
  heart03: "h03",
  heart_04: "h04",
  heart04: "h04",
  heart_05: "h05",
  heart05: "h05",
  heart_06: "h06",
  heart06: "h06",
  icon_all: "hall",
  heart_07: "hall",
  heart07: "hall",
  heart7: "hall",
  icon_blade: "blade",
  blade: "blade",
  icon_energy: "energy",
  icon_score: "score",
  score: "score",
  jyouji: "jouji",
  jouji: "jouji",
  kidou: "kidou",
  live_start: "live_start",
  livestart: "live_start",
  turn1: "turn1",
  turn_once: "turn1",
  "ターン1回": "turn1",
});

function svgDoc(children) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' + children + "</svg>";
}

function heartPath(fill) {
  return (
    '<path fill="' +
    fill +
    '" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round" d="' +
    "M20 34.8c-5.8-4.95-10.95-10.62-11.94-17.62-.95-6.73 4.54-13.18 12.54-13.03 8 .15 " +
    "13.43 7.62 13.54 13.03.06 7-6.06 12.72-13.94 17.92l-.62.43-.62-.43z" +
    '"/>'
  );
}

/** @type {Record<string, () => string>} */
const SVG_BUILD = /** @type {Record<string, () => string>} */ ({
  h00: function () {
    return svgDoc(heartPath("#cfd8dc"));
  },
  h01: function () {
    return svgDoc(heartPath("#ff5ca8"));
  },
  h02: function () {
    return svgDoc(heartPath("#40c4ff"));
  },
  h03: function () {
    return svgDoc(heartPath("#69f0ae"));
  },
  h04: function () {
    return svgDoc(heartPath("#ffee58"));
  },
  h05: function () {
    return svgDoc(heartPath("#b388ff"));
  },
  h06: function () {
    return svgDoc(heartPath("#ff5252"));
  },
  hall: function () {
    return svgDoc(
      heartPath("#ff4081") +
        '<text x="20" y="26" font-size="10" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif">ALL</text>',
    );
  },
  blade: function () {
    return svgDoc(
      '<circle cx="20" cy="20" r="16.5" fill="#e91e63" stroke="#ffffff" stroke-width="2.2"/>' +
        '<ellipse cx="20" cy="20" rx="4.2" ry="14" fill="#fce4ec" transform="rotate(-18 20 20)"/>',
    );
  },
  energy: function () {
    return svgDoc(
      '<circle cx="20" cy="20" r="17" fill="#fdd835" stroke="#ffffff" stroke-width="3"/>' +
        '<path fill="#37474f" d="m22 6-12 16h9l-3 12 13-17h-8z"/>',
    );
  },
  score: function () {
    return svgDoc(
      '<path fill="#ab47bc" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round" d="' +
        "M25.5 7.8v17.9a4 4 0 11-3-3.7V17c0-.2-.1-.4-.3-.5l-6.8-.9-.5 16.9a4 4 0 11-3-3.7V11.9l10.9 1.4c1.9.25 3.7 2.1 " +
        "3.7 4.05z" +
        '"/>',
    );
  },
  jouji: function () {
    return svgDoc(
      '<rect x="4" y="9" width="32" height="22" rx="8" fill="#7e57c2" stroke="#ede7f6" stroke-width="1.2"/>' +
        '<text x="20" y="25.5" font-size="11" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif">常時</text>',
    );
  },
  kidou: function () {
    return svgDoc(
      '<rect x="4" y="9" width="32" height="22" rx="8" fill="#26c6da" stroke="#e0f7fa" stroke-width="1.2"/>' +
        '<text x="20" y="25.5" font-size="11" font-weight="800" fill="#004d53" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif">起動</text>',
    );
  },
  live_start: function () {
    return svgDoc(
      '<rect x="2" y="6" width="36" height="28" rx="7" fill="#ff7043" stroke="#fff3e0" stroke-width="1.2"/>' +
        '<text x="20" y="17" font-size="7.5" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif">ライブ</text>' +
        '<text x="20" y="27" font-size="7.5" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif">開始時</text>',
    );
  },
  turn1: function () {
    return svgDoc(
      '<rect x="1" y="9" width="38" height="22" rx="7" fill="#ffeb3b" stroke="#f9a825" stroke-width="1.2"/>' +
        '<text x="20" y="24.8" font-size="8.2" font-weight="800" fill="#311b92" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif">ターン1回</text>',
    );
  },
});

export function escapeAttrHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} alt
 * @param {string} href
 * @returns {string}
 */
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

/**
 * wiki 茎 → インライン SVG（span 付き）
 * @param {string} alt
 * @param {string} stem
 * @returns {string | null}
 */
export function wikiAbilityFileStemToIconHtml(alt, stem) {
  var norm = wikiAbilityStemNormalize(stem);
  var key = STEM_ALIAS[norm];
  if (!key) return null;
  var build = SVG_BUILD[key];
  if (!build) return null;
  var a = escapeAttrHtml(alt || "");
  return '<span class="status-inline-game-icon" role="img" aria-label="' + a + '">' + build() + "</span>";
}

/** img の src 用 data URI（未マップは null）。旧コード互換。 */
export function wikiAbilityFileStemToIconHref(stem) {
  var norm = wikiAbilityStemNormalize(stem);
  var key = STEM_ALIAS[norm];
  if (!key) return null;
  var build = SVG_BUILD[key];
  if (!build) return null;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(build());
}

/** カード詳細: ドローエール（BH）バッジ */
export function catalogDrawYellBadgeHtml() {
  var inner =
    '<path fill="#ff4081" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" d="' +
    "M20 33.2c-5.3-4.5-9.6-9.2-9.6-14.7 0-4.2 3.2-7.6 7.3-7.6 2.2 0 4.1 1 5.3 2.5 1.2-1.5 3.1-2.5 5.3-2.5 4.1 0 7.3 3.4 7.3 7.6 0 5.5-4.3 10.2-9.6 14.7l-.7.5-.7-.5z" +
    '"/>' +
    '<path fill="#fff59d" stroke="#f48fb1" stroke-width="1.2" d="M27.2 8.5l9.2 4.4v14.2l-9.2 4.4V8.5z"/>';
  return '<span class="dlg-card-catalog-badge-img" role="img" aria-label="ドローエール（BH）">' + svgDoc(inner) + "</span>";
}

/** カード詳細: 音符ライブ／スコア */
export function catalogNoteLiveBadgeHtml() {
  var inner =
    '<path fill="#ba68c8" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round" d="' +
    "M26.2 6.5v18.2a3.6 3.6 0 11-2.7-3.3V12.4l-9-1.3v14.4a3.6 3.6 0 11-2.7-3.3V6.4l12.4 2.1z" +
    '"/>';
  return '<span class="dlg-card-catalog-badge-img" role="img" aria-label="音符ライブ／スコア">' + svgDoc(inner) + "</span>";
}
