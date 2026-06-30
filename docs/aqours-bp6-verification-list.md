# Aqours bp6 / RoyalHoliday（PL!S-bp6）効果検証リスト

`PL!S-bp6-*`（ブースターパック RoyalHoliday / Aqours）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-bp6.mjs`
- 全文監査: `node scripts/audit-aqours-bp6-text.mjs`
- エネルギー（E01–E20）は対象外

## メンバー（001–018）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!S-bp6-001-P/R | optional_self_wait_opp_stage | 控え室登場→相手左右サイドC13+ウェイト **2026-06-28(2): minCost/エリア/控え室条件** |
| [x] | 002 | PL!S-bp6-002-P | jidou + grant_jouji_session | 自動: Aqoursライブ山札上下 / LS: ライブ枠のみ+必要ハート12→ALL2 |
| [x] | 003 | PL!S-bp6-003-P/R | kidou_self_wait_stage_member_swap_recover | 手札1捨→他Aqours退場→控え室から同コスト登場 |
| [x] | 004 | PL!S-bp6-004-P | live_start_live_frame_pick_deck_top | 任意: 能力なしAqoursライブ→山札上 **2026-06-28: 文中{{live_start}}フィルタの分割誤り修正** |
| [x] | 005 | PL!S-bp6-005-P/R | deck_top_pick_recover | 山札2見→heart02/04/05全持ちメンバー1枚回収 |
| [x] | 006 | PL!S-bp6-006-P/R | toujou_draw_grant_if_from_waiting | 2ドロー→控え室登場時のみブレード3 **2026-06-28: sequence誤分割修正** |
| [x] | 007 | PL!S-bp6-007-P/R | live_start_pay_or_discard_conditional_grant_members | 自SL0 & 相手SL2+→常時付与 |
| [x] | 008 | PL!S-bp6-008-P/R | kidou_self_to_wait_recover | 退場→控え室C17以下Aqours同エリア登場 |
| [x] | 009 | PL!S-bp6-009-P | jouji + yell_reveal_series_live_score_plus | 相手SL差ブレード / エールAqoursスコアライブ→合計+1 |
| [x] | 010–018 | PL!S-bp6-010-N 他 | 各種 | 010 LS heart02合計4 / **011** `toujou_draw_discard_if_from_waiting` / 013 ブレード2 / 015 相手C2以下ウェイト |

## ライブ（019–024）

| 状態 | 番号 | ID | 主テンプレート | 備考 |
|------|------|-----|----------------|------|
| [x] | 019 | PL!S-bp6-019-L | draw_then_hand_to_deck_top | 全員Aqours→スコア+1・1ドロー・手札1枚山札上下 **2026-06-28修正** |
| [x] | 020 | PL!S-bp6-020-L | ability_pick_one | 3択（仮想LS成功/バトンheart02/自SL2+スコア+1） |
| [x] | 021 | PL!S-bp6-021-L | jidou_yell_discard_nobh_series_extra_yell | エール: Aqours無BH1枚捨て→コスト5ごと追加エール（最大4） |
| [x] | 022 | PL!S-bp6-022-L | live_card_score_plus | 相手エネルギー>自分でスコア+1 **2026-06-28: 条件チェック追加** |
| [x] | 023 | PL!S-bp6-023-L | live_card_score_plus | エール公開にライブカードありで+1 **2026-06-28(2): requiresYellRevealedOwnLiveCard** |
| [x] | 024 | PL!S-bp6-024-L | live_success_opp_lose_surplus_score | 相手余剰ハート全失→2つ以上で+1 **2026-06-28新設** |

## 2026-06-28 修正

| ID | 内容 |
|----|------|
| PL!S-bp6-006 | `ability_sequence` 誤分割 → `toujou_draw_grant_if_from_waiting`（控え室登場時のみブレード付与） |
| PL!S-bp6-019-L | `guided_manual` → `draw_then_hand_to_deck_top`（全員Aqours・山札上下選択） |
| PL!S-bp6-022-L | `live_card_score_plus` に相手エネルギー比較の実行時チェック追加 |
| PL!S-bp6-024-L | `live_card_score_plus` 誤分類 → `live_success_opp_lose_surplus_score` |

## 2026-06-28 修正（2回目・深掘り）

| ID | 内容 |
|----|------|
| PL!S-bp6-001-P | `optional_self_wait_opp_stage`: コスト13**以上**・左右サイド限定・控え室登場時のみ（`oppWaitMinCost` / `oppWaitStageAreas` / `requiresEnteredFromWaiting`） |
| PL!S-bp6-011-N | `toujou_draw_grant_if_from_waiting` 誤分類 → `toujou_draw_discard_if_from_waiting`（2ドロー+手札1捨て） |
| PL!S-bp6-023-L | `live_card_score_plus` にエール公開ライブカード条件（`requiresYellRevealedOwnLiveCard`）追加 |

## 2026-06-28 修正（2回目・ライブ深掘り）

019–024-L をカード文・分類・ハンドラで再確認。023-L は上記のとおり修正済。他5枚は整合確認（修正なし）。
