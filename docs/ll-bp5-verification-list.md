# アニバーサリー LL-bp5 ライブ（μ's クロス）効果検証リスト

`LL-bp5-001-L` / `LL-bp5-002-L`（ブースターパック Anniversary2026）を検証する。

- 自動回帰: `node scripts/verify-ll-bp5.mjs`
- 全文監査: `node scripts/audit-ll-bp5-text.mjs`

## ライブ

| 状態 | ID | 名前 | 主テンプレート | 備考 |
|------|-----|------|----------------|------|
| [x] | LL-bp5-001-L | Live with a smile! | live_card_score_plus | LS: OR 3条件（エール公開ライブ2+ / ステージ合算ハート5色 / ターン中エリア移動）→ スコア+1 **2026-06-28: scorePlusOrPreconditions** |
| [x] | LL-bp5-002-L | Bring the LOVE! | grant_jouji_session + live_success_recover_waiting_diff_group | LS: 異グループ3人以上→センター全ハート / LS: 控え室からステージと異グループ1枚回収 |

## 2026-06-28 修正

| ID | 内容 |
|----|------|
| LL-bp5-001-L | `live_card_score_plus`: OR 複合条件なしで常時+1になっていたのを修正（`scorePlusOrPreconditions` + 実行時 `checkScorePlusOrPreconditions`） |
| LL-bp5-002-L | 分類・ハンドラ確認のみ（修正不要） |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 2枚再確認。新規コード修正なし |
| LL-bp5-001-L | `scorePlusOrPreconditions`（エール2+ / ステージ5色 / ターン中移動）OR 条件を再確認 |
| LL-bp5-002-L | FAQ Q225 複数名カード=1人分・異グループ3人+センター全ハート / 成功時異グループ回収を再確認 |
| verify | 3ケース通過 |

## FAQ 参照

- **Q224**（001）: ハート5色はステージ全メンバー合算。1人が全色持つ必要はない。
- **Q225**（002）: 複数名カードはメンバー1人分としてグループ名を参照。
