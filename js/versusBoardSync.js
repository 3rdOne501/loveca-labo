/**
 * オンライン対戦: 場・手札の公開スナップショット（相手閲覧用）
 * ソロプレイの盤面ロジックとは独立。
 */
import { CARD_BACK_DRAG_DATA_URI } from "./config.js";

export const VERSUS_BOARD_PUBLIC_V = 1;

/** @typedef {Object} VersusPublicCard
 * @property {number} id
 * @property {string} card_no
 * @property {string} name
 * @property {string} type
 * @property {string|null} img
 * @property {number} [cost]
 * @property {boolean} [lcWait]
 * @property {boolean} [lcInactive]
 * @property {boolean} [energyWait]
 */

/** @typedef {Object} VersusPublicBoard
 * @property {number} v
 * @property {number} ts
 * @property {number} turnCount
 * @property {number} deckCount
 * @property {VersusPublicCard[]} hand
 * @property {VersusPublicCard[]} waitingRoom
 * @property {VersusPublicCard[]} resolutionArea
 * @property {VersusPublicCard[]} successfulLiveArea
 * @property {VersusPublicCard[]} energyArea
 * @property {VersusPublicCard[]} previewScratch
 * @property {{ left: VersusPublicCard[], center: VersusPublicCard[], right: VersusPublicCard[] }} stage
 * @property {{ left: VersusPublicCard[], center: VersusPublicCard[], right: VersusPublicCard[] }} liveArea
 */

/** @param {unknown} c */
function stripCard(c) {
  if (!c || typeof c !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (c);
  const id = Math.floor(Number(o.id) || 0);
  if (!id) return null;
  /** @type {VersusPublicCard} */
  const out = {
    id: id,
    card_no: String(o.card_no || ""),
    name: String(o.name || o.card_no || ""),
    type: String(o.type || ""),
    img: o.img != null && String(o.img) ? String(o.img) : null,
  };
  if (o.cost != null && Number.isFinite(Number(o.cost))) {
    out.cost = Math.floor(Number(o.cost));
  }
  if (o.lcWait === true) out.lcWait = true;
  if (o.lcActive === false) out.lcInactive = true;
  if (o.isRotated === true) out.energyWait = true;
  return out;
}

/** @param {unknown[]} arr */
function stripCardList(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const c = stripCard(arr[i]);
    if (c) out.push(c);
  }
  return out;
}

/** @param {unknown} trip */
function stripTriple(trip) {
  const t =
    trip && typeof trip === "object"
      ? /** @type {Record<string, unknown>} */ (trip)
      : {};
  return {
    left: stripCardList(t.left),
    center: stripCardList(t.center),
    right: stripCardList(t.right),
  };
}

/**
 * 盤面スナップショット（snapshotBoard 相当）から相手共有用を生成。山札の中身は枚数のみ。
 * @param {Record<string, unknown>} board
 * @returns {VersusPublicBoard}
 */
export function boardToVersusPublic(board) {
  const b = board && typeof board === "object" ? board : {};
  return {
    v: VERSUS_BOARD_PUBLIC_V,
    ts: Date.now(),
    turnCount:
      typeof b.turnCount === "number" && Number.isFinite(b.turnCount)
        ? Math.max(0, Math.floor(b.turnCount))
        : 0,
    deckCount: Array.isArray(b.deck) ? b.deck.length : 0,
    hand: stripCardList(b.hand),
    waitingRoom: stripCardList(b.waitingRoom),
    resolutionArea: stripCardList(b.resolutionArea),
    successfulLiveArea: stripCardList(b.successfulLiveArea),
    energyArea: stripCardList(b.energyArea),
    previewScratch: stripCardList(b.previewScratch),
    stage: stripTriple(b.stage),
    liveArea: stripTriple(b.liveArea),
  };
}

/** @param {VersusPublicBoard|null|undefined} board */
export function fingerprintVersusPublicBoard(board) {
  if (!board || board.v !== VERSUS_BOARD_PUBLIC_V) return "";
  function ids(list) {
    return Array.isArray(list) ? list.map((c) => c.id).join(",") : "";
  }
  function trip(t) {
    return ids(t && t.left) + "|" + ids(t && t.center) + "|" + ids(t && t.right);
  }
  return [
    board.turnCount,
    board.deckCount,
    ids(board.hand),
    ids(board.waitingRoom),
    ids(board.resolutionArea),
    ids(board.successfulLiveArea),
    ids(board.energyArea),
    ids(board.previewScratch),
    trip(board.stage),
    trip(board.liveArea),
  ].join("\x1e");
}

/**
 * @param {import('./versusMatch.js').VersusMatchDoc|null} match
 * @param {'host'|'guest'} myRole
 * @returns {VersusPublicBoard|null}
 */
export function getOpponentBoardPublic(match, myRole) {
  if (!match || !myRole) return null;
  const raw = myRole === "host" ? match.guestBoardPublic : match.hostBoardPublic;
  if (!raw || typeof raw !== "object" || raw.v !== VERSUS_BOARD_PUBLIC_V) return null;
  return /** @type {VersusPublicBoard} */ (raw);
}

/**
 * @param {HTMLElement} container
 * @param {VersusPublicCard} c
 */
function appendOppCardChip(container, c) {
  const div = document.createElement("div");
  div.className = "versus-opp-card";
  div.title = (c.card_no ? c.card_no + " · " : "") + (c.name || "");
  if (c.type) div.dataset.type = c.type;
  if (c.lcWait) div.classList.add("versus-opp-card--lc-wait");
  if (c.lcInactive) div.classList.add("versus-opp-card--lc-inactive");
  if (c.energyWait) div.classList.add("versus-opp-card--energy-wait");
  const img = document.createElement("img");
  img.decoding = "async";
  img.loading = "lazy";
  img.draggable = false;
  if (c.img) {
    img.src = c.img;
    img.alt = c.name || "";
  } else {
    img.src = CARD_BACK_DRAG_DATA_URI;
    img.alt = c.card_no || "";
  }
  div.appendChild(img);
  if (c.type === "メンバー" && c.cost != null) {
    const pill = document.createElement("span");
    pill.className = "versus-opp-card__cost";
    pill.textContent = String(c.cost);
    div.appendChild(pill);
  }
  container.appendChild(div);
}

/**
 * @param {HTMLElement} strip
 * @param {VersusPublicCard[]} cards
 */
function fillOppStrip(strip, cards) {
  if (!strip) return;
  strip.replaceChildren();
  if (!cards || !cards.length) {
    const empty = document.createElement("span");
    empty.className = "versus-opp-empty muted";
    empty.textContent = "—";
    strip.appendChild(empty);
    return;
  }
  cards.forEach((c) => appendOppCardChip(strip, c));
}

/**
 * @param {VersusPublicBoard|null} board
 * @param {{ opponentName?: string, updatedAt?: string|null }} [opts]
 */
export function renderVersusOpponentBoard(board, opts) {
  const wrap = document.getElementById("versus-opponent-board-wrap");
  if (!wrap) return;
  wrap.hidden = false;
  const meta = document.getElementById("versus-opp-board-meta");
  if (meta) {
    const name = opts && opts.opponentName ? opts.opponentName : "相手";
    const at = opts && opts.updatedAt ? " · 更新 " + new Date(opts.updatedAt).toLocaleTimeString() : "";
    meta.textContent = board
      ? name + " の公開盤面" + at
      : name + " の盤面を待機中…";
  }
  const setCount = (id, n) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(Math.max(0, Math.floor(Number(n) || 0)));
  };
  if (!board) {
    ["versus-opp-zone-hand", "versus-opp-zone-waiting", "versus-opp-zone-resolution", "versus-opp-zone-sl", "versus-opp-zone-energy", "versus-opp-zone-preview"].forEach(
      (zid) => fillOppStrip(document.getElementById(zid), []),
    );
    ["left", "center", "right"].forEach((side) => {
      fillOppStrip(document.getElementById("versus-opp-stage-" + side), []);
      fillOppStrip(document.getElementById("versus-opp-live-" + side), []);
    });
    setCount("versus-opp-hand-count", 0);
    setCount("versus-opp-deck-count", 0);
    return;
  }
  setCount("versus-opp-hand-count", board.hand.length);
  setCount("versus-opp-deck-count", board.deckCount);
  fillOppStrip(document.getElementById("versus-opp-zone-hand"), board.hand);
  fillOppStrip(document.getElementById("versus-opp-zone-waiting"), board.waitingRoom);
  fillOppStrip(document.getElementById("versus-opp-zone-resolution"), board.resolutionArea);
  fillOppStrip(document.getElementById("versus-opp-zone-sl"), board.successfulLiveArea);
  fillOppStrip(document.getElementById("versus-opp-zone-energy"), board.energyArea);
  fillOppStrip(document.getElementById("versus-opp-zone-preview"), board.previewScratch);
  fillOppStrip(document.getElementById("versus-opp-stage-left"), board.stage.left);
  fillOppStrip(document.getElementById("versus-opp-stage-center"), board.stage.center);
  fillOppStrip(document.getElementById("versus-opp-stage-right"), board.stage.right);
  fillOppStrip(document.getElementById("versus-opp-live-left"), board.liveArea.left);
  fillOppStrip(document.getElementById("versus-opp-live-center"), board.liveArea.center);
  fillOppStrip(document.getElementById("versus-opp-live-right"), board.liveArea.right);
}

export function hideVersusOpponentBoard() {
  const wrap = document.getElementById("versus-opponent-board-wrap");
  if (wrap) wrap.hidden = true;
}
