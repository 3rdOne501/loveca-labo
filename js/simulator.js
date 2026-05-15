import {
  CARD_BACK_DRAG_DATA_URI,
  DEFAULT_ENERGY_CARD_NO,
  DEFAULT_ENERGY_IMG,
  DEFAULT_ENERGY_NAME,
  ENERGY_CHARGE_PER_TURN,
  HISTORY_MAX_STEPS,
  LIVE_TURN_HAND_SPREAD_MIN,
  LIVE_WINS,
  MAX_COPIES_PER_CARD,
  MAX_ENERGY_SIDE,
  OPENING_HAND_SIZE,
  STORAGE_DECK_PICK_SELECTED,
  STORAGE_DECK_ODDS_K,
  STORAGE_DECK_ODDS_TURN_STEPS,
  STORAGE_DECK_ODDS_2KASUMI,
  STORAGE_DECK_ODDS_13YOU,
  STORAGE_DECK_ODDS_HIDDEN_CATS,
  STORAGE_FIRST_PLAYER,
  STORAGE_SNAPSHOT_PREFIX,
  STORAGE_PLAY_ENERGY_CARD_NO,
  STORAGE_PLAY_RESUME,
  STORAGE_STREAM_MASK_STRENGTH,
  cardNoIsMiaTaylorPb1011,
  cardNoIsZhongLanzhuBp1012,
  T_ENERGY,
  T_LIVE,
  T_MEMBER,
} from "./config.js";
import {
  getAllCards,
  getCard,
  effectiveMainDeckCategory,
  bladeHeartSlotsOnCard,
  isHandDependentCost20Member,
  cardIsNoteLiveCatalog,
} from "./cards.js";
import { loadDeckLibrary, normalizeDeckMapCounts } from "./deckLibrary.js";
import {
  addBaseHeartToSlotAccum,
  addBladeHeartWeightsPerDisplaySlot,
  addNeedHeartToSlotAccum,
  bladeHeartDisplaySlotLabel,
  bladeHeartIsLiveAdditiveBladeHeart,
  cardHasBladeHeart,
  evaluateNeedHeartFulfillment,
  formatBladeHeartSlotBreakdown,
  formatHeartSlotAccumBreakdown,
  listAllNeedHeartDeficitsSequential,
  parseBladeHeartSlotFromKey,
  parseHeartColorSlotFromKey,
  sumBladeHeartWeightedValues,
  sumSlotAccumValues,
} from "./bladeHeart.js";
import { showToast } from "./ui.js";

/** 開幕マリガン／確率モデル用 sessionStorage キー（config 未同期のときの named import 失敗を避ける）。 */
const STORAGE_OPENING_MULLIGAN_K = "llocg_opening_mulligan_k";
const STORAGE_DECK_ODDS_OPENING_MULL_MODEL = "llocg_deck_odds_open_mull_model";

const LIVE_START_FOR_DRAW_YELL = "{{live_start.png|ライブ開始時}}";
const LIVE_SUCCESS_SPLIT_FOR_DRAW_YELL = "{{live_success.png|ライブ成功時}}";

function normalizeCatalogKeyForDrawYell(s) {
  return String(s == null ? "" : s)
    .replace(/\ufeff/g, "")
    .normalize("NFKC")
    .trim();
}

const DRAW_YELL_BLADE_HEART_CARD_NOS = new Set(
  ["PL!N-bp1-029-L", "PL!N-bp5-027-L", "PL!HS-bp1-022-L"].map(normalizeCatalogKeyForDrawYell),
);

/** ドローエール（BH）：エールでめくれると追加ドローが出るライブ。cards.js と独立（古いキャッシュ環境での import 不整合対策）。 */
function catalogLiveCardIsDrawYellBladeHeart(card) {
  if (!card || card.type !== T_LIVE) return false;
  if (!cardHasBladeHeart(card)) return false;
  const no = normalizeCatalogKeyForDrawYell(card.card_no || "");
  if (DRAW_YELL_BLADE_HEART_CARD_NOS.has(no)) return true;
  const ab = String(card.ability || "");
  if (!ab.includes(LIVE_START_FOR_DRAW_YELL)) return false;
  const tail = ab.split(LIVE_START_FOR_DRAW_YELL)[1];
  if (!tail) return false;
  const seg = tail.split(LIVE_SUCCESS_SPLIT_FOR_DRAW_YELL)[0];
  if (!seg) return false;
  if (/ドロー/.test(seg)) return true;
  if (/引く/.test(seg) && /山札(?:から)?/.test(seg)) return true;
  if (/見る/.test(seg) && /(?:山札|手札)/.test(seg) && /\d\s*枚/.test(seg)) return true;
  return false;
}

/** @type {{ t: string, act: string, meta?: object }[]} */
let replayLog = [];
let undoHistory = [];
let redoHistory = [];

let sortables = [];
/** @type {number} uid */
let uid = 1;
/** 側面エネに使うカード番号（空なら既定） */
let selectedEnergyCardNo = "";

/** メンバー追加分のブレード表示（favicon と同じアセット） */
const MEMBER_BONUS_BLADE_IMG = "https://loveca-solo.pages.dev/icon_blade.png";

/** 山札レイアウトは window resize + 描画後 rAF のみ（#zone-deck の ResizeObserver はスクロールバーと相性が悪く長時間ブロックしうる） */
let deckPileResizeObserver = null;
/** @type {number} */
let deckPileLayoutDebounce = 0;
/** @type {(() => void) | null} */
let deckPileWindowResizeHandler = null;
/** マウント中のレイアウト関数（observer / resize が最新のみを叩く） */
let deckPileScheduleLayoutRef = () => {};

export function teardownDeckPileLayoutWatchers() {
  if (deckPileResizeObserver) {
    try {
      deckPileResizeObserver.disconnect();
    } catch (_) {
      /* noop */
    }
    deckPileResizeObserver = null;
  }
  if (deckPileLayoutDebounce) {
    clearTimeout(deckPileLayoutDebounce);
    deckPileLayoutDebounce = 0;
  }
  if (deckPileWindowResizeHandler) {
    window.removeEventListener("resize", deckPileWindowResizeHandler);
    deckPileWindowResizeHandler = null;
  }
  deckPileScheduleLayoutRef = () => {};
}

/**
 * DOM 状態と履歴だけリセットしたい場合に mount と同じ並びへ戻す
 */
function bootstrapReplayStacks() {
  replayLog = [];
  undoHistory = [];
  redoHistory = [];
}

function nextId(prefix) {
  return "" + prefix + "-" + uid++;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function instanceFromCatalog(cardNo, idx) {
  const c = getCard(cardNo);
  if (!c)
    return {
      id: cardNo + "-" + idx + "-" + nextId("x"),
      card_no: cardNo,
      name: cardNo,
      img: "",
      type: T_MEMBER,
      isRotated: false,
      lcWait: false,
      lcActive: true,
    };
  var playType = effectiveMainDeckCategory(c);
  if (playType !== T_MEMBER && playType !== T_LIVE) playType = T_MEMBER;
  return {
    id: cardNo + "-" + idx + "-" + nextId("c"),
    card_no: c.card_no != null ? String(c.card_no) : String(cardNo),
    name: c.name,
    img: c.img,
    type: playType,
    isRotated: false,
    /** 盤面上のウェイト（負荷）表示用フラグ（非公式） */
    lcWait: false,
    /** アクティブ（オン＝縦／起き上がり想定）、オフ＝レスト相当の見た目（非公式） */
    lcActive: true,
  };
}

/**
 * デッキ map のキーをカタログ上の card_no に寄せ、同一カードの重複キーを足し上げる（表記ゆれで空山札になるのを防ぐ）
 * @param {Record<string, unknown> | null | undefined} deckMap
 * @returns {Record<string, number>}
 */
function collapseDeckMapCanon(deckMap) {
  const raw = normalizeDeckMapCounts(deckMap);
  const out = {};
  for (const [k, n] of Object.entries(raw)) {
    const c = getCard(k);
    const canon = c && c.card_no != null ? String(c.card_no) : String(k);
    const sum = (out[canon] || 0) + n;
    out[canon] = Math.min(MAX_COPIES_PER_CARD, sum);
  }
  return out;
}

export function buildMainDeckInstances(deckMap) {
  const out = [];
  const map = collapseDeckMapCanon(deckMap);
  for (const [no, n] of Object.entries(map)) {
    const c = getCard(no);
    if (c) {
      const cat = effectiveMainDeckCategory(c);
      if (cat !== T_MEMBER && cat !== T_LIVE) continue;
    }
    for (let i = 0; i < n; i++) out.push(instanceFromCatalog(no, i));
  }
  return shuffle(out);
}

/** 山札の上から count 枚を手札へ（デッキが足りなければできるだけ） */
function dealOpeningHand(deck, hand, count) {
  let n = typeof count === "number" && Number.isFinite(count) ? Math.floor(count) : 0;
  n = Math.min(Math.max(0, n), deck.length);
  for (let i = 0; i < n; i++) hand.push(deck.shift());
}

function energyInstance() {
  var cat = selectedEnergyCardNo ? getCard(selectedEnergyCardNo) : null;
  return {
    id: nextId("en"),
    card_no: cat && cat.card_no ? String(cat.card_no) : DEFAULT_ENERGY_CARD_NO,
    name: cat && cat.name ? String(cat.name) : DEFAULT_ENERGY_NAME,
    img: cat && cat.img ? String(cat.img) : DEFAULT_ENERGY_IMG,
    type: T_ENERGY,
    /** true＝ウェイト（横向き） */
    isRotated: false,
  };
}

function initialEnergyArea() {
  const a = [];
  for (let i = 0; i < 3; i++) {
    const e = energyInstance();
    e.isRotated = true;
    a.push(e);
  }
  return a;
}

function logReplay(act, meta) {
  replayLog.push({ t: new Date().toISOString(), act: act || "?", meta: meta || {} });
}

function trimUndo() {
  while (undoHistory.length > HISTORY_MAX_STEPS) undoHistory.shift();
}
function trimRedo() {
  while (redoHistory.length > HISTORY_MAX_STEPS) redoHistory.shift();
}

export function mountSimulator(root, deckMap, { onBackToDeck, deckRoleLabels, resumeFromStorage } = {}) {
  if (typeof Sortable === "undefined") {
    throw new Error(
      "Sortable が未定義です。index.html の CDN（sortablejs）が読み込めるか（オフライン・ブロッカー）を確認してください。",
    );
  }

  function sanitizeDeckRoleCardNos(arr) {
    if (!Array.isArray(arr)) return [];
    var o = [];
    var seen = new Set();
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i] != null ? String(arr[i]).trim() : "";
      if (!s || seen.has(s)) continue;
      seen.add(s);
      o.push(s);
    }
    return o;
  }

  var deckKeyCardNos = sanitizeDeckRoleCardNos(deckRoleLabels && deckRoleLabels.keyCardNos);
  var deckKeyCard2Nos = sanitizeDeckRoleCardNos(deckRoleLabels && deckRoleLabels.keyCard2Nos);
  var deckKeyCard3Nos = sanitizeDeckRoleCardNos(deckRoleLabels && deckRoleLabels.keyCard3Nos);
  var deckMiddleCardNos = sanitizeDeckRoleCardNos(deckRoleLabels && deckRoleLabels.middleCardNos);
  /** 盤面リセット・保存デッキ適用で参照する現在のメイン構成（Undo 用に snapshot にも載せる） */
  var activePlayDeckMap = normalizeDeckMapCounts(deckMap);

  /** nT開始時グリッド行の前提（sessionStorage と同期）。t1開始の連続めくり・ライブで出す枚数・次ターン開始ドロー */
  var deckOddsTimelineT1K = 1;
  var deckOddsTimelineLivePlay = 3;
  var deckOddsTimelineTurnDraw = 1;
  var deckOddsShowT4 = false;
  var deckOddsShowT5 = false;

  /** 山札残り一覧での多枚選択（次の1枚の確率用） */
  var deckPickSelectedNos = new Set();
  var deckPickListSig = "";
  /** 山札確率の「捲る枚数」手動値 1〜15（マリガンで戻す枚数／ライブ手札チェック時は自動優先） */
  var deckOddsKManual = 1;
  var DECK_ODDS_K_MANUAL_MAX = 15;
  /** 捲る枚数スライダー操作中は sync による value 上書きを抑止（タッチで端だけ選べる不具合対策） */
  var deckOddsKPointerActive = false;
  /** 実行済み初手マリガンの戻し枚数（このマウント内・sessionStorage と同期）。未実行時は null */
  var openingMulliganRememberedK = null;
  /** 「今 k」を開幕マリガンの記憶枚数で固定する（ライブ手札チェック連動時は自動優先） */
  var deckOddsOpeningMullBaselineOn = false;
  /** マリガン実行を一度でも押したら true。初手のみ「マリガン実行」を強調 */
  var openingMulliganExecuteUsed = false;
  /** ターン開始ドロー完了後にのみ true。ライブターン開始を押すと false（次のターン開始まで再び光らない） */
  var liveTurnStartGlowArmed = false;
  /** 指定カード検索のめくり枚数（手動） */
  var deckPickKManual = 1;
  /** 2恋（上5枚確認→1枚手札）を使った前提 */
  var deckTwoKoiEnabled = false;
  /** 2かすみ: 上3枚を見て送る。見た分は次ターン手札想定で「2T開始時」以降のグリッド行ベースに +3 */
  var deckTwoKasumiEnabled = false;
  /** 13曜: 上7枚見て3枚回収。見た7枚をいまの k に +7 して確率を計算 */
  var deck13YouEnabled = false;
  /** ライブ成功シミュレートの表示モード（既定: 盤面B） */
  var deckLiveSimMode = "board";
  /** 確率グリッド／要約で「しまっている」カテゴリ ID（key/key2/key3/mid/live/pick） */
  /** @type {Set<string>} */
  var deckOddsHiddenCats = new Set();
  /** カテゴリ表示順とラベル（取り出し UI / フィルタ判定の正準テーブル） */
  var DECK_ODDS_CAT_DESCRIPTORS = [
    { id: "key", label: "キー" },
    { id: "key2", label: "キ②" },
    { id: "key3", label: "キ③" },
    { id: "mid", label: "中間" },
    { id: "live", label: "ライブ" },
    { id: "pick", label: "指定" },
  ];

  function loadDeckOddsHiddenCats() {
    try {
      var raw = localStorage.getItem(STORAGE_DECK_ODDS_HIDDEN_CATS);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      var allow = new Set(DECK_ODDS_CAT_DESCRIPTORS.map(function (d) { return d.id; }));
      arr.forEach(function (id) {
        if (typeof id === "string" && allow.has(id)) deckOddsHiddenCats.add(id);
      });
    } catch (_) {
      /* noop */
    }
  }

  function persistDeckOddsHiddenCats() {
    try {
      localStorage.setItem(
        STORAGE_DECK_ODDS_HIDDEN_CATS,
        JSON.stringify([...deckOddsHiddenCats]),
      );
    } catch (_) {
      /* noop */
    }
  }

  function isDeckOddsCatVisible(id) {
    return !deckOddsHiddenCats.has(id);
  }
  loadDeckOddsHiddenCats();

  /**
   * 「表示項目」格納 UI のチェック状態を再構築する。
   * @param {string[] | null | undefined} availableIds モデル上で算出可能な ID（残りはチェック不可）
   */
  function refreshDeckOddsCatStashes(availableIds) {
    var availSet = availableIds ? new Set(availableIds) : null;
    document.querySelectorAll("[data-deck-odds-stash]").forEach(function (det) {
      var list = det.querySelector("[data-stash-list]");
      if (!list) return;
      var html = "";
      DECK_ODDS_CAT_DESCRIPTORS.forEach(function (d) {
        var hidden = deckOddsHiddenCats.has(d.id);
        var available = !availSet || availSet.has(d.id);
        html +=
          '<li class="deck-odds-cat-stash__item' +
          (available ? "" : " is-disabled") +
          '"><label class="chk"><input type="checkbox" data-stash-cat="' +
          escapeHtmlPlain(d.id) +
          '"' +
          (hidden ? "" : " checked") +
          (available ? "" : " disabled") +
          ' /> ' +
          escapeHtmlPlain(d.label) +
          "</label></li>";
      });
      list.innerHTML = html;
      var sumLabel = det.querySelector(".deck-odds-cat-stash__label");
      if (sumLabel) sumLabel.textContent = "表示項目";
    });
  }

  function wireDeckOddsCatStashOnce() {
    document.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!(t instanceof HTMLInputElement) || !t.dataset || !t.dataset.stashCat) return;
      var id = t.dataset.stashCat;
      if (!DECK_ODDS_CAT_DESCRIPTORS.some(function (d) { return d.id === id; })) return;
      if (t.checked) deckOddsHiddenCats.delete(id);
      else deckOddsHiddenCats.add(id);
      persistDeckOddsHiddenCats();
      syncLeftDeckOddsPanel();
    });
  }
  wireDeckOddsCatStashOnce();

  function clampDeckOddsTimelineInt(v, lo, hi, fallback) {
    var n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, Math.floor(n)));
  }

  function loadDeckOddsTurnSteps() {
    try {
      var raw = sessionStorage.getItem(STORAGE_DECK_ODDS_TURN_STEPS);
      if (!raw) {
        deckOddsTimelineT1K = 1;
        deckOddsTimelineLivePlay = 3;
        deckOddsTimelineTurnDraw = 1;
        deckOddsShowT4 = false;
        deckOddsShowT5 = false;
        return;
      }
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        deckOddsShowT4 = !!o.showT4;
        deckOddsShowT5 = !!o.showT5;
        if (deckOddsShowT5 && !deckOddsShowT4) deckOddsShowT4 = true;
        if (
          o.t1StartK != null ||
          o.livePlayPerTurn != null ||
          o.turnDrawAfterLive != null
        ) {
          deckOddsTimelineT1K = clampDeckOddsTimelineInt(o.t1StartK, 0, 15, 1);
          deckOddsTimelineLivePlay = clampDeckOddsTimelineInt(o.livePlayPerTurn, 0, 15, 3);
          deckOddsTimelineTurnDraw = clampDeckOddsTimelineInt(o.turnDrawAfterLive, 0, 6, 1);
        } else {
          deckOddsTimelineT1K = 1;
          deckOddsTimelineLivePlay = 3;
          deckOddsTimelineTurnDraw = 1;
        }
        return;
      }
    } catch (_) {
      /* noop */
    }
    deckOddsTimelineT1K = 1;
    deckOddsTimelineLivePlay = 3;
    deckOddsTimelineTurnDraw = 1;
    deckOddsShowT4 = false;
    deckOddsShowT5 = false;
  }

  function persistDeckOddsTurnSteps() {
    try {
      sessionStorage.setItem(
        STORAGE_DECK_ODDS_TURN_STEPS,
        JSON.stringify({
          showT4: deckOddsShowT4,
          showT5: deckOddsShowT5,
          t1StartK: deckOddsTimelineT1K,
          livePlayPerTurn: deckOddsTimelineLivePlay,
          turnDrawAfterLive: deckOddsTimelineTurnDraw,
        }),
      );
    } catch (_) {
      /* noop */
    }
  }

  function syncDeckOddsTurnStepDom() {
    var elT1 = document.getElementById("deck-odds-model-t1-k");
    var elLp = document.getElementById("deck-odds-model-live-play");
    var elTd = document.getElementById("deck-odds-model-turn-draw");
    if (elT1 && document.activeElement !== elT1) elT1.value = String(deckOddsTimelineT1K);
    if (elLp && document.activeElement !== elLp) elLp.value = String(deckOddsTimelineLivePlay);
    if (elTd && document.activeElement !== elTd) elTd.value = String(deckOddsTimelineTurnDraw);
    var b4 = document.getElementById("btn-deck-odds-show-t4");
    var b5 = document.getElementById("btn-deck-odds-show-t5");
    if (b4) {
      b4.setAttribute("aria-pressed", deckOddsShowT4 ? "true" : "false");
      b4.textContent = deckOddsShowT4 ? "4T開始時を隠す" : "4T開始時を表示";
    }
    if (b5) {
      b5.setAttribute("aria-pressed", deckOddsShowT5 ? "true" : "false");
      b5.textContent = deckOddsShowT5 ? "5T開始時を隠す" : "5T開始時を表示";
    }
  }

  function wireDeckOddsTurnStepsOnce() {
    if (root.dataset.deckOddsTurnWired === "1") return;
    root.dataset.deckOddsTurnWired = "1";
    document.addEventListener(
      "change",
      function (ev) {
        var t = ev.target;
        if (!(t instanceof HTMLInputElement) || !t.id) return;
        if (t.id === "deck-odds-model-t1-k") {
          deckOddsTimelineT1K = clampDeckOddsTimelineInt(t.value, 0, 15, deckOddsTimelineT1K);
          t.value = String(deckOddsTimelineT1K);
        } else if (t.id === "deck-odds-model-live-play") {
          deckOddsTimelineLivePlay = clampDeckOddsTimelineInt(t.value, 0, 15, deckOddsTimelineLivePlay);
          t.value = String(deckOddsTimelineLivePlay);
        } else if (t.id === "deck-odds-model-turn-draw") {
          deckOddsTimelineTurnDraw = clampDeckOddsTimelineInt(t.value, 0, 6, deckOddsTimelineTurnDraw);
          t.value = String(deckOddsTimelineTurnDraw);
        } else {
          return;
        }
        persistDeckOddsTurnSteps();
        syncLeftDeckOddsPanel();
      },
      true,
    );
    document.addEventListener(
      "click",
      function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest("#btn-deck-odds-show-t4, #btn-deck-odds-show-t5") : null;
        if (!btn) return;
        if (btn.id === "btn-deck-odds-show-t4") {
          deckOddsShowT4 = !deckOddsShowT4;
          if (!deckOddsShowT4) deckOddsShowT5 = false;
        } else if (btn.id === "btn-deck-odds-show-t5") {
          if (!deckOddsShowT5) {
            deckOddsShowT5 = true;
            deckOddsShowT4 = true;
          } else {
            deckOddsShowT5 = false;
          }
        } else {
          return;
        }
        persistDeckOddsTurnSteps();
        syncDeckOddsTurnStepDom();
        syncLeftDeckOddsPanel();
      },
      true,
    );
  }

  /** レンダーごとの山札ライブ成功シミュ（重い）を遅延実行するためのハンドル */
  var deckLiveSimIdleHandle = null;

  function cancelDeckLiveSimDeferred() {
    if (deckLiveSimIdleHandle == null) return;
    if (typeof cancelIdleCallback === "function") {
      cancelIdleCallback(deckLiveSimIdleHandle);
    } else {
      clearTimeout(deckLiveSimIdleHandle);
    }
    deckLiveSimIdleHandle = null;
  }

  function runDeckLiveSimHeavy() {
    deckLiveSimIdleHandle = null;
    if (!$("deck-live-sim-summary")) return;
    var disp2 = $("deck-flip-k-display");
    var sumEl2 = $("deck-live-sim-summary");
    var stEl2 = $("deck-live-sim-stats");
    var bdBody = $("deck-live-sim-breakdown-body");
    if (!sumEl2) return;
    var n2 = state.deck.length;
    var w2 = state.waitingRoom.length;
    var bladeK2 = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var resR2 = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    var kRem2 = deckLiveSimMode === "whole" ? n2 + w2 : Math.max(0, bladeK2 - resR2);
    if (disp2) disp2.textContent = String(kRem2);
    var bNote2 = $("deck-flip-blade-note");
    if (bNote2) {
      if (deckLiveSimMode === "whole") {
        bNote2.textContent = "全体モード: 山札 " + n2 + " + 控え室 " + w2 + " の全カードを参照して成否を判定します。";
      } else {
        bNote2.textContent =
          "盤面Bモード: ブレード計 " + bladeK2 + " 枚 · 解決 " + resR2 + " 枚 · 残り山札 " + n2 + " 枚（R = B で成否確定）";
      }
    }

    var bundleForBreakdown = evaluateLiveMechanicalFulfillmentBundle();
    var sim = computeDeckDrawLiveSuccessSimulation(deckLiveSimMode);
    sumEl2.classList.toggle("deck-live-sim-summary--verdict", sim.kind === "verdict");
    if (sim.kind === "verdict") {
      sumEl2.innerHTML = deckLiveSimVerdictHtml(sim);
    } else {
      setOddsRichText(sumEl2, deckLiveSimSuccessLine(sim), { heroLiveSim: true });
    }
    syncDeckLiveSimSummaryPctEmphasisClass(sumEl2);
    sumEl2.classList.remove("is-ok", "is-warn", "is-muted", "is-fail");
    if (sim.kind === "warn" || sim.kind === "skip") {
      sumEl2.classList.add("is-muted");
    }
    /* 確率に応じた連続グラデーション色付け（0% 茶 → 25% 暗青 → 40% 真っ赤 → 50% オレンジ → 70% 黄 → 85% 緑 → 90〜100% 薄ピンク発光） */
    applyDeckLiveSimProbColor(sumEl2, sim);

    if (bdBody) {
      bdBody.textContent = buildLiveSimBreakdownBody(bundleForBreakdown, sim);
    }

    if (stEl2) {
      stEl2.hidden = true;
      stEl2.textContent = "";
    }
  }

  function deckPickNoSort(a, b) {
    var na = Number(a);
    var nb = Number(b);
    if (String(na) === a && String(nb) === b && Number.isFinite(na) && Number.isFinite(nb)) {
      return na - nb;
    }
    return String(a).localeCompare(String(b), "ja");
  }

  function getDeckComposition() {
    var counts = new Map();
    for (var i = 0; i < state.deck.length; i++) {
      var inst = state.deck[i];
      var no = inst && inst.card_no != null ? String(inst.card_no) : "";
      if (!no) continue;
      counts.set(no, (counts.get(no) || 0) + 1);
    }
    return counts;
  }

  function formatPctFromRate(rate100) {
    if (!Number.isFinite(rate100)) return "0";
    var s = rate100.toFixed(1);
    if (s.indexOf(".0") === s.length - 2) s = s.slice(0, -2);
    return s;
  }

  function escapeHtmlPlain(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var LIVE_STATS_HEART_PREFIX_SLOT = {
    桃: 1,
    赤: 2,
    黄: 3,
    緑: 4,
    青: 5,
    紫: 6,
    ALL: 7,
    その他キー: 99,
    その他: 99,
    任意: 0,
  };

  function liveStatsHeartPrefixSlot(firstToken) {
    if (!firstToken) return null;
    if (firstToken.indexOf("その他キー") === 0) return 99;
    if (firstToken.indexOf("その他") === 0) return 99;
    var keys = Object.keys(LIVE_STATS_HEART_PREFIX_SLOT);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === "その他キー" || k === "その他") continue;
      if (firstToken.indexOf(k) === 0) return LIVE_STATS_HEART_PREFIX_SLOT[k];
    }
    return null;
  }

  function liveStatsHeartishLineToHtml(plain) {
    if (plain == null || plain === "") return escapeHtmlPlain("—");
    if (String(plain) === "—") return escapeHtmlPlain("—");
    var s = String(plain);
    var out = "";
    var slashParts = s.split(/\s*／\s*/);
    for (var pi = 0; pi < slashParts.length; pi++) {
      if (pi > 0) out += '<span class="live-stats-heart-sep">／</span>';
      var dotParts = slashParts[pi].split(/\s*(?:·|・)\s*/);
      for (var di = 0; di < dotParts.length; di++) {
        if (di > 0) out += '<span class="live-stats-heart-sep"> · </span>';
        var trimmed = dotParts[di].trim();
        if (!trimmed) continue;
        var toks = trimmed.split(/\s+/);
        var slot = liveStatsHeartPrefixSlot(toks[0] || "");
        var fullEsc = escapeHtmlPlain(trimmed);
        if (slot != null) {
          var sc = slot === 99 ? "99" : String(slot);
          out += '<span class="live-stats-heart-seg live-stats-heart-seg--s' + sc + '">' + fullEsc + "</span>";
        } else {
          out += '<span class="live-stats-heart-seg live-stats-heart-seg--plain">' + fullEsc + "</span>";
        }
      }
    }
    return out || escapeHtmlPlain("—");
  }

  /** 確率の % 表示を強調（テキストはエスケープしてから置換）。opts.heroLiveSim でライブ成功シミュ行を特大表示。 */
  function htmlWithEmphasizedPercents(text, opts) {
    opts = opts || {};
    var hero = !!opts.heroLiveSim;
    var clsHero = hero ? "deck-odds-pct deck-odds-pct--hero" : "deck-odds-pct";
    var s = escapeHtmlPlain(text);
    var re = /(\d+(?:\.\d+)?)([%％])/g;
    var parts = [];
    var last = 0;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) {
        var chunk = s.slice(last, m.index);
        if (chunk) parts.push('<span class="deck-live-sim-line-caption">' + chunk + "</span>");
      }
      parts.push('<strong class="' + clsHero + '">' + m[1] + m[2] + "</strong>");
      last = re.lastIndex;
    }
    if (!parts.length) {
      return '<span class="deck-live-sim-line-caption">' + s + "</span>";
    }
    if (last < s.length) {
      var tail = s.slice(last);
      if (tail) parts.push('<span class="deck-live-sim-line-caption">' + tail + "</span>");
    }
    return parts.join("");
  }

  function setOddsRichText(el, plainText, opts) {
    if (!el) return;
    el.innerHTML = htmlWithEmphasizedPercents(plainText, opts || {});
  }

  /** 左上「ライブ成功確率（山札シミュ）」要約。％ヒーロー無しで前文マーク無しのときだけベースを上げる */
  function syncDeckLiveSimSummaryPctEmphasisClass(el) {
    if (!el || !el.querySelector) return;
    var hasHero = el.querySelector(".deck-odds-pct--hero");
    var hasVerdictHit = el.querySelector(".deck-live-sim-line-hit");
    var hasCaption = el.querySelector(".deck-live-sim-line-caption");
    el.classList.toggle(
      "deck-live-sim-summary--no-pct-emphasis",
      !hasHero && !hasVerdictHit && !hasCaption,
    );
  }

  /** ライブ成功確率の文字色を 0〜100% の連続グラデーションで決定。
   *  色見本:
   *    0%   茶
   *    25%  暗い青
   *    40%  真っ赤
   *    50%  オレンジ
   *    70%  黄
   *    85%  緑
   *    90%  薄ピンク（淡い発光）
   *    100% 薄ピンク（強い発光）
   */
  function computeDeckLiveSimProbColorStyle(pct) {
    var stops = [
      [0,   [122, 70, 38]],   // 茶
      [25,  [40, 60, 130]],   // 暗い青
      [40,  [240, 36, 36]],   // 真っ赤
      [50,  [255, 138, 31]],  // オレンジ
      [70,  [255, 210, 63]],  // 黄（成功味）
      [85,  [120, 220, 130]], // 緑（成功）
      [90,  [255, 196, 218]], // 薄ピンク（発光開始）
      [100, [255, 218, 232]], // 薄ピンク（強発光）
    ];
    function lerp(a, b, t) { return a + (b - a) * t; }
    function lerpRgb(c1, c2, t) {
      return [
        Math.max(0, Math.min(255, Math.round(lerp(c1[0], c2[0], t)))),
        Math.max(0, Math.min(255, Math.round(lerp(c1[1], c2[1], t)))),
        Math.max(0, Math.min(255, Math.round(lerp(c1[2], c2[2], t)))),
      ];
    }
    var p = Math.max(0, Math.min(100, Number(pct)));
    if (!Number.isFinite(p)) p = 0;
    var rgb = stops[0][1];
    for (var i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        var lo = stops[i - 1];
        var hi = stops[i];
        var span = Math.max(0.0001, hi[0] - lo[0]);
        var t = (p - lo[0]) / span;
        rgb = lerpRgb(lo[1], hi[1], t);
        break;
      }
      rgb = stops[i][1];
    }
    /* 発光は 90% から立ち上げ、100% で最大。 */
    var glow = 0;
    if (p >= 90) {
      var u = Math.min(1, (p - 90) / 10);
      glow = 0.35 + 0.65 * u;
    }
    return {
      color: "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")",
      glow: glow,
    };
  }

  /** 上記関数を sim 結果に応じて要素へ適用（kind に応じて 0% 扱い / 100% 扱い / 非適用を切替）。 */
  function applyDeckLiveSimProbColor(el, sim) {
    if (!el) return;
    if (sim && sim.kind === "verdict") {
      el.classList.remove("has-prob-color");
      el.style.removeProperty("--prob-color");
      el.style.removeProperty("--prob-glow");
      return;
    }
    var pct = null;
    if (sim) {
      if (sim.kind === "sim" && sim.pct != null) pct = Number(sim.pct);
      else if (sim.kind === "ok" || (sim.kind === "verdict" && sim.ok)) pct = 100;
      else if (
        sim.kind === "verdict" ||
        sim.kind === "resolution_over_blade" ||
        sim.kind === "remFlip_over_deck"
      ) {
        pct = 0;
      }
    }
    if (pct == null || !Number.isFinite(pct)) {
      el.classList.remove("has-prob-color");
      el.style.removeProperty("--prob-color");
      el.style.removeProperty("--prob-glow");
      return;
    }
    var s = computeDeckLiveSimProbColorStyle(pct);
    el.style.setProperty("--prob-color", s.color);
    el.style.setProperty("--prob-glow", String(s.glow));
    el.classList.add("has-prob-color");
  }

  /** 確率（％）→ グリッドセル用クラス（10％ごとに色相／75％以上は発光） */
  function deckOddsCellTierClass(rate) {
    if (!Number.isFinite(rate)) return "";
    var b = Math.max(0, Math.min(9, Math.floor(rate / 10)));
    var cls = "deck-odds-cell--b" + b;
    if (rate >= 75) cls += " deck-odds-cell--hot-glow";
    return cls;
  }

  /**
   * 山札 n 枚のうち対象が fc 枚あるとき、ランダムな並びで上から続けて k 枚に
   * 対象が1枚以上含まれる確率（％・非復元抽出）
   */
  function probAtLeastOneInNextK(n, k, favorableInDeck) {
    if (n <= 0 || k <= 0 || favorableInDeck <= 0) return 0;
    if (k > n) k = n;
    var fc = Math.min(favorableInDeck, n);
    if (k > n - fc) return 100;
    var pNone = 1;
    for (var i = 0; i < k; i++) {
      pNone *= (n - fc - i) / (n - i);
    }
    return 100 * (1 - pNone);
  }

  /** ライブターンで手札チェックした枚数（0 可）。ライブターン外は 0。 */
  function liveTurnHandCheckCount() {
    if (state.liveTurnPickMode !== true) return 0;
    return Array.isArray(state.liveTurnSelectedIds) ? state.liveTurnSelectedIds.length : 0;
  }

  /**
   * キー／中間・ライブ・指定カードの確率に使う「続けて引く枚数」。
   * マリガンで戻す枚数・ライブ手札チェックありのときはそれに同期。それ以外は手動 k。
   */
  function computeEffectiveDeckOddsK() {
    var n = state.deck.length;
    if (n <= 0) return 0;
    if (state.awaitingTurnStart) {
      var m = Array.isArray(state.mulliganSelectedIds) ? state.mulliganSelectedIds.length : 0;
      if (m > 0) return Math.min(m, n);
      return 0;
    }
    if (state.liveTurnPickMode === true) {
      var c = liveTurnHandCheckCount();
      if (c > 0) return Math.min(c, n);
      return 0;
    }
    var manual = deckOddsKManual;
    if (!Number.isFinite(manual)) manual = 0;
    manual = Math.max(0, Math.min(DECK_ODDS_K_MANUAL_MAX, Math.floor(manual)));
    return Math.min(manual, n);
  }

  /** 2恋（+5・手札に加える前提）・13曜（+7）など、山札上から見る枚数を k に足す（山札枚数でクランプ） */
  function applyDeckOddsPeekBonuses(kDraw, n) {
    var k = Math.max(0, Number(kDraw) || 0);
    var deckN = Math.max(0, Number(n) || 0);
    var bonus = 0;
    if (deckTwoKoiEnabled) bonus += 5;
    if (deck13YouEnabled) bonus += 7;
    return Math.min(deckN, k + bonus);
  }

  function syncDeckOddsKInput() {
    var inp = $("deck-odds-k");
    var inpMirror = $("deck-odds-k-mirror");
    if (!inp && !inpMirror) return;
    var n = state.deck.length;
    var m = Array.isArray(state.mulliganSelectedIds) ? state.mulliganSelectedIds.length : 0;
    var c = liveTurnHandCheckCount();
    var eff = computeEffectiveDeckOddsK();
    var autoLock = (state.awaitingTurnStart && m > 0) || (state.liveTurnPickMode === true && c > 0);
    var ro = n <= 0 ? true : !!autoLock;
    function applyOne(el) {
      if (!el) return;
        if (el.type === "range") {
        el.disabled = ro;
        el.setAttribute("min", "0");
        el.setAttribute("max", String(DECK_ODDS_K_MANUAL_MAX));
        if (document.activeElement !== el && !deckOddsKPointerActive) {
          if (!ro) {
            var mk = Math.max(0, Math.min(DECK_ODDS_K_MANUAL_MAX, Math.floor(Number(deckOddsKManual) || 0)));
            el.value = String(mk);
          } else {
            var show = Math.min(DECK_ODDS_K_MANUAL_MAX, Math.max(0, eff));
            el.value = String(show);
          }
        }
        el.setAttribute("aria-valuenow", el.value);
      }
    }
    applyOne(inp);
    applyOne(inpMirror);
    var numInp = $("deck-odds-k-num");
    if (numInp) {
      numInp.disabled = !!(ro || n <= 0);
      numInp.setAttribute("min", "0");
      numInp.setAttribute("max", String(DECK_ODDS_K_MANUAL_MAX));
      if (document.activeElement !== numInp && !deckOddsKPointerActive) {
        if (n <= 0) numInp.value = "0";
        else if (ro) numInp.value = String(Math.min(DECK_ODDS_K_MANUAL_MAX, Math.max(0, eff)));
        else numInp.value = String(Math.max(0, Math.min(DECK_ODDS_K_MANUAL_MAX, Math.floor(Number(deckOddsKManual) || 0))));
      }
    }
    ;["deck-odds-k-minus", "deck-odds-k-plus"].forEach(function (bid) {
      var b = $(bid);
      if (!b) return;
      b.disabled = !!(ro || n <= 0);
    });
    function hintText() {
      if (state.awaitingTurnStart) {
        return m > 0
          ? "マリガン: 戻し " + m + " 枚＝このあと引く枚数に連動（編集不可）"
          : "マリガン: 戻す枚を選ぶと連動（未選択は k=0 の参考）";
      }
      if (state.liveTurnPickMode === true) {
        return c > 0
          ? "ライブ: 手札チェック " + c + " 枚に連動（編集不可）"
          : "ライブ: チェックで連動（0 枚のあいだ k=0 参考）";
      }
      return "通常: スライダーで 0〜15（0＝この時点ではめくらない想定）。マリガン／ライブ選択中は上記のとおり自動";
    }
    var ht = hintText();
    var h = $("deck-odds-k-zone-hint");
    if (h) h.textContent = ht;
  }

  function loadDeckPickSelection() {
    try {
      var raw = sessionStorage.getItem(STORAGE_DECK_PICK_SELECTED);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (Array.isArray(p)) {
        deckPickSelectedNos = new Set(p.map(String));
      }
    } catch (_) {
      /* noop */
    }
  }

  function loadDeckOdds2Kasumi() {
    try {
      deckTwoKasumiEnabled = sessionStorage.getItem(STORAGE_DECK_ODDS_2KASUMI) === "1";
    } catch (_) {
      deckTwoKasumiEnabled = false;
    }
  }

  function persistDeckOdds2Kasumi() {
    try {
      sessionStorage.setItem(STORAGE_DECK_ODDS_2KASUMI, deckTwoKasumiEnabled ? "1" : "0");
    } catch (_) {
      /* noop */
    }
  }

  function loadDeckOdds13You() {
    try {
      deck13YouEnabled = sessionStorage.getItem(STORAGE_DECK_ODDS_13YOU) === "1";
    } catch (_) {
      deck13YouEnabled = false;
    }
  }

  function persistDeckOdds13You() {
    try {
      sessionStorage.setItem(STORAGE_DECK_ODDS_13YOU, deck13YouEnabled ? "1" : "0");
    } catch (_) {
      /* noop */
    }
  }

  function syncDeckOddsSkillChks() {
    var k2 = $("chk-deck-2koi");
    var k2s = $("chk-deck-2kasumi");
    var k13 = $("chk-deck-13you");
    if (k2 && document.activeElement !== k2) k2.checked = deckTwoKoiEnabled;
    if (k2s && document.activeElement !== k2s) k2s.checked = deckTwoKasumiEnabled;
    if (k13 && document.activeElement !== k13) k13.checked = deck13YouEnabled;
  }

  function syncDeckOddsOpeningMullBaselineBtn() {
    var btn = $("btn-deck-odds-opening-mull-baseline");
    if (!btn) return;
    var hasMem = openingMulliganRememberedK != null;
    btn.disabled = !hasMem;
    btn.setAttribute("aria-pressed", deckOddsOpeningMullBaselineOn ? "true" : "false");
    btn.title = hasMem
      ? deckOddsOpeningMullBaselineOn
        ? "ON: 「今」は開幕マリガン戻し " +
          openingMulliganRememberedK +
          " 枚をベースに 2恋／13曜 を加算。各「nT開始時」行はターン別モデルに加えて同じ枚数を累計 k に足します（ライブ手札チェック連動中は「今」だけ連動優先）。"
        : "OFF: 「今」は手動 k・マリガン選択など通常どおり。"
      : "マリガンで「実行」するか、マリガンなしで「ターン開始」すると有効になります（戻し0枚として記憶）。";
    btn.textContent = hasMem
      ? deckOddsOpeningMullBaselineOn
        ? "開幕マリガン " + openingMulliganRememberedK + " 枚ベース・ON"
        : "開幕マリガン " + openingMulliganRememberedK + " 枚ベース・OFF"
      : "開幕マリガン込み（マリガン確定後）";
  }

  function loadDeckOddsKManual() {
    try {
      var sv = sessionStorage.getItem(STORAGE_DECK_ODDS_K);
      if (sv != null && sv !== "") {
        var x = Number(sv);
        if (Number.isFinite(x)) {
          deckOddsKManual = Math.min(DECK_ODDS_K_MANUAL_MAX, Math.max(0, Math.floor(x)));
        }
      }
    } catch (_) {
      /* noop */
    }
  }

  function persistDeckOddsKManual() {
    try {
      sessionStorage.setItem(STORAGE_DECK_ODDS_K, String(deckOddsKManual));
    } catch (_) {
      /* noop */
    }
  }

  function persistOpeningMulliganRememberedK(k) {
    var kk = Math.max(0, Math.min(OPENING_HAND_SIZE, Math.floor(Number(k)) || 0));
    openingMulliganRememberedK = kk;
    try {
      sessionStorage.setItem(STORAGE_OPENING_MULLIGAN_K, String(kk));
    } catch (_) {
      /* noop */
    }
  }

  function loadDeckOddsOpeningMullBaseline() {
    openingMulliganRememberedK = null;
    deckOddsOpeningMullBaselineOn = false;
    try {
      var raw = sessionStorage.getItem(STORAGE_OPENING_MULLIGAN_K);
      if (raw != null && raw !== "") {
        var nk = parseInt(raw, 10);
        if (Number.isFinite(nk) && nk >= 0 && nk <= OPENING_HAND_SIZE) openingMulliganRememberedK = nk;
      }
      deckOddsOpeningMullBaselineOn =
        sessionStorage.getItem(STORAGE_DECK_ODDS_OPENING_MULL_MODEL) === "1";
    } catch (_) {
      /* noop */
    }
  }

  function persistDeckOddsOpeningMullBaseline() {
    try {
      sessionStorage.setItem(STORAGE_DECK_ODDS_OPENING_MULL_MODEL, deckOddsOpeningMullBaselineOn ? "1" : "0");
    } catch (_) {
      /* noop */
    }
  }

  function persistDeckPickSelection() {
    try {
      sessionStorage.setItem(STORAGE_DECK_PICK_SELECTED, JSON.stringify([...deckPickSelectedNos]));
    } catch (_) {
      /* noop */
    }
  }

  function updateDeckPickOddsText() {
    var oddsEl = $("deck-pick-odds");
    var pickInp = $("deck-pick-k");
    if (!oddsEl) return;
    var n = state.deck.length;
    if (pickInp) {
      pickInp.setAttribute("max", String(Math.max(1, Math.min(99, n || 1))));
      if (document.activeElement !== pickInp) {
        pickInp.value = String(Math.max(1, Math.min(deckPickKManual, n || 1)));
      }
    }
    if (n <= 0) {
      oddsEl.textContent = "山札がありません。";
      return;
    }
    var kRaw = Math.max(1, Math.floor(Number(deckPickKManual) || 1));
    kRaw = Math.min(kRaw, n);
    var kDraw = applyDeckOddsPeekBonuses(kRaw, n);
    var counts = getDeckComposition();
    var sum = 0;
    deckPickSelectedNos.forEach(function (no) {
      sum += counts.get(no) || 0;
    });
    if (deckPickSelectedNos.size === 0) {
      oddsEl.textContent = "カードにチェックを入れると、指定した枚数で当たる確率を表示します。";
      return;
    }
    if (sum <= 0) {
      oddsEl.textContent =
        "選択した番号は山札に残っていません（山札が変わると一覧が更新されます）。";
      return;
    }

    var rate = probAtLeastOneInNextK(n, kDraw, sum);
    oddsEl.innerHTML = htmlWithEmphasizedPercents(
      "続けて " +
        kRaw +
        " 枚（見える枚数 " +
        kDraw +
        "）・対象が1枚以上: " +
        formatPctFromRate(rate) +
        "%（対象 " +
        sum +
        "／山札 " +
        n +
        "）",
    );
  }

  function clearDeckPickSelection() {
    deckPickSelectedNos.clear();
    persistDeckPickSelection();
    var listEl = $("deck-pick-list");
    if (listEl) {
      listEl.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
        cb.checked = false;
      });
    }
    syncLeftDeckOddsPanel();
  }

  function syncDeckPickPanel() {
    var listEl = $("deck-pick-list");
    if (!listEl) return;

    var counts = getDeckComposition();
    var valid = new Set(counts.keys());
    var pruned = false;
    [...deckPickSelectedNos].forEach(function (no) {
      if (!valid.has(no)) {
        deckPickSelectedNos.delete(no);
        pruned = true;
      }
    });
    if (pruned) persistDeckPickSelection();

    var keys = [...counts.keys()].sort(deckPickNoSort);
    var sig = keys
      .map(function (k) {
        return k + ":" + counts.get(k);
      })
      .join("|");

    if (sig !== deckPickListSig) {
      deckPickListSig = sig;
      listEl.innerHTML = "";
      var sampleByNo = new Map();
      for (var di = 0; di < state.deck.length; di++) {
        var dinst = state.deck[di];
        var dno = dinst && dinst.card_no != null ? String(dinst.card_no) : "";
        if (dno && !sampleByNo.has(dno)) sampleByNo.set(dno, dinst);
      }
      keys.forEach(function (cardNo) {
        var row = document.createElement("label");
        row.className = "deck-pick-row";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = deckPickSelectedNos.has(cardNo);
        cb.addEventListener("change", function () {
          if (cb.checked) deckPickSelectedNos.add(cardNo);
          else deckPickSelectedNos.delete(cardNo);
          persistDeckPickSelection();
          syncLeftDeckOddsPanel();
        });
        var thumb = document.createElement("img");
        thumb.className = "deck-pick-thumb";
        thumb.alt = "";
        var samp = sampleByNo.get(cardNo);
        if (samp && samp.img) {
          thumb.src = samp.img;
          thumb.alt = samp.name || cardNo;
        }
        var meta = document.createElement("span");
        meta.className = "deck-pick-meta";
        var nameEl = document.createElement("span");
        nameEl.className = "deck-pick-name";
        nameEl.textContent = samp && samp.name ? samp.name : cardNo;
        var cntEl = document.createElement("span");
        cntEl.className = "deck-pick-count";
        cntEl.textContent = "×" + counts.get(cardNo);
        meta.appendChild(nameEl);
        meta.appendChild(cntEl);
        row.appendChild(cb);
        row.appendChild(thumb);
        row.appendChild(meta);
        listEl.appendChild(row);
      });
    }
  }

  teardownDeckPileLayoutWatchers();

  if (!resumeFromStorage) {
    try {
      sessionStorage.removeItem(STORAGE_PLAY_RESUME);
    } catch (_) {
      /* noop */
    }
  }

  root.querySelectorAll("button").forEach(function (b) {
    const n = b.cloneNode(true);
    b.parentNode.replaceChild(n, b);
  });

  bootstrapReplayStacks();
  sortables.forEach((s) => {
    try {
      s.destroy();
    } catch (e) {
      /* noop */
    }
  });
  sortables = [];
  uid = 1;

  try {
    var storedEn = sessionStorage.getItem(STORAGE_PLAY_ENERGY_CARD_NO);
    if (storedEn != null && String(storedEn).trim() !== "") {
      selectedEnergyCardNo = String(storedEn).trim();
    }
  } catch (_) {
    /* noop */
  }

  const state = {
    deck: [],
    deckPileOpen: false,
    /** 山札一覧での表面非表示（ソロ確認用／Undo可） */
    deckPileFacesDown: false,
    stage: { left: [], center: [], right: [] },
    liveArea: { left: [], center: [], right: [] },
    successfulLiveArea: [],
    waitingRoom: [],
    hand: [],
    resolutionArea: [],
    energyArea: initialEnergyArea(),
    previewScratch: [],
    /** ターンステップ用カウンター（0 開始。「ターン開始」で増加） */
    turnCount: 0,
    /** 「ターン開始」前のみ true（初回・盤リセット後もそのまま） */
    awaitingTurnStart: true,
    /** awaitingTurnStart 中のマリガン用・手札にある id のみ有効（スナップショットにも含める） */
    mulliganSelectedIds: [],
    /** 「ライブターン開始」後〜「ライブ開始」まで、手札からライブへ配置する選択モード */
    liveTurnPickMode: false,
    /** ライブターン開始時に手札が LIVE_TURN_HAND_SPREAD_MIN 以上だった場合、選択中は重ねずに表示 */
    liveTurnHandSpreadPick: false,
    /** 「ライブ開始」後〜次のライブターントップ／ターン開始まで、BH・必要ハート等のパネルを出す */
    liveStatsAfterBegin: false,
    /** ライブの計算パネル上の「固有ボーナス点」（打点に手動加算・Undo 可。負も可） */
    liveScoreEffectBonus: 0,
    /** エールで山札→解決にめくった音符ライブの実体 id（成功時のみ打点に＋1／枚） */
    ealeNoteLiveHitIds: [],
    /** ドローエールを解決にめくった回数ぶん、ブレード捲り上限到達後に手札へ入るドロー（Undo 対象） */
    pendingDrawYellHandDraws: 0,
    liveTurnSelectedIds: [],
  };
  var resumedFromStorage = false;
  if (resumeFromStorage) {
    try {
      var rawPlayResume = sessionStorage.getItem(STORAGE_PLAY_RESUME);
      if (rawPlayResume) {
        var playResumeObj = JSON.parse(rawPlayResume);
        if (playResumeObj && playResumeObj.v === 1 && playResumeObj.board && typeof playResumeObj.board === "object") {
          applyBoard(playResumeObj.board);
          if (typeof playResumeObj.uid === "number" && playResumeObj.uid > 0) {
            uid = Math.floor(playResumeObj.uid);
          }
          if (typeof playResumeObj.firstPlayer === "string" && playResumeObj.firstPlayer.trim()) {
            var fpEarly = root.querySelector("#select-first-player") || document.getElementById("select-first-player");
            if (fpEarly) fpEarly.value = playResumeObj.firstPlayer.trim();
          }
          resumedFromStorage = true;
        }
      }
    } catch (resumeErr) {
      console.warn(resumeErr);
    }
  }
  if (!resumedFromStorage) {
    state.deck = buildMainDeckInstances(activePlayDeckMap);
    dealOpeningHand(state.deck, state.hand, OPENING_HAND_SIZE);
    openingMulliganRememberedK = null;
    deckOddsOpeningMullBaselineOn = false;
    try {
      sessionStorage.removeItem(STORAGE_OPENING_MULLIGAN_K);
      sessionStorage.removeItem(STORAGE_DECK_ODDS_OPENING_MULL_MODEL);
    } catch (_) {
      /* noop */
    }
  }

  if (
    state.deck.length === 0 &&
    Object.keys(activePlayDeckMap).length > 0
  ) {
    showToast(
      "山札が空のままです。デッキ内のカード番号がカードDB（cards.json）と対応しているか確認してください。",
    );
  }

  /** 長押し後の続く click で ±1 しないためのフラグ */
  let suppressNextEnergyTap = false;

  /** @type {object | null} */
  let dragUndoSnap = null;

  /** Sortable onChoose で掴んだ要素の dataset.id（ステージ上で「どれが今置いたメンバーか」を DOM 順に頼らず決める） */
  let lastDraggedDomId = "";

  /** メンバー H/B 追加ダイアログの対象（盤面上の実体オブジェクトへの参照） */
  let memberHbDialogTarget = null;

  /** ドラッグ開始時点のプレビュー開閉状態（true=折りたたみ）。
   *  ドロップで意図せず展開してしまうのを防ぐためのスナップ。 */
  let previewRowCollapsedAtDragStart = null;
  /** 直近の Sortable onEnd 時刻（Date.now()）。直後の合成クリックを無視するために使う。 */
  let lastDragEndAt = 0;

  /** キーボード W／A の対象（ステージのメンバー・側面エネの実体 id） */
  let stanceKeyboardFocusCardId = "";
  /** 上記カードがあったゾーン要素 id（例: stage-left, zone-energy） */
  let stanceKeyboardFocusParentZoneId = "";

  /** 1ドロー直後のフラッシュ表示の継続時間（ms） */
  const FLASH_DRAW_DURATION_MS = 1000;
  /** ドローエール由来のフラッシュ／カード発光を少し長めに（約2〜3秒） */
  const FLASH_DRAW_YELL_DURATION_MS = 2600;
  const FLASH_LABEL_PLUS_DRAW = "+1ドロー";
  /** ライブ進行中「山札→解決」や旧「エール+1」を解決へ置いた場合のフラッシュ文言 */
  const FLASH_LABEL_PLUS_DRAW_RESOLUTION = "+１ドロー";
  /** ドローエール（BH）で解決にめくった／遅延ドローで手札に入ったカードのフラッシュ（ピンク） */
  const FLASH_LABEL_DRAW_YELL_PLUS_ONE = "ドローエール+1";
  const FLASH_LABEL_LIVE_YELL_RESOLUTION_OLD = "エール+1";
  function markCardFlashDraw(c, label) {
    if (!c || typeof c !== "object") return;
    c._flashDrawAt = Date.now();
    c._flashDrawLabel = typeof label === "string" && label ? label : null;
  }

  normalizeAllCardFields();

  const $ = (id) => root.querySelector("#" + id) || document.getElementById(id);

  /** プレイ画面のみ：縦長スマホ向け DOM 組み替え（デスクトップでは左列レイアウトへ復帰） */
  function isPlayChromeMobilePortraitLayout() {
    if (typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
  }

  function syncPlayBoardChromeMounts() {
    var vg = document.getElementById("view-game");
    if (!vg || vg.hidden || vg.hasAttribute("hidden")) {
      document.body.classList.remove("chrome-layout-play-mobile-portrait", "chrome-layout-play-desktop");
      return;
    }

    var desktopSimRow = document.getElementById("mount-desktop-sim-success-row");
    var desktopRes = document.getElementById("mount-desktop-resolution");
    var strip = document.getElementById("play-top-fixed-strip");
    var stripBody = document.getElementById("play-top-fixed-strip-body");
    var resWrap = document.getElementById("play-strip-resolution-wrap");
    var sucWrap = document.getElementById("play-strip-success-live-wrap");
    var deckSec = document.getElementById("section-play-deck-live-sim");
    var probMount = document.getElementById("mount-mobile-live-prob-inline");
    if (!desktopSimRow || !desktopRes || !strip || !stripBody || !resWrap || !sucWrap || !deckSec) return;

    var mobile = isPlayChromeMobilePortraitLayout();
    document.body.classList.toggle("chrome-layout-play-mobile-portrait", mobile);
    document.body.classList.toggle("chrome-layout-play-desktop", !mobile);

    if (mobile) {
      if (probMount) probMount.appendChild(deckSec);
      stripBody.appendChild(resWrap);
      stripBody.appendChild(sucWrap);
    } else {
      desktopSimRow.appendChild(deckSec);
      desktopSimRow.appendChild(sucWrap);
      desktopRes.appendChild(resWrap);
    }

    if (!mobile && probMount) probMount.innerHTML = "";

    if (desktopSimRow)
      desktopSimRow.setAttribute("aria-hidden", mobile ? "true" : "false");
    if (desktopRes) desktopRes.setAttribute("aria-hidden", mobile ? "true" : "false");
    if (strip) strip.setAttribute("aria-hidden", mobile ? "false" : "true");

    try {
      syncDeckLiveSimPanel();
    } catch (_) {
      /* noop */
    }
  }

  syncPlayBoardChromeMounts();

  wireDeckOddsTurnStepsOnce();

  function allZonesFlat() {
    return [
      ...state.deck,
      ...state.hand,
      ...state.waitingRoom,
      ...state.resolutionArea,
      ...state.successfulLiveArea,
      ...(state.previewScratch || []),
      ...state.energyArea,
      ...state.stage.left,
      ...state.stage.center,
      ...state.stage.right,
      ...state.liveArea.left,
      ...state.liveArea.center,
      ...state.liveArea.right,
    ];
  }

  function bhModel(c) {
    return getCard(c && c.card_no) || c;
  }

  /** カードDBの能力・BHと盤面上の実体を合成（card_no があれば優先結合） */
  function mergedCatalogCard(c) {
    const cat = getCard(c && c.card_no);
    return cat && typeof cat === "object" ? Object.assign({}, cat, c) : c;
  }

  /** エール進行中に山札→解決へドローエール BH を置いたときのフラッシュ／待機ドロー計上。（ドロップ／旧フラグ）。 */
  function maybeFlashDrawYellOnResolutionDrop(evt, snapBeforeDrag) {
    if (!evt || !evt.from || !evt.to || !snapBeforeDrag) return;
    if (evt.to.id !== "zone-resolution") return;
    if (evt.from.id !== "zone-deck") return;
    if (state.liveStatsAfterBegin !== true && state.liveTurnPickMode !== true) return;
    var idStr = lastDraggedDomId ? String(lastDraggedDomId) : "";
    if (!idStr) return;
    if (!Array.isArray(snapBeforeDrag.resolutionArea)) return;
    var wasAlreadyInRes = snapBeforeDrag.resolutionArea.some(function (c) {
      return c && String(c.id) === idStr;
    });
    if (wasAlreadyInRes) return;
    var moved = state.resolutionArea.find(function (c) {
      return c && String(c.id) === idStr;
    });
    if (!moved) return;
    var drawYell = catalogLiveCardIsDrawYellBladeHeart(mergedCatalogCard(moved));
    if (drawYell) {
      markCardFlashDraw(moved, FLASH_LABEL_DRAW_YELL_PLUS_ONE);
      state.pendingDrawYellHandDraws = Math.max(0, Math.floor(Number(state.pendingDrawYellHandDraws) || 0)) + 1;
    } else if (moved._flashDrawLabel === FLASH_LABEL_LIVE_YELL_RESOLUTION_OLD) {
      markCardFlashDraw(moved, FLASH_LABEL_PLUS_DRAW_RESOLUTION);
    }
  }

  /** ブレードで捲れる枚数が尽きたタイミング（解決枚数が bladeK に到達）で、ドローエール待ちドローを手札へ */
  function flashDrawYellBeamsFromResolutionToHand(n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (n <= 0) return;
    var resEl = $("zone-resolution");
    var handEl = $("zone-hand");
    if (!resEl || !handEl) return;
    var r0 = resEl.getBoundingClientRect();
    var r1 = handEl.getBoundingClientRect();
    var x0 = r0.left + r0.width * 0.5;
    var y0 = r0.top + r0.height * 0.45;
    var x1 = r1.left + r1.width * 0.45;
    var y1 = r1.top + r1.height * 0.5;
    var layer = document.createElement("div");
    layer.className = "draw-yell-beam-overlay";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.hypot(dx, dy) || 1;
    var ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    var ux = (-dy / len) * 14;
    var uy = (dx / len) * 14;
    for (var i = 0; i < n; i++) {
      var seg = (n - 1) / 2;
      var oi = i - seg;
      var bx = x0 + oi * ux * 0.95;
      var by = y0 + oi * uy * 0.95;
      var beam = document.createElement("div");
      beam.className = "draw-yell-beam";
      beam.style.left = bx + "px";
      beam.style.top = by + "px";
      beam.style.width = len + "px";
      beam.style.transform = "rotate(" + ang + "deg)";
      beam.style.transformOrigin = "0 50%";
      layer.appendChild(beam);
    }
    window.setTimeout(function () {
      try {
        layer.remove();
      } catch (_) {}
    }, 820);
  }

  function maybeFlushPendingDrawYellHandDraws(prevResolutionLen) {
    var bladeK = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var resNow = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    var prev =
      typeof prevResolutionLen === "number" && Number.isFinite(prevResolutionLen)
        ? Math.max(0, Math.floor(prevResolutionLen))
        : resNow;
    if (bladeK <= 0) return;
    if (resNow > bladeK) return;
    if (!(prev < bladeK && resNow >= bladeK)) return;
    var n = Math.max(0, Math.floor(Number(state.pendingDrawYellHandDraws) || 0));
    if (n <= 0) return;
    flashDrawYellBeamsFromResolutionToHand(n);
    var drew = 0;
    for (var i = 0; i < n; i++) {
      tryReplenishDeckFromWaitingLoop();
      if (!state.deck.length) break;
      var card = state.deck.shift();
      markCardFlashDraw(card, FLASH_LABEL_DRAW_YELL_PLUS_ONE);
      state.hand.push(card);
      drew++;
    }
    state.pendingDrawYellHandDraws = Math.max(0, n - drew);
    if (drew > 0) {
      showToast(
        "ドローエール — 手札に " +
          drew +
          " 枚ドローしました" +
          (drew < n ? "（山札が足りず " + (n - drew) + " 枚は待機のまま）" : ""),
      );
      logReplay("draw-yell-hand-flush", { drew: drew, remainingPending: state.pendingDrawYellHandDraws });
    }
  }

  function sanitizeNonNegativeInt(v) {
    var n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(Math.abs(n)));
  }

  /** メンバー「プレイ調整」の追加ハート／ALL（常時＋ターン＋旧形式） */
  function playBonusHeartSlotMapGet(o, si) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return 0;
    var v = o[si] !== undefined ? o[si] : o[String(si)];
    return sanitizeNonNegativeInt(v);
  }

  function bonusHeartSlotRead(inst, si) {
    if (!inst || inst.type !== T_MEMBER) return 0;
    ensureCardBoardFields(inst);
    return (
      playBonusHeartSlotMapGet(inst.playBonusHeartSlotsAlways, si) +
      playBonusHeartSlotMapGet(inst.playBonusHeartSlotsTurn, si) +
      playBonusHeartSlotMapGet(inst.playBonusHeartSlots, si)
    );
  }

  function sumPlayBonusBlade(inst) {
    if (!inst || inst.type !== T_MEMBER) return 0;
    ensureCardBoardFields(inst);
    return (
      sanitizeNonNegativeInt(inst.playBonusBladeAlways) +
      sanitizeNonNegativeInt(inst.playBonusBladeTurn) +
      sanitizeNonNegativeInt(inst.playBonusBlade)
    );
  }

  function addMemberPlayBonusSolidHearts(inst, accum) {
    if (!inst || inst.type !== T_MEMBER) return;
    for (var s = 1; s <= 6; s++) {
      var n = bonusHeartSlotRead(inst, s);
      if (!n) continue;
      accum[s] = (accum[s] || 0) + n;
    }
  }

  /** slot7 は need_heart の「任意」支払いプールのみに加算し、同色表示には載せない */
  function memberPlayBonusAllWildcardBump(inst) {
    return bonusHeartSlotRead(inst, 7) + countBp1012LanzhuBonusAllHeart(inst);
  }

  function countMiaTaylorEnergyBladeBelow(inst) {
    if (!inst || inst.type !== T_MEMBER) return 0;
    var mc = mergedCatalogCard(inst);
    if (!cardNoIsMiaTaylorPb1011(mc.card_no)) return 0;
    var col = stageColumnKeyHostingMember(inst.id);
    if (!col) return 0;
    var arr = state.stage[col] || [];
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && String(arr[i].id) === String(inst.id)) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return 0;
    var n = 0;
    /** ステージ列は左からエネを積み右端がメンバー（手前）。「下のエネ」＝配列上メントーより左（背面側）のエネ */
    for (var j = 0; j < idx; j++) {
      var x = arr[j];
      if (x && x.type === T_ENERGY) n++;
    }
    return n;
  }

  function memberEffectiveBlade(inst) {
    if (!inst || inst.type !== T_MEMBER) return 0;
    /** ウェイト（横向き）のメンバーはブレードを数えない（捲り k・非BH許容など） */
    if (inst.lcWait === true) return 0;
    ensureCardBoardFields(inst);
    var mc = mergedCatalogCard(inst);
    var base = sanitizeNonNegativeInt(mc.blade);
    var extra = sumPlayBonusBlade(inst);
    var mia = countMiaTaylorEnergyBladeBelow(inst);
    var lzBlade = countBp1012LanzhuBonusBlade(inst);
    return base + extra + mia + lzBlade;
  }

  function clearMemberManualPlayBonuses(inst) {
    if (!inst || inst.type !== T_MEMBER) return;
    ensureCardBoardFields(inst);
    inst.playBonusHeartSlotsAlways = {};
    inst.playBonusHeartSlotsTurn = {};
    inst.playBonusHeartSlots = {};
    inst.playBonusBladeAlways = 0;
    inst.playBonusBladeTurn = 0;
    inst.playBonusBlade = 0;
  }

  function clearTurnScopedPlayBonusesEverywhere() {
    allZonesFlat().forEach(function (c) {
      if (!c || c.type !== T_MEMBER) return;
      ensureCardBoardFields(c);
      c.playBonusHeartSlotsTurn = {};
      c.playBonusBladeTurn = 0;
    });
  }

  function dragSourceIsLiveFrameZone(fromEl) {
    if (!fromEl || !fromEl.id) return false;
    var id = fromEl.id;
    return id === "live-left" || id === "live-center" || id === "live-right";
  }

  /** 成否表示が確定しているライブを控え／成功ライブ置き場へ動かしたとき、解決領域をすべて控え室へ */
  function maybeFlushResolutionToWaitingOnVerdictLiveMove(evt) {
    if (!liveSimResolutionVerdictLocked()) return;
    var toEl = evt.to;
    if (!toEl || !toEl.id) return;
    var tid = toEl.id;
    if (tid !== "zone-waiting" && tid !== "zone-waiting-drop-catcher" && tid !== "zone-success-live") return;
    var item = evt.item;
    if (!item || item.dataset.type !== T_LIVE) return;
    if (!dragSourceIsLiveFrameZone(evt.from)) return;
    if (!state.resolutionArea || !state.resolutionArea.length) return;
    var flushed = state.resolutionArea.slice();
    state.resolutionArea.length = 0;
    state.waitingRoom.push.apply(state.waitingRoom, flushed);
    showToast("ライブを移動したため、解決の " + flushed.length + " 枚を控え室へ送りました");
    logReplay("resolution-flush-with-verdict-live-move", { count: flushed.length, toZone: tid });
  }

  function syncPlayBonusesAfterStageMembershipChange(snapBefore) {
    if (!snapBefore || !snapBefore.stage) return;
    var wasOnStage = {};
    ["left", "center", "right"].forEach(function (k) {
      var arr = snapBefore.stage[k] || [];
      arr.forEach(function (c) {
        if (c && c.type === T_MEMBER && c.id != null) wasOnStage[String(c.id)] = true;
      });
    });
    allZonesFlat().forEach(function (c) {
      if (!c || c.type !== T_MEMBER || c.id == null) return;
      var id = String(c.id);
      if (!wasOnStage[id]) return;
      if (stageColumnKeyHostingMember(id) == null) {
        clearMemberManualPlayBonuses(c);
      }
    });
  }

  /** メンバー登場時の印刷コスト（側面エネ・バトン差分計算に使用） */
  function memberInstanceIsInHand(inst) {
    if (!inst || inst.id == null) return false;
    var sid = String(inst.id);
    for (var hi = 0; hi < state.hand.length; hi++) {
      var hc = state.hand[hi];
      if (hc && String(hc.id) === sid) return true;
    }
    return false;
  }

  function memberFlooredPrintedCost(memberInstOrNull) {
    if (!memberInstOrNull || memberInstOrNull.type !== T_MEMBER) return 0;
    var merged = mergedCatalogCard(memberInstOrNull);
    var no = String(memberInstOrNull.card_no || merged.card_no || "");
    if (isHandDependentCost20Member(no) && memberInstanceIsInHand(memberInstOrNull)) {
      var selfId = String(memberInstOrNull.id);
      var others = 0;
      for (var i = 0; i < state.hand.length; i++) {
        var h = state.hand[i];
        if (h && String(h.id) !== selfId) others++;
      }
      return Math.max(0, 20 - others);
    }
    var costNum = Number(merged.cost);
    if (Number.isFinite(costNum) && costNum >= 1) return Math.min(Math.floor(costNum), 99);
    if (merged.cost != null && String(merged.cost).trim() !== "") {
      var digits = String(merged.cost).replace(/[^\d]/g, "");
      var parsed = digits.length ? parseInt(digits, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= 1) return Math.min(parsed, 99);
    }
    return 0;
  }

  /** ステージ外から当ステージ列へ「載る」ときにウェイトへ回す側面エネ枚数（既存メンバーがいればバトンタッチとして差し引く） */
  function effectiveStageAppearPrintedCost(memberNew, incumbentMaybe) {
    var w = memberFlooredPrintedCost(memberNew);
    if (!incumbentMaybe || incumbentMaybe.type !== T_MEMBER) return w;
    return Math.max(0, w - memberFlooredPrintedCost(incumbentMaybe));
  }

  /** スナップショット上の当該列で、「新規載せのメンバー以外」の先行メンバー（バトン退場予定） */
  function incumbentFromSnapStageSlot(snap, colKey, newMemberId) {
    if (!snap || !snap.stage || !colKey) return null;
    var arr = snap.stage[colKey];
    if (!Array.isArray(arr)) return null;
    for (var i = 0; i < arr.length; i++) {
      var pc = arr[i];
      if (pc && pc.type === T_MEMBER && String(pc.id) !== String(newMemberId)) return pc;
    }
    return null;
  }

  /** 状態上、メンバー id が載っているステージ列キー — 無ければ null */
  function stageColumnKeyHostingMember(cardId) {
    if (!cardId) return null;
    var keyStr = String(cardId);
    for (var i = 0; i < 3; i++) {
      var k = ["left", "center", "right"][i];
      var slot = state.stage[k] || [];
      for (var j = 0; j < slot.length; j++) {
        var c = slot[j];
        if (c && c.type === T_MEMBER && String(c.id) === keyStr) return k;
      }
    }
    return null;
  }

  /** メンバー実体がライブ枠（左・中央・右）に載っている列キー — 無ければ null */
  function liveSlotColumnKeyHostingMember(cardId) {
    if (!cardId) return null;
    var keyStr = String(cardId);
    for (var li = 0; li < 3; li++) {
      var lk = ["left", "center", "right"][li];
      var slot = state.liveArea[lk] || [];
      for (var lj = 0; lj < slot.length; lj++) {
        var m = slot[lj];
        if (m && m.type === T_MEMBER && String(m.id) === keyStr) return lk;
      }
    }
    return null;
  }

  function memberIsOnStageOrLiveSlot(memberInst) {
    return !!(
      memberInst &&
      memberInst.type === T_MEMBER &&
      memberInst.id != null &&
      (stageColumnKeyHostingMember(memberInst.id) != null || liveSlotColumnKeyHostingMember(memberInst.id) != null)
    );
  }

  /** DB の series に「虹ヶ咲」を含むライブ（公式テキストの「虹ヶ咲ライブ」と対応） */
  function catalogLiveSeriesIsNijigasaki(seriesStr) {
    return String(seriesStr || "").includes("虹ヶ咲");
  }

  /**
   * 鐘 嵐珠 bp1-012: ライブ枠にライブが3枚以上かつ、そのうち虹ヶ咲シリーズのライブが1枚以上あるときのみ true。
   * （ライブ枠のみ数える。プレビュー・解決は含めない）
   */
  function bp1012LanzhuSynergyBoardConditionMet() {
    var lives = [];
    ["left", "center", "right"].forEach(function (k) {
      (state.liveArea[k] || []).forEach(function (c) {
        if (c && c.type === T_LIVE) lives.push(c);
      });
    });
    if (lives.length < 3) return false;
    for (var i = 0; i < lives.length; i++) {
      var mc = mergedCatalogCard(lives[i]);
      if (catalogLiveSeriesIsNijigasaki(mc.series)) return true;
    }
    return false;
  }

  function countBp1012LanzhuBonusBlade(inst) {
    if (!inst || inst.type !== T_MEMBER) return 0;
    if (!memberIsOnStageOrLiveSlot(inst)) return 0;
    if (!cardNoIsZhongLanzhuBp1012(mergedCatalogCard(inst).card_no)) return 0;
    if (!bp1012LanzhuSynergyBoardConditionMet()) return 0;
    return 2;
  }

  /** ALL ハート（slot7・任意プール）の動的加算分のみ（所持Hダイアログの値とは別） */
  function countBp1012LanzhuBonusAllHeart(inst) {
    if (!inst || inst.type !== T_MEMBER) return 0;
    if (!memberIsOnStageOrLiveSlot(inst)) return 0;
    if (!cardNoIsZhongLanzhuBp1012(mergedCatalogCard(inst).card_no)) return 0;
    if (!bp1012LanzhuSynergyBoardConditionMet()) return 0;
    return 2;
  }

  /** このターンステージへ載せたばかりか（同日バトン注意に利用） */
  function memberIsStageFreshThisTurn(memberInstOrNull) {
    return !!(
      memberInstOrNull &&
      memberInstOrNull.type === T_MEMBER &&
      typeof memberInstOrNull.stageTurnEntered === "number" &&
      Number.isFinite(memberInstOrNull.stageTurnEntered) &&
      memberInstOrNull.stageTurnEntered === state.turnCount
    );
  }

  /** ステージ／ライブ上メンバーから ALL調整(slot7) の合計（任意ハート計算へ） */
  function wildcardBoardBumpFromMembers() {
    var w = 0;
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        w += memberPlayBonusAllWildcardBump(inst);
      });
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        w += memberPlayBonusAllWildcardBump(inst);
      });
    });
    return w;
  }

  function wildcardResolutionBumpFromMembers() {
    var w = 0;
    state.resolutionArea.forEach(function (inst) {
      if (inst.type !== T_MEMBER) return;
      ensureCardBoardFields(inst);
      w += memberPlayBonusAllWildcardBump(inst);
    });
    return w;
  }

  /** ステージにいるメンバーの ALL（slot7）ボーナスのみ — ステージハート表示に solid と合算 */
  function wildcardBumpFromStageMembersOnly() {
    var w = 0;
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        w += memberPlayBonusAllWildcardBump(inst);
      });
    });
    return w;
  }

  /** ライブ枠＋プレビューにあるライブの need_heart を色情報スロット別に足し合わせ（成功確率と同一モデル） */
  function aggregateNeedHeartSlotsFromLiveArea() {
    var acc = {};
    ["left", "center", "right"].forEach(function (k) {
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_LIVE) return;
        addNeedHeartToSlotAccum(mergedCatalogCard(inst), acc);
      });
    });
    (state.previewScratch || []).forEach(function (inst) {
      if (!inst || inst.type !== T_LIVE) return;
      addNeedHeartToSlotAccum(mergedCatalogCard(inst), acc);
    });
    return acc;
  }

  /** メンバーの base_heart＋調整分（所持H）：ステージ＋ライブ枠。ALL(slot7) は集計オブジェクトに含めず wildcard 別計上 */
  function boardHeldHeartSlotAccum() {
    var acc = {};
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        addBaseHeartToSlotAccum(mergedCatalogCard(inst), acc);
        addMemberPlayBonusSolidHearts(inst, acc);
      });
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        addBaseHeartToSlotAccum(mergedCatalogCard(inst), acc);
        addMemberPlayBonusSolidHearts(inst, acc);
      });
    });
    return acc;
  }

  /** ステージのみ：メンバー base_heart ＋調整分 */
  function stageHeldHeartSlotAccum() {
    var acc = {};
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        addBaseHeartToSlotAccum(mergedCatalogCard(inst), acc);
        addMemberPlayBonusSolidHearts(inst, acc);
      });
    });
    return acc;
  }

  /** ライブ枠のみ：メンバー base_heart ＋調整分 */
  function liveHeldHeartSlotAccumOnly() {
    var acc = {};
    ["left", "center", "right"].forEach(function (k) {
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        addBaseHeartToSlotAccum(mergedCatalogCard(inst), acc);
        addMemberPlayBonusSolidHearts(inst, acc);
      });
    });
    return acc;
  }

  function mergeNumericSlotAccums(a, b) {
    var o = {};
    function take(src) {
      if (!src) return;
      Object.keys(src).forEach(function (k) {
        var v = src[k];
        if (typeof v !== "number" || !Number.isFinite(v)) return;
        var nk = Number(k);
        var key = nk === nk ? nk : k;
        o[key] = (o[key] || 0) + v;
      });
    }
    take(a);
    take(b);
    return o;
  }

  function resolutionHeldHeartSlotAccum() {
    var acc = {};
    state.resolutionArea.forEach(function (inst) {
      addBaseHeartToSlotAccum(mergedCatalogCard(inst), acc);
      if (inst.type === T_MEMBER) {
        ensureCardBoardFields(inst);
        addMemberPlayBonusSolidHearts(inst, acc);
      }
    });
    return acc;
  }

  /**
   * 解決にあるカードの blade_heart を need_heart 充足へ加算する。
   * slot7（b_all／ALL）は wildcardBhAllFlex として渡し、有色不足の充当に使ったあと余りは任意（heart0）プールへ回す。
   */
  function resolutionBladeHeartContributionForFulfillment() {
    var acc = {};
    state.resolutionArea.forEach(function (inst) {
      addBladeHeartWeightsPerDisplaySlot(mergedCatalogCard(inst), acc);
    });
    var seven = Number(acc[7]);
    delete acc[7];
    var wildFromBh = Number.isFinite(seven) && seven > 0 ? Math.floor(seven) : 0;
    return { bhSlotsAcc: acc, wildcardBumpFromBh: wildFromBh };
  }

  /** 解決ゾーンの BH 重み合計（枚数×DB） */
  function sumResolutionBladeHeartWeighted() {
    var t = 0;
    state.resolutionArea.forEach(function (inst) {
      t += sumBladeHeartWeightedValues(mergedCatalogCard(inst));
    });
    return t;
  }

  /** 解決ゾーン：BH サマリー（パネル表示・ログ参考） */
  function accumulateResolutionBladeHeartStats() {
    var totalBh = 0;
    var slots = {};
    state.resolutionArea.forEach(function (inst) {
      var mc = mergedCatalogCard(inst);
      totalBh += sumBladeHeartWeightedValues(mc);
      addBladeHeartWeightsPerDisplaySlot(mc, slots);
    });
    return {
      totalBh: totalBh,
      flipCount: state.resolutionArea.length,
      slots: slots,
    };
  }

  /** ステージ上有効メンバーの blade の合計（調整込み）。ライブ枠・解決は含めない */
  function sumStageMemberBladesOnly() {
    var s = 0;
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        s += memberEffectiveBlade(inst);
      });
    });
    return Math.floor(s);
  }

  /** ステージ＋ライブ枠のメンバー blade 合計（盤面・シミュの捲り枚数 k に使用） */
  function sumBoardMemberBlades() {
    var s = 0;
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        s += memberEffectiveBlade(inst);
      });
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        s += memberEffectiveBlade(inst);
      });
    });
    return Math.floor(s);
  }

  function liveCardCountOnBoard() {
    var n = 0;
    ["left", "center", "right"].forEach(function (k) {
      state.liveArea[k].forEach(function (c) {
        if (c.type === T_LIVE) n++;
      });
    });
    (state.previewScratch || []).forEach(function (c) {
      if (c && c.type === T_LIVE) n++;
    });
    return n;
  }

  /** ライブ枠（左・中央・右）に置かれたライブカード枚数のみ（プレビューは含まない） */
  function liveLiveCardsInFramesOnly() {
    var n = 0;
    ["left", "center", "right"].forEach(function (k) {
      (state.liveArea[k] || []).forEach(function (c) {
        if (c && c.type === T_LIVE) n++;
      });
    });
    return n;
  }

  /** ライブ枠内のライブカードの打点合計（印刷スコアのみ） */
  function computeLiveFrameScoreParts() {
    var baseSum = 0;
    ["left", "center", "right"].forEach(function (k) {
      var slot = state.liveArea[k];
      if (!Array.isArray(slot)) return;
      slot.forEach(function (inst) {
        if (!inst || inst.type !== T_LIVE) return;
        var cat = mergedCatalogCard(inst);
        var sc = Number(cat && cat.score);
        if (Number.isFinite(sc) && sc > 0) baseSum += Math.floor(sc);
      });
    });
    return { baseSum: baseSum };
  }

  function countEaleNoteLiveHitsForScore() {
    if (!Array.isArray(state.ealeNoteLiveHitIds) || !state.ealeNoteLiveHitIds.length) return 0;
    var set = new Set(state.ealeNoteLiveHitIds);
    return set.size;
  }

  /**
   * @param {*} b evaluateLiveMechanicalFulfillmentBundle の戻り
   */
  function liveVerdictScorePoints(b) {
    if (!b) return { ok: false, total: 0, baseSum: 0, noteCt: 0, hasMech: false, bonus: 0 };
    var parts = computeLiveFrameScoreParts();
    var needSum = b.needSum;
    var liveCt = b.liveCt;
    var hasMech = !!(liveCt && needSum > 0);
    var ev = b.evaluateResult;
    var ok = !!(hasMech && ev && ev.ok);
    var bonus = Math.max(-99, Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0)));
    var ealeNoteN = ok ? countEaleNoteLiveHitsForScore() : 0;
    var total = ok ? parts.baseSum + bonus + ealeNoteN : 0;
    return {
      ok: ok,
      total: total,
      baseSum: parts.baseSum,
      noteCt: ealeNoteN,
      hasMech: hasMech,
      bonus: bonus,
    };
  }

  /**
   * @param {*} b バンドル。null のときは liveStatsAfterBegin オフ用
   */
  function syncLiveCenterScoreBar(b) {
    var bar = $("live-center-score-bar");
    var numEl = $("live-center-score-num");
    var noteWrap = $("live-center-score-note-wrap");
    var noteSuf = $("live-center-score-note-suffix");
    if (!bar || !numEl) return;

    var placeholder = !state.liveStatsAfterBegin || liveLiveCardsInFramesOnly() === 0;

    if (placeholder) {
      bar.hidden = false;
      numEl.textContent = "\u2212";
      numEl.className = "live-score-center-bar__num live-score-num--placeholder";
      bar.className = "live-score-center-bar live-score-center-bar--placeholder";
      if (noteWrap && noteSuf) {
        noteWrap.hidden = true;
        noteSuf.textContent = "";
      }
      return;
    }

    var bund = b || evaluateLiveMechanicalFulfillmentBundle();
    var vp = liveVerdictScorePoints(bund);
    bar.hidden = false;
    numEl.textContent = String(vp.hasMech ? vp.total : 0);
    numEl.className = "live-score-center-bar__num";
    if (vp.hasMech && vp.ok) {
      var t = Math.floor(Number(vp.total));
      if (Number.isFinite(t) && t >= 22) numEl.classList.add("live-score-num--ge22");
      else if (Number.isFinite(t) && t >= 14) numEl.classList.add("live-score-num--glow-14plus");
      else if (Number.isFinite(t) && t >= 0) {
        var tier;
        if (t <= 1) tier = 0;
        else if (t <= 3) tier = 1;
        else if (t <= 5) tier = 2;
        else if (t <= 7) tier = 3;
        else if (t <= 9) tier = 4;
        else if (t <= 10) tier = 6;
        else if (t <= 12) tier = 8;
        else tier = 9;
        numEl.classList.add("live-score-num--tier-" + String(Math.min(10, tier)));
      }
    }
    bar.classList.remove(
      "live-score-center-bar--placeholder",
      "live-score-center-bar--ok",
      "live-score-center-bar--fail",
      "live-score-center-bar--muted",
    );
    if (!vp.hasMech) bar.classList.add("live-score-center-bar--muted");
    else if (vp.ok) bar.classList.add("live-score-center-bar--ok");
    else bar.classList.add("live-score-center-bar--fail");
    if (noteWrap && noteSuf) {
      if (vp.ok && vp.noteCt > 0) {
        noteWrap.hidden = false;
        noteSuf.textContent = "＋" + String(vp.noteCt);
      } else {
        noteWrap.hidden = true;
        noteSuf.textContent = "";
      }
    }
  }

  function formatLiveNeedHeartLine(accum) {
    var parts = [];
    var colors = formatHeartSlotAccumBreakdown(accum);
    if (colors !== "—") parts.push(colors);
    if (accum[0] && accum[0] > 0) parts.push("任意 " + accum[0]);
    if (accum[99] && accum[99] > 0) parts.push("その他キー必要 " + accum[99]);
    return parts.length ? parts.join(" ・ ") : "—";
  }

  function formatLiveEvalFailShort(ev) {
    if (!ev || ev.ok) return "—";
    if (ev.deficit != null && ev.reason) return String(ev.reason) + " 不足" + ev.deficit;
    return String(ev.reason || "要件不足");
  }

  /**
   * ライブの need_heart 充足判定。
   * 供給＝<strong>場（ステージ＋ライブ枠）にいるメンバーの所持ハート（base_heart）</strong>
   * ＋<strong>解決に捲れているカードの blade_heart（BH）</strong>。
   * メンバー play の ALL heart（任意プール加算）は場のメンバーのみ。解決の所持Hは判定に含めない。
   */
  function evaluateLiveMechanicalFulfillmentBundle() {
    var needAccum = aggregateNeedHeartSlotsFromLiveArea();
    var needSum = sumSlotAccumValues(needAccum);
    var fieldMemberHeartAcc = boardHeldHeartSlotAccum();
    var bhFromRes = resolutionBladeHeartContributionForFulfillment();
    var mergedSupply = mergeNumericSlotAccums(fieldMemberHeartAcc, bhFromRes.bhSlotsAcc);
    /** 解決に見えているカードの BH ALL（slot7）— 有色不足にも充当、余りは任意プール */
    var wildcardBhAllFlex = bhFromRes.wildcardBumpFromBh;
    /** 場のメンバーの play ボーナス等の ALL heart（heart0 のみ） */
    var wildcardHeartBump = wildcardBoardBumpFromMembers();

    var boardHAcc = fieldMemberHeartAcc;
    var resHAcc = resolutionHeldHeartSlotAccum();
    var stageSolid = stageHeldHeartSlotAccum();
    var stageWildSt = wildcardBumpFromStageMembersOnly();
    var stageHAcc = Object.assign({}, stageSolid);
    if (stageWildSt > 0) stageHAcc[7] = (stageHAcc[7] || 0) + stageWildSt;
    var liveHAcc = liveHeldHeartSlotAccumOnly();
    var boardWild = wildcardBoardBumpFromMembers();
    var resWild = wildcardResolutionBumpFromMembers();
    var boardHSum = sumSlotAccumValues(boardHAcc);
    var resHSum = sumSlotAccumValues(resHAcc);
    var bladeSum = sumStageMemberBladesOnly();
    var liveCt = liveCardCountOnBoard();
    var resolutionBhWeightedSum = sumResolutionBladeHeartWeighted();
    var ev = evaluateNeedHeartFulfillment(mergedSupply, needAccum, {
      wildcardAllBump: wildcardHeartBump,
      wildcardBhAllFlex: wildcardBhAllFlex,
    });
    return {
      needAccum: needAccum,
      needSum: needSum,
      boardHAcc: boardHAcc,
      resHAcc: resHAcc,
      stageHAcc: stageHAcc,
      liveHAcc: liveHAcc,
      boardWild: boardWild,
      resWild: resWild,
      boardHSum: boardHSum,
      resHSum: resHSum,
      wildcardHeartBump: wildcardHeartBump,
      wildcardBhAllFlex: wildcardBhAllFlex,
      wildcardAllBump: wildcardHeartBump + wildcardBhAllFlex,
      mergedSupplyPreview: mergedSupply,
      resolutionBhSlotsAcc: bhFromRes.bhSlotsAcc,
      bhWildcardFromResolution: bhFromRes.wildcardBumpFromBh,
      resolutionBhWeightedSum: resolutionBhWeightedSum,
      bladeSum: bladeSum,
      liveCt: liveCt,
      evaluateResult: ev,
    };
  }

  function logBinom(n, k) {
    if (k < 0 || k > n) return -Infinity;
    if (k === 0 || k === n) return 0;
    if (k > n - k) k = n - k;
    var s = 0;
    for (var i = 1; i <= k; i++) s += Math.log((n - k + i) / i);
    return s;
  }

  /** 山札の i 枚目を捲って解決に置いたときの BH 寄与のみ（エール: 非BHは材料ゼロ。base_heart は足さない） */
  function deckResolutionStyleDeltaForIndex(i) {
    var inst = state.deck[i];
    if (!inst) return { bh: {}, wild: 0 };
    var mc = mergedCatalogCard(inst);
    var bh = {};
    addBladeHeartWeightsPerDisplaySlot(mc, bh);
    var w7 = Number(bh[7]);
    delete bh[7];
    var wild = Number.isFinite(w7) && w7 > 0 ? Math.floor(w7) : 0;
    return { bh: bh, wild: wild };
  }

  function evalAfterExtraResolutionCards(b, deltas, indexList) {
    var merged = b.mergedSupplyPreview;
    var wildHeart = 0;
    var wildBh = 0;
    if (b.wildcardHeartBump != null || b.wildcardBhAllFlex != null) {
      wildHeart = b.wildcardHeartBump != null ? b.wildcardHeartBump : 0;
      wildBh = b.wildcardBhAllFlex != null ? b.wildcardBhAllFlex : 0;
    } else {
      wildHeart = b.wildcardAllBump || 0;
    }
    for (var j = 0; j < indexList.length; j++) {
      var d = deltas[indexList[j]];
      merged = mergeNumericSlotAccums(merged, d.bh);
      wildBh += d.wild;
    }
    return evaluateNeedHeartFulfillment(merged, b.needAccum, {
      wildcardAllBump: wildHeart,
      wildcardBhAllFlex: wildBh,
    });
  }

  function nextCombination(n, k, idx) {
    var t = k - 1;
    while (t >= 0 && idx[t] === n - k + t) t--;
    if (t < 0) return false;
    idx[t]++;
    for (var j = t + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
    return true;
  }

  /**
   * 決定的擬似乱数 (mulberry32)。0..1。
   * モンテカルロを再実行しても、同じシードなら同じ系列が出る。
   */
  function makeSeededRng(seed) {
    var s = (seed | 0) >>> 0;
    if (s === 0) s = 0x9e3779b1;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 山札を「シャッフル」しても結果がぶれないよう、デッキ組成（card_no の multiset）と k から
   * 決定的なシードを計算する。盤面が同じ・デッキ中身が同じなら毎回同じ確率に落ち着く。
   */
  function deckMonteCarloSeed(k) {
    var counts = new Map();
    for (var i = 0; i < state.deck.length; i++) {
      var inst = state.deck[i];
      var no = inst && inst.card_no != null ? String(inst.card_no) : "";
      counts.set(no, (counts.get(no) || 0) + 1);
    }
    var keys = [];
    counts.forEach(function (_, key) {
      keys.push(key);
    });
    keys.sort();
    var s = 0x9e3779b1;
    s = Math.imul(s ^ ((k | 0) + 1), 0xc2b2ae3d) >>> 0;
    s = Math.imul(s ^ (keys.length + 1), 0x27d4eb2f) >>> 0;
    for (var ki = 0; ki < keys.length; ki++) {
      var key = keys[ki];
      var cnt = counts.get(key);
      for (var ci = 0; ci < key.length; ci++) {
        s = Math.imul(s ^ key.charCodeAt(ci), 0x85ebca77) >>> 0;
      }
      s = Math.imul(s ^ cnt, 0xc2b2ae3d) >>> 0;
      s = ((s << 13) | (s >>> 19)) >>> 0;
    }
    return s >>> 0;
  }

  function randomKDistinctIndices(n, k, rng) {
    rng = rng || Math.random;
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = i;
    for (var j = 0; j < k; j++) {
      var r = j + Math.floor(rng() * (n - j));
      var tmp = a[j];
      a[j] = a[r];
      a[r] = tmp;
    }
    return a.slice(0, k);
  }

  function monteCarloLiveSuccessAfterK(b, deltas, n, k, trials, rng) {
    rng = rng || Math.random;
    var ok = 0;
    for (var t = 0; t < trials; t++) {
      var pick = randomKDistinctIndices(n, k, rng);
      var ev = evalAfterExtraResolutionCards(b, deltas, pick);
      if (ev && ev.ok) ok++;
    }
    return (100 * ok) / trials;
  }

  function exactLiveSuccessAfterK(b, deltas, n, k) {
    var idx = [];
    for (var i = 0; i < k; i++) idx[i] = i;
    var ok = 0;
    var tot = 0;
    do {
      tot++;
      var ev = evalAfterExtraResolutionCards(b, deltas, idx);
      if (ev && ev.ok) ok++;
    } while (nextCombination(n, k, idx));
    return { pct: tot ? (100 * ok) / tot : 0, combinations: tot };
  }

  function addDelta(dst, src) {
    if (!src) return dst;
    var out = dst || { bh: {}, wild: 0 };
    out.bh = mergeNumericSlotAccums(out.bh, src.bh || {});
    out.wild = (out.wild || 0) + (src.wild || 0);
    return out;
  }

  function sumAllDeltas(deltas) {
    var out = { bh: {}, wild: 0 };
    for (var i = 0; i < deltas.length; i++) addDelta(out, deltas[i]);
    return out;
  }

  function withAppliedDeltaBundle(base, dsum) {
    var h = 0;
    var bh = 0;
    if (base.wildcardHeartBump != null || base.wildcardBhAllFlex != null) {
      h = base.wildcardHeartBump != null ? base.wildcardHeartBump : 0;
      bh = base.wildcardBhAllFlex != null ? base.wildcardBhAllFlex : 0;
    } else {
      h = base.wildcardAllBump || 0;
    }
    bh += dsum.wild || 0;
    return {
      mergedSupplyPreview: mergeNumericSlotAccums(base.mergedSupplyPreview, dsum.bh || {}),
      wildcardHeartBump: h,
      wildcardBhAllFlex: bh,
      wildcardAllBump: h + bh,
      needAccum: base.needAccum,
    };
  }

  /**
   * mode=board: B=盤面ブレード、R=公開(解決)枚数、残り k=max(0,B-R)
   * mode=whole: 山札+控え室の全カードを対象（デッキ全体）
   * いずれも「途中で山札切れ→控え室を山札化して続行」を反映。
   */
  function computeDeckDrawLiveSuccessSimulation(mode) {
    var runMode = mode === "whole" ? "whole" : "board";
    var b = evaluateLiveMechanicalFulfillmentBundle();
    var n = state.deck.length;
    var w = state.waitingRoom.length;
    var boardBlade = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var resR = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    var totalNeed = runMode === "whole" ? n + w : boardBlade;
    var alreadyRevealed = runMode === "whole" ? 0 : resR;
    var kRem = Math.max(0, totalNeed - alreadyRevealed);
    var baseMeta = {
      mode: runMode,
      blade: boardBlade,
      resR: resR,
      kRem: kRem,
      n: n,
      waiting: w,
      totalNeed: totalNeed,
      alreadyRevealed: alreadyRevealed,
    };
    if (!b.liveCt || b.needSum <= 0) {
      return Object.assign({ kind: "skip", pct: null }, baseMeta);
    }
    if (runMode === "board" && resR > boardBlade) {
      return Object.assign({ kind: "resolution_over_blade", pct: null }, baseMeta);
    }
    if (runMode === "board" && resR === boardBlade) {
      var okV = !!(b.evaluateResult && b.evaluateResult.ok);
      return Object.assign({ kind: "verdict", ok: okV, pct: okV ? 100 : 0 }, baseMeta);
    }
    if (kRem <= 0) {
      var z0 = !!(b.evaluateResult && b.evaluateResult.ok);
      return Object.assign({ kind: "base", pct: z0 ? 100 : 0, k: 0 }, baseMeta);
    }
    if (b.evaluateResult && b.evaluateResult.ok) {
      return Object.assign({ kind: "ok", pct: 100 }, baseMeta);
    }
    if (kRem > n + w) {
      return Object.assign({ kind: "insufficient_total_pool", pct: null }, baseMeta);
    }

    var deckDeltas = [];
    for (var i = 0; i < n; i++) deckDeltas.push(deckResolutionStyleDeltaForIndex(i));
    var waitDeltas = [];
    for (var wi = 0; wi < w; wi++) {
      var winst = state.waitingRoom[wi];
      var catw = mergedCatalogCard(winst);
      var bhw = {};
      addBladeHeartWeightsPerDisplaySlot(catw, bhw);
      var w7 = Number(bhw[7]);
      delete bhw[7];
      waitDeltas.push({ bh: bhw, wild: Number.isFinite(w7) && w7 > 0 ? Math.floor(w7) : 0 });
    }

    var fromDeck = Math.min(kRem, n);
    var fromWaiting = kRem - fromDeck;
    var wh =
      b.wildcardHeartBump != null || b.wildcardBhAllFlex != null
        ? b.wildcardHeartBump != null
          ? b.wildcardHeartBump
          : 0
        : b.wildcardAllBump || 0;
    var wb =
      b.wildcardHeartBump != null || b.wildcardBhAllFlex != null
        ? b.wildcardBhAllFlex != null
          ? b.wildcardBhAllFlex
          : 0
        : 0;
    var workingBase = {
      mergedSupplyPreview: b.mergedSupplyPreview,
      wildcardHeartBump: wh,
      wildcardBhAllFlex: wb,
      wildcardAllBump: wh + wb,
      needAccum: b.needAccum,
    };

    if (fromDeck === n && n > 0) {
      workingBase = withAppliedDeltaBundle(workingBase, sumAllDeltas(deckDeltas));
      fromDeck = 0;
    }

    function resolveOnPool(poolBase, poolDeltas, poolN, poolK, seedOffset) {
      if (poolK <= 0) {
        var h0 =
          poolBase.wildcardHeartBump != null || poolBase.wildcardBhAllFlex != null
            ? poolBase.wildcardHeartBump != null
              ? poolBase.wildcardHeartBump
              : 0
            : poolBase.wildcardAllBump || 0;
        var bh0 =
          poolBase.wildcardHeartBump != null || poolBase.wildcardBhAllFlex != null
            ? poolBase.wildcardBhAllFlex != null
              ? poolBase.wildcardBhAllFlex
              : 0
            : 0;
        var ev0 = evaluateNeedHeartFulfillment(poolBase.mergedSupplyPreview, poolBase.needAccum, {
          wildcardAllBump: h0,
          wildcardBhAllFlex: bh0,
        });
        return ev0 && ev0.ok ? 100 : 0;
      }
      if (poolK >= poolN) {
        var bsum = sumAllDeltas(poolDeltas);
        var h1 =
          poolBase.wildcardHeartBump != null || poolBase.wildcardBhAllFlex != null
            ? poolBase.wildcardHeartBump != null
              ? poolBase.wildcardHeartBump
              : 0
            : poolBase.wildcardAllBump || 0;
        var bh1 =
          poolBase.wildcardHeartBump != null || poolBase.wildcardBhAllFlex != null
            ? poolBase.wildcardBhAllFlex != null
              ? poolBase.wildcardBhAllFlex
              : 0
            : 0;
        var evAll = evaluateNeedHeartFulfillment(
          mergeNumericSlotAccums(poolBase.mergedSupplyPreview, bsum.bh),
          poolBase.needAccum,
          {
            wildcardAllBump: h1,
            wildcardBhAllFlex: bh1 + (bsum.wild || 0),
          },
        );
        return evAll && evAll.ok ? 100 : 0;
      }
      var LOG_MAX = Math.log(2000);
      if (poolK > 0 && logBinom(poolN, poolK) <= LOG_MAX) {
        return exactLiveSuccessAfterK(poolBase, poolDeltas, poolN, poolK).pct;
      }
      var seed = (deckMonteCarloSeed(poolK) ^ ((seedOffset | 0) >>> 0)) >>> 0;
      var rng = makeSeededRng(seed);
      return monteCarloLiveSuccessAfterK(poolBase, poolDeltas, poolN, poolK, 6000, rng);
    }

    var pct;
    if (fromDeck > 0) {
      pct = resolveOnPool(workingBase, deckDeltas, n, fromDeck, 0x51f15e);
      if (fromWaiting > 0) {
        // fromDeck >0 の場合は board mode で kRem <= n のはず。保険的に分岐を残す。
        return Object.assign({ kind: "warn", pct: null }, baseMeta);
      }
    } else {
      pct = resolveOnPool(workingBase, waitDeltas, w, fromWaiting, 0x9d3a77);
    }
    return Object.assign({ kind: "sim", pct: pct, k: kRem, fromDeck: Math.min(kRem, n), fromWaiting: fromWaiting }, baseMeta);
  }

  function deckLiveSimSuccessLine(sim) {
    if (!sim) return "成功確率：—";
    if (sim.kind === "skip" || sim.kind === "warn") return "成功確率：—";
    if (sim.kind === "resolution_over_blade") {
      return (
        "成功確率：—（解決 " +
        (sim.resR != null ? sim.resR : "—") +
        " 枚 ＞ ブレード " +
        (sim.blade != null ? sim.blade : "—") +
        " 枚）"
      );
    }
    if (sim.kind === "remFlip_over_deck") {
      return (
        "成功確率：—（あと " +
        (sim.kRem != null ? sim.kRem : "—") +
        " 枚めくる必要があるが山札は " +
        (sim.n != null ? sim.n : "—") +
        " 枚）"
      );
    }
    if (sim.kind === "insufficient_total_pool") {
      return "成功確率：—（必要めくり枚数が山札＋控え室を超えています）";
    }
    if (sim.kind === "verdict") {
      return sim.ok ? "判定：成功（解決がブレード枚数に達しました）" : "判定：失敗（解決がブレード枚数に達しました）";
    }
    if (sim.kind === "ok") return "成功確率：100％";
    var kShow = sim.kRem != null ? sim.kRem : sim.k != null ? sim.k : "?";
    if (sim.kind === "base") {
      if (sim.pct == null || !Number.isFinite(sim.pct)) return "成功確率：—（残りめくり " + kShow + " 枚）";
      return (
        "残り " + kShow + " 枚では山札起因の BH が加わらないため：成功確率：" + formatPctFromRate(sim.pct) + "％"
      );
    }
    if (sim.pct == null || !Number.isFinite(sim.pct)) return "成功確率：—";
    return "残り " + kShow + " 枚をランダムにめくった場合の成功確率：" + formatPctFromRate(sim.pct) + "％";
  }

  /** 左上ライブ成功確率：判定確定時は「判定：」を小さく「成功／失敗」を特大に */
  function deckLiveSimVerdictHtml(sim) {
    var tail = "（解決がブレード枚数に達しました）";
    if (sim.ok) {
      return (
        '<span class="deck-live-sim-line-label">判定：</span>' +
        '<span class="deck-live-sim-line-hit deck-live-sim-line-hit--ok">成功</span>' +
        '<span class="deck-live-sim-line-tail">' +
        escapeHtmlPlain(tail) +
        "</span>"
      );
    }
    return (
      '<span class="deck-live-sim-line-label">判定：</span>' +
      '<span class="deck-live-sim-line-hit deck-live-sim-line-hit--ng">失敗</span>' +
      '<span class="deck-live-sim-line-tail">' +
      escapeHtmlPlain(tail) +
      "</span>"
    );
  }

  function buildLiveSimBreakdownBody(b, sim) {
    var lines = [];
    lines.push(
      "モデル: " +
        (sim && sim.mode === "whole"
          ? "デッキ全体（山札+控え室）"
          : "盤面B（B=盤面ブレード、R=解決枚数）") +
        "。残りランダム k を計算。",
    );
    lines.push(
      "B = " +
        (sim && sim.blade != null ? sim.blade : "—") +
        " · R = " +
        (sim && sim.resR != null ? sim.resR : "—") +
        " · k = " +
        (sim && sim.kRem != null ? sim.kRem : sim && sim.k != null ? sim.k : "—") +
        " · 残り山札 n = " +
        (sim && sim.n != null ? sim.n : "—") +
        " · 控え室 w = " +
        (sim && sim.waiting != null ? sim.waiting : "—"),
    );
    if (b) {
      lines.push("ライブ枚数: " + (b.liveCt || 0) + " · need 合計: " + (b.needSum || 0));
      lines.push("need 内訳: " + formatLiveNeedHeartLine(b.needAccum));
      lines.push(
        "充足モデル: ライブ need_heart に対し、場メンバー所持H（ステージ＋ライブ枠）＋解決めくりの BH を合算。",
      );
      lines.push(
        "場メンバー所持H（充足に使用）: " + formatHeartSlotAccumBreakdown(b.boardHAcc),
      );
      lines.push(
        "解決ゾーン BH（充足の色源・slot7 除く）: " +
          formatBladeHeartSlotBreakdown(b.resolutionBhSlotsAcc || {}),
      );
      lines.push(
        "BH ALL（解決 slot7。有色不足にも充当・エールで k 枚増える分は上に加算）: " +
          (b.wildcardBhAllFlex != null ? b.wildcardBhAllFlex : "—"),
      );
      lines.push(
        "任意プール加算（場メンバーの play ALL heart のみ）: " +
          (b.wildcardHeartBump != null ? b.wildcardHeartBump : "—"),
      );
      lines.push(
        "参考・解決ゾーン所持H（成功判定には未使用）: " + formatHeartSlotAccumBreakdown(b.resHAcc),
      );
      if (b.evaluateResult && !b.evaluateResult.ok) {
        lines.push("現時点（追加ランダム前）の不足: " + formatLiveEvalFailShort(b.evaluateResult));
      }
    }
    if (sim) {
      lines.push("結果種別: " + sim.kind + (sim.pct != null && Number.isFinite(sim.pct) ? "（" + formatPctFromRate(sim.pct) + "％）" : ""));
    }
    return lines.join("\n");
  }

  /** 解決枚数とブレード・残りめくりの整合 */
  function syncResolutionOverBladeBanner() {
    var ban = $("resolution-over-blade-banner");
    if (!ban) return;
    var b = evaluateLiveMechanicalFulfillmentBundle();
    if (!b.liveCt || b.needSum <= 0) {
      ban.hidden = true;
      ban.textContent = "";
      return;
    }
    if (deckLiveSimMode === "whole") {
      ban.hidden = true;
      ban.textContent = "";
      return;
    }
    var resN = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    var blade = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var kRem = Math.max(0, blade - resN);
    var n = state.deck.length + state.waitingRoom.length;
    if (resN > blade) {
      ban.hidden = false;
      ban.textContent =
        "注意: 解決 " + resN + " 枚がブレード合計 " + blade + " 枚を超えています（モデル上、めくり過ぎです）。";
      return;
    }
    if (blade > 0 && kRem > n) {
      ban.hidden = false;
      ban.textContent =
        "注意: あと " + kRem + " 枚ランダムにめくる必要がありますが、山札＋控え室は " + n + " 枚しかありません。";
      return;
    }
    ban.hidden = true;
    ban.textContent = "";
  }

  function syncDeckLiveSimPanel() {
    var liveSimWrap = root.querySelector(".zone-block-deck-live-sim-under-preview");
    if (liveSimWrap) liveSimWrap.hidden = !state.liveStatsAfterBegin;
    if (!state.liveStatsAfterBegin) return;

    var disp = $("deck-flip-k-display");
    var bladeNoteEl = $("deck-flip-blade-note");
    var sumEl = $("deck-live-sim-summary");
    var stEl = $("deck-live-sim-stats");
    var modeSel = $("deck-live-sim-mode");
    if (!disp || !sumEl) return;
    if (modeSel) {
      modeSel.value = deckLiveSimMode === "whole" ? "whole" : "board";
    }
    var n = state.deck.length;
    var w = state.waitingRoom.length;
    var bladeK = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var resR = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    var kRem = deckLiveSimMode === "whole" ? n + w : Math.max(0, bladeK - resR);
    disp.textContent = String(kRem);
    if (bladeNoteEl) {
      if (deckLiveSimMode === "whole") {
        bladeNoteEl.textContent = "全体モード: 山札 " + n + " + 控え室 " + w + " の全カードを参照して成否を判定します。";
      } else {
        bladeNoteEl.textContent =
          "盤面Bモード: ブレード計 " + bladeK + " 枚 · 解決 " + resR + " 枚 · 残り山札 " + n + " 枚（R = B で成否確定）";
      }
    }

    cancelDeckLiveSimDeferred();
    if (state.liveTurnPickMode === true) {
      sumEl.classList.remove("is-ok", "is-warn", "is-fail", "has-prob-color");
      sumEl.style.removeProperty("--prob-color");
      sumEl.style.removeProperty("--prob-glow");
      sumEl.classList.remove("deck-live-sim-summary--verdict");
      sumEl.classList.add("is-muted");
      setOddsRichText(
        sumEl,
        "成功確率：—（ライブターン中は裏向きのため、ライブ開始で表面が見えてから計算します）",
        { heroLiveSim: true },
      );
      syncDeckLiveSimSummaryPctEmphasisClass(sumEl);
      var bdHold = $("deck-live-sim-breakdown-body");
      if (bdHold) bdHold.textContent = "";
      if (stEl) {
        stEl.hidden = true;
        stEl.textContent = "";
      }
      return;
    }

    if (typeof requestIdleCallback === "function") {
      deckLiveSimIdleHandle = requestIdleCallback(runDeckLiveSimHeavy, { timeout: 600 });
    } else {
      deckLiveSimIdleHandle = setTimeout(runDeckLiveSimHeavy, 0);
    }
    if (modeSel && modeSel.dataset.wiredLiveSim !== "1") {
      modeSel.dataset.wiredLiveSim = "1";
      modeSel.addEventListener("change", function () {
        deckLiveSimMode = modeSel.value === "whole" ? "whole" : "board";
        syncResolutionOverBladeBanner();
        syncDeckLiveSimPanel();
      });
    }
  }

  /** ライブ枠にあり、かつまだ「成功ライブ」ゾーンに載っていないライブ実体一覧 */
  function liveCardsAwaitingSuccessfulBenchPlacement() {
    var succLiveIds = new Set();
    state.successfulLiveArea.forEach(function (c) {
      if (c && c.type === T_LIVE && c.id) succLiveIds.add(String(c.id));
    });
    var pend = [];
    ["left", "center", "right"].forEach(function (k) {
      state.liveArea[k].forEach(function (c) {
        if (c.type !== T_LIVE) return;
        if (!succLiveIds.has(String(c.id))) pend.push(c);
      });
    });
    return pend;
  }

  function shouldPromptMoveSuccessfulLiveOnTurnStart(bundle) {
    if (!state.liveStatsAfterBegin) return false;
    var b =
      bundle ||
      (function () {
        return evaluateLiveMechanicalFulfillmentBundle();
      })();
    var liveCt = b.liveCt;
    if (!liveCt) return false;
    var needSum = b.needSum;
    if (!(needSum > 0)) return false;
    if (!b.evaluateResult || !b.evaluateResult.ok) return false;
    return liveCardsAwaitingSuccessfulBenchPlacement().length > 0;
  }

  /** ユーザー承諾済みなど：ライブ枠のライブカードのみ成功置き場へ（メンバーは残してから従来の控え処理へ） */
  function migratePendingLiveCardsToSuccessfulArea() {
    var moved = 0;
    ["left", "center", "right"].forEach(function (k) {
      var slot = state.liveArea[k];
      var kept = [];
      slot.forEach(function (c) {
        if (c.type === T_LIVE) {
          c.isRotated = false;
          c.lcWait = false;
          state.successfulLiveArea.push(c);
          moved++;
        } else kept.push(c);
      });
      state.liveArea[k] = kept;
    });
    if (moved) clearTurnScopedPlayBonusesEverywhere();
    return moved;
  }

  /** 指定 id のライブカード 1 枚だけを成功置き場へ（複数ライブ成功時の選択用） */
  function migrateOneLiveCardToSuccessfulAreaById(cardId) {
    var want = String(cardId);
    var moved = 0;
    ["left", "center", "right"].forEach(function (k) {
      if (moved) return;
      var slot = state.liveArea[k];
      for (var i = 0; i < slot.length; i++) {
        var c = slot[i];
        if (c && c.type === T_LIVE && String(c.id) === want) {
          c.isRotated = false;
          c.lcWait = false;
          state.successfulLiveArea.push(c);
          slot.splice(i, 1);
          moved++;
          return;
        }
      }
    });
    if (moved) clearTurnScopedPlayBonusesEverywhere();
    return moved;
  }

  /** @param {{ id: * }[]} pend @param {(id: string | null) => void} onDone */
  function openPickSuccessLiveDialog(pend, onDone) {
    var dlg = document.getElementById("dlg-pick-success-live");
    var list = document.getElementById("dlg-pick-success-live-list");
    var btnOk = document.getElementById("dlg-pick-success-live-ok");
    var btnCx = document.getElementById("dlg-pick-success-live-cancel");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(pend && pend[0] && pend[0].id != null ? String(pend[0].id) : null);
      return;
    }
    var html = "";
    pend.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "ライブ")).trim();
      html +=
        '<label class="dlg-pick-success-live__opt"><input type="radio" name="pickSuccLive" value="' +
        escapeHtmlPlain(String(c.id)) +
        '"' +
        (i === 0 ? " checked" : "") +
        " /> " +
        escapeHtmlPlain(lab) +
        "</label>";
    });
    list.innerHTML = html;
    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var r = list.querySelector('input[name="pickSuccLive"]:checked');
      cleanup();
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
      onDone(r && r.value ? String(r.value) : null);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
      onDone(null);
    }
    function onDismiss() {
      cleanup();
      onDone(null);
    }
    btnOk.addEventListener("click", onOk);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  /**
   * ライブ計算パネル「概要」— 不足色を列挙（evaluateNeedHeartFulfillment と同順ですべて）。
   */
  function buildLiveStatsOverviewText(_b, _rsBh) {
    var b = _b;
    var ev = b.evaluateResult;
    if (!b.liveCt) return "ライブカードが無い";
    if (!(b.needSum > 0)) return "必要ハート（need_heart）が無い";
    if (ev && ev.ok) {
      return "必要条件を充足（場メンバー所持H＋解決の BH で need を満たす）";
    }
    if (!ev || ev.ok) return "—";

    function fmtDeficit(d) {
      var slot = d.slot;
      if (slot >= 1 && slot <= 6) {
        return (
          bladeHeartDisplaySlotLabel(slot) +
          "があと" +
          d.deficit +
          "足りない（要" +
          (d.needAtFail != null ? d.needAtFail : "?") +
          "・今" +
          (d.haveAtFail != null ? d.haveAtFail : "?") +
          "）"
        );
      }
      if (slot === 0) {
        var pool = "poolAtFail" in d ? d.poolAtFail : d.haveAtFail;
        return (
          "任意があと" +
          d.deficit +
          "足りない（プール" +
          (pool != null ? pool : "?") +
          "／要" +
          (d.needAtFail != null ? d.needAtFail : "?") +
          "）"
        );
      }
      if (slot === 99) {
        return (
          "その他キーがあと" +
            d.deficit +
            "足りない（要" +
            (d.needAtFail != null ? d.needAtFail : "?") +
            "・今" +
            (d.haveAtFail != null ? d.haveAtFail : "?") +
            "）"
        );
      }
      return "要件が不足";
    }

    var gh =
      b.wildcardHeartBump != null || b.wildcardBhAllFlex != null
        ? b.wildcardHeartBump != null
          ? b.wildcardHeartBump
          : 0
        : b.wildcardAllBump != null
          ? b.wildcardAllBump
          : 0;
    var gb =
      b.wildcardHeartBump != null || b.wildcardBhAllFlex != null
        ? b.wildcardBhAllFlex != null
          ? b.wildcardBhAllFlex
          : 0
        : 0;
    var gaps = listAllNeedHeartDeficitsSequential(b.mergedSupplyPreview, b.needAccum, {
      wildcardAllBump: gh,
      wildcardBhAllFlex: gb,
    });
    if (gaps.length) return gaps.map(fmtDeficit).join(" · ");

    if (ev.deficit != null) return fmtDeficit(ev);
    return (ev.reason || "要件") + "が不足";
  }

  /**
   * デッキ確率グリッド（キー/キ②/キ③/中間/ライブ/指定 × 「今」の手動 k／各ターン開始時の累積モデル）。
   * 「nT開始時」行のベースはターン詳細の 3 数値：1T開始時の連続めくり k（既定1）、ライブで出す枚数（既定3）、次ターン開始のドロー（既定1）。
   * 「開幕マリガン込み」ON 時は、その戻し／ドロー枚数を「nT開始時」各行の累計 k にも加えます（開幕で山札から引いた分まで含めた目安）。
   * 2かすみオン時は見た3枚が次ターン手札へ入る想定で、2T開始時以降の行のベースに +3。
   * 2恋／13曜は applyDeckOddsPeekBonuses で各「ターン開始」行にも反映。
   * @returns {null | {
   *   deckTotal: number,
   *   dynLabel: string,
   *   categories: { id: string, label: string, count: number, isPick?: boolean }[],
   *   rows: { id: string, label: string, k: number, isDyn?: boolean }[],
   *   cells: number[][],
   *   pickEmpty: boolean,
   * }}
   */
  function buildDeckOddsGridModel() {
    var n = state.deck.length;
    if (n <= 0) return null;

    var keySet = new Set(deckKeyCardNos);
    var key2Set = new Set(deckKeyCard2Nos);
    var key3Set = new Set(deckKeyCard3Nos);
    var midSet = new Set(deckMiddleCardNos);
    var keyCount = 0;
    var key2Count = 0;
    var key3Count = 0;
    var midCount = 0;
    var liveCount = 0;
    for (var i = 0; i < n; i++) {
      var inst = state.deck[i];
      if (!inst) continue;
      var no = inst.card_no != null ? String(inst.card_no) : "";
      var isK = !!(no && keySet.has(no));
      var isK2 = !!(no && key2Set.has(no));
      var isK3 = !!(no && key3Set.has(no));
      var isM = !!(no && midSet.has(no));
      if (isK) keyCount++;
      if (isK2) key2Count++;
      if (isK3) key3Count++;
      if (isM) midCount++;
      if (inst.type === T_LIVE) liveCount++;
    }

    var pickCount = 0;
    if (deckPickSelectedNos.size > 0) {
      var counts = getDeckComposition();
      deckPickSelectedNos.forEach(function (no2) {
        pickCount += counts.get(no2) || 0;
      });
    }

    var useOpenMullBase =
      deckOddsOpeningMullBaselineOn &&
      openingMulliganRememberedK != null &&
      state.liveTurnPickMode !== true &&
      (!state.awaitingTurnStart || openingMulliganExecuteUsed);
    var baseKBeforePeek = computeEffectiveDeckOddsK();
    if (useOpenMullBase) baseKBeforePeek = openingMulliganRememberedK;
    var dynK = applyDeckOddsPeekBonuses(baseKBeforePeek, n);
    var dynLabel = "";
    if (state.awaitingTurnStart) {
      var mm = Array.isArray(state.mulliganSelectedIds) ? state.mulliganSelectedIds.length : 0;
      dynLabel = mm > 0 ? "マリガン戻し " + mm + "枚" : "マリガン参考";
    } else if (state.liveTurnPickMode === true) {
      var ch = liveTurnHandCheckCount();
      dynLabel = ch > 0 ? "ライブ手札 " + ch + "枚" : "ライブ参考";
    } else {
      dynLabel = "手動 k";
    }
    if (deckOddsOpeningMullBaselineOn && openingMulliganRememberedK != null) {
      dynLabel +=
        "／開幕マリガン " +
        openingMulliganRememberedK +
        " 枚込み：" +
        (useOpenMullBase ? "「今」はその枚数ベース・" : "") +
        "「nT開始時」は開幕で引いた枚数を累計 k に加算";
    }

    var hasKey = deckKeyCardNos.length > 0;
    var hasKey2 = deckKeyCard2Nos.length > 0;
    var hasKey3 = deckKeyCard3Nos.length > 0;
    var hasMid = deckMiddleCardNos.length > 0;
    var hasPick = deckPickSelectedNos.size > 0 && pickCount > 0;

    var rawCategories = [];
    if (hasKey) rawCategories.push({ id: "key", label: "キー", count: keyCount });
    if (hasKey2) rawCategories.push({ id: "key2", label: "キ②", count: key2Count });
    if (hasKey3) rawCategories.push({ id: "key3", label: "キ③", count: key3Count });
    if (hasMid) rawCategories.push({ id: "mid", label: "中間", count: midCount });
    rawCategories.push({ id: "live", label: "ライブ", count: liveCount });
    if (hasPick) rawCategories.push({ id: "pick", label: "指定", count: pickCount, isPick: true });
    var availableCategoryIds = rawCategories.map(function (c) { return c.id; });
    var categories = rawCategories.filter(function (cat) {
      return isDeckOddsCatVisible(cat.id);
    });

    var maxTurn = 3;
    if (deckOddsShowT5) maxTurn = 5;
    else if (deckOddsShowT4) maxTurn = 4;

    function rawDeckOddsTurnStartPeel(ti) {
      var t1 = Math.max(0, Math.floor(Number(deckOddsTimelineT1K)) || 0);
      var lp = Math.max(0, Math.floor(Number(deckOddsTimelineLivePlay)) || 0);
      var td = Math.max(0, Math.floor(Number(deckOddsTimelineTurnDraw)) || 0);
      var cum = t1;
      if (ti <= 1) return cum;
      for (var j = 2; j <= ti; j++) {
        cum += lp + td;
      }
      return cum;
    }

    var openingMullAddToTurnRows =
      deckOddsOpeningMullBaselineOn &&
      openingMulliganRememberedK != null &&
      Number.isFinite(Number(openingMulliganRememberedK));

    var rows = [{ id: "dyn", label: "今 k=" + dynK, k: Math.min(dynK, n), isDyn: true }];
    for (var ti = 1; ti <= maxTurn; ti++) {
      var rawTs = rawDeckOddsTurnStartPeel(ti);
      if (openingMullAddToTurnRows) rawTs += openingMulliganRememberedK;
      if (deckTwoKasumiEnabled && ti >= 2) rawTs += 3;
      var kTurn = applyDeckOddsPeekBonuses(rawTs, n);
      rows.push({ id: "t" + ti, label: ti + "T開始時", k: Math.min(kTurn, n) });
    }

    var cells = rows.map(function (r) {
      return categories.map(function (cat) {
        return probAtLeastOneInNextK(n, r.k, cat.count);
      });
    });

    return {
      deckTotal: n,
      dynLabel: dynLabel,
      categories: categories,
      availableCategoryIds: availableCategoryIds,
      rows: rows,
      cells: cells,
      pickEmpty: deckPickSelectedNos.size === 0,
    };
  }

  /** モデルから 1 つの host (div) に確率テーブル + 要約を描画 */
  function renderDeckOddsGridInto(host, model) {
    if (!host) return;
    if (!model) {
      host.innerHTML =
        '<p class="deck-odds-grid-empty muted">山札がありません。</p>';
      return;
    }
    var html = [];

    html.push('<div class="deck-odds-grid-meta">');
    html.push(
      '<span class="deck-odds-grid-deck-total">山札 <strong>' +
        model.deckTotal +
        "</strong> 枚</span>",
    );
    html.push(
      '<span class="deck-odds-grid-dyn muted">' +
        escapeHtmlPlain(model.dynLabel) +
        "</span>",
    );
    html.push("</div>");

    html.push('<div class="deck-odds-grid-scroll">');
    html.push('<table class="deck-odds-grid">');
    html.push("<thead><tr>");
    html.push('<th class="deck-odds-grid-row-head" scope="col">引く範囲</th>');
    model.categories.forEach(function (cat) {
      html.push(
        '<th scope="col"><span class="deck-odds-grid-cat-label">' +
          escapeHtmlPlain(cat.label) +
          '</span><span class="deck-odds-grid-cat-count muted">残 ' +
          cat.count +
          "</span></th>",
      );
    });
    html.push("</tr></thead><tbody>");
    model.rows.forEach(function (row, ri) {
      var rowCls = row.isDyn ? "deck-odds-grid-row deck-odds-grid-row--dyn" : "deck-odds-grid-row";
      html.push('<tr class="' + rowCls + '">');
      html.push(
        '<th class="deck-odds-grid-row-head" scope="row"><span class="deck-odds-grid-row-label">' +
          escapeHtmlPlain(row.label) +
          '</span><span class="deck-odds-grid-row-k muted">' +
          (row.isDyn ? "" : "k=" + row.k) +
          "</span></th>",
      );
      var cellsRow = model.cells[ri];
      cellsRow.forEach(function (rate) {
        var tier = deckOddsCellTierClass(rate);
        var cls = "deck-odds-cell" + (tier ? " " + tier : "");
        html.push('<td class="' + cls + '">' + formatPctFromRate(rate) + "%</td>");
      });
      html.push("</tr>");
    });
    html.push("</tbody></table>");
    html.push("</div>");
    host.innerHTML = html.join("");
  }

  /**
   * 要求色（有色のみ）: 供給と need の差のうち、足りない色だけを列挙。
   * heart0（任意色相・heart0）は対象外。有色がすべて足りていれば「達成」。
   */
  function formatStageHeartMinusNeedRemainderLine(stageHAcc, needAccum) {
    if (!needAccum || sumSlotAccumValues(needAccum) <= 0) return "—";
    var stAcc = stageHAcc || {};
    var parts = [];
    for (var s = 1; s <= 6; s++) {
      var nd = needAccum[s] || 0;
      if (nd <= 0) continue;
      var st = stAcc[s] || 0;
      var rem = st - nd;
      if (rem >= 0) continue;
      parts.push(bladeHeartDisplaySlotLabel(s) + " 不足 " + Math.abs(rem));
    }
    var nd99 = needAccum[99] || 0;
    if (nd99 > 0) {
      var st99 = stAcc[99] || 0;
      var rem99 = st99 - nd99;
      if (rem99 < 0) parts.push("その他キー 不足 " + Math.abs(rem99));
    }
    return parts.length ? parts.join(" · ") : "達成";
  }

  function syncLiveTurnStatsPanel() {
    var wrap = $("live-turn-stats-wrap");
    if (!wrap) return;
    if (!state.liveStatsAfterBegin) {
      wrap.hidden = true;
      var ov0 = $("live-stats-overview");
      if (ov0) {
        ov0.textContent = "";
        ov0.classList.remove("is-ok", "is-fail", "is-muted");
      }
      var reqCol0 = $("live-required-colors");
      if (reqCol0) reqCol0.classList.remove("live-stats-required-colors--met");
      syncLiveCenterScoreBar(null);
      return;
    }
    wrap.hidden = false;

    var b = evaluateLiveMechanicalFulfillmentBundle();
    var needAccum = b.needAccum;
    var needSum = b.needSum;
    var rsBh = accumulateResolutionBladeHeartStats();

    var overviewEl = $("live-stats-overview");
    if (overviewEl) {
      overviewEl.textContent = buildLiveStatsOverviewText(b, rsBh);
      overviewEl.classList.remove("is-ok", "is-fail", "is-muted");
      var ev0 = b.evaluateResult;
      if (!b.liveCt || !(needSum > 0)) overviewEl.classList.add("is-muted");
      else if (ev0 && ev0.ok) overviewEl.classList.add("is-ok");
      else overviewEl.classList.add("is-fail");
    }

    var needDet = $("live-need-heart-detail");
    if (needDet) needDet.innerHTML = liveStatsHeartishLineToHtml(formatLiveNeedHeartLine(needAccum));
    var needTot = $("live-need-heart-total");
    if (needTot) needTot.textContent = String(needSum);

    var reqCol = $("live-required-colors");
    if (reqCol) {
      var reqColLine = formatStageHeartMinusNeedRemainderLine(b.mergedSupplyPreview, needAccum);
      reqCol.innerHTML = liveStatsHeartishLineToHtml(reqColLine);
      reqCol.classList.toggle("live-stats-required-colors--met", reqColLine === "達成");
    }

    var tolEl = $("live-nonbh-tolerance");
    var tolHint = $("live-zone-hint-nonbh");
    if (tolEl) {
      if (!b.liveCt || !(needSum > 0)) {
        tolEl.textContent = "—";
        if (tolHint) tolHint.textContent = "";
      } else {
        var bladeBoard = sumBoardMemberBlades();
        var heartBoard = Math.round(
          (b.boardHSum != null ? b.boardHSum : 0) + (b.boardWild != null ? b.boardWild : 0),
        );
        var tolN = bladeBoard + heartBoard - needSum;
        tolEl.textContent = String(tolN);
        if (tolHint) {
          tolHint.textContent =
            "盤面ブレード合計 " +
            bladeBoard +
            " ＋ 盤面ハート合計 " +
            heartBoard +
            " − ライブ合計要求値 " +
            needSum +
            " ＝ " +
            tolN;
        }
      }
    }

    var boardTotalVis = (b.boardHSum != null ? b.boardHSum : 0) + (b.boardWild != null ? b.boardWild : 0);
    var boardHTot = $("live-board-h-total");
    if (boardHTot) boardHTot.textContent = String(Math.round(boardTotalVis));

    var bladeTot = $("live-total-blade");
    if (bladeTot) bladeTot.textContent = String(b.bladeSum);

    var stLine = formatHeartSlotAccumBreakdown(b.stageHAcc);
    var stEl = $("live-stage-h-colors");
    if (stEl) stEl.innerHTML = liveStatsHeartishLineToHtml(stLine && stLine !== "—" ? stLine : "—");

    var resBhEl = $("live-resolution-bh-ref");
    var resBhHint = $("live-zone-hint-resolution-bh");
    var bhLinePlain = formatBladeHeartSlotBreakdown(rsBh.slots || {});
    var hasSlotBreakdown = bhLinePlain && bhLinePlain !== "—";
    if (resBhEl) {
      if (hasSlotBreakdown) {
        resBhEl.classList.add("live-stats-metric-answer--rich");
        resBhEl.innerHTML = liveStatsHeartishLineToHtml(bhLinePlain);
      } else if (rsBh.totalBh) {
        resBhEl.classList.remove("live-stats-metric-answer--rich");
        resBhEl.textContent = String(rsBh.totalBh);
      } else {
        resBhEl.classList.remove("live-stats-metric-answer--rich");
        resBhEl.textContent = "—";
      }
    }
    if (resBhHint) {
      resBhHint.textContent = hasSlotBreakdown ? "解決ゾーン BH 内訳: " + bhLinePlain : "";
    }

    var verdict = $("live-success-verdict-line");
    if (verdict) {
      verdict.classList.remove("live-verdict--success", "live-verdict--fail", "live-verdict--muted");

      var vpLine = liveVerdictScorePoints(b);
      var ptsSuf = vpLine.hasMech ? " — " + String(vpLine.total) + "点" : "";

      if (!b.liveCt) {
        verdict.textContent = "ライブエリアにライブカードがありません。";
        verdict.classList.add("live-verdict--muted");
      } else if (needSum <= 0) {
        verdict.textContent = "必要ハート（need_heart）が定義されていません。";
        verdict.classList.add("live-verdict--muted");
      } else {
        var ev = b.evaluateResult;
        if (!ev.ok) {
          verdict.textContent = "ライブ失敗 — " + (ev.reason || "要件") + " が不足" + ptsSuf;
          verdict.classList.add("live-verdict--fail");
        } else {
          verdict.textContent = "ライブ成功" + ptsSuf;
          verdict.classList.add("live-verdict--success");
        }
      }
    }

    var bonEl = $("live-score-effect-bonus-display");
    if (bonEl)
      bonEl.textContent = String(Math.max(-99, Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0))));

    syncLiveCenterScoreBar(b);
  }

  /** 右下: 山札残りの非BH枚数と BH 色ごとの枚数 */
  function syncDeckRemainBhPanel() {
    var nonEl = $("deck-remain-nonbh-line");
    var colorsHost = $("deck-remain-bh-colors");
    if (!nonEl || !colorsHost) return;
    var n = state.deck.length;
    if (n <= 0) {
      nonEl.textContent = "山札がありません。";
      colorsHost.innerHTML = "";
      var deckRemHint0 = $("deck-remain-zone-hint");
      if (deckRemHint0) deckRemHint0.textContent = "";
      return;
    }
    var nonBh = 0;
    /** @type {Record<number, number>} */
    var slotCount = {};
    for (var i = 0; i < n; i++) {
      var inst = state.deck[i];
      var cat = getCard(inst && inst.card_no);
      if (!cat) {
        nonBh++;
        continue;
      }
      if (!cardHasBladeHeart(cat)) {
        nonBh++;
        continue;
      }
      var slots = bladeHeartSlotsOnCard(cat);
      slots.forEach(function (s) {
        slotCount[s] = (slotCount[s] || 0) + 1;
      });
    }
    nonEl.textContent = "";
    var parts = [];
    var orderedSlots = [1, 2, 3, 4, 7, 5, 6];
    for (var oi = 0; oi < orderedSlots.length; oi++) {
      var si = orderedSlots[oi];
      var cnt = slotCount[si] || 0;
      if (cnt <= 0) continue;
      parts.push(
        '<span class="deck-remain-bh-pill" data-bh-slot="' +
          si +
          '"><span class="deck-remain-bh-pill__lab">' +
          escapeHtmlPlain(bladeHeartDisplaySlotLabel(si)) +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(cnt)) +
          "</strong></span>",
      );
    }
    var nonBhPill =
      '<span class="deck-remain-bh-pill deck-remain-bh-pill--nonbh" data-bh-slot="non">' +
      '<span class="deck-remain-bh-pill__lab">非BH</span><strong class="deck-remain-bh-pill__n">' +
      escapeHtmlPlain(String(nonBh)) +
      "</strong></span>";
    var bodyRow = '<div class="deck-remain-bh-pill-row">' + nonBhPill + parts.join("") + "</div>";
    colorsHost.innerHTML = bodyRow;
    var deckRemHint = $("deck-remain-zone-hint");
    if (deckRemHint) {
      deckRemHint.textContent =
        "山札合計 " + n + " 枚。BH 色のピルはカード1枚につき複数色を持てる集計です（非BH は BH 記載のないカード枚数）。";
    }
  }

  function syncWaitingRemainBhPanel() {
    var nonEl = $("waiting-remain-nonbh-line");
    var colorsHost = $("waiting-remain-bh-colors");
    if (!nonEl || !colorsHost) return;
    var n = state.waitingRoom.length;
    if (n <= 0) {
      nonEl.textContent = "控え室にカードがありません。";
      colorsHost.innerHTML = "";
      var wh0 = $("waiting-remain-zone-hint");
      if (wh0) wh0.textContent = "";
      return;
    }
    var nonBh = 0;
    /** @type {Record<number, number>} */
    var slotCount = {};
    for (var wi = 0; wi < n; wi++) {
      var instW = state.waitingRoom[wi];
      var catW = getCard(instW && instW.card_no);
      if (!catW) {
        nonBh++;
        continue;
      }
      if (!cardHasBladeHeart(catW)) {
        nonBh++;
        continue;
      }
      var slotsW = bladeHeartSlotsOnCard(catW);
      slotsW.forEach(function (s) {
        slotCount[s] = (slotCount[s] || 0) + 1;
      });
    }
    nonEl.textContent = "";
    var partsW = [];
    var orderedSlotsW = [1, 2, 3, 4, 7, 5, 6];
    for (var oj = 0; oj < orderedSlotsW.length; oj++) {
      var sj = orderedSlotsW[oj];
      var cntW = slotCount[sj] || 0;
      if (cntW <= 0) continue;
      partsW.push(
        '<span class="deck-remain-bh-pill" data-bh-slot="' +
          sj +
          '"><span class="deck-remain-bh-pill__lab">' +
          escapeHtmlPlain(bladeHeartDisplaySlotLabel(sj)) +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(cntW)) +
          "</strong></span>",
      );
    }
    var nonBhPillW =
      '<span class="deck-remain-bh-pill deck-remain-bh-pill--nonbh" data-bh-slot="non">' +
      '<span class="deck-remain-bh-pill__lab">非BH</span><strong class="deck-remain-bh-pill__n">' +
      escapeHtmlPlain(String(nonBh)) +
      "</strong></span>";
    var bodyRowW = '<div class="deck-remain-bh-pill-row">' + nonBhPillW + partsW.join("") + "</div>";
    colorsHost.innerHTML = bodyRowW;
    var wh = $("waiting-remain-zone-hint");
    if (wh) {
      wh.textContent =
        "控え室合計 " + n + " 枚。BH 色のピルはカード1枚につき複数色を持てる集計です（非BH は BH 記載のないカード枚数）。";
    }
  }

  /** 右上ミラー廃止: 左グリッド用ロジックのみ残す */
  function syncDeckPickClassicOddsPanel() {
    syncDeckRemainBhPanel();
    syncWaitingRemainBhPanel();
  }

  function renderDeckRoleCardStack(host, wrap, cardNos) {
    if (!host || !wrap) return false;
    var ordered = [];
    var seen = new Set();
    for (var ki = 0; ki < cardNos.length; ki++) {
      var s = cardNos[ki] != null ? String(cardNos[ki]).trim() : "";
      if (!s || seen.has(s)) continue;
      seen.add(s);
      ordered.push(s);
    }
    if (!ordered.length) {
      host.innerHTML = "";
      host.classList.remove("deck-odds-key-stack--fan-right");
      wrap.hidden = true;
      return false;
    }
    var liveFirst = [];
    var otherNos = [];
    for (var oi = 0; oi < ordered.length; oi++) {
      var ono = ordered[oi];
      var oc = getCard(ono);
      if (oc && oc.type === T_LIVE) liveFirst.push(ono);
      else otherNos.push(ono);
    }
    ordered = liveFirst.concat(otherNos);
    wrap.hidden = false;
    host.innerHTML = "";
    host.classList.remove("deck-odds-key-stack--fan-right");
    ordered.forEach(function (no, idx) {
      var cat = getCard(no);
      var item = document.createElement("span");
      item.className = "deck-odds-key-stack__item";
      item.style.zIndex = String(ordered.length - idx);
      var tx = idx * 19;
      item.style.transform = "translate(" + tx + "px, " + idx * -4 + "px)";
      item.title = (cat && cat.name) || no;
      if (cat && cat.img) {
        var img = document.createElement("img");
        img.className = "deck-odds-key-stack__img";
        img.src = cat.img;
        img.alt = cat.name || no;
        img.width = 46;
        img.height = 64;
        img.decoding = "async";
        item.appendChild(img);
      } else {
        item.classList.add("deck-odds-key-stack__item--text");
        item.textContent = no;
      }
      host.appendChild(item);
    });
    return true;
  }

  function syncDeckOddsKeyStackVisual() {
    var hostWrap = $("deck-odds-role-visuals");
    if (!hostWrap) return;
    var hasAny = false;
    hasAny =
      renderDeckRoleCardStack($("deck-odds-key-stack"), $("deck-odds-role-key-wrap"), deckKeyCardNos) || hasAny;
    hasAny =
      renderDeckRoleCardStack($("deck-odds-key2-stack"), $("deck-odds-role-key2-wrap"), deckKeyCard2Nos) || hasAny;
    hasAny =
      renderDeckRoleCardStack($("deck-odds-key3-stack"), $("deck-odds-role-key3-wrap"), deckKeyCard3Nos) || hasAny;
    hasAny =
      renderDeckRoleCardStack($("deck-odds-mid-stack"), $("deck-odds-role-mid-wrap"), deckMiddleCardNos) || hasAny;
    hasAny =
      renderDeckRoleCardStack($("deck-odds-pick-stack"), $("deck-odds-role-pick-wrap"), Array.from(deckPickSelectedNos)) || hasAny;
    hostWrap.hidden = !hasAny;
  }

  /** 左: 確率グリッド。右下: 短文行のみ */
  function syncLeftDeckOddsPanel() {
    syncDeckOddsKeyStackVisual();
    syncDeckOddsSkillChks();
    syncDeckOddsOpeningMullBaselineBtn();
    syncDeckOddsTurnStepDom();
    var gridHost = $("live-deck-odds-grid");
    var model = buildDeckOddsGridModel();
    if (gridHost) renderDeckOddsGridInto(gridHost, model);
    refreshDeckOddsCatStashes(model && model.availableCategoryIds);
    syncDeckPickClassicOddsPanel();
    updateDeckPickOddsText();
  }

  var MEMBER_HB_STEP_MAX = 999;

  function memberPlayBonusFooterEl(c) {
    if (!c || c.type !== T_MEMBER) return null;
    ensureCardBoardFields(c);
    var heartEm = ["", "\ud83e\ude77", "\u2764\ufe0f", "\ud83d\udc9b", "\ud83d\udc9a", "\ud83d\udc99", "\ud83d\udc9c"];
    var frag = document.createElement("div");
    frag.className = "card-member-bonus-footer";
    frag.title = "追加の所持H／ブレード（非公式）";
    var has = false;
    var bladeExtra = sumPlayBonusBlade(c);
    var miaBlade = countMiaTaylorEnergyBladeBelow(c);
    var lzBlade = countBp1012LanzhuBonusBlade(c);
    var lzAllHeart = countBp1012LanzhuBonusAllHeart(c);
    if (bladeExtra > 0) {
      has = true;
      var sp = document.createElement("span");
      sp.className = "card-member-bonus-chip";
      var im = document.createElement("img");
      im.className = "card-member-bonus-blade-ico";
      im.src = MEMBER_BONUS_BLADE_IMG;
      im.alt = "ブレード";
      im.width = 14;
      im.height = 14;
      im.decoding = "async";
      sp.appendChild(im);
      sp.appendChild(document.createTextNode("+" + bladeExtra));
      frag.appendChild(sp);
    }
    if (miaBlade > 0) {
      has = true;
      var spM = document.createElement("span");
      spM.className = "card-member-bonus-chip card-member-bonus-chip--mia";
      spM.title = "ミア・テイラー（pb1-011）: 列内でこのメンバーの背面側のエネ1枚につき常時ブレード";
      var im2 = document.createElement("img");
      im2.className = "card-member-bonus-blade-ico";
      im2.src = MEMBER_BONUS_BLADE_IMG;
      im2.alt = "ブレード";
      im2.width = 14;
      im2.height = 14;
      im2.decoding = "async";
      spM.appendChild(im2);
      spM.appendChild(document.createTextNode("常時+" + miaBlade));
      frag.appendChild(spM);
    }
    if (lzBlade > 0) {
      has = true;
      var spLzB = document.createElement("span");
      spLzB.className = "card-member-bonus-chip card-member-bonus-chip--lanzhu";
      spLzB.title =
        "鐘 嵐珠（bp1-012）: ライブ枠にライブが3枚以上かつ虹ヶ咲シリーズのライブが1枚以上あるとき、常時ブレード+2";
      var imLz = document.createElement("img");
      imLz.className = "card-member-bonus-blade-ico";
      imLz.src = MEMBER_BONUS_BLADE_IMG;
      imLz.alt = "ブレード";
      imLz.width = 14;
      imLz.height = 14;
      imLz.decoding = "async";
      spLzB.appendChild(imLz);
      spLzB.appendChild(document.createTextNode("条件+" + lzBlade));
      frag.appendChild(spLzB);
    }
    for (var si = 1; si <= 6; si++) {
      var v = bonusHeartSlotRead(c, si);
      if (!v) continue;
      has = true;
      var sp2 = document.createElement("span");
      sp2.className = "card-member-bonus-chip";
      sp2.appendChild(document.createTextNode((heartEm[si] || "\u2764\ufe0f") + "+" + v));
      frag.appendChild(sp2);
    }
    var v7 = bonusHeartSlotRead(c, 7);
    if (v7) {
      has = true;
      var sp3 = document.createElement("span");
      sp3.className = "card-member-bonus-chip card-member-bonus-chip--all";
      sp3.title = "ALL ハート（任意支払い）";
      var ic = document.createElement("span");
      ic.className = "card-member-bonus-all-heart";
      ic.setAttribute("aria-hidden", "true");
      ic.textContent = "\u2665";
      sp3.appendChild(ic);
      sp3.appendChild(document.createTextNode("+" + v7));
      frag.appendChild(sp3);
    }
    if (lzAllHeart > 0) {
      has = true;
      var spLzA = document.createElement("span");
      spLzA.className = "card-member-bonus-chip card-member-bonus-chip--all card-member-bonus-chip--lanzhu";
      spLzA.title =
        "鐘 嵐珠（bp1-012）: ライブ枠にライブが3枚以上かつ虹ヶ咲シリーズのライブが1枚以上あるとき、ALLハート+2（任意プール）";
      var icLz = document.createElement("span");
      icLz.className = "card-member-bonus-all-heart";
      icLz.setAttribute("aria-hidden", "true");
      icLz.textContent = "\u2665";
      spLzA.appendChild(icLz);
      spLzA.appendChild(document.createTextNode("条件+" + lzAllHeart));
      frag.appendChild(spLzA);
    }
    return has ? frag : null;
  }

  function readMemberHbInputsFromDom() {
    var dlg = document.getElementById("dlg-member-hb");
    if (!dlg) {
      return { slotsAlways: {}, slotsTurn: {}, bladeAlways: 0, bladeTurn: 0 };
    }
    function step(sel) {
      var el = dlg.querySelector(sel);
      return el ? sanitizeNonNegativeInt(el.textContent) : 0;
    }
    var oA = {};
    var oT = {};
    for (var si = 1; si <= 7; si++) {
      var va = step('[data-member-hb-slot="' + si + '"][data-member-hb-scope="always"]');
      if (va > 0) oA[si] = va;
      var vt = step('[data-member-hb-slot="' + si + '"][data-member-hb-scope="turn"]');
      if (vt > 0) oT[si] = vt;
    }
    return {
      slotsAlways: oA,
      slotsTurn: oT,
      bladeAlways: step("[data-member-hb-blade][data-member-hb-scope=\"always\"]"),
      bladeTurn: step("[data-member-hb-blade][data-member-hb-scope=\"turn\"]"),
    };
  }

  function fillMemberHbDialog(inst) {
    var dlg = document.getElementById("dlg-member-hb");
    if (!dlg || !inst) return;
    ensureCardBoardFields(inst);
    var lead = document.getElementById("dlg-member-hb-lead");
    var mc = mergedCatalogCard(inst);
    if (lead) {
      var idLine = mc.card_no != null ? String(mc.card_no) + " · " : "";
      lead.textContent = (idLine + (mc.name || "")).trim() || "(メンバー)";
    }
    function setSlot(si, scope, mapKey) {
      var map =
        mapKey === "always"
          ? inst.playBonusHeartSlotsAlways
          : mapKey === "turn"
            ? inst.playBonusHeartSlotsTurn
            : inst.playBonusHeartSlots;
      var cur = map && (map[si] !== undefined ? map[si] : map[String(si)]);
      var el = dlg.querySelector(
        '[data-member-hb-slot="' + si + '"][data-member-hb-scope="' + scope + '"]',
      );
      if (el) el.textContent = String(sanitizeNonNegativeInt(cur));
    }
    for (var si = 1; si <= 7; si++) {
      setSlot(si, "always", "always");
      setSlot(si, "turn", "turn");
    }
    var ba = dlg.querySelector('[data-member-hb-blade][data-member-hb-scope="always"]');
    if (ba) ba.textContent = String(sanitizeNonNegativeInt(inst.playBonusBladeAlways));
    var bt = dlg.querySelector('[data-member-hb-blade][data-member-hb-scope="turn"]');
    if (bt) bt.textContent = String(sanitizeNonNegativeInt(inst.playBonusBladeTurn));
  }

  function openMemberHbEditor(inst) {
    if (!inst || inst.type !== T_MEMBER) return;
    memberHbDialogTarget = inst;
    fillMemberHbDialog(inst);
    var dlg = document.getElementById("dlg-member-hb");
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
  }

  (function wireMemberHbDialog() {
    var dlg = document.getElementById("dlg-member-hb");
    if (!dlg) return;

    /* ステップカウンタ（純粋にDOMだけ操作）は state を参照しないので一度だけ束縛して問題ない */
    if (dlg.dataset.llocgMemberHbStepWired !== "1") {
      dlg.dataset.llocgMemberHbStepWired = "1";
      dlg.addEventListener("click", function (ev) {
        var t = ev.target;
        var stepEl = t && typeof t.closest === "function" ? t.closest(".member-hb-step") : null;
        if (!stepEl || !dlg.contains(stepEl)) return;
        ev.preventDefault();
        ev.stopPropagation();
        var cur = sanitizeNonNegativeInt(stepEl.textContent);
        var nxt = ev.shiftKey ? Math.max(0, cur - 1) : Math.min(MEMBER_HB_STEP_MAX, cur + 1);
        stepEl.textContent = String(nxt);
      });
    }

    /* 適用／キャンセル／クリアは mountSimulator のクロージャ（state / memberHbDialogTarget / render など）を参照する。
     * mountSimulator は「デッキ編集へ戻る」「再マウント」のたびに再実行されるため、毎回ボタンをクローンして
     * 古いリスナを取り除き、現行クロージャで束縛し直さないと「適用しても反映されない」事象が起きる。 */
    function replaceWithFreshClone(id) {
      var el = document.getElementById(id);
      if (!el) return null;
      var n = el.cloneNode(true);
      el.parentNode.replaceChild(n, el);
      return n;
    }
    var applyBtn = replaceWithFreshClone("btn-member-hb-apply");
    var cancelBtn = replaceWithFreshClone("btn-member-hb-cancel");
    var resetBtn = replaceWithFreshClone("btn-member-hb-reset");
    function closeHb() {
      if (dlg) dlg.close();
      memberHbDialogTarget = null;
    }
    function zeroInputsInDialog() {
      dlg.querySelectorAll(".member-hb-step").forEach(function (el) {
        el.textContent = "0";
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        var tgt = memberHbDialogTarget;
        if (!tgt) {
          closeHb();
          return;
        }
        try {
          var pack = readMemberHbInputsFromDom();
          pushHistoryBefore("member-hb-adjust");
          var id = tgt && tgt.id;
          /* tgt がオーファン（state から差し替えられている）の場合、ミューテーションしても画面に出ない。
           * 必ず allZonesFlat() の中の生きているインスタンスを優先する。 */
          var live = null;
          if (id != null) {
            live = allZonesFlat().find(function (c) {
              return c && c.id === id;
            }) || null;
          }
          var real = live || tgt;
          real.playBonusHeartSlotsAlways = Object.assign({}, pack.slotsAlways);
          real.playBonusHeartSlotsTurn = Object.assign({}, pack.slotsTurn);
          real.playBonusBladeAlways = sanitizeNonNegativeInt(pack.bladeAlways);
          real.playBonusBladeTurn = sanitizeNonNegativeInt(pack.bladeTurn);
          real.playBonusHeartSlots = {};
          real.playBonusBlade = 0;
          ensureCardBoardFields(real);
          /* もし real が state 内のインスタンスではなかった場合（live がなかった場合）、
           * 同じ id を持つ全インスタンスにも値を上書きして反映漏れを防ぐ */
          if (!live && id != null) {
            allZonesFlat().forEach(function (c) {
              if (c && c.id === id) {
                c.playBonusHeartSlotsAlways = Object.assign({}, pack.slotsAlways);
                c.playBonusHeartSlotsTurn = Object.assign({}, pack.slotsTurn);
                c.playBonusBladeAlways = sanitizeNonNegativeInt(pack.bladeAlways);
                c.playBonusBladeTurn = sanitizeNonNegativeInt(pack.bladeTurn);
                c.playBonusHeartSlots = {};
                c.playBonusBlade = 0;
                ensureCardBoardFields(c);
              }
            });
          }
          closeHb();
          // microtask ベースの render() が別操作で潰れるケースがあるため同期レンダーで確実反映
          renderSynchronouslyOnce();
          cancelDeckLiveSimDeferred();
          runDeckLiveSimHeavy();
          syncLiveTurnStatsPanel();
          showToast("メンバーに追加の所持H／ブレードを適用しました（非公式調整・Undo可）");
        } catch (err) {
          console.error(err);
          showToast("適用できませんでした。ダイアログを閉じて再度お試しください。");
        }
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        closeHb();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        zeroInputsInDialog();
      });
    }
  })();

  function maybeAnnounceLiveTurnEaleToResolution(evt, snapBeforeDrag) {
    if (!state.liveStatsAfterBegin) return;
    var fromEl = evt && evt.from;
    if (!fromEl || fromEl.id !== "zone-deck") return;
    var toEl = targetZoneEl(evt.to);
    if (!toEl || toEl.id !== "zone-resolution") return;
    if (!snapBeforeDrag || !Array.isArray(snapBeforeDrag.resolutionArea)) return;
    var beforeCnt = snapBeforeDrag.resolutionArea.length;
    var afterCnt = state.resolutionArea.length;
    if (afterCnt <= beforeCnt) return;
    var added = afterCnt - beforeCnt;
    var beforeIdSet = new Set(
      snapBeforeDrag.resolutionArea.map(function (c) {
        return c && c.id;
      }),
    );
    var newInsts = state.resolutionArea.filter(function (c) {
      return c && !beforeIdSet.has(c.id);
    });
    newInsts.forEach(function (c) {
      if (!c || c.type !== T_LIVE) return;
      var cat = mergedCatalogCard(c);
      if (!cardIsNoteLiveCatalog(cat)) return;
      if (!Array.isArray(state.ealeNoteLiveHitIds)) state.ealeNoteLiveHitIds = [];
      if (state.ealeNoteLiveHitIds.indexOf(c.id) < 0) state.ealeNoteLiveHitIds.push(c.id);
    });
    var rsBh = accumulateResolutionBladeHeartStats();
    var bhLine =
      rsBh.totalBh > 0
        ? " BH 計 " + rsBh.totalBh + "（" + formatBladeHeartSlotBreakdown(rsBh.slots) + "）"
        : "";
    showToast(
      "エール — 「解決」へ +" +
        added +
        "（計 " +
        afterCnt +
        " 枚）。" +
        (bhLine ? " ライブ成功判定の「解決めくりの BH」に反映されます。" + bhLine : " 解決の BH がライブ成功判定に反映されます。"),
      { duration: 4000 },
    );
    logReplay("live-turn-eale-resolution", { flipCount: afterCnt, bhTotal: rsBh.totalBh });
  }

  /** 控え室リフレッシュ時の集計用（card_no 別） */
  function summarizeWaitingCardTypes(cards) {
    var m = new Map();
    cards.forEach(function (c) {
      var no = c.card_no || "?";
      var ent = m.get(no);
      if (!ent) {
        ent = { name: c.name || String(no), n: 0 };
        m.set(no, ent);
      }
      ent.n++;
    });
    return Array.from(m.entries())
      .sort(function (a, b) {
        return String(a[0]).localeCompare(String(b[0]), "ja");
      })
      .map(function (e) {
        return e[1].name + "（" + e[0] + "）×" + e[1].n;
      })
      .join("、 ");
  }

  function openWaitingRefreshSummaryDialog(fullPool) {
    var lives = fullPool.filter(function (c) {
      return c.type === T_LIVE;
    });
    var dlg = document.getElementById("dlg-waiting-refresh");
    var body = document.getElementById("dlg-waiting-refresh-body");
    if (!body) {
      return;
    }
    body.textContent = "";
    function appendBlock(title, lines) {
      var sec = document.createElement("section");
      sec.className = "dlg-waiting-refresh-section";
      var h = document.createElement("h4");
      h.textContent = title;
      sec.appendChild(h);
      lines.forEach(function (t) {
        var p = document.createElement("p");
        p.textContent = t;
        sec.appendChild(p);
      });
      body.appendChild(sec);
    }
    if (!lives.length) {
      appendBlock("ライブカード", ["山札に戻したプールの中に、ライブカードはありませんでした。"]);
    } else {
      var totalLine = "合計 " + lives.length + " 枚";
      var typeAll = summarizeWaitingCardTypes(lives);
      appendBlock("デッキに戻ったライブカード", [totalLine, "種類内訳: " + (typeAll || "—")]);

      var strictNonBh = lives.filter(function (c) {
        return !cardHasBladeHeart(bhModel(c));
      });
      var onpuBh = lives.filter(function (c) {
        return bladeHeartIsLiveAdditiveBladeHeart(bhModel(c));
      });
      var nonBhCountUser = strictNonBh.length + onpuBh.length;
      var bucketForTypes = strictNonBh.concat(onpuBh);
      appendBlock("非BH（指定どおりの集計）", [
        "枚数: " +
          nonBhCountUser +
          "（BH 非記載のライブ ＋ ♪ライブを非BH枚数に含めます）",
        "種類内訳: " + (summarizeWaitingCardTypes(bucketForTypes) || "—"),
      ]);
      appendBlock("音符BH（♪・ライブのブレードハート）", [
        "枚数: " + onpuBh.length,
        "種類内訳: " + (summarizeWaitingCardTypes(onpuBh) || "—"),
      ]);
    }
    if (dlg && typeof dlg.showModal === "function") {
      dlg.showModal();
    }
  }

  /** 山札が空で控えにカードがあれば、控えをシャッフルして山札に戻す（1 回分） */
  function tryReplenishDeckFromWaitingOnce() {
    if (state.deck.length > 0 || state.waitingRoom.length === 0) return false;
    pushHistoryBefore("waiting-refresh-deck");
    var pool = state.waitingRoom.slice();
    state.waitingRoom = [];
    state.deck = shuffle(pool);
    logReplay("waiting-refresh-deck", { cards: pool.length });
    showToast("リフレッシュが入りました");
    openWaitingRefreshSummaryDialog(pool);
    return true;
  }

  function tryReplenishDeckFromWaitingLoop() {
    while (state.deck.length === 0 && state.waitingRoom.length > 0) {
      tryReplenishDeckFromWaitingOnce();
    }
  }

  function snapshotBoard() {
    const raw = {
      deck: state.deck,
      previewScratch: state.previewScratch,
      deckPileOpen: state.deckPileOpen,
      deckPileFacesDown: state.deckPileFacesDown === true,
      stage: state.stage,
      liveArea: state.liveArea,
      successfulLiveArea: state.successfulLiveArea,
      waitingRoom: state.waitingRoom,
      hand: state.hand,
      resolutionArea: state.resolutionArea,
      energyArea: state.energyArea,
      turnCount: state.turnCount,
      awaitingTurnStart: state.awaitingTurnStart === true,
      mulliganSelectedIds: Array.isArray(state.mulliganSelectedIds)
        ? [...state.mulliganSelectedIds]
        : [],
      liveTurnPickMode: state.liveTurnPickMode === true,
      liveTurnHandSpreadPick: state.liveTurnHandSpreadPick === true,
      liveStatsAfterBegin: state.liveStatsAfterBegin === true,
      liveScoreEffectBonus: Math.max(-99, Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0))),
      ealeNoteLiveHitIds: Array.isArray(state.ealeNoteLiveHitIds) ? [...state.ealeNoteLiveHitIds] : [],
      liveTurnSelectedIds: Array.isArray(state.liveTurnSelectedIds)
        ? [...state.liveTurnSelectedIds]
        : [],
      pendingDrawYellHandDraws: Math.max(0, Math.floor(Number(state.pendingDrawYellHandDraws) || 0)),
      deckMeta: {
        activePlayDeckMap: normalizeDeckMapCounts(activePlayDeckMap),
        keyCardNos: deckKeyCardNos.slice(),
        keyCard2Nos: deckKeyCard2Nos.slice(),
        keyCard3Nos: deckKeyCard3Nos.slice(),
        middleCardNos: deckMiddleCardNos.slice(),
      },
    };
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(raw);
      } catch (_) {
        /* fall through */
      }
    }
    return JSON.parse(JSON.stringify(raw));
  }

  var playResumePersistTimer = 0;
  var playResumeLastFp = "";
  function schedulePersistPlayResume() {
    if (playResumePersistTimer) clearTimeout(playResumePersistTimer);
    playResumePersistTimer = setTimeout(function () {
      playResumePersistTimer = 0;
      try {
        var fpLive = fingerprintZonesFromLive();
        if (fpLive === playResumeLastFp) return;
        playResumeLastFp = fpLive;
        var fpSel = $("select-first-player");
        sessionStorage.setItem(
          STORAGE_PLAY_RESUME,
          JSON.stringify({
            v: 1,
            board: snapshotBoard(),
            uid: uid,
            firstPlayer: fpSel && fpSel.value != null ? String(fpSel.value) : "",
          }),
        );
      } catch (_e) {
        /* QuotaExceeded or session blocked */
      }
    }, 400);
  }

  /** ドラッグ前後の比較用（DOM 全体の stringify は重すぎる） */
  function fingerprintZonesFromShot(snap) {
    if (!snap || typeof snap !== "object") return "";
    function ids(arr) {
      return Array.isArray(arr) ? arr.map(function (c) { return c && c.id; }).join(",") : "";
    }
    var st = snap.stage || {};
    var la = snap.liveArea || {};
    var mullSel = "";
    if (Array.isArray(snap.mulliganSelectedIds)) {
      mullSel = snap.mulliganSelectedIds
        .slice()
        .map(function (x) {
          return String(x);
        })
        .sort()
        .join(",");
    }
    var liveSel = "";
    if (Array.isArray(snap.liveTurnSelectedIds)) {
      liveSel = snap.liveTurnSelectedIds
        .slice()
        .map(function (x) {
          return String(x);
        })
        .sort()
        .join(",");
    }
    return [
      snap.awaitingTurnStart === true ? "1" : "0",
      mullSel,
      snap.liveTurnPickMode === true ? "1" : "0",
      snap.liveTurnHandSpreadPick === true ? "1" : "0",
      snap.liveStatsAfterBegin === true ? "1" : "0",
      typeof snap.liveScoreEffectBonus === "number" && Number.isFinite(snap.liveScoreEffectBonus)
        ? String(Math.max(-99, Math.min(99, Math.floor(snap.liveScoreEffectBonus))))
        : "0",
      Array.isArray(snap.ealeNoteLiveHitIds)
        ? snap.ealeNoteLiveHitIds
            .slice()
            .map(function (x) {
              return String(x);
            })
            .sort()
            .join(",")
        : "",
      liveSel,
      typeof snap.pendingDrawYellHandDraws === "number" && Number.isFinite(snap.pendingDrawYellHandDraws)
        ? String(Math.max(0, Math.floor(snap.pendingDrawYellHandDraws)))
        : "0",
      snap.deckPileOpen ? "1" : "0",
      snap.deckPileFacesDown === true ? "1" : "0",
      typeof snap.turnCount === "number" ? String(Math.floor(snap.turnCount)) : "0",
      ids(snap.deck),
      ids(snap.hand),
      ids(snap.waitingRoom),
      ids(snap.resolutionArea),
      ids(snap.successfulLiveArea),
      ids(snap.previewScratch),
      ids(snap.energyArea),
      ids(st.left),
      ids(st.center),
      ids(st.right),
      ids(la.left),
      ids(la.center),
      ids(la.right),
    ].join("\x1f");
  }

  /** 読み込み済みの state に対応（クローンしない） */
  function fingerprintZonesFromLive() {
    return fingerprintZonesFromShot({
      awaitingTurnStart: state.awaitingTurnStart,
      mulliganSelectedIds: state.mulliganSelectedIds,
      liveTurnPickMode: state.liveTurnPickMode,
      liveTurnHandSpreadPick: state.liveTurnHandSpreadPick,
      liveStatsAfterBegin: state.liveStatsAfterBegin,
      liveScoreEffectBonus: state.liveScoreEffectBonus,
      ealeNoteLiveHitIds: state.ealeNoteLiveHitIds,
      liveTurnSelectedIds: state.liveTurnSelectedIds,
      pendingDrawYellHandDraws: state.pendingDrawYellHandDraws,
      deckPileOpen: state.deckPileOpen,
      deckPileFacesDown: state.deckPileFacesDown === true,
      turnCount: state.turnCount,
      deck: state.deck,
      previewScratch: state.previewScratch,
      stage: state.stage,
      liveArea: state.liveArea,
      successfulLiveArea: state.successfulLiveArea,
      waitingRoom: state.waitingRoom,
      hand: state.hand,
      resolutionArea: state.resolutionArea,
      energyArea: state.energyArea,
    });
  }
  function applyBoard(s) {
    if (!s || typeof s !== "object") return;
    state.deck = Array.isArray(s.deck) ? s.deck : [];
    state.previewScratch = Array.isArray(s.previewScratch) ? s.previewScratch : [];
    state.deckPileOpen = s.deckPileOpen === true;
    state.deckPileFacesDown = s.deckPileFacesDown === true;
    state.stage =
      s.stage && typeof s.stage === "object"
        ? s.stage
        : { left: [], center: [], right: [] };
    state.liveArea =
      s.liveArea && typeof s.liveArea === "object"
        ? s.liveArea
        : { left: [], center: [], right: [] };
    state.successfulLiveArea = Array.isArray(s.successfulLiveArea) ? s.successfulLiveArea : [];
    state.waitingRoom = Array.isArray(s.waitingRoom) ? s.waitingRoom : [];
    state.hand = Array.isArray(s.hand) ? s.hand : [];
    state.resolutionArea = Array.isArray(s.resolutionArea) ? s.resolutionArea : [];
    state.energyArea = Array.isArray(s.energyArea) ? s.energyArea : [];
    state.turnCount =
      typeof s.turnCount === "number" && Number.isFinite(s.turnCount) && s.turnCount >= 0
        ? Math.floor(s.turnCount)
        : 0;
    state.awaitingTurnStart = s.awaitingTurnStart === true;
    state.mulliganSelectedIds = Array.isArray(s.mulliganSelectedIds)
      ? s.mulliganSelectedIds.slice()
      : [];
    state.liveTurnPickMode = s.liveTurnPickMode === true;
    state.liveTurnHandSpreadPick = s.liveTurnHandSpreadPick === true;
    state.liveStatsAfterBegin = s.liveStatsAfterBegin === true;
    state.liveScoreEffectBonus =
      typeof s.liveScoreEffectBonus === "number" && Number.isFinite(s.liveScoreEffectBonus)
        ? Math.max(-99, Math.min(99, Math.floor(s.liveScoreEffectBonus)))
        : 0;
    state.ealeNoteLiveHitIds = Array.isArray(s.ealeNoteLiveHitIds)
      ? s.ealeNoteLiveHitIds
          .map(function (x) {
            return typeof x === "number" && Number.isFinite(x) ? Math.floor(x) : Number(x);
          })
          .filter(function (x) {
            return Number.isFinite(x);
          })
      : [];
    state.liveTurnSelectedIds = Array.isArray(s.liveTurnSelectedIds)
      ? s.liveTurnSelectedIds.slice()
      : [];
    state.pendingDrawYellHandDraws =
      typeof s.pendingDrawYellHandDraws === "number" && Number.isFinite(s.pendingDrawYellHandDraws)
        ? Math.max(0, Math.floor(s.pendingDrawYellHandDraws))
        : 0;
    if (s.deckMeta && typeof s.deckMeta === "object") {
      var dm = s.deckMeta;
      if (dm.activePlayDeckMap && typeof dm.activePlayDeckMap === "object") {
        activePlayDeckMap = normalizeDeckMapCounts(dm.activePlayDeckMap);
      }
      if (Array.isArray(dm.keyCardNos)) deckKeyCardNos = sanitizeDeckRoleCardNos(dm.keyCardNos);
      if (Array.isArray(dm.keyCard2Nos)) deckKeyCard2Nos = sanitizeDeckRoleCardNos(dm.keyCard2Nos);
      if (Array.isArray(dm.keyCard3Nos)) deckKeyCard3Nos = sanitizeDeckRoleCardNos(dm.keyCard3Nos);
      if (Array.isArray(dm.middleCardNos)) deckMiddleCardNos = sanitizeDeckRoleCardNos(dm.middleCardNos);
    }
    normalizeAllCardFields();
  }

  /** @param {HTMLElement | null | undefined} el */
  function zoneIsStage(el) {
    const id = el && el.id;
    return !!(id && /^stage-(left|center|right)$/.test(id));
  }

  /** @param {HTMLElement | null | undefined} el */
  function zoneIsLiveSlot(el) {
    const id = el && el.id;
    return !!(id && /^live-(left|center|right)$/.test(id));
  }

  /** @param {*} el Sortable が返すコンテナまたは DOM ノード */
  function sortableEventElement(el) {
    if (!el) return null;
    if (el.nodeType === 1) return el;
    if (el.el && el.el.nodeType === 1) return el.el;
    return null;
  }

  function stageMemberIdSetFromSnap(st) {
    const s = new Set();
    const stg = st && st.stage;
    if (!stg || typeof stg !== "object") return s;
    ["left", "center", "right"].forEach(function (k) {
      const arr = stg[k];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (c) {
        if (c && c.type === T_MEMBER && c.id) s.add(String(c.id));
      });
    });
    return s;
  }

  function stageMemberIdSetFromState() {
    const s = new Set();
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (c) {
        if (c.type === T_MEMBER && c.id) s.add(String(c.id));
      });
    });
    return s;
  }

  function findCardInstById(cardId) {
    if (!cardId) return null;
    var key = String(cardId);
    const pool = allZonesFlat();
    for (var i = 0; i < pool.length; i++) {
      if (pool[i] && pool[i].id === key) return pool[i];
    }
    return null;
  }

  /**
   * メンバーがステージに新しく載ったとき、コスト分の側面エネをウェイト（横向き）へ。
   * ステージ間の移動では stage のメンバー ID 集合が変わらないためスキップ。
   * 先行メンバーがいた列への登場（バトンタッチ）は、差分コスト相当だけ縦エネをウェイトへ（足りなくても登場は許可済み）。
   */
  function maybeRotateEnergyCostForMembersNewOnStage(snapBeforeDrag) {
    if (!snapBeforeDrag || typeof snapBeforeDrag !== "object") return;
    const prev = stageMemberIdSetFromSnap(snapBeforeDrag);
    const now = stageMemberIdSetFromState();
    const news = [];
    now.forEach(function (id) {
      if (!prev.has(id)) news.push(id);
    });
    if (!news.length) return;
    news.forEach(function (mid) {
      const inst = findCardInstById(mid);
      if (!inst || inst.type !== T_MEMBER) return;
      var col = stageColumnKeyHostingMember(mid);
      var prevMem = col ? incumbentFromSnapStageSlot(snapBeforeDrag, col, mid) : null;
      var wanted = effectiveStageAppearPrintedCost(inst, prevMem);
      if (!(wanted > 0)) return;
      var uprightBefore = snapBeforeDrag.energyArea
        ? countUprightEnergyInArea(snapBeforeDrag.energyArea)
        : 0;
      var need = wanted;
      var paid = 0;
      for (var ei = 0; ei < state.energyArea.length && need > 0; ei++) {
        var e = state.energyArea[ei];
        if (!e || e.type !== T_ENERGY) continue;
        if (!e.isRotated) {
          e.isRotated = true;
          paid++;
          need--;
        }
      }
      logReplay("auto-energy-wait-member", {
        memberId: mid,
        wanted: wanted,
        paid: paid,
        batonFromId: prevMem && prevMem.id ? String(prevMem.id) : "",
        fullPrintedCost: memberFlooredPrintedCost(inst),
        batonTouch: !!(prevMem && prevMem.type === T_MEMBER),
        uprightEnergyBeforeDrag: uprightBefore,
      });
      if (paid < wanted) {
        var msg =
          "【警告】本来必要な縦の側面エネ " +
          wanted +
          " 枚のうち、" +
          paid +
          " 枚しかウェイトにできませんでした（不足 " +
          (wanted - paid) +
          "）。ドラッグ開始時点の縦エネは " +
          uprightBefore +
          " 枚でした。メンバーは場に残しています。";
        if (prevMem) {
          msg +=
            "（バトン差分 " +
            wanted +
            " ＝ 新 " +
            memberFlooredPrintedCost(inst) +
            " − 退場 " +
            memberFlooredPrintedCost(prevMem) +
            "）。";
        }
        showToast(msg, { duration: 6000 });
      }
    });
  }

  /** バトンで同日に載せたばかりのメンバーを退けた場合の注意（配置自体は許可済み） */
  function warnAfterStageBatonSameTurnPolicy(snapBeforeDrag) {
    if (!snapBeforeDrag || typeof snapBeforeDrag !== "object") return;
    var prevIds = stageMemberIdSetFromSnap(snapBeforeDrag);
    var now = stageMemberIdSetFromState();
    var warned = false;
    now.forEach(function (nid) {
      if (warned) return;
      if (prevIds.has(nid)) return;
      var inst = findCardInstById(nid);
      if (!inst || inst.type !== T_MEMBER) return;
      var col = stageColumnKeyHostingMember(nid);
      if (!col) return;
      var prevCard = incumbentFromSnapStageSlot(snapBeforeDrag, col, nid);
      if (!prevCard) return;
      var oldInst = findCardInstById(prevCard.id);
      if (oldInst && memberIsStageFreshThisTurn(oldInst)) {
        warned = true;
        showToast(
          "【警告】このターンにステージへ載せたメンバーをバトンで控え室に送りました。公式と異なる扱いの場合は Undo で戻してください。",
          { duration: 5500 },
        );
      }
    });
  }

  /** stageTurnEntered はバトンタッチ制限・光彩のため退場後も残す（退場時に消さない） */
  function pruneStageTurnEnteredOffBoard() {}

  /** HUD のターン数と対応。「ターン開始」で増加。未設定メンバー（旧データ）は初回のみ現在値で埋める */
  function ensureStageMembersLegacyTurnAnchors() {
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (c) {
        if (c.type !== T_MEMBER) return;
        var t = c.stageTurnEntered;
        if (typeof t !== "number" || !Number.isFinite(t)) c.stageTurnEntered = state.turnCount;
      });
    });
  }

  /** ステージに新しく載ったメンバーだけ「載せたターン」を記録（載せターンより turnCount が進むと HUD の発光補助） */
  function stampNewStageMembersForGlow(snapBeforeDrag) {
    if (!snapBeforeDrag || typeof snapBeforeDrag !== "object") return;
    const prev = stageMemberIdSetFromSnap(snapBeforeDrag);
    const now = stageMemberIdSetFromState();
    now.forEach(function (id) {
      if (prev.has(id)) return;
      const inst = findCardInstById(id);
      if (inst && inst.type === T_MEMBER) inst.stageTurnEntered = state.turnCount;
    });
  }

  /** ドラッグ中は裏面表示（対面イメージ）。ライブ枠の表面隠しは data-ll-real-face-src に原版を渡す */
  function showCardBackWhileDragging(item) {
    if (!item) return;
    const img = item.querySelector(".card-img");
    if (!img || img.getAttribute("data-llocg-drag-orig-src")) return;
    const realFace = img.getAttribute("data-ll-real-face-src");
    var storeSrc = realFace || img.src;
    img.setAttribute("data-llocg-drag-orig-src", storeSrc);
    img.setAttribute("data-llocg-drag-orig-alt", img.alt || "");
    img.src = CARD_BACK_DRAG_DATA_URI;
    img.alt = "（ドラッグ中・裏面）";
  }

  function restoreCardFaceAfterDragging(item) {
    if (!item) return;
    const img = item.querySelector(".card-img");
    if (!img) return;
    const os = img.getAttribute("data-llocg-drag-orig-src");
    if (os) {
      img.src = os;
      img.removeAttribute("data-llocg-drag-orig-src");
    }
    const oa = img.getAttribute("data-llocg-drag-orig-alt");
    if (oa !== null) {
      img.alt = oa;
      img.removeAttribute("data-llocg-drag-orig-alt");
    }
  }

  /** ライブエリアへメンバーを置いたときだけ手札に1ドロー */
  function maybeAutoDrawHandAfterLiveMemberSet(evt) {
    const item = evt.item;
    if (!item || item.dataset.type !== T_MEMBER) return;
    const toEl = sortableEventElement(evt.to);
    const fromEl = sortableEventElement(evt.from);
    if (!toEl || !fromEl) return;
    if (!zoneIsLiveSlot(toEl)) return;
    if (zoneIsLiveSlot(fromEl)) return;
    tryReplenishDeckFromWaitingLoop();
    if (!state.deck.length) {
      showToast("山札が空のためドローできません");
      logReplay("auto-draw-live-empty-deck");
      return;
    }
    var drawnLm = state.deck.shift();
    markCardFlashDraw(drawnLm);
    state.hand.push(drawnLm);
    logReplay("auto-draw-live-member", { to: toEl.id });
    showToast("ライブエリアにメンバーを置いたので手札に 1 枚ドローしました");
  }
  /** 旧スナップショット互換・既定値（常時／ターン別の +H/B） */
  function ensureCardBoardFields(c) {
    if (!c || typeof c !== "object") return;
    if (c.lcWait !== true) c.lcWait = false;
    if (c.lcActive !== true && c.lcActive !== false) c.lcActive = true;
    if (typeof c.isRotated !== "boolean") c.isRotated = false;

    if (!c.playBonusHeartSlotsAlways || typeof c.playBonusHeartSlotsAlways !== "object" || Array.isArray(c.playBonusHeartSlotsAlways)) {
      c.playBonusHeartSlotsAlways = {};
    }
    if (!c.playBonusHeartSlotsTurn || typeof c.playBonusHeartSlotsTurn !== "object" || Array.isArray(c.playBonusHeartSlotsTurn)) {
      c.playBonusHeartSlotsTurn = {};
    }
    if (!c.playBonusHeartSlots || typeof c.playBonusHeartSlots !== "object" || Array.isArray(c.playBonusHeartSlots)) {
      c.playBonusHeartSlots = {};
    }
    var legH = c.playBonusHeartSlots;
    if (legH && Object.keys(legH).length) {
      Object.keys(legH).forEach(function (k) {
        var vk = sanitizeNonNegativeInt(legH[k]);
        if (vk > 0) {
          var nk = Number(k);
          var slot = nk === nk ? nk : k;
          c.playBonusHeartSlotsAlways[slot] = sanitizeNonNegativeInt(c.playBonusHeartSlotsAlways[slot]) + vk;
        }
      });
      c.playBonusHeartSlots = {};
    }

    if (c.playBonusBladeAlways == null || !Number.isFinite(Number(c.playBonusBladeAlways))) {
      c.playBonusBladeAlways = 0;
    }
    if (c.playBonusBladeTurn == null || !Number.isFinite(Number(c.playBonusBladeTurn))) {
      c.playBonusBladeTurn = 0;
    }
    c.playBonusBladeAlways = Math.max(0, Math.floor(Number(c.playBonusBladeAlways)));
    c.playBonusBladeTurn = Math.max(0, Math.floor(Number(c.playBonusBladeTurn)));

    var legacyB = Number(c.playBonusBlade);
    if (Number.isFinite(legacyB) && legacyB > 0) {
      c.playBonusBladeAlways += Math.max(0, Math.floor(legacyB));
    }
    c.playBonusBlade = 0;
  }

  function normalizeAllCardFields() {
    allZonesFlat().forEach(ensureCardBoardFields);
  }

  function pushHistoryBefore(act) {
    undoHistory.push(snapshotBoard());
    trimUndo();
    redoHistory.length = 0;
    logReplay(act || "action");
  }

  function clearEnergyDropHints() {
    ["stage-left", "stage-center", "stage-right"].forEach(function (id) {
      $(id)?.classList.remove("stage-slot--energy-hint");
    });
  }

  function refreshEnergyDropHints(dragEl) {
    ["stage-left", "stage-center", "stage-right"].forEach(function (id) {
      const zone = $(id);
      if (!zone) return;
      const hasMem = [...zone.querySelectorAll(".card-item")].some(function (n) {
        return n !== dragEl && n.dataset.type === T_MEMBER;
      });
      zone.classList.toggle("stage-slot--energy-hint", !!hasMem && dragEl?.dataset?.type === T_ENERGY);
    });
  }

  function openCardZoomFromImg(img) {
    if (!img) return;
    var dlg = document.getElementById("dlg-card-zoom");
    var zi = document.getElementById("dlg-zoom-img");
    var cap = document.getElementById("dlg-zoom-caption");
    if (!dlg || !zi) return;
    var faceSrc = img.getAttribute("data-ll-real-face-src");
    zi.src = faceSrc || img.src;
    zi.alt = img.alt || "";
    if (cap) cap.textContent = img.title || img.alt || "";
    if (dlg.showModal) dlg.showModal();
    logReplay("card-zoom-open");
  }

  function findBoardCardByInstanceId(cid) {
    var s = cid == null ? "" : String(cid);
    if (!s) return null;
    return (
      allZonesFlat().find(function (c) {
        return c && c.id != null && String(c.id) === s;
      }) || null
    );
  }

  function augmentBladeGainReadWiki(raw) {
    if (raw == null || typeof raw !== "string") return "";
    var needle = "ブレードを得る";
    var out = "";
    var cursor = 0;
    while (true) {
      var idx = raw.indexOf(needle, cursor);
      if (idx < 0) {
        out += raw.slice(cursor);
        break;
      }
      out += raw.slice(cursor, idx);
      var seg = raw.slice(0, idx);
      var reBl = /\{\{[^}]*blade[^}]*\}\}/gi;
      var n = 0;
      var m;
      while ((m = reBl.exec(seg)) !== null) n++;
      out += n > 0 ? "ブレード⚔️×" + n + "を得る" : needle;
      cursor = idx + needle.length;
    }
    return out;
  }

  function wikiAbilityToReadableHtml(s, escHtml) {
    if (s == null || typeof s !== "string") return "";
    var augmented = augmentBladeGainReadWiki(String(s));
    var plain = augmented.replace(/\{\{[^}]*\|([^}]*)\}\}/g, "$1").trim();
    return escHtml(plain).replace(/\n/g, "<br>");
  }

  function heartColorSlotEmoji(slotNum) {
    var n = Number(slotNum);
    if (n === 1) return "🩷";
    if (n === 2) return "❤️";
    if (n === 3) return "💛";
    if (n === 4) return "💚";
    if (n === 5) return "💙";
    if (n === 6) return "💜";
    if (n === 0) return "🤍";
    return "♥️";
  }

  function bhSlotEmoji(slotNum) {
    var n = Number(slotNum);
    if (n >= 1 && n <= 6) return heartColorSlotEmoji(n);
    if (n === 7) return "🤍";
    return "♥️";
  }

  function formatBladeHeartEmojiLine(bh) {
    if (!bh || typeof bh !== "object") return "";
    var parts = [];
    Object.keys(bh).forEach(function (k) {
      var slot = parseBladeHeartSlotFromKey(k);
      var v = Number(bh[k]);
      if (!Number.isFinite(v) || v === 0) return;
      var em = slot == null ? "⚪" : bhSlotEmoji(slot);
      parts.push({ ord: slot == null ? 99 : slot, s: em + "×" + v });
    });
    parts.sort(function (a, b) {
      return a.ord - b.ord;
    });
    return parts
      .map(function (p) {
        return p.s;
      })
      .join(" ");
  }

  function formatHeartRecordEmojiLine(h) {
    if (!h || typeof h !== "object") return "";
    var parts = [];
    Object.keys(h).forEach(function (k) {
      var slot = parseHeartColorSlotFromKey(k);
      if (slot == null) return;
      var v = Number(h[k]);
      if (!Number.isFinite(v) || v === 0) return;
      parts.push({ ord: slot, s: heartColorSlotEmoji(slot) + "×" + v });
    });
    parts.sort(function (a, b) {
      return a.ord - b.ord;
    });
    return parts
      .map(function (p) {
        return p.s;
      })
      .join(" ");
  }

  /** @param {*} c 盤上カード実体 */
  function openCardCatalogDetail(c) {
    if (!c || typeof c !== "object") return;
    var mc = mergedCatalogCard(c);
    var dlg = document.getElementById("dlg-card-catalog");
    var sub = document.getElementById("dlg-card-catalog-subtitle");
    var bodyEl = document.getElementById("dlg-card-catalog-body");
    var effectSlot = document.getElementById("dlg-card-catalog-effect-slot");
    var imgCatalog = document.getElementById("dlg-card-catalog-img");
    var badgeEl = document.getElementById("dlg-card-catalog-type-badges");
    var h2 = document.getElementById("dlg-card-catalog-title");
    if (!dlg || !bodyEl || !mc) return;

    function esc(x) {
      return String(x == null ? "" : x)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function row(dt, dd) {
      return (
        '<div class="dlg-card-catalog-row"><dt>' +
        esc(dt) +
        "</dt><dd>" +
        dd +
        "</dd></div>"
      );
    }

    var nm = mc.name || c.name || "カード情報";
    if (h2) h2.textContent = nm;
    if (sub) sub.textContent = mc.card_no || c.card_no || "";

    if (imgCatalog) {
      var src = mc.img || c.img || "";
      if (src) {
        imgCatalog.src = src;
        imgCatalog.alt = nm;
        imgCatalog.hidden = false;
      } else {
        imgCatalog.removeAttribute("src");
        imgCatalog.alt = "";
        imgCatalog.hidden = true;
      }
    }

    var ty = mc.type || c.type || "—";
    var isLive = ty === T_LIVE;
    var isMember = ty === T_MEMBER;

    if (badgeEl) {
      var bits = [];
      if (isLive && catalogLiveCardIsDrawYellBladeHeart(mc))
        bits.push('<span class="dlg-card-catalog-badge" title="ドローエール（BH）">🎴</span>');
      if (isLive && cardIsNoteLiveCatalog(mc))
        bits.push('<span class="dlg-card-catalog-badge" title="音符ライブ">🎵</span>');
      badgeEl.innerHTML = bits.join(" ");
    }

    var rows = "";
    rows += row("タイプ", esc(ty));

    var costN = mc.cost != null ? mc.cost : c.cost;
    if (costN != null && String(costN) !== "") rows += row(isLive ? "スコア" : "コスト／スコア", esc(costN));

    var bladeN = mc.blade != null ? mc.blade : c.blade;
    if (!isLive && bladeN != null && String(bladeN) !== "") rows += row("ブレード", esc(bladeN));

    if (mc.unit) rows += row("ユニット", esc(mc.unit));
    if (mc.series) rows += row("シリーズ", esc(mc.series));
    if (mc.product) rows += row("商品", esc(mc.product));
    if (mc.rare) rows += row("レアリティ", esc(mc.rare));

    var bhLine = formatBladeHeartEmojiLine(mc.blade_heart);
    if (bhLine) rows += row("BH", bhLine);

    if (isMember) {
      var held = formatHeartRecordEmojiLine(mc.base_heart);
      if (held) rows += row("所持ハート", held);
    }
    if (isLive) {
      var needL = formatHeartRecordEmojiLine(mc.need_heart);
      if (needL) rows += row("必要ハート", needL);
    }

    var abHtml = wikiAbilityToReadableHtml(mc.ability || "", esc);

    bodyEl.innerHTML = '<dl class="dlg-card-catalog-dl">' + rows + "</dl>";

    if (effectSlot) {
      if (abHtml) {
        effectSlot.innerHTML =
          '<h3 class="dlg-card-catalog-ability-heading">効果テキスト</h3><div class="dlg-card-catalog-ability">' +
          abHtml +
          "</div>";
      } else {
        effectSlot.innerHTML =
          '<p class="muted dlg-card-catalog-no-effect">効果テキストはカードDBに未定義または取得できませんでした。</p>';
      }
    }

    if (dlg.showModal) dlg.showModal();
    logReplay("card-catalog-detail-open");
  }

  function wireStageMemberCatalogAndLongZoom(imgEl, divEl, boardCard) {
    var longMs = 480;
    var moveCap = 10;
    var longTimer = null;
    var suppressedClick = false;
    var sx = 0;
    var sy = 0;
    function killTimer() {
      if (longTimer) {
        clearTimeout(longTimer);
        longTimer = null;
      }
    }
    divEl.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0) return;
        var ign = e.target.closest(".stance-chip, .card-no-drag, .card-pick-wrap, .card-flash-plus-one");
        if (ign) return;
        killTimer();
        suppressedClick = false;
        sx = e.clientX;
        sy = e.clientY;
        longTimer = window.setTimeout(function () {
          longTimer = null;
          suppressedClick = true;
          openCardZoomFromImg(imgEl);
          try {
            e.preventDefault();
          } catch (_) {}
        }, longMs);
      },
      true,
    );
    divEl.addEventListener(
      "pointermove",
      function (e) {
        if (!longTimer) return;
        if (Math.abs(e.clientX - sx) > moveCap || Math.abs(e.clientY - sy) > moveCap) killTimer();
      },
      true,
    );
    divEl.addEventListener(
      "pointerup",
      function () {
        killTimer();
      },
      true,
    );
    divEl.addEventListener(
      "pointercancel",
      function () {
        killTimer();
      },
      true,
    );
    imgEl.addEventListener(
      "click",
      function (e) {
        if (e.target.closest(".stance-chip, .card-no-drag, .card-pick-wrap")) return;
        if (Date.now() - lastDragEndAt < 550) return;
        if (suppressedClick) {
          suppressedClick = false;
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        openCardCatalogDetail(boardCard);
      },
      true,
    );
  }

  function cardEl(c, opts) {
    opts = opts || {};
    ensureCardBoardFields(c);

    const div = document.createElement("div");
    div.className = "card-item";
    div.dataset.id = c.id;
    div.dataset.type = c.type;

    if (opts.forceLiveHorizontal) div.classList.add("card-item--live-h");
    if (c.lcWait === true) div.classList.add("card-item--lc-wait");
    if (c.lcActive === false) div.classList.add("card-item--lc-inactive");
    if (opts.successLiveAlwaysGlow) div.classList.add("card-item--success-live-glow");
    if (opts.liveVenueBoost) div.classList.add("card-item--live-venue-boost");
    if (opts.catalogKidouGlow) div.classList.add("card-item--catalog-kidou");

    if (c.img) {
      const img = document.createElement("img");
      if (opts.hideFaceBehindBack) {
        img.setAttribute("data-ll-real-face-src", c.img);
        img.src = CARD_BACK_DRAG_DATA_URI;
        img.alt = "（ライブ置き場・表面非表示）";
      } else if (opts.deckFaceHidden) {
        img.setAttribute("data-ll-real-face-src", c.img);
        img.src = CARD_BACK_DRAG_DATA_URI;
        img.alt = "（山札一覧・表面非表示／ダブルクリックで拡大）";
      } else {
        img.src = c.img;
        img.alt = c.name || "";
      }
      img.title = String(c.card_no ? c.card_no + " · " + c.name : c.name || "");
      img.draggable = false;
      img.decoding = "async";
      if (!opts.hideFaceBehindBack && !opts.deckFaceHidden) {
        img.loading = "lazy";
        img.fetchPriority = "low";
      }
      img.className = "card-img";
      if (opts.forceLiveHorizontal) img.classList.add("rotated");
      else if (c.isRotated) img.classList.add("rotated");
      if (opts.stageCatalogLongZoom === true && c.img) {
        wireStageMemberCatalogAndLongZoom(img, div, c);
      } else if (opts.catalogImgClickDetail === true) {
        img.addEventListener(
          "click",
          function (e) {
            if (e.target.closest(".stance-chip, .card-no-drag, .card-pick-wrap")) return;
            if (Date.now() - lastDragEndAt < 550) return;
            e.stopPropagation();
            e.preventDefault();
            openCardCatalogDetail(c);
          },
          true,
        );
      } else if (typeof opts.onRotate === "function" && !opts.stageRotateChip) {
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onRotate();
        });
      } else if (opts.zoomClick) {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", function (e) {
          e.stopPropagation();
          e.preventDefault();
          openCardZoomFromImg(img);
        });
      }
      div.appendChild(img);
    } else {
      const sp = document.createElement("span");
      sp.textContent = c.name;
      div.appendChild(sp);
    }

    if (opts.mulliganPick) {
      const lab = document.createElement("label");
      lab.className = "card-pick-wrap card-pick-wrap--mulligan card-no-drag";
      lab.title = "マリガンで山札に戻す";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "mulligan-pick card-no-drag";
      cb.title = lab.title;
      cb.checked = !!opts.mulliganPick.isOn;
      cb.addEventListener("click", function (e) {
        e.stopPropagation();
      });
      cb.addEventListener("change", function () {
        opts.mulliganPick.onToggle(c.id, cb.checked);
      });
      lab.appendChild(cb);
      div.appendChild(lab);
    }

    if (opts.liveTurnPick) {
      const lab = document.createElement("label");
      lab.className = "card-pick-wrap card-pick-wrap--live-turn card-no-drag";
      lab.title = "ライブエリアへ置くカードにチェック";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "live-turn-pick card-no-drag";
      cb.title = lab.title;
      cb.checked = !!opts.liveTurnPick.isOn;
      cb.addEventListener("click", function (e) {
        e.stopPropagation();
      });
      cb.addEventListener("change", function () {
        opts.liveTurnPick.onToggle(c.id, cb.checked);
      });
      lab.appendChild(cb);
      div.appendChild(lab);
    }

    if (opts.stanceBar) {
      const bar = document.createElement("div");
      bar.className = "card-stance-bar";
      if (typeof opts.onRotate === "function" && opts.stageRotateChip === true) {
        const mkRot = document.createElement("button");
        mkRot.type = "button";
        mkRot.className = "stance-chip stance-rotate";
        mkRot.textContent = "↻";
        mkRot.title = "向きを切り替え（縦／横）";
        mkRot.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          opts.onRotate();
        });
        bar.appendChild(mkRot);
      }
      const mkWait = document.createElement("button");
      mkWait.type = "button";
      mkWait.className = "stance-chip stance-wait" + (c.lcWait === true ? " is-on" : "");
      mkWait.textContent = "W";
      mkWait.title = "ウェイト（負荷）のトグル（非公式表示）";
      mkWait.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        pushHistoryBefore("stance-lcWait");
        c.lcWait = !c.lcWait;
        render();
      });
      const mkAct = document.createElement("button");
      mkAct.type = "button";
      mkAct.className = "stance-chip stance-active" + (c.lcActive !== false ? " is-on" : "");
      mkAct.textContent = "A";
      mkAct.title = "アクティブ（オン）／オフでレスト相当の見た目（非公式表示）";
      mkAct.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        pushHistoryBefore("stance-lcActive");
        c.lcActive = !c.lcActive;
        render();
      });
      bar.appendChild(mkWait);
      bar.appendChild(mkAct);
      if (opts.memberHbAdjust === true && c.type === T_MEMBER) {
        const mkHb = document.createElement("button");
        mkHb.type = "button";
        mkHb.className = "stance-chip stance-hb";
        mkHb.textContent = "+H/B";
        mkHb.title = "所持ハート／ブレードを追加（場にいるメンバーのみ・非公式・Undo可）";
        mkHb.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          openMemberHbEditor(c);
        });
        bar.appendChild(mkHb);
      }
      div.appendChild(bar);
    } else if (opts.memberHbAdjust === true && c.type === T_MEMBER) {
      const hbBar = document.createElement("div");
      hbBar.className = "card-member-hb-bar";
      const mkHb = document.createElement("button");
      mkHb.type = "button";
      mkHb.className = "stance-chip stance-hb";
      mkHb.textContent = "+H/B";
      mkHb.title = "所持ハート／ブレードを追加（場にいるメンバーのみ・非公式・Undo可）";
      mkHb.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        openMemberHbEditor(c);
      });
      hbBar.appendChild(mkHb);
      div.appendChild(hbBar);
    }

    if (c.type === T_MEMBER) {
      var bonFoot = memberPlayBonusFooterEl(c);
      if (bonFoot) div.appendChild(bonFoot);
    }

    // 1ドロー直後のフラッシュ（ドローエールのみやや長め＋カード枠の発光）
    var isDrawYellFlash = c._flashDrawLabel === FLASH_LABEL_DRAW_YELL_PLUS_ONE;
    var flashDur = isDrawYellFlash ? FLASH_DRAW_YELL_DURATION_MS : FLASH_DRAW_DURATION_MS;
    var flashUntil = (Number(c._flashDrawAt) || 0) + flashDur;
    var nowMs = Date.now();
    if (flashUntil > nowMs) {
      var remainMs = Math.max(120, flashUntil - nowMs);
      var flash = document.createElement("div");
      flash.className =
        "card-flash-plus-one" +
        (isDrawYellFlash ? " card-flash-plus-one--draw-yell" : "");
      flash.setAttribute("aria-hidden", "true");
      flash.textContent = c._flashDrawLabel || FLASH_LABEL_PLUS_DRAW;
      flash.style.animationDuration = remainMs + "ms";
      div.appendChild(flash);
      if (isDrawYellFlash) {
        div.classList.add("card-item--draw-yell-glow");
        window.setTimeout(function () {
          div.classList.remove("card-item--draw-yell-glow");
        }, remainMs + 80);
      }
      setTimeout(function () {
        if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
      }, remainMs + 60);
    } else if (c._flashDrawAt) {
      c._flashDrawAt = 0;
      c._flashDrawLabel = null;
    }

    return div;
  }

  function fillZone(zoneId, arr, rotateOrOpts) {
    const opts = typeof rotateOrOpts === "string" ? { rotateLabel: rotateOrOpts } : rotateOrOpts || {};
    const rotateLabel = opts.rotateLabel;
    const zoomClick = opts.zoomClick === true;
    const el = $(zoneId);
    if (!el) return;

    const isLiveBoard = /^live-/.test(zoneId);
    const isSuccessLive = zoneId === "zone-success-live";
    const isStage = /^stage-/.test(zoneId);
    const isDeckZone = zoneId === "zone-deck";

    el.innerHTML = "";
    arr.forEach(function (c) {
      ensureCardBoardFields(c);
      var liveBoardPickFan = isLiveBoard && state.liveTurnPickMode;
      var offStageMemberLive =
        !isStage &&
        !isLiveBoard &&
        (c.type === T_MEMBER || c.type === T_LIVE);
      if (offStageMemberLive || (isSuccessLive && (c.type === T_MEMBER || c.type === T_LIVE))) {
        c.lcWait = false;
        c.lcActive = true;
        if (!liveBoardPickFan) c.isRotated = false;
      }
      if (zoneId === "zone-hand" && (c.type === T_MEMBER || c.type === T_LIVE)) {
        c.lcWait = false;
      }

      if (isLiveBoard && (c.type === T_LIVE || c.type === T_MEMBER)) {
        if (state.liveTurnPickMode) c.isRotated = true;
        else if (c.type === T_LIVE) c.isRotated = false;
      }
      if (zoneId === "zone-energy" && c.type === T_ENERGY) {
        c.lcWait = c.isRotated === true;
        c.lcActive = c.lcWait !== true;
      }
      /** ステージ下のエネは常にアクティブ表示（横向きでも薄くしない） */
      if (isStage && c.type === T_ENERGY) {
        c.lcWait = false;
        c.lcActive = true;
      }
      var onRotate =
        isStage &&
        rotateLabel &&
        function () {
          pushHistoryBefore(rotateLabel);
          c.isRotated = !c.isRotated;
          if (c.type === T_MEMBER || c.type === T_LIVE) {
            c.lcWait = c.isRotated === true;
          }
          if (c.type === T_ENERGY) {
            c.lcWait = false;
            c.lcActive = true;
          }
          render();
        };
      var liveSlotFaceDown = state.liveTurnPickMode && isLiveBoard;
      if (
        (isLiveBoard && state.liveTurnPickMode) ||
        (isLiveBoard && c.type === T_LIVE && !state.liveTurnPickMode)
      ) {
        onRotate = null;
      }
      if (zoneId === "zone-energy" && c.type === T_ENERGY) {
        onRotate = function () {
          pushHistoryBefore("energy-wa-toggle");
          c.isRotated = !c.isRotated;
          c.lcWait = c.isRotated === true;
          c.lcActive = c.lcWait !== true;
          render();
        };
      }

      var showStance = (isStage && c.type === T_MEMBER) || (zoneId === "zone-energy" && c.type === T_ENERGY);

      var memberHbAdjust =
        c.type === T_MEMBER &&
        (isStage || isLiveBoard) &&
        !(liveSlotFaceDown && isLiveBoard);

      var stageVeteranGlow =
        isStage &&
        c.type === T_MEMBER &&
        typeof c.stageTurnEntered === "number" &&
        Number.isFinite(c.stageTurnEntered) &&
        state.turnCount > c.stageTurnEntered;

      var successLiveAlwaysGlow = isSuccessLive && c.type === T_LIVE;
      var liveVenueBoost = isLiveBoard && !state.liveTurnPickMode && c.type === T_LIVE;

      var stageRotateChip = isStage && c.type === T_MEMBER && typeof onRotate === "function";
      var stageCatalogCombo = isStage && c.type === T_MEMBER;

      var catalogImgClickDetail =
        (c.type === T_MEMBER || c.type === T_LIVE) &&
        (zoneId === "zone-hand" ||
          zoneId === "zone-waiting" ||
          zoneId === "zone-deck" ||
          zoneId === "zone-preview" ||
          zoneId === "zone-resolution" ||
          zoneId === "zone-success-live" ||
          /^live-/.test(zoneId));

      var mcKidou = mergedCatalogCard(c);
      var catalogKidouGlow =
        (c.type === T_MEMBER || c.type === T_LIVE) &&
        mcKidou &&
        typeof mcKidou.ability === "string" &&
        /\{\{[^}]*kidou[^}]*\}\}/i.test(mcKidou.ability) &&
        (zoneId === "zone-hand" ||
          zoneId === "zone-resolution" ||
          zoneId === "zone-success-live" ||
          /^live-/.test(zoneId) ||
          /^stage-/.test(zoneId));

      const cardOpts = {
        onRotate: onRotate || undefined,
        zoomClick: zoomClick,
        forceLiveHorizontal: !!(liveSlotFaceDown && (c.type === T_LIVE || c.type === T_MEMBER)),
        stanceBar: showStance,
        hideFaceBehindBack:
          liveSlotFaceDown && !!(c.img) && (c.type === T_LIVE || c.type === T_MEMBER),
        deckFaceHidden: isDeckZone && state.deckPileFacesDown && !!c.img,
        memberHbAdjust: memberHbAdjust,
        stageVeteranGlow: stageVeteranGlow,
        successLiveAlwaysGlow: successLiveAlwaysGlow,
        liveVenueBoost: liveVenueBoost,
        stageRotateChip: stageRotateChip === true,
        stageCatalogLongZoom: stageCatalogCombo === true,
        catalogImgClickDetail: catalogImgClickDetail === true && !stageCatalogCombo,
        catalogKidouGlow: catalogKidouGlow === true,
      };
      if (zoneId === "zone-hand" && state.awaitingTurnStart) {
        const sel = state.mulliganSelectedIds;
        cardOpts.mulliganPick = {
          isOn: sel.indexOf(c.id) >= 0,
          onToggle: function (cardId, on) {
            const i = state.mulliganSelectedIds.indexOf(cardId);
            if (on) {
              if (i < 0) state.mulliganSelectedIds.push(cardId);
            } else if (i >= 0) state.mulliganSelectedIds.splice(i, 1);
            render();
          },
        };
      } else if (zoneId === "zone-hand" && state.liveTurnPickMode) {
        const sel = state.liveTurnSelectedIds;
        cardOpts.liveTurnPick = {
          isOn: sel.indexOf(c.id) >= 0,
          onToggle: function (cardId, on) {
            const i = state.liveTurnSelectedIds.indexOf(cardId);
            if (on) {
              if (i < 0) state.liveTurnSelectedIds.push(cardId);
            } else if (i >= 0) state.liveTurnSelectedIds.splice(i, 1);
            render();
          },
        };
      }
      el.appendChild(cardEl(c, cardOpts));
    });
  }

  function waitingRailIsCollapsed() {
    const row = $("waiting-row");
    return !!(row && row.classList.contains("waiting-row--collapsed"));
  }

  function previewRailIsCollapsed() {
    var row = $("preview-row");
    return !!(row && row.classList.contains("preview-row--collapsed"));
  }

  function readAllFromDom() {
    const oldMap = new Map(allZonesFlat().map((c) => [c.id, c]));
    function fill(zoneId, arr) {
      const el = $(zoneId);
      if (!el) return;
      arr.length = 0;
      [...el.children].forEach((n) => {
        const c = oldMap.get(n.dataset.id);
        if (c) arr.push(c);
      });
    }
    fill("zone-deck", state.deck);
    fill("zone-hand", state.hand);
    (function fillWaitingFromDom() {
      const collapsed = waitingRailIsCollapsed();
      const wa = $("zone-waiting");
      const ct = $("zone-waiting-drop-catcher");
      state.waitingRoom.length = 0;
      if (collapsed) {
        if (wa) {
          [...wa.children].forEach(function (n) {
            const c = oldMap.get(n.dataset.id);
            if (c) state.waitingRoom.push(c);
          });
        }
        if (ct) {
          [...ct.children].forEach(function (n) {
            const c = oldMap.get(n.dataset.id);
            if (c) state.waitingRoom.push(c);
          });
        }
      } else if (wa) {
        fill("zone-waiting", state.waitingRoom);
      }
    })();
    fill("zone-resolution", state.resolutionArea);
    fill("zone-success-live", state.successfulLiveArea);
    fill("zone-energy", state.energyArea);
    (function fillPreviewFromDom() {
      var collapsed = previewRailIsCollapsed();
      var zp = $("zone-preview");
      var ct = $("zone-preview-drop-catcher");
      if (!state.previewScratch) state.previewScratch = [];
      state.previewScratch.length = 0;
      if (collapsed) {
        if (zp) {
          [...zp.children].forEach(function (n) {
            const c = oldMap.get(n.dataset.id);
            if (c) state.previewScratch.push(c);
          });
        }
        if (ct) {
          [...ct.children].forEach(function (n) {
            const c = oldMap.get(n.dataset.id);
            if (c) state.previewScratch.push(c);
          });
        }
      } else if (zp) {
        fill("zone-preview", state.previewScratch);
      }
    })();
    fill("stage-left", state.stage.left);
    fill("stage-center", state.stage.center);
    fill("stage-right", state.stage.right);
    fill("live-left", state.liveArea.left);
    fill("live-center", state.liveArea.center);
    fill("live-right", state.liveArea.right);
  }

  function normalizeAfterDrop(snapBeforeDrag, draggedDomId) {
    const cols = ["left", "center", "right"];

    // snapBeforeDrag から「そのメンバーが居た列（置換元）」を引く
    const prevStageMemberIdsByCol = {};
    cols.forEach(function (k) {
      prevStageMemberIdsByCol[k] = new Set();
      const arr = snapBeforeDrag && snapBeforeDrag.stage && snapBeforeDrag.stage[k];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (c) {
        if (!c || c.type !== T_MEMBER) return;
        if (!c.id) return;
        prevStageMemberIdsByCol[k].add(String(c.id));
      });
    });

    function findPrevStageColByMemberId(mid) {
      const s = String(mid || "");
      if (!s) return null;
      for (let i = 0; i < cols.length; i++) {
        const k = cols[i];
        if (prevStageMemberIdsByCol[k] && prevStageMemberIdsByCol[k].has(s)) return k;
      }
      return null;
    }

    // 現在の stage スロットから「members / energies」を分離して解決する
    const membersByCol = {};
    const energiesByCol = {};
    cols.forEach(function (k) {
      const slot = state.stage[k] || [];
      membersByCol[k] = slot.filter(function (c) {
        return c && c.type === T_MEMBER;
      });
      energiesByCol[k] = slot.filter(function (c) {
        return c && c.type === T_ENERGY;
      });
    });

    const membersResolved = { left: [], center: [], right: [] };
    const energiesResolved = { left: [], center: [], right: [] };

    // 置換（stage-stag）: 入ってきたメンバーが snap に居たなら入れ替え、それ以外なら baton touch とみなし控えへ
    cols.forEach(function (k) {
      const members = membersByCol[k];
      const energies = energiesByCol[k];
      if (!members.length) {
        if (!membersResolved[k].length) {
          membersResolved[k] = [];
          energiesResolved[k] = energies;
        }
        return;
      }
      if (members.length === 1) {
        if (!membersResolved[k].length) {
          membersResolved[k] = [members[0]];
          energiesResolved[k] = energies;
        }
        return;
      }

      // members.length >= 2: Sortable の DOM 順は列・ドロップ位置で末尾＝新着とは限らない
      const dragId = draggedDomId != null ? String(draggedDomId || "") : "";
      let newMember = null;
      if (dragId) {
        for (let mi = 0; mi < members.length; mi++) {
          const m = members[mi];
          if (m && m.id != null && String(m.id) === dragId) {
            newMember = m;
            break;
          }
        }
      }
      if (!newMember) {
        newMember = members[members.length - 1];
      }
      const displaced = members.filter(function (m) {
        return !newMember || String((m && m.id) || "") !== String((newMember && newMember.id) || "");
      });

      const prevCol = newMember && newMember.id ? findPrevStageColByMemberId(newMember.id) : null;
      if (prevCol && prevCol !== k) {
        // stage-stag 入れ替え（追い出し側は “置換元の列” へ）
        const mainDisplaced = displaced[0] || null;
        const extraDisplaced = displaced.slice(1);
        extraDisplaced.forEach(function (m) {
          state.waitingRoom.push(m);
        });

        membersResolved[k] = [newMember];
        membersResolved[prevCol] = mainDisplaced ? [mainDisplaced] : [];

        // 付随エネルギーも下に付くものとして入れ替え
        energiesResolved[k] = energiesByCol[prevCol] || [];
        energiesResolved[prevCol] = energies || [];
      } else {
        // baton touch（手からの配置 / snap に無い新規）: 追い出し側メンバーは控えへ、列下エネは破棄（消える）
        displaced.forEach(function (m) {
          state.waitingRoom.push(m);
        });
        membersResolved[k] = [newMember];
        energiesResolved[k] = [];
      }
    });

    // 最終整形: 「メンバーが無い列の energies は破棄」
    cols.forEach(function (k) {
      const mem = membersResolved[k] && membersResolved[k][0] ? membersResolved[k][0] : null;
      if (!mem) {
        state.stage[k] = [];
        return;
      }
      const en = energiesResolved[k] || [];
      state.stage[k] = [...en, mem];
    });

    ["left", "center", "right"].forEach(function (k) {
      const slot = state.liveArea[k];
      slot.forEach(function (c) {
        if (state.liveTurnPickMode) {
          if (c.type === T_MEMBER || c.type === T_LIVE) c.isRotated = true;
        } else if (c.type === T_LIVE) c.isRotated = false;
      });
      if (slot.length > 1) {
        const surplus = slot.slice(0, -1);
        surplus.forEach(function (c) {
          state.waitingRoom.push(c);
        });
        state.liveArea[k] = [slot[slot.length - 1]];
      }
    });

    state.successfulLiveArea.forEach(function (c) {
      if (c.type === T_LIVE) {
        c.isRotated = false;
        if (c.lcWait === true) c.lcWait = false;
      }
    });
  }

  function targetZoneEl(toSortable) {
    return toSortable && toSortable.el ? toSortable.el : toSortable;
  }

  /** 側面エネエリアの「縦」（未ウェイト）の枚数 — メンバーの載せ判定に利用 */
  function countUprightEnergyInArea(arr) {
    if (!arr || !arr.length) return 0;
    var u = 0;
    arr.forEach(function (e) {
      if (!e || e.type !== T_ENERGY) return;
      if (!e.isRotated) u++;
    });
    return u;
  }

  function allowPut(toSortable, fromSortable, dragEl) {
    const toEl = targetZoneEl(toSortable);
    if (!toEl || !toEl.classList) return true;
    if (toEl.id === "zone-preview" || toEl.id === "zone-preview-drop-catcher" || toEl.classList.contains("preview-zone"))
      return true;
    const t = dragEl.dataset.type;
    if (toEl.classList.contains("energy-zone")) {
      if (t !== T_ENERGY) return false;
      const count = [...toEl.querySelectorAll(".card-item")].filter((n) => n !== dragEl).length;
      return count < MAX_ENERGY_SIDE;
    }
    if (toEl.id === "zone-success-live") {
      if (t !== T_LIVE) return false;
      return true;
    }
    if (toEl.classList.contains("live-slot")) {
      if (t === T_MEMBER && !state.liveTurnPickMode) return false;
      if (t !== T_LIVE && t !== T_MEMBER) return false;
      const otherCnt = [...toEl.querySelectorAll(".card-item")].filter(function (n) {
        return n !== dragEl;
      }).length;
      return otherCnt < 1;
    }
    if (toEl.classList.contains("stage-slot")) {
      if (t === T_LIVE) return false;
      if (t === T_ENERGY) {
        const hasMember = [...toEl.querySelectorAll(".card-item")].some((n) => {
          if (n === dragEl) return false;
          return n.dataset.type === T_MEMBER;
        });
        return hasMember;
      }
      if (t === T_MEMBER) {
        var fromEl = sortableEventElement(fromSortable);
        if (!fromEl || !zoneIsStage(fromEl)) {
          /** ステージ外からメンバーを載せる操作は、エネが足りなくても許可（支払い・注意は onEnd で処理） */
          return true;
        }
      }
      return true;
    }
    return true;
  }

  function wireSortable(zoneId) {
    const el = $(zoneId);
    if (!el) return;

    const s = Sortable.create(el, {
      group: {
        name: "cards",
        put: function (to, from, dragEl, evt) {
          return allowPut(to, from, dragEl);
        },
      },
      draggable: ".card-item",
      filter: ".stance-chip, .card-no-drag, .card-stance-bar, .card-member-hb-bar",
      preventOnFilter: false,
      animation: 0,
      delay: 120,
      delayOnTouchOnly: true,
      touchStartThreshold: 3,
      fallbackTolerance: 3,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      onChoose: function (evt) {
        dragUndoSnap = snapshotBoard();
        const dragElItem = evt.item;
        lastDraggedDomId =
          dragElItem && dragElItem.dataset && dragElItem.dataset.id != null
            ? String(dragElItem.dataset.id)
            : "";
        /* ドラッグ開始時点のプレビュー開閉状態を覚えておき、ドロップ後に勝手に開かないようにする */
        previewRowCollapsedAtDragStart = previewRailIsCollapsed();
        showCardBackWhileDragging(dragElItem);
        if (dragElItem && dragElItem.dataset && dragElItem.dataset.type === T_ENERGY) {
          refreshEnergyDropHints(dragElItem);
        } else {
          clearEnergyDropHints();
        }
      },
      onUnchoose: function (evt) {
        restoreCardFaceAfterDragging(evt.item);
      },
      onEnd: function (evt) {
        lastDragEndAt = Date.now();
        restoreCardFaceAfterDragging(evt.item);
        var droppedToSuccessLive = evt.to && evt.to.id === "zone-success-live";
        readAllFromDom();
        maybeFlushResolutionToWaitingOnVerdictLiveMove(evt);
        maybeFlashDrawYellOnResolutionDrop(evt, dragUndoSnap);
        if (droppedToSuccessLive) {
          clearTurnScopedPlayBonusesEverywhere();
          var fpSel = $("select-first-player");
          if (fpSel) fpSel.value = "先攻";
        }
        normalizeAfterDrop(dragUndoSnap, lastDraggedDomId);
        syncPlayBonusesAfterStageMembershipChange(dragUndoSnap);
        lastDraggedDomId = "";
        maybeAutoDrawHandAfterLiveMemberSet(evt);
        maybeRotateEnergyCostForMembersNewOnStage(dragUndoSnap);
        stampNewStageMembersForGlow(dragUndoSnap);
        warnAfterStageBatonSameTurnPolicy(dragUndoSnap);
        clearEnergyDropHints();
        var beforeFp = fingerprintZonesFromShot(dragUndoSnap);
        var afterFp = fingerprintZonesFromLive();
        try {
          if (dragUndoSnap !== null && beforeFp !== afterFp) {
            undoHistory.push(dragUndoSnap);
            trimUndo();
            redoHistory.length = 0;
            logReplay("drag-move");
          }
        } catch (_) {
          if (dragUndoSnap !== null) {
            undoHistory.push(dragUndoSnap);
            trimUndo();
            redoHistory.length = 0;
            logReplay("drag-move");
          }
        }
        var snapBeforeDrag = dragUndoSnap;
        dragUndoSnap = null;
        persistSessionTexts();
        maybeAnnounceLiveTurnEaleToResolution(evt, snapBeforeDrag);
        if (snapBeforeDrag && Array.isArray(snapBeforeDrag.resolutionArea)) {
          maybeFlushPendingDrawYellHandDraws(snapBeforeDrag.resolutionArea.length);
        }
        renderSynchronouslyOnce();
        /* プレビューが閉じていた状態でドラッグが始まったなら、ドロップで勝手に開かないようにする。
         * 何らかのイベント経路（クリックの取り違え等）で開いてしまった場合を保険として閉じ直す。 */
        if (previewRowCollapsedAtDragStart === true) {
          var pRow = $("preview-row");
          if (pRow && !pRow.classList.contains("preview-row--collapsed")) {
            pRow.classList.add("preview-row--collapsed");
            syncPreviewRailAria();
          }
        }
        previewRowCollapsedAtDragStart = null;
      },
    });
    sortables.push(s);
  }

  /** fillZone が innerHTML を失う直前まで Sortable が残っていると状態が壊れやすく、ドラッグ周りやフリーズの原因になり得る */
  function destroyAllSortables() {
    sortables.forEach(function (sx) {
      try {
        sx.destroy();
      } catch (e) {
        /* noop */
      }
    });
    sortables = [];
  }

  /** ゾーン id（Sortable を振る全部） */
  const SORTABLE_ZONE_IDS = [
    "zone-deck",
    "zone-hand",
    "zone-waiting",
    "zone-waiting-drop-catcher",
    "zone-resolution",
    "zone-success-live",
    "zone-energy",
    "zone-preview",
    "zone-preview-drop-catcher",
    "stage-left",
    "stage-center",
    "stage-right",
    "live-left",
    "live-center",
    "live-right",
  ];

  function attachAllSortables() {
    SORTABLE_ZONE_IDS.forEach(function (zid) {
      wireSortable(zid);
    });
  }

  function syncSuccessLiveZoneChrome() {
    var shell = $("success-live-zone-shell");
    var n = Array.isArray(state.successfulLiveArea) ? state.successfulLiveArea.length : 0;
    if (shell) {
      shell.classList.toggle("success-live-zone-shell--snsyuraku", n === 2);
      shell.classList.toggle("success-live-zone-shell--win", n >= LIVE_WINS);
    }
    var winEl = $("success-live-msg-youwin");
    var snsEl = $("success-live-msg-snsyuraku");
    if (winEl) winEl.hidden = n < LIVE_WINS;
    if (snsEl) snsEl.hidden = n !== 2;
  }

  function refreshHud() {
    function set(id, val) {
      const n = $(id);
      if (n) n.textContent = String(val);
    }
    set("hud-hand", state.hand.length);
    set("hand-inline-count", state.hand.length);
    set("hand-inline-count-sticky", state.hand.length);
    set("hud-waiting", state.waitingRoom.length);
    set("hud-resolution", state.resolutionArea.length);
    set("resolution-zone-head-count", state.resolutionArea.length);
    set("hud-slive", state.successfulLiveArea.length);
    set("hud-turn", state.turnCount + "T");
    const mx = $("hud-slive-max");
    if (mx) mx.textContent = String(LIVE_WINS);
    const hp = $("hud-preview");
    if (hp) hp.textContent = String((state.previewScratch || []).length);
    const ec = $("energy-area-count");
    const ew = $("energy-wait-count");
    var energyActive = 0;
    var energyWait = 0;
    for (var ei = 0; ei < state.energyArea.length; ei++) {
      var en = state.energyArea[ei];
      if (!en) continue;
      if (en.isRotated === true) energyWait++;
      else energyActive++;
    }
    if (ec) ec.textContent = String(energyActive);
    if (ew) ew.textContent = String(energyWait);
    const wr = $("waiting-rail-count");
    if (wr) wr.textContent = String(state.waitingRoom.length);
    const pr = $("preview-rail-count");
    if (pr) pr.textContent = String((state.previewScratch || []).length);
    const turnBadge = $("play-turn-display");
    if (turnBadge) turnBadge.textContent = String(state.turnCount);
  }

  /** 手札は常に 1 行の重ね可能レイアウト（枚数が多いほど強めに重なる）。
   * ライブターン選択中かつ開始時に手札が一定枚数以上なら重ねず折り返し（チェックとカードの対応を分かりやすくする） */
  function updateHandZoneLayoutMode() {
    const zone = $("zone-hand");
    const row = $("hand-row");
    if (!zone || !row) return;
    if (row.classList.contains("hidden")) {
      zone.classList.remove("hand-zone--overlap", "hand-zone--overlap-light", "hand-zone--overlap-strong", "hand-zone--overlap-heavy");
      return;
    }
    const n = state.hand.length;
    var useOverlap = false;
    var overlapLight = false;
    if (state.liveTurnPickMode && state.liveTurnHandSpreadPick) {
      useOverlap = false;
    } else if (n >= 2 && n <= 5) {
      useOverlap = true;
      overlapLight = true;
    } else {
      useOverlap = n >= 10;
      if (!useOverlap && n > 5) {
        const first = zone.querySelector(".card-item");
        const W = first ? first.getBoundingClientRect().width : 82;
        const cs = getComputedStyle(zone);
        const gap = parseFloat(cs.gap) || 4;
        const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const avail = Math.max(0, row.clientWidth - pad);
        const needed = n * W + (n - 1) * gap;
        useOverlap = needed > avail + 0.5;
      }
    }
    zone.classList.toggle("hand-zone--overlap", useOverlap);
    zone.classList.toggle("hand-zone--overlap-light", useOverlap && overlapLight);
    zone.classList.toggle("hand-zone--overlap-strong", useOverlap && !overlapLight && n >= 8);
    zone.classList.toggle("hand-zone--overlap-heavy", useOverlap && !overlapLight && n >= 12);
  }

  function syncDeckToolbarButtons() {
    var bf = $("btn-deck-face");
    if (bf) {
      bf.textContent = state.deckPileFacesDown ? "山札一覧: 表面表示" : "山札一覧: 裏向き";
      bf.setAttribute("aria-pressed", state.deckPileFacesDown ? "true" : "false");
    }
  }

  /** 左上シミュが「判定：成功／失敗」に確定しているとき（kind === verdict）。エールボタン発光停止／ターン開始へ移す判定に使う */
  function liveSimResolutionVerdictLocked() {
    if (state.liveStatsAfterBegin !== true) return false;
    try {
      var sim = computeDeckDrawLiveSuccessSimulation(deckLiveSimMode);
      return !!(sim && sim.kind === "verdict");
    } catch (_) {
      return false;
    }
  }

  /** liveStatsAfterBegin かつライブ枠にライブが1枚でもあるとき、「1枚ドロー（解決）」を「1枚エール（解決）」へ。
   * 開始直後で枠が空のときはドローラベルのままにする。
   *  対象ボタン: btn-res-draw-one（解決ゾーン横）/ btn-draw-resolution（山札の下のドロー行） */
  function syncLiveYellDrawButtons() {
    var inLive =
      state.liveStatsAfterBegin === true && liveLiveCardsInFramesOnly() > 0;
    var stopYellGlow = liveSimResolutionVerdictLocked();
    var ids = ["btn-res-draw-one", "btn-draw-resolution"];
    ids.forEach(function (id) {
      var b = $(id);
      if (!b) return;
      if (inLive) {
        if (b.dataset.llocgLabelOrig == null) b.dataset.llocgLabelOrig = b.textContent || "";
        b.textContent = "1枚エール（解決）";
        if (stopYellGlow) {
          b.classList.remove("btn--live-yell-glow");
        } else {
          b.classList.add("btn--live-yell-glow");
        }
        b.setAttribute("aria-label", "1枚エール（解決）");
        if (b.dataset.llocgTitleOrig == null && b.getAttribute("title") != null) {
          b.dataset.llocgTitleOrig = b.getAttribute("title");
        }
        b.setAttribute("title", "ライブ中：山札の先頭1枚を解決ゾーンへ送ります（エール）");
      } else {
        if (b.dataset.llocgLabelOrig != null) {
          b.textContent = b.dataset.llocgLabelOrig;
          delete b.dataset.llocgLabelOrig;
        }
        b.classList.remove("btn--live-yell-glow");
        b.removeAttribute("aria-label");
        if (b.dataset.llocgTitleOrig != null) {
          b.setAttribute("title", b.dataset.llocgTitleOrig);
          delete b.dataset.llocgTitleOrig;
        }
      }
    });
  }

  /** 控え室は CSS グリッドで 10 枚／行（クラスは後方互換のため掃除のみ） */
  function updateWaitingZoneOverlapMode() {
    const zone = $("zone-waiting");
    if (!zone) return;
    zone.classList.remove("waiting-zone--t1", "waiting-zone--t2", "waiting-zone--t3");
  }

  /** 解決領域: 5〜10 は半重ね、11〜20 はより重ね、21+ はさらに圧縮（控え室と同様） */
  function updateResolutionZoneOverlapMode() {
    const zone = $("zone-resolution");
    if (!zone) return;
    zone.classList.remove("resolution-zone--t1", "resolution-zone--t2", "resolution-zone--t3");
    const n = state.resolutionArea.length;
    if (n >= 21) zone.classList.add("resolution-zone--t3");
    else if (n >= 11) zone.classList.add("resolution-zone--t2");
    else if (n >= 5) zone.classList.add("resolution-zone--t1");
  }

  function syncWaitingRailAria() {
    const row = $("waiting-row");
    const head = $("waiting-head-expand");
    if (!row || !head) return;
    const collapsed = row.classList.contains("waiting-row--collapsed");
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    row.setAttribute("aria-hidden", collapsed ? "true" : "false");
    const hi = $("waiting-rail-teaser");
    if (hi) {
      hi.textContent = collapsed ? "クリックで一覧を表示" : "クリックで一覧を閉じる";
    }
  }

  function syncPreviewRailAria() {
    var row = $("preview-row");
    var head = $("preview-head-expand");
    if (!row || !head) return;
    var collapsed = row.classList.contains("preview-row--collapsed");
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    row.setAttribute("aria-hidden", collapsed ? "true" : "false");
    var hi = $("preview-rail-teaser");
    if (hi) hi.textContent = collapsed ? "クリックで一覧を表示" : "クリックで一覧を閉じる";
  }

  function togglePreviewRailExpanded(ev) {
    if (ev && ev.type === "click" && ev.target.closest) {
      if (ev.target.closest("button, a, label, input")) return;
    }
    /* ドラッグ直後の合成クリックや誤発火でプレビューが開いてしまうのを防ぐガード */
    if (Date.now() - lastDragEndAt < 350) return;
    var row = $("preview-row");
    if (!row) return;
    row.classList.toggle("preview-row--collapsed");
    syncPreviewRailAria();
    renderSynchronouslyOnce();
  }

  function pruneLiveTurnSelection() {
    if (state.liveTurnPickMode) {
      state.liveTurnSelectedIds = state.liveTurnSelectedIds.filter(function (id) {
        return state.hand.some(function (c) {
          return c.id === id;
        });
      });
    } else {
      state.liveTurnSelectedIds = [];
    }
  }

  function pruneMulliganSelection() {
    if (state.awaitingTurnStart) {
      state.mulliganSelectedIds = state.mulliganSelectedIds.filter(function (id) {
        return state.hand.some(function (c) {
          return c.id === id;
        });
      });
    } else {
      state.mulliganSelectedIds = [];
    }
  }

  /** ライブターン（手札選択・配置）のヒントとボタン — 開始と「ライブエリアへ」を 1 ボタンで切替 */
  /** 次に押すとよい操作へボタンを光らせる（複数条件は優先度で 1 系統のみ） */
  function syncPlayFlowHintGlows() {
    var body = document.body;
    if (!body || !body.classList.contains("play-mode")) return;
    body.classList.remove(
      "flow-hint--live-turn-start",
      "flow-hint--live-to-area",
      "flow-hint--live-begin",
      "flow-hint--turn-start",
      "flow-hint--turn-start-yell",
      "flow-hint--live-success",
      "flow-hint--mulligan-execute",
    );
    function finalizeTurnStartYellGlow() {
      body.classList.toggle(
        "flow-hint--turn-start-yell",
        liveSimResolutionVerdictLocked() && body.classList.contains("flow-hint--turn-start"),
      );
    }
    if (state.awaitingTurnStart === true && !openingMulliganExecuteUsed) {
      body.classList.add("flow-hint--mulligan-execute");
      finalizeTurnStartYellGlow();
      return;
    }
    if (state.awaitingTurnStart === true && openingMulliganExecuteUsed) {
      body.classList.add("flow-hint--turn-start");
      finalizeTurnStartYellGlow();
      return;
    }
    var mull = state.awaitingTurnStart === true;
    var ltp = state.liveTurnPickMode === true;
    var lsb = state.liveStatsAfterBegin === true;
    var bundle = null;
    try {
      bundle = evaluateLiveMechanicalFulfillmentBundle();
    } catch (_) {
      bundle = null;
    }
    var evalOk = !!(bundle && bundle.evaluateResult && bundle.evaluateResult.ok);
    function liveSlotsHaveCard() {
      return ["left", "center", "right"].some(function (k) {
        var arr = state.liveArea[k];
        return arr && arr.some(function (c) {
          return c && (c.type === T_LIVE || c.type === T_MEMBER);
        });
      });
    }
    var bladeN = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var resN = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    var ealeDone = bladeN > 0 && resN >= bladeN;
    var bPrim = $("btn-live-turn-primary");
    var primaryIsToArea = !!(bPrim && bPrim.textContent && bPrim.textContent.indexOf("ライブエリア") >= 0);
    var bBegin = $("btn-live-turn-begin");

    if (lsb && evalOk) {
      body.classList.add("flow-hint--live-success");
      body.classList.add("flow-hint--turn-start");
      finalizeTurnStartYellGlow();
      return;
    }
    if (lsb && ealeDone) {
      body.classList.add("flow-hint--turn-start");
      finalizeTurnStartYellGlow();
      return;
    }
    if (ltp && bBegin && !bBegin.disabled && liveSlotsHaveCard()) {
      body.classList.add("flow-hint--live-begin");
      finalizeTurnStartYellGlow();
      return;
    }
    if (ltp && state.liveTurnSelectedIds.length > 0 && primaryIsToArea) {
      body.classList.add("flow-hint--live-to-area");
      finalizeTurnStartYellGlow();
      return;
    }
    if (!mull && !ltp && !lsb && liveTurnStartGlowArmed) {
      body.classList.add("flow-hint--live-turn-start");
      finalizeTurnStartYellGlow();
      return;
    }
    if (!mull && !ltp && !lsb && ealeDone && !liveSlotsHaveCard()) {
      body.classList.add("flow-hint--turn-start");
    }

    finalizeTurnStartYellGlow();
  }

  function syncLiveTurnHandUi() {
    const hint = $("hand-live-turn-hint");
    if (hint) hint.hidden = !state.liveTurnPickMode;
    const bPrim = $("btn-live-turn-primary");
    const bDone = $("btn-live-turn-begin");
    const mulliganPhase = state.awaitingTurnStart === true;
    if (bPrim) {
      var inPick = state.liveTurnPickMode;
      bPrim.textContent = inPick ? "ライブエリアへ" : "ライブターン開始";
      bPrim.disabled = mulliganPhase || (inPick && state.liveTurnSelectedIds.length === 0);
      bPrim.title = inPick
        ? state.liveTurnSelectedIds.length === 0
          ? "手札中央のチェックでカードを選んでください"
          : "選んだカードをライブの空き枠へ左から順に配置し、ドローします"
        : "成功ライブを控え室に送ってライブ準備へ";
    }
    if (bDone) {
      bDone.disabled = mulliganPhase || !state.liveTurnPickMode;
    }
    document.body.classList.toggle("live-turn-pick-mode", state.liveTurnPickMode === true);
    document.body.classList.toggle("live-stats-after-begin", state.liveStatsAfterBegin === true);
  }

  /** マリガンのヒント文言・実行ボタンを state に合わせる */
  function syncMulliganUi() {
    const hint = $("hand-mulligan-hint");
    if (hint) hint.hidden = !state.awaitingTurnStart;
    const btn = $("btn-mulligan-execute");
    if (btn) btn.disabled = !state.awaitingTurnStart;
  }

  function syncDeckPileUi() {
    const host = $("deck-pile-host");
    const btn = $("btn-deck-toggle");
    const label = $("deck-toggle-label");
    const n = state.deck.length;
    if (host) {
      host.classList.toggle("is-open", state.deckPileOpen);
      host.setAttribute("aria-expanded", state.deckPileOpen ? "true" : "false");
    }
    if (label) {
      label.textContent = state.deckPileOpen
        ? "山札を隠す（ドラッグで移動）"
        : n + "枚 — クリックで山札を表示";
    }
    if (btn) btn.setAttribute("aria-pressed", state.deckPileOpen ? "true" : "false");
  }

  /** 無限レイアウトループ対策（同じ算出なら CSS 変数を書き換えない） */
  let deckLayoutLayKey = "";
  /** @type {boolean} */
  let deckLayoutApplying = false;

  /** 山札グリッド: 見えているスクロール領域に合わせて横枚数・サムネ幅・おおよその表示行を自動算出 */
  var deckLayoutFrame = 0;
  function scheduleDeckPileAutoLayout() {
    if (deckLayoutFrame) cancelAnimationFrame(deckLayoutFrame);
    deckLayoutFrame = requestAnimationFrame(function () {
      deckLayoutFrame = 0;
      applyDeckPileAutoLayout();
    });
  }

  function applyDeckPileAutoLayout() {
    if (deckLayoutApplying) return;
    deckLayoutApplying = true;
    try {
      const zoneDeck = $("zone-deck");
      const hostDeck = $("deck-pile-host");
      if (!zoneDeck || !hostDeck) return;

      const rowHint = $("deck-row-hint");
      const visHint = $("deck-visible-rows-hint");

      if (!state.deckPileOpen) {
        deckLayoutLayKey = "";
        hostDeck.style.removeProperty("--deck-thumb-w-pile");
        hostDeck.style.removeProperty("--deck-cards-per-row");
        if (visHint) visHint.textContent = "—";
        if (rowHint) {
          var fv = getComputedStyle(document.documentElement).getPropertyValue("--deck-cards-per-row").trim();
          rowHint.textContent = fv || "—";
        }
        return;
      }

      const gapX = 8;
      const gapY = 4;
      const pad = 8;
      const TH_MIN = 40;
      const TH_MAX = 74;
      const COL_MIN = 3;
      const COL_MAX = 24;
      const AR = 88 / 63;

      const W = zoneDeck.clientWidth;
      const H = zoneDeck.clientHeight;
      if (W < 64 || H < 40) return;

      var bestScore = -1;
      var bestCols = 4;
      var bestThumb = 52;
      var bestRowsVis = 1;

      for (var cols = COL_MIN; cols <= COL_MAX; cols++) {
        var tw = Math.floor((W - pad - (cols - 1) * gapX) / cols);
        if (tw < TH_MIN) continue;
        tw = Math.min(TH_MAX, tw);
        var cellH = tw * AR + gapY;
        var rowsVis = Math.max(1, Math.floor((H - pad + gapY) / cellH));
        var score = cols * rowsVis;
        if (score > bestScore || (score === bestScore && tw > bestThumb)) {
          bestScore = score;
          bestCols = cols;
          bestThumb = tw;
          bestRowsVis = rowsVis;
        }
      }

      if (bestScore < 0) {
        bestCols = COL_MIN;
        bestThumb = TH_MIN;
        var cellH0 = bestThumb * AR + gapY;
        bestRowsVis = Math.max(1, Math.floor((H - pad + gapY) / cellH0));
      }

      /** スクロールバーの出たりで幅が振れ続けるとレイアウトが循環することがあるので粗めに量子化 */
      var Wq = Math.round(W / 32) * 32;
      var Hq = Math.round(H / 32) * 32;
      var layKey = [Wq, Hq, bestCols, bestThumb].join(":");
      if (layKey !== deckLayoutLayKey) {
        deckLayoutLayKey = layKey;
        hostDeck.style.setProperty("--deck-thumb-w-pile", bestThumb + "px");
        hostDeck.style.setProperty("--deck-cards-per-row", String(bestCols));
      }
      if (rowHint) rowHint.textContent = String(bestCols);
      if (visHint) visHint.textContent = String(bestRowsVis);
    } finally {
      deckLayoutApplying = false;
    }
  }

  deckPileScheduleLayoutRef = scheduleDeckPileAutoLayout;

  /** Sortable が全ゾーンを毎回作り直すと重く、入力と混ざると固まることがあるので描画を同期的に合体 */
  var renderBurstId = 0;
  function renderNowImpl() {
    if (!state.previewScratch) state.previewScratch = [];

    pruneStageTurnEnteredOffBoard();
    ensureStageMembersLegacyTurnAnchors();

    destroyAllSortables();

    pruneMulliganSelection();
    pruneLiveTurnSelection();

    fillZone("zone-deck", state.deck, null);
    fillZone("zone-hand", state.hand, {});
    fillZone("zone-waiting", state.waitingRoom, null);
    var wCatch = $("zone-waiting-drop-catcher");
    if (wCatch) wCatch.innerHTML = "";
    fillZone("zone-resolution", state.resolutionArea, null);
    fillZone("zone-success-live", state.successfulLiveArea, null);
    fillZone("zone-energy", state.energyArea, null);
    fillZone("stage-left", state.stage.left, "rotate-stage");
    fillZone("stage-center", state.stage.center, "rotate-stage");
    fillZone("stage-right", state.stage.right, "rotate-stage");
    fillZone("live-left", state.liveArea.left, null);
    fillZone("live-center", state.liveArea.center, null);
    fillZone("live-right", state.liveArea.right, null);
    fillZone("zone-preview", state.previewScratch, {});
    var pCatch = $("zone-preview-drop-catcher");
    if (pCatch) pCatch.innerHTML = "";

    const dc = $("deck-count-num");
    if (dc) dc.textContent = String(state.deck.length);
    refreshHud();
    syncSuccessLiveZoneChrome();
    syncDeckToolbarButtons();
    syncLiveYellDrawButtons();
    syncDeckPileUi();
    syncMulliganUi();
    syncLiveTurnHandUi();
    syncPlayFlowHintGlows();
    syncDeckOddsKInput();
    syncLiveTurnStatsPanel();
    syncDeckPickPanel();
    syncLeftDeckOddsPanel();
    syncDeckLiveSimPanel();
    syncResolutionOverBladeBanner();
    scheduleDeckPileAutoLayout();
    attachAllSortables();
    updateHandZoneLayoutMode();
    updateWaitingZoneOverlapMode();
    updateResolutionZoneOverlapMode();
    syncWaitingRailAria();
    syncPreviewRailAria();
    schedulePersistPlayResume();
  }

  function render() {
    var mine = ++renderBurstId;
    queueMicrotask(function () {
      if (mine !== renderBurstId) return;
      renderNowImpl();
    });
  }

  function renderSynchronouslyOnce() {
    renderBurstId++;
    renderNowImpl();
  }

  function doUndo() {
    if (!undoHistory.length) {
      showToast("ひとつ戻せる操作がありません");
      return;
    }
    redoHistory.push(snapshotBoard());
    trimRedo();
    applyBoard(undoHistory.pop());
    persistSessionTexts();
    logReplay("undo");
    render();
    showToast("ひとつ戻しました");
  }

  function doRedo() {
    if (!redoHistory.length) {
      showToast("ひとつ進める操作がありません");
      return;
    }
    undoHistory.push(snapshotBoard());
    trimUndo();
    applyBoard(redoHistory.pop());
    persistSessionTexts();
    logReplay("redo");
    render();
    showToast("ひとつ進めました");
  }

  function persistSessionTexts() {
    try {
      var fp = $("select-first-player");
      if (fp) sessionStorage.setItem(STORAGE_FIRST_PLAYER, fp.value || "—");
      sessionStorage.setItem(STORAGE_PLAY_ENERGY_CARD_NO, selectedEnergyCardNo || "");
      persistDeckOddsKManual();
      persistDeckOdds2Kasumi();
      persistDeckOdds13You();
    } catch (_) {
      /* noop */
    }
  }

  function loadSessionTexts() {
    try {
      if (!resumedFromStorage) {
        var fp = $("select-first-player");
        if (fp) fp.value = sessionStorage.getItem(STORAGE_FIRST_PLAYER) || "—";
      }
      loadDeckPickSelection();
      loadDeckOddsKManual();
      loadDeckOddsTurnSteps();
      loadDeckOdds2Kasumi();
      loadDeckOdds13You();
      loadDeckOddsOpeningMullBaseline();
    } catch (_) {}
  }

  $("select-first-player")?.addEventListener("change", persistSessionTexts);

  function onDeckOddsKManualInput(inp) {
    if (!inp || inp.disabled) return;
    var v = Number(inp.value);
    if (!Number.isFinite(v)) v = Math.floor(Number(deckOddsKManual) || 0);
    deckOddsKManual = Math.max(0, Math.min(DECK_ODDS_K_MANUAL_MAX, Math.floor(v)));
    persistDeckOddsKManual();
    var rangeEl = $("deck-odds-k");
    if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = String(deckOddsKManual);
    if (rangeEl) rangeEl.setAttribute("aria-valuenow", String(deckOddsKManual));
    var numEl = $("deck-odds-k-num");
    if (numEl && document.activeElement !== numEl) numEl.value = String(deckOddsKManual);
    syncDeckOddsKInput();
    syncLeftDeckOddsPanel();
  }

  function bindDeckOddsKControlInput(el) {
    if (!el) return;
    el.addEventListener("input", function () {
      onDeckOddsKManualInput(el);
    });
    el.addEventListener("change", function () {
      onDeckOddsKManualInput(el);
    });
  }
  bindDeckOddsKControlInput($("deck-odds-k"));
  bindDeckOddsKControlInput($("deck-odds-k-num"));
  (function relocateDeckOddsFoldForMobile() {
    var fold = $("deck-odds-fold");
    var mobileHost = document.querySelector(".deck-tools-split__odds");
    if (!fold || !mobileHost) return;
    var originParent = fold.parentNode;
    var originNext = fold.nextElementSibling;
    var mq = window.matchMedia("(max-width: 900px) and (orientation: portrait)");
    function syncDeckOddsFoldHost() {
      if (mq.matches) {
        var firstRemain = $("deck-remain-bh-panel");
        if (firstRemain && firstRemain.parentNode === mobileHost) {
          mobileHost.insertBefore(fold, firstRemain.nextElementSibling);
        } else {
          mobileHost.prepend(fold);
        }
      } else if (fold.parentNode !== originParent) {
        if (originNext && originNext.parentNode === originParent) originParent.insertBefore(fold, originNext);
        else originParent.appendChild(fold);
      }
    }
    syncDeckOddsFoldHost();
    if (mq.addEventListener) mq.addEventListener("change", syncDeckOddsFoldHost);
    else if (mq.addListener) mq.addListener(syncDeckOddsFoldHost);
  })();
  (function initHandStickFoldViewport() {
    var det = $("hand-stick-fold");
    if (!det || det.tagName !== "DETAILS") return;
    var mq = window.matchMedia("(max-width: 900px) and (orientation: portrait)");
    function syncOpen() {
      if (!mq.matches) det.setAttribute("open", "");
    }
    syncOpen();
    if (mq.addEventListener) mq.addEventListener("change", syncOpen);
    else if (mq.addListener) mq.addListener(syncOpen);
    window.addEventListener("orientationchange", function () {
      window.setTimeout(syncOpen, 200);
    });
  })();
  function bumpDeckOddsKManual(delta) {
    var n = state.deck.length;
    var m = Array.isArray(state.mulliganSelectedIds) ? state.mulliganSelectedIds.length : 0;
    var c = liveTurnHandCheckCount();
    var autoLock = (state.awaitingTurnStart && m > 0) || (state.liveTurnPickMode === true && c > 0);
    if (n <= 0 || autoLock) return;
    deckOddsKManual = Math.max(
      0,
      Math.min(DECK_ODDS_K_MANUAL_MAX, Math.floor(Number(deckOddsKManual) || 0) + delta),
    );
    persistDeckOddsKManual();
    syncDeckOddsKInput();
    syncLeftDeckOddsPanel();
  }
  $("deck-odds-k-minus")?.addEventListener("click", function (ev) {
    ev.preventDefault();
    bumpDeckOddsKManual(-1);
  });
  $("deck-odds-k-plus")?.addEventListener("click", function (ev) {
    ev.preventDefault();
    bumpDeckOddsKManual(1);
  });
  (function bindDeckOddsKPointerGuard() {
    function arm(el) {
      if (!el) return;
      el.addEventListener("pointerdown", function () {
        deckOddsKPointerActive = true;
      });
      function release() {
        deckOddsKPointerActive = false;
        syncDeckOddsKInput();
      }
      el.addEventListener("pointerup", release);
      el.addEventListener("pointercancel", release);
    }
    arm($("deck-odds-k"));
    arm($("deck-odds-k-num"));
    arm($("deck-odds-k-mirror"));
  })();
  $("deck-pick-k")?.addEventListener("input", function () {
    var inp = $("deck-pick-k");
    if (!inp) return;
    var v = sanitizeNonNegativeInt(inp.value);
    deckPickKManual = Math.max(1, Math.min(99, v || 1));
    if (state.deck.length > 0) deckPickKManual = Math.min(deckPickKManual, state.deck.length);
    if (document.activeElement !== inp) inp.value = String(deckPickKManual);
    updateDeckPickOddsText();
  });
  $("chk-deck-2koi")?.addEventListener("change", function () {
    var chk = $("chk-deck-2koi");
    deckTwoKoiEnabled = !!(chk && chk.checked);
    syncLeftDeckOddsPanel();
  });
  $("chk-deck-2kasumi")?.addEventListener("change", function () {
    var chk = $("chk-deck-2kasumi");
    deckTwoKasumiEnabled = !!(chk && chk.checked);
    persistDeckOdds2Kasumi();
    syncLeftDeckOddsPanel();
  });
  $("chk-deck-13you")?.addEventListener("change", function () {
    var chk = $("chk-deck-13you");
    deck13YouEnabled = !!(chk && chk.checked);
    persistDeckOdds13You();
    syncLeftDeckOddsPanel();
  });
  $("btn-deck-odds-opening-mull-baseline")?.addEventListener("click", function () {
    if (openingMulliganRememberedK == null) return;
    deckOddsOpeningMullBaselineOn = !deckOddsOpeningMullBaselineOn;
    persistDeckOddsOpeningMullBaseline();
    syncDeckOddsOpeningMullBaselineBtn();
    syncLeftDeckOddsPanel();
  });

  (function initEnergyCardSelect() {
    var sel = $("select-energy-card");
    var preview = $("energy-card-preview");
    var stripHost = $("energy-card-thumb-strip");
    if (!sel) return;
    var detailsWrap = sel.closest ? sel.closest("details.energy-card-details") : null;

    function syncEnergyCardPreview() {
      if (!preview) return;
      var cn = selectedEnergyCardNo || "";
      if (!cn) {
        preview.hidden = true;
        preview.removeAttribute("src");
        return;
      }
      var ccat = getCard(cn);
      if (ccat && ccat.img) {
        preview.hidden = false;
        preview.src = ccat.img;
        preview.alt = ccat.name || cn;
      } else {
        preview.hidden = true;
        preview.removeAttribute("src");
      }
    }

    function highlightEnergyStripChip() {
      if (!stripHost) return;
      stripHost.querySelectorAll(".energy-card-thumb-chip").forEach(function (btn) {
        var no = btn.getAttribute("data-energy-no") || "";
        var active =
          (selectedEnergyCardNo && no === selectedEnergyCardNo) ||
          (!selectedEnergyCardNo && no === "");
        btn.classList.toggle("is-active", active);
      });
    }

    function resolveEnergyIdentity(cn) {
      var cat = cn ? getCard(cn) : null;
      if (cat && cat.card_no && cat.name && cat.img) {
        return {
          card_no: String(cat.card_no),
          name: String(cat.name),
          img: String(cat.img),
        };
      }
      return {
        card_no: DEFAULT_ENERGY_CARD_NO,
        name: DEFAULT_ENERGY_NAME,
        img: DEFAULT_ENERGY_IMG,
      };
    }

    function applyEnergyIdentityToAllEnergies(nextCn) {
      var ident = resolveEnergyIdentity(nextCn || "");
      var changed = false;
      allZonesFlat().forEach(function (c) {
        if (!c || c.type !== T_ENERGY) return;
        if (String(c.card_no || "") !== ident.card_no) changed = true;
        if (String(c.name || "") !== ident.name) changed = true;
        if (String(c.img || "") !== ident.img) changed = true;
      });
      if (!changed) return;

      pushHistoryBefore("energy-card-select");
      allZonesFlat().forEach(function (c) {
        if (!c || c.type !== T_ENERGY) return;
        c.card_no = ident.card_no;
        c.name = ident.name;
        c.img = ident.img;
      });
      renderSynchronouslyOnce();
    }

    var allEn = getAllCards().filter(function (c) {
      return c && c.type === T_ENERGY && c.card_no && c.name;
    });
    allEn.sort(function (a, b) {
      return String(a.name || a.card_no).localeCompare(String(b.name || b.card_no), "ja");
    });
    allEn.forEach(function (c) {
      var op = document.createElement("option");
      op.value = String(c.card_no);
      op.textContent = String(c.name || c.card_no);
      sel.appendChild(op);
    });

    if (stripHost) {
      stripHost.innerHTML = "";
      function addChip(no, img, alt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "energy-card-thumb-chip";
        b.setAttribute("data-energy-no", no);
        b.setAttribute("title", alt || (no ? no : "既定"));
        var im = document.createElement("img");
        im.src = img;
        im.alt = alt || "";
        im.width = 40;
        im.height = 56;
        im.loading = "lazy";
        b.appendChild(im);
        b.addEventListener("click", function () {
          selectedEnergyCardNo = no;
          if (sel) sel.value = no;
          syncEnergyCardPreview();
          highlightEnergyStripChip();
          persistSessionTexts();
          if (detailsWrap && detailsWrap.open) detailsWrap.open = false;
          applyEnergyIdentityToAllEnergies(no);
        });
        stripHost.appendChild(b);
      }
      addChip("", DEFAULT_ENERGY_IMG, DEFAULT_ENERGY_NAME);
      allEn.forEach(function (c) {
        if (c.img) addChip(String(c.card_no), c.img, c.name || String(c.card_no));
      });
    }

    if (selectedEnergyCardNo) {
      var optOk = Array.prototype.some.call(sel.options, function (o) {
        return o.value === selectedEnergyCardNo;
      });
      if (optOk) sel.value = selectedEnergyCardNo;
      else selectedEnergyCardNo = "";
    } else {
      sel.value = "";
    }

    syncEnergyCardPreview();
    highlightEnergyStripChip();

    sel.addEventListener("change", function () {
      selectedEnergyCardNo = sel.value || "";
      syncEnergyCardPreview();
      highlightEnergyStripChip();
      persistSessionTexts();
      if (detailsWrap && detailsWrap.open) detailsWrap.open = false;
      applyEnergyIdentityToAllEnergies(selectedEnergyCardNo);
    });
  })();

  (function initLayout16_9() {
    const btn = $("btn-layout-16-9");
    if (!btn) return;
    const STORAGE_LAYOUT_16_9_MODE = "llocg_layout_16_9";

    function sync() {
      const on = sessionStorage.getItem(STORAGE_LAYOUT_16_9_MODE) === "1";
      document.body.classList.toggle("layout-16-9-mode", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn--layout-16-9-on", on);
    }

    sync();
    btn.addEventListener("click", function () {
      const on = !document.body.classList.contains("layout-16-9-mode");
      sessionStorage.setItem(STORAGE_LAYOUT_16_9_MODE, on ? "1" : "0");
      document.body.classList.toggle("layout-16-9-mode", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn--layout-16-9-on", on);
      // 表示倍率が変わるので、山札の自動レイアウトなどを再計算
      renderSynchronouslyOnce();
    });
  })();

  $("btn-coin")?.addEventListener("click", () => {
    const head = Math.random() < 0.5 ? "コインは表になりました（先攻側は自由に運用してください）" : "コインは裏になりました（先攻側は自由に運用してください）";
    showToast(head);
    logReplay("coin");
  });

  function runTurnPhaseStartAfterSuccessLivePrompt() {
    /* 「マリガン実行」を一度も押していないがターン開始した場合＝戻し0枚として記憶（確率ボタンを有効化） */
    if (openingMulliganRememberedK == null && state.turnCount === 1) {
      persistOpeningMulliganRememberedK(0);
    }
    state.awaitingTurnStart = false;
    state.mulliganSelectedIds = [];
    state.liveTurnPickMode = false;
    state.liveTurnSelectedIds = [];
    state.liveTurnHandSpreadPick = false;
    state.liveStatsAfterBegin = false;
    state.liveScoreEffectBonus = 0;
    state.ealeNoteLiveHitIds = [];
    state.pendingDrawYellHandDraws = 0;
    /** 登場／起動／開始時行の H／B（ターン側）はターン開始でクリア（常時側は残す） */
    clearTurnScopedPlayBonusesEverywhere();
    /** マリガン終了タイミングで解決／ライブ枠は控えへ（ルール自動処理ではなく補助用の一括移動） */
    var flushed = [];
    if (state.resolutionArea.length) {
      flushed.push.apply(flushed, state.resolutionArea);
      state.resolutionArea.length = 0;
    }
    ["left", "center", "right"].forEach(function (k) {
      var la = state.liveArea[k];
      if (la && la.length) {
        flushed.push.apply(flushed, la);
        la.length = 0;
      }
    });
    var flushedCt = flushed.length;
    if (flushedCt) state.waitingRoom.push.apply(state.waitingRoom, flushed);
    state.energyArea.forEach(function (e) {
      if (e.type === T_ENERGY && e.isRotated === true) {
        e.isRotated = false;
      }
    });
    allZonesFlat().forEach(function (c) {
      if (c.type !== T_MEMBER) return;
      c.lcWait = false;
      c.isRotated = false;
      c.lcActive = true;
    });
    var extra = false;
    if (state.energyArea.length < MAX_ENERGY_SIDE) {
      state.energyArea.push(energyInstance());
      extra = true;
    }
    var drewOne = false;
    tryReplenishDeckFromWaitingLoop();
    if (state.deck.length) {
      var drawnTs = state.deck.shift();
      markCardFlashDraw(drawnTs);
      state.hand.push(drawnTs);
      drewOne = true;
    }
    showToast(
      "ターン開始 — " +
        [
          flushedCt ? "解決／ライブ枠から控えへ " + flushedCt + " 枚" : "解決・ライブは空だったため控えへの移動なし",
          "側面エネのウェイト解除（縦）・メンバーのウェイト解除（縦）",
          drewOne ? "手札に 1 枚ドロー" : "ドローなし（山札が空）",
          extra ? "側面エネ +1" : "側面エネ追加なし（上限）",
        ].join("・") +
        "。",
    );
    logReplay("turn-phase-start", {
      extraEnergy: extra,
      drew: drewOne,
      flushedResolutionAndLiveToWaiting: flushedCt,
      turn: state.turnCount,
    });
    liveTurnStartGlowArmed = true;
    render();
  }

  function doTurnPhaseStart() {
    pushHistoryBefore("turn-phase-start");
    state.turnCount += 1;
    var bundleTurn = evaluateLiveMechanicalFulfillmentBundle();
    if (shouldPromptMoveSuccessfulLiveOnTurnStart(bundleTurn)) {
      var pend = liveCardsAwaitingSuccessfulBenchPlacement();
      var seen = [];
      var seenSet = new Set();
      pend.forEach(function (c) {
        var mc = mergedCatalogCard(c);
        var label = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "ライブ")).trim();
        if (!seenSet.has(label)) {
          seenSet.add(label);
          seen.push(label);
        }
      });
      var nameLine =
        seen.length <= 2 ? seen.join("・") : seen.slice(0, 2).join("・") + " ほか計 " + pend.length + " 枚";
      if (pend.length > 1) {
        if (
          !window.confirm(
            "ライブ判定は成功ですが、「成功ライブ置き場」に該当のライブカードが載っていません。\n「" +
              nameLine +
              "」のうち 1 枚だけ成功ライブ置き場へ移しますか？\n（OK でカードを選びます。キャンセルでは移しません）",
          )
        ) {
          runTurnPhaseStartAfterSuccessLivePrompt();
          return;
        }
        openPickSuccessLiveDialog(pend, function (chosenId) {
          if (chosenId != null) {
            var m = migrateOneLiveCardToSuccessfulAreaById(chosenId);
            if (m) {
              showToast("選んだライブカードを成功ライブ置き場へ移しました");
              logReplay("turn-phase-auto-move-success-live", { liveCards: m, pickOne: true });
            }
          }
          runTurnPhaseStartAfterSuccessLivePrompt();
        });
        return;
      }
      if (
        window.confirm(
          "ライブ判定は成功ですが、「成功ライブ置き場」に該当のライブカードが載っていません。\n「" +
            nameLine +
            "」を成功ライブ置き場へ移しますか？\n（OK で移動。キャンセルでは自動移動せず、このあとも解決・ライブ枠は控え室へ送られます）",
        )
      ) {
        var movedN = migratePendingLiveCardsToSuccessfulArea();
        if (movedN) {
          showToast(movedN + " 枚のライブカードを成功ライブ置き場へ移しました");
          logReplay("turn-phase-auto-move-success-live", { liveCards: movedN });
        }
      }
    }
    runTurnPhaseStartAfterSuccessLivePrompt();
  }

  function doMulliganExecute() {
    if (!state.awaitingTurnStart) {
      showToast("マリガンは「ターン開始」の前のみ使えます");
      return;
    }
    openingMulliganExecuteUsed = true;
    var pickSet = new Set(state.mulliganSelectedIds || []);
    var toReturn = state.hand.filter(function (c) {
      return pickSet.has(c.id);
    });
    if (!toReturn.length) {
      pushHistoryBefore("mulligan-commit-zero");
      state.mulliganSelectedIds = [];
      logReplay("mulligan-commit-zero");
      persistOpeningMulliganRememberedK(0);
      showToast("マリガン: 0枚処理（シャッフル・ドローなしで確定しました）");
      render();
      return;
    }
    pushHistoryBefore("mulligan");
    var k = toReturn.length;
    state.hand = state.hand.filter(function (c) {
      return !pickSet.has(c.id);
    });
    state.deck.push.apply(state.deck, toReturn);
    state.deck = shuffle(state.deck);
    var drawn = 0;
    for (var i = 0; i < k; i++) {
      tryReplenishDeckFromWaitingLoop();
      if (!state.deck.length) break;
      state.hand.push(state.deck.shift());
      drawn++;
    }
    state.mulliganSelectedIds = [];
    logReplay("mulligan", { returned: k, drawn });
    persistOpeningMulliganRememberedK(k);
    if (drawn === k) {
      showToast("マリガン: " + k + " 枚を山札に戻してシャッフルし、" + drawn + " 枚ドローしました");
    } else {
      showToast(
        "マリガン: " + k + " 枚を戻しましたが、山札が足りず " + drawn + " 枚しかドローできませんでした",
      );
    }
    render();
  }

  $("btn-turn-start")?.addEventListener("click", doTurnPhaseStart);

  $("btn-zone-hints")?.addEventListener("click", function () {
    document.body.classList.toggle("zone-hints-visible");
    var on = document.body.classList.contains("zone-hints-visible");
    var b = $("btn-zone-hints");
    if (b) {
      b.textContent = on ? "ゾーン説明を隠す" : "ゾーン説明を表示";
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
  });
  $("btn-tutorial-game")?.addEventListener("click", function () {
    var d = document.getElementById("dlg-tutorial");
    if (d && typeof d.showModal === "function") d.showModal();
  });
  (function syncZoneHintDefaultClosed() {
    document.body.classList.remove("zone-hints-visible");
    var b = $("btn-zone-hints");
    if (!b) return;
    b.textContent = "ゾーン説明を表示";
    b.setAttribute("aria-pressed", "false");
  })();

  $("btn-mulligan-execute")?.addEventListener("click", doMulliganExecute);

  $("btn-live-score-bonus-minus")?.addEventListener("click", function () {
    if (!state.liveStatsAfterBegin) return;
    pushHistoryBefore("live-score-bonus");
    state.liveScoreEffectBonus = Math.max(-99, Math.floor(Number(state.liveScoreEffectBonus) || 0) - 1);
    render();
  });
  $("btn-live-score-bonus-plus")?.addEventListener("click", function () {
    if (!state.liveStatsAfterBegin) return;
    pushHistoryBefore("live-score-bonus");
    state.liveScoreEffectBonus = Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0) + 1);
    render();
  });

  function doLiveTurnStart() {
    if (state.awaitingTurnStart) {
      showToast("マリガン・ターン開始が終わってから使ってください");
      return;
    }
    if (state.liveTurnPickMode) return;
    pushHistoryBefore("live-turn-start");
    liveTurnStartGlowArmed = false;
    state.liveTurnPickMode = true;
    state.liveTurnSelectedIds = [];
    state.liveTurnHandSpreadPick = state.hand.length >= LIVE_TURN_HAND_SPREAD_MIN;
    state.liveStatsAfterBegin = false;
    state.liveScoreEffectBonus = 0;
    state.pendingDrawYellHandDraws = 0;
    var spreadNote = state.liveTurnHandSpreadPick
      ? " 手札が多いため、選択中はカードを重ねずに並べます。"
      : "";
    showToast(
      "ライブターン: 手札で選び、表示が「ライブエリアへ」になったボタンで配置（「ライブ開始」で終了）" + spreadNote,
    );
    render();
  }

  function doLiveTurnToArea() {
    if (!state.liveTurnPickMode) return;
    const pickSet = new Set(state.liveTurnSelectedIds);
    const ordered = [];
    state.hand.forEach(function (c) {
      if (!pickSet.has(c.id)) return;
      if (c.type === T_MEMBER || c.type === T_LIVE) ordered.push(c);
    });
    if (!ordered.length) {
      if (state.liveTurnSelectedIds.length) {
        showToast("ライブへ置けるのはメンバーまたはライブカードのみです");
      } else {
        showToast("手札からカードを選んでください");
      }
      return;
    }
    const keysPref = ["center", "left", "right"];
    const emptyKeys = keysPref.filter(function (k) {
      return state.liveArea[k].length === 0;
    });
    if (ordered.length > emptyKeys.length) {
      showToast("空いているライブ枠が足りません（一度に並べられるのは 3 枠までです）");
      return;
    }
    pushHistoryBefore("live-turn-to-live");
    const n = ordered.length;
    for (var i = 0; i < n; i++) {
      const slotKey = emptyKeys[i];
      const card = ordered[i];
      if (card.type === T_MEMBER || card.type === T_LIVE) card.isRotated = true;
      state.liveArea[slotKey].push(card);
    }
    const rid = new Set(
      ordered.map(function (c) {
        return c.id;
      }),
    );
    state.hand = state.hand.filter(function (c) {
      return !rid.has(c.id);
    });
    var drawn = 0;
    for (var j = 0; j < n; j++) {
      tryReplenishDeckFromWaitingLoop();
      if (!state.deck.length) break;
      state.hand.push(state.deck.shift());
      drawn++;
    }
    state.liveTurnSelectedIds = [];
    logReplay("live-turn-to-live", { placed: n, drawn });
    showToast(
      "ライブに " +
        n +
        " 枚を配置し、手札に " +
        drawn +
        " 枚ドローしました" +
        (drawn < n ? "（山札が足りず " + (n - drawn) + " 枚はドローできませんでした）" : ""),
    );
    render();
  }

  function doLiveTurnBegin() {
    if (!state.liveTurnPickMode) return;
    pushHistoryBefore("live-turn-begin");
    clearTurnScopedPlayBonusesEverywhere();
    var movedNonLive = 0;
    ["left", "center", "right"].forEach(function (k) {
      const slot = state.liveArea[k];
      const kept = [];
      slot.forEach(function (c) {
        if (c.type === T_LIVE) kept.push(c);
        else {
          state.waitingRoom.push(c);
          movedNonLive++;
        }
      });
      state.liveArea[k] = kept;
    });
    state.liveTurnPickMode = false;
    state.liveTurnSelectedIds = [];
    state.liveTurnHandSpreadPick = false;
    state.liveScoreEffectBonus = 0;
    state.ealeNoteLiveHitIds = [];
    state.pendingDrawYellHandDraws = 0;
    state.liveStatsAfterBegin = true;
    logReplay("live-turn-begin", { nonLiveMoved: movedNonLive });
    showToast(
      movedNonLive
        ? "ライブ開始 — ライブカード以外を控え室へ送りました（" + movedNonLive + " 枚）"
        : "ライブターンを終了しました",
    );
    render();
  }

  $("btn-live-turn-primary")?.addEventListener("click", function () {
    if (state.liveTurnPickMode) doLiveTurnToArea();
    else doLiveTurnStart();
  });
  $("btn-live-turn-begin")?.addEventListener("click", doLiveTurnBegin);

  $("btn-deck-toggle")?.addEventListener("click", () => {
    state.deckPileOpen = !state.deckPileOpen;
    syncDeckPileUi();
    scheduleDeckPileAutoLayout();
  });

  $("btn-draw-hand")?.addEventListener("click", () => {
    tryReplenishDeckFromWaitingLoop();
    if (!state.deck.length) {
      showToast("デッキの上にカードがありません");
      return;
    }
    pushHistoryBefore("draw-hand");
    var drawnH = state.deck.shift();
    markCardFlashDraw(drawnH);
    state.hand.push(drawnH);
    showToast("手札に 1 枚ドローしました");
    render();
  });

  $("btn-draw-waiting")?.addEventListener("click", () => {
    tryReplenishDeckFromWaitingLoop();
    if (!state.deck.length) {
      showToast("デッキの上にカードがありません");
      return;
    }
    pushHistoryBefore("draw-wait");
    var drawnW = state.deck.shift();
    markCardFlashDraw(drawnW);
    state.waitingRoom.push(drawnW);
    showToast("控室に 1 枚ドローしました");
    render();
  });

  function drawOneCardToResolution() {
    tryReplenishDeckFromWaitingLoop();
    if (!state.deck.length) {
      showToast("デッキの上にカードがありません");
      return;
    }
    pushHistoryBefore("draw-res");
    var prevResLen = state.resolutionArea.length;
    var drawnR = state.deck.shift();
    /* ドローエール BH のライブのみ、エール進行中に解決へめくったとき「ドローエール+1」（ピンク）と待機ドロー計上。 */
    var inLive = state.liveStatsAfterBegin === true || state.liveTurnPickMode === true;
    var drawYellBh = catalogLiveCardIsDrawYellBladeHeart(mergedCatalogCard(drawnR));
    if (inLive && drawYellBh) {
      markCardFlashDraw(drawnR, FLASH_LABEL_DRAW_YELL_PLUS_ONE);
      state.pendingDrawYellHandDraws = Math.max(0, Math.floor(Number(state.pendingDrawYellHandDraws) || 0)) + 1;
    } else if (!inLive) {
      markCardFlashDraw(drawnR);
    }
    state.resolutionArea.push(drawnR);
    maybeFlushPendingDrawYellHandDraws(prevResLen);
    showToast(inLive ? "解決に 1 枚エールしました" : "解決に 1 枚ドローしました");
    render();
  }

  $("btn-draw-resolution")?.addEventListener("click", drawOneCardToResolution);
  $("btn-res-draw-one")?.addEventListener("click", drawOneCardToResolution);

  $("btn-deck-shuffle")?.addEventListener("click", function () {
    if (!state.deck.length) {
      showToast("山札にカードがありません");
      return;
    }
    pushHistoryBefore("deck-shuffle");
    state.deck = shuffle(state.deck);
    showToast("山札をシャッフルしました（Undo で戻せます）");
    render();
  });

  $("btn-deck-face")?.addEventListener("click", function () {
    pushHistoryBefore("deck-face-toggle");
    state.deckPileFacesDown = !state.deckPileFacesDown;
    render();
  });

  $("btn-res-top")?.addEventListener("click", () => {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    pushHistoryBefore("res-to-deck-top");
    state.pendingDrawYellHandDraws = 0;
    const nu = state.resolutionArea.length;
    state.deck.unshift(...state.resolutionArea);
    state.resolutionArea = [];
    showToast(nu + " 枚をデッキの上に戻しました");
    render();
  });

  $("btn-res-shuf")?.addEventListener("click", () => {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    pushHistoryBefore("res-shuffle-in");
    state.pendingDrawYellHandDraws = 0;
    state.deck.push(...state.resolutionArea);
    state.resolutionArea = [];
    state.deck = shuffle(state.deck);
    showToast("解決をデッキに戻してシャッフルしました");
    render();
  });

  $("btn-res-wait")?.addEventListener("click", () => {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    pushHistoryBefore("res-to-wait");
    state.waitingRoom.push(...state.resolutionArea);
    state.resolutionArea = [];
    render();
  });

  function openEnergyQtyDialog() {
    const dlg = document.getElementById("dlg-energy-qty");
    const rng = document.getElementById("energy-qty-range");
    const nin = document.getElementById("energy-qty-input");
    const curEl = document.getElementById("energy-qty-current");
    const afterEl = document.getElementById("energy-qty-after");
    if (!dlg || !rng || !nin || !dlg.showModal) return;
    const cur = state.energyArea.length;
    if (curEl) curEl.textContent = String(cur);
    const v0 = Math.min(MAX_ENERGY_SIDE, Math.max(0, cur));
    rng.value = String(v0);
    nin.value = String(v0);
    if (afterEl) afterEl.textContent = String(v0);
    dlg.showModal();
  }

  (function wireEnergyQtyStaticsOnce() {
    const dlg = document.getElementById("dlg-energy-qty");
    if (!dlg || dlg.dataset.llocgEnergyStaticWired === "1") return;
    dlg.dataset.llocgEnergyStaticWired = "1";
    const rng = document.getElementById("energy-qty-range");
    const nin = document.getElementById("energy-qty-input");
    const afterEl = document.getElementById("energy-qty-after");
    if (!rng || !nin) return;
    function clampEnergyTarget(v) {
      return Math.max(0, Math.min(MAX_ENERGY_SIDE, Math.floor(Number(v)) || 0));
    }
    rng.addEventListener("input", function () {
      const v = clampEnergyTarget(rng.value);
      rng.value = String(v);
      nin.value = String(v);
      if (afterEl) afterEl.textContent = String(v);
    });
    nin.addEventListener("input", function () {
      const v = clampEnergyTarget(nin.value);
      rng.value = String(v);
      nin.value = String(v);
      if (afterEl) afterEl.textContent = String(v);
    });
  })();

  const btnEnergyQtyApply = document.getElementById("btn-energy-qty-apply");
  const btnEnergyQtyCancel = document.getElementById("btn-energy-qty-cancel");
  if (btnEnergyQtyApply) {
    btnEnergyQtyApply.onclick = function () {
      const rng = document.getElementById("energy-qty-range");
      const dlg = document.getElementById("dlg-energy-qty");
      if (!rng || !dlg) return;
      const target = Math.max(0, Math.min(MAX_ENERGY_SIDE, Math.floor(Number(rng.value)) || 0));
      pushHistoryBefore("energy-set-count");
      while (state.energyArea.length < target) state.energyArea.push(energyInstance());
      while (state.energyArea.length > target) state.energyArea.pop();
      dlg.close();
      showToast("側面エネを " + target + " 枚に設定しました");
      render();
    };
  }
  if (btnEnergyQtyCancel) {
    btnEnergyQtyCancel.onclick = function () {
      const dlg = document.getElementById("dlg-energy-qty");
      if (dlg) dlg.close();
    };
  }

  function bindEnergyAdjLongPress(btnEl) {
    if (!btnEl) return;
    let t = null;
    btnEl.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (t) clearTimeout(t);
      t = window.setTimeout(function () {
        t = null;
        suppressNextEnergyTap = true;
        openEnergyQtyDialog();
      }, 450);
    });
    function cancel() {
      if (t) {
        clearTimeout(t);
        t = null;
      }
    }
    btnEl.addEventListener("pointerup", cancel);
    btnEl.addEventListener("pointerleave", cancel);
    btnEl.addEventListener("pointercancel", cancel);
  }
  bindEnergyAdjLongPress($("btn-energy-plus"));
  bindEnergyAdjLongPress($("btn-energy-minus"));

  $("btn-energy-minus")?.addEventListener("click", () => {
    if (suppressNextEnergyTap) {
      suppressNextEnergyTap = false;
      return;
    }
    if (state.energyArea.length <= 0) return;
    pushHistoryBefore("energy-minus");
    state.energyArea.pop();
    render();
  });

  $("btn-energy-plus")?.addEventListener("click", () => {
    if (suppressNextEnergyTap) {
      suppressNextEnergyTap = false;
      return;
    }
    if (state.energyArea.length >= MAX_ENERGY_SIDE) return;
    pushHistoryBefore("energy-plus");
    state.energyArea.push(energyInstance());
    render();
  });

  $("btn-undo")?.addEventListener("click", doUndo);

  $("btn-redo")?.addEventListener("click", doRedo);

  $("btn-help")?.addEventListener("click", () => {
    const dlg = document.getElementById("dlg-help");
    if (dlg && dlg.showModal) dlg.showModal();
  });

  $("btn-export-replay")?.addEventListener("click", () => {
    const payload = JSON.stringify({ v: 1, generatedAt: new Date().toISOString(), replay: replayLog }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "loveca-replay-log-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("操作ログ JSON を出力しました（非標準ログです）");
  });

  function saveSnapshotSlot(si) {
    try {
      const meta = {
        firstPlayer: $("select-first-player")?.value || "—",
      };
      const payload = {
        v: 1,
        board: snapshotBoard(),
        undoHistory: [...undoHistory],
        redoHistory: [...redoHistory],
        uid: uid,
        meta,
      };
      sessionStorage.setItem(STORAGE_SNAPSHOT_PREFIX + String(si), JSON.stringify(payload));
      showToast("スナップショット " + (si + 1) + " を保存しました（このブラウザのセッション内）");
    } catch (e) {
      showToast("保存に失敗しました: " + (e && e.message));
    }
  }

  function loadSnapshotSlot(si) {
    try {
      const raw = sessionStorage.getItem(STORAGE_SNAPSHOT_PREFIX + String(si));
      if (!raw) {
        showToast("スロット " + (si + 1) + " は空です");
        return;
      }
      if (!confirm("盤面をスナップショット " + (si + 1) + " の内容で置き換えますか？（Undo 履歴も復元されます）")) return;
      const o = JSON.parse(raw);
      applyBoard(o.board);
      undoHistory = Array.isArray(o.undoHistory) ? o.undoHistory : [];
      redoHistory = Array.isArray(o.redoHistory) ? o.redoHistory : [];
      if (typeof o.uid === "number" && o.uid > 0) uid = o.uid;
      if (o.meta) {
        if ($("select-first-player")) $("select-first-player").value = o.meta.firstPlayer || "—";
      }
      persistSessionTexts();
      logReplay("snapshot-load", { slot: si });
      render();
    } catch (e) {
      showToast("復元に失敗しました");
    }
  }

  $("btn-snap-save-1")?.addEventListener("click", () => saveSnapshotSlot(0));
  $("btn-snap-save-2")?.addEventListener("click", () => saveSnapshotSlot(1));
  $("btn-snap-save-3")?.addEventListener("click", () => saveSnapshotSlot(2));
  $("btn-snap-load-1")?.addEventListener("click", () => loadSnapshotSlot(0));
  $("btn-snap-load-2")?.addEventListener("click", () => loadSnapshotSlot(1));
  $("btn-snap-load-3")?.addEventListener("click", () => loadSnapshotSlot(2));

  $("btn-deck-pick-clear")?.addEventListener("click", () => {
    clearDeckPickSelection();
    logReplay("deck-pick-clear");
  });

  function refreshPlayDeckPresetSelect() {
    var sel = $("play-deck-preset-select");
    if (!sel) return;
    var lib = loadDeckLibrary();
    var prev = sel.value;
    sel.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = lib.slots.length ? "— プリセットを選択 —" : "（保存デッキがありません）";
    sel.appendChild(opt0);
    for (var i = 0; i < lib.slots.length; i++) {
      var sl = lib.slots[i];
      var o = document.createElement("option");
      o.value = sl.id;
      o.textContent = sl.name || "無題";
      sel.appendChild(o);
    }
    if (prev) {
      for (var j = 0; j < sel.options.length; j++) {
        if (sel.options[j].value === prev) {
          sel.selectedIndex = j;
          break;
        }
      }
    }
  }

  $("btn-play-deck-preset-refresh")?.addEventListener("click", function () {
    refreshPlayDeckPresetSelect();
    showToast("保存デッキ一覧を読み直しました");
  });
  $("btn-play-deck-preset-apply")?.addEventListener("click", function () {
    var sel = $("play-deck-preset-select");
    if (!sel || !sel.value) {
      showToast("保存デッキを選んでください");
      return;
    }
    var lib = loadDeckLibrary();
    var slot = null;
    for (var si = 0; si < lib.slots.length; si++) {
      if (lib.slots[si].id === sel.value) {
        slot = lib.slots[si];
        break;
      }
    }
    if (!slot || !slot.deck) {
      showToast("プリセットが見つかりません");
      refreshPlayDeckPresetSelect();
      return;
    }
    pushHistoryBefore("apply-saved-deck");
    activePlayDeckMap = normalizeDeckMapCounts(slot.deck);
    deckKeyCardNos = sanitizeDeckRoleCardNos(slot.keyCardNos);
    deckKeyCard2Nos = sanitizeDeckRoleCardNos(slot.keyCard2Nos);
    deckKeyCard3Nos = sanitizeDeckRoleCardNos(slot.keyCard3Nos);
    deckMiddleCardNos = sanitizeDeckRoleCardNos(slot.middleCardNos);
    state.deck = buildMainDeckInstances(activePlayDeckMap);
    tryReplenishDeckFromWaitingLoop();
    logReplay("apply-saved-deck", { slotId: slot.id });
    render();
    showToast("山札を「" + (slot.name || "無題") + "」に差し替えました（Undo で戻せます）");
  });

  $("btn-reset-game")?.addEventListener("click", () => {
    if (!confirm(
      "盤面をリセットしますか？（デッキは再シャッフル・初手 " +
        OPENING_HAND_SIZE +
        " 枚を自動ドロー／エネは初期化／Undo は消えます／操作ログもクリアされます）",
    ))
      return;
    undoHistory.length = 0;
    redoHistory.length = 0;
    replayLog = [];
    const deck = shuffle(buildMainDeckInstances(activePlayDeckMap));
    const hand = [];
    dealOpeningHand(deck, hand, OPENING_HAND_SIZE);
    applyBoard({
      deck,
      hand,
      previewScratch: [],
      deckPileOpen: false,
      deckPileFacesDown: false,
      stage: { left: [], center: [], right: [] },
      liveArea: { left: [], center: [], right: [] },
      successfulLiveArea: [],
      waitingRoom: [],
      resolutionArea: [],
      energyArea: initialEnergyArea(),
      turnCount: 0,
      awaitingTurnStart: true,
      mulliganSelectedIds: [],
      liveTurnPickMode: false,
      liveTurnSelectedIds: [],
      liveTurnHandSpreadPick: false,
      liveStatsAfterBegin: false,
      liveScoreEffectBonus: 0,
      ealeNoteLiveHitIds: [],
      pendingDrawYellHandDraws: 0,
    });
    var fpR = $("select-first-player");
    if (fpR) {
      fpR.value = Math.random() < 0.5 ? "先攻" : "後攻";
      persistSessionTexts();
    }
    uid = Math.max(uid, 999);
    logReplay("reset-board");
    openingMulliganExecuteUsed = false;
    openingMulliganRememberedK = null;
    deckOddsOpeningMullBaselineOn = false;
    try {
      sessionStorage.removeItem(STORAGE_OPENING_MULLIGAN_K);
      sessionStorage.removeItem(STORAGE_DECK_ODDS_OPENING_MULL_MODEL);
    } catch (_) {
      /* noop */
    }
    liveTurnStartGlowArmed = false;
    render();
    showToast("盤面を初期化しました");
  });

  $("btn-back-builder")?.addEventListener("click", () => {
    if (typeof onBackToDeck === "function") onBackToDeck();
  });

  var stageMemberEmphStorageKey = "llocg_stage_member_emphasis";
  function syncStageMemberEmphasisUi() {
    var on = document.body.classList.contains("stage-member-emphasis");
    var btn = $("btn-stage-member-emphasis");
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn-stage-member-emphasis--on", on);
    }
  }
  try {
    if (sessionStorage.getItem(stageMemberEmphStorageKey) === "1") {
      document.body.classList.add("stage-member-emphasis");
    }
  } catch (_) {}
  syncStageMemberEmphasisUi();
  $("btn-stage-member-emphasis")?.addEventListener("click", function (ev) {
    ev.preventDefault();
    var on = !document.body.classList.contains("stage-member-emphasis");
    document.body.classList.toggle("stage-member-emphasis", on);
    try {
      sessionStorage.setItem(stageMemberEmphStorageKey, on ? "1" : "0");
    } catch (_) {}
    syncStageMemberEmphasisUi();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () {
        updateHandZoneLayoutMode();
        deckPileScheduleLayoutRef();
      });
    }
  });

  function toggleWaitingRailExpanded(ev) {
    if (ev && ev.type === "click" && ev.target.closest) {
      const ign = ev.target.closest("button, a, label, input");
      if (ign) return;
    }
    const row = $("waiting-row");
    if (!row) return;
    row.classList.toggle("waiting-row--collapsed");
    syncWaitingRailAria();
    renderSynchronouslyOnce();
  }

  // render / DOM差し替えで直接バインドが外れることがあるため委譲に切り替え
  // ただし mountSimulator が複数回実行されると同じ root にリスナが積み上がり、
  // 偶数回 classList.toggle() が走って「開かない」事象になる。前回ハンドラを必ず除去してから登録。
  if (root) {
    if (typeof root.__llocgWaitingClickHandler === "function") {
      root.removeEventListener("click", root.__llocgWaitingClickHandler);
    }
    if (typeof root.__llocgWaitingKeydownHandler === "function") {
      root.removeEventListener("keydown", root.__llocgWaitingKeydownHandler);
    }
    root.__llocgWaitingClickHandler = function (ev) {
      const head = ev?.target?.closest ? ev.target.closest("#waiting-head-expand") : null;
      if (!head) return;
      toggleWaitingRailExpanded(ev);
    };
    root.__llocgWaitingKeydownHandler = function (ev) {
      if (ev?.key !== "Enter" && ev?.key !== " ") return;
      const head = ev?.target?.closest ? ev.target.closest("#waiting-head-expand") : null;
      if (!head) return;
      ev.preventDefault();
      toggleWaitingRailExpanded(ev);
    };
    root.addEventListener("click", root.__llocgWaitingClickHandler);
    root.addEventListener("keydown", root.__llocgWaitingKeydownHandler);
  }

  // プレビュー見出しは静的要素なので、再マウント時に古いリスナがそのまま残ると
  // 偶数回 toggle が走って開閉が無効化される。古いリスナを除去するため要素を入れ替えて束縛し直す。
  (function rewirePreviewHeadExpand() {
    const old = document.getElementById("preview-head-expand");
    if (!old) return;
    const fresh = old.cloneNode(true);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener("click", togglePreviewRailExpanded);
    fresh.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      togglePreviewRailExpanded(ev);
    });
  })();

  (function initPlayTopFixedStripCollapse() {
    var strip = document.getElementById("play-top-fixed-strip");
    var btn = document.getElementById("btn-play-top-strip-toggle");
    var KEY = "llocg_play_top_strip_collapsed";
    if (!strip || !btn) return;
    function applyCollapsed(on) {
      strip.classList.toggle("play-top-fixed-strip--collapsed", on);
      btn.setAttribute("aria-expanded", on ? "false" : "true");
      btn.textContent = on ? "開く" : "閉じる";
      try {
        sessionStorage.setItem(KEY, on ? "1" : "0");
      } catch (_) {}
    }
    try {
      applyCollapsed(sessionStorage.getItem(KEY) === "1");
    } catch (_) {
      applyCollapsed(false);
    }
    btn.addEventListener("click", function () {
      applyCollapsed(!strip.classList.contains("play-top-fixed-strip--collapsed"));
    });
  })();

  (function initPlayHandOuterScrollLock() {
    function clearHandOuterScrollLock() {
      document.body.classList.remove("play-hand-zone-active");
    }
    function onHandPointerDown(ev) {
      if (!document.body.classList.contains("chrome-layout-play-mobile-portrait")) return;
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest("#zone-hand, #hand-row")) document.body.classList.add("play-hand-zone-active");
    }
    if (typeof window.__llocgHandLockPup === "function") {
      window.removeEventListener("pointerup", window.__llocgHandLockPup, true);
      window.removeEventListener("pointercancel", window.__llocgHandLockPup, true);
    }
    window.__llocgHandLockPup = clearHandOuterScrollLock;
    window.addEventListener("pointerup", clearHandOuterScrollLock, true);
    window.addEventListener("pointercancel", clearHandOuterScrollLock, true);
    if (root) {
      if (typeof root.__llocgHandLockPdown === "function") {
        root.removeEventListener("pointerdown", root.__llocgHandLockPdown, true);
      }
      root.__llocgHandLockPdown = onHandPointerDown;
      root.addEventListener("pointerdown", onHandPointerDown, true);
    }
  })();

  if (root) {
    if (typeof root.__llocgStanceFocusPointerDown === "function") {
      root.removeEventListener("pointerdown", root.__llocgStanceFocusPointerDown, true);
    }
    root.__llocgStanceFocusPointerDown = function (ev) {
      var item = ev.target.closest && ev.target.closest(".card-item");
      if (!item || !root.contains(item)) return;
      var pid = item.parentElement ? item.parentElement.id : "";
      var t = item.dataset.type;
      if ((/^stage-/.test(pid) && t === T_MEMBER) || (pid === "zone-energy" && t === T_ENERGY)) {
        stanceKeyboardFocusCardId = item.dataset.id != null ? String(item.dataset.id) : "";
        stanceKeyboardFocusParentZoneId = pid;
      }
    };
    root.addEventListener("pointerdown", root.__llocgStanceFocusPointerDown, true);
  }

  if (typeof window.__llocgWaKeyHandler === "function") {
    window.removeEventListener("keydown", window.__llocgWaKeyHandler, true);
  }
  window.__llocgWaKeyHandler = function (ev) {
    var vg = document.getElementById("view-game");
    if (!vg || vg.hidden || vg.hasAttribute("hidden")) return;
    var tgn = ev.target && ev.target.tagName;
    if (tgn === "INPUT" || tgn === "TEXTAREA" || tgn === "SELECT") return;
    if (ev.target && ev.target.closest && ev.target.closest("dialog")) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var ch = ev.key;
    if (ch !== "w" && ch !== "W" && ch !== "a" && ch !== "A") return;
    var inst = findBoardCardByInstanceId(stanceKeyboardFocusCardId);
    if (!inst) return;
    var pid = stanceKeyboardFocusParentZoneId || "";
    if (/^stage-/.test(pid)) {
      if (inst.type !== T_MEMBER) return;
    } else if (pid === "zone-energy") {
      if (inst.type !== T_ENERGY) return;
    } else {
      return;
    }
    ev.preventDefault();
    if (pid === "zone-energy" && inst.type === T_ENERGY) {
      if (ch === "w" || ch === "W") {
        pushHistoryBefore("keyboard-energy-wait");
        inst.isRotated = !inst.isRotated;
        inst.lcWait = inst.isRotated === true;
        inst.lcActive = inst.lcWait !== true;
      } else {
        pushHistoryBefore("keyboard-energy-active");
        inst.isRotated = false;
        inst.lcWait = false;
        inst.lcActive = true;
      }
      renderSynchronouslyOnce();
      return;
    }
    if (ch === "w" || ch === "W") {
      pushHistoryBefore("keyboard-lcWait");
      inst.lcWait = !inst.lcWait;
    } else {
      pushHistoryBefore("keyboard-lcActive");
      inst.lcActive = !inst.lcActive;
    }
    renderSynchronouslyOnce();
  };
  window.addEventListener("keydown", window.__llocgWaKeyHandler, true);

  const btnHandMask = $("toggle-hand-mask");
  if (sessionStorage.getItem("llocg_hide_hand_stream") === "1") {
    document.body.classList.add("hide-hand-stream");
  }
  if (btnHandMask) {
    const syncHandMaskBtn = function () {
      const on = document.body.classList.contains("hide-hand-stream");
      btnHandMask.textContent = on ? "手札を表示" : "手札を隠す";
      btnHandMask.setAttribute("aria-pressed", on ? "true" : "false");
      btnHandMask.classList.toggle("toggle-hand-mask--on", on);
    };
    syncHandMaskBtn();
    btnHandMask.addEventListener("click", function () {
      const on = !document.body.classList.contains("hide-hand-stream");
      document.body.classList.toggle("hide-hand-stream", on);
      sessionStorage.setItem("llocg_hide_hand_stream", on ? "1" : "0");
      syncHandMaskBtn();
    });
  }

  function clampStreamMaskStrength01(x) {
    if (!Number.isFinite(x)) return 0.85;
    return Math.max(0.05, Math.min(0.98, x));
  }
  function loadStreamMaskStrength01() {
    try {
      var raw = sessionStorage.getItem(STORAGE_STREAM_MASK_STRENGTH);
      if (raw != null && raw !== "") {
        var n = Number(raw);
        if (Number.isFinite(n)) {
          if (n > 1) return clampStreamMaskStrength01(n / 100);
          return clampStreamMaskStrength01(n);
        }
      }
    } catch (_) {}
    return 0.85;
  }
  function persistStreamMaskStrength01(s01) {
    try {
      sessionStorage.setItem(STORAGE_STREAM_MASK_STRENGTH, String(clampStreamMaskStrength01(s01)));
    } catch (_) {}
  }
  function applyStreamMaskStrengthToBody(s01) {
    var s = clampStreamMaskStrength01(s01);
    document.body.style.setProperty("--stream-mask-strength", String(s));
    var rng = $("stream-mask-density");
    if (rng && document.activeElement !== rng) {
      rng.value = String(Math.round(s * 100));
    }
  }
  applyStreamMaskStrengthToBody(loadStreamMaskStrength01());
  var streamMaskDensityEl = $("stream-mask-density");
  if (streamMaskDensityEl) {
    streamMaskDensityEl.addEventListener("input", function () {
      var v = Number(streamMaskDensityEl.value);
      if (!Number.isFinite(v)) v = 85;
      var s01 = clampStreamMaskStrength01(v / 100);
      persistStreamMaskStrength01(s01);
      applyStreamMaskStrengthToBody(s01);
    });
  }

  deckPileWindowResizeHandler = function () {
    if (deckPileLayoutDebounce) clearTimeout(deckPileLayoutDebounce);
    deckPileLayoutDebounce = window.setTimeout(function () {
      deckPileLayoutDebounce = 0;
      syncPlayBoardChromeMounts();
      deckPileScheduleLayoutRef();
      updateHandZoneLayoutMode();
      updateWaitingZoneOverlapMode();
      updateResolutionZoneOverlapMode();
    }, 140);
  };
  window.addEventListener("resize", deckPileWindowResizeHandler, { passive: true });
  window.addEventListener(
    "orientationchange",
    function () {
      window.setTimeout(syncPlayBoardChromeMounts, 180);
    },
    { passive: true },
  );

  /** カード拡大（ダブルクリック） */
  root.addEventListener(
    "dblclick",
    function (ev) {
      var img = ev.target.closest(".card-img");
      if (!img || !root.contains(img)) return;
      ev.preventDefault();
      openCardZoomFromImg(img);
    },
    false,
  );

  loadSessionTexts();
  if (resumedFromStorage) persistSessionTexts();
  (function randomizeSoloFirstPlayerForNewSession() {
    if (resumedFromStorage) return;
    var fp = $("select-first-player");
    if (!fp) return;
    fp.value = Math.random() < 0.5 ? "先攻" : "後攻";
    persistSessionTexts();
  })();
  refreshPlayDeckPresetSelect();
  syncPlayBoardChromeMounts();
  /** 同期レンダーで盤面・Sortable・+H/B を確実に有効化（初回のみ遅延すると操作が死ぬ） */
  renderSynchronouslyOnce();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
      updateHandZoneLayoutMode();
      updateWaitingZoneOverlapMode();
      updateResolutionZoneOverlapMode();
      deckPileScheduleLayoutRef();
    });
  }
}
