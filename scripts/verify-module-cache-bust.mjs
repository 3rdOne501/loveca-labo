#!/usr/bin/env node
/**
 * index.html のインポートマップに js/*.js が漏れなく載っているかを検査する。
 *
 * 漏れたモジュールは `?v=<build>` が付かないまま配信され、修正を出しても
 * ブラウザ／CDN が古い版を返し続ける（例: playBoardExport.js の盤面画像保存）。
 * あわせて loveca-build / styles.css?v= / APP_MODULE_CACHE_BUST の一致も見る。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const config = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");

const listMatch = html.match(/var moduleNames = \[([\s\S]*?)\];/);
if (!listMatch) {
  errors.push("index.html に moduleNames の配列が見つかりません");
} else {
  const listed = new Set([...listMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const files = fs
    .readdirSync(path.join(root, "js"))
    .filter((f) => f.endsWith(".js") && !f.endsWith(".example.js"));

  files
    .filter((f) => !listed.has(f))
    .forEach((f) => {
      errors.push(`js/${f} が moduleNames に未登録（キャッシュバスト無しで配信されます）`);
    });
  [...listed]
    .filter((f) => !files.includes(f))
    .forEach((f) => {
      errors.push(`moduleNames の ${f} に対応する js/${f} がありません`);
    });
}

const buildTag = (html.match(/<meta name="loveca-build" content="([^"]+)"/) || [])[1];
const cssTag = (html.match(/href="styles\.css\?v=([^"]+)"/) || [])[1];
const bustTag = (config.match(/APP_MODULE_CACHE_BUST = "([^"]+)"/) || [])[1];

if (!buildTag) errors.push("index.html の loveca-build meta が読めません");
if (!bustTag) errors.push("js/config.js の APP_MODULE_CACHE_BUST が読めません");
if (buildTag && bustTag && buildTag !== bustTag) {
  errors.push(`loveca-build (${buildTag}) と APP_MODULE_CACHE_BUST (${bustTag}) が不一致`);
}
if (buildTag && cssTag && buildTag !== cssTag) {
  errors.push(`loveca-build (${buildTag}) と styles.css?v= (${cssTag}) が不一致`);
}

if (errors.length) {
  console.error("NG: モジュールのキャッシュバスト検査に失敗しました");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log(`OK: js/*.js は全て importmap に登録済み / build=${buildTag}`);
