/**
 * メンバーモチーフアイコン・登場演出用グループ／ユニットロゴの解決。
 * 素材: アイコンよう/ → assets/game-icons/
 */

import memberManifest from "../data/member-character-icons.json" with { type: "json" };
import groupManifest from "../data/enter-fx-group-logos.json" with { type: "json" };

export const MEMBER_CHARACTER_ICON_ART_DIR = String(
  memberManifest.artDir || "assets/game-icons/member-icons/",
);
export const ENTER_FX_GROUP_LOGO_ART_DIR = String(
  groupManifest.artDir || "assets/game-icons/group-logos/",
);

/** @type {Map<string, { id: string, label: string, file: string, series?: string }>} */
const rosterByNorm = new Map();

function normalizeCharacterKey(s) {
  return String(s || "")
    .replace(/[\s\u3000]/g, "")
    .replace(/[・･]/g, "")
    .toLowerCase();
}

function memberCharacterIconHref(fileName) {
  var seg = MEMBER_CHARACTER_ICON_ART_DIR.replace(/\/+$/, "") + "/";
  return seg + String(fileName || "");
}

function groupLogoHref(fileName) {
  var seg = ENTER_FX_GROUP_LOGO_ART_DIR.replace(/\/+$/, "") + "/";
  return seg + String(fileName || "");
}

/** img src 用（ファイル名の ' やギリシャ文字などをエンコード） */
export function artifactImageSrc(href) {
  var s = String(href || "");
  var slash = s.lastIndexOf("/");
  if (slash < 0) return encodeURI(s);
  return s.slice(0, slash + 1) + encodeURIComponent(s.slice(slash + 1));
}

(memberManifest.roster || []).forEach(function (entry) {
  if (!entry || !entry.id) return;
  rosterByNorm.set(normalizeCharacterKey(entry.label), entry);
  rosterByNorm.set(normalizeCharacterKey(entry.id), entry);
});

/** カード名ゆれ用（cards.json 上の表記） */
const NAME_ALIASES = /** @type {Record<string, string>} */ ({
  高坂穂果: "honoka",
  絢瀬絵理: "eli",
  南ことり: "kotori",
  星空凛: "rin",
  東條希: "nozomi",
  矢澤にこ: "nico",
  渡辺曜: "you",
  高咲侑: "yu",
  宮下愛: "ai",
  近江彼方: "kanata",
  鐘嵐珠: "lanzhu",
  唐可可: "keke",
  嵐千砂都: "chisato",
  葉月恋: "ren",
  エマヴェルデ: "emma",
  ミアテイラー: "mia",
  ウィーンマルガレーテ: "margarete",
  鬼塚冬毬: "tomari",
  セラス柳田リリエンフェルト: "ceras",
  桂城泉: "izumi",
  百生吟子: "ginko",
  徒町小鈴: "kosuzu",
  安養寺姫芽: "hime",
  乙宗梢: "shao",
  夕霧綴理: "tsuzuri",
  藤島慈: "yoshino",
  聖澤セイラ: "seira",
  聖澤悠奈: "yuuna",
  柊摩央: "mao",
  柊真緒: "mao",
  優木せつ菜: "setsuna",
  黒澤ダイヤ: "dia",
  米女メイ: "mei",
});

Object.entries(NAME_ALIASES).forEach(function ([alias, id]) {
  var found = (memberManifest.roster || []).find(function (r) {
    return r.id === id;
  });
  if (found) rosterByNorm.set(normalizeCharacterKey(alias), found);
});

/**
 * @param {string} partName カード名の1人分（「&」分割後）
 * @returns {{ id: string, label: string, href: string } | null}
 */
export function resolveMemberCharacterIcon(partName) {
  var raw = String(partName || "").trim();
  if (!raw) return null;
  var norm = normalizeCharacterKey(raw);
  var direct = rosterByNorm.get(norm);
  if (direct) {
    return {
      id: direct.id,
      label: direct.label,
      href: artifactImageSrc(memberCharacterIconHref(direct.file)),
    };
  }
  /** @type {{ entry: { id: string, label: string, file: string }, score: number } | null} */
  var best = null;
  (memberManifest.roster || []).forEach(function (entry) {
    var key = normalizeCharacterKey(entry.label);
    if (!key || key.length < 2) return;
    var score = 0;
    if (norm === key) score = 1000;
    else if (norm.indexOf(key) >= 0) score = key.length;
    else if (key.indexOf(norm) >= 0 && norm.length >= 2) score = norm.length;
    if (!score) return;
    if (!best || score > best.score) best = { entry: entry, score: score };
  });
  if (!best) return null;
  return {
    id: best.entry.id,
    label: best.entry.label,
    href: artifactImageSrc(memberCharacterIconHref(best.entry.file)),
  };
}

/**
 * メンバーカードのカタログ行からキャラアイコンを解決（複数名義は最大3人）。
 * @param {{ name?: string, type?: string } | null | undefined} cat
 * @returns {Array<{ id: string, label: string, href: string }>}
 */
export function resolveMemberCharacterIconsFromCatalog(cat) {
  if (!cat || cat.type !== "メンバー") return [];
  var raw = String(cat.name || "").trim();
  if (!raw) return [];
  var parts = raw.indexOf("&") >= 0 ? raw.split("&") : [raw];
  /** @type {Record<string, { id: string, label: string, href: string }>} */
  var seen = {};
  /** @type {Array<{ id: string, label: string, href: string }>} */
  var out = [];
  parts.forEach(function (part) {
    var icon = resolveMemberCharacterIcon(part.trim());
    if (!icon || seen[icon.id]) return;
    seen[icon.id] = icon;
    out.push(icon);
  });
  return out.slice(0, 3);
}

function catalogSeriesKind(cat) {
  var series = String((cat && cat.series) || "");
  var product = String((cat && cat.product) || "");
  var hay = series + " " + product;
  if (/蓮ノ空|ハスノソラ/.test(hay)) return "hasunosora";
  if (/虹ヶ咲|ニジガク/.test(hay)) return "nijigasaki";
  if (/スーパースター|Liella|結ヶ丘/.test(hay)) return "liella";
  if (/サンシャイン|Aqours|浦の星/.test(hay)) return "aqours";
  if (/μ|m's|mus/i.test(hay) && !/スーパースター|虹ヶ咲|蓮ノ空|サンシャイン/.test(hay)) return "muse";
  if (/ラブライブ/.test(hay) && !/スーパースター|虹ヶ咲|ニジガク|蓮ノ空|サンシャイン/.test(hay)) return "muse";
  if (/ラブライブ！?$/.test(series)) return "muse";
  return null;
}

function resolveHasunosoraUnitLogoFile(cat) {
  var unit = String((cat && cat.unit) || "");
  var patterns = groupManifest.unitLogoPatterns || [];
  for (var i = 0; i < patterns.length; i++) {
    var p = patterns[i];
    if (!p || !p.match || !p.logo) continue;
    if (new RegExp(p.match, "i").test(unit)) {
      var key = String(p.logo);
      var file = (groupManifest.hasunosoraUnitLogos || {})[key];
      if (file) return file;
    }
  }
  return (groupManifest.hasunosoraUnitLogos || {}).default || "hasu.webp";
}

/**
 * 登場カード上に重ねるグループ／ユニットロゴ。
 * @param {{ name?: string, type?: string, series?: string, product?: string, unit?: string } | null | undefined} cat
 * @param {{ forLive?: boolean }} [opts] forLive=true ならライブカード表向き時（虹ヶ咲もグループロゴ）
 * @returns {{ id: string, label: string, href: string, variant: string, vector?: boolean } | null}
 */
export function resolveEnterFxCardGroupLogo(cat, opts) {
  opts = opts || {};
  var forLive = opts.forLive === true;
  if (!cat) return null;
  if (!forLive && cat.type !== "メンバー") return null;
  if (forLive && cat.type !== "メンバー" && cat.type !== "ライブ") return null;

  var kind = catalogSeriesKind(cat);
  if (!kind) return null;

  if (!forLive && kind === "nijigasaki") return null;

  if (kind === "hasunosora") {
    var unitFile = resolveHasunosoraUnitLogoFile(cat);
    return {
      id: "hasu-unit",
      label: String(cat.unit || "蓮ノ空"),
      href: artifactImageSrc(groupLogoHref(unitFile)),
      variant: "unit",
      vector: /\.svg$/i.test(unitFile),
    };
  }

  var seriesLogo = (groupManifest.seriesLogos || {})[kind];
  if (!seriesLogo) return null;
  var seriesLabels = {
    muse: "μ's",
    aqours: "Aqours",
    liella: "Liella!",
    nijigasaki: "虹ヶ咲",
  };
  return {
    id: kind + "-group",
    label: seriesLabels[kind] || kind,
    href: artifactImageSrc(groupLogoHref(seriesLogo)),
    variant: "group",
    vector: /\.svg$/i.test(seriesLogo),
  };
}

/** @deprecated 画面中央表示は廃止。resolveEnterFxCardGroupLogo を使用 */
export function resolveEnterFxBoardCenterIcons(cat) {
  var one = resolveEnterFxCardGroupLogo(cat);
  return one ? [one] : [];
}

/** @type {Record<string, [number, number, number]>} */
const FX_COLOR_RGB = {
  muse: [199, 21, 133],
  aqours: [79, 195, 247],
  nijigasaki: [255, 193, 7],
  liella: [123, 63, 191],
  hasunosora: [229, 57, 53],
  sunny_passion: [201, 160, 0],
  arise: [21, 101, 192],
  saint_snow: [128, 222, 234],
};

/**
 * @param {[number, number, number]} rgb
 * @returns {{ core: string, glow: string, ring: string, ringShadow: string, particles: string[] }}
 */
function paletteFromRgb(rgb) {
  var r = rgb[0];
  var g = rgb[1];
  var b = rgb[2];
  var gr = Math.min(255, r + 36);
  var gg = Math.min(255, g + 36);
  var gb = Math.min(255, b + 36);
  return {
    core: "rgba(" + r + "," + g + "," + b + ",0.95)",
    glow: "rgba(" + gr + "," + gg + "," + gb + ",0.5)",
    ring: "rgba(" + r + "," + g + "," + b + ",0.95)",
    ringShadow:
      "0 0 24px rgba(" +
      r +
      "," +
      g +
      "," +
      b +
      ",0.85), 0 0 48px rgba(" +
      gr +
      "," +
      gg +
      "," +
      gb +
      ",0.45), inset 0 0 20px rgba(" +
      r +
      "," +
      g +
      "," +
      b +
      ",0.35)",
    particles: [
      "rgb(" + r + "," + g + "," + b + ")",
      "rgb(" + gr + "," + gg + "," + gb + ")",
      "rgb(" + Math.min(255, r + 72) + "," + Math.min(255, g + 72) + "," + Math.min(255, b + 72) + ")",
    ],
  };
}

/**
 * @param {Array<[number, number, number]>} rgbs
 */
function blendFxRgbList(rgbs) {
  if (!rgbs.length) return null;
  if (rgbs.length === 1) return paletteFromRgb(rgbs[0]);
  var r = 0;
  var g = 0;
  var b = 0;
  rgbs.forEach(function (rgb) {
    r += rgb[0];
    g += rgb[1];
    b += rgb[2];
  });
  var n = rgbs.length;
  return paletteFromRgb([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
}

function catalogFxColorKind(cat) {
  if (!cat) return null;
  var unit = String(cat.unit || "");
  var hay =
    unit +
    " " +
    String(cat.series || "") +
    " " +
    String(cat.product || "") +
    " " +
    String(cat.name || "");
  if (/Sunny Passion|サニーパッション|サニパ/i.test(hay)) return "sunny_passion";
  if (/A-RISE|A-RIZE|アライズ/i.test(hay)) return "arise";
  if (/Saint Snow|セントスノー/i.test(hay)) return "saint_snow";
  return catalogSeriesKind(cat);
}

function rosterSeriesForMemberPart(partName) {
  var icon = resolveMemberCharacterIcon(partName);
  if (!icon) return null;
  var roster = (memberManifest.roster || []).find(function (r) {
    return r.id === icon.id;
  });
  if (roster && roster.series) return String(roster.series);
  return null;
}

/**
 * 登場・バトン・ライブ開始時エフェクトのグループ色（3人合体は RGB 平均で混合）。
 * @param {{ name?: string, type?: string, series?: string, product?: string, unit?: string } | null | undefined} cat
 * @returns {{ core: string, glow: string, ring: string, ringShadow: string, particles: string[] } | null}
 */
export function resolveEnterFxPalette(cat) {
  if (!cat) return null;
  var raw = String(cat.name || "").trim();
  if (raw.indexOf("&") >= 0) {
    /** @type {Array<[number, number, number]>} */
    var blend = [];
    raw.split("&").forEach(function (part) {
      var series = rosterSeriesForMemberPart(part.trim());
      var kind = series || catalogFxColorKind(Object.assign({}, cat, { name: part.trim() }));
      if (kind && FX_COLOR_RGB[kind]) blend.push(FX_COLOR_RGB[kind]);
    });
    if (blend.length) return blendFxRgbList(blend);
  }
  var kind = catalogFxColorKind(cat);
  if (!kind || !FX_COLOR_RGB[kind]) return null;
  return paletteFromRgb(FX_COLOR_RGB[kind]);
}
