import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applyCatalogThumbToImg,
  catalogListThumbnailUrl,
  catalogThumbImgHtml,
  prefetchCatalogListThumbnails,
  prefetchDeckCardImagesFromMap,
} from "../js/cards.js";

class TestImage extends EventTarget {
  constructor() {
    super();
    this.attrs = new Map();
    this.dataset = {};
    this.style = {};
    this.writes = [];
    this.classes = new Set();
    this.classList = { add: (name) => this.classes.add(name) };
  }
  get className() { return [...this.classes].join(" "); }
  set className(value) { this.classes = new Set(value.split(" ")); }
  get src() { return this.attrs.get("src") || ""; }
  set src(value) { this.attrs.set("src", value); this.writes.push(value); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  getAttribute(key) { return this.attrs.get(key) ?? null; }
  removeAttribute(key) { this.attrs.delete(key); }
}

const face = "https://llofficial-cardgame.com/wordpress/wp-content/images/cardlist/BP05/PL!-bp5-011-N.png";
const primary = catalogListThumbnailUrl(face);
assert.match(decodeURIComponent(primary), /cdn\.jsdelivr\.net/);

// Execute the actual HTML error handler: each fallback must be visited at most once.
for (const opts of [{}, { hi: true }]) {
  const html = catalogThumbImgHtml(face, "thumb", opts);
  const img = new TestImage();
  const decode = (s) => s.replaceAll("&amp;", "&").replaceAll("&lt;", "<");
  img.src = decode(html.match(/ src="([^"]+)"/)[1]);
  for (const [key, field] of [["std-src", "stdSrc"], ["mirror-src", "mirrorSrc"], ["full-src", "fullSrc"]]) {
    img.dataset[field] = decode(html.match(new RegExp(`data-${key}="([^"]*)"`))[1]);
  }
  img.onerror = new Function(decode(html.match(/onerror="([^"]+)"/)[1]));
  for (let i = 0; i < 10 && img.onerror; i++) img.onerror.call(img);
  assert.equal(img.onerror, null);
  assert.equal(img.src, face);
  assert.equal(new Set(img.writes).size, img.writes.length);
  assert.ok(img.writes.length <= 4);
}

const reused = new TestImage();
applyCatalogThumbToImg(reused, face);
while (reused.onerror) reused.onerror();
assert.equal(reused.src, face);
const previousWrites = reused.writes.length;
applyCatalogThumbToImg(reused, face);
assert.equal(reused.writes.length, previousWrites, "rerender must preserve successful fallback or exhausted retries");
applyCatalogThumbToImg(reused, face, { playLightweight: true });
assert.equal(reused.writes.length, previousWrites + 1, "quality changes must update the source");

// Exercise the real simulator artwork branch, including its listener replacement.
const sim = fs.readFileSync(new URL("../js/simulator.js", import.meta.url), "utf8");
const start = sim.indexOf('    if (c.img) {', sim.indexOf('  function cardEl(c, opts)'));
const end = sim.indexOf('      var artWrap =', start);
const buildArt = new Function("c", "opts", "document", "applyCatalogThumbToImg", "playZoneFaceThumbOpts", "CARD_BACK_DRAG_DATA_URI", "T_MEMBER", "lastDragEndAt", "openCardCatalogDetail", "openCardZoomFromImg", sim.slice(start, end) + '\nreturn img; }');
const doc = { createElement: () => new TestImage() };
const card = { img: face, id: "1", name: "card", type: "member" };
let rotations = 0;
const art = (opts) => buildArt(card, opts, doc, applyCatalogThumbToImg, () => ({}), "data:back", "member", 0, () => {}, () => {});
const image = art({ onRotate: () => rotations++ });
assert.equal(art({ reusableImage: image, onRotate: () => rotations += 10 }), image);
image.dispatchEvent(new Event("click"));
assert.equal(rotations, 10, "stale listeners must be removed");
assert.equal(image.writes.length, 1, "unchanged face must not reset src");
art({ reusableImage: image, deckFaceHidden: true });
assert.equal(image.src, "data:back");
art({ reusableImage: image });
assert.equal(image.src, primary);
card.lcWait = true;
art({ reusableImage: image });
assert.ok(image.classes.has("rotated"));
card.lcWait = false;
art({ reusableImage: image });
assert.ok(!image.classes.has("rotated"));

// Keep requests pending to verify concurrency, then finish all work without real network.
const pending = [];
globalThis.Image = class extends TestImage {
  set src(value) { super.src = value; pending.push(this); }
  get src() { return super.src; }
};
const faces = Array.from({ length: 8 }, (_, i) => face.replace("011", String(i).padStart(3, "0")));
prefetchCatalogListThumbnails(faces);
assert.equal(pending.length, 4);
prefetchDeckCardImagesFromMap({ a: 4 }, () => ({ img: faces[0] }));
assert.equal(pending.length, 4, "overlapping calls must be deduplicated");
let finished = 0;
while (finished < pending.length) pending[finished++].onload();
assert.equal(pending.length, 8);
assert.ok(pending.every((img) => img.fetchPriority === "low"));
assert.equal(pending[0].src, catalogListThumbnailUrl(faces[0]));
prefetchCatalogListThumbnails(faces);
assert.equal(pending.length, 8, "completed prefetches must not restart");
prefetchCatalogListThumbnails([face.replace("011", "999")]);
pending.at(-1).onerror();
prefetchCatalogListThumbnails([face.replace("011", "999")]);
assert.equal(pending.length, 10, "failed prefetches may be retried by a later call");
pending.at(-1).onload();
console.log("PASS: bounded fallbacks, matching URLs, image reuse, current click handlers, face/rotation changes, prefetch concurrency and deduplication");
