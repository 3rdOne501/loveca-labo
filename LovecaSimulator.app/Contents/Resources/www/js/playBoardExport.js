/**
 * ソロプレイ中の盤面＋手札を記事用 PNG として出力。
 * 2列目（.col-center）をラブカラボの見た目のまま画像保存し、
 * Undo / スナップショット / 起動・ライブ開始ボタンは CSS で消す。
 */

const SCALE = 2;
const PAD_X = 52;
const PAD_Y = 28;

/** @type {Map<string, HTMLImageElement>} */
const imgCache = new Map();

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 4000);
}

function isSameOriginOrData(src) {
  const raw = String(src || "").trim();
  if (!raw) return false;
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return true;
  try {
    const u = new URL(raw, typeof location !== "undefined" ? location.href : "https://local.invalid/");
    if (typeof location === "undefined") return false;
    return u.origin === location.origin;
  } catch (_) {
    return false;
  }
}

/** 外部カード画像のみ wsrv。縦横比は維持（ライブ横長を潰さない）。 */
function corsSafeImageUrl(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.includes("wsrv.nl")) return raw;
  try {
    const u = new URL(raw, typeof location !== "undefined" ? location.href : "https://local.invalid/");
    if (u.protocol !== "http:" && u.protocol !== "https:") return raw;
    if (typeof location !== "undefined" && u.origin === location.origin) return u.href;
    return (
      "https://wsrv.nl/?url=" +
      encodeURIComponent(u.href) +
      "&w=840&fit=contain&q=90&output=jpg&n=-1"
    );
  } catch (_) {
    return raw;
  }
}

function loadImage(src) {
  const fetchUrl = corsSafeImageUrl(src);
  if (!fetchUrl) return Promise.reject(new Error("empty src"));
  if (imgCache.has(fetchUrl)) return Promise.resolve(imgCache.get(fetchUrl));
  return fetch(fetchUrl, { mode: "cors", cache: "force-cache", credentials: "omit" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.blob();
    })
    .then(function (blob) {
      return new Promise(function (resolve, reject) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = function () {
          imgCache.set(fetchUrl, img);
          resolve(img);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error("画像読込失敗"));
        };
        img.src = url;
      });
    });
}

async function resolveImgBitmap(imgEl) {
  if (!imgEl) return null;
  const visible = imgEl.currentSrc || imgEl.src || "";
  const realFace = imgEl.getAttribute("data-ll-real-face-src") || "";
  const src =
    visible && realFace && visible !== realFace ? visible : visible || realFace;
  if (!src) return null;
  if (imgEl.complete && imgEl.naturalWidth > 0 && isSameOriginOrData(src)) {
    return imgEl;
  }
  try {
    return await loadImage(src);
  } catch (_) {
    if (imgEl.complete && imgEl.naturalWidth > 0) return imgEl;
    return null;
  }
}

function isTransparentColor(c) {
  if (!c || c === "transparent") return true;
  const m = String(c).match(/rgba?\(([^)]+)\)/);
  if (!m) return false;
  const p = m[1].split(",").map(function (x) {
    return parseFloat(x.trim());
  });
  return p.length >= 4 && p[3] === 0;
}

function splitTopArgs(str) {
  const out = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function parseLinearGradient(str, x, y, w, h, ctx) {
  const m = String(str).match(/linear-gradient\((.*)\)\s*$/);
  if (!m) return null;
  const parts = splitTopArgs(m[1]);
  if (parts.length < 2) return null;
  let angle = 180;
  let start = 0;
  if (/deg$/i.test(parts[0]) || /^to\s/i.test(parts[0])) {
    if (/deg$/i.test(parts[0])) angle = parseFloat(parts[0]);
    else if (/to\s+top/i.test(parts[0])) angle = 0;
    else if (/to\s+right/i.test(parts[0])) angle = 90;
    else if (/to\s+bottom/i.test(parts[0])) angle = 180;
    else if (/to\s+left/i.test(parts[0])) angle = 270;
    start = 1;
  }
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const g = ctx.createLinearGradient(
    cx - (Math.cos(rad) * len) / 2,
    cy - (Math.sin(rad) * len) / 2,
    cx + (Math.cos(rad) * len) / 2,
    cy + (Math.sin(rad) * len) / 2,
  );
  const stops = parts.slice(start);
  stops.forEach(function (stop, i) {
    const sm = stop.match(/^(.*?)(?:\s+(-?[\d.]+)%\s*)?$/);
    const color = sm ? sm[1].trim() : stop;
    const pct = sm && sm[2] != null ? Number(sm[2]) / 100 : stops.length === 1 ? 0 : i / (stops.length - 1);
    try {
      g.addColorStop(Math.max(0, Math.min(1, pct)), color);
    } catch (_) {}
  });
  return g;
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (rad <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function radiusOf(cs) {
  const r = parseFloat(cs.borderTopLeftRadius);
  return Number.isFinite(r) ? r : 0;
}

function waitFrame() {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      requestAnimationFrame(resolve);
    });
  });
}

async function ensureImagesDecoded(root) {
  const imgs = root.querySelectorAll("img");
  const tasks = [];
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    try {
      img.loading = "eager";
    } catch (_) {}
    if (img.complete && img.naturalWidth > 0) {
      if (img.decode) {
        tasks.push(img.decode().catch(function () {}));
      }
      continue;
    }
    tasks.push(
      new Promise(function (resolve) {
        const done = function () {
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        if (img.decode) img.decode().then(done).catch(done);
        if (img.src) {
          const s = img.src;
          img.src = s;
        }
      }),
    );
  }
  await Promise.all(tasks);
}

function clearTextShadow(ctx) {
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

function canvasFontFromComputed(cs, zoom) {
  const style = cs.fontStyle && cs.fontStyle !== "normal" ? cs.fontStyle + " " : "";
  const weight = cs.fontWeight || "400";
  const sizePx = (parseFloat(cs.fontSize) || 16) * (zoom || 1);
  const family = cs.fontFamily || "sans-serif";
  return style + weight + " " + sizePx + "px " + family;
}

function parseTextShadows(shadowStr) {
  if (!shadowStr || shadowStr === "none") return [];
  const parts = splitTopArgs(String(shadowStr));
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    const colorFirst = part.match(
      /^((?:rgba?|hsla?)\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-z]+)(?:\s+(-?[\d.]+)px)\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?$/i,
    );
    if (colorFirst) {
      out.push({
        color: colorFirst[1],
        x: parseFloat(colorFirst[2]) || 0,
        y: parseFloat(colorFirst[3]) || 0,
        blur: parseFloat(colorFirst[4]) || 0,
      });
      continue;
    }
    const offsetFirst = part.match(
      /^(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?\s+(.+)$/,
    );
    if (offsetFirst) {
      out.push({
        x: parseFloat(offsetFirst[1]) || 0,
        y: parseFloat(offsetFirst[2]) || 0,
        blur: parseFloat(offsetFirst[3]) || 0,
        color: String(offsetFirst[5] || "").trim(),
      });
    }
  }
  return out;
}

function fillTextWithShadows(ctx, text, x, y, shadows, zoom) {
  const z = zoom || 1;
  if (shadows && shadows.length) {
    for (let i = 0; i < shadows.length; i++) {
      const s = shadows[i];
      ctx.save();
      ctx.shadowOffsetX = s.x * z;
      ctx.shadowOffsetY = s.y * z;
      ctx.shadowBlur = s.blur * z;
      ctx.shadowColor = s.color || "transparent";
      ctx.fillText(text, x, y);
      ctx.restore();
    }
  }
  clearTextShadow(ctx);
  ctx.fillText(text, x, y);
}

function paintTextNode(ctx, textNode, origin, cs, zoom) {
  const raw = String(textNode.textContent || "");
  const text = raw.replace(/\s+/g, " ");
  if (!text.trim()) return;
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rects = range.getClientRects();
  if (!rects.length) return;

  const fill =
    cs.webkitTextFillColor && cs.webkitTextFillColor !== "transparent"
      ? cs.webkitTextFillColor
      : cs.color;
  ctx.fillStyle = fill;
  ctx.font = canvasFontFromComputed(cs, zoom);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  if (typeof ctx.letterSpacing === "string") {
    const ls = cs.letterSpacing;
    if (ls && ls !== "normal") {
      const n = parseFloat(ls);
      ctx.letterSpacing = Number.isFinite(n) ? n * (zoom || 1) + "px" : ls;
    } else {
      ctx.letterSpacing = "0px";
    }
  }

  const shadows = parseTextShadows(cs.textShadow);
  const t = text.trim();
  const r = rects[0];
  if (!t || r.width < 0.2 || r.height < 0.2) return;
  fillTextWithShadows(
    ctx,
    t,
    r.left - origin.left,
    (r.top + r.bottom) / 2 - origin.top,
    shadows,
    zoom,
  );
  if (typeof ctx.letterSpacing === "string") ctx.letterSpacing = "0px";
}

function bmpNaturalSize(bmp) {
  return {
    nw: Math.max(1, bmp.naturalWidth || bmp.width || 1),
    nh: Math.max(1, bmp.naturalHeight || bmp.height || 1),
  };
}

function cssRotateQuarterTurns(el, cs) {
  if (el.classList.contains("rotated")) return 1;
  const t = cs && cs.transform;
  if (!t || t === "none") return 0;
  const m = String(t).match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const p = m[1].split(",").map(function (x) {
    return parseFloat(x.trim());
  });
  if (p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return 0;
  const q = Math.round(Math.atan2(p[1], p[0]) / (Math.PI / 2));
  return ((q % 4) + 4) % 4;
}

function drawBitmapFitted(ctx, bmp, dx, dy, dw, dh, fit) {
  const { nw, nh } = bmpNaturalSize(bmp);
  const mode = fit || "fill";
  if (mode === "contain" || mode === "cover") {
    const scale = mode === "cover" ? Math.max(dw / nw, dh / nh) : Math.min(dw / nw, dh / nh);
    const tw = nw * scale;
    const th = nh * scale;
    ctx.drawImage(bmp, dx + (dw - tw) / 2, dy + (dh - th) / 2, tw, th);
    return;
  }
  ctx.drawImage(bmp, dx, dy, dw, dh);
}

/** ライブ開始後の縦置きライブを、画像保存では横長枠へ（縦長原画だけ 90°） */
function liveFaceNeedsLandscapeRotate(el, bmp, destW, destH) {
  if (el.classList.contains("rotated")) return false;
  const item = el.closest("#live-row .live-slot .card-item");
  if (!item || item.classList.contains("card-item--live-h")) return false;
  if (String(item.getAttribute("data-type") || "") !== "ライブ") return false;
  const { nw, nh } = bmpNaturalSize(bmp);
  return nh > nw * 1.05 && destW > destH * 1.05;
}

function paintHtmlImage(ctx, el, bmp, origin, cs) {
  const rect = el.getBoundingClientRect();
  const x = rect.left - origin.left;
  const y = rect.top - origin.top;
  const w = rect.width;
  const h = rect.height;
  if (w < 0.4 || h < 0.4) return;

  const cx = x + w / 2;
  const cy = y + h / 2;
  let fit = String(cs.objectFit || "fill");
  if (fit === "fill") {
    const { nw, nh } = bmpNaturalSize(bmp);
    const destLandscape = w > h * 1.05;
    const bmpLandscape = nw > nh * 1.05;
    if (destLandscape !== bmpLandscape) fit = "contain";
  }
  const quarter = cssRotateQuarterTurns(el, cs);
  const rr = Math.min(6, Math.min(w, h) * 0.08);

  ctx.save();
  ctx.translate(cx, cy);

  if (liveFaceNeedsLandscapeRotate(el, bmp, w, h)) {
    ctx.rotate(Math.PI / 2);
    roundRect(ctx, -h / 2, -w / 2, h, w, rr);
    ctx.clip();
    try {
      drawBitmapFitted(ctx, bmp, -h / 2, -w / 2, h, w, "fill");
    } catch (_) {}
    ctx.restore();
    return;
  }

  if (quarter === 1 || quarter === 3) {
    ctx.rotate(quarter === 1 ? Math.PI / 2 : -Math.PI / 2);
    roundRect(ctx, -h / 2, -w / 2, h, w, rr);
    ctx.clip();
    try {
      drawBitmapFitted(ctx, bmp, -h / 2, -w / 2, h, w, fit === "contain" ? "contain" : "fill");
    } catch (_) {}
  } else {
    roundRect(ctx, -w / 2, -h / 2, w, h, rr);
    ctx.clip();
    try {
      drawBitmapFitted(ctx, bmp, -w / 2, -h / 2, w, h, fit);
    } catch (_) {}
  }
  ctx.restore();
}

async function paintSvg(ctx, el, origin) {
  const rect = el.getBoundingClientRect();
  if (rect.width < 0.4 || rect.height < 0.4) return;
  let xml;
  try {
    xml = new XMLSerializer().serializeToString(el);
  } catch (_) {
    return;
  }
  if (!/^<svg/i.test(xml)) xml = "<svg xmlns=\"http://www.w3.org/2000/svg\">" + xml + "</svg>";
  if (xml.indexOf("xmlns") === -1) {
    xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  try {
    const bmp = await loadImage(url);
    ctx.drawImage(bmp, rect.left - origin.left, rect.top - origin.top, rect.width, rect.height);
  } catch (_) {}
}

async function paintNode(ctx, el, origin, imgMap, zoom) {
  if (!el || el.nodeType !== 1) return;
  if (el.classList.contains("play-board-export-skip")) return;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return;
  if (parseFloat(cs.opacity) === 0) return;
  if (/^(BUTTON|SELECT|INPUT|TEXTAREA)$/.test(el.tagName)) return;
  zoom = zoom || 1;

  const rect = el.getBoundingClientRect();
  if (rect.width < 0.4 || rect.height < 0.4) return;

  const x = rect.left - origin.left;
  const y = rect.top - origin.top;
  const w = rect.width;
  const h = rect.height;
  const rad = radiusOf(cs);

  ctx.save();
  ctx.globalAlpha *= parseFloat(cs.opacity) || 1;

  const clipOverflow =
    cs.overflow !== "visible" &&
    cs.overflow !== "clip" &&
    !el.classList.contains("live-slot") &&
    !el.classList.contains("stage-slot") &&
    !el.classList.contains("card-item") &&
    !el.classList.contains("card-art-wrap");
  if (clipOverflow) {
    roundRect(ctx, x, y, w, h, rad);
    ctx.clip();
  }

  const bgImg = cs.backgroundImage;
  if (bgImg && bgImg !== "none" && bgImg.indexOf("linear-gradient") !== -1) {
    const g = parseLinearGradient(bgImg.replace(/\s+/g, " "), x, y, w, h, ctx);
    if (g) {
      roundRect(ctx, x, y, w, h, rad);
      ctx.fillStyle = g;
      ctx.fill();
    }
  } else if (!isTransparentColor(cs.backgroundColor)) {
    roundRect(ctx, x, y, w, h, rad);
    ctx.fillStyle = cs.backgroundColor;
    ctx.fill();
  }

  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (bw > 0 && cs.borderTopStyle && cs.borderTopStyle !== "none" && !isTransparentColor(cs.borderTopColor)) {
    roundRect(ctx, x, y, w, h, rad);
    ctx.strokeStyle = cs.borderTopColor;
    ctx.lineWidth = Math.max(1, bw);
    ctx.stroke();
  }

  if (el.tagName === "IMG") {
    let bmp = imgMap.get(el);
    if (!bmp) {
      bmp = await resolveImgBitmap(el);
      if (bmp) imgMap.set(el, bmp);
    }
    if (bmp) paintHtmlImage(ctx, el, bmp, origin, cs);
    ctx.restore();
    return;
  }

  if (el.tagName === "SVG" || (el.namespaceURI && /svg/i.test(el.namespaceURI) && el.tagName.toLowerCase() === "svg")) {
    await paintSvg(ctx, el, origin);
    ctx.restore();
    return;
  }

  for (let i = 0; i < el.children.length; i++) {
    await paintNode(ctx, el.children[i], origin, imgMap, zoom);
  }

  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node.nodeType === 3) paintTextNode(ctx, node, origin, cs, zoom);
  }

  ctx.restore();
}

function hideChromeClass(on) {
  document.body.classList.toggle("play-board-exporting", !!on);
}

function openFoldsForExport() {
  const restore = [];
  ["energy-fold", "hand-stick-fold"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el && "open" in el) {
      restore.push({ el: el, open: el.open });
      el.open = true;
    }
  });
  return restore;
}

/**
 * @param {{
 *   getMeta?: () => object,
 *   prepareDom?: () => (() => void) | void
 * }} opts
 */
export async function exportPlayBoardImage(opts) {
  opts = opts || {};
  const col =
    document.querySelector("#view-game .col.col-center") ||
    document.querySelector(".game-board .col.col-center");
  if (!col) throw new Error("2列目の盤面が見つかりません");

  const foldRestore = openFoldsForExport();
  const styleBackup = {
    overflow: col.style.overflow,
    maxHeight: col.style.maxHeight,
    height: col.style.height,
    minWidth: col.style.minWidth,
    width: col.style.width,
    paddingLeft: col.style.paddingLeft,
    paddingRight: col.style.paddingRight,
  };
  let handClone = null;
  let prepareRestore = null;
  hideChromeClass(true);
  try {
    if (typeof opts.prepareDom === "function") {
      prepareRestore = opts.prepareDom() || null;
    }
    if (typeof document.fonts !== "undefined" && document.fonts.ready) {
      await document.fonts.ready.catch(function () {});
    }

    const handFold = document.getElementById("hand-stick-fold");
    const handAlready = !!(handFold && col.contains(handFold));
    if (handFold && !handAlready) {
      handClone = handFold.cloneNode(true);
      handClone.id = "play-board-export-hand";
      handClone.classList.add("play-board-export-hand");
      handClone.open = true;
      col.appendChild(handClone);
    }

    col.style.overflow = "visible";
    col.style.maxHeight = "none";
    col.style.height = "auto";
    col.style.minWidth = "980px";
    col.style.width = "980px";
    col.style.paddingLeft = "1.4rem";
    col.style.paddingRight = "1.4rem";
    await waitFrame();
    await ensureImagesDecoded(col);
    await waitFrame();

    const originRect = col.getBoundingClientRect();
    const zoom = originRect.width / Math.max(1, col.offsetWidth);
    const widthCss = Math.max(col.clientWidth, originRect.width);
    const heightCss = Math.max(col.scrollHeight, col.offsetHeight, originRect.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((widthCss + PAD_X * 2) * SCALE);
    canvas.height = Math.round((heightCss + PAD_Y * 2) * SCALE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas を初期化できませんでした");
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const totalW = widthCss + PAD_X * 2;
    const totalH = heightCss + PAD_Y * 2;
    const bodyCs = getComputedStyle(document.body);
    const pageBg = bodyCs.backgroundColor;
    ctx.fillStyle = isTransparentColor(pageBg) ? "#0c0812" : pageBg;
    ctx.fillRect(0, 0, totalW, totalH);
    const pageGrad = parseLinearGradient(
      "linear-gradient(168deg, #161022 0%, #100818 42%, #0a060e 100%)",
      0,
      0,
      totalW,
      totalH,
      ctx,
    );
    if (pageGrad) {
      ctx.fillStyle = pageGrad;
      ctx.fillRect(0, 0, totalW, totalH);
    }
    const pink = ctx.createRadialGradient(totalW * 0.5, 0, 8, totalW * 0.5, 0, totalH * 0.55);
    pink.addColorStop(0, "rgba(255, 90, 154, 0.22)");
    pink.addColorStop(1, "rgba(255, 90, 154, 0)");
    ctx.fillStyle = pink;
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.translate(PAD_X, PAD_Y);
    const origin = { left: originRect.left, top: originRect.top };
    await paintNode(ctx, col, origin, new Map(), zoom);

    const blob = await new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (b) {
          if (b) resolve(b);
          else reject(new Error("PNG 生成に失敗しました"));
        },
        "image/png",
        1,
      );
    });

    const stamp = new Date();
    const ts =
      stamp.getFullYear() +
      String(stamp.getMonth() + 1).padStart(2, "0") +
      String(stamp.getDate()).padStart(2, "0") +
      "_" +
      String(stamp.getHours()).padStart(2, "0") +
      String(stamp.getMinutes()).padStart(2, "0");
    downloadBlob(blob, "loveca-board_" + ts + ".png");
  } finally {
    if (typeof prepareRestore === "function") {
      try {
        prepareRestore();
      } catch (_) {}
    }
    if (handClone && handClone.parentNode) handClone.parentNode.removeChild(handClone);
    col.style.overflow = styleBackup.overflow;
    col.style.maxHeight = styleBackup.maxHeight;
    col.style.height = styleBackup.height;
    col.style.minWidth = styleBackup.minWidth;
    col.style.width = styleBackup.width;
    col.style.paddingLeft = styleBackup.paddingLeft;
    col.style.paddingRight = styleBackup.paddingRight;
    foldRestore.forEach(function (item) {
      item.el.open = item.open;
    });
    hideChromeClass(false);
  }
}
