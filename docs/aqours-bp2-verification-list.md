# Aqours 2弾 / NEXTSTEP（bp2）効果検証リスト

`PL!S-bp2-*`（ブースターパック NEXTSTEP / Aqours）をカード番号順に検証する。

NEXTSTEP は他シリーズにも存在: 蓮ノ空 `PL!HS-bp2`、Liella! `PL!SP-bp2`（別ドキュメント参照）。

- 自動回帰: `node scripts/verify-aqours-bp2.mjs`
- 全文監査: `node scripts/audit-aqours-bp2-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–018）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!S-bp2-001-P | 高海千歌 | jouji passive (blade_conditional) | 常時: 自成功0枚かつ相手成功1枚+→ブレード3 |
| [x] | 002 | PL!S-bp2-002-P | 桜内梨子 | jidou_leave_stage_hand_pick_recover | 退場時 手札1枚捨て任意→捨てたら控え室からAqours**ライブ**1枚回収 |
| [x] | 003 | PL!S-bp2-003-P | 松浦果南 | jidou_yell_grant_heart | 自動/ターン1回: エール公開にライブ1枚+→heart02 |
| [x] | 004 | PL!S-bp2-004-P | 黒澤ダイヤ | jidou_yell_retry_no_live | 自動/ターン1回: エール公開にライブなし→全捨て→BH失って再エール |
| [x] | 005 | PL!S-bp2-005-P | 渡辺曜 | deck_top_pick_recover | 手札1枚捨て任意→7枚見て heart02/04/05 メンバー**最大3枚**回収 |
| [x] | 006 | PL!S-bp2-006-P | 津島善子 | toujou_wait_enter_cost_sum | EEEE任意→控え室からコスト合計4以下でメンバー2枚まで登場 |
| [x] | 007 | PL!S-bp2-007-P | 国木田花丸 | jidou_yell_draw / live_start_hand_live_to_deck_bottom_look | 自動: エールにライブ+かつ手札7以下→1ドロー / ライブ開始: 手札ライブ→山札下任意→2枚見て並べ替え |
| [x] | 008 | PL!S-bp2-008-P | 小原鞠莉 | waiting_to_deck_bottom / jouji passive | 登場: 控え室ライブ1枚まで山札下 / 常時: 全エリアAqours異名→ライブ成功時スコア+1（公開ライブ3枚+なら+2）付与 |
| [x] | 009 | PL!S-bp2-009-P | 黒澤ルビィ | kidou_stage_wait_pick_hand | 起動: 自ら控え室へ→控え室ライブ1枚回収 |
| [x] | 010 | PL!S-bp2-010-N | 高海千歌 | draw_then_hand_discard | 2ドロー→手札2枚捨て |
| [x] | 016 | PL!S-bp2-016-N | 国木田花丸 | kidou_stage_wait_pick_hand | 起動: 自ら控え室へ→控え室**メンバー**1枚回収 |

## ライブ（019–026）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!S-bp2-019-L | WATER BLUE NEW WORLD | （能力なし） | |
| [x] | 020 | PL!S-bp2-020-L | DREAMY COLOR | （能力なし） | |
| [x] | 021 | PL!S-bp2-021-L | 未体験HORIZON | yell_resolution_pick_deck_bottom | ライブ成功: エール公開ライブ1枚まで山札下 |
| [x] | 022 | PL!S-bp2-022-L | 未熟DREAMER | live_card_score_plus | ライブ成功: デッキリフレッシュ時スコア+2（`requiresDeckRefreshedThisTurn`） |
| [x] | 023 | PL!S-bp2-023-L | MY舞☆TONIGHT | grant_jouji_session | ライブ開始: 他Aqoursライブあり→**全**ステージメンバーにブレード **2026-06-28修正**（FAQ Q121） |
| [x] | 024 | PL!S-bp2-024-L | 君のこころは輝いてるかい？ | jouji passive / draw_then_hand_discard | 常時: 成功ライブ置き場不可 / 成功時: 2ドロー→手札1枚捨て |
| [x] | 025 | PL!S-bp2-025-L | 青空Jumping Heart | grant_jouji_session | ライブ開始: 自成功2枚+→メンバー1人にブレード2 |
| [x] | 026 | PL!S-bp2-026-L | ユメ語るよりユメ歌おう | （能力なし） | |

## 検証結果（2026-06-28・ライブ 019–026）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!S-bp2-022-L | 未熟DREAMER | デッキリフレッシュ条件を `requiresDeckRefreshedThisTurn` として明示化 |
| PL!S-bp2-023-L | MY舞☆TONIGHT | FAQ Q121 どおり全ステージメンバーへブレード付与。ライブ置き場に「MY舞☆TONIGHT」以外の Aqours ライブ条件を `requiresOtherSeriesLiveOnFrame*` + `grantToAllStageMembers` で配線 |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!S-bp2-019-L | WATER BLUE NEW WORLD | 能力なし |
| PL!S-bp2-020-L | DREAMY COLOR | 能力なし |
| PL!S-bp2-021-L | 未体験HORIZON | ライブ成功: エール公開ライブ1枚まで山札下 |
| PL!S-bp2-024-L | 君のこころは輝いてるかい？ | 常時: 成功ライブ置き場不可 / 成功時: 2ドロー→手札1枚捨て |
| PL!S-bp2-025-L | 青空Jumping Heart | ライブ開始: 自成功2枚+→メンバー1人にブレード2 |
| PL!S-bp2-026-L | ユメ語るよりユメ歌おう | 能力なし |

## 既知の横展開修正

- **005-P（渡辺曜）**: `deckTopPickMax: 3` + 複数同時選択ダイアログ（`openPickMultipleFromDeckLookDialog`）
- **004-P/R**: `jidou_yell_retry_no_live` composition 退行修正
- **024-L**: 成功ライブカード置き場への配置禁止（常時）

## 2026-06-28 検証（メンバー）

能力あり16枚（メンバー）: **guided_manual=0**。
