# 対戦モード実装計画

対戦モード（localDual / オンライン）を本格化するときの作業計画。  
相手盤面効果の全件台帳は [opponent-board-effects-registry.md](./opponent-board-effects-registry.md) を参照。

- レジストリ再生成: `node scripts/audit-opponent-board-effects.mjs`
- デュアル高リスク監査: `node scripts/audit-dual-mode-gaps.mjs`
- デュアルスモーク（代表16枚）: `node scripts/verify-dual-mode-smoke.mjs`

---

## 1. 現状サマリ（2026-06-28）

| レイヤ | 状態 |
|--------|------|
| **ソロ** | 相手代行ダイアログで215枚分の相手参照が概ね動作 |
| **localDual** | 共有ヘルパー（`runOnTargetPlayerBoard` 等）で214能力が `dual_ok` 判定 |
| **常時（passive_track）** | 50能力。相手成功ライブ枚数・相手ライブ必要ハート等を**常時追跡**する必要 |
| **オンライン** | 公開情報のみ同期。ライブスコア加点・常時効果は未同期の可能性大 |

`dualStatus: dual_gap` はレジストリ監査上 **0件**（2026-06-28 修正。以前の3件は `preconditionFilters` 未参照による誤検知だった）。

---

## 2. 旧 dual_gap 3件 — 詳細と対応方針

いずれも template `yell_resolution_pick_hand`。相手条件は **`preconditionFilters`** に入り、本体ハンドラは `checkYellRevealedPreconditionFilters` → `checkAbilityBoardPickFilters` に委譲。**デュアル盤では shared helper 経由で相手盤を読む実装済み**。ソロのライブスコア参照バグは 2026-06-23 に修正済み（[play-verification-list.md](./play-verification-list.md) B節）。

### 2.1 PL!HS-cl1-012-CL — Edelied

| 項目 | 内容 |
|------|------|
| 能力文 | 自分と相手のライブ合計スコアが**同点**の場合、エール公開からコスト9+メンバー1枚手札 |
| 分類 | `preconditionFilters.requiresLiveScoreTieWithOpponent` |
| ソロ | 発動前に「相手ライブ合計スコア」入力ダイアログ（`ensureSoloOpponentLiveFrameScore`） |
| デュアル | `opponentLiveScoreEstimate()` → 非アクティブ盤の `computeLiveFrameScoreParts()` |
| オンライン | 公開ライブの**印刷スコア合計のみ**。加点・常時ボーナスは未反映の可能性 |

**やること（優先度）**

1. **P1 デュアル手動確認**: 両盤でライブフレームスコアを同点にし、エール回収が発動すること
2. **P2 オンライン**: 相手ライブフレームスコア（加点込み）の同期設計 — **[x] 2026-07-02 v2 `liveFrameScore` 同期実装**（[versus-online-read-sync.md](./versus-online-read-sync.md)）
3. **P3 回帰**: `verify-dual-mode-smoke.mjs` に既登録（`requiresLiveScoreTieWithOpponent`）。デュアル実プレイ1回で十分

**コード触るなら**: `yell_resolution_pick_hand` 本体ではなく `opponentLiveScoreEstimate()` のオンライン分岐（`versusBoardSync` 側）

---

### 2.2 PL!N-bp1-026-L — Poppin' Up!

| 項目 | 内容 |
|------|------|
| 能力文 | ライブ合計スコアが相手**より高い**場合、エール公開から『虹ヶ咲』1枚手札 |
| 分類 | `preconditionFilters.requiresLiveScoreHigherThanOpponent` |
| ソロ / デュアル / オンライン | 2.1 と同型（条件が「より高い」のみ異なる） |

**やること**

1. **P1 デュアル手動確認**: 自スコア > 相手スコア → 虹ヶ咲回収。同点・逆転で不発
2. **P2 オンライン**: 2.1 と同じスコア同期課題 — **[x] 2026-07-02 v2 `liveFrameScore` 同期実装**
3. **P3 回帰**: スモーク登録済み（`PL!N-bp1-026-L` / `requiresLiveScoreHigherThanOpponent`）

---

### 2.3 PL!S-bp5-019-L — not ALONE not HITORI

| 項目 | 内容 |
|------|------|
| 能力文 | **自分か相手**の成功ライブ置き場が2枚以上 → エール公開からメンバー2枚まで手札 |
| 分類 | `preconditionFilters.minEitherSuccessLiveCount: 2` |
| ソロ | 自成功ライブ < 2 かつ相手枚数未入力なら `ensureSoloOpponentSuccessLiveCount` ダイアログ |
| デュアル | `countOpponentSuccessLiveCards()` → `readInactiveOpponentBoard` |
| オンライン | `versusOpponentSuccessLiveCount` または公開 `successfulLiveArea` |

**やること**

1. **P1 デュアル手動確認**: 相手成功ライブのみ2枚でも発動。自2枚以上ならダイアログ不要
2. **P2 オンライン**: 成功ライブ枚数のリアルタイム同期 — **[x] 2026-07-02 v2 `successLiveCount`/`successLiveScoreSum` 同期実装**
3. **P3 回帰**: スモーク登録済み（`min_either_success_live`）

---

### 2.4 横展開メモ（yell_resolution_pick_hand 全般）

同 template で相手参照があるカードは他にも存在する。上記3件を直す／確認すれば **template 単位で横展開**できる。

| 共通処理 | ファイル目安 |
|----------|-------------|
| 前提判定 | `checkAbilityBoardPickFilters`（`simulator.js`） |
| ソロ入力 | `ensureSoloOpponentLiveFrameScore` / `ensureSoloOpponentSuccessLiveCount` |
| デュアル読取 | `opponentLiveScoreEstimate` / `countOpponentSuccessLiveCards` |
| オンライン | `getVersusOpponentPublicBoardNow` + 同期フィールド拡張 |

---

## 3. bp2 / bp3 対戦テスト計画

検証済み6セットのうち、**相手盤面に関わる代表20ケース**（レア違いは代表ID1つのみ）。  
Hasunosora bp2 は該当なし。

### 凡例

| 列 | 意味 |
|----|------|
| **P** | 優先度（1=必須, 2=常時系, 3=余力） |
| **ソロ** | 相手代行入力で確認する要点 |
| **デュアル** | 2盤面で確認する要点 |
| **オンライン** | H=要同期設計, L=公開情報で足りる可能性, —=対象外 |

---

### 3.1 Liella bp2（PL!SP-bp2）— 6ケース

| P | 代表ID | 名前 | タイミング | template | 相手との関わり | ソロ確認 | デュアル確認 | オンライン |
|---|--------|------|------------|----------|----------------|----------|--------------|------------|
| 2 | PL!SP-bp2-010-P | ウィーン | 常時 | passive_track | 相手ライブ置き場の必要ハート+1 | 相手ライブ置き場にライブ→必要ハート増 | 非アクティブ盤ライブの必要ハートが増える | H |
| 1 | PL!SP-bp2-011-P | 鬼塚冬毬 | 登場 | toujou_wait_pick_opp_live | 相手がライブ1枚選択 | 異名ライブ2枚提示→「ソロ:相手として」1枚選択→手札 | **非アクティブ側**が2枚から1枚選択 | H |
| 1 | PL!SP-bp2-023-L | Go!! リスタート | ライブ開始 | live_card_score_plus | 自成功ライブ < 相手成功ライブ | 相手成功ライブ枚数入力→+1 | 相手成功ライブ2枚・自0枚→+1 | L |
| 1 | PL!SP-bp2-024-L | ビタミンSUMMER！ | ライブ成功 | live_card_score_plus | 自手札 > 相手手札 | 相手手札枚数入力→+1 | 相手手札3・自4→+1 | L |

※ 025 Bubble Rise はエール回収のみで相手参照なし → 本計画対象外

---

### 3.2 Aqours bp2（PL!S-bp2）— 1ケース

| P | 代表ID | 名前 | タイミング | template | 相手との関わり | ソロ確認 | デュアル確認 | オンライン |
|---|--------|------|------------|----------|----------------|----------|--------------|------------|
| 2 | PL!S-bp2-001-P | 高海千歌 | 常時 | passive_track | 自成功0 & 相手成功1+ → ブレード3 | 相手成功ライブ1枚入力→ブレード3 | 相手成功ライブ1枚のみ→ブレード3付与 | H |

---

### 3.3 Hasunosora bp2（PL!HS-bp2）

相手盤面効果 **0件**。対戦テスト追加不要。

---

### 3.4 Nijigasaki bp3（PL!N-bp3）— 5ケース

| P | 代表ID | 名前 | タイミング | template | 相手との関わり | ソロ確認 | デュアル確認 | オンライン |
|---|--------|------|------------|----------|----------------|----------|--------------|------------|
| 1 | PL!N-bp3-010-P | 三船栞子 | ライブ開始 | live_start_pick_player_waiting_deck_bottom | **自分か相手**の控え室→山札下 | 「自分/相手」選択→控え室1枚山札下 | 非アクティブ盤の控え室から選べる | H |
| 1 | PL!N-bp3-011-P | ミア・テイラー | 登場 | toujou_opp_stage_member_match_grant | 相手ステージの同名メンバーに付与 | 相手ステージ同名→heart付与 | 非アクティブ盤ステージを直接変更 | H |
| 1 | PL!N-bp3-017-N | 宮下愛 | 登場 / LS | optional_self_wait_opp_stage | 自ウェイト任意→相手コスト4以下ウェイト | 自ウェイト→相手メンバー選択 | 非アクティブ盤でウェイト化 | H |
| 1 | PL!N-bp3-023-N | ミア・テイラー | 登場 / LS | optional_self_wait_opp_stage | 同上 | 同上 | 同上 | H |

---

### 3.5 Aqours bp3（PL!S-bp3）— 6ケース

| P | 代表ID | 名前 | タイミング | template | 相手との関わり | ソロ確認 | デュアル確認 | オンライン |
|---|--------|------|------------|----------|----------------|----------|--------------|------------|
| 1 | PL!S-bp3-002-P | 桜内梨子 | ライブ成功 | yell_resolution_pick_self_score | 自ライブスコア > 相手 | 相手スコア入力→エール回収 | 相手スコアより高い→回収 | H |
| 1 | PL!S-bp3-005-P | 渡辺曜 | ライブ成功 | draw_from_deck | 条件に相手参照（手札等） | 条件成立で1ドロー | デュアル盤で条件自動判定 | L |
| 1 | PL!S-bp3-007-P | 国木田花丸 | 起動 | draw_from_deck | 相手山札からも引く効果 | 相手ドロー枚数入力 | 非アクティブ盤の山札が減る | H |
| 1 | PL!S-bp3-012-N | 松浦果南 | 登場 / LS | optional_self_wait_opp_stage | 相手ステージウェイト | 自ウェイト任意→相手ウェイト | 非アクティブ盤操作 | H |
| 1 | PL!S-bp3-017-N | 小原鞠莉 | 登場 / LS | optional_self_wait_opp_stage | 同上 | 同上 | 同上 | H |
| 1 | PL!S-bp3-024-L | Deep Resonance | ライブ開始 | ability_pick_one | 選択肢に相手ステージ操作 | 選択肢から相手ウェイト等 | 非アクティブ側の選択UI | H |

---

### 3.6 µ's bp3（PL!-bp3）— 4ケース

| P | 代表ID | 名前 | タイミング | template | 相手との関わり | ソロ確認 | デュアル確認 | オンライン |
|---|--------|------|------------|----------|----------------|----------|--------------|------------|
| 1 | PL!-bp3-002-P | 絢瀬絵里 | 登場 | optional_self_wait_opp_stage | 相手コスト4以下2人ウェイト | 手札捨て任意→相手2人ウェイト | 非アクティブ盤で2人まで | H |
| 2 | PL!-bp3-002-P | 絢瀬絵里 | 常時 | passive_track | 相手ウェイト1人につき効果 | 相手ウェイト人数反映 | 非アクティブ盤ウェイト数 | H |
| 1 | PL!-bp3-022-L | ユメノトビラ | ライブ開始 | live_start_deck_reveal_both_stage_members_score | 両ステージ人数分公開→スコア+ | 相手ステージ人数入力 | 相手ステージメンバー数を自動カウント | H |
| 1 | PL!-bp3-026-L | Oh,Love&Peace! | ライブ成功 | live_card_score_plus | 自ハート総数 > 相手 | 相手ハート総数入力→+1 | 非アクティブ盤ハート合計と比較 | H |

---

### 3.7 Nijigasaki bp4（PL!N-bp4 / SAPPHIREMOON）— 8ケース

| P | 代表ID | 名前 | タイミング | template | 相手との関わり | ソロ確認 | デュアル確認 | オンライン |
|---|--------|------|------------|----------|----------------|----------|--------------|------------|
| 1 | PL!N-bp4-001-P | 上原歩夢 | ライブ成功 | energy_less_than_opponent_wait | 自E < 相手E | 相手E枚数入力→EDK1枚 | 非アクティブ盤E枚数と比較 | L |
| 1 | PL!N-bp4-002-P | 中須かすみ | ライブ開始 | live_start_pick_player_deck_top_peek | **自分か相手**の山札上 | プレイヤー選択→見て控え optional | 非アクティブ盤山札上 | H |
| 1 | PL!N-bp4-003-P | 桜坂しずく | ライブ成功 | draw_from_deck | ライブスコア > 相手 | 相手スコア入力→1ドロー | スコア自動比較 | H |
| 1 | PL!N-bp4-004-P | 朝香果林 | ライブ開始 | live_start_draw_opp_wait + waiting_to_deck_top_by_opp_wait_count | 相手ウェイト＋人数参照 | 相手1人ウェイト→人数分メンバー山札上 | 非アクティブ盤操作 | H |
| 1 | PL!N-bp4-005-P | 宮下愛 | 登場 | optional_self_wait_opp_stage | 相手コスト4以下2人ウェイト | 自ウェイト任意→相手2人 | 非アクティブ盤ウェイト | H |
| 1 | PL!N-bp4-007-P | 優木せつ菜 | 登場/常時/成功 | both系3能力 | **両者**ライブ回収・E合計15+・両者EDK | 各ダイアログ/両盤 | 非アクティブ盤を直接変更 | H |
| 1 | PL!N-bp4-009-P | 天王寺璃奈 | ライブ開始 | draw_from_deck | 自コスト合計 < 相手 | 相手コスト合計入力 | 自動比較 | L |
| 2 | PL!N-bp4-012-P | 鐘嵐珠 | 常時 | passive_track | 相手成功ライブスコア6+ | 相手成功ライブ合計入力 | 非アクティブ成功ライブ合計 | H |

---

## 4. 推奨テスト順（フェーズ）

```mermaid
flowchart TD
  A[Phase 0: スモーク] --> B[Phase 1: P1 デュアル手動 20ケース]
  B --> C[Phase 2: 常時 passive_track 7ケース]
  C --> D[Phase 3: オンライン同期設計]
  D --> E[Phase 4: 全レジストリ214 dual_ok]
```

| Phase | 内容 | 完了条件 |
|-------|------|----------|
| **0** | `verify-dual-mode-smoke.mjs` + セット別 `verify-*-bp*.mjs` | CI 緑 |
| **1** | 上表 P1 のデュアル盤手動（20ケース） | チェックリスト `[x]`（✅ 2026-07-02） |
| **2** | P2 常時効果（010ウィーン、001千歌、002絵里常時等） | 両盤で常時が追従（✅ localDual 2026-07-02） |
| **3** | オンライン: スコア・成功ライブ・手札枚数・ステージ変更の同期 | 公開/非公開の設計ドキュメント（✅ read-sync v2） |
| **4** | online mutate/choice プロトコル（代表4 template） | 実プレイ 4件 + タイムアウト（✅ 2026-07-02） |
| **5** | passive online 同期 + patchKind 横展開（15種） | コード + smoke 86（✅ コード / 実プレイ手動は保留） |
| **6** | 運用・耐久・リリース準備（CI static・フォールバック棚卸し・UX・docs・ユーザーガイド） | **コード/CI/docs 完了（2026-07-03）**。フルマッチ3・耐久4・手動回帰は**実プレイ検証保留** |

> リリース判定は Phase 6 の**実プレイ検証（フルマッチ3シナリオ・耐久4項目）完了後**。現時点はコード面・静的 CI・ドキュメントが整い、2ブラウザ手動検証が残る。

---

## 5. 実装タスク分解（対戦本格化時）

| # | タスク | 触るファイル目安 | 依存 |
|---|--------|-------------------|------|
| 1 | デュアル P1 手動20件の結果を本ドキュメントに `[x]` 記録 | 本ファイル | — |
| 2 | `verify-dual-mode-smoke.mjs` に bp2/bp3 代表を追加（011冬毬、010栞子、022ユメノトビラ等） | `scripts/verify-dual-mode-smoke.mjs` | Phase 1 |
| 3 | 常時効果の非アクティブ盤同期（`syncJoujiPassiveEffectsAll`） | `simulator.js`, `joujiEffects.js` | Phase 2 |
| 4 | オンライン: ライブフレームスコア（加点込み）同期 | `versusBoardSync.js`, `versusMatch.js` | Phase 3 |
| 5 | オンライン: 相手選択 UI（011冬毬等）のリモート意思決定 | `versusMode.js` | Phase 3 |
| 6 | レジストリを CI に組込（生成 + 件数下限） | `verify-ability-coverage.mjs` | 任意 |

---

## 6. チェックリスト（Phase 1 手動）

実施したら `[ ]` → `[x]` に変更。**2026-07-02 全20件完了**（テンプレ修正: async ダイアログ×相手盤ミューテーション分離、jouji スナップショット永続化、swapActiveSnap 導入）。

### Liella bp2
- [x] PL!SP-bp2-011-P デュアル: 相手選択
- [x] PL!SP-bp2-023-L デュアル: 成功ライブ枚数比較
- [x] PL!SP-bp2-024-L デュアル: 手札枚数比較

### Aqours bp2
- [x] PL!S-bp2-001-P デュアル: 常時ブレード3

### Niji bp3
- [x] PL!N-bp3-010-P デュアル: 自分/相手の控え室
- [x] PL!N-bp3-011-P デュアル: 相手ステージ同名付与
- [x] PL!N-bp3-017-N デュアル: optional_self_wait_opp_stage

### Aqours bp3
- [x] PL!S-bp3-002-P デュアル: ライブスコア比較
- [x] PL!S-bp3-007-P デュアル: 相手山札から引く
- [x] PL!S-bp3-024-L デュアル: ability_pick_one 相手枝

### µ's bp3
- [x] PL!-bp3-002-P デュアル: 相手2人ウェイト
- [x] PL!-bp3-022-L デュアル: 両ステージ人数公開
- [x] PL!-bp3-026-L デュアル: ハート総数比較

### 旧 dual_gap（横展開確認）
- [x] PL!HS-cl1-012-CL デュアル: ライブスコア同点
- [x] PL!N-bp1-026-L デュアル: ライブスコアより高い
- [x] PL!S-bp5-019-L デュアル: どちらか成功ライブ2+

### Niji bp4（SAPPHIREMOON）
- [x] PL!N-bp4-001-P デュアル: エネルギー枚数比較
- [x] PL!N-bp4-002-P デュアル: 自分/相手の山札上peek
- [x] PL!N-bp4-004-P デュアル: 相手ウェイト→山札上枚数
- [x] PL!N-bp4-007-P デュアル: 両者ライブ回収 / 両者EDK
- [x] PL!N-bp4-012-P デュアル: 相手成功ライブスコア6+

## 6.5 チェックリスト（Phase 4 online 手動 — 2ブラウザ）

コード実装は 2026-07-02 完了（[versus-online-effect-protocol.md](./versus-online-effect-protocol.md)）。
**ゲスト（匿名）ログイン対応済み**のため Google アカウント不要。2タブ（別オリジン、例: `localhost:8125` と `localhost:8126`）で実施できる。

### プロトコル層 E2E（実 Firestore・2クライアント）— 2026-07-02 実施済み ✅

- [x] ゲスト匿名ログイン → ルーム作成/参加/対戦開始（host/guest 別 UID）
- [x] EffectRequest `deck_draw_top` → 対象側自動適用（手札6→7）→ ack `{ok:true, applied:1}` → resolved
- [x] ChoiceRequest → 対象側 `#dlg-versus-remote-choice` 表示 → 選択 → ChoiceResponse `{pickedIds}` → resolved
- [x] 冪等: 同一 requestId の再 snapshot で二重適用なし（手札 7 のまま）
- [x] cancel 経路: pending → cancelled / 不明 patchKind → ack `{ok:false}`・盤面無変化

### 実カード盤面フロー（対象カード入りデッキで実プレイ）— 2026-07-02 実施済み ✅

実 Firestore・匿名2クライアント（`localhost:8125` host / `localhost:8126` guest）、対象4種入り 60 枚デッキで実プレイ（ルーム KEVQ）。

- [x] PL!N-bp3-017-N online: guest 登場→コスト支払い→ host 公開ステージから宮下愛（cost4）を選択 → host 盤で自動ウェイト（rotated）・`stageWaitCount` 0→1・ack `{ok:true, applied:1}`
- [x] PL!N-bp3-011-P online: host 登場 → guest 公開ステージ（ルビィ/果南）から選択 → heart06 一致判定 → host ミアにブレード2（read_compare のみ・相手盤無変更）
- [x] PL!N-bp3-010-P online: host ライブ開始で live_start 誘発 →「相手」選択 → guest 公開控え室のメンバーのみ2枚選択 → guest 盤で控え室5→3・山札 46 に自動移動・ack `{ok:true, applied:2}`
- [x] PL!SP-bp2-011-P online: host 控え室の異名ライブ2枚選択 → guest に `#dlg-versus-remote-choice`（2択）→ guest が1枚選択 → host 手札に自動追加・控え室から除去
- [x] タイムアウト: guest 切断（タブ離脱）中に host が `waiting_to_deck_bottom` 送信 → 120s 後 request `cancelled`・待ちバナー消滅・効果スキップで続行（総合ルール 1.3.2）。guest はリロード→ロビー再オープンでルーム復帰確認

いずれもソロ入力ダイアログなし・localDual と同一の盤面結果。発動側には「相手の操作/選択を待っています…」バナー、対象側には適用 toast + プレイログ（`相手効果を適用: <template> → N件`）。

軽微（盤面影響なし・要追跡）: 検証1で対象側プレイログに「→ 1件」と「→ 0件」の2行が同時刻に記録されるケースを観測（適用自体は1件のみで冪等）。

---

## 6.6 チェックリスト（Phase 5 — Phase 1 手動20件の online 再検証 — 2ブラウザ）

§6 と同一20 ID を **2ブラウザ online** で再実施する（合格: ソロ入力ダイアログなし・localDual と同一盤面・クラッシュなし）。**未実施**。

- [ ] PL!SP-bp2-011-P / [ ] PL!SP-bp2-023-L / [ ] PL!SP-bp2-024-L
- [ ] PL!S-bp2-001-P
- [ ] PL!N-bp3-010-P / [ ] PL!N-bp3-011-P / [ ] PL!N-bp3-017-N
- [ ] PL!S-bp3-002-P / [ ] PL!S-bp3-007-P / [ ] PL!S-bp3-024-L
- [ ] PL!-bp3-002-P / [ ] PL!-bp3-022-L / [ ] PL!-bp3-026-L
- [ ] PL!HS-cl1-012-CL / [ ] PL!N-bp1-026-L / [ ] PL!S-bp5-019-L
- [ ] PL!N-bp4-001-P / [ ] PL!N-bp4-002-P / [ ] PL!N-bp4-004-P / [ ] PL!N-bp4-007-P / [ ] PL!N-bp4-012-P

## 6.7 チェックリスト（Phase 5 — passive_track online 7件 — 2ブラウザ）

常時効果のコードは実装済み（[read-sync §6](./versus-online-read-sync.md)）。実プレイ検証は**未実施**。

- [ ] PL!SP-bp2-010-P: 相手 liveArea → 必要ハート+1（B型・`imposeOpponentLiveNeedHeartDelta`）
- [ ] PL!S-bp2-001-P: 自成功0 & 相手成功1+ → ブレード3
- [ ] PL!-bp3-002-P: 相手ウェイト人数に追従
- [ ] PL!N-bp4-012-P: 相手成功ライブ合計6+
- [ ] PL!N-bp4-007-P: 両者E合計15+（常時枝）
- [ ] PL!-bp4-018-N: read_compare 常時（自>相 成功スコア）
- [ ] PL!N-bp5-002-P: 相手ウェイト+read 複合（両ステージ最多ハート）

---

## 8. Phase 5 online template 代表サンプリング

template 単位で online 動作を代表1枚で確認する（214枚全 E2E はしない）。`online` 列: コード実装済み=◐、実プレイ確認=[x]。

| 相互作用 | 件数 | 代表 template | 代表 ID | patchKind | online |
|----------|------|---------------|---------|-----------|--------|
| mutate_opponent_stage | 148 | `optional_self_wait_opp_stage` | PL!N-bp3-017-N | stage_wait_members | [x] |
| mutate_opponent_stage（活性化） | — | （活性化系） | — | stage_activate_members | ◐ |
| mutate_opponent_stage（控え戻し） | — | （控え戻し系） | — | stage_return_waiting | ◐ |
| mutate_opponent_hand | — | （手札 discard 系） | — | hand_discard_pick | ◐ |
| mutate_opponent_waiting | — | （控え回収系） | — | waiting_to_hand | ◐ |
| mutate_opponent_deck | 32 | `draw_from_deck` | PL!S-bp3-007-P | deck_draw_top / deck_discard_top / deck_shuffle | ◐ |
| mutate_opponent_live | 20 | `toujou_grant_opp_live_need_heart` | PL!S-bp5-010-N | live_to_waiting / live_need_heart_delta(未) | ◐ |
| mutate_opponent_energy | — | （E ウェイト/控え系） | — | energy_to_wait / energy_discard | ◐ |
| mutate_opponent_success_live | — | （成功ライブ剥がし系） | — | success_live_to_waiting | ◐ |
| opponent_choice | 41 | `toujou_wait_pick_opp_live` | PL!SP-bp2-011-P | live_pick_to_hand(Choice) | [x] |
| both_players | 15 | （007 優木 等） | PL!N-bp4-007-P | 連鎖リクエスト（未実装） | ☐ |
| read_compare | 88 | `yell_resolution_pick_hand` | PL!HS-cl1-012-CL | read のみ（Phase 3） | ◐ |
| passive_track | 50 | passive 再計算トリガー | PL!SP-bp2-010-P | v2 集計（imposeOpponentLiveNeedHeartDelta 等） | ◐ |

**凡例**: ◐ = 対象側 `applyVersusEffectPatchLocally` / ctx online 分岐は実装済み（発動側 template 接続 or 実プレイ確認が残る）。☐ = 未実装。

**残タスク**: 各 mutate template の発動側で `runOnTargetPlayerBoard(target, fn, onlineReq)` に patchKind 付き `onlineReq` を渡す接続（Step 2 横展開）、both_players 連鎖（Step 3）、上記 online 列の実プレイ確認。

---

## 7. 関連ドキュメント

| ドキュメント | 用途 |
|-------------|------|
| [opponent-board-effects-registry.md](./opponent-board-effects-registry.md) | 全215枚の相手盤面効果 |
| [dual-mode-gap-audit.json](./dual-mode-gap-audit.json) | 高リスクのみ（再監査要） |
| [play-verification-list.md](./play-verification-list.md) | 手動プレイ全体 |
| [fable5-ability-commands.md](./fable5-ability-commands.md) | ソロ能力実装のスコープ（対戦同期は別フェーズ） |
