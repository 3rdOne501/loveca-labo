#!/usr/bin/env python3
"""特殊BH分類: 音符ライブ（BHなしライブ）/ ドローエール（BHあり＋ドロー特殊）"""
import json
import re
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/llocg-cards.json")
d = json.loads(path.read_text(encoding="utf-8"))


def has_bh(c):
    bh = c.get("blade_heart") or {}
    return isinstance(bh, dict) and len(bh) > 0


def is_draw_yell(ab):
    ab = ab or ""
    if "ドローエール" in ab:
        return True
    if re.search(r"icon_draw\.png|icon_draw\b", ab, re.I):
        return True
    return "エールをすべて行った後" in ab and "ドロー" in ab


note_live = []
draw_yell = []
bh_only = []

for k, v in d.items():
    if str(k).startswith("_"):
        continue
    if v.get("type") != "ライブ":
        continue
    ab = v.get("ability") or ""
    if not has_bh(v):
        note_live.append(k)
    elif is_draw_yell(ab):
        draw_yell.append(k)
    else:
        bh_only.append(k)

print("NOTE_LIVE (no blade_heart)", len(note_live))
for x in sorted(note_live):
    print(x)
print("DRAW_YELL (BH + draw)", len(draw_yell))
for x in sorted(draw_yell):
    print(x)
print("BH_ONLY (not note, not draw)", len(bh_only))
