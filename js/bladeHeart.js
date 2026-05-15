/**
 * blade_heart（ラブカ DB）のキーを UI 用に解釈する。
 * 1=桃,2=赤,3=黄,4=緑,5=青,6=紫,7=ALL（b_all も b_heart07 も ALL）。
 */

import { T_LIVE } from "./config.js";
import { gameIconImgHtml, heartSlotToGameIconId } from "./gameIcons.js";

/** メンバー・ライブ共通: DB に blade_heart オブジェクトがあり 1 キー以上あれば BH あり */
export function cardHasBladeHeart(card) {
  if (!card || typeof card !== "object") return false;
  const bh = card.blade_heart;
  if (bh == null || typeof bh !== "object" || Array.isArray(bh)) return false;
  return Object.keys(bh).length > 0;
}

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
 * ライブカード側のブレードハート（加点 BH／楽曲ライブ等に付く）。
 * DB に専用フラグは無く、カード種別がライブかつ blade_heart ありで判別する。
 */
export function bladeHeartIsLiveAdditiveBladeHeart(card) {
  if (!card || card.type !== T_LIVE) return false;
  const bh = card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return false;
  return Object.keys(bh).length > 0;
}

/**
 * @param {string} svgHtml svgForBladeHeartKey の結果
 * @param {boolean} showNote
 */
function wrapHeartGlyphWithNote(svgHtml, showNote) {
  if (!showNote) return svgHtml;
  return (
    '<span class="blade-heart-with-note" role="img" aria-label="\u30e9\u30a4\u30d6\u306e\u30d6\u30ec\u30fc\u30c9\u30cf\u30fc\u30c8">' +
    svgHtml +
    '<span class="blade-bh-note-char" aria-hidden="true">\u266A</span></span>'
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
  const id = heartSlotToGameIconId(slot == null ? 99 : slot);
  const meta = slot != null && slot >= 1 && slot <= 7 ? SLOT[slot] : null;
  const alt = meta ? meta.name + " BH" : escapeHtml(String(dbKey));
  const cn = ((className || "") + " blade-heart-svg").trim();
  return gameIconImgHtml(id, {
    className: cn,
    alt,
    title: alt,
    width: 16,
    height: 16,
  });
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
  const label = slot != null ? SLOT[slot].name : escapeHtml(String(dbKey));
  let title = escapeAttr(dbKey + "／BH計 " + quantity);
  if (addP > 0) {
    if (addP >= quantity) title = escapeAttr(dbKey + "／BH計 " + quantity + "（♪＝ライブのBH）");
    else title = escapeAttr(dbKey + "／BH計 " + quantity + "（♪ライブ由来 " + addP + "）");
  }
  const iconWrap = wrapHeartGlyphWithNote(
    svgForBladeHeartKey(dbKey, "blade-heart-svg"),
    addP > 0,
  );
  return (
    '<span class="deck-peek-bh-color-pill ' +
    slotClass +
    "\" title=\"" +
    title +
    '"><span class="blade-heart-pill-icon">' +
    iconWrap +
    "</span>" +
    '<span class="deck-peek-bh-kanji">' +
    label +
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
  const note = bladeHeartIsLiveAdditiveBladeHeart(card);
  const icons = keys
    .map(function (k) {
      return wrapHeartGlyphWithNote(svgForBladeHeartKey(k, "blade-heart-svg blade-heart-svg--row"), note);
    })
    .join("");
  /** @type {string[]} */
  const titleParts = [];
  if (note) titleParts.push("\u266A\u30e9\u30a4\u30d6BH");
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
