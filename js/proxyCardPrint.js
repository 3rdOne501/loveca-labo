/**
 * デッキ画像のプロキシ印刷。
 *
 * 方針: 各 A4 ページを canvas に実寸描画 → 専用 iframe の <img> だけを print()。
 * 本体アプリ CSS / height:297mm+page-break / transform 中央寄せは使わない。
 *
 * 外部サイト https://proxy-card.imasanari.dev/ への DnD・ZIP は任意フォールバック。
 */

import { T_LIVE, T_MEMBER } from "./config.js";
import { cardIsDrawYellLiveCatalog, cardIsNoteLiveCatalog } from "./cards.js";
import {
  bladeHeartDisplaySlotLabel,
  cardHasBladeHeart,
  compareBladeHeartDbKeys,
  isBladeHeartDoubleColorlessMarkerKey,
  isBladeHeartDrawMarkerKey,
  parseBladeHeartSlotFromKey,
} from "./bladeHeart.js";
import { GAME_STATUS_ICON_ART_DIR, resolveGameStatusBundledHref } from "./gameStatusIcons.js";

export const PROXY_CARD_PRINT_URL = "https://proxy-card.imasanari.dev/";

/** Love Live! TCG は 63×88mm 相当（サイトの「スタンダードサイズ」） */
export const PROXY_CARD_SIZE_HINT = "スタンダードサイズ";

/** @type {{ w: number, h: number }} */
export const LOVECA_CARD_MM = { w: 63, h: 88 };

/** @type {{ w: number, h: number }} */
export const PAGE_A4_MM = { w: 210, h: 297 };

/** 印刷・プレビュー用ラスタ解像度（px/inch） */
const PRINT_DPI = 180;

function mmToPx(mm) {
  return (Number(mm) * PRINT_DPI) / 25.4;
}

/**
 * @param {{ pageMarginMm?: number, pageW?: number, pageH?: number, cardW?: number, cardH?: number }} [opts]
 * @returns {{
 *   cols: number,
 *   rows: number,
 *   perPage: number,
 *   marginXMm: number,
 *   marginYMm: number,
 *   gridW: number,
 *   gridH: number,
 *   pageW: number,
 *   pageH: number,
 *   cardW: number,
 *   cardH: number,
 * }}
 */
export function computeProxyPrintGrid(opts) {
  const o = opts || {};
  const minMargin = o.pageMarginMm != null ? Number(o.pageMarginMm) : 7;
  const pageW = o.pageW != null ? Number(o.pageW) : PAGE_A4_MM.w;
  const pageH = o.pageH != null ? Number(o.pageH) : PAGE_A4_MM.h;
  const cardW = o.cardW != null ? Number(o.cardW) : LOVECA_CARD_MM.w;
  const cardH = o.cardH != null ? Number(o.cardH) : LOVECA_CARD_MM.h;
  const cols = Math.max(1, Math.floor((pageW - 2 * minMargin) / cardW));
  const rows = Math.max(1, Math.floor((pageH - 2 * minMargin) / cardH));
  const gridW = cols * cardW;
  const gridH = rows * cardH;
  // 上=下・左=右（カード密着・gap 0）
  const marginXMm = (pageW - gridW) / 2;
  const marginYMm = (pageH - gridH) / 2;
  return {
    cols: cols,
    rows: rows,
    perPage: cols * rows,
    marginXMm: marginXMm,
    marginYMm: marginYMm,
    gridW: gridW,
    gridH: gridH,
    pageW: pageW,
    pageH: pageH,
    cardW: cardW,
    cardH: cardH,
  };
}

/**
 * @param {File|Blob} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromBlob(file) {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    img.src = url;
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} mx
 * @param {number} my
 * @param {number} cols
 * @param {number} rows
 * @param {number} cardWpx
 * @param {number} cardHpx
 */
function drawCropMarks(ctx, mx, my, cols, rows, cardWpx, cardHpx) {
  const mark = mmToPx(3);
  const thick = Math.max(1, mmToPx(0.2));
  const gap = mmToPx(0.5);
  ctx.fillStyle = "#000";

  function fillRect(x, y, w, h) {
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  for (let c = 0; c <= cols; c++) {
    const x = mx + c * cardWpx - thick / 2;
    fillRect(x, my - gap - mark, thick, mark);
    fillRect(x, my + rows * cardHpx + gap, thick, mark);
  }
  for (let r = 0; r <= rows; r++) {
    const y = my + r * cardHpx - thick / 2;
    fillRect(mx - gap - mark, y, mark, thick);
    fillRect(mx + cols * cardWpx + gap, y, mark, thick);
  }
  const corner = mmToPx(3.5);
  const specs = [
    [mx - gap, my - gap, -1, -1],
    [mx + cols * cardWpx + gap, my - gap, 1, -1],
    [mx - gap, my + rows * cardHpx + gap, -1, 1],
    [mx + cols * cardWpx + gap, my + rows * cardHpx + gap, 1, 1],
  ];
  for (let i = 0; i < specs.length; i++) {
    const x0 = specs[i][0];
    const y0 = specs[i][1];
    const sx = specs[i][2];
    const sy = specs[i][3];
    fillRect(sx < 0 ? x0 - corner : x0, y0 - thick / 2, corner, thick);
    fillRect(x0 - thick / 2, sy < 0 ? y0 - corner : y0, thick, corner);
  }
}

/**
 * 1 ページ分を canvas に描画して JPEG data URL を返す。
 * @param {(File|Blob|null)[]} slotFiles length = perPage（足りない分は null）
 * @param {ReturnType<typeof computeProxyPrintGrid>} layout
 * @param {{ showCropMarks?: boolean }} [opts]
 * @returns {Promise<string>}
 */
export async function renderProxyPageDataUrl(slotFiles, layout, opts) {
  const showCropMarks = !opts || opts.showCropMarks !== false;
  const pageWpx = Math.round(mmToPx(layout.pageW));
  const pageHpx = Math.round(mmToPx(layout.pageH));
  const cardWpx = mmToPx(layout.cardW);
  const cardHpx = mmToPx(layout.cardH);
  const mx = mmToPx(layout.marginXMm);
  const my = mmToPx(layout.marginYMm);

  const canvas = document.createElement("canvas");
  canvas.width = pageWpx;
  canvas.height = pageHpx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas を初期化できませんでした");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageWpx, pageHpx);

  const list = slotFiles || [];
  for (let slot = 0; slot < layout.perPage; slot++) {
    const file = list[slot];
    if (!file) continue;
    const col = slot % layout.cols;
    const row = Math.floor(slot / layout.cols);
    const x = mx + col * cardWpx;
    const y = my + row * cardHpx;
    try {
      const img = await loadImageFromBlob(file);
      ctx.drawImage(img, x, y, cardWpx, cardHpx);
    } catch (_) {
      ctx.fillStyle = "#222";
      ctx.fillRect(x, y, cardWpx, cardHpx);
    }
  }

  if (showCropMarks) {
    drawCropMarks(ctx, mx, my, layout.cols, layout.rows, cardWpx, cardHpx);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * 全ページを描画。
 * @param {File[]} files
 * @param {{ pageMarginMm?: number, showCropMarks?: boolean }} [opts]
 * @returns {Promise<{ pageCount: number, dataUrls: string[], layout: ReturnType<typeof computeProxyPrintGrid> }>}
 */
export async function buildProxyPrintPageImages(files, opts) {
  const layout = computeProxyPrintGrid(opts || {});
  const list = files || [];
  const pageCount = list.length ? Math.ceil(list.length / layout.perPage) : 0;
  /** @type {string[]} */
  const dataUrls = [];
  for (let p = 0; p < pageCount; p++) {
    /** @type {(File|null)[]} */
    const slots = [];
    for (let s = 0; s < layout.perPage; s++) {
      const idx = p * layout.perPage + s;
      slots.push(idx < list.length ? list[idx] : null);
    }
    dataUrls.push(await renderProxyPageDataUrl(slots, layout, opts));
  }
  return { pageCount: pageCount, dataUrls: dataUrls, layout: layout };
}

/**
 * プレビュー用: host にページ画像を並べる。
 * @param {HTMLElement} host
 * @param {string[]} dataUrls
 */
export function renderProxyPrintPreview(host, dataUrls) {
  if (!host) return;
  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "dlg-proxy-print-preview-inner";
  for (let i = 0; i < (dataUrls || []).length; i++) {
    const img = document.createElement("img");
    img.className = "dlg-proxy-print-preview-page";
    img.src = dataUrls[i];
    img.alt = "印刷プレビュー " + (i + 1) + " ページ";
    img.draggable = false;
    wrap.appendChild(img);
  }
  host.appendChild(wrap);
}

/**
 * 専用 iframe で印刷（本体 CSS の影響を受けない）。
 * @param {string[]} dataUrls
 * @returns {Promise<void>}
 */
export function printProxyPageImages(dataUrls) {
  return new Promise(function (resolve, reject) {
    const urls = dataUrls || [];
    if (!urls.length) {
      reject(new Error("印刷するページがありません"));
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
    if (!doc) {
      iframe.remove();
      reject(new Error("印刷用フレームを開けませんでした"));
      return;
    }

    const pagesHtml = urls
      .map(function (src, i) {
        const br = i < urls.length - 1 ? "page-break-after:always;" : "page-break-after:auto;";
        return (
          '<img class="page" src="' +
          src +
          '" alt="page ' +
          (i + 1) +
          '" style="display:block;width:210mm;height:297mm;margin:0;padding:0;border:0;' +
          br +
          '" />'
        );
      })
      .join("");

    doc.open();
    doc.write(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><title>プロキシ印刷</title>" +
        "<style>" +
        "html,body{margin:0;padding:0;background:#fff;}" +
        "@page{size:A4 portrait;margin:0;}" +
        "@media print{html,body{margin:0;padding:0;}.page{break-inside:avoid;}}" +
        "</style></head><body>" +
        pagesHtml +
        "</body></html>",
    );
    doc.close();

    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      reject(new Error("印刷ウィンドウがありません"));
      return;
    }

    const imgs = doc.images;
    let pending = imgs.length;
    let finished = false;

    function cleanup() {
      if (finished) return;
      finished = true;
      try {
        win.removeEventListener("afterprint", onAfterPrint);
      } catch (_) {}
      setTimeout(function () {
        try {
          iframe.remove();
        } catch (_) {}
      }, 500);
      resolve();
    }

    function onAfterPrint() {
      cleanup();
    }

    function doPrint() {
      win.addEventListener("afterprint", onAfterPrint);
      try {
        win.focus();
        win.print();
      } catch (err) {
        cleanup();
        reject(err);
        return;
      }
      // afterprint が来ない環境向け
      setTimeout(cleanup, 60 * 1000);
    }

    function onImgDone() {
      pending--;
      if (pending <= 0) {
        setTimeout(doPrint, 50);
      }
    }

    if (!pending) {
      setTimeout(doPrint, 50);
      return;
    }
    for (let i = 0; i < imgs.length; i++) {
      if (imgs[i].complete) onImgDone();
      else {
        imgs[i].addEventListener("load", onImgDone);
        imgs[i].addEventListener("error", onImgDone);
      }
    }
  });
}

/* ========== 画像取得 / ZIP / 外部サイト（既存互換） ========== */

const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** @param {Uint8Array} buf */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @param {string} s */
function encodeUtf8(s) {
  return new TextEncoder().encode(String(s || ""));
}

/**
 * @param {string} originalUrl
 * @param {{ landscape?: boolean }} [opts]
 * @returns {string}
 */
export function proxyPrintImageUrl(originalUrl, opts) {
  const raw = String(originalUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw;
  const landscape = !!(opts && opts.landscape);
  try {
    const u = new URL(raw, typeof location !== "undefined" ? location.href : "https://local.invalid/");
    if (u.protocol !== "http:" && u.protocol !== "https:") return raw;
    const wh = landscape ? "w=880&h=630" : "w=630&h=880";
    return (
      "https://wsrv.nl/?url=" +
      encodeURIComponent(u.href) +
      "&" +
      wh +
      "&fit=contain&q=90&output=jpg&n=-1"
    );
  } catch (_) {
    return raw;
  }
}

/**
 * @param {Uint8Array} buf
 * @returns {Promise<Uint8Array>}
 */
export async function rotateProxyImageToPortrait(buf) {
  if (!buf || !buf.length) return buf;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return buf;
  const blob = new Blob([buf], { type: "image/jpeg" });
  let bmp;
  try {
    bmp = await createImageBitmap(blob);
  } catch (_) {
    return buf;
  }
  if (!bmp || bmp.height >= bmp.width) {
    if (bmp) bmp.close();
    return buf;
  }
  const canvas = document.createElement("canvas");
  canvas.width = bmp.height;
  canvas.height = bmp.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    return buf;
  }
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  /** @type {Blob|null} */
  const outBlob = await new Promise(function (resolve) {
    canvas.toBlob(function (b) {
      resolve(b);
    }, "image/jpeg", 0.92);
  });
  if (!outBlob) return buf;
  return new Uint8Array(await outBlob.arrayBuffer());
}

function proxyFileBaseName(cardNo, copyIndex) {
  const safe = String(cardNo || "card")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  const idx = String(Math.max(1, copyIndex)).padStart(2, "0");
  return safe + "_x" + idx + ".jpg";
}

/**
 * @param {Record<string, number>} deckMap
 * @param {(no: string) => any} getCardFn
 * @returns {{ cardNo: string, name: string, count: number, imgUrl: string, isLive: boolean }[]}
 */
export function collectDeckProxyEntries(deckMap, getCardFn) {
  /** @type {{ cardNo: string, name: string, count: number, imgUrl: string, isLive: boolean }[]} */
  const out = [];
  if (!deckMap || typeof deckMap !== "object") return out;
  const nos = Object.keys(deckMap).sort();
  for (let i = 0; i < nos.length; i++) {
    const no = nos[i];
    const n = Math.floor(Number(deckMap[no]) || 0);
    if (n <= 0) continue;
    const c = typeof getCardFn === "function" ? getCardFn(no) : null;
    const img = c && c.img ? String(c.img) : "";
    if (!img) continue;
    const ty = c && c.type != null ? String(c.type) : "";
    out.push({
      cardNo: no,
      name: c && c.name != null ? String(c.name) : no,
      count: Math.min(99, n),
      imgUrl: img,
      isLive: ty === "ライブ" || /-\d+-L$/i.test(String(no)) || /-L$/i.test(String(no)),
    });
  }
  return out;
}

/**
 * @param {{ name: string, data: Uint8Array }[]} files
 * @returns {Blob}
 */
export function createStoreZipBlob(files) {
  /** @type {Uint8Array[]} */
  const parts = [];
  /** @type {{ nameBytes: Uint8Array, crc: number, size: number, offset: number }[]} */
  const centrals = [];
  let offset = 0;

  function pushBytes(u8) {
    parts.push(u8);
    offset += u8.length;
  }
  function u16(n) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, n, true);
    return b;
  }
  function u32(n) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n >>> 0, true);
    return b;
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const nameBytes = encodeUtf8(f.name);
    const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data || []);
    const crc = crc32(data);
    const localOffset = offset;
    pushBytes(u32(0x04034b50));
    pushBytes(u16(20));
    pushBytes(u16(0x0800));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u32(crc));
    pushBytes(u32(data.length));
    pushBytes(u32(data.length));
    pushBytes(u16(nameBytes.length));
    pushBytes(u16(0));
    pushBytes(nameBytes);
    pushBytes(data);
    centrals.push({ nameBytes, crc, size: data.length, offset: localOffset });
  }

  const centralStart = offset;
  for (let i = 0; i < centrals.length; i++) {
    const e = centrals[i];
    pushBytes(u32(0x02014b50));
    pushBytes(u16(20));
    pushBytes(u16(20));
    pushBytes(u16(0x0800));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u32(e.crc));
    pushBytes(u32(e.size));
    pushBytes(u32(e.size));
    pushBytes(u16(e.nameBytes.length));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u16(0));
    pushBytes(u32(0));
    pushBytes(u32(e.offset));
    pushBytes(e.nameBytes);
  }
  const centralSize = offset - centralStart;
  pushBytes(u32(0x06054b50));
  pushBytes(u16(0));
  pushBytes(u16(0));
  pushBytes(u16(centrals.length));
  pushBytes(u16(centrals.length));
  pushBytes(u32(centralSize));
  pushBytes(u32(centralStart));
  pushBytes(u16(0));

  let total = 0;
  for (let i = 0; i < parts.length; i++) total += parts[i].length;
  const out = new Uint8Array(total);
  let o = 0;
  for (let i = 0; i < parts.length; i++) {
    out.set(parts[i], o);
    o += parts[i].length;
  }
  return new Blob([out], { type: "application/zip" });
}

/**
 * @param {{ cardNo: string, count: number, imgUrl: string, isLive?: boolean }[]} entries
 * @param {{ onProgress?: (done: number, total: number, label: string) => void }} [opts]
 * @returns {Promise<{ name: string, data: Uint8Array }[]>}
 */
export async function fetchDeckProxyZipFiles(entries, opts) {
  const onProgress = opts && typeof opts.onProgress === "function" ? opts.onProgress : null;
  /** @type {{ name: string, data: Uint8Array }[]} */
  const files = [];
  let uniqueDone = 0;
  const uniqueTotal = entries.length;

  for (let ei = 0; ei < entries.length; ei++) {
    const ent = entries[ei];
    const fetchUrl = proxyPrintImageUrl(ent.imgUrl, { landscape: !!ent.isLive });
    if (onProgress) onProgress(uniqueDone, uniqueTotal, ent.cardNo);
    let buf;
    try {
      const res = await fetch(fetchUrl, { mode: "cors", cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      buf = new Uint8Array(await res.arrayBuffer());
      if (ent.isLive) buf = await rotateProxyImageToPortrait(buf);
    } catch (err) {
      throw new Error(
        "画像の取得に失敗しました: " +
          ent.cardNo +
          (err && err.message ? "（" + err.message + "）" : ""),
      );
    }
    uniqueDone++;
    if (onProgress) onProgress(uniqueDone, uniqueTotal, ent.cardNo);
    for (let c = 1; c <= ent.count; c++) {
      files.push({ name: proxyFileBaseName(ent.cardNo, c), data: buf });
    }
  }
  return files;
}

/**
 * @param {{ name: string, data: Uint8Array }[]} zipFiles
 * @returns {File[]}
 */
export function proxyZipEntriesToFiles(zipFiles) {
  /** @type {File[]} */
  const out = [];
  for (let i = 0; i < (zipFiles || []).length; i++) {
    const f = zipFiles[i];
    const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data || []);
    out.push(new File([data], f.name, { type: "image/jpeg" }));
  }
  return out;
}

function triggerBlobDownload(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * @param {File[]} files
 * @returns {boolean}
 */
export function canShareProxyFiles(files) {
  try {
    return !!(
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      files &&
      files.length &&
      navigator.canShare({ files: files })
    );
  } catch (_) {
    return false;
  }
}

/**
 * @param {File[]} files
 * @returns {Promise<boolean>}
 */
export async function shareProxyFiles(files) {
  if (!canShareProxyFiles(files)) return false;
  await navigator.share({
    files: files,
    title: "ラブカ プロキシ印刷",
    text: "プロキシカード印刷用のカード画像です",
  });
  return true;
}

/**
 * @param {Record<string, number>} deckMap
 * @param {(no: string) => any} getCardFn
 * @param {{ onProgress?: (done: number, total: number, label: string) => void }} [opts]
 * @returns {Promise<{ fileCount: number, kindCount: number, files: File[], zipFiles: { name: string, data: Uint8Array }[] }>}
 */
export async function prepareDeckProxyPrintFiles(deckMap, getCardFn, opts) {
  const entries = collectDeckProxyEntries(deckMap, getCardFn);
  if (!entries.length) {
    throw new Error("印刷できるカード画像がデッキにありません");
  }
  const zipFiles = await fetchDeckProxyZipFiles(entries, opts);
  const files = proxyZipEntriesToFiles(zipFiles);
  return {
    fileCount: files.length,
    kindCount: entries.length,
    files: files,
    zipFiles: zipFiles,
  };
}

/**
 * @param {{ name: string, data: Uint8Array }[]} zipFiles
 */
export function downloadDeckProxyZip(zipFiles) {
  const zip = createStoreZipBlob(zipFiles);
  const stamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(zip, "loveca-proxy-" + stamp + ".zip");
}

/** @returns {Window|null} */
export function openProxyCardPrintSite() {
  try {
    return window.open(PROXY_CARD_PRINT_URL, "_blank", "noopener,noreferrer");
  } catch (_) {
    return null;
  }
}

/**
 * @param {Record<string, number>} deckMap
 * @param {(no: string) => any} getCardFn
 * @param {{ onProgress?: (done: number, total: number, label: string) => void }} [opts]
 * @deprecated
 */
export async function exportDeckToProxyCardPrint(deckMap, getCardFn, opts) {
  const prepared = await prepareDeckProxyPrintFiles(deckMap, getCardFn, opts);
  downloadDeckProxyZip(prepared.zipFiles);
  const w = openProxyCardPrintSite();
  return {
    fileCount: prepared.fileCount,
    kindCount: prepared.kindCount,
    opened: !!w,
  };
}

/**
 * @param {DragEvent} ev
 * @param {File[]} files
 */
export function attachProxyFilesToDragEvent(ev, files) {
  if (!ev || !ev.dataTransfer || !files || !files.length) return;
  try {
    ev.dataTransfer.clearData();
  } catch (_) {}
  ev.dataTransfer.effectAllowed = "copy";
  try {
    ev.dataTransfer.setData("text/plain", String(files.length) + " proxy card images");
  } catch (_) {}
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    try {
      if (typeof ev.dataTransfer.items.add === "function") {
        ev.dataTransfer.items.add(files[i]);
        added++;
      }
    } catch (_) {}
  }
  if (!added && files[0]) {
    try {
      ev.dataTransfer.setData(
        "DownloadURL",
        "image/jpeg:" + files[0].name + ":" + URL.createObjectURL(files[0]),
      );
    } catch (_) {}
  }
}

/**
 * @param {{ cardNo: string, name: string, count: number, imgUrl: string, isLive: boolean }[]} entries
 * @param {(no: string) => any} getCardFn
 */
function sortDeckRecipeEntries(entries, getCardFn) {
  return (entries || []).slice().sort(function (a, b) {
    if (!!a.isLive !== !!b.isLive) return a.isLive ? 1 : -1;
    if (!a.isLive && !b.isLive) {
      const ca = typeof getCardFn === "function" ? getCardFn(a.cardNo) : null;
      const cb = typeof getCardFn === "function" ? getCardFn(b.cardNo) : null;
      const na = Number(ca && ca.cost);
      const nb = Number(cb && cb.cost);
      const fa = Number.isFinite(na) ? na : 999999;
      const fb = Number.isFinite(nb) ? nb : 999999;
      if (fa !== fb) return fa - fb;
    }
    return String(a.name || a.cardNo).localeCompare(String(b.name || b.cardNo), "ja");
  });
}

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement|null>}
 */
async function loadRecipeImage(url) {
  const fetchUrl = proxyPrintImageUrl(url, { landscape: false });
  if (!fetchUrl) return null;
  try {
    if (fetchUrl.startsWith("data:")) {
      return await loadImageFromBlob(
        await (await fetch(fetchUrl)).blob(),
      );
    }
    const res = await fetch(fetchUrl, { mode: "cors", cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await loadImageFromBlob(await res.blob());
  } catch (_) {
    return null;
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
/** BH スロット色（canvas 用。bladeHeart SLOT.fill と揃える） */
const RECIPE_BH_SLOT_FILL = {
  1: "#ff9eb5",
  2: "#e53935",
  3: "#fbc02d",
  4: "#43a047",
  5: "#1e88e5",
  6: "#8e24aa",
  7: "#f5f5f5",
};

/**
 * デッキレシピ画像用の BH / 非BH / スコア / ドロー / コスト分布。
 * @param {Record<string, number>} deckMap
 * @param {(no: string) => object | null | undefined} getCardFn
 */
export function buildDeckRecipeShareStats(deckMap, getCardFn) {
  /** @type {Record<string, number>} */
  const byKey = {};
  /** @type {Record<string, number>} */
  const byCost = {};
  let memBh = 0;
  let liveBh = 0;
  let memNonBh = 0;
  let scoreLive = 0;
  let drawLive = 0;
  let totalBhWeighted = 0;

  Object.keys(deckMap || {}).forEach(function (no) {
    const n = Number(deckMap[no]);
    if (!Number.isInteger(n) || n <= 0) return;
    const c = getCardFn(no);
    if (!c) return;
    if (c.type === T_MEMBER) {
      if (cardHasBladeHeart(c)) memBh += n;
      else memNonBh += n;
      const costN = Number(c.cost);
      const costKey = Number.isFinite(costN) ? String(Math.floor(costN)) : "—";
      byCost[costKey] = (byCost[costKey] || 0) + n;
    } else if (c.type === T_LIVE) {
      if (cardHasBladeHeart(c)) liveBh += n;
      if (cardIsNoteLiveCatalog(c)) scoreLive += n;
      if (cardIsDrawYellLiveCatalog(c)) drawLive += n;
    }
    if (!cardHasBladeHeart(c)) return;
    const bh = c.blade_heart;
    if (!bh || typeof bh !== "object" || Array.isArray(bh)) return;
    Object.keys(bh).forEach(function (key) {
      const v = Number(bh[key]);
      if (!Number.isFinite(v) || v === 0) return;
      const add = v * n;
      byKey[key] = (byKey[key] || 0) + add;
      totalBhWeighted += add;
    });
  });

  const bhEntries = Object.keys(byKey)
    .map(function (k) {
      return { key: k, qty: byKey[k] };
    })
    .sort(function (a, b) {
      return compareBladeHeartDbKeys(a.key, b.key);
    });

  const costEntries = Object.keys(byCost)
    .map(function (k) {
      return { cost: k, qty: byCost[k] };
    })
    .sort(function (a, b) {
      if (a.cost === "—") return 1;
      if (b.cost === "—") return -1;
      return Number(a.cost) - Number(b.cost);
    });

  return {
    memBh: memBh,
    liveBh: liveBh,
    memNonBh: memNonBh,
    scoreLive: scoreLive,
    drawLive: drawLive,
    totalBhWeighted: totalBhWeighted,
    bhEntries: bhEntries,
    costEntries: costEntries,
  };
}

function recipeBhPillMeta(dbKey) {
  if (isBladeHeartDoubleColorlessMarkerKey(dbKey)) {
    return { label: "W無色", fill: "#cfd8dc", iconSlot: 0, iconOpts: { double_colorless: true } };
  }
  if (isBladeHeartDrawMarkerKey(dbKey)) {
    return { label: "ドロー", fill: "#80deea", iconSlot: 0, iconOpts: { draw_yell: true } };
  }
  const slot = parseBladeHeartSlotFromKey(dbKey);
  if (slot != null && slot >= 1 && slot <= 7) {
    return {
      label: bladeHeartDisplaySlotLabel(slot),
      fill: RECIPE_BH_SLOT_FILL[slot] || "#ff9eb5",
      iconSlot: slot,
      iconOpts: {},
    };
  }
  return { label: String(dbKey), fill: "#9e9e9e", iconSlot: null, iconOpts: {} };
}

function recipeHeartIconUrl(slot, opts) {
  opts = opts || {};
  var file = null;
  if (opts.score) file = "icon_score.png";
  else if (opts.draw_yell) file = "icon_draw.png";
  else if (opts.double_colorless) file = "icon_blade_heart07.png";
  else if (slot === 7) file = "icon_all.png";
  else if (typeof slot === "number" && slot >= 1 && slot <= 6) file = "heart_0" + slot + ".png";
  else if (slot === 0) file = "heart_00.png";
  if (!file) return "";
  try {
    return resolveGameStatusBundledHref(GAME_STATUS_ICON_ART_DIR + file) || "";
  } catch (_) {
    return "";
  }
}

/**
 * @param {ReturnType<typeof buildDeckRecipeShareStats>} stats
 * @param {number} panelInnerW
 * @returns {{ pills: {label:string, qty:number, fill:string, cacheKey:string}[], pillRows: number, height: number }}
 */
function layoutDeckRecipeStatsPanel(stats, panelInnerW) {
  /** @type {{label:string, qty:number, fill:string, cacheKey:string}[]} */
  const pills = [];
  (stats.bhEntries || []).forEach(function (ent) {
    const meta = recipeBhPillMeta(ent.key);
    const cacheKey = meta.iconOpts.score
      ? "score"
      : meta.iconOpts.draw_yell
        ? "draw"
        : meta.iconOpts.double_colorless
          ? "w07"
          : "s" + String(meta.iconSlot);
    pills.push({ label: meta.label, qty: ent.qty, fill: meta.fill, cacheKey: cacheKey });
  });
  if (stats.memNonBh > 0) pills.push({ label: "非BH", qty: stats.memNonBh, fill: "#78909c", cacheKey: "" });
  if (stats.scoreLive > 0) pills.push({ label: "スコア", qty: stats.scoreLive, fill: "#ffb74d", cacheKey: "score" });
  if (stats.drawLive > 0) pills.push({ label: "ドロー", qty: stats.drawLive, fill: "#4dd0e1", cacheKey: "draw" });

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  let pillRows = 0;
  if (pills.length && mctx) {
    mctx.font = '600 14px "Noto Sans JP", system-ui, sans-serif';
    const pillH = 30;
    const pillGap = 8;
    let px = 0;
    let rows = 1;
    pills.forEach(function (p) {
      const label = p.label + " ×" + p.qty;
      const textW = mctx.measureText(label).width;
      const iconW = p.cacheKey ? 18 : 0;
      const pillW = Math.ceil(textW + 18 + iconW + (iconW ? 6 : 0));
      if (px + pillW > panelInnerW && px > 0) {
        rows++;
        px = 0;
      }
      px += pillW + pillGap;
    });
    pillRows = rows;
    void pillH;
  } else if (pills.length) {
    pillRows = Math.ceil(pills.length / Math.max(1, Math.floor(panelInnerW / 110)));
  }

  const padIn = 16;
  const summaryH = 34;
  const pillsH = pillRows ? pillRows * 38 : 4;
  const chartTitleH = 26;
  const chartH = (stats.costEntries || []).length ? 96 : 28;
  const height = padIn + summaryH + pillsH + chartTitleH + chartH + padIn;
  return { pills: pills, pillRows: pillRows, height: height };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof buildDeckRecipeShareStats>} stats
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {Record<string, HTMLImageElement|null>} iconCache
 * @returns {number} 描画した高さ
 */
function drawDeckRecipeStatsPanel(ctx, stats, x, y, w, iconCache) {
  const padIn = 16;
  const layout = layoutDeckRecipeStatsPanel(stats, w - padIn * 2);
  const panelH = layout.height;

  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.strokeStyle = "rgba(255, 140, 190, 0.38)";
  ctx.lineWidth = 1.5;
  fillRoundRect(ctx, x, y, w, panelH, 14);
  ctx.stroke();

  let cy = y + padIn;
  ctx.fillStyle = "rgba(255, 214, 239, 0.92)";
  ctx.font = '600 18px "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    "BH記載 メンバー " +
      stats.memBh +
      " · ライブ " +
      stats.liveBh +
      " · 非BHメン " +
      stats.memNonBh +
      " · スコア " +
      stats.scoreLive +
      " · ドロー " +
      stats.drawLive +
      " · BH計 " +
      stats.totalBhWeighted,
    x + padIn,
    cy + 16,
  );
  cy += 34;

  const pillH = 30;
  const pillGap = 8;
  let px = x + padIn;
  let py = cy;
  const maxX = x + w - padIn;
  layout.pills.forEach(function (p) {
    ctx.font = '600 14px "Noto Sans JP", system-ui, sans-serif';
    const label = p.label + " ×" + p.qty;
    const textW = ctx.measureText(label).width;
    const icon = p.cacheKey ? iconCache[p.cacheKey] || null : null;
    const iconW = icon ? 18 : 0;
    const pillW = Math.ceil(textW + 18 + iconW + (iconW ? 6 : 0));
    if (px + pillW > maxX && px > x + padIn) {
      px = x + padIn;
      py += pillH + pillGap;
    }
    ctx.fillStyle = p.fill;
    fillRoundRect(ctx, px, py, pillW, pillH, 10);
    let tx = px + 9;
    if (icon) {
      try {
        ctx.drawImage(icon, tx, py + 6, 18, 18);
      } catch (_) {}
      tx += 24;
    }
    ctx.fillStyle =
      p.fill === "#f5f5f5" || p.fill === "#fbc02d" || p.fill === "#ffb74d" ? "#1a1018" : "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, tx, py + pillH / 2 + 0.5);
    px += pillW + pillGap;
  });
  if (layout.pills.length) cy = py + pillH + 14;
  else cy += 4;

  ctx.fillStyle = "rgba(255, 214, 239, 0.78)";
  ctx.font = '600 16px "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("メンバー コスト分布", x + padIn, cy + 14);
  cy += 26;

  const costs = stats.costEntries || [];
  if (!costs.length) {
    ctx.fillStyle = "rgba(255, 214, 239, 0.45)";
    ctx.font = '500 14px "Noto Sans JP", system-ui, sans-serif';
    ctx.fillText("（メンバーなし）", x + padIn, cy + 12);
  } else {
    const chartH = 88;
    const chartBottom = cy + chartH;
    let maxQty = 1;
    costs.forEach(function (c) {
      maxQty = Math.max(maxQty, c.qty);
    });
    const barGap = 10;
    const barAreaW = w - padIn * 2;
    const barW = Math.min(48, Math.max(18, (barAreaW - barGap * (costs.length - 1)) / costs.length));
    const totalBarsW = costs.length * barW + Math.max(0, costs.length - 1) * barGap;
    let bx = x + padIn + Math.max(0, (barAreaW - totalBarsW) / 2);
    costs.forEach(function (c) {
      const barH = Math.max(6, Math.round((c.qty / maxQty) * (chartH - 28)));
      const barX = bx;
      const barY = chartBottom - 18 - barH;
      const grad = ctx.createLinearGradient(0, barY, 0, chartBottom - 18);
      grad.addColorStop(0, "#ff7ab8");
      grad.addColorStop(1, "#ff5a9a");
      ctx.fillStyle = grad;
      fillRoundRect(ctx, barX, barY, barW, barH, 6);
      ctx.fillStyle = "#ffe8f4";
      ctx.font = 'bold 13px "Noto Sans JP", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(c.qty), barX + barW / 2, barY - 2);
      ctx.fillStyle = "rgba(255, 214, 239, 0.85)";
      ctx.font = '600 13px "Noto Sans JP", system-ui, sans-serif';
      ctx.textBaseline = "top";
      ctx.fillText(c.cost === "—" ? "?" : String(c.cost), barX + barW / 2, chartBottom - 14);
      bx += barW + barGap;
    });
  }

  return panelH;
}

function fillRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

/**
 * デッキ内容を共有用 PNG（カード一覧＋枚数）に描画する。
 * @param {Record<string, number>} deckMap
 * @param {(no: string) => any} getCardFn
 * @param {{
 *   title?: string,
 *   onProgress?: (done: number, total: number, label: string) => void,
 *   keyCardNos?: string[],
 *   keyCard2Nos?: string[],
 *   keyCard3Nos?: string[],
 *   middleCardNos?: string[],
 * }} [opts]
 * @returns {Promise<Blob>}
 */
export async function exportDeckRecipeImageBlob(deckMap, getCardFn, opts) {
  const o = opts || {};
  const title = String(o.title || "デッキ").trim() || "デッキ";
  const onProgress = typeof o.onProgress === "function" ? o.onProgress : null;
  const entries = sortDeckRecipeEntries(collectDeckProxyEntries(deckMap, getCardFn), getCardFn);
  if (!entries.length) {
    throw new Error("画像にできるカードがデッキにありません");
  }

  /** @type {Record<string, string>} */
  const roleByNo = {};
  function markRoles(list, label) {
    (list || []).forEach(function (no) {
      if (no && !roleByNo[String(no)]) roleByNo[String(no)] = label;
    });
  }
  markRoles(o.keyCardNos, "キー");
  markRoles(o.keyCard2Nos, "キ②");
  markRoles(o.keyCard3Nos, "キ③");
  markRoles(o.middleCardNos, "中間");

  let memberKinds = 0;
  let liveKinds = 0;
  let memberCards = 0;
  let liveCards = 0;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].isLive) {
      liveKinds++;
      liveCards += entries[i].count;
    } else {
      memberKinds++;
      memberCards += entries[i].count;
    }
  }
  const totalCards = memberCards + liveCards;

  const cols = entries.length <= 12 ? 4 : entries.length <= 24 ? 6 : entries.length <= 40 ? 8 : 10;
  const W = 1400;
  const pad = 36;
  const titleH = 78;
  const subH = 36;
  const sectionGap = 22;
  const gridGap = 12;
  const gridW = W - pad * 2;
  const cellW = (gridW - gridGap * (cols - 1)) / cols;
  const cellH = cellW * (88 / 63);
  const rows = Math.ceil(entries.length / cols);
  const gridH = rows * cellH + Math.max(0, rows - 1) * gridGap;
  const footerH = 40;
  const stats = buildDeckRecipeShareStats(deckMap, getCardFn);
  const statsLayout = layoutDeckRecipeStatsPanel(stats, gridW - 32);
  const statsH = statsLayout.height;
  const canvasH = pad + titleH + subH + sectionGap + statsH + sectionGap + gridH + pad + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.ceil(canvasH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が使えません");

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#160a14");
  g.addColorStop(1, "#0c0812");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, canvas.height);

  ctx.fillStyle = "rgba(255, 90, 154, 0.18)";
  ctx.fillRect(0, 0, W, 6);

  ctx.fillStyle = "#ffe8f4";
  ctx.font = 'bold 40px "M PLUS Rounded 1c", "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const titleMaxW = W - pad * 2;
  let drawTitle = title;
  while (drawTitle.length > 1 && ctx.measureText(drawTitle).width > titleMaxW) {
    drawTitle = drawTitle.slice(0, -1);
  }
  if (drawTitle !== title) drawTitle = drawTitle.slice(0, Math.max(1, drawTitle.length - 1)) + "…";
  ctx.fillText(drawTitle, pad, pad + 46);

  ctx.fillStyle = "rgba(255, 214, 239, 0.88)";
  ctx.font = '600 22px "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(
    "メンバー " +
      memberCards +
      "（" +
      memberKinds +
      "種） · ライブ " +
      liveCards +
      "（" +
      liveKinds +
      "種） · 合計 " +
      totalCards +
      " 枚",
    pad,
    pad + titleH + 8,
  );

  /** @type {Record<string, HTMLImageElement|null>} */
  const iconCache = {};
  const iconLoads = [
    { key: "score", url: recipeHeartIconUrl(0, { score: true }) },
    { key: "draw", url: recipeHeartIconUrl(0, { draw_yell: true }) },
    { key: "w07", url: recipeHeartIconUrl(0, { double_colorless: true }) },
    { key: "s1", url: recipeHeartIconUrl(1) },
    { key: "s2", url: recipeHeartIconUrl(2) },
    { key: "s3", url: recipeHeartIconUrl(3) },
    { key: "s4", url: recipeHeartIconUrl(4) },
    { key: "s5", url: recipeHeartIconUrl(5) },
    { key: "s6", url: recipeHeartIconUrl(6) },
    { key: "s7", url: recipeHeartIconUrl(7) },
  ];
  await Promise.all(
    iconLoads.map(async function (it) {
      if (!it.url) {
        iconCache[it.key] = null;
        return;
      }
      iconCache[it.key] = await loadRecipeImage(it.url);
    }),
  );

  const statsTop = pad + titleH + subH + sectionGap;
  drawDeckRecipeStatsPanel(ctx, stats, pad, statsTop, gridW, iconCache);

  const gridTop = statsTop + statsH + sectionGap;

  for (let i = 0; i < entries.length; i++) {
    if (onProgress) onProgress(i, entries.length, entries[i].cardNo);
    const ent = entries[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + gridGap);
    const y = gridTop + row * (cellH + gridGap);

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 140, 190, 0.42)";
    ctx.lineWidth = 2;
    fillRoundRect(ctx, x, y, cellW, cellH, 10);
    ctx.stroke();

    const img = await loadRecipeImage(ent.imgUrl);
    const m = 5;
    if (img) {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const boxW = cellW - m * 2;
      const boxH = cellH - m * 2;
      if (iw && ih) {
        const imgRatio = iw / ih;
        const boxRatio = boxW / boxH;
        let dw;
        let dh;
        let dx;
        let dy;
        if (imgRatio > boxRatio) {
          dw = boxW;
          dh = boxW / imgRatio;
          dx = x + m;
          dy = y + m + (boxH - dh) / 2;
        } else {
          dh = boxH;
          dw = boxH * imgRatio;
          dx = x + m + (boxW - dw) / 2;
          dy = y + m;
        }
        ctx.save();
        fillRoundRect(ctx, x + m, y + m, boxW, boxH, 8);
        ctx.clip();
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "rgba(255, 214, 239, 0.75)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ent.cardNo, x + cellW / 2, y + cellH / 2);
    }

    const role = roleByNo[String(ent.cardNo)];
    if (role) {
      ctx.fillStyle = "rgba(255, 90, 154, 0.92)";
      fillRoundRect(ctx, x + 6, y + 6, 44, 22, 6);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(role, x + 28, y + 17);
    }

    const badge = "×" + String(ent.count);
    ctx.font = "bold 18px system-ui, sans-serif";
    const bw = Math.max(36, ctx.measureText(badge).width + 16);
    const bh = 26;
    const bx = x + cellW - bw - 6;
    const by = y + cellH - bh - 6;
    ctx.fillStyle = "rgba(12, 8, 18, 0.82)";
    fillRoundRect(ctx, bx, by, bw, bh, 8);
    ctx.strokeStyle = "rgba(255, 140, 190, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#ffe8f4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, bx + bw / 2, by + bh / 2 + 0.5);
  }
  if (onProgress) onProgress(entries.length, entries.length, "");

  ctx.fillStyle = "rgba(255, 214, 239, 0.55)";
  ctx.font = '500 16px "Noto Sans JP", system-ui, sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("ラブカラボ", W - pad, canvas.height - 18);

  return new Promise(function (resolve, reject) {
    canvas.toBlob(
      function (blob) {
        if (!blob) {
          reject(new Error("画像の生成に失敗しました"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      0.92,
    );
  });
}

/**
 * @param {Blob} blob
 * @param {string} [filename]
 */
export function downloadDeckRecipeImage(blob, filename) {
  const name =
    filename ||
    "loveca-deck-" + new Date().toISOString().slice(0, 10) + ".png";
  triggerBlobDownload(blob, name);
}

/**
 * @param {string} title
 * @returns {string}
 */
export function deckRecipeImageFileName(title) {
  const safe = String(title || "deck")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 48);
  return "loveca-deck-" + (safe || "deck") + "-" + new Date().toISOString().slice(0, 10) + ".png";
}
