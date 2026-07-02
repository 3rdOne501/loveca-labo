#!/usr/bin/env node
/**
 * 「アイコンよう」フォルダ → assets/game-icons へ配置しマニフェストを更新する。
 *   node scripts/install-icon-you-assets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "アイコンよう");
const MEMBER_OUT = path.join(ROOT, "assets/game-icons/member-icons");
const GROUP_OUT = path.join(ROOT, "assets/game-icons/group-logos");
const MEMBER_MANIFEST = path.join(ROOT, "data/member-character-icons.json");
const GROUP_MANIFEST = path.join(ROOT, "data/enter-fx-group-logos.json");

/** ソースファイル名（小文字・拡張子除去前）→ id */
const MEMBER_SOURCE_ALIASES = {
  honoka: "honoka",
  eli: "eli",
  eri: "eli",
  kotori: "kotori",
  umi: "umi",
  rin: "rin",
  maki: "maki",
  nozomi: "nozomi",
  hanayo: "hanayo",
  niko: "nico",
  chika: "chika",
  you: "you",
  riko: "riko",
  kanan: "kanan",
  daiya: "dia",
  yoshiko: "yoshiko",
  hanamaru: "hanamaru",
  mari: "mari",
  ruby: "ruby",
  seira: "seira",
  leah: "leah",
  ayumu: "ayumu",
  kasumi: "kasumi",
  shizuku: "shizuku",
  karin: "karin",
  ai: "ai",
  kanata: "kanata",
  setuna: "setsuna",
  ema: "emma",
  rina: "rina",
  shioriko: "shioriko",
  mia: "mia",
  rannju: "lanzhu",
  kanon: "kanon",
  keke: "keke",
  chisato: "chisato",
  sumire: "sumire",
  ren: "ren",
  kinako: "kinako",
  mei: "mei",
  shiki: "shiki",
  natsumi: "natsumi",
  marugarete: "margarete",
  tomari: "tomari",
  yuuna: "yuuna",
  mao: "mao",
};

const HASU_MEMBER_IDS = new Set([
  "kaho",
  "sayaka",
  "shao",
  "tsuzuri",
  "rurino",
  "yoshino",
  "ginko",
  "kosuzu",
  "hime",
  "ceras",
  "izumi",
]);

/** @type {Array<{ id: string, label: string, series: string, file: string }>} */
const ROSTER_META = [
  { id: "honoka", label: "高坂穂乃果", series: "muse" },
  { id: "eli", label: "絢瀬絵里", series: "muse" },
  { id: "kotori", label: "南ことり", series: "muse" },
  { id: "umi", label: "園田海未", series: "muse" },
  { id: "rin", label: "星空 凛", series: "muse" },
  { id: "maki", label: "西木野真姫", series: "muse" },
  { id: "nozomi", label: "東條 希", series: "muse" },
  { id: "hanayo", label: "小泉花陽", series: "muse" },
  { id: "nico", label: "矢澤にこ", series: "muse" },
  { id: "chika", label: "高海千歌", series: "aqours" },
  { id: "riko", label: "桜内梨子", series: "aqours" },
  { id: "kanan", label: "松浦果南", series: "aqours" },
  { id: "dia", label: "黒澤ダイヤ", series: "aqours" },
  { id: "you", label: "渡辺 曜", series: "aqours" },
  { id: "yoshiko", label: "津島善子", series: "aqours" },
  { id: "hanamaru", label: "国木田花丸", series: "aqours" },
  { id: "mari", label: "小原鞠莉", series: "aqours" },
  { id: "ruby", label: "黒澤ルビィ", series: "aqours" },
  { id: "seira", label: "鹿角聖良", series: "aqours" },
  { id: "leah", label: "レイ", series: "aqours" },
  { id: "yu", label: "高咲 侑", series: "nijigasaki" },
  { id: "ayumu", label: "上原歩夢", series: "nijigasaki" },
  { id: "kasumi", label: "中須かすみ", series: "nijigasaki" },
  { id: "shizuku", label: "桜坂しずく", series: "nijigasaki" },
  { id: "karin", label: "朝香果林", series: "nijigasaki" },
  { id: "ai", label: "宮下 愛", series: "nijigasaki" },
  { id: "kanata", label: "近江彼方", series: "nijigasaki" },
  { id: "setsuna", label: "優木せつ菜", series: "nijigasaki" },
  { id: "emma", label: "エマ・ヴェルデ", series: "nijigasaki" },
  { id: "rina", label: "天王寺璃奈", series: "nijigasaki" },
  { id: "shioriko", label: "三船栞子", series: "nijigasaki" },
  { id: "mia", label: "ミア・テイラー", series: "nijigasaki" },
  { id: "lanzhu", label: "鐘 嵐珠", series: "nijigasaki" },
  { id: "kanon", label: "澁谷かのん", series: "liella" },
  { id: "keke", label: "唐 可可", series: "liella" },
  { id: "chisato", label: "嵐 千砂都", series: "liella" },
  { id: "sumire", label: "平安名すみれ", series: "liella" },
  { id: "ren", label: "葉月 恋", series: "liella" },
  { id: "kinako", label: "桜小路きな子", series: "liella" },
  { id: "mei", label: "米女メイ", series: "liella" },
  { id: "shiki", label: "若菜四季", series: "liella" },
  { id: "natsumi", label: "鬼塚夏美", series: "liella" },
  { id: "margarete", label: "ウィーン・マルガレーテ", series: "liella" },
  { id: "tomari", label: "鬼塚冬鞠", series: "liella" },
  { id: "yuuna", label: "聖澤悠奈", series: "liella" },
  { id: "mao", label: "柊 摩央", series: "liella" },
  { id: "kaho", label: "日野下花帆", series: "hasunosora" },
  { id: "sayaka", label: "村野さやか", series: "hasunosora" },
  { id: "shao", label: "乙宗 梢", series: "hasunosora" },
  { id: "tsuzuri", label: "夕霧綴理", series: "hasunosora" },
  { id: "rurino", label: "大沢瑠璃乃", series: "hasunosora" },
  { id: "yoshino", label: "藤島 慈", series: "hasunosora" },
  { id: "ginko", label: "百生 吟子", series: "hasunosora" },
  { id: "kosuzu", label: "徒町 小鈴", series: "hasunosora" },
  { id: "hime", label: "安養寺 姫芽", series: "hasunosora" },
  { id: "ceras", label: "セラス 柳田 リリエンフェルト", series: "hasunosora" },
  { id: "izumi", label: "桂城 泉", series: "hasunosora" },
];

function findSubdir(namePart) {
  return fs.readdirSync(SRC).find((d) => {
    if (!d || d.startsWith(".")) return false;
    if (d.includes(namePart)) return true;
    // macOS NFD: 「グループ名」など結合文字のゆれ
    try {
      return d.normalize("NFC").includes(String(namePart).normalize("NFC"));
    } catch (_) {
      return false;
    }
  });
}

function normStem(fileName) {
  return path
    .basename(fileName)
    .replace(/\.(png\.webp|webp|png)$/i, "")
    .toLowerCase();
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** グループロゴ: ブラウザで壊れやすいファイル名 → 安全名 */
const GROUP_DEST_ALIASES = {
  "Μ's_logo.svg": "muse_logo.svg",
  "Μ's_logo.png": "muse_logo.png",
};

function groupDestName(fileName) {
  if (GROUP_DEST_ALIASES[fileName]) return GROUP_DEST_ALIASES[fileName];
  if (/\.svg$/i.test(fileName)) return fileName;
  return fileName.replace(/\.(png\.webp)$/i, ".webp");
}

function extOf(srcPath) {
  const base = path.basename(srcPath);
  if (/\.png\.webp$/i.test(base) || /\.webp$/i.test(base)) return ".webp";
  if (/\.png$/i.test(base)) return ".png";
  return path.extname(base) || ".webp";
}

/** @type {Map<string, string>} id → dest file name */
const installedMemberFiles = new Map();

// Hasunosora: keep existing official PNGs
if (fs.existsSync(MEMBER_OUT)) {
  for (const id of HASU_MEMBER_IDS) {
    const png = path.join(MEMBER_OUT, id + ".png");
    if (fs.existsSync(png)) installedMemberFiles.set(id, id + ".png");
  }
}

function installMemberSource(srcPath, memberId) {
  if (HASU_MEMBER_IDS.has(memberId)) return;
  const base = path.basename(srcPath);
  const ext = extOf(srcPath);
  const destName =
    memberId === "seira" && /\.png\.webp$/i.test(base) ? "seira.png.webp" : memberId + ext;
  copyFile(srcPath, path.join(MEMBER_OUT, destName));
  installedMemberFiles.set(memberId, destName);
}

// μ's / Aqours / Liella / Nijigasaki
for (const [part, seriesHint] of [
  ["μ", "muse"],
  ["Aqours", "aqours"],
  ["Liella", "liella"],
  ["虹", "nijigasaki"],
]) {
  const dirName = findSubdir(part);
  if (!dirName) continue;
  const dir = path.join(SRC, dirName);
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(".")) continue;
    const stem = normStem(f);
    const id = MEMBER_SOURCE_ALIASES[stem] || stem;
    if (!ROSTER_META.some((r) => r.id === id)) {
      console.warn("skip", seriesHint, f, "→ unknown id", id);
      continue;
    }
    installMemberSource(path.join(dir, f), id);
  }
}

// Group / unit logos
fs.mkdirSync(GROUP_OUT, { recursive: true });
const groupDirName =
  findSubdir("グループ") || findSubdir("ループ") || findSubdir("グルーフ");
const groupFiles = groupDirName ? fs.readdirSync(path.join(SRC, groupDirName)) : [];
/** @type {Record<string, string>} */
const groupFileByKey = {};
for (const f of groupFiles) {
  if (f.startsWith(".")) continue;
  const dest = groupDestName(f);
  copyFile(path.join(SRC, groupDirName, f), path.join(GROUP_OUT, dest));
  groupFileByKey[f] = dest;
}

const groupManifest = {
  v: 2,
  artDir: "assets/game-icons/group-logos/",
  seriesLogos: {
    muse: groupFileByKey["Μ's_logo.svg"] || "muse_logo.svg",
    aqours: groupFileByKey["Aqours.png"] || "Aqours.png",
    liella: groupFileByKey["Liella!.png"] || "Liella!.png",
    nijigasaki:
      groupFileByKey["Love_Live!_Nijigasaki_Gakuen_School_Idol_Doukoukai_logo.png"] ||
      "Love_Live!_Nijigasaki_Gakuen_School_Idol_Doukoukai_logo.png",
  },
  rivalUnitLogos: {
    arise: groupFileByKey["A-RISE_logo.webp"] || "A-RISE_logo.webp",
    saint_snow: groupFileByKey["saint-snow-logo.png"] || "saint-snow-logo.png",
    sunny_passion:
      groupFileByKey["sanny_passion.webp"] ||
      groupFileByKey["sunny_pussion.png"] ||
      "sanny_passion.webp",
  },
  fusionLogo: groupFileByKey["lovelive_OCG.png"] || "lovelive_OCG.png",
  hasunosoraUnitLogos: {
    default: groupFileByKey["hasu.webp"] || "hasu.webp",
    cerise_bouquet: groupFileByKey["suri-zu_bouquet.webp"] || "suri-zu_bouquet.webp",
    dollchestra: groupFileByKey["dollchestra.webp"] || "dollchestra.webp",
    mirakurapark: groupFileByKey["mirakurapark.webp"] || "mirakurapark.webp",
    edelnote: groupFileByKey["Edel_Note_Logo.webp"] || "Edel_Note_Logo.webp",
  },
  unitLogoPatterns: [
    { match: "スリーズブーケ|Cerise", logo: "cerise_bouquet" },
    { match: "DOLLCHESTRA|ドルチェスタ", logo: "dollchestra" },
    { match: "みらくらぱーく|ミラクルパーク|mirakurapark", logo: "mirakurapark" },
    { match: "EdelNote", logo: "edelnote" },
  ],
};

const memberManifest = {
  v: 4,
  kind: "icon-you-member-motif",
  source: "アイコンよう/",
  artDir: "assets/game-icons/member-icons/",
  roster: ROSTER_META.map((meta) => {
    const file = installedMemberFiles.get(meta.id);
    if (!file) console.warn("missing member asset:", meta.id);
    return {
      ...meta,
      file: file || meta.id + ".webp",
      sourceUrl: "アイコンよう/",
    };
  }),
};

fs.writeFileSync(MEMBER_MANIFEST, JSON.stringify(memberManifest, null, 2) + "\n");
fs.writeFileSync(GROUP_MANIFEST, JSON.stringify(groupManifest, null, 2) + "\n");

console.log(
  "installed members:",
  installedMemberFiles.size,
  "| group logos:",
  Object.keys(groupFileByKey).length,
);
