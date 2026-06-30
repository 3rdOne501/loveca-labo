# Aqours bp5 / Anniversary2026（PL!S-bp5）効果検証リスト

`PL!S-bp5-*`（ブースターパック Anniversary2026 / Aqours）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-bp5.mjs`
- 全文監査: `node scripts/audit-aqours-bp5-text.mjs`

## メンバー（001–018 / 111 / 222）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!S-bp5-001-P | draw_from_deck + jouji | 無能力メンバーからバトン登場→1ドロー / 常時: 無能力メンバー登場コスト-1 |
| [x] | 002 | PL!S-bp5-002-P | live_start_side_cost_equal_opp_wait | 左右サイドのコストが同じなら相手C↓1人ウェイト |
| [x] | 003 | PL!S-bp5-003-P | toujou_wait_pick_hand | 任意: ブレードハート無メンバー2枚まで捨→控え室Aqoursライブ回収 |
| [x] | 004 | PL!S-bp5-004-P | ability_pick_one | 他Aqours1人にブレード or SaintSnowポジションチェンジ |
| [x] | 005 | PL!S-bp5-005-P | heart_color_pick_grant | 任意手札1捨→ハート色選択→今ターン登場の非Aqours全員に付与 |
| [x] | 006 | PL!S-bp5-006-P | deck_top_pick_recover | 自ウェイト必須+任意手札1捨→山札5見→Aqours C9+メンバー回収 |
| [x] | 007 | PL!S-bp5-007-P | deck_top_pick_recover | ライブ成功: 山札4見→heart04×2以上メンバー回収 |
| [x] | 008 | PL!S-bp5-008-P | jouji (live_score_plus) | 相手余剰ハート2+→ライブ合計スコア+1 |
| [x] | 009 | PL!S-bp5-009-P | grant_jouji_session | 登場: ライブ終了時までブレード2 |
| [x] | 010 | PL!S-bp5-010-N | toujou_grant_opp_live_need_heart_if_stage_hearts | ステージheart02合計5+→相手LS時ライブ必要ハート+1 |
| [x] | 011 | PL!S-bp5-011-N | toujou_grant_opp_live_need_heart_if_stage_hearts | ステージheart05合計5+→相手LS時ライブ必要ハート+1 |
| [x] | 012 / 018 | — | — | 能力なし |
| [x] | 013 | PL!S-bp5-013-N | grant_jouji_session | ライブ開始: ライブ終了時までブレード2 |
| [x] | 014 | PL!S-bp5-014-N | draw_then_hand_to_deck_bottom | 登場: 1ドロー→手札1枚山札下 |
| [x] | 015 | PL!S-bp5-015-N | deck_top_to_waiting | 登場: 山札上10枚控え室 |
| [x] | 016 | PL!S-bp5-016-N | grant_jouji_session | 相手全員より高コストの自ステージメンバーがいればブレード2 |
| [x] | 017 | PL!S-bp5-017-N | grant_jouji_session | ライブ開始: ライブ終了時までブレード1 |
| [x] | 111 | PL!S-bp5-111-P＋ | kidou live_start_position_change + jidou | 起動ポジチェン / 自動: 相手ウェイト |
| [x] | 222 | PL!S-bp5-222-P＋ | kidou live_start_position_change + jidou | 起動ポジチェン / 自動: エネルギーアクティブ |

## ライブ（019–023）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!S-bp5-019-L | not ALONE not HITORI | yell_resolution_pick_hand | 自分か相手の成功ライブ2+→エール公開からメンバー2枚まで手札 **2026-06-28: pickType** |
| [x] | 020 | PL!S-bp5-020-L | Landing action Yeah!! | live_success_surplus_heart_score_plus | 余剰ハート3+→スコア+1（余剰ハート全喪失） |
| [x] | 021 | PL!S-bp5-021-L | 夢で夜空を照らしたい | — | 能力なし |
| [x] | 022 | PL!S-bp5-022-L | SELF CONTROL!! | live_start_moved_members_blade_grant + live_card_score_plus | 今ターン移動メンバー全員ブレード1 / LS成功スコア+1 |
| [x] | 023 | PL!S-bp5-023-L | Awaken the power | live_start_waiting_lives_reorder_deck_top | Aqours+SaintSnow C20+在席: 控え室ライブ4枚並べ替え→山札上 |

## 2026-06-30 修正

| ID | 内容 |
|----|------|
| PL!S-bp5-005-P | `heart_color_pick_grant`: 今ターン登場の非Aqours全員へハート付与（`grantToEnteredMembersThisTurn`） |
| （横展開） | `audit-common-patterns.mjs` 経由で verify/audit ライブ節追加 |

## 2026-06-28 修正（メンバー）

| ID | 内容 |
|----|------|
| PL!S-bp5-001-* | `splitAbilityByTriggers`: 「能力を持たない」で始まる登場/常時がインライン参照と誤判定されセグメント分割不能 |
| PL!S-bp5-001-* | `draw_from_deck`: `requiresBatonFromNoAbilityMember` でバトン元が能力なしメンバーか検証 |

## 2026-06-28 修正（ライブ）

| ID | 内容 |
|----|------|
| PL!S-bp5-019-* | `parseAbilityPickFilters`: 「メンバーカードをN枚まで手札に加」で `pickType=メンバー` が未設定 |
