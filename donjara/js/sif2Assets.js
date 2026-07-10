/**
 * SIF2 由来アセット（立ち絵・ユニットロゴ）の読み込み。
 */
let _cache = null;

export async function loadSif2Assets() {
  if (_cache) return _cache;
  try {
    const res = await fetch("data/sif2-assets.json");
    _cache = await res.json();
  } catch (e) {
    console.warn("[donjara] sif2-assets 読み込み失敗", e);
    _cache = { illustrations: {}, units: {} };
  }
  return _cache;
}

/** @param {string} series @param {string} charId */
export function illustUrl(assets, series, charId) {
  const hit = assets?.illustrations?.[`${series}-${charId}`];
  return hit ? hit.file : null;
}

/** @param {string} series @param {string} unitName */
export function unitAsset(assets, series, unitName) {
  return assets?.units?.[series]?.[unitName] || null;
}

/** 表示優先: logo → banner */
export function unitLogoUrl(asset) {
  if (!asset) return null;
  return asset.logo || asset.banner || null;
}
