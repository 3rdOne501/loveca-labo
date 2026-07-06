/**
 * ラブライブ！ドンジャラ（麻雀準拠）— アプリ本体。
 * 3 画面: 対戦 / 設定 / 牌一覧。設定は localStorage に永続化。
 */

import { CONTENTS, HONOR_TILES } from "./contents.js";
import { loadTileCatalog } from "./tiles.js";
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
} from "./game.js";
import { ankanOptions, shouminkanOptions } from "./calls.js";
import { tileEl, showToast, showModal, el } from "./ui.js";
import * as online from "./online.js";

/** 現在の自席（オフラインは 0、オンラインは参加席）。 */
function mySeat() {
  return app.online ? app.online.seat : 0;
}
function isOnline() {
  return !!app.online;
}

const app = {
  catalog: null,
  config: null,
  game: null,
  view: "config", // 起動時は設定
  online: null, // { code, seat, isHost, status, room, unsubRoom, unsubActions, busy }
};

async function boot() {
  app.catalog = await loadTileCatalog();
  app.config = loadConfig(app.catalog);
  renderShell();
  renderView();
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
  host.innerHTML = "";
  if (app.view === "config") host.appendChild(renderConfigView());
  else if (app.view === "catalog") host.appendChild(renderCatalogView());
  else host.appendChild(renderPlayView());
}

function persist() {
  saveConfig(app.config);
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
  g.appendChild(grid);
  wrap.appendChild(g);

  // コンテンツ／キャラ
  for (const c of CONTENTS) {
    wrap.appendChild(renderContentCard(c));
  }

  // 字牌
  wrap.appendChild(renderHonorCard());

  // 役設定
  wrap.appendChild(renderYakuCard());

  return wrap;
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
    row.appendChild(tileEl(t, { size: "sm" }));
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
    row.appendChild(tileEl(t, { size: "sm" }));
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
      cell.appendChild(tileEl(t, { size: "md" }));
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
    cell.appendChild(tileEl(t, { size: "md" }));
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
        discardTile(game, pl.drawn);
        advanceTurn();
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

function meldRow(pl) {
  const wrap = el("div", "dz-melds");
  for (const m of pl.melds) {
    const mel = el("div", "dz-meld");
    m.tiles.forEach((k, i) => {
      const faceDown = m.kind === "ankan" && (i === 1 || i === 2);
      mel.appendChild(tileEl(app.catalog.byKey.get(k), { size: "sm", faceDown }));
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

function renderBoard() {
  const game = app.game;
  const seat = mySeat();
  const board = el("div", "dz-board");

  // 対戦相手（自席の次から時計回り）
  const opp = el("div", "dz-opponents");
  for (let off = 1; off < game.nPlayers; off++) {
    const p = (seat + off) % game.nPlayers;
    const pl = game.players[p];
    const box = el("div", "dz-opp" + (game.turn === p ? " is-turn" : ""));
    box.appendChild(el("div", "dz-opp__name", seatName(p) + (pl.riichi ? " 🀄立直" : "")));
    box.appendChild(el("div", "dz-opp__hand", `手牌 ${pl.hand.length}` + (pl.melds.length ? ` / 副露 ${pl.melds.length}` : "")));
    if (pl.melds.length) box.appendChild(meldRow(pl));
    const disc = el("div", "dz-opp__discards");
    pl.discards.slice(-10).forEach((k) => disc.appendChild(tileEl(app.catalog.byKey.get(k), { size: "sm" })));
    box.appendChild(disc);
    opp.appendChild(box);
  }
  board.appendChild(opp);

  // 中央情報
  const info = el("div", "dz-center");
  info.appendChild(el("span", "dz-center__wall", `残り山 ${game.wall.length}`));
  let turnLabel = game.turn === seat ? "あなたの手番" : `${seatName(game.turn)} の手番`;
  if (game.phase === "callWait") turnLabel = "鳴き待ち…";
  info.appendChild(el("span", "dz-center__turn", turnLabel));
  if (isOnline()) info.appendChild(el("span", "dz-center__code", `Room ${app.online.code}`));
  const reset = el("button", "dz-btn dz-btn--sm", isOnline() ? "退出" : "やめる");
  reset.addEventListener("click", () => {
    if (isOnline()) leaveOnline();
    else {
      app.game = null;
      renderView();
    }
  });
  info.appendChild(reset);
  board.appendChild(info);

  const me = game.players[seat];

  // 鳴き選択（callWait）— 自席に選択肢があれば
  if (game.phase === "callWait" && game.callOptionsBySeat && game.callOptionsBySeat[seat]) {
    board.appendChild(renderCallBar(game.callOptionsBySeat[seat]));
  }

  if (me.melds.length) {
    const mine = el("div", "dz-my-melds");
    mine.appendChild(el("span", "dz-label", "あなたの副露"));
    mine.appendChild(meldRow(me));
    board.appendChild(mine);
  }

  const myDisc = el("div", "dz-my-discards");
  myDisc.appendChild(el("span", "dz-label", "あなたの捨て牌" + (me.riichi ? "（立直中）" : "")));
  const dwrap = el("div", "dz-discard-wrap");
  me.discards.forEach((k) => dwrap.appendChild(tileEl(app.catalog.byKey.get(k), { size: "sm" })));
  myDisc.appendChild(dwrap);
  board.appendChild(myDisc);

  // 自分の手牌
  const isMyDiscard = game.turn === seat && game.phase === "discard" && game.controllers[seat] !== "cpu";
  const tenpaiKeep = isMyDiscard ? tenpaiKeepDiscards(game, me.hand) : new Set();
  const riichiLock = getRiichiPending();

  const handWrap = el("div", "dz-hand");
  const drawn = me.drawn;
  let drawnShown = false;
  const ordered = me.hand.filter((k) => {
    if (!drawnShown && k === drawn) {
      drawnShown = true;
      return false;
    }
    return true;
  });
  const makeCell = (k, isDrawn) => {
    const t = app.catalog.byKey.get(k);
    const clickable = isMyDiscard && (!riichiLock || tenpaiKeep.has(k));
    const cell = tileEl(t, { size: "lg", onClick: clickable ? (tile) => doDiscard(tile.key) : null });
    if (isDrawn) cell.classList.add("dz-tile--drawn");
    if (isMyDiscard && tenpaiKeep.has(k)) cell.classList.add("is-tenpai-keep");
    if (riichiLock && !tenpaiKeep.has(k)) cell.classList.add("is-locked");
    return cell;
  };
  for (const k of ordered) handWrap.appendChild(makeCell(k, false));
  if (drawn) handWrap.appendChild(makeCell(drawn, true));
  board.appendChild(handWrap);

  // アクション（自分の手番）
  const actions = el("div", "dz-actions");
  if (isMyDiscard) {
    const tsumo = checkTsumo(game);
    if (tsumo) {
      const tb = el("button", "dz-btn dz-btn--primary", `ツモ！（${tsumo.totalHan}翻）`);
      tb.addEventListener("click", doTsumo);
      actions.appendChild(tb);
    }
    if (!getRiichiPending() && canDeclareRiichi(game)) {
      const rb = el("button", "dz-btn", "リーチ");
      rb.addEventListener("click", () => {
        setRiichiPending(true);
        renderView();
        showToast("テンパイ維持できる牌（緑）を切ってください");
      });
      actions.appendChild(rb);
    }
    for (const k of ankanOptions(me.hand)) {
      const t = app.catalog.byKey.get(k);
      const kb = el("button", "dz-btn dz-btn--sm", `暗槓（${t.label}）`);
      kb.addEventListener("click", () => doAnkan(k));
      actions.appendChild(kb);
    }
    for (const k of shouminkanOptions(me.hand, me.melds)) {
      const t = app.catalog.byKey.get(k);
      const kb = el("button", "dz-btn dz-btn--sm", `加槓（${t.label}）`);
      kb.addEventListener("click", () => doShouminkan(k));
      actions.appendChild(kb);
    }
    if (tenpaiKeep.size && !getRiichiPending()) {
      actions.appendChild(el("span", "dz-hint", "緑の牌＝切るとテンパイ維持"));
    }
  }
  board.appendChild(actions);

  return board;
}

function renderCallBar(opts) {
  const bar = el("div", "dz-callbar");
  const t = app.catalog.byKey.get(opts.tile);
  bar.appendChild(el("span", "dz-label", "打牌に対して:"));
  bar.appendChild(tileEl(t, { size: "sm" }));
  if (opts.ron) {
    const b = el("button", "dz-btn dz-btn--primary", "ロン");
    b.addEventListener("click", () => doCall({ type: "ron" }));
    bar.appendChild(b);
  }
  if (opts.pon) {
    const b = el("button", "dz-btn", "ポン");
    b.addEventListener("click", () => doCall({ type: "pon" }));
    bar.appendChild(b);
  }
  if (opts.kan) {
    const b = el("button", "dz-btn", "カン");
    b.addEventListener("click", () => doCall({ type: "kan" }));
    bar.appendChild(b);
  }
  for (const o of opts.chi) {
    const labels = o.tiles.map((k) => app.catalog.byKey.get(k).label).join("+");
    const b = el("button", "dz-btn", `チー（${labels}）`);
    b.addEventListener("click", () => doCall({ type: "chi", tiles: o.tiles }));
    bar.appendChild(b);
  }
  const skip = el("button", "dz-btn dz-btn--sm", "スキップ");
  skip.addEventListener("click", () => doCall({ type: "skip" }));
  bar.appendChild(skip);
  return bar;
}

/* ---------------- アクション振り分け（オフライン=即適用 / オンライン=投函） ---------------- */

function doDiscard(tileKey) {
  if (isOnline()) {
    const riichi = getRiichiPending();
    setRiichiPending(false);
    online.postAction(app.online.code, { type: "discard", tile: tileKey, riichi });
  } else {
    if (app.game.turn !== 0 || app.game.phase !== "discard") return;
    discardTile(app.game, tileKey);
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
      discardTile(game, a.tile);
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

    const handRow = el("div", "dz-tile-row");
    (r.hand || game.players[r.winner].hand).forEach((k) => handRow.appendChild(tileEl(app.catalog.byKey.get(k), { size: "sm" })));
    body.appendChild(handRow);
    if (r.melds && r.melds.length) {
      const mrow = el("div", "dz-tile-row");
      mrow.appendChild(el("span", "dz-label", "副露:"));
      r.melds.forEach((m) => m.tiles.forEach((k) => mrow.appendChild(tileEl(app.catalog.byKey.get(k), { size: "sm" }))));
      body.appendChild(mrow);
    }

    const yl = el("ul", "dz-yaku-result");
    for (const y of r.eval.yaku) yl.appendChild(el("li", null, `${y.name} ${y.han}翻`));
    body.appendChild(yl);
    body.appendChild(el("p", "dz-result__total", `合計 ${r.eval.totalHan} 翻`));
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
  showModal(title, body, actions);
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
