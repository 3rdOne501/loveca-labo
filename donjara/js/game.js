/**
 * ローカル対戦ループ（麻雀準拠・副露/立直対応）。
 * 4 人打ち、player 0 が人間。ツモ・ロン・ポン・チー・カン・暗槓・加槓・立直・流局に対応。
 *
 * オンライン化時は、この state を Firestore に載せ、
 * 各アクションを権威（ホスト）側で適用する構成に拡張する。
 */

import { analyzeHand, isTenpai } from "./mahjong.js";
import { evaluateHand } from "./yaku.js";
import { buildWall, enabledYaku, meldOptionsFromConfig } from "./config.js";
import {
  canPon,
  canKan,
  chiOptions,
  ankanOptions,
  shouminkanOptions,
  meldToStructure,
} from "./calls.js";
import {
  createMatchState,
  applyWinResult,
  applyDrawResult,
  onRiichiDeclared,
  serializeMatch,
  deserializeMatch,
} from "./match.js";

function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * ドラ表示牌 → ドラ牌のキーを返す。
 *  - メンバー牌: 同一コンテンツ内で orderIndex を +1（最大なら 1 へループ）
 *  - 字牌: catalog.honors の並び順で次の字牌（末尾なら先頭へループ）
 */
export function nextDoraKey(indicatorKey, catalog) {
  const t = catalog.byKey.get(indicatorKey);
  if (!t) return null;
  if (t.suit === "honor") {
    const list = catalog.honors || [];
    const idx = list.findIndex((h) => h.key === indicatorKey);
    if (idx < 0 || !list.length) return null;
    return list[(idx + 1) % list.length].key;
  }
  const list = catalog.byContent.get(t.suit) || [];
  if (!list.length) return null;
  const max = list.reduce((m, x) => Math.max(m, x.orderIndex || 0), 0);
  const nextOrder = (t.orderIndex || 0) >= max ? 1 : (t.orderIndex || 0) + 1;
  const hit = list.find((x) => x.orderIndex === nextOrder);
  return hit ? hit.key : null;
}

/** 表示牌配列から、有効なドラ牌キーの Set を返す（表ドラ+裏ドラ）。 */
export function doraKeySet(game) {
  const set = new Set();
  const add = (inds) => {
    for (const ind of inds || []) {
      const k = nextDoraKey(ind, game.catalog);
      if (k) set.add(k);
    }
  };
  add(game.doraIndicators);
  add(game.uradoraIndicators);
  return set;
}

/** カン成立時に王牌からドラ/裏ドラ表示を追加。 */
function addDoraPair(game) {
  if (!game.wall.length) return;
  game.doraIndicators = game.doraIndicators || [];
  game.uradoraIndicators = game.uradoraIndicators || [];
  game.doraIndicators.push(game.wall.shift());
  if (game.wall.length) game.uradoraIndicators.push(game.wall.shift());
  game.log.push({ t: "doraAdd" });
}

/** ev（役あり確定）にドラ/裏ドラ翻を加算。 */
function applyDora(game, ev) {
  if (!ev || !ev.structure) return ev;
  const dSet = new Set();
  const uSet = new Set();
  for (const ind of game.doraIndicators || []) {
    const k = nextDoraKey(ind, game.catalog);
    if (k) dSet.add(k);
  }
  for (const ind of game.uradoraIndicators || []) {
    const k = nextDoraKey(ind, game.catalog);
    if (k) uSet.add(k);
  }
  if (!dSet.size && !uSet.size) return ev;
  let dn = 0;
  let un = 0;
  for (const k of ev.structure.tiles) {
    if (dSet.has(k)) dn++;
    if (uSet.has(k)) un++;
  }
  if (dn > 0) {
    ev.yaku = ev.yaku.concat([{ name: "ドラ", han: dn }]);
    ev.totalHan += dn;
  }
  if (un > 0) {
    ev.yaku = ev.yaku.concat([{ name: "裏ドラ", han: un }]);
    ev.totalHan += un;
  }
  return ev;
}

export function createGame(config, catalog, existingMatch = null) {
  const { wall } = buildWall(config, catalog);
  shuffle(wall);

  const nPlayers = Math.min(Math.max(config.players || 4, 2), 4);
  const handSize = config.handSize || 13;
  const match = existingMatch || createMatchState(config, nPlayers);

  const players = [];
  for (let p = 0; p < nPlayers; p++) {
    players.push({
      id: p,
      isHuman: p === 0,
      hand: [],
      melds: [],
      discards: [],
      riichi: false,
      drawn: null,
    });
  }

  for (let i = 0; i < handSize; i++) {
    for (let p = 0; p < nPlayers; p++) players[p].hand.push(wall.pop());
  }
  players.forEach((pl) => sortHand(pl.hand, catalog));

  const controllers = players.map((_, i) => (i === 0 ? "human" : "cpu"));

  const doraIndicators = wall.length ? [wall.shift()] : [];
  const uradoraIndicators = wall.length ? [wall.shift()] : [];

  return {
    config,
    catalog,
    wall,
    players,
    nPlayers,
    handSize,
    controllers,
    doraIndicators,
    uradoraIndicators,
    match,
    turn: match.dealer,
    phase: "draw",
    pendingDiscard: null,
    callOptionsBySeat: {},
    callResponses: {},
    riichiPending: false,
    result: null,
    yakuList: enabledYaku(config, catalog),
    log: [],
  };
}

/** 同一マッチの次局を開始（持ち点・親・局数を引き継ぐ）。 */
export function startNextHand(game) {
  const { config, catalog, match, controllers } = game;
  const next = createGame(config, catalog, match);
  next.controllers = controllers.slice();
  return next;
}

function finalizeHand(game) {
  if (!game.result || !game.match) return;
  if (game.result.type === "draw") {
    game.result = applyDrawResult(game);
  } else {
    game.result = applyWinResult(game, game.result);
  }
}

export function isMenzen(pl) {
  return pl.melds.every((m) => m.kind === "ankan");
}

/* ---------------- オンライン同期用シリアライズ ---------------- */

/** ゲーム状態を JSON 安全なオブジェクトへ（catalog/yakuList は除外）。 */
export function serializeGame(game) {
  return {
    wall: game.wall.slice(),
    players: game.players.map((p) => ({
      id: p.id,
      hand: p.hand.slice(),
      melds: p.melds.map((m) => ({ kind: m.kind, tiles: m.tiles.slice(), from: m.from, calledTile: m.calledTile })),
      discards: p.discards.slice(),
      riichi: p.riichi,
      drawn: p.drawn,
    })),
    nPlayers: game.nPlayers,
    handSize: game.handSize,
    controllers: game.controllers.slice(),
    doraIndicators: (game.doraIndicators || []).slice(),
    uradoraIndicators: (game.uradoraIndicators || []).slice(),
    turn: game.turn,
    phase: game.phase,
    pendingDiscard: game.pendingDiscard,
    callOptionsBySeat: game.callOptionsBySeat,
    callResponses: game.callResponses,
    riichiPending: game.riichiPending,
    result: game.result,
    match: serializeMatch(game.match),
    log: game.log.slice(-60),
  };
}

/** シリアライズ済み状態から実行可能な game を復元（catalog/yakuList を再付与）。 */
export function deserializeGame(data, config, catalog) {
  return {
    config,
    catalog,
    yakuList: enabledYaku(config, catalog),
    wall: (data.wall || []).slice(),
    players: (data.players || []).map((p) => ({
      id: p.id,
      isHuman: false,
      hand: (p.hand || []).slice(),
      melds: (p.melds || []).map((m) => ({ ...m, tiles: (m.tiles || []).slice() })),
      discards: (p.discards || []).slice(),
      riichi: !!p.riichi,
      drawn: p.drawn || null,
    })),
    nPlayers: data.nPlayers,
    handSize: data.handSize,
    controllers: (data.controllers || []).slice(),
    doraIndicators: (data.doraIndicators || []).slice(),
    uradoraIndicators: (data.uradoraIndicators || []).slice(),
    turn: data.turn,
    phase: data.phase,
    pendingDiscard: data.pendingDiscard || null,
    callOptionsBySeat: data.callOptionsBySeat || {},
    callResponses: data.callResponses || {},
    riichiPending: !!data.riichiPending,
    result: data.result || null,
    match: deserializeMatch(data.match, data.nPlayers) || createMatchState(config, data.nPlayers),
    log: (data.log || []).slice(),
  };
}

export function openMeldStructures(pl, catalog) {
  return pl.melds.map((m) => meldToStructure(m, catalog));
}

export function sortHand(hand, catalog) {
  hand.sort((a, b) => {
    const ta = catalog.byKey.get(a);
    const tb = catalog.byKey.get(b);
    if (!ta || !tb) return 0;
    if (ta.suit !== tb.suit) {
      if (ta.suit === "honor") return 1;
      if (tb.suit === "honor") return -1;
      return ta.suit < tb.suit ? -1 : 1;
    }
    if (ta.suit === "honor") return String(ta.honorId).localeCompare(String(tb.honorId));
    return (ta.orderIndex || 0) - (tb.orderIndex || 0);
  });
  return hand;
}

/* ---------------- ツモ / ドロー ---------------- */

/** drawn が手牌に無い場合はクリア（表示・打牌の不整合防止）。 */
export function normalizePlayerHand(pl) {
  if (pl.drawn != null && !pl.hand.includes(pl.drawn)) pl.drawn = null;
}

export function drawTile(game, rinshan = false) {
  if (game.wall.length === 0) {
    endDrawGame(game);
    return;
  }
  const pl = game.players[game.turn];
  normalizePlayerHand(pl);
  const tile = game.wall.pop();
  pl.drawn = tile;
  pl.hand.push(tile);
  sortHand(pl.hand, game.catalog);
  game.phase = "discard";
  game.log.push({ t: rinshan ? "rinshan" : "draw", p: game.turn, tile });
}

function meldOpts(game) {
  return meldOptionsFromConfig(game.config);
}

function winEval(game, pl, tsumo) {
  const analysis = analyzeHand(pl.hand, game.catalog, meldOpts(game));
  if (!analysis.isAgari) return null;
  const ev = evaluateHand(
    analysis,
    { menzen: isMenzen(pl), tsumo, riichi: pl.riichi, openMelds: openMeldStructures(pl, game.catalog) },
    game.catalog,
    game.yakuList
  );
  if (!ev || ev.totalHan <= 0) return null;
  return applyDora(game, ev);
}

export function checkTsumo(game) {
  const pl = game.players[game.turn];
  return winEval(game, pl, true);
}

export function declareTsumo(game) {
  const ev = checkTsumo(game);
  if (!ev) return false;
  game.phase = "over";
  game.result = {
    type: "tsumo",
    winner: game.turn,
    from: game.turn,
    hand: game.players[game.turn].hand.slice(),
    melds: game.players[game.turn].melds.slice(),
    menzen: isMenzen(game.players[game.turn]),
    eval: ev,
  };
  game.log.push({ t: "tsumo", p: game.turn, han: ev.totalHan });
  finalizeHand(game);
  return true;
}

/* ---------------- 立直 ---------------- */

/** 現手番プレイヤーが立直宣言可能か（門前・未立直・打牌でテンパイ維持できる） */
export function canDeclareRiichi(game) {
  const pl = game.players[game.turn];
  if (!pl.isHuman && false) return false;
  if (pl.riichi || !isMenzen(pl)) return false;
  if (game.phase !== "discard") return false;
  return tenpaiKeepDiscards(game, pl.hand).size > 0;
}

/** 打牌したら 13 枚がテンパイになる牌の集合 */
export function tenpaiKeepDiscards(game, hand) {
  const keep = new Set();
  for (const k of [...new Set(hand)]) {
    const rest = hand.slice();
    rest.splice(rest.indexOf(k), 1);
    if (isTenpai(rest, game.catalog, meldOpts(game))) keep.add(k);
  }
  return keep;
}

/* ---------------- 打牌 → 鳴き解決（席非依存） ---------------- */

export function discardTile(game, tileKey, handIndex = null) {
  if (game.phase !== "discard") return false;
  const pl = game.players[game.turn];
  normalizePlayerHand(pl);

  let idx = -1;
  if (
    handIndex != null &&
    handIndex >= 0 &&
    handIndex < pl.hand.length &&
    pl.hand[handIndex] === tileKey
  ) {
    idx = handIndex;
  } else if (pl.drawn === tileKey && pl.hand.includes(tileKey)) {
    idx = pl.hand.lastIndexOf(tileKey);
  } else {
    idx = pl.hand.indexOf(tileKey);
  }
  if (idx < 0) return false;

  // 立直宣言中はテンパイ維持牌のみ打牌可
  if (game.riichiPending) {
    if (!tenpaiKeepDiscards(game, pl.hand).has(tileKey)) return false;
    pl.riichi = true;
    game.riichiPending = false;
    onRiichiDeclared(game.match, game.turn);
    game.log.push({ t: "riichi", p: game.turn });
  }

  pl.hand.splice(idx, 1);
  pl.drawn = null;
  pl.discards.push(tileKey);
  sortHand(pl.hand, game.catalog);
  normalizePlayerHand(pl);
  game.log.push({ t: "discard", p: game.turn, tile: tileKey });

  game.pendingDiscard = { tile: tileKey, from: game.turn };
  resolveCalls(game);
  return true;
}

/** 打牌者以外の各席について鳴き選択肢を計算。 */
export function callOptionsFor(game, p) {
  const pd = game.pendingDiscard;
  if (!pd || pd.from === p) return null;
  const pl = game.players[p];
  if (pl.riichi) return null; // 立直後は鳴かない（MVP）
  const isKamicha = (pd.from + 1) % game.nPlayers === p; // チーは上家の打牌のみ
  const opts = {
    tile: pd.tile,
    from: pd.from,
    ron: !!ronEval(game, p, pd.tile),
    pon: canPon(pl.hand, pd.tile),
    kan: canKan(pl.hand, pd.tile),
    chi: isKamicha ? chiOptions(pl.hand, pd.tile, game.catalog, meldOpts(game)) : [],
  };
  if (!opts.ron && !opts.pon && !opts.kan && !opts.chi.length) return null;
  return opts;
}

/** 互換ヘルパ: 指定席（既定 0）の鳴き選択肢。callWait 中はキャッシュを返す。 */
export function computeHumanCallOptions(game, seat = 0) {
  if (game.callOptionsBySeat && game.callOptionsBySeat[seat]) return game.callOptionsBySeat[seat];
  return callOptionsFor(game, seat);
}

/**
 * 打牌に対する鳴き解決。
 * 各席の応答を集計し、人間席で未応答があれば callWait で停止。
 * CPU 席は即時に意思決定。
 */
function resolveCalls(game) {
  const pd = game.pendingDiscard;
  const responses = {};
  const bySeat = {};
  let humanPending = false;

  for (let p = 0; p < game.nPlayers; p++) {
    if (p === pd.from) continue;
    const opts = callOptionsFor(game, p);
    if (!opts) {
      responses[p] = { type: "skip" };
      continue;
    }
    if (game.controllers[p] === "cpu") {
      responses[p] = cpuCallIntent(game, p, opts);
    } else {
      responses[p] = null; // 未応答
      bySeat[p] = opts;
      humanPending = true;
    }
  }

  game.callResponses = responses;
  game.callOptionsBySeat = bySeat;

  if (humanPending) {
    game.phase = "callWait";
    return;
  }
  finalizeCalls(game);
}

/** 席 seat の鳴き応答を登録。全席応答済みになれば確定。 */
export function submitCallResponse(game, seat, response) {
  if (game.phase !== "callWait") return;
  if (!(seat in game.callResponses)) return;
  game.callResponses[seat] = response || { type: "skip" };
  const stillPending = Object.values(game.callResponses).some((r) => r === null);
  if (!stillPending) finalizeCalls(game);
}

/** 応答を優先度（ロン > ポン/カン > チー、席順は打牌者の下家から）で確定。 */
function finalizeCalls(game) {
  const pd = game.pendingDiscard;
  const order = [];
  for (let off = 1; off < game.nPlayers; off++) order.push((pd.from + off) % game.nPlayers);

  // ロン
  for (const p of order) {
    const r = game.callResponses[p];
    if (r && r.type === "ron") {
      declareRonBy(game, p, pd.tile, pd.from);
      return;
    }
  }
  // ポン/カン
  for (const p of order) {
    const r = game.callResponses[p];
    if (r && r.type === "kan") {
      applyKan(game, p, pd.tile, pd.from);
      return;
    }
    if (r && r.type === "pon") {
      applyPon(game, p, pd.tile, pd.from);
      return;
    }
  }
  // チー
  for (const p of order) {
    const r = game.callResponses[p];
    if (r && r.type === "chi") {
      applyChi(game, p, pd.tile, r.tiles, pd.from);
      return;
    }
  }
  advanceToNextDraw(game, pd.from);
}

function ronEval(game, p, tile) {
  const pl = game.players[p];
  const analysis = analyzeHand(pl.hand.concat([tile]), game.catalog, meldOpts(game));
  if (!analysis.isAgari) return null;
  const ev = evaluateHand(
    analysis,
    { menzen: isMenzen(pl), tsumo: false, riichi: pl.riichi, openMelds: openMeldStructures(pl, game.catalog) },
    game.catalog,
    game.yakuList
  );
  if (!ev || ev.totalHan <= 0) return null;
  return applyDora(game, ev);
}

function declareRonBy(game, p, tile, from) {
  const ev = ronEval(game, p, tile);
  const pl = game.players[p];
  game.phase = "over";
  game.result = {
    type: "ron",
    winner: p,
    from,
    tile,
    hand: pl.hand.concat([tile]),
    melds: pl.melds.slice(),
    menzen: isMenzen(pl),
    eval: ev,
  };
  game.log.push({ t: "ron", p, from, han: ev.totalHan });
  finalizeHand(game);
}

/** CPU の鳴き意思決定。 */
function cpuCallIntent(game, p, opts) {
  if (opts.ron) return { type: "ron" };
  if (opts.kan && cpuWantsMeld(game, p, opts.tile, "kan")) return { type: "kan" };
  if (opts.pon && cpuWantsMeld(game, p, opts.tile, "pon")) return { type: "pon" };
  for (const o of opts.chi) {
    if (cpuWantsMeld(game, p, opts.tile, "chi", o.tiles)) return { type: "chi", tiles: o.tiles };
  }
  return { type: "skip" };
}

function advanceToNextDraw(game, fromPlayer) {
  game.pendingDiscard = null;
  game.callOptionsBySeat = {};
  game.callResponses = {};
  game.turn = (fromPlayer + 1) % game.nPlayers;
  game.phase = "draw";
}

/* ---------------- 副露適用 ---------------- */

function takeCalledFromDiscarder(game, from, tile) {
  const d = game.players[from].discards;
  const i = d.lastIndexOf(tile);
  if (i >= 0) d.splice(i, 1);
}

export function applyPon(game, p, tile, from) {
  const pl = game.players[p];
  removeN(pl.hand, tile, 2);
  takeCalledFromDiscarder(game, from, tile);
  pl.melds.push({ kind: "pon", tiles: [tile, tile, tile], from, calledTile: tile });
  game.pendingDiscard = null;
  game.callOptions = null;
  game.turn = p;
  game.phase = "discard";
  pl.drawn = null;
  sortHand(pl.hand, game.catalog);
  normalizePlayerHand(pl);
  game.log.push({ t: "pon", p, from });
}

export function applyKan(game, p, tile, from) {
  const pl = game.players[p];
  removeN(pl.hand, tile, 3);
  takeCalledFromDiscarder(game, from, tile);
  pl.melds.push({ kind: "kan", tiles: [tile, tile, tile, tile], from, calledTile: tile });
  game.pendingDiscard = null;
  game.callOptions = null;
  game.turn = p;
  game.phase = "discard";
  // 嶺上ツモ
  if (game.wall.length > 0) {
    const rt = game.wall.pop();
    pl.hand.push(rt);
    pl.drawn = rt;
    sortHand(pl.hand, game.catalog);
  }
  game.log.push({ t: "kan", p, from });
  addDoraPair(game);
}

export function applyChi(game, p, tile, handTiles, from) {
  const pl = game.players[p];
  for (const k of handTiles) removeN(pl.hand, k, 1);
  takeCalledFromDiscarder(game, from, tile);
  const seq = [tile, ...handTiles].sort((a, b) => {
    const ta = game.catalog.byKey.get(a);
    const tb = game.catalog.byKey.get(b);
    return (ta.orderIndex || 0) - (tb.orderIndex || 0);
  });
  pl.melds.push({ kind: "chi", tiles: seq, from, calledTile: tile });
  game.pendingDiscard = null;
  game.callOptions = null;
  game.turn = p;
  game.phase = "discard";
  pl.drawn = null;
  sortHand(pl.hand, game.catalog);
  normalizePlayerHand(pl);
  game.log.push({ t: "chi", p, from });
}

/** 自分の手番（discard フェーズ）での暗槓 */
export function applyAnkan(game, tileKey) {
  const pl = game.players[game.turn];
  if (game.phase !== "discard") return false;
  if (!ankanOptions(pl.hand).includes(tileKey)) return false;
  removeN(pl.hand, tileKey, 4);
  pl.melds.push({ kind: "ankan", tiles: [tileKey, tileKey, tileKey, tileKey], from: null, calledTile: null });
  if (game.wall.length > 0) {
    const rt = game.wall.pop();
    pl.hand.push(rt);
    pl.drawn = rt;
    sortHand(pl.hand, game.catalog);
  }
  game.log.push({ t: "ankan", p: game.turn });
  addDoraPair(game);
  return true;
}

/** 自分の手番での加槓 */
export function applyShouminkan(game, tileKey) {
  const pl = game.players[game.turn];
  if (game.phase !== "discard") return false;
  if (!shouminkanOptions(pl.hand, pl.melds).includes(tileKey)) return false;
  const meld = pl.melds.find((m) => m.kind === "pon" && m.tiles[0] === tileKey);
  if (!meld) return false;
  removeN(pl.hand, tileKey, 1);
  meld.kind = "shouminkan";
  meld.tiles.push(tileKey);
  if (game.wall.length > 0) {
    const rt = game.wall.pop();
    pl.hand.push(rt);
    pl.drawn = rt;
    sortHand(pl.hand, game.catalog);
  }
  game.log.push({ t: "shouminkan", p: game.turn });
  addDoraPair(game);
  return true;
}

function removeN(hand, key, n) {
  for (let i = 0; i < n; i++) {
    const idx = hand.indexOf(key);
    if (idx >= 0) hand.splice(idx, 1);
  }
}

function endDrawGame(game) {
  game.phase = "over";
  game.result = { type: "draw" };
  game.log.push({ t: "ryuukyoku" });
  finalizeHand(game);
}

/* ---------------- 人間の鳴きアクション（オフライン: 席0／UI から呼ぶ） ---------------- */

export function humanRon(game, seat = 0) {
  submitCallResponse(game, seat, { type: "ron" });
}
export function humanPon(game, seat = 0) {
  submitCallResponse(game, seat, { type: "pon" });
}
export function humanKan(game, seat = 0) {
  submitCallResponse(game, seat, { type: "kan" });
}
export function humanChi(game, handTiles, seat = 0) {
  submitCallResponse(game, seat, { type: "chi", tiles: handTiles });
}
export function humanSkipCall(game, seat = 0) {
  submitCallResponse(game, seat, { type: "skip" });
}

/* ---------------- 簡易 CPU ---------------- */

function cpuWantsMeld(game, p, tile, kind, handTiles) {
  const pl = game.players[p];
  // 副露後の concealed を仮組みし、打牌でテンパイ維持できるなら鳴く
  const hand = pl.hand.slice();
  if (kind === "pon") removeN(hand, tile, 2);
  else if (kind === "kan") removeN(hand, tile, 3);
  else if (kind === "chi") for (const k of handTiles) removeN(hand, k, 1);
  // hand は現在 (13 or ...) から鳴き分を抜いた concealed。打牌 1 枚後にテンパイか
  for (const k of [...new Set(hand)]) {
    const rest = hand.slice();
    rest.splice(rest.indexOf(k), 1);
    if (isTenpai(rest, game.catalog, meldOpts(game))) return true;
  }
  return false;
}

export function cpuChooseDiscard(game) {
  const pl = game.players[game.turn];
  const hand = pl.hand;
  const uniq = [...new Set(hand)];
  let tenpaiDiscards = [];
  for (const k of uniq) {
    const rest = hand.slice();
    rest.splice(rest.indexOf(k), 1);
    if (isTenpai(rest, game.catalog, meldOpts(game))) tenpaiDiscards.push(k);
  }
  if (tenpaiDiscards.length) {
    tenpaiDiscards.sort((a, b) => waitCount(game, hand, b) - waitCount(game, hand, a));
    return tenpaiDiscards[0];
  }
  const scored = uniq.map((k) => ({ k, s: isolationScore(game, hand, k) }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].k;
}

function waitCount(game, hand, discardKey) {
  const rest = hand.slice();
  rest.splice(rest.indexOf(discardKey), 1);
  let n = 0;
  for (const t of game.catalog.types) {
    if (analyzeHand(rest.concat([t.key]), game.catalog, meldOpts(game)).isAgari) n++;
  }
  return n;
}

function isolationScore(game, hand, key) {
  const t = game.catalog.byKey.get(key);
  const counts = {};
  hand.forEach((h) => (counts[h] = (counts[h] || 0) + 1));
  if (t.suit === "honor") return counts[key] >= 2 ? 0 : 3;
  let neighbors = 0;
  for (const h of hand) {
    const th = game.catalog.byKey.get(h);
    if (th.suit !== t.suit || th.suit === "honor") continue;
    const d = Math.abs((th.orderIndex || 0) - (t.orderIndex || 0));
    if (d >= 1 && d <= 2) neighbors++;
  }
  return neighbors === 0 ? 2 : 0;
}

/** CPU の 1 アクション（phase に応じて draw→discard、または pon 後の discard）。 */
export function cpuAct(game) {
  const pl = game.players[game.turn];
  if (game.phase === "draw") {
    drawTile(game);
    if (game.phase === "over") return;
    if (declareTsumo(game)) return;
  }
  if (game.phase !== "discard") return;
  // CPU 立直（門前テンパイなら宣言）
  if (isMenzen(pl) && !pl.riichi) {
    const keep = tenpaiKeepDiscards(game, pl.hand);
    if (keep.size > 0) {
      pl.riichi = true;
      game.log.push({ t: "riichi", p: game.turn });
      // 立直後はテンパイ維持牌を打つ
      const d = [...keep].sort((a, b) => waitCount(game, pl.hand, b) - waitCount(game, pl.hand, a))[0];
      discardTile(game, d);
      return;
    }
  }
  if (pl.riichi) {
    // 立直中はツモ切り（drawn を切る。無ければ手なり）
    const d = pl.drawn && pl.hand.includes(pl.drawn) ? pl.drawn : cpuChooseDiscard(game);
    discardTile(game, d);
    return;
  }
  const discard = cpuChooseDiscard(game);
  discardTile(game, discard);
}
