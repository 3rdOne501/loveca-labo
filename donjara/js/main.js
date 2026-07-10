/**
 * ラブライブ！ドンジャラ（麻雀準拠）— アプリ本体。
 * 3 画面: 対戦 / 設定 / 牌一覧。設定は localStorage に永続化。
 */

import { CONTENTS, HONOR_TILES, contentById } from "./contents.js";
import { loadTileCatalog } from "./tiles.js";
import { gradeLabel, resolveHandComboGroupsIndexed } from "./memberData.js";
import { loadSif2Assets, illustUrl, unitAsset, unitLogoUrl } from "./sif2Assets.js";
import { discardGroupSplashAt, characterCallSplash } from "./effects.js";
import {
  loadConfig,
  saveConfig,
  buildWall,
  copiesForTile,
  DEFAULT_COPIES,
} from "./config.js";
import { BASE_YAKU } from "./yaku.js";
import {
  createGame,
  drawTile,
  discardTile,
  checkTsumo,
  declareTsumo,
  cpuAct,
  isMenzen,
  canDeclareRiichi,
  computeHumanCallOptions,
  humanRon,
  humanPon,
  humanKan,
  humanChi,
  humanSkipCall,
  applyAnkan,
  applyShouminkan,
  tenpaiKeepDiscards,
  submitCallResponse,
  serializeGame,
  deserializeGame,
  nextDoraKey,
  doraKeySet,
  normalizePlayerHand,
} from "./game.js";
import { ankanOptions, shouminkanOptions } from "./calls.js";
import { computeScore } from "./score.js";
import { sfx } from "./sound.js";
import { tileEl, showToast, showModal, el } from "./ui.js";
import * as online from "./online.js";

/** 現在の自席（オフラインは 0、オンラインは参加席）。 */
function mySeat() {
  return app.online ? app.online.seat : 0;
}
function isOnline() {
  return !!app.online;
}

const AVATAR_KEY = "donjara-avatar";

const app = {
  catalog: null,
  config: null,
  game: null,
  view: "config", // 起動時は設定
  online: null, // { code, seat, isHost, status, room, unsubRoom, unsubActions, busy }
  sif2Assets: null,
  avatar: null, // { series, charId }
  selectedTileKey: null,
  selectedHandIndex: null,
  comboFlashKey: "", // 未使用（互換）
  announceIdx: 0,
  pendingDiscardFx: [], // { p, logoUrl, label }
  pendingCallFx: [], // { t, p }
};

function loadAvatar() {
  try {
    const j = JSON.parse(localStorage.getItem(AVATAR_KEY) || "null");
    if (j && j.series && j.charId) return j;
  } catch (_) {}
  return { series: "muse", charId: "honoka" };
}

function saveAvatar(a) {
  app.avatar = a;
  localStorage.setItem(AVATAR_KEY, JSON.stringify(a));
  if (app.online && app.online.code != null && app.online.seat != null) {
    online.setSeatAvatar(app.online.code, app.online.seat, a).catch(() => {});
  }
}

function avatarIllust(a) {
  if (!a || !app.sif2Assets) return null;
  return illustUrl(app.sif2Assets, a.series, a.charId);
}

function seatAvatar(seat) {
  if (!app.online?.room?.seatAvatars) return app.avatar;
  const a = app.online.room.seatAvatars[seat];
  return a && a.series && a.charId ? a : null;
}

async function boot() {
  app.catalog = await loadTileCatalog();
  app.config = loadConfig(app.catalog);
  app.sif2Assets = await loadSif2Assets();
  app.avatar = loadAvatar();
  // 最初のユーザー操作で AudioContext を解錠（ブラウザの自動再生制限対策）
  const unlock = () => sfx.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("resize", syncPlayLayoutClasses);
  window.matchMedia("(orientation: portrait)").addEventListener("change", syncPlayLayoutClasses);
  renderShell();
  renderView();
}

function syncPlayLayoutClasses() {
  const playing = app.view === "play" && !!app.game;
  const portrait = window.matchMedia("(orientation: portrait) and (max-width: 960px)").matches;
  document.body.classList.toggle("dz-body--play", playing);
  document.body.classList.toggle("dz-body--portrait", playing && portrait);
}

/* ---------------- シェル / タブ ---------------- */

function renderShell() {
  const root = document.getElementById("app");
  root.innerHTML = "";

  const header = el("header", "dz-header");
  header.appendChild(el("h1", "dz-header__title", "ラブライブ！ドンジャラ（麻雀準拠）"));
  const tabs = el("nav", "dz-tabs");
  const defs = [
    ["play", "対戦"],
    ["config", "設定"],
    ["catalog", "牌一覧"],
  ];
  for (const [id, label] of defs) {
    const b = el("button", "dz-tab" + (app.view === id ? " is-active" : ""), label);
    b.dataset.view = id;
    b.addEventListener("click", () => {
      app.view = id;
      renderShell();
      renderView();
    });
    tabs.appendChild(b);
  }
  header.appendChild(tabs);
  root.appendChild(header);

  const main = el("main", "dz-main");
  main.id = "dz-view";
  root.appendChild(main);
}

function renderView() {
  const host = document.getElementById("dz-view");
  host.classList.toggle("is-play", app.view === "play");
  syncPlayLayoutClasses();

  host.innerHTML = "";
  if (app.view === "config") host.appendChild(renderConfigView());
  else if (app.view === "catalog") host.appendChild(renderCatalogView());
  else host.appendChild(renderPlayView());
  if (app.view === "play") {
    requestAnimationFrame(() => {
      flushDiscardFx();
      flushCallFx();
    });
  }
}

function persist() {
  saveConfig(app.config);
}

/** tileEl 共通オプション（牌右上数字は設定で制御）。 */
function tileOpts(extra = {}) {
  return { showIndex: app.config.showTileNumbers === true, ...extra };
}

/* ---------------- 設定画面 ---------------- */

function renderConfigView() {
  const wrap = el("div", "dz-config");

  // 山情報バナー
  const { total, byTile } = buildWall(app.config, app.catalog);
  const memberCount = byTile.filter((b) => b.tile.kind === "member").length;
  const honorCount = byTile.filter((b) => b.tile.kind === "honor").length;
  const banner = el("div", "dz-banner");
  banner.appendChild(el("strong", null, `山の合計 ${total} 枚`));
  banner.appendChild(el("span", "dz-banner__sub", `　種類: キャラ ${memberCount} / 字牌 ${honorCount}`));
  if (total % 3 !== 1 && total > 0) {
    banner.appendChild(el("span", "dz-banner__warn", "　※ 一般的な麻雀の山は「牌種×4」構成。枚数を調整できます"));
  }
  wrap.appendChild(banner);

  // 全体設定
  const g = el("section", "dz-card");
  g.appendChild(el("h3", "dz-card__title", "全体設定"));
  const grid = el("div", "dz-opt-grid");
  grid.appendChild(numberField("既定の枚数（1牌種あたり）", app.config.defaultCopies, 1, 8, (v) => {
    app.config.defaultCopies = v;
    persist();
    renderView();
  }));
  grid.appendChild(numberField("プレイヤー人数", app.config.players, 2, 4, (v) => {
    app.config.players = v;
    persist();
  }));
  grid.appendChild(numberField("配牌枚数（手牌）", app.config.handSize, 4, 13, (v) => {
    app.config.handSize = v;
    persist();
  }));
  const numRow = el("div", "dz-opt-row");
  numRow.appendChild(el("span", "dz-opt-label", "牌の数字（順子用）"));
  numRow.appendChild(
    checkbox(!!app.config.showTileNumbers, (on) => {
      app.config.showTileNumbers = on;
      persist();
      renderView();
    })
  );
  g.appendChild(grid);
  g.appendChild(numRow);
  g.appendChild(el("p", "dz-note", "OFF: ユニット＝順子・学年＝刻子で和了。ON: 従来の数字順子/刻子も併用。"));
  wrap.appendChild(g);

  // コンテンツ／キャラ
  for (const c of CONTENTS) {
    wrap.appendChild(renderContentCard(c));
  }

  // 字牌
  wrap.appendChild(renderHonorCard());

  // 役設定
  wrap.appendChild(renderYakuCard());

  wrap.appendChild(renderAvatarPicker());

  return wrap;
}

/** 雀魂風: 対戦キャラ（SIF2 立ち絵）を 1 人選ぶ。 */
function renderAvatarPicker() {
  const sec = el("section", "dz-card dz-avatar-pick");
  sec.appendChild(el("h3", "dz-card__title", "対戦キャラ"));
  sec.appendChild(el("p", "dz-note", "対戦中に各席のアバターとして表示されます（オンラインでも同期）。"));

  const preview = el("div", "dz-avatar-preview");
  const img = document.createElement("img");
  img.className = "dz-avatar-preview__img";
  img.alt = "";
  const updPreview = () => {
    const url = avatarIllust(app.avatar);
    if (url) {
      img.src = url;
      img.style.display = "";
    } else img.style.display = "none";
  };
  updPreview();
  preview.appendChild(img);
  const nameEl = el("span", "dz-avatar-preview__name", "");
  const updName = () => {
    const t = app.catalog.byKey.get(`${app.avatar.series}-${app.avatar.charId}`);
    nameEl.textContent = t ? t.label : app.avatar.charId;
  };
  updName();
  preview.appendChild(nameEl);
  sec.appendChild(preview);

  const tabs = el("div", "dz-avatar-tabs");
  const seriesList = ["muse", "aqours", "nijigasaki", "liella"];
  let activeSeries = app.avatar.series;
  if (!seriesList.includes(activeSeries)) activeSeries = "muse";

  const grid = el("div", "dz-avatar-grid");
  const renderGrid = () => {
    grid.innerHTML = "";
    const list = (app.catalog.byContent.get(activeSeries) || []).filter((t) =>
      illustUrl(app.sif2Assets, activeSeries, t.charId)
    );
    for (const t of list) {
      const btn = el("button", "dz-avatar-opt" + (app.avatar.series === t.contentId && app.avatar.charId === t.charId ? " is-active" : ""));
      const thumb = document.createElement("img");
      thumb.src = illustUrl(app.sif2Assets, t.contentId, t.charId);
      thumb.alt = t.label;
      thumb.loading = "lazy";
      btn.appendChild(thumb);
      btn.title = t.label;
      btn.addEventListener("click", () => {
        saveAvatar({ series: t.contentId, charId: t.charId });
        updPreview();
        updName();
        renderGrid();
        tabs.querySelectorAll(".dz-avatar-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.series === activeSeries));
      });
      grid.appendChild(btn);
    }
  };

  for (const sid of seriesList) {
    const c = CONTENTS.find((x) => x.id === sid);
    const tab = el("button", "dz-avatar-tab" + (sid === activeSeries ? " is-active" : ""), c ? c.label : sid);
    tab.dataset.series = sid;
    tab.addEventListener("click", () => {
      activeSeries = sid;
      tabs.querySelectorAll(".dz-avatar-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.series === sid));
      renderGrid();
    });
    tabs.appendChild(tab);
  }
  sec.appendChild(tabs);
  renderGrid();
  sec.appendChild(grid);
  return sec;
}

/** 牌一覧用: 長押しで情報。 */
function bindCatalogTile(cell, tile) {
  let pressTimer = null;
  let didLong = false;
  cell.addEventListener("pointerdown", () => {
    didLong = false;
    pressTimer = setTimeout(() => {
      didLong = true;
      showTileInfo(tile);
    }, 480);
  });
  const clear = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
  };
  cell.addEventListener("pointerup", clear);
  cell.addEventListener("pointerleave", clear);
  cell.addEventListener("click", (e) => {
    if (didLong) {
      didLong = false;
      e.preventDefault();
    }
  });
}

function renderContentCard(content) {
  const card = el("section", "dz-card");
  const list = app.catalog.byContent.get(content.id) || [];
  const cfg = app.config.contents[content.id];

  const head = el("div", "dz-card__head");
  const toggle = checkbox(cfg.enabled, (on) => {
    cfg.enabled = on;
    // 一括：コンテンツ ON で全キャラ ON（初回利便）
    if (on && Object.values(cfg.chars).every((v) => !v)) {
      for (const k of Object.keys(cfg.chars)) cfg.chars[k] = true;
    }
    persist();
    renderView();
  });
  head.appendChild(toggle);
  if (content.logo) {
    const logo = document.createElement("img");
    logo.className = "dz-card__logo";
    logo.src = content.logo;
    logo.alt = content.label;
    logo.onerror = () => logo.remove();
    head.appendChild(logo);
  }
  head.appendChild(el("h3", "dz-card__title", content.label));
  if (!content.live) head.appendChild(el("span", "dz-tag dz-tag--reserve", "画像用意後に有効化（保留）"));
  else head.appendChild(el("span", "dz-card__count", `${list.length}キャラ`));
  card.appendChild(head);

  if (!content.live) {
    card.appendChild(el("p", "dz-note", content.note || "このコンテンツは画像未整備のため保留中です。"));
    return card;
  }

  // 一括ボタン
  const bulk = el("div", "dz-bulk");
  const allBtn = el("button", "dz-btn dz-btn--sm", "全キャラON");
  allBtn.addEventListener("click", () => {
    for (const k of Object.keys(cfg.chars)) cfg.chars[k] = true;
    cfg.enabled = true;
    persist();
    renderView();
  });
  const noneBtn = el("button", "dz-btn dz-btn--sm", "全キャラOFF");
  noneBtn.addEventListener("click", () => {
    for (const k of Object.keys(cfg.chars)) cfg.chars[k] = false;
    persist();
    renderView();
  });
  bulk.appendChild(allBtn);
  bulk.appendChild(noneBtn);
  card.appendChild(bulk);

  const grid = el("div", "dz-char-grid");
  for (const t of list) {
    const row = el("div", "dz-char-row" + (cfg.chars[t.charId] ? "" : " is-off"));
    const cb = checkbox(!!cfg.chars[t.charId], (on) => {
      cfg.chars[t.charId] = on;
      persist();
      renderView();
    });
    row.appendChild(cb);
    row.appendChild(tileEl(t, tileOpts({ size: "sm" })));
    const copies = copiesForTile(app.config, t);
    const cin = smallNumber(t.key in app.config.copies ? app.config.copies[t.key] : app.config.defaultCopies, 0, 8, (v) => {
      app.config.copies[t.key] = v;
      persist();
      renderView();
    });
    cin.title = "この牌の枚数";
    row.appendChild(cin);
    grid.appendChild(row);
  }
  card.appendChild(grid);
  return card;
}

function renderHonorCard() {
  const card = el("section", "dz-card");
  card.appendChild(el("h3", "dz-card__title", "字牌（石鹸・水・虹・星・蓮・鳥・白）"));
  const grid = el("div", "dz-char-grid");
  for (const t of app.catalog.honors) {
    const cfg = app.config.honors[t.honorId];
    const row = el("div", "dz-char-row" + (cfg.enabled ? "" : " is-off"));
    row.appendChild(checkbox(cfg.enabled, (on) => {
      cfg.enabled = on;
      persist();
      renderView();
    }));
    row.appendChild(tileEl(t, tileOpts({ size: "sm" })));
    const cin = smallNumber(t.key in app.config.copies ? app.config.copies[t.key] : app.config.defaultCopies, 0, 8, (v) => {
      app.config.copies[t.key] = v;
      persist();
      renderView();
    });
    row.appendChild(cin);
    grid.appendChild(row);
  }
  card.appendChild(grid);
  return card;
}

function renderYakuCard() {
  const card = el("section", "dz-card");
  card.appendChild(el("h3", "dz-card__title", "役の設定"));
  card.appendChild(el("p", "dz-note", "基本役の ON/OFF と、独自役の追加ができます。"));

  const grid = el("div", "dz-yaku-grid");
  for (const y of BASE_YAKU) {
    const row = el("label", "dz-yaku-row");
    row.appendChild(checkbox(app.config.yaku.enabled[y.id] !== false, (on) => {
      app.config.yaku.enabled[y.id] = on;
      persist();
    }));
    row.appendChild(el("span", "dz-yaku-row__name", y.name));
    row.appendChild(el("span", "dz-yaku-row__han", `${y.han}翻`));
    grid.appendChild(row);
  }
  card.appendChild(grid);

  // カスタム役
  card.appendChild(el("h4", "dz-subtitle", "追加した独自役"));
  const customList = el("div", "dz-custom-list");
  (app.config.yaku.custom || []).forEach((spec, i) => {
    const row = el("div", "dz-custom-row");
    row.appendChild(el("span", null, `${describeCustom(spec)}（${spec.params.han || 1}翻）`));
    const del = el("button", "dz-btn dz-btn--sm dz-btn--danger", "削除");
    del.addEventListener("click", () => {
      app.config.yaku.custom.splice(i, 1);
      persist();
      renderView();
    });
    row.appendChild(del);
    customList.appendChild(row);
  });
  if (!(app.config.yaku.custom || []).length) customList.appendChild(el("p", "dz-note", "（まだありません）"));
  card.appendChild(customList);

  card.appendChild(renderCustomYakuForm());
  return card;
}

function describeCustom(spec) {
  const p = spec.params || {};
  if (spec.template === "content_flush") return `${p.contentLabel || p.contentId} 染め`;
  if (spec.template === "honor_triplet") return `${p.honorLabel || p.honorKey} の刻子`;
  if (spec.template === "member_triplet") return `${p.memberLabel || p.memberKey} の刻子`;
  return spec.template;
}

function renderCustomYakuForm() {
  const form = el("div", "dz-custom-form");
  const tmplSel = document.createElement("select");
  tmplSel.className = "dz-select";
  [
    ["content_flush", "コンテンツ染め"],
    ["honor_triplet", "特定字牌の刻子"],
    ["member_triplet", "特定キャラの刻子"],
  ].forEach(([v, l]) => tmplSel.appendChild(new Option(l, v)));

  const targetSel = document.createElement("select");
  targetSel.className = "dz-select";

  const hanIn = document.createElement("input");
  hanIn.type = "number";
  hanIn.className = "dz-input dz-input--num";
  hanIn.value = "2";
  hanIn.min = "1";
  hanIn.max = "13";

  const rebuildTargets = () => {
    targetSel.innerHTML = "";
    const t = tmplSel.value;
    if (t === "content_flush") {
      CONTENTS.filter((c) => c.live).forEach((c) => targetSel.appendChild(new Option(c.label, c.id)));
    } else if (t === "honor_triplet") {
      app.catalog.honors.forEach((h) => targetSel.appendChild(new Option(h.label, h.key)));
    } else {
      for (const c of CONTENTS.filter((c) => c.live)) {
        (app.catalog.byContent.get(c.id) || []).forEach((m) =>
          targetSel.appendChild(new Option(`${c.label}／${m.label}`, m.key))
        );
      }
    }
  };
  tmplSel.addEventListener("change", rebuildTargets);
  rebuildTargets();

  const addBtn = el("button", "dz-btn dz-btn--primary dz-btn--sm", "役を追加");
  addBtn.addEventListener("click", () => {
    const template = tmplSel.value;
    const han = Number(hanIn.value) || 1;
    const opt = targetSel.selectedOptions[0];
    const params = { han };
    if (template === "content_flush") {
      params.contentId = opt.value;
      params.contentLabel = opt.textContent;
    } else if (template === "honor_triplet") {
      params.honorKey = opt.value;
      params.honorLabel = opt.textContent;
    } else {
      params.memberKey = opt.value;
      params.memberLabel = opt.textContent;
    }
    app.config.yaku.custom = app.config.yaku.custom || [];
    app.config.yaku.custom.push({ template, params });
    persist();
    renderView();
    showToast("独自役を追加しました");
  });

  form.appendChild(labeled("種類", tmplSel));
  form.appendChild(labeled("対象", targetSel));
  form.appendChild(labeled("翻", hanIn));
  form.appendChild(addBtn);
  return form;
}

/* ---------------- 牌一覧画面 ---------------- */

function renderCatalogView() {
  const wrap = el("div", "dz-catalog");
  for (const c of CONTENTS) {
    if (!c.live) continue;
    const list = app.catalog.byContent.get(c.id) || [];
    const sec = el("section", "dz-card");
    sec.appendChild(el("h3", "dz-card__title", `${c.label}（${list.length}）`));
    const row = el("div", "dz-tile-row");
    for (const t of list) {
      const cell = el("div", "dz-tile-cell");
      const tileNode = tileEl(t, tileOpts({ size: "md" }));
      bindCatalogTile(tileNode, t);
      cell.appendChild(tileNode);
      cell.appendChild(el("span", "dz-tile-cell__n", `×${copiesForTile(app.config, t)}`));
      row.appendChild(cell);
    }
    sec.appendChild(row);
    wrap.appendChild(sec);
  }
  const hs = el("section", "dz-card");
  hs.appendChild(el("h3", "dz-card__title", "字牌"));
  const hrow = el("div", "dz-tile-row");
  for (const t of app.catalog.honors) {
    const cell = el("div", "dz-tile-cell");
    const tileNode = tileEl(t, tileOpts({ size: "md" }));
    bindCatalogTile(tileNode, t);
    cell.appendChild(tileNode);
    cell.appendChild(el("span", "dz-tile-cell__n", `×${copiesForTile(app.config, t)}`));
    hrow.appendChild(cell);
  }
  hs.appendChild(hrow);
  wrap.appendChild(hs);
  return wrap;
}

/* ---------------- 対戦画面 ---------------- */

function renderPlayView() {
  const wrap = el("div", "dz-play");

  // オンライン中
  if (app.online) {
    if (app.online.status === "lobby") {
      wrap.appendChild(renderLobby());
      return wrap;
    }
    // playing / over
    if (app.game) wrap.appendChild(renderBoard());
    else wrap.appendChild(el("p", "dz-note", "同期待ち…"));
    return wrap;
  }

  // オフラインのスタート画面
  if (!app.game) {
    const start = el("div", "dz-start");
    const { total } = buildWall(app.config, app.catalog);
    start.appendChild(el("p", "dz-note", `現在の設定で山は ${total} 枚。`));
    if (total < app.config.handSize * app.config.players + 14) {
      start.appendChild(el("p", "dz-banner__warn", "山が少なすぎます。設定で枚数・キャラを増やしてください。"));
    }
    const btn = el("button", "dz-btn dz-btn--primary dz-btn--lg", "対戦開始（ローカル／CPU）");
    btn.addEventListener("click", () => {
      const { total: t2 } = buildWall(app.config, app.catalog);
      if (t2 < app.config.handSize * app.config.players + 4) {
        showToast("山が足りません。設定を見直してください");
        return;
      }
      app.game = createGame(app.config, app.catalog);
      advanceTurn();
    });
    start.appendChild(btn);

    // オンライン対戦
    start.appendChild(el("h3", "dz-subtitle", "オンライン対戦（Firebase 4 人卓）"));
    if (!online.isConfigured()) {
      start.appendChild(el("p", "dz-banner__warn", "Firebase 未設定のためオンラインは利用できません。"));
    } else {
      const orow = el("div", "dz-online-row");
      const createBtn = el("button", "dz-btn dz-btn--primary", "ルームを作成（ホスト）");
      createBtn.addEventListener("click", onCreateRoom);
      const codeInput = document.createElement("input");
      codeInput.className = "dz-input";
      codeInput.placeholder = "ルームコード";
      codeInput.maxLength = 5;
      codeInput.style.textTransform = "uppercase";
      const joinBtn = el("button", "dz-btn", "参加");
      joinBtn.addEventListener("click", () => onJoinRoom(codeInput.value.trim().toUpperCase()));
      orow.appendChild(createBtn);
      orow.appendChild(codeInput);
      orow.appendChild(joinBtn);
      start.appendChild(orow);
      start.appendChild(el("p", "dz-note", "空席は CPU が担当します。ホストが「対局開始」を押すと開始します。"));
    }
    start.appendChild(renderAvatarPicker());
    wrap.appendChild(start);
    return wrap;
  }
  wrap.appendChild(renderBoard());
  return wrap;
}

/* ---------------- オンライン: ロビー ---------------- */

function renderLobby() {
  const wrap = el("div", "dz-lobby");
  const room = app.online.room || {};
  wrap.appendChild(el("h2", "dz-lobby__code", `ルームコード: ${app.online.code}`));
  wrap.appendChild(el("p", "dz-note", "このコードを相手に伝えて参加してもらってください。"));

  const seats = el("div", "dz-seats");
  const seatUids = room.seatUids || [];
  const seatNames = room.seatNames || [];
  for (let i = 0; i < (room.configLite ? room.configLite.players : seatUids.length); i++) {
    const s = el("div", "dz-seat" + (i === app.online.seat ? " is-me" : ""));
    s.appendChild(el("div", "dz-seat__no", `席 ${i + 1}`));
    s.appendChild(el("div", "dz-seat__name", seatUids[i] ? seatNames[i] || "プレイヤー" : "（空席→CPU）"));
    seats.appendChild(s);
  }
  wrap.appendChild(seats);

  const bar = el("div", "dz-actions");
  if (app.online.isHost) {
    const startBtn = el("button", "dz-btn dz-btn--primary dz-btn--lg", "対局開始");
    startBtn.addEventListener("click", onHostStart);
    bar.appendChild(startBtn);
  } else {
    bar.appendChild(el("span", "dz-hint", "ホストの開始を待っています…"));
  }
  const leave = el("button", "dz-btn dz-btn--sm", "退出");
  leave.addEventListener("click", leaveOnline);
  bar.appendChild(leave);
  wrap.appendChild(bar);
  return wrap;
}

async function onCreateRoom() {
  try {
    showToast("ルーム作成中…");
    const configLite = app.config;
    const { code } = await online.createRoom(configLite, null);
    app.online = { code, seat: 0, isHost: true, status: "lobby", room: null };
    await attachRoomWatchers();
    if (app.avatar) await online.setSeatAvatar(code, 0, app.avatar);
    renderView();
  } catch (e) {
    console.error(e);
    showToast("作成失敗: " + (e && e.message ? e.message : e));
  }
}

async function onJoinRoom(code) {
  if (!code) {
    showToast("コードを入力してください");
    return;
  }
  try {
    showToast("参加中…");
    const { seat } = await online.joinRoom(code, null);
    app.online = { code, seat, isHost: false, status: "lobby", room: null };
    await attachRoomWatchers();
    if (app.avatar) await online.setSeatAvatar(code, seat, app.avatar);
    renderView();
  } catch (e) {
    console.error(e);
    showToast("参加失敗: " + (e && e.message ? e.message : e));
  }
}

async function attachRoomWatchers() {
  const code = app.online.code;
  app.online.unsubRoom = await online.watchRoom(code, onRoomSnapshot);
  if (app.online.isHost) {
    app.online.unsubActions = await online.watchActions(code, onHostActions);
  }
}

function onRoomSnapshot(room) {
  if (!app.online) return;
  app.online.room = room;
  app.online.status = room.status;
  const seat = (room.seatUids || []).indexOf(online.myUid());
  if (seat >= 0) app.online.seat = seat;

  // 非ホストは権威 state から game を復元（ホストは自前の authoritative game を保持）
  if (room.status !== "lobby" && room.state && !app.online.isHost) {
    app.game = deserializeGame(room.state, configFromLite(room.configLite), app.catalog);
    if (app.game.phase !== "over") app.online.resultShown = false;
  }
  renderView();

  // 非ホストの和了表示
  if (!app.online.isHost && app.game && app.game.phase === "over" && !app.online.resultShown) {
    app.online.resultShown = true;
    showResult();
  }
}

function configFromLite(lite) {
  return lite || app.config;
}

async function onHostStart() {
  try {
    const room = app.online.room;
    const cfg = configFromLite(room.configLite);
    const { total } = buildWall(cfg, app.catalog);
    if (total < (cfg.handSize || 13) * (cfg.players || 4) + 4) {
      showToast("山が足りません。設定を見直してください");
      return;
    }
    const game = createGame(cfg, app.catalog);
    // 席 controllers: uid あり=human / 空席=cpu
    game.controllers = game.players.map((_, i) => ((room.seatUids || [])[i] ? "human" : "cpu"));
    app.game = game;
    app.online.resultShown = false;
    await online.startRoom(app.online.code, serializeGame(game), game.controllers, room.seatUids);
    hostAdvance();
  } catch (e) {
    console.error(e);
    showToast("開始失敗: " + (e && e.message ? e.message : e));
  }
}

async function leaveOnline() {
  try {
    if (app.online) {
      if (app.online.unsubRoom) app.online.unsubRoom();
      if (app.online.unsubActions) app.online.unsubActions();
    }
  } catch (_) {}
  app.online = null;
  app.game = null;
  renderView();
}

function advanceTurn() {
  const game = app.game;
  renderView();
  if (game.phase === "over") {
    showResult();
    return;
  }
  if (game.phase === "callWait") {
    // 人間の鳴き選択待ち：ボタンは renderBoard で表示済み
    return;
  }
  const pl = game.players[game.turn];
  if (pl.isHuman) {
    if (game.phase === "draw") {
      drawTile(game);
      if (game.phase === "over") {
        renderView();
        showResult();
        return;
      }
      // 立直中はツモ切り（ツモ和了できる場合を除く）
      if (pl.riichi && !checkTsumo(game)) {
        const d = pl.drawn;
        if (d && pl.hand.includes(d)) {
          discardTile(game, d, pl.hand.lastIndexOf(d));
          advanceTurn();
        }
        return;
      }
    }
    renderView();
  } else {
    setTimeout(() => {
      cpuAct(game);
      advanceTurn();
    }, 600);
  }
}

function meldRow(pl, tileSize = "md") {
  const wrap = el("div", "dz-melds");
  for (const m of pl.melds) {
    const mel = el("div", "dz-meld dz-meld--" + m.kind);
    let calledMarked = false;
    m.tiles.forEach((k, i) => {
      const faceDown = m.kind === "ankan" && (i === 1 || i === 2);
      const t = tileEl(app.catalog.byKey.get(k), tileOpts({ size: tileSize, faceDown }));
      if (m.calledTile && k === m.calledTile && !calledMarked && m.kind !== "ankan") {
        t.classList.add("is-called");
        calledMarked = true;
      }
      mel.appendChild(t);
    });
    wrap.appendChild(mel);
  }
  return wrap;
}

/** 席の表示名（オンラインは席名／空席=CPU、オフラインは CPU/あなた）。 */
function seatName(p) {
  if (isOnline()) {
    const room = app.online.room || {};
    if (p === app.online.seat) return "あなた";
    return (room.seatUids || [])[p] ? (room.seatNames || [])[p] || `席${p + 1}` : `CPU${p + 1}`;
  }
  return p === 0 ? "あなた" : `CPU ${p}`;
}

function getRiichiPending() {
  return isOnline() ? !!app.online.riichiPending : !!app.game.riichiPending;
}
function setRiichiPending(v) {
  if (isOnline()) app.online.riichiPending = v;
  else app.game.riichiPending = v;
}

/* ---------------- 雀魂風 対戦テーブル ---------------- */

/** 4 人時の相対位置。off=1 下家(右)/2 対面(上)/3 上家(左)。 */
function areaForOffset(nPlayers, off) {
  if (nPlayers <= 2) return "pos-top";
  if (nPlayers === 3) return off === 1 ? "pos-right" : "pos-left";
  return { 1: "pos-right", 2: "pos-top", 3: "pos-left" }[off] || "pos-top";
}

function riverEl(pl, extraClass, game = null) {
  const r = el("div", "dz-river is-tappable" + (extraClass ? " " + extraClass : ""));
  r.title = "クリックで捨て牌一覧";
  const pd = game?.pendingDiscard;
  const highlightCall =
    game?.phase === "callWait" && pd && pd.from === pl.id;
  pl.discards.forEach((k, i) => {
    const cell = el("div", "dz-river-cell");
    const t = tileEl(app.catalog.byKey.get(k), tileOpts({ size: "xs" }));
    if (i === pl.discards.length - 1) {
      t.classList.add("is-last");
      if (highlightCall) t.classList.add("is-call-target");
    }
    cell.appendChild(t);
    r.appendChild(cell);
  });
  r.addEventListener("click", (e) => {
    e.stopPropagation();
    showDiscards(app.game, pl.id);
  });
  return r;
}

/** 指定席（null=全員）の捨て牌を並べたモーダルを表示。 */
function showDiscards(game, focusSeat) {
  const seats = focusSeat == null ? game.players.map((_, i) => i) : [focusSeat];
  const wrap = el("div", "dz-discard-view");
  for (const p of seats) {
    const pl = game.players[p];
    const block = el("div", "dz-discard-block");
    const head = el("div", "dz-discard-head");
    head.appendChild(el("span", "dz-discard-name", seatName(p)));
    if (pl.riichi) head.appendChild(el("span", "dz-riichi-badge", "立直"));
    head.appendChild(el("span", "dz-discard-count", `${pl.discards.length}枚`));
    block.appendChild(head);
    const grid = el("div", "dz-discard-grid");
    if (!pl.discards.length) grid.appendChild(el("span", "dz-hint", "まだありません"));
    pl.discards.forEach((k, i) => {
      const tile = app.catalog.byKey.get(k);
      const t = tileEl(tile, tileOpts({ size: "sm" }));
      bindCatalogTile(t, tile);
      if (i === pl.discards.length - 1) t.classList.add("is-last");
      grid.appendChild(t);
    });
    block.appendChild(grid);
    wrap.appendChild(block);
  }
  const title = focusSeat == null ? "捨て牌一覧" : `${seatName(focusSeat)} の捨て牌`;
  showModal(title, wrap, [{ label: "閉じる", primary: true }]);
}

/** 牌をクリックしたときに、その牌が持つ情報（所属ユニット・グループ・作品・学年）を表示。 */
function showTileInfo(tile) {
  if (!tile) return;
  const wrap = el("div", "dz-tileinfo");

  const preview = el("div", "dz-tileinfo__preview");
  preview.appendChild(tileEl(tile, tileOpts({ size: "lg" })));
  wrap.appendChild(preview);

  const table = el("div", "dz-tileinfo__table");
  const addRow = (k, v) => {
    if (v == null || v === "") return;
    const row = el("div", "dz-tileinfo__row");
    row.appendChild(el("span", "dz-tileinfo__k", k));
    row.appendChild(el("span", "dz-tileinfo__v", v));
    table.appendChild(row);
  };

  addRow("名前", tile.label);
  if (tile.kind === "member") {
    const content = contentById(tile.contentId);
    addRow("グループ", content ? content.label : tile.contentId);
    addRow("作品", tile.work);
    addRow("学年", gradeLabel(tile.grade));
    addRow("所属ユニット", tile.unit || "―");
  } else {
    addRow("種別", "字牌");
    addRow("備考", tile.blank ? "白（無地）" : "順子は作れません");
  }

  wrap.appendChild(table);
  showModal("牌の情報", wrap, [{ label: "閉じる", primary: true }]);
}

function backsEl(count) {
  const b = el("div", "dz-backs");
  const n = Math.min(count, 14);
  for (let i = 0; i < n; i++) b.appendChild(el("div", "dz-back-tile"));
  return b;
}

/** 自席から見た席 p の卓上位置（bottom=自分 / top / left / right）。 */
function seatRole(game, p, my) {
  const off = (p - my + game.nPlayers) % game.nPlayers;
  if (off === 0) return "bottom";
  if (game.nPlayers === 2) return "top";
  if (game.nPlayers === 3) return off === 1 ? "right" : "top";
  return { 1: "right", 2: "top", 3: "left" }[off] || "top";
}

/** 雀魂風アバターカード（各席の外側に配置）。 */
function avatarCard(game, p, my) {
  const pl = game.players[p];
  const card = el(
    "div",
    "dz-ms-avatar" +
      (game.turn === p ? " is-turn" : "") +
      (p === my ? " dz-ms-avatar--self" : "") +
      " dz-ms-avatar--" +
      seatRole(game, p, my)
  );
  const av = seatAvatar(p) || (p === my ? app.avatar : null);
  const ill = av ? avatarIllust(av) : null;
  const frame = el("div", "dz-ms-avatar__frame");
  if (ill) {
    const img = document.createElement("img");
    img.className = "dz-ms-avatar__img";
    img.src = ill;
    img.alt = seatName(p);
    frame.appendChild(img);
  } else {
    frame.appendChild(el("span", "dz-ms-avatar__ph", seatName(p).slice(0, 1)));
  }
  card.appendChild(frame);
  const info = el("div", "dz-ms-avatar__info");
  info.appendChild(el("span", "dz-ms-avatar__name", seatName(p)));
  if (pl.riichi) info.appendChild(el("span", "dz-riichi-badge", "立直"));
  card.appendChild(info);
  return card;
}

/** 左上: ドラ / 裏ドラ / ユーティリティ（雀魂のドラ表示エリア相当）。 */
function doraPanel(game) {
  const panel = el("div", "dz-ms-dora-panel");
  const tiles = el("div", "dz-ms-dora-panel__tiles");
  const ind = (game.doraIndicators || [])[0];
  if (ind) {
    const d = el("div", "dz-hub__dora");
    d.appendChild(el("span", "dz-hub__doralabel", "ドラ"));
    d.appendChild(tileEl(app.catalog.byKey.get(ind), tileOpts({ size: "sm" })));
    tiles.appendChild(d);
  }
  const uind = (game.uradoraIndicators || [])[0];
  if (uind) {
    const ud = el("div", "dz-hub__dora dz-hub__dora--ura");
    ud.appendChild(el("span", "dz-hub__doralabel", "裏ドラ"));
    ud.appendChild(tileEl(app.catalog.byKey.get(uind), tileOpts({ size: "sm" })));
    tiles.appendChild(ud);
  }
  if ((game.doraIndicators || []).length > 1) {
    tiles.appendChild(el("span", "dz-hub__doraextra", `+${game.doraIndicators.length - 1}`));
  }
  panel.appendChild(tiles);

  const tools = el("div", "dz-ms-tools");
  const discardsBtn = el("button", "dz-iconbtn", "捨て牌");
  discardsBtn.title = "全員の捨て牌一覧";
  discardsBtn.addEventListener("click", () => showDiscards(game, null));
  tools.appendChild(discardsBtn);
  const mute = el("button", "dz-iconbtn dz-iconbtn--mute", sfx.isMuted() ? "🔇" : "🔊");
  mute.title = "効果音";
  mute.addEventListener("click", () => {
    const m = sfx.toggle();
    mute.textContent = m ? "🔇" : "🔊";
    if (!m) sfx.draw();
  });
  tools.appendChild(mute);
  panel.appendChild(tools);
  return panel;
}

/** 右上: 退出など。 */
function tableTopBar(game) {
  const bar = el("div", "dz-ms-topbar");
  if (isOnline()) bar.appendChild(el("span", "dz-hub__code", `部屋 ${app.online.code}`));
  const quit = el("button", "dz-iconbtn", isOnline() ? "退出" : "やめる");
  quit.addEventListener("click", () => {
    if (isOnline()) leaveOnline();
    else {
      app.game = null;
      renderView();
    }
  });
  bar.appendChild(quit);
  return bar;
}

/** 中央: 河（4方向）＋ HUD スクエア。 */
function centerBlock(game, my) {
  const center = el("div", "dz-ms-center");
  const winds = ["東", "南", "西", "北"];

  for (let p = 0; p < game.nPlayers; p++) {
    const role = seatRole(game, p, my);
    const kawa = el("div", "dz-ms-kawa dz-ms-kawa--" + role);
    const slot = el("div", "dz-river-slot");
    slot.appendChild(
      riverEl(
        game.players[p],
        role === "bottom" ? "dz-river--self" : "dz-river--" + role,
        game
      )
    );
    kawa.appendChild(slot);
    if (role === "bottom" && game.turn === my && game.phase === "discard" && game.controllers[my] !== "cpu") {
      kawa.classList.add("dz-discard-dropzone");
      kawa.dataset.discardDrop = "1";
    }
    center.appendChild(kawa);
  }

  const hub = el("div", "dz-ms-hub");

  const core = el("div", "dz-ms-hub__core");
  core.appendChild(el("div", "dz-ms-hub__round", "東1局"));
  const wallBlock = el("div", "dz-ms-hub__wallblock");
  wallBlock.appendChild(el("div", "dz-ms-hub__wall", String(game.wall.length)));
  wallBlock.appendChild(el("div", "dz-ms-hub__walllabel", "残り"));
  core.appendChild(wallBlock);
  let turnLabel = game.turn === my ? "あなたの番" : `${seatName(game.turn)}の番`;
  if (game.phase === "callWait") turnLabel = "鳴き待ち";
  core.appendChild(el("div", "dz-ms-hub__turn", turnLabel));
  hub.appendChild(core);

  // 風・点数はハブ内グリッドの上下左右セルへ（本文と重ならない）
  const offWind = ["bottom", "right", "top", "left"];
  for (let i = 0; i < 4; i++) {
    const corner = el("div", "dz-ms-corner dz-ms-corner--" + offWind[i]);
    corner.appendChild(el("span", "dz-ms-corner__wind", winds[i]));
    corner.appendChild(el("span", "dz-ms-corner__score", "25000"));
    hub.appendChild(corner);
  }

  center.appendChild(hub);
  return center;
}

function opponentSeat(game, p, my) {
  const pl = game.players[p];
  const role = seatRole(game, p, my);
  const wrap = el("div", "dz-ms-seat dz-ms-seat--" + role + (game.turn === p ? " is-turn" : ""));
  wrap.appendChild(avatarCard(game, p, my));
  const handZone = el("div", "dz-ms-handzone");
  const handLine = el("div", "dz-ms-handline");
  if (pl.melds.length) handLine.appendChild(meldRow(pl));
  handLine.appendChild(backsEl(pl.hand.length));
  handZone.appendChild(handLine);
  wrap.appendChild(handZone);
  if (pl.riichi) wrap.appendChild(el("div", "dz-riichi-stick"));
  return wrap;
}

function actBtn(label, kind, onClick, sub) {
  const b = el("button", `dz-act dz-act--${kind}`);
  b.appendChild(el("span", "dz-act__main", label));
  if (sub) b.appendChild(el("span", "dz-act__sub", sub));
  b.addEventListener("click", onClick);
  return b;
}

/** 鳴きプレビュー（対象牌を is-called で強調）。 */
function callPreviewEl(tileKeys, calledKey, size = "md") {
  const row = el("div", "dz-callpreview");
  for (const k of tileKeys) {
    const t = tileEl(app.catalog.byKey.get(k), tileOpts({ size }));
    if (k === calledKey) t.classList.add("is-called");
    row.appendChild(t);
  }
  return row;
}

function callActionBtn(label, kind, previewKeys, calledKey, onClick) {
  const b = el("button", `dz-callbtn dz-callbtn--${kind}`);
  if (previewKeys?.length) b.appendChild(callPreviewEl(previewKeys, calledKey, "md"));
  b.appendChild(el("span", "dz-callbtn__label", label));
  b.addEventListener("click", onClick);
  return b;
}

/** 鳴き待ち UI — 手牌上に大きく表示。 */
function callActionBar(game, seat) {
  if (game.phase !== "callWait") return null;
  const opts = game.callOptionsBySeat?.[seat];
  if (!opts) return null;
  const pd = game.pendingDiscard;
  if (!pd) return null;

  const bar = el("div", "dz-callbar dz-callbar--play");
  const head = el("div", "dz-callbar__head");
  head.appendChild(el("span", "dz-callbar__title", `${seatName(pd.from)} の打牌`));
  const target = tileEl(app.catalog.byKey.get(pd.tile), tileOpts({ size: "md" }));
  target.classList.add("is-call-target");
  head.appendChild(target);
  bar.appendChild(head);

  const actions = el("div", "dz-callbar__actions");
  const called = pd.tile;

  if (opts.ron) {
    actions.appendChild(
      callActionBtn("ロン", "ron", null, null, () => doCall({ type: "ron" }))
    );
  }
  if (opts.kan) {
    actions.appendChild(
      callActionBtn(
        "カン",
        "kan",
        [called, called, called, called],
        called,
        () => doCall({ type: "kan" })
      )
    );
  }
  if (opts.pon) {
    actions.appendChild(
      callActionBtn(
        "ポン",
        "pon",
        [called, called, called],
        called,
        () => doCall({ type: "pon" })
      )
    );
  }
  for (const o of opts.chi || []) {
    const meldKeys = [...o.tiles, called];
    actions.appendChild(
      callActionBtn("チー", "chi", meldKeys, called, () => doCall({ type: "chi", tiles: o.tiles }))
    );
  }
  actions.appendChild(
    callActionBtn("スキップ", "skip", null, null, () => doCall({ type: "skip" }))
  );
  bar.appendChild(actions);
  return bar;
}

function actionDock(game, seat) {
  const dock = el("div", "dz-dock");
  const me = game.players[seat];

  // 鳴きは callActionBar で表示
  if (game.phase === "callWait" && game.callOptionsBySeat?.[seat]) return dock;

  const isMyDiscard = game.turn === seat && game.phase === "discard" && game.controllers[seat] !== "cpu";
  if (isMyDiscard) {
    if (app.selectedTileKey && (!getRiichiPending() || tenpaiKeepDiscards(game, me.hand).has(app.selectedTileKey))) {
      dock.appendChild(
        actBtn("切る", "discard", () => {
          const k = app.selectedTileKey;
          const hi = app.selectedHandIndex;
          app.selectedTileKey = null;
          app.selectedHandIndex = null;
          doDiscard(k, hi);
        })
      );
    }
    const tsumo = checkTsumo(game);
    if (tsumo) dock.appendChild(actBtn("ツモ", "tsumo", doTsumo, `${tsumo.totalHan}翻`));
    if (!getRiichiPending() && canDeclareRiichi(game)) {
      dock.appendChild(
        actBtn("リーチ", "riichi", () => {
          setRiichiPending(true);
          renderView();
          showToast("テンパイ維持できる牌（緑）を切ってください");
        })
      );
    }
    for (const k of ankanOptions(me.hand)) {
      dock.appendChild(actBtn("暗槓", "kan", () => doAnkan(k), app.catalog.byKey.get(k).label));
    }
    for (const k of shouminkanOptions(me.hand, me.melds)) {
      dock.appendChild(actBtn("加槓", "kan", () => doShouminkan(k), app.catalog.byKey.get(k).label));
    }
  }
  return dock;
}

function selfArea(game, seat) {
  const me = game.players[seat];
  normalizePlayerHand(me);
  const wrap = el("div", "dz-ms-self");
  if (me.riichi) wrap.appendChild(el("div", "dz-riichi-stick"));

  wrap.appendChild(avatarCard(game, seat, seat));

  const isMyDiscard = game.turn === seat && game.phase === "discard" && game.controllers[seat] !== "cpu";
  const tenpaiKeep = isMyDiscard ? tenpaiKeepDiscards(game, me.hand) : new Set();
  const riichiLock = getRiichiPending();

  const handRow = el("div", "dz-ms-handrow");
  if (isMyDiscard) {
    const dropZone = el("div", "dz-discard-dropzone dz-discard-dropzone--hand");
    dropZone.dataset.discardDrop = "1";
    dropZone.appendChild(el("span", "dz-discard-dropzone__hint", "ここにドロップで打牌"));
    wrap.appendChild(dropZone);
  }

  const handWrap = el("div", "dz-hand2");
  if (me.hand.length >= 14) handWrap.classList.add("dz-hand2--dense");

  const displayCells = handDisplayCells(me);
  const comboOverlay = buildHandComboOverlayMap(me, displayCells);

  const makeCell = (k, isDrawn, handIndex, comboMeta) => {
    const t = app.catalog.byKey.get(k);
    const clickable = isMyDiscard && (!riichiLock || tenpaiKeep.has(k));
    const cell = tileEl(t, tileOpts({
      size: "lg",
      selected: app.selectedTileKey === k && app.selectedHandIndex === handIndex,
      onHandInteract: clickable
        ? {
            canInteract: true,
            onSelect: (key) => {
              if (app.selectedTileKey === key && app.selectedHandIndex === handIndex) {
                app.selectedTileKey = null;
                app.selectedHandIndex = null;
              } else {
                app.selectedTileKey = key;
                app.selectedHandIndex = handIndex;
              }
              renderView();
            },
            onDiscard: (key) => {
              app.selectedTileKey = null;
              app.selectedHandIndex = null;
              doDiscard(key, handIndex);
            },
            onInfo: (tile) => showTileInfo(tile),
          }
        : null,
    }));
    cell.dataset.handIndex = String(handIndex);
    if (isDrawn) cell.classList.add("dz-tile--drawn");
    if (isMyDiscard && tenpaiKeep.has(k)) cell.classList.add("is-tenpai-keep");
    if (riichiLock && !tenpaiKeep.has(k)) cell.classList.add("is-locked");
    if (comboMeta?.memberKind) cell.classList.add(`is-combo-member--${comboMeta.memberKind}`);

    if (comboMeta?.logoUrl) {
      const outer = el("div", `dz-hand-tile-wrap dz-hand-tile-wrap--${comboMeta.memberKind}`);
      outer.style.setProperty("--combo-tiles", String(comboMeta.tileCount));
      const logo = document.createElement("img");
      logo.className = "dz-hand-tile-wrap__logo";
      logo.src = comboMeta.logoUrl;
      logo.alt = comboMeta.logoAlt || "";
      logo.draggable = false;
      logo.onerror = () => logo.remove();
      outer.appendChild(logo);
      outer.appendChild(cell);
      return outer;
    }
    return cell;
  };

  for (const dc of displayCells) {
    handWrap.appendChild(makeCell(dc.key, dc.isDrawn, dc.handIndex, comboOverlay.get(dc.handIndex)));
  }
  if (me.melds.length) {
    const melds = el("div", "dz-ms-self-melds");
    melds.appendChild(meldRow(me));
    handRow.appendChild(melds);
  }
  handRow.appendChild(handWrap);
  wrap.appendChild(handRow);

  if (isMyDiscard && tenpaiKeep.size && !getRiichiPending()) {
    wrap.appendChild(el("div", "dz-selfhint", "緑の牌を切るとテンパイ維持／ダブルクリック or ドラッグで打牌・長押しで情報"));
  } else if (isMyDiscard) {
    wrap.appendChild(el("div", "dz-selfhint", "1回タップで選択・ダブルクリック or ドラッグで打牌・長押しで牌情報"));
  }

  return wrap;
}

/** 手牌表示用セル（インデックス単位・同キー重複でも欠けない）。 */
function handDisplayCells(pl) {
  normalizePlayerHand(pl);
  const cells = [];
  const drawnIdx = pl.drawn != null ? pl.hand.lastIndexOf(pl.drawn) : -1;
  for (let i = 0; i < pl.hand.length; i++) {
    if (drawnIdx >= 0 && i === drawnIdx) continue;
    cells.push({ key: pl.hand[i], handIndex: i, isDrawn: false });
  }
  if (drawnIdx >= 0) {
    cells.push({ key: pl.hand[drawnIdx], handIndex: drawnIdx, isDrawn: true });
  }
  return cells;
}

/** 手牌の揃い表示: ユニットロゴ / グループ（学年）ロゴ。 */
function buildHandComboOverlayMap(pl, displayCells) {
  const map = new Map();
  const all = resolveHandComboGroupsIndexed(pl, app.catalog);
  const groups = [
    ...all.filter((g) => g.kind === "unit"),
    ...all.filter((g) => g.kind === "group"),
  ];

  for (const g of groups) {
    let logoUrl = null;
    let logoAlt = "";
    if (g.kind === "unit") {
      logoUrl = unitLogoUrl(unitAsset(app.sif2Assets, g.series, g.unit));
      logoAlt = g.unit;
    } else {
      const c = contentById(g.series);
      logoUrl = c?.logo || null;
      logoAlt = c ? `${c.label} ${gradeLabel(g.grade)}` : "";
    }
    if (!logoUrl) continue;

    for (const hi of g.handIndices) {
      const prev = map.get(hi);
      if (prev?.memberKind === "unit" && g.kind === "group") continue;
      map.set(hi, { memberKind: g.kind, logoUrl: null, tileCount: g.handIndices.length, logoAlt });
    }

    const orders = g.handIndices
      .map((hi) => displayCells.findIndex((c) => c.handIndex === hi))
      .filter((o) => o >= 0);
    if (!orders.length) continue;
    const anchorHandIndex = displayCells[Math.min(...orders)].handIndex;
    if (map.get(anchorHandIndex)?.logoUrl) continue;
    map.set(anchorHandIndex, {
      memberKind: g.kind,
      logoUrl,
      tileCount: g.handIndices.length,
      logoAlt,
    });
  }
  return map;
}

function illustForSeat(p) {
  const a = seatAvatar(p);
  if (a) return avatarIllust(a);
  if (p === mySeat()) return avatarIllust(app.avatar);
  const pl = app.game?.players[p];
  if (pl) {
    for (const k of pl.hand) {
      const t = app.catalog?.byKey.get(k);
      if (t?.kind === "member" && t.contentId && t.charId) {
        const url = illustUrl(app.sif2Assets, t.contentId, t.charId);
        if (url) return url;
      }
    }
  }
  return avatarIllust(app.avatar);
}

function flushCallFx() {
  const queue = app.pendingCallFx.splice(0);
  for (const fx of queue) {
    characterCallSplash(illustForSeat(fx.p), fx.t, seatName(fx.p));
  }
}

function flushDiscardFx() {
  const game = app.game;
  const queue = app.pendingDiscardFx.splice(0);
  if (!game || !queue.length) return;
  const seat = mySeat();
  for (const fx of queue) {
    const role = seatRole(game, fx.p, seat);
    const tile = document.querySelector(`.dz-ms-kawa--${role} .dz-river .dz-tile.is-last`);
    if (tile) discardGroupSplashAt(tile, fx.logoUrl, fx.label);
  }
}

/* ---------------- 演出（バナー / スプラッシュ） ---------------- */

function announce(text, cls) {
  const b = el("div", "dz-announce" + (cls ? " " + cls : ""), text);
  document.body.appendChild(b);
  requestAnimationFrame(() => b.classList.add("is-show"));
  setTimeout(() => {
    b.classList.remove("is-show");
    setTimeout(() => b.remove(), 400);
  }, 1300);
}

function yakumanSplash(label, cb) {
  const s = el("div", "dz-splash");
  s.appendChild(el("div", "dz-splash__text", label));
  s.appendChild(el("div", "dz-splash__sub", "YAKUMAN"));
  document.body.appendChild(s);
  requestAnimationFrame(() => s.classList.add("is-show"));
  setTimeout(() => {
    s.classList.remove("is-show");
    setTimeout(() => {
      s.remove();
      if (cb) cb();
    }, 400);
  }, 1900);
}

/** game.log の新規イベントから鳴き/立直バナーを表示。 */
function processAnnouncements(game) {
  const log = game.log || [];
  if (app.announceIdx == null || log.length < app.announceIdx) app.announceIdx = log.length;
  for (let i = app.announceIdx; i < log.length; i++) {
    const e = log[i];
    if (e.t === "riichi") {
      announce("リーチ！", "dz-announce--riichi");
      sfx.riichi();
    } else if (e.t === "ron") {
      announce("ロン", "dz-announce--call");
      sfx.call();
      app.pendingCallFx.push({ t: "ron", p: e.p });
    } else if (e.t === "pon") {
      announce("ポン", "dz-announce--call");
      sfx.call();
      app.pendingCallFx.push({ t: "pon", p: e.p });
    } else if (e.t === "chi") {
      announce("チー", "dz-announce--call");
      sfx.call();
      app.pendingCallFx.push({ t: "chi", p: e.p });
    } else if (e.t === "kan" || e.t === "ankan" || e.t === "shouminkan") {
      announce("カン", "dz-announce--call");
      sfx.call();
      app.pendingCallFx.push({ t: e.t, p: e.p });
    } else if (e.t === "discard") {
      sfx.discard();
      const tile = app.catalog.byKey.get(e.tile);
      if (tile && tile.logoUrl) {
        app.pendingDiscardFx.push({
          p: e.p,
          logoUrl: tile.logoUrl,
          label: contentById(tile.contentId)?.label,
        });
      }
    } else if (e.t === "doraAdd") {
      announce("ドラ追加", "dz-announce--call");
    } else if (e.t === "draw" || e.t === "rinshan") {
      sfx.draw();
    }
  }
  app.announceIdx = log.length;
}

function renderBoard() {
  const game = app.game;
  const seat = mySeat();
  const canSelect =
    game.turn === seat && game.phase === "discard" && game.controllers[seat] !== "cpu";
  if (!canSelect) {
    app.selectedTileKey = null;
    app.selectedHandIndex = null;
  }

  const wrap = el("div", "dz-ms-wrap");
  wrap.appendChild(doraPanel(game));
  wrap.appendChild(tableTopBar(game));

  const table = el("div", "dz-ms-table");

  const mid = el("div", "dz-ms-mid");

  const felt = el("div", "dz-ms-felt");
  felt.appendChild(centerBlock(game, seat));
  mid.appendChild(felt);

  const topAnchor = el("div", "dz-ms-anchor dz-ms-anchor--top");
  for (let p = 0; p < game.nPlayers; p++) {
    if (p === seat) continue;
    if (seatRole(game, p, seat) === "top") topAnchor.appendChild(opponentSeat(game, p, seat));
  }
  mid.appendChild(topAnchor);

  for (let p = 0; p < game.nPlayers; p++) {
    if (p === seat) continue;
    if (seatRole(game, p, seat) === "left") mid.appendChild(opponentSeat(game, p, seat));
    if (seatRole(game, p, seat) === "right") mid.appendChild(opponentSeat(game, p, seat));
  }

  const selfAnchor = el("div", "dz-ms-anchor dz-ms-anchor--bottom");
  const callBar = callActionBar(game, seat);
  if (callBar) {
    selfAnchor.classList.add("is-call-wait");
    selfAnchor.appendChild(callBar);
  }
  selfAnchor.appendChild(selfArea(game, seat));
  selfAnchor.appendChild(actionDock(game, seat));
  mid.appendChild(selfAnchor);

  table.appendChild(mid);

  wrap.appendChild(table);
  processAnnouncements(game);
  return wrap;
}

/* ---------------- アクション振り分け（オフライン=即適用 / オンライン=投函） ---------------- */

function doDiscard(tileKey, handIndex = null) {
  app.selectedTileKey = null;
  app.selectedHandIndex = null;
  if (isOnline()) {
    const riichi = getRiichiPending();
    setRiichiPending(false);
    online.postAction(app.online.code, { type: "discard", tile: tileKey, handIndex, riichi });
  } else {
    if (app.game.turn !== 0 || app.game.phase !== "discard") return;
    discardTile(app.game, tileKey, handIndex);
    advanceTurn();
  }
}
function doTsumo() {
  if (isOnline()) online.postAction(app.online.code, { type: "tsumo" });
  else {
    declareTsumo(app.game);
    advanceTurn();
  }
}
function doAnkan(k) {
  if (isOnline()) online.postAction(app.online.code, { type: "ankan", tile: k });
  else if (applyAnkan(app.game, k)) advanceTurn();
}
function doShouminkan(k) {
  if (isOnline()) online.postAction(app.online.code, { type: "shouminkan", tile: k });
  else if (applyShouminkan(app.game, k)) advanceTurn();
}
function doCall(response) {
  if (isOnline()) online.postAction(app.online.code, { type: "call", response });
  else {
    submitCallResponse(app.game, 0, response);
    advanceTurn();
  }
}

/* ---------------- ホスト権威ループ ---------------- */

function hostSync() {
  if (app.online && app.online.isHost && app.game) {
    online.setRoomState(app.online.code, serializeGame(app.game), app.game.phase === "over" ? "over" : "playing");
  }
}

function hostAdvance() {
  const game = app.game;
  if (!game || !app.online) return;
  hostSync();
  renderView();
  if (game.phase === "over") {
    if (!app.online.resultShown) {
      app.online.resultShown = true;
      showResult();
    }
    return;
  }
  if (game.phase === "callWait") return; // 人間の鳴き応答待ち
  const ctrl = game.controllers[game.turn];
  if (ctrl === "cpu") {
    setTimeout(() => {
      if (!app.online || !app.game) return;
      cpuAct(app.game);
      hostAdvance();
    }, 500);
  } else if (game.phase === "draw") {
    drawTile(game);
    hostSync();
    renderView();
    if (game.phase === "over") hostAdvance();
    // 人間席の打牌アクションを待つ
  }
}

async function onHostActions(acts) {
  if (!app.online || !app.online.isHost || !app.game) return;
  if (!app.online.processed) app.online.processed = new Set();
  let applied = false;
  for (const a of acts) {
    if (app.online.processed.has(a.id)) continue;
    app.online.processed.add(a.id);
    applyHostAction(a);
    applied = true;
    try {
      await online.clearAction(app.online.code, a.id);
    } catch (_) {}
  }
  if (applied) hostAdvance();
}

function applyHostAction(a) {
  const game = app.game;
  if (!game) return;
  const seat = (app.online.room.seatUids || []).indexOf(a.uid);
  if (seat < 0) return;
  if (a.type === "discard") {
    if (game.turn === seat && game.phase === "discard") {
      if (a.riichi) game.riichiPending = true;
      discardTile(game, a.tile, a.handIndex ?? null);
    }
  } else if (a.type === "tsumo") {
    if (game.turn === seat && game.phase === "discard") declareTsumo(game);
  } else if (a.type === "ankan") {
    if (game.turn === seat && game.phase === "discard") applyAnkan(game, a.tile);
  } else if (a.type === "shouminkan") {
    if (game.turn === seat && game.phase === "discard") applyShouminkan(game, a.tile);
  } else if (a.type === "call") {
    if (game.phase === "callWait") submitCallResponse(game, seat, a.response);
  }
}

/** 和了手を面子（副露/暗刻/順子）＋雀頭ごとに整列して描画する。 */
function winningHandGroups(r) {
  const wrap = el("div", "dz-winhand");
  const st = r.eval && r.eval.structure;
  const winTile = r.type === "ron" ? r.tile : r.hand && r.hand[r.hand.length - 1];
  let winMarked = false;

  const groupEl = (keys, cls) => {
    const g = el("div", "dz-meld-group" + (cls ? " " + cls : ""));
    for (const k of keys) {
      const cell = tileEl(app.catalog.byKey.get(k), tileOpts({ size: "sm" }));
      if (!winMarked && k === winTile) {
        cell.classList.add("is-win");
        winMarked = true;
      }
      g.appendChild(cell);
    }
    return g;
  };

  if (st && st.kind === "chiitoitsu") {
    // 7 対子: 2 枚ずつまとめる
    const counts = new Map();
    for (const k of st.tiles) counts.set(k, (counts.get(k) || 0) + 1);
    for (const [k] of counts) wrap.appendChild(groupEl([k, k]));
    return wrap;
  }
  if (st && st.kind === "standard") {
    const seqs = st.melds.filter((m) => m.type === "sequence");
    const trips = st.melds.filter((m) => m.type === "triplet");
    for (const m of seqs) wrap.appendChild(groupEl(m.tileKeys, m.open ? "is-open" : ""));
    for (const m of trips)
      wrap.appendChild(groupEl(m.tileKeys, (m.open ? "is-open " : "") + (m.kan ? "is-kan" : "").trim()));
    if (st.pair) wrap.appendChild(groupEl(st.pair.tileKeys, "is-pair"));
    return wrap;
  }
  // フォールバック: フラット表示
  (r.hand || []).forEach((k) => wrap.appendChild(tileEl(app.catalog.byKey.get(k), tileOpts({ size: "sm" }))));
  return wrap;
}

function showResult() {
  const game = app.game;
  const r = game.result;
  const seat = mySeat();
  const body = el("div", "dz-result");
  let title = "流局";
  if (r.type === "draw") {
    body.appendChild(el("p", null, "山が尽きました（流局）。"));
  } else {
    const who = r.winner === seat ? "あなた" : seatName(r.winner);
    title = r.type === "tsumo" ? `${who} のツモ和了！` : `${who} のロン和了！`;
    if (r.type === "ron") body.appendChild(el("p", null, `放銃: ${r.from === seat ? "あなた" : seatName(r.from)}`));

    body.appendChild(winningHandGroups(r));

    const yl = el("ul", "dz-yaku-result");
    for (const y of r.eval.yaku) yl.appendChild(el("li", null, `${y.name} ${y.han}翻`));
    body.appendChild(yl);

    // 符・点数
    const st = r.eval.structure;
    const score = computeScore(st, {
      han: r.eval.totalHan,
      tsumo: r.type === "tsumo",
      menzen: !!r.menzen,
      hasPinfu: r.eval.yaku.some((y) => y.name === "平和"),
      hasChiitoi: st && st.kind === "chiitoitsu",
    }, app.catalog);
    const scoreLine = el("p", "dz-result__total");
    scoreLine.appendChild(el("span", "dz-result__han", `${score.han}翻 ${score.fu}符`));
    scoreLine.appendChild(el("span", "dz-result__pts", `${score.points}点`));
    if (score.limit) scoreLine.appendChild(el("span", "dz-result__limit", score.limit));
    body.appendChild(scoreLine);
  }

  let actions;
  if (isOnline()) {
    actions = [];
    if (app.online.isHost) {
      actions.push({
        label: "もう一局",
        primary: true,
        onClick: async () => {
          const room = app.online.room;
          const cfg = configFromLite(room.configLite);
          const game2 = createGame(cfg, app.catalog);
          game2.controllers = game2.players.map((_, i) => ((room.seatUids || [])[i] ? "human" : "cpu"));
          app.game = game2;
          app.online.resultShown = false;
          await online.startRoom(app.online.code, serializeGame(game2), game2.controllers, room.seatUids);
          hostAdvance();
        },
      });
    }
    actions.push({ label: "退出", onClick: leaveOnline });
  } else {
    actions = [
      {
        label: "もう一局",
        primary: true,
        onClick: () => {
          app.game = createGame(app.config, app.catalog);
          advanceTurn();
        },
      },
      {
        label: "設定へ",
        onClick: () => {
          app.game = null;
          app.view = "config";
          renderShell();
          renderView();
        },
      },
    ];
  }

  const present = () => showModal(title, body, actions);
  if (r.type === "draw") {
    present();
    return;
  }
  // 和了バナー → 役満なら全画面スプラッシュ → 結果モーダル
  const han = r.eval ? r.eval.totalHan : 0;
  announce(r.type === "tsumo" ? "ツモ！" : "ロン！", r.type === "tsumo" ? "dz-announce--tsumo" : "dz-announce--ron");
  if (han >= 13) {
    sfx.yakuman();
    setTimeout(() => yakumanSplash("役満", present), 500);
  } else {
    sfx.win();
    setTimeout(present, 650);
  }
}

/* ---------------- フォーム部品 ---------------- */

function checkbox(checked, onChange) {
  const c = document.createElement("input");
  c.type = "checkbox";
  c.className = "dz-check";
  c.checked = checked;
  c.addEventListener("change", () => onChange(c.checked));
  return c;
}

function numberField(labelText, value, min, max, onChange) {
  const w = el("label", "dz-field");
  w.appendChild(el("span", "dz-field__label", labelText));
  w.appendChild(smallNumber(value, min, max, onChange));
  return w;
}

function smallNumber(value, min, max, onChange) {
  const i = document.createElement("input");
  i.type = "number";
  i.className = "dz-input dz-input--num";
  i.value = value;
  i.min = String(min);
  i.max = String(max);
  i.addEventListener("change", () => {
    let v = Number(i.value);
    if (!Number.isFinite(v)) v = min;
    v = Math.max(min, Math.min(max, v));
    i.value = String(v);
    onChange(v);
  });
  return i;
}

function labeled(labelText, node) {
  const w = el("label", "dz-field");
  w.appendChild(el("span", "dz-field__label", labelText));
  w.appendChild(node);
  return w;
}

boot();
