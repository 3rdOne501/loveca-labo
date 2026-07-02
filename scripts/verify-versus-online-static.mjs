#!/usr/bin/env node
/**
 * 対戦モード online 実装の静的回帰チェック（Phase 6・Playwright 不要）。
 * 用法: node scripts/verify-versus-online-static.mjs
 * 失敗時 exit 1 — verify-ability-coverage から連鎖 invoke される。
 *
 * 検証内容:
 *  1. applyVersusEffectPatchLocally に全 patchKind 分岐がある
 *  2. runVersusOnlineOpponentMutate / runVersusOnlineOpponentChoice が simulator.js に存在
 *  3. syncVersusEffectProtocol が applyRemoteVersusMatch から呼ばれる
 *  4. VersusPublicBoard v2 集計フィールドが boardToVersusPublicFromState の出力に載る
 *  5. Phase 5 サンプリング表の代表 template が versusOnlineSkipTemplates に含まれない
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const simSrc = fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8");

/** @type {[string, boolean][]} */
const checks = [];

/* --- 1. patchKind 分岐（対象側適用） --- */
const REQUIRED_PATCH_KINDS = [
  // Phase 4
  "stage_wait_members",
  "stage_grant_heart",
  "deck_draw_top",
  "waiting_to_deck_bottom",
  // Phase 5
  "stage_activate_members",
  "stage_return_waiting",
  "hand_discard_pick",
  "hand_to_waiting",
  "waiting_to_hand",
  "live_to_waiting",
  "energy_to_wait",
  "energy_discard",
  "success_live_to_waiting",
  "deck_discard_top",
  "deck_shuffle",
];
const patchBodyStart = simSrc.indexOf("function applyVersusEffectPatchLocally");
checks.push(["applyVersusEffectPatchLocally 存在", patchBodyStart >= 0]);
for (const pk of REQUIRED_PATCH_KINDS) {
  /* `patchKind === "X"` は applyVersusEffectPatchLocally 内のみに出現 */
  checks.push([`patchKind 分岐: ${pk}`, simSrc.includes(`patchKind === "${pk}"`)]);
}

/* --- 2. 発動側リクエスト関数 --- */
checks.push([
  "runVersusOnlineOpponentMutate 存在",
  simSrc.includes("function runVersusOnlineOpponentMutate"),
]);
checks.push([
  "runVersusOnlineOpponentChoice 存在",
  simSrc.includes("function runVersusOnlineOpponentChoice"),
]);
checks.push([
  "runOnTargetPlayerBoard online → onlineReq/patchKind 経路",
  /runOnTargetPlayerBoard\(target, fn, onlineReq\)/.test(simSrc) &&
    /onlineReq\.payload\.patchKind/.test(simSrc),
]);

/* --- 3. syncVersusEffectProtocol フック --- */
const applyRemoteStart = simSrc.indexOf("function applyRemoteVersusMatch");
const applyRemoteBody =
  applyRemoteStart >= 0 ? simSrc.slice(applyRemoteStart, applyRemoteStart + 4000) : "";
checks.push([
  "syncVersusEffectProtocol が applyRemoteVersusMatch から呼ばれる",
  /syncVersusEffectProtocol\(remoteMatch\)/.test(applyRemoteBody),
]);
/* Phase 5: 相手盤変化で常時再計算 */
const applyOppBoardStart = simSrc.indexOf("function applyVersusOpponentBoardFromRemote");
const applyOppBoardBody =
  applyOppBoardStart >= 0 ? simSrc.slice(applyOppBoardStart, applyOppBoardStart + 4000) : "";
checks.push([
  "applyVersusOpponentBoardFromRemote で syncJoujiPassiveEffectsAll 再計算",
  /syncJoujiPassiveEffectsAll\(\)/.test(applyOppBoardBody),
]);

/* --- 4. v2 集計フィールドが公開ボード出力に載る（機能チェック） --- */
const V2_MUST_INCLUDE = [
  "successLiveScoreSum",
  "stageWaitCount",
  "stageMemberCount",
  "energyCount",
  "imposeOpponentLiveNeedHeartDelta",
  "bonusHeartSurplusTotal",
];
try {
  const mod = await import(path.join(ROOT, "js/versusBoardSync.js"));
  const { boardToVersusPublicFromState, VERSUS_BOARD_AGGREGATE_FIELDS } = mod;
  const emptySt = {
    deck: [],
    hand: [],
    stage: { left: [], center: [], right: [] },
    liveArea: { left: [], center: [], right: [] },
    waitingRoom: [],
    resolutionArea: [],
    successfulLiveArea: [],
    energyArea: [],
    turnCount: 1,
  };
  /** @type {Record<string, number>} */
  const agg = {};
  V2_MUST_INCLUDE.forEach((k, i) => {
    agg[k] = i + 1;
  });
  const board = boardToVersusPublicFromState(emptySt, agg);
  for (const k of V2_MUST_INCLUDE) {
    checks.push([
      `v2 集計フィールド出力: ${k}`,
      VERSUS_BOARD_AGGREGATE_FIELDS.includes(k) && Number(board[k]) >= 1,
    ]);
  }
} catch (err) {
  checks.push([`versusBoardSync import (${err && err.message})`, false]);
}

/* --- 5. サンプリング代表 template が versusOnlineSkipTemplates に含まれない --- */
const SAMPLING_REP_TEMPLATES = [
  "optional_self_wait_opp_stage",
  "toujou_wait_pick_opp_live",
  "yell_resolution_pick_hand",
];
const auditPath = path.join(ROOT, "docs/behavioral-audit.json");
if (fs.existsSync(auditPath)) {
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const skip = new Set(audit.versusOnlineSkipTemplates || []);
  for (const t of SAMPLING_REP_TEMPLATES) {
    checks.push([`代表 template 非 skip: ${t}`, !skip.has(t)]);
  }
  checks.push([
    "versusOnlineSkipTemplates 0 件（回帰防止）",
    (audit.versusOnlineSkipTemplates || []).length === 0,
  ]);
} else {
  checks.push(["docs/behavioral-audit.json 存在（audit を先に実行）", false]);
}

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log("OK versus-online-static", label);
  } else {
    failed++;
    console.error("FAIL versus-online-static", label);
  }
}
if (failed) {
  console.error(`\n${failed} versus-online-static check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} versus-online-static checks passed`);
