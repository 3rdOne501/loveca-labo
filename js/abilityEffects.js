/**
 * カード能力文の分類（cards.json の `ability` フィールド）。
 * ソロプレイの自動処理テンプレートと、手動ガイドへの振り分けに使う。
 */
import { T_LIVE, T_MEMBER } from "./config.js";
import { catalogCardGroupKey, catalogCardMatchesGroupTag } from "./cardGroups.js";
import { classifyJidouAutoSegment, jidouEffectIsAutomated } from "./jidouAutoEffects.js";
import { abilityWikiCanonicalKeys, wikiAbilityStemToCanonical } from "./gameStatusIcons.js";
import { applyAbilityComposition } from "./abilityComposition.js";

/** トリガーアイコン（能力の発動契機）として扱う canonical キー */
const TRIGGER_CANON_KEYS = ["toujyou", "kidou", "live_start", "live_success", "jouji", "jidou"];

/** @typedef {'kidou'|'toujyou'|'live_start'|'live_success'|'jouji'|'jidou'|'none'} AbilityTrigger */
/**
 * @typedef {'none'
 *   |'kidou_stage_wait_pick_hand'
 *   |'kidou_wait_pick_hand'
 *   |'kidou_hand_cost_wait_pick_hand'
 *   |'kidou_hand_discard_activate_wait_opp_bonus'
 *   |'kidou_wait_to_stage'
 *   |'deck_top_to_waiting'
 *   |'deck_top_look_reorder'
 *   |'deck_top_pick_recover'
 *   |'toujou_wait_pick_hand'
 *   |'toujou_success_live_pick_hand'
 *   |'draw_from_deck'
 *   |'draw_then_hand_discard'
 *   |'passive_track'
 *   |'blade_gain_only'
 *   |'ability_pick_one'
 *   |'live_success_pick_options'
 *   |'pay_energy_pick_one'
 *   |'optional_energy_blade_until_live_end'
 *   |'kidou_wait_or_hand_for_energy'
 *   |'toujou_liella_double_baton_center'
 *   |'activate_energy'
 *   |'energy_deck_to_wait'
 *   |'energy_deck_to_active'
 *   |'draw_per_stage_member_discard'
 *   |'draw_until_hand_size'
 *   |'toujou_hand_stage_enter'
 *   |'waiting_to_deck_bottom'
 *   |'grant_jouji_session'
 *   |'live_start_yell_reveal_reduction'
 *   |'live_start_position_change'
 *   |'live_start_activate_all_stage_members'
 *   |'live_start_activate_liella_and_energy'
 *   |'live_start_hand_live_to_deck_bottom_look'
 *   |'kidou_multi_choice'
 *   |'kidou_self_to_wait_recover'
 *   |'live_start_hand_discard_blade_per'
 *   |'live_start_hand_blade_per'
 *   |'toujou_deck_top_wait_if_all_members'
 *   |'toujou_deck_top_wait_if_all_heart'
 *   |'toujou_both_wait_to_empty_stage'
 *   |'toujou_both_wait_pick_live_hand'
 *   |'toujou_opp_stage_member_match_grant'
 *   |'toujou_opp_emma_punch_answer'
 *   |'optional_self_wait_opp_stage'
 *   |'toujou_deck_top_liella_live_pick'
 *   |'live_start_named_member_heart_blades'
 *   |'live_success_characters_draw'
 *   |'heart_color_pick_grant'
 *   |'kidou_reveal_hand_cost_threshold'
 *   |'deck_top_count_stage_plus'
 *   |'both_players_energy_deck_wait'
 *   |'jouji_success_live_waiting_substitute'
 *   |'success_live_waiting_swap'
 *   |'kidou_self_wait_activate_other'
 *   |'deck_top_reveal_top_to_hand_score'
 *   |'kidou_waiting_to_empty_stage'
 *   |'live_success_wait_skip_next_activate'
 *   |'deck_top_pick_no_ability_or_jouji'
 *   |'deck_top_count_live_score_plus'
 *   |'waiting_reorder_deck_top'
 *   |'activate_stage_members_up_to'
 *   |'yell_resolution_pick_hand'
 *   |'yell_resolution_pick_deck_top'
 *   |'yell_resolution_energy_wait'
 *   |'yell_resolution_count_energy_wait'
 *   |'energy_less_than_opponent_wait'
 *   |'live_score_higher_energy_wait'
 *   |'deck_top_reveal_hand_score_grant'
 *   |'surplus_heart_score_modifier'
 *   |'live_success_surplus_heart_score_plus'
 *   |'kidou_wait_member_grant_jouji'
 *   |'kidou_energy_or_activate_member'
 *   |'kidou_energy_deck_pick_live'
 *   |'toujou_baton_discarded_pick_hand'
 *   |'toujou_optional_hand_discard_draw'
 *   |'optional_pick_member_wait_opp_stage'
 *   |'optional_pick_member_wait_opp_blade_gap'
 *   |'toujou_baton_discarded_under'
 *   |'live_success_liella_effect_moved_score'
 *   |'live_success_optional_energy_recover_waiting'
 *   |'live_success_yell_nobh_series_score_capped'
 *   |'live_start_mandatory_energy_deck_unless_hand_discard'
 *   |'live_start_optional_formation_change'
 *   |'live_start_draw_opp_wait'
 *   |'waiting_to_deck_top_by_opp_wait_count'
 *   |'live_start_side_cost_equal_opp_wait'
 *   |'live_start_live_frame_pick_deck_top'
 *   |'live_success_self_wait_if_others'
 *   |'yell_resolution_pick_self_score'
 *   |'yell_resolution_live_count_score'
 *   |'live_success_deck_wait_pick_live'
 *   |'live_success_enter_under_member'
 *   |'kidou_hand_discard_trigger_ability'
 *   |'yell_reveal_series_live_score_plus'
 *   |'optional_energy_live_score_plus'
 *   |'live_card_score_plus'
 *   |'live_card_score_plus_per_unit'
 *   |'live_card_score_set_fixed'
 *   |'live_success_recover_from_waiting'
 *   |'live_success_recover_waiting_diff_group'
 *   |'live_success_optional_stage_to_waiting_score_recover'
 *   |'live_start_activate_series_score_by_unwait'
 *   |'live_start_tiered_stage_cost_deck_look'
 *   |'live_start_tiered_success_live_scores'
 *   |'live_start_tiered_waiting_distinct_score'
 *   |'live_success_surplus_heart_energy_wait'
 *   |'live_success_formation_change'
 *   |'yell_resolution_pick_deck_bottom'
 *   |'live_start_series_activation_score'
 *   |'live_start_waiting_lives_reorder_deck_top'
 *   |'live_start_activate_energy_all_active_score'
 *   |'live_start_yell_blade_remap_blue'
 *   |'live_start_yell_blade_remap_slot'
 *   |'live_start_dazzling_named_liella_grant'
 *   |'toujou_self_wait_if_hand_enter_bh'
 *   |'live_start_trigger_stage_member_live_start'
 *   |'live_success_yell_series_members_all_hearts_score'
 *   |'live_success_tie_block_success_live'
 *   |'live_success_opponent_energy_deck_wait'
 *   |'live_success_optional_energy_wait_opp_draw'
 *   |'live_start_love_screem_opp_answer'
 *   |'live_start_disable_self_live_success_if'
 *   |'live_start_deck_reveal_both_stage_members_score'
 *   |'live_start_pay_or_hand_discard'
 *   |'toujou_wait_to_member_under'
 *   |'toujou_both_center_position_change'
 *   |'toujou_opp_active_wait'
 *   |'kidou_opp_wait_group_discount_energy'
 *   |'toujou_wait_pick_trigger_ability'
 *   |'deck_reveal_until_pick'
 *   |'deck_reveal_until_live'
 *   |'kidou_hand_reveal_to_under'
 *   |'kidou_hand_discard_wait_live_score_pay'
 *   |'kidou_self_wait_hand_enter_energy'
 *   |'kidou_wait_shuffle_deck_bottom_activate'
 *   |'kidou_self_to_wait_opp_wait'
 *   |'toujou_hand_discard_draw_plus'
 *   |'toujou_optional_self_wait_recover'
 *   |'toujou_wait_enter_cost_sum'
 *   |'toujou_optional_all_members_relocate'
 *   |'toujou_optional_wait_to_deck_top'
 *   |'toujou_optional_energy_under'
 *   |'toujou_self_wait_only'
 *   |'toujou_rotate_stage_areas'
 *   |'toujou_success_live_score_tiered'
 *   |'toujou_success_live_low_score_grant'
 *   |'toujou_draw_grant_if_from_waiting'
 *   |'toujou_hand_discard_wait_heart_dual_pick'
 *   |'toujou_wait_pick_opp_live'
 *   |'toujou_grant_heart_stage_member'
 *   |'toujou_opp_front_position_change'
 *   |'toujou_bibi_wait_opp_active_wait'
 *   |'toujou_baton_series_heart_grant'
 *   |'toujou_opp_optional_live_discard_or_score'
 *   |'toujou_turn_block_effect_activate'
 *   |'toujou_opp_wait_if_high_cost_on_stage'
 *   |'toujou_grant_opp_live_need_heart_if_stage_hearts'
 *   |'toujou_main_phase_live_from_waiting'
 *   |'live_start_opp_wait_if_high_cost_on_stage'
 *   |'live_start_opp_wait_if_stage_hearts'
 *   |'live_start_opp_wait_max_cost'
 *   |'live_start_opp_wait_exclude_unit'
 *   |'live_start_activate_self_if_low_score_live'
 *   |'live_start_pick_player_waiting_deck_bottom'
 *   |'live_start_pick_player_deck_top_peek'
 *   |'live_start_optional_energy_waiting_reorder_deck_top'
 *   |'live_start_optional_hearts_wild'
 *   |'live_start_pick_stage_member_printed_hearts_remap'
 *   |'live_start_pick_live_frame_match_success_live_grant'
 *   |'live_start_hand_named_discard_hearts_grant'
 *   |'ability_sequence'
 *   |'followup_draw_if_live_discarded'
 *   |'toujou_multi_wait_draw_per_count'
 *   |'toujou_opp_hand_reveal_no_live_draw'
 *   |'tiered_cost_draw_if'
 *   |'tiered_cost_grant_jouji_score'
 *   |'tiered_cost_grant_jouji_session'
 *   |'live_start_waiting_deck_bottom_tiered'
 *   |'draw_then_hand_to_deck_bottom'
 *   |'live_start_center_series_blade_set'
 *   |'live_start_edelnote_blade_heart_pair'
 *   |'live_start_moved_members_blade_grant'
 *   |'live_start_moved_members_pick_heart_grant'
 *   |'live_start_need_heart_reduce_per_enter_or_move'
 *   |'live_start_need_heart_reduce_per_success_live'
 *   |'live_start_need_heart_reduce_fixed'
 *   |'live_start_need_heart_reduce_per_unit'
 *   |'live_start_need_heart_set_fixed'
 *   |'live_start_need_heart_set_choice'
 *   |'live_start_distinct_series_need_heart_shift_score'
 *   |'kidou_self_wait_stage_member_swap_recover'
 *   |'deck_peek_pick_then_opp_wait'
 *   |'draw_then_conditional_extra_draw'
 *   |'kidou_discard_self_draw_grant'
 *   |'kidou_hand_discard_series_branch'
 *   |'kidou_hand_reveal_grant_if_live'
 *   |'kidou_reveal_live_opp_decline_grant'
 *   |'live_start_dollcostra_cost_set_grant_if'
 *   |'live_start_draw_then_formation_change'
 *   |'live_start_hand_discard_activate_wait_grant'
 *   |'live_start_hand_discard_cost_boost_grant_if'
 *   |'live_start_mill_loop_blade_grant'
 *   |'live_start_number_reveal_grant_if'
 *   |'live_start_optional_energy_under_return_grant'
 *   |'live_start_optional_hand_discard_named_followup_blade'
 *   |'live_start_optional_shuffle_deck_bottom_grant_if'
 *   |'live_start_overflow_heart_tiered_draw_reduce'
 *   |'live_start_pay_or_discard_conditional_grant_members'
 *   |'live_start_stellar_stream_grant'
 *   |'live_start_success_score_tiered_reduce_score'
 *   |'live_start_sunny_day_song_tiered'
 *   |'live_success_draw_per_series_then_discard_same'
 *   |'live_success_score_if_stage_live_start_member'
 *   |'toujou_baton_both_trim_hand_draw'
 *   |'toujou_baton_discarded_series_per_card'
 *   |'toujou_both_shuffle_deck_bottom_grant_if'
 *   |'toujou_draw_then_position_change'
 *   |'toujou_pick_member_or_energy'
 *   |'toujou_self_wait_draw_then_conditional_discard'
 *   |'guided_manual'} AbilityTemplate
 */

/**
 * @typedef {object} AbilityPickFilters
 * @property {string | null} [pickType] T_MEMBER | T_LIVE
 * @property {number | null} [maxCost]
 * @property {number | null} [minCost]
 * @property {string | null} [seriesTag] 『…』の中身
 * @property {number | null} [minSuccessLiveCount]
 * @property {number | null} [minNeedHeartSlot] 1-6
 * @property {number | null} [minNeedHeartValue]
 * @property {number | null} [minTotalNeedHeart]
 * @property {number | null} [minSuccessLiveScoreSum]
 * @property {number | null} [minEnergyCount]
 * @property {number | null} [minCostMemberOnStage]
 * @property {string | null} [characterNameOnStage]
 * @property {string | null} [characterName]
 * @property {boolean} [acceptNoAbilityOrNativeJouji]
 * @property {number[]} [heartSlotsAny] メンバーがいずれかのスロットを持つ
 * @property {boolean} [requiresStageMemberMovedThisTurn] このターン中にエリア移動したメンバー参照
 * @property {number | null} [minStageHeartSlot] ステージにいるメンバーの所持ハート色スロット 1-6
 * @property {number | null} [minStageHeartCount] 上記スロット所持数の下限
 * @property {'left'|'center'|'right'|null} [stageArea] 上記ハート条件を満たすメンバーのエリア
 * @property {number | null} [minDistinctStageAndWaitingNames] ステージ＋控え室で名前が異なるメンバー数
 * @property {number | null} [minStageSeriesMembers] ステージに『minStageSeriesMembersTag』のメンバーがN人以上
 * @property {string | null} [minStageSeriesMembersTag] 上記カウント対象のシリーズ
 * @property {number | null} [minStageMembers] ステージにメンバーがN人以上
 * @property {number | null} [maxHandCount] 自分の手札がN枚以下
 * @property {number | null} [requiresSelfScoreEquals] このカードのスコアがNの場合
 * @property {number | null} [minDistinctMemberGroups] ステージにグループ名が異なるメンバーがN人以上
 * @property {number | null} [minWaitingSeriesLiveCount] 控え室に『waitingSeriesLiveTag』のライブカードがN枚以上
 * @property {string | null} [waitingSeriesLiveTag] 上記カウント対象のシリーズ
 * @property {number | null} [minWaitingSeriesCardCount] 控え室に『waitingSeriesCardTag』のカードがN枚以上
 * @property {string | null} [waitingSeriesCardTag]
 * @property {number | null} [minWaitingSeriesMemberCount] 控え室に『waitingSeriesMemberTag』のメンバーがN枚以上
 * @property {string | null} [waitingSeriesMemberTag]
 * @property {number | null} [maxOwnSuccessLiveCount] 自分の成功ライブ置き場の上限枚数（0=空）
 * @property {number | null} [minOpponentSuccessLiveCount] 相手の成功ライブ置き場の下限枚数
 * @property {boolean} [requiresSuccessLiveCountTieWithOpponent] 自分と相手の成功ライブ枚数が同数
 * @property {number[]} [minLiveFrameNeedHeartSlots] ライブ枠の必要ハート色スロット
 * @property {number | null} [minLiveFrameNeedHeartSlotSum] 上記スロット合計の下限
 * @property {string | null} [requiresLiveFrameOnlySeries] ライブ枠が指定シリーズのみ
 * @property {boolean} [requiresStageMemberHigherThanAllOpponent] 相手全員よりコストが高い自メンバーがいる
 * @property {boolean} [requiresOwnSeriesCostSumHigherThanOpponent] 自『series』コスト合計>相手コスト合計
 * @property {string | null} [ownSeriesCostCompareTag]
 * @property {boolean} [requiresOwnStageCostSumLowerThanOpponent] 自ステージ全員コスト合計<相手コスト合計
 * @property {boolean} [requiresOwnStageHeartTotalHigherThanOpponent] 自ステージハート総数>相手ハート総数
 * @property {boolean} [requiresCenterSeriesCostHigherThanOpponent] 自センター『series』コスト>相手センター
 * @property {string | null} [centerSeriesCostCompareTag]
 * @property {string | null} [requiresWaitingLiveNameContains] 控え室にカード名へ指定文字を含むライブカードがある
 * @property {number | null} [requiresSameNameMembers] 同じ名前のメンバーがN人以上（seriesTagで絞り込み可）
 * @property {number | null} [requiresBatonMembersThisTurn] このターンにバトンタッチして登場したメンバーがN人以上（seriesTagで絞り込み可）
 * @property {boolean} [requiresOpponentWaitMember] 相手ステージにウェイト状態のメンバーがいる（ソロ入力）
 * @property {{smaller: string, larger: string} | null} [requiresNamedMemberPairCostOrder] 指名2人が登場し、largerのコスト>smallerのコスト
 * @property {string | null} [requiresStageOnlySeries] ステージのメンバーが指定シリーズのみの場合
 * @property {string[] | null} [seriesTagsAny] いずれかのシリーズに一致
 * @property {number | null} [minDistinctSeriesMemberNames] ステージに名前の異なる指定シリーズメンバー数
 * @property {number | null} [minDistinctYellRevealedMemberNames] エール公開に名前の異なる指定シリーズメンバー数
 * @property {string | null} [distinctYellRevealedSeriesTag]
 * @property {number | null} [minScore] ライブカードのスコア下限
 * @property {number | null} [minSurplusHearts] 余剰ハート数の下限
 * @property {string | null} [distinctSeriesMemberNamesTag] 上記のシリーズタグ
 * @property {boolean} [requiresLiveScoreTieWithOpponent] 自分と相手のライブ合計スコアが同点
 * @property {boolean} [requiresLiveScoreHigherThanOpponent] ライブ合計スコアが相手より高い
 * @property {number | null} [requiresOpponentHandLead] 相手の手札が自分よりN枚以上多い
 * @property {number | null} [minEitherSuccessLiveCount] 自分か相手の成功ライブ置き場がN枚以上
 */

/**
 * @typedef {object} ClassifiedAbility
 * @property {AbilityTrigger} trigger
 * @property {AbilityTemplate} template
 * @property {boolean} optional
 * @property {AbilityPickFilters} filters
 * @property {number} [deckTopCount]
 * @property {number} [handDiscardToWaiting]
 * @property {number} [deckDrawCount]
 * @property {boolean} [requiresOnStage]
 * @property {boolean} [requiresInWaiting]
 * @property {number} [perTurnLimit]   1: ターン1回 / 2: ターン2回
 * @property {boolean} [costEnergy]
 * @property {boolean} [costSelfWait]
 * @property {number}  [bladeGain]
 * @property {boolean} [hasOptionalCost]
 * @property {boolean} [costOrAlt] ウェイト「か」手札捨てなど、どちらか一方でよいコスト
 * @property {number} [costEnergyCount] E／エネルギー支払い枚数
 * @property {string[]} [abilityChoices]
 * @property {number} [choiceMin]
 * @property {number} [choiceMax]
 * @property {string | null} [choiceBoostSeriesTag]
 * @property {number} [choiceBoostMin]
 * @property {number} [choiceBoostMax]
 * @property {'left'|'center'|'right'|null} [stageArea]
 * @property {Array<'left'|'center'|'right'>} [stageAreas]
 * @property {number} [energyActiveCount]
 * @property {number} [energyWaitCount]
 * @property {number} [oppDeckDrawCount] 相手が山札から引く枚数
 * @property {number} [disableIfSeriesHeartSlot]
 * @property {number} [disableIfSeriesHeartSlotMin]
 * @property {string} [disableIfSeriesTag]
 * @property {number} [targetHandSize]
 * @property {number} [yellRevealReduction]
 * @property {boolean} [pickSelfOrOpponent] 自分か相手の盤面を選んで効果を解決
 * @property {number} [minLiveFrameCount]
 * @property {number} [deckTopPickMax]
 * @property {number} [bladeSetCount]
 * @property {boolean} [requiresCenterMemberMovedThisTurn]
 * @property {number} [minStageEntriesThisTurn]
 * @property {number} [energyCostDiscountPerGroup]
 * @property {AbilityTrigger} [excludeTriggerOnPick]
 * @property {string[]} [kidouSegmentRaws]
 * @property {boolean} [requiresSeriesOnStage]
 * @property {string[]} [characterNames]
 * @property {string | null} [requiresBatonFromSeriesTag] 登場時：指定シリーズのメンバーからのバトンタッチ必須
 * @property {string | null} [requiresBatonFromLowerCostSeriesTag] 低コスト指定シリーズからのバトンタッチ必須
 * @property {number} [selfCostBoost] このメンバー/カードのコストを一時的に+N
 * @property {number} [effectDiscardCount] 効果本文での手札→控え室（コストと別）
 * @property {boolean} [postDiscardActivateIfNonBhMember] 捨てた非BHメンバー1枚以上でこのメンバーをアクティブ
 * @property {number} [postDiscardBladeGainIfNonBhAt] 非BHメンバーをこの枚数以上捨てたときブレード付与
 * @property {number} [postDiscardBladeGainCount] 上記時のブレード枚数
 * @property {boolean} [positionExcludeCenter] ポジションチェンジ先からセンター除外
 * @property {string[]} [positionTargetSeriesTags] 指定シリーズのメンバーがいる列のみ
 * @property {number} [oppWaitCount] 相手ステージをウェイトにする人数上限
 * @property {number[]} [costThresholds] 公開コスト合計の閾値リスト
 * @property {number} [revealMinMemberCost] デッキ公開で拾うメンバーの最低コスト
 * @property {number} [waitPickCount] 控え室から選ぶ枚数（シャッフル→デッキ下など）
 * @property {number} [waitEnterMaxCount] 控え室からステージ登場の最大枚数
 * @property {number} [waitEnterMaxCostSum] 上記登場のコスト合計上限
 * @property {string} [requiredUnitOnStage] ステージがこのユニットのみのとき発動
 * @property {string} [excludeCharacterName] 対象から除外するキャラ名
 * @property {number} [energyUnderCount] メンバー下に置くエネルギー枚数
 * @property {number[]} [heartPickSlots] ハート色選択で選べるスロット 1-6
 * @property {boolean} [heartPerSuccessLive] 成功ライブカード置き場のライブ1枚につきハート付与
 * @property {boolean} [grantToMovedMembersThisTurn] このターン中に移動したステージメンバーへ付与
 * @property {Object.<string, number>} [needHeartSetMap] 必要ハートを固定値へ差し替え
 * @property {Array<Object.<string, number>>} [needHeartSetChoices] 必要ハート差し替え候補
 * @property {number} [needHeartReducePerMovedOrEntered] このターン登場または移動した人数ごとの heart0 減少数
 * @property {number} [needHeartReducePerSuccessLive] 成功ライブカード置き場1枚ごとの heart0 減少数
 * @property {Object.<string, number>} [needHeartReduceMap] 条件成立で必要ハートを固定数だけ減らす（{heart0:3} 等）
 * @property {string} [needHeartReduceSlotKey] 比例減算で減らす必要ハートのスロットキー（heart0/heart04 等）
 * @property {number} [needHeartReducePerUnit] 1単位あたりの減少数
 * @property {number} [needHeartReduceMaxCount] 減少数の上限
 * @property {string} [needHeartReduceUnitKind] 数える対象の種類
 * @property {string} [needHeartReduceUnitSeries] 数える対象のシリーズ
 * @property {number} [needHeartReduceUnitSlot] 数える対象のハートスロット
 * @property {number} [needHeartReduceUnitDivisor] 単位換算の割る数
 * @property {number[]} [needHeartReduceExcludeSlots] 除外するハートスロット
 * @property {number} [requiredHeartSlot] 効果で参照するハート色 1-6
 * @property {number} [liveScoreGrant] ライブの合計スコア＋N
 * @property {number} [cardScoreGrant] このカードのスコア＋N
 * @property {number} [cardScorePerUnit] このカードのスコアを1単位ごとに＋N
 * @property {string} [scoreUnitKind] スコア加算で数える単位の種類
 * @property {number} [minMemberHeartTotal] series_stage_members_min_hearts 用のハート下限
 * @property {number} [liveScoreCapMax] ライブ合計スコア加算の上限
 * @property {number} [oppBladeGapMin] 相手ブレードが自メンバーより N 以上少ない条件
 * @property {number} [oppPrintedHeartGapMin] 相手の元々持つハートが自メンバーより N 以上少ない条件
 * @property {string} [scoreUnitSeries] スコア比例加算で数える対象シリーズ
 * @property {number} [cardScoreSet] このカードのスコアを固定値Nにする
 * @property {boolean} [requiresConditionConfirm] 自動評価できない条件のためユーザー確認を要する
 * @property {AbilityPickFilters} [recoverPickFilters] 控え室から手札に加える対象のフィルタ
 * @property {number} [minUnwaitForScore] ウェイト解除人数がN以上でスコア加算
 * @property {number} [tierStageCostMin] 段階効果のステージ系列コスト合計下限
 * @property {number} [tierStageCostHighMin] 段階効果の上位コスト合計下限
 * @property {number} [deckLookPickToHand] 山札見て手札に加える枚数
 * @property {number[]} [tierSuccessLiveScores] 成功ライブ置き場で探すスコア値
 * @property {number} [cardScoreGrantLow] 段階スコア（下位）
 * @property {number} [cardScoreGrantHigh] 段階スコア（上位・代わりに）
 * @property {number} [tierWaitingDistinctMin] 控え室の異名カード枚数（下位）
 * @property {number} [tierWaitingDistinctHigh] 控え室の異名カード枚数（上位）
 * @property {AbilityPickFilters} [preconditionFilters] yell_resolution 等の前置条件
 * @property {number} [minSurplusHearts]
 * @property {boolean} [loseAllSurplusHearts]
 * @property {boolean} [grantToCenterMember] センターのメンバーへ付与
 * @property {string | null} [grantToNamedStageMember] 指名メンバーへ付与
 * @property {string[]} [grantToNamedStageMemberOptions] 指名メンバー候補（複数から1人）
 * @property {boolean} [grantToSameNameAsDiscardedMember] コストで捨てたメンバーと同名のステージメンバーへ付与
 * @property {boolean} [requiresInHandOnly] 手札にある場合のみ起動（起動）
 * @property {number} [grantHeartSlotCount] 付与ハートスロットの枚数（既定1）
 * @property {number} [grantHeartCountPerEnergy] エネルギー1枚あたりの付与ハート数
 * @property {number} [minNeedHeartSlot] 必要ハートスロット条件（ライブカード）
 * @property {number} [minNeedHeartValue] 必要ハートスロットの下限値
 * @property {number} [memberHeartSlot] 付与先メンバーの所持ハート条件
 * @property {string | null} [batonDiscardedSeriesTag] バトンで控え室に置かれたシリーズ
 * @property {boolean} [requiresNoBladeHeartOnDiscarded] バトン捨て対象がBHなしのときのみ
 * @property {string | null} [grantToStageSeriesTag] ステージの指定シリーズメンバーへ付与
 * @property {number} [grantToStageSeriesMax] 上記の人数上限
 * @property {string | null} [grantToSelfAndOtherSeriesTag] 自分＋他1人の指定シリーズメンバーへ付与
 * @property {number} [grantFollowupMinSelfPrintedCost] 効果後にこのカードのコストがN以上で付与
 * @property {string | null} [grantAfterDeckBottomSeriesTag]
 * @property {number} [grantAfterDeckBottomSeriesMin]
 * @property {number} [grantAfterDeckBottomTotalMin]
 * @property {number} [grantPickStageMembersMax] ステージの任意メンバーへ付与（人数上限）
 * @property {number} [grantAllHeartCount] ライブ終了時まで付与する ALLハート枚数
 * @property {boolean} [grantToConditionalAreaMember] 条件を満たすエリア内メンバーへ付与
 * @property {string | null} [discardFollowupCharacterName] 手札捨て後の追加効果対象キャラ名
 * @property {number} [followupBladeGain] 条件付き追加ブレード
 * @property {boolean} [requiresAllEnergyActive]
 * @property {import('./abilityEffects.js').ClassifiedAbility[]} [steps]
 * @property {number} [tierCostSum]
 * @property {number} [revealCount]
 * @property {Array<{costSum: number, kind: string, liveScoreGrant?: number}>} [costTiers]
 */

export function cardAbilityRawText(card) {
  return card && card.ability != null ? String(card.ability) : "";
}

export function abilityPlainText(card) {
  return cardAbilityRawText(card)
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
}

export function abilityWikiKeys(card) {
  return abilityWikiCanonicalKeys(card);
}

/**
 * raw を「トリガーアイコン」ごとのセグメントに分割。
 * トリガー直後の本文（次のトリガーまで／文末まで）を `text` に保持する。
 * @param {string} raw
 * @returns {Array<{trigger: string|null, text: string, tokenStart: number, tokenEnd: number}>}
 */
export function splitAbilityByTriggers(raw) {
  var s = String(raw == null ? "" : raw);
  if (!s) return [];
  var re = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;
  /** @type {Array<{trigger: string|null, start: number, end: number}>} */
  var tokens = [];
  var m;
  while ((m = re.exec(s)) !== null) {
    var k1 = wikiAbilityStemToCanonical(m[1]);
    var k2 = m[2] != null && String(m[2]).trim() !== "" ? wikiAbilityStemToCanonical(m[2]) : null;
    var canon = TRIGGER_CANON_KEYS.indexOf(k1) >= 0 ? k1 : TRIGGER_CANON_KEYS.indexOf(k2) >= 0 ? k2 : null;
    if (!canon) continue;
    if (isInlineQuotedJoujiReference(s, m.index)) continue;
    if (isInlineTriggerTypeReference(s, m.index, m.index + m[0].length)) continue;
    tokens.push({ trigger: canon, start: m.index, end: m.index + m[0].length });
  }
  if (!tokens.length) return [{ trigger: null, text: s, tokenStart: 0, tokenEnd: 0 }];
  /** @type {Array<{trigger: string|null, text: string, tokenStart: number, tokenEnd: number}>} */
  var segments = [];
  if (tokens[0].start > 0) {
    segments.push({ trigger: null, text: s.slice(0, tokens[0].start), tokenStart: 0, tokenEnd: 0 });
  }
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    var nextStart = i + 1 < tokens.length ? tokens[i + 1].start : s.length;
    segments.push({
      trigger: t.trigger,
      text: s.slice(t.end, nextStart),
      tokenStart: t.start,
      tokenEnd: t.end,
    });
  }
  /** {{toujyou}}/{{live_start}}共有効果 — スラッシュのみのセグメントに直後の本文を複製 */
  for (var j = 0; j < segments.length; j++) {
    var plainJ = segmentPlainText(segments[j].text);
    if ((plainJ === "/" || plainJ === "") && j + 1 < segments.length) {
      var nextPlain = segmentPlainText(segments[j + 1].text);
      if (nextPlain && nextPlain !== "/") {
        segments[j].text = segments[j + 1].text;
      }
    }
  }
  return segments;
}

/**
 * {{toujyou}}/{{kidou}} 等が能力種別ラベルとして文中に現れる場合（SP-bp2-006, N-bp3-003, bp4-002 等）。
 * @param {string} raw
 * @param {number} tokenStart
 * @param {number} tokenEnd
 */
function isInlineTriggerTypeReference(raw, tokenStart, tokenEnd) {
  var afterPlain = String(raw.slice(tokenEnd) || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
  if (!/^能力/.test(afterPlain)) return false;
  if (/^能力も/.test(afterPlain)) return true;
  if (/^能力を持/.test(afterPlain)) return true;
  var beforePlain = String(raw.slice(Math.max(0, tokenStart - 12), tokenStart) || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
  if (/の$/.test(beforePlain)) return true;
  if (/能力も$/.test(beforePlain)) return true;
  if (/が持つ$/.test(beforePlain)) return true;
  if (/から$/.test(beforePlain)) return true;
  if (/[（(]$/.test(beforePlain)) return true;
  return false;
}

/** 「…ライブ終了時まで、「{{jyouji}}…」」内の {{jyouji}} は別セグメントにしない */
function isInlineQuotedJoujiReference(raw, tokenStart) {
  var before = String(raw.slice(0, tokenStart) || "");
  var lastOpen = before.lastIndexOf("「");
  var lastClose = before.lastIndexOf("」");
  return lastOpen >= 0 && lastOpen > lastClose;
}

/** 能力文中の {{jyouji}} が別トリガー文中のインライン参照か（bp6-002 等） */
function isInlineJoujiReference(segs, index) {
  if (index <= 0 || !segs[index] || segs[index].trigger !== "jouji") return false;
  var prev = segs[index - 1];
  if (!prev || !prev.trigger || prev.trigger === "jouji") return false;
  var prevPlain = segmentPlainText(prev.text);
  var plain = segmentPlainText(segs[index].text);
  if (/[かも]$/.test(prevPlain) || /または$/.test(prevPlain)) {
    if (/^能力を持/.test(plain)) return true;
  }
  var prevText = String(prev.text || "");
  if (/「/.test(prevText) && !/」/.test(prevText)) return true;
  if (/ライブ終了時まで/.test(prevText) && /を得る/.test(String(segs[index].text || ""))) return true;
  return false;
}

/** @param {*} cat */
export function catalogCardHasNativeJoujiAbility(cat) {
  if (!cat || !cat.ability) return false;
  var segs = splitAbilityByTriggers(String(cat.ability));
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== "jouji") continue;
    if (isInlineJoujiReference(segs, i)) continue;
    var plain = segmentPlainText(segs[i].text);
    if (plain === "を得る。" || plain === "を得る") continue;
    return true;
  }
  return false;
}

/** トリガー絞り込み: 同じ trigger を持つセグメントの text を連結する */
export function abilityRawSegmentForTrigger(card, trigger) {
  if (!trigger) return cardAbilityRawText(card);
  var segs = splitAbilityByTriggers(cardAbilityRawText(card));
  var parts = [];
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== trigger) continue;
    var text = segs[i].text;
    if (
      i + 1 < segs.length &&
      segs[i + 1].trigger === "jouji" &&
      isInlineJoujiReference(segs, i + 1)
    ) {
      text += "{{jyouji.png|常時}}" + segs[i + 1].text;
      i++;
    }
    parts.push(text);
  }
  return parts.join("");
}

/** セグメント raw → プレーンテキスト（トークン除去・空白除去） */
function segmentPlainText(rawSegment) {
  return String(rawSegment || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
}

function normalizeFwDigits(s) {
  return String(s || "").replace(/[０-９]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

/** @param {string} p */
function parseDeckTopCount(p) {
  var m = p.match(/山札の上からカードを(\d+)枚/);
  if (m) return Number(m[1]);
  m = p.match(/デッキの上からカードを(\d+)枚/);
  if (m) return Number(m[1]);
  return null;
}

/** @param {string} raw @param {Set<string>} keys @returns {number} 1=ターン1回 2=ターン2回 0=無 */
function parsePerTurnLimit(raw, keys) {
  if (keys.has("turn1") || /ターン1回/.test(raw) || /ターン１回/.test(raw)) return 1;
  if (keys.has("turn2") || /ターン2回/.test(raw) || /ターン２回/.test(raw)) return 2;
  return 0;
}

/** @param {string} costPart @returns {number} */
function parseCostEnergyCount(costPart) {
  if (!costPart) return 1;
  var m = costPart.match(/Eを?(\d+)枚?支払/);
  if (m) return Math.max(1, Number(m[1]) || 1);
  if (/E支払/.test(costPart)) return 1;
  var m2 = costPart.match(/エネルギー(?:を)?(\d+)枚/);
  if (m2) return Math.max(1, Number(m2[1]) || 1);
  if (/エネルギー.*支払/.test(costPart)) return 1;
  return 1;
}

/** @param {string} p @returns {number} 「ブレード」を得る個数（ヒューリスティック） */
/** @param {string} segRaw トリガーセグメント原文 */
function parseStageAreaConstraint(segRaw) {
  var areas = parseStageAreaConstraints(segRaw);
  return areas.length ? areas[0] : null;
}

/** @param {string} segRaw @returns {Array<'left'|'center'|'right'>} */
export function parseStageAreaConstraints(segRaw) {
  var s = String(segRaw || "");
  /** @type {Array<'left'|'center'|'right'>} */
  var areas = [];
  if (/\{\{center\.png\|センター\}\}/.test(s) || /\|センター\}\}/.test(s)) areas.push("center");
  if (/\{\{leftside\.png\|左サイド\}\}/.test(s) || /\|左サイド\}\}/.test(s)) areas.push("left");
  if (/\{\{rightside\.png\|右サイド\}\}/.test(s) || /\|右サイド\}\}/.test(s)) areas.push("right");
  // 「左/右サイドエリアにいるメンバー」は効果条件であり、このカードの配置エリア指定ではない
  if (/センターエリアにいる/.test(s) && areas.indexOf("center") < 0) areas.push("center");
  return areas;
}

/** @param {'left'|'center'|'right'|null|undefined} memberColumn @param {ClassifiedAbility|null|undefined} cl */
export function abilityInstMatchesStageArea(memberColumn, cl) {
  if (!cl) return true;
  if (cl.stageAreas && cl.stageAreas.length) {
    return !!memberColumn && cl.stageAreas.indexOf(memberColumn) >= 0;
  }
  if (cl.stageArea) return memberColumn === cl.stageArea;
  return true;
}

/** 登場／ライブ開始時の共有「E支払い＋2択」本文（PL!SP-bp5-001 等） */
/**
 * 「このメンバーをウェイトにしてもよい：」の任意コスト＋効果テンプレート（登場／起動／ライブ開始時／ライブ成功時）
 * @param {string} p
 * @param {ClassifiedAbility} base
 * @returns {Partial<ClassifiedAbility> | null}
 */
/** @param {string} p @param {string} segRaw @returns {Partial<ClassifiedAbility>} */
function parsePositionChangeMeta(p, segRaw) {
  /** @type {Partial<ClassifiedAbility>} */
  var meta = {};
  if (/センターエリア以外/.test(p)) meta.positionExcludeCenter = true;
  /** @type {string[]} */
  var tags = [];
  var reSeries = /『([^』]+)』/g;
  var sm;
  while ((sm = reSeries.exec(p + segRaw)) !== null) {
    if (tags.indexOf(sm[1]) < 0) tags.push(sm[1]);
  }
  if (/がいるエリア/.test(p) && tags.length) meta.positionTargetSeriesTags = tags;
  return meta;
}

/** @param {string} p @returns {boolean} */
function textHasHeartColorPickGrant(p) {
  return (
    (/かかのうち.*選ぶ/.test(p) || /好きなハートの色を1つ指定/.test(p) || /選んだハート/.test(p)) &&
    (/ライブ終了時まで/.test(p) || /選んだハート/.test(p)) &&
    (/ハート/.test(p) || /heart/.test(p))
  );
}

/** @param {string} p @returns {boolean} */
function textHasHeartPerSuccessLiveGrant(p) {
  return /成功ライブ(?:カード)?置き場にあるカード1枚につき/.test(p);
}

/**
 * @param {AbilityPickFilters} base
 * @param {AbilityPickFilters} patch
 * @returns {AbilityPickFilters}
 */
function mergeAbilityPickFilters(base, patch) {
  /** @type {AbilityPickFilters} */
  var out = Object.assign({}, base || {});
  if (!patch || typeof patch !== "object") return out;
  Object.keys(patch).forEach(function (k) {
    var v = patch[k];
    if (v == null) return;
    if (Array.isArray(v) && !v.length) return;
    if (v === "") return;
    out[k] = v;
  });
  return out;
}

/**
 * 「〜場合、」の前段を追加条件として拾う（ライブ系の前置条件を取りこぼさないため）
 * @param {string} p
 * @returns {AbilityPickFilters}
 */
function parseConditionalPrefixFilters(p) {
  var txt = String(p || "");
  var idx = txt.indexOf("場合");
  if (idx <= 0) return parseAbilityPickFilters("");
  var head = txt.slice(0, idx + 2);
  return parseAbilityPickFilters(head);
}

/**
 * @param {string} segRaw
 * @returns {Object.<string, number>}
 */
function parseNeedHeartMapFromSegmentRaw(segRaw) {
  /** @type {Object.<string, number>} */
  var out = {};
  var s = String(segRaw || "");
  var re = /\{\{heart_0?(\d)[^}]*\}\}/gi;
  var m;
  while ((m = re.exec(s)) !== null) {
    var slot = Number(m[1]);
    var key = slot === 0 ? "heart0" : slot === 1 ? "heart01" : "heart0" + slot;
    out[key] = Math.max(0, Math.floor(Number(out[key]) || 0)) + 1;
  }
  return out;
}

/**
 * 「必要ハートを〜減らす／少なくなる／減る」の減少分を {slotKey: count} で抽出。
 * 必要ハート以降の本文だけを見るため、条件側のハートアイコンは拾わない。
 * @param {string} segRaw
 * @returns {Object.<string, number>}
 */
function parseNeedHeartReduceFixedMap(segRaw) {
  var s = String(segRaw || "");
  var idx = s.indexOf("必要ハート");
  if (idx < 0) return {};
  var rest = s.slice(idx);
  // 減算句のみを対象にし、後続のキャップ文（例:「heart0は3つまでしか減らない」）の
  // アイコンを数えないよう、最初の「減らす/減る/少なくなる」までで打ち切る。
  var endM = rest.match(/(減らす|減らし|減る|少なくなる)/);
  if (endM) rest = rest.slice(0, endM.index + endM[0].length);
  return parseNeedHeartMapFromSegmentRaw(rest);
}

/**
 * 必要ハート固定減算カードの「〜場合」発動条件をフィルタへ変換（reduce_fixed 専用）。
 * 汎用 parseAbilityPickFilters には混ぜず、ここで個別に解釈する。
 * @param {string} p
 * @returns {Partial<AbilityPickFilters>}
 */
function parseNeedHeartReduceConditionFilters(p) {
  var txt = String(p || "");
  /** @type {Partial<AbilityPickFilters>} */
  var f = {};
  var sameNameM = txt.match(/同じ名前の(?:『[^』]+』の)?メンバーが([０-９\d]+)人以上/);
  if (sameNameM) f.requiresSameNameMembers = Number(normalizeFwDigits(sameNameM[1])) || 0;
  var batonNM = txt.match(/このターン中にバトンタッチして登場した(?:『[^』]+』の)?メンバーが([０-９\d]+)人以上/);
  if (batonNM) f.requiresBatonMembersThisTurn = Number(normalizeFwDigits(batonNM[1])) || 0;
  if (/相手のステージにウェイト状態のメンバーがいる/.test(txt)) f.requiresOpponentWaitMember = true;
  var pairCostM = txt.match(/「([^」]+)」が登場しており、かつ「([^」]+)」よりコストの大きい「([^」]+)」が登場している/);
  if (pairCostM) f.requiresNamedMemberPairCostOrder = { smaller: pairCostM[2], larger: pairCostM[3] };
  var bladeTotalM = txt.match(/ステージ[^。]*ブレード[^。]*合計が([０-９\d]+)以上/);
  if (bladeTotalM) f.requiresStageBladeTotal = Number(normalizeFwDigits(bladeTotalM[1])) || 0;
  return f;
}

/**
 * 控え室から「ステージ全メンバーと異なるグループ名」のカード1枚を手札に加える。
 * @param {string} p
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyRecoverWaitingDiffStageGroup(p) {
  if (!/控え室にある/.test(p) || !/すべてのメンバーと異なるグループ名/.test(p)) return null;
  if (!/手札に加える/.test(p)) return null;
  return {
    template: "live_success_recover_waiting_diff_group",
    filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
  };
}

/**
 * 「[条件]の場合、自分の控え室から[フィルタ]カード1枚を手札に加える」recover系の分類。
 * コスト（もよい：）や複合（その後）を含むものは対象外。
 * @param {string} p
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyWaitingRecover(p) {
  if (!/控え室(?:から|にある)/.test(p)) return null;
  if (!/手札に加える/.test(p)) return null;
  if (/もよい|：|:|その後|デッキ|山札|ウェイト|アクティブ|スコアを[＋+]/.test(p)) return null;
  // 動的・複雑な対象制約（ステージ全メンバーと異なるグループ名 等）は自動化対象外
  if (/異なるグループ名|すべてのメンバーと/.test(p)) return null;
  var effect = scoreEffectPartAfterCondition(p);
  if (!/控え室(?:から|にある)/.test(effect) || !/手札に加える/.test(effect)) return null;

  /** @type {AbilityPickFilters} */
  var pf = {};
  if (/ライブカードを?1枚?手札に加える|スコア[0-9０-９]+以下のライブカード/.test(effect)) pf.pickType = T_LIVE;
  else if (/メンバーカードを?1枚?手札に加える/.test(effect)) pf.pickType = T_MEMBER;
  var scoreM = effect.match(/スコア([0-9０-９]+)以下の/);
  if (scoreM) pf.pickMaxScore = Number(normalizeFwDigits(scoreM[1])) || 0;
  var serM = effect.match(/『([^』]+)』の(?:メンバー|ライブ)?カード/);
  if (serM) pf.seriesTag = serM[1];

  return {
    template: "live_success_recover_from_waiting",
    recoverPickFilters: pf,
    filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
  };
}

/**
 * 「〜1人につき、このカードのスコアを＋N」比例スコア加算の分類（live_start/live_success共通）。
 * @param {string} p
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyLiveScorePerUnit(p) {
  if (!/1人につき/.test(p)) return null;
  if (/減らし/.test(p) && /増やす/.test(p) && /その後/.test(p) && /必要ハート/.test(p)) return null;
  if (!/このカードのスコアを[＋+]\d+/.test(normalizeFwDigits(p))) return null;
  var per = parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1;
  /** @type {Partial<ClassifiedAbility>} */
  var base = {
    template: "live_card_score_plus_per_unit",
    cardScorePerUnit: per,
    filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
  };
  if (/ウェイト状態のメンバー1人につき/.test(p)) {
    base.scoreUnitKind = "waiting_stage_members";
    return base;
  }
  var distinctM = p.match(/名前の異なる『([^』]+)』のメンバー1人につき/);
  if (distinctM) {
    base.scoreUnitKind = "distinct_name_series_stage_members";
    base.scoreUnitSeries = distinctM[1];
    return base;
  }
  var heartMinM = p.match(/ハートを(\d+)つ以上持つ『([^』]+)』のメンバー1人につき/);
  if (heartMinM) {
    base.scoreUnitKind = "series_stage_members_min_hearts";
    base.scoreUnitSeries = heartMinM[2];
    base.minMemberHeartTotal = Number(normalizeFwDigits(heartMinM[1])) || 4;
    return base;
  }
  return null;
}

/**
 * 「減らし、〜増やす。その後、必要ハートの色がN以上ならスコア＋」系（PL!SP-pb2-048-L 等）。
 * @param {string} p
 * @param {string} segRaw
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyDistinctSeriesNeedHeartShiftThenScore(p, segRaw) {
  if (!/名前の異なる『([^』]+)』のメンバー1人につき/.test(p)) return null;
  if (!/必要ハート/.test(p) || !/減らし/.test(p) || !/増やす/.test(p)) return null;
  if (!/その後/.test(p) || !/スコアを[＋+]/.test(normalizeFwDigits(p))) return null;
  var distinctM = p.match(/名前の異なる『([^』]+)』のメンバー1人につき/);
  var reduceMap = parseNeedHeartReduceFixedMap(segRaw);
  var increaseMap = parseNeedHeartIncreaseMap(segRaw);
  if (!Object.keys(reduceMap).length && !Object.keys(increaseMap).length) return null;
  var slotCondM = String(segRaw || "").match(
    /必要ハートに含まれる\{\{heart_0?(\d)[^}]*\}\}が([０-９\d]+)以上/,
  );
  var scoreGrantM = normalizeFwDigits(p).match(/スコアを[＋+](\d+)/);
  /** @type {Partial<ClassifiedAbility>} */
  var out = {
    template: "live_start_distinct_series_need_heart_shift_score",
    scoreUnitSeries: distinctM ? distinctM[1] : null,
    needHeartReducePerUnitMap: reduceMap,
    needHeartIncreasePerUnitMap: increaseMap,
    requiresOnStage: true,
  };
  if (slotCondM) {
    var slotN = Number(slotCondM[1]);
    out.scoreIfNeedHeartSlotAtLeast = {
      slotKey: slotN === 0 ? "heart0" : slotN === 1 ? "heart01" : "heart0" + slotN,
      min: Number(normalizeFwDigits(slotCondM[2])) || 0,
      grant: scoreGrantM ? Number(scoreGrantM[1]) || 1 : 1,
    };
  }
  return out;
}

/**
 * 「減らし、」以降「増やす」直前のハートアイコン数を増加分として抽出。
 * @param {string} segRaw
 * @returns {Object.<string, number>}
 */
function parseNeedHeartIncreaseMap(segRaw) {
  var s = String(segRaw || "");
  var start = s.indexOf("減らし");
  if (start < 0) return {};
  var rest = s.slice(start + "減らし".length);
  var endM = rest.match(/増やす/);
  if (!endM) return {};
  return parseNeedHeartMapFromSegmentRaw(rest.slice(0, endM.index));
}

/**
 * 「〜1つ/1人/1枚につき必要ハートを減らす」比例減算カードの分類。
 * @param {string} p
 * @param {string} segRaw
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyNeedHeartReducePerUnit(p, segRaw) {
  if (!/につき/.test(p) || !/必要ハート/.test(p) || !/減らす/.test(p)) return null;
  var reduceMap = parseNeedHeartReduceFixedMap(segRaw);
  var reduceKeys = Object.keys(reduceMap);
  if (reduceKeys.length !== 1) return null;
  var reduceKey = reduceKeys[0];
  var perUnit = Math.max(1, Math.floor(Number(reduceMap[reduceKey]) || 1));

  /** @type {Partial<ClassifiedAbility>} */
  var base = {
    template: "live_start_need_heart_reduce_per_unit",
    requiresOnStage: true,
    needHeartReduceSlotKey: reduceKey,
    needHeartReducePerUnit: perUnit,
  };

  var capM = p.match(/\{\{heart_00[^}]*\}\}は(\d+)つまでしか減らない/) || p.match(/(\d+)つまでしか減らない/);
  if (capM) base.needHeartReduceMaxCount = Number(normalizeFwDigits(capM[1])) || 0;

  // 1) センターの『シリーズ』メンバーが持つ heart_X を N つにつき
  var centerM = p.match(/センターエリアに『([^』]+)』のメンバーがいる/);
  var pairM = segRaw.match(/持つ\{\{heart_0?(\d)[^}]*\}\}(\d+)つにつき/);
  if (centerM && pairM) {
    base.needHeartReduceUnitKind = "center_series_heart_pairs";
    base.needHeartReduceUnitSeries = centerM[1];
    base.needHeartReduceUnitSlot = Number(pairM[1]) || 0;
    base.needHeartReduceUnitDivisor = Math.max(1, Number(pairM[2]) || 1);
    return base;
  }

  // 2) ステージの「heart_A と heart_B 以外の色のハートを持つメンバー」1人につき
  if (/以外の色のハートを持つメンバー1人につき/.test(p)) {
    var head = segRaw.slice(0, segRaw.indexOf("以外"));
    var exclude = [];
    var re = /\{\{heart_0?(\d)[^}]*\}\}/g;
    var em;
    while ((em = re.exec(head)) !== null) {
      var sl = Number(em[1]);
      if (sl >= 1 && sl <= 6) exclude.push(sl);
    }
    base.needHeartReduceUnitKind = "stage_members_other_color";
    base.needHeartReduceExcludeSlots = exclude;
    return base;
  }

  // 3) ライブカード置き場にあるこのカード以外の『シリーズ』のカード1枚につき
  var liveOtherM = p.match(/ライブカード置き場にあるこのカード以外の『([^』]+)』のカード1枚につき/);
  if (liveOtherM) {
    base.needHeartReduceUnitKind = "live_area_other_series";
    base.needHeartReduceUnitSeries = liveOtherM[1];
    return base;
  }

  return null;
}

/**
 * @param {string} segRaw
 * @returns {Array<Object.<string, number>>}
 */
function parseNeedHeartChoiceMapsFromSegmentRaw(segRaw) {
  var src = String(segRaw || "");
  var chunks = src.split(/か、|か,/);
  /** @type {Array<Object.<string, number>>} */
  var out = [];
  chunks.forEach(function (chunk) {
    var parsed = parseNeedHeartMapFromSegmentRaw(chunk);
    if (Object.keys(parsed).length) out.push(parsed);
  });
  return out;
}

/**
 * ライブ枠カードの必要ハート色合計条件を抽出。
 * @param {string} p
 * @param {string} segRaw
 */
function parseLiveFrameNeedHeartCondition(p, segRaw) {
  var combined = String(segRaw || "") + "\n" + String(p || "");
  var blockM =
    combined.match(
      /(?:ライブカード置き場にあるカード|ライブ中のライブカード)の必要ハートに含まれる([\s\S]*?)の合計が([０-９\d]+)以上/,
    ) || combined.match(/それらの必要ハートに含まれる([\s\S]*?)の合計が([０-９\d]+)以上/);
  if (!blockM) return null;
  /** @type {number[]} */
  var slots = [];
  var slotRe = /heart_0?(\d)/gi;
  var sm;
  while ((sm = slotRe.exec(blockM[1])) !== null) {
    var n = Number(sm[1]);
    if (n >= 1 && n <= 6 && slots.indexOf(n) < 0) slots.push(n);
  }
  if (!slots.length) return null;
  return {
    minLiveFrameNeedHeartSlots: slots,
    minLiveFrameNeedHeartSlotSum: Number(normalizeFwDigits(blockM[2])) || 0,
  };
}

/**
 * grant_jouji_session 向けの付与先・追跡条件メタ。
 * @param {string} p
 * @param {string} segRaw
 * @returns {Partial<ClassifiedAbility>}
 */
function parseGrantJoujiMeta(p, segRaw) {
  var s = normalizeFwDigits(p);
  /** @type {Partial<ClassifiedAbility>} */
  var meta = {};

  var batonLowM = p.match(/このメンバーよりコストが低い『([^』]+)』のメンバーからバトンタッチ/);
  if (batonLowM) meta.requiresBatonFromLowerCostSeriesTag = batonLowM[1];

  if (/センターエリアにいるメンバーは/.test(p)) meta.grantToCenterMember = true;

  if (/控え室に置いたカードがメンバーカードの場合/.test(p) && /同じ名前を持つメンバー/.test(p)) {
    meta.grantToSameNameAsDiscardedMember = true;
  }

  var namedOrBlockM = p.match(/ステージにいる(.+?)のうち1人は/);
  if (namedOrBlockM && /か/.test(namedOrBlockM[1])) {
    var namedOpts = parseQuotedCharacterNames(namedOrBlockM[1]);
    if (namedOpts.length > 1) meta.grantToNamedStageMemberOptions = namedOpts;
  }

  var namedGrantM = p.match(/ステージにいる「([^」]+)」.*?(?:1人は|メンバー1人は)/);
  if (!namedGrantM) namedGrantM = p.match(/「([^」]+)」1人は/);
  if (namedGrantM && !meta.grantToNamedStageMemberOptions) {
    meta.grantToNamedStageMember = namedGrantM[1];
  }

  var stageGrantM = p.match(/ステージにいる『([^』]+)』のメンバー([０-９\d]+)人まで/);
  if (stageGrantM) {
    meta.grantToStageSeriesTag = stageGrantM[1];
    meta.grantToStageSeriesMax = Number(normalizeFwDigits(stageGrantM[2])) || 1;
  } else {
    var stageGrant2M = p.match(/ステージにいる『([^』]+)』のメンバー1人は/);
    if (stageGrant2M) {
      meta.grantToStageSeriesTag = stageGrant2M[1];
      meta.grantToStageSeriesMax = 1;
    }
  }

  var otherSeriesM = p.match(/このメンバーと自分のステージにいるほかの『([^』]+)』のメンバー1人は/);
  if (otherSeriesM) {
    meta.grantToSelfAndOtherSeriesTag = otherSeriesM[1];
    meta.grantToStageSeriesMax = 1;
  }

  if (/ステージにいるメンバー1人は/.test(p) && !meta.grantToStageSeriesTag && !meta.grantToNamedStageMember) {
    meta.grantPickStageMembersMax = 1;
  }

  if (/そのメンバーは/.test(p) && /ライブ終了時まで/.test(p)) {
    meta.grantToConditionalAreaMember = true;
  }

  var folCostM = s.match(/このカードのコストが(\d+)以上になった場合/);
  if (folCostM) meta.grantFollowupMinSelfPrintedCost = Number(folCostM[1]);

  var deckBotM = s.match(/『([^』]+)』のカードを(\d+)枚以上デッキの下に置いた場合/);
  if (deckBotM) {
    meta.grantAfterDeckBottomSeriesTag = deckBotM[1];
    meta.grantAfterDeckBottomSeriesMin = Number(deckBotM[2]);
  }

  var deckBotTotM = s.match(/自分と相手のカードが合計(\d+)枚以上デッキの下に置かれた場合/);
  if (deckBotTotM) meta.grantAfterDeckBottomTotalMin = Number(deckBotTotM[1]);

  return meta;
}

/**
 * @param {string} p
 * @param {string} segRaw
 * @returns {Partial<ClassifiedAbility> | null}
 */
function parseAreaMemberHeartGrantMeta(p, segRaw) {
  var s = String(segRaw || "") + String(p || "");
  var area = parseStageAreaConstraint(s);
  if (!area) return null;
  var heartM = s.match(/heart_0?(\d)/i);
  var countM = s.match(/を([０-９\d]+)つ以上持つ/);
  if (!heartM || !countM) return null;
  return {
    stageArea: area,
    grantToConditionalAreaMember: true,
    filters: {
      stageArea: area,
      minStageHeartSlot: Number(heartM[1]),
      minStageHeartCount: Number(normalizeFwDigits(countM[1])),
    },
  };
}

/**
 * @param {string} p
 * @param {string} segRaw
 * @param {Partial<ClassifiedAbility>} patch
 */
function enrichGrantJoujiPatch(p, segRaw, patch) {
  var lf = parseLiveFrameNeedHeartCondition(p, segRaw);
  if (lf) {
    patch.filters = Object.assign({}, patch.filters || parseAbilityPickFilters(p), lf);
  } else if (!patch.filters) {
    patch.filters = parseAbilityPickFilters(p);
  }
  var areaMeta = parseAreaMemberHeartGrantMeta(p, segRaw);
  if (areaMeta) {
    patch.filters = Object.assign({}, patch.filters || {}, areaMeta.filters || {});
    patch.stageArea = areaMeta.stageArea;
    patch.grantToConditionalAreaMember = true;
  }
  if (!patch.requiredHeartSlot) {
    var heartGrantM = (String(segRaw || "") + String(p || "")).match(
      /ライブ終了時まで[^。]*?\{\{heart_0?(\d)/i,
    );
    if (heartGrantM) patch.requiredHeartSlot = Number(heartGrantM[1]);
  }
  if (!patch.grantAllHeartCount) {
    var grantClause = (String(segRaw || "") + String(p || "")).split(/ライブ終了時まで/)[1] || "";
    var allCount = (grantClause.match(/\{\{icon_all/g) || []).length;
    if (allCount > 0) patch.grantAllHeartCount = allCount;
  }
  return Object.assign(patch, parseGrantJoujiMeta(p, segRaw));
}

/**
 * 条件付き常時付与で対話・多段が必要なカード。
 * @param {string} p
 * @param {string} segRaw
 * @param {string} trigger
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyConditionalGrantJoujiInteractive(p, segRaw, trigger) {
  if (
    trigger === "live_start" &&
    /ステージにいる/.test(p) &&
    /元々持つハートをすべて/.test(p) &&
    /heart_01|heart01|h01/i.test(String(segRaw || "") + p) &&
    /ライブ終了時まで/.test(p)
  ) {
    var remapSeriesM = p.match(/『([^』]+)』のメンバー1人/);
    var remapSlotM = (String(segRaw || "") + p).match(/heart_0?(\d)/i);
    return {
      template: "live_start_pick_stage_member_printed_hearts_remap",
      printedHeartsRemapSlot: remapSlotM ? Number(remapSlotM[1]) : 1,
      filters: {
        seriesTag: remapSeriesM ? remapSeriesM[1] : null,
        pickType: T_MEMBER,
      },
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /ライブ中の/.test(p) &&
    /ライブカードを1枚選ぶ/.test(p) &&
    /同じカード名のカードが自分の成功ライブカード置き場/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    var shiorikoSeriesM = p.match(/『([^』]+)』のライブカード/);
    var shiorikoHeartM = (String(segRaw || "") + p).match(/heart_0?(\d)/i);
    return {
      template: "live_start_pick_live_frame_match_success_live_grant",
      filters: {
        seriesTag: shiorikoSeriesM ? shiorikoSeriesM[1] : null,
        pickType: T_LIVE,
      },
      requiredHeartSlot: shiorikoHeartM ? Number(shiorikoHeartM[1]) : null,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "kidou" &&
    /手札のライブカードを1枚公開/.test(p) &&
    /相手は手札を1枚控え室に置いてもよい/.test(p) &&
    /そうしなかった場合/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    return {
      template: "kidou_reveal_live_opp_decline_grant",
      bladeGain: bladeGainFromIcons(segRaw, p) || 4,
      perTurnLimit: /ターン1回/.test(segRaw) ? 1 : 0,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /手札を1枚控え室に置いてもよい/.test(p) &&
    /これにより「([^」]+)」のメンバーカードを控え室に置いた場合/.test(p) &&
    /さらに/.test(p)
  ) {
    var hyakuM = p.match(/これにより「([^」]+)」のメンバーカードを控え室に置いた場合/);
    return {
      template: "live_start_optional_hand_discard_named_followup_blade",
      optional: true,
      hasOptionalCost: true,
      handDiscardToWaiting: 1,
      bladeGain: 1,
      followupBladeGain: bladeGainFromIcons(segRaw, p) > 1 ? bladeGainFromIcons(segRaw, p) - 1 : 1,
      discardFollowupCharacterName: hyakuM ? hyakuM[1] : null,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "kidou" &&
    /このカードを手札から控え室に置く/.test(p) &&
    /カードを.*枚引/.test(p) &&
    /ライブ終了時まで/.test(p) &&
    /手札にある場合のみ起動/.test(p)
  ) {
    var kdDrawM = p.match(/カードを(\d+)枚引/);
    var kdSeriesGrantM = p.match(/ステージにいる『([^』]+)』のメンバー1人は/);
    /** @type {Partial<ClassifiedAbility>} */
    var kdPatch = {
      template: "kidou_discard_self_draw_grant",
      requiresInHandOnly: true,
      requiresOnStage: false,
      deckDrawCount: kdDrawM ? Number(kdDrawM[1]) : 1,
      bladeGain: bladeGainFromIcons(segRaw, p) || 1,
      costEnergy: countWikiEnergyIcons(segRaw) > 0,
      costEnergyCount: countWikiEnergyIcons(segRaw) || 0,
    };
    if (kdSeriesGrantM) {
      kdPatch.grantToStageSeriesTag = kdSeriesGrantM[1];
      kdPatch.grantToStageSeriesMax = 1;
      kdPatch.grantPickStageMembersMax = 1;
    }
    var kdNamedOr = p.match(/ステージにいる(.+?)のうち1人は/);
    if (kdNamedOr && /か/.test(kdNamedOr[1])) {
      var kdNamedOpts = parseQuotedCharacterNames(kdNamedOr[1]);
      if (kdNamedOpts.length) kdPatch.grantToNamedStageMemberOptions = kdNamedOpts;
    }
    return kdPatch;
  }
  if (
    trigger === "kidou" &&
    /手札を.*公開/.test(p) &&
    /公開されたカードがライブカードの場合/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    return {
      template: "kidou_hand_reveal_grant_if_live",
      liveScoreGrant:
        parseLiveTotalScorePlusFromText(p) ||
        parseLiveTotalScorePlusFromText(String(segRaw || "").replace(/\{\{[^}]+\}\}/g, "")) ||
        1,
      perTurnLimit: /ターン1回/.test(segRaw) ? 1 : 0,
      costEnergy: /{{icon_energy|E}}/.test(segRaw) || /エネルギー/.test(segRaw),
      costEnergyCount: countWikiEnergyIcons(segRaw) || 2,
    };
  }
  if (
    trigger === "live_start" &&
    /数1つを選ぶ/.test(p) &&
    /デッキの一番上のカードを公開/.test(p) &&
    /選んだ数以下の場合/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    return {
      template: "live_start_number_reveal_grant_if",
      bladeGain: bladeGainFromIcons(segRaw, p) || 2,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /手札の『DOLLCHESTRA』のカードを1枚控え室に置いてもよい/.test(p) &&
    /コストは.*より1低い値/.test(p) &&
    /このカードのコストが10以上になった場合/.test(normalizeFwDigits(p))
  ) {
    var dolHeartM = (segRaw || "").match(/heart_0?(\d)/i);
    return {
      template: "live_start_dollcostra_cost_set_grant_if",
      optional: true,
      hasOptionalCost: true,
      handDiscardToWaiting: 1,
      filters: { seriesTag: "DOLLCHESTRA" },
      grantFollowupMinSelfPrintedCost: 10,
      requiredHeartSlot: dolHeartM ? Number(dolHeartM[1]) : 5,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /手札を1枚控え室に置いてもよい/.test(p) &&
    /このメンバーのコストを[＋+]6する/.test(normalizeFwDigits(p)) &&
    /コストの合計が.*相手.*コストの合計より高い場合/.test(p)
  ) {
    var hasuHeartM = (segRaw || "").match(/heart_0?(\d)/i);
    var hasuSeriesM = p.match(/『([^』]+)』のメンバーのコストの合計/);
    return {
      template: "live_start_hand_discard_cost_boost_grant_if",
      optional: true,
      hasOptionalCost: true,
      handDiscardToWaiting: 1,
      selfCostBoost: 6,
      ownSeriesCostCompareTag: hasuSeriesM ? hasuSeriesM[1] : "蓮ノ空",
      bladeGain: bladeGainFromIcons(segRaw, p) || 1,
      requiredHeartSlot: hasuHeartM ? Number(hasuHeartM[1]) : 5,
      requiresOnStage: true,
      filters: {},
    };
  }
  if (
    trigger === "toujyou" &&
    /自分と相手はそれぞれ.*控え室.*メンバー.*デッキの下に置く/.test(p) &&
    /合計20枚以上デッキの下に置かれた場合/.test(normalizeFwDigits(p))
  ) {
    return {
      template: "toujou_both_shuffle_deck_bottom_grant_if",
      grantAfterDeckBottomTotalMin: 20,
      bladeGain: bladeGainFromIcons(segRaw, p) || 2,
    };
  }
  if (
    trigger === "live_start" &&
    /控え室にあるすべてのメンバーカードをシャッフルし、デッキの下に置いてもよい/.test(p) &&
    /枚以上デッキの下に置いた場合/.test(p)
  ) {
    var fanM = normalizeFwDigits(p).match(/『([^』]+)』のカードを(\d+)枚以上デッキの下に置いた場合/);
    var fanNameM = p.match(/「([^」]+)」1人は/);
    return {
      template: "live_start_optional_shuffle_deck_bottom_grant_if",
      optional: true,
      grantAfterDeckBottomSeriesTag: fanM ? fanM[1] : null,
      grantAfterDeckBottomSeriesMin: fanM ? Number(fanM[2]) : 15,
      grantToNamedStageMember: fanNameM ? fanNameM[1] : null,
      bladeGain: bladeGainFromIcons(segRaw, p) || 3,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /メンバー1人の下にあるエネルギーカード/.test(p) &&
    /エネルギーデッキに置いてもよい/.test(p) &&
    /置いたエネルギーカード1枚につき/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    var awHeartM = (String(segRaw || "") + p).match(/赤ハート|heart_0?2/i);
    return {
      template: "live_start_optional_energy_under_return_grant",
      optional: true,
      hasOptionalCost: true,
      grantHeartCountPerEnergy: 3,
      requiredHeartSlot: awHeartM ? 2 : 1,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /成功ライブカード置き場かライブ中のライブカード/.test(p) &&
    /必要ハートに含まれる/.test(p) &&
    /ライブ終了時まで/.test(p) &&
    /を持つ『虹ヶ咲』のメンバー1人は/.test(p)
  ) {
    var stNeedM = normalizeFwDigits(String(segRaw || "") + p).match(/heart0?1.*?(\d+)/i);
    var grantClauseSt = (String(segRaw || "") + String(p || "")).split(/ライブ終了時まで/)[1] || "";
    var grantOnlySt = grantClauseSt.split(/メンバー1人は/)[1] || grantClauseSt;
    var stGrantCount = (grantOnlySt.match(/\{\{heart_0?6/gi) || []).length;
    if (!stGrantCount) {
      var stGrantM = grantClauseSt.match(/heart_0?(\d)/i);
      stGrantCount = stGrantM ? 1 : 2;
    }
    return {
      template: "live_start_stellar_stream_grant",
      filters: { seriesTag: "虹ヶ咲" },
      minNeedHeartSlot: 1,
      minNeedHeartValue: stNeedM ? Number(stNeedM[1]) : 3,
      memberHeartSlot: 6,
      grantHeartSlotCount: stGrantCount,
      requiredHeartSlot: 6,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "toujyou" &&
    /バトンタッチして登場した場合/.test(p) &&
    /バトンタッチによって控え室に置かれた/.test(p) &&
    /1枚につき.*カードを.*枚引/.test(p) &&
    /ブレードハートを持たない/.test(p)
  ) {
    var duoSeriesM = p.match(/『([^』]+)』のメンバーカード1枚につき/);
    return {
      template: "toujou_baton_discarded_series_per_card",
      batonDiscardedSeriesTag: duoSeriesM ? duoSeriesM[1] : "Liella!",
      deckDrawCount: 1,
      bladeGain: bladeGainFromIcons(segRaw, p) || 2,
      requiresNoBladeHeartOnDiscarded: true,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /「澁谷かのん」「ウィーン・マルガレーテ」「鬼塚冬毬」/.test(p) &&
    /選んだメンバー以外の『Liella!』のメンバー1人は/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    return {
      template: "live_start_dazzling_named_liella_grant",
      grantToNamedStageMemberOptions: ["澁谷かのん", "ウィーン・マルガレーテ", "鬼塚冬毬"],
      filters: { seriesTag: "Liella!" },
      bladeGain: bladeGainFromIcons(segRaw, p) || 1,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /エールによって公開される自分のカードが持つ/.test(p) &&
    /すべて.*紫ブレード/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    return {
      template: "live_start_yell_blade_remap_slot",
      yellBladeRemapSlot: 6,
      requiresOnStage: true,
    };
  }
  if (
    trigger === "live_start" &&
    /成功ライブカード置き場にカードがなく/.test(p) &&
    /相手の成功ライブ/.test(p) &&
    /メンバー2人まで/.test(p)
  ) {
    var aqM = p.match(/『([^』]+)』のメンバー2人まで/);
    return {
      template: "live_start_pay_or_discard_conditional_grant_members",
      optional: true,
      hasOptionalCost: true,
      costOrAlt: true,
      costEnergy: true,
      costEnergyCount: countWikiEnergyIcons(segRaw) || 2,
      handDiscardToWaiting: 2,
      filters: {
        maxOwnSuccessLiveCount: 0,
        minOpponentSuccessLiveCount: 2,
        seriesTag: aqM ? aqM[1] : "Aqours",
      },
      grantToStageSeriesTag: aqM ? aqM[1] : "Aqours",
      grantToStageSeriesMax: 2,
      liveScoreGrant:
        parseLiveTotalScorePlusFromText(p) ||
        parseLiveTotalScorePlusFromText(String(segRaw || "").replace(/\{\{[^}]+\}\}/g, "")) ||
        1,
      requiresOnStage: true,
    };
  }
  return null;
}

/**
 * 「カードを1枚引く。<条件>場合、さらにカードを1枚引く」系。
 * 段階効果テンプレ live_start_/toujou などトリガー非依存の patch を返す。
 * @param {string} p
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyDrawThenConditionalExtraDraw(p) {
  if (!/カードを1枚引く/.test(p)) return null;
  if (!/さらにカードを1枚引く/.test(p)) return null;
  if (/このメンバーがエリアを移動している場合/.test(p)) {
    var movedDrawM = p.match(/カードを(\d+)枚引/);
    var movedExtraM = p.match(/さらにカードを(\d+)枚引/);
    return {
      template: "draw_then_conditional_extra_draw",
      deckDrawCount: movedDrawM ? Number(movedDrawM[1]) : 1,
      extraDrawCount: movedExtraM ? Number(movedExtraM[1]) : 1,
      extraDrawCondType: "selfMovedThisTurn",
      requiresOnStage: true,
    };
  }
  // 余剰ハート/人数段階や控え連動など他テンプレに任せるケースは除外
  if (/必要ハート|控え室に置く|ウェイト|フォーメーション|移動/.test(p)) return null;
  var condM = p.match(/(?:。|引く。)([^。]*?場合)、さらにカードを1枚引く/);
  var condText = condM ? condM[1] : "";
  /** @type {Partial<ClassifiedAbility>} */
  var patch = {
    template: "draw_then_conditional_extra_draw",
    deckDrawCount: 1,
    extraDrawCount: 1,
    filters: {},
  };
  var succSeriesM = condText.match(/成功ライブカード置き場に『([^』]+)』/);
  if (succSeriesM) {
    patch.extraDrawCondType = "successLiveSeries";
    patch.extraDrawCondSeriesTag = succSeriesM[1];
    return patch;
  }
  var stageNameM = condText.match(/ステージに「([^」]+)」がいる/);
  if (stageNameM) {
    patch.extraDrawCondType = "stageHasName";
    patch.extraDrawCondName = stageNameM[1];
    return patch;
  }
  var stageSeriesM = condText.match(/ステージに『([^』]+)』/);
  if (stageSeriesM) {
    patch.extraDrawCondType = "stageHasSeries";
    patch.extraDrawCondSeriesTag = stageSeriesM[1];
    return patch;
  }
  return null;
}

/**
 * 相手ステージウェイト対象の「元々ブレードN以下」上限を能力文から読む。
 * @param {string} p
 * @returns {number | null}
 */
function parseOppWaitPrintedBladeLimit(p) {
  var s = normalizeFwDigits(String(p || ""));
  var bladeM =
    s.match(/元々持つの数が(\d+)つ?以下/) ||
    s.match(/元々持つ[^。]*?ブレードの数が(\d+)つ?以下/) ||
    s.match(/ブレードが(\d+)つ以下/);
  return bladeM ? Number(bladeM[1]) : null;
}

/**
 * LL-bp4-001 系: デッキ上5枚を見る→指定名メンバー1枚を手札→残り控え→
 * 相手ステージの「公開カードのコスト以下 かつ 元々ブレード3以下」を一括ウェイト。
 * @param {string} p
 * @param {string} segRaw
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyDeckPeekPickThenOppWait(p, segRaw) {
  var s = normalizeFwDigits(p);
  if (!/デッキの上からカードを(\d+)枚見る/.test(s)) return null;
  if (!/相手のステージにいる/.test(s)) return null;
  if (!/すべてウェイトにする/.test(s)) return null;
  var peekM = s.match(/デッキの上からカードを(\d+)枚見る/);
  /** @type {string[]} */
  var names = [];
  var nameRe = /「([^」]+)」/g;
  var nm;
  while ((nm = nameRe.exec(p)) !== null) names.push(nm[1]);
  var bladeMax = parseOppWaitPrintedBladeLimit(p);
  return {
    template: "deck_peek_pick_then_opp_wait",
    deckPeekCount: peekM ? Number(peekM[1]) : 5,
    pickNamedMembers: names,
    oppWaitCostFromPicked: /公開したカードのコスト以下/.test(p),
    oppWaitMaxPrintedBlade: bladeMax != null ? bladeMax : 3,
    optional: /もよい/.test(p),
    hasOptionalCost: false,
    filters: {},
  };
}

function classifyOptionalSelfWaitEffect(p, base) {
  if (!base.costSelfWait || !base.hasOptionalCost) return null;
  /** @type {Partial<ClassifiedAbility>} */
  var patch = {
    optional: true,
    hasOptionalCost: true,
    costSelfWait: true,
    requiresOnStage: true,
  };
  if (/相手のステージ/.test(p) && /ウェイト/.test(p)) {
    var costM = p.match(/コスト(\d+)以下/);
    var oppCntM = p.match(/(\d+)人までウェイト/);
    var bladeMaxOw = parseOppWaitPrintedBladeLimit(p);
    return Object.assign(patch, {
      template: "optional_self_wait_opp_stage",
      oppWaitMaxCost: costM ? Number(costM[1]) : bladeMaxOw != null ? 99 : 4,
      oppWaitMaxPrintedBlade: bladeMaxOw != null ? bladeMaxOw : undefined,
      oppWaitCount: oppCntM ? Number(oppCntM[1]) : 1,
    });
  }
  var lookN = parseDeckTopCount(p);
  if (
    lookN != null &&
    /見る/.test(p) &&
    /手札に加/.test(p) &&
    (/必要ハート/.test(p) || /Liella!/.test(p))
  ) {
    return Object.assign(patch, {
      template: "toujou_deck_top_liella_live_pick",
      deckTopCount: lookN,
      filters: parseAbilityPickFilters(p),
    });
  }
  if (
    lookN != null &&
    /見る/.test(p) &&
    /手札に加/.test(p) &&
    /公開/.test(p) &&
    /デッキの上|山札の上/.test(p)
  ) {
    return Object.assign(patch, {
      template: "deck_top_pick_recover",
      deckTopCount: lookN,
      filters: parseAbilityPickFilters(p),
    });
  }
  if (
    lookN != null &&
    /見る/.test(p) &&
    /デッキの上|山札の上/.test(p) &&
    !(/手札に加/.test(p) && /公開/.test(p))
  ) {
    return Object.assign(patch, {
      template: "deck_top_look_reorder",
      deckTopCount: lookN,
    });
  }
  if (/控え室から/.test(p) && /手札に加/.test(p) && !/成功ライブ/.test(p)) {
    return Object.assign(patch, {
      template: "toujou_wait_pick_hand",
      filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
    });
  }
  if (/成功ライブ/.test(p) && /手札に加/.test(p)) {
    return Object.assign(patch, {
      template: "toujou_success_live_pick_hand",
      filters: parseAbilityPickFilters(p),
    });
  }
  var drawM = p.match(/カードを(\d+)枚引/);
  if (drawM && !/控え室から/.test(p) && !/山札の上からカードを/.test(p)) {
    return Object.assign(patch, {
      template: "draw_from_deck",
      deckDrawCount: Number(drawM[1]) || 1,
      filters: parseAbilityPickFilters(p),
    });
  }
  var td = parseDeckTopCount(p);
  if (td != null && /控え室/.test(p)) {
    return Object.assign(patch, {
      template: "deck_top_to_waiting",
      deckTopCount: td,
    });
  }
  return null;
}

/**
 * ライブ開始時「メンバー1人をウェイトにしてもよい：ライブ終了時まで…」
 * @param {string} p
 * @param {string} segRaw
 * @param {ClassifiedAbility} base
 * @returns {Partial<ClassifiedAbility> | null}
 */
function classifyOptionalMemberWaitGrant(p, segRaw, base) {
  if (!base.costPickMemberWait) return null;
  if (!/ライブ終了時まで/.test(p + segRaw)) return null;
  var grantBlade = bladeGainFromIcons(segRaw, p);
  if (grantBlade <= 0) grantBlade = base.bladeGain || 0;
  var grantScore = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
  return {
    template: "grant_jouji_session",
    optional: true,
    hasOptionalCost: true,
    costPickMemberWait: true,
    bladeGain: grantBlade,
    liveScoreGrant: grantScore,
    requiresOnStage: true,
    filters: parseAbilityPickFilters(p),
  };
}

function classifyPayEnergyPickOne(card, trigger) {
  var raw = cardAbilityRawText(card);
  if (!/E支払ってもよい：以下から1つを選ぶ/.test(raw)) return null;
  if (!cardHasTrigger(card, "toujyou") && !cardHasTrigger(card, "live_start")) return null;
  if (trigger && trigger !== "toujyou" && trigger !== "live_start") return null;
  var choices = parseAbilityBulletChoices(raw);
  return {
    template: "pay_energy_pick_one",
    abilityChoices: choices.length ? choices : parseAbilityBulletChoices(raw),
    optional: true,
    hasOptionalCost: true,
    costEnergy: true,
    costEnergyCount: 1,
  };
}

/** @param {string} rawOrPlain 能力セグメント原文またはプレーンテキスト */
export function parseAbilityBulletChoices(rawOrPlain) {
  var s = String(rawOrPlain == null ? "" : rawOrPlain);
  var lines = s.split(/\n/);
  /** @type {string[]} */
  var out = [];
  lines.forEach(function (line) {
    var t = line.replace(/\{\{[^}]+\}\}/g, "").trim();
    if (!t) return;
    var m = t.match(/^[・•]\s*(.+)$/);
    if (m) out.push(m[1].trim());
  });
  if (!out.length) {
    var re = /[・•]\s*([^・•\n]+)/g;
    var mm;
    while ((mm = re.exec(s)) !== null) {
      var bit = String(mm[1] || "").trim();
      if (bit) out.push(bit);
    }
  }
  return out;
}

function parseBladeGainCount(p) {
  if (!/ブレード.*得る/.test(p) && !/得る/.test(p)) return 0;
  var m = p.match(/ブレード(?:\s*ブレード)*\s*を得る/);
  if (m) {
    return (m[0].match(/ブレード/g) || []).length;
  }
  var n = p.match(/ブレード(\d+)個?を得る/);
  if (n) return Number(n[1]) || 0;
  if (/ブレードを得る/.test(p)) return 1;
  return 0;
}

/** @param {string} segRaw */
function countWikiEnergyIcons(segRaw) {
  return (String(segRaw || "").match(/\{\{icon_energy\.png\|E\}\}/g) || []).length;
}

/** @param {string} segRaw */
function countWikiBladeIcons(segRaw) {
  return (String(segRaw || "").match(/\{\{[^}]*blade[^}]*\}\}/gi) || []).length;
}

/** @param {string} segRaw @param {string} p */
function bladeGainFromIcons(segRaw, p) {
  var fromP = parseBladeGainCount(p);
  if (fromP > 0) return fromP;
  if (/ライブ終了時まで/.test(p) && /得る/.test(p)) return countWikiBladeIcons(segRaw);
  return 0;
}

/** @param {ClassifiedAbility} base @param {string} segRaw */
function applyOptionalEnergyCostFromSegment(base, segRaw) {
  /**
   * 条件・コストは「：」より前の部分だけ。
   * 「：」がない場合は全て効果本文なので、エネルギーアイコンはコストではない。
   */
  var colonIdx = segRaw.indexOf("：");
  var costRaw = colonIdx >= 0 ? segRaw.slice(0, colonIdx) : "";
  if (!costRaw) return;
  var n = countWikiEnergyIcons(costRaw);
  if (n > 0) {
    base.costEnergy = true;
    base.costEnergyCount = Math.max(base.costEnergyCount || 0, n);
    if (/もよい/.test(costRaw)) base.hasOptionalCost = true;
  }
}

/**
 * ライブ開始時など「E支払ってもよい：ライブ終了時までブレード得る」
 * @param {string} segRaw
 * @param {string} p
 * @param {ClassifiedAbility} base
 */
function classifyOptionalEnergyBladeUntilLiveEnd(segRaw, p, base) {
  if (!/ライブ終了時まで/.test(p)) return null;
  if (!/得る/.test(p) && !/得る/.test(segRaw)) return null;
  var bladeGain = parseBladeGainCount(p);
  if (bladeGain <= 0) bladeGain = countWikiBladeIcons(segRaw);
  if (bladeGain <= 0) return null;
  var energyN = countWikiEnergyIcons(segRaw);
  var hasEnergy =
    energyN > 0 || base.costEnergy === true || /E支払/.test(p) || /エネルギー.*支払/.test(p);
  if (!hasEnergy) return null;
  if (!/もよい/.test(segRaw) && !base.hasOptionalCost) return null;
  return {
    template: "optional_energy_blade_until_live_end",
    optional: true,
    hasOptionalCost: true,
    costEnergy: true,
    costEnergyCount: energyN > 0 ? energyN : base.costEnergyCount || 1,
    bladeGain: bladeGain,
  };
}

/** @param {string} p @returns {AbilityPickFilters} */
export function parseAbilityPickFilters(p) {
  /** @type {AbilityPickFilters} */
  var f = {
    pickType: null,
    maxCost: null,
    minCost: null,
    seriesTag: null,
    minSuccessLiveCount: null,
    minNeedHeartSlot: null,
    minNeedHeartValue: null,
    minTotalNeedHeart: null,
  };
  if (/メンバーカード/.test(p)) f.pickType = T_MEMBER;
  else if (/ライブカード/.test(p) && !/成功ライブカード/.test(p)) f.pickType = T_LIVE;
  var minScoreLiveM = p.match(/スコア([０-９\d]+)以上のライブカード/);
  if (minScoreLiveM) f.minScore = Number(normalizeFwDigits(minScoreLiveM[1])) || 0;
  if (f.minScore == null && /成功ライブ/.test(p) && /(スコアを持つ|icon_score)/.test(p)) {
    f.minScore = 1;
  }
  var distinctYellM = p.match(/名前が異なる『([^』]+)』のメンバーカードが([０-９\d]+)枚以上/);
  if (distinctYellM) {
    f.minDistinctYellRevealedMemberNames = Number(normalizeFwDigits(distinctYellM[2])) || 0;
    f.distinctYellRevealedSeriesTag = distinctYellM[1];
  }
  var costM = p.match(/コスト(\d+)以下/);
  if (costM) f.maxCost = Number(costM[1]);
  var minCostM = p.match(/コスト(\d+)以上/);
  if (minCostM) f.minCost = Number(minCostM[1]);
  var seriesM = p.match(/『([^』]+)』/);
  if (seriesM) f.seriesTag = seriesM[1];
  var eitherSlClause = /自分か相手の成功ライブ/.test(p);
  if (!eitherSlClause) {
    var slM = p.match(/成功ライブ(?:カード)?置き場にカードが(\d+)枚以上/);
    if (!slM) slM = p.match(/成功ライブ.*置き場.*(\d+)枚以上/);
    if (slM) f.minSuccessLiveCount = Number(slM[1]);
    if (/1枚ある場合/.test(p) && /2枚以上/.test(p) && f.minSuccessLiveCount != null && f.minSuccessLiveCount > 1) {
      f.minSuccessLiveCount = 1;
    }
    if (
      f.minSuccessLiveCount == null &&
      /成功ライブ(?:カード)?置き場にカードが1枚以上/.test(p)
    ) {
      f.minSuccessLiveCount = 1;
    }
    if (
      f.minSuccessLiveCount == null &&
      /成功ライブ(?:カード)?置き場にカードがある場合/.test(p)
    ) {
      f.minSuccessLiveCount = 1;
    }
  }
  var needM = p.match(/必要ハートに([^を]+)を(\d+)以上/);
  if (needM) {
    f.minNeedHeartValue = Number(needM[2]);
    var color = needM[1];
    var colorMap = { 桃: 1, 赤: 2, 黄: 3, 緑: 4, 青: 5, 紫: 6 };
    if (colorMap[color] != null) f.minNeedHeartSlot = colorMap[color];
  }
  var totalNeedM = p.match(/必要ハートの合計が(\d+)以上/);
  if (totalNeedM) f.minTotalNeedHeart = Number(totalNeedM[1]);
  var slScoreM = p.match(/成功ライブカード置き場にあるカードのスコアの合計が([０-９\d]+)以上/);
  if (slScoreM) {
    var scRaw = String(slScoreM[1]).replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    });
    f.minSuccessLiveScoreSum = Number(scRaw) || 0;
  }
  var enM = p.match(/自分のエネルギーが(\d+)枚以上/);
  if (enM) f.minEnergyCount = Number(enM[1]);
  var stageMinCostM = p.match(/ステージ.*コスト(\d+)以上のメンバーがいる/);
  if (!stageMinCostM) stageMinCostM = p.match(/コスト(\d+)以上のメンバーが.*ステージ/);
  if (!stageMinCostM) stageMinCostM = p.match(/コスト(\d+)以上のメンバーがいる場合/);
  if (stageMinCostM) f.minCostMemberOnStage = Number(stageMinCostM[1]);
  var onlyStageSeriesM = p.match(/ステージにいるメンバーが『([^』]+)』のみの場合/);
  if (onlyStageSeriesM) f.requiresStageOnlySeries = onlyStageSeriesM[1];
  var charStage = p.match(/ステージに「([^」]+)」がいる/);
  if (charStage) f.characterNameOnStage = charStage[1];
  var charHand = p.match(/手札の「([^」]+)」/);
  if (charHand) f.characterName = charHand[1];
  var charEnter = p.match(/手札からコスト[^「]*「([^」]+)」/);
  if (charEnter) f.characterName = charEnter[1];
  if (/このターン中にエリアを移動/.test(p) && !/または|か、/.test(p)) {
    /** 「移動したメンバーは〜得る」は対象指定。発動条件（〜場合）とは別 */
    var movedMemberTargetGrant =
      /エリアを移動(?:した|している)/.test(p) &&
      /(?:メンバー|すべて)/.test(p) &&
      /を得る/.test(p);
    if (!movedMemberTargetGrant) f.requiresStageMemberMovedThisTurn = true;
  }
  var stageHeartM =
    p.match(/ステージに.*heart_0?(\d).*を([０-９\d]+)つ以上持つメンバーがいる場合/) ||
    p.match(/ステージに.*\{\{heart_0?(\d)[^}]*\}\}を([０-９\d]+)つ以上持つメンバーがいる場合/);
  if (stageHeartM) {
    var shSlot = Number(stageHeartM[1]) || 0;
    if (shSlot >= 1 && shSlot <= 6) f.minStageHeartSlot = shSlot;
    var shCnt = normalizeFwDigits(stageHeartM[2]);
    f.minStageHeartCount = Number(shCnt) || 0;
  }
  var distinctNamesM = p.match(/ステージと控え室に名前の異なる[^が]*メンバーが([０-９\d]+)人以上/);
  if (distinctNamesM) {
    f.minDistinctStageAndWaitingNames = Number(normalizeFwDigits(distinctNamesM[1])) || 0;
  }
  if (!/成功ライブカード置き場/.test(p)) {
    var liveFr = p.match(/ライブカード置き場にカードが(\d+)枚以上/);
    if (liveFr) f.minLiveFrameCount = Number(liveFr[1]);
  }
  var stageSeriesM = p.match(/ステージに(?:名前の異なる)?『([^』]+)』のメンバーが([０-９\d]+)人以上/);
  if (stageSeriesM) {
    f.minStageSeriesMembers = Number(normalizeFwDigits(stageSeriesM[2])) || 0;
    f.minStageSeriesMembersTag = stageSeriesM[1];
  }
  var stageMembersM = p.match(/自分のステージにメンバーが([０-９\d]+)人以上/);
  if (stageMembersM) {
    f.minStageMembers = Number(normalizeFwDigits(stageMembersM[1])) || 0;
  }
  var handMaxM = p.match(/自分の手札が([０-９\d]+)枚以下/);
  if (handMaxM) {
    f.maxHandCount = Number(normalizeFwDigits(handMaxM[1]));
  }
  var selfScoreM = p.match(/このカードのスコアが([０-９\d]+)の場合/);
  if (selfScoreM) {
    f.requiresSelfScoreEquals = Number(normalizeFwDigits(selfScoreM[1]));
  }
  var waitSeriesLiveM = p.match(/控え室に『([^』]+)』のライブカードが([０-９\d]+)枚以上/);
  if (waitSeriesLiveM) {
    f.minWaitingSeriesLiveCount = Number(normalizeFwDigits(waitSeriesLiveM[2])) || 0;
    f.waitingSeriesLiveTag = waitSeriesLiveM[1];
  }
  var waitNameLiveM = p.match(/控え室にカード名に「([^」]+)」を含むライブカードがある/);
  if (waitNameLiveM) {
    f.requiresWaitingLiveNameContains = waitNameLiveM[1];
  }
  var stageSeriesAnyM = p.match(/ステージに『([^』]+)』のメンバーがいる場合/);
  if (stageSeriesAnyM && !/人以上/.test(p.slice(0, p.indexOf("場合") + 2))) {
    f.minStageSeriesMembers = 1;
    f.minStageSeriesMembersTag = stageSeriesAnyM[1];
  }
  var distinctGroupsM = p.match(/グループ名がそれぞれ異なるメンバーが([０-９\d]+)人以上/);
  if (distinctGroupsM) {
    f.minDistinctMemberGroups = Number(normalizeFwDigits(distinctGroupsM[1])) || 0;
  }
  var waitCardM = p.match(/控え室に『([^』]+)』のカードが([０-９\d]+)枚以上/);
  if (waitCardM && !/メンバーカード/.test(waitCardM[0])) {
    f.minWaitingSeriesCardCount = Number(normalizeFwDigits(waitCardM[2])) || 0;
    f.waitingSeriesCardTag = waitCardM[1];
  }
  var waitMemM = p.match(/控え室に『([^』]+)』のメンバーカードが([０-９\d]+)枚以上/);
  if (waitMemM) {
    f.minWaitingSeriesMemberCount = Number(normalizeFwDigits(waitMemM[2])) || 0;
    f.waitingSeriesMemberTag = waitMemM[1];
  }
  if (/自分の成功ライブカード置き場にカードがなく/.test(p)) {
    f.maxOwnSuccessLiveCount = 0;
  }
  if (!eitherSlClause) {
    var oppSlM = normalizeFwDigits(p).match(/相手の成功ライブ(?:カード)?置き場にカードが(\d+)枚以上/);
    if (oppSlM) f.minOpponentSuccessLiveCount = Number(oppSlM[1]) || 0;
  }
  if (/自分と相手の成功ライブカード置き場にあるカードの枚数が同じ場合/.test(p)) {
    f.requiresSuccessLiveCountTieWithOpponent = true;
  }
  var lfOnlyM = p.match(/ライブカード置き場にあるカードが『([^』]+)』のみ/);
  if (lfOnlyM) f.requiresLiveFrameOnlySeries = lfOnlyM[1];
  if (/相手のステージにいるすべてのメンバーのそれぞれのコストよりコストが高いメンバーが自分のステージにいる/.test(p)) {
    f.requiresStageMemberHigherThanAllOpponent = true;
  }
  var costCmpM = p.match(
    /自分のステージにいる『([^』]+)』のメンバーのコストの合計が、相手のステージにいるメンバーのコストの合計より高い/,
  );
  if (costCmpM) {
    f.requiresOwnSeriesCostSumHigherThanOpponent = true;
    f.ownSeriesCostCompareTag = costCmpM[1];
  }
  if (/自分のステージにいるメンバーのコストの合計が相手より低い/.test(p)) {
    f.requiresOwnStageCostSumLowerThanOpponent = true;
  }
  if (
    /自分のステージにいるメンバーが持つハートの総数が、相手のステージにいるメンバーが持つハートの総数より多い/.test(
      p,
    )
  ) {
    f.requiresOwnStageHeartTotalHigherThanOpponent = true;
  }
  var centerCmpM = p.match(
    /センターエリアにいる『([^』]+)』のメンバーのコストが、相手のセンターエリアにいるメンバーより高い/,
  );
  if (centerCmpM) {
    f.requiresCenterSeriesCostHigherThanOpponent = true;
    f.centerSeriesCostCompareTag = centerCmpM[1];
  }
  if (/自分と相手のライブの合計スコアが同じ/.test(p)) {
    f.requiresLiveScoreTieWithOpponent = true;
  }
  if (/ライブの合計スコアが相手より高い/.test(p)) {
    f.requiresLiveScoreHigherThanOpponent = true;
  }
  var oppHandLeadM = p.match(/相手の手札の枚数が自分より([０-９\d]+)枚以上多い/);
  if (oppHandLeadM) {
    f.requiresOpponentHandLead = Number(normalizeFwDigits(oppHandLeadM[1])) || 0;
  }
  if (/自分か相手の成功ライブ/.test(p)) {
    var eitherSlM = p.match(/(\d+)枚以上/);
    if (eitherSlM) f.minEitherSuccessLiveCount = Number(eitherSlM[1]) || 0;
  }
  return f;
}

/** @param {string} p */
export function parseLiveTotalScorePlusFromText(p) {
  var s = normalizeFwDigits(String(p || ""));
  var m = s.match(/ライブの合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  m = s.match(/合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  return 0;
}

/** @param {string} p */
export function parseLiveCardScorePlusFromText(p) {
  var s = normalizeFwDigits(String(p || ""));
  var m = s.match(/このカードのスコアを[＋+](\d+)/);
  return m ? Number(m[1]) || 0 : 0;
}

/** @param {string} p */
function parseScorePlusFromText(p) {
  return parseLiveTotalScorePlusFromText(p);
}

/** @param {string} p @returns {Array<{costSum: number, kind: string, liveScoreGrant?: number}>} */
function parseWaitingCostTiersFromText(p) {
  var plain = normalizeFwDigits(String(p || ""));
  /** @type {Array<{costSum: number, kind: string, liveScoreGrant?: number}>} */
  var tiers = [];
  var re = /合計が(\d+)の場合、([^。]+)/g;
  var m;
  while ((m = re.exec(plain)) !== null) {
    var costSum = Number(m[1]) || 0;
    var effect = m[2];
    if (/カードを1枚引/.test(effect)) tiers.push({ costSum: costSum, kind: "draw" });
    else if (/ライブの合計スコア/.test(effect))
      tiers.push({ costSum: costSum, kind: "live_score", liveScoreGrant: parseLiveTotalScorePlusFromText(effect) || 1 });
    else if (/を得る/.test(effect)) tiers.push({ costSum: costSum, kind: "grant_wild_heart" });
  }
  return tiers;
}

/** 最初の「〜場合、」以降の効果本文を取り出す（条件側の語に複合判定が反応しないように） */
function scoreEffectPartAfterCondition(p) {
  var s = String(p || "");
  var idx = s.indexOf("場合");
  return idx >= 0 ? s.slice(idx + 2) : s;
}

/** 複合効果（スコア以外の大きな処理が同時にある）。効果本文部分のみで判定する。 */
function isCompoundLiveScoreEffectText(p) {
  var effect = scoreEffectPartAfterCondition(p);
  return /その後|以下から|アクティブにする|見る|引く|控え室|デッキ|山札|エネルギーを.*枚までアクティブ|1人につき|1色につき/.test(
    effect,
  );
}

/**
 * ライブ開始時効果内で付与される常時テキスト（{{jyouji}} 引用）を抽出。
 * @param {string} segRaw
 * @returns {string[]}
 */
export function extractGrantedJoujiTextsFromSegment(segRaw) {
  var s = String(segRaw || "");
  /** @type {string[]} */
  var out = [];
  var re = /「\{\{jyouji[^}]+\}\}([^」]+)」/g;
  var m;
  while ((m = re.exec(s)) !== null) {
    out.push("{{jyouji.png|常時}}" + m[1]);
  }
  re = /\{\{jyouji[^}]+\}\}([^「」\n]+?(?:を得る|する)。?)/g;
  while ((m = re.exec(s)) !== null) {
    var t = "{{jyouji.png|常時}}" + m[1];
    if (out.indexOf(t) < 0) out.push(t);
  }
  return out;
}

/** @param {*} cat */
function sumNeedHeartOnCard(cat) {
  var need = cat && cat.need_heart;
  if (!need || typeof need !== "object") return 0;
  var sum = 0;
  Object.keys(need).forEach(function (k) {
    var v = Number(need[k]);
    if (Number.isFinite(v) && v > 0) sum += v;
  });
  return sum;
}

/**
 * シリーズタグ（『μ's』等）とカード DB フィールドのゆるい一致。
 * @param {*} cat getCard の結果
 * @param {string} tag
 */
export function catalogCardMatchesSeriesTag(cat, tag) {
  return catalogCardMatchesGroupTag(cat, tag);
}

/**
 * @param {*} cat
 * @param {AbilityPickFilters} filters
 */
export function catalogCardMatchesPickFilters(cat, filters) {
  if (!cat || !filters) return false;
  if (filters.pickType && cat.type !== filters.pickType) return false;
  if (filters.maxCost != null) {
    var cost = Number(cat.cost != null ? cat.cost : cat.score);
    if (!Number.isFinite(cost) || cost > filters.maxCost) return false;
  }
  if (filters.minCost != null) {
    var costMin = Number(cat.cost != null ? cat.cost : cat.score);
    if (!Number.isFinite(costMin) || costMin < filters.minCost) return false;
  }
  if (filters.pickMaxScore != null) {
    var sc = Number(cat.score);
    if (!Number.isFinite(sc) || sc > filters.pickMaxScore) return false;
  }
  if (filters.minScore != null) {
    var scMin = Number(cat.score);
    if (!Number.isFinite(scMin) || scMin < filters.minScore) return false;
  }
  if (filters.seriesTagsAny && filters.seriesTagsAny.length) {
    var anySeries = false;
    for (var sti = 0; sti < filters.seriesTagsAny.length; sti++) {
      if (catalogCardMatchesSeriesTag(cat, filters.seriesTagsAny[sti])) {
        anySeries = true;
        break;
      }
    }
    if (!anySeries) return false;
  } else if (filters.seriesTag && !catalogCardMatchesSeriesTag(cat, filters.seriesTag)) return false;
  if (filters.minNeedHeartSlot != null && filters.minNeedHeartValue != null) {
    var need = cat.need_heart;
    if (!need || typeof need !== "object") return false;
    var key = "heart0" + filters.minNeedHeartSlot;
    var alt = "heart_" + String(filters.minNeedHeartSlot).padStart(2, "0");
    var v = Number(need[key] != null ? need[key] : need[alt]);
    if (!Number.isFinite(v) || v < filters.minNeedHeartValue) return false;
  }
  if (filters.minTotalNeedHeart != null) {
    if (sumNeedHeartOnCard(cat) < filters.minTotalNeedHeart) return false;
  }
  if (filters.acceptNoAbilityOrNativeJouji) {
    var noAb = !String(cat.ability || "").trim();
    var hasJ = catalogCardHasNativeJoujiAbility(cat);
    if (!noAb && !hasJ) return false;
  }
  if (filters.characterName && String(cat.name || "") !== String(filters.characterName)) return false;
  if (filters.heartSlotsAny && filters.heartSlotsAny.length) {
    if (cat.type !== T_MEMBER) return false;
    var slotsAny = filters.heartSlotsAny;
    var hasHeart = false;
    for (var hi = 0; hi < slotsAny.length; hi++) {
      var slotN = Math.floor(Number(slotsAny[hi]));
      if (!(slotN >= 1 && slotN <= 6)) continue;
      var hKey = slotN === 1 ? "heart01" : "heart0" + slotN;
      var hAlt = "heart_" + String(slotN).padStart(2, "0");
      var bh = cat.base_heart;
      var blh = cat.blade_heart;
      var need = cat.need_heart;
      if (bh && (Number(bh[hKey]) > 0 || Number(bh[hAlt]) > 0)) hasHeart = true;
      if (blh) {
        var bKey = slotN === 1 ? "b_heart01" : "b_heart0" + slotN;
        if (Number(blh[bKey]) > 0) hasHeart = true;
      }
      if (need && (Number(need[hKey]) > 0 || Number(need[hAlt]) > 0)) hasHeart = true;
    }
    if (!hasHeart) return false;
  }
  return true;
}

/** @param {string} p @param {string} segRaw @returns {number[]} */
function parseHeartSlotsAnyFromText(p, segRaw) {
  var blob = String(p || "") + String(segRaw || "");
  /** @type {number[]} */
  var out = [];
  if (/heart02|heart_02|h02|赤/.test(blob)) out.push(2);
  if (/heart04|heart_04|h04|緑/.test(blob)) out.push(4);
  if (/heart05|heart_05|h05|青/.test(blob)) out.push(5);
  if (/heart01|heart_01|h01|桃/.test(blob)) out.push(1);
  if (/heart03|heart_03|h03|黄/.test(blob)) out.push(3);
  if (/heart06|heart_06|h06|紫/.test(blob)) out.push(6);
  return out.filter(function (v, i, a) {
    return a.indexOf(v) === i;
  });
}

/**
/** @param {string} p */
function parseRequiresSeriesOnStage(p) {
  return /ステージに『[^』]+』[^：]*登場している場合/.test(String(p || ""));
}

/** @param {string} p @returns {string[]} */
/**
 * ライブ開始時「○○1人はheart05…」形式の付与を解析（PL!SP-bp1-024-L 等）
 * @param {string} p
 * @param {string} segRaw
 * @returns {{ name: string, heartSlot: number, count: number }[]}
 */
function parseNamedMemberHeartBladeGifts(p, segRaw) {
  /** @type {{ name: string, heartSlot: number, count: number }[]} */
  var gifts = [];
  var chunks = String(p + " " + segRaw).split(/、|,/);
  chunks.forEach(function (chunk) {
    var nm = chunk.match(/「([^」]+)」/);
    if (!nm) return;
    var slot = 0;
    if (/heart05|heart_05|h05/i.test(chunk)) slot = 5;
    else if (/heart01|heart_01|h01/i.test(chunk)) slot = 1;
    else if (/heart02|heart_02|h02/i.test(chunk)) slot = 2;
    else if (/heart03|heart_03|h03/i.test(chunk)) slot = 3;
    else if (/heart04|heart_04|h04/i.test(chunk)) slot = 4;
    else if (/heart06|heart_06|h06/i.test(chunk)) slot = 6;
    if (slot > 0) {
      gifts.push({
        name: String(nm[1]).trim(),
        heartSlot: slot,
        count: 1,
        grantBlade: /ブレード/.test(chunk),
      });
    }
  });
  return gifts;
}

export function parseQuotedCharacterNames(p) {
  /** @type {string[]} */
  var names = [];
  var re = /「([^」]+)」/g;
  var m;
  while ((m = re.exec(String(p || ""))) !== null) {
    if (m[1]) names.push(String(m[1]).trim());
  }
  return names;
}

/** @param {string} p @param {string} [segRaw] @returns {number[]} 1-6 */
export function parseHeartColorPickSlots(p, segRaw) {
  var s = String(segRaw || p || "");
  /** @type {number[]} */
  var slots = [];
  var re = /\{\{heart_0?(\d)[^}]+\}\}/gi;
  var m;
  while ((m = re.exec(s)) !== null) {
    var slot = Number(m[1]);
    if (slot >= 1 && slot <= 6 && slots.indexOf(slot) < 0) slots.push(slot);
  }
  if (slots.length) return slots;
  return [1, 2, 3, 4, 5, 6];
}

/** 成功ライブカード置き場に置けない（常時） */
export function cardCannotPlaceOnSuccessLive(card) {
  if (!card || !card.ability) return false;
  return /成功ライブカード置き場に置くことができない/.test(abilityPlainText(card));
}

/** 成功ライブ置き場へ置く際、控え室のライブで代置できる（錯覚CROSSROADS 等） */
export function cardOffersSuccessLiveWaitingSubstitute(card) {
  if (!card || !card.ability) return false;
  var p = abilityPlainText(card);
  return (
    /成功ライブカード置き場に置く場合/.test(p) &&
    /代わりに/.test(p) &&
    /控え室/.test(p) &&
    /ライブカード/.test(p) &&
    /置いてもよい/.test(p)
  );
}

/** @param {*} card */
export function successLiveWaitingSubstitutePickFilters(card) {
  return Object.assign(parseAbilityPickFilters(abilityPlainText(card)), { pickType: T_LIVE });
}

/**
 * @param {*} card カタログカード
 * @param {string} [trigger] 指定時、そのトリガーセグメントだけを分類する
 * @param {string} [segmentRawOverride] 指定時、このセグメント原文だけを分類する
 * @returns {ClassifiedAbility}
 */
export function classifyCardAbility(card, trigger, segmentRawOverride, composeOpts) {
  var inner = _classifyCardAbilityCore(card, trigger, segmentRawOverride);
  if (composeOpts && composeOpts.skipCompose) return inner;
  if (!trigger) return inner;
  var segForCompose =
    segmentRawOverride != null && String(segmentRawOverride) !== ""
      ? String(segmentRawOverride)
      : abilityRawSegmentForTrigger(card, trigger);
  if (!segForCompose) return inner;
  return applyAbilityComposition(card, trigger, segForCompose, inner, function (c, t, raw, o) {
    return classifyCardAbility(c, t, raw, o);
  });
}

function _classifyCardAbilityCore(card, trigger, segmentRawOverride) {
  /** @type {ClassifiedAbility} */
  var base = {
    trigger: "none",
    template: "none",
    optional: false,
    filters: parseAbilityPickFilters(""),
    deckTopCount: null,
    handDiscardToWaiting: null,
    deckDrawCount: null,
    requiresOnStage: false,
    requiresInWaiting: false,
  };
  if (!card) return base;

  var raw = cardAbilityRawText(card);
  /** @type {Set<string>} */
  var keys;
  /** @type {string} */
  var p;
  /** @type {string} */
  var segRaw;
  if (trigger) {
    if (segmentRawOverride != null && String(segmentRawOverride) !== "") {
      segRaw = String(segmentRawOverride);
    } else {
      segRaw = abilityRawSegmentForTrigger(card, trigger);
    }
    if (!segRaw) {
      base.trigger = /** @type {AbilityTrigger} */ (trigger);
      return base;
    }
    p = segmentPlainText(segRaw);
    keys = new Set();
    var reSeg = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;
    var mSeg;
    while ((mSeg = reSeg.exec(segRaw)) !== null) {
      var sk1 = wikiAbilityStemToCanonical(mSeg[1]);
      var sk2 = mSeg[2] != null && String(mSeg[2]).trim() !== "" ? wikiAbilityStemToCanonical(mSeg[2]) : null;
      if (sk1) keys.add(sk1);
      if (sk2) keys.add(sk2);
    }
    keys.add(trigger);
  } else {
    segRaw = raw;
    p = abilityPlainText(card);
    keys = abilityWikiKeys(card);
  }
  base.optional = /もよい/.test(segRaw);
  base.filters = parseAbilityPickFilters(p);
  if (trigger === "live_start" || trigger === "live_success") {
    base.filters = mergeAbilityPickFilters(base.filters, parseConditionalPrefixFilters(p));
  }

  var perTurn = parsePerTurnLimit(segRaw, keys);
  base.perTurnLimit = perTurn;
  /**
   * 条件・コストは「：」より前の部分だけ。
   * 「：」を含まない場合、全てが効果本文なのでコストは空。
   */
  var costPart = p.indexOf("：") >= 0 ? p.split("：")[0] : "";
  base.hasOptionalCost = /もよい/.test(costPart);
  base.costEnergy = /(エネルギー|E)を?(\d+)?枚?支払/.test(costPart) || /E支払/.test(costPart);
  base.costEnergyCount = base.costEnergy ? parseCostEnergyCount(costPart) : 0;
  base.costSelfWait =
    /このメンバーをウェイト/.test(costPart) ||
    /メンバーをウェイトにし/.test(costPart) ||
    /メンバーをウェイトにする/.test(costPart);
  base.costPickMemberWait =
    /メンバー.*ウェイトにしてもよい/.test(costPart) && !base.costSelfWait;
  base.costMandatoryWaitOtherMember =
    !base.costSelfWait &&
    !base.costPickMemberWait &&
    /このメンバー以外/.test(costPart) &&
    /メンバー.*ウェイトにする/.test(costPart) &&
    !/してもよい/.test(costPart);
  if (base.costMandatoryWaitOtherMember) {
    base.costWaitOtherMemberFilters = Object.assign(parseAbilityPickFilters(costPart), {
      pickType: parseAbilityPickFilters(costPart).pickType || T_MEMBER,
    });
  }
  base.costOrAlt =
    /ウェイトにするか/.test(costPart) ||
    (/手札.*控え室/.test(costPart) && /か/.test(costPart) && base.costSelfWait);
  base.handDiscardToWaiting = (function () {
    var m = costPart.match(/手札を(\d+)枚控え室に置/);
    if (m) return Number(m[1]) || null;
    if (/手札を1枚控え室に置/.test(costPart)) return 1;
    return null;
  })();
  base.bladeGain = parseBladeGainCount(p);
  if (bladeGainFromIcons(segRaw, p) > base.bladeGain) {
    base.bladeGain = bladeGainFromIcons(segRaw, p);
  }
  applyOptionalEnergyCostFromSegment(base, segRaw);

  function withTrigger(trig, patch) {
    return Object.assign({}, base, patch, { trigger: trig });
  }

  /** トリガー絞り込み時は、必ずそのトリガー用ブランチに分岐させる。 */
  var enterKidou =
    trigger === "kidou" ||
    (!trigger && (keys.has("kidou") || p.includes("起動")));
  var enterToujyou =
    trigger === "toujyou" ||
    (!trigger && (keys.has("toujyou") || p.includes("登場時") || /登場/.test(raw)));
  var enterLiveSuccess =
    trigger === "live_success" ||
    (!trigger && (keys.has("live_success") || p.includes("ライブ成功時")));
  var enterLiveStart =
    trigger === "live_start" ||
    (!trigger && (keys.has("live_start") || p.includes("ライブ開始時")));
  var enterJouji = trigger === "jouji" || (!trigger && (keys.has("jouji") || p.includes("常時")));
  var enterJidou = trigger === "jidou" || (!trigger && (keys.has("jidou") || p.includes("自動")));

  if (enterKidou) {
    function kidouT(obj) {
      return withTrigger("kidou", Object.assign({ requiresOnStage: true }, obj));
    }

    if (!segmentRawOverride && trigger === "kidou") {
      var kidouSegsOnly = splitAbilityByTriggers(cardAbilityRawText(card)).filter(function (s) {
        return s.trigger === "kidou";
      });
      if (kidouSegsOnly.length > 1) {
        return kidouT({
          template: "kidou_multi_choice",
          abilityChoices: kidouSegsOnly.map(function (s) {
            var pl = segmentPlainText(s.text);
            return pl.length > 96 ? pl.slice(0, 96) + "…" : pl;
          }),
          kidouSegmentRaws: kidouSegsOnly.map(function (s) {
            return s.text;
          }),
          perTurnLimit: perTurn,
        });
      }
    }

    var optSelfWaitKd = classifyOptionalSelfWaitEffect(p, base);
    if (optSelfWaitKd) return kidouT(optSelfWaitKd);

    var payPickKd = classifyPayEnergyPickOne(card, "kidou");
    if (payPickKd) {
      return kidouT(payPickKd);
    }

    if (/エネルギーを1枚アクティブにする/.test(p) && /ウェイトにするか/.test(p) && /手札.*控え室/.test(p)) {
      return kidouT({
        template: "kidou_wait_or_hand_for_energy",
        costOrAlt: true,
        costSelfWait: true,
        handDiscardToWaiting: 1,
        perTurnLimit: perTurn || 1,
      });
    }

    if (/公開されるまで/.test(p) && /デッキの一番上/.test(p) && /ライブカードか.*メンバー/.test(p)) {
      var minMemReveal = p.match(/コスト(\d+)以上のメンバー/);
      return kidouT({
        template: "deck_reveal_until_pick",
        costSelfWait: true,
        handDiscardToWaiting: 1,
        revealMinMemberCost: minMemReveal ? Number(minMemReveal[1]) : 10,
        perTurnLimit: perTurn || 1,
      });
    }

    if (
      /ステージから控え室に置/.test(p) &&
      /手札から/.test(p) &&
      /登場させる/.test(p) &&
      /エネルギー.*下に置/.test(p)
    ) {
      var enterCostM = p.match(/コスト(\d+)以下/);
      return kidouT({
        template: "kidou_self_wait_hand_enter_energy",
        costSelfWait: false,
        filters: Object.assign(parseAbilityPickFilters(p), {
          pickType: T_MEMBER,
          maxCost: enterCostM ? Number(enterCostM[1]) : 13,
        }),
      });
    }

    if (/ステージから控え室/.test(p) && /相手.*ステージ.*ウェイト/.test(p) && !/控え室から/.test(p) && !/手札/.test(p)) {
      var oppWaitCost = p.match(/コスト(\d+)以下/);
      return kidouT({
        template: "kidou_self_to_wait_opp_wait",
        oppWaitMaxCost: oppWaitCost ? Number(oppWaitCost[1]) : 4,
        costSelfWait: false,
      });
    }

    if (/手札の「/.test(p) && /公開/.test(p) && /下に置/.test(p) && !/控え室に置/.test(p.split("：")[1] || p)) {
      return kidouT({
        template: "kidou_hand_reveal_to_under",
        filters: Object.assign(parseAbilityPickFilters(p), {
          pickType: T_MEMBER,
        }),
        perTurnLimit: perTurn || 1,
      });
    }

    if (/手札.*控え室/.test(p) && /控え室.*ライブカード/.test(p) && /スコアに等しい.*支払/.test(p)) {
      return kidouT({
        template: "kidou_hand_discard_wait_live_score_pay",
        handDiscardToWaiting: 1,
        perTurnLimit: perTurn || 1,
      });
    }

    if (/控え室に.*「/.test(p) && /シャッフル.*デッキの一番下/.test(p) && /エネルギー.*アクティブ/.test(p)) {
      var actEnPick = p.match(/エネルギーを(\d+)枚までアクティブ/);
      var waitPickN = p.match(/合計(\d+)枚/);
      return kidouT({
        template: "kidou_wait_shuffle_deck_bottom_activate",
        characterNames: parseQuotedCharacterNames(p),
        waitPickCount: waitPickN ? Number(waitPickN[1]) : 6,
        energyActiveCount: actEnPick ? Number(actEnPick[1]) : 6,
        perTurnLimit: perTurn || 1,
      });
    }

    if (
      /このメンバー以外/.test(p) &&
      /ステージから控え室に置/.test(p) &&
      /控え室から/.test(p) &&
      /コストに2を足した/.test(p) &&
      /登場させる/.test(p)
    ) {
      return kidouT({
        template: "kidou_self_wait_stage_member_swap_recover",
        filters: parseAbilityPickFilters(p),
        requiresSeriesOnStage: false,
        costSelfWait: true,
        handDiscardToWaiting: 1,
      });
    }
    if (/ステージから控え室に置/.test(p) && /控え室から/.test(p) && /登場させる/.test(p)) {
      return kidouT({
        template: "kidou_self_to_wait_recover",
        filters: parseAbilityPickFilters(p),
        requiresSeriesOnStage: false,
      });
    }

    if (/メンバー1人をウェイトにする/.test(p) && /ウェイト状態になったメンバー/.test(p) && /ライブ終了時まで/.test(p)) {
      return kidouT({
        template: "kidou_wait_member_grant_jouji",
        costPickMemberWait: true,
        perTurnLimit: perTurn || 1,
      });
    }

    if (/ポジションチェンジ/.test(p) || (/エリア.*選ぶ/.test(p) && /メンバーをそのエリアに移動/.test(p))) {
      return kidouT(
        Object.assign({ template: "live_start_position_change" }, parsePositionChangeMeta(p, segRaw)),
      );
    }

    if (textHasHeartColorPickGrant(p)) {
      return kidouT({
        template: "heart_color_pick_grant",
        costSelfWait: base.costSelfWait,
        heartPickSlots: parseHeartColorPickSlots(p, segRaw),
        heartPerSuccessLive: textHasHeartPerSuccessLiveGrant(p),
      });
    }

    if (/手札にあるメンバーカードを好きな枚数公開/.test(p) && /コストの合計が/.test(p)) {
      return kidouT({
        template: "kidou_reveal_hand_cost_threshold",
        costThresholds: [10, 20, 30, 40, 50],
        perTurnLimit: perTurn || 1,
      });
    }

    var kidouGrantInteractive = classifyConditionalGrantJoujiInteractive(p, segRaw, "kidou");
    if (kidouGrantInteractive) return kidouT(kidouGrantInteractive);

    if (/ライブ終了時まで/.test(p + segRaw)) {
      var grantBladeKd = bladeGainFromIcons(segRaw, p);
      var grantScoreKd = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      if (grantBladeKd > 0 || grantScoreKd > 0 || /を得る/.test(p)) {
        return kidouT(
          enrichGrantJoujiPatch(p, segRaw, {
            template: "grant_jouji_session",
            bladeGain: grantBladeKd,
            liveScoreGrant: grantScoreKd,
          }),
        );
      }
    }

    if (/以下から1つを選ぶ/.test(p)) {
      var kdChoices = parseAbilityBulletChoices(segRaw);
      return kidouT({
        template: "ability_pick_one",
        abilityChoices: kdChoices.length ? kdChoices : parseAbilityBulletChoices(p),
        choiceMin: 1,
        choiceMax: 1,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (/控え室にある場合のみ起動/.test(p) && /控え室からステージに登場/.test(p)) {
      return kidouT({
        template: "kidou_wait_to_stage",
        requiresOnStage: false,
        requiresInWaiting: true,
        handDiscardToWaiting: /手札を(\d+)枚控え室に置/.test(p)
          ? Number(p.match(/手札を(\d+)枚控え室に置/)[1])
          : /手札を1枚控え室に置/.test(p)
            ? 1
            : null,
        deckTopCount: parseDeckTopCount(p),
      });
    }

    if (/ステージから控え室/.test(p) && /手札に加/.test(p)) {
      var actEnStgWait = p.match(/エネルギーを(\d+)枚アクティブにする/);
      return kidouT({
        template: "kidou_stage_wait_pick_hand",
        filters: parseAbilityPickFilters(p),
        energyActiveCount: actEnStgWait ? Number(actEnStgWait[1]) || 1 : undefined,
      });
    }

    if (
      /手札.*控え室に置/.test(p) &&
      /控え室に置いたカードが/.test(p) &&
      /デッキの上からカードを(\d+)枚見る/.test(p) &&
      /カードを(\d+)枚手札に加/.test(p)
    ) {
      var hdMus = p.match(/手札を(\d+)枚控え室に置/);
      var lkMus = p.match(/デッキの上からカードを(\d+)枚見る/);
      var pkMus = p.match(/カードを(\d+)枚手札に加/);
      var tagMus = p.match(/控え室に置いたカードが『([^』]+)』/);
      return kidouT({
        template: "kidou_hand_discard_series_branch",
        handDiscardToWaiting: hdMus ? Number(hdMus[1]) : 1,
        deckTopCount: lkMus ? Number(lkMus[1]) : 4,
        deckPickCount: pkMus ? Number(pkMus[1]) : 2,
        branchSeriesTag: tagMus ? tagMus[1] : "μ's",
        filters: { pickType: T_LIVE },
      });
    }

    if (
      /手札.*控え室に置/.test(p) &&
      /ウェイト状態のメンバー.*アクティブ/.test(p) &&
      /相手のステージにいるメンバーをアクティブにした場合/.test(p)
    ) {
      var hdKir = p.match(/手札を(\d+)枚控え室に置/);
      return kidouT({
        template: "kidou_hand_discard_activate_wait_opp_bonus",
        handDiscardToWaiting: hdKir ? Number(hdKir[1]) : 1,
        filters: Object.assign(parseAbilityPickFilters(p), { pickType: T_LIVE }),
      });
    }

    if (/手札.*控え室に置/.test(p) && /控え室から/.test(p) && /手札に加/.test(p)) {
      var hd = p.match(/手札を(\d+)枚控え室に置/);
      return kidouT({
        template: "kidou_hand_cost_wait_pick_hand",
        handDiscardToWaiting: hd ? Number(hd[1]) : 1,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (/手札の/.test(p) && /控え室に置/.test(p) && (/能力.*発動/.test(p + segRaw) || /登場.*発動/.test(p + segRaw))) {
      var hdLi = p.match(/手札を(\d+)枚控え室に置|手札の.*1枚控え室/);
      return kidouT({
        template: "kidou_hand_discard_trigger_ability",
        handDiscardToWaiting: 1,
        filters: parseAbilityPickFilters(p),
        perTurnLimit: perTurn || 1,
      });
    }

    if (/手札を(\d+)枚控え室に置/.test(p) && /エネルギー1枚か/.test(p) && /アクティブにする/.test(p)) {
      return kidouT({
        template: "kidou_energy_or_activate_member",
        handDiscardToWaiting: 1,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (/エネルギー(\d+)枚をエネルギーデッキに置/.test(p) && /控え室.*ライブカード.*手札/.test(p)) {
      var enRet = p.match(/エネルギー(\d+)枚をエネルギーデッキ/);
      return kidouT({
        template: "kidou_energy_deck_pick_live",
        costEnergyCount: enRet ? Number(enRet[1]) : 2,
        filters: Object.assign(parseAbilityPickFilters(p), { pickType: T_LIVE }),
      });
    }

    if (/控え室から/.test(p) && /手札に加/.test(p)) {
      return kidouT({
        template: "kidou_wait_pick_hand",
        filters: parseAbilityPickFilters(p),
      });
    }

    var actEnKd = p.match(/エネルギーを(\d+)枚アクティブにする/);
    if (actEnKd) {
      return kidouT({
        template: "activate_energy",
        energyActiveCount: Number(actEnKd[1]) || 1,
        filters: parseAbilityPickFilters(p),
        requiresSeriesOnStage: parseRequiresSeriesOnStage(p),
      });
    }

    var edWaitKd = p.match(/エネルギーデッキから.*エネルギーカードを(\d+)枚ウェイト/);
    if (edWaitKd) {
      return kidouT({
        template: "energy_deck_to_wait",
        energyWaitCount: Number(edWaitKd[1]) || 1,
      });
    }

    var edActiveKd = p.match(/エネルギーデッキから.*エネルギーカードを(\d+)枚アクティブ/);
    if (edActiveKd) {
      return kidouT({
        template: "energy_deck_to_active",
        energyActiveCount: Number(edActiveKd[1]) || 1,
      });
    }

    var drawDiscardKd = p.match(/カードを(\d+)枚引き?、手札を(\d+)枚控え室に置/);
    if (!drawDiscardKd) drawDiscardKd = p.match(/カードを(\d+)枚引.*手札を(\d+)枚控え室/);
    if (drawDiscardKd) {
      /** @type {Partial<ClassifiedAbility>} */
      var drawDiscardPatch = {
        template: "draw_then_hand_discard",
        deckDrawCount: Number(drawDiscardKd[1]) || 1,
        effectDiscardCount: Number(drawDiscardKd[2]) || 1,
        filters: parseAbilityPickFilters(p),
      };
      if (
        /控え室に置いたカードの中にブレードハートを持たない/.test(p) &&
        /このメンバーをアクティブ/.test(p)
      ) {
        drawDiscardPatch.postDiscardActivateIfNonBhMember = true;
        if (/2枚ある場合/.test(p)) {
          drawDiscardPatch.postDiscardBladeGainIfNonBhAt = 2;
          drawDiscardPatch.postDiscardBladeGainCount = 2;
        }
      }
      return kidouT(drawDiscardPatch);
    }

    var kidouEffectPart = p.indexOf("：") >= 0 ? p.slice(p.indexOf("：") + 1) : p;
    var drawOnlyKd = kidouEffectPart.match(/カードを(\d+)枚引/);
    if (
      drawOnlyKd &&
      !/控え室から/.test(kidouEffectPart) &&
      !/手札.*控え室に置/.test(kidouEffectPart)
    ) {
      return kidouT({
        template: "draw_from_deck",
        deckDrawCount: Number(drawOnlyKd[1]) || 1,
        filters: parseAbilityPickFilters(p),
      });
    }

    var lookReorderKd = parseDeckTopCount(p);
    if (lookReorderKd != null && /見る/.test(p) && /デッキの上に置/.test(p)) {
      return kidouT({
        template: "deck_top_look_reorder",
        deckTopCount: lookReorderKd,
      });
    }

    var topPickKd = parseDeckTopCount(p);
    if (topPickKd != null && /手札に加/.test(p) && /公開/.test(p)) {
      return kidouT({
        template: "deck_top_pick_recover",
        deckTopCount: topPickKd,
        filters: parseAbilityPickFilters(p),
      });
    }

    var dk = parseDeckTopCount(p);
    if (dk != null && p.includes("控え室")) {
      return kidouT({
        template: "deck_top_to_waiting",
        deckTopCount: dk,
      });
    }

    if (/このメンバーをウェイトにする/.test(p) && /ほかのメンバー1人をアクティブ/.test(p)) {
      return kidouT({
        template: "kidou_self_wait_activate_other",
        costSelfWait: true,
      });
    }

    if (/控え室からコスト(\d+)以下.*メンバーのいないエリアに登場/.test(p)) {
      var ke = p.match(/コスト(\d+)以下/);
      return kidouT({
        template: "kidou_waiting_to_empty_stage",
        requiresOnStage: true,
        requiresInWaiting: false,
        filters: Object.assign(parseAbilityPickFilters(p), {
          maxCost: ke ? Number(ke[1]) : 2,
          pickType: T_MEMBER,
        }),
      });
    }

    if (/デッキの一番上のカードを公開し、手札に加える/.test(p) && /ブレードハートを持たない/.test(p)) {
      return kidouT({
        template: "deck_top_reveal_top_to_hand_score",
        liveScoreGrant: 1,
      });
    }

    var stagePlusLook = p.match(/デッキの上から、自分のステージにいるメンバーの数に(\d+)を足した数/);
    if (stagePlusLook && /見る/.test(p)) {
      return kidouT({
        template: "deck_top_count_stage_plus",
        deckTopCountOffset: Number(stagePlusLook[1]) || 2,
      });
    }

    if (/自分と相手はそれぞれ.*エネルギーデッキから.*1枚ウェイト/.test(p)) {
      return kidouT({ template: "both_players_energy_deck_wait" });
    }

    if (
      /成功ライブカード置き場.*控え室に置いてもよい/.test(p) &&
      /控え室.*成功ライブカード置き場に置く/.test(p)
    ) {
      return kidouT({
        template: "success_live_waiting_swap",
        filters: parseAbilityPickFilters(p),
      });
    }

    if (base.bladeGain > 0 && !/手札|控え室|山札|見る|引|公開|以下から/.test(p)) {
      return kidouT({
        template: "blade_gain_only",
        bladeGain: base.bladeGain,
      });
    }

    if (/相手のステージ.*ウェイト/.test(p) && /グループ名1種類につき/.test(p + segRaw)) {
      var baseKidouE = countWikiEnergyIcons(segRaw) || base.costEnergyCount || 4;
      return kidouT({
        template: "kidou_opp_wait_group_discount_energy",
        costEnergy: true,
        costEnergyCount: baseKidouE,
        energyCostDiscountPerGroup: 1,
        filters: parseAbilityPickFilters(p),
      });
    }

    return kidouT({ template: "guided_manual", filters: parseAbilityPickFilters(p) });
  }

  if (enterToujyou) {
    var stageAreaMeta = (function () {
      var areas = parseStageAreaConstraints(segRaw);
      if (areas.length === 1) return { stageArea: areas[0] };
      if (areas.length > 1) return { stageAreas: areas };
      return {};
    })();
    function twT(obj) {
      return withTrigger("toujyou", Object.assign({}, stageAreaMeta, obj));
    }

    // 小泉花陽: 自ウェイト(任意コスト)→ドロー→バトンタッチ由来でなければ手札1控え
    if (
      /このメンバーをウェイトにしてもよい/.test(p) &&
      /カードを1枚引く/.test(p) &&
      /バトンタッチして登場していないかぎり/.test(p) &&
      /手札を1枚控え室に置く/.test(p)
    ) {
      var koizumiBatonM = p.match(/『([^』]+)』のメンバーからバトンタッチ/);
      return twT({
        template: "toujou_self_wait_draw_then_conditional_discard",
        deckDrawCount: 1,
        handDiscardToWaiting: 1,
        unlessBatonFromSeriesTag: koizumiBatonM ? koizumiBatonM[1] : null,
        optional: true,
        hasOptionalCost: true,
      });
    }

    // 若菜四季(pb1-008): ドロー→自分を別エリアへ移動（先客はスワップ）
    if (
      /カードを1枚引く/.test(p) &&
      /その後/.test(p) &&
      /登場したエリアとは別の自分のエリア/.test(p) &&
      /移動/.test(p)
    ) {
      return twT({
        template: "toujou_draw_then_position_change",
        deckDrawCount: 1,
      });
    }

    // 5枚見る→指定メンバー1枚を手札→残り控え→相手の低コスト低ブレードを一括ウェイト
    var deckPeekOppWaitTj = classifyDeckPeekPickThenOppWait(p, segRaw);
    if (deckPeekOppWaitTj) return twT(deckPeekOppWaitTj);

    // ドロー→条件付き追加ドロー（例: ステージに特定名がいる）
    var drawCondExtraTj = classifyDrawThenConditionalExtraDraw(p);
    if (drawCondExtraTj) return twT(drawCondExtraTj);

    var optSelfWaitTj = classifyOptionalSelfWaitEffect(p, base);
    if (optSelfWaitTj) return twT(optSelfWaitTj);
    var payPick = classifyPayEnergyPickOne(card, "toujyou");
    if (payPick) {
      return twT(Object.assign({ requiresOnStage: true }, payPick));
    }
    if (/ライブカードが公開されるまで/.test(p) && /デッキの一番上/.test(p) && /公開し続ける/.test(p)) {
      return twT({
        template: "deck_reveal_until_live",
        optional: /もよい/.test(p),
        hasOptionalCost: /手札.*控え室.*もよい/.test(p),
        handDiscardToWaiting: /手札を1枚控え室に置/.test(p) ? 1 : null,
        requiresOnStage: true,
      });
    }
    if (/5yncri5e!.*のみ/.test(p) && /センターエリア.*左サイド/.test(p)) {
      return twT({
        template: "toujou_rotate_stage_areas",
        requiredUnitOnStage: "5yncri5e!",
        requiresOnStage: true,
      });
    }
    if (/ステージから控え室に置いてもよい/.test(p) && /控え室から.*いたエリアに登場/.test(p)) {
      var exChar = p.match(/「([^」]+)」以外/);
      return twT({
        template: "toujou_optional_self_wait_recover",
        optional: true,
        hasOptionalCost: true,
        filters: Object.assign(parseAbilityPickFilters(p), { pickType: T_MEMBER, seriesTag: "Liella!" }),
        excludeCharacterName: exChar ? exChar[1] : null,
        requiresOnStage: true,
      });
    }
    if (/手札の.*好きな枚数.*控え室/.test(p) && /枚数に1を足した.*引/.test(p)) {
      return twT({
        template: "toujou_hand_discard_draw_plus",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/控え室から.*コストの合計.*以下/.test(p) && /枚までステージに登場/.test(p)) {
      var sumCostM = p.match(/合計が(\d+)以下/);
      var enterMaxM = p.match(/(\d+)枚まで/);
      return twT({
        template: "toujou_wait_enter_cost_sum",
        waitEnterMaxCostSum: sumCostM ? Number(sumCostM[1]) : 4,
        waitEnterMaxCount: enterMaxM ? Number(enterMaxM[1]) : 2,
        costEnergy: true,
        costEnergyCount: countWikiEnergyIcons(segRaw) || 4,
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/ステージにいるメンバー.*それぞれ好きなエリアに移動/.test(p) || /フォーメーションチェンジしてもよい/.test(p)) {
      return twT({
        template: "toujou_optional_all_members_relocate",
        formationChange: /フォーメーションチェンジ/.test(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/控え室.*カード1枚.*デッキの一番上/.test(p) && /もよい/.test(p)) {
      return twT({
        template: "toujou_optional_wait_to_deck_top",
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/エネルギー置き場.*エネルギー2枚.*下に置/.test(p)) {
      return twT({
        template: "toujou_optional_energy_under",
        energyUnderCount: 2,
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/このメンバーをウェイトにする/.test(p) && !/相手/.test(p) && !/ほかの/.test(p) && !/してもよい/.test(p)) {
      return twT({
        template: "toujou_self_wait_only",
        requiresOnStage: true,
      });
    }
    if (/バトンタッチして登場した場合/.test(p) && /控え室に置かれた/.test(p) && /このメンバーの下に置/.test(p)) {
      return twT({
        template: "toujou_baton_discarded_under",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/バトンタッチして登場した場合/.test(p) && /控え室に置かれた/.test(p) && /手札に加/.test(p)) {
      return twT({
        template: "toujou_baton_discarded_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/控え室/.test(p) && /選ぶ/.test(p) && (/能力.*発動/.test(p + segRaw) || /登場.*発動/.test(p + segRaw))) {
      return twT({
        template: "toujou_wait_pick_trigger_ability",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/控え室から/.test(p) && /このメンバーの下に置/.test(p)) {
      return twT({
        template: "toujou_wait_to_member_under",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/自分と相手は/.test(p) && /センター.*ポジションチェンジ/.test(p)) {
      return twT({
        template: "toujou_both_center_position_change",
        requiresOnStage: true,
      });
    }
    if (/相手は.*アクティブ状態のメンバー.*ウェイト/.test(p) && !/してもよい/.test(p)) {
      return twT({
        template: "toujou_opp_active_wait",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/メンバーを1人までアクティブ/.test(p) || /メンバーを1人アクティブ/.test(p)) {
      return twT({
        template: "activate_stage_members_up_to",
        activateMax: 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/ステージにいるメンバー1人か.*エネルギーを(\d+)枚アクティブ/.test(p)) {
      var touEnPick = p.match(/エネルギーを(\d+)枚アクティブ/);
      return twT({
        template: "toujou_pick_member_or_energy",
        activateMax: 1,
        energyActiveCount: touEnPick ? Number(touEnPick[1]) || 2 : 2,
        requiresOnStage: true,
      });
    }
    if (/手札を(\d+)枚まで控え室に置いてもよい/.test(p) && /置いた枚数分カードを引/.test(p)) {
      var mxHd = p.match(/手札を(\d+)枚まで/);
      return twT({
        template: "toujou_optional_hand_discard_draw",
        maxHandDiscard: mxHd ? Number(mxHd[1]) : 3,
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/ポジションチェンジ/.test(p) && (/してもよい/.test(p) || /してもよい/.test(String(segRaw || "")))) {
      return twT(
        Object.assign(
          {
            template: "live_start_position_change",
            optional: true,
            hasOptionalCost: true,
            requiresOnStage: true,
          },
          parsePositionChangeMeta(p, segRaw),
        ),
      );
    }
    if (
      parseStageAreaConstraint(segRaw) === "center" &&
      /『Liella!』.*バトンタッチ/.test(p) &&
      /カードを2枚引き/.test(p)
    ) {
      return twT({
        template: "toujou_liella_double_baton_center",
        requiresOnStage: true,
        stageArea: "center",
        filters: Object.assign(parseAbilityPickFilters(p), { seriesTag: "Liella!", maxCost: 4 }),
        deckDrawCount: 2,
      });
    }
    var deckTopMem = p.match(/デッキの上からカードを(\d+)枚控え室に置/);
    if (deckTopMem && /すべてメンバーカード/.test(p) && /カードを(\d+)枚引/.test(p)) {
      var drawIf = p.match(/カードを(\d+)枚引/);
      return twT({
        template: "toujou_deck_top_wait_if_all_members",
        deckTopCount: deckTopMem ? Number(deckTopMem[1]) : 3,
        deckDrawCount: drawIf ? Number(drawIf[1]) : 1,
        requiresOnStage: true,
      });
    }
    if (deckTopMem && /すべて.*heart04.*メンバー/.test(p)) {
      return twT({
        template: "toujou_deck_top_wait_if_all_heart",
        deckTopCount: deckTopMem ? Number(deckTopMem[1]) : 3,
        requiredHeartSlot: 4,
        requiresOnStage: true,
      });
    }
    if (deckTopMem && /すべて.*heart01.*メンバー/.test(p)) {
      return twT({
        template: "toujou_deck_top_wait_if_all_heart",
        deckTopCount: deckTopMem ? Number(deckTopMem[1]) : 3,
        requiredHeartSlot: 1,
        requiresOnStage: true,
      });
    }
    if (
      /自分と相手はそれぞれ/.test(p) &&
      /控え室からコスト(\d+)以下のメンバーカードを1枚/.test(p) &&
      /メンバーのいないエリア/.test(p) &&
      /ウェイト状態で登場/.test(p)
    ) {
      var pbCost = p.match(/コスト(\d+)以下/);
      return twT({
        template: "toujou_both_wait_to_empty_stage",
        filters: Object.assign(parseAbilityPickFilters(p), {
          maxCost: pbCost ? Number(pbCost[1]) : 2,
          pickType: T_MEMBER,
        }),
        requiresOnStage: true,
      });
    }
    if (/以下から1つを選ぶ/.test(p)) {
      var tChoices = parseAbilityBulletChoices(segRaw);
      return twT({
        template: "ability_pick_one",
        abilityChoices: tChoices.length ? tChoices : parseAbilityBulletChoices(p),
        choiceMin: 1,
        choiceMax: 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/ステージにいる.*すべてのメンバーをアクティブ|すべてのメンバーをアクティブ/.test(p)) {
      return twT({
        template: "live_start_activate_all_stage_members",
        requiresOnStage: true,
      });
    }
    if (/ステージにいるメンバーを1人までアクティブ/.test(p)) {
      return twT({ template: "activate_stage_members_up_to", activateMax: 1, requiresOnStage: true });
    }
    if (/成功ライブカード置き場に.*スコア.*持つ.*のカードが1枚/.test(p + segRaw) && /2枚以上/.test(p)) {
      return twT({
        template: "toujou_success_live_score_tiered",
        filters: Object.assign(parseAbilityPickFilters(p), { minSuccessLiveCount: 1, minScore: 1 }),
        stageArea: parseStageAreaConstraint(segRaw) || undefined,
        requiresOnStage: true,
      });
    }
    if (/成功ライブカード置き場にカードが1枚以上/.test(p) && /スコアの合計が１以下/.test(p)) {
      return twT({
        template: "toujou_success_live_low_score_grant",
        requiresOnStage: true,
      });
    }
    if (/カードを(\d+)枚引/.test(p) && /控え室から登場している場合/.test(p)) {
      var drawGr = p.match(/カードを(\d+)枚引/);
      return twT({
        template: "toujou_draw_grant_if_from_waiting",
        deckDrawCount: drawGr ? Number(drawGr[1]) : 2,
        requiresOnStage: true,
      });
    }
    if (/控え室にある.*カード名の異なるライブカードを2枚選ぶ/.test(p) && /相手は.*1枚を選ぶ/.test(p)) {
      return twT({
        template: "toujou_wait_pick_opp_live",
        requiresOnStage: true,
      });
    }
    if (/手札を2枚控え室に置いてもよい/.test(p) && /を持つメンバーカード1枚まで/.test(p) && /ライブカード1枚まで/.test(p)) {
      var heartSlotM = p.match(/heart_0?(\d)/i);
      return twT({
        template: "toujou_hand_discard_wait_heart_dual_pick",
        handDiscardToWaiting: 2,
        optional: true,
        hasOptionalCost: true,
        requiredHeartSlot: heartSlotM ? Number(heartSlotM[1]) : 3,
        requiresOnStage: true,
      });
    }
    if (/このメンバー以外の.*を持つメンバー1人/.test(p + segRaw) && /ライブ終了時まで/.test(p)) {
      var ghSlot = p.match(/heart_0?(\d)/i);
      return twT({
        template: "toujou_grant_heart_stage_member",
        requiredHeartSlot: ghSlot ? Number(ghSlot[1]) : 6,
        requiresOnStage: true,
      });
    }
    if (/のみの場合.*正面のエリアにポジションチェンジ/.test(p)) {
      var unitOnlyM = p.match(/『([^』]+)』のみ/);
      return twT({
        template: "toujou_opp_front_position_change",
        requiredUnitOnStage: unitOnlyM ? unitOnlyM[1] : "みらくらぱーく！",
        requiresOnStage: true,
      });
    }
    if (/BiBi.*ウェイトにしてもよい/.test(p) && /アクティブ状態のメンバー1人をウェイト/.test(p)) {
      return twT({
        template: "toujou_bibi_wait_opp_active_wait",
        optional: true,
        hasOptionalCost: true,
        filters: Object.assign(parseAbilityPickFilters(p), { seriesTag: "BiBi", pickType: T_MEMBER }),
        stageArea: parseStageAreaConstraint(segRaw) || "center",
        requiresOnStage: true,
      });
    }
    if (/バトンタッチして登場した場合/.test(p) && /ライブ終了時まで/.test(p) && /heart_0?(\d)/i.test(p + segRaw)) {
      var batHeart = p.match(/heart_0?(\d)/i);
      return twT({
        template: "toujou_baton_series_heart_grant",
        optional: true,
        hasOptionalCost: true,
        costEnergy: true,
        costEnergyCount: countWikiEnergyIcons(segRaw) || 1,
        requiredHeartSlot: batHeart ? Number(batHeart[1]) : 1,
        filters: parseAbilityPickFilters(p),
        requiresOnStage: true,
      });
    }
    if (/相手は手札からライブカードを1枚控え室に置いてもよい/.test(p) && /そうしなかった場合/.test(p)) {
      return twT({
        template: "toujou_opp_optional_live_discard_or_score",
        requiresOnStage: true,
      });
    }
    if (/効果によってはアクティブにならない/.test(p)) {
      return twT({
        template: "toujou_turn_block_effect_activate",
        requiresOnStage: true,
      });
    }
    if (/コスト10以上のメンバーがいる場合.*相手.*コスト4以下.*ウェイト/.test(p)) {
      return twT({
        template: "toujou_opp_wait_if_high_cost_on_stage",
        filters: Object.assign(parseAbilityPickFilters(p), { minCostMemberOnStage: 10 }),
        oppWaitMaxCost: 4,
        requiresOnStage: true,
      });
    }
    if (
      /持つハートに.*合計(\d+)つ以上/.test(p) &&
      /相手のライブカード置き場にあるライブカード1枚.*必要ハートが.*多くなる/.test(p)
    ) {
      var minSlotTotTj = p.match(/合計(\d+)つ以上/);
      var slotHeartTj = (p + segRaw).match(/heart_0?(\d)/i);
      return twT({
        template: "toujou_grant_opp_live_need_heart_if_stage_hearts",
        minStageHeartSlotTotal: minSlotTotTj ? Number(minSlotTotTj[1]) : 5,
        requiredHeartSlot: slotHeartTj ? Number(slotHeartTj[1]) : null,
        opponentLiveNeedHeartPlus: 1,
        requiresOnStage: true,
      });
    }
    if (
      /メインフェイズの場合/.test(p) &&
      /控え室からライブカード/.test(p) &&
      /ライブカード置き場/.test(p) &&
      /セットフェイズ.*上限が1枚減/.test(p)
    ) {
      return twT({
        template: "toujou_main_phase_live_from_waiting",
        optional: true,
        hasOptionalCost: true,
        costEnergy: true,
        costEnergyCount: countWikiEnergyIcons(segRaw) || 2,
        liveSetLimitPenalty: 1,
        requiresOnStage: true,
      });
    }
    var toujouGrantInteractive = classifyConditionalGrantJoujiInteractive(p, segRaw, "toujyou");
    if (toujouGrantInteractive) return twT(toujouGrantInteractive);

    if (/相手のステージにいる「/.test(p) && /以外のメンバー/.test(p) && /同じ色のハート/.test(p)) {
      var exclMia = p.match(/「([^」]+)」以外のメンバー/);
      return twT({
        template: "toujou_opp_stage_member_match_grant",
        excludeCharacterName: exclMia ? exclMia[1] : null,
        bladeGain: bladeGainFromIcons(segRaw, p) || 1,
        requiresOnStage: true,
      });
    }
    if (/エマパンチ打つ？/.test(p)) {
      return twT({
        template: "toujou_opp_emma_punch_answer",
        optional: true,
        bladeGain: bladeGainFromIcons(segRaw, p) || 1,
        requiresConditionConfirm: true,
        requiresOnStage: true,
      });
    }

    if (/ライブ終了時まで/.test(p + segRaw) && /を得る/.test(p)) {
      var grantScoreTj = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      var grantBladeTj = bladeGainFromIcons(segRaw, p);
      if (/常時/.test(segRaw) || grantScoreTj > 0 || grantBladeTj > 0) {
        return twT(
          enrichGrantJoujiPatch(p, segRaw, {
            template: "grant_jouji_session",
            liveScoreGrant: grantScoreTj || (grantBladeTj > 0 ? 0 : 1),
            bladeGain: grantBladeTj,
            requiresOnStage: true,
          }),
        );
      }
    }
    if (textHasHeartColorPickGrant(p)) {
      return twT({
        template: "heart_color_pick_grant",
        requiresOnStage: true,
        heartPickSlots: parseHeartColorPickSlots(p, segRaw),
        heartPerSuccessLive: textHasHeartPerSuccessLiveGrant(p),
      });
    }
    var actEn = p.match(/エネルギーを(\d+)枚アクティブにする/);
    if (actEn) {
      return twT({
        template: "activate_energy",
        energyActiveCount: Number(actEn[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var edActive = p.match(/エネルギーデッキから.*エネルギーカードを(\d+)枚アクティブ/);
    if (edActive) {
      return twT({
        template: "energy_deck_to_active",
        energyActiveCount: Number(edActive[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var edWait = p.match(/エネルギーデッキから.*エネルギーカードを(\d+)枚ウェイト/);
    if (edWait) {
      /** @type {Partial<ClassifiedAbility>} */
      var edWaitPatch = {
        template: "energy_deck_to_wait",
        energyWaitCount: Number(edWait[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      };
      var batonSeriesM = p.match(/『([^』]+)』のメンバーからバトンタッチ/);
      if (batonSeriesM) edWaitPatch.requiresBatonFromSeriesTag = batonSeriesM[1];
      return twT(edWaitPatch);
    }
    var drawPerMem = p.match(/ステージにいるメンバー1人につき.*カードを(\d+)枚引/);
    if (drawPerMem) {
      var discPer = p.match(/手札を(\d+)枚控え室に置/);
      return twT({
        template: "draw_per_stage_member_discard",
        deckDrawCount: Number(drawPerMem[1]) || 1,
        effectDiscardCount: discPer ? Number(discPer[1]) : 0,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var drawUntil = p.match(/手札が(\d+)枚になるまでカードを引/);
    if (drawUntil) {
      return twT({
        template: "draw_until_hand_size",
        targetHandSize: Number(drawUntil[1]) || 5,
        requiresOnStage: true,
      });
    }
    var handStage = p.match(/手札からコスト(\d+)以下の[^手札]*メンバーカードを1枚ステージに登場/);
    if (!handStage) handStage = p.match(/手札からコスト(\d+)以下の「[^」]+」のメンバーカードを1枚ステージに登場/);
    if (handStage) {
      return twT({
        template: "toujou_hand_stage_enter",
        requiresOnStage: true,
        filters: Object.assign(parseAbilityPickFilters(p), { maxCost: Number(handStage[1]) || 4 }),
      });
    }
    if (/控え室からライブカードを1枚までデッキの一番下に置く/.test(p)) {
      return twT({
        template: "waiting_to_deck_bottom",
        filters: Object.assign(parseAbilityPickFilters(p), { pickType: T_LIVE }),
        requiresOnStage: true,
      });
    }
    if (
      (/このメンバーよりコストが低いメンバーからバトンタッチ/.test(p) ||
        /コストが低いメンバーからバトンタッチ/.test(p)) &&
      /自分と相手はそれぞれ/.test(p) &&
      /手札の枚数が(\d+)枚になるまで手札を控え室に置/.test(p) &&
      /カードを(\d+)枚引/.test(p)
    ) {
      var batonHandTargetM = p.match(/手札の枚数が(\d+)枚になるまで/);
      var batonDrawM = p.match(/カードを(\d+)枚引/);
      return twT({
        template: "toujou_baton_both_trim_hand_draw",
        targetHandSize: Number(batonHandTargetM && batonHandTargetM[1]) || 3,
        deckDrawCount: Number(batonDrawM && batonDrawM[1]) || 3,
        requiresOnStage: true,
      });
    }
    var drawDeckBottomM = p.match(/カードを(\d+)枚引き?、手札を(\d+)枚デッキの一番下に置/);
    if (!drawDeckBottomM) drawDeckBottomM = p.match(/カードを(\d+)枚引.*手札を(\d+)枚デッキの一番下/);
    if (drawDeckBottomM) {
      return twT({
        template: "draw_then_hand_to_deck_bottom",
        deckDrawCount: Number(drawDeckBottomM[1]) || 1,
        effectDiscardCount: Number(drawDeckBottomM[2]) || 1,
        requiresOnStage: true,
      });
    }
    var drawDiscardM = p.match(/カードを(\d+)枚引き?、手札を(\d+)枚控え室に置/);
    if (!drawDiscardM) drawDiscardM = p.match(/カードを(\d+)枚引.*手札を(\d+)枚控え室/);
    if (drawDiscardM) {
      return twT({
        template: "draw_then_hand_discard",
        deckDrawCount: Number(drawDiscardM[1]) || 1,
        effectDiscardCount: Number(drawDiscardM[2]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var lookReorderN = parseDeckTopCount(p);
    if (
      lookReorderN != null &&
      /見る/.test(p) &&
      /デッキの上に置/.test(p) &&
      !/手札に加/.test(p) &&
      /好きな/.test(p)
    ) {
      return twT({
        template: "deck_top_look_reorder",
        deckTopCount: lookReorderN,
        requiresOnStage: true,
      });
    }
    if (base.bladeGain > 0 && !/手札|控え室|山札|見る|引|公開|成功ライブ|以下から/.test(p)) {
      return twT({
        template: "blade_gain_only",
        bladeGain: base.bladeGain,
        requiresOnStage: true,
      });
    }
    var topPick = parseDeckTopCount(p);
    if (topPick != null && /能力を持たない/.test(p) && /能力を持つ/.test(p)) {
      return twT({
        template: "deck_top_pick_no_ability_or_jouji",
        deckTopCount: topPick,
        requiresOnStage: true,
        filters: Object.assign(parseAbilityPickFilters(p), { acceptNoAbilityOrNativeJouji: true }),
      });
    }
    if (topPick != null && /手札に加/.test(p) && /公開/.test(p)) {
      var pickFilters = parseAbilityPickFilters(p);
      var heartAny = parseHeartSlotsAnyFromText(p, segRaw);
      if (heartAny.length) pickFilters.heartSlotsAny = heartAny;
      var maxPickM = p.match(/(\d+)枚まで公開して手札に加/);
      /** @type {Partial<ClassifiedAbility>} */
      var deckPickPatch = {
        template: "deck_top_pick_recover",
        deckTopCount: topPick,
        requiresOnStage: true,
        filters: pickFilters,
      };
      if (maxPickM) deckPickPatch.deckTopPickMax = Number(maxPickM[1]) || 1;
      return twT(deckPickPatch);
    }
    var drawM = p.match(/カードを(\d+)枚引/);
    if (!drawM) drawM = p.match(/デッキから(?:カードを)?(\d+)枚.*手札/);
    if (
      drawM &&
      !p.includes("控え室から") &&
      !p.includes("山札の上からカードを") &&
      !/手札を\d+枚控え室/.test(p)
    ) {
      return twT({
        template: "draw_from_deck",
        deckDrawCount: Number(drawM[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (
      (/成功ライブ/.test(p) && /手札に加/.test(p)) ||
      (/手札.*公開/.test(p) && /成功ライブ/.test(p))
    ) {
      return twT({
        template: "toujou_success_live_pick_hand",
        requiresOnStage: true,
      });
    }
    if (/自分と相手はそれぞれ、自身の控え室からライブカードを1枚手札に加える/.test(p)) {
      return twT({
        template: "toujou_both_wait_pick_live_hand",
        requiresOnStage: true,
        filters: Object.assign(parseAbilityPickFilters(p), { pickType: T_LIVE }),
      });
    }
    if (/控え室から/.test(p) && /手札に加/.test(p)) {
      return twT({
        template: "toujou_wait_pick_hand",
        requiresOnStage: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }
    if (
      /のメンバー1人をウェイトにしてもよい/.test(p) &&
      /相手.{0,20}.*ウェイト/.test(p) &&
      /元々持つ/.test(p) &&
      /2つ以上少ない/.test(p)
    ) {
      var heartGapTj = /元々持つ/.test(p) && !/ブレード/.test(p);
      return twT({
        template: "optional_pick_member_wait_opp_blade_gap",
        oppBladeGapMin: heartGapTj ? undefined : 2,
        oppPrintedHeartGapMin: heartGapTj ? 2 : undefined,
        filters: parseAbilityPickFilters(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/相手のステージ/.test(p) && /ウェイト/.test(p)) {
      var oppCostM = p.match(/コスト(\d+)以下/);
      var oppCntM2 = p.match(/(\d+)人までウェイト/);
      var bladeMaxTj = parseOppWaitPrintedBladeLimit(p);
      return twT({
        template: "optional_self_wait_opp_stage",
        oppWaitMaxCost: oppCostM ? Number(oppCostM[1]) : bladeMaxTj != null ? 99 : 4,
        oppWaitMaxPrintedBlade: bladeMaxTj != null ? bladeMaxTj : undefined,
        oppWaitCount: oppCntM2 ? Number(oppCntM2[1]) : 1,
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
        handDiscardToWaiting: /手札を1枚控え室に置/.test(p) ? 1 : null,
        requiresOnStage: true,
      });
    }
    var td = parseDeckTopCount(p);
    if (td != null && p.includes("控え室")) {
      return twT({
        template: "deck_top_to_waiting",
        deckTopCount: td,
        requiresOnStage: true,
      });
    }
    var stagePlusTj = p.match(/デッキの上から、自分のステージにいるメンバーの数に(\d+)を足した数/);
    if (stagePlusTj && /見る/.test(p)) {
      return twT({
        template: "deck_top_count_stage_plus",
        deckTopCountOffset: Number(stagePlusTj[1]) || 2,
        requiresOnStage: true,
      });
    }
    if (/自分と相手はそれぞれ.*エネルギーデッキから.*1枚ウェイト/.test(p)) {
      return twT({ template: "both_players_energy_deck_wait", requiresOnStage: true });
    }
    if (
      /成功ライブカード置き場.*控え室に置いてもよい/.test(p) &&
      /控え室.*成功ライブカード置き場に置く/.test(p)
    ) {
      return twT({
        template: "success_live_waiting_swap",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/控え室からコスト(\d+)以下.*メンバーのいないエリアに登場/.test(p)) {
      var keTj = p.match(/コスト(\d+)以下/);
      return twT({
        template: "kidou_waiting_to_empty_stage",
        requiresOnStage: true,
        filters: Object.assign(parseAbilityPickFilters(p), {
          maxCost: keTj ? Number(keTj[1]) : 2,
          pickType: T_MEMBER,
        }),
      });
    }
    if (/手札.*控え室.*ライブの合計スコアに(\d+)を足した数/.test(p) && /見る/.test(p)) {
      var lspT = p.match(/ライブの合計スコアに(\d+)を足した数/);
      return twT({
        template: "deck_top_count_live_score_plus",
        deckTopCountOffset: lspT ? Number(lspT[1]) : 2,
        handDiscardToWaiting: /手札を1枚控え室/.test(p) ? 1 : null,
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
        requiresOnStage: true,
      });
    }
    if (/控え室からカードを1枚までデッキの一番上に置/.test(p)) {
      return twT({ template: "waiting_reorder_deck_top", deckTopPickMax: 1, requiresOnStage: true });
    }
    if (/エールにより公開された自分のカードの中から.*手札に加/.test(p)) {
      return twT({
        template: "yell_resolution_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
        handDiscardToWaiting: /手札.*控え室/.test(p) ? 1 : null,
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
      });
    }
    if (topPick != null && /能力を持たない/.test(p) && /能力を持つ/.test(p)) {
      return twT({
        template: "deck_top_pick_no_ability_or_jouji",
        deckTopCount: topPick,
        requiresOnStage: true,
        filters: Object.assign(parseAbilityPickFilters(p), { acceptNoAbilityOrNativeJouji: true }),
      });
    }
    return twT({ template: "guided_manual", requiresOnStage: true });
  }

  if (enterLiveSuccess) {
    var pLs = normalizeFwDigits(p);

    if (
      /自分のステージに/.test(pLs) &&
      /ライブ開始時.*能力を持つメンバーがいる場合/.test(p + String(segRaw || "")) &&
      /このカードのスコアを/.test(pLs)
    ) {
      return withTrigger("live_success", {
        template: "live_success_score_if_stage_live_start_member",
        cardScoreGrant: parseLiveCardScorePlusFromText(pLs) || 1,
        requiresOnStage: true,
      });
    }

    // JIMO-AI Dash!: 系統メンバー1人につき1ドロー→引いた枚数だけ手札を控え
    if (
      /『([^』]+)』のメンバー1人につき.*カードを1枚引く/.test(p) &&
      /その後/.test(p) &&
      /これにより引いた枚数と同じ枚数を手札から控え室に置く/.test(p)
    ) {
      var jimoSeriesM = p.match(/『([^』]+)』のメンバー1人につき/);
      return withTrigger("live_success", {
        template: "live_success_draw_per_series_then_discard_same",
        drawPerSeriesTag: jimoSeriesM ? jimoSeriesM[1] : null,
        requiresOnStage: true,
      });
    }

    // ドロー→条件付き追加ドロー（例: 成功ライブに『μ's』がある）
    var drawCondExtraLs = classifyDrawThenConditionalExtraDraw(p);
    if (drawCondExtraLs) return withTrigger("live_success", drawCondExtraLs);

    var optSelfWaitLsOk = classifyOptionalSelfWaitEffect(pLs, base);
    if (optSelfWaitLsOk) {
      return withTrigger("live_success", Object.assign({}, optSelfWaitLsOk));
    }
    if (/ウェイトにし.*次のターン.*アクティブフェイズにアクティブしない/.test(pLs)) {
      return withTrigger("live_success", {
        template: "live_success_wait_skip_next_activate",
        requiresOnStage: true,
      });
    }
    var charNames = parseQuotedCharacterNames(pLs);
    if (charNames.length >= 2 && /ステージに/.test(p) && /カードを(\d+)枚引/.test(p)) {
      var lsCharDraw = p.match(/カードを(\d+)枚引/);
      return withTrigger("live_success", {
        template: "live_success_characters_draw",
        characterNames: charNames,
        deckDrawCount: lsCharDraw ? Number(lsCharDraw[1]) : 1,
      });
    }
    if (/以下から1つを選ぶ/.test(p)) {
      var lsChoices = parseAbilityBulletChoices(segRaw);
      var boostM = p.match(/成功ライブカード置き場に『([^』]+)』のカードがある場合/);
      return withTrigger("live_success", {
        template: "live_success_pick_options",
        abilityChoices: lsChoices.length ? lsChoices : parseAbilityBulletChoices(p),
        choiceMin: 1,
        choiceMax: 1,
        choiceBoostSeriesTag: boostM ? boostM[1] : null,
        choiceBoostMin: boostM ? 1 : null,
        choiceBoostMax: boostM ? Math.max(1, lsChoices.length || 2) : null,
      });
    }
    if (/ライブ終了時まで/.test(p + segRaw) && /を得る/.test(p)) {
      var grantBladeLs = bladeGainFromIcons(segRaw, p);
      var grantScoreLs =
        parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      if (grantBladeLs > 0 || grantScoreLs > 0 || /常時/.test(segRaw)) {
        return withTrigger(
          "live_success",
          enrichGrantJoujiPatch(p, segRaw, {
            template: "grant_jouji_session",
            bladeGain: grantBladeLs,
            liveScoreGrant: grantScoreLs,
          }),
        );
      }
    }
    if (textHasHeartColorPickGrant(p)) {
      return withTrigger("live_success", {
        template: "heart_color_pick_grant",
        heartPickSlots: parseHeartColorPickSlots(p, segRaw),
        heartPerSuccessLive: textHasHeartPerSuccessLiveGrant(p),
      });
    }
    var lsComboSurplus = p.match(
      /自分が余剰ハートを([０-９\d]+)つ以上持っている場合[^。]*カードを(\d+)枚引[^。]*手札を(\d+)枚控え室/,
    );
    if (lsComboSurplus) {
      return withTrigger("live_success", {
        template: "draw_then_hand_discard",
        deckDrawCount: Number(lsComboSurplus[2]) || 1,
        effectDiscardCount: Number(lsComboSurplus[3]) || 1,
        minSurplusHearts: Number(normalizeFwDigits(lsComboSurplus[1])) || 1,
      });
    }
    var lsCombo = p.match(/カードを(\d+)枚引き[、,]?手札を(\d+)枚控え室に置/);
    if (!lsCombo) lsCombo = p.match(/カードを(\d+)枚引[^：]*手札を(\d+)枚控え室に置/);
    if (lsCombo) {
      return withTrigger("live_success", {
        template: "draw_then_hand_discard",
        deckDrawCount: Number(lsCombo[1]) || 1,
        effectDiscardCount: Number(lsCombo[2]) || 1,
      });
    }
    var lsPick = parseDeckTopCount(p);
    if (lsPick != null && /手札に加/.test(p) && /公開/.test(p)) {
      return withTrigger("live_success", {
        template: "deck_top_pick_recover",
        deckTopCount: lsPick,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (
      /自分のエネルギーデッキから/.test(p) &&
      /エネルギーカードを(\d+)枚ウェイト/.test(p) &&
      /もよい/.test(p) &&
      /そうした場合/.test(p) &&
      /相手はカードを(\d+)枚引/.test(p)
    ) {
      var hotEwM = p.match(/エネルギーカードを(\d+)枚ウェイト/);
      var hotOppDrawM = p.match(/相手はカードを(\d+)枚引/);
      return withTrigger("live_success", {
        template: "live_success_optional_energy_wait_opp_draw",
        optional: true,
        hasOptionalCost: true,
        energyWaitCount: hotEwM ? Number(hotEwM[1]) : 1,
        oppDeckDrawCount: hotOppDrawM ? Number(hotOppDrawM[1]) : 1,
      });
    }
    var lsDraw = p.match(/カードを(\d+)枚引/);
    if (lsDraw && !p.includes("控え室から") && !/相手は.*カードを/.test(p)) {
      return withTrigger("live_success", {
        template: "draw_from_deck",
        deckDrawCount: Number(lsDraw[1]) || 1,
      });
    }
    var ls = parseDeckTopCount(p);
    if (ls != null && (p.includes("見る") || p.includes("めく"))) {
      return withTrigger("live_success", {
        template: "deck_top_look_reorder",
        deckTopCount: ls,
      });
    }
    if (/エールにより公開された自分のカードの中から.*手札に加/.test(p)) {
      var yellEffectPart = p.indexOf("場合") >= 0 ? p.slice(p.indexOf("場合") + 2).replace(/^[、,]/, "") : p;
      var yellHandMaxM = yellEffectPart.match(/(\d+)枚まで/);
      return withTrigger("live_success", {
        template: "yell_resolution_pick_hand",
        filters: parseAbilityPickFilters(yellEffectPart),
        preconditionFilters: parseConditionalPrefixFilters(p),
        handPickMax: yellHandMaxM ? Number(yellHandMaxM[1]) : 1,
        handDiscardToWaiting: /手札.*控え室/.test(p) ? 1 : null,
        optional: /もよい/.test(p),
        hasOptionalCost: /手札.*控え室.*もよい/.test(p),
      });
    }
    if (/エールにより公開された自分のカードの中から.*デッキの一番上/.test(p)) {
      return withTrigger("live_success", {
        template: "yell_resolution_pick_deck_top",
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
      });
    }
    if (/エールにより公開された自分のカードの中から.*デッキの一番下/.test(p)) {
      var yDbMaxM = p.match(/(\d+)枚まで/);
      return withTrigger("live_success", {
        template: "yell_resolution_pick_deck_bottom",
        filters: Object.assign(parseAbilityPickFilters(p), { pickType: T_LIVE }),
        deckPickMax: yDbMaxM ? Number(yDbMaxM[1]) : 1,
      });
    }
    if (/エールにより公開/.test(p) && /ライブカードが1枚以上/.test(p) && /エネルギーデッキ.*ウェイト/.test(p)) {
      var yEw = p.match(/エネルギーカードを(\d+)枚ウェイト/);
      return withTrigger("live_success", {
        template: "yell_resolution_energy_wait",
        energyWaitCount: yEw ? Number(yEw[1]) : 1,
      });
    }
    if (/エールにより公開/.test(p) && /カードが(\d+)枚以上/.test(p) && /エネルギーデッキ.*ウェイト/.test(p)) {
      var yEc = p.match(/カードが(\d+)枚以上/);
      var minResC = yEc ? Number(yEc[1]) : 7;
      if (minResC >= 2) {
        var yEn2 = p.match(/エネルギーカードを(\d+)枚ウェイト/);
        return withTrigger("live_success", {
          template: "yell_resolution_count_energy_wait",
          minResolutionCards: minResC,
          filters: parseAbilityPickFilters(p),
          energyWaitCount: yEn2 ? Number(yEn2[1]) : 1,
        });
      }
    }
    if (/自分のエネルギーが相手より少ない/.test(p) && /エネルギーデッキ.*ウェイト/.test(p)) {
      return withTrigger("live_success", {
        template: "energy_less_than_opponent_wait",
        energyWaitCount: 1,
      });
    }
    if (/ライブの合計スコアが相手より高[いく]/.test(p) && /エネルギーデッキ.*ウェイト/.test(p)) {
      return withTrigger("live_success", {
        template: "live_score_higher_energy_wait",
        energyWaitFromUnderMember: /下にあるエネルギー/.test(p),
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/ライブの合計スコアが同じ/.test(p) && /成功ライブカード置き場にカードを置くことができない/.test(p)) {
      return withTrigger("live_success", { template: "live_success_tie_block_success_live" });
    }
    if (/相手は/.test(p) && /エネルギーデッキ.*ウェイト/.test(p) && !/自分と相手はそれぞれ/.test(p)) {
      var oppEwM = p.match(/エネルギーカードを(\d+)枚ウェイト/);
      return withTrigger("live_success", {
        template: "live_success_opponent_energy_deck_wait",
        energyWaitCount: oppEwM ? Number(oppEwM[1]) : 1,
      });
    }
    if (/デッキの一番上のカードを公開/.test(p) && /手札に加/.test(p)) {
      return withTrigger("live_success", {
        template: "deck_top_reveal_hand_score_grant",
        liveScoreGrant: parseScorePlusFromText(p) || 1,
        grantIfNoBhMember: /ブレードハートを持たないメンバー/.test(p),
      });
    }
    if (/余剰ハートを持たない/.test(p) && /余剰ハートを2つ以上/.test(p)) {
      return withTrigger("live_success", { template: "surplus_heart_score_modifier" });
    }
    if (/自分が余剰ハートを([０-９\d]+)つ以上持っている場合/.test(p) && /このカードのスコアを[＋+]/.test(normalizeFwDigits(p))) {
      var surplusScoreM = p.match(/自分が余剰ハートを([０-９\d]+)つ以上持っている場合/);
      return withTrigger("live_success", {
        template: "live_success_surplus_heart_score_plus",
        minSurplusHearts: Number(normalizeFwDigits(surplusScoreM ? surplusScoreM[1] : "3")) || 3,
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        loseAllSurplusHearts: /それらをすべて失い/.test(p),
      });
    }
    if (/自分と相手はそれぞれ.*エネルギーデッキから.*1枚ウェイト/.test(p)) {
      return withTrigger("live_success", { template: "both_players_energy_deck_wait" });
    }
    if (/手札.*控え室.*ライブの合計スコアに(\d+)を足した数/.test(p) && /見る/.test(p)) {
      var lspLs = p.match(/ライブの合計スコアに(\d+)を足した数/);
      return withTrigger("live_success", {
        template: "deck_top_count_live_score_plus",
        deckTopCountOffset: lspLs ? Number(lspLs[1]) : 2,
        handDiscardToWaiting: /手札を1枚控え室/.test(p) ? 1 : null,
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
      });
    }
    if (/このメンバー以外のメンバーがいる場合/.test(p) && /このメンバーをウェイト/.test(p)) {
      return withTrigger("live_success", { template: "live_success_self_wait_if_others" });
    }
    if (/ライブの合計スコアが相手より高い/.test(p) && /このカードを手札に加/.test(p) && /エールによって公開/.test(p)) {
      return withTrigger("live_success", {
        template: "yell_resolution_pick_self_score",
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
      });
    }
    if (/エールにより公開.*ライブカードが1枚以上/.test(p) && /合計スコアを/.test(p)) {
      var scLive = parseScorePlusFromText(p) || 1;
      return withTrigger("live_success", {
        template: "yell_resolution_live_count_score",
        liveScoreGrant: scLive,
        minResolutionLives: /ライブカードが3枚以上/.test(p) ? 3 : 1,
        liveScoreGrantHigh: /代わりに合計スコアを＋２|代わりに合計スコアを\+2/.test(p) ? 2 : scLive,
      });
    }
    if (/エールにより公開/.test(p) && /ライブカードがある場合/.test(p) && /合計スコアを/.test(p)) {
      var areaLs = parseStageAreaConstraint(segRaw);
      return withTrigger(
        "live_success",
        Object.assign(
          {
            template: "yell_reveal_series_live_score_plus",
            liveScoreGrant: parseScorePlusFromText(p) || 1,
            filters: parseAbilityPickFilters(p),
          },
          areaLs ? { stageArea: areaLs } : {},
        ),
      );
    }
    if (/デッキの上からカードを(\d+)枚控え室/.test(p) && /控え室.*ライブカード.*手札/.test(p)) {
      var dwN = p.match(/デッキの上からカードを(\d+)枚控え室/);
      return withTrigger("live_success", {
        template: "live_success_deck_wait_pick_live",
        deckTopCount: dwN ? Number(dwN[1]) : 5,
        filters: parseAbilityPickFilters(p),
        minDistinctLiveNames: /カード名の異なる/.test(p) ? 3 : 0,
      });
    }
    if (/下にあるコスト(\d+)以下/.test(p) && /メンバーのいないエリアに登場/.test(p)) {
      var uc = p.match(/下にあるコスト(\d+)以下/);
      return withTrigger("live_success", {
        template: "live_success_enter_under_member",
        filters: Object.assign(parseAbilityPickFilters(p), {
          maxCost: uc ? Number(uc[1]) : 2,
          pickType: T_MEMBER,
        }),
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
      });
    }
    if (/支払ってもよい/.test(p) && /合計スコアを/.test(p) && !/ライブ終了時まで/.test(p)) {
      return withTrigger("live_success", {
        template: "optional_energy_live_score_plus",
        optional: true,
        hasOptionalCost: true,
        costEnergy: true,
        costEnergyCount: countWikiEnergyIcons(segRaw) || base.costEnergyCount || 1,
        liveScoreGrant: parseScorePlusFromText(p) || 1,
      });
    }
    if (
      /支払ってもよい/.test(p) &&
      /控え室(?:から|にある)/.test(p) &&
      /手札に加える/.test(p) &&
      !/合計スコア/.test(p)
    ) {
      return withTrigger("live_success", {
        template: "live_success_optional_energy_recover_waiting",
        optional: true,
        hasOptionalCost: true,
        costEnergy: true,
        costEnergyCount: countWikiEnergyIcons(segRaw) || base.costEnergyCount || 1,
        recoverPickFilters: Object.assign(parseAbilityPickFilters(p), {
          pickType: /ライブカード/.test(p) ? T_LIVE : T_MEMBER,
        }),
        filters: parseAbilityPickFilters(p),
      });
    }
    if (
      /このターン/.test(p) &&
      /『Liella!』/.test(p) &&
      /効果によって.*移動/.test(p) &&
      /合計スコアを[＋+]/.test(normalizeFwDigits(p))
    ) {
      return withTrigger("live_success", {
        template: "live_success_liella_effect_moved_score",
        liveScoreGrant: parseScorePlusFromText(p) || 1,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (
      /エールにより公開された/.test(p) &&
      /ブレードハートを持たない/.test(p) &&
      /2枚につき/.test(p) &&
      /合計スコア/.test(p) &&
      /までしか増えない/.test(p)
    ) {
      var capM = p.match(/合計スコアは([0-9０-９]+)まで/);
      return withTrigger("live_success", {
        template: "live_success_yell_nobh_series_score_capped",
        liveScoreGrant: parseScorePlusFromText(p) || 1,
        liveScoreCapMax: capM ? Number(normalizeFwDigits(capM[1])) : 2,
        filters: parseAbilityPickFilters(p),
      });
    }
    var perUnitSc = classifyLiveScorePerUnit(p);
    if (perUnitSc) return withTrigger("live_success", perUnitSc);
    var recoverLs = classifyWaitingRecover(p);
    if (recoverLs) return withTrigger("live_success", recoverLs);
    var recoverDiff = classifyRecoverWaitingDiffStageGroup(p);
    if (recoverDiff) return withTrigger("live_success", recoverDiff);
    var tdOptLs = parseDeckTopCount(p);
    if (tdOptLs != null && /控え室/.test(p) && /もよい/.test(p)) {
      return withTrigger("live_success", {
        template: "deck_top_to_waiting",
        deckTopCount: tdOptLs,
        optional: true,
        hasOptionalCost: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }
    if (
      /ステージから控え室に置いてもよい/.test(p) &&
      /このカードのスコアを[＋+]/.test(normalizeFwDigits(p)) &&
      /控え室から/.test(p) &&
      /手札に加える/.test(p)
    ) {
      return withTrigger("live_success", {
        template: "live_success_optional_stage_to_waiting_score_recover",
        optional: true,
        hasOptionalCost: true,
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        recoverPickFilters: Object.assign(parseAbilityPickFilters(p), { pickType: T_LIVE }),
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/余剰ハート/.test(p) && /エネルギーデッキから.*ウェイト/.test(p)) {
      var surplusSlotM = p.match(/余剰ハートに\{\{heart_0?(\d)[^}]*\}\}/);
      return withTrigger("live_success", {
        template: "live_success_surplus_heart_energy_wait",
        surplusHeartSlot: surplusSlotM ? Number(surplusSlotM[1]) : 0,
        energyWaitCount: 1,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }
    if (/フォーメーションチェンジ/.test(p) && /1つのエリアに2人以上/.test(p)) {
      return withTrigger("live_success", {
        template: "live_success_formation_change",
        optional: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }
    if (
      /エールにより公開された自分の/.test(p) &&
      /メンバーカードが持つハートの中に/.test(p) &&
      (/heart_0?6|heart06/.test(p + segRaw) || /heart_01/.test(p + segRaw))
    ) {
      return withTrigger("live_success", {
        template: "live_success_yell_series_members_all_hearts_score",
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        filters: parseAbilityPickFilters(p),
      });
    }
    var cardScLs = parseLiveCardScorePlusFromText(pLs);
    if (cardScLs > 0 && /このカードのスコア/.test(p) && !isCompoundLiveScoreEffectText(p) && !/代わり/.test(scoreEffectPartAfterCondition(p))) {
      /** @type {Partial<ClassifiedAbility>} */
      var lsScorePatch = {
        template: "live_card_score_plus",
        cardScoreGrant: cardScLs,
        optional: base.optional,
        hasOptionalCost: base.hasOptionalCost,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
        requiresYellRevealedAllBladeFlipped:
          /エールにより公開/.test(p) &&
          (/ALLブレード|icon_b_all|b_all/.test(p + segRaw) || /ALLブレード/.test(pLs)),
      };
      if (/センターエリア/.test(p) && /移動している/.test(p)) {
        lsScorePatch.requiresCenterMemberMovedThisTurn = true;
      }
      return withTrigger("live_success", lsScorePatch);
    }
    var scoreSetM = normalizeFwDigits(p).match(/このカードのスコアは([0-9]+)になる/);
    if (scoreSetM) {
      return withTrigger("live_success", {
        template: "live_card_score_set_fixed",
        cardScoreSet: Number(scoreSetM[1]) || 0,
        requiresConditionConfirm: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    return withTrigger("live_success", { template: "guided_manual" });
  }

  if (enterLiveStart) {
    if (!segmentRawOverride && trigger === "live_start") {
      var lsSegRawsMulti = listNativeLiveStartSegmentRaws(card);
      if (lsSegRawsMulti.length > 1) {
        var lsSteps = lsSegRawsMulti
          .map(function (raw) {
            return _classifyCardAbilityCore(card, "live_start", raw);
          })
          .filter(function (st) {
            return st && st.template && st.template !== "none" && st.template !== "guided_manual";
          });
        if (lsSteps.length > 1) {
          return withTrigger("live_start", {
            template: "ability_sequence",
            steps: lsSteps,
            optional: false,
            hasOptionalCost: false,
            filters: base.filters,
            requiresOnStage: lsSteps.some(function (st) {
              return st.requiresOnStage === true;
            }),
          });
        }
      }
    }
    var stageAreaMetaLs = (function () {
      var areas = parseStageAreaConstraints(segRaw);
      if (areas.length === 1) return { stageArea: areas[0] };
      if (areas.length > 1) return { stageAreas: areas };
      return {};
    })();
    function lsT(obj) {
      return withTrigger("live_start", Object.assign({}, stageAreaMetaLs, obj));
    }

    var optSelfWaitLs = classifyOptionalSelfWaitEffect(p, base);
    if (optSelfWaitLs) return lsT(optSelfWaitLs);

    // SUNNY DAY SONG: ステージ人数の段階効果（両者ドロー控え / μ'sハート付与 / スコア+1）
    if (
      /自分のステージにメンバーが1人以上いる場合/.test(p) &&
      /自分と相手はカードを1枚引き/.test(p) &&
      /2人以上いる場合/.test(p)
    ) {
      var sdsHeartM = (segRaw || "").match(/2人以上[^。]*?(?:ライブ終了時まで[^。]*?)?\{\{heart_0?(\d)[^}]*\}\}を得る/);
      return lsT({
        template: "live_start_sunny_day_song_tiered",
        sunnyGrantHeartSlot: sdsHeartM ? Number(sdsHeartM[1]) : 3,
        sunnyGrantSeriesTag: "μ's",
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        requiresOnStage: true,
      });
    }

    // 全方位キュン♡: 余剰ハート持ちメンバー数の段階効果（ドロー / 必要ハート減）
    if (
      /元々持つハートの数より多い数のハートを持つ/.test(p) &&
      /カードを1枚引く/.test(p) &&
      /2人以上いる場合/.test(p) &&
      /必要ハート/.test(p)
    ) {
      return lsT({
        template: "live_start_overflow_heart_tiered_draw_reduce",
        overflowSeriesTag: (parseAbilityPickFilters(p).seriesTag) || null,
        needHeartReduceMap: parseNeedHeartReduceFixedMap(segRaw),
        requiresOnStage: true,
      });
    }

    // ?←HEARTBEAT: 成功ライブスコア合計の段階効果（必要ハート減 / スコア+1）
    if (
      /成功ライブカード置き場にあるカードのスコアの合計が/.test(p) &&
      /必要ハート/.test(p) &&
      /減らす/.test(p) &&
      /スコアの合計が/.test(normalizeFwDigits(p))
    ) {
      var hbDigits = normalizeFwDigits(p);
      var hbLowM = hbDigits.match(/スコアの合計が(\d+)以上の場合、このカードを成功させるための必要ハート/);
      var hbHighM = hbDigits.match(/スコアの合計が(\d+)以上の場合、さらにこのカードのスコアを[＋+](\d+)/);
      return lsT({
        template: "live_start_success_score_tiered_reduce_score",
        successScoreLowMin: hbLowM ? Number(hbLowM[1]) : 6,
        needHeartReduceMap: parseNeedHeartReduceFixedMap(segRaw),
        successScoreHighMin: hbHighM ? Number(hbHighM[1]) : 9,
        cardScoreGrant: hbHighM ? Number(hbHighM[2]) : 1,
        requiresOnStage: true,
      });
    }

    // 鬼塚夏美: デッキトップを最大5回ミルし、その都度ブレード付与＋ライブなら自ウェイト
    if (
      /自分のデッキの一番上のカードを控え室に置いてもよい/.test(p) &&
      /この手順をさらに(\d+)回まで繰り返してもよい/.test(normalizeFwDigits(p))
    ) {
      var millRepM = normalizeFwDigits(p).match(/この手順をさらに(\d+)回まで繰り返してもよい/);
      return lsT({
        template: "live_start_mill_loop_blade_grant",
        millMaxRepeat: millRepM ? Number(millRepM[1]) : 4,
        bladeGain: bladeGainFromIcons(segRaw, p) || 1,
        selfWaitIfMilledLive: /ライブカードの場合.*このメンバーをウェイト/.test(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }

    // 澁谷かのん(SD2): ドロー後にフォーメーションチェンジ（任意）
    if (/カードを1枚引く/.test(p) && /その後/.test(p) && /フォーメーションチェンジ/.test(p)) {
      return lsT({
        template: "live_start_draw_then_formation_change",
        deckDrawCount: 1,
        requiresOnStage: true,
      });
    }

    // 5枚見る→指定メンバー1枚を手札→残り控え→相手の低コスト低ブレードを一括ウェイト
    var deckPeekOppWaitLs = classifyDeckPeekPickThenOppWait(p, segRaw);
    if (deckPeekOppWaitLs) return lsT(Object.assign({ requiresOnStage: true }, deckPeekOppWaitLs));

    var lsGrantInteractive = classifyConditionalGrantJoujiInteractive(p, segRaw, "live_start");
    if (lsGrantInteractive) return lsT(lsGrantInteractive);

    if (/相手に何が好き？と聞く/.test(p) && /チョコミント/.test(p)) {
      return lsT({
        template: "live_start_love_screem_opp_answer",
        bladeGain: bladeGainFromIcons(segRaw, p) || 1,
        requiresOnStage: true,
      });
    }

    if (/このターン.*(?:登場.*2回以上|2回以上登場)/.test(p) && /ライブ終了時まで/.test(p)) {
      return lsT(
        enrichGrantJoujiPatch(p, segRaw, {
          template: "grant_jouji_session",
          liveScoreGrant:
            parseScorePlusFromText(p) ||
            parseScorePlusFromText(String(segRaw || "").replace(/\{\{[^}]+\}\}/g, "")) ||
            1,
          minStageEntriesThisTurn: 2,
          requiresOnStage: true,
        }),
      );
    }

    if (/支払わないかぎり/.test(p) && /手札.*控え室/.test(p)) {
      var hdPayLs = p.match(/手札を(\d+)枚控え室/);
      var payEnergyLs = countWikiEnergyIcons(segRaw) || base.costEnergyCount || 2;
      return lsT({
        template: "live_start_pay_or_hand_discard",
        handDiscardToWaiting: hdPayLs ? Number(hdPayLs[1]) : 2,
        costEnergy: payEnergyLs > 0,
        costEnergyCount: payEnergyLs,
        requiresOnStage: true,
      });
    }

    if (
      /ライブ終了時まで/.test(p + segRaw) &&
      /ステージにいる/.test(p) &&
      parseNamedMemberHeartBladeGifts(p, segRaw).length > 0
    ) {
      return lsT({
        template: "live_start_named_member_heart_blades",
        requiresOnStage: true,
        memberHeartBladeGifts: parseNamedMemberHeartBladeGifts(p, segRaw),
      });
    }

    var payPickLs = classifyPayEnergyPickOne(card, "live_start");
    if (payPickLs) {
      return lsT(Object.assign({ requiresOnStage: true }, payPickLs));
    }
    var optMemWaitGrant = classifyOptionalMemberWaitGrant(p, segRaw, base);
    if (optMemWaitGrant) return lsT(optMemWaitGrant);

    var energyBladeLs = classifyOptionalEnergyBladeUntilLiveEnd(segRaw, p, base);
    if (energyBladeLs) {
      return lsT(Object.assign({ requiresOnStage: true }, energyBladeLs));
    }

    var yellRed = p.match(/エールによって公開される自分のカードの枚数が(\d+)枚減る/);
    if (yellRed) {
      return lsT({
        template: "live_start_yell_reveal_reduction",
        yellRevealReduction: Number(yellRed[1]) || 8,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (/ポジションチェンジ/.test(p)) {
      return lsT(
        Object.assign(
          {
            template: "live_start_position_change",
            requiresOnStage: true,
            optional: /してもよい/.test(segRaw) || /してもよい/.test(p),
            hasOptionalCost: /してもよい/.test(segRaw) || /してもよい/.test(p),
          },
          parsePositionChangeMeta(p, segRaw),
        ),
      );
    }

    if (textHasHeartColorPickGrant(p)) {
      var movedGrant = /このターン中にエリアを移動/.test(p);
      return lsT({
        template: movedGrant ? "live_start_moved_members_pick_heart_grant" : "heart_color_pick_grant",
        requiresOnStage: true,
        optional: base.optional,
        heartPickSlots: parseHeartColorPickSlots(p, segRaw),
        heartPerSuccessLive: textHasHeartPerSuccessLiveGrant(p),
        filters: parseAbilityPickFilters(p),
        grantToMovedMembersThisTurn: movedGrant,
      });
    }

    if (
      /このターン中に登場、またはエリアを移動した/.test(p) &&
      /必要ハート/.test(p) &&
      /\{\{heart_00\.png\|heart0\}\}/.test(segRaw) &&
      /減らす/.test(p)
    ) {
      return lsT({
        template: "live_start_need_heart_reduce_per_enter_or_move",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
        needHeartReducePerMovedOrEntered: 1,
      });
    }

    /**
     * 条件成立で必要ハートを固定数だけ減らす。
     * 例:「必要ハートを{{heart_00}}{{heart_00}}{{heart_00}}減らす」「必要ハートを{{heart_04}}減らす」
     *    「必要ハートは{{heart_00}}{{heart_00}}減る」「必要ハートは{{heart_00}}{{heart_00}}少なくなる」
     * 「〜につき」(比例) や デッキ/見る/引く等の複合効果は対象外。
     */
    var perUnitReduce = classifyNeedHeartReducePerUnit(p, segRaw);
    if (perUnitReduce) {
      return lsT(
        Object.assign(perUnitReduce, {
          filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseNeedHeartReduceConditionFilters(p)),
        }),
      );
    }

    /**
     * 効果本文は「最初の『場合、』以降」を見る。複合効果（ドロー/デッキ/見る/2つ目の場合）は除外し、
     * 「必要ハートを減らす」だけの単純カードに限定する。
     */
    var needReduceEffectPart = p.indexOf("場合") >= 0 ? p.slice(p.indexOf("場合") + 2) : p;
    if (
      /必要ハート(?:を|は)/.test(needReduceEffectPart) &&
      /(減らす|少なくなる|減る)/.test(needReduceEffectPart) &&
      !/につき/.test(needReduceEffectPart) &&
      !/になる|にする/.test(needReduceEffectPart) &&
      !/場合/.test(needReduceEffectPart) &&
      !/見る|引[くき]|デッキ|山札|控え室|公開|アクティブ|ウェイトにする|手札|スコア/.test(needReduceEffectPart)
    ) {
      var reduceMap = parseNeedHeartReduceFixedMap(segRaw);
      if (Object.keys(reduceMap).length) {
        return lsT({
          template: "live_start_need_heart_reduce_fixed",
          requiresOnStage: true,
          filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseNeedHeartReduceConditionFilters(p)),
          needHeartReduceMap: reduceMap,
        });
      }
    }

    if (
      /成功ライブカード置き場にあるカード1枚につき/.test(p) &&
      /必要ハート/.test(p) &&
      /少なくなる/.test(p) &&
      /\{\{heart_00\.png\|heart0\}\}/.test(segRaw)
    ) {
      var reduceIcons = (String(segRaw).match(/\{\{heart_00\.png\|heart0\}\}/g) || []).length;
      return lsT({
        template: "live_start_need_heart_reduce_per_success_live",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
        needHeartReducePerSuccessLive: Math.max(1, reduceIcons || 1),
      });
    }

    if (/必要ハートは/.test(p) && /のうち.*選んだ1つにしてもよい/.test(p)) {
      var needChoicesOpt = parseNeedHeartChoiceMapsFromSegmentRaw(segRaw);
      if (needChoicesOpt.length >= 2) {
        return lsT({
          template: "live_start_need_heart_set_choice",
          requiresOnStage: true,
          optional: true,
          hasOptionalCost: true,
          filters: parseAbilityPickFilters(p),
          needHeartSetChoices: needChoicesOpt,
        });
      }
    }

    if (/必要ハートは/.test(p) && /になる/.test(p)) {
      var needChoices = parseNeedHeartChoiceMapsFromSegmentRaw(segRaw);
      if (/のうち.*してもよい/.test(p) && needChoices.length >= 2) {
        return lsT({
          template: "live_start_need_heart_set_choice",
          requiresOnStage: true,
          optional: true,
          hasOptionalCost: true,
          filters: parseAbilityPickFilters(p),
          needHeartSetChoices: needChoices,
        });
      }
      var needSet = parseNeedHeartMapFromSegmentRaw(segRaw);
      if (Object.keys(needSet).length) {
        return lsT({
          template: "live_start_need_heart_set_fixed",
          requiresOnStage: true,
          filters: parseAbilityPickFilters(p),
          needHeartSetMap: needSet,
          cardScoreGrant: parseLiveCardScorePlusFromText(p) || 0,
        });
      }
    }

    if (/このカードを使用するためのコストは/.test(p) && /になる/.test(p)) {
      var needSetFromCost = parseNeedHeartMapFromSegmentRaw(segRaw);
      if (Object.keys(needSetFromCost).length) {
        return lsT({
          template: "live_start_need_heart_set_fixed",
          requiresOnStage: true,
          filters: parseAbilityPickFilters(p),
          needHeartSetMap: needSetFromCost,
        });
      }
    }

    if (/ステージにいる.*すべてのメンバーをアクティブ|すべてのメンバーをアクティブ/.test(p)) {
      return lsT({
        template: "live_start_activate_all_stage_members",
        requiresOnStage: true,
      });
    }

    if (/すべての『Liella!』のメンバーと.*エネルギーをアクティブ/.test(p)) {
      return lsT({ template: "live_start_activate_liella_and_energy", requiresOnStage: true });
    }

    if (/ステージにいるメンバーを1人までアクティブ|すべてのメンバーをアクティブ/.test(p)) {
      return lsT({ template: "live_start_activate_all_stage_members", requiresOnStage: true });
    }

    if (/手札のライブカードを1枚公開し.*デッキの一番下/.test(p) && /見る/.test(p)) {
      return lsT({
        template: "live_start_hand_live_to_deck_bottom_look",
        deckTopCount: parseDeckTopCount(p) || 2,
        requiresOnStage: true,
      });
    }

    if (
      /手札の「/.test(p) &&
      /控え室に置いてもよい/.test(p) &&
      /枚につき/.test(p) &&
      (/ブレード/.test(p) || /枚につき.*得る/.test(p)) &&
      /ライブ終了時まで/.test(p)
    ) {
      return lsT({
        template: "live_start_hand_discard_blade_per",
        characterNames: parseQuotedCharacterNames(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }

    /**
     * 「ライブ終了時まで、自分の手札N枚につき、ブレードを得る。」
     * 手札サイズ / N の数のブレードをライブ開始時に獲得して、ライブ終了時まで維持する。
     */
    var handPerMatch = p.match(/自分の手札(\d+)枚につき/);
    if (
      handPerMatch &&
      /ライブ終了時まで/.test(p) &&
      (bladeGainFromIcons(segRaw, p) > 0 || /ブレード.*得る/.test(p) || /得る/.test(p))
    ) {
      return lsT({
        template: "live_start_hand_blade_per",
        handPer: Math.max(1, Number(handPerMatch[1]) || 2),
        bladeGain: bladeGainFromIcons(segRaw, p) || 1,
        requiresOnStage: true,
      });
    }

    if (/ライブカード置き場にカードが2枚以上/.test(p) && /能力を持たない.*ライブカード|デッキの一番上に置/.test(p + segRaw)) {
      return lsT({
        template: "live_start_live_frame_pick_deck_top",
        filters: parseAbilityPickFilters(p),
        excludeTriggerOnPick: /能力を持たない/.test(p + segRaw) ? "live_start" : null,
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
        requiresOnStage: true,
      });
    }

    if (/控え室にあるメンバーカード2枚.*デッキの一番下/.test(p) && /合計が\d+の場合/.test(normalizeFwDigits(p))) {
      return lsT({
        template: "live_start_waiting_deck_bottom_tiered",
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
        deckBottomPickCount: 2,
        costTiers: parseWaitingCostTiersFromText(p),
        filters: { pickType: T_MEMBER },
      });
    }

    if (/以下から1つを選ぶ/.test(p)) {
      var lsChoices = parseAbilityBulletChoices(segRaw);
      var lsPickFilters = parseAbilityPickFilters(p);
      lsPickFilters.minSuccessLiveCount = null;
      lsPickFilters.minEitherSuccessLiveCount = null;
      return lsT({
        template: "ability_pick_one",
        abilityChoices: lsChoices.length ? lsChoices : parseAbilityBulletChoices(p),
        choiceMin: 1,
        choiceMax: 1,
        requiresOnStage: true,
        filters: lsPickFilters,
      });
    }

    if (/EdelNote/.test(p + segRaw) && /名前の異なる/.test(p) && /メンバー1人は/.test(p) && /を得て/.test(p)) {
      return lsT({
        template: "live_start_edelnote_blade_heart_pair",
        bladeGain: countWikiBladeIcons(segRaw) || 2,
        requiresOnStage: true,
        filters: Object.assign(parseAbilityPickFilters(p), { seriesTag: "EdelNote" }),
      });
    }

    if (/センターエリアにいる/.test(p) && /元々持つ/.test(p) && /数は(\d+)つ/.test(p)) {
      var bladeSetM = p.match(/数は(\d+)つ/);
      return lsT({
        template: "live_start_center_series_blade_set",
        bladeSetCount: bladeSetM ? Number(bladeSetM[1]) || 3 : 3,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (
      /手札.*控え室.*もよい/.test(costPart) &&
      /ウェイト状態のメンバー.*アクティブ/.test(p) &&
      /ライブ終了時まで/.test(p + segRaw)
    ) {
      var hdLsAct = costPart.match(/手札を(\d+)枚控え室/);
      var heartGrantSlots = parseNamedMemberHeartBladeGifts(p, segRaw);
      return lsT({
        template: "live_start_hand_discard_activate_wait_grant",
        handDiscardToWaiting: hdLsAct ? Number(hdLsAct[1]) || 2 : 2,
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
        memberHeartBladeGifts: heartGrantSlots.length ? heartGrantSlots : undefined,
      });
    }

    if (/ライブ終了時まで/.test(p + segRaw)) {
      var grantBlade = bladeGainFromIcons(segRaw, p);
      var grantScore = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      if (grantBlade > 0 || grantScore > 0 || /を得る/.test(p)) {
        var lsGrantTpl =
          /このターン中にエリアを移動/.test(p) && /ステージにいる/.test(p)
            ? "live_start_moved_members_blade_grant"
            : "grant_jouji_session";
        return lsT(
          enrichGrantJoujiPatch(p, segRaw, {
            template: lsGrantTpl,
            bladeGain: grantBlade,
            liveScoreGrant: grantScore,
            requiresOnStage: true,
            grantToMovedMembersThisTurn: /このターン中にエリアを移動/.test(p),
          }),
        );
      }
    }

    var actEnLs = p.match(/エネルギーを(\d+)枚アクティブにする/);
    if (
      /1人につき/.test(p) &&
      /エネルギーを.*アクティブ/.test(p) &&
      /名前の異なる『([^』]+)』のメンバー1人につき/.test(p)
    ) {
      var distinctEnLsM = p.match(/名前の異なる『([^』]+)』のメンバー1人につき/);
      return lsT({
        template: "activate_energy",
        energyActiveCount: actEnLs ? Number(actEnLs[1]) || 1 : 1,
        energyActiveUnitKind: "distinct_name_series_stage_members",
        energyActiveUnitSeries: distinctEnLsM ? distinctEnLsM[1] : null,
        energyActiveWaitOnly: true,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (actEnLs) {
      return lsT({
        template: "activate_energy",
        energyActiveCount: Number(actEnLs[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    var edWaitLs = p.match(/エネルギーデッキから.*エネルギーカードを(\d+)枚ウェイト/);
    if (edWaitLs) {
      return lsT({
        template: "energy_deck_to_wait",
        energyWaitCount: Number(edWaitLs[1]) || 1,
        requiresOnStage: true,
      });
    }

    var drawPerMemLs = p.match(/ステージにいるメンバー1人につき.*カードを(\d+)枚引/);
    if (drawPerMemLs) {
      var discLs = p.match(/手札を(\d+)枚控え室に置/);
      return lsT({
        template: "draw_per_stage_member_discard",
        deckDrawCount: Number(drawPerMemLs[1]) || 1,
        effectDiscardCount: discLs ? Number(discLs[1]) : 0,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    var drawDiscardLs = p.match(/カードを(\d+)枚引き?、手札を(\d+)枚控え室に置/);
    if (!drawDiscardLs) drawDiscardLs = p.match(/カードを(\d+)枚引.*手札を(\d+)枚控え室/);
    if (drawDiscardLs) {
      return lsT({
        template: "draw_then_hand_discard",
        deckDrawCount: Number(drawDiscardLs[1]) || 1,
        effectDiscardCount: Number(drawDiscardLs[2]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    var lookReorderLs = parseDeckTopCount(p);
    if (
      lookReorderLs != null &&
      /見る/.test(p) &&
      /デッキの上に置/.test(p) &&
      /好きな/.test(p)
    ) {
      return lsT({
        template: "deck_top_look_reorder",
        deckTopCount: lookReorderLs,
        requiresOnStage: true,
        pickSelfOrOpponent: /自分か相手を選ぶ/.test(p),
      });
    }

    if (base.bladeGain > 0 && !/手札|控え室|山札|見る|引|公開|成功ライブ|以下から/.test(p)) {
      return lsT({
        template: base.costEnergy ? "optional_energy_blade_until_live_end" : "blade_gain_only",
        bladeGain: base.bladeGain,
        requiresOnStage: true,
        optional: base.costEnergy || base.optional,
        hasOptionalCost: base.hasOptionalCost || base.costEnergy,
        costEnergy: base.costEnergy,
        costEnergyCount: base.costEnergyCount,
      });
    }

    var topPickLs = parseDeckTopCount(p);
    if (topPickLs != null && /手札に加/.test(p) && /公開/.test(p)) {
      return lsT({
        template: "deck_top_pick_recover",
        deckTopCount: topPickLs,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    var lsDraw = p.match(/カードを(\d+)枚引/);
    if (lsDraw && /相手のステージ.*ウェイト/.test(p)) {
      var oc2 = p.match(/コスト(\d+)以下/);
      return lsT({
        template: "live_start_draw_opp_wait",
        deckDrawCount: Number(lsDraw[1]) || 1,
        oppWaitMaxCost: oc2 ? Number(oc2[1]) : 9,
        oppWaitCount: /1人まで/.test(p) ? 1 : 99,
        requiresOnStage: true,
      });
    }
    if (lsDraw && !p.includes("控え室から") && !/手札を\d+枚控え室/.test(p)) {
      return lsT({
        template: "draw_from_deck",
        deckDrawCount: Number(lsDraw[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (
      (/成功ライブ/.test(p) && /手札に加/.test(p)) ||
      (/手札.*公開/.test(p) && /成功ライブ/.test(p))
    ) {
      return lsT({
        template: "toujou_success_live_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    if (/控え室から/.test(p) && /手札に加/.test(p)) {
      return lsT({
        template: "toujou_wait_pick_hand",
        requiresOnStage: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }

    var tdLs = parseDeckTopCount(p);
    if (tdLs != null && p.includes("控え室")) {
      return lsT({
        template: "deck_top_to_waiting",
        deckTopCount: tdLs,
        requiresOnStage: true,
      });
    }

    if (
      /のメンバー1人をウェイトにしてもよい/.test(p) &&
      /相手.{0,20}.*ウェイト/.test(p) &&
      /元々持つ/.test(p) &&
      /2つ以上少ない/.test(p)
    ) {
      var heartGapLs = /元々持つ/.test(p) && !/ブレード/.test(p);
      return lsT({
        template: "optional_pick_member_wait_opp_blade_gap",
        oppBladeGapMin: heartGapLs ? undefined : 2,
        oppPrintedHeartGapMin: heartGapLs ? 2 : undefined,
        filters: parseAbilityPickFilters(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/BiBi.*ウェイトにしてもよい/.test(p) && /アクティブ状態のメンバー1人をウェイト/.test(p)) {
      return lsT({
        template: "toujou_bibi_wait_opp_active_wait",
        optional: true,
        hasOptionalCost: true,
        filters: Object.assign(parseAbilityPickFilters(p), { seriesTag: "BiBi", pickType: T_MEMBER }),
        stageArea: parseStageAreaConstraint(segRaw) || "center",
        requiresOnStage: true,
      });
    }
    if (/のメンバー1人をウェイトにしてもよい/.test(p) && /相手は.*ウェイト/.test(p)) {
      return lsT({
        template: "optional_pick_member_wait_opp_stage",
        filters: parseAbilityPickFilters(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/手札を1枚控え室に置かないかぎり/.test(p) && /エネルギー.*エネルギーデッキ/.test(p)) {
      return lsT({
        template: "live_start_mandatory_energy_deck_unless_hand_discard",
        requiresOnStage: true,
      });
    }
    if (/フォーメーションチェンジしてもよい/.test(p) && /ステージにいるメンバー/.test(p)) {
      return lsT({
        template: "live_start_optional_formation_change",
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }

    if (/控え室にある/.test(p) && /デッキの上に置/.test(p) && /ウェイト状態のメンバー/.test(p)) {
      return lsT({
        template: "waiting_to_deck_top_by_opp_wait_count",
        filters: parseAbilityPickFilters(p),
        requiresOnStage: true,
      });
    }

    if (/右サイドエリアと左サイドエリア/.test(p) && /コストが同じ/.test(p) && /相手のステージ.*ウェイト/.test(p)) {
      return lsT({ template: "live_start_side_cost_equal_opp_wait", requiresOnStage: true });
    }

    if (/コスト10以上のメンバーがいる場合.*相手.*コスト(\d+)以下.*ウェイト/.test(p)) {
      var ocHcLs = p.match(/コスト(\d+)以下/);
      return lsT({
        template: "live_start_opp_wait_if_high_cost_on_stage",
        filters: Object.assign(parseAbilityPickFilters(p), { minCostMemberOnStage: 10 }),
        oppWaitMaxCost: ocHcLs ? Number(ocHcLs[1]) : 4,
        requiresOnStage: true,
      });
    }
    if (/ステージにいるメンバーが持つハートが合計(\d+)つ以上/.test(p) && /相手.*コスト(\d+)以下.*ウェイト/.test(p)) {
      var minHtLs = p.match(/合計(\d+)つ以上/);
      var oc2hLs = p.match(/コスト(\d+)以下/);
      return lsT({
        template: "live_start_opp_wait_if_stage_hearts",
        minStageHeartTotal: minHtLs ? Number(minHtLs[1]) : 5,
        oppWaitMaxCost: oc2hLs ? Number(oc2hLs[1]) : 2,
        requiresOnStage: true,
      });
    }
    if (
      /相手のステージにいるコスト(\d+)以下のメンバー1人をウェイト/.test(p) &&
      !/コスト10以上/.test(p) &&
      !/DOLLCHESTRA/.test(p) &&
      !/元々持つ/.test(p)
    ) {
      var ocWLs = p.match(/コスト(\d+)以下/);
      return lsT({
        template: "live_start_opp_wait_max_cost",
        oppWaitMaxCost: ocWLs ? Number(ocWLs[1]) : 9,
        requiresOnStage: true,
      });
    }
    if (/元々持つ.*3つ以下.*DOLLCHESTRA.*以外.*ウェイト/.test(p)) {
      return lsT({
        template: "live_start_opp_wait_exclude_unit",
        excludedUnit: "DOLLCHESTRA",
        maxPrintedHearts: 3,
        requiresOnStage: true,
      });
    }
    if (/ライブ中.*スコア[２2]以下のライブカード/.test(p) && /このメンバーをアクティブ/.test(p)) {
      return lsT({
        template: "live_start_activate_self_if_low_score_live",
        maxLiveScore: 2,
        requiresOnStage: true,
      });
    }
    if (/自分か相手を選ぶ.*控え室.*デッキの一番下/.test(p)) {
      return lsT({
        template: "live_start_pick_player_waiting_deck_bottom",
        deckBottomPickMax: /2枚まで/.test(p) ? 2 : 1,
        filters: { pickType: T_MEMBER },
        requiresOnStage: true,
      });
    }
    if (/自分か相手を選ぶ.*デッキの一番上のカードを見る/.test(p)) {
      return lsT({ template: "live_start_pick_player_deck_top_peek", requiresOnStage: true });
    }
    if (/控え室にあるメンバーカード2枚.*デッキの一番上/.test(p) && /支払ってもよい/.test(p)) {
      return lsT({
        template: "live_start_optional_energy_waiting_reorder_deck_top",
        deckTopPickCount: 2,
        costEnergy: true,
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
        filters: { pickType: T_MEMBER },
      });
    }
    if (/元々持つハートはすべて/.test(p) && /heart0|heart_00|heart_0/.test(p + segRaw) && /支払ってもよい/.test(p)) {
      return lsT({
        template: "live_start_optional_hearts_wild",
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
      });
    }
    if (/手札の.*控え室に置いてもよい.*ハートの色1つにつき/.test(p)) {
      return lsT({
        template: "live_start_hand_named_discard_hearts_grant",
        characterNames: parseQuotedCharacterNames(p),
        optional: true,
        hasOptionalCost: /もよい/.test(p),
        requiresOnStage: true,
      });
    }

    if (/のメンバーをアクティブにする/.test(p) && /ウェイト状態のメンバーが([０-９\d]+)人以上アクティブ/.test(normalizeFwDigits(p))) {
      var unwaitScoreM = normalizeFwDigits(p).match(/ウェイト状態のメンバーが(\d+)人以上アクティブ/);
      return lsT({
        template: "live_start_activate_series_score_by_unwait",
        minUnwaitForScore: unwaitScoreM ? Number(unwaitScoreM[1]) : 3,
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        filters: parseAbilityPickFilters(p),
        requiresOnStage: true,
      });
    }
    if (
      /メンバーのコストが合計([０-９\d]+)以上/.test(p) &&
      /デッキの上のカードを([０-９\d]+)枚見る/.test(p) &&
      /その中から1枚を手札に加え/.test(p)
    ) {
      var tierCostM = p.match(/メンバーのコストが合計([０-９\d]+)以上/);
      var tierHighM = p.match(/([０-９\d]+)以上の場合、さらにこのカードの必要ハート/);
      var lookM = p.match(/デッキの上のカードを([０-９\d]+)枚見る/);
      var reduceMapTier = /さらにこのカードの必要ハート/.test(p) ? parseNeedHeartReduceFixedMap(segRaw) : {};
      return lsT({
        template: "live_start_tiered_stage_cost_deck_look",
        tierStageCostMin: tierCostM ? Number(normalizeFwDigits(tierCostM[1])) : 20,
        tierStageCostHighMin: tierHighM ? Number(normalizeFwDigits(tierHighM[1])) : 30,
        deckLookPickToHand: 1,
        deckTopCount: lookM ? Number(normalizeFwDigits(lookM[1])) : 2,
        needHeartReduceMap: Object.keys(reduceMapTier).length ? reduceMapTier : undefined,
        filters: parseAbilityPickFilters(p),
        requiresOnStage: true,
      });
    }

    if (/成功ライブカード置き場にスコアが/.test(p) && /代わりにスコアを/.test(p)) {
      return lsT({
        template: "live_start_tiered_success_live_scores",
        tierSuccessLiveScores: [1, 5],
        cardScoreGrantLow: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        cardScoreGrantHigh:
          Number(normalizeFwDigits((p.match(/代わりにスコアを[＋+](\d+)/) || [])[1])) || 2,
        requiresOnStage: true,
      });
    }
    if (/控え室にカード名の異なる/.test(p) && /代わりにスコアを/.test(p)) {
      var tierWaitM = p.match(/カードが([０-９\d]+)枚以上ある場合/);
      var tierWaitHighM = p.match(/([０-９\d]+)枚以上ある場合、代わりにスコア/);
      return lsT({
        template: "live_start_tiered_waiting_distinct_score",
        tierWaitingDistinctMin: tierWaitM ? Number(normalizeFwDigits(tierWaitM[1])) : 4,
        tierWaitingDistinctHigh: tierWaitHighM ? Number(normalizeFwDigits(tierWaitHighM[1])) : 6,
        cardScoreGrantLow: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        cardScoreGrantHigh:
          Number(normalizeFwDigits((p.match(/代わりにスコアを[＋+](\d+)/) || [])[1])) || 2,
        filters: parseAbilityPickFilters(p),
        requiresOnStage: true,
      });
    }

    if (
      /このターン/.test(p) &&
      /ウェイト状態の自分のエネルギーをアクティブ/.test(p) &&
      /ウェイト状態のメンバーもアクティブ/.test(p) &&
      /このカードのスコアを/.test(p)
    ) {
      var actSeriesM = p.match(/『([^』]+)』のカードの効果/);
      return lsT({
        template: "live_start_series_activation_score",
        seriesActivationTag: actSeriesM ? actSeriesM[1] : "虹ヶ咲",
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        cardScoreGrantHigh:
          Number(normalizeFwDigits((p.match(/代わりにスコアを[＋+](\d+)/) || [])[1])) || 2,
        filters: parseAbilityPickFilters(p),
        requiresOnStage: true,
      });
    }

    if (/控え室にある/.test(p) && /デッキの上に置/.test(p) && /好きな順番/.test(p) && /ライブカード/.test(p)) {
      var livePickMaxM = p.match(/(\d+)枚まで/);
      /** @type {string[]} */
      var waitSeriesTags = [];
      var waitSeriesRe = /『([^』]+)』/g;
      var wsm;
      while ((wsm = waitSeriesRe.exec(p)) !== null) {
        if (waitSeriesTags.indexOf(wsm[1]) < 0) waitSeriesTags.push(wsm[1]);
      }
      var stageCostSumM = p.match(/コストが合計(\d+)以上/);
      return lsT({
        template: "live_start_waiting_lives_reorder_deck_top",
        deckTopPickMax: livePickMaxM ? Number(livePickMaxM[1]) : 4,
        waitingSeriesTags: waitSeriesTags,
        requiresStageSeriesPresence: waitSeriesTags.length >= 2 ? waitSeriesTags.slice(0, 2) : waitSeriesTags,
        minStagePresenceSeriesCostSum: stageCostSumM ? Number(stageCostSumM[1]) : null,
        optional: /もよい/.test(p),
        hasOptionalCost: /もよい/.test(p),
        filters: Object.assign(parseAbilityPickFilters(p), {
          pickType: T_LIVE,
          seriesTagsAny: waitSeriesTags,
          seriesTag: null,
        }),
        requiresOnStage: true,
      });
    }

    if (/エネルギーを(\d+)枚までアクティブ/.test(p) && /エネルギーがすべてアクティブ状態/.test(p) && /このカードのスコアを/.test(p)) {
      var enActMaxM = p.match(/エネルギーを(\d+)枚までアクティブ/);
      var distinctSeriesM = p.match(/名前の異なる『([^』]+)』のメンバーが([０-９\d]+)人以上/);
      return lsT({
        template: "live_start_activate_energy_all_active_score",
        energyActiveCount: enActMaxM ? Number(enActMaxM[1]) : 6,
        cardScoreGrant: parseLiveCardScorePlusFromText(normalizeFwDigits(p)) || 1,
        filters: Object.assign(parseAbilityPickFilters(p), {
          minDistinctSeriesMemberNames: distinctSeriesM ? Number(normalizeFwDigits(distinctSeriesM[2])) : 2,
          distinctSeriesMemberNamesTag: distinctSeriesM ? distinctSeriesM[1] : null,
        }),
        requiresOnStage: true,
      });
    }

    if (/エールによって公開される自分のカードが持つ/.test(p) && /すべて.*青ブレード/.test(p) && /ライブ終了時まで/.test(p)) {
      return lsT({ template: "live_start_yell_blade_remap_slot", yellBladeRemapSlot: 5, requiresOnStage: true });
    }

    if (/ステージにいる/.test(p) && /メンバー1人を選ぶ/.test(p) && /ライブ開始時.*能力.*発動/.test(p + segRaw)) {
      return lsT({
        template: "live_start_trigger_stage_member_live_start",
        optional: true,
        hasOptionalCost: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
        requiresOnStage: true,
      });
    }

    if (/このカードの/.test(p) && /能力を無効/.test(p) && /live_success|ライブ成功時/.test(p + segRaw)) {
      var disSlotM = (p + segRaw).match(/heart_0?(\d)/);
      var disMinM = p.match(/合計([０-９\d]+)個以上/);
      var disSeriesF = parseAbilityPickFilters(p);
      return lsT({
        template: "live_start_disable_self_live_success_if",
        disableIfSeriesHeartSlot: disSlotM ? Number(disSlotM[1]) : 2,
        disableIfSeriesHeartSlotMin: disMinM ? Number(normalizeFwDigits(disMinM[1])) : 6,
        disableIfSeriesTag: disSeriesF.seriesTag || "Aqours",
        requiresOnStage: true,
      });
    }

    if (
      /自分と相手のステージ/.test(p) &&
      /メンバー1人につき.*1枚公開/.test(p) &&
      /ライブカード1枚につき/.test(p) &&
      /スコアを[＋+]/.test(normalizeFwDigits(p))
    ) {
      return lsT({
        template: "live_start_deck_reveal_both_stage_members_score",
        requiresOnStage: true,
      });
    }

    var distinctShiftScore = classifyDistinctSeriesNeedHeartShiftThenScore(p, segRaw);
    if (distinctShiftScore) return lsT(distinctShiftScore);

    var perUnitScLs = classifyLiveScorePerUnit(p);
    if (perUnitScLs) return lsT(Object.assign(perUnitScLs, { requiresOnStage: true }));

    var cardScLs = parseLiveCardScorePlusFromText(normalizeFwDigits(p));
    if (cardScLs > 0 && /このカードのスコア/.test(p) && !isCompoundLiveScoreEffectText(p) && !/代わり/.test(scoreEffectPartAfterCondition(p))) {
      return lsT({
        template: "live_card_score_plus",
        cardScoreGrant: cardScLs,
        optional: base.optional,
        hasOptionalCost: base.hasOptionalCost,
        requiresOnStage: true,
        filters: mergeAbilityPickFilters(parseAbilityPickFilters(p), parseConditionalPrefixFilters(p)),
      });
    }

    return lsT({ template: "guided_manual", requiresOnStage: true, filters: parseAbilityPickFilters(p) });
  }
  if (enterJouji) {
    if (cardOffersSuccessLiveWaitingSubstitute(card)) {
      return withTrigger("jouji", { template: "jouji_success_live_waiting_substitute" });
    }
    return withTrigger("jouji", { template: "passive_track" });
  }
  if (enterJidou) {
    var jidouSeg = segmentRawOverride || abilityRawSegmentForTrigger(card, "jidou");
    var jidouCl = classifyJidouAutoSegment(jidouSeg);
    if (jidouCl && jidouCl.template !== "jidou_manual") {
      return withTrigger("jidou", jidouCl);
    }
    return withTrigger("jidou", { template: "passive_track" });
  }

  if (p.length > 0) {
    var tr = "none";
    if (keys.has("kidou")) tr = "kidou";
    else if (keys.has("toujyou")) tr = "toujyou";
    else if (keys.has("live_start")) tr = "live_start";
    else if (keys.has("live_success")) tr = "live_success";
    return withTrigger(/** @type {AbilityTrigger} */ (tr), { template: "guided_manual" });
  }
  return base;
}

/** @param {*} card */
export function memberHasKidouAbility(card) {
  return cardHasTrigger(card, "kidou");
}

/** @deprecated classifyCardAbility を使用 */
export function memberKidouRecoverHandType(card) {
  var cl = classifyCardAbility(card, "kidou");
  if (cl.template !== "kidou_stage_wait_pick_hand") return null;
  return cl.filters.pickType || null;
}

/** @param {*} card */
export function memberHasKidouStageToWaitingPickAbility(card) {
  var cl = classifyCardAbility(card, "kidou");
  return cl.template === "kidou_stage_wait_pick_hand";
}

export function memberHasToujouAbility(card) {
  return cardHasTrigger(card, "toujyou");
}

export function memberHasOptionalToujouAbility(card) {
  if (!memberHasToujouAbility(card)) return false;
  var cl = classifyCardAbility(card, "toujyou");
  return cl.optional || cl.hasOptionalCost;
}

export function memberHasLiveStartAbility(card) {
  return cardHasTrigger(card, "live_start");
}

export function memberHasOptionalLiveStartAbility(card) {
  if (!memberHasLiveStartAbility(card)) return false;
  var cl = classifyCardAbility(card, "live_start");
  return cl.optional || cl.hasOptionalCost;
}

export function memberHasLiveSuccessAbility(card) {
  return cardHasTrigger(card, "live_success");
}

/** カードが指定 trigger の能力を 1 つ以上持つか（trigger アイコンで判定） */
export function cardHasTrigger(card, trigger) {
  if (!card || !trigger) return false;
  var segs = splitAbilityByTriggers(cardAbilityRawText(card));
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger === trigger) return true;
  }
  return false;
}

export function abilityEffectIsAutomated(template) {
  return (
    template === "kidou_stage_wait_pick_hand" ||
    template === "kidou_wait_pick_hand" ||
    template === "kidou_hand_cost_wait_pick_hand" ||
    template === "kidou_hand_discard_activate_wait_opp_bonus" ||
    template === "kidou_hand_discard_series_branch" ||
    template === "kidou_wait_to_stage" ||
    template === "deck_top_to_waiting" ||
    template === "deck_top_look_reorder" ||
    template === "deck_top_pick_recover" ||
    template === "toujou_wait_pick_hand" ||
    template === "toujou_success_live_pick_hand" ||
    template === "draw_from_deck" ||
    template === "draw_then_hand_discard" ||
    template === "blade_gain_only" ||
    template === "ability_pick_one" ||
    template === "live_success_pick_options" ||
    template === "pay_energy_pick_one" ||
    template === "optional_energy_blade_until_live_end" ||
    template === "kidou_wait_or_hand_for_energy" ||
    template === "toujou_liella_double_baton_center" ||
    template === "activate_energy" ||
    template === "energy_deck_to_wait" ||
    template === "energy_deck_to_active" ||
    template === "draw_per_stage_member_discard" ||
    template === "draw_until_hand_size" ||
    template === "toujou_hand_stage_enter" ||
    template === "toujou_self_wait_if_hand_enter_bh" ||
    template === "waiting_to_deck_bottom" ||
    template === "grant_jouji_session" ||
    template === "live_start_yell_reveal_reduction" ||
    template === "live_start_position_change" ||
    template === "live_start_activate_all_stage_members" ||
    template === "live_start_activate_liella_and_energy" ||
    template === "live_start_hand_live_to_deck_bottom_look" ||
    template === "kidou_multi_choice" ||
    template === "kidou_self_to_wait_recover" ||
    template === "kidou_self_wait_stage_member_swap_recover" ||
    template === "draw_then_hand_to_deck_bottom" ||
    template === "live_start_center_series_blade_set" ||
    template === "live_start_edelnote_blade_heart_pair" ||
    template === "live_start_hand_discard_blade_per" ||
    template === "live_start_hand_discard_activate_wait_grant" ||
    template === "live_start_hand_blade_per" ||
    template === "toujou_deck_top_wait_if_all_members" ||
    template === "toujou_deck_top_wait_if_all_heart" ||
    template === "toujou_both_wait_to_empty_stage" ||
    template === "toujou_both_wait_pick_live_hand" ||
    template === "toujou_opp_stage_member_match_grant" ||
    template === "toujou_opp_emma_punch_answer" ||
    template === "toujou_baton_both_trim_hand_draw" ||
    template === "optional_self_wait_opp_stage" ||
    template === "toujou_deck_top_liella_live_pick" ||
    template === "live_start_named_member_heart_blades" ||
    template === "live_start_moved_members_blade_grant" ||
    template === "live_start_moved_members_pick_heart_grant" ||
    template === "live_start_need_heart_reduce_per_enter_or_move" ||
    template === "live_start_need_heart_reduce_per_success_live" ||
    template === "live_start_need_heart_reduce_fixed" ||
    template === "live_start_need_heart_reduce_per_unit" ||
    template === "live_start_need_heart_set_fixed" ||
    template === "live_start_need_heart_set_choice" ||
    template === "live_start_distinct_series_need_heart_shift_score" ||
    template === "live_success_characters_draw" ||
    template === "heart_color_pick_grant" ||
    template === "kidou_reveal_hand_cost_threshold" ||
    template === "deck_top_count_stage_plus" ||
    template === "both_players_energy_deck_wait" ||
    template === "jouji_success_live_waiting_substitute" ||
    template === "success_live_waiting_swap" ||
    template === "kidou_self_wait_activate_other" ||
    template === "deck_top_reveal_top_to_hand_score" ||
    template === "kidou_waiting_to_empty_stage" ||
    template === "live_success_wait_skip_next_activate" ||
    template === "deck_top_pick_no_ability_or_jouji" ||
    template === "deck_top_count_live_score_plus" ||
    template === "waiting_reorder_deck_top" ||
    template === "activate_stage_members_up_to" ||
    template === "toujou_pick_member_or_energy" ||
    template === "yell_resolution_pick_hand" ||
    template === "yell_resolution_pick_deck_top" ||
    template === "yell_resolution_energy_wait" ||
    template === "yell_resolution_count_energy_wait" ||
    template === "energy_less_than_opponent_wait" ||
    template === "live_score_higher_energy_wait" ||
    template === "deck_top_reveal_hand_score_grant" ||
    template === "surplus_heart_score_modifier" ||
    template === "live_success_surplus_heart_score_plus" ||
    template === "kidou_wait_member_grant_jouji" ||
    template === "kidou_energy_or_activate_member" ||
    template === "kidou_energy_deck_pick_live" ||
    template === "kidou_hand_discard_trigger_ability" ||
    template === "toujou_wait_pick_trigger_ability" ||
    template === "toujou_baton_discarded_pick_hand" ||
    template === "toujou_optional_hand_discard_draw" ||
    template === "optional_pick_member_wait_opp_stage" ||
    template === "optional_pick_member_wait_opp_blade_gap" ||
    template === "toujou_baton_discarded_under" ||
    template === "live_success_liella_effect_moved_score" ||
    template === "live_success_optional_energy_recover_waiting" ||
    template === "live_success_yell_nobh_series_score_capped" ||
    template === "live_success_score_if_stage_live_start_member" ||
    template === "live_start_mandatory_energy_deck_unless_hand_discard" ||
    template === "live_start_optional_formation_change" ||
    template === "live_start_draw_opp_wait" ||
    template === "waiting_to_deck_top_by_opp_wait_count" ||
    template === "live_start_side_cost_equal_opp_wait" ||
    template === "live_start_live_frame_pick_deck_top" ||
    template === "live_success_self_wait_if_others" ||
    template === "yell_resolution_pick_self_score" ||
    template === "yell_resolution_live_count_score" ||
    template === "yell_reveal_series_live_score_plus" ||
    template === "optional_energy_live_score_plus" ||
    template === "live_card_score_plus" ||
    template === "live_card_score_plus_per_unit" ||
    template === "live_card_score_set_fixed" ||
    template === "live_success_recover_from_waiting" ||
    template === "live_success_recover_waiting_diff_group" ||
    template === "live_success_optional_stage_to_waiting_score_recover" ||
    template === "live_start_activate_series_score_by_unwait" ||
    template === "live_start_tiered_stage_cost_deck_look" ||
    template === "live_start_tiered_success_live_scores" ||
    template === "live_start_tiered_waiting_distinct_score" ||
    template === "live_success_surplus_heart_energy_wait" ||
    template === "live_success_formation_change" ||
    template === "yell_resolution_pick_deck_bottom" ||
    template === "live_start_series_activation_score" ||
    template === "live_start_waiting_lives_reorder_deck_top" ||
    template === "live_start_activate_energy_all_active_score" ||
    template === "live_start_yell_blade_remap_blue" ||
    template === "live_start_yell_blade_remap_slot" ||
    template === "live_start_dazzling_named_liella_grant" ||
    template === "live_start_trigger_stage_member_live_start" ||
    template === "live_success_yell_series_members_all_hearts_score" ||
    template === "live_success_tie_block_success_live" ||
    template === "live_success_opponent_energy_deck_wait" ||
    template === "live_start_disable_self_live_success_if" ||
    template === "live_start_deck_reveal_both_stage_members_score" ||
    template === "ability_sequence" ||
    template === "followup_draw_if_live_discarded" ||
    template === "toujou_multi_wait_draw_per_count" ||
    template === "toujou_opp_hand_reveal_no_live_draw" ||
    template === "tiered_cost_draw_if" ||
    template === "tiered_cost_grant_jouji_score" ||
    template === "tiered_cost_grant_jouji_session" ||
    template === "live_start_waiting_deck_bottom_tiered" ||
    template === "live_start_pay_or_hand_discard" ||
    template === "toujou_wait_to_member_under" ||
    template === "toujou_both_center_position_change" ||
    template === "toujou_opp_active_wait" ||
    template === "kidou_opp_wait_group_discount_energy" ||
    template === "deck_reveal_until_pick" ||
    template === "deck_reveal_until_live" ||
    template === "kidou_hand_reveal_to_under" ||
    template === "kidou_hand_discard_wait_live_score_pay" ||
    template === "kidou_self_wait_hand_enter_energy" ||
    template === "kidou_wait_shuffle_deck_bottom_activate" ||
    template === "kidou_self_to_wait_opp_wait" ||
    template === "toujou_hand_discard_draw_plus" ||
    template === "toujou_optional_self_wait_recover" ||
    template === "toujou_wait_enter_cost_sum" ||
    template === "toujou_optional_all_members_relocate" ||
    template === "toujou_optional_wait_to_deck_top" ||
    template === "toujou_optional_energy_under" ||
    template === "toujou_self_wait_only" ||
    template === "toujou_rotate_stage_areas" ||
    template === "toujou_success_live_score_tiered" ||
    template === "toujou_success_live_low_score_grant" ||
    template === "toujou_draw_grant_if_from_waiting" ||
    template === "toujou_hand_discard_wait_heart_dual_pick" ||
    template === "toujou_wait_pick_opp_live" ||
    template === "toujou_grant_heart_stage_member" ||
    template === "toujou_opp_front_position_change" ||
    template === "toujou_bibi_wait_opp_active_wait" ||
    template === "toujou_baton_series_heart_grant" ||
    template === "toujou_opp_optional_live_discard_or_score" ||
    template === "toujou_turn_block_effect_activate" ||
    template === "toujou_opp_wait_if_high_cost_on_stage" ||
    template === "toujou_grant_opp_live_need_heart_if_stage_hearts" ||
    template === "toujou_main_phase_live_from_waiting" ||
    template === "live_start_opp_wait_if_high_cost_on_stage" ||
    template === "live_start_opp_wait_if_stage_hearts" ||
    template === "live_start_opp_wait_max_cost" ||
    template === "live_start_opp_wait_exclude_unit" ||
    template === "live_start_activate_self_if_low_score_live" ||
    template === "live_start_pick_player_waiting_deck_bottom" ||
    template === "live_start_pick_player_deck_top_peek" ||
    template === "live_start_optional_energy_waiting_reorder_deck_top" ||
    template === "live_start_optional_hearts_wild" ||
    template === "live_start_pick_stage_member_printed_hearts_remap" ||
    template === "live_start_pick_live_frame_match_success_live_grant" ||
    template === "live_start_hand_named_discard_hearts_grant" ||
    template === "live_success_deck_wait_pick_live" ||
    template === "live_success_enter_under_member" ||
    template === "live_start_sunny_day_song_tiered" ||
    template === "live_start_overflow_heart_tiered_draw_reduce" ||
    template === "live_start_success_score_tiered_reduce_score" ||
    template === "live_start_mill_loop_blade_grant" ||
    template === "live_start_draw_then_formation_change" ||
    template === "toujou_self_wait_draw_then_conditional_discard" ||
    template === "toujou_draw_then_position_change" ||
    template === "deck_peek_pick_then_opp_wait" ||
    template === "draw_then_conditional_extra_draw" ||
    template === "live_success_draw_per_series_then_discard_same" ||
    template === "kidou_hand_reveal_grant_if_live" ||
    template === "live_start_number_reveal_grant_if" ||
    template === "live_start_dollcostra_cost_set_grant_if" ||
    template === "live_start_hand_discard_cost_boost_grant_if" ||
    template === "toujou_both_shuffle_deck_bottom_grant_if" ||
    template === "live_start_optional_shuffle_deck_bottom_grant_if" ||
    template === "live_start_pay_or_discard_conditional_grant_members" ||
    template === "live_success_opponent_energy_deck_wait" ||
    template === "live_success_optional_energy_wait_opp_draw" ||
    template === "kidou_reveal_live_opp_decline_grant" ||
    template === "live_start_optional_hand_discard_named_followup_blade" ||
    template === "kidou_discard_self_draw_grant" ||
    template === "live_start_optional_energy_under_return_grant" ||
    template === "live_start_stellar_stream_grant" ||
    template === "toujou_baton_discarded_series_per_card" ||
    template === "live_start_love_screem_opp_answer" ||
    jidouEffectIsAutomated(template)
  );
}

/** 起動時セグメント一覧（印刷能力・付与引用を除く） */
export function listNativeKidouSegmentRaws(card) {
  if (!card || !card.ability) return [];
  var segs = splitAbilityByTriggers(String(card.ability));
  /** @type {string[]} */
  var out = [];
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== "kidou") continue;
    var plain = segmentPlainText(segs[i].text);
    if (plain === "/" || plain === "") continue;
    if (plain === "を得る。" || plain === "を得る") continue;
    if (i > 0) {
      var prev = segs[i - 1];
      if (prev.trigger && prev.trigger !== "kidou") {
        var prevText = String(prev.text || "");
        if (/「/.test(prevText) && !/」/.test(prevText) && /ライブ終了時まで/.test(prevText)) continue;
      }
    }
    out.push(segs[i].text);
  }
  return out;
}

/** 登場時セグメント一覧（印刷能力・付与引用を除く） */
export function listNativeLiveStartSegmentRaws(card) {
  if (!card || !card.ability) return [];
  var segs = splitAbilityByTriggers(String(card.ability));
  /** @type {string[]} */
  var out = [];
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== "live_start") continue;
    var plain = segmentPlainText(segs[i].text);
    if (plain === "/" || plain === "") continue;
    if (plain === "を得る。" || plain === "を得る") continue;
    if (i > 0) {
      var prev = segs[i - 1];
      if (prev.trigger && prev.trigger !== "live_start") {
        var prevText = String(prev.text || "");
        if (/「/.test(prevText) && !/」/.test(prevText) && /ライブ終了時まで/.test(prevText)) continue;
      }
    }
    out.push(segs[i].text);
  }
  return out;
}

/** 登場時セグメント一覧（印刷能力・付与引用を除く） */
export function listNativeToujouSegmentRaws(card) {
  if (!card || !card.ability) return [];
  var segs = splitAbilityByTriggers(String(card.ability));
  var out = [];
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== "toujyou") continue;
    var plain = segmentPlainText(segs[i].text);
    if (plain === "/" || plain === "") continue;
    if (/^ライブ終了時まで/.test(plain) && /」を得る/.test(plain)) continue;
    if (plain === "を得る。" || plain === "を得る") continue;
    if (i > 0) {
      var prev = segs[i - 1];
      if (prev.trigger && prev.trigger !== "toujyou") {
        var prevText = String(prev.text || "");
        if (/「/.test(prevText) && !/」/.test(prevText) && /ライブ終了時まで/.test(prevText)) continue;
      }
    }
    var acc = String(segs[i].text || "");
    if (i + 1 < segs.length && segs[i + 1].trigger === "jouji" && isInlineJoujiReference(segs, i + 1)) {
      acc += "{{jyouji.png|常時}}" + segs[i + 1].text;
    }
    out.push(acc);
  }
  return out;
}

/** 常時: 2人バトンタッチ登場可（PL!SP-bp4-004） */
export function cardAllowsTwoMemberBaton(card) {
  if (!card) return false;
  var raw = cardAbilityRawText(card);
  return /2人のメンバーとバトンタッチしてもよい/.test(raw);
}
