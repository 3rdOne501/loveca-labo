# 効果が複雑・処理ミスの可能性が高いカード

（能力テキストで重複排除。-P/-P＋/-SEC 等のバリアントは代表1枚に集約）

- ユニーク能力: 827
- リスクスコア >= 6: 108 件
- 取りこぼし疑い: 0 件

## A. テンプレートが効果の一部を取りこぼしている疑い（最優先）

## B. リスクスコア順（複雑カード全般）

| # | 代表カード | 名前 | 種別 | スコア | 分類 | 主因 |
|---|-----------|------|------|--------|------|------|
| 1 | LL-bp4-001-R＋ | 絢瀬絵里&朝香果林&葉月 恋 | メンバー | 15 | toujyou=deck_peek_pick_then_opp_wait, live_start=deck_peek_pick_then_opp_wait | 多段効果(。x4),逐次(その後/さらに),相手参照,条件:閾値,長文(143字) |
| 2 | PL!-pb1-015-R | 西木野真姫 | メンバー | 14 | toujyou=toujou_bibi_wait_opp_active_wait, live_start=toujou_bibi_wait_opp_active_wait, jidou=jidou_opp_wait_draw | 2段効果,相手参照,条件:場合,長文(89字),条件:閾値 |
| 3 | PL!-pb1-002-R | 絢瀬絵里 | メンバー | 13 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage, jouji=passive_track | 相手参照,条件:場合,閾値,長文(83字) |
| 4 | PL!SP-bp5-001-R＋ | 澁谷かのん | メンバー | 13 | toujyou=ability_pick_one, live_start=ability_pick_one, kidou=kidou_wait_or_hand_for_energy | 多段効果(。x3),相手参照,条件:閾値,選択 |
| 5 | PL!-PR-007-PR | 東條 希 | メンバー | 11 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,条件:閾値,長文(85字) |
| 6 | PL!-PR-009-PR | 矢澤にこ | メンバー | 11 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,条件:閾値,長文(85字) |
| 7 | PL!S-bp3-012-N | 松浦果南 | メンバー | 11 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,条件:閾値,長文(85字) |
| 8 | PL!S-bp3-017-N | 小原鞠莉 | メンバー | 11 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,条件:閾値,長文(85字) |
| 9 | PL!N-bp3-017-N | 宮下 愛 | メンバー | 11 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,条件:閾値,長文(85字) |
| 10 | PL!N-bp3-023-N | ミア・テイラー | メンバー | 11 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,条件:閾値,長文(85字) |
| 11 | PL!SP-pb2-009-R | 鬼塚夏美 | メンバー | 11 | toujyou=optional_pick_member_wait_opp_blade_gap, live_start=optional_pick_member_wait_opp_blade_gap | 2段効果,相手参照,条件:閾値,長文(127字) |
| 12 | PL!S-bp2-008-R＋ | 小原鞠莉 | メンバー | 10 | toujyou=waiting_to_deck_bottom, jouji=passive_track | 多段効果(。x3),条件:場合,閾値,エール公開参照,置換(代わりに),長文(135字) |
| 13 | PL!-bp5-004-R＋ | 園田海未 | メンバー | 10 | kidou=kidou_opp_wait_group_discount_energy, jidou=jidou_yell_grant_jouji_nobh_members | 2段効果,相手参照,条件:閾値,長文(83字),条件:場合,閾値,エール公開参照 |
| 14 | PL!HS-bp5-016-N | 桂城 泉 | メンバー | 10 | toujyou=optional_self_wait_opp_stage, jouji=passive_track | 2段効果,相手参照,条件:閾値,長文(86字),条件:かぎり,閾値 |
| 15 | PL!HS-bp6-005-R＋ | 徒町 小鈴 | メンバー | 10 | live_start=live_start_hand_discard_cost_boost_grant_if, live_success=yell_resolution_pick_hand | 2段効果,逐次(その後/さらに),相手参照,条件:場合,比較,長文(119字),エール公開参照 |
| 16 | PL!SP-pb2-002-R | 唐 可可 | メンバー | 10 | kidou=ability_sequence | ability_sequence(複合連結),多段効果(。x4),条件:場合,閾値,選択,置換(代わりに),長文(176字) |
| 17 | PL!N-bp4-007-R＋ | 優木せつ菜 | メンバー | 9 | toujyou=toujou_both_wait_pick_live_hand, jouji=passive_track, live_success=both_players_energy_deck_wait | 相手参照,条件:かぎり,閾値 |
| 18 | PL!N-bp5-001-R＋ | 上原歩夢 | メンバー | 9 | jidou=jidou_yell_grant_jouji | 多段効果(。x3),逐次(その後/さらに),条件:場合,閾値,選択,エール公開参照,長文(117字) |
| 19 | PL!N-bp5-004-R | 朝香果林 | メンバー | 9 | toujyou=optional_self_wait_opp_stage, live_start=optional_self_wait_opp_stage | 2段効果,相手参照,長文(92字) |
| 20 | PL!SP-bp5-023-L | Shooting Voice!! | ライブ | 9 | live_success=live_card_score_plus | 相手参照,条件:場合,閾値,プレイヤー選択,エール公開参照,長文(85字) |
| 21 | PL!HS-pb1-010-R | 村野さやか | メンバー | 9 | toujyou=toujou_opp_wait_if_high_cost_on_stage, live_start=live_start_opp_wait_if_high_cost_on_stage | 相手参照,条件:場合,閾値 |
| 22 | PL!HS-bp6-004-R | 百生 吟子 | メンバー | 9 | toujyou=optional_self_wait_opp_stage, live_start=ability_sequence | 相手参照,条件:閾値,ability_sequence(複合連結) |
| 23 | PL!S-PR-041-PR | 黒澤ルビィ | メンバー | 8 | toujyou=draw_from_deck | 多段効果(。x3),相手参照,条件:場合,選択,プレイヤー選択 |
| 24 | PL!N-bp1-026-L | Poppin' Up! | ライブ | 8 | live_success=yell_resolution_pick_hand | 2段効果,相手参照,条件:場合,比較,エール公開参照,長文(97字) |
| 25 | PL!-bp3-002-R | 絢瀬絵里 | メンバー | 8 | toujyou=optional_self_wait_opp_stage, jouji=passive_track | 2段効果,相手参照,条件:閾値,長文(86字) |
| 26 | PL!S-bp3-007-R | 国木田花丸 | メンバー | 8 | kidou=draw_from_deck | 多段効果(。x3),相手参照,条件:場合,選択,プレイヤー選択 |
| 27 | PL!S-bp3-024-L | Deep Resonance | ライブ | 8 | live_start=ability_pick_one | 多段効果(。x3),相手参照,条件:場合,閾値,選択,長文(119字) |
| 28 | PL!N-bp4-030-L | Daydream Mermaid | ライブ | 8 | live_success=live_success_pick_options | 多段効果(。x4),条件:場合,閾値,選択,置換(代わりに),長文(116字) |
| 29 | PL!-bp5-021-L | SUNNY DAY SONG | ライブ | 8 | live_start=live_start_sunny_day_song_tiered | 多段効果(。x3),逐次(その後/さらに),相手参照,条件:場合,閾値,長文(138字) |
| 30 | PL!S-bp5-019-L | not ALONE not HITORI | ライブ | 8 | live_success=yell_resolution_pick_hand | 相手参照,条件:場合,閾値,プレイヤー選択,エール公開参照 |
| 31 | PL!-bp5-024-L | Private Wars | ライブ | 8 | live_start=ability_pick_one | 多段効果(。x3),相手参照,条件:場合,閾値,選択,長文(118字) |
| 32 | PL!HS-pb1-014-R | 安養寺姫芽 | メンバー | 8 | toujyou=toujou_opp_front_position_change, jouji=passive_track | 相手参照,条件:場合,条件:かぎり,比較 |
| 33 | PL!S-bp6-009-R＋ | 黒澤ルビィ | メンバー | 8 | jouji=passive_track, live_success=yell_reveal_series_live_score_plus | 相手参照,条件:かぎり,比較,条件:場合,エール公開参照 |
| 34 | PL!HS-bp6-008-R | 桂城 泉 | メンバー | 8 | toujyou=ability_sequence, live_start=live_start_activate_self_if_low_score_live | ability_sequence(複合連結),2段効果,逐次(その後/さらに),条件:閾値,条件:場合,閾値 |
| 35 | PL!SP-pb2-011-R | 鬼塚冬毬 | メンバー | 8 | jidou=jidou_center_member_move_choice, live_start=live_start_position_change | 多段効果(。x4),相手参照,条件:閾値,選択,長文(110字) |
| 36 | PL!S-bp2-007-R＋ | 国木田花丸 | メンバー | 7 | jidou=jidou_yell_draw, live_start=live_start_hand_live_to_deck_bottom_look | 条件:場合,閾値,エール公開参照,2段効果,長文(86字) |
| 37 | PL!SP-bp2-010-R＋ | ウィーン・マルガレーテ | メンバー | 7 | jouji=passive_track, live_start=live_start_yell_reveal_reduction | 相手参照,条件:場合,閾値,エール公開参照 |
| 38 | PL!SP-bp2-011-R | 鬼塚冬毬 | メンバー | 7 | toujyou=toujou_wait_pick_opp_live | 多段効果(。x3),相手参照,条件:場合,選択,長文(82字) |
| 39 | PL!S-pb1-008-R | 小原鞠莉 | メンバー | 7 | live_start=deck_top_look_reorder | 多段効果(。x3),相手参照,選択,プレイヤー選択 |
| 40 | PL!S-bp3-002-R | 桜内梨子 | メンバー | 7 | live_success=yell_resolution_pick_self_score | 2段効果,相手参照,条件:場合,比較,エール公開参照 |
| 41 | PL!N-bp3-011-R | ミア・テイラー | メンバー | 7 | toujyou=toujou_opp_stage_member_match_grant | 多段効果(。x3),相手参照,条件:場合,同点/同値,長文(129字) |
| 42 | PL!-pb1-004-R | 園田海未 | メンバー | 7 | toujyou=toujou_success_live_score_tiered | 多段効果(。x5),条件:場合,閾値,置換(代わりに),長文(127字) |
| 43 | PL!-bp4-005-R＋ | 星空 凛 | メンバー | 7 | toujyou=toujou_wait_pick_hand, jouji=passive_track, live_start=live_start_position_change | 条件:閾値,多段効果(。x3),条件:場合,閾値,長文(131字) |
| 44 | PL!-bp4-005-P＋ | 星空凛 | メンバー | 7 | toujyou=toujou_wait_pick_hand, jouji=passive_track, live_start=live_start_position_change | 条件:閾値,多段効果(。x3),条件:場合,閾値,長文(131字) |
| 45 | PL!N-bp4-002-R | 中須かすみ | メンバー | 7 | live_start=live_start_pick_player_deck_top_peek | 多段効果(。x3),相手参照,選択,プレイヤー選択 |
| 46 | PL!N-bp4-010-R＋ | 三船栞子 | メンバー | 7 | toujyou=success_live_waiting_swap, live_start=live_start_pick_live_frame_match_success_live_grant | 2段効果,条件:場合,長文(90字),条件:場合,同点/同値 |
| 47 | PL!N-bp4-011-R＋ | ミア・テイラー | メンバー | 7 | live_start=heart_color_pick_grant, live_success=live_success_deck_wait_pick_live | 2段効果,逐次(その後/さらに),条件:場合,閾値,長文(94字) |
| 48 | PL!N-bp4-025-L | VIVID WORLD | ライブ | 7 | live_start=live_start_yell_blade_remap_slot, live_success=live_success_yell_series_members_all_hearts_score | エール公開参照,長文(87字),条件:場合 |
| 49 | PL!N-pb1-004-R | 朝香果林 | メンバー | 7 | jouji=passive_track, live_start=live_start_position_change | 条件:かぎり,多段効果(。x3),条件:場合,閾値,長文(102字) |
| 50 | PL!-bp5-003-R＋ | 南 ことり | メンバー | 7 | jouji=passive_track, kidou=kidou_hand_discard_series_branch | 条件:かぎり,閾値,多段効果(。x4),条件:場合,長文(127字) |
| 51 | PL!N-bp5-007-R＋ | 優木せつ菜 | メンバー | 7 | live_start=grant_jouji_session, live_success=draw_then_hand_discard | 相手参照,条件:場合,同点/同値,条件:場合,閾値 |
| 52 | PL!S-bp5-022-L | SELF CONTROL!! | ライブ | 7 | live_start=live_start_moved_members_blade_grant, live_success=live_card_score_plus | 相手参照,条件:場合,比較,エール公開参照 |
| 53 | PL!-bp6-003-R＋ | 南ことり | メンバー | 7 | live_start=heart_color_pick_grant, live_success=live_success_enter_under_member | 多段効果(。x3),条件:場合,閾値,長文(92字),条件:閾値 |
| 54 | PL!-bp6-003-P＋ | 南ことり | メンバー | 7 | live_start=heart_color_pick_grant, live_success=live_success_enter_under_member | 多段効果(。x3),条件:場合,閾値,長文(92字),条件:閾値 |
| 55 | PL!HS-bp6-013-R | 徒町 小鈴 | メンバー | 7 | toujyou=optional_self_wait_opp_stage, live_start=live_start_opp_wait_exclude_unit | 相手参照,条件:閾値 |
| 56 | PL!HS-bp6-029-L | Proof | ライブ | 7 | live_start=live_start_tiered_stage_cost_deck_look | 多段効果(。x3),逐次(その後/さらに),条件:場合,閾値,選択,長文(103字) |
| 57 | PL!SP-pb2-029-N | 米女メイ | メンバー | 7 | toujyou=optional_self_wait_opp_stage, live_start=live_start_opp_wait_max_cost | 相手参照,条件:閾値 |
| 58 | PL!-PR-005-PR | 星空 凛 | メンバー | 6 | toujyou=ability_pick_one | 多段効果(。x3),相手参照,条件:閾値,選択 |
| 59 | PL!-PR-006-PR | 西木野真姫 | メンバー | 6 | toujyou=ability_pick_one | 多段効果(。x3),相手参照,条件:閾値,選択 |
| 60 | PL!-PR-008-PR | 小泉花陽 | メンバー | 6 | toujyou=ability_pick_one | 多段効果(。x3),相手参照,条件:閾値,選択 |
| 61 | PL!S-PR-029-PR | 渡辺 曜 | メンバー | 6 | jouji=passive_track | 相手参照,条件:場合,閾値,プレイヤー選択 |
| 62 | PL!S-PR-030-PR | 津島善子 | メンバー | 6 | jouji=passive_track | 相手参照,条件:場合,閾値,プレイヤー選択 |
| 63 | PL!S-PR-031-PR | 国木田花丸 | メンバー | 6 | jouji=passive_track | 相手参照,条件:場合,閾値,プレイヤー選択 |
| 64 | PL!N-PR-022-PR | エマ・ヴェルデ | メンバー | 6 | toujyou=toujou_opp_emma_punch_answer | 多段効果(。x5),相手参照,条件:場合,長文(163字) |
| 65 | LL-PR-004-PR | 愛♡スクリ～ム！ | ライブ | 6 | live_start=live_start_love_screem_opp_answer | 多段効果(。x4),相手参照,条件:場合,長文(135字) |
| 66 | PL!SP-bp1-023-L | START!! True dreams | ライブ | 6 | live_success=live_score_higher_energy_wait | 2段効果,相手参照,条件:場合,比較,長文(92字) |
| 67 | PL!HS-bp1-022-L | AWOKE | ライブ | 6 | live_success=draw_from_deck | 2段効果,条件:場合,閾値,エール公開参照,長文(96字) |
| 68 | PL!SP-pb1-008-R | 若菜四季 | メンバー | 6 | toujyou=toujou_draw_then_position_change | 多段効果(。x4),逐次(その後/さらに),条件:場合,選択,長文(98字) |
| 69 | PL!S-bp2-004-R | 黒澤ダイヤ | メンバー | 6 | jidou=jidou_yell_retry_no_live | 2段効果,条件:場合,閾値,エール公開参照,長文(116字) |
| 70 | PL!SP-bp2-006-R＋ | 桜小路きな子 | メンバー | 6 | toujyou=toujou_baton_discarded_pick_hand, kidou=kidou_hand_discard_trigger_ability | 条件:場合,2段効果,条件:場合,閾値,長文(93字) |
| 71 | PL!SP-bp2-025-L | Bubble Rise | ライブ | 6 | live_success=yell_resolution_pick_hand | 条件:場合,閾値,選択,エール公開参照,長文(95字) |
| 72 | PL!S-pb1-019-L | 元気全開DAY！DAY！DAY！ | ライブ | 6 | live_start=live_start_disable_self_live_success_if, live_success=live_success_opponent_energy_deck_wait | 条件:場合,閾値,無効化,相手参照 |
| 73 | PL!-bp3-022-L | ユメノトビラ | ライブ | 6 | live_start=live_start_deck_reveal_both_stage_members_score | 多段効果(。x3),逐次(その後/さらに),相手参照,長文(100字) |
| 74 | PL!-bp3-024-L | 夏色えがおで1,2,Jump! | ライブ | 6 | live_start=ability_sequence | ability_sequence(複合連結),2段効果,条件:場合,選択,長文(82字) |
| 75 | PL!S-bp3-005-R | 渡辺 曜 | メンバー | 6 | live_success=draw_from_deck | 相手参照,条件:場合,比較,エール公開参照 |
| 76 | PL!N-bp3-010-R | 三船栞子 | メンバー | 6 | live_start=live_start_pick_player_waiting_deck_bottom | 2段効果,相手参照,選択,プレイヤー選択 |
| 77 | PL!N-bp3-028-L | ツナガルコネクト | ライブ | 6 | live_start=live_start_per_series_member_deck_look_reveal_score | 多段効果(。x4),逐次(その後/さらに),条件:場合,選択,長文(134字) |
| 78 | PL!-pb1-013-R | 園田海未 | メンバー | 6 | kidou=kidou_hand_reveal_grant_if_live | 多段効果(。x3),相手参照,条件:場合,長文(85字) |
| 79 | PL!-pb1-030-L | Cutie Panther | ライブ | 6 | live_start=live_start_need_heart_reduce_fixed, live_success=live_success_recover_from_waiting | 相手参照,条件:場合,条件:場合,閾値 |
| 80 | PL!-bp4-002-R＋ | 絢瀬絵里 | メンバー | 6 | jouji=passive_track, kidou=kidou_hand_cost_wait_pick_hand | 条件:かぎり,2段効果,条件:場合,閾値,長文(90字) |
| 81 | PL!-bp4-002-SEC | 絢瀬絵里 | メンバー | 6 | jouji=passive_track, kidou=kidou_hand_cost_wait_pick_hand | 条件:かぎり,2段効果,条件:場合,閾値,長文(90字) |
| 82 | PL!N-bp4-004-R＋ | 朝香果林 | メンバー | 6 | live_start=ability_sequence | ability_sequence(複合連結),2段効果,相手参照,条件:閾値 |
| 83 | PL!N-bp4-006-R | 近江彼方 | メンバー | 6 | toujyou=ability_sequence | ability_sequence(複合連結),2段効果,条件:場合,閾値,長文(91字) |
| 84 | PL!SP-bp4-005-R＋ | 葉月 恋 | メンバー | 6 | toujyou=energy_deck_to_wait, jouji=passive_track | 条件:場合,閾値,長文(87字),条件:かぎり,閾値 |
| 85 | PL!SP-bp4-024-L | ノンフィクション!! | ライブ | 6 | live_start=ability_sequence | ability_sequence(複合連結),相手参照,条件:場合,比較 |
| 86 | PL!N-pb1-037-L | Cara Tesoro | ライブ | 6 | live_start=live_start_series_activation_score | 2段効果,逐次(その後/さらに),条件:場合,置換(代わりに),長文(140字) |
| 87 | PL!S-bp5-004-R | 黒澤ダイヤ | メンバー | 6 | toujyou=ability_pick_one | 多段効果(。x5),条件:場合,閾値,選択,長文(175字) |
| 88 | PL!N-bp5-011-R | ミア・テイラー | メンバー | 6 | toujyou=ability_pick_one | 多段効果(。x3),条件:場合,閾値,選択,長文(125字) |
| 89 | PL!N-bp5-012-R＋ | 鐘 嵐珠 | メンバー | 6 | kidou=grant_jouji_session, live_success=live_score_higher_energy_wait | 相手参照,条件:場合,比較,長文(83字) |
| 90 | PL!N-bp5-027-L | ミラクル STAY TUNE！ | ライブ | 6 | live_start=live_card_score_plus | 相手参照,条件:場合,閾値,プレイヤー選択 |
| 91 | PL!SP-bp5-002-R＋ | 唐 可可 | メンバー | 6 | kidou=draw_then_hand_discard | 多段効果(。x3),逐次(その後/さらに),条件:場合,閾値,長文(122字) |
| 92 | PL!SP-bp5-010-R | ウィーン・マルガレーテ | メンバー | 6 | toujyou=toujou_both_center_position_change | 多段効果(。x3),相手参照,条件:場合,長文(109字) |
| 93 | PL!HS-bp5-005-R | 徒町 小鈴 | メンバー | 6 | live_start=live_start_dollcostra_cost_set_grant_if | 多段効果(。x3),条件:場合,閾値,選択,長文(156字) |
| 94 | PL!HS-bp5-022-L | Retrofuture | ライブ | 6 | live_start=ability_pick_one | 多段効果(。x3),条件:場合,閾値,選択,長文(129字) |
| 95 | LL-bp5-001-L | Live with a smile! | ライブ | 6 | live_success=live_card_score_plus | 条件:場合,閾値,選択,エール公開参照,長文(126字) |
| 96 | PL!-bp5-111-R | 綺羅ツバサ | メンバー | 6 | jouji=passive_track, kidou=kidou_hand_discard_activate_wait_opp_bonus | 2段効果,相手参照,条件:場合,長文(90字) |
| 97 | PL!HS-sd1-002-SD | 村野さやか | メンバー | 6 | live_start=ability_sequence | ability_sequence(複合連結),多段効果(。x4),条件:場合,長文(111字) |
| 98 | PL!HS-pb1-005-R | 徒町小鈴 | メンバー | 6 | live_start=live_start_number_reveal_grant_if | 多段効果(。x5),条件:場合,閾値,選択,長文(130字) |
| 99 | PL!HS-pb1-008-R | 桂城 泉 | メンバー | 6 | toujyou=optional_self_wait_opp_stage, jouji=passive_track | 相手参照,条件:閾値 |
| 100 | PL!HS-pb1-012-R | 百生吟子 | メンバー | 6 | toujyou=toujou_both_shuffle_deck_bottom_grant_if | 2段効果,相手参照,条件:場合,閾値,長文(122字) |
| 101 | PL!HS-pb1-028-L | COMPASS | ライブ | 6 | live_start=live_start_trigger_stage_member_live_start | 多段効果(。x3),条件:場合,閾値,選択,長文(88字) |
| 102 | PL!S-bp6-007-R | 国木田花丸 | メンバー | 6 | live_start=live_start_pay_or_discard_conditional_grant_members | 2段効果,相手参照,条件:場合,閾値,長文(130字) |
| 103 | PL!S-bp6-020-L | 冒険Type A, B, C!! | ライブ | 6 | live_start=ability_pick_one | 多段効果(。x5),条件:場合,閾値,選択,長文(127字) |
| 104 | PL!S-bp6-021-L | MIRAI TICKET | ライブ | 6 | jidou=jidou_yell_discard_nobh_series_extra_yell | 多段効果(。x3),条件:場合,エール公開参照,長文(142字) |
| 105 | PL!HS-cl1-004-CL | 百生 吟子 | メンバー | 6 | toujyou=ability_pick_one | 多段効果(。x3),相手参照,条件:閾値,選択 |
| 106 | PL!HS-cl1-011-CL | ド！ド！ド！ | ライブ | 6 | live_success=live_success_pick_options | 多段効果(。x3),条件:場合,閾値,選択,長文(103字) |
| 107 | PL!HS-cl1-012-CL | Edelied | ライブ | 6 | live_success=yell_resolution_pick_hand | 相手参照,条件:場合,同点/同値,閾値,エール公開参照 |
| 108 | PL!SP-pb2-010-R | ウィーン・マルガレーテ | メンバー | 6 | live_start=live_start_mandatory_energy_deck_unless_hand_discard, live_success=live_success_pick_options | 条件:かぎり,多段効果(。x3),条件:閾値,選択 |
