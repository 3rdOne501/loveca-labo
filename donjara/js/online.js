/**
 * Firebase オンライン対戦（ホスト権威型）通信レイヤ。
 *
 * - 匿名認証でサインイン（Firebase コンソールで「匿名」を有効化しておくこと）。
 * - ルーム = Firestore ドキュメント `donjaraRooms/{code}`。
 * - ホストが権威。ゲーム状態 `state` を書き込み、全員が購読して描画。
 * - 各席プレイヤーは `actions` サブコレクションに自分の操作を投函、ホストが適用して削除。
 *
 * ※ Firestore ルール（firestore.rules の donjaraRooms）をデプロイしておくこと。
 */

import { firebaseConfig } from "./firebaseConfig.js";

const V = "10.13.2";
const APP_URL = `https://www.gstatic.com/firebasejs/${V}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`;
const FS_URL = `https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`;

let _fb = null; // { app, auth, db, uid, name, fns }

export function isConfigured() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
}

/** Firebase 初期化 + 匿名サインイン（1 回だけ）。 */
export async function ensureFirebase() {
  if (_fb) return _fb;
  if (!isConfigured()) throw new Error("Firebase 未設定");
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import(APP_URL),
    import(AUTH_URL),
    import(FS_URL),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);

  const uid = await new Promise((resolve, reject) => {
    const unsub = authMod.onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user.uid);
      }
    });
    authMod.signInAnonymously(auth).catch(reject);
  });

  _fb = {
    app,
    auth,
    db,
    uid,
    name: "プレイヤー" + uid.slice(0, 4),
    fns: fsMod,
  };
  return _fb;
}

function roomRef(db, fns, code) {
  return fns.doc(db, "donjaraRooms", code);
}
function actionsCol(db, fns, code) {
  return fns.collection(db, "donjaraRooms", code, "actions");
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** ルーム作成（ホスト）。configLite は席・役・枚数の再現に必要な最小設定。 */
export async function createRoom(configLite, playerName) {
  const fb = await ensureFirebase();
  const { db, fns, uid } = fb;
  let code = randomCode();
  // 衝突回避（最大 5 回）
  for (let i = 0; i < 5; i++) {
    const snap = await fns.getDoc(roomRef(db, fns, code));
    if (!snap.exists()) break;
    code = randomCode();
  }
  const nPlayers = configLite.players || 4;
  const seatUids = new Array(nPlayers).fill(null);
  const seatNames = new Array(nPlayers).fill(null);
  seatUids[0] = uid;
  seatNames[0] = playerName || fb.name;
  await fns.setDoc(roomRef(db, fns, code), {
    code,
    hostUid: uid,
    status: "lobby",
    seatUids,
    seatNames,
    configLite,
    state: null,
    updatedAt: fns.serverTimestamp(),
  });
  return { code, uid };
}

/** ルーム参加（空席に着席）。 */
export async function joinRoom(code, playerName) {
  const fb = await ensureFirebase();
  const { db, fns, uid } = fb;
  const ref = roomRef(db, fns, code);
  const snap = await fns.getDoc(ref);
  if (!snap.exists()) throw new Error("ルームが見つかりません");
  const data = snap.data();
  if (data.status !== "lobby" && data.status !== "waiting") {
    // 既に着席済みなら再入場を許可
    const existing = (data.seatUids || []).indexOf(uid);
    if (existing >= 0) return { code, uid, seat: existing };
    throw new Error("対局中のため参加できません");
  }
  const seatUids = (data.seatUids || []).slice();
  const seatNames = (data.seatNames || []).slice();
  let seat = seatUids.indexOf(uid);
  if (seat < 0) {
    seat = seatUids.indexOf(null);
    if (seat < 0) throw new Error("満席です");
    seatUids[seat] = uid;
    seatNames[seat] = playerName || fb.name;
    await fns.updateDoc(ref, { seatUids, seatNames, updatedAt: fns.serverTimestamp() });
  }
  return { code, uid, seat };
}

export async function watchRoom(code, cb) {
  const fb = await ensureFirebase();
  const { db, fns } = fb;
  return fns.onSnapshot(roomRef(db, fns, code), (snap) => {
    if (snap.exists()) cb(snap.data());
  });
}

/** ホスト: 権威状態を書き込む。 */
export async function setRoomState(code, state, status) {
  const fb = await ensureFirebase();
  const { db, fns } = fb;
  const patch = { state, updatedAt: fns.serverTimestamp() };
  if (status) patch.status = status;
  await fns.updateDoc(roomRef(db, fns, code), patch);
}

/** ホストが対局開始（controllers と初期 state を書き込む）。 */
export async function startRoom(code, state, controllers, seatUids) {
  const fb = await ensureFirebase();
  const { db, fns } = fb;
  await fns.updateDoc(roomRef(db, fns, code), {
    status: "playing",
    state,
    controllers,
    updatedAt: fns.serverTimestamp(),
  });
}

/** 席プレイヤー: アクションを投函。 */
export async function postAction(code, action) {
  const fb = await ensureFirebase();
  const { db, fns, uid } = fb;
  await fns.addDoc(actionsCol(db, fns, code), {
    ...action,
    uid,
    ts: fns.serverTimestamp(),
  });
}

/** ホスト: アクション到着を購読。 */
export async function watchActions(code, cb) {
  const fb = await ensureFirebase();
  const { db, fns } = fb;
  return fns.onSnapshot(actionsCol(db, fns, code), (snap) => {
    const acts = [];
    snap.forEach((d) => acts.push({ id: d.id, ...d.data() }));
    // ts 昇順
    acts.sort((a, b) => {
      const ta = a.ts && a.ts.seconds ? a.ts.seconds * 1e6 + (a.ts.nanoseconds || 0) / 1000 : 0;
      const tb = b.ts && b.ts.seconds ? b.ts.seconds * 1e6 + (b.ts.nanoseconds || 0) / 1000 : 0;
      return ta - tb;
    });
    cb(acts);
  });
}

/** ホスト: 処理済みアクションを削除。 */
export async function clearAction(code, actionId) {
  const fb = await ensureFirebase();
  const { db, fns } = fb;
  await fns.deleteDoc(fns.doc(db, "donjaraRooms", code, "actions", actionId));
}

export function myUid() {
  return _fb ? _fb.uid : null;
}
