/**
 * データ駆動の役システム。
 *
 * 役は { id, name, han, menzenOnly, evaluate(structure, ctx, catalog) -> han(number) } で表現する。
 * - 基本役（BASE_YAKU）をプリセット。
 * - 設定から「追加可能」: createCustomYaku(template, params) で
 *   染め役・特定字牌の刻子・特定キャラの刻子 などをユーザーが足せる。
 *
 * evaluate に渡す structure:
 *   { kind:"standard"|"chiitoitsu", melds:[], pair:{}, tiles:[key...] }
 */

/* ---------- 構造ヘルパ ---------- */

function suitOf(key, catalog) {
  const t = catalog.byKey.get(key);
  return t ? t.suit : null;
}
function tileOf(key, catalog) {
  return catalog.byKey.get(key) || null;
}

/** structure 中のメンバーコンテンツ集合（字牌を除く） */
function memberContents(structure, catalog) {
  const set = new Set();
  for (const k of structure.tiles) {
    const s = suitOf(k, catalog);
    if (s && s !== "honor") set.add(s);
  }
  return set;
}
function hasHonor(structure, catalog) {
  return structure.tiles.some((k) => suitOf(k, catalog) === "honor");
}
function seqKey(meld) {
  return [...meld.tileKeys].sort().join("|");
}

/* ---------- 基本役 ---------- */

/** @type {Array<{id:string,name:string,han:number,menzenOnly?:boolean,evaluate:Function}>} */
export const BASE_YAKU = [
  {
    id: "riichi",
    name: "立直",
    han: 1,
    menzenOnly: true,
    evaluate: (st, ctx) => (ctx.riichi && ctx.menzen ? 1 : 0),
  },
  {
    id: "tsumo",
    name: "門前ツモ",
    han: 1,
    menzenOnly: true,
    evaluate: (st, ctx) => (ctx.tsumo && ctx.menzen ? 1 : 0),
  },
  {
    id: "chiitoitsu",
    name: "七対子",
    han: 2,
    menzenOnly: true,
    evaluate: (st) => (st.kind === "chiitoitsu" ? 2 : 0),
  },
  {
    id: "pinfu",
    name: "平和",
    han: 1,
    menzenOnly: true,
    evaluate: (st, ctx, catalog) => {
      if (st.kind !== "standard") return 0;
      if (!ctx.menzen) return 0;
      const allSeq = st.melds.every((m) => m.type === "sequence");
      const pairIsHonor = suitOf(st.pair.tileKeys[0], catalog) === "honor";
      return allSeq && !pairIsHonor ? 1 : 0;
    },
  },
  {
    id: "iipeiko",
    name: "一盃口",
    han: 1,
    menzenOnly: true,
    evaluate: (st, ctx) => {
      if (st.kind !== "standard" || !ctx.menzen) return 0;
      const seqs = st.melds.filter((m) => m.type === "sequence").map(seqKey);
      const seen = new Set();
      for (const s of seqs) {
        if (seen.has(s)) return 1;
        seen.add(s);
      }
      return 0;
    },
  },
  {
    id: "toitoi",
    name: "対々和",
    han: 2,
    evaluate: (st) =>
      st.kind === "standard" && st.melds.every((m) => m.type === "triplet") ? 2 : 0,
  },
  {
    id: "yakuhai",
    name: "役牌（字牌の刻子）",
    han: 1,
    evaluate: (st, ctx, catalog) => {
      if (st.kind !== "standard") return 0;
      let n = 0;
      for (const m of st.melds) {
        if (m.type === "triplet" && suitOf(m.tileKeys[0], catalog) === "honor") n++;
      }
      return n; // 刻子 1 つにつき 1 翻
    },
  },
  {
    id: "sanshoku",
    name: "三色同順",
    han: 2,
    evaluate: (st, ctx, catalog) => {
      if (st.kind !== "standard") return 0;
      // 同じ orderIndex 起点の順子が異なる 3 コンテンツに存在
      const byStart = new Map(); // startOrder -> Set(content)
      for (const m of st.melds) {
        if (m.type !== "sequence") continue;
        const t0 = tileOf(m.tileKeys[0], catalog);
        if (!t0 || t0.suit === "honor") continue;
        const start = t0.orderIndex;
        if (!byStart.has(start)) byStart.set(start, new Set());
        byStart.get(start).add(t0.suit);
      }
      for (const [, set] of byStart) if (set.size >= 3) return ctx.menzen ? 2 : 1;
      return 0;
    },
  },
  {
    id: "ittsu",
    name: "一気通貫",
    han: 2,
    evaluate: (st, ctx, catalog) => {
      if (st.kind !== "standard") return 0;
      // 同一コンテンツで 1-2-3 / 4-5-6 / 7-8-9 の順子が揃う
      const seqStartsByContent = new Map();
      for (const m of st.melds) {
        if (m.type !== "sequence") continue;
        const t0 = tileOf(m.tileKeys[0], catalog);
        if (!t0 || t0.suit === "honor") continue;
        if (!seqStartsByContent.has(t0.suit)) seqStartsByContent.set(t0.suit, new Set());
        seqStartsByContent.get(t0.suit).add(t0.orderIndex);
      }
      for (const [, starts] of seqStartsByContent) {
        if (starts.has(1) && starts.has(4) && starts.has(7)) return ctx.menzen ? 2 : 1;
      }
      return 0;
    },
  },
  {
    id: "honitsu",
    name: "混一色",
    han: 3,
    evaluate: (st, ctx, catalog) => {
      const contents = memberContents(st, catalog);
      return contents.size === 1 && hasHonor(st, catalog) ? (ctx.menzen ? 3 : 2) : 0;
    },
  },
  {
    id: "chinitsu",
    name: "清一色",
    han: 6,
    evaluate: (st, ctx, catalog) => {
      const contents = memberContents(st, catalog);
      return contents.size === 1 && !hasHonor(st, catalog) ? (ctx.menzen ? 6 : 5) : 0;
    },
  },
  {
    id: "honroutou",
    name: "字一色",
    han: 13,
    evaluate: (st, ctx, catalog) => {
      const contents = memberContents(st, catalog);
      return contents.size === 0 && hasHonor(st, catalog) ? 13 : 0;
    },
  },
];

/* ---------- カスタム役テンプレート（設定から追加） ---------- */

/**
 * @typedef {"content_flush"|"honor_triplet"|"member_triplet"} CustomYakuTemplate
 */

/**
 * 設定 UI から役を追加するためのテンプレート生成。
 * @param {CustomYakuTemplate} template
 * @param {object} params { contentId?, honorKey?, memberKey?, name?, han? }
 */
export function createCustomYaku(template, params = {}) {
  const han = Number(params.han) || 1;
  switch (template) {
    case "content_flush":
      return {
        id: `custom-flush-${params.contentId}`,
        name: params.name || `${params.contentLabel || params.contentId} 染め`,
        han,
        custom: true,
        template,
        params,
        evaluate: (st, ctx, catalog) => {
          const contents = memberContents(st, catalog);
          return contents.size === 1 && contents.has(params.contentId) ? han : 0;
        },
      };
    case "honor_triplet":
      return {
        id: `custom-honor-${params.honorKey}`,
        name: params.name || `${params.honorLabel || params.honorKey} の刻子`,
        han,
        custom: true,
        template,
        params,
        evaluate: (st) => {
          if (st.kind !== "standard") return 0;
          return st.melds.some(
            (m) => m.type === "triplet" && m.tileKeys[0] === params.honorKey
          )
            ? han
            : 0;
        },
      };
    case "member_triplet":
      return {
        id: `custom-member-${params.memberKey}`,
        name: params.name || `${params.memberLabel || params.memberKey} の刻子`,
        han,
        custom: true,
        template,
        params,
        evaluate: (st) => {
          if (st.kind !== "standard") return 0;
          return st.melds.some(
            (m) => m.type === "triplet" && m.tileKeys[0] === params.memberKey
          )
            ? han
            : 0;
        },
      };
    default:
      throw new Error("unknown custom yaku template: " + template);
  }
}

/* ---------- 評価 ---------- */

/**
 * analyzeHand の結果から評価対象 structure 群を作る。
 * openMelds（副露で確定した面子。structure meld と同形）があれば合成する。
 */
function structuresFromAnalysis(analysis, openMelds) {
  const opens = openMelds || [];
  const openTiles = [];
  for (const m of opens) openTiles.push(...m.tileKeys);

  const list = [];
  for (const p of analysis.standardParses) {
    const tiles = openTiles.slice();
    for (const m of p.melds) tiles.push(...m.tileKeys);
    tiles.push(...p.pair.tileKeys);
    // concealed（手牌内で成立した面子）は open:false, kan:false（符計算用）
    const concealed = p.melds.map((m) => ({ ...m, open: false, kan: false }));
    list.push({ kind: "standard", melds: opens.concat(concealed), pair: p.pair, tiles });
  }
  // 七対子は門前（副露なし）かつ concealed 14 枚のときのみ
  if (analysis.chiitoitsu && opens.length === 0) {
    list.push({ kind: "chiitoitsu", melds: [], pair: null, tiles: analysis.tileKeys.slice() });
  }
  return list;
}

/**
 * 手牌評価。最も翻数の高い structure を採用。
 * @param {object} analysis analyzeHand の結果
 * @param {object} ctx { menzen, tsumo, riichi, openMelds? }
 * @param {object} catalog
 * @param {Array} yakuList 有効な役定義（BASE_YAKU から絞り込み + custom）
 * @returns {{ totalHan:number, yaku:Array<{name:string,han:number}>, structure:object }|null}
 */
export function evaluateHand(analysis, ctx, catalog, yakuList) {
  if (!analysis.isAgari) return null;
  const structures = structuresFromAnalysis(analysis, ctx.openMelds);
  let best = null;
  for (const st of structures) {
    const applied = [];
    let total = 0;
    for (const y of yakuList) {
      if (y.menzenOnly && !ctx.menzen) continue;
      const han = y.evaluate(st, ctx, catalog) || 0;
      if (han > 0) {
        applied.push({ name: y.name, han });
        total += han;
      }
    }
    if (!best || total > best.totalHan) {
      best = { totalHan: total, yaku: applied, structure: st };
    }
  }
  return best;
}
