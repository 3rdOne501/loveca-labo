# µ's 4弾 / SAPPHIREMOON（bp4）効果検証リスト

`PL!-bp4-*`（ブースターパック **SAPPHIREMOON**）µ's カードの検証記録。

- 自動回帰: `node scripts/verify-mus-bp4.mjs`
- 全文監査: `node scripts/audit-mus-bp4-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–018）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!-bp4-001-P | 高坂穂乃果 | live_start `draw_from_deck` | 自ステージコスト合計<相手 → 1ドロー |
| [x] | 002 | PL!-bp4-002-P | 絢瀬絵里 | jouji heart06×2 + kidou recover | 常時: LS/LS成功能力なしライブがいる間 heart06×2 **2026-06-28: 条件配線** / 起動: 手札2捨→µ'sライブ回収（SL合計6+） **pickType修正** |
| [x] | 003 | PL!-bp4-003-P | 南ことり | kidou `kidou_stage_wait_pick_hand` | 自ウェイト→控え室からライブ1枚回収 |
| [x] | 004 | PL!-bp4-004-P | 園田海未 | toujyou `activate_energy` | SL合計6+→エネルギー2枚アクティブ |
| [x] | 005 | PL!-bp4-005-P | 星空凛 | toujyou recover + jouji center +1 + LS position change | LS: µ's 5+ブレードがいない→ポジチェン（センター除外） **2026-06-28: forbidStageMemberMinBlade** |
| [x] | 006 | PL!-bp4-006-P | 西木野真姫 | toujyou `deck_top_pick_recover` | SL合計3+→5枚見てµ'sメンバー任意回収 |
| [x] | 007 | PL!-bp4-007-P | 東條希 | toujyou `toujou_success_live_low_score_grant` | SL1枚以上かつ合計≤1→ライブ終了まで合計スコア+1付与 |
| [x] | 008 | PL!-bp4-008-P | 小泉花陽 | jouji `stage_cost_plus` | SL合計6+→自コスト+3 |
| [x] | 009 | PL!-bp4-009-P | 矢澤にこ | toujyou `toujou_opp_active_wait` | 相手アクティブ1人ウェイト |
| [x] | 010 | PL!-bp4-010-N | 高坂穂乃果 | LS `optional_energy_blade_until_live_end` | E任意→ブレード×2（ライブ終了まで） |
| [x] | 011 | PL!-bp4-011-N | 絢瀬絵里 | LS `grant_jouji_session` | 自ウェイト任意→センターµ's全員にブレード×2 **2026-06-28: grantToCenterSeriesTag** |
| [x] | 012 | PL!-bp4-012-N | 南ことり | （能力なし） | |
| [x] | 013 | PL!-bp4-013-N | 園田海未 | LS `grant_jouji_session` | 手札1捨任意→他ステージメンバー1人にheart01 **2026-06-28: grantExcludeSelf** |
| [x] | 014 | PL!-bp4-014-N | 星空凛 | LS `grant_jouji_session` | LS/LS成功能力なしライブあり→他メンバー1人にブレード×2 **2026-06-28: 条件+付与先修正** |
| [x] | 015 | PL!-bp4-015-N | 西木野真姫 | （能力なし） | |
| [x] | 016 | PL!-bp4-016-N | 東條希 | toujyou `draw_from_deck` | SL合計3+→1ドロー |
| [x] | 017 | PL!-bp4-017-N | 小泉花陽 | LS `grant_jouji_session` | 自ウェイト任意→センターµ's全員にブレード×1 |
| [x] | 018 | PL!-bp4-018-N | 矢澤にこ | jouji blade×2 | 自SL合計スコア>相手の間 **2026-06-28: ownSuccessScoreBeatsOpponent** |

## ライブ（019–026）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!-bp4-019-L | Angelic Angel | jouji `success_live_self_score_if_series_on_stage` | 成功ライブ置き場の自カードスコア+5（µ's 在席時） **2026-06-28: 合計スコア計算に反映** |
| [x] | 020 | PL!-bp4-020-L | Love wing bell | live_start_position_change + jouji blade | LS: ステージがµ'sのみ→ポジチェン任意 / 常時: 成功ライブ置き場にある間センターµ'sにブレード **2026-06-28: 成功ライブ常時ブレード配線** |
| [x] | 021 | PL!-bp4-021-L | ?←HEARTBEAT | live_start_success_score_tiered_reduce_score | 成功ライブ合計6+→heart0減 / 9+→さらにスコア+1 |
| [x] | 022 | PL!-bp4-022-L | No brand girls | live_card_score_plus | センターµ's 9+ブレードでスコア+2 **2026-06-28: 条件フィルタ追加** |
| [x] | 023 | PL!-bp4-023-L | もぎゅっと"love"で接近中！ | live_success_surplus_heart_slot_draw | 余剰heart01×1+で1ドロー **2026-06-28: 無条件ドローから修正** |
| [x] | 024 | PL!-bp4-024-L | 小夜啼鳥恋詩 | grant_jouji_session | LS: µ's 1人にブレード×1（ライブ終了まで） |
| [x] | 025 | PL!-bp4-025-L | 微熱からMystery | （能力なし） | |
| [x] | 026 | PL!-bp4-026-L | ダイヤモンドプリンセスの憂鬱 | （能力なし） | |

## 検証結果（2026-06-28・ライブ 019–026）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!-bp4-019-L | Angelic Angel | 成功ライブ置き場の自カードスコア+5を合計スコア計算に反映（`computeSuccessLiveJoujiScoreBonus`） |
| PL!-bp4-020-L | Love wing bell | 成功ライブ常時: センターµ'sへブレード付与を `computeSuccessLiveJoujiMemberBladeBonus` で配線 |
| PL!-bp4-022-L | No brand girls | センター9+ブレード条件なしで+2していた問題を修正（`minStageAreaMemberBlade` + `stageArea: center`） |
| PL!-bp4-023-L | もぎゅっと"love" | 余剰heart01条件なしの無条件ドローから `live_success_surplus_heart_slot_draw` に修正。機械判定可能時は自動チェック |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!-bp4-021-L | ?←HEARTBEAT | 成功ライブ合計6+/9+で必要heart0減 / さらに+1 |
| PL!-bp4-024-L | 小夜啼鳥恋詩 | ライブ開始: µ'sメンバー1人にブレード1（ライブ終了まで） |
| PL!-bp4-025-L | 微熱からMystery | 能力なし |
| PL!-bp4-026-L | ダイヤモンドプリンセスの憂鬱 | 能力なし |

## 2026-06-28 検証（メンバー 001–018）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!-bp4-002-P | 絢瀬絵里 | 常時: LS/LS成功能力なしライブ条件 → `requiresLiveFrameNoStartSuccessAbility` / 起動: pickType ライブ（SL合計6+） |
| PL!-bp4-005-P | 星空凛 | LS: µ's 5+ブレード不在 → `forbidStageMemberMinBlade` |
| PL!-bp4-011-N | 絢瀬絵里 | LS: 自ウェイト任意→センターµ's全員ブレード×2（`grantToCenterSeriesTag`） |
| PL!-bp4-013-N | 園田海未 | LS: 手札1捨任意→他ステージメンバー1人 heart01（`grantExcludeSelf`） |
| PL!-bp4-014-N | 星空凛 | LS: LS/LS成功能力なしライブ条件＋他メンバー1人ブレード×2 |
| PL!-bp4-018-N | 矢澤にこ | 常時: 自SL合計>相手 → `ownSuccessScoreBeatsOpponent` |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!-bp4-001-P | 高坂穂乃果 | LS: 自ステージコスト合計<相手→1ドロー |
| PL!-bp4-003-P | 南ことり | 起動: 自ウェイト→控え室ライブ回収 |
| PL!-bp4-004-P | 園田海未 | 登場: SL合計6+→E2枚アク |
| PL!-bp4-006-P | 西木野真姫 | 登場: SL合計3+→5枚見てµ'sメンバー回収 |
| PL!-bp4-007-P | 東條希 | 登場: SL1枚+かつ合計≤1→ライブ終了まで合計スコア+1 |
| PL!-bp4-008-P | 小泉花陽 | 常時: SL合計6+→自コスト+3 |
| PL!-bp4-009-P | 矢澤にこ | 登場: 相手アクティブ1人ウェイト |
| PL!-bp4-010-N | 高坂穂乃果 | LS: 任意E→ブレード×2 |
| PL!-bp4-012-N | 南ことり | 能力なし |
| PL!-bp4-015-N | 西木野真姫 | 能力なし |
| PL!-bp4-016-N | 東條希 | 登場: SL合計3+→1ドロー |
| PL!-bp4-017-N | 小泉花陽 | LS: 自ウェイト任意→センターµ's全員ブレード×1 |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 全50枚・能力セグメント再確認。`guided_manual=0`・`audit-common-patterns` OK。新規コード修正なし |
| PL!-bp4-002-P | 常時 LS/LS成功能力なしライブ条件・起動 pickType ライブを再確認 |
| PL!-bp4-005-P | LS `forbidStageMemberMinBlade`（µ's 5+ブレード不在）を再確認 |
| PL!-bp4-019-L〜023-L | 2026-06-28 ライブ修正（成功ライブ常時スコア/ブレード・余剰heartドロー等）を再確認 |
| verify | 29ケース（メンバー+ライブ+jouji）すべて通過 |
