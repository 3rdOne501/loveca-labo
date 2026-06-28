/** ソロ／対戦プレイ中のワンショット演出（軽量モード・reduce-motion では無効） */

export const PLAY_FX_MS = 1000;

/**
 * @param {*} c カードインスタンス
 * @param {string} kind enter | baton | position | live_start | live_card | toujyou | kidou | live_success
 */
export function markPlayFx(c, kind) {
  if (!c || typeof c !== "object" || !kind) return;
  c._playFxAt = Date.now();
  c._playFxKind = String(kind);
}

/** @param {Array<*>} cards @param {string} kind */
export function markPlayFxMany(cards, kind) {
  if (!Array.isArray(cards)) return;
  cards.forEach(function (c) {
    markPlayFx(c, kind);
  });
}

/** @param {string} [_kind] */
export function playFxDurationMs(_kind) {
  return PLAY_FX_MS;
}

/**
 * @param {*} c
 * @param {number} [nowMs]
 * @param {boolean} [lightweight]
 * @returns {{ kind: string, durationMs: number } | null}
 */
export function playFxInfo(c, nowMs, lightweight) {
  if (lightweight || !c || !c._playFxAt || !c._playFxKind) return null;
  var now = nowMs != null ? nowMs : Date.now();
  var elapsed = now - Number(c._playFxAt);
  var kind = String(c._playFxKind);
  var dur = PLAY_FX_MS;
  if (elapsed > dur + 120) {
    delete c._playFxAt;
    delete c._playFxKind;
    return null;
  }
  return { kind: kind, durationMs: dur };
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
