/**
 * UI 部品：牌の描画・トースト・モーダル。
 */

/** 河・卓上牌用: 面＋3面のエッジで立体牌に包む。 */
function wrapTable3d(faceEl) {
  const wrap = document.createElement("div");
  wrap.className = "dz-tile dz-tile--table3d";
  for (const cls of faceEl.classList) {
    if (cls === "dz-tile" || cls === "dz-tile--solid") continue;
    if (cls.startsWith("dz-tile--")) wrap.classList.add(cls);
  }
  wrap.dataset.key = faceEl.dataset.key;
  for (const attr of faceEl.attributes) {
    if (attr.name.startsWith("data-") && attr.name !== "data-key") {
      wrap.setAttribute(attr.name, attr.value);
    }
  }

  const faceClasses = ["dz-tile__face"];
  for (const cls of faceEl.classList) {
    if (cls === "dz-tile--member" || cls === "dz-tile--honor" || cls === "dz-tile--blank") {
      faceClasses.push(cls);
    }
  }
  faceEl.className = faceClasses.join(" ");

  wrap.appendChild(faceEl);
  for (const side of ["left", "right", "front", "back"]) {
    const edge = document.createElement("div");
    edge.className = "dz-tile__edge dz-tile__edge--" + side;
    wrap.appendChild(edge);
  }
  return wrap;
}

/**
 * 牌 1 枚の DOM を作る。
 * @param {object} tile catalog の牌種
 * @param {object} opts { size, faceDown, selected, showLabel, onClick, onHandInteract, table3d }
 */
export function tileEl(tile, opts = {}) {
  const el = document.createElement("div");
  el.className = "dz-tile" + (opts.size ? " dz-tile--" + opts.size : "");
  if (opts.selected) el.classList.add("is-selected");
  el.dataset.key = tile.key;

  if (opts.faceDown) {
    el.classList.add("is-back", "dz-tile--solid", "dz-tile--solid-back");
    return el;
  }

  el.classList.add("dz-tile--solid");

  if (tile.kind === "honor") {
    el.classList.add("dz-tile--honor");
    if (tile.blank) {
      el.classList.add("dz-tile--blank");
    } else if (tile.iconUrl) {
      const img = document.createElement("img");
      img.className = "dz-tile__honor-art";
      img.src = tile.iconUrl;
      img.alt = tile.label;
      img.loading = "lazy";
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        const g = document.createElement("div");
        g.className = "dz-tile__glyph";
        g.textContent = tile.glyph || tile.label.charAt(0);
        el.appendChild(g);
      };
      el.appendChild(img);
    } else {
      const g = document.createElement("div");
      g.className = "dz-tile__glyph";
      g.textContent = tile.glyph || "";
      el.appendChild(g);
    }
  } else {
    el.classList.add("dz-tile--member");
    el.dataset.content = tile.contentId;
    if (tile.iconUrl) {
      const img = document.createElement("img");
      img.className = "dz-tile__icon";
      img.src = tile.iconUrl;
      img.alt = tile.label;
      img.loading = "lazy";
      img.draggable = false;
      img.onerror = () => {
        img.remove();
        if (opts.showLabel) {
          const fb = document.createElement("div");
          fb.className = "dz-tile__label dz-tile__label--big";
          fb.textContent = tile.label;
          el.appendChild(fb);
        }
      };
      el.appendChild(img);
    }
    if (opts.showIndex && tile.orderIndex != null) {
      const idx = document.createElement("div");
      idx.className = "dz-tile__idx";
      idx.textContent = tile.orderIndex;
      el.appendChild(idx);
    }

    if (tile.logoUrl) {
      const logo = document.createElement("img");
      logo.className = "dz-tile__logo";
      logo.src = tile.logoUrl;
      logo.alt = "";
      logo.loading = "lazy";
      logo.draggable = false;
      logo.onerror = () => logo.remove();
      el.appendChild(logo);
    }
  }

  let root = el;
  if (opts.table3d) root = wrapTable3d(el);

  if (opts.onHandInteract) {
    root.classList.add("is-clickable");
    bindHandTile(root, tile, opts.onHandInteract);
  } else if (opts.onClick) {
    root.classList.add("is-clickable");
    root.addEventListener("click", () => opts.onClick(tile, root));
  }
  return root;
}

/**
 * 手牌用: 1回タップ=選択、ダブルクリック=打牌、長押し=牌情報、ドラッグ=打牌。
 * @param {object} h { canInteract, onSelect, onDiscard(key, handIndex?), onInfo }
 */
export function bindHandTile(el, tile, h) {
  if (!h.canInteract) return;
  let pressTimer = null;
  let clickTimer = null;
  let didLong = false;
  let drag = null;

  const clearPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };
  const clearClick = () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
  };

  const dropTargetAt = (x, y) => document.elementFromPoint(x, y)?.closest("[data-discard-drop]");

  const endDrag = (commit, x, y) => {
    if (!drag?.active) return false;
    el.classList.remove("is-dragging");
    document.body.classList.remove("dz-discard-drag-active");
    document.querySelectorAll(".dz-discard-dropzone.is-drop-hover").forEach((n) => n.classList.remove("is-drop-hover"));
    if (commit && dropTargetAt(x, y)) {
      const hi = el.dataset.handIndex != null ? Number(el.dataset.handIndex) : null;
      h.onDiscard(tile.key, hi);
    }
    drag = null;
    return true;
  };

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    didLong = false;
    drag = { x: e.clientX, y: e.clientY, active: false, pid: e.pointerId };
    clearPress();
    pressTimer = setTimeout(() => {
      didLong = true;
      if (drag?.active) endDrag(false, e.clientX, e.clientY);
      h.onInfo(tile);
    }, 480);
  });

  el.addEventListener("pointermove", (e) => {
    if (!drag || didLong) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      clearPress();
      clearClick();
      drag.active = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      document.body.classList.add("dz-discard-drag-active");
    }
    if (drag.active) {
      document.querySelectorAll(".dz-discard-dropzone").forEach((z) => z.classList.remove("is-drop-hover"));
      const t = dropTargetAt(e.clientX, e.clientY);
      if (t) t.classList.add("is-drop-hover");
    }
  });

  const onPointerEnd = (e) => {
    clearPress();
    if (drag?.active) {
      const dropped = endDrag(true, e.clientX, e.clientY);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (_) {}
      drag = null;
      if (dropped) return;
    }
    drag = null;
  };
  el.addEventListener("pointerup", onPointerEnd);
  el.addEventListener("pointercancel", onPointerEnd);
  el.addEventListener("pointerleave", (e) => {
    if (drag?.active) return;
    clearPress();
  });

  el.addEventListener("dblclick", (e) => {
    e.preventDefault();
    clearPress();
    clearClick();
    if (didLong) return;
    h.onDiscard(tile.key, el.dataset.handIndex != null ? Number(el.dataset.handIndex) : null);
  });

  el.addEventListener("click", (e) => {
    if (didLong) {
      didLong = false;
      e.preventDefault();
      return;
    }
    clearClick();
    clickTimer = setTimeout(() => {
      h.onSelect(tile.key);
      clickTimer = null;
    }, 280);
  });
}

let _toastTimer = null;
export function showToast(msg, ms = 2200) {
  let t = document.getElementById("dz-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "dz-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("is-show"), ms);
}

/** モーダル表示。contentEl は DOM。onClose 任意。 */
export function showModal(titleText, contentEl, actions = []) {
  const overlay = document.createElement("div");
  overlay.className = "dz-modal-overlay";
  const box = document.createElement("div");
  box.className = "dz-modal";
  const h = document.createElement("h2");
  h.className = "dz-modal__title";
  h.textContent = titleText;
  box.appendChild(h);
  const body = document.createElement("div");
  body.className = "dz-modal__body";
  body.appendChild(contentEl);
  box.appendChild(body);
  const foot = document.createElement("div");
  foot.className = "dz-modal__foot";
  const close = () => overlay.remove();
  if (!actions.length) actions = [{ label: "閉じる", primary: true }];
  for (const a of actions) {
    const b = document.createElement("button");
    b.className = "dz-btn" + (a.primary ? " dz-btn--primary" : "");
    b.textContent = a.label;
    b.addEventListener("click", () => {
      if (a.onClick) a.onClick();
      close();
    });
    foot.appendChild(b);
  }
  box.appendChild(foot);
  overlay.appendChild(box);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
  return { close };
}

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
