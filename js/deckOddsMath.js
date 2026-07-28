/**
 * 山札確率の共通計算（プレイ画面・デッキ編集マリガン確率で共有）
 */

/**
 * 山札 n 枚のうち対象が fc 枚あるとき、ランダムな並びで上から続けて k 枚に
 * 対象が1枚以上含まれる確率（％・非復元抽出）
 * @param {number} n
 * @param {number} k
 * @param {number} favorableInDeck
 * @returns {number}
 */
export function probAtLeastOneInNextK(n, k, favorableInDeck) {
  if (n <= 0 || k <= 0 || favorableInDeck <= 0) return 0;
  if (k > n) k = n;
  var fc = Math.min(favorableInDeck, n);
  if (k > n - fc) return 100;
  var pNone = 1;
  for (var i = 0; i < k; i++) {
    pNone *= (n - fc - i) / (n - i);
  }
  return 100 * (1 - pNone);
}

/**
 * @param {number} rate100
 * @returns {string}
 */
export function formatPctFromRate(rate100) {
  if (!Number.isFinite(rate100)) return "0";
  var s = rate100.toFixed(1);
  if (s.indexOf(".0") === s.length - 2) s = s.slice(0, -2);
  return s;
}

/**
 * 確率（％）→ グリッドセル用クラス（10％ごとに色相／75％以上は発光）
 * @param {number} rate
 * @returns {string}
 */
export function deckOddsCellTierClass(rate) {
  if (!Number.isFinite(rate)) return "";
  var b = Math.max(0, Math.min(9, Math.floor(rate / 10)));
  var cls = "deck-odds-cell--b" + b;
  if (rate >= 75) cls += " deck-odds-cell--hot-glow";
  return cls;
}

/**
 * デッキ編集マリガン確率の累積 k（「該当があれば残す」前提）
 *
 * 開幕6枚に対象があれば残す。無ければ最大6枚戻して引き直し。
 * これは山札上から見て「先頭 6+6=12 枚に1枚以上」と同値。
 * 以降: 1T開始 +turnDraw、各ターン開始ごとに +(livePlayMax+turnDraw)。
 *
 * @param {{ mulliganMax?: number, livePlayMax?: number, turnDraw?: number }} [opts]
 * @returns {{ mulliganEnd: number, t1Start: number, t2Start: number, t3Start: number }}
 */
export function mulliganOddsCumulativeKs(opts) {
  var o = opts || {};
  var mulliganMax = Math.max(0, Math.floor(Number(o.mulliganMax != null ? o.mulliganMax : 6)));
  var livePlayMax = Math.max(0, Math.floor(Number(o.livePlayMax != null ? o.livePlayMax : 3)));
  var turnDraw = Math.max(0, Math.floor(Number(o.turnDraw != null ? o.turnDraw : 1)));
  var perTurn = livePlayMax + turnDraw;
  // 開幕 mulliganMax + 外した場合の引き直し mulliganMax
  var mulliganEnd = mulliganMax + mulliganMax;
  var t1Start = mulliganEnd + turnDraw;
  var t2Start = t1Start + perTurn;
  var t3Start = t2Start + perTurn;
  return { mulliganEnd: mulliganEnd, t1Start: t1Start, t2Start: t2Start, t3Start: t3Start };
}
