# アニバーサリー クロスメンバー（LL-bp*-001-R＋）効果検証リスト

各弾のクロススクールメンバー1枚（`LL-bp1`〜`LL-bp6` の `-001-R＋`）を検証する。

- 自動回帰: `node scripts/verify-ll-anniversary-member.mjs`
- 全文監査: `node scripts/audit-ll-anniversary-member-text.mjs`

## LL-bp1（001）

| 状態 | ID | 名前 | 主テンプレート | 備考 |
|------|-----|------|----------------|------|
| [x] | LL-bp1-001-R＋ | 歩夢&かのん&花帆 | toujou_wait_pick_hand / live_start_hand_named_discard_grant_jouji | 控え室1枚手札 / LS: 3名合計3枚捨て任意→スコア+3常時 **2026-06-30: 名前解析修正** |

## LL-bp2（001）

| 状態 | ID | 名前 | 主テンプレート | 備考 |
|------|-----|------|----------------|------|
| [x] | LL-bp2-001-R＋ | 曜&夏美&瑠璃乃 | jouji×2 + live_start_hand_discard_blade_per | 常時: 他手札1枚につきコスト-1 / バトン控え室不可 / LS: 3名任意枚捨て→1枚につきブレード1（自カード可） |

## LL-bp3（001）μ's 園田海未

| 状態 | ID | 名前 | 主テンプレート | 備考 |
|------|-----|------|----------------|------|
| [x] | LL-bp3-001-R＋ | 海未&善子&璃奈 | kidou_wait_shuffle_deck_bottom_activate / optional_energy_blade_until_live_end | 起動: 3名いずれか計6枚シャッフル→山札下→E6枚までアク / LS: E6任意→ブレード3 |

## LL-bp4（001）μ's 絢瀬絵里

| 状態 | ID | 名前 | 主テンプレート | 備考 |
|------|-----|------|----------------|------|
| [x] | LL-bp4-001-R＋ | 絵里&果林&恋 | deck_peek_pick_then_opp_wait | 山札5見→3名いずれか1枚公開手札任意→残り控え室→公開コスト以下かつ元々ブレード3以下の相手全員ウェイト |

## LL-bp6（001）μ's ことり・ダイヤ

| 状態 | ID | 名前 | 主テンプレート | 備考 |
|------|-----|------|----------------|------|
| [x] | LL-bp6-001-R＋ | ことり&ダイヤ&小鈴 | deck_top_pick_recover / live_start_hand_named_discard_hearts_grant | 登場: 山札6見→2枚手札・残り控え室 / LS: 3名任意枚捨て→捨て札のハート色和集合を各1つ（ライブ終了まで） **2026-06-30: 色重複・ターン限定バグ修正** |

## 2026-06-30 修正

| ID | 内容 |
|----|------|
| LL-bp1-001-R＋ | `parseQuotedCharacterNames` が付与文「スコア+3」を名前に誤収録 → コスト部分（`：ライブ終了` 前）のみ解析 |
| LL-bp6-001-R＋ | `grantUnionHeartColorsFromDiscardedUntilLiveEnd` — FAQ Q246 通り色の和集合・`playBonusHeartSlotsAlways`（ライブ終了まで） |
| kidou_wait_shuffle_deck_bottom_activate | 控え室名前照合を `memberNameMatchesCharacter` に（LL-bp3 横展開） |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 5枚再確認。`guided_manual=0`・`audit-common-patterns` OK |
| LL-bp1-001-R＋ | **任意コスト**: UI が `minPick:3` で0枚スキップ不可 → `minPick:0`/`maxPick:3`（0枚 or ちょうど3枚） |
| LL-bp2-001-R＋ | 自カード捨て可・手札コスト減算 jouji を再確認 |
| LL-bp3-001-R＋ | FAQ Q165（各名1枚以上不要）・E6任意ブレード3を再確認 |
| LL-bp4-001-R＋ | 公開コスト連動の相手一括ウェイト（登場/LS 共通文）を再確認 |
| LL-bp6-001-R＋ | FAQ Q246 ハート色和集合・ライブ終了までを再確認 |
| 横展開 | `live_start_hand_discard_same_unit_grant` / `_same_group_grant` も同型 minPick 修正 |
| verify | 9ケース通過 |
