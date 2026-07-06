// 鳴き/立直/和了フローの決定的検証（RNG に依存しない）
import { defaultConfig } from "../js/config.js";
import {
  createGame,
  discardTile,
  computeHumanCallOptions,
  humanPon,
  humanChi,
  humanRon,
  applyAnkan,
  checkTsumo,
  declareTsumo,
  isMenzen,
} from "../js/game.js";

function buildCatalog() {
  const types = [];
  const byContent = new Map();
  for (const [content, n] of [["muse", 9], ["aqours", 9]]) {
    const list = [];
    for (let i = 1; i <= n; i++) {
      const t = { key: `${content}-c${i}`, suit: content, orderIndex: i, kind: "member", contentId: content, charId: `c${i}`, label: `${content}${i}`, iconUrl: null, glyph: null, blank: false };
      types.push(t); list.push(t);
    }
    byContent.set(content, list);
  }
  const honors = [];
  for (const id of ["soap","water","rainbow","star","lotus","bird","blank"]) {
    const t = { key: `honor-${id}`, suit: "honor", orderIndex: null, kind: "honor", contentId: null, honorId: id, label: id, iconUrl: null, glyph: "", blank: id==="blank" };
    types.push(t); honors.push(t);
  }
  const byKey = new Map();
  types.forEach((t)=>byKey.set(t.key,t));
  return { types, byKey, byContent, honors };
}

const cat = buildCatalog();
const cfg = defaultConfig(cat);
let pass=0, fail=0;
const check=(n,c)=>{ if(c){pass++;console.log("  ok  -",n);} else {fail++;console.log("  FAIL-",n);} };

function freshGame() {
  const g = createGame(cfg, cat);
  // 手牌を決定的に上書き（wall はそのまま）
  return g;
}

// --- ポン ---
{
  const g = freshGame();
  g.players[0].hand = ["muse-c5","muse-c5","muse-c1","muse-c2","muse-c3","aqours-c1","aqours-c2","aqours-c3","muse-c7","muse-c8","muse-c9","honor-soap","honor-soap"];
  g.players[3].hand = ["muse-c5","aqours-c5","aqours-c6","aqours-c7","muse-c4","muse-c6","honor-water","honor-water","honor-star","honor-star","aqours-c9","aqours-c8","muse-c2"];
  g.turn = 3; g.phase = "discard";
  discardTile(g, "muse-c5");
  check("ポン: 打牌後に人間の鳴き待ち(callWait)", g.phase === "callWait");
  const opt = computeHumanCallOptions(g);
  check("ポン: pon 選択肢あり", opt && opt.pon === true);
  humanPon(g);
  check("ポン: 面子が1つ作られる", g.players[0].melds.length === 1 && g.players[0].melds[0].kind === "pon");
  check("ポン: 手番が人間・打牌フェーズ", g.turn === 0 && g.phase === "discard");
  check("ポン: 門前でなくなる", isMenzen(g.players[0]) === false);
}

// --- チー（上家＝player3 の打牌）---
{
  const g = freshGame();
  g.players[0].hand = ["muse-c4","muse-c6","aqours-c1","aqours-c2","aqours-c3","muse-c1","muse-c1","muse-c7","muse-c8","muse-c9","honor-soap","honor-soap","honor-star"];
  g.players[3].hand = ["muse-c5","aqours-c5","aqours-c6","aqours-c7","aqours-c8","aqours-c9","honor-water","honor-water","honor-bird","honor-bird","muse-c2","muse-c3","muse-c2"];
  g.turn = 3; g.phase = "discard";
  discardTile(g, "muse-c5");
  const opt = computeHumanCallOptions(g);
  check("チー: chi 選択肢あり", opt && opt.chi.length >= 1);
  humanChi(g, opt.chi[0].tiles);
  check("チー: 面子が sequence", g.players[0].melds.length === 1 && g.players[0].melds[0].kind === "chi");
  check("チー: 手番が人間・打牌フェーズ", g.turn === 0 && g.phase === "discard");
}

// --- ロン ---
{
  const g = freshGame();
  // player0 は muse-c9 単騎待ち（123 456 789の一気通貫 + soap刻子 + c9対子…ではなく単騎）
  g.players[0].hand = ["muse-c1","muse-c2","muse-c3","muse-c4","muse-c5","muse-c6","muse-c7","muse-c8","muse-c9","honor-soap","honor-soap","honor-soap","muse-c1"];
  g.players[3].hand = ["muse-c1","aqours-c5","aqours-c6","aqours-c7","aqours-c8","aqours-c9","honor-water","honor-water","honor-bird","honor-bird","muse-c4","muse-c3","muse-c2"];
  g.turn = 3; g.phase = "discard";
  discardTile(g, "muse-c1"); // c1 で対子完成→和了
  const opt = computeHumanCallOptions(g);
  check("ロン: ron 選択肢あり", opt && opt.ron === true);
  humanRon(g);
  check("ロン: 結果が ron / 勝者 player0", g.phase === "over" && g.result.type === "ron" && g.result.winner === 0);
  check("ロン: 役が1翻以上", g.result.eval.totalHan >= 1);
}

// --- 暗槓 + ツモ ---
{
  const g = freshGame();
  g.turn = 0; g.phase = "discard";
  g.players[0].melds = [];
  g.players[0].hand = ["muse-c5","muse-c5","muse-c5","muse-c5","muse-c1","muse-c2","muse-c3","muse-c7","muse-c8","muse-c9","honor-soap","honor-soap","honor-soap","aqours-c2"];
  const before = g.wall.length;
  const ok = applyAnkan(g, "muse-c5");
  check("暗槓: 実行成功", ok === true);
  check("暗槓: ankan 面子", g.players[0].melds.length === 1 && g.players[0].melds[0].kind === "ankan");
  check("暗槓: 嶺上ツモで手牌補充", g.wall.length === before - 1);
  check("暗槓: 門前を維持", isMenzen(g.players[0]) === true);
}

// --- ツモ和了 ---
{
  const g = freshGame();
  g.turn = 0; g.phase = "discard";
  g.players[0].melds = [];
  g.players[0].hand = ["muse-c1","muse-c2","muse-c3","muse-c4","muse-c5","muse-c6","muse-c7","muse-c8","muse-c9","honor-soap","honor-soap","honor-soap","aqours-c2","aqours-c2"];
  const ev = checkTsumo(g);
  check("ツモ: 和了評価あり", !!ev && ev.totalHan >= 1);
  check("ツモ: 宣言成功", declareTsumo(g) === true && g.result.type === "tsumo");
}

console.log(`\n結果: ${pass} passed / ${fail} failed`);
process.exit(fail ? 1 : 0);
