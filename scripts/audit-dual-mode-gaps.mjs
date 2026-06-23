#!/usr/bin/env node
/**
 * 自動化済み能力のうち、相手参照があり対戦（デュアル盤）で手動フォールバックが残る疑いを列挙。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

function sectionBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return src.slice(start, end);
}

const executeBody = sectionBetween(
  simSrc,
  "function executeAbilityBody(inst, cl, kind, finishResolved, finishGuided)",
  "\n  function removeStageMemberToWaiting(memberInst)",
);

/** @type {Map<string, string>} */
const handlerByTemplate = new Map();
const re = /if \(cl\.template === "([a-z0-9_]+)"\)/g;
let m;
while ((m = re.exec(executeBody))) {
  const tmpl = m[1];
  const slice = executeBody.slice(m.index, m.index + 8000);
  const next = slice.search(/\n    if \(cl\.template === "/);
  handlerByTemplate.set(tmpl, next > 0 ? slice.slice(0, next) : slice);
}

function plain(seg) {
  return String(seg || "").replace(/\{\{[^}]*\}\}/g, "");
}

const DUAL_DELEGATE_HELPERS = [
  "openSoloOpponentMemberWaitPickDialog",
  "openSoloOpponentMemberWaitPickMultiDialog",
  "mutateInactiveOpponentBoard",
  "readInactiveOpponentBoard",
];

function dualScore(handler) {
  if (!handler) return { dual: false, soloManual: false, dualMutate: false, soloPrompt: false };
  var delegatesDual = DUAL_DELEGATE_HELPERS.some(function (fn) {
    return handler.indexOf(fn) >= 0;
  });
  return {
    dual: /isDualOpponentBoardMode/.test(handler),
    soloManual: /手動/.test(handler),
    dualMutate: delegatesDual || /mutateInactiveOpponentBoard|readInactiveOpponentBoard|openOpponent/.test(handler),
    soloPrompt: /window\.(prompt|confirm)|soloOpponent/.test(handler),
  };
}

const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
/** @type {Array<object>} */
const rows = [];

for (const id of Object.keys(cards)) {
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw) continue;
  const segs = splitAbilityByTriggers(raw).filter((s) => s.trigger);
  for (const seg of segs) {
    const trig = seg.trigger;
    let cl;
    try {
      cl = classifyCardAbility(card, trig);
    } catch (_) {
      continue;
    }
    const tmpl = cl && cl.template;
    if (!tmpl || tmpl === "none" || tmpl === "guided_manual") continue;
    if (!abilityEffectIsAutomated(tmpl) && tmpl !== "passive_track" && tmpl !== "ability_sequence") continue;

    const text = plain(seg.text);
    if (!/相手/.test(text)) continue;

    const handler = handlerByTemplate.get(tmpl) || "";
    const ds = dualScore(handler);
    const flags = [];
    if (tmpl === "passive_track") flags.push("passive_track(実行時ハンドラなし)");
    if (!handler && tmpl !== "passive_track") flags.push("handler未検出");
    if (ds.soloManual) flags.push("手動トースト");
    if (ds.soloPrompt && !ds.dualMutate) flags.push("ソロ入力のみ");
    if (!ds.dual && !ds.dualMutate && tmpl !== "passive_track") flags.push("デュアル分岐なし");
    if (ds.dual && ds.soloManual) flags.push("デュアル+ソロ手動併存");

    const risk =
      (flags.includes("ソロ入力のみ") ? 4 : 0) +
      (flags.includes("手動トースト") ? 3 : 0) +
      (flags.includes("デュアル分岐なし") && tmpl !== "passive_track" ? 2 : 0) +
      (flags.includes("passive_track(実行時ハンドラなし)") ? 1 : 0);

    if (risk < 2) continue;

    rows.push({
      id,
      name: card.name,
      trig,
      tmpl,
      risk,
      flags,
      text: text.slice(0, 120),
    });
  }
}

rows.sort((a, b) => b.risk - a.risk || a.id.localeCompare(b.id));

const byKey = new Map();
for (const r of rows) {
  const k = `${r.name}||${r.trig}||${r.tmpl}||${r.flags.join(",")}`;
  if (!byKey.has(k)) byKey.set(k, { ...r, variants: [r.id] });
  else byKey.get(k).variants.push(r.id);
}
const deduped = [...byKey.values()];

console.log("=== DUAL-MODE GAP AUDIT (automated + 相手参照) ===");
console.log("候補:", deduped.length);
console.log("");
deduped.slice(0, 40).forEach((r, i) => {
  console.log(
    `${i + 1}. [${r.risk}] ${r.id}${r.variants.length > 1 ? ` +${r.variants.length - 1}` : ""} ${r.name}`,
  );
  console.log(`   ${r.trig}=${r.tmpl} | ${r.flags.join(" / ")}`);
});
if (deduped.length > 40) console.log(`... +${deduped.length - 40} more`);

fs.writeFileSync(
  path.join(ROOT, "docs/dual-mode-gap-audit.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: deduped.length, rows: deduped }, null, 2),
);
console.log("\nwritten: docs/dual-mode-gap-audit.json");
