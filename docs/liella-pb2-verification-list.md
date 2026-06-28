# Liella! プレミアムブースター2（pb2）効果検証リスト

`PL!SP-pb2-*`（プレミアムブースター Liella! vol.2 / DUO）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-pb2.mjs`
- 全文監査: `node scripts/audit-liella-pb2-text.mjs`
- 実プレイ重点: `docs/play-verification-list.md` Aセクション（pb2 系）
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## 代表メンバー（000–022）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 000 | PL!SP-pb2-000-R | 千砂都＆夏美 | toujou_baton_discarded_series_per_card | |
| [x] | 001 | PL!SP-pb2-001-R | 澁谷かのん | deck_top_pick_enter_or_hand | 登場 or 手札 |
| [x] | 002 | PL!SP-pb2-002-R | 唐可可 | ability_sequence | 起動複合 |
| [x] | 003 | PL!SP-pb2-003-R | 嵐千砂都 | live_success_liella_effect_moved_score | 移動Liella!数分スコア+ |
| [x] | 005 | PL!SP-pb2-005-R | 葉月恋 | toujou_baton_discarded_under | バトン捨て→下に置く |
| [x] | 009 | PL!SP-pb2-009-R | 鬼塚夏美 | optional_pick_member_wait_opp_blade_gap | **元々持つブレード**比較（登場/開始） |
| [x] | 010 | PL!SP-pb2-010-R | ウィーン | live_start_mandatory_energy_deck_unless_hand_discard / live_success_pick_options | E or 手札捨て |
| [x] | 011 | PL!SP-pb2-011-R | 鬼塚冬毬 | jidou_center_member_move_choice / live_start_position_change | センター移動時3択（ブレード2/相手ウェイト/1枚引き） |
| [x] | 014 | PL!SP-pb2-014-R | 嵐千砂都 | toujou_optional_all_members_relocate | フォーメーションチェンジ |
| [x] | 018 | PL!SP-pb2-018-R | 米女メイ | activate_energy | E復帰のみ（枚数不増） |

## ライブ（045–050）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 045 | PL!SP-pb2-045-L | 絶対的LOVER | live_card_score_plus_per_unit | ユニット数比例 |
| [x] | 048 | PL!SP-pb2-048-L | ディストーション | live_start_distinct_series_need_heart_shift_score | CatChu!人数→必要ハート |
| [x] | 049 | PL!SP-pb2-049-L | ニュートラル | yell_resolution_count_energy_wait / live_card_score_plus | |
| [x] | 050 | PL!SP-pb2-050-L | Jellyfish | live_start_optional_formation_change | 任意FC |

## 既知修正（2026-06 以前）

- **pb2-009**: `oppBladeGapMin` + ブレード比較（ハート比較への誤分類を修正）
- **pb2-007**: E支払い二重課金防止（`TEMPLATE_HANDLES_OWN_COST`）

## 2026-06-28 検証

全45枚（能力あり）の分類監査: **guided_manual=0**。新規コード修正なし。
