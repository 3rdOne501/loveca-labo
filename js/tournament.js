/**
 * トーナメント画面（主催者用）と使用率選抜。
 * となめるの参加者 API は公開されていないため、選手は貼り付け / 手入力。
 * デッキコードは DECK LOG の共有コードとして記録し、ブラウザから API は叩かない。
 */
import { catalogCardIdentityKey, catalogListThumbnailUrl, getCard, getCardCatalogSnapshot } from "./cards.js";
import { DEFAULT_STARTER_DECK_MAP, MAIN_SIZE, SAMPLE_DECK_RECIPES_PUBLIC_FILENAME, STORAGE_TOURNAMENT, T_ENERGY, T_LIVE, T_MEMBER } from "./config.js";
import { extractDeckRecipeLines, parseDeckTextRecipe } from "./decklogImport.js";
import { isBuiltInStarterDeckId, loadDeckLibrary } from "./deckLibrary.js";
import { getSampleDeckRecipes } from "./sampleDeckRecipes.js";
import { showToast } from "./ui.js";
import { showAppView, showDeckBuilderView } from "./viewNav.js";
import {
  KOBOSHI_CS_PRESET,
  advancementLabel,
  computeDeckPointLines,
  computeUsageRateSelection,
  deckMapToRecipeText,
  deckMapTotal,
  decklogViewUrl,
  duplicateNameGroups,
  getDeckPointLine,
  mergeRosterKeepDecks,
  nameMatchKey,
  normalizePlayer,
  parseNamedDeckBlocks,
  parseParticipantPaste,
  parseTonamelCompetitionId,
  normalizeRosterIncludeOpts,
  pickLotteryWinners,
  isUndefeatedAdvance,
  isUsageRateCandidate,
  isWinsInPool,
  mergePlayerRecords,
  pickPrelimAdvancers,
  poolRangeLabel,
  clusterSimilarDecks,
  collapseDeckMapByIdentity,
  deckHalfL1,
} from "./usageRateSelection.js";

function newPlayerId() {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function emptyPlayer() {
  return normalizePlayer({
    id: newPlayerId(),
    name: "",
    wins: 0,
    losses: 0,
    dropped: false,
    deckCode: "",
    recipeText: "",
    deckMap: {},
  });
}

function defaultSettings() {
  return Object.assign({ deckPointLine: "w2", filterListByPool: false }, KOBOSHI_CS_PRESET, {
    rosterIncludeUnpaid: false,
    rosterIncludeEntered: true,
    usageRankCount: 50,
    usageBoardHeadline: "使用率ポイント 1〜50位",
  });
}

function newEventId() {
  return "e_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

function defaultState() {
  return Object.assign(emptyEventFields(), {
    settings: defaultSettings(),
    players: [],
    selectedId: "",
    eventId: newEventId(),
    events: {},
  });
}

function emptyEventFields() {
  return {
    lastRosterText: "",
    skippedRows: [],
    lotteryWinnerIds: [],
    lotteryLog: [],
    columnMap: { deckCode: "" },
    csvHeaders: [],
    playerQuery: "",
    playerSort: "default",
    cardKindFilter: "all",
    trialBackup: null,
    clusterNames: {},
    clusterThumbs: {},
    clusterThumbPos: {},
    clusterAssign: {},
    distChartKind: "bar",
    distSort: "size",
  };
}

function serializePlayer(p) {
  return {
    id: p.id,
    name: p.name,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws || 0,
    dropped: !!p.dropped,
    deckCode: p.deckCode,
    recipeText: p.recipeText,
    deckMap: p.deckMap,
  };
}

function hydratePlayers(players) {
  return (Array.isArray(players) ? players : []).map(function (p, i) {
    const n = normalizePlayer(p, i);
    if (!n.id || n.id === "p_" + i) n.id = p && p.id ? String(p.id) : newPlayerId();
    n.draws = Math.max(0, Math.floor(Number(p && p.draws) || 0));
    if (!Object.keys(n.deckMap).length && n.recipeText) applyRecipeText(n, n.recipeText);
    return n;
  });
}

function cloneEventBlob() {
  return {
    settings: JSON.parse(JSON.stringify(state.settings)),
    players: state.players.map(serializePlayer),
    lastRosterText: state.lastRosterText || "",
    skippedRows: (state.skippedRows || []).slice(),
    lotteryWinnerIds: (state.lotteryWinnerIds || []).slice(),
    lotteryLog: (state.lotteryLog || []).slice(),
    columnMap: Object.assign({ deckCode: "" }, state.columnMap || {}),
    csvHeaders: (state.csvHeaders || []).slice(),
    playerQuery: state.playerQuery || "",
    playerSort: state.playerSort || "default",
    cardKindFilter: state.cardKindFilter || "all",
    trialBackup: state.trialBackup ? JSON.parse(JSON.stringify(state.trialBackup)) : null,
    clusterNames: Object.assign({}, state.clusterNames || {}),
    clusterThumbs: Object.assign({}, state.clusterThumbs || {}),
    clusterThumbPos: JSON.parse(JSON.stringify(state.clusterThumbPos || {})),
    clusterAssign: Object.assign({}, state.clusterAssign || {}),
    distChartKind: state.distChartKind === "pie" ? "pie" : "bar",
    distSort: state.distSort === "found" ? "found" : "size",
  };
}

function applyEventBlob(blob) {
  const src = blob && typeof blob === "object" ? blob : {};
  const settings = Object.assign(defaultSettings(), src.settings || {});
  settings.poolMinWins = Math.max(0, Math.min(4, Number(settings.poolMinWins)));
  if (!Number.isFinite(settings.poolMinWins)) settings.poolMinWins = 2;
  if (settings.poolMaxWins == null || settings.poolMaxWins === "" || Number(settings.poolMaxWins) < 0) {
    settings.poolMaxWins = null;
  } else {
    settings.poolMaxWins = Math.max(0, Math.min(4, Number(settings.poolMaxWins)));
    if (settings.poolMinWins > settings.poolMaxWins) settings.poolMinWins = settings.poolMaxWins;
  }
  settings.deckPointLine = getDeckPointLine(settings.deckPointLine).id;
  settings.rosterIncludeUnpaid = settings.rosterIncludeUnpaid === true;
  settings.rosterIncludeEntered = settings.rosterIncludeEntered !== false;
  settings.filterListByPool = settings.filterListByPool === true;
  settings.usageRankCount = Number(settings.usageRankCount) === 80 ? 80 : 50;
  if (!settings.usageBoardHeadline || /^使用率ポイント 1〜\d+位$/.test(String(settings.usageBoardHeadline))) {
    settings.usageBoardHeadline = usageHeadlineForCount(settings.usageRankCount);
  } else {
    settings.usageBoardHeadline = String(settings.usageBoardHeadline);
  }
  const extras = emptyEventFields();
  state.settings = settings;
  state.players = hydratePlayers(src.players);
  state.selectedId = "";
  state.lastRosterText = src.lastRosterText || "";
  state.skippedRows = Array.isArray(src.skippedRows) ? src.skippedRows : [];
  state.lotteryWinnerIds = Array.isArray(src.lotteryWinnerIds) ? src.lotteryWinnerIds.map(String) : [];
  state.lotteryLog = Array.isArray(src.lotteryLog) ? src.lotteryLog : [];
  state.columnMap = Object.assign(extras.columnMap, src.columnMap || {});
  state.csvHeaders = Array.isArray(src.csvHeaders) ? src.csvHeaders : [];
  state.playerQuery = src.playerQuery || "";
  state.playerSort = src.playerSort || "default";
  state.cardKindFilter = src.cardKindFilter || "all";
  state.trialBackup = Array.isArray(src.trialBackup) ? src.trialBackup : null;
  state.clusterNames = src.clusterNames && typeof src.clusterNames === "object" ? Object.assign({}, src.clusterNames) : {};
  state.clusterThumbs = src.clusterThumbs && typeof src.clusterThumbs === "object" ? Object.assign({}, src.clusterThumbs) : {};
  state.clusterThumbPos = src.clusterThumbPos && typeof src.clusterThumbPos === "object" ? JSON.parse(JSON.stringify(src.clusterThumbPos)) : {};
  state.clusterAssign = src.clusterAssign && typeof src.clusterAssign === "object" ? Object.assign({}, src.clusterAssign) : {};
  state.distChartKind = src.distChartKind === "pie" ? "pie" : "bar";
  state.distSort = src.distSort === "found" ? "found" : "size";
}

/** @type {ReturnType<typeof cloneEventBlob>[]} */
let undoStack = [];

function pushUndo() {
  undoStack.push(cloneEventBlob());
  if (undoStack.length > 8) undoStack.shift();
}

/** @type {any} */
let state = defaultState();
let wired = false;

function identityFn(cardNo) {
  try {
    return catalogCardIdentityKey(cardNo) || String(cardNo || "");
  } catch (_) {
    return String(cardNo || "");
  }
}

function sanitizeMainDeckMap(deckMap) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const [no, qty] of Object.entries(deckMap || {})) {
    const q = Math.floor(Number(qty) || 0);
    if (q <= 0) continue;
    const card = getCard(no);
    if (card && card.type === T_ENERGY) continue;
    out[no] = (out[no] || 0) + q;
  }
  return out;
}

function applyRecipeText(player, text) {
  let recipeText = String(text || "");
  let parsed = parseDeckTextRecipe(recipeText, getCardCatalogSnapshot() || {});
  if (!Object.keys(parsed.deckMap || {}).length) {
    const extracted = extractDeckRecipeLines(recipeText);
    if (extracted) {
      recipeText = extracted;
      parsed = parseDeckTextRecipe(recipeText, getCardCatalogSnapshot() || {});
    }
  }
  player.recipeText = recipeText;
  player.deckMap = sanitizeMainDeckMap(parsed.deckMap);
  player.recipeWarns = parsed.warns || [];
  return player;
}

function persist() {
  try {
    const events = Object.assign({}, state.events || {});
    events[state.eventId] = Object.assign({ id: state.eventId, title: state.settings.title || "" }, cloneEventBlob());
    state.events = events;
    localStorage.setItem(
      STORAGE_TOURNAMENT,
      JSON.stringify({
        v: 2,
        activeId: state.eventId,
        events: events,
      }),
    );
  } catch (err) {
    console.warn("[tournament] persist failed:", err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_TOURNAMENT);
    if (!raw) {
      state = defaultState();
      return;
    }
    const data = JSON.parse(raw);
    if (data && data.v === 2 && data.events && typeof data.events === "object") {
      state = defaultState();
      state.events = data.events;
      const ids = Object.keys(data.events);
      const active = data.activeId && data.events[data.activeId] ? data.activeId : ids[0];
      if (!active) return;
      state.eventId = active;
      applyEventBlob(data.events[active]);
      persist();
      return;
    }
    state = defaultState();
    applyEventBlob({
      settings: data && data.settings,
      players: data && data.players,
    });
    persist();
  } catch (err) {
    console.warn("[tournament] load failed:", err);
    state = defaultState();
  }
}

function compute() {
  return computeUsageRateSelection(state.players, {
    finalsSlots: state.settings.advanceCount || state.settings.finalsSlots,
    poolMinWins: state.settings.poolMinWins,
    poolMaxWins: state.settings.poolMaxWins,
    identityFn: identityFn,
    lotteryWinnerIds: state.lotteryWinnerIds || [],
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardLabel(cardNo) {
  const card = getCard(cardNo);
  const name = card && card.name ? String(card.name) : "";
  return name ? name + "（" + cardNo + "）" : String(cardNo || "");
}

function cardTypeLabel(card) {
  if (!card) return "？";
  if (card.type === T_LIVE) return "ライブ";
  if (card.type === T_MEMBER) return "メンバー";
  return card.type || "？";
}

function cardThumbHtml(card, opts) {
  if (!card) return '<span class="deck-thumb deck-thumb-missing" title="カードデータなし"></span>';
  const full = card.img ? String(card.img) : "";
  if (!full) return '<span class="deck-thumb deck-thumb-missing" title="画像なし"></span>';
  const src = catalogListThumbnailUrl(full, opts && opts.hi ? { hi: true } : undefined) || full;
  return (
    '<img class="deck-thumb deck-builder-card-thumb" src="' +
    escapeHtml(src) +
    '" data-full-src="' +
    escapeHtml(full) +
    '" alt="" loading="lazy" decoding="async" />'
  );
}

function sortDeckListBreakdown(breakdown) {
  return (breakdown || []).slice().sort(function (a, b) {
    const ca = getCard(a.cardNo);
    const cb = getCard(b.cardNo);
    const ta = ca && ca.type === T_LIVE ? 1 : ca && ca.type === T_MEMBER ? 0 : 2;
    const tb = cb && cb.type === T_LIVE ? 1 : cb && cb.type === T_MEMBER ? 0 : 2;
    if (ta !== tb) return ta - tb;
    if (ta === 0) {
      const na = Number(ca && ca.cost);
      const nb = Number(cb && cb.cost);
      const ra = Number.isFinite(na) ? na : 999;
      const rb = Number.isFinite(nb) ? nb : 999;
      if (ra !== rb) return ra - rb;
    }
    const na = ca && ca.name ? ca.name : a.cardNo;
    const nb = cb && cb.name ? cb.name : b.cardNo;
    return String(na).localeCompare(String(nb), "ja");
  });
}

function activeDeckPointLineId() {
  return getDeckPointLine(state.settings.deckPointLine).id;
}

function playerPointLines(p) {
  return computeDeckPointLines(state.players, p && p.deckMap, { identityFn: identityFn });
}

function pointLinesHtml(lines, activeId) {
  return (
    '<div class="tourney-point-lines" role="group" aria-label="デッキポイントの母数">' +
    (lines || [])
      .map(function (line) {
        const on = line.id === activeId;
        return (
          '<button type="button" class="tourney-point-line' +
          (on ? " is-on" : "") +
          '" data-point-line="' +
          escapeHtml(line.id) +
          '" aria-pressed="' +
          (on ? "true" : "false") +
          '"><span>' +
          escapeHtml(line.label) +
          "</span><strong>" +
          (line.hasRecipe ? String(line.points) + "P" : "—") +
          "</strong><em>" +
          line.poolCount +
          "デッキ</em></button>"
        );
      })
      .join("") +
    "</div>"
  );
}

function tourneyDeckListHtml(breakdown) {
  const rows = sortDeckListBreakdown(breakdown);
  if (!rows.length) {
    return '<p class="muted">レシピがまだありません。テキストを貼るか、DECK LOG からテキスト化して入れてください。</p>';
  }
  return (
    '<ul class="deck-list tourney-deck-list">' +
    rows
      .map(function (b) {
        const card = getCard(b.cardNo);
        return (
          '<li class="deck-list-row tourney-deck-row" data-card-no="' +
          escapeHtml(b.cardNo) +
          '"><div class="deck-list-info">' +
          cardThumbHtml(card) +
          '<span class="deck-type-badge" data-type="' +
          escapeHtml(card && card.type ? card.type : "") +
          '">' +
          escapeHtml(cardTypeLabel(card)) +
          '</span><span class="deck-name" title="' +
          escapeHtml(cardLabel(b.cardNo)) +
          '">' +
          escapeHtml(card && card.name ? card.name : "（未登録） " + b.cardNo) +
          "</span></div>" +
          '<div class="tourney-deck-row-meta"><span class="deck-qty">×' +
          b.qty +
          '</span><span class="tourney-deck-pcopy">' +
          b.perCopy +
          'P</span><span class="tourney-pts">' +
          b.subtotal +
          "P</span></div></li>"
        );
      })
      .join("") +
    "</ul>"
  );
}

function recipeStatus(p) {
  const n = deckMapTotal(p.deckMap);
  if (!n) return { cls: "is-empty", text: "未入力" };
  if (n === MAIN_SIZE) return { cls: "is-ok", text: n + "枚" };
  return { cls: "is-warn", text: n + "枚" };
}

function fillSettingsForm() {
  const s = state.settings;
  setVal("input-tourney-title", s.title);
  setVal("input-tourney-tonamel", s.tonamelUrl);
  setVal("input-tourney-date", s.dateLabel);
  setVal("input-tourney-capacity", s.capacity);
  setVal("input-tourney-swiss", s.swissRounds);
  setVal("input-tourney-finals", s.finalsSlots);
  setVal("input-tourney-advance-count", s.advanceCount != null ? s.advanceCount : s.finalsSlots);
  if (s.undefeatedCount != null) setVal("input-tourney-undefeated-count", s.undefeatedCount);
  setVal("input-tourney-board-headline", s.boardHeadline || "決勝ラウンド進出者");
  setVal("input-tourney-usage-headline", s.usageBoardHeadline || usageHeadlineForCount(usageRankLimit()));
  renderUsageCountButtons();
  const filterEl = document.getElementById("input-tourney-filter-pool");
  if (filterEl) filterEl.checked = s.filterListByPool === true;
  const qEl = document.getElementById("input-tourney-player-q");
  if (qEl && document.activeElement !== qEl) qEl.value = state.playerQuery || "";
  const sortEl = document.getElementById("select-tourney-player-sort");
  if (sortEl) sortEl.value = state.playerSort || "default";
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!value;
  else el.value = value == null ? "" : String(value);
}

function readSettingsFromForm() {
  const s = state.settings;
  s.title = strVal("input-tourney-title") || s.title;
  s.tonamelUrl = strVal("input-tourney-tonamel");
  s.dateLabel = strVal("input-tourney-date");
  s.capacity = numVal("input-tourney-capacity", s.capacity);
  s.swissRounds = numVal("input-tourney-swiss", s.swissRounds);
  s.finalsSlots = Math.max(1, numVal("input-tourney-finals", s.finalsSlots));
  const advEl = document.getElementById("input-tourney-advance-count");
  if (advEl && String(advEl.value).trim() !== "") {
    s.advanceCount = Math.max(1, numVal("input-tourney-advance-count", s.finalsSlots));
    s.finalsSlots = s.advanceCount;
  } else {
    s.advanceCount = s.finalsSlots;
  }
  const undEl = document.getElementById("input-tourney-undefeated-count");
  if (undEl && String(undEl.value).trim() !== "") {
    s.undefeatedCount = Math.max(0, numVal("input-tourney-undefeated-count", 0));
  } else {
    s.undefeatedCount = null;
  }
  s.boardHeadline = strVal("input-tourney-board-headline") || "決勝ラウンド進出者";
  s.usageRankCount = Number(s.usageRankCount) === 80 ? 80 : 50;
  const typedHeadline = strVal("input-tourney-usage-headline");
  if (typedHeadline && !/^使用率ポイント 1〜\d+位$/.test(typedHeadline)) {
    s.usageBoardHeadline = typedHeadline;
  } else {
    s.usageBoardHeadline = usageHeadlineForCount(s.usageRankCount);
  }
  const filterEl = document.getElementById("input-tourney-filter-pool");
  if (filterEl) s.filterListByPool = !!filterEl.checked;
}

function strVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function numVal(id, fallback) {
  const el = document.getElementById(id);
  const v = Math.floor(Number(el && el.value));
  return Number.isFinite(v) ? v : fallback;
}

function render(opts) {
  opts = opts || {};
  fillSettingsForm();
  const result = compute();
  renderSummary(result);
  renderPoolRange();
  renderRosterFlags();
  renderEventsBar();
  renderColumnSelect();
  renderOpsNotes(result);
  renderTrialBanner();
  if (opts.skipPlayers) highlightSelectedRow();
  else renderPlayers(result);
  renderAdvance(result);
  renderOutputBoard(result);
  renderCards(result);
  renderUsagePreview(result);
  renderDeckDist();
  renderPlayerDetail(result);
  renderDeckView();
}

function highlightSelectedRow() {
  document.querySelectorAll("#tourney-players-body tr[data-player-id]").forEach(function (tr) {
    tr.classList.toggle("is-selected", tr.getAttribute("data-player-id") === state.selectedId);
  });
}

function rosterParseOpts() {
  return Object.assign(normalizeRosterIncludeOpts({
    includeUnpaid: state.settings.rosterIncludeUnpaid === true,
    includeEntered: state.settings.rosterIncludeEntered !== false,
  }), {
    columnMap: state.columnMap || {},
  });
}

function pairChip(on, attr, value, label) {
  return (
    "<button type=\"button\" class=\"btn sm " +
    (on ? "primary" : "secondary") +
    "\" " +
    attr +
    "=\"" +
    value +
    "\" aria-pressed=\"" +
    (on ? "true" : "false") +
    "\">" +
    label +
    "</button>"
  );
}

function renderRosterFlags() {
  const host = document.getElementById("tourney-roster-flags");
  if (!host) return;
  const unpaid = state.settings.rosterIncludeUnpaid === true;
  const entered = state.settings.rosterIncludeEntered !== false;
  host.innerHTML =
    "<div class=\"tourney-range-row\"><span class=\"tourney-range-label\">未払い</span><div class=\"tourney-range-chips\">" +
    pairChip(unpaid, "data-roster-unpaid", "1", "反映する") +
    pairChip(!unpaid, "data-roster-unpaid", "0", "しない") +
    "</div></div>" +
    "<div class=\"tourney-range-row\"><span class=\"tourney-range-label\">エントリー済み</span><div class=\"tourney-range-chips\">" +
    pairChip(entered, "data-roster-entered", "1", "反映する") +
    pairChip(!entered, "data-roster-entered", "0", "しない") +
    "</div></div>" +
    "<p class=\"hint tourney-range-now\">選手CSVを取り込むときに効きます。キャンセルとキャンセル待ちは常に除外。出場済みは常に入れます。</p>";
}

function renderPoolRange() {
  const host = document.getElementById("tourney-pool-range");
  if (!host) return;
  const min = Math.max(0, Number(state.settings.poolMinWins) || 0);
  const max = state.settings.poolMaxWins;
  const maxN = max == null ? -1 : Number(max);
  function chip(kind, n, label, pressed) {
    return (
      "<button type=\"button\" class=\"btn sm " +
      (pressed ? "primary" : "secondary") +
      "\" data-pool-" +
      kind +
      "=\"" +
      n +
      "\" aria-pressed=\"" +
      (pressed ? "true" : "false") +
      "\">" +
      label +
      "</button>"
    );
  }
  const presets = [
    { id: "2plus", label: "2勝以上", min: 2, max: null },
    { id: "0-4", label: "0〜4勝", min: 0, max: 4 },
    { id: "2-4", label: "2〜4勝", min: 2, max: 4 },
    { id: "0plus", label: "全員", min: 0, max: null },
  ];
  const presetBtns = presets
    .map(function (p) {
      const on = min === p.min && ((p.max == null && max == null) || p.max === maxN);
      return (
        "<button type=\"button\" class=\"btn sm " +
        (on ? "primary" : "secondary") +
        "\" data-pool-preset=\"" +
        p.id +
        "\">" +
        p.label +
        "</button>"
      );
    })
    .join("");
  let minChips = "";
  let maxChips = "";
  for (let i = 0; i <= 4; i++) {
    minChips += chip("min", i, i + "勝", min === i);
    maxChips += chip("max", i, i + "勝", max != null && maxN === i);
  }
  maxChips += chip("max", -1, "以上", max == null);
  host.innerHTML =
    "<div class=\"tourney-range-row\"><span class=\"tourney-range-label\">すぐ選ぶ</span><div class=\"tourney-range-chips\">" +
    presetBtns +
    "</div></div>" +
    "<div class=\"tourney-range-row\"><span class=\"tourney-range-label\">下限</span><div class=\"tourney-range-chips\">" +
    minChips +
    "</div></div>" +
    "<div class=\"tourney-range-row\"><span class=\"tourney-range-label\">上限</span><div class=\"tourney-range-chips\">" +
    maxChips +
    "</div></div>" +
    "<p class=\"hint tourney-range-now\">いまの集計: " +
    escapeHtml(poolRangeLabel(min, max)) +
    "（カードポイントの母数。1敗選抜の候補は勝数に関係なく全1敗です）</p>";
}

function renderSummary(result) {
  const el = document.getElementById("tourney-summary");
  if (!el) return;
  const recipeOk = state.players.filter(function (p) {
    return deckMapTotal(p.deckMap) > 0;
  }).length;
  const tonamelId = parseTonamelCompetitionId(state.settings.tonamelUrl);
  el.innerHTML =
    "<div class=\"tourney-stat\"><span>選手</span><strong>" +
    state.players.length +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>レシピ</span><strong>" +
    recipeOk +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>集計対象</span><strong>" +
    result.poolCount +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>集計範囲</span><strong>" +
    escapeHtml(poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins)) +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>全勝</span><strong>" +
    result.undefeated.length +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>1敗</span><strong>" +
    result.oneLoss.length +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>決勝枠</span><strong>" +
    result.finalsSlots +
    "</strong></div>" +
    (tonamelId
      ? "<div class=\"tourney-stat tourney-stat--link\"><span>となめる</span><a href=\"" +
        escapeHtml(state.settings.tonamelUrl) +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
        escapeHtml(tonamelId) +
        "</a></div>"
      : "");
}

function renderPlayers(result) {
  const tb = document.getElementById("tourney-players-body");
  if (!tb) return;
  if (!state.players.length) {
    tb.innerHTML =
      "<tr><td colspan=\"9\" class=\"muted tourney-empty-row\">選手がいません。上の枠に貼るか「選手を追加」から入れてください。</td></tr>";
    return;
  }
  const filterPool = state.settings.filterListByPool === true;
  const q = nameMatchKey(state.playerQuery || "");
  let rows = state.players.filter(function (p) {
    if (q && nameMatchKey(p.name).indexOf(q) < 0) return false;
    if (!filterPool) return true;
    if (isUndefeatedAdvance(p) || isUsageRateCandidate(p)) return true;
    return isWinsInPool(p.wins, state.settings.poolMinWins, state.settings.poolMaxWins);
  });
  const sort = state.playerSort || "default";
  if (sort === "missing") {
    rows = rows.slice().sort(function (a, b) {
      const am = deckMapTotal(a.deckMap) ? 1 : 0;
      const bm = deckMapTotal(b.deckMap) ? 1 : 0;
      if (am !== bm) return am - bm;
      return nameMatchKey(a.name).localeCompare(nameMatchKey(b.name));
    });
  } else if (sort === "points") {
    rows = rows.slice().sort(function (a, b) {
      const sa = result.players.find(function (x) {
        return x.id === a.id;
      });
      const sb = result.players.find(function (x) {
        return x.id === b.id;
      });
      const pa = sa && sa.hasRecipe ? sa.rankPoints : Number.POSITIVE_INFINITY;
      const pb = sb && sb.hasRecipe ? sb.rankPoints : Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return (b.wins || 0) - (a.wins || 0);
    });
  } else if (sort === "wins") {
    rows = rows.slice().sort(function (a, b) {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
  }
  if (!rows.length) {
    tb.innerHTML =
      "<tr><td colspan=\"9\" class=\"muted tourney-empty-row\">この条件の選手はいません。検索や絞り込みを外してください。</td></tr>";
    return;
  }
  const clusterById = {};
  currentDeckDist().clusters.forEach(function (c) {
    const label = clusterLabel(c);
    (c.playerIds || []).forEach(function (id) {
      clusterById[id] = label;
    });
  });
  tb.innerHTML = rows
    .map(function (p) {
      const adv = advancementLabel(result, p.id);
      const rec = recipeStatus(p);
      const scored = result.players.find(function (x) {
        return x.id === p.id;
      });
      const selected = state.selectedId === p.id ? " is-selected" : "";
      const cluster = clusterById[p.id] || "";
      return (
        "<tr class=\"tourney-player-row" +
        selected +
        "\" data-player-id=\"" +
        escapeHtml(p.id) +
        "\">" +
        "<td><input type=\"text\" class=\"input tourney-inline\" data-field=\"name\" value=\"" +
        escapeHtml(p.name) +
        "\" placeholder=\"名前\" /></td>" +
        "<td><input type=\"number\" min=\"0\" class=\"input tourney-inline tourney-inline--num\" data-field=\"wins\" value=\"" +
        p.wins +
        "\" /></td>" +
        "<td><input type=\"number\" min=\"0\" class=\"input tourney-inline tourney-inline--num\" data-field=\"losses\" value=\"" +
        p.losses +
        "\" /></td>" +
        "<td><input type=\"number\" min=\"0\" class=\"input tourney-inline tourney-inline--num\" data-field=\"draws\" value=\"" +
        (p.draws || 0) +
        "\" /></td>" +
        "<td class=\"tourney-td-check\"><input type=\"checkbox\" data-field=\"dropped\" " +
        (p.dropped ? "checked " : "") +
        "/></td>" +
        "<td><input type=\"text\" class=\"input tourney-inline\" data-field=\"deckCode\" value=\"" +
        escapeHtml(p.deckCode) +
        "\" placeholder=\"DECK LOG\" spellcheck=\"false\" /></td>" +
        "<td><button type=\"button\" class=\"btn sm secondary tourney-recipe-btn\" data-act=\"recipe\" title=\"" +
        escapeHtml(cluster || "デッキ一覧を開く") +
        "\">" +
        rec.text +
        (cluster ? "<span class=\"tourney-dist-mini\">" + escapeHtml(cluster) + "</span>" : "") +
        "</button></td>" +
        "<td class=\"tourney-pts\">" +
        (scored && scored.hasRecipe ? String(scored.points) : "—") +
        "</td>" +
        "<td><span class=\"tourney-adv tourney-adv--" +
        adv.kind +
        "\">" +
        escapeHtml(adv.label) +
        "</span> <button type=\"button\" class=\"btn sm danger tourney-del\" data-act=\"del\" title=\"削除\">×</button></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderAdvance(result) {
  const el = document.getElementById("tourney-advance");
  if (!el) return;
  if (!state.players.length) {
    el.innerHTML = "<p class=\"muted\">選手を入れると進出一覧が出ます。</p>";
    return;
  }
  const lines = [];
  lines.push("<h3>決勝進出</h3>");
  lines.push("<ol class=\"tourney-advance-list\">");
  result.undefeated.forEach(function (p) {
    lines.push(advanceItem(p, "全勝"));
  });
  result.selectedOneLoss.forEach(function (p, i) {
    lines.push(advanceItem(p, "使用率 " + (i + 1) + "位"));
  });
  lines.push("</ol>");
  if (result.lottery.length) {
    const winnerSet = new Set(state.lotteryWinnerIds || []);
    const wonN = result.lottery.filter(function (p) {
      return winnerSet.has(p.id);
    }).length;
    lines.push(
      "<p class=\"tourney-lottery-note\"><strong>当落線上の同点 " +
        result.lottery.length +
        " 名</strong>で残り <strong>" +
        result.lotterySlots +
        " 枠</strong>。" +
        (wonN ? "抽選済み " + wonN + " 名。" : "「抽選を振る」でここに出た人から選びます。") +
        "</p>",
    );
    lines.push("<ul class=\"tourney-advance-list tourney-advance-list--lottery\">");
    result.lottery.forEach(function (p) {
      const won = winnerSet.has(p.id);
      lines.push(
        "<li><button type=\"button\" class=\"tourney-linkish\" data-select=\"" +
          escapeHtml(p.id) +
          "\">" +
          escapeHtml(p.name || "（無名）") +
          "</button>　" +
          p.points +
          "P　" +
          p.wins +
          "勝1敗" +
          (won ? "　<strong>当選</strong>" : "") +
          "</li>",
      );
    });
    lines.push("</ul>");
  }
  const need = result.finalsSlots - result.undefeated.length - result.selectedOneLoss.length;
  if (need > 0 && !result.lottery.length) {
    lines.push("<p class=\"tourney-warn\">進出者が決勝枠に足りません（あと " + need + " 名）。1敗の人数か枠数を確認してください。</p>");
  }
  if (result.undefeated.length >= result.finalsSlots) {
    lines.push("<p class=\"muted\">全勝が決勝枠以上のため、使用率選抜は発生しません。</p>");
  }
  el.innerHTML = lines.join("");
}

function currentAdvancePick() {
  readSettingsFromForm();
  const s = state.settings;
  return pickPrelimAdvancers(state.players, {
    advanceCount: s.advanceCount != null ? s.advanceCount : s.finalsSlots,
    undefeatedCount: s.undefeatedCount,
    poolMinWins: s.poolMinWins,
    poolMaxWins: s.poolMaxWins,
    identityFn: identityFn,
    lotteryWinnerIds: state.lotteryWinnerIds || [],
  });
}

function renderOutputBoard(result) {
  const meta = document.getElementById("tourney-output-meta");
  const list = document.getElementById("tourney-output-names");
  if (!meta && !list) return;
  const undEl = document.getElementById("input-tourney-undefeated-count");
  if (undEl && document.activeElement !== undEl && state.settings.undefeatedCount == null) {
    undEl.value = String(result.undefeated.length);
  }
  const advEl = document.getElementById("input-tourney-advance-count");
  if (advEl && document.activeElement !== advEl && (state.settings.advanceCount == null || String(advEl.value).trim() === "")) {
    advEl.value = String(state.settings.finalsSlots || 8);
  }
  const pick = currentAdvancePick();
  if (meta) {
    const bits = [
      "予選抜け " + pick.advanceCount + " 名",
      "全勝 " + pick.undefeated.length + " 名",
      "使用率選抜 " + pick.usage.length + " 名",
    ];
    if (pick.requestedUndefeated > pick.actualUndefeated) {
      bits.push("（全勝の指定 " + pick.requestedUndefeated + " は実在 " + pick.actualUndefeated + " 名まで）");
    }
    if (pick.lottery && pick.lottery.length) {
      const wonN = (state.lotteryWinnerIds || []).length;
      bits.push(wonN ? "抽選済み " + wonN + " 名" : "抽選待ち " + pick.lottery.length + " 名");
    }
    if (pick.shortfall) bits.push("あと " + pick.shortfall + " 名不足");
    const noRecipe = result.oneLoss.filter(function (p) {
      return !p.hasRecipe;
    }).length;
    if (noRecipe) bits.push("レシピ未入力の1敗 " + noRecipe + " 名は選抜に入れていません");
    meta.textContent = bits.join("　");
  }
  if (list) {
    if (!pick.names.length) {
      list.innerHTML = "<p class=\"muted\">選手と人数を入れると、予選上がりの名前が並びます。</p>";
    } else {
      list.innerHTML = pick.names
        .map(function (p) {
          return "<span class=\"tourney-output-name\">" + escapeHtml(p.name || "（無名）") + "</span>";
        })
        .join("");
    }
  }
}

function fillCountsFromCompute() {
  const result = compute();
  state.settings.advanceCount = state.settings.finalsSlots;
  state.settings.undefeatedCount = result.undefeated.length;
  setVal("input-tourney-advance-count", state.settings.advanceCount);
  setVal("input-tourney-undefeated-count", state.settings.undefeatedCount);
  persistAndRender();
  showToast("計算上の予選抜け・全勝数を入れました");
}

function autoFillOutputCountsSilent() {
  const result = compute();
  if (state.settings.advanceCount == null) state.settings.advanceCount = state.settings.finalsSlots;
  state.settings.undefeatedCount = result.undefeated.length;
}

function openAdvanceBoard() {
  const board = document.getElementById("tourney-board");
  if (!board) {
    showToast("発表ボードを読み込めません");
    return;
  }
  readSettingsFromForm();
  persist();
  closeUsageBoard();
  closeDistChartBoard();
  const pick = currentAdvancePick();
  const eventEl = document.getElementById("tourney-board-event");
  const headEl = document.getElementById("tourney-board-headline");
  const namesEl = document.getElementById("tourney-board-names");
  if (eventEl) eventEl.textContent = state.settings.title || "";
  if (headEl) headEl.textContent = state.settings.boardHeadline || "決勝ラウンド進出者";
  if (namesEl) {
    namesEl.innerHTML = pick.names
      .map(function (p) {
        return "<span>" + escapeHtml(p.name || "（無名）") + "</span>";
      })
      .join("");
  }
  board.hidden = false;
  document.body.classList.add("tourney-board-open");
  const closeBtn = document.getElementById("btn-tourney-board-close");
  if (closeBtn) closeBtn.focus();
}

function closeAdvanceBoard() {
  const board = document.getElementById("tourney-board");
  if (board) board.hidden = true;
  const usage = document.getElementById("tourney-usage-board");
  const dist = document.getElementById("tourney-dist-board");
  if ((!usage || usage.hidden) && (!dist || dist.hidden)) document.body.classList.remove("tourney-board-open");
  if (document.fullscreenElement && board && document.fullscreenElement === board) {
    document.exitFullscreen().catch(function () {});
  }
}

function toggleAdvanceBoardFullscreen() {
  const board = document.getElementById("tourney-board");
  if (!board) return;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function () {});
    return;
  }
  if (board.requestFullscreen) board.requestFullscreen().catch(function () {});
}

function advanceItem(p, kind) {
  return (
    "<li><span class=\"tourney-adv-kind\">" +
    escapeHtml(kind) +
    "</span> <button type=\"button\" class=\"tourney-linkish\" data-select=\"" +
    escapeHtml(p.id) +
    "\">" +
    escapeHtml(p.name || "（無名）") +
    "</button>　" +
    p.wins +
    "勝" +
    p.losses +
    "敗　" +
    p.points +
    "P</li>"
  );
}

function renderCards(result) {
  const hint = document.getElementById("tourney-cards-hint");
  if (hint) {
    hint.textContent =
      poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins) +
      "のメインデッキを合算。レア違いは同一カード。1枚あたりのポイント＝この列。";
  }
  const host = document.getElementById("tourney-card-kind");
  if (host) {
    const kinds = [
      { id: "all", label: "全部" },
      { id: "member", label: "メンバー" },
      { id: "live", label: "ライブ" },
    ];
    host.innerHTML = kinds
      .map(function (k) {
        const on = (state.cardKindFilter || "all") === k.id;
        return (
          "<button type=\"button\" class=\"btn sm " +
          (on ? "primary" : "secondary") +
          "\" data-card-kind=\"" +
          k.id +
          "\">" +
          k.label +
          "</button>"
        );
      })
      .join("");
  }
  const el = document.getElementById("tourney-cards-body");
  if (!el) return;
  const kind = state.cardKindFilter || "all";
  const rows = result.cardTable.filter(function (row) {
    if (kind === "all") return true;
    const card = getCard(row.cardNo);
    if (kind === "member") return !!(card && card.type === T_MEMBER);
    if (kind === "live") return !!(card && card.type === T_LIVE);
    return true;
  });
  if (!rows.length) {
    el.innerHTML =
      "<tr><td colspan=\"3\" class=\"muted\">" +
      escapeHtml(poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins)) +
      "のレシピが集まると、カードごとのポイントが出ます。</td></tr>";
    return;
  }
  el.innerHTML = rows
    .slice(0, 80)
    .map(function (row, i) {
      return (
        "<tr><td>" +
        (i + 1) +
        "</td><td>" +
        escapeHtml(cardLabel(row.cardNo)) +
        "</td><td class=\"tourney-pts\">" +
        row.pointsPerCopy +
        "</td></tr>"
      );
    })
    .join("");
}

function cardKindFilterLabel() {
  const kind = state.cardKindFilter || "all";
  if (kind === "member") return "メンバー";
  if (kind === "live") return "ライブ";
  return "全部";
}

function usageRankLimit() {
  return Number(state.settings.usageRankCount) === 80 ? 80 : 50;
}

function usageHeadlineForCount(n) {
  return "使用率ポイント 1〜" + n + "位";
}

function usageArtLimit() {
  return usageRankLimit();
}

function renderUsageCountButtons() {
  const host = document.getElementById("tourney-usage-count");
  if (!host) return;
  const n = usageRankLimit();
  host.innerHTML = [50, 80]
    .map(function (count) {
      return (
        "<button type=\"button\" class=\"btn sm " +
        (n === count ? "primary" : "secondary") +
        "\" data-usage-count=\"" +
        count +
        "\">" +
        count +
        "位まで</button>"
      );
    })
    .join("");
}

function setUsageRankCount(raw) {
  readSettingsFromForm();
  const n = Number(raw) === 80 ? 80 : 50;
  state.settings.usageRankCount = n;
  state.settings.usageBoardHeadline = usageHeadlineForCount(n);
  persistAndRender();
}

function catalogTypeNo(cardNo) {
  const id = catalogCardIdentityKey(cardNo) || String(cardNo || "");
  return String(id).replace(
    /-(R＋|R\+|P＋|P\+|L＋|L\+|PE＋|PE\+|PR＋|PR\+|SEC＋|SEC\+|SECL|SECE|SEC|SRE|LLE|SR|SD|PR|PE|RM|AR|RE|SP|N|L|R|P|C)$/i,
    "",
  );
}

function usageDisplayCard(cardNo) {
  const id = catalogCardIdentityKey(cardNo) || String(cardNo || "");
  let card = getCard(id) || getCard(cardNo);
  if (card && card.img) return card;
  const rl = card && Array.isArray(card.rare_list) ? card.rare_list : [];
  for (let i = 0; i < rl.length; i++) {
    const next = getCard(rl[i] && rl[i].card_no);
    if (next && next.img) return next;
  }
  return card || null;
}

function usageRankRows(result) {
  const kind = state.cardKindFilter || "all";
  const rows = ((result && result.cardTable) || []).filter(function (row) {
    if (kind === "all") return true;
    const card = getCard(row.cardNo) || getCard(row.identity);
    if (kind === "member") return !!(card && card.type === T_MEMBER);
    if (kind === "live") return !!(card && card.type === T_LIVE);
    return true;
  });
  return rows.slice(0, usageRankLimit()).map(function (row, i) {
    const srcNo = row.identity || row.cardNo;
    const card = usageDisplayCard(srcNo);
    const typeNo = catalogTypeNo(srcNo);
    const charName = card && card.name ? String(card.name) : cardLabel(srcNo);
    return {
      rank: i + 1,
      withArt: i < usageArtLimit(),
      cardNo: card && card.card_no ? card.card_no : srcNo,
      typeNo: typeNo,
      charName: charName,
      points: row.pointsPerCopy,
      kindLabel: cardTypeLabel(card),
      card: card,
      label: charName + "（" + typeNo + "）",
    };
  });
}

function deckCardTypeFn(cardNo) {
  const card = getCard(cardNo) || usageDisplayCard(cardNo);
  if (card && card.type === T_LIVE) return "live";
  if (card && card.type === T_MEMBER) return "member";
  if (card && card.type === T_ENERGY) return "other";
  return "";
}

function currentDeckDist() {
  return applyClusterAssigns(
    clusterSimilarDecks(state.players, {
      identityFn: identityFn,
      typeFn: deckCardTypeFn,
      minCards: 50,
    }),
  );
}

const DIST_OTHER_KEY = "__other__";
const DIST_BAR_COLORS = ["#c43a78", "#6d4cff", "#d9773a", "#2a9d8f", "#c9a227", "#3d5a80", "#9b5de5", "#118ab2", "#e63946", "#457b9d"];
let distPaintToken = 0;

function deckDistRuleText() {
  return "レア違いは同一。差は35枚まで。メンバー半数以上、またはライブがある程度重なると同一系統。系統は手動で移動できます";
}

function clusterNamesMap() {
  if (!state.clusterNames || typeof state.clusterNames !== "object") state.clusterNames = {};
  return state.clusterNames;
}

function clusterThumbsMap() {
  if (!state.clusterThumbs || typeof state.clusterThumbs !== "object") state.clusterThumbs = {};
  return state.clusterThumbs;
}

function clusterThumbPosMap() {
  if (!state.clusterThumbPos || typeof state.clusterThumbPos !== "object") state.clusterThumbPos = {};
  return state.clusterThumbPos;
}

function clusterAssignMap() {
  if (!state.clusterAssign || typeof state.clusterAssign !== "object") state.clusterAssign = {};
  return state.clusterAssign;
}

function isManualClusterKey(key) {
  return String(key || "").indexOf("m_") === 0;
}

function isKeptCluster(c) {
  return !!(c && ((c.size || 0) >= 2 || isManualClusterKey(c.key)));
}

function playerIdentityMap(playerId) {
  const p = state.players.find(function (x) {
    return x.id === playerId;
  });
  return collapseDeckMapByIdentity(p && p.deckMap, identityFn);
}

function clusterSignatureFromPlayers(players) {
  /** @type {Record<string, number>} */
  const acc = {};
  (players || []).forEach(function (p) {
    Object.entries(playerIdentityMap(p.id) || {}).forEach(function (ent) {
      acc[ent[0]] = (acc[ent[0]] || 0) + (Number(ent[1]) || 0);
    });
  });
  const n = Math.max(1, (players || []).length);
  return Object.keys(acc)
    .map(function (id) {
      return { id: id, avg: acc[id] / n };
    })
    .sort(function (a, b) {
      return b.avg - a.avg;
    })
    .slice(0, 8);
}

function rebuildClusterStats(c) {
  const seed = c.seedMap && Object.keys(c.seedMap).length ? c.seedMap : playerIdentityMap((c.players[0] && c.players[0].id) || "");
  c.seedMap = seed;
  (c.players || []).forEach(function (p) {
    p.diff = Math.round(deckHalfL1(seed, playerIdentityMap(p.id)));
  });
  c.players.sort(function (a, b) {
    if ((a.diff || 0) !== (b.diff || 0)) return (a.diff || 0) - (b.diff || 0);
    return String(a.name || "").localeCompare(String(b.name || ""), "ja");
  });
  c.exactSize = (c.players || []).filter(function (p) {
    return !p.diff;
  }).length;
  c.size = (c.players || []).length;
  c.nearSize = c.size - c.exactSize;
  c.playerIds = (c.players || []).map(function (p) {
    return p.id;
  });
  c.signature = clusterSignatureFromPlayers(c.players);
}

function emptyAssignCluster(key, seedMap) {
  return {
    key: key,
    size: 0,
    exactSize: 0,
    nearSize: 0,
    playerIds: [],
    players: [],
    seedMap: seedMap || {},
    signature: [],
  };
}

function applyClusterAssigns(dist) {
  const assigns = clusterAssignMap();
  const clusters = (dist.clusters || []).map(function (c) {
    return Object.assign({}, c, {
      players: (c.players || []).map(function (p) {
        return Object.assign({}, p);
      }),
      playerIds: (c.playerIds || []).slice(),
    });
  });
  const locById = Object.create(null);
  clusters.forEach(function (c) {
    (c.players || []).forEach(function (p) {
      locById[p.id] = { cluster: c, player: p };
    });
  });
  Object.keys(assigns).forEach(function (pid) {
    const destRaw = String(assigns[pid] || "");
    if (!destRaw) return;
    const loc = locById[pid];
    if (!loc) return;
    const dest = destRaw === DIST_OTHER_KEY ? "s_" + pid : destRaw;
    if (dest === loc.cluster.key) return;
    loc.cluster.players = loc.cluster.players.filter(function (p) {
      return p.id !== pid;
    });
    loc.cluster.playerIds = loc.cluster.playerIds.filter(function (id) {
      return id !== pid;
    });
    let to = clusters.find(function (c) {
      return c.key === dest;
    });
    if (!to) {
      to = emptyAssignCluster(dest, playerIdentityMap(pid));
      clusters.push(to);
    }
    if (!to.seedMap || !Object.keys(to.seedMap).length) to.seedMap = playerIdentityMap(pid);
    const moved = { id: pid, name: loc.player.name, diff: 0 };
    to.players.push(moved);
    to.playerIds.push(pid);
    locById[pid] = { cluster: to, player: moved };
  });
  const kept = clusters.filter(function (c) {
    return (c.players || []).length > 0;
  });
  kept.forEach(rebuildClusterStats);
  return Object.assign({}, dist, { clusters: kept });
}

function newManualClusterKey() {
  return "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 5);
}

function setClusterAssign(playerId, dest) {
  if (!playerId) return;
  pushUndo();
  const map = clusterAssignMap();
  const v = String(dest || "");
  if (!v) delete map[playerId];
  else if (v === "__new__") map[playerId] = newManualClusterKey();
  else map[playerId] = v;
  persistAndRender();
}

function clusterAssignOptionsHtml(playerId, dist) {
  const assigned = String(clusterAssignMap()[playerId] || "");
  const parts = ["<option value=\"\"" + (assigned ? "" : " selected") + ">自動</option>"];
  (dist.clusters || []).filter(isKeptCluster).forEach(function (c) {
    const sel = assigned === c.key ? " selected" : "";
    parts.push("<option value=\"" + escapeHtml(c.key) + "\"" + sel + ">" + escapeHtml(clusterDisplayName(c)) + "</option>");
  });
  parts.push(
    "<option value=\"" +
      DIST_OTHER_KEY +
      "\"" +
      (assigned === DIST_OTHER_KEY ? " selected" : "") +
      ">その他</option>",
  );
  parts.push("<option value=\"__new__\">新しい系統</option>");
  return parts.join("");
}

function distPersonHtml(p, dist, extra) {
  const assigned = String(clusterAssignMap()[p.id] || "");
  const off = p.diff ? "（" + p.diff + "枚差）" : "";
  const extraTxt = extra ? "　" + extra : "";
  return (
    "<span class=\"tourney-dist-person\">" +
    "<button type=\"button\" class=\"tourney-dist-player\" data-select=\"" +
    escapeHtml(p.id) +
    "\">" +
    escapeHtml(p.name || "（無名）") +
    extraTxt +
    off +
    (assigned ? "<span class=\"tourney-dist-moved\">手動</span>" : "") +
    "</button>" +
    "<select class=\"tourney-dist-assign\" data-cluster-assign=\"" +
    escapeHtml(p.id) +
    "\" title=\"系統を移動\" aria-label=\"" +
    escapeHtml((p.name || "選手") + "の系統") +
    "\">" +
    clusterAssignOptionsHtml(p.id, dist) +
    "</select></span>"
  );
}

function defaultThumbPos() {
  return { x: 0.5, y: 0.38, z: 1.25 };
}

function normalizeThumbPos(raw) {
  const d = defaultThumbPos();
  const o = raw && typeof raw === "object" ? raw : {};
  const x = Number(o.x);
  const y = Number(o.y);
  const z = Number(o.z);
  return {
    x: Math.max(0.08, Math.min(0.92, Number.isFinite(x) ? x : d.x)),
    y: Math.max(0.08, Math.min(0.92, Number.isFinite(y) ? y : d.y)),
    z: Math.max(0.7, Math.min(2.8, Number.isFinite(z) ? z : d.z)),
  };
}

function clusterThumbPos(key) {
  return normalizeThumbPos(clusterThumbPosMap()[key]);
}

function distSortMode() {
  return state.distSort === "found" ? "found" : "size";
}

function cardIdentityId(cardOrNo) {
  if (!cardOrNo) return "";
  if (typeof cardOrNo === "string") return catalogCardIdentityKey(cardOrNo) || String(cardOrNo);
  const no = cardOrNo.card_no || cardOrNo.id || "";
  return catalogCardIdentityKey(no) || String(no || "");
}

function clusterLabel(cluster) {
  if (cluster && cluster.key === DIST_OTHER_KEY) return "その他";
  const named = ((cluster && cluster.signature) || []).map(function (s) {
    const card = usageDisplayCard(s.id) || getCard(s.id);
    return {
      avg: s.avg,
      name: card && card.name ? String(card.name) : String(s.id || ""),
      type: card && card.type,
    };
  });
  const parts = [];
  named.forEach(function (c) {
    if (c.type !== T_MEMBER || c.avg < 2.5 || parts.length >= 2) return;
    if (parts.indexOf(c.name) < 0) parts.push(c.name);
  });
  named.forEach(function (c) {
    if (c.type !== T_LIVE || c.avg < 2 || parts.length >= 3) return;
    if (parts.indexOf(c.name) < 0) parts.push(c.name);
  });
  named.forEach(function (c) {
    if (parts.length >= 3) return;
    if (parts.indexOf(c.name) < 0) parts.push(c.name);
  });
  const base = parts.filter(Boolean).join(" / ") || "系統不明";
  return cluster && cluster.size >= 2 ? base + " 系" : base;
}

function clusterDisplayName(cluster) {
  const key = cluster && cluster.key ? String(cluster.key) : "";
  const custom = String(clusterNamesMap()[key] || "").trim();
  if (custom) return custom;
  return clusterLabel(cluster);
}

function mergeClusterSignatures(clusters) {
  /** @type {Record<string, number>} */
  const acc = {};
  (clusters || []).forEach(function (c) {
    ((c && c.signature) || []).forEach(function (s) {
      const id = String((s && s.id) || "");
      if (!id) return;
      acc[id] = (acc[id] || 0) + (Number(s.avg) || 0);
    });
  });
  return Object.keys(acc)
    .map(function (id) {
      return { id: id, avg: acc[id] };
    })
    .sort(function (a, b) {
      return b.avg - a.avg;
    })
    .slice(0, 8);
}

function defaultClusterThumb(cluster) {
  let fallback = null;
  for (let i = 0; i < ((cluster && cluster.signature) || []).length; i++) {
    const s = cluster.signature[i];
    const card = usageDisplayCard(s.id) || getCard(s.id);
    if (!card) continue;
    if (!fallback) fallback = card;
    if (card.type === T_MEMBER) return card;
  }
  return fallback;
}

function clusterThumbCard(key, cluster) {
  const stored = String(clusterThumbsMap()[key] || "");
  if (stored === "__none__") return null;
  if (stored) return usageDisplayCard(stored) || getCard(stored) || null;
  if (key === DIST_OTHER_KEY) return null;
  return defaultClusterThumb(cluster);
}

function clusterThumbSelectedId(key, cluster) {
  const stored = String(clusterThumbsMap()[key] || "");
  if (stored === "__none__") return "";
  if (stored) return stored;
  if (key === DIST_OTHER_KEY) return "";
  return cardIdentityId(defaultClusterThumb(cluster));
}

function clusterThumbCandidates(cluster) {
  const seen = Object.create(null);
  const out = [];
  ((cluster && cluster.signature) || []).forEach(function (s) {
    const card = usageDisplayCard(s.id) || getCard(s.id);
    if (!card) return;
    const id = cardIdentityId(card) || String(s.id || "");
    if (!id || seen[id]) return;
    seen[id] = 1;
    out.push(card);
  });
  return out.slice(0, 8);
}

function sortDistClusters(clusters) {
  const list = (clusters || []).slice();
  if (distSortMode() !== "size") return list;
  return list.sort(function (a, b) {
    if ((b.size || 0) !== (a.size || 0)) return (b.size || 0) - (a.size || 0);
    return clusterDisplayName(a).localeCompare(clusterDisplayName(b), "ja");
  });
}

function distListEntries(dist) {
  const grouped = (dist.clusters || []).filter(isKeptCluster);
  const singles = (dist.clusters || []).filter(function (c) {
    return !isKeptCluster(c);
  });
  const entries = sortDistClusters(grouped).map(function (c) {
    return { kind: "cluster", size: c.size, cluster: c };
  });
  if (singles.length) {
    entries.push({
      kind: "other",
      size: singles.length,
      singles: singles,
      cluster: {
        key: DIST_OTHER_KEY,
        size: singles.length,
        signature: mergeClusterSignatures(singles),
      },
    });
  }
  return entries;
}

function distChartRows(dist) {
  return distListEntries(dist).map(function (ent) {
    const c = ent.cluster;
    return {
      key: c.key,
      name: clusterDisplayName(c),
      size: ent.size,
      card: clusterThumbCard(c.key, c),
      pos: clusterThumbPos(c.key),
    };
  });
}

function setClusterName(key, value) {
  if (!key) return;
  const names = clusterNamesMap();
  const next = String(value || "").trim();
  if (next) names[key] = next;
  else delete names[key];
  persist();
}

function setClusterThumb(key, cardId) {
  if (!key) return;
  const thumbs = clusterThumbsMap();
  const next = String(cardId || "").trim();
  const prev = String(thumbs[key] || "");
  if (!next || next === "__auto__") delete thumbs[key];
  else thumbs[key] = next;
  if (prev !== next) delete clusterThumbPosMap()[key];
  persist();
  document.querySelectorAll('.tourney-dist-art[data-cluster-key="' + key.replace(/"/g, "") + '"] .tourney-dist-thumb').forEach(function (btn) {
    const stored = String(thumbs[key] || "");
    const on = stored ? (btn.getAttribute("data-thumb-id") || "") === stored : btn.getAttribute("data-thumb-auto") === "1";
    btn.classList.toggle("is-on", on);
  });
  paintClusterPanPreview(key);
  refreshDistCharts();
}

let panPersistTimer = 0;
let panChartTimer = 0;

function setClusterThumbPos(key, pos, opts) {
  if (!key) return;
  opts = opts || {};
  clusterThumbPosMap()[key] = normalizeThumbPos(pos);
  paintClusterPanPreview(key);
  if (opts.persist === false) {
    clearTimeout(panPersistTimer);
    panPersistTimer = setTimeout(persist, 280);
  } else {
    persist();
  }
  if (opts.chart === false) {
    if (!panChartTimer) {
      panChartTimer = setTimeout(function () {
        panChartTimer = 0;
        refreshDistCharts();
      }, 70);
    }
  } else {
    refreshDistCharts();
  }
}

function setDistSort(mode) {
  state.distSort = mode === "found" ? "found" : "size";
  persistAndRender();
}

function renderDistSortButtons() {
  const host = document.getElementById("tourney-dist-sort");
  if (!host) return;
  const kinds = [
    { id: "size", label: "多い順" },
    { id: "found", label: "検出順" },
  ];
  const cur = distSortMode();
  host.innerHTML = kinds
    .map(function (k) {
      return (
        "<button type=\"button\" class=\"btn sm " +
        (cur === k.id ? "primary" : "secondary") +
        "\" data-dist-sort=\"" +
        k.id +
        "\">" +
        k.label +
        "</button>"
      );
    })
    .join("");
}

function renderDeckDist() {
  const host = document.getElementById("tourney-deck-dist");
  const meta = document.getElementById("tourney-deck-dist-meta");
  if (!host) return;
  const dist = currentDeckDist();
  if (meta) {
    if (!dist.withRecipe) {
      meta.textContent = "レシピが入ると、近いデッキを系統にまとめます。";
    } else {
      const groupedN = dist.clusters.filter(isKeptCluster).length;
      const singleN = dist.clusters.filter(function (c) {
        return !isKeptCluster(c);
      }).length;
      meta.textContent =
        "レシピ " + dist.withRecipe + " / 近い系統 " + groupedN + " / 独自 " + singleN + "（" + deckDistRuleText() + "）";
    }
  }
  renderDistSortButtons();
  renderDistChartKindButtons();
  if (!dist.withRecipe) {
    host.innerHTML = "<p class=\"muted\">選手のデッキを入れると、ここに分布が出ます。</p>";
    drawDistChartPreview([]);
    renderDistIconPanels(dist);
    return;
  }
  const entries = distListEntries(dist);
  host.innerHTML = entries
    .map(function (ent, i) {
      if (ent.kind === "other") return distOtherHtml(ent.singles, ent.cluster, i < 6, dist);
      return distClusterHtml(ent.cluster, i < 6, dist);
    })
    .join("");
  drawDistChartPreview(distChartRows(dist));
  renderDistIconPanels(dist);
  paintAllClusterPanPreviews();
}

function distThumbPickerHtml(cluster) {
  const key = cluster && cluster.key ? String(cluster.key) : "";
  const selected = clusterThumbSelectedId(key, cluster);
  const autoId = cardIdentityId(defaultClusterThumb(cluster));
  const cards = clusterThumbCandidates(cluster);
  if (!cards.length) return "";
  const btns = cards
    .map(function (card) {
      const id = cardIdentityId(card);
      const on = id === selected;
      const auto = id && id === autoId && key !== DIST_OTHER_KEY;
      return (
        "<button type=\"button\" class=\"tourney-dist-thumb" +
        (on ? " is-on" : "") +
        "\" data-thumb-id=\"" +
        escapeHtml(id) +
        "\"" +
        (auto ? " data-thumb-auto=\"1\"" : "") +
        " title=\"" +
        escapeHtml((card.name || "") + "をグラフに使う") +
        "\">" +
        cardThumbHtml(card, { hi: true }) +
        "</button>"
      );
    })
    .join("");
  return (
    "<div class=\"tourney-dist-art\" data-cluster-key=\"" +
    escapeHtml(key) +
    "\"><div class=\"tourney-dist-thumbs\" role=\"group\" aria-label=\"グラフ用カード\"><span class=\"tourney-dist-thumbs-label\">グラフのカード</span>" +
    btns +
    "</div><div class=\"tourney-dist-pan\"><canvas class=\"tourney-dist-pan-canvas\" width=\"176\" height=\"176\" data-pan-key=\"" +
    escapeHtml(key) +
    "\" title=\"ドラッグで顔の位置\"></canvas><div class=\"tourney-dist-pan-tools\"><button type=\"button\" class=\"btn sm secondary\" data-pan-zoom=\"out\" title=\"縮小\">−</button><button type=\"button\" class=\"btn sm secondary\" data-pan-zoom=\"in\" title=\"拡大\">+</button><button type=\"button\" class=\"btn sm secondary\" data-pan-zoom=\"reset\">リセット</button><span class=\"tourney-dist-pan-hint\">ドラッグで顔の位置</span></div></div></div>"
  );
}

function distIconAdjustHtml(cluster) {
  const key = cluster && cluster.key ? String(cluster.key) : "";
  const name = clusterDisplayName(cluster);
  const picker = distThumbPickerHtml(cluster);
  return (
    "<div class=\"tourney-dist-icon-row\">" +
    "<p class=\"tourney-dist-icon-name\">" +
    escapeHtml((cluster && cluster.size ? cluster.size + "人　" : "") + name) +
    "</p>" +
    (picker || "<p class=\"muted\">カードなし</p>") +
    "</div>"
  );
}

function renderDistIconPanels(dist) {
  const html =
    dist && dist.withRecipe
      ? distListEntries(dist)
          .map(function (ent) {
            return distIconAdjustHtml(ent.cluster);
          })
          .join("")
      : "<p class=\"muted\">レシピが入ると、ここでカード位置を合わせられます。</p>";
  ["tourney-dist-icons", "tourney-dist-board-icons"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

function distClusterHtml(c, open, dist) {
  const label = clusterDisplayName(c);
  const auto = clusterLabel(c);
  const sub = "完全一致 " + c.exactSize + " 人" + (c.nearSize ? " · 近い " + c.nearSize + " 人" : "");
  const people = (c.players || [])
    .map(function (p) {
      return distPersonHtml(p, dist);
    })
    .join("");
  return (
    "<details class=\"tourney-dist-cluster\"" +
    (open ? " open" : "") +
    "><summary><span class=\"tourney-dist-count\">" +
    c.size +
    "人</span><span class=\"tourney-dist-label\">" +
    escapeHtml(label) +
    "</span><span class=\"tourney-dist-sub\">" +
    escapeHtml(sub) +
    "</span></summary><label class=\"tourney-dist-name-field\"><span>デッキ名</span><input type=\"text\" class=\"input tourney-dist-name\" data-cluster-key=\"" +
    escapeHtml(c.key || "") +
    "\" maxlength=\"40\" value=\"" +
    escapeHtml(label) +
    "\" placeholder=\"" +
    escapeHtml(auto) +
    "\" /></label>" +
    distThumbPickerHtml(c) +
    "<div class=\"tourney-dist-people\">" +
    people +
    "</div></details>"
  );
}

function distOtherHtml(singles, cluster, open, dist) {
  const people = (singles || [])
    .map(function (c) {
      const p = (c.players || [])[0] || { id: "", name: "" };
      return distPersonHtml(p, dist, clusterLabel(c));
    })
    .join("");
  const otherName = clusterDisplayName(cluster);
  return (
    "<details class=\"tourney-dist-cluster\"" +
    (open ? " open" : "") +
    "><summary><span class=\"tourney-dist-count\">" +
    (cluster.size || singles.length) +
    "人</span><span class=\"tourney-dist-label\">" +
    escapeHtml(otherName) +
    "</span><span class=\"tourney-dist-sub\">近い相手なし</span></summary><label class=\"tourney-dist-name-field\"><span>デッキ名</span><input type=\"text\" class=\"input tourney-dist-name\" data-cluster-key=\"" +
    DIST_OTHER_KEY +
    "\" maxlength=\"40\" value=\"" +
    escapeHtml(otherName) +
    "\" placeholder=\"その他\" /></label>" +
    distThumbPickerHtml(cluster) +
    "<div class=\"tourney-dist-people\">" +
    people +
    "</div></details>"
  );
}

function copyDeckDist() {
  const dist = currentDeckDist();
  if (!dist.withRecipe) {
    showToast("まとめるデッキがありません。レシピを入れてください");
    return;
  }
  const lines = [];
  if (state.settings.title) lines.push(state.settings.title);
  const rows = distChartRows(dist);
  lines.push("デッキ分布　レシピ " + dist.withRecipe);
  lines.push(deckDistRuleText() + "。");
  lines.push("");
  rows.forEach(function (row) {
    const pct = dist.withRecipe ? Math.round((row.size / dist.withRecipe) * 1000) / 10 : 0;
    lines.push(row.size + "人（" + pct + "%）　" + row.name);
  });
  const text = lines.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () {
        showToast("デッキ分布をコピーしました");
      },
      function () {
        fallbackCopy(text);
      },
    );
  } else {
    fallbackCopy(text);
  }
}

function distChartKind() {
  return state.distChartKind === "pie" ? "pie" : "bar";
}

function setDistChartKind(kind) {
  state.distChartKind = kind === "pie" ? "pie" : "bar";
  persist();
  renderDistChartKindButtons();
  refreshDistCharts();
}

function renderDistChartKindButtons() {
  const host = document.getElementById("tourney-dist-chart-kind");
  if (!host) return;
  const kinds = [
    { id: "bar", label: "棒グラフ" },
    { id: "pie", label: "円グラフ" },
  ];
  const cur = distChartKind();
  host.innerHTML = kinds
    .map(function (k) {
      return (
        "<button type=\"button\" class=\"btn sm " +
        (cur === k.id ? "primary" : "secondary") +
        "\" data-chart-kind=\"" +
        k.id +
        "\">" +
        k.label +
        "</button>"
      );
    })
    .join("");
}

function refreshDistCharts() {
  drawDistChartPreview();
  const board = document.getElementById("tourney-dist-board");
  const canvas = document.getElementById("tourney-dist-board-chart");
  if (!board || board.hidden || !(canvas instanceof HTMLCanvasElement)) return;
  const dist = currentDeckDist();
  const rows = distChartRows(dist);
  if (!rows.length) return;
  paintDistChart(canvas, rows, {
    title: state.settings.title || "",
    headline: "デッキ分布",
    total: dist.withRecipe || 0,
    preview: false,
  });
}

function drawDistChartPreview(rows) {
  const canvas = document.getElementById("tourney-dist-chart");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const dist = currentDeckDist();
  paintDistChart(canvas, rows && rows.length ? rows : distChartRows(dist), {
    title: state.settings.title || "",
    headline: "デッキ分布",
    total: dist.withRecipe || 0,
    preview: true,
  });
}

function paintDistChart(canvas, rows, opts) {
  opts = opts || {};
  const live = !!(canvas && (canvas.id === "tourney-dist-chart" || canvas.id === "tourney-dist-board-chart"));
  const token = live ? ++distPaintToken : distPaintToken;
  function run(images) {
    if (live && token !== distPaintToken) return;
    if (distChartKind() === "pie") paintDistPie(canvas, rows, opts, images);
    else paintDistBar(canvas, rows, opts, images);
  }
  const list = rows || [];
  run(list.map(function () {
    return null;
  }));
  return Promise.all(
    list.map(function (row) {
      if (!row || !row.card) return Promise.resolve(null);
      return loadUsageCardImage(row.card, distChartKind() === "pie" ? { pie: true } : { hi: true });
    }),
  ).then(function (images) {
    run(images);
    return canvas;
  });
}

function distHeaderHeight(opts, preview) {
  let y = preview ? 10 : 24;
  if (opts && opts.title) y += preview ? 30 : 76;
  y += preview ? 22 : 50;
  y += preview ? 12 : 22;
  return y;
}

function paintDistHeader(ctx, opts, W, preview) {
  const pink = "#c43a78";
  ctx.fillStyle = pink;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let y = preview ? 10 : 24;
  if (opts.title) {
    ctx.font = usageRankFont(800, preview ? 24 : 68);
    ctx.fillText(ellipsizeText(ctx, opts.title, W - (preview ? 48 : 120)), W / 2, y);
    y += preview ? 30 : 76;
  }
  ctx.font = usageRankFont(800, preview ? 18 : 46);
  ctx.fillText(opts.headline || "デッキ分布", W / 2, y);
  y += preview ? 22 : 50;
  const total = Math.max(0, Number(opts.total) || 0);
  ctx.font = usageRankFont(700, preview ? 13 : 26);
  ctx.fillText(total + "レシピ", W / 2, y);
  y += preview ? 12 : 22;
  return y;
}

function paintDistBar(canvas, rows, opts, images) {
  opts = opts || {};
  images = images || [];
  const preview = opts.preview === true;
  const W = preview ? 900 : 1600;
  const padX = preview ? 28 : 72;
  const padTop = preview ? 56 : 92;
  const padBot = preview ? 28 : 56;
  const rowH = preview ? 44 : 68;
  const gap = preview ? 8 : 14;
  const thumbW = preview ? 28 : 44;
  const thumbH = preview ? 40 : 62;
  const n = Math.max(1, (rows || []).length);
  const H = padTop + n * rowH + gap * Math.max(0, n - 1) + padBot;
  const scale = preview ? 1.25 : 1.5;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  fillUsagePosterBg(ctx, W, H);
  let y = paintDistHeader(ctx, opts, W, preview);
  const total = Math.max(1, Number(opts.total) || 0);
  const maxSize = Math.max(1, (rows || []).reduce(function (m, r) {
    return Math.max(m, r.size || 0);
  }, 0));
  const labelW = preview ? 186 : 320;
  const numW = preview ? 92 : 140;
  const thumbGap = preview ? 8 : 12;
  const barX = padX + thumbW + thumbGap + labelW + 12;
  const barMax = W - padX - numW - barX;
  const pink = "#c43a78";
  ctx.textBaseline = "middle";
  (rows || []).forEach(function (row, i) {
    const cy = y + i * (rowH + gap) + rowH / 2;
    const img = images[i];
    const tx = padX;
    const ty = cy - thumbH / 2;
    if (img) {
      drawCoverImage(ctx, img, tx, ty, thumbW, thumbH, 6);
    } else {
      ctx.fillStyle = DIST_BAR_COLORS[i % DIST_BAR_COLORS.length];
      roundRectPath(ctx, tx, ty, thumbW, thumbH, 6);
      ctx.fill();
    }
    const bw = Math.max(6, (row.size / maxSize) * barMax);
    ctx.fillStyle = DIST_BAR_COLORS[i % DIST_BAR_COLORS.length];
    roundRectPath(ctx, barX, cy - rowH * 0.32, bw, rowH * 0.64, 8);
    ctx.fill();
    ctx.fillStyle = pink;
    ctx.textAlign = "right";
    ctx.font = usageRankFont(800, preview ? 14 : 22);
    ctx.fillText(ellipsizeText(ctx, row.name || "系統", labelW), barX - 12, cy);
    ctx.textAlign = "left";
    ctx.font = usageRankFont(700, preview ? 13 : 20);
    const pct = Math.round((row.size / total) * 1000) / 10;
    ctx.fillText(row.size + "人　" + pct + "%", barX + bw + 10, cy);
  });
  return canvas;
}

function wrapPieDeckName(ctx, name, maxW) {
  const raw = String(name || "系統").trim();
  const parts = raw.split(/\s*\/\s*/).filter(Boolean);
  if (parts.length >= 2) {
    const lines = parts.map(function (p) {
      return ellipsizeText(ctx, p, maxW);
    });
    if (lines.length <= 3) return lines;
    return [lines[0], lines[1], ellipsizeText(ctx, parts.slice(2).join(" / "), maxW)];
  }
  if (ctx.measureText(raw).width <= maxW) return [raw];
  let line = "";
  const lines = [];
  Array.from(raw).forEach(function (ch) {
    const next = line + ch;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  if (lines.length <= 3) return lines;
  return [lines[0], lines[1], ellipsizeText(ctx, lines.slice(2).join(""), maxW)];
}

function spreadPieLabelSide(group, yMin, yMax) {
  if (!group.length) return;
  group.sort(function (a, b) {
    return a.y - b.y;
  });
  function minSep(a, b) {
    return (a.h + b.h) / 2 + 8;
  }
  const firstTop = group[0].y - group[0].h / 2;
  if (firstTop < yMin) {
    const shift = yMin - firstTop;
    for (let i = 0; i < group.length; i++) group[i].y += shift;
  }
  for (let i = 1; i < group.length; i++) {
    const need = minSep(group[i - 1], group[i]);
    if (group[i].y < group[i - 1].y + need) group[i].y = group[i - 1].y + need;
  }
  const last = group[group.length - 1];
  const lastBottom = last.y + last.h / 2;
  if (lastBottom > yMax) {
    const shift = lastBottom - yMax;
    for (let i = 0; i < group.length; i++) group[i].y -= shift;
  }
}

function paintDistPie(canvas, rows, opts, images) {
  opts = opts || {};
  images = images || [];
  const preview = opts.preview === true;
  const W = preview ? 1200 : 2200;
  const list = rows || [];
  const basePieR = preview ? 176 : 360;
  const labelW = preview ? 248 : 420;
  const sidePad = preview ? 14 : 28;
  const radialOut = preview ? 12 : 18;
  const pieGapTop = preview ? 8 : 14;
  const padBot = preview ? 16 : 28;
  const nameFont = preview ? 14 : 34;
  const metaFont = preview ? 12 : 26;
  const lineH = preview ? 16 : 38;
  const metaH = preview ? 15 : 32;
  const pieClearPad = preview ? 8 : 14;
  const total = Math.max(
    1,
    Number(opts.total) ||
      list.reduce(function (s, r) {
        return s + (r.size || 0);
      }, 0),
  );
  const minGap = 2 * lineH + metaH + 8;
  const yHead = distHeaderHeight(opts, preview);
  const pieCx = W / 2;
  const pink = "#c43a78";
  const lineGap = preview ? 8 : 14;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return null;
  let angle = -Math.PI / 2;
  const callouts = [];
  list.forEach(function (row) {
    const slice = (Math.max(0, row.size || 0) / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + slice;
    const mid = a0 + slice / 2;
    callouts.push({
      row: row,
      a0: a0,
      a1: a1,
      mid: mid,
      right: Math.cos(mid) >= 0,
      h: minGap,
      names: [],
      tw: 0,
    });
    angle = a1;
  });
  measure.font = usageRankFont(800, nameFont);
  callouts.forEach(function (c) {
    c.names = wrapPieDeckName(measure, c.row.name || "系統", labelW);
    let tw = 0;
    c.names.forEach(function (line) {
      tw = Math.max(tw, measure.measureText(line).width);
    });
    measure.font = usageRankFont(700, metaFont);
    const pct = Math.round((c.row.size / total) * 1000) / 10;
    c.meta = c.row.size + "人　" + pct + "%";
    tw = Math.max(tw, measure.measureText(c.meta).width);
    measure.font = usageRankFont(800, nameFont);
    c.tw = tw;
    c.h = c.names.length * lineH + metaH;
  });
  function stackSpan(side) {
    const hs = callouts
      .filter(function (c) {
        return !!c.right === side;
      })
      .map(function (c) {
        return c.h;
      });
    if (!hs.length) return 0;
    return hs.reduce(function (s, h) {
      return s + h;
    }, 0) + Math.max(0, hs.length - 1) * 8;
  }
  const labelH = Math.max(stackSpan(false) + 8, stackSpan(true) + 8, basePieR * 2);
  const maxPieR = W / 2 - sidePad - labelW - lineGap - radialOut - pieClearPad;
  const pieR = Math.max(basePieR, Math.min(labelH / 2, maxPieR));
  const contentH = Math.max(labelH, pieR * 2);
  const pieClear = pieR + radialOut + pieClearPad;
  const pieCy = yHead + pieGapTop + contentH / 2;
  const yMin = yHead + pieGapTop + 4;
  const yMax = yHead + pieGapTop + contentH - 4;
  callouts.forEach(function (c) {
    c.xRim = pieCx + Math.cos(c.mid) * pieR;
    c.yRim = pieCy + Math.sin(c.mid) * pieR;
    c.y = pieCy + Math.sin(c.mid) * (pieR + radialOut);
  });
  spreadPieLabelSide(
    callouts.filter(function (c) {
      return !c.right;
    }),
    yMin,
    yMax,
  );
  spreadPieLabelSide(
    callouts.filter(function (c) {
      return c.right;
    }),
    yMin,
    yMax,
  );
  let bottom = pieCy + pieR;
  callouts.forEach(function (c) {
    bottom = Math.max(bottom, c.y + c.h / 2);
  });
  const H = Math.ceil(Math.max(bottom, yHead + pieGapTop + contentH) + padBot);
  const scale = preview ? 1.25 : 2;
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  fillUsagePosterBg(ctx, W, H);
  paintDistHeader(ctx, opts, W, preview);
  callouts.forEach(function (c, i) {
    ctx.beginPath();
    ctx.moveTo(pieCx, pieCy);
    ctx.arc(pieCx, pieCy, pieR, c.a0, c.a1);
    ctx.closePath();
    ctx.fillStyle = DIST_BAR_COLORS[i % DIST_BAR_COLORS.length];
    ctx.fill();
    const img = images[i];
    if (img) drawPieSliceArt(ctx, img, pieCx, pieCy, pieR, c.a0, c.a1, c.row.pos);
    ctx.beginPath();
    ctx.moveTo(pieCx, pieCy);
    ctx.arc(pieCx, pieCy, pieR, c.a0, c.a1);
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 249, 252, 0.95)";
    ctx.lineWidth = preview ? 3 : 6;
    ctx.stroke();
  });
  callouts.forEach(function (c) {
    const kx = pieCx + Math.cos(c.mid) * (pieR + radialOut);
    const ky = pieCy + Math.sin(c.mid) * (pieR + radialOut);
    const textX = c.right ? W - sidePad : sidePad;
    let innerX = c.right ? textX - c.tw - lineGap : textX + c.tw + lineGap;
    if (c.right) innerX = Math.max(innerX, pieCx + pieClear);
    else innerX = Math.min(innerX, pieCx - pieClear);
    ctx.beginPath();
    ctx.moveTo(c.xRim, c.yRim);
    ctx.lineTo(kx, ky);
    ctx.lineTo(innerX, c.y);
    ctx.strokeStyle = pink;
    ctx.lineWidth = preview ? 1.5 : 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c.xRim, c.yRim, preview ? 2.4 : 4.2, 0, Math.PI * 2);
    ctx.fillStyle = pink;
    ctx.fill();
    let ty = c.y - c.h / 2 + lineH / 2;
    ctx.textAlign = c.right ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = pink;
    ctx.font = usageRankFont(800, nameFont);
    c.names.forEach(function (line) {
      ctx.fillText(line, textX, ty);
      ty += lineH;
    });
    ctx.font = usageRankFont(700, metaFont);
    ctx.fillStyle = "rgba(140, 40, 90, 0.88)";
    ctx.fillText(c.meta, textX, ty);
  });
  return canvas;
}

function openDistChartBoard() {
  const board = document.getElementById("tourney-dist-board");
  const canvas = document.getElementById("tourney-dist-board-chart");
  if (!board || !(canvas instanceof HTMLCanvasElement)) {
    showToast("分布グラフを読み込めません");
    return;
  }
  const dist = currentDeckDist();
  const rows = distChartRows(dist);
  if (!rows.length) {
    showToast("まとめるデッキがありません。レシピを入れてください");
    return;
  }
  closeAdvanceBoard();
  closeUsageBoard();
  const eventEl = document.getElementById("tourney-dist-board-event");
  const headEl = document.getElementById("tourney-dist-board-headline");
  if (eventEl) eventEl.textContent = state.settings.title || "";
  if (headEl) headEl.textContent = "デッキ分布";
  paintDistChart(canvas, rows, {
    title: state.settings.title || "",
    headline: "デッキ分布",
    total: dist.withRecipe || 0,
    preview: false,
  });
  renderDistIconPanels(dist);
  paintAllClusterPanPreviews();
  board.hidden = false;
  document.body.classList.add("tourney-board-open");
  const closeBtn = document.getElementById("btn-tourney-dist-board-close");
  if (closeBtn) closeBtn.focus();
}

function closeDistChartBoard() {
  const board = document.getElementById("tourney-dist-board");
  if (board) board.hidden = true;
  const advance = document.getElementById("tourney-board");
  const usage = document.getElementById("tourney-usage-board");
  if ((!advance || advance.hidden) && (!usage || usage.hidden)) document.body.classList.remove("tourney-board-open");
  if (document.fullscreenElement && board && document.fullscreenElement === board) {
    document.exitFullscreen().catch(function () {});
  }
}

function toggleDistChartFullscreen() {
  const board = document.getElementById("tourney-dist-board");
  if (!board) return;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function () {});
    return;
  }
  if (board.requestFullscreen) board.requestFullscreen().catch(function () {});
}

function exportDistChartImage() {
  const dist = currentDeckDist();
  const rows = distChartRows(dist);
  if (!rows.length) {
    showToast("まとめるデッキがありません。レシピを入れてください");
    return;
  }
  const canvas = document.createElement("canvas");
  showToast("画像を作っています…");
  paintDistChart(canvas, rows, {
    title: state.settings.title || "",
    headline: "デッキ分布",
    total: dist.withRecipe || 0,
    preview: false,
  }).then(function () {
    canvas.toBlob(
      function (blob) {
        if (!blob) {
          showToast("画像にできませんでした");
          return;
        }
        downloadBlob(blob, "loveca-deck-dist-" + (state.settings.dateLabel || "event") + ".jpg");
        showToast("分布グラフを保存しました");
      },
      "image/jpeg",
      0.92,
    );
  });
}

function usageHeadlineText() {
  const n = usageRankLimit();
  const cur = String(state.settings.usageBoardHeadline || "");
  if (!cur || /^使用率ポイント 1〜\d+位$/.test(cur)) return usageHeadlineForCount(n);
  return cur;
}

function renderUsagePreview(result) {
  const meta = document.getElementById("tourney-usage-meta");
  const list = document.getElementById("tourney-usage-preview");
  if (!meta && !list) return;
  const rows = usageRankRows(result);
  if (meta) {
    meta.textContent = rows.length
      ? poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins) +
        "　" +
        cardKindFilterLabel() +
        "　" +
        rows.length +
        " 枚（最大 " +
        usageRankLimit() +
        " 位・画像付き）"
      : "レシピが集まると、カードごとのポイント内訳が出ます。";
  }
  if (!list) return;
  if (!rows.length) {
    list.innerHTML = "<p class=\"muted\">上の集計範囲のデッキが入ると、ここに 1〜50 位が並びます。</p>";
    return;
  }
  list.innerHTML = rows
    .map(function (row) {
      const top = row.rank <= 10;
      const art = row.withArt ? cardThumbHtml(row.card, { hi: top }) : "";
      return (
        "<button type=\"button\" class=\"tourney-usage-preview-item" +
        (row.withArt ? " is-art" : " is-text") +
        (top ? " is-top" : "") +
        "\" data-card-no=\"" +
        escapeHtml(row.cardNo) +
        "\"><span class=\"tourney-usage-rank\">" +
        row.rank +
        "</span>" +
        art +
        "<span class=\"tourney-usage-name\">" +
        escapeHtml(row.charName) +
        "</span><span class=\"tourney-pts\">" +
        row.points +
        "P</span></button>"
      );
    })
    .join("");
}

function usageRankCopyText(result) {
  const rows = usageRankRows(result);
  const lines = [];
  if (state.settings.title) lines.push(state.settings.title);
  lines.push(usageHeadlineText());
  lines.push(poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins) + " / " + cardKindFilterLabel());
  lines.push("");
  lines.push("順位\t型番\t名前\tP");
  rows.forEach(function (row) {
    lines.push([row.rank, row.typeNo, row.charName, row.points].join("\t"));
  });
  return lines.join("\n");
}

function copyUsageRanks() {
  const result = compute();
  const rows = usageRankRows(result);
  if (!rows.length) {
    showToast("まとめるカードがありません。レシピを入れてください");
    return;
  }
  const text = usageRankCopyText(result);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () {
        showToast("使用率 " + rows.length + " 位までをコピーしました");
      },
      function () {
        fallbackCopy(text);
      },
    );
  } else {
    fallbackCopy(text);
  }
}

let usageImageBusy = false;

function setUsageImageButtonsBusy(busy) {
  ["btn-tourney-usage-image", "btn-tourney-usage-board-image"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.disabled = !!busy;
  });
}

function usageExportCols(n) {
  if (n <= 12) return 2;
  if (n <= 24) return 3;
  if (n <= 40) return 4;
  return 5;
}

function usageRankFont(weight, sizePx) {
  return String(weight) + " " + sizePx + "px \"M PLUS Rounded 1c\", \"Hiragino Sans\", sans-serif";
}

function loadUsageCardImage(card, opts) {
  const full = card && card.img ? String(card.img) : "";
  if (!full) return Promise.resolve(null);
  const thumbOpts = opts && opts.pie ? { pie: true } : opts && opts.poster ? { poster: true } : { hi: true };
  const src = catalogListThumbnailUrl(full, thumbOpts) || full;
  return new Promise(function (resolve) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(function () {
      resolve(null);
    }, 8000);
    img.onload = function () {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = function () {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function fillUsagePosterBg(ctx, w, h) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.16, 24, w * 0.5, h * 0.4, Math.max(w, h) * 0.78);
  g.addColorStop(0, "#fff9fc");
  g.addColorStop(0.46, "#f7cfe8");
  g.addColorStop(0.78, "#e9b3d8");
  g.addColorStop(1, "#e3a6d0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCoverImage(ctx, img, x, y, w, h, r) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawCardArtAtFocus(ctx, img, destX, destY, coverR, pos) {
  pos = normalizeThumbPos(pos);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = (coverR * 2 * pos.z) / Math.min(iw, ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, destX - pos.x * dw, destY - pos.y * dh, dw, dh);
}

function drawPieSliceArt(ctx, img, cx, cy, r, a0, a1, pos) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a0, a1);
  ctx.closePath();
  ctx.clip();
  const mid = (a0 + a1) / 2;
  const destX = cx + Math.cos(mid) * r * 0.56;
  const destY = cy + Math.sin(mid) * r * 0.56;
  drawCardArtAtFocus(ctx, img, destX, destY, r * 1.08, pos);
  ctx.restore();
}

function paintAllClusterPanPreviews() {
  document.querySelectorAll(".tourney-dist-pan-canvas[data-pan-key]").forEach(function (el) {
    if (el instanceof HTMLCanvasElement) paintClusterPanPreview(el.getAttribute("data-pan-key") || "");
  });
}

const panPreviewImgCache = Object.create(null);

function paintClusterPanPreview(key) {
  if (!key) return;
  const canvases = document.querySelectorAll('.tourney-dist-pan-canvas[data-pan-key="' + key.replace(/"/g, "") + '"]');
  if (!canvases.length) return;
  const row = distChartRows(currentDeckDist()).find(function (r) {
    return r.key === key;
  });
  const size = 88;
  const dpr = 2;
  const px = size * dpr;
  function paintOn(canvas, img) {
    if (!(canvas instanceof HTMLCanvasElement)) return;
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
      drawCardArtAtFocus(ctx, img, size / 2, size / 2, size / 2 - 1, clusterThumbPos(key));
    } else {
      ctx.fillStyle = "rgba(196, 58, 120, 0.16)";
      ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(196, 58, 120, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
  function paintAll(img) {
    canvases.forEach(function (canvas) {
      paintOn(canvas, img);
    });
  }
  if (!row || !row.card) {
    paintAll(null);
    return;
  }
  const cacheId = String(row.card.card_no || row.card.id || key);
  if (panPreviewImgCache[cacheId]) {
    paintAll(panPreviewImgCache[cacheId]);
    return;
  }
  paintAll(null);
  loadUsageCardImage(row.card, { hi: true }).then(function (img) {
    if (img) panPreviewImgCache[cacheId] = img;
    paintAll(img);
  });
}

function ellipsizeText(ctx, text, maxW) {
  const raw = String(text || "");
  if (ctx.measureText(raw).width <= maxW) return raw;
  let s = raw;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

function usageRankGridHeight(n, spec) {
  const rowsN = Math.ceil(Math.max(0, n) / spec.cols);
  if (!rowsN) return 0;
  return rowsN * spec.cellH + spec.gapY * Math.max(0, rowsN - 1);
}

function usageRankFeaturedSpec(W, padX) {
  const cols = 5;
  const gapX = 24;
  const gapY = 20;
  const cellW = (W - padX * 2 - gapX * (cols - 1)) / cols;
  const thumbW = 268;
  const thumbH = 374;
  return {
    cols: cols,
    padX: padX,
    gapX: gapX,
    gapY: gapY,
    cellW: cellW,
    cellH: thumbH + 118,
    thumbW: thumbW,
    thumbH: thumbH,
    featured: true,
    rankFont: 34,
    nameFont: 24,
    typeFont: 16,
    ptsFont: 26,
  };
}

function usageRankRestSpec(W, padX) {
  const cols = 5;
  const gapX = 22;
  const gapY = 16;
  const cellW = (W - padX * 2 - gapX * (cols - 1)) / cols;
  const thumbW = 96;
  const thumbH = 134;
  return {
    cols: cols,
    padX: padX,
    gapX: gapX,
    gapY: gapY,
    cellW: cellW,
    cellH: Math.max(152, thumbH + 18),
    thumbW: thumbW,
    thumbH: thumbH,
    featured: false,
    rankFont: 26,
    nameFont: 22,
    typeFont: 15,
    ptsFont: 22,
  };
}

function drawUsageRankGrid(ctx, rows, images, originY, spec) {
  const pink = "#c43a78";
  const n = rows.length;
  for (let i = 0; i < n; i++) {
    const row = rows[i];
    const col = i % spec.cols;
    const r = Math.floor(i / spec.cols);
    const x = spec.padX + col * (spec.cellW + spec.gapX);
    const cy = originY + r * (spec.cellH + spec.gapY);
    const img = images[i];
    if (spec.featured) {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = pink;
      ctx.font = usageRankFont(800, spec.rankFont);
      ctx.fillText(String(row.rank), x + spec.cellW / 2, cy);
      const ix = x + (spec.cellW - spec.thumbW) / 2;
      const iy = cy + 42;
      if (img) {
        drawCoverImage(ctx, img, ix, iy, spec.thumbW, spec.thumbH, 12);
      } else {
        ctx.fillStyle = "rgba(196, 58, 120, 0.18)";
        roundRectPath(ctx, ix, iy, spec.thumbW, spec.thumbH, 12);
        ctx.fill();
      }
      ctx.fillStyle = pink;
      ctx.font = usageRankFont(800, spec.nameFont);
      ctx.fillText(ellipsizeText(ctx, row.charName, spec.cellW - 12), x + spec.cellW / 2, iy + spec.thumbH + 10);
      ctx.font = usageRankFont(700, spec.typeFont);
      ctx.globalAlpha = 0.78;
      ctx.fillText(ellipsizeText(ctx, row.typeNo, spec.cellW - 12), x + spec.cellW / 2, iy + spec.thumbH + 38);
      ctx.globalAlpha = 1;
      ctx.font = usageRankFont(800, spec.ptsFont);
      ctx.fillText(row.points + "P", x + spec.cellW / 2, iy + spec.thumbH + 58);
    } else {
      const ty = cy + (spec.cellH - spec.thumbH) / 2;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = pink;
      ctx.font = usageRankFont(800, spec.rankFont);
      ctx.fillText(String(row.rank), x + 42, cy + spec.cellH / 2);
      const ix = x + 52;
      if (img) {
        drawCoverImage(ctx, img, ix, ty, spec.thumbW, spec.thumbH, 8);
      } else {
        ctx.fillStyle = "rgba(196, 58, 120, 0.18)";
        roundRectPath(ctx, ix, ty, spec.thumbW, spec.thumbH, 8);
        ctx.fill();
      }
      const textX = ix + spec.thumbW + 12;
      const textW = Math.max(40, x + spec.cellW - textX - 8);
      ctx.textAlign = "left";
      ctx.fillStyle = pink;
      ctx.font = usageRankFont(800, spec.nameFont);
      ctx.fillText(ellipsizeText(ctx, row.charName, textW), textX, cy + spec.cellH / 2 - 18);
      ctx.font = usageRankFont(700, spec.typeFont);
      ctx.globalAlpha = 0.78;
      ctx.fillText(ellipsizeText(ctx, row.typeNo, textW * 0.72), textX, cy + spec.cellH / 2 + 8);
      ctx.globalAlpha = 1;
      ctx.textAlign = "right";
      ctx.font = usageRankFont(800, spec.ptsFont);
      ctx.fillText(row.points + "P", x + spec.cellW - 8, cy + spec.cellH / 2 + 10);
    }
  }
  return originY + usageRankGridHeight(n, spec);
}

function renderUsageRankPng(rows) {
  const topRows = rows.slice(0, 10);
  const restRows = rows.slice(10);
  const W = 1920;
  const padX = 56;
  const padTop = 48;
  const padBot = 52;
  const title = String(state.settings.title || "").trim();
  const headline = usageHeadlineText();
  const meta =
    poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins) + "　" + cardKindFilterLabel();
  const headH = (title ? 58 : 0) + 62 + 36;
  const topSpec = usageRankFeaturedSpec(W, padX);
  const restSpec = usageRankRestSpec(W, padX);
  const topH = topRows.length ? usageRankGridHeight(topRows.length, topSpec) : 0;
  const restGap = topRows.length && restRows.length ? 40 : 0;
  const restH = restRows.length ? usageRankGridHeight(restRows.length, restSpec) : 0;
  const H = padTop + headH + topH + restGap + restH + padBot;
  const scale = 1.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas"));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  fillUsagePosterBg(ctx, W, H);
  const pink = "#c43a78";
  ctx.fillStyle = pink;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let y = padTop;
  if (title) {
    ctx.font = usageRankFont(800, 36);
    ctx.fillText(ellipsizeText(ctx, title, W - padX * 2), W / 2, y);
    y += 50;
  }
  ctx.font = usageRankFont(800, 44);
  ctx.fillText(ellipsizeText(ctx, headline, W - padX * 2), W / 2, y);
  y += 56;
  ctx.font = usageRankFont(700, 22);
  ctx.fillText(ellipsizeText(ctx, meta, W - padX * 2), W / 2, y);
  y += 40;
  const fontReady =
    document.fonts && document.fonts.ready
      ? document.fonts.ready.catch(function () {})
      : Promise.resolve();
  return fontReady
    .then(function () {
      return Promise.all(
        rows.map(function (row, i) {
          return loadUsageCardImage(row.card, { poster: i < 10 });
        }),
      );
    })
    .then(function (images) {
      if (topRows.length) {
        y = drawUsageRankGrid(ctx, topRows, images.slice(0, topRows.length), y, topSpec);
      }
      if (restRows.length) {
        y += restGap;
        drawUsageRankGrid(ctx, restRows, images.slice(topRows.length), y, restSpec);
      }
      return new Promise(function (resolve, reject) {
        canvas.toBlob(
          function (blob) {
            if (blob) resolve(blob);
            else reject(new Error("blob"));
          },
          "image/jpeg",
          0.9,
        );
      });
    });
}

function exportUsageRankImage() {
  if (usageImageBusy) return;
  readSettingsFromForm();
  persist();
  const rows = usageRankRows(compute());
  if (!rows.length) {
    showToast("まとめるカードがありません。レシピを入れてください");
    return;
  }
  usageImageBusy = true;
  setUsageImageButtonsBusy(true);
  showToast("画像を作っています…");
  renderUsageRankPng(rows)
    .then(function (blob) {
      downloadBlob(blob, "loveca-usage-" + (state.settings.dateLabel || "event") + ".jpg");
      showToast("画像を保存しました（" + rows.length + " 位）");
    })
    .catch(function () {
      showToast("画像にできませんでした");
    })
    .finally(function () {
      usageImageBusy = false;
      setUsageImageButtonsBusy(false);
    });
}

function usageBoardItemHtml(row, top) {
  return (
    "<li class=\"is-art" +
    (top ? " is-top" : "") +
    "\"><span class=\"tourney-usage-board-rank\">" +
    row.rank +
    "</span>" +
    cardThumbHtml(row.card, { hi: top }) +
    "<span class=\"tourney-usage-board-copy\"><span class=\"tourney-usage-board-name\">" +
    escapeHtml(row.charName) +
    "</span><span class=\"tourney-usage-board-type\">" +
    escapeHtml(row.typeNo) +
    "</span></span><span class=\"tourney-usage-board-pts\">" +
    row.points +
    "P</span></li>"
  );
}

function openUsageBoard() {
  const board = document.getElementById("tourney-usage-board");
  if (!board) {
    showToast("内訳ボードを読み込めません");
    return;
  }
  readSettingsFromForm();
  persist();
  const result = compute();
  const rows = usageRankRows(result);
  if (!rows.length) {
    showToast("まとめるカードがありません。レシピを入れてください");
    return;
  }
  closeAdvanceBoard();
  closeDistChartBoard();
  const eventEl = document.getElementById("tourney-usage-board-event");
  const headEl = document.getElementById("tourney-usage-board-headline");
  const metaEl = document.getElementById("tourney-usage-board-meta");
  const topEl = document.getElementById("tourney-usage-board-list-top");
  const listEl = document.getElementById("tourney-usage-board-list");
  if (eventEl) eventEl.textContent = state.settings.title || "";
  if (headEl) headEl.textContent = usageHeadlineText();
  if (metaEl) {
    metaEl.textContent =
      poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins) + "　" + cardKindFilterLabel();
  }
  const topRows = rows.filter(function (row) {
    return row.rank <= 10;
  });
  const restRows = rows.filter(function (row) {
    return row.rank > 10;
  });
  if (topEl) {
    topEl.hidden = !topRows.length;
    topEl.innerHTML = topRows
      .map(function (row) {
        return usageBoardItemHtml(row, true);
      })
      .join("");
  }
  if (listEl) {
    listEl.hidden = !restRows.length;
    listEl.innerHTML = restRows
      .map(function (row) {
        return usageBoardItemHtml(row, false);
      })
      .join("");
  }
  board.hidden = false;
  document.body.classList.add("tourney-board-open");
  const closeBtn = document.getElementById("btn-tourney-usage-board-close");
  if (closeBtn) closeBtn.focus();
}

function closeUsageBoard() {
  const board = document.getElementById("tourney-usage-board");
  if (board) board.hidden = true;
  const advance = document.getElementById("tourney-board");
  const dist = document.getElementById("tourney-dist-board");
  if ((!advance || advance.hidden) && (!dist || dist.hidden)) document.body.classList.remove("tourney-board-open");
  if (document.fullscreenElement && board && document.fullscreenElement === board) {
    document.exitFullscreen().catch(function () {});
  }
}

function toggleUsageBoardFullscreen() {
  const board = document.getElementById("tourney-usage-board");
  if (!board) return;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function () {});
    return;
  }
  if (board.requestFullscreen) board.requestFullscreen().catch(function () {});
}

function renderPlayerDetail(result) {
  const el = document.getElementById("tourney-player-detail");
  if (!el) return;
  const p = state.players.find(function (x) {
    return x.id === state.selectedId;
  });
  if (!p) {
    el.innerHTML = "<p class=\"muted\">レシピ列をクリックすると、その選手のデッキ一覧とポイントが出ます。</p>";
    return;
  }
  const scored = result.players.find(function (x) {
    return x.id === p.id;
  });
  const rec = recipeStatus(p);
  const deckUrl = decklogViewUrl(p.deckCode);
  const warns = p.recipeWarns && p.recipeWarns.length ? "<p class=\"tourney-warn\">" + escapeHtml(p.recipeWarns.join(" / ")) + "</p>" : "";
  const lines = playerPointLines(p);
  const activeId = activeDeckPointLineId();
  const active = lines.find(function (line) {
    return line.id === activeId;
  }) || lines[2];
  el.innerHTML =
    "<div class=\"tourney-detail-head\">" +
    "<h3>" +
    escapeHtml(p.name || "（無名）") +
    "</h3>" +
    "<p>" +
    p.wins +
    "勝" +
    p.losses +
    "敗　レシピ " +
    rec.text +
    (scored && scored.inPool ? "　選抜集計 " + scored.points + "P" : "　選抜集計の対象外") +
    "</p>" +
    (deckUrl
      ? "<p><a href=\"" +
        escapeHtml(deckUrl) +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">DECK LOG を開く</a>　<a href=\"https://ws4696.xyz/decklog/\" target=\"_blank\" rel=\"noopener noreferrer\">テキスト化ツール</a></p>"
      : "<p class=\"muted\">デッキコードがあると DECK LOG を開けます。自動取得はできません（CORS）。</p>") +
    "</div>" +
    warns +
    '<p class="hint">デッキポイントは下の母数を切り替えて見ます。選抜そのものは上の集計範囲のままです。</p>' +
    pointLinesHtml(lines, activeId) +
    '<p class="tourney-deck-line-now"><strong>' +
    escapeHtml(active.label) +
    "</strong> 参照 " +
    (active.hasRecipe ? active.points + "P" : "—") +
    "（" +
    active.poolCount +
    "デッキ）</p>" +
    tourneyDeckListHtml(active.breakdown) +
    "<div class=\"tourney-detail-actions\">" +
    "<button type=\"button\" class=\"btn primary\" id=\"btn-tourney-open-deck-view\">大きく見る</button>" +
    "</div>" +
    "<details class=\"tourney-more tourney-recipe-edit\"><summary>レシピを編集</summary>" +
    "<label class=\"field\"><span>レシピ（例: 4 x PL!N-bp1-002-R＋）</span>" +
    "<textarea id=\"tourney-recipe-text\" class=\"input tourney-recipe\" rows=\"10\" spellcheck=\"false\">" +
    escapeHtml(p.recipeText || deckMapToRecipeText(p.deckMap)) +
    "</textarea></label>" +
    "<div class=\"tourney-detail-actions\">" +
    "<button type=\"button\" class=\"btn primary\" id=\"btn-tourney-apply-recipe\">レシピを反映</button>" +
    "</div></details>";
}

function renderDeckView() {
  const root = document.getElementById("tourney-deck-view");
  if (!root || root.hidden) return;
  const p = findPlayer(state.selectedId);
  const head = document.getElementById("tourney-deck-view-head");
  const linesEl = document.getElementById("tourney-deck-view-lines");
  const listEl = document.getElementById("tourney-deck-view-list");
  const nowEl = document.getElementById("tourney-deck-view-now");
  if (!p) {
    if (head) head.innerHTML = "<p class=\"muted\">選手が選ばれていません。</p>";
    if (linesEl) linesEl.innerHTML = "";
    if (listEl) listEl.innerHTML = "";
    if (nowEl) nowEl.textContent = "";
    return;
  }
  const rec = recipeStatus(p);
  const lines = playerPointLines(p);
  const activeId = activeDeckPointLineId();
  const active = lines.find(function (line) {
    return line.id === activeId;
  }) || lines[2];
  const deckUrl = decklogViewUrl(p.deckCode);
  if (head) {
    head.innerHTML =
      "<h2>" +
      escapeHtml(p.name || "（無名）") +
      " のデッキ</h2><p>" +
      p.wins +
      "勝" +
      p.losses +
      "敗　" +
      rec.text +
      (p.dropped ? "　リタイア" : "") +
      (deckUrl
        ? '　<a href="' +
          escapeHtml(deckUrl) +
          '" target="_blank" rel="noopener noreferrer">DECK LOG</a>'
        : "") +
      "</p>";
  }
  if (linesEl) linesEl.innerHTML = pointLinesHtml(lines, activeId);
  if (nowEl) {
    nowEl.innerHTML =
      "<strong>" +
      escapeHtml(active.label) +
      "</strong> から参照したデッキポイントは <strong>" +
      (active.hasRecipe ? active.points + "P" : "—") +
      "</strong>（母数 " +
      active.poolCount +
      " デッキ）";
  }
  if (listEl) listEl.innerHTML = tourneyDeckListHtml(active.breakdown);
}

function openDeckView(playerId) {
  if (playerId) state.selectedId = playerId;
  const p = findPlayer(state.selectedId);
  if (!p) {
    showToast("選手を選んでください");
    return;
  }
  const root = document.getElementById("tourney-deck-view");
  if (!root) {
    showToast("デッキ一覧を読み込めません");
    return;
  }
  root.hidden = false;
  document.body.classList.add("tourney-deck-view-open");
  persistAndRender();
  const closeBtn = document.getElementById("btn-tourney-deck-view-close");
  if (closeBtn) closeBtn.focus();
}

function closeDeckView() {
  const root = document.getElementById("tourney-deck-view");
  if (root) root.hidden = true;
  document.body.classList.remove("tourney-deck-view-open");
}

function setDeckPointLine(id) {
  state.settings.deckPointLine = getDeckPointLine(id).id;
  persistAndRender();
}

function openCatalogForCardNo(cardNo) {
  const card = getCard(cardNo);
  if (!card) {
    showToast("カードデータがありません（" + cardNo + "）");
    return;
  }
  import("./cardCatalogDialog.js").then(function (mod) {
    if (mod && typeof mod.openCardCatalogDialog === "function") mod.openCardCatalogDialog(card);
  });
}

function persistAndRender() {
  persist();
  render();
}

function findPlayer(id) {
  return state.players.find(function (p) {
    return p.id === id;
  });
}

function applyPresetKoboshi() {
  state.settings = defaultSettings();
  persistAndRender();
  showToast("小星CSの枠（決勝8・集計2勝以上・スイス5）を入れました");
}

function addPlayer() {
  const p = emptyPlayer();
  state.players.push(p);
  state.selectedId = p.id;
  persistAndRender();
}

function playersHaveDecks() {
  return state.players.some(function (p) {
    return deckMapTotal(p.deckMap) > 0;
  });
}

function playersHaveRecords() {
  return state.players.some(function (p) {
    return (p.wins || 0) > 0 || (p.losses || 0) > 0 || (p.draws || 0) > 0 || p.dropped;
  });
}

function snapshotTrialPlayers() {
  return state.players.map(function (p) {
    return {
      id: p.id,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws || 0,
      dropped: !!p.dropped,
      deckCode: p.deckCode || "",
      recipeText: p.recipeText || "",
      deckMap: JSON.parse(JSON.stringify(p.deckMap || {})),
    };
  });
}

function addSixtyCardPack(packs, seen, deck) {
  const clean = sanitizeMainDeckMap(deck);
  if (deckMapTotal(clean) !== MAIN_SIZE) return;
  const key = Object.keys(clean)
    .sort()
    .map(function (k) {
      return k + ":" + clean[k];
    })
    .join("|");
  if (seen.has(key)) return;
  seen.add(key);
  packs.push(clean);
}

async function fetchPublishedSampleDecks() {
  try {
    const u = new URL(SAMPLE_DECK_RECIPES_PUBLIC_FILENAME, window.location.href);
    const r = await fetch(u.toString(), { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

async function loadSixtyCardPacks() {
  const packs = [];
  const seen = new Set();
  (getSampleDeckRecipes() || []).forEach(function (r) {
    addSixtyCardPack(packs, seen, r && r.deck);
  });
  if (packs.length < 2) {
    const remote = await fetchPublishedSampleDecks();
    remote.forEach(function (r) {
      addSixtyCardPack(packs, seen, r && r.deck);
    });
  }
  try {
    const lib = loadDeckLibrary();
    (lib && lib.slots ? lib.slots : []).forEach(function (s) {
      if (!s || isBuiltInStarterDeckId(s.id)) return;
      addSixtyCardPack(packs, seen, s.deck);
    });
  } catch (_) {}
  if (!packs.length) addSixtyCardPack(packs, seen, DEFAULT_STARTER_DECK_MAP);
  return packs;
}

function trialRecordForIndex(i, n) {
  const undefeated = Math.max(1, Math.min(3, Math.floor(n / 16) || 1));
  const oneLoss = Math.max(2, Math.min(n - undefeated, Math.ceil(n * 0.45)));
  if (i < undefeated) return { wins: 5, losses: 0, draws: 0, dropped: false };
  if (i < undefeated + oneLoss) return { wins: 4, losses: 1, draws: 0, dropped: false };
  if (n > 8 && i === n - 1) return { wins: 2, losses: 1, draws: 0, dropped: true };
  const rest = [
    { wins: 3, losses: 2 },
    { wins: 2, losses: 3 },
    { wins: 3, losses: 1 },
    { wins: 1, losses: 4 },
    { wins: 0, losses: 2 },
  ];
  const rec = rest[(i - undefeated - oneLoss) % rest.length];
  return { wins: rec.wins, losses: rec.losses, draws: 0, dropped: false };
}

function applyTrialFill() {
  if (!state.players.length) {
    showToast("先に選手CSVで名簿を入れてください");
    return;
  }
  if (!state.trialBackup && (playersHaveDecks() || playersHaveRecords())) {
    if (!window.confirm("今の勝敗とデッキを退避して、仮の内容を入れます。「お試しを消す」で戻ります。続けますか？")) {
      return;
    }
  }
  loadSixtyCardPacks().then(function (packs) {
    if (!packs.length) {
      showToast("60枚のサンプルデッキを読めませんでした");
      return;
    }
    pushUndo();
    if (!state.trialBackup) state.trialBackup = snapshotTrialPlayers();
    state.players.forEach(function (p, i) {
      const rec = trialRecordForIndex(i, state.players.length);
      p.wins = rec.wins;
      p.losses = rec.losses;
      p.draws = rec.draws;
      p.dropped = rec.dropped;
      p.deckMap = sanitizeMainDeckMap(packs[i % packs.length]);
      p.recipeText = deckMapToRecipeText(p.deckMap);
      if (!p.deckCode) p.deckCode = "TRIAL" + String(i + 1);
    });
    state.lotteryWinnerIds = [];
    autoFillOutputCountsSilent();
    persistAndRender();
    showToast(
      "お試しの勝敗と60枚デッキを入れました（" +
        state.players.length +
        " 人 / レシピ " +
        packs.length +
        " 種）。消すと名簿だけ残ります",
    );
  });
}

function clearTrialFill() {
  if (!state.trialBackup) {
    showToast("お試し中ではありません");
    return;
  }
  pushUndo();
  const byId = new Map();
  state.trialBackup.forEach(function (p) {
    byId.set(p.id, p);
  });
  state.players.forEach(function (p) {
    const old = byId.get(p.id);
    if (!old) return;
    p.wins = old.wins;
    p.losses = old.losses;
    p.draws = old.draws || 0;
    p.dropped = !!old.dropped;
    p.deckCode = old.deckCode || "";
    p.recipeText = old.recipeText || "";
    p.deckMap = old.deckMap && typeof old.deckMap === "object" ? old.deckMap : {};
  });
  state.trialBackup = null;
  state.lotteryWinnerIds = [];
  persistAndRender();
  showToast("お試しの入力を消しました。名簿はそのままです");
}

function renderTrialBanner() {
  const el = document.getElementById("tourney-trial-banner");
  if (!el) return;
  if (!state.trialBackup) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML =
    "<strong>お試し中</strong>　勝敗とデッキは仮です。本番のCSVを当てる前に「お試しを消す」を押してください。";
}

function rememberParseMeta(text, parsed, asRoster) {
  if (asRoster) state.lastRosterText = String(text || "");
  state.skippedRows = parsed.skippedRows || [];
  if (parsed.headers && parsed.headers.length) state.csvHeaders = parsed.headers;
}

function warnDuplicates() {
  const groups = duplicateNameGroups(state.players);
  if (!groups.length) return "";
  return (
    "同名 " +
    groups.length +
    " 組（" +
    groups
      .map(function (g) {
        return g[0].name;
      })
      .join("、") +
    "）"
  );
}

function renderOpsNotes(result) {
  const el = document.getElementById("tourney-ops-notes");
  if (!el) return;
  const missing = (result.players || []).filter(function (p) {
    return (isUndefeatedAdvance(p) || isUsageRateCandidate(p)) && !p.hasRecipe;
  });
  const skipped = state.skippedRows || [];
  const dupes = duplicateNameGroups(state.players);
  const bits = [];
  if (missing.length) {
    bits.push(
      "<div class=\"tourney-note\"><strong>レシピ未入力（全勝・1敗）</strong><ul>" +
        missing
          .map(function (p) {
            return (
              "<li><button type=\"button\" class=\"tourney-linkish\" data-select=\"" +
              escapeHtml(p.id) +
              "\">" +
              escapeHtml(p.name || "（無名）") +
              "</button> " +
              p.wins +
              "勝" +
              p.losses +
              "敗</li>"
            );
          })
          .join("") +
        "</ul></div>",
    );
  }
  if (skipped.length) {
    bits.push(
      "<div class=\"tourney-note\"><strong>直前の名簿で除外 " +
        skipped.length +
        " 人</strong><ul>" +
        skipped
          .slice(0, 40)
          .map(function (r) {
            return "<li>" + escapeHtml(r.name || "（無名）") + "　" + escapeHtml(r.reason || "") + "</li>";
          })
          .join("") +
        (skipped.length > 40 ? "<li>…ほか " + (skipped.length - 40) + " 人</li>" : "") +
        "</ul></div>",
    );
  }
  if (dupes.length) {
    bits.push(
      "<div class=\"tourney-note tourney-note--warn\"><strong>同名あり</strong> 勝敗CSVが一人に寄ります。" +
        dupes
          .map(function (g) {
            return escapeHtml(g[0].name) + "（" + g.length + "）";
          })
          .join("、") +
        "</div>",
    );
  }
  el.innerHTML = bits.join("") || "";
}

function renderEventsBar() {
  const sel = document.getElementById("tourney-event-select");
  if (!sel) return;
  const events = state.events || {};
  const ids = Object.keys(events);
  if (!ids.length) ids.push(state.eventId);
  sel.innerHTML = ids
    .map(function (id) {
      const ev = events[id] || {};
      const title = ev.title || (ev.settings && ev.settings.title) || "無題の大会";
      return (
        "<option value=\"" +
        escapeHtml(id) +
        "\"" +
        (id === state.eventId ? " selected" : "") +
        ">" +
        escapeHtml(title) +
        "</option>"
      );
    })
    .join("");
}

function renderColumnSelect() {
  const sel = document.getElementById("tourney-col-deckcode");
  if (!sel) return;
  const headers = state.csvHeaders || [];
  const cur = (state.columnMap && state.columnMap.deckCode) || "";
  const opts = ["<option value=\"\">デッキコード列：自動</option>"].concat(
    headers.map(function (h) {
      return (
        "<option value=\"" +
        escapeHtml(h) +
        "\"" +
        (h === cur ? " selected" : "") +
        ">" +
        escapeHtml(h) +
        "</option>"
      );
    }),
  );
  sel.innerHTML = opts.join("");
}

function switchEvent(id) {
  if (!id || id === state.eventId) return;
  persist();
  const blob = state.events && state.events[id];
  if (!blob) {
    showToast("大会が見つかりません");
    return;
  }
  state.eventId = id;
  applyEventBlob(blob);
  persistAndRender();
}

function newBlankEvent() {
  persist();
  pushUndo();
  const id = newEventId();
  state.eventId = id;
  applyEventBlob({ settings: defaultSettings(), players: [] });
  state.settings.title = "新しい大会";
  persistAndRender();
  showToast("空の大会を追加しました");
}

function duplicateEvent() {
  persist();
  pushUndo();
  const blob = cloneEventBlob();
  const id = newEventId();
  blob.settings = Object.assign({}, blob.settings, { title: (blob.settings.title || "大会") + " のコピー" });
  state.events[id] = Object.assign({ id: id, title: blob.settings.title }, blob);
  state.eventId = id;
  applyEventBlob(blob);
  persistAndRender();
  showToast("この大会を複製しました");
}

function importPlayers(replace, sourceId) {
  const ta = document.getElementById(sourceId || "tourney-quick-paste") || document.getElementById("tourney-import-text");
  importPlayersFromText(ta ? ta.value : "", replace);
}

function importPlayersFromText(text, replace) {
  if (replace && playersHaveDecks() && !window.confirm("手入れしたデッキが消えます。勝敗だけなら「勝敗を当てる」、名簿の増減なら「名簿を更新」を使ってください。置き換えますか？")) {
    return;
  }
  const parsed = parseParticipantPaste(text, rosterParseOpts());
  if (parsed.errors.length && !parsed.players.length) {
    showToast(parsed.errors[0]);
    rememberParseMeta(text, parsed, true);
    persistAndRender();
    return;
  }
  pushUndo();
  const incoming = parsed.players.map(function (p) {
    const n = normalizePlayer(p);
    n.id = newPlayerId();
    if (n.recipeText) applyRecipeText(n, n.recipeText);
    return n;
  });
  if (replace) {
    state.trialBackup = null;
    state.players = incoming;
  } else state.players = state.players.concat(incoming);
  rememberParseMeta(text, parsed, true);
  autoFillOutputCountsSilent();
  toastImport(incoming, parsed.errors, parsed.skippedRoster);
  closeDialog("dlg-tourney-import");
  persistAndRender();
}

function mergeRosterFromText(text) {
  const parsed = parseParticipantPaste(text, rosterParseOpts());
  if (parsed.errors.length && !parsed.players.length) {
    showToast(parsed.errors[0]);
    rememberParseMeta(text, parsed, true);
    persistAndRender();
    return;
  }
  pushUndo();
  const incoming = parsed.players.map(function (p, i) {
    return normalizePlayer(p, i);
  });
  const merged = mergeRosterKeepDecks(state.players, incoming);
  state.players = merged.players.map(function (p, i) {
    const n = normalizePlayer(p, i);
    if (!n.id || n.id === "p_" + i) n.id = p.id || newPlayerId();
    if ((!n.deckMap || !Object.keys(n.deckMap).length) && n.recipeText) applyRecipeText(n, n.recipeText);
    return n;
  });
  rememberParseMeta(text, parsed, true);
  autoFillOutputCountsSilent();
  showToast("名簿を更新しました。残した " + (merged.players.length - merged.added) + " / 追加 " + merged.added + " / 除外 " + merged.removed + (parsed.skippedRoster ? "。CSV除外 " + parsed.skippedRoster : ""));
  persistAndRender();
}

function reapplyLastRoster() {
  if (!state.lastRosterText) return;
  mergeRosterFromText(state.lastRosterText);
}

function applyRecordsFromText(text) {
  const parsed = parseParticipantPaste(text, rosterParseOpts());
  if (parsed.errors.length && !parsed.players.length) {
    showToast(parsed.errors[0]);
    return;
  }
  pushUndo();
  const incoming = parsed.players.map(function (p, i) {
    return normalizePlayer(p, i);
  });
  const withRecord = incoming.filter(function (p) {
    return p.hasRecord;
  }).length;
  if (!withRecord) {
    showToast("勝敗の列が見つかりません。順位表の CSV（名前と勝・負、または試合数と勝数）を指定してください。");
    return;
  }
  const merged = mergePlayerRecords(state.players, incoming);
  state.players = merged.players.map(function (p, i) {
    const n = normalizePlayer(p, i);
    if (!n.id || n.id === "p_" + i) n.id = p.id || newPlayerId();
    if ((!n.deckMap || !Object.keys(n.deckMap).length) && n.recipeText) applyRecipeText(n, n.recipeText);
    return n;
  });
  autoFillOutputCountsSilent();
  const bits = [merged.updated + " 人の勝敗を更新"];
  if (merged.added) bits.push("新規 " + merged.added + " 人");
  showToast(bits.join("。") + "。全勝 " + state.settings.undefeatedCount);
  closeDialog("dlg-tourney-import");
  persistAndRender();
}

function toastImport(incoming, errors, skippedRoster) {
  const missingRecipe = incoming.filter(function (p) {
    return deckMapTotal(p.deckMap) === 0;
  }).length;
  const skipN = skippedRoster || 0;
  const skipBit = skipN ? "名簿対象外 " + skipN + " 人は除外。" : "";
  const base =
    incoming.length +
    " 人を取り込みました。" +
    skipBit +
    "全勝 " +
    state.settings.undefeatedCount +
    " / 予選抜け " +
    state.settings.advanceCount;
  if (errors && errors.length) {
    showToast(
      incoming.length +
        " 人を取り込み（警告あり）。" +
        skipBit +
        (missingRecipe ? "レシピ未入力 " + missingRecipe + " 人。" : "") +
        "全勝 " +
        state.settings.undefeatedCount,
    );
  } else if (missingRecipe) {
    showToast(base + "。レシピ未入力 " + missingRecipe + " 人は使用率選抜に入れません");
  } else {
    showToast(base);
  }
  const dupe = warnDuplicates();
  if (dupe) showToast(dupe);
}

function undoLast() {
  const prev = undoStack.pop();
  if (!prev) {
    showToast("戻す操作がありません");
    return;
  }
  applyEventBlob(prev);
  persistAndRender();
  showToast("直前の操作を取り消しました");
}

function rollLottery() {
  const result = compute();
  if (!result.lottery.length || !result.lotterySlots) {
    showToast("振る抽選がありません");
    return;
  }
  pushUndo();
  const winners = pickLotteryWinners(result.lottery, result.lotterySlots);
  state.lotteryWinnerIds = winners.map(function (p) {
    return p.id;
  });
  state.lotteryLog = (state.lotteryLog || []).concat([
    {
      at: new Date().toISOString(),
      names: winners.map(function (p) {
        return p.name;
      }),
      from: result.lottery.map(function (p) {
        return p.name;
      }),
      slots: result.lotterySlots,
    },
  ]);
  persistAndRender();
  showToast("抽選: " + winners.map(function (p) {
    return p.name;
  }).join("、"));
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
  }, 4000);
}

function exportEventJson() {
  persist();
  downloadText(
    "loveca-tourney-" + (state.settings.dateLabel || "event") + ".json",
    JSON.stringify({ v: 2, activeId: state.eventId, events: state.events }, null, 2),
    "application/json",
  );
  showToast("大会データを書き出しました");
}

function importEventJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const data = JSON.parse(String(reader.result || ""));
      pushUndo();
      if (data && data.v === 2 && data.events) {
        state.events = Object.assign({}, state.events, data.events);
        const id = data.activeId && state.events[data.activeId] ? data.activeId : Object.keys(data.events)[0];
        state.eventId = id;
        applyEventBlob(state.events[id]);
      } else if (data && (data.settings || data.players)) {
        applyEventBlob(data);
      } else {
        showToast("大会JSONとして読めません");
        return;
      }
      persistAndRender();
      showToast("大会データを読み込みました");
    } catch (err) {
      showToast("JSON を読めませんでした");
    }
  };
  reader.readAsText(file);
}

function exportResultsCsv() {
  const result = compute();
  const pick = currentAdvancePick();
  const lines = ["名前,勝,負,分,リタイア,ポイント,結果,進出"];
  result.players.forEach(function (p) {
    const adv = advancementLabel(result, p.id);
    const onBoard = pick.names.some(function (x) {
      return x.id === p.id;
    });
    lines.push(
      [
        csvCell(p.name),
        p.wins,
        p.losses,
        p.draws || 0,
        p.dropped ? 1 : 0,
        p.hasRecipe ? p.points : "",
        csvCell(adv.label),
        onBoard ? 1 : 0,
      ].join(","),
    );
  });
  lines.push("");
  lines.push("カード,P,種別");
  result.cardTable.forEach(function (row) {
    const card = getCard(row.cardNo);
    const kind = card && card.type === T_LIVE ? "ライブ" : card && card.type === T_MEMBER ? "メンバー" : "";
    lines.push([csvCell(cardLabel(row.cardNo)), row.pointsPerCopy, kind].join(","));
  });
  if (state.lotteryLog && state.lotteryLog.length) {
    lines.push("");
    lines.push("抽選ログ");
    state.lotteryLog.forEach(function (log) {
      lines.push([csvCell(log.at), csvCell((log.names || []).join(" / ")), log.slots].join(","));
    });
  }
  downloadText("loveca-tourney-results.csv", lines.join("\n"), "text/csv;charset=utf-8");
  showToast("結果CSVを書き出しました");
}

function csvCell(s) {
  const t = String(s == null ? "" : s);
  if (/[",\n]/.test(t)) return "\"" + t.replace(/"/g, "\"\"") + "\"";
  return t;
}

function applyBulkDecks() {
  const ta = document.getElementById("tourney-bulk-decks");
  const text = ta ? ta.value : "";
  const parsed = parseNamedDeckBlocks(text);
  if (!parsed.players.length) {
    showToast("名前つきのデッキブロックを貼ってください（# 名前）");
    return;
  }
  pushUndo();
  let n = 0;
  parsed.players.forEach(function (inc) {
    const k = nameMatchKey(inc.name);
    const hit = state.players.find(function (p) {
      return nameMatchKey(p.name) === k;
    });
    if (!hit) return;
    if (inc.deckCode) hit.deckCode = inc.deckCode;
    const recipe = extractDeckRecipeLines(inc.recipeText) || inc.recipeText;
    if (recipe) applyRecipeText(hit, recipe);
    if (inc.deckMap && Object.keys(inc.deckMap).length) {
      hit.deckMap = sanitizeMainDeckMap(inc.deckMap);
      hit.recipeText = deckMapToRecipeText(hit.deckMap);
    }
    n += 1;
  });
  persistAndRender();
  showToast(n + " 人のデッキを反映しました");
}

function applySavedDecksByName() {
  let lib;
  try {
    lib = loadDeckLibrary();
  } catch (_) {
    showToast("保存デッキを読めませんでした");
    return;
  }
  const slots = (lib && lib.slots ? lib.slots : []).filter(function (s) {
    return s && !isBuiltInStarterDeckId(s.id);
  });
  if (!slots.length) {
    showToast("名前つきの保存デッキがありません");
    return;
  }
  pushUndo();
  let n = 0;
  state.players.forEach(function (p) {
    if (deckMapTotal(p.deckMap)) return;
    const k = nameMatchKey(p.name);
    const slot = slots.find(function (s) {
      return nameMatchKey(s.name) === k;
    });
    if (!slot || !slot.deck) return;
    p.deckMap = sanitizeMainDeckMap(slot.deck);
    p.recipeText = deckMapToRecipeText(p.deckMap);
    n += 1;
  });
  persistAndRender();
  showToast(n ? n + " 人に保存デッキを当てました" : "名前が一致する保存デッキはありませんでした");
}

function decodeCsvBuffer(buf) {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("\uFFFD")) return utf8;
  const encodings = ["shift_jis", "windows-31j", "euc-jp"];
  for (let i = 0; i < encodings.length; i++) {
    try {
      const t = new TextDecoder(encodings[i]).decode(buf);
      if (t && !t.includes("\uFFFD")) return t;
    } catch (_) {}
  }
  return utf8;
}

function applyCsvFile(file, recordsOnly) {
  if (!file) return;
  file
    .arrayBuffer()
    .then(function (buf) {
      const text = decodeCsvBuffer(buf);
      const ta = document.getElementById("tourney-quick-paste");
      if (ta) ta.value = text;
      if (recordsOnly) applyRecordsFromText(text);
      else importPlayersFromText(text, true);
    })
    .catch(function (err) {
      showToast("CSV を読めませんでした: " + (err && err.message ? err.message : String(err)));
    });
}

function loadSample() {
  loadSixtyCardPacks().then(function (packs) {
    pushUndo();
    state.trialBackup = null;
    state.settings = defaultSettings();
    state.players = buildSamplePlayers(packs);
    state.selectedId = state.players[0] ? state.players[0].id : "";
    autoFillOutputCountsSilent();
    persistAndRender();
    showToast("動作確認用の12人を入れました（デッキは60枚）。進出者を出せます");
  });
}

function buildSamplePlayers(packs) {
  const list = packs && packs.length ? packs : [DEFAULT_STARTER_DECK_MAP];
  const rows = [
    ["天王寺 璃奈", 5, 0, false, "RINA1"],
    ["中須 かすみ", 5, 0, false, "KASU1"],
    ["優木 せつ菜", 4, 1, false, "SETU1"],
    ["三船 栞子", 4, 1, false, "SHIK1"],
    ["近江 彼方", 4, 1, false, "KANA1"],
    ["桜坂 しずく", 4, 1, false, "SHIZ1"],
    ["宮下 愛", 4, 1, false, "AI001"],
    ["エマ・ヴェルデ", 4, 1, false, "EMMA1"],
    ["朝香 果林", 4, 1, false, "KARI1"],
    ["上原 歩夢", 4, 1, false, "AYUM1"],
    ["鐘 嵐珠", 1, 1, false, "LANZ1"],
    ["ミア・テイラー", 3, 1, true, "MIA01"],
  ];
  return rows.map(function (row, i) {
    return sampleRow(row[0], row[1], row[2], row[3], row[4], list[i % list.length]);
  });
}

function sampleRow(name, wins, losses, dropped, deckCode, deckMap) {
  const p = normalizePlayer({
    id: newPlayerId(),
    name: name,
    wins: wins,
    losses: losses,
    dropped: dropped,
    deckCode: deckCode,
    deckMap: deckMap,
    recipeText: deckMapToRecipeText(deckMap),
  });
  return p;
}

function copyResult() {
  const pick = currentAdvancePick();
  const headline = state.settings.boardHeadline || "決勝ラウンド進出者";
  const nameLines = pick.names.map(function (p) {
    return p.name || "（無名）";
  });
  const result = compute();
  const lines = [
    headline,
    nameLines.join("\n") || "（進出者なし）",
    "",
    "予選抜け " +
      pick.advanceCount +
      " / 全勝 " +
      pick.undefeated.length +
      " / 使用率選抜 " +
      pick.usage.length +
      (pick.lottery && pick.lottery.length ? " / 抽選待ち " + pick.lottery.length : "") +
      (pick.shortfall ? " / 不足 " + pick.shortfall : ""),
    "",
    "--- 運営メモ（選手に見せない） ---",
    "区分\t名前\t勝\t負\tポイント\t結果",
  ];
  result.players.forEach(function (p) {
    const adv = advancementLabel(result, p.id);
    const kind = p.dropped ? "リタイア" : isRecord(p);
    lines.push([kind, p.name, p.wins, p.losses, p.hasRecipe ? p.points : "", adv.label].join("\t"));
  });
  const text = lines.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () {
        showToast("進出者名をコピーしました（主催者用。公式は選手にポイント非公開）");
      },
      function () {
        fallbackCopy(text);
      },
    );
  } else {
    fallbackCopy(text);
  }
}

function isRecord(p) {
  if (p.losses === 0 && p.wins > 0 && !p.dropped) return "全勝";
  if (p.losses === 1 && !p.dropped) return "1敗";
  return "その他";
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast("進出者名をコピーしました");
  } catch (_) {
    showToast("コピーできませんでした");
  }
  ta.remove();
}

function closeDialog(id) {
  const dlg = document.getElementById(id);
  if (dlg && typeof dlg.close === "function") dlg.close();
}

function openDialog(id) {
  const dlg = document.getElementById(id);
  if (dlg && typeof dlg.showModal === "function") dlg.showModal();
}

export function showTournamentView() {
  if (!document.getElementById("view-tournament")) {
    showToast("トーナメント画面を読み込めません。ページを再読込（Cmd+Shift+R）してください。");
    return;
  }
  showAppView("tournament");
  render();
}

export function initTournament() {
  loadState();
  if (wired) {
    if (/^#tournament\/?$/i.test(location.hash || "")) showTournamentView();
    return;
  }
  wired = true;

  document.getElementById("btn-tournament-back")?.addEventListener("click", function () {
    showDeckBuilderView();
  });
  document.getElementById("btn-tourney-guide")?.addEventListener("click", function () {
    openDialog("dlg-tourney-guide");
  });

  ["input-tourney-title", "input-tourney-tonamel", "input-tourney-date"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", function () {
      readSettingsFromForm();
      persistAndRender();
    });
  });
  ["input-tourney-capacity", "input-tourney-swiss", "input-tourney-finals", "input-tourney-advance-count", "input-tourney-undefeated-count"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", function () {
      readSettingsFromForm();
      if (id === "input-tourney-advance-count" && state.settings.advanceCount) {
        state.settings.finalsSlots = state.settings.advanceCount;
      }
      persistAndRender();
    });
  });
  document.getElementById("input-tourney-board-headline")?.addEventListener("change", function () {
    readSettingsFromForm();
    persistAndRender();
  });
  document.getElementById("input-tourney-usage-headline")?.addEventListener("change", function () {
    readSettingsFromForm();
    persistAndRender();
  });
  document.getElementById("tourney-usage-count")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-usage-count]");
    if (!btn) return;
    setUsageRankCount(btn.getAttribute("data-usage-count"));
  });
  document.getElementById("btn-tourney-copy-dist")?.addEventListener("click", copyDeckDist);
  document.getElementById("btn-tourney-show-dist-chart")?.addEventListener("click", openDistChartBoard);
  document.getElementById("btn-tourney-dist-image")?.addEventListener("click", exportDistChartImage);
  function handleDistArtClick(ev, allowSelect) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return false;
    if (t.closest(".tourney-dist-name-field") || t.closest(".tourney-dist-assign")) {
      ev.stopPropagation();
      return true;
    }
    const thumb = t.closest("[data-thumb-id]");
    if (thumb) {
      ev.preventDefault();
      ev.stopPropagation();
      const wrap = thumb.closest(".tourney-dist-art") || thumb.closest(".tourney-dist-thumbs");
      setClusterThumb(wrap ? wrap.getAttribute("data-cluster-key") : "", thumb.getAttribute("data-thumb-id"));
      return true;
    }
    const zoomBtn = t.closest("[data-pan-zoom]");
    if (zoomBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      const art = zoomBtn.closest(".tourney-dist-art");
      const key = art ? art.getAttribute("data-cluster-key") : "";
      const pos = clusterThumbPos(key);
      const act = zoomBtn.getAttribute("data-pan-zoom");
      if (act === "in") setClusterThumbPos(key, { x: pos.x, y: pos.y, z: pos.z * 1.12 });
      else if (act === "out") setClusterThumbPos(key, { x: pos.x, y: pos.y, z: pos.z / 1.12 });
      else setClusterThumbPos(key, defaultThumbPos());
      return true;
    }
    if (!allowSelect) return false;
    const btn = t.closest("[data-select]");
    if (!btn) return false;
    state.selectedId = btn.getAttribute("data-select") || "";
    persistAndRender();
    openDeckView(state.selectedId);
    return true;
  }
  document.getElementById("tourney-deck-dist")?.addEventListener("click", function (ev) {
    handleDistArtClick(ev, true);
  });
  document.getElementById("tourney-dist-icons")?.addEventListener("click", function (ev) {
    handleDistArtClick(ev, false);
  });
  document.getElementById("tourney-dist-board")?.addEventListener("click", function (ev) {
    handleDistArtClick(ev, false);
  });
  (function bindDistPan() {
    let panDrag = null;
    function bindHost(host) {
      if (!host) return;
      host.addEventListener("pointerdown", function (ev) {
        const canvas = ev.target instanceof Element ? ev.target.closest(".tourney-dist-pan-canvas") : null;
        if (!(canvas instanceof HTMLCanvasElement)) return;
        ev.preventDefault();
        ev.stopPropagation();
        const key = canvas.getAttribute("data-pan-key") || "";
        panDrag = {
          pointerId: ev.pointerId,
          key: key,
          x0: ev.clientX,
          y0: ev.clientY,
          pos: clusterThumbPos(key),
          size: canvas.getBoundingClientRect().width || 88,
        };
        try {
          canvas.setPointerCapture(ev.pointerId);
        } catch (e) {}
      });
      host.addEventListener("pointermove", function (ev) {
        if (!panDrag || ev.pointerId !== panDrag.pointerId) return;
        ev.preventDefault();
        const cover = Math.max(24, panDrag.size * panDrag.pos.z);
        setClusterThumbPos(
          panDrag.key,
          {
            x: panDrag.pos.x - (ev.clientX - panDrag.x0) / cover,
            y: panDrag.pos.y - (ev.clientY - panDrag.y0) / cover,
            z: panDrag.pos.z,
          },
          { persist: false, chart: false },
        );
      });
      function endPan(ev) {
        if (!panDrag || (ev && ev.pointerId !== panDrag.pointerId)) return;
        panDrag = null;
        persist();
        refreshDistCharts();
      }
      host.addEventListener("pointerup", endPan);
      host.addEventListener("pointercancel", endPan);
      host.addEventListener(
        "wheel",
        function (ev) {
          const canvas = ev.target instanceof Element ? ev.target.closest(".tourney-dist-pan-canvas") : null;
          if (!canvas) return;
          ev.preventDefault();
          const key = canvas.getAttribute("data-pan-key") || "";
          const pos = clusterThumbPos(key);
          const z = ev.deltaY > 0 ? pos.z / 1.08 : pos.z * 1.08;
          setClusterThumbPos(key, { x: pos.x, y: pos.y, z: z }, { persist: false, chart: false });
        },
        { passive: false },
      );
    }
    bindHost(document.getElementById("view-tournament"));
    bindHost(document.getElementById("tourney-dist-board"));
  })();
  document.getElementById("tourney-deck-dist")?.addEventListener("change", function (ev) {
    const t = ev.target;
    if (t instanceof HTMLSelectElement && t.getAttribute("data-cluster-assign")) {
      setClusterAssign(t.getAttribute("data-cluster-assign"), t.value);
      return;
    }
    if (!(t instanceof HTMLInputElement)) return;
    const key = t.getAttribute("data-cluster-key");
    if (!key) return;
    setClusterName(key, t.value);
    const details = t.closest(".tourney-dist-cluster");
    const lab = details && details.querySelector(".tourney-dist-label");
    if (lab) lab.textContent = String(t.value || "").trim() || t.getAttribute("placeholder") || "";
    refreshDistCharts();
  });
  document.getElementById("tourney-dist-chart-kind")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-chart-kind]");
    if (!btn) return;
    setDistChartKind(btn.getAttribute("data-chart-kind"));
  });
  document.getElementById("tourney-dist-sort")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-dist-sort]");
    if (!btn) return;
    setDistSort(btn.getAttribute("data-dist-sort"));
  });

  document.getElementById("btn-tourney-preset")?.addEventListener("click", applyPresetKoboshi);
  document.getElementById("btn-tourney-add")?.addEventListener("click", addPlayer);
  document.getElementById("btn-tourney-sample")?.addEventListener("click", function () {
    if (state.players.length && !window.confirm("動作確認用の12人で現在の選手を置き換えますか？")) return;
    loadSample();
  });
  document.getElementById("btn-tourney-trial")?.addEventListener("click", applyTrialFill);
  document.getElementById("btn-tourney-trial-clear")?.addEventListener("click", clearTrialFill);
  document.getElementById("btn-tourney-clear")?.addEventListener("click", function () {
    if (!state.players.length) return;
    if (!window.confirm("選手を全員削除しますか？（大会設定は残します）")) return;
    pushUndo();
    state.players = [];
    state.trialBackup = null;
    state.selectedId = "";
    persistAndRender();
  });
  document.getElementById("btn-tourney-import-open")?.addEventListener("click", function () {
    openDialog("dlg-tourney-import");
  });
  document.getElementById("btn-tourney-import-add")?.addEventListener("click", function () {
    importPlayers(false, "tourney-import-text");
  });
  document.getElementById("btn-tourney-import-records")?.addEventListener("click", function () {
    const ta = document.getElementById("tourney-import-text");
    applyRecordsFromText(ta ? ta.value : "");
  });
  document.getElementById("btn-tourney-import-replace")?.addEventListener("click", function () {
    importPlayers(true, "tourney-import-text");
  });
  document.getElementById("btn-tourney-import-merge")?.addEventListener("click", function () {
    const ta = document.getElementById("tourney-import-text");
    mergeRosterFromText(ta ? ta.value : "");
    closeDialog("dlg-tourney-import");
  });
  document.getElementById("btn-tourney-import-close")?.addEventListener("click", function () {
    closeDialog("dlg-tourney-import");
  });
  document.getElementById("btn-tourney-copy")?.addEventListener("click", copyResult);
  document.getElementById("btn-tourney-fill-counts")?.addEventListener("click", fillCountsFromCompute);
  document.getElementById("btn-tourney-show-board")?.addEventListener("click", openAdvanceBoard);
  document.getElementById("btn-tourney-show-usage")?.addEventListener("click", openUsageBoard);
  document.getElementById("btn-tourney-copy-usage")?.addEventListener("click", copyUsageRanks);
  document.getElementById("btn-tourney-usage-image")?.addEventListener("click", exportUsageRankImage);
  document.getElementById("btn-tourney-quick-import")?.addEventListener("click", function () {
    importPlayers(true, "tourney-quick-paste");
  });
  document.getElementById("btn-tourney-quick-add")?.addEventListener("click", function () {
    importPlayers(false, "tourney-quick-paste");
  });
  document.getElementById("btn-tourney-csv")?.addEventListener("click", function () {
    const input = document.getElementById("input-tourney-csv");
    if (input) input.click();
  });
  document.getElementById("input-tourney-csv")?.addEventListener("change", function (ev) {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || !input.files || !input.files[0]) return;
    applyCsvFile(input.files[0], false);
    input.value = "";
  });
  document.getElementById("btn-tourney-apply-records")?.addEventListener("click", function () {
    const ta = document.getElementById("tourney-quick-paste");
    applyRecordsFromText(ta ? ta.value : "");
  });
  document.getElementById("btn-tourney-records-csv")?.addEventListener("click", function () {
    const input = document.getElementById("input-tourney-records-csv");
    if (input) input.click();
  });
  document.getElementById("input-tourney-records-csv")?.addEventListener("change", function (ev) {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || !input.files || !input.files[0]) return;
    applyCsvFile(input.files[0], true);
    input.value = "";
  });
  const pasteTa = document.getElementById("tourney-quick-paste");
  pasteTa?.addEventListener("dragover", function (ev) {
    ev.preventDefault();
  });
  pasteTa?.addEventListener("drop", function (ev) {
    ev.preventDefault();
    const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (file) applyCsvFile(file);
  });
  document.getElementById("tourney-quick-paste")?.addEventListener("keydown", function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
      ev.preventDefault();
      importPlayers(true, "tourney-quick-paste");
    }
  });
  document.getElementById("tourney-bulk-decks")?.addEventListener("keydown", function (ev) {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === "Enter") {
      ev.preventDefault();
      applyBulkDecks();
    }
  });
  document.getElementById("input-tourney-filter-pool")?.addEventListener("change", function () {
    readSettingsFromForm();
    persistAndRender();
  });
  document.getElementById("tourney-roster-flags")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const unpaidBtn = t.closest("[data-roster-unpaid]");
    if (unpaidBtn) {
      state.settings.rosterIncludeUnpaid = unpaidBtn.getAttribute("data-roster-unpaid") === "1";
      persistAndRender();
      if (state.lastRosterText) reapplyLastRoster();
      return;
    }
    const enteredBtn = t.closest("[data-roster-entered]");
    if (enteredBtn) {
      state.settings.rosterIncludeEntered = enteredBtn.getAttribute("data-roster-entered") === "1";
      persistAndRender();
      if (state.lastRosterText) reapplyLastRoster();
    }
  });
  document.getElementById("tourney-pool-range")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const preset = t.closest("[data-pool-preset]");
    if (preset) {
      const id = preset.getAttribute("data-pool-preset");
      if (id === "2plus") {
        state.settings.poolMinWins = 2;
        state.settings.poolMaxWins = null;
      } else if (id === "0-4") {
        state.settings.poolMinWins = 0;
        state.settings.poolMaxWins = 4;
      } else if (id === "2-4") {
        state.settings.poolMinWins = 2;
        state.settings.poolMaxWins = 4;
      } else if (id === "0plus") {
        state.settings.poolMinWins = 0;
        state.settings.poolMaxWins = null;
      }
      persistAndRender();
      return;
    }
    const minBtn = t.closest("[data-pool-min]");
    if (minBtn) {
      const n = Math.max(0, Math.min(4, Number(minBtn.getAttribute("data-pool-min")) || 0));
      state.settings.poolMinWins = n;
      if (state.settings.poolMaxWins != null && state.settings.poolMaxWins < n) {
        state.settings.poolMaxWins = n;
      }
      persistAndRender();
      return;
    }
    const maxBtn = t.closest("[data-pool-max]");
    if (maxBtn) {
      const n = Number(maxBtn.getAttribute("data-pool-max"));
      if (n < 0) state.settings.poolMaxWins = null;
      else {
        state.settings.poolMaxWins = Math.max(0, Math.min(4, n));
        if (state.settings.poolMinWins > state.settings.poolMaxWins) {
          state.settings.poolMinWins = state.settings.poolMaxWins;
        }
      }
      persistAndRender();
    }
  });
  document.getElementById("btn-tourney-board-close")?.addEventListener("click", closeAdvanceBoard);
  document.getElementById("btn-tourney-board-fs")?.addEventListener("click", toggleAdvanceBoardFullscreen);
  document.getElementById("btn-tourney-usage-board-close")?.addEventListener("click", closeUsageBoard);
  document.getElementById("btn-tourney-usage-board-fs")?.addEventListener("click", toggleUsageBoardFullscreen);
  document.getElementById("btn-tourney-usage-board-image")?.addEventListener("click", exportUsageRankImage);
  document.getElementById("btn-tourney-dist-board-close")?.addEventListener("click", closeDistChartBoard);
  document.getElementById("btn-tourney-dist-board-fs")?.addEventListener("click", toggleDistChartFullscreen);
  document.getElementById("btn-tourney-dist-board-image")?.addEventListener("click", exportDistChartImage);
  document.getElementById("tourney-usage-preview")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-card-no]");
    if (!btn) return;
    openCatalogForCardNo(btn.getAttribute("data-card-no") || "");
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    const board = document.getElementById("tourney-board");
    if (board && !board.hidden) {
      ev.preventDefault();
      closeAdvanceBoard();
      return;
    }
    const usageBoard = document.getElementById("tourney-usage-board");
    if (usageBoard && !usageBoard.hidden) {
      ev.preventDefault();
      closeUsageBoard();
      return;
    }
    const distBoard = document.getElementById("tourney-dist-board");
    if (distBoard && !distBoard.hidden) {
      ev.preventDefault();
      closeDistChartBoard();
      return;
    }
    const deckView = document.getElementById("tourney-deck-view");
    if (deckView && !deckView.hidden) {
      ev.preventDefault();
      closeDeckView();
    }
  });

  const tbody = document.getElementById("tourney-players-body");
  tbody?.addEventListener("change", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tr = t.closest("tr[data-player-id]");
    if (!tr) return;
    const p = findPlayer(tr.getAttribute("data-player-id") || "");
    if (!p) return;
    const field = t.getAttribute("data-field");
    if (field === "name" || field === "deckCode") p[field] = t instanceof HTMLInputElement ? t.value : "";
    if (field === "wins" || field === "losses" || field === "draws") p[field] = Math.max(0, Math.floor(Number(t instanceof HTMLInputElement ? t.value : 0) || 0));
    if (field === "dropped") p.dropped = t instanceof HTMLInputElement ? t.checked : false;
    persistAndRender();
  });
  tbody?.addEventListener("focusin", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tr = t.closest("tr[data-player-id]");
    if (!tr) return;
    state.selectedId = tr.getAttribute("data-player-id") || "";
  });
  tbody?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tr = t.closest("tr[data-player-id]");
    if (!tr) return;
    const id = tr.getAttribute("data-player-id") || "";
    const act = t.closest("[data-act]");
    const action = act && act.getAttribute("data-act");
    if (action === "del") {
      pushUndo();
      state.players = state.players.filter(function (p) {
        return p.id !== id;
      });
      if (state.selectedId === id) state.selectedId = "";
      persistAndRender();
      return;
    }
    state.selectedId = id;
    if (action === "recipe") {
      openDeckView(id);
      return;
    }
    if (t.closest("input,textarea,select")) {
      render({ skipPlayers: true });
      return;
    }
    render();
  });

  document.getElementById("tourney-advance")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-select]");
    if (!btn) return;
    state.selectedId = btn.getAttribute("data-select") || "";
    persistAndRender();
  });

  document.getElementById("tourney-player-detail")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "btn-tourney-open-deck-view") {
      openDeckView(state.selectedId);
      return;
    }
    const lineBtn = t.closest("[data-point-line]");
    if (lineBtn) {
      setDeckPointLine(lineBtn.getAttribute("data-point-line") || "w2");
      return;
    }
    const cardRow = t.closest("[data-card-no]");
    if (cardRow) {
      openCatalogForCardNo(cardRow.getAttribute("data-card-no") || "");
      return;
    }
    if (t.id !== "btn-tourney-apply-recipe") return;
    const p = findPlayer(state.selectedId);
    const ta = document.getElementById("tourney-recipe-text");
    if (!p || !(ta instanceof HTMLTextAreaElement)) return;
    applyRecipeText(p, ta.value);
    persistAndRender();
    showToast("レシピを反映しました（" + deckMapTotal(p.deckMap) + "枚）");
  });

  document.getElementById("btn-tourney-deck-view-close")?.addEventListener("click", closeDeckView);
  document.getElementById("tourney-deck-view")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "tourney-deck-view") {
      closeDeckView();
      return;
    }
    const lineBtn = t.closest("[data-point-line]");
    if (lineBtn) {
      setDeckPointLine(lineBtn.getAttribute("data-point-line") || "w2");
      return;
    }
    const cardRow = t.closest("[data-card-no]");
    if (cardRow) {
      openCatalogForCardNo(cardRow.getAttribute("data-card-no") || "");
    }
  });

  document.getElementById("btn-tourney-roster-merge")?.addEventListener("click", function () {
    const ta = document.getElementById("tourney-quick-paste");
    mergeRosterFromText(ta ? ta.value : "");
  });
  document.getElementById("btn-tourney-undo")?.addEventListener("click", undoLast);
  document.getElementById("btn-tourney-export")?.addEventListener("click", exportEventJson);
  document.getElementById("btn-tourney-import-json")?.addEventListener("click", function () {
    const input = document.getElementById("input-tourney-json");
    if (input) input.click();
  });
  document.getElementById("input-tourney-json")?.addEventListener("change", function (ev) {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || !input.files || !input.files[0]) return;
    importEventJsonFile(input.files[0]);
    input.value = "";
  });
  document.getElementById("btn-tourney-export-results")?.addEventListener("click", exportResultsCsv);
  document.getElementById("btn-tourney-saved-decks")?.addEventListener("click", applySavedDecksByName);
  document.getElementById("btn-tourney-bulk-decks")?.addEventListener("click", applyBulkDecks);
  document.getElementById("btn-tourney-lottery")?.addEventListener("click", rollLottery);
  document.getElementById("tourney-event-select")?.addEventListener("change", function (ev) {
    const t = ev.target;
    if (t instanceof HTMLSelectElement) switchEvent(t.value);
  });
  document.getElementById("btn-tourney-event-new")?.addEventListener("click", newBlankEvent);
  document.getElementById("btn-tourney-event-dup")?.addEventListener("click", duplicateEvent);
  document.getElementById("tourney-col-deckcode")?.addEventListener("change", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLSelectElement)) return;
    state.columnMap = Object.assign({}, state.columnMap, { deckCode: t.value });
    persistAndRender();
    if (state.lastRosterText) reapplyLastRoster();
  });
  document.getElementById("input-tourney-player-q")?.addEventListener("input", function (ev) {
    const t = ev.target;
    state.playerQuery = t instanceof HTMLInputElement ? t.value : "";
    renderPlayers(compute());
  });
  document.getElementById("select-tourney-player-sort")?.addEventListener("change", function (ev) {
    const t = ev.target;
    state.playerSort = t instanceof HTMLSelectElement ? t.value : "default";
    persistAndRender();
  });
  document.getElementById("tourney-card-kind")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-card-kind]");
    if (!btn) return;
    state.cardKindFilter = btn.getAttribute("data-card-kind") || "all";
    persistAndRender();
  });
  document.getElementById("tourney-ops-notes")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-select]");
    if (!btn) return;
    state.selectedId = btn.getAttribute("data-select") || "";
    persistAndRender();
    openDeckView(state.selectedId);
  });

  document.addEventListener("keydown", function (ev) {
    if (!(ev.metaKey || ev.ctrlKey) || ev.key !== "z" || ev.shiftKey) return;
    const t = ev.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
    if (!document.getElementById("view-tournament") || document.getElementById("view-tournament").hidden) return;
    ev.preventDefault();
    undoLast();
  });

  if (/^#tournament\/?$/i.test(location.hash || "")) showTournamentView();
}
