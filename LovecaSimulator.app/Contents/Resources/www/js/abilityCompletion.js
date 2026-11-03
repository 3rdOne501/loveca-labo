/** Text-driven patterns shared by the ability classifiers. No card-number dispatch. */
const plain = (raw) => String(raw || '').replace(/\{\{[^|}]+\|([^}]+)\}\}/g, '$1').replace(/\{\{[^}]+\}\}/g, '').normalize('NFKC').replace(/\s+/g, '');
const group = (p) => p.match(/『([^』]+)』/)?.[1] || null;
export const COMPLETION_ACTIVE_TEMPLATES = ['toujou_waiting_members_under_self', 'live_start_success_group_extra_yell', 'live_start_group_activated_need_reduce', 'live_start_group_activated_blade_per', 'waiting_live_to_top_if_small'];
export const COMPLETION_JIDOU_TEMPLATES = ['jidou_yell_score_group_extra', 'jidou_opp_wait_under_group', 'jidou_opp_wait_group_activate_choice', 'jidou_self_wait_activate_blade', 'jidou_any_member_wait_blade', 'jidou_leave_baton_min_cost_blade', 'jidou_waiting_entry_draw', 'jidou_yell_named_center_opp_wait'];
export function classifyCompletionActive(raw, trigger) {
  const p = plain(raw);
  if (trigger === 'toujyou' && /デッキの上から、10から自分の手札の枚数を引いた数/.test(p) && /その中から2枚まで手札に加える。残りを控え室/.test(p)) return { template: 'deck_top_pick_recover', deckTopCountFromHandLimit: 10, deckTopPickMax: 2, filters: {}, requiresOnStage: true };
  const under = p.match(/自分の控え室にある『([^』]+)』のメンバーカード(\d+)枚をこのメンバーの下に置く/);
  if (trigger === 'toujyou' && under) return { template: 'toujou_waiting_members_under_self', waitingUnderCount: Number(under[2]), filters: { pickType: 'メンバー', seriesTag: under[1] }, requiresOnStage: true };
  const extra = p.match(/成功ライブカード置き場に『([^』]+)』のカードが(\d+)枚以上ある場合.*エールによって公開される自分のカードの枚数が(\d+)枚増える/);
  if (trigger === 'live_start' && extra) return { template: 'live_start_success_group_extra_yell', successGroup: extra[1], minSuccessGroupCount: Number(extra[2]), extraYellCount: Number(extra[3]) };
  if (trigger === 'live_start' && /このターン中.*ウェイト状態からアクティブにしていたメンバー1人につき/.test(p) && /ブレード/.test(p)) return { template: 'live_start_group_activated_blade_per', activationGroup: group(p), bladeGainPerActivated: (p.match(/ブレード/g) || []).length, requiresOnStage: true };
  if (trigger === 'live_start' && /このターン中.*ウェイト状態からアクティブにしていた/.test(p) && /必要ハート/.test(p)) {
    let total = 0;
    const tiers = [...p.matchAll(/(?:必要ハートを|さらに)((?:heart0)+)減らす/g)].map((m) => (total += (m[1].match(/heart0/g) || []).length));
    if (tiers.length) return { template: 'live_start_group_activated_need_reduce', activationGroup: group(p), needHeartReductionTiers: tiers };
  }
  const top = p.match(/控え室にあるカードが(\d+)枚以下の場合.*ライブカードを(\d+)枚まで選び.*デッキの上に好きな順番/);
  if (trigger === 'live_start' && top) return { template: 'waiting_live_to_top_if_small', maxWaitingCount: Number(top[1]), waitingPickMax: Number(top[2]), filters: { pickType: 'ライブ' } };
  const remap = String(raw).match(/すべて\{\{blade_heart0?([1-6])\.png/);
  if (trigger === 'live_start' && /エールによって公開される自分のカードが持つ/.test(p) && remap) return { template: 'live_start_yell_blade_remap_slot', yellBladeRemapSlot: Number(remap[1]) };
  // Mandatory self-wait/hand cost, and a target whose printed hearts are bounded.
  const hearts = p.match(/元々持つハートの数が(\d+)つ以下/);
  if (hearts && /相手のステージ.*ウェイトにする/.test(p) && ['kidou', 'toujyou', 'live_start', 'live_success'].includes(trigger)) return { ...(p.split(':')[0].includes('もよい') && p.includes(':') ? { optional: true, hasOptionalCost: true, costHandDiscardOptional: false } : {}), requiresOnStage: trigger === 'kidou', template: 'optional_self_wait_opp_stage', oppWaitMaxPrintedHearts: Number(hearts[1]), oppWaitMaxCost: 99, oppWaitCount: 1, filters: {}, skipNextActivate: /次のターンのアクティブフェイズにアクティブにならない/.test(p) };
  if (trigger === 'live_success' && /相手のステージにいるコスト(\d+)以下/.test(p) && /次のターンのアクティブフェイズにアクティブにならない/.test(p)) return { template: 'optional_self_wait_opp_stage', oppWaitMaxCost: Number(p.match(/コスト(\d+)以下/)[1]), oppWaitCount: 1, skipNextActivate: true, filters: {} };
  return null;
}
export function classifyCompletionJidou(raw, perTurnLimit) {
  const p = plain(raw), base = { perTurnLimit };
  if (/エールにより公開.*スコアを持つ『[^』]+』のカード1枚につき、1枚追加でエール/.test(p)) return { ...base, template: 'jidou_yell_score_group_extra', eventKind: 'yell', seriesTag: group(p) };
  if (/相手のステージ.*自分のカードの効果によってウェイト.*下に置かれているカードが(\d+)枚以下/.test(p)) return { ...base, template: 'jidou_opp_wait_under_group', eventKind: 'opp_wait_from_effect', maxUnderBefore: Number(p.match(/下に置かれているカードが(\d+)枚以下/)[1]), seriesTag: group(p) };
  if (/自分の『[^』]+』のカードの効果によって、相手のステージ.*ウェイト.*以下から1つ/.test(p)) return { ...base, template: 'jidou_opp_wait_group_activate_choice', eventKind: 'opp_wait_from_effect', sourceGroup: group(p), seriesTag: group(p), energyActiveCount: Number(p.match(/エネルギーを(\d+)枚/)[1]) };
  if (/このメンバーが、自分のカードの能力のコストを支払うためか、自分のカードの効果によってウェイト/.test(p)) return { ...base, template: 'jidou_self_wait_activate_blade', eventKind: 'self_active_to_wait', bladeGain: 1 };
  if (/自分か相手のステージにいるメンバーがウェイト状態になるたび/.test(p)) return { ...base, template: 'jidou_any_member_wait_blade', eventKind: 'any_member_became_wait', bladeGain: 1 };
  if (/ステージから控え室に置かれたとき.*コスト(\d+)以上のメンバーとバトンタッチしていた場合.*登場したメンバーは/.test(p)) return { ...base, template: 'jidou_leave_baton_min_cost_blade', eventKind: 'leave_stage_baton', minBatonCost: Number(p.match(/コスト(\d+)以上/)[1]), bladeGain: (p.match(/ブレード/g) || []).length };
  if (/自分の控え室からメンバーが登場したとき、カードを(\d+)枚引く/.test(p)) return { ...base, template: 'jidou_waiting_entry_draw', eventKind: 'stage_entry', deckDrawCount: Number(p.match(/カードを(\d+)枚引く/)[1]) };
  if (/自分がエールしたとき.*かつ自分のセンターエリアにコスト(\d+)以上/.test(p) && /相手のステージ.*元々持つハートの数が(\d+)つ以下/.test(p)) return { ...base, template: 'jidou_yell_named_center_opp_wait', eventKind: 'yell', requiredNames: [...p.matchAll(/「([^」]+)」/g)].map((m) => m[1]), seriesTag: group(p), minCenterCost: Number(p.match(/センターエリアにコスト(\d+)以上/)[1]), maxPrintedHearts: Number(p.match(/元々持つハートの数が(\d+)つ以下/)[1]) };
  // More specific than the generic baton/energy parser (which loses extra-draw thresholds).
  if (/ステージから控え室/.test(p) && /バトンタッチ/.test(p) && /ブレードハートを持たない/.test(p) && /エネルギーを\d+枚アクティブ/.test(p) && /さらに.*カードを\d+枚引/.test(p)) {
    const costs = [...p.matchAll(/コスト(\d+)以上/g)].map((m) => Number(m[1]));
    return { ...base, template: 'jidou_leave_baton_partner_bh_threshold_energy', eventKind: 'leave_stage_baton', filters: { seriesTag: group(p), minCost: costs[0], requireNoBladeHeart: true }, batonPartnerBhThreshold: costs[0], batonPartnerDrawBhThreshold: costs[1], energyActiveCount: Number(p.match(/エネルギーを(\d+)枚/)[1]), deckDrawCount: Number(p.match(/カードを(\d+)枚引/)[1]) };
  }
  return null;
}
export function classifyCompletionJouji(raw) {
  const p = plain(raw);
  const front = p.match(/このメンバーの正面のエリアには、元々持つハートの数が(\d+)つ以下.*ウェイト状態で登場/);
  if (front) return { kind: 'opponent_front_enter_wait', maxPrintedHearts: Number(front[1]), requiresStageOnly: true };
  const waitCost = p.match(/名前の異なる『([^』]+)』のメンバーを(\d+)人ウェイトにしてもよい.*コストは(\d+)減る/);
  if (waitCost) return { kind: 'play_cost_reduce_wait_distinct', seriesTag: waitCost[1], waitCount: Number(waitCost[2]), playCostReduce: Number(waitCost[3]) };
  const count = p.match(/自分の『([^』]+)』のカードの効果によって.*このカードは(\d+)枚として扱う/);
  if (count) return { kind: 'success_count_for_group', seriesTag: count[1], countAs: Number(count[2]) };
  return null;
}
