# μ's pb1（PL!-pb1）効果検証リスト

`PL!-pb1-*`（プレミアムブースター μ's）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-muse-pb1.mjs`
- 全文監査: `node scripts/audit-muse-pb1-text.mjs`

## メンバー（001–019）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 1 | PL!-pb1-001-R | deck_reveal_until_pick | このメンバーをウェイトにし、手札を1枚控え室に置く：ライブカードかコスト10以上のメンバーカードのどちらか1つを選ぶ。選 |
| [x] | 2 | PL!-pb1-002-R | optional_self_wait_opp_stage + jouji:heart_per_opponent_wait | このメンバーをウェイトにしてもよい：自分のステージにいるメンバーが『BiBi』のみの場合、相手のステージにいる元々持つの |
| [x] | 3 | PL!-pb1-003-R | activate_energy | このメンバーをウェイトにしてもよい：自分のステージにいる『Printemps』のメンバー1人につき、エネルギーを1枚アク |
| [x] | 4 | PL!-pb1-004-R | toujou_success_live_score_tiered | 自分の成功ライブカード置き場にを持つ『μ's』のカードが1枚ある場合、ライブ終了時まで、「ライブの合計スコアを＋１する。 |
| [x] | 5 | PL!-pb1-005-R | draw_from_deck | 自分の成功ライブカード置き場にカードがある場合、カードを1枚引く。 |
| [x] | 6 | PL!-pb1-006-R | optional_self_wait_opp_stage | 自分の控え室から『μ's』のライブカードを1枚までデッキの一番上に置く。その後、相手のステージにウェイト状態のメンバーが |
| [x] | 7 | PL!-pb1-007-R | kidou_hand_cost_wait_pick_hand | 手札を3枚控え室に置く：自分のステージにほかの『lilywhite』のメンバーがいる場合、自分の控え室から『μ's』のラ |
| [x] | 8 | PL!-pb1-008-R | toujou_multi_wait_draw_per_count | メンバーを3人までウェイトにしてもよい：これによりウェイト状態にしたメンバー1人につき、カードを1枚引く。 |
| [x] | 9 | PL!-pb1-009-R | optional_self_wait_opp_stage + toujou_turn_block_effect_activate | 相手のステージにいる元々持つの数が1つ以下のメンバー1人をウェイトにする。  |
| [x] | 10 | PL!-pb1-010-R | grant_jouji_session | 手札を1枚控え室に置いてもよい：ライブ終了時まで、自分のステージにいるほかのメンバーはを得る。 |
| [x] | 11 | PL!-pb1-011-R | optional_self_wait_opp_stage | 自分のステージに名前の異なる『BiBi』のメンバーが2人以上いる場合、相手のステージにいるコスト4以下のメンバー1人をウ |
| [x] | 12 | PL!-pb1-012-R | activate_stage_members_up_to | 自分のステージにいる『Printemps』のメンバーを1人までアクティブにする。 |
| [x] | 13 | PL!-pb1-013-R | kidou_hand_reveal_grant_if_live | ：自分の手札を、相手は見ないで1枚選び公開する。これにより公開されたカードがライブカードの場合、ライブ終了時まで、このメ |
| [x] | 14 | PL!-pb1-014-R | jouji:hand_cost_reduce | 自分の成功ライブカード置き場に『lilywhite』のカードがある場合、手札にあるこのメンバーカードのコストは2減る。 |
| [x] | 15 | PL!-pb1-015-R | toujou_bibi_wait_opp_active_wait + jidou:jidou_opp_wait_draw | 『BiBi』のメンバー1人をウェイトにしてもよい：相手は、自身のステージにいるアクティブ状態のメンバー1人をウェイトにす |
| [x] | 16 | PL!-pb1-016-R | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを4枚見る。その中から『lilywhite』のカードを1枚公開 |
| [x] | 17 | PL!-pb1-017-R | toujou_self_wait_draw_then_conditional_discard | このメンバーをウェイトにしてもよい：カードを1枚引く。その後、このメンバーが『Printemps』のメンバーからバトンタ |
| [x] | 18 | PL!-pb1-018-R | toujou_both_wait_to_empty_stage | 自分と相手はそれぞれ、自身の控え室からコスト2以下のメンバーカードを1枚、メンバーのいないエリアにウェイト状態で登場させ |
| [x] | 19 | PL!-pb1-019-N | kidou_stage_wait_pick_hand | このメンバーをステージから控え室に置く：自分の控え室からメンバーカードを1枚手札に加える。 |
| [x] | 20 | PL!-pb1-020-N | — | 能力なし |
| [x] | 21 | PL!-pb1-021-N | — | 能力なし |
| [x] | 22 | PL!-pb1-022-N | — | 能力なし |
| [x] | 23 | PL!-pb1-023-N | — | 能力なし |
| [x] | 24 | PL!-pb1-024-N | kidou_stage_wait_pick_hand | このメンバーをステージから控え室に置く：自分の控え室からライブカードを1枚手札に加える。 |
| [x] | 25 | PL!-pb1-025-N | kidou_stage_wait_pick_hand | このメンバーをステージから控え室に置く：自分の控え室からメンバーカードを1枚手札に加える。 |
| [x] | 26 | PL!-pb1-026-N | — | 能力なし |
| [x] | 27 | PL!-pb1-027-N | — | 能力なし |

## ライブ（028–033）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 28 | PL!-pb1-028-L | live_start_activate_series_score_by_unwait | 自分のステージにいる『Printemps』のメンバーをアクティブにする。これによりウェイト状態のメンバーが3人以上アクテ |
| [x] | 29 | PL!-pb1-029-L | live_card_score_plus | 自分の成功ライブカード置き場のカードが0枚で、かつ自分のステージにいるメンバーが『lilywhite』のみの場合、このカ |
| [x] | 30 | PL!-pb1-030-L | live_start_need_heart_reduce_fixed + live_success_recover_from_waiting | 相手のステージにウェイト状態のメンバーがいる場合、このカードを成功させるための必要ハートを減らす。  |
| [x] | 31 | PL!-pb1-031-L | yell_resolution_pick_hand | 手札を1枚控え室に置いてもよい：エールにより公開された自分のカードの中から、『μ's』のメンバーカードを1枚手札に加える |
| [x] | 32 | PL!-pb1-032-L | draw_from_deck | 自分の成功ライブカード置き場に『μ's』のカードがある場合、カードを1枚引く。 |
| [x] | 33 | PL!-pb1-033-L | — | 能力なし |

## 2026-06-30 初回監修

| ID | 内容 |
|----|------|
| （全体） | 分類・ハンドラ OK。verify/audit 新設 |

## 2026-06-30 再監修（2回目・メンバー 001–027）

| ID | 内容 |
|----|------|
| PL!-pb1-003-R | `energyActiveUnitKind: series_stage_members`（Printemps 人数×E1枚アクティブ） |
| PL!-pb1-007-R | 成功ライブ1枚ごと手札捨て-1 / 控え室回収はμ'sライブ（pickType修正） |
| （横展開） | `parseAbilityPickFilters` 控え室からシリーズ優先、`audit-common-patterns` 2ルール |

## 2026-06-30 再監修（2回目・ライブ 028–033）

| ID | 内容 |
|----|------|
| PL!-pb1-029-L | `maxOwnSuccessLiveCount: 0`（成功ライブ0枚＋lilywhiteのみ） |
| PL!-pb1-030-L | ライブ成功時 BiBi **異名**2人以上（`minDistinctSeriesMemberNames`） |
| PL!-pb1-032-L | 成功ライブ置き場のμ'sカードでドロー（`minSuccessLiveSeriesTag`、ライブ置き場誤判定修正） |
| （横展開） | 成功ライブ0枚/シリーズ存在/異名シリーズ人数の `parseConditionalPrefixFilters` 修正 |
