# 虹ヶ咲 bp7 / MELLOWMOMENT（PL!N-bp7）効果検証リスト

`PL!N-bp7-*`（ブースターパック MELLOWMOMENT / 虹ヶ咲）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-bp7.mjs`
- 全文監査: `node scripts/audit-niji-bp7-text.mjs`
- エネルギー（E）は対象外

## メンバー（001–024）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!N-bp7-001-P/R | jidou_energy_under_placed_energy_wait | T1: エネルギーがメンバーの下に置かれたとき、Eデッキから1枚ウェイトで置く |
| [x] | 002 | PL!N-bp7-002-P/R | toujou_wait_pick_hand | ステージにQU4RTZが3人以上なら控え室から1枚手札へ |
| [x] | 003 | PL!N-bp7-003-P/R | kidou_mill_waiting_under_copy_printed_hearts + grant_jouji_session | 起動T1: 上5ミル→控え室C17以下虹ヶ咲を下に→元々ハートを同じに。LS: 下の名前の異なるメンバー1枚につきブレード |
| [x] | 004 | PL!N-bp7-004-P/R | kidou_energy_under_opp_wait_by_under | 起動T1: E1を下に→相手の印刷ブレードが下のE枚数+1以下のメンバーをウェイト |
| [x] | 005 | PL!N-bp7-005-P/R | ability_pick_one | 名前の異なるDiverDivaが2人いる場合、E2アクティブかEデッキ1枚を虹ヶ咲の下へ |
| [x] | 006 | PL!N-bp7-006-P/R | deck_top_look_reorder + deck_mill_conditional_pick_one | 起動T1: Eで上4見→上に戻す。起動T2: 上3ミル、虹ヶ咲ライブかBHなし虹ヶ咲メンバーならE2アクティブかブレード2 |
| [x] | 007 | PL!N-bp7-007-P/R | jouji + energy_deck_under_member | 常時: 下のE1枚につきheart02／Eが6より多い差ぶんheart02。成功時: Eデッキ1枚を下へ |
| [x] | 008 | PL!N-bp7-008-P/R | waiting_to_deck_bottom_activate_per | BHなしメンバー最大4枚を控え室→デッキ下任意、1枚につきE1アクティブ |
| [x] | 009 | PL!N-bp7-009-P/R | deck_top_to_waiting | 自分と相手それぞれ山札上7枚を控え室へ |
| [x] | 010 | PL!N-bp7-010-P/R | kidou_energy_under_waiting_enter | 起動T1: E1を下に→控え室C2以下虹ヶ咲を空きにウェイト登場（当ターン登場不可） |
| [x] | 011 | PL!N-bp7-011-P/R | jidou + jouji + waiting_pick_to_deck | 自動: デッキ→控え室時に手札1捨て任意で回収。常時: 控え室全メンバー→デッキ下でコスト−2。成功時: 控え室虹ヶ咲1枚をデッキ上任意 |
| [x] | 012 | PL!N-bp7-012-P/R | heart_color_pick_grant | LS: 虹ヶ咲1人ウェイト任意→好きなハート色1つ得る |
| [x] | 013 | PL!N-bp7-013-N | draw_from_deck | A・ZU・NAが3人いる場合1ドロー |
| [x] | 014 | PL!N-bp7-014-N | jidou_leave_stage_recover_no_cost | ステージ→控え室時、控え室の虹ヶ咲ライブ1枚を手札へ |
| [x] | 015 | PL!N-bp7-015-N | kidou_stage_wait_pick_hand | 自分を控え室へ→控え室メンバー1枚手札 |
| [x] | 016 | PL!N-bp7-016-N | heart_color_pick_grant | LS: E支払い任意→好きなハート色1つ得る |
| [x] | 017 | PL!N-bp7-017-N | energy_deck_under_member | 登場: Eデッキ1枚を虹ヶ咲の下へ任意 |
| [x] | 018 | PL!N-bp7-018-N | deck_top_pick_recover | 手札1捨て任意→上5見、BHなし虹ヶ咲メンバー1枚手札任意、残り控え室 |
| [x] | 019 | PL!N-bp7-019-N | jidou_leave_baton_partner_energy_under | 退場時、虹ヶ咲とバトンしていれば登場先の下にEデッキ1枚 |
| [x] | 020 | PL!N-bp7-020-N | deck_mill_conditional_grant | 上3ミル、メンバーのBH色が2種以上ならheart04 |
| [x] | 021 | PL!N-bp7-021-N | kidou_stage_wait_pick_hand | 自分を控え室へ→控え室ライブ1枚手札 |
| [x] | 022 | PL!N-bp7-022-N | jidou_own_member_wait_discard_activate | T1ライブ中: 虹ヶ咲がウェイトになったとき手札1捨て任意でアクティブ |
| [x] | 023 | PL!N-bp7-023-N | draw_then_hand_discard | 起動T1: 自ウェイト→2ドローして手札2捨て |
| [x] | 024 | PL!N-bp7-024-N | grant_jouji_session | R3BIRTHが3人いる場合heart01 |

## ライブ（025–031）

| 状態 | 番号 | ID | 主テンプレート | 備考 |
|------|------|-----|----------------|------|
| [x] | 025 | PL!N-bp7-025-L/SECL | grant_jouji_session + live_card_score_plus | LS: ライブ終了時まで虹ヶ咲1人にブレード。成功: エール公開のheart01–06が3種類以上ならスコア+1 |
| [x] | 026 | PL!N-bp7-026-L/SECL | live_start_hand_discard_optional_blade_pick_equal + live_card_score_plus | LS: 手札最大2捨て→同数まで虹ヶ咲にブレード。成功: エールのBHなしメンバー2枚以上でスコア+1 |
| [x] | 027 | PL!N-bp7-027-L | live_card_score_plus | 虹ヶ咲1人を選び、自他ステージの他全員よりブレード多ければスコア+1 |
| [x] | 028 | PL!N-bp7-028-L | live_start_optional_shuffle_all_waiting_grant | 控え室に虹ヶ咲ライブとBHなし虹ヶ咲メンバーがいれば全控え室シャッフルデッキ下任意→全虹ヶ咲にheart01 |
| [x] | 029 | PL!N-bp7-029-L | live_success_under_energy_to_area_score | メンバー下の全Eを置き場へウェイト任意。1枚以上かつE10以上ならスコア+1 |
| [x] | 030 | PL!N-bp7-030-L | deck_top_look_reorder + live_return_hand_then_discard | 成功: 上3見→上に戻し残り控え室／このカードを手札に戻し手札1捨て |
| [x] | 031 | PL!N-bp7-031-L | deck_top_to_waiting + jidou_ability_mill_pick_live_score | 成功: 上3ミル。自動T1: 成功時能力でミルした虹ヶ咲ライブ1枚手札任意→スコア+1 |

## 2026-08-10 修正（メンバー初回監修 001–018）

| ID | 内容 |
|----|------|
| PL!N-bp7-003 | ミル→下置き＋元々ハートコピー／LS下の異名メンバー比例ブレード |
| PL!N-bp7-005/013 | 「N人いる」をステージ人数条件として解析（以上のみだった） |
| PL!N-bp7-006 | ミル条件成立時の2択（誤grant解消） |
| PL!N-bp7-007 | 下E比例heart／E>6の差分heart（誤blade解消） |
| PL!N-bp7-008 | 控え室→デッキ下＋移動枚数分アクティブ |
| PL!N-bp7-009 | 双方山札上ミル |
| PL!N-bp7-012 | 任意ウェイト後のハート色指定付与 |
| PL!N-bp7-018 | 山札見手札のBHなしフィルタ |
| PL!S-bp6-009 | 成功ライブ枚数差に等しいブレード（横展開） |

## 2026-08-10 修正（メンバー019–024＋ライブ初回監修）

| ID | 内容 |
|----|------|
| PL!N-bp7-020 | 上3ミル→メンバーBH色2種以上でheart04（誤grant解消） |
| PL!N-bp7-025 | エールheart種類≥3でスコア+1 |
| PL!N-bp7-026 | 手札捨同数ブレード付与／エールBHなし≥2でスコア+1 |
| PL!N-bp7-027 | 最多ブレード比較（自他ステージ）後にスコア+1 |
| PL!N-bp7-028 | 控え室全シャッフルデッキ下→全虹ヶ咲heart01 |
| PL!N-bp7-029 | 下E→置き場ウェイト後にE≥10でスコア+1 |
