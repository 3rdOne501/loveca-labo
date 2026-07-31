#!/usr/bin/env node
/**
 * ラブカ最弱カード会議の**複数クライアント統合シミュレーション**（実 Firebase 不要）。
 * 用法: node scripts/verify-weakest-room-sim.mjs
 * 失敗時 exit 1。
 *
 * verify-versus-online-sim.mjs と同じく in-memory Firestore モックを cloudAuth に注入し、
 * **実コードの** js/weakestRoomSync.js を使って複数ユーザーの操作を回す。
 * ドット記法の updateDoc と deleteField をモックが実装しているので、
 * 「votes マップの自分のキーだけ書く」という本番の同時投票設計をそのまま検証できる。
 *
 * 検証内容:
 *   A. ルーム作成・参加・在席更新
 *   B. 部門の追加／削除がホスト限定であること
 *   C. カード推薦（推薦者に自動で1票）と二重推薦の拒否
 *   D. 投票トグルが他人の票を壊さないこと（同時投票の分離）
 *   E. 票数降順の並び
 *   F. 部門削除で配下の推薦も消えること
 *   G. 退室と会議終了（ルーム・推薦の全削除）
 *   H. onSnapshot がルーム／推薦の変化を配信すること
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { __setTestCloudFirestore } = await import(path.join(ROOT, "js/cloudAuth.js"));
const wr = await import(path.join(ROOT, "js/weakestRoomSync.js"));

/* ------------------------------------------------------------------ *
 * in-memory Firestore モック（ドット記法 update / deleteField / onSnapshot 対応）
 * ------------------------------------------------------------------ */
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

  /** "a.b.c" 形式のキーを解決して書き込む（Firestore の updateDoc と同じ挙動） */
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

/* ------------------------------------------------------------------ *
 * テストハーネス
 * ------------------------------------------------------------------ */
const failures = [];
let checks = 0;

function ok(cond, label) {
  checks++;
  if (!cond) failures.push(label);
}

function eq(actual, expected, label) {
  checks++;
  if (actual !== expected) failures.push(label + " — expected " + JSON.stringify(expected) + " got " + JSON.stringify(actual));
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

/* --- A. 作成・参加 --- */
actAs("A");
const created = await wr.createWeakestRoom("弱いカードを語る会");
const CODE = created.code;
eq(CODE.length, 5, "A: ルームコードは5文字");
eq(created.room.hostUid, USERS.A.uid, "A: 作成者がホスト");
eq(Object.keys(created.room.members).length, 1, "A: 作成直後の参加者は1人");
eq(created.room.title, "弱いカードを語る会", "A: タイトルが保存される");

/* onSnapshot をルーム／推薦の両方に張る（H の検証用） */
let roomSnapshots = 0;
let lastRoom = null;
let entrySnapshots = 0;
let lastEntries = [];
const unsubRoom = wr.watchWeakestRoom(CODE, function (room) {
  roomSnapshots++;
  lastRoom = room;
});
const unsubEntries = wr.watchWeakestEntries(CODE, function (entries) {
  entrySnapshots++;
  lastEntries = entries;
});
ok(roomSnapshots >= 1, "H: ルーム購読は即座に初回配信する");

actAs("B");
const joined = await wr.joinWeakestRoom(CODE.toLowerCase());
eq(joined.code, CODE, "A: 小文字コードでも参加できる");
actAs("C");
await wr.joinWeakestRoom(CODE);
eq(Object.keys(lastRoom.members).length, 3, "A: 3人が参加している");
ok(lastRoom.members[USERS.B.uid].name === "せつ菜", "A: 参加者名が入る");

const badCode = await throws(() => wr.joinWeakestRoom("XX"), "A: 短すぎるコードは拒否");
ok(badCode && /5文字/.test(badCode.message), "A: コード長エラーの文言");

/* --- B. 部門はホスト限定 --- */
actAs("B");
await throws(() => wr.addWeakestCategory(CODE, { name: "勝手に部門" }), "B: 非ホストは部門を追加できない");

actAs("A");
const catLive = await wr.addWeakestCategory(CODE, {
  name: "Aqours ライブ部門",
  filter: { types: ["ライブ"], schools: ["Aqours"], products: [] },
});
const catMember = await wr.addWeakestCategory(CODE, {
  name: "メンバー部門",
  filter: { types: ["メンバー"], schools: [], products: [] },
});
eq(wr.weakestSortedCategories(lastRoom).length, 2, "B: 部門が2つ登録される");
eq(wr.weakestSortedCategories(lastRoom)[0].id, catLive.id, "B: order 順に並ぶ");
await throws(() => wr.addWeakestCategory(CODE, { name: "   " }), "B: 空の部門名は拒否");

/* --- C. 推薦 --- */
actAs("A");
const eX = await wr.nominateWeakestCard(CODE, {
  cardNo: "PL!S-bp1-019-L",
  categoryId: catLive.id,
  comment: "必要ハートが重い",
});
eq(wr.weakestEntryVoteCount(eX), 1, "C: 推薦者に自動で1票入る");
ok(wr.weakestEntryHasVote(eX, USERS.A.uid), "C: 自動票は推薦者のもの");
eq(eX.comment, "必要ハートが重い", "C: 推薦コメントが保存される");

const dup = await throws(
  () => wr.nominateWeakestCard(CODE, { cardNo: "PL!S-bp1-019-L", categoryId: catLive.id }),
  "C: 同じ部門への二重推薦は拒否",
);
eq(dup && dup.code, "weakest/duplicate-entry", "C: 二重推薦は専用エラーコード");

/* 別部門になら同じカードを挙げられる */
const eXMember = await wr.nominateWeakestCard(CODE, {
  cardNo: "PL!S-bp1-019-L",
  categoryId: catMember.id,
});
ok(eXMember && eXMember.id !== eX.id, "C: 部門が違えば同じカードを挙げられる");

actAs("B");
const eY = await wr.nominateWeakestCard(CODE, {
  cardNo: "PL!S-bp1-020-L",
  categoryId: catLive.id,
  comment: "スコアが伸びない",
});
eq(wr.weakestEntryVoteCount(eY), 1, "C: 別ユーザーの推薦も1票から");

/* --- D. 投票トグルの分離 --- */
actAs("B");
const votedX = await wr.toggleWeakestVote(CODE, eX.id);
eq(votedX, true, "D: 未投票からのトグルで投票状態になる");
actAs("C");
await wr.toggleWeakestVote(CODE, eX.id);

const xNow = lastEntries.find((e) => e.id === eX.id);
eq(wr.weakestEntryVoteCount(xNow), 3, "D: 3人が投票して3票");
ok(wr.weakestEntryHasVote(xNow, USERS.A.uid), "D: 他人の票が消えていない（A）");
ok(wr.weakestEntryHasVote(xNow, USERS.B.uid), "D: 他人の票が消えていない（B）");
ok(wr.weakestEntryHasVote(xNow, USERS.C.uid), "D: 自分の票が入っている（C）");

actAs("B");
const unvoted = await wr.toggleWeakestVote(CODE, eX.id);
eq(unvoted, false, "D: 再トグルで取り消しになる");
const xAfter = lastEntries.find((e) => e.id === eX.id);
eq(wr.weakestEntryVoteCount(xAfter), 2, "D: 取り消しで2票");
ok(wr.weakestEntryHasVote(xAfter, USERS.A.uid), "D: 取り消しで他人の票を巻き込まない");
ok(!wr.weakestEntryHasVote(xAfter, USERS.B.uid), "D: 自分の票だけ消える");

await wr.setWeakestVoteComment(CODE, eY.id, "重いわりに見返りがない");
const yComment = lastEntries.find((e) => e.id === eY.id);
eq(yComment.votes[USERS.B.uid].comment, "重いわりに見返りがない", "D: 票のコメントを更新できる");

/* --- E. 票数降順 --- */
const liveRanking = lastEntries
  .filter((e) => e.categoryId === catLive.id)
  .sort(function (a, b) {
    const d = wr.weakestEntryVoteCount(b) - wr.weakestEntryVoteCount(a);
    return d !== 0 ? d : String(a.createdAt).localeCompare(String(b.createdAt));
  });
eq(liveRanking[0].id, eX.id, "E: 票が多いカードが1位");
eq(wr.weakestEntryVoteCount(liveRanking[0]), 2, "E: 1位は2票");
eq(wr.weakestEntryVoteCount(liveRanking[1]), 1, "E: 2位は1票");

/* --- 推薦の取り下げ --- */
actAs("B");
await wr.removeWeakestEntry(CODE, eY.id);
eq(lastEntries.filter((e) => e.categoryId === catLive.id).length, 1, "E: 取り下げで一覧から消える");

/* --- F. 部門削除で配下の推薦も消える --- */
actAs("B");
await throws(() => wr.removeWeakestCategory(CODE, catMember.id), "F: 非ホストは部門を削除できない");
actAs("A");
await wr.removeWeakestCategory(CODE, catMember.id);
eq(wr.weakestSortedCategories(lastRoom).length, 1, "F: 部門が1つ減る");
eq(lastEntries.filter((e) => e.categoryId === catMember.id).length, 0, "F: 配下の推薦も消える");
eq(lastEntries.length, 1, "F: 他部門の推薦は残る");

await wr.renameWeakestCategory(CODE, catLive.id, "ライブ最弱部門");
eq(wr.weakestSortedCategories(lastRoom)[0].name, "ライブ最弱部門", "F: 部門名を変更できる");

/* --- G. 在席・退室・終了 --- */
actAs("C");
const seenBefore = lastRoom.members[USERS.C.uid].lastSeenAt;
await new Promise((r) => setTimeout(r, 5));
await wr.touchWeakestPresence(CODE);
ok(lastRoom.members[USERS.C.uid].lastSeenAt >= seenBefore, "G: 在席時刻が更新される");

await wr.leaveWeakestRoom(CODE);
ok(!lastRoom.members[USERS.C.uid], "G: 退室すると参加者から消える");
eq(Object.keys(lastRoom.members).length, 2, "G: 残りは2人");

actAs("B");
await throws(() => wr.closeWeakestRoom(CODE), "G: 非ホストは会議を終了できない");

actAs("A");
const snapsBeforeClose = roomSnapshots;
await wr.closeWeakestRoom(CODE);
eq(lastRoom, null, "G: 終了するとルームが消える");
eq(lastEntries.length, 0, "G: 終了すると推薦も全部消える");
ok(roomSnapshots > snapsBeforeClose, "H: 削除も購読に配信される");
ok(entrySnapshots > 1, "H: 推薦の購読が複数回配信された");

unsubRoom();
unsubEntries();
const snapsAfterUnsub = roomSnapshots;
actAs("A");
await wr.createWeakestRoom("購読解除後");
eq(roomSnapshots, snapsAfterUnsub, "H: 購読解除後は配信されない");

__setTestCloudFirestore(null);

/* ------------------------------------------------------------------ */
if (failures.length) {
  console.error("verify-weakest-room-sim: NG (" + failures.length + "/" + checks + ")");
  failures.forEach(function (f) {
    console.error("  - " + f);
  });
  process.exit(1);
}
console.log("verify-weakest-room-sim: OK (" + checks + " checks)");
