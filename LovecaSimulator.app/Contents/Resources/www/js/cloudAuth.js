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

import {
  STORAGE_DECK_LIBRARY,
  STORAGE_DECK,
  STORAGE_PLAY_ENERGY_CARD_NO,
  STORAGE_GOOGLE_AUTO_LOGIN,
} from "./config.js";
import { showToast } from "./ui.js";

const FIREBASE_APP_URL = "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
const FIREBASE_AUTH_URL = "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const SYNC_KEYS = [STORAGE_DECK_LIBRARY, STORAGE_DECK, STORAGE_PLAY_ENERGY_CARD_NO];

/** @typedef {{ uid: string, displayName: string|null, photoURL: string|null, email: string|null }} CloudUserSummary */

/**
 * 直近ログイン情報のローカルキャッシュキー。リロード直後、Firebase Auth が IndexedDB から
 * 復元する前に「ログイン中表示」を仮表示するために使う。Firebase 側で確定したらこのキャッシュを更新する。
 */
const LOCAL_USER_CACHE_KEY = "llocg_cloud_user_cache";
/** 自動リダイレクトログインの連打防止（同一タブ・1分） */
const AUTO_REDIRECT_TS_KEY = "llocg_google_auto_redirect_ts";

/** @returns {CloudUserSummary|null} */
function loadCachedCloudUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && typeof o === "object" && typeof o.uid === "string" && o.uid) {
      return {
        uid: String(o.uid),
        displayName: o.displayName != null ? String(o.displayName) : null,
        photoURL: o.photoURL != null ? String(o.photoURL) : null,
        email: o.email != null ? String(o.email) : null,
      };
    }
  } catch (_) {
    /* noop */
  }
  return null;
}

function saveCachedCloudUser(u) {
  try {
    if (!u) {
      localStorage.removeItem(LOCAL_USER_CACHE_KEY);
    } else {
      localStorage.setItem(LOCAL_USER_CACHE_KEY, JSON.stringify({
        uid: u.uid,
        displayName: u.displayName || null,
        photoURL: u.photoURL || null,
        email: u.email || null,
      }));
    }
  } catch (_) {
    /* noop */
  }
}

/** @type {CloudUserSummary|null} */
let currentUser = loadCachedCloudUser();
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
let authStateReadyDone = false;
/** @type {Promise<boolean>|null} */
let cloudInitInFlight = null;

/** http(s) ではリダイレクト、file://（オフラインアプリ）ではポップアップ */
export function isCloudAuthEnvironmentSupported() {
  if (typeof window === "undefined") return false;
  try {
    return window.location.protocol !== "file:";
  } catch (_) {
    return true;
  }
}

function prefersGooglePopupAuth() {
  if (typeof window === "undefined") return false;
  try {
    return window.location.protocol === "file:";
  } catch (_) {
    return false;
  }
}

/** @returns {Promise<Record<string, string>|null>} */
async function loadFirebaseConfigObject() {
  try {
    const mod = await import(/* @vite-ignore */ "./firebaseConfig.js");
    const cfg = mod && mod.firebaseConfig;
    if (cfg && typeof cfg === "object" && cfg.apiKey && cfg.authDomain && cfg.projectId) {
      return cfg;
    }
  } catch (err) {
    console.warn("[cloudAuth] firebaseConfig.js import failed:", err);
  }
  try {
    const el = document.getElementById("llocg-firebase-config-json");
    if (el && el.textContent) {
      const cfg = JSON.parse(el.textContent.trim());
      if (cfg && cfg.apiKey && cfg.authDomain && cfg.projectId) {
        return cfg;
      }
    }
  } catch (err) {
    console.warn("[cloudAuth] inline firebase config parse failed:", err);
  }
  return null;
}

async function ensureCloudAuthReady() {
  if (cloudSyncEnabled && _auth && _authApi && _gp) return true;
  return initCloudAuthIfConfigured();
}

function formatAuthError(err) {
  var code = err && err.code ? String(err.code) : "";
  var msg = err && err.message ? String(err.message) : String(err || "不明なエラー");
  if (code === "auth/unauthorized-domain") {
    return (
      "このURLは Firebase の許可ドメインに登録されていません。Firebase コンソール → Authentication → Settings → " +
      "Authorized domains に「localhost」（127.0.0.1 ではなく localhost で開く）と GitHub 利用時は「3rdone501.github.io」を追加してください。"
    );
  }
  if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
    return "ログイン用ポップアップがブロックまたは閉じられました。ポップアップを許可して再試行してください。";
  }
  if (code === "auth/network-request-failed") {
    return "Firebase へ接続できません。ネットワークと広告ブロックを確認してください。";
  }
  return (code ? code + " — " : "") + msg;
}

function openLocalhostLoginHint() {
  var ports = [8844, 8845, 8846, 8847, 8848, 8080];
  var url = "http://localhost:" + ports[0] + "/index.html";
  showToast("Google ログインは " + url + " で開いてください（localhost 必須）", { duration: 9000 });
  try {
    window.open(url, "_blank", "noopener");
  } catch (_) {
    /* noop */
  }
}

function loadPreferGoogleAutoLogin() {
  try {
    if (localStorage.getItem(STORAGE_GOOGLE_AUTO_LOGIN) === "0") return false;
    if (localStorage.getItem(STORAGE_GOOGLE_AUTO_LOGIN) === "1") return true;
    return !!loadCachedCloudUser();
  } catch (_) {
    return false;
  }
}

function setPreferGoogleAutoLogin(on) {
  try {
    localStorage.setItem(STORAGE_GOOGLE_AUTO_LOGIN, on ? "1" : "0");
  } catch (_) {}
}

/** 復元待ちの間も UI 用にキャッシュを返す */
export function getEffectiveCloudUser() {
  if (currentUser) return currentUser;
  return loadCachedCloudUser();
}

function userFromFirebaseAuthUser(user) {
  return {
    uid: user.uid,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    email: user.email || null,
  };
}

async function waitForAuthStateReady() {
  if (!_auth || !_authApi || authStateReadyDone) return;
  if (typeof _authApi.authStateReady === "function") {
    try {
      await _authApi.authStateReady(_auth);
    } catch (err) {
      console.warn("[cloudAuth] authStateReady failed:", err);
    }
  }
  authStateReadyDone = true;
}

function markRedirectLoginAttempt() {
  try {
    sessionStorage.setItem(AUTO_REDIRECT_TS_KEY, String(Date.now()));
  } catch (_) {
    /* noop */
  }
}

function cookieHelpMessage() {
  return (
    "Google ログインには Cookie が必要です。Safari: 設定→プライバシー→「すべての Cookie をブロック」をオフ。" +
    " Chrome: アドレスバー左の鍵→Cookie→このサイトを許可。一人二役だけならログイン不要です。"
  );
}

function applySignedInUser(user) {
  currentUser = userFromFirebaseAuthUser(user);
  setPreferGoogleAutoLogin(true);
  saveCachedCloudUser(currentUser);
  notifyUserListeners();
  pullCloudStateAndMerge().catch(function (err) {
    console.warn("[cloudAuth] pull failed:", err);
  });
}

/** 手動ログイン（ポップアップ優先 → ダメならリダイレクト） */
async function signInWithGoogleInteractive() {
  if (location.protocol === "file:") {
    openLocalhostLoginHint();
    return null;
  }
  if (location.hostname === "127.0.0.1") {
    location.replace(location.href.replace("127.0.0.1", "localhost"));
    return null;
  }
  if (!(await ensureCloudAuthReady())) {
    showToast(
      "Google ログインを準備できません。ネットワーク接続と firebaseConfig.js を確認し、http://localhost:8844 で開き直してください。",
      { duration: 9000 },
    );
    return null;
  }
  if (!_auth || !_gp || !_authApi) {
    showToast("Google ログインを準備できません。ページを再読込してください。", { duration: 6000 });
    return null;
  }
  if (typeof _authApi.signInWithPopup === "function") {
    showToast("Google ログイン（ポップアップ）", { duration: 2800 });
    try {
      const cred = await _authApi.signInWithPopup(_auth, _gp);
      if (cred && cred.user) {
        applySignedInUser(cred.user);
        showToast("ログインしました", { duration: 3200 });
      }
      return cred;
    } catch (err) {
      console.warn("[cloudAuth] signInWithPopup failed:", err);
      if (err && err.code === "auth/popup-closed-by-user") {
        return null;
      }
      if (err && err.code === "auth/unauthorized-domain") {
        showToast(formatAuthError(err), { duration: 12000 });
        return null;
      }
      /* ポップアップ失敗時はリダイレクトへ */
    }
  }
  if (typeof _authApi.signInWithRedirect !== "function") {
    showToast(formatAuthError({ message: "リダイレクトログイン非対応" }), { duration: 8000 });
    return null;
  }
  showToast("Google ログインへ移動します", { duration: 3200 });
  markRedirectLoginAttempt();
  try {
    await _authApi.signInWithRedirect(_auth, _gp);
  } catch (err) {
    console.warn("[cloudAuth] signInWithRedirect failed:", err);
    showToast(formatAuthError(err) + " " + cookieHelpMessage(), { duration: 10000 });
  }
  return null;
}

/** 起動時: IndexedDB からの復元のみ（自動リダイレクトはしない） */
async function restoreGoogleSessionQuietly() {
  if (!cloudSyncEnabled || !_auth || !_authApi) return;
  await waitForAuthStateReady();
}

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
    /* getAuth の方が Safari / localhost で安定しやすい */
    _auth = authMod.getAuth(app);
    for (const p of persistenceCandidates) {
      try {
        await authMod.setPersistence(_auth, p);
        break;
      } catch (err) {
        console.warn("[cloudAuth] setPersistence failed, trying next:", err);
      }
    }
    _gp = new authMod.GoogleAuthProvider();
    try {
      _gp.setCustomParameters({ prompt: "select_account" });
    } catch (_) {
      /* noop */
    }
    _authApi = authMod;
    _db = fsMod.getFirestore(app);
    _firestoreApi = fsMod;

    /* リダイレクト復帰は onAuthStateChanged より先に処理（Cookie 制限環境で必須） */
    try {
      const redirected = await authMod.getRedirectResult(_auth);
      if (redirected && redirected.user) {
        currentUser = userFromFirebaseAuthUser(redirected.user);
        setPreferGoogleAutoLogin(true);
        saveCachedCloudUser(currentUser);
        try {
          sessionStorage.removeItem(AUTO_REDIRECT_TS_KEY);
        } catch (_) {
          /* noop */
        }
        notifyUserListeners();
        pullCloudStateAndMerge().catch(function (err) {
          console.warn("[cloudAuth] pull failed:", err);
        });
      }
    } catch (err) {
      console.warn("[cloudAuth] getRedirectResult failed:", err);
    }

    authMod.onAuthStateChanged(_auth, (user) => {
      if (user) {
        currentUser = userFromFirebaseAuthUser(user);
        setPreferGoogleAutoLogin(true);
        saveCachedCloudUser(currentUser);
        notifyUserListeners();
        pullCloudStateAndMerge().catch(function (err) {
          console.warn("[cloudAuth] pull failed:", err);
        });
        return;
      }
      /* 永続化復元前の一瞬 null ではキャッシュを消さない */
      if (!authStateReadyDone) {
        notifyUserListeners();
        return;
      }
      if (_auth.currentUser) return;
      currentUser = null;
      saveCachedCloudUser(null);
      notifyUserListeners();
    });

    await waitForAuthStateReady();
    if (_auth.currentUser) {
      currentUser = userFromFirebaseAuthUser(_auth.currentUser);
      setPreferGoogleAutoLogin(true);
      saveCachedCloudUser(currentUser);
      notifyUserListeners();
      if (!lastPushedJson) {
        pullCloudStateAndMerge().catch(function (err) {
          console.warn("[cloudAuth] pull failed:", err);
        });
      }
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
    try {
      window.dispatchEvent(new CustomEvent("llocg-cloud-state-merged", { detail: { keys: SYNC_KEYS.slice() } }));
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
  if (cloudSyncEnabled && _auth && _authApi) return true;
  if (cloudInitInFlight) return cloudInitInFlight;
  cloudInitInFlight = (async function () {
    const config = await loadFirebaseConfigObject();
    if (!config) {
      console.warn("[cloudAuth] firebaseConfig not found");
      return false;
    }
    lastConfig = config;
    installLocalStorageInterceptor();
    try {
      await loadFirebaseSdk(config);
      cloudSyncEnabled = true;
      return true;
    } catch (err) {
      console.warn("[cloudAuth] firebase init failed:", err);
      cloudSyncEnabled = false;
      return false;
    } finally {
      cloudInitInFlight = null;
    }
  })();
  return cloudInitInFlight;
}

export function isCloudSyncAvailable() {
  return cloudSyncEnabled;
}

/** 対戦マッチ用 Firestore（Google ログイン＋ Firebase 初期化済みのときのみ） */
export function getCloudFirestore() {
  if (!cloudSyncEnabled || !_db || !_firestoreApi) return null;
  return { db: _db, api: _firestoreApi };
}

/**
 * テスト専用フック（scripts/verify-versus-online-sim.mjs）。
 * Firebase 実接続なしで versusMatch.js の Firestore 経路を Node 上で駆動するための注入口。
 * 本番コードからは呼ばれない（window/実 Firebase 経路とは独立）。
 * @param {{ db: any, api: any, user: { uid: string, displayName?: string }|null }|null} inject
 */
export function __setTestCloudFirestore(inject) {
  if (!inject) {
    _db = null;
    _firestoreApi = null;
    cloudSyncEnabled = false;
    currentUser = null;
    return;
  }
  _db = inject.db;
  _firestoreApi = inject.api;
  cloudSyncEnabled = true;
  currentUser = inject.user || null;
}

export function getCurrentCloudUser() {
  return currentUser;
}

/** Firebase セッション復元のみ（自動で Google へ飛ばさない） */
export async function ensureGoogleSession() {
  if (!cloudSyncEnabled || !_auth || !_authApi) return getEffectiveCloudUser();
  await restoreGoogleSessionQuietly();
  if (_auth && _auth.currentUser) {
    currentUser = userFromFirebaseAuthUser(_auth.currentUser);
    saveCachedCloudUser(currentUser);
    notifyUserListeners();
    return currentUser;
  }
  return getEffectiveCloudUser();
}

/** Google ログイン（ボタン押下時のみ） */
export async function signInWithGoogle() {
  return signInWithGoogleInteractive();
}

/**
 * ゲスト（匿名）ログイン — Google アカウント不要でオンライン対戦に参加できる。
 * Firestore rules は `request.auth != null` のみを要求するため匿名ユーザーで満たせる。
 * Firebase コンソールで Anonymous プロバイダの有効化が必要。
 * @returns {Promise<CloudUserSummary|null>}
 */
export async function signInAsGuest() {
  if (!(await ensureCloudAuthReady())) {
    showToast("Firebase を初期化できません。firebaseConfig.js とネットワークを確認してください。", {
      duration: 8000,
    });
    return null;
  }
  if (_auth && _auth.currentUser) {
    currentUser = userFromFirebaseAuthUser(_auth.currentUser);
    return currentUser;
  }
  if (!_authApi || typeof _authApi.signInAnonymously !== "function") {
    showToast("この Firebase SDK ではゲストログインを利用できません。", { duration: 6000 });
    return null;
  }
  try {
    const cred = await _authApi.signInAnonymously(_auth);
    if (cred && cred.user) {
      applySignedInUser(cred.user);
      showToast("ゲストとしてログインしました（データはこの端末のゲストIDに紐づきます）", { duration: 5000 });
      return currentUser;
    }
  } catch (err) {
    console.warn("[cloudAuth] signInAnonymously failed:", err);
    if (err && (err.code === "auth/operation-not-allowed" || err.code === "auth/admin-restricted-operation")) {
      showToast(
        "ゲストログインが無効です。Firebase コンソール → Authentication → Sign-in method → 「匿名」を有効化してください。",
        { duration: 12000 },
      );
    } else {
      showToast("ゲストログインに失敗しました: " + formatAuthError(err), { duration: 8000 });
    }
  }
  return null;
}

/** 現在のユーザーが匿名（ゲスト）かどうか */
export function isGuestCloudUser() {
  try {
    return !!(_auth && _auth.currentUser && _auth.currentUser.isAnonymous);
  } catch (_) {
    return false;
  }
}

export async function signOutCloud() {
  if (!cloudSyncEnabled || !_auth || !_authApi) return;
  setPreferGoogleAutoLogin(false);
  try {
    await _authApi.signOut(_auth);
  } catch (err) {
    console.warn("[cloudAuth] signOut failed:", err);
  }
}
