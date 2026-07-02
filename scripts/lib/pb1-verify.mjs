/** pb1 各スクール共通: 代表カード分類ケース生成・実行 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  abilityEffectIsAutomated,
  cardAbilityRawText,
  classifyCardAbility,
  splitAbilityByTriggers,
} from "../../js/abilityEffects.js";
import { classifyJoujiSegment } from "../../js/joujiEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));

/** @param {string} prefix */
export function buildPb1Cases(prefix) {
  /** @type {Map<string, string>} */
  const reps = new Map();
  for (const [id, card] of Object.entries(cards)) {
    if (!id.startsWith(prefix) || card.type === "エネルギー") continue;
    const m = id.match(/pb1-(\d+)/);
    if (!m || !card.ability?.trim()) continue;
    const num = m[1];
    if (!reps.has(num) || /-R$/.test(id) || /-L$/.test(id)) reps.set(num, id);
  }
  /** @type {Array<{id:string, trigger:string, segIndex:number, expectTemplate:string, jouji?:boolean, check?:(cl:any, seg?:any)=>string[]}>} */
  const cases = [];
  for (const id of [...reps.values()].sort((a, b) => {
    const na = Number(a.match(/pb1-(\d+)/)?.[1] || 0);
    const nb = Number(b.match(/pb1-(\d+)/)?.[1] || 0);
    return na - nb || a.localeCompare(b);
  })) {
    const card = cards[id];
    const byTrig = /** @type {Record<string, any[]>} */ ({});
    for (const seg of splitAbilityByTriggers(cardAbilityRawText(card))) {
      if (!seg.trigger) continue;
      (byTrig[seg.trigger] ||= []).push(seg);
    }
    for (const [trigger, segs] of Object.entries(byTrig)) {
      segs.forEach((seg, segIndex) => {
        if (trigger === "jouji") {
          const jr = classifyJoujiSegment(seg.text);
          cases.push({
            id,
            trigger,
            segIndex,
            expectTemplate: "jouji",
            jouji: true,
            check: () => (jr?.kind ? [] : ["jouji kind"]),
          });
          return;
        }
        const cl = classifyCardAbility(card, trigger, seg.text);
        cases.push({
          id,
          trigger,
          segIndex,
          expectTemplate: cl.template,
        });
      });
    }
  }
  return cases;
}

/** @type {Record<string, (cl: any, seg?: any) => string[]>} */
export const MUSE_PB1_EXTRA = {
  "PL!-pb1-001-R|kidou|0": (cl) =>
    cl.template === "deck_reveal_until_pick" && cl.costSelfWait && cl.handDiscardToWaiting === 1
      ? []
      : ["reveal pick cost"],
  "PL!-pb1-002-R|jouji|0": (_cl, seg) => {
    const jr = classifyJoujiSegment(seg.text);
    return jr?.kind === "heart_per_opponent_wait" && jr?.heartPerSlot?.["6"] === 1 ? [] : ["heart06 per wait"];
  },
  "PL!-pb1-002-R|toujyou|0": (cl) =>
    cl.filters?.seriesTag === "BiBi" && cl.optional && cl.oppWaitMaxPrintedBlade === 3 ? [] : ["BiBi blade3"],
  "PL!-pb1-004-R|toujyou|0": (cl) =>
    cl.filters?.seriesTag === "μ's" &&
    cl.filters?.minSuccessLiveCount === 1 &&
    cl.filters?.minScore === 1 &&
    cl.stageArea === "center"
      ? []
      : ["SL tiered center"],
  "PL!-pb1-009-R|toujyou|1": (cl) =>
    cl.template === "toujou_turn_block_effect_activate" ? [] : ["turn block"],
  "PL!-pb1-014-R|jouji|0": (_cl, seg) => {
    const jr = classifyJoujiSegment(seg.text);
    return jr?.kind === "hand_cost_reduce" && jr?.handCostReduce === 2 && jr?.handCostReduceSeriesTag === "lilywhite"
      ? []
      : ["lilywhite cost -2"];
  },
  "PL!-pb1-015-R|jidou|0": (cl) =>
    cl.template === "jidou_opp_wait_draw" && cl.filters?.maxCost === 4 && cl.perTurnLimit === 1 ? [] : ["jidou draw"],
  "PL!-pb1-015-R|toujyou|0": (cl) =>
    cl.template === "toujou_bibi_wait_opp_active_wait" && cl.stageArea === "center" && cl.filters?.seriesTag === "BiBi"
      ? []
      : ["BiBi center wait"],
  "PL!-pb1-028-L|live_start|0": (cl) =>
    cl.filters?.seriesTag === "Printemps" ? [] : ["Printemps activate"],
  "PL!-pb1-030-L|live_success|0": (cl) =>
    cl.filters?.seriesTag === "BiBi" ? [] : ["BiBi recover"],
};

/**
 * @param {string} label
 * @param {string} prefix
 * @param {Record<string, (cl: any, seg?: any) => string[]>} [extra]
 */
export function runPb1Verify(label, prefix, extra = {}) {
  const cases = buildPb1Cases(prefix);
  let failed = 0;
  for (const c of cases) {
    const card = cards[c.id];
    if (!card) {
      console.error("MISSING", c.id);
      failed++;
      continue;
    }
    const segMatches = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => s.trigger === c.trigger);
    const seg = segMatches[c.segIndex ?? 0];
    if (!seg) {
      console.error("MISSING SEG", c.id, c.trigger, c.segIndex);
      failed++;
      continue;
    }
    const cl = classifyCardAbility(card, c.trigger, seg.text);
    const errs = [];
    if (c.jouji) {
      const jr = classifyJoujiSegment(seg.text);
      if (!jr?.kind) errs.push("jouji manual");
    } else if (cl.template !== c.expectTemplate) {
      errs.push(`template ${cl.template}`);
    }
    if (!c.jouji && cl.template !== "ability_sequence" && !abilityEffectIsAutomated(cl.template)) {
      errs.push("not automated");
    }
    const key = `${c.id}|${c.trigger}|${c.segIndex ?? 0}`;
    const extraCheck = extra[key] || c.check;
    if (extraCheck) errs.push(...extraCheck(cl, seg));
    if (errs.length) {
      failed++;
      console.error("FAIL", c.id, c.trigger, errs.join("; "));
    } else {
      console.log("OK", c.id, c.trigger);
    }
  }
  if (failed) {
    console.error(`\n${failed} ${label} case(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${cases.length} ${label} cases passed`);
}
