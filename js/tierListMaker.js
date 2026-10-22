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
import {
  getCurrentCloudUser,
  isGoogleCloudUser,
  onCloudUserChange,
  signInWithGoogle,
} from "./cloudAuth.js";
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
  reorderTierListTiers,
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
/** キャラティア: ドンジャラ四角顔面に切り替える */
const STORAGE_SHOW_CHAR_FACES = "llocg.tierlist.showCharFaces";
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
  /** カードルーム: 麻雀キャラ顔で表示 */
  showCharFaces: (function loadShowCharFaces() {
    try {
      /* 未設定は OFF。カード表で ON だとピッカー数百枚分のアイコン解決が重い */
      return localStorage.getItem(STORAGE_SHOW_CHAR_FACES) === "1";
    } catch (_) {
      return false;
    }
  })(),
  /** @type {number|null} */
  boardRenderTimer: null,
  /** @type {string} */
  lastRoomShellSig: "",
  /** @type {string} 参加者の身元（uid/name/photo）。在席時刻は含めない */
  lastMembersIdentitySig: "",
  /** @type {string} ティア行 DnD 中の tierId */
  draggingTierId: "",
  wired: false,
};

function roomShellSig(room) {
  if (!room) return "";
  const tiers = tierListSortedTiers(room);
  return (
    tierListRoomKind(room) +
    "|" +
    (room.hostUid || "") +
    "|" +
    tiers
      .map(function (t) {
        return t.id + ":" + String(t.label || "") + ":" + String(t.color || "") + ":" + String(t.order || "");
      })
      .join(";")
  );
}

/** 入退室・表示名変更のみ。lastSeenAt は除外（在席 ping で DOM を壊さない） */
function membersIdentitySig(room) {
  if (!room) return "";
  const members = room.members || {};
  return (
    Object.keys(members)
      .sort()
      .map(function (uid) {
        const m = members[uid] || {};
        return uid + ":" + String(m.name || "") + ":" + String(m.photoURL || "");
      })
      .join("|") +
    "|h:" +
    String(room.hostUid || "")
  );
}

function scheduleBoardRender() {
  if (state.boardRenderTimer != null) clearTimeout(state.boardRenderTimer);
  state.boardRenderTimer = setTimeout(function () {
    state.boardRenderTimer = null;
    renderBoard();
    renderMoveBar();
  }, 48);
}

function persistShowCharFaces() {
  try {
    localStorage.setItem(STORAGE_SHOW_CHAR_FACES, state.showCharFaces ? "1" : "0");
  } catch (_) {
    /* noop */
  }
}

/**
 * キャラ表のみ: ON でドンジャラ四角顔面、OFF で発光モチーフアイコン。
 * カード表では使わない。
 */
function useDonjaraFaceArt() {
  return isCharacterRoom() && !!state.showCharFaces;
}

/** @param {string} charId */
function resolveCharChip(charId) {
  return getMemberCharacterById(charId, { face: useDonjaraFaceArt() });
}

/**
 * @param {object|null|undefined} card
 * @param {string} name
 * @param {{ eager?: boolean } | undefined} [opts]
 */
function cardVisualInnerHtml(card, name, opts) {
  const img = card ? catalogCardImageUrl(card) : "";
  return thumbHtml(img || "", name, opts);
}

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
  return isGoogleCloudUser();
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
      const prevShell = state.lastRoomShellSig;
      const prevMembersId = state.lastMembersIdentitySig;
      state.room = room;
      const nextShell = roomShellSig(room);
      const nextMembersId = membersIdentitySig(room);
      state.lastRoomShellSig = nextShell;
      state.lastMembersIdentitySig = nextMembersId;
      pushRecent({ code: state.code, title: room.title || "" });
      renderLobby();
      renderRoomHeader();
      renderRoomToolbar();
      if (prevMembersId !== nextMembersId) {
        renderMembers();
      } else {
        syncMemberStaleFlags();
      }
      renderHostTools();
      /* 在席更新だけではボードを触らない（点滅防止）。ティア構成が変わったときだけ再描画 */
      if (prevShell !== nextShell) {
        renderBoard();
        renderMoveBar();
      }
    },
    function () {
      showToast("ルームの同期に失敗しました");
    },
  );
  state.unsubEntries = watchTierListEntries(
    code,
    function (entries) {
      state.entries = Array.isArray(entries) ? entries : [];
      scheduleBoardRender();
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
  if (state.boardRenderTimer != null) {
    clearTimeout(state.boardRenderTimer);
    state.boardRenderTimer = null;
  }
  state.syncPaused = false;
  state.code = "";
  state.room = null;
  state.entries = [];
  state.selectedCardNo = "";
  state.lastRoomShellSig = "";
  state.lastMembersIdentitySig = "";
}

function attachRoom(code) {
  detachRoom();
  state.code = normalizeTierListRoomCode(code);
  state.syncPaused = false;
  state.lastRoomShellSig = "";
  state.lastMembersIdentitySig = "";
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
        '" data-member-uid="' +
        escapeHtml(uid) +
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

/** 在席 ping 時はアバターを作り直さず stale だけ更新 */
function syncMemberStaleFlags() {
  const host = el("tierlist-members");
  if (!host || !state.room) return;
  const now = Date.now();
  const members = state.room.members || {};
  host.querySelectorAll(".tierlist-member[data-member-uid]").forEach(function (node) {
    const uid = node.getAttribute("data-member-uid") || "";
    const m = members[uid];
    if (!m) return;
    const last = m.lastSeenAt ? Date.parse(m.lastSeenAt) : 0;
    const stale = !last || now - last > PRESENCE_STALE_MS;
    const isHost = state.room.hostUid === uid;
    node.classList.toggle("is-stale", stale);
    node.classList.toggle("is-host", isHost);
    node.title =
      String(m.name || "") + (isHost ? "（ホスト）" : "") + (stale ? "・離席気味" : "");
  });
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

function memberIconHtml(href, alt, extraClass) {
  const cls = "tierlist-char-icon" + (extraClass ? " " + extraClass : "");
  if (!href) return '<div class="' + cls + ' tierlist-char-icon--fallback">?</div>';
  return (
    '<img class="' +
    cls +
    '" src="' +
    escapeHtml(href) +
    '" alt="' +
    escapeHtml(alt || "") +
    '" loading="lazy" />'
  );
}

/** チップ下の短い表示名（長いとアイコンが中央からずれる） */
function shortChipLabel(name, maxChars) {
  const s = String(name || "").trim();
  const max = Number.isFinite(maxChars) ? Number(maxChars) : 5;
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "…";
}

function chipDomId(btn) {
  if (!btn) return "";
  return btn.getAttribute("data-card-no") || btn.getAttribute("data-char-id") || "";
}

/**
 * ドロップ位置の直前に差し込む対象 ID。null なら末尾。
 * 折り返し行を考慮し、ポインタの左右／上下で挿入位置を決める。
 * @param {HTMLElement} container
 * @param {number} clientX
 * @param {number} clientY
 * @param {string} draggedId
 */
function resolveDropBeforeId(container, clientX, clientY, draggedId) {
  const chips = Array.from(container.querySelectorAll(".tierlist-card")).filter(function (btn) {
    return chipDomId(btn) && chipDomId(btn) !== draggedId;
  });
  chips.sort(function (a, b) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    if (Math.abs(ra.top - rb.top) > 10) return ra.top - rb.top;
    return ra.left - rb.left;
  });
  for (let i = 0; i < chips.length; i++) {
    const r = chips[i].getBoundingClientRect();
    if (clientY < r.top + 6) return chipDomId(chips[i]);
    if (clientY <= r.bottom + 6 && clientX < r.left + r.width * 0.5) return chipDomId(chips[i]);
  }
  return null;
}

/** ローカル entries の tier / order を先に更新して見た目を即反映 */
function applyLocalEntryPlacement(itemId, tierId, orderInTier) {
  const entry = state.entries.find(function (e) {
    return tierListEntryItemId(e) === itemId;
  });
  if (!entry) return;
  entry.tierId = tierId;
  entry.orderInTier = orderInTier;
}

/**
 * @param {string} tierId
 * @param {string|null} beforeId
 * @param {string} draggedId
 */
function computeOrderInTier(tierId, beforeId, draggedId) {
  const list = entriesInTier(tierId).filter(function (e) {
    return tierListEntryItemId(e) !== draggedId;
  });
  if (!list.length) return Date.now();
  if (!beforeId) {
    const last = list[list.length - 1];
    return (Number(last.orderInTier) || 0) + 1000;
  }
  const idx = list.findIndex(function (e) {
    return tierListEntryItemId(e) === beforeId;
  });
  if (idx < 0) {
    const last = list[list.length - 1];
    return (Number(last.orderInTier) || 0) + 1000;
  }
  const afterO = Number(list[idx].orderInTier) || 0;
  if (idx === 0) return afterO - 1000;
  const beforeO = Number(list[idx - 1].orderInTier) || 0;
  if (beforeO < afterO) return (beforeO + afterO) / 2;
  return beforeO + 1;
}

function clearBoardDropIndicators() {
  const board = el("tierlist-board");
  if (!board) return;
  board
    .querySelectorAll(".is-dragover, .is-drop-before, .is-tier-drop-before, .is-tier-drop-after, .is-tier-dragging")
    .forEach(function (node) {
      node.classList.remove(
        "is-dragover",
        "is-drop-before",
        "is-tier-drop-before",
        "is-tier-drop-after",
        "is-tier-dragging",
      );
    });
}

/** @param {string[]} orderedIds */
function applyLocalTierOrder(orderedIds) {
  if (!state.room || !state.room.tiers) return;
  orderedIds.forEach(function (id, i) {
    if (state.room.tiers[id]) state.room.tiers[id].order = i;
  });
}

/**
 * ティア行 DnD の挿入位置（before する対象 ID。null なら末尾＝プール直前）。
 * @param {HTMLElement} board
 * @param {number} clientY
 * @param {string} draggedId
 * @returns {string|null}
 */
function resolveTierRowDropBeforeId(board, clientY, draggedId) {
  const rows = Array.from(board.querySelectorAll(".tierlist-row[data-tier-id]")).filter(function (row) {
    const id = row.getAttribute("data-tier-id") || "";
    return id && id !== TIERLIST_POOL_ID && id !== draggedId;
  });
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].getBoundingClientRect();
    const mid = r.top + r.height * 0.5;
    if (clientY < mid) return rows[i].getAttribute("data-tier-id") || null;
  }
  return null;
}

function charChipInnerHtml(ch, name) {
  const faceOn = useDonjaraFaceArt();
  return (
    memberIconHtml(ch && ch.href, name, faceOn ? "tierlist-char-icon--face" : "") +
    '<span class="tierlist-char__name">' +
    escapeHtml(shortChipLabel(name, 5)) +
    "</span>"
  );
}

function charChipHtml(entry) {
  const id = entry.charId || tierListEntryItemId(entry);
  const ch = resolveCharChip(id);
  const name = (ch && ch.label) || id;
  const selected = state.selectedCardNo === id ? " is-selected" : "";
  const faceOn = useDonjaraFaceArt();
  return (
    '<button type="button" class="tierlist-card tierlist-char tierlist-card--char-face' +
    (faceOn ? " tierlist-card--donjara-face" : "") +
    selected +
    '" data-char-id="' +
    escapeHtml(id) +
    '" data-face-mode="' +
    (faceOn ? "1" : "0") +
    '" title="' +
    escapeHtml(name) +
    '" draggable="true">' +
    charChipInnerHtml(ch, name) +
    "</button>"
  );
}

function cardChipHtml(entry) {
  const card = getCard(entry.cardNo);
  const name = (card && (card.name || card.card_name)) || entry.cardNo;
  const selected = state.selectedCardNo === entry.cardNo ? " is-selected" : "";
  return (
    '<button type="button" class="tierlist-card' +
    selected +
    '" data-card-no="' +
    escapeHtml(entry.cardNo) +
    '" title="' +
    escapeHtml(name) +
    '" draggable="true">' +
    cardVisualInnerHtml(card, name) +
    "</button>"
  );
}

/** @param {import('./tierListRoomSync.js').TierListEntryDoc} entry @param {boolean} charMode */
function createTierChipElement(entry, charMode) {
  if (charMode) {
    const id = entry.charId || tierListEntryItemId(entry);
    const ch = resolveCharChip(id);
    const name = (ch && ch.label) || id;
    const selected = state.selectedCardNo === id;
    const faceOn = useDonjaraFaceArt();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "tierlist-card tierlist-char tierlist-card--char-face" +
      (faceOn ? " tierlist-card--donjara-face" : "") +
      (selected ? " is-selected" : "");
    btn.dataset.charId = id;
    btn.dataset.faceMode = faceOn ? "1" : "0";
    btn.title = name;
    btn.draggable = true;
    btn.innerHTML = charChipInnerHtml(ch, name);
    return btn;
  }
  const card = getCard(entry.cardNo);
  const name = (card && (card.name || card.card_name)) || entry.cardNo;
  const selected = state.selectedCardNo === entry.cardNo;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tierlist-card" + (selected ? " is-selected" : "");
  btn.dataset.cardNo = entry.cardNo;
  btn.title = name;
  btn.draggable = true;
  btn.innerHTML = cardVisualInnerHtml(card, name);
  return btn;
}

/** キャラ表の顔トグル: モチーフ⇔ドンジャラ顔面をチップ単位で差し替え */
function refreshBoardChipFaces() {
  const board = el("tierlist-board");
  if (!board || !state.room || !isCharacterRoom()) return;
  const faceOn = useDonjaraFaceArt();
  const want = faceOn ? "1" : "0";
  board.querySelectorAll(".tierlist-char[data-char-id]").forEach(function (btn) {
    const id = btn.getAttribute("data-char-id") || "";
    const ch = resolveCharChip(id);
    const name = (ch && ch.label) || id;
    btn.classList.toggle("tierlist-card--donjara-face", faceOn);
    if (btn.dataset.faceMode === want) return;
    btn.dataset.faceMode = want;
    btn.innerHTML = charChipInnerHtml(ch, name);
  });
}

function entryChipHtml(entry) {
  return isCharacterRoom() ? charChipHtml(entry) : cardChipHtml(entry);
}

function renderRoomToolbar() {
  const addBtn = el("btn-tierlist-add-card");
  if (addBtn && state.room) {
    addBtn.textContent = isCharacterRoom() ? "キャラを追加" : "カードを追加";
  }
  const faceLabel = el("tierlist-face-toggle");
  const faceChk = /** @type {HTMLInputElement|null} */ (el("tierlist-show-char-faces"));
  /* キャラ表のみ（カード表では使わない） */
  const showToggle = !!state.room && isCharacterRoom();
  if (faceLabel) faceLabel.hidden = !showToggle;
  if (faceChk && showToggle) faceChk.checked = !!state.showCharFaces;
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
  /* 顔トグルは shellSig に入れない（チップ差し替えのみ） */
  const shellSig =
    (charMode ? "c" : "k") +
    "|" +
    (host ? "h" : "g") +
    "|" +
    tiers
      .map(function (tier) {
        return tier.id + ":" + String(tier.color || "");
      })
      .join(";") +
    "|pool";

  /** @type {Map<string, HTMLElement>} */
  const chipPool = new Map();
  board.querySelectorAll(".tierlist-card[data-card-no], .tierlist-char[data-char-id]").forEach(function (btn) {
    const id = btn.getAttribute("data-card-no") || btn.getAttribute("data-char-id") || "";
    if (id) chipPool.set(id, btn);
  });

  const editingTitle =
    document.activeElement &&
    /** @type {HTMLElement} */ (document.activeElement).classList.contains("tierlist-row__title-input");

  if (board.dataset.tierShellSig !== shellSig && !editingTitle) {
    let html = tiers
      .map(function (tier) {
        return (
          '<div class="tierlist-row" data-tier-id="' +
          escapeHtml(tier.id) +
          '">' +
          '<div class="tierlist-row__label" style="background:' +
          escapeHtml(tier.color || "#888") +
          '">' +
          (host
            ? '<span class="tierlist-row__grip" draggable="true" title="ドラッグで並び替え" aria-label="並び替え">⠿</span>'
            : "") +
          '<input type="text" class="tierlist-row__title-input" data-tier-title="' +
          escapeHtml(tier.id) +
          '" maxlength="' +
          TIERLIST_MAX_TIER_LABEL_LEN +
          '" value="' +
          escapeHtml(tier.label || tier.id) +
          '" aria-label="ランク名" ' +
          (host ? "" : "readonly ") +
          "/>" +
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
  } else {
    tiers.forEach(function (tier) {
      const inp = /** @type {HTMLInputElement|null} */ (
        board.querySelector('input.tierlist-row__title-input[data-tier-title="' + tier.id + '"]')
      );
      if (!inp || document.activeElement === inp) return;
      const next = String(tier.label || tier.id);
      if (inp.value !== next) inp.value = next;
      inp.readOnly = !host;
    });
  }

  function placeEntries(tierId, entries, emptyText) {
    /** @type {HTMLElement|null} */
    let container = null;
    board.querySelectorAll(".tierlist-row__cards[data-drop-tier]").forEach(function (node) {
      if (!container && node.getAttribute("data-drop-tier") === tierId) {
        container = /** @type {HTMLElement} */ (node);
      }
    });
    if (!container) return;
    const emptyEl = container.querySelector(":scope > .tierlist-row__empty");
    if (!entries.length) {
      container.querySelectorAll(":scope > .tierlist-card, :scope > .tierlist-char").forEach(function (btn) {
        const id = btn.getAttribute("data-card-no") || btn.getAttribute("data-char-id") || "";
        if (id) chipPool.delete(id);
        btn.remove();
      });
      if (!emptyEl) {
        container.insertAdjacentHTML(
          "beforeend",
          '<span class="tierlist-row__empty muted">' + escapeHtml(emptyText) + "</span>",
        );
      } else if (emptyEl.textContent !== emptyText) {
        emptyEl.textContent = emptyText;
      }
      return;
    }
    if (emptyEl) emptyEl.remove();
    /** 外して付け直さず、順序どおり appendChild で移動する（点滅防止） */
    const faceWant = useDonjaraFaceArt() ? "1" : "0";
    entries.forEach(function (entry) {
      const id = tierListEntryItemId(entry);
      let btn = chipPool.get(id);
      if (btn) {
        chipPool.delete(id);
        btn.classList.toggle("is-selected", state.selectedCardNo === id);
        if (charMode && btn.dataset.faceMode !== faceWant) {
          const ch = resolveCharChip(id);
          const name = (ch && ch.label) || id;
          btn.dataset.faceMode = faceWant;
          btn.classList.toggle("tierlist-card--donjara-face", faceWant === "1");
          btn.innerHTML = charChipInnerHtml(ch, name);
        }
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
    '<p class="hint muted tierlist-picker__lead">クリックで複数選択 → 未配置へ一括追加できます（追加後もピッカーは開いたまま）。絞り込みは保持されます。</p>' +
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
    '<button type="button" class="btn sm secondary" id="tierlist-pick-select-visible">表示中をすべて選択</button>' +
    '<button type="button" class="btn sm secondary" id="tierlist-pick-clear-sel" hidden>選択解除</button>' +
    '<button type="button" class="btn primary" id="tierlist-pick-add" disabled>未配置へ追加</button>' +
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

  /** @type {Array<{ card_no?: string, name?: string, card_name?: string }>} */
  let lastMatched = [];

  function syncFooter() {
    const n = selected.size;
    const addBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector("#tierlist-pick-add"));
    const clearBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector("#tierlist-pick-clear-sel"));
    if (addBtn) {
      addBtn.disabled = n === 0;
      addBtn.textContent = n ? "未配置へ " + n + " 枚追加" : "未配置へ追加";
    }
    if (clearBtn) clearBtn.hidden = n === 0;
  }

  function collectMatched() {
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
    return matched;
  }

  function renderGrid() {
    persistFiltersFromUi();
    const matched = collectMatched();
    lastMatched = matched;
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
        const name = c.name || c.card_name || c.card_no;
        if (!btn) {
          btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.cardNo = no;
          btn.title = name;
          btn.innerHTML =
            cardVisualInnerHtml(c, name, { eager: idx < PICKER_THUMB_EAGER }) +
            '<span class="tierlist-pick-card__name">' +
            escapeHtml(name) +
            "</span>";
        }
        btn.className = "tierlist-pick-card" + (isOn ? " is-selected" : "");
        btn.setAttribute("aria-pressed", isOn ? "true" : "false");
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
  let pickRenderTimer = null;
  function schedulePickRender() {
    if (pickRenderTimer != null) clearTimeout(pickRenderTimer);
    pickRenderTimer = setTimeout(function () {
      pickRenderTimer = null;
      renderGrid();
    }, 180);
  }
  ["tierlist-pick-type", "tierlist-pick-school", "tierlist-pick-product", "tierlist-pick-q"].forEach(function (id) {
    overlay.querySelector("#" + id)?.addEventListener("input", schedulePickRender);
    overlay.querySelector("#" + id)?.addEventListener("change", schedulePickRender);
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
  overlay.querySelector("#tierlist-pick-select-visible")?.addEventListener("click", function () {
    lastMatched.forEach(function (c) {
      if (c && c.card_no) selected.add(c.card_no);
    });
    syncPickerSelectionOnly();
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
        selected.delete(cardNo);
        ok++;
        lastNo = cardNo;
      }
      if (lastNo) state.selectedCardNo = lastNo;
      showToast(ok ? ok + " 枚を未配置に追加しました" : "追加できるカードがありません");
      /* ピッカーは閉じず続けて追加できる。ボードは entries 購読の debounce 描画に任せる */
      renderGrid();
    } catch (err) {
      showToast(errorMessage(err));
      selected.forEach(function (no) {
        if (placed.has(no)) selected.delete(no);
      });
      renderGrid();
    } finally {
      if (addBtn) addBtn.disabled = selected.size === 0;
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
    const faceOn = useDonjaraFaceArt();
    const roster = listMemberCharacterRoster({ face: faceOn });
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
            '<button type="button" class="tierlist-pick-char' +
            (faceOn ? " tierlist-pick-char--donjara-face" : "") +
            '" data-char-id="' +
            escapeHtml(c.id) +
            '" title="' +
            escapeHtml(c.label) +
            '">' +
            memberIconHtml(c.href, c.label, faceOn ? "tierlist-char-icon--face" : "") +
            '<span class="tierlist-pick-char__name">' +
            escapeHtml(shortChipLabel(c.label, 5)) +
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
  let charPickTimer = null;
  overlay.querySelector("#tierlist-pick-char-q")?.addEventListener("input", function () {
    if (charPickTimer != null) clearTimeout(charPickTimer);
    charPickTimer = setTimeout(function () {
      charPickTimer = null;
      renderGrid();
    }, 180);
  });
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
  el("tierlist-show-char-faces")?.addEventListener("change", function (ev) {
    state.showCharFaces = !!(/** @type {HTMLInputElement} */ (ev.target).checked);
    persistShowCharFaces();
    renderRoomToolbar();
    refreshBoardChipFaces();
  });
  el("btn-tierlist-add-tier")?.addEventListener("click", async function () {
    if (!state.code || !state.room) return;
    const label = window.prompt("新しいティア名", "E");
    if (label == null) return;
    const tiers = tierListSortedTiers(state.room);
    const lines = tiers
      .map(function (t, i) {
        return i + 1 + ": 「" + (t.label || t.id) + "」の上";
      })
      .join("\n");
    const endNum = tiers.length + 1;
    const posRaw = window.prompt(
      "挿入位置の番号を入力\n" + lines + (lines ? "\n" : "") + endNum + ": 一番下",
      String(endNum),
    );
    if (posRaw == null) return;
    const pos = Number(posRaw);
    if (!Number.isFinite(pos) || pos < 1 || pos > endNum) {
      showToast("位置の番号が不正です");
      return;
    }
    const insertIndex = Math.floor(pos) - 1;
    try {
      await addTierListTier(state.code, {
        label: label.slice(0, TIERLIST_MAX_TIER_LABEL_LEN),
        insertIndex: insertIndex,
      });
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
    if (target.closest(".tierlist-row__title-input")) return;
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

  async function commitTierTitleInput(inp) {
    if (!inp || !state.code || !state.room) return;
    if (!isTierListHost(state.room, getTierListMyUid())) return;
    const tierId = inp.getAttribute("data-tier-title") || "";
    const tier = state.room.tiers && state.room.tiers[tierId];
    if (!tier) return;
    const next = String(inp.value || "").trim().slice(0, TIERLIST_MAX_TIER_LABEL_LEN);
    if (!next) {
      inp.value = tier.label || tier.id;
      return;
    }
    if (next === String(tier.label || "")) return;
    try {
      await updateTierListTier(state.code, tierId, { label: next });
    } catch (err) {
      showToast(errorMessage(err));
      inp.value = tier.label || tier.id;
    }
  }

  board?.addEventListener("keydown", function (ev) {
    const inp = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-row__title-input");
    if (!inp || ev.key !== "Enter") return;
    ev.preventDefault();
    /** @type {HTMLInputElement} */ (inp).blur();
  });
  board?.addEventListener("change", function (ev) {
    const inp = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-row__title-input");
    if (inp) commitTierTitleInput(/** @type {HTMLInputElement} */ (inp));
  });
  board?.addEventListener("blur", function (ev) {
    const inp = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-row__title-input");
    if (inp) commitTierTitleInput(/** @type {HTMLInputElement} */ (inp));
  }, true);

  board?.addEventListener("dragstart", function (ev) {
    if (/** @type {HTMLElement} */ (ev.target).closest(".tierlist-row__title-input")) {
      ev.preventDefault();
      return;
    }
    const grip = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-row__grip");
    if (grip && ev.dataTransfer) {
      if (!state.room || !isTierListHost(state.room, getTierListMyUid())) {
        ev.preventDefault();
        return;
      }
      const row = grip.closest(".tierlist-row[data-tier-id]");
      const tierId = (row && row.getAttribute("data-tier-id")) || "";
      if (!tierId || tierId === TIERLIST_POOL_ID) {
        ev.preventDefault();
        return;
      }
      state.draggingTierId = tierId;
      ev.dataTransfer.setData("text/plain", "tierrow:" + tierId);
      ev.dataTransfer.effectAllowed = "move";
      if (row) row.classList.add("is-tier-dragging");
      return;
    }
    const charBtn = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-char[data-char-id]");
    if (charBtn && ev.dataTransfer) {
      state.draggingTierId = "";
      const id = charBtn.getAttribute("data-char-id") || "";
      state.selectedCardNo = id;
      ev.dataTransfer.setData("text/plain", "char:" + id);
      ev.dataTransfer.effectAllowed = "move";
      charBtn.classList.add("is-dragging");
      return;
    }
    const cardBtn = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-card[data-card-no]");
    if (!cardBtn || !ev.dataTransfer) return;
    state.draggingTierId = "";
    const no = cardBtn.getAttribute("data-card-no") || "";
    state.selectedCardNo = no;
    ev.dataTransfer.setData("text/plain", no);
    ev.dataTransfer.effectAllowed = "move";
    cardBtn.classList.add("is-dragging");
  });
  board?.addEventListener("dragend", function () {
    state.draggingTierId = "";
    clearBoardDropIndicators();
    board.querySelectorAll(".is-dragging").forEach(function (node) {
      node.classList.remove("is-dragging");
    });
  });
  board?.addEventListener("dragover", function (ev) {
    if (state.draggingTierId) {
      const row = /** @type {HTMLElement} */ (ev.target).closest(".tierlist-row[data-tier-id]");
      if (!row || !board.contains(row)) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
      board.querySelectorAll(".is-tier-drop-before, .is-tier-drop-after").forEach(function (node) {
        node.classList.remove("is-tier-drop-before", "is-tier-drop-after");
      });
      const beforeId = resolveTierRowDropBeforeId(board, ev.clientY, state.draggingTierId);
      if (beforeId) {
        const target = board.querySelector('.tierlist-row[data-tier-id="' + beforeId + '"]');
        if (target) target.classList.add("is-tier-drop-before");
      } else {
        const last = Array.from(board.querySelectorAll(".tierlist-row[data-tier-id]")).filter(function (r) {
          const id = r.getAttribute("data-tier-id") || "";
          return id && id !== TIERLIST_POOL_ID && id !== state.draggingTierId;
        }).pop();
        if (last) last.classList.add("is-tier-drop-after");
      }
      return;
    }
    const drop = /** @type {HTMLElement} */ (ev.target).closest("[data-drop-tier]");
    if (!drop) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    drop.classList.add("is-dragover");
    const draggedId = String(state.selectedCardNo || "");
    board.querySelectorAll(".tierlist-card.is-drop-before").forEach(function (node) {
      node.classList.remove("is-drop-before");
    });
    const beforeId = resolveDropBeforeId(drop, ev.clientX, ev.clientY, draggedId);
    if (beforeId) {
      drop.querySelectorAll(".tierlist-card").forEach(function (chip) {
        if (chipDomId(chip) === beforeId) chip.classList.add("is-drop-before");
      });
    }
  });
  board?.addEventListener("dragleave", function (ev) {
    if (state.draggingTierId) return;
    const drop = /** @type {HTMLElement} */ (ev.target).closest("[data-drop-tier]");
    if (!drop) return;
    const related = /** @type {Node|null} */ (ev.relatedTarget);
    if (related && drop.contains(related)) return;
    drop.classList.remove("is-dragover");
    drop.querySelectorAll(".is-drop-before").forEach(function (node) {
      node.classList.remove("is-drop-before");
    });
  });
  board?.addEventListener("drop", async function (ev) {
    if (!ev.dataTransfer || !state.code || !state.room) return;
    const raw = ev.dataTransfer.getData("text/plain") || "";
    const tierDragId =
      state.draggingTierId ||
      (String(raw).indexOf("tierrow:") === 0 ? String(raw).replace(/^tierrow:/, "") : "");
    if (tierDragId) {
      ev.preventDefault();
      clearBoardDropIndicators();
      state.draggingTierId = "";
      if (!isTierListHost(state.room, getTierListMyUid())) return;
      const beforeId = resolveTierRowDropBeforeId(board, ev.clientY, tierDragId);
      const ids = tierListSortedTiers(state.room)
        .map(function (t) {
          return t.id;
        })
        .filter(function (id) {
          return id !== tierDragId;
        });
      let insertAt = ids.length;
      if (beforeId) {
        const i = ids.indexOf(beforeId);
        if (i >= 0) insertAt = i;
      }
      ids.splice(insertAt, 0, tierDragId);
      applyLocalTierOrder(ids);
      renderBoard();
      try {
        await reorderTierListTiers(state.code, ids);
      } catch (err) {
        showToast(errorMessage(err));
      }
      return;
    }
    const drop = /** @type {HTMLElement} */ (ev.target).closest("[data-drop-tier]");
    if (!drop) return;
    ev.preventDefault();
    clearBoardDropIndicators();
    const payload = raw || state.selectedCardNo;
    const tierId = drop.getAttribute("data-drop-tier") || "";
    if (!payload || !tierId) return;
    const isChar = isCharacterRoom() || String(payload).indexOf("char:") === 0;
    const itemId = isChar ? String(payload).replace(/^char:/, "") : String(payload);
    if (!itemId) return;
    const beforeId = resolveDropBeforeId(drop, ev.clientX, ev.clientY, itemId);
    const orderInTier = computeOrderInTier(tierId, beforeId, itemId);
    applyLocalEntryPlacement(itemId, tierId, orderInTier);
    state.selectedCardNo = itemId;
    renderBoard();
    renderMoveBar();
    try {
      if (isChar) {
        await placeTierListCard(state.code, { charId: itemId, tierId: tierId, orderInTier: orderInTier });
      } else {
        await placeTierListCard(state.code, { cardNo: itemId, tierId: tierId, orderInTier: orderInTier });
      }
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
