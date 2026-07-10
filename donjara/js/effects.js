/**
 * 画面演出（打牌スプラッシュ・ユニット/学年バッジ等）。
 */

const FX_ROOT_ID = "dz-fx-root";

function fxRoot() {
  let r = document.getElementById(FX_ROOT_ID);
  if (!r) {
    r = document.createElement("div");
    r.id = FX_ROOT_ID;
    document.body.appendChild(r);
  }
  return r;
}

/** 打牌時: 捨て牌の上にグループロゴが白発光しながら浮かぶ。 */
export function discardGroupSplashAt(anchorEl, logoUrl, label) {
  if (!anchorEl || !logoUrl) return;
  const rect = anchorEl.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "dz-fx-discard dz-fx-discard--river";
  fx.style.left = `${rect.left + rect.width / 2}px`;
  fx.style.top = `${rect.top}px`;
  const img = document.createElement("img");
  img.src = logoUrl;
  img.alt = label || "";
  fx.appendChild(img);
  fxRoot().appendChild(fx);
  requestAnimationFrame(() => fx.classList.add("is-show"));
  setTimeout(() => {
    fx.classList.remove("is-show");
    setTimeout(() => fx.remove(), 500);
  }, 1100);
}

/** @deprecated 中央スプラッシュ（互換用） */
export function discardGroupSplash(logoUrl, label) {
  if (!logoUrl) return;
  const el = document.createElement("div");
  el.className = "dz-fx-discard";
  const img = document.createElement("img");
  img.src = logoUrl;
  img.alt = label || "";
  el.appendChild(img);
  if (label) {
    const cap = document.createElement("span");
    cap.className = "dz-fx-discard__cap";
    cap.textContent = label;
    el.appendChild(cap);
  }
  fxRoot().appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-show"));
  setTimeout(() => {
    el.classList.remove("is-show");
    setTimeout(() => el.remove(), 450);
  }, 900);
}

/** ユニットロゴの一瞬フラッシュ（手牌で揃ったとき）。 */
export function unitCompleteFlash(logoUrl, unitName) {
  if (!logoUrl) return;
  const el = document.createElement("div");
  el.className = "dz-fx-unit";
  const img = document.createElement("img");
  img.src = logoUrl;
  img.alt = unitName || "";
  el.appendChild(img);
  if (unitName) el.appendChild(Object.assign(document.createElement("span"), { className: "dz-fx-unit__cap", textContent: unitName }));
  fxRoot().appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-show"));
  setTimeout(() => {
    el.classList.remove("is-show");
    setTimeout(() => el.remove(), 500);
  }, 1400);
}

const CALL_LABELS = {
  ron: "ロン",
  pon: "ポン",
  chi: "チー",
  kan: "カン",
  ankan: "カン",
  shouminkan: "カン",
};

/** 鳴き・和了時: キャラ立ち絵を大きく表示。 */
export function characterCallSplash(illustUrl, callType, seatLabel) {
  const fx = document.createElement("div");
  fx.className = "dz-fx-call";
  const label = CALL_LABELS[callType] || callType;
  fx.appendChild(Object.assign(document.createElement("div"), { className: "dz-fx-call__action", textContent: label }));
  if (illustUrl) {
    const img = document.createElement("img");
    img.className = "dz-fx-call__illust";
    img.src = illustUrl;
    img.alt = seatLabel || "";
    fx.appendChild(img);
  }
  if (seatLabel) fx.appendChild(Object.assign(document.createElement("div"), { className: "dz-fx-call__name", textContent: seatLabel }));
  fxRoot().appendChild(fx);
  requestAnimationFrame(() => fx.classList.add("is-show"));
  setTimeout(() => {
    fx.classList.remove("is-show");
    setTimeout(() => fx.remove(), 550);
  }, 1600);
}

/** パーティクル風のきらめき（牌選択時など）。 */
export function sparkleAt(x, y) {
  for (let i = 0; i < 6; i++) {
    const p = document.createElement("div");
    p.className = "dz-fx-spark";
    p.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    p.style.top = `${y + (Math.random() - 0.5) * 24}px`;
    p.style.animationDelay = `${i * 40}ms`;
    fxRoot().appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}
