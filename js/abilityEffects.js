/**
 * カード能力文の分類（cards.json の `ability` フィールド）。
 * ソロプレイの自動処理テンプレートと、手動ガイドへの振り分けに使う。
 */
import { T_LIVE, T_MEMBER } from "./config.js";
import { catalogCardMatchesGroupTag } from "./cardGroups.js";
import { abilityWikiCanonicalKeys, wikiAbilityStemToCanonical } from "./gameStatusIcons.js";

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
 * @property {string | null} [characterNameOnStage]
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
 * @property {string[]} [kidouSegmentRaws]
 * @property {boolean} [requiresSeriesOnStage]
 * @property {string[]} [characterNames]
 * @property {number} [effectDiscardCount] 効果本文での手札→控え室（コストと別）
 * @property {boolean} [postDiscardActivateIfNonBhMember] 捨てた非BHメンバー1枚以上でこのメンバーをアクティブ
 * @property {number} [postDiscardBladeGainIfNonBhAt] 非BHメンバーをこの枚数以上捨てたときブレード付与
 * @property {number} [postDiscardBladeGainCount] 上記時のブレード枚数
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
    if (canon) tokens.push({ trigger: canon, start: m.index, end: m.index + m[0].length });
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
  return segments;
}

/** トリガー絞り込み: 同じ trigger を持つセグメントの text を連結する */
export function abilityRawSegmentForTrigger(card, trigger) {
  if (!trigger) return cardAbilityRawText(card);
  var segs = splitAbilityByTriggers(cardAbilityRawText(card));
  var parts = [];
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger === trigger) parts.push(segs[i].text);
  }
  return parts.join("");
}

/** セグメント raw → プレーンテキスト（トークン除去・空白除去） */
function segmentPlainText(rawSegment) {
  return String(rawSegment || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
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
  var charStage = p.match(/ステージに「([^」]+)」がいる/);
  if (charStage) f.characterNameOnStage = charStage[1];
  var liveFr = p.match(/ライブカード置き場にカードが(\d+)枚以上/);
  if (liveFr) f.minLiveFrameCount = Number(liveFr[1]);
  return f;
}

/** @param {string} p */
function parseScorePlusFromText(p) {
  var m = String(p || "").match(/ライブの合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  m = String(p || "").match(/合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  return 0;
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
  return true;
}

/**
/** @param {string} p */
function parseRequiresSeriesOnStage(p) {
  return /ステージに『[^』]+』[^：]*登場している場合/.test(String(p || ""));
}

/** @param {string} p @returns {string[]} */
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

/** 成功ライブ置き場に置けない（常時） */
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
export function classifyCardAbility(card, trigger, segmentRawOverride) {
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
    /このメンバーをウェイト/.test(costPart) || /メンバーをウェイトにし/.test(costPart);
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

    if (/ステージから控え室に置/.test(p) && /控え室から/.test(p) && /登場させる/.test(p)) {
      return kidouT({
        template: "kidou_self_to_wait_recover",
        filters: parseAbilityPickFilters(p),
        requiresSeriesOnStage: false,
      });
    }

    if (/ポジションチェンジ/.test(p) && /エリアに移動/.test(p)) {
      return kidouT({ template: "live_start_position_change" });
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

    if (/手札.*控え室に置/.test(p) && /控え室から/.test(p) && /手札に加/.test(p)) {
      var hd = p.match(/手札を(\d+)枚控え室に置/);
      return kidouT({
        template: "kidou_hand_cost_wait_pick_hand",
        handDiscardToWaiting: hd ? Number(hd[1]) : 1,
        filters: parseAbilityPickFilters(p),
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

    if (base.bladeGain > 0 && !/手札|控え室|山札|見る|引|公開|以下から/.test(p)) {
      return kidouT({
        template: "blade_gain_only",
        bladeGain: base.bladeGain,
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
    var payPick = classifyPayEnergyPickOne(card, "toujyou");
    if (payPick) {
      return twT(Object.assign({ requiresOnStage: true }, payPick));
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
    var td = parseDeckTopCount(p);
    if (td != null && p.includes("控え室")) {
      return twT({
        template: "deck_top_to_waiting",
        deckTopCount: td,
        requiresOnStage: true,
      });
    }
    return twT({ template: "guided_manual", requiresOnStage: true });
  }

  if (enterLiveSuccess) {
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

    var payPickLs = classifyPayEnergyPickOne(card, "live_start");
    if (payPickLs) {
      return lsT(Object.assign({ requiresOnStage: true }, payPickLs));
    }
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

    if (/ポジションチェンジ/.test(p) && /エリアに移動/.test(p)) {
      return lsT({
        template: "live_start_position_change",
        requiresOnStage: true,
        optional: /してもよい/.test(segRaw),
        hasOptionalCost: /してもよい/.test(segRaw),
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

    if (/相手のステージ.*ウェイト/.test(p) && /カードを(\d+)枚引/.test(p)) {
      var drOpp = p.match(/カードを(\d+)枚引/);
      return lsT({
        template: "draw_from_deck",
        deckDrawCount: drOpp ? Number(drOpp[1]) : 1,
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
    template === "toujou_both_wait_to_empty_stage"
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
    out.push(segs[i].text);
  }
  return out;
}

/** 常時: 2人バトンタッチ登場可（PL!SP-bp4-004） */
export function cardAllowsTwoMemberBaton(card) {
  if (!card) return false;
  var raw = cardAbilityRawText(card);
  return /2人のメンバーとバトンタッチしてもよい/.test(raw);
}
