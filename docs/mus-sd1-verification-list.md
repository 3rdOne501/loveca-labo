# µ's スタートデッキ sd1（PL!-sd1）効果検証リスト

`PL!-sd1-*`（スタートデッキ ラブライブ！ / µ's）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-mus-sd1.mjs`
- 全文監査: `node scripts/audit-mus-sd1-text.mjs`
- エネルギー 023–031 は能力なしのため対象外

## メンバー（001–018）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!-sd1-001-SD | 高坂穂乃果 | toujou_wait_pick_hand / jouji | 登場: SL2枚+→控え室ライブ回収 / 常時: 自SL枚数分ブレード **2026-06-28修正** |
| [x] | 002 | PL!-sd1-002-SD | 絢瀬絵里 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室メンバー |
| [x] | 003 | PL!-sd1-003-SD | 南ことり | toujou_wait_pick_hand / heart_color_pick_grant | 登場: µ's C4以下メンバー回収 / LS: 任意1捨→heart選択 |
| [x] | 004 | PL!-sd1-004-SD | 園田海未 | deck_top_pick_recover | 登場: 5枚見てµ'sライブ任意回収 |
| [x] | 005 | PL!-sd1-005-SD | 星空凛 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室ライブ |
| [x] | 006 | PL!-sd1-006-SD | 西木野真姫 | toujou_success_live_hand_reveal_swap | 登場: 任意手札ライブ公開→SL1枚手札、公開分をSLへ **2026-06-28修正** |
| [x] | 007 | PL!-sd1-007-SD | 東條希 | deck_mill_conditional_draw | 登場: 山札上5枚ミル→ライブがあれば1ドロー **2026-06-28修正** |
| [x] | 008 | PL!-sd1-008-SD | 小泉花陽 | deck_top_to_waiting | 起動 E2: 山札上10枚ミル |
| [x] | 009 | PL!-sd1-009-SD | 矢澤にこ | grant_jouji_session | LS: 控え室µ's25枚+→合計スコア+1 |
| [x] | 010 | PL!-sd1-010-SD | 高坂穂乃果 | （能力なし） | |
| [x] | 011 | PL!-sd1-011-SD | 絢瀬絵里 | deck_top_pick_recover | 登場: 任意1捨→3枚見て1枚 |
| [x] | 012 | PL!-sd1-012-SD | 南ことり | deck_top_pick_recover | 011と同型 |
| [x] | 013 | PL!-sd1-013-SD | 園田海未 | （能力なし） | |
| [x] | 014 | PL!-sd1-014-SD | 星空凛 | （能力なし） | |
| [x] | 015 | PL!-sd1-015-SD | 西木野真姫 | deck_top_pick_recover | 登場: 任意1捨→5枚見てメンバー任意 |
| [x] | 016 | PL!-sd1-016-SD | 東條希 | deck_top_pick_recover | 011と同型 |
| [x] | 017 | PL!-sd1-017-SD | 小泉花陽 | （能力なし） | |
| [x] | 018 | PL!-sd1-018-SD | 矢澤にこ | （能力なし） | |

## ライブ（019–022）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!-sd1-019-SD | START:DASH!! | deck_top_look_reorder | 成功: 山札上3枚見て並べ替え |
| [x] | 020 | PL!-sd1-020-SD | きっと青春が聞こえる | （能力なし） | |
| [x] | 021 | PL!-sd1-021-SD | これからのSomeday | （能力なし） | |
| [x] | 022 | PL!-sd1-022-SD | 僕らは今のなかで | live_start_need_heart_reduce_per_success_live | LS: 自SL枚数分必要ハート減少 |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!-sd1-001-SD | 高坂穂乃果 | 登場: SL条件+控え室回収が `toujou_success_live_pick_hand` に誤分類 → `toujou_wait_pick_hand` |
| PL!-sd1-006-SD | 西木野真姫 | 手札ライブ公開↔成功ライブ入替が未実装 → `toujou_success_live_hand_reveal_swap` 新設 |
| PL!-sd1-007-SD | 東條希 | 5枚ミル+条件ドローが無条件 `draw_from_deck` → `deck_mill_conditional_draw` 新設 |

### 問題なし

002, 003, 004, 005, 008, 009, 011–012, 015–016, 019, 022 および能力なし 010, 013–014, 017–018, 020–021

## 2026-06-30 2回監修（μ's sd1 収録カード群）

**対象**: メンバー 001–018（能力付き 13 枚 + 能力なし 5 枚）、ライブ 019–022（能力付き 2 枚 + 能力なし 2 枚）。エネルギー 023–031 は対象外。

- verify 23 / audit 通過
- 全能力セグメント分類 OK（001 初回修正済み含む再確認）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!-sd1-006-SD | 西木野真姫 | 任意登場・成功ライブ0枚時 `abortResolved` → スキップ toast（手札ライブなし時と同型） |

### 再確認のみ（問題なし）

001, 002–005, 007–009, 011–012, 015–016, 019, 022 および能力なし 010, 013–014, 017–018, 020–021
