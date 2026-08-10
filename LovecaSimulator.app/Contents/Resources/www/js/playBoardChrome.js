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

function spawnPremiumParticles(host, count, palette) {
  palette = palette || ["#ffd56a", "#ff9a3c", "#fff4c8"];
  for (var i = 0; i < count; i++) {
    var p = document.createElement("span");
    p.className = "premium-board-fx__particle";
    p.style.setProperty("--p-x", String(8 + Math.random() * 84) + "%");
    p.style.setProperty("--p-y", String(12 + Math.random() * 76) + "%");
    p.style.setProperty("--p-delay", String(Math.random() * 0.35) + "s");
    p.style.setProperty("--p-dur", String(0.9 + Math.random() * 0.8) + "s");
    p.style.background = palette[i % palette.length];
    host.appendChild(p);
  }
}

/**
 * @param {Array<{ href: string, label?: string, variant?: string }>} icons
 * @param {HTMLElement} overlay
 */
function appendPremiumCharacterIcons(icons, overlay) {
  if (!icons || !icons.length || !overlay) return;
  var wrap = document.createElement("div");
  wrap.className = "premium-board-fx__char-icons";
  wrap.setAttribute("aria-hidden", "true");
  icons.forEach(function (ic, idx) {
    if (!ic || !ic.href) return;
    var img = document.createElement("img");
    img.className = "premium-board-fx__char-icon";
    var variant = String(ic.variant || "");
    if (variant === "group" || variant === "unit" || variant === "rival") {
      img.classList.add("premium-board-fx__char-icon--group-logo");
    }
    img.src = String(ic.href);
    img.alt = String(ic.label || "");
    img.draggable = false;
    img.loading = "eager";
    img.decoding = "async";
    img.style.setProperty("--char-idx", String(idx));
    img.style.setProperty("--char-count", String(icons.length));
    wrap.appendChild(img);
  });
  if (wrap.childElementCount) overlay.appendChild(wrap);
}

/**
 * @param {HTMLElement} overlay
 * @param {{ core?: string, glow?: string, secondary?: string, ring?: string, particles?: string[] } | null | undefined} palette
 */
function applyPremiumBoardFxPalette(overlay, palette) {
  if (!overlay || !palette) return;
  overlay.classList.add("premium-board-fx--themed");
  if (palette.core) overlay.style.setProperty("--premium-fx-core", palette.core);
  if (palette.glow) overlay.style.setProperty("--premium-fx-glow", palette.glow);
  if (palette.secondary) overlay.style.setProperty("--premium-fx-secondary", palette.secondary);
  if (palette.ring) overlay.style.setProperty("--premium-fx-ring", palette.ring);
}

/**
 * 盤面全体の補助演出（テキストバッジ・効果音なし）
 * @param {'high_cost_enter'|'coin_flip'|'live_powerhouse'} type
 * @param {{ tier?: number, mid?: boolean, heads?: boolean, palette?: { core?: string, glow?: string, secondary?: string, ring?: string, particles?: string[] }, boardCenterIcons?: Array<{ href: string, label?: string, variant?: string }> }} [opts]
 */
export function playPremiumBoardFx(type, opts) {
  if (!document.body.classList.contains("play-mode") || prefersReducedMotion()) return;
  opts = opts || {};
  var tier = Math.max(0, Math.min(2, Math.floor(Number(opts.tier) || 0)));
  var isMid = opts.mid === true;

  var overlay = document.createElement("div");
  overlay.className = "premium-board-fx premium-board-fx--" + type;
  if (tier >= 2) overlay.classList.add("premium-board-fx--tier-2");
  if (isMid) overlay.classList.add("premium-board-fx--tier-mid");
  overlay.setAttribute("aria-hidden", "true");

  var vignette = document.createElement("div");
  vignette.className = "premium-board-fx__vignette";
  overlay.appendChild(vignette);

  var flash = document.createElement("div");
  flash.className = "premium-board-fx__flash";
  overlay.appendChild(flash);

  var rays = document.createElement("div");
  rays.className = "premium-board-fx__rays";
  overlay.appendChild(rays);

  var shock = document.createElement("div");
  shock.className = "premium-board-fx__shockwave";
  overlay.appendChild(shock);

  if (type === "high_cost_enter") {
    applyPremiumBoardFxPalette(overlay, opts.palette || null);
    var particlePalette =
      opts.palette && Array.isArray(opts.palette.particles) && opts.palette.particles.length
        ? opts.palette.particles
        : tier >= 2
          ? ["#fff0a8", "#ff9a3c", "#ff5a8a", "#c9a0ff", "#ffe08a"]
          : isMid
            ? ["#ffe8b0", "#ffc86a", "#fff4d8", "#e8b4ff"]
            : ["#ffe08a", "#ffc14d", "#fff8dc"];
    spawnPremiumParticles(overlay, tier >= 2 ? 44 : isMid ? 16 : 22, particlePalette);
    if (tier >= 2) {
      var shock2 = document.createElement("div");
      shock2.className = "premium-board-fx__shockwave premium-board-fx__shockwave--delayed";
      overlay.appendChild(shock2);
    }
  } else if (type === "coin_flip") {
    var coin = document.createElement("div");
    coin.className = "premium-board-fx__coin" + (opts.heads === false ? " premium-board-fx__coin--tails" : "");
    coin.setAttribute("aria-hidden", "true");
    overlay.appendChild(coin);
    var coinLabel = document.createElement("div");
    coinLabel.className = "premium-board-fx__title premium-board-fx__title--coin";
    coinLabel.textContent = opts.heads === false ? "裏" : "表";
    overlay.appendChild(coinLabel);
    spawnPremiumParticles(overlay, 14, ["#e8e8f0", "#ffd56a", "#ffffff"]);
  } else if (type === "live_powerhouse") {
    var title = document.createElement("div");
    title.className = "premium-board-fx__title premium-board-fx__title--live";
    title.textContent = "LIVE START";
    overlay.appendChild(title);
    spawnPremiumParticles(overlay, 32, ["#ffb347", "#ff6b2b", "#fff0a8", "#ff3d6e"]);
  }

  document.body.appendChild(overlay);
  document.body.classList.add("play-premium-fx-active");
  if (type === "live_powerhouse") document.body.classList.add("play-premium-live-arena");
  if (type === "high_cost_enter" && tier >= 2) document.body.classList.add("play-premium-enter-ultra");

  requestAnimationFrame(function () {
    overlay.classList.add("is-visible");
  });

  var holdMs =
    type === "coin_flip"
      ? 1600
      : type === "live_powerhouse"
        ? 1800
        : tier >= 2
          ? 1800
          : isMid
            ? 1250
            : 1500;
  window.setTimeout(function () {
    overlay.classList.add("is-out");
    document.body.classList.remove("play-premium-fx-active", "play-premium-live-arena", "play-premium-enter-ultra");
    window.setTimeout(function () {
      try {
        overlay.remove();
      } catch (_) {}
    }, 650);
  }, holdMs);
}
