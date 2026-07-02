import { T_LIVE, T_MEMBER } from "./config.js";

/**
 * @typedef {object} OpponentBoardDeps
 * @property {() => { host: object|null, guest: object|null }} getDualBoards
 * @property {() => boolean} isDualBoardActive
 * @property {() => 'host'|'guest'} getInactiveRole
 * @property {() => object} snapshotBoard
 * @property {(snap: object) => void} applyBoard
 * @property {() => void} [render]
 * @property {() => void} [syncOpponentView]
 * @property {() => void} [syncPassiveEffects] 盤面変更後に常時効果を再計算（スナップ保存前に呼ぶ）
 * @property {(inst: *) => object} mergedCatalogCard
 */

/** @type {OpponentBoardDeps|null} */
let deps = null;

/**
 * read/mutateInactiveOpponentBoard 中は state が非アクティブ盤に差し替わるため、
 * その間の「相手盤スナップ」は退避済みのアクティブ盤（＝適用中盤面から見た真の相手）を返す。
 * @type {object|null}
 */
let swapActiveSnap = null;

/** @param {OpponentBoardDeps} d */
export function initOpponentBoardApi(d) {
  deps = d;
}

export function isDualOpponentBoardMode() {
  return !!(deps && deps.isDualBoardActive && deps.isDualBoardActive());
}

/** @returns {'host'|'guest'|null} */
export function getInactiveOpponentRole() {
  if (!isDualOpponentBoardMode() || !deps || !deps.getInactiveRole) return null;
  return deps.getInactiveRole();
}

/** @returns {object|null} */
export function getInactiveOpponentSnapshot() {
  if (!isDualOpponentBoardMode() || !deps) return null;
  if (swapActiveSnap) return swapActiveSnap;
  var role = getInactiveOpponentRole();
  if (!role) return null;
  var boards = deps.getDualBoards();
  return boards && boards[role] ? boards[role] : null;
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {T|null}
 */
export function readInactiveOpponentBoard(fn) {
  if (!isDualOpponentBoardMode() || !deps || typeof fn !== "function") return null;
  var role = getInactiveOpponentRole();
  if (!role) return null;
  var boards = deps.getDualBoards();
  var oppSnap = boards[role];
  if (!oppSnap) return null;
  var activeSnap = deps.snapshotBoard();
  var prevSwapSnap = swapActiveSnap;
  swapActiveSnap = activeSnap;
  deps.applyBoard(oppSnap);
  try {
    return fn();
  } finally {
    swapActiveSnap = prevSwapSnap;
    deps.applyBoard(activeSnap);
  }
}

/**
 * @template T
 * @param {() => T} fn
 * @param {{ skipRender?: boolean }} [opts]
 * @returns {T|null}
 */
export function mutateInactiveOpponentBoard(fn, opts) {
  if (!isDualOpponentBoardMode() || !deps || typeof fn !== "function") return null;
  var role = getInactiveOpponentRole();
  if (!role) return null;
  var boards = deps.getDualBoards();
  var oppSnap = boards[role];
  if (!oppSnap) return null;
  var activeSnap = deps.snapshotBoard();
  var prevSwapSnap = swapActiveSnap;
  swapActiveSnap = activeSnap;
  deps.applyBoard(oppSnap);
  var result = null;
  try {
    result = fn();
    if (deps.syncPassiveEffects) {
      try {
        deps.syncPassiveEffects();
      } catch (_) {}
    }
    boards[role] = deps.snapshotBoard();
    if (deps.syncOpponentView) deps.syncOpponentView();
  } finally {
    swapActiveSnap = prevSwapSnap;
    deps.applyBoard(activeSnap);
    if (!opts || opts.skipRender !== true) {
      if (deps.render) deps.render();
    }
  }
  return result;
}

/**
 * @param {object} snap
 * @param {number} maxCost
 * @returns {*[]}
 */
export function listMembersFromSnapshot(snap, maxCost) {
  if (!snap || !deps) return [];
  var out = [];
  var seen = {};
  var limit = Number.isFinite(Number(maxCost)) ? Number(maxCost) : 99;

  function add(c) {
    if (!c || c.type !== T_MEMBER) return;
    var mc = deps.mergedCatalogCard(c);
    var cost = Number(mc.cost);
    if (!Number.isFinite(cost) || cost > limit) return;
    var id = String(c.id);
    if (seen[id]) return;
    seen[id] = true;
    out.push(c);
  }

  var stage = snap.stage && typeof snap.stage === "object" ? snap.stage : {};
  ["left", "center", "right"].forEach(function (col) {
    (stage[col] || []).forEach(add);
  });
  (Array.isArray(snap.hand) ? snap.hand : []).forEach(add);
  (Array.isArray(snap.waitingRoom) ? snap.waitingRoom : []).forEach(add);
  return out;
}

/** @param {number} maxCost @returns {*[]|null} null = use solo fallback */
export function listInactiveOpponentMemberCandidates(maxCost) {
  var snap = getInactiveOpponentSnapshot();
  if (!snap) return null;
  return listMembersFromSnapshot(snap, maxCost);
}

/**
 * @param {object} snap
 * @param {*} inst
 * @returns {string}
 */
export function opponentMemberZoneLabelFromSnapshot(snap, inst) {
  if (!inst || inst.id == null) return "";
  var id = String(inst.id);
  var stage = snap && snap.stage && typeof snap.stage === "object" ? snap.stage : {};
  var cols = ["left", "center", "right"];
  for (var ci = 0; ci < cols.length; ci++) {
    var col = cols[ci];
    if (
      (stage[col] || []).some(function (c) {
        return c && String(c.id) === id;
      })
    ) {
      return col === "left" ? "ステージ・左" : col === "right" ? "ステージ・右" : "ステージ・センター";
    }
  }
  if (
    (Array.isArray(snap.hand) ? snap.hand : []).some(function (c) {
      return c && String(c.id) === id;
    })
  ) {
    return "手札";
  }
  if (
    (Array.isArray(snap.waitingRoom) ? snap.waitingRoom : []).some(function (c) {
      return c && String(c.id) === id;
    })
  ) {
    return "控え室";
  }
  return "";
}

/** @param {object} snap @returns {number} */
export function countStageWaitMembersFromSnapshot(snap) {
  if (!snap || !snap.stage) return 0;
  var n = 0;
  ["left", "center", "right"].forEach(function (col) {
    (snap.stage[col] || []).forEach(function (m) {
      if (m && m.type === T_MEMBER && m.lcWait === true) n++;
    });
  });
  return n;
}

/** @param {object} snap @returns {number} */
export function countStageMembersFromSnapshot(snap) {
  if (!snap || !snap.stage) return 0;
  var n = 0;
  ["left", "center", "right"].forEach(function (col) {
    (snap.stage[col] || []).forEach(function (m) {
      if (m && m.type === T_MEMBER) n++;
    });
  });
  return n;
}

/** @param {object} snap @returns {number} */
export function energyCountFromSnapshot(snap) {
  return Array.isArray(snap && snap.energyArea) ? snap.energyArea.length : 0;
}

/** @param {*} c @returns {boolean} */
function snapshotSuccessLiveCardIsLive(c) {
  if (!c) return false;
  if (c.type === T_LIVE) return true;
  if (deps && deps.mergedCatalogCard) return deps.mergedCatalogCard(c).type === T_LIVE;
  return false;
}

/** 成功ライブカード置き場にあるライブカードの枚数 */
export function successLiveLiveCardCountFromArea(area) {
  if (!Array.isArray(area)) return 0;
  var n = 0;
  area.forEach(function (c) {
    if (snapshotSuccessLiveCardIsLive(c)) n++;
  });
  return n;
}

/** @param {object} snap @returns {number} */
export function successLiveCountFromSnapshot(snap) {
  return successLiveLiveCardCountFromArea(snap && snap.successfulLiveArea);
}
