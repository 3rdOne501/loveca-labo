# 蓮ノ空 bp5 / Anniversary2026（PL!HS-bp5）効果検証リスト

`PL!HS-bp5-*`（ブースターパック Anniversary2026 / 蓮ノ空）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-bp5.mjs`
- 全文監査: `node scripts/audit-hasunosora-bp5-text.mjs`

## メンバー（001–016）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!HS-bp5-001-P | deck_mill_conditional_blade_grant + kidou_reveal_live_wait_pick_name_contains | 登場: 山札4ミル→ライブあればブレード2 / 起動E2: 手札ライブ公開→名前包含で控え室回収 **2026-06-30修正** |
| [x] | 002 | PL!HS-bp5-002-P | jouji + kidou_waiting_to_empty_stage | 異コスト3人→ブレード+heart05 / 起動: 空きエリア登場 |
| [x] | 003 | PL!HS-bp5-003-P | jidou + live_start_hand_discard_group_member_grant | 退場ポジチェン / LS任意手札1捨→同グループメンバー1人へheart01 |
| [x] | 004 | PL!HS-bp5-004-P | jouji blade_per_stage_member | C4+メンバー1人につきブレード2（スリーズブーケ除外） |
| [x] | 005 | PL!HS-bp5-005-P | live_start_dollcostra_cost_set_grant_if | DOLLCHESTRA在席+任意DOLLCHESTRA手札1捨→コスト参照→C10+でheart05付与 |
| [x] | 006 | PL!HS-bp5-006-P | live_start_hand_discard_same_group_grant | 同名2枚捨→ライブ終了時までheart01×2 |
| [x] | 007 | PL!HS-bp5-007-P | toujou_wait_pick_hand + jouji | 任意手札2捨→EdelNoteライブ回収 / EdelNote在席→ブレード2 |
| [x] | 008 | PL!HS-bp5-008-P | deck_top_pick_recover | 登場: 山札見→回収 |
| [x] | 009 / 010 / 012 / 015 | — | — | 能力なし |
| [x] | 011 | PL!HS-bp5-011-N | draw_from_deck | 登場1ドロー |
| [x] | 013 | PL!HS-bp5-013-N | live_start_deck_top_if_all_members_grant | 山札3ミル→全メンバーならブレード2 **2026-06-30** |
| [x] | 014 | PL!HS-bp5-014-N | jidou_area_move_grant_jouji | 移動時常時付与 |
| [x] | 016 | PL!HS-bp5-016-N | optional_self_wait_opp_stage + jouji | 任意C4↓+手札1捨→相手ウェイト / 相手ウェイト2+→heart06 |

## ライブ（017–022）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 017 | PL!HS-bp5-017-L | Dream Believers | live_card_score_plus | LS: 条件スコア+1 |
| [x] | 018 | PL!HS-bp5-018-L | AURORA FLOWER | extra_series_tags_all_zones + live_card_score_plus | 常時: 追加シリーズタグ / LSスコア+1 |
| [x] | 019 | PL!HS-bp5-019-L | ハナムスビ | live_start_need_heart_reduce_per_unit | 他シリーズライブ1枚につきheart04-2 |
| [x] | 020 | PL!HS-bp5-020-L | バアドケージ | live_card_score_plus | LS: スコア+1 |
| [x] | 021 | PL!HS-bp5-021-L | ジョーショーキリュー | live_start_pick_stage_member_printed_hearts_remap + live_card_score_plus | メンバー選択→印刷ハート→heart01 / みらくら3人→スコア+1 |
| [x] | 022 | PL!HS-bp5-022-L | Retrofuture | ability_pick_one | 任意E2: EdelNote C9+メンバー2択 |

## 2026-06-30 初回監修

| ID | 内容 |
|----|------|
| PL!HS-bp5-013-N | 山札3ミル→全メンバー時ブレード: `live_start_deck_top_if_all_members_grant` 新設 |
| （横展開） | verify カバレッジ拡充、`audit-common-patterns` 2パターン追加 |

## 2026-06-30 再監修（2回目）

| ID | 内容 |
|----|------|
| PL!HS-bp5-005-P | DOLLCHESTRA 手札捨て二重UI解消 |
| PL!HS-bp5-022-L | Retrofuture 2択ハンドラ＋EdelNote C9+前提 |

## 2026-06-30 メンバー2回監修

| ID | 内容 |
|----|------|
| PL!HS-bp5-001-P | 登場: 山札4ミル→ライブ含有時のみブレード2（`deck_mill_conditional_blade_grant`） |
| PL!HS-bp5-003-P | LS: 捨て札と同グループのメンバー1人へheart01（`live_start_hand_discard_group_member_grant`） |

## 2026-06-30 メンバー3回監修

| ID | 内容 |
|----|------|
| PL!HS-bp5-001-P | 起動「手札ライブ公開→名前包含で控え室回収」が `kidou_wait_pick_hand` 誤分類（公開・名前条件なし）→`kidou_reveal_live_wait_pick_name_contains`（FAQ Q236/Q237） |
| PL!HS-bp5-013-N | 山札3ミル全メンバー判定が `inst.type` 直参照→`mergedCatalogCard` 経由 |
