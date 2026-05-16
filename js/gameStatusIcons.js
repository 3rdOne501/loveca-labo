/**
 * 効果／ステータス欄の wiki トークン向けゲーム UI アイコン。
 * `game-icons/` 直下のフォルダ（ユーザー提供の一式）内の PNG を優先する。
 */

export const GAME_STATUS_ICON_BASE = "assets/game-icons/";

/**
 * 公式アイコン PNG 束（旧名「ラブカデータ１」）。
 * 以前は日本語のフォルダ名にしていたが、GitHub Pages（Linux）で NFD と NFC の差が解決できず
 * 画像が 404 になっていたため、ASCII の固定名 `loveca-data-1` に統一した。
 */
const GAME_STATUS_ICON_ART_SEGMENT = "loveca-data-1";

export const GAME_STATUS_ICON_ART_DIR =
  GAME_STATUS_ICON_BASE + GAME_STATUS_ICON_ART_SEGMENT + "/";

/**
 * @type {Record<string, string>}
 * canonical key（STEM_ALIAS の値）→ バンドル内ファイル名（ASCIIのみ）
 */
const ART_FILE_BY_KEY = /** @type {Record<string, string>} */ ({
  h00: "heart_00.png",
  h01: "heart_01.png",
  h02: "heart_02.png",
  h03: "heart_03.png",
  h04: "heart_04.png",
  h05: "heart_05.png",
  h06: "heart_06.png",
  hall: "icon_all.png",
  blade: "icon_blade.png",
  energy: "icon_energy.png",
  score: "icon_score.png",
  jouji: "jyouji.png",
  kidou: "kidou-2.png",
  live_start: "live_start.png",
  /** 効果文中のライブ成功時トークン */
  live_success: "live_success.png",
  /** ドローエール等 */
  draw_yell: "icon_draw.png",
  /** 自動 */
  jidou: "jidou.png",
  turn1: "turn1.png",
  toujyou: "toujyou.png",
});

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
  toujyou: "toujyou",
  登場: "toujyou",
  live_success: "live_success",
  icon_draw: "draw_yell",
  draw_yell: "draw_yell",
  jidou: "jidou",
  自動: "jidou",
});

/** 横長ラベル系（効果テキスト内で拡大表示） */
const PILL_ICON_KEYS = /** @type {Record<string, 1>} */ ({
  jouji: 1,
  kidou: 1,
  live_start: 1,
  live_success: 1,
  draw_yell: 1,
  jidou: 1,
  turn1: 1,
  toujyou: 1,
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
 * SPA・サブパス配信でも他端末で画像が読み込めるよう、画像 src をページの base に対する絶対 URL に揃える。
 * @param {string} href
 * @returns {string}
 */
export function resolveGameStatusBundledHref(href) {
  if (!href) return "";
  var s = String(href).trim();
  if (!s || /^data:/i.test(s) || /^blob:/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  try {
    return new URL(s, typeof document !== "undefined" ? document.baseURI : undefined).href;
  } catch (_) {
    return s;
  }
}

/**
 * @param {string} alt
 * @param {string} href
 * @returns {string}
 */
export function htmlStatusGameIconImg(alt, href, extraClass) {
  if (!href) return "";
  var resolved = resolveGameStatusBundledHref(href);
  var a = escapeAttrHtml(alt || "");
  var cls = "status-inline-game-icon";
  if (typeof extraClass === "string" && extraClass.trim() !== "") {
    var parts = extraClass.trim().split(/\s+/).filter(function (t) {
      return /^[\w\-]+$/.test(t);
    });
    if (parts.length) cls += " " + parts.join(" ");
  }
  return (
    '<img src="' +
    escapeAttrHtml(resolved) +
    '" alt="' +
    a +
    '"' +
    ' class="' +
    escapeAttrHtml(cls) +
    '"' +
    ' draggable="false"' +
    ' loading="lazy"' +
    ' decoding="async"' +
    " />"
  );
}

/**
 * wiki 茎 → PNG（優先）またはインライン SVG
 * @param {string} alt
 * @param {string} stem
 * @returns {string | null}
 */
export function wikiAbilityFileStemToIconHtml(alt, stem) {
  var norm = wikiAbilityStemNormalize(stem);
  var key = STEM_ALIAS[norm];
  if (!key) return null;
  var pill = !!PILL_ICON_KEYS[key];
  var artFile = ART_FILE_BY_KEY[key];
  if (artFile) {
    return htmlStatusGameIconImg(alt, GAME_STATUS_ICON_ART_DIR + artFile, pill ? "status-inline-game-icon--pill" : "");
  }
  var build = SVG_BUILD[key];
  if (!build) return null;
  var a = escapeAttrHtml(alt || "");
  return (
    '<span class="status-inline-game-icon' +
    (pill ? " status-inline-game-icon--pill" : "") +
    '" role="img" aria-label="' +
    a +
    '">' +
    build() +
    "</span>"
  );
}

/** img の src 用パスまたは data URI。旧コード互換。 */
export function wikiAbilityFileStemToIconHref(stem) {
  var norm = wikiAbilityStemNormalize(stem);
  var key = STEM_ALIAS[norm];
  if (!key) return null;
  var artFile = ART_FILE_BY_KEY[key];
  if (artFile) return resolveGameStatusBundledHref(GAME_STATUS_ICON_ART_DIR + artFile);
  var build = SVG_BUILD[key];
  if (!build) return null;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(build());
}

/** カード詳細: ドローエール（BH）バッジ */
export function catalogDrawYellBadgeHtml() {
  return htmlStatusGameIconImg(
    "ドローエール（BH）",
    GAME_STATUS_ICON_ART_DIR + ART_FILE_BY_KEY.draw_yell,
    "dlg-card-catalog-badge-img",
  );
}

/** カード詳細: 音符ライブ／スコア（バンドル icon_score.png） */
export function catalogNoteLiveBadgeHtml() {
  return htmlStatusGameIconImg("音符ライブ／スコア", GAME_STATUS_ICON_ART_DIR + ART_FILE_BY_KEY.score, "dlg-card-catalog-badge-img");
}

var __gsiArtPrefetchStarted = false;

/**
 * ラブカデータ１ PNG を先読みし、ステータス欄での初出遅れを抑える。
 */
export function prefetchGameStatusArtBundledEarly() {
  if (__gsiArtPrefetchStarted) return;
  __gsiArtPrefetchStarted = true;
  if (typeof document === "undefined") return;

  /** @type {Record<string, 1>} */
  var uniq = {};
  Object.keys(ART_FILE_BY_KEY || {}).forEach(function (canon) {
    var f = ART_FILE_BY_KEY[canon];
    if (!f || uniq[f]) return;
    uniq[f] = 1;
    var href = resolveGameStatusBundledHref(GAME_STATUS_ICON_ART_DIR + f);
    try {
      var lk = document.createElement("link");
      lk.rel = "preload";
      lk.as = "image";
      lk.href = href;
      document.head.appendChild(lk);
    } catch (_) {
      /* noop */
    }
    try {
      var im = new Image();
      im.decoding = "async";
      im.src = href;
    } catch (_) {
      /* noop */
    }
  });
}
