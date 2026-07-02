#!/usr/bin/env node
/**
 * localDual Phase 1 — 優先10件の分類・デュアルヘルパー存在検証（静的スモーク）。
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

/** @type {Array<{id:string, trigger:string, expectTemplate:string, dualMarkers?:string[]}>} */
const CASES = [
  {
    id: "PL!SP-bp2-011-P",
    trigger: "toujyou",
    expectTemplate: "toujou_wait_pick_opp_live",
    dualMarkers: ["opponentDecisionLeadPrefix", "openPickFromWaitingDialog"],
  },
  {
    id: "PL!N-bp3-010-P",
    trigger: "live_start",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
    dualMarkers: ["openPickSelfOrOpponentDialog", "runOnTargetPlayerBoard", "whenOpponentPlayMode"],
  },
  {
    id: "PL!S-bp3-007-P",
    trigger: "kidou",
    expectTemplate: "live_start_pick_player_waiting_deck_bottom",
    dualMarkers: ["openPickSelfOrOpponentDialog", "runOnTargetPlayerBoard"],
  },
  {
    id: "PL!-bp3-002-P",
    trigger: "toujyou",
    expectTemplate: "optional_self_wait_opp_stage",
    dualMarkers: ["whenOpponentPlayMode", "mutateInactiveOpponentBoard", "openSoloOpponentMemberWaitPickMultiDialog"],
  },
  {
    id: "PL!HS-cl1-012-CL",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    dualMarkers: ["checkYellRevealedPreconditionFilters", "opponentLiveScoreEstimate", "yellPreconditionNeedsSoloOpponentLiveScore"],
  },
  {
    id: "PL!N-bp1-026-L",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    dualMarkers: ["checkYellRevealedPreconditionFilters", "opponentLiveScoreEstimate"],
  },
  {
    id: "PL!S-bp5-019-L",
    trigger: "live_success",
    expectTemplate: "yell_resolution_pick_hand",
    dualMarkers: ["countOpponentSuccessLiveCards", "yellPreconditionNeedsSoloOpponentSuccessLiveCount"],
  },
  {
    id: "PL!N-bp4-004-P",
    trigger: "live_start",
    expectTemplate: "live_start_draw_opp_wait",
    dualMarkers: ["openSoloOpponentMemberWaitPickMultiDialog"],
  },
  {
    id: "PL!N-bp3-011-P",
    trigger: "toujyou",
    expectTemplate: "toujou_opp_stage_member_match_grant",
    dualMarkers: ["listOpponentStageMembersExcludingName", "opponentDecisionLeadPrefix"],
  },
  {
    id: "PL!-bp3-022-L",
    trigger: "live_start",
    expectTemplate: "live_start_deck_reveal_both_stage_members_score",
    dualMarkers: ["countBothPlayersStageMembers"],
  },
];

function handlerChunkForTemplate(tmpl) {
  const marker = `cl.template === "${tmpl}"`;
  const idx = simSrc.indexOf(marker);
  if (idx < 0) return "";
  const slice = simSrc.slice(idx, idx + 14000);
  const next = slice.search(/\n    if \(cl\.template === "/);
  return next > 0 ? slice.slice(0, next) : slice;
}

function chunkHasDualSupport(chunk) {
  if (!chunk) return false;
  if (/isDualOpponentBoardMode/.test(chunk)) return true;
  return OPPONENT_DUAL_DELEGATE_HELPERS.some((fn) => chunk.includes(fn));
}

function mergedAbilityFilters(cl) {
  return Object.assign({}, cl.preconditionFilters || {}, cl.filters || {});
}

let failed = 0;

for (const c of CASES) {
  const card = cards[c.id];
  const errs = [];
  if (!card) {
    errs.push("card missing");
  } else {
    const seg = splitAbilityByTriggers(cardAbilityRawText(card)).find((s) => s.trigger === c.trigger);
    if (!seg) errs.push("trigger segment missing");
    else {
      const cl = classifyCardAbility(card, c.trigger, seg.text);
      if (cl.template !== c.expectTemplate) {
        errs.push(`template ${cl.template} != ${c.expectTemplate}`);
      }
      const chunk = handlerChunkForTemplate(c.expectTemplate);
      if (!chunk) errs.push("handler chunk missing");
      else if (!chunkHasDualSupport(chunk)) {
        const mf = mergedAbilityFilters(cl);
        const precondDual =
          mf.requiresLiveScoreHigherThanOpponent ||
          mf.requiresLiveScoreTieWithOpponent ||
          mf.minEitherSuccessLiveCount != null;
        if (!(c.expectTemplate === "yell_resolution_pick_hand" && precondDual)) {
          errs.push("dual support not detected in handler");
        }
      }
      for (const m of c.dualMarkers || []) {
        if (!simSrc.includes(m)) errs.push(`simulator helper missing: ${m}`);
      }
    }
  }
  if (errs.length) {
    failed++;
    console.error("FAIL", c.id, c.trigger, errs.join("; "));
  } else {
    console.log("OK", c.id, c.trigger, c.expectTemplate);
  }
}

if (failed) {
  console.error(`\n${failed} Phase 1 dual check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${CASES.length} Phase 1 dual checks passed`);
