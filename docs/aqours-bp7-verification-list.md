# Aqours bp7 / MELLOWMOMENT（PL!S-bp7）効果検証リスト

`PL!S-bp7-*`（ブースターパック MELLOWMOMENT / Aqours）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-bp7.mjs`
- 全文監査: `node scripts/audit-aqours-bp7-text.mjs`
- エネルギー（E）は対象外

## メンバー（001–018）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!S-bp7-001-P/R | ability_sequence | 手札1捨て任意→控え室C10以上回収。梨子か曜ならブレード2 |
| [x] | 002 | PL!S-bp7-002-P/R | draw_from_deck | ステージにC9以上Aqoursがいれば1ドロー |
| [x] | 003 | PL!S-bp7-003-P/R | deck_peek_relocate + ability_pick_one | 登場/LS: 山札上1見→下へ任意。登場: Aqours印刷ブレード3以下は相手効果でウェイトしない／AqoursかSaintSnowのいるエリアへPC |
| [x] | 004 | PL!S-bp7-004-P/R | toujou_baton_both_keep_hand_shuffle_deck_bottom_draw + deck_top_look_reorder | Aqoursバトン登場→双方手札3枚まで残し残りシャッフルデッキ下→双方3ドロー。LS: 下から3見→下に戻す／残り控え室 |
| [x] | 005 | PL!S-bp7-005-P/R | waiting_member_under_stage + jouji + kidou_self_and_other_resolve_toujou | 控え室メンバー1枚を下に。下にカードがあるAqoursはブレード。起動C: 手札2捨→自と他Aqoursの登場能力 |
| [x] | 006 | PL!S-bp7-006-P/R | deck_mill_conditional_grant | 下から3ミル、すべてAqoursメンバーならheart04 |
| [x] | 007 | PL!S-bp7-007-P/R | toujou_wait_pick_hand + waiting_to_deck_bottom_blade_per | 控え室C2以下回収、善子かルビィなら空き登場任意。LS: Aqours控え室3枚までデッキ下→1枚につきブレード |
| [x] | 008 | PL!S-bp7-008-P/R | deck_top_look_reorder + deck_bottom_optional_mill_named_hand | 上3見→上に戻す／残り下。LS: 一番下ミル任意、果南かダイヤなら手札 |
| [x] | 009 | PL!S-bp7-009-P/R | jouji opp_across_lose_blade | 正面コスト4以下はブレード1失う |
| [x] | 010 | PL!S-bp7-010-N | deck_peek_relocate | 一番下を見る→上から4番目へ任意 |
| [x] | 011 | PL!S-bp7-011-N | deck_mill_conditional_grant | 起動T1: 自ウェイト→下2ミル、すべてAqoursならアクティブ＋ブレード2 |
| [x] | 012 | PL!S-bp7-012-N | toujou_optional_all_members_relocate | AqoursかSaintSnowのみならFC任意。SaintSnow移動でブレード2 |
| [x] | 013 | PL!S-bp7-013-N | live_start_pick_player_waiting_deck_bottom | 自分か相手を選び、その控え室メンバー2枚までデッキ下 |
| [x] | 014 | PL!S-bp7-014-N | jouji blade_conditional | 相手エネルギー＞自分ならheart02 |
| [x] | 015 | PL!S-bp7-015-N | deck_mill_conditional_grant | 下1ミル、ライブならheart02 |
| [x] | 016 | PL!S-bp7-016-N | jouji blade_conditional | ステージメンバー3人以上ならheart02/04/05 |
| [x] | 017 | PL!S-bp7-017-N | deck_mill_conditional_grant | 一番下ミル、C10以上メンバーならheart02+heart05 |
| [x] | 018 | PL!S-bp7-018-N | pick_stage_member_to_center | ステージメンバー1人をセンターへPC |

## ライブ（019–025）

| 状態 | 番号 | ID | 主テンプレート | 備考 |
|------|------|-----|----------------|------|
| [x] | 019 | PL!S-bp7-019-L | waiting_pick_to_deck | 成功時: 控え室Aqoursを2枚まで好きな順でデッキ下 |
| [x] | 020 | PL!S-bp7-020-L/SECL | need_heart_reduce_fixed + deck_mill_conditional_need_heart_reduce | LS: 全員アクティブなら必要ハートheart0減／下1ミルがAqoursメンバーならheart0減 |
| [x] | 021 | PL!S-bp7-021-L | live_start_deck_bottom_mill_member_tier | ステージ3人以上→下5ミル。メンバー3枚以上で1ドロー、すべてメンバーならスコア+1 |
| [x] | 022 | PL!S-bp7-022-L/SECL | yell_from_deck_bottom + live_card_score_plus | 常時: エールをデッキ下から。成功時: エール公開にheart02/04/05のAqoursがそれぞれいればスコア+1 |
| [x] | 023 | PL!S-bp7-023-L | live_start_optional_energy_to_deck_opp_adv_score | Aqours2人以上→E1枚をEデッキへ任意。相手Eが1多いとスコア+1、2以上多いと+2 |
| [x] | 024 | PL!S-bp7-024-L | live_start_pick_stage_member_printed_hearts_remap | Aqours1人の元々ハートをすべてheart04に |
| [x] | 025 | PL!S-bp7-025-L | live_success_pick_options | 成功時択: 相手C4以下を2人までウェイト（次ターンアクティブしない）／1ドロー |

## 2026-08-10 修正（メンバー初回監修）

| ID | 内容 |
|----|------|
| PL!S-bp7-001 | 回収名が梨子／曜のときのみブレード2（`grantIfRecoveredNames`） |
| PL!S-bp7-003 | 択1: 印刷ブレード≤3のAqoursは相手効果でウェイトしない／択2: 自をAqours\|SaintSnow列へPC |
| PL!S-bp7-004 | バトン手札3残し→残りシャッフルデッキ下→双方ドロー（誤`draw_from_deck`解消） |
| PL!S-bp7-006/011/015/017 | `deck_mill_conditional_grant`（下ミル→条件付与／起動はアクティブ復帰） |
| PL!S-bp7-007 | 善子／ルビィ回収後の任意登場＋LS控え室→デッキ下ブレード比例 |
| PL!S-bp7-008 | 山札見の残りをデッキ下（控え室誤送解消） |
| PL!S-bp7-009 | 正面失ブレード常時 |
| PL!S-bp7-012 | Aqours\|SaintSnowのみFC＋SaintSnow移動時ブレード2 |
| PL!S-bp7-014/016 | jouji条件（相手E多い／ステージ3人以上） |

## 2026-08-10 修正（ライブ初回監修）

| ID | 内容 |
|----|------|
| PL!S-bp7-020 | 全員アクティブ条件＋下ミル→Aqoursメンバーなら必要ハート減（ミル欠落解消） |
| PL!S-bp7-022 | エール下めくりがライブ枠を見ず未発動 → `eachLiveFrameLiveCardInsts` |
| PL!S-bp7-025 | 択ウェイトが1人のみ・次ターン非アクティブ未付与 → 2人まで＋skipActivate |
