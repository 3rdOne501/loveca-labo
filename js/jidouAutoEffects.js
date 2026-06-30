/**
 * メンバーカードの「自動」能力（jidou）の分類。
 * イベント駆動の実行は simulator.js の fireJidouAutoForMember が担当する。
 */
import { splitAbilityByTriggers, parseAbilityBulletChoices } from "./abilityEffects.js";

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

function parsePerTurnLimit(p) {
  if (/ターン1回/.test(p) || /ターン１回/.test(p)) return 1;
  if (/ターン2回/.test(p) || /ターン２回/.test(p)) return 2;
  return 0;
}

function parsePerTurnLimitFromRaw(segRaw, p) {
  var raw = String(segRaw || "");
  if (/turn1\.png|ターン1回|ターン１回/.test(raw + p)) return 1;
  if (/turn2\.png|ターン2回|ターン２回/.test(raw + p)) return 2;
  return parsePerTurnLimit(p);
}

function jidouSegmentResolvedAbilityKind(segRaw) {
  var s = String(segRaw || "");
  if (/\{\{[^}]*live_start|live_start\.png|ライブ開始時/.test(s)) return "live_start";
  if (/\{\{[^}]*live_success|live_success\.png|ライブ成功時/.test(s)) return "live_success";
  return null;
}

/**
 * @param {*} card
 * @returns {string[]}
 */
export function listNativeJidouSegmentRaws(card) {
  if (!card || !card.ability) return [];
  var segs = splitAbilityByTriggers(String(card.ability));
  /** @type {string[]} */
  var out = [];
  for (var i = 0; i < segs.length; i++) {
    if (segs[i].trigger !== "jidou") continue;
    var plain = segmentPlainText(segs[i].text);
    if (!plain || plain === "/" || plain === "を得る。" || plain === "を得る") continue;
    if (i > 0) {
      var prev = segs[i - 1];
      if (prev.trigger && prev.trigger !== "jidou") {
        var prevText = String(prev.text || "");
        if (/「/.test(prevText) && !/」/.test(prevText) && /ライブ終了時まで/.test(prevText)) continue;
      }
    }
    out.push(segs[i].text);
  }
  return out;
}

/**
 * @param {string} segRaw
 * @returns {{ template: string, eventKind?: string, perTurnLimit?: number, deckTopCount?: number, deckDrawCount?: number, handDiscardToWaiting?: number, heartSlot?: number, filters?: object }}
 */
export function classifyJidouAutoSegment(segRaw) {
  var p = normalizeFwDigits(segmentPlainText(segRaw));
  if (!p) return { template: "jidou_manual" };
  var perTurn = parsePerTurnLimitFromRaw(segRaw, p);

  if (/ステージから控え室に置かれたとき/.test(p) && /メンバー1人をアクティブ/.test(p)) {
    return { template: "jidou_leave_stage_activate_one", eventKind: "leave_stage", perTurnLimit: perTurn };
  }
  if (/ステージから控え室に置かれたとき/.test(p) && /手札.*控え室/.test(p) && /控え室から/.test(p)) {
    var hd = p.match(/手札を(\d+)枚控え室/);
    if (/ライブカードとメンバーカード/.test(p) && /それぞれ1枚まで/.test(p)) {
      return {
        template: "jidou_leave_stage_hand_pick_recover",
        eventKind: "leave_stage",
        handDiscardToWaiting: hd ? Number(hd[1]) : 1,
        perTurnLimit: perTurn,
        filters: { pickDualLiveMember: true },
      };
    }
    return {
      template: "jidou_leave_stage_hand_pick_recover",
      eventKind: "leave_stage",
      handDiscardToWaiting: hd ? Number(hd[1]) : 1,
      perTurnLimit: perTurn,
      filters: { pickType: /メンバーカード/.test(p) ? "member" : "live", seriesTag: parseSeriesTag(p) },
    };
  }
  if (/ステージから控え室に置かれたとき/.test(p) && /デッキの上からカードを(\d+)枚見る/.test(p)) {
    var lk = p.match(/デッキの上からカードを(\d+)枚見る/);
    var pickMember = /メンバーカード/.test(p);
    return {
      template: "jidou_leave_stage_deck_look_pick",
      eventKind: "leave_stage",
      deckTopCount: lk ? Number(lk[1]) : 5,
      filters: { pickType: pickMember ? "member" : "live" },
      perTurnLimit: perTurn,
    };
  }
  if (
    /ステージから控え室に置かれたとき/.test(p) &&
    /バトンタッチしていた/.test(p) &&
    /エネルギーを(\d+)枚アクティブ/.test(p) &&
    /コスト(\d+)以上のブレードハートを持たない/.test(p)
  ) {
    var aeBh = p.match(/エネルギーを(\d+)枚アクティブ/);
    var bhThreshAll = [...p.matchAll(/コスト(\d+)以上のブレードハートを持たない/g)];
    var drawBh = p.match(/さらにカードを(\d+)枚引/);
    return {
      template: "jidou_leave_baton_partner_bh_threshold_energy",
      eventKind: "leave_stage_baton",
      filters: { seriesTag: parseSeriesTag(p) },
      energyActiveCount: aeBh ? Number(aeBh[1]) : 2,
      batonPartnerBhThreshold: bhThreshAll[0] ? Number(bhThreshAll[0][1]) : 10,
      deckDrawCount: drawBh ? Number(drawBh[1]) : 1,
      batonPartnerDrawBhThreshold: bhThreshAll[1] ? Number(bhThreshAll[1][1]) : 15,
      perTurnLimit: perTurn,
    };
  }
  if (/ステージから控え室に置かれたとき/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var dr = p.match(/カードを(\d+)枚引/);
    var hd2 = p.match(/手札を(\d+)枚控え室/);
    return {
      template: "jidou_leave_stage_draw_discard",
      eventKind: "leave_stage",
      deckDrawCount: dr ? Number(dr[1]) : 1,
      handDiscardToWaiting: hd2 ? Number(hd2[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (
    (/バトンタッチして登場したとき/.test(p) || /このメンバーか、ほかのメンバーがバトンタッチして登場したとき/.test(p)) &&
    /カードを(\d+)枚引/.test(p)
  ) {
    var drB = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_enter_or_baton_draw",
      eventKind: "enter_or_baton",
      deckDrawCount: drB ? Number(drB[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (/登場か、エリアを移動するたび/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_area_move_grant_jouji", eventKind: "area_move", perTurnLimit: perTurn };
  }
  if (/センターエリアにいるメンバーがエリアを移動したとき/.test(p) && /以下から1つを選ぶ/.test(p)) {
    var centerChoices = parseAbilityBulletChoices(segRaw);
    return {
      template: "jidou_center_member_move_choice",
      eventKind: "center_member_area_move",
      abilityChoices: centerChoices.length ? centerChoices : parseAbilityBulletChoices(p),
      perTurnLimit: perTurn,
    };
  }
  if (/エリアを移動したとき/.test(p) && /ライブ終了時まで/.test(p) && /を得る/.test(p)) {
    return { template: "jidou_area_move_grant_jouji", eventKind: "area_move", perTurnLimit: perTurn };
  }
  if (/エリアを移動するたび/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var drM = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_area_move_draw",
      eventKind: "area_move",
      deckDrawCount: drM ? Number(drM[1]) : 1,
      perTurnLimit: perTurn,
    };
  }
  if (/エリアを移動したとき/.test(p) && /エネルギーデッキから.*ウェイト/.test(p)) {
    return { template: "jidou_area_move_energy_wait", eventKind: "area_move", perTurnLimit: perTurn };
  }
  if (/エリアを移動したとき/.test(p) && /控え室から/.test(p) && /手札に加/.test(p)) {
    return {
      template: "jidou_area_move_wait_pick_hand",
      eventKind: "area_move",
      filters: { pickType: /ライブカード/.test(p) ? "live" : "member", seriesTag: parseSeriesTag(p), maxCost: parseMaxCost(p) },
      perTurnLimit: perTurn,
    };
  }
  if (/登場か、エリアを移動したとき/.test(p) && /相手のステージ.*ウェイト/.test(p)) {
    var bladeEnterM =
      p.match(/元々持つ.*?(\d+)つ以下/) ||
      p.match(/ブレード.*?(\d+)つ以下/) ||
      p.match(/元々.*?(\d+)つ以下/);
    return {
      template: "jidou_area_move_opp_wait",
      eventKind: "enter_or_baton",
      altEventKind: "area_move",
      perTurnLimit: perTurn,
      oppWaitMaxPrintedBlade: bladeEnterM ? Number(bladeEnterM[1]) : null,
      oppWaitMaxCost: 99,
    };
  }
  if (/エリアを移動したとき/.test(p) && /相手のステージ.*ウェイト/.test(p)) {
    var owc = p.match(/コスト(\d+)以下/);
    var owm =
      p.match(/元々持つ.*?(\d+)つ以下/) ||
      p.match(/ブレード.*?(\d+)つ以下/) ||
      p.match(/元々.*?(\d+)つ以下/);
    return {
      template: "jidou_area_move_opp_wait",
      eventKind: "area_move",
      perTurnLimit: perTurn,
      oppWaitMaxCost: owc ? Number(owc[1]) : 99,
      oppWaitMaxPrintedBlade: owm ? Number(owm[1]) : null,
    };
  }
  if (/エリアを移動したとき/.test(p) && /エネルギーを(\d+)枚アクティブ/.test(p)) {
    var ae = p.match(/エネルギーを(\d+)枚アクティブ/);
    return {
      template: "jidou_area_move_activate_energy",
      eventKind: "area_move",
      energyActiveCount: ae ? Number(ae[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (/ステージから控え室に置かれたとき/.test(p) && /ポジションチェンジ/.test(p)) {
    return { template: "jidou_leave_stage_position_change", eventKind: "leave_stage", perTurnLimit: perTurn };
  }

  if (/このターン、自分のステージにメンバーが(\d+)回登場/.test(p) && /手札が(\d+)枚になるまで/.test(p)) {
    var entN = p.match(/メンバーが(\d+)回登場/);
    var handT = p.match(/手札が(\d+)枚になるまで/);
    return {
      template: "jidou_stage_entry_draw_until",
      eventKind: "stage_entry_count",
      minStageEntries: entN ? Number(entN[1]) : 3,
      targetHandSize: handT ? Number(handT[1]) : 5,
      perTurnLimit: perTurn,
    };
  }

  if (/自分のステージにコスト(\d+)のメンバーが登場したとき/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var ce = p.match(/コスト(\d+)のメンバーが登場/);
    var drE = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_on_cost_enter_draw",
      eventKind: "stage_entry",
      entryCost: ce ? Number(ce[1]) : 10,
      deckDrawCount: drE ? Number(drE[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (/コスト(\d+)のメンバーが登場したとき/.test(p) && /エネルギーデッキから.*ウェイト/.test(p)) {
    var ce2 = p.match(/コスト(\d+)/);
    return {
      template: "jidou_on_cost_enter_energy_wait",
      eventKind: "stage_entry",
      entryCost: ce2 ? Number(ce2[1]) : 11,
      perTurnLimit: perTurn,
    };
  }

  if (
    (/自分がエールしたとき/.test(p) || /エールにより公開/.test(p)) &&
    /ブレードハートを持たないメンバー.*3枚以上/.test(p) &&
    /ライブ終了時まで/.test(p)
  ) {
    return { template: "jidou_yell_grant_jouji_nobh_members", eventKind: "yell", perTurnLimit: perTurn };
  }
  if (/エールにより公開.*ブレードハートを持つカードがない/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_yell_grant_jouji_no_bh", eventKind: "yell", perTurnLimit: perTurn };
  }
  if (
    /自分がエールしたとき/.test(p) &&
    /ライブ終了時まで/.test(p) &&
    /ライブカード1枚につき/.test(p) &&
    /(\d+)つまでしか得られない/.test(p) &&
    /heart_0?2|heart02|h02|赤/.test(String(segRaw || ""))
  ) {
    var capHeartM = p.match(/(\d+)つまでしか得られない/);
    return {
      template: "jidou_yell_grant_heart_per_live_capped",
      eventKind: "yell",
      heartSlot: 2,
      heartGrantCap: capHeartM ? Number(capHeartM[1]) : 3,
      perTurnLimit: perTurn,
    };
  }
  if (/エールしたとき/.test(p) && /同じグループ名.*3枚以上/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_yell_grant_jouji", eventKind: "yell", perTurnLimit: perTurn, minYellSameGroupMemberCount: 3 };
  }
  if (
    /自分がエールしたとき/.test(p) &&
    /ブレードハートの中に/.test(p) &&
    /3種類以上/.test(p) &&
    /6種類以上/.test(p)
  ) {
    return {
      template: "jidou_yell_distinct_bh_tier_grant",
      eventKind: "yell",
      perTurnLimit: perTurn,
      yellDistinctBhMinForHeart: 3,
      yellDistinctBhMinForJouji: 6,
      yellGrantHeartSlot: 1,
    };
  }
  if (/自分がエールしたとき/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_yell_grant_jouji", eventKind: "yell", perTurnLimit: perTurn };
  }

  if (/エリアを移動するか.*エネルギー置き場にエネルギーが置かれた/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var drEg = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_move_or_energy_draw_grant",
      eventKind: "area_move_or_energy",
      deckDrawCount: drEg ? Number(drEg[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (/エールにより公開.*ライブカードが1枚以上/.test(p) && /ライブ終了時まで/.test(p)) {
    var slot = 4;
    if (/heart04|heart_04|h04|緑/.test(String(segRaw || ""))) slot = 4;
    else if (/heart01|heart_01|h01|桃/.test(String(segRaw || ""))) slot = 1;
    return { template: "jidou_yell_grant_heart", eventKind: "yell", heartSlot: slot, perTurnLimit: perTurn };
  }
  if (/エールにより公開.*ライブカードが1枚以上/.test(p) && /手札が7枚以下/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var drY = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_yell_draw",
      eventKind: "yell",
      deckDrawCount: drY ? Number(drY[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (/メインフェイズの間/.test(p) && /いずれかの領域から控え室に置かれるたび/.test(p) && /手札に加える/.test(p)) {
    return {
      template: "jidou_card_to_waiting_pick_hand",
      eventKind: "card_to_waiting",
      optionalPayEnergy: 1,
      perTurnLimit: perTurn,
    };
  }
  if (/ライブカード置き場から控え室に置かれたとき/.test(p) && /デッキの一番上か一番下/.test(p)) {
    return {
      template: "jidou_live_zone_to_waiting_deck",
      eventKind: "live_zone_to_waiting",
      filters: { seriesTag: parseSeriesTag(p) },
      perTurnLimit: perTurn,
    };
  }
  if (
    /エールにより自分のカードを1枚以上公開したとき/.test(p) &&
    /ブレードハートを持つカードが2枚以下/.test(p) &&
    /もう一度エール/.test(p)
  ) {
    return { template: "jidou_yell_retry_low_bh", eventKind: "yell", perTurnLimit: perTurn };
  }
  if (/エールにより公開.*ライブカードがない/.test(p) && /もう一度エール/.test(p)) {
    return { template: "jidou_yell_retry_no_live", eventKind: "yell", perTurnLimit: perTurn };
  }
  if (
    /自分がエールしたとき/.test(p) &&
    /ブレードハートを持たない/.test(p) &&
    /『Aqours』/.test(p) &&
    /追加で.*エール/.test(p)
  ) {
    var maxExtraAq = p.match(/(\d+)枚までしか追加でエールできない/);
    return {
      template: "jidou_yell_discard_nobh_series_extra_yell",
      eventKind: "yell",
      filters: { seriesTag: "Aqours", pickType: "member" },
      yellCostDivisor: 5,
      maxExtraYellCount: maxExtraAq ? Number(maxExtraAq[1]) : 4,
      maxDiscardCount: 1,
      perTurnLimit: perTurn,
    };
  }
  if (
    /自分がエールしたとき/.test(p) &&
    /ブレードハートを持たない/.test(p) &&
    /『蓮ノ空』/.test(p) &&
    /等しい枚数のエールを追加/.test(p)
  ) {
    var maxDiscHs = p.match(/(\d+)枚まで控え室に置いてもよい/);
    return {
      template: "jidou_yell_discard_nobh_series_multi_extra_yell",
      eventKind: "yell",
      filters: { seriesTag: "蓮ノ空" },
      maxDiscardCount: maxDiscHs ? Number(maxDiscHs[1]) : 3,
      perTurnLimit: perTurn,
    };
  }
  if (/メインフェイズにこのカードが控え室から手札に加えられたとき/.test(p) && /ライブカード置き場に置いてもよい/.test(p)) {
    var namedLiveM = p.match(/カード名が「([^」]+)」/);
    return {
      template: "jidou_waiting_to_hand_place_named_live",
      eventKind: "waiting_to_hand",
      namedLiveCard: namedLiveM ? namedLiveM[1] : null,
      liveSetLimitPenalty: 1,
      perTurnLimit: perTurn,
    };
  }
  if (/このカードが表向きでライブカード置き場に置かれたとき/.test(p) && /ライブ終了時まで/.test(p) && /メンバー1人/.test(p)) {
    return {
      template: "jidou_live_placed_grant_stage_member",
      eventKind: "live_placed_on_frame",
      filters: { seriesTag: parseSeriesTag(p) },
      perTurnLimit: perTurn,
    };
  }
  if (/センターエリアにいる/.test(p) && /μ's/.test(p) && /メンバー.*能力が解決したとき/.test(p) && /ポジションチェンジ/.test(p)) {
    return {
      template: "jidou_center_muse_ability_position_change",
      eventKind: "member_ability_resolved",
      resolvedAbilityKind: jidouSegmentResolvedAbilityKind(segRaw),
      perTurnLimit: perTurn,
    };
  }
  if (/センターエリアにいる/.test(p) && /μ's/.test(p) && /メンバー.*能力が解決したとき/.test(p) && /移動している場合/.test(p) && /スコアを/.test(p)) {
    return {
      template: "jidou_center_muse_ability_score_if_moved",
      eventKind: "member_ability_resolved",
      resolvedAbilityKind: jidouSegmentResolvedAbilityKind(segRaw),
      perTurnLimit: perTurn,
    };
  }
  if (/自分のカードの効果によって/.test(p) && /相手のステージ.*ウェイト/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var owD = p.match(/コスト(\d+)以下/);
    var drOw = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_opp_wait_draw",
      eventKind: "opp_wait_from_effect",
      oppWaitMaxCost: owD ? Number(owD[1]) : 4,
      deckDrawCount: drOw ? Number(drOw[1]) : 1,
      perTurnLimit: perTurn,
    };
  }
  if (/ほかの/.test(p) && /登場するたび/.test(p) && /支払ってもよい/.test(p) && /エネルギーを(\d+)枚アクティブ/.test(p)) {
    var aeS = p.match(/エネルギーを(\d+)枚アクティブ/);
    return {
      template: "jidou_series_enter_pay_energy",
      eventKind: "stage_entry",
      filters: { seriesTag: parseSeriesTag(p) },
      energyActiveCount: aeS ? Number(aeS[1]) : 2,
      optionalPayEnergy: 1,
      perTurnLimit: perTurn || 2,
    };
  }
  if (/手札からカードが1枚以上控え室に置かれるたび/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_hand_to_waiting_grant", eventKind: "hand_to_waiting", perTurnLimit: perTurn || 2 };
  }
  if (/ステージに/.test(p) && /登場するたび/.test(p) && /ライブ終了時まで/.test(p) && /を得る/.test(p) && !/手札から/.test(p) && !/ほかの/.test(p) && !/相手/.test(p)) {
    return {
      template: "jidou_series_enter_grant",
      eventKind: "stage_entry",
      filters: { seriesTag: parseSeriesTag(p) },
      requiresCenter: /センター/.test(String(segRaw || "")),
      perTurnLimit: perTurn || 2,
    };
  }
  if (/登場したとき/.test(p) && /相手は.*ウェイトにする/.test(p) && !/してもよい/.test(p)) {
    return {
      template: "jidou_series_enter_opp_wait",
      eventKind: "stage_entry",
      filters: { seriesTag: parseSeriesTag(p) },
      perTurnLimit: perTurn,
    };
  }
  if (/メインフェイズの間/.test(p) && /アクティブ状態からウェイト状態になったとき/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var drSw = p.match(/カードを(\d+)枚引/);
    var hdSw = p.match(/手札を(\d+)枚控え室/);
    return {
      template: "jidou_self_active_to_wait_draw_discard",
      eventKind: "self_active_to_wait",
      deckDrawCount: drSw ? Number(drSw[1]) : 1,
      handDiscardToWaiting: hdSw ? Number(hdSw[1]) : 1,
      perTurnLimit: perTurn,
    };
  }
  if (/エネルギー置き場にエネルギーカードが置かれるたび/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_energy_placed_grant", eventKind: "energy_placed", perTurnLimit: perTurn };
  }
  if (/バトンタッチして控え室に置かれた/.test(p) && /エネルギーを(\d+)枚アクティブ/.test(p)) {
    var aeB = p.match(/エネルギーを(\d+)枚アクティブ/);
    var mcB = p.match(/コスト(\d+)以上/);
    return {
      template: "jidou_baton_leave_activate_energy",
      eventKind: "leave_stage_baton",
      filters: { seriesTag: parseSeriesTag(p), minCost: mcB ? Number(mcB[1]) : 10 },
      energyActiveCount: aeB ? Number(aeB[1]) : 2,
      perTurnLimit: perTurn,
    };
  }
  if (/ステージから控え室に置かれたとき/.test(p) && /手札を(\d+)枚控え室に置いてもよい/.test(p) && /ステージにいるメンバー1人/.test(p)) {
    var hdGm = p.match(/手札を(\d+)枚控え室/);
    return {
      template: "jidou_leave_stage_hand_grant_member",
      eventKind: "leave_stage",
      handDiscardToWaiting: hdGm ? Number(hdGm[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (
    /ステージにいるメンバー/.test(p) &&
    /能力が解決するたび/.test(p) &&
    /ライブ終了時まで/.test(p) &&
    /(icon_all\.png|heart_00\.png|heart0)/i.test(String(segRaw || "")) &&
    /(live_start\.png|ライブ開始時)/.test(String(segRaw || ""))
  ) {
    return {
      template: "jidou_member_live_start_grant_all_heart",
      eventKind: "member_live_start_resolved",
      perTurnLimit: perTurn,
    };
  }
  if (
    /ステージにいるメンバー/.test(p) &&
    /能力が解決するたび/.test(p) &&
    /カードを(\d+)枚引/.test(p) &&
    /(live_success\.png|ライブ成功時)/.test(String(segRaw || ""))
  ) {
    var drLs = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_member_live_success_draw",
      eventKind: "member_live_success_resolved",
      deckDrawCount: drLs ? Number(drLs[1]) : 1,
      perTurnLimit: perTurn,
    };
  }

  if (
    (/自分のライブが成功する/.test(p) || /ライブが成功する/.test(p)) &&
    /このメンバーがエリアを移動したとき/.test(p) &&
    /控え室/.test(p) &&
    /このメンバーの下に置/.test(p)
  ) {
    return {
      template: "jidou_live_success_or_area_move_wait_under",
      eventKind: "area_move",
      altEventKind: "live_success_own",
      filters: { pickType: "member", seriesTag: parseSeriesTag(p) },
      perTurnLimit: perTurn,
    };
  }

  if (
    /自分がエールしたとき/.test(p) &&
    /手札にある/.test(p) &&
    /控え室に置いてもよい/.test(p) &&
    /追加で2枚エール/.test(p)
  ) {
    return {
      template: "jidou_yell_optional_hand_live_extra_yell",
      eventKind: "yell",
      filters: { pickType: "live", seriesTag: parseSeriesTag(p) },
      extraYellCount: 2,
      perTurnLimit: perTurn,
    };
  }

  if (
    /ステージにいる/.test(p) &&
    /センターエリアに移動したとき/.test(p) &&
    /ライブ終了時まで/.test(p) &&
    /ブレード/.test(p + segRaw)
  ) {
    var bladeN = (String(segRaw || "").match(/\{\{icon_blade/g) || []).length;
    if (!bladeN) {
      var bm = p.match(/ブレード.*?(\d+)/);
      bladeN = bm ? Number(bm[1]) : 0;
    }
    return {
      template: "jidou_series_member_to_center_blade_grant",
      eventKind: "member_to_center",
      seriesTag: parseSeriesTag(p),
      bladeGain: bladeN || 4,
      perTurnLimit: perTurn,
    };
  }

  return { template: "jidou_manual" };
}

/** @param {string} p */
function parseSeriesTag(p) {
  var m = p.match(/『([^』]+)』/);
  return m ? m[1] : null;
}

/** @param {string} p */
function parseMaxCost(p) {
  var m = p.match(/スコア(\d+)以下/);
  if (m) return Number(m[1]);
  m = p.match(/コスト(\d+)以下/);
  return m ? Number(m[1]) : null;
}

/** @param {string} template */
export function jidouEffectIsAutomated(template) {
  return (
    template === "jidou_leave_stage_activate_one" ||
    template === "jidou_leave_stage_hand_pick_recover" ||
    template === "jidou_leave_stage_deck_look_pick" ||
    template === "jidou_leave_stage_draw_discard" ||
    template === "jidou_leave_baton_partner_bh_threshold_energy" ||
    template === "jidou_enter_or_baton_draw" ||
    template === "jidou_area_move_grant_jouji" ||
    template === "jidou_center_member_move_choice" ||
    template === "jidou_area_move_draw" ||
    template === "jidou_area_move_energy_wait" ||
    template === "jidou_area_move_wait_pick_hand" ||
    template === "jidou_area_move_opp_wait" ||
    template === "jidou_yell_grant_jouji" ||
    template === "jidou_yell_distinct_bh_tier_grant" ||
    template === "jidou_yell_grant_jouji_nobh_members" ||
    template === "jidou_yell_grant_jouji_no_bh" ||
    template === "jidou_yell_grant_heart" ||
    template === "jidou_yell_grant_heart_per_live_capped" ||
    template === "jidou_yell_draw" ||
    template === "jidou_leave_stage_position_change" ||
    template === "jidou_stage_entry_draw_until" ||
    template === "jidou_on_cost_enter_draw" ||
    template === "jidou_on_cost_enter_energy_wait" ||
    template === "jidou_area_move_activate_energy" ||
    template === "jidou_move_or_energy_draw_grant" ||
    template === "jidou_card_to_waiting_pick_hand" ||
    template === "jidou_live_zone_to_waiting_deck" ||
    template === "jidou_yell_retry_no_live" ||
    template === "jidou_yell_retry_low_bh" ||
    template === "jidou_yell_discard_nobh_series_extra_yell" ||
    template === "jidou_yell_discard_nobh_series_multi_extra_yell" ||
    template === "jidou_waiting_to_hand_place_named_live" ||
    template === "jidou_live_placed_grant_stage_member" ||
    template === "jidou_center_muse_ability_position_change" ||
    template === "jidou_center_muse_ability_score_if_moved" ||
    template === "jidou_opp_wait_draw" ||
    template === "jidou_series_enter_pay_energy" ||
    template === "jidou_hand_to_waiting_grant" ||
    template === "jidou_series_enter_grant" ||
    template === "jidou_series_enter_opp_wait" ||
    template === "jidou_self_active_to_wait_draw_discard" ||
    template === "jidou_energy_placed_grant" ||
    template === "jidou_baton_leave_activate_energy" ||
    template === "jidou_leave_baton_partner_bh_threshold_energy" ||
    template === "jidou_leave_stage_hand_grant_member" ||
    template === "jidou_member_live_start_grant_all_heart" ||
    template === "jidou_member_live_success_draw" ||
    template === "jidou_live_success_or_area_move_wait_under" ||
    template === "jidou_yell_optional_hand_live_extra_yell" ||
    template === "jidou_series_member_to_center_blade_grant"
  );
}
