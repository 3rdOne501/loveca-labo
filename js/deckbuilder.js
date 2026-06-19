import {
  DECK_EXPORT_VERSION,
  DEFAULT_STARTER_DECK_MAP,
  DEFAULT_STARTER_KEY2_CARD_NOS,
  DEFAULT_STARTER_KEY3_CARD_NOS,
  DEFAULT_STARTER_KEY_CARD_NOS,
  DEFAULT_STARTER_MIDDLE_CARD_NOS,
  FIRST_VISIT_CATALOG_PRODUCT_EXACT,
  FILTER_PRODUCT_TEST_CARD_LOG,
  MAX_COPIES_PER_CARD,
  MAIN_SIZE,
  SAMPLE_DECK_RECIPES_PUBLIC_FILENAME,
  STORAGE_ACTIVE_PRESET_ID,
  STORAGE_BUILDER_UI_RELOAD,
  STORAGE_BUILDER_UI_RESTORE_FLAG,
  STORAGE_CARD_FAVORITES,
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
  restoreBuiltInStarterSlot,
  updateDeckSlot,
} from "./deckLibrary.js";

/** deckLibrary と同じ判定（古い deckLibrary.js がキャッシュされても deckbuilder 単体で動く） */
function canDismissBuiltInStarter(lib) {
  if (!lib || !Array.isArray(lib.slots)) return false;
  for (let i = 0; i < lib.slots.length; i++) {
    const s = lib.slots[i];
    if (s && !isBuiltInStarterDeckId(s.id)) return true;
  }
  return false;
}
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
  isHandDependentCost20Member,
  cardIsNoteLiveCatalog,
  cardIsDrawYellLiveCatalog,
} from "./cards.js";
import { openCardCatalogDialog, renderCardCatalogContentInto } from "./cardCatalogDialog.js";
import { parseDeckTextRecipe } from "./decklogImport.js";
import {
  effectiveSampleThumbnailCardNo,
  getSampleDeckRecipes,
  normalizeSampleRecipesArray,
  SAMPLE_DEVELOPER_PASSCODE,
  savePublishedSampleRecipesToDisk,
  setPublishedSampleRecipesCache,
} from "./sampleDeckRecipes.js";
import {
  appendTestCardLogEntry,
  getTestCardLogCacheSig,
  getTestCardLogEntries,
  getTestCardLogSavePreference,
  setTestCardLogSavePreference,
} from "./testCardLog.js";
import { showToast } from "./ui.js";
import {
  bladeHeartAggregatePillHtml,
  bladeHeartRowIconsHtml,
  bladeHeartDisplaySlotLabel,
  cardHasBladeHeart,
  compareBladeHeartDbKeys,
  heartSlotArtIconHtml,
  isBladeHeartDrawMarkerKey,
  parseBladeHeartSlotFromKey,
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

/** @param {Record<string, number>} deckMap @param {string} dbKey */
function deckMapCardNosWithBhKey(deckMap, dbKey) {
  const out = [];
  if (!deckMap || !dbKey) return out;
  for (const [no, n] of Object.entries(deckMap)) {
    if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) continue;
    const c = getCard(no);
    if (!c || !cardHasBladeHeart(c)) continue;
    const bh = c.blade_heart;
    if (!bh || typeof bh !== "object" || Array.isArray(bh)) continue;
    const v = Number(bh[dbKey]);
    if (Number.isFinite(v) && v !== 0) out.push(no);
  }
  return out;
}

/** @param {Record<string, number>} deckMap @param {(card: import("./cards.js").CardRecord, no: string) => boolean} predicate */
function firstDeckMapCardNo(deckMap, predicate) {
  if (!deckMap) return null;
  for (const [no, n] of Object.entries(deckMap)) {
    if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) continue;
    const c = getCard(no);
    if (c && predicate(c, no)) return no;
  }
  return null;
}

function deckPeekBhPillButton(innerHtml, cardNo, titleExtra, opts) {
  opts = opts || {};
  const dbKey = opts.dbKey || "";
  const cohort = opts.cohort || "";
  if (!cardNo && !dbKey && !cohort) return innerHtml;
  const t = titleExtra || "クリックでカード一覧";
  return (
    '<button type="button" class="deck-peek-bh-pill-btn"' +
    (cardNo ? ' data-deck-bh-card-no="' + escapeAttr(cardNo) + '"' : "") +
    (dbKey ? ' data-deck-bh-key="' + escapeAttr(dbKey) + '"' : "") +
    (cohort ? ' data-deck-bh-cohort="' + escapeAttr(cohort) + '"' : "") +
    ' title="' + escapeAttr(t) + '">' +
    innerHtml +
    "</button>"
  );
}

function formatDeckPeekDeckNameHtml(deckName) {
  const nm = String(deckName || "").trim() || "（名称未設定）";
  return '<div class="deck-peek-deck-name" role="heading" aria-level="3">' + escapeHtml(nm) + "</div>";
}

/**
 * BH 色ピルと同系の見た目で、非BH メンバー／スコア／ドロー の集計ピルを出す。
 * @param {number} nonBhMemberCopies
 * @param {number} scoreLiveCopies スコア（BH なしライブ＝同一）
 * @param {number} drawLiveCopies ドロー特殊ハートのライブ枚数
 */
function formatDeckPeekSyntheticBhPillsHtml(nonBhMemberCopies, scoreLiveCopies, drawLiveCopies, deckMap) {
  let html = "";
  if (nonBhMemberCopies > 0) {
    const pill =
      '<span class="deck-peek-bh-color-pill deck-peek-bh-pill--nonbh-mem" title="' +
      escapeHtml("メンバーカードで BH 記載なし") +
      '"><span class="deck-peek-bh-kanji">非BH</span><span class="deck-peek-bh-pill-qty">× ' +
      nonBhMemberCopies +
      "</span></span>";
    html += deckPeekBhPillButton(
      pill,
      firstDeckMapCardNo(deckMap, function (c) {
        return c.type === T_MEMBER && !cardHasBladeHeart(c);
      }),
      "クリックで非BH メンバー一覧",
      { cohort: "nonbh_mem" },
    );
  }
  if (scoreLiveCopies > 0) {
    const pill =
      '<span class="deck-peek-bh-color-pill deck-peek-bh-pill--note-live-pill deck-peek-bh-pill--art" title="' +
      escapeHtml("スコア（BH なしのライブ）") +
      '"><span class="deck-peek-bh-kanji deck-peek-bh-pill-icon-only">' +
      heartSlotArtIconHtml(0, { score: true, extraClass: "deck-peek-bh-pill-art-ico" }) +
      '<span class="visually-hidden">スコア</span></span><span class="deck-peek-bh-pill-qty">× ' +
      scoreLiveCopies +
      "</span></span>";
    html += deckPeekBhPillButton(
      pill,
      firstDeckMapCardNo(deckMap, function (c) {
        return cardIsNoteLiveCatalog(c);
      }),
      "クリックでスコア（BHなしライブ）一覧",
      { cohort: "score_live" },
    );
  }
  if (drawLiveCopies > 0) {
    const pill =
      '<span class="deck-peek-bh-color-pill deck-peek-bh-pill--draw-yell deck-peek-bh-pill--art" title="' +
      escapeHtml("ドロー（色 BH あり・ALL なしのライブ）") +
      '"><span class="deck-peek-bh-kanji deck-peek-bh-pill-icon-only">' +
      heartSlotArtIconHtml(0, { draw_yell: true, extraClass: "deck-peek-bh-pill-art-ico" }) +
      '<span class="visually-hidden">ドロー</span></span><span class="deck-peek-bh-pill-qty">× ' +
      drawLiveCopies +
      "</span></span>";
    html += deckPeekBhPillButton(
      pill,
      firstDeckMapCardNo(deckMap, function (c) {
        return cardIsDrawYellLiveCatalog(c);
      }),
      "クリックでドロー（BH＋ドロー特殊ライブ）一覧",
      { cohort: "draw_live" },
    );
  }
  return html;
}

/**
 * @param {Record<string, number>} byKey
 * @param {number} totalWeighted
 * @param {number} bhMemberCopies
 * @param {number} bhLiveCopies
 * @param {number} nonBhMemberCopies
 * @param {number} scoreLiveCopies
 * @param {number} drawLiveCopies
 */
function formatBladeHeartBlockHtml(
  byKey,
  totalWeighted,
  bhMemberCopies,
  bhLiveCopies,
  nonBhMemberCopies,
  scoreLiveCopies,
  drawLiveCopies,
  byKeyAdditive,
  deckMap,
) {
  const entries = Object.entries(byKey).sort(function (a, b) {
    return compareBladeHeartDbKeys(a[0], b[0]);
  });
  const cardLine =
    '<div class="deck-peek-bh-total-line"><strong>BH 記載</strong> メンバー <span class="deck-peek-accent">' +
    bhMemberCopies +
    '</span> · ライブ <span class="deck-peek-accent">' +
    bhLiveCopies +
    '</span> · BHなし メンバー <span class="deck-peek-muted-num">' +
    nonBhMemberCopies +
    '</span> · スコア <span class="deck-peek-muted-num">' +
    scoreLiveCopies +
    "</span></div>";

  const synthetic = formatDeckPeekSyntheticBhPillsHtml(nonBhMemberCopies, scoreLiveCopies, drawLiveCopies, deckMap);

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
      const nos = deckMapCardNosWithBhKey(deckMap, ent[0]);
      const pill = bladeHeartAggregatePillHtml(ent[0], ent[1], byKeyAdditive[ent[0]] || 0, { showScoreBadge: false });
      const titleExtra =
        nos.length > 1 ? "クリックでカード一覧（" + nos.length + " 種）" : "クリックでカード詳細";
      return deckPeekBhPillButton(pill, nos[0] || null, titleExtra, { dbKey: ent[0] });
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
  const { total } = countMain(deckMap);

  for (const [no, n] of Object.entries(deckMap)) {
    if (n <= 0) continue;
    if (!getCard(no)) warnings.push("未登録のカード番号: " + no + "（×" + n + "）");
    if (n > MAX_COPIES_PER_CARD) {
      warnings.push(no + " が同一 " + MAX_COPIES_PER_CARD + " 枚を超えています（×" + n + "）");
    }
  }


  if (total !== MAIN_SIZE && total > 0) {
    warnings.push("メインデッキの枚数が " + MAIN_SIZE + " 枚ではありません（現在 " + total + " 枚ですが、ソロでは開始できます）。");
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
    if (isHandDependentCost20Member(card.card_no)) {
      return `<span class="thumb-sub" title="手札にいる間の印刷コスト目安: 20 から「自身以外の手札枚数」ぶん減少（ツール上の計算）">コスト 20〜0※</span>`;
    }
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
  /** @type {Record<string, number> | null} 直近に開いた覗き見デッキの map（BH ピル一覧表示用） */
  let lastPeekDeckMap = null;
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
  /** @type {"default"|"fav-first"|"name"|"cost-asc"|"card-no"} */
  let catalogSortOrder = "default";
  let filterFavoritesOnly = false;
  /** @type {Set<string>} */
  let cardFavorites = (function loadCardFavoritesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_CARD_FAVORITES);
      if (!raw) return new Set();
      const p = JSON.parse(raw);
      return new Set(Array.isArray(p) ? p.map(String) : []);
    } catch (_) {
      return new Set();
    }
  })();

  function persistCardFavorites() {
    try {
      localStorage.setItem(STORAGE_CARD_FAVORITES, JSON.stringify([...cardFavorites]));
    } catch (_) {
      /* noop */
    }
  }

  function syncFilterTypesFromCheckboxes() {
    const m = el("filter-show-member");
    const lv = el("filter-show-live");
    filterTypes[T_MEMBER] = m ? !!m.checked : true;
    filterTypes[T_LIVE] = lv ? !!lv.checked : true;
  }

  function syncCheckboxesFromFilterTypes() {
    const m = el("filter-show-member");
    const lv = el("filter-show-live");
    if (m) m.checked = !!filterTypes[T_MEMBER];
    if (lv) lv.checked = !!filterTypes[T_LIVE];
  }
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
    /** 一覧と役割編集・補助パネルの組み合わせが変わったらセルを作り直す */
    lastLayoutSig: "",
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
  /** 仮想グリッド用のパネル識別（一覧ビューは常にカタログ） */
  const CARD_GRID_VIRTUAL_PANEL = "catalog";
  /** 下段サンプル一覧パネルを表示するか（上段と同時表示可） */
  let samplePanelOpen = false;
  /** 登録デッキ（保存済みプリセット）一覧パネルを表示するか */
  let deckRegistrationPanelOpen = false;
  /** 「現在のデッキ」: 編集中メインデッキだけにフィルタ表示するか（旧 登録デッキタブ相当） */
  let currentDeckPanelOpen = false;
  /** 「再読込」復元時にスクロールを戻すための一次バッファ */
  let pendingBuilderUiRestoreScroll = /** @type {{ card: number, sample: number } | null} */ (null);
  const cards = getAllCards();
  const allCosts = uniqueCosts(cards);
  const filterCosts = {};
  allCosts.forEach((n) => {
    filterCosts[n] = true;
  });

  const el = (id) => root.querySelector("#" + id) || document.getElementById(id);

  function captureDeckBuilderUiPayload() {
    var detFi = root.querySelector("#deck-search-panel-filters");
    var cg = el("card-grid-scroll");
    var sp = el("sample-recipes-scroll");
    var bh = readBhSlotFilters();
    var bx = readBhFilterExtras();
    var hs = readHeartSlotFilters();
    /** @type {Record<string, boolean>} */
    var costSnap = {};
    Object.keys(filterCosts).forEach(function (k) {
      costSnap[k] = !!filterCosts[k];
    });
    var dlgCatalogOpen = false;
    var catalogCardNo = "";
    var dlgCat = document.getElementById("dlg-card-catalog");
    if (dlgCat && typeof dlgCat.open === "boolean" && dlgCat.open) {
      dlgCatalogOpen = true;
      var sub = document.getElementById("dlg-card-catalog-subtitle");
      catalogCardNo =
        sub && sub.dataset && sub.dataset.cardNo
          ? String(sub.dataset.cardNo).trim()
          : sub && sub.textContent
            ? String(sub.textContent).trim()
            : "";
    }
    /** @type {Record<string, unknown>} */
    var payload = {
      v: 2,
      samplePanelOpen: !!samplePanelOpen,
      deckRegistrationPanelOpen: !!deckRegistrationPanelOpen,
      currentDeckPanelOpen: !!currentDeckPanelOpen,
      deckListOpen: !!deckListOpen,
      cardGridScrollTop: cg ? cg.scrollTop : 0,
      sampleScrollTop: sp ? sp.scrollTop : 0,
      searchText: searchText,
      filterProduct: filterProduct,
      filterSeries: filterSeries,
      filterUnit: filterUnit,
      filterTypes: { [T_MEMBER]: !!filterTypes[T_MEMBER], [T_LIVE]: !!filterTypes[T_LIVE] },
      filterCosts: costSnap,
      bhSlots: [...bh],
      bhNonBh: !!bx.nonBh,
      bhNoteLive: !!bx.noteLive,
      bhDrawYell: !!bx.drawYell,
      heartSlots: [...hs],
      catalogSortOrder: catalogSortOrder,
      filterFavoritesOnly: !!filterFavoritesOnly,
      catalogDialogOpen: dlgCatalogOpen,
      catalogDialogCardNo: catalogCardNo,
    };
    if (detFi && detFi.tagName === "DETAILS") {
      payload.deckSearchFiltersOpen = /** @type {HTMLDetailsElement} */ (detFi).open;
    }
    return payload;
  }

  function persistDeckBuilderUiState() {
    try {
      sessionStorage.setItem(STORAGE_BUILDER_UI_RELOAD, JSON.stringify(captureDeckBuilderUiPayload()));
    } catch (_) {
      /* noop */
    }
  }
  window.__llocgPersistDeckBuilderUi = persistDeckBuilderUiState;

  function applyDeckBuilderUiPayload(o) {
    if (!o || (o.v !== 1 && o.v !== 2)) return;
    if (typeof o.samplePanelOpen === "boolean") samplePanelOpen = o.samplePanelOpen;
    if (typeof o.deckRegistrationPanelOpen === "boolean") deckRegistrationPanelOpen = o.deckRegistrationPanelOpen;
    if (typeof o.currentDeckPanelOpen === "boolean") currentDeckPanelOpen = o.currentDeckPanelOpen;
    if (typeof o.deckListOpen === "boolean") deckListOpen = o.deckListOpen;
    if (o.v >= 2) {
      if (typeof o.searchText === "string") searchText = o.searchText;
      if (typeof o.filterProduct === "string") filterProduct = o.filterProduct;
      if (typeof o.filterSeries === "string") filterSeries = o.filterSeries;
      if (typeof o.filterUnit === "string") filterUnit = o.filterUnit;
      if (o.filterTypes && typeof o.filterTypes === "object") {
        if (typeof o.filterTypes[T_MEMBER] === "boolean") filterTypes[T_MEMBER] = o.filterTypes[T_MEMBER];
        if (typeof o.filterTypes[T_LIVE] === "boolean") filterTypes[T_LIVE] = o.filterTypes[T_LIVE];
      }
      if (o.filterCosts && typeof o.filterCosts === "object") {
        Object.keys(filterCosts).forEach(function (k) {
          var n = Number(k);
          if (Object.prototype.hasOwnProperty.call(o.filterCosts, k)) {
            filterCosts[n] = !!o.filterCosts[k];
          } else if (Object.prototype.hasOwnProperty.call(o.filterCosts, String(n))) {
            filterCosts[n] = !!o.filterCosts[String(n)];
          }
        });
      }
      if (typeof o.catalogSortOrder === "string") catalogSortOrder = o.catalogSortOrder;
      if (typeof o.filterFavoritesOnly === "boolean") filterFavoritesOnly = o.filterFavoritesOnly;
    }
    var detR = root.querySelector("#deck-search-panel-filters");
    if (detR && detR.tagName === "DETAILS" && typeof o.deckSearchFiltersOpen === "boolean") {
      /** @type {HTMLDetailsElement} */ (detR).open = o.deckSearchFiltersOpen;
    }
    pendingBuilderUiRestoreScroll = {
      card: typeof o.cardGridScrollTop === "number" ? o.cardGridScrollTop : 0,
      sample: typeof o.sampleScrollTop === "number" ? o.sampleScrollTop : 0,
    };
    return o;
  }

  function applyDeckBuilderUiPayloadToDom(o) {
    if (!o) return;
    var inp = el("search-text");
    if (inp) inp.value = searchText;
    var fp = el("filter-product");
    if (fp) fp.value = filterProduct || "";
    var fs = el("filter-series");
    if (fs) fs.value = filterSeries || "";
    var fu = el("filter-unit");
    if (fu) fu.value = filterUnit || "";
    syncCheckboxesFromFilterTypes();
    var sortEl = el("catalog-sort-order");
    if (sortEl) sortEl.value = catalogSortOrder || "default";
    var fo = el("filter-favorites-only");
    if (fo) fo.checked = !!filterFavoritesOnly;
    root.querySelectorAll("#filter-costs input[data-cost]").forEach(function (inpCost) {
      var n = Number(inpCost.getAttribute("data-cost"));
      if (Number.isFinite(n)) inpCost.checked = !!filterCosts[n];
    });
    var bhPanel = root.querySelector("#filter-bh-slots");
    if (bhPanel && o.v >= 2 && Array.isArray(o.bhSlots)) {
      var bhSet = new Set(o.bhSlots.map(Number));
      bhPanel.querySelectorAll("input[data-bh-slot]").forEach(function (inp) {
        var s = Number(inp.getAttribute("data-bh-slot"));
        inp.checked = bhSet.has(s);
      });
      var nb = bhPanel.querySelector("input[data-bh-filter='non-bh']");
      if (nb) nb.checked = !!o.bhNonBh;
      var nl = bhPanel.querySelector("input[data-bh-filter='note-live']");
      if (nl) nl.checked = !!o.bhNoteLive;
      var dy = bhPanel.querySelector("input[data-bh-filter='draw-yell']");
      if (dy) dy.checked = !!o.bhDrawYell;
    }
    var heartPanel = root.querySelector("#filter-heart-slots");
    if (heartPanel && o.v >= 2 && Array.isArray(o.heartSlots)) {
      var hsSet = new Set(o.heartSlots.map(Number));
      heartPanel.querySelectorAll("input[data-heart-slot]").forEach(function (inp) {
        var s = Number(inp.getAttribute("data-heart-slot"));
        inp.checked = hsSet.has(s);
      });
    }
    var wrapDl = el("deck-list-wrap");
    var btnTl = el("btn-toggle-deck-list");
    if (wrapDl) wrapDl.hidden = !deckListOpen;
    if (btnTl) {
      btnTl.setAttribute("aria-expanded", deckListOpen ? "true" : "false");
      btnTl.textContent = deckListOpen ? "登録カード一覧を隠す" : "登録カード一覧を表示";
    }
    invalidateCatalogFilterCache();
  }

  function restoreDeckBuilderUiFromSession(opts) {
    opts = opts || {};
    try {
      if (sessionStorage.getItem(STORAGE_BUILDER_UI_RESTORE_FLAG) === "1") {
        sessionStorage.removeItem(STORAGE_BUILDER_UI_RESTORE_FLAG);
      }
      var raw = sessionStorage.getItem(STORAGE_BUILDER_UI_RELOAD);
      if (!raw) return;
      var o = applyDeckBuilderUiPayload(JSON.parse(raw));
      if (!o) return;
      applyDeckBuilderUiPayloadToDom(o);
      syncCardPanelToggleButtons();
      renderCardGrid();
      if (opts.reopenCatalog && o.v >= 2 && o.catalogDialogOpen && o.catalogDialogCardNo) {
        var card = getCard(o.catalogDialogCardNo);
        if (card) {
          requestAnimationFrame(function () {
            openCardCatalogDialogForDeckEdit(card);
          });
        }
      }
    } catch (_) {
      /* noop */
    }
  }
  window.__llocgRestoreDeckBuilderUi = restoreDeckBuilderUiFromSession;

  function consumeBuilderUiRestoreFlag() {
    restoreDeckBuilderUiFromSession({ reopenCatalog: true });
  }

  var builderUiPersistDebounce = 0;
  function schedulePersistDeckBuilderUiState() {
    if (builderUiPersistDebounce) clearTimeout(builderUiPersistDebounce);
    builderUiPersistDebounce = setTimeout(function () {
      builderUiPersistDebounce = 0;
      persistDeckBuilderUiState();
    }, 280);
  }

  const SESSION_SAMPLE_DEV_KEY = "llocg_sample_dev_mode_v1";
  /** 開発者モード・サンプル並べ替え DnD 用 drag 元インデックス */
  var sampleRecipeDnDFrom = -1;

  function isSampleDevMode() {
    try {
      return sessionStorage.getItem(SESSION_SAMPLE_DEV_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setSampleDevMode(on) {
    try {
      if (on) sessionStorage.setItem(SESSION_SAMPLE_DEV_KEY, "1");
      else sessionStorage.removeItem(SESSION_SAMPLE_DEV_KEY);
    } catch (_) {}
  }

  function syncSampleDeveloperToolbar() {
    var dev = isSampleDevMode();
    var toggleBtn = el("btn-sample-dev-toggle");
    var panel = el("deck-dev-only-panel");
    if (toggleBtn) {
      toggleBtn.textContent = dev ? "開発者モードを終了" : "開発者モード（サンプル編集）…";
      toggleBtn.setAttribute("aria-pressed", dev ? "true" : "false");
      toggleBtn.classList.toggle("primary", dev);
      toggleBtn.classList.toggle("secondary", !dev);
    }
    if (panel) panel.hidden = !dev;
  }

  function devPublishSampleRecipeList(nextRaw, opts) {
    opts = opts || {};
    var norm = normalizeSampleRecipesArray(nextRaw);
    if (!norm.length) {
      showToast("サンプルは1件以上必要です");
      return;
    }
    setPublishedSampleRecipesCache(norm);
    if (!opts.quiet) {
      showToast(
        "一覧を更新しました。サイトに反映するには下の「デプロイ用 JSON を保存…」でファイルを書き出し、手順どおりアップロードしてください。",
      );
    }
    if (samplePanelOpen) scheduleRenderCardGrid();
  }

  function sampleRecipeDraftFromEditor(nameStr, idStr) {
    var thumbSel = el("deck-preset-thumb-select");
    var thumbNo = "";
    if (thumbSel && thumbSel.value) thumbNo = String(thumbSel.value).trim();
    if (!thumbNo) {
      var k1 = Array.from(keyCardNos);
      if (k1.length) thumbNo = k1[0];
    }
    if (!thumbNo) {
      var ns = Object.keys(deckMap || {}).filter(function (k) {
        return (deckMap[k] || 0) > 0;
      });
      if (ns.length) thumbNo = ns.sort()[0];
    }
    return {
      id: idStr,
      name: nameStr,
      deck: cloneDeckMap(deckMap),
      keyCardNos: sanitizeCardNoList(Array.from(keyCardNos)),
      keyCard2Nos: sanitizeCardNoList(Array.from(keyCard2Nos)),
      keyCard3Nos: sanitizeCardNoList(Array.from(keyCard3Nos)),
      middleCardNos: sanitizeCardNoList(Array.from(middleCardNos)),
      thumbnailCardNo: thumbNo,
    };
  }

  syncCheckboxesFromFilterTypes();

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

  function readBhFilterExtras() {
    const panel = root.querySelector("#filter-bh-slots");
    if (!panel) return { nonBh: false, noteLive: false, drawYell: false };
    return {
      nonBh: !!panel.querySelector("input[data-bh-filter='non-bh']:checked"),
      noteLive: !!panel.querySelector("input[data-bh-filter='note-live']:checked"),
      drawYell: !!panel.querySelector("input[data-bh-filter='draw-yell']:checked"),
    };
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

  /** @returns {{ map: Record<string, number>, keyCardNos: string[], keyCard2Nos: string[], keyCard3Nos: string[], middleCardNos: string[] }} */
  function editorDeckBundleSnapshot() {
    return {
      map: cloneDeckMap(deckMap),
      keyCardNos: sanitizeCardNoList(Array.from(keyCardNos)),
      keyCard2Nos: sanitizeCardNoList(Array.from(keyCard2Nos)),
      keyCard3Nos: sanitizeCardNoList(Array.from(keyCard3Nos)),
      middleCardNos: sanitizeCardNoList(Array.from(middleCardNos)),
    };
  }

  /** @param {{ deck?: Record<string, number>, keyCardNos?: unknown, keyCard2Nos?: unknown, keyCard3Nos?: unknown, middleCardNos?: unknown }} src */
  function deckBundleFromSource(src) {
    src = src || {};
    return {
      map: cloneDeckMap(src.deck || {}),
      keyCardNos: sanitizeCardNoList(src.keyCardNos),
      keyCard2Nos: sanitizeCardNoList(src.keyCard2Nos),
      keyCard3Nos: sanitizeCardNoList(src.keyCard3Nos),
      middleCardNos: sanitizeCardNoList(src.middleCardNos),
    };
  }

  /**
   * サンプル／登録デッキからソロ開始するとき、選択デッキを確実に渡す。
   * @param {{ map: Record<string, number>, keyCardNos?: string[], keyCard2Nos?: string[], keyCard3Nos?: string[], middleCardNos?: string[] }} bundle
   */
  function startSoloPlayWithBundle(bundle) {
    if (!bundle || !bundle.map || !Object.keys(bundle.map).length) {
      showToast("デッキが空のためソロプレイを開始できません");
      return;
    }
    pruneOrphanRoleLabels();
    if (persistDeckTimer) {
      clearTimeout(persistDeckTimer);
      persistDeckTimer = 0;
    }
    flushPersistDeckToStorage();
    onStartGame(bundle.map, {
      keyCardNos: bundle.keyCardNos || [],
      keyCard2Nos: bundle.keyCard2Nos || [],
      keyCard3Nos: bundle.keyCard3Nos || [],
      middleCardNos: bundle.middleCardNos || [],
    });
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

  /** 役割ラベル系の Set 内に fromNo があれば toNo に置き換える */
  function migrateRoleLabelInSet(set, fromNo, toNo) {
    if (!set || typeof set.has !== "function" || !set.has(fromNo)) return;
    set.delete(fromNo);
    set.add(toNo);
  }

  /**
   * デッキ編集中、カード詳細から「イラスト違いに入れ替え」を押された時の処理。
   * 同枚数を保ったまま fromNo の枚数を toNo に移動する。
   * 入れ替えに成功すれば true、何もできなければ false。
   */
  function swapDeckCardVariantInPlace(toNo, fromNo) {
    var from = String(fromNo || "").trim();
    var to = String(toNo || "").trim();
    if (!from || !to || from === to) return false;
    var n = Number(deckMap[from]) || 0;
    if (n <= 0) {
      showToast("このカードは現在のデッキに含まれていないため、入れ替えできません");
      return false;
    }
    var newCard = getCard(to);
    if (!newCard) {
      showToast("入れ替え先のカード（" + to + "）が見つかりません");
      return false;
    }
    var prev = Number(deckMap[to]) || 0;
    var combined = prev + n;
    if (combined > MAX_COPIES_PER_CARD) {
      showToast("入れ替えると上限 " + MAX_COPIES_PER_CARD + " 枚を超えてしまいます（" + (prev + n) + " 枚）");
      return false;
    }
    delete deckMap[from];
    deckMap[to] = combined;
    migrateRoleLabelInSet(keyCardNos, from, to);
    migrateRoleLabelInSet(keyCard2Nos, from, to);
    migrateRoleLabelInSet(keyCard3Nos, from, to);
    migrateRoleLabelInSet(middleCardNos, from, to);
    persistDeckState();
    renderCounts();
    scheduleRenderDeckList();
    scheduleRenderCardGrid();
    showToast("イラストを入れ替えました（" + from + " → " + to + " × " + n + " 枚）");
    return true;
  }

  /** クリックされた BH ピルが属する文脈（覗き見ダイアログ／メインデッキ）に応じて deckMap を返す。 */
  function activeEditedDeckMap() {
    var peekDlg = document.getElementById("dlg-deck-peek");
    if (peekDlg && peekDlg.open && lastPeekDeckMap) return lastPeekDeckMap;
    return deckMap;
  }

  /**
   * デッキマップから「特定 BH キー／属性コホート」に該当するカード一覧を共通ダイアログで表示する。
   * @param {Record<string, number>} map
   * @param {string} dbKey b_heart01 / b_all / b_draw 等。空の場合は cohort で絞り込み。
   * @param {string} cohort "nonbh_mem" | "score_live" | "draw_live" のいずれか／空。
   */
  function openDeckBhListDialogFor(map, dbKey, cohort) {
    var dlg = document.getElementById("dlg-zone-bh-list");
    var title = document.getElementById("dlg-zone-bh-list-title");
    var lead = document.getElementById("dlg-zone-bh-list-lead");
    var body = document.getElementById("dlg-zone-bh-list-body");
    if (!dlg || !body || typeof dlg.showModal !== "function") return;
    var slotLabel = "";
    /** @type {(c: any) => boolean} */
    var pred;
    /** @type {(c: any) => number} */
    var weight = function () { return 1; };
    if (cohort === "nonbh_mem") {
      slotLabel = "非BH メンバー";
      pred = function (c) { return c && c.type === T_MEMBER && !cardHasBladeHeart(c); };
    } else if (cohort === "score_live") {
      slotLabel = "スコア";
      pred = function (c) { return cardIsNoteLiveCatalog(c); };
    } else if (cohort === "draw_live") {
      slotLabel = "ドロー";
      pred = function (c) { return cardIsDrawYellLiveCatalog(c); };
    } else if (dbKey) {
      if (isBladeHeartDrawMarkerKey(dbKey)) {
        slotLabel = "ドロー BH";
      } else {
        var slotN = parseBladeHeartSlotFromKey(dbKey);
        slotLabel = slotN != null ? bladeHeartDisplaySlotLabel(slotN) : dbKey;
      }
      pred = function (c) {
        if (!c || !cardHasBladeHeart(c)) return false;
        var bh = c.blade_heart;
        if (!bh || typeof bh !== "object" || Array.isArray(bh)) return false;
        var v = Number(bh[dbKey]);
        return Number.isFinite(v) && v !== 0;
      };
    } else {
      return;
    }
    /** @type {Map<string, { card: any, count: number }>} */
    var byNo = new Map();
    for (var no in map) {
      if (!Object.prototype.hasOwnProperty.call(map, no)) continue;
      var n = Number(map[no]);
      if (!Number.isFinite(n) || n <= 0) continue;
      var c = getCard(no);
      if (!c) continue;
      if (!pred(c)) continue;
      byNo.set(String(no), { card: c, count: n * weight(c) });
    }
    if (title) title.textContent = "デッキ — " + slotLabel + " のカード";
    var totalCt = 0;
    byNo.forEach(function (r) { totalCt += r.count; });
    if (lead) {
      lead.textContent = "デッキの中で " + slotLabel + " に該当するカードは " + totalCt + " 枚（種類 " + byNo.size + "）です。";
    }
    body.innerHTML = "";
    if (!byNo.size) {
      var emp = document.createElement("p");
      emp.className = "muted";
      emp.style.margin = "0.5rem 0";
      emp.textContent = "該当カードはありません。";
      body.appendChild(emp);
    } else {
      var grid = document.createElement("div");
      grid.className = "dlg-zone-bh-list__grid";
      var entries = [...byNo.values()];
      entries.sort(function (a, b) {
        var an = String(a.card.card_no || "");
        var bn = String(b.card.card_no || "");
        return an.localeCompare(bn, "ja");
      });
      entries.forEach(function (rec) {
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "dlg-zone-bh-list__tile";
        tile.setAttribute("data-card-no", String(rec.card.card_no || ""));
        var img = document.createElement("img");
        img.className = "dlg-zone-bh-list__img";
        img.alt = rec.card.name || rec.card.card_no || "";
        img.loading = "lazy";
        img.decoding = "async";
        img.draggable = false;
        img.src = rec.card.img || "";
        tile.appendChild(img);
        var qty = document.createElement("span");
        qty.className = "dlg-zone-bh-list__qty";
        qty.textContent = "×" + rec.count;
        tile.appendChild(qty);
        var lab = document.createElement("span");
        lab.className = "dlg-zone-bh-list__label";
        lab.textContent = (rec.card.name || rec.card.card_no || "").toString();
        tile.appendChild(lab);
        tile.addEventListener("click", function () {
          try { dlg.close(); } catch (_) { /* noop */ }
          openCardCatalogDialogForDeckEdit(rec.card);
        });
        grid.appendChild(tile);
      });
      body.appendChild(grid);
    }
    try { dlg.showModal(); } catch (_) { /* noop */ }
  }

  /** デッキ編集中、カード詳細を開く（イラスト違いの入れ替え機能つき）。 */
  function openCardCatalogDialogForDeckEdit(card) {
    if (!card) return;
    openCardCatalogDialog(card, {
      showIllustVariants: true,
      onVariantSelected: function (toNo, fromNoArg) {
        return swapDeckCardVariantInPlace(toNo, fromNoArg);
      },
    });
  }

  if (root && !root.dataset.deckBhPillWired) {
    root.dataset.deckBhPillWired = "1";
    root.addEventListener("click", function (ev) {
      const btn = ev.target.closest(".deck-peek-bh-pill-btn");
      if (!btn) return;
      ev.preventDefault();
      const dbKey = btn.getAttribute("data-deck-bh-key");
      const cohort = btn.getAttribute("data-deck-bh-cohort");
      const deckMap = activeEditedDeckMap();
      if (dbKey || cohort) {
        openDeckBhListDialogFor(deckMap, dbKey || "", cohort || "");
        return;
      }
      const no = btn.getAttribute("data-deck-bh-card-no");
      if (!no) return;
      const card = getCard(no);
      if (!card) return;
      openCardCatalogDialogForDeckEdit(card);
    });
  }

  function invalidateCatalogFilterCache() {
    catalogFilterCacheKey = "";
    catalogFilterCached = null;
  }

  function narrowCostFilterExcludesLive(costsRecord) {
    if (!costsRecord || typeof costsRecord !== "object") return false;
    return Object.keys(costsRecord).some(function (k) {
      return !costsRecord[k];
    });
  }

  function buildCatalogFilterCacheKey() {
    const bh = readBhSlotFilters();
    const bx = readBhFilterExtras();
    const hs = readHeartSlotFilters();
    const costParts = Object.keys(filterCosts)
      .map(function (k) {
        return k + "=" + (filterCosts[k] ? "1" : "0");
      })
      .sort();
    return [
      currentDeckPanelOpen ? ("deck|" + computeActiveDeckNosSigForCache()) : "cat",
      searchText,
      filterProduct,
      filterSeries,
      filterUnit,
      catalogSortOrder,
      filterFavoritesOnly ? "1" : "0",
      JSON.stringify(filterTypes),
      [...bh].sort().join(","),
      bx.nonBh ? "1" : "0",
      bx.noteLive ? "1" : "0",
      bx.drawYell ? "1" : "0",
      [...hs].sort().join(","),
      costParts.join(","),
      narrowCostFilterExcludesLive(filterCosts) ? "1" : "0",
      getTestCardLogCacheSig(),
    ].join("|");
  }

  /** 「現在のデッキ」表示のキャッシュ無効化用に deckMap の枚数を含めた署名 */
  function computeActiveDeckNosSigForCache() {
    const entries = Object.entries(deckMap).filter(function (e) {
      return (e[1] || 0) > 0;
    });
    entries.sort(function (a, b) {
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    });
    return entries
      .map(function (e) {
        return e[0] + ":" + e[1];
      })
      .join(",");
  }

  function catalogDefaultOrderIndex(c) {
    if (!c) return 999999;
    const want = String(c.card_no);
    for (let i = 0; i < cards.length; i++) {
      if (cards[i] && String(cards[i].card_no) === want) return i;
    }
    return 999999;
  }

  function applyCatalogSortToList(list) {
    if (!list || !list.length) return list ? list.slice() : [];
    const order = catalogSortOrder || "default";
    if (order === "default") return list.slice();
    const out = list.slice();
    function favRank(x) {
      return cardFavorites.has(String(x.card_no)) ? 1 : 0;
    }
    out.sort(function (a, b) {
      if (order === "fav-first") {
        const df = favRank(b) - favRank(a);
        if (df) return df;
        return catalogDefaultOrderIndex(a) - catalogDefaultOrderIndex(b);
      }
      if (order === "name") {
        const cmp = String(a.name || "").localeCompare(String(b.name || ""), "ja");
        if (cmp) return cmp;
        return catalogDefaultOrderIndex(a) - catalogDefaultOrderIndex(b);
      }
      if (order === "cost-asc") {
        const ca = Number(a.cost);
        const cb = Number(b.cost);
        const na = Number.isFinite(ca) ? ca : 99;
        const nb = Number.isFinite(cb) ? cb : 99;
        if (na !== nb) return na - nb;
        return catalogDefaultOrderIndex(a) - catalogDefaultOrderIndex(b);
      }
      if (order === "card-no") {
        const cmp = String(a.card_no || "").localeCompare(String(b.card_no || ""));
        if (cmp) return cmp;
        return catalogDefaultOrderIndex(a) - catalogDefaultOrderIndex(b);
      }
      return catalogDefaultOrderIndex(a) - catalogDefaultOrderIndex(b);
    });
    return out;
  }

  /** カード一覧グリッド用のフィルタ済み配列（カタログ条件が変わらない限り filterCards を使い回す） */
  function computeFilteredCardListForGrid() {
    if (filterProduct === FILTER_PRODUCT_TEST_CARD_LOG) {
      const key = buildCatalogFilterCacheKey();
      if (key === catalogFilterCacheKey && catalogFilterCached !== null) {
        return catalogFilterCached;
      }
      const entries = getTestCardLogEntries();
      const built = [];
      const seen = new Set();
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (!e || !e.baseCardNo) continue;
        try {
          const no = ensureTestCardVariant(e.baseCardNo, e.options || {});
          if (!no || seen.has(no)) continue;
          seen.add(no);
          const c = getCard(no);
          if (!c) continue;
          if (filterTypes[T_MEMBER] === false && c.type === T_MEMBER) continue;
          if (filterTypes[T_LIVE] === false && c.type === T_LIVE) continue;
          built.push(c);
        } catch (_) {
          /* noop */
        }
      }
      let filtered = applyCatalogSortToList(built);
      if (filterFavoritesOnly) {
        filtered = filtered.filter(function (c) {
          return c && cardFavorites.has(String(c.card_no));
        });
      }
      catalogFilterCacheKey = key;
      catalogFilterCached = filtered;
      return filtered;
    }
    const key = buildCatalogFilterCacheKey();
    if (key === catalogFilterCacheKey && catalogFilterCached !== null) {
      return catalogFilterCached;
    }
    let filtered;
    if (currentDeckPanelOpen) {
      filtered = [];
      for (const no of Object.keys(deckMap)) {
        if (!((deckMap[no] || 0) > 0)) continue;
        const c = getCard(no);
        if (c) filtered.push(c);
      }
      filtered = sortRegisteredDeckCards(filtered);
    } else {
      const bx = readBhFilterExtras();
      filtered = filterCards(cards, {
        search: searchText,
        types: filterTypes,
        product: filterProduct || null,
        series: filterSeries || null,
        unit: filterUnit || null,
        costs: filterCosts,
        narrowCostExcludeLive: narrowCostFilterExcludesLive(filterCosts),
        bhSlots: readBhSlotFilters(),
        bhNonBh: bx.nonBh,
        bhNoteLive: bx.noteLive,
        bhDrawYell: bx.drawYell,
        heartSlots: readHeartSlotFilters(),
      });
      if (filterFavoritesOnly) {
        filtered = filtered.filter(function (c) {
          return c && cardFavorites.has(String(c.card_no));
        });
      }
      filtered = applyCatalogSortToList(filtered);
    }
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
      /** 0 枚になった行は一覧から消す必要があるので部分パッチ不可 */
      if (!(qty > 0)) return false;
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
      const iconHtml = heartSlotArtIconHtml(slot, { extraClass: "dlg-test-heart-table-art-ico" });
      html +=
        "<tr><td>" +
        iconHtml +
        '<span class="visually-hidden">' + escapeHtml(labels[slot] || "") + '</span>' +
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
  /** @type {string | null} */
  let testCardCustomImgDataUrl = null;

  function shrinkTestCardImageDataUrl(dataUrl, maxBytes, done) {
    const raw = String(dataUrl || "");
    if (!raw.startsWith("data:image/") || raw.length <= maxBytes) {
      done(raw);
      return;
    }
    const im = new Image();
    im.onload = function () {
      try {
        var w0 = im.naturalWidth || im.width || 1;
        var h0 = im.naturalHeight || im.height || 1;
        var scale = Math.min(1, 480 / w0);
        var w = Math.max(1, Math.round(w0 * scale));
        var h = Math.max(1, Math.round(h0 * scale));
        var cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        var ctx = cv.getContext("2d");
        if (!ctx) {
          done(raw);
          return;
        }
        ctx.drawImage(im, 0, 0, w, h);
        var q = 0.82;
        var out = cv.toDataURL("image/jpeg", q);
        while (out.length > maxBytes && q > 0.36) {
          q -= 0.07;
          out = cv.toDataURL("image/jpeg", q);
        }
        done(out.length < raw.length ? out : raw);
      } catch (_) {
        done(raw);
      }
    };
    im.onerror = function () {
      done(raw);
    };
    im.src = raw;
  }

  function wireTestCardVariantDialogOnce() {
    const dlg = document.getElementById("dlg-test-card-variant");
    if (!dlg || dlg.dataset.llocgWired === "1") return;
    dlg.dataset.llocgWired = "1";
    const btnOk = document.getElementById("btn-test-card-ok");
    const btnCancel = document.getElementById("btn-test-card-cancel");
    const btnImgPick = document.getElementById("btn-test-card-img-pick");
    const btnImgClear = document.getElementById("btn-test-card-img-clear");
    const inpImg = document.getElementById("dlg-test-card-img-file");
    if (btnImgPick && inpImg) {
      btnImgPick.addEventListener("click", function (ev) {
        ev.preventDefault();
        inpImg.click();
      });
    }
    if (btnImgClear) {
      btnImgClear.addEventListener("click", function (ev) {
        ev.preventDefault();
        testCardCustomImgDataUrl = null;
        if (inpImg) inpImg.value = "";
        const pv = document.getElementById("dlg-test-card-img-preview");
        if (pv) {
          pv.hidden = true;
          pv.removeAttribute("src");
        }
      });
    }
    if (inpImg) {
      inpImg.addEventListener("change", function () {
        const f = inpImg.files && inpImg.files[0];
        if (!f || !/^image\//.test(f.type)) {
          showToast("画像ファイルを選んでください。");
          return;
        }
        if (f.size > 12 * 1024 * 1024) {
          showToast("12MB 以下の画像にしてください。");
          inpImg.value = "";
          return;
        }
        const fr = new FileReader();
        fr.onload = function () {
          const url = String(fr.result || "");
          if (!url.startsWith("data:image/")) {
            showToast("画像の読み込みに失敗しました。");
            return;
          }
          shrinkTestCardImageDataUrl(url, 420000, function (out) {
            testCardCustomImgDataUrl = out;
            const pv = document.getElementById("dlg-test-card-img-preview");
            if (pv) {
              pv.src = out;
              pv.hidden = false;
            }
            if (out.length > 550000) {
              showToast("画像が大きいため保存時に失敗することがあります。より小さい写真を試してください。");
            }
          });
        };
        fr.onerror = function () {
          showToast("画像の読み込みに失敗しました。");
        };
        fr.readAsDataURL(f);
      });
    }
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
            customImg: testCardCustomImgDataUrl || undefined,
          }) || pending.card_no;
        const logOptions = { slot };
        if (customName) logOptions.customName = customName;
        if (testCardCustomImgDataUrl) logOptions.customImg = testCardCustomImgDataUrl;
        if (emCat === T_MEMBER) {
          logOptions.blade = blade;
          if (baseHeart && Object.keys(baseHeart).length) logOptions.baseHeart = baseHeart;
        } else if (emCat === T_LIVE) {
          logOptions.liveScore = liveScore;
          if (needHeart && Object.keys(needHeart).length) logOptions.needHeart = needHeart;
        }
        const hadCustomization =
          slot > 0 ||
          !!customName ||
          (emCat === T_MEMBER && blade > 0) ||
          (emCat === T_LIVE && liveScore > 0) ||
          !!(baseHeart && Object.keys(baseHeart).length) ||
          !!(needHeart && Object.keys(needHeart).length) ||
          !!testCardCustomImgDataUrl ||
          out !== pending.card_no;
        if (hadCustomization) {
          let saveToLog = getTestCardLogSavePreference();
          if (saveToLog === null && typeof window !== "undefined") {
            saveToLog = window.confirm(
              "このオリカの設定を「テストカードログ」に保存しますか？\n\n・あとからデッキ画面の「商品」から「テストカードログ」を選ぶと一覧で開けます\n・通常の検索や他の商品名では一覧に出ません（ログ専用です）\n\n※この選択は最初の一回だけ確認します（あとから変更不要です）",
            );
            setTestCardLogSavePreference(!!saveToLog);
          }
          if (saveToLog) {
            if (appendTestCardLogEntry({ baseCardNo: pending.card_no, options: logOptions })) {
              invalidateCatalogFilterCache();
              showToast("テストカードログに保存しました");
            } else {
              showToast("ログへの保存に失敗しました（容量超過の可能性があります）");
            }
          }
        }
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
      testCardCustomImgDataUrl = null;
      const inpImg = document.getElementById("dlg-test-card-img-file");
      if (inpImg) inpImg.value = "";
      const pv = document.getElementById("dlg-test-card-img-preview");
      if (pv) {
        pv.hidden = true;
        pv.removeAttribute("src");
      }
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
    /* ログ一覧は ensureTestCardVariant 済みの番号のみなので設定ダイアログは不要 */
    if (filterProduct === FILTER_PRODUCT_TEST_CARD_LOG) return card.card_no;
    return await openTestCardVariantDialog(card);
  }

  function builderCatalogThumbImgHtml(url, className, imgOpts) {
    if (!url) return "";
    imgOpts = imgOpts || {};
    const low = catalogListThumbnailUrl(url, imgOpts.hiQuality ? { hi: true } : undefined);
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
    if (deckRegistrationPanelOpen) {
      try {
        renderDeckLibraryTiles();
      } catch (_) {
        /* ignore */
      }
    }
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
          openCardCatalogDialogForDeckEdit(card);
        });
        dz.addEventListener("dblclick", function (ev) {
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
    lastPeekDeckMap = map;
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
    let liveNotePeek = 0;
    let liveDrawPeek = 0;
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
        if (cardIsNoteLiveCatalog(c)) liveNotePeek += n;
        if (cardIsDrawYellLiveCatalog(c)) liveDrawPeek += n;
      }
    }

    const bhAgg = accumulateBladeHeartWeighted(map);
    const peekDeckName =
      roleMode === "main"
        ? "現在のメインデッキ"
        : String(slot.name || "").trim() || "（名称未設定）";

    const stats = el("deck-peek-stats");
    if (stats) {
      stats.innerHTML =
        formatDeckPeekDeckNameHtml(peekDeckName) +
        (unknownCopies
          ? '<div class="deck-peek-warn">カードDBに無い番号が <strong>' +
            unknownCopies +
            "</strong>枚あります（一覧・グラフの集計から除外）。</div>"
          : "") +
        formatBladeHeartBlockHtml(
          bhAgg.byKey,
          bhAgg.totalWeighted,
          memBh,
          liveBh,
          memNonBh,
          liveNotePeek,
          liveDrawPeek,
          bhAgg.byKeyAdditive,
          map,
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
          costPill = isHandDependentCost20Member(card.card_no)
            ? '<span class="deck-peek-cost-pill" title="手札にいる間の印刷コスト目安">コスト20〜0※</span>'
            : '<span class="deck-peek-cost-pill">コスト' + escapeHtml(String(card.cost)) + "</span>";
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
            ev.preventDefault();
            ev.stopPropagation();
            /* デッキ確認ダイアログが開いているなら、左下のインラインステータス欄に切替表示。
               外（盤面など）から呼ばれた場合は従来どおり別ダイアログで開く。 */
            if (renderInlineCatalogStatusInDeckPeekIfOpen(card)) return;
            openCardCatalogDialogForDeckEdit(card);
          });
          pzk.addEventListener("dblclick", function (ev) {
            ev.preventDefault();
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
    /* ピーク再描画時に、以前選択されていたカード情報パネルはいったん閉じる（カード一覧が刷新されるため）。 */
    hideInlineCatalogStatusInDeckPeek();
  }

  /** デッキ確認ダイアログ内のインラインステータス欄を閉じる */
  function hideInlineCatalogStatusInDeckPeek() {
    var host = el("deck-peek-inline-status");
    if (!host) return;
    host.hidden = true;
    var body = el("deck-peek-inline-status-body");
    var eff = el("deck-peek-inline-status-effect");
    var img = el("deck-peek-inline-status-img");
    var badge = el("deck-peek-inline-status-badge");
    var sub = el("deck-peek-inline-status-subtitle");
    var title = el("deck-peek-inline-status-title");
    if (body) body.innerHTML = "";
    if (eff) eff.innerHTML = "";
    if (img) {
      img.removeAttribute("src");
      img.alt = "";
      img.hidden = true;
    }
    if (badge) badge.innerHTML = "";
    if (sub) sub.textContent = "";
    if (title) title.textContent = "カード情報";
  }

  /**
   * デッキ確認ダイアログが開いていれば、左下のインラインステータス欄にカタログ情報を描画。
   * 戻り値: 描画したかどうか。
   */
  function renderInlineCatalogStatusInDeckPeekIfOpen(card) {
    if (!card) return false;
    var dlg = el("dlg-deck-peek");
    if (!dlg || !dlg.open) return false;
    var host = el("deck-peek-inline-status");
    var body = el("deck-peek-inline-status-body");
    if (!host || !body) return false;
    host.hidden = false;
    var rendered = renderCardCatalogContentInto(card, {
      title: el("deck-peek-inline-status-title"),
      subtitle: el("deck-peek-inline-status-subtitle"),
      body: body,
      effectSlot: el("deck-peek-inline-status-effect"),
      img: el("deck-peek-inline-status-img"),
      badge: el("deck-peek-inline-status-badge"),
      showIllustVariants: true,
      onVariantSelected: function (toNo, fromNo) {
        return swapDeckCardVariantInPlace(toNo, fromNo);
      },
    });
    if (!rendered) {
      host.hidden = true;
      return false;
    }
    /* スクロール位置を先頭に戻し、初回クリック時にしっかり気付けるようにする */
    try { host.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) { /* noop */ }
    return true;
  }

  function wireDeckPeekInlineStatusCloseOnce() {
    var btn = el("deck-peek-inline-status-close");
    if (!btn || btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      hideInlineCatalogStatusInDeckPeek();
    });
    var dlg = el("dlg-deck-peek");
    if (dlg && !dlg.dataset.peekInlineCloseHooked) {
      dlg.dataset.peekInlineCloseHooked = "1";
      dlg.addEventListener("close", function () {
        hideInlineCatalogStatusInDeckPeek();
      });
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

  function getActiveDeckDisplayName() {
    const sel = el("deck-preset-select");
    if (!sel || !sel.value) return "編集中のデッキ";
    const library = loadDeckLibrary();
    const slot = library.slots.find(function (s) {
      return s.id === sel.value;
    });
    if (slot && slot.name) return slot.name;
    const opt = sel.options[sel.selectedIndex];
    return opt ? String(opt.textContent || "").trim() : "編集中のデッキ";
  }

  function writeDeckSummaryDom() {
    const deckSummary = el("card-deck-summary");
    if (!deckSummary) return;
    if (!(deckRegistrationPanelOpen || currentDeckPanelOpen)) return;
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
    let liveNoteCount = 0;
    let liveDrawCount = 0;
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
        if (cardIsNoteLiveCatalog(c)) liveNoteCount += qty;
        if (cardIsDrawYellLiveCatalog(c)) liveDrawCount += qty;
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
      '<div class="card-deck-summary-grid"><div class="deck-peek-stats">' +
      formatDeckPeekDeckNameHtml(getActiveDeckDisplayName()) +
      (unknown > 0
        ? '<div class="deck-peek-warn">DB未登録 <strong>' + unknown + "</strong>枚</div>"
        : "") +
      formatBladeHeartBlockHtml(
        bhAgg.byKey,
        bhAgg.totalWeighted,
        memBhCount,
        liveBhCount,
        memNonBhCount,
        liveNoteCount,
        liveDrawCount,
        bhAgg.byKeyAdditive,
        deckMap,
      ) +
      "</div>" +
      '<div class="deck-peek-chart-section compact"><h4 class="deck-peek-section-h">コスト分布</h4>' +
      chartHtml +
      "</div></div>";
  }

  function updateCardHitCountFromFiltered(filtered) {
    const hit = el("card-hit-count");
    if (!hit) return;
    let line = "";
    let sumReg = 0;
    const regKinds = Object.keys(deckMap).filter(function (no) {
      return (deckMap[no] || 0) > 0;
    }).length;
    for (const no of Object.keys(deckMap)) sumReg += deckMap[no] || 0;
    if (filtered.length === cards.length) {
      line = "全 " + cards.length + " 種";
    } else {
      line = "表示 " + filtered.length + " / 全 " + cards.length + " 種";
    }
    if (regKinds > 0) {
      line += " · 登録 " + regKinds + " 種／" + sumReg + " 枚";
    }
    if (deckRegistrationPanelOpen) {
      line += " · 登録統計表示";
    }
    if (samplePanelOpen) {
      var rl = getSampleDeckRecipes();
      line = line + " · サンプル " + rl.length + " 件";
    }
    hit.textContent = line;
  }

  function syncThumbFavOnWrap(wrap, cardNo) {
    const no = String(cardNo || "");
    const thumb = wrap && wrap.querySelector(".card-thumb");
    if (!thumb) return;
    const fav = thumb.querySelector(".card-thumb-fav");
    if (!fav) return;
    const on = cardFavorites.has(no);
    fav.classList.toggle("is-on", on);
    fav.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function reuseOrCreateCardGridItems(grid, filtered) {
    if (!filtered.length) {
      grid.innerHTML = "";
      return;
    }
    const pool = new Map(
      [...grid.children].map(function (w) {
        return [String(w.dataset.cardNo || ""), w];
      }),
    );
    filtered.forEach(function (card) {
      const no = String(card.card_no);
      var wrap = pool.get(no);
      pool.delete(no);
      if (!wrap) {
        wrap = createCardGridItemWrap(card);
      } else {
        patchVisibleGridThumbsForNos([no]);
        syncThumbFavOnWrap(wrap, no);
      }
      grid.appendChild(wrap);
    });
    pool.forEach(function (w) {
      w.remove();
    });
  }

  function renderCardGrid(opts) {
    opts = opts || { deckSummary: true };
    if (typeof opts.deckSummary === "undefined") opts.deckSummary = true;
    const grid = el("card-grid");
    if (!grid) return;
    const heading = el("card-panel-heading");
    const deckSummary = el("card-deck-summary");
    const sampleScroll = el("sample-recipes-scroll");
    const cardScroll = el("card-grid-scroll");

    root.classList.toggle("view-deck--sample-panel-open", samplePanelOpen);
    root.classList.toggle("view-deck--deck-registration-open", deckRegistrationPanelOpen);
    root.classList.toggle("view-deck--current-deck-open", currentDeckPanelOpen);

    if (sampleScroll) sampleScroll.hidden = !samplePanelOpen;
    if (cardScroll) cardScroll.hidden = false;
    const libraryScroll = el("deck-library-scroll");
    if (libraryScroll) libraryScroll.hidden = !deckRegistrationPanelOpen;

    if (heading) {
      heading.textContent = currentDeckPanelOpen ? "現在のデッキ" : "カード一覧";
    }
    const btnClearDeck = el("btn-clear-current-deck");
    if (btnClearDeck) btnClearDeck.hidden = !currentDeckPanelOpen;

    if (samplePanelOpen) {
      renderSampleRecipesTiles(getSampleDeckRecipes());
    }

    if (deckRegistrationPanelOpen) {
      renderDeckLibraryTiles();
    }

    /** @type {typeof cards} */
    const filtered = computeFilteredCardListForGrid();
    const layoutSig =
      (deckRegistrationPanelOpen ? "reg1" : "reg0") +
      "|" +
      (samplePanelOpen ? "sam1" : "sam0") +
      "|" +
      (currentDeckPanelOpen ? "cur1" : "cur0");
    updateCardHitCountFromFiltered(filtered);
    const showDeckSummary = deckRegistrationPanelOpen || currentDeckPanelOpen;
    if (deckSummary) {
      if (!showDeckSummary) {
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
      if (cardGridVirtual.lastPanel !== CARD_GRID_VIRTUAL_PANEL || cardGridVirtual.lastLayoutSig !== layoutSig) {
        grid.innerHTML = "";
      }
      reuseOrCreateCardGridItems(grid, filtered);
      cardGridVirtual.lastPanel = CARD_GRID_VIRTUAL_PANEL;
      cardGridVirtual.lastLayoutSig = layoutSig;
      cardGridVirtual.lastOrderedSig = filtered
        .map(function (c) {
          return c.card_no;
        })
        .join("\u0001");
      return;
    }

    const prevPanel = cardGridVirtual.lastPanel;
    const prevLayoutSig = cardGridVirtual.lastLayoutSig;
    const needScrollReset =
      !cardGridVirtual.active ||
      prevPanel !== CARD_GRID_VIRTUAL_PANEL ||
      cardGridVirtual.lastCount !== filtered.length;
    if (needScrollReset && scrollEl) {
      scrollEl.scrollTop = 0;
      cardGridVirtualMeasureGuard = 0;
    }
    if (prevPanel !== CARD_GRID_VIRTUAL_PANEL || prevLayoutSig !== layoutSig) {
      grid.innerHTML = "";
      cardGridVirtual.w0 = -1;
    }
    cardGridVirtual.lastPanel = CARD_GRID_VIRTUAL_PANEL;
    cardGridVirtual.lastLayoutSig = layoutSig;
    cardGridVirtual.lastCount = filtered.length;
    cardGridVirtual.active = true;
    cardGridVirtual.list = filtered;
    if (prevPanel === CARD_GRID_VIRTUAL_PANEL && prevLayoutSig === layoutSig) cardGridVirtual.w0 = -1;
    cardGridVirtual.rowH = (deckRegistrationPanelOpen || currentDeckPanelOpen) ? 268 : 234;
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
    var regQty = deckMap[card.card_no] || 0;
    const qtyBadge =
      regQty > 0 ? '<span class="thumb-deck-qty">' + regQty + " 枚</span>" : "";
    div.innerHTML =
      rolesHtml +
      qtyBadge +
      `<span class="thumb-type">${escapeHtml(tlab)}</span>${builderCatalogThumbImgHtml(card.img, "deck-builder-card-thumb", {
        eager: cardGridVirtual.active,
      })}<span class="thumb-cap">${escapeHtml(card.name)}${thumbExtraHtml(card)}</span>`;
    const fav = document.createElement("button");
    fav.type = "button";
    fav.className = "card-thumb-fav" + (cardFavorites.has(String(card.card_no)) ? " is-on" : "");
    fav.textContent = "\u2606";
    fav.title = "お気に入り";
    fav.setAttribute("aria-label", "お気に入り");
    fav.setAttribute("aria-pressed", cardFavorites.has(String(card.card_no)) ? "true" : "false");
    fav.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      const k = String(card.card_no);
      if (cardFavorites.has(k)) cardFavorites.delete(k);
      else cardFavorites.add(k);
      persistCardFavorites();
      invalidateCatalogFilterCache();
      const lostFavFilter =
        el("filter-favorites-only") && el("filter-favorites-only").checked && !cardFavorites.has(k);
      if (lostFavFilter || catalogSortOrder === "fav-first") {
        scheduleRenderCardGrid();
        return;
      }
      fav.classList.toggle("is-on", cardFavorites.has(k));
      fav.setAttribute("aria-pressed", cardFavorites.has(k) ? "true" : "false");
    });
    div.appendChild(fav);
    div.addEventListener(
      "dblclick",
      function (ev) {
        if (ev.target.closest(".card-thumb-fav")) return;
        if (
          ev.target &&
          ev.target.closest &&
          (ev.target.closest(".deck-builder-card-thumb") || ev.target.tagName === "IMG")
        ) {
          ev.preventDefault();
          ev.stopPropagation();
          openDeckBuilderCardZoom(card);
        }
      },
      true,
    );
    div.addEventListener("click", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".card-thumb-fav")) return;
      if (
        ev.target &&
        ev.target.closest &&
        (ev.target.closest(".deck-builder-card-thumb") || ev.target.tagName === "IMG")
      ) {
        ev.preventDefault();
        ev.stopPropagation();
        openCardCatalogDialogForDeckEdit(card);
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
    if (currentDeckPanelOpen && inDeck) {
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

    reuseOrCreateCardGridItems(grid, list.slice(startIdx, endIdx));

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
      const qn = deckMap[no] || 0;
      let badge = thumb.querySelector(".thumb-deck-qty");
      if (qn > 0) {
        const qtyText = qn + " 枚";
        if (badge) badge.textContent = qtyText;
        else {
          const typeSpan = thumb.querySelector(".thumb-type");
          if (typeSpan)
            typeSpan.insertAdjacentHTML("beforebegin", '<span class="thumb-deck-qty">' + qtyText + "</span>");
        }
      } else if (badge) {
        badge.remove();
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
    if (deckRegistrationPanelOpen || currentDeckPanelOpen) scheduleDeckSummaryDebounced();
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
    if (deckRegistrationPanelOpen || currentDeckPanelOpen) scheduleDeckSummaryDebounced();
    const newSig = filtered
      .map(function (c) {
        return c.card_no;
      })
      .join("\u0001");
    if (newSig === cardGridVirtual.lastOrderedSig && newSig !== "") {
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
      const logOpt = document.createElement("option");
      logOpt.value = FILTER_PRODUCT_TEST_CARD_LOG;
      logOpt.textContent = "テストカードログ";
      ps.appendChild(logOpt);
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
    schedulePersistDeckBuilderUiState();
    renderCardGrid();
  });
  el("filter-show-member")?.addEventListener("change", () => {
    syncFilterTypesFromCheckboxes();
    invalidateCatalogFilterCache();
    renderCardGrid();
  });
  el("filter-show-live")?.addEventListener("change", () => {
    syncFilterTypesFromCheckboxes();
    invalidateCatalogFilterCache();
    renderCardGrid();
  });
  el("catalog-sort-order")?.addEventListener("change", (e) => {
    catalogSortOrder = /** @type {{ value: string }} */ (e.target).value || "default";
    schedulePersistDeckBuilderUiState();
    invalidateCatalogFilterCache();
    renderCardGrid();
  });
  el("filter-favorites-only")?.addEventListener("change", (e) => {
    filterFavoritesOnly = !!(/** @type {HTMLInputElement} */ (e.target).checked);
    schedulePersistDeckBuilderUiState();
    invalidateCatalogFilterCache();
    renderCardGrid();
  });
  el("filter-product")?.addEventListener("change", (e) => {
    filterProduct = e.target.value;
    schedulePersistDeckBuilderUiState();
    renderCardGrid();
  });
  el("filter-series")?.addEventListener("change", (e) => {
    filterSeries = e.target.value;
    schedulePersistDeckBuilderUiState();
    renderCardGrid();
  });
  el("filter-unit")?.addEventListener("change", (e) => {
    filterUnit = e.target.value;
    schedulePersistDeckBuilderUiState();
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
    syncCheckboxesFromFilterTypes();
    catalogSortOrder = "default";
    const sortEl = el("catalog-sort-order");
    if (sortEl) sortEl.value = "default";
    filterFavoritesOnly = false;
    const fo = el("filter-favorites-only");
    if (fo) fo.checked = false;
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
    const addedPreset = addDeckSlot(library, name || "無題のデッキ", deckMap, {
      keyCardNos: [...keyCardNos],
      keyCard2Nos: [...keyCard2Nos],
      keyCard3Nos: [...keyCard3Nos],
      middleCardNos: [...middleCardNos],
    });
    library = { slots: addedPreset.slots };
    persistDeckLibrary(library);
    const newest =
      addedPreset.addedId && library.slots
        ? library.slots.find(function (x) {
            return x.id === addedPreset.addedId;
          })
        : library.slots[library.slots.length - 1];
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
    persistDeckBuilderUiState();
    startSoloPlayWithBundle(editorDeckBundleSnapshot());
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

  el("filter-bh-slots")?.addEventListener("change", function () {
    schedulePersistDeckBuilderUiState();
    scheduleRenderCardGrid();
  });
  el("filter-heart-slots")?.addEventListener("change", function () {
    schedulePersistDeckBuilderUiState();
    scheduleRenderCardGrid();
  });
  el("btn-filter-bh-heart-clear")?.addEventListener("click", function () {
    root.querySelectorAll("#filter-bh-slots input[type=checkbox]").forEach(function (x) {
      x.checked = false;
    });
    root.querySelectorAll("#filter-heart-slots input[type=checkbox]").forEach(function (x) {
      x.checked = false;
    });
    scheduleRenderCardGrid();
  });

  el("btn-tutorial-builder")?.addEventListener("click", function () {
    var d = document.getElementById("dlg-tutorial");
    if (d && typeof d.showModal === "function") d.showModal();
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

  function totalsFromDeckMapForSample(map) {
    var m = 0;
    var l = 0;
    var u = 0;
    Object.entries(map || {}).forEach(function (ent) {
      var no = ent[0];
      var n = ent[1];
      if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return;
      var c = getCard(no);
      if (!c) {
        u += n;
        return;
      }
      var cat = effectiveMainDeckCategory(c);
      if (cat === T_MEMBER) m += n;
      else if (cat === T_LIVE) l += n;
    });
    return { m: m, l: l, total: m + l + u };
  }

  function renderSampleRecipesTiles(recipes) {
    var host = el("sample-recipes-grid");
    if (!host) return;
    var devDn = isSampleDevMode();
    var parts = [];
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i];
      var thumbNo = effectiveSampleThumbnailCardNo(r);
      var thumbCard = getCard(thumbNo);
      var thumbInner = thumbCard
        ? builderCatalogThumbImgHtml(thumbCard.img, "sample-recipe-thumb-img deck-builder-card-thumb", {
            eager: i < 8,
            hiQuality: true,
          })
        : '<div class="sample-recipe-thumb-fallback" aria-hidden="true">?</div>';
      var t = totalsFromDeckMapForSample(r.deck);
      var devActs = "";
      if (devDn) {
        devActs =
          '<div class="sample-recipe-actions sample-recipe-actions--dev">' +
          '<button type="button" class="btn sm" data-sample-act="dev-thumb">サムネ指定</button>' +
          '<button type="button" class="btn sm danger" data-sample-act="dev-delete">サンプルを削除</button>' +
          '<button type="button" class="btn sm secondary" data-sample-act="dev-overwrite">サンプルを上書き</button>' +
          "</div>";
      }
      var thumbTitle = devDn ? "ドラッグで並べ替え · クリックで一覧" : "一覧・BH・コスト分布を見る";
      parts.push(
        '<article class="sample-recipe-tile" role="listitem" data-sample-id="' +
          escapeAttr(r.id) +
          '" data-sample-index="' +
          i +
          '">' +
          '<button type="button" class="sample-recipe-thumb-btn' +
          (devDn ? " sample-recipe-thumb-btn--dev-dnd" : "") +
          '" data-sample-act="peek"' +
          (devDn ? ' draggable="true"' : "") +
          ' title="' +
          escapeAttr(thumbTitle) +
          '" aria-label="' +
          escapeAttr(r.name + "の詳細を開く") +
          '">' +
          thumbInner +
          "</button>" +
          '<div class="sample-recipe-meta">' +
          '<div class="sample-recipe-name" title="' +
          escapeAttr(r.name) +
          '">' +
          escapeHtml(r.name) +
          "</div>" +
          '<p class="sample-recipe-counts muted">メンバー ' +
          t.m +
          " · ライブ " +
          t.l +
          " · 計 " +
          t.total +
          " 枚</p>" +
          '<div class="sample-recipe-actions">' +
          '<button type="button" class="btn sm primary" data-sample-act="play">ソロプレイ</button>' +
          '<button type="button" class="btn sm secondary" data-sample-act="copy">コピーして編集</button>' +
          "</div>" +
          devActs +
          "</div></article>",
      );
    }
    host.innerHTML = parts.join("");
  }

  function findSampleRecipeById(id) {
    var sid = String(id || "");
    var list = getSampleDeckRecipes();
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === sid) return list[j];
    }
    return null;
  }

  /** 登録デッキ（保存済みプリセット）の一覧タイルを描画 */
  function renderDeckLibraryTiles() {
    var host = el("deck-library-grid");
    var empty = el("deck-library-empty");
    if (!host) return;
    var slots = (library && Array.isArray(library.slots)) ? library.slots : [];
    if (!slots.length) {
      host.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var activeId = localStorage.getItem(STORAGE_ACTIVE_PRESET_ID) || "";
    var parts = [];
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      var isBuiltIn = isBuiltInStarterDeckId(s.id);
      var thumbNo = thumbnailCardNoForSavedSlot(s) || "";
      var thumbCard = thumbNo ? getCard(thumbNo) : null;
      var thumbInner = thumbCard
        ? builderCatalogThumbImgHtml(thumbCard.img, "deck-library-tile-thumb-img deck-builder-card-thumb", {
            eager: i < 8,
            hiQuality: true,
          })
        : '<div class="deck-library-tile-thumb-fallback" aria-hidden="true">?</div>';
      var t = totalsFromDeckMapForSample(s.deck);
      var isActive = activeId && s.id === activeId;
      /** サンプル（共通プリセット）は、ユーザー独自デッキが 1 件以上あるときに限り「サンプルを非表示」可。 */
      var canDeleteBuiltIn = canDismissBuiltInStarter(library);
      var deleteBtn = isBuiltIn
        ? (canDeleteBuiltIn
            ? '<button type="button" class="btn sm danger" data-deck-lib-act="delete-builtin">サンプルを非表示</button>'
            : "")
        : '<button type="button" class="btn sm danger" data-deck-lib-act="delete">削除</button>';
      parts.push(
        '<article class="deck-library-tile' +
          (isActive ? " is-active" : "") +
          '" role="listitem" data-deck-lib-id="' +
          escapeAttr(s.id) +
          '">' +
          '<button type="button" class="deck-library-tile-thumb-btn" data-deck-lib-act="peek" aria-label="' +
          escapeAttr((s.name || "") + " の詳細を開く") +
          '" title="クリックでデッキ確認">' +
          thumbInner +
          (isActive ? '<span class="deck-library-tile-active-flag">編集中</span>' : "") +
          "</button>" +
          '<div class="deck-library-tile-meta">' +
          '<div class="deck-library-tile-name" title="' +
          escapeAttr(s.name || "") +
          '">' +
          escapeHtml(s.name || "（無題）") +
          (isBuiltIn ? ' <span class="deck-library-tile-name-tag">サンプル</span>' : "") +
          "</div>" +
          '<p class="deck-library-tile-counts muted">メンバー ' +
          t.m +
          " · ライブ " +
          t.l +
          " · 計 " +
          t.total +
          " 枚</p>" +
          '<div class="deck-library-tile-actions">' +
          '<button type="button" class="btn sm primary" data-deck-lib-act="load">読み込み</button>' +
          '<button type="button" class="btn sm" data-deck-lib-act="peek-btn">デッキ確認</button>' +
          '<button type="button" class="btn sm secondary" data-deck-lib-act="play">ソロプレイ</button>' +
          deleteBtn +
          "</div>" +
          "</div></article>",
      );
    }
    host.innerHTML = parts.join("");
    syncRestoreBuiltInButton();
  }

  function syncRestoreBuiltInButton() {
    var btn = el("btn-restore-builtin-starter");
    if (!btn) return;
    var hasBuiltIn = false;
    var slots = (library && Array.isArray(library.slots)) ? library.slots : [];
    for (var i = 0; i < slots.length; i++) {
      if (isBuiltInStarterDeckId(slots[i] && slots[i].id)) { hasBuiltIn = true; break; }
    }
    btn.hidden = hasBuiltIn;
  }

  function wireRestoreBuiltInButtonOnce() {
    var btn = el("btn-restore-builtin-starter");
    if (!btn || btn.dataset.wired === "1") return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", function () {
      restoreBuiltInStarterSlot();
      library = loadDeckLibrary();
      persistDeckLibrary(library);
      renderPresetSelect();
      renderDeckLibraryTiles();
      showToast("サンプルデッキを再表示しました");
    });
  }

  function applyLibrarySlotToMainDeck(slot) {
    if (!slot) return;
    deckMap = cloneDeckMap(slot.deck);
    keyCardNos.clear();
    keyCard2Nos.clear();
    keyCard3Nos.clear();
    middleCardNos.clear();
    sanitizeCardNoList(slot.keyCardNos).forEach(function (x) { keyCardNos.add(x); });
    sanitizeCardNoList(slot.keyCard2Nos).forEach(function (x) { keyCard2Nos.add(x); });
    sanitizeCardNoList(slot.keyCard3Nos).forEach(function (x) { keyCard3Nos.add(x); });
    sanitizeCardNoList(slot.middleCardNos).forEach(function (x) { middleCardNos.add(x); });
    persistDeckState();
    try { localStorage.setItem(STORAGE_ACTIVE_PRESET_ID, slot.id); } catch (_) { /* noop */ }
    renderPresetSelect();
    renderCounts();
    scheduleRenderDeckList();
    scheduleRenderCardGrid();
  }

  function wireDeckLibraryGridOnce() {
    var host = el("deck-library-grid");
    if (!host || host.dataset.libWired === "1") return;
    host.dataset.libWired = "1";
    host.addEventListener("click", function (ev) {
      var actEl = ev.target && ev.target.closest ? ev.target.closest("[data-deck-lib-act]") : null;
      if (!actEl) return;
      var tile = actEl.closest(".deck-library-tile");
      var id = tile && tile.getAttribute("data-deck-lib-id");
      if (!id) return;
      var slot = library.slots.find(function (x) { return x.id === id; });
      if (!slot) {
        showToast("データがありません（一覧を更新しました）");
        library = loadDeckLibrary();
        renderPresetSelect();
        renderDeckLibraryTiles();
        return;
      }
      var act = actEl.getAttribute("data-deck-lib-act");
      if (act === "load") {
        applyLibrarySlotToMainDeck(slot);
        renderDeckLibraryTiles();
        showToast("「" + (slot.name || "デッキ") + "」を読み込みました");
        return;
      }
      if (act === "peek" || act === "peek-btn") {
        renderSavedDeckPeek(slot, {
          roleEditMode: isBuiltInStarterDeckId(slot.id) ? "off" : "library-slot",
          librarySlotId: slot.id,
        });
        return;
      }
      if (act === "play") {
        applyLibrarySlotToMainDeck(slot);
        renderDeckLibraryTiles();
        startSoloPlayWithBundle(deckBundleFromSource(slot));
        return;
      }
      if (act === "delete") {
        if (isBuiltInStarterDeckId(slot.id)) {
          showToast("共通の初期デッキは「サンプルを非表示」から外してください");
          return;
        }
        if (!window.confirm("「" + (slot.name || "デッキ") + "」を削除しますか？")) return;
        library = removeDeckSlot(library, slot.id);
        persistDeckLibrary(library);
        renderPresetSelect();
        renderDeckLibraryTiles();
        showToast("「" + (slot.name || "デッキ") + "」を削除しました");
        return;
      }
      if (act === "delete-builtin") {
        if (!isBuiltInStarterDeckId(slot.id)) return;
        if (!canDismissBuiltInStarter(library)) {
          showToast("自分のデッキを 1 件以上保存してからサンプルを非表示にできます");
          return;
        }
        if (!window.confirm("サンプルデッキ「" + (slot.name || "") + "」を一覧から非表示にしますか？\n（あとで「サンプルを再表示」から戻せます）")) return;
        library = removeDeckSlot(library, slot.id);
        persistDeckLibrary(library);
        renderPresetSelect();
        renderDeckLibraryTiles();
        showToast("サンプルを一覧から非表示にしました");
        return;
      }
    });
  }

  function applySampleRecipeToMainDeck(recipe) {
    deckMap = cloneDeckMap(recipe.deck);
    keyCardNos.clear();
    keyCard2Nos.clear();
    keyCard3Nos.clear();
    middleCardNos.clear();
    sanitizeCardNoList(recipe.keyCardNos).forEach(function (x) {
      keyCardNos.add(x);
    });
    sanitizeCardNoList(recipe.keyCard2Nos).forEach(function (x) {
      keyCard2Nos.add(x);
    });
    sanitizeCardNoList(recipe.keyCard3Nos).forEach(function (x) {
      keyCard3Nos.add(x);
    });
    sanitizeCardNoList(recipe.middleCardNos).forEach(function (x) {
      middleCardNos.add(x);
    });
    persistDeckState();
    try {
      localStorage.removeItem(STORAGE_ACTIVE_PRESET_ID);
    } catch (_) {
      /* noop */
    }
    renderPresetSelect();
    renderCounts();
    scheduleRenderDeckList();
    scheduleRenderCardGrid();
  }

  function wireSampleRecipesGridOnce() {
    var host = el("sample-recipes-grid");
    if (!host || host.dataset.sampleWired === "1") return;
    host.dataset.sampleWired = "1";
    host.addEventListener("click", function (ev) {
      var actEl = ev.target && ev.target.closest ? ev.target.closest("[data-sample-act]") : null;
      if (!actEl) return;
      var tile = actEl.closest(".sample-recipe-tile");
      var sid = tile && tile.getAttribute("data-sample-id");
      var recipe = findSampleRecipeById(sid);
      if (!recipe) return;
      var act = actEl.getAttribute("data-sample-act");
      if (act === "peek") {
        renderSavedDeckPeek(
          {
            name: recipe.name,
            deck: recipe.deck,
            keyCardNos: recipe.keyCardNos,
            keyCard2Nos: recipe.keyCard2Nos,
            keyCard3Nos: recipe.keyCard3Nos,
            middleCardNos: recipe.middleCardNos,
            updatedAt: "",
          },
          {
            peekTitle: "サンプル: " + recipe.name,
            roleEditMode: "off",
            noteLines: recipe.noteLines || [],
          },
        );
        return;
      }
      if (act === "play") {
        applySampleRecipeToMainDeck(recipe);
        startSoloPlayWithBundle(deckBundleFromSource(recipe));
        return;
      }
      if (act === "copy") {
        applySampleRecipeToMainDeck(recipe);
        pruneOrphanRoleLabels();
        deckRegistrationPanelOpen = true;
        showToast("「" + recipe.name + "」を編集中デッキに読み込みました（保存デッキ一覧には追加していません）");
        return;
      }
      if (act === "dev-thumb") {
        if (!isSampleDevMode()) return;
        openSampleThumbnailPickOverlay(recipe, function (pickedNo) {
          var curTh = getSampleDeckRecipes().slice();
          var mapped = curTh.map(function (x) {
            if (x.id !== sid) return x;
            var y = Object.assign({}, x);
            y.thumbnailCardNo = pickedNo;
            return y;
          });
          devPublishSampleRecipeList(mapped);
        });
        return;
      }
      if (act === "dev-delete") {
        if (!isSampleDevMode()) return;
        if (!window.confirm("このサンプルを削除しますか？")) return;
        var curDel = getSampleDeckRecipes().slice();
        var filtered = curDel.filter(function (x) {
          return x.id !== sid;
        });
        if (filtered.length === curDel.length) return;
        if (!filtered.length) {
          showToast("最後の1件は削除できません");
          return;
        }
        devPublishSampleRecipeList(filtered);
        return;
      }
      if (act === "dev-overwrite") {
        if (!isSampleDevMode()) return;
        if (!window.confirm("「" + recipe.name + "」を、いまの登録デッキの内容で上書きしますか？")) return;
        var draft = sampleRecipeDraftFromEditor(recipe.name, recipe.id);
        if (recipe.noteLines && recipe.noteLines.length) draft.noteLines = recipe.noteLines.slice();
        var curOw = getSampleDeckRecipes().slice();
        var replaced = curOw.map(function (x) {
          return x.id === sid ? draft : x;
        });
        devPublishSampleRecipeList(replaced);
        return;
      }
    });
  }

  function wireSampleRecipesDnDOnce() {
    var host = el("sample-recipes-grid");
    if (!host || host.dataset.sampleDndWired === "1") return;
    host.dataset.sampleDndWired = "1";
    host.addEventListener("dragstart", function (ev) {
      if (!isSampleDevMode()) return;
      var btn = ev.target && ev.target.closest && ev.target.closest(".sample-recipe-thumb-btn--dev-dnd");
      if (!btn || !ev.dataTransfer) return;
      var tile = btn.closest(".sample-recipe-tile");
      if (!tile) return;
      var ix = parseInt(tile.getAttribute("data-sample-index") || "-1", 10);
      if (ix < 0 || Number.isNaN(ix)) return;
      sampleRecipeDnDFrom = ix;
      ev.dataTransfer.setData("text/plain", "sample-recipe-order:" + ix);
      ev.dataTransfer.effectAllowed = "move";
    });
    host.addEventListener("dragend", function () {
      sampleRecipeDnDFrom = -1;
    });
    host.addEventListener("dragover", function (ev) {
      if (!isSampleDevMode() || sampleRecipeDnDFrom < 0) return;
      var tile = ev.target && ev.target.closest && ev.target.closest(".sample-recipe-tile");
      if (!tile) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    });
    host.addEventListener("drop", function (ev) {
      if (!isSampleDevMode()) return;
      var tile = ev.target && ev.target.closest && ev.target.closest(".sample-recipe-tile");
      if (!tile) return;
      var raw = "";
      try {
        raw = ev.dataTransfer ? ev.dataTransfer.getData("text/plain") || "" : "";
      } catch (_) {
        raw = "";
      }
      var from =
        typeof raw === "string" && raw.indexOf("sample-recipe-order:") === 0
          ? parseInt(raw.slice("sample-recipe-order:".length), 10)
          : sampleRecipeDnDFrom;
      var to = parseInt(tile.getAttribute("data-sample-index") || "-1", 10);
      if (
        from < 0 ||
        to < 0 ||
        from === to ||
        Number.isNaN(from) ||
        Number.isNaN(to)
      ) {
        return;
      }
      ev.preventDefault();
      var arr = getSampleDeckRecipes().slice();
      if (from >= arr.length || to >= arr.length) return;
      var swapA = arr[from];
      arr[from] = arr[to];
      arr[to] = swapA;
      devPublishSampleRecipeList(arr, { quiet: true });
      sampleRecipeDnDFrom = -1;
    });
  }

  function syncCardPanelToggleButtons() {
    const bc = el("btn-card-panel-catalog");
    const bd = el("btn-card-panel-deck");
    const bs = el("btn-card-panel-samples");
    const bcur = el("btn-card-panel-current-deck");
    const baseline =
      !samplePanelOpen && !deckRegistrationPanelOpen && !currentDeckPanelOpen;
    if (bc) {
      bc.setAttribute("aria-pressed", baseline ? "true" : "false");
      bc.classList.toggle("primary", baseline);
      bc.classList.toggle("secondary", !baseline);
    }
    if (bd) {
      bd.setAttribute("aria-pressed", deckRegistrationPanelOpen ? "true" : "false");
      bd.classList.toggle("primary", deckRegistrationPanelOpen);
      bd.classList.toggle("secondary", !deckRegistrationPanelOpen);
    }
    if (bs) {
      bs.setAttribute("aria-pressed", samplePanelOpen ? "true" : "false");
      bs.classList.toggle("sample-panel-toggle--open", samplePanelOpen);
      bs.classList.toggle("primary", samplePanelOpen);
      bs.classList.toggle("secondary", !samplePanelOpen);
    }
    if (bcur) {
      bcur.setAttribute("aria-pressed", currentDeckPanelOpen ? "true" : "false");
      bcur.classList.toggle("primary", currentDeckPanelOpen);
      bcur.classList.toggle("secondary", !currentDeckPanelOpen);
    }
    schedulePersistDeckBuilderUiState();
  }

  function toggleSamplePanel() {
    samplePanelOpen = !samplePanelOpen;
    syncCardPanelToggleButtons();
    scheduleRenderCardGrid();
  }

  /** 開発者向け: サンプルに含まれるカードからサムネイルを選択 */
  function openSampleThumbnailPickOverlay(recipe, onPicked) {
    var existing = document.getElementById("sample-thumb-pick-root");
    if (existing) existing.remove();

    var nos = Object.keys(recipe.deck || {}).filter(function (k) {
      return (recipe.deck[k] || 0) > 0;
    });
    nos.sort();
    if (!nos.length) {
      showToast("このサンプルにカードがありません");
      return;
    }

    var backdrop = document.createElement("div");
    backdrop.id = "sample-thumb-pick-root";
    backdrop.className = "sample-thumb-pick-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "sample-thumb-pick-title");

    var dialog = document.createElement("div");
    dialog.className = "sample-thumb-pick-dialog";

    var title = document.createElement("h3");
    title.id = "sample-thumb-pick-title";
    title.textContent = "サムネイルに使うカードを選ぶ";

    var meta = document.createElement("p");
    meta.className = "sample-thumb-pick-meta muted";
    meta.textContent =
      (recipe.name ? "「" + recipe.name + "」" : "このサンプル") +
      " のデッキに入っているカードから選んでください。";

    var grid = document.createElement("div");
    grid.className = "sample-thumb-pick-grid";

    function closeOverlay() {
      backdrop.remove();
    }

    var effPick = effectiveSampleThumbnailCardNo(recipe);

    nos.forEach(function (no, idx) {
      var c = getCard(no);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sample-thumb-pick-card";
      btn.setAttribute("aria-label", (c && c.name ? c.name : no) + " をサムネイルにする");
      btn.dataset.cardNo = String(no);
      btn.innerHTML =
        c && c.img
          ? builderCatalogThumbImgHtml(c.img, "deck-builder-card-thumb", { eager: idx < 24, hiQuality: true })
          : '<div class="sample-recipe-thumb-fallback" aria-hidden="true">?</div>';
      btn.addEventListener("click", function () {
        onPicked(String(no));
        closeOverlay();
      });
      if (String(no) === effPick) btn.classList.add("is-current");
      grid.appendChild(btn);
    });

    var actions = document.createElement("div");
    actions.className = "sample-thumb-pick-actions";

    var btnAuto = document.createElement("button");
    btnAuto.type = "button";
    btnAuto.className = "btn sm secondary";
    btnAuto.textContent = "キー①に合わせる（自動）";
    btnAuto.addEventListener("click", function () {
      onPicked("");
      closeOverlay();
    });

    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "btn sm";
    btnClose.textContent = "キャンセル";
    btnClose.addEventListener("click", closeOverlay);

    actions.appendChild(btnAuto);
    actions.appendChild(btnClose);

    dialog.appendChild(title);
    dialog.appendChild(meta);
    dialog.appendChild(grid);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);

    backdrop.addEventListener("click", function (ev) {
      if (ev.target === backdrop) closeOverlay();
    });

    document.body.appendChild(backdrop);
    btnClose.focus();
  }

  if (root.dataset.cardPanelToggleWired !== "1") {
    root.dataset.cardPanelToggleWired = "1";
    el("btn-card-panel-catalog")?.addEventListener("click", function () {
      samplePanelOpen = false;
      deckRegistrationPanelOpen = false;
      currentDeckPanelOpen = false;
      syncCardPanelToggleButtons();
      scheduleRenderCardGrid();
    });
    el("btn-card-panel-samples")?.addEventListener("click", function () {
      toggleSamplePanel();
    });
    el("btn-card-panel-deck")?.addEventListener("click", function () {
      deckRegistrationPanelOpen = !deckRegistrationPanelOpen;
      syncCardPanelToggleButtons();
      wireDeckLibraryGridOnce();
      wireRestoreBuiltInButtonOnce();
      scheduleRenderCardGrid();
    });
    el("btn-card-panel-current-deck")?.addEventListener("click", function () {
      currentDeckPanelOpen = !currentDeckPanelOpen;
      syncCardPanelToggleButtons();
      scheduleRenderCardGrid();
    });
    el("btn-clear-current-deck")?.addEventListener("click", function () {
      if (!currentDeckPanelOpen) return;
      if (
        !window.confirm(
          "現在のデッキに入っているカードをすべて0枚にします。\nこの操作は元に戻せません。続行しますか？",
        )
      ) {
        return;
      }
      Object.keys(deckMap).forEach(function (no) {
        delete deckMap[no];
      });
      keyCardNos.clear();
      keyCard2Nos.clear();
      keyCard3Nos.clear();
      middleCardNos.clear();
      persistDeckState();
      scheduleRenderCardGrid();
      showToast("デッキをクリアしました");
    });
  }

  syncCardPanelToggleButtons();
  wireDeckLibraryGridOnce();
  wireRestoreBuiltInButtonOnce();

  syncSampleDeveloperToolbar();
  el("btn-sample-dev-toggle")?.addEventListener("click", function () {
    if (isSampleDevMode()) {
      setSampleDevMode(false);
      syncSampleDeveloperToolbar();
      if (samplePanelOpen) scheduleRenderCardGrid();
      showToast("開発者モードを終了しました");
      return;
    }
    var typed = window.prompt("開発者モードのパスコードを入力してください");
    if (typed == null) return;
    if (String(typed) !== SAMPLE_DEVELOPER_PASSCODE) {
      showToast("パスコードが違います");
      return;
    }
    setSampleDevMode(true);
    syncSampleDeveloperToolbar();
    if (samplePanelOpen) scheduleRenderCardGrid();
    showToast("開発者モード: サンプル一覧を編集できます（終了ボタンで閉じます）");
  });

  el("btn-add-current-deck-to-samples")?.addEventListener("click", function () {
    if (!isSampleDevMode()) return;
    var cur = getSampleDeckRecipes().slice();
    var nameIn = window.prompt("新しいサンプルの名前", "新規サンプル");
    if (nameIn == null) return;
    var nm = String(nameIn).trim();
    if (!nm) {
      showToast("名前を入力してください");
      return;
    }
    var id = "sample-dev-" + Date.now();
    var draft = sampleRecipeDraftFromEditor(nm, id);
    cur.push(draft);
    devPublishSampleRecipeList(cur);
  });

  el("btn-sample-deploy-save")?.addEventListener("click", function () {
    if (!isSampleDevMode()) return;
    var list = getSampleDeckRecipes();
    if (!list.length) {
      showToast("保存するサンプルがありません");
      return;
    }
    savePublishedSampleRecipesToDisk(list).then(function (r) {
      if (!r || r.mode === "aborted") return;
      var synced = normalizeSampleRecipesArray(list);
      if (synced.length) setPublishedSampleRecipesCache(synced);
      if (samplePanelOpen) scheduleRenderCardGrid();
      if (r.mode === "project") {
        showToast(
          SAMPLE_DECK_RECIPES_PUBLIC_FILENAME +
            " をサイト用フォルダに保存しました。このタブのサンプル一覧も更新済みです。公開サイトは push のあと再読み込みしてください。",
        );
        return;
      }
      if (r.mode === "picker") {
        showToast(
          "保存しました。このタブのサンプル一覧も更新済みです。公開サイトは push のあとページを再読み込みしてください。",
        );
        return;
      }
      showToast(
        "ブラウザにダウンロードしました。このタブの一覧は更新済みです。" +
          SAMPLE_DECK_RECIPES_PUBLIC_FILENAME +
          " を公開ディレクトリに置いて push 後に再読み込みしてください。",
      );
    });
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

  function applyStartupCatalogProductFilter() {
    const want = FIRST_VISIT_CATALOG_PRODUCT_EXACT;
    /* 空文字なら「全商品」表示にしたいので何も適用しない（既定の "" 状態に任せる） */
    if (!want) return;
    /** @type {Set<string>} */
    const products = new Set();
    cards.forEach(function (c) {
      if (c && c.product) products.add(String(c.product));
    });
    var pick = "";
    if (products.has(want)) pick = want;
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
  }

  syncCardPanelToggleButtons();

  fillSelects();
  applyStartupCatalogProductFilter();
  consumeBuilderUiRestoreFlag();
  wireSampleRecipesGridOnce();
  wireSampleRecipesDnDOnce();
  wirePeekListRoleEditorOnce();
  wireDeckPeekInlineStatusCloseOnce();
  /* 特殊ハートのユーザー上書きが変わったらカードグリッドとデッキ集計を再描画 */
  window.addEventListener("llocg:specialBhOverrideChanged", function () {
    try { scheduleRenderCardGrid(); } catch (_) { /* noop */ }
    try { renderCounts(); } catch (_) { /* noop */ }
  });
  renderPresetSelect();
  renderCounts();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      try {
        renderDeckList();
      } catch (_) {
        /* noop */
      }
      try {
        scheduleRenderCardGrid();
      } catch (_) {
        /* noop */
      }
    });
  });
  if (pendingBuilderUiRestoreScroll) {
    var s = pendingBuilderUiRestoreScroll;
    pendingBuilderUiRestoreScroll = null;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var cg = el("card-grid-scroll");
        if (cg) cg.scrollTop = s.card;
        var sp = el("sample-recipes-scroll");
        if (sp) sp.scrollTop = s.sample;
      });
    });
  }

  window.addEventListener("beforeunload", persistDeckBuilderUiState);
  window.addEventListener("pagehide", persistDeckBuilderUiState);
  el("card-grid-scroll")?.addEventListener(
    "scroll",
    function () {
      schedulePersistDeckBuilderUiState();
    },
    { passive: true },
  );
  el("sample-recipes-scroll")?.addEventListener(
    "scroll",
    function () {
      schedulePersistDeckBuilderUiState();
    },
    { passive: true },
  );
  persistDeckBuilderUiState();
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
