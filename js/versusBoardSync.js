/**
 * オンライン対戦: 場・手札の公開スナップショット（相手閲覧用）
 * ソロプレイの盤面ロジックとは独立。
 */
import { CARD_BACK_DRAG_DATA_URI, T_LIVE, T_MEMBER } from "./config.js";
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
 * @property {boolean} [hiddenFace]
 */

/** @typedef {Object} VersusPublicBoard
 * @property {number} v
 * @property {number} ts
 * @property {number} turnCount
 * @property {number} deckCount
 * @property {number} handCount
 * @property {VersusPublicCard[]} hand
 * @property {VersusPublicCard[]} waitingRoom
 * @property {VersusPublicCard[]} resolutionArea
 * @property {VersusPublicCard[]} successfulLiveArea
 * @property {VersusPublicCard[]} energyArea
 * @property {VersusPublicCard[]} previewScratch
 * @property {{ left: VersusPublicCard[], center: VersusPublicCard[], right: VersusPublicCard[] }} stage
 * @property {{ left: VersusPublicCard[], center: VersusPublicCard[], right: VersusPublicCard[] }} liveArea
 * @property {boolean} [liveRevealed]
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
  if (o.hiddenFace === true) {
    return {
      id: id,
      card_no: "",
      name: "",
      type: String(o.type || ""),
      hiddenFace: true,
    };
  }
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

/** ライブ枠からライブカードのみ抽出（メンバー誤配置は公開しない） */
function liveCardsFromSlot(arr) {
  const list = arrayFromFirestoreValue(arr);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const c = stripCard(list[i], i);
    if (c && c.type === T_LIVE) out.push(c);
  }
  return out;
}

/** ライブ置き場はライブカード枚数だけ共有（表面は非公開） */
function stripLiveAreaPublic(trip) {
  const t =
    trip && typeof trip === "object"
      ? /** @type {Record<string, unknown>} */ (trip)
      : {};
  function slot(arr) {
    const lives = liveCardsFromSlot(arr);
    return lives.map(function (c, i) {
      return {
        id: c.id || "opp-live-" + i,
        card_no: "",
        name: "",
        type: T_LIVE,
        hiddenFace: true,
      };
    });
  }
  return {
    left: slot(t.left),
    center: slot(t.center),
    right: slot(t.right),
  };
}

/** ライブ開始後: ライブカードのみ表面公開 */
function stripLiveAreaRevealed(trip) {
  const t =
    trip && typeof trip === "object"
      ? /** @type {Record<string, unknown>} */ (trip)
      : {};
  function slot(arr) {
    const lives = liveCardsFromSlot(arr);
    return lives.filter(function (c) {
      return !c.hiddenFace;
    });
  }
  return {
    left: slot(t.left),
    center: slot(t.center),
    right: slot(t.right),
  };
}

function redactLiveAreaPublic(trip) {
  if (!trip) {
    return { left: [], center: [], right: [] };
  }
  function slot(list) {
    return (list || []).map(function (c, i) {
      return {
        id: c.id || "opp-live-" + i,
        card_no: "",
        name: "",
        type: "ライブ",
        hiddenFace: true,
      };
    });
  }
  return {
    left: slot(trip.left),
    center: slot(trip.center),
    right: slot(trip.right),
  };
}

/**
 * @param {Record<string, unknown>} board
 * @returns {VersusPublicBoard}
 */
export function boardToVersusPublic(board) {
  const b = board && typeof board === "object" ? board : {};
  const stage = stripTriple(b.stage);
  const liveRevealed = b.liveRevealed === true;
  const liveArea = liveRevealed
    ? stripLiveAreaRevealed(b.liveArea)
    : stripLiveAreaPublic(b.liveArea);
  const handCount = stripCardList(b.hand).length;
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
    handCount: handCount,
    hand: [],
    waitingRoom: stripCardList(b.waitingRoom),
    resolutionArea: stripCardList(b.resolutionArea),
    successfulLiveArea: stripCardList(b.successfulLiveArea),
    energyArea: stripCardList(b.energyArea),
    previewScratch: [],
    stage: stage,
    liveArea: liveArea,
    liveRevealed: liveRevealed,
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
    liveRevealed: st.liveRevealed === true,
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
    String(board.handCount || 0),
    board.liveRevealed ? "1" : "0",
    ids(board.waitingRoom),
    ids(board.resolutionArea),
    ids(board.successfulLiveArea),
    ids(board.energyArea),
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
      handCount: safe.handCount,
      liveRevealed: safe.liveRevealed === true,
      stageCount: countTriple(safe.stage),
      liveCount: countTriple(safe.liveArea),
    },
    [pre + "HandPublic"]: [],
    [pre + "WaitingPublic"]: safe.waitingRoom,
    [pre + "ResolutionPublic"]: safe.resolutionArea,
    [pre + "SuccessLivePublic"]: safe.successfulLiveArea,
    [pre + "EnergyPublic"]: safe.energyArea,
    [pre + "PreviewPublic"]: [],
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

  const handCount = Math.max(
    0,
    Math.floor(
      Number(meta.handCount) ||
        (nested && nested.handCount) ||
        (Array.isArray(nested && nested.hand) ? nested.hand.length : 0) ||
        0,
    ),
  );
  const stage = stripTriple(
    match[pre + "StagePublic"] != null ? match[pre + "StagePublic"] : nested && nested.stage,
  );
  const liveRevealed =
    meta.liveRevealed === true || (nested && nested.liveRevealed === true);
  const liveRawFull = stripTriple(
    match[pre + "LivePublic"] != null ? match[pre + "LivePublic"] : nested && nested.liveArea,
  );
  const liveRaw = liveRevealed
    ? stripLiveAreaRevealed(liveRawFull)
    : redactLiveAreaPublic(liveRawFull);

  return {
    v: VERSUS_BOARD_PUBLIC_V,
    ts: Math.max(0, Math.floor(Number(meta.ts) || 0)),
    turnCount: Math.max(0, Math.floor(Number(meta.turnCount) || 0)),
    deckCount: Math.max(0, Math.floor(Number(meta.deckCount) || 0)),
    handCount: handCount,
    hand: [],
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
    previewScratch: [],
    stage: stage,
    liveArea: liveRaw,
    liveRevealed: liveRevealed,
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
  if (c.hiddenFace) return null;
  const cat = c.card_no ? getCard(c.card_no) : null;
  if (cat && cat.img) return String(cat.img);
  return null;
}

/**
 * @param {HTMLElement} container
 * @param {VersusPublicCard} c
 * @param {{ forceLiveHorizontal?: boolean }} [opts]
 */
function appendOppCardItem(container, c, opts) {
  opts = opts || {};
  const div = document.createElement("div");
  div.className = "card-item versus-opp-card--facing";
  if (c.id) div.dataset.id = c.id;
  if (c.card_no) div.dataset.cardNo = c.card_no;
  if (c.type) div.dataset.type = c.type;
  if (c.hiddenFace) div.classList.add("card-item--opp-secret");
  if (c.lcWait) div.classList.add("card-item--lc-wait");
  if (c.lcInactive) div.classList.add("card-item--lc-inactive");
  if (c.energyWait) div.classList.add("card-item--energy-wait");
  const livePickBack = opts.forceLiveHorizontal && c.hiddenFace;
  const liveFaceUp = opts.forceLiveFaceUp && c.type === T_LIVE && !c.hiddenFace;
  if (livePickBack) div.classList.add("card-item--live-h");

  const artWrap = document.createElement("div");
  artWrap.className = "card-art-wrap";
  const img = document.createElement("img");
  img.className = "card-img";
  img.decoding = "async";
  img.loading = "lazy";
  img.draggable = false;
  const src = resolveCardImg(c);
  if (src) {
    img.src = src;
    img.alt = c.name || "";
  } else {
    img.src = CARD_BACK_DRAG_DATA_URI;
    img.alt = c.hiddenFace ? "非公開" : c.card_no || "";
  }
  if ((livePickBack || c.energyWait) && !liveFaceUp) img.classList.add("rotated");
  artWrap.appendChild(img);
  div.appendChild(artWrap);

  if (c.type === T_MEMBER && c.cost != null && !c.hiddenFace) {
    const pill = document.createElement("span");
    pill.className = "card-hand-cost-pill";
    pill.textContent = String(c.cost);
    div.appendChild(pill);
  }
  container.appendChild(div);
}

/**
 * @param {HTMLElement} strip
 * @param {VersusPublicCard[]} cards
 * @param {{ forceLiveHorizontal?: boolean }} [opts]
 */
function fillOppStrip(strip, cards, opts) {
  if (!strip) return;
  strip.replaceChildren();
  if (!cards || !cards.length) {
    return;
  }
  cards.forEach(function (c) {
    appendOppCardItem(strip, c, opts);
  });
}

/** @param {HTMLElement} strip @param {number} handCount */
function fillOppSecretHand(strip, handCount) {
  if (!strip) return;
  strip.replaceChildren();
  const n = Math.max(0, Math.floor(Number(handCount) || 0));
  if (!n) return;
  const show = Math.min(n, 10);
  for (let i = 0; i < show; i++) {
    appendOppCardItem(strip, {
      id: "opp-hand-secret-" + i,
      card_no: "",
      name: "",
      type: "",
      hiddenFace: true,
    });
  }
  if (n > show) {
    const more = document.createElement("span");
    more.className = "versus-opp-hand-more muted";
    more.textContent = "+" + (n - show);
    strip.appendChild(more);
  }
}

/**
 * @param {VersusPublicBoard|null} board
 * @param {{ opponentName?: string, updatedAt?: string|null, skipMeta?: boolean }} [opts]
 */
export function renderVersusOpponentBoard(board, opts) {
  const wrap = document.getElementById("versus-opponent-board-wrap");
  if (!wrap) return;
  wrap.hidden = false;
  const meta = document.getElementById("versus-opp-board-meta");
  if (meta && !(opts && opts.skipMeta)) {
    const name = opts && opts.opponentName ? opts.opponentName : "相手";
    const at = opts && opts.updatedAt ? " · 更新 " + new Date(opts.updatedAt).toLocaleTimeString() : "";
    if (!board) {
      meta.textContent = name + " の公開盤面を待機中…";
    } else {
      meta.textContent =
        name +
        "（向かい合わせ） · 手札 " +
        (board.handCount || 0) +
        " 枚（非公開） · 山札 " +
        board.deckCount +
        at;
    }
  }
  const setCount = function (id, n) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(Math.max(0, Math.floor(Number(n) || 0)));
  };
  const clearStrip = function (id) {
    const el = document.getElementById(id);
    if (el) el.replaceChildren();
  };
  if (!board) {
    clearStrip("versus-opp-zone-hand");
    clearStrip("versus-opp-zone-waiting");
    clearStrip("versus-opp-zone-resolution");
    clearStrip("versus-opp-zone-sl");
    clearStrip("versus-opp-zone-energy");
    ["left", "center", "right"].forEach(function (side) {
      clearStrip("versus-opp-stage-" + side);
      clearStrip("versus-opp-live-" + side);
    });
    setCount("versus-opp-hand-count", 0);
    setCount("versus-opp-deck-count", 0);
    setCount("versus-opp-sl-count", 0);
    setCount("versus-opp-waiting-count", 0);
    setCount("versus-opp-resolution-count", 0);
    setCount("versus-opp-energy-active-count", 0);
    setCount("versus-opp-energy-wait-count", 0);
    return;
  }

  var energyActive = 0;
  var energyWait = 0;
  board.energyArea.forEach(function (c) {
    if (c.energyWait) energyWait++;
    else energyActive++;
  });

  setCount("versus-opp-hand-count", board.handCount || 0);
  setCount("versus-opp-deck-count", board.deckCount);
  setCount("versus-opp-sl-count", board.successfulLiveArea.length);
  setCount("versus-opp-waiting-count", board.waitingRoom.length);
  setCount("versus-opp-resolution-count", board.resolutionArea.length);
  setCount("versus-opp-energy-active-count", energyActive);
  setCount("versus-opp-energy-wait-count", energyWait);

  fillOppSecretHand(document.getElementById("versus-opp-zone-hand"), board.handCount || 0);
  fillOppStrip(document.getElementById("versus-opp-zone-waiting"), board.waitingRoom);
  fillOppStrip(document.getElementById("versus-opp-zone-resolution"), board.resolutionArea);
  fillOppStrip(document.getElementById("versus-opp-zone-sl"), board.successfulLiveArea);
  fillOppStrip(document.getElementById("versus-opp-zone-energy"), board.energyArea);
  fillOppStrip(document.getElementById("versus-opp-stage-left"), board.stage.left);
  fillOppStrip(document.getElementById("versus-opp-stage-center"), board.stage.center);
  fillOppStrip(document.getElementById("versus-opp-stage-right"), board.stage.right);
  const liveRenderOpts = board.liveRevealed
    ? { forceLiveFaceUp: true }
    : { forceLiveHorizontal: true };
  fillOppStrip(document.getElementById("versus-opp-live-left"), board.liveArea.left, liveRenderOpts);
  fillOppStrip(
    document.getElementById("versus-opp-live-center"),
    board.liveArea.center,
    liveRenderOpts,
  );
  fillOppStrip(document.getElementById("versus-opp-live-right"), board.liveArea.right, liveRenderOpts);

  wireVersusOpponentZoneInspect(board, opts);

  const deckPile = document.getElementById("versus-opp-deck-pile");
  if (deckPile) {
    deckPile.replaceChildren();
    if (board.deckCount > 0) {
      const back = document.createElement("div");
      back.className = "versus-opp-deck-back";
      back.title = "山札 " + board.deckCount + " 枚";
      deckPile.appendChild(back);
    }
  }
}

export function hideVersusOpponentBoard() {
  const wrap = document.getElementById("versus-opponent-board-wrap");
  if (wrap) wrap.hidden = true;
}

/** @type {VersusPublicBoard|null} */
let lastOppInspectBoard = null;

/**
 * @param {VersusPublicBoard} board
 * @param {string} title
 * @param {VersusPublicCard[]} cards
 */
export function openVersusOpponentZoneDialog(board, title, cards) {
  lastOppInspectBoard = board;
  const dlg = document.getElementById("dlg-zone-bh-list");
  const titleEl = document.getElementById("dlg-zone-bh-list-title");
  const lead = document.getElementById("dlg-zone-bh-list-lead");
  const body = document.getElementById("dlg-zone-bh-list-body");
  if (!dlg || !body) return;
  if (titleEl) titleEl.textContent = "相手: " + title;
  if (lead) {
    lead.textContent =
      cards && cards.length
        ? cards.length + " 枚（対戦相手の公開情報）"
        : "このゾーンにカードはありません";
  }
  body.replaceChildren();
  if (!cards || !cards.length) {
    dlg.showModal();
    return;
  }
  const grid = document.createElement("div");
  grid.className = "dlg-zone-bh-list__grid";
  cards.forEach(function (c) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "dlg-zone-bh-list__tile";
    const img = document.createElement("img");
    img.className = "dlg-zone-bh-list__img";
    img.alt = c.name || c.card_no || "";
    const src = resolveCardImg(c);
    img.src = src || CARD_BACK_DRAG_DATA_URI;
    tile.appendChild(img);
    const lab = document.createElement("span");
    lab.className = "dlg-zone-bh-list__label";
    lab.textContent = c.hiddenFace ? "非公開" : c.name || c.card_no || "カード";
    tile.appendChild(lab);
    tile.addEventListener("click", function () {
      if (c.hiddenFace || !c.card_no) return;
      const cat = getCard(c.card_no);
      if (cat) {
        import("./cardCatalogDialog.js").then(function (mod) {
          mod.openCardCatalogDialog(cat, { playMode: true });
        });
      }
    });
    grid.appendChild(tile);
  });
  body.appendChild(grid);
  dlg.showModal();
}

/**
 * @param {VersusPublicBoard} board
 * @param {{ effectCardNo?: string|null }} [opts]
 */
function wireVersusOpponentZoneInspect(board, opts) {
  const wrap = document.getElementById("versus-opponent-board-wrap");
  if (!wrap) return;
  const zones = [
    { sel: "#versus-opp-zone-waiting", title: "控え室", cards: board.waitingRoom },
    { sel: "#versus-opp-zone-resolution", title: "解決", cards: board.resolutionArea },
    { sel: "#versus-opp-zone-sl", title: "成功ライブ", cards: board.successfulLiveArea },
    { sel: "#versus-opp-stage-left", title: "ステージ左", cards: board.stage.left },
    { sel: "#versus-opp-stage-center", title: "ステージ中央", cards: board.stage.center },
    { sel: "#versus-opp-stage-right", title: "ステージ右", cards: board.stage.right },
  ];
  zones.forEach(function (z) {
    const el = wrap.querySelector(z.sel);
    if (!el) return;
    el.classList.add("versus-opp-zone-clickable");
    el.onclick = function (ev) {
      ev.stopPropagation();
      openVersusOpponentZoneDialog(board, z.title, z.cards);
    };
  });
  const effectNo = opts && opts.effectCardNo ? String(opts.effectCardNo) : "";
  wrap.querySelectorAll(".card-item").forEach(function (node) {
    node.classList.remove("versus-opp-card--effect");
  });
  if (effectNo) {
    const hit = wrap.querySelector('.card-item[data-card-no="' + effectNo.replace(/"/g, "") + '"]');
    if (hit) hit.classList.add("versus-opp-card--effect");
  }
}
