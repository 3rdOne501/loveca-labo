/**
 * トーナメント画面（主催者用）と使用率選抜。
 * となめるの参加者 API は公開されていないため、選手は貼り付け / 手入力。
 * デッキコードは DECK LOG の共有コードとして記録し、ブラウザから API は叩かない。
 */
import { catalogCardIdentityKey, catalogListThumbnailUrl, getCard, getCardCatalogSnapshot } from "./cards.js";
import { MAIN_SIZE, STORAGE_TOURNAMENT, T_ENERGY, T_LIVE, T_MEMBER } from "./config.js";
import { extractDeckRecipeLines, parseDeckTextRecipe } from "./decklogImport.js";
import { isBuiltInStarterDeckId, loadDeckLibrary } from "./deckLibrary.js";
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
  if (Number(settings.usageRankCount) === 30 && String(settings.usageBoardHeadline || "") === "使用率ポイント 1〜30位") {
    settings.usageRankCount = 50;
    settings.usageBoardHeadline = "使用率ポイント 1〜50位";
  }
  settings.usageRankCount = Math.max(1, Math.min(80, Number(settings.usageRankCount) || 50));
  settings.usageBoardHeadline = String(settings.usageBoardHeadline || "使用率ポイント 1〜50位");
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

function cardThumbHtml(card) {
  if (!card) return '<span class="deck-thumb deck-thumb-missing" title="カードデータなし"></span>';
  const full = card.img ? String(card.img) : "";
  if (!full) return '<span class="deck-thumb deck-thumb-missing" title="画像なし"></span>';
  const src = catalogListThumbnailUrl(full) || full;
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
  setVal("input-tourney-usage-count", s.usageRankCount != null ? s.usageRankCount : 50);
  setVal("input-tourney-usage-headline", s.usageBoardHeadline || "使用率ポイント 1〜50位");
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
  const usageCountEl = document.getElementById("input-tourney-usage-count");
  if (usageCountEl && String(usageCountEl.value).trim() !== "") {
    s.usageRankCount = Math.max(1, Math.min(80, numVal("input-tourney-usage-count", 50)));
  } else {
    s.usageRankCount = 50;
  }
  s.usageBoardHeadline = strVal("input-tourney-usage-headline") || "使用率ポイント 1〜50位";
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
  if (opts.skipPlayers) highlightSelectedRow();
  else renderPlayers(result);
  renderAdvance(result);
  renderOutputBoard(result);
  renderCards(result);
  renderUsagePreview(result);
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
  tb.innerHTML = rows
    .map(function (p) {
      const adv = advancementLabel(result, p.id);
      const rec = recipeStatus(p);
      const scored = result.players.find(function (x) {
        return x.id === p.id;
      });
      const selected = state.selectedId === p.id ? " is-selected" : "";
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
        "<td><button type=\"button\" class=\"btn sm secondary\" data-act=\"recipe\" title=\"デッキ一覧を開く\">" +
        rec.text +
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
  if (!usage || usage.hidden) document.body.classList.remove("tourney-board-open");
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
  return Math.max(1, Math.min(80, Number(state.settings.usageRankCount) || 50));
}

const USAGE_ART_RANKS = 30;

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
      withArt: i < USAGE_ART_RANKS,
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

function usageHeadlineText() {
  return state.settings.usageBoardHeadline || "使用率ポイント 1〜" + usageRankLimit() + "位";
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
        " 位・1〜30 は画像）"
      : "レシピが集まると、カードごとのポイント内訳が出ます。";
  }
  if (!list) return;
  if (!rows.length) {
    list.innerHTML = "<p class=\"muted\">上の集計範囲のデッキが入ると、ここに 1〜50 位が並びます。</p>";
    return;
  }
  list.innerHTML = rows
    .map(function (row) {
      const art = row.withArt ? cardThumbHtml(row.card) : "";
      return (
        "<button type=\"button\" class=\"tourney-usage-preview-item" +
        (row.withArt ? " is-art" : " is-text") +
        "\" data-card-no=\"" +
        escapeHtml(row.cardNo) +
        "\"><span class=\"tourney-usage-rank\">" +
        row.rank +
        "</span>" +
        art +
        "<span class=\"tourney-usage-name\">" +
        escapeHtml(row.withArt ? row.charName : row.typeNo + "　" + row.charName) +
        "</span><span class=\"tourney-pts\">" +
        (row.withArt ? row.points + "P" : "") +
        "</span></button>"
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
  const eventEl = document.getElementById("tourney-usage-board-event");
  const headEl = document.getElementById("tourney-usage-board-headline");
  const metaEl = document.getElementById("tourney-usage-board-meta");
  const listEl = document.getElementById("tourney-usage-board-list");
  const textEl = document.getElementById("tourney-usage-board-list-text");
  const subEl = document.getElementById("tourney-usage-board-subhead");
  if (eventEl) eventEl.textContent = state.settings.title || "";
  if (headEl) headEl.textContent = usageHeadlineText();
  if (metaEl) {
    metaEl.textContent =
      poolRangeLabel(state.settings.poolMinWins, state.settings.poolMaxWins) + "　" + cardKindFilterLabel();
  }
  const artRows = rows.filter(function (row) {
    return row.withArt;
  });
  const textRows = rows.filter(function (row) {
    return !row.withArt;
  });
  if (listEl) {
    listEl.innerHTML = artRows
      .map(function (row) {
        return (
          "<li class=\"is-art\"><span class=\"tourney-usage-board-rank\">" +
          row.rank +
          "</span>" +
          cardThumbHtml(row.card) +
          "<span class=\"tourney-usage-board-copy\"><span class=\"tourney-usage-board-name\">" +
          escapeHtml(row.charName) +
          "</span><span class=\"tourney-usage-board-type\">" +
          escapeHtml(row.typeNo) +
          "</span></span><span class=\"tourney-usage-board-pts\">" +
          row.points +
          "P</span></li>"
        );
      })
      .join("");
  }
  if (subEl) {
    subEl.hidden = !textRows.length;
    subEl.textContent = "31〜50位";
  }
  if (textEl) {
    textEl.hidden = !textRows.length;
    textEl.innerHTML = textRows
      .map(function (row) {
        return (
          "<li class=\"is-text\"><span class=\"tourney-usage-board-rank\">" +
          row.rank +
          "</span><span class=\"tourney-usage-board-type\">" +
          escapeHtml(row.typeNo) +
          "</span><span class=\"tourney-usage-board-name\">" +
          escapeHtml(row.charName) +
          "</span></li>"
        );
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
  if (!advance || advance.hidden) document.body.classList.remove("tourney-board-open");
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
  if (replace) state.players = incoming;
  else state.players = state.players.concat(incoming);
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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
  }, 1000);
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
  pushUndo();
  state.settings = defaultSettings();
  state.players = buildSamplePlayers();
  state.selectedId = state.players[0] ? state.players[0].id : "";
  autoFillOutputCountsSilent();
  persistAndRender();
  showToast("動作確認用の12人を入れました。進出者を出せます");
}

function buildSamplePlayers() {
  const pop = { "PL!S-bp5-111-R": 4, "PL!SP-bp5-006-R": 4, "PL!N-pb1-011-R": 4, "PL!S-PR-026-PR": 4 };
  const mid = { "PL!S-bp5-111-R": 2, "PL!SP-bp5-006-R": 2, "PL!HS-PR-022-PR": 4, "PL!S-sd1-008-SD": 2 };
  const uniqA = { "PL!HS-bp5-001-P": 1, "PL!-bp5-007-R": 1, "PL!S-bp2-009-R": 1, "PL!S-pb1-004-R": 1 };
  const uniqB = { "PL!-bp5-003-R＋": 2, "PL!N-bp1-003-R＋": 1, "PL!SP-bp5-001-R＋": 2, "PL!SP-bp2-019-N": 3 };
  return [
    sampleRow("天王寺 璃奈", 5, 0, false, "RINA1", uniqA),
    sampleRow("中須 かすみ", 5, 0, false, "KASU1", pop),
    sampleRow("優木 せつ菜", 4, 1, false, "SETU1", uniqB),
    sampleRow("三船 栞子", 4, 1, false, "SHIK1", uniqA),
    sampleRow("近江 彼方", 4, 1, false, "KANA1", mid),
    sampleRow("桜坂 しずく", 4, 1, false, "SHIZ1", mid),
    sampleRow("宮下 愛", 4, 1, false, "AI001", Object.assign({}, mid, { "PL!S-bp5-111-R": 4 })),
    sampleRow("エマ・ヴェルデ", 4, 1, false, "EMMA1", Object.assign({}, pop, { "PL!S-bp2-016-N": 4 })),
    sampleRow("朝香 果林", 4, 1, false, "KARI1", pop),
    sampleRow("上原 歩夢", 4, 1, false, "AYUM1", pop),
    sampleRow("鐘 嵐珠", 1, 1, false, "LANZ1", pop),
    sampleRow("ミア・テイラー", 3, 1, true, "MIA01", mid),
  ];
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
  ["input-tourney-usage-count", "input-tourney-usage-headline"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", function () {
      readSettingsFromForm();
      persistAndRender();
    });
  });

  document.getElementById("btn-tourney-preset")?.addEventListener("click", applyPresetKoboshi);
  document.getElementById("btn-tourney-add")?.addEventListener("click", addPlayer);
  document.getElementById("btn-tourney-sample")?.addEventListener("click", function () {
    if (state.players.length && !window.confirm("動作確認用の12人で現在の選手を置き換えますか？")) return;
    loadSample();
  });
  document.getElementById("btn-tourney-clear")?.addEventListener("click", function () {
    if (!state.players.length) return;
    if (!window.confirm("選手を全員削除しますか？（大会設定は残します）")) return;
    pushUndo();
    state.players = [];
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
