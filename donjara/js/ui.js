/**
 * UI 部品：牌の描画・トースト・モーダル。
 */

/**
 * 牌 1 枚の DOM を作る。
 * @param {object} tile catalog の牌種
 * @param {object} opts { size:"sm"|"md"|"lg", faceDown:boolean, onClick:Function, selected:boolean }
 */
export function tileEl(tile, opts = {}) {
  const el = document.createElement("div");
  el.className = "dz-tile" + (opts.size ? " dz-tile--" + opts.size : "");
  if (opts.selected) el.classList.add("is-selected");
  el.dataset.key = tile.key;

  if (opts.faceDown) {
    el.classList.add("is-back");
    return el;
  }

  if (tile.kind === "honor") {
    el.classList.add("dz-tile--honor");
    if (tile.blank) {
      el.classList.add("dz-tile--blank");
      // 白：無地（何も印字しない）
    } else {
      const g = document.createElement("div");
      g.className = "dz-tile__glyph";
      g.textContent = tile.glyph || "";
      el.appendChild(g);
      const lb = document.createElement("div");
      lb.className = "dz-tile__label";
      lb.textContent = tile.label;
      el.appendChild(lb);
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
      img.onerror = () => {
        img.remove();
        const fb = document.createElement("div");
        fb.className = "dz-tile__label dz-tile__label--big";
        fb.textContent = tile.label;
        el.appendChild(fb);
      };
      el.appendChild(img);
    }
    const idx = document.createElement("div");
    idx.className = "dz-tile__idx";
    idx.textContent = tile.orderIndex;
    el.appendChild(idx);
    const lb = document.createElement("div");
    lb.className = "dz-tile__label";
    lb.textContent = tile.label;
    el.appendChild(lb);
  }

  if (opts.onClick) {
    el.classList.add("is-clickable");
    el.addEventListener("click", () => opts.onClick(tile, el));
  }
  return el;
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
