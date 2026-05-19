#!/usr/bin/env python3
from pathlib import Path

TAG_OPEN = "<" + "div"
TAG_CLOSE = "</" + "div>"

def line(s):
    return s.replace("OPEN", TAG_OPEN).replace("CLOSE", TAG_CLOSE)

parts = [
    '      OPEN id="versus-opponent-board-wrap" class="versus-opponent-board" hidden aria-label="相手の公開盤面">',
    '        <p id="versus-opp-board-meta" class="versus-opp-board-meta muted"></p>',
    '        OPEN class="versus-opponent-board__flip">',
    '          OPEN class="versus-opponent-board__surface">',
    '            <aside class="versus-opponent-board__side col">',
    '              <section class="zone-block">',
    '                <h3 class="versus-opp-zone-heading">成功ライブ <span id="versus-opp-sl-count" class="badge">0</span></h3>',
    '                OPEN id="versus-opp-zone-sl" class="card-strip zone-drop success-live-strip">CLOSE',
    '              </section>',
    '              <section class="zone-block">',
    '                <h3 class="versus-opp-zone-heading">解決 <span id="versus-opp-resolution-count" class="badge">0</span></h3>',
    '                OPEN id="versus-opp-zone-resolution" class="card-strip zone-drop resolution-zone-strip">CLOSE',
    '              </section>',
    '              <section class="zone-block">',
    '                <h3 class="versus-opp-zone-heading">控え室 <span id="versus-opp-waiting-count" class="badge">0</span></h3>',
    '                OPEN id="versus-opp-zone-waiting" class="card-strip zone-drop waiting-zone-strip">CLOSE',
    '              </section>',
    '              <section class="zone-block deck-block">',
    '                <h3 class="versus-opp-zone-heading">デッキ <span id="versus-opp-deck-count" class="badge">0</span></h3>',
    '                OPEN id="versus-opp-deck-pile" class="deck-pile versus-opp-deck-pile" aria-hidden="true">CLOSE',
    '              </section>',
    '            </aside>',
    '            OPEN class="versus-opponent-board__center col col-center">',
    '              <details class="zone-block energy-fold versus-opp-energy-fold" open>',
    '                <summary class="energy-fold__summary">',
    '                  <h3 class="energy-fold__title versus-opp-zone-heading">',
    '                    エネルギー',
    '                    <span class="energy-fold__counts">',
    '                      <span class="energy-fold__count-pair">',
    '                        <span class="energy-fold__count-label">A</span>',
    '                        <span id="versus-opp-energy-active-count" class="badge">0</span>',
    '                      </span>',
    '                      <span class="energy-fold__count-sep" aria-hidden="true">／</span>',
    '                      <span class="energy-fold__count-pair">',
    '                        <span class="energy-fold__count-label">W</span>',
    '                        <span id="versus-opp-energy-wait-count" class="badge badge--wait">0</span>',
    '                      </span>',
    '                    </span>',
    '                  </h3>',
    '                </summary>',
    '                OPEN id="versus-opp-zone-energy" class="card-strip zone-drop energy-zone">CLOSE',
    '              </details>',
    '              OPEN class="stage-title-bar mt">',
    '                <h3 class="stage-title-bar__h">ステージ</h3>',
    '              CLOSE',
    '              OPEN class="three-cols">',
    '                OPEN class="slot-wrap">',
    '                  <span class="slot-label">左</span>',
    '                  OPEN id="versus-opp-stage-left" class="card-strip zone-drop stage-slot">CLOSE',
    '                CLOSE',
    '                OPEN class="slot-wrap">',
    '                  <span class="slot-label">中央</span>',
    '                  OPEN id="versus-opp-stage-center" class="card-strip zone-drop stage-slot">CLOSE',
    '                CLOSE',
    '                OPEN class="slot-wrap">',
    '                  <span class="slot-label">右</span>',
    '                  OPEN id="versus-opp-stage-right" class="card-strip zone-drop stage-slot">CLOSE',
    '                CLOSE',
    '              CLOSE',
    '              OPEN class="three-cols versus-opp-live-row">',
    '                OPEN class="slot-wrap">',
    '                  <span class="slot-label">左</span>',
    '                  OPEN id="versus-opp-live-left" class="card-strip zone-drop live-slot">CLOSE',
    '                CLOSE',
    '                OPEN class="slot-wrap slot-wrap--live-center">',
    '                  <span class="slot-label">中央</span>',
    '                  OPEN id="versus-opp-live-center" class="card-strip zone-drop live-slot">CLOSE',
    '                CLOSE',
    '                OPEN class="slot-wrap">',
    '                  <span class="slot-label">右</span>',
    '                  OPEN id="versus-opp-live-right" class="card-strip zone-drop live-slot">CLOSE',
    '                CLOSE',
    '              CLOSE',
    '              <section class="zone-block versus-opp-hand-secret">',
    '                <h3 class="versus-opp-zone-heading">',
    '                  手札',
    '                  <span class="muted versus-opp-hand-secret-label">（非公開）</span>',
    '                  <span id="versus-opp-hand-count" class="badge">0</span>',
    '                </h3>',
    '                OPEN id="versus-opp-zone-hand" class="card-strip zone-drop hand-zone versus-opp-hand-zone">CLOSE',
    '                <p class="hint zone-inline-help versus-opp-hand-hint muted">枚数のみ表示。中身は見えません。</p>',
    '              </section>',
    '            CLOSE',
    '          CLOSE',
    '        CLOSE',
    '      CLOSE',
]
block = "\n".join(line(p) for p in parts)

idx_path = Path(__file__).resolve().parents[1] / "index.html"
idx = idx_path.read_text(encoding="utf-8")
start = idx.find('id="versus-opponent-board-wrap"')
if start < 0:
    raise SystemExit("versus-opponent-board-wrap not found")
start = idx.rfind("<", 0, start)
end = idx.find('      <div class="game-board">', start)
idx = idx[:start] + block + "\n\n" + idx[end:]
idx_path.write_text(idx, encoding="utf-8")
print("ok")
