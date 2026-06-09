/**
 * 能力テンプレートの実行メタデータ（分類器・検証スクリプト・simulator で共有）。
 */

/** runClassifiedCardAbility の payAbilityCost をスキップし、handler 側でコスト処理する template */
export const TEMPLATE_HANDLES_OWN_COST = [
  "kidou_hand_cost_wait_pick_hand",
  "kidou_hand_discard_trigger_ability",
  "kidou_energy_or_activate_member",
  "kidou_energy_deck_pick_live",
  "kidou_wait_to_stage",
  "kidou_stage_wait_pick_hand",
  "live_start_pay_or_hand_discard",
  "optional_energy_live_score_plus",
  "deck_reveal_until_live",
  "kidou_hand_discard_wait_live_score_pay",
  "kidou_hand_reveal_to_under",
  "kidou_self_wait_hand_enter_energy",
  "kidou_wait_shuffle_deck_bottom_activate",
  "kidou_self_to_wait_opp_wait",
  "toujou_hand_discard_draw_plus",
  "toujou_optional_self_wait_recover",
  "toujou_wait_enter_cost_sum",
  "toujou_optional_all_members_relocate",
  "toujou_optional_wait_to_deck_top",
  "toujou_optional_energy_under",
  "toujou_hand_discard_wait_heart_dual_pick",
  "toujou_bibi_wait_opp_active_wait",
  "live_start_optional_energy_waiting_reorder_deck_top",
  "toujou_main_phase_live_from_waiting",
  "ability_sequence",
  "toujou_multi_wait_draw_per_count",
  "live_start_waiting_deck_bottom_tiered",
];

/** executeAbilityBody 内で手動ガイド／常時トラックのみ（自動解決の対象外） */
export const TEMPLATES_META_IN_EXECUTE_BODY = ["guided_manual", "passive_track"];

/** 自動効果だが executeAbilityBody ではなく fireJidouAuto 経路で処理 */
export const JIDOU_AUTO_TEMPLATES = [
  "jidou_leave_stage_activate_one",
  "jidou_leave_stage_hand_pick_recover",
  "jidou_leave_stage_deck_look_pick",
  "jidou_leave_stage_draw_discard",
  "jidou_enter_or_baton_draw",
  "jidou_area_move_grant_jouji",
  "jidou_area_move_draw",
  "jidou_area_move_energy_wait",
  "jidou_area_move_wait_pick_hand",
  "jidou_area_move_opp_wait",
  "jidou_yell_grant_jouji",
  "jidou_yell_grant_jouji_nobh_members",
  "jidou_yell_grant_jouji_no_bh",
  "jidou_yell_grant_heart",
  "jidou_yell_draw",
  "jidou_leave_stage_position_change",
  "jidou_stage_entry_draw_until",
  "jidou_on_cost_enter_draw",
  "jidou_on_cost_enter_energy_wait",
  "jidou_area_move_activate_energy",
  "jidou_move_or_energy_draw_grant",
  "jidou_card_to_waiting_pick_hand",
  "jidou_live_zone_to_waiting_deck",
  "jidou_yell_retry_no_live",
  "jidou_opp_wait_draw",
  "jidou_series_enter_pay_energy",
  "jidou_hand_to_waiting_grant",
  "jidou_series_enter_grant",
  "jidou_series_enter_opp_wait",
  "jidou_self_active_to_wait_draw_discard",
  "jidou_energy_placed_grant",
  "jidou_baton_leave_activate_energy",
  "jidou_leave_stage_hand_grant_member",
];

/** @param {string} template */
export function templateHandlesOwnCost(template) {
  return TEMPLATE_HANDLES_OWN_COST.indexOf(template) >= 0;
}
