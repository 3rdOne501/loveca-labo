# Aqours スタートデッキ sd1（PL!S-sd1）効果検証リスト

`PL!S-sd1-*`（スタートデッキ ラブライブ！サンシャイン!! / Aqours）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-sd1.mjs`
- 全文監査: `node scripts/audit-aqours-sd1-text.mjs`
- エネルギー 023–031 は能力なしのため対象外

## メンバー（001–018）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!S-sd1-001-SD | 高海千歌 | jidou_yell_grant_heart_per_live_capped | 自動: エール公開ライブ枚数分 heart02（上限3） **2026-06-28修正** |
| [x] | 002 | PL!S-sd1-002-SD | 桜内梨子 | toujou_wait_pick_hand | 登場: 任意1捨→控え室 Aqours 回収 |
| [x] | 003 | PL!S-sd1-003-SD | 松浦果南 | deck_top_pick_recover | 登場: 5枚見て Aqours ライブ任意回収 |
| [x] | 004 | PL!S-sd1-004-SD | 黒澤ダイヤ | draw_then_hand_to_deck_top | LS: 任意1ドロー→手札2枚山札上 **2026-06-28修正** |
| [x] | 005 | PL!S-sd1-005-SD | 渡辺曜 | kidou_hand_cost_wait_pick_hand | 起動: 手札2捨→控え室ライブ回収 |
| [x] | 006 | PL!S-sd1-006-SD | 津島善子 | kidou_waiting_to_empty_stage | 登場: 任意1捨→空エリアへ C2以下 Aqours ウェイト登場＋同エリア登場不可 **2026-06-28修正** |
| [x] | 007 | PL!S-sd1-007-SD | 国木田花丸 | kidou_hand_cost_wait_pick_hand | 起動: 手札2捨→控え室スコア持ち Aqours ライブ **2026-06-28修正** |
| [x] | 008 | PL!S-sd1-008-SD | 小原鞠莉 | kidou_stage_wait_pick_hand | 起動: 自ステージウェイト→控え室メンバー回収 |
| [x] | 009 | PL!S-sd1-009-SD | 黒澤ルビィ | live_start_hand_reveal_deck_place_blade | LS: 任意手札 Aqours 公開→山札上/下＋ブレード **2026-06-28修正** |
| [x] | 010 | PL!S-sd1-010-SD | 高海千歌 | （能力なし） | |
| [x] | 011 | PL!S-sd1-011-SD | 桜内梨子 | （能力なし） | |
| [x] | 012 | PL!S-sd1-012-SD | 松浦果南 | （能力なし） | |
| [x] | 013 | PL!S-sd1-013-SD | 黒澤ダイヤ | deck_top_to_waiting | 登場: 山札上5枚ミル |
| [x] | 014 | PL!S-sd1-014-SD | 渡辺曜 | draw_then_hand_discard | 成功: 1ドロー→1捨 |
| [x] | 015 | PL!S-sd1-015-SD | 津島善子 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室ライブ |
| [x] | 016 | PL!S-sd1-016-SD | 国木田花丸 | （能力なし） | |
| [x] | 017 | PL!S-sd1-017-SD | 小原鞠莉 | draw_then_hand_to_deck_bottom | 登場: 1ドロー→1枚山札下 |
| [x] | 018 | PL!S-sd1-018-SD | 黒澤ルビィ | draw_then_hand_to_deck_bottom | 017と同型 |

## ライブ（019–022）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!S-sd1-019-SD | 未来の僕らは知ってるよ | yell_resolution_pick_hand | 成功: エール公開から回収 |
| [x] | 020 | PL!S-sd1-020-SD | JIMO-AI Dash! | live_success_draw_per_series_then_discard_same | 成功: ステージ Aqours 人数分ドロー→同数捨 |
| [x] | 021 | PL!S-sd1-021-SD | 永久hours | （能力なし） | |
| [x] | 022 | PL!S-sd1-022-SD | Jump up HIGH!! | grant_jouji_session | LS: ステージ Aqours 全員ブレード **2026-06-28修正** |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!S-sd1-001-SD | 高海千歌 | エール公開ライブ枚数分 heart02（上限3）が `jidou_yell_grant_jouji` に誤分類 → `jidou_yell_grant_heart_per_live_capped` 新設 |
| PL!S-sd1-004-SD | 黒澤ダイヤ | 任意ドロー→手札2枚山札上が `draw_from_deck` → `draw_then_hand_to_deck_top`（`手札N枚を` 表記対応） |
| PL!S-sd1-007-SD | 国木田花丸 | スコア持ちライブ回収で `minScore` フィルタ欠落 → `icon_score` から `enrichPickFiltersFromSegRaw` |
| PL!S-sd1-009-SD | 黒澤ルビィ | 手札公開→山札上/下＋ブレード未実装 → `live_start_hand_reveal_deck_place_blade` 新設 |
| PL!S-sd1-022-SD | Jump up HIGH!! | ステージ Aqours 全員ブレードが自分のみ付与 → `grantToStageSeriesTag` 全員パース |
| PL!S-sd1-006-SD | 津島善子 | 空エリア登場後の同エリア登場不可が未適用 → `blockStageColumnEntryThisTurn` |

### 問題なし

002, 003, 005, 008, 010–012, 013–015, 017–018, 019–020 および能力なし 010–012, 016, 021

## 2026-06-30 2回監修（Aqours sd1 収録カード群）

**対象**: メンバー 001–018（能力付き 13 枚 + 能力なし 5 枚）、ライブ 019–022（能力付き 3 枚 + 能力なし 1 枚）。エネルギー 023–031 は対象外。

- verify 22 / audit 通過
- 全能力セグメント分類 OK（001/004/006/007/009/022 初回修正済み含む再確認）

### 修正した

なし

### 再確認のみ（問題なし）

001–009, 013–018, 019–020, 022 および能力なし 010–012, 016, 021
