/**
 * 副露（鳴き）判定ロジック。
 *  - ポン: 手牌に同一牌 2 枚
 *  - 大明槓: 手牌に同一牌 3 枚
 *  - チー: 上家の捨て牌。数字ON=orderIndex順子 / 常時=ユニット順子（複合可）
 *  - 暗槓: 自分の手番で手牌に 4 枚
 *  - 加槓: 既存のポンに同一牌を 1 枚足す
 *
 * 面子（meld）の構造:
 *   { kind:"pon"|"chi"|"kan"|"ankan"|"shouminkan", tiles:[key...], from:number|null, calledTile:string|null }
 * 役判定用の structure meld へは meldToStructure() で変換。
 */

import { chiOptionsMeta } from "./metaMelds.js";
import { MELOD_META_ONLY } from "./meldRules.js";

function countKey(hand, key) {
  let n = 0;
  for (const k of hand) if (k === key) n++;
  return n;
}

/** order → tileKey（同一コンテンツ内、catalog の全メンバーから） */
function keyForOrder(catalog, suit, order) {
  const list = catalog.byContent.get(suit);
  if (!list) return null;
  const t = list[order - 1];
  return t && t.orderIndex === order ? t.key : (list.find((x) => x.orderIndex === order) || {}).key || null;
}

export function canPon(hand, discardKey) {
  return countKey(hand, discardKey) >= 2;
}

export function canKan(hand, discardKey) {
  return countKey(hand, discardKey) >= 3;
}

/**
 * チー候補（上家の打牌に対して）。
 * @returns {Array<{tiles:[string,string]}>} 手牌から使う 2 枚の組
 */
export function chiOptions(hand, discardKey, catalog, meldOpts = MELOD_META_ONLY) {
  const seen = new Set();
  const out = [];
  const add = (opt) => {
    const sig = opt.tiles.slice().sort().join("|");
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push(opt);
  };
  if (meldOpts.meta) for (const o of chiOptionsMeta(hand, discardKey, catalog)) add(o);
  if (meldOpts.numeric) for (const o of chiOptionsNumeric(hand, discardKey, catalog)) add(o);
  return out;
}

function chiOptionsNumeric(hand, discardKey, catalog) {
  const t = catalog.byKey.get(discardKey);
  if (!t || t.suit === "honor") return [];
  const suit = t.suit;
  const n = t.orderIndex;
  const has = (order) => {
    const key = keyForOrder(catalog, suit, order);
    return key && countKey(hand, key) >= 1 ? key : null;
  };
  const opts = [];
  // (n-2, n-1)
  const a1 = has(n - 2);
  const a2 = has(n - 1);
  if (a1 && a2) opts.push({ tiles: [a1, a2] });
  // (n-1, n+1)
  const b1 = has(n - 1);
  const b2 = has(n + 1);
  if (b1 && b2) opts.push({ tiles: [b1, b2] });
  // (n+1, n+2)
  const c1 = has(n + 1);
  const c2 = has(n + 2);
  if (c1 && c2) opts.push({ tiles: [c1, c2] });
  return opts;
}

/** 自分の手番での暗槓候補（4 枚持ち） */
export function ankanOptions(hand) {
  const counts = new Map();
  for (const k of hand) counts.set(k, (counts.get(k) || 0) + 1);
  const out = [];
  for (const [k, c] of counts) if (c === 4) out.push(k);
  return out;
}

/** 自分の手番での加槓候補（ポン済み牌を手牌に持つ） */
export function shouminkanOptions(hand, melds) {
  const out = [];
  for (const m of melds || []) {
    if (m.kind !== "pon") continue;
    const key = m.tiles[0];
    if (countKey(hand, key) >= 1) out.push(key);
  }
  return out;
}

/**
 * 副露 meld → 役判定用 structure meld（kan は triplet 3 枚として扱う）。
 * 符計算のため open（鳴きでさらした）/ kan（槓子）フラグを付与する。
 * 暗槓は open:false（門前扱いの槓）。
 */
export function meldToStructure(meld, catalog) {
  const t = catalog.byKey.get(meld.tiles[0]);
  const suit = t ? t.suit : null;
  if (meld.kind === "chi") {
    return { type: "sequence", suit, tileKeys: meld.tiles.slice(0, 3), open: true, kan: false };
  }
  const kan = meld.kind === "kan" || meld.kind === "ankan" || meld.kind === "shouminkan";
  const open = meld.kind !== "ankan"; // 暗槓のみ closed
  return {
    type: "triplet",
    suit,
    tileKeys: [meld.tiles[0], meld.tiles[0], meld.tiles[0]],
    open,
    kan,
  };
}
