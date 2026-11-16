/** Text-driven patterns shared by the ability classifiers. No card-number dispatch. */
const plain = (raw) => String(raw || '').replace(/\{\{[^|}]+\|([^}]+)\}\}/g, '$1').replace(/\{\{[^}]+\}\}/g, '').normalize('NFKC').replace(/\s+/g, '');
const group = (p) => p.match(/『([^』]+)』/)?.[1] || null;
const heart0Count = (p) => (p.match(/heart0(?![1-9])/g) || []).length;
const quotedNames = (raw) => [...String(raw || '').replace(/\{\{[^}]+\}\}/g, '').matchAll(/「([^」]+)」/g)].map((m) => m[1].trim());
const MEMBER = 'メンバー', LIVE = 'ライブ';
export const COMPLETION_ACTIVE_TEMPLATES = ['toujou_waiting_members_under_self', 'live_start_success_group_extra_yell', 'live_start_group_activated_need_reduce', 'live_start_group_activated_blade_per', 'waiting_live_to_top_if_small',
  'deck_top_peek_under_optional', 'waiting_to_deck_bottom_cost_boost', 'kidou_hand_member_under', 'waiting_to_deck_bottom_ordered', 'live_start_yell_grant_heart_filtered', 'live_start_named_triple_most_score',
  'live_start_cost_boost_activate_draw', 'toujou_both_trim_hand_to', 'live_start_return_boost_other_live', 'waiting_all_shuffle_deck_bottom', 'live_start_wait_members_need_reduce', 'live_start_bounce_enter_same_cost',
  'toujou_energy_under_self_and_other', 'kidou_hand_reveal_deck_bottom_opp_wait', 'live_start_bottom_mill_swap_live', 'yell_reveal_nobh_series_total_score_plus', 'kidou_live_from_waiting_if_empty', 'deck_mill_heart_color_need_reduce',
  'yell_reveal_blade_heart_key_score_plus', 'deck_mill_check_score_plus', 'deck_mill_all_series_activate_energy', 'kidou_member_to_waiting_reenter', 'live_success_energy_under_to_area_draw_discard', 'live_start_series_cost_boost_sum_score',
  'live_success_opp_yell_count_score'];
/** Templates whose cost is not the generic cost dialog (paid inside the handler). */
export const COMPLETION_OWN_COST_TEMPLATES = ['waiting_to_deck_bottom_cost_boost', 'live_start_wait_members_need_reduce', 'kidou_hand_reveal_deck_bottom_opp_wait', 'live_start_bottom_mill_swap_live'];
export const COMPLETION_JIDOU_TEMPLATES = ['jidou_yell_score_group_extra', 'jidou_opp_wait_under_group', 'jidou_opp_wait_group_activate_choice', 'jidou_self_wait_activate_blade', 'jidou_any_member_wait_blade', 'jidou_leave_baton_min_cost_blade', 'jidou_leave_baton_max_cost_blade', 'jidou_waiting_entry_draw', 'jidou_yell_named_center_opp_wait',
  'jidou_leave_optional_deck_bottom_opp_wait', 'jidou_success_placed_effect', 'jidou_waiting_to_deck_blade', 'jidou_alone_series_to_waiting', 'jidou_leave_stage_hand_discard', 'jidou_yell_moved_score_plus', 'jidou_refresh_draw_discard', 'jidou_waiting_to_live_need_reduce'];
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
  const oppYell = p.match(/^エールにより公開された相手のカードの枚数が(\d+)枚以上ある場合、ライブの合計スコアを\+(\d+)する/);
  if (trigger === 'live_success' && oppYell) return { template: 'live_success_opp_yell_count_score', minOppYellRevealedCards: Number(oppYell[1]), liveTotalScorePlus: Number(oppYell[2]) };
  return classifyCompletionActiveMore(p, raw, trigger);
}

function classifyCompletionActiveMore(p, raw, trigger) {
  const [costPart, effectPart] = p.includes(':') ? [p.slice(0, p.indexOf(':')), p.slice(p.indexOf(':') + 1)] : ['', p];
  const peekUnder = p.match(/デッキの上からカードを(\d+)枚見る。その中から(メンバー|ライブ)カードを1枚公開し、このメンバーの下に置いてもよい。残りを控え室に置く/);
  if (peekUnder) return { template: 'deck_top_peek_under_optional', deckTopCount: Number(peekUnder[1]), filters: { pickType: peekUnder[2] === 'ライブ' ? LIVE : MEMBER }, optional: true, requiresOnStage: true };
  const waitingCost = costPart.match(/控え室にある(ブレードハートを持たない)?(?:『([^』]+)』の)?(メンバー|ライブ)?カード(\d+)枚を好きな順番でデッキの下に置く$/);
  const boost = effectPart.match(/^ライブ終了時まで、このメンバーのコストを\+(\d+)する/);
  if (trigger === 'kidou' && waitingCost && boost) return { template: 'waiting_to_deck_bottom_cost_boost', costWaitingToDeckBottomCount: Number(waitingCost[4]), costWaitingFilters: { pickType: waitingCost[3] === 'ライブ' ? LIVE : waitingCost[3] ? MEMBER : null, seriesTag: waitingCost[2] || null, requiresNoBladeHeart: !!waitingCost[1] }, selfCostBoost: Number(boost[1]), handDiscardToWaiting: null, requiresOnStage: true };
  const handUnder = effectPart.match(/^自分の手札から(メンバー|ライブ)カード(\d+)枚をこのメンバーの下に置く。?$/);
  if (trigger === 'kidou' && handUnder) return { template: 'kidou_hand_member_under', filters: { pickType: handUnder[1] === 'ライブ' ? LIVE : MEMBER }, handUnderCount: Number(handUnder[2]), requiresOnStage: true };
  const toBottom = effectPart.match(/^自分の控え室にある(?:(メンバー|ライブ))?カードを(\d+)枚まで好きな順番でデッキの下に置く/);
  if (toBottom) return { template: 'waiting_to_deck_bottom_ordered', waitingPickMax: Number(toBottom[2]), filters: { pickType: toBottom[1] === 'ライブ' ? LIVE : toBottom[1] ? MEMBER : null } };
  const yellGrant = p.match(/^ライブ終了時まで、エールによって公開される自分の(?:コスト(\d+)以下の)?(ブレードハートを持たない)?(メンバー|ライブ)?カードはハートを持つ/);
  const bhKey = String(raw).match(/は\{\{blade_heart(\d+)\.png/);
  if (trigger === 'live_start' && yellGrant && bhKey) return { template: 'live_start_yell_grant_heart_filtered', yellGrantBladeHeartKey: 'b_heart' + bhKey[1].padStart(2, '0'), yellGrantFilters: { pickType: yellGrant[3] === 'ライブ' ? LIVE : yellGrant[3] ? MEMBER : null, maxCost: yellGrant[1] ? Number(yellGrant[1]) : null, requiresNoBladeHeart: !!yellGrant[2] } };
  const triple = p.match(/自分のステージにいる「([^」]+)」1人を選ぶ。自分と相手のステージの中で、そのメンバーが、ほかのすべてのメンバーより多くのハートを持つ場合、このカードのスコアを\+(\d+)する。その後、多くのブレードを持つ場合、コストが高い場合についても同じことを行う/);
  if (trigger === 'live_start' && triple) return { template: 'live_start_named_triple_most_score', namedMember: quotedNames(raw)[0] || triple[1], cardScorePerTier: Number(triple[2]), mostTiers: ['hearts', 'blades', 'cost'] };
  const costBoostAct = effectPart.match(/^ライブ終了時まで、このメンバーのコストを\+(\d+)する。その後、このメンバーのコストが(\d+)以上の場合、このメンバーをアクティブにし、カードを(\d+)枚引く/);
  if (costBoostAct) return { template: 'live_start_cost_boost_activate_draw', selfCostBoost: Number(costBoostAct[1]), followupMinCost: Number(costBoostAct[2]), followupDrawCount: Number(costBoostAct[3]), requiresOnStage: true };
  const trim = p.match(/^自分と相手はそれぞれ自身の手札の枚数が(\d+)枚になるまで手札を控え室に置く。?$/);
  if (trim) return { template: 'toujou_both_trim_hand_to', targetHandSize: Number(trim[1]) };
  const retBoost = p.match(/自分のライブカード置き場にカードが(\d+)枚以上あり、かつ『([^』]+)』のみの場合、このカードを手札に戻し、手札を(\d+)枚控え室に置く。そうしたとき、自分のライブカード置き場にあるカード1枚のスコアを\+(\d+)し、必要ハートを((?:heart0)+)増やす/);
  if (trigger === 'live_start' && retBoost) return { template: 'live_start_return_boost_other_live', minLiveAreaCards: Number(retBoost[1]), liveAreaOnlySeriesTag: retBoost[2], effectDiscardCount: Number(retBoost[3]), cardScoreGrant: Number(retBoost[4]), needHeartIncreaseMap: { heart0: heart0Count(retBoost[5]) } };
  const shuffleAll = effectPart.match(/^自分の控え室にあるすべての(?:コスト(\d+)以下の)?(?:『([^』]+)』の)?(メンバー|ライブ)カードをシャッフルし、デッキの下に置く。?$/);
  if (shuffleAll) return { template: 'waiting_all_shuffle_deck_bottom', filters: { pickType: shuffleAll[3] === 'ライブ' ? LIVE : MEMBER, maxCost: shuffleAll[1] ? Number(shuffleAll[1]) : null, seriesTag: shuffleAll[2] || null } };
  const waitN = costPart.match(/^メンバー(\d+)人をウェイトにしてもよい$/);
  const needRed = effectPart.match(/^このカードの必要ハートを((?:heart0)+)減らす/);
  if (trigger === 'live_start' && waitN && needRed) return { template: 'live_start_wait_members_need_reduce', costWaitMemberCount: Number(waitN[1]), needHeartReduceMap: { heart0: heart0Count(needRed[1]) }, skipNextActivate: /これによりウェイトにしたメンバーは、次のターンのアクティブフェイズにアクティブ(?:し|になら)ない/.test(effectPart), optional: true, hasOptionalCost: true, costPickMemberWait: false, costSelfWait: false };
  const bounce = p.match(/自分のステージにいる『([^』]+)』のメンバー1人を手札に戻してもよい。そうしたとき、自分の手札から、これにより手札に戻したメンバーと同じコストを持つ『([^』]+)』のメンバーカード1枚を、自分のステージのメンバーのいないエリアに登場させる/);
  if (bounce) return { template: 'live_start_bounce_enter_same_cost', filters: { pickType: MEMBER, seriesTag: bounce[1] }, enterFilters: { pickType: MEMBER, seriesTag: bounce[2] }, suppressEnteredToujou: /これにより登場したメンバーの登場能力は発動しない/.test(p), optional: true };
  const energyUnder = p.match(/^このメンバーと自分のステージにいるほかの『([^』]+)』のメンバー1人の下に、自分のエネルギー置き場にあるエネルギーをそれぞれ1枚まで置く/);
  if (energyUnder) return { template: 'toujou_energy_under_self_and_other', filters: { pickType: MEMBER, seriesTag: energyUnder[1] }, requiresOnStage: true, optional: true };
  const handBottom = p.match(/^このカードを手札から公開する:このカードをデッキの一番下に置く。その後、自分のステージに『([^』]+)』のメンバーがいる場合、相手のステージにいるコスト(\d+)以下のメンバー1人をウェイトにする/);
  if (trigger === 'kidou' && handBottom) return { template: 'kidou_hand_reveal_deck_bottom_opp_wait', requiresInHandOnly: /このカードが手札にある場合のみ起動できる/.test(p), requiresOnStage: false, stageSeriesTag: handBottom[1], oppWaitMaxCost: Number(handBottom[2]), oppWaitCount: 1, handDiscardToWaiting: null };
  const swap = p.match(/^デッキの一番下のカードを控え室に置いてもよい:これにより控え室に置いたカードがライブカードの場合、自分のライブカード置き場にあるスコア(\d+)以下の『([^』]+)』のライブカード1枚をデッキの一番上に置く。そうしたとき、自分の控え室からライブカード1枚を表向きでライブカード置き場に置く/);
  if (trigger === 'live_start' && swap) return { template: 'live_start_bottom_mill_swap_live', filters: { pickType: LIVE, seriesTag: swap[2], pickMaxScore: Number(swap[1]) }, optional: true, hasOptionalCost: true, handDiscardToWaiting: null };
  const yellNoBh = p.match(/^エールにより公開された自分のカードの中にブレードハートを持たない『([^』]+)』のメンバーカードが(\d+)枚以上ある場合、ライブの合計スコアを\+(\d+)する。?$/);
  if (yellNoBh) return { template: 'yell_reveal_nobh_series_total_score_plus', seriesTag: yellNoBh[1], minYellNoBhSeriesMembers: Number(yellNoBh[2]), liveTotalScorePlus: Number(yellNoBh[3]) };
  const liveFromWaiting = effectPart.match(/^自分のライブカード置き場にカードがない場合、自分の控え室から(?:『([^』]+)』の)?ライブカードを1枚、表向きでライブカード置き場に置く。(?:次のライブカードセットフェイズで自分がライブカード置き場に置けるカード枚数の上限が(\d+)枚減る)?/);
  if (trigger === 'kidou' && liveFromWaiting) return { template: 'kidou_live_from_waiting_if_empty', filters: { pickType: LIVE, seriesTag: liveFromWaiting[1] || null }, liveSetLimitPenalty: liveFromWaiting[2] ? Number(liveFromWaiting[2]) : 0, requiresOnStage: true };
  if (/^自分のデッキの一番上のカードを控え室に置く。これにより控え室に置いたカードがメンバーカードの場合、そのメンバーカードが持つハートの色が、自分のステージにいるすべてのメンバーが持つハートの色の中にすべて含まれる場合、その含まれるハートの色1つにつき、このカードの必要ハートを((?:heart0)+)減らす/.test(p)) {
    return { template: 'deck_mill_heart_color_need_reduce', deckMillCount: 1, needHeartReducePerColor: heart0Count(p.match(/必要ハートを((?:heart0)+)減らす/)[1]) };
  }
  const bhKeyCount = String(raw).match(/エールにより公開された自分のカードの中に\{\{blade_heart(\d+)\.png\|[^}]*\}\}を持つカードが([0-9０-９]+)枚以上ある場合、このカードのスコアを[＋+]([0-9０-９]+)/);
  if (bhKeyCount) return { template: 'yell_reveal_blade_heart_key_score_plus', bladeHeartKey: 'b_heart' + bhKeyCount[1].padStart(2, '0'), minYellBladeHeartKeyCards: Number(bhKeyCount[2].normalize('NFKC')), cardScoreGrant: Number(bhKeyCount[3].normalize('NFKC')) };
  const millCheck = p.match(/^自分のデッキの上からカードを(\d+)枚控え室に置く。それらの中に(?:コスト(\d+)以上の)?(ブレードハートを持たない)?(?:『([^』]+)』の)?(メンバー|ライブ)カードがある場合、このカードのスコアを\+(\d+)する/);
  if (millCheck) return { template: 'deck_mill_check_score_plus', deckMillCount: Number(millCheck[1]), millMatchFilters: { pickType: millCheck[5] === 'ライブ' ? LIVE : MEMBER, minCost: millCheck[2] ? Number(millCheck[2]) : null, requiresNoBladeHeart: !!millCheck[3], seriesTag: millCheck[4] || null }, cardScoreGrant: Number(millCheck[6]) };
  const millAll = p.match(/^自分のデッキの上からカードを(\d+)枚控え室に置く。それらがすべて『([^』]+)』のカードの場合、エネルギーを(\d+)枚アクティブにする/);
  if (millAll) return { template: 'deck_mill_all_series_activate_energy', deckMillCount: Number(millAll[1]), millAllSeriesTag: millAll[2], energyActiveCount: Number(millAll[3]) };
  const reenter = effectPart.match(/^自分のステージにいるこのメンバー以外の『([^』]+)』のメンバー1人を控え室に置く。そうしたとき、自分の控え室から、これによりステージから控え室に置いたメンバーカードを1枚、そのメンバーがいたエリアに登場させる/);
  if (trigger === 'kidou' && reenter) return { template: 'kidou_member_to_waiting_reenter', filters: { pickType: MEMBER, seriesTag: reenter[1] }, requiresOnStage: true };
  const energyBack = p.match(/^自分のステージにいるメンバー1人の下にあるエネルギーカード1枚を、自分のエネルギー置き場にウェイト状態で置いてもよい。そうしたとき、カードを(\d+)枚引き、手札を(\d+)枚控え室に置く/);
  if (energyBack) return { template: 'live_success_energy_under_to_area_draw_discard', followupDrawCount: Number(energyBack[1]), followupDiscardCount: Number(energyBack[2]), optional: true, handDiscardToWaiting: null, deckDrawCount: null };
  const seriesBoost = p.match(/^ライブ終了時まで、『([^』]+)』のメンバー1人のコストを\+(\d+)する。その後、自分のステージにいる『([^』]+)』のメンバーのコストが合計(\d+)以上の場合、このカードのスコアを\+(\d+)する/);
  if (trigger === 'live_start' && seriesBoost) return { template: 'live_start_series_cost_boost_sum_score', filters: { pickType: MEMBER, seriesTag: seriesBoost[1] }, selfCostBoost: Number(seriesBoost[2]), costSumSeriesTag: seriesBoost[3], minSeriesCostSum: Number(seriesBoost[4]), cardScoreGrant: Number(seriesBoost[5]) };
  const recover = effectPart.match(/^自分の控え室から(?:スコア(\d+)以下の)?(?:『([^』]+)』の)?(メンバー|ライブ)カードを1枚手札に加える。?$/);
  if (trigger === 'live_success' && recover && /^手札を\d+枚控え室に置いてもよい$/.test(costPart)) return { template: 'live_success_recover_from_waiting', recoverPickFilters: { pickType: recover[3] === 'ライブ' ? LIVE : MEMBER, pickMaxScore: recover[1] ? Number(recover[1]) : null, seriesTag: recover[2] || null } };
  const surplusSlot = p.match(/^自分が持つ余剰ハートのheart0([1-6])(\d+)つにつき、このカードのスコアを\+(\d+)する。(その後、自分は余剰ハートをすべて失う。)?(?:この能力ではスコアは\+(\d+)までしか増えない)?/);
  if (surplusSlot) return { template: 'live_success_surplus_heart_score_plus', surplusHeartSlot: Number(surplusSlot[1]), perSurplusUnit: Number(surplusSlot[2]), cardScoreGrant: Number(surplusSlot[3]), loseAllSurplusHearts: !!surplusSlot[4], maxScoreGrant: surplusSlot[5] ? Number(surplusSlot[5]) : null, minSurplusHearts: 0 };
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
  if (/ステージから控え室に置かれたとき.*コスト(\d+)以下のメンバーとバトンタッチしていた場合.*登場したメンバーは/.test(p)) return { ...base, template: 'jidou_leave_baton_max_cost_blade', eventKind: 'leave_stage_baton', maxBatonCost: Number(p.match(/コスト(\d+)以下/)[1]), bladeGain: (p.match(/ブレード/g) || []).length };
  if (/自分の控え室からメンバーが登場したとき、カードを(\d+)枚引く/.test(p)) return { ...base, template: 'jidou_waiting_entry_draw', eventKind: 'stage_entry', deckDrawCount: Number(p.match(/カードを(\d+)枚引く/)[1]) };
  if (/自分がエールしたとき.*かつ自分のセンターエリアにコスト(\d+)以上/.test(p) && /相手のステージ.*元々持つハートの数が(\d+)つ以下/.test(p)) return { ...base, template: 'jidou_yell_named_center_opp_wait', eventKind: 'yell', requiredNames: [...p.matchAll(/「([^」]+)」/g)].map((m) => m[1]), seriesTag: group(p), minCenterCost: Number(p.match(/センターエリアにコスト(\d+)以上/)[1]), maxPrintedHearts: Number(p.match(/元々持つハートの数が(\d+)つ以下/)[1]) };
  // More specific than the generic baton/energy parser (which loses extra-draw thresholds).
  if (/ステージから控え室/.test(p) && /バトンタッチ/.test(p) && /ブレードハートを持たない/.test(p) && /エネルギーを\d+枚アクティブ/.test(p) && /さらに.*カードを\d+枚引/.test(p)) {
    const costs = [...p.matchAll(/コスト(\d+)以上/g)].map((m) => Number(m[1]));
    return { ...base, template: 'jidou_leave_baton_partner_bh_threshold_energy', eventKind: 'leave_stage_baton', filters: { seriesTag: group(p), minCost: costs[0], requireNoBladeHeart: true }, batonPartnerBhThreshold: costs[0], batonPartnerDrawBhThreshold: costs[1], energyActiveCount: Number(p.match(/エネルギーを(\d+)枚/)[1]), deckDrawCount: Number(p.match(/カードを(\d+)枚引/)[1]) };
  }
  return classifyCompletionJidouMore(p.replace(/^(?:自動)?(?:ターン\d回)?/, ''), base);
}

function classifyCompletionJidouMore(p, base) {
  const leaveBottom = p.match(/^このメンバーがステージから控え室に置かれたとき、このカードをデッキの一番下に置いてもよい。そうしたとき、相手のステージにいる(?:元々持つハートの数が(\d+)つ以下の|コスト(\d+)以下の)?メンバー1人をウェイトにする/);
  if (leaveBottom) return { ...base, template: 'jidou_leave_optional_deck_bottom_opp_wait', eventKind: 'leave_stage', maxPrintedHearts: leaveBottom[1] ? Number(leaveBottom[1]) : null, oppWaitMaxCost: leaveBottom[2] ? Number(leaveBottom[2]) : 99 };
  const successPlaced = p.match(/^このカードが成功ライブカード置き場に置かれたとき、(?:自分の成功ライブカード置き場にあるカードが(\d+)枚以下の場合、)?(.+)$/);
  if (successPlaced) return { ...base, template: 'jidou_success_placed_effect', eventKind: 'placed_success_live', maxSuccessLiveCount: successPlaced[1] != null ? Number(successPlaced[1]) : null, effectRaw: successPlaced[2] };
  const toDeckBlade = p.match(/^自分の控え室にあるカードがデッキに置かれたとき、ライブ終了時まで、((?:ブレード)+)を得る/);
  if (toDeckBlade) return { ...base, template: 'jidou_waiting_to_deck_blade', eventKind: 'waiting_to_deck', bladeGain: (toDeckBlade[1].match(/ブレード/g) || []).length };
  const alone = p.match(/^自分のステージにほかの『([^』]+)』のメンバーがいないとき、このメンバーを控え室に置く/);
  if (alone) return { ...base, template: 'jidou_alone_series_to_waiting', eventKind: 'stage_state', seriesTag: alone[1] };
  const leaveDiscard = p.match(/^このメンバーがステージから控え室に置かれたとき、手札を(\d+)枚控え室に置く。?$/);
  if (leaveDiscard) return { ...base, template: 'jidou_leave_stage_hand_discard', eventKind: 'leave_stage', handDiscardToWaiting: Number(leaveDiscard[1]) };
  const yellMoved = p.match(/^エールによって公開された自分のカードが、自分のカードの効果によっていずれかの領域に移動したとき、このカードのスコアを\+(\d+)する/);
  if (yellMoved) return { ...base, template: 'jidou_yell_moved_score_plus', eventKind: 'yell_card_moved_by_effect', cardScoreGrant: Number(yellMoved[1]) };
  const refresh = p.match(/^自分のデッキがリフレッシュしたとき、カードを(\d+)枚引き、手札を(\d+)枚控え室に置く/);
  if (refresh) return { ...base, template: 'jidou_refresh_draw_discard', eventKind: 'deck_refresh', deckDrawCount: Number(refresh[1]), handDiscardToWaiting: Number(refresh[2]) };
  const toLive = p.match(/^このカードが控え室からライブカード置き場に置かれたとき、このカードの必要ハートを((?:heart0)+)減らす/);
  if (toLive) return { ...base, template: 'jidou_waiting_to_live_need_reduce', eventKind: 'live_placed_on_frame', requireFromWaiting: true, needHeartReduceMap: { heart0: heart0Count(toLive[1]) } };
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
  const mirror = p.match(/下に置かれている((?:「[^」]+」、?)+)のメンバーカードが持つ((?:(?:起動|登場|ライブ開始時|ライブ成功時)能力と?)+)をすべて得る/);
  if (mirror) {
    const triggerOf = { 起動: 'kidou', 登場: 'toujyou', ライブ開始時: 'live_start', ライブ成功時: 'live_success' };
    const mirrorTriggers = [...mirror[2].matchAll(/(起動|登場|ライブ開始時|ライブ成功時)能力/g)].map((m) => triggerOf[m[1]]);
    const kind = mirrorTriggers.length === 2 && mirrorTriggers.includes('kidou') && mirrorTriggers.includes('live_start') ? 'mirror_under_card_kidou_live_start' : 'mirror_under_card_named';
    return { kind, mirrorUnderNames: quotedNames(raw), mirrorTriggers, mirrorUnderMaxCost: 99, seriesTag: null, requiresStageOnly: true };
  }
  const grantQuoted = String(raw).match(/^[\s\S]*?自分のステージにいる『([^』]+)』のメンバーは、「([\s\S]+)」を得る/);
  const batonValue = p.match(/ウェイト状態のこのメンバーが『([^』]+)』のメンバーとバトンタッチするときに減る値は、このメンバーのコストに(\d+)足した値に等しくなる/);
  if (grantQuoted && batonValue) return { kind: 'stage_series_grant_quoted', seriesTag: group(p), grantedSegmentRaw: grantQuoted[2], grantedEffect: 'baton_wait_reduce_cost_plus', batonPartnerSeriesTag: batonValue[1], batonReducePlus: Number(batonValue[2]), requiresStageOnly: true };
  const scoreTotal = p.match(/自分のカードの効果によって成功ライブカード置き場にあるライブカードのスコアの合計を参照するとき、自分の成功ライブカード置き場にカードがあるかぎり、その合計の値を\+(\d+)する/);
  if (scoreTotal) return { kind: 'success_live_score_total_plus', successLiveScoreTotalPlus: Number(scoreTotal[1]), requiresStageOnly: true };
  const cannotPlay = p.match(/^自分のステージに『([^』]+)』のメンバーがいないかぎり、このカードをプレイできない/);
  if (cannotPlay) return { kind: 'cannot_play_without_series', seriesTag: cannotPlay[1] };
  const lockKidou = p.match(/^自分のステージに(アクティブ状態の)?「([^」]+)」がいるかぎり、(自分と相手|自分|相手)のステージにいるコスト(\d+)以下のメンバーの起動能力は起動できない/);
  if (lockKidou) return { kind: 'lock_kidou_while_named_active', requiredName: quotedNames(raw)[0] || lockKidou[2], requiredActive: !!lockKidou[1], lockSides: lockKidou[3] === '自分と相手' ? ['own', 'opponent'] : lockKidou[3] === '相手' ? ['opponent'] : ['own'], lockMaxCost: Number(lockKidou[4]), requiresStageOnly: true };
  const immune = p.match(/^自分のステージに「([^」]+)」がいるかぎり、このメンバーは、相手のカードの効果によってはウェイトしない/);
  if (immune) return { kind: 'immune_opp_wait_while_named', requiredName: quotedNames(raw)[0] || immune[1], requiresStageOnly: true };
  const energyDeck = p.match(/^手札にあるこのメンバーカードのコストは、自分のエネルギーデッキのカード1枚につき、(\d+)増える/);
  if (energyDeck) return { kind: 'hand_cost_plus_per_energy_deck', handCostPlusPerEnergyDeck: Number(energyDeck[1]) };
  const distinctUnder = p.match(/^このメンバーの下に置かれているコストの異なるメンバーカード1枚につき、このメンバーのコストを\+(\d+)し、((?:heart0[1-6])*)((?:ブレード)*)を得る/);
  if (distinctUnder) {
    const heartSlots = {};
    for (const m of distinctUnder[2].matchAll(/heart0([1-6])/g)) heartSlots[m[1]] = (heartSlots[m[1]] || 0) + 1;
    return { kind: 'per_distinct_cost_under_cost_heart_blade', stageCostPlusPerUnit: Number(distinctUnder[1]), heartPerUnit: heartSlots, bladePerUnit: (distinctUnder[3].match(/ブレード/g) || []).length, requiresStageOnly: true };
  }
  const perCost = p.match(/^このメンバーのコスト(\d+)につき、((?:ブレード)+)を得る/);
  if (perCost) return { kind: 'blade_per_self_cost', costUnit: Number(perCost[1]), bladePerUnit: (perCost[2].match(/ブレード/g) || []).length, requiresStageOnly: true };
  const handBelow = p.match(/^自分の手札が(\d+)枚より少ないかぎり、その差に等しい数のブレードを得る/);
  if (handBelow) return { kind: 'blade_per_hand_below', handBelow: Number(handBelow[1]), requiresStageOnly: true };
  const bothHeart = p.match(/^自分のステージにいるすべての『([^』]+)』のメンバーと相手のステージにいるすべてのメンバーは((?:heart0[1-6])+)を得る/);
  if (bothHeart) {
    const heartSlots = {};
    for (const m of bothHeart[2].matchAll(/heart0([1-6])/g)) heartSlots[m[1]] = (heartSlots[m[1]] || 0) + 1;
    return { kind: 'heart_grant_own_series_and_opponent_all', seriesTag: bothHeart[1], grantHeartSlots: heartSlots, requiresStageOnly: true };
  }
  return null;
}
