import {
  DECK_EXPORT_VERSION,
  DEFAULT_STARTER_DECK_MAP,
  DEFAULT_STARTER_KEY2_CARD_NOS,
  DEFAULT_STARTER_KEY3_CARD_NOS,
  DEFAULT_STARTER_KEY_CARD_NOS,
  DEFAULT_STARTER_MIDDLE_CARD_NOS,
  FIRST_VISIT_CATALOG_PRODUCT_EXACT,
  MAX_COPIES_PER_CARD,
  MAX_LIVE_IN_MAIN,
  MAX_MEMBER_IN_MAIN,
  MAIN_SIZE,
  STORAGE_ACTIVE_PRESET_ID,
  STORAGE_CATALOG_INITIAL_FILTER_APPLIED,
  STORAGE_DECK,
  T_LIVE,
  T_MEMBER,
} from "./config.js";
import {
  addDeckSlot,
  cloneDeckMap,
  duplicateDeckSlot,
  isBuiltInStarterDeckId,
  loadDeckLibrary,
  persistDeckLibrary,
  removeDeckSlot,
  updateDeckSlot,
} from "./deckLibrary.js";
import {
  UNSET_PLACEHOLDER_PRODUCT,
  ensureTestCardVariant,
  effectiveMainDeckCategory,
  filterCards,
  getAllCards,
  getCard,
  getCardCatalogSnapshot,
  catalogListThumbnailUrl,
  uniqueCosts,
  uniqueProducts,
  uniqueSeries,
  uniqueUnits,
} from "./cards.js";
import { parseDeckTextRecipe } from "./decklogImport.js";
import { showToast } from "./ui.js";
import {
  bladeHeartAggregatePillHtml,
  bladeHeartRowIconsHtml,
  cardHasBladeHeart,
  compareBladeHeartDbKeys,
} from "./bladeHeart.js";

let deckBuilderStorageFlushHooked = false;

/**
 * デッキ内の blade_heart について、キーごとに「カード DB の値 × 収録枚数」を足します。
 * byKeyAdditive は<strong>ライブカード</strong>（種別がライブかつ blade_heart あり）貢献分のみ。
 * @param {Record<string, number>} deckMap
 * @returns {{ byKey: Record<string, number>, byKeyAdditive: Record<string, number>, totalWeighted: number }}
 */
function accumulateBladeHeartWeighted(deckMap) {
  /** @type {Record<string, number>} */
  const byKey = {};
  /** @type {Record<string, number>} */
  const byKeyAdditive = {};
  let totalWeighted = 0;
  for (const [no, n] of Object.entries(deckMap)) {
    if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) continue;
    const c = getCard(no);
    if (!c || !cardHasBladeHeart(c)) continue;
    const bh = c.blade_heart;
    if (!bh || typeof bh !== "object" || Array.isArray(bh)) continue;
    const scoreNote = c.type === T_LIVE;
    for (const [key, raw] of Object.entries(bh)) {
      const v = Number(raw);
      if (!Number.isFinite(v) || v === 0) continue;
      const add = v * n;
      byKey[key] = (byKey[key] || 0) + add;
      if (scoreNote) byKeyAdditive[key] = (byKeyAdditive[key] || 0) + add;
      totalWeighted += add;
    }
  }
  return { byKey, byKeyAdditive, totalWeighted };
}

/**
 * BH 色ピルと同系の見た目で、非BH メンバー／非BH ライブ／♪ライブ BH 枚数を出す。
 * @param {number} nonBhMemberCopies
 * @param {number} nonBhLiveCopies
 * @param {number} liveBhCopies BH 記載のライブ枚数（♪由来分は色ピル側の title で示す）
 */
function formatDeckPeekSyntheticBhPillsHtml(nonBhMemberCopies, nonBhLiveCopies, liveBhCopies) {
  let html = "";
  if (nonBhMemberCopies > 0) {
    html +=
      '<span class="deck-peek-bh-color-pill deck-peek-bh-pill--nonbh-mem" title="' +
      escapeHtml("メンバーカードで BH 記載なし") +
      '"><span class="deck-peek-bh-kanji">メン非BH</span><span class="deck-peek-bh-pill-qty">× ' +
      nonBhMemberCopies +
      "</span></span>";
  }
  if (nonBhLiveCopies > 0) {
    html +=
      '<span class="deck-peek-bh-color-pill deck-peek-bh-pill--nonbh-live" title="' +
      escapeHtml("ライブカードで BH 記載なし") +
      '"><span class="deck-peek-bh-kanji">ライブ非BH</span><span class="deck-peek-bh-pill-qty">× ' +
      nonBhLiveCopies +
      "</span></span>";
  }
  if (liveBhCopies > 0) {
    html +=
      '<span class="deck-peek-bh-color-pill deck-peek-bh-pill--live-note" title="' +
      escapeHtml("ライブカードの BH（♪で追加カウントされる分を含む）") +
      '"><span class="deck-peek-bh-kanji">♪ライブBH</span><span class="deck-peek-bh-pill-qty">× ' +
      liveBhCopies +
      "</span></span>";
  }
  return html;
}

/**
 * @param {Record<string, number>} byKey
 * @param {number} totalWeighted
 * @param {number} bhMemberCopies
 * @param {number} bhLiveCopies
 * @param {number} nonBhMemberCopies
 * @param {number} nonBhLiveCopies
 */
function formatBladeHeartBlockHtml(
  byKey,
  totalWeighted,
  bhMemberCopies,
  bhLiveCopies,
  nonBhMemberCopies,
  nonBhLiveCopies,
  byKeyAdditive,
) {
  const entries = Object.entries(byKey).sort(function (a, b) {
    return compareBladeHeartDbKeys(a[0], b[0]);
  });
  const cardLine =
    '<div class="deck-peek-bh-total-line"><strong>BH 記載</strong> メンバー <span class="deck-peek-accent">' +
    bhMemberCopies +
    '</span> · ライブ <span class="deck-peek-accent">' +
    bhLiveCopies +
    '</span> · 非BH メンバー <span class="deck-peek-muted-num">' +
    nonBhMemberCopies +
    '</span> · 非BHライブ <span class="deck-peek-muted-num">' +
    nonBhLiveCopies +
    "</span></div>";

  const synthetic = formatDeckPeekSyntheticBhPillsHtml(nonBhMemberCopies, nonBhLiveCopies, bhLiveCopies);

  if (entries.length === 0) {
    let body = cardLine;
    if (synthetic) {
      body +=
        '<div class="deck-peek-bh-total-line">BH計 <span class="deck-peek-bh-num-strong">0</span></div>' +
        '<div class="deck-peek-bh-pills">' +
        synthetic +
        "</div>";
    } else {
      body += '<p class="deck-peek-bh-muted" style="margin:0.25rem 0 0">このデッキに BH はありません。</p>';
    }
    return '<div class="deck-peek-bh-block">' + body + "</div>";
  }

  const pills = entries
    .map(function (ent) {
      return bladeHeartAggregatePillHtml(ent[0], ent[1], byKeyAdditive[ent[0]] || 0);
    })
    .join("");

  return (
    '<div class="deck-peek-bh-block">' +
    cardLine +
    '<div class="deck-peek-bh-total-line">BH計 <span class="deck-peek-bh-num-strong">' +
    totalWeighted +
    "</span></div>" +
    '<div class="deck-peek-bh-pills">' +
    pills +
    synthetic +
    "</div></div>"
  );
}

function countMain(deckMap) {
  let m = 0;
  let l = 0;
  for (const [no, n] of Object.entries(deckMap)) {
    const c = getCard(no);
    if (!c) continue;
    if (c.type === T_MEMBER) m += n;
    else if (c.type === T_LIVE) l += n;
  }
  return { m, l, total: m + l };
}

/** デッキ枚数チェックなど（自動では弾ききれない件も含める） */
function computeDeckWarnings(deckMap) {
  const warnings = [];
  const { m, l, total } = countMain(deckMap);

  for (const [no, n] of Object.entries(deckMap)) {
    if (n <= 0) continue;
    if (!getCard(no)) warnings.push("未登録のカード番号: " + no + "（×" + n + "）");
    if (n > MAX_COPIES_PER_CARD) {
      warnings.push(no + " が同一 " + MAX_COPIES_PER_CARD + " 枚を超えています（×" + n + "）");
    }
  }
  if (m > MAX_MEMBER_IN_MAIN) {
    warnings.push(
      "メンバーが公式目安を超えています（" + m + " / " + MAX_MEMBER_IN_MAIN + "）。ソロではこのまま続行できます。",
    );
  }
  if (l > MAX_LIVE_IN_MAIN) {
    warnings.push(
      "ライブが公式目安を超えています（" + l + " / " + MAX_LIVE_IN_MAIN + "）。ソロではこのまま続行できます。",
    );
  }
  if (total !== MAIN_SIZE && total > 0) {
    warnings.push(
      "メインデッキは公式目安 " +
        MAIN_SIZE +
        " 枚ですが、現在 " +
        total +
        " 枚です（オーバー／不足でもソロでは開始できます）。",
    );
  }
  return warnings;
}

function emptyDeckBundle() {
  return { map: {}, keyCardNos: [], keyCard2Nos: [], keyCard3Nos: [], middleCardNos: [] };
}

/** @param {unknown} raw */
function normalizeDeckStorage(raw) {
  if (!raw || typeof raw !== "object") return emptyDeckBundle();
  /** 新形式: { v, map, keyCardNos, keyCard2Nos?, keyCard3Nos?, middleCardNos } */
  const r = /** @type {{ map?: unknown, keyCardNos?: unknown, keyCard2Nos?: unknown, keyCard3Nos?: unknown, middleCardNos?: unknown }} */ (
    raw
  );
  if (r.map && typeof r.map === "object" && !Array.isArray(r.map)) {
    return {
      map: cloneDeckMap(/** @type {Record<string, number>} */ (r.map)),
      keyCardNos: sanitizeCardNoList(r.keyCardNos),
      keyCard2Nos: sanitizeCardNoList(r.keyCard2Nos),
      keyCard3Nos: sanitizeCardNoList(r.keyCard3Nos),
      middleCardNos: sanitizeCardNoList(r.middleCardNos),
    };
  }
  if (isValidDeckMap(raw)) {
    return { map: cloneDeckMap(raw), keyCardNos: [], keyCard2Nos: [], keyCard3Nos: [], middleCardNos: [] };
  }
  return emptyDeckBundle();
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

export function loadDeckBundleFromStorage() {
  try {
    const t = localStorage.getItem(STORAGE_DECK);
    if (!t) return emptyDeckBundle();
    return normalizeDeckStorage(JSON.parse(t));
  } catch {
    return emptyDeckBundle();
  }
}

/** @deprecated 互換用 — メインは loadDeckBundleFromStorage */
export function loadDeckFromStorage() {
  return loadDeckBundleFromStorage().map;
}

function saveDeckBundleToStorage(bundle) {
  const payload = {
    v: 2,
    map: cloneDeckMap(bundle.map),
    keyCardNos: sanitizeCardNoList(bundle.keyCardNos),
    keyCard2Nos: sanitizeCardNoList(bundle.keyCard2Nos),
    keyCard3Nos: sanitizeCardNoList(bundle.keyCard3Nos),
    middleCardNos: sanitizeCardNoList(bundle.middleCardNos),
  };
  localStorage.setItem(STORAGE_DECK, JSON.stringify(payload));
}

function isValidDeckMap(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  for (const [k, v] of Object.entries(o)) {
    if (typeof k !== "string" || k.length === 0) return false;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_COPIES_PER_CARD) return false;
  }
  return true;
}

function thumbExtraHtml(card) {
  if (card.type === T_MEMBER && card.cost != null && String(card.cost).trim() !== "") {
    return `<span class="thumb-sub">コスト ${escapeHtml(String(card.cost))}</span>`;
  }
  if (card.type === T_LIVE) {
    return `<span class="thumb-sub live">ライブカード</span>`;
  }
  return "";
}

export function initDeckBuilder(root, { onStartGame }) {
  if (!localStorage.getItem(STORAGE_DECK)) {
    saveDeckBundleToStorage({
      map: cloneDeckMap(DEFAULT_STARTER_DECK_MAP),
      keyCardNos: DEFAULT_STARTER_KEY_CARD_NOS,
      keyCard2Nos: DEFAULT_STARTER_KEY2_CARD_NOS,
      keyCard3Nos: DEFAULT_STARTER_KEY3_CARD_NOS,
      middleCardNos: DEFAULT_STARTER_MIDDLE_CARD_NOS,
    });
  }
  const initialBundle = loadDeckBundleFromStorage();
  let deckMap = initialBundle.map;
  /** @type {Set<string>} */
  const keyCardNos = new Set(initialBundle.keyCardNos);
  /** @type {Set<string>} */
  const keyCard2Nos = new Set(initialBundle.keyCard2Nos);
  /** @type {Set<string>} */
  const keyCard3Nos = new Set(initialBundle.keyCard3Nos);
  /** @type {Set<string>} */
  const middleCardNos = new Set(initialBundle.middleCardNos);
  let library = loadDeckLibrary();
  let deckListOpen = false;
  let deckListSort = "name";
  let filterTypes = { [T_MEMBER]: true, [T_LIVE]: true };
  /** @type {"both"|"member"|"live"} */
  let filterCardKind = "both";

  function syncFilterTypesFromKind() {
    if (filterCardKind === "member") filterTypes = { [T_MEMBER]: true, [T_LIVE]: false };
    else if (filterCardKind === "live") filterTypes = { [T_MEMBER]: false, [T_LIVE]: true };
    else filterTypes = { [T_MEMBER]: true, [T_LIVE]: true };
  }
  syncFilterTypesFromKind();
  let searchText = "";
  let filterProduct = "";
  let filterSeries = "";
  let filterUnit = "";
  let deckGridFlushRaf = 0;
  let cardGridVirtualRaf = 0;
  let cardGridVirtualMeasureGuard = 0;
  let cardGridVirtualScrollIdleTimer = 0;
  let cardGridVirtualIsScrolling = false;
  /** @type {{ active: boolean, list: typeof cards, cols: number, rowH: number, w0: number, w1: number, lastPanel: string, lastCount: number, lastOrderedSig: string }} */
  let cardGridVirtual = {
    active: false,
    list: [],
    cols: 8,
    rowH: 228,
    w0: -1,
    w1: -1,
    lastPanel: "",
    lastCount: -1,
    lastOrderedSig: "",
  };
  /** これ未満だと仮想化しないが、フル描画は重いので低めに保つ */
  const CARD_GRID_VIRTUAL_MIN = 36;
  /** 登録デッキ一覧の「行の集合」が前回フル描画と同じか判定する（枚数だけの変更なら一覧は差分更新） */
  let lastDeckListActiveNosSig = "";
  let catalogFilterCacheKey = "";
  /** @type {typeof cards | null} */
  let catalogFilterCached = null;
  let persistDeckTimer = 0;
  let deckListFlushRaf = 0;
  let deckSummaryDebounceTimer = 0;
  /** @type {{ deckSummary: boolean }} */
  let pendingRenderCardGridOpts = { deckSummary: true };
  /** @type {"catalog"|"deck"} */
  let cardPanelMode = "catalog";
  const cards = getAllCards();
  const allCosts = uniqueCosts(cards);
  const filterCosts = {};
  allCosts.forEach((n) => {
    filterCosts[n] = true;
  });

  const el = (id) => root.querySelector("#" + id) || document.getElementById(id);

  wireTestCardVariantDialogOnce();

  function readBhSlotFilters() {
    const panel = root.querySelector("#filter-bh-slots");
    /** @type {Set<number>} */
    const s = new Set();
    if (!panel) return s;
    panel.querySelectorAll("input[data-bh-slot]:checked").forEach(function (inp) {
      var n = Number(inp.getAttribute("data-bh-slot"));
      if (n >= 1 && n <= 7) s.add(n);
    });
    return s;
  }

  function readHeartSlotFilters() {
    const panel = root.querySelector("#filter-heart-slots");
    /** @type {Set<number>} */
    const s = new Set();
    if (!panel) return s;
    panel.querySelectorAll("input[data-heart-slot]:checked").forEach(function (inp) {
      var n = Number(inp.getAttribute("data-heart-slot"));
      if (n >= 1 && n <= 6) s.add(n);
    });
    return s;
  }

  let zoomTargetCardForBuilder = null;
  function openDeckBuilderCardZoom(card) {
    zoomTargetCardForBuilder = card;
    if (!card || !card.img) return;
    var dlg = document.getElementById("dlg-card-zoom");
    var zi = document.getElementById("dlg-zoom-img");
    var cap = document.getElementById("dlg-zoom-caption");
    if (!dlg || !zi || typeof dlg.showModal !== "function") return;
    zi.src = card.img;
    zi.alt = card.name || "";
    if (cap) cap.textContent = [card.name, card.card_no].filter(Boolean).join(" · ");
    var ctr = document.getElementById("dlg-zoom-deck-controls");
    if (ctr) {
      const em = effectiveMainDeckCategory(card);
      ctr.hidden = em !== T_MEMBER && em !== T_LIVE;
    }
    dlg.showModal();
  }

  function pruneOrphanRoleLabels() {
    for (const no of [...keyCardNos]) {
      if (!(deckMap[no] > 0)) keyCardNos.delete(no);
    }
    for (const no of [...keyCard2Nos]) {
      if (!(deckMap[no] > 0)) keyCard2Nos.delete(no);
    }
    for (const no of [...keyCard3Nos]) {
      if (!(deckMap[no] > 0)) keyCard3Nos.delete(no);
    }
    for (const no of [...middleCardNos]) {
      if (!(deckMap[no] > 0)) middleCardNos.delete(no);
    }
  }

  function flushPersistDeckToStorage() {
    persistDeckTimer = 0;
    try {
      saveDeckBundleToStorage({
        map: deckMap,
        keyCardNos: [...keyCardNos],
        keyCard2Nos: [...keyCard2Nos],
        keyCard3Nos: [...keyCard3Nos],
        middleCardNos: [...middleCardNos],
      });
    } catch (err) {
      console.error(err);
      showToast(
        err && err.name === "QuotaExceededError"
          ? "ブラウザの保存容量が足りずデッキを保存できません。他サイトのデータ削除や別タブのストレージを減らして再試行してください。"
          : "デッキの自動保存に失敗しました（ブラウザのサイトデータ設定を確認してください）。",
      );
    }
  }

  function schedulePersistDeckFlush() {
    if (persistDeckTimer) clearTimeout(persistDeckTimer);
    persistDeckTimer = setTimeout(flushPersistDeckToStorage, 100);
  }

  function persistDeckState() {
    pruneOrphanRoleLabels();
    schedulePersistDeckFlush();
  }

  function invalidateCatalogFilterCache() {
    catalogFilterCacheKey = "";
    catalogFilterCached = null;
  }

  function buildCatalogFilterCacheKey() {
    const bh = readBhSlotFilters();
    const hs = readHeartSlotFilters();
    const costParts = Object.keys(filterCosts)
      .map(function (k) {
        return k + "=" + (filterCosts[k] ? "1" : "0");
      })
      .sort();
    return [
      searchText,
      filterProduct,
      filterSeries,
      filterUnit,
      filterCardKind,
      JSON.stringify(filterTypes),
      [...bh].sort().join(","),
      [...hs].sort().join(","),
      costParts.join(","),
    ].join("|");
  }

  /** カード一覧グリッド用のフィルタ済み配列（カタログ条件が変わらない限り filterCards を使い回す） */
  function computeFilteredCardListForGrid() {
    if (cardPanelMode === "deck") {
      const filtered = [];
      for (const no of Object.keys(deckMap)) {
        if (!((deckMap[no] || 0) > 0)) continue;
        const c = getCard(no);
        if (c) filtered.push(c);
      }
      return sortRegisteredDeckCards(filtered);
    }
    const key = buildCatalogFilterCacheKey();
    if (key === catalogFilterCacheKey && catalogFilterCached !== null) {
      return catalogFilterCached;
    }
    const filtered = filterCards(cards, {
      search: searchText,
      types: filterTypes,
      product: filterProduct || null,
      series: filterSeries || null,
      unit: filterUnit || null,
      costs: filterCosts,
      bhSlots: readBhSlotFilters(),
      heartSlots: readHeartSlotFilters(),
    });
    catalogFilterCacheKey = key;
    catalogFilterCached = filtered;
    return filtered;
  }

  function scheduleRenderDeckList() {
    if (deckListFlushRaf) return;
    deckListFlushRaf = requestAnimationFrame(function () {
      deckListFlushRaf = 0;
      renderDeckList();
    });
  }

  function flushDeckSummaryDebouncedNow() {
    if (deckSummaryDebounceTimer) {
      clearTimeout(deckSummaryDebounceTimer);
      deckSummaryDebounceTimer = 0;
    }
    writeDeckSummaryDom();
  }

  function scheduleDeckSummaryDebounced() {
    if (deckSummaryDebounceTimer) clearTimeout(deckSummaryDebounceTimer);
    deckSummaryDebounceTimer = setTimeout(function () {
      deckSummaryDebounceTimer = 0;
      writeDeckSummaryDom();
    }, 160);
  }

  function computeActiveDeckNosSig() {
    const keys = Object.keys(deckMap).filter(function (no) {
      return (deckMap[no] || 0) > 0;
    });
    keys.sort();
    return keys.join("\u0001");
  }

  /**
   * 登録デッキ一覧で枚数表示だけ更新（行ごと innerHTML し直さないので画像の再ロードを避ける）。
   * @param {string[]} changedNos
   * @returns {boolean} 全ノードを更新できたか
   */
  function patchDeckListQtyForNos(changedNos) {
    const ul = el("deck-list");
    if (!ul || !changedNos || !changedNos.length) return false;
    const esc =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? function (s) {
            return CSS.escape(String(s));
          }
        : function (s) {
            return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          };
    for (let i = 0; i < changedNos.length; i++) {
      const no = String(changedNos[i] || "");
      if (!no) continue;
      const qty = deckMap[no] || 0;
      if (!(qty > 0)) continue;
      const btn = ul.querySelector('button[data-act="plus"][data-no="' + esc(no) + '"]');
      if (!btn || !btn.parentElement) return false;
      const span = btn.parentElement.querySelector("span.deck-qty");
      if (!span) return false;
      span.textContent = "× " + qty;
    }
    return true;
  }

  function deckTotal() {
    return countMain(deckMap);
  }

  /** 登録デッキ表示: メンバーはコスト順、ライブは下へ */
  function sortRegisteredDeckCards(arr) {
    return arr.slice().sort(function (a, b) {
      const ca = effectiveMainDeckCategory(a);
      const cb = effectiveMainDeckCategory(b);
      const aLive = ca === T_LIVE;
      const bLive = cb === T_LIVE;
      if (aLive !== bLive) return aLive ? 1 : -1;
      if (!aLive && !bLive) {
        const da = Number(a.cost);
        const db = Number(b.cost);
        const na = Number.isFinite(da) ? da : 999999;
        const nb = Number.isFinite(db) ? db : 999999;
        if (na !== nb) return na - nb;
      }
      return String(a.name || a.card_no).localeCompare(String(b.name || b.card_no), "ja");
    });
  }

  function canAdd(card, delta) {
    const cur = deckMap[card.card_no] || 0;
    if (cur + delta > MAX_COPIES_PER_CARD) return false;
    return true;
  }

  function canAddNo(cardNo, delta) {
    const cur = deckMap[cardNo] || 0;
    if (cur + delta > MAX_COPIES_PER_CARD) return false;
    return true;
  }

  function heartKeyForTestSlot(slot) {
    return slot === 0 ? "heart0" : "heart" + String(slot).padStart(2, "0");
  }

  function fillTestHeartSheet(host, idPrefix, srcMap) {
    if (!host) return;
    const labels = ["汎用", "桃", "赤", "黄", "緑", "青", "紫"];
    let html = '<table class="dlg-test-heart-table"><thead><tr><th>色</th><th>枚数</th></tr></thead><tbody>';
    for (let slot = 0; slot <= 6; slot++) {
      const key = heartKeyForTestSlot(slot);
      const raw = srcMap && (srcMap[key] !== undefined ? srcMap[key] : srcMap[String(slot)]);
      const v = Math.max(0, Math.min(99, Math.floor(Number(raw) || 0)));
      html +=
        "<tr><td>" +
        escapeHtml(labels[slot] || "") +
        '</td><td><input type="number" min="0" max="99" step="1" id="' +
        escapeAttr(idPrefix + String(slot)) +
        '" value="' +
        String(v) +
        '" /></td></tr>';
    }
    html += "</tbody></table>";
    host.innerHTML = html;
  }

  function readTestHeartSheet(idPrefix) {
    const out = {};
    for (let slot = 0; slot <= 6; slot++) {
      const el = document.getElementById(idPrefix + String(slot));
      const raw = el ? Number(el.value) : 0;
      const n = Number.isFinite(raw) ? Math.max(0, Math.min(99, Math.floor(raw))) : 0;
      if (n > 0) out[heartKeyForTestSlot(slot)] = n;
    }
    return out;
  }

  /** @type {{ resolve: ((v: string) => void) | null, card: object | null }} */
  let testCardVariantWait = null;

  function wireTestCardVariantDialogOnce() {
    const dlg = document.getElementById("dlg-test-card-variant");
    if (!dlg || dlg.dataset.llocgWired === "1") return;
    dlg.dataset.llocgWired = "1";
    const btnOk = document.getElementById("btn-test-card-ok");
    const btnCancel = document.getElementById("btn-test-card-cancel");
    function finish(no) {
      const fn = testCardVariantWait && testCardVariantWait.resolve;
      testCardVariantWait = null;
      if (typeof fn === "function") fn(no != null ? String(no) : "");
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
    }
    dlg.addEventListener("cancel", function (ev) {
      if (!testCardVariantWait) return;
      ev.preventDefault();
      const base = testCardVariantWait.card && testCardVariantWait.card.card_no;
      finish(base || "");
    });
    if (btnCancel) {
      btnCancel.addEventListener("click", function (ev) {
        ev.preventDefault();
        const base = testCardVariantWait && testCardVariantWait.card && testCardVariantWait.card.card_no;
        finish(base || "");
      });
    }
    if (btnOk) {
      btnOk.addEventListener("click", function (ev) {
        ev.preventDefault();
        const pending = testCardVariantWait && testCardVariantWait.card;
        if (!pending) {
          finish("");
          return;
        }
        const slotSel = document.getElementById("dlg-test-bh-slot");
        const slot = slotSel ? Math.max(0, Math.min(7, Math.floor(Number(slotSel.value) || 0))) : 0;
        const nameInp = document.getElementById("dlg-test-card-name");
        const customName = nameInp ? String(nameInp.value || "").trim() : "";
        const emCat = effectiveMainDeckCategory(pending);
        let blade;
        let baseHeart;
        let liveScore;
        let needHeart;
        if (emCat === T_MEMBER) {
          const bInp = document.getElementById("dlg-test-blade");
          const b = bInp ? Math.max(0, Math.min(99, Math.floor(Number(bInp.value) || 0))) : 0;
          blade = b;
          baseHeart = readTestHeartSheet("dlg-test-mh-");
        } else if (emCat === T_LIVE) {
          const sInp = document.getElementById("dlg-test-live-score");
          const s = sInp ? Math.max(0, Math.min(99, Math.floor(Number(sInp.value) || 0))) : 0;
          liveScore = s;
          needHeart = readTestHeartSheet("dlg-test-nh-");
        }
        const out =
          ensureTestCardVariant(pending.card_no, {
            slot,
            customName,
            blade,
            baseHeart,
            liveScore,
            needHeart,
          }) || pending.card_no;
        finish(out);
      });
    }
  }

  function openTestCardVariantDialog(card) {
    wireTestCardVariantDialogOnce();
    return new Promise(function (resolve) {
      const dlg = document.getElementById("dlg-test-card-variant");
      if (!dlg || typeof dlg.showModal !== "function") {
        resolve(card.card_no);
        return;
      }
      testCardVariantWait = { resolve: resolve, card: card };
      const lead = document.getElementById("dlg-test-card-variant-lead");
      if (lead) {
        lead.textContent =
          (card.card_no ? String(card.card_no) + " · " : "") +
          (card.name || "テストカード") +
          " をメインデッキに入れるための派生設定です。";
      }
      const slotSel = document.getElementById("dlg-test-bh-slot");
      if (slotSel) slotSel.value = "0";
      const nameInp = document.getElementById("dlg-test-card-name");
      if (nameInp) nameInp.value = String(card.name || "").trim();
      const emCat = effectiveMainDeckCategory(card);
      const mb = document.getElementById("dlg-test-member-block");
      const lb = document.getElementById("dlg-test-live-block");
      if (mb) mb.hidden = emCat !== T_MEMBER;
      if (lb) lb.hidden = emCat !== T_LIVE;
      if (emCat === T_MEMBER) {
        const bInp = document.getElementById("dlg-test-blade");
        if (bInp) bInp.value = String(Math.max(0, Math.floor(Number(card.blade) || 0)));
        fillTestHeartSheet(document.getElementById("dlg-test-mh-sheet"), "dlg-test-mh-", card.base_heart || {});
      } else if (emCat === T_LIVE) {
        const sInp = document.getElementById("dlg-test-live-score");
        if (sInp) sInp.value = String(Math.max(0, Math.floor(Number(card.score) || 0)));
        fillTestHeartSheet(document.getElementById("dlg-test-nh-sheet"), "dlg-test-nh-", card.need_heart || {});
      }
      dlg.showModal();
    });
  }

  async function resolvedCardNoForAdd(card) {
    if (!card || !card.card_no) return card && card.card_no;
    if (card.product !== UNSET_PLACEHOLDER_PRODUCT) return card.card_no;
    return await openTestCardVariantDialog(card);
  }

  function builderCatalogThumbImgHtml(url, className, imgOpts) {
    if (!url) return "";
    imgOpts = imgOpts || {};
    const low = catalogListThumbnailUrl(url);
    const cls = className || "deck-builder-card-thumb";
    const eager = imgOpts.eager === true;
    return (
      '<img class="' +
      escapeAttr(cls) +
      '" src="' +
      escapeAttr(low) +
      '" data-full-src="' +
      escapeAttr(url) +
      '" alt="" loading="' +
      (eager ? "eager" : "lazy") +
      '" fetchpriority="' +
      (eager ? "auto" : "low") +
      '" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fullSrc||this.src" />'
    );
  }

  function renderCounts() {
    const { m, l, total } = deckTotal();
    const mc = el("deck-count-member");
    const ml = el("deck-count-live");
    const mt = el("deck-count-total");
    if (mc) mc.textContent = m;
    if (ml) ml.textContent = l;
    if (mt) mt.textContent = total;
    const mcc = el("deck-count-member-compact");
    const mlc = el("deck-count-live-compact");
    const mtc = el("deck-count-total-compact");
    if (mcc) mcc.textContent = m;
    if (mlc) mlc.textContent = l;
    if (mtc) mtc.textContent = total;
    const btn = el("btn-start-game");
    /* 60 枚未満でも遊べるように緩和: メインに 1 枚以上あれば開始可（テスト用途） */
    if (btn) btn.disabled = total <= 0;
    renderValidationBanner();
  }

  function renderValidationBanner() {
    const banner = el("deck-validation-banner");
    if (!banner) return;
    const w = computeDeckWarnings(deckMap);
    banner.innerHTML = "";
    banner.hidden = w.length === 0;
    banner.classList.toggle("has-warnings", w.length > 0);
    w.forEach(function (msg) {
      var p = document.createElement("p");
      p.textContent = msg;
      banner.appendChild(p);
    });
  }

  /** @param {Record<string, number>} rawMap */
  function adoptDeckMapFromImported(rawMap) {
    deckMap = cloneDeckMap(rawMap);
    keyCardNos.clear();
    keyCard2Nos.clear();
    keyCard3Nos.clear();
    middleCardNos.clear();
    persistDeckState();
    localStorage.removeItem(STORAGE_ACTIVE_PRESET_ID);
    renderPresetSelect();
    renderCounts();
    scheduleRenderDeckList();
    scheduleRenderCardGrid();
  }

  function thumbnailCardNoForSavedSlot(slot) {
    if (!slot || !slot.deck) return null;
    const d = slot.deck;
    const pick = typeof slot.thumbnailCardNo === "string" ? slot.thumbnailCardNo.trim() : "";
    if (pick && (d[pick] || 0) > 0) return pick;
    const tries = [slot.keyCardNos, slot.keyCard2Nos, slot.keyCard3Nos, slot.middleCardNos];
    for (const arr of tries) {
      if (!Array.isArray(arr)) continue;
      for (const raw of arr) {
        const no = String(raw);
        if ((d[no] || 0) > 0) return no;
      }
    }
    const keys = Object.keys(d).sort();
    for (const k of keys) {
      if ((d[k] || 0) > 0) return k;
    }
    return null;
  }

  function syncDeckPresetThumbPreview() {
    const img = el("deck-preset-thumb");
    const sel = el("deck-preset-select");
    if (!img || !sel) return;
    const slot = library.slots.find((s) => s.id === sel.value);
    const no = thumbnailCardNoForSavedSlot(slot);
    if (!no) {
      img.hidden = true;
      img.removeAttribute("src");
      return;
    }
    const c = getCard(no);
    if (c && c.img) {
      img.src = c.img;
      img.alt = c.name || no;
      img.hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute("src");
    }
  }

  function fillDeckPresetThumbSelect() {
    const thumbSel = el("deck-preset-thumb-select");
    const presetSel = el("deck-preset-select");
    if (!thumbSel || !presetSel) return;
    const id = presetSel.value;
    if (!id) {
      thumbSel.disabled = true;
      thumbSel.innerHTML = "";
      const ox = document.createElement("option");
      ox.value = "";
      ox.textContent = "（保存デッキを一覧で選んでください）";
      thumbSel.appendChild(ox);
      thumbSel.value = "";
      return;
    }
    const slot = library.slots.find((x) => x.id === id);
    if (!slot || !slot.deck) return;
    /** @type {typeof cards} */
    const cardsList = [];
    for (const no of Object.keys(slot.deck)) {
      if (!((slot.deck[no] || 0) > 0)) continue;
      const c = getCard(no);
      if (c) cardsList.push(c);
    }
    const sorted = sortRegisteredDeckCards(cardsList);
    thumbSel.innerHTML = "";
    thumbSel.disabled = false;
    const oAuto = document.createElement("option");
    oAuto.value = "__auto__";
    oAuto.textContent = "自動（キー優先など）";
    thumbSel.appendChild(oAuto);
    for (const c of sorted) {
      const co = document.createElement("option");
      const no = String(c.card_no);
      co.value = no;
      const qty = slot.deck[no] || 0;
      co.textContent = (c.name || no) + " ×" + qty;
      thumbSel.appendChild(co);
    }
    const cur = typeof slot.thumbnailCardNo === "string" ? slot.thumbnailCardNo.trim() : "";
    if (cur && (slot.deck[cur] || 0) > 0) thumbSel.value = cur;
    else thumbSel.value = "__auto__";
  }

  function renderPresetSelect() {
    const sel = el("deck-preset-select");
    if (!sel) return;
    const remembered = localStorage.getItem(STORAGE_ACTIVE_PRESET_ID) || "";
    sel.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "（一覧から選ぶと読み込めます）";
    sel.appendChild(o0);
    for (const s of library.slots) {
      const o = document.createElement("option");
      o.value = s.id;
      const when =
        !isBuiltInStarterDeckId(s.id) &&
        s.updatedAt &&
        typeof s.updatedAt === "string" &&
        !Number.isNaN(Date.parse(s.updatedAt))
          ? new Date(s.updatedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
          : "";
      o.textContent = when ? `${s.name}（${when}）` : s.name;
      sel.appendChild(o);
    }
    if (remembered && library.slots.some((x) => x.id === remembered)) sel.value = remembered;
    else sel.value = "";
    if (!sel.dataset.thumbBound) {
      sel.dataset.thumbBound = "1";
      sel.addEventListener("change", function () {
        syncDeckPresetThumbPreview();
        fillDeckPresetThumbSelect();
      });
    }
    syncDeckPresetThumbPreview();
    fillDeckPresetThumbSelect();
  }

  function renderDeckList() {
    const ul = el("deck-list");
    if (!ul) return;
    if (!ul.dataset.roleDelegate) {
      ul.dataset.roleDelegate = "1";
      ul.addEventListener("change", function (ev) {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || t.getAttribute("data-picker") !== "role") return;
        const no = t.getAttribute("data-no");
        const role = t.getAttribute("data-role");
        if (!no || !role) return;
        if (role === "key") {
          if (t.checked) keyCardNos.add(no);
          else keyCardNos.delete(no);
        } else if (role === "key2") {
          if (t.checked) keyCard2Nos.add(no);
          else keyCard2Nos.delete(no);
        } else if (role === "key3") {
          if (t.checked) keyCard3Nos.add(no);
          else keyCard3Nos.delete(no);
        } else if (role === "middle") {
          if (t.checked) middleCardNos.add(no);
          else middleCardNos.delete(no);
        }
        afterDeckRoleLabelsChange(no);
      });
    }
    ul.innerHTML = "";
    let entries = Object.entries(deckMap)
      .filter(([, n]) => n > 0)
      .map(([no, n]) => ({ card: getCard(no), no, n }));

    /** @type {(c: typeof entries[number]["card"]) => number} */
    function costRank(c) {
      if (!c) return 9998;
      if (c.type === T_MEMBER) {
        var cn = Number(c.cost);
        return Number.isFinite(cn) ? cn : 999;
      }
      if (c.type === T_LIVE) return 1000;
      return 2000;
    }

    /** @type {(c: typeof entries[number]["card"]) => number} */
    function typeRank(c) {
      if (!c) return 99;
      if (c.type === T_MEMBER) return 0;
      if (c.type === T_LIVE) return 1;
      return 2;
    }

    if (deckListSort === "name") {
      entries.sort(function (a, b) {
        var na = a.card && a.card.name ? a.card.name : a.no;
        var nb = b.card && b.card.name ? b.card.name : b.no;
        return String(na).localeCompare(String(nb), "ja");
      });
    } else if (deckListSort === "cost") {
      entries.sort(function (a, b) {
        var ak = costRank(a.card);
        var bk = costRank(b.card);
        if (ak !== bk) return ak - bk;
        var nn = String(a.no).localeCompare(String(b.no), "ja");
        if (nn !== 0) return nn;
        return String(a.card && a.card.name ? a.card.name : a.no).localeCompare(
          String(b.card && b.card.name ? b.card.name : b.no),
          "ja",
        );
      });
    } else if (deckListSort === "type") {
      entries.sort(function (a, b) {
        var tr = typeRank(a.card) - typeRank(b.card);
        if (tr !== 0) return tr;
        return String(a.card && a.card.name ? a.card.name : a.no).localeCompare(
          String(b.card && b.card.name ? b.card.name : b.no),
          "ja",
        );
      });
    }

    for (const { card, no, n } of entries) {
      const li = document.createElement("li");
      li.className = "deck-list-row";
      const typeLabel = card
        ? card.type === T_LIVE
          ? "ライブ"
          : card.type === T_MEMBER
            ? "メンバー"
            : card.type || ""
        : "？";
      const titleName = card && card.name ? card.name : "未登録 " + no;
      const thumbHtml =
        card && card.img
          ? builderCatalogThumbImgHtml(card.img, "deck-thumb deck-builder-card-thumb")
          : '<span class="deck-thumb deck-thumb-missing" title="カードデータなし"></span>';
      const isKey = keyCardNos.has(no);
      const isKey2 = keyCard2Nos.has(no);
      const isKey3 = keyCard3Nos.has(no);
      const isMid = middleCardNos.has(no);
      const typeAttr = escapeAttr(card && card.type ? card.type : "");
      li.innerHTML =
        `<div class="deck-list-info">` +
        thumbHtml +
        '<span class="deck-type-badge" data-type="' +
        typeAttr +
        '">' +
        escapeHtml(typeLabel) +
        "</span>" +
        '<span class="deck-name" title="' +
        escapeAttr(titleName) +
        '">' +
        escapeHtml(card && card.name ? card.name : "（未登録） " + no) +
        "</span></div>" +
        '<div class="deck-list-meta">' +
        '<span class="deck-role-pills">' +
        (isKey ? '<span class="deck-role-pill deck-role-pill--key">キー</span>' : "") +
        (isKey2 ? '<span class="deck-role-pill deck-role-pill--key2">キ②</span>' : "") +
        (isKey3 ? '<span class="deck-role-pill deck-role-pill--key3">キ③</span>' : "") +
        (isMid ? '<span class="deck-role-pill deck-role-pill--mid">中間</span>' : "") +
        "</span>" +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role" data-role="key" data-no="' +
        escapeAttr(no) +
        '"' +
        (isKey ? " checked" : "") +
        ' /> キー</label>' +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role" data-role="key2" data-no="' +
        escapeAttr(no) +
        '"' +
        (isKey2 ? " checked" : "") +
        ' /> キ②</label>' +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role" data-role="key3" data-no="' +
        escapeAttr(no) +
        '"' +
        (isKey3 ? " checked" : "") +
        ' /> キ③</label>' +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role" data-role="middle" data-no="' +
        escapeAttr(no) +
        '"' +
        (isMid ? " checked" : "") +
        ' /> 中間</label>' +
        "</div>" +
        '<div class="deck-controls">' +
        '<button type="button" class="btn sm" data-act="minus" data-no="' +
        escapeAttr(no) +
        '">−</button>' +
        "<span class=\"deck-qty\">× " +
        n +
        '</span><button type="button" class="btn sm" data-act="plus" data-no="' +
        escapeAttr(no) +
        '">+</button></div>';

      ul.appendChild(li);

      var dz = li.querySelector("img.deck-thumb");
      if (dz && card && card.img) {
        dz.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          openDeckBuilderCardZoom(card);
        });
      }
    }

    ul.querySelectorAll("button[data-act]").forEach((b) => {
      b.addEventListener("click", () => {
        const no = b.getAttribute("data-no");
        var cardNow = no ? getCard(no) : null;
        var act = b.getAttribute("data-act");
        if (act === "plus") {
          if (!cardNow) {
            showToast("この番号はカードデータがありません。「＋」は追加できません。カードDBを確認するか一覧から選んでください。");
            return;
          }
          if (canAdd(cardNow, 1)) deckMap[no] = (deckMap[no] || 0) + 1;
        } else {
          deckMap[no] = (deckMap[no] || 0) - 1;
          if (deckMap[no] <= 0) delete deckMap[no];
        }
        afterDeckMapQuickChange(no);
      });
    });
    lastDeckListActiveNosSig = computeActiveDeckNosSig();
  }

  /** 保存スロット／メインデッキを覗きレイアウトで表示。opts.roleEditMode: 'off' | 'main' | 'library-slot' */
  function renderSavedDeckPeek(slot, opts) {
    opts = opts || {};
    var roleMode = opts.roleEditMode || "off";
    var libSlotId = opts.librarySlotId || "";

    var titleEl = el("dlg-deck-peek-title");
    if (titleEl) titleEl.textContent = opts.peekTitle != null ? opts.peekTitle : "デッキ確認";

    var dlgPeek = el("dlg-deck-peek");
    if (dlgPeek) {
      if (roleMode === "main") dlgPeek.dataset.roleEditMode = "main";
      else if (roleMode === "library-slot" && libSlotId) dlgPeek.dataset.roleEditMode = "library:" + libSlotId;
      else delete dlgPeek.dataset.roleEditMode;
    }

    const map = slot.deck || {};
    var peekKey = new Set(sanitizeCardNoList(slot.keyCardNos));
    var peekKey2 = new Set(sanitizeCardNoList(slot.keyCard2Nos));
    var peekKey3 = new Set(sanitizeCardNoList(slot.keyCard3Nos));
    var peekMid = new Set(sanitizeCardNoList(slot.middleCardNos));
    const lead = el("deck-peek-lead");
    if (lead) {
      if (roleMode === "main") {
        lead.textContent =
          "編集中のメインデッキの全種類（山札内訳と同じ集計）。キー／キ②／キ③／中間を変更すると手元のメインデッキに保存されます。";
      } else if (roleMode === "library-slot") {
        var whenLs =
          slot.updatedAt &&
          typeof slot.updatedAt === "string" &&
          !Number.isNaN(Date.parse(slot.updatedAt))
            ? new Date(slot.updatedAt).toLocaleString("ja-JP")
            : "";
        lead.textContent =
          "「" +
          (slot.name || "") +
          "」" +
          (whenLs ? "（更新: " + whenLs + "）" : "") +
          " — キー／キ②／キ③／中間を変更するとこのプリセットに保存されます（メインは変わりません・読み込みで反映）。";
      } else {
        var when =
          slot.updatedAt &&
          typeof slot.updatedAt === "string" &&
          !Number.isNaN(Date.parse(slot.updatedAt))
            ? new Date(slot.updatedAt).toLocaleString("ja-JP")
            : "";
        var base =
          "「" +
          slot.name +
          "」" +
          (when ? "（更新: " + when + "）" : "") +
          " — 閲覧のみ。メインデッキには読み込みません。";
        if (opts.noteLines && opts.noteLines.length > 0) {
          base += "\n\n" + opts.noteLines.map(function (w) { return "・" + w; }).join("\n");
        }
        lead.textContent = base;
      }
    }

    var listHeading = el("deck-peek-list-heading");
    if (listHeading) {
      if (roleMode === "main" || roleMode === "library-slot") {
        listHeading.textContent = "カード一覧（キー／キ②／キ③／中間を変更可）";
      } else {
        listHeading.textContent = "カード一覧（閲覧のみ）";
      }
    }

    let memAll = 0;
    let memNonBh = 0;
    let memBh = 0;
    let liveAll = 0;
    let liveNonBh = 0;
    let liveBh = 0;
    let unknownCopies = 0;
    /** @type {Record<string, number>} */
    const byCost = {};

    for (const [no, n] of Object.entries(map)) {
      if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) continue;
      const c = getCard(no);
      if (!c) {
        unknownCopies += n;
        continue;
      }
      if (c.type === T_MEMBER) {
        memAll += n;
        if (cardHasBladeHeart(c)) memBh += n;
        else memNonBh += n;
        var coM = Number(c.cost);
        var keyM = Number.isFinite(coM) ? String(coM) : "—";
        byCost[keyM] = (byCost[keyM] || 0) + n;
      } else if (c.type === T_LIVE) {
        liveAll += n;
        if (cardHasBladeHeart(c)) liveBh += n;
        else liveNonBh += n;
      }
    }

    const bhAgg = accumulateBladeHeartWeighted(map);

    const stats = el("deck-peek-stats");
    if (stats) {
      stats.innerHTML =
        '<div class="deck-peek-stat-grid">' +
        "<div><strong>メンバー</strong> 計 " +
        memAll +
        "枚 — BH なし <span class=\"deck-peek-accent\">" +
        memNonBh +
        '</span>枚 / BH あり <span class="deck-peek-muted-num">' +
        memBh +
        "</span>枚</div>" +
        "<div><strong>ライブ</strong> 計 " +
        liveAll +
        "枚 — BH なし <span class=\"deck-peek-accent\">" +
        liveNonBh +
        '</span>枚 / BH あり <span class="deck-peek-muted-num">' +
        liveBh +
        "</span>枚</div>" +
        (unknownCopies
          ? '<div class="deck-peek-warn">カードDBに無い番号が <strong>' +
            unknownCopies +
            "</strong>枚あります（一覧・グラフの集計から除外）。</div>"
          : "") +
        "</div>" +
        formatBladeHeartBlockHtml(
          bhAgg.byKey,
          bhAgg.totalWeighted,
          memBh,
          liveBh,
          memNonBh,
          liveNonBh,
          bhAgg.byKeyAdditive,
        );
    }

    var chart = el("deck-peek-chart");
    var emptyEl = el("deck-peek-chart-empty");
    if (chart && emptyEl) {
      chart.innerHTML = "";
      var costEntries = Object.entries(byCost).sort(function (a, b) {
        if (a[0] === "—") return 1;
        if (b[0] === "—") return -1;
        return Number(a[0]) - Number(b[0]);
      });
      if (costEntries.length === 0) {
        emptyEl.hidden = false;
        chart.setAttribute("aria-hidden", "true");
      } else {
        emptyEl.hidden = true;
        chart.removeAttribute("aria-hidden");
        var maxVal = 1;
        for (var i = 0; i < costEntries.length; i++) {
          maxVal = Math.max(maxVal, costEntries[i][1]);
        }
        var hMax = 72;
        costEntries.forEach(function (pair) {
          var costLabel = pair[0];
          var count = pair[1];
          var col = document.createElement("div");
          col.className = "deck-peek-bar-col";
          var barH = Math.round((count / maxVal) * hMax);
          col.innerHTML =
            '<div class="deck-peek-bar-wrap">' +
            '<span class="deck-peek-bar-val">' +
            count +
            '</span><div class="deck-peek-bar" style="height:' +
            Math.max(barH, 6) +
            'px" role="presentation" title="コスト ' +
            (costLabel === "—" ? "（不明）" : costLabel) +
            ": " +
            count +
            '枚"></div></div><span class="deck-peek-bar-cost">' +
            (costLabel === "—" ? "?" : escapeHtml(costLabel)) +
            "</span>";
          chart.appendChild(col);
        });
      }
    }

    var ulPeek = el("deck-peek-list");
    if (ulPeek) {
      ulPeek.innerHTML = "";
      var rows = Object.entries(map)
        .filter(function (ent) {
          return ent[1] > 0;
        })
        .map(function (ent) {
          return { no: ent[0], n: ent[1], card: getCard(ent[0]) };
        })
        .sort(function (a, b) {
          var na = a.card && a.card.name ? a.card.name : a.no;
          var nb = b.card && b.card.name ? b.card.name : b.no;
          return String(na).localeCompare(String(nb), "ja");
        });

      rows.forEach(function (row) {
        var card = row.card;
        var li = document.createElement("li");
        var canEditRoles = roleMode === "main" || roleMode === "library-slot";
        li.className =
          "deck-list-row deck-peek-row" +
          (canEditRoles ? " deck-peek-row--roles" : "");
        var typeLabel = card
          ? card.type === T_LIVE
            ? "ライブ"
            : card.type === T_MEMBER
              ? "メンバー"
              : card.type || "?"
          : "?";
        var bhIcons =
          card && cardHasBladeHeart(card) ? bladeHeartRowIconsHtml(card) : "";
        var costPill = "";
        if (card && card.type === T_MEMBER && card.cost != null && String(card.cost).trim() !== "") {
          costPill =
            '<span class="deck-peek-cost-pill">コスト' + escapeHtml(String(card.cost)) + "</span>";
        }
        var imgHtml = card
          ? '<img class="deck-thumb deck-builder-card-thumb" src="' +
            escapeAttr(card.img) +
            '" alt="" loading="lazy" fetchpriority="low" decoding="async" />'
          : '<span class="deck-thumb deck-thumb-missing" title="未登録"></span>';
        var rk = peekKey.has(row.no);
        var rk2 = peekKey2.has(row.no);
        var rk3 = peekKey3.has(row.no);
        var rm = peekMid.has(row.no);
        var rolePills =
          !canEditRoles && (rk || rk2 || rk3 || rm)
            ? '<span class="deck-role-pills deck-role-pills--peek">' +
              (rk ? '<span class="deck-role-pill deck-role-pill--key">キー</span>' : "") +
              (rk2 ? '<span class="deck-role-pill deck-role-pill--key2">キ②</span>' : "") +
              (rk3 ? '<span class="deck-role-pill deck-role-pill--key3">キ③</span>' : "") +
              (rm ? '<span class="deck-role-pill deck-role-pill--mid">中間</span>' : "") +
              "</span>"
            : "";
        var metaHtml = "";
        if (canEditRoles) {
          metaHtml =
            '<div class="deck-list-meta deck-list-meta--peek">' +
            '<span class="deck-role-pills">' +
            (rk ? '<span class="deck-role-pill deck-role-pill--key">キー</span>' : "") +
            (rk2 ? '<span class="deck-role-pill deck-role-pill--key2">キ②</span>' : "") +
            (rk3 ? '<span class="deck-role-pill deck-role-pill--key3">キ③</span>' : "") +
            (rm ? '<span class="deck-role-pill deck-role-pill--mid">中間</span>' : "") +
            "</span>" +
            '<label class="chk deck-role-chk"><input type="checkbox" data-picker="peek-role" data-role="key" data-no="' +
            escapeAttr(row.no) +
            '"' +
            (rk ? " checked" : "") +
            ' /> キー</label>' +
            '<label class="chk deck-role-chk"><input type="checkbox" data-picker="peek-role" data-role="key2" data-no="' +
            escapeAttr(row.no) +
            '"' +
            (rk2 ? " checked" : "") +
            ' /> キ②</label>' +
            '<label class="chk deck-role-chk"><input type="checkbox" data-picker="peek-role" data-role="key3" data-no="' +
            escapeAttr(row.no) +
            '"' +
            (rk3 ? " checked" : "") +
            ' /> キ③</label>' +
            '<label class="chk deck-role-chk"><input type="checkbox" data-picker="peek-role" data-role="middle" data-no="' +
            escapeAttr(row.no) +
            '"' +
            (rm ? " checked" : "") +
            ' /> 中間</label>' +
            "</div>";
        }
        li.innerHTML =
          '<div class="deck-list-info">' +
          imgHtml +
          '<span class="deck-type-badge" data-type="' +
          escapeAttr(card ? card.type || "" : "") +
          '">' +
          escapeHtml(typeLabel) +
          "</span>" +
          rolePills +
          bhIcons +
          costPill +
          '<span class="deck-name" title="' +
          escapeAttr(card ? card.name : "未登録 " + row.no) +
          '">' +
          escapeHtml(card ? card.name : "未登録 " + row.no) +
          "</span></div>" +
          metaHtml +
          '<span class="deck-qty">× ' +
          row.n +
          "</span>";
        ulPeek.appendChild(li);
        var pzk = li.querySelector("img.deck-builder-card-thumb");
        if (pzk && card) {
          pzk.addEventListener("click", function (ev) {
            ev.stopPropagation();
            openDeckBuilderCardZoom(card);
          });
        }
      });
    }

    if (!opts.skipModal) {
      var dlg = el("dlg-deck-peek");
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    }
  }

  function wirePeekListRoleEditorOnce() {
    var ul = el("deck-peek-list");
    if (!ul || ul.dataset.peekRoleWired) return;
    ul.dataset.peekRoleWired = "1";
    ul.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!(t instanceof HTMLInputElement) || t.getAttribute("data-picker") !== "peek-role") return;
      var no = t.getAttribute("data-no");
      var role = t.getAttribute("data-role");
      var dlg = document.getElementById("dlg-deck-peek");
      var mode = dlg && dlg.dataset.roleEditMode;
      if (!no || !role || !mode) return;
      if (mode === "main") {
        if (role === "key") {
          if (t.checked) keyCardNos.add(no);
          else keyCardNos.delete(no);
        } else if (role === "key2") {
          if (t.checked) keyCard2Nos.add(no);
          else keyCard2Nos.delete(no);
        } else if (role === "key3") {
          if (t.checked) keyCard3Nos.add(no);
          else keyCard3Nos.delete(no);
        } else if (role === "middle") {
          if (t.checked) middleCardNos.add(no);
          else middleCardNos.delete(no);
        }
        afterDeckRoleLabelsChange(no);
        var pseudo = {
          name: "現在のメインデッキ",
          deck: deckMap,
          keyCardNos: [...keyCardNos],
          keyCard2Nos: [...keyCard2Nos],
          keyCard3Nos: [...keyCard3Nos],
          middleCardNos: [...middleCardNos],
          updatedAt: new Date().toISOString(),
        };
        renderSavedDeckPeek(pseudo, {
          peekTitle: "登録カード一覧",
          roleEditMode: "main",
          skipModal: true,
        });
        return;
      }
      if (mode.indexOf("library:") !== 0) return;
      var sid = mode.slice(8);
      if (isBuiltInStarterDeckId(sid)) {
        showToast("共通の初期デッキはロール設定を変更できません。「別名で保存」してから編集してください。");
        return;
      }
      var slot = library.slots.find(function (s) {
        return s.id === sid;
      });
      if (!slot) return;
      var kSet = new Set(sanitizeCardNoList(slot.keyCardNos));
      var k2Set = new Set(sanitizeCardNoList(slot.keyCard2Nos));
      var k3Set = new Set(sanitizeCardNoList(slot.keyCard3Nos));
      var mSet = new Set(sanitizeCardNoList(slot.middleCardNos));
      if (role === "key") {
        if (t.checked) kSet.add(no);
        else kSet.delete(no);
      } else if (role === "key2") {
        if (t.checked) k2Set.add(no);
        else k2Set.delete(no);
      } else if (role === "key3") {
        if (t.checked) k3Set.add(no);
        else k3Set.delete(no);
      } else if (role === "middle") {
        if (t.checked) mSet.add(no);
        else mSet.delete(no);
      }
      library = updateDeckSlot(library, sid, slot.deck, {
        keyCardNos: [...kSet],
        keyCard2Nos: [...k2Set],
        keyCard3Nos: [...k3Set],
        middleCardNos: [...mSet],
      });
      persistDeckLibrary(library);
      renderPresetSelect();
      var slotAfter = library.slots.find(function (s) {
        return s.id === sid;
      });
      if (slotAfter) {
        renderSavedDeckPeek(slotAfter, {
          roleEditMode: "library-slot",
          librarySlotId: sid,
          peekTitle: "保存デッキを確認",
          skipModal: true,
        });
      }
    });
  }

  function writeDeckSummaryDom() {
    const deckSummary = el("card-deck-summary");
    if (!deckSummary || cardPanelMode !== "deck") return;
    const costCount = {};
    let memTotal = 0;
    let liveTotal = 0;
    let unknown = 0;
    for (const [no, n] of Object.entries(deckMap)) {
      const qty = Number(n) || 0;
      if (qty <= 0) continue;
      const c = getCard(no);
      if (!c) {
        unknown += qty;
        continue;
      }
      if (effectiveMainDeckCategory(c) === T_MEMBER) {
        memTotal += qty;
        const ck = Number(c.cost);
        if (Number.isFinite(ck)) costCount[String(Math.floor(ck))] = (costCount[String(Math.floor(ck))] || 0) + qty;
      } else if (effectiveMainDeckCategory(c) === T_LIVE) {
        liveTotal += qty;
      }
    }
    const bhAgg = accumulateBladeHeartWeighted(deckMap);
    const chartCols = Object.keys(costCount)
      .map(function (k) {
        return { k: Number(k), n: Number(costCount[k]) || 0 };
      })
      .filter(function (x) {
        return Number.isFinite(x.k) && x.n > 0;
      })
      .sort(function (a, b) {
        return a.k - b.k;
      });
    let chartHtml = '<p class="deck-peek-chart-empty">メンバーのコスト分布はありません。</p>';
    let memBhCount = 0;
    let memNonBhCount = 0;
    let liveBhCount = 0;
    let liveNonBhCount = 0;
    for (const [no, n] of Object.entries(deckMap)) {
      const qty = Number(n) || 0;
      if (qty <= 0) continue;
      const c = getCard(no);
      if (!c) continue;
      if (effectiveMainDeckCategory(c) === T_MEMBER) {
        if (cardHasBladeHeart(c)) memBhCount += qty;
        else memNonBhCount += qty;
      } else if (effectiveMainDeckCategory(c) === T_LIVE) {
        if (cardHasBladeHeart(c)) liveBhCount += qty;
        else liveNonBhCount += qty;
      }
    }
    if (chartCols.length) {
      const max = chartCols.reduce(function (m, x) {
        return Math.max(m, x.n);
      }, 1);
      chartHtml =
        '<div class="deck-peek-chart">' +
        chartCols
          .map(function (x) {
            const h = Math.max(8, Math.round((x.n / max) * 92));
            return (
              '<div class="deck-peek-bar-col"><div class="deck-peek-bar-wrap"><span class="deck-peek-bar-val">' +
              x.n +
              '</span><div class="deck-peek-bar" style="height:' +
              h +
              'px" title="コスト' +
              x.k +
              ": " +
              x.n +
              '枚"></div></div><span class="deck-peek-bar-cost">' +
              x.k +
              "</span></div>"
            );
          })
          .join("") +
        "</div>";
    }
    deckSummary.hidden = false;
    deckSummary.innerHTML =
      '<div class="card-deck-summary-grid"><div class="deck-peek-stats"><div class="deck-peek-stat-grid compact">' +
      '<div><strong>メンバー</strong> <span class="deck-peek-accent">' +
      memTotal +
      '</span>枚</div><div><strong>ライブ</strong> <span class="deck-peek-accent">' +
      liveTotal +
      "</span>枚" +
      (unknown > 0 ? ' <span class="deck-peek-warn">DB未登録 <strong>' + unknown + "</strong>枚</span>" : "") +
      "</div></div>" +
      formatBladeHeartBlockHtml(
        bhAgg.byKey,
        bhAgg.totalWeighted,
        memBhCount,
        liveBhCount,
        memNonBhCount,
        liveNonBhCount,
        bhAgg.byKeyAdditive,
      ) +
      "</div>" +
      '<div class="deck-peek-chart-section compact"><h4 class="deck-peek-section-h">コスト分布</h4>' +
      chartHtml +
      "</div></div>" +
      '<p class="hint search-hint-muted card-deck-summary-help">登録デッキタブで枚数調整・役割指定（キー/中間）・BH確認をまとめて操作できます。</p>' +
      "";
  }

  function updateCardHitCountFromFiltered(filtered) {
    let hitMember = 0;
    let hitLive = 0;
    for (const card of filtered) {
      if (card.type === T_MEMBER) hitMember++;
      else if (card.type === T_LIVE) hitLive++;
    }
    const hit = el("card-hit-count");
    if (hit) {
      if (cardPanelMode === "deck") {
        let sum = 0;
        for (const no of Object.keys(deckMap)) sum += deckMap[no] || 0;
        hit.textContent =
          filtered.length + " 種（メンバー " + hitMember + " / ライブ " + hitLive + "）・合計 " + sum + " 枚";
      } else {
        hit.textContent =
          filtered.length === cards.length
            ? "全 " +
              cards.length +
              "枚（メンバー " +
              hitMember +
              " / ライブ " +
              hitLive +
              "）"
            : "表示 " +
              filtered.length +
              " / 全 " +
              cards.length +
              " 枚（この条件: メンバー " +
              hitMember +
              " / ライブ " +
              hitLive +
              "）";
      }
    }
  }

  function renderCardGrid(opts) {
    opts = opts || { deckSummary: true };
    if (typeof opts.deckSummary === "undefined") opts.deckSummary = true;
    const grid = el("card-grid");
    if (!grid) return;
    const heading = el("card-panel-heading");
    const deckSummary = el("card-deck-summary");
    if (heading) {
      heading.textContent = cardPanelMode === "deck" ? "登録中のデッキ" : "カード一覧";
    }

    /** @type {typeof cards} */
    const filtered = computeFilteredCardListForGrid();
    updateCardHitCountFromFiltered(filtered);
    if (deckSummary) {
      if (cardPanelMode !== "deck") {
        deckSummary.hidden = true;
        deckSummary.innerHTML = "";
      } else if (opts.deckSummary) {
        flushDeckSummaryDebouncedNow();
      } else {
        scheduleDeckSummaryDebounced();
      }
    }
    const scrollEl = el("card-grid-scroll");
    const topSp = el("card-grid-top-spacer");
    const botSp = el("card-grid-bottom-spacer");
    const useVirtual = !!(topSp && botSp && scrollEl) && filtered.length >= CARD_GRID_VIRTUAL_MIN;

    if (!useVirtual) {
      cardGridVirtual.active = false;
      if (topSp) topSp.style.height = "0px";
      if (botSp) botSp.style.height = "0px";
      grid.innerHTML = "";
      for (const card of filtered) grid.appendChild(createCardGridItemWrap(card));
      cardGridVirtual.lastOrderedSig = filtered.map(function (c) {
        return c.card_no;
      }).join("\u0001");
      return;
    }

    const needScrollReset =
      !cardGridVirtual.active ||
      cardGridVirtual.lastPanel !== cardPanelMode ||
      cardGridVirtual.lastCount !== filtered.length;
    cardGridVirtual.lastPanel = cardPanelMode;
    cardGridVirtual.lastCount = filtered.length;
    if (needScrollReset && scrollEl) {
      scrollEl.scrollTop = 0;
      cardGridVirtualMeasureGuard = 0;
    }
    cardGridVirtual.active = true;
    cardGridVirtual.list = filtered;
    cardGridVirtual.w0 = -1;
    cardGridVirtual.rowH = cardPanelMode === "deck" ? 268 : 234;
    syncVirtualCardGridWindow(true);
    cardGridVirtual.lastOrderedSig = filtered.map(function (c) {
      return c.card_no;
    }).join("\u0001");
  }

  function estimateCardGridCols(scrollEl) {
    if (!scrollEl || scrollEl.clientWidth < 48) return 6;
    const gap = 9;
    const minCol = 100;
    const pad = 28;
    const inner = Math.max(0, scrollEl.clientWidth - pad);
    return Math.max(2, Math.floor((inner + gap) / (minCol + gap)));
  }

  function measureVirtualRowHeightFromGrid(gridEl, cols) {
    const ch = gridEl.children;
    if (!ch.length) return cardGridVirtual.rowH;
    const n = Math.min(Math.max(1, cols), ch.length);
    let h = 0;
    for (let i = 0; i < n; i++) h = Math.max(h, /** @type {HTMLElement} */ (ch[i]).offsetHeight || 0);
    return Math.max(168, h + 10);
  }

  function createCardGridItemWrap(card) {
    const wrap = document.createElement("div");
    wrap.className = "card-grid-item";
    wrap.dataset.cardNo = String(card.card_no);
    const div = document.createElement("div");
    div.className =
      "card-thumb card-thumb--" + (card.type === T_LIVE ? "live" : card.type === T_MEMBER ? "member" : "misc");
    const tlab = card.type === T_LIVE ? "ライブカード" : card.type === T_MEMBER ? "メンバーカード" : "";
    const inDeck = (deckMap[card.card_no] || 0) > 0;
    const pills = [];
    if (inDeck && keyCardNos.has(card.card_no))
      pills.push('<span class="card-thumb-role card-thumb-role--key">キー</span>');
    if (inDeck && keyCard2Nos.has(card.card_no))
      pills.push('<span class="card-thumb-role card-thumb-role--key2">キ②</span>');
    if (inDeck && keyCard3Nos.has(card.card_no))
      pills.push('<span class="card-thumb-role card-thumb-role--key3">キ③</span>');
    if (inDeck && middleCardNos.has(card.card_no))
      pills.push('<span class="card-thumb-role card-thumb-role--mid">中間</span>');
    const rolesHtml = pills.length ? '<div class="card-thumb-roles">' + pills.join("") + "</div>" : "";
    const qtyBadge =
      cardPanelMode === "deck"
        ? '<span class="thumb-deck-qty">' + (deckMap[card.card_no] || 0) + " 枚</span>"
        : "";
    div.innerHTML =
      rolesHtml +
      qtyBadge +
      `<span class="thumb-type">${escapeHtml(tlab)}</span>${builderCatalogThumbImgHtml(card.img, "deck-builder-card-thumb", {
        eager: cardGridVirtual.active,
      })}<span class="thumb-cap">${escapeHtml(card.name)}${thumbExtraHtml(card)}</span>`;
    div.addEventListener("click", function (ev) {
      if (
        ev.target &&
        ev.target.closest &&
        (ev.target.closest(".deck-builder-card-thumb") || ev.target.tagName === "IMG")
      ) {
        ev.preventDefault();
        ev.stopPropagation();
        openDeckBuilderCardZoom(card);
        return;
      }
      void (async function () {
        const addNo = await resolvedCardNoForAdd(card);
        if (!addNo) return;
        if (!canAddNo(addNo, 1)) return;
        deckMap[addNo] = (deckMap[addNo] || 0) + 1;
        afterDeckMapQuickChange(addNo);
      })();
    });
    wrap.appendChild(div);
    if (cardPanelMode === "deck") {
      const roleRow = document.createElement("div");
      roleRow.className = "card-thumb-role-edit-row";
      roleRow.innerHTML =
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role-grid" data-role="key" data-no="' +
        escapeAttr(card.card_no) +
        '"' +
        (keyCardNos.has(card.card_no) ? " checked" : "") +
        '> キー</label>' +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role-grid" data-role="key2" data-no="' +
        escapeAttr(card.card_no) +
        '"' +
        (keyCard2Nos.has(card.card_no) ? " checked" : "") +
        '> キ②</label>' +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role-grid" data-role="key3" data-no="' +
        escapeAttr(card.card_no) +
        '"' +
        (keyCard3Nos.has(card.card_no) ? " checked" : "") +
        '> キ③</label>' +
        '<label class="chk deck-role-chk"><input type="checkbox" data-picker="role-grid" data-role="middle" data-no="' +
        escapeAttr(card.card_no) +
        '"' +
        (middleCardNos.has(card.card_no) ? " checked" : "") +
        '> 中間</label>';
      roleRow.querySelectorAll("input[data-picker='role-grid']").forEach(function (inp) {
        inp.addEventListener("change", function () {
          const no = inp.getAttribute("data-no");
          const role = inp.getAttribute("data-role");
          if (!no || !role) return;
          if (role === "key") {
            if (inp.checked) keyCardNos.add(no);
            else keyCardNos.delete(no);
          } else if (role === "key2") {
            if (inp.checked) keyCard2Nos.add(no);
            else keyCard2Nos.delete(no);
          } else if (role === "key3") {
            if (inp.checked) keyCard3Nos.add(no);
            else keyCard3Nos.delete(no);
          } else if (role === "middle") {
            if (inp.checked) middleCardNos.add(no);
            else middleCardNos.delete(no);
          }
          afterDeckRoleLabelsChange(no);
        });
      });
      wrap.appendChild(roleRow);
    }
    const emCat = effectiveMainDeckCategory(card);
    if (emCat === T_MEMBER || emCat === T_LIVE) {
      const qrow = document.createElement("div");
      qrow.className = "card-thumb-qty-row";
      const bMinus = document.createElement("button");
      bMinus.type = "button";
      bMinus.className = "card-thumb-qty-btn";
      bMinus.textContent = "−";
      bMinus.setAttribute("aria-label", "メインデッキから1枚減らす");
      const bPlus = document.createElement("button");
      bPlus.type = "button";
      bPlus.className = "card-thumb-qty-btn card-thumb-qty-btn--plus";
      bPlus.textContent = "+";
      bPlus.setAttribute("aria-label", "メインデッキへ1枚追加");
      function bump(delta) {
        void (async function () {
          var no = card.card_no;
          if (delta > 0) {
            no = (await resolvedCardNoForAdd(card)) || card.card_no;
          }
          var cur = deckMap[no] || 0;
          if (delta < 0 && cur <= 0) return;
          if (delta > 0 && !canAddNo(no, 1)) return;
          deckMap[no] = Math.max(0, cur + delta);
          if (!(deckMap[no] > 0)) delete deckMap[no];
          const changed = [String(no)];
          if (String(card.card_no) !== String(no)) changed.unshift(String(card.card_no));
          afterDeckMapQuickChange(changed);
        })();
      }
      bMinus.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        bump(-1);
      });
      bPlus.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        bump(1);
      });
      qrow.appendChild(bMinus);
      qrow.appendChild(bPlus);
      wrap.appendChild(qrow);
    }
    return wrap;
  }

  function syncVirtualCardGridWindow(force) {
    const scroll = el("card-grid-scroll");
    const topSp = el("card-grid-top-spacer");
    const botSp = el("card-grid-bottom-spacer");
    const grid = el("card-grid");
    if (!scroll || !topSp || !botSp || !grid || !cardGridVirtual.active) return;
    const list = cardGridVirtual.list;
    const N = list.length;
    if (!N) {
      topSp.style.height = "0px";
      botSp.style.height = "0px";
      grid.innerHTML = "";
      return;
    }
    const cols = estimateCardGridCols(scroll);
    const rowH = cardGridVirtual.rowH;
    const totalRows = Math.ceil(N / cols);
    const overscan = 3;
    const st = scroll.scrollTop;
    let firstRow = Math.floor(st / rowH) - overscan;
    if (firstRow < 0) firstRow = 0;
    const visRows = Math.ceil(scroll.clientHeight / rowH) + overscan * 2 + 2;
    const startIdx = firstRow * cols;
    const endIdx = Math.min(N, startIdx + visRows * cols);
    if (!force && startIdx === cardGridVirtual.w0 && endIdx === cardGridVirtual.w1 && cols === cardGridVirtual.cols)
      return;
    cardGridVirtual.cols = cols;
    cardGridVirtual.w0 = startIdx;
    cardGridVirtual.w1 = endIdx;

    topSp.style.height = firstRow * rowH + "px";
    const sliceCount = endIdx - startIdx;
    const renderedRows = sliceCount > 0 ? Math.ceil(sliceCount / cols) : 0;
    const bottomRows = Math.max(0, totalRows - firstRow - renderedRows);
    botSp.style.height = bottomRows * rowH + "px";

    grid.innerHTML = "";
    for (let i = startIdx; i < endIdx; i++) grid.appendChild(createCardGridItemWrap(list[i]));

    requestAnimationFrame(function () {
      if (!cardGridVirtual.active || cardGridVirtualIsScrolling) return;
      const nh = measureVirtualRowHeightFromGrid(grid, cols);
      if (nh > 0 && Math.abs(nh - cardGridVirtual.rowH) > 8 && cardGridVirtualMeasureGuard < 5) {
        cardGridVirtualMeasureGuard++;
        cardGridVirtual.rowH = nh;
        cardGridVirtual.w0 = -1;
        syncVirtualCardGridWindow(true);
      }
    });
  }

  function roleDeckPillsInnerHtml(cardNo) {
    const no = String(cardNo || "");
    const inDeck = (deckMap[no] || 0) > 0;
    const pills = [];
    if (inDeck && keyCardNos.has(no)) pills.push('<span class="card-thumb-role card-thumb-role--key">キー</span>');
    if (inDeck && keyCard2Nos.has(no)) pills.push('<span class="card-thumb-role card-thumb-role--key2">キ②</span>');
    if (inDeck && keyCard3Nos.has(no)) pills.push('<span class="card-thumb-role card-thumb-role--key3">キ③</span>');
    if (inDeck && middleCardNos.has(no)) pills.push('<span class="card-thumb-role card-thumb-role--mid">中間</span>');
    return pills.length ? '<div class="card-thumb-roles">' + pills.join("") + "</div>" : "";
  }

  function patchVisibleGridThumbsForNos(changedNos) {
    const grid = el("card-grid");
    if (!grid || !changedNos || !changedNos.length) return;
    const esc =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? function (s) {
            return CSS.escape(String(s));
          }
        : function (s) {
            return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          };
    for (let i = 0; i < changedNos.length; i++) {
      const no = String(changedNos[i] || "");
      if (!no) continue;
      const wrap = grid.querySelector('.card-grid-item[data-card-no="' + esc(no) + '"]');
      if (!wrap) continue;
      const thumb = wrap.querySelector(".card-thumb");
      if (!thumb) continue;
      const rolesHtml = roleDeckPillsInnerHtml(no);
      const er = thumb.querySelector(".card-thumb-roles");
      if (rolesHtml) {
        if (er) er.outerHTML = rolesHtml;
        else thumb.insertAdjacentHTML("afterbegin", rolesHtml);
      } else if (er) {
        er.remove();
      }
      if (cardPanelMode === "deck") {
        const qn = deckMap[no] || 0;
        const qtyText = qn + " 枚";
        let badge = thumb.querySelector(".thumb-deck-qty");
        if (badge) badge.textContent = qtyText;
        else {
          const typeSpan = thumb.querySelector(".thumb-type");
          if (typeSpan)
            typeSpan.insertAdjacentHTML("beforebegin", '<span class="thumb-deck-qty">' + qtyText + "</span>");
        }
      }
    }
  }

  function afterDeckMapQuickChange(changedNos) {
    const list = Array.isArray(changedNos)
      ? changedNos
      : changedNos != null && changedNos !== ""
        ? [changedNos]
        : [];
    persistDeckState();
    renderCounts();
    const activeNosSig = computeActiveDeckNosSig();
    if (activeNosSig === lastDeckListActiveNosSig && patchDeckListQtyForNos(list)) {
      /* 登録デッキ一覧は枚数のみ更新（行の集合が変わったときだけフル再描画） */
    } else {
      scheduleRenderDeckList();
    }
    const filtered = computeFilteredCardListForGrid();
    updateCardHitCountFromFiltered(filtered);
    if (cardPanelMode === "deck") scheduleDeckSummaryDebounced();
    const newSig = filtered
      .map(function (c) {
        return c.card_no;
      })
      .join("\u0001");
    if (newSig === cardGridVirtual.lastOrderedSig && newSig !== "") {
      patchVisibleGridThumbsForNos(list);
      return;
    }
    pendingRenderCardGridOpts.deckSummary = false;
    scheduleRenderCardGridOpts({ deckSummary: false });
  }

  function afterDeckRoleLabelsChange(changedNo) {
    const no = String(changedNo || "");
    persistDeckState();
    renderCounts();
    scheduleRenderDeckList();
    const filtered = computeFilteredCardListForGrid();
    updateCardHitCountFromFiltered(filtered);
    if (cardPanelMode === "deck") scheduleDeckSummaryDebounced();
    const newSig = filtered
      .map(function (c) {
        return c.card_no;
      })
      .join("\u0001");
    if (cardGridVirtual.active && newSig === cardGridVirtual.lastOrderedSig) {
      patchVisibleGridThumbsForNos(no ? [no] : []);
      return;
    }
    pendingRenderCardGridOpts.deckSummary = false;
    scheduleRenderCardGridOpts({ deckSummary: false });
  }

  function scheduleRenderCardGridOpts(passOpts) {
    if (passOpts && passOpts.deckSummary === false) pendingRenderCardGridOpts.deckSummary = false;
    if (deckGridFlushRaf) cancelAnimationFrame(deckGridFlushRaf);
    deckGridFlushRaf = requestAnimationFrame(function () {
      deckGridFlushRaf = 0;
      const o = { deckSummary: pendingRenderCardGridOpts.deckSummary !== false };
      pendingRenderCardGridOpts.deckSummary = true;
      renderCardGrid(o);
    });
  }

  function scheduleRenderCardGrid() {
    scheduleRenderCardGridOpts(null);
  }

  function fillSelects() {
    const ps = el("filter-product");
    if (ps) {
      ps.innerHTML = '<option value="">（全商品）</option>';
      uniqueProducts(cards).forEach((p) => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = p;
        ps.appendChild(o);
      });
    }
    const ss = el("filter-series");
    if (ss) {
      ss.innerHTML = '<option value="">（全シリーズ）</option>';
      uniqueSeries(cards).forEach((p) => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = p;
        ss.appendChild(o);
      });
    }
    const us = el("filter-unit");
    if (us) {
      us.innerHTML = '<option value="">（全ユニット）</option>';
      uniqueUnits(cards).forEach((p) => {
        const o = document.createElement("option");
        o.value = p;
        o.textContent = p;
        us.appendChild(o);
      });
    }
    const fc = el("filter-costs");
    if (fc) {
      fc.innerHTML = "";
      allCosts.forEach((n) => {
        const lab = document.createElement("label");
        lab.className = "chk";
        lab.innerHTML = `<input type="checkbox" data-cost="${n}" checked /> ${n}`;
        fc.appendChild(lab);
      });
      fc.querySelectorAll("input[data-cost]").forEach((inp) => {
        inp.addEventListener("change", () => {
          const n = Number(inp.getAttribute("data-cost"));
          filterCosts[n] = inp.checked;
          renderCardGrid();
        });
      });
    }
  }

  el("search-text")?.addEventListener("input", (e) => {
    searchText = e.target.value;
    renderCardGrid();
  });
  el("filter-card-kind")?.addEventListener("change", (e) => {
    filterCardKind = /** @type {{ value: string }} */ (e.target).value || "both";
    syncFilterTypesFromKind();
    renderCardGrid();
  });
  el("filter-product")?.addEventListener("change", (e) => {
    filterProduct = e.target.value;
    renderCardGrid();
  });
  el("filter-series")?.addEventListener("change", (e) => {
    filterSeries = e.target.value;
    renderCardGrid();
  });
  el("filter-unit")?.addEventListener("change", (e) => {
    filterUnit = e.target.value;
    renderCardGrid();
  });
  el("cost-all-on")?.addEventListener("click", () => {
    allCosts.forEach((n) => {
      filterCosts[n] = true;
    });
    el("filter-costs")
      ?.querySelectorAll("input[data-cost]")
      .forEach((inp) => {
        inp.checked = true;
      });
    renderCardGrid();
  });
  el("btn-search-clear")?.addEventListener("click", () => {
    searchText = "";
    const inp = el("search-text");
    if (inp) inp.value = "";
    renderCardGrid();
    showToast("検索だけクリアしました");
  });

  el("btn-reset-filters")?.addEventListener("click", () => {
    searchText = "";
    const inp = el("search-text");
    if (inp) inp.value = "";
    filterProduct = "";
    filterSeries = "";
    filterUnit = "";
    filterTypes = { [T_MEMBER]: true, [T_LIVE]: true };
    filterCardKind = "both";
    const fk = el("filter-card-kind");
    if (fk) fk.value = "both";
    syncFilterTypesFromKind();
    el("filter-product") && (el("filter-product").value = "");
    el("filter-series") && (el("filter-series").value = "");
    el("filter-unit") && (el("filter-unit").value = "");
    allCosts.forEach((n) => {
      filterCosts[n] = true;
    });
    el("filter-costs")
      ?.querySelectorAll("input[data-cost]")
      .forEach((inp) => {
        inp.checked = true;
      });
    renderCardGrid();
    showToast("絞り込みをすべてリセットしました");
  });

  el("btn-deck-text-import")?.addEventListener("click", () => {
    const text = el("deck-text-import")?.value || "";
    const snap = getCardCatalogSnapshot();
    var parsed = parseDeckTextRecipe(text, snap);
    if (!parsed || typeof parsed !== "object" || !parsed.deckMap) {
      showToast("テキストの解析に失敗しました");
      return;
    }
    const keys = Object.keys(parsed.deckMap);
    if (!keys.length) {
      showToast(
        "一覧が読み取れません。「4 x PL!N-bp1-002-R＋」のように、行ごとに枚数・カード番号を入力してください（x は × でも可）。",
      );
      return;
    }
    let wmsg =
      parsed.warns && parsed.warns.length ? "\n\n" + parsed.warns.join("\n") : "";
    wmsg = wmsg.slice(0, 700);
    if (!confirm("現在のメインデッキを、このテキストの内容で置き換えますか？" + wmsg)) return;
    adoptDeckMapFromImported(parsed.deckMap);
    if (parsed.warns && parsed.warns.length)
      showToast(
        "テキストから構成しました（" + keys.length + " 種類）。確認: " + parsed.warns.slice(0, 3).join(" · "),
      );
    else showToast("テキストからメインデッキを構成しました（" + keys.length + " 種類のカード）");
  });

  el("btn-preset-load")?.addEventListener("click", () => {
    const sel = el("deck-preset-select");
    const id = sel && sel.value;
    if (!id) {
      showToast("一覧からデッキを選んでください");
      return;
    }
    const slot = library.slots.find((x) => x.id === id);
    if (!slot) {
      showToast("データがありません（一覧を更新しました）");
      library = loadDeckLibrary();
      renderPresetSelect();
      return;
    }
    deckMap = cloneDeckMap(slot.deck);
    keyCardNos.clear();
    keyCard2Nos.clear();
    keyCard3Nos.clear();
    middleCardNos.clear();
    for (const x of sanitizeCardNoList(slot.keyCardNos)) keyCardNos.add(x);
    for (const x of sanitizeCardNoList(slot.keyCard2Nos)) keyCard2Nos.add(x);
    for (const x of sanitizeCardNoList(slot.keyCard3Nos)) keyCard3Nos.add(x);
    for (const x of sanitizeCardNoList(slot.middleCardNos)) middleCardNos.add(x);
    persistDeckState();
    localStorage.setItem(STORAGE_ACTIVE_PRESET_ID, id);
    renderCounts();
    scheduleRenderDeckList();
    scheduleRenderCardGrid();
    showToast(`「${slot.name}」を読み込みました`);
  });

  el("btn-preset-peek")?.addEventListener("click", () => {
    const sel = el("deck-preset-select");
    const id = sel && sel.value;
    if (!id) {
      showToast("一覧からデッキを選んでから「デッキ確認」を押してください");
      return;
    }
    const slot = library.slots.find((x) => x.id === id);
    if (!slot) {
      showToast("データがありません（一覧を更新しました）");
      library = loadDeckLibrary();
      renderPresetSelect();
      return;
    }
    renderSavedDeckPeek(slot, {
      roleEditMode: "library-slot",
      librarySlotId: slot.id,
    });
  });

  el("btn-deck-registered-peek")?.addEventListener("click", function () {
    var hasCard = Object.keys(deckMap).some(function (k) {
      return deckMap[k] > 0;
    });
    if (!hasCard) {
      showToast("メインデッキにカードがありません");
      return;
    }
    renderSavedDeckPeek(
      {
        name: "現在のメインデッキ",
        deck: deckMap,
        keyCardNos: [...keyCardNos],
        keyCard2Nos: [...keyCard2Nos],
        keyCard3Nos: [...keyCard3Nos],
        middleCardNos: [...middleCardNos],
        updatedAt: new Date().toISOString(),
      },
      { peekTitle: "登録カード一覧", roleEditMode: "main" },
    );
  });

  el("btn-preset-save")?.addEventListener("click", () => {
    const sel = el("deck-preset-select");
    const id = sel && sel.value;
    if (!id) {
      showToast("「新規で保存」か、一覧でプリセットを選んでから「上書き保存」してください");
      return;
    }
    if (isBuiltInStarterDeckId(id)) {
      showToast("共通の初期デッキは上書きできません。「別名で保存」で自分用のコピーを作れます。");
      return;
    }
    const slot = library.slots.find((x) => x.id === id);
    if (!slot) {
      showToast("一覧がずれました。読み込み直ししてください");
      return;
    }
    library = updateDeckSlot(library, id, deckMap, {
      keyCardNos: [...keyCardNos],
      keyCard2Nos: [...keyCard2Nos],
      keyCard3Nos: [...keyCard3Nos],
      middleCardNos: [...middleCardNos],
    });
    persistDeckLibrary(library);
    renderPresetSelect();
    if (sel) sel.value = id;
    persistDeckState();
    showToast(`「${slot.name}」に上書き保存しました`);
  });

  el("btn-preset-save-as")?.addEventListener("click", () => {
    const raw = prompt("保存するデッキの名前を入力してください", "");
    if (raw === null) return;
    const name = raw.trim();
    library = addDeckSlot(library, name || "無題のデッキ", deckMap, {
      keyCardNos: [...keyCardNos],
      keyCard2Nos: [...keyCard2Nos],
      keyCard3Nos: [...keyCard3Nos],
      middleCardNos: [...middleCardNos],
    });
    persistDeckLibrary(library);
    const newest = library.slots[library.slots.length - 1];
    if (newest) localStorage.setItem(STORAGE_ACTIVE_PRESET_ID, newest.id);
    renderPresetSelect();
    const sel = el("deck-preset-select");
    if (sel && newest) sel.value = newest.id;
    persistDeckState();
    showToast(`「${newest?.name || "デッキ"}」として保存しました`);
  });

  el("btn-preset-duplicate")?.addEventListener("click", () => {
    var selDup = el("deck-preset-select");
    var idDup = selDup && selDup.value;
    if (!idDup) {
      showToast("複製したいプリセットを一覧から選んでください");
      return;
    }
    var slotOrig = library.slots.find(function (x) {
      return x.id === idDup;
    });
    if (!slotOrig) {
      showToast("データがありません（一覧を更新しました）");
      library = loadDeckLibrary();
      renderPresetSelect();
      return;
    }
    library = duplicateDeckSlot(library, idDup);
    persistDeckLibrary(library);
    var newestDup = library.slots[library.slots.length - 1];
    if (newestDup) localStorage.setItem(STORAGE_ACTIVE_PRESET_ID, newestDup.id);
    renderPresetSelect();
    var selAfter = el("deck-preset-select");
    if (selAfter && newestDup) selAfter.value = newestDup.id;
    showToast("「" + slotOrig.name + "」を複製しました（" + (newestDup?.name || "") + "）");
  });

  el("btn-preset-delete")?.addEventListener("click", () => {
    const sel = el("deck-preset-select");
    const id = sel && sel.value;
    if (!id) {
      showToast("一覧から削除したいプリセットを選んでください");
      return;
    }
    if (isBuiltInStarterDeckId(id)) {
      showToast("共通の初期デッキは削除できません。");
      return;
    }
    const slot = library.slots.find((x) => x.id === id);
    const nm = slot ? slot.name : "このプリセット";
    if (!confirm(`「${nm}」を削除しますか？`)) return;
    library = removeDeckSlot(library, id);
    persistDeckLibrary(library);
    if (localStorage.getItem(STORAGE_ACTIVE_PRESET_ID) === id)
      localStorage.removeItem(STORAGE_ACTIVE_PRESET_ID);
    renderPresetSelect();
    showToast(`「${nm}」を削除しました`);
  });

  el("cost-all-off")?.addEventListener("click", () => {
    allCosts.forEach((n) => {
      filterCosts[n] = false;
    });
    el("filter-costs")
      ?.querySelectorAll("input[data-cost]")
      .forEach((inp) => {
        inp.checked = false;
      });
    renderCardGrid();
  });

  el("btn-clear-deck")?.addEventListener("click", () => {
    if (confirm("デッキを空にしますか？")) {
      deckMap = {};
      keyCardNos.clear();
      keyCard2Nos.clear();
      keyCard3Nos.clear();
      middleCardNos.clear();
      persistDeckState();
      renderCounts();
      scheduleRenderDeckList();
      scheduleRenderCardGrid();
    }
  });

  el("btn-start-game")?.addEventListener("click", () => {
    const { total } = deckTotal();
    if (total <= 0) {
      alert("メインデッキにカードを 1 枚以上入れてください。");
      return;
    }
    pruneOrphanRoleLabels();
    if (persistDeckTimer) {
      clearTimeout(persistDeckTimer);
      persistDeckTimer = 0;
    }
    flushPersistDeckToStorage();
    onStartGame(deckMap);
  });

  el("btn-deck-export")?.addEventListener("click", () => {
    const payload = JSON.stringify(
      {
        v: DECK_EXPORT_VERSION,
        deck: deckMap,
        keyCardNos: [...keyCardNos].sort(),
        keyCard2Nos: [...keyCard2Nos].sort(),
        keyCard3Nos: [...keyCard3Nos].sort(),
        middleCardNos: [...middleCardNos].sort(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "loveca-deck-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("デッキを JSON で保存しました");
  });

  el("deck-import-file")?.addEventListener("change", (e) => {
    const input = e.target;
    const f = input.files && input.files[0];
    input.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(String(reader.result || ""));
        const raw = data.deck != null ? data.deck : data;
        if (!isValidDeckMap(raw)) {
          showToast("デッキ JSON の形式が正しくありません");
          return;
        }
        if (!confirm("現在のメインデッキを、このファイルの内容で置き換えますか？")) return;
        deckMap = raw;
        keyCardNos.clear();
        keyCard2Nos.clear();
        keyCard3Nos.clear();
        middleCardNos.clear();
        for (const x of sanitizeCardNoList(data.keyCardNos)) keyCardNos.add(x);
        for (const x of sanitizeCardNoList(data.keyCard2Nos)) keyCard2Nos.add(x);
        for (const x of sanitizeCardNoList(data.keyCard3Nos)) keyCard3Nos.add(x);
        for (const x of sanitizeCardNoList(data.middleCardNos)) middleCardNos.add(x);
        persistDeckState();
        localStorage.removeItem(STORAGE_ACTIVE_PRESET_ID);
        renderPresetSelect();
        renderCounts();
        scheduleRenderDeckList();
        scheduleRenderCardGrid();
        showToast("デッキを読み込みました（JSON・プリセット一覧とは未紐付け）");
      } catch {
        showToast("JSON の解析に失敗しました");
      }
    };
    reader.readAsText(f);
  });

  el("btn-toggle-deck-list")?.addEventListener("click", () => {
    deckListOpen = !deckListOpen;
    const wrap = el("deck-list-wrap");
    const b = el("btn-toggle-deck-list");
    if (wrap) wrap.hidden = !deckListOpen;
    if (b) {
      b.setAttribute("aria-expanded", deckListOpen ? "true" : "false");
      b.textContent = deckListOpen ? "登録カード一覧を隠す" : "登録カード一覧を表示";
    }
  });

  el("deck-preset-select")?.addEventListener("change", () => {
    const sel = el("deck-preset-select");
    if (sel && sel.value) localStorage.setItem(STORAGE_ACTIVE_PRESET_ID, sel.value);
    else localStorage.removeItem(STORAGE_ACTIVE_PRESET_ID);
  });

  el("deck-preset-thumb-select")?.addEventListener("change", function () {
    const presetSel = el("deck-preset-select");
    const thumbSel = el("deck-preset-thumb-select");
    const id = presetSel && presetSel.value;
    if (!id || !thumbSel || thumbSel.disabled) return;
    if (isBuiltInStarterDeckId(id)) {
      showToast("共通の初期デッキのサムネは変更できません。");
      return;
    }
    const slot = library.slots.find((x) => x.id === id);
    if (!slot) return;
    const raw = thumbSel.value;
    const thumbVal = raw === "__auto__" ? "" : raw;
    library = updateDeckSlot(library, id, slot.deck, {
      keyCardNos: Array.isArray(slot.keyCardNos) ? slot.keyCardNos : [],
      keyCard2Nos: Array.isArray(slot.keyCard2Nos) ? slot.keyCard2Nos : [],
      keyCard3Nos: Array.isArray(slot.keyCard3Nos) ? slot.keyCard3Nos : [],
      middleCardNos: Array.isArray(slot.middleCardNos) ? slot.middleCardNos : [],
      thumbnailCardNo: thumbVal,
    });
    persistDeckLibrary(library);
    syncDeckPresetThumbPreview();
    fillDeckPresetThumbSelect();
  });

  el("deck-list-sort")?.addEventListener("change", (ev) => {
    deckListSort = ev.target.value || "name";
    scheduleRenderDeckList();
  });

  el("filter-bh-slots")?.addEventListener("change", scheduleRenderCardGrid);
  el("filter-heart-slots")?.addEventListener("change", scheduleRenderCardGrid);
  el("btn-filter-bh-heart-clear")?.addEventListener("click", function () {
    root.querySelectorAll("#filter-bh-slots input[type=checkbox]").forEach(function (x) {
      x.checked = false;
    });
    root.querySelectorAll("#filter-heart-slots input[type=checkbox]").forEach(function (x) {
      x.checked = false;
    });
    scheduleRenderCardGrid();
  });

  document.getElementById("dlg-zoom-qty-minus")?.addEventListener("click", function (ev) {
    ev.preventDefault();
    var c = zoomTargetCardForBuilder;
    if (!c) return;
    var em = effectiveMainDeckCategory(c);
    if (em !== T_MEMBER && em !== T_LIVE) return;
    var no = c.card_no;
    var cur = deckMap[no] || 0;
    if (cur <= 0) return;
    deckMap[no] = cur - 1;
    if (!(deckMap[no] > 0)) delete deckMap[no];
    afterDeckMapQuickChange(no);
  });
  document.getElementById("dlg-zoom-qty-plus")?.addEventListener("click", function (ev) {
    ev.preventDefault();
    var c = zoomTargetCardForBuilder;
    if (!c) return;
    var em = effectiveMainDeckCategory(c);
    if (em !== T_MEMBER && em !== T_LIVE) return;
    void (async function () {
      var addNo = await resolvedCardNoForAdd(c);
      if (!addNo) return;
      if (!canAddNo(addNo, 1)) return;
      deckMap[addNo] = (deckMap[addNo] || 0) + 1;
      afterDeckMapQuickChange(addNo);
    })();
  });

  function setCardPanelMode(mode) {
    if (mode !== "catalog" && mode !== "deck") return;
    invalidateCatalogFilterCache();
    cardPanelMode = mode;
    const bc = el("btn-card-panel-catalog");
    const bd = el("btn-card-panel-deck");
    if (bc) {
      bc.setAttribute("aria-pressed", mode === "catalog" ? "true" : "false");
      bc.classList.toggle("primary", mode === "catalog");
    }
    if (bd) {
      bd.setAttribute("aria-pressed", mode === "deck" ? "true" : "false");
      bd.classList.toggle("primary", mode === "deck");
    }
    scheduleRenderCardGrid();
  }

  el("btn-card-panel-catalog")?.addEventListener("click", function () {
    setCardPanelMode("catalog");
  });
  el("btn-card-panel-deck")?.addEventListener("click", function () {
    setCardPanelMode("deck");
  });

  const cardGridScrollEl = el("card-grid-scroll");
  if (cardGridScrollEl && !cardGridScrollEl.dataset.vwin) {
    cardGridScrollEl.dataset.vwin = "1";
    cardGridScrollEl.addEventListener(
      "scroll",
      function () {
        if (!cardGridVirtual.active) return;
        cardGridVirtualIsScrolling = true;
        if (cardGridVirtualScrollIdleTimer) clearTimeout(cardGridVirtualScrollIdleTimer);
        cardGridVirtualScrollIdleTimer = setTimeout(function () {
          cardGridVirtualScrollIdleTimer = 0;
          cardGridVirtualIsScrolling = false;
          cardGridVirtual.w0 = -1;
          syncVirtualCardGridWindow(true);
        }, 140);
        if (cardGridVirtualRaf) cancelAnimationFrame(cardGridVirtualRaf);
        cardGridVirtualRaf = requestAnimationFrame(function () {
          cardGridVirtualRaf = 0;
          syncVirtualCardGridWindow(false);
        });
      },
      { passive: true },
    );
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(function () {
        if (!cardGridVirtual.active) return;
        cardGridVirtual.w0 = -1;
        syncVirtualCardGridWindow(true);
      });
      ro.observe(cardGridScrollEl);
    }
  }

  if (!deckBuilderStorageFlushHooked) {
    deckBuilderStorageFlushHooked = true;
    window.addEventListener("pagehide", function () {
      if (persistDeckTimer) {
        clearTimeout(persistDeckTimer);
        persistDeckTimer = 0;
        flushPersistDeckToStorage();
      }
    });
  }

  function tryApplyFirstVisitCatalogProductFilter() {
    try {
      if (localStorage.getItem(STORAGE_CATALOG_INITIAL_FILTER_APPLIED)) return;
      const want = FIRST_VISIT_CATALOG_PRODUCT_EXACT;
      /** @type {Set<string>} */
      const products = new Set();
      cards.forEach(function (c) {
        if (c && c.product) products.add(String(c.product));
      });
      var pick = "";
      if (products.has(want)) pick = want;
      else {
        products.forEach(function (p) {
          if (pick) return;
          if (p.indexOf("スタートデッキ") >= 0 && p.indexOf("ラブライブ") >= 0) pick = p;
        });
      }
      const sel = el("filter-product");
      if (pick && sel) {
        var ok = Array.prototype.some.call(sel.options, function (o) {
          return o.value === pick;
        });
        if (ok) {
          filterProduct = pick;
          sel.value = pick;
          invalidateCatalogFilterCache();
        }
      }
      localStorage.setItem(STORAGE_CATALOG_INITIAL_FILTER_APPLIED, "1");
    } catch (_e) {
      /* ストレージ不可時は毎回試みるが致命ではない */
    }
  }

  fillSelects();
  tryApplyFirstVisitCatalogProductFilter();
  wirePeekListRoleEditorOnce();
  renderPresetSelect();
  renderCounts();
  renderDeckList();
  renderCardGrid();
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
