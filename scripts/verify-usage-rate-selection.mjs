#!/usr/bin/env node
/**
 * 使用率選抜の計算・貼り付けパースの回帰チェック。
 * 用法: node scripts/verify-usage-rate-selection.mjs
 */
import {
  computeUsageRateSelection,
  parseParticipantPaste,
  parseTonamelCompetitionId,
  decklogViewUrl,
  cardIdentityKey,
} from "../js/usageRateSelection.js";

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

  assert(parseTonamelCompetitionId("https://tonamel.com/competition/0lHxM") === "0lHxM", "となめる ID");
  assert(decklogViewUrl("4ASG5") === "https://decklog.bushiroad.com/view/4ASG5", "DECK LOG URL");

  if (failed) {
    console.error("verify-usage-rate-selection: " + failed + " failed");
    process.exit(1);
  }
  console.log("verify-usage-rate-selection: ok");
}

main();
