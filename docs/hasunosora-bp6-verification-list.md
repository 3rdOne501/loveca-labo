# 蓮ノ空 bp6（PL!HS-bp6）効果検証リスト

`PL!HS-bp6-*`（ブースターパック）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-bp6.mjs`
- 全文監査: `node scripts/audit-hasunosora-bp6-text.mjs`

## メンバー（001–024）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 1 | PL!HS-bp6-001-P | deck_top_count_stage_plus + yell_resolution_pick_deck_top | 自分のデッキの上から、自分のステージにいるメンバーの数に2を足した数に等しい枚数見る。その中から1枚をデッキの一番上に置 |
| [x] | 2 | PL!HS-bp6-002-P | jouji:blade_conditional | 自分のステージにほかのメンバーがいないかぎり、を得る。 |
| [x] | 3 | PL!HS-bp6-003-P | toujou_wait_pick_hand + grant_jouji_session | 自分のステージにいるウェイト状態の『みらくらぱーく！』のメンバー1人をアクティブにしてもよい。そうした場合、自分の控え室 |
| [x] | 4 | PL!HS-bp6-004-P | optional_self_wait_opp_stage + live_start_opp_wait_max_cost + live_start_optional_hand_discard_named_followup_blade | 相手のステージにいるコスト9以下のメンバー1人をウェイトにする。  |
| [x] | 5 | PL!HS-bp6-005-P | live_start_hand_discard_cost_boost_grant_if + yell_resolution_pick_hand | 手札を1枚控え室に置いてもよい：ライブ終了時まで、このメンバーのコストを＋６する。その後、自分のステージにいる『蓮ノ空』 |
| [x] | 6 | PL!HS-bp6-006-P | jouji:hand_cost_per_series_on_stage + jouji:baton_series_only + live_success_wait_skip_next_activate | 手札にあるこのメンバーカードのコストは、自分のステージにいる『みらくらぱーく！』のメンバー1人につき、2少なくなる。  |
| [x] | 7 | PL!HS-bp6-007-P | jidou:jidou_series_enter_opp_wait | 自分のステージに『EdelNote』のメンバーが登場したとき、相手は、自身のステージにいるアクティブ状態のメンバー1人を |
| [x] | 8 | PL!HS-bp6-008-P | ability_sequence + live_start_activate_self_if_low_score_live | このメンバーをウェイトにする。その後、自分の控え室からスコア４以下の『蓮ノ空』のライブカードを1枚手札に加える。  |
| [x] | 9 | PL!HS-bp6-009-R | grant_jouji_session | 自分のデッキの上からカードを4枚控え室に置く。それらがすべて『蓮ノ空』のカードの場合、ライブ終了時まで、を得る。 |
| [x] | 10 | PL!HS-bp6-010-R | draw_from_deck | 手札の『DOLLCHESTRA』のカードを1枚控え室に置いてもよい：カードを1枚引き、ライブ終了時まで、自分のステージに |
| [x] | 11 | PL!HS-bp6-011-R | draw_then_hand_discard | このメンバーをウェイトにする：カードを1枚引き、手札を1枚控え室に置く。 |
| [x] | 12 | PL!HS-bp6-012-R | activate_energy | 自分のステージにほかの『スリーズブーケ』のメンバーがいる場合、エネルギーを1枚アクティブにする。 |
| [x] | 13 | PL!HS-bp6-013-R | optional_self_wait_opp_stage + live_start_opp_wait_exclude_unit | 元々ブレード3以下・DOLLCHESTRA以外をウェイト **2026-06-30: 登場時 excludedUnit** |
| [x] | 14 | PL!HS-bp6-014-R | kidou_discard_self_draw_grant | このカードを手札から控え室に置く：カードを1枚引き、ライブ終了時まで、自分のステージにいる「藤島慈」か「大沢瑠璃乃」のう |
| [x] | 15 | PL!HS-bp6-015-R | draw_then_hand_discard | このメンバーが手札以外からステージに登場している場合、カードを2枚引き、手札を2枚控え室に置く。 |
| [x] | 16 | PL!HS-bp6-016-R | kidou_waiting_to_empty_stage | ：自分の控え室からコスト4以下の『蓮ノ空』のメンバーカードを1枚、メンバーのいないエリアに登場させる。 |
| [x] | 17 | PL!HS-bp6-017-N | jidou:jidou_leave_stage_hand_pick_recover | このメンバーがステージから控え室に置かれたとき、手札を1枚控え室に置いてもよい。そうした場合、自分の控え室からライブカー |
| [x] | 18 | PL!HS-bp6-018-N | jidou:jidou_leave_stage_hand_grant_member | このメンバーがステージから控え室に置かれたとき、手札を1枚控え室に置いてもよい。そうした場合、ライブ終了時まで、自分のス |
| [x] | 19 | PL!HS-bp6-019-N | jidou:jidou_leave_stage_draw_discard | このメンバーがステージから控え室に置かれたとき、カードを2枚引き、手札を2枚控え室に置く。 |
| [x] | 20 | PL!HS-bp6-020-N | draw_then_hand_discard | カードを1枚引き、手札を1枚控え室に置く。 |
| [x] | 21 | PL!HS-bp6-021-N | — | 能力なし |
| [x] | 22 | PL!HS-bp6-022-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを5枚見る。その中からライブカードを1枚公開して手札に加えても |
| [x] | 23 | PL!HS-bp6-023-N | — | 能力なし |
| [x] | 24 | PL!HS-bp6-024-N | — | 能力なし |

## ライブ（025–032）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 25 | PL!HS-bp6-025-L | grant_jouji_session + live_success_recover_from_waiting | 手札を1枚控え室に置いてもよい：ライブ終了時まで、自分のステージにいる『蓮ノ空』のメンバー1人は、を得る。  |
| [x] | 26 | PL!HS-bp6-026-L | — | 能力なし |
| [x] | 27 | PL!HS-bp6-027-L | jidou:jidou_yell_discard_nobh_series_multi_extra_yell | 自分がエールしたとき、エールにより公開された自分のブレードハートを持たない『蓮ノ空』のカードを3枚まで控え室に置いてもよ |
| [x] | 28 | PL!HS-bp6-028-L | deck_top_look_reorder | このターン、自分が余剰ハートを1つ以上持っている場合、自分のデッキの上からカードを2枚見る。その中から好きな枚数を好きな |
| [x] | 29 | PL!HS-bp6-029-L | live_start_tiered_stage_cost_deck_look | 自分のステージにいる『蓮ノ空』のメンバーのコストが合計20以上の場合、デッキの上のカードを2枚見る。その中から1枚を手札 |
| [x] | 30 | PL!HS-bp6-030-L | draw_then_hand_discard | カードを1枚引き、手札を1枚控え室に置く。 |
| [x] | 31 | PL!HS-bp6-031-L | live_start_optional_shuffle_deck_bottom_grant_if | 自分の控え室にあるすべてのメンバーカードをシャッフルし、デッキの下に置いてもよい。これにより『みらくらぱーく！』のカード |
| [x] | 32 | PL!HS-bp6-032-L | yell_resolution_pick_hand | エールにより公開された自分のカードの中から、コスト4以下のメンバーカードを1枚手札に加える。 |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| PL!HS-bp6-013-R | 登場時 `optional_self_wait_opp_stage` が DOLLCHESTRA 除外未適用 → `buildOppWaitStageMeta` + `excludedUnit` フィルタ |

## 2026-06-30 初回監修

| ID | 内容 |
|----|------|
| （全体） | 分類・ハンドラ OK。verify/audit 新設 |
