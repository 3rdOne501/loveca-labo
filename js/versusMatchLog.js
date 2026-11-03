/** @typedef {{ t: number, text: string, act?: string, undoDepth?: number, groupId?: string }} VersusMatchLogEntry */

const MAX_ENTRIES = 200;
const GROUP_WINDOW_MS = 1400;

/** @type {VersusMatchLogEntry[]} */
let entries = [];
/** @type {HTMLElement|null} */
let panelEl = null;
/** @type {HTMLElement|null} */
let listEl = null;
/** @type {boolean} */
let expanded = false;
/** @type {((undoDepth: number) => void) | null} */
let undoJumpHandler = null;

/** @param {(undoDepth: number) => void} handler */
export function setPlayMatchLogUndoJump(handler) {
  undoJumpHandler = typeof handler === "function" ? handler : null;
}

/** @param {string} act @param {object} [meta] @returns {string} */
export function formatVersusMatchLogEntry(act, meta) {
  meta = meta || {};
  switch (act) {
    case "turn-phase-start":
      return "ターン " + (meta.turnCount != null ? meta.turnCount : "?") + " を開始しました";
    case "mulligan":
      return "マリガン: " + (meta.returned != null ? meta.returned : 0) + " 枚戻して " + (meta.drawn != null ? meta.drawn : 0) + " 枚引き直し";
    case "mulligan-commit-zero":
      return "マリガン: 0 枚で確定";
    case "live-turn-begin":
      return "ライブターンを開始（手札整理 " + (meta.nonLiveMoved != null ? meta.nonLiveMoved : 0) + " 枚）";
    case "live-turn-to-live":
      return "ライブカードを " + (meta.placed != null ? meta.placed : 0) + " 枚セット";
    case "play-effect-resolved":
      return (
        "効果を解決（" +
        (meta.kind || "能力") +
        (meta.cardName ? " · " + meta.cardName : "") +
        "）"
      );
    case "drag-move":
      return meta.count && meta.count > 1 ? "カードを " + meta.count + " 枚移動" : "カードを移動";
    case "undo":
      return "操作を取り消し";
    case "redo":
      return "操作をやり直し";
    case "versus-turn-end":
      return meta.label ? String(meta.label) : "ターン終了";
    case "versus-live-set-done":
      return (meta.roleLabel || "プレイヤー") + ": ライブセット完了";
    case "versus-live-perf-done":
      return (meta.roleLabel || "プレイヤー") + ": パフォーマンス完了（スコア " + (meta.score != null ? meta.score : "?") + "）";
    case "versus-live-judgment":
      return "ライブ判定: " + (meta.summary || "勝敗確定");
    case "versus-live-success-fx":
      return (meta.roleLabel || "プレイヤー") + ": 成功時効果";
    case "versus-match-end":
      return meta.summary ? String(meta.summary) : "試合終了";
    case "live-mechanical-fail-flush":
      return "ライブ失敗: ライブカード " + (meta.count != null ? meta.count : "?") + " 枚を控え室へ";
    case "live-win-mandatory-move":
      return "成功ライブへ " + (meta.moved != null ? meta.moved : 1) + " 枚移動";
    default:
      if (meta.label) return String(meta.label);
      return act && act !== "?" ? String(act) : "操作";
  }
}

function findLogMount() {
  var mount = document.getElementById("play-match-log-mount");
  if (mount) return mount;
  var chrome = document.getElementById("versus-play-chrome");
  if (chrome) return chrome;
  return null;
}

function ensurePanel() {
  if (panelEl && listEl) return;
  var mount = findLogMount();
  if (!mount) return;
  panelEl = document.createElement("details");
  panelEl.id = "versus-match-log-panel";
  panelEl.className = "versus-match-log-panel";
  var summary = document.createElement("summary");
  summary.className = "versus-match-log-panel__summary";
  summary.textContent = "プレイログ";
  listEl = document.createElement("div");
  listEl.className = "versus-match-log-panel__list";
  listEl.setAttribute("role", "log");
  listEl.setAttribute("aria-live", "polite");
  panelEl.appendChild(summary);
  panelEl.appendChild(listEl);
  mount.appendChild(panelEl);
  panelEl.addEventListener("toggle", function () {
    expanded = panelEl.open === true;
  });
}

/**
 * @param {VersusMatchLogEntry[]} raw
 * @returns {Array<VersusMatchLogEntry & { count?: number }>}
 */
function groupLogEntries(raw) {
  /** @type {Array<VersusMatchLogEntry & { count?: number }>} */
  var out = [];
  raw.forEach(function (e) {
    var prev = out[out.length - 1];
    var mergeActs = { "drag-move": true, "play-effect-resolved": true };
    if (
      prev &&
      e.act &&
      prev.act === e.act &&
      mergeActs[e.act] &&
      Math.abs(e.t - prev.t) <= GROUP_WINDOW_MS
    ) {
      prev.count = (prev.count || 1) + 1;
      if (e.act === "drag-move") prev.text = "カードを " + prev.count + " 枚移動";
      return;
    }
    out.push(Object.assign({}, e, { count: 1 }));
  });
  return out;
}

function renderList() {
  if (!listEl) return;
  listEl.textContent = "";
  if (!entries.length) {
    var empty = document.createElement("p");
    empty.className = "versus-match-log-panel__empty muted";
    empty.textContent = "まだログがありません";
    listEl.appendChild(empty);
    return;
  }
  groupLogEntries(entries).forEach(function (e) {
    var row = document.createElement("button");
    row.type = "button";
    row.className = "versus-match-log-panel__row";
    if (e.undoDepth != null && undoJumpHandler) {
      row.classList.add("versus-match-log-panel__row--jumpable");
      row.title = "この時点の盤面へ戻す（Undo）";
    }
    var time = document.createElement("time");
    time.className = "versus-match-log-panel__time";
    try {
      time.dateTime = new Date(e.t).toISOString();
      time.textContent = new Date(e.t).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (_) {
      time.textContent = "";
    }
    var txt = document.createElement("span");
    txt.className = "versus-match-log-panel__text";
    txt.textContent = e.text;
    row.appendChild(time);
    row.appendChild(txt);
    if (e.undoDepth != null && undoJumpHandler) {
      row.addEventListener("click", function () {
        undoJumpHandler(e.undoDepth);
      });
    }
    listEl.appendChild(row);
  });
}

/** @param {string} text @param {{ act?: string, undoDepth?: number }} [opts] */
export function appendVersusMatchLog(text, opts) {
  if (!text || !String(text).trim()) return;
  ensurePanel();
  entries.unshift({
    t: Date.now(),
    text: String(text).trim(),
    act: opts && opts.act ? opts.act : undefined,
    undoDepth: opts && opts.undoDepth != null ? opts.undoDepth : undefined,
  });
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  if (panelEl) panelEl.hidden = false;
  renderList();
}

/** @param {string} act @param {object} [meta] */
export function appendVersusMatchLogFromReplay(act, meta) {
  meta = meta || {};
  appendVersusMatchLog(formatVersusMatchLogEntry(act, meta), {
    act: act,
    undoDepth: meta.undoDepth != null ? meta.undoDepth : undefined,
  });
}

export function clearVersusMatchLog() {
  entries = [];
  if (listEl) renderList();
  if (panelEl) panelEl.hidden = true;
}

export function showVersusMatchLogPanel(show) {
  ensurePanel();
  if (panelEl) panelEl.hidden = !show;
}

/** @param {boolean} open */
export function setVersusMatchLogExpanded(open) {
  expanded = !!open;
  if (panelEl) panelEl.open = expanded;
}
