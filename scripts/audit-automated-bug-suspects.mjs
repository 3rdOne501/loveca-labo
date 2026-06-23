#!/usr/bin/env node
/**
 * 自動化済みだがバグ残存が疑われるカード（分類・ハンドラ・テキストの不整合）。
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
import { classifyJoujiSegment } from "../js/joujiEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

function plain(seg) {
  return String(seg || "").replace(/\{\{[^}]*\}\}/g, "");
}

/** @type {Array<object>} */
const suspects = [];

for (const id of Object.keys(cards)) {
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  if (!raw) continue;
  const segs = splitAbilityByTriggers(raw).filter((s) => s.trigger);

  for (const seg of segs) {
    const trig = seg.trigger;
    const text = plain(seg.text);
    let cl;
    try {
      cl = classifyCardAbility(card, trig);
    } catch (e) {
      suspects.push({ id, name: card.name, trig, issue: "classify_error", detail: e.message, score: 5 });
      continue;
    }
    const tmpl = cl && cl.template;
    if (!tmpl || tmpl === "none") continue;

    /** @type {string[]} */
    const issues = [];
    let score = 0;

    if (tmpl === "guided_manual") {
      issues.push("未自動化(guided_manual)");
      score += 5;
    }
    if (tmpl === "grant_jouji_session" && /場合/.test(text) && text.length > 80) {
      if (cl.grantToSameNameAsDiscardedMember) {
        /* 百生吟子 live_start: 捨て札同名メンバーへ付与 — grant_jouji_session で処理 */
      } else {
        issues.push("grant_jouji条件付き(近似リスク)");
        score += 3;
      }
    }
    if (tmpl === "ability_sequence") {
      issues.push("複合連結(途中失敗リスク)");
      score += 2;
    }
    if (tmpl === "passive_track" && trig === "jouji") {
      const rule = classifyJoujiSegment(seg.text);
      const implementedJouji =
        rule &&
        (rule.kind === "extra_series_tags_all_zones" ||
          rule.kind === "block_stage_member_live_start" ||
          rule.kind === "cannot_place_on_success_live" ||
          rule.kind === "success_live_self_score_if_series_on_stage");
      if (!rule) {
        issues.push("jouji未解析(passive_track)");
        score += 4;
      } else if (!implementedJouji && /代わりに/.test(text) && rule.kind !== "stage_all_areas_grant_quoted") {
        issues.push(`jouji代わりに→${rule.kind}`);
        score += 3;
      }
      if (
        !implementedJouji &&
        /エールにより公開/.test(text) &&
        rule &&
        rule.kind === "stage_all_areas_series_distinct_score"
      ) {
        issues.push("エール条件が常時スコア直付与の疑い");
        score += 4;
      }
    }
    if (/自分と相手はそれぞれ/.test(text) && !/both_|toujou_both|_both_/.test(tmpl)) {
      issues.push(`双方効果だがtmpl=${tmpl}`);
      score += 4;
    }
    if (/相手に.*聞/.test(text) && !/opp_|answer|decline|emma|love_screem/.test(tmpl)) {
      issues.push("相手回答UI未専用化");
      score += 3;
    }
    if (/置換|代わりに/.test(text) && /成功ライブカード置き場/.test(text) && tmpl === "passive_track") {
      issues.push("成功ライブ代置はplaceLive経由要確認");
      score += 2;
    }

    if (issues.length) {
      suspects.push({
        id,
        name: card.name,
        trig,
        tmpl,
        issues,
        score,
        text: text.slice(0, 100),
      });
    }
  }
}

suspects.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

const byAbility = new Map();
for (const s of suspects) {
  const k = `${s.name}||${s.issues.join("|")}||${s.tmpl}`;
  if (!byAbility.has(k)) byAbility.set(k, { ...s, variants: [s.id] });
  else byAbility.get(k).variants.push(s.id);
}
const deduped = [...byAbility.values()];

console.log("=== AUTOMATED BUG SUSPECTS ===");
console.log("unique:", deduped.length);
deduped.slice(0, 35).forEach((s, i) => {
  console.log(`${i + 1}. [${s.score}] ${s.id} ${s.name} (${s.trig}=${s.tmpl})`);
  console.log(`   ${s.issues.join(" / ")}`);
});
if (deduped.length > 35) console.log(`... +${deduped.length - 35} more`);

fs.writeFileSync(
  path.join(ROOT, "docs/automated-bug-suspects.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), count: deduped.length, rows: deduped }, null, 2),
);
console.log("\nwritten: docs/automated-bug-suspects.json");
