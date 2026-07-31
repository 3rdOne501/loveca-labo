/**
 * @param {{ cardNos: string[], bug: string, note?: string, discordMeta?: { channelId?: string, messageId?: string, authorTag?: string } }} report
 */
export function buildFixAgentPrompt(report) {
  const cards = report.cardNos.join(", ");
  const note = (report.note || "").trim();
  const meta = report.discordMeta || {};

  return [
    "あなたは Love Live TCG シミュレータ（ll-ocg-tools / loveca-labo）のカード効果修正エージェントです。",
    "",
    "## Discord からの修正指示",
    `カード番号: ${cards}`,
    `バグ内容: ${report.bug}`,
    note ? `追記: ${note}` : null,
    meta.authorTag ? `報告者: ${meta.authorTag}` : null,
    meta.messageId ? `Discord messageId: ${meta.messageId}` : null,
    "",
    "## 絶対ルール",
    "1. 正本は data/cards.json の ability 全文。必ず開いて読む（テンプレ名・備考のコピー禁止）。",
    "2. classifyCardAbility → 根因特定 → data/cards.json 全体で同型検索 → 分類器(js/abilityEffects.js)または共通ハンドラで横展開。",
    "3. card_no 個別分岐は最後の手段。",
    "4. コミット・push・PR 作成は禁止。Git 操作は Discord Bot が後段で行う。",
    "5. js/abilityEffects.js / js/simulator.js / js/abilityRuntimeMeta.js を変えたら LovecaSimulator.app/Contents/Resources/www/js/ に同期。",
    "6. 総合ルール ver.1.06（docs/rules）とカード文を照合。実行不能は可能な限り実行（1.3.2）。",
    "",
    "## 必須手順",
    "1. READ 各カードの ability",
    "2. CLASSIFY node で template/filters 確認",
    "3. ROOT 根因パターン特定",
    "4. SEARCH 同型テキスト・同型分類",
    "5. FIX 横展開",
    "6. VERIFY:",
    "   - node scripts/verify-ability-coverage.mjs",
    "   - node scripts/verify-deck-pick-hand-patterns.mjs",
    "   - 必要なら該当商品の verify-*.mjs",
    "7. RECORD data/fix-notes/fixed-cards-registry.md（代表カード＋横展開件数）",
    "8. REPORT 指示カード以外に直したカード・横展開件数を含めて日本語で要約",
    "",
    "## 完了報告フォーマット（Discord 向け・短く）",
    "- 対象カードと結果（修正 / 再現せず / 要確認）",
    "- 根因 1 行",
    "- 横展開（ID 列挙と件数）",
    "- verify 結果",
    "- 変更ファイル一覧",
    "",
    "上記の指示どおり修正を実行してください。",
  ]
    .filter((line) => line != null)
    .join("\n");
}
