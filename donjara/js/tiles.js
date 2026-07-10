/**
 * 牌カタログ生成。
 * data/member-character-icons.json のロスターを再利用し、
 * 「1 キャラ = 1 牌種（既定 4 枚）」＋「字牌 7 種（既定 4 枚）」を作る。
 *
 * 牌種（TileType）の共通形:
 *   {
 *     key:       一意キー（例 "muse-honoka" / "honor-soap"）
 *     suit:      "muse"|"aqours"|...|"honor"     // 順子はスート内でのみ成立
 *     orderIndex:キャラ牌は 1..N（メンバー順、順子用）／字牌は null
 *     kind:      "member" | "honor"
 *     contentId: キャラ牌の所属コンテンツ id（字牌は null）
 *     label:     表示名（"高坂穂乃果" / "石鹸" など）
 *     iconUrl:   キャラ牌の画像 URL（字牌は null）
 *     glyph:     字牌の表示グリフ（キャラ牌は null）
 *     blank:     白（無地）なら true
 *   }
 */

import { CONTENTS, HONOR_TILES, HONOR_SUIT } from "./contents.js";
import { memberMeta } from "./memberData.js";

// ドンジャラ専用ロスター（公式メンバー紹介アイコン）。共有ロスターは書き換えない。
const ROSTER_URL = "data/member-character-icons.json";
const ICON_DIR = "assets/member-icons/";
const HONOR_ICON_DIR = "assets/honor-tiles/";

/** ロスターの file 名から実在しそうな画像 URL を作る（.webp / .png 揺れを吸収）。 */
function iconUrlFor(entry) {
  const f = String(entry.file || "").trim();
  if (!f) return null;
  return ICON_DIR + f;
}

let _catalogPromise = null;

/**
 * 牌カタログを構築（1 回だけ fetch、以降キャッシュ）。
 * @returns {Promise<{ types: any[], byKey: Map<string, any>, byContent: Map<string, any[]>, honors: any[] }>}
 */
export function loadTileCatalog() {
  if (_catalogPromise) return _catalogPromise;
  _catalogPromise = (async () => {
    let roster = [];
    try {
      const res = await fetch(ROSTER_URL);
      const json = await res.json();
      roster = Array.isArray(json.roster) ? json.roster : [];
    } catch (e) {
      console.error("[donjara] ロスター読み込み失敗:", e);
      roster = [];
    }

    const types = [];
    const byContent = new Map();

    for (const content of CONTENTS) {
      if (!content.live) continue; // 画像未整備コンテンツは保留
      const members = roster.filter((r) => r.series === content.series);
      const list = [];
      members.forEach((m, i) => {
        const meta = memberMeta(content.id, m.id);
        const t = {
          key: `${content.id}-${m.id}`,
          suit: content.id,
          orderIndex: i + 1, // メンバー順（順子用）
          kind: "member",
          contentId: content.id,
          charId: m.id,
          label: m.label || m.id,
          iconUrl: iconUrlFor(m),
          logoUrl: content.logo || null, // グループロゴ（牌の下に表示）
          glyph: null,
          blank: false,
          // 内部データ（後々の役用）
          grade: meta ? meta.grade : null, // 1|2|3|null
          unit: meta ? meta.unit : null, // 所属ユニット名
          work: meta ? meta.work : null, // 作品名
        };
        types.push(t);
        list.push(t);
      });
      byContent.set(content.id, list);
    }

    const honors = [];
    for (const h of HONOR_TILES) {
      const t = {
        key: `${HONOR_SUIT}-${h.id}`,
        suit: HONOR_SUIT,
        orderIndex: null, // 字牌に順子なし
        kind: "honor",
        contentId: null,
        honorId: h.id,
        label: h.label,
        iconUrl: h.icon ? HONOR_ICON_DIR + h.icon : null,
        glyph: h.glyph || "",
        blank: !!h.blank,
      };
      types.push(t);
      honors.push(t);
    }

    const byKey = new Map();
    types.forEach((t) => byKey.set(t.key, t));

    return { types, byKey, byContent, honors };
  })();
  return _catalogPromise;
}
