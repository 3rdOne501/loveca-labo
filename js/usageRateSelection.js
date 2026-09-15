/**
 * 公式大会の使用率選抜（カード使用率ポイント）計算。
 * カードテキストではなく大会運営ルールに基づく:
 * - 集計対象 = 予選で N 勝以上（既定 2、リタイア含む）のメインデッキ
 * - カード同一判定は identityFn（既定は card_no そのまま。UI 側で rare_list クラスタを渡す）
 * - カード1枚あたりのポイント = 対象デッキ全体での合計採用枚数
 * - デッキ得点 = Σ(そのカードのポイント × 自分の枚数)。低いほど選抜上位
 * - 全勝（0 敗・未脱落・1 勝以上）は自動進出。残り枠は 1 敗から得点順
 * - 当落線上の同点は抽選（ここではフラグのみ。抽選自体は行わない）
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
    deckCode: String(src.deckCode || "").trim(),
    recipeText: String(src.recipeText || ""),
    deckMap: normalizeDeckMap(src.deckMap),
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
 * @param {UsageRatePlayerIn[]} players
 * @param {{
 *   finalsSlots?: number,
 *   poolMinWins?: number,
 *   identityFn?: (cardNo: string) => string
 * }} [opts]
 */
export function computeUsageRateSelection(players, opts) {
  opts = opts || {};
  const finalsSlots = Math.max(1, toNonNegInt(opts.finalsSlots, 8) || 8);
  const poolMinWins = Math.max(0, toNonNegInt(opts.poolMinWins, 2));
  const identityFn = opts.identityFn;

  const list = (Array.isArray(players) ? players : []).map(normalizePlayer);

  /** @type {Map<string, number>} */
  const cardCopies = new Map();
  /** @type {Map<string, string>} */
  const cardExamples = new Map();
  let poolCount = 0;

  for (const p of list) {
    if (p.wins < poolMinWins) continue;
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
    return Object.assign({}, p, {
      points: points,
      mainCount: mainCount,
      breakdown: breakdown,
      inPool: p.wins >= poolMinWins,
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
    const cutoffPoints = oneLoss[remainingSlots - 1].points;
    const better = oneLoss.filter(function (p) {
      return p.points < cutoffPoints;
    });
    const atCutoff = oneLoss.filter(function (p) {
      return p.points === cutoffPoints;
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
  if (a.points !== b.points) return a.points - b.points;
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
    .replace(/[\s_]/g, "");
  if (!h) return "";
  if (/^(名前|選手|name|player|参加者)$/.test(h)) return "name";
  if (/^(勝|wins?|勝利)$/.test(h)) return "wins";
  if (/^(負|losses?|敗北)$/.test(h)) return "losses";
  if (/^(リタイア|脱落|棄権|dropped|retired?|drop)$/.test(h)) return "dropped";
  if (/^(デッキコード|コード|deckcode|code|deck)$/.test(h)) return "deckCode";
  if (/^(レシピ|recipe|decklist|リスト)$/.test(h)) return "recipe";
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
 * @returns {{ players: ReturnType<typeof normalizePlayer>[], errors: string[] }}
 */
export function parseParticipantPaste(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "").trim();
  /** @type {string[]} */
  const errors = [];
  if (!raw) return { players: [], errors: ["貼り付けが空です。"] };

  if (raw.charAt(0) === "[" || raw.charAt(0) === "{") {
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : data && Array.isArray(data.players) ? data.players : [];
      if (!arr.length) return { players: [], errors: ["JSON に選手配列がありません。"] };
      return {
        players: arr.map(function (p, i) {
          return normalizePlayer(p, i);
        }),
        errors: errors,
      };
    } catch (err) {
      errors.push("JSON として読めませんでした: " + (err && err.message ? err.message : String(err)));
      return { players: [], errors: errors };
    }
  }

  if (/^#/m.test(raw) && !/^[^\n]*\t/.test(raw.split(/\n/, 1)[0] || "")) {
    return parseParticipantBlocks(raw);
  }

  const firstLine = raw.split(/\r?\n/, 1)[0] || "";
  const delim = guessDelim(firstLine);
  const rows = parseDelimitedRecords(raw, delim);
  if (!rows.length) return { players: [], errors: ["行を読めませんでした。"] };

  const headKinds = rows[0].map(headerKind);
  const hasHeader = headKinds.some(Boolean);
  const body = hasHeader ? rows.slice(1) : rows;
  /** @type {ReturnType<typeof normalizePlayer>[]} */
  const players = [];

  body.forEach(function (cols, i) {
    const rec = hasHeader ? rowFromHeader(cols, headKinds) : rowFromPositional(cols);
    if (!rec.name && !rec.deckCode && !Object.keys(rec.deckMap || {}).length) {
      if (cols.some(function (c) {
        return String(c).trim() !== "";
      })) {
        errors.push((i + (hasHeader ? 2 : 1)) + " 行目をスキップしました。");
      }
      return;
    }
    players.push(normalizePlayer(rec, i));
  });

  if (!players.length && !errors.length) errors.push("選手を1人も読めませんでした。");
  return { players: players, errors: errors };
}

/**
 * @param {string[]} cols
 * @param {string[]} kinds
 */
function rowFromHeader(cols, kinds) {
  /** @type {Record<string, string>} */
  const bag = {};
  kinds.forEach(function (kind, i) {
    if (!kind) return;
    bag[kind] = cols[i] == null ? "" : String(cols[i]);
  });
  return {
    name: bag.name || "",
    wins: bag.wins || 0,
    losses: bag.losses || 0,
    dropped: truthyFlag(bag.dropped),
    deckCode: bag.deckCode || "",
    recipeText: bag.recipe || "",
    deckMap: {},
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
    let dropped = false;
    let deckCode = "";
    /** @type {string[]} */
    const recipeLines = [];
    lines.slice(1).forEach(function (line) {
      const t = line.trim();
      if (!t) return;
      const kv = t.match(/^(勝|負|リタイア|脱落|デッキコード|コード|deckcode|code)\s*[:：]\s*(.*)$/i);
      if (kv) {
        const key = kv[1].toLowerCase();
        const val = kv[2];
        if (key === "勝") wins = val;
        else if (key === "負") losses = val;
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
          dropped: dropped,
          deckCode: deckCode,
          recipeText: recipeLines.join("\n"),
        },
        i,
      ),
    );
  });
  if (!players.length && !errors.length) errors.push("ブロックから選手を読めませんでした。");
  return { players: players, errors: errors };
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
};
