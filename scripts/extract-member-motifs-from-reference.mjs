#!/usr/bin/env node
/**
 * 公式ポータル掲載のパーソナルモチーフ一覧（参照画像）からアイコンを切り出す。
 * 蓮ノ空は hasunosora/shared/img/member/NN_icon.png（既存 PNG）を維持。
 *
 *   node scripts/extract-member-motifs-from-reference.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { ROSTER } from "./fetch-member-character-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets/game-icons/member-icons");
const MAP_PATH = path.join(ROOT, "data/member-motif-cell-map.json");
const REF_CANDIDATES = [
  path.join(ROOT, "assets/reference/member-motif-grid.png"),
  path.join(
    process.env.HOME || "",
    ".cursor/projects/Users-kaneko-kai-projects-ll-ocg-tools/assets/F-CM7aIXAAAGbwj-739e4cb9-be0b-4a4b-9431-939bb6ab7ce5.png"
  ),
];

const PY = `import json, sys, os
from PIL import Image
import numpy as np

ref_path, out_dir, ids_json, map_json = sys.argv[1:5]
ids = json.loads(ids_json)
cell_map = json.loads(map_json)
cells = cell_map.get("cells", {})
full_crop = set(cell_map.get("fullCellCrop", []))
grid = cell_map.get("grid", {"cols": 8, "rows": 7})
cols, rows = grid["cols"], grid["rows"]

im = Image.open(ref_path).convert("RGBA")
arr = np.array(im)
h, w = arr.shape[:2]
cw, ch = w / cols, h / rows
inner = 0.5

def crop_center(r, c):
    x0, x1 = int(c * cw), int((c + 1) * cw)
    y0, y1 = int(r * ch), int((r + 1) * ch)
    iw, ih = int((x1 - x0) * inner), int((y1 - y0) * inner)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    ix0, ix1 = cx - iw // 2, cx + iw // 2
    iy0, iy1 = cy - ih // 2, cy + ih // 2
    sub = arr[iy0:iy1, ix0:ix1]
    m = (sub[..., 3] > 20) & (np.min(sub[..., :3], axis=2) < 240)
    if m.sum() < 60:
        return None
    ys, xs = np.where(m)
    pad = 8
    return im.crop(
        (
            max(0, ix0 + xs.min() - pad),
            max(0, iy0 + ys.min() - pad),
            min(w, ix0 + xs.max() + 1 + pad),
            min(h, iy0 + ys.max() + 1 + pad),
        )
    )

def crop_full(r, c):
    x0, x1 = int(c * cw), int((c + 1) * cw)
    y0, y1 = int(r * ch), int((r + 1) * ch)
    sub = arr[y0:y1, x0:x1]
    m = (sub[..., 3] > 20) & (np.min(sub[..., :3], axis=2) < 240)
    if m.sum() < 120:
        return None
    ys, xs = np.where(m)
    pad = 8
    return im.crop(
        (
            max(0, x0 + xs.min() - pad),
            max(0, y0 + ys.min() - pad),
            min(w, x0 + xs.max() + 1 + pad),
            min(h, y0 + ys.max() + 1 + pad),
        )
    )

os.makedirs(out_dir, exist_ok=True)
written = []
for member_id in ids:
    rc = cells.get(member_id)
    if not rc:
        continue
    r, c = rc
    cell = crop_full(r, c) if member_id in full_crop else crop_center(r, c)
    if cell is None:
        continue
    out = Image.new("RGBA", (200, 200), (255, 255, 255, 0))
    cell.thumbnail((180, 180), Image.Resampling.LANCZOS)
    ox = (200 - cell.width) // 2
    oy = (200 - cell.height) // 2
    out.paste(cell, (ox, oy), cell)
    out.save(os.path.join(out_dir, member_id + ".png"))
    written.append(member_id)

print(json.dumps({"extracted": len(written)}))
`;

const ref = REF_CANDIDATES.find((p) => p && fs.existsSync(p));
if (!ref) {
  console.error("Reference motif grid image not found.");
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
const hasuIds = new Set(ROSTER.filter((e) => e.series === "hasunosora").map((e) => e.id));
const ids = ROSTER.map((e) => e.id);
const nonHasuIds = ids.filter((id) => !hasuIds.has(id));

const backup = new Map();
for (const id of hasuIds) {
  const p = path.join(OUT_DIR, id + ".png");
  if (fs.existsSync(p)) backup.set(id, fs.readFileSync(p));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const result = JSON.parse(
  execFileSync(
    "python3",
    ["-c", PY, ref, OUT_DIR, JSON.stringify(nonHasuIds), JSON.stringify(map)],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  ).trim()
);

for (const [id, buf] of backup) {
  fs.writeFileSync(path.join(OUT_DIR, id + ".png"), buf);
}

console.log("extracted", result.extracted, "hasu_restored", backup.size);
