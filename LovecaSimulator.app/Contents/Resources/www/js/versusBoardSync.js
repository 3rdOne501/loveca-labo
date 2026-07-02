/**
 * オンライン対戦: 場・手札の公開スナップショット（相手閲覧用）
 * ソロプレイの盤面ロジックとは独立。
 */
import { CARD_BACK_DRAG_DATA_URI, T_LIVE, T_MEMBER } from "./config.js";
import { getCard, cardIsNoteLiveCatalog, bladeHeartSlotsOnCard } from "./cards.js";
import { catalogLiveCardIsDrawYellBladeHeart } from "./cardCatalogDialog.js";
import {
  bladeHeartDisplaySlotLabel,
  cardHasBladeHeart,
  heartSlotArtIconHtml,
} from "./bladeHeart.js";
import { showToast } from "./ui.js";
import { boardMemberEffectIconHtml } from "./gameStatusIcons.js";
import { getVersusLiveStep } from "./versusMatch.js";

export const VERSUS_BOARD_PUBLIC_V = 2;
/** v1 ボードも読み取り互換（集計フィールドが無いだけ） */
export const VERSUS_BOARD_PUBLIC_V_MIN = 1;

/** @param {unknown} v */
function isAcceptableVersusBoardVersion(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= VERSUS_BOARD_PUBLIC_V_MIN && n <= VERSUS_BOARD_PUBLIC_V;
}

/**
 * v2 集計フィールド（read_compare 用の数値。古いボードは undefined = 読み手側で fallback）
 * stageWaitCount は「この盤の持ち主のステージのウェイト人数」（読み手にとっての相手ウェイト人数）。
 */
export const VERSUS_BOARD_AGGREGATE_FIELDS = [
  "liveFrameScore",
  "liveFrameScoreBase",
  "liveFrameScoreBonus",
  "successLiveCount",
  "successLiveScoreSum",
  "stageHeartTotal",
  "stageMemberCount",
  "stageWaitCount",
  "energyCount",
  /* Phase 5: この盤の持ち主が相手（=読み手）に課す常時デバフ。
   * imposeOpponentLiveNeedHeartDelta = 相手ライブの必要ハート +N（PL!SP-bp2-010 等 B型）。 */
  "imposeOpponentLiveNeedHeartDelta",
  /* bonusHeartSurplusTotal = この盤の持ち主のステージ上ボーナス（余剰）ハート合計。 */
  "bonusHeartSurplusTotal",
];

/** liveFrameScoreBonus のみ負値許容 */
const AGGREGATE_ALLOW_NEGATIVE = { liveFrameScoreBonus: true };

/**
 * 入力オブジェクトから集計フィールドを正規化コピー（無ければ undefined のまま）
 * @param {Record<string, unknown>} src
 * @param {Record<string, unknown>} out
 */
function copyVersusBoardAggregates(src, out) {
  for (const key of VERSUS_BOARD_AGGREGATE_FIELDS) {
    const n = Number(src[key]);
    if (!Number.isFinite(n)) continue;
    const v = Math.floor(n);
    out[key] = AGGREGATE_ALLOW_NEGATIVE[key] ? Math.max(-99, Math.min(99, v)) : Math.max(0, v);
  }
}

/** @typedef {Object} VersusPublicCard
 * @property {string} id
 * @property {string} card_no
 * @property {string} name
 * @property {string} type
 * @property {number} [cost]
 * @property {boolean} [lcWait]
 * @property {boolean} [lcActive]
 * @property {boolean} [lcInactive]
 * @property {boolean} [energyWait]
 * @property {number} [bonusBlade]
 * @property {Record<string, number>} [bonusHearts]
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
 * @property {"hidden"|"set"|"revealed"} [livePublicMode]
 * @property {VersusPublicCard[]} [handReveal]
 * @property {VersusPublicCard[]} [waitingReveal]
 * @property {number} [liveFrameScore] v2: ライブ合計スコア（base+効果+常時。加点込み）
 * @property {number} [liveFrameScoreBase] v2: 内訳（印刷+カード個別加点）
 * @property {number} [liveFrameScoreBonus] v2: 内訳（効果+常時。負値あり）
 * @property {number} [successLiveCount] v2: 成功ライブ置き場のライブ枚数
 * @property {number} [successLiveScoreSum] v2: 成功ライブ合計スコア（加点込み）
 * @property {number} [stageHeartTotal] v2: この盤のステージ総ハート（印刷スロット+ボーナス）
 * @property {number} [stageMemberCount] v2: ステージ人数（proxy 除く）
 * @property {number} [stageWaitCount] v2: ステージのウェイト人数（読み手の「相手ウェイト」）
 * @property {number} [energyCount] v2: エネルギー枚数
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
  var cardType = String(o.type || "");
  var isMember = cardType === T_MEMBER || cardType === "メンバー";
  var isEnergy = cardType === "エネルギー";
  if (isMember) {
    if (o.lcWait === true) out.lcWait = true;
    if (o.lcActive === true) out.lcActive = true;
    if (o.lcInactive === true) out.lcInactive = true;
    else if (o.lcActive === false) out.lcInactive = true;
    var bladeBonus =
      Math.max(0, Math.floor(Number(o.playBonusBladeAlways) || 0)) +
      Math.max(0, Math.floor(Number(o.playBonusBladeTurn) || 0)) +
      Math.max(0, Math.floor(Number(o.playBonusBlade) || 0));
    if (bladeBonus > 0) out.bonusBlade = bladeBonus;
    /** @type {Record<string, number>} */
    var hearts = {};
    var slotMaps = [
      o.playBonusHeartSlotsAlways,
      o.playBonusHeartSlotsTurn,
      o.playBonusHeartSlots,
    ];
    for (var sm = 0; sm < slotMaps.length; sm++) {
      var map = slotMaps[sm];
      if (!map || typeof map !== "object" || Array.isArray(map)) continue;
      Object.keys(map).forEach(function (k) {
        var n = Math.max(0, Math.floor(Number(map[k]) || 0));
        if (n > 0) hearts[k] = (hearts[k] || 0) + n;
      });
    }
    if (Object.keys(hearts).length) out.bonusHearts = hearts;
  } else if (isEnergy) {
    if (o.energyWait === true || o.isRotated === true) out.energyWait = true;
    if (o.lcWait === true) out.lcWait = true;
    if (o.lcActive === false) out.lcInactive = true;
  } else {
    if (o.lcWait === true) out.lcWait = true;
    if (o.lcInactive === true) out.lcInactive = true;
    else if (o.lcActive === false) out.lcInactive = true;
    if (o.energyWait === true) out.energyWait = true;
    else if (o.isRotated === true) out.energyWait = true;
  }
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

/** セット／パフォーマンス前: 枠内の全カードを裏向きで枚数共有 */
function stripLiveAreaSetMode(trip) {
  const t =
    trip && typeof trip === "object"
      ? /** @type {Record<string, unknown>} */ (trip)
      : {};
  function slot(arr) {
    const list = arrayFromFirestoreValue(arr);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const c = stripCard(list[i], i);
      if (!c) continue;
      out.push({
        id: c.id || "opp-live-set-" + i,
        card_no: "",
        name: "",
        type: c.type || T_LIVE,
        hiddenFace: true,
      });
    }
    return out;
  }
  return {
    left: slot(t.left),
    center: slot(t.center),
    right: slot(t.right),
  };
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
  const liveMode =
    b.livePublicMode === "set" || b.livePublicMode === "revealed" || b.livePublicMode === "hidden"
      ? b.livePublicMode
      : b.liveRevealed === true
        ? "revealed"
        : "hidden";
  const liveArea =
    liveMode === "revealed"
      ? stripLiveAreaRevealed(b.liveArea)
      : liveMode === "set"
        ? stripLiveAreaSetMode(b.liveArea)
        : stripLiveAreaPublic(b.liveArea);
  const liveRevealed = liveMode === "revealed";
  const handCount = stripCardList(b.hand).length;
  const handReveal = stripCardList(b.handReveal);
  const waitingReveal = stripCardList(b.waitingReveal);
  /** @type {Record<string, unknown>} */
  const out = {
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
    handReveal: handReveal.length ? handReveal : undefined,
    waitingReveal: waitingReveal.length ? waitingReveal : undefined,
    waitingRoom: stripCardList(b.waitingRoom),
    resolutionArea: stripCardList(b.resolutionArea),
    successfulLiveArea: stripCardList(b.successfulLiveArea),
    energyArea: stripCardList(b.energyArea),
    previewScratch: [],
    stage: stage,
    liveArea: liveArea,
    liveRevealed: liveRevealed,
    livePublicMode: liveMode,
  };
  copyVersusBoardAggregates(b, out);
  return /** @type {VersusPublicBoard} */ (out);
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
 * @param {Record<string, number>} [aggregates] v2 集計フィールド（simulator 側で算出）
 */
export function boardToVersusPublicFromState(st, aggregates) {
  return boardToVersusPublic({
    ...(aggregates && typeof aggregates === "object" ? aggregates : null),
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
    livePublicMode: st.livePublicMode || (st.liveRevealed === true ? "revealed" : "hidden"),
    handReveal: st.handReveal,
    waitingReveal: st.waitingReveal,
  });
}

/** 一人二役: 相手盤面を全面公開（手札・ライブ表面含む） */
export function boardToVersusPublicFromStateForLocalDual(st) {
  const hand = stripCardList(st.hand);
  return boardToVersusPublic({
    deck: st.deck,
    hand: st.hand,
    handReveal: hand,
    stage: st.stage,
    liveArea: st.liveArea,
    waitingRoom: st.waitingRoom,
    resolutionArea: st.resolutionArea,
    successfulLiveArea: st.successfulLiveArea,
    energyArea: st.energyArea,
    previewScratch: st.previewScratch || [],
    turnCount: st.turnCount,
    liveRevealed: true,
    livePublicMode: "revealed",
  });
}

/** @param {VersusPublicBoard|null|undefined} board */
export function fingerprintVersusPublicBoard(board) {
  if (!board || !isAcceptableVersusBoardVersion(board.v)) return "";
  function ids(list) {
    return Array.isArray(list) ? list.map((c) => c.id).join(",") : "";
  }
  function trip(t) {
    return ids(t && t.left) + "|" + ids(t && t.center) + "|" + ids(t && t.right);
  }
  /* v2: 集計数値の変化（スコア加点等。配置が変わらなくても push させる） */
  const aggFp = VERSUS_BOARD_AGGREGATE_FIELDS.map((k) => {
    const n = Number(/** @type {Record<string, unknown>} */ (board)[k]);
    return Number.isFinite(n) ? String(Math.floor(n)) : "";
  }).join(",");
  return [
    board.turnCount,
    board.deckCount,
    String(board.handCount || 0),
    ids(board.handReveal || []),
    ids(board.waitingReveal || []),
    board.livePublicMode || (board.liveRevealed ? "revealed" : "hidden"),
    ids(board.waitingRoom),
    ids(board.resolutionArea),
    ids(board.successfulLiveArea),
    ids(board.energyArea),
    trip(board.stage),
    trip(board.liveArea),
    aggFp,
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
  /** @type {Record<string, unknown>} */
  const meta = {
    v: VERSUS_BOARD_PUBLIC_V,
    ts: safe.ts,
    deckCount: safe.deckCount,
    turnCount: safe.turnCount,
    handCount: safe.handCount,
    liveRevealed: safe.liveRevealed === true,
    livePublicMode: safe.livePublicMode || (safe.liveRevealed ? "revealed" : "hidden"),
    stageCount: countTriple(safe.stage),
    liveCount: countTriple(safe.liveArea),
  };
  copyVersusBoardAggregates(safe, meta);
  return {
    updatedAt: now,
    [pre + "BoardPublic"]: safe,
    [pre + "BoardMeta"]: meta,
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
export function assemblePublicBoardFromMatchFields(match, pre) {
  const metaRaw = match[pre + "BoardMeta"] || match[pre + "BoardPublic"];
  if (!metaRaw || typeof metaRaw !== "object") return null;
  const meta = /** @type {Record<string, unknown>} */ (metaRaw);
  /* v1 も読み取り互換（v2 集計フィールドは undefined のまま → 読み手が fallback） */
  if (!isAcceptableVersusBoardVersion(meta.v)) return null;

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
  const liveModeRaw =
    meta.livePublicMode ||
    (nested && nested.livePublicMode) ||
    (meta.liveRevealed === true || (nested && nested.liveRevealed === true) ? "revealed" : "hidden");
  const liveMode =
    liveModeRaw === "set" || liveModeRaw === "revealed" || liveModeRaw === "hidden"
      ? liveModeRaw
      : "hidden";
  const liveRevealed = liveMode === "revealed";
  const liveRawFull = stripTriple(
    match[pre + "LivePublic"] != null ? match[pre + "LivePublic"] : nested && nested.liveArea,
  );
  const liveRaw =
    liveMode === "revealed"
      ? stripLiveAreaRevealed(liveRawFull)
      : liveMode === "set"
        ? stripLiveAreaSetMode(liveRawFull)
        : redactLiveAreaPublic(liveRawFull);

  /** @type {Record<string, unknown>} */
  const assembled = {
    v: VERSUS_BOARD_PUBLIC_V,
    ts: Math.max(0, Math.floor(Number(meta.ts) || 0)),
    turnCount: Math.max(0, Math.floor(Number(meta.turnCount) || 0)),
    deckCount: Math.max(0, Math.floor(Number(meta.deckCount) || 0)),
    handCount: handCount,
    hand: [],
    handReveal: stripCardList(nested && nested.handReveal),
    waitingReveal: stripCardList(nested && nested.waitingReveal),
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
    livePublicMode: liveMode,
  };
  /* v2 集計: meta 優先、なければ nested BoardPublic から（v1 は両方欠落 → undefined） */
  if (nested) copyVersusBoardAggregates(nested, assembled);
  copyVersusBoardAggregates(meta, assembled);
  return /** @type {VersusPublicBoard} */ (assembled);
}

/** @param {unknown} raw */
export function normalizeVersusPublicBoard(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (!isAcceptableVersusBoardVersion(o.v)) return null;
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
function effectGlowClassForKind(kind) {
  if (kind === "toujyou") return "card-item--play-toujou-glow";
  if (kind === "kidou") return "card-item--play-kidou-glow";
  if (kind === "live_start") return "card-item--play-live-start-glow";
  if (kind === "live_success") return "card-item--play-live-success-glow";
  return "card-item--play-kidou-glow";
}

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
  const livePickBack =
    (opts.forceLiveHorizontal && c.hiddenFace) || (opts.forceSetMode && c.hiddenFace);
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
  var isMember = c.type === T_MEMBER || c.type === "メンバー";
  var isEnergy = c.type === "エネルギー";
  if ((livePickBack || c.energyWait || (isMember && c.lcWait)) && !liveFaceUp) {
    img.classList.add("rotated");
  }
  artWrap.appendChild(img);
  div.appendChild(artWrap);

  var isEffectCard =
    opts.effectCardNo &&
    c.card_no &&
    String(c.card_no) === String(opts.effectCardNo);
  if (isEffectCard && opts.effectKind) {
    div.classList.add("versus-opp-card--effect");
    var glowCls = effectGlowClassForKind(opts.effectKind);
    if (glowCls) div.classList.add(glowCls);
    var iconKey = opts.effectKind;
    var iconHtml = boardMemberEffectIconHtml(iconKey, iconKey);
    if (iconHtml) {
      var iconHost = document.createElement("div");
      iconHost.className =
        "card-effect-icon-host card-effect-icon-host--opp-top card-effect-icon-glow--" +
        String(iconKey);
      iconHost.innerHTML = iconHtml;
      div.appendChild(iconHost);
    }
  }

  if ((isMember || isEnergy) && !c.hiddenFace) {
    var bar = document.createElement("div");
    bar.className = "card-stance-bar versus-opp-stance-bar";
    var waitOn = isMember ? c.lcWait === true : c.energyWait === true || c.lcWait === true;
    var actOn = isMember
      ? c.lcWait !== true && c.lcInactive !== true && c.lcActive !== false
      : !waitOn && c.lcInactive !== true;
    var wChip = document.createElement("span");
    wChip.className = "stance-chip stance-wait" + (waitOn ? " is-on" : "");
    wChip.textContent = "W";
    wChip.title = "ウェイト";
    var aChip = document.createElement("span");
    aChip.className = "stance-chip stance-active" + (actOn ? " is-on" : "");
    aChip.textContent = "A";
    aChip.title = "アクティブ";
    bar.appendChild(wChip);
    bar.appendChild(aChip);
    if (isMember) {
      var hbChip = document.createElement("span");
      hbChip.className = "stance-chip stance-hb";
      hbChip.textContent = "+H/B";
      hbChip.title = "所持ハート／ブレード（相手）";
      bar.appendChild(hbChip);
    }
    div.appendChild(bar);
  }

  if (isMember && (c.bonusBlade > 0 || (c.bonusHearts && Object.keys(c.bonusHearts).length))) {
    var foot = document.createElement("div");
    foot.className = "card-member-bonus-footer versus-opp-bonus-footer";
    if (c.bonusBlade > 0) {
      var bSp = document.createElement("span");
      bSp.className = "card-member-bonus-chip";
      bSp.textContent = "B+" + String(c.bonusBlade);
      foot.appendChild(bSp);
    }
    if (c.bonusHearts) {
      Object.keys(c.bonusHearts)
        .sort(function (a, b) {
          return Number(a) - Number(b);
        })
        .forEach(function (slot) {
          var v = c.bonusHearts[slot];
          if (!v) return;
          var hSp = document.createElement("span");
          hSp.className = "card-member-bonus-chip";
          hSp.textContent = "H" + slot + "+" + String(v);
          foot.appendChild(hSp);
        });
    }
    div.appendChild(foot);
  }

  if (c.type === T_MEMBER && c.cost != null && !c.hiddenFace) {
    const pill = document.createElement("span");
    pill.className = "card-hand-cost-pill";
    pill.textContent = String(c.cost);
    div.appendChild(pill);
  }
  if (!c.hiddenFace && c.card_no) {
    div.classList.add("versus-opp-card--inspectable");
    div.title = (c.name || c.card_no) + "（クリックで詳細）";
    div.addEventListener("click", function (ev) {
      ev.stopPropagation();
      const cat = getCard(c.card_no);
      if (!cat) return;
      import("./cardCatalogDialog.js").then(function (mod) {
        mod.openCardCatalogDialog(cat, { playMode: true });
      });
    });
  }
  container.appendChild(div);
}

/**
 * @param {HTMLElement} strip
 * @param {VersusPublicCard[]} cards
 * @param {{ forceLiveHorizontal?: boolean }} [opts]
 */
function applyOppZoneOverlapClasses(el, n) {
  if (!el) return;
  el.classList.remove("resolution-zone--t1", "resolution-zone--t2", "resolution-zone--t3");
  const ct = Math.max(0, Math.floor(Number(n) || 0));
  if (ct >= 21) el.classList.add("resolution-zone--t3");
  else if (ct >= 11) el.classList.add("resolution-zone--t2");
  else if (ct >= 5) el.classList.add("resolution-zone--t1");
}

/** @param {string} s */
function escapeHtmlPlain(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {VersusPublicBoard|null|undefined} board */
/** @param {VersusPublicBoard|null|undefined} board */
function countLiveCardsInPublicBoard(board) {
  if (!board || !board.liveArea) return 0;
  var n = 0;
  ["left", "center", "right"].forEach(function (side) {
    (board.liveArea[side] || []).forEach(function (c) {
      if (c && (c.type === T_LIVE || c.type === "ライブ")) n++;
    });
  });
  return n;
}

function syncVersusOppPerfNoLivePlaceholder(board, remoteMatch) {
  document
    .querySelectorAll("#versus-opponent-board .live-slot-no-live-placeholder")
    .forEach(function (el) {
      el.remove();
    });
  if (!remoteMatch || getVersusLiveStep(remoteMatch) !== "perf") return;
  if (countLiveCardsInPublicBoard(board) > 0) return;
  var center = document.getElementById("versus-opp-live-center");
  if (!center) return;
  var ph = document.createElement("div");
  ph.className = "live-slot-no-live-placeholder";
  ph.textContent = "ライブなし";
  ph.setAttribute("aria-live", "polite");
  center.appendChild(ph);
}

function oppLiveFaceUpInFrames(board) {
  if (!board || !board.liveArea) return 0;
  const liveMode = board.livePublicMode || (board.liveRevealed ? "revealed" : "hidden");
  if (liveMode !== "revealed") return 0;
  let n = 0;
  ["left", "center", "right"].forEach(function (side) {
    const list = board.liveArea[side] || [];
    list.forEach(function (c) {
      if (c && !c.hiddenFace && c.card_no) n++;
    });
  });
  return n;
}

function buildOppWaitingBhColorsHtml(cards) {
  if (!cards || !cards.length) {
    return '<p class="muted" style="margin:0;font-size:0.65rem">控え室にカードがありません</p>';
  }
  let nonBh = 0;
  let noteLive = 0;
  let drawYell = 0;
  /** @type {Record<number, number>} */
  const slotCount = {};
  cards.forEach(function (c) {
    if (!c || c.hiddenFace || !c.card_no) {
      nonBh++;
      return;
    }
    const cat = getCard(c.card_no);
    if (!cat) {
      nonBh++;
      return;
    }
    if (cat.type === T_LIVE && cardIsNoteLiveCatalog(cat)) noteLive++;
    if (cat.type === T_LIVE && catalogLiveCardIsDrawYellBladeHeart(cat)) drawYell++;
    if (!cardHasBladeHeart(cat)) {
      nonBh++;
      return;
    }
    bladeHeartSlotsOnCard(cat).forEach(function (s) {
      slotCount[s] = (slotCount[s] || 0) + 1;
    });
  });
  const parts = [];
  [1, 2, 3, 4, 7, 5, 6].forEach(function (si) {
    const cnt = slotCount[si] || 0;
    if (cnt <= 0) return;
    parts.push(
      '<span class="deck-remain-bh-pill deck-remain-bh-pill--art" data-bh-slot="' +
        si +
        '"><span class="deck-remain-bh-pill__lab">' +
        heartSlotArtIconHtml(si, { extraClass: "deck-remain-bh-pill__art-ico" }) +
        '<span class="visually-hidden">' +
        escapeHtmlPlain(bladeHeartDisplaySlotLabel(si)) +
        '</span></span><strong class="deck-remain-bh-pill__n">' +
        escapeHtmlPlain(String(cnt)) +
        "</strong></span>",
    );
  });
  const nonBhPill =
    '<span class="deck-remain-bh-pill deck-remain-bh-pill--nonbh" data-bh-slot="non">' +
    '<span class="deck-remain-bh-pill__lab">BHなし</span><strong class="deck-remain-bh-pill__n">' +
    escapeHtmlPlain(String(nonBh)) +
    "</strong></span>";
  const notePill =
    noteLive > 0
      ? '<span class="deck-remain-bh-pill deck-remain-bh-pill--note-live deck-remain-bh-pill--art" data-bh-slot="note" title="スコア（BHなしのライブ）枚数">' +
        '<span class="deck-remain-bh-pill__lab">' +
        heartSlotArtIconHtml(0, { score: true, extraClass: "deck-remain-bh-pill__art-ico" }) +
        '<span class="visually-hidden">スコア</span></span><strong class="deck-remain-bh-pill__n">' +
        escapeHtmlPlain(String(noteLive)) +
        "</strong></span>"
      : "";
  const drawYellPill =
    drawYell > 0
      ? '<span class="deck-remain-bh-pill deck-remain-bh-pill--draw-yell deck-remain-bh-pill--art" data-bh-slot="draw-yell" title="ドロー（BH）を持つライブ枚数">' +
        '<span class="deck-remain-bh-pill__lab">' +
        heartSlotArtIconHtml(0, { draw_yell: true, extraClass: "deck-remain-bh-pill__art-ico" }) +
        '<span class="visually-hidden">ドロー</span></span><strong class="deck-remain-bh-pill__n">' +
        escapeHtmlPlain(String(drawYell)) +
        "</strong></span>"
      : "";
  return (
    '<div class="deck-remain-bh-pill-row">' + nonBhPill + notePill + drawYellPill + parts.join("") + "</div>"
  );
}

/** @type {VersusPublicBoard|null} */
let lastOppBhInspectBoard = null;
let versusOppBhPillBound = false;
let lastOppHandRevealToastKey = "";

/**
 * @param {VersusPublicBoard} board
 * @param {string} slotKey
 */
function openVersusOpponentBhPillDialog(board, slotKey) {
  const cards = board.waitingRoom || [];
  let slotLabel = "";
  /** @type {(cat: ReturnType<typeof getCard>|null) => boolean} */
  let pred;
  if (slotKey === "non") {
    slotLabel = "BHなし";
    pred = function (cat) {
      return !cat || !cardHasBladeHeart(cat);
    };
  } else if (slotKey === "note") {
    slotLabel = "スコア";
    pred = function (cat) {
      return !!(cat && cat.type === T_LIVE && cardIsNoteLiveCatalog(cat));
    };
  } else if (slotKey === "draw-yell") {
    slotLabel = "ドロー";
    pred = function (cat) {
      return !!(cat && cat.type === T_LIVE && catalogLiveCardIsDrawYellBladeHeart(cat));
    };
  } else {
    const slotNum = Number(slotKey);
    if (!Number.isFinite(slotNum) || slotNum < 1 || slotNum > 7) return;
    slotLabel = bladeHeartDisplaySlotLabel(slotNum);
    pred = function (cat) {
      if (!cat || !cardHasBladeHeart(cat)) return false;
      return bladeHeartSlotsOnCard(cat).has(slotNum);
    };
  }
  const matched = cards.filter(function (c) {
    if (!c || c.hiddenFace || !c.card_no) return pred(null);
    return pred(getCard(c.card_no));
  });
  openVersusOpponentZoneDialog(board, "控え室 — " + slotLabel, matched);
}

function bindVersusOppBhPillClicksOnce() {
  if (versusOppBhPillBound) return;
  const host = document.getElementById("versus-opp-void-waiting-colors");
  if (!host) return;
  versusOppBhPillBound = true;
  host.addEventListener("click", function (ev) {
    const pill =
      ev.target && /** @type {Element} */ (ev.target).closest
        ? /** @type {Element} */ (ev.target).closest(".deck-remain-bh-pill")
        : null;
    if (!pill || !lastOppBhInspectBoard) return;
    const slot = pill.getAttribute("data-bh-slot");
    if (!slot) return;
    ev.stopPropagation();
    openVersusOpponentBhPillDialog(lastOppBhInspectBoard, slot);
  });
}

/** @type {number} */
let oppWaitRevealDialogTimer = 0;

function bindOppRevealDialogClose(btnId, dlgId, clearTimerFn) {
  const btn = document.getElementById(btnId);
  const dlg = document.getElementById(dlgId);
  if (!btn || !dlg || btn.dataset.wired === "1") return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", function () {
    clearTimerFn();
    try {
      dlg.close();
    } catch (_) {
      /* noop */
    }
  });
}

function bindOppHandRevealDialogOnce() {
  bindOppRevealDialogClose(
    "dlg-versus-opp-hand-reveal-close",
    "dlg-versus-opp-hand-reveal",
    function () {
      if (oppHandRevealDialogTimer) {
        clearTimeout(oppHandRevealDialogTimer);
        oppHandRevealDialogTimer = 0;
      }
    },
  );
  bindOppRevealDialogClose(
    "dlg-versus-opp-wait-reveal-close",
    "dlg-versus-opp-wait-reveal",
    function () {
      if (oppWaitRevealDialogTimer) {
        clearTimeout(oppWaitRevealDialogTimer);
        oppWaitRevealDialogTimer = 0;
      }
    },
  );
}

function syncVersusOppVoidWaitingColors(board) {
  const host = document.getElementById("versus-opp-void-waiting-colors");
  if (!host) return;
  bindVersusOppBhPillClicksOnce();
  if (!board || !board.waitingRoom || !board.waitingRoom.length) {
    lastOppBhInspectBoard = board;
    host.innerHTML =
      '<p class="versus-opp-void-waiting-title">控えの残色</p><p class="muted" style="margin:0;font-size:0.65rem">—</p>';
    return;
  }
  lastOppBhInspectBoard = board;
  host.innerHTML =
    '<p class="versus-opp-void-waiting-title">控えの残色</p>' +
    buildOppWaitingBhColorsHtml(board.waitingRoom);
}

/** @type {number} */
let oppHandRevealDialogTimer = 0;
/** @type {string} */
let lastOppWaitRevealToastKey = "";

/** @param {VersusPublicCard[]} cards @param {{ dlgId: string, bodyId: string, tileExtraClass?: string, onTimer?: (fn: () => void) => void }} opts */
function openVersusOpponentCardsRevealDialog(cards, opts) {
  if (!cards || !cards.length || !opts) return;
  const dlg = document.getElementById(opts.dlgId);
  const body = document.getElementById(opts.bodyId);
  if (!dlg || !body || typeof dlg.showModal !== "function") return;
  body.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "dlg-zone-bh-list__grid dlg-versus-opp-hand-reveal__grid";
  cards.forEach(function (c) {
    const tile = document.createElement("div");
    tile.className =
      "dlg-zone-bh-list__tile dlg-versus-opp-hand-reveal__tile" +
      (opts.tileExtraClass ? " " + opts.tileExtraClass : "");
    const img = document.createElement("img");
    img.className = "dlg-zone-bh-list__img";
    img.alt = c.name || c.card_no || "";
    const src = resolveCardImg(c);
    img.src = src || CARD_BACK_DRAG_DATA_URI;
    tile.appendChild(img);
    const lab = document.createElement("span");
    lab.className = "dlg-zone-bh-list__label";
    lab.textContent = c.name || c.card_no || "カード";
    tile.appendChild(lab);
    grid.appendChild(tile);
  });
  body.appendChild(grid);
  try {
    dlg.showModal();
  } catch (_) {
    /* noop */
  }
  if (typeof opts.onTimer === "function") {
    opts.onTimer(function () {
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
    });
  }
}

/** @param {VersusPublicCard[]} cards */
function openVersusOpponentHandRevealDialog(cards) {
  openVersusOpponentCardsRevealDialog(cards, {
    dlgId: "dlg-versus-opp-hand-reveal",
    bodyId: "dlg-versus-opp-hand-reveal-body",
    onTimer: function (closeFn) {
      if (oppHandRevealDialogTimer) clearTimeout(oppHandRevealDialogTimer);
      oppHandRevealDialogTimer = window.setTimeout(function () {
        oppHandRevealDialogTimer = 0;
        closeFn();
      }, 6200);
    },
  });
}

/** @param {VersusPublicCard[]} cards */
function openVersusOpponentWaitingRevealDialog(cards) {
  openVersusOpponentCardsRevealDialog(cards, {
    dlgId: "dlg-versus-opp-wait-reveal",
    bodyId: "dlg-versus-opp-wait-reveal-body",
    tileExtraClass: "dlg-versus-opp-wait-reveal__tile",
    onTimer: function (closeFn) {
      if (oppWaitRevealDialogTimer) clearTimeout(oppWaitRevealDialogTimer);
      oppWaitRevealDialogTimer = window.setTimeout(function () {
        oppWaitRevealDialogTimer = 0;
        closeFn();
      }, 6200);
    },
  });
}

/** 盤面切替時など、誤って公開トーストが出ないようリセット */
export function resetVersusOpponentRevealToastState() {
  lastOppHandRevealToastKey = "";
  lastOppWaitRevealToastKey = "";
  if (oppHandRevealDialogTimer) {
    clearTimeout(oppHandRevealDialogTimer);
    oppHandRevealDialogTimer = 0;
  }
  if (oppWaitRevealDialogTimer) {
    clearTimeout(oppWaitRevealDialogTimer);
    oppWaitRevealDialogTimer = 0;
  }
  ["dlg-versus-opp-hand-reveal", "dlg-versus-opp-wait-reveal"].forEach(function (id) {
    var dlg = document.getElementById(id);
    if (dlg && dlg.open) {
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
    }
  });
}

/** @param {VersusPublicBoard|null|undefined} board */
function maybeToastOpponentHandReveal(board) {
  if (!board || !board.handReveal || !board.handReveal.length) return;
  const key =
    board.handReveal
      .map(function (c) {
        return c.id;
      })
      .join(",") +
    "@" +
    String(board.handCount || 0);
  if (key === lastOppHandRevealToastKey) return;
  lastOppHandRevealToastKey = key;
  showToast("相手が手札に追加", { duration: 4500 });
  openVersusOpponentHandRevealDialog(board.handReveal);
}

/** @param {VersusPublicBoard|null|undefined} board */
function maybeToastOpponentWaitingReveal(board) {
  if (!board || !board.waitingReveal || !board.waitingReveal.length) return;
  const key =
    board.waitingReveal
      .map(function (c) {
        return c.id;
      })
      .join(",") +
    "@" +
    String(board.waitingRoom ? board.waitingRoom.length : 0);
  if (key === lastOppWaitRevealToastKey) return;
  lastOppWaitRevealToastKey = key;
  showToast("相手が控え室にカードを置きました", { duration: 4500 });
  openVersusOpponentWaitingRevealDialog(board.waitingReveal);
}

/**
 * @param {import('./versusMatch.js').VersusMatchDoc|null} remoteMatch
 * @param {'host'|'guest'|null} myRole
 * @param {VersusPublicBoard|null|undefined} [board]
 */
function renderVersusOppLiveScore(remoteMatch, myRole, board) {
  const el = document.getElementById("versus-opp-live-center-score");
  if (!el || !remoteMatch || !myRole) return;
  const oppRole = myRole === "host" ? "guest" : "host";
  const score =
    oppRole === "host" ? remoteMatch.hostLivePerfScore : remoteMatch.guestLivePerfScore;
  const n = Number.isFinite(Number(score)) ? Math.max(0, Math.floor(Number(score))) : null;
  if (n == null) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.className = "live-score-center-bar versus-opp-live-center-score";
  const placeholder = board && oppLiveFaceUpInFrames(board) === 0;
  if (placeholder) {
    el.classList.add("live-score-center-bar--placeholder");
    el.innerHTML =
      '<span class="live-score-center-bar__label">ライブスコア</span>' +
      '<span class="live-score-center-bar__num live-score-num--placeholder">－</span>' +
      '<span class="live-score-center-bar__suffix">点</span>';
    return;
  }
  el.classList.remove("live-score-center-bar--placeholder");
  el.innerHTML =
    '<span class="live-score-center-bar__label">ライブスコア</span>' +
    '<span class="live-score-center-bar__num">' +
    n +
    "</span>" +
    '<span class="live-score-center-bar__suffix">点</span>';
}

function fillOppStrip(strip, cards, opts) {
  if (!strip) return;
  strip.replaceChildren();
  if (!cards || !cards.length) {
    return;
  }
  cards.forEach(function (c) {
    appendOppCardItem(strip, c, opts);
  });
  applyOppZoneOverlapClasses(strip, cards.length);
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
 * @param {{ opponentName?: string, updatedAt?: string|null, skipMeta?: boolean, skipRevealToasts?: boolean, effectCardNo?: string|null, effectKind?: string|null, remoteMatch?: import('./versusMatch.js').VersusMatchDoc|null, myRole?: 'host'|'guest'|null }} [opts]
 */
export function renderVersusOpponentBoard(board, opts) {
  const wrap = document.getElementById("versus-opponent-board-wrap");
  if (!wrap) return;
  bindOppHandRevealDialogOnce();
  wrap.hidden = false;
  const meta = document.getElementById("versus-opp-board-meta");
  if (meta && !(opts && opts.skipMeta)) {
    const name = opts && opts.opponentName ? opts.opponentName : "相手";
    const at = opts && opts.updatedAt ? " · 更新 " + new Date(opts.updatedAt).toLocaleTimeString() : "";
    if (!board) {
      meta.textContent = name + " の公開盤面を待機中…";
    } else {
      var handNote =
        board.handReveal && board.handReveal.length
          ? " 枚（公開中 " + board.handReveal.length + "）"
          : " 枚（非公開）";
      meta.textContent =
        name +
        "（向かい合わせ） · 手札 " +
        (board.handCount || 0) +
        handNote +
        " · 山札 " +
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
  setCount(
    "versus-opp-sl-count",
    (board.successfulLiveArea || []).filter(function (c) {
      return c && c.type === T_LIVE;
    }).length,
  );
  setCount("versus-opp-waiting-count", board.waitingRoom.length);
  setCount("versus-opp-resolution-count", board.resolutionArea.length);
  setCount("versus-opp-energy-active-count", energyActive);
  setCount("versus-opp-energy-wait-count", energyWait);

  const handStrip = document.getElementById("versus-opp-zone-hand");
  const skipRevealToasts = !!(opts && opts.skipRevealToasts);
  if (board.handReveal && board.handReveal.length) {
    fillOppStrip(handStrip, board.handReveal);
    if (!skipRevealToasts) {
      maybeToastOpponentHandReveal(board);
    }
  } else {
    fillOppSecretHand(handStrip, board.handCount || 0);
  }
  fillOppStrip(document.getElementById("versus-opp-zone-waiting"), board.waitingRoom);
  if (!skipRevealToasts) {
    maybeToastOpponentWaitingReveal(board);
  }
  fillOppStrip(document.getElementById("versus-opp-zone-resolution"), board.resolutionArea);
  fillOppStrip(document.getElementById("versus-opp-zone-sl"), board.successfulLiveArea);
  fillOppStrip(document.getElementById("versus-opp-zone-energy"), board.energyArea);
  const liveMode = board.livePublicMode || (board.liveRevealed ? "revealed" : "hidden");
  const liveRenderOpts =
    liveMode === "revealed"
      ? { forceLiveFaceUp: true }
      : liveMode === "set"
        ? { forceSetMode: true }
        : { forceLiveHorizontal: true };
  var effectCardNo = opts && opts.effectCardNo ? String(opts.effectCardNo) : "";
  var effectKind = opts && opts.effectKind ? String(opts.effectKind) : "";
  var effectOpts =
    effectCardNo && effectKind
      ? { effectCardNo: effectCardNo, effectKind: effectKind }
      : {};
  function withEffectOpts(base) {
    return Object.assign({}, base || {}, effectOpts);
  }
  fillOppStrip(document.getElementById("versus-opp-live-left"), board.liveArea.left, withEffectOpts(liveRenderOpts));
  fillOppStrip(
    document.getElementById("versus-opp-live-center"),
    board.liveArea.center,
    withEffectOpts(liveRenderOpts),
  );
  fillOppStrip(
    document.getElementById("versus-opp-live-right"),
    board.liveArea.right,
    withEffectOpts(liveRenderOpts),
  );
  fillOppStrip(document.getElementById("versus-opp-stage-left"), board.stage.left, effectOpts);
  fillOppStrip(document.getElementById("versus-opp-stage-center"), board.stage.center, effectOpts);
  fillOppStrip(document.getElementById("versus-opp-stage-right"), board.stage.right, effectOpts);
  syncVersusOppPerfNoLivePlaceholder(board, opts && opts.remoteMatch);

  wireVersusOpponentZoneInspect(board, opts);
  syncVersusOppVoidWaitingColors(board);
  if (opts && opts.remoteMatch) {
    renderVersusOppLiveScore(opts.remoteMatch, opts.myRole || null, board);
  }

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
  const liveMode = board.livePublicMode || (board.liveRevealed ? "revealed" : "hidden");
  const liveFaceUp =
    liveMode === "revealed"
      ? [].concat(
          board.liveArea.left || [],
          board.liveArea.center || [],
          board.liveArea.right || [],
        ).filter(function (c) {
          return c && !c.hiddenFace && c.card_no;
        })
      : [];
  const zones = [
    { sel: "#versus-opp-zone-waiting", title: "控え室", cards: board.waitingRoom },
    { sel: "#versus-opp-zone-resolution", title: "解決", cards: board.resolutionArea },
    { sel: "#versus-opp-zone-sl", title: "成功ライブ", cards: board.successfulLiveArea },
    { sel: "#versus-opp-live-left", title: "ライブ左", cards: liveFaceUp.length ? board.liveArea.left : [] },
    {
      sel: "#versus-opp-live-center",
      title: "ライブ中央",
      cards: liveFaceUp.length ? board.liveArea.center : [],
    },
    { sel: "#versus-opp-live-right", title: "ライブ右", cards: liveFaceUp.length ? board.liveArea.right : [] },
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
