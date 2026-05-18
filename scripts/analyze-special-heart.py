#!/usr/bin/env python3
"""特殊BH分類: スコア（BHなしライブ）/ ドロー（色BHあり・ALLなしライブ）/ その他（ALLのみ等）"""
import json
import re
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/llocg-cards.json")
d = json.loads(path.read_text(encoding="utf-8"))


def parse_slot(key):
    k = str(key).strip()
    if k == "b_all":
        return 7
    m = re.match(r"^b_heart0*(\d+)$", k, re.I)
    if not m:
        return None
    n = int(m.group(1))
    return n if 1 <= n <= 7 else None


def pos(v):
    try:
        return float(v) > 0
    except (TypeError, ValueError):
        return False


def is_draw_live(c):
    bh = c.get("blade_heart") or {}
    if not isinstance(bh, dict) or not bh:
        return False
    has_colored = False
    for k, v in bh.items():
        slot = parse_slot(k)
        if not pos(v):
            continue
        if slot == 7:
            return False
        if slot is not None and 1 <= slot <= 6:
            has_colored = True
    return has_colored


note_live = []
draw_live = []
bh_only = []

for k, v in d.items():
    if str(k).startswith("_"):
        continue
    if v.get("type") != "ライブ":
        continue
    bh = v.get("blade_heart") or {}
    if not isinstance(bh, dict) or not bh:
        note_live.append(k)
    elif is_draw_live(v):
        draw_live.append(k)
    else:
        bh_only.append(k)

print("SCORE (no blade_heart)", len(note_live))
for x in sorted(note_live):
    print(x)
print("DRAW (colored BH, no ALL)", len(draw_live))
for x in sorted(draw_live):
    print(x)
print("BH_OTHER (e.g. ALL only)", len(bh_only))
