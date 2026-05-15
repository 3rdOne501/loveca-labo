/**
 * DECK LOG 系の「テキスト貼り付け」形式（例: 4 x PL!N-bp1-002-R＋）からメインデッキ構成を復元します。
 * ブラウザから decklog API を直接叩く処理は CORS で失敗することが多いため扱いません。
 * デッキコード→テキストは https://ws4696.xyz/decklog/ 等の外部ツール利用を想定（UI にも案内あり）。
 */

import { MAX_COPIES_PER_CARD, MAIN_SIZE, T_MEMBER, T_LIVE } from "./config.js";

/** API / 画面上のカード番号キーを DB 側の card_no と突き合わせやすくする（表記ゆれのみ） */
function normalizeDecklogCardNumberKey(no) {
  if (no == null) return "";
  return String(no).replace(/\ufeff/g, "").normalize("NFKC").trim();
}

/**
 * 「3 x PL!SP-bp1-005-P　葉月 恋」のようにコードの後ろにカード名が付いた行では、コード部分だけを使います。
 * @param {string} sliceAfterQty
 */
function firstCardTokenFromRecipeRest(sliceAfterQty) {
  const t = normalizeDecklogCardNumberKey(sliceAfterQty).trim();
  if (!t) return "";
  /** 先頭の「枚数 x」形式に一致する残骸を除くため、トークンの先頭が PL でなければ次を試すことはしない */
  const parts = t.split(/\s+/).filter(Boolean);
  const head = parts[0] || "";
  if (/^PL[!！]/i.test(head)) return head;
  /** まれに先頭が記号のみのとき */
  const joinedEarly = parts.slice(0, 3).join(" ");
  const fm = joinedEarly.match(/(PL[!！][^\s]*)/i);
  return fm ? fm[1] : head;
}

/**
 * メインデッキ一覧テキスト（例: 「4 x PL!N-bp1-002-R＋」）をパースします。
 */
export function parseDeckTextRecipe(text, catalog) {
  const lines = String(text || "").split(/\r?\n/);
  /** @type {Record<string, number>} */
  const out = {};
  /** @type {string[]} */
  const unk = [];
  const re = /^\s*(\d+)\s*[x×]\s*(.+)$/i;
  for (const line of lines) {
    const t = line.trim();
    if (!t || /^[;\s]+$/.test(t)) continue;
    const m = t.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (!Number.isInteger(n) || n < 0 || n > MAX_COPIES_PER_CARD) continue;
    const cardTok = firstCardTokenFromRecipeRest(String(m[2] || ""));
    if (!cardTok) continue;
    const cn = fuzzyResolveCardNo(catalog, cardTok);
    if (!cn) {
      unk.push("カードが見つかりません（登録されていないコードの可能性があります）: " + cardTok);
      continue;
    }
    out[cn] = (out[cn] || 0) + n;
  }
  const warns = [...unk, ...buildDeckWarns(out, catalog)];
  return { deckMap: out, warns };
}

function fuzzyResolveCardNo(catalog, raw) {
  if (!raw) return "";
  let s = normalizeDecklogCardNumberKey(raw).replace(/\s+/g, "");
  /** カード DB は `PL!HS-bp〜`。貼り付けで `HS-pb` となる表記ゆれを吸収します。 */
  if (/^PL!HS-pb/i.test(s)) s = s.replace(/^PL!HS-pb/i, "PL!HS-bp");
  if (!s) return "";
  if (catalog[s]) return s;
  for (const k of Object.keys(catalog)) {
    if (k.startsWith("_")) continue;
    if (normalizeDecklogCardNumberKey(k).replace(/\s+/g, "") === s) return k;
  }
  const a = raw.replace("+", "＋");
  const b = raw.replace("＋", "+");
  if (catalog[a]) return a;
  if (catalog[b]) return b;
  return "";
}

function buildDeckWarns(deckMap, catalog) {
  /** @type {string[]} */
  const warns = [];
  let total = 0;
  for (const [no, qty] of Object.entries(deckMap)) {
    if (qty <= 0) continue;
    const card = catalog[no];
    if (!card) continue;
    total += qty;
  }
  if (total > 0 && total !== MAIN_SIZE) warns.push("枚数が " + MAIN_SIZE + " ではなく " + total + " です。");
  return warns;
}
