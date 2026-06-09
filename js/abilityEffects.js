/**
 * カード能力文の分類（cards.json の `ability` フィールド）。
 * ソロプレイの自動処理テンプレートと、手動ガイドへの振り分けに使う。
 */
import { T_LIVE, T_MEMBER } from "./config.js";
import { catalogCardMatchesGroupTag } from "./cardGroups.js";
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
 *   |'optional_self_wait_opp_stage'
 *   |'toujou_deck_top_liella_live_pick'
 *   |'live_start_named_member_heart_blades'
 *   |'live_success_characters_draw'
 *   |'heart_color_pick_grant'
 *   |'kidou_reveal_hand_cost_threshold'
 *   |'deck_top_count_stage_plus'
 *   |'both_players_energy_deck_wait'
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
 *   |'kidou_wait_member_grant_jouji'
 *   |'kidou_energy_or_activate_member'
 *   |'kidou_energy_deck_pick_live'
 *   |'toujou_baton_discarded_pick_hand'
 *   |'toujou_optional_hand_discard_draw'
 *   |'optional_pick_member_wait_opp_stage'
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
 *   |'live_start_hand_named_discard_hearts_grant'
 *   |'ability_sequence'
 *   |'followup_draw_if_live_discarded'
 *   |'toujou_multi_wait_draw_per_count'
 *   |'toujou_opp_hand_reveal_no_live_draw'
 *   |'tiered_cost_draw_if'
 *   |'tiered_cost_grant_jouji_score'
 *   |'tiered_cost_grant_jouji_session'
 *   |'live_start_waiting_deck_bottom_tiered'
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
 * @property {number} [targetHandSize]
 * @property {number} [yellRevealReduction]
 * @property {number} [minLiveFrameCount]
 * @property {number} [minStageEntriesThisTurn]
 * @property {number} [energyCostDiscountPerGroup]
 * @property {AbilityTrigger} [excludeTriggerOnPick]
 * @property {string[]} [kidouSegmentRaws]
 * @property {boolean} [requiresSeriesOnStage]
 * @property {string[]} [characterNames]
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
 * @property {number} [requiredHeartSlot] 効果で参照するハート色 1-6
 * @property {number} [liveScoreGrant] ライブの合計スコア＋N
 * @property {number} [cardScoreGrant] このカードのスコア＋N
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
    if (canon === "jouji" && isInlineQuotedJoujiReference(s, m.index)) continue;
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
    return Object.assign(patch, {
      template: "optional_self_wait_opp_stage",
      oppWaitMaxCost: costM ? Number(costM[1]) : 4,
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
      filters: parseAbilityPickFilters(p),
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
  else if (/ライブカード/.test(p)) f.pickType = T_LIVE;
  var costM = p.match(/コスト(\d+)以下/);
  if (costM) f.maxCost = Number(costM[1]);
  var minCostM = p.match(/コスト(\d+)以上/);
  if (minCostM) f.minCost = Number(minCostM[1]);
  var seriesM = p.match(/『([^』]+)』/);
  if (seriesM) f.seriesTag = seriesM[1];
  var slM = p.match(/成功ライブ(?:カード)?置き場にカードが(\d+)枚以上/);
  if (!slM) slM = p.match(/成功ライブ.*置き場.*(\d+)枚以上/);
  if (slM) f.minSuccessLiveCount = Number(slM[1]);
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
  var charStage = p.match(/ステージに「([^」]+)」がいる/);
  if (charStage) f.characterNameOnStage = charStage[1];
  var charHand = p.match(/手札の「([^」]+)」/);
  if (charHand) f.characterName = charHand[1];
  var charEnter = p.match(/手札からコスト[^「]*「([^」]+)」/);
  if (charEnter) f.characterName = charEnter[1];
  var liveFr = p.match(/ライブカード置き場にカードが(\d+)枚以上/);
  if (liveFr) f.minLiveFrameCount = Number(liveFr[1]);
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

/** 複合効果（スコア以外の大きな処理が同時にある） */
function isCompoundLiveScoreEffectText(p) {
  return /その後|以下から|アクティブにする|見る|引く|控え室|デッキ|山札|エネルギーを.*枚までアクティブ|1人につき|1色につき/.test(
    String(p || ""),
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
  if (filters.seriesTag && !catalogCardMatchesSeriesTag(cat, filters.seriesTag)) return false;
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
  return true;
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

    if (/ライブ終了時まで/.test(p + segRaw)) {
      var grantBladeKd = bladeGainFromIcons(segRaw, p);
      var grantScoreKd = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      if (grantBladeKd > 0 || grantScoreKd > 0 || /を得る/.test(p)) {
        return kidouT({
          template: "grant_jouji_session",
          bladeGain: grantBladeKd,
          liveScoreGrant: grantScoreKd,
          filters: parseAbilityPickFilters(p),
        });
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
      return kidouT({
        template: "kidou_stage_wait_pick_hand",
        filters: parseAbilityPickFilters(p),
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

    var drawOnlyKd = p.match(/カードを(\d+)枚引/);
    if (drawOnlyKd && !/控え室から/.test(p) && !/手札.*控え室に置/.test(p.split("：")[1] || "")) {
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
    if (/ステージにいるメンバー.*それぞれ好きなエリアに移動/.test(p)) {
      return twT({
        template: "toujou_optional_all_members_relocate",
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
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
        filters: parseAbilityPickFilters(p),
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
    if (/ライブ終了時まで/.test(p + segRaw) && /を得る/.test(p)) {
      var grantScoreTj = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      var grantBladeTj = bladeGainFromIcons(segRaw, p);
      if (/常時/.test(segRaw) || grantScoreTj > 0 || grantBladeTj > 0) {
        return twT({
          template: "grant_jouji_session",
          liveScoreGrant: grantScoreTj || (grantBladeTj > 0 ? 0 : 1),
          bladeGain: grantBladeTj,
          requiresOnStage: true,
        });
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
      return twT({
        template: "energy_deck_to_wait",
        energyWaitCount: Number(edWait[1]) || 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
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
      return twT({
        template: "deck_top_pick_recover",
        deckTopCount: topPick,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
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
    if (/控え室から/.test(p) && /手札に加/.test(p)) {
      return twT({
        template: "toujou_wait_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/相手のステージ/.test(p) && /ウェイト/.test(p)) {
      var oppCostM = p.match(/コスト(\d+)以下/);
      var oppCntM2 = p.match(/(\d+)人までウェイト/);
      return twT({
        template: "optional_self_wait_opp_stage",
        oppWaitMaxCost: oppCostM ? Number(oppCostM[1]) : 4,
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
        return withTrigger("live_success", {
          template: "grant_jouji_session",
          bladeGain: grantBladeLs,
          liveScoreGrant: grantScoreLs,
          filters: parseAbilityPickFilters(p),
        });
      }
    }
    if (textHasHeartColorPickGrant(p)) {
      return withTrigger("live_success", {
        template: "heart_color_pick_grant",
        heartPickSlots: parseHeartColorPickSlots(p, segRaw),
        heartPerSuccessLive: textHasHeartPerSuccessLiveGrant(p),
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
    var lsDraw = p.match(/カードを(\d+)枚引/);
    if (lsDraw && !p.includes("控え室から")) {
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
      return withTrigger("live_success", {
        template: "yell_resolution_pick_hand",
        filters: parseAbilityPickFilters(p),
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
    if (/ライブの合計スコアが相手より高い/.test(p) && /エネルギーデッキ.*ウェイト/.test(p)) {
      return withTrigger("live_success", {
        template: "live_score_higher_energy_wait",
        energyWaitFromUnderMember: /下にあるエネルギー/.test(p),
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
    var cardScLs = parseLiveCardScorePlusFromText(pLs);
    if (cardScLs > 0 && /このカードのスコア/.test(p) && !isCompoundLiveScoreEffectText(p)) {
      return withTrigger("live_success", {
        template: "live_card_score_plus",
        cardScoreGrant: cardScLs,
        optional: base.optional,
        hasOptionalCost: base.hasOptionalCost,
        filters: parseAbilityPickFilters(p),
      });
    }
    return withTrigger("live_success", { template: "guided_manual" });
  }

  if (enterLiveStart) {
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

    if (/このターン.*登場.*2回以上/.test(p) && /ライブ終了時まで/.test(p)) {
      return lsT({
        template: "grant_jouji_session",
        liveScoreGrant:
          parseScorePlusFromText(p) ||
          parseScorePlusFromText(String(segRaw || "").replace(/\{\{[^}]+\}\}/g, "")) ||
          1,
        minStageEntriesThisTurn: 2,
        requiresOnStage: true,
      });
    }

    if (/支払わないかぎり/.test(p) && /手札.*控え室/.test(p)) {
      var hdPayLs = p.match(/手札を(\d+)枚控え室/);
      return lsT({
        template: "live_start_pay_or_hand_discard",
        handDiscardToWaiting: hdPayLs ? Number(hdPayLs[1]) : 2,
        costEnergy: !!base.costEnergy,
        costEnergyCount: base.costEnergyCount || countWikiEnergyIcons(segRaw) || 2,
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
      return lsT({
        template: "heart_color_pick_grant",
        requiresOnStage: true,
        optional: base.optional,
        heartPickSlots: parseHeartColorPickSlots(p, segRaw),
        heartPerSuccessLive: textHasHeartPerSuccessLiveGrant(p),
      });
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

    if (/ライブ終了時まで/.test(p + segRaw)) {
      var grantBlade = bladeGainFromIcons(segRaw, p);
      var grantScore = parseScorePlusFromText(p) || parseScorePlusFromText(segRaw.replace(/\{\{[^}]+\}\}/g, ""));
      if (grantBlade > 0 || grantScore > 0 || /を得る/.test(p)) {
        return lsT({
          template: "grant_jouji_session",
          bladeGain: grantBlade,
          liveScoreGrant: grantScore,
          requiresOnStage: true,
          filters: parseAbilityPickFilters(p),
        });
      }
    }

    if (/以下から1つを選ぶ/.test(p)) {
      var lsChoices = parseAbilityBulletChoices(segRaw);
      return lsT({
        template: "ability_pick_one",
        abilityChoices: lsChoices.length ? lsChoices : parseAbilityBulletChoices(p),
        choiceMin: 1,
        choiceMax: 1,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    var actEnLs = p.match(/エネルギーを(\d+)枚アクティブにする/);
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
    if (lookReorderLs != null && /見る/.test(p) && /デッキの上に置/.test(p) && /好きな/.test(p)) {
      return lsT({
        template: "deck_top_look_reorder",
        deckTopCount: lookReorderLs,
        requiresOnStage: true,
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
        filters: parseAbilityPickFilters(p),
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

    if (/のメンバー1人をウェイトにしてもよい/.test(p) && /相手は.*ウェイト/.test(p)) {
      return lsT({
        template: "optional_pick_member_wait_opp_stage",
        filters: parseAbilityPickFilters(p),
        optional: true,
        hasOptionalCost: true,
        requiresOnStage: true,
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

    var cardScLs = parseLiveCardScorePlusFromText(normalizeFwDigits(p));
    if (cardScLs > 0 && /このカードのスコア/.test(p) && !isCompoundLiveScoreEffectText(p)) {
      return lsT({
        template: "live_card_score_plus",
        cardScoreGrant: cardScLs,
        optional: base.optional,
        hasOptionalCost: base.hasOptionalCost,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }

    return lsT({ template: "guided_manual", requiresOnStage: true, filters: parseAbilityPickFilters(p) });
  }
  if (enterJouji) {
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
    template === "waiting_to_deck_bottom" ||
    template === "grant_jouji_session" ||
    template === "live_start_yell_reveal_reduction" ||
    template === "live_start_position_change" ||
    template === "live_start_activate_all_stage_members" ||
    template === "live_start_activate_liella_and_energy" ||
    template === "live_start_hand_live_to_deck_bottom_look" ||
    template === "kidou_multi_choice" ||
    template === "kidou_self_to_wait_recover" ||
    template === "live_start_hand_discard_blade_per" ||
    template === "live_start_hand_blade_per" ||
    template === "toujou_deck_top_wait_if_all_members" ||
    template === "toujou_deck_top_wait_if_all_heart" ||
    template === "toujou_both_wait_to_empty_stage" ||
    template === "toujou_baton_both_trim_hand_draw" ||
    template === "optional_self_wait_opp_stage" ||
    template === "toujou_deck_top_liella_live_pick" ||
    template === "live_start_named_member_heart_blades" ||
    template === "live_success_characters_draw" ||
    template === "heart_color_pick_grant" ||
    template === "kidou_reveal_hand_cost_threshold" ||
    template === "deck_top_count_stage_plus" ||
    template === "both_players_energy_deck_wait" ||
    template === "success_live_waiting_swap" ||
    template === "kidou_self_wait_activate_other" ||
    template === "deck_top_reveal_top_to_hand_score" ||
    template === "kidou_waiting_to_empty_stage" ||
    template === "live_success_wait_skip_next_activate" ||
    template === "deck_top_pick_no_ability_or_jouji" ||
    template === "deck_top_count_live_score_plus" ||
    template === "waiting_reorder_deck_top" ||
    template === "activate_stage_members_up_to" ||
    template === "yell_resolution_pick_hand" ||
    template === "yell_resolution_pick_deck_top" ||
    template === "yell_resolution_energy_wait" ||
    template === "yell_resolution_count_energy_wait" ||
    template === "energy_less_than_opponent_wait" ||
    template === "live_score_higher_energy_wait" ||
    template === "deck_top_reveal_hand_score_grant" ||
    template === "surplus_heart_score_modifier" ||
    template === "kidou_wait_member_grant_jouji" ||
    template === "kidou_energy_or_activate_member" ||
    template === "kidou_energy_deck_pick_live" ||
    template === "kidou_hand_discard_trigger_ability" ||
    template === "toujou_wait_pick_trigger_ability" ||
    template === "toujou_baton_discarded_pick_hand" ||
    template === "toujou_optional_hand_discard_draw" ||
    template === "optional_pick_member_wait_opp_stage" ||
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
    template === "live_start_hand_named_discard_hearts_grant" ||
    template === "live_success_deck_wait_pick_live" ||
    template === "live_success_enter_under_member" ||
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
