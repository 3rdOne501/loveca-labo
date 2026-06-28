# 虹ヶ咲 1弾（bp1）効果検証リスト

`PL!N-bp1-*` および `LL-bp1-*`（虹ヶ咲シリーズ）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-bp1.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## 凡例

| 状態 | 意味 |
|------|------|
| [x] | 分類・ハンドラ・静的検証 OK |
| [ ] | 要プレイ確認 or 未着手 |

## メンバー（001–012）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!N-bp1-001-R | 上原歩夢 | optional_energy_blade_until_live_end | |
| [x] | 001 | LL-bp1-001-R＋ | 歩夢&かのん&花帆 | live_start_hand_named_discard_grant_jouji | 全レア横展開済 |
| [x] | 002 | PL!N-bp1-002-R＋ | 中須かすみ | deck_top_look_reorder + kidou_wait_to_stage | |
| [x] | 003 | PL!N-bp1-003-R＋ | 桜坂しずく | toujou_wait_pick_hand + heart_color_pick_grant | |
| [x] | 004 | PL!N-bp1-004-R | 朝香果林 | activate_energy | 虹ヶ咲 on stage 条件 |
| [x] | 005 | PL!N-bp1-005-R | 宮下愛 | grant_jouji_session | 任意手札1→ブレード常時 |
| [x] | 006 | PL!N-bp1-006-R＋ | 近江彼方 | activate_energy + draw_from_deck | 2 kidou 分割 |
| [x] | 007 | PL!N-bp1-007-R | 優木せつ菜 | deck_top_pick_recover | |
| [x] | 008 | PL!N-bp1-008-R | エマ・ヴェルデ | kidou_hand_cost_wait_pick_hand | |
| [x] | 009 | PL!N-bp1-009-R | 天王寺璃奈 | ability_sequence | 山札2枚控え→控え室回収 |
| [x] | 010 | PL!N-bp1-010-R | 三船栞子 | deck_top_pick_recover | |
| [x] | 011 | PL!N-bp1-011-R | ミア・テイラー | deck_reveal_until_live | |
| [x] | 012 | PL!N-bp1-012-R＋ | 鐘嵐珠 | passive_track + kidou_wait_pick_hand | ALLハート代用 |

## ライブ（025–029）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [ ] | 025 | PL!N-bp1-025-L | 虹色Passions！ | （能力なし） | |
| [x] | 026 | PL!N-bp1-026-L | Poppin' Up! | yell_resolution_pick_hand | 相手スコア比較 |
| [x] | 027 | PL!N-bp1-027-L | Solitude Rain | live_card_score_plus_per_unit | 虹ヶ咲ステージのハート色数 |
| [x] | 028 | PL!N-bp1-028-L | Butterfly | live_card_score_plus | EE任意+虹ヶ咲 on stage |
| [x] | 029 | PL!N-bp1-029-L | Eutopia | live_card_score_plus | ライブ中3枚+2 |

## 横展開修正（2026-06-28）

括弧内 `(エールをすべて行った後…)` は special_heart ドローの説明であり、本効果ではない。  
同型6件（bp1 027–029 + 他弾ライブ）を `stripLiveDrawYellReminderParenthetical` で分類から除外。
