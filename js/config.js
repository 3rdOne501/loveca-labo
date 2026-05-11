/**
 * ラブカ公式シミュ（参考: https://loveca-solo.pages.dev ）と同じ数値解釈
 */
export const MAIN_SIZE = 60;
export const MAX_MEMBER_IN_MAIN = 48;
export const MAX_LIVE_IN_MAIN = 12;
export const MAX_ENERGY_SIDE = 12;
/** 「次ターン」ボタン押下時に側面エネルギーへ加算する枚数（非公式・目安） */
export const ENERGY_CHARGE_PER_TURN = 1;

export const MAX_COPIES_PER_CARD = 4;
export const LIVE_WINS = 3;

/** プレイ開始・盤リセット時に山札からランダムで引く初期手札枚数 */
export const OPENING_HAND_SIZE = 6;

/** 「ライブターン開始」時に手札がこの枚数以上なら、選択モード中は手札を重ねず折り返し表示する */
export const LIVE_TURN_HAND_SPREAD_MIN = 7;

export const T_MEMBER = "メンバー";
export const T_LIVE = "ライブ";
export const T_ENERGY = "エネルギー";

/**
 * 公開カードDB
 * llofficial-cardgame.com から自動スクレイピング・日次コミットされる wlt233/llocg_db を既定にしている。
 * loveca-solo.pages.dev/data/cards.json に戻したいときは
 * 設定の「カードDB URL 上書き」で変更可能（STORAGE_CARDS_JSON_OVERRIDE）。
 */
export const CARDS_JSON_URL = "https://raw.githubusercontent.com/wlt233/llocg_db/master/json/cards.json";

export const STORAGE_DECK = "llocg_deck";

/** 名前付きデッキ一覧（複数保存） */
export const STORAGE_DECK_LIBRARY = "llocg_deck_library";
/** プリセット上限（古い順に削除される） */
export const MAX_SAVED_DECKS = 24;
/** 最後に触ったプリセット slot id（読み込み選択の復元用） */
export const STORAGE_ACTIVE_PRESET_ID = "llocg_active_preset_id";

/** カードDB の URL を上書き（空なら既定） */
export const STORAGE_CARDS_JSON_OVERRIDE = "llocg_cards_json_override";
/** レギュ・禁止メモ（デッキ構築用・任意） */
export const STORAGE_REGULATION_NOTE = "llocg_regulation_note";
/** プレイ時メモ / カウンタ（後方互換・未使用） */
export const STORAGE_PLAY_MEMO = "llocg_play_memo";
export const STORAGE_PLAY_COUNTERS = "llocg_play_counters";
/** プレイ画面「山札から選択」のチェック状態（セッション用） */
export const STORAGE_DECK_PICK_SELECTED = "llocg_deck_pick_selected";
/** 山札確率パネル「捲る枚数」の手動既定（マリガン／ライブ選択時は自動で上書き） */
export const STORAGE_DECK_ODDS_K = "llocg_deck_odds_k";
/** 山札確率グリッド: 各ターンで追加で見える枚数（1T〜5T、各 2〜4、既定 4）と 4T/5T 行の表示 */
export const STORAGE_DECK_ODDS_TURN_STEPS = "llocg_deck_odds_turn_steps";
/** 山札確率: 「2かすみ」前提（上3枚見て送る／手札反映は 1T 後としてグリッドに反映） */
export const STORAGE_DECK_ODDS_2KASUMI = "llocg_deck_odds_2kasumi";
/** 山札確率: 「13曜」前提（上7枚見て3枚回収＝見た7枚分をいまの k に加算） */
export const STORAGE_DECK_ODDS_13YOU = "llocg_deck_odds_13you";
/** 確率グリッド／要約で「しまっている」カテゴリ ID 一覧（key/key2/key3/mid/either/live/pick） */
export const STORAGE_DECK_ODDS_HIDDEN_CATS = "llocg_deck_odds_hidden_cats";
export const STORAGE_FIRST_PLAYER = "llocg_first_player";
/** プレイ画面: 側面エネルギーに使うカード番号（空で既定画像） */
export const STORAGE_PLAY_ENERGY_CARD_NO = "llocg_play_energy_card_no";
export const STORAGE_SNAPSHOT_PREFIX = "llocg_snapshot_";

/** Undo 履歴の最大長 */
export const HISTORY_MAX_STEPS = 35;

/** 書き出し JSON の判別用（将来拡張） */
export const DECK_EXPORT_VERSION = 1;

/**
 * 組み込みプリセット・初回メインデッキ用（cards.js が注入するテストカードのみ使用。公式 DB と衝突しにくい）
 */
export const BUILTIN_STARTER_PRESET_ID = "llocg-builtin-starter";
export const BUILTIN_STARTER_PRESET_NAME = "初期デッキ（共通・サンプル60）";

function buildDefaultStarterDeckMap() {
  /** @type {Record<string, number>} */
  const map = {};
  for (let i = 1; i <= 12; i++) {
    map["LL-TA-" + String(i).padStart(2, "0")] = 4;
  }
  for (let i = 1; i <= 3; i++) {
    map["LL-TL-" + String(i).padStart(2, "0")] = 4;
  }
  return map;
}

/** メンバー48＋ライブ12＝60（常にカタログに存在するテスト枠） */
export const DEFAULT_STARTER_DECK_MAP = buildDefaultStarterDeckMap();
export const DEFAULT_STARTER_KEY_CARD_NOS = ["LL-TA-01", "LL-TA-02", "LL-TA-03"];
export const DEFAULT_STARTER_KEY2_CARD_NOS = ["LL-TL-01"];
export const DEFAULT_STARTER_KEY3_CARD_NOS = [];
export const DEFAULT_STARTER_MIDDLE_CARD_NOS = ["LL-TA-04", "LL-TA-05"];

/** 初期エネルギートークン（公式サイトの SD エネ画像） */
export const DEFAULT_ENERGY_CARD_NO = "LL-E-001-SD";
export const DEFAULT_ENERGY_NAME = "エネルギー";
export const DEFAULT_ENERGY_IMG =
  "https://llofficial-cardgame.com/wordpress/wp-content/images/cardlist/PLSD01/LL-E-001-SD.png";

/** ドラッグ中の裏向きカード見た目（SVG data URL・著作物を含まない汎用裏） */
export const CARD_BACK_DRAG_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 88 126' preserveAspectRatio='xMidYMid meet'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' x2='100%25' y1='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23281830'/%3E%3Cstop offset='100%25' stop-color='%23401a42'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect rx='12' ry='12' fill='url(%23g)' stroke='rgba(255,150,210,0.25)' stroke-width='2.5' x='6' y='6' width='76' height='114'/%3E%3Crect rx='8' ry='8' fill='rgba(255,90,154,0.12)' stroke='rgba(255,180,210,0.2)' stroke-width='1.5' x='18' y='42' width='52' height='42'/%3E%3C/svg%3E";
