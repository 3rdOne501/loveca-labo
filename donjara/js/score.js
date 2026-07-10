/**
 * 符・点数計算（麻雀準拠・簡略版）。
 *
 * このゲームには親（荘家）概念がないため、点数は「子（非荘家）の和了」相当で表示する。
 *  - ロン: base × 4
 *  - ツモ: base × 4（合計。内訳は表示のみ簡略）
 *
 * 待ちの種類（両面/嵌張/辺張/単騎）は未追跡のため待ち符は加算しない（近似）。
 * メンバー牌に么九（1/9）概念はないため、字牌のみを「役牌相当（+符）」として扱う。
 */

function isHonor(key, catalog) {
  const t = catalog.byKey.get(key);
  return !!t && t.suit === "honor";
}

/** 標準形の符を計算（20 符起点、10 符単位切り上げ）。 */
function computeStandardFu(structure, ctx, catalog) {
  let fu = 20;
  if (ctx.tsumo) fu += 2; // ツモ符
  if (ctx.menzen && !ctx.tsumo) fu += 10; // 門前ロン

  // 雀頭が字牌（役牌相当）なら +2
  if (structure.pair && isHonor(structure.pair.tileKeys[0], catalog)) fu += 2;

  for (const m of structure.melds || []) {
    if (m.type !== "triplet") continue; // 順子は 0 符
    const honor = isHonor(m.tileKeys[0], catalog);
    let base;
    if (m.kan) {
      base = honor ? 32 : 16; // 暗槓
      if (m.open) base = honor ? 16 : 8; // 明槓
    } else {
      base = honor ? 8 : 4; // 暗刻
      if (m.open) base = honor ? 4 : 2; // 明刻
    }
    fu += base;
  }
  return Math.ceil(fu / 10) * 10;
}

/**
 * @param {object} structure ev.structure（kind, melds, pair, tiles）
 * @param {object} ctx { han, tsumo, menzen, hasPinfu, hasChiitoi }
 * @param {object} catalog
 * @returns {{ fu:number, han:number, points:number, limit:string }}
 */
export function computeScore(structure, ctx, catalog) {
  const han = ctx.han;
  let fu;
  if (ctx.hasChiitoi) fu = 25;
  else if (ctx.hasPinfu) fu = ctx.tsumo ? 20 : 30;
  else fu = computeStandardFu(structure, ctx, catalog);

  let base = fu * Math.pow(2, 2 + han);
  let limit = "";
  if (han >= 13) {
    base = 8000;
    limit = "役満";
  } else if (han >= 11) {
    base = 6000;
    limit = "三倍満";
  } else if (han >= 8) {
    base = 4000;
    limit = "倍満";
  } else if (han >= 6) {
    base = 3000;
    limit = "跳満";
  } else if (han >= 5 || base >= 2000) {
    base = 2000;
    limit = "満貫";
  }

  const points = Math.ceil((base * 4) / 100) * 100; // 子の和了合計相当
  return { fu, han, points, limit };
}
