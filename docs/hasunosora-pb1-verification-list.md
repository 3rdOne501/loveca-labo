# 蓮ノ空 プレミアムブースター（pb1）効果検証リスト

`PL!HS-pb1-*`（プレミアムブースター蓮ノ空女学院スクールアイドルクラブ）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-pb1.mjs`
- 全文監査: `node scripts/audit-hasunosora-pb1-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–024）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!HS-pb1-001-R | 日野下花帆 | jidou_series_enter_pay_energy / optional_energy_blade_until_live_end | スリーズブーケ登場→E支払い |
| [x] | 002 | PL!HS-pb1-002-R | 村野さやか | kidou_hand_reveal_to_under / grant_jouji_session | |
| [x] | 003 | PL!HS-pb1-003-R | 大沢瑠璃乃 | toujou_hand_discard_draw_plus / jidou_hand_to_waiting_grant | |
| [x] | 004 | PL!HS-pb1-004-R | 百生吟子 | ability_sequence | 山札3枚→控え室+控え室回収 |
| [x] | 005 | PL!HS-pb1-005-R | 徒町小鈴 | live_start_number_reveal_grant_if | 数選択→公開→手札/ブレード |
| [x] | 006 | PL!HS-pb1-006-R | 安養寺姫芽 | live_start_position_change | |
| [x] | 007 | PL!HS-pb1-007-R | セラス柳田リリエンフェルト | toujou_wait_pick_hand | |
| [x] | 008 | PL!HS-pb1-008-R | 桂城泉 | toujou_both_sides_wait_all_printed_blade | 自+相手ステージ・元々ブレード3以下を一括ウェイト |
| [x] | 009 | PL!HS-pb1-009-R | 日野下花帆 | jidou_series_enter_grant / draw_then_hand_discard | |
| [x] | 010 | PL!HS-pb1-010-R | 村野さやか | toujou_opp_wait_if_high_cost_on_stage | 相手高コスト→相手ウェイト |
| [x] | 011 | PL!HS-pb1-011-R | 大沢瑠璃乃 | deck_top_pick_recover | **横展開修正済**（3枚見て1枚回収） |
| [x] | 012 | PL!HS-pb1-012-R | 百生吟子 | toujou_both_shuffle_deck_bottom_grant_if | 両者シャッフル→山札下 |
| [x] | 013 | PL!HS-pb1-013-R | 徒町小鈴 | deck_top_look_reorder / draw_from_deck | |
| [x] | 014 | PL!HS-pb1-014-R | 安養寺姫芽 | toujou_opp_front_position_change | 相手フロントPC |
| [x] | 015 | PL!HS-pb1-015-R | セラス柳田リリエンフェルト | （常時のみ） | |
| [x] | 016 | PL!HS-pb1-016-R | 桂城泉 | toujou_grant_heart_stage_member | |
| [x] | 018 | PL!HS-pb1-018-N | 村野さやか | deck_top_pick_recover | |
| [x] | 019 | PL!HS-pb1-019-N | 大沢瑠璃乃 | kidou_stage_wait_pick_hand | |
| [x] | 020 | PL!HS-pb1-020-N | 百生吟子 | toujou_wait_pick_hand | |
| [x] | 021 | PL!HS-pb1-021-N | 徒町小鈴 | draw_from_deck | |
| [x] | 022 | PL!HS-pb1-022-N | 安養寺姫芽 | （能力なし） | |
| [x] | 024 | PL!HS-pb1-024-N | 桂城泉 | deck_top_look_reorder | |

## ライブ（025–030）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025 | PL!HS-pb1-025-L | 抱きしめる花びら | grant_jouji_session / live_success_recover_from_waiting | 手札6枚以下→控え室回収 |
| [x] | 026 | PL!HS-pb1-026-L | 雪舞う空と二秒の永遠 | live_start_need_heart_reduce_fixed | |
| [x] | 027 | PL!HS-pb1-027-L | ユメワズライ | deck_top_to_waiting | スリーズブーケ on stage→山札上4枚控え室（手札回収なし） |
| [x] | 028 | PL!HS-pb1-028-L | COMPASS | live_start_trigger_stage_member_live_start | ステージメンバーのライブ開始時発動 |
| [x] | 029 | PL!HS-pb1-029-L | 全方位キュン♡ | live_start_overflow_heart_tiered_draw_reduce | 余剰ハート段階効果 |
| [x] | 030 | PL!HS-pb1-030-L | Edelied | live_start_edelnote_blade_heart_pair | EdelNote ペア判定 |

## 既知の横展開修正（2026-06-28 以前）

- **pb1-011-R 他29件**: 「1枚手札に加え残り控え室」→ `classifyDeckTopPickToHandPatch` → `deck_top_pick_recover`（`fixed-cards-registry` §13 参照）

## 2026-06-28 検証

全28枚（能力あり）の分類監査: **guided_manual=0**。新規コード修正なし。回帰スクリプト追加のみ。
