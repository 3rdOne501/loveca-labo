#!/usr/bin/env node
/**
 * 各作品公式サイト「メンバー紹介」のパーソナルモチーフアイコン定義。
 * - 蓮ノ空: hasunosora/shared/img/member/NN_icon.png（Playwright 取得）
 * - 他作品: assets/reference/member-motif-grid.png から切り出し
 *   （公式ポータル掲載のフラットモチーフ一覧・data/member-motif-cell-map.json）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets/game-icons/member-icons");
const MANIFEST_PATH = path.join(ROOT, "data/member-character-icons.json");

const ORIGIN = "https://www.lovelive-anime.jp";

/** @type {Array<{ id: string, label: string, series: string, sourceUrl: string, referer: string }>} */
export const ROSTER = [
  // μ's — 参照画像グリッド（公式ポータル掲載モチーフ）
  { id: "honoka", label: "高坂穂乃果", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "eli", label: "絢瀬絵里", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "kotori", label: "南ことり", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "umi", label: "園田海未", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "rin", label: "星空 凛", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "maki", label: "西木野真姫", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "nozomi", label: "東條 希", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "hanayo", label: "小泉花陽", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "nico", label: "矢澤にこ", series: "muse", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  // Aqours
  { id: "chika", label: "高海千歌", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "riko", label: "桜内梨子", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "kanan", label: "松浦果南", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "dia", label: "黒澤ダイヤ", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "you", label: "渡辺 曜", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "yoshiko", label: "津島善子", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "hanamaru", label: "国木田花丸", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "mari", label: "小原鞠莉", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "ruby", label: "黒澤ルビィ", series: "aqours", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  // Nijigasaki
  { id: "yu", label: "高咲 侑", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "ayumu", label: "上原歩夢", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "kasumi", label: "中須かすみ", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "shizuku", label: "桜坂しずく", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "karin", label: "朝香果林", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "ai", label: "宮下 愛", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "kanata", label: "近江彼方", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "setsuna", label: "優木せつ菜", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "emma", label: "エマ・ヴェルデ", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "rina", label: "天王寺璃奈", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "shioriko", label: "三船栞子", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "mia", label: "ミア・テイラー", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "lanzhu", label: "鐘 嵐珠", series: "nijigasaki", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  // Liella!
  { id: "kanon", label: "澁谷かのん", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "keke", label: "唐 可可", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "chisato", label: "嵐 千砂都", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "sumire", label: "平安名すみれ", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "ren", label: "葉月 恋", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "kinako", label: "桜小路きな子", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "mei", label: "米女メイ", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "shiki", label: "若菜四季", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "natsumi", label: "鬼塚夏美", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "margarete", label: "ウィーン・マルガレーテ", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  { id: "tomari", label: "鬼塚冬鞠", series: "liella", sourceUrl: `${ORIGIN}/members/`, referer: `${ORIGIN}/members/` },
  // Hasunosora — hasunosora/shared/img/member/NN_icon.png
  { id: "kaho", label: "日野下花帆", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/01_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "sayaka", label: "村野さやか", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/02_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "shao", label: "乙宗 梢", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/03_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "tsuzuri", label: "夕霧綴理", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/04_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "rurino", label: "大沢瑠璃乃", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/05_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "yoshino", label: "藤島 慈", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/06_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "ginko", label: "百生 吟子", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/07_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "kosuzu", label: "徒町 小鈴", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/08_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "hime", label: "安養寺 姫芽", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/09_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "ceras", label: "セラス 柳田 リリエンフェルト", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/10_icon.png`, referer: `${ORIGIN}/hasunosora/` },
  { id: "izumi", label: "桂城 泉", series: "hasunosora", sourceUrl: `${ORIGIN}/hasunosora/shared/img/member/11_icon.png`, referer: `${ORIGIN}/hasunosora/` },
];

function writeManifest() {
  const manifest = {
    v: 3,
    kind: "lovelive-anime-member-motif-icon",
    source: "https://www.lovelive-anime.jp/ (各作品メンバー紹介)",
    artDir: "assets/game-icons/member-icons/",
    roster: ROSTER.map(({ id, label, series, sourceUrl }) => ({
      id,
      label,
      file: id + ".png",
      sourceUrl,
      series,
    })),
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function printBrowserFetchSnippet(ids) {
  const items = ROSTER.filter((e) => !ids || ids.includes(e.id));
  console.log(
    JSON.stringify(
      items.map((e) => ({ id: e.id, url: e.sourceUrl })),
      null,
      2
    )
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const cmd = process.argv[2];
  if (cmd === "manifest") {
    writeManifest();
    console.log("wrote manifest", MANIFEST_PATH, "roster=", ROSTER.length);
  } else if (cmd === "urls") {
    printBrowserFetchSnippet(process.argv.slice(3));
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    writeManifest();
    console.log(`manifest updated (${ROSTER.length} icons).`);
    console.log("  node scripts/download-member-motifs-playwright.mjs");
  }
}
