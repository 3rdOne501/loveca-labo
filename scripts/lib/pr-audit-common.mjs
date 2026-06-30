/**
 * PR カード監査の共通チェック（μ's PR 再監査で見つかったパターンの横展開）
 */

/**
 * @param {string} id
 * @param {{ trigger?: string, text: string }} seg
 * @param {string} plain
 * @param {{ template?: string, filters?: object, requiresBatonFromLowerCostMember?: boolean }} cl
 * @param {string[]} errors
 */
export function applyPrCrossCuttingChecks(id, seg, plain, cl, errors) {
  if (/必要ハートに.*heart0?3.*3以上/.test(plain) && seg.trigger === "kidou") {
    if (cl.filters?.minNeedHeartSlot !== 3 || cl.filters?.minNeedHeartValue !== 3) {
      errors.push(`${id} ${seg.trigger}: heart03x3 need-heart filter missing`);
    }
  }
  if (/必要ハートに.*heart0?1.*3以上/.test(plain) && seg.trigger === "kidou") {
    if (cl.filters?.minNeedHeartSlot !== 1 || cl.filters?.minNeedHeartValue !== 3) {
      errors.push(`${id} ${seg.trigger}: heart01x3 need-heart filter missing`);
    }
  }
  if (/コストが低いメンバーからバトンタッチ/.test(plain) && /手札からコスト4以下/.test(plain)) {
    if (!cl.requiresBatonFromLowerCostMember) {
      errors.push(`${id} ${seg.trigger}: baton-from-lower-cost flag missing`);
    }
  }
  if (/相手の手札を.*見ないで3枚選び公開/.test(plain)) {
    if (cl.template !== "toujou_opp_hand_reveal_no_live_draw") {
      errors.push(`${id} ${seg.trigger}: opp hand reveal misclassified`);
    }
  }
  if (/すべてのコスト\d+以下/.test(plain) && /ウェイト/.test(plain) && seg.trigger === "toujyou") {
    if (cl.template !== "ability_pick_one") {
      errors.push(`${id} ${seg.trigger}: opp-wait-all should be ability_pick_one`);
    }
  }
}
