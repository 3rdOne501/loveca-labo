#!/usr/bin/env node
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditAbilityCatalog, discoverAbilityHandlers, updateSemanticAuditHandoff, validateSemanticContracts } from "./lib/ability-semantic-audit.mjs";

function writeAtomic(file, content) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(temporary, content, { flag: "wx" });
  try { fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function main() {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const argv = process.argv.slice(2);
  const ids = new Set();
  let outDir = path.join(ROOT, "docs");
  let check = false;
  let strict = false;
  let json = false;
  let noWrite = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") check = true;
    else if (arg === "--strict") { strict = true; check = true; }
    else if (arg === "--json") { json = true; noWrite = true; }
    else if (arg === "--no-write") noWrite = true;
    else if (arg === "--card" && argv[i + 1]) ids.add(argv[++i]);
    else if (arg === "--out-dir" && argv[i + 1]) outDir = path.resolve(argv[++i]);
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }

  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
  for (const id of ids) if (!catalog[id]) throw new Error(`Card not found: ${id}`);
  const contracts = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ability-semantic-contracts.json"), "utf8"));
  validateSemanticContracts(contracts);
  const sourceFiles = ["js/simulator.js"];
  const handlers = discoverAbilityHandlers(sourceFiles.map((name) => fs.readFileSync(path.join(ROOT, name), "utf8")));
  const report = auditAbilityCatalog(catalog, contracts, { handlers, ...(ids.size ? { cardIds: ids } : {}) });
  report.generated_at = new Date().toISOString();
  report.inputs = ["data/cards.json", "data/ability-semantic-contracts.json", "js/abilityEffects.js", "js/abilityCompletion.js", "js/versusEffectPatch.js", "js/opponentBoard.js", "js/jidouAutoEffects.js", "js/joujiEffects.js", "js/abilityComposition.js", "js/abilityRuntimeMeta.js", "js/cardGroups.js", "scripts/lib/ability-semantic-audit.mjs", "scripts/audit-ability-semantics.mjs", ...sourceFiles];
  report.input_sha256 = Object.fromEntries(report.inputs.map((name) => [name, createHash("sha256").update(fs.readFileSync(path.join(ROOT, name))).digest("hex")]));

  function cell(value) { return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " "); }
  function markdownReport(value) {
    const s = value.summary;
    const lines = ["# カード能力・処理要素の静的照合レポート", "", `生成: ${value.generated_at}`, `対象: ${value.scope} / ${s.cards}枚・${s.segments}能力セグメント`, "", value.limitation, "", "| 状態 | セグメント数 |", "|---|---:|", ...Object.entries(s.statuses).map(([key, n]) => `| ${key} | ${n} |`), "", "## 指摘一覧（同じ能力文・分類・指摘はレアリティ違いをまとめる）", "", "疑いは実装不良の確定ではない。カード文と実ハンドラを読んで確認し、修正後に再監査する。", ""];
    const groups = new Map();
    for (const record of value.records.filter((r) => r.issues.length)) {
      const key = JSON.stringify([record.trigger, record.template, record.text, record.issues]);
      if (!groups.has(key)) groups.set(key, { ...record, variants: [] });
      groups.get(key).variants.push(record.card_no);
    }
    const ranks = { unimplemented: 0, suspect: 1, needs_review: 2 };
    const ordered = [...groups.values()].sort((a, b) => ranks[a.status] - ranks[b.status] || a.card_no.localeCompare(b.card_no));
    if (!ordered.length) lines.push("指摘なし。ただし静的な既知ルールのみの結果で、実プレイの動作保証ではない。");
    for (const g of ordered.filter((g) => value.scope !== "full_catalog" || g.status !== "needs_review")) {
      lines.push(`### ${cell(g.card_no)} ${cell(g.name)} — ${g.status}`, "", `- 同型: ${g.variants.map(cell).join(", ")}`, `- 発動: ${g.trigger} / 分類: ${g.template}`, `- カード文: ${cell(g.text)}`, "", "| 指摘 | 処理要素 | 根拠の文言 |", "|---|---|---|");
      for (const issue of g.issues) lines.push(`| ${cell(issue.code)}: ${cell(issue.message)} | ${cell(issue.kind)} | ${cell(issue.evidence)} |`);
      lines.push("");
    }
    if (value.scope === "full_catalog") {
      const reviewByTemplate = new Map();
      for (const record of value.records.filter((r) => r.status === "needs_review")) {
        if (!reviewByTemplate.has(record.template)) reviewByTemplate.set(record.template, { segments: 0, ids: new Set() });
        const group = reviewByTemplate.get(record.template); group.segments++; group.ids.add(record.card_no);
      }
      lines.push("## 要確認の集計", "", "未登録の契約・未知の文言等の要確認は、バグと断定せずテンプレート別に集計する。各行のカードIDは最大4例。全件のカード文・要求・指摘はJSONのrecordsにあり、単一カードの --card 監査でも詳細を出せる。", "", "| 分類 | セグメント数 | カード数 | カードID例 |", "|---|---:|---:|---|");
      for (const [template, g] of [...reviewByTemplate].sort((a, b) => b[1].segments - a[1].segments)) lines.push(`| ${cell(template)} | ${g.segments} | ${g.ids.size} | ${[...g.ids].slice(0, 4).map(cell).join(", ")} |`);
    }
    return lines.join("\n") + "\n";
  }

  if (!noWrite) {
    fs.mkdirSync(outDir, { recursive: true });
    // A scoped run must never overwrite a full-catalog report or its handoff summary.
    const basename = ids.size ? "ability-semantic-audit-scoped" : "ability-semantic-audit";
    writeAtomic(path.join(outDir, `${basename}.json`), JSON.stringify(report, null, 2) + "\n");
    writeAtomic(path.join(outDir, `${basename}.md`), markdownReport(report));
    const handoffPath = path.join(ROOT, "docs/HANDOFF.md");
    if (!ids.size && outDir === path.join(ROOT, "docs")) {
      if (!fs.existsSync(handoffPath)) throw new Error("docs/HANDOFF.md is missing; create the shared handoff before treating this audit as complete");
      const old = fs.readFileSync(handoffPath, "utf8");
      const updated = updateSemanticAuditHandoff(old, report);
      if (fs.readFileSync(handoffPath, "utf8") !== old) throw new Error("HANDOFF.md changed concurrently; rerun the audit to preserve the other editor's changes");
      writeAtomic(handoffPath, updated);
    }
  }
  if (json) console.log(JSON.stringify(report));
  else console.log(`ability-semantic-audit: cards=${report.summary.cards} segments=${report.summary.segments} ${JSON.stringify(report.summary.statuses)}${noWrite ? " (read-only)" : " (reports written)"}`);
  if (check && (report.summary.statuses.unimplemented || report.summary.statuses.suspect || (strict && report.summary.statuses.needs_review))) process.exitCode = 1;

}

try { main(); } catch (err) { console.error(`ability-semantic-audit failed: ${err.message || err}`); process.exitCode = 2; }
