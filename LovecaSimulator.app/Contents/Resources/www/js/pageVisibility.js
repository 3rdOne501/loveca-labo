/**
 * タブ非表示時の省電力フック。
 * - html.ll-page-hidden で CSS アニメを止められる
 * - onPageVisibilityChange で購読・タイマーを一時停止できる
 */

/** @type {Set<(visible: boolean) => void>} */
const listeners = new Set();
let wired = false;

export function isPageVisible() {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden";
}

function applyHiddenClass(hidden) {
  if (typeof document === "undefined" || !document.documentElement) return;
  document.documentElement.classList.toggle("ll-page-hidden", !!hidden);
}

function notify() {
  const visible = isPageVisible();
  applyHiddenClass(!visible);
  listeners.forEach(function (fn) {
    try {
      fn(visible);
    } catch (_) {
      /* noop */
    }
  });
}

function wireOnce() {
  if (wired || typeof document === "undefined") return;
  wired = true;
  applyHiddenClass(!isPageVisible());
  document.addEventListener("visibilitychange", notify);
}

/**
 * @param {(visible: boolean) => void} fn
 * @returns {() => void}
 */
export function onPageVisibilityChange(fn) {
  if (typeof fn !== "function") return function () {};
  wireOnce();
  listeners.add(fn);
  return function () {
    listeners.delete(fn);
  };
}

/** 起動時に一度呼ぶ（クラス初期化＋リスナ配線） */
export function initPageVisibilityPause() {
  wireOnce();
}
