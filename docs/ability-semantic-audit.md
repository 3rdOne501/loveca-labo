# カード能力・処理要素の静的照合レポート

生成: 2026-11-03T06:26:56.511Z
対象: full_catalog / 2700枚・2169能力セグメント

静的な既知ルールの照合のみ。checked_known_rulesも実プレイの正しさを保証しない。未知の文言・未登録契約は要確認。過去の修正履歴による除外なし。

| 状態 | セグメント数 |
|---|---:|
| unimplemented | 0 |
| suspect | 28 |
| needs_review | 1842 |
| checked_known_rules | 299 |

## 指摘一覧（同じ能力文・分類・指摘はレアリティ違いをまとめる）

疑いは実装不良の確定ではない。カード文と実ハンドラを読んで確認し、修正後に再監査する。

### PL!-pb1-006-P＋ 西木野真姫 — suspect

- 同型: PL!-pb1-006-P＋, PL!-pb1-006-R
- 発動: toujyou / 分類: ability_sequence
- カード文: 自分の控え室から『μ's』のライブカードを1枚までデッキの一番上に置く。その後、相手のステージにウェイト状態のメンバーがいる場合、カードを1枚引く。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.waiting_to_top | 控え室から『μ's』のライブカードを1枚までデッキの一番上に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 自分の控え室から『μ's』のライブカードを1枚までデッキの一番上に置く。その後、相手のステージにウェイト状態のメンバーがいる場合、カードを1枚引く。 |
| template_contract_missing: 未登録テンプレート。対応済みとは判定しない。 | contract | 自分の控え室から『μ's』のライブカードを1枚までデッキの一番上に置く。その後、相手のステージにウェイト状態のメンバーがいる場合、カードを1枚引く。 |

### PL!-pb2-001-PP 高坂穂乃果 — suspect

- 同型: PL!-pb2-001-PP, PL!-pb2-001-R
- 発動: live_start / 分類: grant_jouji_session
- カード文: 自分の成功ライブカード置き場にある『μ's』のカードの中に、{{icon_score.png\|スコア}}を持つカードがある場合、ライブ終了時まで、「{{jyouji.png\|常時}}ライブの合計スコアを＋１する。」を得る。{{icon_b_all.png\|ALLブレード}}を持つカードがある場合、ライブ終了時まで、{{icon_all.png\|ハート}}を得る。{{icon_draw.png\|ドロー}}を持つカードがある場合、自分の控え室から『μ's』のカードを1枚手札に加える。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.waiting_to_hand | 控え室から『μ's』のカードを1枚手札に加え |
| contract_mismatch: 分類結果がカード文の要求と一致しない: heart_grant_mismatch | effect.grant_heart | ハートを得る |
| amount_not_verified: 処理の存在は確認できるが、枚数・回数を契約で確認できない。 | effect.score | ライブの合計スコアを+1する |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.success_live_context | 自分の成功ライブカード置き場にある『μ's』のカードの中に、スコアを持つカードがある場合、ライブ終了時まで、「常時ライブの合計スコアを+1する。」を得る。ALLブレードを持つカードがある場合、ライブ終了時まで、ハートを得る。ドローを持つカードがある場合、自分の控え室から『μ's』のカードを1枚手札に加える。 |

### PL!-pb2-003-PP 南 ことり — suspect

- 同型: PL!-pb2-003-PP, PL!-pb2-003-R
- 発動: live_start / 分類: grant_jouji_session
- カード文: 相手のステージにいるメンバー1人のすべての{{live_success.png\|ライブ成功時}}能力を、ライブ終了時まで、無効にする。これにより無効にした場合、ライブ終了時まで、{{heart_03.png\|heart03}}を得る。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.disable_ability | 能力を、ライブ終了時まで、無効にする |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 相手のステージにいるメンバー1人のすべてのライブ成功時能力を、ライブ終了時まで、無効にする。これにより無効にした場合、ライブ終了時まで、heart03を得る。 |

### PL!-pb2-018-P＋ 矢澤にこ — suspect

- 同型: PL!-pb2-018-P＋, PL!-pb2-018-R
- 発動: toujyou / 分類: optional_self_wait_opp_stage
- カード文: 手札の名前の異なる『BiBi』のメンバーカードを3枚控え室に置いてもよい：自分のステージにいるメンバーが『BiBi』のみの場合、相手のステージにいるメンバー1人をウェイトにする。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | cost.hand_to_waiting | 手札の名前の異なる『BiBi』のメンバーカードを3枚控え室に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 自分のステージにいるメンバーが『BiBi』のみの場合、相手のステージにいるメンバー1人をウェイトにする。 |

### PL!-pb2-018-P＋ 矢澤にこ — suspect

- 同型: PL!-pb2-018-P＋, PL!-pb2-018-R
- 発動: live_start / 分類: optional_self_wait_opp_stage
- カード文: 手札の名前の異なる『BiBi』のメンバーカードを3枚控え室に置いてもよい：自分のステージにいるメンバーが『BiBi』のみの場合、相手のステージにいるメンバー1人をウェイトにする。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | cost.hand_to_waiting | 手札の名前の異なる『BiBi』のメンバーカードを3枚控え室に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 自分のステージにいるメンバーが『BiBi』のみの場合、相手のステージにいるメンバー1人をウェイトにする。 |

### PL!-pb2-019-N 高坂穂乃果 — suspect

- 同型: PL!-pb2-019-N
- 発動: live_start / 分類: grant_jouji_session
- カード文: このメンバーをウェイトにし、手札を1枚控え室に置いてもよい：ライブ終了時まで、自分のセンターエリアにいる『μ's』のメンバーは、{{icon_blade.png\|ブレード}}{{icon_blade.png\|ブレード}}を得る。（ウェイト状態のメンバーが持つ{{icon_blade.png\|ブレード}}は、エールで公開する枚数を増やさない。）

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: amount_mismatch | effect.grant_blade | ブレードブレードを得る |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.center_target | 自分のセンターエリアにいる |

### PL!-pb2-031-N 園田海未 — suspect

- 同型: PL!-pb2-031-N
- 発動: live_start / 分類: grant_jouji_session
- カード文: 手札の『μ's』のカードを1枚控え室に置いてもよい：ライブ終了時まで、{{heart_06.png\|heart06}}を得る。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | cost.hand_to_waiting | 手札の『μ's』のカードを1枚控え室に置 |

### PL!HS-bp6-009-R 日野下花帆 — suspect

- 同型: PL!HS-bp6-009-R
- 発動: live_start / 分類: grant_jouji_session
- カード文: 自分のデッキの上からカードを4枚控え室に置く。それらがすべて『蓮ノ空』のカードの場合、ライブ終了時まで、{{icon_blade.png\|ブレード}}を得る。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.mill | デッキの上からカードを4枚控え室に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 自分のデッキの上からカードを4枚控え室に置く。それらがすべて『蓮ノ空』のカードの場合、ライブ終了時まで、ブレードを得る。 |

### PL!HS-bp6-010-R 村野さやか — suspect

- 同型: PL!HS-bp6-010-R
- 発動: live_start / 分類: draw_from_deck
- カード文: 手札の『DOLLCHESTRA』のカードを1枚控え室に置いてもよい：カードを1枚引き、ライブ終了時まで、自分のステージにいる『DOLLCHESTRA』のメンバー1人のコストを＋５する。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | cost.hand_to_waiting | 手札の『DOLLCHESTRA』のカードを1枚控え室に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | duration.live_end | ライブ終了時まで |

### PL!HS-PR-035-PR 百生吟子 — suspect

- 同型: PL!HS-PR-035-PR
- 発動: toujyou / 分類: optional_self_wait_opp_stage
- カード文: 相手の控え室にあるメンバーカードを3枚選び、相手のデッキの下に好きな順番で置いてもよい。そうした場合、相手のステージにいる元々持つ{{icon_blade.png\|ブレード}}の数が3つ以下のメンバー1人をウェイトにする。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.waiting_to_bottom | 控え室にあるメンバーカードを3枚選び、相手のデッキの下に好きな順番で置 |
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.choose_order | 好きな順番 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 相手の控え室にあるメンバーカードを3枚選び、相手のデッキの下に好きな順番で置いてもよい。そうした場合、相手のステージにいる元々持つブレードの数が3つ以下のメンバー1人をウェイトにする。 |

### PL!N-PR-036-PR 桜坂しずく — suspect

- 同型: PL!N-PR-036-PR
- 発動: live_start / 分類: grant_jouji_session
- カード文: ライブ終了時まで、自分のステージにいるほかの『虹ヶ咲』のメンバー1人は{{heart_03.png\|heart03}}を得る。そのメンバーのコストが15以上の場合、さらに{{heart_03.png\|heart03}}を得る。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: heart_grant_mismatch | effect.grant_heart | heart03を得る |
| contract_mismatch: 分類結果がカード文の要求と一致しない: heart_grant_mismatch | effect.grant_heart | heart03を得る |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | ライブ終了時まで、自分のステージにいるほかの『虹ヶ咲』のメンバー1人はheart03を得る。そのメンバーのコストが15以上の場合、さらにheart03を得る。 |
| repeated_action_needs_review: 同種の処理が複数回現れる。実行回数・分岐・順序の静的保証はしていない。 | effect.grant_heart | ライブ終了時まで、自分のステージにいるほかの『虹ヶ咲』のメンバー1人はheart03を得る。そのメンバーのコストが15以上の場合、さらにheart03を得る。 |
| followup_needs_review: 後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。 | text.followup | そのメンバーのコストが15以上の場合、 |

### PL!S-bp3-021-L 想いよひとつになれ — suspect

- 同型: PL!S-bp3-021-L
- 発動: live_start / 分類: grant_jouji_session
- カード文: 自分の控え室にあるメンバーカード1枚をデッキの一番上に置いてもよい。そうした場合、ライブ終了時まで、自分のステージにいるメンバー1人は、{{icon_blade.png\|ブレード}}を得る。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| missing_processing_contract: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | effect.waiting_to_top | 控え室にあるメンバーカード1枚をデッキの一番上に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | 自分の控え室にあるメンバーカード1枚をデッキの一番上に置いてもよい。そうした場合、ライブ終了時まで、自分のステージにいるメンバー1人は、ブレードを得る。 |

### PL!SP-bp5-005-AR 葉月 恋 — suspect

- 同型: PL!SP-bp5-005-AR, PL!SP-bp5-005-P, PL!SP-bp5-005-R＋, PL!SP-bp5-005-SEC
- 発動: kidou / 分類: grant_jouji_session
- カード文: {{turn1.png\|ターン1回}}デッキの上からカードを3枚控え室に置く：ライブ終了時まで、これにより控え室に置いた『Liella!』のメンバーカード1枚につき、{{icon_blade.png\|ブレード}}を得る。 

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: amount_mismatch | effect.grant_blade | ブレードを得る |

### PL!SP-pb2-002-R 唐 可可 — suspect

- 同型: PL!SP-pb2-002-R, PL!SP-pb2-002-PP
- 発動: kidou / 分類: ability_sequence
- カード文: {{turn1.png\|ターン1回}}手札の『Liella!』のカードを1枚控え室に置く：以下から1つを選ぶ。これにより控え室に置いたカードがブレードハートを持たないメンバーカードの場合、代わりに1つ以上を選ぶ。 ・自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く。 ・ライブ終了時まで、自分のステージにいるこのメンバー以外の『Liella!』のメンバー1人は、{{heart_06.png\|heart06}}{{heart_06.png\|heart06}}を得る。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | cost.hand_to_waiting | 手札の『Liella!』のカードを1枚控え室に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.no_blade_heart | ブレードハートを持たない |
| template_contract_missing: 未登録テンプレート。対応済みとは判定しない。 | contract | ターン1回手札の『Liella!』のカードを1枚控え室に置く:以下から1つを選ぶ。これにより控え室に置いたカードがブレードハートを持たないメンバーカードの場合、代わりに1つ以上を選ぶ。・自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く。・ライブ終了時まで、自分のステージにいるこのメンバー以外の『Liella!』のメンバー1人は、heart06heart06を得る。 |
| followup_needs_review: 後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。 | text.followup | 以下から1つを選ぶ |
| followup_needs_review: 後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。 | text.followup | これにより控え室に置いたカードがブレードハートを持たないメンバーカードの場合、代わりに1つ以上を選ぶ |
| followup_needs_review: 後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。 | text.followup | ・自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く |

### PL!SP-pb2-013-P＋ 唐 可可 — suspect

- 同型: PL!SP-pb2-013-P＋, PL!SP-pb2-013-R
- 発動: toujyou / 分類: ability_sequence
- カード文: 手札の『KALEIDOSCORE』のカードを1枚控え室に置いてもよい：自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く。これにより控え室に置いたカードがブレードハートを持たない場合、カードを1枚引く。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | cost.hand_to_waiting | 手札の『KALEIDOSCORE』のカードを1枚控え室に置 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.no_blade_heart | ブレードハートを持たない |
| template_contract_missing: 未登録テンプレート。対応済みとは判定しない。 | contract | 手札の『KALEIDOSCORE』のカードを1枚控え室に置いてもよい:自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く。これにより控え室に置いたカードがブレードハートを持たない場合、カードを1枚引く。 |
| followup_needs_review: 後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。 | text.followup | 自分のエネルギーデッキから、エネルギーカードを1枚ウェイト状態で置く |

### PL!SP-PR-009-PR 米女メイ — suspect

- 同型: PL!SP-PR-009-PR, PL!SP-PR-011-PR, PL!SP-PR-012-PR
- 発動: live_start / 分類: ability_sequence
- カード文: 手札を1枚控え室に置いてもよい：ライブ終了時まで、{{icon_blade.png\|ブレード}}を得る。これによりライブカードを控え室に置いた場合、さらにカードを1枚引く。

| 指摘 | 処理要素 | 根拠の文言 |
|---|---|---|
| contract_mismatch: 分類結果がカード文の要求と一致しない: missing_field | effect.draw | カードを1枚引 |
| requirement_not_verified: カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。 | condition.other | ライブ終了時まで、ブレードを得る。これによりライブカードを控え室に置いた場合、さらにカードを1枚引く。 |
| template_contract_missing: 未登録テンプレート。対応済みとは判定しない。 | contract | 手札を1枚控え室に置いてもよい:ライブ終了時まで、ブレードを得る。これによりライブカードを控え室に置いた場合、さらにカードを1枚引く。 |
| followup_needs_review: 後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。 | text.followup | これによりライブカードを控え室に置いた場合、 |

## 要確認の集計

未登録の契約・未知の文言等の要確認は、バグと断定せずテンプレート別に集計する。各行のカードIDは最大4例。全件のカード文・要求・指摘はJSONのrecordsにあり、単一カードの --card 監査でも詳細を出せる。

| 分類 | セグメント数 | カード数 | カードID例 |
|---|---:|---:|---|
| deck_top_pick_recover | 127 | 127 | PL!-pb2-013-P＋, PL!-pb2-013-R, PL!-pb2-026-N, PL!-pb2-032-N |
| blade_conditional | 105 | 99 | PL!-bp4-020-SRL, PL!-pb2-004-PP, PL!-pb2-004-R, PL!-pb2-011-P＋ |
| draw_then_hand_discard | 84 | 84 | PL!N-bp7-023-N, PL!SP-bp7-026-L, PL!SP-bp4-026-SRL, PL!SP-pb2-036-N |
| live_card_score_plus | 74 | 74 | PL!-bp3-019-SRL, PL!-bp3-025-SRL, PL!-bp3-024-SRL, PL!-bp3-026-SRL |
| grant_jouji_session | 62 | 62 | PL!-pb2-005-PP, PL!-pb2-005-R, PL!N-bp7-024-N, PL!S-bp2-023-SECL |
| draw_from_deck | 44 | 44 | PL!-pb1-032-SRL, PL!-pb2-018-P＋, PL!-pb2-018-R, PL!N-bp7-013-N |
| heart_color_pick_grant | 36 | 36 | PL!-bp3-024-SRL, PL!N-bp7-012-P, PL!N-bp7-012-R, PL!N-bp7-016-N |
| toujou_wait_pick_hand | 36 | 36 | PL!N-bp7-002-P, PL!N-bp7-002-R, PL!S-bp7-007-P, PL!S-bp7-007-P＋ |
| deck_top_look_reorder | 35 | 35 | PL!-sd1-019-SRL, PL!N-bp7-006-P, PL!N-bp7-006-P＋, PL!N-bp7-006-R＋ |
| activate_energy | 34 | 34 | PL!SP-bp7-007-P, PL!SP-bp7-007-P＋, PL!SP-bp7-007-R＋, PL!SP-bp7-007-SEC |
| optional_energy_blade_until_live_end | 32 | 32 | PL!N-sd2-004-SD2, PL!N-sd2-008-SD2, PL!SP-pb2-040-N, PL!HS-cl1-005-CL |
| live_start_position_change | 30 | 30 | PL!-bp4-020-SRL, PL!SP-bp7-022-N, PL!SP-pb2-011-PP, PL!SP-pb2-011-R |
| ability_pick_one | 30 | 26 | PL!N-bp7-005-P, PL!N-bp7-005-R, PL!S-bp7-003-P, PL!S-bp7-003-R＋ |
| energy_deck_to_wait | 30 | 30 | PL!SP-bp7-007-P, PL!SP-bp7-007-P＋, PL!SP-bp7-007-R＋, PL!SP-bp7-007-SEC |
| kidou_hand_cost_wait_pick_hand | 25 | 25 | PL!-pb2-012-P＋, PL!-pb2-012-R, PL!SP-sd2-006-SD2, PL!-bp5-009-R |
| live_score_plus | 25 | 25 | PL!-pb2-038-L, PL!SP-bp7-003-P＋, PL!SP-bp7-003-P, PL!SP-bp7-003-R＋ |
| kidou_wait_pick_hand | 20 | 20 | PL!N-sd2-001-SD2, PL!-bp3-008-P, PL!-bp3-008-R＋, PL!-bp3-008-SEC |
| ability_sequence | 14 | 14 | PL!-pb2-007-PP, PL!-pb2-007-R, PL!S-bp7-001-P, PL!S-bp7-001-R |
| live_start_need_heart_reduce_fixed | 13 | 13 | PL!-bp3-023-SRL, PL!-pb1-030-SRL, PL!S-bp7-020-L, PL!S-bp7-020-SECL |
| optional_self_wait_opp_stage | 13 | 9 | PL!-pb2-029-N, PL!N-sd2-013-SD2, PL!S-bp6-001-P, PL!S-bp6-001-R |
| activate_stage_members_up_to | 11 | 11 | PL!-pb2-016-P＋, PL!-pb2-017-P＋, PL!-pb2-017-R, PL!-pb2-016-R |
| toujou_hand_stage_enter | 11 | 11 | PL!N-pb1-013-P＋, PL!N-pb1-013-R, PL!N-pb1-015-P＋, PL!N-pb1-015-R |
| jidou_area_move_grant_jouji | 10 | 10 | PL!SP-bp7-014-N, PL!SP-sd2-002-SD2, PL!SP-sd2-002-P, PL!SP-sd2-012-SD2 |
| yell_resolution_pick_hand | 9 | 9 | PL!-pb2-037-L, PL!N-bp1-026-SECL, PL!SP-bp2-025-SRL, PL!HS-cl1-012-CL |
| jidou_move_or_energy_draw_grant | 9 | 9 | PL!SP-bp7-005-P, PL!SP-bp7-005-P＋, PL!SP-bp7-005-R＋, PL!SP-bp7-005-SEC |
| two_member_baton | 8 | 8 | PL!-pb2-000-R, PL!-pb2-000-DUO, PL!SP-pb2-000-DUO, PL!SP-pb2-000-R |
| stage_all_areas_grant_quoted | 8 | 8 | PL!S-bp2-008-P, PL!S-bp2-008-SEC, PL!S-bp2-008-P＋, PL!S-bp2-008-R＋ |
| live_score_higher_energy_wait | 7 | 7 | PL!SP-bp1-023-SRL, PL!N-bp5-012-AR, PL!N-bp5-012-P, PL!N-bp5-012-R＋ |
| live_success_recover_from_waiting | 6 | 6 | PL!-pb1-030-SRL, LL-bp7-001-R＋, PL!HS-bp6-025-L, PL!HS-pb1-025-L |
| live_start_opp_wait_max_cost | 6 | 6 | PL!-pb2-024-N, PL!N-sd2-019-SD2, PL!SP-pb2-029-N, PL!SP-pb2-047-L |
| waiting_pick_to_deck | 6 | 6 | PL!N-bp7-011-P, PL!N-bp7-011-P＋, PL!N-bp7-011-R＋, PL!N-bp7-011-SEC |
| deck_mill_conditional_grant | 6 | 6 | PL!N-bp7-020-N, PL!S-bp7-006-P, PL!S-bp7-006-R, PL!S-bp7-011-N |
| live_start_pick_player_waiting_deck_bottom | 6 | 6 | PL!S-bp7-013-N, PL!N-bp3-010-P, PL!N-bp3-010-R, PL!S-bp3-007-R |
| stage_cost_plus | 6 | 6 | PL!SP-bp7-002-P, PL!SP-bp7-002-R, PL!-bp4-008-P, PL!-bp4-008-R |
| yell_resolution_pick_deck_top | 6 | 6 | PL!SP-bp7-023-L, PL!SP-bp7-023-SECL, PL!HS-bp6-001-P, PL!HS-bp6-001-P＋ |
| draw_then_conditional_extra_draw | 6 | 6 | PL!N-sd2-007-SD2, PL!N-sd2-007-P, PL!-bp6-023-L, PL!SP-sd2-003-SD2 |
| live_start_need_heart_set_fixed | 6 | 6 | PL!SP-bp1-026-SECL, PL!SP-bp1-026-SRL, PL!SP-sd2-023-P, PL!SP-sd2-023-SD2 |
| kidou_waiting_to_empty_stage | 6 | 6 | PL!HS-bp6-016-R, PL!HS-bp5-002-AR, PL!HS-bp5-002-P, PL!HS-bp5-002-R＋ |
| kidou_self_wait_stage_member_swap_recover | 6 | 6 | PL!S-bp6-003-P, PL!S-bp6-003-R, PL!S-bp3-006-P, PL!S-bp3-006-R＋ |
| jidou_area_move_opp_wait | 6 | 6 | PL!S-bp5-111-P＋, PL!S-bp5-111-R, PL!SP-bp4-011-P, PL!SP-bp4-011-P＋ |
| live_start_need_heart_reduce_per_unit | 5 | 5 | PL!-bp5-020-SRL, PL!-bp5-023-SRL, PL!-bp5-020-L, PL!-bp5-023-L |
| live_card_score_plus_per_unit | 5 | 5 | PL!-pb2-039-L, PL!SP-pb2-045-L, PL!N-bp3-031-L, PL!HS-bp2-020-L |
| energy_deck_under_member | 5 | 5 | PL!N-bp7-007-P, PL!N-bp7-007-P＋, PL!N-bp7-007-R＋, PL!N-bp7-007-SEC |
| toujou_optional_all_members_relocate | 5 | 5 | PL!S-bp7-012-N, PL!SP-pb2-014-P＋, PL!SP-pb2-014-R, PL!HS-bp2-006-P |
| live_success_pick_options | 5 | 5 | PL!S-bp7-025-L, PL!SP-pb2-010-PP, PL!SP-pb2-010-R, PL!HS-cl1-011-CL |
| kidou_stage_wait_pick_hand | 5 | 5 | PL!SP-bp7-010-P, PL!SP-bp7-010-R, PL!S-bp3-008-R, PL!S-bp3-008-P |
| heart_color_pick_replace | 5 | 5 | PL!SP-pb2-030-N, PL!N-pb1-034-N, PL!N-pb1-036-N, PL!N-bp3-014-N |
| grant_hand_series_cost_reduce | 5 | 5 | PL!-bp6-019-L, PL!SP-bp5-003-AR, PL!SP-bp5-003-P, PL!SP-bp5-003-SEC |
| kidou_self_to_wait_recover | 5 | 5 | PL!S-bp6-008-R, PL!S-bp6-008-P, PL!HS-bp1-002-RM, PL!HS-bp1-002-P |
| draw_then_hand_to_deck_top | 5 | 5 | PL!S-bp6-019-L, PL!S-sd1-004-SD, PL!N-bp4-009-P, PL!N-bp4-009-R |
| toujou_deck_top_wait_if_all_heart | 5 | 5 | PL!HS-PR-019-RM, PL!HS-PR-021-RM, PL!HS-sd1-013-SD, PL!HS-PR-019-PR |
| toujou_deck_top_liella_live_pick | 4 | 4 | PL!-pb2-008-PP, PL!-pb2-008-R, PL!SP-bp4-002-P, PL!SP-bp4-002-R |
| kidou_mill_waiting_under_copy_printed_hearts | 4 | 4 | PL!N-bp7-003-P, PL!N-bp7-003-P＋, PL!N-bp7-003-SEC, PL!N-bp7-003-R＋ |
| deck_mill_conditional_pick_one | 4 | 4 | PL!N-bp7-006-P, PL!N-bp7-006-P＋, PL!N-bp7-006-R＋, PL!N-bp7-006-SEC |
| heart_per_energy_below | 4 | 4 | PL!N-bp7-007-P, PL!N-bp7-007-P＋, PL!N-bp7-007-R＋, PL!N-bp7-007-SEC |
| heart_per_energy_above | 4 | 4 | PL!N-bp7-007-P, PL!N-bp7-007-P＋, PL!N-bp7-007-R＋, PL!N-bp7-007-SEC |
| jidou_self_deck_to_waiting_discard_recover | 4 | 4 | PL!N-bp7-011-P, PL!N-bp7-011-P＋, PL!N-bp7-011-R＋, PL!N-bp7-011-SEC |
| play_cost_reduce_shuffle_waiting_members | 4 | 4 | PL!N-bp7-011-P, PL!N-bp7-011-P＋, PL!N-bp7-011-R＋, PL!N-bp7-011-SEC |
| waiting_member_under_stage | 4 | 4 | PL!S-bp7-005-P＋, PL!S-bp7-005-P, PL!S-bp7-005-SEC, PL!S-bp7-005-R＋ |
| blade_grant_series_with_member_under | 4 | 4 | PL!S-bp7-005-P＋, PL!S-bp7-005-P, PL!S-bp7-005-SEC, PL!S-bp7-005-R＋ |
| kidou_self_and_other_resolve_toujou | 4 | 4 | PL!S-bp7-005-P＋, PL!S-bp7-005-P, PL!S-bp7-005-SEC, PL!S-bp7-005-R＋ |
| waiting_to_deck_bottom_blade_per | 4 | 4 | PL!S-bp7-007-P, PL!S-bp7-007-P＋, PL!S-bp7-007-R＋, PL!S-bp7-007-SEC |
| blade_per_member_under | 4 | 4 | PL!SP-bp7-003-P＋, PL!SP-bp7-003-P, PL!SP-bp7-003-R＋, PL!SP-bp7-003-SEC |
| jidou_enter_or_energy_returned_energy_wait | 4 | 4 | PL!SP-bp7-005-P, PL!SP-bp7-005-P＋, PL!SP-bp7-005-R＋, PL!SP-bp7-005-SEC |
| hand_cost_reduce | 4 | 4 | PL!N-sd2-003-SD2, PL!SP-bp5-017-N, PL!-pb1-014-P＋, PL!-pb1-014-R |
| optional_pick_member_wait_opp_blade_gap | 4 | 2 | PL!SP-pb2-009-R, PL!SP-pb2-009-PP |
| live_start_hand_reveal_under_heart_grant | 4 | 4 | PL!-bp6-003-P, PL!-bp6-003-P＋, PL!-bp6-003-R＋, PL!-bp6-003-SEC |
| live_success_enter_under_member | 4 | 4 | PL!-bp6-003-P, PL!-bp6-003-P＋, PL!-bp6-003-R＋, PL!-bp6-003-SEC |
| kidou_heart_color_deck_reveal_pick | 4 | 4 | PL!-bp6-006-P, PL!-bp6-006-P＋, PL!-bp6-006-R＋, PL!-bp6-006-SEC |
| deck_top_reveal_hand_score_grant | 4 | 4 | PL!-bp6-007-P, PL!-bp6-007-R＋, PL!-bp6-007-SEC, PL!-bp6-007-P＋ |
| deck_top_count_stage_plus | 4 | 4 | PL!HS-bp6-001-P, PL!HS-bp6-001-P＋, PL!HS-bp6-001-SEC, PL!HS-bp6-001-R＋ |
| live_start_hand_discard_cost_boost_grant_if | 4 | 4 | PL!HS-bp6-005-P＋, PL!HS-bp6-005-P, PL!HS-bp6-005-SEC, PL!HS-bp6-005-R＋ |
| hand_cost_per_series_on_stage | 4 | 4 | PL!HS-bp6-006-P＋, PL!HS-bp6-006-R＋, PL!HS-bp6-006-P, PL!HS-bp6-006-SEC |
| baton_series_only | 4 | 4 | PL!HS-bp6-006-P＋, PL!HS-bp6-006-R＋, PL!HS-bp6-006-P, PL!HS-bp6-006-SEC |
| live_success_wait_skip_next_activate | 4 | 4 | PL!HS-bp6-006-P＋, PL!HS-bp6-006-R＋, PL!HS-bp6-006-P, PL!HS-bp6-006-SEC |
| jidou_live_zone_to_waiting_deck | 4 | 4 | PL!S-bp6-002-P, PL!S-bp6-002-P＋, PL!S-bp6-002-SEC, PL!S-bp6-002-R＋ |
| live_start_live_frame_pick_deck_top | 4 | 4 | PL!S-bp6-004-P, PL!S-bp6-004-P＋, PL!S-bp6-004-R＋, PL!S-bp6-004-SEC |
| blade_per_success_live_above_opponent | 4 | 4 | PL!S-bp6-009-P, PL!S-bp6-009-P＋, PL!S-bp6-009-R＋, PL!S-bp6-009-SEC |
| yell_reveal_series_live_score_plus | 4 | 4 | PL!S-bp6-009-P, PL!S-bp6-009-P＋, PL!S-bp6-009-R＋, PL!S-bp6-009-SEC |
| blade_if_character_on_stage | 4 | 3 | PL!HS-pb1-022-N, PL!HS-sd1-004-SD, PL!HS-sd1-005-SD |
| deck_top_count_live_score_plus | 4 | 4 | PL!-bp5-001-P, PL!-bp5-001-AR, PL!-bp5-001-R＋, PL!-bp5-001-SEC |
| kidou_hand_discard_series_branch | 4 | 4 | PL!-bp5-003-AR, PL!-bp5-003-P, PL!-bp5-003-R＋, PL!-bp5-003-SEC |
| kidou_opp_wait_group_discount_energy | 4 | 4 | PL!-bp5-004-AR, PL!-bp5-004-P, PL!-bp5-004-R＋, PL!-bp5-004-SEC |
| jidou_yell_grant_jouji_nobh_members | 4 | 4 | PL!-bp5-004-AR, PL!-bp5-004-P, PL!-bp5-004-R＋, PL!-bp5-004-SEC |
| deck_mill_conditional_blade_grant | 4 | 4 | PL!HS-bp5-001-AR, PL!HS-bp5-001-R＋, PL!HS-bp5-001-SEC, PL!HS-bp5-001-P |
| kidou_reveal_live_wait_pick_name_contains | 4 | 4 | PL!HS-bp5-001-AR, PL!HS-bp5-001-R＋, PL!HS-bp5-001-SEC, PL!HS-bp5-001-P |
| jidou_leave_stage_position_change | 4 | 4 | PL!HS-bp5-003-AR, PL!HS-bp5-003-P, PL!HS-bp5-003-R＋, PL!HS-bp5-003-SEC |
| live_start_hand_discard_group_member_grant | 4 | 4 | PL!HS-bp5-003-AR, PL!HS-bp5-003-P, PL!HS-bp5-003-R＋, PL!HS-bp5-003-SEC |
| jidou_yell_distinct_bh_tier_grant | 4 | 4 | PL!N-bp5-001-AR, PL!N-bp5-001-P, PL!N-bp5-001-R＋, PL!N-bp5-001-SEC |
| jidou_leave_baton_partner_bh_threshold_energy | 4 | 4 | PL!N-bp5-005-AR, PL!N-bp5-005-P, PL!N-bp5-005-SEC, PL!N-bp5-005-R＋ |
| grant_hand_no_ability_cost_reduce | 4 | 4 | PL!S-bp5-001-AR, PL!S-bp5-001-P, PL!S-bp5-001-R＋, PL!S-bp5-001-SEC |
| live_start_side_cost_equal_opp_wait | 4 | 4 | PL!S-bp5-002-AR, PL!S-bp5-002-P, PL!S-bp5-002-R＋, PL!S-bp5-002-SEC |
| kidou_wait_or_hand_for_energy | 4 | 4 | PL!SP-bp5-001-P, PL!SP-bp5-001-SEC, PL!SP-bp5-001-R＋, PL!SP-bp5-001-AR |
| live_start_activate_liella_and_energy | 4 | 4 | PL!SP-bp5-003-AR, PL!SP-bp5-003-P, PL!SP-bp5-003-SEC, PL!SP-bp5-003-R＋ |
| jidou_card_to_waiting_pick_hand | 4 | 4 | PL!SP-bp5-005-AR, PL!SP-bp5-005-P, PL!SP-bp5-005-R＋, PL!SP-bp5-005-SEC |
| live_start_draw_opp_wait | 4 | 4 | PL!N-bp4-004-P, PL!N-bp4-004-R＋, PL!N-bp4-004-SEC, PL!N-bp4-004-P＋ |
| waiting_to_deck_top_by_opp_wait_count | 4 | 4 | PL!N-bp4-004-P, PL!N-bp4-004-R＋, PL!N-bp4-004-SEC, PL!N-bp4-004-P＋ |
| toujou_both_wait_pick_live_hand | 4 | 4 | PL!N-bp4-007-P, PL!N-bp4-007-P＋, PL!N-bp4-007-R＋, PL!N-bp4-007-SEC |
| both_players_energy_deck_wait | 4 | 4 | PL!N-bp4-007-P, PL!N-bp4-007-P＋, PL!N-bp4-007-R＋, PL!N-bp4-007-SEC |
| success_live_waiting_swap | 4 | 4 | PL!N-bp4-010-P＋, PL!N-bp4-010-R＋, PL!N-bp4-010-P, PL!N-bp4-010-SEC |
| live_start_pick_live_frame_match_success_live_grant | 4 | 4 | PL!N-bp4-010-P＋, PL!N-bp4-010-R＋, PL!N-bp4-010-P, PL!N-bp4-010-SEC |
| live_success_deck_wait_pick_live | 4 | 4 | PL!N-bp4-011-P, PL!N-bp4-011-R＋, PL!N-bp4-011-SEC, PL!N-bp4-011-P＋ |
| toujou_optional_wait_to_deck_top | 4 | 4 | PL!N-bp4-021-N, PL!HS-PR-036-PR, PL!N-PR-032-PR, PL!S-PR-044-PR |
| toujou_liella_double_baton_center | 4 | 4 | PL!SP-bp4-004-P, PL!SP-bp4-004-P＋, PL!SP-bp4-004-R＋, PL!SP-bp4-004-SEC |
| toujou_bibi_wait_opp_active_wait | 4 | 2 | PL!-pb1-015-P＋, PL!-pb1-015-R |
| live_start_activate_all_stage_members | 4 | 4 | PL!-bp3-001-P, PL!-bp3-001-R, PL!-bp3-005-P, PL!-bp3-005-R |
| draw_per_stage_member_discard | 4 | 4 | PL!-bp3-004-P＋, PL!-bp3-004-SEC, PL!-bp3-004-P, PL!-bp3-004-R＋ |
| toujou_success_live_pick_hand | 4 | 4 | PL!-bp3-004-P＋, PL!-bp3-004-SEC, PL!-bp3-004-P, PL!-bp3-004-R＋ |
| jidou_stage_entry_draw_until | 4 | 4 | PL!N-bp3-005-P, PL!N-bp3-005-P＋, PL!N-bp3-005-R＋, PL!N-bp3-005-SEC |
| live_start_hand_discard_activate_wait_grant | 4 | 4 | PL!N-bp3-008-P＋, PL!N-bp3-008-R＋, PL!N-bp3-008-P, PL!N-bp3-008-SEC |
| live_start_waiting_deck_bottom_tiered | 4 | 4 | PL!N-bp3-009-P, PL!N-bp3-009-R＋, PL!N-bp3-009-SEC, PL!N-bp3-009-P＋ |
| kidou_wait_member_grant_jouji | 4 | 4 | PL!S-bp3-001-P, PL!S-bp3-001-P＋, PL!S-bp3-001-R＋, PL!S-bp3-001-SEC |
| live_start_hand_discard_optional_blade_per | 4 | 4 | PL!S-bp3-003-P, PL!S-bp3-003-P＋, PL!S-bp3-003-R＋, PL!S-bp3-003-SEC |
| jidou_yell_draw | 4 | 4 | PL!S-bp2-007-P, PL!S-bp2-007-P＋, PL!S-bp2-007-SEC, PL!S-bp2-007-R＋ |
| live_start_hand_live_to_deck_bottom_look | 4 | 4 | PL!S-bp2-007-P, PL!S-bp2-007-P＋, PL!S-bp2-007-SEC, PL!S-bp2-007-R＋ |
| waiting_to_deck_bottom | 4 | 4 | PL!S-bp2-008-P, PL!S-bp2-008-SEC, PL!S-bp2-008-P＋, PL!S-bp2-008-R＋ |
| toujou_optional_disable_live_start_recover_wait | 4 | 4 | PL!SP-bp2-001-P, PL!SP-bp2-001-P＋, PL!SP-bp2-001-R＋, PL!SP-bp2-001-SEC |
| toujou_baton_discarded_pick_hand | 4 | 4 | PL!SP-bp2-006-P, PL!SP-bp2-006-P＋, PL!SP-bp2-006-R＋, PL!SP-bp2-006-SEC |
| kidou_hand_discard_trigger_ability | 4 | 4 | PL!SP-bp2-006-P, PL!SP-bp2-006-P＋, PL!SP-bp2-006-R＋, PL!SP-bp2-006-SEC |
| live_start_hand_blade_per | 4 | 4 | PL!SP-bp2-009-R＋, PL!SP-bp2-009-P, PL!SP-bp2-009-SEC, PL!SP-bp2-009-P＋ |
| opponent_live_need_heart | 4 | 4 | PL!SP-bp2-010-P, PL!SP-bp2-010-R＋, PL!SP-bp2-010-P＋, PL!SP-bp2-010-SEC |
| live_start_yell_reveal_reduction | 4 | 4 | PL!SP-bp2-010-P, PL!SP-bp2-010-R＋, PL!SP-bp2-010-P＋, PL!SP-bp2-010-SEC |
| live_start_optional_energy_blade_per_live_frame | 4 | 4 | PL!HS-bp1-004-P, PL!HS-bp1-004-P＋, PL!HS-bp1-004-R＋, PL!HS-bp1-004-SEC |
| kidou_wait_to_stage | 4 | 4 | PL!N-bp1-002-P, PL!N-bp1-002-P＋, PL!N-bp1-002-R＋, PL!N-bp1-002-SEC |
| kidou_reveal_hand_cost_threshold | 4 | 4 | PL!SP-bp1-003-P, PL!SP-bp1-003-P＋, PL!SP-bp1-003-SEC, PL!SP-bp1-003-R＋ |
| live_start_deck_reveal_both_stage_members_score | 3 | 3 | PL!-bp3-022-SECL, PL!-bp3-022-SRL, PL!-bp3-022-L |
| jidou_baton_leave_activate_energy | 3 | 3 | PL!-pb2-009-PP, PL!-pb2-009-R, PL!HS-sd1-001-SD |
| toujou_success_live_hand_reveal_swap | 3 | 3 | PL!-pb2-014-P＋, PL!-pb2-014-R, PL!-sd1-006-SD |
| live_start_need_heart_reduce_per_enter_or_move | 3 | 3 | PL!SP-pb1-025-SECL, PL!SP-pb1-025-SRL, PL!SP-pb1-025-L |
| live_start_yell_blade_remap_slot | 3 | 3 | PL!SP-bp4-023-SRL, PL!N-bp4-025-L, PL!SP-bp4-023-L |
| energy_tier_hearts | 3 | 3 | PL!SP-pb2-023-N, PL!SP-pb2-027-N, PL!SP-pb2-032-N |
| jidou_area_move_activate_energy | 3 | 3 | PL!SP-pb2-028-N, PL!S-bp5-222-R, PL!S-bp5-222-P＋ |
| kidou_discard_self_draw_grant | 3 | 3 | PL!HS-bp6-014-R, PL!N-pb1-003-P＋, PL!N-pb1-003-R |
| jidou_leave_stage_hand_pick_recover | 3 | 3 | PL!HS-bp6-017-N, PL!S-bp2-002-P, PL!S-bp2-002-R |
| live_start_moved_members_blade_grant | 3 | 3 | PL!SP-sd2-025-P, PL!SP-sd2-025-SD2, PL!S-bp5-022-L |
| energy_deck_to_active | 3 | 3 | PL!-bp5-005-AR, PL!-bp5-005-P, PL!-bp5-005-R |
| toujou_baton_both_trim_hand_draw | 3 | 3 | PL!-bp5-007-R, PL!-bp5-007-AR, PL!-bp5-007-P |
| blade_per_stage_member | 3 | 3 | PL!HS-bp5-004-AR, PL!HS-bp5-004-P, PL!HS-bp5-004-R |
| live_start_dollcostra_cost_set_grant_if | 3 | 3 | PL!HS-bp5-005-P, PL!HS-bp5-005-R, PL!HS-bp5-005-AR |
| live_start_hand_discard_same_group_grant | 3 | 3 | PL!HS-bp5-006-AR, PL!HS-bp5-006-P, PL!HS-bp5-006-R |
| blade_if_series_on_stage | 3 | 3 | PL!HS-bp5-007-AR, PL!HS-bp5-007-P, PL!HS-bp5-007-R |
| extra_series_tags_all_zones | 3 | 3 | PL!HS-bp5-018-L, PL!HS-sd1-020-SD, PL!HS-bp2-020-L |
| kidou_hand_discard_wait_live_score_pay | 3 | 3 | PL!N-bp5-003-AR, PL!N-bp5-003-P, PL!N-bp5-003-R |
| cannot_self_activate | 3 | 3 | PL!N-bp5-006-AR, PL!N-bp5-006-P, PL!N-bp5-006-R |
| live_success_self_wait_if_others | 3 | 3 | PL!N-bp5-006-AR, PL!N-bp5-006-P, PL!N-bp5-006-R |
| surplus_heart_score_modifier | 3 | 3 | PL!N-bp5-010-AR, PL!N-bp5-010-P, PL!N-bp5-010-R |
| toujou_optional_pay_wait_recover_grant | 3 | 3 | PL!S-bp5-009-P, PL!S-bp5-009-R, PL!S-bp5-009-AR |
| draw_then_hand_to_deck_bottom | 3 | 3 | PL!S-bp5-014-N, PL!S-sd1-018-SD, PL!S-sd1-017-SD |
| kidou_deck_top_wait_position_change | 3 | 3 | PL!SP-bp5-006-AR, PL!SP-bp5-006-P, PL!SP-bp5-006-R |
| live_start_mill_loop_blade_grant | 3 | 3 | PL!SP-bp5-009-AR, PL!SP-bp5-009-R, PL!SP-bp5-009-P |
| toujou_both_center_position_change | 3 | 3 | PL!SP-bp5-010-P, PL!SP-bp5-010-R, PL!SP-bp5-010-AR |
| toujou_optional_energy_under | 3 | 3 | PL!N-pb1-002-P＋, PL!N-pb1-002-R, PL!N-bp3-013-N |
| kidou_self_wait_hand_enter_energy | 3 | 3 | PL!N-bp3-007-P, PL!N-bp3-007-R, PL!N-bp3-007-PR |
| waiting_reorder_deck_top | 3 | 3 | PL!SP-bp2-013-N, PL!SP-bp2-014-N, PL!SP-bp2-018-N |
| jidou_yell_grant_jouji_no_bh | 3 | 3 | PL!SP-bp2-015-N, PL!SP-bp2-020-N, PL!SP-bp2-021-N |
| live_start_pay_or_hand_discard | 3 | 3 | PL!SP-pb1-001-P＋, PL!SP-pb1-001-R, PL!SP-pb1-001-PR |
| optional_energy_live_score_plus | 3 | 3 | PL!SP-pb1-001-P＋, PL!SP-pb1-001-R, PL!SP-pb1-001-PR |
| toujou_optional_hand_discard_draw | 3 | 3 | PL!HS-bp1-005-P, PL!HS-bp1-005-R, PL!HS-bp1-005-PR |
| jidou_leave_baton_min_cost_blade | 3 | 3 | PL!-PR-025-PR, PL!HS-PR-040-PR, PL!S-PR-047-PR |
| kidou_reveal_all_hand_deck_top_live | 3 | 3 | PL!N-PR-003-PR, PL!N-PR-010-PR, PL!N-PR-008-PR |
| jidou_yell_grant_jouji | 3 | 3 | PL!N-PR-023-PR, PL!S-PR-040-PR, PL!SP-PR-024-PR |
| success_live_self_score_if_series_on_stage | 2 | 2 | PL!-bp4-019-SRL, PL!-bp4-019-L |
| live_start_success_score_tiered_reduce_score | 2 | 2 | PL!-bp4-021-SRL, PL!-bp4-021-L |
| live_success_surplus_heart_slot_draw | 2 | 2 | PL!-bp4-023-SRL, PL!-bp4-023-L |
| live_start_sunny_day_song_tiered | 2 | 2 | PL!-bp5-021-SRL, PL!-bp5-021-L |
| live_start_score_plus_per_success_live | 2 | 2 | PL!-bp5-022-SRL, PL!-bp5-022-L |
| live_start_activate_series_score_by_unwait | 2 | 2 | PL!-pb1-028-SRL, PL!-pb1-028-L |
| opponent_front_enter_wait | 2 | 2 | PL!-pb2-002-PP, PL!-pb2-002-R |
| jidou_yell_score_group_extra | 2 | 2 | PL!-pb2-004-PP, PL!-pb2-004-R |
| live_start_group_activated_blade_per | 2 | 2 | PL!-pb2-010-P＋, PL!-pb2-010-R |
| play_cost_reduce_wait_distinct | 2 | 2 | PL!-pb2-012-P＋, PL!-pb2-012-R |
| jidou_opp_wait_under_group | 2 | 2 | PL!-pb2-011-P＋, PL!-pb2-011-R |
| jidou_opp_wait_group_activate_choice | 2 | 2 | PL!-pb2-015-P＋, PL!-pb2-015-R |
| toujou_waiting_members_under_self | 2 | 2 | PL!-pb2-017-P＋, PL!-pb2-017-R |
| live_start_need_heart_reduce_per_success_live | 2 | 2 | PL!-sd1-022-SRL, PL!-sd1-022-SD |
| jidou_energy_under_placed_energy_wait | 2 | 2 | PL!N-bp7-001-P, PL!N-bp7-001-R |
| kidou_energy_under_opp_wait_by_under | 2 | 2 | PL!N-bp7-004-R, PL!N-bp7-004-P |
| waiting_to_deck_bottom_activate_per | 2 | 2 | PL!N-bp7-008-P, PL!N-bp7-008-R |
| kidou_energy_under_waiting_enter | 2 | 2 | PL!N-bp7-010-P, PL!N-bp7-010-R |
| jidou_own_member_wait_discard_activate | 2 | 2 | PL!N-bp7-022-N, PL!N-sd2-010-SD2 |
| live_start_hand_discard_optional_blade_pick_equal | 2 | 2 | PL!N-bp7-026-L, PL!N-bp7-026-SECL |
| toujou_baton_both_keep_hand_shuffle_deck_bottom_draw | 2 | 2 | PL!S-bp7-004-P, PL!S-bp7-004-R |
| deck_bottom_optional_mill_named_hand | 2 | 2 | PL!S-bp7-008-P, PL!S-bp7-008-R |
| opp_across_lose_blade | 2 | 2 | PL!S-bp7-009-R, PL!S-bp7-009-P |
| deck_mill_conditional_need_heart_reduce | 2 | 2 | PL!S-bp7-020-L, PL!S-bp7-020-SECL |
| yell_from_deck_bottom | 2 | 2 | PL!S-bp7-022-SECL, PL!S-bp7-022-L |
| live_start_pick_stage_member_printed_hearts_remap | 2 | 2 | PL!S-bp7-024-L, PL!HS-bp5-021-L |
| blade_while_under_series_host | 2 | 2 | PL!SP-bp7-001-P, PL!SP-bp7-001-R |
| jidou_leave_baton_self_under_partner | 2 | 2 | PL!SP-bp7-001-P, PL!SP-bp7-001-R |
| waiting_to_deck_bottom_blade_if_moved_no_bh | 2 | 2 | PL!SP-bp7-004-P, PL!SP-bp7-004-R |
| jidou_self_wait_area_move_activate | 2 | 2 | PL!SP-bp7-008-R, PL!SP-bp7-008-P |
| live_start_optional_wait_members_score_per | 2 | 2 | PL!N-sd2-027-P, PL!N-sd2-027-SD2 |
| live_start_named_member_heart_blades | 2 | 2 | PL!SP-bp1-024-SRL, PL!SP-bp1-024-L |
| live_success_characters_draw | 2 | 2 | PL!SP-bp1-024-SRL, PL!SP-bp1-024-L |
| live_start_dazzling_named_liella_grant | 2 | 2 | PL!SP-bp4-023-SRL, PL!SP-bp4-023-L |
| live_start_center_series_blade_set | 2 | 2 | PL!SP-bp4-025-SRL, PL!SP-bp4-025-L |
| live_success_formation_change | 2 | 2 | PL!SP-bp4-027-SRL, PL!SP-bp4-027-L |
| live_start_activate_energy_all_active_score | 2 | 2 | PL!SP-pb1-023-SRL, PL!SP-pb1-023-L |
| toujou_baton_discarded_series_per_card | 2 | 2 | PL!SP-pb2-000-DUO, PL!SP-pb2-000-R |
| deck_top_pick_enter_or_hand | 2 | 2 | PL!SP-pb2-001-PP, PL!SP-pb2-001-R |
| live_success_liella_effect_moved_score | 2 | 2 | PL!SP-pb2-003-PP, PL!SP-pb2-003-R |
| toujou_baton_discarded_under | 2 | 2 | PL!SP-pb2-005-PP, PL!SP-pb2-005-R |
| mirror_under_card_kidou | 2 | 2 | PL!SP-pb2-005-PP, PL!SP-pb2-005-R |
| stage_cost_plus_per_under_series | 2 | 2 | PL!SP-pb2-006-R, PL!SP-pb2-006-PP |
| jidou_live_success_or_area_move_wait_under | 2 | 2 | PL!SP-pb2-006-R, PL!SP-pb2-006-PP |
| live_success_optional_energy_recover_waiting | 2 | 2 | PL!SP-pb2-007-PP, PL!SP-pb2-007-R |
| live_success_yell_nobh_series_score_capped | 2 | 2 | PL!SP-pb2-008-PP, PL!SP-pb2-008-R |
| live_start_mandatory_energy_deck_unless_hand_discard | 2 | 2 | PL!SP-pb2-010-PP, PL!SP-pb2-010-R |
| jidou_center_member_move_choice | 2 | 2 | PL!SP-pb2-011-PP, PL!SP-pb2-011-R |
| jidou_yell_optional_hand_live_extra_yell | 2 | 2 | PL!SP-pb2-020-P＋, PL!SP-pb2-020-R |
| jidou_series_member_to_center_blade_grant | 2 | 2 | PL!SP-pb2-022-P＋, PL!SP-pb2-022-R |
| yell_resolution_count_energy_wait | 2 | 2 | PL!SP-pb2-049-L, PL!SP-PR-018-PR |
| deck_top_pick_no_ability_or_jouji | 2 | 2 | PL!-bp6-002-R, PL!-bp6-002-P |
| toujou_hand_discard_wait_heart_dual_pick | 2 | 2 | PL!-bp6-005-P, PL!-bp6-005-R |
| kidou_self_wait_activate_other | 2 | 2 | PL!-bp6-008-P, PL!-bp6-008-R |
| live_start_optional_hand_discard_named_followup_blade | 2 | 2 | PL!HS-bp6-004-P, PL!HS-bp6-004-R |
| jidou_series_enter_opp_wait | 2 | 2 | PL!HS-bp6-007-P, PL!HS-bp6-007-R |
| live_start_activate_self_if_low_score_live | 2 | 2 | PL!HS-bp6-008-P, PL!HS-bp6-008-R |
| jidou_leave_stage_draw_discard | 2 | 2 | PL!HS-bp6-019-N, PL!HS-bp2-015-N |
| cannot_place_on_success_live | 2 | 2 | PL!S-bp2-024-SECL, PL!S-bp2-024-L |
| toujou_draw_grant_if_from_waiting | 2 | 2 | PL!S-bp6-006-P, PL!S-bp6-006-R |
| live_start_pay_or_discard_conditional_grant_members | 2 | 2 | PL!S-bp6-007-P, PL!S-bp6-007-R |
| jidou_series_enter_pay_energy | 2 | 2 | PL!HS-pb1-001-P＋, PL!HS-pb1-001-R |
| kidou_hand_reveal_to_under | 2 | 2 | PL!HS-pb1-002-P＋, PL!HS-pb1-002-R |
| toujou_hand_discard_draw_plus | 2 | 2 | PL!HS-pb1-003-P＋, PL!HS-pb1-003-R |
| jidou_hand_to_waiting_grant | 2 | 2 | PL!HS-pb1-003-P＋, PL!HS-pb1-003-R |
| live_start_number_reveal_grant_if | 2 | 2 | PL!HS-pb1-005-P＋, PL!HS-pb1-005-R |
| toujou_both_sides_wait_all_printed_blade | 2 | 2 | PL!HS-pb1-008-P＋, PL!HS-pb1-008-R |
| opponent_cannot_activate | 2 | 2 | PL!HS-pb1-008-P＋, PL!HS-pb1-008-R |
| jidou_series_enter_grant | 2 | 2 | PL!HS-pb1-009-R, PL!HS-pb1-009-P＋ |
| toujou_opp_wait_if_high_cost_on_stage | 2 | 2 | PL!HS-pb1-010-P＋, PL!HS-pb1-010-R |
| live_start_opp_wait_if_high_cost_on_stage | 2 | 2 | PL!HS-pb1-010-P＋, PL!HS-pb1-010-R |
| toujou_both_shuffle_deck_bottom_grant_if | 2 | 2 | PL!HS-pb1-012-P＋, PL!HS-pb1-012-R |
| toujou_opp_front_position_change | 2 | 2 | PL!HS-pb1-014-P＋, PL!HS-pb1-014-R |
| blade_if_opponent_across_higher_cost | 2 | 2 | PL!HS-pb1-014-P＋, PL!HS-pb1-014-R |
| lose_blade_if | 2 | 2 | PL!HS-pb1-015-R, PL!HS-pb1-015-P＋ |
| toujou_grant_heart_stage_member | 2 | 2 | PL!HS-pb1-016-P＋, PL!HS-pb1-016-R |
| deck_top_to_waiting | 2 | 2 | PL!HS-pb1-027-L, PL!N-bp5-029-L |
| blade_per_series_on_stage_except_self | 2 | 2 | PL!-bp5-111-P＋, PL!-bp5-111-R |
| kidou_hand_discard_activate_wait_opp_bonus | 2 | 2 | PL!-bp5-111-P＋, PL!-bp5-111-R |
| blade_if_self_wait | 2 | 2 | PL!-bp5-333-P＋, PL!-bp5-333-R |
| live_start_per_series_member_deck_look_reveal_score | 2 | 2 | PL!N-bp3-028-SECL, PL!N-bp3-028-L |
| toujou_grant_opp_live_need_heart_if_stage_hearts | 2 | 2 | PL!S-bp5-010-N, PL!S-bp5-011-N |
| kidou_energy_deck_pick_live | 2 | 2 | PL!SP-bp5-111-P＋, PL!SP-bp5-111-R |
| live_score_if_energy_below | 2 | 2 | PL!N-pb1-002-P＋, PL!N-pb1-002-R |
| jidou_on_cost_enter_draw | 2 | 2 | PL!N-pb1-005-R, PL!N-pb1-005-P＋ |
| blade_if_live_need_all_colors | 2 | 2 | PL!N-pb1-007-R, PL!N-pb1-007-P＋ |
| hand_cost_reduce_if_wait_series_on_stage | 2 | 2 | PL!N-pb1-008-P＋, PL!N-pb1-008-R |
| toujou_pick_member_or_energy | 2 | 2 | PL!N-pb1-008-P＋, PL!N-pb1-008-R |
| blade_per_energy_below | 2 | 2 | PL!N-pb1-011-P＋, PL!N-pb1-011-R |
| kidou_energy_under_pick_waiting_hand | 2 | 2 | PL!N-pb1-011-P＋, PL!N-pb1-011-R |
| jidou_on_cost_enter_energy_wait | 2 | 2 | PL!N-pb1-012-P＋, PL!N-pb1-012-R |
| deck_peek_pick_then_opp_wait | 2 | 1 | LL-bp4-001-R＋ |
| toujou_success_live_low_score_grant | 2 | 2 | PL!-bp4-007-P, PL!-bp4-007-R |
| toujou_opp_active_wait | 2 | 2 | PL!-bp4-009-P, PL!-bp4-009-R |
| energy_less_than_opponent_wait | 2 | 2 | PL!N-bp4-001-P, PL!N-bp4-001-R |
| live_start_pick_player_deck_top_peek | 2 | 2 | PL!N-bp4-002-P, PL!N-bp4-002-R |
| kidou_energy_or_activate_member | 2 | 2 | PL!N-bp4-008-P, PL!N-bp4-008-R |
| jidou_area_move_wait_pick_hand | 2 | 2 | PL!SP-bp4-007-P, PL!SP-bp4-007-R |
| blade_if_lower_stage_cost_sum | 2 | 2 | PL!SP-bp4-009-P, PL!SP-bp4-009-R |
| deck_reveal_until_pick | 2 | 2 | PL!-pb1-001-P＋, PL!-pb1-001-R |
| heart_per_opponent_wait | 2 | 2 | PL!-pb1-002-P＋, PL!-pb1-002-R |
| toujou_success_live_score_tiered | 2 | 2 | PL!-pb1-004-P＋, PL!-pb1-004-R |
| toujou_multi_wait_draw_per_count | 2 | 2 | PL!-pb1-008-P＋, PL!-pb1-008-R |
| toujou_turn_block_effect_activate | 2 | 2 | PL!-pb1-009-P＋, PL!-pb1-009-R |
| kidou_hand_reveal_grant_if_live | 2 | 2 | PL!-pb1-013-R, PL!-pb1-013-P＋ |
| jidou_opp_wait_draw | 2 | 2 | PL!-pb1-015-P＋, PL!-pb1-015-R |
| toujou_self_wait_draw_then_conditional_discard | 2 | 2 | PL!-pb1-017-P＋, PL!-pb1-017-R |
| toujou_both_wait_to_empty_stage | 2 | 2 | PL!-pb1-018-P＋, PL!-pb1-018-R |
| blade_per_opponent_wait | 2 | 2 | PL!-bp3-002-P, PL!-bp3-002-R |
| toujou_wait_pick_trigger_ability | 2 | 2 | PL!N-bp3-003-P, PL!N-bp3-003-R |
| toujou_self_wait_only | 2 | 2 | PL!N-bp3-006-P, PL!N-bp3-006-R |
| toujou_opp_stage_member_match_grant | 2 | 2 | PL!N-bp3-011-R, PL!N-bp3-011-P |
| yell_resolution_pick_self_score | 2 | 2 | PL!S-bp3-002-P, PL!S-bp3-002-R |
| toujou_opp_optional_live_discard_or_score | 2 | 2 | PL!S-pb1-002-P＋, PL!S-pb1-002-R |
| live_start_optional_hearts_wild | 2 | 2 | PL!S-pb1-003-P＋, PL!S-pb1-003-R |
| kidou_reveal_live_opp_decline_grant | 2 | 2 | PL!S-pb1-006-P＋, PL!S-pb1-006-R |
| yell_resolution_energy_wait | 2 | 2 | PL!S-pb1-007-P＋, PL!S-pb1-007-R |
| live_success_tie_block_success_live | 2 | 2 | PL!S-pb1-022-L, PL!S-pb1-022-L＋ |
| blade_per_series_on_stage | 2 | 2 | PL!HS-bp2-006-P, PL!HS-bp2-006-R |
| toujou_baton_series_heart_grant | 2 | 2 | PL!HS-bp2-009-P, PL!HS-bp2-009-R |
| jidou_leave_stage_deck_look_pick | 2 | 2 | PL!HS-bp2-012-N, PL!HS-bp2-013-N |
| jidou_yell_grant_heart | 2 | 2 | PL!S-bp2-003-P, PL!S-bp2-003-R |
| jidou_yell_retry_no_live | 2 | 2 | PL!S-bp2-004-P, PL!S-bp2-004-R |
| toujou_wait_enter_cost_sum | 2 | 2 | PL!S-bp2-006-P, PL!S-bp2-006-R |
| jidou_area_move_energy_wait | 2 | 2 | PL!SP-bp2-003-P, PL!SP-bp2-003-R |
| toujou_wait_pick_opp_live | 2 | 2 | PL!SP-bp2-011-R, PL!SP-bp2-011-P |
| toujou_rotate_stage_areas | 2 | 2 | PL!SP-pb1-003-R, PL!SP-pb1-003-P＋ |
| toujou_draw_then_position_change | 2 | 2 | PL!SP-pb1-008-R, PL!SP-pb1-008-P＋ |
| toujou_optional_self_wait_recover | 2 | 2 | PL!SP-pb1-011-P＋, PL!SP-pb1-011-R |
| toujou_deck_top_wait_if_all_members | 2 | 2 | PL!HS-bp1-008-P, PL!HS-bp1-008-R |
| deck_reveal_until_live | 2 | 2 | PL!N-bp1-011-P, PL!N-bp1-011-R |
| cannot_live_alone | 2 | 2 | PL!SP-bp1-001-P, PL!SP-bp1-001-R |
| jidou_leave_stage_activate_one | 2 | 2 | PL!-PR-001-PR, PL!-PR-002-PR |
| live_start_hand_discard_same_unit_grant | 2 | 2 | PL!HS-PR-016-PR, PL!HS-PR-017-PR |
| live_start_optional_energy_waiting_reorder_deck_top | 2 | 2 | PL!HS-PR-020-PR, PL!HS-PR-023-PR |
| draw_until_hand_size | 2 | 2 | PL!HS-PR-031-PR, PL!N-PR-028-PR |
| waiting_live_to_top_if_small | 2 | 2 | PL!S-PR-048-PR, PL!SP-PR-027-PR |
| jidou_self_wait_activate_blade | 1 | 1 | PL!-pb2-021-N |
| live_start_success_group_extra_yell | 1 | 1 | PL!-pb2-039-L |
| success_count_for_group | 1 | 1 | PL!-pb2-041-L |
| jidou_yell_named_center_opp_wait | 1 | 1 | PL!-pb2-042-L |
| live_start_group_activated_need_reduce | 1 | 1 | PL!-pb2-040-L |
| play_cost_set_named_hand_discard | 1 | 1 | LL-bp7-001-R＋ |
| jidou_leave_stage_recover_no_cost | 1 | 1 | PL!N-bp7-014-N |
| jidou_leave_baton_partner_energy_under | 1 | 1 | PL!N-bp7-019-N |
| live_start_optional_shuffle_all_waiting_grant | 1 | 1 | PL!N-bp7-028-L |
| live_success_under_energy_to_area_score | 1 | 1 | PL!N-bp7-029-L |
| jidou_ability_mill_pick_live_score | 1 | 1 | PL!N-bp7-031-L |
| live_return_hand_then_discard | 1 | 1 | PL!N-bp7-030-L |
| deck_peek_relocate | 1 | 1 | PL!S-bp7-010-N |
| pick_stage_member_to_center | 1 | 1 | PL!S-bp7-018-N |
| live_start_deck_bottom_mill_member_tier | 1 | 1 | PL!S-bp7-021-L |
| live_start_optional_energy_to_deck_opp_adv_score | 1 | 1 | PL!S-bp7-023-L |
| live_start_optional_waiting_shuffle_deck_bottom_grant | 1 | 1 | PL!SP-bp7-028-L |
| live_start_distinct_series_need_heart_shift_score | 1 | 1 | PL!SP-pb2-048-L |
| live_start_optional_formation_change | 1 | 1 | PL!SP-pb2-050-L |
| block_stage_member_live_start | 1 | 1 | PL!SP-pb2-046-L |
| live_success_score_if_stage_live_start_member | 1 | 1 | PL!SP-pb2-046-L |
| live_start_hand_named_discard_hearts_grant | 1 | 1 | LL-bp6-001-R＋ |
| kidou_self_to_wait_opp_wait | 1 | 1 | PL!-bp6-010-N |
| jidou_center_muse_ability_position_change | 1 | 1 | PL!-bp6-020-L |
| jidou_center_muse_ability_score_if_moved | 1 | 1 | PL!-bp6-020-L |
| success_live_live_need_heart_reduce | 1 | 1 | PL!-bp6-022-L |
| live_success_optional_stage_to_waiting_score_recover | 1 | 1 | PL!-bp6-021-L |
| success_live_waiting_substitute | 1 | 1 | PL!-bp6-024-L |
| live_start_opp_wait_exclude_unit | 1 | 1 | PL!HS-bp6-013-R |
| jidou_leave_stage_hand_grant_member | 1 | 1 | PL!HS-bp6-018-N |
| live_start_tiered_stage_cost_deck_look | 1 | 1 | PL!HS-bp6-029-L |
| live_start_optional_shuffle_deck_bottom_grant_if | 1 | 1 | PL!HS-bp6-031-L |
| jidou_yell_discard_nobh_series_multi_extra_yell | 1 | 1 | PL!HS-bp6-027-L |
| toujou_draw_discard_if_from_waiting | 1 | 1 | PL!S-bp6-011-N |
| jidou_yell_discard_nobh_series_extra_yell | 1 | 1 | PL!S-bp6-021-L |
| live_success_opp_lose_surplus_score | 1 | 1 | PL!S-bp6-024-L |
| live_start_draw_then_formation_change | 1 | 1 | PL!SP-sd2-001-SD2 |
| deck_top_peek_optional_wait | 1 | 1 | PL!HS-cl1-001-CL |
| live_start_overflow_heart_tiered_draw_reduce | 1 | 1 | PL!HS-pb1-029-L |
| live_start_trigger_stage_member_live_start | 1 | 1 | PL!HS-pb1-028-L |
| live_start_edelnote_blade_heart_pair | 1 | 1 | PL!HS-pb1-030-L |
| live_success_recover_waiting_diff_group | 1 | 1 | LL-bp5-002-L |
| live_start_deck_top_if_all_members_grant | 1 | 1 | PL!HS-bp5-013-N |
| jidou_member_live_start_grant_all_heart | 1 | 1 | PL!N-bp5-030-L |
| jidou_member_live_success_draw | 1 | 1 | PL!N-bp5-030-L |
| live_success_surplus_heart_score_plus | 1 | 1 | PL!S-bp5-020-L |
| live_start_waiting_lives_reorder_deck_top | 1 | 1 | PL!S-bp5-023-L |
| blade_if_live_need_sum | 1 | 1 | PL!SP-bp5-012-N |
| optional_energy_card_score_plus_per_unit | 1 | 1 | PL!SP-bp5-025-L |
| live_start_moved_members_pick_heart_grant | 1 | 1 | PL!SP-bp5-024-L |
| live_success_optional_energy_wait_opp_draw | 1 | 1 | PL!SP-bp5-027-L |
| toujou_named_stage_activate_recover_wait | 1 | 1 | PL!HS-sd1-006-SD |
| live_start_hand_discard_series_member_blade_grant | 1 | 1 | PL!HS-sd1-020-SD |
| jidou_yell_grant_heart_per_live_capped | 1 | 1 | PL!S-sd1-001-SD |
| live_start_hand_reveal_deck_place_blade | 1 | 1 | PL!S-sd1-009-SD |
| live_success_draw_per_series_then_discard_same | 1 | 1 | PL!S-sd1-020-SD |
| live_start_series_activation_score | 1 | 1 | PL!N-pb1-037-L |
| live_start_stellar_stream_grant | 1 | 1 | PL!N-pb1-039-L |
| jidou_self_active_to_wait_draw_discard | 1 | 1 | PL!N-bp4-018-N |
| jidou_waiting_to_hand_place_named_live | 1 | 1 | PL!N-bp4-026-L |
| jidou_live_placed_grant_stage_member | 1 | 1 | PL!N-bp4-026-L |
| live_start_score_plus_per_named_success_live | 1 | 1 | PL!N-bp4-027-L |
| live_start_tiered_waiting_distinct_score | 1 | 1 | PL!N-bp4-028-L |
| live_success_yell_series_members_all_hearts_score | 1 | 1 | PL!N-bp4-025-L |
| jidou_energy_placed_grant | 1 | 1 | PL!SP-bp4-016-N |
| kidou_wait_shuffle_deck_bottom_activate | 1 | 1 | LL-bp3-001-R＋ |
| live_start_optional_energy_under_return_grant | 1 | 1 | PL!N-bp3-025-L |
| live_success_surplus_heart_energy_wait | 1 | 1 | PL!N-bp3-027-L |
| live_start_tiered_success_live_scores | 1 | 1 | PL!N-bp3-026-L |
| stage_cost_plus_per_success_live | 1 | 1 | PL!S-bp3-016-N |
| live_card_score_set_fixed | 1 | 1 | PL!S-bp3-019-L |
| jidou_yell_retry_low_bh | 1 | 1 | PL!S-bp3-020-L |
| blade_per_own_success_live | 1 | 1 | PL!-sd1-001-SD |
| deck_mill_conditional_draw | 1 | 1 | PL!-sd1-007-SD |
| live_start_disable_self_live_success_if | 1 | 1 | PL!S-pb1-019-L |
| live_success_opponent_energy_deck_wait | 1 | 1 | PL!S-pb1-019-L |
| hand_cost_per_other_hand | 1 | 1 | LL-bp2-001-R＋ |
| cannot_baton_to_waiting | 1 | 1 | LL-bp2-001-R＋ |
| live_start_hand_discard_blade_per | 1 | 1 | LL-bp2-001-R＋ |
| toujou_main_phase_live_from_waiting | 1 | 1 | PL!HS-bp2-018-N |
| live_start_need_heart_set_choice | 1 | 1 | PL!HS-bp2-019-L |
| jidou_area_move_draw | 1 | 1 | PL!SP-pb1-020-N |
| live_start_hand_named_discard_grant_jouji | 1 | 1 | LL-bp1-001-R＋ |
| toujou_draw_per_energy_unit | 1 | 1 | PL!SP-sd1-001-SD |
| live_start_love_screem_opp_answer | 1 | 1 | LL-PR-004-PR |
| toujou_opp_hand_reveal_no_live_draw | 1 | 1 | PL!-PR-014-PR |
| jidou_any_member_wait_blade | 1 | 1 | PL!-PR-023-PR |
| toujou_opp_emma_punch_answer | 1 | 1 | PL!N-PR-022-PR |
| jidou_enter_or_baton_draw | 1 | 1 | PL!N-PR-025-PR |
| toujou_wait_to_member_under | 1 | 1 | PL!N-PR-026-PR |
| mirror_under_card_live_success | 1 | 1 | PL!N-PR-026-PR |
| jidou_waiting_entry_draw | 1 | 1 | PL!N-PR-033-PR |
| live_start_opp_wait_if_stage_hearts | 1 | 1 | PL!SP-PR-021-PR |
| success_live_names_waiting_to_deck_top | 1 | 1 | PL!S-cl1-012-CL |
| waiting_no_bh_bottom_heart_per | 1 | 1 | PL!S-cl1-013-CL |
