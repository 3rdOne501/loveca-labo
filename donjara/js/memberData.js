/**
 * メンバー内部データ（学年・所属ユニット・作品）。
 * 後々「役」に利用するための正本メタデータ。
 *
 * - grade: 1|2|3（学年）。null は学年不定（他校のライバル等）。
 * - unit:  所属ミニユニット名（無所属は null）。
 * - work:  作品名（コンテンツ単位。CONTENT_WORK から自動付与）。
 *
 * 出典（2026-07 時点の公式／ファン資料で確認）:
 *   μ's / Aqours … 音ノ木坂・浦の星の通常学年、公式ユニット編成。
 *   虹ヶ咲       … lovelive-anime.jp メンバー紹介 + Wikipedia（DiverDiva/A・ZU・NA/QU4RTZ/R3BIRTH）。
 *   Liella!      … 全11人集合時点（アニメ3期）の学年。1期生=3年/2期生=2年/3期生=1年。
 *                  ユニット CatChu!/KALEIDOSCORE/5yncri5e!。
 *   蓮ノ空       … 104期スナップショット（3ユニット×3人が揃う時期）を基準に学年付与。
 *                  102期生=3年 / 103期生=2年 / 104期生=1年。Edel Note は105期加入。
 *
 * 学年は作品進行で変動する（特に Liella!/蓮ノ空）。ここでは「代表的な一時点」の値を採用する。
 */

/** コンテンツ id → 作品名。 */
export const CONTENT_WORK = {
  muse: "ラブライブ！",
  aqours: "ラブライブ！サンシャイン!!",
  nijigasaki: "ラブライブ！虹ヶ咲学園スクールアイドル同好会",
  liella: "ラブライブ！スーパースター!!",
  hasunosora: "ラブライブ！蓮ノ空女学院スクールアイドルクラブ",
  ikizuraibu: "イキヅライブ！",
  sukumyu: "スクールアイドルミュージカル",
};

/**
 * series（=content.id）ごとの定義。
 *   units:  ユニット名 → メンバー id[]
 *   grades: 学年(1|2|3) → メンバー id[]
 */
const DEF = {
  muse: {
    units: {
      Printemps: ["honoka", "kotori", "hanayo"],
      "lily white": ["umi", "rin", "nozomi"],
      BiBi: ["eli", "maki", "nico"],
    },
    grades: {
      3: ["eli", "nozomi", "nico"],
      2: ["honoka", "kotori", "umi"],
      1: ["rin", "maki", "hanayo"],
    },
  },
  aqours: {
    units: {
      "CYaRon！": ["chika", "you", "ruby"],
      AZALEA: ["kanan", "dia", "hanamaru"],
      "Guilty Kiss": ["riko", "yoshiko", "mari"],
      "Saint Snow": ["seira", "leah"],
    },
    grades: {
      3: ["kanan", "dia", "mari", "seira"],
      2: ["chika", "riko", "you"],
      1: ["yoshiko", "hanamaru", "ruby", "leah"],
    },
  },
  nijigasaki: {
    units: {
      "A・ZU・NA": ["ayumu", "shizuku", "setsuna"],
      QU4RTZ: ["kasumi", "kanata", "emma", "rina"],
      DiverDiva: ["karin", "ai"],
      R3BIRTH: ["shioriko", "mia", "lanzhu"],
    },
    grades: {
      3: ["karin", "kanata", "emma", "mia"],
      2: ["yu", "ayumu", "ai", "setsuna", "lanzhu"],
      1: ["kasumi", "shizuku", "rina", "shioriko"],
    },
  },
  liella: {
    units: {
      "CatChu!": ["kanon", "sumire", "mei"],
      KALEIDOSCORE: ["keke", "ren", "margarete"],
      "5yncri5e!": ["chisato", "kinako", "shiki", "natsumi", "tomari"],
      サニーパッション: ["yuuna", "mao"],
    },
    grades: {
      3: ["kanon", "keke", "chisato", "sumire", "ren"],
      2: ["kinako", "mei", "shiki", "natsumi"],
      1: ["margarete", "tomari"],
    },
  },
  hasunosora: {
    units: {
      スリーズブーケ: ["kaho", "shao", "ginko"],
      DOLLCHESTRA: ["sayaka", "tsuzuri", "kosuzu"],
      "みらくらぱーく！": ["rurino", "yoshino", "hime"],
      "Edel Note": ["ceras", "izumi"],
    },
    grades: {
      3: ["shao", "tsuzuri", "yoshino"],
      2: ["kaho", "sayaka", "rurino", "izumi"],
      1: ["ginko", "kosuzu", "hime", "ceras"],
    },
  },
};

/** `${series}-${id}` → { grade, unit, work } のフラットな索引を構築。 */
function buildIndex() {
  const map = new Map();
  for (const [series, def] of Object.entries(DEF)) {
    const gradeOf = {};
    for (const [g, ids] of Object.entries(def.grades)) {
      for (const id of ids) gradeOf[id] = Number(g);
    }
    const unitOf = {};
    for (const [u, ids] of Object.entries(def.units)) {
      for (const id of ids) unitOf[id] = u;
    }
    const ids = new Set([...Object.keys(gradeOf), ...Object.keys(unitOf)]);
    for (const id of ids) {
      map.set(`${series}-${id}`, {
        grade: gradeOf[id] ?? null,
        unit: unitOf[id] ?? null,
        work: CONTENT_WORK[series] || null,
      });
    }
  }
  return map;
}

const INDEX = buildIndex();

/**
 * メンバー牌のメタデータを取得。
 * @param {string} series content.id（= series）
 * @param {string} charId ロスター id
 * @returns {{grade:number|null, unit:string|null, work:string|null}|null}
 */
export function memberMeta(series, charId) {
  return INDEX.get(`${series}-${charId}`) || null;
}

/** 学年ラベル（1→"1年生"）。null は "―"。 */
export function gradeLabel(grade) {
  return grade == null ? "―" : `${grade}年生`;
}

/** DEF を外部から参照（手牌分析用）。 */
export function seriesDef(series) {
  return DEF[series] || null;
}

/**
 * 手牌+副露牌から、揃ったユニット・学年を検出。
 * @param {string[]} tileKeys 牌キー配列
 * @param {object} catalog
 * @returns {{ completeUnits: {series:string, unit:string}[], completeGrades: {series:string, grade:number}[] }}
 */
export function detectHandCombos(tileKeys, catalog) {
  const bySeries = new Map();
  for (const k of tileKeys) {
    const t = catalog.byKey.get(k);
    if (!t || t.kind !== "member") continue;
    if (!bySeries.has(t.contentId)) bySeries.set(t.contentId, new Set());
    bySeries.get(t.contentId).add(t.charId);
  }
  const completeUnits = [];
  const completeGrades = [];
  for (const [series, ids] of bySeries) {
    const def = DEF[series];
    if (!def) continue;
    for (const [unit, members] of Object.entries(def.units)) {
      if (members.every((id) => ids.has(id))) completeUnits.push({ series, unit });
    }
    for (const [g, members] of Object.entries(def.grades)) {
      if (members.every((id) => ids.has(id))) completeGrades.push({ series, grade: Number(g) });
    }
  }
  return { completeUnits, completeGrades };
}

/**
 * 揃ったユニット/学年ごとに、手牌から対応する牌キーを1枚ずつ拾う。
 * ユニット=順子扱い / 学年=刻子扱い（UI 表示用）。
 * @returns {{ type:"unit"|"grade", series:string, unit?:string, grade?:number, tileKeys:string[], memberIds:string[] }[]}
 */
export function resolveHandComboGroups(tileKeys, catalog) {
  const { completeUnits, completeGrades } = detectHandCombos(tileKeys, catalog);
  const groups = [];

  const pickKeys = (series, memberIds) => {
    const need = new Set(memberIds);
    const picked = [];
    for (const k of tileKeys) {
      const t = catalog.byKey.get(k);
      if (!t || t.kind !== "member" || t.contentId !== series || !need.has(t.charId)) continue;
      if (picked.some((pk) => catalog.byKey.get(pk)?.charId === t.charId)) continue;
      picked.push(k);
      need.delete(t.charId);
    }
    return need.size === 0 ? picked : [];
  };

  for (const u of completeUnits) {
    const def = DEF[u.series];
    if (!def) continue;
    const memberIds = def.units[u.unit];
    if (!memberIds) continue;
    const tileKeysPicked = pickKeys(u.series, memberIds);
    if (tileKeysPicked.length) {
      groups.push({ type: "unit", series: u.series, unit: u.unit, tileKeys: tileKeysPicked, memberIds });
    }
  }
  for (const g of completeGrades) {
    const def = DEF[g.series];
    if (!def) continue;
    const memberIds = def.grades[String(g.grade)];
    if (!memberIds) continue;
    const tileKeysPicked = pickKeys(g.series, memberIds);
    if (tileKeysPicked.length) {
      groups.push({ type: "grade", series: g.series, grade: g.grade, tileKeys: tileKeysPicked, memberIds });
    }
  }
  return groups;
}

/**
 * 手牌のみから揃いを検出（手牌インデックス付き）。
 * kind: "unit" = ミニユニット / "group" = 学年揃い（グループロゴ表示）
 */
export function resolveHandComboGroupsIndexed(pl, catalog) {
  const { completeUnits, completeGrades } = detectHandCombos(pl.hand, catalog);
  const groups = [];

  const pickIndices = (series, memberIds) => {
    const need = new Set(memberIds);
    const picked = [];
    for (let i = 0; i < pl.hand.length; i++) {
      const k = pl.hand[i];
      const t = catalog.byKey.get(k);
      if (!t || t.kind !== "member" || t.contentId !== series || !need.has(t.charId)) continue;
      if (picked.some((pi) => catalog.byKey.get(pl.hand[pi])?.charId === t.charId)) continue;
      picked.push(i);
      need.delete(t.charId);
    }
    return need.size === 0 ? picked : [];
  };

  for (const u of completeUnits) {
    const memberIds = DEF[u.series]?.units[u.unit];
    if (!memberIds) continue;
    const handIndices = pickIndices(u.series, memberIds);
    if (handIndices.length) {
      groups.push({ kind: "unit", series: u.series, unit: u.unit, handIndices });
    }
  }
  for (const g of completeGrades) {
    const memberIds = DEF[g.series]?.grades[String(g.grade)];
    if (!memberIds) continue;
    const handIndices = pickIndices(g.series, memberIds);
    if (handIndices.length) {
      groups.push({ kind: "group", series: g.series, grade: g.grade, handIndices });
    }
  }
  return groups;
}

/** クラスタ表示に使う牌キーの集合。 */
export function comboClusterKeySet(groups) {
  const s = new Set();
  for (const g of groups) for (const k of g.tileKeys) s.add(k);
  return s;
}

/** プレイヤーの全牌（手牌+ツモ+副露）キー配列。 */
export function playerTileKeys(pl) {
  const keys = pl.hand.slice();
  if (pl.drawn) keys.push(pl.drawn);
  for (const m of pl.melds || []) keys.push(...(m.tiles || []));
  return keys;
}
