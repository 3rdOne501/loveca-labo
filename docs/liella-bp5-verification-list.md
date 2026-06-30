# Liella! bp5 / Anniversary2026（PL!SP-bp5）効果検証リスト

`PL!SP-bp5-*`（ブースターパック Anniversary2026 / Liella!）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-bp5.mjs`
- 全文監査: `node scripts/audit-liella-bp5-text.mjs`

## メンバー（001–022）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!SP-bp5-001-P | ability_pick_one ×2 + kidou_wait_or_hand_for_energy | 登場/LS: 任意C4↓ウェイト2択 / 起動: ウェイトor手札1捨→E |
| [x] | 002 | PL!SP-bp5-002-P | draw_then_hand_discard | 起動: 1ドロー→手札1捨 |
| [x] | 003 | PL!SP-bp5-003-P | jouji + live_start_activate_liella_and_energy | 常時: Liella!手札C10↓コスト-2 / LS: Liella!アクティブ+E |
| [x] | 004 | PL!SP-bp5-004-P | jidou_move_or_energy_draw_grant | 移動orE支払い→1ドロー+常時付与 |
| [x] | 005 | PL!SP-bp5-005-P | grant_jouji_session + jidou_card_to_waiting_pick_hand | 起動: Liella!在席→ブレード2 / 自動: 手札→控え室回収 |
| [x] | 006 | PL!SP-bp5-006-P | kidou live_start_position_change | 起動ポジチェン |
| [x] | 007 | PL!SP-bp5-007-P | deck_top_pick_recover | 登場: 山札見→回収 |
| [x] | 008 | PL!SP-bp5-008-P | deck_top_pick_recover | 自ウェイト必須+任意手札1捨→山札5見→Liella! C9+メンバー回収 |
| [x] | 009 | PL!SP-bp5-009-P | live_start_mill_loop_blade_grant | 任意: 山札1枚ミル×4回まで→ライブミル時自ウェイト+ブレード1 |
| [x] | 010 | PL!SP-bp5-010-P | toujou_both_center_position_change | 登場: 両者センター入替ポジチェン |
| [x] | 011 | PL!SP-bp5-011-P | jouji (blade_conditional ×3) | 左/センター/右エリア別ハート付与 |
| [x] | 012 | PL!SP-bp5-012-N | jouji blade_if_liella_live_need_sum | Liella!ライブ必要ハート合計8+→heart03 |
| [x] | 013–017 | PL!SP-bp5-013-N 他 | deck_top_pick_recover / draw / grant_jouji 等 | Nレア追加分 |
| [x] | 018 / 019 / 022 | — | — | 能力なし |
| [x] | 020 | PL!SP-bp5-020-N | draw_from_deck ×2 | 起動/LS成功: 1ドロー |
| [x] | 021 | PL!SP-bp5-021-N | energy_deck_to_wait | 起動: エネルギーデッキ→ウェイト |

## ライブ（023–027）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 023 | PL!SP-bp5-023-L | Shooting Voice!! | live_card_score_plus | LS成功: 成功ライブ2+かつエール公開スコアライブ→スコア+2 |
| [x] | 024 | PL!SP-bp5-024-L | MIRACLE NEW STORY | live_start_moved_members_pick_heart_grant | 今ターン移動メンバー1人→ハート色選択付与 |
| [x] | 025 | PL!SP-bp5-025-L | 常夏☆サンシャイン | optional_energy_card_score_plus_per_unit | 任意E支払い4つにつきスコア+1 **2026-06-30: 分類修正** |
| [x] | 026 | PL!SP-bp5-026-L | Let's be ONE | live_card_score_plus | Liella!在席→スコア+1 |
| [x] | 027 | PL!SP-bp5-027-L | HOT PASSION!! | live_success_optional_energy_wait_opp_draw | 任意E1→相手ウェイト+1ドロー |

## 2026-06-30 初回監修

| ID | 内容 |
|----|------|
| PL!SP-bp5-025-L | `live_card_score_plus` 誤分類→`optional_energy_card_score_plus_per_unit`（E4枚につきカードスコア+1） |
| （横展開） | verify カバレッジ拡充（006/007/013–017/111/222 他） |

## 2026-06-30 再監修（2回目）

| ID | 内容 |
|----|------|
| PL!SP-bp5-009-P | ミル後自ウェイトでもループ継続（FAQ Q222） |
| PL!SP-bp5-023-L | エール公開スコアライブ前提（`icon_score` wiki 対応） |
