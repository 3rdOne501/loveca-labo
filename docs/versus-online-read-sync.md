# オンライン対戦 read 同期設計（VersusPublicBoard v2）

Phase 3（2026-07-02）: online で相手を「読む」能力（read_compare 系）が
ソロ入力ダイアログなしで判定できるよう、公開ボードに集計フィールドを追加した。
**書き込み（mutate）・相手選択 UI は Phase 4 で実装・実プレイ検証済み（§5）。**

- 実装: `js/versusBoardSync.js`（スキーマ）+ `js/simulator.js`（算出・参照）
- 関連: [versus-mode-implementation-plan.md](./versus-mode-implementation-plan.md) §2.1–2.3

---

## 1. VersusPublicBoard v2 フィールド定義

`VERSUS_BOARD_PUBLIC_V = 2`。追加はすべて**数値の集計**（カード実体は増やさない）。
算出は自盤 state から `computeVersusBoardAggregates()`（simulator.js）が行い、
`boardToVersusPublicFromState(st, aggregates)` の第2引数で載せる。

| フィールド | 意味 | 算出元（自盤 state） |
|-----------|------|---------------------|
| `liveFrameScore` | ライブ合計スコア（加点・常時込み） | `computeLiveFrameScoreParts().baseSum + liveScoreEffectBonus + joujiLiveScoreBonus`（下限0） |
| `liveFrameScoreBase` | 内訳: 印刷+カード個別加点 | `parts.baseSum` |
| `liveFrameScoreBonus` | 内訳: 効果+常時（負値あり ±99） | `liveScoreEffectBonus + joujiLiveScoreBonus` |
| `successLiveCount` | 成功ライブ置き場のライブ枚数 | `successLiveAreaLiveCardCount()` |
| `successLiveScoreSum` | 成功ライブ合計スコア（加点込み） | `successLiveAreaScoreSum()` |
| `stageHeartTotal` | ステージ総ハート（保持ハート） | 非 proxy メンバーの `memberHeldHeartCountBySlot` 合計 |
| `stageMemberCount` | ステージ人数（proxy 除く） | 非 proxy メンバー数 |
| `stageWaitCount` | ステージのウェイト人数 | 非 proxy かつ `lcWait === true` |
| `energyCount` | エネルギー枚数 | `energyArea.length` |

> **命名メモ**: 指示書の `opponentWaitCount` は「読み手にとっての相手ウェイト人数」。
> 公開ボードは**盤の持ち主視点**で書くため `stageWaitCount` と命名した（他フィールドと整合）。

一覧は `VERSUS_BOARD_AGGREGATE_FIELDS`（versusBoardSync.js）が正本。
正規化は `copyVersusBoardAggregates()`: 有限数のみコピー、`liveFrameScoreBonus` だけ負値許容。

## 2. v1 → v2 後方互換

- **読み**: `isAcceptableVersusBoardVersion(v)` で `1 <= v <= 2` を受理
  （`assemblePublicBoardFromMatchFields` / `normalizeVersusPublicBoard` / `fingerprintVersusPublicBoard`）。
  v1 ボードは集計フィールドが `undefined` のまま → 読み手側 fallback（下記 §3）。
- **書き**: 常に v2。`buildVersusBoardFirestorePatch` は `{pre}BoardPublic`（nested）と
  `{pre}BoardMeta`（flat）の両方に集計を書く。読取は meta 優先 → nested。
- **旧クライアント**が v2 ボードを読む場合: v1 厳格チェックのため公開ボード全体を破棄する
  （旧実装の `v !== 1` ガード）。read_compare はソロ fallback 相当になるが、クラッシュしない。
- `firestore.rules` はボードフィールドを検証しないため**ルール変更不要**。
- fingerprint v2: 集計数値も連結し、**配置が変わらないスコア加点だけの変化**でも push される。

## 3. read_compare が参照するフィールド対応表

すべて「v2 集計優先 → v1 fallback → ソロ入力」の3段。online ではダイアログを開かない
（`ensureSoloOpponent*` / `yellPreconditionNeedsSolo*` は online 時に即値返し）。

| 読取ヘルパー（simulator.js） | v2 フィールド | v1 fallback |
|------------------------------|--------------|-------------|
| `opponentLiveScoreEstimate()` | `liveFrameScore` | 公開ライブの印刷スコア合計 |
| `countOpponentSuccessLiveCards()` | `successLiveCount` | 公開 `successfulLiveArea` フィルタ → `versusOpponentSuccessLiveCount` |
| jouji ctx `opponentSuccessLiveScoreSum` | `successLiveScoreSum` | ソロ入力値 |
| `countOpponentEnergyCards()` / jouji ctx `opponentEnergyCount` | `energyCount` | 公開 `energyArea.length` |
| `opponentStageTotalHeldHeartCount()` | `stageHeartTotal` | 公開ステージの印刷スロット+bonusHearts 再計算 |
| jouji ctx `opponentStageWaitCount` | `stageWaitCount` | 公開ステージの `lcWait` カウント |
| jouji ctx `opponentStageMemberCount` | `stageMemberCount` | 公開ステージのメンバー数 |
| `soloOpponentHandCountForAbility()` | —（既存 `handCount`） | — |

パフォーマンス: `getVersusOpponentPublicBoardNow()` は `remoteMatch` の
オブジェクト identity でメモ化（常時評価から高頻度で呼ばれるため）。

## 4. push タイミング

- `renderNowImpl` → `scheduleVersusBoardPublicSync()`（280ms デバウンス）が基本経路
- ライブ開始（`doLiveTurnBegin`）/ ライブ判定後の成功ライブ移動 / 手札・控え室 reveal 窓で明示 flush
- `bumpLiveScoreEffectBonus()` は render を経ないことがあるため明示 `scheduleVersusBoardPublicSync()` を追加（Phase 3）
- fingerprint に集計が入ったため、スコアだけ変わるケースも差分検知される

## 5. Phase 4 — **実装済み**（2026-07-02）

相手盤への書き込み（mutate）と相手選択（choice）は
[versus-online-effect-protocol.md](./versus-online-effect-protocol.md) の
Peer-authoritative プロトコルで実装済み。

- `{pre}EffectRequest` / `{pre}EffectAck` / `{pre}ChoiceRequest` / `{pre}ChoiceResponse`
- `runOnTargetPlayerBoard("opponent")` の online 分岐は `onlineReq`（patchKind 付き）指定時にリクエスト送信
- requestId 冪等・120s タイムアウト・boardActionRequest との排他は実装済み
- 追加候補フィールド: `bonusHeartSurplusTotal`（余剰ハート合計）等、read 需要が出た時に v3 ではなく**同一 v2 に追記可能**（読み手は undefined fallback 前提のため）

## 6. Phase 5 — 常時効果（passive_track）の online 追従（2026-07-02）

localDual は `syncJoujiPassiveEffectsAll()` が非アクティブ盤を追従するが、online は相手盤を
直接持たない。以下で「相手の公開盤が更新されるたびに自盤の常時を再計算」する方式を採用。

### 再計算トリガー
- `applyVersusOpponentBoardFromRemote()` で相手公開盤の fingerprint 変化を検知した直後に
  `syncJoujiPassiveEffectsAll()` を実行。相手のウェイト増減・成功ライブ・エネルギー等が
  即座に自盤の常時ボーナス（ブレード/スコア/必要ハート）へ反映される。
- jouji ctx（`createJoujiBoardContext`）の opponent 系読み取りは online 分岐で
  `getVersusOpponentPublicBoardNow()` の v2 集計を参照。

### online 分岐を追加した ctx 読み取り（Phase 5）
| ctx 関数 | 参照する公開値 | 対象常時（代表） |
|----------|----------------|------------------|
| `eachOpponentStageColumnMemberInsts` | 公開ステージ→合成 inst | 両ステージ最多ハート / 両ステージコスト（PL!N-bp5-002 等） |
| `totalMembersBothStages` | `stageMemberCount` | 両ステージ合計人数（PL!N-PR-027 等） |
| `opponentExtraHeartSurplus` | `bonusHeartSurplusTotal`（新規 v2） | 相手余剰ハート（PL!S-bp5-008） |
| `inactiveOpponentJoujiLiveNeedHeartBump` | `imposeOpponentLiveNeedHeartDelta`（新規 v2） | **B型**: 相手が自分に課す必要ハート+1（PL!SP-bp2-010） |

### 新規 v2 集計フィールド
- `imposeOpponentLiveNeedHeartDelta`: 「この盤の持ち主が相手（=読み手）に課す必要ハート +N」。
  B型常時（相手デバフ）を peer が読む方式。発動側が `state.joujiOpponentLiveNeedHeartBump` を公開し、
  対象側が自分のライブ必要ハート集計に加算する。
- `bonusHeartSurplusTotal`: 自ステージのボーナス（余剰）ハート合計。

### 分類
- **A型（自盤 read）48件**: ctx online 分岐＋再計算トリガーで追従。
- **B型（相手 mutate）**: `PL!SP-bp2-010`（必要ハート+1）は上記 peer-read 方式で対応。
  `PL!HS-pb1-008`（相手アクティブ不可）は localDual でも未実装のため online も fallback 据え置き。

## 7. 運用メモ（Phase 6）

### 公開盤の push 頻度
- `scheduleVersusBoardPublicSync()` は 280ms デバウンス → `flushVersusBoardPublicSync()`。
- 明示 flush が要る箇所（render を経ないスコア変動等）は個別に `scheduleVersusBoardPublicSync()` /
  `flushVersusBoardPublicSync()` を呼ぶ（ライブ開始・reveal 窓・`bumpLiveScoreEffectBonus` 等）。
- `applyVersusEffectPatchLocally` は適用後に `render` + `syncJoujiPassiveEffectsAll` + `flushVersusBoardPublicSync` を実行し、
  対象側の変化を即公開する。

### fingerprint による差分検知
- `fingerprintVersusPublicBoard(board)` は turnCount / deckCount / handCount / 各ゾーンの id 列 /
  livePublicMode / **v2 集計フィールド（`VERSUS_BOARD_AGGREGATE_FIELDS`）** を連結。
- 集計を含むため、**カードの配置が変わらなくても数値（スコア・ウェイト数・`imposeOpponentLiveNeedHeartDelta` 等）が
  変われば push される**。新規 v2 フィールドを足すと自動で差分対象になる。
- 受信側 `applyVersusOpponentBoardFromRemote` も同じ fingerprint + `boardRev` で変化検知し、
  変化時のみ相手盤再描画＋常時再計算（Phase 5 トリガー）を行う。

### 常時（passive）の再計算タイミング
相手公開盤の変化検知時（受信側）と、自盤の操作後（`syncJoujiPassiveEffectsAll` を呼ぶ各所）。
online では相手盤を直接持たないため、この2経路で A 型常時を最新化する。
