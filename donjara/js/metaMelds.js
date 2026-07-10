/**
 * 数字（orderIndex）以外の面子ルール: ユニット=順子 / 学年=刻子（同一コンテンツ内）。
 */
import { seriesDef } from "./memberData.js";

/** @param {string[]} ids */
function combosOf3(ids) {
  if (ids.length < 3) return [];
  if (ids.length === 3) return [ids.slice()];
  const out = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      for (let k = j + 1; k < ids.length; k++) out.push([ids[i], ids[j], ids[k]]);
    }
  }
  return out;
}

/** スート内のユニット順子・学年刻子パターン一覧（分解用）。 */
export function metaMeldPatterns(suit, catalog) {
  const def = seriesDef(suit);
  if (!def) return { unitSeqs: [], gradeTrips: [] };
  const unitSeqs = [];
  for (const [unit, ids] of Object.entries(def.units)) {
    for (const combo of combosOf3(ids)) {
      const keys = combo.map((id) => `${suit}-${id}`);
      if (keys.every((k) => catalog.byKey.has(k))) {
        unitSeqs.push({ type: "sequence", suit, tileKeys: keys, metaKind: "unit", unit });
      }
    }
  }
  const gradeTrips = [];
  for (const [grade, ids] of Object.entries(def.grades)) {
    for (const combo of combosOf3(ids)) {
      const keys = combo.map((id) => `${suit}-${id}`);
      if (keys.every((k) => catalog.byKey.has(k))) {
        gradeTrips.push({ type: "triplet", suit, tileKeys: keys, metaKind: "grade", grade: Number(grade) });
      }
    }
  }
  return { unitSeqs, gradeTrips };
}

/**
 * チー候補（ユニット順子）: 打牌 + 手牌2枚でユニット3人揃い。
 */
export function chiOptionsMeta(hand, discardKey, catalog) {
  const t = catalog.byKey.get(discardKey);
  if (!t || t.kind !== "member") return [];
  const suit = t.contentId;
  const def = seriesDef(suit);
  if (!def) return [];
  const countKey = (key) => hand.filter((k) => k === key).length;
  const opts = [];
  const seen = new Set();

  for (const ids of Object.values(def.units)) {
    if (!ids.includes(t.charId) || ids.length < 3) continue;
    for (const combo of combosOf3(ids)) {
      if (!combo.includes(t.charId)) continue;
      const keys = combo.map((id) => `${suit}-${id}`);
      const handKeys = keys.filter((k) => k !== discardKey);
      if (handKeys.length !== 2) continue;
      if (!handKeys.every((k) => countKey(k) >= 1)) continue;
      const sig = handKeys.slice().sort().join("|");
      if (seen.has(sig)) continue;
      seen.add(sig);
      opts.push({ tiles: handKeys });
    }
  }
  return opts;
}
