/**
 * 能力セグメント内の複合効果（複数文・「その後」「これにより」）を
 * ability_sequence テンプレート（既存テンプレートの連鎖）に展開する。
 */
import { T_LIVE } from "./config.js";

/** @param {string} raw */
function segmentPlainText(raw) {
  return String(raw || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
}

/** @param {string} p */
function normalizeFwDigits(p) {
  return String(p || "").replace(/[０-９]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

/** @param {string} p */
function parseLiveCardScorePlusFromText(p) {
  var m = normalizeFwDigits(p).match(/このカードのスコアを[＋+](\d+)/);
  return m ? Number(m[1]) || 0 : 0;
}

/** @param {string} p */
function parseLiveTotalScorePlusFromText(p) {
  var s = normalizeFwDigits(p);
  var m = s.match(/ライブの合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  m = s.match(/合計スコアを[＋+](\d+)/);
  return m ? Number(m[1]) || 0 : 0;
}

/**
 * @param {string} segRaw
 * @returns {string[]}
 */
export function splitAbilitySegmentClauses(segRaw) {
  var s = String(segRaw || "");
  var plain = segmentPlainText(s);
  if (!/これにより|その後、|。合計が/.test(plain)) return [s];

  /** @type {string[]} */
  var out = [];
  var re = /。(?=(?:これにより|その後、|合計が))/;
  var parts = s.split(re);
  var acc = parts[0] || "";
  for (var i = 1; i < parts.length; i++) {
    var chunk = parts[i];
    if (/^(これにより|その後、|合計が)/.test(chunk)) {
      if (acc) out.push(acc);
      acc = chunk;
    } else {
      acc += "。" + chunk;
    }
  }
  if (acc) out.push(acc);
  return out.length > 1 ? out : [s];
}

/**
 * @param {*} card
 * @param {string} trigger
 * @param {string} segRaw
 * @param {import('./abilityEffects.js').ClassifiedAbility} primary
 * @param {(card: *, trigger: string, segRaw?: string, opts?: {skipCompose?: boolean}) => import('./abilityEffects.js').ClassifiedAbility} classifyFn
 * @returns {import('./abilityEffects.js').ClassifiedAbility}
 */
export function applyAbilityComposition(card, trigger, segRaw, primary, classifyFn) {
  if (!card || !trigger || !segRaw) return primary;
  if (primary.template === "ability_sequence" || primary.template === "kidou_multi_choice") return primary;
  if (primary.template === "jidou_yell_retry_no_live") return primary;
  // 複数句を1テンプレートで完結させる専用ハンドラは合成展開しない
  if (
    primary.template === "deck_peek_pick_then_opp_wait" ||
    primary.template === "live_start_sunny_day_song_tiered" ||
    primary.template === "live_start_overflow_heart_tiered_draw_reduce" ||
    primary.template === "live_start_success_score_tiered_reduce_score" ||
    primary.template === "live_start_mill_loop_blade_grant" ||
    primary.template === "live_start_draw_then_formation_change" ||
    primary.template === "toujou_self_wait_draw_then_conditional_discard" ||
    primary.template === "toujou_draw_then_position_change" ||
    primary.template === "draw_then_conditional_extra_draw" ||
    primary.template === "live_success_draw_per_series_then_discard_same" ||
    primary.template === "kidou_hand_reveal_grant_if_live" ||
    primary.template === "live_start_number_reveal_grant_if" ||
    primary.template === "live_start_dollcostra_cost_set_grant_if" ||
    primary.template === "live_start_hand_discard_cost_boost_grant_if" ||
    primary.template === "toujou_both_shuffle_deck_bottom_grant_if" ||
    primary.template === "live_start_optional_shuffle_deck_bottom_grant_if" ||
    primary.template === "live_start_pay_or_discard_conditional_grant_members" ||
    primary.template === "kidou_reveal_live_opp_decline_grant" ||
    primary.template === "live_start_optional_hand_discard_named_followup_blade" ||
    primary.template === "live_start_pick_live_frame_match_success_live_grant" ||
    primary.template === "live_success_optional_energy_wait_opp_draw" ||
    primary.template === "live_start_love_screem_opp_answer" ||
    primary.template === "live_start_activate_energy_all_active_score"
  ) {
    return primary;
  }

  var plain = segmentPlainText(segRaw);

  /** @param {import('./abilityEffects.js').ClassifiedAbility[]} steps */
  function mergeDrawDiscardConditionalGrantSteps(steps, plainFull) {
    if (!steps || steps.length < 2) return steps;
    var drawIdx = -1;
    for (var di = 0; di < steps.length; di++) {
      if (steps[di] && steps[di].template === "draw_then_hand_discard") {
        drawIdx = di;
        break;
      }
    }
    if (drawIdx < 0) return steps;
    if (
      /控え室に置いたカードの中にブレードハートを持たない/.test(plainFull) &&
      /このメンバーをアクティブ/.test(plainFull)
    ) {
      steps[drawIdx] = Object.assign({}, steps[drawIdx], {
        postDiscardActivateIfNonBhMember: true,
      });
      if (/2枚ある場合/.test(plainFull)) {
        steps[drawIdx].postDiscardBladeGainIfNonBhAt = 2;
        steps[drawIdx].postDiscardBladeGainCount = 2;
      }
    }
    return steps.filter(function (st) {
      if (!st || st.template !== "grant_jouji_session") return true;
      if (st.liveScoreGrant && st.liveScoreGrant > 0) return true;
      if (st.grantToNamedStageMemberOptions || st.grantPickStageMembersMax) return true;
      return !(st.bladeGain && st.bladeGain > 0);
    });
  }

  /** @param {import('./abilityEffects.js').ClassifiedAbility[]} steps */
  function stripStepCostsWhenParentPaid(steps, parent) {
    if (!steps || steps.length < 2 || !parent) return steps;
    var parentHasCost =
      parent.costEnergy ||
      parent.costSelfWait ||
      parent.costPickMemberWait ||
      parent.costMandatoryWaitOtherMember ||
      (parent.handDiscardToWaiting && parent.handDiscardToWaiting > 0);
    if (!parentHasCost) return steps;
    return steps.map(function (st) {
      if (!st) return st;
      var copy = Object.assign({}, st);
      copy.handDiscardToWaiting = null;
      copy.costSelfWait = false;
      copy.costPickMemberWait = false;
      copy.costMandatoryWaitOtherMember = false;
      copy.costEnergy = false;
      copy.costEnergyCount = 0;
      copy.costOrAlt = false;
      if (parent.hasOptionalCost || parent.optional) {
        copy.optional = false;
        copy.hasOptionalCost = false;
      }
      return copy;
    });
  }

  /** @param {import('./abilityEffects.js').ClassifiedAbility[]} steps */
  function seq(steps) {
    var usable = steps.filter(function (st) {
      return st && st.template && st.template !== "none" && st.template !== "guided_manual";
    });
    usable = mergeDrawDiscardConditionalGrantSteps(usable, plain);
    usable = stripStepCostsWhenParentPaid(usable, primary);
    if (usable.length === 1) return Object.assign({}, primary, usable[0]);
    if (usable.length < 2) return primary;
    return Object.assign({}, primary, {
      template: "ability_sequence",
      steps: usable,
      optional: primary.optional,
      hasOptionalCost: primary.hasOptionalCost,
      trigger: primary.trigger,
    });
  }

  if (/これによりライブカードを控え室に置いた場合/.test(plain) && /手札.*控え室/.test(plain)) {
    return seq([
      classifyFn(card, trigger, segRaw.split(/。これにより/)[0] + "。", { skipCompose: true }),
      {
        trigger: /** @type {import('./abilityEffects.js').AbilityTrigger} */ (trigger),
        template: "followup_draw_if_live_discarded",
        optional: false,
        hasOptionalCost: false,
        filters: {},
        deckDrawCount: 1,
      },
    ]);
  }

  if (/これにより登場したメンバーがブレードハートを持つ場合/.test(plain) && /このメンバーをウェイトにする/.test(plain)) {
    return seq([
      classifyFn(card, trigger, segRaw.split(/。これにより/)[0] + "。", { skipCompose: true }),
      {
        trigger: /** @type {import('./abilityEffects.js').AbilityTrigger} */ (trigger),
        template: "toujou_self_wait_if_hand_enter_bh",
        optional: false,
        hasOptionalCost: false,
        filters: {},
        requiresOnStage: true,
      },
    ]);
  }

  if (/カードを(\d+)枚引/.test(plain) && /その後、控え室から登場している場合/.test(plain)) {
    return classifyFn(card, trigger, segRaw, { skipCompose: true });
  }

  if (/その後/.test(plain) && /エネルギーがすべてアクティブ/.test(plain) && /このカードのスコア/.test(plain)) {
    var partsEn = splitAbilitySegmentClauses(segRaw);
    var actM = plain.match(/エネルギーを(\d+)枚までアクティブ/);
    var scN = parseLiveCardScorePlusFromText(plain) || 1;
    return seq([
      classifyFn(card, trigger, partsEn[0], { skipCompose: true }),
      {
        trigger: /** @type {import('./abilityEffects.js').AbilityTrigger} */ (trigger),
        template: "live_card_score_plus",
        cardScoreGrant: scN,
        requiresAllEnergyActive: true,
        optional: false,
        hasOptionalCost: false,
        filters: {},
        requiresOnStage: true,
      },
    ]);
  }

  if (/メンバーを(\d+)人までウェイト/.test(plain) && /ウェイト状態にしたメンバー1人につき/.test(plain)) {
    var waitM = plain.match(/メンバーを(\d+)人までウェイト/);
    return Object.assign({}, primary, {
      template: "toujou_multi_wait_draw_per_count",
      optional: true,
      hasOptionalCost: true,
      oppWaitCount: waitM ? Number(waitM[1]) : 3,
      deckDrawCount: 1,
      requiresOnStage: true,
    });
  }

  if (/相手の手札/.test(plain) && /公開/.test(plain) && /ライブカードがない場合/.test(plain)) {
    var revM = plain.match(/(\d+)枚選び公開/);
    return Object.assign({}, primary, {
      template: "toujou_opp_hand_reveal_no_live_draw",
      revealCount: revM ? Number(revM[1]) : 3,
      deckDrawCount: 1,
      requiresOnStage: true,
    });
  }

  if (
    /控え室にあるメンバーカード2枚.*デッキの一番下/.test(plain) &&
    /合計が(\d+)の場合.*合計が(\d+)の場合/.test(normalizeFwDigits(plain))
  ) {
    return primary;
  }
  if (/合計が(\d+)の場合/.test(plain) && /合計が(\d+)の場合.*合計が(\d+)の場合/.test(plain)) {
    var tiered = classifyWaitingReorderTiered(card, trigger, segRaw, classifyFn);
    if (tiered) return tiered;
  }

  var clauses = splitAbilitySegmentClauses(segRaw);
  if (clauses.length > 1) {
    /** @type {import('./abilityEffects.js').ClassifiedAbility[]} */
    var steps = [];
    for (var ci = 0; ci < clauses.length; ci++) {
      var clauseRaw = clauses[ci];
      if (ci > 0 && !/\{\{/.test(clauseRaw) && trigger) {
        clauseRaw = "{{" + trigger + ".png|" + trigger + "}}" + clauseRaw;
      }
      var st = classifyFn(card, trigger, clauseRaw, { skipCompose: true });
      if (st.template === "none" || st.template === "guided_manual") {
        return primary;
      }
      steps.push(st);
    }
    var composed = seq(steps);
    if (composed.template === "ability_sequence") return composed;
    if (steps.length > 1) return composed;
  }

  return primary;
}

/**
 * 控え室2枚→デッキ下＋コスト合計分岐（6/8/25 等）
 * @param {*} card
 * @param {string} trigger
 * @param {string} segRaw
 * @param {Function} classifyFn
 */
function classifyWaitingReorderTiered(card, trigger, segRaw, classifyFn) {
  var plain = segmentPlainText(segRaw);
  if (!/控え室.*メンバー.*デッキの一番下/.test(plain)) return null;
  var head = segRaw.split(/。合計が/)[0] + "。";
  var base = classifyFn(card, trigger, head, { skipCompose: true });
  if (base.template === "guided_manual" || base.template === "none") return null;

  /** @type {import('./abilityEffects.js').ClassifiedAbility[]} */
  var steps = [base];
  var tierRe = /合計が([０-９\d]+)の場合、([^。]+)/g;
  var m;
  while ((m = tierRe.exec(plain)) !== null) {
    var costSum = Number(String(m[1]).replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    }));
    var effectText = m[2];
    if (/カードを1枚引/.test(effectText)) {
      steps.push({
        trigger: /** @type {import('./abilityEffects.js').AbilityTrigger} */ (trigger),
        template: "tiered_cost_draw_if",
        tierCostSum: costSum,
        deckDrawCount: 1,
        optional: false,
        hasOptionalCost: false,
        filters: {},
      });
    } else if (/ライブの合計スコア/.test(effectText)) {
      var sc = parseLiveTotalScorePlusFromText(effectText) || 1;
      steps.push({
        trigger: /** @type {import('./abilityEffects.js').AbilityTrigger} */ (trigger),
        template: "tiered_cost_grant_jouji_score",
        tierCostSum: costSum,
        liveScoreGrant: sc,
        optional: false,
        hasOptionalCost: false,
        filters: {},
      });
    } else if (/を得る/.test(effectText)) {
      steps.push({
        trigger: /** @type {import('./abilityEffects.js').AbilityTrigger} */ (trigger),
        template: "tiered_cost_grant_jouji_session",
        tierCostSum: costSum,
        optional: false,
        hasOptionalCost: false,
        filters: {},
      });
    }
  }
  if (steps.length < 2) return null;
  return Object.assign({}, base, {
    template: "ability_sequence",
    steps: steps,
    tieredWaitingReorder: true,
  });
}

/** @param {*} inst */
/**
 * @param {*} inst
 * @param {(id: string) => * | null | undefined} [resolveInst]
 * @param {string[]} [discardIds]
 */
export function lastCostDiscardedIncludesLive(inst, resolveInst, discardIds) {
  var ids =
    (discardIds && discardIds.length ? discardIds : null) ||
    (inst && inst._lastCostPaidHandDiscardedIds) ||
    [];
  if (!Array.isArray(ids) || !ids.length) return false;
  return ids.some(function (id) {
    var c = resolveInst ? resolveInst(String(id)) : null;
    return c && (c.type === T_LIVE || String(c.type || "") === T_LIVE);
  });
}
