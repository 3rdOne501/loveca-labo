# 蓮ノ空 1弾（bp1）効果検証リスト

`PL!HS-bp1-*`（Link！Like！ラブライブ！ / 蓮ノ空女学院スクールアイドルクラブ）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-bp1.mjs`
- 全文監査: `node scripts/audit-hasunosora-bp1-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–014）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!HS-bp1-001-R | 日野下花帆 | activate_energy | 蓮ノ空 on stage → E2枚アクティブ |
| [x] | 002 | PL!HS-bp1-002-R | 村野さやか | kidou_self_to_wait_recover | EE2・自ら控え室→控え室から蓮ノ空コスト15以下を同エリア登場 |
| [x] | 003 | PL!HS-bp1-003-R＋ | 乙宗梢 | kidou_wait_pick_hand | 常時付与 + 起動 |
| [x] | 004 | PL!HS-bp1-004-P | 夕霧綴理 | kidou_wait_pick_hand / optional_energy_blade_until_live_end | |
| [x] | 005 | PL!HS-bp1-005-R | 大沢瑠璃乃 | toujou_optional_hand_discard_draw | 手札1枚捨て任意→1枚引き |
| [x] | 006 | PL!HS-bp1-006-P | 藤島慈 | draw_then_hand_discard / heart_color_pick_grant | |
| [x] | 007 | PL!HS-bp1-007-R | 百生吟子 | draw_from_deck | |
| [x] | 008 | PL!HS-bp1-008-R | 徒町小鈴 | toujou_deck_top_wait_if_all_members | 全員蓮ノ空→山札上控え室 |
| [x] | 009 | PL!HS-bp1-009-R | 安養寺姫芽 | deck_top_pick_recover | みらくらぱーく！1枚回収 |
| [x] | 010 | PL!HS-bp1-010-N | 日野下花帆 | draw_then_hand_discard | |
| [x] | 011 | PL!HS-bp1-011-N | 村野さやか | deck_top_pick_recover | 5枚見て1枚 |
| [x] | 014 | PL!HS-bp1-014-N | 大沢瑠璃乃 | draw_then_hand_discard | |

## ライブ（019–023）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [ ] | 019 | PL!HS-bp1-019-L | Dream Believers | （能力なし） | |
| [ ] | 020 | PL!HS-bp1-020-L | 365 Days | （能力なし） | |
| [x] | 021 | PL!HS-bp1-021-L | Holiday∞Holiday | yell_resolution_pick_hand | エール公開から手札 |
| [x] | 022 | PL!HS-bp1-022-L | AWOKE | live_card_score_plus | エール公開蓮ノ空メンバー10枚+→スコア+1 |
| [x] | 023 | PL!HS-bp1-023-L | ド！ド！ド！ | live_score_higher_energy_wait | 相手より高い→Eウェイト |

## 横展開修正（2026-06-28）

- **AWOKE bp1-022**: 括弧内ドロー説明で `isCompoundLiveScoreEffectText` が true → `stripLiveDrawYellReminderParenthetical` + `minYellRevealedSeriesMemberCount`（エール公開シリーズメンバー枚数）
