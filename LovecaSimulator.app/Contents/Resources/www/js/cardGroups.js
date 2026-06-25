/**
 * 能力文の『…』グループタグと cards.json の unit / series 対応。
 * OCG では表示名（Liella! 等）と DB の unit 名（KALEIDOSCORE 等）が一致しないことがある。
 */

/** @typedef {{ id: string, label: string, match: (hay: string, cat: object) => boolean }} CardGroupRule */

/** @type {CardGroupRule[]} */
export const CARD_GROUP_RULES = [
  {
    id: "liella",
    label: "Liella!",
    match: function (hay) {
      return /Liella|リエラ|スーパースター/i.test(hay);
    },
  },
  {
    id: "nijigaku",
    label: "虹ヶ咲",
    match: function (hay) {
      return /虹ヶ咲|ニジガク/i.test(hay);
    },
  },
  {
    id: "muse",
    label: "μ's",
    match: function (hay, cat) {
      if (/μ|m's|mus/i.test(hay) && !/サンシャイン|スーパースター|虹ヶ咲|ニジガク|蓮ノ空/i.test(hay)) return true;
      var s = cat && cat.series != null ? String(cat.series) : "";
      if (/^ラブライブ！?$/.test(s) || (s.includes("ラブライブ") && !/サンシャイン|スーパースター|虹ヶ咲|ニジガク|蓮ノ空/.test(s)))
        return true;
      return false;
    },
  },
  {
    id: "hasunosora",
    label: "蓮ノ空",
    match: function (hay) {
      return /蓮ノ空|ハスノソラ/i.test(hay);
    },
  },
  {
    id: "mirapark",
    label: "みらくらぱーく！",
    match: function (hay) {
      return /みらくら|ミラクラ|ぱーく|パーク/i.test(hay);
    },
  },
  {
    id: "cerise",
    label: "スリーズブーケ",
    match: function (hay) {
      return /スリーズブーケ|セリーズ/i.test(hay);
    },
  },
  {
    id: "edel",
    label: "Edel Note",
    match: function (hay) {
      return /Edel\s*Note|EdelNote|エデルノート/i.test(hay);
    },
  },
  {
    id: "kaleido",
    label: "KALEIDOSCORE",
    match: function (hay) {
      return /KALEIDOSCORE|カレイドスコア/i.test(hay);
    },
  },
  {
    id: "dollchestra",
    label: "DOLLCHESTRA",
    match: function (hay) {
      return /DOLLCHESTRA|ドルチェストラ/i.test(hay);
    },
  },
  {
    id: "syncrise",
    label: "5yncri5e!",
    match: function (hay) {
      return /5yncri5e|syncri5e|シンクリ/i.test(hay);
    },
  },
  {
    id: "aqours",
    label: "Aqours",
    match: function (hay) {
      return /Aqours|aqours|サンシャイン/i.test(hay);
    },
  },
  {
    id: "saintsnow",
    label: "SaintSnow",
    match: function (hay) {
      return /SaintSnow|saintsnow|セイントスノー/i.test(hay);
    },
  },
];

/** 表示用：感嘆符・疑問符を全角に揃える（みらくらぱーく！ 等） */
export function canonicalizeDisplayPunctuation(s) {
  return String(s == null ? "" : s).replace(/!/g, "！").replace(/\?/g, "？");
}

/** 全角／半角の記号ゆれを吸収（！! ・ 空白 等） */
export function normalizeCardGroupText(s) {
  return canonicalizeDisplayPunctuation(s)
    .replace(/\u3000/g, " ")
    .replace(/[！!？?．.・･]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * @param {*} cat
 * @returns {string}
 */
export function cardGroupHaystack(cat) {
  if (!cat) return "";
  var parts = [cat.series, cat.product, cat.unit, cat.name].filter(Boolean);
  if (Array.isArray(cat._extraGroupTags)) {
    cat._extraGroupTags.forEach(function (t) {
      if (t) parts.push(String(t));
    });
  }
  return parts.join(" ");
}

/**
 * @param {string} tag 能力文『…』の中身
 * @returns {CardGroupRule | null}
 */
export function cardGroupRuleForTag(tag) {
  var t = String(tag == null ? "" : tag).trim();
  if (!t) return null;
  var nt = normalizeCardGroupText(t);
  for (var i = 0; i < CARD_GROUP_RULES.length; i++) {
    var rule = CARD_GROUP_RULES[i];
    if (normalizeCardGroupText(rule.label) === nt) return rule;
    if (normalizeCardGroupText(rule.id) === nt) return rule;
  }
  if (t === "μ's" || t === "μ’s") {
    return CARD_GROUP_RULES.find(function (r) {
      return r.id === "muse";
    }) || null;
  }
  return null;
}

/** cards.json の series から画面上の「学校／世代」ラベル（虹ヶ咲・Liella! 等） */
/**
 * ステージの「グループ名」比較用キー（unit → 学校ラベル → series → name）。
 * @param {*} cat
 * @returns {string}
 */
export function catalogCardGroupKey(cat) {
  if (!cat) return "";
  var unit = cat.unit != null ? String(cat.unit).trim() : "";
  if (unit) return unit;
  var school = catalogCardSchoolLabel(cat);
  if (school) return school;
  var series = cat.series != null ? String(cat.series).trim() : "";
  if (series) return series;
  return cat.name != null ? String(cat.name).trim() : "";
}

export function catalogCardSchoolLabel(cat) {
  if (!cat) return "";
  var series = cat.series != null ? String(cat.series) : "";
  var product = cat.product != null ? String(cat.product) : "";
  var hay = series + " " + product;
  if (/虹ヶ咲|ニジガク/.test(hay)) return "虹ヶ咲";
  if (/スーパースター|Liella|リエラ/.test(hay)) return "Liella!";
  if (/サンシャイン|Aqours|aqours/i.test(hay)) return "サンシャイン!!";
  if (/蓮ノ空|ハスノソラ/.test(hay)) return "蓮ノ空";
  if (/μ|m's|mus/i.test(hay) && !/スーパースター|虹ヶ咲|ニジガク|蓮ノ空|サンシャイン/.test(hay)) return "μ's";
  if (/ラブライブ！?$/.test(series) || (series.includes("ラブライブ") && series.length < 12)) return "μ's";
  return series || "";
}

export function catalogCardMatchesGroupTag(cat, tag) {
  if (!cat || !tag) return true;
  var t = String(tag).trim();
  if (!t) return true;
  var hay = cardGroupHaystack(cat);
  var rule = cardGroupRuleForTag(t);
  if (rule) return rule.match(hay, cat);

  var unit = cat.unit != null ? String(cat.unit) : "";
  var series = cat.series != null ? String(cat.series) : "";
  var product = cat.product != null ? String(cat.product) : "";
  var nu = normalizeCardGroupText(unit);
  var nt = normalizeCardGroupText(t);
  if (nu && (nu === nt || nu.includes(nt) || nt.includes(nu))) return true;
  var ns = normalizeCardGroupText(series);
  if (ns && (ns.includes(nt) || nt.includes(ns))) return true;
  var np = normalizeCardGroupText(product);
  if (np && np.includes(nt)) return true;
  return normalizeCardGroupText(hay).includes(nt);
}
