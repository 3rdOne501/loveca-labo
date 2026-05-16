#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/llocg-cards.json")
d = json.loads(path.read_text(encoding="utf-8"))

LIVE_START = "{{live_start.png|ライブ開始時}}"
LIVE_SUCCESS = "{{live_success.png|ライブ成功時}}"


def has_bh(c):
    bh = c.get("blade_heart") or {}
    if not isinstance(bh, dict):
        return False
    for v in bh.values():
        try:
            if float(v) > 0:
                return True
        except (TypeError, ValueError):
            pass
    return False


def live_start_segment(ab):
    if LIVE_START not in ab:
        return ""
    tail = ab.split(LIVE_START, 1)[1]
    if LIVE_SUCCESS in tail:
        return tail.split(LIVE_SUCCESS, 1)[0]
    return tail[:800]


draw_cards = []
score_cards = []
ambiguous = []

for k, v in d.items():
    if str(k).startswith("_"):
        continue
    if v.get("type") != "ライブ" or not has_bh(v):
        continue
    ab = v.get("ability") or ""
    seg = live_start_segment(ab)

    has_draw = bool(
        re.search(r"icon_draw\.png|icon_draw\b", ab, re.I)
        or re.search(r"エールをすべて行った後", ab)
        or "ドローエール" in ab
    )
    has_score = bool(
        re.search(r"icon_score\.png|icon_score\b", ab, re.I)
        or (re.search(r"スコア", seg) and re.search(r"[＋+]|プラス", seg))
    )

    # Draw yell (icon_draw / post-yell draw) takes priority over score-in-live-start.
    if has_draw:
        draw_cards.append(k)
    elif has_score:
        score_cards.append(k)

print("DRAW_YELL", len(draw_cards))
for x in sorted(draw_cards):
    print(x)
print("SCORE_LIVE", len(score_cards))
for x in sorted(score_cards):
    print(x)
print("AMBIGUOUS", len(ambiguous))
for x in sorted(ambiguous):
    print(x)
