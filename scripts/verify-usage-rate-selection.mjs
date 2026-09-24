#!/usr/bin/env node
/**
 * 使用率選抜の計算・貼り付けパースの回帰チェック。
 * 用法: node scripts/verify-usage-rate-selection.mjs
 */
import {
  computeDeckPointLines,
  computeUsageRateSelection,
  parseParticipantPaste,
  rosterSkipReason,
  parseTonamelCompetitionId,
  decklogViewUrl,
  cardIdentityKey,
  pickPrelimAdvancers,
  mergePlayerRecords,
  mergeRosterKeepDecks,
  duplicateNameGroups,
  pickLotteryWinners,
  parseNamedDeckBlocks,
  parseWlRecord,
  isWinsInPool,
  poolRangeLabel,
  clusterSimilarDecks,
  deckHalfL1,
  collapseDeckMapByIdentity,
  isSameDeckFamily,
} from "../js/usageRateSelection.js";
import { extractDeckRecipeLines } from "../js/decklogImport.js";

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("NG: " + msg);
  }
}

function ids(arr) {
  return arr.map((p) => p.id);
}

function main() {
  const r1 = computeUsageRateSelection(
    [
      { id: "p1", name: "全勝", wins: 3, losses: 0, deckMap: { A: 4, B: 2 } },
      { id: "p2", name: "1敗低", wins: 2, losses: 1, deckMap: { A: 4, C: 4 } },
      { id: "p3", name: "対象外", wins: 1, losses: 2, deckMap: { C: 4 } },
    ],
    { finalsSlots: 2, poolMinWins: 2 },
  );
  assert(r1.poolCount === 2, "2勝以上が集計対象");
  assert(r1.cardPoints.A === 8, "A の合計採用は 8");
  assert(r1.cardPoints.B === 2, "B の合計採用は 2");
  assert(r1.cardPoints.C === 4, "C は 2勝デッキ分だけ（1勝は対象外）");
  const s1 = r1.players.find((p) => p.id === "p1");
  const s2 = r1.players.find((p) => p.id === "p2");
  assert(s1 && s1.points === 8 * 4 + 2 * 2, "全勝デッキ得点 36");
  assert(s2 && s2.points === 8 * 4 + 4 * 4, "1敗デッキ得点 48");
  assert(ids(r1.undefeated).join() === "p1", "全勝は自動進出");
  assert(ids(r1.selectedOneLoss).join() === "p2", "残り1枠は1敗");

  const rMerge = computeUsageRateSelection(
    [
      { id: "a", name: "A", wins: 2, losses: 0, deckMap: { "X-R＋": 4 } },
      { id: "b", name: "B", wins: 2, losses: 1, deckMap: { "X-N": 4 } },
    ],
    {
      finalsSlots: 2,
      identityFn: (no) => (String(no).startsWith("X") ? "X" : no),
    },
  );
  assert(rMerge.cardPoints.X === 8, "レア違いは同一カードとして合算");
  assert(rMerge.players[0].points === 32 && rMerge.players[1].points === 32, "合算後の得点は同じ");
  assert(cardIdentityKey("X-N", (n) => (n.startsWith("X") ? "X" : n)) === "X", "identityFn が効く");

  const rLot = computeUsageRateSelection(
    [
      { id: "u1", name: "全勝1", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "u2", name: "全勝2", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "l1", name: "低", wins: 4, losses: 1, deckMap: { RARE: 1 } },
      { id: "l2", name: "同点甲", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l3", name: "同点乙", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l4", name: "高", wins: 4, losses: 1, deckMap: { POP: 4 } },
    ],
    { finalsSlots: 4, poolMinWins: 2 },
  );
  assert(rLot.remainingSlots === 2, "決勝4・全勝2なら残り2");
  assert(ids(rLot.selectedOneLoss).join() === "l1", "カットより低い1人は確定進出");
  assert(ids(rLot.lottery).sort().join() === "l2,l3", "当落線上の同点は抽選");
  assert(rLot.lotterySlots === 1, "抽選で埋める枠は1");
  assert(!rLot.advancedIds.has("l4"), "高得点の1敗は落選");

  const rDrop = computeUsageRateSelection(
    [
      { id: "d1", name: "リタイア全勝", wins: 3, losses: 0, dropped: true, deckMap: { Z: 4 } },
      { id: "d2", name: "未対戦", wins: 0, losses: 0, deckMap: { Z: 4 } },
      { id: "d3", name: "実全勝", wins: 2, losses: 0, deckMap: { Z: 1 } },
    ],
    { finalsSlots: 8, poolMinWins: 2 },
  );
  assert(ids(rDrop.undefeated).join() === "d3", "0-0 とリタイアは全勝進出に入れない");
  assert(rDrop.poolCount === 2, "リタイアでも2勝以上なら集計対象");

  const paste = parseParticipantPaste(
    "名前\t勝\t負\tリタイア\tデッキコード\n山田\t4\t1\t\t4ASG5\n佐藤\t3\t2\t1\t",
  );
  assert(paste.players.length === 2, "TSV 2人");
  assert(paste.players[0].name === "山田" && paste.players[0].wins === 4 && paste.players[0].deckCode === "4ASG5", "TSV 1行目");
  assert(paste.players[1].dropped === true && paste.players[1].wins === 3, "リタイアフラグ");

  const blocks = parseParticipantPaste("# 高橋 5-0\nコード: ABC12\n4 x PL!N-bp1-002-R＋\n");
  assert(blocks.players.length === 1 && blocks.players[0].name === "高橋", "ブロック名前");
  assert(blocks.players[0].wins === 5 && blocks.players[0].losses === 0, "ブロック戦績");
  assert(blocks.players[0].deckCode === "ABC12", "ブロックデッキコード");

  const json = parseParticipantPaste('[{"name":"JSON","wins":2,"losses":1}]');
  assert(json.players[0] && json.players[0].name === "JSON", "JSON 貼り付け");

  const tonamelCsv = parseParticipantPaste(
    "エントリー名,勝数,敗北数,デッキコード\n山田,4,1,4ASG5\n佐藤,5,0,SATO1",
  );
  assert(tonamelCsv.players.length === 2, "となめる風 CSV 2人");
  assert(tonamelCsv.players[0].name === "山田" && tonamelCsv.players[0].wins === 4 && tonamelCsv.players[0].deckCode === "4ASG5", "となめる風 CSV 1行目");
  assert(tonamelCsv.players[1].name === "佐藤" && tonamelCsv.players[1].wins === 5, "となめる風 CSV 全勝");

  const recCsv = parseParticipantPaste("名前,戦績\n高橋,4-1\n田中,3勝2敗");
  assert(recCsv.players[0] && recCsv.players[0].wins === 4 && recCsv.players[0].losses === 1, "戦績 4-1");
  assert(recCsv.players[1] && recCsv.players[1].wins === 3 && recCsv.players[1].losses === 2, "戦績 3勝2敗");

  const standings = parseParticipantPaste("順位,エントリー名,勝,負\n1,佐藤,5,0\n2,山田,4,1");
  assert(standings.players.length === 2 && standings.players[0].name === "佐藤" && standings.players[0].wins === 5, "成績表CSV");
  const byMatches = parseParticipantPaste("エントリー名,試合数,勝数\n山田,5,4");
  assert(byMatches.players[0] && byMatches.players[0].wins === 4 && byMatches.players[0].losses === 1, "試合数と勝数から負を算出");

  assert(rosterSkipReason({ status: "エントリー済み" }) === "", "エントリー済みは残す");
  assert(rosterSkipReason({ status: "出場済み" }) === "", "出場済みは残す");
  assert(rosterSkipReason({ status: "エントリーキャンセル" }) === "エントリーキャンセル", "エントリーキャンセルは除外");
  assert(rosterSkipReason({ status: "キャンセル待ち" }) === "キャンセル待ち", "キャンセル待ちはキャンセルより先");
  assert(rosterSkipReason({ payment: "未払い" }) === "未払い", "未払いは除外");
  assert(rosterSkipReason({ payment: "当日払い" }) === "", "当日払いは残す");
  assert(rosterSkipReason({ status: "エントリー済み", payment: "未払い" }) === "未払い", "エントリー済みでも未払いなら除外");
  assert(rosterSkipReason({ ステータス: "出場済み" }) === "", "日本語キーの出場済み");
  assert(rosterSkipReason({}) === "", "ステータス無しは残す");

  const rosterCsv = parseParticipantPaste(
    "エントリー名,ステータス,支払い状況\n佐藤,エントリー済み,支払い済み\n山田,出場済み,\n取消,エントリーキャンセル,\n待合,キャンセル待ち,\n未金,エントリー済み,未払い\n現地,エントリー済み,当日払い",
  );
  assert(rosterCsv.skippedRoster === 3, "キャンセル・待ち・未払いを3人除外");
  assert(rosterCsv.players.map((p) => p.name).join() === "佐藤,山田,現地", "エントリー済み・出場済み・当日払いだけ残す");
  const unpaidOn = parseParticipantPaste(
    "エントリー名,ステータス,支払い状況\n未金,エントリー済み,未払い\n取消,エントリーキャンセル,",
    { includeUnpaid: true },
  );
  assert(unpaidOn.players.map((p) => p.name).join() === "未金" && unpaidOn.skippedRoster === 1, "未払い反映する");
  const enteredOff = parseParticipantPaste(
    "エントリー名,ステータス\n佐藤,エントリー済み\n山田,出場済み\n取消,エントリーキャンセル",
    { includeEntered: false },
  );
  assert(enteredOff.players.map((p) => p.name).join() === "山田" && enteredOff.skippedRoster === 2, "エントリー済みしないなら出場済みだけ");
  assert(rosterSkipReason({ status: "エントリー済み", payment: "未払い" }, { includeUnpaid: true, includeEntered: false }) === "エントリー済み", "未払い反映でもエントリー済みしない");
  const noStatus = parseParticipantPaste("エントリー名\n全員残る");
  assert(noStatus.players.length === 1 && noStatus.skippedRoster === 0, "ステータス列が無いCSVは全員");
  const jsonSkip = parseParticipantPaste(
    '[{"name":"残","ステータス":"エントリー済み"},{"name":"消","ステータス":"キャンセル待ち"}]',
  );
  assert(jsonSkip.players.length === 1 && jsonSkip.players[0].name === "残" && jsonSkip.skippedRoster === 1, "JSONもキャンセル待ちを除外");

  const stateCol = parseParticipantPaste("エントリー名,エントリー状態\n残,エントリー済み\n消,エントリーキャンセル");
  assert(stateCol.players.map((p) => p.name).join() === "残" && stateCol.skippedRoster === 1, "エントリー状態列のキャンセルを除外");
  const unknownCol = parseParticipantPaste("エントリー名,備考\n残,出場済み\n消,エントリーキャンセル");
  assert(unknownCol.players.map((p) => p.name).join() === "残" && unknownCol.skippedRoster === 1, "列名不明でもエントリーキャンセルを除外");
  const resultCol = parseParticipantPaste("エントリー名,結果\n消,エントリーキャンセル\n残,エントリー済み");
  assert(resultCol.players.map((p) => p.name).join() === "残" && resultCol.skippedRoster === 1, "結果列のキャンセルを除外");
  const cancelFlag = parseParticipantPaste("エントリー名,エントリーキャンセル\n消,1\n残,0");
  assert(cancelFlag.players.map((p) => p.name).join() === "残" && cancelFlag.skippedRoster === 1, "キャンセル列の1を除外");

  const merged = mergePlayerRecords(
    [{ id: "p1", name: "山 田", wins: 0, losses: 0, deckMap: { A: 4 }, recipeText: "4 x A" }],
    [{ name: "山田", wins: 4, losses: 1, hasRecord: true }],
  );
  assert(merged.updated === 1 && merged.added === 0, "勝敗マージは更新1");
  assert(merged.players[0].wins === 4 && merged.players[0].losses === 1, "勝敗が上書き");
  assert(merged.players[0].deckMap.A === 4, "デッキは残る");

  assert(parseTonamelCompetitionId("https://tonamel.com/competition/0lHxM") === "0lHxM", "となめる ID");
  assert(decklogViewUrl("4ASG5") === "https://decklog.bushiroad.com/view/4ASG5", "DECK LOG URL");

  const board = pickPrelimAdvancers(
    [
      { id: "u1", name: "全勝甲", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "u2", name: "全勝乙", wins: 4, losses: 0, deckMap: { U: 1 } },
      { id: "l1", name: "使用率1", wins: 4, losses: 1, deckMap: { RARE: 1 } },
      { id: "l2", name: "使用率2", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l3", name: "使用率3", wins: 4, losses: 1, deckMap: { POP: 4 } },
    ],
    { advanceCount: 4, undefeatedCount: 1, poolMinWins: 2 },
  );
  assert(board.undefeated.map((p) => p.id).join() === "u1", "発表の全勝は指定人数だけ");
  assert(board.names.length === 4, "予選抜け4名");
  assert(board.undefeated.length === 1 && board.usage.length === 3, "全勝1+使用率3");
  const boardAuto = pickPrelimAdvancers(
    [
      { id: "u1", name: "全勝甲", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "u2", name: "全勝乙", wins: 4, losses: 0, deckMap: { U: 1 } },
      { id: "l1", name: "使用率1", wins: 4, losses: 1, deckMap: { RARE: 1 } },
    ],
    { advanceCount: 8, poolMinWins: 2 },
  );
  assert(boardAuto.undefeated.length === 2 && boardAuto.usage.length === 1, "未指定なら検出した全勝を全部出す");
  assert(boardAuto.shortfall === 5, "足りない枠は shortfall");

  assert(isWinsInPool(5, 2, null) === true, "2勝以上は5勝を含む");
  assert(isWinsInPool(5, 0, 4) === false, "0〜4勝は5勝を含まない");
  assert(isWinsInPool(1, 0, 4) === true, "0〜4勝は1勝を含む");
  assert(poolRangeLabel(2, null) === "2勝以上", "範囲ラベル 2勝以上");
  assert(poolRangeLabel(0, 4) === "0〜4勝", "範囲ラベル 0〜4勝");

  const rMax = computeUsageRateSelection(
    [
      { id: "a", name: "5勝", wins: 5, losses: 0, deckMap: { Z: 4 } },
      { id: "b", name: "2勝", wins: 2, losses: 1, deckMap: { Z: 4 } },
      { id: "c", name: "1勝", wins: 1, losses: 1, deckMap: { Y: 4 } },
    ],
    { finalsSlots: 8, poolMinWins: 0, poolMaxWins: 4 },
  );
  assert(rMax.poolCount === 2, "0〜4勝の集計は5勝を除外");
  assert(rMax.players.find((p) => p.id === "a") && !rMax.players.find((p) => p.id === "a").inPool, "5勝は母数外");
  assert(rMax.players.find((p) => p.id === "c") && rMax.players.find((p) => p.id === "c").inPool, "1勝は0〜4勝に含む");
  assert(ids(rMax.oneLoss).sort().join() === "b,c", "1敗選抜は勝数範囲外でも候補");

  const r24 = computeUsageRateSelection(
    [
      { id: "a", name: "5勝", wins: 5, losses: 0, deckMap: { Z: 4 } },
      { id: "b", name: "2勝", wins: 2, losses: 1, deckMap: { Z: 4 } },
      { id: "c", name: "1勝", wins: 1, losses: 1, deckMap: { Y: 4 } },
    ],
    { finalsSlots: 8, poolMinWins: 2, poolMaxWins: 4 },
  );
  assert(r24.poolCount === 1, "2〜4勝は2勝だけ");
  assert(!r24.cardPoints.Y, "1勝デッキのカードは2〜4勝に入らない");

  const rEmpty = pickPrelimAdvancers(
    [
      { id: "u", name: "全勝", wins: 3, losses: 0, deckMap: { A: 1 } },
      { id: "e", name: "空1敗", wins: 2, losses: 1, deckMap: {} },
      { id: "r", name: "有1敗", wins: 2, losses: 1, deckMap: { A: 1 } },
    ],
    { advanceCount: 2, poolMinWins: 2 },
  );
  assert(rEmpty.usage.map((p) => p.id).join() === "r", "レシピなし1敗はボードに入れない");
  assert(rEmpty.names.map((p) => p.id).join() === "u,r", "全勝+レシピあり1敗");

  const linePlayers = [
    { id: "a", name: "A", wins: 4, losses: 0, deckMap: { POP: 4 } },
    { id: "b", name: "B", wins: 2, losses: 1, deckMap: { POP: 4, RARE: 4 } },
    { id: "c", name: "C", wins: 1, losses: 1, deckMap: { RARE: 4 } },
    { id: "d", name: "D", wins: 0, losses: 2, deckMap: { Z: 4 } },
  ];
  const lines = computeDeckPointLines(linePlayers, { POP: 4, RARE: 4 });
  const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
  assert(byId.all.poolCount === 4 && byId.all.points === 4 * 8 + 4 * 8, "全デッキは4人・64P");
  assert(byId.w1.poolCount === 3 && byId.w1.points === 4 * 8 + 4 * 8, "1勝〜は0勝を除外");
  assert(byId.w2.poolCount === 2 && byId.w2.points === 4 * 8 + 4 * 4, "2勝〜は1勝以下を除外");
  assert(byId.w3.poolCount === 1 && byId.w3.points === 4 * 4, "3勝〜は4勝デッキのみ");
  assert(byId.w4.poolCount === 1 && byId.w4.points === 16, "4勝〜も4勝デッキのみ");

  const mergeKeep = mergeRosterKeepDecks(
    [
      { id: "p1", name: "山田", wins: 0, losses: 0, deckMap: { X: 4 }, recipeText: "4 x X" },
      { id: "p2", name: "消える", wins: 0, losses: 0, deckMap: { Y: 1 } },
    ],
    [{ name: "山田" }, { name: "佐藤" }],
  );
  assert(mergeKeep.players.length === 2 && mergeKeep.added === 1 && mergeKeep.removed === 1, "名簿更新は増減する");
  assert(mergeKeep.players[0].deckMap.X === 4, "同名のデッキは残す");
  assert(mergeKeep.players.map((p) => p.name).join() === "山田,佐藤", "CSV順で残す");

  assert(duplicateNameGroups([{ name: "山田" }, { name: "山 田" }, { name: "佐藤" }]).length === 1, "空白違いの同名を検出");

  const lotPick = pickLotteryWinners([{ id: "a" }, { id: "b" }, { id: "c" }], 2, function () {
    return 0.999;
  });
  assert(lotPick.map((p) => p.id).join() === "a,b", "抽選は乱数が最大なら元の順");

  const lotBoard = pickPrelimAdvancers(
    [
      { id: "u1", name: "全勝1", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "u2", name: "全勝2", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "l1", name: "低", wins: 4, losses: 1, deckMap: { RARE: 1 } },
      { id: "l2", name: "同点甲", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l3", name: "同点乙", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l4", name: "高", wins: 4, losses: 1, deckMap: { POP: 4 } },
    ],
    { advanceCount: 4, poolMinWins: 2, lotteryWinnerIds: ["l3"] },
  );
  assert(lotBoard.usage.map((p) => p.id).join() === "l1,l3", "抽選当選をボードに入れる");
  const lotScored = computeUsageRateSelection(
    [
      { id: "u1", name: "全勝1", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "u2", name: "全勝2", wins: 5, losses: 0, deckMap: { U: 1 } },
      { id: "l1", name: "低", wins: 4, losses: 1, deckMap: { RARE: 1 } },
      { id: "l2", name: "同点甲", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l3", name: "同点乙", wins: 4, losses: 1, deckMap: { MID: 2 } },
      { id: "l4", name: "高", wins: 4, losses: 1, deckMap: { POP: 4 } },
    ],
    { finalsSlots: 4, poolMinWins: 2, lotteryWinnerIds: ["l3"] },
  );
  assert(ids(lotScored.selectedOneLoss).join() === "l1,l3", "抽選当選は使用率進出扱い");

  const named = parseNamedDeckBlocks("# 佐藤\n4 x PL!S-bp5-111-R\n");
  assert(named.players.length === 1 && named.players[0].name === "佐藤", "名前つきデッキブロック");
  assert(/PL!S-bp5-111-R/.test(named.players[0].recipeText), "ブロックにレシピ行");

  const mapped = parseParticipantPaste("エントリー名,任意項目1\n佐藤,CODE99", { columnMap: { deckCode: "任意項目1" } });
  assert(mapped.players[0] && mapped.players[0].deckCode === "CODE99", "任意列をデッキコードに割り当て");
  assert(mapped.headers.join() === "エントリー名,任意項目1", "ヘッダを返す");
  assert(Array.isArray(stateCol.skippedRows) && stateCol.skippedRows.some((r) => r.name === "消"), "除外した人の確認リスト");

  const wl3 = parseWlRecord("4-1-1");
  assert(wl3 && wl3.wins === "4" && wl3.losses === "1" && wl3.draws === "1", "戦績 4-1-1 は引分");
  const drawCsv = parseParticipantPaste("名前,勝,負,分\n佐藤,3,1,1");
  assert(drawCsv.players[0] && drawCsv.players[0].draws === 1 && drawCsv.players[0].wins === 3, "分列を読む");

  const htmlDeck = extractDeckRecipeLines('<div>4 x PL!S-bp5-111-R</div><span>2 × PL!SP-bp5-006-R</span>');
  assert(/4 x PL!S-bp5-111-R/.test(htmlDeck) && /2 x PL!SP-bp5-006-R/.test(htmlDeck), "DECK LOG HTMLからレシピ行");

  const ident = (n) => String(n).replace(/-(SR|R)$/i, "");
  const typeFn = (n) => (String(n).indexOf("LIVE") === 0 ? "live" : "member");
  const nearId = collapseDeckMapByIdentity({ "X-R": 4, "Y-SR": 56 }, ident);
  assert(nearId.X === 4 && nearId.Y === 56, "レア違いを同一に畳む");
  assert(deckHalfL1({ A: 4, B: 56 }, { A: 4, B: 48, C: 8 }) === 8, "入れ替え8枚");
  const familyBase = {
    M1: 24,
    M2: 24,
    LIVEA: 4,
    LIVEB: 4,
    LIVEC: 4,
  };
  assert(isSameDeckFamily(familyBase, familyBase, typeFn), "完全一致は同系統");
  assert(
    isSameDeckFamily(familyBase, { M1: 24, M2: 20, M3: 4, LIVEA: 4, LIVEB: 4, LIVED: 4 }, typeFn),
    "メンバー半数以上は同系統",
  );
  assert(
    isSameDeckFamily(familyBase, { M1: 24, M2: 24, LIVEA: 4, LIVEX: 4, LIVEY: 4 }, typeFn),
    "ライブが違ってもメンバー半数が重なれば同系統",
  );
  assert(
    isSameDeckFamily(familyBase, { M1: 8, M2: 8, M9: 32, LIVEA: 4, LIVEB: 4, LIVEC: 4 }, typeFn),
    "メンバーが少なくてもライブが重なれば同系統",
  );
  assert(
    isSameDeckFamily(familyBase, { M1: 13, M9: 35, LIVEA: 4, LIVEB: 4, LIVEC: 4 }, typeFn),
    "35枚差まで同系統",
  );
  assert(
    !isSameDeckFamily(familyBase, { M1: 12, M9: 36, LIVEA: 4, LIVEB: 4, LIVEC: 4 }, typeFn),
    "36枚差は別系統",
  );
  assert(
    !isSameDeckFamily(familyBase, { M1: 4, M2: 4, M9: 40, LIVEA: 4, LIVEB: 4, LIVEC: 4 }, typeFn),
    "40枚差は別系統",
  );
  assert(
    !isSameDeckFamily(familyBase, { M1: 8, M2: 8, M9: 32, LIVEA: 4, LIVEX: 4, LIVEY: 4 }, typeFn),
    "メンバー少なくライブ1種だけなら別系統",
  );
  const clustered = clusterSimilarDecks(
    [
      { id: "a", name: "A", deckMap: Object.assign({}, familyBase, { "LIVEA-R": 0 }) },
      { id: "b", name: "B", deckMap: { M1: 24, M2: 24, "LIVEA-R": 4, "LIVEB-SR": 4, LIVEC: 4 } },
      { id: "c", name: "C", deckMap: { M1: 24, M2: 20, M3: 4, LIVEA: 4, LIVEB: 4, LIVED: 4 } },
      { id: "d", name: "D", deckMap: { M9: 48, LIVEX: 6, LIVEY: 6 } },
    ],
    { identityFn: ident, typeFn: typeFn, minCards: 50 },
  );
  assert(clustered.withRecipe === 4, "レシピ4");
  assert(clustered.clusters[0].size === 3 && clustered.clusters[0].exactSize === 2, "完全一致2+同系統1");
  assert(clustered.clusters.some((c) => c.size === 1 && c.playerIds[0] === "d"), "別軸は独自");
  assert(clustered.maxDiff === 35, "系統の最大差は35枚");
  const clusteredFar = clusterSimilarDecks(
    [
      { id: "a", name: "A", deckMap: familyBase },
      { id: "z", name: "Z", deckMap: { M1: 4, M2: 4, M9: 40, LIVEA: 4, LIVEB: 4, LIVEC: 4 } },
    ],
    { typeFn: typeFn, minCards: 50 },
  );
  assert(
    clusteredFar.clusters.length === 2 && clusteredFar.clusters.every((c) => c.size === 1),
    "40枚差はクラスタしない",
  );

  if (failed) {
    console.error("verify-usage-rate-selection: " + failed + " failed");
    process.exit(1);
  }
  console.log("verify-usage-rate-selection: ok");
}

main();
