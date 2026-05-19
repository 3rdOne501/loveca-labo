/**
 * オンライン対戦: 場・手札の公開スナップショット（相手閲覧用）
 * ソロプレイの盤面ロジックとは独立。
 */
import { CARD_BACK_DRAG_DATA_URI, T_MEMBER } from "./config.js";
import { getCard } from "./cards.js";

export const VERSUS_BOARD_PUBLIC_V = 1;

/** @typedef {Object} VersusPublicCard
 * @property {string} id
 * @property {string} card_no
 * @property {string} name
 * @property {string} type
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

/** @param {unknown} raw */
function arrayFromFirestoreValue(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const o = /** @type {Record<string, unknown>} */ (raw);
  const numKeys = Object.keys(o).filter(function (k) {
    return /^\d+$/.test(k);
  });
  if (numKeys.length) {
    numKeys.sort(function (a, b) {
      return Number(a) - Number(b);
    });
    return numKeys.map(function (k) {
      return o[k];
    });
  }
  return Object.keys(o).map(function (k) {
    return o[k];
  });
}

/** @param {unknown} c @param {number} indexInZone */
function stripCard(c, indexInZone) {
  if (!c || typeof c !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (c);
  const cardNo = String(o.card_no || o.cardNo || "");
  let id = o.id != null && String(o.id) ? String(o.id) : "";
  if (!id && cardNo) id = cardNo + "@" + String(indexInZone);
  if (!id) return null;
  /** @type {VersusPublicCard} */
  const out = {
    id: id,
    card_no: cardNo,
    name: String(o.name || cardNo || ""),
    type: String(o.type || ""),
  };
  if (o.cost != null && Number.isFinite(Number(o.cost))) {
    out.cost = Math.floor(Number(o.cost));
  }
  if (o.lcWait === true) out.lcWait = true;
  if (o.lcInactive === true) out.lcInactive = true;
  else if (o.lcActive === false) out.lcInactive = true;
  if (o.energyWait === true) out.energyWait = true;
  else if (o.isRotated === true) out.energyWait = true;
  return out;
}

/** @param {unknown} raw */
function stripCardList(raw) {
  const arr = arrayFromFirestoreValue(raw);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const c = stripCard(arr[i], i);
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

function countTriple(trip) {
  if (!trip) return 0;
  return (
    (trip.left ? trip.left.length : 0) +
    (trip.center ? trip.center.length : 0) +
    (trip.right ? trip.right.length : 0)
  );
}

/**
 * @param {Record<string, unknown>} board
 * @returns {VersusPublicBoard}
 */
export function boardToVersusPublic(board) {
  const b = board && typeof board === "object" ? board : {};
  const stage = stripTriple(b.stage);
  const liveArea = stripTriple(b.liveArea);
  const hand = stripCardList(b.hand);
  return {
    v: VERSUS_BOARD_PUBLIC_V,
    ts: Date.now(),
    turnCount:
      typeof b.turnCount === "number" && Number.isFinite(b.turnCount)
        ? Math.max(0, Math.floor(b.turnCount))
        : 0,
    deckCount:
      typeof b.deckCount === "number" && Number.isFinite(b.deckCount)
        ? Math.max(0, Math.floor(b.deckCount))
        : Array.isArray(b.deck)
          ? b.deck.length
          : 0,
    hand: hand,
    waitingRoom: stripCardList(b.waitingRoom),
    resolutionArea: stripCardList(b.resolutionArea),
    successfulLiveArea: stripCardList(b.successfulLiveArea),
    energyArea: stripCardList(b.energyArea),
    previewScratch: stripCardList(b.previewScratch),
    stage: stage,
    liveArea: liveArea,
  };
}

/**
 * 盤面 state から直接公開用を作る（snapshotBoard のクローンを介さない）
 * @param {{
 *   deck: unknown[],
 *   hand: unknown[],
 *   stage: Record<string, unknown[]>,
 *   liveArea: Record<string, unknown[]>,
 *   waitingRoom: unknown[],
 *   resolutionArea: unknown[],
 *   successfulLiveArea: unknown[],
 *   energyArea: unknown[],
 *   previewScratch?: unknown[],
 *   turnCount: number,
 * }} st
 */
export function boardToVersusPublicFromState(st) {
  return boardToVersusPublic({
    deck: st.deck,
    hand: st.hand,
    stage: st.stage,
    liveArea: st.liveArea,
    waitingRoom: st.waitingRoom,
    resolutionArea: st.resolutionArea,
    successfulLiveArea: st.successfulLiveArea,
    energyArea: st.energyArea,
    previewScratch: st.previewScratch || [],
    turnCount: st.turnCount,
  });
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

/** Firestore 送信用に undefined を除去 */
export function sanitizeVersusPublicBoardForFirestore(board) {
  try {
    return JSON.parse(JSON.stringify(board));
  } catch (_) {
    return board;
  }
}

/**
 * ルーム doc 用の更新パッチ（配列はトップレベルにも書く）
 * @param {'host'|'guest'} role
 * @param {VersusPublicBoard} board
 */
export function buildVersusBoardFirestorePatch(role, board) {
  const pre = role === "host" ? "host" : "guest";
  const safe = sanitizeVersusPublicBoardForFirestore(board);
  const now = new Date().toISOString();
  const rev = Math.max(0, Math.floor(Number(safe.ts) || Date.now()));
  return {
    updatedAt: now,
    [pre + "BoardPublic"]: safe,
    [pre + "BoardMeta"]: {
      v: VERSUS_BOARD_PUBLIC_V,
      ts: safe.ts,
      deckCount: safe.deckCount,
      turnCount: safe.turnCount,
      handCount: safe.hand.length,
      stageCount: countTriple(safe.stage),
      liveCount: countTriple(safe.liveArea),
    },
    [pre + "HandPublic"]: safe.hand,
    [pre + "WaitingPublic"]: safe.waitingRoom,
    [pre + "ResolutionPublic"]: safe.resolutionArea,
    [pre + "SuccessLivePublic"]: safe.successfulLiveArea,
    [pre + "EnergyPublic"]: safe.energyArea,
    [pre + "PreviewPublic"]: safe.previewScratch,
    [pre + "StagePublic"]: safe.stage,
    [pre + "LivePublic"]: safe.liveArea,
    [pre + "BoardAt"]: now,
    [pre + "BoardRev"]: rev,
  };
}

/**
 * @param {Record<string, unknown>} match
 * @param {'host'|'guest'} pre
 * @returns {VersusPublicBoard|null}
 */
function assemblePublicBoardFromMatchFields(match, pre) {
  const metaRaw = match[pre + "BoardMeta"] || match[pre + "BoardPublic"];
  if (!metaRaw || typeof metaRaw !== "object") return null;
  const meta = /** @type {Record<string, unknown>} */ (metaRaw);
  if (Number(meta.v) !== VERSUS_BOARD_PUBLIC_V) return null;

  const nested =
    match[pre + "BoardPublic"] && typeof match[pre + "BoardPublic"] === "object"
      ? /** @type {Record<string, unknown>} */ (match[pre + "BoardPublic"])
      : null;

  const hand = stripCardList(
    match[pre + "HandPublic"] != null ? match[pre + "HandPublic"] : nested && nested.hand,
  );
  const stage = stripTriple(
    match[pre + "StagePublic"] != null ? match[pre + "StagePublic"] : nested && nested.stage,
  );
  const liveArea = stripTriple(
    match[pre + "LivePublic"] != null ? match[pre + "LivePublic"] : nested && nested.liveArea,
  );

  return {
    v: VERSUS_BOARD_PUBLIC_V,
    ts: Math.max(0, Math.floor(Number(meta.ts) || 0)),
    turnCount: Math.max(0, Math.floor(Number(meta.turnCount) || 0)),
    deckCount: Math.max(0, Math.floor(Number(meta.deckCount) || 0)),
    hand: hand,
    waitingRoom: stripCardList(
      match[pre + "WaitingPublic"] != null
        ? match[pre + "WaitingPublic"]
        : nested && nested.waitingRoom,
    ),
    resolutionArea: stripCardList(
      match[pre + "ResolutionPublic"] != null
        ? match[pre + "ResolutionPublic"]
        : nested && nested.resolutionArea,
    ),
    successfulLiveArea: stripCardList(
      match[pre + "SuccessLivePublic"] != null
        ? match[pre + "SuccessLivePublic"]
        : nested && nested.successfulLiveArea,
    ),
    energyArea: stripCardList(
      match[pre + "EnergyPublic"] != null
        ? match[pre + "EnergyPublic"]
        : nested && nested.energyArea,
    ),
    previewScratch: stripCardList(
      match[pre + "PreviewPublic"] != null
        ? match[pre + "PreviewPublic"]
        : nested && nested.previewScratch,
    ),
    stage: stage,
    liveArea: liveArea,
  };
}

/** @param {unknown} raw */
export function normalizeVersusPublicBoard(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (Number(o.v) !== VERSUS_BOARD_PUBLIC_V) return null;
  return boardToVersusPublic(o);
}

/**
 * @param {import('./versusMatch.js').VersusMatchDoc|null} match
 * @param {'host'|'guest'} myRole
 * @returns {VersusPublicBoard|null}
 */
export function getOpponentBoardPublic(match, myRole) {
  if (!match || !myRole) return null;
  const pre = myRole === "host" ? "guest" : "host";
  return assemblePublicBoardFromMatchFields(/** @type {Record<string, unknown>} */ (match), pre);
}

/** @param {VersusPublicCard} c */
function resolveCardImg(c) {
  const cat = c.card_no ? getCard(c.card_no) : null;
  if (cat && cat.img) return String(cat.img);
  return null;
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
  const src = resolveCardImg(c);
  if (src) {
    img.src = src;
    img.alt = c.name || "";
  } else {
    img.src = CARD_BACK_DRAG_DATA_URI;
    img.alt = c.card_no || "";
  }
  div.appendChild(img);
  if (c.type === T_MEMBER && c.cost != null) {
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
  cards.forEach(function (c) {
    appendOppCardChip(strip, c);
  });
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
    if (!board) {
      meta.textContent = name + " の盤面を待機中…";
    } else {
      meta.textContent =
        name +
        " · 手札 " +
        board.hand.length +
        " · 山札 " +
        board.deckCount +
        " · ステージ " +
        countTriple(board.stage) +
        at;
    }
  }
  const setCount = function (id, n) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(Math.max(0, Math.floor(Number(n) || 0)));
  };
  if (!board) {
    [
      "versus-opp-zone-hand",
      "versus-opp-zone-waiting",
      "versus-opp-zone-resolution",
      "versus-opp-zone-sl",
      "versus-opp-zone-energy",
      "versus-opp-zone-preview",
    ].forEach(function (zid) {
      fillOppStrip(document.getElementById(zid), []);
    });
    ["left", "center", "right"].forEach(function (side) {
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
