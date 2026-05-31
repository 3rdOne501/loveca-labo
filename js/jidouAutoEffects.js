/**
 * メンバーカードの「自動」能力（jidou）の分類。
 * イベント駆動の実行は simulator.js の fireJidouAutoForMember が担当する。
 */
import { splitAbilityByTriggers } from "./abilityEffects.js";

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
  var perTurn = parsePerTurnLimit(p);

  if (/ステージから控え室に置かれたとき/.test(p) && /メンバー1人をアクティブ/.test(p)) {
    return { template: "jidou_leave_stage_activate_one", eventKind: "leave_stage", perTurnLimit: perTurn };
  }
  if (/ステージから控え室に置かれたとき/.test(p) && /手札.*控え室/.test(p) && /控え室から/.test(p)) {
    var hd = p.match(/手札を(\d+)枚控え室/);
    return {
      template: "jidou_leave_stage_hand_pick_recover",
      eventKind: "leave_stage",
      handDiscardToWaiting: hd ? Number(hd[1]) : 1,
      perTurnLimit: perTurn,
      filters: { pickType: "live", seriesTag: parseSeriesTag(p) },
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
    return { template: "jidou_area_move_opp_wait", eventKind: "area_move", perTurnLimit: perTurn };
  }
  if (/エリアを移動したとき/.test(p) && /相手のステージ.*ウェイト/.test(p)) {
    var owc = p.match(/コスト(\d+)以下/);
    var owm = p.match(/元々持つ.*が(\d+)つ以下/);
    return {
      template: "jidou_area_move_opp_wait",
      eventKind: "area_move",
      perTurnLimit: perTurn,
      oppWaitMaxCost: owc ? Number(owc[1]) : 99,
      oppWaitMaxIcons: owm ? Number(owm[1]) : 99,
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
      perTurnLimit: perTurn || 1,
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
    return { template: "jidou_yell_grant_jouji_nobh_members", eventKind: "yell", perTurnLimit: perTurn || 1 };
  }
  if (/エールにより公開.*ブレードハートを持つカードがない/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_yell_grant_jouji_no_bh", eventKind: "yell", perTurnLimit: perTurn || 1 };
  }
  if (/自分がエールしたとき/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_yell_grant_jouji", eventKind: "yell", perTurnLimit: perTurn || 1 };
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

  if (/エールしたとき/.test(p) && /同じグループ名.*3枚以上/.test(p) && /ライブ終了時まで/.test(p)) {
    return { template: "jidou_yell_grant_jouji", eventKind: "yell", perTurnLimit: perTurn || 1 };
  }
  if (/エールにより公開.*ライブカードが1枚以上/.test(p) && /ライブ終了時まで/.test(p)) {
    var slot = 4;
    if (/heart04|heart_04|h04|緑/.test(String(segRaw || ""))) slot = 4;
    else if (/heart01|heart_01|h01|桃/.test(String(segRaw || ""))) slot = 1;
    return { template: "jidou_yell_grant_heart", eventKind: "yell", heartSlot: slot, perTurnLimit: perTurn || 1 };
  }
  if (/エールにより公開.*ライブカードが1枚以上/.test(p) && /手札が7枚以下/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var drY = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_yell_draw",
      eventKind: "yell",
      deckDrawCount: drY ? Number(drY[1]) : 1,
      perTurnLimit: perTurn || 1,
    };
  }

  if (/メインフェイズの間/.test(p) && /いずれかの領域から控え室に置かれるたび/.test(p) && /手札に加える/.test(p)) {
    return {
      template: "jidou_card_to_waiting_pick_hand",
      eventKind: "card_to_waiting",
      optionalPayEnergy: 1,
      perTurnLimit: perTurn || 1,
    };
  }
  if (/ライブカード置き場から控え室に置かれたとき/.test(p) && /デッキの一番上か一番下/.test(p)) {
    return {
      template: "jidou_live_zone_to_waiting_deck",
      eventKind: "live_zone_to_waiting",
      filters: { seriesTag: parseSeriesTag(p) },
      perTurnLimit: perTurn || 1,
    };
  }
  if (/エールにより公開.*ライブカードがない/.test(p) && /もう一度エール/.test(p)) {
    return { template: "jidou_yell_retry_no_live", eventKind: "yell", perTurnLimit: perTurn || 1 };
  }
  if (/自分のカードの効果によって/.test(p) && /相手のステージ.*ウェイト/.test(p) && /カードを(\d+)枚引/.test(p)) {
    var owD = p.match(/コスト(\d+)以下/);
    var drOw = p.match(/カードを(\d+)枚引/);
    return {
      template: "jidou_opp_wait_draw",
      eventKind: "opp_wait_from_effect",
      oppWaitMaxCost: owD ? Number(owD[1]) : 4,
      deckDrawCount: drOw ? Number(drOw[1]) : 1,
      perTurnLimit: perTurn || 1,
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
      perTurnLimit: perTurn || 1,
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
      perTurnLimit: perTurn || 1,
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
    template === "jidou_enter_or_baton_draw" ||
    template === "jidou_area_move_grant_jouji" ||
    template === "jidou_area_move_draw" ||
    template === "jidou_area_move_energy_wait" ||
    template === "jidou_area_move_wait_pick_hand" ||
    template === "jidou_area_move_opp_wait" ||
    template === "jidou_yell_grant_jouji" ||
    template === "jidou_yell_grant_jouji_nobh_members" ||
    template === "jidou_yell_grant_jouji_no_bh" ||
    template === "jidou_yell_grant_heart" ||
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
    template === "jidou_opp_wait_draw" ||
    template === "jidou_series_enter_pay_energy" ||
    template === "jidou_hand_to_waiting_grant" ||
    template === "jidou_series_enter_grant" ||
    template === "jidou_series_enter_opp_wait" ||
    template === "jidou_self_active_to_wait_draw_discard" ||
    template === "jidou_energy_placed_grant" ||
    template === "jidou_baton_leave_activate_energy" ||
    template === "jidou_leave_stage_hand_grant_member"
  );
}
