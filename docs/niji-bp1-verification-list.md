# 虹ヶ咲 1弾（bp1）効果検証リスト

`PL!N-bp1-*` および `LL-bp1-*`（虹ヶ咲シリーズ）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-bp1.mjs`
- 全文監査: `node scripts/audit-niji-bp1-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`
- **全体進行**: [card-fix-progress.md](./card-fix-progress.md)

## 凡例

| 状態 | 意味 |
|------|------|
| [x] | 分類・ハンドラ・静的検証 OK |
| [ ] | 要プレイ確認 or 未着手 |

## メンバー（001–012）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!N-bp1-001-R | 上原歩夢 | optional_energy_blade_until_live_end | |
| [x] | 001 | LL-bp1-001-R＋ | 歩夢&かのん&花帆 | live_start_hand_named_discard_grant_jouji | 全レア横展開済 |
| [x] | 002 | PL!N-bp1-002-R＋ | 中須かすみ | deck_top_look_reorder + kidou_wait_to_stage | |
| [x] | 003 | PL!N-bp1-003-R＋ | 桜坂しずく | toujou_wait_pick_hand + heart_color_pick_grant | |
| [x] | 004 | PL!N-bp1-004-R | 朝香果林 | activate_energy | 虹ヶ咲 on stage 条件 |
| [x] | 005 | PL!N-bp1-005-R | 宮下愛 | grant_jouji_session | 任意手札1→ブレード常時 |
| [x] | 006 | PL!N-bp1-006-R＋ | 近江彼方 | activate_energy + draw_from_deck | 2 kidou 分割 |
| [x] | 007 | PL!N-bp1-007-R | 優木せつ菜 | deck_top_pick_recover | |
| [x] | 008 | PL!N-bp1-008-R | エマ・ヴェルデ | kidou_hand_cost_wait_pick_hand | |
| [x] | 009 | PL!N-bp1-009-R | 天王寺璃奈 | ability_sequence | 山札2枚控え→控え室回収 |
| [x] | 010 | PL!N-bp1-010-R | 三船栞子 | deck_top_pick_recover | |
| [x] | 011 | PL!N-bp1-011-R | ミア・テイラー | deck_reveal_until_live | |
| [x] | 012 | PL!N-bp1-012-R＋ | 鐘嵐珠 | passive_track + kidou_wait_pick_hand | ALLハート代用 |

## ライブ（025–029）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025 | PL!N-bp1-025-L | 虹色Passions！ | （能力なし） | ALLブレード説明のみ |
| [x] | 026 | PL!N-bp1-026-L | Poppin' Up! | yell_resolution_pick_hand | ライブ成功時: 合計スコア＞相手→エール公開から虹ヶ咲1枚回収 |
| [x] | 027 | PL!N-bp1-027-L | Solitude Rain | live_card_score_plus_per_unit | ライブ開始: 虹ヶ咲ステージの列挙ハート色ごとにスコア+1 |
| [x] | 028 | PL!N-bp1-028-L | Butterfly | live_card_score_plus | ライブ開始: EE任意2+虹ヶ咲 on stage→スコア+1 |
| [x] | 029 | PL!N-bp1-029-L | Eutopia | live_card_score_plus | ライブ開始: ライブ中3枚+→スコア+2 |

## 検証結果（2026-06-28・メンバー 001–012）

### 修正した

（今回のメンバー検証ではコード修正なし）

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| LL-bp1-001-R＋ | 歩夢&かのん&花帆 | ライブ開始: 手札1枚捨て任意→他メンバー1人に合計スコア+1常時 |
| PL!N-bp1-001-R | 上原歩夢 | ライブ開始 E任意→ライブ終了までブレード1 |
| PL!N-bp1-002-R＋ | 中須かすみ | 起動: 控え室コスト4以下虹ヶ咲→同エリア登場 / 登場: 3枚見て並べ替え |
| PL!N-bp1-003-R＋ | 桜坂しずく | 登場: 控え室虹ヶ咲1枚回収 / ライブ開始: ハート色付与 |
| PL!N-bp1-004-R | 朝香果林 | 登場: 虹ヶ咲 on stage→E2枚アクティブ |
| PL!N-bp1-005-R | 宮下愛 | ライブ開始: 手札1枚捨て任意→ブレード2常時 |
| PL!N-bp1-006-R＋ | 近江彼方 | 起動×2: E2枚アクティブ / EEEE→1ドロー |
| PL!N-bp1-007-R | 優木せつ菜 | 登場: 3枚見て虹ヶ咲1枚回収 |
| PL!N-bp1-008-R | エマ・ヴェルデ | 起動: 手札1枚捨て→控え室虹ヶ咲ライブ1枚回収 |
| PL!N-bp1-009-R | 天王寺璃奈 | 登場: 山札2枚控え→控え室虹ヶ咲1枚回収 |
| PL!N-bp1-010-R | 三船栞子 | 登場: 3枚見て虹ヶ咲1枚回収 |
| PL!N-bp1-011-R | ミア・テイラー | 登場: 山札上からライブが出るまで公開→手札 |
| PL!N-bp1-012-R＋ | 鐘嵐珠 | 常時 ALL ハート代用 / 起動: 控え室虹ヶ咲1枚回収 |

## 検証結果（2026-06-28・ライブ 025–029）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp1-027-L | Solitude Rain | ハート色カウントをカタログ固定（`memberCatalogHasHeartSlot`）から、ステージ上で実際に持つ色（`memberHeldHeartCountBySlot`）に変更。ALL（heart0）は対象外のまま（FAQ Q67） |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp1-025-L | 虹色Passions！ | 能力なし（括弧内 ALL 説明のみ） |
| PL!N-bp1-026-L | Poppin' Up! | `preconditionFilters.requiresLiveScoreHigherThanOpponent` + ソロ相手スコア入力。エール公開から虹ヶ咲1枚手札 |
| PL!N-bp1-028-L | Butterfly | 任意EE2枚→虹ヶ咲 on stage→+1。括弧ドロー説明は分類除外済 |
| PL!N-bp1-029-L | Eutopia | ライブ枠3枚以上（自身含む）→+2。括弧ドロー説明は分類除外済 |

## 横展開修正（2026-06-28・以前）

括弧内 `(エールをすべて行った後…)` は special_heart ドローの説明であり、本効果ではない。  
同型6件（bp1 027–029 + 他弾ライブ）を `stripLiveDrawYellReminderParenthetical` で分類から除外。
