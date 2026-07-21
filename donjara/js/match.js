/**
 * マッチ進行（1局 / 東風 / 半荘）と持ち点管理。
 */

import { isTenpai } from "./mahjong.js";
import { meldOptionsFromConfig } from "./meldRules.js";
import { computeBaseScore, computeWinPayments, computeDrawPayments } from "./score.js";

export const MATCH_MODES = {
  single: { id: "single", label: "1局のみ" },
  tonpu: { id: "tonpu", label: "東風戦" },
  hanchan: { id: "hanchan", label: "半荘" },
};

const WIND_LABELS = ["東", "南", "西", "北"];

/** @param {object} config */
export function createMatchState(config, nPlayers) {
  const mode = MATCH_MODES[config.matchMode] ? config.matchMode : "tonpu";
  const roundsPerWind = mode === "single" ? 1 : Math.min(nPlayers, 4);
  return {
    mode,
    roundWind: 0,
    roundNo: 1,
    honba: 0,
    riichiSticks: 0,
    dealer: 0,
    scores: new Array(nPlayers).fill(25000),
    roundsPerWind,
    handCount: 0,
    finished: false,
    rankings: null,
  };
}

export function cloneMatch(match) {
  return {
    ...match,
    scores: match.scores.slice(),
    rankings: match.rankings ? match.rankings.slice() : null,
  };
}

export function roundLabel(match) {
  if (match.mode === "single") return "1局";
  const wind = WIND_LABELS[match.roundWind] || "東";
  return `${wind}${match.roundNo}局${match.honba ? ` ${match.honba}本場` : ""}`;
}

export function seatWindLabel(match, seat, nPlayers) {
  const idx = (seat - match.dealer + nPlayers) % nPlayers;
  return WIND_LABELS[idx] || `${idx + 1}`;
}

export function isMatchOver(match) {
  return !!match.finished;
}

export function hasNextHand(match) {
  return !match.finished;
}

function meldOpts(game) {
  return meldOptionsFromConfig(game.config);
}

function playerTenpai(game, p) {
  const pl = game.players[p];
  const hand = pl.hand.slice();
  if (hand.length === 14) {
    for (const k of [...new Set(hand)]) {
      const rest = hand.slice();
      rest.splice(rest.indexOf(k), 1);
      if (isTenpai(rest, game.catalog, meldOpts(game))) return true;
    }
    return false;
  }
  if (hand.length === 13) return isTenpai(hand, game.catalog, meldOpts(game));
  return false;
}

function tenpaiSeats(game) {
  const list = [];
  for (let p = 0; p < game.nPlayers; p++) {
    if (playerTenpai(game, p)) list.push(p);
  }
  return list;
}

/** 和了結果を確定し match.scores を更新。 */
export function applyWinResult(game, result) {
  const match = game.match;
  if (!match) return { ...result, hasNextHand: false, matchOver: true };

  const st = result.eval?.structure;
  const baseScore = computeBaseScore(st, {
    han: result.eval.totalHan,
    tsumo: result.type === "tsumo",
    menzen: !!result.menzen,
    hasPinfu: result.eval.yaku.some((y) => y.name === "平和"),
    hasChiitoi: st && st.kind === "chiitoitsu",
  }, game.catalog);

  const { deltas, payments } = computeWinPayments({
    base: baseScore.base,
    winner: result.winner,
    dealer: match.dealer,
    from: result.type === "ron" ? result.from : result.winner,
    isTsumo: result.type === "tsumo",
    nPlayers: game.nPlayers,
    honba: match.honba,
    riichiSticks: match.riichiSticks,
  });

  for (let p = 0; p < game.nPlayers; p++) match.scores[p] += deltas[p];
  match.riichiSticks = 0;

  const renchan = result.winner === match.dealer;
  advanceMatchAfterHand(match, { renchan });

  return {
    ...result,
    score: baseScore,
    payments,
    deltas,
    matchSnapshot: cloneMatch(match),
    renchan,
    matchOver: match.finished,
    hasNextHand: hasNextHand(match),
  };
}

/** 流局 */
export function applyDrawResult(game) {
  const match = game.match;
  if (!match) return { type: "draw", matchOver: true, hasNextHand: false };

  const tenpai = tenpaiSeats(game);
  const noten = [];
  for (let p = 0; p < game.nPlayers; p++) {
    if (!tenpai.includes(p)) noten.push(p);
  }

  let deltas = new Array(game.nPlayers).fill(0);
  let payments = [];
  if (tenpai.length > 0 && noten.length > 0) {
    const r = computeDrawPayments(tenpai, noten, game.nPlayers);
    deltas = r.deltas;
    payments = r.payments;
    for (let p = 0; p < game.nPlayers; p++) match.scores[p] += deltas[p];
  }

  const renchan = tenpai.includes(match.dealer);
  advanceMatchAfterHand(match, { renchan });

  return {
    type: "draw",
    tenpai,
    noten,
    deltas,
    payments,
    score: null,
    matchSnapshot: cloneMatch(match),
    renchan,
    matchOver: match.finished,
    hasNextHand: hasNextHand(match),
  };
}

function advanceMatchAfterHand(match, { renchan }) {
  match.handCount += 1;

  if (match.mode === "single") {
    match.finished = true;
    match.rankings = computeRankings(match);
    return;
  }

  if (renchan) {
    match.honba += 1;
    return;
  }

  match.honba = 0;
  match.dealer = (match.dealer + 1) % match.scores.length;
  if (match.dealer === 0) {
    match.roundNo += 1;
    if (match.roundNo > match.roundsPerWind) {
      match.roundNo = 1;
      match.roundWind += 1;
      const maxWinds = match.mode === "hanchan" ? 2 : 1;
      if (match.roundWind >= maxWinds) {
        match.finished = true;
        match.rankings = computeRankings(match);
      }
    }
  }
}

export function computeRankings(match) {
  return match.scores
    .map((s, i) => ({ seat: i, score: s }))
    .sort((a, b) => b.score - a.score)
    .map((o, rank) => ({ ...o, rank: rank + 1 }));
}

/** 立直宣言時: 1000点供託 */
export function onRiichiDeclared(match, seat) {
  if (!match) return;
  match.scores[seat] -= 1000;
  match.riichiSticks += 1;
}

export function serializeMatch(match) {
  if (!match) return null;
  return {
    mode: match.mode,
    roundWind: match.roundWind,
    roundNo: match.roundNo,
    honba: match.honba,
    riichiSticks: match.riichiSticks,
    dealer: match.dealer,
    scores: match.scores.slice(),
    roundsPerWind: match.roundsPerWind,
    handCount: match.handCount,
    finished: match.finished,
    rankings: match.rankings ? match.rankings.slice() : null,
  };
}

export function deserializeMatch(data, nPlayers) {
  if (!data) return null;
  return {
    mode: data.mode || "tonpu",
    roundWind: data.roundWind ?? 0,
    roundNo: data.roundNo ?? 1,
    honba: data.honba ?? 0,
    riichiSticks: data.riichiSticks ?? 0,
    dealer: data.dealer ?? 0,
    scores: (data.scores || new Array(nPlayers).fill(25000)).slice(),
    roundsPerWind: data.roundsPerWind ?? Math.min(nPlayers, 4),
    handCount: data.handCount ?? 0,
    finished: !!data.finished,
    rankings: data.rankings ? data.rankings.slice() : null,
  };
}
