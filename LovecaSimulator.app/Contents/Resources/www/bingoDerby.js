/**
 * 禁止制限ダービー用ビンゴ（3×3 / 5×5）。
 * 大穴は枠外。各カードに制限ポイント 1〜5。ドラッグで移動・入れ替え。
 */
import { getAllCards, getCard, catalogListThumbnailUrl } from "./cards.js";
import { STORAGE_BINGO_DERBY } from "./config.js";
import { showToast } from "./ui.js";
import { showAppView, showDeckBuilderView } from "./viewNav.js";

/** @typedef {{ type: 'empty' } | { type: 'card', cardNo: string, points: number }} BingoSlot */

function cellCount(gridSize) {
  return gridSize * gridSize;
}

function emptySlot() {
  return { type: "empty" };
}

function defaultCells(gridSize) {
  const n = cellCount(gridSize);
  /** @type {BingoSlot[]} */
  const cells = [];
  for (let i = 0; i < n; i++) cells.push(emptySlot());
  return cells;
}

const BINGO_POINTS_MAX = 5;

function clampPoints(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 1) return 1;
  if (v > BINGO_POINTS_MAX) return BINGO_POINTS_MAX;
  return v;
}

/** @param {number} pt @returns {{ fill: string, glow: string, stroke: string, text: string, tier: number }} */
function pointsBadgePalette(pt) {
  const tier = clampPoints(pt);
  /** @type {Record<number, { fill: string, glow: string, stroke: string, text: string }>} */
  const palettes = {
    1: { fill: "#8ed8ff", glow: "rgba(90, 210, 255, 0.95)", stroke: "#f0fbff", text: "#062030" },
    2: { fill: "#6ef0c0", glow: "rgba(50, 255, 175, 0.95)", stroke: "#edfff8", text: "#042818" },
    3: { fill: "#ffe24d", glow: "rgba(255, 205, 35, 1)", stroke: "#fffceb", text: "#2a2200" },
    4: { fill: "#ff9a38", glow: "rgba(255, 125, 15, 1)", stroke: "#fff3e8", text: "#2a1200" },
    5: { fill: "#ff2858", glow: "rgba(255, 25, 65, 1)", stroke: "#ffffff", text: "#ffffff" },
  };
  return Object.assign({ tier: tier }, palettes[tier]);
}

/** @param {unknown} raw @returns {BingoSlot} */
function normalizeSlot(raw) {
  if (!raw || typeof raw !== "object") return emptySlot();
  if (raw.type === "card" && raw.cardNo) {
    return { type: "card", cardNo: String(raw.cardNo), points: clampPoints(raw.points) };
  }
  return emptySlot();
}

/** @param {unknown[]} arr @param {number} gridSize @returns {BingoSlot[]} */
function normalizeCellsArray(arr, gridSize) {
  const n = cellCount(gridSize);
  /** @type {BingoSlot[]} */
  const out = defaultCells(gridSize);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < n; i++) {
    out[i] = normalizeSlot(arr[i]);
  }
  return out;
}

/**
 * @param {number} gridSize
 * @returns {{ cells: BingoSlot[], oana: BingoSlot }}
 */
function loadBoard(gridSize) {
  const size = gridSize === 5 ? 5 : 3;
  try {
    const raw = localStorage.getItem(STORAGE_BINGO_DERBY);
    if (!raw) return { cells: defaultCells(size), oana: emptySlot() };
    const o = JSON.parse(raw);
    if (o && o.v === 3) {
      const cells = normalizeCellsArray(o.cellsBySize && o.cellsBySize[String(size)], size);
      const oana = normalizeSlot(o.oanaBySize && o.oanaBySize[String(size)]);
      return { cells, oana };
    }
    if (o && o.v === 2 && o.cellsBySize && o.cellsBySize[String(size)]) {
      return {
        cells: normalizeCellsArray(o.cellsBySize[String(size)], size),
        oana: emptySlot(),
      };
    }
  } catch (_) {
    /* noop */
  }
  return { cells: defaultCells(size), oana: emptySlot() };
}

/**
 * @param {Record<string, BingoSlot[]>} cellsBySize
 * @param {Record<string, BingoSlot>} oanaBySize
 * @param {number} activeSize
 */
function saveAllState(cellsBySize, oanaBySize, activeSize) {
  try {
    localStorage.setItem(
      STORAGE_BINGO_DERBY,
      JSON.stringify({
        v: 3,
        gridSize: activeSize === 5 ? 5 : 3,
        cellsBySize,
        oanaBySize,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (_) {
    /* noop */
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function thumbImgHtml(url, className) {
  const thumb = catalogListThumbnailUrl(url, { hi: true });
  return (
    '<img class="' +
    escapeAttr(className) +
    '" src="' +
    escapeAttr(thumb) +
    '" data-full-src="' +
    escapeAttr(url || "") +
    '" alt="" loading="lazy" decoding="async" draggable="false" />'
  );
}

/** @param {BingoSlot} slot @returns {string} */
function slotInnerHtml(slot) {
  if (slot.type === "card" && slot.cardNo) {
    const c = getCard(slot.cardNo);
    const img =
      c && c.img
        ? thumbImgHtml(c.img, "bingo-cell-card-img")
        : '<span class="bingo-cell-missing">' + escapeHtml(slot.cardNo) + "</span>";
    const pt = clampPoints(slot.points);
    return (
      '<span class="bingo-cell-inner">' +
      img +
      '<span class="bingo-points-badge bingo-points-badge--p' +
      pt +
      '" title="制限ポイント ' +
      pt +
      '（タップで変更）">' +
      pt +
      "</span></span>"
    );
  }
  return '<span class="bingo-cell-placeholder">＋</span>';
}

/** @param {BingoSlot} slot @returns {string} */
function slotLabel(slot) {
  if (slot.type === "card" && slot.cardNo) {
    const c = getCard(slot.cardNo);
    return (c && c.name ? c.name : slot.cardNo) + " · 制限" + clampPoints(slot.points);
  }
  return "空きマス — タップで配置 · ドラッグで移動";
}

function filledSlotLabel(slot) {
  if (slot.type === "card" && slot.cardNo) {
    const c = getCard(slot.cardNo);
    return (c && c.name ? c.name : slot.cardNo) + " — タップで変更・削除";
  }
  return slotLabel(slot);
}

/**
 * @param {HTMLElement} root
 * @param {number} gridSize
 * @param {BingoSlot[]} cells
 */
function renderGrid(root, gridSize, cells) {
  const n = cellCount(gridSize);
  root.classList.remove("bingo-grid--size-3", "bingo-grid--size-5");
  root.classList.add(gridSize === 5 ? "bingo-grid--size-5" : "bingo-grid--size-3");
  const parts = [];
  for (let i = 0; i < n; i++) {
    const slot = cells[i] || emptySlot();
    const filled = slot.type === "card";
    parts.push(
      '<button type="button" class="bingo-cell' +
        (filled ? " bingo-cell--filled" : "") +
        '" data-bingo-idx="' +
        i +
        '" title="' +
        escapeAttr(filled ? filledSlotLabel(slot) : slotLabel(slot)) +
        '">' +
        slotInnerHtml(slot) +
        "</button>",
    );
  }
  root.innerHTML = parts.join("");
}

/** @param {HTMLElement} el @param {BingoSlot} oana */
function renderOanaSlot(el, oana) {
  if (!el) return;
  const filled = oana.type === "card";
  el.classList.toggle("bingo-oana-slot--filled", filled);
  el.innerHTML = slotInnerHtml(oana);
  return filled ? "大穴: " + slotLabel(oana) + " — タップで変更・削除" : "大穴 — タップでカード配置 · ドラッグで移動";
}

function openSlotActionPicker(titleText, onChangePoints, onRemove) {
  var existing = document.getElementById("bingo-slot-action-root");
  if (existing) existing.remove();

  var backdrop = document.createElement("div");
  backdrop.id = "bingo-slot-action-root";
  backdrop.className = "bingo-points-pick-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  var dialog = document.createElement("div");
  dialog.className = "bingo-points-pick-dialog";

  var title = document.createElement("h3");
  title.textContent = titleText || "配置済みカード";

  var actions = document.createElement("div");
  actions.className = "bingo-slot-action-list";

  var btnPoints = document.createElement("button");
  btnPoints.type = "button";
  btnPoints.className = "btn secondary";
  btnPoints.textContent = "制限ポイントを変更";
  btnPoints.addEventListener("click", function () {
    backdrop.remove();
    onChangePoints();
  });

  var btnRemove = document.createElement("button");
  btnRemove.type = "button";
  btnRemove.className = "btn secondary bingo-slot-action-remove";
  btnRemove.textContent = "カードを削除";
  btnRemove.addEventListener("click", function () {
    backdrop.remove();
    onRemove();
  });

  var btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.className = "btn secondary";
  btnClose.textContent = "キャンセル";
  btnClose.addEventListener("click", function () {
    backdrop.remove();
  });

  actions.appendChild(btnPoints);
  actions.appendChild(btnRemove);
  actions.appendChild(btnClose);

  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) backdrop.remove();
  });
  dialog.appendChild(title);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

function openPointsPicker(current, onPick) {
  var existing = document.getElementById("bingo-points-pick-root");
  if (existing) existing.remove();

  var backdrop = document.createElement("div");
  backdrop.id = "bingo-points-pick-root";
  backdrop.className = "bingo-points-pick-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  var dialog = document.createElement("div");
  dialog.className = "bingo-points-pick-dialog";
  var title = document.createElement("h3");
  title.textContent = "制限ポイント（1〜5）";

  var grid = document.createElement("div");
  grid.className = "bingo-points-pick-grid";
  for (var p = 1; p <= BINGO_POINTS_MAX; p++) {
    (function (pt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "btn sm bingo-points-pick-btn bingo-points-pick-btn--p" +
        pt +
        (pt === clampPoints(current) ? " primary" : " secondary");
      btn.textContent = String(pt);
      btn.addEventListener("click", function () {
        onPick(pt);
        backdrop.remove();
      });
      grid.appendChild(btn);
    })(p);
  }

  var actions = document.createElement("div");
  actions.className = "bingo-points-pick-actions";
  var btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.className = "btn secondary";
  btnClose.textContent = "キャンセル";
  btnClose.addEventListener("click", function () {
    backdrop.remove();
  });
  actions.appendChild(btnClose);

  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) backdrop.remove();
  });
  dialog.appendChild(title);
  dialog.appendChild(grid);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

/**
 * @param {(cardNo: string, points: number) => void} onPicked
 * @param {number} [defaultPoints]
 */
function openCardPickOverlay(onPicked, defaultPoints) {
  var existing = document.getElementById("bingo-card-pick-root");
  if (existing) existing.remove();

  var cards = getAllCards();
  var selectedPoints = clampPoints(defaultPoints || 1);

  var backdrop = document.createElement("div");
  backdrop.id = "bingo-card-pick-root";
  backdrop.className = "bingo-card-pick-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  var dialog = document.createElement("div");
  dialog.className = "bingo-card-pick-dialog";

  var title = document.createElement("h3");
  title.textContent = "配置するカードを選ぶ";

  var pointsLabel = document.createElement("p");
  pointsLabel.className = "bingo-pick-points-label";
  pointsLabel.textContent = "制限ポイント";

  var pointsRow = document.createElement("div");
  pointsRow.className = "bingo-pick-points-row";
  var pointBtns = [];
  for (var pi = 1; pi <= BINGO_POINTS_MAX; pi++) {
    (function (pt) {
      var pb = document.createElement("button");
      pb.type = "button";
      pb.className =
        "btn sm bingo-pick-point-btn bingo-pick-point-btn--p" +
        pt +
        (pt === selectedPoints ? " primary" : " secondary");
      pb.textContent = String(pt);
      pb.addEventListener("click", function () {
        selectedPoints = pt;
        pointBtns.forEach(function (b, idx) {
          b.classList.toggle("primary", idx + 1 === pt);
          b.classList.toggle("secondary", idx + 1 !== pt);
        });
      });
      pointBtns.push(pb);
      pointsRow.appendChild(pb);
    })(pi);
  }

  var searchWrap = document.createElement("label");
  searchWrap.className = "field";
  var searchLabel = document.createElement("span");
  searchLabel.textContent = "検索";
  var searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "bingo-card-pick-search";
  searchInput.placeholder = "カード名・番号";
  searchWrap.appendChild(searchLabel);
  searchWrap.appendChild(searchInput);

  var grid = document.createElement("div");
  grid.className = "bingo-card-pick-grid";

  function closeOverlay() {
    backdrop.remove();
  }

  function renderPickGrid(q) {
    var query = String(q || "")
      .trim()
      .toLowerCase();
    var filtered = cards.filter(function (c) {
      if (!c) return false;
      if (!query) return true;
      var hay = String(c.name || "") + " " + String(c.card_no || "") + " " + String(c.ability || "");
      return hay.toLowerCase().indexOf(query) >= 0;
    });
    if (filtered.length > 400) filtered = filtered.slice(0, 400);
    grid.innerHTML = "";
    filtered.forEach(function (c) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bingo-card-pick-card";
      btn.setAttribute("aria-label", (c.name || c.card_no) + " を配置");
      btn.innerHTML = c.img
        ? thumbImgHtml(c.img, "deck-builder-card-thumb")
        : '<div class="sample-recipe-thumb-fallback">?</div>';
      btn.addEventListener("click", function () {
        onPicked(String(c.card_no), selectedPoints);
        closeOverlay();
      });
      grid.appendChild(btn);
    });
    if (!filtered.length) {
      grid.innerHTML = '<p class="muted bingo-card-pick-empty">該当カードがありません</p>';
    }
  }

  searchInput.addEventListener("input", function () {
    renderPickGrid(searchInput.value);
  });

  var actions = document.createElement("div");
  actions.className = "bingo-card-pick-actions";
  var btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.className = "btn secondary";
  btnClose.textContent = "キャンセル";
  btnClose.addEventListener("click", closeOverlay);
  actions.appendChild(btnClose);

  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) closeOverlay();
  });

  dialog.appendChild(title);
  dialog.appendChild(pointsLabel);
  dialog.appendChild(pointsRow);
  dialog.appendChild(searchWrap);
  dialog.appendChild(grid);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  renderPickGrid("");
  searchInput.focus();
}

function loadImageForCanvas(url) {
  return new Promise(function (resolve) {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      const img2 = new Image();
      img2.onload = function () {
        resolve(img2);
      };
      img2.onerror = function () {
        resolve(null);
      };
      img2.src = url;
    };
    img.src = catalogListThumbnailUrl(url, { hi: true });
  });
}

/** @param {CanvasRenderingContext2D} ctx @param {CanvasImageSource} img @param {number} x @param {number} y @param {number} w @param {number} h */
function drawImageContain(ctx, img, x, y, w, h) {
  const iw = "naturalWidth" in img && img.naturalWidth ? img.naturalWidth : img.width;
  const ih = "naturalHeight" in img && img.naturalHeight ? img.naturalHeight : img.height;
  if (!iw || !ih) return;
  const imgRatio = iw / ih;
  const boxRatio = w / h;
  let drawW;
  let drawH;
  let drawX;
  let drawY;
  if (imgRatio > boxRatio) {
    drawW = w;
    drawH = w / imgRatio;
    drawX = x;
    drawY = y + (h - drawH) / 2;
  } else {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x + (w - drawW) / 2;
    drawY = y;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

/** @param {number} refSize セル幅など（バッジサイズの基準） */
function bingoBadgeRadius(refSize) {
  return Math.max(30, Math.min(44, refSize * 0.17));
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} pt @param {number} [refSize] */
function drawPointsBadge(ctx, x, y, pt, refSize) {
  const palette = pointsBadgePalette(pt);
  const tier = palette.tier;
  const baseR = refSize ? bingoBadgeRadius(refSize) : 36;
  const r = baseR * (1 + (tier - 1) * 0.045);
  const fontSize = Math.round(r * 0.92);
  ctx.save();

  for (let ring = 4; ring >= 1; ring--) {
    ctx.globalAlpha = 0.12 + ring * 0.1;
    ctx.fillStyle = palette.glow;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = r * (0.55 + ring * 0.45);
    ctx.beginPath();
    ctx.arc(x, y, r + ring * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = r * (0.9 + tier * 0.22);
  ctx.fillStyle = palette.fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = r * 0.35;
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = Math.max(3, r * (0.1 + tier * 0.015));
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.text;
  ctx.font = "bold " + fontSize + "px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (tier >= 4) {
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = Math.max(4, r * 0.15);
  }
  ctx.fillText(String(tier), x, y);
  ctx.restore();
}

/**
 * @param {number} gridSize
 * @param {BingoSlot[]} cells
 * @param {BingoSlot} oana
 * @param {string} titleText
 */
async function exportBingoPng(gridSize, cells, oana, titleText) {
  const W = 1200;
  const pad = 40;
  const titleH = 72;
  const gridTop = pad + titleH;
  const gridW = W - pad * 2;
  const cellW = gridW / gridSize;
  const CARD_H_OVER_W = 7 / 5;
  const cellH = cellW * CARD_H_OVER_W;
  const gridH = cellH * gridSize;
  const oanaW = cellW * 1.2;
  const oanaH = oanaW * CARD_H_OVER_W;
  const oanaGap = 28;
  const canvasH = gridTop + gridH + oanaGap + oanaH + pad + 24;
  const n = cellCount(gridSize);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が使えません");

  ctx.fillStyle = "#120818";
  ctx.fillRect(0, 0, W, canvasH);

  ctx.fillStyle = "#ffe8f4";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    (titleText || "禁止制限ダービー ビンゴ") + "（" + gridSize + "×" + gridSize + "）",
    W / 2,
    pad + 40,
  );

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = pad + col * cellW;
    const y = gridTop + row * cellH;
    const slot = cells[i];

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = "rgba(255, 140, 190, 0.45)";
    ctx.lineWidth = 2;
    ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
    ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

    if (slot && slot.type === "card" && slot.cardNo) {
      const c = getCard(slot.cardNo);
      const img = c && c.img ? await loadImageForCanvas(c.img) : null;
      if (img) {
        const margin = 6;
        drawImageContain(ctx, img, x + margin, y + margin, cellW - margin * 2, cellH - margin * 2);
        var badgeR = bingoBadgeRadius(cellW);
        drawPointsBadge(ctx, x + cellW - badgeR - 8, y + badgeR + 8, clampPoints(slot.points), cellW);
      } else {
        ctx.fillStyle = "#ccc";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(slot.cardNo, x + cellW / 2, y + cellH / 2);
      }
    }
  }

  const oanaY = gridTop + gridH + oanaGap;
  const oanaX = (W - oanaW) / 2;
  ctx.fillStyle = "rgba(255, 200, 80, 0.15)";
  ctx.strokeStyle = "rgba(255, 200, 80, 0.55)";
  ctx.fillRect(oanaX, oanaY - 20, oanaW, oanaH + 20);
  ctx.strokeRect(oanaX, oanaY, oanaW, oanaH);
  ctx.fillStyle = "#ffd080";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("大穴", oanaX + oanaW / 2, oanaY - 6);

  if (oana.type === "card" && oana.cardNo) {
    const oc = getCard(oana.cardNo);
    const oimg = oc && oc.img ? await loadImageForCanvas(oc.img) : null;
    if (oimg) {
      const m = 8;
      drawImageContain(ctx, oimg, oanaX + m, oanaY + m, oanaW - m * 2, oanaH - m * 2);
      var oanaBadgeR = bingoBadgeRadius(oanaW);
      drawPointsBadge(ctx, oanaX + oanaW - oanaBadgeR - 8, oanaY + oanaBadgeR + 8, clampPoints(oana.points), oanaW);
    }
  }

  return new Promise(function (resolve, reject) {
    canvas.toBlob(
      function (blob) {
        if (!blob) {
          reject(new Error("画像の生成に失敗しました"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      0.92,
    );
  });
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

function syncSizeToggleButtons(gridSize) {
  var btn3 = document.getElementById("btn-bingo-size-3");
  var btn5 = document.getElementById("btn-bingo-size-5");
  if (btn3) {
    btn3.setAttribute("aria-pressed", gridSize === 3 ? "true" : "false");
    btn3.classList.toggle("primary", gridSize === 3);
    btn3.classList.toggle("secondary", gridSize !== 3);
  }
  if (btn5) {
    btn5.setAttribute("aria-pressed", gridSize === 5 ? "true" : "false");
    btn5.classList.toggle("primary", gridSize === 5);
    btn5.classList.toggle("secondary", gridSize !== 5);
  }
}

export function initBingoDerby() {
  const root = document.getElementById("view-bingo");
  if (!root) return;

  const gridEl = document.getElementById("bingo-grid");
  const oanaEl = document.getElementById("bingo-oana-slot");
  const titleInput = /** @type {HTMLInputElement|null} */ (document.getElementById("bingo-title-input"));
  if (!gridEl || !oanaEl) return;

  /** @type {Record<string, BingoSlot[]>} */
  var cellsBySize = { "3": defaultCells(3), "5": defaultCells(5) };
  /** @type {Record<string, BingoSlot>} */
  var oanaBySize = { "3": emptySlot(), "5": emptySlot() };

  var b3 = loadBoard(3);
  cellsBySize["3"] = b3.cells;
  oanaBySize["3"] = b3.oana;
  var b5 = loadBoard(5);
  cellsBySize["5"] = b5.cells;
  oanaBySize["5"] = b5.oana;

  var gridSize = 3;
  try {
    const raw = localStorage.getItem(STORAGE_BINGO_DERBY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.gridSize === 5) gridSize = 5;
    }
  } catch (_) {
    /* noop */
  }

  /** @type {BingoSlot[]} */
  var cells = cellsBySize[String(gridSize)].slice();
  /** @type {BingoSlot} */
  var oana = normalizeSlot(oanaBySize[String(gridSize)]);

  /** @type {{ kind: 'grid', idx: number } | { kind: 'oana' } | null} */
  var dragSource = null;
  var dragMoved = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var suppressClickUntil = 0;

  function persistAndRender() {
    cellsBySize[String(gridSize)] = cells.map(function (s) {
      return s.type === "card" ? { type: "card", cardNo: s.cardNo, points: clampPoints(s.points) } : emptySlot();
    });
    oanaBySize[String(gridSize)] =
      oana.type === "card" ? { type: "card", cardNo: oana.cardNo, points: clampPoints(oana.points) } : emptySlot();
    saveAllState(cellsBySize, oanaBySize, gridSize);
    syncSizeToggleButtons(gridSize);
    renderGrid(gridEl, gridSize, cells);
    renderOanaSlot(oanaEl, oana);
    wireInteraction();
  }

  /** @param {'grid'|'oana'} kind @param {number} [idx] @returns {BingoSlot} */
  function getSlot(kind, idx) {
    if (kind === "oana") return oana;
    return cells[idx] || emptySlot();
  }

  /** @param {'grid'|'oana'} kind @param {number} [idx] @param {BingoSlot} slot */
  function setSlot(kind, idx, slot) {
    if (kind === "oana") {
      oana = slot;
      return;
    }
    cells[idx] = slot;
  }

  /** @param {'grid'|'oana'} fromKind @param {'grid'|'oana'} toKind @param {number} [fromIdx] @param {number} [toIdx] */
  function swapSlotLocations(fromKind, toKind, fromIdx, toIdx) {
    const a = getSlot(fromKind, fromIdx);
    const b = getSlot(toKind, toIdx);
    setSlot(fromKind, fromIdx, b);
    setSlot(toKind, toIdx, a);
  }

  function clearDropHighlights() {
    gridEl.querySelectorAll(".bingo-cell--drop-target").forEach(function (el) {
      el.classList.remove("bingo-cell--drop-target");
    });
    oanaEl.classList.remove("bingo-oana-slot--drop-target");
  }

  /** @param {Element|null} el @returns {{ kind: 'grid'|'oana', idx?: number } | null} */
  function slotFromElement(el) {
    if (!el) return null;
    if (el.id === "bingo-oana-slot" || el.closest("#bingo-oana-slot")) return { kind: "oana" };
    var cell = el.closest(".bingo-cell");
    if (cell && cell.hasAttribute("data-bingo-idx")) {
      return { kind: "grid", idx: Number(cell.getAttribute("data-bingo-idx")) };
    }
    return null;
  }

  function wireInteraction() {
    gridEl.querySelectorAll(".bingo-cell").forEach(function (cellBtn) {
      if (cellBtn.dataset.bingoWired === "1") return;
      cellBtn.dataset.bingoWired = "1";
      var idx = Number(cellBtn.getAttribute("data-bingo-idx"));

      cellBtn.addEventListener("click", function (ev) {
        if (Date.now() < suppressClickUntil) return;
        if (ev.target && ev.target.closest && ev.target.closest(".bingo-points-badge")) {
          ev.stopPropagation();
          var slot = cells[idx];
          if (slot.type !== "card") return;
          openPointsPicker(slot.points, function (pt) {
            cells[idx] = { type: "card", cardNo: slot.cardNo, points: pt };
            persistAndRender();
          });
          return;
        }
        var cur = cells[idx];
        if (cur.type === "card") {
          openSlotActionPicker(
            slotLabel(cur),
            function () {
              openPointsPicker(cur.points, function (pt) {
                cells[idx] = { type: "card", cardNo: cur.cardNo, points: pt };
                persistAndRender();
              });
            },
            function () {
              cells[idx] = emptySlot();
              persistAndRender();
              showToast("カードを削除しました");
            },
          );
          return;
        }
        openCardPickOverlay(function (cardNo, points) {
          cells[idx] = { type: "card", cardNo: cardNo, points: points };
          persistAndRender();
        });
      });

      cellBtn.addEventListener("pointerdown", function (ev) {
        if (cells[idx].type !== "card") return;
        if (ev.target && ev.target.closest && ev.target.closest(".bingo-points-badge")) return;
        dragSource = { kind: "grid", idx: idx };
        dragMoved = false;
        dragStartX = ev.clientX;
        dragStartY = ev.clientY;
        cellBtn.classList.add("bingo-cell--dragging");
        try {
          cellBtn.setPointerCapture(ev.pointerId);
        } catch (_) {
          /* noop */
        }
      });

      cellBtn.addEventListener("pointermove", function (ev) {
        if (!dragSource || dragSource.kind !== "grid" || dragSource.idx !== idx) return;
        if (Math.abs(ev.clientX - dragStartX) + Math.abs(ev.clientY - dragStartY) < 8) return;
        dragMoved = true;
        clearDropHighlights();
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        var target = slotFromElement(under);
        if (target) {
          if (target.kind === "grid") {
            var tCell = gridEl.querySelector('[data-bingo-idx="' + target.idx + '"]');
            if (tCell) tCell.classList.add("bingo-cell--drop-target");
          } else {
            oanaEl.classList.add("bingo-oana-slot--drop-target");
          }
        }
      });

      function endDrag(ev) {
        cellBtn.classList.remove("bingo-cell--dragging");
        if (!dragSource || dragSource.kind !== "grid" || dragSource.idx !== idx) return;
        var src = dragSource;
        dragSource = null;
        clearDropHighlights();
        if (!dragMoved) return;
        suppressClickUntil = Date.now() + 200;
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        var target = slotFromElement(under);
        if (!target) return;
        if (target.kind === "grid" && target.idx === src.idx) return;
        if (target.kind === "oana" && src.kind === "grid") {
          swapSlotLocations("grid", "oana", src.idx, undefined);
        } else if (target.kind === "grid" && src.kind === "grid") {
          swapSlotLocations("grid", "grid", src.idx, target.idx);
        }
        persistAndRender();
      }

      cellBtn.addEventListener("pointerup", endDrag);
      cellBtn.addEventListener("pointercancel", endDrag);
    });

    if (oanaEl.dataset.bingoWired === "1") return;
    oanaEl.dataset.bingoWired = "1";

    oanaEl.addEventListener("click", function (ev) {
      if (Date.now() < suppressClickUntil) return;
      if (ev.target && ev.target.closest && ev.target.closest(".bingo-points-badge")) {
        ev.stopPropagation();
        if (oana.type !== "card") return;
        openPointsPicker(oana.points, function (pt) {
          oana = { type: "card", cardNo: oana.cardNo, points: pt };
          persistAndRender();
        });
        return;
      }
      if (oana.type === "card") {
        var oanaCard = oana;
        openSlotActionPicker(
          slotLabel(oanaCard),
          function () {
            openPointsPicker(oanaCard.points, function (pt) {
              oana = { type: "card", cardNo: oanaCard.cardNo, points: pt };
              persistAndRender();
            });
          },
          function () {
            oana = emptySlot();
            persistAndRender();
            showToast("大穴のカードを削除しました");
          },
        );
        return;
      }
      openCardPickOverlay(function (cardNo, points) {
        oana = { type: "card", cardNo: cardNo, points: points };
        persistAndRender();
      });
    });

    oanaEl.addEventListener("pointerdown", function (ev) {
      if (oana.type !== "card") return;
      if (ev.target && ev.target.closest && ev.target.closest(".bingo-points-badge")) return;
      dragSource = { kind: "oana" };
      dragMoved = false;
      dragStartX = ev.clientX;
      dragStartY = ev.clientY;
      oanaEl.classList.add("bingo-oana-slot--dragging");
      try {
        oanaEl.setPointerCapture(ev.pointerId);
      } catch (_) {
        /* noop */
      }
    });

    oanaEl.addEventListener("pointermove", function (ev) {
      if (!dragSource || dragSource.kind !== "oana") return;
      if (Math.abs(ev.clientX - dragStartX) + Math.abs(ev.clientY - dragStartY) < 8) return;
      dragMoved = true;
      clearDropHighlights();
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var target = slotFromElement(under);
      if (target && target.kind === "grid") {
        var tCell = gridEl.querySelector('[data-bingo-idx="' + target.idx + '"]');
        if (tCell) tCell.classList.add("bingo-cell--drop-target");
      } else if (target && target.kind === "oana") {
        oanaEl.classList.add("bingo-oana-slot--drop-target");
      }
    });

    function endOanaDrag(ev) {
      oanaEl.classList.remove("bingo-oana-slot--dragging");
      if (!dragSource || dragSource.kind !== "oana") return;
      dragSource = null;
      clearDropHighlights();
      if (!dragMoved) return;
      suppressClickUntil = Date.now() + 200;
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var target = slotFromElement(under);
      if (!target || target.kind !== "grid") return;
      swapSlotLocations("oana", "grid", undefined, target.idx);
      persistAndRender();
    }

    oanaEl.addEventListener("pointerup", endOanaDrag);
    oanaEl.addEventListener("pointercancel", endOanaDrag);
  }

  function setGridSize(nextSize) {
    var ns = nextSize === 5 ? 5 : 3;
    if (ns === gridSize) return;
    cellsBySize[String(gridSize)] = cells.slice();
    oanaBySize[String(gridSize)] = oana.type === "card" ? { type: "card", cardNo: oana.cardNo, points: oana.points } : emptySlot();
    gridSize = ns;
    cells = cellsBySize[String(gridSize)].slice();
    oana = normalizeSlot(oanaBySize[String(gridSize)]);
    gridEl.querySelectorAll(".bingo-cell").forEach(function (el) {
      delete el.dataset.bingoWired;
    });
    delete oanaEl.dataset.bingoWired;
    persistAndRender();
  }

  document.getElementById("btn-bingo-back")?.addEventListener("click", function () {
    if (document.body.classList.contains("play-versus-mode")) {
      showAppView("game");
    } else {
      showDeckBuilderView();
    }
  });

  document.getElementById("btn-bingo-size-3")?.addEventListener("click", function () {
    setGridSize(3);
  });
  document.getElementById("btn-bingo-size-5")?.addEventListener("click", function () {
    setGridSize(5);
  });

  document.getElementById("btn-bingo-clear")?.addEventListener("click", function () {
    if (!window.confirm("このサイズのビンゴ配置と大穴をすべて消しますか？")) return;
    cells = defaultCells(gridSize);
    oana = emptySlot();
    gridEl.querySelectorAll(".bingo-cell").forEach(function (el) {
      delete el.dataset.bingoWired;
    });
    delete oanaEl.dataset.bingoWired;
    persistAndRender();
    showToast("ビンゴをクリアしました");
  });

  document.getElementById("btn-bingo-save-image")?.addEventListener("click", function () {
    const title = titleInput ? String(titleInput.value || "").trim() : "";
    const btn = document.getElementById("btn-bingo-save-image");
    if (btn) btn.disabled = true;
    exportBingoPng(gridSize, cells, oana, title || "禁止制限ダービー ビンゴ")
      .then(function (blob) {
        const date = new Date().toISOString().slice(0, 10);
        downloadBlob(blob, "loveca-bingo-" + gridSize + "x" + gridSize + "-" + date + ".png");
        showToast("ビンゴカードを PNG で保存しました");
      })
      .catch(function (err) {
        showToast(err && err.message ? String(err.message) : "画像保存に失敗しました");
      })
      .then(function () {
        if (btn) btn.disabled = false;
      });
  });

  if (titleInput && !titleInput.value) {
    titleInput.value = "禁止制限ダービー ビンゴ";
  }

  persistAndRender();
}
