#!/usr/bin/env node
/**
 * complex-risky-cards.md 掲載カード（リスクスコア >= 6）の一括コード監査。
 * 既知の分類バグパターンと composition 退行を検出する。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyCardAbility,
  cardAbilityRawText,
  splitAbilityByTriggers,
} from "../js/abilityEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");
const jidouSrc = fs.readFileSync(path.join(ROOT, "js/jidouAutoEffects.js"), "utf8");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const md = fs.readFileSync(path.join(ROOT, "docs/complex-risky-cards.md"), "utf8");

/** @returns {string[]} */
function riskyCardIdsFromMarkdown() {
  /** @type {string[]} */
  const ids = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^\| (\d+) \| ([^|]+) \|/);
    if (m) ids.push(m[2].trim());
  }
  return ids;
}

/** @param {string} tpl */
function hasHandler(tpl) {
  if (!tpl || tpl === "passive_track" || tpl === "ability_sequence") return true;
  if (simSrc.includes(`cl.template === "${tpl}"`)) return true;
  if (jidouSrc.includes(`"${tpl}"`)) return true;
  return false;
}

/** @param {string} id @param {string} trigger @param {string} segRaw @param {string} plain @param {import('../js/abilityEffects.js').ClassifiedAbility} cl */
function scanKnownPatterns(id, trigger, segRaw, plain, cl) {
  /** @type {string[]} */
  const errs = [];
  if (cl.template === "guided_manual") errs.push("guided_manual");
  if (!hasHandler(cl.template)) errs.push(`handler missing: ${cl.template}`);

  if (/1枚ある場合/.test(plain) && /2枚以上/.test(plain) && cl.filters?.minSuccessLiveCount > 1) {
    errs.push("tiered minSuccessLiveCount should be 1");
  }
  if (cl.template === "draw_then_hand_discard" && /余剰ハート/.test(plain) && cl.minSurplusHearts == null) {
    errs.push("draw_then_hand_discard missing minSurplusHearts");
  }
  if (cl.template === "ability_pick_one" && trigger === "live_start" && cl.filters?.minSuccessLiveCount != null) {
    errs.push(`ability_pick_one minSuccessLiveCount leak: ${cl.filters.minSuccessLiveCount}`);
  }
  if (
    /自分か相手の成功ライブ/.test(plain) &&
    cl.filters?.minSuccessLiveCount != null &&
    cl.preconditionFilters?.minEitherSuccessLiveCount == null &&
    cl.filters?.minEitherSuccessLiveCount == null
  ) {
    errs.push("either success live uses minSuccessLiveCount");
  }

  const core = classifyCardAbility(
    cards[id],
    /** @type {import('../js/abilityEffects.js').AbilityTrigger} */ (trigger),
    segRaw,
    { skipCompose: true },
  );
  if (
    core.template !== cl.template &&
    core.template !== "guided_manual" &&
    cl.template !== "ability_sequence" &&
    !(cl.template === "draw_then_hand_discard" && core.template === "grant_jouji_session")
  ) {
    errs.push(`composition regression: core=${core.template} full=${cl.template}`);
  }

  if (/その後/.test(plain) && /エネルギー/.test(plain) && cl.template === "live_card_score_plus") {
    errs.push("sequential energy+score misclassified as live_card_score_plus");
  }

  return errs;
}

let failed = 0;
const ids = riskyCardIdsFromMarkdown();

for (const id of ids) {
  const card = cards[id];
  if (!card) {
    failed++;
    console.error("MISSING", id);
    continue;
  }
  for (const seg of splitAbilityByTriggers(cardAbilityRawText(card))) {
    if (!seg.trigger) continue;
    const cl = classifyCardAbility(card, seg.trigger, seg.text);
    const plain = seg.text.replace(/\{\{[^}]+\}\}/g, "");
    const errs = scanKnownPatterns(id, seg.trigger, seg.text, plain, cl);
    if (errs.length) {
      failed++;
      console.error("FAIL", id, seg.trigger, errs.join("; "));
    }
  }
}

if (failed) {
  console.error(`\n${failed} complex-risky batch check(s) failed`);
  process.exit(1);
}
console.log(`All ${ids.length} complex-risky cards passed batch audit`);
