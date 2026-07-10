// 和了判定 + 役評価の単体検証（fetch 非依存のミニカタログ）
import { analyzeHand, isTenpai, winningTiles } from "../js/mahjong.js";
import { MELOD_NUMERIC_ONLY } from "../js/meldRules.js";
import { evaluateHand } from "../js/yaku.js";
import { BASE_YAKU } from "../js/yaku.js";

function buildCatalog() {
  const types = [];
  const byContent = new Map();
  // muse 9 人 / aqours 9 人（三色検証用）
  for (const [content, n] of [["muse", 9], ["aqours", 9]]) {
    const list = [];
    for (let i = 1; i <= n; i++) {
      const t = {
        key: `${content}-c${i}`, suit: content, orderIndex: i, kind: "member",
        contentId: content, charId: `c${i}`, label: `${content}${i}`, iconUrl: null, glyph: null, blank: false,
      };
      types.push(t); list.push(t);
    }
    byContent.set(content, list);
  }
  const honors = [];
  for (const id of ["soap", "water", "rainbow", "star", "lotus", "bird", "blank"]) {
    const t = { key: `honor-${id}`, suit: "honor", orderIndex: null, kind: "honor", contentId: null, honorId: id, label: id, iconUrl: null, glyph: "", blank: id === "blank" };
    types.push(t); honors.push(t);
  }
  const byKey = new Map();
  types.forEach((t) => byKey.set(t.key, t));
  return { types, byKey, byContent, honors };
}

const cat = buildCatalog();
const MO = MELOD_NUMERIC_ONLY;
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok  -", name); }
  else { fail++; console.log("  FAIL-", name); }
}

// 1) 一気通貫 + 役牌（字牌刻子）
const h1 = [
  "muse-c1","muse-c2","muse-c3","muse-c4","muse-c5","muse-c6","muse-c7","muse-c8","muse-c9",
  "honor-soap","honor-soap","honor-soap",
  "muse-c1","muse-c1",
];
const a1 = analyzeHand(h1, cat, MO);
check("一気通貫の手が和了", a1.isAgari);
const e1 = evaluateHand(a1, { menzen: true, tsumo: false, riichi: false }, cat, BASE_YAKU);
check("一気通貫を検出", e1.yaku.some((y) => y.name === "一気通貫"));
check("役牌1翻を検出", e1.yaku.some((y) => y.name.includes("役牌")));

// 2) 七対子
const h2 = [
  "muse-c1","muse-c1","muse-c3","muse-c3","muse-c5","muse-c5","muse-c7","muse-c7",
  "aqours-c2","aqours-c2","aqours-c4","aqours-c4","honor-star","honor-star",
];
const a2 = analyzeHand(h2, cat, MO);
check("七対子が和了", a2.chiitoitsu && a2.isAgari);
const e2 = evaluateHand(a2, { menzen: true, tsumo: false, riichi: false }, cat, BASE_YAKU);
check("七対子2翻", e2.yaku.some((y) => y.name === "七対子" && y.han === 2));

// 3) 三色同順（muse 2-3-4 と aqours 2-3-4 …だが3色必要→2色では不成立）
const h3 = [
  "muse-c2","muse-c3","muse-c4","aqours-c2","aqours-c3","aqours-c4",
  "muse-c6","muse-c7","muse-c8","aqours-c6","aqours-c6","aqours-c6",
  "honor-water","honor-water",
];
const a3 = analyzeHand(h3, cat, MO);
check("2面子順子の手が和了", a3.isAgari);
const e3 = evaluateHand(a3, { menzen: true, tsumo: false, riichi: false }, cat, BASE_YAKU);
check("三色は2色なので不成立", !e3.yaku.some((y) => y.name === "三色同順"));

// 4) 清一色（muse のみ）
const h4 = [
  "muse-c1","muse-c2","muse-c3","muse-c3","muse-c4","muse-c5","muse-c6","muse-c7","muse-c8",
  "muse-c9","muse-c9","muse-c9","muse-c2","muse-c2",
];
const a4 = analyzeHand(h4, cat, MO);
check("清一色の手が和了", a4.isAgari);
const e4 = evaluateHand(a4, { menzen: true, tsumo: false, riichi: false }, cat, BASE_YAKU);
check("清一色を検出", e4.yaku.some((y) => y.name === "清一色"));

// 5) 非和了（バラバラ）
const h5 = ["muse-c1","muse-c3","muse-c5","muse-c7","muse-c9","aqours-c2","aqours-c4","aqours-c6","aqours-c8","honor-soap","honor-water","honor-star","honor-bird","honor-lotus"];
check("バラバラ手は非和了", !analyzeHand(h5, cat, MO).isAgari);

// 6) テンパイ / 待ち
const t13 = [
  "muse-c1","muse-c2","muse-c3","muse-c4","muse-c5","muse-c6","muse-c7","muse-c8","muse-c9",
  "honor-soap","honor-soap","honor-soap","muse-c1",
];
check("テンパイ判定", isTenpai(t13, cat, MO));
check("待ちに muse-c1 が含まれる（単騎）", winningTiles(t13, cat, MO).includes("muse-c1"));

// 7) 副露手（ポンで soap 刻子を晒し）: concealed 11 枚 = 3面子+雀頭
const concealed = [
  "muse-c1","muse-c2","muse-c3","muse-c4","muse-c5","muse-c6","muse-c7","muse-c8","muse-c9",
  "muse-c1","muse-c1",
];
const openMelds = [{ type: "triplet", suit: "honor", tileKeys: ["honor-soap","honor-soap","honor-soap"] }];
const a7 = analyzeHand(concealed, cat, MO);
check("副露手の concealed が和了形", a7.isAgari);
const e7 = evaluateHand(a7, { menzen: false, tsumo: false, riichi: false, openMelds }, cat, BASE_YAKU);
check("副露手で役牌(soap)検出", e7.yaku.some((y) => y.name.includes("役牌")));
check("副露手で一気通貫は食い下がり1翻", e7.yaku.some((y) => y.name === "一気通貫" && y.han === 1));
check("副露手で門前ツモは付かない", !e7.yaku.some((y) => y.name === "門前ツモ"));

// 8) 副露で七対子は無効（openMelds ありなら chiitoitsu を採用しない）
const seven = ["muse-c1","muse-c1","muse-c3","muse-c3","muse-c5","muse-c5","muse-c7","muse-c7","aqours-c2","aqours-c2","aqours-c4","aqours-c4","honor-star","honor-star"];
const a8 = analyzeHand(seven, cat, MO);
const e8 = evaluateHand(a8, { menzen: false, tsumo: false, riichi: false, openMelds: [{ type: "triplet", suit: "honor", tileKeys: ["honor-bird","honor-bird","honor-bird"] }] }, cat, BASE_YAKU);
check("副露時は七対子を採用しない", !(e8 && e8.yaku.some((y) => y.name === "七対子")));

console.log(`\n結果: ${pass} passed / ${fail} failed`);
process.exit(fail ? 1 : 0);
