/**
 * ラブライブ！シリーズ公式サイト（https://www.lovelive-anime.jp/members/）の
 * メンバー紹介サムネイルを取得し、ドンジャラ専用ロスター + 牌イラストを生成する。
 *
 * 共有ロスター（リポジトリ直下 data/member-character-icons.json）は
 * メインアプリ（js/memberCharacterIcons.js）が参照するため書き換えない。
 *
 * 公式 MEMBERS ハブに掲載のないメンバー（Aqours: 鹿角聖良/レイ、Liella!: 聖澤悠奈/柊摩央）は
 * 既存のモチーフアイコンをコピーしてフォールバックする。
 *
 * 実行: node donjara/scripts/fetch-official-icons.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SRC_ROSTER = path.join(ROOT, "data/member-character-icons.json");
const SRC_ICON_DIR = path.join(ROOT, "assets/game-icons/member-icons");
const OUT_ICON_DIR = path.join(ROOT, "donjara/assets/member-icons");
const OUT_ROSTER = path.join(ROOT, "donjara/data/member-character-icons.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

const HUB = "https://www.lovelive-anime.jp/members/";
const HUB_ORIGIN = "https://www.lovelive-anime.jp";

/** @param {string} s */
function normalizeLabel(s) {
  return String(s || "")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function curlFetch(url, ref) {
  return execFileSync("curl", [
    "-sS",
    "-f",
    "-m",
    "45",
    "-L",
    "-H",
    `User-Agent: ${UA}`,
    "-H",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H",
    "Accept-Language: ja,en-US;q=0.9",
    "-H",
    `Referer: ${ref || HUB}`,
    url,
  ]);
}

function curlDownload(url, ref, outPath) {
  execFileSync("curl", [
    "-sS",
    "-f",
    "-m",
    "45",
    "-L",
    "-H",
    `User-Agent: ${UA}`,
    "-H",
    `Referer: ${ref || HUB}`,
    "-o",
    outPath,
    url,
  ]);
  const st = fs.statSync(outPath);
  if (st.size < 500) throw new Error(`too small (${st.size}b): ${url}`);
}

/** @returns {Map<string, string>} normalized label -> absolute image URL */
function fetchHubThumbnails() {
  const html = curlFetch(HUB, HUB_ORIGIN + "/").toString("utf8");
  /** @type {Map<string, string>} */
  const byLabel = new Map();
  const re = /<img\s+src="(\/images\/members\/[^"]+)"\s+alt="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = HUB_ORIGIN + m[1];
    const alt = m[2];
    byLabel.set(normalizeLabel(alt), url);
    byLabel.set(alt.trim(), url);
  }
  if (byLabel.size < 40) {
    throw new Error(`MEMBERS ハブの解析に失敗（${byLabel.size} 件）。HTML 構造が変わった可能性があります。`);
  }
  return byLabel;
}

/** @param {Map<string, string>} hub @param {string} label */
function resolveHubUrl(hub, label) {
  const trimmed = String(label || "").trim();
  return hub.get(trimmed) || hub.get(normalizeLabel(trimmed)) || null;
}

function extFromUrl(url) {
  const m = String(url).match(/\.(webp|png|jpe?g)(?:\?|$)/i);
  return m ? `.${m[1].toLowerCase()}` : ".webp";
}

function main() {
  const roster = JSON.parse(fs.readFileSync(SRC_ROSTER, "utf8"));
  fs.mkdirSync(OUT_ICON_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_ROSTER), { recursive: true });

  console.log(`MEMBERS ハブ取得: ${HUB}`);
  const hub = fetchHubThumbnails();
  console.log(`  サムネ ${hub.size} 件を解析\n`);

  const outRoster = {
    v: 2,
    kind: "official-member-hub-thumbnail",
    source: HUB,
    artDir: "donjara/assets/member-icons/",
    roster: [],
  };
  let ok = 0,
    fallback = 0,
    fail = 0;

  for (const m of roster.roster) {
    const hubUrl = resolveHubUrl(hub, m.label);
    let file = m.file;
    let sourceUrl = m.sourceUrl || "";

    if (hubUrl) {
      const ext = extFromUrl(hubUrl);
      const outFile = `${m.id}${ext}`;
      const outPath = path.join(OUT_ICON_DIR, outFile);
      try {
        curlDownload(hubUrl, HUB, outPath);
        file = outFile;
        sourceUrl = hubUrl;
        ok++;
        console.log(`  ok   ${m.label} <= ${hubUrl}`);
      } catch (e) {
        fail++;
        console.log(`  FAIL ${m.label}: ${e.message}`);
      }
    } else {
      const srcPath = path.join(SRC_ICON_DIR, m.file);
      if (fs.existsSync(srcPath)) {
        const outFile = m.file.replace(/[^A-Za-z0-9._-]/g, "_");
        fs.copyFileSync(srcPath, path.join(OUT_ICON_DIR, outFile));
        file = outFile;
        sourceUrl = `fallback:${m.file}`;
        fallback++;
        console.log(`  copy ${m.label} <= ${m.file} (ハブ未掲載)`);
      } else {
        fail++;
        console.log(`  MISS ${m.label}: ハブ未掲載 & 既存アイコン無し ${m.file}`);
      }
    }

    outRoster.roster.push({ id: m.id, label: m.label, series: m.series, file, sourceUrl });
  }

  fs.writeFileSync(OUT_ROSTER, JSON.stringify(outRoster, null, 2) + "\n");
  console.log(`\n完了: ハブ ${ok} / フォールバック ${fallback} / 失敗 ${fail}`);
  console.log(`ロスター: ${OUT_ROSTER}`);
}

main();
