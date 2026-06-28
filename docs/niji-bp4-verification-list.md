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
| [x] | 009 | PL!N-bp4-009-P | 天王寺璃奈 | draw_from_deck | ライブ開始: 自ステージコスト合計<相手→2ドロー→手札1枚山札上 **対戦: コスト合計比較** |
| [x] | 010 | PL!N-bp4-010-P | 三船栞子 | success_live_waiting_swap / live_start_pick_live_frame_match_success_live_grant | 登場: 成功ライブ虹ヶ咲1枚↔控え室虹ヶ咲ライブ1枚 / LS: ライブ中虹ヶ咲1枚選び同名が成功ライブにあれば常時付与 |
| [x] | 011 | PL!N-bp4-011-P | ミア・テイラー | heart_color_pick_grant / deck_top_pick_recover | LS: 手札ライブ1枚捨て任意→ハート色1指定→ライブ終了まで付与 / 成功: 山札上5枚控え→異名虹ヶ咲ライブ3枚+なら1枚回収 |
| [x] | 012 | PL!N-bp4-012-P | 鐘嵐珠 | jouji passive (live_score_plus) | 常時: 相手成功ライブスコア合計6+→ライブ合計スコア+1 **対戦: 相手成功ライブ参照** |
| [x] | 013 | PL!N-bp4-013-N | 上原歩夢 | optional_energy_blade_until_live_end | ライブ開始 E任意→ライブ終了までブレード2 |
| [ ] | 014 | PL!N-bp4-014-N | 中須かすみ | （能力なし） | |
| [ ] | 015 | PL!N-bp4-015-N | 桜坂しずく | （能力なし） | |
| [x] | 016 | PL!N-bp4-016-N | 朝香果林 | deck_top_look_reorder | 自ウェイト任意→2枚見て並べ替え→残り控え |
| [x] | 017 | PL!N-bp4-017-N | 宮下愛 | kidou_stage_wait_pick_hand | 起動: 自ら控え室→控え室メンバー1枚回収 |
| [x] | 018 | PL!N-bp4-018-N | 近江彼方 | jidou_self_active_to_wait_draw_discard | 自動: 自アク→ウェイト時1ドロー→手札1枚捨て |
| [ ] | 019 | PL!N-bp4-019-N | 優木せつ菜 | （能力なし） | |
| [x] | 020 | PL!N-bp4-020-N | エマ・ヴェルデ | kidou_stage_wait_pick_hand | 起動: 自ら控え室→控え室メンバー1枚回収 |
| [x] | 021 | PL!N-bp4-021-N | 天王寺璃奈 | toujou_optional_wait_to_deck_top | 登場: 控え室1枚まで山札上 |
| [ ] | 022 | PL!N-bp4-022-N | 三船栞子 | （能力なし） | |
| [x] | 023 | PL!N-bp4-023-N | ミア・テイラー | draw_then_hand_discard | 登場: 虹ヶ咲1人ウェイト任意→1ドロー→手札1枚捨て |
| [ ] | 024 | PL!N-bp4-024-N | 鐘嵐珠 | （能力なし） | |

## ライブ（025–032）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025 | PL!N-bp4-025-L | VIVID WORLD | live_start_yell_blade_remap_slot / live_success_yell_series_members_all_hearts_score | LS: エール公開BHを青BHに置換 / 成功: エール虹ヶ咲メンバーにheart01–05各1+→スコア+1 |
| [x] | 026 | PL!N-bp4-026-L | DIVE! | jidou_waiting_to_hand_place_named_live / jidou_live_placed_grant_stage_member | 自動: 控え室→手札時「DIVE!」1枚表ライブ置き場（上限-1） / 表置き時虹ヶ咲1人に常時付与 |
| [x] | 027 | PL!N-bp4-027-L | EMOTION | live_card_score_plus | ライブ開始: 成功ライブに同名「EMOTION」1枚につきスコア+2＆必要ハート増 |
| [x] | 028 | PL!N-bp4-028-L | stars we chase | live_start_tiered_waiting_distinct_score | ライブ開始: 控え室異名虹ヶ咲ライブ4枚+→+1、6枚+→+2 |
| [x] | 029 | PL!N-bp4-029-L | Rise Up High! | grant_jouji_session | ライブ開始: 1ターン目ライブフェイズ→スコア+1＆虹ヶ咲1人に常時付与 |
| [x] | 030 | PL!N-bp4-030-L | Daydream Mermaid | live_success_pick_options | 成功時: EDK1枚ウェイト or 控え室メンバー1枚回収（成功ライブ虹ヶ咲ありなら複数選択可） |
| [x] | 031 | PL!N-bp4-031-L | NEO SKY, NEO MAP! | draw_from_deck | ライブ開始: 全エリア虹ヶ咲在席かつコスト合計20+→3ドロー→手札3枚山札上 |
| [ ] | 032 | PL!N-bp4-032-L | Blue! | （能力なし） | |

## 2026-06-28 検証

能力あり26種: **guided_manual=0**。新規コード修正なし。  
相手盤面参照 **11能力セグメント**（001–005, 007×3, 009, 012, 002）→ レジストリ・対戦計画に追記済み。
