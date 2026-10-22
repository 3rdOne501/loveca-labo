#!/usr/bin/env node
/**
 * ラブカ ティアリストメーカーの**複数クライアント統合シミュレーション**（実 Firebase 不要）。
 * 用法: node scripts/verify-tierlist-room-sim.mjs
 * 失敗時 exit 1。
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { __setTestCloudFirestore } = await import(path.join(ROOT, "js/cloudAuth.js"));
const tl = await import(path.join(ROOT, "js/tierListRoomSync.js"));

function makeMockFirestore() {
  /** @type {Map<string, Record<string, any>>} */
  const store = new Map();
  /** @type {Map<string, Set<Function>>} */
  const docListeners = new Map();
  /** @type {Map<string, Set<Function>>} */
  const collListeners = new Map();
  const DELETE = { __deleteField: true };

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function parentCollection(docPath) {
    const i = docPath.lastIndexOf("/");
    return i < 0 ? "" : docPath.slice(0, i);
  }

  function notify(docPath) {
    const ds = docListeners.get(docPath);
    if (ds) ds.forEach((cb) => cb(makeDocSnap(docPath)));
    const cs = collListeners.get(parentCollection(docPath));
    if (cs) cs.forEach((cb) => cb(makeQuerySnap(parentCollection(docPath))));
  }

  function makeDocSnap(docPath) {
    const has = store.has(docPath);
    const data = has ? clone(store.get(docPath)) : null;
    return {
      id: docPath.slice(docPath.lastIndexOf("/") + 1),
      exists: () => has,
      data: () => data,
    };
  }

  function docsIn(collPath) {
    const out = [];
    store.forEach(function (_v, k) {
      if (parentCollection(k) === collPath) out.push(k);
    });
    return out.sort();
  }

  function makeQuerySnap(collPath) {
    const paths = docsIn(collPath);
    return {
      size: paths.length,
      forEach(fn) {
        paths.forEach((p) => fn(makeDocSnap(p)));
      },
    };
  }

  function applyPatch(target, patch) {
    Object.keys(patch).forEach(function (rawKey) {
      const value = patch[rawKey];
      const segs = String(rawKey).split(".");
      let node = target;
      for (let i = 0; i < segs.length - 1; i++) {
        const s = segs[i];
        if (node[s] == null || typeof node[s] !== "object") node[s] = {};
        node = node[s];
      }
      const last = segs[segs.length - 1];
      if (value && value.__deleteField) delete node[last];
      else node[last] = clone(value);
    });
  }

  const api = {
    doc(_db, ...segs) {
      return { __path: segs.map(String).join("/"), __kind: "doc" };
    },
    collection(_db, ...segs) {
      return { __path: segs.map(String).join("/"), __kind: "coll" };
    },
    deleteField() {
      return DELETE;
    },
    async getDoc(ref) {
      return makeDocSnap(ref.__path);
    },
    async getDocs(ref) {
      return makeQuerySnap(ref.__path);
    },
    async setDoc(ref, value) {
      store.set(ref.__path, clone(value));
      notify(ref.__path);
    },
    async updateDoc(ref, patch) {
      if (!store.has(ref.__path)) {
        const err = new Error("No document to update: " + ref.__path);
        err.code = "not-found";
        throw err;
      }
      const cur = store.get(ref.__path);
      applyPatch(cur, patch);
      notify(ref.__path);
    },
    async deleteDoc(ref) {
      store.delete(ref.__path);
      notify(ref.__path);
    },
    onSnapshot(ref, cb) {
      const isColl = ref.__kind === "coll";
      const map = isColl ? collListeners : docListeners;
      if (!map.has(ref.__path)) map.set(ref.__path, new Set());
      map.get(ref.__path).add(cb);
      cb(isColl ? makeQuerySnap(ref.__path) : makeDocSnap(ref.__path));
      return function () {
        map.get(ref.__path).delete(cb);
      };
    },
  };

  return { api, _store: store };
}

const failures = [];
let checks = 0;

function ok(cond, label) {
  checks++;
  if (!cond) failures.push(label);
}

function eq(actual, expected, label) {
  checks++;
  if (actual !== expected) {
    failures.push(label + " — expected " + JSON.stringify(expected) + " got " + JSON.stringify(actual));
  }
}

async function throws(fn, label) {
  checks++;
  try {
    await fn();
    failures.push(label + " — 例外が投げられなかった");
    return null;
  } catch (err) {
    return err;
  }
}

const mock = makeMockFirestore();
const USERS = {
  A: { uid: "uid_a", displayName: "あんじゅ" },
  B: { uid: "uid_b", displayName: "せつ菜" },
  C: { uid: "uid_c", displayName: "かすみ" },
};

function actAs(who) {
  __setTestCloudFirestore({ db: {}, api: mock.api, user: USERS[who] });
}

/* A. 作成・参加 */
actAs("A");
const created = await tl.createTierListRoom("最強ティアを決めよう");
const CODE = created.code;
eq(CODE.length, 5, "A: ルームコードは5文字");
eq(created.room.hostUid, USERS.A.uid, "A: 作成者がホスト");
eq(tl.tierListSortedTiers(created.room).length, 5, "A: 既定ティアは S〜D の5つ");
eq(tl.tierListSortedTiers(created.room)[0].id, "S", "A: 先頭は S");

let lastRoom = null;
let lastEntries = [];
const unsubRoom = tl.watchTierListRoom(CODE, function (room) {
  lastRoom = room;
});
const unsubEntries = tl.watchTierListEntries(CODE, function (entries) {
  lastEntries = entries;
});
ok(!!lastRoom, "H: ルーム購読は初回配信する");

actAs("B");
await tl.joinTierListRoom(CODE.toLowerCase());
actAs("C");
await tl.joinTierListRoom(CODE);
eq(Object.keys(lastRoom.members).length, 3, "A: 3人が参加");

/* B. ティア編集はホスト限定 */
actAs("B");
await throws(() => tl.addTierListTier(CODE, { label: "E" }), "B: 非ホストはティア追加不可");
actAs("A");
const tierE = await tl.addTierListTier(CODE, { label: "E", color: "#7fbfff" });
eq(tl.tierListSortedTiers(lastRoom).length, 6, "B: ティアが6つ");
await tl.updateTierListTier(CODE, "S", { label: "神" });
eq(lastRoom.tiers.S.label, "神", "B: ティア名変更");

/* C. 配置・移動（全員可） */
actAs("B");
const e1 = await tl.placeTierListCard(CODE, { cardNo: "PL!S-bp1-019-L", tierId: tl.TIERLIST_POOL_ID });
eq(e1.tierId, tl.TIERLIST_POOL_ID, "C: 未配置に追加");
eq(e1.byUid, USERS.B.uid, "C: 追加者を記録");

actAs("C");
await tl.placeTierListCard(CODE, { cardNo: "PL!S-bp1-019-L", tierId: "S" });
const moved = lastEntries.find((e) => e.cardNo === "PL!S-bp1-019-L");
eq(moved.tierId, "S", "C: 他ユーザーが移動できる");
eq(moved.byUid, USERS.B.uid, "C: 移動しても byUid は変わらない");
eq(moved.movedByUid, USERS.C.uid, "C: 移動者は movedByUid");

actAs("A");
await tl.placeTierListCard(CODE, { cardNo: "PL!-bp1-001", tierId: "A" });
await tl.placeTierListCard(CODE, { cardNo: "PL!-bp1-002", tierId: "B" });
eq(lastEntries.length, 3, "C: 3枚配置");

/* D. 同時移動でも cardNo/byUid が壊れない */
actAs("B");
await tl.placeTierListCard(CODE, { cardNo: "PL!-bp1-001", tierId: "S" });
actAs("C");
await tl.placeTierListCard(CODE, { cardNo: "PL!-bp1-002", tierId: "S" });
const c1 = lastEntries.find((e) => e.cardNo === "PL!-bp1-001");
const c2 = lastEntries.find((e) => e.cardNo === "PL!-bp1-002");
eq(c1.tierId, "S", "D: カード1は S");
eq(c2.tierId, "S", "D: カード2は S");
eq(c1.byUid, USERS.A.uid, "D: カード1の byUid 保持");
eq(c2.byUid, USERS.A.uid, "D: カード2の byUid 保持");

/* E. 削除権限 */
actAs("C");
await throws(() => tl.removeTierListCard(CODE, "PL!S-bp1-019-L"), "E: 非追加者・非ホストは削除不可");
actAs("B");
await tl.removeTierListCard(CODE, "PL!S-bp1-019-L");
eq(lastEntries.some((e) => e.cardNo === "PL!S-bp1-019-L"), false, "E: 追加者は削除可");

/* F. ティア削除でカードは未配置へ */
actAs("A");
await tl.placeTierListCard(CODE, { cardNo: "PL!-bp1-003", tierId: tierE.id });
await tl.removeTierListTier(CODE, tierE.id);
eq(!!lastRoom.tiers[tierE.id], false, "F: ティア削除");
const toPool = lastEntries.find((e) => e.cardNo === "PL!-bp1-003");
eq(toPool.tierId, tl.TIERLIST_POOL_ID, "F: カードは未配置へ");

actAs("B");
await throws(() => tl.removeTierListTier(CODE, "S"), "F: 非ホストはティア削除不可");

/* G. 退室・終了 */
actAs("C");
await tl.leaveTierListRoom(CODE);
ok(!lastRoom.members[USERS.C.uid], "G: 退室");

actAs("B");
await throws(() => tl.closeTierListRoom(CODE), "G: 非ホストは終了不可");
actAs("A");
await tl.closeTierListRoom(CODE);
eq(lastRoom, null, "G: ルーム削除");
eq(lastEntries.length, 0, "G: entries も削除");

unsubRoom();
unsubEntries();
__setTestCloudFirestore(null);

if (failures.length) {
  console.error("verify-tierlist-room-sim: NG (" + failures.length + "/" + checks + ")");
  failures.forEach(function (f) {
    console.error("  - " + f);
  });
  process.exit(1);
}
console.log("verify-tierlist-room-sim: OK (" + checks + " checks)");
