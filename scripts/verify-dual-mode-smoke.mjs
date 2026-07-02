#!/usr/bin/env node
/**
 * デュアル盤対応のスモーク検証（相手参照カードの分類・ヘルパー存在）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCardAbility, cardAbilityRawText, splitAbilityByTriggers } from "../js/abilityEffects.js";
import { OPPONENT_DUAL_DELEGATE_HELPERS } from "../js/abilityRuntimeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json"), "utf8"));
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");
const joujiSrc = fs.readFileSync(path.join(ROOT, "js/joujiEffects.js"), "utf8");
const oppBoardSrc = fs.readFileSync(path.join(ROOT, "js/opponentBoard.js"), "utf8");

/** @type {Array<{id:string, trigger:string, check:string}>} */
const CASES = [
  { id: "PL!-bp4-001-P", trigger: "live_start", check: "requiresOwnStageCostSumLowerThanOpponent" },
  { id: "PL!-bp3-026-L", trigger: "live_success", check: "requiresOwnStageHeartTotalHigherThanOpponent" },
  { id: "PL!-bp5-024-L", trigger: "live_start", check: "ability_pick_one" },
  { id: "PL!S-bp5-002-R＋", trigger: "live_start", check: "live_start_side_cost_equal_opp_wait" },
  { id: "PL!-PR-014-PR", trigger: "toujyou", check: "toujou_opp_hand_reveal_no_live_draw" },
  { id: "PL!SP-pb2-009-R", trigger: "toujyou", check: "optional_pick_member_wait_opp_blade_gap" },
  { id: "PL!N-bp5-007-AR", trigger: "live_start", check: "requiresSuccessLiveCountTieWithOpponent" },
  { id: "PL!-bp5-021-L", trigger: "live_start", check: "live_start_sunny_day_song_tiered" },
  { id: "PL!N-bp4-001-P", trigger: "live_success", check: "energy_less_than_opponent_wait" },
  { id: "PL!S-pb1-008-P＋", trigger: "live_start", check: "deck_top_look_reorder_dual" },
  { id: "PL!HS-cl1-012-CL", trigger: "live_success", check: "requiresLiveScoreTieWithOpponent" },
  { id: "PL!N-bp1-026-L", trigger: "live_success", check: "requiresLiveScoreHigherThanOpponent" },
  { id: "PL!-bp5-111-P＋", trigger: "kidou", check: "kidou_hand_discard_activate_wait_opp_bonus" },
  { id: "PL!-pb1-009-P＋", trigger: "toujyou", check: "optional_self_wait_opp_blade" },
  { id: "PL!S-bp5-019-L", trigger: "live_success", check: "min_either_success_live" },
  { id: "PL!S-bp5-010-N", trigger: "toujyou", check: "toujou_grant_opp_live_need_heart" },
  { id: "PL!SP-bp2-011-P", trigger: "toujyou", check: "toujou_wait_pick_opp_live" },
  { id: "PL!N-bp3-010-P", trigger: "live_start", check: "live_start_pick_player_waiting_deck_bottom" },
  { id: "PL!S-bp3-007-P", trigger: "kidou", check: "live_start_pick_player_waiting_deck_bottom_kidou" },
  { id: "PL!-bp3-002-P", trigger: "toujyou", check: "optional_self_wait_opp_stage" },
  { id: "PL!N-bp4-004-P", trigger: "live_start", check: "live_start_draw_opp_wait" },
  { id: "PL!N-bp3-011-P", trigger: "toujyou", check: "toujou_opp_stage_member_match_grant" },
  { id: "PL!-bp3-022-L", trigger: "live_start", check: "live_start_deck_reveal_both_stage_members_score" },
  /* Phase 1 残り10件（2026-07 追加） */
  { id: "PL!SP-bp2-023-L", trigger: "live_start", check: "score_plus_success_live_less" },
  { id: "PL!SP-bp2-024-L", trigger: "live_success", check: "score_plus_hand_more" },
  { id: "PL!N-bp3-017-N", trigger: "toujyou", check: "optional_self_wait_opp_stage_cost4" },
  { id: "PL!S-bp3-002-P", trigger: "live_success", check: "yell_resolution_pick_self_score" },
  { id: "PL!S-bp3-024-L", trigger: "live_start", check: "ability_pick_one_opp_wait_branch" },
  { id: "PL!N-bp4-001-P", trigger: "live_success", check: "energy_less_than_opponent_wait" },
  { id: "PL!N-bp4-002-P", trigger: "live_start", check: "live_start_pick_player_deck_top_peek" },
  { id: "PL!N-bp4-007-P", trigger: "toujyou", check: "toujou_both_wait_pick_live_hand" },
  { id: "PL!N-bp4-007-P", trigger: "live_success", check: "both_players_energy_deck_wait" },
  { id: "PL!N-bp4-012-P", trigger: "jouji", check: "passive_opp_success_live_score_sum" },
  /* Phase 2 常時効果 代表（2026-07 追加） */
  { id: "PL!SP-bp2-010-P", trigger: "jouji", check: "passive_opp_live_need_heart_bump" },
  { id: "PL!S-bp2-001-P", trigger: "jouji", check: "passive_blade_own0_opp1_success" },
  { id: "PL!-bp3-002-P", trigger: "jouji", check: "passive_per_opp_wait" },
  { id: "PL!N-bp4-007-P", trigger: "jouji", check: "passive_combined_energy" },
  { id: "PL!-bp4-018-N", trigger: "jouji", check: "passive_own_success_score_beats_opp" },
  { id: "PL!N-bp5-002-P", trigger: "jouji", check: "passive_most_hearts_both_stages" },
];

let failed = 0;

/** @param {import('../js/abilityEffects.js').ClassifiedAbility} cl */
function mergedAbilityFilters(cl) {
  return Object.assign({}, cl.preconditionFilters || {}, cl.filters || {});
}

for (const c of CASES) {
  const card = cards[c.id];
  if (!card) {
    console.error("MISSING", c.id);
    failed++;
    continue;
  }
  const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
  const cl = classifyCardAbility(card, c.trigger, seg && seg.text);
  const filters = mergedAbilityFilters(cl);
  const errs = [];
  if (c.check === "requiresOwnStageCostSumLowerThanOpponent") {
    if (!filters.requiresOwnStageCostSumLowerThanOpponent) errs.push("filter missing");
  } else if (c.check === "requiresOwnStageHeartTotalHigherThanOpponent") {
    if (!filters.requiresOwnStageHeartTotalHigherThanOpponent) errs.push("heart filter missing");
  } else if (c.check === "requiresSuccessLiveCountTieWithOpponent") {
    if (!filters.requiresSuccessLiveCountTieWithOpponent) errs.push("success live tie filter missing");
  } else if (c.check === "requiresLiveScoreTieWithOpponent") {
    if (!filters.requiresLiveScoreTieWithOpponent) errs.push("live score tie filter missing");
    if (!simSrc.includes("soloOpponentLiveFrameScoreSum")) errs.push("solo live frame score state missing");
    if (!simSrc.includes("ensureSoloOpponentLiveFrameScore")) errs.push("solo live frame score dialog missing");
  } else if (c.check === "requiresLiveScoreHigherThanOpponent") {
    if (!filters.requiresLiveScoreHigherThanOpponent) errs.push("live score higher filter missing");
    if (!simSrc.includes("soloOpponentLiveFrameScoreSum")) errs.push("solo live frame score state missing");
    if (!simSrc.includes("ensureSoloOpponentLiveFrameScore")) errs.push("solo live frame score dialog missing");
  } else if (c.check === "deck_top_look_reorder_dual") {
    if (cl.template !== "deck_top_look_reorder") errs.push(`template ${cl.template}`);
    if (!cl.pickSelfOrOpponent) errs.push("pickSelfOrOpponent missing");
    if (!simSrc.includes("openPickSelfOrOpponentDialog")) errs.push("dual pick dialog missing");
  } else if (c.check === "energy_less_than_opponent_wait") {
    if (cl.template !== "energy_less_than_opponent_wait") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("countOpponentEnergyCards")) errs.push("countOpponentEnergyCards missing");
  } else if (c.check === "optional_self_wait_opp_blade") {
    if (cl.template !== "optional_self_wait_opp_stage") errs.push(`template ${cl.template}`);
    if (cl.oppWaitMaxPrintedBlade !== 1) errs.push(`oppWaitMaxPrintedBlade ${cl.oppWaitMaxPrintedBlade}`);
    if (!simSrc.includes("oppWaitMaxPrintedBlade")) errs.push("blade filter in handler missing");
  } else if (c.check === "min_either_success_live") {
    if (filters.minEitherSuccessLiveCount !== 2) errs.push("minEitherSuccessLiveCount missing");
    if (cl.filters?.minSuccessLiveCount != null) errs.push("minSuccessLiveCount should be unset");
    if (cl.filters?.minOpponentSuccessLiveCount != null) errs.push("minOpponentSuccessLiveCount should be unset");
    if (!simSrc.includes("ensureSoloOpponentSuccessLiveCount")) errs.push("solo success live count dialog missing");
  } else if (c.check === "toujou_grant_opp_live_need_heart") {
    if (cl.template !== "toujou_grant_opp_live_need_heart_if_stage_hearts") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("inactiveOpponentJoujiLiveNeedHeartBump")) errs.push("inactive opponent bump helper missing");
  } else if (c.check === "live_start_pick_player_waiting_deck_bottom") {
    if (cl.template !== "live_start_pick_player_waiting_deck_bottom") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("runOnTargetPlayerBoard")) errs.push("runOnTargetPlayerBoard missing");
    if (!simSrc.includes("openPickSelfOrOpponentDialog")) errs.push("openPickSelfOrOpponentDialog missing");
  } else if (c.check === "live_start_pick_player_waiting_deck_bottom_kidou") {
    if (cl.template !== "live_start_pick_player_waiting_deck_bottom") errs.push(`template ${cl.template}`);
    if (cl.deckDrawOnSuccess !== 1) errs.push("deckDrawOnSuccess missing");
    if (!simSrc.includes("runOnTargetPlayerBoard")) errs.push("runOnTargetPlayerBoard missing");
  } else if (c.check === "optional_self_wait_opp_stage") {
    if (cl.template !== "optional_self_wait_opp_stage") errs.push(`template ${cl.template}`);
    if (cl.oppWaitCount !== 2) errs.push(`oppWaitCount ${cl.oppWaitCount}`);
    if (!simSrc.includes("whenOpponentPlayMode")) errs.push("whenOpponentPlayMode missing");
  } else if (c.check === "live_start_draw_opp_wait") {
    if (cl.template !== "live_start_draw_opp_wait") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("openSoloOpponentMemberWaitPickMultiDialog")) errs.push("opp wait multi dialog missing");
  } else if (c.check === "toujou_opp_stage_member_match_grant") {
    if (cl.template !== "toujou_opp_stage_member_match_grant") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("listOpponentStageMembersExcludingName")) errs.push("listOpponentStageMembersExcludingName missing");
  } else if (c.check === "live_start_deck_reveal_both_stage_members_score") {
    if (cl.template !== "live_start_deck_reveal_both_stage_members_score") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("countBothPlayersStageMembers")) errs.push("countBothPlayersStageMembers missing");
  } else if (c.check === "score_plus_success_live_less") {
    if (cl.template !== "live_card_score_plus") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("countOpponentSuccessLiveCards")) errs.push("countOpponentSuccessLiveCards missing");
  } else if (c.check === "score_plus_hand_more") {
    if (cl.template !== "live_card_score_plus") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("soloOpponentHandCountForAbility")) errs.push("opponent hand count helper missing");
  } else if (c.check === "optional_self_wait_opp_stage_cost4") {
    if (cl.template !== "optional_self_wait_opp_stage") errs.push(`template ${cl.template}`);
    if (filters.maxCost !== 4) errs.push(`maxCost ${filters.maxCost}`);
  } else if (c.check === "yell_resolution_pick_self_score") {
    if (cl.template !== "yell_resolution_pick_self_score") errs.push(`template ${cl.template}`);
    if (!filters.requiresLiveScoreHigherThanOpponent) errs.push("live score higher filter missing");
    if (!simSrc.includes("opponentLiveScoreEstimate")) errs.push("opponentLiveScoreEstimate missing");
  } else if (c.check === "ability_pick_one_opp_wait_branch") {
    if (cl.template !== "ability_pick_one") errs.push(`template ${cl.template}`);
    const hasOppBranch = (cl.abilityChoices || []).some((t) => /相手のステージ/.test(String(t)));
    if (!hasOppBranch) errs.push("opp stage choice branch missing");
    if (!simSrc.includes("openOppWaitPickFromPool")) errs.push("openOppWaitPickFromPool missing");
  } else if (c.check === "live_start_pick_player_deck_top_peek") {
    if (cl.template !== "live_start_pick_player_deck_top_peek") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("openPickSelfOrOpponentDialog")) errs.push("openPickSelfOrOpponentDialog missing");
    if (!simSrc.includes("dualOppPeek")) errs.push("dual opp deck peek branch missing");
  } else if (c.check === "toujou_both_wait_pick_live_hand") {
    if (cl.template !== "toujou_both_wait_pick_live_hand") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("readInactiveOpponentBoard")) errs.push("readInactiveOpponentBoard missing");
  } else if (c.check === "both_players_energy_deck_wait") {
    if (cl.template !== "both_players_energy_deck_wait") errs.push(`template ${cl.template}`);
    if (!simSrc.includes("mutateInactiveOpponentBoard")) errs.push("mutateInactiveOpponentBoard missing");
  } else if (c.check === "passive_opp_success_live_score_sum") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("minOpponentSuccessLiveScoreSum")) errs.push("jouji score-sum rule missing");
    if (!simSrc.includes("successLiveScoreSumFromSnapshot")) errs.push("snapshot score-sum reader missing");
  } else if (c.check === "passive_opp_live_need_heart_bump") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("opponent_live_need_heart")) errs.push("jouji need-heart rule missing");
    if (!simSrc.includes("inactiveOpponentJoujiLiveNeedHeartBump")) errs.push("inactive bump reader missing");
    if (!simSrc.includes("joujiOpponentLiveNeedHeartBump:")) errs.push("bump not in board snapshot");
  } else if (c.check === "passive_blade_own0_opp1_success") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("minOpponentSuccessLive")) errs.push("jouji opp success rule missing");
    if (!simSrc.includes("successLiveCountFromSnapshot")) errs.push("snapshot success count reader missing");
  } else if (c.check === "passive_per_opp_wait") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("per_opponent_wait")) errs.push("jouji per-opp-wait rule missing");
    if (!simSrc.includes("countStageWaitMembersFromSnapshot")) errs.push("snapshot wait count reader missing");
  } else if (c.check === "passive_combined_energy") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("minCombinedEnergy")) errs.push("jouji combined energy rule missing");
    if (!simSrc.includes("energyCountFromSnapshot")) errs.push("snapshot energy reader missing");
  } else if (c.check === "passive_own_success_score_beats_opp") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("ownSuccessScoreBeatsOpponent")) errs.push("jouji score compare rule missing");
  } else if (c.check === "passive_most_hearts_both_stages") {
    if (cl.template !== "passive_track") errs.push(`template ${cl.template}`);
    if (!joujiSrc.includes("mostHeartsOnBothStages")) errs.push("jouji most-hearts rule missing");
    if (!joujiSrc.includes("eachOpponentStageColumnMembers().forEach")) errs.push("opp stage compare missing");
  } else if (cl.template !== c.check) {
    errs.push(`template ${cl.template} != ${c.check}`);
  }
  if (!simSrc.includes("isDualOpponentBoardMode")) errs.push("no dual mode in simulator");
  if (c.check.startsWith("passive_")) {
    if (!oppBoardSrc.includes("swapActiveSnap")) errs.push("swap-aware snapshot missing in opponentBoard");
    if (!oppBoardSrc.includes("syncPassiveEffects")) errs.push("passive sync hook missing in opponentBoard");
  }
  const needDelegate =
    c.check.indexOf("optional_pick") >= 0 ||
    c.check.indexOf("opp_hand") >= 0 ||
    c.check.indexOf("side_cost_equal") >= 0 ||
    c.check === "ability_pick_one" ||
    c.check === "live_start_sunny_day_song_tiered";
  if (needDelegate) {
    const has =
      simSrc.includes(`cl.template === "${c.check}"`) ||
      (c.check === "ability_pick_one" && simSrc.includes('cl.template === "live_success_pick_options"'));
    if (!has) errs.push("handler marker missing");
    const delegateOk = OPPONENT_DUAL_DELEGATE_HELPERS.some((fn) => simSrc.includes(fn));
    if (!delegateOk) errs.push("dual delegate helpers missing");
  }
  if (
    c.check === "requiresOwnStageCostSumLowerThanOpponent" ||
    c.check === "requiresOwnStageHeartTotalHigherThanOpponent" ||
    c.check === "requiresSuccessLiveCountTieWithOpponent"
  ) {
    if (!simSrc.includes("opponentStageTotalPrintedCost")) errs.push("opponent cost helper missing");
  }
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.check);
  }
}

/* Phase 3: online read 同期（VersusPublicBoard v2）の静的チェック */
const vbsSrc = fs.readFileSync(path.join(ROOT, "js/versusBoardSync.js"), "utf8");
const V2_CHECKS = [
  ["VERSUS_BOARD_PUBLIC_V = 2", vbsSrc.includes("VERSUS_BOARD_PUBLIC_V = 2")],
  ["VERSUS_BOARD_AGGREGATE_FIELDS", vbsSrc.includes("VERSUS_BOARD_AGGREGATE_FIELDS")],
  ["v1 read compat", vbsSrc.includes("isAcceptableVersusBoardVersion")],
  ["aggregate fingerprint", /aggFp/.test(vbsSrc)],
  ["computeVersusBoardAggregates", simSrc.includes("computeVersusBoardAggregates")],
  ["liveFrameScore read", simSrc.includes("board.liveFrameScore")],
  ["successLiveCount read", simSrc.includes("successLiveCount")],
  ["stageHeartTotal read", simSrc.includes("stageHeartTotal")],
  ["stageWaitCount read", simSrc.includes("stageWaitCount")],
  ["score bump push hook", /bumpLiveScoreEffectBonus[\s\S]{0,600}scheduleVersusBoardPublicSync/.test(simSrc)],
];
let v2failed = 0;
for (const [label, ok] of V2_CHECKS) {
  if (ok) console.log("OK online-read-v2", label);
  else {
    v2failed++;
    console.error("FAIL online-read-v2", label);
  }
}

/* Phase 4: online 効果プロトコル（mutate / choice）の静的チェック */
const vmSrc = fs.readFileSync(path.join(ROOT, "js/versusMatch.js"), "utf8");
const P4_CHECKS = [
  ["versusMatch requestVersusEffectAction", vmSrc.includes("export async function requestVersusEffectAction")],
  ["versusMatch resolveVersusEffectAction", vmSrc.includes("export async function resolveVersusEffectAction")],
  ["versusMatch requestVersusChoiceAction", vmSrc.includes("export async function requestVersusChoiceAction")],
  ["versusMatch resolveVersusChoiceAction", vmSrc.includes("export async function resolveVersusChoiceAction")],
  ["sim runVersusOnlineOpponentMutate", simSrc.includes("function runVersusOnlineOpponentMutate")],
  ["sim runVersusOnlineOpponentChoice", simSrc.includes("function runVersusOnlineOpponentChoice")],
  ["sim applyVersusEffectPatchLocally", simSrc.includes("function applyVersusEffectPatchLocally")],
  ["sim syncVersusEffectProtocol hooked", /syncVersusEffectProtocol\(remoteMatch\)/.test(simSrc)],
  ["patchKind stage_wait_members", simSrc.includes('"stage_wait_members"')],
  ["patchKind waiting_to_deck_bottom", simSrc.includes('"waiting_to_deck_bottom"')],
  ["patchKind stage_grant_heart", simSrc.includes('"stage_grant_heart"')],
  ["patchKind deck_draw_top", simSrc.includes('"deck_draw_top"')],
  ["runOnTargetPlayerBoard online unblock", /runOnTargetPlayerBoard\(target, fn, onlineReq\)/.test(simSrc)],
  ["template1 wait via protocol", /runOptionalSelfWaitOppStageOnline[\s\S]{0,1600}stage_wait_members/.test(simSrc)],
  ["template3 wdb via protocol", /live_start_pick_player_waiting_deck_bottom"[\s\S]{0,6000}waiting_to_deck_bottom/.test(simSrc)],
  ["template4 choice via protocol", /toujou_wait_pick_opp_live"[\s\S]{0,4000}runVersusOnlineOpponentChoice/.test(simSrc)],
  ["template2 online public stage", /listOpponentStageMembersExcludingName[\s\S]{0,900}listOnlineOpponentStageMembers/.test(simSrc)],
  ["remote choice dialog wired", simSrc.includes("dlg-versus-remote-choice")],
  ["idempotent applied ids", simSrc.includes("appliedEffectIds")],
];
let p4failed = 0;
for (const [label, ok] of P4_CHECKS) {
  if (ok) console.log("OK online-effect-p4", label);
  else {
    p4failed++;
    console.error("FAIL online-effect-p4", label);
  }
}

/* Phase 5: passive online 同期 + patchKind 横展開 + v2 集計追加 */
const boardSrc = fs.readFileSync(path.join(ROOT, "js/versusBoardSync.js"), "utf8");
const P5_CHECKS = [
  [
    "passive recompute on opp board change",
    /applyVersusOpponentBoardFromRemote[\s\S]{0,2400}syncJoujiPassiveEffectsAll\(\)/.test(simSrc),
  ],
  [
    "ctx eachOpponentStageColumnMemberInsts online branch",
    /eachOpponentStageColumnMemberInsts[\s\S]{0,600}versusOnlineActive\(\)[\s\S]{0,200}listOnlineOpponentStageMembers/.test(
      simSrc,
    ),
  ],
  [
    "ctx inactiveOpponentJoujiLiveNeedHeartBump online branch",
    /inactiveOpponentJoujiLiveNeedHeartBump[\s\S]{0,600}imposeOpponentLiveNeedHeartDelta/.test(simSrc),
  ],
  [
    "aggregate imposeOpponentLiveNeedHeartDelta emitted",
    /imposeOpponentLiveNeedHeartDelta:\s*Math\.max/.test(simSrc),
  ],
  ["aggregate bonusHeartSurplusTotal emitted", /bonusHeartSurplusTotal:\s*bonusHeartSurplus/.test(simSrc)],
  [
    "v2 field list includes imposeOpponentLiveNeedHeartDelta",
    boardSrc.includes('"imposeOpponentLiveNeedHeartDelta"'),
  ],
  ["v2 field list includes bonusHeartSurplusTotal", boardSrc.includes('"bonusHeartSurplusTotal"')],
  ["patchKind stage_activate_members", simSrc.includes('"stage_activate_members"')],
  ["patchKind stage_return_waiting", simSrc.includes('"stage_return_waiting"')],
  ["patchKind hand_discard_pick", simSrc.includes('"hand_discard_pick"')],
  ["patchKind hand_to_waiting", simSrc.includes('"hand_to_waiting"')],
  ["patchKind waiting_to_hand", simSrc.includes('"waiting_to_hand"')],
  ["patchKind live_to_waiting", simSrc.includes('"live_to_waiting"')],
  ["patchKind energy_to_wait", simSrc.includes('"energy_to_wait"')],
  ["patchKind energy_discard", simSrc.includes('"energy_discard"')],
  ["patchKind success_live_to_waiting", simSrc.includes('"success_live_to_waiting"')],
  ["patchKind deck_discard_top", simSrc.includes('"deck_discard_top"')],
  ["patchKind deck_shuffle", simSrc.includes('"deck_shuffle"')],
];
let p5failed = 0;
for (const [label, ok] of P5_CHECKS) {
  if (ok) console.log("OK online-effect-p5", label);
  else {
    p5failed++;
    console.error("FAIL online-effect-p5", label);
  }
}

if (failed || v2failed || p4failed || p5failed) {
  console.error(`\n${failed + v2failed + p4failed + p5failed} dual-mode smoke check(s) failed`);
  process.exit(1);
}
console.log(
  `\nAll ${CASES.length + V2_CHECKS.length + P4_CHECKS.length + P5_CHECKS.length} dual-mode smoke checks passed`,
);
