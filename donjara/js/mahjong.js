import { metaMeldPatterns } from "./metaMelds.js";
import { MELOD_META_ONLY } from "./meldRules.js";

/**
 * 麻雀準拠の和了（アガリ）判定エンジン。
 *
 * ルール適用（このゲーム固有）:
 *  - showTileNumbers OFF: ユニット順子・学年刻子・同牌刻子（数字順子/刻子なし）
 *  - showTileNumbers ON : 上記 + orderIndex 順子/刻子（複合）
 *  - 字牌（suit === "honor"）は順子を作らない（刻子/対子のみ）。本家麻雀と同じ。
 *  - 標準形: 4 面子 + 1 雀頭（14 枚）。
 *  - 七対子（7 種の対子）も和了として扱う。
 *
 * 面子（meld）: { type:"sequence"|"triplet", suit, tileKeys:[k,k,k] }
 * 雀頭（pair）: { suit, tileKeys:[k,k] }
 *
 * analyzeHand は「すべての標準分解」＋「七対子フラグ」を返し、役判定側が最良を選ぶ。
 */

/**
 * catalog（loadTileCatalog の戻り値）から
 *  - suitOrderToKey: Map<suit, Map<orderIndex, tileKey>>（メンバースートのみ）
 *  - honorKeys: Set<tileKey>
 * を作る。
 */
function buildIndex(catalog) {
  const suitOrderToKey = new Map();
  const honorKeys = new Set();
  for (const t of catalog.types) {
    if (t.suit === "honor") {
      honorKeys.add(t.key);
    } else {
      if (!suitOrderToKey.has(t.suit)) suitOrderToKey.set(t.suit, new Map());
      suitOrderToKey.get(t.suit).set(t.orderIndex, t.key);
    }
  }
  return { suitOrderToKey, honorKeys };
}

/** tileKeys 配列 → { key: count } */
export function countByKey(tileKeys) {
  const m = new Map();
  for (const k of tileKeys) m.set(k, (m.get(k) || 0) + 1);
  return m;
}

/**
 * メンバースート内の counts（Map<orderIndex,count>）を、
 * 面子（順子/刻子）へ完全分解する全パターンを返す。
 * @returns {Array<Array<{type:string,suit:string,tileKeys:string[]}>>} 面子リストの配列（空配列=分解不能）
 */
function sumCounts(m) {
  let s = 0;
  for (const c of m.values()) s += c;
  return s;
}

function firstKeyWithCount(counts) {
  for (const [k, c] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (c > 0) return k;
  }
  return null;
}

/**
 * メンバースート内の tileKey カウントを面子分解（数字/メタ複合）。
 */
function decomposeMemberSuitKeys(suit, keyCounts, catalog, meldOpts, order2key) {
  const patterns = meldOpts.meta ? metaMeldPatterns(suit, catalog) : { unitSeqs: [], gradeTrips: [] };
  const working = new Map(keyCounts);
  const results = [];

  const canTake = (keys) => keys.every((k) => (working.get(k) || 0) >= 1);
  const take = (keys) => {
    for (const k of keys) working.set(k, working.get(k) - 1);
  };
  const give = (keys) => {
    for (const k of keys) working.set(k, (working.get(k) || 0) + 1);
  };

  function recurse(melds) {
    if (sumCounts(working) === 0) {
      results.push(melds.slice());
      return;
    }
    const startKey = firstKeyWithCount(working);
    if (!startKey) return;
    const t = catalog.byKey.get(startKey);
    const o = t?.orderIndex;

    if ((working.get(startKey) || 0) >= 3) {
      take([startKey, startKey, startKey]);
      melds.push({ type: "triplet", suit, tileKeys: [startKey, startKey, startKey] });
      recurse(melds);
      melds.pop();
      give([startKey, startKey, startKey]);
    }

    if (meldOpts.numeric && o != null) {
      const k2 = order2key.get(o + 1);
      const k3 = order2key.get(o + 2);
      if (k2 && k3 && canTake([startKey, k2, k3])) {
        take([startKey, k2, k3]);
        melds.push({ type: "sequence", suit, tileKeys: [startKey, k2, k3] });
        recurse(melds);
        melds.pop();
        give([startKey, k2, k3]);
      }
    }

    if (meldOpts.meta) {
      for (const m of patterns.unitSeqs) {
        if (!m.tileKeys.includes(startKey) || !canTake(m.tileKeys)) continue;
        take(m.tileKeys);
        melds.push({ type: "sequence", suit, tileKeys: m.tileKeys.slice() });
        recurse(melds);
        melds.pop();
        give(m.tileKeys);
      }
      for (const m of patterns.gradeTrips) {
        if (!m.tileKeys.includes(startKey) || !canTake(m.tileKeys)) continue;
        take(m.tileKeys);
        melds.push({ type: "triplet", suit, tileKeys: m.tileKeys.slice() });
        recurse(melds);
        melds.pop();
        give(m.tileKeys);
      }
    }
  }

  recurse([]);
  return results;
}

/** @deprecated 数字のみ分解（テスト互換） */
function decomposeMemberSuit(suit, counts, order2key) {
  // orderIndex 昇順の作業用配列
  const indices = [...counts.keys()].sort((a, b) => a - b);
  const maxI = indices.length ? indices[indices.length - 1] : 0;
  const arr = new Array(maxI + 3).fill(0);
  for (const [i, c] of counts) arr[i] = c;

  const results = [];

  function recurse(startI, melds) {
    let i = startI;
    while (i <= maxI && arr[i] === 0) i++;
    if (i > maxI) {
      results.push(melds.slice());
      return;
    }
    // 刻子（同一 orderIndex ×3）
    if (arr[i] >= 3) {
      arr[i] -= 3;
      melds.push({
        type: "triplet",
        suit,
        tileKeys: [order2key.get(i), order2key.get(i), order2key.get(i)],
      });
      recurse(i, melds);
      melds.pop();
      arr[i] += 3;
    }
    // 順子（i, i+1, i+2 が連続して存在）
    if (
      order2key.has(i) &&
      order2key.has(i + 1) &&
      order2key.has(i + 2) &&
      arr[i] >= 1 &&
      arr[i + 1] >= 1 &&
      arr[i + 2] >= 1
    ) {
      arr[i]--;
      arr[i + 1]--;
      arr[i + 2]--;
      melds.push({
        type: "sequence",
        suit,
        tileKeys: [order2key.get(i), order2key.get(i + 1), order2key.get(i + 2)],
      });
      recurse(i, melds);
      melds.pop();
      arr[i]++;
      arr[i + 1]++;
      arr[i + 2]++;
    }
  }

  recurse(0, []);
  return results;
}

/** 字牌 counts（Map<key,count>）→ 刻子のみで分解可能なら 1 パターン、不可なら null */
function decomposeHonors(counts) {
  const melds = [];
  for (const [key, c] of counts) {
    if (c === 0) continue;
    if (c === 3) {
      melds.push({ type: "triplet", suit: "honor", tileKeys: [key, key, key] });
    } else {
      return null; // 1,2,4 は面子化不能（雀頭は事前に抜く）
    }
  }
  return melds;
}

/**
 * 手牌（tileKeys, 通常 14 枚）を解析。
 * @returns {{ isAgari:boolean, standardParses:Array<{melds:any[],pair:any}>, chiitoitsu:boolean, tileKeys:string[] }}
 */
export function analyzeHand(tileKeys, catalog, meldOpts = MELOD_META_ONLY) {
  const { suitOrderToKey, honorKeys } = buildIndex(catalog);
  const total = tileKeys.length;
  const counts = countByKey(tileKeys);

  const result = { isAgari: false, standardParses: [], chiitoitsu: false, tileKeys: tileKeys.slice() };

  // --- 七対子 ---
  if (total === 14) {
    let pairs = 0;
    let ok = true;
    for (const [, c] of counts) {
      if (c === 2) pairs++;
      else {
        ok = false;
        break;
      }
    }
    if (ok && pairs === 7) result.chiitoitsu = true;
  }

  // --- 標準形（(neededMelds) 面子 + 1 雀頭）---
  // 副露で面子が確定している場合、concealed 側は (総枚数-2)/3 面子だけ作ればよい。
  const neededMelds = (total - 2) / 3;
  if (total % 3 === 2) {
    for (const [pairKey, pc] of counts) {
      if (pc < 2) continue;
      // 雀頭候補を 2 枚抜く
      const working = new Map(counts);
      working.set(pairKey, pc - 2);

      // スートごとに counts を分ける
      const perSuitKeys = new Map(); // suit -> Map<tileKey,count>
      const honorCounts = new Map();
      let feasible = true;
      for (const [key, c] of working) {
        if (c === 0) continue;
        const t = catalog.byKey.get(key);
        if (!t) {
          feasible = false;
          break;
        }
        if (t.suit === "honor") {
          honorCounts.set(key, c);
        } else {
          if (!perSuitKeys.has(t.suit)) perSuitKeys.set(t.suit, new Map());
          perSuitKeys.get(t.suit).set(key, c);
        }
      }
      if (!feasible) continue;

      const suitOptionLists = [];
      let suitFail = false;
      for (const [suit, kc] of perSuitKeys) {
        const opts = decomposeMemberSuitKeys(suit, kc, catalog, meldOpts, suitOrderToKey.get(suit));
        if (!opts.length) {
          suitFail = true;
          break;
        }
        suitOptionLists.push(opts);
      }
      if (suitFail) continue;

      // 字牌の分解（1 パターン or null）
      let honorMelds = [];
      if (honorCounts.size) {
        const hm = decomposeHonors(honorCounts);
        if (!hm) continue;
        honorMelds = hm;
      }

      // メンバースート分解の直積 × 字牌面子 → 各パースを記録
      const combos = cartesian(suitOptionLists);
      const pairTile = catalog.byKey.get(pairKey);
      for (const combo of combos) {
        const melds = honorMelds.concat(...combo);
        if (melds.length === neededMelds) {
          result.standardParses.push({
            melds,
            pair: { suit: pairTile.suit, tileKeys: [pairKey, pairKey] },
          });
        }
      }
    }
  }

  result.isAgari = result.chiitoitsu || result.standardParses.length > 0;
  // 重複パース除去
  result.standardParses = dedupeParses(result.standardParses);
  return result;
}

/** 直積（空リストは [[]]） */
function cartesian(lists) {
  if (!lists.length) return [[]];
  return lists.reduce(
    (acc, cur) => {
      const out = [];
      for (const a of acc) for (const c of cur) out.push(a.concat([c]));
      return out;
    },
    [[]]
  );
}

function parseSignature(parse) {
  const meldSig = parse.melds
    .map((m) => m.type[0] + ":" + [...m.tileKeys].sort().join("|"))
    .sort()
    .join("/");
  return meldSig + "#" + parse.pair.tileKeys.join("|");
}

function dedupeParses(parses) {
  const seen = new Set();
  const out = [];
  for (const p of parses) {
    const sig = parseSignature(p);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(p);
  }
  return out;
}

/**
 * 13 枚（テンパイ）に対して、和了になる待ち牌（tileKey）の一覧を返す。
 * @param {string[]} tileKeys13
 * @param {object} catalog
 * @returns {string[]} 和了牌 key の配列
 */
export function winningTiles(tileKeys13, catalog, meldOpts = MELOD_META_ONLY) {
  const waits = [];
  for (const t of catalog.types) {
    const test = tileKeys13.concat([t.key]);
    if (analyzeHand(test, catalog, meldOpts).isAgari) waits.push(t.key);
  }
  return waits;
}

/** 13 枚がテンパイ（何か 1 枚で和了）か */
export function isTenpai(tileKeys13, catalog, meldOpts = MELOD_META_ONLY) {
  return winningTiles(tileKeys13, catalog, meldOpts).length > 0;
}
