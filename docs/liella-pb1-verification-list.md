# Liella! pb1（PL!SP-pb1）効果検証リスト

`PL!SP-pb1-*`（プレミアムブースター Liella!）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-pb1.mjs`
- 全文監査: `node scripts/audit-liella-pb1-text.mjs`

## メンバー（001–021）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 1 | PL!SP-pb1-001-R | live_start_pay_or_hand_discard + optional_energy_live_score_plus | 支払わないかぎり、自分の手札を2枚控え室に置く。  |
| [x] | 2 | PL!SP-pb1-002-R | jouji:live_score_plus | 自分のエネルギーが12枚以上ある場合、ライブの合計スコアを＋１する。 |
| [x] | 3 | PL!SP-pb1-003-R | toujou_rotate_stage_areas | 自分のステージにいるメンバーが『5yncri5e!』のみの場合、自分と対戦相手は、センターエリアのメンバーを左サイドエリ |
| [x] | 4 | PL!SP-pb1-004-R | energy_deck_to_wait + draw_from_deck | 支払ってもよい：自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く。  |
| [x] | 5 | PL!SP-pb1-005-R | energy_deck_to_wait | 自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く。 |
| [x] | 6 | PL!SP-pb1-006-R | jidou:jidou_area_move_grant_jouji | このメンバーが登場か、エリアを移動するたび、ライブ終了時まで、を得る。 (対戦相手のカードの効果でも発動する。) |
| [x] | 7 | PL!SP-pb1-007-R | activate_energy | エネルギーを2枚アクティブにする。 |
| [x] | 8 | PL!SP-pb1-008-R | toujou_draw_then_position_change | カードを1枚引く。その後、登場したエリアとは別の自分のエリア1つを選ぶ。このメンバーをそのエリアに移動する。選んだエリア |
| [x] | 9 | PL!SP-pb1-009-R | draw_from_deck | 自分のステージにほかの『5yncri5e!』のメンバーがいる場合、カードを1枚引く。 |
| [x] | 10 | PL!SP-pb1-010-R | jouji:stage_cost_plus | 自分のエネルギーが10枚以上ある場合、ステージにいるこのメンバーのコストを＋４する。 |
| [x] | 11 | PL!SP-pb1-011-R | toujou_optional_self_wait_recover | 「鬼塚冬毬」以外の『Liella!』のメンバー1人をステージから控え室に置いてもよい：自分の控え室から、これにより控え室 |
| [x] | 12 | PL!SP-pb1-012-N | — | 能力なし |
| [x] | 13 | PL!SP-pb1-013-N | — | 能力なし |
| [x] | 14 | PL!SP-pb1-014-N | — | 能力なし |
| [x] | 15 | PL!SP-pb1-015-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを5枚見る。その中から『CatChu!』のカードを1枚公開して |
| [x] | 16 | PL!SP-pb1-016-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを5枚見る。その中から『KALEIDOSCORE』のカードを1 |
| [x] | 17 | PL!SP-pb1-017-N | deck_top_pick_recover | 手札を1枚控え室に置いてもよい：自分のデッキの上からカードを5枚見る。その中から『5yncri5e!』のカードを1枚公開 |
| [x] | 18 | PL!SP-pb1-018-N | kidou_stage_wait_pick_hand | このメンバーをステージから控え室に置く：自分の控え室からライブカードを1枚手札に加える。 |
| [x] | 19 | PL!SP-pb1-019-N | — | 能力なし |
| [x] | 20 | PL!SP-pb1-020-N | jidou:jidou_area_move_draw | このメンバーがエリアを移動するたび、カードを1枚引く。 (対戦相手のカードの効果でも発動する。) |
| [x] | 21 | PL!SP-pb1-021-N | kidou_stage_wait_pick_hand | このメンバーをステージから控え室に置く：自分の控え室からメンバーカードを1枚手札に加える。 |
| [x] | 22 | PL!SP-pb1-022-N | — | 能力なし |

## ライブ（023–026）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 23 | PL!SP-pb1-023-L | live_start_activate_energy_all_active_score | 自分のステージに名前の異なる『CatChu!』のメンバーが2人以上いる場合、エネルギーを6枚までアクティブにする。その後 |
| [x] | 24 | PL!SP-pb1-024-L | live_card_score_plus | 自分のステージに名前の異なる『KALEIDOSCORE』のメンバーが2人以上いる場合、このカードのスコアを＋１する。 |
| [x] | 25 | PL!SP-pb1-025-L | live_start_need_heart_reduce_per_enter_or_move | 自分のステージにいる、このターン中に登場、またはエリアを移動した『5yncri5e!』のメンバー1人につき、このカードを |
| [x] | 26 | PL!SP-pb1-026-L | — | 能力なし |

## 2026-06-30 初回監修

| ID | 内容 |
|----|------|
| （全体） | 分類・ハンドラ OK。verify/audit 新設 |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| PL!SP-pb1-010-R | 常時コスト+4: `ある場合` の E10+ 未判定 → jouji `stage_cost_plus` minEnergy |
| PL!SP-pb1-023-L | ディストーション: CatChu 2人未満でも全Eアクティブなら+1（FAQ Q97）→ 活性化とスコアを分離 |
