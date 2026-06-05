import {
  CARDS_JSON_BUNDLED_PATH,
  CARDS_JSON_REMOTE_URLS,
  CARDS_JSON_URL,
  STORAGE_CARDS_JSON_OVERRIDE,
  T_MEMBER,
  T_LIVE,
} from "./config.js";
import { abilityWikiCanonicalKeys } from "./gameStatusIcons.js";
import {
  cardHasBladeHeart,
  isBladeHeartDrawMarkerKey,
  liveCardHasColoredBhWithoutAll,
  parseBladeHeartSlotFromKey,
  parseHeartColorSlotFromKey,
  setIsScoreLiveCheck,
} from "./bladeHeart.js";

/** リモートが `{}` だけ返す等の異常応答を弾き、同梱 data/cards.json へフォールバックする */
const MIN_CATALOG_CARD_COUNT = 50;

let catalog = {};
let list = [];
/** 正規化キー → カタログ上の実キー（全角／結合文字などの表記ゆれで getCard が外れないようにする） */
let catalogKeyByNormalized = new Map();

/** @param {unknown} s */
export function normalizeCardCatalogLookupKey(s) {
  return String(s == null ? "" : s)
    .replace(/\ufeff/g, "")
    .normalize("NFKC")
    .trim();
}

/** 上書きが無ければ既定の公開 URL（`localStorage` の llocg_cards_json_override があれば優先） */
export function getEffectiveCardsJsonUrl() {
  const o = localStorage.getItem(STORAGE_CARDS_JSON_OVERRIDE);
  if (o != null && String(o).trim() !== "") return String(o).trim();
  return CARDS_JSON_URL;
}

/** @returns {string[]} 取得を試す URL（上書き → 同梱 data → CDN） */
export function getCardsJsonLoadUrls() {
  /** @type {string[]} */
  const urls = [];
  const o = localStorage.getItem(STORAGE_CARDS_JSON_OVERRIDE);
  if (o != null && String(o).trim() !== "") urls.push(String(o).trim());
  try {
    if (typeof document !== "undefined" && document.baseURI) {
      urls.push(new URL(CARDS_JSON_BUNDLED_PATH, document.baseURI).href);
    }
  } catch (_) {
    /* noop */
  }
  for (const remote of CARDS_JSON_REMOTE_URLS) {
    if (remote && urls.indexOf(remote) < 0) urls.push(remote);
  }
  return urls;
}

/** 空文字で上書き解除（画面からは呼ばない。コンソール・手動復旧用に残す） */
export function setCardsJsonUrlOverride(urlOrEmpty) {
  const t = urlOrEmpty == null ? "" : String(urlOrEmpty).trim();
  if (t) localStorage.setItem(STORAGE_CARDS_JSON_OVERRIDE, t);
  else localStorage.removeItem(STORAGE_CARDS_JSON_OVERRIDE);
}

/**
 * デッキ構築のカード一覧サムネ用に軽量 URL を返す（一覧は wsrv.nl 経由の縮小 JPEG、拡大プレビューは元 URL）。
 * @param {string} originalUrl
 * @param {{ hi?: boolean } | undefined} opts `hi` で一覧より高解像（サンプルサムネ等）
 * @returns {string}
 */
export function catalogListThumbnailUrl(originalUrl, opts) {
  const o = opts != null && typeof opts === "object" ? opts : {};
  const hi = o.hi === true;
  const playLw = o.playLightweight === true;
  const play = o.play === true || playLw;
  const playPile = o.playPile === true;
  if (!originalUrl || typeof originalUrl !== "string") return originalUrl;
  if (originalUrl.startsWith("data:") || originalUrl.includes("wsrv.nl")) return originalUrl;
  try {
    const u = new URL(originalUrl, typeof location !== "undefined" ? location.href : "https://local.invalid/");
    if (u.protocol !== "http:" && u.protocol !== "https:") return originalUrl;
    let w = 96;
    let h = 136;
    let q = 52;
    if (playLw) {
      w = 80;
      h = 112;
      q = 44;
    } else if (playPile) {
      w = 72;
      h = 100;
      q = 48;
    } else if (play) {
      w = 120;
      h = 172;
      q = 55;
    } else if (hi) {
      w = 200;
      h = 286;
      q = 78;
    }
    return (
      "https://wsrv.nl/?url=" +
      encodeURIComponent(u.href) +
      "&w=" +
      w +
      "&h=" +
      h +
      "&fit=cover&q=" +
      q +
      "&output=jpg&n=-1"
    );
  } catch (_) {
    return originalUrl;
  }
}

/**
 * 渡辺 曜＆鬼塚夏美＆大沢瑠璃乃（LL-bp2-001-R＋系）: 手札にいる間、印刷コストが 20 から「自身以外の手札枚数」ぶん減る扱い。
 * @param {string} cardNo
 */
export function isHandDependentCost20Member(cardNo) {
  return (
    catalogCardNosShareIdentity(cardNo, "LL-bp2-001-R＋") ||
    catalogCardNosShareIdentity(cardNo, "LL-bp2-001-R+")
  );
}

/** 平安名すみれ（PL!SP-bp4-004 系） */
export function cardIsSpBp4004Sumire(cardNo) {
  if (!cardNo) return false;
  return (
    catalogCardNosShareIdentity(cardNo, "PL!SP-bp4-004-P") ||
    catalogCardNosShareIdentity(cardNo, "PL!SP-bp4-004-P＋")
  );
}

/** @type {Map<string, string>} */
let catalogIdentityByCardNo = new Map();

/**
 * rare_list クラスタごとに最低レアの card_no を同一カード ID として登録する。
 * @param {Record<string, any>} cat
 */
export function rebuildCatalogIdentityIndex(cat) {
  catalogIdentityByCardNo = new Map();
  if (!cat || typeof cat !== "object") return;
  /** @type {Set<string>} */
  const visited = new Set();
  function getRareListCardNos(card) {
    const rl = card && card.rare_list;
    if (!Array.isArray(rl)) return [];
    const out = [];
    for (const e of rl) {
      if (!e || typeof e !== "object") continue;
      const n = String(e.card_no || "").trim();
      if (n) out.push(n);
    }
    return out;
  }
  for (const key of Object.keys(cat)) {
    if (key.startsWith("_")) continue;
    if (visited.has(key)) continue;
    const card = cat[key];
    if (!card || typeof card !== "object") {
      visited.add(key);
      continue;
    }
    /** @type {string[]} */
    const stack = [key];
    /** @type {Set<string>} */
    const groupSet = new Set();
    while (stack.length) {
      const k = stack.pop();
      if (!k || visited.has(k)) continue;
      visited.add(k);
      groupSet.add(k);
      const cur = cat[k];
      if (!cur) continue;
      for (const n of getRareListCardNos(cur)) {
        if (!visited.has(n) && cat[n]) stack.push(n);
      }
    }
    const sorted = [...groupSet].sort(function (a, b) {
      const ra = rareRankForVariantNormalization(cat[a] && cat[a].rare);
      const rb = rareRankForVariantNormalization(cat[b] && cat[b].rare);
      if (ra !== rb) return ra - rb;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    const canon = sorted[0] || key;
    for (const n of sorted) {
      catalogIdentityByCardNo.set(n, canon);
      const nk = normalizeCardCatalogLookupKey(n);
      if (nk) catalogIdentityByCardNo.set(nk, canon);
    }
  }
}

/** イラスト違い（rare_list クラスタ）を含む同一カードの代表 card_no */
export function catalogCardIdentityKey(cardNo) {
  if (cardNo == null || String(cardNo).trim() === "") return "";
  const s = String(cardNo);
  const hit = catalogIdentityByCardNo.get(s);
  if (hit) return hit;
  const nk = normalizeCardCatalogLookupKey(s);
  if (nk && catalogIdentityByCardNo.has(nk)) return catalogIdentityByCardNo.get(nk) || s;
  const resolved = getCard(s);
  if (resolved && resolved.card_no != null) {
    const r = String(resolved.card_no);
    const hit2 = catalogIdentityByCardNo.get(r);
    if (hit2) return hit2;
    return r;
  }
  return s;
}

/** 別レアリティ・別イラストでも rare_list 上同一なら true */
export function catalogCardNosShareIdentity(cardNoA, cardNoB) {
  if (cardNoA == null || cardNoB == null) return false;
  return catalogCardIdentityKey(cardNoA) === catalogCardIdentityKey(cardNoB);
}

/**
 * メインデッキに含まれるカード画像を、一覧表示より先にブラウザキャッシュへ載せる。
 * @param {Record<string, number>} deckMap
 * @param {(no: string) => unknown} getCardFn
 */
export function prefetchDeckCardImagesFromMap(deckMap, getCardFn) {
  if (!deckMap || typeof deckMap !== "object") return;
  const urls = new Set();
  for (const k of Object.keys(deckMap)) {
    const n = deckMap[k];
    if (!(Number(n) > 0)) continue;
    const c = getCardFn(k);
    if (!c || typeof c !== "object" || !c.img) continue;
    urls.add(String(c.img));
    const thumb = catalogListThumbnailUrl(c.img);
    if (thumb && thumb !== c.img) urls.add(thumb);
  }
  for (const u of urls) {
    try {
      const im = new Image();
      im.decoding = "async";
      if ("fetchPriority" in im) im.fetchPriority = "high";
      im.src = u;
    } catch (_) {
      /* noop */
    }
  }
}

/** @param {unknown} raw */
function countCatalogCardKeys(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return 0;
  let n = 0;
  for (const k of Object.keys(raw)) {
    if (!String(k).startsWith("_")) n++;
  }
  return n;
}

function ingestCardCatalogJson(raw) {
  catalog = raw;
  catalogKeyByNormalized = new Map();
  for (const k of Object.keys(catalog)) {
    if (k.startsWith("_")) continue;
    const nk = normalizeCardCatalogLookupKey(k);
    if (!nk) continue;
    if (!catalogKeyByNormalized.has(nk)) catalogKeyByNormalized.set(nk, k);
  }
  normalizeRareListVariantsInCatalog(catalog);
  rebuildCatalogIdentityIndex(catalog);
  list = Object.entries(catalog)
    .filter(([k]) => !k.startsWith("_"))
    .map(([, v]) => v)
    .filter(Boolean);
  injectUnsetPlaceholderCards();
}

export async function loadCardDatabase(statusEl) {
  if (statusEl) statusEl.textContent = "";
  const detail = typeof document !== "undefined" ? document.getElementById("app-boot-detail") : null;
  const urls = getCardsJsonLoadUrls();
  /** @type {Error | null} */
  let lastErr = null;

  async function loadOnce(url, cachePolicy) {
    const res = await fetch(url, { cache: cachePolicy });
    if (!res.ok) throw new Error("カードデータの取得に失敗しました: " + res.status + " (" + url + ")");
    const json = await res.json();
    if (!json || typeof json !== "object") throw new Error("カードデータの形式が不正です: " + url);
    const cardCount = countCatalogCardKeys(json);
    if (cardCount < MIN_CATALOG_CARD_COUNT) {
      throw new Error(
        "カードデータが空または件数不足です（" +
          cardCount +
          " 件）: " +
          url,
      );
    }
    ingestCardCatalogJson(json);
    if (detail) detail.textContent = "";
    return list;
  }

  for (const cachePolicy of ["no-store", "default"]) {
    for (const url of urls) {
      try {
        if (detail) {
          detail.textContent =
            cachePolicy === "default" && lastErr
              ? url + "（別経路で再接続…）"
              : url;
        }
        return await loadOnce(url, cachePolicy);
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  const msg =
    "カードデータを取得できませんでした。ネットワークとローカルサーバ（http://127.0.0.1:…）を確認し、data/cards.json があるかも確認してください。";
  if (lastErr && lastErr.message) throw new Error(msg + " 詳細: " + lastErr.message);
  throw new Error(msg);
}

export {
  classifyCardAbility,
  abilityPlainText,
  catalogCardMatchesPickFilters,
  catalogCardMatchesSeriesTag,
  memberHasKidouAbility,
  memberKidouRecoverHandType,
  memberHasKidouStageToWaitingPickAbility,
  memberHasToujouAbility,
  memberHasOptionalToujouAbility,
  memberHasLiveStartAbility,
  memberHasOptionalLiveStartAbility,
  memberHasLiveSuccessAbility,
  abilityEffectIsAutomated,
  cardHasTrigger,
  splitAbilityByTriggers,
  abilityRawSegmentForTrigger,
  cardAbilityRawText,
} from "./abilityEffects.js";

export {
  evaluateMemberJouji,
  joujiHeartSlotRead,
  listNativeJoujiSegmentRaws,
} from "./joujiEffects.js";

export {
  listNativeToujouSegmentRaws,
  listNativeLiveStartSegmentRaws,
  listNativeKidouSegmentRaws,
  cardCannotPlaceOnSuccessLive,
  parseQuotedCharacterNames,
} from "./abilityEffects.js";

export const UNSET_PLACEHOLDER_PRODUCT = "未設定（テスト用）";
const UNSET_PLACEHOLDER_PREFIX = "UNSET-M-";
const TEST_BH_VARIANT_SEP = "__BH";
/** BH 無しにしたいコスト範囲（5〜10） */
const UNSET_NO_BH_COST_MIN = 5;
const UNSET_NO_BH_COST_MAX = 10;
/** 生成するコスト範囲（1〜22） */
const UNSET_COST_MIN = 1;
const UNSET_COST_MAX = 22;

/** プレースホルダー用の SVG サムネ（cost ごとに大きな数字） */
function makeUnsetPlaceholderImg(cost, hasBh) {
  const bg = hasBh ? "#3a2549" : "#3a3a3a";
  const accent = hasBh ? "#ffb6e2" : "#cfcfcf";
  const txt = "#fbe7f5";
  const sub = "#d9c8d9";
  const bhLabel = hasBh ? "BH 1" : "no BH";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid meet">' +
    '<rect width="200" height="280" rx="14" ry="14" fill="' + bg + '" stroke="' + accent + '" stroke-width="3"/>' +
    '<text x="100" y="48" font-size="20" fill="' + sub + '" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif">未設定</text>' +
    '<text x="100" y="170" font-size="96" fill="' + txt + '" text-anchor="middle" font-weight="800" font-family="-apple-system,system-ui,sans-serif">' + cost + '</text>' +
    '<text x="100" y="208" font-size="22" fill="' + sub + '" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif">cost</text>' +
    '<text x="100" y="252" font-size="16" fill="' + accent + '" text-anchor="middle" font-family="-apple-system,system-ui,sans-serif">' + bhLabel + '</text>' +
    "</svg>";
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function buildUnsetPlaceholderCards() {
  const out = [];
  for (let cost = UNSET_COST_MIN; cost <= UNSET_COST_MAX; cost++) {
    const hasBh = !(cost >= UNSET_NO_BH_COST_MIN && cost <= UNSET_NO_BH_COST_MAX);
    const cardNo = UNSET_PLACEHOLDER_PREFIX + String(cost).padStart(2, "0");
    const card = {
      card_no: cardNo,
      img: makeUnsetPlaceholderImg(cost, hasBh),
      name: "未設定 cost " + cost + (hasBh ? "" : "（BHなし）"),
      product: UNSET_PLACEHOLDER_PRODUCT,
      type: T_MEMBER,
      cost: cost,
      base_heart: {},
      blade: 1,
      rare: "—",
      ability: "（未設定プレースホルダー：デッキ仮組み・テスト用）",
    };
    if (hasBh) card.blade_heart = { b_all: 1 };
    out.push(card);
  }
  return out;
}

/** @param {"A"|"B"} series */
function makeLetterTestCardSvg(series, index) {
  const hue = series === "A" ? 320 : 200;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280">' +
    "<defs>" +
    "<linearGradient id=\"g\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\">" +
    "<stop offset=\"0%\" stop-color=\"hsl(" +
    hue +
    ",65%,28%)\"/>" +
    "<stop offset=\"100%\" stop-color=\"hsl(" +
    hue +
    ",55%,14%)\"/>" +
    "</linearGradient></defs>" +
    '<rect width="200" height="280" rx="14" fill="url(#g)" stroke="rgba(255,200,240,0.35)" stroke-width="3"/>' +
    '<text x="100" y="52" text-anchor="middle" fill="#f8e8ff" font-size="22" font-family="-apple-system,system-ui,sans-serif">TEST ' +
    series +
    "</text>" +
    '<text x="100" y="168" text-anchor="middle" fill="#fff" font-size="72" font-weight="800" font-family="-apple-system,system-ui,sans-serif">' +
    index +
    (series === "A" ? "a" : "b") +
    "</text>" +
    '<text x="100" y="248" text-anchor="middle" fill="rgba(255,230,250,0.85)" font-size="15" font-family="-apple-system,system-ui,sans-serif">未設定テスト</text>' +
    "</svg>";
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/** 名前が「1a」「2a」「…」と「1b」「2b」形式のテスト用カード（公式 DB と衝突しにくい接頭辞） */
function buildLetterTestPlaceholderCards() {
  /** @type {object[]} */
  const out = [];
  for (let i = 1; i <= 24; i++) {
    const no = "LL-TA-" + String(i).padStart(2, "0");
    out.push({
      card_no: no,
      name: String(i) + "a",
      img: makeLetterTestCardSvg("A", i),
      product: UNSET_PLACEHOLDER_PRODUCT,
      type: T_MEMBER,
      cost: 1 + (i % 9),
      base_heart: {},
      blade: 1,
      rare: "—",
      ability: "テスト a 系列（未設定・ソロ確認用）",
      blade_heart: i % 4 === 0 ? {} : { b_all: 1 },
    });
  }
  for (let i = 1; i <= 24; i++) {
    const no = "LL-TB-" + String(i).padStart(2, "0");
    out.push({
      card_no: no,
      name: String(i) + "b",
      img: makeLetterTestCardSvg("B", i),
      product: UNSET_PLACEHOLDER_PRODUCT,
      type: T_MEMBER,
      cost: 1 + (i % 11),
      base_heart: {},
      blade: 1,
      rare: "—",
      ability: "テスト b 系列（未設定・ソロ確認用）",
      blade_heart: { b_heart03: 1 },
    });
  }
  for (let i = 1; i <= 24; i++) {
    const no = "LL-TL-" + String(i).padStart(2, "0");
    const needSlot = 1 + (i % 6);
    out.push({
      card_no: no,
      name: String(i) + "l",
      img: makeLetterTestCardSvg("B", i),
      product: UNSET_PLACEHOLDER_PRODUCT,
      type: T_LIVE,
      score: 5 + (i % 4),
      need_heart: { ["heart0" + needSlot]: 2, heart0: 1 },
      rare: "—",
      ability: "テスト live 系列（未設定・ソロ確認用）",
      blade_heart: i % 2 === 0 ? { ["b_heart0" + needSlot]: 1 } : {},
    });
  }
  return out;
}

function testBhSlotLabel(slotNum) {
  const n = Number(slotNum);
  if (n === 1) return "桃";
  if (n === 2) return "赤";
  if (n === 3) return "黄";
  if (n === 4) return "緑";
  if (n === 5) return "青";
  if (n === 6) return "紫";
  if (n === 7) return "ALL";
  return "なし";
}

/**
 * 同一 `rare_list` で繋がる「イラスト違い（同名カード扱い）」を正規化するための rarity 重み。
 * 値が小さいほど「下のレア」＝公式テキスト・BH の確定版とみなす。未知のレアは中位扱い。
 *
 *   N / SD / L: 一般／スターターデッキ／基本ライブ（最も低い）
 *   R / PR    : 通常レア / プロモ
 *   R+ / L+ / P / PE
 *   P+ / PE+
 *   RM / AR / RE / SR / SRE / LLE / PR+ : 特殊枠（中〜高）
 *   SEC / SEC+ / SECL / SECE            : シークレット系（最も高い）
 */
const RARE_RANK_TABLE = {
  "N": 0, "SD": 0, "L": 0,
  "R": 1, "PR": 1,
  "R+": 2, "R＋": 2, "L+": 2, "L＋": 2, "P": 2, "PE": 2,
  "P+": 3, "P＋": 3, "PE+": 3, "PE＋": 3,
  "RM": 4, "AR": 4, "RE": 4, "SR": 4, "SRE": 4, "LLE": 4, "PR+": 4, "PR＋": 4,
  "SEC": 5, "SEC+": 5, "SEC＋": 5, "SECL": 5, "SECE": 5,
};

function rareRankForVariantNormalization(rare) {
  if (rare == null) return 99;
  const k = String(rare).trim();
  if (k === "") return 99;
  if (Object.prototype.hasOwnProperty.call(RARE_RANK_TABLE, k)) return RARE_RANK_TABLE[k];
  return 50;
}

function bladeHeartObjectIsEmpty(bh) {
  return !bh || typeof bh !== "object" || Array.isArray(bh) || Object.keys(bh).length === 0;
}

function abilityStringIsEmpty(s) {
  return s == null || String(s).trim() === "";
}

function plainObjectIsEmpty(o) {
  return !o || typeof o !== "object" || Array.isArray(o) || Object.keys(o).length === 0;
}

/**
 * カタログ内の `rare_list` を辿り、同一クラスタ（イラスト違い＝同名カード扱い）に属するカードを
 * 「最も低レアリティ」のデータで揃える。揃える対象は効果に関わるフィールドのみ：
 * `blade_heart` / `ability` / `base_heart` / `need_heart` / `blade` / `cost` / `score`。
 *
 * これにより、cards.json 上で L と L+ の BH が食い違っているケース（例: アオクハルカ・レディバグ）や、
 * 同名で能力テキスト長が違うケース（村野さやか／矢澤にこ等）が、画面表示・特殊ハート判定で乖離せず一致する。
 *
 * 最低レアリティの基本値が空欄のときは、同クラスタ内で「空でない」値があればそれを採用する
 * （cards.json 側でレアリティ低い側にだけ未記載が残っているケースの保険）。
 *
 * @param {Record<string, any>} cat
 */
export function normalizeRareListVariantsInCatalog(cat) {
  if (!cat || typeof cat !== "object") return;
  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {string[][]} */
  const groups = [];

  function getRareListCardNos(card) {
    const rl = card && card.rare_list;
    if (!Array.isArray(rl)) return [];
    const out = [];
    for (const e of rl) {
      if (!e || typeof e !== "object") continue;
      const n = String(e.card_no || "").trim();
      if (n) out.push(n);
    }
    return out;
  }

  for (const key of Object.keys(cat)) {
    if (key.startsWith("_")) continue;
    if (visited.has(key)) continue;
    const card = cat[key];
    if (!card || typeof card !== "object") {
      visited.add(key);
      continue;
    }
    /** @type {string[]} */
    const stack = [key];
    /** @type {Set<string>} */
    const groupSet = new Set();
    while (stack.length) {
      const k = stack.pop();
      if (!k || visited.has(k)) continue;
      visited.add(k);
      groupSet.add(k);
      const cur = cat[k];
      if (!cur) continue;
      const linked = getRareListCardNos(cur);
      for (const n of linked) {
        if (!visited.has(n) && cat[n]) stack.push(n);
      }
    }
    if (groupSet.size > 1) groups.push([...groupSet]);
  }

  for (const group of groups) {
    const sortedNos = group.slice().sort(function (a, b) {
      const ra = rareRankForVariantNormalization(cat[a] && cat[a].rare);
      const rb = rareRankForVariantNormalization(cat[b] && cat[b].rare);
      if (ra !== rb) return ra - rb;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    const canonNo = sortedNos[0];
    const canon = cat[canonNo];
    if (!canon || typeof canon !== "object") continue;

    function pickFirstNonEmpty(getter, isEmptyFn) {
      const c0 = getter(canon);
      if (!isEmptyFn(c0)) return c0;
      for (const n of sortedNos) {
        const v = getter(cat[n]);
        if (!isEmptyFn(v)) return v;
      }
      return c0;
    }

    const bh = pickFirstNonEmpty(function (c) { return c && c.blade_heart; }, bladeHeartObjectIsEmpty);
    const ab = pickFirstNonEmpty(function (c) { return c && c.ability; }, abilityStringIsEmpty);
    const baseH = pickFirstNonEmpty(function (c) { return c && c.base_heart; }, plainObjectIsEmpty);
    const needH = pickFirstNonEmpty(function (c) { return c && c.need_heart; }, plainObjectIsEmpty);
    const bladeN = pickFirstNonEmpty(
      function (c) { return c && c.blade; },
      function (v) { return v == null || v === ""; },
    );
    const costN = pickFirstNonEmpty(
      function (c) { return c && c.cost; },
      function (v) { return v == null || v === ""; },
    );
    const scoreN = pickFirstNonEmpty(
      function (c) { return c && c.score; },
      function (v) { return v == null || v === ""; },
    );

    for (const n of sortedNos) {
      const c = cat[n];
      if (!c || typeof c !== "object") continue;
      if (!bladeHeartObjectIsEmpty(bh)) c.blade_heart = Object.assign({}, bh);
      else if ("blade_heart" in c && bladeHeartObjectIsEmpty(c.blade_heart)) {
        /* 全員 BH 空のクラスタは BH 無しのままでよい */
      }
      if (!abilityStringIsEmpty(ab)) c.ability = ab;
      if (!plainObjectIsEmpty(baseH)) c.base_heart = Object.assign({}, baseH);
      if (!plainObjectIsEmpty(needH)) c.need_heart = Object.assign({}, needH);
      if (bladeN != null && bladeN !== "") c.blade = bladeN;
      if (costN != null && costN !== "") c.cost = costN;
      if (scoreN != null && scoreN !== "") c.score = scoreN;
    }
  }
}

/**
 * カタログに「未設定 cost N」プレースホルダーカード（cost 1〜22）を注入する。
 * cards.json の読み込み直後に呼び、表記ゆれ正規化マップにも登録する。
 * 既に同 card_no が存在する場合は上書きしない（公式データを優先）。
 */
function injectUnsetPlaceholderCards() {
  const placeholders = buildUnsetPlaceholderCards();
  for (const card of placeholders) {
    if (catalog[card.card_no]) continue;
    catalog[card.card_no] = card;
    const nk = normalizeCardCatalogLookupKey(card.card_no);
    if (nk && !catalogKeyByNormalized.has(nk)) {
      catalogKeyByNormalized.set(nk, card.card_no);
    }
    list.push(card);
  }
  const letterTests = buildLetterTestPlaceholderCards();
  for (const card of letterTests) {
    if (catalog[card.card_no]) continue;
    catalog[card.card_no] = card;
    const nk = normalizeCardCatalogLookupKey(card.card_no);
    if (nk && !catalogKeyByNormalized.has(nk)) {
      catalogKeyByNormalized.set(nk, card.card_no);
    }
    list.push(card);
  }
}

export function getAllCards() {
  return list;
}

export function getCard(cardNo) {
  if (cardNo == null) return null;
  const direct = catalog[cardNo];
  if (direct) return direct;
  const nk = normalizeCardCatalogLookupKey(cardNo);
  if (!nk) return null;
  const canon = catalogKeyByNormalized.get(nk);
  return canon ? catalog[canon] || null : null;
}

/**
 * テストカードを採用するときの BH 色違いを動的に作る（slot=0 は元カード）。
 * @param {string} baseCardNo
 * @param {number} slot
 * @returns {string}
 */
export function ensureTestBhVariant(baseCardNo, slot) {
  const baseNo = String(baseCardNo || "").trim();
  const s = Number(slot);
  if (!baseNo || !Number.isFinite(s) || s <= 0) return baseNo;
  const slotN = Math.max(1, Math.min(7, Math.floor(s)));
  const base = getCard(baseNo);
  if (!base) return baseNo;
  if (base.product !== UNSET_PLACEHOLDER_PRODUCT) return baseNo;
  const variantNo = baseNo + TEST_BH_VARIANT_SEP + String(slotN);
  if (catalog[variantNo]) return variantNo;
  const bh = {};
  if (slotN === 7) bh.b_all = 1;
  else bh["b_heart0" + String(slotN)] = 1;
  const variant = {
    ...base,
    card_no: variantNo,
    name: (base.name || baseNo) + " [BH:" + testBhSlotLabel(slotN) + "]",
    blade_heart: bh,
    _testBhVariantOf: baseNo,
  };
  catalog[variantNo] = variant;
  const nk = normalizeCardCatalogLookupKey(variantNo);
  if (nk && !catalogKeyByNormalized.has(nk)) catalogKeyByNormalized.set(nk, variantNo);
  list.push(variant);
  return variantNo;
}

/**
 * テストカード採用時に BH 色・表示名を同時指定した派生カードを動的生成する。
 * @param {string} baseCardNo
 * @param {{
 *   slot?: number,
 *   customName?: string,
 *   blade?: number,
 *   baseHeart?: Record<string, number>,
 *   liveScore?: number,
 *   needHeart?: Record<string, number>,
 *   customImg?: string
 * }} options
 * @returns {string}
 */
export function ensureTestCardVariant(baseCardNo, options) {
  const baseNo = String(baseCardNo || "").trim();
  if (!baseNo) return baseNo;
  const opts = options && typeof options === "object" ? options : {};
  const slotRaw = Number(opts.slot || 0);
  const slotN = Number.isFinite(slotRaw) ? Math.max(0, Math.min(7, Math.floor(slotRaw))) : 0;
  const customName = String(opts.customName || "").trim().slice(0, 40);
  const customImgRaw = opts.customImg != null ? String(opts.customImg).trim() : "";
  const hasCustomImg =
    customImgRaw.length > 0 &&
    (customImgRaw.startsWith("data:image/") || /^https?:\/\//i.test(customImgRaw));
  const src = getCard(baseNo);
  if (!src || src.product !== UNSET_PLACEHOLDER_PRODUCT) return baseNo;
  const bladeN = Number(opts.blade);
  const liveScoreN = Number(opts.liveScore);
  const hasBlade = Number.isFinite(bladeN);
  const hasLiveScore = Number.isFinite(liveScoreN);
  const baseHeartMap = opts.baseHeart && typeof opts.baseHeart === "object" ? opts.baseHeart : null;
  const needHeartMap = opts.needHeart && typeof opts.needHeart === "object" ? opts.needHeart : null;
  const hasBaseHeart = !!(baseHeartMap && Object.keys(baseHeartMap).length);
  const hasNeedHeart = !!(needHeartMap && Object.keys(needHeartMap).length);
  if (!(slotN > 0) && !customName && !hasBlade && !hasLiveScore && !hasBaseHeart && !hasNeedHeart && !hasCustomImg)
    return baseNo;
  const seedNo = src._testBhVariantOf ? String(src._testBhVariantOf) : baseNo;
  const base = getCard(seedNo) || src;
  if (!base || base.product !== UNSET_PLACEHOLDER_PRODUCT) return baseNo;
  if (slotN > 0 && !customName && !hasBlade && !hasLiveScore && !hasBaseHeart && !hasNeedHeart && !hasCustomImg) {
    return ensureTestBhVariant(seedNo, slotN);
  }
  const nameKey = customName
    ? customName
        .normalize("NFKC")
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\-]/g, "")
        .slice(0, 24) || "name"
    : "noname";
  const bladeKey = hasBlade ? "b" + String(Math.max(0, Math.floor(bladeN))) : "b_";
  const scoreKey = hasLiveScore ? "s" + String(Math.max(0, Math.floor(liveScoreN))) : "s_";
  function heartKeyForVariantSlot(slot) {
    return slot === 0 ? "heart0" : "heart" + String(slot).padStart(2, "0");
  }
  const baseHeartKey = hasBaseHeart
    ? "bh" +
      [0, 1, 2, 3, 4, 5, 6]
        .map(function (slot) {
          var k = heartKeyForVariantSlot(slot);
          return String(Math.max(0, Math.floor(Number(baseHeartMap[k] || 0))));
        })
        .join("")
    : "bh_";
  const needHeartKey = hasNeedHeart
    ? "nh" +
      [0, 1, 2, 3, 4, 5, 6]
        .map(function (slot) {
          var k = heartKeyForVariantSlot(slot);
          return String(Math.max(0, Math.floor(Number(needHeartMap[k] || 0))));
        })
        .join("")
    : "nh_";
  function hashVariantChunk(str) {
    var h = 2166136261 >>> 0;
    var lim = Math.min(8000, str.length);
    for (var i = 0; i < lim; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return (h >>> 0).toString(36);
  }
  const imgKey = hasCustomImg ? "im" + String(customImgRaw.length) + "h" + hashVariantChunk(customImgRaw) : "im_";
  const variantNo =
    seedNo +
    TEST_BH_VARIANT_SEP +
    "s" +
    String(slotN) +
    TEST_BH_VARIANT_SEP +
    "n" +
    nameKey +
    TEST_BH_VARIANT_SEP +
    bladeKey +
    TEST_BH_VARIANT_SEP +
    scoreKey +
    TEST_BH_VARIANT_SEP +
    baseHeartKey +
    TEST_BH_VARIANT_SEP +
    needHeartKey +
    TEST_BH_VARIANT_SEP +
    imgKey;
  if (catalog[variantNo]) return variantNo;
  const bh = {};
  if (slotN > 0) {
    if (slotN === 7) bh.b_all = 1;
    else bh["b_heart0" + String(slotN)] = 1;
  } else if (base.blade_heart && typeof base.blade_heart === "object") {
    Object.assign(bh, base.blade_heart);
  }
  const resolvedName = customName || base.name || seedNo;
  const nameParts = [resolvedName];
  if (slotN > 0) nameParts.push("[BH:" + testBhSlotLabel(slotN) + "]");
  const variant = {
    ...base,
    card_no: variantNo,
    name: nameParts.join(" "),
    blade_heart: bh,
    _testBhVariantOf: seedNo,
  };
  if (hasBlade) variant.blade = Math.max(0, Math.floor(bladeN));
  if (hasLiveScore) variant.score = Math.max(0, Math.floor(liveScoreN));
  if (hasBaseHeart) {
    const next = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(function (slot) {
      const key = heartKeyForVariantSlot(slot);
      const val = Math.max(0, Math.floor(Number(baseHeartMap[key] || 0)));
      if (val > 0) next[key] = val;
    });
    variant.base_heart = next;
  }
  if (hasNeedHeart) {
    const next = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(function (slot) {
      const key = heartKeyForVariantSlot(slot);
      const val = Math.max(0, Math.floor(Number(needHeartMap[key] || 0)));
      if (val > 0) next[key] = val;
    });
    variant.need_heart = next;
  }
  if (hasCustomImg) variant.img = customImgRaw;
  catalog[variantNo] = variant;
  const nk = normalizeCardCatalogLookupKey(variantNo);
  if (nk && !catalogKeyByNormalized.has(nk)) catalogKeyByNormalized.set(nk, variantNo);
  list.push(variant);
  return variantNo;
}

/**
 * メイン（60枚）の枚数集計・ソロ山札組み立てで共通。公式 cards.json に type 欠落の行がある。
 * メンバー／ライブとして明示されていない場合は cost / score で推定し、それ以外（エネ等）はそのまま返す。
 * @param {object | null | undefined} c
 * @returns {string | null}
 */
export function effectiveMainDeckCategory(c) {
  if (!c || typeof c !== "object") return null;
  if (c.type === T_MEMBER || c.type === T_LIVE) return c.type;
  if (c.type != null && String(c.type).trim() !== "") {
    return typeof c.type === "string" ? c.type : String(c.type);
  }
  if (c.cost != null && String(c.cost).trim() !== "") return T_MEMBER;
  if (c.score != null) return T_LIVE;
  return T_MEMBER;
}

/** decklog インポート等で card_no を照合するときに使う（読み取りのみ） */
export function getCardCatalogSnapshot() {
  return catalog;
}

export function uniqueProducts(cards) {
  const s = new Set();
  cards.forEach((c) => {
    if (c.product) s.add(c.product);
  });
  return [...s].sort();
}

export function uniqueSeries(cards) {
  const s = new Set();
  cards.forEach((c) => {
    if (c.series) {
      String(c.series)
        .split(/\n/)
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((x) => s.add(x));
    }
  });
  return [...s].sort();
}

export function uniqueUnits(cards) {
  const s = new Set();
  cards.forEach((c) => {
    if (c.unit) s.add(c.unit);
  });
  return [...s].sort();
}

export function uniqueCosts(cards) {
  const s = new Set();
  cards.forEach((c) => {
    if (c.type !== T_MEMBER) return;
    if (c.cost != null && c.cost !== "") s.add(Number(c.cost));
  });
  return [...s].sort((a, b) => a - b);
}

/** 音符ライブ判定から除外: blade_heart に b_all（ALL ブレード）を持つライブ */
export function liveCardHasExcludedAllBladeHeart(card) {
  const bh = card && card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return false;
  const v = Number(bh.b_all);
  return Number.isFinite(v) && v > 0;
}

/**
 * 能力文に DB 既定の wiki トークン `{{icon_draw.png|ドロー}}` があるか（表示用・参考）。
 */
export function abilityHasDrawSpecialHeartWikiToken(card) {
  if (!card) return false;
  const ab = String(card.ability || "");
  return /\{\{\s*icon_draw\.png\s*\|\s*ドロー\s*\}\}/i.test(ab);
}

/**
 * ドロー特殊ハートのライブ: ALL（b_all）BH を持たず、桃〜紫の色 BH を 1 つ以上持つライブ。
 */
export function cardIsDrawYellLiveCatalog(card) {
  return liveCardHasColoredBhWithoutAll(card);
}

/** @deprecated 互換エイリアス */
export const cardIsDrawLiveCatalog = cardIsDrawYellLiveCatalog;

/**
 * スコア（旧称音符ライブ）: DB に blade_heart が無いライブのみ。
 * BH 記載があるカードにスコア特殊 BH は付けない。
 */
export function cardIsNoteLiveCatalog(card) {
  if (!card || card.type !== T_LIVE) return false;
  if (cardHasBladeHeart(card)) return false;
  return true;
}

/** @deprecated 互換エイリアス */
export const cardIsScoreLiveCatalog = cardIsNoteLiveCatalog;

/**
 * エールで解決にめくったとき、成功ライブの最終スコアに加算するスコア特殊ハート数（1枚あたり）。
 * DB の special_heart.score を優先。BH なしスコアライブで未記載なら 1。
 */
export function catalogEaleScoreHeartPoints(card) {
  if (!card || typeof card !== "object") return 0;
  var sh = card.special_heart;
  if (sh && typeof sh === "object" && !Array.isArray(sh)) {
    var n = Number(sh.score);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  if (cardIsNoteLiveCatalog(card)) return 1;
  return 0;
}

/* bladeHeart.js のスコア装飾判定を、循環参照を避けて差し込む */
setIsScoreLiveCheck(cardIsNoteLiveCatalog);

/** @returns {Set<number>} blade_heart が寄与する表示スロット 1〜7（b_all は 7） */
export function bladeHeartSlotsOnCard(card) {
  /** @type {Set<number>} */
  const out = new Set();
  const bh = card && card.blade_heart;
  if (!bh || typeof bh !== "object" || Array.isArray(bh)) return out;
  for (const key of Object.keys(bh)) {
    if (isBladeHeartDrawMarkerKey(key)) continue;
    const v = Number(bh[key]);
    if (!Number.isFinite(v) || v === 0) continue;
    const slot = parseBladeHeartSlotFromKey(key);
    if (slot != null) out.add(slot);
  }
  return out;
}

/** base_heart / need_heart の色情報スロット 1〜6（heart0 は含めない） */
export function printedHeartSlotsOnCard(card) {
  /** @type {Set<number>} */
  const out = new Set();
  if (!card) return out;
  function scan(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return;
    for (const key of Object.keys(o)) {
      const slot = parseHeartColorSlotFromKey(key);
      if (slot != null && slot >= 1 && slot <= 6) out.add(slot);
    }
  }
  scan(card.base_heart);
  scan(card.need_heart);
  return out;
}

export function filterCards(cards, opts) {
  const q = (opts.search || "").trim().toLowerCase();
  const bhSel = opts.bhSlots instanceof Set ? opts.bhSlots : null;
  const bhNonBh = !!opts.bhNonBh;
  const bhNoteLive = !!opts.bhNoteLive;
  const bhDrawYell = !!opts.bhDrawYell;
  const heartSel = opts.heartSlots instanceof Set ? opts.heartSlots : null;
  /* テキスト検索の特殊キーワード（表示名「ドロー」「スコア」および旧称） */
  const qHasDrawKeyword =
    q.length > 0 &&
    (q.indexOf("ドロー") !== -1 || q.indexOf("ドローエール") !== -1 || q.indexOf("drow") !== -1);
  const qHasScoreKeyword =
    q.length > 0 &&
    (q.indexOf("スコア") !== -1 || q.indexOf("音符ライブ") !== -1 || q.indexOf("音符") !== -1);
  return cards.filter((c) => {
    if (opts.types[T_MEMBER] === false && c.type === T_MEMBER) return false;
    if (opts.types[T_LIVE] === false && c.type === T_LIVE) return false;
    if (opts.product && c.product !== opts.product) return false;
    if (opts.series) {
      const ser = String(c.series || "");
      if (!ser.includes(opts.series)) return false;
    }
    if (opts.unit && c.unit !== opts.unit) return false;
    /* コストに何かしら「外した」チェックがあるとき、ライブはコストを持たないので一覧に出さない */
    if (opts.narrowCostExcludeLive && c.type === T_LIVE) return false;
    /* ライブカードは JSON 上コストが無く score 等のみのため、コスト絞り込みはメンバーだけに適用 */
    if (opts.costs && Object.keys(opts.costs).length && c.type === T_MEMBER) {
      const co = Number(c.cost);
      if (!opts.costs[co]) return false;
    }
    const bhAny =
      (bhSel && bhSel.size > 0) || bhNonBh || bhNoteLive || bhDrawYell;
    if (bhAny) {
      const bs = bladeHeartSlotsOnCard(c);
      const hasBh = cardHasBladeHeart(c);
      let hit = false;
      if (bhSel && bhSel.size > 0) {
        bhSel.forEach(function (s) {
          if (bs.has(s)) hit = true;
        });
      }
      if (bhNonBh && !hasBh) hit = true;
      if (bhNoteLive && cardIsNoteLiveCatalog(c)) hit = true;
      if (bhDrawYell && cardIsDrawYellLiveCatalog(c)) hit = true;
      if (!hit) return false;
    }
    if (heartSel && heartSel.size > 0) {
      const hs = printedHeartSlotsOnCard(c);
      let hit = false;
      heartSel.forEach(function (s) {
        if (hs.has(s)) hit = true;
      });
      if (!hit) return false;
    }
    if (q) {
      const inName = String(c.name || "").toLowerCase().includes(q);
      const inAbility = String(c.ability || "").toLowerCase().includes(q);
      let inSpecial = false;
      if (qHasDrawKeyword && cardIsDrawYellLiveCatalog(c)) inSpecial = true;
      if (qHasScoreKeyword && cardIsNoteLiveCatalog(c)) inSpecial = true;
      if (!inName && !inAbility && !inSpecial) return false;
    }
    return c.type === T_MEMBER || c.type === T_LIVE;
  });
}
