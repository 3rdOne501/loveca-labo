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
  STORAGE_ACTIVE_PRESET_ID,
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
  STORAGE_LIGHTWEIGHT_PLAY,
  cardNoIsMiaTaylorPb1011,
  cardNoIsZhongLanzhuBp1012,
  T_ENERGY,
  T_LIVE,
  T_MEMBER,
} from "./config.js";
import {
  getAllCards,
  getCard,
  catalogListThumbnailUrl,
  effectiveMainDeckCategory,
  bladeHeartSlotsOnCard,
  isHandDependentCost20Member,
  cardIsSpBp4004Sumire,
  catalogCardNosShareIdentity,
  cardIsNoteLiveCatalog,
  catalogEaleScoreHeartPoints,
  cardIsDrawYellLiveCatalog,
  memberHasKidouAbility,
  memberHasKidouStageToWaitingPickAbility,
  memberKidouRecoverHandType,
  classifyCardAbility,
  catalogCardMatchesPickFilters,
  abilityEffectIsAutomated,
  abilityPlainText,
  memberHasOptionalToujouAbility,
  memberHasToujouAbility,
  memberHasLiveStartAbility,
  memberHasOptionalLiveStartAbility,
  memberHasLiveSuccessAbility,
  cardHasTrigger,
  splitAbilityByTriggers,
  abilityRawSegmentForTrigger,
  cardAbilityRawText,
  cardCannotPlaceOnSuccessLive,
} from "./cards.js";
import { catalogCardMatchesGroupTag, canonicalizeDisplayPunctuation } from "./cardGroups.js";
import {
  abilityInstMatchesStageArea,
  cardAllowsTwoMemberBaton,
  extractGrantedJoujiTextsFromSegment,
  listNativeToujouSegmentRaws,
  parseLiveTotalScorePlusFromText,
  parseAbilityPickFilters,
} from "./abilityEffects.js";
import { lastCostDiscardedIncludesLive } from "./abilityComposition.js";
import {
  evaluateMemberJouji,
  joujiHeartSlotRead,
  computeStageGrantHandCostReduceNoAbility,
  computeJoujiHandCostReductionForCard,
  catalogMemberHasNoAbility,
  memberHasMirrorUnderLiveSuccessJouji,
  getJoujiBatonSeriesOnlyTag,
  classifyJoujiSegment,
  listNativeJoujiSegmentRaws,
} from "./joujiEffects.js";
import {
  listNativeJidouSegmentRaws,
  classifyJidouAutoSegment,
} from "./jidouAutoEffects.js";
import { templateHandlesOwnCost } from "./abilityRuntimeMeta.js";
import {
  boardMemberEffectIconHtml,
  boardYellFloatIconHtml,
} from "./gameStatusIcons.js";
import { loadDeckLibrary, normalizeDeckMapCounts } from "./deckLibrary.js";
import { getCurrentCloudUser, getEffectiveCloudUser } from "./cloudAuth.js";
import {
  advanceVersusTurn,
  canRoleActInVersus,
  claimVersusFirstFromSuccessLive,
  clearVersusEffectHighlight,
  completeVersusOpeningMulligan,
  concedeVersusMatch,
  endVersusTurn,
  resetVersusMatchForNextGame,
  evaluateVersusWinFromCounts,
  isVersusLivePhase,
  isVersusTurnForRole,
  pushVersusBoardPublic,
  pushVersusEffectHighlight,
  pushVersusEffectUi,
  requestVersusBoardAction,
  respondVersusBoardAction,
  clearVersusBoardActionRequest,
  rollbackVersusMatchState,
  pushVersusPublicState,
  describeVersusFlowForRole,
  getVersusLiveStep,
  buildVersusLiveStepUi,
  hasVersusRoleCompletedOpeningMulligan,
  normalizeVersusPhase,
  reportVersusLivePerfComplete,
  reportVersusLiveSetComplete,
  reportVersusSuccessFxDone,
  reportVersusWinIfEligible,
  subscribeVersusMatch,
  versusOpponentLabel,
  versusOpponentLastAction,
  versusBothLiveSetDone,
  versusBothLivePerfScoresReady,
  versusSecondPlayerRole,
  commitVersusLiveJudgment,
  finishVersusLiveJudgment,
  resolveVersusLiveJudgmentOutcome,
} from "./versusMatch.js";
import {
  boardToVersusPublicFromState,
  boardToVersusPublicFromStateForLocalDual,
  fingerprintVersusPublicBoard,
  getOpponentBoardPublic,
  hideVersusOpponentBoard,
  renderVersusOpponentBoard,
  resetVersusOpponentRevealToastState,
} from "./versusBoardSync.js";
import {
  initOpponentBoardApi,
  isDualOpponentBoardMode,
  listInactiveOpponentMemberCandidates,
  mutateInactiveOpponentBoard,
  readInactiveOpponentBoard,
  getInactiveOpponentSnapshot,
  opponentMemberZoneLabelFromSnapshot,
  countStageWaitMembersFromSnapshot,
  countStageMembersFromSnapshot,
  energyCountFromSnapshot,
} from "./opponentBoard.js";
import {
  appendVersusMatchLogFromReplay,
  clearVersusMatchLog,
  showVersusMatchLogPanel,
} from "./versusMatchLog.js";
import { persistVersusOnlineSession } from "./versusMode.js";
import {
  openCardCatalogDialog,
  catalogLiveCardIsDrawYellBladeHeart,
  wikiAbilityToStatusHtml,
} from "./cardCatalogDialog.js";
import {
  addBaseHeartToSlotAccum,
  addBladeHeartWeightsPerDisplaySlot,
  addNeedHeartToSlotAccum,
  bladeHeartDisplaySlotLabel,
  cardHasBladeHeart,
  evaluateNeedHeartFulfillment,
  formatBladeHeartSlotBreakdown,
  formatBladeHeartSlotBreakdownHtml,
  formatHeartSlotAccumBreakdown,
  formatHeartSlotAccumBreakdownHtml,
  heartSlotArtIconHtml,
  listAllNeedHeartDeficitsSequential,
  parseBladeHeartSlotFromKey,
  parseHeartColorSlotFromKey,
  sumBladeHeartWeightedValues,
  sumSlotAccumValues,
} from "./bladeHeart.js";
import * as Gsi from "./gameStatusIcons.js";
import { showToast } from "./ui.js";

/** 開幕マリガン／確率モデル用 sessionStorage キー（config 未同期のときの named import 失敗を避ける）。 */
const STORAGE_OPENING_MULLIGAN_K = "llocg_opening_mulligan_k";
const STORAGE_DECK_ODDS_OPENING_MULL_MODEL = "llocg_deck_odds_open_mull_model";

/** 山札／控え「残色」ピル → 一覧（mountSimulator のたびに差し替え。初回だけ DOM 委譲を張る） */
/** @type {((zoneId: string, slotKey: string) => void) | null} */
var zoneBhListOpener = null;
var zoneBhPillDelegationBound = false;

function callZoneBhListOpener(zoneId, slotKey) {
  try {
    if (typeof zoneBhListOpener === "function") zoneBhListOpener(zoneId, slotKey);
  } catch (_) {
    /* noop */
  }
}

/** `#deck-remain-bh-colors` / `#waiting-remain-bh-colors` — 2 ゲーム目以降も現行盤面を参照する */
function bindZoneBhPillClickDelegationOnce() {
  if (zoneBhPillDelegationBound) return;
  zoneBhPillDelegationBound = true;
  var deckHost = document.getElementById("deck-remain-bh-colors");
  var waitHost = document.getElementById("waiting-remain-bh-colors");
  function makeHandler(zoneId) {
    return function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var pill = t.closest(".deck-remain-bh-pill");
      if (!pill) return;
      var slot = pill.getAttribute("data-bh-slot");
      if (!slot) return;
      ev.preventDefault();
      ev.stopPropagation();
      callZoneBhListOpener(zoneId, String(slot));
    };
  }
  if (deckHost) deckHost.addEventListener("click", makeHandler("deck"));
  if (waitHost) waitHost.addEventListener("click", makeHandler("waiting"));
}

/**
 * プレイ画面の「スマホ縦レイアウト」を拾うか。
 * `orientation: portrait` だけでは iOS / PWA / インアプリブラウザで誤検出することがあるので、
 * アスペクト比および visualViewport の縦／横も参照する。
 * @returns {boolean}
 */
function matchesPlayPortraitLayout() {
  if (typeof window === "undefined") return false;
  var vv = window.visualViewport;
  var w = Math.round(vv && vv.width ? vv.width : window.innerWidth);
  var h = Math.round(vv && vv.height ? vv.height : window.innerHeight);
  if (w < 260 || h < 260) return false;
  if (Math.min(w, h) > 900) return false;

  var mmq = typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
  if (mmq) {
    try {
      if (!mmq("(max-width: 900px)").matches) return false;
    } catch (_) {
      if (w > 900) return false;
    }
    try {
      if (mmq("(orientation: portrait)").matches) return true;
    } catch (_) {
      /* noop */
    }
    try {
      if (mmq("(max-aspect-ratio: 1/1)").matches) return true;
    } catch (_) {
      /* noop */
    }
  } else if (w > 900) {
    return false;
  }

  return h + 8 >= w;
}

/** @type {{ t: string, act: string, meta?: object }[]} */
let replayLog = [];
/** 対戦中のみ replayLog を試合ログパネルへ転送 */
let versusMatchLogSinkEnabled = false;
let undoHistory = [];
/** @type {Record<string, unknown>[]} 対戦フェイズ／手番の巻き戻し用（undoHistory と同期） */
let versusMatchUndoStack = [];
/** @type {Record<string, unknown>[]} */
let versusMatchRedoStack = [];
/** @type {ReturnType<typeof setTimeout> | null} */
var liveSuccessEffectScheduleTimer = null;
/** ライブ成功誘発を一度スケジュール済みの判定指紋（Undo でクリア） */
var lastLiveSuccessOrchestrateFp = "";
let redoHistory = [];

let sortables = [];
/** @type {number} uid */
let uid = 1;
/** 側面エネに使うカード番号（空なら既定） */
let selectedEnergyCardNo = "";

/** ステージ側面メンバー追加のブレード表示（ゲームアイコン束） */
const MEMBER_BONUS_BLADE_IMG = Gsi.GAME_STATUS_ICON_ART_DIR + "icon_blade.png";

/** 山札レイアウトは window resize + 描画後 rAF のみ（#zone-deck の ResizeObserver はスクロールバーと相性が悪く長時間ブロックしうる） */
let deckPileResizeObserver = null;
/** syncPlayBoardChromeMounts: 直前と同じモバイル判定なら DOM 移動をスキップ（resize ループ抑制） */
let playChromeMountsLastMobile = null;
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
  if (window.__llocgDeckPileResizeHandler) {
    window.removeEventListener("resize", window.__llocgDeckPileResizeHandler, { passive: true });
    window.__llocgDeckPileResizeHandler = null;
  }
  if (window.visualViewport && window.__llocgDeckPileVvpHandler) {
    window.visualViewport.removeEventListener("resize", window.__llocgDeckPileVvpHandler, { passive: true });
    window.__llocgDeckPileVvpHandler = null;
  }
  playChromeMountsLastMobile = null;
  deckPileScheduleLayoutRef = () => {};
}

/** @type {(() => void) | null} */
let activePlayMountTeardown = null;

/** 前回の mountSimulator（対戦プレイ等）の購読・タイマーを止める。ソロ開始前にも呼ぶ。 */
export function teardownActivePlayMount() {
  if (activePlayMountTeardown) {
    try {
      activePlayMountTeardown();
    } catch (err) {
      console.warn("[simulator] play mount teardown failed:", err);
    }
    activePlayMountTeardown = null;
  }
  try {
    delete window.__llocgFlushVersusPlayPersist;
    delete window.__llocgVersusPlayMounted;
    delete window.__llocgPeekBoardFromDialog;
    delete window.__llocgDialogSupportsBoardPeek;
  } catch (_) {
    /* noop */
  }
  document.body.classList.remove(
    "play-versus-mode",
    "versus-my-turn",
    "versus-opponent-turn",
    "versus-live-phase",
    "llocg-effect-dialog-peek",
  );
}

/**
 * DOM 状態と履歴だけリセットしたい場合に mount と同じ並びへ戻す
 */
function bootstrapReplayStacks() {
  replayLog = [];
  undoHistory = [];
  redoHistory = [];
  versusMatchUndoStack = [];
  versusMatchRedoStack = [];
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
  if (versusMatchLogSinkEnabled) {
    try {
      appendVersusMatchLogFromReplay(act, meta);
    } catch (_) {
      /* noop */
    }
  }
}

function trimUndo() {
  while (undoHistory.length > HISTORY_MAX_STEPS) undoHistory.shift();
  while (versusMatchUndoStack.length > HISTORY_MAX_STEPS) versusMatchUndoStack.shift();
}
function trimRedo() {
  while (redoHistory.length > HISTORY_MAX_STEPS) redoHistory.shift();
  while (versusMatchRedoStack.length > HISTORY_MAX_STEPS) versusMatchRedoStack.shift();
}

export function mountSimulator(
  root,
  deckMap,
  { onBackToDeck, deckRoleLabels, resumeFromStorage, versusMatch } = {},
) {
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

  const $ = (id) => root.querySelector("#" + id) || document.getElementById(id);

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

  function mirrorDeckLiveSimDesktopToolbarFromSrc(sumElSrc) {
    var dst = $("deck-live-sim-summary-desktop-inline");
    if (!dst || !sumElSrc) return;
    dst.innerHTML = sumElSrc.innerHTML;
    dst.className = sumElSrc.className;
    dst.classList.add("deck-live-sim-summary--desktop-toolbar");
    dst.style.cssText = sumElSrc.style.cssText || "";
  }

  function clearDeckLiveSimDesktopToolbarMirror() {
    var dst = $("deck-live-sim-summary-desktop-inline");
    if (!dst) return;
    dst.textContent = "";
    dst.innerHTML = "";
    dst.removeAttribute("style");
    dst.className = "deck-live-sim-summary deck-live-sim-summary--desktop-toolbar-muted";
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

    var bundleForBreakdown = getRenderPassLiveBundle();
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

    mirrorDeckLiveSimDesktopToolbarFromSrc(sumEl2);
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
    if (isMulliganHandPickActive()) {
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
    var autoLock =
      (isMulliganHandPickActive() && m > 0) ||
      (state.liveTurnPickMode === true && c > 0);
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
      if (isMulliganHandPickActive()) {
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
    if (isFullVersusPlayUi()) return;
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
  teardownActivePlayMount();

  if (!resumeFromStorage) {
    try {
      sessionStorage.removeItem(STORAGE_PLAY_RESUME);
      sessionStorage.removeItem(STORAGE_DECK_PICK_SELECTED);
      sessionStorage.removeItem(STORAGE_OPENING_MULLIGAN_K);
      sessionStorage.removeItem(STORAGE_DECK_ODDS_OPENING_MULL_MODEL);
    } catch (_) {
      /* noop */
    }
    deckPickSelectedNos.clear();
    deckPickListSig = "";
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
    var storedEn = localStorage.getItem(STORAGE_PLAY_ENERGY_CARD_NO);
    if (storedEn == null || String(storedEn).trim() === "") {
      try {
        storedEn = sessionStorage.getItem(STORAGE_PLAY_ENERGY_CARD_NO);
        if (storedEn != null && String(storedEn).trim() !== "") {
          localStorage.setItem(STORAGE_PLAY_ENERGY_CARD_NO, String(storedEn).trim());
        }
      } catch (_) {
        /* noop */
      }
    }
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
    /** 「ライブ開始」直後〜最初のエールめくりまで（ライブ開始時効果の発光） */
    playLiveStartGlowActive: false,
    /** 登場効果等で「このターンこの列にメンバー登場不可」（例: PL!-pb1-018） */
    stageColumnEntryBlocked: { left: false, center: false, right: false },
    /** ライブ進行中に解決へ1枚でもめくった */
    playLiveYellStarted: false,
    /** ライブの計算パネル上の「固有ボーナス点」（打点に手動加算・Undo 可。負も可） */
    liveScoreEffectBonus: 0,
    /** ライブの計算パネル「エール数」表示の手動補正（盤面ブレード合計への加減） */
    liveBladeManualAdjust: 0,
    /** 常時能力から自動加算される合計スコア補正（手動 bonus とは別枠で合算） */
    joujiLiveScoreBonus: 0,
    /** 相手ライブの必要ハート＋N（常時・ソロは相手プロキシ想定） */
    joujiOpponentLiveNeedHeartBump: 0,
    /** ソロ: 相手の成功ライブ枚数（相手常時の条件用・0 始まり） */
    soloOpponentSuccessLiveCount: 0,
    /** ソロ: 相手の手札枚数（条件確認用） */
    soloOpponentHandCount: 0,
    /** このターンに控え室リフレッシュが発生した */
    deckRefreshedThisTurn: false,
    /** エールで山札→解決にめくったスコアの実体 id（成功時のみ打点に＋1／枚） */
    ealeNoteLiveHitIds: [],
    /** エール中に捲ったスコアライブの印刷スコア合計（成功判定表示中のみ加算） */
    ealeNoteLiveScorePoints: 0,
    /** ドローを解決にめくった回数ぶん、ブレード捲り上限到達後に手札へ入るドロー（Undo 対象） */
    pendingDrawYellHandDraws: 0,
    /** このターン、効果によるメンバーのアクティブ化を禁止（pb1-009 等） */
    blockEffectMemberActivateTurn: null,
    liveTurnSelectedIds: [],
    /** 条件・自動処理を無視し手動で進める */
    playManualMode: false,
    playLightweightMode: false,
    playVersusMode: false,
    versusMyRole: null,
    versusOpponentSuccessLiveCount: 0,
    versusMatchEnded: false,
    versusPendingAction: null,
    /** 次のライブセットフェイズで置ける枚数上限を減らす（HS-bp2-018 等） */
    liveSetLimitPenaltyPending: 0,
    /** 現在のライブセットフェイズの上限減（0=通常3枚） */
    liveSetCardCapPenalty: 0,
    /** セット上限減を適用済みのフェイズキー */
    _liveSetCapAppliedKey: "",
  };
  /** @type {{ mode: 'localPractice'|'localDual'|'online', roomCode: string, myRole?: 'host'|'guest', activeRole?: 'host'|'guest', opponentName: string, remoteMatch?: import('./versusMatch.js').VersusMatchDoc|null, playerLabel?: string, hostDeckMap?: Record<string, number>, guestDeckMap?: Record<string, number>, hostDeckRoleLabels?: object, guestDeckRoleLabels?: object, hostDeckLabel?: string, guestDeckLabel?: string }|null} */
  var versusSession = null;
  /** @type {{ host: object|null, guest: object|null }} */
  var versusLocalDualBoards = { host: null, guest: null };
  if (versusMatch && versusMatch.mode === "localPractice") {
    var practiceFirst = Math.random() < 0.5 ? "host" : "guest";
    versusSession = {
      mode: "localPractice",
      roomCode: "local-practice",
      activeRole: practiceFirst,
      myRole: practiceFirst,
      hostDeckMap: normalizeDeckMapCounts(versusMatch.hostDeckMap || deckMap),
      guestDeckMap: normalizeDeckMapCounts(versusMatch.guestDeckMap || {}),
      hostDeckRoleLabels: versusMatch.hostDeckRoleLabels || {},
      guestDeckRoleLabels: versusMatch.guestDeckRoleLabels || {},
      hostDeckLabel: String(versusMatch.hostDeckLabel || "自分"),
      guestDeckLabel: String(versusMatch.guestDeckLabel || "相手"),
      opponentName: String(versusMatch.guestDeckLabel || "相手"),
      playerLabel: String(versusMatch.hostDeckLabel || "自分"),
    };
  } else if (versusMatch && versusMatch.mode === "localDual") {
    var localDualFirst = Math.random() < 0.5 ? "host" : "guest";
    versusSession = {
      mode: "localDual",
      roomCode: "local-dual",
      activeRole: localDualFirst,
      myRole: localDualFirst,
      hostDeckMap: normalizeDeckMapCounts(versusMatch.hostDeckMap || deckMap),
      guestDeckMap: normalizeDeckMapCounts(versusMatch.guestDeckMap || {}),
      hostDeckRoleLabels: versusMatch.hostDeckRoleLabels || {},
      guestDeckRoleLabels: versusMatch.guestDeckRoleLabels || {},
      hostDeckLabel: String(versusMatch.hostDeckLabel || "自分"),
      guestDeckLabel: String(versusMatch.guestDeckLabel || "相手"),
      opponentName: String(versusMatch.guestDeckLabel || "相手"),
      playerLabel: String(versusMatch.hostDeckLabel || "自分"),
      remoteMatch: createLocalDualRemoteMatch(localDualFirst),
    };
  } else if (versusMatch && versusMatch.mode === "online" && versusMatch.roomCode && versusMatch.myRole) {
    versusSession = {
      mode: "online",
      roomCode: String(versusMatch.roomCode),
      myRole: versusMatch.myRole === "guest" ? "guest" : "host",
      opponentName: versusOpponentLabel(versusMatch.match, versusMatch.myRole),
      remoteMatch: versusMatch.match || null,
    };
  }
  var versusMatchUnsub = null;
  var versusPublicSyncTimer = 0;
  var versusBoardSyncTimer = 0;
  var versusBoardSyncLastFp = "";
  var versusOpponentBoardFp = "";
  var versusOpponentBoardRev = 0;
  /** 成功ライブ枚数の Firestore 同期（毎 render で送らない） */
  var versusLastSyncedSlCount = -1;
  /** applyVersusPhaseFromRemote の doLiveTurnStart 二重起動防止 */
  var versusPhaseAutoKey = "";
  /** 盤面復元・初回描画が終わるまでリモートフェイズ自動操作を止める */
  var versusBootstrapping = false;
  /** 開幕マリガン UI キー（同一スナップショットで選択肢を消さない） */
  var versusMulliganUiKey = "";
  /** マリガン確定 API 送信中 */
  var versusMulliganCommitPending = false;
  /** 通常フェイズの自動ターン開始（重複防止） */
  var versusNormalAutoKey = "";
  /** リマッチ検知 */
  var versusLastRematchSeq = -1;
  var versusRematchPrepTimer = 0;
  var versusConcedeOverlayTimer = 0;
  var versusFirstPlayerBannerShownForSeq = -1;
  /** applyVersusPhaseFromRemote の doLiveTurnBegin 二重起動防止 */
  var versusLiveBeginAutoKey = "";
  /** ターン終了オーバーレイ（リモート action 変化） */
  var versusTurnEndFeedPrimed = false;
  var versusLastHostAction = "";
  var versusLastGuestAction = "";
  var versusHandRevealPending = [];
  var versusHandRevealUntil = 0;
  var versusHandRevealClearTimer = 0;
  var versusWaitingRevealPending = [];
  var versusWaitingRevealUntil = 0;
  var versusWaitingRevealClearTimer = 0;
  /** @type {Set<string>} */
  var versusLastSyncedWaitingIds = new Set();
  /** ライブ勝敗判定の適用済み seq */
  var versusJudgmentAppliedSeq = -1;
  var versusJudgmentFinishTimer = 0;
  var versusRoleBannerTimer = 0;
  var versusLastKnownFirstPlayerRole = null;
  if (!versusSession) {
    state.playVersusMode = false;
  }
  if (versusSession) {
    state.playVersusMode = true;
    if (versusSession.myRole) state.versusMyRole = versusSession.myRole;
    if (versusSession.mode === "localDual") {
      state.versusMyRole = versusSession.activeRole || "host";
      document.body.classList.add("versus-local-dual-mode");
    }
    if (versusSession.mode === "localPractice") {
      state.versusMyRole = versusSession.activeRole || "host";
      document.body.classList.add("versus-local-practice-mode");
    }
    document.body.classList.add("play-versus-mode");
    var versusChromeEl = document.getElementById("versus-play-chrome");
    if (versusChromeEl) {
      versusChromeEl.hidden =
        versusSession.mode !== "online" &&
        versusSession.mode !== "localDual" &&
        versusSession.mode !== "localPractice";
    }
    var concedeBtn = document.getElementById("btn-versus-concede");
    var lobbyBtn = document.getElementById("btn-versus-lobby");
    var endTurnBtn = document.getElementById("btn-versus-end-turn");
    var localDualEndSwitchBtn = document.getElementById("btn-versus-local-dual-end-switch");
    var dualBoardSwitchBtn = document.getElementById("btn-versus-dual-board-switch");
    var oppSlWrap = document.getElementById("versus-opp-sl-controls");
    if (concedeBtn) concedeBtn.hidden = versusSession.mode !== "online";
    if (lobbyBtn) lobbyBtn.hidden = versusSession.mode !== "online";
    if (endTurnBtn) endTurnBtn.hidden = versusSession.mode !== "online";
    if (localDualEndSwitchBtn) localDualEndSwitchBtn.hidden = versusSession.mode !== "localDual";
    if (dualBoardSwitchBtn) dualBoardSwitchBtn.hidden = versusSession.mode !== "localPractice";
    if (oppSlWrap) oppSlWrap.hidden = true;
    if (concedeBtn) concedeBtn.classList.add("btn--versus-concede-main");
    var oppBoardWrap = document.getElementById("versus-opponent-board-wrap");
    if (oppBoardWrap) {
      oppBoardWrap.hidden =
        versusSession.mode !== "online" &&
        versusSession.mode !== "localDual" &&
        versusSession.mode !== "localPractice";
    }
    if (versusSession.mode === "online" && versusMatch && versusMatch.match) {
      versusBootstrapping = true;
      versusLastRematchSeq = Math.max(0, Math.floor(Number(versusMatch.match.rematchSeq) || 0));
      versusLastSyncedSlCount = successLiveAreaLiveCardCount();
    }
    if (isFullVersusPlayUi()) {
      applyVersusPlayModeDefaults();
    }
    syncVersusOppSlDisplay();
    playChromeMountsLastMobile = null;
    syncPlayBoardChromeMounts();
  }
  var resumedFromStorage = false;
  if (resumeFromStorage === true) {
    try {
      var rawPlayResume = sessionStorage.getItem(STORAGE_PLAY_RESUME);
      if (rawPlayResume) {
        var playResumeObj = JSON.parse(rawPlayResume);
        if (playResumeObj && playResumeObj.v === 1 && playResumeObj.board && typeof playResumeObj.board === "object") {
          var resumeVersusOk = true;
          if (
            versusSession &&
            versusSession.mode === "online" &&
            playResumeObj.versusOnline &&
            playResumeObj.versusOnline.roomCode
          ) {
            resumeVersusOk =
              String(playResumeObj.versusOnline.roomCode).toUpperCase() ===
              String(versusSession.roomCode || "").toUpperCase();
          }
          if (!resumeVersusOk) {
            resumedFromStorage = false;
          } else {
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
      }
    } catch (resumeErr) {
      console.warn(resumeErr);
    }
  }
  var needFreshDeck = !resumedFromStorage;
  if (
    !needFreshDeck &&
    (!Array.isArray(state.deck) || state.deck.length === 0) &&
    Object.keys(activePlayDeckMap).length > 0
  ) {
    needFreshDeck = true;
  }
  if (needFreshDeck) {
    state.deck = buildMainDeckInstances(activePlayDeckMap);
    if (versusSession && (versusSession.mode === "online" || versusSession.mode === "localDual")) {
      state.deckPileFacesDown = true;
    }
    if (versusSession && versusSession.mode === "localPractice") {
      state.deckPileFacesDown = false;
    }
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
  /** ドロー由来のフラッシュ／カード発光を少し長めに（約2〜3秒） */
  const FLASH_DRAW_YELL_DURATION_MS = 2600;
  const FLASH_LABEL_PLUS_DRAW = "+1ドロー";
  /** ライブ進行中「山札→解決」や旧「エール+1」を解決へ置いた場合のフラッシュ文言 */
  const FLASH_LABEL_PLUS_DRAW_RESOLUTION = "+１ドロー";
  /** ドロー（BH）で解決にめくった／遅延ドローで手札に入ったカードのフラッシュ（ピンク） */
  const FLASH_LABEL_DRAW_YELL_PLUS_ONE = "ドロー+1";
  const FLASH_LABEL_SCORE_PLUS_ONE = "スコア＋１";
  const FLASH_LABEL_MISS = "ハズレ";
  const FLASH_LABEL_LIVE_YELL_RESOLUTION_OLD = "エール+1";
  function markCardFlashDraw(c, label) {
    if (!c || typeof c !== "object") return;
    if (isLightweightPlayMode()) return;
    var nextLabel = typeof label === "string" && label ? label : null;
    var nowMs = Date.now();
    var yellKind = c._flashYellKind || null;
    var isYellSpecialDrawHeart =
      yellKind === "draw_yell" && catalogLiveCardIsDrawYellBladeHeart(mergedCatalogCard(c));
    var isDrawYellFlash =
      isYellSpecialDrawHeart ||
      c._flashDrawLabel === FLASH_LABEL_DRAW_YELL_PLUS_ONE ||
      c._flashDrawLabel === FLASH_LABEL_PLUS_DRAW ||
      nextLabel === FLASH_LABEL_DRAW_YELL_PLUS_ONE ||
      nextLabel === FLASH_LABEL_PLUS_DRAW;
    var isScoreYellFlash = yellKind === "score" || nextLabel === FLASH_LABEL_SCORE_PLUS_ONE;
    var isNonBhMemberFlash = yellKind === "nonbh_member";
    var flashDur =
      isDrawYellFlash || isScoreYellFlash || isNonBhMemberFlash
        ? FLASH_DRAW_YELL_DURATION_MS
        : FLASH_DRAW_DURATION_MS;
    var flashUntil = (Number(c._flashDrawAt) || 0) + flashDur;
    if (flashUntil > nowMs && c._flashDrawLabel === nextLabel) return;
    c._flashDrawAt = nowMs;
    c._flashDrawLabel = nextLabel;
  }

  function loadPlayLightweightModeFromStorage() {
    try {
      var raw = sessionStorage.getItem(STORAGE_LIGHTWEIGHT_PLAY);
      if (raw === null) return false;
      return raw === "1";
    } catch (_) {
      return false;
    }
  }

  function persistPlayLightweightMode(on) {
    try {
      sessionStorage.setItem(STORAGE_LIGHTWEIGHT_PLAY, on ? "1" : "0");
    } catch (_) {}
  }

  function isLightweightPlayMode() {
    return state.playLightweightMode === true;
  }

  function syncPlayLightweightModeChrome() {
    var btn = document.getElementById("btn-play-lightweight");
    var on = isLightweightPlayMode();
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn-play-lightweight-on", on);
    }
    if (document.body) {
      document.body.classList.toggle("llocg-lightweight", on);
    }
  }

  function togglePlayLightweightMode() {
    state.playLightweightMode = !state.playLightweightMode;
    persistPlayLightweightMode(state.playLightweightMode);
    syncPlayLightweightModeChrome();
    if (state.playLightweightMode && state.deckPileOpen && !state.deckPileFacesDown) {
      state.deckPileFacesDown = true;
      syncDeckToolbarButtons();
    }
    showToast(
      state.playLightweightMode
        ? "軽量モード ON（低画質・演出簡略・確率計算抑制）"
        : "軽量モード OFF",
    );
    render();
  }

  state.playLightweightMode = loadPlayLightweightModeFromStorage();
  syncPlayLightweightModeChrome();

  /** 同一 render パス内の live 判定バンドル再利用 */
  var renderPassLiveBundle = null;
  var renderPassLiveBundleFp = "";

  function liveBoardEvalFingerprint() {
    var parts = [
      String(state.turnCount),
      state.liveStatsAfterBegin ? "1" : "0",
      state.liveTurnPickMode ? "1" : "0",
      String(state.deck.length),
      String(state.hand.length),
      String(state.resolutionArea.length),
      String(state.waitingRoom.length),
      String(Math.floor(sumBoardMemberBlades())),
    ];
    ["left", "center", "right"].forEach(function (k) {
      (state.stage[k] || []).forEach(function (c) {
        if (c && c.id != null) parts.push("s" + c.id);
      });
      (state.liveArea[k] || []).forEach(function (c) {
        if (c && c.id != null) parts.push("l" + c.id);
      });
    });
    (state.resolutionArea || []).forEach(function (c) {
      if (c && c.id != null) parts.push("r" + c.id);
    });
    return parts.join("|");
  }

  function beginRenderPassLiveBundle() {
    var fp = liveBoardEvalFingerprint();
    if (renderPassLiveBundle && renderPassLiveBundleFp === fp) return;
    renderPassLiveBundleFp = fp;
    try {
      renderPassLiveBundle = evaluateLiveMechanicalFulfillmentBundle();
    } catch (_) {
      renderPassLiveBundle = null;
    }
  }

  function getRenderPassLiveBundle() {
    if (renderPassLiveBundle) return renderPassLiveBundle;
    try {
      return evaluateLiveMechanicalFulfillmentBundle();
    } catch (_) {
      return null;
    }
  }

  function clearRenderPassLiveBundle() {
    renderPassLiveBundle = null;
    renderPassLiveBundleFp = "";
  }

  function playZoneFaceImgUrl(faceUrl, opts) {
    if (!faceUrl || typeof faceUrl !== "string") return faceUrl;
    opts = opts || {};
    if (opts.hideFaceBehindBack || opts.deckFaceHidden) return faceUrl;
    /* ライブカードは常に公式画像（サムネの cover 切り抜き・縮小を避ける） */
    if (opts.cardType === T_LIVE) return faceUrl;
    if (!isLightweightPlayMode()) return faceUrl;
    if (opts.thumbPile) {
      return catalogListThumbnailUrl(faceUrl, { playPile: true, playLightweight: true });
    }
    return catalogListThumbnailUrl(faceUrl, { play: true, playLightweight: true });
  }

  function monteCarloLiveSuccessSamples() {
    return isLightweightPlayMode() ? 800 : 3200;
  }

  normalizeAllCardFields();

  /** プレイ画面のみ：縦長スマホ向け DOM 組み替え（デスクトップでは左列レイアウトへ復帰） */
  function isPlayChromeMobilePortraitLayout() {
    return matchesPlayPortraitLayout();
  }

  function syncPlayBoardChromeMounts() {
    var vg = document.getElementById("view-game");
    if (!vg || vg.hidden || vg.hasAttribute("hidden")) {
      document.body.classList.remove("chrome-layout-play-mobile-portrait", "chrome-layout-play-desktop");
      playChromeMountsLastMobile = null;
      return;
    }

    var mobile = isPlayChromeMobilePortraitLayout();
    if (playChromeMountsLastMobile === mobile) return;
    playChromeMountsLastMobile = mobile;

    var desktopSimRow = document.getElementById("mount-desktop-sim-success-row");
    var desktopRes = document.getElementById("mount-desktop-resolution");
    var strip = document.getElementById("play-top-fixed-strip");
    var stripBody = document.getElementById("play-top-fixed-strip-body");
    var resWrap = document.getElementById("play-strip-resolution-wrap");
    var sucWrap = document.getElementById("play-strip-success-live-wrap");
    var deckSec = document.getElementById("section-play-deck-live-sim");
    var probMount = document.getElementById("mount-mobile-live-prob-inline");
    if (!desktopSimRow || !desktopRes || !strip || !stripBody || !resWrap || !sucWrap || !deckSec) return;

    document.body.classList.toggle("chrome-layout-play-mobile-portrait", mobile);
    document.body.classList.toggle("chrome-layout-play-desktop", !mobile);

    function mountChildIfNeeded(child, parent) {
      if (!child || !parent || child.parentNode === parent) return;
      parent.appendChild(child);
    }
    if (mobile) {
      if (probMount) mountChildIfNeeded(deckSec, probMount);
      mountChildIfNeeded(resWrap, stripBody);
      mountChildIfNeeded(sucWrap, stripBody);
    } else {
      mountChildIfNeeded(deckSec, desktopSimRow);
      mountChildIfNeeded(sucWrap, desktopSimRow);
      mountChildIfNeeded(resWrap, desktopRes);
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
    if (!cat || typeof cat !== "object") return c;
    const merged = Object.assign({}, cat, c);
    if (merged.unit) merged.unit = canonicalizeDisplayPunctuation(merged.unit);
    if (merged.series) merged.series = canonicalizeDisplayPunctuation(merged.series);
    /* ライブカード効果で「自身の need_heart を減らす」運用に対応する補正。
       インスタンス側の _needHeartDelta = { heart01: -1, ... } を catalog の need_heart に適用する。
       減算後 0 以下のスロットは取り除く。負の need_heart は許可しない。 */
    if (c && c._needHeartDelta && typeof c._needHeartDelta === "object" && !Array.isArray(c._needHeartDelta)) {
      const base = cat.need_heart && typeof cat.need_heart === "object" && !Array.isArray(cat.need_heart) ? cat.need_heart : {};
      /** @type {Record<string, number>} */
      const eff = {};
      for (const k of Object.keys(base)) {
        const v = Number(base[k]);
        if (Number.isFinite(v) && v > 0) eff[k] = v;
      }
      for (const k of Object.keys(c._needHeartDelta)) {
        const delta = Number(c._needHeartDelta[k]) || 0;
        const before = Number(eff[k]) || 0;
        const after = Math.max(0, before + delta);
        if (after > 0) eff[k] = after;
        else delete eff[k];
      }
      merged.need_heart = eff;
    }
    return merged;
  }

  /** エール進行中に山札→解決へドロー BH を置いたときのフラッシュ／待機ドロー計上。（ドロップ／旧フラグ）。 */
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
    markPlayLiveYellStarted();
    var drawYell = catalogLiveCardIsDrawYellBladeHeart(mergedCatalogCard(moved));
    if (drawYell) {
      markCardFlashDraw(moved, FLASH_LABEL_DRAW_YELL_PLUS_ONE);
      moved._flashYellKind = "draw_yell";
      state.pendingDrawYellHandDraws = Math.max(0, Math.floor(Number(state.pendingDrawYellHandDraws) || 0)) + 1;
    } else {
      flashResolutionYellCard(moved);
      if (!moved._flashYellKind && moved._flashDrawLabel === FLASH_LABEL_LIVE_YELL_RESOLUTION_OLD) {
        markCardFlashDraw(moved, FLASH_LABEL_PLUS_DRAW_RESOLUTION);
      }
    }
  }

  /** ブレードで捲れる枚数が尽きたタイミング（解決枚数が bladeK に到達）で、ドロー待ちドローを手札へ */
  function pickDeckBeamOriginEl() {
    var host = $("deck-pile-host");
    if (host && host.getBoundingClientRect().width > 8) return host;
    var deckEl = $("zone-deck");
    if (deckEl && deckEl.getBoundingClientRect().width > 8) return deckEl;
    return host || deckEl;
  }

  function flashDrawBeamsBetweenElements(fromEl, toEl, n) {
    if (isLightweightPlayMode()) return;
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (n <= 0 || !fromEl || !toEl) return;
    var r0 = fromEl.getBoundingClientRect();
    var r1 = toEl.getBoundingClientRect();
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

  function flashDrawYellBeamsFromResolutionToHand(n) {
    flashDrawBeamsBetweenElements($("zone-resolution"), $("zone-hand"), n);
  }

  function flashDrawBeamsFromDeckToHand(n) {
    flashDrawBeamsBetweenElements(pickDeckBeamOriginEl(), $("zone-hand"), n);
  }

  function pickCardDomElForInst(inst) {
    if (!inst || inst.id == null) return null;
    var id = String(inst.id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    var sel = '.card-item[data-id="' + id + '"]';
    var board = document.getElementById("game-board") || document.getElementById("view-game");
    if (board) {
      var hitBoard = board.querySelector(sel);
      if (hitBoard && hitBoard.getBoundingClientRect().width > 4) return hitBoard;
    }
    var zoneIds = [
      "zone-hand",
      "zone-stage-left",
      "zone-stage-center",
      "zone-stage-right",
      "zone-live-left",
      "zone-live-center",
      "zone-live-right",
      "zone-resolution",
      "zone-waiting",
      "zone-success-live",
      "zone-energy",
      "zone-preview",
      "zone-deck",
    ];
    for (var zi = 0; zi < zoneIds.length; zi++) {
      var z = $(zoneIds[zi]);
      if (!z) continue;
      var el = z.querySelector(sel);
      if (el && el.getBoundingClientRect().width > 4) return el;
    }
    return null;
  }

  /** 効果テキストによる山札→手札ドロー（エール処理のビーム＋「+1ドロー」表示） */
  function instsToVersusHandRevealCards(cards) {
    var out = [];
    for (var hi = 0; hi < (cards || []).length; hi++) {
      var inst = cards[hi];
      if (!inst || !inst.card_no) continue;
      var catH = getCard(inst.card_no);
      out.push({
        id: String(inst.id || inst.card_no + "@" + hi),
        card_no: String(inst.card_no),
        name: String((catH && catH.name) || inst.name || inst.card_no),
        type: String((catH && catH.type) || inst.type || ""),
      });
    }
    return out;
  }

  function collectVersusWaitingIdSet() {
    var s = new Set();
    (state.waitingRoom || []).forEach(function (c) {
      if (c && c.id != null) s.add(String(c.id));
    });
    return s;
  }

  function noteVersusWaitingAddsForReveal() {
    if (!versusOnlineActive()) return;
    var current = collectVersusWaitingIdSet();
    if (!versusLastSyncedWaitingIds.size && current.size) {
      versusLastSyncedWaitingIds = current;
      return;
    }
    var added = [];
    current.forEach(function (id) {
      if (!versusLastSyncedWaitingIds.has(id)) {
        var inst = findCardInstById(id);
        if (inst) added.push(inst);
      }
    });
    versusLastSyncedWaitingIds = current;
    if (!added.length) return;
    armVersusWaitingRevealPublic(added);
    versusBoardSyncLastFp = "";
  }

  function armVersusWaitingRevealPublic(addedCards) {
    if (!versusOnlineActive()) return;
    var pub = instsToVersusHandRevealCards(addedCards);
    if (!pub.length) return;
    versusWaitingRevealPending = pub;
    versusWaitingRevealUntil = Date.now() + 6000;
    if (versusWaitingRevealClearTimer) clearTimeout(versusWaitingRevealClearTimer);
    versusWaitingRevealClearTimer = window.setTimeout(function () {
      versusWaitingRevealClearTimer = 0;
      versusWaitingRevealPending = [];
      versusWaitingRevealUntil = 0;
      versusBoardSyncLastFp = "";
      flushVersusBoardPublicSync();
    }, 6100);
  }

  function queueVersusHandRevealPublic(drawnCards) {
    if (!versusOnlineActive()) return;
    var pub = instsToVersusHandRevealCards(drawnCards);
    if (!pub.length) return;
    versusHandRevealPending = pub;
    versusHandRevealUntil = Date.now() + 6000;
    versusBoardSyncLastFp = "";
    flushVersusBoardPublicSync();
    showToast("手札に追加（相手に公開）", { duration: 4500 });
    if (versusHandRevealClearTimer) clearTimeout(versusHandRevealClearTimer);
    versusHandRevealClearTimer = window.setTimeout(function () {
      versusHandRevealClearTimer = 0;
      versusHandRevealPending = [];
      versusHandRevealUntil = 0;
      versusBoardSyncLastFp = "";
      flushVersusBoardPublicSync();
    }, 6100);
  }

  /** @param {*} snapBefore @param {HTMLElement|null} [fromEl] */
  function maybeRevealHandAddsFromWaitingOrResolution(snapBefore, fromEl) {
    if (!versusOnlineActive() || !snapBefore) return;
    var prevHand = new Set();
    (snapBefore.hand || []).forEach(function (c) {
      if (c && c.id != null) prevHand.add(String(c.id));
    });
    var added = [];
    state.hand.forEach(function (c) {
      if (!c || c.id == null) return;
      var sid = String(c.id);
      if (prevHand.has(sid)) return;
      var fromWait = (snapBefore.waitingRoom || []).some(function (w) {
        return w && String(w.id) === sid;
      });
      var fromRes = (snapBefore.resolutionArea || []).some(function (r) {
        return r && String(r.id) === sid;
      });
      if (fromWait || fromRes) added.push(c);
    });
    if (!added.length) return;
    added.forEach(function (c) {
      markCardFlashDraw(c, FLASH_LABEL_PLUS_DRAW);
    });
    var handEl = $("zone-hand");
    var beamFrom = null;
    if (fromEl && fromEl.closest) {
      if (fromEl.closest("#zone-resolution")) beamFrom = $("zone-resolution");
      else if (fromEl.closest("#zone-waiting, #zone-waiting-drop-catcher")) {
        beamFrom = $("zone-waiting") || $("zone-waiting-drop-catcher");
      }
    }
    if (!beamFrom) {
      var anyFromRes = added.some(function (c) {
        return (snapBefore.resolutionArea || []).some(function (r) {
          return r && String(r.id) === String(c.id);
        });
      });
      beamFrom = anyFromRes ? $("zone-resolution") : $("zone-waiting") || $("zone-waiting-drop-catcher");
    }
    if (beamFrom && handEl) {
      flashDrawBeamsBetweenElements(beamFrom, handEl, added.length);
    }
    queueVersusHandRevealPublic(added);
  }

  function presentAbilityDrawsToHand(drawnCards, sourceInst) {
    if (!drawnCards || !drawnCards.length) return;
    drawnCards.forEach(function (c) {
      if (!c || typeof c !== "object") return;
      markCardFlashDraw(c, FLASH_LABEL_PLUS_DRAW);
    });
    var handEl = $("zone-hand");
    var beamN = drawnCards.length;
    function fireDrawBeams() {
      var fromEl = sourceInst ? pickCardDomElForInst(sourceInst) : null;
      if (!fromEl) fromEl = pickDeckBeamOriginEl();
      flashDrawBeamsBetweenElements(fromEl, handEl, beamN);
    }
    if (sourceInst) {
      window.setTimeout(fireDrawBeams, 0);
    } else {
      fireDrawBeams();
    }
    if (versusOnlineActive()) queueVersusHandRevealPublic(drawnCards);
  }

  function flashTurnStartDrawToHand() {
    var handEl = $("zone-hand");
    flashDrawBeamsBetweenElements(pickDeckBeamOriginEl(), handEl, 1);
  }

  function showTurnPhaseStartSplash(turnN) {
    if (isLightweightPlayMode()) return;
    var n = Math.max(1, Math.floor(Number(turnN) || 1));
    var overlay = document.createElement("div");
    overlay.className = "turn-phase-splash-overlay";
    overlay.setAttribute("aria-hidden", "true");
    var title = document.createElement("div");
    title.className = "turn-phase-splash-title";
    title.textContent = "ターン " + n;
    overlay.appendChild(title);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add("is-visible");
    });
    window.setTimeout(function () {
      overlay.classList.add("is-out");
      window.setTimeout(function () {
        try {
          overlay.remove();
        } catch (_) {}
      }, 520);
    }, 1280);
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
      /* 「デッキ上に戻す」「戻してシャッフル」操作で、ドロー由来の手札カードも併せて戻せるようにする目印 */
      if (card && typeof card === "object") card._fromDrawYellHand = true;
      state.hand.push(card);
      drew++;
    }
    state.pendingDrawYellHandDraws = Math.max(0, n - drew);
    if (drew > 0) {
      showToast(
        "ドロー — 手札に " +
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
      playBonusHeartSlotMapGet(inst.playBonusHeartSlots, si) +
      joujiHeartSlotRead(inst.joujiHeartSlots, si)
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
    var joujiB = Number(inst.joujiBladeBonus);
    if (!Number.isFinite(joujiB)) joujiB = 0;
    return Math.max(0, base + extra + mia + lzBlade + Math.floor(joujiB));
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

  /** 登場効果の再誘発のため、ステージを去るときに登場関連フラグを掃除する */
  function clearToujouEffectStateOnLeaveStage(inst) {
    if (!inst) return;
    delete inst._toujouEffectActive;
    delete inst._toujouEffectDeclined;
    delete inst._toujouMandatoryAuto;
    delete inst._toujouBatonFromLowerCostMemberId;
    clearLiveSessionGrantedState(inst);
    if (inst._playEffectResolved && typeof inst._playEffectResolved === "object") {
      delete inst._playEffectResolved.toujyou;
    }
  }

  /** 未解決の登場効果待機を失効させる（他カードの使用・ターン終了時） */
  function expirePendingToujouEffects(exceptIds) {
    var except = new Set();
    if (exceptIds != null) {
      (Array.isArray(exceptIds) ? exceptIds : [exceptIds]).forEach(function (id) {
        if (id != null && String(id)) except.add(String(id));
      });
    }
    allZonesFlat().forEach(function (c) {
      if (!c || c.type !== T_MEMBER) return;
      if (except.has(String(c.id))) return;
      if (c._toujouEffectActive !== true) return;
      delete c._toujouEffectActive;
      delete c._toujouMandatoryAuto;
    });
  }

  function clearTurnScopedPlayBonusesEverywhere() {
    allZonesFlat().forEach(function (c) {
      if (!c || c.type !== T_MEMBER) return;
      ensureCardBoardFields(c);
      c.playBonusHeartSlotsTurn = {};
      c.playBonusBladeTurn = 0;
    });
  }

  /** ライブ終了時までのブレード／ハート常時補正を解除 */
  function clearLiveSessionPlayBonusesEverywhere() {
    state.playSessionBladeBonus = 0;
    allZonesFlat().forEach(function (c) {
      if (!c || c.type !== T_MEMBER) return;
      ensureCardBoardFields(c);
      c.playBonusBladeAlways = 0;
      clearLiveSessionGrantedState(c);
    });
  }

  function dragSourceIsLiveFrameZone(fromEl) {
    if (!fromEl || !fromEl.id) return false;
    var id = fromEl.id;
    return id === "live-left" || id === "live-center" || id === "live-right";
  }

  /** 成否表示が確定しているライブを控え／成功ライブカード置き場へ動かしたとき、解決領域をすべて控え室へ */
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
    /* 別経路で解決を片付けたら、ドロー由来の手札マーカーも掃除（残ると次回 戻す で誤回収される） */
    state.pendingDrawYellHandDraws = 0;
    clearAllDrawYellHandMarkers();
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
        clearToujouEffectStateOnLeaveStage(c);
        clearMemberJoujiComputed(c);
      }
    });
    try {
      syncJoujiPassiveEffectsAll();
    } catch (jErr) {
      console.warn(jErr);
    }
  }

  function clearMemberJoujiComputed(inst) {
    if (!inst) return;
    inst.joujiBladeBonus = 0;
    inst.joujiHeartSlots = {};
    inst._joujiHandCostReduction = 0;
    inst._joujiStageCostDelta = 0;
    delete inst._joujiCannotLiveAlone;
    delete inst._joujiCannotSelfActivate;
    delete inst._joujiCannotBatonToWaiting;
    delete inst._joujiBatonSeriesOnlyTag;
    delete inst._baseHeartsWildcardUntilLiveEnd;
    delete inst._skipAutoActivateUntilTurn;
  }

  function memberTotalPrintedHearts(inst) {
    if (!inst) return 0;
    var mc = mergedCatalogCard(inst);
    var bh = mc.base_heart;
    if (!bh || typeof bh !== "object") return 0;
    var sum = 0;
    Object.keys(bh).forEach(function (k) {
      sum += Math.max(0, Math.floor(Number(bh[k]) || 0));
    });
    return sum;
  }

  function memberPrintedBladeCount(inst) {
    if (!inst) return 0;
    return sanitizeNonNegativeInt(mergedCatalogCard(inst).blade);
  }

  function successLiveAreaCardIsLive(c) {
    if (!c) return false;
    return c.type === T_LIVE || mergedCatalogCard(c).type === T_LIVE;
  }

  /** 成功ライブカード置き場にあるライブカードの枚数 */
  function successLiveAreaLiveCardCount(area) {
    var arr = area != null ? area : state.successfulLiveArea;
    if (!Array.isArray(arr)) return 0;
    var n = 0;
    arr.forEach(function (c) {
      if (successLiveAreaCardIsLive(c)) n++;
    });
    return n;
  }

  function successLiveAreaScoreSum() {
    var sum = 0;
    (state.successfulLiveArea || []).forEach(function (c) {
      if (!successLiveAreaCardIsLive(c)) return;
      var sc = Number(mergedCatalogCard(c).score);
      if (Number.isFinite(sc) && sc > 0) sum += Math.floor(sc);
    });
    return sum;
  }

  function eachStageColumnMemberInsts() {
    /** @type {*[]} */
    var out = [];
    ["left", "center", "right"].forEach(function (col) {
      (state.stage[col] || []).forEach(function (c) {
        if (c && c.type === T_MEMBER) out.push(c);
      });
    });
    return out;
  }

  function stageHasAllAreasDistinctSeriesMembers(seriesTag) {
    var cols = ["left", "center", "right"];
    for (var ci = 0; ci < cols.length; ci++) {
      var col = cols[ci];
      var found = false;
      var names = {};
      (state.stage[col] || []).forEach(function (m) {
        if (!m || m.type !== T_MEMBER) return;
        var mc = mergedCatalogCard(m);
        if (!catalogCardMatchesGroupTag(mc, seriesTag)) return;
        var nm = String(mc.name || "");
        if (!nm || names[nm]) return;
        names[nm] = true;
        found = true;
      });
      if (!found) return false;
    }
    return true;
  }

  function stageHasCharacterNameSubstr(nameSub) {
    var hit = false;
    eachStageColumnMemberInsts().forEach(function (m) {
      var nm = String(mergedCatalogCard(m).name || "");
      if (nm.indexOf(nameSub) >= 0) hit = true;
    });
    return hit;
  }

  function createJoujiBoardContext() {
    return {
      memberStageColumn: function (inst) {
        return stageColumnKeyHostingMember(inst && inst.id);
      },
      memberOnStageOrLive: memberIsOnStageOrLiveSlot,
      memberOnStageOnly: function (inst) {
        return !!(inst && inst.id != null && stageColumnKeyHostingMember(inst.id) != null);
      },
      memberIsWait: function (inst) {
        return !!(inst && inst.lcWait === true);
      },
      memberMovedThisTurn: function (inst) {
        return !!(
          inst &&
          typeof inst.stageTurnEntered === "number" &&
          Number.isFinite(inst.stageTurnEntered) &&
          inst.stageTurnEntered === state.turnCount &&
          inst._movedStageAreaThisTurn === true
        );
      },
      memberPrintedCost: function (inst) {
        if (!inst) return 0;
        var mc = mergedCatalogCard(inst);
        var costNum = Number(mc.cost);
        if (Number.isFinite(costNum) && costNum >= 1) return Math.min(Math.floor(costNum), 99);
        return 0;
      },
      memberTotalHearts: memberTotalPrintedHearts,
      mergedCatalog: mergedCatalogCard,
      ownEnergyCount: function () {
        return (state.energyArea || []).length;
      },
      opponentEnergyCount: function () {
        if (isDualOpponentBoardMode()) {
          var oppSnapE = getInactiveOpponentSnapshot();
          return oppSnapE ? energyCountFromSnapshot(oppSnapE) : 0;
        }
        return Math.max(0, Math.floor(Number(state.soloOpponentEnergyCount) || 0));
      },
      ownSuccessLiveCount: function () {
        return successLiveAreaLiveCardCount();
      },
      opponentSuccessLiveCount: function () {
        if (versusDualBoardActive()) {
          return getVersusLocalDualSuccessLiveCount(versusLocalDualInactiveRole());
        }
        if (state.playVersusMode) {
          return Math.max(0, Math.floor(Number(state.versusOpponentSuccessLiveCount) || 0));
        }
        return Math.max(0, Math.floor(Number(state.soloOpponentSuccessLiveCount) || 0));
      },
      ownSuccessLiveScoreSum: successLiveAreaScoreSum,
      opponentSuccessLiveScoreSum: function () {
        if (isDualOpponentBoardMode()) {
          var scoreSum = readInactiveOpponentBoard(successLiveAreaScoreSum);
          return Math.max(0, Math.floor(Number(scoreSum) || 0));
        }
        return Math.max(0, Math.floor(Number(state.soloOpponentSuccessLiveScoreSum) || 0));
      },
      opponentStageWaitCount: function () {
        if (isDualOpponentBoardMode()) {
          var oppSnapW = getInactiveOpponentSnapshot();
          return oppSnapW ? countStageWaitMembersFromSnapshot(oppSnapW) : 0;
        }
        var n = 0;
        eachStageColumnMemberInsts().forEach(function (m) {
          if (m.lcWait === true && m._soloOpponentProxy === true) n++;
        });
        return n;
      },
      opponentStageMemberCount: function () {
        if (isDualOpponentBoardMode()) {
          var oppSnapM = getInactiveOpponentSnapshot();
          return oppSnapM ? countStageMembersFromSnapshot(oppSnapM) : 0;
        }
        var n2 = 0;
        eachStageColumnMemberInsts().forEach(function (m) {
          if (m._soloOpponentProxy === true) n2++;
        });
        return n2;
      },
      totalMembersBothStages: function () {
        if (isDualOpponentBoardMode()) {
          var oppSnapT = getInactiveOpponentSnapshot();
          var oppStageN = oppSnapT ? countStageMembersFromSnapshot(oppSnapT) : 0;
          return eachStageColumnMemberInsts().length + oppStageN;
        }
        return eachStageColumnMemberInsts().length + Math.max(0, Number(state.soloOpponentSuccessLiveCount) || 0);
      },
      opponentExtraHeartSurplus: function () {
        return Math.max(0, Math.floor(Number(state.soloOpponentExtraHeartSurplus) || 0));
      },
      eachStageColumnMembers: eachStageColumnMemberInsts,
      stageHasAllAreasDistinctSeriesMembers: stageHasAllAreasDistinctSeriesMembers,
      liveFramesHave3PlusWithSeries: bp1012LanzhuSynergyBoardConditionMet,
      energyCountBelowMember: countMiaTaylorEnergyBladeBelow,
      stageHasCharacterName: stageHasCharacterNameSubstr,
      stageHasAnyCharacterName: function (names) {
        for (var i = 0; i < names.length; i++) {
          if (stageHasCharacterNameSubstr(names[i])) return true;
        }
        return false;
      },
      memberMatchesSeries: function (inst, tag) {
        return catalogCardMatchesGroupTag(mergedCatalogCard(inst), tag);
      },
      memberHasNoPrintedAbility: function (inst) {
        return catalogMemberHasNoAbility(mergedCatalogCard(inst));
      },
      memberIsOpponentProxy: function (inst) {
        return !!(inst && inst._soloOpponentProxy === true);
      },
      instInOwnHand: memberInstanceIsInHand,
      ownHandCount: function () {
        return (state.hand || []).length;
      },
      ownHandCountExcluding: function (inst) {
        var selfId = inst && inst.id != null ? String(inst.id) : null;
        var n = 0;
        for (var i = 0; i < (state.hand || []).length; i++) {
          var h = state.hand[i];
          if (!h) continue;
          if (selfId != null && String(h.id) === selfId) continue;
          n++;
        }
        return n;
      },
    };
  }

  function getMemberCardDirectlyBelow(memberInst) {
    if (!memberInst || memberInst.id == null) return null;
    var col = stageColumnKeyHostingMember(memberInst.id);
    if (!col) return null;
    var arr = state.stage[col] || [];
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && String(arr[i].id) === String(memberInst.id)) {
        idx = i;
        break;
      }
    }
    if (idx <= 0) return null;
    for (var j = idx - 1; j >= 0; j--) {
      if (arr[j] && arr[j].type === T_MEMBER) return arr[j];
    }
    return null;
  }

  function getStackMembersBelowHost(hostInst) {
    if (!hostInst || hostInst.id == null) return [];
    var col = stageColumnKeyHostingMember(hostInst.id);
    if (!col) return [];
    var arr = state.stage[col] || [];
    var hostIdx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && String(arr[i].id) === String(hostInst.id)) {
        hostIdx = i;
        break;
      }
    }
    if (hostIdx <= 0) return [];
    /** @type {any[]} */
    var out = [];
    for (var j = 0; j < hostIdx; j++) {
      if (arr[j] && arr[j].type === T_MEMBER) out.push(arr[j]);
    }
    return out;
  }

  function countDistinctCardNamesInWaiting(filters) {
    var names = new Set();
    (state.waitingRoom || []).forEach(function (c) {
      if (!c || !catalogCardMatchesPickFilters(mergedCatalogCard(c), filters || {})) return;
      names.add(String(mergedCatalogCard(c).name || c.name || c.id));
    });
    return names.size;
  }

  function liveFrameMemberInsts() {
    /** @type {any[]} */
    var out = [];
    ["left", "center", "right"].forEach(function (k) {
      (state.liveArea[k] || []).forEach(function (c) {
        if (c && (c.type === T_LIVE || c.type === T_MEMBER)) out.push(c);
      });
    });
    return out;
  }

  function memberMatchesMirrorUnderFilters(underInst, hostMc) {
    if (!underInst) return false;
    var underMc = mergedCatalogCard(underInst);
    if (!cardHasTrigger(underMc, "live_success")) return false;
    var raws = listNativeJoujiSegmentRaws(hostMc);
    for (var ri = 0; ri < raws.length; ri++) {
      var rule = classifyJoujiSegment(raws[ri]);
      if (!rule || rule.kind !== "mirror_under_card_live_success") continue;
      if (rule.seriesTag && !catalogCardMatchesGroupTag(underMc, rule.seriesTag)) return false;
      if (rule.mirrorUnderMaxCost != null) {
        var uc = memberFlooredPrintedCost(underInst);
        if (uc > rule.mirrorUnderMaxCost) return false;
      }
      return true;
    }
    return false;
  }

  function jidouPerTurnKey(memberInst, segIndex) {
    return "jidou_auto_" + segIndex;
  }

  function jidouPerTurnBlocked(memberInst, segIndex, limit) {
    if (!limit) return false;
    ensureCardBoardFields(memberInst);
    var used = Math.floor(Number((memberInst._perTurnAbilityUsed || {})[jidouPerTurnKey(memberInst, segIndex)] || 0));
    return used >= limit;
  }

  function jidouPerTurnMark(memberInst, segIndex) {
    ensureCardBoardFields(memberInst);
    if (!memberInst._perTurnAbilityUsed || typeof memberInst._perTurnAbilityUsed !== "object") {
      memberInst._perTurnAbilityUsed = {};
    }
    var k = jidouPerTurnKey(memberInst, segIndex);
    memberInst._perTurnAbilityUsed[k] = Math.floor(Number(memberInst._perTurnAbilityUsed[k] || 0)) + 1;
  }

  function isMainPhasePlay() {
    return state.liveStatsAfterBegin !== true && state.liveTurnPickMode !== true;
  }

  function eachJidouListenerMemberInsts() {
    var out = [];
    eachStageColumnMemberInsts().forEach(function (m) {
      if (m) out.push(m);
    });
    (state.liveArea.left || [])
      .concat(state.liveArea.center || [], state.liveArea.right || [])
      .forEach(function (m) {
        if (m && m.type === T_MEMBER && out.indexOf(m) < 0) out.push(m);
      });
    return out;
  }

  function cardInstZoneBeforeSnap(cardId, snap) {
    if (!snap || cardId == null) return "other";
    var sid = String(cardId);
    function inArr(arr) {
      return (arr || []).some(function (c) {
        return c && String(c.id) === sid;
      });
    }
    if (inArr(snap.hand)) return "hand";
    if (inArr(snap.resolutionArea)) return "resolution";
    if (inArr(snap.deck)) return "deck";
    if (inArr(snap.energyArea)) return "energy";
    if (inArr(snap.successLiveArea)) return "successLive";
    var cols = ["left", "center", "right"];
    for (var ci = 0; ci < cols.length; ci++) {
      var k = cols[ci];
      if (snap.liveArea && inArr(snap.liveArea[k])) return "liveArea";
      if (snap.stage && inArr(snap.stage[k])) return "stage";
    }
    return "other";
  }

  function extractInlineLiveEndGrantJouji(segRaw) {
    var s = String(segRaw || "");
    var m = s.match(/ライブ終了時まで、([^。]+を得る)/);
    if (!m) return null;
    return "{{jyouji.png|常時}}" + m[1].trim();
  }

  function extractStageMemberGrantJouji(segRaw) {
    var s = String(segRaw || "");
    var m = s.match(/メンバー1人は、([^。]+を得る)/);
    if (!m) return null;
    return "{{jyouji.png|常時}}" + m[1].trim();
  }

  function grantJoujiSegmentToMember(targetInst, segText) {
    if (!targetInst || !segText) return;
    if (!targetInst._grantedJoujiSegmentRaws) targetInst._grantedJoujiSegmentRaws = [];
    if (targetInst._grantedJoujiSegmentRaws.indexOf(segText) < 0) {
      targetInst._grantedJoujiSegmentRaws.push(segText);
    }
  }

  function openJidouOptionalEnergyPay(energyCount, leadText, onDone) {
    payAbilityCost(null, { costEnergy: true, costEnergyCount: energyCount || 1 }, false, function (ok) {
      onDone(!!ok);
    });
    void leadText;
  }

  function openPickStageMemberDialog(excludeId, leadText, onDone) {
    var pool = eachStageColumnMemberInsts().filter(function (m) {
      return m && (!excludeId || String(m.id) !== String(excludeId));
    });
    if (!pool.length) {
      onDone(null);
      return;
    }
    if (pool.length === 1) {
      onDone(String(pool[0].id));
      return;
    }
    openPickFromWaitingDialog(pool, leadText || "ステージのメンバー1人を選びます。", onDone, {
      okLabel: "選ぶ",
      dialogTitle: "ステージのメンバー",
    });
  }

  function openDeckTopOrBottomPickDialog(leadText, onDone) {
    var pick = window.prompt(
      (leadText || "デッキの上か下に置きます。") + "\n\n1: デッキの一番上\n2: デッキの一番下\n\n番号を入力（キャンセルでスキップ）",
    );
    if (pick == null || String(pick).trim() === "") {
      onDone(null);
      return;
    }
    if (String(pick).trim() === "1") onDone("top");
    else if (String(pick).trim() === "2") onDone("bottom");
    else onDone(null);
  }

  function fireJidouAfterOppMemberWaited(waitedInst) {
    if (isPlayManualMode() || !waitedInst) return;
    eachJidouListenerMemberInsts().forEach(function (m) {
      fireJidouAutoForMember(m, "opp_wait_from_effect", { waitedInst: waitedInst });
    });
  }

  function fireJidouAfterSelfActiveToWait(memberInst) {
    if (isPlayManualMode() || !memberInst) return;
    fireJidouAutoForMember(memberInst, "self_active_to_wait", {});
  }

  function fireJidouAfterEnergyPlaced() {
    if (isPlayManualMode()) return;
    eachJidouListenerMemberInsts().forEach(function (m) {
      fireJidouAutoForMember(m, "energy_placed", {});
    });
  }

  function fireJidouAfterCardsToWaiting(movedCards, snapBefore, meta) {
    if (isPlayManualMode() || !movedCards || !movedCards.length) return;
    meta = meta || {};
    var fromHand = [];
    var fromLive = [];
    movedCards.forEach(function (c) {
      if (!c) return;
      var z = meta.fromZone || (snapBefore ? cardInstZoneBeforeSnap(c.id, snapBefore) : "other");
      if (z === "hand") fromHand.push(c);
      if (z === "liveArea") fromLive.push(c);
    });
    if (fromHand.length) {
      eachJidouListenerMemberInsts().forEach(function (m) {
        fireJidouAutoForMember(m, "hand_to_waiting", { movedCards: fromHand, fromHand: true });
      });
    }
    if (isMainPhasePlay()) {
      eachJidouListenerMemberInsts().forEach(function (m) {
        fireJidouAutoForMember(m, "card_to_waiting", { movedCards: movedCards.slice() });
      });
    }
    fromLive.forEach(function (lc) {
      if (!lc || mergedCatalogCard(lc).type !== T_LIVE) return;
      eachJidouListenerMemberInsts().forEach(function (m) {
        fireJidouAutoForMember(m, "live_zone_to_waiting", { movedCard: lc });
      });
    });
  }

  function maybeFireJidouAfterWaitingRoomChanges(snapBefore) {
    if (!snapBefore) return;
    var beforeIds = new Set(
      (snapBefore.waitingRoom || []).map(function (c) {
        return c && String(c.id);
      }),
    );
    var newCards = (state.waitingRoom || []).filter(function (c) {
      return c && !beforeIds.has(String(c.id));
    });
    if (newCards.length) fireJidouAfterCardsToWaiting(newCards, snapBefore, {});
  }

  function fireJidouLeaveStageEvents(leavingInst, batonPartnerInst) {
    if (isPlayManualMode() || !leavingInst) return;
    try {
      fireJidouAutoForMember(leavingInst, "leave_stage", {});
      if (batonPartnerInst) {
        fireJidouAutoForMember(leavingInst, "leave_stage_baton", { batonPartner: batonPartnerInst });
      }
    } catch (jErr) {
      console.warn(jErr);
    }
  }

  function runJidouAutoEffect(memberInst, cl, segRaw, segIndex, ctx) {
    if (!memberInst || !cl || isPlayManualMode()) return;
    var mc = mergedCatalogCard(memberInst);
    void mc;
    if (cl.template === "jidou_leave_stage_activate_one") {
      pushHistoryBefore("jidou-leave-activate");
      activateAllStageMembers(1);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: メンバー1人をアクティブにしました");
      render();
      return;
    }
    if (cl.template === "jidou_leave_stage_draw_discard") {
      var drawN = cl.deckDrawCount || 1;
      pushHistoryBefore("jidou-leave-draw");
      var drawnJ = [];
      for (var di = 0; di < drawN && state.deck.length; di++) drawnJ.push(state.deck.shift());
      drawnJ.forEach(function (c) {
        state.hand.push(c);
      });
      presentAbilityDrawsToHand(drawnJ, memberInst);
      openPickHandOptionalMultiToWaiting(
        "自動: 手札を " + (cl.handDiscardToWaiting || 1) + " 枚まで控え室に置けます（0枚可）。",
        function () {
          return true;
        },
        function () {
          jidouPerTurnMark(memberInst, segIndex);
          finishJidouAutoRender();
        },
        { okLabel: "捨てる", dialogTitle: "手札を控え室へ" },
      );
      return;
    }
    if (cl.template === "jidou_on_cost_enter_draw") {
      var drE = cl.deckDrawCount || 1;
      pushHistoryBefore("jidou-cost-enter-draw");
      var drawnE = [];
      for (var ei = 0; ei < drE && state.deck.length; ei++) drawnE.push(state.deck.shift());
      drawnE.forEach(function (c) {
        state.hand.push(c);
      });
      if (drawnE.length) presentAbilityDrawsToHand(drawnE, memberInst);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: 条件のメンバー登場により " + drawnE.length + " 枚引きました");
      render();
      void ctx;
      return;
    }
    if (cl.template === "jidou_on_cost_enter_energy_wait") {
      pushHistoryBefore("jidou-cost-enter-ed-wait");
      addEnergyFromDeckToArea(1, true);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: エネルギーデッキから1枚ウェイトで置きました");
      render();
      void ctx;
      return;
    }
    if (cl.template === "jidou_stage_entry_draw_until") {
      var tgt = cl.targetHandSize || 5;
      pushHistoryBefore("jidou-entry-draw-until");
      var drewU = 0;
      while ((state.hand || []).length < tgt && state.deck.length) {
        state.hand.push(state.deck.shift());
        drewU++;
      }
      if (drewU) showToast("自動: 手札が " + tgt + " 枚になるまで " + drewU + " 枚引きました");
      jidouPerTurnMark(memberInst, segIndex);
      render();
      return;
    }
    if (cl.template === "jidou_enter_or_baton_draw" || cl.template === "jidou_area_move_draw") {
      var drN = cl.deckDrawCount || 1;
      pushHistoryBefore("jidou-auto-draw");
      var drawnA = [];
      for (var ai = 0; ai < drN && state.deck.length; ai++) drawnA.push(state.deck.shift());
      drawnA.forEach(function (c) {
        state.hand.push(c);
      });
      presentAbilityDrawsToHand(drawnA, memberInst);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: カードを " + drawnA.length + " 枚引きました");
      render();
      return;
    }
    if (cl.template === "jidou_area_move_energy_wait") {
      pushHistoryBefore("jidou-area-energy-wait");
      addEnergyFromDeckToArea(1, true);
      jidouPerTurnMark(memberInst, segIndex);
      render();
      return;
    }
    if (cl.template === "jidou_area_move_grant_jouji") {
      pushHistoryBefore("jidou-area-grant-jouji");
      var grants = extractGrantedJoujiTextsFromSegment(segRaw);
      if (!memberInst._grantedJoujiSegmentRaws) memberInst._grantedJoujiSegmentRaws = [];
      grants.forEach(function (g) {
        if (memberInst._grantedJoujiSegmentRaws.indexOf(g) < 0) memberInst._grantedJoujiSegmentRaws.push(g);
      });
      if (!grants.length) {
        var scoreSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
        if (memberInst._grantedJoujiSegmentRaws.indexOf(scoreSeg) < 0) {
          memberInst._grantedJoujiSegmentRaws.push(scoreSeg);
        }
      }
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: ライブ終了時までの常時効果を適用しました");
      render();
      return;
    }
    if (cl.template === "jidou_yell_draw") {
      if ((state.hand || []).length > 7) return;
      var hasLive = (state.resolutionArea || []).some(function (c) {
        return c && mergedCatalogCard(c).type === T_LIVE;
      });
      if (!hasLive) return;
      pushHistoryBefore("jidou-yell-draw");
      if (state.deck.length) {
        var dY = state.deck.shift();
        state.hand.push(dY);
        presentAbilityDrawsToHand([dY], memberInst);
      }
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: エール公開にライブがあり手札7枚以下のため1枚引きました");
      render();
      return;
    }
    if (cl.template === "jidou_yell_grant_heart") {
      var liveInRes = (state.resolutionArea || []).some(function (c) {
        return c && mergedCatalogCard(c).type === T_LIVE;
      });
      if (!liveInRes) return;
      pushHistoryBefore("jidou-yell-heart");
      var slotJ = cl.heartSlot != null ? Math.floor(Number(cl.heartSlot)) : 4;
      grantHeartSlotUntilLiveEnd(memberInst, slotJ);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: ライブ終了時までハートスロットを付与しました");
      render();
      return;
    }
    if (
      cl.template === "jidou_yell_grant_jouji" ||
      cl.template === "jidou_yell_grant_jouji_nobh_members" ||
      cl.template === "jidou_yell_grant_jouji_no_bh"
    ) {
      var resCards = state.resolutionArea || [];
      if (cl.template === "jidou_yell_grant_jouji_nobh_members") {
        var nobh = 0;
        resCards.forEach(function (c) {
          var mcR = mergedCatalogCard(c);
          if (mcR.type === T_MEMBER && !cardHasBladeHeart(mcR)) nobh++;
        });
        if (nobh < 3) return;
      }
      if (cl.template === "jidou_yell_grant_jouji_no_bh") {
        var anyBh = resCards.some(function (c) {
          return cardHasBladeHeart(mergedCatalogCard(c));
        });
        if (anyBh) return;
      }
      pushHistoryBefore("jidou-yell-grant-jouji");
      if (!memberInst._grantedJoujiSegmentRaws) memberInst._grantedJoujiSegmentRaws = [];
      var gSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
      if (memberInst._grantedJoujiSegmentRaws.indexOf(gSeg) < 0) memberInst._grantedJoujiSegmentRaws.push(gSeg);
      var grantsY = extractGrantedJoujiTextsFromSegment(segRaw);
      grantsY.forEach(function (g) {
        if (memberInst._grantedJoujiSegmentRaws.indexOf(g) < 0) memberInst._grantedJoujiSegmentRaws.push(g);
      });
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: エール条件を満たし常時効果を得ました");
      render();
      return;
    }
    if (cl.template === "jidou_area_move_activate_energy") {
      pushHistoryBefore("jidou-area-act-energy");
      activateEnergyCount(cl.energyActiveCount || 1);
      jidouPerTurnMark(memberInst, segIndex);
      render();
      return;
    }
    if (cl.template === "jidou_area_move_opp_wait") {
      pushHistoryBefore("jidou-area-opp-wait");
      var maxC = cl.oppWaitMaxCost != null ? cl.oppWaitMaxCost : 4;
      openSoloOpponentMemberWaitPickMultiDialog(maxC, 1, "自動: 相手ステージのメンバー1人をウェイトにします。", function (ok) {
        if (ok) showToast("相手メンバーをウェイトにしました");
        jidouPerTurnMark(memberInst, segIndex);
        render();
      });
      return;
    }
    if (cl.template === "jidou_move_or_energy_draw_grant") {
      pushHistoryBefore("jidou-move-energy-grant");
      var drM2 = cl.deckDrawCount || 1;
      var drawnM = [];
      for (var mi = 0; mi < drM2 && state.deck.length; mi++) drawnM.push(state.deck.shift());
      drawnM.forEach(function (c) {
        state.hand.push(c);
      });
      if (drawnM.length) presentAbilityDrawsToHand(drawnM, memberInst);
      if (!memberInst._grantedJoujiSegmentRaws) memberInst._grantedJoujiSegmentRaws = [];
      var gM = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
      if (memberInst._grantedJoujiSegmentRaws.indexOf(gM) < 0) memberInst._grantedJoujiSegmentRaws.push(gM);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: 1枚引き、常時効果を得ました");
      render();
      return;
    }
    if (cl.template === "jidou_card_to_waiting_pick_hand") {
      if (!ctx || !ctx.movedCards || !ctx.movedCards.length) return;
      openJidouOptionalEnergyPay(cl.optionalPayEnergy || 1, "自動: E1枚支払って控え室に置いたカード1枚を手札に加えます。", function (paid) {
        if (!paid) return;
        var pool = ctx.movedCards.filter(function (c) {
          return c && state.waitingRoom.some(function (w) {
            return w && String(w.id) === String(c.id);
          });
        });
        if (!pool.length) {
          showToast("控え室に対象カードがありません");
          return;
        }
        pushHistoryBefore("jidou-wait-pick-hand");
        openPickFromWaitingDialog(
          pool,
          "自動: 控え室に置いたカードのうち1枚を手札に加えます。",
          function (pid) {
            if (!pid) return;
            var wi = state.waitingRoom.findIndex(function (w) {
              return w && String(w.id) === String(pid);
            });
            if (wi < 0) return;
            var picked = state.waitingRoom.splice(wi, 1)[0];
            state.hand.push(picked);
            presentAbilityDrawsToHand([picked], memberInst);
            jidouPerTurnMark(memberInst, segIndex);
            showToast("自動: 控え室から1枚手札に加えました");
            finishJidouAutoRender();
          },
        );
      });
      return;
    }
    if (cl.template === "jidou_live_zone_to_waiting_deck") {
      if (!ctx || !ctx.movedCard) return;
      var liveMc = mergedCatalogCard(ctx.movedCard);
      if (cl.filters && cl.filters.seriesTag && !catalogCardMatchesGroupTag(liveMc, cl.filters.seriesTag)) return;
      var wiL = state.waitingRoom.findIndex(function (w) {
        return w && String(w.id) === String(ctx.movedCard.id);
      });
      if (wiL < 0) return;
      openDeckTopOrBottomPickDialog("自動: ライブカードをデッキの上か下に置きます。", function (where) {
        if (!where) return;
        pushHistoryBefore("jidou-live-deck-order");
        var idxL = state.waitingRoom.findIndex(function (w) {
          return w && String(w.id) === String(ctx.movedCard.id);
        });
        if (idxL < 0) return;
        var cardL = state.waitingRoom.splice(idxL, 1)[0];
        if (where === "top") state.deck.unshift(cardL);
        else state.deck.push(cardL);
        jidouPerTurnMark(memberInst, segIndex);
        showToast(where === "top" ? "自動: デッキの一番上に置きました" : "自動: デッキの一番下に置きました");
        finishJidouAutoRender();
      });
      return;
    }
    if (cl.template === "jidou_yell_retry_no_live") {
      var resCardsR = state.resolutionArea || [];
      var hasLiveR = resCardsR.some(function (c) {
        return c && mergedCatalogCard(c).type === T_LIVE;
      });
      if (hasLiveR || !resCardsR.length) return;
      if (!window.confirm("自動: エール公開にライブがないため、公開カードをすべて控え室に置き、もう一度エールしますか？")) return;
      pushHistoryBefore("jidou-yell-retry");
      var movedR = resCardsR.slice();
      movedR.forEach(function (c) {
        if (!c) return;
        state.waitingRoom.push(c);
        if (Array.isArray(state.ealeNoteLiveHitIds)) {
          var hi = state.ealeNoteLiveHitIds.indexOf(c.id);
          if (hi >= 0) state.ealeNoteLiveHitIds.splice(hi, 1);
        }
      });
      state.resolutionArea.length = 0;
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: 公開カードを控え室へ。デッキからもう一度エールしてください");
      finishJidouAutoRender();
      return;
    }
    if (cl.template === "jidou_opp_wait_draw") {
      if (!ctx || !ctx.waitedInst) return;
      var wCost = memberFlooredPrintedCost(ctx.waitedInst);
      if (wCost > (cl.oppWaitMaxCost != null ? cl.oppWaitMaxCost : 4)) return;
      var drOw = cl.deckDrawCount || 1;
      pushHistoryBefore("jidou-opp-wait-draw");
      var drawnOw = [];
      for (var oi = 0; oi < drOw && state.deck.length; oi++) drawnOw.push(state.deck.shift());
      drawnOw.forEach(function (c) {
        state.hand.push(c);
      });
      if (drawnOw.length) presentAbilityDrawsToHand(drawnOw, memberInst);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: 相手メンバーのウェイトにより " + drawnOw.length + " 枚引きました");
      render();
      return;
    }
    if (cl.template === "jidou_series_enter_pay_energy") {
      openJidouOptionalEnergyPay(cl.optionalPayEnergy || 1, "自動: E1枚支払ってエネルギーをアクティブにします。", function (paid) {
        if (!paid) return;
        pushHistoryBefore("jidou-series-enter-energy");
        activateEnergyCount(cl.energyActiveCount || 2);
        jidouPerTurnMark(memberInst, segIndex);
        showToast("自動: エネルギーを " + (cl.energyActiveCount || 2) + " 枚アクティブにしました");
        finishJidouAutoRender();
      });
      return;
    }
    if (cl.template === "jidou_hand_to_waiting_grant") {
      var gHand = extractInlineLiveEndGrantJouji(segRaw) || extractGrantedJoujiTextsFromSegment(segRaw)[0];
      if (!gHand) return;
      pushHistoryBefore("jidou-hand-wait-grant");
      grantJoujiSegmentToMember(memberInst, gHand);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: 手札→控え室により常時効果を得ました");
      render();
      return;
    }
    if (cl.template === "jidou_series_enter_grant") {
      var gEnt = extractInlineLiveEndGrantJouji(segRaw) || extractGrantedJoujiTextsFromSegment(segRaw)[0];
      if (!gEnt) return;
      pushHistoryBefore("jidou-series-enter-grant");
      grantJoujiSegmentToMember(memberInst, gEnt);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: シリーズ登場により常時効果を得ました");
      render();
      return;
    }
    if (cl.template === "jidou_series_enter_opp_wait") {
      pushHistoryBefore("jidou-series-enter-opp-wait");
      openSoloOpponentMemberWaitPickMultiDialog(99, 1, "自動: 相手ステージのメンバー1人をウェイトにします。", function (ok) {
        if (ok) showToast("相手メンバーをウェイトにしました");
        jidouPerTurnMark(memberInst, segIndex);
        render();
      });
      return;
    }
    if (cl.template === "jidou_self_active_to_wait_draw_discard") {
      var drSw = cl.deckDrawCount || 1;
      pushHistoryBefore("jidou-self-wait-draw");
      var drawnSw = [];
      for (var si = 0; si < drSw && state.deck.length; si++) drawnSw.push(state.deck.shift());
      drawnSw.forEach(function (c) {
        state.hand.push(c);
      });
      if (drawnSw.length) presentAbilityDrawsToHand(drawnSw, memberInst);
      openPickHandToWaitingDialog(cl.handDiscardToWaiting || 1, function (handIds) {
        (handIds || []).forEach(function (hid) {
          var hi = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(hid);
          });
          if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
        });
        jidouPerTurnMark(memberInst, segIndex);
        finishJidouAutoRender();
      });
      return;
    }
    if (cl.template === "jidou_energy_placed_grant") {
      var gEn = extractInlineLiveEndGrantJouji(segRaw) || extractGrantedJoujiTextsFromSegment(segRaw)[0];
      if (!gEn) return;
      pushHistoryBefore("jidou-energy-grant");
      grantJoujiSegmentToMember(memberInst, gEn);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: エネルギー配置により常時効果を得ました");
      render();
      return;
    }
    if (cl.template === "jidou_baton_leave_activate_energy") {
      pushHistoryBefore("jidou-baton-leave-energy");
      activateEnergyCount(cl.energyActiveCount || 2);
      jidouPerTurnMark(memberInst, segIndex);
      showToast("自動: バトン退場によりエネルギーを " + (cl.energyActiveCount || 2) + " 枚アクティブにしました");
      render();
      return;
    }
    if (cl.template === "jidou_leave_stage_hand_pick_recover") {
      var discardNRec = cl.handDiscardToWaiting || 1;
      openPickHandOptionalMultiToWaiting(
        "自動: 手札を " + discardNRec + " 枚控え室に置いてもよい（0枚でスキップ）。",
        function () {
          return true;
        },
        function (ids) {
          if (!ids || !ids.length) {
            jidouPerTurnMark(memberInst, segIndex);
            finishJidouAutoRender();
            return;
          }
          ids.forEach(function (hid) {
            var hi = state.hand.findIndex(function (h) {
              return h && String(h.id) === String(hid);
            });
            if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
          });
          pushHistoryBefore("jidou-leave-hand-recover");
          var fltRec = cl.filters || {};
          if (fltRec.pickDualLiveMember) {
            function finishDualPick() {
              jidouPerTurnMark(memberInst, segIndex);
              showToast("自動: 控え室から手札に加えました");
              finishJidouAutoRender();
            }
            var liveCandRec = waitingPickCandidates({ pickType: T_LIVE }, null);
            var memberCandRec = waitingPickCandidates({ pickType: T_MEMBER }, null);
            if (!liveCandRec.length && !memberCandRec.length) {
              showToast("自動: 控え室に回収できるカードがありません");
              jidouPerTurnMark(memberInst, segIndex);
              finishJidouAutoRender();
              return;
            }
            function pickMemberRec() {
              if (!memberCandRec.length) {
                finishDualPick();
                return;
              }
              openPickFromWaitingDialog(
                memberCandRec,
                "自動: 控え室からメンバーを1枚まで手札に加えます（キャンセルでスキップ）。",
                function (pid) {
                  if (pid) moveInstFromWaitingToHand(pid, memberInst);
                  finishDualPick();
                },
                { dialogTitle: "自動: 控え室からメンバー", okLabel: "手札に加える" },
              );
            }
            if (!liveCandRec.length) {
              pickMemberRec();
              return;
            }
            openPickFromWaitingDialog(
              liveCandRec,
              "自動: 控え室からライブを1枚まで手札に加えます（キャンセルでスキップ）。",
              function (pid) {
                if (pid) moveInstFromWaitingToHand(pid, memberInst);
                pickMemberRec();
              },
              { dialogTitle: "自動: 控え室からライブ", okLabel: "手札に加える" },
            );
            return;
          }
          var waitCandRec = waitingPickCandidates(fltRec, null);
          if (!waitCandRec.length) {
            showToast("自動: 控え室に回収できるカードがありません");
            jidouPerTurnMark(memberInst, segIndex);
            finishJidouAutoRender();
            return;
          }
          openPickFromWaitingDialog(
            waitCandRec,
            "自動: 控え室から1枚手札に加えます。",
            function (pid) {
              if (pid) moveInstFromWaitingToHand(pid, memberInst);
              jidouPerTurnMark(memberInst, segIndex);
              showToast(pid ? "自動: 控え室から1枚手札に加えました" : "自動: 回収をスキップしました");
              finishJidouAutoRender();
            },
            { dialogTitle: "自動: 控え室から回収", okLabel: "手札に加える" },
          );
        },
        { okLabel: "捨てる", dialogTitle: "手札を控え室へ（任意）" },
      );
      return;
    }
    if (cl.template === "jidou_leave_stage_deck_look_pick") {
      var topCntJ = cl.deckTopCount || 5;
      if (!state.deck.length) {
        jidouPerTurnMark(memberInst, segIndex);
        return;
      }
      var pickCntJ = Math.min(topCntJ, state.deck.length);
      pushHistoryBefore("jidou-leave-deck-look");
      var lookedJ = state.deck.splice(0, pickCntJ);
      render();
      var filterHintJ = describePickFilters(cl.filters || {});
      openPickFromDeckLookDialog(
        lookedJ,
        cl.filters || {},
        "自動: 山札の上 " +
          lookedJ.length +
          " 枚を見ました。1枚（任意）を手札に加え、残りは控え室へ置きます。" +
          (filterHintJ ? "（目安: " + filterHintJ + "）" : ""),
        function (pickedId) {
          var addedJ = null;
          if (pickedId) {
            for (var lj = 0; lj < lookedJ.length; lj++) {
              if (lookedJ[lj] && String(lookedJ[lj].id) === String(pickedId)) {
                addedJ = lookedJ.splice(lj, 1)[0];
                break;
              }
            }
          }
          if (addedJ) {
            state.hand.push(addedJ);
            presentAbilityDrawsToHand([addedJ], memberInst);
          }
          lookedJ.forEach(function (c) {
            state.waitingRoom.push(c);
          });
          function finishDeckLookJ() {
            jidouPerTurnMark(memberInst, segIndex);
            showToast(
              addedJ
                ? "自動: " + (mergedCatalogCard(addedJ).name || "カード") + " を手札に、残りを控え室へ"
                : "自動: 見たカードをすべて控え室へ",
            );
            finishJidouAutoRender();
          }
          if (lookedJ.length) {
            revealCardsSentFromDeckToWaiting(
              lookedJ.slice(),
              "手札に加えなかったカードを控え室に置きました。",
              finishDeckLookJ,
              memberInst,
            );
          } else {
            finishDeckLookJ();
          }
        },
      );
      return;
    }
    if (cl.template === "jidou_area_move_wait_pick_hand") {
      var waitMoveCand = waitingPickCandidates(cl.filters || {}, null);
      if (!waitMoveCand.length) {
        jidouPerTurnMark(memberInst, segIndex);
        return;
      }
      pushHistoryBefore("jidou-area-wait-pick");
      if (waitMoveCand.length === 1) {
        moveInstFromWaitingToHand(String(waitMoveCand[0].id), memberInst);
        jidouPerTurnMark(memberInst, segIndex);
        showToast("自動: 控え室から手札に加えました");
        finishJidouAutoRender();
        return;
      }
      openPickFromWaitingDialog(
        waitMoveCand,
        "自動: エリア移動により控え室から1枚手札に加えます。",
        function (pid) {
          if (pid) moveInstFromWaitingToHand(pid, memberInst);
          jidouPerTurnMark(memberInst, segIndex);
          showToast(pid ? "自動: 控え室から手札に加えました" : "自動: 回収対象がありませんでした");
          finishJidouAutoRender();
        },
        { dialogTitle: "自動: 控え室から回収", okLabel: "手札に加える" },
      );
      return;
    }
    if (cl.template === "jidou_leave_stage_position_change") {
      var stagePoolPc = eachStageColumnMemberInsts().filter(function (m) {
        return m && String(m.id) !== String(memberInst.id);
      });
      if (!stagePoolPc.length) {
        jidouPerTurnMark(memberInst, segIndex);
        return;
      }
      openPickStageMemberDialog(
        memberInst.id,
        "自動: ポジションチェンジするメンバー1人を選びます（キャンセルでスキップ）。",
        function (pid) {
          if (!pid) {
            jidouPerTurnMark(memberInst, segIndex);
            finishJidouAutoRender();
            return;
          }
          var tgtPc = findCardInstById(pid);
          if (!tgtPc || !stageColumnKeyHostingMember(tgtPc.id)) {
            jidouPerTurnMark(memberInst, segIndex);
            finishJidouAutoRender();
            return;
          }
          pushHistoryBefore("jidou-leave-position-change");
          openPositionChangeColumnPickDialog(
            tgtPc,
            cl,
            "自動: ポジションチェンジ先のエリアを選びます。",
            function (targetCol) {
              if (!targetCol) {
                jidouPerTurnMark(memberInst, segIndex);
                finishJidouAutoRender();
                return;
              }
              var snapJpc = snapshotBoard();
              if (!swapStageMemberPositionChange(tgtPc, targetCol)) {
                showToast("自動: ポジションチェンジできませんでした");
              } else {
                try {
                  syncPlayBonusesAfterStageMembershipChange(snapJpc);
                  syncJoujiPassiveEffectsAll();
                } catch (_) {}
                showToast("自動: ポジションチェンジしました");
              }
              jidouPerTurnMark(memberInst, segIndex);
              finishJidouAutoRender();
            },
          );
        },
      );
      return;
    }
    if (cl.template === "jidou_leave_stage_hand_grant_member") {
      openPickHandOptionalMultiToWaiting(
        "自動: 手札を " + (cl.handDiscardToWaiting || 1) + " 枚控え室に置いてもよい（0枚でスキップ）。",
        function () {
          return true;
        },
        function (ids) {
          if (ids && ids.length) {
            ids.forEach(function (hid) {
              var hi = state.hand.findIndex(function (h) {
                return h && String(h.id) === String(hid);
              });
              if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
            });
          }
          if (!ids || !ids.length) {
            jidouPerTurnMark(memberInst, segIndex);
            finishJidouAutoRender();
            return;
          }
          var gMem = extractStageMemberGrantJouji(segRaw);
          if (!gMem) {
            jidouPerTurnMark(memberInst, segIndex);
            finishJidouAutoRender();
            return;
          }
          openPickStageMemberDialog(memberInst.id, "自動: 常時効果を得るステージのメンバー1人を選びます。", function (pid) {
            if (!pid) {
              jidouPerTurnMark(memberInst, segIndex);
              finishJidouAutoRender();
              return;
            }
            var tgt = findCardInstById(pid);
            if (tgt) grantJoujiSegmentToMember(tgt, gMem);
            jidouPerTurnMark(memberInst, segIndex);
            showToast(tgt ? "自動: ステージのメンバーに常時効果を付与しました" : "自動: 対象が見つかりませんでした");
            finishJidouAutoRender();
          });
        },
        { okLabel: "捨てる", dialogTitle: "手札を控え室へ（任意）" },
      );
      return;
    }
    void segRaw;
    void segIndex;
  }

  function finishJidouAutoRender() {
    try {
      syncJoujiPassiveEffectsAll();
    } catch (_) {}
    render();
  }

  function fireJidouAutoForMember(memberInst, eventKind, ctx) {
    if (isPlayManualMode() || !memberInst || memberInst.type !== T_MEMBER) return;
    var mc = mergedCatalogCard(memberInst);
    var raws = listNativeJidouSegmentRaws(mc);
    for (var i = 0; i < raws.length; i++) {
      var cl = classifyJidouAutoSegment(raws[i]);
      if (!cl || cl.eventKind !== eventKind || cl.template === "jidou_manual") continue;
      if (jidouPerTurnBlocked(memberInst, i, cl.perTurnLimit)) continue;
      if (cl.template === "jidou_on_cost_enter_draw" || cl.template === "jidou_on_cost_enter_energy_wait") {
        if (!ctx || !ctx.enteredInst) continue;
        var enterCost = memberFlooredPrintedCost(ctx.enteredInst);
        if (enterCost !== cl.entryCost) continue;
        if (/このメンバー以外/.test(raws[i]) && String(ctx.enteredInst.id) === String(memberInst.id)) continue;
      }
      if (cl.template === "jidou_stage_entry_draw_until") {
        if ((state.stageMemberEntriesThisTurn || 0) < (cl.minStageEntries || 3)) continue;
      }
      if (cl.template === "jidou_series_enter_pay_energy" || cl.template === "jidou_series_enter_grant" || cl.template === "jidou_series_enter_opp_wait") {
        if (!ctx || !ctx.enteredInst) continue;
        var entTag = cl.filters && cl.filters.seriesTag;
        if (entTag && !catalogCardMatchesGroupTag(mergedCatalogCard(ctx.enteredInst), entTag)) continue;
        if (/ほかの/.test(raws[i]) && String(ctx.enteredInst.id) === String(memberInst.id)) continue;
        if (cl.requiresCenter && stageColumnKeyHostingMember(memberInst.id) !== "center") continue;
      }
      if (cl.template === "jidou_baton_leave_activate_energy") {
        if (!ctx || !ctx.batonPartner) continue;
        var bpCost = memberFlooredPrintedCost(ctx.batonPartner);
        if (cl.filters && cl.filters.minCost != null && bpCost < cl.filters.minCost) continue;
        if (cl.filters && cl.filters.seriesTag && !catalogCardMatchesGroupTag(mergedCatalogCard(ctx.batonPartner), cl.filters.seriesTag)) continue;
      }
      if (cl.template === "jidou_opp_wait_draw") {
        if (!ctx || !ctx.waitedInst) continue;
        var owCost = memberFlooredPrintedCost(ctx.waitedInst);
        if (owCost > (cl.oppWaitMaxCost != null ? cl.oppWaitMaxCost : 4)) continue;
      }
      if (cl.template === "jidou_card_to_waiting_pick_hand") {
        if (!isMainPhasePlay() || !ctx || !ctx.movedCards || !ctx.movedCards.length) continue;
      }
      if (cl.template === "jidou_hand_to_waiting_grant") {
        if (!ctx || !ctx.fromHand) continue;
      }
      if (cl.template === "jidou_live_zone_to_waiting_deck") {
        if (!ctx || !ctx.movedCard) continue;
      }
      if (cl.template === "jidou_self_active_to_wait_draw_discard") {
        if (!isMainPhasePlay()) continue;
      }
      runJidouAutoEffect(memberInst, cl, raws[i], i, ctx);
    }
  }

  function fireJidouAfterStageEntries(enteredInsts) {
    if (!enteredInsts || !enteredInsts.length) return;
    state.stageMemberEntriesThisTurn = Math.max(0, Math.floor(Number(state.stageMemberEntriesThisTurn) || 0)) + enteredInsts.length;
    eachStageColumnMemberInsts().forEach(function (m) {
      enteredInsts.forEach(function (ent) {
        fireJidouAutoForMember(m, "stage_entry", { enteredInst: ent });
      });
      fireJidouAutoForMember(m, "stage_entry_count", { enteredInst: enteredInsts[0] });
    });
  }

  function fireJidouAutoYellAll() {
    if (isPlayManualMode()) return;
    eachStageColumnMemberInsts().forEach(function (m) {
      fireJidouAutoForMember(m, "yell");
    });
    (state.liveArea.left || []).concat(state.liveArea.center || [], state.liveArea.right || []).forEach(function (m) {
      if (m && m.type === T_MEMBER) fireJidouAutoForMember(m, "yell");
    });
  }

  function memberSkipAutoActivateThisTurn(inst) {
    return (
      inst &&
      typeof inst._skipAutoActivateUntilTurn === "number" &&
      Number.isFinite(inst._skipAutoActivateUntilTurn) &&
      state.turnCount <= inst._skipAutoActivateUntilTurn
    );
  }

  function syncJoujiPassiveEffectsAll() {
    state.joujiLiveScoreBonus = 0;
    state.joujiOpponentLiveNeedHeartBump = 0;
    state.joujiGrantHandCostReduceNoAbility = 0;
    allZonesFlat().forEach(clearMemberJoujiComputed);
    var ctx = createJoujiBoardContext();
    state.joujiGrantHandCostReduceNoAbility = computeStageGrantHandCostReduceNoAbility(
      state,
      findCardInstById,
      mergedCatalogCard,
      ctx,
    );
    allZonesFlat().forEach(function (c) {
      if (!c || c.type !== T_MEMBER) return;
      var onBoard = memberIsOnStageOrLiveSlot(c);
      var inHand = memberInstanceIsInHand(c);
      if (!onBoard && !inHand) return;
      var card = mergedCatalogCard(c);
      var extra = Array.isArray(c._grantedJoujiSegmentRaws) ? c._grantedJoujiSegmentRaws : [];
      var ev = evaluateMemberJouji(card, c, ctx, extra);
      if (onBoard) {
        c.joujiBladeBonus = Math.floor(Number(ev.bladeBonus) || 0);
        c.joujiHeartSlots = Object.assign({}, ev.heartSlots || {});
        c._joujiStageCostDelta = Math.floor(Number(ev.stageCostDelta) || 0);
        if (ev.cannotLiveAlone) c._joujiCannotLiveAlone = true;
        if (ev.cannotSelfActivate) c._joujiCannotSelfActivate = true;
        if (ev.cannotBatonToWaiting) c._joujiCannotBatonToWaiting = true;
        var batonTag = getJoujiBatonSeriesOnlyTag(c, ctx);
        if (batonTag) c._joujiBatonSeriesOnlyTag = batonTag;
        state.joujiLiveScoreBonus += Math.floor(Number(ev.liveScoreBonus) || 0);
        state.joujiOpponentLiveNeedHeartBump = Math.max(
          state.joujiOpponentLiveNeedHeartBump,
          Math.floor(Number(ev.opponentLiveNeedHeartPlus) || 0),
        );
        if (ev.printedHeartsWildcard) c._baseHeartsWildcardUntilLiveEnd = true;
      }
      if (inHand) {
        c._joujiHandCostReduction = Math.max(0, Math.floor(Number(ev.handCostReduction) || 0));
      }
    });
    if (state.liveStatsAfterBegin) {
      try {
        syncLiveCenterScoreBar(getRenderPassLiveBundle());
      } catch (_) {}
    }
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

  /** @param {object|null|undefined} snapBeforeAppear 手札→登場直前の盤面スナップ（登場後は手札にいないためコスト算出に使用） */
  function handOtherCountFromSnap(snapBeforeAppear, memberId) {
    if (!snapBeforeAppear || !Array.isArray(snapBeforeAppear.hand) || memberId == null) return null;
    var sid = String(memberId);
    var wasInHand = false;
    var others = 0;
    for (var hi = 0; hi < snapBeforeAppear.hand.length; hi++) {
      var hc = snapBeforeAppear.hand[hi];
      if (!hc) continue;
      if (String(hc.id) === sid) wasInHand = true;
      else others++;
    }
    return wasInHand ? others : null;
  }

  function memberFlooredPrintedCost(memberInstOrNull, costOpts) {
    if (!memberInstOrNull || memberInstOrNull.type !== T_MEMBER) return 0;
    var merged = mergedCatalogCard(memberInstOrNull);
    var no = String(memberInstOrNull.card_no || merged.card_no || "");
    if (isHandDependentCost20Member(no)) {
      var othersHand = null;
      if (memberInstanceIsInHand(memberInstOrNull)) {
        var selfId = String(memberInstOrNull.id);
        othersHand = 0;
        for (var i = 0; i < state.hand.length; i++) {
          var h = state.hand[i];
          if (h && String(h.id) !== selfId) othersHand++;
        }
      } else if (costOpts && costOpts.handSnap) {
        othersHand = handOtherCountFromSnap(costOpts.handSnap, memberInstOrNull.id);
      }
      if (othersHand != null) return Math.max(0, 20 - othersHand);
    }
    var costNum = Number(merged.cost);
    var baseCost = 0;
    if (Number.isFinite(costNum) && costNum >= 1) baseCost = Math.min(Math.floor(costNum), 99);
    else if (merged.cost != null && String(merged.cost).trim() !== "") {
      var digits = String(merged.cost).replace(/[^\d]/g, "");
      var parsed = digits.length ? parseInt(digits, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= 1) baseCost = Math.min(parsed, 99);
    }
    if (memberInstanceIsInHand(memberInstOrNull)) {
      var handRed = Math.max(0, Math.floor(Number(memberInstOrNull._joujiHandCostReduction) || 0));
      if (
        catalogMemberHasNoAbility(merged) &&
        Math.floor(Number(state.joujiGrantHandCostReduceNoAbility) || 0) > 0
      ) {
        handRed += Math.floor(Number(state.joujiGrantHandCostReduceNoAbility) || 0);
      }
      try {
        handRed += computeJoujiHandCostReductionForCard(memberInstOrNull, createJoujiBoardContext());
      } catch (_) {}
      baseCost = Math.max(0, baseCost - handRed);
    }
    if (stageColumnKeyHostingMember(memberInstOrNull.id) != null) {
      baseCost = Math.max(0, baseCost + Math.floor(Number(memberInstOrNull._joujiStageCostDelta) || 0));
    }
    return baseCost;
  }

  /** ステージ外から当ステージ列へ「載る」ときにウェイトへ回す側面エネ枚数（既存メンバーがいればバトンタッチとして差し引く） */
  function effectiveStageAppearPrintedCost(memberNew, incumbentMaybe, costOpts) {
    var w = memberFlooredPrintedCost(memberNew, costOpts);
    if (!incumbentMaybe || incumbentMaybe.type !== T_MEMBER) return w;
    return Math.max(0, w - memberFlooredPrintedCost(incumbentMaybe, costOpts));
  }

  function sumireCenterDoubleBatonEnergyCost(enteringInst, centerMem, sideMem) {
    var base = memberFlooredPrintedCost(enteringInst);
    if (!centerMem || !sideMem) return base;
    return Math.max(0, base - memberFlooredPrintedCost(centerMem) - memberFlooredPrintedCost(sideMem));
  }

  function sumireCenterDoubleBatonPreviewCost(enteringInst) {
    var centerMem = stageColumnIncumbentMember("center");
    var leftMem = stageColumnIncumbentMember("left");
    var rightMem = stageColumnIncumbentMember("right");
    if (!centerMem || (!leftMem && !rightMem)) {
      return effectiveStageAppearPrintedCost(enteringInst, centerMem);
    }
    if (leftMem && rightMem) {
      return Math.min(
        sumireCenterDoubleBatonEnergyCost(enteringInst, centerMem, leftMem),
        sumireCenterDoubleBatonEnergyCost(enteringInst, centerMem, rightMem),
      );
    }
    return sumireCenterDoubleBatonEnergyCost(enteringInst, centerMem, leftMem || rightMem);
  }

  function removeStageMemberToWaiting(memberInst) {
    if (!memberInst || memberInst.id == null) return false;
    var col = stageColumnKeyHostingMember(memberInst.id);
    if (!col) return false;
    var slot = state.stage[col] || [];
    var idx = slot.findIndex(function (c) {
      return c && c.type === T_MEMBER && String(c.id) === String(memberInst.id);
    });
    if (idx < 0) return false;
    var removed = slot.splice(idx, 1)[0];
    clearToujouEffectStateOnLeaveStage(removed);
    state.waitingRoom.push(removed);
    return true;
  }

  /** メンバーが載っている列（ステージ優先、無ければライブ枠） */
  function boardColumnKeyHostingCard(cardId) {
    return stageColumnKeyHostingCard(cardId) || liveSlotColumnKeyHostingCard(cardId);
  }

  function cardIsOnStageOrLiveBoard(cardInst) {
    if (!cardInst || cardInst.id == null) return false;
    return boardColumnKeyHostingCard(cardInst.id) != null;
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

  /** ステージ列に載っているメンバー／ライブの列キー */
  function stageColumnKeyHostingCard(cardId) {
    if (!cardId) return null;
    var keyStr = String(cardId);
    for (var si = 0; si < 3; si++) {
      var sk = ["left", "center", "right"][si];
      var slot = state.stage[sk] || [];
      for (var sj = 0; sj < slot.length; sj++) {
        var c = slot[sj];
        if (c && (c.type === T_MEMBER || c.type === T_LIVE) && String(c.id) === keyStr) return sk;
      }
    }
    return null;
  }

  /** ライブ枠（左・中央・右）に載っているメンバー／ライブの列キー */
  function liveSlotColumnKeyHostingCard(cardId) {
    if (!cardId) return null;
    var keyStr = String(cardId);
    for (var li = 0; li < 3; li++) {
      var lk = ["left", "center", "right"][li];
      var slot = state.liveArea[lk] || [];
      for (var lj = 0; lj < slot.length; lj++) {
        var m = slot[lj];
        if (m && (m.type === T_MEMBER || m.type === T_LIVE) && String(m.id) === keyStr) return lk;
      }
    }
    return null;
  }

  /** @deprecated メンバー専用。ライブカードは {@link liveSlotColumnKeyHostingCard} を使う */
  function liveSlotColumnKeyHostingMember(cardId) {
    var col = liveSlotColumnKeyHostingCard(cardId);
    if (!col) return null;
    var inst = findCardInstById(cardId);
    return inst && inst.type === T_MEMBER ? col : null;
  }

  function memberIsOnStageOrLiveSlot(memberInst) {
    return !!(
      memberInst &&
      memberInst.type === T_MEMBER &&
      memberInst.id != null &&
      (stageColumnKeyHostingMember(memberInst.id) != null || liveSlotColumnKeyHostingCard(memberInst.id) != null)
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

  function stageColumnIncumbentMember(col) {
    if (!col) return null;
    var slot = state.stage[col] || [];
    for (var si = 0; si < slot.length; si++) {
      if (slot[si] && slot[si].type === T_MEMBER) return slot[si];
    }
    return null;
  }

  /** 当ターンに載せたメンバーへのバトンタッチ不可・列登場不可（pb1-018 等）を含む */
  function stageColumnAllowsMemberEntry(col) {
    if (!col || isStageColumnEntryBlocked(col)) return false;
    var incumbent = stageColumnIncumbentMember(col);
    if (!incumbent) return true;
    if (memberIsStageFreshThisTurn(incumbent)) return false;
    if (incumbent._joujiCannotBatonToWaiting === true) return false;
    return true;
  }

  function canHandMemberEnterStageColumn(memberInst, col) {
    if (!memberInst || memberInst.type !== T_MEMBER || !col) return false;
    if (!stageColumnAllowsMemberEntry(col)) return false;
    var incumbent = stageColumnIncumbentMember(col);
    var upright = countUprightEnergyInArea(state.energyArea);
    var mc = mergedCatalogCard(memberInst);
    var cost =
      col === "center" && cardIsSpBp4004Sumire(mc.card_no)
        ? sumireCenterDoubleBatonPreviewCost(memberInst)
        : effectiveStageAppearPrintedCost(memberInst, incumbent);
    return cost <= upright;
  }

  /** ステージ／ライブ上メンバーから ALL調整(slot7) の合計（任意ハート計算へ） */
  function wildcardBoardBumpFromMembers() {
    var w = 0;
    ["left", "center", "right"].forEach(function (k) {
      state.stage[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        w += memberPlayBonusAllWildcardBump(inst);
        if (inst._baseHeartsWildcardUntilLiveEnd === true) {
          w += memberTotalPrintedHearts(inst);
        }
      });
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        w += memberPlayBonusAllWildcardBump(inst);
        if (inst._baseHeartsWildcardUntilLiveEnd === true) {
          w += memberTotalPrintedHearts(inst);
        }
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
        if (inst._baseHeartsWildcardUntilLiveEnd === true) return;
        addBaseHeartToSlotAccum(mergedCatalogCard(inst), acc);
        addMemberPlayBonusSolidHearts(inst, acc);
      });
      state.liveArea[k].forEach(function (inst) {
        if (inst.type !== T_MEMBER) return;
        ensureCardBoardFields(inst);
        if (inst._baseHeartsWildcardUntilLiveEnd === true) return;
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
    var raw = Math.floor(s);
    var reduction = liveStartBladeReductionFromAbilities();
    return Math.max(0, raw - reduction);
  }

  /** ステージ＋ライブ枠のメンバー blade 合計（盤面・シミュの捲り枚数 k に使用） */
  /**
   * カード固有のライブ開始時効果による「エールで公開する自分のカード」枚数の減算。
   *
   * 現在登録:
   *   - PL!SP-bp2-010 ウィーン・マルガレーテ
   *     条件: 自身がステージにいて、かつステージに別のメンバーが 1 体以上いる。
   *           インスタンスに `_abilityDisabledThisTurn === true` が立っている場合は無効。
   *     効果: ライブ開始時〜ライブ終了までエール -8。
   *
   * 「ライブ開始時に適用」なので `state.liveStatsAfterBegin === true` のときだけ働く。
   */
  function liveStartBladeReductionFromAbilities() {
    if (!state.liveStatsAfterBegin) return 0;
    var reduction = 0;
    ["left", "center", "right"].forEach(function (k) {
      (state.stage[k] || []).forEach(function (c) {
        if (!c || c.type !== T_MEMBER) return;
        if (c._abilityDisabledThisTurn === true) return;
        var r = Math.max(0, Math.floor(Number(c._liveSessionYellRevealReduction) || 0));
        if (r > 0) reduction += r;
      });
      (state.liveArea[k] || []).forEach(function (c) {
        if (!c || c.type !== T_MEMBER) return;
        if (c._abilityDisabledThisTurn === true) return;
        var r2 = Math.max(0, Math.floor(Number(c._liveSessionYellRevealReduction) || 0));
        if (r2 > 0) reduction += r2;
      });
    });
    return reduction;
  }

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
    var raw = Math.floor(s);
    var reduction = liveStartBladeReductionFromAbilities();
    return Math.max(0, raw - reduction);
  }

  /** 「公開可能枚数」を求める内訳付き版（HUD やヒントから参照可） */
  function sumBoardMemberBladesWithBreakdown() {
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
    var raw = Math.floor(s);
    var reduction = liveStartBladeReductionFromAbilities();
    return { raw: raw, reduction: reduction, effective: Math.max(0, raw - reduction) };
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

  function isVersusPerfPhaseNoLiveInFrames() {
    if (!versusOnlineActive() || !versusSession.remoteMatch) return false;
    if (getVersusLiveStep(versusSession.remoteMatch) !== "perf") return false;
    return liveLiveCardsInFramesOnly() === 0;
  }

  function syncPerfNoLivePlaceholders() {
    document.querySelectorAll(".live-slot-no-live-placeholder").forEach(function (el) {
      el.remove();
    });
    if (!isVersusPerfPhaseNoLiveInFrames()) return;
    var center = $("live-center");
    if (!center) return;
    var ph = document.createElement("div");
    ph.className = "live-slot-no-live-placeholder";
    ph.textContent = "ライブなし";
    ph.setAttribute("aria-live", "polite");
    center.appendChild(ph);
  }

  /** ライブ枠内のライブカードの打点合計（印刷スコアのみ） */
  function liveInstScoreBonus(inst) {
    if (!inst) return 0;
    ensureCardBoardFields(inst);
    return Math.max(0, Math.floor(Number(inst.playBonusLiveScore) || 0));
  }

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
        baseSum += liveInstScoreBonus(inst);
      });
    });
    return { baseSum: baseSum };
  }

  function bumpLiveScoreEffectBonus(delta, toastMsg) {
    var add = Math.floor(Number(delta) || 0);
    if (!add) return;
    state.liveScoreEffectBonus = Math.max(
      -99,
      Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0) + add),
    );
    try {
      syncLiveCenterScoreBar(getRenderPassLiveBundle());
    } catch (_) {}
    if (toastMsg) showToast(toastMsg);
  }

  function sumLiveTotalScorePlusFromJoujiSegments(segments) {
    var total = 0;
    (segments || []).forEach(function (seg) {
      total += parseLiveTotalScorePlusFromText(String(seg || "").replace(/\{\{[^}]+\}\}/g, ""));
    });
    return total;
  }

  function instIsLiveCard(inst) {
    return !!(inst && (inst.type === T_LIVE || mergedCatalogCard(inst).type === T_LIVE));
  }

  function applyLiveCardScorePlus(inst, amount, toastMsg) {
    var add = Math.max(0, Math.floor(Number(amount) || 0));
    if (!inst || add < 1) return;
    ensureCardBoardFields(inst);
    inst.playBonusLiveScore = liveInstScoreBonus(inst) + add;
    try {
      syncLiveCenterScoreBar(getRenderPassLiveBundle());
    } catch (_) {}
    render();
    if (toastMsg) showToast(toastMsg);
  }

  function soloOpponentHandCountForAbility() {
    var opp = Math.max(0, Math.floor(Number(state.soloOpponentHandCount) || 0));
    if (opp > 0) return opp;
    var inp = window.prompt("ソロ: 相手の手札枚数を入力してください", "0");
    opp = Math.max(0, Math.floor(Number(inp) || 0));
    state.soloOpponentHandCount = opp;
    return opp;
  }

  function allOwnEnergyCardsActive() {
    var arr = state.energyArea || [];
    if (!arr.length) return false;
    for (var ei = 0; ei < arr.length; ei++) {
      var en = arr[ei];
      if (!en) continue;
      if (en.lcWait === true || en.isRotated === true || en.energyWait === true) return false;
    }
    return true;
  }

  /** @param {import('./abilityEffects.js').ClassifiedAbility} cl @param {*} mc @param {string} kind */
  function centerSeriesMemberMovedThisTurn(seriesTag) {
    var centerSlot = state.stage.center || [];
    for (var ci = 0; ci < centerSlot.length; ci++) {
      var m = centerSlot[ci];
      if (!m || m.type !== T_MEMBER) continue;
      if (seriesTag && !catalogCardMatchesGroupTag(mergedCatalogCard(m), seriesTag)) continue;
      if (
        m._movedStageAreaThisTurn === true &&
        typeof m.stageTurnEntered === "number" &&
        m.stageTurnEntered === state.turnCount
      ) {
        return true;
      }
    }
    return false;
  }

  function instHasGrantedTrigger(inst, trigger) {
    if (!inst || !Array.isArray(inst._grantedTriggerSegmentRaws)) return false;
    for (var gi = 0; gi < inst._grantedTriggerSegmentRaws.length; gi++) {
      if (inst._grantedTriggerSegmentRaws[gi] && inst._grantedTriggerSegmentRaws[gi].trigger === trigger) {
        return true;
      }
    }
    return false;
  }

  function setMemberBladeTotalUntilLiveEnd(memberInst, targetTotal) {
    if (!memberInst || memberInst.type !== T_MEMBER) return;
    ensureCardBoardFields(memberInst);
    var printed = memberPrintedBladeCount(memberInst);
    var target = Math.max(0, Math.floor(Number(targetTotal) || 0));
    memberInst.playBonusBladeAlways = Math.max(0, target - printed);
    memberInst.playBonusBladeTurn = 0;
    memberInst.playBonusBlade = 0;
    showToast(
      (mergedCatalogCard(memberInst).name || "メンバー") + " のブレード数を " + target + " にしました（ライブ終了時まで）",
    );
  }

  function checkCardScorePlusPreconditions(cl, mc, kind) {
    if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) return false;
    if (kind === "live_success" && !checkAbilityLiveSuccessPreconditions(cl)) return false;
    if (cl.requiresAllEnergyActive && !allOwnEnergyCardsActive()) return false;
    if (cl.requiresCenterMemberMovedThisTurn) {
      var seriesTag = (cl.filters && cl.filters.seriesTag) || null;
      if (!centerSeriesMemberMovedThisTurn(seriesTag)) return false;
    }
    var p = abilityPlainText(mc);
    if (/手札.*相手より多い/.test(p)) {
      if (state.hand.length <= soloOpponentHandCountForAbility()) return false;
    }
    if (/成功ライブカード置き場.*相手より少ない/.test(p)) {
      var ownSl = successLiveAreaLiveCardCount();
      var oppSl = Math.max(0, Math.floor(Number(state.soloOpponentSuccessLiveCount) || 0));
      if (oppSl <= 0) {
        var slInp = window.prompt("ソロ: 相手の成功ライブカード置き場の枚数", "0");
        oppSl = Math.max(0, Math.floor(Number(slInp) || 0));
        state.soloOpponentSuccessLiveCount = oppSl;
      }
      if (ownSl >= oppSl) return false;
    }
    if (/デッキがリフレッシュしていた/.test(p) && !state.deckRefreshedThisTurn) return false;
    return true;
  }

  function countEaleNoteLiveScorePoints() {
    return Math.max(0, Math.floor(Number(state.ealeNoteLiveScorePoints) || 0));
  }

  function memberCatalogHasHeartSlot(mc, slotNum) {
    if (!mc || mc.type !== T_MEMBER || slotNum == null) return false;
    var slot = Math.floor(Number(slotNum));
    if (!(slot >= 1 && slot <= 6)) return false;
    var key = "heart0" + (slot < 10 ? slot : String(slot));
    if (slot === 1) key = "heart01";
    var bh = mc.base_heart;
    if (bh && Number(bh[key]) > 0) return true;
    var bkey = "b_heart0" + (slot < 10 ? slot : String(slot));
    if (slot === 1) bkey = "b_heart01";
    var blh = mc.blade_heart;
    return !!(blh && Number(blh[bkey]) > 0);
  }

  function liveCatalogRequiresHeartSlot(cat, slotNum) {
    if (!cat || cat.type !== T_LIVE || slotNum == null) return false;
    var slot = Math.floor(Number(slotNum));
    if (!(slot >= 1 && slot <= 6)) return false;
    var need = cat.need_heart;
    if (!need || typeof need !== "object") return false;
    var key = slot === 1 ? "heart01" : "heart0" + slot;
    return Number(need[key]) > 0;
  }

  function registerScoreYellForLiveTotal(inst) {
    if (!inst) return;
    var cat = mergedCatalogCard(inst);
    var pts = catalogEaleScoreHeartPoints(cat);
    if (pts <= 0) return;
    if (!(state.liveStatsAfterBegin === true || state.playLiveYellStarted === true)) return;
    if (!Array.isArray(state.ealeNoteLiveHitIds)) state.ealeNoteLiveHitIds = [];
    if (state.ealeNoteLiveHitIds.indexOf(inst.id) >= 0) return;
    state.ealeNoteLiveHitIds.push(inst.id);
    state.ealeNoteLiveScorePoints =
      Math.max(0, Math.floor(Number(state.ealeNoteLiveScorePoints) || 0)) + pts;
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
    var manualBonus = Math.max(-99, Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0)));
    var joujiBonus = Math.max(-99, Math.min(99, Math.floor(Number(state.joujiLiveScoreBonus) || 0)));
    var bonus = manualBonus + joujiBonus;
    var ealeNotePts = ok ? countEaleNoteLiveScorePoints() : 0;
    var framePlusBonus = parts.baseSum + bonus;
    var total = ok ? framePlusBonus + ealeNotePts : 0;
    return {
      ok: ok,
      total: total,
      baseSum: parts.baseSum,
      framePlusBonus: framePlusBonus,
      notePts: ealeNotePts,
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

    var bund = b || getRenderPassLiveBundle();
    var vp = liveVerdictScorePoints(bund);
    bar.hidden = false;
    numEl.textContent = String(vp.hasMech ? (vp.ok ? vp.framePlusBonus : vp.total) : 0);
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
      var pendingScoreHearts = countEaleNoteLiveScorePoints();
      if (pendingScoreHearts > 0) {
        noteWrap.hidden = false;
        noteSuf.className = "live-score-center-bar__note live-score-note-pink";
        noteSuf.title =
          "エールでめくったスコア特殊ハート（成功時のみ最終スコアに＋" +
          String(pendingScoreHearts) +
          "）";
        noteSuf.innerHTML =
          '<span class="live-score-center-bar__note-plus">＋</span><span class="live-score-center-bar__note-plus-val">' +
          String(pendingScoreHearts) +
          '</span><span class="live-score-center-bar__note-icon" aria-hidden="true">' +
          boardYellFloatIconHtml("score") +
          "</span>";
      } else {
        noteWrap.hidden = true;
        noteSuf.textContent = "";
        noteSuf.className = "live-score-center-bar__note live-score-note-pink";
        noteSuf.title = "";
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

  /**
   * `formatLiveNeedHeartLine` の HTML 版。色見出しを loveca-data-1 のアイコン PNG で表現する。
   */
  function formatLiveNeedHeartLineHtml(accum) {
    var hasColors = false;
    for (var s = 1; s <= 7; s++) {
      if (accum[s] && accum[s] > 0) { hasColors = true; break; }
    }
    if (accum[99] && accum[99] > 0) hasColors = true;
    var bits = [];
    if (hasColors) bits.push(formatHeartSlotAccumBreakdownHtml(accum));
    if (accum[0] && accum[0] > 0) {
      bits.push(
        '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--any">' +
        heartSlotArtIconHtml(0) +
        '<span class="heart-slot-breakdown-num">' + accum[0] + '</span></span>',
      );
    }
    if (accum[99] && accum[99] > 0) {
      bits.push(
        '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--other-need">' +
        '<span class="heart-slot-breakdown-num-label">その他キー必要</span>' +
        '<span class="heart-slot-breakdown-num">' + accum[99] + '</span></span>',
      );
    }
    return bits.length
      ? '<span class="live-stats-heart-line">' + bits.join('<span class="live-stats-heart-sep"> ・ </span>') + '</span>'
      : '<span class="live-stats-heart-line live-stats-heart-line--empty">—</span>';
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
    /** 解決 BH ALL ＋ 場メンバーの play ALL（有色不足の代用にも使う） */
    var wildcardHeartBump = wildcardBoardBumpFromMembers();
    var wildcardBhAllFlex = (bhFromRes.wildcardBumpFromBh || 0) + wildcardHeartBump;

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
      wildcardAllBump: 0,
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
      return monteCarloLiveSuccessAfterK(poolBase, poolDeltas, poolN, poolK, monteCarloLiveSuccessSamples(), rng);
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
      return sim.ok ? "判定：成功（エールを全てめくりました）" : "判定：失敗（エールを全てめくりました）";
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
    var tail = "（エールを全てめくりました）";
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
    var b = getRenderPassLiveBundle();
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
    if (isFullVersusPlayUi()) {
      cancelDeckLiveSimDeferred();
      clearDeckLiveSimDesktopToolbarMirror();
      var liveSimWrapSkip = root.querySelector(".zone-block-deck-live-sim-under-preview");
      if (liveSimWrapSkip) liveSimWrapSkip.hidden = true;
      return;
    }
    var liveSimWrap = root.querySelector(".zone-block-deck-live-sim-under-preview");
    if (liveSimWrap) liveSimWrap.hidden = false;
    var versusLiveProbForce =
      versusMatchPhaseActive() &&
      versusSession.remoteMatch &&
      isVersusLivePhase(versusSession.remoteMatch) &&
      (state.liveStatsAfterBegin === true || getVersusLiveStep(versusSession.remoteMatch) === "perf");
    var liveProbRelevant = liveCardCountOnBoard() > 0;
    if (!liveProbRelevant && !versusLiveProbForce) {
      cancelDeckLiveSimDeferred();
      var sumEmpty = $("deck-live-sim-summary");
      var stEmpty = $("deck-live-sim-stats");
      if (sumEmpty) {
        sumEmpty.classList.remove("is-ok", "is-warn", "is-fail", "has-prob-color", "deck-live-sim-summary--verdict");
        sumEmpty.classList.add("is-muted");
        setOddsRichText(sumEmpty, "成功確率：—（場にライブカードがありません）", { heroLiveSim: true });
      }
      if (stEmpty) {
        stEmpty.hidden = true;
        stEmpty.textContent = "";
      }
      clearDeckLiveSimDesktopToolbarMirror();
      return;
    }

    var disp = $("deck-flip-k-display");
    var bladeNoteEl = $("deck-flip-blade-note");
    var sumEl = $("deck-live-sim-summary");
    var stEl = $("deck-live-sim-stats");
    var modeSel = $("deck-live-sim-mode");
    if (!disp || !sumEl) {
      clearDeckLiveSimDesktopToolbarMirror();
      return;
    }
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
    if (state.liveTurnPickMode === true && !versusLiveProbForce) {
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
      mirrorDeckLiveSimDesktopToolbarFromSrc(sumEl);
      return;
    }

    if (isLightweightPlayMode()) {
      sumEl.classList.remove("is-ok", "is-warn", "is-fail", "has-prob-color", "deck-live-sim-summary--verdict");
      sumEl.classList.add("is-muted");
      setOddsRichText(sumEl, "成功確率：—（軽量モードでは詳細計算を省略）", { heroLiveSim: true });
      syncDeckLiveSimSummaryPctEmphasisClass(sumEl);
      var bdLw = $("deck-live-sim-breakdown-body");
      if (bdLw) bdLw.textContent = "";
      if (stEl) {
        stEl.hidden = true;
        stEl.textContent = "";
      }
      mirrorDeckLiveSimDesktopToolbarFromSrc(sumEl);
      return;
    }

    if (typeof requestIdleCallback === "function") {
      deckLiveSimIdleHandle = requestIdleCallback(runDeckLiveSimHeavy, { timeout: isLightweightPlayMode() ? 1200 : 600 });
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
          if (cardCannotPlaceOnSuccessLive(mergedCatalogCard(c))) {
            state.waitingRoom.push(c);
            showToast((mergedCatalogCard(c).name || "ライブ") + " は成功ライブカード置き場に置けないため控え室へ送りました");
          } else {
            state.successfulLiveArea.push(c);
            moved++;
          }
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
          if (cardCannotPlaceOnSuccessLive(mergedCatalogCard(c))) {
            state.waitingRoom.push(c);
            showToast((mergedCatalogCard(c).name || "ライブ") + " は成功ライブカード置き場に置けません");
          } else {
            state.successfulLiveArea.push(c);
            moved++;
          }
          slot.splice(i, 1);
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
    list.innerHTML = "";
    pend.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "ライブ")).trim();
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "pickSuccLive";
      radio.value = String(c.id);
      radio.className = "dlg-pick-kidou-waiting__radio";
      if (i === 0) radio.checked = true;
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      img.loading = "lazy";
      img.decoding = "async";
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      labEl.appendChild(radio);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      list.appendChild(labEl);
    });
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

  /**
   * `formatStageHeartMinusNeedRemainderLine` の HTML 版。色ラベルを loveca-data-1 のアイコンで描画する。
   */
  function formatStageHeartMinusNeedRemainderLineHtml(stageHAcc, needAccum) {
    if (!needAccum || sumSlotAccumValues(needAccum) <= 0) return '<span class="live-stats-heart-line live-stats-heart-line--empty">—</span>';
    var stAcc = stageHAcc || {};
    var items = [];
    for (var s = 1; s <= 6; s++) {
      var nd = needAccum[s] || 0;
      if (nd <= 0) continue;
      var st = stAcc[s] || 0;
      var rem = st - nd;
      if (rem >= 0) continue;
      items.push(
        '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--deficit heart-slot-breakdown-item--s' + s + '">' +
        heartSlotArtIconHtml(s) +
        '<span class="heart-slot-breakdown-num-label">不足</span>' +
        '<span class="heart-slot-breakdown-num">' + Math.abs(rem) + '</span></span>',
      );
    }
    var nd99 = needAccum[99] || 0;
    if (nd99 > 0) {
      var st99 = stAcc[99] || 0;
      var rem99 = st99 - nd99;
      if (rem99 < 0) {
        items.push(
          '<span class="heart-slot-breakdown-item heart-slot-breakdown-item--deficit heart-slot-breakdown-item--other">' +
          '<span class="heart-slot-breakdown-num-label">その他キー 不足</span>' +
          '<span class="heart-slot-breakdown-num">' + Math.abs(rem99) + '</span></span>',
        );
      }
    }
    return items.length
      ? '<span class="live-stats-heart-line">' + items.join('<span class="live-stats-heart-sep"> · </span>') + '</span>'
      : '<span class="live-stats-heart-line live-stats-required-colors--met">達成</span>';
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

    var b = getRenderPassLiveBundle();
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
    if (needDet) needDet.innerHTML = formatLiveNeedHeartLineHtml(needAccum);
    var needTot = $("live-need-heart-total");
    if (needTot) needTot.textContent = String(needSum);

    var reqCol = $("live-required-colors");
    if (reqCol) {
      var reqColLinePlain = formatStageHeartMinusNeedRemainderLine(b.mergedSupplyPreview, needAccum);
      reqCol.innerHTML = formatStageHeartMinusNeedRemainderLineHtml(b.mergedSupplyPreview, needAccum);
      reqCol.classList.toggle("live-stats-required-colors--met", reqColLinePlain === "達成");
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
    if (bladeTot) {
      var bladeAdj = Math.max(-99, Math.min(99, Math.floor(Number(state.liveBladeManualAdjust) || 0)));
      bladeTot.textContent = String(Math.max(0, Math.floor(Number(b.bladeSum) || 0) + bladeAdj));
    }

    var stEl = $("live-stage-h-colors");
    if (stEl) stEl.innerHTML = formatHeartSlotAccumBreakdownHtml(b.stageHAcc || {});

    var resBhEl = $("live-resolution-bh-ref");
    var resBhHint = $("live-zone-hint-resolution-bh");
    var bhLinePlain = formatBladeHeartSlotBreakdown(rsBh.slots || {});
    var hasSlotBreakdown = bhLinePlain && bhLinePlain !== "—";
    if (resBhEl) {
      if (hasSlotBreakdown) {
        resBhEl.classList.add("live-stats-metric-answer--rich");
        resBhEl.innerHTML = formatBladeHeartSlotBreakdownHtml(rsBh.slots || {});
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
    if (bonEl) {
      var manualB = Math.max(-99, Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0)));
      var joujiB = Math.max(-99, Math.min(99, Math.floor(Number(state.joujiLiveScoreBonus) || 0)));
      bonEl.textContent = joujiB ? String(manualB) + "＋常時" + String(joujiB) : String(manualB);
    }

    syncLiveCenterScoreBar(b);
  }

  /** 右下: 山札残りの BH 記載なし枚数・♪ライブ枚数・BH 色ごとの枚数 */
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
    var noteLive = 0;
    var drawYell = 0;
    /** @type {Record<number, number>} */
    var slotCount = {};
    for (var i = 0; i < n; i++) {
      var inst = state.deck[i];
      var cat = getCard(inst && inst.card_no);
      if (!cat) {
        nonBh++;
        continue;
      }
      if (cat.type === T_LIVE && cardIsNoteLiveCatalog(cat)) noteLive++;
      if (cat.type === T_LIVE && catalogLiveCardIsDrawYellBladeHeart(cat)) drawYell++;
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
        '<span class="deck-remain-bh-pill deck-remain-bh-pill--art" data-bh-slot="' +
          si +
          '"><span class="deck-remain-bh-pill__lab">' +
          heartSlotArtIconHtml(si, { extraClass: "deck-remain-bh-pill__art-ico" }) +
          '<span class="visually-hidden">' + escapeHtmlPlain(bladeHeartDisplaySlotLabel(si)) + '</span>' +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(cnt)) +
          "</strong></span>",
      );
    }
    var nonBhPill =
      '<span class="deck-remain-bh-pill deck-remain-bh-pill--nonbh" data-bh-slot="non">' +
      '<span class="deck-remain-bh-pill__lab">BHなし</span><strong class="deck-remain-bh-pill__n">' +
      escapeHtmlPlain(String(nonBh)) +
      "</strong></span>";
    var notePill =
      noteLive > 0
        ? '<span class="deck-remain-bh-pill deck-remain-bh-pill--note-live deck-remain-bh-pill--art" data-bh-slot="note" title="スコア（BHなしのライブ）枚数">' +
          '<span class="deck-remain-bh-pill__lab">' +
          heartSlotArtIconHtml(0, { score: true, extraClass: "deck-remain-bh-pill__art-ico" }) +
          '<span class="visually-hidden">スコア</span>' +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(noteLive)) +
          "</strong></span>"
        : "";
    var drawYellPill =
      drawYell > 0
        ? '<span class="deck-remain-bh-pill deck-remain-bh-pill--draw-yell deck-remain-bh-pill--art" data-bh-slot="draw-yell" title="ドロー（BH）を持つライブ枚数">' +
          '<span class="deck-remain-bh-pill__lab">' +
          heartSlotArtIconHtml(0, { draw_yell: true, extraClass: "deck-remain-bh-pill__art-ico" }) +
          '<span class="visually-hidden">ドロー</span>' +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(drawYell)) +
          "</strong></span>"
        : "";
    var bodyRow =
      '<div class="deck-remain-bh-pill-row">' + nonBhPill + notePill + drawYellPill + parts.join("") + "</div>";
    colorsHost.innerHTML = bodyRow;
    var deckRemHint = $("deck-remain-zone-hint");
    if (deckRemHint) {
      deckRemHint.textContent =
        "山札合計 " +
        n +
        " 枚。色ピルはカード1枚につき複数色を持てる集計です（BHなし＝BH未記載、スコア＝DBにBHが無いライブ、ドロー＝BH＋ドロー特殊）。";
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
    var noteLive = 0;
    var drawYell = 0;
    /** @type {Record<number, number>} */
    var slotCount = {};
    for (var wi = 0; wi < n; wi++) {
      var instW = state.waitingRoom[wi];
      var catW = getCard(instW && instW.card_no);
      if (!catW) {
        nonBh++;
        continue;
      }
      if (catW.type === T_LIVE && cardIsNoteLiveCatalog(catW)) noteLive++;
      if (catW.type === T_LIVE && catalogLiveCardIsDrawYellBladeHeart(catW)) drawYell++;
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
        '<span class="deck-remain-bh-pill deck-remain-bh-pill--art" data-bh-slot="' +
          sj +
          '"><span class="deck-remain-bh-pill__lab">' +
          heartSlotArtIconHtml(sj, { extraClass: "deck-remain-bh-pill__art-ico" }) +
          '<span class="visually-hidden">' + escapeHtmlPlain(bladeHeartDisplaySlotLabel(sj)) + '</span>' +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(cntW)) +
          "</strong></span>",
      );
    }
    var nonBhPillW =
      '<span class="deck-remain-bh-pill deck-remain-bh-pill--nonbh" data-bh-slot="non">' +
      '<span class="deck-remain-bh-pill__lab">BHなし</span><strong class="deck-remain-bh-pill__n">' +
      escapeHtmlPlain(String(nonBh)) +
      "</strong></span>";
    var notePillW =
      noteLive > 0
        ? '<span class="deck-remain-bh-pill deck-remain-bh-pill--note-live deck-remain-bh-pill--art" data-bh-slot="note" title="スコア（BHなしのライブ）枚数">' +
          '<span class="deck-remain-bh-pill__lab">' +
          heartSlotArtIconHtml(0, { score: true, extraClass: "deck-remain-bh-pill__art-ico" }) +
          '<span class="visually-hidden">スコア</span>' +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(noteLive)) +
          "</strong></span>"
        : "";
    var drawYellPillW =
      drawYell > 0
        ? '<span class="deck-remain-bh-pill deck-remain-bh-pill--draw-yell deck-remain-bh-pill--art" data-bh-slot="draw-yell" title="ドロー（BH）を持つライブ枚数">' +
          '<span class="deck-remain-bh-pill__lab">' +
          heartSlotArtIconHtml(0, { draw_yell: true, extraClass: "deck-remain-bh-pill__art-ico" }) +
          '<span class="visually-hidden">ドロー</span>' +
          '</span><strong class="deck-remain-bh-pill__n">' +
          escapeHtmlPlain(String(drawYell)) +
          "</strong></span>"
        : "";
    var bodyRowW =
      '<div class="deck-remain-bh-pill-row">' + nonBhPillW + notePillW + drawYellPillW + partsW.join("") + "</div>";
    colorsHost.innerHTML = bodyRowW;
    var wh = $("waiting-remain-zone-hint");
    if (wh) {
      wh.textContent =
        "控え室合計 " +
        n +
        " 枚。色ピルはカード1枚につき複数色を持てる集計です（BHなし＝BH未記載、スコア＝DBにBHが無いライブ、ドロー＝BH＋ドロー特殊）。";
    }
  }

  /** 右上ミラー廃止: 左グリッド用ロジックのみ残す */
  function syncDeckPickClassicOddsPanel() {
    syncDeckRemainBhPanel();
    syncWaitingRemainBhPanel();
  }

  /**
   * 山札／控え室の残色ピル（`.deck-remain-bh-pill`）をクリックされたときに、
   * 該当ゾーンのカードのうちピルに対応するカードだけを一覧で見せるダイアログを開く。
   * @param {"deck"|"waiting"} zoneId
   * @param {string} slotKey "1"〜"7" / "non" / "note"
   */
  function openZoneBhListDialogFor(zoneId, slotKey) {
    var dlg = document.getElementById("dlg-zone-bh-list");
    var title = document.getElementById("dlg-zone-bh-list-title");
    var lead = document.getElementById("dlg-zone-bh-list-lead");
    var body = document.getElementById("dlg-zone-bh-list-body");
    if (!dlg || !body || typeof dlg.showModal !== "function") return;
    var zoneLabel = zoneId === "waiting" ? "控え室" : "山札";
    var source = zoneId === "waiting" ? state.waitingRoom : state.deck;
    var slotLabel = "";
    /** @type {(c: any) => boolean} */
    var pred;
    if (slotKey === "non") {
      slotLabel = "BHなし";
      pred = function (cat) { return !cardHasBladeHeart(cat); };
    } else if (slotKey === "note") {
      slotLabel = "スコア";
      pred = function (cat) { return cat && cat.type === T_LIVE && cardIsNoteLiveCatalog(cat); };
    } else if (slotKey === "draw-yell") {
      slotLabel = "ドロー";
      pred = function (cat) { return cat && cat.type === T_LIVE && catalogLiveCardIsDrawYellBladeHeart(cat); };
    } else {
      var slotNum = Number(slotKey);
      if (!Number.isFinite(slotNum) || slotNum < 1 || slotNum > 7) return;
      slotLabel = bladeHeartDisplaySlotLabel(slotNum);
      pred = function (cat) {
        if (!cat || !cardHasBladeHeart(cat)) return false;
        return bladeHeartSlotsOnCard(cat).has(slotNum);
      };
    }
    /** カードリスト: 該当カードのみ抽出（実体順、重複は集約して枚数表示） */
    /** @type {Map<string, { card: any, count: number }>} */
    var byNo = new Map();
    for (var i = 0; i < source.length; i++) {
      var inst = source[i];
      var cat = getCard(inst && inst.card_no);
      if (!cat) continue;
      if (!pred(cat)) continue;
      var key = String(cat.card_no || ("inst-" + i));
      var rec = byNo.get(key);
      if (rec) rec.count += 1;
      else byNo.set(key, { card: cat, count: 1 });
    }
    if (title) title.textContent = zoneLabel + " — " + slotLabel + " のカード";
    var totalCt = 0;
    byNo.forEach(function (r) { totalCt += r.count; });
    if (lead) {
      lead.textContent =
        zoneLabel + "の中で " + slotLabel + " に該当するカードは " + totalCt + " 枚（種類 " + byNo.size + "）です。";
    }
    body.innerHTML = "";
    if (!byNo.size) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.style.margin = "0.5rem 0";
      empty.textContent = "該当カードはありません。";
      body.appendChild(empty);
    } else {
      var grid = document.createElement("div");
      grid.className = "dlg-zone-bh-list__grid";
      var entries = [...byNo.values()];
      entries.sort(function (a, b) {
        var an = String(a.card.card_no || "");
        var bn = String(b.card.card_no || "");
        return an.localeCompare(bn, "ja");
      });
      entries.forEach(function (rec) {
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "dlg-zone-bh-list__tile";
        tile.setAttribute("data-card-no", String(rec.card.card_no || ""));
        var img = document.createElement("img");
        img.className = "dlg-zone-bh-list__img";
        img.alt = rec.card.name || rec.card.card_no || "";
        img.loading = "lazy";
        img.decoding = "async";
        img.draggable = false;
        img.src = rec.card.img || "";
        tile.appendChild(img);
        var qty = document.createElement("span");
        qty.className = "dlg-zone-bh-list__qty";
        qty.textContent = "×" + rec.count;
        tile.appendChild(qty);
        var lab = document.createElement("span");
        lab.className = "dlg-zone-bh-list__label";
        lab.textContent = (rec.card.name || rec.card.card_no || "").toString();
        tile.appendChild(lab);
        tile.addEventListener("click", function () {
          try {
            dlg.close();
          } catch (_) {
            /* noop */
          }
          try {
            openCardCatalogDialog(rec.card);
          } catch (_) {
            /* noop */
          }
        });
        grid.appendChild(tile);
      });
      body.appendChild(grid);
    }
    try {
      dlg.showModal();
    } catch (_) {
      /* noop */
    }
  }

  zoneBhListOpener = function (zoneId, slotKey) {
    openZoneBhListDialogFor(zoneId, slotKey);
  };
  bindZoneBhPillClickDelegationOnce();

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
    if (isFullVersusPlayUi()) return;
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
      registerScoreYellForLiveTotal(c);
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
    try {
      fireJidouAutoYellAll();
    } catch (jErr) {
      console.warn(jErr);
    }
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

      var onpuLive = lives.filter(function (c) {
        return cardIsNoteLiveCatalog(bhModel(c));
      });
      var drawYellLive = lives.filter(function (c) {
        return cardIsDrawYellLiveCatalog(bhModel(c));
      });
      appendBlock("スコア（DBにBHなし）", [
        "枚数: " + onpuLive.length,
        "種類内訳: " + (summarizeWaitingCardTypes(onpuLive) || "—"),
      ]);
      appendBlock("ドロー（BH＋ドロー特殊）", [
        "枚数: " + drawYellLive.length,
        "種類内訳: " + (summarizeWaitingCardTypes(drawYellLive) || "—"),
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
    state.deckRefreshedThisTurn = true;
    showToast("リフレッシュが入りました");
    openWaitingRefreshSummaryDialog(pool);
    return true;
  }

  function tryReplenishDeckFromWaitingLoop() {
    while (state.deck.length === 0 && state.waitingRoom.length > 0) {
      tryReplenishDeckFromWaitingOnce();
    }
  }

  /**
   * 山札上から条件に合うカードが出るまで公開（リフレッシュ対応）。
   * @param {(inst: any, mc: any) => boolean} matchFn
   * @param {(matched: any | null, others: any[]) => void} onDone
   */
  function runDeckRevealUntilMatch(matchFn, onDone) {
    /** @type {any[]} */
    var revealed = [];
    function step() {
      if (!state.deck.length) tryReplenishDeckFromWaitingLoop();
      if (!state.deck.length) {
        onDone(null, revealed);
        return;
      }
      var card = state.deck.shift();
      revealed.push(card);
      var mc = mergedCatalogCard(card);
      if (matchFn(card, mc)) {
        var others = revealed.filter(function (c) {
          return c !== card;
        });
        onDone(card, others);
        return;
      }
      step();
    }
    step();
  }

  function stageColumnMemberForPlayer(col, isOpponent) {
    if (isOpponent && isDualOpponentBoardMode()) {
      return readInactiveOpponentBoard(function () {
        return stageColumnMemberForPlayer(col, false);
      });
    }
    var slot = state.stage[col] || [];
    for (var i = slot.length - 1; i >= 0; i--) {
      var m = slot[i];
      if (!m || m.type !== T_MEMBER) continue;
      var proxy = m._soloOpponentProxy === true;
      if (isOpponent ? proxy : !proxy) return m;
    }
    return null;
  }

  function removeMemberInstFromStageColumn(mem) {
    if (!mem) return false;
    var col = stageColumnKeyHostingMember(mem.id);
    if (!col) return false;
    var slot = state.stage[col] || [];
    for (var i = 0; i < slot.length; i++) {
      if (slot[i] && String(slot[i].id) === String(mem.id)) {
        slot.splice(i, 1);
        clearToujouEffectStateOnLeaveStage(mem);
        return true;
      }
    }
    return false;
  }

  function placeMemberOnColumnKeepingEnergy(col, mem) {
    if (!mem || !col) return;
    if (!state.stage[col]) state.stage[col] = [];
    var energies = (state.stage[col] || []).filter(function (c) {
      return c && c.type === T_ENERGY;
    });
    state.stage[col] = energies.concat([mem]);
  }

  function rotateStageAreasClockwiseForPlayer(isOpponent) {
    if (isOpponent && isDualOpponentBoardMode()) {
      mutateInactiveOpponentBoard(function () {
        rotateStageAreasClockwiseForPlayer(false);
      });
      return;
    }
    var leftM = stageColumnMemberForPlayer("left", isOpponent);
    var centerM = stageColumnMemberForPlayer("center", isOpponent);
    var rightM = stageColumnMemberForPlayer("right", isOpponent);
    if (!leftM && !centerM && !rightM) return;
    if (leftM) removeMemberInstFromStageColumn(leftM);
    if (centerM) removeMemberInstFromStageColumn(centerM);
    if (rightM) removeMemberInstFromStageColumn(rightM);
    if (centerM) placeMemberOnColumnKeepingEnergy("left", centerM);
    if (leftM) placeMemberOnColumnKeepingEnergy("right", leftM);
    if (rightM) placeMemberOnColumnKeepingEnergy("center", rightM);
  }

  function stageHasOnlyUnitTag(unitTag, ownOnly) {
    if (!unitTag) return false;
    var mems = eachStageColumnMemberInsts().filter(function (m) {
      if (!m) return false;
      if (ownOnly && m._soloOpponentProxy === true) return false;
      return true;
    });
    if (!mems.length) return false;
    for (var i = 0; i < mems.length; i++) {
      if (!catalogCardMatchesGroupTag(mergedCatalogCard(mems[i]), unitTag)) return false;
    }
    return true;
  }

  function placeEnergyUnderStageMember(memberInst, energyInst) {
    if (!memberInst || !energyInst) return false;
    var col = stageColumnKeyHostingMember(memberInst.id);
    if (!col) return false;
    var ei = state.energyArea.findIndex(function (e) {
      return e && String(e.id) === String(energyInst.id);
    });
    if (ei < 0) return false;
    var en = state.energyArea.splice(ei, 1)[0];
    en.isRotated = false;
    en.lcWait = false;
    en.lcActive = true;
    var arr = state.stage[col] || [];
    var hostIdx = -1;
    for (var hi = 0; hi < arr.length; hi++) {
      if (arr[hi] && String(arr[hi].id) === String(memberInst.id)) {
        hostIdx = hi;
        break;
      }
    }
    if (hostIdx < 0) {
      state.energyArea.splice(ei, 0, en);
      return false;
    }
    arr.splice(hostIdx, 0, en);
    state.stage[col] = arr;
    return true;
  }

  function openPickWaitingOptionalMulti(leadText, filterFn, onDone, dialogOpts) {
    var pool = (state.waitingRoom || []).filter(function (c) {
      return c && (!filterFn || filterFn(c));
    });
    if (!pool.length) {
      onDone([]);
      return;
    }
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    if (!dlg || !list || !btnOk) {
      onDone([]);
      return;
    }
    var prevOkLabel = btnOk.textContent;
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    if (dialogOpts && typeof dialogOpts.okLabel === "string" && dialogOpts.okLabel) {
      btnOk.textContent = dialogOpts.okLabel;
    }
    if (dialogOpts && typeof dialogOpts.dialogTitle === "string" && dialogOpts.dialogTitle && dlgTitle) {
      dlgTitle.textContent = dialogOpts.dialogTitle;
    }
    if (lead) lead.textContent = leadText;
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    pool.forEach(function (c) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || "")).trim();
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "pickWaitOptionalMulti";
      cb.value = String(c.id);
      cb.className = "dlg-pick-kidou-waiting__radio";
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      labEl.appendChild(cb);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      grid.appendChild(labEl);
    });
    list.appendChild(grid);

    function cleanup() {
      btnOk.textContent = prevOkLabel || "選択した1枚を手札に加える";
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || "回収対象カード — 1枚を手札に加える";
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var checked = list.querySelectorAll('input[name="pickWaitOptionalMulti"]:checked');
      var ids = [];
      for (var i = 0; i < checked.length; i++) ids.push(String(checked[i].value));
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(ids);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
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
      ealeNoteLiveScorePoints: Math.max(0, Math.floor(Number(state.ealeNoteLiveScorePoints) || 0)),
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
  function flushPersistPlayResumeNow() {
    if (playResumePersistTimer) {
      clearTimeout(playResumePersistTimer);
      playResumePersistTimer = 0;
    }
    if (state.playVersusMode && (!versusSession || versusSession.mode !== "online")) return;
    try {
      var fpLive = fingerprintZonesFromLive();
      if (fpLive === playResumeLastFp) return;
      playResumeLastFp = fpLive;
      var fpSel = $("select-first-player");
      var payload = {
        v: 1,
        board: snapshotBoard(),
        uid: uid,
        firstPlayer: fpSel && fpSel.value != null ? String(fpSel.value) : "",
      };
      if (versusSession && versusSession.mode === "online") {
        payload.versusOnline = {
          roomCode: versusSession.roomCode,
          myRole: versusSession.myRole,
        };
        persistVersusOnlineSession(versusSession.roomCode, versusSession.myRole, true);
      }
      sessionStorage.setItem(STORAGE_PLAY_RESUME, JSON.stringify(payload));
    } catch (_e) {
      /* QuotaExceeded or session blocked */
    }
  }

  function schedulePersistPlayResume() {
    if (versusBootstrapping) return;
    if (state.playVersusMode && (!versusSession || versusSession.mode !== "online")) return;
    if (playResumePersistTimer) clearTimeout(playResumePersistTimer);
    playResumePersistTimer = setTimeout(function () {
      playResumePersistTimer = 0;
      flushPersistPlayResumeNow();
    }, 600);
  }

  window.__llocgFlushVersusPlayPersist = flushPersistPlayResumeNow;

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
      ealeNoteLiveScorePoints: state.ealeNoteLiveScorePoints,
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
    state.ealeNoteLiveScorePoints =
      typeof s.ealeNoteLiveScorePoints === "number" && Number.isFinite(s.ealeNoteLiveScorePoints)
        ? Math.max(0, Math.floor(s.ealeNoteLiveScorePoints))
        : 0;
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
    state.joujiLiveScoreBonus =
      typeof s.joujiLiveScoreBonus === "number" && Number.isFinite(s.joujiLiveScoreBonus)
        ? Math.max(-99, Math.min(99, Math.floor(s.joujiLiveScoreBonus)))
        : state.joujiLiveScoreBonus;
    state.soloOpponentSuccessLiveCount = Math.max(
      0,
      Math.floor(Number(s.soloOpponentSuccessLiveCount) || state.soloOpponentSuccessLiveCount || 0),
    );
    try {
      syncJoujiPassiveEffectsAll();
    } catch (_) {}
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
      if (pool[i] && String(pool[i].id) === key) return pool[i];
    }
    return null;
  }

  /** @type {HTMLButtonElement | null} */
  var effectDialogResumeChip = null;
  /** @type {*} */
  var effectDialogPeekSourceInst = null;
  /** @type {(() => void) | null} */
  var effectDialogResumeChipReposition = null;
  /** dlg.close() による「場を見る」中は cancel ハンドラを無視 */
  var effectDialogSuppressCancel = false;

  var EFFECT_BOARD_PEEK_DIALOG_IDS = {
    "dlg-ability-guided": true,
    "dlg-pick-kidou-waiting": true,
    "dlg-cost-payment": true,
    "dlg-deck-look-reorder": true,
    "dlg-pick-ability-choice": true,
    "dlg-pick-effect-order": true,
    "dlg-pick-success-live": true,
  };

  function shouldIgnoreEffectDialogDismiss() {
    return effectDialogSuppressCancel || isEffectDialogBoardPeekActive();
  }

  function hideEffectDialogResumeChipOnDialogCleanup() {
    if (!isEffectDialogBoardPeekActive()) hideEffectDialogResumeChip();
  }

  /** @param {HTMLDialogElement | null} dlg */
  function dialogSupportsBoardPeek(dlg) {
    if (!dlg || !dlg.id) return false;
    if (dlg.querySelector("[data-dialog-view-board]")) return true;
    return EFFECT_BOARD_PEEK_DIALOG_IDS[dlg.id] === true;
  }

  function isEffectDialogBoardPeekActive() {
    return !!(effectDialogResumeChip && effectDialogResumeChip.parentNode);
  }

  function hideEffectDialogResumeChip(opts) {
    opts = opts || {};
    if (effectDialogResumeChipReposition) {
      window.removeEventListener("resize", effectDialogResumeChipReposition);
      window.removeEventListener("scroll", effectDialogResumeChipReposition, true);
      effectDialogResumeChipReposition = null;
    }
    clearEffectDialogPeekSourceHighlights();
    if (effectDialogResumeChip && effectDialogResumeChip.parentNode) {
      effectDialogResumeChip.parentNode.removeChild(effectDialogResumeChip);
    }
    effectDialogResumeChip = null;
    effectDialogPeekSourceInst = null;
    document.body.classList.remove("llocg-effect-dialog-peek");
    if (!opts.skipRender) render();
  }

  function blockPlayActionsDuringEffectDialogPeek() {
    return isEffectDialogBoardPeekActive();
  }

  function clearEffectDialogPeekSourceHighlights() {
    document.querySelectorAll(".card-item--effect-peek-source").forEach(function (el) {
      el.classList.remove("card-item--effect-peek-source");
    });
  }

  function markEffectDialogPeekSourceOnBoard() {
    clearEffectDialogPeekSourceHighlights();
    if (!effectDialogPeekSourceInst) return null;
    var anchor = pickCardDomElForInst(effectDialogPeekSourceInst);
    if (anchor) anchor.classList.add("card-item--effect-peek-source");
    return anchor;
  }

  function repositionEffectDialogResumeChip() {
    if (!effectDialogResumeChip) return;
    if (effectDialogResumeChip.parentNode !== document.body) {
      document.body.appendChild(effectDialogResumeChip);
    }
    var anchor = markEffectDialogPeekSourceOnBoard();
    if (anchor) {
      var r = anchor.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) {
        effectDialogResumeChip.classList.add("effect-dialog-resume-chip--on-card");
        effectDialogResumeChip.classList.remove("effect-dialog-resume-chip--corner");
        effectDialogResumeChip.style.position = "fixed";
        effectDialogResumeChip.style.left = String(r.left + r.width / 2) + "px";
        effectDialogResumeChip.style.top = String(r.top) + "px";
        effectDialogResumeChip.style.right = "auto";
        effectDialogResumeChip.style.bottom = "auto";
        effectDialogResumeChip.style.transform = "translate(-50%, calc(-100% - 10px))";
        effectDialogResumeChip.style.zIndex = "12065";
        return;
      }
    }
    effectDialogResumeChip.classList.remove("effect-dialog-resume-chip--on-card");
    effectDialogResumeChip.classList.add("effect-dialog-resume-chip--corner");
    effectDialogResumeChip.style.position = "";
    effectDialogResumeChip.style.left = "";
    effectDialogResumeChip.style.top = "";
    effectDialogResumeChip.style.right = "";
    effectDialogResumeChip.style.bottom = "";
    effectDialogResumeChip.style.transform = "";
    effectDialogResumeChip.style.zIndex = "";
  }

  /** @param {() => void} resumeFn @param {*} [sourceInst] */
  function showEffectDialogResumeChip(resumeFn, sourceInst) {
    hideEffectDialogResumeChip({ skipRender: true });
    if (sourceInst) effectDialogPeekSourceInst = sourceInst;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "effect-dialog-resume-chip";
    btn.className =
      "effect-dialog-resume-chip btn primary" +
      (sourceInst ? " effect-dialog-resume-chip--on-card" : " effect-dialog-resume-chip--corner");
    btn.textContent = "効果を続ける";
    btn.title = "中断していた効果ダイアログを再開します";
    btn.addEventListener("click", function () {
      hideEffectDialogResumeChip();
      resumeFn();
    });
    effectDialogResumeChip = btn;
    document.body.classList.add("llocg-effect-dialog-peek");
    document.body.appendChild(btn);
    render();
    function armResumeChipReposition() {
      repositionEffectDialogResumeChip();
      if (!effectDialogResumeChipReposition) {
        effectDialogResumeChipReposition = function () {
          repositionEffectDialogResumeChip();
        };
        window.addEventListener("resize", effectDialogResumeChipReposition);
        window.addEventListener("scroll", effectDialogResumeChipReposition, true);
      }
    }
    armResumeChipReposition();
    requestAnimationFrame(function () {
      requestAnimationFrame(armResumeChipReposition);
    });
    window.setTimeout(armResumeChipReposition, 50);
    window.setTimeout(armResumeChipReposition, 180);
  }

  /**
   * @param {HTMLElement | null} actionsEl
   * @param {HTMLDialogElement | null} dlg
   * @param {*} [sourceInst]
   */
  function ensureDialogViewBoardButton(actionsEl, dlg, sourceInst) {
    if (!actionsEl || !dlg || typeof dlg.showModal !== "function") return;
    if (actionsEl.querySelector("[data-dialog-view-board]")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn secondary";
    btn.setAttribute("data-dialog-view-board", "1");
    btn.textContent = "場を見る";
    btn.title = "ダイアログをいったん閉じて盤面を確認します（効果はキャンセルしません）";
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      peekBoardFromDialog(dlg, sourceInst);
    });
    var cancelBtn = actionsEl.querySelector(".btn.secondary");
    if (cancelBtn) actionsEl.insertBefore(btn, cancelBtn);
    else actionsEl.prepend(btn);
  }

  /** @param {HTMLDialogElement} dlg @param {*} [sourceInst] */
  function peekBoardFromDialog(dlg, sourceInst) {
    if (!dlg || typeof dlg.close !== "function") return;
    if (!dialogSupportsBoardPeek(dlg)) return;
    var peekInst = sourceInst || effectDialogPeekSourceInst;
    if (peekInst) effectDialogPeekSourceInst = peekInst;
    effectDialogSuppressCancel = true;
    try {
      dlg.close();
    } catch (_) {
      /* noop */
    }
    effectDialogSuppressCancel = false;
    showEffectDialogResumeChip(function () {
      try {
        dlg.showModal();
      } catch (_) {
        /* noop */
      }
    }, peekInst);
  }

  if (!window.__llocgEffectDialogCancelGuard) {
    window.__llocgEffectDialogCancelGuard = function (ev) {
      if (!effectDialogSuppressCancel) return;
      var t = ev.target;
      if (t && t.tagName === "DIALOG") {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    };
    document.addEventListener("cancel", window.__llocgEffectDialogCancelGuard, true);
  }

  window.__llocgPeekBoardFromDialog = peekBoardFromDialog;
  window.__llocgDialogSupportsBoardPeek = dialogSupportsBoardPeek;

  /** @param {*} inst */
  function soloOpponentMemberZoneLabel(inst) {
    if (isDualOpponentBoardMode()) {
      var dualSnap = getInactiveOpponentSnapshot();
      if (dualSnap) {
        var dualLabel = opponentMemberZoneLabelFromSnapshot(dualSnap, inst);
        if (dualLabel) return dualLabel;
      }
    }
    if (!inst || inst.id == null) return "";
    var id = String(inst.id);
    var cols = ["left", "center", "right"];
    for (var ci = 0; ci < cols.length; ci++) {
      var col = cols[ci];
      if (
        (state.stage[col] || []).some(function (c) {
          return c && String(c.id) === id;
        })
      ) {
        return col === "left" ? "ステージ・左" : col === "right" ? "ステージ・右" : "ステージ・センター";
      }
    }
    if (
      state.hand.some(function (c) {
        return c && String(c.id) === id;
      })
    ) {
      return "手札（相手想定）";
    }
    if (
      state.waitingRoom.some(function (c) {
        return c && String(c.id) === id;
      })
    ) {
      return "控え室（相手想定）";
    }
    return "";
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
      var appearCostOpts = { handSnap: snapBeforeDrag };
      var wanted =
        typeof inst._appearEnergyOverride === "number" && Number.isFinite(inst._appearEnergyOverride)
          ? Math.max(0, Math.floor(inst._appearEnergyOverride))
          : effectiveStageAppearPrintedCost(inst, prevMem, appearCostOpts);
      if (!(wanted > 0)) {
        if (typeof inst._appearEnergyOverride === "number") delete inst._appearEnergyOverride;
        return;
      }
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
      if (typeof inst._appearEnergyOverride === "number") delete inst._appearEnergyOverride;
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

  /**
   * PL!SP-bp2-001 が新たにステージに「登場」した時、ユーザーに「ウィーン・マルガレーテのライブ開始時効果を
   * 無効化しますか？」と確認し、「はい」ならステージ上の PL!SP-bp2-010 全てに `_abilityDisabledThisTurn = true` を
   * 立てる。フラグは「ターン開始」で全インスタンスから掃除される（このターン限定）。
   */
  function maybeHandleBp2001EntryPrompt(snapBeforeDrag) {
    if (!snapBeforeDrag || typeof snapBeforeDrag !== "object") return;
    const prev = stageMemberIdSetFromSnap(snapBeforeDrag);
    const now = stageMemberIdSetFromState();
    /** 今ステージにいて、かつ snap 時点ではいなかった = 「登場」したメンバー */
    var newlyEntered = [];
    now.forEach(function (id) {
      if (prev.has(id)) return;
      var inst = findCardInstById(id);
      if (inst && inst.type === T_MEMBER) newlyEntered.push(inst);
    });
    if (!newlyEntered.length) return;
    var entered001 = newlyEntered.find(function (c) {
      return catalogCardNosShareIdentity(c && c.card_no, "PL!SP-bp2-001");
    });
    if (!entered001) return;
    /* PL!SP-bp2-010 が現在ステージにいる場合のみ確認する意味があるので、いない場合は確認しない。 */
    var hasMargareteOnStage = false;
    ["left", "center", "right"].forEach(function (k) {
      (state.stage[k] || []).forEach(function (c) {
        if (c && c.type === T_MEMBER && catalogCardNosShareIdentity(c.card_no, "PL!SP-bp2-010"))
          hasMargareteOnStage = true;
      });
    });
    if (!hasMargareteOnStage) return;
    var ok = false;
    try {
      ok = window.confirm("PL!SP-bp2-001 が登場しました。\n「ウィーン・マルガレーテ」のライブ開始時効果（エール -8）を、このターンだけ無効化しますか？");
    } catch (_) {
      ok = false;
    }
    if (!ok) return;
    ["left", "center", "right"].forEach(function (k) {
      (state.stage[k] || []).forEach(function (c) {
        if (c && c.type === T_MEMBER && catalogCardNosShareIdentity(c.card_no, "PL!SP-bp2-010")) {
          c._abilityDisabledThisTurn = true;
        }
      });
    });
    logReplay("ability-disable-bp2-010-by-bp2-001", { sourceId: entered001.id });
    try { showToast("ウィーン・マルガレーテのライブ開始時効果をこのターン無効化しました"); } catch (_) { /* noop */ }
  }

  /** ターン開始時に「このターンだけ無効」フラグを全インスタンスから掃除 */
  function clearTurnScopedAbilityDisableFlags() {
    allZonesFlat().forEach(function (c) {
      if (c && c._abilityDisabledThisTurn) delete c._abilityDisabledThisTurn;
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
    if (c.type === T_MEMBER) c.isRotated = c.lcWait === true;

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

    if (c.playBonusLiveScore == null || !Number.isFinite(Number(c.playBonusLiveScore))) {
      c.playBonusLiveScore = 0;
    }
    c.playBonusLiveScore = Math.max(0, Math.floor(Number(c.playBonusLiveScore)));

    if (c.joujiBladeBonus == null || !Number.isFinite(Number(c.joujiBladeBonus))) c.joujiBladeBonus = 0;
    if (!c.joujiHeartSlots || typeof c.joujiHeartSlots !== "object" || Array.isArray(c.joujiHeartSlots)) {
      c.joujiHeartSlots = {};
    }
    if (c._joujiHandCostReduction == null || !Number.isFinite(Number(c._joujiHandCostReduction))) {
      c._joujiHandCostReduction = 0;
    }
    if (c._joujiStageCostDelta == null || !Number.isFinite(Number(c._joujiStageCostDelta))) {
      c._joujiStageCostDelta = 0;
    }
  }

  function normalizeAllCardFields() {
    allZonesFlat().forEach(ensureCardBoardFields);
    try {
      syncJoujiPassiveEffectsAll();
    } catch (_) {}
  }

  function snapshotVersusMatchForUndo() {
    var m = versusSession && versusSession.remoteMatch;
    if (!m || !versusMatchPhaseActive()) return null;
    return {
      versusPhase: normalizeVersusPhase(m),
      activePlayerRole:
        m.activePlayerRole === "host" || m.activePlayerRole === "guest"
          ? m.activePlayerRole
          : null,
      liveStep:
        m.liveStep === "set" ||
        m.liveStep === "perf" ||
        m.liveStep === "judgment" ||
        m.liveStep === "successFx"
          ? m.liveStep
          : null,
      turnNumber: Math.max(1, Math.floor(Number(m.turnNumber) || 1)),
      hostLiveSetDone: m.hostLiveSetDone === true,
      guestLiveSetDone: m.guestLiveSetDone === true,
      hostPerfDone: m.hostPerfDone === true,
      guestPerfDone: m.guestPerfDone === true,
      hostSuccessFxDone: m.hostSuccessFxDone === true,
      guestSuccessFxDone: m.guestSuccessFxDone === true,
      hostLivePerfScore: Number.isFinite(Number(m.hostLivePerfScore))
        ? Math.max(0, Math.floor(Number(m.hostLivePerfScore)))
        : null,
      guestLivePerfScore: Number.isFinite(Number(m.guestLivePerfScore))
        ? Math.max(0, Math.floor(Number(m.guestLivePerfScore)))
        : null,
      hostLiveVerdict:
        m.hostLiveVerdict === "success" || m.hostLiveVerdict === "fail"
          ? m.hostLiveVerdict
          : "none",
      guestLiveVerdict:
        m.guestLiveVerdict === "success" || m.guestLiveVerdict === "fail"
          ? m.guestLiveVerdict
          : "none",
      hostLiveHadCards: m.hostLiveHadCards === true,
      guestLiveHadCards: m.guestLiveHadCards === true,
      liveJudgmentOutcome:
        m.liveJudgmentOutcome === "hostWin" ||
        m.liveJudgmentOutcome === "guestWin" ||
        m.liveJudgmentOutcome === "draw"
          ? m.liveJudgmentOutcome
          : null,
      liveJudgmentSeq: Math.max(0, Math.floor(Number(m.liveJudgmentSeq) || 0)),
      hostOpeningMulliganDone: m.hostOpeningMulliganDone === true,
      guestOpeningMulliganDone: m.guestOpeningMulliganDone === true,
    };
  }

  function pushVersusMatchUndoSnap() {
    if (!versusMatchPhaseActive()) return;
    var snap = snapshotVersusMatchForUndo();
    if (!snap) return;
    versusMatchUndoStack.push(snap);
    while (versusMatchUndoStack.length > HISTORY_MAX_STEPS) versusMatchUndoStack.shift();
  }

  /** @param {Record<string, unknown>|null|undefined} snap @param {{ skipRoleSwitch?: boolean }} [opts] */
  function applyVersusMatchUndoSnap(snap, opts) {
    if (!snap || !versusSession) return;
    patchLocalVersusRemoteMatch(snap);
    var m = versusSession.remoteMatch;
    if (!m) return;
    applyVersusPhaseFromRemote(m);
    updateVersusTurnGlow(m);
    syncVersusMatchBar(m);
    syncVersusPhaseLiveBanner(m);
    syncVersusTurnStartButton(m);
    syncVersusLocalDualEndSwitchButton(m);
    if (opts && opts.skipRoleSwitch) return;
    if (versusLocalDualActive() && (snap.activePlayerRole === "host" || snap.activePlayerRole === "guest")) {
      switchVersusLocalDualToRole(snap.activePlayerRole, { preserveUndoStacks: true });
    } else if (versusLocalDualActive()) {
      forceVersusLocalDualBoardSwitchToActive();
    }
  }

  /**
   * @param {'host'|'guest'} next
   * @param {{ preserveUndoStacks?: boolean }} [opts]
   */
  function switchVersusLocalDualToRoleForUndo(next, opts) {
    if (!versusDualBoardActive() || state.versusMatchEnded) return;
    if (next !== "host" && next !== "guest") return;
    if (versusSession.activeRole === next) return;
    persistVersusLocalDualActiveBoard();
    versusSession.activeRole = next;
    versusSession.myRole = next;
    state.versusMyRole = next;
    versusSession.opponentName = versusLocalDualRoleLabel(versusLocalDualInactiveRole());
    if (!(opts && opts.preserveUndoStacks)) {
      undoHistory.length = 0;
      redoHistory.length = 0;
      versusMatchUndoStack.length = 0;
      versusMatchRedoStack.length = 0;
    }
    applyVersusLocalDualRoleMeta(next);
    versusOpponentBoardFp = "";
    syncVersusLocalDualChrome();
    if (versusLocalDualActive() && versusSession.remoteMatch) {
      syncVersusFirstPlayerSelect(versusSession.remoteMatch);
      syncVersusPhaseLiveBanner(versusSession.remoteMatch);
      syncVersusTurnStartButton(versusSession.remoteMatch);
      updateVersusTurnGlow(versusSession.remoteMatch);
    }
  }

  /** @param {Record<string, unknown>|null|undefined} beforeSnap @param {Record<string, unknown>|null|undefined} afterSnap */
  function versusMatchUndoCrossedBoundary(beforeSnap, afterSnap) {
    if (!beforeSnap || !afterSnap) return false;
    return (
      beforeSnap.activePlayerRole !== afterSnap.activePlayerRole ||
      beforeSnap.versusPhase !== afterSnap.versusPhase ||
      beforeSnap.liveStep !== afterSnap.liveStep ||
      beforeSnap.turnNumber !== afterSnap.turnNumber
    );
  }

  function syncVersusMatchUndoToRemote(snap) {
    if (!versusOnlineActive() || !versusSession.roomCode || !snap) return Promise.resolve();
    return rollbackVersusMatchState(versusSession.roomCode, snap).catch(function (err) {
      console.warn("[versus] match undo sync failed:", err);
      showToast("フェイズの同期に失敗しました: " + (err && err.message ? err.message : String(err)), {
        duration: 5000,
      });
    });
  }

  function pushHistoryBefore(act) {
    undoHistory.push(snapshotBoard());
    trimUndo();
    redoHistory.length = 0;
    versusMatchRedoStack.length = 0;
    pushVersusMatchUndoSnap();
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

  function cardNoIsBp1002(no) {
    return catalogCardNosShareIdentity(no, "PL!N-bp1-002-R") || /^PL!N-bp1-002-/i.test(String(no || ""));
  }

  function isPlayGlowExemptZone(zoneId) {
    return (
      zoneId === "zone-deck" ||
      zoneId === "zone-waiting" ||
      zoneId === "zone-preview" ||
      zoneId === "zone-resolution" ||
      zoneId === "zone-success-live" ||
      zoneId === "zone-energy"
    );
  }

  /** エールを全てめくり切り、ライブ成功判定が確定している */
  function playLiveSuccessVerdictReady() {
    if (state.liveStatsAfterBegin !== true) return false;
    try {
      var sim = computeDeckDrawLiveSuccessSimulation(deckLiveSimMode);
      if (!sim || sim.kind !== "verdict" || sim.ok !== true) return false;
      var kRem = sim.kRem != null ? Number(sim.kRem) : 0;
      return kRem <= 0;
    } catch (_) {
      return false;
    }
  }

  function playLiveSuccessJudgmentVisible() {
    return playLiveSuccessVerdictReady();
  }

  function liveSuccessVerdictFingerprint() {
    try {
      var sim = computeDeckDrawLiveSuccessSimulation(deckLiveSimMode);
      if (!sim || sim.kind !== "verdict") return "";
      return (
        String(sim.ok) +
        ":" +
        String(sim.resR != null ? sim.resR : "") +
        ":" +
        String(sim.blade != null ? sim.blade : "") +
        ":" +
        String(sim.kRem != null ? sim.kRem : "")
      );
    } catch (_) {
      return "";
    }
  }

  function clearLiveSuccessEffectSchedule() {
    if (liveSuccessEffectScheduleTimer) {
      clearTimeout(liveSuccessEffectScheduleTimer);
      liveSuccessEffectScheduleTimer = null;
    }
  }

  /**
   * 手札のメンバーを指定サイド（左／センター／右）に登場させる。
   * ドラッグ操作と同じ後処理（登場効果・エネルギー回転・グロー更新など）を行う。
   * @param {*} memberInst
   * @param {"left"|"center"|"right"} side
   * @returns {boolean} 成功したか
   */
  function handMemberStageSideInfo(memberInst, side) {
    var info = { side: side, canEnter: false, cost: 0, upright: 0, lacksEnergy: false };
    if (!memberInst || memberInst.type !== T_MEMBER) return info;
    if (state.liveTurnPickMode === true || state.awaitingTurnStart === true) return info;
    if (!side || !["left", "center", "right"].includes(side)) return info;
    info.upright = countUprightEnergyInArea(state.energyArea);
    var slot = state.stage[side] || [];
    var incumbent = null;
    for (var si = 0; si < slot.length; si++) {
      if (slot[si] && slot[si].type === T_MEMBER) incumbent = slot[si];
    }
    var mcHand = mergedCatalogCard(memberInst);
    info.cost =
      side === "center" && cardIsSpBp4004Sumire(mcHand.card_no)
        ? sumireCenterDoubleBatonPreviewCost(memberInst)
        : effectiveStageAppearPrintedCost(memberInst, incumbent);
    info.canEnter = stageColumnAllowsMemberEntry(side);
    info.lacksEnergy = info.canEnter && info.cost > info.upright;
    return info;
  }

  function stageColumnFromZoneEl(el) {
    if (!el || !el.id) return null;
    var id = String(el.id);
    if (id.indexOf("left") >= 0) return "left";
    if (id.indexOf("right") >= 0) return "right";
    if (id.indexOf("center") >= 0) return "center";
    return null;
  }

  function isStageColumnEntryBlocked(col) {
    if (!col || !state.stageColumnEntryBlocked) return false;
    return state.stageColumnEntryBlocked[col] === true;
  }

  function blockStageColumnEntryThisTurn(col) {
    if (!col) return;
    if (!state.stageColumnEntryBlocked) state.stageColumnEntryBlocked = { left: false, center: false, right: false };
    state.stageColumnEntryBlocked[col] = true;
  }

  function handInstMatchesCharacterNames(handInst, names) {
    if (!handInst || !names || !names.length) return false;
    var nm = String(mergedCatalogCard(handInst).name || "").replace(/\s/g, "");
    for (var i = 0; i < names.length; i++) {
      var ch = String(names[i] || "").replace(/\s/g, "");
      if (ch && nm.indexOf(ch) >= 0) return true;
    }
    return false;
  }

  function placeWaitingMemberToStageColumnWait(mem, col) {
    if (!placeWaitingMemberToStageColumn(mem, col)) return false;
    mem.lcWait = true;
    mem.lcActive = false;
    mem.isRotated = true;
    return true;
  }

  function placeHandMemberOnStageSideCore(memberInst, side, opts) {
    opts = opts || {};
    var hi = state.hand.findIndex(function (h) { return h && String(h.id) === String(memberInst.id); });
    if (hi < 0) {
      showToast("そのカードは手札にありません");
      return false;
    }
    if (isStageColumnEntryBlocked(side)) {
      showToast(
        (side === "left" ? "左サイド" : side === "right" ? "右サイド" : "センター") +
          " にはこのターン、メンバーを登場できません",
      );
      return false;
    }
    var stageSlot = state.stage[side] || [];
    var incumbent = null;
    for (var sii = 0; sii < stageSlot.length; sii++) {
      if (stageSlot[sii] && stageSlot[sii].type === T_MEMBER) incumbent = stageSlot[sii];
    }
    if (incumbent && memberIsStageFreshThisTurn(incumbent)) {
      showToast(
        (mergedCatalogCard(incumbent).name || "メンバー") +
          " はこのターンにステージへ載せたばかりのため、バトンタッチできません",
      );
      return false;
    }
    if (incumbent && incumbent._joujiCannotBatonToWaiting === true) {
      showToast(
        (mergedCatalogCard(incumbent).name || "メンバー") +
          " はバトンタッチで控え室に置けないため、登場できません",
      );
      return false;
    }
    if (incumbent && incumbent._joujiBatonSeriesOnlyTag) {
      var enterMc = mergedCatalogCard(memberNew);
      if (!catalogCardMatchesGroupTag(enterMc, incumbent._joujiBatonSeriesOnlyTag)) {
        showToast(
          (mergedCatalogCard(incumbent).name || "メンバー") +
            " は『" +
            incumbent._joujiBatonSeriesOnlyTag +
            "』以外とのバトンタッチで控え室に置けないため、登場できません",
        );
        return false;
      }
    }
    expirePendingToujouEffects([]);
    var snap = snapshotBoard();
    var prevMemForBaton = incumbentFromSnapStageSlot(snap, side, "");
    pushHistoryBefore("hand-to-stage-" + side);
    var inst = state.hand.splice(hi, 1)[0];
    delete inst._enteredFromWaitingRoom;
    if (!state.stage[side]) state.stage[side] = [];
    var mcEnter = mergedCatalogCard(inst);
    var batonIds = Array.isArray(inst._soloBatonMemberIds) ? inst._soloBatonMemberIds.slice() : [];
    if (
      side === "center" &&
      cardIsSpBp4004Sumire(mcEnter.card_no) &&
      batonIds.length >= 2
    ) {
      var batonSum = 0;
      batonIds.slice(0, 2).forEach(function (bid) {
        var b = findCardInstById(bid);
        if (!b) return;
        batonSum += memberFlooredPrintedCost(b);
        removeStageMemberToWaiting(b);
      });
      inst._appearEnergyOverride = Math.max(0, memberFlooredPrintedCost(inst) - batonSum);
      incumbent = null;
      delete inst._toujouBatonFromLowerCostMemberId;
    } else if (incumbent) {
      var incIdx = state.stage[side].findIndex(function (c) { return c && String(c.id) === String(incumbent.id); });
      if (incIdx >= 0) {
        var replaced = state.stage[side].splice(incIdx, 1)[0];
        clearToujouEffectStateOnLeaveStage(replaced);
        state.waitingRoom.push(replaced);
      }
      if (prevMemForBaton && prevMemForBaton.type === T_MEMBER) {
        var enterCost = memberFlooredPrintedCost(inst);
        var batonCost = memberFlooredPrintedCost(prevMemForBaton);
        if (batonCost < enterCost) {
          inst._toujouBatonFromLowerCostMemberId = String(prevMemForBaton.id);
        } else {
          delete inst._toujouBatonFromLowerCostMemberId;
        }
      } else {
        delete inst._toujouBatonFromLowerCostMemberId;
      }
    } else {
      delete inst._toujouBatonFromLowerCostMemberId;
    }
    state.stage[side].push(inst);
    try { stampNewStageMembersForGlow(snap); } catch (_) {}
    try { maybeRotateEnergyCostForMembersNewOnStage(snap); } catch (_) {}
    try { syncPlayBonusesAfterStageMembershipChange(snap); } catch (_) {}
    try { activateToujouEffectsOnStageEntry(snap); } catch (_) {}
    try { maybeHandleBp2001EntryPrompt(snap); } catch (_) {}
    try { warnAfterStageBatonSameTurnPolicy(snap); } catch (_) {}
    showToast((mergedCatalogCard(inst).name || "メンバー") + " を " +
      (side === "left" ? "左サイド" : side === "right" ? "右サイド" : "センター") + " に登場させました");
    render();
    return true;
  }

  function placeHandMemberOnStageSide(memberInst, side, opts) {
    opts = opts || {};
    if (!memberInst || memberInst.type !== T_MEMBER) return false;
    if (state.liveTurnPickMode === true || state.awaitingTurnStart === true) {
      showToast("いまは手札メンバーをステージに置けません");
      return false;
    }
    var validSides = { left: 1, center: 1, right: 1 };
    if (!validSides[side]) return false;
    var hi = state.hand.findIndex(function (h) { return h && String(h.id) === String(memberInst.id); });
    if (hi < 0) {
      showToast("そのカードは手札にありません");
      return false;
    }
    var sideInfo = handMemberStageSideInfo(memberInst, side);
    if (!sideInfo.canEnter) return false;
    if (sideInfo.lacksEnergy && !opts.forceLowEnergy) {
      var ok = window.confirm(
        "エネルギーが足りません（必要 " +
          sideInfo.cost +
          " / アクティブ " +
          sideInfo.upright +
          "）。\nこのまま登場させますか？",
      );
      if (!ok) return false;
    } else if (sideInfo.lacksEnergy) {
      showToast("エネルギー不足のまま登場しました（必要 " + sideInfo.cost + " / アクティブ " + sideInfo.upright + "）");
    }
    var mcPlace = mergedCatalogCard(memberInst);
    if (cardAllowsTwoMemberBaton(mcPlace) && side === "center" && cardIsSpBp4004Sumire(mcPlace.card_no)) {
      openSumireCenterDoubleBatonDialog(memberInst, function (proceed, batonIds) {
        if (!proceed) return;
        if (batonIds && batonIds.length) memberInst._soloBatonMemberIds = batonIds.slice(0, 2);
        else delete memberInst._soloBatonMemberIds;
        placeHandMemberOnStageSideCore(memberInst, side, opts);
      });
      return true;
    }
    return placeHandMemberOnStageSideCore(memberInst, side, opts);
  }

  function canHandMemberEnterStage(memberInst) {
    if (!memberInst || memberInst.type !== T_MEMBER) return false;
    if (state.liveTurnPickMode === true) return false;
    if (state.awaitingTurnStart === true) return false;
    if (document.body && document.body.classList.contains("hide-hand-stream")) return false;
    var cols = ["left", "center", "right"];
    for (var ci = 0; ci < cols.length; ci++) {
      if (canHandMemberEnterStageColumn(memberInst, cols[ci])) return true;
    }
    return false;
  }

  function unresolvedMandatoryLiveStartEffectsExist() {
    var pending = collectPendingTriggeredEffects(["live_start"]);
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].mandatory) return true;
    }
    return false;
  }

  function markPlayLiveYellStarted() {
    if (state.liveStatsAfterBegin !== true) return;
    if (state.playLiveYellStarted === true) return;
    if (state.__liveYellWarnAck !== true && unresolvedMandatoryLiveStartEffectsExist()) {
      var ok = window.confirm(
        "未解決のライブ開始時 “強制効果” が残っています。\n" +
        "効果解決を先に行うか、強制効果に従って解決してください。\n" +
        "それでもこのままエールを始めますか？",
      );
      if (!ok) return;
      state.__liveYellWarnAck = true;
    }
    state.playLiveYellStarted = true;
    state.playLiveStartGlowActive = false;
  }

  function flashResolutionYellCard(c) {
    if (!c || typeof c !== "object") return;
    var mc = mergedCatalogCard(c);
    if (catalogLiveCardIsDrawYellBladeHeart(mc)) {
      markCardFlashDraw(c, FLASH_LABEL_DRAW_YELL_PLUS_ONE);
      c._flashYellKind = "draw_yell";
      return;
    }
    if (catalogEaleScoreHeartPoints(mc) > 0) {
      var scPts = catalogEaleScoreHeartPoints(mc);
      markCardFlashDraw(c, scPts > 1 ? "スコア＋" + scPts : FLASH_LABEL_SCORE_PLUS_ONE);
      c._flashYellKind = "score";
      registerScoreYellForLiveTotal(c);
      return;
    }
    if (mc.type === T_MEMBER && !cardHasBladeHeart(mc)) {
      markCardFlashDraw(c, FLASH_LABEL_MISS);
      c._flashYellKind = "nonbh_member";
    }
  }

  function isPlayEffectResolved(c, kind) {
    return !!(c && c._playEffectResolved && c._playEffectResolved[kind]);
  }

  function markPlayEffectResolved(c, kind) {
    if (!c || !kind) return;
    ensureCardBoardFields(c);
    if (!c._playEffectResolved || typeof c._playEffectResolved !== "object") {
      c._playEffectResolved = {};
    }
    c._playEffectResolved[kind] = true;
    var mc = mergedCatalogCard(c);
    var cl = classifyCardAbility(mc, kind);
    if (cl && cl.perTurnLimit) perTurnIncrement(c, kind);
    if (cl && cl.perTurnLimit === 2 && Number((c._perTurnAbilityUsed || {})[kind] || 0) < 2) {
      delete c._playEffectResolved[kind];
    }
    logReplay("play-effect-resolved", { cardId: c.id, kind: kind });
  }

  function resolvePlayCardEffect(c, kind) {
    if (!c || !kind) return;
    if (blockPlayActionsDuringEffectDialogPeek()) {
      showToast("「効果を続ける」でダイアログに戻るまで、他の効果は解決できません");
      return;
    }
    if (versusBlocksFreePlay()) {
      versusBlocksFreePlayToast();
      return;
    }
    if (kind === "toujyou") expirePendingToujouEffects([String(c.id)]);
    else expirePendingToujouEffects([]);
    ensureCardBoardFields(c);
    var mc = mergedCatalogCard(c);
    var cl = classifyCardAbility(mc, kind);
    if (cl.trigger !== kind) {
      if (isPlayManualMode()) {
        openAbilityGuidedDialog(c, kind, function () {
          markPlayEffectResolved(c, kind);
          render();
        });
        return;
      }
      if (cl.template === "none") {
        markPlayEffectResolved(c, kind);
        render();
        return;
      }
      showToast("効果テキストの分類が一致しません。ガイドに従って手動で処理してください。");
      openAbilityGuidedDialog(c, kind, function () {
        markPlayEffectResolved(c, kind);
        render();
      });
      return;
    }
    if (kind === "kidou" && !canUseKidouEffectsNow()) {
      showToast("通常フェイズ以外では起動効果を使用できません");
      return;
    }
    if (cl.perTurnLimit && perTurnLimitExhausted(c, kind, cl.perTurnLimit)) {
      var lim = cl.perTurnLimit === 2 ? "2" : "1";
      showToast("このターンの「ターン" + lim + "回」効果はもう使用済みです");
      return;
    }
    runClassifiedCardAbility(c, cl, kind);
  }

  function isInLiveTurnContext() {
    return state.liveTurnPickMode === true || state.liveStatsAfterBegin === true;
  }

  /** 起動効果が使えるのは通常フェイズのみ（ソロ・対戦共通） */
  function canUseKidouEffectsNow() {
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      var ph = normalizeVersusPhase(versusSession.remoteMatch);
      return ph === "firstNormal" || ph === "secondNormal";
    }
    if (state.awaitingTurnStart === true && !openingMulliganExecuteUsed) return false;
    if (state.liveTurnPickMode === true || state.liveStatsAfterBegin === true) return false;
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) return false;
    return true;
  }

  function boardHasLiveSuccessEffectCards() {
    var found = false;
    function visit(c) {
      if (found || !c) return;
      var mc = mergedCatalogCard(c);
      if (mc.type !== T_MEMBER && mc.type !== T_LIVE) return;
      if (!cardHasTrigger(mc, "live_success")) return;
      var cl = classifyCardAbility(mc, "live_success");
      if (cl && cl.template !== "none") found = true;
    }
    ["left", "center", "right"].forEach(function (col) {
      (state.stage[col] || []).forEach(visit);
      (state.liveArea[col] || []).forEach(visit);
    });
    return found;
  }

  var versusSuccessFxAutoSkipKey = "";
  var versusSuccessFxOrchestrateKey = "";

  function playLiveMechanicalFailedLocked() {
    return (
      state.liveStatsAfterBegin === true &&
      liveSimResolutionVerdictLocked() &&
      !playLiveSuccessVerdictReady()
    );
  }

  function versusTryOrchestrateSuccessFx(remoteMatch) {
    if (!versusMatchPhaseActive() || !remoteMatch) return;
    var playRole = getVersusPlayRole();
    if (!playRole || getVersusLiveStep(remoteMatch) !== "successFx") return;
    if (!canRoleActInVersus(remoteMatch, playRole)) return;
    var key = buildVersusPhaseAutoKey(remoteMatch) + ":orchFx:" + String(playRole);
    if (versusSuccessFxOrchestrateKey === key) return;
    activateLiveSuccessEffectsAfterJudge();
    if (!boardHasLiveSuccessEffectCards()) return;
    var pend = collectPendingTriggeredEffects(["live_success"]);
    if (!pend || !pend.length) return;
    versusSuccessFxOrchestrateKey = key;
    orchestratePendingTriggeredEffects(["live_success"]);
  }

  function versusTryAutoSkipSuccessFx(remoteMatch) {
    if (!versusMatchPhaseActive() || !remoteMatch) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    if (getVersusLiveStep(remoteMatch) !== "successFx") return;
    if (!canRoleActInVersus(remoteMatch, playRole)) return;
    if (boardHasLiveSuccessEffectCards()) return;
    var key = buildVersusPhaseAutoKey(remoteMatch) + ":skipFx:" + String(playRole);
    if (versusSuccessFxAutoSkipKey === key) return;
    versusSuccessFxAutoSkipKey = key;
    if (versusLocalDualMatchActive()) {
      persistVersusLocalDualActiveBoard();
      if (applyLocalVersusSuccessFxDone(playRole)) {
        resetVersusLocalLiveHandoff();
        showToast("ライブ成功時効果の対象がないためスキップしました");
        forceVersusLocalDualBoardSwitchToActive();
        render();
      } else {
        versusSuccessFxAutoSkipKey = "";
      }
      return;
    }
    if (!versusOnlineActive() || !versusSession.myRole) return;
    reportVersusSuccessFxDone(versusSession.roomCode, versusSession.myRole)
      .then(function () {
        showToast("ライブ成功時効果の対象がないためスキップしました");
        render();
      })
      .catch(function (err) {
        versusSuccessFxAutoSkipKey = "";
        showToast(String(err.message || err));
      });
  }

  function isPlayManualMode() {
    return state.playManualMode === true;
  }

  function togglePlayManualMode() {
    state.playManualMode = !state.playManualMode;
    var btn = document.getElementById("btn-play-manual-mode");
    if (btn) {
      btn.setAttribute("aria-pressed", state.playManualMode ? "true" : "false");
      btn.classList.toggle("btn--manual-mode-on", state.playManualMode);
    }
    if (document.body) {
      document.body.classList.toggle("play-manual-mode", state.playManualMode);
    }
    showToast(state.playManualMode ? "手動モード ON（自動条件・強制処理は無効）" : "手動モード OFF");
    render();
  }

  function resetLiveSessionPlayEffectsAllZones() {
    function clearCard(c) {
      if (!c) return;
      if (c._playEffectResolved && typeof c._playEffectResolved === "object") {
        delete c._playEffectResolved.live_start;
        delete c._playEffectResolved.live_success;
      }
      c._liveStartEffectActive = false;
      c._liveStartEffectDeclined = false;
      c._liveSuccessEffectActive = false;
      c._liveSuccessEffectDeclined = false;
    }
    function walk(arr) {
      if (!arr) return;
      arr.forEach(clearCard);
    }
    walk(state.hand);
    walk(state.waitingRoom);
    walk(state.deck);
    walk(state.resolutionArea);
    walk(state.successfulLiveArea);
    walk(state.previewScratch);
    ["left", "center", "right"].forEach(function (col) {
      walk(state.stage[col]);
      walk(state.liveArea[col]);
    });
  }

  function resetPerTurnAbilityUsageAllZones() {
    function clear(arr) {
      if (!arr) return;
      arr.forEach(function (c) {
        if (!c) return;
        c._perTurnAbilityUsed = {};
        c._perTurnAbilityUsedTurn = state.turnCount;
        if (c._playEffectResolved) {
          var mcRst = mergedCatalogCard(c);
          ["kidou", "live_start", "live_success"].forEach(function (k) {
            var clk = classifyCardAbility(mcRst, k);
            if (clk && clk.perTurnLimit) {
              if (c._playEffectResolved[k]) delete c._playEffectResolved[k];
            }
          });
        }
      });
    }
    clear(state.hand);
    clear(state.waitingRoom);
    clear(state.deck);
    ["left", "center", "right"].forEach(function (col) {
      clear(state.stage[col]);
      clear(state.liveArea[col]);
    });
    clear(state.successfulLiveArea);
  }

  function perTurnUsageBucket(c) {
    if (!c._perTurnAbilityUsed || c._perTurnAbilityUsedTurn !== state.turnCount) {
      c._perTurnAbilityUsed = {};
      c._perTurnAbilityUsedTurn = state.turnCount;
    }
    return c._perTurnAbilityUsed;
  }
  function perTurnLimitExhausted(c, kind, limit) {
    if (!limit) return false;
    var bucket = perTurnUsageBucket(c);
    return Number(bucket[kind] || 0) >= Number(limit);
  }
  function perTurnIncrement(c, kind) {
    var bucket = perTurnUsageBucket(c);
    bucket[kind] = Number(bucket[kind] || 0) + 1;
  }

  function instIsInWaitingRoom(cardId) {
    if (!cardId) return false;
    for (var i = 0; i < state.waitingRoom.length; i++) {
      if (state.waitingRoom[i] && String(state.waitingRoom[i].id) === String(cardId)) return true;
    }
    return false;
  }

  function waitingPickCandidates(filters, excludeInstId) {
    return state.waitingRoom.filter(function (inst) {
      if (!inst) return false;
      if (excludeInstId && String(inst.id) === String(excludeInstId)) return false;
      var cat = mergedCatalogCard(inst);
      return catalogCardMatchesPickFilters(cat, filters);
    });
  }

  function moveInstFromWaitingToHand(pickedId, sourceInst) {
    for (var j = 0; j < state.waitingRoom.length; j++) {
      if (state.waitingRoom[j] && String(state.waitingRoom[j].id) === String(pickedId)) {
        var picked = state.waitingRoom.splice(j, 1)[0];
        state.hand.push(picked);
        presentAbilityDrawsToHand([picked], sourceInst || null);
        return picked;
      }
    }
    return null;
  }

  /** 盤面・ステージ向け（成功ライブカード置き場の枚数/合計スコアは含めない） */
  function checkAbilityBoardPickFilters(filters) {
    if (!filters || typeof filters !== "object") return true;
    if (filters.minEnergyCount != null) {
      if ((state.energyArea || []).length < filters.minEnergyCount) return false;
    }
    if (filters.characterNameOnStage) {
      var needle = String(filters.characterNameOnStage);
      var found = false;
      eachStageColumnMemberInsts().forEach(function (m) {
        if (String(mergedCatalogCard(m).name || "").indexOf(needle) >= 0) found = true;
      });
      if (!found) return false;
    }
    if (filters.minLiveFrameCount != null) {
      var liveN = 0;
      ["left", "center", "right"].forEach(function (k) {
        (state.liveArea[k] || []).forEach(function (c) {
          if (c && c.type === T_LIVE) liveN++;
        });
      });
      if (liveN < filters.minLiveFrameCount) return false;
    }
    if (filters.minCostMemberOnStage != null) {
      var needMin = Number(filters.minCostMemberOnStage);
      var hasMin = false;
      eachStageColumnMemberInsts().forEach(function (m) {
        if (memberFlooredPrintedCost(m) >= needMin) hasMin = true;
      });
      if (!hasMin) return false;
    }
    return true;
  }

  /** ライブ成功時向け（成功ライブカード置き場） */
  function checkAbilityLiveSuccessAreaFilters(filters) {
    if (!filters || typeof filters !== "object") return true;
    if (filters.minSuccessLiveCount != null) {
      if (successLiveAreaLiveCardCount() < filters.minSuccessLiveCount) return false;
    }
    if (filters.minSuccessLiveScoreSum != null) {
      if (successLiveAreaScoreSum() < filters.minSuccessLiveScoreSum) return false;
    }
    return true;
  }

  /** @deprecated 互換: 盤面＋成功ライブ両方（live_success 専用は checkAbilityLiveSuccessPreconditions を使う） */
  function checkAbilitySuccessLivePrecondition(filters) {
    return checkAbilityBoardPickFilters(filters) && checkAbilityLiveSuccessAreaFilters(filters);
  }

  /** ライブ成功時効果の前提 */
  function checkAbilityLiveSuccessPreconditions(cl) {
    if (!cl) return true;
    if (!checkAbilityBoardPickFilters(cl.filters || {})) return false;
    if (!checkAbilityLiveSuccessAreaFilters(cl.filters || {})) return false;
    return true;
  }

  function resolutionHasLiveCard() {
    return (state.resolutionArea || []).some(function (c) {
      return c && mergedCatalogCard(c).type === T_LIVE;
    });
  }

  function countResolutionCardsMatching(filters) {
    var n = 0;
    (state.resolutionArea || []).forEach(function (c) {
      if (c && catalogCardMatchesPickFilters(mergedCatalogCard(c), filters || {})) n++;
    });
    return n;
  }

  function countEnergyUnderMemberInst(memberInst) {
    if (!memberInst || memberInst.id == null) return 0;
    var col = stageColumnKeyHostingMember(memberInst.id);
    if (!col) return 0;
    var n = 0;
    (state.stage[col] || []).forEach(function (c) {
      if (c && c.type === T_ENERGY) n++;
    });
    return n;
  }

  function ownLiveScoreEstimate() {
    try {
      var parts = computeLiveFrameScoreParts();
      var bonus = Math.max(-99, Math.min(99, Math.floor(Number(state.liveScoreEffectBonus) || 0)));
      var jouji = Math.max(-99, Math.min(99, Math.floor(Number(state.joujiLiveScoreBonus) || 0)));
      return Math.max(0, Math.floor(Number(parts.baseSum) || 0) + bonus + jouji);
    } catch (_) {
      return 0;
    }
  }

  function opponentLiveScoreEstimate() {
    return Math.max(0, Math.floor(Number(state.soloOpponentSuccessLiveScoreSum) || 0));
  }

  function soloEnergyLessThanOpponent() {
    var own = (state.energyArea || []).length;
    var opp = Math.max(0, Math.floor(Number(state.soloOpponentEnergyCount) || 0));
    if (opp <= 0 && !window.confirm("ソロ: 相手のエネルギー枚数を入力してください（現在は相手エネルギー未設定）。\n続行しますか？")) {
      return false;
    }
    if (opp <= 0) {
      var inp = window.prompt("相手のエネルギー置き場の枚数", "0");
      opp = Math.max(0, Math.floor(Number(inp) || 0));
      state.soloOpponentEnergyCount = opp;
    }
    return own < opp;
  }

  /** @param {import('./abilityEffects.js').ClassifiedAbility} cl */
  function checkAbilityToujouPreconditions(cl) {
    if (!cl) return true;
    if (!checkAbilityBoardPickFilters(cl.filters || {})) return false;
    if (!checkAbilityLiveSuccessAreaFilters(cl.filters || {})) return false;
    return true;
  }

  /** @param {import('./abilityEffects.js').ClassifiedAbility} cl */
  function checkAbilityLiveStartPreconditions(cl) {
    if (!cl) return true;
    if (!checkAbilityBoardPickFilters(cl.filters || {})) return false;
    if (!checkAbilityLiveSuccessAreaFilters(cl.filters || {})) return false;
    if (cl.minStageEntriesThisTurn != null) {
      var needEnt = Math.max(1, Math.floor(Number(cl.minStageEntriesThisTurn)));
      if ((state.stageMemberEntriesThisTurn || 0) < needEnt) return false;
    }
    return true;
  }

  function countDistinctMemberGroupsOnStage() {
    var seen = {};
    eachStageColumnMemberInsts().forEach(function (m) {
      if (!m || m._soloOpponentProxy === true) return;
      var mc = mergedCatalogCard(m);
      var key = mc.unit ? String(mc.unit) : mc.series ? String(mc.series) : mc.name ? String(mc.name) : "";
      if (key) seen[key] = true;
    });
    return Object.keys(seen).length;
  }

  function parseHeartGrantJoujiFromSegmentRaw(segRaw) {
    if (!/ライブ終了時まで/.test(String(segRaw || "")) || !/を得る/.test(String(segRaw || ""))) return null;
    /** @type {number[]} */
    var slots = [];
    var re = /\{\{heart_0?(\d)[^}]+\}\}/gi;
    var m;
    while ((m = re.exec(String(segRaw || ""))) !== null) {
      var slot = Number(m[1]);
      if (slot >= 1 && slot <= 6 && slots.indexOf(slot) < 0) slots.push(slot);
    }
    if (!slots.length) return null;
    var parts = slots.map(function (s) {
      var pad = s < 10 ? "0" + s : String(s);
      return "{{heart_" + pad + ".png|heart" + pad + "}}";
    });
    return "{{jyouji.png|常時}}" + parts.join("と") + "を得る。";
  }

  function stageCenterMemberInst(isOpponent) {
    if (isOpponent && isDualOpponentBoardMode()) {
      return readInactiveOpponentBoard(function () {
        return stageCenterMemberInst(false);
      });
    }
    var col = state.stage.center || [];
    for (var i = 0; i < col.length; i++) {
      var m = col[i];
      if (!m || m.type !== T_MEMBER) continue;
      var proxy = m._soloOpponentProxy === true;
      if (isOpponent ? proxy : !proxy) return m;
    }
    return null;
  }

  function stageHasSeriesTag(seriesTag) {
    if (!seriesTag) return true;
    var found = false;
    eachStageColumnMemberInsts().forEach(function (m) {
      if (catalogCardMatchesGroupTag(mergedCatalogCard(m), seriesTag)) found = true;
    });
    return found;
  }

  /** @param {import('./abilityEffects.js').ClassifiedAbility} cl */
  function checkAbilityKidouPreconditions(cl) {
    if (!cl) return true;
    if (!checkAbilityBoardPickFilters(cl.filters || {})) return false;
    if (cl.requiresSeriesOnStage && cl.filters && cl.filters.seriesTag) {
      return stageHasSeriesTag(cl.filters.seriesTag);
    }
    return true;
  }

  function moveStageMemberInstToWaiting(memberInst) {
    if (!memberInst) return false;
    var moved = false;
    ["left", "center", "right"].forEach(function (k) {
      if (moved) return;
      var arr = state.stage[k] || [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && String(arr[i].id) === String(memberInst.id)) {
          arr.splice(i, 1);
          state.waitingRoom.push(memberInst);
          moved = true;
          break;
        }
      }
    });
    if (moved) {
      fireJidouLeaveStageEvents(memberInst, null);
    }
    return moved;
  }

  function clearLiveSessionGrantedState(inst) {
    if (!inst) return;
    delete inst._liveSessionYellRevealReduction;
    delete inst._grantedJoujiSegmentRaws;
    if (inst.playBonusLiveScore != null) inst.playBonusLiveScore = 0;
  }

  function activateAllStageMembers(maxCount) {
    if (
      state.blockEffectMemberActivateTurn != null &&
      state.blockEffectMemberActivateTurn === state.turnCount
    ) {
      showToast("このターンは効果でメンバーをアクティブにできません");
      return 0;
    }
    var n = 0;
    var limit = maxCount != null ? Math.max(1, Math.floor(Number(maxCount))) : 99;
    eachStageColumnMemberInsts().forEach(function (m) {
      if (n >= limit) return;
      if (m.lcWait === true) {
        m.lcWait = false;
        m.isRotated = false;
        m.lcActive = true;
        n++;
      }
    });
    return n;
  }

  function activateAllLiellaOnStageAndEnergy() {
    var memN = 0;
    eachStageColumnMemberInsts().forEach(function (m) {
      if (!catalogCardMatchesGroupTag(mergedCatalogCard(m), "Liella!")) return;
      m.lcWait = false;
      m.isRotated = false;
      m.lcActive = true;
      memN++;
    });
    var enN = activateEnergyCount(99);
    return { members: memN, energy: enN };
  }

  function addEnergyFromDeckToArea(count, rotated) {
    var n = Math.max(0, Math.floor(Number(count) || 0));
    var added = 0;
    for (var i = 0; i < n; i++) {
      if (state.energyArea.length >= MAX_ENERGY_SIDE) break;
      var e = energyInstance();
      e.isRotated = !!rotated;
      e.lcWait = !!rotated;
      e.lcActive = !rotated;
      state.energyArea.push(e);
      added++;
    }
    if (added > 0) {
      try {
        fireJidouAfterEnergyPlaced();
      } catch (jErr) {
        console.warn(jErr);
      }
    }
    return added;
  }

  function activateEnergyCount(n) {
    var need = Math.max(0, Math.floor(Number(n) || 0));
    var done = 0;
    for (var i = 0; i < need; i++) {
      if (activateOneUprightEnergy()) done++;
      else break;
    }
    return done;
  }

  /** ピックフィルタを日本語で簡潔に説明する */
  function describePickFilters(f) {
    if (!f || typeof f !== "object") return "";
    var parts = [];
    if (f.pickType === T_MEMBER) parts.push("メンバー");
    else if (f.pickType === T_LIVE) parts.push("ライブ");
    if (f.maxCost != null) parts.push("コスト" + f.maxCost + "以下");
    if (f.seriesTag) parts.push("『" + f.seriesTag + "』");
    if (f.minCost != null) parts.push("コスト" + f.minCost + "以上");
    if (f.minNeedHeartSlot != null && f.minNeedHeartValue != null) {
      var colorNames = { 1: "桃", 2: "赤", 3: "黄", 4: "緑", 5: "青", 6: "紫" };
      parts.push("必要ハート" + (colorNames[f.minNeedHeartSlot] || "") + f.minNeedHeartValue + "以上");
    }
    if (f.minTotalNeedHeart != null) parts.push("必要ハート合計" + f.minTotalNeedHeart + "以上");
    return parts.join(" / ");
  }

  /**
   * 山札からめくったカード一覧を全件表示。条件に合わないカードも選べる（選んだとき警告）。
   * @param {any[]} cards
   * @param {object} filters
   * @param {string} leadText
   * @param {(pickedId: string | null, opts?: { violatedFilter?: boolean }) => void} onDone
   */
  function openPickFromDeckLookDialog(cards, filters, leadText, onDone) {
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(null);
      return;
    }
    if (lead) {
      lead.textContent =
        (leadText || "見たカードから 1 枚を選びます。") +
        " 条件に合わないカードを選んでも手札に加えられますが、警告が出ます。";
    }
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    cards.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "")).trim();
      var thumb = mc.img || c.img || "";
      var matches = catalogCardMatchesPickFilters(mc, filters || {});
      var labEl = document.createElement("label");
      labEl.className =
        "dlg-pick-kidou-waiting__tile" + (matches ? "" : " dlg-pick-kidou-waiting__tile--soft-warn");
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "pickKidouWait";
      radio.value = String(c.id);
      radio.className = "dlg-pick-kidou-waiting__radio";
      radio.dataset.filterMatch = matches ? "1" : "0";
      if (!matches) radio.title = "条件と異なるカードです（選んでも回収できます）";
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      img.loading = "lazy";
      img.decoding = "async";
      if (thumb) img.src = thumb;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = (i + 1) + ". " + lab + (matches ? "" : "（条件外）");
      labEl.appendChild(radio);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      grid.appendChild(labEl);
    });
    list.appendChild(grid);
    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var r = list.querySelector('input[name="pickKidouWait"]:checked');
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(r && r.value ? String(r.value) : null);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
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

  function applyDeckTopToWaiting(count) {
    var n = Math.max(0, Math.min(Number(count) || 0, state.deck.length));
    if (n <= 0) return 0;
    var moved = state.deck.splice(0, n);
    state.waitingRoom.push.apply(state.waitingRoom, moved);
    return moved.length;
  }

  function shiftDeckTopCards(count) {
    var n = Math.max(0, Math.min(Number(count) || 0, state.deck.length));
    if (n <= 0) return [];
    return state.deck.splice(0, n);
  }

  /**
   * @param {any[]} cards
   * @param {(proceed: boolean) => void} onDone
   * @param {{ mode?: 'confirm'|'view', title?: string, lead?: string, okLabel?: string, sourceInst?: * }} [opts]
   */
  function openDeckTopCardsRevealDialog(cards, onDone, opts) {
    opts = opts || {};
    var mode = opts.mode === "view" ? "view" : "confirm";
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(mode === "view" ? true : true);
      return;
    }
    var prevOkLabel = btnOk.textContent;
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    var prevLead = lead ? lead.textContent : "";
    var prevCxHidden = btnCx ? btnCx.hidden : false;
    if (dlgTitle) {
      if (opts.sourceInst) setEffectProcessingDialogTitle(dlgTitle, opts.sourceInst);
      else {
        dlgTitle.textContent =
          opts.title || (mode === "view" ? "控え室に送ったカード" : "山札から控え室へ");
      }
    }
    if (lead) {
      lead.textContent =
        opts.lead ||
        (mode === "view"
          ? "以下のカードが山札から控え室に送られました。"
          : "山札の上から控え室へ送るカードを確認してください。");
    }
    btnOk.textContent = opts.okLabel || (mode === "view" ? "確認した" : "控え室に送る");
    if (btnCx) btnCx.hidden = mode === "view";
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid dlg-deck-to-wait-reveal__grid";
    (cards || []).forEach(function (c) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "")).trim();
      var tile = document.createElement("div");
      tile.className = "dlg-pick-kidou-waiting__tile dlg-pick-kidou-waiting__tile--reveal-only";
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      img.loading = "lazy";
      img.decoding = "async";
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      tile.appendChild(img);
      tile.appendChild(cap);
      grid.appendChild(tile);
    });
    list.appendChild(grid);

    function cleanup() {
      btnOk.textContent = prevOkLabel || "選択した1枚を手札に加える";
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || "回収対象カード — 1枚を手札に加える";
      if (lead) lead.textContent = prevLead || "";
      if (btnCx) btnCx.hidden = prevCxHidden;
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onCx);
    }
    function onOk(ev) {
      if (ev) ev.preventDefault();
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(true);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(mode === "view");
    }
    btnOk.addEventListener("click", onOk);
    if (btnCx && mode === "confirm") btnCx.addEventListener("click", onCx);
    if (mode === "confirm") dlg.addEventListener("cancel", onCx);
    else {
      dlg.addEventListener("cancel", function (ev) {
        ev.preventDefault();
        onOk();
      });
    }
    dlg.showModal();
  }

  /**
   * @param {any[]} cards
   * @param {string} [leadText]
   * @param {() => void} [onDone]
   * @param {*} [sourceInst]
   */
  function revealCardsSentFromDeckToWaiting(cards, leadText, onDone, sourceInst) {
    if (!cards || !cards.length) {
      if (onDone) onDone();
      return;
    }
    openDeckTopCardsRevealDialog(
      cards,
      function () {
        if (onDone) onDone();
      },
      {
        mode: "view",
        title: "控え室に送ったカード",
        lead: leadText || "以下のカードが山札から控え室に送られました。",
        okLabel: "確認した",
        sourceInst: sourceInst,
      },
    );
  }

  /**
   * 山札公開から複数枚を手札に加え、残りを控え室へ。
   * @param {any[]} cards
   * @param {number} minPick
   * @param {number} maxPick
   * @param {string} leadText
   * @param {(pickedIds: string[]) => void} onDone
   * @param {*} [sourceInst]
   */
  function openPickMultipleFromDeckLookDialog(cards, minPick, maxPick, leadText, onDone, sourceInst) {
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    var minN = Math.max(0, Math.floor(Number(minPick) || 0));
    var maxN = Math.max(minN, Math.floor(Number(maxPick) || minN));
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone([]);
      return;
    }
    var prevOkLabel = btnOk.textContent;
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    if (sourceInst && dlgTitle) setEffectProcessingDialogTitle(dlgTitle, sourceInst);
    if (lead) {
      lead.textContent =
        (leadText || "見たカードから手札に加える枚数を選びます。") +
        "（" +
        minN +
        "〜" +
        maxN +
        " 枚。残りは控え室へ）";
    }
    btnOk.textContent = "手札に加える";
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    cards.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "")).trim();
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "pickDeckLookMulti";
      cb.value = String(c.id);
      cb.className = "dlg-pick-kidou-waiting__radio";
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = (i + 1) + ". " + lab;
      labEl.appendChild(cb);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      grid.appendChild(labEl);
    });
    list.appendChild(grid);
    function cleanup() {
      btnOk.textContent = prevOkLabel || "選択した1枚を手札に加える";
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || "回収対象カード — 1枚を手札に加える";
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var checked = list.querySelectorAll('input[name="pickDeckLookMulti"]:checked');
      var ids = [];
      for (var i = 0; i < checked.length; i++) ids.push(String(checked[i].value));
      if (ids.length < minN || ids.length > maxN) {
        showToast(
          minN === maxN
            ? "ちょうど " + minN + " 枚選んでください"
            : minN + "〜" + maxN + " 枚選んでください",
        );
        return;
      }
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(ids);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone([]);
    }
    function onDismiss() {
      cleanup();
      onDone([]);
    }
    btnOk.addEventListener("click", onOk);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  /**
   * @param {any[]} candidates
   * @param {string} leadText
   * @param {(pickedId: string | null) => void} onDone
   */
  function openPickFromWaitingDialog(candidates, leadText, onDone, opts) {
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(candidates && candidates[0] && candidates[0].id != null ? String(candidates[0].id) : null);
      return;
    }
    if (lead) lead.textContent = leadText || "控え室から 1 枚選んで手札に加えます。";
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    var defaultOkLabel = "選択した1枚を手札に加える";
    var defaultDialogTitle = "回収対象カード — 1枚を手札に加える";
    var prevOkLabel = btnOk.textContent;
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    var titleInst = (opts && opts.sourceInst) || effectDialogPeekSourceInst;
    if (opts && typeof opts.okLabel === "string" && opts.okLabel) {
      btnOk.textContent = opts.okLabel;
    } else {
      btnOk.textContent = defaultOkLabel;
    }
    if (titleInst && dlgTitle) {
      setEffectProcessingDialogTitle(dlgTitle, titleInst);
    } else if (dlgTitle) {
      dlgTitle.textContent =
        opts && typeof opts.dialogTitle === "string" && opts.dialogTitle
          ? opts.dialogTitle
          : defaultDialogTitle;
    }
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    candidates.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "")).trim();
      var thumb = mc.img || c.img || "";
      var zoneHint =
        opts && typeof opts.zoneLabelFn === "function" ? opts.zoneLabelFn(c) : "";
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "pickKidouWait";
      radio.value = String(c.id);
      radio.className = "dlg-pick-kidou-waiting__radio";
      if (i === 0) radio.checked = true;
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      img.loading = "lazy";
      img.decoding = "async";
      if (thumb) img.src = thumb;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      labEl.appendChild(radio);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      if (zoneHint) {
        var zoneEl = document.createElement("span");
        zoneEl.className = "dlg-pick-kidou-waiting__zone";
        zoneEl.textContent = zoneHint;
        labEl.appendChild(zoneEl);
      }
      labEl.addEventListener("click", function () {
        radio.checked = true;
      });
      grid.appendChild(labEl);
    });
    list.appendChild(grid);

    var actionsEl = dlg.querySelector(".dlg-pick-kidou-waiting-actions") || dlg.querySelector(".app-dialog__actions");
    ensureDialogViewBoardButton(actionsEl, dlg, titleInst);

    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
      btnOk.textContent = prevOkLabel;
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || defaultDialogTitle;
      var vb = actionsEl && actionsEl.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function onOk(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      var r = list.querySelector('input[name="pickKidouWait"]:checked');
      if (!r || !r.value) {
        showToast("対象を1枚選んでから決定してください");
        return;
      }
      cleanup();
      try {
        dlg.close();
      } catch (_) {
        /* noop */
      }
      onDone(String(r.value));
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
   * @param {number} count
   * @param {(pickedIds: string[]) => void} onDone
   * @param {(inst: *, cat: *) => boolean} [filterFn]
   */
  function openPickHandToWaitingDialog(count, onDone, filterFn) {
    if (count <= 0 || !state.hand.length) {
      onDone([]);
      return;
    }
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    if (!dlg || !list || !btnOk) {
      onDone([]);
      return;
    }
    if (lead) lead.textContent = "手札から " + count + " 枚選んで控え室に置きます。";
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    var eligible = 0;
    state.hand.forEach(function (c) {
      var mc = mergedCatalogCard(c);
      if (filterFn && !filterFn(c, mc)) return;
      eligible++;
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || "")).trim();
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "pickHandToWait";
      cb.value = String(c.id);
      cb.className = "dlg-pick-kidou-waiting__radio";
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      labEl.appendChild(cb);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      grid.appendChild(labEl);
    });
    if (!eligible) {
      showToast("条件を満たす手札がありません");
      onDone(null);
      return;
    }
    list.appendChild(grid);

    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || "";
    }
    function onOk() {
      var checked = list.querySelectorAll('input[name="pickHandToWait"]:checked');
      var ids = [];
      for (var i = 0; i < checked.length; i++) ids.push(String(checked[i].value));
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      if (ids.length !== count) {
        showToast("手札からちょうど " + count + " 枚選んでください（いま " + ids.length + " 枚）");
        onDone(null);
        return;
      }
      onDone(ids);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
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
   * @param {any[]} looked 上から見たカード（順序＝見た順）
   * @param {(deckOrderIds: string[], waitingIds: string[]) => void} onDone
   */
  /**
   * 登場時: 山札上から見て Liella! ライブ1枚まで手札（PL!SP-bp4-002 等）
   * @param {any[]} looked
   * @param {import('./abilityEffects.js').AbilityPickFilters} filters
   * @param {*} sourceInst
   * @param {(pickedId: string | null) => void} onDone
   */
  function openDeckTopLiellaLivePickDialog(looked, filters, sourceInst, onDone) {
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(null);
      return;
    }
    if (sourceInst) effectDialogPeekSourceInst = sourceInst;
    if (dlgTitle) setEffectProcessingDialogTitle(dlgTitle, sourceInst, "効果の処理");
    if (lead) {
      lead.textContent =
        "見た " +
        looked.length +
        " 枚のうち、条件を満たす『Liella!』のライブを1枚まで選んで手札に加えられます（選ばない場合はすべて控え室へ）。";
    }
    btnOk.textContent = "完了";
    btnCx.textContent = "手札に加えない";
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    var eligible = 0;
    looked.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var ok =
        mc.type === T_LIVE &&
        catalogCardMatchesPickFilters(mc, filters || {}) &&
        (!filters || !filters.seriesTag || catalogCardMatchesGroupTag(mc, filters.seriesTag));
      if (ok) eligible++;
      var labEl = document.createElement("label");
      labEl.className =
        "dlg-pick-kidou-waiting__tile" + (ok ? "" : " dlg-pick-kidou-waiting__tile--soft-warn");
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "deckTopLiellaPick";
      radio.value = String(c.id);
      radio.className = "dlg-pick-kidou-waiting__radio";
      radio.disabled = !ok;
      if (i === 0 && ok) radio.checked = true;
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = mc.name || "";
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || "")).trim();
      if (!ok) {
        cap.textContent += "（条件外）";
      } else {
        cap.textContent += "（必要H合計 " + sumNeedHeartOnCard(mc) + "）";
      }
      labEl.appendChild(radio);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      labEl.addEventListener("click", function () {
        if (!radio.disabled) radio.checked = true;
      });
      grid.appendChild(labEl);
    });
    list.appendChild(grid);
    if (!eligible) {
      var hint = document.createElement("p");
      hint.className = "muted";
      hint.textContent = "条件を満たすライブカードはありません。すべて控え室に置きます。";
      list.appendChild(hint);
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, sourceInst);
    if (sourceInst) {
      pushLocalVersusEffectUi(
        sourceInst,
        "toujyou",
        "山札の上から見たカードから条件を満たすライブを手札に加えられます",
      );
    }
    function cleanup() {
      btnOk.textContent = "選択した1枚を手札に加える";
      btnCx.textContent = "キャンセル";
      if (dlgTitle) dlgTitle.textContent = "回収対象カード — 1枚を手札に加える";
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onCx);
    }
    function onOk() {
      var picked = list.querySelector('input[name="deckTopLiellaPick"]:checked');
      var pid = picked && !picked.disabled ? String(picked.value) : null;
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(pid);
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(null);
    }
    btnOk.addEventListener("click", onOk);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onCx);
    dlg.showModal();
  }

  function sumNeedHeartOnCard(cat) {
    var need = cat && cat.need_heart;
    if (!need || typeof need !== "object") return 0;
    var sum = 0;
    Object.keys(need).forEach(function (k) {
      sum += Math.max(0, Math.floor(Number(need[k]) || 0));
    });
    return sum;
  }

  function applyNamedMemberHeartBladeGifts(gifts) {
    if (!gifts || !gifts.length) return 0;
    var applied = 0;
    eachStageColumnMemberInsts().forEach(function (m) {
      var mc = mergedCatalogCard(m);
      var memName = String(mc.name || "");
      gifts.forEach(function (g) {
        if (!g || !g.name || memName.indexOf(String(g.name)) < 0) return;
        ensureCardBoardFields(m);
        var slot = Math.max(1, Math.min(6, Math.floor(Number(g.heartSlot) || 0)));
        var add = Math.max(1, Math.floor(Number(g.count) || 1));
        m.playBonusHeartSlotsAlways[slot] =
          sanitizeNonNegativeInt(m.playBonusHeartSlotsAlways[slot]) + add;
        if (g.grantBlade) {
          m.playBonusBladeAlways = sanitizeNonNegativeInt(m.playBonusBladeAlways) + 1;
        }
        applied++;
      });
    });
    return applied;
  }

  function stageHasAllCharacterNames(names) {
    if (!names || !names.length) return false;
    /** @type {Record<string, boolean>} */
    var found = {};
    eachStageColumnMemberInsts().forEach(function (m) {
      var n = String(mergedCatalogCard(m).name || "");
      names.forEach(function (needle) {
        if (needle && n.indexOf(String(needle)) >= 0) found[String(needle)] = true;
      });
    });
    for (var i = 0; i < names.length; i++) {
      if (!found[String(names[i])]) return false;
    }
    return true;
  }

  function syncAbilityGuidedDialogLead(inst, kind) {
    var lead = document.getElementById("dlg-ability-guided-lead");
    if (!lead) return;
    var cl = classifyCardAbility(mergedCatalogCard(inst), kind);
    if (abilityEffectIsAutomated(cl.template)) {
      lead.hidden = false;
      lead.className = "hint zone-inline-help dlg-ability-guided-lead dlg-ability-guided-lead--auto";
      lead.textContent =
        "表示された選択や操作に従って効果を進めてください。盤面の変更が終わったら「完了」を押してください。";
    } else {
      lead.hidden = false;
      lead.className = "hint zone-inline-help dlg-ability-guided-lead";
      lead.textContent =
        "この効果は自動操作に未対応です。下の能力文どおり盤面を整え、終わったら「完了」を押してください。";
    }
  }

  /** @param {string} kind */
  function abilityTriggerTimingLabel(kind) {
    if (kind === "toujyou") return "登場時";
    if (kind === "live_start") return "ライブ開始時";
    if (kind === "live_success") return "ライブ成功時";
    if (kind === "kidou") return "起動";
    return "効果";
  }

  /**
   * @param {*} inst
   * @param {string} kind
   * @param {{ mandatory?: boolean }} [opts]
   */
  function formatAbilityEffectDialogTitle(inst, kind, opts) {
    opts = opts || {};
    var name = mergedInstDisplayName(inst);
    var timing = abilityTriggerTimingLabel(kind);
    if (opts.mandatory) return name + " — " + timing + "（強制）";
    return timing + " — " + name;
  }

  /**
   * @param {*} mc
   * @param {string} kind
   * @returns {string}
   */
  function abilityEffectBodyHtml(mc, kind) {
    var segRaw = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
    if (segRaw && /\{\{/.test(segRaw)) {
      return (
        '<div class="dlg-ability-guided-plain dlg-ability-guided-plain--wiki">' +
        wikiAbilityToStatusHtml(segRaw) +
        "</div>"
      );
    }
    return (
      '<p class="dlg-ability-guided-plain">' +
      escapeHtmlPlain(abilityPlainText(mc) || "（能力文なし）") +
      "</p>"
    );
  }

  function openDeckLookReorderDialog(looked, onDone) {
    var dlg = document.getElementById("dlg-deck-look-reorder");
    var list = document.getElementById("dlg-deck-look-reorder-list");
    var lead = document.getElementById("dlg-deck-look-reorder-lead");
    var btnOk = document.getElementById("dlg-deck-look-reorder-ok");
    var btnCx = document.getElementById("dlg-deck-look-reorder-cancel");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(
        looked.map(function (c) {
          return String(c.id);
        }),
        [],
      );
      return;
    }
    if (lead) {
      lead.textContent =
        "山札の上に戻すカードにチェックを入れ、並び順は上から順です。チェックがないカードは控え室へ送ります。";
    }
    list.innerHTML = "";
    looked.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var row = document.createElement("label");
      row.className = "dlg-deck-look-reorder__row";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "deckLookKeep";
      cb.value = String(c.id);
      cb.checked = true;
      var ord = document.createElement("span");
      ord.className = "dlg-deck-look-reorder__ord";
      ord.textContent = String(i + 1) + ".";
      var img = document.createElement("img");
      img.className = "dlg-deck-look-reorder__img";
      img.alt = mc.name || "";
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-deck-look-reorder__label";
      cap.textContent = (mc.card_no ? mc.card_no + " " : "") + (mc.name || "");
      row.appendChild(cb);
      row.appendChild(img);
      row.appendChild(ord);
      row.appendChild(cap);
      list.appendChild(row);
    });

    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var checked = list.querySelectorAll('input[name="deckLookKeep"]:checked');
      var deckIds = [];
      for (var i = 0; i < checked.length; i++) deckIds.push(String(checked[i].value));
      var waitIds = looked
        .filter(function (c) {
          return deckIds.indexOf(String(c.id)) < 0;
        })
        .map(function (c) {
          return String(c.id);
        });
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(deckIds, waitIds);
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone([], looked.map(function (c) {
        return String(c.id);
      }));
    }
    function onDismiss() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      onDone([], looked.map(function (c) {
        return String(c.id);
      }));
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, effectDialogPeekSourceInst);
    btnOk.addEventListener("click", onOk);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  /** @param {*} inst @param {string} kind @param {() => void} onDone */
  function openAbilityGuidedDialog(inst, kind, onDone) {
    var dlg = document.getElementById("dlg-ability-guided");
    var body = document.getElementById("dlg-ability-guided-body");
    var btnDone = document.getElementById("dlg-ability-guided-done");
    var btnCx = document.getElementById("dlg-ability-guided-cancel");
    var mc = mergedCatalogCard(inst);
    if (!dlg || !body || !btnDone || typeof dlg.showModal !== "function") {
      if (typeof onDone === "function") onDone();
      return;
    }
    if (inst) effectDialogPeekSourceInst = inst;
    syncAbilityGuidedDialogLead(inst, kind);
    var title = document.getElementById("dlg-ability-guided-title");
    if (title) title.textContent = formatAbilityEffectDialogTitle(inst, kind);
    btnDone.textContent = "完了";
    body.innerHTML = abilityEffectBodyHtml(mc, kind);
    pushLocalVersusEffectUi(inst, kind, plainBody);
    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnDone.removeEventListener("click", onDoneClick);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
      var vb = dlg.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function closeDlg() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
    }
    function onDoneClick() {
      closeDlg();
      if (typeof onDone === "function") onDone();
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      clearLocalVersusEffectUi();
      closeDlg();
    }
    function onDismiss() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      clearLocalVersusEffectUi();
      closeDlg();
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, inst);
    btnDone.addEventListener("click", onDoneClick);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  function placeWaitingMemberToStage(memberInst) {
    var cols = ["left", "center", "right"];
    var target = null;
    for (var i = 0; i < cols.length; i++) {
      var k = cols[i];
      var hasMem = (state.stage[k] || []).some(function (c) {
        return c && c.type === T_MEMBER;
      });
      if (!hasMem) {
        target = k;
        break;
      }
    }
    if (!target) target = "center";
    var wi = -1;
    for (var j = 0; j < state.waitingRoom.length; j++) {
      if (state.waitingRoom[j] && String(state.waitingRoom[j].id) === String(memberInst.id)) {
        wi = j;
        break;
      }
    }
    if (wi < 0) return false;
    var mem = state.waitingRoom.splice(wi, 1)[0];
    var slot = state.stage[target] || [];
    var energies = slot.filter(function (c) {
      return c && c.type === T_ENERGY;
    });
    var snap = snapshotBoard();
    state.stage[target] = energies.concat([mem]);
    finalizeWaitingMemberStageEntry(snap);
    return true;
  }

  /**
   * @param {*} inst
   * @param {import('./abilityEffects.js').ClassifiedAbility} cl
   * @param {string} kind
   * @param {() => void} [onComplete]
   * @param {{ skipMandatoryPrompt?: boolean }} [opts]
   */
  function runClassifiedCardAbility(inst, cl, kind, onComplete, opts) {
    opts = opts || {};
    var resolveKind = opts.resolveKind || kind;
    if (!inst || isPlayEffectResolved(inst, resolveKind)) {
      if (onComplete) onComplete();
      return;
    }
    var mandatoryTrigger = !cl.hasOptionalCost && !cl.optional;
    if (
      !opts.skipMandatoryPrompt &&
      mandatoryTrigger &&
      (kind === "toujyou" || kind === "live_start" || kind === "live_success")
    ) {
      openMandatoryTriggeredEffectPrompt(
        { inst: inst, cl: cl, kind: kind, mandatory: true, label: "" },
        function (proceed) {
          if (!proceed) {
            if (onComplete) onComplete();
            return;
          }
          runClassifiedCardAbility(inst, cl, kind, onComplete, { skipMandatoryPrompt: true });
        },
      );
      return;
    }
    effectDialogPeekSourceInst = inst;
    pushHistoryBefore("run-classified-" + kind);
    var mcVersusFx = mergedCatalogCard(inst);
    if (
      versusOnlineActive() &&
      versusSession.myRole &&
      mcVersusFx &&
      mcVersusFx.card_no
    ) {
      pushVersusEffectHighlight(
        versusSession.roomCode,
        versusSession.myRole,
        String(mcVersusFx.card_no),
        {
          cardNo: String(mcVersusFx.card_no),
          instId: inst.id != null ? String(inst.id) : null,
          kind: kind,
          title: formatAbilityEffectDialogTitle(inst, kind),
          bodyPlain: abilityPlainText(mcVersusFx) || "",
        },
      ).catch(function () {
        /* noop */
      });
    }
    if (isPlayManualMode()) {
      openAbilityGuidedDialog(inst, kind, function () {
        markPlayEffectResolved(inst, resolveKind);
        render();
        if (onComplete) onComplete();
      });
      return;
    }
    var mc = mergedCatalogCard(inst);
    var done = false;

    function finishResolved() {
      if (done) return;
      done = true;
      if (effectDialogPeekSourceInst === inst) effectDialogPeekSourceInst = null;
      markPlayEffectResolved(inst, resolveKind);
      if (versusOnlineActive() && versusSession.myRole) {
        clearVersusEffectHighlight(versusSession.roomCode, versusSession.myRole).catch(function () {
          /* noop */
        });
      }
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      render();
      if (onComplete) onComplete();
    }

    function finishGuided() {
      openAbilityGuidedDialog(inst, kind, finishResolved);
    }

    var mandatory = !cl.hasOptionalCost && !cl.optional;
    var handlesOwnCost = templateHandlesOwnCost(cl.template);
    /**
     * 「カードを N 枚引き、手札を M 枚控え室に置く」は本文の効果。
     * コスト判定からは外し、本文側で「引いた後に M 枚控え室へ」を処理する。
     */
    if (cl.template === "draw_then_hand_discard" || cl.template === "draw_per_stage_member_discard") {
      cl.handDiscardToWaiting = null;
    }
    if (
      !handlesOwnCost &&
      (cl.costEnergy || cl.costSelfWait || cl.costPickMemberWait || cl.handDiscardToWaiting)
    ) {
      payAbilityCost(inst, cl, mandatory, function (ok) {
        if (!ok && !mandatory) {
          inst._toujouEffectDeclined = kind === "toujyou" ? true : inst._toujouEffectDeclined;
          inst._liveStartEffectDeclined = kind === "live_start" ? true : inst._liveStartEffectDeclined;
          inst._liveSuccessEffectDeclined = kind === "live_success" ? true : inst._liveSuccessEffectDeclined;
          render();
          if (onComplete) onComplete();
          return;
        }
        if (!ok && mandatory) {
          showToast("コストを支払えなかったため効果は解決できません");
          if (kind === "toujyou") inst._toujouEffectDeclined = true;
          else if (kind === "live_start") inst._liveStartEffectDeclined = true;
          else if (kind === "live_success") inst._liveSuccessEffectDeclined = true;
          render();
          if (onComplete) onComplete();
          return;
        }
        runAfterCost();
      });
      function runAfterCost() {
        runEffectBody();
      }
      return;
    }
    runEffectBody();

    function runEffectBody() {
      if (kind === "kidou") {
        if (cl.requiresInWaiting && !instIsInWaitingRoom(inst.id)) {
          showToast("控え室にいるこのカードでのみ起動できます");
          if (onComplete) onComplete();
          return;
        }
        if (
          cl.requiresOnStage !== false &&
          cl.template !== "kidou_wait_to_stage" &&
          !stageColumnKeyHostingMember(inst.id)
        ) {
          showToast("ステージにいるメンバーでのみ起動できます");
          if (onComplete) onComplete();
          return;
        }
      }
      if (kind === "live_start" && cl.requiresOnStage && !cardIsOnStageOrLiveBoard(inst)) {
        showToast("ステージまたはライブ上のカードでのみライブ開始時効果を解決できます");
        if (onComplete) onComplete();
        return;
      }
      var memberCol = boardColumnKeyHostingCard(inst.id);
      if (!abilityInstMatchesStageArea(memberCol, cl)) {
        var areaHint =
          cl.stageAreas && cl.stageAreas.length
            ? cl.stageAreas
                .map(function (a) {
                  return a === "left" ? "左サイド" : a === "right" ? "右サイド" : "センター";
                })
                .join("または")
            : cl.stageArea === "left"
              ? "左サイド"
              : cl.stageArea === "right"
                ? "右サイド"
                : "センター";
        showToast(areaHint + " にいるときだけこの効果を解決できます");
        if (onComplete) onComplete();
        return;
      }
      executeAbilityBody(inst, cl, kind, finishResolved, finishGuided);
    }
  }

  function gainBladesUntilEnd(memberInst, n) {
    if (!Number.isFinite(n) || n <= 0) return;
    var add = Math.floor(Number(n));
    if (memberInst && memberInst.type === T_MEMBER) {
      ensureCardBoardFields(memberInst);
      memberInst.playBonusBladeAlways = sanitizeNonNegativeInt(memberInst.playBonusBladeAlways) + add;
      showToast(
        (mergedCatalogCard(memberInst).name || "メンバー") +
          " にブレード " +
          add +
          " 個（ライブ終了時まで）",
      );
    } else {
      showToast("ブレードを " + add + " 個得ました（ライブ終了時まで）");
    }
    logReplay("ability-blade-gain", { count: add, cardId: memberInst && memberInst.id });
  }

  function mergedInstDisplayName(inst) {
    if (!inst) return "カード";
    var mc = mergedCatalogCard(inst);
    return (mc && mc.name) || "カード";
  }

  /**
   * @param {HTMLElement | null} titleEl
   * @param {*} [sourceInst]
   * @param {string} [fallbackTitle]
   */
  function setEffectProcessingDialogTitle(titleEl, sourceInst, fallbackTitle, kind) {
    if (!titleEl) return;
    if (sourceInst && kind) {
      titleEl.textContent = formatAbilityEffectDialogTitle(sourceInst, kind);
      return;
    }
    if (sourceInst) {
      titleEl.textContent = mergedInstDisplayName(sourceInst) + " — 効果";
      return;
    }
    titleEl.textContent = fallbackTitle || "効果の確認";
  }

  /**
   * @param {HTMLElement} parent
   * @param {{ cardId: string, groupName: string, inputType?: string, label: string, imgSrc?: string, checked?: boolean, tileClass?: string, inputId?: string }} spec
   */
  function appendDialogPickTile(parent, spec) {
    var tile = document.createElement("label");
    tile.className = spec.tileClass || "dlg-pick-kidou-waiting__tile";
    var inp = document.createElement("input");
    inp.type = spec.inputType || "checkbox";
    inp.name = spec.groupName;
    inp.value = String(spec.cardId);
    inp.className = "dlg-pick-kidou-waiting__radio";
    if (spec.inputId) inp.id = spec.inputId;
    if (spec.checked) inp.checked = true;
    tile.appendChild(inp);
    if (spec.imgSrc) {
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = spec.label;
      img.src = spec.imgSrc;
      tile.appendChild(img);
    }
    var cap = document.createElement("span");
    cap.className = "dlg-pick-kidou-waiting__label";
    cap.textContent = spec.label;
    tile.appendChild(cap);
    parent.appendChild(tile);
    return tile;
  }

  /**
   * @param {*} sourceInst
   * @param {any[]} discardedInsts
   * @param {import('./abilityEffects.js').ClassifiedAbility} cl
   */
  function applyPostDiscardNonBhMemberEffects(sourceInst, discardedInsts, cl) {
    if (!sourceInst || !cl || !cl.postDiscardActivateIfNonBhMember) return;
    var list = Array.isArray(discardedInsts) ? discardedInsts : [];
    var nonBhMembers = list.filter(function (c) {
      if (!c || c.type !== T_MEMBER) return false;
      return !cardHasBladeHeart(mergedCatalogCard(c));
    });
    if (nonBhMembers.length >= 1) {
      sourceInst.isRotated = false;
      sourceInst.lcWait = false;
      sourceInst.lcActive = true;
      showToast(mergedInstDisplayName(sourceInst) + " をアクティブにしました");
    }
    var needAt = cl.postDiscardBladeGainIfNonBhAt != null ? Number(cl.postDiscardBladeGainIfNonBhAt) : 0;
    if (needAt > 0 && nonBhMembers.length >= needAt) {
      var bladeN = cl.postDiscardBladeGainCount != null ? Number(cl.postDiscardBladeGainCount) : 2;
      gainBladesUntilEnd(sourceInst, bladeN);
    }
  }

  /**
   * @param {*} inst
   * @param {import('./abilityEffects.js').ClassifiedAbility} cl
   * @param {boolean} mandatory
   * @param {(ok: boolean) => void} done
   */
  function payAbilityCost(inst, cl, mandatory, done) {
    if (isPlayManualMode()) {
      done(true);
      return;
    }
    state._lastCostPaidHandDiscardedIds = [];
    var costCl = cl;
    if (cl && cl.template === "kidou_opp_wait_group_discount_energy") {
      var disc =
        countDistinctMemberGroupsOnStage() * Math.max(1, Math.floor(Number(cl.energyCostDiscountPerGroup) || 1));
      var baseE = cl.costEnergyCount != null ? Number(cl.costEnergyCount) : 4;
      var eff = Math.max(0, baseE - disc);
      costCl = Object.assign({}, cl, {
        costEnergyCount: eff,
        costEnergy: eff > 0,
      });
    }
    cl = costCl;
    var dlg = document.getElementById("dlg-cost-payment");
    var body = document.getElementById("dlg-cost-payment-body");
    var lead = document.getElementById("dlg-cost-payment-lead");
    var dlgTitle = document.getElementById("dlg-cost-payment-title");
    var btnPay = document.getElementById("dlg-cost-payment-pay");
    var btnSkip = document.getElementById("dlg-cost-payment-skip");
    if (!dlg || !body || !btnPay || typeof dlg.showModal !== "function") {
      done(true);
      return;
    }
    if (inst) effectDialogPeekSourceInst = inst;
    var prevTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    if (dlgTitle) {
      if (inst) {
        dlgTitle.textContent = mergedInstDisplayName(inst) + "のコスト支払い";
      } else {
        dlgTitle.textContent = "コスト支払い";
      }
    }
    var mc = mergedCatalogCard(inst);
    if (lead) lead.textContent = (mc.name || "カード") + " のコストを支払って効果を解決します。";
    body.innerHTML = "";
    var html = "";
    var segRawCost = abilityRawSegmentForTrigger(mc, cl && cl.trigger ? cl.trigger : "") || cardAbilityRawText(mc);
    if (segRawCost) {
      html += '<div class="dlg-cost-payment-row dlg-cost-payment-effect">' + wikiAbilityToStatusHtml(segRawCost) + '</div>';
    }
    var energyPayCount = cl.costEnergyCount != null ? Number(cl.costEnergyCount) : 1;
    if (cl.costEnergy) {
      html +=
        '<div class="dlg-cost-payment-row">アクティブなエネルギーを <strong>' +
        energyPayCount +
        '</strong> 枚選んで支払う（ウェイトにします）</div><div id="cost-pay-energy-grid" class="dlg-pick-kidou-waiting__grid dlg-cost-payment-energy-grid"></div>';
    }
    if (cl.costSelfWait) {
      html +=
        '<div class="dlg-cost-payment-row"><label class="dlg-cost-self-wait-label"><input type="checkbox" id="cost-self-wait"' +
        (mandatory ? " checked" : "") +
        ' /> このメンバーをウェイトにする</label></div>';
    }
    if (cl.costPickMemberWait) {
      html +=
        '<div class="dlg-cost-payment-row">自分のステージのメンバー1人をウェイトにしてもよい（任意）</div><div id="cost-pick-member-wait-grid" class="dlg-pick-kidou-waiting__grid dlg-cost-payment-hand-grid"></div>';
    }
    if (cl.costOrAlt && (cl.costSelfWait || cl.handDiscardToWaiting)) {
      html +=
        '<p class="dlg-cost-payment-or-hint muted">コストは<strong>どちらか一方</strong>を選んで支払ってください。</p>';
    }
    if (cl.handDiscardToWaiting && cl.handDiscardToWaiting > 0) {
      html += '<div class="dlg-cost-payment-row">手札を ' + cl.handDiscardToWaiting + " 枚控え室へ置く</div>";
      html += '<div id="cost-pay-hand-grid" class="dlg-pick-kidou-waiting__grid dlg-cost-payment-hand-grid"></div>';
    }
    body.innerHTML = html;
    if (cl.costEnergy) {
      var eGrid = document.getElementById("cost-pay-energy-grid");
      var needE = cl.costEnergyCount != null ? Number(cl.costEnergyCount) : 1;
      if (eGrid) {
        state.energyArea.forEach(function (en, ei) {
          if (!en || en.type !== T_ENERGY || en.isRotated) return;
          var elab = "エネルギー " + (ei + 1);
          var emc = mergedCatalogCard(en);
          appendDialogPickTile(eGrid, {
            cardId: en.id,
            groupName: "cost-pay-energy-pick",
            label: elab,
            imgSrc: emc.img || en.img || "",
          });
        });
        if (!eGrid.children.length) {
          eGrid.innerHTML = '<p class="muted">アクティブなエネルギーがありません。側面エネルギーを追加してください。</p>';
        }
      }
    }
    if (cl.costPickMemberWait) {
      var mwGrid = document.getElementById("cost-pick-member-wait-grid");
      if (mwGrid) {
        var mwPool = stageMemberPickCandidates(cl.filters || {}, inst && inst.id != null ? inst.id : null);
        mwPool.forEach(function (m, mi) {
          var mmc = mergedCatalogCard(m);
          var mlab = ((mmc.card_no != null ? String(mmc.card_no) + " " : "") + (mmc.name || "")).trim();
          appendDialogPickTile(mwGrid, {
            cardId: m.id,
            groupName: "cost-pick-member-wait",
            inputType: "radio",
            label: mlab,
            imgSrc: mmc.img || m.img || "",
            checked: mi === 0,
          });
        });
        if (!mwGrid.children.length) {
          mwGrid.innerHTML = '<p class="muted">ウェイトにできるステージのメンバーがいません。</p>';
        }
      }
    }
    if (cl.handDiscardToWaiting && cl.handDiscardToWaiting > 0) {
      var grid = document.getElementById("cost-pay-hand-grid");
      if (grid) {
        state.hand.forEach(function (c) {
          var hmc = mergedCatalogCard(c);
          var lab = ((hmc.card_no != null ? String(hmc.card_no) + " " : "") + (hmc.name || "")).trim();
          appendDialogPickTile(grid, {
            cardId: c.id,
            groupName: "cost-pay-hand",
            label: lab,
            imgSrc: hmc.img || c.img || "",
          });
        });
      }
    }
    btnSkip.textContent = mandatory ? "キャンセル（解決しない）" : "支払わない";
    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnPay.removeEventListener("click", onPay);
      btnSkip.removeEventListener("click", onSkip);
      dlg.removeEventListener("cancel", onCx);
      if (dlgTitle) dlgTitle.innerHTML = prevTitleHtml || "コスト支払い";
      var vb = dlg.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function onPay() {
      var hids = [];
      if (cl.handDiscardToWaiting && cl.handDiscardToWaiting > 0) {
        var picked = body.querySelectorAll('input[name="cost-pay-hand"]:checked');
        for (var i = 0; i < picked.length; i++) hids.push(String(picked[i].value));
        if (hids.length !== Number(cl.handDiscardToWaiting)) {
          showToast("手札からちょうど " + cl.handDiscardToWaiting + " 枚選んでください");
          return;
        }
      }
      var selfWait = !!body.querySelector("#cost-self-wait:checked");
      var pickedMemberWaitId = null;
      if (cl.costPickMemberWait) {
        var mwPicked = body.querySelector('input[name="cost-pick-member-wait"]:checked');
        if (mwPicked) pickedMemberWaitId = String(mwPicked.value);
      }
      if (cl.costOrAlt && cl.costSelfWait && cl.handDiscardToWaiting) {
        var handOk = hids.length === Number(cl.handDiscardToWaiting);
        if (!selfWait && !handOk) {
          showToast("ウェイトにするか、手札を " + cl.handDiscardToWaiting + " 枚控え室に置いてください");
          return;
        }
        if (selfWait && handOk) {
          showToast("コストはどちらか一方のみ選んでください");
          return;
        }
      } else if (cl.costSelfWait && !selfWait && mandatory) {
        showToast("このメンバーのウェイトは必須です");
        return;
      }
      if (cl.costEnergy) {
        var needEn = cl.costEnergyCount != null ? Number(cl.costEnergyCount) : 1;
        var epicked = body.querySelectorAll('input[name="cost-pay-energy-pick"]:checked');
        if (epicked.length !== needEn) {
          showToast("アクティブなエネルギーを " + needEn + " 枚選んでください");
          return;
        }
        for (var ep = 0; ep < epicked.length; ep++) {
          var eid = String(epicked[ep].value);
          for (var ex = 0; ex < state.energyArea.length; ex++) {
            var enInst = state.energyArea[ex];
            if (enInst && String(enInst.id) === eid && !enInst.isRotated) {
              enInst.isRotated = true;
              break;
            }
          }
        }
      }
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      if (cl.costSelfWait && selfWait) {
        try {
          waitMemberInst(inst);
        } catch (_) {
          /* noop */
        }
      }
      if (cl.costPickMemberWait && pickedMemberWaitId) {
        var mwInst = findCardInstById(pickedMemberWaitId);
        if (mwInst) {
          try {
            waitMemberInst(mwInst);
            if (inst) inst._kidouGrantedWaitMemberId = String(pickedMemberWaitId);
          } catch (_) {
            /* noop */
          }
        }
      }
      if (hids.length) {
        state._lastCostPaidHandDiscardedIds = hids.slice();
        hids.forEach(function (hid) {
          var hi = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(hid);
          });
          if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
        });
      } else {
        state._lastCostPaidHandDiscardedIds = [];
      }
      render();
      done(true);
    }
    function onSkip() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      done(false);
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      done(false);
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, inst);
    var costKind =
      cl && cl.trigger
        ? cl.trigger
        : cl && cl.template && String(cl.template).indexOf("live") >= 0
          ? "live_start"
          : "kidou";
    pushLocalVersusEffectUi(inst, costKind, abilityPlainText(mc) || "");
    btnPay.addEventListener("click", onPay);
    btnSkip.addEventListener("click", onSkip);
    dlg.addEventListener("cancel", onCx);
    dlg.showModal();
  }

  function openHandDiscardToWaitingDialog(count, leadText, done, sourceInst) {
    var dlg = document.getElementById("dlg-cost-payment");
    var body = document.getElementById("dlg-cost-payment-body");
    var lead = document.getElementById("dlg-cost-payment-lead");
    var dlgTitle = document.getElementById("dlg-cost-payment-title");
    var btnPay = document.getElementById("dlg-cost-payment-pay");
    var btnSkip = document.getElementById("dlg-cost-payment-skip");
    if (!dlg || !body || !btnPay || typeof dlg.showModal !== "function") {
      done(false);
      return;
    }
    if (sourceInst) effectDialogPeekSourceInst = sourceInst;
    var prevTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    setEffectProcessingDialogTitle(dlgTitle, sourceInst, "効果の処理");
    if (lead) lead.textContent = leadText || "手札を控え室に置いてください";
    body.innerHTML =
      '<div class="dlg-cost-payment-row">手札を <strong>' +
      count +
      '</strong> 枚選んでください</div><div id="cost-pay-hand-grid" class="dlg-pick-kidou-waiting__grid dlg-cost-payment-hand-grid"></div>';
    var grid = document.getElementById("cost-pay-hand-grid");
    if (grid) {
      state.hand.forEach(function (c) {
        var hmc = mergedCatalogCard(c);
        var lab = ((hmc.card_no != null ? String(hmc.card_no) + " " : "") + (hmc.name || "")).trim();
        appendDialogPickTile(grid, {
          cardId: c.id,
          groupName: "cost-pay-hand",
          label: lab,
          imgSrc: hmc.img || c.img || "",
        });
      });
    }
    btnPay.textContent = "完了";
    btnSkip.textContent = "スキップ";
    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnPay.removeEventListener("click", onPay);
      btnSkip.removeEventListener("click", onSkip);
      dlg.removeEventListener("cancel", onCx);
      if (dlgTitle) dlgTitle.innerHTML = prevTitleHtml || "コスト支払い";
      var vb = dlg.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function onPay() {
      var picked = body.querySelectorAll('input[name="cost-pay-hand"]:checked');
      if (picked.length !== Number(count)) {
        showToast("手札からちょうど " + count + " 枚選んでください");
        return;
      }
      var hids = [];
      var discarded = [];
      for (var i = 0; i < picked.length; i++) hids.push(String(picked[i].value));
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      hids.forEach(function (hid) {
        var hi = state.hand.findIndex(function (h) {
          return h && String(h.id) === String(hid);
        });
        if (hi >= 0) {
          var moved = state.hand.splice(hi, 1)[0];
          state.waitingRoom.push(moved);
          discarded.push(moved);
        }
      });
      render();
      done(true, discarded);
    }
    function onSkip() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      try { dlg.close(); } catch (_) {}
      done(false);
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      done(false);
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, sourceInst);
    btnPay.addEventListener("click", onPay);
    btnSkip.addEventListener("click", onSkip);
    dlg.addEventListener("cancel", onCx);
    dlg.showModal();
  }

  function openHandKeepInHandDialog(keepCount, leadText, done, sourceInst) {
    var dlg = document.getElementById("dlg-cost-payment");
    var body = document.getElementById("dlg-cost-payment-body");
    var lead = document.getElementById("dlg-cost-payment-lead");
    var dlgTitle = document.getElementById("dlg-cost-payment-title");
    var btnPay = document.getElementById("dlg-cost-payment-pay");
    var btnSkip = document.getElementById("dlg-cost-payment-skip");
    if (!dlg || !body || !btnPay || typeof dlg.showModal !== "function") {
      done(false);
      return;
    }
    if (sourceInst) effectDialogPeekSourceInst = sourceInst;
    var prevTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    setEffectProcessingDialogTitle(dlgTitle, sourceInst, "効果の処理");
    if (lead) lead.textContent = leadText || "手札に残すカードを選んでください";
    body.innerHTML =
      '<div class="dlg-cost-payment-row">手札に残すカードを <strong>' +
      keepCount +
      '</strong> 枚選んでください（選ばなかったカードは控え室へ）</div><div id="cost-keep-hand-grid" class="dlg-pick-kidou-waiting__grid dlg-cost-payment-hand-grid"></div>';
    var grid = document.getElementById("cost-keep-hand-grid");
    if (grid) {
      state.hand.forEach(function (c) {
        var hmc = mergedCatalogCard(c);
        var lab = ((hmc.card_no != null ? String(hmc.card_no) + " " : "") + (hmc.name || "")).trim();
        appendDialogPickTile(grid, {
          cardId: c.id,
          groupName: "cost-keep-hand",
          label: lab,
          imgSrc: hmc.img || c.img || "",
        });
      });
    }
    btnPay.textContent = "完了";
    btnSkip.hidden = true;
    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnPay.removeEventListener("click", onPay);
      btnSkip.removeEventListener("click", onSkip);
      dlg.removeEventListener("cancel", onCx);
      btnSkip.hidden = false;
      if (dlgTitle) dlgTitle.innerHTML = prevTitleHtml || "コスト支払い";
      var vb = dlg.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function onPay() {
      var picked = body.querySelectorAll('input[name="cost-keep-hand"]:checked');
      if (picked.length !== Number(keepCount)) {
        showToast("手札に残すカードをちょうど " + keepCount + " 枚選んでください");
        return;
      }
      var keepIds = new Set();
      for (var i = 0; i < picked.length; i++) keepIds.add(String(picked[i].value));
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      var toDiscard = [];
      for (var hi = state.hand.length - 1; hi >= 0; hi--) {
        var h = state.hand[hi];
        if (!h) continue;
        if (keepIds.has(String(h.id))) continue;
        var moved = state.hand.splice(hi, 1)[0];
        state.waitingRoom.push(moved);
        toDiscard.push(moved);
      }
      render();
      done(true, toDiscard);
    }
    function onSkip() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      done(false);
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      done(false);
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, sourceInst);
    btnPay.addEventListener("click", onPay);
    btnSkip.addEventListener("click", onSkip);
    dlg.addEventListener("cancel", onCx);
    dlg.showModal();
  }

  function waitMemberInst(inst) {
    if (!inst) return;
    inst.isRotated = true;
    inst.lcWait = true;
    inst.lcActive = false;
  }

  function stageMemberPickCandidates(filters, excludeInstId) {
    var out = [];
    eachStageColumnMemberInsts().forEach(function (m) {
      if (!m || m.type !== T_MEMBER) return;
      if (excludeInstId && String(m.id) === String(excludeInstId)) return;
      if (m.lcWait === true) return;
      var cat = mergedCatalogCard(m);
      if (!catalogCardMatchesPickFilters(cat, filters || {})) return;
      out.push(m);
    });
    return out;
  }

  function waitingRoomPickCandidates(filters) {
    var out = [];
    (state.waitingRoom || []).forEach(function (c) {
      if (!c) return;
      var cat = mergedCatalogCard(c);
      if (filters && filters.pickType && cat.type !== filters.pickType) return;
      if (!catalogCardMatchesPickFilters(cat, filters || {})) return;
      out.push(c);
    });
    return out;
  }

  /** 控え室カードの登場時能力を1つ解決（SP-bp2-006 kidou / N-bp3-003 登場 等） */
  function openResolvePickedCardToujyouAbility(cardInst, onDone) {
    if (!cardInst) {
      if (onDone) onDone();
      return;
    }
    var mc = mergedCatalogCard(cardInst);
    var segRaws = listNativeToujouSegmentRaws(mc);
    if (!segRaws.length) {
      showToast("選んだカードに登場時能力がありません");
      if (onDone) onDone();
      return;
    }
    function resolveSegRaw(segRaw) {
      var clT = classifyCardAbility(mc, "toujyou", segRaw);
      if (abilityEffectIsAutomated(clT.template)) {
        runClassifiedCardAbility(cardInst, clT, "toujyou", onDone);
        return;
      }
      var dlg = document.getElementById("dlg-ability-guided");
      var body = document.getElementById("dlg-ability-guided-body");
      var btnDone = document.getElementById("dlg-ability-guided-done");
      var btnCx = document.getElementById("dlg-ability-guided-cancel");
      if (!dlg || !body || !btnDone || typeof dlg.showModal !== "function") {
        showToast("登場時能力を手動で解決してください");
        if (onDone) onDone();
        return;
      }
      if (cardInst) effectDialogPeekSourceInst = cardInst;
      var title = document.getElementById("dlg-ability-guided-title");
      if (title) title.textContent = (mc.name || "カード") + " — 登場時";
      body.innerHTML = abilityEffectBodyHtml(mc, "toujyou");
      function cleanup() {
        btnDone.removeEventListener("click", onDoneClick);
        if (btnCx) btnCx.removeEventListener("click", onCx);
        dlg.removeEventListener("cancel", onDismiss);
      }
      function closeDlg() {
        cleanup();
        try {
          dlg.close();
        } catch (_) {}
      }
      function onDoneClick() {
        closeDlg();
        if (onDone) onDone();
      }
      function onCx() {
        closeDlg();
        if (onDone) onDone();
      }
      function onDismiss() {
        closeDlg();
        if (onDone) onDone();
      }
      btnDone.addEventListener("click", onDoneClick);
      if (btnCx) btnCx.addEventListener("click", onCx);
      dlg.addEventListener("cancel", onDismiss);
      dlg.showModal();
    }
    if (segRaws.length === 1) {
      resolveSegRaw(segRaws[0]);
      return;
    }
    var labels = segRaws.map(function (sr, i) {
      var plain = String(sr || "")
        .replace(/\{\{[^}]+\}\}/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return plain.length > 80 ? plain.slice(0, 80) + "…" : plain || "登場時能力 " + (i + 1);
    });
    openAbilityMultiChoiceDialog(labels, 1, 1, "発動する登場時能力を選びます。", function (selected) {
      if (!selected || !selected.length) {
        if (onDone) onDone();
        return;
      }
      var idx = labels.indexOf(selected[0]);
      resolveSegRaw(segRaws[idx >= 0 ? idx : 0]);
    });
  }

  function countLiellaBatonSourcesOnInst(inst) {
    var ids = inst && inst._soloBatonMemberIds;
    if (!Array.isArray(ids) || ids.length < 2) return 0;
    var n = 0;
    ids.forEach(function (id) {
      var c = findCardInstById(id);
      if (c && catalogCardMatchesGroupTag(mergedCatalogCard(c), "Liella!")) n++;
    });
    return n;
  }

  function activateOneUprightEnergy() {
    for (var i = 0; i < state.energyArea.length; i++) {
      var e = state.energyArea[i];
      if (e && e.type === T_ENERGY && e.isRotated === true) {
        e.isRotated = false;
        e.lcWait = false;
        e.lcActive = true;
        showToast("エネルギー1枚をアクティブにしました");
        return true;
      }
    }
    if (state.energyArea.length < MAX_ENERGY_SIDE) {
      var e2 = energyInstance();
      e2.isRotated = false;
      e2.lcWait = false;
      e2.lcActive = true;
      state.energyArea.push(e2);
      showToast("エネルギーデッキからエネルギーを1枚アクティブにしました");
      return true;
    }
    showToast("アクティブにできるエネルギーがありません");
    return false;
  }

  function soloOpponentStageMemberCandidates(maxCost) {
    var dualPool = listInactiveOpponentMemberCandidates(maxCost);
    if (dualPool) return dualPool;
    var out = [];
    var seen = {};
    function add(c) {
      if (!c || c.type !== T_MEMBER) return;
      var mc = mergedCatalogCard(c);
      var cost = Number(mc.cost);
      if (!Number.isFinite(cost) || cost > maxCost) return;
      if (seen[String(c.id)]) return;
      seen[String(c.id)] = true;
      out.push(c);
    }
    ["left", "center", "right"].forEach(function (col) {
      (state.stage[col] || []).forEach(add);
    });
    state.hand.forEach(add);
    state.waitingRoom.forEach(add);
    return out;
  }

  /** @param {*} inst @param {string} targetCol @returns {boolean} */
  function swapStageMemberPositionChange(inst, targetCol) {
    if (!inst || !targetCol) return false;
    var fromCol = stageColumnKeyHostingMember(inst.id);
    if (!fromCol || fromCol === targetCol) return false;
    var fromSlot = (state.stage[fromCol] || []).slice();
    var toSlot = (state.stage[targetCol] || []).slice();
    var fromMemIdx = -1;
    for (var fi = 0; fi < fromSlot.length; fi++) {
      if (fromSlot[fi] && fromSlot[fi].type === T_MEMBER && String(fromSlot[fi].id) === String(inst.id)) {
        fromMemIdx = fi;
        break;
      }
    }
    if (fromMemIdx < 0) return false;
    var movingMem = fromSlot[fromMemIdx];
    var toMem = stageColumnIncumbentMember(targetCol);
    var fromE = fromSlot.filter(function (c) {
      return c && c.type === T_ENERGY;
    });
    var toE = toSlot.filter(function (c) {
      return c && c.type === T_ENERGY;
    });
    if (toMem) {
      state.stage[fromCol] = fromE.concat([toMem]);
      state.stage[targetCol] = toE.concat([movingMem]);
    } else {
      state.stage[fromCol] = fromE;
      state.stage[targetCol] = toE.concat([movingMem]);
    }
    try {
      fireJidouAutoForMember(movingMem, "area_move");
    } catch (jErr) {
      console.warn(jErr);
    }
    return true;
  }

  /** @param {*} inst @param {import('./abilityEffects.js').ClassifiedAbility} cl @returns {string[]} */
  function positionChangeTargetColumns(inst, cl) {
    var fromCol = stageColumnKeyHostingMember(inst && inst.id);
    if (!fromCol) return [];
    /** @type {string[]} */
    var cols = ["left", "center", "right"].filter(function (c) {
      return c !== fromCol;
    });
    if (cl.positionExcludeCenter) cols = cols.filter(function (c) {
      return c !== "center";
    });
    var tags = cl.positionTargetSeriesTags;
    if (tags && tags.length) {
      cols = cols.filter(function (col) {
        var mem = stageColumnIncumbentMember(col);
        if (!mem) return false;
        var mc = mergedCatalogCard(mem);
        for (var ti = 0; ti < tags.length; ti++) {
          if (catalogCardMatchesGroupTag(mc, tags[ti])) return true;
        }
        return false;
      });
    }
    return cols;
  }

  /**
   * @param {*} inst
   * @param {import('./abilityEffects.js').ClassifiedAbility} cl
   * @param {string} leadText
   * @param {(col: string | null) => void} onDone
   */
  function openPositionChangeColumnPickDialog(inst, cl, leadText, onDone) {
    var cols = positionChangeTargetColumns(inst, cl);
    if (!cols.length) {
      showToast("ポジションチェンジできるエリアがありません");
      onDone(null);
      return;
    }
    if (cols.length === 1) {
      onDone(cols[0]);
      return;
    }
    var labels = { left: "左サイド", center: "センター", right: "右サイド" };
    var pick = window.prompt(
      (leadText || "移動先エリアを選んでください") +
        "\n\n" +
        cols.map(function (c, i) {
          return String(i + 1) + ": " + labels[c];
        }).join("\n") +
        "\n\n番号を入力（キャンセルでスキップ）",
    );
    if (pick == null || String(pick).trim() === "") {
      onDone(null);
      return;
    }
    var idx = Number(String(pick).trim()) - 1;
    if (idx >= 0 && idx < cols.length) {
      onDone(cols[idx]);
      return;
    }
    showToast("無効な選択です");
    onDone(null);
  }

  /** @param {*} inst @param {(slot: number | null) => void} onDone @param {number[]} [allowedSlots] */
  function openHeartColorPickDialog(inst, onDone, allowedSlots) {
    /** @type {number[]} */
    var slots =
      allowedSlots && allowedSlots.length
        ? allowedSlots.filter(function (s) {
            return s >= 1 && s <= 6;
          })
        : [1, 2, 3, 4, 5, 6];
    if (!slots.length) slots = [1, 2, 3, 4, 5, 6];
    var names = ["", "桃", "赤", "黄", "緑", "青", "紫"];
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(slots.length === 1 ? slots[0] : null);
      return;
    }
    var prevOkLabel = btnOk.textContent;
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    if (lead) {
      lead.textContent = "好きなハートの色を選んでください（ライブ終了時まで得る）。";
    }
    if (dlgTitle) {
      if (inst) setEffectProcessingDialogTitle(dlgTitle, inst);
      else dlgTitle.textContent = "ハートの色を選ぶ";
    }
    btnOk.textContent = "この色を得る";
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid dlg-heart-color-pick__grid";
    slots.forEach(function (slot, i) {
      var href = Gsi.resolveGameStatusBundledHref(
        Gsi.GAME_STATUS_ICON_ART_DIR + "heart_0" + slot + ".png",
      );
      appendDialogPickTile(grid, {
        cardId: String(slot),
        groupName: "pickHeartColor",
        inputType: "radio",
        label: names[slot] || "ハート" + slot,
        imgSrc: href,
        checked: i === 0,
        tileClass: "dlg-pick-kidou-waiting__tile dlg-heart-color-pick__tile",
      });
    });
    list.appendChild(grid);

    function cleanup() {
      btnOk.textContent = prevOkLabel || "選択した1枚を手札に加える";
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || "回収対象カード — 1枚を手札に加える";
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var r = list.querySelector('input[name="pickHeartColor"]:checked');
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      if (!r) {
        onDone(null);
        return;
      }
      var slot = Number(String(r.value));
      onDone(slot >= 1 && slot <= 6 ? slot : null);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(null);
    }
    function onDismiss(ev) {
      ev.preventDefault();
      onCx();
    }
    btnOk.addEventListener("click", onOk);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  /** @param {*} inst @param {number} heartSlot */
  function grantHeartSlotUntilLiveEnd(inst, heartSlot, count) {
    if (!inst || heartSlot == null) return;
    ensureCardBoardFields(inst);
    var slot = Math.max(1, Math.min(6, Math.floor(Number(heartSlot))));
    var add =
      count != null && Number.isFinite(Number(count))
        ? Math.max(0, Math.floor(Number(count)))
        : 1;
    if (add < 1) return;
    inst.playBonusHeartSlotsAlways[slot] = sanitizeNonNegativeInt(inst.playBonusHeartSlotsAlways[slot]) + add;
    var names = ["", "桃", "赤", "黄", "緑", "青", "紫"];
    showToast(
      "ライブ終了時まで " +
        (names[slot] || "ハート") +
        " ハートを" +
        (add === 1 ? "1つ" : add + "つ") +
        "得ました",
    );
  }

  /**
   * @param {number} maxCost
   * @param {number} maxCount
   * @param {string} leadText
   * @param {(ok: boolean) => void} onDone
   */
  function openSoloOpponentMemberWaitPickMultiDialog(maxCost, maxCount, leadText, onDone) {
    var need = Math.max(1, Math.floor(Number(maxCount) || 1));
    /** @type {string[]} */
    var pickedIds = [];
    function step() {
      if (pickedIds.length >= need) {
        onDone(true);
        return;
      }
      var pool = soloOpponentStageMemberCandidates(maxCost).filter(function (c) {
        return pickedIds.indexOf(String(c.id)) < 0;
      });
      if (!pool.length) {
        if (pickedIds.length) onDone(true);
        else onDone(false);
        return;
      }
      openPickFromWaitingDialog(
        pool,
        leadText ||
          "相手ステージ想定: コスト" + maxCost + "以下のメンバーをウェイト（" + (pickedIds.length + 1) + "/" + need + "）",
        function (pid) {
          if (!pid) {
            onDone(pickedIds.length > 0);
            return;
          }
          if (isDualOpponentBoardMode()) {
            pushHistoryBefore("dual-opponent-wait");
            mutateInactiveOpponentBoard(function () {
              var inst = findCardInstById(pid);
              if (!inst) return;
              waitMemberInst(inst);
              try {
                fireJidouAfterOppMemberWaited(inst);
              } catch (jErr) {
                console.warn(jErr);
              }
            });
            pickedIds.push(String(pid));
            step();
            return;
          }
          var t = findCardInstById(pid);
          if (!t) {
            step();
            return;
          }
          pushHistoryBefore("solo-opponent-wait");
          waitMemberInst(t);
          t._soloOpponentProxy = true;
          try {
            fireJidouAfterOppMemberWaited(t);
          } catch (jErr) {
            console.warn(jErr);
          }
          pickedIds.push(String(pid));
          step();
        },
        {
          okLabel: "ウェイトにする",
          dialogTitle: "相手のメンバーをウェイト",
          zoneLabelFn: soloOpponentMemberZoneLabel,
        },
      );
    }
    step();
  }

  /**
   * @param {number} maxCost
   * @param {string} leadText
   * @param {(ok: boolean) => void} onDone
   */
  function openSoloOpponentMemberWaitPickDialog(maxCost, leadText, onDone) {
    var pool = soloOpponentStageMemberCandidates(maxCost);
    if (!pool.length) {
      showToast("ウェイトにできるメンバーがありません（コスト" + maxCost + "以下）");
      onDone(false);
      return;
    }
    openPickFromWaitingDialog(
      pool,
      leadText ||
        "ソロプレイ: 相手ステージ想定のメンバー（コスト" + maxCost + "以下）を選び、ウェイトにします。",
      function (pid) {
        if (!pid) {
          onDone(false);
          return;
        }
        if (isDualOpponentBoardMode()) {
          pushHistoryBefore("dual-opponent-wait");
          var waited = mutateInactiveOpponentBoard(function () {
            var inst = findCardInstById(pid);
            if (!inst) return false;
            waitMemberInst(inst);
            try {
              fireJidouAfterOppMemberWaited(inst);
            } catch (jErr) {
              console.warn(jErr);
            }
            try {
              syncJoujiPassiveEffectsAll();
            } catch (_) {}
            showToast((mergedCatalogCard(inst).name || "メンバー") + " をウェイトにしました");
            return true;
          });
          onDone(!!waited);
          return;
        }
        var t = findCardInstById(pid);
        if (!t) {
          showToast("選択したカードが見つかりませんでした");
          onDone(false);
          return;
        }
        pushHistoryBefore("solo-opponent-wait");
        waitMemberInst(t);
        t._soloOpponentProxy = true;
        try {
          fireJidouAfterOppMemberWaited(t);
        } catch (jErr) {
          console.warn(jErr);
        }
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast((mergedCatalogCard(t).name || "メンバー") + " をウェイトにしました（相手想定）");
        onDone(true);
      },
      {
        okLabel: "ウェイトにする",
        dialogTitle: "相手のメンバーをウェイト",
        zoneLabelFn: soloOpponentMemberZoneLabel,
      },
    );
  }

  /**
   * @param {*} enteringInst
   * @param {(proceed: boolean, batonIds: string[]) => void} onDone
   */
  function openSumireCenterDoubleBatonDialog(enteringInst, onDone) {
    var centerMem = stageColumnIncumbentMember("center");
    var leftMem = stageColumnIncumbentMember("left");
    var rightMem = stageColumnIncumbentMember("right");
    if (!centerMem) {
      var okEmpty = window.confirm(
        "センターにメンバーがいません。\nバトンタッチなしで登場しますか？",
      );
      onDone(!!okEmpty, []);
      return;
    }
    if (memberIsStageFreshThisTurn(centerMem)) {
      showToast(
        (mergedCatalogCard(centerMem).name || "メンバー") +
          " はこのターンにステージへ載せたばかりのため、バトンタッチできません",
      );
      onDone(false, []);
      return;
    }
    if (centerMem._joujiCannotBatonToWaiting === true) {
      showToast(
        (mergedCatalogCard(centerMem).name || "メンバー") +
          " はバトンタッチで控え室に置けないため、登場できません",
      );
      onDone(false, []);
      return;
    }
    if (!leftMem && !rightMem) {
      var okOne = window.confirm(
        "左右サイドにメンバーがいません。\nセンターの " +
          (mergedCatalogCard(centerMem).name || "メンバー") +
          " 1人とバトンタッチして登場しますか？",
      );
      onDone(!!okOne, okOne ? [String(centerMem.id)] : []);
      return;
    }
    function finishWithSide(sideCol) {
      var sideMem = sideCol === "left" ? leftMem : rightMem;
      if (!sideMem) {
        onDone(false, []);
        return;
      }
      if (memberIsStageFreshThisTurn(sideMem)) {
        showToast(
          (mergedCatalogCard(sideMem).name || "メンバー") +
            " はこのターンにステージへ載せたばかりのため、バトンタッチできません",
        );
        onDone(false, []);
        return;
      }
      if (sideMem._joujiCannotBatonToWaiting === true) {
        showToast(
          (mergedCatalogCard(sideMem).name || "メンバー") +
            " はバトンタッチで控え室に置けないため、登場できません",
        );
        onDone(false, []);
        return;
      }
      onDone(true, [String(centerMem.id), String(sideMem.id)]);
    }
    if (leftMem && rightMem) {
      var sideLabels = [
        "左サイド／" + (mergedCatalogCard(leftMem).name || "メンバー"),
        "右サイド／" + (mergedCatalogCard(rightMem).name || "メンバー"),
      ];
      openAbilityMultiChoiceDialog(
        sideLabels,
        1,
        1,
        "センターのメンバーとバトンタッチするサイドを選んでください。",
        function (selected) {
          if (!selected || !selected.length) {
            onDone(false, []);
            return;
          }
          finishWithSide(selected[0].indexOf("左") >= 0 ? "left" : "right");
        },
      );
      return;
    }
    finishWithSide(leftMem ? "left" : "right");
  }

  function openTwoMemberBatonPickDialog(enteringInst, onDone) {
    /** @type {Array<{inst:any, col:string}>} */
    var mems = [];
    ["left", "center", "right"].forEach(function (col) {
      (state.stage[col] || []).forEach(function (c) {
        if (!c || c.type !== T_MEMBER) return;
        if (enteringInst && String(c.id) === String(enteringInst.id)) return;
        mems.push({ inst: c, col: col });
      });
    });
    if (mems.length < 2) {
      var okFew = window.confirm(
        "ステージにバトンタッチ元のメンバーが2人未満です。\n2人バトンなしで登場しますか？",
      );
      onDone(!!okFew, []);
      return;
    }
    var labels = mems.map(function (m) {
      var mc = mergedCatalogCard(m.inst);
      var colJa = m.col === "left" ? "左" : m.col === "right" ? "右" : "センター";
      var tag = catalogCardMatchesGroupTag(mc, "Liella!") ? " 『Liella!』" : "";
      return colJa + "／" + (mc.name || mc.card_no || "メンバー") + tag;
    });
    openAbilityMultiChoiceDialog(
      labels,
      0,
      2,
      "2人のメンバーとバトンタッチして登場（0〜2人・任意）",
      function (selected) {
        /** @type {string[]} */
        var ids = [];
        (selected || []).forEach(function (lab) {
          var ix = labels.indexOf(lab);
          if (ix >= 0 && mems[ix] && mems[ix].inst) ids.push(String(mems[ix].inst.id));
        });
        onDone(true, ids);
      },
    );
  }

  function emptyStageColumns() {
    return ["left", "center", "right"].filter(function (k) {
      return !(state.stage[k] || []).some(function (c) {
        return c && c.type === T_MEMBER;
      });
    });
  }

  function finalizeWaitingMemberStageEntry(snapBefore) {
    if (!snapBefore || typeof snapBefore !== "object") return;
    try {
      stampNewStageMembersForGlow(snapBefore);
    } catch (_) {}
    try {
      maybeRotateEnergyCostForMembersNewOnStage(snapBefore);
    } catch (_) {}
    try {
      syncPlayBonusesAfterStageMembershipChange(snapBefore);
    } catch (_) {}
    try {
      activateToujouEffectsOnStageEntry(snapBefore);
    } catch (_) {}
  }

  function placeWaitingMemberToStageColumn(memberInst, col) {
    var wi = -1;
    for (var j = 0; j < state.waitingRoom.length; j++) {
      if (state.waitingRoom[j] && String(state.waitingRoom[j].id) === String(memberInst.id)) {
        wi = j;
        break;
      }
    }
    if (wi < 0) return false;
    if (!stageColumnAllowsMemberEntry(col)) return false;
    var slot = state.stage[col] || [];
    var hasMem = slot.some(function (c) {
      return c && c.type === T_MEMBER;
    });
    if (hasMem) return false;
    var snap = snapshotBoard();
    var mem = state.waitingRoom.splice(wi, 1)[0];
    mem._enteredFromWaitingRoom = true;
    var energies = slot.filter(function (c) {
      return c && c.type === T_ENERGY;
    });
    if (!state.stage[col]) state.stage[col] = [];
    state.stage[col] = energies.concat([mem]);
    finalizeWaitingMemberStageEntry(snap);
    return true;
  }

  function runToujouLiellaDoubleBatonCenter(inst, cl, finishResolved) {
    if (countLiellaBatonSourcesOnInst(inst) < 2) {
      showToast("『Liella!』のメンバー2人からのバトンタッチ条件を満たしていないためスキップしました");
      finishResolved();
      return;
    }
    var drawN = cl.deckDrawCount || 2;
    if (state.deck.length < drawN) {
      showToast("山札が " + drawN + " 枚ありません（残り " + state.deck.length + " 枚）");
      finishResolved();
      return;
    }
    pushHistoryBefore("toujou-liella-baton-center");
    var drawn = [];
    for (var d = 0; d < drawN; d++) {
      if (state.deck.length) drawn.push(state.deck.shift());
    }
    drawn.forEach(function (c) {
      state.hand.push(c);
    });
    render();
    presentAbilityDrawsToHand(drawn, inst);
    var cand = waitingPickCandidates(cl.filters || {}, null);
    if (!cand.length) {
      showToast("山札から " + drawn.length + " 枚引きましたが、控え室に登場させられる『Liella!』メンバーがありません");
      finishResolved();
      return;
    }
    var emptyCols = emptyStageColumns();
    if (!emptyCols.length) {
      showToast("山札から " + drawn.length + " 枚引きましたが、空きステージエリアがありません");
      finishResolved();
      return;
    }
    render();
    openPickFromWaitingDialog(
      cand,
      "登場時: 控え室の『Liella!』メンバー（コスト4以下）を空きステージエリアに登場させます。",
      function (pid) {
        if (!pid) {
          showToast("山札から " + drawn.length + " 枚引き、メンバー登場はスキップしました");
          finishResolved();
          return;
        }
        var pick = null;
        for (var i = 0; i < state.waitingRoom.length; i++) {
          if (state.waitingRoom[i] && String(state.waitingRoom[i].id) === String(pid)) {
            pick = state.waitingRoom[i];
            break;
          }
        }
        if (!pick) {
          finishResolved();
          return;
        }
        if (emptyCols.length === 1) {
          if (placeWaitingMemberToStageColumn(pick, emptyCols[0])) {
            showToast(
              (mergedCatalogCard(pick).name || "メンバー") +
                " を " +
                (emptyCols[0] === "left" ? "左サイド" : emptyCols[0] === "right" ? "右サイド" : "センター") +
                " に登場させ、山札から " +
                drawn.length +
                " 枚引きました",
            );
          }
          finishResolved();
          return;
        }
        var colPickLabels = emptyCols.map(function (k) {
          return k === "left" ? "左サイド（空き）" : k === "right" ? "右サイド（空き）" : "センター（空き）";
        });
        openAbilityMultiChoiceDialog(colPickLabels, 1, 1, "登場させる空きエリアを選んでください。", function (cols) {
          if (!cols || !cols.length) {
            finishResolved();
            return;
          }
          var ix = colPickLabels.indexOf(cols[0]);
          var targetCol = ix >= 0 ? emptyCols[ix] : emptyCols[0];
          placeWaitingMemberToStageColumn(pick, targetCol);
          showToast(
            (mergedCatalogCard(pick).name || "メンバー") +
              " を登場させ、山札から " +
              drawn.length +
              " 枚引きました",
          );
          finishResolved();
        });
      },
    );
  }

  function successfulLiveAreaHasSeriesTag(tag) {
    if (!tag) return false;
    for (var i = 0; i < state.successfulLiveArea.length; i++) {
      var c = state.successfulLiveArea[i];
      if (!successLiveAreaCardIsLive(c)) continue;
      var cat = mergedCatalogCard(c);
      if (catalogCardMatchesGroupTag(cat, tag)) return true;
    }
    return false;
  }

  function putEnergyFromDeckInWait() {
    if (state.energyArea.length >= MAX_ENERGY_SIDE) {
      showToast("側面エネルギーが上限のため、エネルギーを置けません");
      return false;
    }
    var e = energyInstance();
    e.isRotated = true;
    e.lcWait = true;
    e.lcActive = false;
    state.energyArea.push(e);
    showToast("エネルギーデッキからエネルギーを1枚ウェイト状態で置きました");
    return true;
  }

  function isVersusLiveSuccessFxStep(remoteMatch) {
    return (
      versusMatchPhaseActive() &&
      remoteMatch &&
      normalizeVersusPhase(remoteMatch) === "live" &&
      getVersusLiveStep(remoteMatch) === "successFx"
    );
  }

  /** ライブ成功＋残りエール0確定後、0.5秒待って成功時効果を誘発する */
  function syncLiveSuccessEffectActivation() {
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      if (!isVersusLiveSuccessFxStep(versusSession.remoteMatch)) {
        clearLiveSuccessEffectSchedule();
        return;
      }
    }
    if (!playLiveSuccessVerdictReady()) {
      clearLiveSuccessEffectSchedule();
      return;
    }
    activateLiveSuccessEffectsAfterJudge();
    if (liveSuccessEffectScheduleTimer) return;
    liveSuccessEffectScheduleTimer = setTimeout(function () {
      liveSuccessEffectScheduleTimer = null;
      if (!playLiveSuccessVerdictReady()) return;
      var fp = liveSuccessVerdictFingerprint();
      if (!fp || fp === lastLiveSuccessOrchestrateFp) return;
      lastLiveSuccessOrchestrateFp = fp;
      orchestratePendingTriggeredEffects(["live_success"]);
    }, 500);
  }

  function runAbilityChoiceTextsSequential(texts, idx, inst, cl, kind, finishResolved) {
    if (idx >= texts.length) {
      finishResolved();
      return;
    }
    executeAbilityChoiceText(texts[idx], inst, cl, kind, function () {
      runAbilityChoiceTextsSequential(texts, idx + 1, inst, cl, kind, finishResolved);
    });
  }

  function executeAbilityChoiceText(text, inst, cl, kind, onDone) {
    var t = String(text || "");
    onDone = typeof onDone === "function" ? onDone : function () {};
    if (/このカードは/.test(t) && /を得る/.test(t) && /引/.test(t)) {
      if (!inst._grantedTriggerSegmentRaws) inst._grantedTriggerSegmentRaws = [];
      var grantDrawSeg = "{{live_success.png|ライブ成功時}}カードを1枚引く。";
      var hasGrant = false;
      inst._grantedTriggerSegmentRaws.forEach(function (entry) {
        if (entry && entry.trigger === "live_success" && entry.segRaw === grantDrawSeg) hasGrant = true;
      });
      if (!hasGrant) {
        inst._grantedTriggerSegmentRaws.push({ trigger: "live_success", segRaw: grantDrawSeg });
      }
      showToast("このカードはライブ成功時「カードを1枚引く」を得ました");
      render();
      onDone();
      return;
    }
    if (/バトンタッチして登場/.test(t) && /ライブ終了時まで/.test(t)) {
      var batonPool = eachStageColumnMemberInsts().filter(function (m) {
        if (!m || !m._toujouBatonFromLowerCostMemberId) return false;
        if (cl.filters && cl.filters.seriesTag && !catalogCardMatchesGroupTag(mergedCatalogCard(m), cl.filters.seriesTag)) {
          return false;
        }
        return true;
      });
      if (!batonPool.length) {
        showToast("バトンタッチ登場した対象メンバーがいません");
        onDone();
        return;
      }
      pushHistoryBefore("ability-choice-baton-heart");
      openPickFromWaitingDialog(batonPool, "バトンタッチ登場したメンバー1人にハートを付与します。", function (pid) {
        if (pid) {
          var bm = findCardInstById(pid);
          if (bm) grantHeartSlotUntilLiveEnd(bm, 2, 1);
        }
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        render();
        onDone();
      });
      return;
    }
    if (/成功ライブカード置き場/.test(t) && /スコアを/.test(t)) {
      var choiceCl = {
        template: "live_card_score_plus",
        cardScoreGrant: 1,
        filters: parseAbilityPickFilters(t),
      };
      if (!checkCardScorePlusPreconditions(choiceCl, mergedCatalogCard(inst), kind)) {
        showToast("スコアアップ効果の条件を満たしていません");
        onDone();
        return;
      }
      pushHistoryBefore("ability-choice-score-plus");
      applyLiveCardScorePlus(inst, choiceCl.cardScoreGrant || 1, "このカードのスコアを＋1 しました");
      onDone();
      return;
    }
    if (/このメンバー以外/.test(t) && /ライブ終了時まで/.test(t) && (/ブレード/.test(t) || /を得る/.test(t))) {
      pushHistoryBefore("ability-choice-stage-blade");
      openPickStageMemberDialog(inst.id, "ステージの対象メンバー1人にブレードを付与します。", function (pid) {
        if (pid) {
          var tm = findCardInstById(pid);
          if (tm) gainBladesUntilEnd(tm, cl.bladeGain || 1);
        }
        render();
        onDone();
      });
      return;
    }
    if (/ポジションチェンジ/.test(t)) {
      var posPool = eachStageColumnMemberInsts().filter(function (m) {
        if (!m) return false;
        if (/SaintSnow/i.test(t)) return catalogCardMatchesGroupTag(mergedCatalogCard(m), "SaintSnow");
        return true;
      });
      if (!posPool.length) {
        showToast("ポジションチェンジできるメンバーがいません");
        onDone();
        return;
      }
      pushHistoryBefore("ability-choice-position-change");
      openPickFromWaitingDialog(posPool, "ポジションチェンジするメンバーを選びます。", function (pid) {
        if (!pid) {
          onDone();
          return;
        }
        var posMem = findCardInstById(pid);
        if (!posMem) {
          onDone();
          return;
        }
        openPositionChangeColumnPickDialog(posMem, {}, "ポジションチェンジ: 移動先エリアを選びます。", function (targetCol) {
          if (targetCol) {
            var snapPc = snapshotBoard();
            if (swapStageMemberPositionChange(posMem, targetCol)) {
              posMem._movedStageAreaThisTurn = true;
              try {
                syncPlayBonusesAfterStageMembershipChange(snapPc);
                syncJoujiPassiveEffectsAll();
              } catch (_) {}
              showToast("ポジションチェンジしました");
            }
          }
          render();
          onDone();
        });
      });
      return;
    }
    if (/相手のステージ/.test(t) && /ウェイト/.test(t)) {
      var costM = t.match(/コスト(\d+)以下/);
      var maxC = costM ? Number(costM[1]) : 4;
      openSoloOpponentMemberWaitPickDialog(maxC, null, function () {
        render();
        onDone();
      });
      return;
    }
    if (/カードを.*1枚引/.test(t) || /カードを1枚引く/.test(t)) {
      if (!state.deck.length) {
        showToast("山札がありません");
        onDone();
        return;
      }
      pushHistoryBefore("ability-choice-draw");
      var drawn = state.deck.shift();
      state.hand.push(drawn);
      presentAbilityDrawsToHand([drawn], inst);
      showToast("山札から1枚引きました");
      render();
      onDone();
      return;
    }
    if (/エネルギーデッキ/.test(t) && /ウェイト/.test(t)) {
      pushHistoryBefore("ability-choice-energy-wait");
      putEnergyFromDeckInWait();
      render();
      onDone();
      return;
    }
    if (/控え室/.test(t) && /メンバー/.test(t) && /手札に加/.test(t)) {
      var cand = waitingPickCandidates({ pickType: T_MEMBER }, null);
      if (!cand.length) {
        showToast("控え室にメンバーカードがありません");
        onDone();
        return;
      }
      pushHistoryBefore("ability-choice-wait-member");
      openPickFromWaitingDialog(cand, "効果: 控え室からメンバーを1枚手札に加えます。", function (pid) {
        if (!pid) {
          showToast("選択をスキップしました");
          render();
          onDone();
          return;
        }
        var got = moveInstFromWaitingToHand(pid, inst);
        if (got) showToast((mergedCatalogCard(got).name || "カード") + " を手札に加えました");
        render();
        onDone();
      });
      return;
    }
    showToast("この選択肢は手動で処理してください: " + t);
    openAbilityGuidedDialog(inst, kind, onDone);
  }

  /**
   * @param {string[]} choices
   * @param {number} minPick
   * @param {number} maxPick
   * @param {string} leadText
   * @param {(selected: string[]) => void} onDone
   */
  function openAbilityMultiChoiceDialog(choices, minPick, maxPick, leadText, onDone) {
    var dlg = document.getElementById("dlg-pick-ability-choice");
    var list = document.getElementById("dlg-pick-ability-choice-list");
    var lead = document.getElementById("dlg-pick-ability-choice-lead");
    var btnOk = document.getElementById("dlg-pick-ability-choice-ok");
    var btnCx = document.getElementById("dlg-pick-ability-choice-cancel");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone([]);
      return;
    }
    var minN = Math.max(0, Math.floor(Number(minPick) || 0));
    var maxN = Math.max(minN, Math.floor(Number(maxPick) || minN));
    if (lead) {
      lead.textContent =
        (leadText || "効果を選んでください。") +
        (maxN > 1 ? "（" + minN + "〜" + maxN + " 個）" : "（1 つ）");
    }
    list.innerHTML = "";
    var multi = maxN > 1;
    choices.forEach(function (label, i) {
      var lab = document.createElement("label");
      lab.className = "dlg-pick-ability-choice__row";
      var inp = document.createElement("input");
      inp.type = multi ? "checkbox" : "radio";
      inp.name = "abilityChoicePick";
      inp.value = String(i);
      inp.className = "dlg-pick-ability-choice__input";
      var cap = document.createElement("span");
      cap.className = "dlg-pick-ability-choice__label";
      cap.textContent = label;
      lab.appendChild(inp);
      lab.appendChild(cap);
      list.appendChild(lab);
    });
    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onCx);
      var abActions = dlg.querySelector(".app-dialog__actions");
      var vb = abActions && abActions.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function onOk(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      var picked = list.querySelectorAll(
        multi ? 'input[name="abilityChoicePick"]:checked' : 'input[name="abilityChoicePick"]:checked',
      );
      if (!multi) {
        var r = list.querySelector('input[name="abilityChoicePick"]:checked');
        picked = r ? [r] : [];
      }
      if (picked.length < minN || picked.length > maxN) {
        showToast(minN === maxN ? "ちょうど " + minN + " つ選んでください" : minN + "〜" + maxN + " 個選んでください");
        return;
      }
      var texts = [];
      for (var pi = 0; pi < picked.length; pi++) {
        var ix = Number(picked[pi].value);
        if (Number.isFinite(ix) && choices[ix]) texts.push(choices[ix]);
      }
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      queueMicrotask(function () {
        onDone(texts);
      });
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone([]);
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg);
    btnOk.addEventListener("click", onOk);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onCx);
    dlg.showModal();
  }

  /**
   * 手札から任意枚数（0枚可）を控え室へ。filterFn(inst) が true のカードだけ選択可能。
   * @param {string} leadText
   * @param {(inst: *) => boolean} filterFn
   * @param {(pickedIds: string[] | null) => void} onDone
   */
  var ABILITY_DRAW_TO_DISCARD_PAUSE_MS = 2000;

  function scheduleHandDiscardAfterAbilityDraw(opts) {
    var discardN = Math.max(1, Math.floor(Number(opts.discardN) || 1));
    var discardLead = opts.discardLead || "手札を控え室に置いてください";
    var drawnCountMsg = Math.max(0, Math.floor(Number(opts.drawnCount) || 0));
    var finishResolved = opts.finishResolved;
    var drawnToast = opts.drawnToast || "山札から " + drawnCountMsg + " 枚引きました";
    if (state.hand.length < discardN) {
      showToast(
        "手札が " + discardN + " 枚なく、捨てられません（引いた後 " + state.hand.length + " 枚）",
      );
      if (finishResolved) finishResolved();
      return;
    }
    showToast(drawnToast + "（2 秒後に手札を捨てます）");
    setTimeout(function () {
      openHandDiscardToWaitingDialog(
        discardN,
        discardLead,
        function (ok, discarded) {
          if (!ok) {
            showToast("手札を控え室に置かなかったため、効果の一部をスキップしました");
          } else if (opts.inst && opts.cl) {
            applyPostDiscardNonBhMemberEffects(opts.inst, discarded || [], opts.cl);
          }
          showToast(drawnToast);
          if (finishResolved) finishResolved();
        },
        opts.inst,
      );
    }, ABILITY_DRAW_TO_DISCARD_PAUSE_MS);
  }

  function openPickHandOptionalMultiToWaiting(leadText, filterFn, onDone, dialogOpts) {
    var pool = state.hand.filter(function (h) {
      return h && (!filterFn || filterFn(h));
    });
    if (!pool.length) {
      onDone([]);
      return;
    }
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    var dlgTitle = document.getElementById("dlg-pick-kidou-waiting-title");
    if (!dlg || !list || !btnOk) {
      onDone([]);
      return;
    }
    var prevOkLabel = btnOk.textContent;
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    var titleInst = (dialogOpts && dialogOpts.sourceInst) || effectDialogPeekSourceInst;
    if (dialogOpts && typeof dialogOpts.okLabel === "string" && dialogOpts.okLabel) {
      btnOk.textContent = dialogOpts.okLabel;
    }
    if (titleInst && dlgTitle) {
      setEffectProcessingDialogTitle(dlgTitle, titleInst);
    } else if (dialogOpts && typeof dialogOpts.dialogTitle === "string" && dialogOpts.dialogTitle && dlgTitle) {
      dlgTitle.textContent = dialogOpts.dialogTitle;
    }
    if (lead) lead.textContent = leadText;
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    pool.forEach(function (c) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || "")).trim();
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "pickHandOptionalWait";
      cb.value = String(c.id);
      cb.className = "dlg-pick-kidou-waiting__radio";
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      if (mc.img || c.img) img.src = mc.img || c.img;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      labEl.appendChild(cb);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      grid.appendChild(labEl);
    });
    list.appendChild(grid);

    function cleanup() {
      btnOk.textContent = prevOkLabel || "選択した1枚を手札に加える";
      if (dlgTitle) dlgTitle.innerHTML = prevDialogTitleHtml || "回収対象カード — 1枚を手札に加える";
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var checked = list.querySelectorAll('input[name="pickHandOptionalWait"]:checked');
      var ids = [];
      for (var i = 0; i < checked.length; i++) ids.push(String(checked[i].value));
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(ids);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
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

  function runPb1018WaitEnterFlow(isOpponent, maxCost, onDone) {
    var waitCand;
    if (isOpponent && isDualOpponentBoardMode()) {
      waitCand =
        readInactiveOpponentBoard(function () {
          return waitingPickCandidates({ pickType: T_MEMBER, maxCost: maxCost }, null);
        }) || [];
    } else {
      waitCand = waitingPickCandidates({ pickType: T_MEMBER, maxCost: maxCost }, null);
    }
    if (!waitCand.length) {
      showToast((isOpponent ? "相手想定: " : "") + "控え室にコスト" + maxCost + "以下のメンバーがありません");
      onDone();
      return;
    }
    openPickFromWaitingDialog(
      waitCand,
      (isOpponent ? "相手想定: " : "") +
        "控え室からコスト" +
        maxCost +
        "以下のメンバーを1枚選び、空きエリアにウェイトで登場させます。",
      function (pid) {
        runPb1018PlaceMember(pid, isOpponent, onDone);
      },
      {
        okLabel: "選んだカードを登場させる",
        dialogTitle: "蘇生対象カード — 1枚を選ぶ",
      },
    );
  }

  function runPb1018PlaceMember(pid, isOpponent, onDone) {
    if (!pid) {
      onDone();
      return;
    }
    var dualOpp = isOpponent && isDualOpponentBoardMode();
    /** @type {string[]} */
    var cols;
    if (dualOpp) {
      var prep = readInactiveOpponentBoard(function () {
        var openCols = emptyStageColumns().filter(function (c) {
          return !isStageColumnEntryBlocked(c);
        });
        var mem = state.waitingRoom.find(function (w) {
          return w && String(w.id) === String(pid);
        });
        if (!mem) return null;
        return { cols: openCols };
      });
      if (!prep || !prep.cols || !prep.cols.length) {
        showToast("空きのステージエリアがありません");
        onDone();
        return;
      }
      cols = prep.cols;
    } else {
      cols = emptyStageColumns().filter(function (c) {
        return !isStageColumnEntryBlocked(c);
      });
      if (!cols.length) {
        showToast("空きのステージエリアがありません");
        onDone();
        return;
      }
    }
    var colLabels = cols.map(function (c) {
      return c === "left" ? "左サイド" : c === "right" ? "右サイド" : "センター";
    });
    openAbilityMultiChoiceDialog(colLabels, 1, 1, "登場させるエリアを選び、決定してください。", function (picked) {
      if (!picked || !picked.length) {
        onDone();
        return;
      }
      var side = picked[0].indexOf("左") >= 0 ? "left" : picked[0].indexOf("右") >= 0 ? "right" : "center";
      if (dualOpp) {
        mutateInactiveOpponentBoard(function () {
          var memOpp = state.waitingRoom.find(function (w) {
            return w && String(w.id) === String(pid);
          });
          if (!memOpp || !placeWaitingMemberToStageColumnWait(memOpp, side)) {
            showToast("登場できませんでした");
            return;
          }
          blockStageColumnEntryThisTurn(side);
          showToast(
            (mergedCatalogCard(memOpp).name || "メンバー") +
              " を " +
              (side === "left" ? "左" : side === "right" ? "右" : "センター") +
              " にウェイトで登場させました",
          );
        });
        onDone();
        return;
      }
      var mem = state.waitingRoom.find(function (w) {
        return w && String(w.id) === String(pid);
      });
      if (!mem) {
        onDone();
        return;
      }
      if (!placeWaitingMemberToStageColumnWait(mem, side)) {
        showToast("登場できませんでした");
        onDone();
        return;
      }
      if (isOpponent) mem._soloOpponentProxy = true;
      blockStageColumnEntryThisTurn(side);
      showToast(
        (mergedCatalogCard(mem).name || "メンバー") +
          " を " +
          (side === "left" ? "左" : side === "right" ? "右" : "センター") +
          " にウェイトで登場させました",
      );
      onDone();
    });
  }

  function sumStageHeartSlotCount(slotNum) {
    var slot = Math.floor(Number(slotNum));
    if (!(slot >= 1 && slot <= 6)) return 0;
    var acc = stageHeldHeartSlotAccum();
    return Math.max(0, Math.floor(Number(acc[slot]) || 0));
  }

  function sumStageTotalPrintedHeartsAll() {
    var sum = 0;
    eachStageColumnMemberInsts().forEach(function (m) {
      sum += memberTotalPrintedHearts(m);
    });
    return sum;
  }

  function isVersusMainPhaseNow() {
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      var ph = normalizeVersusPhase(versusSession.remoteMatch);
      return ph === "firstNormal" || ph === "secondNormal";
    }
    return canUseKidouEffectsNow();
  }

  /** @param {(target: 'self'|'opponent'|null) => void} onPick */
  function openPickSelfOrOpponentDialog(onPick) {
    var selfLabel =
      versusDualBoardActive() && versusSession && versusSession.activeRole
        ? versusLocalDualRoleLabel(versusSession.activeRole)
        : "自分";
    var oppLabel = versusDualBoardActive()
      ? versusLocalDualRoleLabel(versusLocalDualInactiveRole())
      : "相手";
    openAbilityMultiChoiceDialog([selfLabel, oppLabel], 1, 1, "対象プレイヤーを選んでください。", function (picked) {
      if (!picked || !picked.length) {
        onPick(null);
        return;
      }
      onPick(picked[0] === selfLabel ? "self" : "opponent");
    });
  }

  /**
   * @param {'self'|'opponent'} target
   * @param {() => boolean|void} fn
   * @returns {boolean}
   */
  function runOnTargetPlayerBoard(target, fn) {
    if (target === "opponent") {
      if (versusOnlineActive()) {
        showToast("相手盤面の操作は相手側で行ってください");
        return false;
      }
      if (isDualOpponentBoardMode()) {
        return !!mutateInactiveOpponentBoard(fn);
      }
      return !!fn();
    }
    return !!fn();
  }

  /**
   * @param {'self'|'opponent'} target
   * @template T
   * @param {() => T} fn
   * @returns {T|null}
   */
  function readFromTargetPlayerBoard(target, fn) {
    if (target === "opponent") {
      if (versusOnlineActive()) return null;
      if (isDualOpponentBoardMode()) return readInactiveOpponentBoard(fn);
    }
    return fn();
  }

  function boardHasLowScoreLiveCard(maxScore) {
    var cap = Math.floor(Number(maxScore) || 2);
    var found = false;
    function visit(c) {
      if (found || !c || c.type !== T_LIVE) return;
      var sc = Number(mergedCatalogCard(c).score);
      if (Number.isFinite(sc) && sc <= cap) found = true;
    }
    ["left", "center", "right"].forEach(function (k) {
      (state.liveArea[k] || []).forEach(visit);
    });
    (state.resolutionArea || []).forEach(visit);
    return found;
  }

  /** @param {*} liveInst @returns {string|null} */
  function placeLiveFromWaitingToLiveAreaFaceUp(liveInst) {
    if (!liveInst || liveInst.id == null) return null;
    var wi = -1;
    for (var i = 0; i < state.waitingRoom.length; i++) {
      if (state.waitingRoom[i] && String(state.waitingRoom[i].id) === String(liveInst.id)) {
        wi = i;
        break;
      }
    }
    if (wi < 0) return null;
    var keys = ["center", "left", "right"];
    for (var ki = 0; ki < keys.length; ki++) {
      var k = keys[ki];
      if ((state.liveArea[k] || []).length === 0) {
        var card = state.waitingRoom.splice(wi, 1)[0];
        card.isRotated = false;
        card.lcWait = false;
        state.liveArea[k].push(card);
        return k;
      }
    }
    return null;
  }

  /** @param {*} targetInst @param {*} discardedInst */
  function grantHeartsFromDiscardedCardColors(targetInst, discardedInst) {
    if (!targetInst || !discardedInst) return;
    var mc = mergedCatalogCard(discardedInst);
    var bh = mc.base_heart;
    if (!bh || typeof bh !== "object") return;
    ensureCardBoardFields(targetInst);
    [1, 2, 3, 4, 5, 6].forEach(function (slot) {
      var key = slot === 1 ? "heart01" : "heart0" + slot;
      if (Number(bh[key]) > 0) {
        targetInst.playBonusHeartSlotsAlways[slot] =
          sanitizeNonNegativeInt(targetInst.playBonusHeartSlotsAlways[slot]) + 1;
      }
    });
  }

  function openOppWaitPickFromPool(pool, leadText, onDone) {
    if (!pool.length) {
      showToast("ウェイトにできるメンバーがいません");
      onDone(false);
      return;
    }
    openPickFromWaitingDialog(
      pool,
      leadText || "相手ステージのメンバー1人をウェイトにします。",
      function (pid) {
        if (!pid) {
          onDone(false);
          return;
        }
        if (isDualOpponentBoardMode()) {
          pushHistoryBefore("dual-opponent-wait");
          var waited = mutateInactiveOpponentBoard(function () {
            var t = findCardInstById(pid);
            if (!t) return false;
            waitMemberInst(t);
            try {
              fireJidouAfterOppMemberWaited(t);
            } catch (jErr) {
              console.warn(jErr);
            }
            try {
              syncJoujiPassiveEffectsAll();
            } catch (_) {}
            showToast((mergedCatalogCard(t).name || "メンバー") + " をウェイトにしました");
            return true;
          });
          onDone(!!waited);
          return;
        }
        var t2 = findCardInstById(pid);
        if (!t2) {
          onDone(false);
          return;
        }
        pushHistoryBefore("solo-opponent-wait");
        waitMemberInst(t2);
        t2._soloOpponentProxy = true;
        try {
          fireJidouAfterOppMemberWaited(t2);
        } catch (jErr) {
          console.warn(jErr);
        }
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast((mergedCatalogCard(t2).name || "メンバー") + " をウェイトにしました（相手想定）");
        onDone(true);
      },
      {
        okLabel: "ウェイトにする",
        dialogTitle: "相手のメンバーをウェイト",
        zoneLabelFn: soloOpponentMemberZoneLabel,
      },
    );
  }

  function executeAbilitySequence(inst, cl, kind, finishResolved, finishGuided) {
    var steps = cl.steps || [];
    if (!steps.length) {
      finishResolved();
      return;
    }
    function runStep(i) {
      if (i >= steps.length) {
        finishResolved();
        return;
      }
      var stepCl = steps[i];
      executeAbilityBody(inst, stepCl, kind, function () {
        runStep(i + 1);
      }, finishGuided);
    }
    runStep(0);
  }

  /** Body of the effect (post-cost). */
  function executeAbilityBody(inst, cl, kind, finishResolved, finishGuided) {
    var mc = mergedCatalogCard(inst);
    void mc;

    function abortResolved(toastMsg) {
      if (toastMsg) showToast(toastMsg);
      finishResolved();
    }

    if (cl.template === "ability_sequence") {
      executeAbilitySequence(inst, cl, kind, finishResolved, finishGuided);
      return;
    }

    if (cl.template === "followup_draw_if_live_discarded") {
      if (lastCostDiscardedIncludesLive(inst) && state.deck.length) {
        pushHistoryBefore("followup-draw-live-discard");
        var fd = state.deck.shift();
        state.hand.push(fd);
        presentAbilityDrawsToHand([fd], inst);
        showToast("ライブカードを捨てたので1枚引きました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "toujou_multi_wait_draw_per_count") {
      var needW = Math.max(1, Math.floor(Number(cl.oppWaitCount) || 3));
      var drawPer = Math.max(1, Math.floor(Number(cl.deckDrawCount) || 1));
      var waitedN = 0;
      function finishWaitDraw() {
        pushHistoryBefore("toujou-wait-draw-per");
        var drawnN = 0;
        for (var wi = 0; wi < waitedN * drawPer && state.deck.length; wi++) {
          state.hand.push(state.deck.shift());
          drawnN++;
        }
        if (drawnN) showToast("ウェイト " + waitedN + " 人につき " + drawnN + " 枚引きました");
        finishResolved();
      }
      function waitPickStep() {
        if (waitedN >= needW) {
          finishWaitDraw();
          return;
        }
        openPickStageMemberDialog(
          inst.id,
          "ステージのメンバーをウェイトにします（" + (waitedN + 1) + "/" + needW + "、キャンセルで確定）。",
          function (pid) {
            if (!pid) {
              if (waitedN) finishWaitDraw();
              else finishResolved();
              return;
            }
            var mem = findCardInstById(pid);
            if (mem && mem.lcWait !== true && waitMemberInst(mem)) waitedN++;
            waitPickStep();
          },
        );
      }
      waitPickStep();
      return;
    }

    if (cl.template === "toujou_opp_hand_reveal_no_live_draw") {
      var revN = Math.max(1, Math.floor(Number(cl.revealCount) || 3));
      pushHistoryBefore("toujou-opp-hand-reveal");
      var noLive = window.confirm(
        "相手の手札から " +
          revN +
          " 枚を公開しましたか？\n公開にライブカードがなかった場合のみ OK で1枚引きます。",
      );
      if (noLive && state.deck.length) {
        var od = state.deck.shift();
        state.hand.push(od);
        presentAbilityDrawsToHand([od], inst);
        showToast("ライブがなかったため1枚引きました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "tiered_cost_draw_if") {
      var needSumD = Math.floor(Number(cl.tierCostSum) || 0);
      if (inst._lastWaitingReorderCostSum === needSumD && state.deck.length) {
        pushHistoryBefore("tiered-cost-draw");
        var td = state.deck.shift();
        state.hand.push(td);
        presentAbilityDrawsToHand([td], inst);
        showToast("コスト合計 " + needSumD + " で1枚引きました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "tiered_cost_grant_jouji_score") {
      var needSumS = Math.floor(Number(cl.tierCostSum) || 0);
      if (inst._lastWaitingReorderCostSum === needSumS) {
        pushHistoryBefore("tiered-cost-score");
        var plusS = Math.max(1, Math.floor(Number(cl.liveScoreGrant) || 1));
        bumpLiveScoreEffectBonus(plusS, "コスト合計 " + needSumS + " で合計スコア＋" + plusS);
      }
      finishResolved();
      return;
    }

    if (cl.template === "tiered_cost_grant_jouji_session") {
      var needSumG = Math.floor(Number(cl.tierCostSum) || 0);
      if (inst._lastWaitingReorderCostSum === needSumG) {
        pushHistoryBefore("tiered-cost-grant");
        if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
        var wildSeg = "{{jyouji.png|常時}}元々持つハートはすべて{{heart_00.png|heart0}}として扱う。";
        if (inst._grantedJoujiSegmentRaws.indexOf(wildSeg) < 0) inst._grantedJoujiSegmentRaws.push(wildSeg);
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast("コスト合計 " + needSumG + " の常時効果を得ました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "live_start_hand_discard_blade_per") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var charNames = cl.characterNames && cl.characterNames.length ? cl.characterNames : [];
      pushHistoryBefore("live-start-hand-blade-per");
      openPickHandOptionalMultiToWaiting(
        "ライブ開始時: 手札の指定メンバー（渡辺曜・鬼塚夏美・大沢瑠璃乃等）を好きな枚数控え室に置けます（0枚可）。",
        function (h) {
          if (!charNames.length) return true;
          if (handInstMatchesCharacterNames(h, charNames)) return true;
          if (String(h.id) === String(inst.id)) return true;
          return false;
        },
        function (pickedIds) {
          if (pickedIds === null) {
            inst._liveStartEffectDeclined = true;
            finishResolved();
            return;
          }
          var movedN = 0;
          pickedIds.forEach(function (hid) {
            var hi = state.hand.findIndex(function (x) {
              return x && String(x.id) === String(hid);
            });
            if (hi >= 0) {
              state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
              movedN++;
            }
          });
          if (movedN > 0) gainBladesUntilEnd(inst, movedN);
          showToast("手札 " + movedN + " 枚を控え室に置き、ブレードを " + movedN + " 個得ました（ライブ終了まで）");
          finishResolved();
        },
        {
          dialogTitle: "捨て対象カード — ブレードを得る。",
          okLabel: "選んだカードを捨てる",
        },
      );
      return;
    }

    if (cl.template === "live_start_hand_blade_per") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var perN = Math.max(1, Math.floor(Number(cl.handPer) || 2));
      var unitBlade = Math.max(1, Math.floor(Number(cl.bladeGain) || 1));
      var handSize = (state.hand || []).length;
      var bladeN = Math.floor(handSize / perN) * unitBlade;
      pushHistoryBefore("live-start-hand-blade-per");
      if (bladeN > 0) {
        gainBladesUntilEnd(inst, bladeN);
        showToast(
          "手札 " + handSize + " 枚 ÷ " + perN + " = " + Math.floor(handSize / perN) + " によりブレードを " + bladeN + " 個得ました（ライブ終了まで）",
        );
      } else {
        showToast("手札 " + handSize + " 枚では " + perN + " 枚に満たないためブレードは得られません");
      }
      finishResolved();
      return;
    }

    if (cl.template === "toujou_deck_top_wait_if_all_members") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるときのみ登場時効果を解決できます");
        return;
      }
      var topN = cl.deckTopCount || 3;
      if (state.deck.length < topN) {
        showToast("山札が " + topN + " 枚ありません（残り " + state.deck.length + " 枚）");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-deck-top-wait-members");
      var revealedMem = shiftDeckTopCards(topN);
      openDeckTopCardsRevealDialog(revealedMem, function (proceed) {
        if (!proceed) {
          if (revealedMem.length) state.deck.unshift.apply(state.deck, revealedMem.slice().reverse());
          finishResolved();
          return;
        }
        state.waitingRoom.push.apply(state.waitingRoom, revealedMem);
        var allMem = revealedMem.length > 0 && revealedMem.every(function (c) {
          return c && c.type === T_MEMBER;
        });
        if (allMem) {
          var drawN = cl.deckDrawCount || 1;
          if (state.deck.length < drawN) {
            showToast("山札の上 " + topN + " 枚はすべてメンバーでしたが、引く枚数が足りません");
            finishResolved();
            return;
          }
          var drawn = [];
          for (var di = 0; di < drawN; di++) {
            if (state.deck.length) drawn.push(state.deck.shift());
          }
          drawn.forEach(function (c) {
            state.hand.push(c);
          });
          presentAbilityDrawsToHand(drawn, inst);
          showToast("山札の上 " + topN + " 枚を控え室に置き、すべてメンバーだったため " + drawn.length + " 枚引きました");
        } else {
          showToast("山札の上 " + topN + " 枚を控え室に置きました（すべてメンバーではなかったためドローしません）");
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_deck_top_wait_if_all_heart") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるときのみ登場時効果を解決できます");
        return;
      }
      var topH = cl.deckTopCount || 3;
      var reqSlot = cl.requiredHeartSlot != null ? Math.floor(Number(cl.requiredHeartSlot)) : 0;
      if (state.deck.length < topH) {
        showToast("山札が " + topH + " 枚ありません（残り " + state.deck.length + " 枚）");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-deck-top-wait-heart");
      var revealedH = shiftDeckTopCards(topH);
      openDeckTopCardsRevealDialog(revealedH, function (proceed) {
        if (!proceed) {
          if (revealedH.length) state.deck.unshift.apply(state.deck, revealedH.slice().reverse());
          finishResolved();
          return;
        }
        state.waitingRoom.push.apply(state.waitingRoom, revealedH);
        var allHeart =
          revealedH.length > 0 &&
          revealedH.every(function (c) {
            return c && c.type === T_MEMBER && memberCatalogHasHeartSlot(mergedCatalogCard(c), reqSlot);
          });
        if (allHeart) {
          var segH = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
          var grantsH = extractGrantedJoujiTextsFromSegment(segH);
          if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
          grantsH.forEach(function (g) {
            if (inst._grantedJoujiSegmentRaws.indexOf(g) < 0) inst._grantedJoujiSegmentRaws.push(g);
          });
          try {
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
          showToast("条件を満たしたため、ライブ終了時までの常時効果を適用しました");
        } else {
          showToast("山札の上 " + topH + " 枚を控え室に置きました（条件未達のため効果なし）");
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_both_wait_to_empty_stage") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるときのみ登場時効果を解決できます");
        return;
      }
      var maxPb = (cl.filters && cl.filters.maxCost != null ? cl.filters.maxCost : 2) || 2;
      pushHistoryBefore("toujou-pb1018-both");
      runPb1018WaitEnterFlow(false, maxPb, function () {
        showToast("控え室からの登場が完了しました");
        finishResolved();
      });
      return;
    }

    if (cl.template === "kidou_multi_choice") {
      var kdChoices = cl.abilityChoices && cl.abilityChoices.length ? cl.abilityChoices : [];
      var kdRaws = cl.kidouSegmentRaws && cl.kidouSegmentRaws.length ? cl.kidouSegmentRaws : [];
      if (!kdChoices.length || kdChoices.length !== kdRaws.length) {
        finishGuided();
        return;
      }
      openAbilityMultiChoiceDialog(kdChoices, 1, 1, "起動: 効果を選びます。", function (selected) {
        if (!selected || !selected.length) {
          showToast("起動効果を選ばなかったためスキップしました");
          finishResolved();
          return;
        }
        var pickIdx = kdChoices.indexOf(selected[0]);
        if (pickIdx < 0) pickIdx = 0;
        var segRawPick = kdRaws[pickIdx];
        var subCl = classifyCardAbility(mergedCatalogCard(inst), "kidou", segRawPick);
        runClassifiedCardAbility(inst, subCl, "kidou", finishResolved);
      });
      return;
    }

    if (cl.template === "kidou_self_wait_stage_member_swap_recover") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var originColSwap = stageColumnKeyHostingMember(inst.id);
      if (!originColSwap || originColSwap !== "center") {
        showToast("センターエリアにいるときのみ起動できます");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-self-wait-stage-swap");
      if (!moveStageMemberInstToWaiting(inst)) {
        showToast("自分を控え室に移せませんでした");
        finishResolved();
        return;
      }
      render();
      openPickStageMemberDialog(inst.id, "起動: このメンバー以外の対象メンバー1人をステージから控え室へ。", function (stagePid) {
        if (!stagePid) {
          finishResolved();
          return;
        }
        var sentMem = findCardInstById(stagePid);
        var sentCol = stageColumnKeyHostingMember(stagePid);
        if (!sentMem || !sentCol) {
          finishResolved();
          return;
        }
        var sentMc = mergedCatalogCard(sentMem);
        if (cl.filters && cl.filters.seriesTag && !catalogCardMatchesGroupTag(sentMc, cl.filters.seriesTag)) {
          showToast("シリーズ条件のメンバーを選んでください");
          finishResolved();
          return;
        }
        var sentCost = memberFlooredPrintedCost(sentMem);
        if (!removeStageMemberToWaiting(sentMem)) {
          finishResolved();
          return;
        }
        var needCost = sentCost + 2;
        var recCandSwap = waitingPickCandidates(
          Object.assign({}, cl.filters || {}, { pickType: T_MEMBER, minCost: needCost, maxCost: needCost }),
          null,
        );
        if (!recCandSwap.length) {
          showToast("コスト " + needCost + " の控え室メンバーがありません");
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(
          recCandSwap,
          "控え室からコスト " + needCost + " のメンバーを " +
            (sentCol === "left" ? "左" : sentCol === "right" ? "右" : "センター") +
            " に登場させます。",
          function (waitPid) {
            if (!waitPid) {
              finishResolved();
              return;
            }
            var pickInst = state.waitingRoom.find(function (w) {
              return w && String(w.id) === String(waitPid);
            });
            if (!pickInst || !placeWaitingMemberToStageColumn(pickInst, sentCol)) {
              showToast("登場できませんでした");
              finishResolved();
              return;
            }
            showToast((mergedCatalogCard(pickInst).name || "メンバー") + " をステージに登場させました");
            finishResolved();
          },
        );
      });
      return;
    }

    if (cl.template === "kidou_self_to_wait_recover") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var originCol = stageColumnKeyHostingMember(inst.id);
      if (!originCol) {
        showToast("ステージにいるメンバーでのみ起動できます");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-self-wait-recover");
      if (!moveStageMemberInstToWaiting(inst)) {
        showToast("ステージから控え室に移せませんでした");
        finishResolved();
        return;
      }
      render();
      var recCand = waitingPickCandidates(cl.filters || {}, null);
      if (!recCand.length) {
        showToast("控え室に登場させられるメンバーがありません");
        finishResolved();
        return;
      }
      openPickFromWaitingDialog(
        recCand,
        "起動: 控え室からメンバーを同じエリア（" +
          (originCol === "left" ? "左" : originCol === "right" ? "右" : "センター") +
          "）に登場させます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var pickInst = state.waitingRoom.find(function (w) {
            return w && String(w.id) === String(pid);
          });
          if (!pickInst || !placeWaitingMemberToStageColumn(pickInst, originCol)) {
            showToast("登場できませんでした（エリアが埋まっている可能性があります）");
            finishResolved();
            return;
          }
          showToast((mergedCatalogCard(pickInst).name || "メンバー") + " をステージに登場させました");
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "toujou_deck_top_liella_live_pick") {
      if (!checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var cntLiella = cl.deckTopCount || 4;
      if (state.deck.length < cntLiella) {
        showToast("山札が " + cntLiella + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-deck-top-liella-pick");
      var lookedLiella = state.deck.splice(0, cntLiella);
      render();
      openDeckTopLiellaLivePickDialog(lookedLiella, cl.filters || {}, inst, function (pickedId) {
        var toHand = null;
        lookedLiella.forEach(function (c) {
          if (pickedId && String(c.id) === String(pickedId)) toHand = c;
          else state.waitingRoom.push(c);
        });
        if (toHand) {
          state.hand.push(toHand);
          presentAbilityDrawsToHand([toHand], inst);
          showToast((mergedCatalogCard(toHand).name || "ライブ") + " を手札に加えました");
        } else {
          showToast("見た " + lookedLiella.length + " 枚を控え室に置きました");
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "live_start_named_member_heart_blades") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-named-heart-blades");
      var gifts = cl.memberHeartBladeGifts || [];
      var appliedG = applyNamedMemberHeartBladeGifts(gifts);
      if (appliedG > 0) {
        showToast("ステージのメンバーにハート付きブレードを付与しました（ライブ終了時まで）");
      } else {
        showToast("対象のメンバーがステージにいませんでした");
      }
      finishResolved();
      return;
    }

    if (cl.template === "live_success_characters_draw") {
      var needChars = cl.characterNames || [];
      if (!stageHasAllCharacterNames(needChars)) {
        showToast("ステージに必要なメンバーが揃っていないためスキップしました");
        finishResolved();
        return;
      }
      var drawNc = cl.deckDrawCount || 1;
      if (!state.deck.length) {
        showToast("山札がありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-success-characters-draw");
      var drawnC = state.deck.shift();
      state.hand.push(drawnC);
      presentAbilityDrawsToHand([drawnC], inst);
      showToast("山札から1枚引きました");
      finishResolved();
      return;
    }

    if (cl.template === "optional_self_wait_opp_stage") {
      var oppMax = cl.oppWaitMaxCost != null ? Number(cl.oppWaitMaxCost) : 4;
      var oppCnt = cl.oppWaitCount != null ? Math.max(1, Number(cl.oppWaitCount)) : 1;
      if (versusOnlineActive()) {
        showToast("相手のステージのメンバーは、相手盤面で手動でウェイトにしてください");
        finishGuided();
        return;
      }
      if (oppCnt > 1) {
        openSoloOpponentMemberWaitPickMultiDialog(
          oppMax,
          oppCnt,
          "相手のステージにいるコスト" + oppMax + "以下のメンバーを最大" + oppCnt + "人までウェイトにします。",
          function (ok) {
            if (ok) {
              try {
                syncJoujiPassiveEffectsAll();
              } catch (_) {}
            }
            finishResolved();
          },
        );
        return;
      }
      openSoloOpponentMemberWaitPickDialog(
        oppMax,
        "相手のステージにいるコスト" + oppMax + "以下のメンバー1人をウェイトにします。",
        function () {
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "heart_color_pick_grant") {
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var heartMultPreview = cl.heartPerSuccessLive ? successLiveAreaLiveCardCount() : 1;
      if (cl.heartPerSuccessLive && heartMultPreview < 1) {
        showToast("成功ライブカード置き場にライブカードがないため、ハートは得られません");
        finishResolved();
        return;
      }
      pushHistoryBefore("heart-color-pick-grant");
      openHeartColorPickDialog(
        inst,
        function (slot) {
          if (slot == null) {
            if (cl.optional || cl.hasOptionalCost) finishResolved();
            else showToast("ハートを選ばなかったためスキップしました");
            finishResolved();
            return;
          }
          var heartMult = cl.heartPerSuccessLive ? successLiveAreaLiveCardCount() : 1;
          grantHeartSlotUntilLiveEnd(inst, slot, heartMult);
          try {
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
          finishResolved();
        },
        cl.heartPickSlots,
      );
      return;
    }

    if (cl.template === "kidou_reveal_hand_cost_threshold") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var handMems = state.hand.filter(function (h) {
        return h && h.type === T_MEMBER;
      });
      if (!handMems.length) {
        showToast("手札にメンバーカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-reveal-hand-cost");
      openPickHandOptionalMultiToWaiting(
        "起動: 手札のメンバーを好きな枚数選んで公開します（0枚可）。",
        function (h) {
          return h && h.type === T_MEMBER;
        },
        function (pickedIds) {
          if (pickedIds === null) {
            finishResolved();
            return;
          }
          var sumCost = 0;
          pickedIds.forEach(function (hid) {
            var hi = state.hand.findIndex(function (x) {
              return x && String(x.id) === String(hid);
            });
            if (hi >= 0) sumCost += memberFlooredPrintedCost(state.hand[hi]);
          });
          var thresholds = cl.costThresholds && cl.costThresholds.length ? cl.costThresholds : [10, 20, 30, 40, 50];
          var matched = thresholds.indexOf(sumCost) >= 0;
          if (matched) {
            var scoreSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
            if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
            if (inst._grantedJoujiSegmentRaws.indexOf(scoreSeg) < 0) {
              inst._grantedJoujiSegmentRaws.push(scoreSeg);
            }
            try {
              syncJoujiPassiveEffectsAll();
            } catch (_) {}
            showToast("公開コスト合計 " + sumCost + " — ライブ終了時までスコア＋1を得ました");
          } else {
            showToast("公開コスト合計 " + sumCost + " — 閾値（10/20/30/40/50）に一致しませんでした");
          }
          finishResolved();
        },
        {
          dialogTitle: "公開するメンバー — 好きな枚数",
          okLabel: "公開する",
        },
      );
      return;
    }

    if (cl.template === "deck_top_count_stage_plus") {
      var lookN = eachStageColumnMemberInsts().length + (cl.deckTopCountOffset || 2);
      if (state.deck.length < lookN) {
        showToast("山札が " + lookN + " 枚ありません（残り " + state.deck.length + " 枚）");
        finishResolved();
        return;
      }
      pushHistoryBefore("deck-top-stage-plus");
      var lookedSp = shiftDeckTopCards(lookN);
      openPickFromDeckLookDialog(
        lookedSp,
        {},
        "山札の上 " + lookN + " 枚を見ました。1枚を山札の一番上に置き、残りは控え室へ。",
        function (pickedId) {
          var topCard = null;
          if (pickedId) {
            for (var li = 0; li < lookedSp.length; li++) {
              if (lookedSp[li] && String(lookedSp[li].id) === String(pickedId)) {
                topCard = lookedSp.splice(li, 1)[0];
                break;
              }
            }
          }
          if (topCard) state.deck.unshift(topCard);
          lookedSp.forEach(function (c) {
            state.waitingRoom.push(c);
          });
          showToast("山札の上から並べ替えました");
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "both_players_energy_deck_wait") {
      pushHistoryBefore("both-energy-deck-wait");
      var ownN = addEnergyFromDeckToArea(1, true);
      showToast("自分のエネルギーデッキから " + ownN + " 枚をウェイトで置きました（相手側は手動）");
      finishResolved();
      return;
    }

    if (cl.template === "success_live_waiting_swap") {
      pushHistoryBefore("success-live-wait-swap");
      var slCand = (state.successfulLiveArea || []).filter(function (c) {
        return (
          successLiveAreaCardIsLive(c) &&
          catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {})
        );
      });
      if (!slCand.length) {
        showToast("成功ライブカード置き場に対象カードがありません");
        finishResolved();
        return;
      }
      openPickFromWaitingDialog(
        slCand,
        "成功ライブを控え室に置いてもよい（キャンセルでスキップ）。",
        function (slId) {
        if (!slId) {
          finishResolved();
          return;
        }
        var slIdx = state.successfulLiveArea.findIndex(function (c) {
          return c && String(c.id) === String(slId);
        });
        if (slIdx < 0) {
          finishResolved();
          return;
        }
        var movedSl = state.successfulLiveArea.splice(slIdx, 1)[0];
        state.waitingRoom.push(movedSl);
        var wCand2 = (state.waitingRoom || []).filter(function (c) {
          return c && mergedCatalogCard(c).type === T_LIVE && catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {});
        });
        if (!wCand2.length) {
          showToast("控え室に入れ替え対象のライブがありません");
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(wCand2, "控え室のライブを成功ライブカード置き場へ。", function (wId) {
          if (!wId) {
            finishResolved();
            return;
          }
          var wi2 = state.waitingRoom.findIndex(function (c) {
            return c && String(c.id) === String(wId);
          });
          if (wi2 >= 0) {
            var wl2 = state.waitingRoom.splice(wi2, 1)[0];
            state.successfulLiveArea.push(wl2);
            showToast("成功ライブと控え室のライブを入れ替えました");
          }
          finishResolved();
        });
      });
      return;
    }

    if (cl.template === "kidou_self_wait_activate_other") {
      pushHistoryBefore("kidou-self-wait-activate");
      inst.lcWait = true;
      inst.isRotated = true;
      inst.lcActive = false;
      activateAllStageMembers(1);
      showToast("このメンバーをウェイトにし、ほかのメンバー1人をアクティブにしました");
      finishResolved();
      return;
    }

    if (cl.template === "deck_top_reveal_top_to_hand_score") {
      if (!state.deck.length) {
        showToast("山札が空です");
        finishResolved();
        return;
      }
      pushHistoryBefore("deck-top-reveal-score");
      var topOne = state.deck.shift();
      var topMc = mergedCatalogCard(topOne);
      state.hand.push(topOne);
      presentAbilityDrawsToHand([topOne], inst);
      if (topMc.type === T_MEMBER && !cardHasBladeHeart(topMc)) {
        if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
        var scSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
        if (inst._grantedJoujiSegmentRaws.indexOf(scSeg) < 0) inst._grantedJoujiSegmentRaws.push(scSeg);
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast("山札の1枚目を公開して手札に加え、スコア＋1の常時を得ました");
      } else {
        showToast("山札の1枚目を手札に加えました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "kidou_waiting_to_empty_stage") {
      var maxC = (cl.filters && cl.filters.maxCost != null ? cl.filters.maxCost : 2) || 2;
      var wMem = (state.waitingRoom || []).filter(function (c) {
        return (
          c &&
          c.type === T_MEMBER &&
          memberFlooredPrintedCost(c) <= maxC &&
          catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {})
        );
      });
      if (!wMem.length) {
        showToast("控え室に条件を満たすメンバーがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("wait-to-empty-stage");
      openPickFromWaitingDialog(wMem, "控え室からメンバーのいないエリアへウェイト登場。", function (pickId) {
        if (!pickId) {
          finishResolved();
          return;
        }
        var emptyCols = ["left", "center", "right"].filter(function (col) {
          return !stageColumnIncumbentMember(col);
        });
        if (!emptyCols.length) {
          showToast("空のエリアがありません");
          finishResolved();
          return;
        }
        var wi3 = state.waitingRoom.findIndex(function (c) {
          return c && String(c.id) === String(pickId);
        });
        if (wi3 < 0) {
          finishResolved();
          return;
        }
        var ent = state.waitingRoom.splice(wi3, 1)[0];
        ent.lcWait = true;
        ent.isRotated = true;
        ent.lcActive = false;
        var tgtCol = emptyCols[0];
        if (emptyCols.length > 1) {
          tgtCol = emptyCols[0];
        }
        if (!state.stage[tgtCol]) state.stage[tgtCol] = [];
        state.stage[tgtCol].push(ent);
        finalizeWaitingMemberStageEntry(snapshotBoard());
        showToast("控え室から空エリアへウェイト登場させました");
        finishResolved();
      });
      return;
    }

    if (cl.template === "kidou_opp_wait_group_discount_energy") {
      pushHistoryBefore("kidou-opp-wait-discount");
      var maxOpp = cl.filters && cl.filters.maxCost != null ? cl.filters.maxCost : 10;
      openSoloOpponentMemberWaitPickDialog(maxOpp, "相手ステージのメンバー1人をウェイトにします。", function () {
        finishResolved();
      });
      return;
    }

    if (cl.template === "live_success_wait_skip_next_activate") {
      pushHistoryBefore("live-success-wait-skip");
      inst.lcWait = true;
      inst.isRotated = true;
      inst.lcActive = false;
      inst._skipAutoActivateUntilTurn = state.turnCount + 1;
      showToast("ウェイトにし、次ターンのアクティブフェイズまでアクティブにしません");
      finishResolved();
      return;
    }

    if (cl.template === "deck_top_count_live_score_plus") {
      var liveScoreBase = Math.max(0, Math.floor(Number(state.liveScoreEffectBonus) || 0));
      liveScoreBase += Math.max(0, Math.floor(Number(state.joujiLiveScoreBonus) || 0));
      var lookLs = liveScoreBase + (cl.deckTopCountOffset || 2);
      if (state.deck.length < lookLs) {
        showToast("山札が " + lookLs + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("deck-top-live-score-plus");
      var lookedLs = shiftDeckTopCards(lookLs);
      openPickFromDeckLookDialog(
        lookedLs,
        {},
        "ライブスコア+" + (cl.deckTopCountOffset || 2) + " で見た " + lookLs + " 枚から1枚手札へ。",
        function (pickedId) {
          if (pickedId) {
            for (var li = 0; li < lookedLs.length; li++) {
              if (lookedLs[li] && String(lookedLs[li].id) === String(pickedId)) {
                var addL = lookedLs.splice(li, 1)[0];
                state.hand.push(addL);
                presentAbilityDrawsToHand([addL], inst);
                break;
              }
            }
          }
          lookedLs.forEach(function (c) {
            state.waitingRoom.push(c);
          });
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "waiting_reorder_deck_top") {
      var wPool = (state.waitingRoom || []).slice();
      if (!wPool.length) {
        showToast("控え室にカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("waiting-to-deck-top");
      openPickFromWaitingDialog(
        wPool,
        "控え室からデッキの一番上に置くカードを選びます（キャンセル可）。",
        function (pid) {
          if (pid) {
            var wi = state.waitingRoom.findIndex(function (c) {
              return c && String(c.id) === String(pid);
            });
            if (wi >= 0) {
              var wc = state.waitingRoom.splice(wi, 1)[0];
              state.deck.unshift(wc);
              showToast("控え室のカードを山札の上に置きました");
            }
          }
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "activate_stage_members_up_to") {
      pushHistoryBefore("activate-stage-up-to");
      var maxA = cl.activateMax || 1;
      var waitPool = [];
      eachStageColumnMemberInsts().forEach(function (m) {
        if (!m || m.lcWait !== true) return;
        if (memberSkipAutoActivateThisTurn(m)) return;
        if (!catalogCardMatchesPickFilters(mergedCatalogCard(m), cl.filters || {})) return;
        waitPool.push(m);
      });
      if (!waitPool.length) {
        showToast("アクティブにできる条件のメンバーがいません");
        finishResolved();
        return;
      }
      function activateMembers(list) {
        var activated = 0;
        list.forEach(function (m) {
          if (activated >= maxA || !m) return;
          m.lcWait = false;
          m.isRotated = false;
          m.lcActive = true;
          activated++;
        });
        showToast("メンバー " + activated + " 人をアクティブにしました");
        finishResolved();
      }
      if (waitPool.length <= maxA) {
        activateMembers(waitPool);
        return;
      }
      openPickFromWaitingDialog(waitPool, "アクティブにするメンバーを選びます（最大 " + maxA + " 人）。", function (pid) {
        if (!pid) {
          finishResolved();
          return;
        }
        var picked = findCardInstById(pid);
        activateMembers(picked ? [picked] : []);
      });
      return;
    }

    if (cl.template === "yell_resolution_pick_hand") {
      var resPool = (state.resolutionArea || []).filter(function (c) {
        return c && catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {});
      });
      if (!resPool.length) {
        showToast("エール公開に選べるカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("yell-res-pick-hand");
      openPickFromWaitingDialog(
        resPool,
        "エール公開から手札に加えるカードを選びます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var ri = state.resolutionArea.findIndex(function (c) {
            return c && String(c.id) === String(pid);
          });
          if (ri >= 0) {
            var rc = state.resolutionArea.splice(ri, 1)[0];
            state.hand.push(rc);
            presentAbilityDrawsToHand([rc], inst);
          }
          finishResolved();
        },
        { dialogTitle: "エール公開から回収", okLabel: "手札に加える" },
      );
      return;
    }

    if (cl.template === "deck_top_pick_no_ability_or_jouji") {
      var dCnt2 = cl.deckTopCount || 2;
      if (state.deck.length < 1) {
        showToast("山札が空です");
        finishResolved();
        return;
      }
      var pickN2 = Math.min(dCnt2, state.deck.length);
      pushHistoryBefore("deck-top-pick-jouji-filter");
      var lookedJ2 = state.deck.splice(0, pickN2);
      render();
      openPickFromDeckLookDialog(
        lookedJ2,
        cl.filters || {},
        "山札の上 " + lookedJ2.length + " 枚。能力なしまたは常時能力付き μ's を1枚手札へ（任意）。",
        function (pickedId2) {
          if (pickedId2) {
            for (var lj = 0; lj < lookedJ2.length; lj++) {
              if (lookedJ2[lj] && String(lookedJ2[lj].id) === String(pickedId2)) {
                var added2 = lookedJ2.splice(lj, 1)[0];
                state.hand.push(added2);
                presentAbilityDrawsToHand([added2], inst);
                break;
              }
            }
          }
          lookedJ2.forEach(function (c) {
            state.waitingRoom.push(c);
          });
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "yell_resolution_pick_deck_top") {
      var resDeck = state.resolutionArea || [];
      if (!resDeck.length) {
        showToast("エール公開にカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("yell-res-deck-top");
      openPickFromWaitingDialog(
        resDeck,
        "エール公開から1枚選び、デッキの一番上に置きます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var riD = state.resolutionArea.findIndex(function (c) {
            return c && String(c.id) === String(pid);
          });
          if (riD >= 0) {
            var rcD = state.resolutionArea.splice(riD, 1)[0];
            state.deck.unshift(rcD);
            showToast("選んだカードをデッキの一番上に置きました");
          }
          finishResolved();
        },
        { dialogTitle: "エール公開 → デッキ上", okLabel: "一番上に置く" },
      );
      return;
    }

    if (cl.template === "yell_resolution_energy_wait") {
      if (!resolutionHasLiveCard()) {
        showToast("エール公開にライブカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("yell-res-energy-wait");
      addEnergyFromDeckToArea(cl.energyWaitCount || 1, true);
      showToast("エネルギーデッキから " + (cl.energyWaitCount || 1) + " 枚ウェイトで置きました");
      finishResolved();
      return;
    }

    if (cl.template === "yell_resolution_count_energy_wait") {
      var resMatch = countResolutionCardsMatching(cl.filters || {});
      if (resMatch < (cl.minResolutionCards || 7)) {
        showToast("エール公開の条件を満たしていません（" + resMatch + "/" + (cl.minResolutionCards || 7) + "）");
        finishResolved();
        return;
      }
      pushHistoryBefore("yell-res-count-energy");
      addEnergyFromDeckToArea(cl.energyWaitCount || 1, true);
      finishResolved();
      return;
    }

    if (cl.template === "energy_less_than_opponent_wait") {
      if (!soloEnergyLessThanOpponent()) {
        showToast("自分のエネルギーが相手より少なくありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-energy-less-opp");
      addEnergyFromDeckToArea(cl.energyWaitCount || 1, true);
      finishResolved();
      return;
    }

    if (cl.template === "live_score_higher_energy_wait") {
      var ownSc = ownLiveScoreEstimate();
      var oppSc = opponentLiveScoreEstimate();
      if (ownSc <= oppSc) {
        showToast("ライブの合計スコアが相手より高くありません（自" + ownSc + " / 相" + oppSc + "）");
        finishResolved();
        return;
      }
      var ewN = cl.energyWaitFromUnderMember ? countEnergyUnderMemberInst(inst) + 1 : cl.energyWaitCount || 1;
      pushHistoryBefore("ls-score-higher-energy");
      addEnergyFromDeckToArea(ewN, true);
      showToast("エネルギーデッキから " + ewN + " 枚ウェイトで置きました");
      finishResolved();
      return;
    }

    if (cl.template === "deck_top_reveal_hand_score_grant") {
      if (!state.deck.length) {
        showToast("山札がありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-deck-top-reveal");
      var topC = state.deck.shift();
      state.hand.push(topC);
      presentAbilityDrawsToHand([topC], inst);
      var topMc = mergedCatalogCard(topC);
      if (cl.grantIfNoBhMember && topMc.type === T_MEMBER && !cardHasBladeHeart(topMc)) {
        if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
        var scG = "{{jyouji.png|常時}}ライブの合計スコアを＋" + (cl.liveScoreGrant || 1) + "する。";
        if (inst._grantedJoujiSegmentRaws.indexOf(scG) < 0) inst._grantedJoujiSegmentRaws.push(scG);
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast("非BHメンバーのため合計スコア＋" + (cl.liveScoreGrant || 1));
      }
      finishResolved();
      return;
    }

    if (cl.template === "kidou_wait_member_grant_jouji") {
      pushHistoryBefore("kidou-wait-grant-jouji");
      var waitedId = inst._kidouGrantedWaitMemberId;
      delete inst._kidouGrantedWaitMemberId;
      var waitedInst = waitedId ? findCardInstById(waitedId) : null;
      var segKd = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
      var gWait = extractGrantedJoujiTextsFromSegment(segKd);
      if (!gWait.length) {
        var inlineG = String(segKd || "").match(/「(\{\{jyouji[^}]+\}\}[^」]+)」/);
        if (inlineG) gWait.push(inlineG[1].replace(/^\{\{jyouji[^}]+\}\}/, "{{jyouji.png|常時}}"));
      }
      if (waitedInst && gWait.length) {
        gWait.forEach(function (g) {
          grantJoujiSegmentToMember(waitedInst, g);
        });
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast("ウェイトにしたメンバーに常時効果を付与しました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "kidou_hand_discard_trigger_ability") {
      openPickHandToWaitingDialog(
        cl.handDiscardToWaiting || 1,
        function (handIds) {
          if (!handIds || !handIds.length) {
            finishResolved();
            return;
          }
          pushHistoryBefore("kidou-hand-discard-trigger");
          var discarded = null;
          handIds.forEach(function (hid) {
            var hi = state.hand.findIndex(function (h) {
              return h && String(h.id) === String(hid);
            });
            if (hi >= 0) {
              discarded = state.hand.splice(hi, 1)[0];
              state.waitingRoom.push(discarded);
            }
          });
          if (!discarded) {
            finishResolved();
            return;
          }
          openResolvePickedCardToujyouAbility(discarded, finishResolved);
        },
        function (_c, mc) {
          return catalogCardMatchesPickFilters(mc, cl.filters || {});
        },
      );
      return;
    }

    if (cl.template === "toujou_wait_to_member_under") {
      var wrUnder = waitingRoomPickCandidates(cl.filters || {});
      if (!wrUnder.length) {
        showToast("控え室に条件を満たすカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-wait-under-member");
      openPickFromWaitingDialog(wrUnder, "このメンバーの下に置くカードを控え室から選びます。", function (pickId) {
        if (!pickId) {
          finishResolved();
          return;
        }
        var colU = stageColumnKeyHostingMember(inst.id);
        if (!colU) {
          finishResolved();
          return;
        }
        var wiU = state.waitingRoom.findIndex(function (c) {
          return c && String(c.id) === String(pickId);
        });
        if (wiU < 0) {
          finishResolved();
          return;
        }
        var placed = state.waitingRoom.splice(wiU, 1)[0];
        var arrU = state.stage[colU] || [];
        var hostIdx = -1;
        for (var hiU = 0; hiU < arrU.length; hiU++) {
          if (arrU[hiU] && String(arrU[hiU].id) === String(inst.id)) {
            hostIdx = hiU;
            break;
          }
        }
        if (hostIdx < 0) {
          state.waitingRoom.push(placed);
          finishResolved();
          return;
        }
        arrU.splice(hostIdx, 0, placed);
        state.stage[colU] = arrU;
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast((mergedCatalogCard(placed).name || "カード") + " をこのメンバーの下に置きました");
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_both_center_position_change") {
      pushHistoryBefore("toujou-both-center-pc");
      function runOppCenterPc(done) {
        var oppC = stageCenterMemberInst(true);
        if (!oppC) {
          done();
          return;
        }
        openPositionChangeColumnPickDialog(
          oppC,
          cl,
          "相手センターのポジションチェンジ: 移動先エリアを選びます。",
          function (targetCol) {
            if (targetCol) {
              if (isDualOpponentBoardMode() && oppC && oppC.id != null) {
                var oppCenterId = String(oppC.id);
                mutateInactiveOpponentBoard(function () {
                  var liveOpp = findCardInstById(oppCenterId);
                  if (liveOpp) swapStageMemberPositionChange(liveOpp, targetCol);
                });
              } else {
                swapStageMemberPositionChange(oppC, targetCol);
              }
            }
            done();
          },
        );
      }
      var selfC = stageCenterMemberInst(false);
      if (!selfC) {
        runOppCenterPc(finishResolved);
        return;
      }
      openPositionChangeColumnPickDialog(
        selfC,
        cl,
        "自分センターのポジションチェンジ: 移動先エリアを選びます。",
        function (targetCol) {
          if (targetCol) swapStageMemberPositionChange(selfC, targetCol);
          runOppCenterPc(finishResolved);
        },
      );
      return;
    }

    if (cl.template === "toujou_opp_active_wait") {
      pushHistoryBefore("toujou-opp-active-wait");
      openSoloOpponentMemberWaitPickDialog(99, "相手のアクティブメンバー1人をウェイトにします。", function () {
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_wait_pick_trigger_ability") {
      var wrPool = waitingRoomPickCandidates(cl.filters || {});
      if (!wrPool.length) {
        showToast("条件を満たす控え室のカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-wait-trigger-ability");
      openPickFromWaitingDialog(wrPool, "控え室から登場時能力を発動するカードを選びます。", function (pickId) {
        if (!pickId) {
          finishResolved();
          return;
        }
        var picked = findCardInstById(pickId);
        openResolvePickedCardToujyouAbility(picked, finishResolved);
      });
      return;
    }

    if (cl.template === "kidou_energy_or_activate_member") {
      openPickHandToWaitingDialog(cl.handDiscardToWaiting || 1, function (handIds) {
        if (!handIds || !handIds.length) {
          finishResolved();
          return;
        }
        handIds.forEach(function (hid) {
          var hi = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(hid);
          });
          if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
        });
        pushHistoryBefore("kidou-energy-or-act");
        var choice = window.prompt("1: エネルギー1枚をアクティブ\n2: 条件のメンバー1人をアクティブ\n\n番号（キャンセルでスキップ）");
        if (choice === "1") {
          activateOneUprightEnergy();
        } else if (choice === "2") {
          var pool = stageMemberPickCandidates(cl.filters || {}, inst.id);
          if (pool.length) {
            openPickFromWaitingDialog(pool, "アクティブにするメンバーを選びます。", function (pid) {
              var t = pid ? findCardInstById(pid) : null;
              if (t) {
                t.lcWait = false;
                t.lcActive = true;
                t.isRotated = false;
              }
              finishResolved();
            });
            return;
          }
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "kidou_energy_deck_pick_live") {
      var needEn = cl.costEnergyCount || 2;
      if (state.energyArea.length < needEn) {
        showToast("エネルギー置き場に " + needEn + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-energy-deck-live");
      for (var er = 0; er < needEn; er++) {
        if (state.energyArea.length) state.energyArea.pop();
      }
      var liveCand = waitingPickCandidates(cl.filters || { pickType: T_LIVE }, null);
      if (!liveCand.length) {
        showToast("控え室にライブカードがありません");
        finishResolved();
        return;
      }
      openPickFromWaitingDialog(liveCand, "控え室からライブを1枚手札に加えます。", function (pid) {
        if (pid) moveInstFromWaitingToHand(pid, inst);
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_baton_discarded_pick_hand") {
      var batCand = (state.waitingRoom || []).filter(function (c) {
        return c && catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {});
      });
      if (!batCand.length) {
        showToast("控え室に回収対象のメンバーがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-baton-recover");
      openPickFromWaitingDialog(batCand, "バトンで控え室に置いたメンバーを1枚手札に加えます。", function (pid) {
        if (pid) moveInstFromWaitingToHand(pid, inst);
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_optional_hand_discard_draw") {
      openPickHandOptionalMultiToWaiting(
        "手札を最大 " + (cl.maxHandDiscard || 3) + " 枚まで控え室に置けます（0枚可）。",
        function () {
          return true;
        },
        function (ids) {
          var n = (ids && ids.length) || 0;
          if (ids && ids.length) {
            ids.forEach(function (hid) {
              var hi = state.hand.findIndex(function (h) {
                return h && String(h.id) === String(hid);
              });
              if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
            });
          }
          pushHistoryBefore("toujou-opt-discard-draw");
          for (var di = 0; di < n && state.deck.length; di++) {
            state.hand.push(state.deck.shift());
          }
          if (n) showToast(n + " 枚捨て、" + n + " 枚引きました");
          finishResolved();
        },
        { okLabel: "捨てる", dialogTitle: "手札を控え室へ（任意）" },
      );
      return;
    }

    if (cl.template === "optional_pick_member_wait_opp_stage") {
      var pickPool = stageMemberPickCandidates(cl.filters || {}, inst.id);
      if (!pickPool.length) {
        showToast("ウェイトにできる対象メンバーがいません");
        finishResolved();
        return;
      }
      pushHistoryBefore("opt-pick-wait-opp");
      openPickFromWaitingDialog(pickPool, "自分のステージのメンバー1人をウェイトにします。", function (pid) {
        if (!pid) {
          finishResolved();
          return;
        }
        var selfW = findCardInstById(pid);
        if (selfW) waitMemberInst(selfW);
        openSoloOpponentMemberWaitPickDialog(99, "相手ステージのメンバー1人をウェイトにします。", function () {
          finishResolved();
        });
      });
      return;
    }

    if (cl.template === "live_start_draw_opp_wait") {
      pushHistoryBefore("ls-draw-opp-wait");
      if (state.deck.length) {
        var dO = state.deck.shift();
        state.hand.push(dO);
        presentAbilityDrawsToHand([dO], inst);
      }
      openSoloOpponentMemberWaitPickMultiDialog(
        cl.oppWaitMaxCost || 9,
        cl.oppWaitCount || 1,
        "相手ステージのメンバーをウェイトにします。",
        function () {
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "waiting_to_deck_top_by_opp_wait_count") {
      var limitN = 0;
      if (isDualOpponentBoardMode()) {
        var oppSnapLimit = getInactiveOpponentSnapshot();
        limitN = oppSnapLimit ? countStageWaitMembersFromSnapshot(oppSnapLimit) : 0;
      } else {
        eachStageColumnMemberInsts().forEach(function (m) {
          if (m && m._soloOpponentProxy && m.lcWait === true) limitN++;
        });
      }
      if (!limitN) limitN = 1;
      var wPool2 = (state.waitingRoom || []).filter(function (c) {
        return c && catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {});
      });
      if (!wPool2.length) {
        showToast("控え室に対象メンバーがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("wait-deck-top-multi");
      var pickedTop = [];
      function stepPick() {
        if (pickedTop.length >= limitN || !wPool2.length) {
          pickedTop.reverse().forEach(function (c) {
            state.deck.unshift(c);
          });
          showToast(pickedTop.length + " 枚をデッキの上に置きました");
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(
          wPool2,
          "控え室からデッキ上へ (" + (pickedTop.length + 1) + "/" + limitN + ")",
          function (pid) {
            if (!pid) {
              pickedTop.reverse().forEach(function (c) {
                state.deck.unshift(c);
              });
              finishResolved();
              return;
            }
            var wi = state.waitingRoom.findIndex(function (c) {
              return c && String(c.id) === String(pid);
            });
            if (wi >= 0) {
              var card = state.waitingRoom.splice(wi, 1)[0];
              pickedTop.push(card);
              wPool2 = wPool2.filter(function (c) {
                return String(c.id) !== String(pid);
              });
            }
            stepPick();
          },
        );
      }
      stepPick();
      return;
    }

    if (cl.template === "live_start_pay_or_hand_discard") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-pay-or-hand-discard");
      payAbilityCost(inst, cl, false, function (paidEnergy) {
        if (paidEnergy) {
          showToast("エネルギーを支払い、手札は控え室に置きませんでした");
          finishResolved();
          return;
        }
        var discardN = cl.handDiscardToWaiting || 2;
        openPickHandToWaitingDialog(discardN, function (handIds) {
          if (!handIds || !handIds.length) {
            finishResolved();
            return;
          }
          handIds.forEach(function (hid) {
            var hi = state.hand.findIndex(function (h) {
              return h && String(h.id) === String(hid);
            });
            if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
          });
          showToast("手札 " + handIds.length + " 枚を控え室に置きました");
          finishResolved();
        });
      });
      return;
    }

    if (cl.template === "live_start_side_cost_equal_opp_wait") {
      var leftM = stageColumnIncumbentMember("left");
      var rightM = stageColumnIncumbentMember("right");
      if (!leftM || !rightM) {
        showToast("左右サイドにメンバーがいません");
        finishResolved();
        return;
      }
      var lc = memberFlooredPrintedCost(leftM);
      var rc = memberFlooredPrintedCost(rightM);
      if (lc !== rc) {
        showToast("左右サイドのコストが同じではありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-side-equal-opp-wait");
      var oppAll = soloOpponentStageMemberCandidates(99).filter(function (m) {
        return memberTotalPrintedHearts(m) <= 3;
      });
      oppAll.forEach(function (m) {
        waitMemberInst(m);
      });
      showToast("条件を満たし、相手想定メンバー " + oppAll.length + " 人をウェイトにしました");
      finishResolved();
      return;
    }

    if (
      cl.template === "live_start_opp_wait_if_high_cost_on_stage" ||
      cl.template === "live_start_opp_wait_if_stage_hearts" ||
      cl.template === "live_start_opp_wait_max_cost" ||
      cl.template === "live_start_opp_wait_exclude_unit"
    ) {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (cl.template === "live_start_opp_wait_if_high_cost_on_stage") {
        if (!checkAbilityBoardPickFilters(cl.filters || {})) {
          showToast("コスト10以上のメンバーがステージにいません");
          finishResolved();
          return;
        }
      }
      if (cl.template === "live_start_opp_wait_if_stage_hearts") {
        var minHtLs = cl.minStageHeartTotal != null ? Number(cl.minStageHeartTotal) : 5;
        if (sumStageTotalPrintedHeartsAll() < minHtLs) {
          showToast("ステージのハート合計が " + minHtLs + " 未満です");
          finishResolved();
          return;
        }
      }
      pushHistoryBefore("live-start-opp-wait");
      var maxCostLs = cl.oppWaitMaxCost != null ? Number(cl.oppWaitMaxCost) : 4;
      var poolLs = soloOpponentStageMemberCandidates(maxCostLs);
      if (cl.template === "live_start_opp_wait_exclude_unit") {
        poolLs = poolLs.filter(function (m) {
          if (!m) return false;
          if (memberPrintedBladeCount(m) > (cl.maxPrintedHearts != null ? Number(cl.maxPrintedHearts) : 3)) {
            return false;
          }
          var mcEx = mergedCatalogCard(m);
          if (cl.excludedUnit && catalogCardMatchesGroupTag(mcEx, cl.excludedUnit)) return false;
          return true;
        });
      }
      var leadLs =
        cl.template === "live_start_opp_wait_exclude_unit"
          ? "相手ステージの条件メンバー1人をウェイトにします。"
          : "相手ステージのコスト" + maxCostLs + "以下のメンバー1人をウェイトにします。";
      openOppWaitPickFromPool(poolLs, leadLs, function () {
        finishResolved();
      });
      return;
    }

    if (cl.template === "live_start_activate_self_if_low_score_live") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var maxScLs = cl.maxLiveScore != null ? Number(cl.maxLiveScore) : 2;
      if (!boardHasLowScoreLiveCard(maxScLs)) {
        showToast("スコア" + maxScLs + "以下のライブカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-activate-self-low");
      inst.lcWait = false;
      inst.isRotated = false;
      inst.lcActive = true;
      showToast((mergedCatalogCard(inst).name || "メンバー") + " をアクティブにしました");
      finishResolved();
      return;
    }

    if (cl.template === "live_start_pick_player_waiting_deck_bottom") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-pick-wait-deck-bottom");
      openPickSelfOrOpponentDialog(function (target) {
        if (!target) {
          if (cl.optional || cl.hasOptionalCost) finishResolved();
          else showToast("対象を選ばなかったためスキップしました");
          finishResolved();
          return;
        }
        if (target === "opponent" && versusOnlineActive()) {
          showToast("相手の控え室操作は相手盤面で行ってください");
          finishGuided();
          return;
        }
        var maxPick = cl.deckBottomPickMax != null ? Math.max(1, Math.floor(Number(cl.deckBottomPickMax))) : 1;
        function runPickWaitBottom() {
          var wCand = waitingPickCandidates(cl.filters || { pickType: T_MEMBER }, null);
          if (!wCand.length) {
            showToast("控え室に対象カードがありません");
            finishResolved();
            return;
          }
          /** @type {*[]} */
          var pickedCards = [];
          function stepPick(n) {
            if (pickedCards.length >= maxPick || n >= maxPick) {
              pickedCards.forEach(function (c) {
                state.deck.push(c);
              });
              showToast(
                pickedCards.length + " 枚を山札の一番下に置きました（" + (target === "opponent" ? "相手" : "自分") + "）",
              );
              finishResolved();
              return;
            }
            var remain = wCand.filter(function (c) {
              return (
                pickedCards.findIndex(function (p) {
                  return p && String(p.id) === String(c.id);
                }) < 0
              );
            });
            if (!remain.length) {
              stepPick(maxPick);
              return;
            }
            openPickFromWaitingDialog(
              remain,
              "控え室からメンバーを選び、山札の一番下に置きます（" + (pickedCards.length + 1) + "/" + maxPick + "）。",
              function (pid) {
                if (!pid) {
                  if (pickedCards.length) stepPick(maxPick);
                  else finishResolved();
                  return;
                }
                for (var wi = 0; wi < state.waitingRoom.length; wi++) {
                  if (state.waitingRoom[wi] && String(state.waitingRoom[wi].id) === String(pid)) {
                    pickedCards.push(state.waitingRoom.splice(wi, 1)[0]);
                    break;
                  }
                }
                stepPick(n + 1);
              },
              { okLabel: "選ぶ", dialogTitle: "控え室 — 山札下へ" },
            );
          }
          stepPick(0);
        }
        if (target === "opponent") {
          runOnTargetPlayerBoard("opponent", runPickWaitBottom);
          return;
        }
        runPickWaitBottom();
      });
      return;
    }

    if (cl.template === "live_start_pick_player_deck_top_peek") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-deck-top-peek");
      openPickSelfOrOpponentDialog(function (target) {
        if (!target) {
          finishResolved();
          return;
        }
        if (target === "opponent" && versusOnlineActive()) {
          showToast("相手の山札操作は相手盤面で行ってください");
          finishGuided();
          return;
        }
        function runPeek() {
          if (!state.deck.length) {
            showToast("山札がありません");
            finishResolved();
            return;
          }
          var top = state.deck[0];
          openDeckTopCardsRevealDialog(
            [top],
            function () {
              var toWait = window.confirm(
                (mergedCatalogCard(top).name || "カード") + " を控え室に置きますか？（キャンセルでそのまま）",
              );
              if (toWait) {
                state.waitingRoom.push(state.deck.shift());
                showToast("山札の一番上を控え室に置きました");
              } else {
                showToast("山札の一番上を確認しました");
              }
              finishResolved();
            },
            {
              mode: "view",
              title: "山札の一番上",
              lead: "山札の一番上のカードです。",
              okLabel: "確認した",
              sourceInst: inst,
            },
          );
        }
        if (target === "opponent") {
          runOnTargetPlayerBoard("opponent", runPeek);
          return;
        }
        runPeek();
      });
      return;
    }

    if (cl.template === "live_start_waiting_deck_bottom_tiered") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var pickBottomN = cl.deckBottomPickCount != null ? Math.max(1, Math.floor(Number(cl.deckBottomPickCount))) : 2;
      var wPoolB = waitingPickCandidates(cl.filters || { pickType: T_MEMBER }, null);
      if (wPoolB.length < pickBottomN) {
        showToast("控え室にメンバーが " + pickBottomN + " 枚ありません");
        finishResolved();
        return;
      }
      /** @type {*[]} */
      var pickedBottom = [];
      function stepBottom(n) {
        if (pickedBottom.length >= pickBottomN) {
          pushHistoryBefore("live-start-wait-deck-bottom-tiered");
          pickedBottom.forEach(function (c) {
            if (c) state.deck.push(c);
          });
          var costSumB = 0;
          pickedBottom.forEach(function (c) {
            if (c) costSumB += memberFlooredPrintedCost(c);
          });
          var tiers = cl.costTiers || [];
          var applied = false;
          tiers.forEach(function (tier) {
            if (!tier || tier.costSum !== costSumB) return;
            if (tier.kind === "draw" && state.deck.length) {
              var db = state.deck.shift();
              state.hand.push(db);
              presentAbilityDrawsToHand([db], inst);
              showToast("コスト合計 " + costSumB + " で1枚引きました");
              applied = true;
            } else if (tier.kind === "live_score") {
              var pls = Math.max(1, Math.floor(Number(tier.liveScoreGrant) || 1));
              bumpLiveScoreEffectBonus(pls, "コスト合計 " + costSumB + " で合計スコア＋" + pls);
              applied = true;
            } else if (tier.kind === "grant_wild_heart") {
              if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
              var wh = "{{jyouji.png|常時}}元々持つハートはすべて{{heart_00.png|heart0}}として扱う。";
              if (inst._grantedJoujiSegmentRaws.indexOf(wh) < 0) inst._grantedJoujiSegmentRaws.push(wh);
              try {
                syncJoujiPassiveEffectsAll();
              } catch (_) {}
              showToast("コスト合計 " + costSumB + " でALLハート常時効果を得ました");
              applied = true;
            }
          });
          if (!applied) showToast("デッキ下に並べ替えました（コスト合計 " + costSumB + "）");
          finishResolved();
          return;
        }
        var remainB = wPoolB.filter(function (c) {
          return (
            pickedBottom.findIndex(function (p) {
              return p && String(p.id) === String(c.id);
            }) < 0
          );
        });
        openPickFromWaitingDialog(
          remainB,
          "控え室からメンバーを " + (pickedBottom.length + 1) + " 枚目（計 " + pickBottomN + " 枚）デッキ下へ。",
          function (pid) {
            if (!pid) {
              finishResolved();
              return;
            }
            for (var wi = 0; wi < state.waitingRoom.length; wi++) {
              if (state.waitingRoom[wi] && String(state.waitingRoom[wi].id) === String(pid)) {
                pickedBottom.push(state.waitingRoom.splice(wi, 1)[0]);
                break;
              }
            }
            stepBottom(n + 1);
          },
          { okLabel: "選ぶ", dialogTitle: "控え室 — デッキ下" },
        );
      }
      stepBottom(0);
      return;
    }

    if (cl.template === "live_start_optional_energy_waiting_reorder_deck_top") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-opt-energy-reorder");
      payAbilityCost(inst, cl, false, function (paid) {
        if (!paid) {
          finishResolved();
          return;
        }
        var topN = cl.deckTopPickCount != null ? Math.max(1, Math.floor(Number(cl.deckTopPickCount))) : 2;
        var wPool = waitingPickCandidates(cl.filters || { pickType: T_MEMBER }, null);
        if (wPool.length < topN) {
          showToast("控え室にメンバーが " + topN + " 枚ありません");
          finishResolved();
          return;
        }
        /** @type {*[]} */
        var pickedMem = [];
        function stepMem(n) {
          if (pickedMem.length >= topN) {
            openDeckLookReorderDialog(pickedMem.slice(), function (deckIds, waitingIds) {
              var byId = {};
              pickedMem.forEach(function (c) {
                byId[String(c.id)] = c;
              });
              for (var di = deckIds.length - 1; di >= 0; di--) {
                var dc = byId[deckIds[di]];
                if (dc) state.deck.unshift(dc);
              }
              waitingIds.forEach(function (wid) {
                var wc = byId[wid];
                if (wc) state.waitingRoom.push(wc);
              });
              var costSum = 0;
              pickedMem.forEach(function (c) {
                if (!c) return;
                costSum += memberFlooredPrintedCost(c);
              });
              inst._lastWaitingReorderCostSum = costSum;
              showToast("選んだカードを山札の上に並べ替えました（コスト合計 " + costSum + "）");
              finishResolved();
            });
            return;
          }
          var remainM = wPool.filter(function (c) {
            return (
              pickedMem.findIndex(function (p) {
                return p && String(p.id) === String(c.id);
              }) < 0
            );
          });
          openPickFromWaitingDialog(
            remainM,
            "控え室からメンバーを " + (pickedMem.length + 1) + " 枚目を選びます（計 " + topN + " 枚）。",
            function (pid) {
              if (!pid) {
                finishResolved();
                return;
              }
              for (var wi = 0; wi < state.waitingRoom.length; wi++) {
                if (state.waitingRoom[wi] && String(state.waitingRoom[wi].id) === String(pid)) {
                  pickedMem.push(state.waitingRoom.splice(wi, 1)[0]);
                  break;
                }
              }
              stepMem(n + 1);
            },
            { okLabel: "選ぶ", dialogTitle: "控え室 — 山札上へ" },
          );
        }
        stepMem(0);
      });
      return;
    }

    if (cl.template === "live_start_optional_hearts_wild") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var payWild = window.confirm("元々持つハートをすべてワイルドカードにしますか？（キャンセルでスキップ）");
      if (!payWild) {
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-hearts-wild");
      inst._baseHeartsWildcardUntilLiveEnd = true;
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      showToast("ライブ終了時まで、元々持つハートはすべてワイルドカードになります");
      finishResolved();
      return;
    }

    if (cl.template === "live_start_hand_named_discard_hearts_grant") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var charNamesHd = cl.characterNames && cl.characterNames.length ? cl.characterNames : [];
      pushHistoryBefore("live-start-hand-named-hearts");
      openPickHandOptionalMultiToWaiting(
        "手札の指定メンバーを好きな枚数控え室に置けます（0枚可）。置いたカードのハート色ごとに1つずつ得ます。",
        function (h) {
          if (!charNamesHd.length) return true;
          return handInstMatchesCharacterNames(h, charNamesHd);
        },
        function (pickedIds) {
          if (pickedIds === null) {
            finishResolved();
            return;
          }
          /** @type {*[]} */
          var discarded = [];
          pickedIds.forEach(function (hid) {
            var hi = state.hand.findIndex(function (x) {
              return x && String(x.id) === String(hid);
            });
            if (hi >= 0) discarded.push(state.hand.splice(hi, 1)[0]);
          });
          discarded.forEach(function (d) {
            if (d) state.waitingRoom.push(d);
          });
          discarded.forEach(function (d) {
            grantHeartsFromDiscardedCardColors(inst, d);
          });
          if (discarded.length) {
            try {
              syncJoujiPassiveEffectsAll();
            } catch (_) {}
          }
          showToast("手札 " + discarded.length + " 枚を捨て、ハートを得ました（ライブ終了まで）");
          finishResolved();
        },
        {
          dialogTitle: "捨て札 — ハートを得る",
          okLabel: "選んだカードを捨てる",
        },
      );
      return;
    }

    if (cl.template === "live_start_live_frame_pick_deck_top") {
      var lfPool = liveFrameMemberInsts().filter(function (c) {
        var mcL = mergedCatalogCard(c);
        if (c.type !== T_LIVE) return false;
        if (!catalogCardMatchesPickFilters(mcL, cl.filters || {})) return false;
        if (cl.excludeTriggerOnPick && cardHasTrigger(mcL, cl.excludeTriggerOnPick)) return false;
        if (!cl.excludeTriggerOnPick && String(mcL.ability || "").trim()) return false;
        return true;
      });
      if (lfPool.length < 2) {
        showToast("ライブ置き場に条件のライブが2枚以上ありません");
        if (cl.optional || cl.hasOptionalCost) finishResolved();
        else finishResolved();
        return;
      }
      pushHistoryBefore("ls-live-frame-deck-top");
      openPickFromWaitingDialog(lfPool, "ライブ置き場から1枚選び、デッキの一番上に置きます。", function (pid) {
        if (!pid) {
          finishResolved();
          return;
        }
        ["left", "center", "right"].forEach(function (k) {
          var arr = state.liveArea[k] || [];
          var li = arr.findIndex(function (c) {
            return c && String(c.id) === String(pid);
          });
          if (li >= 0) {
            var card = arr.splice(li, 1)[0];
            state.deck.unshift(card);
          }
        });
        var segLf = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
        var gLf = extractGrantedJoujiTextsFromSegment(segLf);
        if (gLf.length) {
          gLf.forEach(function (g) {
            grantJoujiSegmentToMember(inst, g);
          });
        }
        var heartGrantLf = parseHeartGrantJoujiFromSegmentRaw(segLf);
        if (heartGrantLf) grantJoujiSegmentToMember(inst, heartGrantLf);
        if (gLf.length || heartGrantLf) {
          try {
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "live_success_self_wait_if_others") {
      var others = eachStageColumnMemberInsts().filter(function (m) {
        return m && String(m.id) !== String(inst.id);
      });
      if (!others.length) {
        showToast("このメンバー以外のステージのメンバーがいません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-self-wait-others");
      waitMemberInst(inst);
      finishResolved();
      return;
    }

    if (cl.template === "yell_resolution_pick_self_score") {
      if (ownLiveScoreEstimate() <= opponentLiveScoreEstimate()) {
        showToast("ライブの合計スコアが相手より高くありません");
        finishResolved();
        return;
      }
      var selfInRes = (state.resolutionArea || []).find(function (c) {
        return c && String(c.id) === String(inst.id);
      });
      if (!selfInRes) {
        showToast("このカードはエール公開にありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("yell-res-pick-self");
      var ri = state.resolutionArea.findIndex(function (c) {
        return c && String(c.id) === String(inst.id);
      });
      if (ri >= 0) {
        var rc = state.resolutionArea.splice(ri, 1)[0];
        state.hand.push(rc);
        presentAbilityDrawsToHand([rc], inst);
      }
      finishResolved();
      return;
    }

    if (cl.template === "yell_resolution_live_count_score") {
      var livesN = (state.resolutionArea || []).filter(function (c) {
        return c && mergedCatalogCard(c).type === T_LIVE;
      }).length;
      var minL = cl.minResolutionLives || 1;
      if (livesN < minL) {
        showToast("エール公開のライブが " + minL + " 枚未満です");
        finishResolved();
        return;
      }
      var grantSc =
        livesN >= 3 && cl.liveScoreGrantHigh != null ? cl.liveScoreGrantHigh : cl.liveScoreGrant || 1;
      pushHistoryBefore("yell-res-live-score");
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      var scSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋" + grantSc + "する。";
      if (inst._grantedJoujiSegmentRaws.indexOf(scSeg) < 0) inst._grantedJoujiSegmentRaws.push(scSeg);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      showToast("ライブ公開枚数に応じて合計スコア＋" + grantSc);
      finishResolved();
      return;
    }

    if (cl.template === "yell_reveal_series_live_score_plus") {
      if (cl.stageArea && !abilityInstMatchesStageArea(inst, cl.stageArea)) {
        showToast("指定エリアにいるときのみ効果を解決できます");
        finishResolved();
        return;
      }
      var hasMatch = (state.resolutionArea || []).some(function (c) {
        if (!c) return false;
        var cat = mergedCatalogCard(c);
        if (cat.type !== T_LIVE) return false;
        return catalogCardMatchesPickFilters(cat, cl.filters || {});
      });
      if (!hasMatch) {
        showToast("エール公開に条件のライブがありません");
        finishResolved();
        return;
      }
      var grantPlus = cl.liveScoreGrant || 1;
      pushHistoryBefore("yell-reveal-series-live-score");
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      var scSeg2 = "{{jyouji.png|常時}}ライブの合計スコアを＋" + grantPlus + "する。";
      if (inst._grantedJoujiSegmentRaws.indexOf(scSeg2) < 0) inst._grantedJoujiSegmentRaws.push(scSeg2);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      showToast("エール公開の条件ライブにより合計スコア＋" + grantPlus);
      finishResolved();
      return;
    }

    if (cl.template === "optional_energy_live_score_plus") {
      pushHistoryBefore("optional-energy-live-score");
      payAbilityCost(inst, cl, false, function (paid) {
        if (!paid) {
          inst._liveSuccessEffectDeclined = true;
          finishResolved();
          return;
        }
        var plus = cl.liveScoreGrant || 1;
        bumpLiveScoreEffectBonus(plus, "ライブの合計スコアを＋" + plus + " しました");
        finishResolved();
      });
      return;
    }

    if (cl.template === "live_card_score_plus") {
      if (!checkCardScorePlusPreconditions(cl, mc, kind)) {
        showToast("スコアアップ効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-card-score-plus");
      var cardPlus = Math.max(1, Math.floor(Number(cl.cardScoreGrant) || 1));
      applyLiveCardScorePlus(inst, cardPlus, "このカードのスコアを＋" + cardPlus + " しました");
      finishResolved();
      return;
    }

    if (cl.template === "live_success_deck_wait_pick_live") {
      var topN = cl.deckTopCount || 5;
      if (state.deck.length < topN) {
        showToast("山札が " + topN + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-deck-wait-pick-live");
      var toWait = shiftDeckTopCards(topN);
      openDeckTopCardsRevealDialog(
        toWait,
        function (proceed) {
          if (!proceed) {
            if (toWait.length) state.deck.unshift.apply(state.deck, toWait.slice().reverse());
            finishResolved();
            return;
          }
          state.waitingRoom.push.apply(state.waitingRoom, toWait);
          if (cl.minDistinctLiveNames && countDistinctCardNamesInWaiting(cl.filters || {}) < cl.minDistinctLiveNames) {
            showToast("控え室の異名ライブが " + cl.minDistinctLiveNames + " 種類未満です");
            finishResolved();
            return;
          }
          var liveW = waitingPickCandidates(Object.assign({ pickType: T_LIVE }, cl.filters || {}), null);
          if (!liveW.length) {
            finishResolved();
            return;
          }
          openPickFromWaitingDialog(liveW, "控え室からライブを1枚手札に加えます。", function (pid) {
            if (pid) moveInstFromWaitingToHand(pid, inst);
            finishResolved();
          });
        },
        {
          title: "山札から控え室へ",
          lead: "山札の上 " + topN + " 枚を控え室に置きます。内容を確認してください。",
          sourceInst: inst,
        },
      );
      return;
    }

    if (cl.template === "live_success_enter_under_member") {
      var underPool = getStackMembersBelowHost(inst).filter(function (m) {
        return catalogCardMatchesPickFilters(mergedCatalogCard(m), cl.filters || {});
      });
      if (!underPool.length) {
        showToast("このメンバーの下に条件のメンバーがありません");
        if (cl.optional || cl.hasOptionalCost) finishResolved();
        else finishResolved();
        return;
      }
      var emptyCols = emptyStageColumns();
      if (!emptyCols.length) {
        showToast("空きエリアがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ls-enter-under-member");
      var underM = underPool[0];
      var targetCol = emptyCols[0];
      if (emptyCols.length > 1) {
        var pickCol = window.prompt(
          "登場先: 1=左 2=センター 3=右\n\n" + emptyCols.map(function (c, i) {
            return String(i + 1) + "=" + c;
          }).join(" "),
        );
        var ci = Number(pickCol) - 1;
        if (ci >= 0 && ci < emptyCols.length) targetCol = emptyCols[ci];
      }
      var ucol = stageColumnKeyHostingMember(underM.id);
      if (ucol) {
        var slot = state.stage[ucol] || [];
        var ui = slot.findIndex(function (c) {
          return c && String(c.id) === String(underM.id);
        });
        if (ui >= 0) slot.splice(ui, 1);
      }
      var snapU = snapshotBoard();
      var enU = (state.stage[targetCol] || []).filter(function (c) {
        return c && c.type === T_ENERGY;
      });
      state.stage[targetCol] = enU.concat([underM]);
      finalizeWaitingMemberStageEntry(snapU);
      finishResolved();
      return;
    }

    if (cl.template === "surplus_heart_score_modifier") {
      var surplusIn = window.prompt(
        "自分の余剰ハート数を入力（0=余剰なし、2以上=2つ以上）",
        "0",
      );
      if (surplusIn == null) {
        finishResolved();
        return;
      }
      var surplusN = Math.max(0, Math.floor(Number(surplusIn) || 0));
      pushHistoryBefore("ls-surplus-heart-score");
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      var modSeg = null;
      if (surplusN <= 0) modSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
      else if (surplusN >= 2) modSeg = "{{jyouji.png|常時}}ライブの合計スコアを－１する。（0未満にならない）";
      if (modSeg && inst._grantedJoujiSegmentRaws.indexOf(modSeg) < 0) {
        inst._grantedJoujiSegmentRaws.push(modSeg);
      }
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      finishResolved();
      return;
    }

    if (cl.template === "live_start_center_series_blade_set") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-center-blade-set");
      var seriesTagBlade = (cl.filters && cl.filters.seriesTag) || null;
      var targetBlade = cl.bladeSetCount || 3;
      var appliedBladeSet = 0;
      var centerSlot = state.stage.center || [];
      centerSlot.forEach(function (m) {
        if (!m || m.type !== T_MEMBER) return;
        if (seriesTagBlade && !catalogCardMatchesGroupTag(mergedCatalogCard(m), seriesTagBlade)) return;
        setMemberBladeTotalUntilLiveEnd(m, targetBlade);
        appliedBladeSet++;
      });
      if (!appliedBladeSet) showToast("センターの対象メンバーがいませんでした");
      finishResolved();
      return;
    }

    if (cl.template === "live_start_edelnote_blade_heart_pair") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-edelnote-pair");
      var edelMembers = eachStageColumnMemberInsts().filter(function (m) {
        return m && catalogCardMatchesGroupTag(mergedCatalogCard(m), "EdelNote");
      });
      if (edelMembers.length < 1) {
        showToast("ステージに EdelNote のメンバーがいません");
        finishResolved();
        return;
      }
      openPickFromWaitingDialog(edelMembers, "EdelNote のメンバー1人にブレードを付与します。", function (bladePid) {
        if (!bladePid) {
          finishResolved();
          return;
        }
        var bladeMem = findCardInstById(bladePid);
        if (bladeMem) gainBladesUntilEnd(bladeMem, cl.bladeGain || 2);
        var bladeName = bladeMem ? String(mergedCatalogCard(bladeMem).name || "") : "";
        var heartPool = edelMembers.filter(function (m) {
          return m && String(mergedCatalogCard(m).name || "") !== bladeName;
        });
        if (!heartPool.length) {
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(heartPool, "名前の異なる EdelNote メンバー1人に紫ハートを付与します。", function (heartPid) {
          if (heartPid) {
            var heartMem = findCardInstById(heartPid);
            if (heartMem) grantHeartSlotUntilLiveEnd(heartMem, 6, 2);
          }
          try {
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
          finishResolved();
        });
      });
      return;
    }

    if (cl.template === "grant_jouji_session") {
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "live_success" && !checkAbilityLiveSuccessPreconditions(cl)) {
        showToast("ライブ成功時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "kidou" && !checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("grant-jouji-session");
      var segLs = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
      var grants = extractGrantedJoujiTextsFromSegment(segLs);
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      grants.forEach(function (g) {
        if (inst._grantedJoujiSegmentRaws.indexOf(g) < 0) inst._grantedJoujiSegmentRaws.push(g);
      });
      if (cl.bladeGain && cl.bladeGain > 0) gainBladesUntilEnd(inst, cl.bladeGain);
      if (cl.liveScoreGrant && cl.liveScoreGrant > 0) {
        var scoreSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋" + cl.liveScoreGrant + "する。";
        if (inst._grantedJoujiSegmentRaws.indexOf(scoreSeg) < 0) {
          inst._grantedJoujiSegmentRaws.push(scoreSeg);
        }
      }
      var totalScorePlus = sumLiveTotalScorePlusFromJoujiSegments(inst._grantedJoujiSegmentRaws);
      if (instIsLiveCard(inst)) {
        if (totalScorePlus > 0) {
          bumpLiveScoreEffectBonus(totalScorePlus);
        }
      } else {
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        if (totalScorePlus > 0) {
          try {
            syncLiveCenterScoreBar(getRenderPassLiveBundle());
          } catch (_) {}
        }
      }
      showToast(
        totalScorePlus > 0 && instIsLiveCard(inst)
          ? "ライブ終了時まで合計スコア＋" + totalScorePlus + " を適用しました"
          : "ライブ終了時までの常時効果を適用しました",
      );
      finishResolved();
      return;
    }

    if (cl.template === "live_start_yell_reveal_reduction") {
      if (!checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-yell-reduction");
      inst._liveSessionYellRevealReduction = Math.max(
        0,
        Math.floor(Number(cl.yellRevealReduction) || 8),
      );
      showToast("エール公開上限を " + inst._liveSessionYellRevealReduction + " 枚減らします（ライブ終了まで）");
      finishResolved();
      return;
    }

    if (cl.template === "live_start_activate_all_stage_members") {
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-activate-stage");
      var actN = activateAllStageMembers(/1人まで/.test(abilityPlainText(mc)) ? 1 : 99);
      showToast("ステージのメンバー " + actN + " 人をアクティブにしました");
      finishResolved();
      return;
    }

    if (cl.template === "live_start_activate_liella_and_energy") {
      pushHistoryBefore("live-start-liella-energy");
      var pack = activateAllLiellaOnStageAndEnergy();
      showToast(
        "Liella! メンバー " + pack.members + " 人とエネルギー " + pack.energy + " 枚をアクティブにしました",
      );
      finishResolved();
      return;
    }

    if (cl.template === "live_start_position_change") {
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "kidou" && !checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (!stageColumnKeyHostingMember(inst.id)) {
        showToast("ステージにいるメンバーでのみポジションチェンジできます");
        finishResolved();
        return;
      }
      pushHistoryBefore("position-change");
      openPositionChangeColumnPickDialog(
        inst,
        cl,
        "ポジションチェンジ: 移動先エリアを選びます。",
        function (targetCol) {
          if (!targetCol) {
            if (cl.optional || cl.hasOptionalCost) finishResolved();
            else showToast("移動先を選ばなかったためスキップしました");
            finishResolved();
            return;
          }
          var snapPc = snapshotBoard();
          if (!swapStageMemberPositionChange(inst, targetCol)) {
            showToast("ポジションチェンジできませんでした");
            finishResolved();
            return;
          }
          try {
            syncPlayBonusesAfterStageMembershipChange(snapPc);
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
          var segPc = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
          var grantsPc = extractGrantedJoujiTextsFromSegment(segPc);
          if (grantsPc.length) {
            if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
            grantsPc.forEach(function (g) {
              if (inst._grantedJoujiSegmentRaws.indexOf(g) < 0) inst._grantedJoujiSegmentRaws.push(g);
            });
          }
          if (cl.bladeGain && cl.bladeGain > 0) gainBladesUntilEnd(inst, cl.bladeGain);
          showToast("ポジションチェンジしました");
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "live_start_hand_live_to_deck_bottom_look") {
      var liveHand = state.hand.filter(function (h) {
        return h && h.type === T_LIVE;
      });
      if (!liveHand.length) {
        showToast("手札にライブカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("live-start-hand-live-bottom-look");
      openPickFromWaitingDialog(
        liveHand,
        "ライブ開始時: 手札のライブを1枚選び、山札の一番下に置きます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var hi = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(pid);
          });
          if (hi < 0) {
            finishResolved();
            return;
          }
          var moved = state.hand.splice(hi, 1)[0];
          state.deck.push(moved);
          var cnt = cl.deckTopCount || 2;
          if (state.deck.length < cnt) {
            showToast("山札が足りません（残り " + state.deck.length + " 枚）");
            finishResolved();
            return;
          }
          var looked = state.deck.splice(0, cnt);
          render();
          openDeckLookReorderDialog(looked, function (deckIds, waitingIds) {
            var byId = {};
            looked.forEach(function (c) {
              byId[String(c.id)] = c;
            });
            for (var di = deckIds.length - 1; di >= 0; di--) {
              var dc = byId[deckIds[di]];
              if (dc) state.deck.unshift(dc);
            }
            waitingIds.forEach(function (wid) {
              var wc = byId[wid];
              if (wc) state.waitingRoom.push(wc);
            });
            var sentLiveLook = waitingIds
              .map(function (wid) {
                return byId[wid];
              })
              .filter(function (c) {
                return !!c;
              });
            function finishLiveReorder() {
              showToast("ライブを山札下に置き、上 " + cnt + " 枚を並べ替えました");
              finishResolved();
            }
            if (sentLiveLook.length) {
              revealCardsSentFromDeckToWaiting(
                sentLiveLook,
                "控え室に置いたカードを確認してください。",
                finishLiveReorder,
                inst,
              );
            } else {
              finishLiveReorder();
            }
          });
        },
      );
      return;
    }

    if (cl.template === "blade_gain_only" || cl.template === "optional_energy_blade_until_live_end") {
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (cl.bladeGain && cl.bladeGain > 0) gainBladesUntilEnd(inst, cl.bladeGain);
      finishResolved();
      return;
    }
    if (cl.template === "passive_track") {
      if (cl.bladeGain && cl.bladeGain > 0) {
        gainBladesUntilEnd(inst, cl.bladeGain);
        finishResolved();
        return;
      }
      finishGuided();
      return;
    }
    if (cl.template === "guided_manual") {
      if (cl.bladeGain && cl.bladeGain > 0) {
        gainBladesUntilEnd(inst, cl.bladeGain);
        finishResolved();
        return;
      }
      finishGuided();
      return;
    }
    if (cl.template === "live_success_pick_options" || cl.template === "ability_pick_one") {
      var choices = cl.abilityChoices && cl.abilityChoices.length ? cl.abilityChoices : [];
      if (!choices.length) {
        finishGuided();
        return;
      }
      var minC = cl.choiceMin != null ? cl.choiceMin : 1;
      var maxC = cl.choiceMax != null ? cl.choiceMax : 1;
      if (cl.choiceBoostSeriesTag && successfulLiveAreaHasSeriesTag(cl.choiceBoostSeriesTag)) {
        if (cl.choiceBoostMin != null) minC = cl.choiceBoostMin;
        if (cl.choiceBoostMax != null) maxC = cl.choiceBoostMax;
      }
      var leadChoice =
        kind === "kidou"
          ? "起動: 以下から効果を選びます。"
          : cl.template === "live_success_pick_options"
            ? "ライブ成功時: 以下から効果を選びます。"
            : "登場時: 以下から効果を選びます。";
      openAbilityMultiChoiceDialog(choices, minC, maxC, leadChoice, function (selected) {
        if (!selected || !selected.length) {
          showToast("効果を選ばなかったためスキップしました");
          finishResolved();
          return;
        }
        pushHistoryBefore("ability-multi-choice");
        runAbilityChoiceTextsSequential(selected, 0, inst, cl, kind, finishResolved);
      });
      return;
    }

    if (cl.template === "pay_energy_pick_one") {
      var payChoices = cl.abilityChoices && cl.abilityChoices.length ? cl.abilityChoices : [];
      if (!payChoices.length) {
        finishGuided();
        return;
      }
      var payLead =
        kind === "kidou"
          ? "起動: E支払い後、以下から1つを選びます。"
          : kind === "live_start"
            ? "ライブ開始時: E支払い後、以下から1つを選びます。"
            : "登場時: E支払い後、以下から1つを選びます。";
      openAbilityMultiChoiceDialog(payChoices, 1, 1, payLead, function (selected) {
        if (!selected || !selected.length) {
          showToast("効果を選ばなかったためスキップしました");
          finishResolved();
          return;
        }
        pushHistoryBefore("pay-energy-pick-one");
        runAbilityChoiceTextsSequential(selected, 0, inst, cl, kind, finishResolved);
      });
      return;
    }

    if (cl.template === "kidou_wait_or_hand_for_energy") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるメンバーでのみ起動できます");
        return;
      }
      pushHistoryBefore("kidou-energy-active");
      var activated = activateOneUprightEnergy();
      if (!activated) showToast("エネルギーをアクティブにできませんでした");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_liella_double_baton_center") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるカードでのみ登場時効果を解決できます");
        return;
      }
      if (countLiellaBatonSourcesOnInst(inst) < 2) {
        openTwoMemberBatonPickDialog(inst, function (proceed, batonIds) {
          if (!proceed) {
            finishResolved();
            return;
          }
          if (batonIds && batonIds.length) inst._soloBatonMemberIds = batonIds.slice(0, 2);
          runToujouLiellaDoubleBatonCenter(inst, cl, finishResolved);
        });
        return;
      }
      runToujouLiellaDoubleBatonCenter(inst, cl, finishResolved);
      return;
    }

    if (cl.template === "deck_top_to_waiting") {
      var topNw = cl.deckTopCount || 3;
      if (state.deck.length < topNw) {
        showToast("山札が " + topNw + " 枚ありません（残り " + state.deck.length + " 枚）");
        finishResolved();
        return;
      }
      pushHistoryBefore("ability-deck-top-wait");
      var revealedNw = shiftDeckTopCards(topNw);
      openDeckTopCardsRevealDialog(revealedNw, function (proceed) {
        if (!proceed) {
          if (revealedNw.length) state.deck.unshift.apply(state.deck, revealedNw.slice().reverse());
          finishResolved();
          return;
        }
        state.waitingRoom.push.apply(state.waitingRoom, revealedNw);
        showToast("山札の上 " + revealedNw.length + " 枚を控え室に置きました");
        finishResolved();
      }, {
        title: "山札から控え室へ",
        lead: "山札の上 " + topNw + " 枚を控え室に置きます。内容を確認してください。",
        sourceInst: inst,
      });
      return;
    }

    if (cl.template === "activate_energy") {
      if (kind === "kidou" && !checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ability-activate-energy");
      var actN = activateEnergyCount(cl.energyActiveCount || 1);
      showToast("エネルギーを " + actN + " 枚アクティブにしました");
      finishResolved();
      return;
    }

    if (cl.template === "energy_deck_to_wait") {
      pushHistoryBefore("ability-energy-deck-wait");
      var wN = addEnergyFromDeckToArea(cl.energyWaitCount || 1, true);
      showToast("エネルギーデッキから " + wN + " 枚をウェイトで置きました");
      finishResolved();
      return;
    }

    if (cl.template === "energy_deck_to_active") {
      pushHistoryBefore("ability-energy-deck-active");
      var aN = addEnergyFromDeckToArea(cl.energyActiveCount || 1, false);
      showToast("エネルギーデッキから " + aN + " 枚をアクティブで置きました");
      finishResolved();
      return;
    }

    if (cl.template === "draw_per_stage_member_discard") {
      if (!checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var memN = eachStageColumnMemberInsts().length;
      var totalDraw = memN * (cl.deckDrawCount || 1);
      if (totalDraw <= 0) {
        showToast("ステージにメンバーがいないためドローしません");
        finishResolved();
        return;
      }
      if (state.deck.length < totalDraw) {
        showToast("山札が足りません（必要 " + totalDraw + " / 残り " + state.deck.length + "）");
        finishResolved();
        return;
      }
      pushHistoryBefore("ability-draw-per-member");
      var drawnPm = [];
      for (var dpi = 0; dpi < totalDraw; dpi++) {
        if (state.deck.length) drawnPm.push(state.deck.shift());
      }
      drawnPm.forEach(function (c) {
        state.hand.push(c);
      });
      presentAbilityDrawsToHand(drawnPm, inst);
      render();
      var discPm = cl.effectDiscardCount || cl.handDiscardToWaiting || 0;
      if (discPm > 0 && state.hand.length >= discPm) {
        scheduleHandDiscardAfterAbilityDraw({
          discardN: discPm,
          discardLead: "登場時: 手札を " + discPm + " 枚控え室に置いてください",
          drawnCount: drawnPm.length,
          drawnToast: "山札から " + drawnPm.length + " 枚引きました（メンバー " + memN + " 人分）",
          finishResolved: finishResolved,
        });
        return;
      }
      showToast("山札から " + drawnPm.length + " 枚引きました（メンバー " + memN + " 人分）");
      finishResolved();
      return;
    }

    if (cl.template === "draw_until_hand_size") {
      var tgtHand = cl.targetHandSize != null ? cl.targetHandSize : 5;
      pushHistoryBefore("ability-draw-until-hand");
      var drewUt = 0;
      var drawnUt = [];
      while (state.hand.length < tgtHand && state.deck.length > 0) {
        var pulledUt = state.deck.shift();
        state.hand.push(pulledUt);
        drawnUt.push(pulledUt);
        drewUt++;
      }
      presentAbilityDrawsToHand(drawnUt, inst);
      render();
      showToast("手札が " + tgtHand + " 枚になるまで " + drewUt + " 枚引きました");
      finishResolved();
      return;
    }

    if (cl.template === "waiting_to_deck_bottom") {
      var wCand = waitingPickCandidates(cl.filters || { pickType: T_LIVE }, null);
      if (!wCand.length) {
        showToast("控え室にライブカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ability-wait-to-deck-bottom");
      openPickFromWaitingDialog(wCand, "登場時: 控え室のライブをデッキの一番下に置きます。", function (pid) {
        if (!pid) {
          finishResolved();
          return;
        }
        for (var wi = 0; wi < state.waitingRoom.length; wi++) {
          if (state.waitingRoom[wi] && String(state.waitingRoom[wi].id) === String(pid)) {
            var wl = state.waitingRoom.splice(wi, 1)[0];
            state.deck.push(wl);
            showToast((mergedCatalogCard(wl).name || "ライブ") + " を山札の一番下に置きました");
            break;
          }
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_hand_stage_enter") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるときのみ解決できます");
        return;
      }
      var maxC = (cl.filters && cl.filters.maxCost) != null ? cl.filters.maxCost : 4;
      var handPool = state.hand.filter(function (h) {
        if (!h || h.type !== T_MEMBER) return false;
        var hc = mergedCatalogCard(h);
        var cost = Number(hc.cost);
        if (!Number.isFinite(cost) || cost > maxC) return false;
        if (cl.filters && cl.filters.seriesTag && !catalogCardMatchesGroupTag(hc, cl.filters.seriesTag)) {
          return false;
        }
        return true;
      });
      if (!handPool.length) {
        showToast("条件に合う手札のメンバーがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-hand-stage-enter");
      openPickFromWaitingDialog(
        handPool,
        "登場時: 手札からコスト" + maxC + "以下のメンバーをステージに登場させます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var cols = [];
          ["left", "center", "right"].forEach(function (col) {
            var hasMem = false;
            (state.stage[col] || []).forEach(function (x) {
              if (x && x.type === T_MEMBER) hasMem = true;
            });
            if (!hasMem) cols.push(col);
          });
          if (!cols.length) {
            showToast("空きのステージエリアがありません");
            finishResolved();
            return;
          }
          var colLabels = cols.map(function (c) {
            return c === "left" ? "左サイド" : c === "right" ? "右サイド" : "センター";
          });
          openAbilityMultiChoiceDialog(colLabels, 1, 1, "登場させるエリアを選んでください。", function (picked) {
            if (!picked || !picked.length) {
              finishResolved();
              return;
            }
            var label = picked[0];
            var side = label.indexOf("左") >= 0 ? "left" : label.indexOf("右") >= 0 ? "right" : "center";
            var memInst = state.hand.find(function (h) {
              return h && String(h.id) === String(pid);
            });
            if (!memInst) {
              finishResolved();
              return;
            }
            placeHandMemberOnStageSide(memInst, side, { forceLowEnergy: true });
            finishResolved();
          });
        },
      );
      return;
    }

    if (cl.template === "toujou_baton_both_trim_hand_draw") {
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (!inst._toujouBatonFromLowerCostMemberId) {
        showToast("コストが低いメンバーからのバトンタッチで登場していないため、効果は発動しません");
        finishResolved();
        return;
      }
      var targetHandSize = Math.max(0, Math.floor(Number(cl.targetHandSize) || 3));
      var trimDrawN = Math.max(0, Math.floor(Number(cl.deckDrawCount) || 3));
      function drawAfterTrim() {
        if (state.deck.length < trimDrawN) {
          showToast(
            "山札が " + trimDrawN + " 枚ありません（残り " + state.deck.length + " 枚）",
          );
          finishResolved();
          return;
        }
        pushHistoryBefore("toujou-baton-trim-draw");
        var drawnTrim = [];
        for (var tdi = 0; tdi < trimDrawN; tdi++) {
          if (state.deck.length) drawnTrim.push(state.deck.shift());
        }
        drawnTrim.forEach(function (c) {
          state.hand.push(c);
        });
        presentAbilityDrawsToHand(drawnTrim, inst);
        showToast("山札から " + drawnTrim.length + " 枚引きました");
        showToast(
          "相手プレイヤーも手札を " +
            targetHandSize +
            " 枚に調整し、" +
            trimDrawN +
            " 枚引いてください（ソロ想定）",
          { duration: 5500 },
        );
        delete inst._toujouBatonFromLowerCostMemberId;
        finishResolved();
      }
      if (state.hand.length <= targetHandSize) {
        drawAfterTrim();
        return;
      }
      openHandKeepInHandDialog(
        targetHandSize,
        "手札を " +
          targetHandSize +
          " 枚にするため、残すカードを " +
          targetHandSize +
          " 枚選んでください。選ばなかったカードは控え室に置きます。",
        function (ok) {
          if (!ok) {
            finishResolved();
            return;
          }
          drawAfterTrim();
        },
        inst,
      );
      return;
    }

    if (cl.template === "draw_from_deck") {
      if (kind === "kidou" && !checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
        showToast("ライブ開始時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "live_success" && !checkAbilityLiveSuccessPreconditions(cl)) {
        showToast("ライブ成功時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var drawN = cl.deckDrawCount || 1;
      if (state.deck.length < drawN) {
        abortResolved("山札が " + drawN + " 枚ありません（残り " + state.deck.length + " 枚）");
        return;
      }
      pushHistoryBefore("ability-draw-deck");
      var drawn = [];
      for (var di = 0; di < drawN; di++) {
        if (state.deck.length) drawn.push(state.deck.shift());
      }
      drawn.forEach(function (c) {
        state.hand.push(c);
      });
      presentAbilityDrawsToHand(drawn, inst);
      render();
      showToast("山札から " + drawn.length + " 枚引きました");
      finishResolved();
      return;
    }

    if (cl.template === "draw_then_hand_to_deck_bottom") {
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var drawNBottom = cl.deckDrawCount || 1;
      var toBottomN = cl.effectDiscardCount || 1;
      if (state.deck.length < drawNBottom) {
        showToast("山札が " + drawNBottom + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("ability-draw-deck-bottom");
      for (var db = 0; db < drawNBottom; db++) {
        if (state.deck.length) state.hand.push(state.deck.shift());
      }
      render();
      if (state.hand.length < toBottomN) {
        showToast("手札が " + toBottomN + " 枚ありません");
        finishResolved();
        return;
      }
      var handPoolBottom = state.hand.slice();
      var pickedBottom = [];
      function pickNextToDeckBottom() {
        if (pickedBottom.length >= toBottomN || !state.hand.length) {
          if (pickedBottom.length) {
            pickedBottom.forEach(function (c) {
              state.deck.push(c);
            });
            showToast(pickedBottom.length + " 枚を山札の一番下に置きました");
          }
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(
          state.hand,
          "登場時: 手札から山札の一番下に置くカードを選びます（" +
            String(pickedBottom.length + 1) +
            "/" +
            toBottomN +
            "）。",
          function (pid) {
            if (!pid) {
              if (pickedBottom.length) {
                pickedBottom.forEach(function (c) {
                  state.deck.push(c);
                });
                showToast(pickedBottom.length + " 枚を山札の一番下に置きました");
              }
              finishResolved();
              return;
            }
            var hi = state.hand.findIndex(function (h) {
              return h && String(h.id) === String(pid);
            });
            if (hi >= 0) pickedBottom.push(state.hand.splice(hi, 1)[0]);
            render();
            pickNextToDeckBottom();
          },
        );
      }
      if (!handPoolBottom.length) {
        showToast("手札がありません");
        finishResolved();
        return;
      }
      pickNextToDeckBottom();
      return;
    }

    if (cl.template === "draw_then_hand_discard") {
      if (kind === "kidou" && !checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var drawN2 = cl.deckDrawCount || 1;
      var discardN = cl.effectDiscardCount || cl.handDiscardToWaiting || 1;
      if (state.deck.length < drawN2) {
        abortResolved("山札が " + drawN2 + " 枚ありません（残り " + state.deck.length + " 枚）");
        return;
      }
      pushHistoryBefore("ability-draw-discard");
      var drawn2 = [];
      for (var d2 = 0; d2 < drawN2; d2++) {
        if (state.deck.length) drawn2.push(state.deck.shift());
      }
      drawn2.forEach(function (c) {
        state.hand.push(c);
      });
      presentAbilityDrawsToHand(drawn2, inst);
      render();
      var discardLead =
        kind === "kidou"
          ? "起動: 手札を " + discardN + " 枚控え室に置いてください"
          : kind === "toujyou"
            ? "登場時: 手札を " + discardN + " 枚控え室に置いてください"
            : kind === "live_start"
              ? "ライブ開始時: 手札を " + discardN + " 枚控え室に置いてください"
              : "ライブ成功時: 手札を " + discardN + " 枚控え室に置いてください";
      scheduleHandDiscardAfterAbilityDraw({
        discardN: discardN,
        discardLead: discardLead,
        drawnCount: drawn2.length,
        drawnToast: "山札から " + drawn2.length + " 枚引きました",
        finishResolved: finishResolved,
        inst: inst,
        cl: cl,
      });
      return;
    }

    if (cl.template === "deck_top_look_reorder") {
      var cnt = cl.deckTopCount || 0;
      if (state.deck.length < cnt) {
        abortResolved("山札が " + cnt + " 枚ありません");
        return;
      }
      pushHistoryBefore("ability-deck-look");
      var lookedCards = state.deck.splice(0, cnt);
      render();
      openDeckLookReorderDialog(lookedCards, function (deckIds, waitingIds) {
        var byId = {};
        lookedCards.forEach(function (c) {
          byId[String(c.id)] = c;
        });
        for (var di = deckIds.length - 1; di >= 0; di--) {
          var dc = byId[deckIds[di]];
          if (dc) state.deck.unshift(dc);
        }
        waitingIds.forEach(function (wid) {
          var wc = byId[wid];
          if (wc) state.waitingRoom.push(wc);
        });
        var sentLook = waitingIds
          .map(function (wid) {
            return byId[wid];
          })
          .filter(function (c) {
            return !!c;
          });
        function finishLookReorder() {
          showToast("山札と控え室に振り分けました");
          finishResolved();
        }
        if (sentLook.length) {
          revealCardsSentFromDeckToWaiting(
            sentLook,
            "控え室に置いたカードを確認してください。",
            finishLookReorder,
            inst,
          );
        } else {
          finishLookReorder();
        }
      });
      return;
    }

    if (cl.template === "deck_top_pick_recover") {
      var dCnt = cl.deckTopCount || 0;
      if (state.deck.length < 1) {
        showToast("山札が空です");
        finishResolved();
        return;
      }
      var pickN = Math.min(dCnt, state.deck.length);
      pushHistoryBefore("ability-deck-pick-recover");
      var lookedRecover = state.deck.splice(0, pickN);
      render();
      var filterHint = describePickFilters(cl.filters || {});
      var maxPickRecover = Math.max(1, Math.floor(Number(cl.deckTopPickMax) || 1));
      var leadText =
        "山札の上 " +
        lookedRecover.length +
        " 枚を見ました。最大 " +
        maxPickRecover +
        " 枚まで選んで手札に加え、残りは控え室へ置きます。" +
        (filterHint ? "（目安条件: " + filterHint + "）" : "");
      /** @type {any[]} */
      var pickedRecover = [];
      function pickNextFromDeckLook() {
        if (pickedRecover.length >= maxPickRecover) {
          finalizeDeckTopPickRecover();
          return;
        }
        openPickFromDeckLookDialog(
          lookedRecover,
          cl.filters || {},
          leadText +
            (pickedRecover.length ? "（残り " + (maxPickRecover - pickedRecover.length) + " 枚まで）" : ""),
          function (pickedId) {
            if (!pickedId) {
              finalizeDeckTopPickRecover();
              return;
            }
            for (var li = 0; li < lookedRecover.length; li++) {
              if (lookedRecover[li] && String(lookedRecover[li].id) === String(pickedId)) {
                var pickCat = mergedCatalogCard(lookedRecover[li]);
                if (!isPlayManualMode() && !catalogCardMatchesPickFilters(pickCat, cl.filters || {})) {
                  showToast(
                    "選んだカードは条件と異なりますが、手札に加えました。（" +
                      (pickCat.name || pickCat.card_no || "") +
                      "）",
                  );
                }
                pickedRecover.push(lookedRecover.splice(li, 1)[0]);
                break;
              }
            }
            render();
            pickNextFromDeckLook();
          },
        );
      }
      function finalizeDeckTopPickRecover() {
        if (pickedRecover.length) {
          pickedRecover.forEach(function (c) {
            state.hand.push(c);
          });
          presentAbilityDrawsToHand(pickedRecover, inst);
        }
        lookedRecover.forEach(function (c) {
          state.waitingRoom.push(c);
        });
        var sentToWait = lookedRecover.slice();
        function finishPickRecover() {
          showToast(
            pickedRecover.length
              ? pickedRecover.length + " 枚を手札に加え、残りを控え室へ置きました"
              : "見たカードをすべて控え室に置きました",
          );
          finishResolved();
        }
        if (sentToWait.length) {
          revealCardsSentFromDeckToWaiting(
            sentToWait,
            "手札に加えなかったカードを控え室に置きました。",
            finishPickRecover,
            inst,
          );
        } else {
          finishPickRecover();
        }
      }
      pickNextFromDeckLook();
      return;
    }

    if (cl.template === "toujou_wait_pick_hand") {
      if (!cardIsOnStageOrLiveBoard(inst)) {
        abortResolved("場にいるカードでのみ登場時効果を解決できます");
        return;
      }
      if (!checkAbilityToujouPreconditions(cl)) {
        abortResolved("登場時効果の条件を満たしていません");
        return;
      }
      var tCand = waitingPickCandidates(cl.filters, null);
      if (!tCand.length) {
        showToast("控え室に回収できるカードがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-wait-pick");
      openPickFromWaitingDialog(tCand, "登場時: 控え室から手札に加えるカードを選びます。", function (pid) {
        if (!pid) {
          showToast("キャンセルしました");
          render();
          finishResolved();
          return;
        }
        var got = moveInstFromWaitingToHand(pid, inst);
        if (!got) {
          abortResolved("選択したカードがありません");
          return;
        }
        showToast((mergedCatalogCard(got).name || "カード") + " を手札に加えました");
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_success_live_pick_hand") {
      if (!checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var slPickPool = (state.successfulLiveArea || []).filter(successLiveAreaCardIsLive);
      if (!slPickPool.length) {
        abortResolved("成功ライブカード置き場にカードがありません");
        return;
      }
      pushHistoryBefore("toujou-success-live-pick");
      openPickFromWaitingDialog(
        slPickPool,
        "成功ライブカード置き場から手札に加えるカードを選びます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            render();
            return;
          }
          var si = -1;
          for (var s = 0; s < state.successfulLiveArea.length; s++) {
            if (state.successfulLiveArea[s] && String(state.successfulLiveArea[s].id) === String(pid)) {
              si = s;
              break;
            }
          }
          if (si < 0) {
            showToast("カードが見つかりません");
            finishResolved();
            render();
            return;
          }
          var picked = state.successfulLiveArea.splice(si, 1)[0];
          state.hand.push(picked);
          presentAbilityDrawsToHand([picked], inst);
          showToast((mergedCatalogCard(picked).name || "カード") + " を手札に加えました");
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "kidou_stage_wait_pick_hand") {
      resolveKidouStageToWaitingEffect(inst, finishResolved);
      return;
    }

    if (cl.template === "kidou_wait_pick_hand") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるメンバーでのみ起動できます");
        return;
      }
      if (!checkAbilityKidouPreconditions(cl)) {
        abortResolved("条件を満たしていません");
        return;
      }
      var kCand = waitingPickCandidates(cl.filters, inst.id);
      if (!kCand.length) {
        abortResolved("控え室に対象カードがありません");
        return;
      }
      pushHistoryBefore("kidou-wait-pick");
      openPickFromWaitingDialog(kCand, "起動: 控え室から手札に加えるカードを選びます。", function (pid) {
        if (!pid) {
          render();
          finishResolved();
          return;
        }
        var gotK = moveInstFromWaitingToHand(pid, inst);
        if (!gotK) {
          render();
          finishResolved();
          return;
        }
        showToast((mergedCatalogCard(gotK).name || "カード") + " を手札に加えました");
        finishResolved();
      });
      return;
    }

    if (cl.template === "kidou_hand_discard_series_branch") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        showToast("ステージにいるメンバーでのみ起動できます");
        finishResolved();
        return;
      }
      var branchTag = cl.branchSeriesTag || "μ's";
      var discardedIds = state._lastCostPaidHandDiscardedIds || [];
      state._lastCostPaidHandDiscardedIds = [];
      var discardedInst = null;
      for (var di = 0; di < discardedIds.length; di++) {
        var dInst = findCardInstById(discardedIds[di]);
        if (dInst) {
          discardedInst = dInst;
          break;
        }
      }
      var isMus =
        discardedInst && catalogCardMatchesGroupTag(mergedCatalogCard(discardedInst), branchTag);
      if (isMus) {
        var topMus = cl.deckTopCount || 4;
        var pickMus = cl.deckPickCount || 2;
        if (state.deck.length < 1) {
          showToast("山札がありません");
          finishResolved();
          return;
        }
        pushHistoryBefore("kidou-mus-deck-look");
        var lookedMus = state.deck.splice(0, Math.min(topMus, state.deck.length));
        render();
        openPickMultipleFromDeckLookDialog(
          lookedMus,
          pickMus,
          pickMus,
          "『" +
            branchTag +
            "』を控え室に置いたため、山札の上 " +
            lookedMus.length +
            " 枚から " +
            pickMus +
            " 枚を手札に加えます。",
          function (pickedIds) {
            var addedMus = [];
            pickedIds.forEach(function (pid) {
              for (var li = 0; li < lookedMus.length; li++) {
                if (lookedMus[li] && String(lookedMus[li].id) === String(pid)) {
                  var card = lookedMus.splice(li, 1)[0];
                  state.hand.push(card);
                  addedMus.push(card);
                  break;
                }
              }
            });
            if (addedMus.length) presentAbilityDrawsToHand(addedMus, inst);
            lookedMus.forEach(function (c) {
              state.waitingRoom.push(c);
            });
            function finishMusBranch() {
              showToast(
                addedMus.length
                  ? addedMus.length + " 枚を手札に、残りを控え室へ置きました"
                  : "見たカードをすべて控え室へ置きました",
              );
              finishResolved();
            }
            if (lookedMus.length) {
              revealCardsSentFromDeckToWaiting(
                lookedMus.slice(),
                "手札に加えなかったカードを控え室に置きました。",
                finishMusBranch,
                inst,
              );
            } else {
              finishMusBranch();
            }
          },
          inst,
        );
        return;
      }
      var liveCandMus = waitingPickCandidates(cl.filters || { pickType: T_LIVE }, null);
      if (!liveCandMus.length) {
        showToast("『" + branchTag + "』以外を控え室に置いたため、控え室にライブがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-non-mus-wait-pick");
      openPickFromWaitingDialog(
        liveCandMus,
        "『" + branchTag + "』以外を控え室に置いたため、控え室からライブを1枚手札に加えます。",
        function (pid) {
          if (pid) moveInstFromWaitingToHand(pid, inst);
          finishResolved();
        },
        { dialogTitle: "控え室からライブ", okLabel: "手札に加える" },
      );
      return;
    }

    if (cl.template === "kidou_hand_cost_wait_pick_hand") {
      if (!stageColumnKeyHostingMember(inst.id)) {
        abortResolved("ステージにいるメンバーでのみ起動できます");
        return;
      }
      var discardN = cl.handDiscardToWaiting || 1;
      if (state.hand.length < discardN) {
        abortResolved("手札が " + discardN + " 枚ありません");
        return;
      }
      pushHistoryBefore("kidou-hand-cost");
      openPickHandToWaitingDialog(discardN, function (handIds) {
        if (!handIds) {
          render();
          finishResolved();
          return;
        }
        handIds.forEach(function (hid) {
          var hi = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(hid);
          });
          if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
        });
        var kc2 = waitingPickCandidates(cl.filters, inst.id);
        if (!kc2.length) {
          showToast("手札を控え室に置きましたが、回収できるカードがありません");
          finishResolved();
          return;
        }
        render();
        openPickFromWaitingDialog(kc2, "控え室から手札に加えるカードを選びます。", function (pid2) {
          if (!pid2) {
            render();
            finishResolved();
            return;
          }
          var got2 = moveInstFromWaitingToHand(pid2, inst);
          if (got2) showToast((mergedCatalogCard(got2).name || "カード") + " を手札に加えました");
          finishResolved();
        });
      });
      return;
    }

    if (cl.template === "kidou_wait_to_stage") {
      if (!instIsInWaitingRoom(inst.id)) {
        abortResolved("控え室にいるこのカードでのみ起動できます");
        return;
      }
      pushHistoryBefore("kidou-wait-to-stage");
      function afterHandCost(next) {
        if (cl.deckTopCount != null && cl.deckTopCount > 0) {
          var lookedK = state.deck.splice(0, Math.min(cl.deckTopCount, state.deck.length));
          if (lookedK.length) {
            openDeckLookReorderDialog(lookedK, function (deckIds, waitingIds) {
              var byIdK = {};
              lookedK.forEach(function (c) {
                byIdK[String(c.id)] = c;
              });
              for (var d = deckIds.length - 1; d >= 0; d--) {
                var dx = byIdK[deckIds[d]];
                if (dx) state.deck.unshift(dx);
              }
              waitingIds.forEach(function (w) {
                var wx = byIdK[w];
                if (wx) state.waitingRoom.push(wx);
              });
              next();
            });
            return;
          }
        }
        next();
      }
      function doStage() {
        if (!placeWaitingMemberToStage(inst)) {
          abortResolved("ステージに登場できませんでした");
          return;
        }
        showToast("控え室からステージに登場させました");
        finishResolved();
      }
      if (cl.handDiscardToWaiting && cl.handDiscardToWaiting > 0) {
        openPickHandToWaitingDialog(cl.handDiscardToWaiting, function (handIds) {
          if (!handIds) {
            render();
            finishResolved();
            return;
          }
          handIds.forEach(function (hid) {
            var hi = state.hand.findIndex(function (h) {
              return h && String(h.id) === String(hid);
            });
            if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
          });
          afterHandCost(doStage);
        });
      } else {
        afterHandCost(doStage);
      }
      return;
    }

    if (cl.template === "deck_reveal_until_pick") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var minMemCost = cl.revealMinMemberCost != null ? Number(cl.revealMinMemberCost) : 10;
      pushHistoryBefore("deck-reveal-until-pick");
      openAbilityMultiChoiceDialog(
        ["ライブカード", "コスト" + minMemCost + "以上のメンバーカード"],
        1,
        1,
        "公開して拾うカードの種類を選びます。",
        function (picked) {
          if (!picked || !picked.length) {
            finishResolved();
            return;
          }
          var wantLive = picked[0].indexOf("ライブ") >= 0;
          runDeckRevealUntilMatch(
            function (_inst, mc) {
              if (wantLive) return mc.type === T_LIVE;
              return mc.type === T_MEMBER && Number(mc.cost) >= minMemCost;
            },
            function (matched, others) {
              others.forEach(function (c) {
                state.waitingRoom.push(c);
              });
              function afterReveal() {
                if (matched) {
                  state.hand.push(matched);
                  presentAbilityDrawsToHand([matched], inst);
                  showToast((mergedCatalogCard(matched).name || "カード") + " を手札に加えました");
                } else {
                  showToast("条件のカードは見つかりませんでした（公開分は控え室へ）");
                }
                finishResolved();
              }
              if (others.length) {
                revealCardsSentFromDeckToWaiting(
                  others,
                  "公開した以下のカードを控え室に置きました。",
                  afterReveal,
                  inst,
                );
              } else {
                afterReveal();
              }
            },
          );
        },
      );
      return;
    }

    if (cl.template === "deck_reveal_until_live") {
      if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      function runRevealLive() {
        pushHistoryBefore("deck-reveal-until-live");
        runDeckRevealUntilMatch(
          function (_inst, mc) {
            return mc.type === T_LIVE;
          },
          function (matched, others) {
            others.forEach(function (c) {
              state.waitingRoom.push(c);
            });
            function afterRevealLive() {
              if (matched) {
                state.hand.push(matched);
                presentAbilityDrawsToHand([matched], inst);
                showToast((mergedCatalogCard(matched).name || "ライブ") + " を手札に加えました");
              } else {
                showToast("ライブカードは見つかりませんでした（公開分は控え室へ）");
              }
              finishResolved();
            }
            if (others.length) {
              revealCardsSentFromDeckToWaiting(
                others,
                "公開した以下のカードを控え室に置きました。",
                afterRevealLive,
                inst,
              );
            } else {
              afterRevealLive();
            }
          },
        );
      }
      if (cl.handDiscardToWaiting) {
        openPickHandOptionalMultiToWaiting(
          "手札を1枚まで控え室に置けます（0枚可）。",
          function () {
            return true;
          },
          function (ids) {
            if (ids === null) {
              finishResolved();
              return;
            }
            if (ids && ids.length) {
              ids.forEach(function (hid) {
                var hi = state.hand.findIndex(function (h) {
                  return h && String(h.id) === String(hid);
                });
                if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
              });
            }
            runRevealLive();
          },
          { okLabel: "続ける", dialogTitle: "登場: 手札を控え室へ（任意）" },
        );
      } else {
        runRevealLive();
      }
      return;
    }

    if (cl.template === "kidou_hand_reveal_to_under") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var handRevealPool = state.hand.filter(function (h) {
        return h && catalogCardMatchesPickFilters(mergedCatalogCard(h), cl.filters || {});
      });
      if (!handRevealPool.length) {
        showToast("条件に合う手札のメンバーがありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-hand-reveal-under");
      openPickFromWaitingDialog(
        handRevealPool,
        "手札から公開してこのメンバーの下に置くカードを選びます。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var hiR = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(pid);
          });
          if (hiR < 0) {
            finishResolved();
            return;
          }
          var placedH = state.hand.splice(hiR, 1)[0];
          var colH = stageColumnKeyHostingMember(inst.id);
          if (!colH) {
            state.hand.push(placedH);
            finishResolved();
            return;
          }
          var arrH = state.stage[colH] || [];
          var hostIdxH = -1;
          for (var hi2 = 0; hi2 < arrH.length; hi2++) {
            if (arrH[hi2] && String(arrH[hi2].id) === String(inst.id)) {
              hostIdxH = hi2;
              break;
            }
          }
          if (hostIdxH < 0) {
            state.hand.push(placedH);
            finishResolved();
            return;
          }
          arrH.splice(hostIdxH, 0, placedH);
          state.stage[colH] = arrH;
          try {
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
          showToast((mergedCatalogCard(placedH).name || "メンバー") + " をこのメンバーの下に置きました");
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "kidou_hand_discard_wait_live_score_pay") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (state.hand.length < 1) {
        showToast("手札がありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-wait-live-score-pay");
      openPickHandToWaitingDialog(1, function (handIds) {
        if (!handIds || !handIds.length) {
          finishResolved();
          return;
        }
        handIds.forEach(function (hid) {
          var hi = state.hand.findIndex(function (h) {
            return h && String(h.id) === String(hid);
          });
          if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
        });
        var livePool = (state.waitingRoom || []).filter(function (c) {
          return c && c.type === T_LIVE;
        });
        if (!livePool.length) {
          showToast("控え室にライブカードがありません");
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(livePool, "控え室からライブを1枚選びます。", function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var wiL = state.waitingRoom.findIndex(function (c) {
            return c && String(c.id) === String(pid);
          });
          if (wiL < 0) {
            finishResolved();
            return;
          }
          var liveInst = state.waitingRoom[wiL];
          var liveSc = Number(mergedCatalogCard(liveInst).score);
          if (!Number.isFinite(liveSc) || liveSc <= 0) liveSc = 0;
          openAbilityMultiChoiceDialog(
            ["スコア " + liveSc + " 相当のエネルギーを支払って手札に加える", "支払わずスキップ"],
            1,
            1,
            "任意: エネルギー支払いでライブを手札に加えます。",
            function (choice) {
              if (!choice || !choice.length || choice[0].indexOf("スキップ") >= 0) {
                finishResolved();
                return;
              }
              payAbilityCost(
                inst,
                { costEnergy: true, costEnergyCount: liveSc },
                true,
                function (ok) {
                  if (!ok) {
                    finishResolved();
                    return;
                  }
                  var wi2 = state.waitingRoom.findIndex(function (c) {
                    return c && String(c.id) === String(pid);
                  });
                  if (wi2 >= 0) {
                    var got = state.waitingRoom.splice(wi2, 1)[0];
                    state.hand.push(got);
                    presentAbilityDrawsToHand([got], inst);
                    showToast((mergedCatalogCard(got).name || "ライブ") + " を手札に加えました");
                  }
                  finishResolved();
                },
              );
            },
          );
        });
      });
      return;
    }

    if (cl.template === "kidou_self_wait_hand_enter_energy") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var originColE = stageColumnKeyHostingMember(inst.id);
      if (!originColE) {
        showToast("ステージにいるメンバーでのみ起動できます");
        finishResolved();
        return;
      }
      payAbilityCost(inst, cl, true, function (ok) {
        if (!ok) {
          finishResolved();
          return;
        }
        pushHistoryBefore("kidou-hand-enter-energy");
        if (!moveStageMemberInstToWaiting(inst)) {
          showToast("ステージから控え室に移せませんでした");
          finishResolved();
          return;
        }
        var handEnterPool = state.hand.filter(function (h) {
          return h && h.type === T_MEMBER && catalogCardMatchesPickFilters(mergedCatalogCard(h), cl.filters || {});
        });
        if (!handEnterPool.length) {
          showToast("条件に合う手札のメンバーがありません");
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(
          handEnterPool,
          "手札からこのメンバーがいたエリア（" +
            (originColE === "left" ? "左" : originColE === "right" ? "右" : "センター") +
            "）に登場させます。",
          function (pid) {
            if (!pid) {
              finishResolved();
              return;
            }
            var memInst = state.hand.find(function (h) {
              return h && String(h.id) === String(pid);
            });
            if (!memInst || !placeHandMemberOnStageSide(memInst, originColE, { forceLowEnergy: true })) {
              showToast("登場できませんでした");
              finishResolved();
              return;
            }
            var activeEn = (state.energyArea || []).filter(function (e) {
              return e && e.type === T_ENERGY && !e.isRotated;
            });
            if (!activeEn.length) {
              showToast("メンバーを登場させました（エネルギー置き場にアクティブなエネルギーがありません）");
              finishResolved();
              return;
            }
            openPickFromWaitingDialog(
              activeEn,
              "このメンバーの下に置くエネルギーを1枚選びます。",
              function (eid) {
                if (!eid) {
                  finishResolved();
                  return;
                }
                var enInst = state.energyArea.find(function (e) {
                  return e && String(e.id) === String(eid);
                });
                var entered = findCardInstById(pid);
                if (entered && enInst && placeEnergyUnderStageMember(entered, enInst)) {
                  showToast("エネルギーをメンバーの下に置きました");
                }
                finishResolved();
              },
            );
          },
        );
      });
      return;
    }

    if (cl.template === "kidou_wait_shuffle_deck_bottom_activate") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var needPick = cl.waitPickCount != null ? Number(cl.waitPickCount) : 6;
      var charFilter = cl.characterNames && cl.characterNames.length ? cl.characterNames : [];
      var waitCharPool = (state.waitingRoom || []).filter(function (c) {
        if (!c) return false;
        var nm = String(mergedCatalogCard(c).name || "");
        if (!charFilter.length) return true;
        for (var ci = 0; ci < charFilter.length; ci++) {
          if (nm === charFilter[ci]) return true;
        }
        return false;
      });
      if (waitCharPool.length < needPick) {
        showToast("控え室に対象カードが " + needPick + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-wait-shuffle-bottom");
      openPickWaitingOptionalMulti(
        "控え室から合計 " + needPick + " 枚選び、シャッフルしてデッキの下に置きます。",
        function (c) {
          var nm = String(mergedCatalogCard(c).name || "");
          for (var ci2 = 0; ci2 < charFilter.length; ci2++) {
            if (nm === charFilter[ci2]) return true;
          }
          return false;
        },
        function (ids) {
          if (ids === null) {
            finishResolved();
            return;
          }
          if (!ids || ids.length !== needPick) {
            showToast(needPick + " 枚ちょうど選んでください");
            finishResolved();
            return;
          }
          /** @type {any[]} */
          var pickedCards = [];
          ids.forEach(function (id) {
            var wi = state.waitingRoom.findIndex(function (c) {
              return c && String(c.id) === String(id);
            });
            if (wi >= 0) pickedCards.push(state.waitingRoom.splice(wi, 1)[0]);
          });
          if (pickedCards.length !== needPick) {
            finishResolved();
            return;
          }
          var shuffled = shuffle(pickedCards);
          shuffled.forEach(function (c) {
            state.deck.push(c);
          });
          var actCnt = activateEnergyCount(cl.energyActiveCount || 6);
          showToast(needPick + " 枚を山札下へ、エネルギー " + actCnt + " 枚をアクティブにしました");
          finishResolved();
        },
        { okLabel: needPick + " 枚を選ぶ", dialogTitle: "起動: 控え室→山札下" },
      );
      return;
    }

    if (cl.template === "kidou_self_to_wait_opp_wait") {
      if (!checkAbilityKidouPreconditions(cl)) {
        showToast("起動効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (!stageColumnKeyHostingMember(inst.id)) {
        showToast("ステージにいるメンバーでのみ起動できます");
        finishResolved();
        return;
      }
      pushHistoryBefore("kidou-self-wait-opp");
      if (!moveStageMemberInstToWaiting(inst)) {
        showToast("ステージから控え室に移せませんでした");
        finishResolved();
        return;
      }
      var oppMaxW = cl.oppWaitMaxCost != null ? Number(cl.oppWaitMaxCost) : 4;
      if (versusOnlineActive()) {
        showToast("相手のステージのメンバーは、相手盤面で手動でウェイトにしてください");
        finishResolved();
        return;
      }
      openSoloOpponentMemberWaitPickDialog(
        oppMaxW,
        "相手のステージにいるコスト" + oppMaxW + "以下のメンバー1人をウェイトにします。",
        function () {
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "toujou_hand_discard_draw_plus") {
      pushHistoryBefore("toujou-discard-draw-plus");
      openPickHandOptionalMultiToWaiting(
        "手札の対象メンバーを好きな枚数控え室に置けます（0枚可）。",
        function (h) {
          return h && catalogCardMatchesPickFilters(mergedCatalogCard(h), cl.filters || {});
        },
        function (ids) {
          var n = (ids && ids.length) || 0;
          if (ids && ids.length) {
            ids.forEach(function (hid) {
              var hi = state.hand.findIndex(function (h) {
                return h && String(h.id) === String(hid);
              });
              if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
            });
          }
          var drawN = n + 1;
          for (var di = 0; di < drawN && state.deck.length; di++) {
            var d = state.deck.shift();
            state.hand.push(d);
            presentAbilityDrawsToHand([d], inst);
          }
          showToast(n + " 枚捨て、" + drawN + " 枚引きました");
          finishResolved();
        },
        { okLabel: "捨てて引く", dialogTitle: "登場: 手札を控え室へ" },
      );
      return;
    }

    if (cl.template === "toujou_optional_self_wait_recover") {
      var stageRecPool = stageMemberPickCandidates(cl.filters || {}, inst.id).filter(function (m) {
        if (!m) return false;
        if (cl.excludeCharacterName && String(mergedCatalogCard(m).name || "") === cl.excludeCharacterName) {
          return false;
        }
        return true;
      });
      if (!stageRecPool.length) {
        showToast("対象のステージメンバーがいません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-opt-wait-recover");
      openPickFromWaitingDialog(
        stageRecPool,
        "ステージから控え室に置くメンバーを選びます（キャンセルでスキップ）。",
        function (pid) {
          if (!pid) {
            finishResolved();
            return;
          }
          var sentMem = findCardInstById(pid);
          var originRec = stageColumnKeyHostingMember(pid);
          if (!sentMem || !originRec || !removeStageMemberToWaiting(sentMem)) {
            finishResolved();
            return;
          }
          var wiRec = state.waitingRoom.findIndex(function (c) {
            return c && String(c.id) === String(pid);
          });
          if (wiRec < 0) {
            finishResolved();
            return;
          }
          var enterMem = state.waitingRoom.splice(wiRec, 1)[0];
          if (!placeWaitingMemberToStageColumn(enterMem, originRec)) {
            state.waitingRoom.push(enterMem);
            showToast("同じエリアに登場できませんでした");
          } else {
            showToast((mergedCatalogCard(enterMem).name || "メンバー") + " を同じエリアに再登場させました");
          }
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "toujou_wait_enter_cost_sum") {
      payAbilityCost(inst, cl, false, function (ok) {
        if (!ok) {
          finishResolved();
          return;
        }
        var maxEnter = cl.waitEnterMaxCount != null ? Number(cl.waitEnterMaxCount) : 2;
        var maxSum = cl.waitEnterMaxCostSum != null ? Number(cl.waitEnterMaxCostSum) : 4;
        /** @type {any[]} */
        var pickedEnter = [];
        function stepEnter() {
          if (pickedEnter.length >= maxEnter) {
            finishResolved();
            return;
          }
          var sumSoFar = 0;
          pickedEnter.forEach(function (m) {
            sumSoFar += memberFlooredPrintedCost(m);
          });
          var remain = maxEnter - pickedEnter.length;
          var cand = (state.waitingRoom || []).filter(function (c) {
            if (!c || c.type !== T_MEMBER) return false;
            if (pickedEnter.some(function (p) {
              return String(p.id) === String(c.id);
            })) {
              return false;
            }
            var cost = memberFlooredPrintedCost(c);
            return sumSoFar + cost <= maxSum;
          });
          if (!cand.length || sumSoFar >= maxSum) {
            finishResolved();
            return;
          }
          openPickFromWaitingDialog(
            cand,
            "控え室から登場 (" + (pickedEnter.length + 1) + "/" + maxEnter + "、合計コスト≤" + maxSum + ")",
            function (pid) {
              if (!pid) {
                finishResolved();
                return;
              }
              var wiE = state.waitingRoom.findIndex(function (c) {
                return c && String(c.id) === String(pid);
              });
              if (wiE < 0) {
                finishResolved();
                return;
              }
              var ent = state.waitingRoom.splice(wiE, 1)[0];
              var emptyCols = ["left", "center", "right"].filter(function (col) {
                return !stageColumnIncumbentMember(col);
              });
              if (!emptyCols.length) {
                state.waitingRoom.push(ent);
                showToast("空きエリアがありません");
                finishResolved();
                return;
              }
              ent.lcWait = false;
              ent.isRotated = false;
              ent.lcActive = true;
              if (!state.stage[emptyCols[0]]) state.stage[emptyCols[0]] = [];
              state.stage[emptyCols[0]].push(ent);
              finalizeWaitingMemberStageEntry(snapshotBoard());
              pickedEnter.push(ent);
              stepEnter();
            },
          );
        }
        pushHistoryBefore("toujou-wait-enter-sum");
        stepEnter();
      });
      return;
    }

    if (cl.template === "toujou_optional_all_members_relocate") {
      var relocateMems = eachStageColumnMemberInsts().filter(function (m) {
        return m && String(m.id) !== String(inst.id) && m._soloOpponentProxy !== true;
      });
      if (!relocateMems.length) {
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-relocate-all");
      var ri = 0;
      function stepRelocate() {
        if (ri >= relocateMems.length) {
          finishResolved();
          return;
        }
        var target = relocateMems[ri];
        ri++;
        openPositionChangeColumnPickDialog(
          target,
          cl,
          (mergedCatalogCard(target).name || "メンバー") + " の移動先エリア（キャンセルでスキップ）",
          function (col) {
            if (col) swapStageMemberPositionChange(target, col);
            stepRelocate();
          },
        );
      }
      stepRelocate();
      return;
    }

    if (cl.template === "toujou_optional_wait_to_deck_top") {
      var wTop = state.waitingRoom || [];
      if (!wTop.length) {
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-wait-deck-top");
      openPickFromWaitingDialog(wTop, "控え室からデッキの一番上に置くカードを選びます（キャンセル可）。", function (pid) {
        if (!pid) {
          finishResolved();
          return;
        }
        var wiT = state.waitingRoom.findIndex(function (c) {
          return c && String(c.id) === String(pid);
        });
        if (wiT >= 0) {
          var cardT = state.waitingRoom.splice(wiT, 1)[0];
          state.deck.unshift(cardT);
          showToast((mergedCatalogCard(cardT).name || "カード") + " を山札の上に置きました");
        }
        finishResolved();
      });
      return;
    }

    if (cl.template === "toujou_optional_energy_under") {
      var needUnder = cl.energyUnderCount != null ? Number(cl.energyUnderCount) : 2;
      var activePool = (state.energyArea || []).filter(function (e) {
        return e && e.type === T_ENERGY;
      });
      if (activePool.length < needUnder) {
        showToast("エネルギー置き場に " + needUnder + " 枚ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-energy-under");
      /** @type {string[]} */
      var pickedEnIds = [];
      function stepEnUnder() {
        if (pickedEnIds.length >= needUnder) {
          finishResolved();
          return;
        }
        var poolEn = activePool.filter(function (e) {
          return pickedEnIds.indexOf(String(e.id)) < 0;
        });
        openPickFromWaitingDialog(
          poolEn,
          "メンバーの下に置くエネルギー (" + (pickedEnIds.length + 1) + "/" + needUnder + ")（キャンセル可）",
          function (eid) {
            if (!eid) {
              finishResolved();
              return;
            }
            var enU = state.energyArea.find(function (e) {
              return e && String(e.id) === String(eid);
            });
            if (enU && placeEnergyUnderStageMember(inst, enU)) {
              pickedEnIds.push(String(eid));
            }
            stepEnUnder();
          },
        );
      }
      stepEnUnder();
      return;
    }

    if (cl.template === "toujou_self_wait_only") {
      pushHistoryBefore("toujou-self-wait");
      waitMemberInst(inst);
      showToast("このメンバーをウェイトにしました");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_rotate_stage_areas") {
      if (!stageHasOnlyUnitTag(cl.requiredUnitOnStage || "5yncri5e!", true)) {
        showToast("ステージのメンバーが『" + (cl.requiredUnitOnStage || "5yncri5e!") + "』のみではありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-rotate-areas");
      rotateStageAreasClockwiseForPlayer(false);
      rotateStageAreasClockwiseForPlayer(true);
      showToast("自分と相手のステージエリアをローテーションしました");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_success_live_score_tiered") {
      if (cl.stageArea && !abilityInstMatchesStageArea(inst, cl.stageArea)) {
        showToast("指定エリアに登場した場合のみ効果を解決できます");
        finishResolved();
        return;
      }
      var tierMatches = (state.successfulLiveArea || []).filter(function (c) {
        return (
          successLiveAreaCardIsLive(c) &&
          catalogCardMatchesPickFilters(mergedCatalogCard(c), cl.filters || {})
        );
      });
      if (!tierMatches.length) {
        showToast("成功ライブカード置き場に条件のカードがありません");
        finishResolved();
        return;
      }
      var plusTier = tierMatches.length >= 2 ? 2 : 1;
      pushHistoryBefore("toujou-success-live-tiered");
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      var tierSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋" + plusTier + "する。";
      if (inst._grantedJoujiSegmentRaws.indexOf(tierSeg) < 0) inst._grantedJoujiSegmentRaws.push(tierSeg);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      showToast("ライブ終了時まで合計スコア＋" + plusTier + " を得ました");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_success_live_low_score_grant") {
      if (!successLiveAreaLiveCardCount()) {
        showToast("成功ライブカード置き場にカードがありません");
        finishResolved();
        return;
      }
      if (successLiveAreaScoreSum() > 1) {
        showToast("成功ライブのスコア合計が1以下ではないため効果なし");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-success-live-low-score");
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      var lowSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
      if (inst._grantedJoujiSegmentRaws.indexOf(lowSeg) < 0) inst._grantedJoujiSegmentRaws.push(lowSeg);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      showToast("ライブ終了時まで合計スコア＋1 を得ました");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_draw_grant_if_from_waiting") {
      var drawGw = Math.max(1, Math.floor(Number(cl.deckDrawCount) || 2));
      pushHistoryBefore("toujou-draw-wait-grant");
      var drawnGw = [];
      for (var dg = 0; dg < drawGw; dg++) {
        if (state.deck.length) drawnGw.push(state.deck.shift());
      }
      drawnGw.forEach(function (c) {
        state.hand.push(c);
      });
      if (drawnGw.length) presentAbilityDrawsToHand(drawnGw, inst);
      if (inst._enteredFromWaitingRoom) {
        var segGw = abilityRawSegmentForTrigger(mc, kind) || cardAbilityRawText(mc);
        var grantsGw = extractGrantedJoujiTextsFromSegment(segGw);
        if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
        grantsGw.forEach(function (g) {
          if (inst._grantedJoujiSegmentRaws.indexOf(g) < 0) inst._grantedJoujiSegmentRaws.push(g);
        });
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast("山札から " + drawnGw.length + " 枚引き、控え室登場分の常時効果を得ました");
      } else {
        showToast("山札から " + drawnGw.length + " 枚引きました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "toujou_wait_pick_opp_live") {
      var liveWaitPool = (state.waitingRoom || []).filter(function (c) {
        return c && mergedCatalogCard(c).type === T_LIVE;
      });
      if (liveWaitPool.length < 2) {
        showToast("控え室にライブカードが2枚以上ありません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-wait-pick-opp-live");
      openPickWaitingOptionalMulti(
        "控え室から、カード名の異なるライブカードを2枚選びます。",
        function (c) {
          return c && mergedCatalogCard(c).type === T_LIVE;
        },
        function (pickedIds) {
          if (!pickedIds || pickedIds.length < 2) {
            showToast("2枚選ばなかったためスキップしました");
            finishResolved();
            return;
          }
          /** @type {*[]} */
          var pickedInsts = [];
          /** @type {Record<string, boolean>} */
          var seenNames = {};
          pickedIds.forEach(function (pid) {
            var pi = findCardInstById(pid);
            if (!pi) return;
            var nm = String(mergedCatalogCard(pi).name || "");
            if (!nm || seenNames[nm]) return;
            seenNames[nm] = true;
            pickedInsts.push(pi);
          });
          if (pickedInsts.length < 2) {
            showToast("カード名の異なるライブを2枚選べませんでした");
            finishResolved();
            return;
          }
          openPickFromWaitingDialog(
            pickedInsts,
            "相手が選ぶ1枚を指定します（選ばれたカードを手札に加えます）。",
            function (oppPickId) {
              if (!oppPickId) {
                finishResolved();
                return;
              }
              var gotLive = moveInstFromWaitingToHand(oppPickId, inst);
              if (gotLive) {
                showToast((mergedCatalogCard(gotLive).name || "ライブ") + " を手札に加えました");
              }
              finishResolved();
            },
            {
              okLabel: "手札に加える",
              dialogTitle: "相手の選択 — ライブ1枚",
            },
          );
        },
        {
          okLabel: "2枚選んで続行",
          dialogTitle: "控え室 — ライブ2枚",
        },
      );
      return;
    }

    if (cl.template === "toujou_hand_discard_wait_heart_dual_pick") {
      function runHeartDualPickFromWaiting() {
        var reqHeart = cl.requiredHeartSlot != null ? Math.floor(Number(cl.requiredHeartSlot)) : 3;
        var memPool = (state.waitingRoom || []).filter(function (c) {
          return (
            c &&
            c.type === T_MEMBER &&
            memberCatalogHasHeartSlot(mergedCatalogCard(c), reqHeart)
          );
        });
        var livePool = (state.waitingRoom || []).filter(function (c) {
          return c && liveCatalogRequiresHeartSlot(mergedCatalogCard(c), reqHeart);
        });
        if (!memPool.length && !livePool.length) {
          showToast("控え室に対象カードがありません");
          finishResolved();
          return;
        }
        function pickLiveThenDone() {
          if (!livePool.length) {
            finishResolved();
            return;
          }
          openPickFromWaitingDialog(
            livePool,
            "控え室から必要ハートを含むライブカード1枚までを手札に加えます。",
            function (liveId) {
              if (liveId) {
                var gotL = moveInstFromWaitingToHand(liveId, inst);
                if (gotL) showToast((mergedCatalogCard(gotL).name || "ライブ") + " を手札に加えました");
              }
              finishResolved();
            },
            { okLabel: "手札に加える", dialogTitle: "控え室 — ライブ" },
          );
        }
        if (!memPool.length) {
          pickLiveThenDone();
          return;
        }
        openPickFromWaitingDialog(
          memPool,
          "控え室から指定ハートを持つメンバー1枚までを手札に加えます。",
          function (memId) {
            if (memId) {
              var gotM = moveInstFromWaitingToHand(memId, inst);
              if (gotM) showToast((mergedCatalogCard(gotM).name || "メンバー") + " を手札に加えました");
            }
            pickLiveThenDone();
          },
          { okLabel: "手札に加える", dialogTitle: "控え室 — メンバー" },
        );
      }
      pushHistoryBefore("toujou-heart-dual-pick");
      var discardN = cl.handDiscardToWaiting != null ? Math.floor(Number(cl.handDiscardToWaiting)) : 2;
      if (discardN > 0 && state.hand.length >= discardN) {
        var payDiscard = window.confirm(
          "手札を " + discardN + " 枚控え室に置いて効果を得ますか？（キャンセルでコストなし）",
        );
        if (payDiscard) {
          openPickHandOptionalMultiToWaiting(
            "手札から控え室に置く " + discardN + " 枚を選びます。",
            function () {
              return true;
            },
            function (handIds) {
              if (!handIds || handIds.length < discardN) {
                showToast("手札を " + discardN + " 枚選ばなかったためスキップしました");
                finishResolved();
                return;
              }
              handIds.slice(0, discardN).forEach(function (hid) {
                var hi = state.hand.findIndex(function (h) {
                  return h && String(h.id) === String(hid);
                });
                if (hi >= 0) state.waitingRoom.push(state.hand.splice(hi, 1)[0]);
              });
              runHeartDualPickFromWaiting();
            },
            { okLabel: "控え室に置く", dialogTitle: "手札 — 捨て札" },
          );
          return;
        }
      }
      runHeartDualPickFromWaiting();
      return;
    }

    if (cl.template === "toujou_grant_heart_stage_member") {
      var grantSlot = cl.requiredHeartSlot != null ? Math.floor(Number(cl.requiredHeartSlot)) : 6;
      var heartMemPool = stageMemberPickCandidates({}, inst.id).filter(function (m) {
        return memberCatalogHasHeartSlot(mergedCatalogCard(m), grantSlot);
      });
      if (!heartMemPool.length) {
        showToast("指定ハートを持つ他のステージメンバーがいません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-grant-heart-member");
      openPickFromWaitingDialog(
        heartMemPool,
        "このメンバー以外の、指定ハートを持つメンバー1人にハートを与えます。",
        function (targetId) {
          if (!targetId) {
            finishResolved();
            return;
          }
          var targetMem = findCardInstById(targetId);
          if (targetMem) grantHeartSlotUntilLiveEnd(targetMem, grantSlot);
          try {
            syncJoujiPassiveEffectsAll();
          } catch (_) {}
          finishResolved();
        },
        { okLabel: "ハートを与える", dialogTitle: "ステージ — メンバー1人" },
      );
      return;
    }

    if (cl.template === "toujou_opp_front_position_change") {
      if (!stageHasOnlyUnitTag(cl.requiredUnitOnStage || "みらくらぱーく！", true)) {
        showToast("ステージのメンバーが『" + (cl.requiredUnitOnStage || "みらくらぱーく！") + "』のみではありません");
        finishResolved();
        return;
      }
      var myCol = stageColumnKeyHostingMember(inst.id);
      if (!myCol) {
        finishResolved();
        return;
      }
      var oppPcPool = soloOpponentStageMemberCandidates(99).filter(function (m) {
        if (!m) return false;
        if (isDualOpponentBoardMode()) {
          return !!readInactiveOpponentBoard(function () {
            return !!stageColumnKeyHostingMember(m.id);
          });
        }
        return m._soloOpponentProxy === true && stageColumnKeyHostingMember(m.id);
      });
      if (!oppPcPool.length && !isDualOpponentBoardMode()) {
        oppPcPool = eachStageColumnMemberInsts().filter(function (m) {
          return String(m.id) !== String(inst.id);
        });
      }
      if (!oppPcPool.length) {
        showToast("ポジションチェンジ対象の相手メンバーがいません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-opp-front-pc");
      openPickFromWaitingDialog(
        oppPcPool,
        "相手ステージのメンバー1人を、このメンバーの正面（" +
          (myCol === "left" ? "左" : myCol === "right" ? "右" : "センター") +
          "）へポジションチェンジします。",
        function (oppId) {
          if (!oppId) {
            finishResolved();
            return;
          }
          if (isDualOpponentBoardMode()) {
            mutateInactiveOpponentBoard(function () {
              var oppMemDual = findCardInstById(oppId);
              if (oppMemDual && swapStageMemberPositionChange(oppMemDual, myCol)) {
                showToast((mergedCatalogCard(oppMemDual).name || "メンバー") + " を正面エリアへ移動しました");
              }
            });
            finishResolved();
            return;
          }
          var oppMem = findCardInstById(oppId);
          if (oppMem && swapStageMemberPositionChange(oppMem, myCol)) {
            showToast((mergedCatalogCard(oppMem).name || "メンバー") + " を正面エリアへ移動しました");
          }
          finishResolved();
        },
        {
          okLabel: "ポジションチェンジ",
          dialogTitle: "相手メンバー — ポジションチェンジ",
          zoneLabelFn: soloOpponentMemberZoneLabel,
        },
      );
      return;
    }

    if (cl.template === "toujou_bibi_wait_opp_active_wait") {
      if (cl.stageArea && !abilityInstMatchesStageArea(inst, cl.stageArea)) {
        showToast("センターエリアにいる場合のみ効果を解決できます");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-bibi-wait-opp");
      function runOppActiveWait() {
        openSoloOpponentMemberWaitPickDialog(
          99,
          "相手のアクティブメンバー1人をウェイトにします。",
          function () {
            finishResolved();
          },
        );
      }
      var bibiPool = stageMemberPickCandidates(cl.filters || {}, inst.id);
      if (!bibiPool.length) {
        runOppActiveWait();
        return;
      }
      var doBibiWait = window.confirm("『BiBi』のメンバー1人をウェイトにしますか？（キャンセルでスキップ）");
      if (!doBibiWait) {
        runOppActiveWait();
        return;
      }
      openPickFromWaitingDialog(
        bibiPool,
        "ウェイトにする『BiBi』メンバー1人を選びます。",
        function (bibiId) {
          if (bibiId) {
            var bibiMem = findCardInstById(bibiId);
            if (bibiMem) waitMemberInst(bibiMem);
          }
          runOppActiveWait();
        },
        { okLabel: "ウェイトにする", dialogTitle: "BiBi — メンバー1人" },
      );
      return;
    }

    if (cl.template === "toujou_baton_series_heart_grant") {
      if (!inst._toujouBatonFromLowerCostMemberId) {
        showToast("バトンタッチ登場ではないためスキップしました");
        finishResolved();
        return;
      }
      var batonFrom = findCardInstById(inst._toujouBatonFromLowerCostMemberId);
      var seriesTag = (cl.filters && cl.filters.seriesTag) || "みらくらぱーく！";
      if (!batonFrom || !catalogCardMatchesGroupTag(mergedCatalogCard(batonFrom), seriesTag)) {
        showToast("条件のバトンタッチ元ではないためスキップしました");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-baton-heart-grant");
      grantHeartSlotUntilLiveEnd(inst, cl.requiredHeartSlot || 1);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      finishResolved();
      return;
    }

    if (cl.template === "toujou_opp_optional_live_discard_or_score") {
      pushHistoryBefore("toujou-opp-live-discard-or-score");
      var oppPays = window.confirm(
        "相手は手札からライブカード1枚を控え室に置きますか？\n（いいえ → 自分は合計スコア＋1を得る）",
      );
      if (oppPays) {
        var oppLiveHand = state.hand.filter(function (h) {
          return h && h.type === T_LIVE;
        });
        if (!oppLiveHand.length) {
          showToast("手札にライブカードがないため、スコア＋1を得ます");
          oppPays = false;
        } else {
          openPickFromWaitingDialog(
            oppLiveHand,
            "相手想定: 手札のライブ1枚を控え室に置きます。",
            function (liveHandId) {
              if (liveHandId) {
                var li = state.hand.findIndex(function (h) {
                  return h && String(h.id) === String(liveHandId);
                });
                if (li >= 0) state.waitingRoom.push(state.hand.splice(li, 1)[0]);
                showToast("ライブ1枚を控え室に置きました（相手想定）");
              }
              finishResolved();
            },
            { okLabel: "控え室に置く", dialogTitle: "相手想定 — 手札ライブ" },
          );
          return;
        }
      }
      if (!oppPays) {
        if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
        var oppScoreSeg = "{{jyouji.png|常時}}ライブの合計スコアを＋１する。";
        if (inst._grantedJoujiSegmentRaws.indexOf(oppScoreSeg) < 0) inst._grantedJoujiSegmentRaws.push(oppScoreSeg);
        try {
          syncJoujiPassiveEffectsAll();
        } catch (_) {}
        showToast("ライブ終了時まで合計スコア＋1 を得ました");
      }
      finishResolved();
      return;
    }

    if (cl.template === "toujou_turn_block_effect_activate") {
      pushHistoryBefore("toujou-turn-block-activate");
      state.blockEffectMemberActivateTurn = state.turnCount;
      showToast("このターン、効果でメンバーをアクティブにできなくなりました");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_opp_wait_if_high_cost_on_stage") {
      if (!checkAbilityBoardPickFilters(cl.filters || {})) {
        showToast("コスト10以上のメンバーがステージにいません");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-opp-wait-high-cost");
      openSoloOpponentMemberWaitPickDialog(
        cl.oppWaitMaxCost != null ? cl.oppWaitMaxCost : 4,
        "相手ステージのコスト4以下のメンバー1人をウェイトにします。",
        function () {
          finishResolved();
        },
      );
      return;
    }

    if (cl.template === "toujou_grant_opp_live_need_heart_if_stage_hearts") {
      if (!checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      var reqSlotTj = cl.requiredHeartSlot != null ? Math.floor(Number(cl.requiredHeartSlot)) : null;
      var minTotTj = cl.minStageHeartSlotTotal != null ? Number(cl.minStageHeartSlotTotal) : 5;
      var heartTotTj = reqSlotTj != null ? sumStageHeartSlotCount(reqSlotTj) : sumStageTotalPrintedHeartsAll();
      if (heartTotTj < minTotTj) {
        showToast("ステージのハート合計が " + minTotTj + " 未満です");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-grant-opp-live-need-heart");
      if (!inst._grantedJoujiSegmentRaws) inst._grantedJoujiSegmentRaws = [];
      var plusTj = cl.opponentLiveNeedHeartPlus != null ? Math.floor(Number(cl.opponentLiveNeedHeartPlus)) : 1;
      var segTj =
        "{{jyouji.png|常時}}相手のライブカード置き場にあるライブカード1枚は、成功させるための必要ハートが＋" +
        plusTj +
        "多くなる。";
      if (inst._grantedJoujiSegmentRaws.indexOf(segTj) < 0) inst._grantedJoujiSegmentRaws.push(segTj);
      try {
        syncJoujiPassiveEffectsAll();
      } catch (_) {}
      showToast("相手ライブの必要ハート＋" + plusTj + " を付与しました（ライブ終了まで）");
      finishResolved();
      return;
    }

    if (cl.template === "toujou_main_phase_live_from_waiting") {
      if (!checkAbilityToujouPreconditions(cl)) {
        showToast("登場時効果の条件を満たしていません");
        finishResolved();
        return;
      }
      if (!isVersusMainPhaseNow()) {
        showToast("メインフェイズ中のみ効果を解決できます");
        finishResolved();
        return;
      }
      pushHistoryBefore("toujou-main-live-from-wait");
      payAbilityCost(inst, cl, false, function (paid) {
        if (!paid) {
          finishResolved();
          return;
        }
        var livePoolMp = waitingPickCandidates({ pickType: T_LIVE }, null);
        if (!livePoolMp.length) {
          showToast("控え室にライブカードがありません");
          finishResolved();
          return;
        }
        openPickFromWaitingDialog(
          livePoolMp,
          "控え室からライブカード1枚を選び、表向きでライブ置き場に置きます。",
          function (pid) {
            if (!pid) {
              finishResolved();
              return;
            }
            var liveInst = state.waitingRoom.find(function (w) {
              return w && String(w.id) === String(pid);
            });
            if (!liveInst) {
              finishResolved();
              return;
            }
            var col = placeLiveFromWaitingToLiveAreaFaceUp(liveInst);
            if (!col) {
              showToast("空きのライブ枠がありません");
              finishResolved();
              return;
            }
            var pen = cl.liveSetLimitPenalty != null ? Math.max(0, Math.floor(Number(cl.liveSetLimitPenalty))) : 1;
            state.liveSetLimitPenaltyPending =
              Math.max(0, Math.floor(Number(state.liveSetLimitPenaltyPending) || 0)) + pen;
            showToast(
              (mergedCatalogCard(liveInst).name || "ライブ") +
                " をライブ置き場に置き、次のセット上限が " +
                pen +
                " 枚減ります",
            );
            finishResolved();
          },
          { okLabel: "ライブ置き場へ", dialogTitle: "控え室 — ライブ" },
        );
      });
      return;
    }

    finishGuided();
  }

  function removeStageMemberToWaiting(memberInst) {
    if (!memberInst || !memberInst.id) return false;
    var col = stageColumnKeyHostingMember(memberInst.id);
    if (!col) return false;
    var slot = state.stage[col] || [];
    for (var i = 0; i < slot.length; i++) {
      var x = slot[i];
      if (x && x.type === T_MEMBER && String(x.id) === String(memberInst.id)) {
        slot.splice(i, 1);
        clearToujouEffectStateOnLeaveStage(memberInst);
        state.waitingRoom.push(memberInst);
        return true;
      }
    }
    return false;
  }

  /**
   * @param {typeof T_MEMBER | typeof T_LIVE} recoverType
   * @param {string | null} excludeInstId 起動で控え室へ送ったメンバー自身は候補から外す
   */
  function kidouRecoverCandidatesFromWaiting(recoverType, excludeInstId) {
    return state.waitingRoom.filter(function (inst) {
      if (!inst) return false;
      if (excludeInstId && String(inst.id) === String(excludeInstId)) return false;
      var cat = mergedCatalogCard(inst);
      return cat && cat.type === recoverType;
    });
  }

  /**
   * @param {any[]} candidates
   * @param {typeof T_MEMBER | typeof T_LIVE} recoverType
   * @param {(pickedId: string | null) => void} onDone
   */
  function openPickKidouFromWaitingDialog(candidates, recoverType, onDone) {
    var dlg = document.getElementById("dlg-pick-kidou-waiting");
    var list = document.getElementById("dlg-pick-kidou-waiting-list");
    var lead = document.getElementById("dlg-pick-kidou-waiting-lead");
    var btnOk = document.getElementById("dlg-pick-kidou-waiting-ok");
    var btnCx = document.getElementById("dlg-pick-kidou-waiting-cancel");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(candidates && candidates[0] && candidates[0].id != null ? String(candidates[0].id) : null);
      return;
    }
    var typeLabel = recoverType === T_MEMBER ? "メンバー" : "ライブ";
    if (lead) {
      lead.textContent =
        "控え室から " +
        typeLabel +
        "カードを 1 枚選んで手札に加えます（" +
        candidates.length +
        " 枚が対象）。";
    }
    list.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "dlg-pick-kidou-waiting__grid";
    candidates.forEach(function (c, i) {
      var mc = mergedCatalogCard(c);
      var lab = ((mc.card_no != null ? String(mc.card_no) + " " : "") + (mc.name || c.name || "")).trim();
      var thumb = mc.img || c.img || "";
      var labEl = document.createElement("label");
      labEl.className = "dlg-pick-kidou-waiting__tile";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "pickKidouWait";
      radio.value = String(c.id);
      radio.className = "dlg-pick-kidou-waiting__radio";
      if (i === 0) radio.checked = true;
      var img = document.createElement("img");
      img.className = "dlg-pick-kidou-waiting__img";
      img.alt = lab;
      img.loading = "lazy";
      img.decoding = "async";
      if (thumb) img.src = thumb;
      var cap = document.createElement("span");
      cap.className = "dlg-pick-kidou-waiting__label";
      cap.textContent = lab;
      labEl.appendChild(radio);
      labEl.appendChild(img);
      labEl.appendChild(cap);
      grid.appendChild(labEl);
    });
    list.appendChild(grid);

    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var r = list.querySelector('input[name="pickKidouWait"]:checked');
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

  function resolveKidouStageToWaitingEffect(memberInst, onComplete) {
    if (!memberInst) {
      if (onComplete) onComplete();
      return;
    }
    var mc = mergedCatalogCard(memberInst);
    var cl = classifyCardAbility(mc, "kidou");
    var recoverType = cl.filters.pickType || memberKidouRecoverHandType(mc);
    if (!recoverType || cl.template !== "kidou_stage_wait_pick_hand") {
      runClassifiedCardAbility(memberInst, cl, "kidou", onComplete);
      return;
    }
    if (!stageColumnKeyHostingMember(memberInst.id)) {
      showToast("ステージにいるメンバーでのみ起動できます");
      if (onComplete) onComplete();
      return;
    }
    if (isPlayEffectResolved(memberInst, "kidou")) {
      if (onComplete) onComplete();
      return;
    }

    pushHistoryBefore("kidou-effect");
    if (!removeStageMemberToWaiting(memberInst)) {
      showToast("ステージから控え室へ送れませんでした");
      if (onComplete) onComplete();
      return;
    }

    var typeLabel = recoverType === T_MEMBER ? "メンバー" : "ライブ";
    showToast("起動: メンバーを控え室へ送りました");
    render();

    var candidates = waitingPickCandidates(cl.filters, memberInst.id);
    if (!candidates.length) {
      if (onComplete) {
        onComplete();
      } else {
        markPlayEffectResolved(memberInst, "kidou");
      }
      showToast("控え室に回収できる " + typeLabel + " カードがないため、手札への追加はスキップしました");
      render();
      return;
    }

    openPickFromWaitingDialog(
      candidates,
      "控え室から " + typeLabel + " カードを 1 枚選んで手札に加えます。",
      function (pickedId) {
        if (!pickedId) {
          showToast("手札への追加をキャンセルしました（起動メンバーは控え室にいます）");
          render();
          if (onComplete) onComplete();
          return;
        }
        var picked = moveInstFromWaitingToHand(pickedId, memberInst);
        if (!picked) {
          showToast("選択したカードが控え室にありません");
          render();
          if (onComplete) onComplete();
          return;
        }
        if (onComplete) {
          onComplete();
        } else {
          markPlayEffectResolved(memberInst, "kidou");
        }
        var pn = mergedCatalogCard(picked).name || picked.name || "カード";
        showToast(pn + " を手札に加えました");
        logReplay("kidou-pick-hand", {
          kidouMemberId: memberInst.id,
          pickedId: pickedId,
          recoverType: recoverType,
        });
        render();
      },
    );
  }

  function memberKidouGlowOnStage(mc, cardInst) {
    if (mc.type !== T_MEMBER || !stageColumnKeyHostingMember(cardInst.id)) return false;
    if (!canUseKidouEffectsNow()) return false;
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      var kidouRole = getVersusPlayRole();
      if (!kidouRole || !canRoleActInVersus(versusSession.remoteMatch, kidouRole)) return false;
    }
    if (isPlayEffectResolved(cardInst, "kidou")) return false;
    if (isInLiveTurnContext()) return false;
    if (!memberHasKidouAbility(mc)) return false;
    var cl = classifyCardAbility(mc, "kidou");
    if (!cl || cl.template === "none") return false;
    if (cl.perTurnLimit && perTurnLimitExhausted(cardInst, "kidou", cl.perTurnLimit)) return false;
    if (cl.template === "kidou_wait_to_stage" || cl.requiresInWaiting) return false;
    return true;
  }

  function collectStageAndLiveBoardCards() {
    var list = [];
    ["left", "center", "right"].forEach(function (k) {
      (state.stage[k] || []).forEach(function (c) {
        if (c && (c.type === T_MEMBER || c.type === T_LIVE)) list.push(c);
      });
      (state.liveArea[k] || []).forEach(function (c) {
        if (c && (c.type === T_MEMBER || c.type === T_LIVE)) list.push(c);
      });
    });
    return list;
  }

  function liveAreaHasLiveCard() {
    var keys = ["left", "center", "right"];
    for (var i = 0; i < keys.length; i++) {
      var arr = state.liveArea && state.liveArea[keys[i]];
      if (!arr) continue;
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] && arr[j].type === T_LIVE) return true;
      }
    }
    return false;
  }

  function activateLiveStartEffectsAfterBegin() {
    if (!liveAreaHasLiveCard()) {
      state.playLiveStartGlowActive = false;
      return;
    }
    var cards = collectStageAndLiveBoardCards();
    var withStart = cards.filter(function (c) {
      return memberHasLiveStartAbility(mergedCatalogCard(c));
    });
    withStart.forEach(function (c) {
      var mc = mergedCatalogCard(c);
      if (isPlayEffectResolved(c, "live_start") || c._liveStartEffectDeclined === true) return;
      if (c._liveStartEffectActive === true) return;
      c._liveStartEffectActive = true;
    });
    state.playLiveStartGlowActive = withStart.some(function (c) {
      return c._liveStartEffectActive === true && !isPlayEffectResolved(c, "live_start");
    });
    setTimeout(function () {
      orchestratePendingTriggeredEffects(["live_start"]);
    }, 0);
  }

  /** エールで解決にめくったカードはライブ成功時効果の対象にしない（ステージ・ライブ枠のみ） */
  function clearLiveSuccessActivationOffPlayZones() {
    (state.resolutionArea || []).forEach(function (c) {
      if (c) c._liveSuccessEffectActive = false;
    });
    (state.successfulLiveArea || []).forEach(function (c) {
      if (c) c._liveSuccessEffectActive = false;
    });
  }

  function activateLiveSuccessEffectsAfterJudge() {
    clearLiveSuccessActivationOffPlayZones();
    var cards = collectStageAndLiveBoardCards();
    cards.forEach(function (c) {
      var mc = mergedCatalogCard(c);
      if (!memberHasLiveSuccessAbility(mc) && !instHasGrantedTrigger(c, "live_success")) return;
      if (isPlayEffectResolved(c, "live_success") || c._liveSuccessEffectDeclined === true) return;
      if (c._liveSuccessEffectActive === true) return;
      c._liveSuccessEffectActive = true;
    });
  }

  /**
   * @param {*} c
   * @param {string} zoneId
   * @returns {{ glowClasses: string[], effectIcon: string | null, effectGlowKind: string | null }}
   */
  function computePlayCardGlowOpts(c, zoneId) {
    /** @type {{ glowClasses: string[], effectIcon: string | null, effectGlowKind: string | null }} */
    var out = { glowClasses: [], effectIcon: null, effectGlowKind: null };
    if (!c || !zoneId) return out;
    if (isEffectDialogBoardPeekActive()) return out;
    var skipDecorGlow = isLightweightPlayMode();
    ensureCardBoardFields(c);
    var mc = mergedCatalogCard(c);

    if (zoneId === "zone-waiting") {
      if (cardNoIsBp1002(mc.card_no || c.card_no)) {
        out.glowClasses.push("card-item--bp1002-waiting-top-glow");
      }
      if (mc.type === T_MEMBER && canUseKidouEffectsNow() && memberHasKidouAbility(mc)) {
        var clWait = classifyCardAbility(mc, "kidou");
        var perTurnExhausted = clWait.perTurnLimit
          ? perTurnLimitExhausted(c, "kidou", clWait.perTurnLimit)
          : false;
        if (
          clWait.template === "kidou_wait_to_stage" &&
          !isPlayEffectResolved(c, "kidou") &&
          !perTurnExhausted &&
          (!versusMatchPhaseActive() ||
            !versusSession.remoteMatch ||
            (getVersusPlayRole() &&
              canRoleActInVersus(versusSession.remoteMatch, getVersusPlayRole())))
        ) {
          out.glowClasses.push("card-item--play-kidou-glow");
          if (!out.pendingEffectKinds) out.pendingEffectKinds = [];
          out.pendingEffectKinds.push({ kind: "kidou", label: "起動" });
        }
      }
      if (mc.type === T_MEMBER || mc.type === T_LIVE) {
        var pendingLiveStartWait =
          c._liveStartEffectActive === true &&
          state.playLiveYellStarted !== true &&
          memberHasLiveStartAbility(mc) &&
          !isPlayEffectResolved(c, "live_start") &&
          liveAreaHasLiveCard();
        var pendingLiveSuccessWait =
          c._liveSuccessEffectActive === true &&
          memberHasLiveSuccessAbility(mc) &&
          !isPlayEffectResolved(c, "live_success") &&
          c._liveSuccessEffectDeclined !== true &&
          (isVersusLiveSuccessFxStep(versusSession.remoteMatch) ||
            (state.liveStatsAfterBegin === true && playLiveSuccessJudgmentVisible()));
        if (!out.pendingEffectKinds) out.pendingEffectKinds = [];
        if (pendingLiveStartWait) {
          out.glowClasses.push("card-item--play-live-start-glow");
          out.pendingEffectKinds.push({ kind: "live_start", label: "開始時" });
        }
        if (pendingLiveSuccessWait) {
          out.glowClasses.push("card-item--play-live-success-glow");
          out.pendingEffectKinds.push({ kind: "live_success", label: "成功" });
        }
        if (pendingLiveSuccessWait) {
          out.effectIcon = "live_success";
          out.effectGlowKind = "live_success";
        } else if (pendingLiveStartWait) {
          out.effectIcon = "live_start";
          out.effectGlowKind = "live_start";
        } else if (
          out.pendingEffectKinds.some(function (pe) {
            return pe.kind === "kidou";
          })
        ) {
          out.effectIcon = "kidou";
          out.effectGlowKind = "kidou";
        }
        if (out.effectGlowKind) out.effectResolveKind = out.effectGlowKind;
      }
      if (skipDecorGlow) out.glowClasses = [];
      return out;
    }
    if (isPlayGlowExemptZone(zoneId)) {
      if (skipDecorGlow) out.glowClasses = [];
      return out;
    }

    if (zoneId === "zone-hand" && mc.type === T_MEMBER) {
      if (canHandMemberEnterStage(c)) {
        out.glowClasses.push("card-item--hand-playable-glow");
        out.effectGlowKind = "hand_playable";
      }
      if (skipDecorGlow) out.glowClasses = [];
      return out;
    }

    var onStageOrLive = /^stage-/.test(zoneId) || /^live-/.test(zoneId);
    if (!onStageOrLive || (mc.type !== T_MEMBER && mc.type !== T_LIVE)) {
      if (skipDecorGlow) out.glowClasses = [];
      return out;
    }

    var pendingKidou = memberKidouGlowOnStage(mc, c);
    var pendingToujou =
      mc.type === T_MEMBER &&
      c._toujouEffectActive === true &&
      memberHasToujouAbility(mc) &&
      !isPlayEffectResolved(c, "toujyou");
    var pendingLiveStart =
      c._liveStartEffectActive === true &&
      state.playLiveYellStarted !== true &&
      memberHasLiveStartAbility(mc) &&
      !isPlayEffectResolved(c, "live_start") &&
      liveAreaHasLiveCard();
    var pendingLiveSuccess =
      c._liveSuccessEffectActive === true &&
      memberHasLiveSuccessAbility(mc) &&
      !isPlayEffectResolved(c, "live_success") &&
      c._liveSuccessEffectDeclined !== true &&
      (isVersusLiveSuccessFxStep(versusSession.remoteMatch) ||
        (state.liveStatsAfterBegin === true && playLiveSuccessJudgmentVisible()));

    if (pendingKidou) out.glowClasses.push("card-item--play-kidou-glow");
    if (pendingToujou) out.glowClasses.push("card-item--play-toujou-glow");
    if (pendingLiveStart) out.glowClasses.push("card-item--play-live-start-glow");
    if (pendingLiveSuccess) out.glowClasses.push("card-item--play-live-success-glow");

    /** @type {Array<{kind:string,label:string}>} */
    out.pendingEffectKinds = [];
    if (pendingKidou) out.pendingEffectKinds.push({ kind: "kidou", label: "起動" });
    if (pendingToujou) out.pendingEffectKinds.push({ kind: "toujyou", label: "登場" });
    if (pendingLiveStart) out.pendingEffectKinds.push({ kind: "live_start", label: "開始時" });
    if (pendingLiveSuccess) out.pendingEffectKinds.push({ kind: "live_success", label: "成功" });

    if (pendingLiveSuccess) {
      out.effectIcon = "live_success";
      out.effectGlowKind = "live_success";
    } else if (pendingLiveStart) {
      out.effectIcon = "live_start";
      out.effectGlowKind = "live_start";
    } else if (pendingToujou) {
      out.effectIcon = "toujyou";
      out.effectGlowKind = "toujyou";
    } else if (pendingKidou) {
      out.effectIcon = "kidou";
      out.effectGlowKind = "kidou";
    }
    if (out.effectGlowKind) out.effectResolveKind = out.effectGlowKind;
    if (skipDecorGlow) out.glowClasses = [];
    return out;
  }

  function appendEffectIconBelowArt(artWrap, canonKey, glowKind, cardInst, resolveKind) {
    if (!artWrap || !canonKey) return;
    var html = boardMemberEffectIconHtml(canonKey, glowKind || canonKey);
    if (!html) return;
    var host = document.createElement("div");
    host.className = "card-effect-icon-host";
    if (glowKind) host.classList.add("card-effect-icon-glow--" + glowKind);
    host.innerHTML = html;
    if (cardInst && resolveKind) {
      host.classList.add("card-effect-icon-host--clickable");
      host.title = "クリックで効果を解決";
      host.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        resolvePlayCardEffect(cardInst, resolveKind);
      });
    }
    artWrap.appendChild(host);
  }

  function shouldUseIconOnlyStageEffectResolve(opts, cardType) {
    if (!opts || cardType !== T_MEMBER || !/^stage-/.test(String(opts.hostZoneId || ""))) return false;
    if (!opts.effectIcon || !opts.effectGlowKind) return false;
    var pks = opts.pendingEffectKinds;
    if (!pks || !pks.length) {
      return opts.effectGlowKind === "live_success";
    }
    return pks.every(function (pe) {
      return pe.kind === "live_success";
    });
  }

  function stampToujouBatonFromLowerCostOnEntry(snapBeforeDrag, newlyEntered) {
    if (!snapBeforeDrag || !newlyEntered || !newlyEntered.length) return;
    newlyEntered.forEach(function (inst) {
      if (!inst || inst.type !== T_MEMBER) return;
      var col = stageColumnKeyHostingMember(inst.id);
      if (!col) return;
      var prevMem = incumbentFromSnapStageSlot(snapBeforeDrag, col, inst.id);
      if (!prevMem || prevMem.type !== T_MEMBER) return;
      if (memberFlooredPrintedCost(prevMem) < memberFlooredPrintedCost(inst)) {
        inst._toujouBatonFromLowerCostMemberId = String(prevMem.id);
      }
    });
  }

  function activateToujouEffectsOnStageEntry(snapBeforeDrag) {
    if (!snapBeforeDrag || typeof snapBeforeDrag !== "object") return;
    expirePendingToujouEffects([]);
    const prev = stageMemberIdSetFromSnap(snapBeforeDrag);
    const now = stageMemberIdSetFromState();
    var newlyEntered = [];
    now.forEach(function (id) {
      if (prev.has(id)) return;
      var inst = findCardInstById(id);
      if (inst && inst.type === T_MEMBER) newlyEntered.push(inst);
    });
    if (!newlyEntered.length) return;
    stampToujouBatonFromLowerCostOnEntry(snapBeforeDrag, newlyEntered);
    newlyEntered.forEach(function (inst) {
      var mc = mergedCatalogCard(inst);
      if (!memberHasToujouAbility(mc)) return;
      if (inst._toujouEffectActive === true || inst._toujouEffectDeclined === true) return;
      var cl = classifyCardAbility(mc, "toujyou");
      var optional = cl.optional || cl.hasOptionalCost;
      if (optional) {
        inst._toujouEffectActive = true;
        logReplay("toujou-optional-active", { cardId: inst.id, cardNo: inst.card_no });
      } else {
        inst._toujouEffectActive = true;
        inst._toujouMandatoryAuto = true;
        logReplay("toujou-mandatory-auto", { cardId: inst.id, cardNo: inst.card_no });
      }
    });
    try {
      fireJidouAfterStageEntries(newlyEntered);
    } catch (jErr) {
      console.warn(jErr);
    }
    setTimeout(function () {
      orchestratePendingTriggeredEffects(["toujyou"]);
    }, 0);
    newlyEntered.forEach(function (inst) {
      try {
        fireJidouAutoForMember(inst, "enter_or_baton");
      } catch (jErr2) {
        console.warn(jErr2);
      }
    });
  }

  /**
   * @param {string[]} kinds
   * @returns {Array<{inst:any, cl:any, kind:string, mandatory:boolean, label:string}>}
   */
  function collectPendingTriggeredEffects(kinds) {
    var result = [];
    var seenKinds = new Set(kinds || ["toujyou", "live_start", "live_success"]);
    function visit(c) {
      if (!c) return;
      var mc = mergedCatalogCard(c);
      var kindAct = {
        toujyou: c._toujouEffectActive === true,
        live_start: c._liveStartEffectActive === true,
        live_success: c._liveSuccessEffectActive === true,
      };
      var kindDeclined = {
        toujyou: c._toujouEffectDeclined === true,
        live_start: c._liveStartEffectDeclined === true,
        live_success: c._liveSuccessEffectDeclined === true,
      };
      ["toujyou", "live_start", "live_success"].forEach(function (k) {
        if (!seenKinds.has(k)) return;
        if (k === "toujyou" && mc.type !== T_MEMBER) return;
        if ((k === "live_start" || k === "live_success") && mc.type !== T_MEMBER && mc.type !== T_LIVE) return;
        if (!kindAct[k]) return;
        if (kindDeclined[k]) return;
        if (cardHasTrigger(mc, k)) {
          if (!isPlayEffectResolved(c, k)) {
            var clK = classifyCardAbility(mc, k);
            var mandatory = !clK.optional && !clK.hasOptionalCost;
            result.push({
              inst: c,
              cl: clK,
              kind: k,
              mandatory: mandatory,
              label: (mc.name || c.name || "カード") + " — " + abilityKindLabel(k),
            });
          }
        }
        if (Array.isArray(c._grantedTriggerSegmentRaws)) {
          c._grantedTriggerSegmentRaws.forEach(function (entry, gIdx) {
            if (!entry || entry.trigger !== k) return;
            var gKey = k + "_granted_" + gIdx;
            if (isPlayEffectResolved(c, gKey)) return;
            var clG = classifyCardAbility(mc, k, entry.segRaw);
            result.push({
              inst: c,
              cl: clG,
              kind: k,
              resolveKind: gKey,
              mandatory: !clG.optional && !clG.hasOptionalCost,
              label: (mc.name || c.name || "カード") + " — 付与された" + abilityKindLabel(k),
            });
          });
        }
      });
    }
    ["left", "center", "right"].forEach(function (col) {
      (state.stage[col] || []).forEach(function (c) {
        visit(c);
        if (seenKinds.has("live_success") && c && c.type === T_MEMBER) {
          var mcMir = mergedCatalogCard(c);
          if (!memberHasMirrorUnderLiveSuccessJouji(mcMir)) return;
          if (!c._liveSuccessEffectActive || c._liveSuccessEffectDeclined) return;
          if (isPlayEffectResolved(c, "live_success_mirror")) return;
          var under = getMemberCardDirectlyBelow(c);
          if (!under || !memberMatchesMirrorUnderFilters(under, mcMir)) return;
          var underMc = mergedCatalogCard(under);
          if (!cardHasTrigger(underMc, "live_success")) return;
          var clMir = classifyCardAbility(underMc, "live_success");
          result.push({
            inst: c,
            cl: clMir,
            kind: "live_success",
            resolveKind: "live_success_mirror",
            mandatory: !clMir.optional && !clMir.hasOptionalCost,
            label: (mcMir.name || c.name || "カード") + " — 下のカードのライブ成功時効果",
          });
        }
      });
      (state.liveArea[col] || []).forEach(visit);
    });
    /**
     * 解決ゾーン・成功ライブカード置き場はエール公開や過去の成功ライブ用。
     * ライブ成功時の誘発対象はステージ／ライブ枠のカードのみ。
     */
    var onlyLiveSuccess =
      seenKinds.size === 1 && seenKinds.has("live_success");
    if (!onlyLiveSuccess) {
      (state.resolutionArea || []).forEach(visit);
      (state.successfulLiveArea || []).forEach(visit);
    }
    return result;
  }

  function abilityKindLabel(kind) {
    if (kind === "toujyou") return "登場時";
    if (kind === "live_start") return "ライブ開始時";
    if (kind === "live_success") return "ライブ成功時";
    if (kind === "kidou") return "起動";
    return "効果";
  }

  /**
   * @param {{inst:any, cl:any, kind:string, mandatory:boolean, label:string}} item
   * @param {(proceed: boolean) => void} onDone
   */
  function openMandatoryTriggeredEffectPrompt(item, onDone) {
    var inst = item.inst;
    var kind = item.kind;
    var mc = mergedCatalogCard(inst);
    var dlg = document.getElementById("dlg-ability-guided");
    var body = document.getElementById("dlg-ability-guided-body");
    var btnDone = document.getElementById("dlg-ability-guided-done");
    var btnCx = document.getElementById("dlg-ability-guided-cancel");
    var title = document.getElementById("dlg-ability-guided-title");
    if (!dlg || !body || !btnDone || typeof dlg.showModal !== "function") {
      onDone(true);
      return;
    }
    if (inst) effectDialogPeekSourceInst = inst;
    syncAbilityGuidedDialogLead(inst, kind);
    pushLocalVersusEffectUi(inst, kind, abilityPlainText(mc) || "");
    var prevDoneLabel = btnDone.textContent;
    if (title) title.textContent = formatAbilityEffectDialogTitle(inst, kind, { mandatory: true });
    body.innerHTML = abilityEffectBodyHtml(mc, kind);
    btnDone.textContent = "効果を解決する";
    function cleanup() {
      hideEffectDialogResumeChipOnDialogCleanup();
      btnDone.textContent = prevDoneLabel || "完了";
      btnDone.removeEventListener("click", onDoneClick);
      if (btnCx) btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
      var vb = dlg.querySelector("[data-dialog-view-board]");
      if (vb) vb.remove();
    }
    function closeDlg() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
    }
    function onDoneClick() {
      closeDlg();
      onDone(true);
    }
    function onCx() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      closeDlg();
      onDone(false);
    }
    function onDismiss() {
      if (shouldIgnoreEffectDialogDismiss()) return;
      closeDlg();
      onDone(false);
    }
    ensureDialogViewBoardButton(dlg.querySelector(".app-dialog__actions"), dlg, inst);
    btnDone.addEventListener("click", onDoneClick);
    if (btnCx) btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  /** Drives auto-resolution of mandatory triggered effects and prompts user when multiple effects coexist. */
  function orchestratePendingTriggeredEffects(kinds) {
    if (isPlayManualMode()) return;
    var pending = collectPendingTriggeredEffects(kinds);
    if (!pending.length) return;
    var hasMandatory = pending.some(function (p) {
      return p.mandatory;
    });
    if (!hasMandatory) return;
    function resolveMandatoryItem(pick) {
      runClassifiedCardAbility(
        pick.inst,
        pick.cl,
        pick.kind,
        function () {
          orchestratePendingTriggeredEffects(kinds);
        },
        { resolveKind: pick.resolveKind || pick.kind },
      );
    }
    if (pending.length === 1) {
      resolveMandatoryItem(pending[0]);
      return;
    }
    openPickEffectOrderDialog(pending, function (chosenIdx) {
      if (chosenIdx == null) return;
      resolveMandatoryItem(pending[chosenIdx]);
    });
  }

  /**
   * @param {Array<{inst:any, cl:any, kind:string, mandatory:boolean, label:string}>} items
   * @param {(chosenIdx: number | null) => void} onDone
   */
  function openPickEffectOrderDialog(items, onDone) {
    var dlg = document.getElementById("dlg-pick-effect-order");
    var list = document.getElementById("dlg-pick-effect-order-list");
    var btnOk = document.getElementById("dlg-pick-effect-order-ok");
    var btnCx = document.getElementById("dlg-pick-effect-order-cancel");
    var dlgTitle = document.getElementById("dlg-pick-effect-order-title");
    if (!dlg || !list || !btnOk || typeof dlg.showModal !== "function") {
      onDone(null);
      return;
    }
    var prevDialogTitleHtml = dlgTitle ? dlgTitle.innerHTML : "";
    if (dlgTitle) {
      dlgTitle.textContent = "どの効果から解決しますか？";
    }
    list.innerHTML = "";
    items.forEach(function (it, i) {
      var mc = mergedCatalogCard(it.inst);
      var row = document.createElement("label");
      row.className = "dlg-pick-effect-order__row";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "pickEffectOrder";
      radio.value = String(i);
      radio.className = "dlg-pick-effect-order__radio";
      if (i === 0) radio.checked = true;
      var img = document.createElement("img");
      img.className = "dlg-pick-effect-order__img";
      if (mc.img || it.inst.img) img.src = mc.img || it.inst.img;
      img.alt = mc.name || "";
      var meta = document.createElement("div");
      meta.className = "dlg-pick-effect-order__meta";
      var title = document.createElement("div");
      title.className = "dlg-pick-effect-order__title";
      var chip = document.createElement("span");
      chip.className =
        "dlg-pick-effect-order__chip " +
        (it.mandatory ? "dlg-pick-effect-order__chip--mand" : "dlg-pick-effect-order__chip--opt");
      chip.textContent = it.mandatory ? "強制" : "任意";
      title.appendChild(chip);
      var titleText = document.createElement("span");
      titleText.textContent = it.label;
      title.appendChild(titleText);
      var sub = document.createElement("div");
      sub.className = "dlg-pick-effect-order__sub";
      var segRaw = abilityRawSegmentForTrigger(mc, it.kind) || cardAbilityRawText(mc);
      sub.innerHTML = wikiAbilityToStatusHtml(segRaw || "");
      meta.appendChild(title);
      meta.appendChild(sub);
      row.appendChild(radio);
      row.appendChild(img);
      row.appendChild(meta);
      list.appendChild(row);
    });
    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      btnCx.removeEventListener("click", onCx);
      dlg.removeEventListener("cancel", onDismiss);
    }
    function onOk() {
      var sel = list.querySelector('input[name="pickEffectOrder"]:checked');
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(sel && sel.value != null ? Number(sel.value) : null);
    }
    function onCx() {
      cleanup();
      try {
        dlg.close();
      } catch (_) {}
      onDone(null);
    }
    function onDismiss() {
      cleanup();
      onDone(null);
    }
    btnOk.addEventListener("click", onOk);
    btnCx.addEventListener("click", onCx);
    dlg.addEventListener("cancel", onDismiss);
    dlg.showModal();
  }

  function openCardCatalogDetail(c) {
    var inHand = !!(c && state.hand.some(function (h) { return h && String(h.id) === String(c.id); }));
    var memberInHand = inHand && c && c.type === T_MEMBER;
    var actions = null;
    if (memberInHand) {
      actions = {
        sideGlow: {
          left: handMemberStageSideInfo(c, "left").canEnter,
          center: handMemberStageSideInfo(c, "center").canEnter,
          right: handMemberStageSideInfo(c, "right").canEnter,
        },
        onStage: function (side) {
          placeHandMemberOnStageSide(c, side);
        },
      };
    }
    openCardCatalogDialog(c, { playMode: true, handStageActions: actions });
    logReplay("card-catalog-detail-open");
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
    if (opts.stageVeteranGlow) div.classList.add("card-item--stage-veteran-glow");
    if (
      effectDialogPeekSourceInst &&
      effectDialogPeekSourceInst.id != null &&
      String(c.id) === String(effectDialogPeekSourceInst.id)
    ) {
      div.classList.add("card-item--effect-peek-source");
    }
    if (opts.playGlowClasses && opts.playGlowClasses.length) {
      opts.playGlowClasses.forEach(function (cls) {
        if (cls) div.classList.add(cls);
      });
    }

    if (opts.showHandMemberCost && c.type === T_MEMBER) {
      var effHandCost = memberFlooredPrintedCost(c);
      var costPill = document.createElement("span");
      costPill.className = "card-hand-cost-pill";
      var mergedHc = mergedCatalogCard(c);
      var printedBase = Number(mergedHc.cost);
      if (!Number.isFinite(printedBase) || printedBase < 1) {
        if (isHandDependentCost20Member(mergedHc.card_no || c.card_no)) printedBase = 20;
        else printedBase = effHandCost;
      }
      if (isHandDependentCost20Member(mergedHc.card_no || c.card_no) && effHandCost < printedBase) {
        costPill.textContent = "コスト " + printedBase + "→" + effHandCost;
        costPill.title =
          "手札の枚数（自身を除く）ぶん登場コストが減少（現在 " + effHandCost + "）";
      } else if (effHandCost < printedBase) {
        costPill.textContent = "コスト " + printedBase + "→" + effHandCost;
        costPill.title = "常時効果で登場コストが " + (printedBase - effHandCost) + " 減少";
      } else {
        costPill.textContent = "コスト " + effHandCost;
      }
      div.appendChild(costPill);
    }

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
        img.src = playZoneFaceImgUrl(c.img, opts);
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
      else if (c.type === T_MEMBER) {
        if (c.lcWait === true) img.classList.add("rotated");
      } else if (c.isRotated) img.classList.add("rotated");
      if (opts.catalogImgClickDetail === true) {
        img.addEventListener(
          "click",
          function (e) {
            if (e.target.closest(".stance-chip, .card-no-drag, .card-pick-wrap, .card-effect-resolve-btn, .card-effect-icon-host")) return;
            if (Date.now() - lastDragEndAt < 550) return;
            e.stopPropagation();
            e.preventDefault();
            openCardCatalogDetail(c);
          },
          true,
        );
      } else if (typeof opts.onRotate === "function") {
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
      var artWrap = document.createElement("div");
      artWrap.className = "card-art-wrap";
      artWrap.appendChild(img);
      var iconOnlyEffectResolve = shouldUseIconOnlyStageEffectResolve(opts, c.type);
      var effectResolveKind =
        opts.effectResolveKind ||
        (iconOnlyEffectResolve && opts.effectGlowKind ? opts.effectGlowKind : null);
      if (opts.pendingEffectKinds && opts.pendingEffectKinds.length && !iconOnlyEffectResolve) {
        var btnRow = document.createElement("div");
        btnRow.className = "card-effect-resolve-btn-row";
        opts.pendingEffectKinds.forEach(function (pe) {
          var resBtn = document.createElement("button");
          resBtn.type = "button";
          resBtn.className =
            "card-effect-resolve-btn card-no-drag card-effect-resolve-btn--" + pe.kind;
          resBtn.textContent = pe.label ? pe.label + "解決" : "効果解決";
          resBtn.title = (pe.label || "効果") + "を解決";
          resBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            e.preventDefault();
            resolvePlayCardEffect(c, pe.kind);
          });
          btnRow.appendChild(resBtn);
        });
        artWrap.appendChild(btnRow);
      } else if (
        opts.effectGlowKind &&
        opts.effectGlowKind !== "hand_playable" &&
        !iconOnlyEffectResolve
      ) {
        var resBtn = document.createElement("button");
        resBtn.type = "button";
        resBtn.className =
          "card-effect-resolve-btn card-no-drag card-effect-resolve-btn--" + opts.effectGlowKind;
        resBtn.textContent = "効果解決";
        resBtn.title = "効果解決して発光とアイコンを消す";
        var glowKindBtn = opts.effectGlowKind;
        resBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          e.preventDefault();
          var map = {
            kidou: "kidou",
            toujyou: "toujyou",
            live_start: "live_start",
            live_success: "live_success",
          };
          resolvePlayCardEffect(c, map[glowKindBtn] || glowKindBtn);
        });
        artWrap.appendChild(resBtn);
      }
      if (opts.effectIcon) {
        appendEffectIconBelowArt(artWrap, opts.effectIcon, opts.effectGlowKind, c, effectResolveKind);
      }
      div.appendChild(artWrap);
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
      const mkWait = document.createElement("button");
      mkWait.type = "button";
      mkWait.className = "stance-chip stance-wait" + (c.lcWait === true ? " is-on" : "");
      mkWait.textContent = "W";
      mkWait.title =
        c.type === T_MEMBER
          ? "ウェイト：横向き（キー W と同じ）"
          : "ウェイト状態（側面エネ：横向き。キー W と同じ）";
      mkWait.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (c.type === T_MEMBER) {
          var wasActiveMember = c.lcActive !== false && c.lcWait !== true;
          pushHistoryBefore("stance-member-wait");
          c.lcWait = true;
          c.lcActive = false;
          c.isRotated = true;
          if (wasActiveMember) {
            try {
              fireJidouAfterSelfActiveToWait(c);
            } catch (jErr) {
              console.warn(jErr);
            }
          }
        } else {
          pushHistoryBefore("stance-lcWait");
          c.isRotated = true;
          c.lcWait = true;
          c.lcActive = false;
        }
        render();
      });
      const mkAct = document.createElement("button");
      mkAct.type = "button";
      mkAct.className = "stance-chip stance-active" + (c.lcActive !== false ? " is-on" : "");
      mkAct.textContent = "A";
      mkAct.title =
        c.type === T_MEMBER
          ? "アクティブ：縦向き（キー A と同じ）"
          : "アクティブ状態（側面エネ：縦向き。キー A と同じ）";
      mkAct.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (c.type === T_MEMBER) {
          if (memberSkipAutoActivateThisTurn(c)) {
            showToast("次のターンのアクティブフェイズまでアクティブにできません");
            return;
          }
          pushHistoryBefore("stance-member-active");
          c.lcWait = false;
          c.lcActive = true;
          c.isRotated = false;
        } else {
          pushHistoryBefore("stance-lcActive");
          c.isRotated = false;
          c.lcWait = false;
          c.lcActive = true;
        }
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

    // 1ドロー直後のフラッシュ（ドローのみやや長め＋カード枠の発光）
    var yellKind = c._flashYellKind || null;
    var isYellSpecialDrawHeart =
      yellKind === "draw_yell" && catalogLiveCardIsDrawYellBladeHeart(mergedCatalogCard(c));
    var isDrawYellFlash =
      isYellSpecialDrawHeart ||
      c._flashDrawLabel === FLASH_LABEL_DRAW_YELL_PLUS_ONE ||
      c._flashDrawLabel === FLASH_LABEL_PLUS_DRAW;
    var isScoreYellFlash = yellKind === "score" || c._flashDrawLabel === FLASH_LABEL_SCORE_PLUS_ONE;
    var isNonBhMemberFlash = yellKind === "nonbh_member";
    var flashDur =
      isDrawYellFlash || isScoreYellFlash || isNonBhMemberFlash
        ? FLASH_DRAW_YELL_DURATION_MS
        : FLASH_DRAW_DURATION_MS;
    var flashUntil = (Number(c._flashDrawAt) || 0) + flashDur;
    var nowMs = Date.now();
    if (!isLightweightPlayMode() && flashUntil > nowMs) {
      var remainMs = Math.max(120, flashUntil - nowMs);
      var flash = document.createElement("div");
      flash.className = "card-flash-plus-one";
      if (isDrawYellFlash) flash.classList.add("card-flash-plus-one--draw-yell");
      if (isScoreYellFlash) flash.classList.add("card-flash-plus-one--score-yell");
      if (isNonBhMemberFlash) flash.classList.add("card-flash-plus-one--nonbh-member");
      flash.setAttribute("aria-hidden", "true");
      flash.textContent =
        c._flashDrawLabel != null && String(c._flashDrawLabel) !== ""
          ? c._flashDrawLabel
          : isNonBhMemberFlash
            ? FLASH_LABEL_MISS
            : FLASH_LABEL_PLUS_DRAW;
      flash.style.animationDuration = remainMs + "ms";
      div.appendChild(flash);
      if (yellKind === "score" || isScoreYellFlash) {
        var floatScore = document.createElement("div");
        floatScore.className = "card-yell-float-icon-wrap";
        floatScore.innerHTML = boardYellFloatIconHtml("score");
        floatScore.style.animationDuration = remainMs + "ms";
        div.appendChild(floatScore);
        div.classList.add("card-item--score-yell-glow");
        window.setTimeout(function () {
          div.classList.remove("card-item--score-yell-glow");
        }, remainMs + 80);
      } else if (yellKind === "nonbh_member" || isNonBhMemberFlash) {
        div.classList.add("card-item--nonbh-yell-glow");
        window.setTimeout(function () {
          div.classList.remove("card-item--nonbh-yell-glow");
        }, remainMs + 80);
      } else if (isYellSpecialDrawHeart) {
        var floatDraw = document.createElement("div");
        floatDraw.className = "card-yell-float-icon-wrap card-yell-float-icon-wrap--draw";
        floatDraw.innerHTML = boardYellFloatIconHtml("draw_yell");
        floatDraw.style.animationDuration = remainMs + "ms";
        div.appendChild(floatDraw);
        div.classList.add("card-item--draw-yell-glow");
        window.setTimeout(function () {
          div.classList.remove("card-item--draw-yell-glow");
        }, remainMs + 80);
      }
      setTimeout(function () {
        if (flash && flash.parentNode) flash.parentNode.removeChild(flash);
        c._flashYellKind = null;
      }, remainMs + 60);
    } else if (c._flashDrawAt) {
      c._flashDrawAt = 0;
      c._flashDrawLabel = null;
      c._flashYellKind = null;
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
    var handMultiRow =
      zoneId === "zone-hand" &&
      arr.length >= 14 &&
      !(state.liveTurnPickMode && state.liveTurnHandSpreadPick);
    var handRowSizes = handMultiRow ? handRowChunkSizes(arr.length) : null;
    var handRowIndex = 0;
    var handRowCardIndex = 0;
    var handRowEl = null;
    function handAppendParent() {
      if (!handMultiRow) return el;
      if (!handRowEl || handRowCardIndex >= handRowSizes[handRowIndex]) {
        if (handRowEl) handRowIndex++;
        handRowCardIndex = 0;
        handRowEl = document.createElement("div");
        handRowEl.className = "hand-zone-row";
        applyHandRowOverlapClasses(handRowEl, handRowSizes[handRowIndex]);
        el.appendChild(handRowEl);
      }
      handRowCardIndex++;
      return handRowEl;
    }
    arr.forEach(function (c, cardIdx) {
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
      if (isStage && c.type === T_MEMBER) {
        c.isRotated = c.lcWait === true;
      }
      var onRotate =
        isStage &&
        rotateLabel &&
        c.type !== T_MEMBER &&
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
        !isLightweightPlayMode() &&
        isStage &&
        c.type === T_MEMBER &&
        typeof c.stageTurnEntered === "number" &&
        Number.isFinite(c.stageTurnEntered) &&
        state.turnCount > c.stageTurnEntered;

      var successLiveAlwaysGlow = !isLightweightPlayMode() && isSuccessLive && c.type === T_LIVE;
      var liveVenueBoost = !isLightweightPlayMode() && isLiveBoard && !state.liveTurnPickMode && c.type === T_LIVE;

      var catalogImgClickDetail =
        (c.type === T_MEMBER || c.type === T_LIVE) &&
        (zoneId === "zone-hand" ||
          zoneId === "zone-waiting" ||
          zoneId === "zone-deck" ||
          zoneId === "zone-preview" ||
          zoneId === "zone-resolution" ||
          zoneId === "zone-success-live" ||
          /^live-/.test(zoneId) ||
          /^stage-/.test(zoneId));

      var playGlow = computePlayCardGlowOpts(c, zoneId);
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
        catalogImgClickDetail: catalogImgClickDetail === true,
        playGlowClasses: playGlow.glowClasses,
        effectIcon: playGlow.effectIcon,
        effectGlowKind: playGlow.effectGlowKind,
        effectResolveKind: playGlow.effectResolveKind,
        pendingEffectKinds: playGlow.pendingEffectKinds,
        hostZoneId: zoneId,
        cardType: c.type,
        thumbPile: isDeckZone && state.deckPileOpen && !state.deckPileFacesDown,
        showHandMemberCost:
          zoneId === "zone-hand" &&
          c.type === T_MEMBER &&
          isHandDependentCost20Member(mergedCatalogCard(c).card_no || c.card_no),
      };
      if (zoneId === "zone-hand" && isMulliganHandPickActive()) {
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
      handAppendParent().appendChild(cardEl(c, cardOpts));
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
      el.querySelectorAll(".card-item").forEach((n) => {
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
          fireJidouLeaveStageEvents(m, newMember);
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
          fireJidouLeaveStageEvents(m, newMember);
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
      state.stage[k] = mem ? [...en, mem] : [];
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

  function isHandZoneSortableEl(el) {
    if (!el) return false;
    if (el.id === "zone-hand") return true;
    return !!(el.classList && el.classList.contains("hand-zone-row"));
  }

  function attachHandZoneSortables() {
    var zone = $("zone-hand");
    if (!zone) return;
    var rowEls = zone.querySelectorAll(":scope > .hand-zone-row");
    if (!rowEls.length) {
      wireSortable("zone-hand");
      return;
    }
    rowEls.forEach(function (rowEl, idx) {
      if (!rowEl.id) rowEl.id = "hand-zone-row-" + idx;
      wireSortable(rowEl.id);
    });
  }

  function allowPut(toSortable, fromSortable, dragEl) {
    if (versusBlocksFreePlay()) return false;
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
      if (playLiveMechanicalFailedLocked()) return false;
      var dragId = dragEl.dataset && dragEl.dataset.id;
      if (dragId) {
        var dragInst = findCardInstById(dragId);
        var dragMc = dragInst ? mergedCatalogCard(dragInst) : null;
        if (cardCannotPlaceOnSuccessLive(dragMc)) return false;
      }
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
        var toCol = stageColumnFromZoneEl(toEl);
        if (toCol && !stageColumnAllowsMemberEntry(toCol)) return false;
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
        if (versusBlocksFreePlay()) {
          versusBlocksFreePlayToast();
          dragUndoSnap = null;
          return;
        }
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
        var dragIdEnd =
          evt.item && evt.item.dataset && evt.item.dataset.id != null ? String(evt.item.dataset.id) : "";
        var fromHandDrop = isHandZoneSortableEl(evt.from);
        var toHandDrop = isHandZoneSortableEl(evt.to);
        var toStageCol = stageColumnFromZoneEl(evt.to);
        readAllFromDom();
        if (toHandDrop && dragUndoSnap) {
          maybeRevealHandAddsFromWaitingOrResolution(dragUndoSnap, evt.from);
        }
        if (fromHandDrop && toStageCol === "center" && dragIdEnd && dragUndoSnap) {
          var dragInstCenter = findCardInstById(dragIdEnd);
          var dragMcCenter = dragInstCenter ? mergedCatalogCard(dragInstCenter) : null;
          if (
            dragInstCenter &&
            dragMcCenter &&
            cardIsSpBp4004Sumire(dragMcCenter.card_no) &&
            cardAllowsTwoMemberBaton(dragMcCenter)
          ) {
            applyBoard(dragUndoSnap);
            render();
            placeHandMemberOnStageSide(dragInstCenter, "center", {});
            restoreCardFaceAfterDragging(evt.item);
            clearEnergyDropHints();
            return;
          }
        }
        maybeFlushResolutionToWaitingOnVerdictLiveMove(evt);
        maybeFlashDrawYellOnResolutionDrop(evt, dragUndoSnap);
        if (droppedToSuccessLive) {
          var dragIdSl = evt.item && evt.item.dataset && evt.item.dataset.id;
          var dragInstSl = dragIdSl ? findCardInstById(dragIdSl) : null;
          if (playLiveMechanicalFailedLocked()) {
            showToast("ライブ失敗のため、成功ライブカード置き場にライブカードは置けません");
            if (dragUndoSnap) applyBoard(dragUndoSnap);
            else readAllFromDom();
            render();
            return;
          }
          if (dragInstSl && cardCannotPlaceOnSuccessLive(mergedCatalogCard(dragInstSl))) {
            showToast("このライブカードは成功ライブカード置き場に置けません");
            if (dragUndoSnap) applyBoard(dragUndoSnap);
            else readAllFromDom();
            render();
            return;
          }
          clearTurnScopedPlayBonusesEverywhere();
          var fpSel = $("select-first-player");
          if (fpSel) fpSel.value = "先攻";
          if (
            versusOnlineActive() &&
            isVersusLivePhase(versusSession.remoteMatch) &&
            versusSession.myRole
          ) {
            claimVersusFirstFromSuccessLive(versusSession.roomCode, versusSession.myRole);
          }
        }
        normalizeAfterDrop(dragUndoSnap, lastDraggedDomId);
        syncPlayBonusesAfterStageMembershipChange(dragUndoSnap);
        lastDraggedDomId = "";
        maybeAutoDrawHandAfterLiveMemberSet(evt);
        maybeRotateEnergyCostForMembersNewOnStage(dragUndoSnap);
        stampNewStageMembersForGlow(dragUndoSnap);
        activateToujouEffectsOnStageEntry(dragUndoSnap);
        maybeHandleBp2001EntryPrompt(dragUndoSnap);
        warnAfterStageBatonSameTurnPolicy(dragUndoSnap);
        try {
          maybeFireJidouAfterWaitingRoomChanges(dragUndoSnap);
        } catch (jErr) {
          console.warn(jErr);
        }
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
      if (zid === "zone-hand") return;
      wireSortable(zid);
    });
    attachHandZoneSortables();
  }

  function syncVersusOppSlDisplay() {
    var numEl = document.getElementById("versus-opp-sl-num");
    if (numEl) {
      numEl.textContent = String(Math.max(0, Math.floor(Number(state.versusOpponentSuccessLiveCount) || 0)));
    }
  }

  function versusDualBoardActive() {
    return !!(
      versusSession &&
      (versusSession.mode === "localDual" || versusSession.mode === "localPractice")
    );
  }

  function versusLocalDualActive() {
    return !!(versusSession && versusSession.mode === "localDual");
  }

  function versusLocalDualInactiveRole() {
    if (!versusDualBoardActive() || !versusSession.activeRole) return "guest";
    return versusSession.activeRole === "host" ? "guest" : "host";
  }

  function versusLocalDualRoleLabel(role) {
    if (!versusDualBoardActive()) return role === "guest" ? "相手" : "自分";
    return role === "guest"
      ? String(versusSession.guestDeckLabel || "相手")
      : String(versusSession.hostDeckLabel || "自分");
  }

  function applyVersusLocalDualRoleMeta(role) {
    if (!versusDualBoardActive()) return;
    var map =
      role === "guest"
        ? versusSession.guestDeckMap
        : versusSession.hostDeckMap;
    var labels =
      role === "guest"
        ? versusSession.guestDeckRoleLabels
        : versusSession.hostDeckRoleLabels;
    activePlayDeckMap = normalizeDeckMapCounts(map || {});
    deckKeyCardNos = sanitizeDeckRoleCardNos(labels && labels.keyCardNos);
    deckKeyCard2Nos = sanitizeDeckRoleCardNos(labels && labels.keyCard2Nos);
    deckKeyCard3Nos = sanitizeDeckRoleCardNos(labels && labels.keyCard3Nos);
    deckMiddleCardNos = sanitizeDeckRoleCardNos(labels && labels.middleCardNos);
  }

  function buildOpeningBoardSnapshotForLocalDual(deckMap, roleLabels) {
    var dm = normalizeDeckMapCounts(deckMap || {});
    var deck = shuffle(buildMainDeckInstances(dm));
    var hand = [];
    dealOpeningHand(deck, hand, OPENING_HAND_SIZE);
    return {
      deck: deck,
      hand: hand,
      previewScratch: [],
      deckPileOpen: false,
      deckPileFacesDown: true,
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
      liveTurnHandSpreadPick: false,
      liveStatsAfterBegin: false,
      liveScoreEffectBonus: 0,
      ealeNoteLiveHitIds: [],
      ealeNoteLiveScorePoints: 0,
      liveTurnSelectedIds: [],
      pendingDrawYellHandDraws: 0,
      deckMeta: {
        activePlayDeckMap: dm,
        keyCardNos: sanitizeDeckRoleCardNos(roleLabels && roleLabels.keyCardNos),
        keyCard2Nos: sanitizeDeckRoleCardNos(roleLabels && roleLabels.keyCard2Nos),
        keyCard3Nos: sanitizeDeckRoleCardNos(roleLabels && roleLabels.keyCard3Nos),
        middleCardNos: sanitizeDeckRoleCardNos(roleLabels && roleLabels.middleCardNos),
      },
    };
  }

  function getVersusLocalDualSuccessLiveCount(role) {
    if (!versusDualBoardActive()) return 0;
    if (versusSession.activeRole === role) {
      return successLiveAreaLiveCardCount();
    }
    var snap = versusLocalDualBoards[role];
    return successLiveAreaLiveCardCount(snap && snap.successfulLiveArea);
  }

  function persistVersusLocalDualActiveBoard() {
    if (!versusDualBoardActive() || !versusSession.activeRole) return;
    versusLocalDualBoards[versusSession.activeRole] = snapshotBoard();
  }

  /** @param {'host'|'guest'} role */
  function persistVersusLocalDualBoardForRole(role) {
    if (!versusDualBoardActive() || (role !== "host" && role !== "guest")) return;
    if (versusSession.activeRole !== role) return;
    versusLocalDualBoards[role] = snapshotBoard();
  }

  function syncVersusLocalDualOpponentBoard() {
    if (!versusDualBoardActive()) return;
    var oppRole = versusLocalDualInactiveRole();
    var snap = versusLocalDualBoards[oppRole];
    if (!snap) return;
    var pub = boardToVersusPublicFromStateForLocalDual(snap);
    var fp = fingerprintVersusPublicBoard(pub);
    if (fp === versusOpponentBoardFp) return;
    versusOpponentBoardFp = fp;
    renderVersusOpponentBoard(pub, {
      skipMeta: true,
      skipRevealToasts: true,
      opponentName: versusLocalDualRoleLabel(oppRole),
    });
    var metaEl = document.getElementById("versus-opp-board-meta");
    if (metaEl) {
      var hostSl = getVersusLocalDualSuccessLiveCount("host");
      var guestSl = getVersusLocalDualSuccessLiveCount("guest");
      metaEl.textContent =
        versusLocalDualRoleLabel(oppRole) +
        "（上段・閲覧） · 成功ライブ " +
        versusLocalDualRoleLabel("host") +
        " " +
        hostSl +
        " / " +
        versusLocalDualRoleLabel("guest") +
        " " +
        guestSl +
        "（" +
        LIVE_WINS +
        "枚）";
    }
  }

  initOpponentBoardApi({
    getDualBoards: function () {
      return versusLocalDualBoards;
    },
    isDualBoardActive: versusDualBoardActive,
    getInactiveRole: versusLocalDualInactiveRole,
    snapshotBoard: snapshotBoard,
    applyBoard: applyBoard,
    render: render,
    syncOpponentView: syncVersusLocalDualOpponentBoard,
    mergedCatalogCard: mergedCatalogCard,
  });

  function syncVersusDualBoardSwitchButton() {
    var btn = document.getElementById("btn-versus-dual-board-switch");
    if (!btn) return;
    if (!versusSession || versusSession.mode !== "localPractice") {
      btn.hidden = true;
      btn.disabled = true;
      return;
    }
    btn.hidden = false;
    btn.disabled = !!state.versusMatchEnded;
    var nextRole = versusLocalDualInactiveRole();
    btn.textContent = versusLocalDualRoleLabel(nextRole) + " に切替";
  }

  function syncVersusLocalDualChrome() {
    if (!versusDualBoardActive()) return;
    syncVersusLocalDualOpponentBoard();
    if (versusLocalDualActive()) {
      syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
    }
    syncVersusDualBoardSwitchButton();
  }

  /** @param {'host'|'guest'} next @param {{ preserveUndoStacks?: boolean }} [opts] */
  function switchVersusLocalDualToRole(next, opts) {
    if (!versusDualBoardActive() || state.versusMatchEnded) return;
    if (next !== "host" && next !== "guest") return;
    if (versusSession.activeRole === next) return;
    persistVersusLocalDualActiveBoard();
    versusSession.activeRole = next;
    versusSession.myRole = next;
    state.versusMyRole = next;
    versusSession.opponentName = versusLocalDualRoleLabel(versusLocalDualInactiveRole());
    resetVersusOpponentRevealToastState();
    var snap = versusLocalDualBoards[next];
    if (!snap) {
      showToast("盤面を読み込めませんでした");
      return;
    }
    if (!(opts && opts.preserveUndoStacks)) {
      undoHistory.length = 0;
      redoHistory.length = 0;
      versusMatchUndoStack.length = 0;
      versusMatchRedoStack.length = 0;
    }
    applyBoard(snap);
    applyVersusLocalDualRoleMeta(next);
    versusOpponentBoardFp = "";
    syncVersusLocalDualChrome();
    if (versusLocalDualActive() && versusSession.remoteMatch) {
      syncVersusFirstPlayerSelect(versusSession.remoteMatch);
      syncVersusPhaseLiveBanner(versusSession.remoteMatch);
      syncVersusTurnStartButton(versusSession.remoteMatch);
      updateVersusTurnGlow(versusSession.remoteMatch);
    }
    render();
  }

  function forceVersusLocalDualBoardSwitchToActive() {
    if (!versusLocalDualActive() || state.versusMatchEnded) return false;
    var m = versusSession.remoteMatch;
    if (!m || m.status !== "playing" || !m.activePlayerRole) return false;
    var target = m.activePlayerRole;
    if (target !== "host" && target !== "guest") return false;
    if (versusSession.activeRole === target) return false;
    switchVersusLocalDualToRole(target);
    return true;
  }

  function maybeSyncVersusLocalDualActiveRoleFromMatch() {
    forceVersusLocalDualBoardSwitchToActive();
  }

  function syncVersusLocalDualEndSwitchButton(remoteMatch) {
    var btn = document.getElementById("btn-versus-local-dual-end-switch");
    if (!btn) return;
    if (!versusSession || versusSession.mode !== "localDual") {
      btn.hidden = true;
      btn.disabled = true;
      return;
    }
    btn.hidden = false;
    var m = remoteMatch || versusSession.remoteMatch;
    if (!m || m.status !== "playing" || state.versusMatchEnded) {
      btn.disabled = true;
      btn.textContent = "ターン終了して切り替え";
      btn.removeAttribute("data-action");
      return;
    }
    var playRole = getVersusPlayRole();
    var phase = normalizeVersusPhase(m);
    var activeOp = m.activePlayerRole;
    if (
      activeOp &&
      (activeOp === "host" || activeOp === "guest") &&
      activeOp !== versusSession.activeRole
    ) {
      btn.disabled = false;
      btn.dataset.action = "switch-only";
      btn.textContent = "「" + versusLocalDualRoleLabel(activeOp) + "」の盤面に切り替え";
      btn.classList.add("btn--versus-end-glow");
      return;
    }
    var normalPhase = phase === "firstNormal" || phase === "secondNormal";
    var mineAct = !!(playRole && canRoleActInVersus(m, playRole));
    if (normalPhase && mineAct) {
      var patch = playRole && buildOptimisticVersusTurnEndPatch(m, playRole);
      var nextRole = patch && patch.activePlayerRole;
      if (nextRole === "host" || nextRole === "guest") {
        btn.disabled = false;
        btn.dataset.action = "end-turn-switch";
        btn.textContent =
          "ターン終了して「" + versusLocalDualRoleLabel(nextRole) + "」に切り替え";
        btn.classList.toggle("btn--versus-end-glow", liveTurnStartGlowArmed);
        return;
      }
    }
    btn.disabled = true;
    btn.removeAttribute("data-action");
    if (mineAct && (isVersusOpeningMulliganPhase(m) || phase === "live")) {
      btn.textContent =
        "「" + versusLocalDualRoleLabel(playRole) + "」の手番（上のボタンで進行）";
    } else if (activeOp === "host" || activeOp === "guest") {
      btn.textContent =
        "「" + versusLocalDualRoleLabel(activeOp) + "」の手番待ち";
    } else {
      btn.textContent = "ターン終了して切り替え";
    }
    btn.classList.remove("btn--versus-end-glow");
  }

  function doVersusLocalDualEndTurnAndSwitch() {
    if (!versusLocalDualMatchActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    var mBefore = versusSession.remoteMatch;
    if (!canRoleActInVersus(mBefore, playRole)) {
      showToast("あなたのターンではありません");
      return;
    }
    var phaseBefore = normalizeVersusPhase(mBefore);
    if (phaseBefore !== "firstNormal" && phaseBefore !== "secondNormal") {
      showToast("通常フェイズではありません");
      return;
    }
    persistVersusLocalDualActiveBoard();
    var optimisticOk = applyOptimisticVersusTurnEndLocally(mBefore, playRole);
    if (!optimisticOk) return;
    var mAfter = versusSession.remoteMatch;
    var nextRole = mAfter && mAfter.activePlayerRole;
    if (nextRole === "host" || nextRole === "guest") {
      switchVersusLocalDualToRole(nextRole);
    }
    syncVersusLocalDualEndSwitchButton(mAfter);
    checkLocalVersusWinCondition();
    if (phaseBefore === "secondNormal" && playRole === versusSecondPlayerRole(mBefore)) {
      showToast("ライブフェイズへ。「" + versusLocalDualRoleLabel(nextRole) + "」の盤面です", {
        duration: 5000,
      });
    } else if (nextRole) {
      showToast("ターン終了。「" + versusLocalDualRoleLabel(nextRole) + "」に切り替えました", {
        duration: 4500,
      });
    }
  }

  function checkLocalVersusWinCondition() {
    if (!versusSession || state.versusMatchEnded) return;
    if (versusSession.mode !== "localDual" && versusSession.mode !== "localPractice") return;
    if (versusSession.mode === "localDual" || versusSession.mode === "localPractice") {
      persistVersusLocalDualActiveBoard();
      var evDual = evaluateVersusWinFromCounts({
        hostSuccessLiveCount: getVersusLocalDualSuccessLiveCount("host"),
        guestSuccessLiveCount: getVersusLocalDualSuccessLiveCount("guest"),
      });
      if (!evDual.winnerRole && !evDual.draw) return;
      state.versusMatchEnded = true;
      versusMatchLogSinkEnabled = false;
      clearVersusMatchLog();
      logReplay("versus-match-end", {
        summary: evDual.draw
          ? "引き分け"
          : "「" + versusLocalDualRoleLabel(evDual.winnerRole) + "」の勝利",
      });
      if (evDual.draw) {
        showToast("引き分けです（総合ルール 1.2.1）", { duration: 6000 });
        return;
      }
      var winLabel = versusLocalDualRoleLabel(evDual.winnerRole);
      showToast("「" + winLabel + "」の勝利（成功ライブ " + LIVE_WINS + " 枚）", { duration: 7000 });
    }
  }

  function updateVersusTurnGlow(remoteMatch) {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    var m = remoteMatch || versusSession.remoteMatch;
    if (!m) return;
    var phase = normalizeVersusPhase(m);
    if (phase === "live") {
      var step = getVersusLiveStep(m);
      var mine = canRoleActInVersus(m, playRole);
      liveTurnStartGlowArmed =
        mine &&
        ((step === "set" && state.liveTurnPickMode) ||
          (step === "perf" && !state.liveStatsAfterBegin && versusLiveSlotsHaveCards()) ||
          step === "successFx");
      return;
    }
    liveTurnStartGlowArmed = canRoleActInVersus(m, playRole);
    if (versusLocalDualActive()) {
      syncVersusLocalDualEndSwitchButton(m);
    }
  }

  function isVersusOpeningMulliganPhase(remoteMatch) {
    if (!remoteMatch) return false;
    var ph = normalizeVersusPhase(remoteMatch);
    return ph === "firstMulligan" || ph === "secondMulligan";
  }

  /** 後攻プレイヤーが開幕マリガンで戻すカードを選べる状態（実行順を待つ間も可） */
  function isVersusSecondPlayerMulliganPickPhase(remoteMatch) {
    if (!versusMatchPhaseActive() || !remoteMatch) return false;
    var playRole = getVersusPlayRole();
    if (!playRole) return false;
    if (!isVersusOpeningMulliganPhase(remoteMatch)) return false;
    var fp = remoteMatch.firstPlayerRole;
    if (!fp || playRole === fp) return false;
    if (hasVersusRoleCompletedOpeningMulligan(remoteMatch, playRole)) {
      return false;
    }
    if (openingMulliganExecuteUsed || versusMulliganCommitPending) return false;
    return true;
  }

  /** 手札のマリガンチェック UI を出すか */
  function isMulliganHandPickActive() {
    if (openingMulliganExecuteUsed) return false;
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      if (isVersusSecondPlayerMulliganPickPhase(versusSession.remoteMatch)) return true;
      return (
        isVersusOpeningMulliganPhase(versusSession.remoteMatch) &&
        state.awaitingTurnStart === true
      );
    }
    return state.awaitingTurnStart === true;
  }

  function syncVersusMatchBar(remoteMatch) {
    if (!versusSession) return;
    var metaEl = document.getElementById("versus-opp-board-meta");
    var turnBadge = document.getElementById("versus-turn-badge");
    var endTurnBtn = document.getElementById("btn-versus-end-turn");
    var m = remoteMatch || versusSession.remoteMatch || null;
    var mine = successLiveAreaLiveCardCount();
    var opp = Math.max(0, Math.floor(Number(state.versusOpponentSuccessLiveCount) || 0));
    if (metaEl && versusSession.mode === "localDual") {
      syncVersusLocalDualOpponentBoard();
    } else if (metaEl) {
      var fpNote = "";
      if (m && m.firstPlayerRole && versusSession.myRole) {
        fpNote =
          m.firstPlayerRole === versusSession.myRole ? " · 先攻" : " · 後攻";
      }
      var turnNote = "";
      if (m && m.status === "playing" && m.turnNumber) {
        turnNote = " · T" + m.turnNumber;
      }
      var roomNote =
        versusSession.mode === "online" && versusSession.roomCode
          ? versusSession.roomCode + " · "
          : "";
      metaEl.textContent =
        roomNote +
        versusSession.opponentName +
        " · 成功ライブ あなた " +
        mine +
        " / 相手 " +
        opp +
        "（" +
        LIVE_WINS +
        "枚）" +
        fpNote +
        turnNote;
    }
    if (
      (versusSession.mode === "online" || versusSession.mode === "localDual") &&
      m &&
      m.status === "playing" &&
      getVersusPlayRole() &&
      !state.versusMatchEnded
    ) {
      var playRoleBar = getVersusPlayRole();
      var phase = normalizeVersusPhase(m);
      var mineTurn = !!(playRoleBar && canRoleActInVersus(m, playRoleBar));
      var isLive = phase === "live";
      var flowDesc = playRoleBar ? describeVersusFlowForRole(m, playRoleBar) : "";
      if (turnBadge) {
        turnBadge.hidden = false;
        turnBadge.textContent = flowDesc
          ? flowDesc
          : isLive
            ? "ライブフェイズ"
            : mineTurn
              ? versusLocalDualActive()
                ? versusLocalDualRoleLabel(playRoleBar) + " の手番"
                : "あなたのターン"
              : versusLocalDualActive()
                ? "相手デッキの手番（切替待ち）"
                : "相手のターン（待機）";
        turnBadge.classList.toggle("versus-turn-badge--mine", mineTurn && !isLive);
        turnBadge.classList.toggle("versus-turn-badge--opp", !mineTurn && !isLive);
      }
      var showEndTurn =
        !isLive &&
        (phase === "firstNormal" || phase === "secondNormal");
      if (endTurnBtn) {
        endTurnBtn.hidden = true;
      }
      void showEndTurn;
      updateVersusTurnGlow(m);
      document.body.classList.toggle("versus-my-turn", mineTurn && !isLive);
      document.body.classList.toggle("versus-opponent-turn", !mineTurn && !isLive);
      document.body.classList.toggle("versus-live-phase", isLive);
      var oppTxt = versusOpponentLastAction(m, versusSession.myRole);
      if (metaEl && oppTxt) {
        metaEl.textContent = metaEl.textContent + " · 相手: " + oppTxt;
      }
      syncVersusPhaseLiveBanner(m);
    } else {
      if (turnBadge) turnBadge.hidden = true;
      if (endTurnBtn) endTurnBtn.hidden = versusSession.mode !== "online";
      document.body.classList.remove("versus-my-turn", "versus-opponent-turn", "versus-live-phase");
    }
    checkLocalVersusWinCondition();
  }

  function showVersusEndBanner(remoteMatch) {
    if (!versusSession || !remoteMatch || remoteMatch.status !== "ended") return;
    var u = getCurrentCloudUser();
    var myUid = u && u.uid;
    var won =
      (remoteMatch.winnerRole === "host" && versusSession.myRole === "host") ||
      (remoteMatch.winnerRole === "guest" && versusSession.myRole === "guest");
    var msg;
    if (remoteMatch.endedReason === "concede") {
      msg = won ? "相手が投了しました。あなたの勝ちです。" : "投了しました。";
    } else if (!remoteMatch.winnerRole) {
      msg = "引き分けです（総合ルール 1.2.1）。";
    } else {
      msg = won ? "あなたの勝ちです！" : "あなたの負けです。";
    }
    showToast(msg, { duration: 7000 });
    void myUid;
  }

  function applyVersusOpponentBoardFromRemote(remoteMatch) {
    if (!versusSession || versusSession.mode !== "online" || !versusSession.myRole) return;
    var oppBoard = getOpponentBoardPublic(remoteMatch, versusSession.myRole);
    var fp = fingerprintVersusPublicBoard(oppBoard);
    var oppRev = Math.max(
      0,
      Math.floor(
        Number(
          versusSession.myRole === "host" ? remoteMatch.guestBoardRev : remoteMatch.hostBoardRev,
        ) || 0,
      ),
    );
    if (fp === versusOpponentBoardFp && oppRev === versusOpponentBoardRev) return;
    versusOpponentBoardFp = fp;
    versusOpponentBoardRev = oppRev;
    var at =
      versusSession.myRole === "host" ? remoteMatch.guestBoardAt : remoteMatch.hostBoardAt;
    var oppRole = versusSession.myRole === "host" ? "guest" : "host";
    var oppUi =
      oppRole === "host" ? remoteMatch.hostEffectUi : remoteMatch.guestEffectUi;
    var effectCardNo =
      (oppUi && oppUi.cardNo) ||
      (oppRole === "host" ? remoteMatch.hostEffectCardNo : remoteMatch.guestEffectCardNo);
    var effectKind = oppUi && oppUi.kind ? oppUi.kind : null;
    renderVersusOpponentBoard(oppBoard, {
      skipMeta: true,
      opponentName: versusSession.opponentName,
      updatedAt: at || null,
      effectCardNo: effectCardNo || null,
      effectKind: effectKind,
      remoteMatch: remoteMatch,
      myRole: versusSession.myRole,
    });
    syncVersusOpponentEffectUi(remoteMatch);
  }

  function flushVersusBoardPublicSync() {
    if (!versusSession || versusSession.mode !== "online" || !versusSession.myRole) return;
    if (versusBoardSyncTimer) {
      clearTimeout(versusBoardSyncTimer);
      versusBoardSyncTimer = 0;
    }
    var livePublicMode = "hidden";
    if (isVersusLivePhase(versusSession.remoteMatch)) {
      var vStepPub = getVersusLiveStep(versusSession.remoteMatch);
      if (
        (vStepPub === "perf" || vStepPub === "judgment" || vStepPub === "successFx") &&
        versusLiveSlotsHaveCards()
      ) {
        livePublicMode = "revealed";
      } else if (vStepPub === "set") {
        livePublicMode = "set";
      } else if (state.liveStatsAfterBegin) {
        livePublicMode = "revealed";
      }
    }
    noteVersusWaitingAddsForReveal();
    var handReveal =
      versusHandRevealPending.length && Date.now() < versusHandRevealUntil
        ? versusHandRevealPending
        : [];
    var waitingReveal =
      versusWaitingRevealPending.length && Date.now() < versusWaitingRevealUntil
        ? versusWaitingRevealPending
        : [];
    var board = boardToVersusPublicFromState({
      deck: state.deck,
      hand: state.hand,
      stage: state.stage,
      liveArea: state.liveArea,
      waitingRoom: state.waitingRoom,
      resolutionArea: state.resolutionArea,
      successfulLiveArea: state.successfulLiveArea,
      energyArea: state.energyArea,
      previewScratch: state.previewScratch || [],
      turnCount: state.turnCount,
      liveRevealed: state.liveStatsAfterBegin === true,
      livePublicMode: livePublicMode,
      handReveal: handReveal,
      waitingReveal: waitingReveal,
    });
    var fp = fingerprintVersusPublicBoard(board);
    if (fp === versusBoardSyncLastFp) return;
    versusBoardSyncLastFp = fp;
    pushVersusBoardPublic(versusSession.roomCode, versusSession.myRole, board).catch(function (err) {
      console.warn("[versus] board sync failed:", err);
      showToast("盤面の同期に失敗しました: " + (err && err.message ? err.message : String(err)), {
        duration: 5000,
      });
    });
  }

  function versusOnlineActive() {
    return !!(
      versusSession &&
      versusSession.mode === "online" &&
      versusSession.remoteMatch &&
      versusSession.remoteMatch.status === "playing" &&
      !state.versusMatchEnded
    );
  }

  function versusLocalDualMatchActive() {
    return !!(
      versusSession &&
      versusSession.mode === "localDual" &&
      versusSession.remoteMatch &&
      versusSession.remoteMatch.status === "playing" &&
      !state.versusMatchEnded
    );
  }

  function versusMatchPhaseActive() {
    return versusOnlineActive() || versusLocalDualMatchActive();
  }

  function isFullVersusPlayUi() {
    return !!(
      versusSession &&
      (versusSession.mode === "online" || versusSession.mode === "localDual")
    );
  }

  function applyVersusPlayModeDefaults() {
    if (!isFullVersusPlayUi()) return;
    state.deckPileFacesDown = true;
    versusMatchLogSinkEnabled = true;
    showVersusMatchLogPanel(true);
    ensureVersusUiChrome();
    syncVersusDeckFaceLockUi();
    syncDeckToolbarButtons();
    var viewGame = document.getElementById("view-game");
    if (viewGame) viewGame.classList.add("view-game--versus");
    try {
      sessionStorage.setItem("llocg_layout_4_6_board_ratio", "1");
    } catch (_) {
      /* noop */
    }
    document.body.classList.add("layout-4-6-board-ratio");
    var layoutBtn = document.getElementById("btn-layout-16-9");
    if (layoutBtn) {
      layoutBtn.setAttribute("aria-pressed", "true");
      layoutBtn.classList.add("btn--layout-16-9-on");
    }
    if (versusSession.remoteMatch) {
      syncVersusFirstPlayerSelect(versusSession.remoteMatch);
    }
  }

  /** @returns {'host'|'guest'|null} */
  function getVersusPlayRole() {
    if (!versusSession) return null;
    if (versusSession.mode === "localDual" || versusSession.mode === "localPractice") {
      return versusSession.activeRole === "guest" ? "guest" : versusSession.activeRole === "host" ? "host" : null;
    }
    return versusSession.myRole === "guest" ? "guest" : versusSession.myRole === "host" ? "host" : null;
  }

  /** @param {'host'|'guest'} firstPlayerRole @returns {import('./versusMatch.js').VersusMatchDoc} */
  function createLocalDualRemoteMatch(firstPlayerRole) {
    var fp = firstPlayerRole === "guest" ? "guest" : "host";
    return {
      v: 1,
      rulesVersion: "1.06",
      status: "playing",
      firstPlayerRole: fp,
      activePlayerRole: fp,
      turnNumber: 1,
      versusPhase: "firstMulligan",
      hostOpeningMulliganDone: false,
      guestOpeningMulliganDone: false,
      rematchSeq: 0,
      liveStep: null,
      hostLiveSetDone: false,
      guestLiveSetDone: false,
      hostPerfDone: false,
      guestPerfDone: false,
      hostLiveComplete: false,
      guestLiveComplete: false,
      hostLivePerfScore: null,
      guestLivePerfScore: null,
      hostLiveVerdict: "none",
      guestLiveVerdict: "none",
      hostLiveHadCards: false,
      guestLiveHadCards: false,
      hostSuccessFxDone: false,
      guestSuccessFxDone: false,
      liveJudgmentOutcome: null,
      liveJudgmentSeq: 0,
      hostLastAction: null,
      guestLastAction: null,
      hostSuccessLiveCount: 0,
      guestSuccessLiveCount: 0,
    };
  }

  /** @param {'host'|'guest'} role */
  function applyLocalVersusOpeningMulliganComplete(role) {
    var data = versusSession && versusSession.remoteMatch;
    if (!data || !role) return false;
    if (!canRoleActInVersus(data, role)) return false;
    var fp = data.firstPlayerRole;
    var second = versusSecondPlayerRole(data);
    if (!fp || !second) return false;
    var actionField = role === "host" ? "hostLastAction" : "guestLastAction";
    var phase = normalizeVersusPhase(data);
    /** @type {Record<string, unknown>} */
    var patch = {};
    patch[actionField] = "マリガン完了";
    if (phase === "firstMulligan") {
      if (role !== fp) return false;
      patch.versusPhase = "secondMulligan";
      patch.activePlayerRole = second;
      if (role === "host") patch.hostOpeningMulliganDone = true;
      else patch.guestOpeningMulliganDone = true;
    } else if (phase === "secondMulligan") {
      if (role !== second) return false;
      patch.versusPhase = "firstNormal";
      patch.activePlayerRole = fp;
      if (role === "host") patch.hostOpeningMulliganDone = true;
      else patch.guestOpeningMulliganDone = true;
    } else {
      return false;
    }
    patchLocalVersusRemoteMatch(patch);
    persistVersusLocalDualBoardForRole(role);
    forceVersusLocalDualBoardSwitchToActive();
    applyVersusPhaseFromRemote(versusSession.remoteMatch);
    updateVersusTurnGlow(versusSession.remoteMatch);
    syncVersusMatchBar(versusSession.remoteMatch);
    syncVersusTurnStartButton(versusSession.remoteMatch);
    syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
    return true;
  }

  /** @param {'host'|'guest'} role */
  function applyLocalVersusLiveSetComplete(role) {
    var data = versusSession && versusSession.remoteMatch;
    if (!data || !role) return false;
    if (normalizeVersusPhase(data) !== "live" || getVersusLiveStep(data) !== "set") return false;
    if (!canRoleActInVersus(data, role)) return false;
    var fp = data.firstPlayerRole;
    var second = versusSecondPlayerRole(data);
    if (!fp || !second) return false;
    var actionField = role === "host" ? "hostLastAction" : "guestLastAction";
    var setFlag = role === "host" ? "hostLiveSetDone" : "guestLiveSetDone";
    /** @type {Record<string, unknown>} */
    var patch = {};
    patch[actionField] = "ライブセット完了";
    patch[setFlag] = true;
    if (role === fp) {
      patch.activePlayerRole = second;
    } else {
      var hostDone = role === "host" ? true : data.hostLiveSetDone === true;
      var guestDone = role === "guest" ? true : data.guestLiveSetDone === true;
      if (hostDone && guestDone) {
        patch.liveStep = "perf";
        patch.activePlayerRole = fp;
      } else if (fp) {
        patch.activePlayerRole = fp;
      }
    }
    patchLocalVersusRemoteMatch(patch);
    applyVersusPhaseFromRemote(versusSession.remoteMatch);
    updateVersusTurnGlow(versusSession.remoteMatch);
    syncVersusMatchBar(versusSession.remoteMatch);
    forceVersusLocalDualBoardSwitchToActive();
    syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
    return true;
  }

  /** @param {'host'|'guest'} role @param {number} liveScore */
  function applyLocalVersusLivePerfComplete(role, liveScore) {
    var data = versusSession && versusSession.remoteMatch;
    if (!data || !role) return false;
    if (normalizeVersusPhase(data) !== "live" || getVersusLiveStep(data) !== "perf") return false;
    if (!canRoleActInVersus(data, role)) return false;
    var fp = data.firstPlayerRole;
    var second = versusSecondPlayerRole(data);
    if (!fp || !second) return false;
    var actionField = role === "host" ? "hostLastAction" : "guestLastAction";
    var perfFlag = role === "host" ? "hostPerfDone" : "guestPerfDone";
    var scoreField = role === "host" ? "hostLivePerfScore" : "guestLivePerfScore";
    var verdictField = role === "host" ? "hostLiveVerdict" : "guestLiveVerdict";
    var hadField = role === "host" ? "hostLiveHadCards" : "guestLiveHadCards";
    var liveMeta = captureVersusLiveVerdictMeta();
    /** @type {Record<string, unknown>} */
    var patch = {};
    patch[actionField] = "パフォーマンス完了";
    patch[perfFlag] = true;
    patch[scoreField] = Math.max(0, Math.floor(Number(liveScore) || 0));
    patch[verdictField] = liveMeta.verdict;
    patch[hadField] = liveMeta.hadCards === true;
    if (role === fp) {
      patch.activePlayerRole = second;
    } else if (role === second) {
      patch.liveStep = "successFx";
      patch.activePlayerRole = fp;
      patch.hostPerfDone = true;
      patch.guestPerfDone = true;
      patch.hostSuccessFxDone = false;
      patch.guestSuccessFxDone = false;
    }
    patchLocalVersusRemoteMatch(patch);
    applyVersusPhaseFromRemote(versusSession.remoteMatch);
    updateVersusTurnGlow(versusSession.remoteMatch);
    syncVersusMatchBar(versusSession.remoteMatch);
    forceVersusLocalDualBoardSwitchToActive();
    syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
    return true;
  }

  /** @param {'host'|'guest'} role */
  function applyLocalVersusSuccessFxDone(role) {
    var data = versusSession && versusSession.remoteMatch;
    if (!data || !role) return false;
    if (normalizeVersusPhase(data) !== "live" || getVersusLiveStep(data) !== "successFx") return false;
    if (!canRoleActInVersus(data, role)) return false;
    var fp = data.firstPlayerRole;
    var second = versusSecondPlayerRole(data);
    if (!fp || !second) return false;
    var actionField = role === "host" ? "hostLastAction" : "guestLastAction";
    var fxFlag = role === "host" ? "hostSuccessFxDone" : "guestSuccessFxDone";
    /** @type {Record<string, unknown>} */
    var patch = {};
    patch[actionField] = "成功時効果 完了";
    patch[fxFlag] = true;
    if (role === fp) {
      patch.activePlayerRole = second;
    } else {
      var hostFx = role === "host" ? true : data.hostSuccessFxDone === true;
      var guestFx = role === "guest" ? true : data.guestSuccessFxDone === true;
      if (hostFx && guestFx) {
        var afterFx = Object.assign({}, data, patch, {
          hostSuccessFxDone: true,
          guestSuccessFxDone: true,
        });
        if (applyVersusLiveJudgmentSkipToNextTurnPatch(patch, afterFx, fp)) {
          /* skip judgment phase */
        } else {
          patch.liveStep = "judgment";
          patch.activePlayerRole = fp;
        }
      } else if (fp) {
        patch.activePlayerRole = fp;
      }
    }
    patchLocalVersusRemoteMatch(patch);
    applyVersusPhaseFromRemote(versusSession.remoteMatch);
    updateVersusTurnGlow(versusSession.remoteMatch);
    syncVersusMatchBar(versusSession.remoteMatch);
    forceVersusLocalDualBoardSwitchToActive();
    syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
    return true;
  }

  /**
   * 両者未ライブ／両者失敗時は勝敗判定フェイズを飛ばして次ターンへ
   * @param {Record<string, unknown>} patch
   * @param {import('./versusMatch.js').VersusMatchDoc} matchPreview
   * @param {'host'|'guest'|null} fp
   */
  function applyVersusLiveJudgmentSkipToNextTurnPatch(patch, matchPreview, fp) {
    var resolved = resolveVersusLiveJudgmentOutcome(matchPreview);
    if (resolved.kind !== "skip") return false;
    patch.versusPhase = "firstNormal";
    patch.liveStep = null;
    patch.activePlayerRole = fp || matchPreview.activePlayerRole;
    patch.hostLiveSetDone = false;
    patch.guestLiveSetDone = false;
    patch.hostPerfDone = false;
    patch.guestPerfDone = false;
    patch.hostLiveComplete = false;
    patch.guestLiveComplete = false;
    patch.hostLivePerfScore = null;
    patch.guestLivePerfScore = null;
    patch.hostLiveVerdict = "none";
    patch.guestLiveVerdict = "none";
    patch.hostLiveHadCards = false;
    patch.guestLiveHadCards = false;
    patch.hostSuccessFxDone = false;
    patch.guestSuccessFxDone = false;
    patch.liveJudgmentOutcome = null;
    patch.turnNumber = Math.max(1, Math.floor(Number(matchPreview.turnNumber) || 1)) + 1;
    return true;
  }

  function maybeSkipVersusLiveJudgmentPhase(remoteMatch) {
    if (!remoteMatch || getVersusLiveStep(remoteMatch) !== "judgment") return false;
    if (remoteMatch.liveJudgmentOutcome) return false;
    var resolved = resolveVersusLiveJudgmentOutcome(remoteMatch);
    if (resolved.kind !== "skip") return false;
    if (versusJudgmentFinishTimer) {
      clearTimeout(versusJudgmentFinishTimer);
      versusJudgmentFinishTimer = 0;
    }
    resetVersusLocalLiveHandoff();
    if (versusLocalDualMatchActive()) {
      applyLocalVersusLiveJudgmentFinish();
      forceVersusLocalDualBoardSwitchToActive();
      showToast("ライブ勝敗判定を省略しました（ライブ未実施または両者失敗）");
      render();
      return true;
    }
    if (versusSession.roomCode && versusSession.myRole === "host") {
      finishVersusLiveJudgment(versusSession.roomCode)
        .then(function () {
          showToast("ライブ勝敗判定を省略しました（ライブ未実施または両者失敗）");
          render();
        })
        .catch(function (err) {
          console.warn("[versus] skip judgment finish:", err);
        });
      return true;
    }
    return false;
  }

  function applyLocalVersusLiveJudgmentCommit() {
    var data = versusSession && versusSession.remoteMatch;
    if (!data) return;
    if (normalizeVersusPhase(data) !== "live" || getVersusLiveStep(data) !== "judgment") return;
    if (data.liveJudgmentOutcome) return;
    var resolved = resolveVersusLiveJudgmentOutcome(data);
    if (resolved.kind === "skip" || resolved.kind === "pending") return;
    /** @type {'hostWin'|'guestWin'|'draw'} */
    var outcome =
      resolved.kind === "outcome" || resolved.kind === "scores" ? resolved.outcome : "draw";
    var seq = Math.max(0, Math.floor(Number(data.liveJudgmentSeq) || 0)) + 1;
    patchLocalVersusRemoteMatch({
      liveJudgmentOutcome: outcome,
      liveJudgmentSeq: seq,
    });
    applyVersusPhaseFromRemote(versusSession.remoteMatch);
  }

  function applyLocalVersusLiveJudgmentFinish() {
    var data = versusSession && versusSession.remoteMatch;
    if (!data) return;
    if (normalizeVersusPhase(data) !== "live" || getVersusLiveStep(data) !== "judgment") return;
    if (!data.liveJudgmentOutcome) return;
    var fp = data.firstPlayerRole;
    patchLocalVersusRemoteMatch({
      versusPhase: "firstNormal",
      liveStep: null,
      activePlayerRole: fp || data.activePlayerRole,
      hostLiveSetDone: false,
      guestLiveSetDone: false,
      hostPerfDone: false,
      guestPerfDone: false,
      hostLiveComplete: false,
      guestLiveComplete: false,
      hostLivePerfScore: null,
      guestLivePerfScore: null,
      hostLiveVerdict: "none",
      guestLiveVerdict: "none",
      hostLiveHadCards: false,
      guestLiveHadCards: false,
      hostSuccessFxDone: false,
      guestSuccessFxDone: false,
      liveJudgmentOutcome: null,
      liveJudgmentSeq: 0,
      turnNumber: Math.max(1, Math.floor(Number(data.turnNumber) || 1)) + 1,
    });
    versusJudgmentAppliedSeq = -1;
    applyVersusPhaseFromRemote(versusSession.remoteMatch);
    updateVersusTurnGlow(versusSession.remoteMatch);
    syncVersusMatchBar(versusSession.remoteMatch);
    forceVersusLocalDualBoardSwitchToActive();
    syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
  }

  var versusLastHandledBoardRequestId = "";
  var versusApprovalDialogOpenFor = "";

  var VERSUS_SENSITIVE_ACTION_LABELS = {
    undo: "ひとつ戻る",
    redo: "ひとつ進む",
    deck_face_up: "山札を表向きにする",
    res_deck_top: "デッキ上に戻す",
    res_deck_shuffle: "戻してシャッフル",
  };

  function syncVersusDeckFaceLockUi() {
    var btn = $("btn-deck-face");
    if (!btn) return;
    if (versusMatchPhaseActive()) {
      state.deckPileFacesDown = true;
      btn.disabled = true;
      btn.title = "対戦中は山札は常に裏向き（表向きにするには相手の承認が必要）";
    } else {
      btn.disabled = false;
      btn.title = "";
    }
  }

  /** @param {*} inst @param {string} kind @param {string} [bodyPlain] @param {string} [title] */
  function pushLocalVersusEffectUi(inst, kind, bodyPlain, title) {
    if (!versusOnlineActive() || !versusSession.myRole || !inst) return;
    var mc = mergedCatalogCard(inst);
    if (!mc || !mc.card_no) return;
    pushVersusEffectUi(versusSession.roomCode, versusSession.myRole, {
      cardNo: String(mc.card_no),
      instId: inst.id != null ? String(inst.id) : null,
      kind: kind,
      title:
        title ||
        formatAbilityEffectDialogTitle(inst, kind),
      bodyPlain: bodyPlain || abilityPlainText(mc) || "",
    }).catch(function () {
      /* noop */
    });
  }

  function clearLocalVersusEffectUi() {
    if (!versusOnlineActive() || !versusSession.myRole) return;
    clearVersusEffectHighlight(versusSession.roomCode, versusSession.myRole).catch(function () {
      /* noop */
    });
  }

  var versusOppEffectMirrorFp = "";

  function syncVersusOpponentEffectMirrorDialog(remoteMatch) {
    var dlg = document.getElementById("dlg-versus-opp-effect");
    var body = document.getElementById("dlg-versus-opp-effect-body");
    var titleEl = document.getElementById("dlg-versus-opp-effect-title");
    if (!dlg || !body || typeof dlg.showModal !== "function") return;
    if (!versusOnlineActive() || !versusSession.myRole || !remoteMatch) {
      versusOppEffectMirrorFp = "";
      try {
        dlg.close();
      } catch (_) {}
      return;
    }
    var oppRole = versusSession.myRole === "host" ? "guest" : "host";
    var ui =
      oppRole === "host" ? remoteMatch.hostEffectUi : remoteMatch.guestEffectUi;
    var last =
      oppRole === "host" ? remoteMatch.hostLastAction : remoteMatch.guestLastAction;
    if (!ui || !ui.cardNo || !last || String(last).indexOf("効果") < 0) {
      versusOppEffectMirrorFp = "";
      try {
        dlg.close();
      } catch (_) {}
      return;
    }
    var fp =
      String(ui.cardNo) +
      ":" +
      String(ui.kind || "") +
      ":" +
      String(ui.instId || "") +
      ":" +
      String(last);
    if (versusOppEffectMirrorFp === fp && dlg.open) return;
    versusOppEffectMirrorFp = fp;
    var oppName = versusOpponentLabel(remoteMatch, versusSession.myRole);
    if (titleEl) {
      titleEl.textContent =
        oppName + " — " + (ui.title || abilityKindLabel(ui.kind) || "効果の処理");
    }
    body.textContent = ui.bodyPlain || "（テキストなし）";
    if (ui.kind === "kidou") {
      try {
        dlg.close();
      } catch (_) {}
      showToast(oppName + "が起動効果を処理中", { duration: 3200 });
      return;
    }
    if (!dlg.open) {
      try {
        dlg.showModal();
      } catch (_) {}
    }
  }

  function ensureVersusActionApproveDialogWired() {
    var dlg = document.getElementById("dlg-versus-action-approve");
    if (!dlg || dlg.dataset.llocgApproveWired === "1") return;
    dlg.dataset.llocgApproveWired = "1";
    var btnYes = document.getElementById("dlg-versus-action-approve-yes");
    var btnNo = document.getElementById("dlg-versus-action-approve-no");
    function closeDlg() {
      try {
        dlg.close();
      } catch (_) {}
      versusApprovalDialogOpenFor = "";
    }
    if (btnYes) {
      btnYes.addEventListener("click", function () {
        var reqId = dlg.dataset.pendingRequestId || "";
        if (!versusSession || !versusSession.myRole || !versusSession.roomCode) {
          closeDlg();
          return;
        }
        respondVersusBoardAction(versusSession.roomCode, versusSession.myRole, true)
          .catch(function (err) {
            showToast(String(err && err.message ? err.message : err));
          })
          .finally(closeDlg);
      });
    }
    if (btnNo) {
      btnNo.addEventListener("click", function () {
        if (!versusSession || !versusSession.myRole || !versusSession.roomCode) {
          closeDlg();
          return;
        }
        respondVersusBoardAction(versusSession.roomCode, versusSession.myRole, false)
          .catch(function (err) {
            showToast(String(err && err.message ? err.message : err));
          })
          .finally(closeDlg);
      });
    }
  }

  function openVersusActionApprovalDialog(req, remoteMatch) {
    ensureVersusActionApproveDialogWired();
    var dlg = document.getElementById("dlg-versus-action-approve");
    var lead = document.getElementById("dlg-versus-action-approve-lead");
    if (!dlg || !lead || !req || req.status !== "pending") return;
    if (versusApprovalDialogOpenFor === req.id && dlg.open) return;
    versusApprovalDialogOpenFor = req.id;
    dlg.dataset.pendingRequestId = req.id;
    var fromName =
      req.fromRole === "host"
        ? remoteMatch.hostName || "ホスト"
        : remoteMatch.guestName || "ゲスト";
    var actionLabel = VERSUS_SENSITIVE_ACTION_LABELS[req.action] || req.action;
    lead.textContent =
      fromName +
      " が「" +
      actionLabel +
      "」ボタンを使用しました。許可しますか？";
    try {
      dlg.showModal();
    } catch (_) {}
  }

  function executeVersusApprovedBoardAction(action) {
    if (action === "undo") {
      doUndoCore();
      return;
    }
    if (action === "redo") {
      doRedoCore();
      return;
    }
    if (action === "deck_face_up") {
      pushHistoryBefore("deck-face-toggle");
      state.deckPileFacesDown = false;
      render();
      showToast("山札を表向きにしました（相手の承認済み）");
      return;
    }
    if (action === "res_deck_top") {
      executeResToDeckTopCore();
      return;
    }
    if (action === "res_deck_shuffle") {
      executeResDeckShuffleCore();
    }
  }

  function syncVersusBoardActionRequest(remoteMatch) {
    if (!versusOnlineActive() || !versusSession.myRole || !remoteMatch) return;
    var req = remoteMatch.boardActionRequest;
    if (!req || !req.id) return;
    var myRole = versusSession.myRole;
    if (req.fromRole === myRole) {
      if (req.id === versusLastHandledBoardRequestId) return;
      if (req.status === "approved") {
        versusLastHandledBoardRequestId = req.id;
        executeVersusApprovedBoardAction(req.action);
        clearVersusBoardActionRequest(versusSession.roomCode).catch(function () {
          /* noop */
        });
      } else if (req.status === "denied") {
        versusLastHandledBoardRequestId = req.id;
        showToast("相手が操作を拒否しました");
        clearVersusBoardActionRequest(versusSession.roomCode).catch(function () {
          /* noop */
        });
      }
      return;
    }
    if (req.status === "pending") {
      openVersusActionApprovalDialog(req, remoteMatch);
    }
  }

  /**
   * @param {import('./versusMatch.js').VersusBoardActionRequest['action']} action
   * @param {() => void} localExecute
   */
  function runVersusSensitiveBoardAction(action, localExecute) {
    if (!versusOnlineActive() || !versusSession.myRole || !versusSession.roomCode) {
      localExecute();
      return;
    }
    requestVersusBoardAction(versusSession.roomCode, versusSession.myRole, action)
      .then(function () {
        showToast("相手の承認を待っています…", { duration: 4500 });
      })
      .catch(function (err) {
        showToast(String(err && err.message ? err.message : err));
      });
  }

  function versusBlocksFreePlay() {
    if (!versusSession || !versusSession.remoteMatch || state.versusMatchEnded) return false;
    if (versusSession.mode === "online" && versusSession.myRole) {
      return !canRoleActInVersus(versusSession.remoteMatch, versusSession.myRole);
    }
    if (versusSession.mode === "localDual") {
      var playRole = getVersusPlayRole();
      if (!playRole) return false;
      return !canRoleActInVersus(versusSession.remoteMatch, playRole);
    }
    return false;
  }

  function versusBlocksFreePlayToast() {
    if (!versusBlocksFreePlay()) return false;
    showToast(
      versusLocalDualActive()
        ? "相手デッキの手番です。操作できません。"
        : "相手のターンです。操作できません。",
    );
    return true;
  }

  function ensureVersusOverlayChrome() {
    ensureVersusUiChrome();
    var viewGame = document.getElementById("view-game");
    if (!document.getElementById("versus-concede-overlay") && viewGame) {
      var concede = document.createElement("div");
      concede.id = "versus-concede-overlay";
      concede.className = "versus-concede-overlay";
      concede.hidden = true;
      concede.setAttribute("aria-live", "assertive");
      var concedeP = document.createElement("p");
      concedeP.className = "versus-concede-overlay__text";
      concedeP.textContent = "投了が選択されました";
      concede.appendChild(concedeP);
      viewGame.appendChild(concede);
    }
    if (!document.getElementById("versus-opp-action-feed") && viewGame) {
      var feed = document.createElement("div");
      feed.id = "versus-opp-action-feed";
      feed.className = "versus-opp-action-feed";
      feed.hidden = true;
      feed.setAttribute("aria-live", "polite");
      viewGame.appendChild(feed);
    }
    if (!document.getElementById("versus-turn-end-overlay") && viewGame) {
      var turnEnd = document.createElement("div");
      turnEnd.id = "versus-turn-end-overlay";
      turnEnd.className = "versus-turn-end-overlay";
      turnEnd.hidden = true;
      turnEnd.setAttribute("aria-live", "assertive");
      var turnEndP = document.createElement("p");
      turnEndP.className = "versus-turn-end-overlay__text";
      turnEndP.textContent = "ターン終了";
      turnEnd.appendChild(turnEndP);
      viewGame.appendChild(turnEnd);
    }
  }

  var versusTurnEndOverlayTimer = 0;

  function showVersusTurnEndOverlay() {
    ensureVersusOverlayChrome();
    var el = document.getElementById("versus-turn-end-overlay");
    if (!el) return;
    el.hidden = false;
    if (versusTurnEndOverlayTimer) {
      clearTimeout(versusTurnEndOverlayTimer);
      versusTurnEndOverlayTimer = 0;
    }
    versusTurnEndOverlayTimer = window.setTimeout(function () {
      versusTurnEndOverlayTimer = 0;
      if (el) el.hidden = true;
    }, 3200);
  }

  function maybeShowVersusTurnEndFromRemote(remoteMatch) {
    if (!versusOnlineActive() || !remoteMatch) return;
    var hostAct = String(remoteMatch.hostLastAction || "");
    var guestAct = String(remoteMatch.guestLastAction || "");
    if (!versusTurnEndFeedPrimed) {
      versusTurnEndFeedPrimed = true;
      versusLastHostAction = hostAct;
      versusLastGuestAction = guestAct;
      return;
    }
    var myRole = versusSession.myRole;
    var oppAct = myRole === "host" ? guestAct : hostAct;
    var lastOppAct = myRole === "host" ? versusLastGuestAction : versusLastHostAction;
    versusLastHostAction = hostAct;
    versusLastGuestAction = guestAct;
    if (oppAct === "ターン終了" && lastOppAct !== "ターン終了") {
      showVersusTurnEndOverlay();
    }
  }

  function ensureVersusLiveScoreOverlayChrome() {
    ensureVersusOverlayChrome();
    var viewGame = document.getElementById("view-game");
    if (!viewGame) return;
    if (!document.getElementById("versus-live-score-overlay")) {
      var ov = document.createElement("div");
      ov.id = "versus-live-score-overlay";
      ov.className = "versus-live-score-overlay";
      ov.hidden = true;
      ov.setAttribute("aria-live", "assertive");
      var p = document.createElement("p");
      p.className = "versus-live-score-overlay__text";
      p.textContent = "";
      ov.appendChild(p);
      viewGame.appendChild(ov);
    }
    if (!document.getElementById("versus-role-change-overlay")) {
      var roleOv = document.createElement("div");
      roleOv.id = "versus-role-change-overlay";
      roleOv.className = "versus-role-change-overlay";
      roleOv.hidden = true;
      roleOv.setAttribute("aria-live", "assertive");
      var roleP = document.createElement("p");
      roleP.className = "versus-role-change-overlay__text";
      roleP.textContent = "";
      roleOv.appendChild(roleP);
      viewGame.appendChild(roleOv);
    }
  }

  function showVersusLiveScoreOverlay(kind) {
    ensureVersusLiveScoreOverlayChrome();
    var el = document.getElementById("versus-live-score-overlay");
    var p = el && el.querySelector(".versus-live-score-overlay__text");
    if (!el || !p) return;
    var text = "ライブスコア相打ち";
    if (kind === "win") text = "ライブスコア勝利";
    else if (kind === "lose") text = "ライブスコア敗北";
    p.textContent = text;
    el.classList.remove(
      "versus-live-score-overlay--win",
      "versus-live-score-overlay--lose",
      "versus-live-score-overlay--draw",
    );
    if (kind === "win") el.classList.add("versus-live-score-overlay--win");
    else if (kind === "lose") el.classList.add("versus-live-score-overlay--lose");
    else el.classList.add("versus-live-score-overlay--draw");
    el.hidden = false;
    window.setTimeout(function () {
      if (el) el.hidden = true;
    }, 4200);
  }

  function showVersusRoleChangeOverlay(isFirst) {
    ensureVersusLiveScoreOverlayChrome();
    var el = document.getElementById("versus-role-change-overlay");
    var p = el && el.querySelector(".versus-role-change-overlay__text");
    if (!el || !p) return;
    p.textContent = isFirst ? "先行になります" : "後攻になります";
    el.hidden = false;
    if (versusRoleBannerTimer) {
      clearTimeout(versusRoleBannerTimer);
      versusRoleBannerTimer = 0;
    }
    versusRoleBannerTimer = window.setTimeout(function () {
      versusRoleBannerTimer = 0;
      if (el) el.hidden = true;
    }, 3600);
  }

  function isVersusSenkyurakuState() {
    return successLiveAreaLiveCardCount() === 2;
  }

  function computeVersusLivePerfScoreTotal() {
    try {
      var b = evaluateLiveMechanicalFulfillmentBundle();
      return Math.max(0, Math.floor(liveVerdictScorePoints(b).total || 0));
    } catch (_) {
      return 0;
    }
  }

  /** パフォーマンス完了時に記録するライブ成否（勝敗判定の省略・自動勝ち用） */
  function captureVersusLiveVerdictMeta() {
    var hadCards = versusLiveSlotsHaveCards();
    if (!hadCards) {
      return { hadCards: false, verdict: /** @type {'none'} */ ("none") };
    }
    if (state.liveStatsAfterBegin !== true) {
      return { hadCards: true, verdict: /** @type {'fail'} */ ("fail") };
    }
    if (playLiveSuccessVerdictReady()) {
      return { hadCards: true, verdict: /** @type {'success'} */ ("success") };
    }
    if (liveSimResolutionVerdictLocked()) {
      return { hadCards: true, verdict: /** @type {'fail'} */ ("fail") };
    }
    return { hadCards: true, verdict: /** @type {'none'} */ ("none") };
  }

  function versusLiveJudgmentFinishDelayMs(remoteMatch) {
    if (!remoteMatch) return 4500;
    var resolved = resolveVersusLiveJudgmentOutcome(remoteMatch);
    if (resolved.kind === "skip") return 0;
    if (resolved.kind === "outcome") return 1200;
    return 4500;
  }

  function tryAutoVersusLiveBegin(remoteMatch) {
    if (!versusOnlineActive() || !remoteMatch || !versusSession.myRole) return;
    if (getVersusLiveStep(remoteMatch) !== "perf") return;
    if (!myVersusLiveSetDone(remoteMatch)) return;
    if (state.liveTurnPickMode && !state.liveStatsAfterBegin) return;
    if (!canRoleActInVersus(remoteMatch, versusSession.myRole)) return;
    if (state.liveStatsAfterBegin) return;
    if (!versusLiveSlotsHaveCards()) return;
    var autoKey = buildVersusPhaseAutoKey(remoteMatch) + ":liveBegin";
    if (versusLiveBeginAutoKey === autoKey) return;
    versusLiveBeginAutoKey = autoKey;
    try {
      doLiveTurnBegin();
    } catch (autoBeginErr) {
      console.warn("[versus] auto live begin failed:", autoBeginErr);
    }
  }

  function versusLiveEaleDoneWithVerdict() {
    if (state.liveStatsAfterBegin !== true) return false;
    var bladeN = Math.max(0, Math.floor(sumBoardMemberBlades()));
    var resN = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
    if (bladeN > 0 && resN < bladeN) return false;
    return liveSimResolutionVerdictLocked();
  }

  function patchLocalVersusRemoteMatch(patch) {
    if (!versusSession || !versusSession.remoteMatch || !patch) return;
    versusSession.remoteMatch = Object.assign({}, versusSession.remoteMatch, patch);
  }

  /** @param {boolean} [liveSucceeded] パフォーマンス完了時に記録した成否（判定フェイズでは盤面状態がリセット済みのため） */
  function versusMigrateLiveToSuccessForJudgment(liveSucceeded) {
    var ok =
      liveSucceeded === true ||
      (liveSucceeded !== false && playLiveSuccessVerdictReady());
    if (!ok) {
      return versusMigrateLiveToWaitingForJudgment();
    }
    var moved = 0;
    if (isVersusSenkyurakuState()) return 0;
    ["left", "center", "right"].forEach(function (k) {
      var slot = state.liveArea[k];
      var kept = [];
      slot.forEach(function (c) {
        if (c.type === T_LIVE) {
          c.isRotated = false;
          c.lcWait = false;
          if (cardCannotPlaceOnSuccessLive(mergedCatalogCard(c))) {
            state.waitingRoom.push(c);
          } else {
            state.successfulLiveArea.push(c);
            moved++;
          }
        } else {
          kept.push(c);
        }
      });
      state.liveArea[k] = kept;
    });
    if (moved) clearTurnScopedPlayBonusesEverywhere();
    return moved;
  }

  function versusMigrateLiveToWaitingForJudgment() {
    var moved = 0;
    ["left", "center", "right"].forEach(function (k) {
      var slot = state.liveArea[k];
      var kept = [];
      slot.forEach(function (c) {
        if (c.type === T_LIVE) {
          c.isRotated = false;
          c.lcWait = false;
          state.waitingRoom.push(c);
          moved++;
        } else {
          kept.push(c);
        }
      });
      state.liveArea[k] = kept;
    });
    if (moved) clearTurnScopedPlayBonusesEverywhere();
    return moved;
  }

  function applyVersusLiveJudgmentForMe(remoteMatch) {
    var playRole = getVersusPlayRole();
    if (!versusMatchPhaseActive() || !remoteMatch || !playRole) return;
    var seq = Math.max(0, Math.floor(Number(remoteMatch.liveJudgmentSeq) || 0));
    if (!seq || seq <= versusJudgmentAppliedSeq) return;
    var outcome = remoteMatch.liveJudgmentOutcome;
    if (outcome !== "hostWin" && outcome !== "guestWin" && outcome !== "draw") return;
    versusJudgmentAppliedSeq = seq;
    var iWin = outcome === playRole;
    var iLose =
      (outcome === "hostWin" && playRole === "guest") ||
      (outcome === "guestWin" && playRole === "host");
    var iDraw = outcome === "draw";
    var placedBefore = successLiveAreaLiveCardCount();
    var myVerdict =
      playRole === "host" ? remoteMatch.hostLiveVerdict : remoteMatch.guestLiveVerdict;
    var mySucceeded = myVerdict === "success";
    var placed = 0;
    if (iWin) {
      placed = versusMigrateLiveToSuccessForJudgment(mySucceeded);
      showVersusLiveScoreOverlay("win");
    } else if (iLose) {
      versusMigrateLiveToWaitingForJudgment();
      showVersusLiveScoreOverlay("lose");
    } else if (iDraw) {
      placed = versusMigrateLiveToSuccessForJudgment(mySucceeded);
      showVersusLiveScoreOverlay("draw");
    }
    var judgmentSummary =
      outcome === "draw"
        ? "引き分け"
        : iWin
          ? "勝利"
          : iLose
            ? "敗北"
            : "確定";
    logReplay("versus-live-judgment", { summary: judgmentSummary });
    resetVersusLocalLiveHandoff();
    var placedAfter = successLiveAreaLiveCardCount();
    var didPlace = placedAfter > placedBefore;
    var fpBefore = remoteMatch.firstPlayerRole;
    var shouldClaimFirst = false;
    if (didPlace && versusSession.roomCode) {
      if (iWin) {
        shouldClaimFirst = true;
      } else if (iDraw) {
        var oppSlN = 0;
        if (versusDualBoardActive()) {
          var oppRoleDraw = playRole === "host" ? "guest" : "host";
          var oppSnapDraw = versusLocalDualBoards[oppRoleDraw];
          oppSlN = successLiveAreaLiveCardCount(oppSnapDraw && oppSnapDraw.successfulLiveArea);
        } else {
          var oppBoard = getOpponentBoardPublic(remoteMatch, playRole);
          oppSlN = successLiveAreaLiveCardCount(oppBoard && oppBoard.successfulLiveArea);
        }
        var oppSenkyu = oppSlN === 2;
        if (oppSenkyu && !isVersusSenkyurakuState()) {
          shouldClaimFirst = true;
        }
      }
      if (shouldClaimFirst) {
        if (versusLocalDualMatchActive()) {
          patchLocalVersusRemoteMatch({
            firstPlayerRole: playRole,
            successLiveFirstLocked: true,
          });
        } else {
          claimVersusFirstFromSuccessLive(versusSession.roomCode, playRole).catch(function () {
            /* noop */
          });
        }
      }
    }
    if (versusOnlineActive()) {
      queueVersusSuccessLivePublicSync();
      flushVersusBoardPublicSync();
    } else if (versusDualBoardActive()) {
      persistVersusLocalDualActiveBoard();
      syncVersusLocalDualOpponentBoard();
    }
    render();
    var finishDelay = versusLiveJudgmentFinishDelayMs(remoteMatch);
    if (versusLocalDualMatchActive()) {
      if (versusJudgmentFinishTimer) clearTimeout(versusJudgmentFinishTimer);
      var finishLocal = function () {
        versusJudgmentFinishTimer = 0;
        applyLocalVersusLiveJudgmentFinish();
        forceVersusLocalDualBoardSwitchToActive();
        render();
      };
      if (finishDelay <= 0) finishLocal();
      else versusJudgmentFinishTimer = window.setTimeout(finishLocal, finishDelay);
    } else if (versusSession.roomCode && versusSession.myRole === "host") {
      if (versusJudgmentFinishTimer) clearTimeout(versusJudgmentFinishTimer);
      var finishOnline = function () {
        versusJudgmentFinishTimer = 0;
        finishVersusLiveJudgment(versusSession.roomCode)
          .then(function () {
            render();
          })
          .catch(function (err) {
            console.warn("[versus] finish judgment:", err);
          });
      };
      if (finishDelay <= 0) finishOnline();
      else versusJudgmentFinishTimer = window.setTimeout(finishOnline, finishDelay);
    }
  }

  function maybeCommitVersusLiveJudgment(remoteMatch) {
    if (!versusMatchPhaseActive() || !versusSession) return;
    if (!versusLocalDualActive() && versusSession.myRole !== "host") return;
    if (!remoteMatch || getVersusLiveStep(remoteMatch) !== "judgment") return;
    if (remoteMatch.liveJudgmentOutcome) return;
    var resolved = resolveVersusLiveJudgmentOutcome(remoteMatch);
    if (resolved.kind === "skip" || resolved.kind === "pending") return;
    if (versusLocalDualMatchActive()) {
      applyLocalVersusLiveJudgmentCommit();
      return;
    }
    commitVersusLiveJudgment(versusSession.roomCode).catch(function (err) {
      console.warn("[versus] commit judgment:", err);
    });
  }

  function syncVersusFirstPlayerSelect(remoteMatch) {
    var fpSel =
      root.querySelector("#select-first-player") || document.getElementById("select-first-player");
    var playRole = getVersusPlayRole();
    if (!fpSel || !versusSession || !playRole || !remoteMatch) return;
    if (remoteMatch.status !== "playing" || !remoteMatch.firstPlayerRole) {
      fpSel.disabled = false;
      return;
    }
    fpSel.value = remoteMatch.firstPlayerRole === playRole ? "先攻" : "後攻";
    fpSel.disabled = true;
    fpSel.title = versusLocalDualActive()
      ? "一人二役対戦の先攻／後攻（操作盤面に連動）"
      : "オンライン対戦の先攻／後攻（自動同期）";
  }

  function resetLocalVersusBoardForRematch() {
    undoHistory.length = 0;
    redoHistory.length = 0;
    versusMatchUndoStack.length = 0;
    versusMatchRedoStack.length = 0;
    versusNormalAutoKey = "";
    versusMulliganUiKey = "";
    versusMulliganCommitPending = false;
    openingMulliganExecuteUsed = false;
    openingMulliganRememberedK = null;
    const deck = shuffle(buildMainDeckInstances(activePlayDeckMap));
    const hand = [];
    dealOpeningHand(deck, hand, OPENING_HAND_SIZE);
    applyBoard({
      deck: deck,
      hand: hand,
      previewScratch: [],
      deckPileOpen: false,
      deckPileFacesDown: true,
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
      playLiveStartGlowActive: false,
      playLiveYellStarted: false,
      liveScoreEffectBonus: 0,
      ealeNoteLiveHitIds: [],
      ealeNoteLiveScorePoints: 0,
      pendingDrawYellHandDraws: 0,
    });
    uid = Math.max(uid, 999);
    liveTurnStartGlowArmed = false;
    versusBoardSyncLastFp = "";
    if (versusSession) {
      versusSession._firstPlayerBannerTimer = 0;
    }
  }

  function showVersusConcedeOverlay() {
    ensureVersusOverlayChrome();
    var el = document.getElementById("versus-concede-overlay");
    if (!el) return;
    el.hidden = false;
    if (versusConcedeOverlayTimer) {
      clearTimeout(versusConcedeOverlayTimer);
      versusConcedeOverlayTimer = 0;
    }
    versusConcedeOverlayTimer = window.setTimeout(function () {
      versusConcedeOverlayTimer = 0;
      if (el) el.hidden = true;
    }, 4500);
  }

  function scheduleVersusRematchPrepIfHost(remoteMatch) {
    if (!versusSession || versusSession.mode !== "online" || versusSession.myRole !== "host") {
      return;
    }
    if (versusRematchPrepTimer) return;
    versusRematchPrepTimer = window.setTimeout(function () {
      versusRematchPrepTimer = 0;
      if (!versusSession || versusSession.mode !== "online") return;
      resetVersusMatchForNextGame(versusSession.roomCode)
        .then(function () {
          showToast("次のゲームの準備ができました（開幕マリガンから）", { duration: 6000 });
        })
        .catch(function (err) {
          showToast(String(err.message || err), { duration: 8000 });
        });
    }, 4200);
  }

  function maybeAutoVersusNormalTurnStart(remoteMatch) {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    var phase = normalizeVersusPhase(remoteMatch);
    if (phase !== "firstNormal" && phase !== "secondNormal") return;
    if (!canRoleActInVersus(remoteMatch, playRole)) return;
    var key =
      phase +
      ":" +
      String(remoteMatch.turnNumber || 1) +
      ":" +
      String(remoteMatch.activePlayerRole || "");
    if (versusNormalAutoKey === key) return;
    versusNormalAutoKey = key;
    pushHistoryBefore("versus-auto-turn-open");
    state.turnCount += 1;
    runTurnPhaseStartAfterSuccessLivePrompt();
    if (versusOnlineActive()) {
      pushVersusPublicState(versusSession.roomCode, playRole, {
        lastAction: "ターン開始（自動）",
      }).catch(function () {
        /* noop */
      });
    }
  }

  function syncVersusTurnStartButton(remoteMatch) {
    var btn = $("btn-turn-start");
    if (!btn) return;
    if (!versusMatchPhaseActive() || !remoteMatch) {
      btn.textContent = "ターン開始/次のターンへ";
      btn.classList.remove("btn--versus-end-glow");
      btn.disabled = false;
      if (versusLocalDualActive()) syncVersusLocalDualEndSwitchButton(null);
      return;
    }
    var playRole = getVersusPlayRole();
    var phase = normalizeVersusPhase(remoteMatch);
    var mineAct = !!(playRole && canRoleActInVersus(remoteMatch, playRole));
    var normalPhase = phase === "firstNormal" || phase === "secondNormal";
    if (normalPhase && mineAct) {
      btn.textContent = "ターン終了";
      btn.disabled = false;
      btn.classList.toggle("btn--versus-end-glow", liveTurnStartGlowArmed);
      btn.title = "自分の通常フェイズを終え、次のフェイズへ進みます（総合ルール 7.3）";
      if (versusLocalDualActive()) syncVersusLocalDualEndSwitchButton(remoteMatch);
      return;
    }
    if (isVersusOpeningMulliganPhase(remoteMatch)) {
      btn.textContent = "ターン開始/次のターンへ";
      btn.disabled = true;
      btn.title = "開幕マリガン中は使用できません";
      btn.classList.remove("btn--versus-end-glow");
      if (versusLocalDualActive()) syncVersusLocalDualEndSwitchButton(remoteMatch);
      return;
    }
    if (phase === "live") {
      btn.textContent = "ターン開始/次のターンへ";
      btn.disabled = true;
      btn.title = "ライブフェイズ中はライブ操作で進めてください";
      btn.classList.remove("btn--versus-end-glow");
      if (versusLocalDualActive()) syncVersusLocalDualEndSwitchButton(remoteMatch);
      return;
    }
    btn.textContent = "ターン開始/次のターンへ";
    btn.disabled = !mineAct;
    btn.classList.remove("btn--versus-end-glow");
    if (versusLocalDualActive()) syncVersusLocalDualEndSwitchButton(remoteMatch);
  }

  function syncVersusOpponentActionFeed(remoteMatch) {
    ensureVersusOverlayChrome();
    var el = document.getElementById("versus-opp-action-feed");
    if (!el || !versusSession || !remoteMatch) {
      if (el) el.hidden = true;
      return;
    }
    if (!versusOnlineActive()) {
      el.hidden = true;
      return;
    }
    var txt = versusOpponentLastAction(remoteMatch, versusSession.myRole);
    if (txt && String(txt).trim()) {
      el.textContent = "相手: " + String(txt).trim();
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function ensureVersusUiChrome() {
    if (!document.getElementById("versus-first-player-banner")) {
      var viewGame = document.getElementById("view-game");
      if (viewGame) {
        if (!viewGame.classList.contains("view-game--versus")) {
          viewGame.classList.add("view-game--versus");
        }
        var fp = document.createElement("div");
        fp.id = "versus-first-player-banner";
        fp.className = "versus-first-player-banner";
        fp.hidden = true;
        viewGame.insertBefore(fp, viewGame.firstChild);
      }
    }
    if (!document.getElementById("versus-phase-live-banner")) {
      var mount = document.getElementById("versus-phase-live-banner-mount");
      if (!mount) {
        mount = document.getElementById("mount-mobile-live-prob-inline");
      }
      if (mount) {
        var banner = document.createElement("div");
        banner.id = "versus-phase-live-banner";
        banner.className = "versus-phase-live-banner";
        banner.hidden = true;
        banner.setAttribute("aria-live", "polite");
        mount.appendChild(banner);
        mount.hidden = false;
      }
    }
    if (!document.getElementById("versus-opp-effect-label")) {
      var opp = document.getElementById("versus-opponent-board-wrap");
      if (opp) {
        var eff = document.createElement("div");
        eff.id = "versus-opp-effect-label";
        eff.className = "versus-opp-effect-label";
        eff.hidden = true;
        opp.appendChild(eff);
      }
    }
  }

  function syncVersusPhaseLiveBanner(remoteMatch) {
    ensureVersusUiChrome();
    var mount = document.getElementById("versus-phase-live-banner-mount");
    var el = document.getElementById("versus-phase-live-banner");
    if (!el || !versusMatchPhaseActive()) {
      if (el) el.hidden = true;
      if (mount) mount.hidden = true;
      return;
    }
    var m = remoteMatch || versusSession.remoteMatch;
    var playRole = getVersusPlayRole();
    var phase = normalizeVersusPhase(m);
    var mineTurn = !!(playRole && m && canRoleActInVersus(m, playRole));
    var flowDesc = playRole ? describeVersusFlowForRole(m, playRole) : "";
    el.classList.remove(
      "versus-phase-live-banner--mine",
      "versus-phase-live-banner--opp",
      "versus-phase-live-banner--live",
    );
    el.textContent = "";
    el.replaceChildren();
    if (phase === "live") {
      el.classList.add("versus-phase-live-banner--live");
      var liveUi = playRole ? buildVersusLiveStepUi(m, playRole) : null;
      if (liveUi && liveUi.steps && liveUi.steps.length) {
        var inner = document.createElement("div");
        inner.className = "versus-phase-live-banner__inner";
        var bar = document.createElement("div");
        bar.className = "versus-live-step-bar";
        bar.setAttribute("role", "list");
        bar.setAttribute("aria-label", "ライブフェイズ進行");
        liveUi.steps.forEach(function (step) {
          var chip = document.createElement("span");
          chip.className = "versus-live-step-bar__step versus-live-step-bar__step--" + (step.state || "pending");
          chip.setAttribute("role", "listitem");
          chip.textContent = step.label;
          bar.appendChild(chip);
        });
        inner.appendChild(bar);
        var hintEl = document.createElement("p");
        hintEl.className = "versus-phase-live-banner__hint";
        hintEl.textContent = liveUi.hint || flowDesc || "ライブフェイズです";
        inner.appendChild(hintEl);
        el.appendChild(inner);
      } else {
        el.textContent = flowDesc || "ライブフェイズです";
      }
      el.hidden = false;
      if (mount) mount.hidden = false;
      return;
    }
    if (mineTurn) {
      el.textContent = flowDesc || "あなたのターン中です";
      el.classList.add("versus-phase-live-banner--mine");
    } else {
      el.textContent = flowDesc || "相手のターン中です";
      el.classList.add("versus-phase-live-banner--opp");
    }
    el.hidden = false;
    if (mount) mount.hidden = false;
  }

  function showVersusFirstPlayerBanner(remoteMatch) {
    ensureVersusUiChrome();
    var el = document.getElementById("versus-first-player-banner");
    var playRole = getVersusPlayRole();
    if (!el || !versusSession || !playRole || !remoteMatch) return;
    if (remoteMatch.status !== "playing" || !remoteMatch.firstPlayerRole) {
      el.hidden = true;
      return;
    }
    var seq = Math.max(0, Math.floor(Number(remoteMatch.rematchSeq) || 0));
    if (versusFirstPlayerBannerShownForSeq === seq) return;
    versusFirstPlayerBannerShownForSeq = seq;
    var mine = remoteMatch.firstPlayerRole === playRole;
    if (versusLocalDualActive()) {
      var fpLabel = versusLocalDualRoleLabel(remoteMatch.firstPlayerRole);
      var spLabel = versusLocalDualRoleLabel(versusSecondPlayerRole(remoteMatch));
      el.textContent = mine
        ? "「" + fpLabel + "」が先攻です"
        : "「" + spLabel + "」が後攻です";
    } else {
      el.textContent = mine ? "あなたは先攻です" : "あなたは後攻です";
    }
    el.classList.toggle("versus-first-player-banner--first", mine);
    el.classList.toggle("versus-first-player-banner--second", !mine);
    el.hidden = false;
    if (versusSession._firstPlayerBannerTimer) {
      clearTimeout(versusSession._firstPlayerBannerTimer);
      versusSession._firstPlayerBannerTimer = 0;
    }
    versusSession._firstPlayerBannerTimer = window.setTimeout(function () {
      versusSession._firstPlayerBannerTimer = 0;
      var b = document.getElementById("versus-first-player-banner");
      if (b) b.hidden = true;
    }, 6500);
  }

  function syncVersusOpponentEffectUi(remoteMatch) {
    ensureVersusUiChrome();
    var label = document.getElementById("versus-opp-effect-label");
    if (!label || !versusSession || !remoteMatch) return;
    var oppRole = versusSession.myRole === "host" ? "guest" : "host";
    var cardNo =
      oppRole === "host" ? remoteMatch.hostEffectCardNo : remoteMatch.guestEffectCardNo;
    var last =
      oppRole === "host" ? remoteMatch.hostLastAction : remoteMatch.guestLastAction;
    if (cardNo && last && String(last).indexOf("効果") >= 0) {
      label.textContent = "効果発動";
      label.hidden = false;
    } else {
      label.hidden = true;
    }
  }

  function versusLiveSlotsHaveCards() {
    return ["left", "center", "right"].some(function (k) {
      var arr = state.liveArea[k];
      return arr && arr.length > 0;
    });
  }

  /** 自分が「セット完了」を押してリモートに反映済みか */
  function myVersusLiveSetDone(remoteMatch) {
    if (!remoteMatch || !versusSession || !versusSession.myRole) return false;
    return versusSession.myRole === "host"
      ? remoteMatch.hostLiveSetDone === true
      : remoteMatch.guestLiveSetDone === true;
  }

  function resetVersusLocalLiveHandoff() {
    state.liveStatsAfterBegin = false;
    state.liveTurnPickMode = false;
    state.liveTurnSelectedIds = [];
    state.liveTurnHandSpreadPick = false;
    state.playLiveYellStarted = false;
    state.playLiveStartGlowActive = false;
    state.liveBladeManualAdjust = 0;
    clearLiveSuccessEffectSchedule();
    lastLiveSuccessOrchestrateFp = "";
    versusSuccessFxOrchestrateKey = "";
    versusSuccessFxAutoSkipKey = "";
  }

  function doVersusLiveSetDone() {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    var m = versusSession.remoteMatch;
    if (getVersusLiveStep(m) !== "set" || !canRoleActInVersus(m, playRole)) {
      showToast("あなたのライブカードセット順番ではありません");
      return;
    }
    endVersusLiveSetComplete();
  }

  function endVersusLiveSetComplete() {
    var hadVerdictBefore = versusLiveEaleDoneWithVerdict();
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    if (versusLocalDualMatchActive()) {
      persistVersusLocalDualActiveBoard();
      var mineSecond = !!(versusSecondPlayerRole(versusSession.remoteMatch) === playRole);
      if (applyLocalVersusLiveSetComplete(playRole)) {
        state.liveTurnPickMode = false;
        state.liveTurnSelectedIds = [];
        logReplay("versus-live-set-done", {
          roleLabel: versusLocalDualRoleLabel(playRole),
        });
        var m = versusSession.remoteMatch;
        var fp = m && m.firstPlayerRole;
        if (mineSecond && fp && versusBothLiveSetDone(m)) {
          if (hadVerdictBefore) {
            showToast("セット完了。先攻のパフォーマンスフェイズへ");
          } else {
            showToast("ライブカードセット完了。先攻のパフォーマンスへ");
          }
          forceVersusLocalDualBoardSwitchToActive();
        } else if (mineSecond) {
          showToast("ライブカードセットを完了しました");
          forceVersusLocalDualBoardSwitchToActive();
        } else {
          showToast("ライブカードセットを完了しました（後攻のセットへ）");
          forceVersusLocalDualBoardSwitchToActive();
        }
        render();
      }
      return;
    }
    reportVersusLiveSetComplete(versusSession.roomCode, playRole)
      .then(function () {
        state.liveTurnPickMode = false;
        state.liveTurnSelectedIds = [];
        logReplay("versus-live-set-done", {
          roleLabel: versusSession.myRole === "host" ? "ホスト" : "ゲスト",
        });
        var m = versusSession.remoteMatch;
        var fp = m && m.firstPlayerRole;
        var second = m ? versusSecondPlayerRole(m) : null;
        var mineSecond = !!(second && playRole === second);
        if (mineSecond && fp) {
          patchLocalVersusRemoteMatch({
            guestLiveSetDone: playRole === "guest" ? true : m.guestLiveSetDone,
            hostLiveSetDone: playRole === "host" ? true : m.hostLiveSetDone,
          });
          if (versusBothLiveSetDone(versusSession.remoteMatch)) {
            patchLocalVersusRemoteMatch({
              liveStep: "perf",
              activePlayerRole: fp,
            });
            if (hadVerdictBefore) {
              showToast("セット完了。先攻のパフォーマンスフェイズへ");
            } else {
              showToast("ライブカードセット完了。先攻のパフォーマンスへ");
            }
            applyVersusPhaseFromRemote(versusSession.remoteMatch);
            tryAutoVersusLiveBegin(versusSession.remoteMatch);
          } else {
            showToast("ライブカードセットを完了しました（先攻のセットを待機）");
          }
        } else {
          showToast("ライブカードセットを完了しました（相手のセットを待機）");
        }
        render();
      })
      .catch(function (err) {
        showToast(String(err.message || err));
      });
  }

  function doVersusLivePerfDone() {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    if (!state.liveStatsAfterBegin && versusLiveSlotsHaveCards()) {
      showToast("「ライブ開始」を押してからパフォーマンス完了してください");
      return;
    }
    var m = versusSession.remoteMatch;
    if (getVersusLiveStep(m) !== "perf" || !canRoleActInVersus(m, playRole)) {
      showToast("あなたのパフォーマンス順番ではありません");
      return;
    }
    var perfScore = computeVersusLivePerfScoreTotal();
    var liveMeta = captureVersusLiveVerdictMeta();
    if (versusLocalDualMatchActive()) {
      persistVersusLocalDualActiveBoard();
      if (applyLocalVersusLivePerfComplete(playRole, perfScore)) {
        resetVersusLocalLiveHandoff();
        logReplay("versus-live-perf-done", {
          roleLabel: versusLocalDualRoleLabel(playRole),
          score: perfScore,
        });
        showToast("パフォーマンスを完了しました（スコア " + perfScore + "）");
        forceVersusLocalDualBoardSwitchToActive();
        render();
      }
      return;
    }
    reportVersusLivePerfComplete(versusSession.roomCode, playRole, perfScore, liveMeta)
      .then(function () {
        resetVersusLocalLiveHandoff();
        logReplay("versus-live-perf-done", {
          roleLabel: versusSession.myRole === "host" ? "ホスト" : "ゲスト",
          score: perfScore,
        });
        showToast("パフォーマンスを完了しました（スコア " + perfScore + "）");
        render();
      })
      .catch(function (err) {
        showToast(String(err.message || err));
      });
  }

  function doVersusSuccessFxDone() {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    var m = versusSession.remoteMatch;
    if (getVersusLiveStep(m) !== "successFx" || !canRoleActInVersus(m, playRole)) {
      showToast("ライブ成功時効果の処理順番ではありません");
      return;
    }
    if (versusLocalDualMatchActive()) {
      persistVersusLocalDualActiveBoard();
      if (applyLocalVersusSuccessFxDone(playRole)) {
        resetVersusLocalLiveHandoff();
        openingMulliganExecuteUsed = true;
        state.awaitingTurnStart = false;
        showToast("ライブ成功時効果を完了しました");
        forceVersusLocalDualBoardSwitchToActive();
        render();
      }
      return;
    }
    reportVersusSuccessFxDone(versusSession.roomCode, playRole)
      .then(function () {
        resetVersusLocalLiveHandoff();
        openingMulliganExecuteUsed = true;
        state.awaitingTurnStart = false;
        showToast("ライブフェイズを終了しました。次のターンへ");
        render();
      })
      .catch(function (err) {
        showToast(String(err.message || err));
      });
  }

  function applyVersusPhaseFromRemote(remoteMatch) {
    if (
      !versusSession ||
      (versusSession.mode !== "online" && versusSession.mode !== "localDual") ||
      versusBootstrapping ||
      !remoteMatch ||
      remoteMatch.status !== "playing"
    ) {
      return;
    }
    if (versusLocalDualActive()) {
      forceVersusLocalDualBoardSwitchToActive();
    }
    var playRole = getVersusPlayRole();
    var phase = normalizeVersusPhase(remoteMatch);
    var liveStep = getVersusLiveStep(remoteMatch);
    var mineAct = !!(playRole && canRoleActInVersus(remoteMatch, playRole));
    var fp = remoteMatch.firstPlayerRole;
    var mineFirst = !!(fp && playRole === fp);
    var myMulliganDone =
      playRole && hasVersusRoleCompletedOpeningMulligan(remoteMatch, playRole);

    if (phase === "firstMulligan" || phase === "secondMulligan") {
      var mullKey = phase + ":" + String(remoteMatch.activePlayerRole || "");
      if (mullKey !== versusMulliganUiKey) {
        versusMulliganUiKey = mullKey;
        if (!versusMulliganCommitPending && !isVersusSecondPlayerMulliganPickPhase(remoteMatch)) {
          state.mulliganSelectedIds = [];
        }
      }
      if (mineAct && !myMulliganDone) {
        if (!versusMulliganCommitPending) {
          state.awaitingTurnStart = true;
          openingMulliganExecuteUsed = false;
        }
      } else {
        state.awaitingTurnStart = false;
        if (myMulliganDone) {
          openingMulliganExecuteUsed = true;
        }
      }
    } else if (phase === "firstNormal" || phase === "secondNormal") {
      versusMulliganUiKey = "";
      versusMulliganCommitPending = false;
      state.awaitingTurnStart = false;
      openingMulliganExecuteUsed = true;
      if (mineAct) {
        try {
          maybeAutoVersusNormalTurnStart(remoteMatch);
        } catch (autoTurnErr) {
          console.warn("[versus] auto turn start failed:", autoTurnErr);
        }
      }
    } else {
      versusMulliganUiKey = "";
      versusMulliganCommitPending = false;
      if (!(phase === "firstNormal" && remoteMatch.turnNumber === 1 && state.awaitingTurnStart)) {
        if (phase !== "firstNormal" || remoteMatch.turnNumber > 1) {
          state.awaitingTurnStart = false;
        }
      }
    }

    if (phase === "live") {
      var autoKey = buildVersusPhaseAutoKey(remoteMatch);
      if (liveStep === "set") {
        if (mineAct && !state.liveStatsAfterBegin) {
          if (!state.liveTurnPickMode && versusPhaseAutoKey !== autoKey) {
            versusPhaseAutoKey = autoKey;
            try {
              doLiveTurnStart();
            } catch (_) {
              /* noop */
            }
          }
        } else if (!mineAct) {
          if (state.liveTurnPickMode) {
            state.liveTurnPickMode = false;
            state.liveTurnSelectedIds = [];
          }
        }
      } else {
        versusLiveBeginAutoKey = "";
        if (state.liveTurnPickMode && !state.liveStatsAfterBegin) {
          state.liveTurnPickMode = false;
          state.liveTurnSelectedIds = [];
        }
      }
      if (liveStep === "perf" && mineAct) {
        tryAutoVersusLiveBegin(remoteMatch);
        if (state.liveStatsAfterBegin) {
          try {
            syncLiveTurnStatsPanel();
            syncLiveYellDrawButtons();
          } catch (_) {
            /* noop */
          }
        } else if (versusLiveSlotsHaveCards()) {
          liveTurnStartGlowArmed = true;
        }
      } else if (liveStep === "judgment") {
        if (!remoteMatch.liveJudgmentOutcome) {
          versusJudgmentAppliedSeq = Math.max(
            -1,
            Math.floor(Number(remoteMatch.liveJudgmentSeq) || 0) - 1,
          );
        }
        if (!maybeSkipVersusLiveJudgmentPhase(remoteMatch)) {
          maybeCommitVersusLiveJudgment(remoteMatch);
          applyVersusLiveJudgmentForMe(versusSession.remoteMatch || remoteMatch);
        }
      } else if (liveStep === "successFx") {
        if (!mineAct) {
          resetVersusLocalLiveHandoff();
        } else {
          activateLiveSuccessEffectsAfterJudge();
          versusTryAutoSkipSuccessFx(remoteMatch);
          versusTryOrchestrateSuccessFx(remoteMatch);
        }
      }
    } else {
      versusLiveBeginAutoKey = "";
      versusPhaseAutoKey = "";
      if (state.liveTurnPickMode && !state.liveStatsAfterBegin) {
        state.liveTurnPickMode = false;
        state.liveTurnSelectedIds = [];
      }
    }

    syncVersusPhaseLiveBanner(remoteMatch);
    showVersusFirstPlayerBanner(remoteMatch);
    syncVersusOpponentEffectUi(remoteMatch);
    syncVersusFirstPlayerSelect(remoteMatch);
    syncVersusTurnStartButton(remoteMatch);
    syncVersusLocalDualEndSwitchButton(remoteMatch);
    syncVersusOpponentActionFeed(remoteMatch);
    versusTryAutoSkipSuccessFx(remoteMatch);
    versusTryOrchestrateSuccessFx(remoteMatch);
    if (versusLocalDualActive()) {
      maybeSyncVersusLocalDualActiveRoleFromMatch();
    }
  }

  function doVersusMulliganExecuteClick() {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    if (state.versusMatchEnded) return;
    var m = versusSession.remoteMatch;
    if (!isVersusOpeningMulliganPhase(m)) {
      showToast("開幕マリガンフェイズではありません");
      return;
    }
    if (versusLocalDualMatchActive()) {
      forceVersusLocalDualBoardSwitchToActive();
      playRole = getVersusPlayRole();
    }
    if (!playRole || !canRoleActInVersus(m, playRole)) {
      showToast("手番のプレイヤー盤面でマリガン実行してください");
      return;
    }
    if (!state.awaitingTurnStart || openingMulliganExecuteUsed || versusMulliganCommitPending) return;
    versusMulliganCommitPending = true;
    doMulliganExecute({ deferOpeningMulliganUsedFlag: versusLocalDualMatchActive() });
    if (versusLocalDualMatchActive()) {
      persistVersusLocalDualBoardForRole(playRole);
      var ok = applyLocalVersusOpeningMulliganComplete(playRole);
      versusMulliganCommitPending = false;
      if (ok) {
        var mAfter = versusSession.remoteMatch;
        var phAfter = mAfter ? normalizeVersusPhase(mAfter) : "";
        if (phAfter === "firstMulligan" || phAfter === "secondMulligan") {
          /* applyVersusPhaseFromRemote で次の手番の UI を設定済み */
        } else {
          openingMulliganExecuteUsed = true;
          state.awaitingTurnStart = false;
        }
        var nextLabel =
          mAfter && mAfter.activePlayerRole
            ? versusLocalDualRoleLabel(mAfter.activePlayerRole)
            : "";
        if (phAfter === "firstNormal") {
          showToast("開幕マリガン完了。先攻の通常ターンです", { duration: 5000 });
        } else if (phAfter === "secondMulligan" && nextLabel) {
          showToast("先攻のマリガン完了。「" + nextLabel + "」のマリガンです", { duration: 5000 });
        } else {
          showToast("マリガンを確定しました");
        }
      } else {
        openingMulliganExecuteUsed = false;
        state.awaitingTurnStart = true;
        showToast("マリガンを確定できませんでした");
      }
      render();
      return;
    }
    completeVersusOpeningMulligan(versusSession.roomCode, playRole)
      .then(function () {
        versusMulliganCommitPending = false;
        openingMulliganExecuteUsed = true;
        state.awaitingTurnStart = false;
        showToast("マリガンを確定しました");
        render();
      })
      .catch(function (err) {
        versusMulliganCommitPending = false;
        openingMulliganExecuteUsed = false;
        state.awaitingTurnStart = true;
        showToast(String(err.message || err));
        render();
      });
  }

  /** @param {import('./versusMatch.js').VersusMatchDoc} mBefore @param {import('./versusMatch.js').VersusRole} myRole */
  function buildOptimisticVersusTurnEndPatch(mBefore, myRole) {
    if (!mBefore || !myRole) return null;
    var phaseBefore = normalizeVersusPhase(mBefore);
    var fp = mBefore.firstPlayerRole;
    var second = versusSecondPlayerRole(mBefore);
    if (!fp || !second) return null;
    var actionField = myRole === "host" ? "hostLastAction" : "guestLastAction";
    /** @type {Record<string, unknown>} */
    var patch = {};
    patch[actionField] = "ターン終了";
    if (phaseBefore === "firstNormal") {
      if (myRole !== fp) return null;
      patch.versusPhase = "secondNormal";
      patch.activePlayerRole = second;
    } else if (phaseBefore === "secondNormal") {
      if (myRole !== second) return null;
      patch.versusPhase = "live";
      patch.liveStep = "set";
      patch.activePlayerRole = fp;
      patch.hostLiveSetDone = false;
      patch.guestLiveSetDone = false;
      patch.hostPerfDone = false;
      patch.guestPerfDone = false;
      patch.hostLiveComplete = false;
      patch.guestLiveComplete = false;
      patch.hostLivePerfScore = null;
      patch.guestLivePerfScore = null;
      patch.hostLiveVerdict = "none";
      patch.guestLiveVerdict = "none";
      patch.hostLiveHadCards = false;
      patch.guestLiveHadCards = false;
      patch.hostSuccessFxDone = false;
      patch.guestSuccessFxDone = false;
      patch.liveJudgmentOutcome = null;
      patch.liveJudgmentSeq = 0;
    } else {
      return null;
    }
    return patch;
  }

  function applyOptimisticVersusTurnEndLocally(mBefore, myRole) {
    var patch = buildOptimisticVersusTurnEndPatch(mBefore, myRole);
    if (!patch) return false;
    patchLocalVersusRemoteMatch(patch);
    versusNormalAutoKey = "";
    state.awaitingTurnStart = false;
    liveTurnStartGlowArmed = false;
    if (versusSession.remoteMatch) {
      applyVersusPhaseFromRemote(versusSession.remoteMatch);
      updateVersusTurnGlow(versusSession.remoteMatch);
      syncVersusMatchBar(versusSession.remoteMatch);
      syncVersusPhaseLiveBanner(versusSession.remoteMatch);
      syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
    }
    render();
    return true;
  }

  function doVersusEndTurnClick() {
    if (!versusMatchPhaseActive()) return;
    var playRole = getVersusPlayRole();
    if (!playRole) return;
    if (state.versusMatchEnded) return;
    var m = versusSession.remoteMatch;
    if (!canRoleActInVersus(m, playRole)) {
      showToast("あなたのターンではありません");
      return;
    }
    pushHistoryBefore("versus-turn-end");
    if (versusLocalDualMatchActive()) {
      persistVersusLocalDualActiveBoard();
      var mBeforeLocal = versusSession.remoteMatch;
      var phaseBeforeLocal = mBeforeLocal ? normalizeVersusPhase(mBeforeLocal) : "";
      var optimisticLocalOk = applyOptimisticVersusTurnEndLocally(mBeforeLocal, playRole);
      var mAfterLocal = versusSession.remoteMatch;
      var nextRoleLocal = mAfterLocal && mAfterLocal.activePlayerRole;
      if (nextRoleLocal === "host" || nextRoleLocal === "guest") {
        switchVersusLocalDualToRole(nextRoleLocal);
      } else {
        forceVersusLocalDualBoardSwitchToActive();
      }
      if (optimisticLocalOk && phaseBeforeLocal === "secondNormal" && playRole === versusSecondPlayerRole(mBeforeLocal)) {
        showToast("ライブフェイズへ。「" + versusLocalDualRoleLabel(nextRoleLocal) + "」の盤面です", {
          duration: 5000,
        });
      } else if (optimisticLocalOk && nextRoleLocal) {
        showToast("ターン終了。「" + versusLocalDualRoleLabel(nextRoleLocal) + "」に切り替えました", {
          duration: 4500,
        });
      } else if (optimisticLocalOk) {
        showToast("ターンを終了しました", { duration: 2800 });
      }
      syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
      checkLocalVersusWinCondition();
      return;
    }
    var mBefore = versusSession.remoteMatch;
    var phaseBefore = mBefore ? normalizeVersusPhase(mBefore) : "";
    var fp = mBefore && mBefore.firstPlayerRole;
    var second = mBefore ? versusSecondPlayerRole(mBefore) : null;
    var myRole = playRole;
    var optimisticOk = applyOptimisticVersusTurnEndLocally(mBefore, myRole);
    if (optimisticOk && phaseBefore === "secondNormal" && myRole === second) {
      showToast("ライブフェイズへ。先攻はライブカードセットから", { duration: 5000 });
    } else if (optimisticOk) {
      showToast("ターンを終了しました", { duration: 2800 });
    }
    endVersusTurn(versusSession.roomCode, myRole)
      .then(function () {
        if (!optimisticOk && mBefore && fp && second) {
          applyOptimisticVersusTurnEndLocally(mBefore, myRole);
        }
      })
      .catch(function (err) {
        showToast(String(err.message || err));
        if (mBefore) {
          versusSession.remoteMatch = mBefore;
          applyVersusPhaseFromRemote(mBefore);
          updateVersusTurnGlow(mBefore);
          syncVersusMatchBar(mBefore);
          render();
        }
      });
  }

  function buildVersusPhaseAutoKey(remoteMatch) {
    if (!remoteMatch) return "";
    return (
      normalizeVersusPhase(remoteMatch) +
      ":" +
      (getVersusLiveStep(remoteMatch) || "") +
      ":" +
      String(remoteMatch.activePlayerRole || "") +
      ":" +
      String(remoteMatch.turnNumber || "")
    );
  }

  function bootVersusOnlineSyncAfterMount() {
    if (!versusSession || versusSession.mode !== "online" || !versusSession.roomCode) return;
    if (versusMatchUnsub) return;
    ensureVersusActionApproveDialogWired();
    syncVersusDeckFaceLockUi();
    var oppEffClose = document.getElementById("dlg-versus-opp-effect-close");
    if (oppEffClose && oppEffClose.dataset.llocgWired !== "1") {
      oppEffClose.dataset.llocgWired = "1";
      oppEffClose.addEventListener("click", function () {
        var dlg = document.getElementById("dlg-versus-opp-effect");
        if (dlg) {
          try {
            dlg.close();
          } catch (_) {}
        }
      });
    }
    versusBootstrapping = false;
    versusLastSyncedWaitingIds = collectVersusWaitingIdSet();
    versusPhaseAutoKey = buildVersusPhaseAutoKey(versusSession.remoteMatch);
    if (versusSession.remoteMatch) {
      applyVersusPhaseFromRemote(versusSession.remoteMatch);
    }
    versusMatchUnsub = subscribeVersusMatch(versusSession.roomCode, function (remoteMatch) {
      applyRemoteVersusMatch(remoteMatch);
    });
    if (versusSession.remoteMatch) {
      syncVersusMatchBar(versusSession.remoteMatch);
      syncVersusFirstPlayerSelect(versusSession.remoteMatch);
      showVersusFirstPlayerBanner(versusSession.remoteMatch);
      syncMulliganUi();
      render();
    }
    window.setTimeout(function () {
      if (!versusSession || versusSession.mode !== "online") return;
      flushVersusBoardPublicSync();
    }, 900);
  }

  function applyRemoteVersusMatch(remoteMatch) {
    if (!versusSession || !remoteMatch) return;
    var prevMatch = versusSession.remoteMatch;
    versusSession.remoteMatch = remoteMatch;
    syncVersusFirstPlayerSelect(remoteMatch);

    var rematchSeq = Math.max(0, Math.floor(Number(remoteMatch.rematchSeq) || 0));
    if (
      remoteMatch.status === "playing" &&
      rematchSeq > versusLastRematchSeq &&
      (state.versusMatchEnded || (prevMatch && prevMatch.status === "ended"))
    ) {
      versusLastRematchSeq = rematchSeq;
      state.versusMatchEnded = false;
      resetLocalVersusBoardForRematch();
      versusFirstPlayerBannerShownForSeq = -1;
      showToast("次のゲームの準備（6枚配布・マリガン前）", { duration: 6000 });
    } else if (remoteMatch.status === "playing") {
      versusLastRematchSeq = Math.max(versusLastRematchSeq, rematchSeq);
    }

    if (versusBootstrapping) return;
    maybeShowVersusTurnEndFromRemote(remoteMatch);
    updateVersusTurnGlow(remoteMatch);
    var oppSl =
      versusSession.myRole === "host"
        ? remoteMatch.guestSuccessLiveCount
        : remoteMatch.hostSuccessLiveCount;
    state.versusOpponentSuccessLiveCount = Math.max(0, Math.floor(Number(oppSl) || 0));
    applyVersusPhaseFromRemote(remoteMatch);
    if (
      remoteMatch.firstPlayerRole &&
      versusLastKnownFirstPlayerRole &&
      remoteMatch.firstPlayerRole !== versusLastKnownFirstPlayerRole &&
      normalizeVersusPhase(remoteMatch) === "firstNormal" &&
      getVersusLiveStep(remoteMatch) == null
    ) {
      showVersusRoleChangeOverlay(remoteMatch.firstPlayerRole === versusSession.myRole);
    }
    if (remoteMatch.firstPlayerRole) {
      versusLastKnownFirstPlayerRole = remoteMatch.firstPlayerRole;
    }
    syncVersusMatchBar(remoteMatch);
    syncVersusOppSlDisplay();
    applyVersusOpponentBoardFromRemote(remoteMatch);
    syncVersusOpponentActionFeed(remoteMatch);
    syncVersusBoardActionRequest(remoteMatch);
    syncVersusOpponentEffectMirrorDialog(remoteMatch);
    if (remoteMatch.status === "ended" && !state.versusMatchEnded) {
      state.versusMatchEnded = true;
      versusMatchLogSinkEnabled = false;
      clearVersusMatchLog();
      logReplay("versus-match-end", { summary: "試合終了" });
      if (remoteMatch.endedReason === "concede") {
        showVersusConcedeOverlay();
        scheduleVersusRematchPrepIfHost(remoteMatch);
      }
      showVersusEndBanner(remoteMatch);
      document.body.classList.remove("versus-my-turn", "versus-opponent-turn");
    }
    render();
  }

  function scheduleVersusBoardPublicSync() {
    if (!versusSession || versusSession.mode !== "online" || !versusSession.myRole) return;
    if (versusBoardSyncTimer) clearTimeout(versusBoardSyncTimer);
    versusBoardSyncTimer = setTimeout(function () {
      versusBoardSyncTimer = 0;
      flushVersusBoardPublicSync();
    }, 280);
  }

  function queueVersusSuccessLivePublicSync() {
    if (!versusSession || versusSession.mode !== "online" || !versusSession.myRole) return;
    var sl = successLiveAreaLiveCardCount();
    if (sl === versusLastSyncedSlCount) return;
    versusLastSyncedSlCount = sl;
    scheduleVersusPublicSync({ successLiveCount: sl });
  }

  function scheduleVersusPublicSync(explicitPatch) {
    if (!versusSession || versusSession.mode !== "online" || !versusSession.myRole) return;
    if (versusPublicSyncTimer) clearTimeout(versusPublicSyncTimer);
    versusPublicSyncTimer = setTimeout(function () {
      versusPublicSyncTimer = 0;
      var sl = successLiveAreaLiveCardCount();
      var patch = explicitPatch && typeof explicitPatch === "object" ? explicitPatch : { successLiveCount: sl };
      if (patch.successLiveCount == null) patch.successLiveCount = sl;
      if (state.versusPendingAction) {
        patch.lastAction = state.versusPendingAction;
        state.versusPendingAction = null;
      }
      pushVersusPublicState(versusSession.roomCode, versusSession.myRole, patch)
        .then(function () {
          return reportVersusWinIfEligible(versusSession.roomCode, versusSession.myRole);
        })
        .catch(function (err) {
          console.warn("[versus] sync failed:", err);
        });
    }, 450);
  }

  function teardownVersusSessionUi() {
    if (versusMatchUnsub) {
      try {
        versusMatchUnsub();
      } catch (_) {
        /* noop */
      }
      versusMatchUnsub = null;
    }
    if (versusPublicSyncTimer) {
      clearTimeout(versusPublicSyncTimer);
      versusPublicSyncTimer = 0;
    }
    if (versusBoardSyncTimer) {
      clearTimeout(versusBoardSyncTimer);
      versusBoardSyncTimer = 0;
    }
    versusBoardSyncLastFp = "";
    versusOpponentBoardFp = "";
    versusOpponentBoardRev = 0;
    versusLastSyncedSlCount = -1;
    versusPhaseAutoKey = "";
    versusTurnEndFeedPrimed = false;
    versusLastHostAction = "";
    versusLastGuestAction = "";
    versusHandRevealPending = [];
    versusHandRevealUntil = 0;
    if (versusHandRevealClearTimer) {
      clearTimeout(versusHandRevealClearTimer);
      versusHandRevealClearTimer = 0;
    }
    if (versusWaitingRevealClearTimer) {
      clearTimeout(versusWaitingRevealClearTimer);
      versusWaitingRevealClearTimer = 0;
    }
    versusWaitingRevealPending = [];
    versusWaitingRevealUntil = 0;
    versusLastSyncedWaitingIds = new Set();
    hideVersusOpponentBoard();
    document.body.classList.remove("play-versus-mode");
    document.body.classList.remove("versus-local-dual-mode");
    document.body.classList.remove("versus-local-practice-mode");
    var viewGameTeardown = document.getElementById("view-game");
    if (viewGameTeardown) viewGameTeardown.classList.remove("view-game--versus");
    versusLocalDualBoards.host = null;
    versusLocalDualBoards.guest = null;
    var localDualEndSwitchTeardown = document.getElementById("btn-versus-local-dual-end-switch");
    var dualBoardSwitchTeardown = document.getElementById("btn-versus-dual-board-switch");
    if (localDualEndSwitchTeardown) localDualEndSwitchTeardown.hidden = true;
    if (dualBoardSwitchTeardown) dualBoardSwitchTeardown.hidden = true;
    playChromeMountsLastMobile = null;
    syncPlayBoardChromeMounts();
    var versusChromeEl = document.getElementById("versus-play-chrome");
    if (versusChromeEl) versusChromeEl.hidden = true;
    var concedeBtn = document.getElementById("btn-versus-concede");
    var lobbyBtn = document.getElementById("btn-versus-lobby");
    var endTurnBtn = document.getElementById("btn-versus-end-turn");
    if (concedeBtn) concedeBtn.hidden = true;
    if (lobbyBtn) lobbyBtn.hidden = true;
    if (endTurnBtn) endTurnBtn.hidden = true;
    var oppSlWrap = document.getElementById("versus-opp-sl-controls");
    if (oppSlWrap) oppSlWrap.hidden = true;
    document.body.classList.remove("versus-my-turn", "versus-opponent-turn");
  }

  function syncSuccessLiveZoneChrome() {
    var shell = $("success-live-zone-shell");
    var n = successLiveAreaLiveCardCount();
    if (shell) {
      shell.classList.toggle("success-live-zone-shell--snsyuraku", n === 2);
      shell.classList.toggle("success-live-zone-shell--win", n >= LIVE_WINS);
    }
    var winEl = $("success-live-msg-youwin");
    var snsEl = $("success-live-msg-snsyuraku");
    if (winEl) winEl.hidden = n < LIVE_WINS;
    if (snsEl) snsEl.hidden = n !== 2;
    if (versusSession) {
      syncVersusMatchBar(versusSession.remoteMatch);
      queueVersusSuccessLivePublicSync();
    }
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
    set("hud-slive", successLiveAreaLiveCardCount());
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

  const HAND_ROW1_CAP = 13;
  const HAND_ROW2_CAP = 10;

  function handRowChunkSizes(n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (n < 14) return [n];
    if (n < 24) return [HAND_ROW1_CAP, n - HAND_ROW1_CAP];
    return [HAND_ROW1_CAP, HAND_ROW2_CAP, n - HAND_ROW1_CAP - HAND_ROW2_CAP];
  }

  function applyHandRowOverlapClasses(rowEl, countInRow) {
    if (!rowEl) return;
    rowEl.classList.remove(
      "hand-zone-row--overlap",
      "hand-zone-row--overlap-light",
      "hand-zone-row--overlap-strong",
      "hand-zone-row--overlap-heavy",
    );
    var n = Math.max(0, Math.floor(Number(countInRow) || 0));
    if (n < 2) return;
    var useOverlap = false;
    var overlapLight = false;
    if (n >= 2 && n <= 5) {
      useOverlap = true;
      overlapLight = true;
    } else if (n >= 10) {
      useOverlap = true;
    } else {
      var first = rowEl.querySelector(".card-item");
      var W = first ? first.getBoundingClientRect().width : 82;
      var cs = getComputedStyle(rowEl);
      var gap = parseFloat(cs.gap) || 4;
      var pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      var handRow = $("hand-row");
      var avail = handRow ? Math.max(0, handRow.clientWidth - pad) : 0;
      var needed = n * W + (n - 1) * gap;
      useOverlap = needed > avail + 0.5;
    }
    rowEl.classList.toggle("hand-zone-row--overlap", useOverlap);
    rowEl.classList.toggle("hand-zone-row--overlap-light", useOverlap && overlapLight);
    rowEl.classList.toggle("hand-zone-row--overlap-strong", useOverlap && !overlapLight && n >= 8);
    rowEl.classList.toggle("hand-zone-row--overlap-heavy", useOverlap && !overlapLight && n >= 12);
  }

  /** 手札は常に 1 行の重ね可能レイアウト（枚数が多いほど強めに重なる）。
   * 14枚以上は複数行（13＋残り、24枚以上で3行目）し、行ごとに重ねる。
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
    var handMultiRow = n >= 14 && !(state.liveTurnPickMode && state.liveTurnHandSpreadPick);
    var useOverlap = false;
    var overlapLight = false;
    if (handMultiRow) {
      zone.classList.remove("hand-zone--overlap", "hand-zone--overlap-light", "hand-zone--overlap-strong", "hand-zone--overlap-heavy");
      zone.classList.add("hand-zone--multi-row");
      if (row) row.classList.add("hand-row--multi-row");
      var rowEls = zone.querySelectorAll(".hand-zone-row");
      for (var ri = 0; ri < rowEls.length; ri++) {
        var rowEl = rowEls[ri];
        var rn = rowEl.querySelectorAll(".card-item").length;
        applyHandRowOverlapClasses(rowEl, rn);
      }
      zone.classList.remove("hand-zone--split-rows");
      if (row) row.classList.remove("hand-row--split-rows");
      return;
    }
    zone.classList.remove("hand-zone--multi-row");
    if (row) row.classList.remove("hand-row--multi-row");
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
    zone.classList.remove("hand-zone--split-rows", "hand-zone--multi-row");
    if (row) row.classList.remove("hand-row--split-rows", "hand-row--multi-row");
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
    if (isLightweightPlayMode()) {
      try {
        var bLw = getRenderPassLiveBundle();
        var resLw = Array.isArray(state.resolutionArea) ? state.resolutionArea.length : 0;
        var bladeLw = Math.max(0, Math.floor(sumBoardMemberBlades()));
        if (bladeLw > 0 && resLw >= bladeLw) {
          return !!(bLw && bLw.evaluateResult && bLw.evaluateResult.ok);
        }
      } catch (_) {
        return false;
      }
      return false;
    }
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

  function setPreviewRailExpanded(expanded) {
    var row = $("preview-row");
    if (!row) return;
    var collapsed = row.classList.contains("preview-row--collapsed");
    if (expanded && collapsed) row.classList.remove("preview-row--collapsed");
    else if (!expanded && !collapsed) row.classList.add("preview-row--collapsed");
    else return;
    syncPreviewRailAria();
  }

  function setWaitingRailExpanded(expanded) {
    const row = $("waiting-row");
    if (!row) return;
    var collapsed = row.classList.contains("waiting-row--collapsed");
    if (expanded && collapsed) row.classList.remove("waiting-row--collapsed");
    else if (!expanded && !collapsed) row.classList.add("waiting-row--collapsed");
    else return;
    syncWaitingRailAria();
    updateWaitingZoneOverlapMode();
  }

  function togglePreviewRailExpanded(ev) {
    if (ev && ev.type === "click" && ev.target.closest) {
      if (ev.target.closest("button, a, label, input")) return;
    }
    /* ドラッグ直後の合成クリックや誤発火でプレビューが開いてしまうのを防ぐガード */
    if (Date.now() - lastDragEndAt < 350) return;
    var row = $("preview-row");
    if (!row) return;
    setPreviewRailExpanded(row.classList.contains("preview-row--collapsed"));
  }

  function toggleWaitingRailExpanded(ev) {
    if (ev && ev.type === "click" && ev.target.closest) {
      const ign = ev.target.closest("button, a, label, input");
      if (ign) return;
    }
    const row = $("waiting-row");
    if (!row) return;
    setWaitingRailExpanded(row.classList.contains("waiting-row--collapsed"));
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
    if (isMulliganHandPickActive()) {
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
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      var vPlayRole = getVersusPlayRole();
      var vPh = normalizeVersusPhase(versusSession.remoteMatch);
      if (vPh !== "live") {
        if (
          isVersusOpeningMulliganPhase(versusSession.remoteMatch) &&
          (state.awaitingTurnStart === true || versusMulliganCommitPending) &&
          !openingMulliganExecuteUsed &&
          vPlayRole &&
          canRoleActInVersus(versusSession.remoteMatch, vPlayRole) &&
          !isVersusSecondPlayerMulliganPickPhase(versusSession.remoteMatch)
        ) {
          body.classList.remove(
            "flow-hint--live-turn-start",
            "flow-hint--live-to-area",
            "flow-hint--live-begin",
            "flow-hint--turn-start",
            "flow-hint--turn-start-yell",
            "flow-hint--live-success",
          );
          body.classList.add("flow-hint--mulligan-execute");
          return;
        }
        if (
          (vPh === "firstNormal" || vPh === "secondNormal") &&
          vPlayRole &&
          canRoleActInVersus(versusSession.remoteMatch, vPlayRole)
        ) {
          body.classList.remove(
            "flow-hint--live-turn-start",
            "flow-hint--live-to-area",
            "flow-hint--live-begin",
            "flow-hint--mulligan-execute",
            "flow-hint--turn-start",
            "flow-hint--turn-start-yell",
            "flow-hint--live-success",
            "flow-hint--versus-perf-done",
            "flow-hint--versus-success-fx-done",
          );
          body.classList.add("flow-hint--versus-end-turn");
          return;
        }
        body.classList.remove(
          "flow-hint--live-turn-start",
          "flow-hint--live-to-area",
          "flow-hint--live-begin",
          "flow-hint--turn-start",
          "flow-hint--turn-start-yell",
          "flow-hint--live-success",
          "flow-hint--mulligan-execute",
          "flow-hint--versus-end-turn",
        );
        return;
      }
      var vLiveStep = getVersusLiveStep(versusSession.remoteMatch);
      var vMineAct =
        vPlayRole && canRoleActInVersus(versusSession.remoteMatch, vPlayRole);
      body.classList.remove(
        "flow-hint--live-turn-start",
        "flow-hint--live-to-area",
        "flow-hint--live-begin",
        "flow-hint--turn-start",
        "flow-hint--turn-start-yell",
        "flow-hint--live-success",
        "flow-hint--mulligan-execute",
        "flow-hint--versus-end-turn",
      );
      if (vLiveStep === "set" && vMineAct && !state.liveStatsAfterBegin) {
        if (state.liveTurnPickMode) {
          if (state.liveTurnSelectedIds.length > 0) {
            body.classList.add("flow-hint--live-to-area");
          } else {
            body.classList.add("flow-hint--live-turn-start");
          }
        } else {
          body.classList.add("flow-hint--live-turn-start");
        }
        return;
      }
      if (vLiveStep === "perf" && vMineAct) {
        if (state.liveStatsAfterBegin && versusLiveEaleDoneWithVerdict()) {
          body.classList.add("flow-hint--versus-perf-done");
          return;
        }
        if (!state.liveStatsAfterBegin && versusLiveSlotsHaveCards()) {
          body.classList.add("flow-hint--live-begin");
          return;
        }
        return;
      }
      if (vLiveStep === "successFx" && vMineAct) {
        body.classList.add("flow-hint--versus-success-fx-done");
        return;
      }
      if (vLiveStep === "judgment") {
        return;
      }
      return;
    }
    body.classList.remove(
      "flow-hint--live-turn-start",
      "flow-hint--live-to-area",
      "flow-hint--live-begin",
      "flow-hint--turn-start",
      "flow-hint--turn-start-yell",
      "flow-hint--live-success",
      "flow-hint--mulligan-execute",
      "flow-hint--versus-end-turn",
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
    var bundle = getRenderPassLiveBundle();
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
    var versusLive =
      versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch);
    var vPlayRoleUi = getVersusPlayRole();
    var vStep = versusLive ? getVersusLiveStep(versusSession.remoteMatch) : null;
    var vMineAct =
      versusLive &&
      vPlayRoleUi &&
      canRoleActInVersus(versusSession.remoteMatch, vPlayRoleUi);
    if (bPrim) {
      var inPick = state.liveTurnPickMode;
      var afterLiveBegin = state.liveStatsAfterBegin === true;
      if (versusLive && vStep === "set") {
        bPrim.textContent = inPick ? "ライブエリアへ" : "ライブカードセット";
        bPrim.disabled =
          mulliganPhase || !vMineAct || (inPick && state.liveTurnSelectedIds.length === 0);
        bPrim.title = "手札から最大3枚まで裏向きでライブ置き場へ（8.2）";
      } else if (versusLive && vStep === "perf") {
        bPrim.textContent = inPick ? "ライブエリアへ" : "（パフォーマンス）";
        bPrim.disabled = true;
        bPrim.title = "パフォーマンスは下の「ライブ開始」→エール→「パフォーマンス完了」で進めます";
      } else {
        bPrim.textContent = inPick ? "ライブエリアへ" : "ライブターン開始";
        bPrim.disabled =
          mulliganPhase ||
          afterLiveBegin ||
          (versusLive && !vMineAct) ||
          (inPick && state.liveTurnSelectedIds.length === 0);
        bPrim.title = afterLiveBegin
          ? "ライブ開始後はターン開始まで新しいライブターンを開始できません"
          : inPick
            ? state.liveTurnSelectedIds.length === 0
              ? "手札中央のチェックでカードを選んでください"
              : "選んだカードをライブの空き枠へ左から順に配置し、ドローします"
            : "成功ライブを控え室に送ってライブ準備へ";
      }
      bPrim.classList.toggle("btn-live-turn-primary--post-begin", afterLiveBegin);
    }
    if (bDone) {
      if (versusLive && vStep === "set") {
        bDone.textContent = "セット完了";
        bDone.disabled = mulliganPhase || !vMineAct || !state.liveTurnPickMode;
        bDone.title = "先攻→後攻の順でライブカードをセット（8.2）";
      } else if (versusLive && vStep === "perf") {
        bDone.textContent =
          afterLiveBegin || !versusLiveSlotsHaveCards() ? "パフォーマンス完了" : "ライブ開始";
        bDone.disabled =
          mulliganPhase ||
          !vMineAct ||
          (versusLiveSlotsHaveCards() && !afterLiveBegin);
        bDone.title = afterLiveBegin
          ? "エール・成功判定の後、先攻→後攻の順で完了（8.3）"
          : "ライブカードを表向きにしエールへ（8.3.4〜）";
      } else if (versusLive && vStep === "successFx") {
        bDone.textContent = "成功時効果 完了";
        bDone.disabled = mulliganPhase || !vMineAct;
        bDone.title = "ライブ成功時効果を先攻→後攻の順で処理後に押す（8.4）";
      } else {
        bDone.textContent = "ライブ開始";
        bDone.disabled = mulliganPhase || !state.liveTurnPickMode;
        bDone.title = "";
      }
    }
    document.body.classList.toggle("live-turn-pick-mode", state.liveTurnPickMode === true);
    document.body.classList.toggle("live-stats-after-begin", state.liveStatsAfterBegin === true);
  }

  /** マリガンのヒント文言・実行ボタンを state に合わせる */
  function syncMulliganUi() {
    var remoteMatch = versusMatchPhaseActive() ? versusSession.remoteMatch : null;
    var playRoleMull = getVersusPlayRole();
    var versusMulliganPhase = isVersusOpeningMulliganPhase(remoteMatch);
    var versusNormalPhase =
      versusMatchPhaseActive() &&
      remoteMatch &&
      (normalizeVersusPhase(remoteMatch) === "firstNormal" ||
        normalizeVersusPhase(remoteMatch) === "secondNormal");
    var mineAct =
      versusMatchPhaseActive() &&
      remoteMatch &&
      playRoleMull &&
      canRoleActInVersus(remoteMatch, playRoleMull);
    var myMulliganDone =
      playRoleMull &&
      remoteMatch &&
      hasVersusRoleCompletedOpeningMulligan(remoteMatch, playRoleMull);
    var secondMulliganPickPrep =
      versusMulliganPhase &&
      versusSession.remoteMatch &&
      isVersusSecondPlayerMulliganPickPhase(versusSession.remoteMatch);
    var showMulligan = versusMulliganPhase
      ? mineAct &&
        !myMulliganDone &&
        state.awaitingTurnStart === true &&
        !openingMulliganExecuteUsed &&
        !versusMulliganCommitPending
      : state.awaitingTurnStart === true && !openingMulliganExecuteUsed;
    var showVersusEndTurn = false;
    const hint = $("hand-mulligan-hint");
    if (hint) {
      if (versusNormalPhase && mineAct) {
        hint.hidden = true;
      } else if (versusMulliganPhase && mineAct && showMulligan) {
        hint.hidden = false;
        hint.textContent =
          "開幕マリガン（総合ルール 6.2.1.6）：戻すカードを選び「マリガン実行」。0枚でも可。先攻→後攻の順です。";
      } else if (secondMulliganPickPrep && !mineAct) {
        hint.hidden = false;
        hint.textContent =
          "先攻の開幕マリガン中です。戻すカードを選んでおけます（「マリガン実行」は後攻の順番で押せます）。";
      } else if (versusMulliganPhase && !mineAct) {
        hint.hidden = false;
        hint.textContent = "相手の開幕マリガンを待っています。";
      } else if (versusMulliganCommitPending) {
        hint.hidden = false;
        hint.textContent = "マリガンを確定しています…";
      } else {
        hint.hidden = !showMulligan;
        if (!versusMatchPhaseActive()) {
          hint.innerHTML =
            "<strong>ターン開始まで:</strong> 戻したいカードに<strong>チェック</strong>、「<strong>マリガン実行</strong>」で選択枚数を山札からドローし、その後選択枚を山札に戻してシャッフルします（ドロー時点では戻すカードは山札に含まれません）。<strong>0枚チェックでも実行できます</strong>（そのときはシャッフル・追加ドローはしません）。チェックはカード中央付近の小さな操作域です。タップしづらいときはカードを少し上下に動かしてから再度タップしてください。";
        }
      }
    }
    const btn = $("btn-mulligan-execute");
    if (btn) {
      if (showMulligan) {
        btn.hidden = false;
        btn.disabled = false;
        btn.textContent = "マリガン実行";
        btn.classList.remove("btn--versus-end-glow");
      } else if (versusMulliganCommitPending) {
        btn.hidden = false;
        btn.disabled = true;
        btn.textContent = "マリガン確定中…";
        btn.classList.remove("btn--versus-end-glow");
      } else if (secondMulliganPickPrep && !mineAct) {
        btn.hidden = false;
        btn.disabled = true;
        btn.textContent = "マリガン実行";
        btn.title = "後攻のマリガン順番になるまで実行できません";
        btn.classList.remove("btn--versus-end-glow");
      } else if (versusMatchPhaseActive()) {
        btn.hidden = true;
        btn.disabled = true;
        btn.classList.remove("btn--versus-end-glow");
      } else {
        btn.hidden = !showMulligan;
        btn.disabled = !showMulligan;
        btn.textContent = "マリガン実行";
        btn.classList.remove("btn--versus-end-glow");
      }
    }
    const actions = document.querySelector(".hand-zone-actions");
    if (actions) {
      /* マリガン実行後の開幕中だけ幅を広げる（常時付与すると控え室などの開閉が効かなくなる） */
      var expandLiveBtns =
        state.awaitingTurnStart === true && openingMulliganExecuteUsed === true;
      actions.classList.toggle("hand-zone-actions--no-mulligan", expandLiveBtns);
    }
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
      const COL_MAX = isLightweightPlayMode() ? 10 : 24;
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

    try {
      syncJoujiPassiveEffectsAll();
    } catch (_) {
      /* noop */
    }

    clearRenderPassLiveBundle();
    beginRenderPassLiveBundle();

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
    syncPerfNoLivePlaceholders();
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
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      syncVersusTurnStartButton(versusSession.remoteMatch);
      if (versusOnlineActive()) {
        syncVersusOpponentActionFeed(versusSession.remoteMatch);
      }
    }
    syncLiveTurnHandUi();
    syncPlayFlowHintGlows();
    if (versusMatchPhaseActive() && versusSession.remoteMatch && isVersusLivePhase(versusSession.remoteMatch)) {
      var vStepRender = getVersusLiveStep(versusSession.remoteMatch);
      var vPlayRoleRender = getVersusPlayRole();
      var vMineRender =
        vPlayRoleRender &&
        canRoleActInVersus(versusSession.remoteMatch, vPlayRoleRender);
      if (vStepRender === "perf" && vMineRender) {
        if (
          !state.liveStatsAfterBegin &&
          !state.liveTurnPickMode &&
          myVersusLiveSetDone(versusSession.remoteMatch) &&
          versusLiveSlotsHaveCards()
        ) {
          tryAutoVersusLiveBegin(versusSession.remoteMatch);
        } else if (state.liveStatsAfterBegin) {
          try {
            syncLiveTurnStatsPanel();
            syncLiveYellDrawButtons();
          } catch (_) {
            /* noop */
          }
        }
      }
    }
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
    syncStageSlotEnergyCountVars();
    syncLiveSuccessEffectActivation();
    schedulePersistPlayResume();
    scheduleVersusBoardPublicSync();
    repositionEffectDialogResumeChip();
    syncVersusDeckFaceLockUi();
    if (versusDualBoardActive()) {
      if (!versusMulliganCommitPending) {
        persistVersusLocalDualActiveBoard();
      }
      syncVersusLocalDualChrome();
      checkLocalVersusWinCondition();
    }
  }

  /**
   * ステージのメンバーカード拡大時に、各スロット内のエネ枚数を CSS 変数で公開し、
   * 各 `.stage-slot.card-strip` にぶら下がっているエネルギー枚数を CSS 変数で公開する。
   * CSS 側がこの数だけ左に translateX してメンバーを中心に戻す。
   */
  function syncStageSlotEnergyCountVars() {
    var slots = document.querySelectorAll(".stage-slot.card-strip");
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var n = slot.querySelectorAll('.card-item[data-type="エネルギー"]').length;
      slot.style.setProperty("--energy-count", String(n));
    }
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

  function doUndoCore() {
    if (!undoHistory.length) {
      showToast("ひとつ戻せる操作がありません");
      return;
    }
    clearLiveSuccessEffectSchedule();
    lastLiveSuccessOrchestrateFp = "";
    var matchBeforeUndo = snapshotVersusMatchForUndo();
    while (versusMatchUndoStack.length > undoHistory.length) versusMatchUndoStack.pop();
    redoHistory.push(snapshotBoard());
    if (versusMatchPhaseActive()) {
      var curMatchRedo = snapshotVersusMatchForUndo();
      if (curMatchRedo) versusMatchRedoStack.push(curMatchRedo);
      trimRedo();
    } else {
      trimRedo();
    }
    var matchSnap =
      versusMatchPhaseActive() && versusMatchUndoStack.length
        ? versusMatchUndoStack.pop()
        : null;
    var boardSnap = undoHistory.pop();
    var crossed = false;
    if (versusMatchPhaseActive() && matchSnap) {
      crossed = versusMatchUndoCrossedBoundary(matchSnap, matchBeforeUndo);
      var undoRole =
        matchSnap.activePlayerRole === "host" || matchSnap.activePlayerRole === "guest"
          ? matchSnap.activePlayerRole
          : null;
      if (
        versusLocalDualActive() &&
        undoRole &&
        versusSession.activeRole !== undoRole
      ) {
        switchVersusLocalDualToRoleForUndo(undoRole, { preserveUndoStacks: true });
      }
      applyBoard(boardSnap);
      applyVersusMatchUndoSnap(matchSnap, { skipRoleSwitch: true });
      syncVersusMatchUndoToRemote(matchSnap);
    } else {
      applyBoard(boardSnap);
    }
    persistSessionTexts();
    logReplay("undo");
    render();
    if (crossed && versusSession && versusSession.remoteMatch) {
      var playRole = getVersusPlayRole();
      var flowDesc = playRole
        ? describeVersusFlowForRole(versusSession.remoteMatch, playRole)
        : "";
      showToast(
        "ひとつ戻しました（ターン／フェイズを巻き戻し" + (flowDesc ? "：" + flowDesc : "") + "）",
        { duration: 5200 },
      );
    } else {
      showToast("ひとつ戻しました");
    }
  }

  function doRedoCore() {
    if (!redoHistory.length) {
      showToast("ひとつ進める操作がありません");
      return;
    }
    clearLiveSuccessEffectSchedule();
    lastLiveSuccessOrchestrateFp = "";
    var matchBeforeRedo = snapshotVersusMatchForUndo();
    undoHistory.push(snapshotBoard());
    pushVersusMatchUndoSnap();
    trimUndo();
    var matchSnap =
      versusMatchPhaseActive() && versusMatchRedoStack.length
        ? versusMatchRedoStack.pop()
        : null;
    var boardSnapRedo = redoHistory.pop();
    var crossed = false;
    if (versusMatchPhaseActive() && matchSnap) {
      crossed = versusMatchUndoCrossedBoundary(matchSnap, matchBeforeRedo);
      var redoRole =
        matchSnap.activePlayerRole === "host" || matchSnap.activePlayerRole === "guest"
          ? matchSnap.activePlayerRole
          : null;
      if (
        versusLocalDualActive() &&
        redoRole &&
        versusSession.activeRole !== redoRole
      ) {
        switchVersusLocalDualToRoleForUndo(redoRole, { preserveUndoStacks: true });
      }
      applyBoard(boardSnapRedo);
      applyVersusMatchUndoSnap(matchSnap, { skipRoleSwitch: true });
      syncVersusMatchUndoToRemote(matchSnap);
    } else {
      applyBoard(boardSnapRedo);
    }
    persistSessionTexts();
    logReplay("redo");
    render();
    if (crossed && versusSession && versusSession.remoteMatch) {
      var playRoleRedo = getVersusPlayRole();
      var flowDescRedo = playRoleRedo
        ? describeVersusFlowForRole(versusSession.remoteMatch, playRoleRedo)
        : "";
      showToast(
        "ひとつ進めました（ターン／フェイズを進め直し" + (flowDescRedo ? "：" + flowDescRedo : "") + "）",
        { duration: 5200 },
      );
    } else {
      showToast("ひとつ進めました");
    }
  }

  function doUndo() {
    if (!undoHistory.length) {
      showToast("ひとつ戻せる操作がありません");
      return;
    }
    runVersusSensitiveBoardAction("undo", doUndoCore);
  }

  function doRedo() {
    if (!redoHistory.length) {
      showToast("ひとつ進める操作がありません");
      return;
    }
    runVersusSensitiveBoardAction("redo", doRedoCore);
  }

  function executeResToDeckTopCore() {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    pushHistoryBefore("res-to-deck-top");
    state.pendingDrawYellHandDraws = 0;
    var handReturned = harvestDrawYellHandCardsForReturn();
    var moved = handReturned.concat(state.resolutionArea);
    state.deck.unshift(...moved);
    state.resolutionArea = [];
    var nu = moved.length;
    var msg = nu + " 枚をデッキの上に戻しました";
    if (handReturned.length) {
      msg += "（うち手札に来ていたドロー " + handReturned.length + " 枚を含む）";
    }
    showToast(msg);
    render();
  }

  function executeResDeckShuffleCore() {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    pushHistoryBefore("res-shuffle-in");
    state.pendingDrawYellHandDraws = 0;
    var handReturned = harvestDrawYellHandCardsForReturn();
    state.deck.push(...handReturned, ...state.resolutionArea);
    state.resolutionArea = [];
    state.deck = shuffle(state.deck);
    var msg = "解決をデッキに戻してシャッフルしました";
    if (handReturned.length) {
      msg += "（手札のドロー " + handReturned.length + " 枚も一緒に戻しました）";
    }
    showToast(msg);
    render();
  }

  function persistSessionTexts() {
    try {
      var fp = $("select-first-player");
      if (fp) sessionStorage.setItem(STORAGE_FIRST_PLAYER, fp.value || "—");
      localStorage.setItem(STORAGE_PLAY_ENERGY_CARD_NO, selectedEnergyCardNo || "");
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
    function syncDeckOddsFoldHost() {
      if (matchesPlayPortraitLayout()) {
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
    window.addEventListener("resize", syncDeckOddsFoldHost, { passive: true });
    window.addEventListener(
      "orientationchange",
      function () {
        window.setTimeout(syncDeckOddsFoldHost, 220);
      },
      { passive: true },
    );
  })();
  (function initHandStickFoldViewport() {
    var det = $("hand-stick-fold");
    if (!det || det.tagName !== "DETAILS") return;
    function syncOpen() {
      if (!matchesPlayPortraitLayout()) det.setAttribute("open", "");
    }
    syncOpen();
    window.addEventListener("resize", syncOpen, { passive: true });
    window.addEventListener(
      "orientationchange",
      function () {
        window.setTimeout(syncOpen, 200);
      },
      { passive: true },
    );
  })();
  function bumpDeckOddsKManual(delta) {
    var n = state.deck.length;
    var m = Array.isArray(state.mulliganSelectedIds) ? state.mulliganSelectedIds.length : 0;
    var c = liveTurnHandCheckCount();
    var autoLock =
      (isMulliganHandPickActive() && m > 0) ||
      (state.liveTurnPickMode === true && c > 0);
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

    function reloadEnergyCardFromStorage() {
      try {
        var cn = localStorage.getItem(STORAGE_PLAY_ENERGY_CARD_NO);
        selectedEnergyCardNo = cn != null ? String(cn).trim() : "";
      } catch (_) {
        selectedEnergyCardNo = "";
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
      applyEnergyIdentityToAllEnergies(selectedEnergyCardNo);
    }

    window.addEventListener("llocg-cloud-state-merged", reloadEnergyCardFromStorage);
  })();

  (function initLayout46BoardRatio() {
    const btn = $("btn-layout-16-9");
    if (!btn) return;
    const STORAGE_LAYOUT_46 = "llocg_layout_4_6_board_ratio";

    function sync() {
      const on = sessionStorage.getItem(STORAGE_LAYOUT_46) === "1";
      document.body.classList.toggle("layout-4-6-board-ratio", on);
      document.body.classList.remove("layout-16-9-mode");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn--layout-16-9-on", on);
    }

    sync();
    btn.addEventListener("click", function () {
      const on = !document.body.classList.contains("layout-4-6-board-ratio");
      sessionStorage.setItem(STORAGE_LAYOUT_46, on ? "1" : "0");
      document.body.classList.toggle("layout-4-6-board-ratio", on);
      document.body.classList.remove("layout-16-9-mode");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn--layout-16-9-on", on);
      renderSynchronouslyOnce();
    });
  })();

  document.getElementById("btn-live-blade-minus")?.addEventListener("click", function () {
    if (state.liveStatsAfterBegin !== true) return;
    state.liveBladeManualAdjust = Math.max(-99, Math.floor(Number(state.liveBladeManualAdjust) || 0) - 1);
    syncLiveTurnStatsPanel();
    syncDeckLiveSimPanel();
    render();
  });
  document.getElementById("btn-live-blade-plus")?.addEventListener("click", function () {
    if (state.liveStatsAfterBegin !== true) return;
    state.liveBladeManualAdjust = Math.min(99, Math.floor(Number(state.liveBladeManualAdjust) || 0) + 1);
    syncLiveTurnStatsPanel();
    syncDeckLiveSimPanel();
    render();
  });

  $("btn-coin")?.addEventListener("click", () => {
    const head = Math.random() < 0.5 ? "コインは表になりました（先攻側は自由に運用してください）" : "コインは裏になりました（先攻側は自由に運用してください）";
    showToast(head);
    logReplay("coin");
  });

  function runTurnPhaseStartAfterSuccessLivePrompt() {
    showTurnPhaseStartSplash(state.turnCount);
    expirePendingToujouEffects([]);
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
    state.playLiveStartGlowActive = false;
    state.playLiveYellStarted = false;
    state.liveScoreEffectBonus = 0;
    state.ealeNoteLiveHitIds = [];
    state.ealeNoteLiveScorePoints = 0;
    state.pendingDrawYellHandDraws = 0;
    resetLiveSessionPlayEffectsAllZones();
    clearLiveSuccessEffectSchedule();
    lastLiveSuccessOrchestrateFp = "";
    /** 登場／起動／開始時行の H／B（ターン側）はターン開始でクリア（常時側は残す） */
    clearTurnScopedPlayBonusesEverywhere();
    clearLiveSessionPlayBonusesEverywhere();
    allZonesFlat().forEach(function (c) {
      clearLiveSessionGrantedState(c);
    });
    try {
      syncJoujiPassiveEffectsAll();
    } catch (_) {}
    /** カード固有「このターンだけ無効」フラグもターン開始で掃除（例: bp2-001 による bp2-010 無効化） */
    clearTurnScopedAbilityDisableFlags();
    state.stageColumnEntryBlocked = { left: false, center: false, right: false };
    /** マリガン終了タイミングで解決／ライブ枠は控えへ（ルール自動処理ではなく補助用の一括移動） */
    var flushed = [];
    if (state.resolutionArea.length) {
      flushed.push.apply(flushed, state.resolutionArea);
      state.resolutionArea.length = 0;
      state.pendingDrawYellHandDraws = 0;
      clearAllDrawYellHandMarkers();
    }
    ["left", "center", "right"].forEach(function (k) {
      var la = state.liveArea[k];
      if (la && la.length) {
        /* 必要ハート補正は「そのライブの効果適用中」のみ有効。控え室送りで自動解除する。 */
        la.forEach(function (inst) {
          if (inst && inst._needHeartDelta) delete inst._needHeartDelta;
        });
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
      markCardFlashDraw(drawnTs, FLASH_LABEL_PLUS_DRAW);
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
    if (drewOne) {
      window.setTimeout(flashTurnStartDrawToHand, 0);
    }
  }

  function doTurnPhaseStart() {
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      if (isVersusOpeningMulliganPhase(versusSession.remoteMatch)) {
        showToast("開幕マリガン中です");
        return;
      }
      var playRoleTurn = getVersusPlayRole();
      if (!playRoleTurn || !canRoleActInVersus(versusSession.remoteMatch, playRoleTurn)) {
        showToast("あなたのターンではありません");
        return;
      }
    }
    if (!isPlayManualMode()) {
      var mand = collectPendingTriggeredEffects(["toujyou", "live_start", "live_success"]).filter(function (p) {
        return p.mandatory;
      });
      if (mand.length) {
        var okMand = window.confirm(
          "未解決の強制誘発効果が " +
            mand.length +
            " 件あります。\nターンを進めるとこれらは失効します。続行しますか？\n\n" +
            mand
              .map(function (p) {
                return "・" + p.label;
              })
              .join("\n"),
        );
        if (!okMand) return;
      }
    }
    pushHistoryBefore("turn-phase-start");
    state.turnCount += 1;
    state.stageMemberEntriesThisTurn = 0;
    state.deckRefreshedThisTurn = false;
    resetPerTurnAbilityUsageAllZones();
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
            "ライブ判定は成功ですが、「成功ライブカード置き場」に該当のライブカードが載っていません。\n「" +
              nameLine +
              "」のうち 1 枚だけ成功ライブカード置き場へ移しますか？\n（OK でカードを選びます。キャンセルでは移しません）",
          )
        ) {
          runTurnPhaseStartAfterSuccessLivePrompt();
          return;
        }
        openPickSuccessLiveDialog(pend, function (chosenId) {
          if (chosenId != null) {
            var m = migrateOneLiveCardToSuccessfulAreaById(chosenId);
            if (m) {
              showToast("選んだライブカードを成功ライブカード置き場へ移しました");
              logReplay("turn-phase-auto-move-success-live", { liveCards: m, pickOne: true });
            }
          }
          runTurnPhaseStartAfterSuccessLivePrompt();
        });
        return;
      }
      if (
        window.confirm(
          "ライブ判定は成功ですが、「成功ライブカード置き場」に該当のライブカードが載っていません。\n「" +
            nameLine +
            "」を成功ライブカード置き場へ移しますか？\n（OK で移動。キャンセルでは自動移動せず、このあとも解決・ライブ枠は控え室へ送られます）",
        )
      ) {
        var movedN = migratePendingLiveCardsToSuccessfulArea();
        if (movedN) {
          showToast(movedN + " 枚のライブカードを成功ライブカード置き場へ移しました");
          logReplay("turn-phase-auto-move-success-live", { liveCards: movedN });
        }
      }
    }
    runTurnPhaseStartAfterSuccessLivePrompt();
  }

  function doMulliganExecute(opts) {
    opts = opts || {};
    if (!state.awaitingTurnStart) {
      showToast("マリガンは「ターン開始」の前のみ使えます");
      return;
    }
    if (!opts.deferOpeningMulliganUsedFlag) {
      openingMulliganExecuteUsed = true;
    }
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
    /* 戻すカードはドロー時点では山札に含めない。ドロー後に山札へ戻してシャッフル */
    var drawn = 0;
    for (var i = 0; i < k; i++) {
      tryReplenishDeckFromWaitingLoop();
      if (!state.deck.length) break;
      state.hand.push(state.deck.shift());
      drawn++;
    }
    state.deck.push.apply(state.deck, toReturn);
    state.deck = shuffle(state.deck);
    state.mulliganSelectedIds = [];
    logReplay("mulligan", { returned: k, drawn });
    persistOpeningMulliganRememberedK(k);
    if (drawn === k) {
      showToast("マリガン: " + drawn + " 枚ドローし、選択 " + k + " 枚を山札に戻してシャッフルしました");
    } else {
      showToast(
        "マリガン: 山札が足りず " + drawn + " 枚しかドローできませんでした（選択 " + k + " 枚は山札に戻してシャッフル）",
      );
    }
    render();
  }

  $("btn-turn-start")?.addEventListener("click", function () {
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      var vPh = normalizeVersusPhase(versusSession.remoteMatch);
      if (vPh === "firstNormal" || vPh === "secondNormal") {
        doVersusEndTurnClick();
        return;
      }
    }
    doTurnPhaseStart();
  });

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

  $("btn-mulligan-execute")?.addEventListener("click", function () {
    if (versusMatchPhaseActive() && versusSession.remoteMatch) {
      var vPhase = normalizeVersusPhase(versusSession.remoteMatch);
      if (vPhase === "live") {
        return;
      }
      if (vPhase === "firstMulligan" || vPhase === "secondMulligan") {
        doVersusMulliganExecuteClick();
        return;
      }
      if (vPhase === "firstNormal" || vPhase === "secondNormal") {
        doVersusEndTurnClick();
        return;
      }
    }
    doMulliganExecute();
  });

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

  /** ライブの必要ハート補正（need_heart の効果による減算）ダイアログ。 */
  function openLiveNeedHeartAdjustDialog() {
    var dlg = document.getElementById("dlg-live-need-heart-adjust");
    var body = document.getElementById("dlg-live-need-heart-adjust-body");
    if (!dlg || !body || typeof dlg.showModal !== "function") return;
    renderLiveNeedHeartAdjustDialogBody();
    try { dlg.showModal(); } catch (_) { /* noop */ }
  }

  function renderLiveNeedHeartAdjustDialogBody() {
    var body = document.getElementById("dlg-live-need-heart-adjust-body");
    if (!body) return;
    /** liveArea の各枠を順に走査して、それぞれのライブカード instance に対する補正 UI を作る */
    var html = "";
    var anyLive = false;
    ["left", "center", "right"].forEach(function (slotKey) {
      var arr = (state.liveArea && state.liveArea[slotKey]) || [];
      for (var i = 0; i < arr.length; i++) {
        var inst = arr[i];
        var cat = getCard(inst && inst.card_no);
        if (!cat || cat.type !== T_LIVE) continue;
        anyLive = true;
        html += renderOneLiveNeedHeartAdjustRow(inst, cat, slotKey, i);
      }
    });
    if (!anyLive) {
      body.innerHTML = '<p class="muted">ライブエリアにライブカードがありません。</p>';
      return;
    }
    body.innerHTML = html;
  }

  function renderOneLiveNeedHeartAdjustRow(inst, cat, slotKey, idx) {
    var base = (cat.need_heart && typeof cat.need_heart === "object" && !Array.isArray(cat.need_heart)) ? cat.need_heart : {};
    var delta = (inst && inst._needHeartDelta && typeof inst._needHeartDelta === "object") ? inst._needHeartDelta : {};
    /* 表示は printed slot（1..6 と heart0）優先。少なくとも catalog に含まれていた slot は必ず出す。 */
    var keysOrdered = ["heart0", "heart01", "heart02", "heart03", "heart04", "heart05", "heart06"];
    var labelByKey = {
      heart0: "ハート0",
      heart01: "桃",
      heart02: "赤",
      heart03: "黄",
      heart04: "緑",
      heart05: "青",
      heart06: "紫",
    };
    var slotByKey = { heart0: 0, heart01: 1, heart02: 2, heart03: 3, heart04: 4, heart05: 5, heart06: 6 };
    var rows = "";
    keysOrdered.forEach(function (k) {
      var b = Number(base[k]) || 0;
      var d = Number(delta[k]) || 0;
      if (b <= 0 && d === 0) return;
      var eff = Math.max(0, b + d);
      var ico = "";
      if (k === "heart0") ico = heartSlotArtIconHtml(0, { extraClass: "live-need-adjust-row__ico" });
      else ico = heartSlotArtIconHtml(slotByKey[k], { extraClass: "live-need-adjust-row__ico" });
      rows +=
        '<tr class="live-need-adjust-row" data-inst-id="' + escapeHtmlPlain(String(inst.id || "")) + '" data-slot-key="' + escapeHtmlPlain(k) + '">' +
        '<th scope="row">' + ico + '<span>' + escapeHtmlPlain(labelByKey[k]) + '</span></th>' +
        '<td class="live-need-adjust-row__base">基本 ' + escapeHtmlPlain(String(b)) + '</td>' +
        '<td class="live-need-adjust-row__ctl">' +
          '<button type="button" class="btn xs secondary live-need-adjust-row__dec">−</button>' +
          '<strong class="live-need-adjust-row__eff">' + escapeHtmlPlain(String(eff)) + '</strong>' +
          '<button type="button" class="btn xs secondary live-need-adjust-row__inc">＋</button>' +
        '</td>' +
        '<td class="live-need-adjust-row__delta">' + (d !== 0 ? (d > 0 ? "+" + d : String(d)) : "") + '</td>' +
        '</tr>';
    });
    var title = escapeHtmlPlain(String(cat.name || cat.card_no || "ライブカード"));
    var slotLabelMap = { left: "左", center: "中央", right: "右" };
    var locLab = slotLabelMap[slotKey] || slotKey;
    return (
      '<section class="live-need-adjust-card" data-inst-id="' + escapeHtmlPlain(String(inst.id || "")) + '">' +
        '<header class="live-need-adjust-card__head">' +
          '<span class="live-need-adjust-card__loc">' + escapeHtmlPlain(locLab) + ' #' + (idx + 1) + '</span>' +
          '<span class="live-need-adjust-card__title">' + title + '</span>' +
          '<button type="button" class="btn xs ghost live-need-adjust-card__reset">この1枚をリセット</button>' +
        '</header>' +
        (rows ? '<table class="live-need-adjust-card__tbl"><tbody>' + rows + '</tbody></table>' : '<p class="muted">必要ハートが定義されていません。</p>') +
      '</section>'
    );
  }

  function findLiveInstanceById(id) {
    if (!id) return null;
    var idStr = String(id);
    var areas = ["left", "center", "right"];
    for (var i = 0; i < areas.length; i++) {
      var a = state.liveArea[areas[i]] || [];
      for (var j = 0; j < a.length; j++) {
        if (a[j] && String(a[j].id) === idStr) return a[j];
      }
    }
    return null;
  }

  function bumpLiveNeedHeartDelta(instId, slotKey, step) {
    var inst = findLiveInstanceById(instId);
    if (!inst) return;
    if (!inst._needHeartDelta || typeof inst._needHeartDelta !== "object") inst._needHeartDelta = {};
    var cat = getCard(inst.card_no);
    var base = cat && cat.need_heart && typeof cat.need_heart === "object" ? cat.need_heart : {};
    var b = Number(base[slotKey]) || 0;
    var cur = Number(inst._needHeartDelta[slotKey]) || 0;
    /* UI 直感に合わせて、＋ボタンは effective を増やす方向（delta を +1）、
       −ボタンは effective を減らす方向（delta を -1）に対応させる。
       effective = max(0, b + delta) なので、delta は -b 以下にしない。 */
    var nextDelta = cur + (step > 0 ? +1 : -1);
    if (b + nextDelta < 0) nextDelta = -b;
    if (b + nextDelta > b + 9) nextDelta = 9;
    inst._needHeartDelta[slotKey] = nextDelta;
  }

  function resetLiveNeedHeartDeltaOne(instId) {
    var inst = findLiveInstanceById(instId);
    if (!inst) return;
    if (inst._needHeartDelta) delete inst._needHeartDelta;
  }

  function resetAllLiveNeedHeartDelta() {
    ["left", "center", "right"].forEach(function (k) {
      (state.liveArea[k] || []).forEach(function (inst) {
        if (inst && inst._needHeartDelta) delete inst._needHeartDelta;
      });
    });
  }

  /** ライブカードが解決ゾーン経由で控え室へ動くタイミングや盤面リセット時に呼ぶ */
  function clearAllLiveNeedHeartDeltaMarkers() {
    ["left", "center", "right"].forEach(function (k) {
      (state.liveArea[k] || []).forEach(function (inst) {
        if (inst && inst._needHeartDelta) delete inst._needHeartDelta;
      });
    });
  }

  $("btn-open-live-need-heart-adjust")?.addEventListener("click", function () {
    if (!state.liveStatsAfterBegin) {
      showToast("ライブ計算（ライブ開始後）モードのときに使えます");
      return;
    }
    openLiveNeedHeartAdjustDialog();
  });

  var liveAdjustBody = document.getElementById("dlg-live-need-heart-adjust-body");
  if (liveAdjustBody) {
    liveAdjustBody.addEventListener("click", function (ev) {
      var t = ev.target instanceof Element ? ev.target : null;
      if (!t) return;
      var row = t.closest(".live-need-adjust-row");
      if (row) {
        var instId = row.getAttribute("data-inst-id") || "";
        var slotKey = row.getAttribute("data-slot-key") || "";
        if (t.classList.contains("live-need-adjust-row__inc")) {
          pushHistoryBefore("live-need-heart-adjust");
          bumpLiveNeedHeartDelta(instId, slotKey, +1);
          renderLiveNeedHeartAdjustDialogBody();
          render();
          return;
        }
        if (t.classList.contains("live-need-adjust-row__dec")) {
          pushHistoryBefore("live-need-heart-adjust");
          bumpLiveNeedHeartDelta(instId, slotKey, -1);
          renderLiveNeedHeartAdjustDialogBody();
          render();
          return;
        }
      }
      var card = t.closest(".live-need-adjust-card");
      if (card && t.classList.contains("live-need-adjust-card__reset")) {
        var iid = card.getAttribute("data-inst-id") || "";
        pushHistoryBefore("live-need-heart-adjust-reset-one");
        resetLiveNeedHeartDeltaOne(iid);
        renderLiveNeedHeartAdjustDialogBody();
        render();
      }
    });
  }
  $("dlg-live-need-heart-adjust-reset")?.addEventListener("click", function () {
    pushHistoryBefore("live-need-heart-adjust-reset-all");
    resetAllLiveNeedHeartDelta();
    renderLiveNeedHeartAdjustDialogBody();
    render();
  });
  $("dlg-live-need-heart-adjust-close")?.addEventListener("click", function () {
    var dlg = document.getElementById("dlg-live-need-heart-adjust");
    if (dlg && typeof dlg.close === "function") dlg.close();
  });

  /* 後で resolution-flush 系で呼べるよう window 経由でも参照可能にする（fallback） */
  window.__llocgClearLiveNeedHeartDeltaMarkers = clearAllLiveNeedHeartDeltaMarkers;

  function doLiveTurnStart() {
    if (state.awaitingTurnStart && !(versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch))) {
      showToast("マリガン・ターン開始が終わってから使ってください");
      return;
    }
    if (versusMatchPhaseActive() && !isVersusLivePhase(versusSession.remoteMatch)) {
      showToast("ライブフェイズ中のみ使えます");
      return;
    }
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      var playRoleLiveStart = getVersusPlayRole();
      if (getVersusLiveStep(versusSession.remoteMatch) !== "set") {
        showToast("ライブカードセットフェイズでのみ使えます");
        return;
      }
      if (!playRoleLiveStart || !canRoleActInVersus(versusSession.remoteMatch, playRoleLiveStart)) {
        showToast("あなたのライブカードセット順番ではありません");
        return;
      }
    }
    if (state.liveTurnPickMode) return;
    pushHistoryBefore("live-turn-start");
    liveTurnStartGlowArmed = false;
    if (
      versusMatchPhaseActive() &&
      isVersusLivePhase(versusSession.remoteMatch) &&
      getVersusLiveStep(versusSession.remoteMatch) === "set"
    ) {
      var setCapKey = buildVersusPhaseAutoKey(versusSession.remoteMatch) + ":setCap";
      if (state._liveSetCapAppliedKey !== setCapKey) {
        state.liveSetCardCapPenalty = Math.max(
          0,
          Math.floor(Number(state.liveSetLimitPenaltyPending) || 0),
        );
        state.liveSetLimitPenaltyPending = 0;
        state._liveSetCapAppliedKey = setCapKey;
        if (state.liveSetCardCapPenalty > 0) {
          showToast("ライブセット上限が " + state.liveSetCardCapPenalty + " 枚減っています", {
            duration: 4000,
          });
        }
      }
    }
    state.liveTurnPickMode = true;
    state.liveTurnSelectedIds = [];
    state.liveTurnHandSpreadPick = state.hand.length >= LIVE_TURN_HAND_SPREAD_MIN;
    state.liveStatsAfterBegin = false;
    state.playLiveStartGlowActive = false;
    state.playLiveYellStarted = false;
    state.liveScoreEffectBonus = 0;
    state.ealeNoteLiveHitIds = [];
    state.ealeNoteLiveScorePoints = 0;
    state.pendingDrawYellHandDraws = 0;
    resetLiveSessionPlayEffectsAllZones();
    clearLiveSuccessEffectSchedule();
    lastLiveSuccessOrchestrateFp = "";
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
    var versusSetPhase =
      versusMatchPhaseActive() &&
      isVersusLivePhase(versusSession.remoteMatch) &&
      getVersusLiveStep(versusSession.remoteMatch) === "set";
    if (versusSetPhase) {
      var maxSetCap = Math.max(0, 3 - Math.floor(Number(state.liveSetCardCapPenalty) || 0));
      var curLiveSet = 0;
      ["left", "center", "right"].forEach(function (k) {
        (state.liveArea[k] || []).forEach(function (c) {
          if (c && c.type === T_LIVE) curLiveSet++;
        });
      });
      if (curLiveSet + ordered.length > maxSetCap) {
        showToast("ライブセット上限（" + maxSetCap + "枚）を超えられません");
        return;
      }
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

  function handleLiveTurnBeginClick() {
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      var step = getVersusLiveStep(versusSession.remoteMatch);
      if (step === "set") {
        doVersusLiveSetDone();
        return;
      }
      if (step === "perf") {
        if (state.liveStatsAfterBegin || !versusLiveSlotsHaveCards()) {
          doVersusLivePerfDone();
          return;
        }
        doLiveTurnBegin();
        return;
      }
      if (step === "successFx") {
        doVersusSuccessFxDone();
        return;
      }
      return;
    }
    doLiveTurnBegin();
  }

  function doLiveTurnBegin() {
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      var vStep = getVersusLiveStep(versusSession.remoteMatch);
      var playRoleBegin = getVersusPlayRole();
      if (vStep === "set") {
        showToast("セット完了ボタンで進めてください");
        return;
      }
      if (vStep !== "perf") {
        showToast("パフォーマンスフェイズ中のみライブ開始できます");
        return;
      }
      if (!playRoleBegin || !canRoleActInVersus(versusSession.remoteMatch, playRoleBegin)) {
        showToast("あなたのパフォーマンス順番ではありません");
        return;
      }
    } else {
      if (!state.liveTurnPickMode) return;
      if (versusMatchPhaseActive() && !isVersusLivePhase(versusSession.remoteMatch)) {
        showToast("ライブターン中のみライブ開始できます");
        return;
      }
    }
    pushHistoryBefore("live-turn-begin");
    clearTurnScopedPlayBonusesEverywhere();
    var movedNonLive = 0;
    ["left", "center", "right"].forEach(function (k) {
      const slot = state.liveArea[k];
      const kept = [];
      slot.forEach(function (c) {
        if (c.type === T_LIVE) {
          c.isRotated = false;
          c.lcWait = false;
          kept.push(c);
        } else {
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
    state.liveBladeManualAdjust = 0;
    state.ealeNoteLiveHitIds = [];
    state.ealeNoteLiveScorePoints = 0;
    state.pendingDrawYellHandDraws = 0;
    state.liveStatsAfterBegin = true;
    state.playLiveYellStarted = false;
    state.__liveYellWarnAck = false;
    activateLiveStartEffectsAfterBegin();
    logReplay("live-turn-begin", { nonLiveMoved: movedNonLive });
    showToast(
      movedNonLive
        ? "ライブ開始 — ライブカード以外を控え室へ送りました（" + movedNonLive + " 枚）"
        : "ライブターンを終了しました",
    );
    if (versusOnlineActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      flushVersusBoardPublicSync();
    } else if (versusDualBoardActive()) {
      persistVersusLocalDualActiveBoard();
    }
    render();
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      try {
        syncLiveTurnStatsPanel();
        syncLiveYellDrawButtons();
      } catch (_) {
        /* noop */
      }
    }
  }

  $("btn-live-turn-primary")?.addEventListener("click", function () {
    if (versusMatchPhaseActive() && isVersusLivePhase(versusSession.remoteMatch)) {
      var vStep = getVersusLiveStep(versusSession.remoteMatch);
      if (vStep === "set") {
        if (state.liveTurnPickMode) doLiveTurnToArea();
        else doLiveTurnStart();
        return;
      }
      if (vStep === "perf") {
        showToast("パフォーマンスは「ライブ開始」ボタンから進めてください");
        return;
      }
      return;
    }
    if (state.liveTurnPickMode) doLiveTurnToArea();
    else doLiveTurnStart();
  });
  $("btn-live-turn-begin")?.addEventListener("click", handleLiveTurnBeginClick);

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
    if (blockPlayActionsDuringEffectDialogPeek()) {
      effectDialogPeekBlockToast();
      return;
    }
    if (versusBlocksFreePlay()) {
      versusBlocksFreePlayToast();
      return;
    }
    tryReplenishDeckFromWaitingLoop();
    if (!state.deck.length) {
      showToast("デッキの上にカードがありません");
      return;
    }
    pushHistoryBefore("draw-res");
    var prevResLen = state.resolutionArea.length;
    var drawnR = state.deck.shift();
    /* ドロー BH のライブのみ、エール進行中に解決へめくったとき「ドロー+1」（ピンク）と待機ドロー計上。 */
    var inLive = state.liveStatsAfterBegin === true || state.liveTurnPickMode === true;
    if (inLive) markPlayLiveYellStarted();
    var drawYellBh = catalogLiveCardIsDrawYellBladeHeart(mergedCatalogCard(drawnR));
    if (inLive && drawYellBh) {
      markCardFlashDraw(drawnR, FLASH_LABEL_DRAW_YELL_PLUS_ONE);
      drawnR._flashYellKind = "draw_yell";
      state.pendingDrawYellHandDraws = Math.max(0, Math.floor(Number(state.pendingDrawYellHandDraws) || 0)) + 1;
    } else if (inLive) {
      flashResolutionYellCard(drawnR);
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
    if (versusOnlineActive()) {
      if (!state.deckPileFacesDown) {
        showToast("対戦中は山札を裏向きのままにしてください");
        return;
      }
      runVersusSensitiveBoardAction("deck_face_up", function () {});
      return;
    }
    pushHistoryBefore("deck-face-toggle");
    state.deckPileFacesDown = !state.deckPileFacesDown;
    render();
  });

  /** 「デッキ上に戻す」「戻してシャッフル」で、ドロー由来の手札カードを一緒に回収する */
  function harvestDrawYellHandCardsForReturn() {
    if (!Array.isArray(state.hand)) return [];
    var kept = [];
    var returned = [];
    for (var i = 0; i < state.hand.length; i++) {
      var c = state.hand[i];
      if (c && typeof c === "object" && c._fromDrawYellHand === true) {
        try {
          delete c._fromDrawYellHand;
          delete c._flashDrawAt;
          delete c._flashDrawLabel;
        } catch (_) {
          c._fromDrawYellHand = undefined;
          c._flashDrawAt = undefined;
          c._flashDrawLabel = undefined;
        }
        returned.push(c);
      } else {
        kept.push(c);
      }
    }
    state.hand = kept;
    return returned;
  }

  /** 別経路（控え送り・マリガン等）で解決エリアが空になった時点で、ドロー由来の手札マークも掃除 */
  function clearAllDrawYellHandMarkers() {
    if (!Array.isArray(state.hand)) return;
    for (var i = 0; i < state.hand.length; i++) {
      var c = state.hand[i];
      if (c && typeof c === "object" && c._fromDrawYellHand === true) {
        try {
          delete c._fromDrawYellHand;
        } catch (_) {
          c._fromDrawYellHand = undefined;
        }
      }
    }
  }

  $("btn-res-top")?.addEventListener("click", () => {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    runVersusSensitiveBoardAction("res_deck_top", function () {
      executeResToDeckTopCore();
    });
  });

  $("btn-res-shuf")?.addEventListener("click", () => {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    runVersusSensitiveBoardAction("res_deck_shuffle", function () {
      executeResDeckShuffleCore();
    });
  });

  $("btn-res-wait")?.addEventListener("click", () => {
    if (!state.resolutionArea.length) {
      showToast("解決エリアが空です");
      return;
    }
    pushHistoryBefore("res-to-wait");
    state.waitingRoom.push(...state.resolutionArea);
    state.resolutionArea = [];
    state.pendingDrawYellHandDraws = 0;
    clearAllDrawYellHandMarkers();
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
  $("btn-undo-under-prob")?.addEventListener("click", doUndo);

  $("btn-redo")?.addEventListener("click", doRedo);
  $("btn-redo-under-prob")?.addEventListener("click", doRedo);

  $("btn-help")?.addEventListener("click", () => {
    const dlg = document.getElementById("dlg-help");
    if (dlg && dlg.showModal) dlg.showModal();
  });

  $("btn-play-manual-mode")?.addEventListener("click", function () {
    togglePlayManualMode();
  });

  $("btn-play-lightweight")?.addEventListener("click", function () {
    togglePlayLightweightMode();
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
    try {
      var activePreset = localStorage.getItem(STORAGE_ACTIVE_PRESET_ID) || "";
      if (activePreset) prev = activePreset;
    } catch (_) {
      /* noop */
    }
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
    if (versusOnlineActive() && versusSession.myRole && versusSession.roomCode) {
      if (
        !confirm(
          "盤面リセットは投了と同じ扱いです。投了して相手の勝利にしますか？",
        )
      ) {
        return;
      }
      concedeVersusMatch(versusSession.roomCode, versusSession.myRole).catch(function (err) {
        showToast(String(err.message || err));
      });
      return;
    }
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
      playLiveStartGlowActive: false,
      playLiveYellStarted: false,
      liveScoreEffectBonus: 0,
      ealeNoteLiveHitIds: [],
    /** エール中に捲ったスコアライブの印刷スコア合計（成功判定表示中のみ加算） */
    ealeNoteLiveScorePoints: 0,
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

  document.getElementById("btn-versus-concede")?.addEventListener("click", function () {
    if (!versusSession) return;
    if (!confirm("投了を宣言しますか？（総合ルール 1.2.3 — 即座に敗北）")) return;
    if (versusSession.mode === "localDual" || versusSession.mode === "localPractice") {
      persistVersusLocalDualActiveBoard();
      state.versusMatchEnded = true;
      var concedeLabel = versusLocalDualRoleLabel(versusSession.activeRole || "host");
      var winLabel = versusLocalDualRoleLabel(versusLocalDualInactiveRole());
      showToast("「" + concedeLabel + "」が投了 — 「" + winLabel + "」の勝ち", { duration: 7000 });
      return;
    }
    if (!versusSession.myRole) return;
    concedeVersusMatch(versusSession.roomCode, versusSession.myRole).catch(function (err) {
      showToast(String(err.message || err));
    });
  });
  document.getElementById("btn-versus-lobby")?.addEventListener("click", function () {
    if (versusSession && versusSession.mode === "online" && versusSession.roomCode && versusSession.myRole) {
      try {
        flushPersistPlayResumeNow();
      } catch (_) {
        /* noop */
      }
      persistVersusOnlineSession(versusSession.roomCode, versusSession.myRole, false);
    }
    if (typeof onBackToDeck === "function") {
      onBackToDeck({ toVersusLobby: true });
      var dlg = document.getElementById("dlg-versus-lobby");
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
      return;
    }
    var dlg = document.getElementById("dlg-versus-lobby");
    if (dlg && typeof dlg.showModal === "function") dlg.showModal();
  });

  document.getElementById("btn-versus-end-turn")?.addEventListener("click", function () {
    doVersusEndTurnClick();
  });

  document.getElementById("btn-versus-dual-board-switch")?.addEventListener("click", function () {
    if (!versusSession || versusSession.mode !== "localPractice" || state.versusMatchEnded) return;
    var next = versusLocalDualInactiveRole();
    switchVersusLocalDualToRole(next);
    showToast("「" + versusLocalDualRoleLabel(next) + "」の盤面に切り替えました", { duration: 3500 });
  });

  document.getElementById("btn-versus-local-dual-end-switch")?.addEventListener("click", function () {
    var btn = document.getElementById("btn-versus-local-dual-end-switch");
    if (btn && btn.dataset.action === "switch-only") {
      var m = versusSession && versusSession.remoteMatch;
      if (m && (m.activePlayerRole === "host" || m.activePlayerRole === "guest")) {
        switchVersusLocalDualToRole(m.activePlayerRole);
        syncVersusLocalDualEndSwitchButton(m);
      }
      return;
    }
    doVersusLocalDualEndTurnAndSwitch();
  });

  $("btn-back-builder")?.addEventListener("click", () => {
    if (
      versusSession &&
      versusSession.mode === "online" &&
      versusSession.remoteMatch &&
      versusSession.remoteMatch.status === "playing" &&
      !state.versusMatchEnded
    ) {
      if (
        !confirm(
          "デッキ編集に戻りますか？\nルームから退出し、相手の勝ちになる場合があります（総合ルール 1.2.3 相当）。",
        )
      ) {
        return;
      }
    }
    teardownVersusSessionUi();
    if (typeof onBackToDeck === "function") onBackToDeck();
  });

  /** 見出しクリックの二重登録を防ぐため clone してから1本だけ束縛 */
  function rewireExpandableRailHead(headId, onActivate) {
    var old = document.getElementById(headId);
    if (!old || typeof onActivate !== "function") return;
    var fresh = old.cloneNode(true);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      onActivate(ev);
    });
    fresh.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      ev.stopPropagation();
      onActivate(ev);
    });
  }

  rewireExpandableRailHead("waiting-head-expand", toggleWaitingRailExpanded);
  rewireExpandableRailHead("preview-head-expand", togglePreviewRailExpanded);

  hideEffectDialogResumeChip();

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
        inst.isRotated = true;
        inst.lcWait = true;
        inst.lcActive = false;
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
      var wasActiveKb = inst.lcActive !== false && inst.lcWait !== true;
      pushHistoryBefore("keyboard-member-wait");
      inst.lcWait = true;
      inst.lcActive = false;
      inst.isRotated = true;
      if (wasActiveKb) {
        try {
          fireJidouAfterSelfActiveToWait(inst);
        } catch (jErr) {
          console.warn(jErr);
        }
      }
    } else {
      pushHistoryBefore("keyboard-member-active");
      inst.lcWait = false;
      inst.lcActive = true;
      inst.isRotated = false;
    }
    renderSynchronouslyOnce();
  };
  window.addEventListener("keydown", window.__llocgWaKeyHandler, true);

  /* カタログ詳細から「特殊ハート」分類が手動上書きされたら、各種パネルを再計算 */
  window.addEventListener("llocg:specialBhOverrideChanged", function () {
    try {
      syncDeckPickClassicOddsPanel();
    } catch (_) { /* noop */ }
    try {
      syncLiveTurnStatsPanel();
    } catch (_) { /* noop */ }
  });

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
  if (window.__llocgDeckPileResizeHandler) {
    window.removeEventListener("resize", window.__llocgDeckPileResizeHandler, { passive: true });
    if (window.visualViewport && window.__llocgDeckPileVvpHandler) {
      window.visualViewport.removeEventListener("resize", window.__llocgDeckPileVvpHandler, { passive: true });
    }
  }
  window.__llocgDeckPileResizeHandler = deckPileWindowResizeHandler;
  window.__llocgDeckPileVvpHandler = deckPileWindowResizeHandler;
  window.addEventListener("resize", window.__llocgDeckPileResizeHandler, { passive: true });
  if (typeof window.visualViewport !== "undefined" && window.visualViewport != null) {
    window.visualViewport.addEventListener("resize", window.__llocgDeckPileVvpHandler, { passive: true });
  }
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

  /** マウント途中で deck/hand が空になった場合の最終ガード（ソロ新規開始・古い resume 対策） */
  function ensurePlayDeckReadyBeforeFirstRender() {
    if (!Object.keys(activePlayDeckMap).length) return;
    if (
      versusSession &&
      versusSession.mode === "online" &&
      resumeFromStorage === true &&
      resumedFromStorage
    ) {
      return;
    }
    var deckLen = Array.isArray(state.deck) ? state.deck.length : 0;
    var handLen = Array.isArray(state.hand) ? state.hand.length : 0;
    if (deckLen > 0) {
      if (handLen === 0 && OPENING_HAND_SIZE > 0) {
        dealOpeningHand(state.deck, state.hand, OPENING_HAND_SIZE);
      }
      return;
    }
    state.deck = buildMainDeckInstances(activePlayDeckMap);
    if (versusSession && versusSession.mode === "online") {
      state.deckPileFacesDown = true;
    }
    state.hand = [];
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
  ensurePlayDeckReadyBeforeFirstRender();

  /** 同期レンダーで盤面・Sortable・+H/B を確実に有効化（初回のみ遅延すると操作が死ぬ） */
  renderSynchronouslyOnce();
  if (resumedFromStorage) {
    try {
      playResumeLastFp = fingerprintZonesFromLive();
    } catch (_) {
      /* noop */
    }
  }
  if (versusSession && versusSession.mode === "online") {
    syncVersusMatchBar(versusSession.remoteMatch);
    syncVersusPhaseLiveBanner(versusSession.remoteMatch);
    showVersusFirstPlayerBanner(versusSession.remoteMatch);
    updateVersusTurnGlow(versusSession.remoteMatch);
    versusPhaseAutoKey = buildVersusPhaseAutoKey(versusSession.remoteMatch);
    window.setTimeout(bootVersusOnlineSyncAfterMount, 0);
  }
  if (versusSession && (versusSession.mode === "localDual" || versusSession.mode === "localPractice")) {
    versusLocalDualBoards.host = buildOpeningBoardSnapshotForLocalDual(
      versusSession.hostDeckMap,
      versusSession.hostDeckRoleLabels,
    );
    versusLocalDualBoards.guest = buildOpeningBoardSnapshotForLocalDual(
      versusSession.guestDeckMap,
      versusSession.guestDeckRoleLabels,
    );
    var dualStartRole = versusSession.activeRole === "guest" ? "guest" : "host";
    if (versusSession.mode === "localDual") {
      var ldFp = versusSession.remoteMatch && versusSession.remoteMatch.firstPlayerRole;
      if (ldFp === "host" || ldFp === "guest") dualStartRole = ldFp;
    }
    versusSession.activeRole = dualStartRole;
    versusSession.myRole = dualStartRole;
    state.versusMyRole = dualStartRole;
    var dualSnap = versusLocalDualBoards[dualStartRole];
    if (dualSnap) {
      undoHistory.length = 0;
      redoHistory.length = 0;
      applyBoard(dualSnap);
      applyVersusLocalDualRoleMeta(dualStartRole);
    }
    versusSession.opponentName = versusLocalDualRoleLabel(
      dualStartRole === "host" ? "guest" : "host",
    );
    if (versusSession.mode === "localDual") {
      applyVersusPlayModeDefaults();
      ensureVersusUiChrome();
      if (versusSession.remoteMatch) {
        applyVersusPhaseFromRemote(versusSession.remoteMatch);
        syncVersusMatchBar(versusSession.remoteMatch);
        syncVersusPhaseLiveBanner(versusSession.remoteMatch);
        showVersusFirstPlayerBanner(versusSession.remoteMatch);
        updateVersusTurnGlow(versusSession.remoteMatch);
        versusPhaseAutoKey = buildVersusPhaseAutoKey(versusSession.remoteMatch);
        syncVersusTurnStartButton(versusSession.remoteMatch);
        syncVersusLocalDualEndSwitchButton(versusSession.remoteMatch);
      }
      showToast(
        "1人対戦: 開幕マリガンから開始。「ターン終了して〇〇に切り替え」で手番と盤面が切り替わります。",
        { duration: 8000 },
      );
    } else {
      showToast(
        "対戦練習: 上部の「〇〇に切替」でいつでも盤面を入れ替えられます。",
        { duration: 7000 },
      );
    }
    syncVersusLocalDualChrome();
  }
  try {
    if (
      window.__llocgReloadSnapPending &&
      typeof window.__llocgRestorePageReloadDialogs === "function"
    ) {
      window.__llocgRestorePageReloadDialogs(window.__llocgReloadSnapPending);
      delete window.__llocgReloadSnapPending;
    }
  } catch (_) {
    /* noop */
  }
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function () {
      updateHandZoneLayoutMode();
      updateWaitingZoneOverlapMode();
      updateResolutionZoneOverlapMode();
      deckPileScheduleLayoutRef();
    });
  }
  try {
    window.__lovecaGetPlayActiveDeckMap = function () {
      return normalizeDeckMapCounts(activePlayDeckMap);
    };
  } catch (_) {
    /* noop */
  }

  activePlayMountTeardown = function () {
    teardownVersusSessionUi();
    if (playResumePersistTimer) {
      clearTimeout(playResumePersistTimer);
      playResumePersistTimer = 0;
    }
    hideEffectDialogResumeChip();
    document.body.classList.remove("llocg-effect-dialog-peek");
  };
}
