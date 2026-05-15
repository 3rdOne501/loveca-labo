/**
 * カード DB 詳細ダイアログ（dlg-card-catalog）。デッキ編集・プレイ共通。
 */
import {
  catalogLiveCardIsDrawYellBladeHeart,
  cardIsNoteLiveCatalog,
  getCard,
} from "./cards.js";
import { T_LIVE } from "./config.js";
import {
  compareBladeHeartDbKeys,
  parseBladeHeartSlotFromKey,
  parseHeartColorSlotFromKey,
} from "./bladeHeart.js";
import { formatHeartMapIconsHtml, gameIconImgHtml, GAME_ICON_ALT } from "./gameIcons.js";

function countWikiBladeIconMarks(s) {
  if (!s) return 0;
  var m = s.match(/\{\{\s*icon_blade\.png\|/gi);
  return m ? m.length : 0;
}

function augmentBladeGainPhraseInWiki(raw) {
  var W = "ブレードを得る";
  if (!raw || String(raw).indexOf(W) < 0) return raw;
  return String(raw)
    .split("\n")
    .map(function (line) {
      if (line.indexOf(W) < 0) return line;
      var buf = "";
      var idx = 0;
      while (true) {
        var i = line.indexOf(W, idx);
        if (i < 0) {
          buf += line.slice(idx);
          break;
        }
        var before = line.slice(0, i);
        var n = countWikiBladeIconMarks(before);
        var rep = n > 0 ? "{{ICON:blade}}\u00d7" + n + "\u3092\u5f97\u308b" : W;
        buf += line.slice(idx, i) + rep;
        idx = i + W.length;
      }
      return buf;
    })
    .join("\n");
}

function escHtml(x) {
  return String(x == null ? "" : x)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @type {Record<string, import("./gameIcons.js").GameIconId>} */
var ICON_TOKEN_MAP = {
  blade: "blade",
  liveStart: "liveStart",
  kidou: "kidou",
  jouji: "jouji",
  turnOnce: "turnOnce",
};

/**
 * 効果テキストを HTML 化（テンプレ画像・キーワードをゲームアイコンへ）。
 */
export function wikiAbilityHtmlForDetail(rawWiki) {
  if (rawWiki == null || typeof rawWiki !== "string") return "";
  var s = augmentBladeGainPhraseInWiki(rawWiki);
  s = String(s).replace(/\{\{\s*icon_blade\.png\|[^}]*\}\}/gi, "{{ICON:blade}}");
  s = s.replace(/\{\{\s*live_start\.png\|[^}]*\}\}/gi, "{{ICON:liveStart}}");
  s = s.replace(/\{\{[^}|]*kidou[^}|]*\|[^}]*\}\}/gi, "{{ICON:kidou}}");
  s = s.replace(/\{\{[^}|]*jouji[^}|]*\|[^}]*\}\}/gi, "{{ICON:jouji}}");
  s = s.replace(/\{\{[^}|]*toujyou[^}|]*\|[^}]*\}\}/gi, "{{ICON:kidou}}");

  var LS_GUARD = "\ue040LS_GUARD_ELSE\ue040";
  s = s.split("\u30e9\u30a4\u30d6\u958b\u59cb\u6642\u4ee5\u5916").join(LS_GUARD);
  s = s.replace(/\u30e9\u30a4\u30d6\u958b\u59cb\u6642/g, "{{ICON:liveStart}}");
  s = s.split(LS_GUARD).join("\u30e9\u30a4\u30d6\u958b\u59cb\u6642\u4ee5\u5916");

  s = s.replace(/\u30bf\u30fc\u30f3\uff11\u56de/g, "{{ICON:turnOnce}}");
  s = s.replace(/\u30bf\u30fc\u30f31\u56de/g, "{{ICON:turnOnce}}");

  s = s.replace(/\u3010\u8d77\u52d5\u3011/g, "{{ICON:kidou}}");
  s = s.replace(/\u3010\u5e38\u6642\u3011/g, "{{ICON:jouji}}");
  s = s.replace(/\u3010\u81ea\u52d5\u3011/g, "{{ICON:jouji}}");

  s = s.replace(/\{\{([^}|]+)\|([^}]*)\}\}/g, function (_m, file, label) {
    var f = String(file).toLowerCase();
    var lb = String(label);
    if (/live_start|kidou/.test(f)) return "{{ICON:liveStart}}";
    if (/icon_blade|blade/.test(f)) return "{{ICON:blade}}";
    if (/kidou/.test(lb)) return "{{ICON:kidou}}";
    if (/常時|自動/.test(lb)) return "{{ICON:jouji}}";
    if (/ライブ開始/.test(lb)) return "{{ICON:liveStart}}";
    if (/ターン/.test(lb) && /1|\uff11/.test(lb) && /回/.test(lb)) return "{{ICON:turnOnce}}";
    return "{{TEXT:" + lb + "}}";
  });

  var reTok = /(\{\{ICON:[a-zA-Z]+\}\}|\{\{TEXT:[^}]+\}\})/g;
  var parts = String(s).split(reTok);
  var out = "";
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    var ic = /^\{\{ICON:([a-zA-Z]+)\}\}$/.exec(p);
    if (ic) {
      var key = ic[1];
      var gid = ICON_TOKEN_MAP[key];
      if (gid) {
        out += gameIconImgHtml(gid, {
          className: "game-ico game-ico--wiki",
          alt: GAME_ICON_ALT[gid],
        });
      }
      continue;
    }
    var tx = /^\{\{TEXT:([^}]+)\}\}$/.exec(p);
    if (tx) {
      out += escHtml(tx[1]);
      continue;
    }
    out += escHtml(p);
  }
  return out.replace(/\n/g, "<br>");
}

function mergedCatalogCard(c) {
  const cat = getCard(c && c.card_no);
  return cat && typeof cat === "object" ? Object.assign({}, cat, c) : c;
}

/**
 * @param {*} c 盤上実体またはカタログカード
 * @param {{ logReplay?: (name: string) => void }} [opts]
 */
export function openCardCatalogDetailDialog(c, opts) {
  opts = opts || {};
  if (!c || typeof c !== "object") return;
  var mc = mergedCatalogCard(c);
  var dlg = document.getElementById("dlg-card-catalog");
  var sub = document.getElementById("dlg-card-catalog-subtitle");
  var bodyEl = document.getElementById("dlg-card-catalog-body");
  var h2 = document.getElementById("dlg-card-catalog-title");
  var dlgImg = document.getElementById("dlg-card-catalog-img");
  var typeIcons = document.getElementById("dlg-card-catalog-type-icons");
  if (!dlg || !bodyEl || !mc) return;

  var nm = mc.name || c.name || "カード情報";
  if (h2) h2.textContent = nm;
  if (sub) sub.textContent = mc.card_no || c.card_no || "";

  function rowHtml(dt, ddHtml) {
    return (
      '<div class="dlg-card-catalog-row"><dt>' +
      escHtml(dt) +
      "</dt><dd>" +
      ddHtml +
      "</dd></div>"
    );
  }

  var ctype = String(mc.type || c.type || "—");

  if (dlgImg) {
    if (mc.img) {
      dlgImg.hidden = false;
      dlgImg.src = mc.img;
      dlgImg.alt = nm || "";
    } else {
      dlgImg.hidden = true;
      dlgImg.removeAttribute("src");
      dlgImg.alt = "";
    }
  }
  if (typeIcons) {
    if (ctype === T_LIVE) {
      var pieces = "";
      if (catalogLiveCardIsDrawYellBladeHeart(mc)) {
        pieces +=
          '<span class="dlg-card-type-ico dlg-card-type-ico--deck" title="\u30c9\u30ed\u30fc\u30a8\u30fc\u30eb">' +
          gameIconImgHtml("yell", { className: "game-ico game-ico--type-badge", alt: GAME_ICON_ALT.yell }) +
          "</span>";
      }
      if (cardIsNoteLiveCatalog(mc)) {
        pieces +=
          '<span class="dlg-card-type-ico dlg-card-type-ico--note" title="\u97f3\u7b26\u30e9\u30a4\u30d6">\u266a</span>';
      }
      typeIcons.innerHTML = pieces;
    } else {
      typeIcons.innerHTML = "";
    }
  }

  var rows = "";
  rows += rowHtml("\u30bf\u30a4\u30d7", escHtml(ctype));

  var costN = mc.cost != null ? mc.cost : c.cost;
  if (costN != null && String(costN) !== "") {
    var costDd =
      ctype === T_LIVE
        ? gameIconImgHtml("score", {
            className: "game-ico game-ico--inline-score",
            alt: GAME_ICON_ALT.score,
          }) +
          " <strong>" +
          escHtml(String(costN)) +
          "</strong>"
        : escHtml(String(costN));
    rows +=
      ctype === T_LIVE
        ? rowHtml("\u30b9\u30b3\u30a2", costDd)
        : rowHtml("\u30b3\u30b9\u30c8\uff0f\u30b9\u30b3\u30a2", costDd);
  }

  var bladeN = mc.blade != null ? mc.blade : c.blade;
  if (bladeN != null && String(bladeN) !== "") {
    rows += rowHtml(
      "\u30d6\u30ec\u30fc\u30c9",
      gameIconImgHtml("blade", { className: "game-ico game-ico--inline-blade", alt: GAME_ICON_ALT.blade }) +
        " <strong>" +
        escHtml(String(bladeN)) +
        "</strong>",
    );
  }

  if (mc.unit) rows += rowHtml("\u30e6\u30cb\u30c3\u30c8", escHtml(mc.unit));
  if (mc.series) rows += rowHtml("\u30b7\u30ea\u30fc\u30ba", escHtml(mc.series));
  if (mc.product) rows += rowHtml("\u5546\u54c1", escHtml(mc.product));
  if (mc.rare) rows += rowHtml("\u30ec\u30a2\u30ea\u30c6\u30a3", escHtml(mc.rare));

  function sortKeysJa(a, b) {
    return String(a).localeCompare(String(b), "ja");
  }

  if (
    ctype === T_MEMBER &&
    mc.base_heart &&
    typeof mc.base_heart === "object" &&
    Object.keys(mc.base_heart).length
  ) {
    rows += rowHtml(
      "\u6240\u6301\u30cf\u30fc\u30c8",
      formatHeartMapIconsHtml(mc.base_heart, parseHeartColorSlotFromKey, sortKeysJa),
    );
  }
  if (ctype === T_LIVE && mc.need_heart && typeof mc.need_heart === "object" && Object.keys(mc.need_heart).length) {
    rows += rowHtml(
      "\u5fc5\u8981\u30cf\u30fc\u30c8",
      formatHeartMapIconsHtml(mc.need_heart, parseHeartColorSlotFromKey, sortKeysJa),
    );
  }
  if (ctype === T_LIVE && mc.blade_heart && typeof mc.blade_heart === "object" && Object.keys(mc.blade_heart).length) {
    rows += rowHtml(
      "BH",
      formatHeartMapIconsHtml(mc.blade_heart, parseBladeHeartSlotFromKey, compareBladeHeartDbKeys),
    );
  }
  if (ctype !== T_LIVE && mc.blade_heart && typeof mc.blade_heart === "object" && Object.keys(mc.blade_heart).length) {
    rows += rowHtml(
      "BH",
      formatHeartMapIconsHtml(mc.blade_heart, parseBladeHeartSlotFromKey, compareBladeHeartDbKeys),
    );
  }

  var abHtml = wikiAbilityHtmlForDetail(mc.ability || "");

  bodyEl.innerHTML =
    '<dl class="dlg-card-catalog-dl">' +
    rows +
    "</dl>" +
    (abHtml
      ? '<h3 class="dlg-card-catalog-ability-heading">\u52b9\u679c\u30c6\u30ad\u30b9\u30c8</h3><div class="dlg-card-catalog-ability">' +
        abHtml +
        "</div>"
      : '<p class="muted dlg-card-catalog-no-effect">\u52b9\u679c\u30c6\u30ad\u30b9\u30c8\u306f\u30ab\u30fc\u30c9DB\u306b\u672a\u5b9a\u7fa9\u307e\u305f\u306f\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002</p>');

  if (dlg.showModal) dlg.showModal();
  if (typeof opts.logReplay === "function") opts.logReplay("card-catalog-detail-open");
}
