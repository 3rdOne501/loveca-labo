/**
 * 公式大会の使用率選抜（カード使用率ポイント）計算。
 * カードテキストではなく大会運営ルールに基づく:
 * - 集計対象 = 予選で min〜max 勝（既定 2勝以上、リタイア含む）のメインデッキ
 * - カード同一判定は identityFn（既定は card_no そのまま。UI 側で rare_list クラスタを渡す）
 * - カード1枚あたりのポイント = 対象デッキ全体での合計採用枚数
 * - デッキ得点 = Σ(そのカードのポイント × 自分の枚数)。低いほど選抜上位
 * - 全勝（0 敗・未脱落・1 勝以上）は自動進出。残り枠は 1 敗から得点順
 * - 当落線上の同点は抽選（ここではフラグのみ。抽選自体は行わない）
 * - レシピ未入力の1敗は選抜で最下位扱い（0P のユニーク扱いを防ぐ）
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   wins: number,
 *   losses: number,
 *   dropped?: boolean,
 *   deckCode?: string,
 *   recipeText?: string,
 *   deckMap?: Record<string, number>
 * }} UsageRatePlayerIn
 */

/**
 * @param {unknown} n
 * @param {number} [fallback]
 */
export function toNonNegInt(n, fallback) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 0) return fallback == null ? 0 : fallback;
  return v;
}

/**
 * @param {unknown} cardNo
 * @param {(cardNo: string) => string} [identityFn]
 */
export function cardIdentityKey(cardNo, identityFn) {
  const raw = cardNo == null ? "" : String(cardNo).trim();
  if (!raw) return "";
  if (typeof identityFn === "function") {
    const hit = identityFn(raw);
    if (hit != null && String(hit).trim() !== "") return String(hit).trim();
  }
  return raw;
}

/**
 * @param {Record<string, number>|null|undefined} deckMap
 * @returns {Record<string, number>}
 */
export function normalizeDeckMap(deckMap) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!deckMap || typeof deckMap !== "object") return out;
  for (const [no, qty] of Object.entries(deckMap)) {
    const key = String(no || "").trim();
    const q = toNonNegInt(qty, 0);
    if (!key || q <= 0) continue;
    out[key] = (out[key] || 0) + q;
  }
  return out;
}

/**
 * @param {Record<string, number>} deckMap
 */
export function deckMapTotal(deckMap) {
  let n = 0;
  for (const q of Object.values(deckMap || {})) n += toNonNegInt(q, 0);
  return n;
}

/**
 * @param {Record<string, number>} deckMap
 */
export function deckMapToRecipeText(deckMap) {
  return Object.entries(normalizeDeckMap(deckMap))
    .sort(function (a, b) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    })
    .map(function (e) {
      return e[1] + " x " + e[0];
    })
    .join("\n");
}

/**
 * @param {unknown} raw
 */
export function truthyFlag(raw) {
  const s = String(raw == null ? "" : raw)
    .normalize("NFKC")
    .trim()
    .toLowerCase();
  if (!s) return false;
  return /^(1|true|yes|y|on|retired|retire|drop|dropped|リタイア|脱落|棄権)$/i.test(s);
}

/**
 * @param {UsageRatePlayerIn} p
 * @param {number} [index]
 */
export function normalizePlayer(p, index) {
  const src = p && typeof p === "object" ? p : {};
  const id = String(src.id || "").trim() || "p_" + String(index == null ? 0 : index);
  return {
    id: id,
    name: String(src.name || "").trim(),
    wins: toNonNegInt(src.wins, 0),
    losses: toNonNegInt(src.losses, 0),
    dropped: !!src.dropped,
    draws: toNonNegInt(src.draws, 0),
    deckCode: String(src.deckCode || "").trim(),
    recipeText: String(src.recipeText || ""),
    deckMap: normalizeDeckMap(src.deckMap),
    hasRecord:
      src.hasRecord === true ||
      toNonNegInt(src.wins, 0) > 0 ||
      toNonNegInt(src.losses, 0) > 0 ||
      toNonNegInt(src.draws, 0) > 0 ||
      !!src.dropped,
  };
}

/**
 * 予選全勝で自動進出するか（未対戦の 0-0 は含めない。リタイアは全勝扱いしない）。
 * @param {{ wins: number, losses: number, dropped?: boolean }} p
 */
export function isUndefeatedAdvance(p) {
  return !!p && !p.dropped && toNonNegInt(p.losses, 0) === 0 && toNonNegInt(p.wins, 0) > 0;
}

/**
 * 使用率選抜の候補（予選 1 敗・未脱落）。
 * @param {{ losses: number, dropped?: boolean }} p
 */
export function isUsageRateCandidate(p) {
  return !!p && !p.dropped && toNonNegInt(p.losses, 0) === 1;
}

/**
 * 使用率ポイントの母数に入れる勝数か。maxWins が null / 負なら上限なし（N勝以上）。
 * @param {number} wins
 * @param {number} [minWins]
 * @param {number|null} [maxWins]
 */
export function isWinsInPool(wins, minWins, maxWins) {
  const w = toNonNegInt(wins, 0);
  const min = Math.max(0, toNonNegInt(minWins, 2));
  if (maxWins == null || maxWins === "" || Number(maxWins) < 0) return w >= min;
  const max = toNonNegInt(maxWins, min);
  return w >= min && w <= Math.max(min, max);
}

export function poolRangeLabel(minWins, maxWins) {
  const min = Math.max(0, toNonNegInt(minWins, 2));
  if (maxWins == null || maxWins === "" || Number(maxWins) < 0) return min + "勝以上";
  const max = toNonNegInt(maxWins, min);
  if (min === max) return min + "勝のみ";
  return min + "〜" + Math.max(min, max) + "勝";
}

/** 1枚のデッキを、全デッキ／N勝以上ラインで見比べるときの母数。 */
export const DECK_POINT_LINES = [
  { id: "all", label: "全デッキ", minWins: 0, maxWins: null },
  { id: "w1", label: "1勝〜", minWins: 1, maxWins: null },
  { id: "w2", label: "2勝〜", minWins: 2, maxWins: null },
  { id: "w3", label: "3勝〜", minWins: 3, maxWins: null },
  { id: "w4", label: "4勝〜", minWins: 4, maxWins: null },
];

export function getDeckPointLine(id) {
  const hit = DECK_POINT_LINES.find(function (line) {
    return line.id === id;
  });
  return hit || DECK_POINT_LINES[2];
}

/**
 * @param {Record<string, number>|null|undefined} deckMap
 * @param {Map<string, number>|Record<string, number>|null|undefined} cardCopies
 * @param {(cardNo: string) => string} [identityFn]
 */
export function scoreDeckMap(deckMap, cardCopies, identityFn) {
  const copies =
    cardCopies instanceof Map ? cardCopies : new Map(Object.entries(cardCopies || {}));
  const map = normalizeDeckMap(deckMap);
  let points = 0;
  let mainCount = 0;
  /** @type {{ cardNo: string, identity: string, qty: number, perCopy: number, subtotal: number }[]} */
  const breakdown = [];
  for (const [no, qty] of Object.entries(map)) {
    mainCount += qty;
    const id = cardIdentityKey(no, identityFn);
    const perCopy = id ? copies.get(id) || 0 : 0;
    const subtotal = perCopy * qty;
    points += subtotal;
    breakdown.push({
      cardNo: no,
      identity: id || no,
      qty: qty,
      perCopy: perCopy,
      subtotal: subtotal,
    });
  }
  breakdown.sort(function (a, b) {
    if (b.subtotal !== a.subtotal) return b.subtotal - a.subtotal;
    return a.cardNo < b.cardNo ? -1 : a.cardNo > b.cardNo ? 1 : 0;
  });
  return {
    points: points,
    rankPoints: mainCount > 0 ? points : Number.POSITIVE_INFINITY,
    hasRecipe: mainCount > 0,
    mainCount: mainCount,
    breakdown: breakdown,
  };
}

/**
 * 同じデッキを、全デッキ／1勝〜／2勝〜／3勝〜／4勝〜の母数で同時採点する。
 * @param {UsageRatePlayerIn[]} players
 * @param {Record<string, number>|null|undefined} deckMap
 * @param {{ identityFn?: (cardNo: string) => string }} [opts]
 */
export function computeDeckPointLines(players, deckMap, opts) {
  opts = opts || {};
  const identityFn = opts.identityFn;
  const list = (Array.isArray(players) ? players : []).map(normalizePlayer);
  /** @type {Map<string, number>[]} */
  const maps = DECK_POINT_LINES.map(function () {
    return new Map();
  });
  const poolCounts = DECK_POINT_LINES.map(function () {
    return 0;
  });
  for (const p of list) {
    DECK_POINT_LINES.forEach(function (line, i) {
      if (!isWinsInPool(p.wins, line.minWins, line.maxWins)) return;
      poolCounts[i] += 1;
      for (const [no, qty] of Object.entries(p.deckMap)) {
        const id = cardIdentityKey(no, identityFn);
        if (!id) continue;
        maps[i].set(id, (maps[i].get(id) || 0) + qty);
      }
    });
  }
  const map = normalizeDeckMap(deckMap);
  return DECK_POINT_LINES.map(function (line, i) {
    const scored = scoreDeckMap(map, maps[i], identityFn);
    return Object.assign({}, line, {
      poolCount: poolCounts[i],
      cardPoints: Object.fromEntries(maps[i]),
      points: scored.points,
      hasRecipe: scored.hasRecipe,
      mainCount: scored.mainCount,
      breakdown: scored.breakdown,
    });
  });
}

/**
 * @param {UsageRatePlayerIn[]} players
 * @param {{
 *   finalsSlots?: number,
 *   poolMinWins?: number,
 *   poolMaxWins?: number|null,
 *   identityFn?: (cardNo: string) => string
 * }} [opts]
 */
export function computeUsageRateSelection(players, opts) {
  opts = opts || {};
  const finalsSlots = Math.max(1, toNonNegInt(opts.finalsSlots, 8) || 8);
  const poolMinWins = Math.max(0, toNonNegInt(opts.poolMinWins, 2));
  const poolMaxWins =
    opts.poolMaxWins == null || opts.poolMaxWins === "" || Number(opts.poolMaxWins) < 0
      ? null
      : toNonNegInt(opts.poolMaxWins, poolMinWins);
  const identityFn = opts.identityFn;

  const list = (Array.isArray(players) ? players : []).map(normalizePlayer);

  /** @type {Map<string, number>} */
  const cardCopies = new Map();
  /** @type {Map<string, string>} */
  const cardExamples = new Map();
  let poolCount = 0;

  for (const p of list) {
    if (!isWinsInPool(p.wins, poolMinWins, poolMaxWins)) continue;
    poolCount += 1;
    for (const [no, qty] of Object.entries(p.deckMap)) {
      const id = cardIdentityKey(no, identityFn);
      if (!id) continue;
      cardCopies.set(id, (cardCopies.get(id) || 0) + qty);
      if (!cardExamples.has(id)) cardExamples.set(id, no);
    }
  }

  const scored = list.map(function (p) {
    let points = 0;
    let mainCount = 0;
    /** @type {{ cardNo: string, identity: string, qty: number, perCopy: number, subtotal: number }[]} */
    const breakdown = [];
    for (const [no, qty] of Object.entries(p.deckMap)) {
      mainCount += qty;
      const id = cardIdentityKey(no, identityFn);
      const perCopy = id ? cardCopies.get(id) || 0 : 0;
      const subtotal = perCopy * qty;
      points += subtotal;
      breakdown.push({
        cardNo: no,
        identity: id || no,
        qty: qty,
        perCopy: perCopy,
        subtotal: subtotal,
      });
    }
    breakdown.sort(function (a, b) {
      if (b.subtotal !== a.subtotal) return b.subtotal - a.subtotal;
      return a.cardNo < b.cardNo ? -1 : a.cardNo > b.cardNo ? 1 : 0;
    });
    const hasRecipe = mainCount > 0;
    return Object.assign({}, p, {
      points: points,
      rankPoints: hasRecipe ? points : Number.POSITIVE_INFINITY,
      hasRecipe: hasRecipe,
      mainCount: mainCount,
      breakdown: breakdown,
      inPool: isWinsInPool(p.wins, poolMinWins, poolMaxWins),
    });
  });

  const undefeated = scored.filter(isUndefeatedAdvance).slice().sort(function (a, b) {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return compareJa(a.name, b.name);
  });

  const oneLoss = scored.filter(isUsageRateCandidate).slice().sort(compareUsageRank);

  const remainingSlots = Math.max(0, finalsSlots - undefeated.length);
  /** @type {typeof scored} */
  let selectedOneLoss = [];
  /** @type {typeof scored} */
  let lottery = [];
  let lotterySlots = 0;

  if (remainingSlots <= 0) {
    selectedOneLoss = [];
  } else if (oneLoss.length <= remainingSlots) {
    selectedOneLoss = oneLoss.slice();
  } else {
    const cutoffPoints = oneLoss[remainingSlots - 1].rankPoints;
    const better = oneLoss.filter(function (p) {
      return p.rankPoints < cutoffPoints;
    });
    const atCutoff = oneLoss.filter(function (p) {
      return p.rankPoints === cutoffPoints;
    });
    const slotsLeft = remainingSlots - better.length;
    if (atCutoff.length > slotsLeft) {
      selectedOneLoss = better;
      lottery = atCutoff;
      lotterySlots = Math.max(0, slotsLeft);
    } else {
      selectedOneLoss = oneLoss.slice(0, remainingSlots);
    }
  }

  /** @type {Set<string>} */
  const advancedIds = new Set();
  undefeated.forEach(function (p) {
    advancedIds.add(p.id);
  });
  selectedOneLoss.forEach(function (p) {
    advancedIds.add(p.id);
  });

  /** @type {Set<string>} */
  const lotteryIds = new Set();
  lottery.forEach(function (p) {
    lotteryIds.add(p.id);
  });

  const winnerSet = new Set(
    Array.isArray(opts.lotteryWinnerIds) ? opts.lotteryWinnerIds.map(String) : [],
  );
  if (lottery.length && lotterySlots && winnerSet.size) {
    const won = lottery.filter(function (p) {
      return winnerSet.has(p.id) && p.hasRecipe;
    }).slice(0, lotterySlots);
    won.forEach(function (p) {
      if (!selectedOneLoss.some(function (x) {
        return x.id === p.id;
      })) {
        selectedOneLoss.push(p);
      }
      advancedIds.add(p.id);
    });
  }

  const cardTable = [...cardCopies.entries()]
    .map(function (e) {
      return {
        identity: e[0],
        cardNo: cardExamples.get(e[0]) || e[0],
        copies: e[1],
        pointsPerCopy: e[1],
      };
    })
    .sort(function (a, b) {
      if (b.copies !== a.copies) return b.copies - a.copies;
      return a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0;
    });

  return {
    finalsSlots: finalsSlots,
    poolMinWins: poolMinWins,
    poolMaxWins: poolMaxWins,
    poolCount: poolCount,
    cardPoints: Object.fromEntries(cardCopies),
    cardTable: cardTable,
    players: scored,
    undefeated: undefeated,
    oneLoss: oneLoss,
    selectedOneLoss: selectedOneLoss,
    lottery: lottery,
    lotterySlots: lotterySlots,
    remainingSlots: remainingSlots,
    advancedIds: advancedIds,
    lotteryIds: lotteryIds,
  };
}

/**
 * 発表用: 予選抜け人数と全勝者数から、ボードに出す選手を切り出す。
 * 全勝者数は自動検出より少なく指定できる。多い指定は実在する全勝までに丸める。
 * 抽選待ちの1敗は、当選者以外は名前に入れない。
 *
 * @param {UsageRatePlayerIn[]} players
 * @param {{
 *   advanceCount?: number,
 *   undefeatedCount?: number|null,
 *   poolMinWins?: number,
 *   poolMaxWins?: number|null,
 *   identityFn?: (cardNo: string) => string,
 *   lotteryWinnerIds?: string[]
 * }} [opts]
 */
export function pickPrelimAdvancers(players, opts) {
  opts = opts || {};
  const advanceCount = Math.max(1, toNonNegInt(opts.advanceCount, 8) || 8);
  const result = computeUsageRateSelection(players, {
    finalsSlots: advanceCount,
    poolMinWins: opts.poolMinWins,
    poolMaxWins: opts.poolMaxWins,
    identityFn: opts.identityFn,
  });
  const requestedUndefeated =
    opts.undefeatedCount == null || opts.undefeatedCount === ""
      ? result.undefeated.length
      : toNonNegInt(opts.undefeatedCount, 0);
  const undefeated = result.undefeated.slice(0, Math.min(requestedUndefeated, result.undefeated.length));
  const remain = Math.max(0, advanceCount - undefeated.length);
  /** @type {typeof result.oneLoss} */
  const usage = [];
  const taken = new Set(
    undefeated.map(function (p) {
      return p.id;
    }),
  );
  const winnerSet = new Set(
    Array.isArray(opts.lotteryWinnerIds) ? opts.lotteryWinnerIds.map(String) : [],
  );
  for (let i = 0; i < result.oneLoss.length; i++) {
    if (usage.length >= remain) break;
    const p = result.oneLoss[i];
    if (taken.has(p.id)) continue;
    if (result.lotteryIds.has(p.id) && !winnerSet.has(p.id)) continue;
    if (!p.hasRecipe) continue;
    usage.push(p);
    taken.add(p.id);
  }
  const names = undefeated.concat(usage);
  return {
    result: result,
    advanceCount: advanceCount,
    requestedUndefeated: requestedUndefeated,
    actualUndefeated: result.undefeated.length,
    undefeated: undefeated,
    usage: usage,
    names: names,
    shortfall: Math.max(0, advanceCount - names.length),
    lottery: result.lottery,
    lotterySlots: result.lotterySlots,
  };
}

/**
 * @param {{ name?: string }} a
 * @param {{ name?: string }} b
 */
function compareJa(a, b) {
  return String(a || "").localeCompare(String(b || ""), "ja");
}

/**
 * @param {{ points: number, name?: string, wins?: number }} a
 * @param {{ points: number, name?: string, wins?: number }} b
 */
export function compareUsageRank(a, b) {
  const pa = a.rankPoints != null ? a.rankPoints : a.points;
  const pb = b.rankPoints != null ? b.rankPoints : b.points;
  if (pa !== pb) return pa - pb;
  if (b.wins !== a.wins) return (b.wins || 0) - (a.wins || 0);
  return compareJa(a.name, b.name);
}

/**
 * @param {string} urlOrId
 */
export function parseTonamelCompetitionId(urlOrId) {
  const s = String(urlOrId || "").trim();
  if (!s) return "";
  const m = s.match(/tonamel\.com\/competition\/([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{3,16}$/.test(s) && !/\s/.test(s)) return s;
  return "";
}

/**
 * @param {string} code
 */
export function decklogViewUrl(code) {
  const c = String(code || "")
    .trim()
    .replace(/\s+/g, "");
  if (!c) return "";
  return "https://decklog.bushiroad.com/view/" + encodeURIComponent(c);
}

/**
 * @param {string} text
 * @param {string} delim
 * @returns {string[][]}
 */
export function parseDelimitedRecords(text, delim) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delim) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      cur = "";
      if (row.some(function (c) {
        return String(c).trim() !== "";
      })) {
        rows.push(row);
      }
      row = [];
    } else if (ch === "\r") {
      /* skip; \n handles CRLF */
    } else {
      cur += ch;
    }
  }
  row.push(cur);
  if (row.some(function (c) {
    return String(c).trim() !== "";
  })) {
    rows.push(row);
  }
  return rows;
}

/**
 * @param {string} header
 */
function headerKind(header) {
  const h = String(header || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
  if (!h) return "";
  if (/^(順位|rank|ranking|placement|#)$/.test(h)) return "rank";
  if (
    /^(名前|選手|name|player|参加者|エントリー名|エントリーネーム|entryname|表示名|ニックネーム)$/.test(h) ||
    /エントリー名/.test(h)
  ) {
    return "name";
  }
  if (/^(勝|勝数|勝利|勝利数|勝ち|勝ち数|試合勝利|試合勝利数|wins?|win|w)$/.test(h)) return "wins";
  if (/^(負|敗|敗数|敗北|敗北数|負け|負け数|試合敗北|losses?|loss|l)$/.test(h)) return "losses";
  if (/^(戦績|成績|record|勝敗|結果|wl|w-l)$/.test(h)) return "record";
  if (/^(試合数|対戦数|試合|matches?|games?|roundplayed)$/.test(h)) return "matches";
  if (/^(引分|引き分け|分|draws?|ties?)$/.test(h)) return "draws";
  if (/^(リタイア|脱落|棄権|ドロップ|dropped|retired?|drop)$/.test(h)) return "dropped";
  if (/(デッキコード|decklog|deckcode|デッキid)/i.test(h) || /^(コード|code|deck)$/.test(h)) return "deckCode";
  if (/^(レシピ|recipe|decklist|リスト|デッキテキスト|デッキ)$/.test(h)) return "recipe";
  if (/支払い/.test(h) || /入金/.test(h) || /決済/.test(h) || /^(payment|paid)$/.test(h)) return "payment";
  if (/チェックイン/.test(h) || /^(checkin|checkedin)$/.test(h)) return "checkin";
  if (
    /ステータス/.test(h) ||
    /状況/.test(h) ||
    /状態/.test(h) ||
    /キャンセル/.test(h) ||
    /^(entrystatus|entrystate|entry|status)$/.test(h)
  ) {
    return "status";
  }
  return "";
}

function kindsWithColumnMap(headers, kinds, columnMap) {
  const out = (kinds || []).slice();
  const map = columnMap && typeof columnMap === "object" ? columnMap : {};
  ["deckCode", "recipe", "name"].forEach(function (kind) {
    const want = String(map[kind] || "").trim();
    if (!want) return;
    (headers || []).forEach(function (h, i) {
      if (String(h || "").trim() === want || statusNorm(h) === statusNorm(want)) out[i] = kind;
    });
  });
  return out;
}

/**
 * "4-1" / "4勝1敗" を勝敗に分ける。
 * @param {unknown} raw
 * @returns {{ wins: string, losses: string }|null}
 */
export function parseWlRecord(raw) {
  const s = String(raw == null ? "" : raw)
    .normalize("NFKC")
    .trim();
  if (!s) return null;
  let m = s.match(/^(\d+)\s*[-ー−–—:：]\s*(\d+)(?:\s*[-ー−–—:：]\s*(\d+))?$/);
  if (m) return { wins: m[1], losses: m[2], draws: m[3] || "0" };
  m = s.match(/(\d+)\s*勝\s*(\d+)\s*敗(?:\s*(\d+)\s*分)?/);
  if (m) return { wins: m[1], losses: m[2], draws: m[3] || "0" };
  return null;
}

function statusNorm(raw) {
  return String(raw == null ? "" : raw)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

/**
 * @param {unknown} opts
 * @returns {{ includeUnpaid: boolean, includeEntered: boolean }}
 */
export function normalizeRosterIncludeOpts(opts) {
  const src = opts && typeof opts === "object" ? opts : {};
  return {
    includeUnpaid: src.includeUnpaid === true,
    includeEntered: src.includeEntered !== false,
  };
}

function isWaitlistBlob(s) {
  return /キャンセル待|キャンセルまち|ウェイトリスト|waitlist|waitinglist|補欠/.test(s);
}

function isCancelBlob(s) {
  if (isWaitlistBlob(s)) return false;
  return /キャンセル|cancelled|canceled|entrycancel|^cancel$/.test(s);
}

function isUnpaidBlob(s) {
  return /未払|未入金|支払待|未決済|unpaid|paymentpending/.test(s) && !/当日払|現地払/.test(s);
}

function isPlayingBlob(s) {
  return /出場済|チェックイン済|checkedin|^playing$/.test(s);
}

function isEnteredBlob(s) {
  if (isPlayingBlob(s) || isWaitlistBlob(s) || isCancelBlob(s)) return false;
  return /エントリー済|^entered$|registered|^エントリー$/.test(s);
}

function isExactCancelStatus(s) {
  if (isWaitlistBlob(s)) return false;
  return (
    /^(エントリー)?キャンセル(済|済み)?$/.test(s) ||
    /^(cancelled|canceled|cancel|entrycancel(l?ed)?)$/.test(s)
  );
}

function isExactStatusToken(s) {
  return (
    /^(キャンセル待ち|キャンセルまち|ウェイトリスト|waitlist|waitinglist|補欠)$/.test(s) ||
    isExactCancelStatus(s) ||
    /^(未払(い)?|未入金|支払待(ち)?|未決済|unpaid|paymentpending)$/.test(s) ||
    /^(出場済(み)?|チェックイン済(み)?|checkedin|playing)$/.test(s) ||
    /^(エントリー済(み)?|entered|registered|エントリー)$/.test(s) ||
    /^(不参加|欠席|noshow)$/.test(s)
  );
}

function flagTruthy(raw) {
  const s = statusNorm(raw);
  if (!s) return false;
  if (/^(0|false|no|off|なし|無|×|x|-|未)$/.test(s)) return false;
  return truthyFlag(raw) || /^(○|◯|済|あり|yes)$/.test(s);
}

function collectRosterBlobs(rec) {
  const src = rec && typeof rec === "object" ? rec : {};
  /** @type {string[]} */
  const blobs = [];
  function add(raw) {
    const n = statusNorm(raw);
    if (n) blobs.push(n);
  }
  Object.keys(src).forEach(function (key) {
    if (key === "deckMap" || key === "name" || key === "id") return;
    const val = src[key];
    if (Array.isArray(val)) {
      val.forEach(function (item) {
        const n = statusNorm(item);
        if (n && isExactStatusToken(n)) blobs.push(n);
      });
      return;
    }
    if (val && typeof val === "object") return;
    const kind = headerKind(key);
    if (kind === "status" || kind === "payment" || kind === "checkin" || kind === "record") {
      add(val);
      return;
    }
    const n = statusNorm(val);
    if (n && isExactStatusToken(n)) blobs.push(n);
  });
  return blobs;
}

/**
 * 名簿から除外する理由。空文字なら残す。
 * キャンセル / キャンセル待ちは常に落とす。未払い・エントリー済みは opts で切替。
 * 列名が分からなくても、セル値がエントリーキャンセル等なら落とす。
 * @param {{ status?: string, payment?: string, checkin?: string, statusHints?: string[] }} rec
 * @param {{ includeUnpaid?: boolean, includeEntered?: boolean }} [opts]
 */
export function rosterSkipReason(rec, opts) {
  const flags = normalizeRosterIncludeOpts(opts);
  const blobs = collectRosterBlobs(rec);
  if (!blobs.length) return "";
  for (let i = 0; i < blobs.length; i++) {
    const s = blobs[i];
    if (isWaitlistBlob(s)) return "キャンセル待ち";
    if (isCancelBlob(s)) return "エントリーキャンセル";
    if (!flags.includeUnpaid && isUnpaidBlob(s)) return "未払い";
    if (/不参加|欠席|noshow/.test(s)) return "不参加";
  }
  if (!flags.includeEntered) {
    const playing = blobs.some(isPlayingBlob);
    if (!playing && blobs.some(isEnteredBlob)) return "エントリー済み";
  }
  return "";
}

/**
 * @param {string} firstLine
 */
function guessDelim(firstLine) {
  const s = String(firstLine || "");
  const tabs = (s.match(/\t/g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  if (tabs > 0 && tabs >= commas) return "\t";
  if (commas > 0) return ",";
  return "\t";
}

/**
 * 選手一覧の貼り付け（TSV / CSV / JSON / 「# 名前」ブロック）をパースする。
 * @param {string} text
 * @param {{ includeUnpaid?: boolean, includeEntered?: boolean }} [opts]
 * @returns {{ players: ReturnType<typeof normalizePlayer>[], errors: string[], skippedRoster: number }}
 */
export function parseParticipantPaste(text, opts) {
  const rosterOpts = normalizeRosterIncludeOpts(opts);
  const columnMap = opts && opts.columnMap && typeof opts.columnMap === "object" ? opts.columnMap : {};
  const raw = String(text || "").replace(/^\uFEFF/, "").trim();
  /** @type {string[]} */
  const errors = [];
  const emptySkip = { players: [], errors: [], skippedRoster: 0, skippedRows: [], headers: [] };
  if (!raw) return Object.assign(emptySkip, { errors: ["貼り付けが空です。"] });

  if (raw.charAt(0) === "[" || raw.charAt(0) === "{") {
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : data && Array.isArray(data.players) ? data.players : [];
      if (!arr.length) return Object.assign({}, emptySkip, { errors: ["JSON に選手配列がありません。"] });
      const jsonKept = [];
      /** @type {{ name: string, reason: string }[]} */
      const jsonSkipped = [];
      arr.forEach(function (p, i) {
        const reason = rosterSkipReason(p, rosterOpts);
        if (reason) {
          jsonSkipped.push({ name: String((p && p.name) || ""), reason: reason });
          return;
        }
        jsonKept.push(normalizePlayer(p, i));
      });
      return {
        players: jsonKept,
        errors: errors,
        skippedRoster: jsonSkipped.length,
        skippedRows: jsonSkipped,
        headers: [],
      };
    } catch (err) {
      errors.push("JSON として読めませんでした: " + (err && err.message ? err.message : String(err)));
      return Object.assign({}, emptySkip, { errors: errors });
    }
  }

  if (/^#/m.test(raw) && !/^[^\n]*\t/.test(raw.split(/\n/, 1)[0] || "")) {
    return parseParticipantBlocks(raw);
  }

  const firstLine = raw.split(/\r?\n/, 1)[0] || "";
  const delim = guessDelim(firstLine);
  const rows = parseDelimitedRecords(raw, delim);
  if (!rows.length) return { players: [], errors: ["行を読めませんでした。"], skippedRoster: 0, skippedRows: [], headers: [] };

  const rawKinds = rows[0].map(headerKind);
  const hasHeader = rawKinds.some(Boolean);
  const headers = hasHeader ? rows[0] : [];
  const headKinds = hasHeader ? kindsWithColumnMap(headers, rawKinds, columnMap) : rawKinds;
  const body = hasHeader ? rows.slice(1) : rows;
  /** @type {ReturnType<typeof normalizePlayer>[]} */
  const players = [];
  /** @type {{ name: string, reason: string }[]} */
  const skippedRows = [];

  body.forEach(function (cols, i) {
    const rec = hasHeader ? rowFromHeader(cols, headKinds, headers) : rowFromPositional(cols);
    if (!hasHeader) {
      const hints = [];
      cols.forEach(function (c) {
        const n = statusNorm(c);
        if (n && isExactStatusToken(n)) hints.push(n);
      });
      rec.statusHints = hints;
    }
    if (!rec.name && !rec.deckCode && !Object.keys(rec.deckMap || {}).length) {
      if (cols.some(function (c) {
        return String(c).trim() !== "";
      })) {
        errors.push((i + (hasHeader ? 2 : 1)) + " 行目をスキップしました。");
      }
      return;
    }
    const skip = rosterSkipReason(rec, rosterOpts);
    if (skip) {
      skippedRows.push({ name: rec.name || "", reason: skip });
      return;
    }
    players.push(normalizePlayer(rec, i));
  });

  if (!players.length && !errors.length) {
    errors.push(skippedRows.length ? "出場対象の選手がいません（名簿から除外した人だけです）。" : "選手を1人も読めませんでした。");
  }
  return {
    players: players,
    errors: errors,
    skippedRoster: skippedRows.length,
    skippedRows: skippedRows,
    headers: headers.map(function (h) {
      return String(h == null ? "" : h).trim();
    }).filter(Boolean),
  };
}

export function nameMatchKey(name) {
  return String(name || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * 勝敗CSVを既存選手へ名前で当てる。デッキとレシピは残す。
 * @param {ReturnType<typeof normalizePlayer>[]} existing
 * @param {ReturnType<typeof normalizePlayer>[]} incoming
 */
export function mergePlayerRecords(existing, incoming) {
  const list = (Array.isArray(existing) ? existing : []).map(function (p, i) {
    return normalizePlayer(p, i);
  });
  /** @type {Map<string, ReturnType<typeof normalizePlayer>[]>} */
  const byName = new Map();
  list.forEach(function (p) {
    const k = nameMatchKey(p.name);
    if (!k) return;
    const arr = byName.get(k) || [];
    arr.push(p);
    byName.set(k, arr);
  });
  let updated = 0;
  let added = 0;
  let skipped = 0;
  const unmatchedNames = [];
  (Array.isArray(incoming) ? incoming : []).forEach(function (raw, i) {
    const inc = normalizePlayer(raw, i);
    if (!inc.hasRecord && !inc.deckCode && !inc.recipeText) {
      skipped += 1;
      return;
    }
    const k = nameMatchKey(inc.name);
    const hits = k ? byName.get(k) : null;
    const hit = hits && hits.length ? hits.shift() : null;
    if (hit) {
      if (inc.hasRecord) {
        hit.wins = inc.wins;
        hit.losses = inc.losses;
        hit.draws = inc.draws || 0;
        hit.dropped = inc.dropped;
        hit.hasRecord = true;
      }
      if (inc.deckCode && !hit.deckCode) hit.deckCode = inc.deckCode;
      if (inc.recipeText && !String(hit.recipeText || "").trim()) hit.recipeText = inc.recipeText;
      if (inc.deckMap && Object.keys(inc.deckMap).length && !Object.keys(hit.deckMap || {}).length) {
        hit.deckMap = inc.deckMap;
      }
      updated += 1;
      return;
    }
    list.push(inc);
    if (k) {
      const arr = byName.get(k) || [];
      arr.push(inc);
      byName.set(k, arr);
    }
    added += 1;
    unmatchedNames.push(inc.name || "（無名）");
  });
  return {
    players: list,
    updated: updated,
    added: added,
    skipped: skipped,
    unmatchedNames: unmatchedNames,
  };
}

export function duplicateNameGroups(players) {
  /** @type {Map<string, ReturnType<typeof normalizePlayer>[]>} */
  const map = new Map();
  (Array.isArray(players) ? players : []).forEach(function (p, i) {
    const n = normalizePlayer(p, i);
    const k = nameMatchKey(n.name);
    if (!k) return;
    const arr = map.get(k) || [];
    arr.push(n);
    map.set(k, arr);
  });
  return Array.from(map.values()).filter(function (arr) {
    return arr.length > 1;
  });
}

export function mergeRosterKeepDecks(existing, incoming) {
  const oldList = (Array.isArray(existing) ? existing : []).map(function (p, i) {
    return normalizePlayer(p, i);
  });
  /** @type {Map<string, ReturnType<typeof normalizePlayer>[]>} */
  const byName = new Map();
  oldList.forEach(function (p) {
    const k = nameMatchKey(p.name);
    if (!k) return;
    const arr = byName.get(k) || [];
    arr.push(p);
    byName.set(k, arr);
  });
  /** @type {ReturnType<typeof normalizePlayer>[]} */
  const kept = [];
  let added = 0;
  (Array.isArray(incoming) ? incoming : []).forEach(function (raw, i) {
    const inc = normalizePlayer(raw, i);
    const k = nameMatchKey(inc.name);
    const hits = k ? byName.get(k) : null;
    const hit = hits && hits.length ? hits.shift() : null;
    if (hit) {
      hit.name = inc.name || hit.name;
      if (inc.deckCode && !hit.deckCode) hit.deckCode = inc.deckCode;
      if (inc.recipeText && !String(hit.recipeText || "").trim()) {
        hit.recipeText = inc.recipeText;
        if (inc.deckMap && Object.keys(inc.deckMap).length) hit.deckMap = inc.deckMap;
      }
      kept.push(hit);
    } else {
      kept.push(inc);
      added += 1;
    }
  });
  let removed = 0;
  byName.forEach(function (arr) {
    removed += arr.length;
  });
  return { players: kept, added: added, removed: removed };
}

export function pickLotteryWinners(candidates, slots, randFn) {
  const list = (Array.isArray(candidates) ? candidates : []).slice();
  const n = Math.max(0, Math.min(toNonNegInt(slots, 0), list.length));
  const rand = typeof randFn === "function" ? randFn : Math.random;
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list.slice(0, n);
}

export function parseNamedDeckBlocks(text) {
  return parseParticipantPaste(String(text || ""));
}

/**
 * @param {string[]} cols
 * @param {string[]} kinds
 * @param {string[]} [headers]
 */
function rowFromHeader(cols, kinds, headers) {
  /** @type {Record<string, string>} */
  const bag = {};
  /** @type {string[]} */
  const statusHints = [];
  kinds.forEach(function (kind, i) {
    const val = cols[i] == null ? "" : String(cols[i]);
    const valN = statusNorm(val);
    if (valN && isExactStatusToken(valN)) statusHints.push(valN);
    if (!kind || kind === "rank") return;
    if (kind === "name" && bag.name) return;
    if (!val && bag[kind]) return;
    bag[kind] = val;
  });
  (headers || []).forEach(function (header, i) {
    const val = cols[i] == null ? "" : String(cols[i]);
    const headerN = statusNorm(header);
    if (!headerN) return;
    if (/キャンセル/.test(headerN) && !isWaitlistBlob(headerN) && flagTruthy(val)) {
      bag.status = "エントリーキャンセル";
    }
    if (isWaitlistBlob(headerN) && flagTruthy(val)) {
      bag.status = "キャンセル待ち";
    }
  });
  let wins = bag.wins || "";
  let losses = bag.losses || "";
  const wl = parseWlRecord(bag.record) || parseWlRecord(bag.wins);
  if (wl) {
    wins = wl.wins;
    losses = wl.losses;
    if (wl.draws && !bag.draws) bag.draws = wl.draws;
  } else if (String(bag.record || "").trim() && !bag.status) {
    bag.status = bag.record;
  }
  const hasRecord = !!(wl || String(bag.wins || "").trim() || String(bag.losses || "").trim() || String(bag.matches || "").trim());
  let winN = toNonNegInt(wins, 0);
  let lossN = String(losses).trim() === "" ? null : toNonNegInt(losses, 0);
  if (lossN == null && String(bag.matches || "").trim() !== "") {
    const matches = toNonNegInt(bag.matches, 0);
    const draws = toNonNegInt(bag.draws, 0);
    lossN = Math.max(0, matches - winN - draws);
  }
  if (lossN == null) lossN = 0;
  return {
    name: bag.name || "",
    wins: winN,
    losses: lossN,
    dropped: truthyFlag(bag.dropped),
    draws: toNonNegInt(bag.draws, 0),
    deckCode: bag.deckCode || "",
    recipeText: bag.recipe || "",
    deckMap: {},
    hasRecord: hasRecord,
    status: bag.status || "",
    payment: bag.payment || "",
    checkin: bag.checkin || "",
    statusHints: statusHints,
  };
}

/**
 * 名前, 勝, 負, [リタイア], [デッキコード], [レシピ]
 * @param {string[]} cols
 */
function rowFromPositional(cols) {
  const c = cols.map(function (x) {
    return String(x == null ? "" : x).trim();
  });
  let dropped = false;
  let deckCode = "";
  let recipe = "";
  let extra = c.slice(3);
  if (extra.length && truthyFlag(extra[0])) {
    dropped = true;
    extra = extra.slice(1);
  } else if (extra.length && /^(0|false|no|なし)$/i.test(extra[0])) {
    extra = extra.slice(1);
  }
  if (extra.length) {
    deckCode = extra[0] || "";
    recipe = extra.slice(1).join("\n");
  }
  return {
    name: c[0] || "",
    wins: c[1] || 0,
    losses: c[2] || 0,
    dropped: dropped,
    deckCode: deckCode,
    recipeText: recipe,
    deckMap: {},
    hasRecord: c[1] !== "" || c[2] !== "" || dropped,
  };
}

/**
 * @param {string} text
 */
function parseParticipantBlocks(text) {
  const chunks = String(text || "").split(/^\s*#\s*/m);
  /** @type {ReturnType<typeof normalizePlayer>[]} */
  const players = [];
  /** @type {string[]} */
  const errors = [];
  chunks.forEach(function (chunk, i) {
    const body = chunk.trim();
    if (!body) return;
    const lines = body.split(/\r?\n/);
    const title = String(lines[0] || "").trim();
    const recMatch = title.match(/^(.*?)(?:\s+(\d+)\s*[-ー−]\s*(\d+))\s*$/);
    const name = recMatch ? String(recMatch[1] || "").trim() : title;
    let wins = recMatch ? recMatch[2] : 0;
    let losses = recMatch ? recMatch[3] : 0;
    let draws = 0;
    let dropped = false;
    let deckCode = "";
    /** @type {string[]} */
    const recipeLines = [];
    lines.slice(1).forEach(function (line) {
      const t = line.trim();
      if (!t) return;
      const kv = t.match(/^(勝|負|分|引分|引き分け|リタイア|脱落|デッキコード|コード|deckcode|code)\s*[:：]\s*(.*)$/i);
      if (kv) {
        const key = kv[1].toLowerCase();
        const val = kv[2];
        if (key === "勝") wins = val;
        else if (key === "負") losses = val;
        else if (key === "分" || key === "引分" || key === "引き分け") draws = val;
        else if (key === "リタイア" || key === "脱落") dropped = truthyFlag(val);
        else deckCode = val;
        return;
      }
      recipeLines.push(line);
    });
    if (!name) {
      errors.push("ブロック " + i + " に名前がありません。");
      return;
    }
    players.push(
      normalizePlayer(
        {
          name: name,
          wins: wins,
          losses: losses,
          draws: draws,
          dropped: dropped,
          deckCode: deckCode,
          recipeText: recipeLines.join("\n"),
        },
        i,
      ),
    );
  });
  if (!players.length && !errors.length) errors.push("ブロックから選手を読めませんでした。");
  return { players: players, errors: errors, skippedRoster: 0, skippedRows: [], headers: [] };
}

/**
 * @param {{
 *   players: { id: string, name: string, wins: number, losses: number, dropped?: boolean, points?: number }[],
 *   undefeated: { id: string }[],
 *   selectedOneLoss: { id: string }[],
 *   lottery: { id: string }[],
 *   lotterySlots: number,
 *   advancedIds: Set<string>,
 *   lotteryIds: Set<string>
 * }} result
 * @param {string} playerId
 */
export function advancementLabel(result, playerId) {
  if (result.undefeated.some(function (p) {
    return p.id === playerId;
  })) {
    return { kind: "undefeated", label: "全勝進出" };
  }
  if (result.selectedOneLoss.some(function (p) {
    return p.id === playerId;
  })) {
    return { kind: "usage", label: "使用率進出" };
  }
  if (result.lotteryIds.has(playerId)) {
    return { kind: "lottery", label: "抽選（" + result.lotterySlots + "枠）" };
  }
  const p = result.players.find(function (x) {
    return x.id === playerId;
  });
  if (p && isUsageRateCandidate(p)) return { kind: "cut", label: "使用率落選" };
  if (p && isUndefeatedAdvance(p)) return { kind: "undefeated", label: "全勝進出" };
  if (p && p.dropped) return { kind: "other", label: "リタイア" };
  return { kind: "other", label: "—" };
}

export const KOBOSHI_CS_PRESET = {
  title: "【公認サポート】小星CS",
  tonamelUrl: "https://tonamel.com/competition/0lHxM",
  dateLabel: "2026-09-22",
  capacity: 64,
  swissRounds: 5,
  finalsSlots: 8,
  poolMinWins: 2,
  poolMaxWins: null,
  boardHeadline: "決勝ラウンド進出者",
};
