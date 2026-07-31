/**
 * Discord 受付フォーマット:
 *
 * カード番号：
 * バグ内容：
 * 追記（あれば）：
 */

const FIELD_CARD = /カード番号[：:]\s*/;
const FIELD_BUG = /バグ内容[：:]\s*/;
const FIELD_NOTE = /追記(?:（あれば）)?[：:]\s*/;

/**
 * @param {string} raw
 * @returns {{ ok: true, cardNos: string[], bug: string, note: string } | { ok: false, reason: string }}
 */
export function parseBugReport(raw) {
  const text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!text) return { ok: false, reason: "空メッセージです" };

  const cardIdx = text.search(FIELD_CARD);
  const bugIdx = text.search(FIELD_BUG);
  if (cardIdx < 0 || bugIdx < 0) {
    return {
      ok: false,
      reason: "「カード番号：」「バグ内容：」を含むテンプレで送ってください",
    };
  }

  const noteIdx = text.search(FIELD_NOTE);
  const afterCard = text.slice(cardIdx).replace(FIELD_CARD, "");
  const cardEndRel =
    afterCard.search(FIELD_BUG) >= 0
      ? afterCard.search(FIELD_BUG)
      : afterCard.length;
  const cardBlock = afterCard.slice(0, cardEndRel).trim();

  const afterBug = text.slice(bugIdx).replace(FIELD_BUG, "");
  let bugBlock;
  let noteBlock = "";
  if (noteIdx > bugIdx) {
    const noteRel = afterBug.search(FIELD_NOTE);
    bugBlock = (noteRel >= 0 ? afterBug.slice(0, noteRel) : afterBug).trim();
    noteBlock = text.slice(noteIdx).replace(FIELD_NOTE, "").trim();
  } else {
    bugBlock = afterBug.trim();
  }

  const cardNos = splitCardNos(cardBlock);
  if (!cardNos.length) {
    return { ok: false, reason: "カード番号が空です" };
  }
  if (!bugBlock) {
    return { ok: false, reason: "バグ内容が空です" };
  }

  return { ok: true, cardNos, bug: bugBlock, note: noteBlock };
}

/**
 * @param {string} block
 * @returns {string[]}
 */
function splitCardNos(block) {
  return String(block || "")
    .split(/[\n,、]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^カード番号/.test(s));
}

/**
 * テンプレっぽいメッセージか（厳密パース前の軽い判定）
 * @param {string} raw
 */
export function looksLikeBugReport(raw) {
  const t = String(raw || "");
  return FIELD_CARD.test(t) && FIELD_BUG.test(t);
}
