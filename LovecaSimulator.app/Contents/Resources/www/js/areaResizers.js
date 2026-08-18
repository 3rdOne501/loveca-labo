const STORAGE_KEY = "llocg_area_resize_v1";
const COL_HANDLE_PX = 8;
const LAYOUT_EVENT = "llocg-area-resize-end";

function loadState() {
  try {
    if (typeof localStorage === "undefined") return {};
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

let savedState = {};
try {
  savedState = loadState();
} catch (_) {
  savedState = {};
}
let saveTimer = 0;

function saveStateSoon() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(function () {
    saveTimer = 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
    } catch (_) {
      /* noop */
    }
  }, 120);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function pageScale() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--ll-page-scale");
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function normalizeRatios(values, fallback) {
  const src =
    Array.isArray(values) && values.length === 3 && values.every(function (n) {
      return Number.isFinite(Number(n)) && Number(n) > 0;
    })
      ? values.map(Number)
      : fallback.slice();
  const sum = src[0] + src[1] + src[2];
  if (!(sum > 0)) return fallback.slice();
  return src.map(function (n) {
    return n / sum;
  });
}

function notifyLayoutChanged() {
  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new CustomEvent(LAYOUT_EVENT));
}

function isDeckDesktopSplitters() {
  return window.matchMedia("(min-width: 1101px)").matches;
}

function isPlayDesktopSplitters() {
  return (
    document.body.classList.contains("play-mode") &&
    !document.body.classList.contains("chrome-layout-play-mobile-portrait") &&
    window.matchMedia("(min-width: 901px)").matches
  );
}

/** 対戦分割はスマホでも有効（列幅ハンドルのみデスクトップ） */
function isVersusBoardResizeEnabled() {
  return document.body.classList.contains("play-versus-mode");
}

/** スマホ縦積みの左／中央／右（またはデッキ3パネル）の高さ変更 */
function isPlayStackedResizeEnabled() {
  return (
    document.body.classList.contains("play-mode") &&
    (document.body.classList.contains("chrome-layout-play-mobile-portrait") ||
      (window.matchMedia && window.matchMedia("(max-width: 900px)").matches))
  );
}

function isDeckStackedResizeEnabled() {
  return window.matchMedia && window.matchMedia("(max-width: 1100px)").matches;
}

function syncSplitterVisibility() {
  const deckOn = isDeckDesktopSplitters();
  document.querySelectorAll("#view-deck .builder > .area-resize-handle--column").forEach(function (el) {
    el.hidden = !deckOn;
    el.setAttribute("aria-hidden", deckOn ? "false" : "true");
  });

  const playColsOn = isPlayDesktopSplitters();
  document.querySelectorAll("#view-game .game-board > .area-resize-handle--column").forEach(function (el) {
    el.hidden = !playColsOn;
    el.setAttribute("aria-hidden", playColsOn ? "false" : "true");
  });

  const versusOn = isVersusBoardResizeEnabled();
  const versusHandle = document.querySelector(".area-resize-handle--versus");
  if (versusHandle) {
    versusHandle.hidden = !versusOn;
    versusHandle.setAttribute("aria-hidden", versusOn ? "false" : "true");
  }

  const playStackOn = isPlayStackedResizeEnabled();
  document.querySelectorAll("#view-game .area-resize-handle--row[data-area-resize-stack='play']").forEach(function (el) {
    el.hidden = !playStackOn;
    el.setAttribute("aria-hidden", playStackOn ? "false" : "true");
  });

  const deckStackOn = isDeckStackedResizeEnabled();
  document.querySelectorAll("#view-deck .area-resize-handle--row[data-area-resize-stack='deck']").forEach(function (el) {
    el.hidden = !deckStackOn;
    el.setAttribute("aria-hidden", deckStackOn ? "false" : "true");
  });

  document.body.classList.toggle("area-resize-play-stacked", playStackOn);
  document.body.classList.toggle("area-resize-deck-stacked", deckStackOn);
}

function makeSeparator(axis, label) {
  const handle = document.createElement("div");
  handle.className =
    "area-resize-handle area-resize-handle--" + (axis === "x" ? "column" : "row");
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", axis === "x" ? "vertical" : "horizontal");
  handle.setAttribute("aria-label", label);
  handle.setAttribute("title", label + "（ダブルクリックで初期化）");
  handle.tabIndex = 0;
  return handle;
}

function applyColumnRatios(container, prefix, ratios) {
  container.style.setProperty("--" + prefix + "-left", ratios[0] + "fr");
  container.style.setProperty("--" + prefix + "-center", ratios[1] + "fr");
  container.style.setProperty("--" + prefix + "-right", ratios[2] + "fr");
}

function finishColumnDrag(handle, stateKey, ratiosRef) {
  handle.classList.remove("is-dragging");
  document.body.classList.remove("area-resize-active");
  savedState[stateKey] = ratiosRef.value.slice();
  saveStateSoon();
  notifyLayoutChanged();
}

function wireColumnHandle(handle, container, stateKey, cssPrefix, index, ratiosRef, defaults, minPx) {
  let drag = null;

  function updateFromDelta(deltaPx) {
    if (!drag) return;
    const available = Math.max(1, drag.width - COL_HANDLE_PX * 2);
    const delta = deltaPx / available;
    const next = drag.start.slice();
    const a = index;
    const b = index + 1;
    const minRatio = Math.min(0.3, minPx / available);
    next[a] = clamp(next[a] + delta, minRatio, next[a] + next[b] - minRatio);
    next[b] = drag.start[a] + drag.start[b] - next[a];
    ratiosRef.value = normalizeRatios(next, defaults);
    applyColumnRatios(container, cssPrefix, ratiosRef.value);
  }

  handle.addEventListener("pointerdown", function (ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (handle.hidden) return;
    ev.preventDefault();
    ev.stopPropagation();
    const rect = container.getBoundingClientRect();
    drag = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      width: rect.width,
      start: ratiosRef.value.slice(),
    };
    handle.classList.add("is-dragging");
    document.body.classList.add("area-resize-active");
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch (_) {
      /* noop */
    }
  });

  handle.addEventListener("pointermove", function (ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    ev.preventDefault();
    updateFromDelta(ev.clientX - drag.startX);
  });

  function finish(ev) {
    if (!drag || (ev && ev.pointerId != null && ev.pointerId !== drag.pointerId)) return;
    drag = null;
    finishColumnDrag(handle, stateKey, ratiosRef);
  }
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);

  handle.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    ev.preventDefault();
    const rect = container.getBoundingClientRect();
    drag = {
      width: rect.width,
      start: ratiosRef.value.slice(),
    };
    const step = ev.shiftKey ? 30 : 10;
    updateFromDelta(ev.key === "ArrowLeft" ? -step : step);
    drag = null;
    finishColumnDrag(handle, stateKey, ratiosRef);
  });

  handle.addEventListener("dblclick", function (ev) {
    ev.preventDefault();
    ratiosRef.value = normalizeRatios(defaults, defaults);
    applyColumnRatios(container, cssPrefix, ratiosRef.value);
    delete savedState[stateKey];
    saveStateSoon();
    notifyLayoutChanged();
  });
}

function initDeckColumns() {
  const builder = document.querySelector("#view-deck .builder");
  if (!builder || builder.dataset.areaResizeColumns === "1") return;
  const left = builder.querySelector(":scope > .search-panel");
  const center = builder.querySelector(":scope > .card-panel");
  const right = builder.querySelector(":scope > .deck-panel");
  if (!left || !center || !right) return;
  builder.dataset.areaResizeColumns = "1";
  builder.classList.add("area-resize-grid", "area-resize-grid--deck");

  const defaults = [0.13, 0.435, 0.435];
  const ratiosRef = { value: normalizeRatios(savedState.deckColumns, defaults) };
  applyColumnRatios(builder, "area-deck", ratiosRef.value);

  const first = makeSeparator("x", "検索欄とカード一覧の幅を変更");
  const second = makeSeparator("x", "カード一覧と現在のデッキの幅を変更");
  first.dataset.areaResizeBoundary = "deck-1";
  second.dataset.areaResizeBoundary = "deck-2";
  builder.insertBefore(first, center);
  builder.insertBefore(second, right);
  wireColumnHandle(first, builder, "deckColumns", "area-deck", 0, ratiosRef, defaults, 150);
  wireColumnHandle(second, builder, "deckColumns", "area-deck", 1, ratiosRef, defaults, 240);
}

function initPlayColumns() {
  const board = document.querySelector("#view-game .game-board");
  if (!board || board.dataset.areaResizeColumns === "1") return;
  const left = board.querySelector(":scope > .col-left");
  const center = board.querySelector(":scope > .col-center");
  const right = board.querySelector(":scope > .col-right");
  if (!left || !center || !right) return;
  board.dataset.areaResizeColumns = "1";
  board.classList.add("area-resize-grid", "area-resize-grid--play");

  const defaults = [1 / 3.45, 1.45 / 3.45, 1 / 3.45];
  const ratiosRef = { value: normalizeRatios(savedState.playColumns, defaults) };
  applyColumnRatios(board, "area-play", ratiosRef.value);

  const first = makeSeparator("x", "左エリアと中央エリアの幅を変更");
  const second = makeSeparator("x", "中央エリアと右エリアの幅を変更");
  first.dataset.areaResizeBoundary = "play-1";
  second.dataset.areaResizeBoundary = "play-2";
  board.insertBefore(first, center);
  board.insertBefore(second, right);
  wireColumnHandle(first, board, "playColumns", "area-play", 0, ratiosRef, defaults, 190);
  wireColumnHandle(second, board, "playColumns", "area-play", 1, ratiosRef, defaults, 190);
}

function applyVersusOppPct(pct) {
  const next = clamp(Number(pct), 0.18, 0.55);
  document.documentElement.style.setProperty("--versus-opp-pct", String(next));
  document.body.classList.add("area-resize-versus-custom");
  return next;
}

function initVersusBoardSplit() {
  const view = document.getElementById("view-game");
  if (!view || view.dataset.areaResizeVersus === "1") return;
  const board = view.querySelector(".game-board");
  if (!board) return;
  view.dataset.areaResizeVersus = "1";

  const handle = makeSeparator("y", "相手盤面と自分盤面の高さを変更");
  handle.classList.add("area-resize-handle--versus");
  handle.dataset.areaResizeBoundary = "versus-boards";
  view.insertBefore(handle, board);

  const defaultPct = 0.3;
  const stored = Number(savedState.versusOppPct);
  const pctRef = {
    value: Number.isFinite(stored) ? applyVersusOppPct(stored) : defaultPct,
  };
  if (Number.isFinite(stored)) applyVersusOppPct(stored);

  let drag = null;

  handle.addEventListener("pointerdown", function (ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (handle.hidden) return;
    ev.preventDefault();
    ev.stopPropagation();
    const bar = view.querySelector(".game-bar");
    const barH = bar ? bar.getBoundingClientRect().height : 0;
    drag = {
      pointerId: ev.pointerId,
      startY: ev.clientY,
      height: Math.max(1, view.getBoundingClientRect().height - barH),
      startPct: pctRef.value,
    };
    handle.classList.add("is-dragging");
    document.body.classList.add("area-resize-active");
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch (_) {
      /* noop */
    }
  });

  handle.addEventListener("pointermove", function (ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    ev.preventDefault();
    const delta = (ev.clientY - drag.startY) / pageScale() / drag.height;
    pctRef.value = applyVersusOppPct(drag.startPct + delta);
  });

  function finish(ev) {
    if (!drag || (ev && ev.pointerId != null && ev.pointerId !== drag.pointerId)) return;
    drag = null;
    handle.classList.remove("is-dragging");
    document.body.classList.remove("area-resize-active");
    savedState.versusOppPct = pctRef.value;
    saveStateSoon();
    notifyLayoutChanged();
  }
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);

  handle.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
    ev.preventDefault();
    const step = ev.shiftKey ? 0.04 : 0.015;
    pctRef.value = applyVersusOppPct(pctRef.value + (ev.key === "ArrowDown" ? step : -step));
    savedState.versusOppPct = pctRef.value;
    saveStateSoon();
    notifyLayoutChanged();
  });

  handle.addEventListener("dblclick", function (ev) {
    ev.preventDefault();
    pctRef.value = defaultPct;
    document.documentElement.style.removeProperty("--versus-opp-pct");
    document.body.classList.remove("area-resize-versus-custom");
    delete savedState.versusOppPct;
    saveStateSoon();
    notifyLayoutChanged();
  });
}

/** ライブ・ステージ・手札など個別ゾーンの高さ変更はしない（段／列のみ） */
function removePlayZoneResizeHandles() {
  document.querySelectorAll(".area-resize-handle--row[data-area-resize-zone='1']").forEach(function (el) {
    el.remove();
  });
  document.querySelectorAll(".area-resize-zone").forEach(function (el) {
    el.classList.remove("area-resize-zone", "area-resize-zone--sized");
    delete el.dataset.areaResizeZone;
    delete el.dataset.areaResizeKey;
    [
      "--play-zone-h-deck",
      "--play-zone-h-waiting",
      "--play-zone-h-hand",
      "--play-zone-h-energy",
      "--play-zone-h-live",
      "--play-zone-h-stage",
    ].forEach(function (prop) {
      el.style.removeProperty(prop);
      document.documentElement.style.removeProperty(prop);
    });
  });
  if (savedState.zoneHeights) {
    delete savedState.zoneHeights;
    saveStateSoon();
  }
}

/** @type {{ selector: string, key: string, cssVar: string, min: number, label: string, stackKind: string }[]} */
const STACK_HEIGHT_SPECS = [
  {
    selector: "#view-game .game-board > .col-left",
    key: "play-left",
    cssVar: "--area-play-stack-left",
    min: 72,
    label: "上段（左エリア）の高さを変更",
    stackKind: "play",
  },
  {
    selector: "#view-deck .builder > .search-panel",
    key: "deck-search",
    cssVar: "--area-deck-stack-search",
    min: 100,
    label: "検索欄の高さを変更",
    stackKind: "deck",
  },
  {
    selector: "#view-deck .builder > .card-panel",
    key: "deck-cards",
    cssVar: "--area-deck-stack-cards",
    min: 160,
    label: "カード一覧の高さを変更",
    stackKind: "deck",
  },
  {
    selector: "#view-deck .builder > .deck-panel",
    key: "deck-current",
    cssVar: "--area-deck-stack-current",
    min: 160,
    label: "現在のデッキ欄の高さを変更",
    stackKind: "deck",
  },
];

const PLAY_CENTER_SPEC = {
  key: "play-center",
  cssVar: "--area-play-stack-center",
  min: 140,
};
const PLAY_RIGHT_SPEC = {
  key: "play-right",
  cssVar: "--area-play-stack-right",
  min: 160,
};

function setStackHeight(target, spec, height) {
  const maxHeight = Math.max(180, ((window.innerHeight || 800) / pageScale()) * 0.78);
  const next = Math.round(clamp(height, spec.min, maxHeight));
  const px = next + "px";
  target.style.setProperty(spec.cssVar, px);
  document.documentElement.style.setProperty(spec.cssVar, px);
  target.classList.add("area-resize-stack--sized");
  if (!savedState.stackHeights || typeof savedState.stackHeights !== "object") {
    savedState.stackHeights = {};
  }
  savedState.stackHeights[spec.key] = next;
  return next;
}

function clearStackHeight(target, spec) {
  if (!target || !spec) return;
  target.style.removeProperty(spec.cssVar);
  document.documentElement.style.removeProperty(spec.cssVar);
  target.classList.remove("area-resize-stack--sized");
  if (savedState.stackHeights) delete savedState.stackHeights[spec.key];
}

function wireStackHandle(target, handle, spec) {
  let drag = null;
  const stored =
    savedState.stackHeights && Number.isFinite(Number(savedState.stackHeights[spec.key]))
      ? Number(savedState.stackHeights[spec.key])
      : null;
  if (stored != null) setStackHeight(target, spec, stored);

  handle.dataset.areaResizeStack = spec.stackKind;

  handle.addEventListener("pointerdown", function (ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (handle.hidden) return;
    ev.preventDefault();
    ev.stopPropagation();
    drag = {
      pointerId: ev.pointerId,
      startY: ev.clientY,
      startHeight: target.getBoundingClientRect().height / pageScale(),
    };
    handle.classList.add("is-dragging");
    document.body.classList.add("area-resize-active");
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch (_) {
      /* noop */
    }
  });
  handle.addEventListener("pointermove", function (ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    ev.preventDefault();
    setStackHeight(target, spec, drag.startHeight + (ev.clientY - drag.startY) / pageScale());
  });
  function finish(ev) {
    if (!drag || (ev && ev.pointerId != null && ev.pointerId !== drag.pointerId)) return;
    drag = null;
    handle.classList.remove("is-dragging");
    document.body.classList.remove("area-resize-active");
    saveStateSoon();
    notifyLayoutChanged();
  }
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
  handle.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
    ev.preventDefault();
    const current = target.getBoundingClientRect().height / pageScale();
    const step = ev.shiftKey ? 30 : 10;
    setStackHeight(target, spec, current + (ev.key === "ArrowUp" ? -step : step));
    saveStateSoon();
    notifyLayoutChanged();
  });
  handle.addEventListener("dblclick", function (ev) {
    ev.preventDefault();
    clearStackHeight(target, spec);
    saveStateSoon();
    notifyLayoutChanged();
  });
}

/**
 * スマホ縦: 「デッキ」見出しの上端＝ステージとの境界をドラッグ。
 * 下へドラッグでデッキ上端を下げ（中段を広く）、上へでデッキを上げる。
 */
function refreshPlayDeckTopBoundary() {
  const center = document.querySelector("#view-game .game-board > .col-center");
  const right = document.querySelector("#view-game .game-board > .col-right");
  if (!center || !right) return;

  /* 旧・下端ハンドルがあれば除去（境界はデッキ上端に一本化） */
  right.querySelectorAll(
    '.area-resize-handle--stack[data-area-resize-boundary="stack-play-right"],' +
      '.area-resize-handle--stack[data-area-resize-boundary="stack-play-center"]',
  ).forEach(function (el) {
    el.remove();
  });
  center.querySelectorAll('.area-resize-handle--stack[data-area-resize-boundary="stack-play-center"]').forEach(function (el) {
    el.remove();
  });

  if (right.dataset.areaResizeDeckTop === "1") {
    restorePlayStageDeckSplit(center, right);
    return;
  }
  right.dataset.areaResizeDeckTop = "1";
  center.classList.add("area-resize-stack");
  right.classList.add("area-resize-stack");
  center.dataset.areaResizeKey = PLAY_CENTER_SPEC.key;
  right.dataset.areaResizeKey = PLAY_RIGHT_SPEC.key;

  const handle = makeSeparator("y", "ステージとデッキの境界を変更（上下にドラッグ）");
  handle.classList.add("area-resize-handle--stack", "area-resize-handle--deck-top");
  handle.dataset.areaResizeStack = "play";
  handle.dataset.areaResizeBoundary = "stack-play-deck-top";
  right.insertBefore(handle, right.firstChild);

  restorePlayStageDeckSplit(center, right);

  let drag = null;

  function applySplit(centerH, rightH) {
    setStackHeight(center, PLAY_CENTER_SPEC, centerH);
    setStackHeight(right, PLAY_RIGHT_SPEC, rightH);
  }

  handle.addEventListener("pointerdown", function (ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (handle.hidden) return;
    ev.preventDefault();
    ev.stopPropagation();
    const cH = center.getBoundingClientRect().height / pageScale();
    const rH = right.getBoundingClientRect().height / pageScale();
    drag = {
      pointerId: ev.pointerId,
      startY: ev.clientY,
      startCenter: cH,
      startRight: rH,
      sum: Math.max(PLAY_CENTER_SPEC.min + PLAY_RIGHT_SPEC.min, cH + rH),
    };
    handle.classList.add("is-dragging");
    document.body.classList.add("area-resize-active");
    try {
      handle.setPointerCapture(ev.pointerId);
    } catch (_) {
      /* noop */
    }
  });

  handle.addEventListener("pointermove", function (ev) {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    ev.preventDefault();
    const delta = (ev.clientY - drag.startY) / pageScale();
    /* 下へ = デッキ上端を下げる = 中段を広く・下段を狭く */
    const nextCenter = clamp(
      drag.startCenter + delta,
      PLAY_CENTER_SPEC.min,
      drag.sum - PLAY_RIGHT_SPEC.min,
    );
    const nextRight = drag.sum - nextCenter;
    applySplit(nextCenter, nextRight);
  });

  function finish(ev) {
    if (!drag || (ev && ev.pointerId != null && ev.pointerId !== drag.pointerId)) return;
    drag = null;
    handle.classList.remove("is-dragging");
    document.body.classList.remove("area-resize-active");
    saveStateSoon();
    notifyLayoutChanged();
  }
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);

  handle.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
    ev.preventDefault();
    const cH = center.getBoundingClientRect().height / pageScale();
    const rH = right.getBoundingClientRect().height / pageScale();
    const sum = Math.max(PLAY_CENTER_SPEC.min + PLAY_RIGHT_SPEC.min, cH + rH);
    const step = ev.shiftKey ? 30 : 10;
    const delta = ev.key === "ArrowDown" ? step : -step;
    const nextCenter = clamp(cH + delta, PLAY_CENTER_SPEC.min, sum - PLAY_RIGHT_SPEC.min);
    applySplit(nextCenter, sum - nextCenter);
    saveStateSoon();
    notifyLayoutChanged();
  });

  handle.addEventListener("dblclick", function (ev) {
    ev.preventDefault();
    clearStackHeight(center, PLAY_CENTER_SPEC);
    clearStackHeight(right, PLAY_RIGHT_SPEC);
    saveStateSoon();
    notifyLayoutChanged();
  });
}

function restorePlayStageDeckSplit(center, right) {
  const sh = savedState.stackHeights || {};
  const c = Number(sh[PLAY_CENTER_SPEC.key]);
  const r = Number(sh[PLAY_RIGHT_SPEC.key]);
  if (Number.isFinite(c)) setStackHeight(center, PLAY_CENTER_SPEC, c);
  if (Number.isFinite(r)) setStackHeight(right, PLAY_RIGHT_SPEC, r);
}

function refreshStackedRegionHandles() {
  STACK_HEIGHT_SPECS.forEach(function (spec) {
    const target = document.querySelector(spec.selector);
    if (!target || target.dataset.areaResizeStack === "1") return;
    target.dataset.areaResizeStack = "1";
    target.classList.add("area-resize-stack");
    target.dataset.areaResizeKey = spec.key;
    const handle = makeSeparator("y", spec.label);
    handle.classList.add("area-resize-handle--stack");
    handle.dataset.areaResizeBoundary = "stack-" + spec.key;
    target.appendChild(handle);
    wireStackHandle(target, handle, spec);
  });
  refreshPlayDeckTopBoundary();
}

let visibilityWired = false;

function wireVisibilitySync() {
  if (visibilityWired) return;
  visibilityWired = true;
  window.addEventListener("resize", syncSplitterVisibility, { passive: true });
  if (window.matchMedia) {
    try {
      const mqWide = window.matchMedia("(min-width: 1101px)");
      const mqPlay = window.matchMedia("(min-width: 901px)");
      if (typeof mqWide.addEventListener === "function") {
        mqWide.addEventListener("change", syncSplitterVisibility);
        mqPlay.addEventListener("change", syncSplitterVisibility);
      } else if (typeof mqWide.addListener === "function") {
        mqWide.addListener(syncSplitterVisibility);
        mqPlay.addListener(syncSplitterVisibility);
      }
    } catch (_) {
      /* noop */
    }
  }
  /* childList 監視はハンドル追加でループしやすいので属性変化のみ */
  if (typeof MutationObserver !== "undefined") {
    let moRaf = 0;
    const observer = new MutationObserver(function () {
      if (moRaf) return;
      moRaf = requestAnimationFrame(function () {
        moRaf = 0;
        syncSplitterVisibility();
        refreshStackedRegionHandles();
      });
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  document.body.addEventListener(
    "toggle",
    function () {
      syncSplitterVisibility();
    },
    true,
  );
}

export function initAreaResizers() {
  try {
    removePlayZoneResizeHandles();
    initDeckColumns();
    initPlayColumns();
    initVersusBoardSplit();
    refreshStackedRegionHandles();
    wireVisibilitySync();
    syncSplitterVisibility();

    if (Number.isFinite(Number(savedState.versusOppPct))) {
      applyVersusOppPct(Number(savedState.versusOppPct));
    }
  } catch (err) {
    console.warn("[areaResizers] initAreaResizers failed:", err);
  }
}
