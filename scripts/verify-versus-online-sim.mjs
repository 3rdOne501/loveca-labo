#!/usr/bin/env node
/**
 * 対戦モード online の**2クライアント統合シミュレーション**（Playwright / 実 Firebase 不要）。
 * 用法: node scripts/verify-versus-online-sim.mjs
 * 失敗時 exit 1 — verify-ability-coverage から連鎖 invoke される。
 *
 * 目的:
 *   手動 2 ブラウザ検証（docs/versus-mode-fullmatch-checklist.md）を自動化する。
 *   in-memory の Firestore モックを cloudAuth に注入し、**実コードの** versusMatch.js
 *   （requestVersusEffectAction 等）と純粋モジュール versusEffectPatch.js を使って、
 *   host / guest 2 クライアント間の効果プロトコル往復をヘッドレスに回す。
 *
 * 検証内容:
 *   A. 15 patchKind すべてが「依頼→対象が自盤へ適用→ack→依頼側 resolve」で通る
 *   B. choice プロトコル往復（対象が選び、依頼側が pickedIds を受領）
 *   C. 冪等性（同一 snapshot の再処理で二重適用しない）
 *   D. 排他（処理待ちの効果 / boardActionRequest 中は新規リクエストを弾く）
 *   E. タイムアウト取消（対象未応答 → cancel で cancelled 化）
 *   F. passive 集計フィールド（v2）が公開盤面契約に含まれる
 *
 * syncVersusEffectProtocol（simulator.js 内・DOM 依存）の検出ロジックはこのハーネスで
 * ミラー実装している。対象側の「適用→resolve」「依頼側の ack 受領」の順序と条件は
 * simulator.js と同型。書き込みは常に実 versusMatch.js を経由するのでフィールド名は本番と一致。
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { __setTestCloudFirestore } = await import(path.join(ROOT, "js/cloudAuth.js"));
const vm = await import(path.join(ROOT, "js/versusMatch.js"));
const { applyVersusEffectPatch, VERSUS_EFFECT_PATCH_KINDS } = await import(
  path.join(ROOT, "js/versusEffectPatch.js")
);
const { VERSUS_BOARD_AGGREGATE_FIELDS } = await import(path.join(ROOT, "js/versusBoardSync.js"));

/* ------------------------------------------------------------------ *
 * in-memory Firestore モック（doc / getDoc / updateDoc）
 * ------------------------------------------------------------------ */
function makeMockFirestore() {
  /** @type {Map<string, Record<string, any>>} */
  const store = new Map();
  let version = 0;

  function keyOf(ref) {
    return ref.__coll + "/" + ref.__id;
  }
  const api = {
    doc(_db, coll, id) {
      return { __coll: coll, __id: String(id) };
    },
    async getDoc(ref) {
      const k = keyOf(ref);
      const has = store.has(k);
      const data = has ? JSON.parse(JSON.stringify(store.get(k))) : null;
      return {
        exists() {
          return has;
        },
        data() {
          return data;
        },
      };
    },
    async setDoc(ref, value, opts) {
      const k = keyOf(ref);
      const cur = opts && opts.merge && store.has(k) ? store.get(k) : {};
      store.set(k, Object.assign({}, cur, JSON.parse(JSON.stringify(value))));
      version++;
    },
    async updateDoc(ref, patch) {
      const k = keyOf(ref);
      if (!store.has(k)) throw new Error("updateDoc: no such doc " + k);
      const cur = store.get(k);
      Object.assign(cur, JSON.parse(JSON.stringify(patch)));
      version++;
    },
  };
  return {
    api,
    _store: store,
    _seed(coll, id, data) {
      store.set(coll + "/" + String(id), JSON.parse(JSON.stringify(data)));
    },
    _get(coll, id) {
      return store.get(coll + "/" + String(id));
    },
    _version() {
      return version;
    },
  };
}

/* ------------------------------------------------------------------ *
 * クライアント（simulator.js syncVersusEffectProtocol のミラー）
 * ------------------------------------------------------------------ */
function makeClient(role, board) {
  return {
    role,
    board,
    /** 適用済み requestId（冪等性のため） */
    appliedEffect: new Set(),
    appliedChoice: new Set(),
    /** 依頼中で ack/response 待ちの解決関数 */
    pendingEffect: null,
    pendingChoice: null,
    /** choice 対象側の自動応答ポリシー: 先頭 pickCount 件 */
    choicePolicy(req) {
      const n = Math.max(1, Math.floor(Number(req.pickCount) || 1));
      return (req.options || []).slice(0, n).map((o) => String(o.id));
    },
  };
}

const ROOM = "TEST";

async function clientSync(client, doc) {
  const my = client.role;
  const opp = my === "host" ? "guest" : "host";

  /* 1. 相手が自分（=対象）に投げた効果リクエストを自盤へ適用して resolve */
  const oppReq = doc[opp + "EffectRequest"];
  if (oppReq && oppReq.status === "pending" && !client.appliedEffect.has(oppReq.id)) {
    client.appliedEffect.add(oppReq.id);
    const r = applyVersusEffectPatch(client.board, oppReq.payload);
    await vm.resolveVersusEffectAction(ROOM, opp, oppReq.id, {
      ok: r.ok,
      resultPayload: { applied: r.applied },
    });
  }
  /* 2. 相手が投げた選択リクエストへ自動応答 */
  const oppCho = doc[opp + "ChoiceRequest"];
  if (oppCho && oppCho.status === "pending" && !client.appliedChoice.has(oppCho.id)) {
    client.appliedChoice.add(oppCho.id);
    await vm.resolveVersusChoiceAction(ROOM, opp, oppCho.id, client.choicePolicy(oppCho));
  }
  /* 3. 自分の依頼への ack を受領 → pending 解決 */
  const myAck = doc[my + "EffectAck"];
  if (myAck && client.pendingEffect && myAck.requestId === client.pendingEffect.id) {
    const p = client.pendingEffect;
    client.pendingEffect = null;
    p.resolve(myAck);
  }
  const myResp = doc[my + "ChoiceResponse"];
  if (myResp && client.pendingChoice && myResp.requestId === client.pendingChoice.id) {
    const p = client.pendingChoice;
    client.pendingChoice = null;
    p.resolve(myResp);
  }
}

let mock, host, guest;

/** 書き込みが収束するまで両クライアントの sync を回す */
async function pump() {
  for (let i = 0; i < 20; i++) {
    const before = mock._version();
    const snap = await mock.api.getDoc(mock.api.doc(null, "versusMatches", ROOM));
    const doc = snap.data() || {};
    await clientSync(host, doc);
    await clientSync(guest, doc);
    if (mock._version() === before) return;
  }
  throw new Error("pump: did not converge");
}

async function sendMutate(client, patchPayload, meta) {
  const req = await vm.requestVersusEffectAction(ROOM, client.role, {
    kind: (meta && meta.kind) || "test_mutate",
    cardNo: (meta && meta.cardNo) || "TEST-000",
    template: (meta && meta.template) || "test_template",
    patchPayload,
  });
  const promise = new Promise((resolve) => {
    client.pendingEffect = { id: req.id, resolve };
  });
  return { reqId: req.id, promise };
}

async function sendChoice(client, choicePayload) {
  const req = await vm.requestVersusChoiceAction(ROOM, client.role, choicePayload);
  const promise = new Promise((resolve) => {
    client.pendingChoice = { id: req.id, resolve };
  });
  return { reqId: req.id, promise };
}

/* ------------------------------------------------------------------ *
 * テスト用の盤面ファクトリ
 * ------------------------------------------------------------------ */
function freshBoard() {
  return {
    deck: [{ id: "d1" }, { id: "d2" }, { id: "d3" }],
    hand: [{ id: "h1" }, { id: "h2" }],
    stage: {
      left: [{ id: "s1", lcActive: true }],
      center: [{ id: "s2", lcActive: true }],
      right: [{ id: "s3", lcActive: true }],
    },
    liveArea: { left: [{ id: "L1", type: "ライブ" }], center: [], right: [] },
    waitingRoom: [{ id: "w1" }, { id: "w2" }],
    resolutionArea: [],
    successfulLiveArea: [{ id: "sl1" }, { id: "sl2" }],
    energyArea: [
      { id: "e1", lcActive: true },
      { id: "e2", lcActive: true },
    ],
  };
}

function resetRoom() {
  mock = makeMockFirestore();
  mock._seed("versusMatches", ROOM, {
    v: 2,
    roomCode: ROOM,
    status: "playing",
    hostUid: "uid-host",
    guestUid: "uid-guest",
    updatedAt: new Date().toISOString(),
  });
  __setTestCloudFirestore({ db: {}, api: mock.api, user: { uid: "uid-host" } });
}

/* ------------------------------------------------------------------ *
 * アサーション
 * ------------------------------------------------------------------ */
/** @type {[string, boolean, string?][]} */
const checks = [];
function check(label, ok, detail) {
  checks.push([label, !!ok, detail]);
}

/* ---- A. 15 patchKind 往復 ---- */
/**
 * @param {string} pk
 * @param {(target:any)=>{payload:object, verify:(target:any,ack:any)=>boolean}} spec
 */
async function runPatchKindCase(pk, spec) {
  resetRoom();
  host = makeClient("host", freshBoard());
  guest = makeClient("guest", freshBoard());
  const s = spec(guest.board);
  const { promise } = await sendMutate(host, s.payload, { template: pk });
  await pump();
  const ack = await promise;
  check(`A patchKind ${pk}`, ack && ack.ok === true && s.verify(guest.board, ack), pk);
}

const stageIds = (b) =>
  ["left", "center", "right"].flatMap((c) => (b.stage[c] || []).map((m) => m.id));

async function testAllPatchKinds() {
  await runPatchKindCase("stage_wait_members", (b) => ({
    payload: { patchKind: "stage_wait_members", instIds: ["s1", "s2"] },
    verify: (t) => {
      const w = ["left", "center"].every((c) => (t.stage[c][0] || {}).lcWait === true);
      return w && t.stage.right[0].lcWait !== true;
    },
  }));

  await runPatchKindCase("stage_grant_heart", (b) => ({
    payload: { patchKind: "stage_grant_heart", instId: "s1", slot: 2, count: 3 },
    verify: (t) => (t.stage.left[0].playBonusHeartSlotsAlways || {})[2] === 3,
  }));

  await runPatchKindCase("deck_draw_top", (b) => ({
    payload: { patchKind: "deck_draw_top", count: 2 },
    verify: (t) => t.hand.length === 4 && t.deck.length === 1,
  }));

  await runPatchKindCase("waiting_to_deck_bottom", (b) => ({
    payload: { patchKind: "waiting_to_deck_bottom", instIds: ["w1"] },
    verify: (t) =>
      t.deck[t.deck.length - 1].id === "w1" && !t.waitingRoom.some((c) => c.id === "w1"),
  }));

  await runPatchKindCase("stage_activate_members", (b) => {
    b.stage.left[0].lcActive = false;
    b.stage.left[0].lcWait = true;
    b.stage.left[0].isRotated = true;
    return {
      payload: { patchKind: "stage_activate_members", instIds: ["s1"] },
      verify: (t) => t.stage.left[0].lcActive === true && t.stage.left[0].lcWait === false,
    };
  });

  await runPatchKindCase("stage_return_waiting", (b) => ({
    payload: { patchKind: "stage_return_waiting", instIds: ["s2"] },
    verify: (t) =>
      t.stage.center.length === 0 && t.waitingRoom.some((c) => c.id === "s2"),
  }));

  await runPatchKindCase("hand_discard_pick", (b) => ({
    payload: { patchKind: "hand_discard_pick", count: 1 },
    verify: (t) => t.hand.length === 1 && t.waitingRoom.length === 3,
  }));

  await runPatchKindCase("hand_to_waiting", (b) => ({
    payload: { patchKind: "hand_to_waiting", instIds: ["h1"] },
    verify: (t) => !t.hand.some((c) => c.id === "h1") && t.waitingRoom.some((c) => c.id === "h1"),
  }));

  await runPatchKindCase("waiting_to_hand", (b) => ({
    payload: { patchKind: "waiting_to_hand", instIds: ["w2"] },
    verify: (t) => t.hand.some((c) => c.id === "w2") && !t.waitingRoom.some((c) => c.id === "w2"),
  }));

  await runPatchKindCase("live_to_waiting", (b) => ({
    payload: { patchKind: "live_to_waiting", instIds: ["L1"] },
    verify: (t) => t.liveArea.left.length === 0 && t.waitingRoom.some((c) => c.id === "L1"),
  }));

  await runPatchKindCase("energy_to_wait", (b) => ({
    payload: { patchKind: "energy_to_wait", count: 1 },
    verify: (t) => {
      const waited = t.energyArea.filter((e) => e.lcWait === true).length;
      return waited === 1;
    },
  }));

  await runPatchKindCase("energy_discard", (b) => ({
    payload: { patchKind: "energy_discard", instIds: ["e1"] },
    verify: (t) => !t.energyArea.some((e) => e.id === "e1") && t.waitingRoom.some((c) => c.id === "e1"),
  }));

  await runPatchKindCase("success_live_to_waiting", (b) => ({
    payload: { patchKind: "success_live_to_waiting", count: 1 },
    verify: (t) => t.successfulLiveArea.length === 1 && t.waitingRoom.length === 3,
  }));

  await runPatchKindCase("deck_discard_top", (b) => ({
    payload: { patchKind: "deck_discard_top", count: 2 },
    verify: (t) => t.deck.length === 1 && t.waitingRoom.length === 4,
  }));

  await runPatchKindCase("deck_shuffle", (b) => ({
    payload: { patchKind: "deck_shuffle" },
    verify: (t) => t.deck.length === 3,
  }));

  /* 全 patchKind を網羅したか（漏れ検出） */
  const covered = checks.filter((c) => c[0].startsWith("A patchKind ")).map((c) => c[2]);
  check(
    "A 15 patchKind すべて網羅",
    VERSUS_EFFECT_PATCH_KINDS.every((k) => covered.includes(k)) &&
      covered.length === VERSUS_EFFECT_PATCH_KINDS.length,
    covered.length + "/" + VERSUS_EFFECT_PATCH_KINDS.length,
  );
}

/* ---- B. choice 往復 ---- */
async function testChoiceRoundTrip() {
  resetRoom();
  host = makeClient("host", freshBoard());
  guest = makeClient("guest", freshBoard());
  const { promise } = await sendChoice(host, {
    cardNo: "TEST-CHO",
    template: "opponent_choice_test",
    prompt: "相手が1枚選ぶ",
    options: [
      { id: "o1", label: "A" },
      { id: "o2", label: "B" },
      { id: "o3", label: "C" },
    ],
    pickCount: 1,
  });
  await pump();
  const resp = await promise;
  check(
    "B choice 往復（pickedIds 受領）",
    resp && Array.isArray(resp.pickedIds) && resp.pickedIds.length === 1 && resp.pickedIds[0] === "o1",
    JSON.stringify(resp && resp.pickedIds),
  );
}

/* ---- C. 冪等性: 同一 snapshot を複数回 sync しても二重適用しない ---- */
async function testIdempotency() {
  resetRoom();
  host = makeClient("host", freshBoard());
  guest = makeClient("guest", freshBoard());
  const { promise } = await sendMutate(host, { patchKind: "deck_draw_top", count: 1 }, {});
  /* 対象(guest)の sync を同じ doc に対して 3 回叩く */
  const snap = await mock.api.getDoc(mock.api.doc(null, "versusMatches", ROOM));
  const doc = snap.data() || {};
  await clientSync(guest, doc);
  await clientSync(guest, doc);
  await clientSync(guest, doc);
  await pump();
  await promise;
  check(
    "C 冪等（1回だけ適用）",
    guest.board.hand.length === 3 && guest.board.deck.length === 2,
    "hand=" + guest.board.hand.length + " deck=" + guest.board.deck.length,
  );
}

/* ---- D. 排他制御 ---- */
async function testExclusion() {
  /* D-1: 処理待ち効果がある間は新規リクエスト不可 */
  resetRoom();
  host = makeClient("host", freshBoard());
  guest = makeClient("guest", freshBoard());
  await sendMutate(host, { patchKind: "deck_draw_top", count: 1 }, {}); // pump しない → pending 残存
  let threw = false;
  try {
    await vm.requestVersusEffectAction(ROOM, "host", {
      kind: "test",
      cardNo: "X",
      template: "t",
      patchPayload: { patchKind: "deck_draw_top", count: 1 },
    });
  } catch (_) {
    threw = true;
  }
  check("D-1 処理待ち中は新規効果を拒否", threw);

  /* D-2: boardActionRequest pending 中は効果リクエスト不可 */
  resetRoom();
  const cur = mock._get("versusMatches", ROOM);
  cur.boardActionRequest = { status: "pending", id: "ba1" };
  let threw2 = false;
  try {
    await vm.requestVersusEffectAction(ROOM, "host", {
      kind: "test",
      cardNo: "X",
      template: "t",
      patchPayload: { patchKind: "deck_draw_top", count: 1 },
    });
  } catch (_) {
    threw2 = true;
  }
  check("D-2 boardActionRequest 中は効果を拒否", threw2);
}

/* ---- E. タイムアウト取消 ---- */
async function testCancel() {
  resetRoom();
  host = makeClient("host", freshBoard());
  guest = makeClient("guest", freshBoard());
  const { reqId } = await sendMutate(host, { patchKind: "deck_draw_top", count: 1 }, {});
  /* 対象が応答しない想定で pump せず cancel */
  const ok = await vm.cancelVersusEffectAction(ROOM, "host", reqId);
  const cur = mock._get("versusMatches", ROOM);
  check(
    "E タイムアウト cancel で cancelled 化",
    ok === true && cur.hostEffectRequest && cur.hostEffectRequest.status === "cancelled",
  );
}

/* ---- F. passive 集計フィールド（v2 契約） ---- */
function testPassiveAggregateContract() {
  const need = ["imposeOpponentLiveNeedHeartDelta", "bonusHeartSurplusTotal"];
  check(
    "F v2 集計フィールド契約",
    need.every((f) => VERSUS_BOARD_AGGREGATE_FIELDS.includes(f)),
    need.join(","),
  );
}

/* ------------------------------------------------------------------ */
async function main() {
  await testAllPatchKinds();
  await testChoiceRoundTrip();
  await testIdempotency();
  await testExclusion();
  await testCancel();
  testPassiveAggregateContract();

  __setTestCloudFirestore(null);

  let failed = 0;
  for (const [label, ok, detail] of checks) {
    if (ok) console.log("OK versus-online-sim", label);
    else {
      failed++;
      console.error("FAIL versus-online-sim", label, detail != null ? "(" + detail + ")" : "");
    }
  }
  if (failed) {
    console.error(`\n${failed} versus-online-sim check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} versus-online-sim checks passed`);
}

main().catch((err) => {
  console.error("versus-online-sim crashed:", err);
  process.exit(1);
});
