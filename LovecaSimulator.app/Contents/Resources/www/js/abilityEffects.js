/**
 * カード能力文の分類（cards.json の `ability` フィールド）。
 * ソロプレイの自動処理テンプレートと、手動ガイドへの振り分けに使う。
 */
import { T_LIVE, T_MEMBER } from "./config.js";
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
 *   |'passive_track'
 *   |'guided_manual'} AbilityTemplate
 */

/**
 * @typedef {object} AbilityPickFilters
 * @property {string | null} [pickType] T_MEMBER | T_LIVE
 * @property {number | null} [maxCost]
 * @property {string | null} [seriesTag] 『…』の中身
 * @property {number | null} [minSuccessLiveCount]
 * @property {number | null} [minNeedHeartSlot] 1-6
 * @property {number | null} [minNeedHeartValue]
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

/** @param {string} p @returns {number} 「ブレード」を得る個数（ヒューリスティック） */
function parseBladeGainCount(p) {
  if (!/ブレード.*得る/.test(p)) return 0;
  var m = p.match(/ブレード(?:\s*ブレード)*\s*を得る/);
  if (m) {
    return (m[0].match(/ブレード/g) || []).length;
  }
  var n = p.match(/ブレード(\d+)個?を得る/);
  if (n) return Number(n[1]) || 0;
  if (/ブレードを得る/.test(p)) return 1;
  return 0;
}

/** @param {string} p @returns {AbilityPickFilters} */
export function parseAbilityPickFilters(p) {
  /** @type {AbilityPickFilters} */
  var f = {
    pickType: null,
    maxCost: null,
    seriesTag: null,
    minSuccessLiveCount: null,
    minNeedHeartSlot: null,
    minNeedHeartValue: null,
  };
  if (/メンバーカード/.test(p)) f.pickType = T_MEMBER;
  else if (/ライブカード/.test(p)) f.pickType = T_LIVE;
  var costM = p.match(/コスト(\d+)以下/);
  if (costM) f.maxCost = Number(costM[1]);
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
  return f;
}

/**
 * シリーズタグ（『μ's』等）とカード DB フィールドのゆるい一致。
 * @param {*} cat getCard の結果
 * @param {string} tag
 */
export function catalogCardMatchesSeriesTag(cat, tag) {
  if (!cat || !tag) return true;
  var t = String(tag).trim();
  if (!t) return true;
  var hay = [cat.series, cat.product, cat.unit, cat.name]
    .filter(Boolean)
    .join(" ");
  if (hay.includes(t)) return true;
  if (t === "μ's" && /ラブライブ|μ|m's|mus/i.test(hay)) return true;
  return false;
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
  if (filters.seriesTag && !catalogCardMatchesSeriesTag(cat, filters.seriesTag)) return false;
  if (filters.minNeedHeartSlot != null && filters.minNeedHeartValue != null) {
    var need = cat.need_heart;
    if (!need || typeof need !== "object") return false;
    var key = "heart0" + filters.minNeedHeartSlot;
    var alt = "heart_" + String(filters.minNeedHeartSlot).padStart(2, "0");
    var v = Number(need[key] != null ? need[key] : need[alt]);
    if (!Number.isFinite(v) || v < filters.minNeedHeartValue) return false;
  }
  return true;
}

/**
 * @param {*} card カタログカード
 * @param {string} [trigger] 指定時、そのトリガーセグメントだけを分類する
 * @returns {ClassifiedAbility}
 */
export function classifyCardAbility(card, trigger) {
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
    segRaw = abilityRawSegmentForTrigger(card, trigger);
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
  var costPart = p.split("：")[0] || "";
  base.hasOptionalCost = /もよい/.test(costPart);
  base.costEnergy = /(エネルギー|E)を?(\d+)?枚?支払/.test(costPart) || /E支払/.test(costPart);
  base.costSelfWait = /このメンバーをウェイト/.test(costPart);
  base.handDiscardToWaiting = (function () {
    var m = costPart.match(/手札を(\d+)枚控え室に置/);
    if (m) return Number(m[1]) || null;
    if (/手札を1枚控え室に置/.test(costPart)) return 1;
    return null;
  })();
  base.bladeGain = parseBladeGainCount(p);

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
    if (/控え室にある場合のみ起動/.test(p) && /控え室からステージに登場/.test(p)) {
      return withTrigger("kidou", {
        template: "kidou_wait_to_stage",
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
      return withTrigger("kidou", {
        template: "kidou_stage_wait_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/手札.*控え室に置/.test(p) && /控え室から/.test(p) && /手札に加/.test(p)) {
      var hd = p.match(/手札を(\d+)枚控え室に置/);
      return withTrigger("kidou", {
        template: "kidou_hand_cost_wait_pick_hand",
        requiresOnStage: true,
        handDiscardToWaiting: hd ? Number(hd[1]) : 1,
        filters: parseAbilityPickFilters(p),
      });
    }
    if (/控え室から/.test(p) && /手札に加/.test(p)) {
      return withTrigger("kidou", {
        template: "kidou_wait_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var dk = parseDeckTopCount(p);
    if (dk != null && p.includes("控え室")) {
      return withTrigger("kidou", {
        template: "deck_top_to_waiting",
        deckTopCount: dk,
        requiresOnStage: true,
      });
    }
    return withTrigger("kidou", { template: "guided_manual" });
  }

  if (enterToujyou) {
    var topPick = parseDeckTopCount(p);
    if (topPick != null && /手札に加/.test(p) && /公開/.test(p)) {
      return withTrigger("toujyou", {
        template: "deck_top_pick_recover",
        deckTopCount: topPick,
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var drawM = p.match(/カードを(\d+)枚引/);
    if (!drawM) drawM = p.match(/デッキから(?:カードを)?(\d+)枚.*手札/);
    if (drawM && !p.includes("控え室から") && !p.includes("山札の上からカードを")) {
      return withTrigger("toujyou", {
        template: "draw_from_deck",
        deckDrawCount: Number(drawM[1]) || 1,
        requiresOnStage: true,
      });
    }
    if (
      (/成功ライブ/.test(p) && /手札に加/.test(p)) ||
      (/手札.*公開/.test(p) && /成功ライブ/.test(p))
    ) {
      return withTrigger("toujyou", {
        template: "toujou_success_live_pick_hand",
        requiresOnStage: true,
      });
    }
    if (/控え室から/.test(p) && /手札に加/.test(p)) {
      return withTrigger("toujyou", {
        template: "toujou_wait_pick_hand",
        requiresOnStage: true,
        filters: parseAbilityPickFilters(p),
      });
    }
    var td = parseDeckTopCount(p);
    if (td != null && p.includes("控え室")) {
      return withTrigger("toujyou", {
        template: "deck_top_to_waiting",
        deckTopCount: td,
        requiresOnStage: true,
      });
    }
    return withTrigger("toujyou", { template: "guided_manual", requiresOnStage: true });
  }

  if (enterLiveSuccess) {
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
    if (parseBladeGainCount(p) > 0) {
      return withTrigger("live_start", { template: "passive_track" });
    }
    var lsDraw2 = p.match(/カードを(\d+)枚引/);
    if (lsDraw2) {
      return withTrigger("live_start", {
        template: "draw_from_deck",
        deckDrawCount: Number(lsDraw2[1]) || 1,
      });
    }
    return withTrigger("live_start", { template: "passive_track" });
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
    template === "draw_from_deck"
  );
}
