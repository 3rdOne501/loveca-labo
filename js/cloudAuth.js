/**
 * Google ログイン（任意）と、登録デッキ／設定の Firestore 同期。
 *
 * - 設定が未投入の状態ではいっさい何もしない（既存のローカル動作のまま）。
 * - `js/firebaseConfig.js` を作って `firebaseConfig` をエクスポートすれば、自動でログイン
 *   ボタンが現れ、Google アカウントでログイン可能になる。
 * - ログイン後は登録デッキ（`llocg_deck_library`）と編集中デッキ（`llocg_deck`）を Firestore
 *   ユーザードキュメント `users/<uid>/state/main` に保存・同期する。
 *
 * セットアップ手順は README を参照。
 */

import { STORAGE_DECK_LIBRARY, STORAGE_DECK } from "./config.js";
import { showToast } from "./ui.js";

const FIREBASE_APP_URL = "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
const FIREBASE_AUTH_URL = "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const SYNC_KEYS = [STORAGE_DECK_LIBRARY, STORAGE_DECK];

/** @typedef {{ uid: string, displayName: string|null, photoURL: string|null, email: string|null }} CloudUserSummary */

/** @type {CloudUserSummary|null} */
let currentUser = null;
/** @type {Set<(u: CloudUserSummary|null) => void>} */
const userListeners = new Set();

let firebaseInitPromise = null;
/** @type {any} */
let _auth = null;
/** @type {any} */
let _db = null;
/** @type {any} */
let _gp = null;
/** @type {any} */
let _firestoreApi = null;
/** @type {any} */
let _authApi = null;

let cloudSyncEnabled = false;
let suppressLocalWriteSync = false;
let pendingPush = null;
let lastPushedJson = "";

export function onCloudUserChange(fn) {
  if (typeof fn !== "function") return () => {};
  userListeners.add(fn);
  try {
    fn(currentUser);
  } catch (_) {
    /* noop */
  }
  return () => {
    userListeners.delete(fn);
  };
}

function notifyUserListeners() {
  userListeners.forEach((fn) => {
    try {
      fn(currentUser);
    } catch (_) {
      /* noop */
    }
  });
}

async function loadFirebaseSdk(config) {
  if (firebaseInitPromise) return firebaseInitPromise;
  firebaseInitPromise = (async () => {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(/* @vite-ignore */ FIREBASE_APP_URL),
      import(/* @vite-ignore */ FIREBASE_AUTH_URL),
      import(/* @vite-ignore */ FIREBASE_FIRESTORE_URL),
    ]);
    const app = initializeApp(config);
    /* `initializeAuth` を使うと、永続化を最初に明示できるので、
     * 既定の `getAuth` よりログイン状態の復元が安定する（Safari／ITP 対策）。 */
    const persistenceCandidates = [
      authMod.indexedDBLocalPersistence,
      authMod.browserLocalPersistence,
      authMod.browserSessionPersistence,
    ].filter(Boolean);
    if (typeof authMod.initializeAuth === "function" && persistenceCandidates.length) {
      try {
        _auth = authMod.initializeAuth(app, {
          persistence: persistenceCandidates,
          popupRedirectResolver: authMod.browserPopupRedirectResolver,
        });
      } catch (err) {
        console.warn("[cloudAuth] initializeAuth failed, falling back:", err);
        _auth = authMod.getAuth(app);
      }
    } else {
      _auth = authMod.getAuth(app);
    }
    for (const p of persistenceCandidates) {
      try {
        await authMod.setPersistence(_auth, p);
        break;
      } catch (err) {
        console.warn("[cloudAuth] setPersistence failed, trying next:", err);
      }
    }
    _gp = new authMod.GoogleAuthProvider();
    _authApi = authMod;
    _db = fsMod.getFirestore(app);
    _firestoreApi = fsMod;

    authMod.onAuthStateChanged(_auth, (user) => {
      if (!user) {
        currentUser = null;
        notifyUserListeners();
        return;
      }
      currentUser = {
        uid: user.uid,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        email: user.email || null,
      };
      notifyUserListeners();
      pullCloudStateAndMerge().catch(function (err) {
        console.warn("[cloudAuth] pull failed:", err);
      });
    });

    /* リダイレクト方式でサインインした場合の戻り値を処理（popup がブロックされた場合のフォールバック） */
    try {
      const redirected = await authMod.getRedirectResult(_auth);
      if (redirected && redirected.user) {
        /* onAuthStateChanged が引き続き同じ user で発火するため、ここでは追加処理不要 */
      }
    } catch (err) {
      console.warn("[cloudAuth] getRedirectResult failed:", err);
    }
    return app;
  })();
  return firebaseInitPromise;
}

function buildCloudDocPayload() {
  /** @type {Record<string, unknown>} */
  const payload = { updatedAt: new Date().toISOString() };
  for (const k of SYNC_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      payload[k] = raw == null ? null : raw;
    } catch (_) {
      payload[k] = null;
    }
  }
  return payload;
}

async function pushCloudStateNow() {
  if (!cloudSyncEnabled || !currentUser || !_db || !_firestoreApi) return;
  const payload = buildCloudDocPayload();
  const json = JSON.stringify(payload);
  if (json === lastPushedJson) return;
  const ref = _firestoreApi.doc(_db, "users", currentUser.uid, "state", "main");
  try {
    await _firestoreApi.setDoc(ref, payload, { merge: true });
    lastPushedJson = json;
  } catch (err) {
    console.warn("[cloudAuth] push failed:", err);
  }
}

function schedulePushCloudState() {
  if (!cloudSyncEnabled || !currentUser) return;
  if (pendingPush) {
    clearTimeout(pendingPush);
  }
  pendingPush = setTimeout(function () {
    pendingPush = null;
    pushCloudStateNow();
  }, 600);
}

async function pullCloudStateAndMerge() {
  if (!cloudSyncEnabled || !currentUser || !_db || !_firestoreApi) return;
  const ref = _firestoreApi.doc(_db, "users", currentUser.uid, "state", "main");
  let snap;
  try {
    snap = await _firestoreApi.getDoc(ref);
  } catch (err) {
    console.warn("[cloudAuth] pull failed:", err);
    return;
  }
  if (!snap.exists()) {
    /* 初回ログイン: 既存のローカル内容を初期データとしてクラウドへ */
    await pushCloudStateNow();
    return;
  }
  const data = snap.data() || {};
  suppressLocalWriteSync = true;
  let mutated = false;
  try {
    for (const k of SYNC_KEYS) {
      const v = data[k];
      if (typeof v === "string" && v) {
        const existing = localStorage.getItem(k);
        if (existing !== v) {
          localStorage.setItem(k, v);
          mutated = true;
        }
      }
    }
  } finally {
    suppressLocalWriteSync = false;
  }
  lastPushedJson = JSON.stringify(buildCloudDocPayload());
  if (mutated) {
    try {
      showToast("クラウドに保存していたデッキを取り込みました。再読込で反映されます。");
    } catch (_) {
      /* noop */
    }
  }
}

/**
 * `localStorage.setItem` をフックして、同期対象キーの変更を Firestore へ流す。
 * `cards.json` を含む読み取りは影響しない。
 */
function installLocalStorageInterceptor() {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (window.__llocgCloudStorageHooked === "1") return;
  window.__llocgCloudStorageHooked = "1";
  const proto = Object.getPrototypeOf(window.localStorage);
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  proto.setItem = function (key, value) {
    const r = origSet.apply(this, arguments);
    if (!suppressLocalWriteSync && SYNC_KEYS.indexOf(String(key)) >= 0) {
      schedulePushCloudState();
    }
    return r;
  };
  proto.removeItem = function (key) {
    const r = origRemove.apply(this, arguments);
    if (!suppressLocalWriteSync && SYNC_KEYS.indexOf(String(key)) >= 0) {
      schedulePushCloudState();
    }
    return r;
  };
}

let lastConfig = null;

export async function initCloudAuthIfConfigured() {
  if (typeof window === "undefined") return false;
  let config = null;
  try {
    const mod = await import(/* @vite-ignore */ "./firebaseConfig.js");
    if (mod && mod.firebaseConfig && typeof mod.firebaseConfig === "object") {
      const cfg = mod.firebaseConfig;
      if (cfg.apiKey && cfg.authDomain && cfg.projectId) {
        config = cfg;
      }
    }
  } catch (_) {
    /* config file missing — feature disabled */
    return false;
  }
  if (!config) return false;
  lastConfig = config;
  cloudSyncEnabled = true;
  installLocalStorageInterceptor();
  try {
    await loadFirebaseSdk(config);
    return true;
  } catch (err) {
    console.warn("[cloudAuth] firebase init failed:", err);
    cloudSyncEnabled = false;
    return false;
  }
}

export function isCloudSyncAvailable() {
  return cloudSyncEnabled;
}

export function getCurrentCloudUser() {
  return currentUser;
}

const POPUP_FALLBACK_ERRORS = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
]);

export async function signInWithGoogle() {
  if (!cloudSyncEnabled || !_auth || !_gp || !_authApi) {
    showToast("Google ログインの設定が見つかりません。`js/firebaseConfig.js` を作成して再読込してください。");
    return null;
  }
  try {
    const cred = await _authApi.signInWithPopup(_auth, _gp);
    return cred && cred.user
      ? {
          uid: cred.user.uid,
          displayName: cred.user.displayName || null,
          photoURL: cred.user.photoURL || null,
          email: cred.user.email || null,
        }
      : null;
  } catch (err) {
    console.warn("[cloudAuth] signInWithPopup failed:", err);
    const code = err && /** @type {any} */ (err).code;
    if (typeof _authApi.signInWithRedirect === "function" && (POPUP_FALLBACK_ERRORS.has(code) || !code)) {
      try {
        showToast("ポップアップが開けないため、ページ遷移でログインします…");
        await _authApi.signInWithRedirect(_auth, _gp);
        return null;
      } catch (errR) {
        console.warn("[cloudAuth] signInWithRedirect failed:", errR);
      }
    }
    showToast("Google ログインに失敗しました。ポップアップ・サードパーティ Cookie が許可されているか確認してください。");
    return null;
  }
}

export async function signOutCloud() {
  if (!cloudSyncEnabled || !_auth || !_authApi) return;
  try {
    await _authApi.signOut(_auth);
  } catch (err) {
    console.warn("[cloudAuth] signOut failed:", err);
  }
}
