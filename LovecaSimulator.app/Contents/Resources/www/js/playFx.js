/** ソロ／対戦プレイ中のワンショット演出（軽量モード・reduce-motion では無効） */

export const PLAY_FX_MS = 1000;
/** 効果不発 */
export const PLAY_FX_FIZZLE_MS = 920;
/** コスト10–12登場（控えめ） */
export const PLAY_FX_MID_MS = 1080;
/** 能力解決（標準） */
export const PLAY_FX_ABILITY_MS = 850;
/** コスト13+の能力解決 */
export const PLAY_FX_ABILITY_HIGH_MS = 1150;
/** コスト13+登場・打点9+ライブ開始 */
export const PLAY_FX_PREMIUM_MS = 1500;
/** コスト15+登場 */
export const PLAY_FX_ULTRA_MS = 1800;

const FIELD_ABILITY_KINDS = { toujyou: true, kidou: true, jidou: true, live_start: true, live_success: true };
const ENTER_FX_KINDS = { enter: true, baton: true, live_start: true, live_card: true };

/**
 * @param {*} c
 * @returns {{ premium: boolean, tier: number, ability: boolean, abilityHigh: boolean }}
 */
function playFxEnterMetaFromCard(c) {
  var tier = Math.max(0, Math.min(2, Math.floor(Number(c._playFxEnterPremiumTier) || 0)));
  if (c._playFxEnterPremium === true && tier < 1 && c._playFxEnterPremiumMid !== true) tier = 1;
  return {
    premium: tier > 0 || c._playFxEnterPremiumMid === true,
    tier: tier,
    mid: c._playFxEnterPremiumMid === true,
    ability: false,
    abilityHigh: false,
  };
}

/**
 * 登場・バトン・ライブ配置の演出（能力解決の markPlayFx と独立して保持）
 * @param {*} c
 * @param {string} kind enter | baton | live_start | live_card
 * @param {{ premium?: boolean, tier?: number }} [opts]
 */
export function markPlayFxEnter(c, kind, opts) {
  opts = opts || {};
  if (!c || typeof c !== "object" || !kind) return;
  c._playFxEnterAt = Date.now();
  c._playFxEnterKind = String(kind);
  if (opts.mid) {
    c._playFxEnterPremium = true;
    c._playFxEnterPremiumMid = true;
    c._playFxEnterPremiumTier = 0;
  } else if (opts.premium) {
    c._playFxEnterPremium = true;
    delete c._playFxEnterPremiumMid;
    c._playFxEnterPremiumTier = opts.tier >= 2 ? 2 : 1;
  } else {
    delete c._playFxEnterPremium;
    delete c._playFxEnterPremiumMid;
    delete c._playFxEnterPremiumTier;
  }
}

/**
 * @param {*} c
 * @param {number} [nowMs]
 * @param {boolean} [lightweight]
 * @returns {{ kind: string, durationMs: number, premium: boolean, tier: number, ability: boolean, abilityHigh: boolean } | null}
 */
export function playFxEnterInfo(c, nowMs, lightweight) {
  if (lightweight || !c || !c._playFxEnterAt || !c._playFxEnterKind) return null;
  var now = nowMs != null ? nowMs : Date.now();
  var elapsed = now - Number(c._playFxEnterAt);
  var kind = String(c._playFxEnterKind);
  if (!ENTER_FX_KINDS[kind]) return null;
  var meta = playFxEnterMetaFromCard(c);
  var dur = playFxDurationMs(kind, meta);
  if (elapsed > dur + 160) {
    delete c._playFxEnterAt;
    delete c._playFxEnterKind;
    delete c._playFxEnterPremium;
    delete c._playFxEnterPremiumMid;
    delete c._playFxEnterPremiumTier;
    return null;
  }
  return {
    kind: kind,
    durationMs: dur,
    premium: meta.premium,
    tier: meta.tier,
    mid: meta.mid === true,
    ability: false,
    abilityHigh: false,
  };
}

/** @param {*} c @param {number} [nowMs] */
export function playFxEnterRemainingMs(c, nowMs) {
  var info = playFxEnterInfo(c, nowMs, false);
  if (!info || !c || !c._playFxEnterAt) return 0;
  var now = nowMs != null ? nowMs : Date.now();
  return Math.max(0, info.durationMs + 160 - (now - Number(c._playFxEnterAt)));
}

/**
 * @param {*} c カードインスタンス
 * @param {string} kind enter | baton | position | live_start | live_card | toujyou | kidou | live_success
 */
export function markPlayFx(c, kind) {
  if (!c || typeof c !== "object" || !kind) return;
  c._playFxAt = Date.now();
  c._playFxKind = String(kind);
  delete c._playFxPremium;
  delete c._playFxPremiumTier;
  delete c._playFxAbility;
  delete c._playFxAbilityHigh;
}

/**
 * @param {*} c
 * @param {string} kind
 * @param {1|2} [tier] 1=コスト13+ / 2=コスト15+
 */
export function markPlayFxPremium(c, kind, tier) {
  markPlayFx(c, kind);
  if (!c || typeof c !== "object") return;
  c._playFxPremium = true;
  c._playFxPremiumTier = tier >= 2 ? 2 : 1;
}

/** 能力解決時の演出。コスト13+は豪華版（1.4秒） */
export function markPlayFxAbility(c, kind, opts) {
  markPlayFx(c, kind);
  if (!c || typeof c !== "object") return;
  opts = opts || {};
  var cost = Number(opts.cost);
  var high =
    opts.highCost === true ||
    (Number.isFinite(cost) && cost >= 13);
  if (high) {
    c._playFxAbility = true;
    c._playFxAbilityHigh = true;
  }
}

/**
 * @param {Array<*>} cards
 * @param {string} kind
 * @param {{ premium?: boolean, tier?: number }} [opts]
 */
export function markPlayFxMany(cards, kind, opts) {
  if (!Array.isArray(cards)) return;
  opts = opts || {};
  cards.forEach(function (c) {
    if (ENTER_FX_KINDS[kind]) {
      if (opts.premium) markPlayFxEnter(c, kind, { premium: true, tier: opts.tier });
      else markPlayFxEnter(c, kind, {});
    } else if (opts.premium) markPlayFxPremium(c, kind, opts.tier);
    else markPlayFx(c, kind);
  });
}

/**
 * @param {*} c
 * @returns {{ premium: boolean, tier: number, ability: boolean }}
 */
function playFxMetaFromCard(c) {
  var tier = Math.max(0, Math.min(2, Math.floor(Number(c._playFxPremiumTier) || 0)));
  if (c._playFxPremium === true && tier < 1) tier = 1;
  return {
    premium: tier > 0,
    tier: tier,
    ability: c._playFxAbility === true,
    abilityHigh: c._playFxAbilityHigh === true,
  };
}

/**
 * @param {string} [_kind]
 * @param {{ premium?: boolean, tier?: number, ability?: boolean, abilityHigh?: boolean } | boolean} [opts]
 */
export function playFxDurationMs(_kind, opts) {
  if (opts === true) opts = { premium: true };
  opts = opts || {};
  if (opts.tier >= 2) return PLAY_FX_ULTRA_MS;
  if (opts.premium && opts.mid) return PLAY_FX_MID_MS;
  if (opts.premium || opts.tier >= 1) return PLAY_FX_PREMIUM_MS;
  if (opts.abilityHigh) return PLAY_FX_ABILITY_HIGH_MS;
  if (FIELD_ABILITY_KINDS[_kind]) return PLAY_FX_ABILITY_MS;
  return PLAY_FX_MS;
}

/** @param {*} c */
export function markPlayFxFizzle(c) {
  if (!c || typeof c !== "object") return;
  c._playFxFizzleAt = Date.now();
}

/**
 * @param {*} c
 * @param {number} [nowMs]
 * @param {boolean} [lightweight]
 */
export function playFxFizzleInfo(c, nowMs, lightweight) {
  if (lightweight || !c || !c._playFxFizzleAt) return null;
  var now = nowMs != null ? nowMs : Date.now();
  var elapsed = now - Number(c._playFxFizzleAt);
  if (elapsed > PLAY_FX_FIZZLE_MS + 160) {
    delete c._playFxFizzleAt;
    return null;
  }
  return { durationMs: PLAY_FX_FIZZLE_MS };
}

/** 登場コストから enter FX ティアを決定 */
export function enterFxOptsFromMemberCost(cost) {
  var c = Math.floor(Number(cost) || 0);
  if (c >= 15) return { premium: true, tier: 2 };
  if (c >= 13) return { premium: true, tier: 1 };
  if (c >= 10) return { mid: true };
  return {};
}

/**
 * @param {*} c
 * @param {number} [nowMs]
 * @param {boolean} [lightweight]
 * @returns {{ kind: string, durationMs: number, premium: boolean, tier: number, ability: boolean } | null}
 */
export function playFxInfo(c, nowMs, lightweight) {
  if (lightweight || !c || !c._playFxAt || !c._playFxKind) return null;
  var now = nowMs != null ? nowMs : Date.now();
  var elapsed = now - Number(c._playFxAt);
  var kind = String(c._playFxKind);
  var meta = playFxMetaFromCard(c);
  var dur = playFxDurationMs(kind, meta);
  if (elapsed > dur + 160) {
    delete c._playFxAt;
    delete c._playFxKind;
    delete c._playFxPremium;
    delete c._playFxPremiumTier;
    delete c._playFxAbility;
    delete c._playFxAbilityHigh;
    return null;
  }
  return {
    kind: kind,
    durationMs: dur,
    premium: meta.premium,
    tier: meta.tier,
    ability: meta.ability,
    abilityHigh: meta.abilityHigh,
  };
}

/** @param {string} kind */
export function playFxChipLabel(kind) {
  if (kind === "enter") return "登場";
  if (kind === "baton") return "バトン";
  if (kind === "position") return "移動";
  if (kind === "live_start") return "ライブ開始";
  if (kind === "live_card") return "ライブ";
  if (kind === "toujyou") return "登場時";
  if (kind === "kidou") return "起動";
  if (kind === "jidou") return "自動";
  if (kind === "live_success") return "成功時";
  return "効果";
}

/** 能力系・プレミアム演出ではチップを出さない（登場時・起動・自動等は表示） */
export function playFxShowsChip(pfx) {
  if (!pfx) return false;
  if (pfx.premium || pfx.tier > 0 || pfx.ability || pfx.abilityHigh) return false;
  return true;
}
