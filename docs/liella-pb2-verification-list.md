# Liella! プレミアムブースター2（pb2）効果検証リスト

`PL!SP-pb2-*`（プレミアムブースター Liella! vol.2 / DUO）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-pb2.mjs`
- 全文監査: `node scripts/audit-liella-pb2-text.mjs`
- 実プレイ重点: `docs/play-verification-list.md` Aセクション（pb2 系）
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## 代表メンバー（000–041）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 000 | PL!SP-pb2-000-R | 千砂都＆夏美 | toujou_baton_discarded_series_per_card | バトン捨て枚数分ドロー+無BHブレード |
| [x] | 001 | PL!SP-pb2-001-R | 澁谷かのん | deck_top_pick_enter_or_hand | 登場 or 手札 |
| [x] | 002 | PL!SP-pb2-002-R | 唐可可 | ability_sequence | 起動複合 |
| [x] | 003 | PL!SP-pb2-003-R | 嵐千砂都 | live_success_liella_effect_moved_score | Liella!効果移動で合計スコア+1 |
| [x] | 004 | PL!SP-pb2-004-R | 平安名すみれ | draw_from_deck | 強化ライブ or エール公開ライブで1枚引き |
| [x] | 005 | PL!SP-pb2-005-R | 葉月恋 | toujou_baton_discarded_under | バトン捨て→下に置く+常時起動ミラー |
| [x] | 006 | PL!SP-pb2-006-R | 桜小路きな子 | jidou_live_success_or_area_move_wait_under | 下Liella!コスト+1/成功or移動で下配置 |
| [x] | 007 | PL!SP-pb2-007-R | 米女メイ | live_success_optional_energy_recover_waiting | 任意E3→控え室からLiella!ライブ回収 |
| [x] | 008 | PL!SP-pb2-008-R | 若菜四季 | live_success_yell_nobh_series_score_capped | 無BH Liella!2枚ごと+1（上限2） |
| [x] | 009 | PL!SP-pb2-009-R | 鬼塚夏美 | optional_pick_member_wait_opp_blade_gap | **元々持つブレード**比較（登場/開始） |
| [x] | 010 | PL!SP-pb2-010-R | ウィーン | live_start_mandatory_energy_deck_unless_hand_discard / live_success_pick_options | E or 手札捨て |
| [x] | 011 | PL!SP-pb2-011-R | 鬼塚冬毬 | jidou_center_member_move_choice / live_start_position_change | センター移動時3択 |
| [x] | 012 | PL!SP-pb2-012-R | 澁谷かのん | kidou_stage_wait_pick_hand | 起動ウェイト→控え室ライブ回収 |
| [x] | 013 | PL!SP-pb2-013-R | 唐可可 | ability_sequence | KALEIDOSCORE捨て→E+条件ドロー |
| [x] | 014 | PL!SP-pb2-014-R | 嵐千砂都 | toujou_optional_all_members_relocate | 5yncri5e!のみで任意FC |
| [x] | 015 | PL!SP-pb2-015-R | 平安名すみれ | toujou_wait_pick_hand | 任意手札→控え室CatChu!回収 |
| [x] | 016 | PL!SP-pb2-016-R | 葉月恋 | kidou_stage_wait_pick_hand | 012同型 |
| [x] | 017 | PL!SP-pb2-017-R | 桜小路きな子 | deck_top_pick_recover | 山5見てLiella!メンバー回収 |
| [x] | 018 | PL!SP-pb2-018-R | 米女メイ | activate_energy | CatChu!人数分E復帰 |
| [x] | 019 | PL!SP-pb2-019-R | 若菜四季 | toujou_wait_pick_hand | 控え室5yncri5e!回収 |
| [x] | 020 | PL!SP-pb2-020-R | 鬼塚夏美 | jidou_yell_optional_hand_live_extra_yell | エール時任意ライブ捨て→追加2枚エール |
| [x] | 021 | PL!SP-pb2-021-R | ウィーン | toujou_wait_pick_hand | 控え室KALEIDOSCORE回収 |
| [x] | 022 | PL!SP-pb2-022-R | 鬼塚冬毬 | jidou_series_member_to_center_blade_grant | 5yncri5e!センター移動→ブレード4 |
| [x] | 023 | PL!SP-pb2-023-N | 澁谷かのん | energy_tier_hearts | E6+/8+でheart02 |
| [x] | 024 | PL!SP-pb2-024-N | 唐可可 | optional_self_wait_opp_stage | 相手C2以下ウェイト |
| [x] | 025 | PL!SP-pb2-025-N | 嵐千砂都 | live_start_position_change | 登場時ポジションチェンジ |
| [x] | 026 | PL!SP-pb2-026-N | 平安名すみれ | blade_conditional | アクティブEでheart02×2 |
| [x] | 027 | PL!SP-pb2-027-N | 葉月恋 | energy_tier_hearts | E6+/8+でheart03 |
| [x] | 028 | PL!SP-pb2-028-N | 桜小路きな子 | jidou_area_move_activate_energy | 移動時E2枚復帰 |
| [x] | 029 | PL!SP-pb2-029-N | 米女メイ | optional_self_wait_opp_stage / live_start_opp_wait_max_cost | 登場/開始で相手C2ウェイト |
| [x] | 030 | PL!SP-pb2-030-N | 若菜四季 | heart_color_pick_grant | ハート色1つ選択 |
| [x] | 031 | PL!SP-pb2-031-N | 鬼塚夏美 | kidou_stage_wait_pick_hand | 控え室メンバー回収 |
| [x] | 032 | PL!SP-pb2-032-N | ウィーン | energy_tier_hearts | E6+/8+でheart06 |
| [x] | 033 | PL!SP-pb2-033-N | 鬼塚冬毬 | kidou_stage_wait_pick_hand | 031同型 |
| [x] | 035 | PL!SP-pb2-035-N | 唐可可 | blade_conditional | 左サイドブレード2 |
| [x] | 036 | PL!SP-pb2-036-N | 嵐千砂都 | draw_then_hand_discard | 右サイド2引2捨 |
| [x] | 037 | PL!SP-pb2-037-N | 平安名すみれ | draw_then_hand_discard | 左サイド2引2捨 |
| [x] | 040 | PL!SP-pb2-040-N | 米女メイ | optional_energy_blade_until_live_end | 任意E1→ブレード2 |
| [x] | 041 | PL!SP-pb2-041-N | 若菜四季 | blade_conditional | 右サイドブレード2 |

## ライブ（045–050）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 045 | PL!SP-pb2-045-L | 絶対的LOVER | live_card_score_plus_per_unit | Liella!・ハート4以上1人につきスコア+1 |
| [x] | 046 | PL!SP-pb2-046-L | Butterfly Wing | block_stage_member_live_start / live_success_score_if_stage_live_start_member | 常時LS封じ・LS能力持ちメンバーでスコア+1（FAQ Q260） |
| [x] | 047 | PL!SP-pb2-047-L | Welcome to 僕らのセカイ | live_start_opp_wait_max_cost | 任意手札1枚→Liella!のみ→相手C2以下ウェイト |
| [x] | 048 | PL!SP-pb2-048-L | ディストーション | live_start_distinct_series_need_heart_shift_score | CatChu!人数→heart0-2/heart02+1・9以上で+1 |
| [x] | 049 | PL!SP-pb2-049-L | ニュートラル | ability_sequence | KALEIDOSCORE5+→Eウェイト／E11+→スコア+1（FAQ Q261） |
| [x] | 050 | PL!SP-pb2-050-L | Jellyfish | live_start_optional_formation_change | 5yncri5e!2人以上で任意FC |

## 既知修正（2026-06 以前）

- **pb2-004**: LS 条件付きドロー `drawOrPreconditions`（強化ライブ or エール公開ライブ）
- **pb2-007**: E支払い二重課金防止（`TEMPLATE_HANDLES_OWN_COST`）
- **pb2-009**: `oppBladeGapMin` + ブレード比較（ハート比較への誤分類を修正）

## 2026-06-30 メンバー専用 2回監修（000–041）

| ID | 内容 |
|----|------|
| PL!SP-pb2-004-R | **修正**: LS 条件付きドローが無条件化していた → `drawOrPreconditions`（強化ライブ or エール公開ライブ） |
| PL!SP-pb2-007-R | 任意E3回収・`TEMPLATE_HANDLES_OWN_COST` 二重課金防止を再確認 |
| PL!SP-pb2-009-R | 元々ブレード比較 `oppBladeGapMin` 再確認 |
| （他メンバー） | 分類・ハンドラ再確認。guided_manual=0 |
| verify 拡張 | メンバー代表22ケース追加（計37ケース） |

## 2026-06-30 ライブ専用 2回監修（045–050）

| ID | 内容 |
|----|------|
| PL!SP-pb2-045-L | `series_stage_members_min_hearts`（Liella!・ハート4+）再確認 |
| PL!SP-pb2-046-L | 常時 `block_stage_member_live_start` + LS `memberHasLiveStartAbility`（FAQ Q260: 封じLS≠解決済み） |
| PL!SP-pb2-047-L | 任意手札コスト→`requiresStageOnlySeries`→相手C2ウェイト。コード修正なし |
| PL!SP-pb2-048-L | 必要ハートシフト後 `mergedCatalogCard` で9+判定。heart02+1/heart0-2 再確認 |
| PL!SP-pb2-049-L | 複数 LS→`ability_sequence`。FAQ Q261 任意順は**カード文順固定**（UI未実装・既知） |
| PL!SP-pb2-050-L | 5yncri5e!2+ 任意フォーメーションチェンジ再確認 |
| verify 拡張 | ライブ6枚＋046 jouji（計16ケース） |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 分類・ハンドラ・audit 再確認。新規コード修正なし |
| PL!SP-pb2-049-L | 複数 LS セグメント → `ability_sequence`（任意順解決 FAQ Q261） |
| PL!SP-pb2-009-R | 元々ブレード比較 `oppBladeGapMin` 再確認 |
| verify 拡張 | 010/048/049 ケース追加（計14ケース） |

## 2026-06-28 検証

全45枚（能力あり）の分類監査: **guided_manual=0**。新規コード修正なし。
