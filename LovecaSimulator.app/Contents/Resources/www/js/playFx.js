/** ソロ／対戦プレイ中のワンショット演出（軽量モード・reduce-motion では無効） */

export const PLAY_FX_MS = 1000;
/** コスト13+の場で使う効果（登場時・起動・ライブ開始時・成功時） */
export const PLAY_FX_ABILITY_HIGH_MS = 1400;
/** コスト13+登場・打点9+ライブ開始 */
export const PLAY_FX_PREMIUM_MS = 1500;
/** コスト15+登場 */
export const PLAY_FX_ULTRA_MS = 1800;

const FIELD_ABILITY_KINDS = { toujyou: true, kidou: true, live_start: true, live_success: true };
const ENTER_FX_KINDS = { enter: true, baton: true, live_start: true, live_card: true };

/**
 * @param {*} c
 * @returns {{ premium: boolean, tier: number, ability: boolean, abilityHigh: boolean }}
 */
function playFxEnterMetaFromCard(c) {
  var tier = Math.max(0, Math.min(2, Math.floor(Number(c._playFxEnterPremiumTier) || 0)));
  if (c._playFxEnterPremium === true && tier < 1) tier = 1;
  return {
    premium: tier > 0,
    tier: tier,
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
  if (opts.premium) {
    c._playFxEnterPremium = true;
    c._playFxEnterPremiumTier = opts.tier >= 2 ? 2 : 1;
  } else {
    delete c._playFxEnterPremium;
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
    delete c._playFxEnterPremiumTier;
    return null;
  }
  return {
    kind: kind,
    durationMs: dur,
    premium: meta.premium,
    tier: meta.tier,
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
  if (opts.premium || opts.tier >= 1) return PLAY_FX_PREMIUM_MS;
  if (opts.abilityHigh) return PLAY_FX_ABILITY_HIGH_MS;
  return PLAY_FX_MS;
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
  if (kind === "live_success") return "成功時";
  return "効果";
}

/** 能力系・プレミアム演出ではチップを出さない */
export function playFxShowsChip(pfx) {
  if (!pfx) return false;
  if (pfx.premium || pfx.tier > 0 || pfx.ability || pfx.abilityHigh) return false;
  if (FIELD_ABILITY_KINDS[pfx.kind]) return false;
  return true;
}
