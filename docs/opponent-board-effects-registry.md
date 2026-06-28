# 相手盤面効果レジストリ

対戦モード（デュアル盤・オンライン）を本格実装するときの参照用。**相手の盤面・状態に関わる能力**を全件記録する。

- **再生成**: `node scripts/audit-opponent-board-effects.mjs`
- **機械可読**: [opponent-board-effects-registry.json](./opponent-board-effects-registry.json)
- **デュアル未対応の疑い（高リスクのみ）**: [dual-mode-gap-audit.json](./dual-mode-gap-audit.json)（`node scripts/audit-dual-mode-gaps.mjs`）
- **手動プレイ確認**: [play-verification-list.md](./play-verification-list.md)

生成: 2026-06-28 — **264** 能力セグメント / **215** 枚

## dualStatus（実装状況の目安）

| 値 | 意味 |
|----|------|
| `dual_ok` | デュアル盤分岐または委譲ヘルパーあり |
| `dual_and_solo_manual` | デュアル対応だがソロ手入力も併存 |
| `solo_manual` | ソロの相手代行入力のみ（デュアル分岐なし） |
| `dual_gap` | 自動化済みだがデュアル分岐が未検出 |
| `passive_track` | 常時効果（実行時ハンドラなし） |
| `placement_runtime` | 成功ライブ移動等、別経路で処理 |
| `guided_manual` | 手動ガイド |
| `handler_unknown` | ハンドラ未検出 |

## 相互作用種別（kinds）

- `read_compare` (88): 相手状態の参照・比較（前提条件）
- `pick_self_or_opponent` (2): 自分か相手の盤面を選んで解決
- `mutate_opponent_stage` (148): 相手ステージ（ウェイト・アクティブ・退場等）
- `mutate_opponent_hand` (5): 相手手札（捨て・公開・加える等）
- `mutate_opponent_waiting` (8): 相手控え室
- `mutate_opponent_deck` (32): 相手山札
- `mutate_opponent_live` (19): 相手ライブ置き場
- `mutate_opponent_energy` (9): 相手エネルギー
- `mutate_opponent_success_live` (21): 相手成功ライブ置き場
- `both_players` (15): 自分と相手はそれぞれ（同時処理）
- `opponent_choice` (41): 相手の選択・任意行動
- `passive_opponent` (50): 常時（相手状態を参照）
- `guided_manual` (0): 手動ガイド（相手参照あり）

## dualStatus 集計

- `dual_ok`: 214
- `passive_track`: 50

## セット別一覧

### PL!SP-bp2 (11)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-bp2-010-P | ウィーン・マルガレーテ | jouji | `passive_track` | mutate_opponent_live, passive_opponent | `passive_track` |
| PL!SP-bp2-010-P＋ | ウィーン・マルガレーテ | jouji | `passive_track` | mutate_opponent_live, passive_opponent | `passive_track` |
| PL!SP-bp2-010-R＋ | ウィーン・マルガレーテ | jouji | `passive_track` | mutate_opponent_live, passive_opponent | `passive_track` |
| PL!SP-bp2-010-SEC | ウィーン・マルガレーテ | jouji | `passive_track` | mutate_opponent_live, passive_opponent | `passive_track` |
| PL!SP-bp2-011-P | 鬼塚冬毬 | toujyou | `toujou_wait_pick_opp_live` | mutate_opponent_live, mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!SP-bp2-011-R | 鬼塚冬毬 | toujyou | `toujou_wait_pick_opp_live` | mutate_opponent_live, mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!SP-bp2-023-L | Go!! リスタート | live_start | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!SP-bp2-023-SRL | Go!! リスタート | live_start | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!SP-bp2-024-L | ビタミンSUMMER！ | live_success | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!SP-bp2-024-SECL | ビタミンSUMMER! | live_success | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!SP-bp2-024-SRL | ビタミンSUMMER! | live_success | `live_card_score_plus` | read_compare | `dual_ok` |

### PL!S-bp2 (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!S-bp2-001-P | 高海千歌 | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent, read_compare | `passive_track` |
| PL!S-bp2-001-R | 高海千歌 | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent, read_compare | `passive_track` |

### PL!N-bp3 (8)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!N-bp3-010-P | 三船栞子 | live_start | `live_start_pick_player_waiting_deck_bottom` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp3-010-R | 三船栞子 | live_start | `live_start_pick_player_waiting_deck_bottom` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp3-011-P | ミア・テイラー | toujyou | `toujou_opp_stage_member_match_grant` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp3-011-R | ミア・テイラー | toujyou | `toujou_opp_stage_member_match_grant` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp3-017-N | 宮下 愛 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp3-017-N | 宮下 愛 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp3-023-N | ミア・テイラー | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp3-023-N | ミア・テイラー | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |

### PL!S-bp3 (11)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!S-bp3-002-P | 桜内梨子 | live_success | `yell_resolution_pick_self_score` | read_compare | `dual_ok` |
| PL!S-bp3-002-R | 桜内梨子 | live_success | `yell_resolution_pick_self_score` | read_compare | `dual_ok` |
| PL!S-bp3-005-P | 渡辺 曜 | live_success | `draw_from_deck` | read_compare | `dual_ok` |
| PL!S-bp3-005-R | 渡辺 曜 | live_success | `draw_from_deck` | read_compare | `dual_ok` |
| PL!S-bp3-007-P | 国木田花丸 | kidou | `draw_from_deck` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!S-bp3-007-R | 国木田花丸 | kidou | `draw_from_deck` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!S-bp3-012-N | 松浦果南 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp3-012-N | 松浦果南 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp3-017-N | 小原鞠莉 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp3-017-N | 小原鞠莉 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp3-024-L | Deep Resonance | live_start | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |

### PL!-bp3 (6)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!-bp3-002-P | 絢瀬絵里 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-bp3-002-P | 絢瀬絵里 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!-bp3-002-R | 絢瀬絵里 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-bp3-002-R | 絢瀬絵里 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!-bp3-022-L | ユメノトビラ | live_start | `live_start_deck_reveal_both_stage_members_score` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!-bp3-026-L | Oh,Love&Peace! | live_success | `live_card_score_plus` | mutate_opponent_stage, read_compare | `dual_ok` |

### PL!N-bp4 (32)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!N-bp4-001-P | 上原歩夢 | live_success | `energy_less_than_opponent_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp4-001-R | 上原歩夢 | live_success | `energy_less_than_opponent_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp4-002-P | 中須かすみ | live_start | `live_start_pick_player_deck_top_peek` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp4-002-R | 中須かすみ | live_start | `live_start_pick_player_deck_top_peek` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp4-003-P | 桜坂しずく | live_success | `draw_from_deck` | read_compare | `dual_ok` |
| PL!N-bp4-003-R | 桜坂しずく | live_success | `draw_from_deck` | read_compare | `dual_ok` |
| PL!N-bp4-004-P | 朝香果林 | live_start | `live_start_draw_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-P | 朝香果林 | live_start | `waiting_to_deck_top_by_opp_wait_count` | mutate_opponent_deck, mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-P＋ | 朝香果林 | live_start | `live_start_draw_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-P＋ | 朝香果林 | live_start | `waiting_to_deck_top_by_opp_wait_count` | mutate_opponent_deck, mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-R＋ | 朝香果林 | live_start | `live_start_draw_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-R＋ | 朝香果林 | live_start | `waiting_to_deck_top_by_opp_wait_count` | mutate_opponent_deck, mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-SEC | 朝香果林 | live_start | `live_start_draw_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-004-SEC | 朝香果林 | live_start | `waiting_to_deck_top_by_opp_wait_count` | mutate_opponent_deck, mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-005-P | 宮下 愛 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-005-R | 宮下 愛 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp4-007-P | 優木せつ菜 | toujyou | `toujou_both_wait_pick_live_hand` | both_players, opponent_choice | `dual_ok` |
| PL!N-bp4-007-P | 優木せつ菜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent | `passive_track` |
| PL!N-bp4-007-P | 優木せつ菜 | live_success | `both_players_energy_deck_wait` | both_players, mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!N-bp4-007-P＋ | 優木せつ菜 | toujyou | `toujou_both_wait_pick_live_hand` | both_players, opponent_choice | `dual_ok` |
| PL!N-bp4-007-P＋ | 優木せつ菜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent | `passive_track` |
| PL!N-bp4-007-P＋ | 優木せつ菜 | live_success | `both_players_energy_deck_wait` | both_players, mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!N-bp4-007-R＋ | 優木せつ菜 | toujyou | `toujou_both_wait_pick_live_hand` | both_players, opponent_choice | `dual_ok` |
| PL!N-bp4-007-R＋ | 優木せつ菜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent | `passive_track` |
| PL!N-bp4-007-R＋ | 優木せつ菜 | live_success | `both_players_energy_deck_wait` | both_players, mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!N-bp4-007-SEC | 優木せつ菜 | toujyou | `toujou_both_wait_pick_live_hand` | both_players, opponent_choice | `dual_ok` |
| PL!N-bp4-007-SEC | 優木せつ菜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent | `passive_track` |
| PL!N-bp4-007-SEC | 優木せつ菜 | live_success | `both_players_energy_deck_wait` | both_players, mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!N-bp4-009-P | 天王寺璃奈 | live_start | `draw_from_deck` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp4-009-R | 天王寺璃奈 | live_start | `draw_from_deck` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp4-012-P | 鐘 嵐珠 | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent | `passive_track` |
| PL!N-bp4-012-R | 鐘 嵐珠 | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent | `passive_track` |

### PL!SP-pb2 (10)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-pb2-009-PP | 鬼塚夏美 | toujyou | `optional_pick_member_wait_opp_blade_gap` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!SP-pb2-009-PP | 鬼塚夏美 | live_start | `optional_pick_member_wait_opp_blade_gap` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!SP-pb2-009-R | 鬼塚夏美 | toujyou | `optional_pick_member_wait_opp_blade_gap` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!SP-pb2-009-R | 鬼塚夏美 | live_start | `optional_pick_member_wait_opp_blade_gap` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!SP-pb2-011-PP | 鬼塚冬毬 | jidou | `jidou_center_member_move_choice` | mutate_opponent_stage | `dual_ok` |
| PL!SP-pb2-011-R | 鬼塚冬毬 | jidou | `jidou_center_member_move_choice` | mutate_opponent_stage | `dual_ok` |
| PL!SP-pb2-024-N | 唐 可可 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!SP-pb2-029-N | 米女メイ | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!SP-pb2-029-N | 米女メイ | live_start | `live_start_opp_wait_max_cost` | mutate_opponent_stage | `dual_ok` |
| PL!SP-pb2-047-L | Welcome to 僕らのセカイ | live_start | `live_start_opp_wait_max_cost` | mutate_opponent_stage | `dual_ok` |

### LL-bp4 (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| LL-bp4-001-R＋ | 絢瀬絵里&朝香果林&葉月 恋 | toujyou | `deck_peek_pick_then_opp_wait` | mutate_opponent_stage, read_compare | `dual_ok` |
| LL-bp4-001-R＋ | 絢瀬絵里&朝香果林&葉月 恋 | live_start | `deck_peek_pick_then_opp_wait` | mutate_opponent_stage, read_compare | `dual_ok` |

### LL-PR (1)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| LL-PR-004-PR | 愛♡スクリ～ム！ | live_start | `live_start_love_screem_opp_answer` | mutate_opponent_live, mutate_opponent_stage, opponent_choice | `dual_ok` |

### PL!-bp4 (5)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!-bp4-001-P | 高坂穂乃果 | live_start | `draw_from_deck` | read_compare | `dual_ok` |
| PL!-bp4-001-R | 高坂穂乃果 | live_start | `draw_from_deck` | read_compare | `dual_ok` |
| PL!-bp4-009-P | 矢澤にこ | toujyou | `toujou_opp_active_wait` | mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!-bp4-009-R | 矢澤にこ | toujyou | `toujou_opp_active_wait` | mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!-bp4-018-N | 矢澤にこ | jouji | `passive_track` | passive_opponent, read_compare | `passive_track` |

### PL!-bp5 (14)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!-bp5-004-AR | 園田海未 | kidou | `kidou_opp_wait_group_discount_energy` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-004-P | 園田海未 | kidou | `kidou_opp_wait_group_discount_energy` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-004-R＋ | 園田海未 | kidou | `kidou_opp_wait_group_discount_energy` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-004-SEC | 園田海未 | kidou | `kidou_opp_wait_group_discount_energy` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-007-AR | 東條 希 | toujyou | `toujou_baton_both_trim_hand_draw` | both_players, opponent_choice | `dual_ok` |
| PL!-bp5-007-P | 東條 希 | toujyou | `toujou_baton_both_trim_hand_draw` | both_players, opponent_choice | `dual_ok` |
| PL!-bp5-007-R | 東條 希 | toujyou | `toujou_baton_both_trim_hand_draw` | both_players, opponent_choice | `dual_ok` |
| PL!-bp5-013-N | 園田海未 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-021-L | SUNNY DAY SONG | live_start | `live_start_sunny_day_song_tiered` | opponent_choice | `dual_ok` |
| PL!-bp5-024-L | Private Wars | live_start | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-111-P＋ | 綺羅ツバサ | kidou | `kidou_hand_discard_activate_wait_opp_bonus` | mutate_opponent_hand, mutate_opponent_stage | `dual_ok` |
| PL!-bp5-111-R | 綺羅ツバサ | kidou | `kidou_hand_discard_activate_wait_opp_bonus` | mutate_opponent_hand, mutate_opponent_stage | `dual_ok` |
| PL!-bp5-333-P＋ | 統堂英玲奈 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-bp5-333-R | 統堂英玲奈 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |

### PL!-bp6 (1)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!-bp6-010-N | 高坂穂乃果 | kidou | `kidou_self_to_wait_opp_wait` | mutate_opponent_stage | `dual_ok` |

### PL!-pb1 (21)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!-pb1-002-P＋ | 絢瀬絵里 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-002-P＋ | 絢瀬絵里 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-002-P＋ | 絢瀬絵里 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!-pb1-002-R | 絢瀬絵里 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-002-R | 絢瀬絵里 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-002-R | 絢瀬絵里 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!-pb1-006-P＋ | 西木野真姫 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-006-R | 西木野真姫 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-009-P＋ | 矢澤にこ | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-009-P＋ | 矢澤にこ | toujyou | `toujou_turn_block_effect_activate` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-009-R | 矢澤にこ | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-009-R | 矢澤にこ | toujyou | `toujou_turn_block_effect_activate` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-011-P＋ | 絢瀬絵里 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-011-R | 絢瀬絵里 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-pb1-015-P＋ | 西木野真姫 | toujyou | `toujou_bibi_wait_opp_active_wait` | mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!-pb1-015-P＋ | 西木野真姫 | live_start | `toujou_bibi_wait_opp_active_wait` | mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!-pb1-015-R | 西木野真姫 | toujyou | `toujou_bibi_wait_opp_active_wait` | mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!-pb1-015-R | 西木野真姫 | live_start | `toujou_bibi_wait_opp_active_wait` | mutate_opponent_stage, opponent_choice | `dual_ok` |
| PL!-pb1-018-P＋ | 矢澤にこ | toujyou | `toujou_both_wait_to_empty_stage` | both_players, opponent_choice | `dual_ok` |
| PL!-pb1-018-R | 矢澤にこ | toujyou | `toujou_both_wait_to_empty_stage` | both_players, opponent_choice | `dual_ok` |
| PL!-pb1-030-L | Cutie Panther | live_start | `live_start_need_heart_reduce_fixed` | mutate_opponent_stage, read_compare | `dual_ok` |

### PL!-PR (8)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!-PR-005-PR | 星空 凛 | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-006-PR | 西木野真姫 | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-007-PR | 東條 希 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-007-PR | 東條 希 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-008-PR | 小泉花陽 | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-009-PR | 矢澤にこ | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-009-PR | 矢澤にこ | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!-PR-014-PR | 園田海未 | toujyou | `toujou_opp_hand_reveal_no_live_draw` | mutate_opponent_hand, mutate_opponent_live, read_compare | `dual_ok` |

### PL!HS-bp1 (1)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!HS-bp1-023-L | ド！ド！ド！ | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |

### PL!HS-bp5 (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!HS-bp5-016-N | 桂城 泉 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-bp5-016-N | 桂城 泉 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |

### PL!HS-bp6 (12)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!HS-bp6-004-P | 百生 吟子 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-bp6-004-P | 百生 吟子 | live_start | `live_start_opp_wait_max_cost` | mutate_opponent_stage | `dual_ok` |
| PL!HS-bp6-004-R | 百生 吟子 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-bp6-004-R | 百生 吟子 | live_start | `live_start_opp_wait_max_cost` | mutate_opponent_stage | `dual_ok` |
| PL!HS-bp6-005-P | 徒町 小鈴 | live_start | `live_start_hand_discard_cost_boost_grant_if` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!HS-bp6-005-P＋ | 徒町 小鈴 | live_start | `live_start_hand_discard_cost_boost_grant_if` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!HS-bp6-005-R＋ | 徒町 小鈴 | live_start | `live_start_hand_discard_cost_boost_grant_if` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!HS-bp6-005-SEC | 徒町 小鈴 | live_start | `live_start_hand_discard_cost_boost_grant_if` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!HS-bp6-007-P | セラス 柳田 リリエンフェルト | jidou | `jidou_series_enter_opp_wait` | mutate_opponent_waiting, opponent_choice | `dual_ok` |
| PL!HS-bp6-007-R | セラス 柳田 リリエンフェルト | jidou | `jidou_series_enter_opp_wait` | mutate_opponent_waiting, opponent_choice | `dual_ok` |
| PL!HS-bp6-013-R | 徒町 小鈴 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-bp6-013-R | 徒町 小鈴 | live_start | `live_start_opp_wait_exclude_unit` | mutate_opponent_stage | `dual_ok` |

### PL!HS-cl1 (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!HS-cl1-004-CL | 百生 吟子 | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!HS-cl1-012-CL | Edelied | live_success | `yell_resolution_pick_hand` | mutate_opponent_live, read_compare | `dual_ok` |

### PL!HS-pb1 (16)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!HS-pb1-007-P＋ | セラス 柳田 リリエンフェルト | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!HS-pb1-007-R | セラス 柳田 リリエンフェルト | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!HS-pb1-008-P＋ | 桂城 泉 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-008-P＋ | 桂城 泉 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!HS-pb1-008-R | 桂城 泉 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-008-R | 桂城 泉 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
| PL!HS-pb1-010-P＋ | 村野さやか | toujyou | `toujou_opp_wait_if_high_cost_on_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-010-P＋ | 村野さやか | live_start | `live_start_opp_wait_if_high_cost_on_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-010-R | 村野さやか | toujyou | `toujou_opp_wait_if_high_cost_on_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-010-R | 村野さやか | live_start | `live_start_opp_wait_if_high_cost_on_stage` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-012-P＋ | 百生吟子 | toujyou | `toujou_both_shuffle_deck_bottom_grant_if` | both_players, mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!HS-pb1-012-R | 百生吟子 | toujyou | `toujou_both_shuffle_deck_bottom_grant_if` | both_players, mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!HS-pb1-014-P＋ | 安養寺姫芽 | toujyou | `toujou_opp_front_position_change` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-014-P＋ | 安養寺姫芽 | jouji | `passive_track` | passive_opponent, read_compare | `passive_track` |
| PL!HS-pb1-014-R | 安養寺姫芽 | toujyou | `toujou_opp_front_position_change` | mutate_opponent_stage | `dual_ok` |
| PL!HS-pb1-014-R | 安養寺姫芽 | jouji | `passive_track` | passive_opponent, read_compare | `passive_track` |

### PL!N-bp1 (1)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!N-bp1-026-L | Poppin' Up! | live_success | `yell_resolution_pick_hand` | read_compare | `dual_ok` |

### PL!N-bp5 (18)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!N-bp5-002-AR | 中須かすみ | jouji | `passive_track` | mutate_opponent_stage, passive_opponent, read_compare | `passive_track` |
| PL!N-bp5-002-P | 中須かすみ | jouji | `passive_track` | mutate_opponent_stage, passive_opponent, read_compare | `passive_track` |
| PL!N-bp5-002-R | 中須かすみ | jouji | `passive_track` | mutate_opponent_stage, passive_opponent, read_compare | `passive_track` |
| PL!N-bp5-004-AR | 朝香果林 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp5-004-AR | 朝香果林 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp5-004-P | 朝香果林 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp5-004-P | 朝香果林 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp5-004-R | 朝香果林 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp5-004-R | 朝香果林 | live_start | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!N-bp5-007-AR | 優木せつ菜 | live_start | `grant_jouji_session` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!N-bp5-007-P | 優木せつ菜 | live_start | `grant_jouji_session` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!N-bp5-007-R＋ | 優木せつ菜 | live_start | `grant_jouji_session` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!N-bp5-007-SEC | 優木せつ菜 | live_start | `grant_jouji_session` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!N-bp5-012-AR | 鐘 嵐珠 | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp5-012-P | 鐘 嵐珠 | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp5-012-R＋ | 鐘 嵐珠 | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp5-012-SEC | 鐘 嵐珠 | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!N-bp5-027-L | ミラクル STAY TUNE！ | live_start | `live_card_score_plus` | mutate_opponent_success_live, read_compare | `dual_ok` |

### PL!N-PR (3)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!N-PR-022-PR | エマ・ヴェルデ | toujyou | `toujou_opp_emma_punch_answer` | mutate_opponent_stage | `dual_ok` |
| PL!N-PR-024-PR | 桜坂しずく | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent | `passive_track` |
| PL!N-PR-027-PR | 朝香果林 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |

### PL!S-bp5 (14)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!S-bp5-002-AR | 桜内梨子 | live_start | `live_start_side_cost_equal_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp5-002-P | 桜内梨子 | live_start | `live_start_side_cost_equal_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp5-002-R＋ | 桜内梨子 | live_start | `live_start_side_cost_equal_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp5-002-SEC | 桜内梨子 | live_start | `live_start_side_cost_equal_opp_wait` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp5-008-AR | 小原鞠莉 | jouji | `passive_track` | passive_opponent | `passive_track` |
| PL!S-bp5-008-P | 小原鞠莉 | jouji | `passive_track` | passive_opponent | `passive_track` |
| PL!S-bp5-008-R | 小原鞠莉 | jouji | `passive_track` | passive_opponent | `passive_track` |
| PL!S-bp5-010-N | 高海千歌 | toujyou | `toujou_grant_opp_live_need_heart_if_stage_hearts` | mutate_opponent_live, mutate_opponent_stage | `dual_ok` |
| PL!S-bp5-011-N | 桜内梨子 | toujyou | `toujou_grant_opp_live_need_heart_if_stage_hearts` | mutate_opponent_live, mutate_opponent_stage | `dual_ok` |
| PL!S-bp5-016-N | 国木田花丸 | live_start | `grant_jouji_session` | mutate_opponent_stage, read_compare | `dual_ok` |
| PL!S-bp5-019-L | not ALONE not HITORI | live_success | `yell_resolution_pick_hand` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!S-bp5-022-L | SELF CONTROL!! | live_success | `live_card_score_plus` | mutate_opponent_live, read_compare | `dual_ok` |
| PL!S-bp5-111-P＋ | 鹿角聖良 | jidou | `jidou_area_move_opp_wait` | mutate_opponent_stage, mutate_opponent_waiting | `dual_ok` |
| PL!S-bp5-111-R | 鹿角聖良 | jidou | `jidou_area_move_opp_wait` | mutate_opponent_stage, mutate_opponent_waiting | `dual_ok` |

### PL!S-bp6 (11)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!S-bp6-001-P | 高海千歌 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp6-001-R | 高海千歌 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp6-007-P | 国木田花丸 | live_start | `live_start_pay_or_discard_conditional_grant_members` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!S-bp6-007-R | 国木田花丸 | live_start | `live_start_pay_or_discard_conditional_grant_members` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!S-bp6-009-P | 黒澤ルビィ | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent, read_compare | `passive_track` |
| PL!S-bp6-009-P＋ | 黒澤ルビィ | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent, read_compare | `passive_track` |
| PL!S-bp6-009-R＋ | 黒澤ルビィ | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent, read_compare | `passive_track` |
| PL!S-bp6-009-SEC | 黒澤ルビィ | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent, read_compare | `passive_track` |
| PL!S-bp6-015-N | 津島善子 | toujyou | `optional_self_wait_opp_stage` | mutate_opponent_stage | `dual_ok` |
| PL!S-bp6-022-L | 近未来ハッピーエンド | live_success | `live_card_score_plus` | mutate_opponent_energy, read_compare | `dual_ok` |
| PL!S-bp6-024-L | コワレヤスキ | live_success | `live_card_score_plus` | opponent_choice | `dual_ok` |

### PL!S-pb1 (17)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!S-pb1-001-P＋ | 高海千歌 | toujyou | `toujou_wait_pick_hand` | mutate_opponent_hand, read_compare | `dual_ok` |
| PL!S-pb1-001-R | 高海千歌 | toujyou | `toujou_wait_pick_hand` | mutate_opponent_hand, read_compare | `dual_ok` |
| PL!S-pb1-002-P＋ | 桜内梨子 | toujyou | `toujou_opp_optional_live_discard_or_score` | mutate_opponent_live, opponent_choice | `dual_ok` |
| PL!S-pb1-002-R | 桜内梨子 | toujyou | `toujou_opp_optional_live_discard_or_score` | mutate_opponent_live, opponent_choice | `dual_ok` |
| PL!S-pb1-005-PR | 渡辺 曜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent, read_compare | `passive_track` |
| PL!S-pb1-005-P＋ | 渡辺 曜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent, read_compare | `passive_track` |
| PL!S-pb1-005-R | 渡辺 曜 | jouji | `passive_track` | mutate_opponent_energy, passive_opponent, read_compare | `passive_track` |
| PL!S-pb1-006-P＋ | 津島善子 | kidou | `kidou_reveal_live_opp_decline_grant` | mutate_opponent_live, opponent_choice | `dual_ok` |
| PL!S-pb1-006-R | 津島善子 | kidou | `kidou_reveal_live_opp_decline_grant` | mutate_opponent_live, opponent_choice | `dual_ok` |
| PL!S-pb1-008-P＋ | 小原鞠莉 | live_start | `deck_top_look_reorder` | mutate_opponent_deck, pick_self_or_opponent | `dual_ok` |
| PL!S-pb1-008-R | 小原鞠莉 | live_start | `deck_top_look_reorder` | mutate_opponent_deck, pick_self_or_opponent | `dual_ok` |
| PL!S-pb1-009-P＋ | 黒澤ルビィ | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent | `passive_track` |
| PL!S-pb1-009-R | 黒澤ルビィ | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent | `passive_track` |
| PL!S-pb1-019-L | 元気全開DAY！DAY！DAY！ | live_success | `live_success_opponent_energy_deck_wait` | mutate_opponent_deck, opponent_choice | `dual_ok` |
| PL!S-pb1-021-L | Strawberry Trapper | live_success | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!S-pb1-022-L | 逃走迷走メビウスループ | live_success | `live_success_tie_block_success_live` | mutate_opponent_live, opponent_choice, read_compare | `dual_ok` |
| PL!S-pb1-022-L＋ | 逃走迷走メビウスループ | live_success | `live_success_tie_block_success_live` | mutate_opponent_live, opponent_choice, read_compare | `dual_ok` |

### PL!S-PR (6)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!S-PR-029-PR | 渡辺 曜 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent, read_compare | `passive_track` |
| PL!S-PR-030-PR | 津島善子 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent, read_compare | `passive_track` |
| PL!S-PR-031-PR | 国木田花丸 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent, read_compare | `passive_track` |
| PL!S-PR-039-PR | 渡辺 曜 | jouji | `passive_track` | mutate_opponent_success_live, passive_opponent | `passive_track` |
| PL!S-PR-041-PR | 黒澤ルビィ | toujyou | `draw_from_deck` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!S-PR-042-PR | 小原鞠莉 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |

### PL!SP-bp1 (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-bp1-023-L | START!! True dreams | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |
| PL!SP-bp1-023-SRL | START!! True dreams | live_success | `live_score_higher_energy_wait` | mutate_opponent_deck, read_compare | `dual_ok` |

### PL!SP-bp4 (10)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-bp4-009-P | 鬼塚夏美 | jouji | `passive_track` | passive_opponent, read_compare | `passive_track` |
| PL!SP-bp4-009-R | 鬼塚夏美 | jouji | `passive_track` | passive_opponent, read_compare | `passive_track` |
| PL!SP-bp4-011-P | 鬼塚冬毬 | jidou | `jidou_area_move_opp_wait` | mutate_opponent_stage, mutate_opponent_waiting | `dual_ok` |
| PL!SP-bp4-011-P＋ | 鬼塚冬毬 | jidou | `jidou_area_move_opp_wait` | mutate_opponent_stage, mutate_opponent_waiting | `dual_ok` |
| PL!SP-bp4-011-R＋ | 鬼塚冬毬 | jidou | `jidou_area_move_opp_wait` | mutate_opponent_stage, mutate_opponent_waiting | `dual_ok` |
| PL!SP-bp4-011-SEC | 鬼塚冬毬 | jidou | `jidou_area_move_opp_wait` | mutate_opponent_stage, mutate_opponent_waiting | `dual_ok` |
| PL!SP-bp4-021-N | ウィーン・マルガレーテ | jouji | `passive_track` | passive_opponent, read_compare | `passive_track` |
| PL!SP-bp4-024-L | ノンフィクション!! | live_start | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!SP-bp4-024-SECL | ノンフィクション!! | live_start | `live_card_score_plus` | read_compare | `dual_ok` |
| PL!SP-bp4-024-SRL | ノンフィクション!! | live_start | `live_card_score_plus` | read_compare | `dual_ok` |

### PL!SP-bp5 (13)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-bp5-001-AR | 澁谷かのん | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-AR | 澁谷かのん | live_start | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-P | 澁谷かのん | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-P | 澁谷かのん | live_start | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-R＋ | 澁谷かのん | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-R＋ | 澁谷かのん | live_start | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-SEC | 澁谷かのん | toujyou | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-001-SEC | 澁谷かのん | live_start | `ability_pick_one` | mutate_opponent_stage | `dual_ok` |
| PL!SP-bp5-010-AR | ウィーン・マルガレーテ | toujyou | `toujou_both_center_position_change` | opponent_choice | `dual_ok` |
| PL!SP-bp5-010-P | ウィーン・マルガレーテ | toujyou | `toujou_both_center_position_change` | opponent_choice | `dual_ok` |
| PL!SP-bp5-010-R | ウィーン・マルガレーテ | toujyou | `toujou_both_center_position_change` | opponent_choice | `dual_ok` |
| PL!SP-bp5-023-L | Shooting Voice!! | live_success | `live_card_score_plus` | mutate_opponent_success_live, read_compare | `dual_ok` |
| PL!SP-bp5-027-L | HOT PASSION!! | live_success | `live_success_optional_energy_wait_opp_draw` | mutate_opponent_deck, mutate_opponent_energy, mutate_opponent_live, mutate_opponent_stage, opponent_choice | `dual_ok` |

### PL!SP-pb1 (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-pb1-003-P＋ | 嵐 千砂都 | toujyou | `toujou_rotate_stage_areas` | opponent_choice | `dual_ok` |
| PL!SP-pb1-003-R | 嵐 千砂都 | toujyou | `toujou_rotate_stage_areas` | opponent_choice | `dual_ok` |

### PL!SP-PR (2)

| ID | 名前 | タイミング | template | kinds | dualStatus |
|----|------|------------|----------|-------|------------|
| PL!SP-PR-021-PR | 澁谷かのん | live_start | `live_start_opp_wait_if_stage_hearts` | mutate_opponent_stage | `dual_ok` |
| PL!SP-PR-022-PR | 若菜四季 | jouji | `passive_track` | mutate_opponent_stage, passive_opponent | `passive_track` |
