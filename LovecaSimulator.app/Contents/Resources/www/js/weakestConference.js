/**
 * ラブカ最弱カード会議。ルームに集まって部門ごとに最弱候補を挙げ、賛成票を投じる。
 * 通信は weakestRoomSync.js（Firestore）に閉じ込め、ここは画面と操作だけを扱う。
 */
import { T_LIVE, T_MEMBER } from "./config.js";
import { catalogListThumbnailUrl, getAllCards, getCard, uniqueProducts } from "./cards.js";
import { catalogCardSchoolLabels } from "./cardGroups.js";
import { openCardCatalogDialog } from "./cardCatalogDialog.js";
import { showToast } from "./ui.js";
import { getCurrentCloudUser, onCloudUserChange, signInWithGoogle } from "./cloudAuth.js";
import { showDeckBuilderView, showWeakestView } from "./viewNav.js";
import {
  WEAKEST_MAX_CATEGORY_LEN,
  WEAKEST_MAX_COMMENT_LEN,
  addWeakestCategory,
  closeWeakestRoom,
  createWeakestRoom,
  getWeakestMyUid,
  isWeakestHost,
  joinWeakestRoom,
  leaveWeakestRoom,
  normalizeWeakestRoomCode,
  nominateWeakestCard,
  removeWeakestCategory,
  removeWeakestEntry,
  toggleWeakestVote,
  touchWeakestPresence,
  watchWeakestEntries,
  watchWeakestRoom,
  weakestEntryHasVote,
  weakestEntryVoteCount,
  weakestSortedCategories,
} from "./weakestRoomSync.js";

const STORAGE_RECENT = "llocg.weakest.recentRooms";
const RECENT_MAX = 6;
const PRESENCE_INTERVAL_MS = 30000;
const PRESENCE_STALE_MS = 90000;
const SCHOOL_OPTIONS = ["μ's", "Aqours", "虹ヶ咲", "Liella!", "蓮ノ空"];
const TYPE_OPTIONS = [T_MEMBER, T_LIVE];

const state = {
  /** @type {string} */
  code: "",
  /** @type {import('./weakestRoomSync.js').WeakestRoomDoc|null} */
  room: null,
  /** @type {import('./weakestRoomSync.js').WeakestEntryDoc[]} */
  entries: [],
  /** @type {string} */
  activeCategoryId: "",
  /** @type {(() => void)|null} */
  unsubRoom: null,
  /** @type {(() => void)|null} */
  unsubEntries: null,
  /** @type {number|null} */
  presenceTimer: null,
  wired: false,
};

/* ---------- 小さなユーティリティ ---------- */

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function errorMessage(err) {
  return err && err.message ? String(err.message) : String(err || "エラーが発生しました");
}

function signedIn() {
  const u = getCurrentCloudUser();
  return !!(u && u.uid);
}

/** @param {string} url */
function thumbHtml(url, alt) {
  if (!url) return '<div class="weakest-thumb-fallback">?</div>';
  const low = catalogListThumbnailUrl(url);
  return (
    '<img class="deck-builder-card-thumb weakest-thumb-img" loading="lazy" decoding="async" alt="' +
    escapeHtml(alt || "") +
    '" src="' +
    escapeHtml(low) +
    '" data-full-src="' +
    escapeHtml(url) +
    '" onerror="this.onerror=null;this.src=this.dataset.fullSrc||this.src" />'
  );
}

function avatarHtml(name, photoURL, extraClass) {
  const cls = "weakest-avatar" + (extraClass ? " " + extraClass : "");
  const label = escapeHtml(name || "参加者");
  if (photoURL) {
    return '<img class="' + cls + '" src="' + escapeHtml(photoURL) + '" alt="' + label + '" title="' + label + '" />';
  }
  const initial = escapeHtml(String(name || "?").trim().slice(0, 1) || "?");
  return '<span class="' + cls + ' weakest-avatar--text" title="' + label + '">' + initial + "</span>";
}

/* ---------- 最近の会議（localStorage） ---------- */

function readRecentRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => x && x.code) : [];
  } catch (_) {
    return [];
  }
}

function rememberRoom(code, title) {
  try {
    const list = readRecentRooms().filter((x) => x.code !== code);
    list.unshift({ code: code, title: title || "", at: new Date().toISOString() });
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch (_) {
    /* noop */
  }
}

function forgetRoom(code) {
  try {
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(readRecentRooms().filter((x) => x.code !== code)));
  } catch (_) {
    /* noop */
  }
}

/* ---------- カード絞り込み ---------- */

/** @param {import('./weakestRoomSync.js').WeakestCategory|null} category */
function cardsForCategory(category) {
  const f = (category && category.filter) || {};
  const types = Array.isArray(f.types) ? f.types : [];
  const schools = Array.isArray(f.schools) ? f.schools : [];
  const products = Array.isArray(f.products) ? f.products : [];
  return getAllCards().filter(function (c) {
    if (!c) return false;
    if (c.type !== T_MEMBER && c.type !== T_LIVE) return false;
    if (types.length && types.indexOf(c.type) < 0) return false;
    if (products.length && products.indexOf(c.product) < 0) return false;
    if (schools.length) {
      const labels = catalogCardSchoolLabels(c);
      if (!labels.some((l) => schools.indexOf(l) >= 0)) return false;
    }
    return true;
  });
}

function categoryFilterLabel(category) {
  const f = (category && category.filter) || {};
  const parts = [];
  if (Array.isArray(f.types) && f.types.length) parts.push(f.types.join("・"));
  if (Array.isArray(f.schools) && f.schools.length) parts.push(f.schools.join("・"));
  if (Array.isArray(f.products) && f.products.length) parts.push(f.products.join("・"));
  return parts.length ? parts.join(" / ") : "全カード";
}

/* ---------- ルーム接続 ---------- */

function detachRoom() {
  if (state.unsubRoom) {
    try {
      state.unsubRoom();
    } catch (_) {
      /* noop */
    }
  }
  if (state.unsubEntries) {
    try {
      state.unsubEntries();
    } catch (_) {
      /* noop */
    }
  }
  if (state.presenceTimer != null) {
    clearInterval(state.presenceTimer);
  }
  state.unsubRoom = null;
  state.unsubEntries = null;
  state.presenceTimer = null;
  state.code = "";
  state.room = null;
  state.entries = [];
  state.activeCategoryId = "";
}

/** @param {string} code */
function attachRoom(code) {
  state.code = code;
  state.unsubRoom = watchWeakestRoom(
    code,
    function (room) {
      if (!room) {
        showToast("この会議は終了しました");
        forgetRoom(code);
        detachRoom();
        renderAll();
        return;
      }
      state.room = room;
      const cats = weakestSortedCategories(room);
      if (!state.activeCategoryId || !cats.some((c) => c.id === state.activeCategoryId)) {
        state.activeCategoryId = cats.length ? cats[0].id : "";
      }
      renderAll();
    },
    function (err) {
      showToast(errorMessage(err));
    },
  );
  state.unsubEntries = watchWeakestEntries(
    code,
    function (entries) {
      state.entries = entries;
      renderRanking();
    },
    function (err) {
      showToast(errorMessage(err));
    },
  );
  state.presenceTimer = window.setInterval(function () {
    touchWeakestPresence(code);
    renderMembers();
  }, PRESENCE_INTERVAL_MS);
}

/** @param {string} rawCode @param {{ silent?: boolean }} [opts] */
async function enterRoom(rawCode, opts) {
  const code = normalizeWeakestRoomCode(rawCode);
  if (!code) return;
  if (!signedIn()) {
    if (!(opts && opts.silent)) showToast("会議への参加には Google ログインが必要です");
    renderAll();
    return;
  }
  if (state.code === code) {
    showWeakestView();
    return;
  }
  try {
    const res = await joinWeakestRoom(code);
    if (state.code && state.code !== code) await leaveWeakestRoom(state.code);
    detachRoom();
    attachRoom(code);
    state.room = res.room;
    rememberRoom(code, res.room && res.room.title);
    setLocationHashCode(code);
    showWeakestView();
    renderAll();
  } catch (err) {
    showToast(errorMessage(err));
    forgetRoom(code);
    renderAll();
  }
}

async function exitRoom() {
  const code = state.code;
  if (!code) return;
  await leaveWeakestRoom(code);
  detachRoom();
  setLocationHashCode("");
  renderAll();
  showToast("会議から退室しました");
}

/* ---------- ハッシュ（招待リンク） ---------- */

function codeFromHash() {
  const m = /(?:^|#|&)weakest=([A-Za-z0-9]+)/.exec(String(location.hash || ""));
  return m ? normalizeWeakestRoomCode(m[1]) : "";
}

function setLocationHashCode(code) {
  try {
    const next = code ? "#weakest=" + code : "";
    if (String(location.hash || "") === next) return;
    history.replaceState(null, "", location.pathname + location.search + next);
  } catch (_) {
    /* noop */
  }
}

function inviteUrl(code) {
  return location.origin + location.pathname + location.search + "#weakest=" + code;
}

/* ---------- 描画 ---------- */

function renderAll() {
  const lobby = el("weakest-lobby");
  const room = el("weakest-room");
  const inRoom = !!(state.code && state.room);
  if (lobby) lobby.hidden = inRoom;
  if (room) room.hidden = !inRoom;
  renderLobby();
  renderRoomHeader();
  renderCategoryTabs();
  renderMembers();
  renderRanking();
}

function renderLobby() {
  const notice = el("weakest-signin-notice");
  const panels = el("weakest-lobby-panels");
  const ok = signedIn();
  if (notice) notice.hidden = ok;
  if (panels) panels.hidden = !ok;

  const recentPanel = el("weakest-recent-panel");
  const recentList = el("weakest-recent-list");
  const recent = ok ? readRecentRooms() : [];
  if (recentPanel) recentPanel.hidden = !recent.length;
  if (recentList) {
    recentList.innerHTML = recent
      .map(function (r) {
        return (
          '<button type="button" class="btn sm secondary weakest-recent-item" data-weakest-recent="' +
          escapeHtml(r.code) +
          '"><span class="weakest-recent-code">' +
          escapeHtml(r.code) +
          '</span><span class="weakest-recent-title">' +
          escapeHtml(r.title || "無題の会議") +
          "</span></button>"
        );
      })
      .join("");
  }
}

function renderRoomHeader() {
  const meta = el("weakest-room-meta");
  const titleEl = el("weakest-room-title");
  const codeEl = el("weakest-room-code");
  const leaveBtn = el("btn-weakest-leave");
  const closeBtn = el("btn-weakest-close");
  const inRoom = !!(state.code && state.room);
  const host = isWeakestHost(state.room, getWeakestMyUid());
  if (meta) meta.hidden = !inRoom;
  if (leaveBtn) leaveBtn.hidden = !inRoom;
  if (closeBtn) closeBtn.hidden = !(inRoom && host);
  if (titleEl) titleEl.textContent = inRoom ? state.room.title || "無題の会議" : "";
  if (codeEl) codeEl.textContent = inRoom ? state.code : "";
}

function renderMembers() {
  const box = el("weakest-members");
  if (!box) return;
  if (!state.room) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  const members = state.room.members || {};
  const now = Date.now();
  const uids = Object.keys(members);
  box.hidden = !uids.length;
  box.innerHTML = uids
    .map(function (uid) {
      const m = members[uid] || {};
      const seen = m.lastSeenAt ? Date.parse(m.lastSeenAt) : 0;
      const stale = !seen || now - seen > PRESENCE_STALE_MS;
      const isHost = state.room.hostUid === uid;
      const name = (m.name || "参加者") + (isHost ? "（作成者）" : "") + (stale ? "・離席中" : "");
      return avatarHtml(name, m.photoURL, stale ? "weakest-avatar--stale" : "");
    })
    .join("");
}

function renderCategoryTabs() {
  const tabs = el("weakest-tabs");
  if (!tabs) return;
  if (!state.room) {
    tabs.innerHTML = "";
    return;
  }
  const cats = weakestSortedCategories(state.room);
  const host = isWeakestHost(state.room, getWeakestMyUid());
  const html = cats
    .map(function (c) {
      const active = c.id === state.activeCategoryId;
      return (
        '<button type="button" role="tab" class="weakest-tab' +
        (active ? " is-active" : "") +
        '" aria-selected="' +
        (active ? "true" : "false") +
        '" data-weakest-cat="' +
        escapeHtml(c.id) +
        '"><span class="weakest-tab__name">' +
        escapeHtml(c.name) +
        '</span><span class="weakest-tab__filter">' +
        escapeHtml(categoryFilterLabel(c)) +
        "</span></button>"
      );
    })
    .join("");
  const addBtn = host
    ? '<button type="button" class="btn sm secondary weakest-tab-add" id="btn-weakest-add-category">＋ 部門を追加</button>'
    : "";
  const delBtn =
    host && state.activeCategoryId
      ? '<button type="button" class="btn sm secondary weakest-tab-del" id="btn-weakest-del-category">この部門を削除</button>'
      : "";
  tabs.innerHTML =
    html +
    addBtn +
    delBtn +
    (!cats.length && !host
      ? '<p class="muted weakest-tab-empty">作成者が部門を追加するのを待っています。</p>'
      : "");
}

function activeCategory() {
  if (!state.room || !state.activeCategoryId) return null;
  return (state.room.categories || {})[state.activeCategoryId] || null;
}

function sortedEntriesForActiveCategory() {
  const catId = state.activeCategoryId;
  if (!catId) return [];
  return state.entries
    .filter(function (e) {
      return e && e.categoryId === catId;
    })
    .sort(function (a, b) {
      const va = weakestEntryVoteCount(a);
      const vb = weakestEntryVoteCount(b);
      if (va !== vb) return vb - va;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
}

function renderRanking() {
  const box = el("weakest-ranking");
  const empty = el("weakest-empty");
  const summary = el("weakest-summary");
  const addCardBtn = el("btn-weakest-add-card");
  if (!box) return;
  const cat = activeCategory();
  if (addCardBtn) addCardBtn.disabled = !cat;
  if (!state.room || !cat) {
    box.innerHTML = "";
    if (empty) empty.hidden = true;
    if (summary) summary.textContent = "";
    return;
  }
  const list = sortedEntriesForActiveCategory();
  const myUid = getWeakestMyUid();
  const host = isWeakestHost(state.room, myUid);
  const maxVotes = list.length ? weakestEntryVoteCount(list[0]) : 0;
  const memberCount = Object.keys(state.room.members || {}).length;

  if (summary) {
    summary.textContent = list.length
      ? list.length + " 枚 / 参加者 " + memberCount + " 人（" + categoryFilterLabel(cat) + "）"
      : categoryFilterLabel(cat);
  }
  if (empty) empty.hidden = list.length > 0;

  box.innerHTML = list
    .map(function (e, idx) {
      const card = getCard(e.cardNo);
      const votes = weakestEntryVoteCount(e);
      const voted = weakestEntryHasVote(e, myUid);
      const pct = maxVotes > 0 ? Math.round((votes / maxVotes) * 100) : 0;
      const name = card && card.name ? card.name : e.cardNo;
      const typeLabel = card && card.type ? card.type : "";
      const schoolLabel = card ? catalogCardSchoolLabels(card).join(" / ") : "";
      const voters = Object.keys(e.votes || {})
        .map(function (uid) {
          const v = e.votes[uid];
          const label = v && v.comment ? v.name + "「" + v.comment + "」" : (v && v.name) || "参加者";
          return avatarHtml(label, v && v.photoURL, "weakest-avatar--sm");
        })
        .join("");
      const canRemove = host || e.byUid === myUid;
      return (
        '<article class="weakest-entry' +
        (idx === 0 && votes > 0 ? " weakest-entry--top" : "") +
        '" data-entry-id="' +
        escapeHtml(e.id) +
        '">' +
        '<div class="weakest-entry__rank">' +
        (idx + 1) +
        "</div>" +
        '<button type="button" class="weakest-entry__thumb" data-weakest-detail="' +
        escapeHtml(e.cardNo) +
        '" title="カード詳細">' +
        thumbHtml(card && card.img, name) +
        "</button>" +
        '<div class="weakest-entry__main">' +
        '<div class="weakest-entry__name">' +
        escapeHtml(name) +
        '<span class="weakest-entry__no">' +
        escapeHtml(e.cardNo) +
        "</span></div>" +
        '<div class="weakest-entry__meta muted">' +
        escapeHtml([typeLabel, schoolLabel].filter(Boolean).join(" ・ ")) +
        " ／ 推薦: " +
        escapeHtml(e.byName || "参加者") +
        "</div>" +
        (e.comment ? '<p class="weakest-entry__comment">「' + escapeHtml(e.comment) + "」</p>" : "") +
        '<div class="weakest-entry__bar"><span style="width:' +
        pct +
        '%"></span></div>' +
        '<div class="weakest-entry__voters">' +
        voters +
        "</div>" +
        "</div>" +
        '<div class="weakest-entry__actions">' +
        '<button type="button" class="btn sm weakest-vote-btn' +
        (voted ? " primary is-voted" : " secondary") +
        '" data-weakest-vote="' +
        escapeHtml(e.id) +
        '">' +
        (voted ? "投票済み" : "最弱に一票") +
        '<b class="weakest-vote-count">' +
        votes +
        "</b></button>" +
        (canRemove
          ? '<button type="button" class="btn sm secondary weakest-entry__remove" data-weakest-remove="' +
            escapeHtml(e.id) +
            '">取り下げ</button>'
          : "") +
        "</div>" +
        "</article>"
      );
    })
    .join("");
}

/* ---------- 部門作成ダイアログ ---------- */

function openCategoryDialog() {
  if (!state.room) return;
  const backdrop = document.createElement("div");
  backdrop.className = "weakest-overlay-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const dialog = document.createElement("div");
  dialog.className = "weakest-overlay-dialog";

  const products = uniqueProducts(getAllCards());
  const typeChecks = TYPE_OPTIONS.map(function (t) {
    return '<label class="chk"><input type="checkbox" data-weakest-type="' + escapeHtml(t) + '" /> ' + escapeHtml(t) + "</label>";
  }).join("");
  const schoolChecks = SCHOOL_OPTIONS.map(function (s) {
    return '<label class="chk"><input type="checkbox" data-weakest-school="' + escapeHtml(s) + '" /> ' + escapeHtml(s) + "</label>";
  }).join("");
  const productOptions =
    '<option value="">すべての商品</option>' +
    products
      .map(function (p) {
        return '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>";
      })
      .join("");

  dialog.innerHTML =
    "<h3>部門を追加</h3>" +
    '<label class="field"><span>部門名</span><input type="text" class="weakest-cat-name" maxlength="' +
    WEAKEST_MAX_CATEGORY_LEN +
    '" placeholder="例: Aqours ライブ部門" /></label>' +
    '<div class="field"><span>カード種別（未選択なら全部）</span><div class="weakest-check-row">' +
    typeChecks +
    "</div></div>" +
    '<div class="field"><span>スクール（未選択なら全部）</span><div class="weakest-check-row">' +
    schoolChecks +
    "</div></div>" +
    '<label class="field"><span>商品</span><select class="weakest-cat-product">' +
    productOptions +
    "</select></label>" +
    '<p class="hint muted">絞り込みはカード追加時の初期条件になります。あとから解除して他のカードも挙げられます。</p>' +
    '<div class="weakest-overlay-actions">' +
    '<button type="button" class="btn secondary weakest-cat-cancel">キャンセル</button>' +
    '<button type="button" class="btn primary weakest-cat-ok">部門を作る</button>' +
    "</div>";

  const nameInput = dialog.querySelector(".weakest-cat-name");
  const productSelect = dialog.querySelector(".weakest-cat-product");
  let nameTouched = false;

  function readTypes() {
    return Array.from(dialog.querySelectorAll("[data-weakest-type]"))
      .filter((i) => i.checked)
      .map((i) => i.getAttribute("data-weakest-type"));
  }
  function readSchools() {
    return Array.from(dialog.querySelectorAll("[data-weakest-school]"))
      .filter((i) => i.checked)
      .map((i) => i.getAttribute("data-weakest-school"));
  }
  function suggestName() {
    if (nameTouched) return;
    const types = readTypes();
    const schools = readSchools();
    const head = schools.length ? schools.join("・") : "";
    const tail = types.length === 1 ? types[0] : "";
    const label = [head, tail].filter(Boolean).join(" ");
    nameInput.value = (label ? label + "部門" : "最弱部門").slice(0, WEAKEST_MAX_CATEGORY_LEN);
  }

  nameInput.addEventListener("input", function () {
    nameTouched = true;
  });
  dialog.querySelectorAll("[data-weakest-type],[data-weakest-school]").forEach(function (input) {
    input.addEventListener("change", suggestName);
  });

  function close() {
    backdrop.remove();
  }
  dialog.querySelector(".weakest-cat-cancel").addEventListener("click", close);
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) close();
  });
  dialog.querySelector(".weakest-cat-ok").addEventListener("click", async function () {
    const product = productSelect.value ? [productSelect.value] : [];
    try {
      const cat = await addWeakestCategory(state.code, {
        name: nameInput.value,
        filter: { types: readTypes(), schools: readSchools(), products: product },
      });
      state.activeCategoryId = cat.id;
      close();
      showToast("部門「" + cat.name + "」を追加しました");
    } catch (err) {
      showToast(errorMessage(err));
    }
  });

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  suggestName();
  nameInput.focus();
}

/* ---------- カード追加 ---------- */

function openCardPicker() {
  const cat = activeCategory();
  if (!cat) {
    showToast("先に部門を作ってください");
    return;
  }
  const existingCardNos = new Set(
    state.entries.filter((e) => e.categoryId === cat.id).map((e) => String(e.cardNo)),
  );
  let useCategoryFilter = true;

  const backdrop = document.createElement("div");
  backdrop.className = "weakest-overlay-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const dialog = document.createElement("div");
  dialog.className = "weakest-overlay-dialog weakest-pick-dialog";
  dialog.innerHTML =
    "<h3>" +
    escapeHtml(cat.name) +
    " に挙げるカード</h3>" +
    '<label class="field"><span>検索</span><input type="search" class="weakest-pick-search" placeholder="カード名・番号・効果テキスト" /></label>' +
    '<label class="chk weakest-pick-scope"><input type="checkbox" class="weakest-pick-all" /> 部門の絞り込みを解除して全カードから探す</label>' +
    '<p class="hint muted weakest-pick-hint"></p>' +
    '<div class="weakest-pick-grid"></div>' +
    '<div class="weakest-overlay-actions"><button type="button" class="btn secondary weakest-pick-cancel">閉じる</button></div>';

  const searchInput = dialog.querySelector(".weakest-pick-search");
  const allToggle = dialog.querySelector(".weakest-pick-all");
  const hintEl = dialog.querySelector(".weakest-pick-hint");
  const grid = dialog.querySelector(".weakest-pick-grid");

  function close() {
    backdrop.remove();
  }

  function renderGrid() {
    const base = useCategoryFilter ? cardsForCategory(cat) : cardsForCategory(null);
    const q = String(searchInput.value || "").trim().toLowerCase();
    let filtered = base;
    if (q) {
      filtered = base.filter(function (c) {
        const hay = String(c.name || "") + " " + String(c.card_no || "") + " " + String(c.ability || "");
        return hay.toLowerCase().indexOf(q) >= 0;
      });
    }
    hintEl.textContent =
      (useCategoryFilter ? categoryFilterLabel(cat) : "全カード") +
      " から " +
      filtered.length +
      " 枚" +
      (filtered.length > 400 ? "（先頭 400 枚を表示）" : "");
    grid.innerHTML = filtered
      .slice(0, 400)
      .map(function (c) {
        const already = existingCardNos.has(String(c.card_no));
        return (
          '<button type="button" class="weakest-pick-card' +
          (already ? " is-already" : "") +
          '" data-weakest-pick="' +
          escapeHtml(c.card_no) +
          '" aria-label="' +
          escapeHtml(c.name || c.card_no) +
          '">' +
          thumbHtml(c.img, c.name || c.card_no) +
          (already ? '<span class="weakest-pick-badge">挙がっています</span>' : "") +
          "</button>"
        );
      })
      .join("");
    if (!filtered.length) {
      grid.innerHTML = '<p class="muted">該当するカードがありません。</p>';
    }
  }

  searchInput.addEventListener("input", renderGrid);
  allToggle.addEventListener("change", function () {
    useCategoryFilter = !allToggle.checked;
    renderGrid();
  });
  grid.addEventListener("click", function (ev) {
    const btn = ev.target && ev.target.closest ? ev.target.closest("[data-weakest-pick]") : null;
    if (!btn) return;
    const cardNo = btn.getAttribute("data-weakest-pick");
    if (existingCardNos.has(String(cardNo))) {
      showToast("このカードはすでにこの部門に挙がっています");
      return;
    }
    close();
    openNominateDialog(cardNo, cat);
  });
  dialog.querySelector(".weakest-pick-cancel").addEventListener("click", close);
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) close();
  });

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  renderGrid();
  searchInput.focus();
}

/** @param {string} cardNo @param {import('./weakestRoomSync.js').WeakestCategory} cat */
function openNominateDialog(cardNo, cat) {
  const card = getCard(cardNo);
  const backdrop = document.createElement("div");
  backdrop.className = "weakest-overlay-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const dialog = document.createElement("div");
  dialog.className = "weakest-overlay-dialog weakest-nominate-dialog";
  dialog.innerHTML =
    "<h3>" +
    escapeHtml(cat.name) +
    " に挙げる</h3>" +
    '<div class="weakest-nominate-card">' +
    thumbHtml(card && card.img, (card && card.name) || cardNo) +
    '<div class="weakest-nominate-card__text"><div class="weakest-nominate-card__name">' +
    escapeHtml((card && card.name) || cardNo) +
    '</div><div class="muted">' +
    escapeHtml(cardNo) +
    "</div></div></div>" +
    '<label class="field"><span>ひとこと（任意・弱いと思う理由）</span><input type="text" class="weakest-nominate-comment" maxlength="' +
    WEAKEST_MAX_COMMENT_LEN +
    '" placeholder="例: コストが重すぎる" /></label>' +
    '<p class="hint muted">挙げると自動で自分の1票が入ります。</p>' +
    '<div class="weakest-overlay-actions">' +
    '<button type="button" class="btn secondary weakest-nominate-cancel">戻る</button>' +
    '<button type="button" class="btn primary weakest-nominate-ok">この部門に挙げる</button>' +
    "</div>";

  const commentInput = dialog.querySelector(".weakest-nominate-comment");
  function close() {
    backdrop.remove();
  }
  dialog.querySelector(".weakest-nominate-cancel").addEventListener("click", function () {
    close();
    openCardPicker();
  });
  backdrop.addEventListener("click", function (ev) {
    if (ev.target === backdrop) close();
  });
  dialog.querySelector(".weakest-nominate-ok").addEventListener("click", async function () {
    try {
      await nominateWeakestCard(state.code, {
        cardNo: cardNo,
        categoryId: cat.id,
        comment: commentInput.value,
      });
      close();
      showToast("「" + ((card && card.name) || cardNo) + "」を挙げました");
    } catch (err) {
      showToast(errorMessage(err));
      if (err && err.code === "weakest/duplicate-entry") close();
    }
  });

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  commentInput.focus();
}

/* ---------- 操作の配線 ---------- */

function wireLobby() {
  el("btn-weakest-signin")?.addEventListener("click", async function () {
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(errorMessage(err));
    }
  });

  el("btn-weakest-create")?.addEventListener("click", async function () {
    const input = /** @type {HTMLInputElement|null} */ (el("weakest-create-title"));
    const btn = el("btn-weakest-create");
    if (btn) btn.disabled = true;
    try {
      const res = await createWeakestRoom(input ? input.value : "");
      detachRoom();
      attachRoom(res.code);
      state.room = res.room;
      rememberRoom(res.code, res.room.title);
      setLocationHashCode(res.code);
      renderAll();
      showToast("会議を作成しました（コード " + res.code + "）");
      openCategoryDialog();
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  const joinInput = /** @type {HTMLInputElement|null} */ (el("weakest-join-code"));
  joinInput?.addEventListener("input", function () {
    joinInput.value = normalizeWeakestRoomCode(joinInput.value);
  });
  joinInput?.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") el("btn-weakest-join")?.click();
  });
  el("btn-weakest-join")?.addEventListener("click", function () {
    enterRoom(joinInput ? joinInput.value : "");
  });

  el("weakest-recent-list")?.addEventListener("click", function (ev) {
    const btn = ev.target && ev.target.closest ? ev.target.closest("[data-weakest-recent]") : null;
    if (!btn) return;
    enterRoom(btn.getAttribute("data-weakest-recent"));
  });
}

function wireRoom() {
  el("btn-weakest-back")?.addEventListener("click", function () {
    showDeckBuilderView();
  });

  el("btn-weakest-copy-link")?.addEventListener("click", async function () {
    if (!state.code) return;
    const url = inviteUrl(state.code);
    try {
      await navigator.clipboard.writeText(url);
      showToast("招待リンクをコピーしました");
    } catch (_) {
      window.prompt("この URL を共有してください", url);
    }
  });

  el("btn-weakest-leave")?.addEventListener("click", function () {
    exitRoom();
  });

  el("btn-weakest-close")?.addEventListener("click", async function () {
    if (!state.code) return;
    if (!window.confirm("この会議を終了して、挙がったカードと投票をすべて削除しますか？")) return;
    const code = state.code;
    try {
      await closeWeakestRoom(code);
      forgetRoom(code);
      detachRoom();
      setLocationHashCode("");
      renderAll();
      showToast("会議を終了しました");
    } catch (err) {
      showToast(errorMessage(err));
    }
  });

  el("weakest-tabs")?.addEventListener("click", async function (ev) {
    const target = ev.target;
    if (!target || !target.closest) return;
    if (target.closest("#btn-weakest-add-category")) {
      openCategoryDialog();
      return;
    }
    if (target.closest("#btn-weakest-del-category")) {
      const cat = activeCategory();
      if (!cat) return;
      if (!window.confirm("部門「" + cat.name + "」と、その部門に挙がったカードを削除しますか？")) return;
      try {
        await removeWeakestCategory(state.code, cat.id);
        showToast("部門を削除しました");
      } catch (err) {
        showToast(errorMessage(err));
      }
      return;
    }
    const tab = target.closest("[data-weakest-cat]");
    if (!tab) return;
    state.activeCategoryId = tab.getAttribute("data-weakest-cat");
    renderCategoryTabs();
    renderRanking();
  });

  el("btn-weakest-add-card")?.addEventListener("click", function () {
    openCardPicker();
  });

  el("weakest-ranking")?.addEventListener("click", async function (ev) {
    const target = ev.target;
    if (!target || !target.closest) return;

    const detailBtn = target.closest("[data-weakest-detail]");
    if (detailBtn) {
      const card = getCard(detailBtn.getAttribute("data-weakest-detail"));
      if (card) openCardCatalogDialog(card);
      return;
    }

    const voteBtn = target.closest("[data-weakest-vote]");
    if (voteBtn) {
      voteBtn.disabled = true;
      try {
        const nowVoted = await toggleWeakestVote(state.code, voteBtn.getAttribute("data-weakest-vote"));
        showToast(nowVoted ? "投票しました" : "投票を取り消しました");
      } catch (err) {
        showToast(errorMessage(err));
      } finally {
        voteBtn.disabled = false;
      }
      return;
    }

    const removeBtn = target.closest("[data-weakest-remove]");
    if (removeBtn) {
      if (!window.confirm("このカードを取り下げますか？（票もなくなります）")) return;
      try {
        await removeWeakestEntry(state.code, removeBtn.getAttribute("data-weakest-remove"));
        showToast("取り下げました");
      } catch (err) {
        showToast(errorMessage(err));
      }
    }
  });
}

export function initWeakestConference() {
  const root = el("view-weakest");
  if (!root || state.wired) return;
  state.wired = true;

  wireLobby();
  wireRoom();

  onCloudUserChange(function () {
    renderAll();
    const hashCode = codeFromHash();
    if (hashCode && !state.code && signedIn()) enterRoom(hashCode, { silent: true });
  });

  /* 表示中のページに招待リンクが渡されたとき（同一ドキュメントなので再読込は起きない） */
  window.addEventListener("hashchange", function () {
    const code = codeFromHash();
    if (!code || code === state.code) return;
    showWeakestView();
    enterRoom(code);
  });

  renderAll();

  const initialCode = codeFromHash();
  if (initialCode) {
    showWeakestView();
    if (signedIn()) enterRoom(initialCode, { silent: true });
  }
}

/** デッキ編集などから会議画面を開く。招待リンク経由ならそのルームに入る。 */
export function openWeakestConference() {
  showWeakestView();
  const code = codeFromHash();
  if (code && !state.code && signedIn()) enterRoom(code, { silent: true });
  renderAll();
}
