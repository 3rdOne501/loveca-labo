/**
 * ラブカ ティアリストメーカー。ルームに集まってカードをティアに並べる。
 * 通信は tierListRoomSync.js（Firestore）に閉じ込め、ここは画面と操作だけを扱う。
 */
import { T_LIVE, T_MEMBER } from "./config.js";
import {
  catalogCardImageUrl,
  catalogThumbImgHtml,
  getAllCards,
  getCard,
  prefetchCatalogListThumbnails,
  uniqueProducts,
} from "./cards.js";
import { catalogCardSchoolLabels } from "./cardGroups.js";
import { openCardCatalogDialog } from "./cardCatalogDialog.js";
import { showToast } from "./ui.js";
import { getCurrentCloudUser, onCloudUserChange, signInWithGoogle } from "./cloudAuth.js";
import { showDeckBuilderView, showTierListView } from "./viewNav.js";
import { getMemberCharacterById, listMemberCharacterRoster } from "./memberCharacterIcons.js";
import { isPageVisible, onPageVisibilityChange } from "./pageVisibility.js";
import {
  TIERLIST_KIND_CHARACTER,
  TIERLIST_MAX_TIER_LABEL_LEN,
  TIERLIST_POOL_ID,
  addTierListTier,
  closeTierListRoom,
  createTierListRoom,
  getTierListMyUid,
  isTierListHost,
  joinTierListRoom,
  leaveTierListRoom,
  normalizeTierListRoomCode,
  placeTierListCard,
  removeTierListCard,
  removeTierListTier,
  tierListEntryItemId,
  tierListRoomKind,
  tierListSortedTiers,
  touchTierListPresence,
  updateTierListTier,
  watchTierListEntries,
  watchTierListRoom,
} from "./tierListRoomSync.js";

const STORAGE_RECENT = "llocg.tierlist.recentRooms";
const STORAGE_PICKER_FILTERS = "llocg.tierlist.pickerFilters";
const RECENT_MAX = 6;
const PRESENCE_INTERVAL_MS = 30000;
const PRESENCE_STALE_MS = 90000;
const SCHOOL_OPTIONS = ["μ's", "Aqours", "虹ヶ咲", "Liella!", "蓮ノ空"];
const TYPE_OPTIONS = [T_MEMBER, T_LIVE];
const PICKER_CAP = 400;
const PICKER_THUMB_PREFETCH = 48;
const PICKER_THUMB_EAGER = 24;

/** @returns {{ type: string, school: string, product: string, q: string }} */
function loadPickerFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_PICKER_FILTERS);
    const o = raw ? JSON.parse(raw) : null;
    if (!o || typeof o !== "object") {
      return { type: "", school: "", product: "", q: "" };
    }
    return {
      type: String(o.type || ""),
      school: String(o.school || ""),
      product: String(o.product || ""),
      q: String(o.q || ""),
    };
  } catch (_) {
    return { type: "", school: "", product: "", q: "" };
  }
}

/** @param {{ type?: string, school?: string, product?: string, q?: string }} filters */
function savePickerFilters(filters) {
  try {
    localStorage.setItem(
      STORAGE_PICKER_FILTERS,
      JSON.stringify({
        type: String((filters && filters.type) || ""),
        school: String((filters && filters.school) || ""),
        product: String((filters && filters.product) || ""),
        q: String((filters && filters.q) || ""),
      }),
    );
  } catch (_) {
    /* noop */
  }
}

const state = {
  /** @type {string} */
  code: "",
  /** @type {import('./tierListRoomSync.js').TierListRoomDoc|null} */
  room: null,
  /** @type {import('./tierListRoomSync.js').TierListEntryDoc[]} */
  entries: [],
  /** @type {string} 選択中の cardNo または charId */
  selectedCardNo: "",
  /** @type {(() => void)|null} */
  unsubRoom: null,
  /** @type {(() => void)|null} */
  unsubEntries: null,
  /** @type {number|null} */
  presenceTimer: null,
  /** タブ非表示で Firestore 購読を外している（code は保持） */
  syncPaused: false,
  wired: false,
};

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

function isCharacterRoom() {
  return tierListRoomKind(state.room) === TIERLIST_KIND_CHARACTER;
}

function selectedEntry() {
  if (!state.selectedCardNo) return null;
  return (
    state.entries.find(function (e) {
      return tierListEntryItemId(e) === state.selectedCardNo;
    }) || null
  );
}

/** @param {string} url @param {string} [alt] @param {{ eager?: boolean } | undefined} [opts] */
function thumbHtml(url, alt, opts) {
  if (!url) return '<div class="tierlist-thumb-fallback">?</div>';
  const o = opts != null && typeof opts === "object" ? opts : {};
  return catalogThumbImgHtml(url, "deck-builder-card-thumb tierlist-thumb-img", {
    alt: alt || "",
    eager: o.eager === true,
  });
}

function syncBoardSelectionOnly() {
  const board = el("tierlist-board");
  if (!board) return;
  const sel = state.selectedCardNo || "";
  board.querySelectorAll(".tierlist-card[data-card-no], .tierlist-char[data-char-id]").forEach(function (btn) {
    const id = btn.getAttribute("data-card-no") || btn.getAttribute("data-char-id") || "";
    btn.classList.toggle("is-selected", !!sel && id === sel);
  });
}

function avatarHtml(name, photoURL, extraClass) {
  const cls = "tierlist-avatar" + (extraClass ? " " + extraClass : "");
  if (photoURL) {
    return (
      '<img class="' +
      cls +
      '" src="' +
      escapeHtml(photoURL) +
      '" alt="' +
      escapeHtml(name || "") +
      '" title="' +
      escapeHtml(name || "") +
      '" />'
    );
  }
  const ch = String(name || "?").trim().charAt(0) || "?";
  return (
    '<span class="' +
    cls +
    ' tierlist-avatar--letter" title="' +
    escapeHtml(name || "") +
    '">' +
    escapeHtml(ch) +
    "</span>"
  );
}

function codeFromHash() {
  const m = String(location.hash || "").match(/#tierlist=([A-Za-z0-9]{5})/i);
  return m ? normalizeTierListRoomCode(m[1]) : "";
}

/** @param {string} code */
function setLocationHashCode(code) {
  const next = code ? "#tierlist=" + normalizeTierListRoomCode(code) : "";
  if (String(location.hash || "") === next) return;
  try {
    history.replaceState(null, "", next || location.pathname + location.search);
  } catch (_) {
    location.hash = next;
  }
}

function inviteUrl(code) {
  return location.origin + location.pathname + location.search + "#tierlist=" + normalizeTierListRoomCode(code);
}

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
  } catch (_) {
    return [];
  }
}

/** @param {{ code: string, title: string }} item */
function pushRecent(item) {
  if (!item || !item.code) return;
  const next = [{ code: item.code, title: item.title || "", at: Date.now() }]
    .concat(loadRecent().filter(function (r) {
      return r && r.code !== item.code;
    }))
    .slice(0, RECENT_MAX);
  try {
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(next));
  } catch (_) {
    /* noop */
  }
}

function stopPresenceTimer() {
  if (state.presenceTimer != null) {
    clearInterval(state.presenceTimer);
    state.presenceTimer = null;
  }
}

function unbindRoomWatchers() {
  if (state.unsubRoom) {
    try {
      state.unsubRoom();
    } catch (_) {
      /* noop */
    }
    state.unsubRoom = null;
  }
  if (state.unsubEntries) {
    try {
      state.unsubEntries();
    } catch (_) {
      /* noop */
    }
    state.unsubEntries = null;
  }
}

function startPresenceTimer() {
  stopPresenceTimer();
  if (!state.code || !isPageVisible()) return;
  state.presenceTimer = setInterval(function () {
    if (state.code && isPageVisible()) touchTierListPresence(state.code);
  }, PRESENCE_INTERVAL_MS);
}

function bindRoomWatchers() {
  if (!state.code || state.unsubRoom || state.unsubEntries) return;
  const code = state.code;
  state.unsubRoom = watchTierListRoom(
    code,
    function (room) {
      if (!room) {
        showToast("ルームが終了したか、見つかりません");
        leaveToLobby(false);
        return;
      }
      state.room = room;
      pushRecent({ code: state.code, title: room.title || "" });
      renderAll();
    },
    function () {
      showToast("ルームの同期に失敗しました");
    },
  );
  state.unsubEntries = watchTierListEntries(
    code,
    function (entries) {
      state.entries = Array.isArray(entries) ? entries : [];
      renderBoard();
      renderMoveBar();
    },
    function () {
      showToast("カード一覧の同期に失敗しました");
    },
  );
}

function pauseRoomSyncForHidden() {
  if (!state.code || state.syncPaused) return;
  state.syncPaused = true;
  stopPresenceTimer();
  unbindRoomWatchers();
}

function resumeRoomSyncFromHidden() {
  if (!state.code || !state.syncPaused) return;
  state.syncPaused = false;
  bindRoomWatchers();
  startPresenceTimer();
  touchTierListPresence(state.code);
}

function detachRoom() {
  stopPresenceTimer();
  unbindRoomWatchers();
  state.syncPaused = false;
  state.code = "";
  state.room = null;
  state.entries = [];
  state.selectedCardNo = "";
}

function attachRoom(code) {
  detachRoom();
  state.code = normalizeTierListRoomCode(code);
  state.syncPaused = false;
  if (isPageVisible()) {
    bindRoomWatchers();
    startPresenceTimer();
    touchTierListPresence(state.code);
  } else {
    state.syncPaused = true;
  }
  setLocationHashCode(state.code);
  renderAll();
}

/** @param {boolean} [clearHash] */
async function leaveToLobby(clearHash) {
  const code = state.code;
  if (code) {
    try {
      await leaveTierListRoom(code);
    } catch (_) {
      /* noop */
    }
  }
  detachRoom();
  if (clearHash !== false) setLocationHashCode("");
  renderAll();
}

async function enterRoom(rawCode) {
  try {
    const { code } = await joinTierListRoom(rawCode);
    attachRoom(code);
  } catch (err) {
    showToast(errorMessage(err));
    throw err;
  }
}

function renderAll() {
  renderLobby();
  renderRoomHeader();
  renderRoomToolbar();
  renderMembers();
  renderBoard();
  renderMoveBar();
  renderHostTools();
}

function renderLobby() {
  const lobby = el("tierlist-lobby");
  const room = el("tierlist-room");
  const inRoom = !!state.code;
  if (lobby) lobby.hidden = inRoom;
  if (room) room.hidden = !inRoom;
  const notice = el("tierlist-signin-notice");
  const panels = el("tierlist-lobby-panels");
  if (notice) notice.hidden = signedIn();
  if (panels) panels.hidden = !signedIn();
  const recentPanel = el("tierlist-recent-panel");
  const recentList = el("tierlist-recent-list");
  if (recentPanel && recentList) {
    const recent = loadRecent();
    recentPanel.hidden = !recent.length || !signedIn() || inRoom;
    recentList.innerHTML = recent
      .map(function (r) {
        return (
          '<button type="button" class="btn sm secondary tierlist-recent-item" data-code="' +
          escapeHtml(r.code) +
          '">' +
          '<span class="tierlist-recent-code">' +
          escapeHtml(r.code) +
          "</span>" +
          '<span class="tierlist-recent-title">' +
          escapeHtml(r.title || "ティアリスト") +
          "</span></button>"
        );
      })
      .join("");
  }
}

function renderRoomHeader() {
  const meta = el("tierlist-room-meta");
  const titleEl = el("tierlist-room-title");
  const codeEl = el("tierlist-room-code");
  const leaveBtn = el("btn-tierlist-leave");
  const closeBtn = el("btn-tierlist-close");
  const inRoom = !!state.code && !!state.room;
  if (meta) meta.hidden = !inRoom;
  if (titleEl) titleEl.textContent = inRoom ? state.room.title || "ティアリスト" : "";
  const kindEl = el("tierlist-room-kind");
  if (kindEl) {
    kindEl.hidden = !inRoom || !isCharacterRoom();
    kindEl.textContent = inRoom && isCharacterRoom() ? "キャラティア" : "";
  }
  if (codeEl) codeEl.textContent = inRoom ? state.code : "";
  if (leaveBtn) leaveBtn.hidden = !inRoom;
  if (closeBtn) {
    closeBtn.hidden = !inRoom || !isTierListHost(state.room, getTierListMyUid());
  }
}

function renderMembers() {
  const host = el("tierlist-members");
  if (!host) return;
  if (!state.room) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const now = Date.now();
  const members = state.room.members || {};
  const uids = Object.keys(members);
  host.hidden = !uids.length;
  host.innerHTML = uids
    .map(function (uid) {
      const m = members[uid];
      const last = m && m.lastSeenAt ? Date.parse(m.lastSeenAt) : 0;
      const stale = !last || now - last > PRESENCE_STALE_MS;
      const isHost = state.room.hostUid === uid;
      return (
        '<span class="tierlist-member' +
        (stale ? " is-stale" : "") +
        (isHost ? " is-host" : "") +
        '" title="' +
        escapeHtml((m && m.name) || "") +
        (isHost ? "（ホスト）" : "") +
        (stale ? "・離席気味" : "") +
        '">' +
        avatarHtml(m && m.name, m && m.photoURL) +
        "</span>"
      );
    })
    .join("");
}

function entriesInTier(tierId) {
  return state.entries
    .filter(function (e) {
      return e && e.tierId === tierId;
    })
    .sort(function (a, b) {
      return (Number(a.orderInTier) || 0) - (Number(b.orderInTier) || 0);
    });
}

function memberIconHtml(href, alt) {
  if (!href) return '<div class="tierlist-char-icon tierlist-char-icon--fallback">?</div>';
  return (
    '<img class="tierlist-char-icon" src="' +
    escapeHtml(href) +
    '" alt="' +
    escapeHtml(alt || "") +
    '" loading="lazy" />'
  );
}

function charChipHtml(entry) {
  const id = entry.charId || tierListEntryItemId(entry);
  const ch = getMemberCharacterById(id);
  const name = (ch && ch.label) || id;
  const selected = state.selectedCardNo === id ? " is-selected" : "";
  return (
    '<button type="button" class="tierlist-card tierlist-char' +
    selected +
    '" data-char-id="' +
    escapeHtml(id) +
    '" title="' +
    escapeHtml(name) +
    '" draggable="true">' +
    memberIconHtml(ch && ch.href, name) +
    '<span class="tierlist-char__name">' +
    escapeHtml(name) +
    "</span></button>"
  );
}

function cardChipHtml(entry) {
  const card = getCard(entry.cardNo);
  const name = (card && (card.name || card.card_name)) || entry.cardNo;
  const img = card ? catalogCardImageUrl(card) : "";
  const selected = state.selectedCardNo === entry.cardNo ? " is-selected" : "";
  return (
    '<button type="button" class="tierlist-card' +
    selected +
    '" data-card-no="' +
    escapeHtml(entry.cardNo) +
    '" title="' +
    escapeHtml(name) +
    '" draggable="true">' +
    thumbHtml(img || "", name) +
    "</button>"
  );
}

/** @param {import('./tierListRoomSync.js').TierListEntryDoc} entry @param {boolean} charMode */
function createTierChipElement(entry, charMode) {
  if (charMode) {
    const id = entry.charId || tierListEntryItemId(entry);
    const ch = getMemberCharacterById(id);
    const name = (ch && ch.label) || id;
    const selected = state.selectedCardNo === id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tierlist-card tierlist-char" + (selected ? " is-selected" : "");
    btn.dataset.charId = id;
    btn.title = name;
    btn.draggable = true;
    btn.innerHTML =
      memberIconHtml(ch && ch.href, name) + '<span class="tierlist-char__name">' + escapeHtml(name) + "</span>";
    return btn;
  }
  const card = getCard(entry.cardNo);
  const name = (card && (card.name || card.card_name)) || entry.cardNo;
  const img = card ? catalogCardImageUrl(card) : "";
  const selected = state.selectedCardNo === entry.cardNo;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tierlist-card" + (selected ? " is-selected" : "");
  btn.dataset.cardNo = entry.cardNo;
  btn.title = name;
  btn.draggable = true;
  btn.innerHTML = thumbHtml(img || "", name);
  return btn;
}

function entryChipHtml(entry) {
  return isCharacterRoom() ? charChipHtml(entry) : cardChipHtml(entry);
}

function renderRoomToolbar() {
  const addBtn = el("btn-tierlist-add-card");
  if (!addBtn || !state.room) return;
  addBtn.textContent = isCharacterRoom() ? "キャラを追加" : "カードを追加";
}

function renderBoard() {
  const board = el("tierlist-board");
  if (!board || !state.room) {
    if (board) {
      board.innerHTML = "";
      delete board.dataset.tierShellSig;
    }
    return;
  }
  const charMode = isCharacterRoom();
  const emptyTier = charMode ? "キャラを配置" : "カードを配置";
  const emptyPool = charMode ? "キャラを追加して配置" : "カードを追加して配置";
  const tiers = tierListSortedTiers(state.room);
  const host = isTierListHost(state.room, getTierListMyUid());
  const shellSig =
    (charMode ? "c" : "k") +
    "|" +
    (host ? "h" : "g") +
    "|" +
    tiers
      .map(function (tier) {
        return tier.id + ":" + String(tier.label || "") + ":" + String(tier.color || "");
      })
      .join(";") +
    "|pool";

  /** @type {Map<string, HTMLElement>} */
  const chipPool = new Map();
  board.querySelectorAll(".tierlist-card[data-card-no], .tierlist-char[data-char-id]").forEach(function (btn) {
    const id = btn.getAttribute("data-card-no") || btn.getAttribute("data-char-id") || "";
    if (id) chipPool.set(id, btn);
  });

  if (board.dataset.tierShellSig !== shellSig) {
    let html = tiers
      .map(function (tier) {
        return (
          '<div class="tierlist-row" data-tier-id="' +
          escapeHtml(tier.id) +
          '">' +
          '<div class="tierlist-row__label" style="background:' +
          escapeHtml(tier.color || "#888") +
          '">' +
          '<span class="tierlist-row__label-text">' +
          escapeHtml(tier.label || tier.id) +
          "</span>" +
          (host
            ? '<button type="button" class="tierlist-row__edit" data-edit-tier="' +
              escapeHtml(tier.id) +
              '" title="ティア名を変更">✎</button>'
            : "") +
          "</div>" +
          '<div class="tierlist-row__cards" data-drop-tier="' +
          escapeHtml(tier.id) +
          '"></div></div>'
        );
      })
      .join("");
    html +=
      '<div class="tierlist-row tierlist-row--pool" data-tier-id="' +
      TIERLIST_POOL_ID +
      '">' +
      '<div class="tierlist-row__label tierlist-row__label--pool"><span class="tierlist-row__label-text">未配置</span></div>' +
      '<div class="tierlist-row__cards" data-drop-tier="' +
      TIERLIST_POOL_ID +
      '"></div></div>';
    board.innerHTML = html;
    board.dataset.tierShellSig = shellSig;
    chipPool.clear();
  }

  function placeEntries(tierId, entries, emptyText) {
    const container = board.querySelector('.tierlist-row__cards[data-drop-tier="' + escapeHtml(tierId) + '"]');
    if (!container) return;
    container.querySelectorAll(":scope > .tierlist-card, :scope > .tierlist-char").forEach(function (btn) {
      btn.remove();
    });
    const emptyEl = container.querySelector(":scope > .tierlist-row__empty");
    if (emptyEl) emptyEl.remove();
    if (!entries.length) {
      container.innerHTML = '<span class="tierlist-row__empty muted">' + escapeHtml(emptyText) + "</span>";
      return;
    }
    entries.forEach(function (entry) {
      const id = tierListEntryItemId(entry);
      let btn = chipPool.get(id);
      if (btn) {
        chipPool.delete(id);
        btn.classList.toggle("is-selected", state.selectedCardNo === id);
      } else {
        btn = createTierChipElement(entry, charMode);
      }
      container.appendChild(btn);
    });
  }

  tiers.forEach(function (tier) {
    placeEntries(tier.id, entriesInTier(tier.id), emptyTier);
  });
  placeEntries(TIERLIST_POOL_ID, entriesInTier(TIERLIST_POOL_ID), emptyPool);
  chipPool.forEach(function (btn) {
    btn.remove();
  });

  const summary = el("tierlist-summary");
  if (summary) {
    const unit = charMode ? "キャラ" : "枚";
    summary.textContent =
      "配置 " +
      state.entries.filter(function (e) {
        return e.tierId !== TIERLIST_POOL_ID;
      }).length +
      " / 全体 " +
      state.entries.length +
      " " +
      unit;
  }
}

function renderMoveBar() {
  const bar = el("tierlist-move-bar");
  if (!bar) return;
  if (!state.selectedCardNo || !state.room) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  let name = state.selectedCardNo;
  if (isCharacterRoom()) {
    const ch = getMemberCharacterById(state.selectedCardNo);
    name = (ch && ch.label) || state.selectedCardNo;
  } else {
    const card = getCard(state.selectedCardNo);
    name = (card && (card.name || card.card_name)) || state.selectedCardNo;
  }
  const tiers = tierListSortedTiers(state.room);
  const myUid = getTierListMyUid();
  const entry = selectedEntry();
  const canRemove = entry && (entry.byUid === myUid || isTierListHost(state.room, myUid));
  bar.hidden = false;
  bar.innerHTML =
    '<span class="tierlist-move-bar__label">選択中: <strong>' +
    escapeHtml(name) +
    "</strong></span>" +
    '<div class="tierlist-move-bar__dest">' +
    tiers
      .map(function (t) {
        return (
          '<button type="button" class="btn sm secondary" data-move-tier="' +
          escapeHtml(t.id) +
          '">' +
          escapeHtml(t.label || t.id) +
          "</button>"
        );
      })
      .join("") +
    '<button type="button" class="btn sm secondary" data-move-tier="' +
    TIERLIST_POOL_ID +
    '">未配置</button>' +
    "</div>" +
    (canRemove
      ? '<button type="button" class="btn sm danger" id="btn-tierlist-remove-selected">リストから外す</button>'
      : "") +
    '<button type="button" class="btn sm secondary" id="btn-tierlist-clear-select">選択解除</button>';
}

function renderHostTools() {
  const tools = el("tierlist-host-tools");
  if (!tools) return;
  const host = !!state.room && isTierListHost(state.room, getTierListMyUid());
  tools.hidden = !host;
}

async function moveSelectedTo(tierId) {
  if (!state.code || !state.selectedCardNo) return;
  try {
    if (isCharacterRoom()) {
      await placeTierListCard(state.code, { charId: state.selectedCardNo, tierId: tierId });
    } else {
      await placeTierListCard(state.code, { cardNo: state.selectedCardNo, tierId: tierId });
    }
  } catch (err) {
    showToast(errorMessage(err));
  }
}

function openCardPicker() {
  if (!state.code) return;
  const placed = new Set(
    state.entries.map(function (e) {
      return e.cardNo;
    }),
  );
  /** @type {Set<string>} */
  const selected = new Set();
  const saved = loadPickerFilters();
  const overlay = document.createElement("div");
  overlay.className = "tierlist-picker-overlay";
  overlay.innerHTML =
    '<div class="tierlist-picker" role="dialog" aria-label="カードを追加">' +
    '<div class="tierlist-picker__head">' +
    "<h2>カードを追加</h2>" +
    '<button type="button" class="btn sm secondary tierlist-picker__close">閉じる</button></div>' +
    '<p class="hint muted tierlist-picker__lead">クリックで複数選択できます。絞り込みは次回も保持されます。</p>' +
    '<div class="tierlist-picker__filters">' +
    '<label class="field"><span>種類</span><select id="tierlist-pick-type"><option value="">すべて</option>' +
    TYPE_OPTIONS.map(function (t) {
      return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + "</option>";
    }).join("") +
    "</select></label>" +
    '<label class="field"><span>スクール</span><select id="tierlist-pick-school"><option value="">すべて</option>' +
    SCHOOL_OPTIONS.map(function (s) {
      return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>";
    }).join("") +
    "</select></label>" +
    '<label class="field"><span>商品</span><select id="tierlist-pick-product"><option value="">すべて</option>' +
    uniqueProducts(getAllCards() || [])
      .map(function (p) {
        return '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>";
      })
      .join("") +
    "</select></label>" +
    '<label class="field tierlist-picker__search"><span>検索</span><input type="search" id="tierlist-pick-q" placeholder="名前・番号" /></label>' +
    "</div>" +
    '<div class="tierlist-picker__grid" id="tierlist-pick-grid"></div>' +
    '<div class="tierlist-picker__foot">' +
    '<p class="hint muted" id="tierlist-pick-hint"></p>' +
    '<div class="tierlist-picker__foot-actions">' +
    '<button type="button" class="btn sm secondary" id="tierlist-pick-clear-sel" hidden>選択解除</button>' +
    '<button type="button" class="btn primary" id="tierlist-pick-add" disabled>選択したカードを追加</button>' +
    "</div></div></div>";
  document.body.appendChild(overlay);

  const typeEl = /** @type {HTMLSelectElement} */ (overlay.querySelector("#tierlist-pick-type"));
  const schoolEl = /** @type {HTMLSelectElement} */ (overlay.querySelector("#tierlist-pick-school"));
  const productEl = /** @type {HTMLSelectElement} */ (overlay.querySelector("#tierlist-pick-product"));
  const qEl = /** @type {HTMLInputElement} */ (overlay.querySelector("#tierlist-pick-q"));
  if (typeEl && saved.type) typeEl.value = saved.type;
  if (schoolEl && saved.school) schoolEl.value = saved.school;
  if (productEl) {
    const opt = Array.from(productEl.options).some(function (o) {
      return o.value === saved.product;
    });
    if (opt) productEl.value = saved.product;
  }
  if (qEl) qEl.value = saved.q || "";

  function close() {
    persistFiltersFromUi();
    overlay.remove();
  }

  function persistFiltersFromUi() {
    savePickerFilters({
      type: typeEl ? typeEl.value : "",
      school: schoolEl ? schoolEl.value : "",
      product: productEl ? productEl.value : "",
      q: qEl ? qEl.value : "",
    });
  }

  function syncFooter() {
    const n = selected.size;
    const addBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector("#tierlist-pick-add"));
    const clearBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector("#tierlist-pick-clear-sel"));
    if (addBtn) {
      addBtn.disabled = n === 0;
      addBtn.textContent = n ? "選択した " + n + " 枚を追加" : "選択したカードを追加";
    }
    if (clearBtn) clearBtn.hidden = n === 0;
  }

  function renderGrid() {
    persistFiltersFromUi();
    const type = typeEl ? typeEl.value : "";
    const school = schoolEl ? schoolEl.value : "";
    const product = productEl ? productEl.value : "";
    const q = String((qEl && qEl.value) || "")
      .trim()
      .toLowerCase();
    const all = getAllCards() || [];
    const matched = [];
    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      if (!c || !c.card_no) continue;
      if (placed.has(c.card_no)) continue;
      if (type && String(c.type || c.card_type || "") !== type) continue;
      if (product && String(c.product || "") !== product) continue;
      if (school) {
        const labels = catalogCardSchoolLabels(c) || [];
        if (labels.indexOf(school) < 0) continue;
      }
      if (q) {
        const hay = String(c.card_no + " " + (c.name || c.card_name || "")).toLowerCase();
        if (hay.indexOf(q) < 0) continue;
      }
      matched.push(c);
      if (matched.length >= PICKER_CAP) break;
    }
    const grid = overlay.querySelector("#tierlist-pick-grid");
    const hint = overlay.querySelector("#tierlist-pick-hint");
    if (hint) {
      const selPart = selected.size ? " · 選択 " + selected.size + " 枚" : "";
      hint.textContent =
        (matched.length >= PICKER_CAP
          ? "先頭 " + PICKER_CAP + " 件のみ表示。検索で絞ってください。"
          : matched.length + " 件") + selPart;
    }
    if (grid) {
      const pool = new Map(
        [...grid.children].map(function (b) {
          return [String(b.getAttribute("data-card-no") || ""), b];
        }),
      );
      matched.forEach(function (c, idx) {
        const no = String(c.card_no);
        const isOn = selected.has(no);
        let btn = pool.get(no);
        pool.delete(no);
        if (!btn) {
          const name = c.name || c.card_name || c.card_no;
          const img = catalogCardImageUrl(c);
          btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tierlist-pick-card" + (isOn ? " is-selected" : "");
          btn.dataset.cardNo = no;
          btn.setAttribute("aria-pressed", isOn ? "true" : "false");
          btn.title = name;
          btn.innerHTML =
            thumbHtml(img || "", name, { eager: idx < PICKER_THUMB_EAGER }) +
            '<span class="tierlist-pick-card__name">' +
            escapeHtml(name) +
            "</span>";
        } else {
          btn.classList.toggle("is-selected", isOn);
          btn.setAttribute("aria-pressed", isOn ? "true" : "false");
        }
        grid.appendChild(btn);
      });
      pool.forEach(function (b) {
        b.remove();
      });
      prefetchCatalogListThumbnails(
        matched.slice(0, PICKER_THUMB_PREFETCH).map(function (c) {
          return catalogCardImageUrl(c);
        }),
        { limit: PICKER_THUMB_PREFETCH, eagerCount: PICKER_THUMB_EAGER },
      );
    }
    syncFooter();
  }

  function syncPickerSelectionOnly() {
    const grid = overlay.querySelector("#tierlist-pick-grid");
    if (!grid) return;
    grid.querySelectorAll(".tierlist-pick-card[data-card-no]").forEach(function (btn) {
      const no = btn.getAttribute("data-card-no") || "";
      const isOn = selected.has(no);
      btn.classList.toggle("is-selected", isOn);
      btn.setAttribute("aria-pressed", isOn ? "true" : "false");
    });
  }

  overlay.querySelector(".tierlist-picker__close")?.addEventListener("click", close);
  overlay.addEventListener("click", function (ev) {
    if (ev.target === overlay) close();
  });
  ["tierlist-pick-type", "tierlist-pick-school", "tierlist-pick-product", "tierlist-pick-q"].forEach(function (id) {
    overlay.querySelector("#" + id)?.addEventListener("input", renderGrid);
    overlay.querySelector("#" + id)?.addEventListener("change", renderGrid);
  });
  overlay.querySelector("#tierlist-pick-grid")?.addEventListener("click", function (ev) {
    const btn = /** @type {HTMLElement} */ (ev.target).closest("[data-card-no]");
    if (!btn) return;
    const cardNo = btn.getAttribute("data-card-no") || "";
    if (!cardNo) return;
    if (selected.has(cardNo)) selected.delete(cardNo);
    else selected.add(cardNo);
    btn.classList.toggle("is-selected", selected.has(cardNo));
    btn.setAttribute("aria-pressed", selected.has(cardNo) ? "true" : "false");
    syncFooter();
    const hint = overlay.querySelector("#tierlist-pick-hint");
    if (hint) {
      const base = String(hint.textContent || "").replace(/\s*·\s*選択\s+\d+\s*枚/, "");
      hint.textContent = selected.size ? base + " · 選択 " + selected.size + " 枚" : base;
    }
  });
  overlay.querySelector("#tierlist-pick-clear-sel")?.addEventListener("click", function () {
    selected.clear();
    syncPickerSelectionOnly();
    syncFooter();
    const hint = overlay.querySelector("#tierlist-pick-hint");
    if (hint) {
      hint.textContent = String(hint.textContent || "").replace(/\s*·\s*選択\s+\d+\s*枚/, "");
    }
  });
  overlay.querySelector("#tierlist-pick-add")?.addEventListener("click", async function () {
    if (!state.code || !selected.size) return;
    const nos = Array.from(selected);
    const addBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector("#tierlist-pick-add"));
    if (addBtn) addBtn.disabled = true;
    let ok = 0;
    let lastNo = "";
    try {
      for (let i = 0; i < nos.length; i++) {
        const cardNo = nos[i];
        if (!cardNo || placed.has(cardNo)) continue;
        await placeTierListCard(state.code, { cardNo: cardNo, tierId: TIERLIST_POOL_ID });
        placed.add(cardNo);
        ok++;
        lastNo = cardNo;
      }
      if (lastNo) state.selectedCardNo = lastNo;
      showToast(ok ? ok + " 枚を未配置に追加しました" : "追加できるカードがありません");
      close();
      renderAll();
    } catch (err) {
      showToast(errorMessage(err));
      selected.forEach(function (no) {
        if (placed.has(no)) selected.delete(no);
      });
      renderGrid();
    }
  });
  renderGrid();
}

function openCharacterPicker() {
  if (!state.code) return;
  const placed = new Set(
    state.entries.map(function (e) {
      return tierListEntryItemId(e);
    }),
  );
  const overlay = document.createElement("div");
  overlay.className = "tierlist-picker-overlay";
  overlay.innerHTML =
    '<div class="tierlist-picker tierlist-picker--character" role="dialog" aria-label="キャラを追加">' +
    '<div class="tierlist-picker__head">' +
    "<h2>キャラを追加</h2>" +
    '<button type="button" class="btn sm secondary tierlist-picker__close">閉じる</button></div>' +
    '<label class="field tierlist-picker__search"><span>検索</span><input type="search" id="tierlist-pick-char-q" placeholder="名前" /></label>' +
    '<div class="tierlist-picker__grid tierlist-char-picker-grid" id="tierlist-pick-char-grid"></div>' +
    '<p class="hint muted" id="tierlist-pick-char-hint"></p></div>';
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  function renderGrid() {
    const q = String(/** @type {HTMLInputElement} */ (overlay.querySelector("#tierlist-pick-char-q")).value || "")
      .trim()
      .toLowerCase();
    const roster = listMemberCharacterRoster();
    const matched = [];
    for (let i = 0; i < roster.length; i++) {
      const c = roster[i];
      if (!c || !c.id) continue;
      if (placed.has(c.id)) continue;
      if (q) {
        const hay = String(c.label + " " + c.id + " " + c.series).toLowerCase();
        if (hay.indexOf(q) < 0) continue;
      }
      matched.push(c);
    }
    const grid = overlay.querySelector("#tierlist-pick-char-grid");
    const hint = overlay.querySelector("#tierlist-pick-char-hint");
    if (hint) hint.textContent = matched.length + " キャラ";
    if (grid) {
      grid.innerHTML = matched
        .map(function (c) {
          return (
            '<button type="button" class="tierlist-pick-char" data-char-id="' +
            escapeHtml(c.id) +
            '" title="' +
            escapeHtml(c.label) +
            '">' +
            memberIconHtml(c.href, c.label) +
            '<span class="tierlist-pick-char__name">' +
            escapeHtml(c.label) +
            "</span></button>"
          );
        })
        .join("");
    }
  }

  overlay.querySelector(".tierlist-picker__close")?.addEventListener("click", close);
  overlay.addEventListener("click", function (ev) {
    if (ev.target === overlay) close();
  });
  overlay.querySelector("#tierlist-pick-char-q")?.addEventListener("input", renderGrid);
  overlay.querySelector("#tierlist-pick-char-grid")?.addEventListener("click", async function (ev) {
    const btn = /** @type {HTMLElement} */ (ev.target).closest("[data-char-id]");
    if (!btn) return;
    const charId = btn.getAttribute("data-char-id") || "";
    if (!charId) return;
    try {
      await placeTierListCard(state.code, { charId: charId, tierId: TIERLIST_POOL_ID });
      state.selectedCardNo = charId;
      showToast("未配置に追加しました。ティアへ移動できます");
      close();
      renderAll();
    } catch (err) {
      showToast(errorMessage(err));
    }
  });
  renderGrid();
}

function wireLobby() {
  el("btn-tierlist-signin")?.addEventListener("click", async function () {
    try {
      await signInWithGoogle();
    } catch (err) {
      showToast(errorMessage(err));
    }
  });
  el("btn-tierlist-create")?.addEventListener("click", async function () {
    if (!signedIn()) {
      showToast("Google ログインが必要です");
      return;
    }
    const btn = el("btn-tierlist-create");
    if (btn) btn.disabled = true;
    try {
      const title = /** @type {HTMLInputElement} */ (el("tierlist-create-title"))?.value || "";
      const kindInput = /** @type {HTMLInputElement|null} */ (
        document.querySelector('input[name="tierlist-create-kind"]:checked')
      );
      const kind =
        kindInput && kindInput.value === TIERLIST_KIND_CHARACTER ? TIERLIST_KIND_CHARACTER : "card";
      const { code } = await createTierListRoom(title, { kind: kind });
      attachRoom(code);
      showToast("ルームを作成しました");
    } catch (err) {
      showToast(errorMessage(err));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
  el("tierlist-join-code")?.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") el("btn-tierlist-join")?.click();
  });
  el("btn-tierlist-join")?.addEventListener("click", async function () {
    const code = /** @type {HTMLInputElement} */ (el("tierlist-join-code"))?.value || "";
    try {
      await enterRoom(code);
    } catch (_) {
      /* toast already */
    }
  });
  el("tierlist-recent-list")?.addEventListener("click", async function (ev) {
    const btn = /** @type {HTMLElement} */ (ev.target).closest("[data-code]");
    if (!btn) return;
    try {
      await enterRoom(btn.getAttribute("data-code") || "");
    } catch (_) {
      /* toast already */
    }
  });
}

function wireRoom() {
  el("btn-tierlist-back")?.addEventListener("click", function () {
    showDeckBuilderView();
  });
  el("btn-tierlist-copy-link")?.addEventListener("click", async function () {
    if (!state.code) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(state.code));
      showToast("招待リンクをコピーしました");
    } catch (_) {
      showToast("コピーに失敗しました: " + inviteUrl(state.code));
    }
  });
  el("btn-tierlist-leave")?.addEventListener("click", function () {
    leaveToLobby(true);
  });
  el("btn-tierlist-close")?.addEventListener("click", async function () {
    if (!state.code) return;
    if (!window.confirm("ルームを終了して全員のリストを削除しますか？")) return;
    try {
      await closeTierListRoom(state.code);
      detachRoom();
      setLocationHashCode("");
      renderAll();
      showToast("ルームを終了しました");
    } catch (err) {
      showToast(errorMessage(err));
    }
  });
  el("btn-tierlist-add-card")?.addEventListener("click", function () {
    if (isCharacterRoom()) openCharacterPicker();
    else openCardPicker();
  });
  el("btn-tierlist-add-tier")?.addEventListener("click", async function () {
    if (!state.code) return;
    const label = window.prompt("新しいティア名", "E");
    if (label == null) return;
    try {
      await addTierListTier(state.code, { label: label.slice(0, TIERLIST_MAX_TIER_LABEL_LEN) });
    } catch (err) {
      showToast(errorMessage(err));
    }
  });
  el("btn-tierlist-del-tier")?.addEventListener("click", async function () {
    if (!state.code || !state.room) return;
    const tiers = tierListSortedTiers(state.room);
    if (tiers.length <= 1) {
      showToast("最後の 1 ティアは削除できません");
      return;
    }
    const names = tiers.map(function (t, i) {
      return i + 1 + ": " + (t.label || t.id);
    }).join("\n");
    const raw = window.prompt("削除するティア番号を入力\n" + names, String(tiers.length));
    if (raw == null) return;
    const idx = Number(raw) - 1;
    if (!Number.isFinite(idx) || !tiers[idx]) {
      showToast("番号が不正です");
      return;
    }
    const itemLabel = isCharacterRoom() ? "キャラ" : "カード";
    if (!window.confirm("「" + (tiers[idx].label || tiers[idx].id) + "」を削除し、" + itemLabel + "を未配置へ移しますか？")) return;
    try {
      await removeTierListTier(state.code, tiers[idx].id);
    } catch (err) {
      showToast(errorMessage(err));
    }
  });

  const board = el("tierlist-board");
  board?.addEventListener("click", async function (ev) {
    const target = /** @type {HTMLElement} */ (ev.target);
    const editBtn = target.closest("[data-edit-tier]");
    if (editBtn) {
      const tierId = editBtn.getAttribute("data-edit-tier") || "";
      const tier = state.room && state.room.tiers && state.room.tiers[tierId];
      if (!tier) return;
      const next = window.prompt("ティア名", tier.label || tier.id);
      if (next == null) return;
      try {
        await updateTierListTier(state.code, tierId, { label: next });
      } catch (err) {
        showToast(errorMessage(err));
      }
      return;
    }
    const charBtn = target.closest(".tierlist-char[data-char-id]");
    if (charBtn) {
      const id = charBtn.getAttribute("data-char-id") || "";
      state.selectedCardNo = state.selectedCardNo === id ? "" : id;
      syncBoardSelectionOnly();
      renderMoveBar();
      return;
    }
    const cardBtn = target.closest(".tierlist-card[data-card-no]");
    if (cardBtn) {
      const no = cardBtn.getAttribute("data-card-no") || "";
      if (ev.detail >= 2) {
        const card = getCard(no);
        if (card) openCardCatalogDialog(card);
        return;
      }
      state.selectedCardNo = state.selectedCardNo === no ? "" : no;
      syncBoardSelectionOnly();
      renderMoveBar();
    }
  });

  board?.addEventListener("dragstart", function (ev) {
    const charBtn = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-char[data-char-id]");
    if (charBtn && ev.dataTransfer) {
      const id = charBtn.getAttribute("data-char-id") || "";
      state.selectedCardNo = id;
      ev.dataTransfer.setData("text/plain", "char:" + id);
      ev.dataTransfer.effectAllowed = "move";
      return;
    }
    const cardBtn = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-card[data-card-no]");
    if (!cardBtn || !ev.dataTransfer) return;
    const no = cardBtn.getAttribute("data-card-no") || "";
    state.selectedCardNo = no;
    ev.dataTransfer.setData("text/plain", no);
    ev.dataTransfer.effectAllowed = "move";
  });
  board?.addEventListener("dragover", function (ev) {
    const drop = /** @type {HTMLElement} */ (ev.target).closest("[data-drop-tier]");
    if (!drop) return;
    ev.preventDefault();
    drop.classList.add("is-dragover");
  });
  board?.addEventListener("dragleave", function (ev) {
    const drop = /** @type {HTMLElement} */ (ev.target).closest("[data-drop-tier]");
    if (drop) drop.classList.remove("is-dragover");
  });
  board?.addEventListener("drop", async function (ev) {
    const drop = /** @type {HTMLElement} */ (ev.target).closest("[data-drop-tier]");
    if (!drop || !ev.dataTransfer) return;
    ev.preventDefault();
    drop.classList.remove("is-dragover");
    let raw = ev.dataTransfer.getData("text/plain") || state.selectedCardNo;
    const tierId = drop.getAttribute("data-drop-tier") || "";
    if (!raw || !tierId || !state.code) return;
    try {
      if (isCharacterRoom() || String(raw).indexOf("char:") === 0) {
        const charId = String(raw).replace(/^char:/, "");
        await placeTierListCard(state.code, { charId: charId, tierId: tierId });
        state.selectedCardNo = charId;
      } else {
        await placeTierListCard(state.code, { cardNo: raw, tierId: tierId });
        state.selectedCardNo = raw;
      }
      renderMoveBar();
    } catch (err) {
      showToast(errorMessage(err));
    }
  });

  el("tierlist-move-bar")?.addEventListener("click", async function (ev) {
    const target = /** @type {HTMLElement} */ (ev.target);
    const dest = target.closest("[data-move-tier]");
    if (dest) {
      await moveSelectedTo(dest.getAttribute("data-move-tier") || "");
      return;
    }
    if (target.closest("#btn-tierlist-clear-select")) {
      state.selectedCardNo = "";
      renderBoard();
      renderMoveBar();
      return;
    }
    if (target.closest("#btn-tierlist-remove-selected")) {
      if (!state.code || !state.selectedCardNo) return;
      const rmLabel = isCharacterRoom() ? "キャラ" : "カード";
      if (!window.confirm("この" + rmLabel + "をリストから外しますか？")) return;
      try {
        await removeTierListCard(state.code, state.selectedCardNo);
        state.selectedCardNo = "";
        renderAll();
      } catch (err) {
        showToast(errorMessage(err));
      }
    }
  });
}

export function openTierListMaker() {
  showTierListView();
  renderAll();
  const code = codeFromHash();
  if (code && signedIn() && code !== state.code) {
    enterRoom(code).catch(function () {
      /* toast */
    });
  }
}

export function initTierListMaker() {
  if (state.wired) return;
  const root = el("view-tierlist");
  if (!root) return;
  state.wired = true;
  wireLobby();
  wireRoom();
  onPageVisibilityChange(function (visible) {
    if (!state.code) return;
    if (visible) resumeRoomSyncFromHidden();
    else pauseRoomSyncForHidden();
  });
  onCloudUserChange(function () {
    renderAll();
    const code = codeFromHash();
    if (code && signedIn() && !state.code) {
      enterRoom(code).catch(function () {
        /* toast */
      });
    }
  });
  window.addEventListener("hashchange", function () {
    const code = codeFromHash();
    if (!code) return;
    showTierListView();
    if (signedIn() && code !== state.code) {
      enterRoom(code).catch(function () {
        /* toast */
      });
    }
  });
  const boot = codeFromHash();
  if (boot && signedIn()) {
    showTierListView();
    enterRoom(boot).catch(function () {
      /* toast */
    });
  } else {
    renderAll();
  }
}
