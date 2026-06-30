#!/usr/bin/env node
/**
 * Playwright で公式モチーフアイコンを一括取得（直リンク 403 / headless 検知回避）。
 *   npm install playwright && npx playwright install chromium  # 初回のみ
 *   node scripts/download-member-motifs-playwright.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROSTER } from "./fetch-member-character-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../assets/game-icons/member-icons");

const SERIES_REFERER = {
  muse: "https://www.lovelive-anime.jp/otonokizaka/member/member01.html",
  aqours: "https://www.lovelive-anime.jp/uranohoshi/member.php",
  nijigasaki: "https://www.lovelive-anime.jp/nijigasaki/about_nijigasaki.php",
  liella: "https://www.lovelive-anime.jp/yuigaoka/worldwide/member/",
  hasunosora: "https://www.lovelive-anime.jp/hasunosora/member/01/",
};

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("playwright not installed. Run: npm install playwright");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const name of fs.readdirSync(OUT_DIR)) {
  if (name.endsWith(".webp")) fs.unlinkSync(path.join(OUT_DIR, name));
}

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--headless=new", "--disable-blink-features=AutomationControlled"],
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  locale: "ja-JP",
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => false });
});

const page = await context.newPage();
/** @type {string | null} */
let warmedSeries = null;

async function warmSeries(series) {
  if (warmedSeries === series) return;
  const referer = SERIES_REFERER[series];
  if (!referer) return;
  await page.goto(referer, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(400);
  warmedSeries = series;
}

let ok = 0;
let fail = 0;
for (const entry of ROSTER) {
  const dest = path.join(OUT_DIR, entry.id + ".png");
  try {
    await warmSeries(entry.series);
    const b64 = await page.evaluate(async (url) => {
      const r = await fetch(url);
      if (!r.ok) return null;
      const bytes = new Uint8Array(await r.arrayBuffer());
      let s = "";
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s);
    }, entry.sourceUrl);
    if (!b64) {
      console.error("FAIL", entry.id, entry.sourceUrl);
      fail++;
      continue;
    }
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 200) {
      console.error("FAIL small", entry.id, buf.length);
      fail++;
      continue;
    }
    fs.writeFileSync(dest, buf);
    ok++;
    console.log("saved", entry.id + ".png", buf.length);
  } catch (err) {
    console.error("ERR", entry.id, err.message);
    fail++;
  }
}

await browser.close();
console.log(`done ok=${ok} fail=${fail} total=${ROSTER.length}`);
process.exit(fail ? 1 : 0);
