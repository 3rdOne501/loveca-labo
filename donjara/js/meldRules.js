/**
 * 面子ルールモード（設定 showTileNumbers に連動）。
 *  - 数字 OFF: ユニット順子 + 学年刻子 + 同牌刻子（数字順子/数字刻子は不可）
 *  - 数字 ON : 上記 + orderIndex 順子/刻子（複合）
 */
export function meldOptionsFromConfig(config) {
  const numeric = config?.showTileNumbers === true;
  return { numeric, meta: true };
}

export const MELOD_NUMERIC_ONLY = { numeric: true, meta: false };
export const MELOD_META_ONLY = { numeric: false, meta: true };
export const MELOD_COMPOSITE = { numeric: true, meta: true };
