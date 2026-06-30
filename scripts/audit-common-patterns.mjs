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

  return errors;
}
