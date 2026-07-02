#!/usr/bin/env node
/**
 * docs/play-verification-list.md の未確認37カード（表記上43行）を
 * 分類・ハンドラ・既知バグパターンで一括検証する。
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
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";
import { classifyJoujiSegment } from "../js/joujiEffects.js";
import { TEMPLATE_HANDLES_OWN_COST, templateHandlesOwnCost } from "../js/abilityRuntimeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");
const jidouSrc = fs.readFileSync(path.join(ROOT, "js/jidouAutoEffects.js"), "utf8");

/** @type {Array<{id:string, trigger:string, expectTemplate?:string, check:(cl:import('../js/abilityEffects.js').ClassifiedAbility, segRaw:string, plain:string)=>string[]}>} */
const CASES = [
  {
    id: "PL!SP-bp5-002-R＋",
    trigger: "kidou",
    expectTemplate: "draw_then_hand_discard",
    check(cl) {
      const e = [];
      if (!cl.postDiscardActivateIfNonBhMember) e.push("postDiscardActivateIfNonBhMember");
      if (cl.postDiscardBladeGainIfNonBhAt !== 2) e.push("postDiscardBladeGainIfNonBhAt!=2");
      if (cl.postDiscardBladeGainCount !== 2) e.push("postDiscardBladeGainCount!=2");
      return e;
    },
  },
  {
    id: "PL!SP-bp4-006-P",
    trigger: "live_success",
    check(cl) {
      const e = [];
      if (cl.filters?.pickType !== "ライブ") e.push("filters.pickType!=ライブ");
      if (cl.preconditionFilters?.minDistinctYellRevealedMemberNames !== 3) e.push("yell member precondition");
      return e;
    },
  },
  {
    id: "PL!SP-pb2-011-PP",
    trigger: "jidou",
    expectTemplate: "jidou_center_member_move_choice",
    check() {
      return [];
    },
  },
  {
    id: "PL!HS-PR-032-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_hand",
    check(cl) {
      const e = [];
      if (cl.filters?.minScore !== 6) e.push("minScore!=6");
      if (cl.filters?.pickType !== "ライブ") e.push("pickType!=ライブ");
      return e;
    },
  },
  {
    id: "PL!SP-bp5-008-AR",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check(cl) {
      const e = [];
      if (cl.filters?.pickType !== "メンバー") e.push("pickType!=メンバー");
      if (cl.filters?.minCost !== 9) e.push("minCost!=9");
      return e;
    },
  },
  {
    id: "PL!S-bp2-005-R＋",
    trigger: "toujyou",
    expectTemplate: "deck_top_pick_recover",
    check(cl) {
      if (!simSrc.includes("手札に加える")) return ["dialog label 手札に加える missing"];
      return [];
    },
  },
  {
    id: "PL!SP-pb1-001-PR",
    trigger: "live_start",
    expectTemplate: "live_start_pay_or_hand_discard",
    check(cl) {
      const e = [];
      if (!cl.costEnergy) e.push("costEnergy false");
      return e;
    },
  },
  {
    id: "PL!SP-pb2-048-L",
    trigger: "live_start",
    expectTemplate: "live_start_distinct_series_need_heart_shift_score",
    check() {
      return [];
    },
  },
  {
    id: "PL!SP-pb2-018-R",
    trigger: "live_start",
    check(cl) {
      const e = [];
      if (!cl.energyActiveWaitOnly) e.push("energyActiveWaitOnly missing");
      if (cl.energyActiveUnitKind !== "distinct_name_series_stage_members") e.push("CatChu! unit kind");
      return e;
    },
  },
  {
    id: "PL!SP-pb2-007-R",
    trigger: "live_success",
    expectTemplate: "live_success_optional_energy_recover_waiting",
    check(cl) {
      if (!templateHandlesOwnCost(cl.template)) return ["not in TEMPLATE_HANDLES_OWN_COST"];
      return [];
    },
  },
  {
    id: "PL!SP-bp4-027-L",
    trigger: "live_success",
    expectTemplate: "live_success_formation_change",
    check() {
      return [];
    },
  },
  {
    id: "PL!S-bp5-019-L",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    check(cl, segRaw) {
      const e = [];
      const f = Object.assign({}, cl.preconditionFilters || {}, cl.filters || {});
      if (f.minEitherSuccessLiveCount !== 2) e.push("minEitherSuccessLiveCount!=2");
      if (cl.filters?.minSuccessLiveCount != null) e.push("minSuccessLiveCount leak");
      if (cl.handPickMax !== 2) e.push("handPickMax!=2");
      if (!/エール/.test(segRaw)) e.push("yell ref missing in raw");
      return e;
    },
  },
  {
    id: "PL!SP-pb2-014-R",
    trigger: "toujyou",
    check(cl) {
      if (!cl.formationChange) return ["formationChange missing"];
      return [];
    },
  },
  {
    id: "PL!S-pb1-002-R",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_optional_live_discard_or_score",
    check() {
      if (!simSrc.includes("listOpponentHandForDecision")) return ["opponent hand helper"];
      return [];
    },
  },
  {
    id: "PL!-PR-014-PR",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_hand_reveal_no_live_draw",
    check(cl) {
      if (cl.revealCount !== 3) return ["revealCount!=3"];
      return [];
    },
  },
  {
    id: "PL!-pb1-015-R",
    trigger: "toujyou",
    expectTemplate: "toujou_bibi_wait_opp_active_wait",
    check() {
      if (!simSrc.includes("soloOpponentActiveStageMemberCandidates")) return ["active-only opp pool"];
      return [];
    },
  },
  {
    id: "PL!SP-pb2-003-R",
    trigger: "live_success",
    expectTemplate: "live_success_liella_effect_moved_score",
    check() {
      return [];
    },
  },
  {
    id: "PL!SP-pb2-005-R",
    trigger: "toujyou",
    expectTemplate: "toujou_baton_discarded_under",
    check() {
      return [];
    },
  },
  {
    id: "PL!SP-pb2-008-R",
    trigger: "live_success",
    expectTemplate: "live_success_yell_nobh_series_score_capped",
    check(cl) {
      if (cl.liveScoreCapMax !== 2) return ["liveScoreCapMax!=2"];
      return [];
    },
  },
  {
    id: "PL!SP-pb2-010-R",
    trigger: "live_start",
    expectTemplate: "live_start_mandatory_energy_deck_unless_hand_discard",
    check() {
      return [];
    },
  },
  {
    id: "PL!SP-pb2-045-L",
    trigger: "live_start",
    expectTemplate: "live_card_score_plus_per_unit",
    check(cl) {
      if (cl.scoreUnitKind !== "series_stage_members_min_hearts") return ["scoreUnitKind"];
      return [];
    },
  },
  {
    id: "PL!SP-pb2-050-L",
    trigger: "live_start",
    expectTemplate: "live_start_optional_formation_change",
    check(cl) {
      if (!cl.optional) return ["optional missing"];
      return [];
    },
  },
  {
    id: "PL!HS-cl1-012-CL",
    trigger: "live_success",
    check(cl) {
      const f = Object.assign({}, cl.preconditionFilters || {}, cl.filters || {});
      const e = [];
      if (!f.requiresLiveScoreTieWithOpponent) e.push("requiresLiveScoreTieWithOpponent");
      if (!simSrc.includes("soloOpponentLiveFrameScoreSum")) e.push("solo live frame score");
      return e;
    },
  },
  {
    id: "PL!N-bp1-026-L",
    trigger: "live_success",
    check(cl) {
      const f = Object.assign({}, cl.preconditionFilters || {}, cl.filters || {});
      if (!f.requiresLiveScoreHigherThanOpponent) return ["requiresLiveScoreHigherThanOpponent"];
      return [];
    },
  },
  {
    id: "LL-bp4-001-R＋",
    trigger: "toujyou",
    expectTemplate: "deck_peek_pick_then_opp_wait",
    check() {
      return [];
    },
  },
  {
    id: "PL!-pb1-002-R",
    trigger: "toujyou",
    check(cl) {
      if (cl.template !== "optional_self_wait_opp_stage") return [`template ${cl.template}`];
      return [];
    },
  },
  {
    id: "PL!SP-bp5-001-R＋",
    trigger: "toujyou",
    check(cl) {
      if (cl.template !== "ability_pick_one" && cl.template !== "ability_sequence") return [`template ${cl.template}`];
      return [];
    },
  },
  {
    id: "PL!SP-pb2-009-R",
    trigger: "toujyou",
    expectTemplate: "optional_pick_member_wait_opp_blade_gap",
    check(cl) {
      const e = [];
      if (cl.oppBladeGapMin !== 2) e.push("oppBladeGapMin!=2");
      if (cl.oppPrintedHeartGapMin != null) e.push("should use blade not heart gap");
      return e;
    },
  },
  {
    id: "PL!-bp5-004-R＋",
    trigger: "kidou",
    check(cl) {
      if (cl.template !== "kidou_opp_wait_group_discount_energy") return [`template ${cl.template}`];
      return [];
    },
  },
  {
    id: "PL!SP-pb2-002-R",
    trigger: "kidou",
    expectTemplate: "ability_sequence",
    check() {
      return [];
    },
  },
  {
    id: "PL!-bp5-021-L",
    trigger: "live_start",
    expectTemplate: "live_start_sunny_day_song_tiered",
    check() {
      return [];
    },
  },
  {
    id: "PL!SP-pb2-011-R",
    trigger: "jidou",
    expectTemplate: "jidou_center_member_move_choice",
    check() {
      return [];
    },
  },
  {
    id: "PL!N-bp4-025-L",
    trigger: "live_success",
    expectTemplate: "live_success_yell_series_members_all_hearts_score",
    check() {
      return [];
    },
  },
  {
    id: "LL-PR-004-PR",
    trigger: "live_start",
    expectTemplate: "live_start_love_screem_opp_answer",
    check() {
      return [];
    },
  },
  {
    id: "PL!S-pb1-019-L",
    trigger: "live_success",
    expectTemplate: "live_success_opponent_energy_deck_wait",
    check(segRaw) {
      return [];
    },
  },
  {
    id: "PL!SP-bp4-005-R＋",
    trigger: "toujyou",
    expectTemplate: "energy_deck_to_wait",
    check(cl) {
      if (cl.costEnergy) return ["should not be costEnergy pay"];
      return [];
    },
  },
  {
    id: "PL!SP-pb1-025-L",
    trigger: "live_start",
    check() {
      if (!simSrc.includes("refreshLiveStartEnterMoveNeedHeartReduceEffects")) return ["need heart refresh"];
      return [];
    },
  },
];

function plain(raw) {
  return String(raw || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\s+/g, "");
}

function hasHandler(tpl) {
  if (!tpl || tpl === "none" || tpl === "passive_track" || tpl === "ability_sequence") return true;
  if (simSrc.includes(`cl.template === "${tpl}"`)) return true;
  if (jidouSrc.includes(`"${tpl}"`) || jidouSrc.includes(`template === "${tpl}"`)) return true;
  return false;
}

let failed = 0;
for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  if (!seg) {
    console.error("MISSING SEGMENT", c.id, c.trigger);
    failed++;
    continue;
  }
  /** @type {import('../js/abilityEffects.js').ClassifiedAbility} */
  let cl;
  if (c.trigger === "jidou") {
    cl = /** @type {any} */ (classifyJidouAutoSegment(seg.text));
  } else {
    cl = classifyCardAbility(card, c.trigger, seg.text);
  }
  const errs = [];
  if (c.expectTemplate && cl.template !== c.expectTemplate) errs.push(`template ${cl.template} != ${c.expectTemplate}`);
  if (cl.template === "guided_manual") errs.push("guided_manual");
  if (cl.template && cl.template !== "none" && !abilityEffectIsAutomated(cl.template) && c.trigger !== "jidou") {
    errs.push(`not automated: ${cl.template}`);
  }
  if (cl.template && !hasHandler(cl.template)) errs.push(`handler missing: ${cl.template}`);
  errs.push(...c.check(cl, seg.text, plain(seg.text)));
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger);
  }
}

if (failed) {
  console.error(`\n${failed} play-checklist case(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} play-checklist cases passed`);
