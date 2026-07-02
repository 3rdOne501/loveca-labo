/**
 * カード文パターンの横断監査（bp5 等で効いたルールを共通化）。
 * @param {object} ctx
 * @param {string} ctx.id
 * @param {string} ctx.trigger
 * @param {string} ctx.plain  wiki除去済み平文
 * @param {import('../js/abilityEffects.js').ClassifiedAbility} ctx.cl
 * @returns {string[]} エラーメッセージ（空なら OK）
 */
export function auditCommonAbilityPatterns(ctx) {
  const { id, trigger, plain, cl } = ctx;
  /** @type {string[]} */
  const errors = [];

  if (/残り.*控え室|控え室に置/.test(plain) && /手札に加/.test(plain)) {
    if (cl.template === "deck_top_to_waiting") {
      errors.push(`${id} ${trigger}: deck_top_to_waiting misclass (hand recover)`);
    }
  }

  if (/手札に加/.test(plain) && /その後.*控え室から/.test(plain) && /デッキの上からカードを\d+枚控え室/.test(plain)) {
    if (cl.template !== "ability_sequence") {
      errors.push(`${id} ${trigger}: mill-then-wait-pick must be ability_sequence`);
    } else {
      const steps = cl.steps || [];
      if (steps[0]?.template !== "deck_top_to_waiting" || steps[1]?.template !== "toujou_wait_pick_hand") {
        errors.push(`${id} ${trigger}: ability_sequence steps mill+wait-pick`);
      }
      if (steps[0]?.optional || steps[0]?.hasOptionalCost) {
        errors.push(`${id} ${trigger}: sequence step0 must not inherit optional cost`);
      }
    }
  }

  if (/ライブの合計スコアに\d+を足した数/.test(plain) && cl.template !== "deck_top_count_live_score_plus") {
    errors.push(`${id} ${trigger}: live score plus peek misclassified`);
  }

  if (
    /成功ライブカード置き場にあるカード1枚につき/.test(plain) &&
    /必要ハート/.test(plain) &&
    /増やす/.test(plain) &&
    /このカードのスコア/.test(plain) &&
    cl.template !== "live_start_score_plus_per_success_live"
  ) {
    errors.push(`${id} ${trigger}: success-live per-card score+need-heart misclassified`);
  }

  if (/以下から1つを選ぶ/.test(plain) && cl.template === "ability_pick_one") {
    const choices = cl.abilityChoices || [];
    choices.forEach(function (ch, i) {
      if (/icon_blade|ブレード/.test(plain) && ch && /ブレード/.test(plain) && !/ブレード/.test(ch)) {
        if (/ブレード/.test(plain.slice(plain.indexOf(ch.slice(0, 8))))) {
          errors.push(`${id} ${trigger}: abilityChoices[${i}] missing blade label after parse`);
        }
      }
    });
    if (/ウェイト状態のメンバー/.test(plain) && choices[0] && !/ウェイト/.test(choices[0])) {
      errors.push(`${id} ${trigger}: ability_pick_one choice0 missing wait-activate text`);
    }
  }

  if (/このターンに登場したメンバー.*以外/.test(plain) && cl.template === "heart_color_pick_grant") {
    if (!cl.grantToEnteredMembersThisTurn || !cl.grantExcludeSeriesTag) {
      errors.push(`${id} ${trigger}: entered-members heart grant flags`);
    }
  }

  if (/支払った.*4つにつき、このカードのスコアを/.test(plain)) {
    if (cl.template !== "optional_energy_card_score_plus_per_unit") {
      errors.push(`${id} ${trigger}: optional E per-4 card score misclassified`);
    }
  }

  if (/それらがすべてメンバーカードの場合.*ライブ終了時まで/.test(plain)) {
    if (cl.template !== "live_start_deck_top_if_all_members_grant") {
      errors.push(`${id} ${trigger}: mill-all-members blade misclassified`);
    }
  }

  if (/メンバーをウェイトにし、手札.*置いてもよい/.test(plain) && cl.costSelfWait && !cl.costHandDiscardOptional) {
    errors.push(`${id} ${trigger}: mandatory wait + optional hand needs costHandDiscardOptional`);
  }

  if (/ちょうど\d+つ/.test(plain) && /元々持つ.*ブレード/.test(plain) && cl.template === "optional_self_wait_opp_stage") {
    if (cl.oppWaitExactPrintedBlade == null) {
      errors.push(`${id} ${trigger}: exact printed blade filter missing`);
    }
  }

  if (/自分と相手のステージ/.test(plain) && /すべてのメンバー/.test(plain) && /ウェイト/.test(plain)) {
    if (cl.template !== "toujou_both_sides_wait_all_printed_blade") {
      errors.push(`${id} ${trigger}: both-sides wait-all printed-blade misclassified`);
    }
  }

  if (/以外のメンバー1人をウェイト/.test(plain) && cl.template === "optional_self_wait_opp_stage") {
    if (!cl.excludedUnit) errors.push(`${id} ${trigger}: opp wait exclude-unit missing`);
  }

  if (/メンバーが持つハートの中に/.test(plain) && /がすべてある場合/.test(plain)) {
    if (!cl.requiresStageCollectiveHeartSlots || cl.requiresStageCollectiveHeartSlots.length < 2) {
      errors.push(`${id} ${trigger}: stage collective heart slots missing`);
    }
  }

  if (/自分のステージに名前の異なるメンバーが\d+人以上/.test(plain) && /このカードのスコア/.test(plain)) {
    if (cl.filters?.minDistinctStageMemberNames == null) {
      errors.push(`${id} ${trigger}: minDistinctStageMemberNames missing`);
    }
  }

  if (
    /エールにより公開/.test(plain) &&
    (/スコアを持つライブカードが1枚以上/.test(plain) ||
      (/を持つライブカードが1枚以上/.test(plain) && /icon_score|スコアを持つライブ/.test(plain)))
    &&
    cl.template === "live_card_score_plus"
  ) {
    if (!cl.requiresYellRevealedOwnLiveCard) {
      errors.push(`${id} ${trigger}: yell-revealed score-live precondition missing`);
    }
  }

  if (/ステージにほかの『/.test(plain) && /メンバーがいる場合/.test(plain)) {
    if ((cl.filters?.minStageSeriesMembers || 0) < 2) {
      errors.push(`${id} ${trigger}: missing other-series minStageSeriesMembers`);
    }
  }

  if (/置いたメンバーカードより、コストの低い/.test(plain) && cl.template === "kidou_hand_cost_wait_pick_hand") {
    if (!cl.pickMaxCostBelowHandDiscarded) errors.push(`${id} ${trigger}: pickMaxCostBelowHandDiscarded`);
    if (!cl.handDiscardMustBeMember) errors.push(`${id} ${trigger}: handDiscardMustBeMember`);
  }

  if (/このターン、自分のステージに『/.test(plain) && /登場している場合/.test(plain) && /エネルギーを\d+枚アクティブ/.test(plain)) {
    if (!cl.requiresSeriesEnteredThisTurn) errors.push(`${id} ${trigger}: requiresSeriesEnteredThisTurn`);
    if (cl.requiresSeriesOnStage) errors.push(`${id} ${trigger}: should not use requiresSeriesOnStage`);
  }

  if (/ライブ中のカードが[０-９\d]+枚以上/.test(plain) && cl.template === "live_card_score_plus") {
    if (cl.filters?.minLiveFrameCount == null) errors.push(`${id} ${trigger}: minLiveFrameCount missing`);
  }

  if (
    /エールにより公開[^。]*?のメンバーカードが[０-９\d]+枚以上/.test(plain) &&
    cl.template === "live_card_score_plus" &&
    !/名前が異なる/.test(plain)
  ) {
    if (cl.filters?.minYellRevealedSeriesMemberCount == null) {
      errors.push(`${id} ${trigger}: minYellRevealedSeriesMemberCount missing`);
    }
  }

  if (/ライブの合計スコアが相手より高い/.test(plain) && cl.template === "live_score_higher_energy_wait") {
    if (!cl.filters?.requiresLiveScoreHigherThanOpponent) {
      errors.push(`${id} ${trigger}: requiresLiveScoreHigherThanOpponent missing`);
    }
  }

  if (
    /ライブの合計スコアが相手より高い/.test(plain) &&
    cl.template === "yell_resolution_pick_hand" &&
    !cl.preconditionFilters?.requiresLiveScoreHigherThanOpponent
  ) {
    errors.push(`${id} ${trigger}: yell pick needs requiresLiveScoreHigherThanOpponent precond`);
  }

  if (/ステージと控え室に名前の異なる/.test(plain) && cl.template === "live_start_need_heart_set_fixed") {
    if (cl.filters?.minDistinctStageAndWaitingNames == null) {
      errors.push(`${id} ${trigger}: minDistinctStageAndWaitingNames missing`);
    }
  }

  if (/のうち1色につき/.test(plain) && cl.template === "live_card_score_plus_per_unit") {
    if (cl.scoreUnitKind !== "distinct_heart_colors_on_stage_members") {
      errors.push(`${id} ${trigger}: distinct_heart_colors_on_stage_members expected`);
    }
  }

  if (
    /成功ライブカード置き場にあるカード1枚につき.*控え室に置く手札の数が1枚減る/.test(plain) &&
    cl.template === "kidou_hand_cost_wait_pick_hand"
  ) {
    if (!cl.handDiscardReducedPerSuccessLive) {
      errors.push(`${id} ${trigger}: handDiscardReducedPerSuccessLive missing`);
    }
  }

  if (
    /『[^』]+』のメンバー1人につき.*エネルギーを\d+枚アクティブ/.test(plain) &&
    !/名前の異なる/.test(plain) &&
    cl.template === "activate_energy"
  ) {
    if (cl.energyActiveUnitKind !== "series_stage_members") {
      errors.push(`${id} ${trigger}: energyActiveUnitKind series_stage_members expected`);
    }
  }

  if (
    /成功ライブカード置き場に『[^』]+』(?:のカード)?がある/.test(plain) &&
    cl.template === "draw_from_deck"
  ) {
    if (cl.filters?.minSuccessLiveSeriesTag == null) {
      errors.push(`${id} ${trigger}: minSuccessLiveSeriesTag missing (success live, not live frame)`);
    }
    if (cl.filters?.minLiveFrameCount != null) {
      errors.push(`${id} ${trigger}: minLiveFrameCount must not apply to success live area`);
    }
  }

  if (/成功ライブカード置き場のカードが0枚/.test(plain) && /このカードのスコア/.test(plain)) {
    if (cl.filters?.maxOwnSuccessLiveCount !== 0) {
      errors.push(`${id} ${trigger}: maxOwnSuccessLiveCount 0 missing`);
    }
  }

  if (
    /ステージに名前の異なる『[^』]+』のメンバーが[０-９\d]+人以上/.test(plain) &&
    cl.template === "live_success_recover_from_waiting"
  ) {
    if (cl.filters?.minDistinctSeriesMemberNames == null) {
      errors.push(`${id} ${trigger}: minDistinctSeriesMemberNames missing (not minStageSeriesMembers)`);
    }
  }

  if (
    /『[^』]+』のメンバーが持つハートに.*合計[０-９\d]+[つ個]以上/.test(plain) &&
    cl.template === "live_card_score_plus"
  ) {
    if (cl.filters?.minStageSeriesHeartSlotTotal == null) {
      errors.push(`${id} ${trigger}: minStageSeriesHeartSlotTotal missing`);
    }
  }

  if (
    /メンバーカードか、必要ハートに.*以上含むライブカード/.test(plain) &&
    cl.template === "deck_top_pick_recover"
  ) {
    if (!cl.filters?.pickFilterAlternatives?.length) {
      errors.push(`${id} ${trigger}: member-or-live heart pickFilterAlternatives missing`);
    }
  }

  if (
    /成功ライブカード置き場かライブ中のライブカード/.test(plain) &&
    /必要ハートに含まれる/.test(plain) &&
    /が[０-９\d]+の『/.test(plain) &&
    cl.template === "live_card_score_plus"
  ) {
    if (cl.minNeedHeartSlot == null || cl.minNeedHeartValue == null) {
      errors.push(`${id} ${trigger}: minNeedHeartSlot/Value missing (success/live frame need-heart gate)`);
    }
  }

  if (/このメンバー以外のコスト[０-９\d]+のメンバー/.test(plain) && cl.template === "toujou_wait_pick_hand") {
    if (cl.filters?.minExactCostMemberOnStage == null || !cl.filters?.excludeSelfFromStageCostCheck) {
      errors.push(`${id} ${trigger}: minExactCostMemberOnStage + excludeSelf missing`);
    }
  }

  if (
    /自分のエネルギーが\d+枚以上ある場合.*ステージにいるこのメンバーのコスト/.test(plain) &&
    cl.kind === "stage_cost_plus"
  ) {
    if (cl.minEnergy == null) {
      errors.push(`${id} ${trigger}: stage_cost_plus minEnergy missing (ある場合)`);
    }
  }

  if (
    /ブレードハートを持たないメンバー/.test(plain) &&
    /ライブカード置き場から控え室/.test(plain) &&
    /カードを1枚引/.test(plain) &&
    cl.template === "grant_jouji_session"
  ) {
    if (!cl.requiresNoBhMemberFromLiveFrameToWaitingThisTurn) {
      errors.push(`${id} ${trigger}: requiresNoBhMemberFromLiveFrameToWaitingThisTurn missing`);
    }
    if (!cl.deckDrawCount) errors.push(`${id} ${trigger}: deckDrawCount missing`);
    if (!cl.grantHeartSlotMap || !Object.keys(cl.grantHeartSlotMap).length) {
      errors.push(`${id} ${trigger}: grantHeartSlotMap missing`);
    }
  }

  return errors;
}
