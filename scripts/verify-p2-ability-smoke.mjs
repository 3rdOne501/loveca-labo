#!/usr/bin/env node
/**
 * P0/P2 能力の分類・自動化・ハンドラ存在のスモーク検証。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { abilityEffectIsAutomated, classifyCardAbility, listNativeLiveStartSegmentRaws } from "../js/abilityEffects.js";
import { classifyJidouAutoSegment, jidouEffectIsAutomated, listNativeJidouSegmentRaws } from "../js/jidouAutoEffects.js";
import { classifyJoujiSegment, memberHasMirrorUnderKidouJouji, listNativeJoujiSegmentRaws } from "../js/joujiEffects.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

/** @type {Array<{id:string, trigger:string, template:string, extra?:Record<string, unknown>}>} */
const P2_CASES = [
  { id: "PL!SP-pb2-003-R", trigger: "live_success", template: "live_success_liella_effect_moved_score" },
  { id: "PL!SP-pb2-005-R", trigger: "toujyou", template: "toujou_baton_discarded_under" },
  { id: "PL!SP-pb2-007-R", trigger: "live_success", template: "live_success_optional_energy_recover_waiting" },
  { id: "PL!SP-pb2-008-R", trigger: "live_success", template: "live_success_yell_nobh_series_score_capped" },
  { id: "PL!SP-pb2-009-R", trigger: "toujyou", template: "optional_pick_member_wait_opp_blade_gap" },
  { id: "PL!SP-pb2-009-R", trigger: "live_start", template: "optional_pick_member_wait_opp_blade_gap" },
  { id: "PL!SP-pb2-010-R", trigger: "live_start", template: "live_start_mandatory_energy_deck_unless_hand_discard" },
  { id: "PL!SP-pb2-045-L", trigger: "live_start", template: "live_card_score_plus_per_unit", extra: { scoreUnitKind: "series_stage_members_min_hearts" } },
  { id: "PL!SP-pb2-050-L", trigger: "live_start", template: "live_start_optional_formation_change" },
];

/** @type {Array<{id:string, trigger:string, template:string}>} */
const P0_CASES = [
  { id: "PL!S-bp5-002-R＋", trigger: "live_start", template: "live_start_side_cost_equal_opp_wait" },
  { id: "PL!S-pb1-002-R", trigger: "toujyou", template: "toujou_opp_optional_live_discard_or_score" },
  { id: "PL!-PR-014-PR", trigger: "toujyou", template: "toujou_opp_hand_reveal_no_live_draw" },
  { id: "PL!-pb1-015-R", trigger: "toujyou", template: "toujou_bibi_wait_opp_active_wait" },
  { id: "PL!-bp5-333-R", trigger: "toujyou", template: "optional_self_wait_opp_stage", extra: { oppWaitMaxCost: 9 } },
];

/** @type {Array<{id:string, segIndex?:number, template:string, extra?:Record<string, unknown>}>} */
const JIDOU_CASES = [
  {
    id: "PL!SP-pb2-006-R",
    template: "jidou_live_success_or_area_move_wait_under",
    extra: { eventKind: "area_move", altEventKind: "live_success_own", perTurnLimit: 1 },
  },
  {
    id: "PL!SP-pb2-020-R",
    template: "jidou_yell_optional_hand_live_extra_yell",
    extra: { eventKind: "yell", extraYellCount: 2, perTurnLimit: 1 },
  },
  {
    id: "PL!SP-pb2-022-R",
    template: "jidou_series_member_to_center_blade_grant",
    extra: { eventKind: "member_to_center", seriesTag: "5yncri5e!", bladeGain: 4, perTurnLimit: 1 },
  },
];

function handlerExists(template) {
  return simSrc.includes(`cl.template === "${template}"`);
}

function dualHandlerHasMutate(template) {
  const re = new RegExp(
    `if \\(cl\\.template === "${template}"\\)[\\s\\S]{0,12000}?isDualOpponentBoardMode`,
    "m",
  );
  return re.test(simSrc);
}

let failed = 0;

for (const c of [...P2_CASES, ...P0_CASES]) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const cl = classifyCardAbility(card, c.trigger);
  const errs = [];
  if (cl.template !== c.template) errs.push(`template: ${cl.template} != ${c.template}`);
  if (!abilityEffectIsAutomated(cl.template)) errs.push(`not automated: ${cl.template}`);
  if (!handlerExists(c.template)) errs.push(`handler missing in simulator.js`);
  if (c.extra) {
    for (const [k, v] of Object.entries(c.extra)) {
      if (cl[k] !== v) errs.push(`${k}: ${JSON.stringify(cl[k])} != ${JSON.stringify(v)}`);
    }
  }
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.template);
  }
}

// 葉月恋 常時: 起動ミラー
const koi = cards["PL!SP-pb2-005-R"];
if (!memberHasMirrorUnderKidouJouji(koi)) {
  failed++;
  console.error("FAIL PL!SP-pb2-005-R jouji mirror_under_card_kidou");
} else {
  console.log("OK PL!SP-pb2-005-R jouji mirror_under_card_kidou");
}

// 桜小路きな子 常時: 下のシリーズ枚数でコスト+
const kinako = cards["PL!SP-pb2-006-R"];
const kinakoJouji = classifyJoujiSegment(
  "このメンバーの下にある『Liella!』のメンバーカード1枚につき、このメンバーのコストを＋１する。",
);
if (!kinakoJouji || kinakoJouji.kind !== "stage_cost_plus_per_under_series") {
  failed++;
  console.error("FAIL PL!SP-pb2-006-R jouji stage_cost_plus_per_under_series", kinakoJouji);
} else {
  console.log("OK PL!SP-pb2-006-R jouji stage_cost_plus_per_under_series");
}

// 成功ライブ常時（Angelic Angel / Music S.T.A.R.T!!）
const angelSeg =
  "このカードが自分の成功ライブカード置き場にあり、かつ自分のステージに『μ's』のメンバーがいるかぎり、自分の成功ライブカード置き場にあるこのカードのスコアを＋５する。";
const angelRule = classifyJoujiSegment(angelSeg);
if (!angelRule || angelRule.kind !== "success_live_self_score_if_series_on_stage") {
  failed++;
  console.error("FAIL Angelic Angel jouji rule", angelRule);
} else {
  console.log("OK Angelic Angel jouji success_live_self_score_if_series_on_stage");
}

const musicSeg =
  "このカードが自分の成功ライブカード置き場にあるかぎり、元々のコストが17以上の『μ's』のメンバーカードを自分の手札から登場させるためのコストは2減る。この効果は重複しない。";
const musicRule = classifyJoujiSegment(musicSeg);
if (!musicRule || musicRule.kind !== "grant_hand_series_cost_reduce" || !musicRule.requiresSuccessLiveSelf) {
  failed++;
  console.error("FAIL Music S.T.A.R.T!! jouji rule", musicRule);
} else {
  console.log("OK Music S.T.A.R.T!! jouji grant_hand_series_cost_reduce (success live)");
}

const crossroads = cards["PL!-bp6-024-L"];
if (!crossroads) {
  failed++;
  console.error("MISSING PL!-bp6-024-L");
} else {
  const crossCl = classifyCardAbility(crossroads, "jouji");
  const crossErrs = [];
  if (crossCl.template !== "jouji_success_live_waiting_substitute") {
    crossErrs.push(`template: ${crossCl.template}`);
  }
  if (!abilityEffectIsAutomated(crossCl.template)) {
    crossErrs.push("not automated");
  }
  if (crossCl.filters?.seriesTag !== "μ's") {
    crossErrs.push(`seriesTag: ${crossCl.filters?.seriesTag}`);
  }
  const crossRaws = listNativeJoujiSegmentRaws(crossroads);
  if (!crossRaws.length) crossErrs.push("listNativeJoujiSegmentRaws empty");
  const crossRule = crossRaws[0] ? classifyJoujiSegment(crossRaws[0]) : null;
  if (!crossRule || crossRule.kind !== "success_live_waiting_substitute") {
    crossErrs.push(`jouji rule: ${crossRule?.kind}`);
  }
  if (!simSrc.includes("placeLiveOnSuccessLiveArea")) crossErrs.push("placeLiveOnSuccessLiveArea missing");
  if (!simSrc.includes("cardOffersSuccessLiveWaitingSubstitute")) {
    crossErrs.push("cardOffersSuccessLiveWaitingSubstitute missing");
  }
  if (crossErrs.length) {
    failed++;
    console.error("FAIL PL!-bp6-024-L jouji", crossErrs.join("; "));
  } else {
    console.log("OK PL!-bp6-024-L jouji jouji_success_live_waiting_substitute");
  }
}

const makiLs = cards["PL!-pb1-015-R"];
const makiLsRaws = listNativeLiveStartSegmentRaws(makiLs);
const makiLsCl = classifyCardAbility(makiLs, "live_start", makiLsRaws[0]);
if (makiLsCl.template !== "toujou_bibi_wait_opp_active_wait") {
  failed++;
  console.error("FAIL PL!-pb1-015-R live_start", makiLsCl.template);
} else {
  console.log("OK PL!-pb1-015-R live_start toujou_bibi_wait_opp_active_wait");
}

for (const c of JIDOU_CASES) {
  const card = cards[c.id];
  if (!card) {
    failed++;
    console.error("MISSING jidou", c.id);
    continue;
  }
  const raws = listNativeJidouSegmentRaws(card);
  const cl = classifyJidouAutoSegment(raws[c.segIndex ?? 0]);
  const errs = [];
  if (cl.template !== c.template) errs.push(`template: ${cl.template} != ${c.template}`);
  if (!jidouEffectIsAutomated(cl.template)) errs.push(`not automated: ${cl.template}`);
  if (!handlerExists(cl.template)) errs.push(`handler missing in simulator.js`);
  if (c.extra) {
    for (const [k, v] of Object.entries(c.extra)) {
      if (cl[k] !== v) errs.push(`${k}: ${JSON.stringify(cl[k])} != ${JSON.stringify(v)}`);
    }
  }
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, "jidou", errs.join("; "));
  } else {
    console.log("OK", c.id, "jidou", c.template);
  }
}

// Liella 移動追跡・起動ミラー・ブレードギャップの実装痕跡
const IMPL_MARKERS = [
  "_liellaAbilityMovedThisTurn",
  "collectMirrorUnderKidouSources",
  "optional_pick_member_wait_opp_blade_gap",
  "memberMovedByLiellaAbilityThisTurn",
  "live_success_yell_nobh_series_score_capped",
  "fireJidouAfterOwnLiveSuccess",
  "fireJidouOnMemberMovedToCenter",
  "boardBladeForYellReveal",
  "extraYellRevealAllowance",
  "computeSuccessLiveJoujiScoreBonus",
  "placeLiveOnSuccessLiveArea",
  "cardOffersSuccessLiveWaitingSubstitute",
];
for (const m of IMPL_MARKERS) {
  if (!simSrc.includes(m)) {
    failed++;
    console.error("FAIL simulator missing marker:", m);
  }
}

// 鬼塚夏美: デュアル盤分岐
if (!dualHandlerHasMutate("optional_pick_member_wait_opp_blade_gap")) {
  failed++;
  console.error("FAIL optional_pick_member_wait_opp_blade_gap dual-mode branch missing");
} else {
  console.log("OK optional_pick_member_wait_opp_blade_gap dual-mode branch");
}

// bp5-333 等: 相手ステージウェイトはソロで相手代理のみ
if (!simSrc.includes("function soloOpponentProxyStageMemberCandidates")) {
  failed++;
  console.error("FAIL soloOpponentProxyStageMemberCandidates helper missing");
} else if (
  !/optional_self_wait_opp_stage[\s\S]{0,4000}soloOpponentActiveStageMemberCandidates\(oppMax\)/.test(simSrc)
) {
  failed++;
  console.error("FAIL optional_self_wait_opp_stage solo pool not restricted to opponent stage");
} else {
  console.log("OK optional_self_wait_opp_stage solo opponent-stage pool");
}

if (failed) {
  console.error(`\n${failed} smoke check(s) failed`);
  process.exit(1);
}
console.log(`\nAll P0/P2/jidou smoke checks passed (${P2_CASES.length + P0_CASES.length + JIDOU_CASES.length + 3} groups)`);
