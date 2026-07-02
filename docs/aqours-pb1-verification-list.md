# Aqours pb1（PL!S-pb1）効果検証リスト

`PL!S-pb1-*`（プレミアムブースター Aqours）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-pb1.mjs`
- 全文監査: `node scripts/audit-aqours-pb1-text.mjs`

## メンバー（001–018）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 1 | PL!S-pb1-001-R | toujou_wait_pick_hand | 相手の手札の枚数が自分より2枚以上多い場合、自分の控え室からライブカードを1枚手札に加える。 |
| [x] | 2 | PL!S-pb1-002-R | toujou_opp_optional_live_discard_or_score | 相手は手札からライブカードを1枚控え室に置いてもよい。そうしなかった場合、ライブ終了時まで、「ライブの合計スコアを＋１す |
| [x] | 3 | PL!S-pb1-003-R | live_start_optional_hearts_wild + yell_resolution_pick_hand | 支払ってもよい：ライブ終了時まで、このメンバーが元々持つハートはすべてになる。 |
| [x] | 4 | PL!S-pb1-004-R | kidou_stage_wait_pick_hand | このメンバーをステージから控え室に置く：自分の控え室からライブカードを1枚手札に加える。 |
| [x] | 5 | PL!S-pb1-005-R | jouji:blade_conditional | 相手のエネルギーが自分より多い場合、を得る。 |
| [x] | 6 | PL!S-pb1-006-R | kidou_reveal_live_opp_decline_grant | 手札のライブカードを1枚公開する：相手は手札を1枚控え室に置いてもよい。そうしなかった場合、ライブ終了時まで、を得る。 |
| [x] | 7 | PL!S-pb1-007-R | yell_resolution_energy_wait | エールにより公開された自分のカードの中にライブカードが1枚以上あるとき、自分のエネルギーデッキから、エネルギーカードを1 |
| [x] | 8 | PL!S-pb1-008-R | deck_top_look_reorder | 自分か相手を選ぶ。自分は、そのプレイヤーのデッキの上からカードを2枚見る。その中から好きな枚数を好きな順番でデッキの上に |
| [x] | 9 | PL!S-pb1-009-R | jouji:blade_conditional | 自分と相手の成功ライブカード置き場にカードが合計3枚以上ある場合、を得る。 |
| [x] | 10 | PL!S-pb1-010-N | — | 能力なし |
| [x] | 11 | PL!S-pb1-011-N | — | 能力なし |
| [x] | 12 | PL!S-pb1-012-N | — | 能力なし |
| [x] | 13 | PL!S-pb1-013-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを4枚見る。その中からハートにを2個以上持つメンバーカードか、 |
| [x] | 14 | PL!S-pb1-014-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを4枚見る。その中からハートにを2個以上持つメンバーカードか、 |
| [x] | 15 | PL!S-pb1-015-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを4枚見る。その中からハートにを2個以上持つメンバーカードか、 |
| [x] | 16 | PL!S-pb1-016-N | optional_energy_blade_until_live_end | 支払ってもよい：ライブ終了時まで、を得る。 |
| [x] | 17 | PL!S-pb1-017-N | optional_energy_blade_until_live_end | 支払ってもよい：ライブ終了時まで、を得る。 |
| [x] | 18 | PL!S-pb1-018-N | optional_energy_blade_until_live_end | 支払ってもよい：ライブ終了時まで、を得る。 |

## ライブ（019–023）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 19 | PL!S-pb1-019-L | live_start_disable_self_live_success_if + live_success_opponent_energy_deck_wait | 自分のステージにいる『Aqours』のメンバーが持つハートに、が合計6個以上ある場合、このカードの能力を無効にする。 |
| [x] | 20 | PL!S-pb1-020-L | live_card_score_plus | 自分のステージにいる『Aqours』のメンバーが持つハートに、が合計10個以上ある場合、このカードのスコアを＋２する。 |
| [x] | 21 | PL!S-pb1-021-L | live_card_score_plus | 自分のステージにいる『Aqours』のメンバーが持つハートに、が合計4個以上あり、このターン、相手が余剰のハートを持たず |
| [x] | 22 | PL!S-pb1-022-L | live_success_tie_block_success_live | このターン、ライブに勝利するプレイヤーを決定するとき、自分と相手のライブの合計スコアが同じ場合、ライブ終了時まで、自分と |
| [x] | 23 | PL!S-pb1-023-L | — | 能力なし |

## 2026-06-30 初回監修

| ID | 内容 |
|----|------|
| （全体） | 分類・ハンドラ OK。verify/audit 新設 |

## 2026-06-30 再監修（2回目）

| ID | 内容 |
|----|------|
| PL!S-pb1-013-N〜015-N | 山札公開: メンバー(ハート2+) or ライブ(必要ハート2+) `pickFilterAlternatives` |
| PL!S-pb1-020-L | ライブ開始: Aqours 緑ハート合計10+でスコア+2（`minStageSeriesHeartSlotTotal`） |
| PL!S-pb1-021-L | ライブ成功: 青ハート合計4+かつ相手余剰0成功（`requiresOpponentSucceededLiveZeroSurplusThisTurn`） |
| （横展開） | `parseAbilityPickFilters(p, segRaw)`、ハート合計条件・相手盤面判定スナップショット |
