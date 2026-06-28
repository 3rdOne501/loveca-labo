/** プレイ盤面の演出・操作性（ドラッグヒント、チェーン帯、フェーズレール等） */

/** @type {HTMLElement|null} */
let chainBandEl = null;
/** @type {HTMLElement|null} */
let phaseRailEl = null;

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_) {
    return false;
  }
}

function ensureChainBand() {
  if (chainBandEl) return chainBandEl;
  var host = document.getElementById("play-board-chrome-host");
  if (!host) return null;
  chainBandEl = document.createElement("div");
  chainBandEl.id = "play-effect-chain-band";
  chainBandEl.className = "play-effect-chain-band";
  chainBandEl.hidden = true;
  chainBandEl.setAttribute("role", "status");
  chainBandEl.setAttribute("aria-live", "polite");
  host.prepend(chainBandEl);
  return chainBandEl;
}

function ensurePhaseRail() {
  if (phaseRailEl) return phaseRailEl;
  var host = document.getElementById("play-board-chrome-host");
  if (!host) return null;
  phaseRailEl = document.createElement("nav");
  phaseRailEl.id = "live-phase-rail";
  phaseRailEl.className = "live-phase-rail";
  phaseRailEl.setAttribute("aria-label", "ライブターンの進行");
  phaseRailEl.hidden = true;
  host.appendChild(phaseRailEl);
  return phaseRailEl;
}

/**
 * @param {Array<{ label: string, kind?: string }>} steps
 * @param {number} activeIdx
 */
export function setPlayEffectChain(steps, activeIdx) {
  var band = ensureChainBand();
  if (!band) return;
  if (!steps || !steps.length) {
    band.hidden = true;
    band.textContent = "";
    return;
  }
  band.hidden = false;
  band.textContent = "";
  steps.forEach(function (step, i) {
    if (i > 0) {
      var sep = document.createElement("span");
      sep.className = "play-effect-chain-band__sep";
      sep.textContent = "→";
      sep.setAttribute("aria-hidden", "true");
      band.appendChild(sep);
    }
    var chip = document.createElement("span");
    chip.className = "play-effect-chain-band__chip";
    if (i === activeIdx) chip.classList.add("play-effect-chain-band__chip--active");
    if (i < activeIdx) chip.classList.add("play-effect-chain-band__chip--done");
    chip.textContent = step.label || "効果";
    band.appendChild(chip);
  });
}

export function clearPlayEffectChain() {
  setPlayEffectChain([], -1);
}

/** @param {{ id: string, label: string, done?: boolean, current?: boolean }[]} phases */
export function syncLivePhaseRail(phases) {
  var rail = ensurePhaseRail();
  if (!rail) return;
  if (!phases || !phases.length) {
    rail.hidden = true;
    rail.textContent = "";
    return;
  }
  rail.hidden = false;
  rail.textContent = "";
  phases.forEach(function (ph, i) {
    if (i > 0) {
      var line = document.createElement("span");
      line.className = "live-phase-rail__line";
      line.setAttribute("aria-hidden", "true");
      rail.appendChild(line);
    }
    var step = document.createElement("span");
    step.className = "live-phase-rail__step";
    if (ph.done) step.classList.add("live-phase-rail__step--done");
    if (ph.current) step.classList.add("live-phase-rail__step--current");
    step.textContent = ph.label;
    rail.appendChild(step);
  });
}

export function notifyPlayDragStart(dragEl) {
  if (!document.body.classList.contains("play-mode")) return;
  document.body.classList.add("play-drag-active");
  if (dragEl) dragEl.classList.add("card-item--dragging");
}

export function notifyPlayDragEnd(dragEl, toZoneEl) {
  document.body.classList.remove("play-drag-active");
  if (dragEl) dragEl.classList.remove("card-item--dragging");
  clearLegalDropZoneHighlights();
  if (!toZoneEl || prefersReducedMotion()) return;
  spawnZoneDropRipple(toZoneEl);
}

export function clearLegalDropZoneHighlights() {
  document.querySelectorAll(".zone-drop--legal, .zone-drop--illegal").forEach(function (el) {
    el.classList.remove("zone-drop--legal", "zone-drop--illegal");
  });
}

/**
 * @param {HTMLElement} dragEl
 * @param {(toSortable: object, fromSortable: object, dragEl: HTMLElement) => boolean} allowPutFn
 * @param {object|null} fromSortable
 * @param {string[]} zoneIds
 */
export function highlightLegalDropZones(dragEl, allowPutFn, fromSortable, zoneIds) {
  if (!document.body.classList.contains("play-mode") || !dragEl || typeof allowPutFn !== "function") return;
  clearLegalDropZoneHighlights();
  (zoneIds || []).forEach(function (zid) {
    var el = document.getElementById(zid);
    if (!el || !el.classList.contains("zone-drop")) return;
    var legal = false;
    try {
      legal = allowPutFn({ el: el }, fromSortable || { el: null }, dragEl);
    } catch (_) {
      legal = false;
    }
    if (legal) el.classList.add("zone-drop--legal");
    else if (zid !== "zone-preview" && zid !== "zone-preview-drop-catcher") el.classList.add("zone-drop--illegal");
  });
}

/** @param {HTMLElement} zoneEl */
function spawnZoneDropRipple(zoneEl) {
  if (!zoneEl) return;
  var ripple = document.createElement("span");
  ripple.className = "zone-drop-ripple";
  zoneEl.appendChild(ripple);
  window.setTimeout(function () {
    ripple.remove();
  }, 650);
}

/** @param {HTMLElement|null} cardEl */
export function animateEnergyWaitToggle(cardEl) {
  if (!cardEl || prefersReducedMotion()) return;
  cardEl.classList.remove("card-item--energy-wait-flip");
  void cardEl.offsetWidth;
  cardEl.classList.add("card-item--energy-wait-flip");
  playEnergyWaitClick();
}

let audioCtx = null;

export function playEnergyWaitClick() {
  if (prefersReducedMotion()) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 520;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    var t = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch (_) {
    /* noop */
  }
}

/**
 * @param {number} count
 * @param {{ energyRemain?: number }} [opts]
 */
export function syncDeckRemainBadge(count, opts) {
  opts = opts || {};
  var badge = document.getElementById("deck-count-num");
  var host = document.getElementById("deck-pile-host");
  if (badge) {
    badge.textContent = String(Math.max(0, Math.floor(Number(count) || 0)));
    badge.classList.toggle("badge--deck-low", count > 0 && count <= 10);
    badge.classList.toggle("badge--deck-critical", count > 0 && count <= 3);
  }
  if (host) {
    host.classList.toggle("deck-pile-host--low", count > 0 && count <= 10);
  }
  var energyBadge = document.getElementById("energy-deck-remain-badge");
  if (energyBadge && opts.energyRemain != null) {
    energyBadge.textContent = String(Math.max(0, Math.floor(Number(opts.energyRemain) || 0)));
    energyBadge.hidden = false;
  }
}

export function ensurePlayBoardChromeHost() {
  ensureChainBand();
  ensurePhaseRail();
}
