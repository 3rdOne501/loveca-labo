/**
 * カード詳細（ステータス）ダイアログ。プレイ／デッキ編集の双方から利用。
 */

import { T_LIVE, T_MEMBER } from "./config.js";
import { catalogCardSchoolLabel } from "./cardGroups.js";
import { getCard, cardIsNoteLiveCatalog, cardIsDrawYellLiveCatalog } from "./cards.js";
import {
  cardHasBladeHeart,
  isBladeHeartDrawMarkerKey,
  parseBladeHeartSlotFromKey,
  parseHeartColorSlotFromKey,
} from "./bladeHeart.js";
import * as Gsi from "./gameStatusIcons.js";

/** @deprecated cards.js の `cardIsDrawYellLiveCatalog` を直接使ってください。 */
export function catalogLiveCardIsDrawYellBladeHeart(card) {
  return cardIsDrawYellLiveCatalog(card);
}

function escapeHtmlPlain(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TEXT_NONE_JA = "テキストなし";

var catalogSubtitleCopyWired = false;

function copyTextToClipboard(text, onDone) {
  var done = typeof onDone === "function" ? onDone : function () {};
  var val = String(text == null ? "" : text);
  if (!val) {
    done(false);
    return;
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText(val)
      .then(function () {
        done(true);
      })
      .catch(function () {
        copyTextToClipboardFallback(val, done);
      });
    return;
  }
  copyTextToClipboardFallback(val, done);
}

function copyTextToClipboardFallback(text, done) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    done(!!ok);
  } catch (_) {
    done(false);
  }
}

function wireCatalogSubtitleCopyOnce(subEl) {
  if (!subEl || catalogSubtitleCopyWired) return;
  catalogSubtitleCopyWired = true;
  subEl.addEventListener("click", function (ev) {
    var t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    var btn = t.closest(".dlg-card-catalog-copy-no");
    if (!btn) return;
    var no = btn.getAttribute("data-copy-card-no") || subEl.dataset.cardNo || "";
    if (!no) return;
    copyTextToClipboard(no, function (ok) {
      var prev = btn.textContent;
      btn.textContent = ok ? "コピー済" : "失敗";
      btn.disabled = true;
      window.setTimeout(function () {
        btn.textContent = prev || "コピー";
        btn.disabled = false;
      }, 1200);
    });
  });
}

function wikiPlainEmpty(html) {
  if (html == null) return true;
  var t = String(html).replace(/<[^>]*>/g, "").replace(/\s|&nbsp;/g, "").trim();
  return t.length === 0;
}

function mergedCatalogCard(c) {
  const cat = getCard(c && c.card_no);
  return cat && typeof cat === "object" ? Object.assign({}, cat, c) : c;
}

function augmentBladeGainReadWiki(raw) {
  if (raw == null || typeof raw !== "string") return "";
  var needle = "ブレードを得る";
  var out = "";
  var cursor = 0;
  while (true) {
    var idx = raw.indexOf(needle, cursor);
    if (idx < 0) {
      out += raw.slice(cursor);
      break;
    }
    out += raw.slice(cursor, idx);
    var seg = raw.slice(0, idx);
    var reBl = /\{\{[^}]*blade[^}]*\}\}/gi;
    var n = 0;
    var m;
    while ((m = reBl.exec(seg)) !== null) n++;
    out += n > 0 ? "ブレード__ICON_BLADE__×" + n + "を得る" : needle;
    cursor = idx + needle.length;
  }
  return out;
}

function wikiAbilityBladeIconHtmlFragment() {
  return Gsi.wikiAbilityFileStemToIconHtml("ブレード", "icon_blade") || "";
}

export function wikiAbilityToStatusHtml(raw) {
  if (raw == null || typeof raw !== "string") {
    return '<span class="muted dlg-card-catalog-empty-wiki">' + escapeHtmlPlain(TEXT_NONE_JA) + "</span>";
  }
  if (String(raw).trim() === "") {
    return '<span class="muted dlg-card-catalog-empty-wiki">' + escapeHtmlPlain(TEXT_NONE_JA) + "</span>";
  }

  function escTxt(tx) {
    return escapeHtmlPlain(tx).replace(/\n/g, "<br>");
  }

  function spliceBladeMarkers(chunk) {
    if (!chunk) return "";
    return chunk.split("__ICON_BLADE__").join(wikiAbilityBladeIconHtmlFragment());
  }

  var s = augmentBladeGainReadWiki(String(raw));

  function flushTextSegment(seg) {
    return escTxt(spliceBladeMarkers(seg));
  }

  var reWiki = /\{\{([^}|]+)\|([^}]*)\}\}/g;
  var result = "";
  var lastIdx = 0;
  var m;
  while ((m = reWiki.exec(s)) !== null) {
    if (m.index > lastIdx) {
      result += flushTextSegment(s.slice(lastIdx, m.index));
    }
    var label =
      m[2] != null && String(m[2]).trim() !== "" ? String(m[2]).trim() : String(m[1]).trim();
    var icon = Gsi.wikiAbilityFileStemToIconHtml(label, m[1]);
    result += icon != null ? icon : escTxt(label);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < s.length) {
    result += flushTextSegment(s.slice(lastIdx));
  }
  if (!result) result = flushTextSegment(s);

  return wikiPlainEmpty(result)
    ? '<span class="muted dlg-card-catalog-empty-wiki">' + escapeHtmlPlain(TEXT_NONE_JA) + "</span>"
    : result;
}

function formatBladeHeartStatusHtmlRow(bh) {
  if (!bh || typeof bh !== "object") return "";
  var parts = [];
  Object.keys(bh).forEach(function (k) {
    var slot = parseBladeHeartSlotFromKey(k);
    var v = Number(bh[k]);
    if (!Number.isFinite(v) || v === 0) return;
    var stem = isBladeHeartDrawMarkerKey(k)
      ? "icon_draw"
      : slot === 7
        ? "icon_all"
        : slot != null && slot >= 1 && slot <= 6
          ? "heart_" + String(slot).padStart(2, "0")
          : null;
    var lbl =
      stem === "icon_draw"
        ? "ドロー"
        : stem === "icon_all"
          ? "ALL"
          : stem != null
            ? stem
            : "?";
    var icon = stem != null ? Gsi.wikiAbilityFileStemToIconHtml(lbl, stem) : null;
    var chip =
      icon != null
        ? '<span class="dlg-status-icon-chip dlg-status-icon-chip--bh">' +
          icon +
          '<span class="dlg-status-count-tail" aria-hidden="true">×</span>' +
          '<span class="dlg-status-count-num">' +
          escapeHtmlPlain(String(v)) +
          "</span></span>"
        : '<span class="dlg-status-icon-chip dlg-status-icon-chip--bh dlg-status-icon-chip--muted">' +
          escapeHtmlPlain("×" + v) +
          "</span>";
    parts.push({ ord: slot == null ? 99 : slot, html: chip });
  });
  parts.sort(function (a, b) {
    return a.ord - b.ord;
  });
  return '<span class="dlg-status-inline-icon-row">' + parts.map(function (p) {
    return p.html;
  }).join("") + "</span>";
}

function formatHeartRecordStatusHtmlRow(h) {
  if (!h || typeof h !== "object") return "";
  var parts = [];
  Object.keys(h).forEach(function (k) {
    var slot = parseHeartColorSlotFromKey(k);
    if (slot == null) return;
    var v = Number(h[k]);
    if (!Number.isFinite(v) || v === 0) return;
    var stem = slot === 0 ? "heart_00" : "heart_" + String(slot).padStart(2, "0");
    var lbl = stem.replace(/_/g, "");
    var icon = Gsi.wikiAbilityFileStemToIconHtml(lbl, stem);
    var chip =
      icon != null
        ? '<span class="dlg-status-icon-chip dlg-status-icon-chip--heart">' +
          icon +
          '<span class="dlg-status-count-tail" aria-hidden="true">×</span>' +
          '<span class="dlg-status-count-num">' +
          escapeHtmlPlain(String(v)) +
          "</span></span>"
        : '<span class="dlg-status-icon-chip dlg-status-icon-chip--muted">' +
          escapeHtmlPlain("×" + v) +
          "</span>";
    parts.push({ ord: slot, html: chip });
  });
  parts.sort(function (a, b) {
    return a.ord - b.ord;
  });
  return '<span class="dlg-status-inline-icon-row">' + parts.map(function (p) {
    return p.html;
  }).join("") + "</span>";
}

/**
 * カードのカタログステータス（タイトル／画像／DL／効果）を指定の DOM 要素群に描画する内部ヘルパ。
 * 戻り値: 描画した最終 `mc`、もしくは未描画なら null。
 * @param {*} c
 * @param {{ title?: HTMLElement | null, subtitle?: HTMLElement | null, body?: HTMLElement | null, effectSlot?: HTMLElement | null, img?: HTMLImageElement | null, badge?: HTMLElement | null }} targets
 */
export function renderCardCatalogContentInto(c, targets, options) {
  options = options || {};
  if (!c || typeof c !== "object") return null;
  var mc = mergedCatalogCard(c);
  if (!mc) return null;
  var bodyEl = targets && targets.body;
  if (!bodyEl) return null;
  var sub = targets.subtitle || null;
  var effectSlot = targets.effectSlot || null;
  var imgCatalog = targets.img || null;
  var badgeEl = targets.badge || null;
  var h2 = targets.title || null;

  function esc(x) {
    return String(x == null ? "" : x)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function row(dt, dd) {
    return (
      '<div class="dlg-card-catalog-row"><dt>' +
      esc(dt) +
      "</dt><dd>" +
      dd +
      "</dd></div>"
    );
  }

  function plainOrNone(v) {
    var s = v == null ? "" : String(v).trim();
    return s !== "" ? s : TEXT_NONE_JA;
  }

  var nm = plainOrNone(mc.name || c.name);
  if (h2) h2.textContent = nm;
  if (sub) {
    var cardNo = mc.card_no != null ? String(mc.card_no).trim() : c.card_no != null ? String(c.card_no).trim() : "";
    if (!cardNo) {
      sub.textContent = TEXT_NONE_JA;
      sub.removeAttribute("data-card-no");
    } else {
      sub.dataset.cardNo = cardNo;
      sub.innerHTML =
        '<span class="dlg-card-catalog-subtitle__no">' +
        esc(cardNo) +
        '</span><button type="button" class="btn xs dlg-card-catalog-copy-no" data-copy-card-no="' +
        esc(cardNo) +
        '" title="カード番号をコピー" aria-label="カード番号をコピー">コピー</button>';
      wireCatalogSubtitleCopyOnce(sub);
    }
  }

  if (imgCatalog) {
    var src = mc.img || c.img || "";
    if (src) {
      imgCatalog.src = src;
      imgCatalog.alt = nm;
      imgCatalog.hidden = false;
    } else {
      imgCatalog.removeAttribute("src");
      imgCatalog.alt = "";
      imgCatalog.hidden = true;
    }
  }

  var tyRaw = mc.type != null && String(mc.type).trim() !== "" ? mc.type : c.type;
  var isLive = tyRaw === T_LIVE;
  var isMember = tyRaw === T_MEMBER;

  var isDrawYellLive = isLive && cardIsDrawYellLiveCatalog(mc);
  var isNoteLive = isLive && cardIsNoteLiveCatalog(mc);

  if (badgeEl) {
    var bits = [];
    if (isDrawYellLive) bits.push(Gsi.catalogDrawYellBadgeHtml());
    if (isNoteLive) bits.push(Gsi.catalogNoteLiveBadgeHtml());
    badgeEl.innerHTML = bits.join("");
  }

  var rows = "";
  rows += row("タイプ", esc(plainOrNone(tyRaw)));

  var scoreOrCost = isLive
    ? mc.score != null
      ? mc.score
      : c.score != null
        ? c.score
        : mc.cost != null
          ? mc.cost
          : c.cost
    : mc.cost != null
      ? mc.cost
      : c.cost;
  rows += row(isLive ? "スコア" : "コスト／スコア", esc(plainOrNone(scoreOrCost)));

  var bladeN = mc.blade != null ? mc.blade : c.blade;
  if (!isLive) rows += row("ブレード", esc(plainOrNone(bladeN)));

  var schoolLabel = catalogCardSchoolLabel(mc);
  rows += row("ユニット", esc(plainOrNone(schoolLabel)));
  rows += row("サブユニット", esc(plainOrNone(mc.unit || c.unit)));
  rows += row("シリーズ", esc(plainOrNone(mc.series)));
  rows += row("商品", esc(plainOrNone(mc.product)));
  rows += row("レアリティ", esc(plainOrNone(mc.rare)));

  var bhLine = formatBladeHeartStatusHtmlRow(mc.blade_heart);
  rows += row("BH", bhLine || escapeHtmlPlain(TEXT_NONE_JA));

  if (isMember) {
    var held = formatHeartRecordStatusHtmlRow(mc.base_heart);
    rows += row("所持ハート", held || escapeHtmlPlain(TEXT_NONE_JA));
  }
  if (isLive && (isDrawYellLive || isNoteLive)) {
    var needL = formatHeartRecordStatusHtmlRow(mc.need_heart);
    rows += row("必要ハート", needL || escapeHtmlPlain(TEXT_NONE_JA));
    var specBits = [];
    if (isDrawYellLive) {
      specBits.push(
        '<span class="dlg-card-catalog-special-heart-pill dlg-card-catalog-special-heart-pill--draw-yell">' +
          Gsi.catalogDrawYellBadgeHtml() +
          '<span class="dlg-card-catalog-special-heart-pill__label">ドロー</span>' +
          "</span>",
      );
    }
    if (isNoteLive) {
      specBits.push(
        '<span class="dlg-card-catalog-special-heart-pill dlg-card-catalog-special-heart-pill--note-live">' +
          Gsi.catalogNoteLiveBadgeHtml() +
          '<span class="dlg-card-catalog-special-heart-pill__label">スコア</span>' +
          "</span>",
      );
    }
  } else if (isLive) {
    var needLPlain = formatHeartRecordStatusHtmlRow(mc.need_heart);
    rows += row("必要ハート", needLPlain || escapeHtmlPlain(TEXT_NONE_JA));
  }

  var abHtml = wikiAbilityToStatusHtml(mc.ability || "");

  /** 同名カードのイラスト違い一覧（rare_list）を小さな thumbnail として並べる */
  var variantsHtml = options.hideVariants ? "" : buildCardVariantsRowHtml(mc, targets);

  bodyEl.innerHTML = '<dl class="dlg-card-catalog-dl">' + rows + "</dl>" + variantsHtml;

  if (effectSlot) {
    effectSlot.innerHTML =
      '<h3 class="dlg-card-catalog-ability-heading">効果テキスト</h3><div class="dlg-card-catalog-ability">' +
      abHtml +
      '</div><div id="dlg-card-catalog-stage-mount" class="dlg-card-catalog-stage-mount" hidden></div>';
  }

  /* 後でクリック時に「最新の」カード／ターゲットで再描画できるよう、body 要素に紐づけて保存。 */
  bodyEl.__llocgCatalogLatest = { card: c, targets: targets };
  wireCatalogVariantsRowOnce(bodyEl);

  return mc;
}

/**
 * `rare_list` の各バリアントを横並びの thumbnail として描画する HTML を返す。
 * 現在カードはハイライトする。`targets.onVariantSelected(cardNo)` があれば「入れ替え」ボタンも表示する。
 */
function buildCardVariantsRowHtml(mc, targets) {
  if (!mc || typeof mc !== "object") return "";
  var rl = Array.isArray(mc.rare_list) ? mc.rare_list : [];
  if (rl.length < 2) return "";
  var currentNo = String(mc.card_no || "");
  var supportsSwap = !!(targets && typeof targets.onVariantSelected === "function");
  var items = [];
  for (var i = 0; i < rl.length; i++) {
    var v = rl[i] || {};
    var vno = String(v.card_no || "").trim();
    if (!vno) continue;
    var vcard = getCard(vno);
    if (!vcard) continue;
    var isCurrent = vno === currentNo;
    var imgSrc = String(vcard.img || "");
    var rareLbl = vcard.rare != null ? String(vcard.rare) : "";
    var prodLbl = vcard.product != null ? String(vcard.product) : "";
    items.push(
      '<li class="dlg-card-catalog-variant-item' + (isCurrent ? " is-current" : "") + '">' +
        '<button type="button" class="dlg-card-catalog-variant-btn" data-variant-no="' + escapeAttrLocal(vno) + '" title="' + escapeAttrLocal(rareLbl + (prodLbl ? " / " + prodLbl : "")) + '"' + (isCurrent ? ' aria-current="true"' : '') + '>' +
          (imgSrc ? '<img class="dlg-card-catalog-variant-img" loading="lazy" src="' + escapeAttrLocal(imgSrc) + '" alt="' + escapeAttrLocal(vno) + '">' : '<span class="dlg-card-catalog-variant-fallback" aria-hidden="true">?</span>') +
          '<span class="dlg-card-catalog-variant-meta">' +
            '<span class="dlg-card-catalog-variant-rare">' + escapeHtmlPlain(rareLbl || "—") + '</span>' +
            '<span class="dlg-card-catalog-variant-no">' + escapeHtmlPlain(vno) + '</span>' +
          '</span>' +
        '</button>' +
        (supportsSwap && !isCurrent
          ? '<button type="button" class="btn xs primary dlg-card-catalog-variant-swap" data-variant-swap-no="' + escapeAttrLocal(vno) + '" title="このイラストにデッキ内のカードを入れ替えます">入れ替え</button>'
          : "") +
      "</li>",
    );
  }
  if (!items.length) return "";
  return (
    '<section class="dlg-card-catalog-variants">' +
      '<h3 class="dlg-card-catalog-variants__title">イラスト違い（' + String(items.length) + " 種)</h3>" +
      (supportsSwap
        ? '<p class="muted dlg-card-catalog-variants__hint">「入れ替え」を押すと、デッキ内の同名カードを選んだイラストに差し替えます（同枚数を維持）。</p>'
        : '<p class="muted dlg-card-catalog-variants__hint">クリックでカード詳細を切り替えます。</p>') +
      '<ul class="dlg-card-catalog-variants__list" role="list">' + items.join("") + "</ul>" +
    "</section>"
  );
}

function escapeAttrLocal(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wireCatalogVariantsRowOnce(bodyEl) {
  if (!bodyEl || bodyEl.dataset.variantsWired === "1") return;
  bodyEl.dataset.variantsWired = "1";
  bodyEl.addEventListener("click", function (ev) {
    var t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    var swap = t.closest(".dlg-card-catalog-variant-swap");
    if (swap) {
      var swapNo = swap.getAttribute("data-variant-swap-no") || "";
      if (!swapNo) return;
      var latest = bodyEl.__llocgCatalogLatest;
      if (!latest || !latest.targets) return;
      var cb = latest.targets.onVariantSelected;
      if (typeof cb !== "function") return;
      /* 「現在の」カード（最終描画で使ったカード）を fromNo として渡す。 */
      var fromNo = String((latest.card && latest.card.card_no) || "");
      var swapped = false;
      try { swapped = !!cb(swapNo, fromNo); } catch (_) { swapped = false; }
      if (!swapped) return;
      var newCard = getCard(swapNo);
      if (newCard) renderCardCatalogContentInto(newCard, latest.targets);
      return;
    }
    var btn = t.closest(".dlg-card-catalog-variant-btn");
    if (!btn) return;
    var vno = btn.getAttribute("data-variant-no") || "";
    if (!vno) return;
    var latest2 = bodyEl.__llocgCatalogLatest;
    if (!latest2 || !latest2.targets) return;
    if (String((latest2.card && latest2.card.card_no) || "") === vno) return;
    var newCard2 = getCard(vno);
    if (!newCard2) return;
    renderCardCatalogContentInto(newCard2, latest2.targets);
  });
}

/**
 * @param {*} c カード実体または card_no を含むオブジェクト
 * @param {{ onVariantSelected?: (cardNo: string) => boolean | void }} [options]
 */
function mountHandStageActionsInEffectSlot(act, dlg) {
  var mount = document.getElementById("dlg-card-catalog-stage-mount");
  if (!mount) return;
  if (!act || typeof act.onStage !== "function") {
    mount.hidden = true;
    mount.innerHTML = "";
    return;
  }
  mount.hidden = false;
  mount.innerHTML =
    '<p class="dlg-card-catalog-hand-stage-hint">選択したエリアに登場</p>' +
    '<div class="dlg-card-catalog-hand-stage-row">' +
    '<button type="button" class="dlg-card-catalog-stage-btn" data-stage-side="left" aria-label="左サイドに登場">' +
    '<img class="dlg-card-catalog-stage-btn__ico" alt="" src="assets/game-icons/loveca-data-1/leftside.png" decoding="async" />' +
    '<span class="dlg-card-catalog-stage-btn__lab">左サイド</span></button>' +
    '<button type="button" class="dlg-card-catalog-stage-btn" data-stage-side="center" aria-label="センターに登場">' +
    '<img class="dlg-card-catalog-stage-btn__ico" alt="" src="assets/game-icons/loveca-data-1/center.png" decoding="async" />' +
    '<span class="dlg-card-catalog-stage-btn__lab">センター</span></button>' +
    '<button type="button" class="dlg-card-catalog-stage-btn" data-stage-side="right" aria-label="右サイドに登場">' +
    '<img class="dlg-card-catalog-stage-btn__ico" alt="" src="assets/game-icons/loveca-data-1/rightside.png" decoding="async" />' +
    '<span class="dlg-card-catalog-stage-btn__lab">右サイド</span></button>' +
    "</div>";
  mount.querySelectorAll("[data-stage-side]").forEach(function (btn) {
    var side = btn.getAttribute("data-stage-side");
    if (!side) return;
    var canGlow = !act.sideGlow || act.sideGlow[side] === true;
    btn.classList.toggle("dlg-card-catalog-stage-btn--glow", canGlow);
    btn.classList.toggle("dlg-card-catalog-stage-btn--dim", !canGlow);
    btn.addEventListener("click", function () {
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
      try {
        act.onStage(side);
      } catch (e) {
        console.error(e);
      }
    });
  });
}

export function openCardCatalogDialog(c, options) {
  var dlg = document.getElementById("dlg-card-catalog");
  if (!dlg) return;
  var targets = {
    title: document.getElementById("dlg-card-catalog-title"),
    subtitle: document.getElementById("dlg-card-catalog-subtitle"),
    body: document.getElementById("dlg-card-catalog-body"),
    effectSlot: document.getElementById("dlg-card-catalog-effect-slot"),
    img: document.getElementById("dlg-card-catalog-img"),
    badge: document.getElementById("dlg-card-catalog-type-badges"),
  };
  if (options && typeof options.onVariantSelected === "function") {
    targets.onVariantSelected = options.onVariantSelected;
  }
  var renderOpts = {};
  if (options && options.playMode) renderOpts.hideVariants = true;
  var rendered = renderCardCatalogContentInto(c, targets, renderOpts);
  if (!rendered) return;
  mountHandStageActionsInEffectSlot(options && options.handStageActions, dlg);
  if (dlg.showModal) dlg.showModal();
}
