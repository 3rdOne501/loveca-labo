/**
 * 禁止制限ダービー用 5×5 ビンゴカード（中央＝大穴）。
 * セルにラブカのカードを配置し、画像として保存できる。
 */
import { getAllCards, getCard, catalogListThumbnailUrl } from "./cards.js";
import { STORAGE_BINGO_DERBY } from "./config.js";
import { showToast } from "./ui.js";
import { showDeckBuilderView } from "./viewNav.js";

const GRID_SIZE = 5;
const CENTER_INDEX = 12;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

/** @typedef {{ type: 'free'|'card'|'empty', cardNo?: string }} BingoCell */

/**
 * @returns {BingoCell[]}
 */
function defaultCells() {
  /** @type {BingoCell[]} */
  const cells = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    cells.push(i === CENTER_INDEX ? { type: "free" } : { type: "empty" });
  }
  return cells;
}

function loadCells() {
  try {
    const raw = localStorage.getItem(STORAGE_BINGO_DERBY);
    if (!raw) return defaultCells();
    const o = JSON.parse(raw);
    if (!o || !Array.isArray(o.cells) || o.cells.length !== CELL_COUNT) return defaultCells();
    return o.cells.map(function (c, idx) {
      if (idx === CENTER_INDEX) return { type: "free" };
      if (c && c.type === "card" && c.cardNo) return { type: "card", cardNo: String(c.cardNo) };
      return { type: "empty" };
    });
  } catch (_) {
    return defaultCells();
  }
}

/** @param {BingoCell[]} cells */
function saveCells(cells) {
  try {
    localStorage.setItem(
      STORAGE_BINGO_DERBY,
      JSON.stringify({ v: 1, cells: cells, updatedAt: new Date().toISOString() }),
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
  const full = url || "";
  return (
    '<img class="' +
    escapeAttr(className) +
    '" src="' +
    escapeAttr(thumb) +
    '" data-full-src="' +
    escapeAttr(full) +
    '" alt="" loading="lazy" decoding="async" />'
  );
}

/**
 * @param {HTMLElement} root
 * @param {{ onPickCard: (idx: number) => void }} handlers
 */
function renderGrid(root, cells, handlers) {
  const parts = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = cells[i];
    const isCenter = i === CENTER_INDEX;
    let inner = "";
    let label = "";
    if (isCenter || cell.type === "free") {
      inner = '<span class="bingo-cell-free-label">大穴</span>';
      label = "大穴（ワイルド）";
    } else if (cell.type === "card" && cell.cardNo) {
      const c = getCard(cell.cardNo);
      if (c && c.img) {
        inner = thumbImgHtml(c.img, "bingo-cell-card-img");
      } else {
        inner = '<span class="bingo-cell-missing">' + escapeHtml(cell.cardNo) + "</span>";
      }
      label = c && c.name ? c.name : cell.cardNo;
    } else {
      inner = '<span class="bingo-cell-placeholder">＋</span>';
      label = "空きマス — クリックでカードを配置";
    }
    parts.push(
      '<button type="button" class="bingo-cell' +
        (isCenter ? " bingo-cell--free" : "") +
        (cell.type === "card" ? " bingo-cell--filled" : "") +
        '" data-bingo-idx="' +
        i +
        '" title="' +
        escapeAttr(label) +
        '" aria-label="' +
        escapeAttr(label) +
        '">' +
        inner +
        "</button>",
    );
  }
  root.innerHTML = parts.join("");
  root.querySelectorAll("[data-bingo-idx]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const idx = Number(btn.getAttribute("data-bingo-idx"));
      if (idx === CENTER_INDEX) return;
      handlers.onPickCard(idx);
    });
  });
}

/**
 * @param {(cardNo: string) => void} onPicked
 */
function openCardPickOverlay(onPicked) {
  var existing = document.getElementById("bingo-card-pick-root");
  if (existing) existing.remove();

  var cards = getAllCards();
  var backdrop = document.createElement("div");
  backdrop.id = "bingo-card-pick-root";
  backdrop.className = "bingo-card-pick-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  var dialog = document.createElement("div");
  dialog.className = "bingo-card-pick-dialog";

  var title = document.createElement("h3");
  title.textContent = "ビンゴに配置するカードを選ぶ";

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
      var hay =
        String(c.name || "") +
        " " +
        String(c.card_no || "") +
        " " +
        String(c.ability || "");
      return hay.toLowerCase().indexOf(query) >= 0;
    });
    if (filtered.length > 400) filtered = filtered.slice(0, 400);
    grid.innerHTML = "";
    filtered.forEach(function (c, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bingo-card-pick-card";
      btn.setAttribute("aria-label", (c.name || c.card_no) + " を配置");
      btn.innerHTML = c.img
        ? thumbImgHtml(c.img, "deck-builder-card-thumb")
        : '<div class="sample-recipe-thumb-fallback">?</div>';
      btn.addEventListener("click", function () {
        onPicked(String(c.card_no));
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
  dialog.appendChild(searchWrap);
  dialog.appendChild(grid);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  renderPickGrid("");
  searchInput.focus();
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement|null>}
 */
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

/**
 * @param {BingoCell[]} cells
 * @param {string} titleText
 */
async function exportBingoPng(cells, titleText) {
  const W = 1200;
  const H = 1400;
  const pad = 40;
  const titleH = 72;
  const gridTop = pad + titleH;
  const gridW = W - pad * 2;
  const cellW = gridW / GRID_SIZE;
  const cellH = cellW * 1.38;
  const gridH = cellH * GRID_SIZE;
  const canvasH = Math.min(H, gridTop + gridH + pad);

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
  ctx.fillText(titleText || "禁止制限ダービー ビンゴ", W / 2, pad + 40);

  for (let i = 0; i < CELL_COUNT; i++) {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const x = pad + col * cellW;
    const y = gridTop + row * cellH;
    const cell = cells[i];
    const isCenter = i === CENTER_INDEX;

    ctx.fillStyle = isCenter ? "rgba(255, 200, 80, 0.25)" : "rgba(255, 255, 255, 0.06)";
    ctx.strokeStyle = "rgba(255, 140, 190, 0.45)";
    ctx.lineWidth = 2;
    ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
    ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

    if (isCenter || cell.type === "free") {
      ctx.fillStyle = "#ffd080";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("大穴", x + cellW / 2, y + cellH / 2);
      continue;
    }

    if (cell.type === "card" && cell.cardNo) {
      const c = getCard(cell.cardNo);
      const img = c && c.img ? await loadImageForCanvas(c.img) : null;
      if (img) {
        const margin = 6;
        ctx.drawImage(img, x + margin, y + margin, cellW - margin * 2, cellH - margin * 2 - 18);
        ctx.fillStyle = "#e8dce8";
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        const nm = c && c.name ? String(c.name).slice(0, 14) : cell.cardNo;
        ctx.fillText(nm, x + cellW / 2, y + cellH - 6);
      } else {
        ctx.fillStyle = "#ccc";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cell.cardNo, x + cellW / 2, y + cellH / 2);
      }
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

/**
 * @param {{ getTitle?: () => string }} [opts]
 */
export function initBingoDerby(opts) {
  opts = opts || {};
  const root = document.getElementById("view-bingo");
  if (!root) return;

  const gridEl = document.getElementById("bingo-grid");
  const titleInput = /** @type {HTMLInputElement|null} */ (document.getElementById("bingo-title-input"));
  if (!gridEl) return;

  /** @type {BingoCell[]} */
  let cells = loadCells();

  function persistAndRender() {
    saveCells(cells);
    renderGrid(gridEl, cells, {
      onPickCard: function (idx) {
        openCardPickOverlay(function (cardNo) {
          cells[idx] = { type: "card", cardNo: cardNo };
          persistAndRender();
        });
      },
    });
  }

  document.getElementById("btn-bingo-back")?.addEventListener("click", function () {
    showDeckBuilderView();
  });

  document.getElementById("btn-bingo-clear")?.addEventListener("click", function () {
    if (!window.confirm("ビンゴの配置をすべて消しますか？（大穴は残ります）")) return;
    cells = defaultCells();
    persistAndRender();
    showToast("ビンゴをクリアしました");
  });

  document.getElementById("btn-bingo-save-image")?.addEventListener("click", function () {
    const title = titleInput ? String(titleInput.value || "").trim() : "";
    const btn = document.getElementById("btn-bingo-save-image");
    if (btn) btn.disabled = true;
    exportBingoPng(cells, title || "禁止制限ダービー ビンゴ")
      .then(function (blob) {
        const date = new Date().toISOString().slice(0, 10);
        downloadBlob(blob, "loveca-bingo-" + date + ".png");
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
