/**
 * ゲーム UI 用アセット（assets/game-icons/*.png）。
 * 実画像はプロジェクトの assets/game-icons に配置（無い場合はブラウザが壊れたアイコン表示）。
 */

/** @typedef {'heart01'|'heart02'|'heart03'|'heart04'|'heart05'|'heart06'|'heart7'|'heart0'|'yell'|'blade'|'kidou'|'jouji'|'liveStart'|'turnOnce'|'score'} GameIconId */

/** @type {Record<GameIconId, string>} */
const FILES = {
  heart01: "heart01.png",
  heart02: "heart02.png",
  heart03: "heart03.png",
  heart04: "heart04.png",
  heart05: "heart05.png",
  heart06: "heart06.png",
  heart7: "heart7.png",
  heart0: "heart0.png",
  yell: "yell.png",
  blade: "blade.png",
  kidou: "kidou.png",
  jouji: "jouji.png",
  liveStart: "live-start.png",
  turnOnce: "turn-once.png",
  score: "score.png",
};

/** @type {Record<GameIconId, string>} */
export const GAME_ICON_ALT = {
  heart01: "桃ハート",
  heart02: "赤ハート",
  heart03: "黄ハート",
  heart04: "緑ハート",
  heart05: "青ハート",
  heart06: "紫ハート",
  heart7: "ALLハート",
  heart0: "任意ハート",
  yell: "エール",
  blade: "ブレード",
  kidou: "起動",
  jouji: "常時",
  liveStart: "ライブ開始時",
  turnOnce: "ターン1回",
  score: "スコア",
};

/**
 * @param {GameIconId} id
 * @returns {string}
 */
export function gameIconUrl(id) {
  const file = FILES[id];
  if (!file) return "";
  return new URL("../assets/game-icons/" + file, import.meta.url).href;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {GameIconId} id
 * @param {{ className?: string, alt?: string, title?: string, width?: number, height?: number }} [opts]
 */
export function gameIconImgHtml(id, opts) {
  opts = opts || {};
  const url = gameIconUrl(id);
  if (!url) return "";
  const cls = opts.className != null ? opts.className : "game-ico game-ico--inline";
  const alt = opts.alt != null ? opts.alt : GAME_ICON_ALT[id] || "";
  const title = opts.title != null ? opts.title : alt;
  const w = opts.width;
  const h = opts.height;
  let sz = "";
  if (Number.isFinite(w) && w > 0) sz += " width=\"" + escapeAttr(String(w)) + "\"";
  if (Number.isFinite(h) && h > 0) sz += " height=\"" + escapeAttr(String(h)) + "\"";
  return (
    '<img src="' +
    escapeAttr(url) +
    '" alt="' +
    escapeAttr(alt) +
    '" class="' +
    escapeAttr(cls) +
    '"' +
    sz +
    (title ? ' title="' + escapeAttr(title) + '"' : "") +
    ' loading="lazy" decoding="async" />'
  );
}

/**
 * BH／所持／必要ハートの表示スロット（1〜7・0・99）→ アイコン id
 * @param {number} slot
 * @returns {GameIconId}
 */
export function heartSlotToGameIconId(slot) {
  var n = Number(slot);
  if (n === 7) return "heart7";
  if (n >= 1 && n <= 6) return /** @type {GameIconId} */ ("heart" + String(n).padStart(2, "0"));
  return "heart0";
}

/**
 * @param {Record<string, unknown>} map
 * @param {(key: string) => number | null} parseKeyToSlot
 * @param {(a: string, b: string) => number} compareKeys
 */
export function formatHeartMapIconsHtml(map, parseKeyToSlot, compareKeys) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return "—";
  var ks = Object.keys(map).slice().sort(compareKeys);
  var parts = [];
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i];
    var slot = parseKeyToSlot(k);
    if (slot == null) slot = 99;
    var qty = Number(map[k]);
    if (!Number.isFinite(qty) || qty === 0) continue;
    var id = heartSlotToGameIconId(slot);
    parts.push(
      '<span class="game-ico-stack">' +
        gameIconImgHtml(id, {
          className: "game-ico game-ico--heart-inline",
          alt: GAME_ICON_ALT[id],
        }) +
        '<span class="game-ico-qty">\u00d7' +
        escapeHtmlText(String(qty)) +
        "</span></span>",
    );
  }
  return parts.length ? parts.join("") : "—";
}
