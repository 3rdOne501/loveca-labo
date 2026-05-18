/**
 * blade_heart（ラブカ DB）のキーを UI 用に解釈する。
 * 1=桃,2=赤,3=黄,4=緑,5=青,6=紫,7=ALL（b_all も b_heart07 も ALL）。
 * ハート形は外部素材なしのインライン SVG（公式アイコンではない簡易表現）。
 */

import { T_LIVE } from "./config.js";
import { GAME_STATUS_ICON_ART_DIR, resolveGameStatusBundledHref, escapeAttrHtml } from "./gameStatusIcons.js";

/**
 * loveca-data-1 内の対応するハート／ALL／スコアアイコン PNG の `<img>` HTML。
 *
 *   slot = 0   → heart_00.png（汎用ハート）
 *   slot = 1〜6 → heart_01.png〜heart_06.png（桃／赤／黄／緑／青／紫）
 *   slot = 7   → icon_all.png（ALL）
 *   opts.score: true → icon_score.png（スコア）
 *   opts.draw_yell: true → icon_draw.png（ドロー）
 *   opts.blade: true → icon_blade.png（ブレードハート）
 *
 * @param {number} slot
 * @param {{score?:boolean, draw_yell?:boolean, blade?:boolean, extraClass?:string}} [opts]
 */
export function heartSlotArtIconHtml(slot, opts) {
  opts = opts || {};
  var file = null;
  var alt = "";
  var slotCls = "";
  if (opts.score) {
    file = "icon_score.png";
    alt = "スコア";
    slotCls = "heart-slot-art-ico--score";
  } else if (opts.draw_yell) {
    file = "icon_draw.png";
    alt = "ドロー";
    slotCls = "heart-slot-art-ico--draw-yell";
  } else if (opts.blade) {
    file = "icon_blade.png";
    alt = "ブレードハート";
    slotCls = "heart-slot-art-ico--blade";
  } else if (slot === 0) {
    file = "heart_00.png";
    alt = "汎用ハート";
    slotCls = "heart-slot-art-ico--slot0";
  } else if (slot === 7) {
    file = "icon_all.png";
    alt = "ALL";
    slotCls = "heart-slot-art-ico--slot7";
  } else if (typeof slot === "number" && slot >= 1 && slot <= 6) {
    file = "heart_0" + slot + ".png";
    alt = (SLOT[slot] && SLOT[slot].name) || "ハート";
    slotCls = "heart-slot-art-ico--slot" + slot;
  } else {
    return "";
  }
  var cls = "heart-slot-art-ico " + slotCls;
  if (opts.extraClass && typeof opts.extraClass === "string") {
    cls += " " + opts.extraClass.trim().split(/\s+/).filter(function (t) { return /^[\w-]+$/.test(t); }).join(" ");
  }
  var href = resolveGameStatusBundledHref(GAME_STATUS_ICON_ART_DIR + file);
  return (
    '<img src="' + escapeAttrHtml(href) + '"' +
    ' alt="' + escapeAttrHtml(alt) + '"' +
    ' class="' + escapeAttrHtml(cls) + '"' +
    ' draggable="false" loading="lazy" decoding="async" />'
  );
}

/** blade_heart キーが DB 上の「ドロー」特殊 BH（draw / drow 表記ゆれ）か */
export function isBladeHeartDrawMarkerKey(key) {
  const k = String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\.(png|gif|webp|jpg|jpeg)$/i, "");
  return k === "b_draw" || k === "b_drow" || k === "draw" || k === "drow";
}

/** カードの blade_heart にドロー特殊 BH（b_draw / b_drow 等）が 1 つ以上ある */
export function bladeHeartHasDrawMarker(card) {
  const bh = card && card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return false;
  return Object.keys(bh).some(function (k) {
    const v = Number(bh[k]);
    return isBladeHeartDrawMarkerKey(k) && Number.isFinite(v) && v > 0;
  });
}

/**
 * ライブかつ ALL（b_all）BH を持たず、桃〜紫（b_heart01〜06）のいずれかの色 BH を 1 つ以上持つ。
 * 公式ルール上これらはすべて「ドロー」特殊ハートのライブ。
 */
export function liveCardHasColoredBhWithoutAll(card) {
  if (!card || card.type !== T_LIVE) return false;
  const bh = card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return false;
  let hasColored = false;
  for (const key of Object.keys(bh)) {
    if (isBladeHeartDrawMarkerKey(key)) continue;
    const slot = parseBladeHeartSlotFromKey(key);
    const v = Number(bh[key]);
    if (!Number.isFinite(v) || v <= 0) continue;
    if (slot === 7) return false;
    if (slot != null && slot >= 1 && slot <= 6) hasColored = true;
  }
  return hasColored;
}

/** メンバー・ライブ共通: DB に blade_heart オブジェクトがあり 1 キー以上あれば BH あり */
export function cardHasBladeHeart(card) {
  if (!card || typeof card !== "object") return false;
  const bh = card.blade_heart;
  if (bh == null || typeof bh !== "object" || Array.isArray(bh)) return false;
  return Object.keys(bh).length > 0;
}

const BH_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.41 4.41 3 7.5 3c1.73 0 3.41.81 4.5 2.09C13.09 3.81 14.77 3 16.5 3 19.59 3 22 5.41 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** @type {{ name: string, fill?: string, all?: boolean }[]} */
const SLOT = [
  null,
  { name: "桃", fill: "#ff9eb5" },
  { name: "赤", fill: "#e53935" },
  { name: "黄", fill: "#fbc02d" },
  { name: "緑", fill: "#43a047" },
  { name: "青", fill: "#1e88e5" },
  { name: "紫", fill: "#8e24aa" },
  { name: "ALL", all: true },
];

let gradIdSeq = 0;
function nextGradId() {
  return "bhgrad" + String(++gradIdSeq);
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ライブカードに BH があるかの粗い判定。**♪ライブ判定にはこの関数を使わないこと**。
 *
 * 音符ライブ（＝DB に blade_heart が無いライブ）と、ドローエール（BH＋ドロー特殊）を区別するには、
 * `cards.js` の `cardIsNoteLiveCatalog` / `cardIsDrawYellLiveCatalog` を使う。ここではあくまで「ライブカードで
 * blade_heart が定義されている」だけを返すヘルパーで、ピル等の集計には適さない。
 */
export function bladeHeartIsLiveAdditiveBladeHeart(card) {
  if (!card || card.type !== T_LIVE) return false;
  const bh = card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return false;
  return Object.keys(bh).length > 0;
}

/**
 * `bladeHeartRowIconsHtml` の ♪ 表示判定を、bladeHeart.js → cards.js の循環参照を避けつつ
 * 行うためのフック。`cards.js` 側から `setIsScoreLiveCheck(cardIsNoteLiveCatalog)` を渡しておく。
 * 未登録なら旧仕様の loose check（ライブ＋BH あり）にフォールバックする。
 * @type {((card: unknown) => boolean) | null}
 */
let isScoreLiveCheck = null;
export function setIsScoreLiveCheck(fn) {
  isScoreLiveCheck = typeof fn === "function" ? fn : null;
}

/**
 * @param {string} svgHtml svgForBladeHeartKey の結果
 * @param {boolean} showNote
 */
function wrapHeartGlyphWithScoreBadge(svgHtml, showScore) {
  if (!showScore) return svgHtml;
  const scoreIco = heartSlotArtIconHtml(0, { score: true, extraClass: "blade-bh-score-char" });
  return (
    '<span class="blade-heart-with-note blade-heart-with-score" role="img" aria-label="\u30b9\u30b3\u30a2\u30e9\u30a4\u30d6\u306e\u30d6\u30ec\u30fc\u30c9\u30cf\u30fc\u30c8">' +
    svgHtml +
    (scoreIco
      ? '<span class="blade-bh-note-char blade-bh-score-char-wrap" aria-hidden="true">' + scoreIco + "</span>"
      : '<span class="blade-bh-note-char" aria-hidden="true">\u266A</span>') +
    "</span>"
  );
}

/**
 * @param {string} key
 * @returns {number | null} 1..7 または未対応キーは null
 */
export function parseBladeHeartSlotFromKey(key) {
  const s = String(key).trim();
  if (s === "b_all") return 7;
  const m = /^b_heart0*(\d+)$/i.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  if (n >= 1 && n <= 7) return n;
  return null;
}

/** blade_heart の数値重み総和（絶対値） */
export function sumBladeHeartWeightedValues(card) {
  const bh = card && card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return 0;
  var sum = 0;
  Object.values(bh).forEach(function (v) {
    var n = Number(v);
    if (Number.isFinite(n)) sum += Math.abs(n);
  });
  return sum;
}

/**
 * blade_heart の寄与を b_heart 系／b_all が指す<strong>表示色スロット</strong>ごとに加算する。未認識キーは slot 99。
 */
export function addBladeHeartWeightsPerDisplaySlot(card, accum) {
  const bh = card && card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return accum;
  Object.entries(bh).forEach(function (ent) {
    var slot = parseBladeHeartSlotFromKey(ent[0]);
    var u = slot == null ? 99 : slot;
    var n = Number(ent[1]);
    if (!Number.isFinite(n) || n === 0) return;
    accum[u] = (accum[u] || 0) + Math.abs(n);
  });
  return accum;
}

/** 1〜7 が色、99 はその他 */
export function bladeHeartDisplaySlotLabel(slotNum) {
  if (slotNum === 99) return "その他";
  var meta = SLOT[slotNum];
  return meta ? meta.name : "?";
}

/** @param {Record<number, number>} accum */
export function formatBladeHeartSlotBreakdown(accum) {
  const parts = [];
  for (let s = 1; s <= 7; s++) {
    const v = accum[s];
    if (v && v > 0) parts.push(bladeHeartDisplaySlotLabel(s) + " " + v);
  }
  if (accum[99] && accum[99] > 0) parts.push("その他 " + accum[99]);
  return parts.length ? parts.join("／") : "—";
}

/**
 * `formatBladeHeartSlotBreakdown` と同じ並び順だが、各色見出しを loveca-data-1 の PNG アイコンに置換した HTML。
 * @param {Record<number, number>} accum
 */
export function formatBladeHeartSlotBreakdownHtml(accum) {
  const parts = [];
  for (let s = 1; s <= 7; s++) {
    const v = accum[s];
    if (v && v > 0) {
      parts.push(
        '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--s' + s + '">' +
        heartSlotArtIconHtml(s) +
        '<span class="heart-slot-breakdown-num">' + v + '</span></span>',
      );
    }
  }
  if (accum[99] && accum[99] > 0) {
    parts.push(
      '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--other">' +
      '<span class="heart-slot-breakdown-num-label">その他</span>' +
      '<span class="heart-slot-breakdown-num">' + accum[99] + '</span></span>',
    );
  }
  return parts.length
    ? '<span class="heart-slot-breakdown-row">' + parts.join('') + '</span>'
    : '<span class="heart-slot-breakdown-row heart-slot-breakdown-row--empty">—</span>';
}
export function compareBladeHeartDbKeys(a, b) {
  const sa = parseBladeHeartSlotFromKey(a);
  const sb = parseBladeHeartSlotFromKey(b);
  const oa = sa == null ? 100 : sa;
  const ob = sb == null ? 100 : sb;
  if (oa !== ob) return oa - ob;
  return String(a).localeCompare(String(b), "ja");
}

/** メンバー base_heart ／ライブ need_heart の色情報（slot 1..6 と heart0 を 0、未対応キーは 99） */
export function parseHeartColorSlotFromKey(key) {
  const s = String(key).trim();
  if (s === "heart0") return 0;
  var m = /^heart0+(\d+)$/i.exec(s);
  if (!m) return null;
  var n = Number(m[1]);
  if (n >= 1 && n <= 6) return n;
  return null;
}

/**
 * メンバー base_heart を色情報スロット（1〜6／0＝無条件・別処理）ごとに加算。未認識キーは 99。
 * @param {Record<number, number>} accum
 */
export function addBaseHeartToSlotAccum(card, accum) {
  const h = card && card.base_heart;
  if (!h || typeof h !== "object" || Array.isArray(h)) return accum;
  Object.entries(h).forEach(function (ent) {
    var slot = parseHeartColorSlotFromKey(ent[0]);
    var u = slot == null ? 99 : slot;
    var n = Number(ent[1]);
    if (!Number.isFinite(n) || n === 0) return;
    accum[u] = (accum[u] || 0) + Math.abs(n);
  });
  return accum;
}

/**
 * ライブ need_heart を同色スケールで加算（heart01≒桃 … heart06）。
 * heart0 は「任意色相のハート」必要数としてスロット 0 に計上。
 */
export function addNeedHeartToSlotAccum(card, accum) {
  const nh = card && card.need_heart;
  if (!nh || typeof nh !== "object" || Array.isArray(nh)) return accum;
  Object.entries(nh).forEach(function (ent) {
    var slot = parseHeartColorSlotFromKey(ent[0]);
    var u = slot == null ? 99 : slot;
    var n = Number(ent[1]);
    if (!Number.isFinite(n) || n === 0) return;
    accum[u] = (accum[u] || 0) + Math.abs(n);
  });
  return accum;
}

/** スロット別の合計点数（オブジェクト値の総和） */
export function sumSlotAccumValues(accum) {
  var s = 0;
  Object.keys(accum).forEach(function (k) {
    var n = accum[k];
    if (typeof n === "number" && Number.isFinite(n)) s += n;
  });
  return s;
}

/**
 * blade_heart の BH ALL（b_all／スロット7）分を、need の有色 1〜6 の不足に先に充当する（桃→…→紫の順）。
 * 余った分は任意プール（heart0）側の wildcard 加算に回す。
 * @returns {{ supply: Record<number, number>, remainderFlex: number }}
 */
export function applyWildcardBhAllFlexToColoredSupply(supplyAccum, needAccum, flexIn) {
  const supply = Object.assign({}, supplyAccum || {});
  let flex = Number(flexIn);
  if (!Number.isFinite(flex)) flex = 0;
  flex = Math.max(0, Math.floor(flex));
  for (let slot = 1; slot <= 6 && flex > 0; slot++) {
    const need = needAccum[slot] || 0;
    if (need <= 0) continue;
    const have = supply[slot] || 0;
    if (have >= need) continue;
    const short = need - have;
    const pay = Math.min(flex, short);
    supply[slot] = have + pay;
    flex -= pay;
  }
  return { supply: supply, remainderFlex: flex };
}

/**
 * 所持H（色情報別）かつ need_heart に対する充足判定。
 * 1〜6 は同色をそのまま比較。残りポイント集合で slot0（heart0／任意ハート）を支払い。99 は同色キーのみ対応。
 *
 * options.wildcardBhAllFlex: 解決・エールで得た BH ALL の点数。有色不足を埋めた残りは任意プールに加算する。
 * options.wildcardAllBump: メンバー play ボーナス等の「heart0 のみ」向け ALL 加算（従来どおり）。
 */
export function evaluateNeedHeartFulfillment(supplyAccum, needAccum, options) {
  options = options || {};
  const flexOpt = Number(options.wildcardBhAllFlex);
  const flex0 = Number.isFinite(flexOpt) ? Math.max(0, Math.floor(flexOpt)) : 0;
  const afterFlex =
    flex0 > 0
      ? applyWildcardBhAllFlexToColoredSupply(supplyAccum, needAccum, flex0)
      : { supply: Object.assign({}, supplyAccum || {}), remainderFlex: 0 };
  let supply = afterFlex.supply;
  for (let slot = 1; slot <= 6; slot++) {
    var need = needAccum[slot] || 0;
    if (need <= 0) continue;
    var have = supply[slot] || 0;
    if (have < need) {
      return {
        ok: false,
        reason: bladeHeartDisplaySlotLabel(slot),
        slot: slot,
        deficit: need - have,
        needAtFail: need,
        haveAtFail: have,
      };
    }
    supply[slot] = have - need;
  }
  var bump = Number(options.wildcardAllBump);
  if (!Number.isFinite(bump)) bump = 0;
  bump = Math.max(0, Math.floor(bump)) + afterFlex.remainderFlex;
  var pool = [1, 2, 3, 4, 5, 6].reduce(function (acc, slot) {
    return acc + Math.max(0, supply[slot] || 0);
  }, 0);
  pool += Math.max(0, supply[99] || 0);
  pool += bump;
  var genNeed = needAccum[0] || 0;
  if (genNeed > 0 && pool < genNeed) {
    return {
      ok: false,
      reason: "任意（heart0）",
      slot: 0,
      deficit: genNeed - pool,
      poolAtFail: pool,
      needAtFail: genNeed,
    };
  }
  var needOdd = needAccum[99] || 0;
  if (needOdd > 0) {
    var h99 = supply[99] || 0;
    if (h99 < needOdd) {
      return {
        ok: false,
        reason: "その他キー",
        slot: 99,
        deficit: needOdd - h99,
        needAtFail: needOdd,
        haveAtFail: h99,
      };
    }
  }
  return { ok: true };
}

/**
 * evaluateNeedHeartFulfillment と同じ順序で need を照合するときに、複数種の不足がある場合に
 * すべて列挙する（概要欄で「最初の欠色」だけ見せない）。
 * @returns {{ slot: number, deficit: number, needAtFail: number, haveAtFail: number }[]}
 */
export function listAllNeedHeartDeficitsSequential(supplyAccum, needAccum, options) {
  options = options || {};
  const flexOpt = Number(options.wildcardBhAllFlex);
  const flex0 = Number.isFinite(flexOpt) ? Math.max(0, Math.floor(flexOpt)) : 0;
  const afterFlex =
    flex0 > 0
      ? applyWildcardBhAllFlexToColoredSupply(supplyAccum, needAccum, flex0)
      : { supply: Object.assign({}, supplyAccum || {}), remainderFlex: 0 };
  let supply = afterFlex.supply;
  const out = [];

  for (let slot = 1; slot <= 6; slot++) {
    var need = needAccum[slot] || 0;
    if (need <= 0) continue;
    var have = supply[slot] || 0;
    if (have < need) {
      out.push({
        slot: slot,
        deficit: need - have,
        needAtFail: need,
        haveAtFail: have,
      });
    }
    supply[slot] = Math.max(0, have - need);
  }

  var bump = Number(options.wildcardAllBump);
  if (!Number.isFinite(bump)) bump = 0;
  bump = Math.max(0, Math.floor(bump)) + afterFlex.remainderFlex;
  var pool = [1, 2, 3, 4, 5, 6].reduce(function (acc, slot) {
    return acc + Math.max(0, supply[slot] || 0);
  }, 0);
  pool += Math.max(0, supply[99] || 0);
  pool += bump;
  var genNeed = needAccum[0] || 0;
  if (genNeed > 0 && pool < genNeed) {
    out.push({
      slot: 0,
      deficit: genNeed - pool,
      needAtFail: genNeed,
      haveAtFail: pool,
    });
  }

  var needOdd = needAccum[99] || 0;
  if (needOdd > 0) {
    var h99 = supply[99] || 0;
    if (h99 < needOdd) {
      out.push({
        slot: 99,
        deficit: needOdd - h99,
        needAtFail: needOdd,
        haveAtFail: h99,
      });
    }
  }
  return out;
}

/** メンバー base_heart ／ライブカード側の BH とは別見出しで使う所持H の色内訳 */
export function formatHeartSlotAccumBreakdown(accum) {
  const parts = [];
  for (let s = 1; s <= 6; s++) {
    const v = accum[s];
    if (v && v > 0) parts.push(bladeHeartDisplaySlotLabel(s) + " " + v);
  }
  const v7 = accum[7];
  if (v7 && v7 > 0) parts.push(bladeHeartDisplaySlotLabel(7) + " " + v7);
  if (accum[99] && accum[99] > 0) parts.push("その他 " + accum[99]);
  return parts.length ? parts.join("／") : "—";
}

/**
 * `formatHeartSlotAccumBreakdown` と同じ並びだが、見出しを loveca-data-1 アイコンに置換した HTML。
 * @param {Record<number, number>} accum
 */
export function formatHeartSlotAccumBreakdownHtml(accum) {
  const parts = [];
  for (let s = 1; s <= 6; s++) {
    const v = accum[s];
    if (v && v > 0) {
      parts.push(
        '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--s' + s + '">' +
        heartSlotArtIconHtml(s) +
        '<span class="heart-slot-breakdown-num">' + v + '</span></span>',
      );
    }
  }
  const v7 = accum[7];
  if (v7 && v7 > 0) {
    parts.push(
      '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--s7">' +
      heartSlotArtIconHtml(7) +
      '<span class="heart-slot-breakdown-num">' + v7 + '</span></span>',
    );
  }
  if (accum[99] && accum[99] > 0) {
    parts.push(
      '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--other">' +
      '<span class="heart-slot-breakdown-num-label">その他</span>' +
      '<span class="heart-slot-breakdown-num">' + accum[99] + '</span></span>',
    );
  }
  return parts.length
    ? '<span class="heart-slot-breakdown-row">' + parts.join('') + '</span>'
    : '<span class="heart-slot-breakdown-row heart-slot-breakdown-row--empty">—</span>';
}

function svgHeartSolid(fill, className) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" class="' +
    className +
    '" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<path d="' +
    BH_PATH +
    '" fill="' +
    fill +
    '" stroke="rgba(0,0,0,0.24)" stroke-width="0.4"/></svg>'
  );
}

function svgHeartAll(className) {
  const id = nextGradId();
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" class="' +
    className +
    ' blade-heart-svg--all" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
    "<defs><linearGradient id=\"" +
    id +
    "\" x1=\"12%\" y1=\"5%\" x2=\"88%\" y2=\"95%\">" +
    '<stop offset="0%" stop-color="#ff9eb5"/>' +
    '<stop offset="18%" stop-color="#e53935"/>' +
    '<stop offset="36%" stop-color="#fbc02d"/>' +
    '<stop offset="52%" stop-color="#43a047"/>' +
    '<stop offset="72%" stop-color="#1e88e5"/>' +
    '<stop offset="100%" stop-color="#8e24aa"/>' +
    "</linearGradient></defs>" +
    '<path d="' +
    BH_PATH +
    '" fill="url(#' +
    id +
    ')" stroke="rgba(0,0,0,0.22)" stroke-width="0.4"/></svg>'
  );
}

/**
 * @param {string} dbKey
 * @param {string} className 既存の class に加えて付与（例: "blade-heart-svg blade-heart-svg--row"）
 */
export function svgForBladeHeartKey(dbKey, className) {
  const slot = parseBladeHeartSlotFromKey(dbKey);
  if (slot === 7) return svgHeartAll(className + " blade-heart-svg");
  if (slot != null && slot >= 1 && slot <= 6) {
    const meta = SLOT[slot];
    return svgHeartSolid(meta.fill || "#888", className + " blade-heart-svg");
  }
  return svgHeartSolid("#a8adb8", className + " blade-heart-svg blade-heart-svg--unknown");
}

/**
 * 「覗く」集計用ピル 1 個分（外側の span まで含む）
 * @param {string} dbKey
 * @param {number} quantity
 * @param {number} [additiveQty] ライブカード由来（♪）の重み
 */
export function bladeHeartAggregatePillHtml(dbKey, quantity, additiveQty) {
  const addP = typeof additiveQty === "number" && Number.isFinite(additiveQty) ? Math.max(0, additiveQty) : 0;
  const slot = parseBladeHeartSlotFromKey(dbKey);
  const slotClass = slot != null ? "bh-slot-" + slot : "bh-slot-unknown";
  const labelText = slot != null ? SLOT[slot].name : escapeHtml(String(dbKey));
  let title = escapeAttr(dbKey + "／BH計 " + quantity);
  if (addP > 0) {
    if (addP >= quantity) title = escapeAttr(dbKey + "／BH計 " + quantity + "（♪＝ライブのBH）");
    else title = escapeAttr(dbKey + "／BH計 " + quantity + "（♪ライブ由来 " + addP + "）");
  }
  /* 旧 SVG ハートではなく loveca-data-1 の PNG をピル本体に使用する。♪ 添字は note check で別途付与。 */
  let iconHtml = "";
  if (slot != null && slot >= 1 && slot <= 7) {
    iconHtml = heartSlotArtIconHtml(slot, { extraClass: "deck-peek-bh-pill-art-ico" });
  } else {
    iconHtml = svgForBladeHeartKey(dbKey, "blade-heart-svg");
  }
  const iconWrap = wrapHeartGlyphWithScoreBadge(iconHtml, addP > 0);
  return (
    '<span class="deck-peek-bh-color-pill deck-peek-bh-color-pill--art ' +
    slotClass +
    "\" title=\"" +
    title +
    '"><span class="blade-heart-pill-icon">' +
    iconWrap +
    "</span>" +
    '<span class="deck-peek-bh-kanji visually-hidden">' +
    labelText +
    '</span><span class="deck-peek-bh-pill-qty">× ' +
    quantity +
    "</span></span>"
  );
}

/**
 * カード 1 枚分の BH（キーが複数あれば並べる）
 * @param {object | null | undefined} card
 */
export function bladeHeartRowIconsHtml(card) {
  const bh = card && card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return "";
  /** @type {string[]} */
  const keys = Object.keys(bh).filter(function (k) {
    const v = Number(bh[k]);
    return Number.isFinite(v) && v !== 0;
  });
  if (!keys.length) return "";
  keys.sort(compareBladeHeartDbKeys);
  /* ♪表示は音符ライブ（BH 非記載のライブ）のみ。BH ありのカード・ドローエールでは出さない。
     cards.js から登録されたチェックがあればそれを使い、未登録時のみ旧 loose 判定にフォールバック。 */
  const note = isScoreLiveCheck
    ? !!isScoreLiveCheck(card)
    : bladeHeartIsLiveAdditiveBladeHeart(card);
  const icons = keys
    .map(function (k) {
      if (isBladeHeartDrawMarkerKey(k)) {
        return (
          '<span class="blade-heart-row-draw-marker" title="ドロー">' +
          heartSlotArtIconHtml(0, { draw_yell: true, extraClass: "blade-heart-svg blade-heart-svg--row" }) +
          "</span>"
        );
      }
      return wrapHeartGlyphWithScoreBadge(svgForBladeHeartKey(k, "blade-heart-svg blade-heart-svg--row"), note);
    })
    .join("");
  /** @type {string[]} */
  const titleParts = [];
  if (note) titleParts.push("\u30b9\u30b3\u30a2\u30e9\u30a4\u30d6BH");
  keys.forEach(function (k) {
    titleParts.push(k + "=" + bh[k]);
  });
  return (
    '<span class="blade-heart-row-icons" title="' +
    escapeAttr(titleParts.join(" · ")) +
    '">' +
    icons +
    "</span>"
  );
}
