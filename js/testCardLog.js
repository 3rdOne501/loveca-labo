/**
 * テストカード（オリカ）採用時の設定スナップショットを localStorage に蓄積する。
 * デッキ構築の「商品」→「テストカードログ」で一覧表示（通常検索・他商品フィルタではヒットしない）。
 */

import { STORAGE_TEST_CARD_LOG } from "./config.js";

const MAX_ENTRIES = 24;
const MAX_CUSTOM_IMG_CHARS = 380000;

/**
 * @typedef {{
 *   savedAt: string,
 *   baseCardNo: string,
 *   options: {
 *     slot?: number,
 *     customName?: string,
 *     blade?: number,
 *     baseHeart?: Record<string, number>,
 *     liveScore?: number,
 *     needHeart?: Record<string, number>,
 *     customImg?: string,
 *   },
 * }} TestCardLogEntry
 */

function safeParse(raw) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

/** @returns {TestCardLogEntry[]} */
export function getTestCardLogEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_TEST_CARD_LOG);
    if (!raw) return [];
    const arr = safeParse(raw);
    return arr.filter(function (e) {
      return e && typeof e.baseCardNo === "string" && e.baseCardNo.trim() && e.options && typeof e.options === "object";
    });
  } catch (_) {
    return [];
  }
}

/** キャッシュキー用（件数＋末尾の保存時刻） */
export function getTestCardLogCacheSig() {
  const a = getTestCardLogEntries();
  if (!a.length) return "0";
  const last = a[a.length - 1];
  return String(a.length) + ":" + String((last && last.savedAt) || "");
}

export function appendTestCardLogEntry(payload) {
  const base = String((payload && payload.baseCardNo) || "").trim();
  if (!base) return false;
  const opts = payload && payload.options && typeof payload.options === "object" ? { ...payload.options } : {};
  if (opts.customImg && String(opts.customImg).length > MAX_CUSTOM_IMG_CHARS) {
    delete opts.customImg;
  }
  const ent = {
    savedAt: new Date().toISOString(),
    baseCardNo: base,
    options: opts,
  };
  let list = getTestCardLogEntries();
  list.push(ent);
  if (list.length > MAX_ENTRIES) list = list.slice(list.length - MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_TEST_CARD_LOG, JSON.stringify(list));
    return true;
  } catch (_) {
    return false;
  }
}
