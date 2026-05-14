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
 * 画面上の「カードデータ URL」項目は廃止したが、次のキーに保存された URL は引き続き読み込みに使う（手動で localStorage を触った場合など）。
 */
export const CARDS_JSON_URL = "https://raw.githubusercontent.com/wlt233/llocg_db/master/json/cards.json";

export const STORAGE_DECK = "llocg_deck";

/** 名前付きデッキ一覧（複数保存） */
export const STORAGE_DECK_LIBRARY = "llocg_deck_library";
/** プリセット上限（古い順に削除される） */
export const MAX_SAVED_DECKS = 24;
/** 最後に触ったプリセット slot id（読み込み選択の復元用） */
export const STORAGE_ACTIVE_PRESET_ID = "llocg_active_preset_id";
/** サンプル一覧の公開 JSON（index と同じ階層に置くファイル名）。無ければ組み込みサンプルを使用 */
export const SAMPLE_DECK_RECIPES_PUBLIC_FILENAME = "sample-deck-recipes.public.json";
/** カードDB の URL 上書き（UI からは変更不可。未設定・空なら既定 URL） */
export const STORAGE_CARDS_JSON_OVERRIDE = "llocg_cards_json_override";

/** カード一覧の「商品」絞り込み既定（DB の product と同一。無ければ「スタートデッキ」＋「ラブライブ」を含む商品。ページを開くたびに適用） */
export const FIRST_VISIT_CATALOG_PRODUCT_EXACT = "スタートデッキラブライブ！";

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
/** 初手マリガン実行時の「山札へ戻した枚数」（同一タブセッション。新規対戦でクリア） */
export const STORAGE_OPENING_MULLIGAN_K = "llocg_opening_mulligan_k";
/** 確率グリッドのベース k を、その記憶したマリガン枚数に固定するモード ON/OFF（"1"/"0"） */
export const STORAGE_DECK_ODDS_OPENING_MULL_MODEL = "llocg_deck_odds_open_mull_model";
/** 確率グリッド／要約で「しまっている」カテゴリ ID 一覧（key/key2/key3/mid/either/live/pick） */
export const STORAGE_DECK_ODDS_HIDDEN_CATS = "llocg_deck_odds_hidden_cats";
export const STORAGE_FIRST_PLAYER = "llocg_first_player";
/** プレイ画面: 側面エネルギーに使うカード番号（空で既定画像） */
export const STORAGE_PLAY_ENERGY_CARD_NO = "llocg_play_energy_card_no";
export const STORAGE_SNAPSHOT_PREFIX = "llocg_snapshot_";
/** プレイ画面: 再読み込み時に盤面・Undo 等を復元するセッション用バッファ */
export const STORAGE_PLAY_RESUME = "llocg_play_resume_v1";
/** プレイ画面: 手札・プレビュー配信隠しの濃さ 0〜1（sessionStorage 文字列） */
export const STORAGE_STREAM_MASK_STRENGTH = "llocg_stream_mask_strength";
/** デッキ構築: お気に入りカード番号（JSON 配列） */
export const STORAGE_CARD_FAVORITES = "llocg_card_favorites";

/** テストカード（オリカ）採用時に保存するログ（同一ブラウザの localStorage） */
export const STORAGE_TEST_CARD_LOG = "llocg_test_card_log_v1";
/** 初回の「ログに保存しますか」の結果のみ記録（"1"＝今後も保存／"0"＝今後も保存しない） */
export const STORAGE_TEST_CARD_LOG_SAVE_PREF = "llocg_test_card_log_save_pref_v1";

/**
 * カード一覧「商品」プルダウン用の疑似商品キー（DB の product とは別。検索・通常一覧では出さず、この項目を選ぶとログだけ表示）
 */
export const FILTER_PRODUCT_TEST_CARD_LOG = "__llocg_test_card_log__";

/** ミア・テイラー pb1-011 系（R / SEC 等同一扱い・下のエネ1枚につき常時ブレード） */
export function cardNoIsMiaTaylorPb1011(cardNo) {
  return /^PL!N-pb1-011-/i.test(String(cardNo || "").trim());
}

/** 鐘 嵐珠 bp1-012 系（R / P / SEC 等同一扱い・ライブ枠条件で ALLハートとブレード） */
export function cardNoIsZhongLanzhuBp1012(cardNo) {
  return /^PL!N-bp1-012-/i.test(String(cardNo || "").trim());
}

/** Undo 履歴の最大長 */
export const HISTORY_MAX_STEPS = 35;

/** 書き出し JSON の判別用（将来拡張） */
export const DECK_EXPORT_VERSION = 1;

/**
 * 組み込みプリセット・初回メインデッキ用（リポジトリ既定の大会用例。カード DB に番号が無い場合はデッキ構築で警告になります）
 */
export const BUILTIN_STARTER_PRESET_ID = "llocg-builtin-starter";
export const BUILTIN_STARTER_PRESET_NAME = "１０軸青紫ミラステ";

/** メンバー48＋ライブ12＝60 */
export const DEFAULT_STARTER_DECK_MAP = {
  "PL!-bp5-003-R＋": 2,
  "PL!-bp5-007-R": 1,
  "PL!-bp5-011-N": 4,
  "PL!HS-bp5-001-P": 1,
  "PL!HS-PR-022-PR": 4,
  "PL!N-bp1-003-R＋": 1,
  "PL!N-pb1-011-R": 4,
  "PL!S-bp2-009-R": 1,
  "PL!S-bp2-016-N": 4,
  "PL!S-bp5-111-R": 4,
  "PL!S-pb1-004-R": 1,
  "PL!S-PR-026-PR": 4,
  "PL!S-sd1-008-SD": 2,
  "PL!SP-bp2-019-N": 3,
  "PL!SP-bp5-001-R＋": 2,
  "PL!SP-bp5-006-R": 4,
  "PL!SP-pb1-014-N": 1,
  "PL!SP-sd1-003-SD": 1,
  "PL!SP-sd1-019-SD": 4,
  "PL!N-bp1-026-L": 1,
  "PL!N-bp3-030-L": 4,
  "PL!N-bp4-030-L": 4,
  "PL!N-bp5-027-L": 3,
};
/** キーライブ（枚数は deck 側。ここは識別用の card_no のみ） — Daydream Mermaid */
export const DEFAULT_STARTER_KEY_CARD_NOS = ["PL!N-bp4-030-L"];
/** ミラクル STAY TUNE！ */
export const DEFAULT_STARTER_KEY2_CARD_NOS = ["PL!N-bp5-027-L"];
/** １５コスト ミア・テイラー */
export const DEFAULT_STARTER_KEY3_CARD_NOS = ["PL!N-pb1-011-R"];
/** 中間（メンバー／ライブ）— Daydream Mermaid、１０コスト澁谷かのん、１０コスト桜坂しずく */
export const DEFAULT_STARTER_MIDDLE_CARD_NOS = ["PL!N-bp4-030-L", "PL!SP-bp5-001-R＋", "PL!N-bp1-003-R＋"];
/** プリセット一覧サムネ（デッキに収録されている番号） */
export const DEFAULT_STARTER_THUMBNAIL_CARD_NO = "PL!N-bp5-027-L";

/** 組み込みプリセット2 — ラブユーランジュ2611（メンバー48＋ライブ12） */
export const BUILTIN_LOVE_ORANGE_2611_PRESET_ID = "llocg-builtin-love-orange-2611";
export const BUILTIN_LOVE_ORANGE_2611_PRESET_NAME = "ラブユーランジュ2611";

export const DEFAULT_LOVE_ORANGE_2611_DECK_MAP = {
  "PL!-pb1-018-R": 2,
  "PL!N-bp1-002-P": 4,
  "PL!N-bp1-002-SEC": 4,
  "PL!N-bp1-003-SEC": 3,
  "PL!N-bp1-012-SEC": 4,
  "PL!N-bp3-004-P": 4,
  "PL!N-PR-009-PR": 4,
  "PL!N-PR-014-PR": 4,
  "PL!N-sd1-001-SD": 3,
  "PL!N-sd1-006-SD": 4,
  "PL!N-sd1-008-SD": 4,
  "PL!SP-bp2-002-R": 4,
  "PL!SP-sd1-020-SD": 4,
  "PL!N-bp1-026-L": 2,
  "PL!N-bp1-029-L": 4,
  "PL!N-bp3-030-L": 4,
  "PL!N-sd1-026-SD": 2,
};
/** キー — 中須かすみ（SEC） */
export const DEFAULT_LOVE_ORANGE_2611_KEY_CARD_NOS = ["PL!N-bp1-002-SEC"];
/** キー② — 鐘 嵐珠（SEC） */
export const DEFAULT_LOVE_ORANGE_2611_KEY2_CARD_NOS = ["PL!N-bp1-012-SEC"];
export const DEFAULT_LOVE_ORANGE_2611_KEY3_CARD_NOS = [];
/** 中間 — エマ・ヴェルデ、矢澤にこ */
export const DEFAULT_LOVE_ORANGE_2611_MIDDLE_CARD_NOS = ["PL!N-sd1-008-SD", "PL!-pb1-018-R"];
export const DEFAULT_LOVE_ORANGE_2611_THUMBNAIL_CARD_NO = "PL!N-bp1-002-SEC";

/** 初期エネルギートークン（公式サイトの SD エネ画像） */
export const DEFAULT_ENERGY_CARD_NO = "LL-E-001-SD";
export const DEFAULT_ENERGY_NAME = "エネルギー";
export const DEFAULT_ENERGY_IMG =
  "https://llofficial-cardgame.com/wordpress/wp-content/images/cardlist/PLSD01/LL-E-001-SD.png";

/** ドラッグ中の裏向きカード見た目（SVG data URL・著作物を含まない汎用裏） */
export const CARD_BACK_DRAG_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 88 126' preserveAspectRatio='xMidYMid meet'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' x2='100%25' y1='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23281830'/%3E%3Cstop offset='100%25' stop-color='%23401a42'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect rx='12' ry='12' fill='url(%23g)' stroke='rgba(255,150,210,0.25)' stroke-width='2.5' x='6' y='6' width='76' height='114'/%3E%3Crect rx='8' ry='8' fill='rgba(255,90,154,0.12)' stroke='rgba(255,180,210,0.2)' stroke-width='1.5' x='18' y='42' width='52' height='42'/%3E%3C/svg%3E";
