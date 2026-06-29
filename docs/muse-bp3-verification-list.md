# μ's 3弾 / 夏、はじまる。（bp3）効果検証リスト

`PL!-bp3-*`（ブースターパック **夏、はじまる。** / μ's）をカード番号順に検証する。

同パックの他シリーズ: 虹ヶ咲 `PL!N-bp3`、Aqours `PL!S-bp3`（別ドキュメント）。  
クロスオーバー: `LL-bp3-001-R＋`（園田海未&津島善子&天王寺璃奈）。

- 自動回帰: `node scripts/verify-muse-bp3.mjs`
- 全文監査: `node scripts/audit-muse-bp3-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–018）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!-bp3-001-P | 高坂穂乃果 | draw_then_hand_discard / live_start_activate_all_stage_members | 起動 自ウェイト→1ドロー+手札1枚捨て / ライブ開始: メンバー1人までアクティブ |
| [x] | 001 | LL-bp3-001-R＋ | 園田海未&津島善子&天王寺璃奈 | kidou_wait_shuffle_deck_bottom_activate / optional_energy_blade_until_live_end | 控え室3名計6枚シャッフル→山札下→E6枚までアク / ライブ開始 E任意→ブレード |
| [x] | 002 | PL!-bp3-002-P | 絢瀬絵里 | optional_self_wait_opp_stage / jouji passive | 登場 手札捨て任意→相手コスト4以下**2人まで**ウェイト / 常時: 相手ウェイト1人につきブレード1 |
| [x] | 003 | PL!-bp3-003-P | 南ことり | toujou_wait_pick_hand | 自ウェイト任意→控え室μ'sメンバー1枚回収 |
| [x] | 004 | PL!-bp3-004-P | 園田海未 | draw_per_stage_member_discard / toujou_success_live_pick_hand | 登場: ステージ人数分ドロー→手札1枚捨て / ライブ開始: 自成功1枚+→手札捨て任意→μ'sライブ回収 |
| [x] | 005 | PL!-bp3-005-P | 星空凛 | live_start_activate_all_stage_members | 登場: 全メンバーアクティブ |
| [x] | 006 | PL!-bp3-006-P | 西木野真姫 | grant_jouji_session | ライブ開始 手札1枚捨て任意→自成功1枚につきブレード2 |
| [x] | 007 | PL!-bp3-007-P | 東條希 | deck_top_pick_recover | ライブ開始 手札2枚捨て任意→3枚見て手札/山札上/控え室へ1枚ずつ |
| [x] | 008 | PL!-bp3-008-P | 小泉花陽 | kidou_wait_pick_hand / grant_jouji_session | 起動 自ウェイト→μ'sライブ回収 / ライブ開始 μ's1人ウェイト任意→heart03×2 |
| [x] | 009 | PL!-bp3-009-P | 矢澤にこ | draw_from_deck / heart_color_pick_grant | 登場: コスト13+ on stage→1ドロー / 起動 自ウェイト→heart01/03/06から1色 |
| [x] | 010 | PL!-bp3-010-N | 高坂穂乃果 | deck_top_pick_recover | 手札1枚捨て任意→5枚見てライブ1枚回収 |
| [x] | 011 | PL!-bp3-011-N | 絢瀬絵里 | heart_color_pick_grant | ライブ開始 heart01/03/06選択→自成功1枚につきそのハート1 |
| [x] | 012 | PL!-bp3-012-N | 南ことり | heart_color_pick_grant | 011絵里と同型 |
| [x] | 013 | PL!-bp3-013-N | 園田海未 | heart_color_pick_grant | 011絵里と同型 |
| [x] | 014 | PL!-bp3-014-N | 星空凛 | deck_top_look_reorder | 自ウェイト任意→2枚見て並べ替え |
| [x] | 017 | PL!-bp3-017-N | 小泉花陽 | deck_top_look_reorder | 014凛と同型 |
| [x] | 018 | PL!-bp3-018-N | 矢澤にこ | deck_top_look_reorder | 014凛と同型 |

## ライブ（019–026）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!-bp3-019-L | 僕らのLIVE 君とのLIFE | live_card_score_plus | ライブ開始: ライブ中μ's2枚+→スコア+1 |
| [x] | 020 | PL!-bp3-020-L | Snow halation | （能力なし） | ALLブレード説明のみ |
| [x] | 021 | PL!-bp3-021-L | 愛してるばんざーい! | （能力なし） | b_heart06 説明のみ |
| [x] | 022 | PL!-bp3-022-L | ユメノトビラ | live_start_deck_reveal_both_stage_members_score | 自+相手ステージ人数分公開→ライブ1枚につきスコア+1→公開分控え室 |
| [x] | 023 | PL!-bp3-023-L | ミはμ'sicのミ | live_start_need_heart_reduce_fixed | ライブ開始: 自ステージBL合計10+→必要heart0-2 |
| [x] | 024 | PL!-bp3-024-L | 夏色えがおで1,2,Jump! | heart_color_pick_grant / live_card_score_plus | 自成功1枚+→heart選択→μ's1人に付与 / 自成功2枚+→スコア+1 |
| [x] | 025 | PL!-bp3-025-L | タカラモノズ | live_card_score_plus | 成功時: 余剰ハートなし→スコア+1 |
| [x] | 026 | PL!-bp3-026-L | Oh,Love&Peace! | grant_jouji_session / live_card_score_plus | ライブ開始 手札2枚捨て任意→メンバー1人BL3 / 成功時 自ハート総数>相手→+1 |

## 検証結果（2026-06-28・ライブ 019–026）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!-bp3-019-L | 僕らのLIVE 君とのLIFE | 「ライブ中の『μ's』のカード2枚以上」を `minLiveFrameCount` + シリーズ別カウントで判定 |
| PL!-bp3-023-L | ミはμ'sicのミ | Wiki トークン除去後もステージBL合計10+を認識（`icon_blade` + `requiresStageBladeTotal`） |
| PL!-bp3-025-L | タカラモノズ | 「余剰ハートを持たない」を `requiresZeroSurplusHearts` でライブ成功時にチェック |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!-bp3-020-L | Snow halation | 能力なし（ALLブレード説明のみ） |
| PL!-bp3-021-L | 愛してるばんざーい! | 能力なし |
| PL!-bp3-022-L | ユメノトビラ | 自+相手ステージ人数分公開→ライブ枚数×スコア+1 |
| PL!-bp3-024-L | 夏色えがおで1,2,Jump! | 2段ライブ開始（ハート色付与 + 成功2枚+で+1）`ability_sequence` |
| PL!-bp3-026-L | Oh,Love&Peace! | LS: 手札2枚捨て任意→BL3 / 成功時: 自ステージハート総数>相手 |

## 2026-06-28 検証（メンバー）

能力あり22種（PL!-bp3）+ LLクロス1: **guided_manual=0**。
