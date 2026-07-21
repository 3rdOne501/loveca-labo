/**
 * 符・点数計算（麻雀準拠・簡略版）。
 * 親子・ツモ/ロン配分に対応。
 */

function isHonor(key, catalog) {
  const t = catalog.byKey.get(key);
  return !!t && t.suit === "honor";
}

/** 標準形の符を計算（20 符起点、10 符単位切り上げ）。 */
function computeStandardFu(structure, ctx, catalog) {
  let fu = 20;
  if (ctx.tsumo) fu += 2;
  if (ctx.menzen && !ctx.tsumo) fu += 10;

  if (structure.pair && isHonor(structure.pair.tileKeys[0], catalog)) fu += 2;

  for (const m of structure.melds || []) {
    if (m.type !== "triplet") continue;
    const honor = isHonor(m.tileKeys[0], catalog);
    let base;
    if (m.kan) {
      base = honor ? 32 : 16;
      if (m.open) base = honor ? 16 : 8;
    } else {
      base = honor ? 8 : 4;
      if (m.open) base = honor ? 4 : 2;
    }
    fu += base;
  }
  return Math.ceil(fu / 10) * 10;
}

export function roundPoints(n) {
  return Math.ceil(n / 100) * 100;
}

/**
 * @returns {{ fu:number, han:number, base:number, points:number, limit:string }}
 */
export function computeBaseScore(structure, ctx, catalog) {
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

  const points = roundPoints(base * 4);
  return { fu, han, base, points, limit };
}

/** @deprecated 互換: 子の和了合計点のみ */
export function computeScore(structure, ctx, catalog) {
  return computeBaseScore(structure, ctx, catalog);
}

/**
 * 和了時の点数移動。
 * @returns {{ deltas:number[], payments:Array<{from:number,to:number,amount:number,label:string}> }}
 */
export function computeWinPayments(opts) {
  const {
    base,
    winner,
    dealer,
    from,
    isTsumo,
    nPlayers,
    honba = 0,
    riichiSticks = 0,
  } = opts;

  const deltas = new Array(nPlayers).fill(0);
  const payments = [];
  const honbaPay = honba * 300;
  const isDealerWin = winner === dealer;

  const addPay = (payer, amount, label) => {
    if (amount <= 0 || payer === winner) return;
    deltas[payer] -= amount;
    deltas[winner] += amount;
    payments.push({ from: payer, to: winner, amount, label });
  };

  if (isTsumo) {
    if (isDealerWin) {
      for (let p = 0; p < nPlayers; p++) {
        if (p === winner) continue;
        addPay(p, roundPoints(base * 2) + honbaPay, "親ツモ");
      }
    } else {
      for (let p = 0; p < nPlayers; p++) {
        if (p === winner) continue;
        const core = p === dealer ? roundPoints(base * 2) : roundPoints(base);
        addPay(p, core + honbaPay, p === dealer ? "子ツモ(親)" : "子ツモ(子)");
      }
    }
  } else {
    const core = roundPoints(isDealerWin ? base * 6 : base * 4);
    addPay(from, core + honbaPay, isDealerWin ? "親ロン" : "子ロン");
  }

  if (riichiSticks > 0) {
    const riichiTotal = riichiSticks * 1000;
    deltas[winner] += riichiTotal;
    payments.push({ from: -1, to: winner, amount: riichiTotal, label: `立直棒×${riichiSticks}` });
  }

  return { deltas, payments };
}

/** 流局時テンパイ精算（3000点ノーテン罰） */
export function computeDrawPayments(tenpai, noten, nPlayers) {
  const deltas = new Array(nPlayers).fill(0);
  const payments = [];
  if (!tenpai.length || !noten.length) return { deltas, payments };

  const payPerNoten = roundPoints(3000 / noten.length);
  const receivePerTenpai = roundPoints(3000 / tenpai.length);

  for (const p of noten) {
    deltas[p] -= payPerNoten;
  }
  for (const p of tenpai) {
    deltas[p] += receivePerTenpai;
  }
  payments.push({
    from: -1,
    to: -1,
    amount: payPerNoten * noten.length,
    label: `テンパイ ${tenpai.length} / ノーテン ${noten.length}`,
  });

  return { deltas, payments };
}
