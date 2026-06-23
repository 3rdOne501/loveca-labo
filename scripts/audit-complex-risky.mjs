#!/usr/bin/env node
/**
 * 効果が複雑で「処理が間違っている可能性が高い」カードを抽出する（読み取り専用・分析のみ）。
 *
 * リスクの観点:
 *  - guided_manual に落ちている（＝自動処理されず手動頼み）
 *  - 複合効果（1トリガー内に複数の動作 = 句点が多い／「その後」「さらに」等）
 *  - 相手依存（ソロでは相手盤面が無く近似入力）
 *  - 条件分岐（「場合」「以上」「同じ」「より高い／少ない」等）
 *  - 選択・任意（プレイヤー選択 / 「〜してもよい」分岐）
 *  - エール公開・解決参照（確率的・状態依存）
 *  - 置換・代わり（「代わりに」）
 *
 * 使い方: node scripts/audit-complex-risky.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyCardAbility,
  splitAbilityByTriggers,
  cardAbilityRawText,
  abilityEffectIsAutomated,
} from "../js/abilityEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadCards() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "cards.json"), "utf8"));
}

function plain(seg) {
  return String(seg || "").replace(/\{\{[^}]*\}\}/g, "");
}

/** セグメント本文からリスク要因を判定し、スコアと理由を返す */
function riskOf(card, trig, tmpl) {
  const raw = cardAbilityRawText(card);
  const segObj = splitAbilityByTriggers(raw).find((s) => s.trigger === trig) || {};
  const t = plain(segObj.text || "");
  const reasons = [];
  let score = 0;

  const automated = (() => {
    try {
      return abilityEffectIsAutomated(tmpl);
    } catch (_) {
      return false;
    }
  })();

  if (tmpl === "guided_manual") {
    reasons.push("guided_manual(自動処理なし)");
    score += 5;
  }
  if (tmpl === "ability_sequence") {
    reasons.push("ability_sequence(複合連結)");
    score += 2;
  }

  // 複合効果: 句点(。)の数 / 接続詞
  const periods = (t.match(/。/g) || []).length;
  if (periods >= 3) {
    reasons.push(`多段効果(。x${periods})`);
    score += 2;
  } else if (periods === 2) {
    reasons.push("2段効果");
    score += 1;
  }
  if (/その後|さらに|続けて/.test(t)) {
    reasons.push("逐次(その後/さらに)");
    score += 1;
  }

  // 相手依存
  if (/相手/.test(t)) {
    reasons.push("相手参照");
    score += 2;
  }

  // 条件分岐
  const condHits = [];
  if (/場合/.test(t)) condHits.push("場合");
  if (/かぎり|限り/.test(t)) condHits.push("かぎり");
  if (/より高い|より低い|より多い|より少ない/.test(t)) condHits.push("比較");
  if (/同じ/.test(t)) condHits.push("同点/同値");
  if (/以上|以下/.test(t)) condHits.push("閾値");
  if (condHits.length) {
    reasons.push("条件:" + condHits.join(","));
    score += Math.min(2, condHits.length);
  }

  // 選択・任意
  if (/を選ぶ|から1人|から1枚|のうち/.test(t)) {
    reasons.push("選択");
    score += 1;
  }
  if (/自分か相手|プレイヤーを選/.test(t)) {
    reasons.push("プレイヤー選択");
    score += 2;
  }

  // エール公開・解決参照
  if (/エールにより公開|エールによって公開/.test(t)) {
    reasons.push("エール公開参照");
    score += 2;
  }

  // 置換・代わり
  if (/代わりに/.test(t)) {
    reasons.push("置換(代わりに)");
    score += 2;
  }

  // 無効化
  if (/無効/.test(t)) {
    reasons.push("無効化");
    score += 1;
  }

  // 文章が長い
  if (t.length >= 80) {
    reasons.push(`長文(${t.length}字)`);
    score += 1;
  }

  // guided_manual ではないが automated でもない（none 等）
  if (!automated && tmpl !== "guided_manual" && tmpl !== "passive_track") {
    reasons.push(`非自動(${tmpl})`);
    score += 3;
  }

  return { score, reasons, text: t, tmpl, automated };
}

/** テンプレートが効果の一部を取りこぼしている疑いを検出 */
function dropSuspicion(text, tmpl, trig, cl) {
  const flags = [];
  const filters = cl && cl.filters ? cl.filters : {};
  const hasGrantMeta =
    cl &&
    (cl.grantToCenterMember ||
      cl.grantToNamedStageMember ||
      cl.grantToStageSeriesTag ||
      cl.grantPickStageMembersMax ||
      cl.grantToConditionalAreaMember ||
      cl.grantAllHeartCount ||
      cl.requiredHeartSlot ||
      cl.liveScoreGrant ||
      cl.minStageEntriesThisTurn ||
      cl.grantFollowupMinSelfPrintedCost ||
      cl.discardFollowupCharacterName);
  const hasConditionFilters = Object.keys(filters).some((k) => {
    const v = filters[k];
    if (v == null || v === false) return false;
    if (Array.isArray(v) && !v.length) return false;
    return true;
  });
  // 逐次効果（その後/さらに）なのに単一動作テンプレート
  const SINGLE = /_pick_recover$|_score_plus$|_score_grant$|^draw_from_deck$|^blade_gain_only$|^grant_jouji_session$|_energy_wait$/;
  if (/その後|さらに|続けて/.test(text) && SINGLE.test(tmpl)) {
    flags.push("逐次効果の後半を取りこぼす疑い");
  }
  // 相手をウェイト/操作する文言があるのに、相手非依存テンプレート
  if (/相手.{0,12}(ウェイト|アクティブ|控え室|デッキ|引)/.test(text) && !/opp|opponent|both_players/i.test(tmpl)) {
    flags.push("相手への作用が未処理の疑い");
  }
  // 「代わりに」置換なのに passive_track / 単純テンプレート
  if (/代わりに/.test(text) && (tmpl === "passive_track" || SINGLE.test(tmpl))) {
    flags.push("置換(代わりに)が未処理の疑い");
  }
  // 条件付きスコア化なのに無条件 grant 系
  if (
    /場合/.test(text) &&
    tmpl === "grant_jouji_session" &&
    /(高い|低い|多い|少ない|合計|以上|以下)/.test(text) &&
    !hasConditionFilters &&
    !hasGrantMeta
  ) {
    flags.push("条件分岐を無視して付与する疑い");
  }
  // jouji passive_track で複雑な条件付き付与（joujiEffects 近似）
  if (trig === "jouji" && tmpl === "passive_track" && /場合/.test(text) && text.length >= 60) {
    flags.push("常時の条件付き付与を近似処理の疑い");
  }
  return flags;
}

function main() {
  const cards = loadCards();
  const ids = Object.keys(cards);
  const rows = [];

  for (const id of ids) {
    const card = cards[id];
    const raw = cardAbilityRawText(card);
    if (!raw) continue;
    const segs = splitAbilityByTriggers(raw).filter((s) => s.trigger);
    const trigs = [...new Set(segs.map((s) => s.trigger))];
    if (!trigs.length) continue;

    let total = 0;
    const perTrig = [];
    const drops = [];
    for (const trig of trigs) {
      let cl;
      try {
        cl = classifyCardAbility(card, trig);
      } catch (e) {
        cl = { template: "ERROR:" + e.message };
      }
      const r = riskOf(card, trig, cl && cl.template);
      total += r.score;
      perTrig.push({ trig, ...r });
      const ds = dropSuspicion(r.text, r.tmpl, trig, cl);
      ds.forEach((d) => drops.push(`${trig}:${d}`));
    }

    // 複数トリガー自体も複雑さ
    if (trigs.length >= 2) total += 1;
    // 取りこぼし疑いは強く加点
    total += drops.length * 3;

    rows.push({
      id,
      name: card.name || "",
      type: card.type || "",
      ability: plain(raw),
      total,
      trigs: trigs.length,
      perTrig,
      drops,
    });
  }

  // 能力テキストで重複排除（バリアント -P/-P＋/-SEC 等をまとめる）
  const byAbility = new Map();
  for (const r of rows) {
    const key = r.name + "||" + r.ability;
    if (!byAbility.has(key)) byAbility.set(key, { ...r, variants: [r.id] });
    else byAbility.get(key).variants.push(r.id);
  }
  const deduped = [...byAbility.values()];
  deduped.sort((a, b) => b.total - a.total);
  rows.length = 0;
  rows.push(...deduped);

  const THRESHOLD = Number(process.env.RISK_MIN || 6);
  const risky = rows.filter((r) => r.total >= THRESHOLD);
  const dropRisk = rows.filter((r) => r.drops.length > 0);

  console.log("=== COMPLEX / RISKY CARDS (deduped by ability) ===");
  console.log("unique abilities       :", rows.length);
  console.log("risk>=" + THRESHOLD + "            :", risky.length);
  console.log("取りこぼし疑いあり      :", dropRisk.length);
  console.log("");

  function tmplLine(r) {
    return r.perTrig.map((p) => `${p.trig}=${p.tmpl}`).join(", ");
  }

  // Markdown 出力
  let md = "# 効果が複雑・処理ミスの可能性が高いカード\n\n";
  md += `（能力テキストで重複排除。-P/-P＋/-SEC 等のバリアントは代表1枚に集約）\n\n`;
  md += `- ユニーク能力: ${rows.length}\n`;
  md += `- リスクスコア >= ${THRESHOLD}: ${risky.length} 件\n`;
  md += `- 取りこぼし疑い: ${dropRisk.length} 件\n\n`;

  md += "## A. テンプレートが効果の一部を取りこぼしている疑い（最優先）\n\n";
  dropRisk.sort((a, b) => b.drops.length - a.drops.length || b.total - a.total);
  dropRisk.forEach((r, i) => {
    md += `### ${i + 1}. ${r.id}${r.variants.length > 1 ? ` ほか${r.variants.length - 1}種` : ""} — ${r.name}\n\n`;
    md += `- 分類: ${tmplLine(r)}\n`;
    md += `- 疑い: ${r.drops.join(" / ")}\n`;
    md += `- 本文: ${r.ability}\n\n`;
  });

  md += "## B. リスクスコア順（複雑カード全般）\n\n";
  md += "| # | 代表カード | 名前 | 種別 | スコア | 分類 | 主因 |\n";
  md += "|---|-----------|------|------|--------|------|------|\n";
  risky.forEach((r, i) => {
    const reasons = [
      ...new Set(r.perTrig.flatMap((p) => p.reasons.map((x) => `${x}`))),
    ];
    md += `| ${i + 1} | ${r.id} | ${r.name} | ${r.type} | ${r.total} | ${tmplLine(r)} | ${reasons.join(",")} |\n`;
  });

  const outPath = path.join(ROOT, "docs", "complex-risky-cards.md");
  fs.writeFileSync(outPath, md);
  console.log("written:", path.relative(ROOT, outPath));

  console.log("\n--- A. 取りこぼし疑い（上位25・代表カード） ---");
  dropRisk.slice(0, 25).forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(2)}. ${r.id} ${r.name}\n    分類: ${tmplLine(r)}\n    疑い: ${r.drops.join(" / ")}`,
    );
  });
}

main();
