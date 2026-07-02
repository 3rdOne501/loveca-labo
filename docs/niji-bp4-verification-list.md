# 虹ヶ咲 4弾 / SAPPHIREMOON（bp4）効果検証リスト

`PL!N-bp4-*`（ブースターパック **SAPPHIREMOON**）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-bp4.mjs`
- 全文監査: `node scripts/audit-niji-bp4-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`
- 相手盤面効果: [opponent-board-effects-registry.md](./opponent-board-effects-registry.md) / [versus-mode-implementation-plan.md](./versus-mode-implementation-plan.md)

## メンバー（001–024）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!N-bp4-001-P | 上原歩夢 | energy_less_than_opponent_wait | 成功時: 自エネルギー<相手→EDK1枚ウェイト **対戦: 相手E枚数参照** |
| [x] | 002 | PL!N-bp4-002-P | 中須かすみ | live_start_pick_player_deck_top_peek | ライブ開始: **自分か相手**を選ぶ→その山札上1枚見て控え室に置いてもよい |
| [x] | 003 | PL!N-bp4-003-P | 桜坂しずく | draw_from_deck | 成功時: ライブ合計スコア>相手→1ドロー **対戦: スコア比較** |
| [x] | 004 | PL!N-bp4-004-P | 朝香果林 | live_start_draw_opp_wait + waiting_to_deck_top_by_opp_wait_count | ライブ開始: 1ドロー→相手コスト9以下1人ウェイト→相手ウェイト人数まで控え室虹ヶ咲メンバーを山札上 |
| [x] | 005 | PL!N-bp4-005-P | 宮下愛 | optional_self_wait_opp_stage | 登場 手札1枚捨て任意→相手コスト4以下2人までウェイト |
| [x] | 006 | PL!N-bp4-006-P | 近江彼方 | ability_sequence | 登場 E任意→手札コスト4以下虹ヶ咲1人登場→BH持ちなら自ウェイト |
| [x] | 007 | PL!N-bp4-007-P | 優木せつ菜 | toujou_both_wait_pick_live_hand / jouji / both_players_energy_deck_wait | 登場: **自分と相手**控え室ライブ1枚手札 / 常時: 両者E合計15+→heart02 / 成功時: **両者**EDK1枚ウェイト |
| [x] | 008 | PL!N-bp4-008-P | エマ・ヴェルデ | kidou_energy_or_activate_member | 起動: 手札1枚捨て→E1枚または虹ヶ咲1人アクティブ |
| [x] | 009 | PL!N-bp4-009-P | 天王寺璃奈 | draw_then_hand_to_deck_top | 自ステージコスト合計<相手→2ドロー→手札1枚山札上 **2026-06-28: 手札→山札上が欠落** |
| [x] | 010 | PL!N-bp4-010-P | 三船栞子 | success_live_waiting_swap / live_start_pick_live_frame_match_success_live_grant | 登場: 成功ライブ虹ヶ咲1枚↔控え室虹ヶ咲ライブ1枚 / LS: ライブ中虹ヶ咲1枚選び同名が成功ライブにあれば常時付与 |
| [x] | 011 | PL!N-bp4-011-P | ミア・テイラー | heart_color_pick_grant / live_success_deck_wait_pick_live | LS: ハート色指定付与 / 成功: 山札上5枚控え→異名虹ヶ咲ライブ3+→1枚回収 **2026-06-28: 誤分類 deck_top_pick_recover を修正** |
| [x] | 012 | PL!N-bp4-012-P | 鐘嵐珠 | jouji passive (live_score_plus) | 常時: 相手成功ライブスコア合計6+→ライブ合計スコア+1 **対戦: 相手成功ライブ参照** |
| [x] | 013 | PL!N-bp4-013-N | 上原歩夢 | optional_energy_blade_until_live_end | ライブ開始 E任意→ライブ終了までブレード2 |
| [x] | 014 | PL!N-bp4-014-N | 中須かすみ | （能力なし） | |
| [x] | 015 | PL!N-bp4-015-N | 桜坂しずく | （能力なし） | |
| [x] | 016 | PL!N-bp4-016-N | 朝香果林 | deck_top_look_reorder | 自ウェイト任意→2枚見て並べ替え→残り控え |
| [x] | 017 | PL!N-bp4-017-N | 宮下愛 | kidou_stage_wait_pick_hand | 起動: 自ら控え室→控え室メンバー1枚回収 |
| [x] | 018 | PL!N-bp4-018-N | 近江彼方 | jidou_self_active_to_wait_draw_discard | 自動: 自アク→ウェイト時1ドロー→手札1枚捨て |
| [x] | 019 | PL!N-bp4-019-N | 優木せつ菜 | （能力なし） | |
| [x] | 020 | PL!N-bp4-020-N | エマ・ヴェルデ | kidou_stage_wait_pick_hand | 起動: 自ら控え室→控え室メンバー1枚回収 |
| [x] | 021 | PL!N-bp4-021-N | 天王寺璃奈 | toujou_optional_wait_to_deck_top | 登場: 控え室1枚まで山札上 |
| [x] | 022 | PL!N-bp4-022-N | 三船栞子 | （能力なし） | |
| [x] | 023 | PL!N-bp4-023-N | ミア・テイラー | draw_then_hand_discard | 登場: 虹ヶ咲1人ウェイト任意→1ドロー→手札1枚捨て |
| [x] | 024 | PL!N-bp4-024-N | 鐘嵐珠 | （能力なし） | |

## 検証結果（2026-06-28・メンバー 001–024）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp4-009-P | 天王寺璃奈 | 2ドローのみで手札1枚→山札上が欠落 → `draw_then_hand_to_deck_top`（自/相手コスト合計比較条件付き） |
| PL!N-bp4-011-P | ミア・テイラー | 成功時「山札上5枚控え→異名ライブ3+→1枚回収」が `deck_top_pick_recover` に誤分類 → `live_success_deck_wait_pick_live` を優先 |
| PL!N-bp4-023-N | ミア・テイラー | カード文 `『虹ヶ咲」` 表記ゆれでウェイト対象シリーズ未設定 → `parseAbilityPickFilters` で `『…」` も受理 |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp4-001-P | 上原歩夢 | 成功時: 自E < 相手 → EDK1枚ウェイト |
| PL!N-bp4-002-P | 中須かすみ | ライブ開始: 自分/相手選択→山札上1枚見て控え optional |
| PL!N-bp4-003-P | 桜坂しずく | 成功時: ライブ合計スコア > 相手 → 1ドロー |
| PL!N-bp4-004-P | 朝香果林 | LS: 1ドロー→相手ウェイト→人数分メンバー山札上 |
| PL!N-bp4-005-P | 宮下愛 | 登場: 手札1枚捨て任意→相手コスト4以下2人ウェイト |
| PL!N-bp4-006-P | 近江彼方 | 登場: E任意→虹ヶ咲登場→BH持ちなら自ウェイト |
| PL!N-bp4-007-P | 優木せつ菜 | 登場/常時/成功: 両者ライブ回収・E合計15+・両者EDK |
| PL!N-bp4-008-P | エマ・ヴェルデ | 起動: 手札1枚捨て→E1枚 or 虹ヶ咲1人アク |
| PL!N-bp4-010-P | 三船栞子 | 登場: 成功ライブ↔控えライブ交換 / LS: 同名成功ライブで常時付与 |
| PL!N-bp4-012-P | 鐘嵐珠 | 常時: 相手成功ライブスコア6+→合計+1 |
| PL!N-bp4-013-N | 上原歩夢 | ライブ開始 E任意→ライブ終了までBL2 |
| PL!N-bp4-014-N | 中須かすみ | 能力なし |
| PL!N-bp4-015-N | 桜坂しずく | 能力なし |
| PL!N-bp4-016-N | 朝香果林 | 登場: 自ウェイト任意→2枚見て並べ替え |
| PL!N-bp4-017-N | 宮下愛 | 起動: 自ら控え室→控え室メンバー1枚回収 |
| PL!N-bp4-018-N | 近江彼方 | 自動: 自アク→ウェイト時1ドロー→手札1枚捨て |
| PL!N-bp4-019-N | 優木せつ菜 | 能力なし |
| PL!N-bp4-020-N | エマ・ヴェルデ | 起動: 自ら控え室→控え室メンバー1枚回収 |
| PL!N-bp4-021-N | 天王寺璃奈 | 登場: 控え室1枚まで山札上 |
| PL!N-bp4-022-N | 三船栞子 | 能力なし |
| PL!N-bp4-024-N | 鐘嵐珠 | 能力なし |

## ライブ（025–032）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025 | PL!N-bp4-025-L | VIVID WORLD | live_start_yell_blade_remap_slot / live_success_yell_series_members_all_hearts_score | LS: エール公開BH→青BH / 成功: エール虹ヶ咲メンバーがheart01–06各1+→スコア+1 |
| [x] | 026 | PL!N-bp4-026-L | DIVE! | jidou_waiting_to_hand_place_named_live / jidou_live_placed_grant_stage_member | 自動: 控え室→手札時「DIVE!」表ライブ置き場（上限-1） / 表置き時虹ヶ咲1人にBH×2付与 |
| [x] | 027 | PL!N-bp4-027-L | EMOTION | live_start_score_plus_per_named_success_live | ライブ開始: 成功ライブ「EMOTION」1枚につきスコア+2＆必要heart0+3 **2026-06-28修正** |
| [x] | 028 | PL!N-bp4-028-L | stars we chase | live_start_tiered_waiting_distinct_score | ライブ開始: 控え室異名虹ヶ咲ライブ4枚+→+1、6枚+→+2 |
| [x] | 029 | PL!N-bp4-029-L | Rise Up High! | grant_jouji_session | ライブ開始: **1ターン目**のみスコア+1＆虹ヶ咲1人にBH×1付与 **2026-06-28修正** |
| [x] | 030 | PL!N-bp4-030-L | Daydream Mermaid | live_success_pick_options | 成功時: EDK1枚ウェイト or 控え室メンバー1枚回収（成功ライブ虹ヶ咲ありなら複数選択可・FAQ191同効果2回不可） |
| [x] | 031 | PL!N-bp4-031-L | NEO SKY, NEO MAP! | draw_then_hand_to_deck_top | ライブ開始: 全エリア虹ヶ咲在席かつコスト合計20+→3ドロー→手札3枚山札上 **2026-06-28修正** |
| [x] | 032 | PL!N-bp4-032-L | Blue! | （能力なし） | |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 全68枚・能力セグメント再確認。`guided_manual=0`。新規コード修正なし |
| PL!N-bp4-011-P | `live_success_deck_wait_pick_live`（5枚ミル→異名ライブ3+で1枚回収）を再確認。common-patterns の mill+wait-pick はライブ回収向け誤検知 |
| PL!N-bp4-007-P | 両者控え室ライブ回収・両者EDKウェイト等の対戦依存効果を再確認 |
| PL!N-bp4-025-L / 026-L | エールBHリマップ・DIVE!表置き場連動を再確認 |
| verify | 39ケースすべて通過 |

## 検証結果（2026-06-28・ライブ 025–032）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp4-027-L | EMOTION | 成功ライブ「EMOTION」枚数比例（+2/枚）と必要 heart0+3/枚が未実装 → `live_start_score_plus_per_named_success_live` |
| PL!N-bp4-029-L | Rise Up High! | 1ターン目条件とこのカードのスコア+1が欠落 → `requiresFirstGameLivePhase` + `grant_jouji_session` の `cardScoreGrant` |
| PL!N-bp4-031-L | NEO SKY, NEO MAP! | 全エリア在席・コスト20+・手札3枚→山札上がなく無条件3ドロー → `draw_then_hand_to_deck_top` |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp4-025-L | VIVID WORLD | LS: エール公開BH→青BH / 成功: エール公開虹ヶ咲メンバーが heart01–06 各1+→スコア+1 |
| PL!N-bp4-026-L | DIVE! | 自動: 控え室→手札時「DIVE!」表置き（上限-1） / 表置き時虹ヶ咲1人にBH×2 |
| PL!N-bp4-028-L | stars we chase | LS: 控え室異名虹ヶ咲ライブ4+→+1、6+→+2 |
| PL!N-bp4-030-L | Daydream Mermaid | 成功時: EDK1枚ウェイト or 控え室メンバー1枚回収（成功ライブ虹ヶ咲ありなら複数選択可・FAQ191） |
| PL!N-bp4-032-L | Blue! | 能力なし |

## 2026-06-28 検証（ライブ 025–032 再検証・詳細）

027 / 029 / 031 の分類・ハンドラ不備を修正（上記「修正した」表参照）。025 / 026 / 028 / 030 / 032 は分類・ハンドラ整合を確認（修正なし）。030 は FAQ191（同効果2回選択不可）— UI は別オプションのみ選択可。

相手盤面参照 **11能力セグメント**（001–005, 007×3, 009, 012, 002）→ レジストリ・対戦計画に追記済み。

## 2026-06-28 検証（メンバー 001–024 再検証）

能力あり19種（014/015/019/022/024 は能力なし）。**009 / 011 / 023** に分類不備を確認し修正（上記「修正した」表参照）。

001–008, 010, 012–013, 016–018, 020–021 は分類・ハンドラ整合を確認（修正なし）。

相手盤面参照 **11能力セグメント**（001–005, 007×3, 009, 012, 002）→ レジストリ・対戦計画に追記済み。
