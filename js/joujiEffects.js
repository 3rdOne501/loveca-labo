/**
 * メンバーカードの印刷「常時」能力の分類と盤面評価。
 * 付与常時（ライブ開始時の「…を得る」内の {{jyouji}}）は isNativeJoujiSegment で除外する。
 */
import { splitAbilityByTriggers, parseStageAreaConstraints } from "./abilityEffects.js";
import { wikiAbilityStemToCanonical } from "./gameStatusIcons.js";
import { catalogCardMatchesGroupTag, normalizeQuotedSeriesTag } from "./cardGroups.js";
import { T_MEMBER } from "./config.js";

/** @typedef {'left'|'center'|'right'} StageCol */

/**
 * @typedef {object} JoujiRule
 * @property {string} kind
 * @property {boolean} [requiresStageOnly]
 * @property {StageCol[]} [stageAreas]
 * @property {number} [bladePer]
 * @property {number} [bladeFlat]
 * @property {number} [heartPer]
 * @property {Record<number, number>} [heartFlat]
 * @property {number} [liveScorePlus]
 * @property {number} [handCostReduce]
 * @property {number} [handCostReducePer]
 * @property {number} [handCostReduceTargetCost]
 * @property {string} [handCostReduceSeriesTag]
 * @property {boolean} [handCostReduceNoAbility]
 * @property {string} [requiresSeriesMemberMovedThisTurn] 指定シリーズのステージメンバーがこのターンにエリア移動済み
 * @property {number} [mirrorUnderMaxCost]
 * @property {string} [batonSeriesOnlyTag]
 * @property {number} [stageCostPlus]
 * @property {number} [opponentLiveNeedHeartPlus]
 * @property {string} [seriesTag]
 * @property {string} [excludeSeriesTag]
 * @property {string} [characterName]
 * @property {string[]} [characterNamesAny]
 * @property {number} [minEnergy]
 * @property {number} [minActiveEnergy]
 * @property {Array<{minEnergy: number, heartFlat: Record<number, number>}>} [energyTierHearts]
 * @property {number} [exactEnergy]
 * @property {number} [minSuccessLiveCount]
 * @property {number} [minSuccessLiveScoreSum]
 * @property {number} [minStageMemberCount]
 * @property {number} [exactStageMemberCount]
 * @property {number} [minDistinctNameStageMembers]
 * @property {number} [minDistinctCostStageMembers]
 * @property {number} [minMemberCostOnStage]
 * @property {number} [minTotalStageMemberCost]
 * @property {number} [minCombinedEnergy]
 * @property {number} [minLiveCardsInFrames]
 * @property {string} [liveSeriesTag]
 * @property {number} [minOpponentWaitOnStage]
 * @property {Record<number, number>} [heartPerSlot]
 * @property {string} [grantedSegmentRaw]
 * @property {number} [minOpponentSuccessLive]
 * @property {number} [maxOwnSuccessLive]
 * @property {number} [minOpponentSuccessLiveScoreSum]
 * @property {number} [minCost13OnAnyStage]
 * @property {number} [minTotalMembersBothStages]
 * @property {number} [minCombinedSuccessLive]
 * @property {boolean} [selfWait]
 * @property {boolean} [notMovedThisTurn]
 * @property {boolean} [centerHighestCost]
 * @property {boolean} [mostHeartsOnBothStages]
 * @property {boolean} [opponentMoreEnergy]
 * @property {Record<string, number>} [needHeartReduceMap]
 * @property {number} [minLivePrintedScore]
 * @property {string} [requiresSuccessLiveSeriesTag] 成功ライブ置き場に指定タグのカードがある
 * @property {number} [leftRightSideExactPrintedBlade] 左右サイドに元々ブレードNのメンバーがいる
 * @property {boolean} [requiresLiveFrameNoStartSuccessAbility]
 * @property {boolean} [loseBladeInstead]
 * @property {number} [energyBelowMember]
 * @property {number} [minEnergyBelowMember]
 */

/**
 * @typedef {object} JoujiEvalResult
 * @property {number} bladeBonus
 * @property {Record<number, number>} heartSlots
 * @property {number} liveScoreBonus
 * @property {number} handCostReduction
 * @property {number} stageCostDelta
 * @property {number} opponentLiveNeedHeartPlus
 * @property {boolean} cannotLiveAlone
 * @property {boolean} cannotSelfActivate
 * @property {boolean} cannotBatonToWaiting
 * @property {boolean} allowsTwoMemberBaton
 * @property {boolean} [printedHeartsWildcard]
 * @property {string[]} [grantedSegmentRaws]
 */

/**
 * @typedef {object} JoujiBoardContext
 * @property {(inst: *) => StageCol|null} memberStageColumn
 * @property {(inst: *) => boolean} memberOnStageOrLive
 * @property {(inst: *) => boolean} memberOnStageOnly
 * @property {(inst: *) => boolean} memberIsWait
 * @property {(inst: *) => boolean} memberMovedThisTurn
 * @property {(inst: *) => number} memberPrintedCost
 * @property {(inst: *) => number} memberTotalHearts
 * @property {(card: *) => *} mergedCatalog
 * @property {() => number} ownEnergyCount
 * @property {() => number} opponentEnergyCount
 * @property {() => number} ownSuccessLiveCount
 * @property {() => number} opponentSuccessLiveCount
 * @property {() => number} ownSuccessLiveScoreSum
 * @property {() => number} opponentSuccessLiveScoreSum
 * @property {() => number} opponentStageWaitCount
 * @property {() => number} opponentStageMemberCount
 * @property {() => number} totalMembersBothStages
 * @property {() => number} opponentExtraHeartSurplus
 * @property {() => StageCol[]} eachStageColumnMembers
 * @property {() => StageCol[]} eachOpponentStageColumnMembers
 * @property {(tag: string) => boolean} stageHasAllAreasDistinctSeriesMembers
 * @property {() => boolean} liveFramesHave3PlusWithSeries
 * @property {(inst: *) => number} energyCountBelowMember
 * @property {(name: string) => boolean} stageHasCharacterName
 * @property {(names: string[]) => boolean} stageHasAnyCharacterName
 * @property {(inst: *, tag: string) => boolean} memberMatchesSeries
 * @property {(inst: *) => boolean} memberHasNoPrintedAbility
 * @property {(inst: *) => boolean} memberIsOpponentProxy
 * @property {() => boolean} liveFrameHasNoStartSuccessAbilityLive
 */

function segmentPlainText(rawSegment) {
  return String(rawSegment || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
}

/** 全角数字を半角に（効果文の「＋１」「６」などをパターンに通す） */
function normalizeFwDigits(s) {
  return String(s || "").replace(/[０-９]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

function countBladeIcons(segRaw) {
  return (String(segRaw || "").match(/\{\{[^}]*blade[^}]*\}\}/gi) || []).length;
}

/** @param {string} segRaw @returns {Record<number, number>} */
function countHeartIconsBySlot(segRaw) {
  /** @type {Record<number, number>} */
  var out = {};
  var re = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;
  var m;
  while ((m = re.exec(String(segRaw || "")))) {
    var stem = wikiAbilityStemToCanonical(m[1]);
    var slot = null;
    if (stem === "h00" || stem === "heart_00" || stem === "heart0") slot = 0;
    else if (stem === "h01" || stem === "heart_01" || stem === "heart01") slot = 1;
    else if (stem === "h02" || stem === "heart_02" || stem === "heart02") slot = 2;
    else if (stem === "h03" || stem === "heart_03" || stem === "heart03") slot = 3;
    else if (stem === "h04" || stem === "heart_04" || stem === "heart04") slot = 4;
    else if (stem === "h05" || stem === "heart_05" || stem === "heart05") slot = 5;
    else if (stem === "h06" || stem === "heart_06" || stem === "heart06") slot = 6;
    else if (stem === "hall" || stem === "heart_07" || stem === "b_all") slot = 7;
    if (slot != null) out[slot] = (out[slot] || 0) + 1;
  }
  return out;
}

function parseScorePlus(p) {
  var s = normalizeFwDigits(p);
  var m = s.match(/ライブの合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  m = s.match(/合計スコアを[＋+](\d+)/);
  if (m) return Number(m[1]) || 0;
  return 0;
}

/**
 * 付与常時（他能力の引用内）でない、カードに印刷された常時セグメントか。
 * @param {Array<{trigger: string|null, text: string}>} segs
 * @param {number} index
 */
export function isNativeJoujiSegment(segs, index) {
  var seg = segs[index];
  if (!seg || seg.trigger !== "jouji") return false;
  var plain = segmentPlainText(seg.text);
  if (plain === "を得る。" || plain === "を得る") {
    if (
      /\{\{(?:leftside|rightside|center\.png|icon_blade|heart_)/.test(String(seg.text || ""))
    ) {
      return true;
    }
    return false;
  }
  if (/^ライブの合計スコア/.test(plain) && /」を得る/.test(plain)) {
    if (index > 0) {
      var prevPQ = segmentPlainText(String(segs[index - 1].text || ""));
      if (/「[^」]*$/.test(prevPQ)) return true;
    }
    return false;
  }
  if (index === 0) return true;
  var prev = segs[index - 1];
  if (!prev || !prev.trigger) return true;
  if (prev.trigger === "jouji") return true;
  var prevText = String(prev.text || "");
  if (/「/.test(prevText) && !/」/.test(prevText)) return false;
  if (/ライブ終了時まで/.test(prevText) && /を得る/.test(prevText)) return false;
  var prevPlain = segmentPlainText(prevText);
  if (/[かも]$/.test(prevPlain) || /または$/.test(prevPlain)) {
    if (/^能力を持/.test(plain) || /^常時/.test(plain)) return false;
  }
  return true;
}

/** @param {*} card */
export function listNativeJoujiSegmentRaws(card) {
  if (!card || !card.ability) return [];
  var segs = splitAbilityByTriggers(String(card.ability));
  var out = [];
  /** Wiki のネストで「場合、「」と途中で次の {{jyouji}} に分断される */
  function endsOpenQuote(plain) {
    return /「[^」]*$/.test(plain);
  }
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i];
    if (seg.trigger !== "jouji" || !isNativeJoujiSegment(segs, i)) continue;
    var acc = String(seg.text || "");
    while (true) {
      var plain = segmentPlainText(acc);
      var merged = false;
      if (
        i + 1 < segs.length &&
        (segs[i + 1].trigger === "live_start" || segs[i + 1].trigger === "live_success") &&
        !/を得る/.test(segmentPlainText(acc))
      ) {
        i++;
        acc += String(segs[i].text || "");
        merged = true;
      } else if (
        i + 1 < segs.length &&
        segs[i + 1].trigger === "jouji" &&
        isNativeJoujiSegment(segs, i + 1) &&
        endsOpenQuote(plain)
      ) {
        i++;
        acc += String(segs[i].text || "");
        merged = true;
      } else if (
        i + 1 < segs.length &&
        segs[i + 1].trigger === "live_success" &&
        /が持つ$/.test(plain) &&
        /能力をすべて得る/.test(String(segs[i + 1].text || ""))
      ) {
        i++;
        acc += "ライブ成功時" + String(segs[i].text || "");
        merged = true;
      }
      if (!merged) break;
    }
    out.push(acc);
  }
  return out;
}

/** @param {string} segRaw @returns {JoujiRule|null} */
export function classifyJoujiSegment(segRaw) {
  var p = normalizeFwDigits(segmentPlainText(segRaw));
  if (!p) return null;
  var areas = parseStageAreaConstraints(segRaw);
  /** @type {Partial<JoujiRule>} */
  var base = {
    stageAreas: areas.length ? areas : undefined,
    requiresStageOnly: /ステージにいる/.test(p) && !/ライブエリア/.test(p),
  };

  if (
    /ステージのエリアすべてに『/.test(p) &&
    /名前が異なる/.test(p) &&
    /「/.test(String(segRaw)) &&
    (/」を得る/.test(p) || /」を得る/.test(String(segRaw)))
  ) {
    var serTagQuoted = p.match(/ステージのエリアすべてに『([^』]+)』/);
    var quotedGrantM = String(segRaw).match(/「([\s\S]+?)」を得る/);
    if (serTagQuoted && quotedGrantM && quotedGrantM[1]) {
      return Object.assign({}, base, {
        kind: "stage_all_areas_grant_quoted",
        seriesTag: serTagQuoted[1],
        grantedSegmentRaw: quotedGrantM[1],
        requiresStageOnly: true,
      });
    }
  }

  if (
    /ステージのエリアすべてに『/.test(p) &&
    /名前が異なる/.test(p) &&
    /ライブの合計スコア/.test(p) &&
    (/を得る/.test(p) || /」を得る/.test(p))
  ) {
    var serTagM = p.match(/ステージのエリアすべてに『([^』]+)』/);
    var lap = parseScorePlus(p);
    if (serTagM && lap > 0) {
      return Object.assign({}, base, {
        kind: "stage_all_areas_series_distinct_score",
        seriesTag: serTagM[1],
        liveScorePlus: lap,
        requiresStageOnly: true,
      });
    }
  }

  if (/エールにより公開/.test(p) && /ライブカードが1枚以上/.test(p) && /ライブの合計スコア/.test(p)) {
    var lowYell = parseScorePlus(p) || 1;
    var highYell = lowYell;
    var highYellM = p.match(/代わりに合計スコアを[＋+](\d+)/);
    if (highYellM) highYell = Number(normalizeFwDigits(highYellM[1])) || lowYell;
    return Object.assign({}, base, {
      kind:
        highYell > lowYell && /ライブカードが3枚以上/.test(p)
          ? "yell_reveal_live_score_tiered"
          : "yell_reveal_live_score_min",
      liveScorePlus: lowYell,
      liveScorePlusHigh: highYell,
    });
  }

  if (/2人のメンバーとバトンタッチしてもよい/.test(p)) {
    return Object.assign({}, base, { kind: "two_member_baton" });
  }
  if (/ほかのメンバーがいない場合.*ライブできない/.test(p)) {
    return Object.assign({}, base, { kind: "cannot_live_alone", requiresStageOnly: true });
  }
  if (/このメンバーは自分のアクティブフェイズにアクティブにしない/.test(p)) {
    return Object.assign({}, base, { kind: "cannot_self_activate" });
  }
  if (/相手のステージにいるメンバーはアクティブフェイズにアクティブにならない/.test(p)) {
    return Object.assign({}, base, { kind: "opponent_cannot_activate" });
  }
  var batonOnlyEarly = p.match(/『([^』]+)』以外のメンバーカードとのバトンタッチで控え室に置けない/);
  if (batonOnlyEarly) {
    return Object.assign({}, base, {
      kind: "baton_series_only",
      batonSeriesOnlyTag: batonOnlyEarly[1],
      requiresStageOnly: true,
    });
  }
  if (/バトンタッチで控え室に置けない/.test(p) && !/以外のメンバーカードとのバトンタッチ/.test(p)) {
    return Object.assign({}, base, { kind: "cannot_baton_to_waiting" });
  }
  if (/相手のライブカード置き場にある(すべてのライブカード|ライブカード1枚).*必要ハートが.*多くなる/.test(p)) {
    var h0 = countHeartIconsBySlot(segRaw)[0] || 1;
    return Object.assign({}, base, { kind: "opponent_live_need_heart", opponentLiveNeedHeartPlus: h0 });
  }
  if (/元々持つハートはすべて/.test(p) && /heart0|heart_00|heart_0/.test(p + segRaw)) {
    return Object.assign({}, base, { kind: "printed_hearts_wildcard", requiresStageOnly: true });
  }

  if (/すべての領域にあるこのカードは/.test(p) && /として扱う/.test(p)) {
    /** @type {string[]} */
    var extraSeriesTags = [];
    var extraTagRe = /『([^』]+)』/g;
    var etm;
    while ((etm = extraTagRe.exec(p))) extraSeriesTags.push(etm[1]);
    if (extraSeriesTags.length) {
      return Object.assign({}, base, {
        kind: "extra_series_tags_all_zones",
        extraSeriesTags: extraSeriesTags,
      });
    }
  }

  if (
    /ステージにいるメンバーが持つ/.test(p) &&
    /ライブ開始時/.test(p + String(segRaw || "")) &&
    /能力は発動しない/.test(p)
  ) {
    return Object.assign({}, base, {
      kind: "block_stage_member_live_start",
      requiresInLiveFrames: true,
    });
  }

  if (/成功ライブカード置き場に置くことができない/.test(p)) {
    return Object.assign({}, base, { kind: "cannot_place_on_success_live" });
  }

  var scorePlus = parseScorePlus(p);
  if (scorePlus > 0 && /ライブの合計スコア/.test(p)) {
    var ebBelow = p.match(/下にエネルギーカードが(\d+)枚以上置かれている/);
    if (ebBelow) {
      return Object.assign({}, base, {
        kind: "live_score_if_energy_below",
        liveScorePlus: scorePlus,
        minEnergyBelowMember: Number(ebBelow[1]) || 2,
        requiresStageOnly: true,
      });
    }
    /** @type {JoujiRule} */
    var scoreRule = Object.assign({}, base, { kind: "live_score_plus", liveScorePlus: scorePlus });
    var em = p.match(/自分のエネルギーが(\d+)枚以上/);
    if (!em) em = p.match(/エネルギーが(\d+)枚以上/);
    if (em) scoreRule.minEnergy = Number(em[1]);
    var emEx = p.match(/エネルギーがちょうど(\d+)枚/);
    if (emEx) scoreRule.exactEnergy = Number(emEx[1]);
    if (/相手の余剰ハートが2つ以上/.test(p)) scoreRule.opponentExtraHeartSurplus = 2;
    if (/ほかのすべてのメンバーより多くのハート/.test(p)) scoreRule.mostHeartsOnBothStages = true;
    if (/センターエリアに登場している場合のみ/.test(p) || /センターエリアに登場した場合のみ/.test(p)) {
      scoreRule.stageAreas = ["center"];
    }
    var sideBladeM = p.match(/右サイドエリアと左サイドエリアに、元々持つ.*の数が([０-９\d]+)つ/);
    if (sideBladeM) {
      scoreRule.leftRightSideExactPrintedBlade =
        Number(
          String(sideBladeM[1]).replace(/[０-９]/g, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
          }),
        ) || 2;
    }
    var ownSlSc = p.match(/自分の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (ownSlSc) scoreRule.minSuccessLiveScoreSum = Number(ownSlSc[1]);
    var oppSlSc = p.match(/相手の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (oppSlSc) scoreRule.minOpponentSuccessLiveScoreSum = Number(oppSlSc[1]);
    return scoreRule;
  }

  var grantNoAb = p.match(/能力を持たないメンバーカードを自分の手札から登場させるためのコストは(\d+)減る/);
  if (grantNoAb) {
    return Object.assign({}, base, {
      kind: "grant_hand_no_ability_cost_reduce",
      handCostReduce: Number(grantNoAb[1]) || 1,
      requiresStageOnly: true,
    });
  }

  var grantSeriesHandFromSuccessLive = p.match(
    /このカードが自分の成功ライブカード置き場にあるかぎり.*元々のコストが(\d+)以上の『([^』]+)』.*登場させるためのコストは(\d+)減る/,
  );
  if (grantSeriesHandFromSuccessLive) {
    return Object.assign({}, base, {
      kind: "grant_hand_series_cost_reduce",
      handCostReduce: Number(grantSeriesHandFromSuccessLive[3]) || 2,
      handCostReduceMinCost: Number(grantSeriesHandFromSuccessLive[1]) || 17,
      handCostReduceSeriesTag: normalizeQuotedSeriesTag(grantSeriesHandFromSuccessLive[2]),
      requiresSuccessLiveSelf: true,
      nonStacking: /重複しない/.test(p),
    });
  }

  if (
    /このカードが自分の成功ライブカード置き場にあるかぎり/.test(p) &&
    /元々のスコアが([０-９\d]+)以上/.test(p) &&
    /ライブカードの必要ハート/.test(p) &&
    /減らす/.test(p)
  ) {
    var minLiveScoreM = p.match(/元々のスコアが([０-９\d]+)以上/);
    var liveSeriesReduceM = p.match(/『([^』]+)』のライブカード/);
    /** @type {Record<string, number>} */
    var nhReduceMap = {};
    var heartSlots = countHeartIconsBySlot(segRaw);
    Object.keys(heartSlots).forEach(function (sk) {
      var slotN = Number(sk);
      var cnt = Math.floor(Number(heartSlots[sk]) || 0);
      if (cnt <= 0) return;
      var key = slotN === 0 ? "heart0" : slotN === 1 ? "heart01" : "heart0" + slotN;
      nhReduceMap[key] = (nhReduceMap[key] || 0) + cnt;
    });
    return Object.assign({}, base, {
      kind: "success_live_live_need_heart_reduce",
      requiresSuccessLiveSelf: true,
      minLivePrintedScore: Number(normalizeFwDigits(minLiveScoreM[1])) || 5,
      seriesTag: liveSeriesReduceM ? normalizeQuotedSeriesTag(liveSeriesReduceM[1]) : null,
      needHeartReduceMap: nhReduceMap,
      nonStacking: /重複しない/.test(p),
    });
  }

  if (
    /成功ライブカード置き場に置く場合/.test(p) &&
    /代わりに/.test(p) &&
    /控え室/.test(p) &&
    /ライブカード/.test(p) &&
    /置いてもよい/.test(p)
  ) {
    var subSeriesM = p.match(/控え室にある『([^』]+)』のライブカード/);
    return Object.assign({}, base, {
      kind: "success_live_waiting_substitute",
      seriesTag: subSeriesM ? normalizeQuotedSeriesTag(subSeriesM[1]) : null,
    });
  }

  var successLiveSelfScore = p.match(
    /このカードが自分の成功ライブカード置き場にあり.*ステージに『([^』]+)』のメンバーがいるかぎり.*このカードのスコアを[＋+](\d+)/,
  );
  if (successLiveSelfScore) {
    return Object.assign({}, base, {
      kind: "success_live_self_score_if_series_on_stage",
      seriesTag: successLiveSelfScore[1],
      successLiveScorePlus: Number(successLiveSelfScore[2]) || 1,
    });
  }

  var grantSeriesHand = p.match(
    /コスト(\d+)の『([^』]+)』のメンバーカードを自分の手札から登場させるためのコストは(\d+)減る/,
  );
  if (grantSeriesHand) {
    return Object.assign({}, base, {
      kind: "grant_hand_series_cost_reduce",
      handCostReduce: Number(grantSeriesHand[3]) || 1,
      handCostReduceTargetCost: Number(grantSeriesHand[1]) || 10,
      handCostReduceSeriesTag: grantSeriesHand[2],
      requiresStageOnly: true,
    });
  }

  var handPerSeries = p.match(
    /手札にあるこのメンバーカードのコストは、自分のステージにいる『([^』]+)』のメンバー1人につき、(\d+)少なくなる/,
  );
  if (handPerSeries) {
    return Object.assign({}, base, {
      kind: "hand_cost_per_series_on_stage",
      handCostReduceSeriesTag: handPerSeries[1],
      handCostReducePer: Number(handPerSeries[2]) || 2,
    });
  }

  var underSeriesCost = p.match(
    /下にある『([^』]+)』のメンバーカード1枚につき、このメンバーのコストを[＋+](\d+)/,
  );
  if (underSeriesCost) {
    return Object.assign({}, base, {
      kind: "stage_cost_plus_per_under_series",
      underSeriesTag: underSeriesCost[1],
      stageCostPlusPerUnder: Number(underSeriesCost[2]) || 1,
      requiresStageOnly: true,
    });
  }

  if (/下に置かれている.*が持つ.*能力をすべて得る/.test(p)) {
    var mirCost = p.match(/コスト(\d+)以下/);
    var mirSer = p.match(/『([^』]+)』/);
    var isKidou = /\{\{kidou|起動\}\}|起動能力/.test(p + segRaw);
    return Object.assign({}, base, {
      kind: isKidou ? "mirror_under_card_kidou" : "mirror_under_card_live_success",
      mirrorUnderMaxCost: mirCost ? Number(mirCost[1]) : 99,
      seriesTag: mirSer ? mirSer[1] : null,
      requiresStageOnly: true,
    });
  }

  if (/手札にあるこのメンバーカードのコストは(\d+)減る/.test(p)) {
    var cr = p.match(/コストは(\d+)減る/);
    /** @type {JoujiRule} */
    var handRule = Object.assign({}, base, {
      kind: "hand_cost_reduce",
      handCostReduce: cr ? Number(cr[1]) : 1,
    });
    if (/能力を持たないメンバー/.test(p)) handRule.handCostReduceNoAbility = true;
    var c10 = p.match(/コスト10の『([^』]+)』/);
    if (c10) {
      handRule.handCostReduceTargetCost = 10;
      handRule.handCostReduceSeriesTag = c10[1];
      handRule.handCostReduce = 2;
    }
    var lily = /『lilywhite』/.test(p);
    if (lily) handRule.handCostReduceSeriesTag = "lilywhite";
    if (/ウェイト状態の『([^』]+)』/.test(p) && /ステージ/.test(p)) {
      var waitSer = p.match(/ウェイト状態の『([^』]+)』/);
      handRule.kind = "hand_cost_reduce_if_wait_series_on_stage";
      handRule.waitSeriesOnStageTag = waitSer ? waitSer[1] : null;
      handRule.handCostReduceSeriesTag = null;
    } else if (/ウェイト状態の『虹ヶ咲』/.test(p)) {
      handRule.handCostReduceSeriesTag = "虹ヶ咲";
    }
    if (/エリアを移動しているかぎり/.test(p)) {
      handRule.notMovedThisTurn = false;
      var movedSerKagi = p.match(/『([^』]+)』のメンバーがこのターンにエリアを移動しているかぎり/);
      if (movedSerKagi) handRule.requiresSeriesMemberMovedThisTurn = movedSerKagi[1];
    }
    return handRule;
  }

  if (/ステージにいるこのメンバーのコストを[＋+](\d+)/.test(p)) {
    var sc = p.match(/コストを[＋+](\d+)/);
    /** @type {JoujiRule} */
    var stageCostRule = Object.assign({}, base, {
      kind: "stage_cost_plus",
      stageCostPlus: sc ? Number(sc[1]) : 0,
      requiresStageOnly: true,
    });
    var ownSlSc = p.match(/自分の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (ownSlSc) stageCostRule.minSuccessLiveScoreSum = Number(ownSlSc[1]);
    var enKagi = p.match(/自分のエネルギーが(\d+)枚以上ある(?:かぎり|場合)/);
    if (enKagi) stageCostRule.minEnergy = Number(enKagi[1]);
    var perSl = p.match(/成功ライブカード置き場にあるカード1枚につき/);
    if (perSl) {
      stageCostRule.kind = "stage_cost_plus_per_success_live";
      stageCostRule.stageCostPlus = sc ? Number(sc[1]) : 1;
    }
    return stageCostRule;
  }

  if (/手札にあるこのメンバーカードのコストは、このカード以外の自分の手札1枚につき/.test(p)) {
    return Object.assign({}, base, { kind: "hand_cost_per_other_hand" });
  }

  if (/成功ライブカード置き場にあるカード1枚につき/.test(p) && countBladeIcons(segRaw) > 0) {
    return Object.assign({}, base, {
      kind: "blade_per_own_success_live",
      bladePer: countBladeIcons(segRaw),
    });
  }

  if (/相手のステージにいるウェイト状態のメンバー1人につき/.test(p)) {
    var heartMapOppWait = countHeartIconsBySlot(segRaw);
    if (Object.keys(heartMapOppWait).length > 0) {
      return Object.assign({}, base, {
        kind: "heart_per_opponent_wait",
        heartPerSlot: heartMapOppWait,
      });
    }
    return Object.assign({}, base, {
      kind: "blade_per_opponent_wait",
      bladePer: countBladeIcons(segRaw) || 1,
    });
  }

  if (/下にあるエネルギーカード1枚につき/.test(p) || /下に置かれているエネルギーカード1枚につき/.test(p)) {
    return Object.assign({}, base, {
      kind: "blade_per_energy_below",
      bladePer: countBladeIcons(segRaw) || 1,
    });
  }

  if (/このメンバーがウェイト状態であるかぎり/.test(p)) {
    var heartMapSelfWait = countHeartIconsBySlot(segRaw);
    /** @type {JoujiRule} */
    var selfWaitRule = Object.assign({}, base, {
      kind: "blade_if_self_wait",
      bladeFlat: countBladeIcons(segRaw),
      selfWait: true,
    });
    if (Object.keys(heartMapSelfWait).length) selfWaitRule.heartFlat = heartMapSelfWait;
    return selfWaitRule;
  }

  if (/を失う/.test(p) && countBladeIcons(segRaw) > 0) {
    return Object.assign({}, base, {
      kind: "lose_blade_if",
      bladeFlat: countBladeIcons(segRaw),
      loseBladeInstead: true,
    });
  }

  var scoreOnly = parseScorePlus(p) || parseScorePlus(String(segRaw || "").replace(/\{\{[^}]+\}\}/g, ""));
  if (scoreOnly > 0 && /ライブの合計スコア/.test(p + segRaw)) {
    /** @type {JoujiRule} */
    var scoreOnlyRule = Object.assign({}, base, { kind: "live_score_plus", liveScorePlus: scoreOnly });
    var em8 = p.match(/エネルギーがちょうど(\d+)枚/);
    if (em8) scoreOnlyRule.exactEnergy = Number(em8[1]);
    var em12 = p.match(/自分のエネルギーが(\d+)枚以上/);
    if (!em12) em12 = p.match(/エネルギーが(\d+)枚以上/);
    if (em12) scoreOnlyRule.minEnergy = Number(em12[1]);
    if (/相手の余剰ハートが2つ以上/.test(p)) scoreOnlyRule.opponentExtraHeartSurplus = 2;
    if (/ほかのすべてのメンバーより多くのハート/.test(p)) scoreOnlyRule.mostHeartsOnBothStages = true;
    var ownSlO2 = p.match(/自分の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (ownSlO2) scoreOnlyRule.minSuccessLiveScoreSum = Number(ownSlO2[1]);
    var oppSlO2 = p.match(/相手の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (oppSlO2) scoreOnlyRule.minOpponentSuccessLiveScoreSum = Number(oppSlO2[1]);
    return scoreOnlyRule;
  }

  var bladeN = countBladeIcons(segRaw);
  var heartMapEarly = countHeartIconsBySlot(segRaw);
  var hasHeartReward = Object.keys(heartMapEarly).length > 0;
  if ((bladeN > 0 || hasHeartReward) && (/を得る/.test(p) || /を失う/.test(p) || /かぎり/.test(p))) {
    /** @type {JoujiRule} */
    var bladeRule = Object.assign({}, base, { kind: "blade_conditional", bladeFlat: bladeN });
    var heartMap = heartMapEarly;
    if (Object.keys(heartMap).length) bladeRule.heartFlat = heartMap;

    if (/成功ライブカード置き場のカードが0枚で.*相手の成功ライブ/.test(p)) {
      bladeRule.maxOwnSuccessLive = 0;
      bladeRule.minOpponentSuccessLive = 1;
    }
    var enMin = p.match(/自分のエネルギーが(\d+)枚以上/);
    if (enMin) bladeRule.minEnergy = Number(enMin[1]);
    var enExact = p.match(/自分のエネルギーがちょうど(\d+)枚/);
    if (enExact) bladeRule.exactEnergy = Number(enExact[1]);
    if (/自分のエネルギーが相手より多い/.test(p)) bladeRule.opponentMoreEnergy = true;
    var enComb = p.match(/自分と相手のエネルギーの合計が(\d+)枚以上/);
    if (enComb) bladeRule.minCombinedEnergy = Number(enComb[1]);
    if (/自分のライブ中のカードが3枚以上/.test(p) && /『虹ヶ咲』/.test(p)) {
      bladeRule.minLiveCardsInFrames = 3;
      bladeRule.liveSeriesTag = "虹ヶ咲";
    }
    if (/自分のライブ中のライブカードが2枚以上/.test(p)) {
      bladeRule.minLiveCardsInFrames = 2;
    }
    if (/自分のステージにコスト13以上/.test(p) || /自分か相手のステージにコスト13以上/.test(p)) {
      bladeRule.minCost13OnAnyStage = 13;
    }
    if (/自分と相手のステージにメンバーが合計6人/.test(p)) bladeRule.minTotalMembersBothStages = 6;
    var csl = p.match(/自分と相手の成功ライブカード置き場にカードが合計(\d+)枚以上/);
    if (csl) bladeRule.minCombinedSuccessLive = Number(csl[1]);
    var ownSlBl = p.match(/自分の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (ownSlBl) bladeRule.minSuccessLiveScoreSum = Number(ownSlBl[1]);
    var oppSlBl = p.match(/相手の成功ライブカード置き場にあるカードのスコアの合計が(\d+)以上/);
    if (oppSlBl) bladeRule.minOpponentSuccessLiveScoreSum = Number(oppSlBl[1]);
    if (/自分のステージにいるメンバーがちょうど2人/.test(p)) bladeRule.exactStageMemberCount = 2;
    if (/自分のステージに名前が異なるメンバーが3人以上/.test(p)) bladeRule.minDistinctNameStageMembers = 3;
    if (/自分のエネルギーが10枚以上あるかぎり/.test(p)) bladeRule.minEnergy = 10;
    if (/自分のアクティブ状態のエネルギーがあるかぎり/.test(p)) bladeRule.minActiveEnergy = 1;
    var tierClauseRaws = String(segRaw || "")
      .split(/。/)
      .map(function (c) {
        return String(c || "").trim();
      })
      .filter(function (c) {
        return c && /枚以上あるかぎり/.test(segmentPlainText(c));
      });
    if (tierClauseRaws.length >= 2) {
      /** @type {Array<{minEnergy: number, heartFlat: Record<number, number>}>} */
      var energyTiers = [];
      tierClauseRaws.forEach(function (cr) {
        var cp = segmentPlainText(cr);
        var emTier = cp.match(/(\d+)枚以上あるかぎり/);
        var hmTier = countHeartIconsBySlot(cr);
        if (emTier && Object.keys(hmTier).length) {
          energyTiers.push({ minEnergy: Number(emTier[1]), heartFlat: hmTier });
        }
      });
      if (energyTiers.length >= 2) {
        bladeRule.kind = "energy_tier_hearts";
        bladeRule.energyTierHearts = energyTiers;
        delete bladeRule.minEnergy;
        delete bladeRule.heartFlat;
        bladeRule.bladeFlat = 0;
      }
    }
    if (/自分と相手のエネルギーの合計が(\d+)枚以上/.test(p)) {
      var ec2 = p.match(/自分と相手のエネルギーの合計が(\d+)枚以上/);
      if (ec2) bladeRule.minCombinedEnergy = Number(ec2[1]);
    }
    if (/自分と相手のステージにメンバーが合計(\d+)人/.test(p)) {
      var tm = p.match(/自分と相手のステージにメンバーが合計(\d+)人/);
      if (tm) bladeRule.minTotalMembersBothStages = Number(tm[1]);
    }
    if (/コストがそれぞれ異なるメンバーが3人以上/.test(p)) bladeRule.minDistinctCostStageMembers = 3;
    if (/このメンバーよりコストの大きいメンバーがいる/.test(p)) bladeRule.minMemberCostOnStage = 1;
    if (/コスト4以上の『スリーズブーケ』以外のメンバー1人につき/.test(p)) {
      bladeRule.kind = "blade_per_stage_member";
      bladeRule.bladePer = bladeN;
      bladeRule.minMemberCostOnStage = 4;
      bladeRule.excludeSeriesTag = "スリーズブーケ";
    }
    if (/『みらくらぱーく！』のメンバー1人につき/.test(p)) {
      bladeRule.kind = "blade_per_series_on_stage";
      bladeRule.bladePer = bladeN;
      bladeRule.seriesTag = "みらくらぱーく！";
    }
    if (/このメンバー以外の『A-RISE』のメンバー1人につき/.test(p)) {
      bladeRule.kind = "blade_per_series_on_stage_except_self";
      bladeRule.bladePer = bladeN;
      bladeRule.seriesTag = "A-RISE";
    }
    if (/このメンバー以外の『EdelNote』/.test(p)) {
      bladeRule.kind = "blade_if_series_on_stage";
      bladeRule.seriesTag = "EdelNote";
    }
    if (/ステージのエリアすべてに『蓮ノ空』/.test(p)) {
      bladeRule.kind = "stage_all_areas_series_distinct";
      bladeRule.seriesTag = "蓮ノ空";
    }
    if (/ステージのエリアすべてに『Aqours』/.test(p)) {
      bladeRule.kind = "stage_all_areas_series_distinct";
      bladeRule.seriesTag = "Aqours";
    }
    if (
      bladeRule.kind === "stage_all_areas_series_distinct" &&
      /ライブの合計スコア/.test(p)
    ) {
      var lspAreas = parseScorePlus(p);
      if (lspAreas > 0) {
        bladeRule.kind = "stage_all_areas_series_distinct_score";
        bladeRule.liveScorePlus = lspAreas;
        bladeRule.bladeFlat = 0;
        delete bladeRule.heartFlat;
      }
    }
    if (/センターエリアにいるメンバーが最も大きいコスト/.test(p)) bladeRule.centerHighestCost = true;
    if (/相手のステージにウェイト状態のメンバーが2人以上/.test(p)) bladeRule.minOpponentWaitOnStage = 2;
    if (/自分のステージにこのメンバー以外の/.test(p) && /がいるかぎり/.test(p) && /『/.test(p)) {
      var serM = p.match(/『([^』]+)』/);
      if (serM) {
        bladeRule.kind = "blade_if_series_on_stage";
        bladeRule.seriesTag = serM[1];
      }
    }
    if (/正面のエリアにいる相手のメンバーのコストが.*より高い/.test(p)) {
      bladeRule.kind = "blade_if_opponent_across_higher_cost";
    }
    if (/ほかのメンバーがいないかぎり/.test(p) && /を失う/.test(p)) {
      bladeRule.kind = "lose_blade_if_alone_on_stage";
      bladeRule.loseBladeInstead = true;
    }
    if (/このターンにこのメンバーが移動していない/.test(p)) bladeRule.notMovedThisTurn = true;
    if (/メンバーのコストの合計が相手より低い/.test(p)) bladeRule.kind = "blade_if_lower_stage_cost_sum";
    if (
      /ライブ開始時.*能力も.*ライブ成功時.*能力も持たない/.test(p) ||
      /ライブ中のライブカードに、.*能力も.*能力も持たない/.test(p)
    ) {
      bladeRule.requiresLiveFrameNoStartSuccessAbility = true;
    }
    if (/成功ライブカード置き場にあるカードのスコアの合計が相手より高い/.test(p)) {
      bladeRule.ownSuccessScoreBeatsOpponent = true;
    }

    var charM = p.match(/「([^」]+)」がいるかぎり/);
    if (charM) {
      bladeRule.kind = "blade_if_character_on_stage";
      bladeRule.characterName = charM[1];
    }
    var charAny = p.match(/「([^」]+)」か「([^」]+)」か「([^」]+)」がいる/);
    if (charAny) {
      bladeRule.kind = "blade_if_character_on_stage";
      bladeRule.characterNamesAny = [charAny[1], charAny[2], charAny[3]];
    }

    if (/必要ハートの中に/.test(p) && (bladeN > 0 || hasHeartReward)) {
      bladeRule.kind = "blade_if_live_need_all_colors";
    }

    if (/ライブカード置き場に必要ハートの合計が8以上の『Liella!』/.test(p)) {
      bladeRule.kind = "blade_if_liella_live_need_sum";
      bladeRule.minTotalNeedHeart = 8;
      bladeRule.liveSeriesTag = "Liella!";
    }

    if (/このカードが自分の成功ライブカード置き場にあるかぎり/.test(p)) {
      bladeRule.requiresSuccessLiveSelf = true;
    }
    var slSeriesJoujiM = p.match(/自分の成功ライブカード置き場に『([^』]+)』のカードがある/);
    if (slSeriesJoujiM) {
      bladeRule.requiresSuccessLiveSeriesTag = normalizeQuotedSeriesTag(slSeriesJoujiM[1]);
    }
    var slCenterMemberSer = p.match(/センターエリアにいる『([^』]+)』のメンバー/);
    if (slCenterMemberSer) {
      bladeRule.grantMemberSeriesTag = slCenterMemberSer[1];
    }

    return bladeRule;
  }

  if (/ライブ成功時/.test(p) && /能力をすべて得る/.test(p) && /が持つ/.test(p)) {
    return null;
  }

  return null;
}

function emptyJoujiEval() {
  return {
    bladeBonus: 0,
    heartSlots: {},
    liveScoreBonus: 0,
    handCostReduction: 0,
    stageCostDelta: 0,
    opponentLiveNeedHeartPlus: 0,
    cannotLiveAlone: false,
    cannotSelfActivate: false,
    cannotBatonToWaiting: false,
    allowsTwoMemberBaton: false,
    printedHeartsWildcard: false,
    grantedSegmentRaws: [],
  };
}

/** @param {JoujiEvalResult} acc @param {JoujiEvalResult} part */
function mergeJoujiEval(acc, part) {
  acc.bladeBonus += part.bladeBonus;
  Object.keys(part.heartSlots).forEach(function (k) {
    var slot = Number(k);
    acc.heartSlots[slot] = (acc.heartSlots[slot] || 0) + part.heartSlots[slot];
  });
  acc.liveScoreBonus += part.liveScoreBonus;
  acc.handCostReduction = Math.max(acc.handCostReduction, part.handCostReduction);
  acc.stageCostDelta += part.stageCostDelta;
  acc.opponentLiveNeedHeartPlus = Math.max(acc.opponentLiveNeedHeartPlus, part.opponentLiveNeedHeartPlus);
  acc.cannotLiveAlone = acc.cannotLiveAlone || part.cannotLiveAlone;
  acc.cannotSelfActivate = acc.cannotSelfActivate || part.cannotSelfActivate;
  acc.cannotBatonToWaiting = acc.cannotBatonToWaiting || part.cannotBatonToWaiting;
  acc.allowsTwoMemberBaton = acc.allowsTwoMemberBaton || part.allowsTwoMemberBaton;
  acc.printedHeartsWildcard = acc.printedHeartsWildcard || part.printedHeartsWildcard;
  if (part.grantedSegmentRaws && part.grantedSegmentRaws.length) {
    if (!acc.grantedSegmentRaws) acc.grantedSegmentRaws = [];
    part.grantedSegmentRaws.forEach(function (g) {
      if (g && acc.grantedSegmentRaws.indexOf(g) < 0) acc.grantedSegmentRaws.push(g);
    });
  }
}

/** @param {JoujiRule} rule @param {*} inst @param {*} card @param {JoujiBoardContext} ctx */
function evaluateJoujiRule(rule, inst, card, ctx) {
  var out = emptyJoujiEval();
  if (!rule || !inst) return out;

  if (rule.stageAreas && rule.stageAreas.length) {
    var col = ctx.memberStageColumn(inst);
    if (!col || rule.stageAreas.indexOf(col) < 0) return out;
  }
  if (rule.requiresStageOnly && !ctx.memberOnStageOnly(inst)) return out;
  if (!ctx.memberOnStageOrLive(inst) && rule.kind !== "hand_cost_reduce" && rule.kind !== "hand_cost_per_other_hand") {
    if (!/^hand_cost/.test(rule.kind)) return out;
  }

  switch (rule.kind) {
    case "two_member_baton":
      out.allowsTwoMemberBaton = true;
      return out;
    case "cannot_live_alone":
      out.cannotLiveAlone = true;
      return out;
    case "cannot_self_activate":
      out.cannotSelfActivate = true;
      return out;
    case "cannot_baton_to_waiting":
      out.cannotBatonToWaiting = true;
      return out;
    case "baton_series_only":
    case "mirror_under_card_live_success":
    case "mirror_under_card_kidou":
      return out;
    case "opponent_cannot_activate":
      return out;
    case "opponent_live_need_heart":
      if (ctx.memberOnStageOrLive(inst)) out.opponentLiveNeedHeartPlus = rule.opponentLiveNeedHeartPlus || 1;
      return out;
    case "printed_hearts_wildcard":
      if (ctx.memberOnStageOrLive(inst)) out.printedHeartsWildcard = true;
      return out;
    case "hand_cost_reduce":
      out.handCostReduction = rule.handCostReduce || 0;
      return out;
    case "hand_cost_reduce_if_wait_series_on_stage":
      if (ctx.instInOwnHand && ctx.instInOwnHand(inst)) {
        var waitHit = false;
        ctx.eachStageColumnMembers().forEach(function (m) {
          if (!m || m.lcWait !== true) return;
          if (rule.waitSeriesOnStageTag && !ctx.memberMatchesSeries(m, rule.waitSeriesOnStageTag)) return;
          waitHit = true;
        });
        if (waitHit) out.handCostReduction = rule.handCostReduce || 0;
      }
      return out;
    case "hand_cost_per_series_on_stage":
      if (ctx.instInOwnHand && ctx.instInOwnHand(inst)) {
        var stageCnt = 0;
        ctx.eachStageColumnMembers().forEach(function (m) {
          if (!m) return;
          if (rule.handCostReduceSeriesTag && !ctx.memberMatchesSeries(m, rule.handCostReduceSeriesTag)) {
            return;
          }
          stageCnt++;
        });
        out.handCostReduction = stageCnt * (rule.handCostReducePer || 1);
      }
      return out;
    case "hand_cost_per_other_hand":
      if (ctx.instInOwnHand && ctx.instInOwnHand(inst)) {
        var others =
          typeof ctx.ownHandCountExcluding === "function"
            ? Math.max(0, Math.floor(Number(ctx.ownHandCountExcluding(inst)) || 0))
            : Math.max(0, (typeof ctx.ownHandCount === "function" ? ctx.ownHandCount() : 1) - 1);
        out.handCostReduction = others;
      }
      return out;
    case "grant_hand_no_ability_cost_reduce":
    case "grant_hand_series_cost_reduce":
      return out;
    default:
      break;
  }

  if (!conditionMet(rule, inst, card, ctx)) return out;

  if (rule.kind === "energy_tier_hearts" && rule.energyTierHearts && rule.energyTierHearts.length) {
    rule.energyTierHearts.forEach(function (tier) {
      if (ctx.ownEnergyCount() < tier.minEnergy) return;
      Object.keys(tier.heartFlat || {}).forEach(function (sk) {
        var slotNum = Number(sk);
        var per = Math.floor(Number(tier.heartFlat[sk]) || 0);
        if (per > 0 && slotNum >= 1 && slotNum <= 6) {
          out.heartSlots[slotNum] = (out.heartSlots[slotNum] || 0) + per;
        }
      });
    });
    return out;
  }

  if (rule.kind === "stage_all_areas_grant_quoted") {
    var grantRaw = String(rule.grantedSegmentRaw || "");
    if (grantRaw && !/^\{\{jyouji/i.test(grantRaw)) {
      grantRaw = "{{jyouji.png|常時}}" + grantRaw;
    }
    if (grantRaw) out.grantedSegmentRaws = [grantRaw];
    return out;
  }
  if (rule.kind === "heart_per_opponent_wait") {
    var waitN = ctx.opponentStageWaitCount();
    Object.keys(rule.heartPerSlot || {}).forEach(function (slotKey) {
      var slotNum = Number(slotKey);
      var per = Math.floor(Number(rule.heartPerSlot[slotKey]) || 0);
      if (per > 0 && slotNum >= 1 && slotNum <= 6) {
        out.heartSlots[slotNum] = (out.heartSlots[slotNum] || 0) + per * waitN;
      }
    });
    return out;
  }
  if (rule.kind === "yell_reveal_live_score_tiered" || rule.kind === "yell_reveal_live_score_min") {
    return out;
  }
  if (rule.kind === "live_score_plus" || rule.kind === "live_score_if_energy_below") {
    out.liveScoreBonus = rule.liveScorePlus || 0;
    return out;
  }
  if (rule.kind === "stage_cost_plus" || rule.kind === "stage_cost_plus_per_success_live") {
    if (rule.kind === "stage_cost_plus_per_success_live") {
      out.stageCostDelta = (rule.stageCostPlus || 0) * ctx.ownSuccessLiveCount();
    } else {
      out.stageCostDelta = rule.stageCostPlus || 0;
    }
    return out;
  }
  if (rule.kind === "stage_cost_plus_per_under_series") {
    out.stageCostDelta =
      (rule.stageCostPlusPerUnder || 1) * ctx.memberCountBelowSeries(inst, rule.underSeriesTag);
    return out;
  }
  if (rule.kind === "success_live_self_score_if_series_on_stage") {
    return out;
  }
  if (rule.kind === "stage_all_areas_series_distinct_score") {
    out.liveScoreBonus = rule.liveScorePlus || 0;
    return out;
  }
  if (rule.loseBladeInstead) {
    out.bladeBonus = -(rule.bladeFlat || 0);
    return out;
  }

  /** @type {Record<number, number>} */
  var hearts = rule.heartFlat ? Object.assign({}, rule.heartFlat) : {};
  var blade = rule.bladeFlat || 0;
  var scaleN = scalingCount(rule, inst, card, ctx);
  if (rule.bladePer) {
    blade = rule.bladePer * scaleN;
  }
  if (
    (rule.kind === "blade_per_series_on_stage" || rule.kind === "blade_per_series_on_stage_except_self") &&
    Object.keys(hearts).length
  ) {
    Object.keys(hearts).forEach(function (k) {
      hearts[k] = (hearts[k] || 0) * scaleN;
    });
  }
  out.bladeBonus = blade;
  out.heartSlots = hearts;
  return out;
}

/** @param {JoujiRule} rule @param {*} inst @param {*} card @param {JoujiBoardContext} ctx */
function scalingCount(rule, inst, card, ctx) {
  if (rule.kind === "blade_per_own_success_live") return ctx.ownSuccessLiveCount();
  if (rule.kind === "blade_per_opponent_wait" || rule.kind === "heart_per_opponent_wait") {
    return ctx.opponentStageWaitCount();
  }
  if (rule.kind === "blade_per_energy_below") return ctx.energyCountBelowMember(inst);
  if (rule.kind === "blade_per_stage_member") {
    var n = 0;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m || m.id === inst.id) return;
      if (rule.excludeSeriesTag && ctx.memberMatchesSeries(m, rule.excludeSeriesTag)) return;
      if (rule.minMemberCostOnStage && ctx.memberPrintedCost(m) < rule.minMemberCostOnStage) return;
      n++;
    });
    return n;
  }
  if (rule.kind === "blade_per_series_on_stage" || rule.kind === "blade_per_series_on_stage_except_self") {
    var cnt = 0;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m) return;
      if (rule.kind === "blade_per_series_on_stage_except_self" && String(m.id) === String(inst.id)) return;
      if (rule.seriesTag && ctx.memberMatchesSeries(m, rule.seriesTag)) cnt++;
    });
    return cnt;
  }
  return 0;
}

/** @param {JoujiRule} rule @param {*} inst @param {*} card @param {JoujiBoardContext} ctx */
function conditionMet(rule, inst, card, ctx) {
  if (rule.selfWait && !ctx.memberIsWait(inst)) return false;
  if (rule.notMovedThisTurn === true && ctx.memberMovedThisTurn(inst)) return false;
  if (rule.minEnergy != null && ctx.ownEnergyCount() < rule.minEnergy) return false;
  if (rule.minActiveEnergy != null) {
    var activeN =
      typeof ctx.ownActiveEnergyCount === "function" ? ctx.ownActiveEnergyCount() : ctx.ownEnergyCount();
    if (activeN < rule.minActiveEnergy) return false;
  }
  if (rule.exactEnergy != null && ctx.ownEnergyCount() !== rule.exactEnergy) return false;
  if (rule.minCombinedEnergy != null && ctx.ownEnergyCount() + ctx.opponentEnergyCount() < rule.minCombinedEnergy) {
    return false;
  }
  if (rule.opponentMoreEnergy && ctx.ownEnergyCount() <= ctx.opponentEnergyCount()) return false;
  if (rule.minSuccessLiveCount != null && ctx.ownSuccessLiveCount() < rule.minSuccessLiveCount) return false;
  if (rule.maxOwnSuccessLive != null && ctx.ownSuccessLiveCount() > rule.maxOwnSuccessLive) return false;
  if (rule.minOpponentSuccessLive != null && ctx.opponentSuccessLiveCount() < rule.minOpponentSuccessLive) {
    return false;
  }
  if (rule.minSuccessLiveScoreSum != null && ctx.ownSuccessLiveScoreSum() < rule.minSuccessLiveScoreSum) {
    return false;
  }
  if (
    rule.minOpponentSuccessLiveScoreSum != null &&
    ctx.opponentSuccessLiveScoreSum() < rule.minOpponentSuccessLiveScoreSum
  ) {
    return false;
  }
  if (rule.minCombinedSuccessLive != null) {
    if (ctx.ownSuccessLiveCount() + ctx.opponentSuccessLiveCount() < rule.minCombinedSuccessLive) return false;
  }
  if (rule.minCost13OnAnyStage != null) {
    var has13 = false;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (m && ctx.memberPrintedCost(m) >= 13) has13 = true;
    });
    if (!has13 && ctx.eachOpponentStageColumnMembers) {
      ctx.eachOpponentStageColumnMembers().forEach(function (m) {
        if (m && ctx.memberPrintedCost(m) >= 13) has13 = true;
      });
    }
    if (!has13) return false;
  }
  if (rule.minTotalMembersBothStages != null && ctx.totalMembersBothStages() < rule.minTotalMembersBothStages) {
    return false;
  }
  if (rule.minOpponentWaitOnStage != null && ctx.opponentStageWaitCount() < rule.minOpponentWaitOnStage) {
    return false;
  }
  if (rule.minEnergyBelowMember != null && ctx.energyCountBelowMember(inst) < rule.minEnergyBelowMember) {
    return false;
  }
  if (rule.requiresSuccessLiveSeriesTag) {
    if (
      typeof ctx.successLiveHasSeriesTag !== "function" ||
      !ctx.successLiveHasSeriesTag(rule.requiresSuccessLiveSeriesTag)
    ) {
      return false;
    }
  }
  if (rule.leftRightSideExactPrintedBlade != null) {
    var needSideBlade = Number(rule.leftRightSideExactPrintedBlade);
    if (
      typeof ctx.stageColumnHasMemberWithExactPrintedBlade !== "function" ||
      !ctx.stageColumnHasMemberWithExactPrintedBlade("left", needSideBlade) ||
      !ctx.stageColumnHasMemberWithExactPrintedBlade("right", needSideBlade)
    ) {
      return false;
    }
  }
  if (rule.minLiveCardsInFrames != null) {
    if (rule.liveSeriesTag === "虹ヶ咲") {
      if (!ctx.liveFramesHave3PlusWithSeries()) return false;
    }
  }
  if (
    (rule.kind === "stage_all_areas_series_distinct" ||
      rule.kind === "stage_all_areas_series_distinct_score" ||
      rule.kind === "stage_all_areas_grant_quoted") &&
    rule.seriesTag
  ) {
    if (!ctx.stageHasAllAreasDistinctSeriesMembers(rule.seriesTag)) return false;
  }
  if (rule.kind === "blade_if_series_on_stage" && rule.seriesTag) {
    var found = false;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (m && String(m.id) !== String(inst.id) && ctx.memberMatchesSeries(m, rule.seriesTag)) found = true;
    });
    if (!found) return false;
  }
  if (rule.kind === "blade_if_character_on_stage") {
    if (rule.characterName && !ctx.stageHasCharacterName(rule.characterName)) return false;
    if (rule.characterNamesAny && !ctx.stageHasAnyCharacterName(rule.characterNamesAny)) return false;
  }
  if (rule.kind === "lose_blade_if_alone_on_stage") {
    var others = 0;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (m && String(m.id) !== String(inst.id)) others++;
    });
    if (others > 0) return false;
  }
  if (rule.centerHighestCost) {
    var col = ctx.memberStageColumn(inst);
    if (col !== "center") return false;
    var myCost = ctx.memberPrintedCost(inst);
    var ok = true;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m || String(m.id) === String(inst.id)) return;
      if (ctx.memberPrintedCost(m) > myCost) ok = false;
    });
    if (!ok) return false;
  }
  if (rule.mostHeartsOnBothStages) {
    var mine = ctx.memberTotalHearts(inst);
    var beat = true;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m || String(m.id) === String(inst.id)) return;
      if (ctx.memberTotalHearts(m) >= mine) beat = false;
    });
    /* カード文は「自分と相手のステージの中で」— 相手ステージのメンバーとも比較する */
    if (typeof ctx.eachOpponentStageColumnMembers === "function") {
      ctx.eachOpponentStageColumnMembers().forEach(function (m) {
        if (!m || String(m.id) === String(inst.id)) return;
        if (ctx.memberTotalHearts(m) >= mine) beat = false;
      });
    }
    if (!beat) return false;
  }
  if (rule.opponentExtraHeartSurplus != null) {
    if (ctx.opponentExtraHeartSurplus() < rule.opponentExtraHeartSurplus) return false;
  }
  if (rule.minDistinctNameStageMembers != null) {
    var names = {};
    var distinct = 0;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m) return;
      var nm = String(ctx.mergedCatalog(m).name || "");
      if (!nm || names[nm]) return;
      names[nm] = true;
      distinct++;
    });
    if (distinct < rule.minDistinctNameStageMembers) return false;
  }
  if (rule.minDistinctCostStageMembers != null) {
    var costs = {};
    var dc = 0;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m) return;
      var c = ctx.memberPrintedCost(m);
      if (costs[c]) return;
      costs[c] = true;
      dc++;
    });
    if (dc < rule.minDistinctCostStageMembers) return false;
  }
  if (rule.minMemberCostOnStage === 1 && rule.kind === "blade_conditional") {
    var selfC = ctx.memberPrintedCost(inst);
    var higher = false;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m || String(m.id) === String(inst.id)) return;
      if (ctx.memberPrintedCost(m) > selfC) higher = true;
    });
    if (!higher) return false;
  }
  if (rule.requiresLiveFrameNoStartSuccessAbility) {
    if (
      typeof ctx.liveFrameHasNoStartSuccessAbilityLive !== "function" ||
      !ctx.liveFrameHasNoStartSuccessAbilityLive()
    ) {
      return false;
    }
  }
  if (rule.ownSuccessScoreBeatsOpponent) {
    if (ctx.ownSuccessLiveScoreSum() <= ctx.opponentSuccessLiveScoreSum()) return false;
  }
  if (rule.kind === "blade_if_lower_stage_cost_sum") {
    var ownSum = 0;
    var oppSum = 0;
    ctx.eachStageColumnMembers().forEach(function (m) {
      if (!m) return;
      if (ctx.memberIsOpponentProxy(m)) oppSum += ctx.memberPrintedCost(m);
      else ownSum += ctx.memberPrintedCost(m);
    });
    if (ownSum >= oppSum) return false;
  }
  return true;
}

/**
 * @param {*} card
 * @param {*} inst
 * @param {JoujiBoardContext} ctx
 * @param {string[]} [extraSegmentRaws] 付与常時など
 * @returns {JoujiEvalResult}
 */
export function evaluateMemberJouji(card, inst, ctx, extraSegmentRaws) {
  var acc = emptyJoujiEval();
  if (!card || !inst) return acc;
  var raws = listNativeJoujiSegmentRaws(card).slice();
  if (extraSegmentRaws && extraSegmentRaws.length) raws = raws.concat(extraSegmentRaws);
  for (var i = 0; i < raws.length; i++) {
    var rule = classifyJoujiSegment(raws[i]);
    if (!rule) continue;
    if (rule.kind === "hand_cost_reduce" && rule.handCostReduceNoAbility && !ctx.memberHasNoPrintedAbility(inst)) {
      continue;
    }
    if (rule.kind === "hand_cost_reduce" && rule.handCostReduceSeriesTag) {
      var mc = ctx.mergedCatalog(inst);
      if (!catalogCardMatchesGroupTag(mc, rule.handCostReduceSeriesTag)) continue;
      if (rule.handCostReduceTargetCost != null) {
        var pc = ctx.memberPrintedCost(inst);
        if (pc !== rule.handCostReduceTargetCost) continue;
      }
    }
    if (rule.kind === "hand_cost_reduce" && rule.requiresSeriesMemberMovedThisTurn) {
      var movedSerHit = false;
      ctx.eachStageColumnMembers().forEach(function (sm) {
        if (movedSerHit || !sm) return;
        if (!ctx.memberMatchesSeries(sm, rule.requiresSeriesMemberMovedThisTurn)) return;
        if (typeof ctx.memberMovedThisTurn === "function" && ctx.memberMovedThisTurn(sm)) movedSerHit = true;
      });
      if (!movedSerHit) continue;
    }
    mergeJoujiEval(acc, evaluateJoujiRule(rule, inst, card, ctx));
  }
  return acc;
}

/** @param {Record<number, number>} slots @param {number} si */
/**
 * ステージ常時が付与する「無能力メンバーの手札登場コスト－N」の最大値。
 * @param {*} state
 * @param {(id: string) => *} findInst
 * @param {(inst: *) => *} mergedCatalog
 * @param {JoujiBoardContext} ctx
 */
export function computeStageGrantHandCostReduceNoAbility(state, findInst, mergedCatalog, ctx) {
  var max = 0;
  ["left", "center", "right"].forEach(function (col) {
    (state.stage[col] || []).forEach(function (inst) {
      if (!inst || inst.type !== T_MEMBER) return;
      var card = mergedCatalog(inst);
      var raws = listNativeJoujiSegmentRaws(card);
      for (var i = 0; i < raws.length; i++) {
        var rule = classifyJoujiSegment(raws[i]);
        if (!rule) continue;
        if (rule.kind !== "grant_hand_no_ability_cost_reduce" && rule.kind !== "grant_hand_series_cost_reduce") {
          continue;
        }
        if (!ctx.memberOnStageOnly(inst)) continue;
        if (!conditionMet(rule, inst, card, ctx)) continue;
        max = Math.max(max, rule.handCostReduce || 0);
      }
    });
  });
  return max;
}

/**
 * ステージ常時: 手札の特定シリーズ・コストの登場コスト減少（対象カードごと）。
 * @param {*} targetInst
 * @param {JoujiBoardContext} ctx
 */
export function computeJoujiHandCostReductionForCard(targetInst, ctx) {
  if (!targetInst) return 0;
  var red = 0;
  var mc = ctx.mergedCatalog(targetInst);
  (ctx.eachStageColumnMembers() || []).forEach(function (inst) {
    if (!inst || !ctx.memberOnStageOnly(inst)) return;
    var card = ctx.mergedCatalog(inst);
    var raws = listNativeJoujiSegmentRaws(card);
    for (var i = 0; i < raws.length; i++) {
      var rule = classifyJoujiSegment(raws[i]);
      if (!rule || rule.kind !== "grant_hand_series_cost_reduce") continue;
      if (rule.requiresSuccessLiveSelf) continue;
      if (!conditionMet(rule, inst, card, ctx)) continue;
      if (rule.handCostReduceSeriesTag && !catalogCardMatchesGroupTag(mc, rule.handCostReduceSeriesTag)) {
        continue;
      }
      if (rule.handCostReduceMinCost != null && ctx.memberPrintedCost(targetInst) < rule.handCostReduceMinCost) {
        continue;
      }
      if (rule.handCostReduceTargetCost != null && ctx.memberPrintedCost(targetInst) !== rule.handCostReduceTargetCost) {
        continue;
      }
      red = Math.max(red, rule.handCostReduce || 0);
    }
  });
  var slLives = ctx.successLiveAreaLiveInsts ? ctx.successLiveAreaLiveInsts() : [];
  for (var si = 0; si < slLives.length; si++) {
    var liveInst = slLives[si];
    if (!liveInst) continue;
    var liveCard = ctx.mergedCatalog(liveInst);
    var liveRaws = listNativeJoujiSegmentRaws(liveCard);
    for (var lj = 0; lj < liveRaws.length; lj++) {
      var liveRule = classifyJoujiSegment(liveRaws[lj]);
      if (!liveRule || liveRule.kind !== "grant_hand_series_cost_reduce") continue;
      if (!liveRule.requiresSuccessLiveSelf) continue;
      if (liveRule.handCostReduceSeriesTag && !catalogCardMatchesGroupTag(mc, liveRule.handCostReduceSeriesTag)) {
        continue;
      }
      if (liveRule.handCostReduceMinCost != null && ctx.memberPrintedCost(targetInst) < liveRule.handCostReduceMinCost) {
        continue;
      }
      if (liveRule.handCostReduceTargetCost != null && ctx.memberPrintedCost(targetInst) !== liveRule.handCostReduceTargetCost) {
        continue;
      }
      red = Math.max(red, liveRule.handCostReduce || 0);
    }
  }
  return red;
}

/** @param {*} liveInst @param {JoujiBoardContext} ctx */
export function computeSuccessLiveJoujiScoreBonus(liveInst, ctx) {
  if (!liveInst || !ctx) return 0;
  var card = ctx.mergedCatalog(liveInst);
  var raws = listNativeJoujiSegmentRaws(card);
  var bonus = 0;
  for (var i = 0; i < raws.length; i++) {
    var rule = classifyJoujiSegment(raws[i]);
    if (!rule || rule.kind !== "success_live_self_score_if_series_on_stage") continue;
    if (rule.seriesTag) {
      var hasSeries = false;
      (ctx.eachStageColumnMembers() || []).forEach(function (m) {
        if (m && ctx.memberMatchesSeries(m, rule.seriesTag)) hasSeries = true;
      });
      if (!hasSeries) continue;
    }
    bonus = Math.max(bonus, rule.successLiveScorePlus || 0);
  }
  return bonus;
}

/** 成功ライブ置き場の常時が、ステージ上メンバーへ付与するブレード（Love wing bell 等） */
export function computeSuccessLiveJoujiMemberBladeBonus(memberInst, ctx) {
  if (!memberInst || memberInst.type !== T_MEMBER || !ctx) return 0;
  if (ctx.memberOnStageOnly && !ctx.memberOnStageOnly(memberInst)) return 0;
  var col = ctx.memberStageColumn(memberInst);
  if (!col) return 0;
  var bonus = 0;
  var slLives = ctx.successLiveAreaLiveInsts ? ctx.successLiveAreaLiveInsts() : [];
  for (var si = 0; si < slLives.length; si++) {
    var liveInst = slLives[si];
    if (!liveInst) continue;
    var liveCard = ctx.mergedCatalog(liveInst);
    var liveRaws = listNativeJoujiSegmentRaws(liveCard);
    for (var lj = 0; lj < liveRaws.length; lj++) {
      var rule = classifyJoujiSegment(liveRaws[lj]);
      if (!rule || rule.kind !== "blade_conditional") continue;
      if (!rule.requiresSuccessLiveSelf) continue;
      if (rule.stageAreas && rule.stageAreas.length && rule.stageAreas.indexOf(col) < 0) continue;
      if (rule.grantMemberSeriesTag && !ctx.memberMatchesSeries(memberInst, rule.grantMemberSeriesTag)) {
        continue;
      }
      bonus = Math.max(bonus, Math.floor(Number(rule.bladeFlat) || 0));
    }
  }
  return bonus;
}

/**
 * 成功ライブ常時: ライブフレーム上の対象ライブカードへ付与する必要ハート減少。
 * @param {*} liveTargetInst
 * @param {JoujiBoardContext} ctx
 * @returns {Record<string, number>}
 */
export function computeSuccessLiveJoujiLiveNeedHeartReduceForCard(liveTargetInst, ctx) {
  if (!liveTargetInst || !ctx) return {};
  var targetCard = ctx.mergedCatalog(liveTargetInst);
  if (!targetCard || targetCard.type !== T_LIVE) return {};
  var targetScore = Number(targetCard.score) || 0;
  /** @type {Record<string, number>} */
  var totalReduce = {};
  /** @type {Set<string>} */
  var nonStackingApplied = new Set();
  var slLives = ctx.successLiveAreaLiveInsts ? ctx.successLiveAreaLiveInsts() : [];
  for (var si = 0; si < slLives.length; si++) {
    var slInst = slLives[si];
    if (!slInst) continue;
    var slCard = ctx.mergedCatalog(slInst);
    var liveRaws = listNativeJoujiSegmentRaws(slCard);
    for (var lj = 0; lj < liveRaws.length; lj++) {
      var rule = classifyJoujiSegment(liveRaws[lj]);
      if (!rule || rule.kind !== "success_live_live_need_heart_reduce") continue;
      if (!rule.requiresSuccessLiveSelf) continue;
      if (rule.seriesTag && !catalogCardMatchesGroupTag(targetCard, rule.seriesTag)) continue;
      if (rule.minLivePrintedScore != null && targetScore < rule.minLivePrintedScore) continue;
      if (rule.nonStacking) {
        var stackKey = String(slCard.card_no || slInst.card_no || "sl");
        if (nonStackingApplied.has(stackKey)) continue;
        nonStackingApplied.add(stackKey);
      }
      Object.keys(rule.needHeartReduceMap || {}).forEach(function (k) {
        var n = Math.floor(Number(rule.needHeartReduceMap[k]) || 0);
        if (n > 0) totalReduce[k] = (totalReduce[k] || 0) + n;
      });
    }
  }
  return totalReduce;
}

/** @param {*} card */
export function catalogMemberHasNoAbility(card) {
  var ab = card && card.ability != null ? String(card.ability).trim() : "";
  return ab === "";
}

/** @param {*} card */
export function memberHasMirrorUnderLiveSuccessJouji(card) {
  if (!card) return false;
  var raws = listNativeJoujiSegmentRaws(card);
  for (var i = 0; i < raws.length; i++) {
    var rule = classifyJoujiSegment(raws[i]);
    if (rule && rule.kind === "mirror_under_card_live_success") return true;
  }
  return false;
}

/** @param {*} card */
export function memberHasMirrorUnderKidouJouji(card) {
  if (!card) return false;
  var raws = listNativeJoujiSegmentRaws(card);
  for (var i = 0; i < raws.length; i++) {
    var rule = classifyJoujiSegment(raws[i]);
    if (rule && rule.kind === "mirror_under_card_kidou") return true;
  }
  return false;
}

/** @param {*} inst @param {JoujiBoardContext} ctx */
export function getJoujiBatonSeriesOnlyTag(inst, ctx) {
  if (!inst || !ctx) return null;
  var card = ctx.mergedCatalog(inst);
  var raws = listNativeJoujiSegmentRaws(card);
  for (var i = 0; i < raws.length; i++) {
    var rule = classifyJoujiSegment(raws[i]);
    if (!rule || rule.kind !== "baton_series_only") continue;
    if (rule.requiresStageOnly && !ctx.memberOnStageOnly(inst)) continue;
    return rule.batonSeriesOnlyTag || null;
  }
  return null;
}

export function joujiHeartSlotRead(slots, si) {
  if (!slots || typeof slots !== "object") return 0;
  var v = slots[si] !== undefined ? slots[si] : slots[String(si)];
  return Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0;
}
