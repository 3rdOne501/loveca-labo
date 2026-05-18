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
      return /Edel\s*Note|エデルノート/i.test(hay);
    },
  },
  {
    id: "kaleido",
    label: "KALEIDOSCORE",
    match: function (hay) {
      return /KALEIDOSCORE|カレイドスコア/i.test(hay);
    },
  },
];

/** 全角／半角の記号ゆれを吸収（！! ・ 空白 等） */
export function normalizeCardGroupText(s) {
  return String(s == null ? "" : s)
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
  return [cat.series, cat.product, cat.unit, cat.name].filter(Boolean).join(" ");
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

/**
 * @param {*} cat
 * @param {string} tag
 */
/** cards.json の series から画面上の「学校／世代」ラベル（虹ヶ咲・Liella! 等） */
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
