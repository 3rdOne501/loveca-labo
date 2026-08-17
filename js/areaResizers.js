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

function isPlayZoneResizeEnabled() {
  return isPlayDesktopSplitters() && !document.body.classList.contains("play-hand-docked-bottom");
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

  const zonesOn = isPlayZoneResizeEnabled();
  document.querySelectorAll("#view-game .area-resize-handle--row[data-area-resize-zone='1']").forEach(function (el) {
    el.hidden = !zonesOn;
    el.setAttribute("aria-hidden", zonesOn ? "false" : "true");
  });

  const versusOn =
    document.body.classList.contains("play-versus-mode") &&
    !document.body.classList.contains("chrome-layout-play-mobile-portrait") &&
    window.matchMedia("(min-width: 901px)").matches;
  const versusHandle = document.querySelector(".area-resize-handle--versus");
  if (versusHandle) {
    versusHandle.hidden = !versusOn;
    versusHandle.setAttribute("aria-hidden", versusOn ? "false" : "true");
  }
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

/** @type {{ selector: string, key: string, cssVar: string, min: number, label: string }[]} */
const PLAY_ZONE_HEIGHT_SPECS = [
  {
    selector: "#deck-pile-host",
    key: "deck-pile",
    cssVar: "--play-zone-h-deck",
    min: 120,
    label: "山札の高さを変更",
  },
  {
    selector: "#waiting-pile-host",
    key: "waiting-pile",
    cssVar: "--play-zone-h-waiting",
    min: 120,
    label: "控え室の高さを変更",
  },
  {
    selector: "#hand-stick-fold",
    key: "hand-stick",
    cssVar: "--play-zone-h-hand",
    min: 100,
    label: "手札の高さを変更",
  },
  {
    selector: "#energy-fold",
    key: "energy-fold",
    cssVar: "--play-zone-h-energy",
    min: 88,
    label: "エネルギーエリアの高さを変更",
  },
  {
    selector: "#live-row",
    key: "live-row",
    cssVar: "--play-zone-h-live",
    min: 120,
    label: "ライブエリアの高さを変更",
  },
  {
    selector: "#stage-left",
    key: "stage-row",
    cssVar: "--play-zone-h-stage",
    min: 120,
    label: "ステージの高さを変更",
    hostFrom: function (el) {
      return el.closest(".three-cols");
    },
  },
];

function setZoneHeight(target, spec, height) {
  const maxHeight = Math.max(140, (window.innerHeight || 800) / pageScale() * 0.72);
  const next = Math.round(clamp(height, spec.min, maxHeight));
  target.style.setProperty(spec.cssVar, next + "px");
  target.classList.add("area-resize-zone--sized");
  if (!savedState.zoneHeights || typeof savedState.zoneHeights !== "object") {
    savedState.zoneHeights = {};
  }
  savedState.zoneHeights[spec.key] = next;
}

function wireZoneHandle(target, handle, spec) {
  let drag = null;
  const stored =
    savedState.zoneHeights && Number.isFinite(Number(savedState.zoneHeights[spec.key]))
      ? Number(savedState.zoneHeights[spec.key])
      : null;
  if (stored != null) setZoneHeight(target, spec, stored);

  handle.dataset.areaResizeZone = "1";

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
    setZoneHeight(target, spec, drag.startHeight + (ev.clientY - drag.startY) / pageScale());
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
    setZoneHeight(target, spec, current + (ev.key === "ArrowUp" ? -step : step));
    saveStateSoon();
    notifyLayoutChanged();
  });
  handle.addEventListener("dblclick", function (ev) {
    ev.preventDefault();
    target.style.removeProperty(spec.cssVar);
    target.classList.remove("area-resize-zone--sized");
    if (savedState.zoneHeights) delete savedState.zoneHeights[spec.key];
    saveStateSoon();
    notifyLayoutChanged();
  });
}

function refreshPlayZoneHandles() {
  PLAY_ZONE_HEIGHT_SPECS.forEach(function (spec) {
    const found = document.querySelector(spec.selector);
    if (!found) return;
    const target = spec.hostFrom ? spec.hostFrom(found) : found;
    if (!target || target.dataset.areaResizeZone === "1") return;
    target.dataset.areaResizeZone = "1";
    target.classList.add("area-resize-zone");
    target.dataset.areaResizeKey = spec.key;
    const handle = makeSeparator("y", spec.label);
    handle.dataset.areaResizeBoundary = "zone-" + spec.key;
    target.appendChild(handle);
    wireZoneHandle(target, handle, spec);
  });
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
  const viewGame = document.getElementById("view-game");
  if (viewGame && typeof MutationObserver !== "undefined") {
    let moRaf = 0;
    const observer = new MutationObserver(function () {
      if (moRaf) return;
      moRaf = requestAnimationFrame(function () {
        moRaf = 0;
        syncSplitterVisibility();
        refreshPlayZoneHandles();
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
    initDeckColumns();
    initPlayColumns();
    initVersusBoardSplit();
    refreshPlayZoneHandles();
    wireVisibilitySync();
    syncSplitterVisibility();

    if (Number.isFinite(Number(savedState.versusOppPct))) {
      applyVersusOppPct(Number(savedState.versusOppPct));
    }
  } catch (err) {
    console.warn("[areaResizers] initAreaResizers failed:", err);
  }
}
