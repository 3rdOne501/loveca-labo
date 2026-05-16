/**
 * カード詳細（ステータス）ダイアログ。プレイ／デッキ編集の双方から利用。
 */

import { T_LIVE, T_MEMBER } from "./config.js";
import { getCard, cardIsNoteLiveCatalog, cardIsDrawYellLiveCatalog } from "./cards.js";
import {
  cardHasBladeHeart,
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

function wikiAbilityToStatusHtml(raw) {
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
    var stem =
      slot === 7
        ? "icon_all"
        : slot != null && slot >= 1 && slot <= 6
          ? "heart_" + String(slot).padStart(2, "0")
          : null;
    var lbl = stem === "icon_all" ? "ALL" : stem != null ? stem : "?";
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
export function renderCardCatalogContentInto(c, targets) {
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
  if (sub) sub.textContent = plainOrNone(mc.card_no || c.card_no);

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

  var costN = mc.cost != null ? mc.cost : c.cost;
  rows += row(isLive ? "スコア" : "コスト／スコア", esc(plainOrNone(costN)));

  var bladeN = mc.blade != null ? mc.blade : c.blade;
  if (!isLive) rows += row("ブレード", esc(plainOrNone(bladeN)));

  rows += row("ユニット", esc(plainOrNone(mc.unit)));
  rows += row("シリーズ", esc(plainOrNone(mc.series)));
  rows += row("商品", esc(plainOrNone(mc.product)));
  rows += row("レアリティ", esc(plainOrNone(mc.rare)));

  var bhLine = formatBladeHeartStatusHtmlRow(mc.blade_heart);
  rows += row("BH", bhLine || escapeHtmlPlain(TEXT_NONE_JA));

  if (isMember) {
    var held = formatHeartRecordStatusHtmlRow(mc.base_heart);
    rows += row("所持ハート", held || escapeHtmlPlain(TEXT_NONE_JA));
  }
  if (isLive) {
    var needL = formatHeartRecordStatusHtmlRow(mc.need_heart);
    rows += row("必要ハート", needL || escapeHtmlPlain(TEXT_NONE_JA));
    if (isDrawYellLive || isNoteLive) {
      var specBits = [];
      if (isDrawYellLive) {
        specBits.push(
          '<span class="dlg-card-catalog-special-heart-pill dlg-card-catalog-special-heart-pill--draw-yell">' +
            Gsi.catalogDrawYellBadgeHtml() +
            '<span class="dlg-card-catalog-special-heart-pill__label">ドローエール</span>' +
            "</span>",
        );
      }
      if (isNoteLive) {
        specBits.push(
          '<span class="dlg-card-catalog-special-heart-pill dlg-card-catalog-special-heart-pill--note-live">' +
            Gsi.catalogNoteLiveBadgeHtml() +
            '<span class="dlg-card-catalog-special-heart-pill__label">音符ライブ（スコア）</span>' +
            "</span>",
        );
      }
      rows += row(
        "特殊ハート",
        '<span class="dlg-card-catalog-special-heart-row">' + specBits.join("") + "</span>",
      );
    }
  }

  var abHtml = wikiAbilityToStatusHtml(mc.ability || "");

  bodyEl.innerHTML = '<dl class="dlg-card-catalog-dl">' + rows + "</dl>";

  if (effectSlot) {
    effectSlot.innerHTML =
      '<h3 class="dlg-card-catalog-ability-heading">効果テキスト</h3><div class="dlg-card-catalog-ability">' +
      abHtml +
      "</div>";
  }

  return mc;
}

/**
 * @param {*} c カード実体または card_no を含むオブジェクト
 */
export function openCardCatalogDialog(c) {
  var dlg = document.getElementById("dlg-card-catalog");
  if (!dlg) return;
  var rendered = renderCardCatalogContentInto(c, {
    title: document.getElementById("dlg-card-catalog-title"),
    subtitle: document.getElementById("dlg-card-catalog-subtitle"),
    body: document.getElementById("dlg-card-catalog-body"),
    effectSlot: document.getElementById("dlg-card-catalog-effect-slot"),
    img: document.getElementById("dlg-card-catalog-img"),
    badge: document.getElementById("dlg-card-catalog-type-badges"),
  });
  if (!rendered) return;
  if (dlg.showModal) dlg.showModal();
}
