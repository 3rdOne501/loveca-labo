/**
 * 設定（コンテンツ/キャラ ON-OFF・枚数指定・有効役）と山（壁）生成。
 * localStorage に永続化。
 */

import { CONTENTS, HONOR_TILES } from "./contents.js";
import { BASE_YAKU, createCustomYaku } from "./yaku.js";
import { MATCH_MODES } from "./match.js";

const STORAGE_KEY = "donjara_config_v1";
export const DEFAULT_COPIES = 4;

/**
 * catalog から既定設定を作る（live コンテンツ・全キャラ・全字牌 ON、各 4 枚、全基本役 ON）。
 */
export function defaultConfig(catalog) {
  const contents = {};
  for (const c of CONTENTS) {
    const chars = {};
    const list = catalog.byContent.get(c.id) || [];
    for (const t of list) chars[t.charId] = c.live; // 保留コンテンツは既定 OFF
    contents[c.id] = { enabled: c.live, chars };
  }
  const honors = {};
  for (const h of HONOR_TILES) honors[h.id] = { enabled: true };

  const yakuEnabled = {};
  for (const y of BASE_YAKU) yakuEnabled[y.id] = true;

  return {
    version: 1,
    showTileNumbers: false,
    defaultCopies: DEFAULT_COPIES,
    copies: {}, // tileKey -> 枚数（個別上書き）
    contents,
    honors,
    yaku: { enabled: yakuEnabled, custom: [] },
    players: 4,
    handSize: 13,
    matchMode: "tonpu", // single | tonpu | hanchan
  };
}

/** 保存済み設定を catalog の既定にマージして返す（新キャラ追加にも追従）。 */
export function loadConfig(catalog) {
  const base = defaultConfig(catalog);
  let saved = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (_) {
    saved = null;
  }
  if (!saved || typeof saved !== "object") return base;

  // 浅めのマージ（既定を土台に保存値で上書き）
  const merged = { ...base, ...saved };
  merged.showTileNumbers = saved.showTileNumbers === true;
  merged.defaultCopies = Number(saved.defaultCopies) || base.defaultCopies;
  merged.copies = { ...(saved.copies || {}) };
  merged.players = Number(saved.players) || base.players;
  merged.handSize = Number(saved.handSize) || base.handSize;
  merged.matchMode = MATCH_MODES[saved.matchMode] ? saved.matchMode : base.matchMode;

  merged.contents = {};
  for (const c of CONTENTS) {
    const b = base.contents[c.id];
    const s = saved.contents && saved.contents[c.id];
    const chars = { ...b.chars };
    if (s && s.chars) for (const k of Object.keys(chars)) if (k in s.chars) chars[k] = !!s.chars[k];
    merged.contents[c.id] = { enabled: s ? !!s.enabled : b.enabled, chars };
  }
  merged.honors = {};
  for (const h of HONOR_TILES) {
    const s = saved.honors && saved.honors[h.id];
    merged.honors[h.id] = { enabled: s ? !!s.enabled : base.honors[h.id].enabled };
  }
  merged.yaku = {
    enabled: { ...base.yaku.enabled, ...(saved.yaku && saved.yaku.enabled) },
    custom: Array.isArray(saved.yaku && saved.yaku.custom) ? saved.yaku.custom : [],
  };
  return merged;
}

export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("[donjara] 設定保存に失敗:", e);
  }
}

/** tile 1 種の採用枚数（0 なら山に入れない） */
export function copiesForTile(config, tile) {
  if (tile.kind === "honor") {
    if (!config.honors[tile.honorId] || !config.honors[tile.honorId].enabled) return 0;
  } else {
    const c = config.contents[tile.contentId];
    if (!c || !c.enabled) return 0;
    if (!c.chars[tile.charId]) return 0;
  }
  if (tile.key in config.copies) {
    const n = Number(config.copies[tile.key]);
    return Number.isFinite(n) && n >= 0 ? n : config.defaultCopies;
  }
  return config.defaultCopies;
}

/**
 * 山（壁）を生成。tileKey の配列（重複あり・未シャッフル）を返す。
 * @returns {{ wall:string[], byTile:Array<{tile:object,count:number}>, total:number }}
 */
export function buildWall(config, catalog) {
  const wall = [];
  const byTile = [];
  for (const tile of catalog.types) {
    const n = copiesForTile(config, tile);
    if (n <= 0) continue;
    for (let i = 0; i < n; i++) wall.push(tile.key);
    byTile.push({ tile, count: n });
  }
  return { wall, byTile, total: wall.length };
}

/** 有効な役定義（基本役 + カスタム）を返す */
export function enabledYaku(config, catalog) {
  const list = [];
  for (const y of BASE_YAKU) {
    if (config.yaku.enabled[y.id] !== false) list.push(y);
  }
  for (const spec of config.yaku.custom || []) {
    try {
      list.push(createCustomYaku(spec.template, spec.params || {}));
    } catch (e) {
      console.warn("[donjara] カスタム役の生成に失敗:", spec, e);
    }
  }
  return list;
}

/** 面子ルール（数字表示設定に連動）。 */
export { meldOptionsFromConfig } from "./meldRules.js";
