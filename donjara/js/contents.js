/**
 * ラブライブ！ドンジャラ（麻雀準拠）— コンテンツ（スート）と字牌の定義。
 *
 * 麻雀の 3 スート（萬子/筒子/索子）に相当するものを「コンテンツ」で置き換える。
 * 各コンテンツは 1 スートとして扱い、メンバー順の連番（orderIndex）で順子が成立する。
 * 字牌（honor）は順子を作らず、刻子/対子のみ（本家麻雀と同じ）。
 *
 * `series` は data/member-character-icons.json の series 値と一致させること。
 * `live: false` のコンテンツは画像未整備のため既定で牌生成対象外（設定でも保留扱い）。
 */

/** @typedef {{ id:string, series:string, label:string, logo:string|null, live:boolean, note?:string }} DonjaraContent */

/** @type {DonjaraContent[]} */
export const CONTENTS = [
  {
    id: "muse",
    series: "muse",
    label: "μ's",
    logo: "../assets/game-icons/group-logos/Μ's_logo.png",
    live: true,
  },
  {
    id: "aqours",
    series: "aqours",
    label: "Aqours",
    logo: "../assets/game-icons/group-logos/Aqours.png",
    live: true,
  },
  {
    id: "nijigasaki",
    series: "nijigasaki",
    label: "虹ヶ咲",
    logo: "../assets/game-icons/group-logos/Love_Live!_Nijigasaki_Gakuen_School_Idol_Doukoukai_logo.png",
    live: true,
  },
  {
    id: "liella",
    series: "liella",
    label: "Liella!",
    logo: "../assets/game-icons/group-logos/Liella!.png",
    live: true,
  },
  {
    id: "hasunosora",
    series: "hasunosora",
    label: "蓮ノ空",
    logo: "../assets/game-icons/group-logos/hasu.webp",
    live: true,
  },
  {
    id: "ikizuraibu",
    series: "ikizuraibu",
    label: "いきづらい部",
    logo: null,
    live: false,
    note: "画像未整備のため保留（用意後に live:true）",
  },
  {
    id: "sukumyu",
    series: "sukumyu",
    label: "スクミュ",
    logo: null,
    live: false,
    note: "スクールアイドルミュージカル！ 画像未整備のため保留",
  },
];

/**
 * 字牌 7 種。`glyph` は画像がない場合の表示グリフ。`blank:true` は無地（白）。
 * @typedef {{ id:string, label:string, glyph:string, blank?:boolean }} HonorTile
 * @type {HonorTile[]}
 */
export const HONOR_TILES = [
  { id: "soap", label: "石鹸", glyph: "🧼" },
  { id: "water", label: "水", glyph: "💧" },
  { id: "rainbow", label: "虹", glyph: "🌈" },
  { id: "star", label: "星", glyph: "⭐" },
  { id: "lotus", label: "蓮", glyph: "🪷" },
  { id: "bird", label: "鳥", glyph: "🐦" },
  { id: "blank", label: "白", glyph: "", blank: true },
];

export const HONOR_SUIT = "honor";

/** @param {string} id */
export function contentById(id) {
  return CONTENTS.find((c) => c.id === id) || null;
}

/** @param {string} id */
export function honorById(id) {
  return HONOR_TILES.find((h) => h.id === id) || null;
}
