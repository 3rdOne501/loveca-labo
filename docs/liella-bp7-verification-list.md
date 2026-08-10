# Liella! bp7 / MELLOWMOMENT（PL!SP-bp7）効果検証リスト

`PL!SP-bp7-*`（ブースターパック MELLOWMOMENT / Liella!）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-bp7.mjs`
- 全文監査: `node scripts/audit-liella-bp7-text.mjs`
- エネルギー（E）は対象外

## メンバー（001–022）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!SP-bp7-001-P/R | jouji + jidou_leave_baton_self_under_partner | 常時: Liella!の下ならホストにブレード。自動: バトン退場で自分を登場先の下へ |
| [x] | 002 | PL!SP-bp7-002-P/R | jouji stage_cost_plus | E≥7かつ自E＞相手ならコスト+2 |
| [x] | 003 | PL!SP-bp7-003-P/R | jouji + ability_sequence | 常時: 下のメンバー1枚につきブレード／下≥3でスコア+1。起動T1: コスト10か20を公開して下へ→2ドロー |
| [x] | 004 | PL!SP-bp7-004-P/R | waiting_to_deck_bottom_blade_if_moved_no_bh | LS: Liella!メンバー3枚をデッキ下任意、置いた中にBHなしがいればブレード2 |
| [x] | 005 | PL!SP-bp7-005-P/R | jidou×2 | T1: 登場かE戻りでEデッキ1枚ウェイト（次ターン非アクティブ）。T2: 効果でE置き場に置かれたときブレード |
| [x] | 006 | PL!SP-bp7-006-P/R | toujou_wait_pick_hand + grant_jouji_session | 登場: E1をEデッキ任意→控え室Liella!回収。成功センター: 今ターンE戻りならスコア+1 |
| [x] | 007 | PL!SP-bp7-007-P/R | grant + energy_deck_to_wait + activate_energy | LS: E2をEデッキ任意→ブレード3。成功: Eデッキ2枚ウェイト（次ターン非アクティブ）／自E＞相手ならE6アクティブ |
| [x] | 008 | PL!SP-bp7-008-P/R | draw_from_deck + jidou_self_wait_area_move_activate | 起動: 自ウェイト→1ドロー。自動: ウェイトでエリア移動したらアクティブ |
| [x] | 009 | PL!SP-bp7-009-P/R | jouji + optional_self_wait_opp_stage | 常時左右: heart02。LSセンター: 相手印刷ブレード≤2をウェイト |
| [x] | 010 | PL!SP-bp7-010-P/R | kidou_stage_wait_pick_hand | 自控え→E1をEデッキ→控え室から任意1枚手札 |
| [x] | 011 | PL!SP-bp7-011-P/R | draw_from_deck | 手札すべて控え室任意→6ドロー |
| [x] | 012 | PL!SP-bp7-012-N | waiting_pick_to_deck | CatChu!/KALEIDOSCORE/5yncri5e!各1枚をデッキ下任意→1ドロー |
| [x] | 013 | PL!SP-bp7-013-N | jouji blade_conditional | KALEIDOSCORE×3ならheart06+ブレード |
| [x] | 014 | PL!SP-bp7-014-N | jidou_area_move_grant_jouji | T1: エリア移動でブレード2 |
| [x] | 015 | PL!SP-bp7-015-N | draw_from_deck | 任意E払い、CatChu!×3なら1ドロー |
| [x] | 016 | PL!SP-bp7-016-N | jidou_move_or_energy_draw_grant | T1: 効果でE置き場に置かれたときブレード |
| [x] | 017 | PL!SP-bp7-017-N | energy_deck_to_wait | Eデッキ1枚ウェイト（次ターン非アクティブ） |
| [x] | 018 | PL!SP-bp7-018-N | deck_top_pick_recover | 手札ライブ1捨て任意→上5見1枚手札、残り控え室 |
| [x] | 019 | PL!SP-bp7-019-N | toujou_wait_pick_hand | 5yncri5e!≥3なら控え室ライブ1枚手札 |
| [x] | 020 | PL!SP-bp7-020-N | jouji blade_conditional | 自E＞相手ならブレード2 |
| [x] | 021 | PL!SP-bp7-021-N | jouji blade_conditional | 自E＞相手ならheart06 |
| [x] | 022 | PL!SP-bp7-022-N | live_start_position_change | 起動T1: E1をEデッキ→ポジションチェンジ |

## ライブ（023–028）

| 状態 | 番号 | ID | 主テンプレート | 備考 |
|------|------|-----|----------------|------|
| [x] | 023 | PL!SP-bp7-023-L/SECL | yell_resolution_pick_deck_top | 成功: エール公開のLiella!1枚をデッキ上任意 |
| [x] | 024 | PL!SP-bp7-024-L/SECL | live_card_score_plus | 成功: 自Eが相手より2枚以上多いならスコア+1 |
| [x] | 025 | PL!SP-bp7-025-L | grant_jouji_session | LS: 嵐千砂都1人にブレード |
| [x] | 026 | PL!SP-bp7-026-L | draw_then_hand_discard | LS: E1をEデッキ任意、葉月恋がいれば2ドロー1捨て |
| [x] | 027 | PL!SP-bp7-027-L | live_card_score_plus + energy_deck_to_wait | LS: E1をEデッキ任意、自E＞相手ならスコア+1。成功: Eデッキ1枚ウェイト（次ターン非アクティブ） |
| [x] | 028 | PL!SP-bp7-028-L | live_start_optional_waiting_shuffle_deck_bottom_grant + live_card_score_plus | LS: Liella!メンバー9枚をシャッフルデッキ下任意→全メンバーにブレード。成功: エール公開がすべてLiella!ならスコア+1 |

## 2026-08-10 修正（メンバー初回監修）

| ID | 内容 |
|----|------|
| PL!SP-bp7-002 | stage_cost_plus に E≥7＋自E＞相手 |
| PL!SP-bp7-003 | 下メンバー比例ブレード／下≥3スコア／コスト10\|20公開→下→ドロー |
| PL!SP-bp7-004 | 控え室→デッキ下＋置いた中BHなしでブレード2 |
| PL!SP-bp7-006 | センター＋今ターンE戻りでスコア+1を実判定 |
| PL!SP-bp7-010 | 自控え後にE→デッキ＋任意カード回収 |
| PL!SP-bp7-011 | 手札すべて捨て任意→6ドロー |
| PL!SP-bp7-013 | KALEIDOSCORE×3条件 |
| PL!SP-bp7-018 | 手札ライブ捨てコスト＋山札見は任意1枚（横展開 bp3/bp4） |
| PL!SP-bp7-019 | ステージ条件タグと回収seriesTagの分離 |

## 2026-08-10 修正（ライブ初回監修）

| ID | 内容 |
|----|------|
| PL!SP-bp7-024 | 自Eが相手より2枚以上多いスコア条件 |
| PL!SP-bp7-028 | 控え室9枚シャッフルデッキ下→全メンバーブレード／エール全Liella!スコア |
