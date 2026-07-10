#!/usr/bin/env node
/**
 * SIF2 メンバー紹介ページからユニットロゴ・立ち絵を取得し、
 * donjara/data/sif2-assets.json と donjara/assets/sif2/ に保存する。
 *
 * 参照ページ（各シリーズ代表 1 ページに全メンバー img が載る）:
 *   μ's / Aqours / 虹ヶ咲 / Liella!
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets/sif2");
const JSON_OUT = path.join(ROOT, "data/sif2-assets.json");
const ROSTER = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/member-character-icons.json"), "utf8")
);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";
const BASE = "https://lovelive-sif2.bushimo.jp";
const THEME = `${BASE}/wp-content/themes/sif2_v1.3/assets/images`;

/** roster id → SIF2 img ファイル名の id 部分（不一致のみ） */
const IMG_ID_ALIAS = {
  emma: "verde",
};

/** 各 series のスクレイプ元ページ */
const SERIES_PAGE = {
  muse: `${BASE}/member/us/honoka/`,
  aqours: `${BASE}/member/aqours/chika/`,
  nijigasaki: `${BASE}/member/nijigasaki/ayumu/`,
  liella: `${BASE}/member/liella/kanon/`,
};

/** memberData.js のユニット名 → SIF2 ファイル名 */
const UNIT_FILES = {
  muse: {
    Printemps: { logo: "logo_printemps.png", banner: "img_printemps_KyQZPqa1HTCz.png" },
    "lily white": { banner: "img_lily-white_8HlW8kTZtv8X.png" },
    BiBi: { banner: "img_bibi_jvHv76A7XD9I.png" },
  },
  aqours: {
    "CYaRon！": { logo: "logo_cyaron.png", banner: "img_cyaron_Dn7nCeX2YT9c.png" },
    AZALEA: { banner: "img_azalea_N4IRDQByQMq4.png" },
    "Guilty Kiss": { banner: "img_guilty-kiss_eVrQrwHUgN63.png" },
  },
  nijigasaki: {
    "A・ZU・NA": { logo: "logo_a-zu-na.png", banner: "img_a-zu-na_9Ctlk3nKKwh5.png" },
    QU4RTZ: { banner: "img_qu4rtz_kGhQd30SIem6.png" },
    DiverDiva: { banner: "img_diverdiva_eQv297zTDGjD.png" },
    R3BIRTH: { banner: "img_r3birth_ea2N9Mo0GIfV.png" },
  },
  liella: {
    "CatChu!": { logo: "logo_catchu.png", banner: "img_catchu.png" },
    KALEIDOSCORE: { banner: "img_kaleidoscore.png" },
    "5yncri5e!": { banner: "img_5yncri5e.png" },
  },
};

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function download(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) return;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`DL fail ${res.status} ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function parseIllustrations(html) {
  const map = new Map();
  const re = /uploads\/(\d+\/\d+\/img_([a-z0-9_-]+)(?:_[A-Za-z0-9_-]+)?\.png)/g;
  let m;
  while ((m = re.exec(html))) {
    const rel = `uploads/${m[1]}`;
    const slug = m[2].replace(/-/g, "");
    map.set(slug, rel);
  }
  return map;
}

function rosterImgSlug(charId) {
  return (IMG_ID_ALIAS[charId] || charId).replace(/-/g, "");
}

async function main() {
  const illustrations = {};
  const units = {};

  for (const [series, pageUrl] of Object.entries(SERIES_PAGE)) {
    console.log(`fetch ${series}…`);
    const html = await fetchText(pageUrl);
    const imgMap = parseIllustrations(html);

    for (const m of ROSTER.roster.filter((r) => r.series === series)) {
      const slug = rosterImgSlug(m.id);
      let rel = null;
      for (const [k, v] of imgMap) {
        if (k === slug || k.startsWith(slug)) {
          rel = v;
          break;
        }
      }
      if (!rel) {
        console.warn(`  skip illustration: ${series}/${m.id}`);
        continue;
      }
      const url = `${BASE}/wp-content/${rel}`;
      const local = `assets/sif2/illust/${series}/${m.id}.png`;
      await download(url, path.join(ROOT, local));
      illustrations[`${series}-${m.id}`] = { url, file: local, sourceUrl: pageUrl };
    }

    const unitDef = UNIT_FILES[series] || {};
    units[series] = {};
    for (const [unitName, files] of Object.entries(unitDef)) {
      const entry = { name: unitName };
      if (files.logo) {
        const url = `${THEME}/common/member/${files.logo}`;
        const local = `assets/sif2/units/${series}/${files.logo}`;
        await download(url, path.join(ROOT, local));
        entry.logo = local;
        entry.logoUrl = url;
      }
      if (files.banner) {
        const url = `${THEME}/pc/member/${files.banner}`;
        const local = `assets/sif2/units/${series}/${files.banner}`;
        await download(url, path.join(ROOT, local));
        entry.banner = local;
        entry.bannerUrl = url;
      }
      units[series][unitName] = entry;
    }
  }

  const out = {
    v: 1,
    source: "lovelive-sif2.bushimo.jp",
    illustrations,
    units,
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${JSON_OUT} (${Object.keys(illustrations).length} illust)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
