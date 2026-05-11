/**
 * メインデッキとは別ストレージの「名前付きプリセット」（複数保存）
 */
import { MAX_COPIES_PER_CARD, MAX_SAVED_DECKS, STORAGE_DECK_LIBRARY } from "./config.js";
import { showToast } from "./ui.js";

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadDeckLibrary() {
  const parsed = safeParse(localStorage.getItem(STORAGE_DECK_LIBRARY));
  if (!parsed || !Array.isArray(parsed.slots)) return { slots: [] };
  const slots = parsed.slots
    .filter(
      (s) => s && typeof s.id === "string" && typeof s.name === "string" && s.deck && typeof s.deck === "object",
    )
    .map((s) => ({
      ...s,
      thumbnailCardNo:
        typeof s.thumbnailCardNo === "string" && s.thumbnailCardNo.trim()
          ? s.thumbnailCardNo.trim()
          : "",
    }));
  return { slots };
}

export function persistDeckLibrary(data) {
  try {
    localStorage.setItem(STORAGE_DECK_LIBRARY, JSON.stringify({ v: 1, slots: data.slots }));
  } catch (err) {
    console.error(err);
    showToast(
      err && err.name === "QuotaExceededError"
        ? "保存デッキ一覧の容量が足りません。古いプリセットを削除するか、ブラウザのサイトデータを空けてください。"
        : "デッキプリセットの保存に失敗しました。",
    );
  }
}

/** @param {unknown} v */
function coerceDeckCount(v) {
  var n = 0;
  if (typeof v === "number" && Number.isFinite(v)) n = Math.floor(v);
  else if (typeof v === "string") n = parseInt(String(v).trim(), 10);
  if (!Number.isInteger(n) || n <= 0) return 0;
  return Math.min(n, MAX_COPIES_PER_CARD);
}

/**
 * 枚数を正規化（文字列の "4" や古いデータの表記ゆれを捨てない）。
 * @param {Record<string, unknown> | null | undefined} map
 * @returns {Record<string, number>}
 */
export function normalizeDeckMapCounts(map) {
  const o = {};
  for (const [k, v] of Object.entries(map || {})) {
    const n = coerceDeckCount(v);
    if (n <= 0) continue;
    o[String(k)] = n;
  }
  return o;
}

/**
 * localStorage とメモリのどちらか一方だけ欠けてもプレイ用構成が空にならないようまとめる（mem が優先）。
 * @param {Record<string, unknown>|null|undefined} mem
 * @param {Record<string, unknown>|null|undefined} disk
 */
export function mergeDeckMapsForPlay(mem, disk) {
  return normalizeDeckMapCounts({ ...(disk || {}), ...(mem || {}) });
}

export function cloneDeckMap(map) {
  return normalizeDeckMapCounts(map);
}

/** @param {unknown} arr */
function sanitizeCardNoList(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const s = x != null ? String(x).trim() : "";
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function newSlotId() {
  return "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

/**
 * @param {{ keyCardNos?: string[] | undefined, keyCard2Nos?: string[] | undefined, keyCard3Nos?: string[] | undefined, middleCardNos?: string[] | undefined }} [roleLabels]
 */
export function addDeckSlot(lib, name, deckMap, roleLabels) {
  const nm = String(name || "").trim() || "無題のデッキ";
  const k = roleLabels ? sanitizeCardNoList(roleLabels.keyCardNos) : [];
  const k2 = roleLabels ? sanitizeCardNoList(roleLabels.keyCard2Nos) : [];
  const k3 = roleLabels ? sanitizeCardNoList(roleLabels.keyCard3Nos) : [];
  const m = roleLabels ? sanitizeCardNoList(roleLabels.middleCardNos) : [];
  const slots = [
    ...lib.slots,
    {
      id: newSlotId(),
      name: nm,
      deck: cloneDeckMap(deckMap),
      keyCardNos: k,
      keyCard2Nos: k2,
      keyCard3Nos: k3,
      middleCardNos: m,
      updatedAt: new Date().toISOString(),
    },
  ];
  while (slots.length > MAX_SAVED_DECKS) slots.shift();
  return { slots };
}

/**
 * @param {{ keyCardNos?: string[] | undefined, keyCard2Nos?: string[] | undefined, keyCard3Nos?: string[] | undefined, middleCardNos?: string[] | undefined }} [roleLabels]
 */
/** @param {string} th */
function thumbnailValidForDeck(th, map) {
  const t = String(th || "").trim();
  return t && (map[t] || 0) > 0 ? t : "";
}

export function updateDeckSlot(lib, id, deckMap, roleLabels) {
  const k = roleLabels ? sanitizeCardNoList(roleLabels.keyCardNos) : [];
  const k2 = roleLabels ? sanitizeCardNoList(roleLabels.keyCard2Nos) : [];
  const k3 = roleLabels ? sanitizeCardNoList(roleLabels.keyCard3Nos) : [];
  const m = roleLabels ? sanitizeCardNoList(roleLabels.middleCardNos) : [];
  const hasThumbPick =
    roleLabels &&
    typeof roleLabels === "object" &&
    Object.prototype.hasOwnProperty.call(roleLabels, "thumbnailCardNo");
  const thumbInput = hasThumbPick ? String(roleLabels.thumbnailCardNo ?? "").trim() : "";
  const nextDeck = cloneDeckMap(deckMap);
  const slots = lib.slots.map((s) => {
    if (s.id !== id) return s;
    let nextThumb;
    if (hasThumbPick) {
      nextThumb = thumbInput ? thumbnailValidForDeck(thumbInput, nextDeck) : "";
    } else {
      nextThumb = thumbnailValidForDeck(s.thumbnailCardNo || "", nextDeck);
    }
    return {
      ...s,
      deck: nextDeck,
      keyCardNos: k,
      keyCard2Nos: k2,
      keyCard3Nos: k3,
      middleCardNos: m,
      thumbnailCardNo: nextThumb || "",
      updatedAt: new Date().toISOString(),
    };
  });
  return { slots };
}

export function removeDeckSlot(lib, id) {
  return { slots: lib.slots.filter((s) => s.id !== id) };
}

/** 選択中プリセットを別 ID で複製して末尾に追加 */
export function duplicateDeckSlot(lib, id) {
  const s = lib.slots.find((x) => x.id === id);
  if (!s) return lib;
  const nm = String(s.name || "無題のデッキ").trim();
  const copy = {
    id: newSlotId(),
    name: nm + " のコピー",
    deck: cloneDeckMap(s.deck),
    keyCardNos: Array.isArray(s.keyCardNos) ? sanitizeCardNoList(s.keyCardNos) : [],
    keyCard2Nos: Array.isArray(s.keyCard2Nos) ? sanitizeCardNoList(s.keyCard2Nos) : [],
    keyCard3Nos: Array.isArray(s.keyCard3Nos) ? sanitizeCardNoList(s.keyCard3Nos) : [],
    middleCardNos: Array.isArray(s.middleCardNos) ? sanitizeCardNoList(s.middleCardNos) : [],
    thumbnailCardNo:
      typeof s.thumbnailCardNo === "string" && s.thumbnailCardNo.trim()
        ? s.thumbnailCardNo.trim()
        : "",
    updatedAt: new Date().toISOString(),
  };
  const slots = [...lib.slots, copy];
  while (slots.length > MAX_SAVED_DECKS) slots.shift();
  return { slots };
}
