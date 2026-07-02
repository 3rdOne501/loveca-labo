# オンライン対戦 効果プロトコル設計（Phase 4: mutate / choice）

Phase 4（2026-07-02）: online で相手盤への書き込み（mutate）と相手選択（choice）を
Firestore 経由の構造化プロトコルで解決する。read 同期は
[versus-online-read-sync.md](./versus-online-read-sync.md)（Phase 3）を参照。

- 実装: `js/versusMatch.js`（API）+ `js/simulator.js`（送受信・パッチ適用）+ `index.html`（UI）
- 既存の類似パターン: `boardActionRequest`（undo 承認。pending → approved/denied → clear）

---

## 1. モデル: Peer-authoritative

**相手の盤は相手クライアントだけが変更する。** 発動側は「何をしてほしいか」を
構造化リクエストで送り、対象側クライアントが自 state にパッチを適用して
公開ボード（VersusPublicBoard v2）を push し、ack を返す。

```
発動側 A                                     対象側 B
  │ 効果解決開始（相手対象）                       │
  │ {A}EffectRequest = pending ────────────────▶ │ subscribe で検知
  │ 待ちバナー表示                                │ 自動適用 or 選択ダイアログ
  │                                              │ applyVersusEffectPatchLocally()
  │                                              │ → pushVersusBoardPublic（v2 集計込み）
  │ ◀──────────── {A}EffectAck + status=resolved │
  │ ack 受信 → finishResolved まで続行            │
```

- 発動側は**相手盤を直接書かない**（`runOnTargetPlayerBoard("opponent")` の online 分岐は
  リクエスト送信+ack 待ちに変換され、同期的 mutate は行わない）
- 盤面の正は各クライアントの自 state。公開ボードは read 専用ミラー

## 2. Firestore フィールド（host/guest 対称）

プレフィックス = **リクエスト発行側** の role。ack/response は相手（対象側）が
同じプレフィックスに書く（rules は参加者の全フィールド更新を許可済みのため変更不要）。

| フィールド | 書き手 | 内容 |
|-----------|--------|------|
| `{pre}EffectRequest` | 発動側 | `VersusEffectRequest`（下記） |
| `{pre}EffectAck` | 対象側 | `{ requestId, ok, resultPayload?, respondedAt }` |
| `{pre}ChoiceRequest` | 発動側 | `VersusChoiceRequest`（下記） |
| `{pre}ChoiceResponse` | 対象側 | `{ requestId, pickedIds, respondedAt }` |

### VersusEffectRequest

```
id: "eff-<ts>-<rand>"        // 冪等キー
fromRole: "host"|"guest"
status: "pending"|"resolved"|"cancelled"
kind: "toujyou"|"live_start"|"kidou"|"jidou"
cardNo: string               // 表示用（分岐禁止）
template: string             // 表示・監査用
payload: { patchKind, ... }  // §3
requestedAt / expiresAt: ISO（120s）
```

### VersusChoiceRequest（011 冬毬型）

```
id: "cho-<ts>-<rand>", fromRole, status, cardNo, template,
prompt: string,
options: [{ id, label, cardNo?, instId? }],
pickCount: number
```

## 3. payload.patchKind（横展開型・card_no 分岐禁止）

対象側の `applyVersusEffectPatchLocally(payload)` が patchKind で分岐して
**自盤 state** に適用する。適用後は render + `syncJoujiPassiveEffectsAll` + 公開ボード push。

| patchKind | payload 追加フィールド | 適用内容（対象側自盤） | 代表 template |
|-----------|----------------------|----------------------|---------------|
| `stage_wait_members` | `instIds: string[]` | 指定 id のステージメンバーを `waitMemberInst`（ウェイト） | `optional_self_wait_opp_stage` |
| `stage_grant_heart` | `instId, slot, count` | 指定メンバーの `playBonusHeartSlotsAlways[slot] += count` | `toujou_opp_stage_member_match_grant`（※） |
| `deck_draw_top` | `count` | 山札上 N 枚を手札に | `draw_from_deck`（両者ドロー系） |
| `waiting_to_deck_bottom` | `instIds: string[]`（順序=置く順） | 控え室の指定カードを順にデッキ最下部へ | `live_start_pick_player_waiting_deck_bottom` |
| `live_pick_to_hand` | —（ChoiceRequest 側で解決） | 対象側は**選ぶだけ**。カード移動は発動側自盤（控え室→手札） | `toujou_wait_pick_opp_live` |

### Phase 5 追加 patchKind（registry kind 対応・card_no 分岐禁止）

| patchKind | payload | 適用内容（対象側自盤） | registry kind |
|-----------|---------|----------------------|---------------|
| `stage_activate_members` | `instIds?`（無→全員） | 指定/全メンバーを lcWait=false・lcActive=true・isRotated=false | mutate_opponent_stage |
| `stage_return_waiting` | `instIds` | `removeStageMemberToWaiting` でステージ→控え室 | mutate_opponent_stage |
| `hand_discard_pick` / `hand_to_waiting` | `instIds?` or `count` | 手札→控え室（instIds 指定 or count 枚） | mutate_opponent_hand |
| `waiting_to_hand` | `instIds` | 控え室→手札 | mutate_opponent_waiting |
| `live_to_waiting` | `instIds?`（無→全ライブ） | ライブ置き場→控え室 | mutate_opponent_live |
| `energy_to_wait` | `count` | アクティブE→ウェイト（総合ルール 5.9.1） | mutate_opponent_energy |
| `energy_discard` | `instIds?` or `count` | E→控え室 | mutate_opponent_energy |
| `success_live_to_waiting` | `instIds?` or `count` | 成功ライブ→控え室 | mutate_opponent_success_live |
| `deck_discard_top` | `count` | 山札上 N 枚→控え室 | mutate_opponent_deck |
| `deck_shuffle` | — | `shuffle(state.deck)` | mutate_opponent_deck |

未実装（fallback 据え置き）: `live_need_heart_delta`（一過性の必要ハート修正。常時型 B-1 は
`imposeOpponentLiveNeedHeartDelta` 公開で対応済み・§read-sync）、`waiting_discard`・`resolution_pick`
（ゾーン意味が曖昧なため保留。`finishOnlineOpponentDelegatedEffect` へ）。

※ PL!N-bp3-011-P のカード文はブレード獲得が**発動側メンバー**のため、実際の相手盤操作は
「相手ステージのメンバー情報を読む」のみ（Phase 3 read で充足）。`stage_grant_heart` は
相手メンバーにハート/ブレードを付与する同型 template の横展開用として定義する。

`live_pick_to_hand`（冬毬型）は mutate ではなく **ChoiceRequest** で完結する:
発動側が候補2枚を options に載せ、対象側が1枚選び、発動側が自分の控え室→手札を実行。

## 4. 非機能要件

| 項目 | 仕様 |
|------|------|
| 冪等 | 対象側は「最後に適用した requestId」を保持し、同一 id の再適用を拒否（`versusEffectAppliedRequestIds`） |
| タイムアウト | 発動側 120s（`expiresAt`）。超過で `cancelVersus*Action` → status=cancelled + toast。効果は総合ルール 1.3.2（可能な限り実行）に従い**スキップ扱い**で続行 |
| 排他 | `boardActionRequest` が pending の間は EffectRequest/ChoiceRequest 送信不可（API 層で throw） |
| 切断 | stale pending は次のリクエスト送信時に requester 側で cancelled 上書き。対象側は resolved 済み id を再適用しない |
| 監査 | 送受信・適用は `appendVersusMatchLog` に記録 |

## 5. クライアント実装（simulator.js）

| 関数 | 役割 |
|------|------|
| `runVersusOnlineOpponentMutate(template, payload, onDone)` | 発動側: EffectRequest 送信 → 待ちバナー → ack/timeout で `onDone(ok)` |
| `runVersusOnlineOpponentChoice(prompt, options, pickCount, onPicked)` | 発動側: ChoiceRequest 送信 → response で `onPicked(pickedIds)`（timeout は null） |
| `applyVersusEffectPatchLocally(payload)` | 対象側: patchKind 分岐で自盤へ適用 |
| `syncVersusEffectProtocol(remoteMatch)` | `applyRemoteVersusMatch` から毎スナップショット呼び出し。対象側の request 検知・発動側の ack/response 検知の両方を担当 |

`finishOnlineOpponentDelegatedEffect`（テキスト指示+手動完了）は patchKind 未対応の
template の **fallback として残す**。対応済み template から段階的に置換する。

## 6. UI

- 対象側: `#dlg-versus-remote-choice`（新規）— prompt + options ボタン。EffectRequest の
  自動適用はダイアログなし（toast + ログのみ）
- 発動側: `#versus-effect-wait-banner`（新規）—「相手の操作を待っています…」+ 経過秒
- 双方: `appendVersusMatchLog` に「効果リクエスト送信/適用/選択」を記録

## 7. Phase 4 対象（代表4 template）と合格条件

| 順 | ID | template | online 合格条件 |
|----|-----|----------|-----------------|
| 1 | PL!N-bp3-017-N | `optional_self_wait_opp_stage` | B の stage 該当メンバーがウェイト、公開 `stageWaitCount` 増 |
| 2 | PL!N-bp3-011-P | `toujou_opp_stage_member_match_grant` | A が B の公開 stage から選択→一致判定→A 自身にブレード（B 盤 mutate なし） |
| 3 | PL!N-bp3-010-P | `live_start_pick_player_waiting_deck_bottom` | B の控え室指定2枚が B の山札下へ |
| 4 | PL!SP-bp2-011-P | `toujou_wait_pick_opp_live` | B が2枚から1枚選択 → A の手札に |

Phase 5（スコープ外）: passive online 同期、214 dual_ok への mutate 横展開。

## 8. E2E 検証結果（2026-07-02・実 Firestore・匿名2クライアント）

ゲスト（匿名）ログイン（`signInAsGuest`）で host/guest 別 UID を用意し、2オリジン2タブで実施。

| 経路 | 結果 |
|------|------|
| EffectRequest `deck_draw_top` → 対象側自動適用 → ack | OK（手札6→7、ack `{ok:true, applied:1}`、status resolved） |
| ChoiceRequest → `#dlg-versus-remote-choice` → ChoiceResponse | OK（`pickedIds:["optA"]`、status resolved） |
| 冪等（同一 requestId 再 snapshot） | OK（二重適用なし） |
| cancel / 不明 patchKind | OK（cancelled / ack `{ok:false}`・盤面無変化） |

## 9. 実カード盤面フロー検証結果（2026-07-02・実プレイ）

対象4種入り 60 枚デッキ（48 メンバー + 12 ライブ）を両クライアントに設定し、実プレイで §7 合格条件をすべて確認（implementation-plan §6.5 に詳細）。

| ID | template | 結果 |
|----|----------|------|
| PL!N-bp3-017-N | `optional_self_wait_opp_stage` | OK — guest→host、host 盤で自動ウェイト・`stageWaitCount` 0→1・ack `{ok:true, applied:1}` |
| PL!N-bp3-011-P | `toujou_opp_stage_member_match_grant` | OK — host が guest 公開ステージから選択、heart 一致→ブレード2（read のみ） |
| PL!N-bp3-010-P | `live_start_pick_player_waiting_deck_bottom` | OK — live_start 誘発、guest 控え室2枚→山札下・ack `{ok:true, applied:2}` |
| PL!SP-bp2-011-P | `toujou_wait_pick_opp_live` | OK — guest に選択ダイアログ→1枚選択→host 手札へ |
| タイムアウト | 相手切断→120s | OK — request `cancelled`・バナー消滅・スキップ続行。相手はリロード後ルーム復帰可 |

いずれもソロ入力ダイアログなし・localDual と同一結果。付随修正: `opponentDecisionLeadPrefix` / `opponentDecisionDialogTitle` に online 分岐を追加（「ソロプレイ:」誤表記の解消）。

## 10. 運用・障害時の挙動（Phase 6）

### 送受信のライフサイクル
1. 発動側 `runVersusOnlineOpponentMutate/Choice` → `requestVersusEffectAction/requestVersusChoiceAction`（Firestore に `{pre}EffectRequest`/`{pre}ChoiceRequest` を書き込み・requestId 付き）。
2. 発動側は待ちバナー表示（経過秒・自動スキップまでの残り秒・**キャンセル不可**）。`versusEffectProto.pendingEffect/pendingChoice` に保持。
3. 対象側 `syncVersusEffectProtocol`（`applyRemoteVersusMatch` から毎スナップショット）が pending を検知 → `applyVersusEffectPatchLocally`（mutate）or `#dlg-versus-remote-choice`（choice）→ `resolve*Action`。
4. 発動側が ack/response を検知 → バナー解除 → `onDone(ok)` / `onPicked(ids)`。

### 障害時の挙動

| 事象 | 挙動 |
|------|------|
| 対象側が 120s 無応答（切断等） | 発動側 `VERSUS_EFFECT_TIMEOUT_MS` 到達 → `cancel*Action`（status=cancelled）→ toast → 効果スキップで続行（総合ルール 1.3.2） |
| 対象側リロード | 復帰後の snapshot で未適用 pending を検知し適用（冪等: `appliedEffectIds` により二重適用しない） |
| 発動側リロード | pending はローカル state のため失われるが、対象側が適用済みなら ack は Firestore に残る。新規リクエスト送信時に stale pending は requester 側で cancelled 上書き |
| `boardActionRequest`（undo 承認）pending 中 | EffectRequest/ChoiceRequest 送信は API 層で throw（排他）。発動側は toast で通知され効果は成立しない |
| 不明 patchKind | 対象側 `applyVersusEffectPatchLocally` が `{ok:false}` を返し盤面無変化 → 発動側は失敗として続行 |

### 二重ダイアログの整理（Phase 6）
自分が選ぶ番（`#dlg-versus-remote-choice`）を開くとき、閲覧専用の「相手の効果処理」ミラー（`#dlg-versus-opp-effect`）が開いていれば閉じる。

### 未接続カードのフォールバック
プロトコル未接続の template は `finishOnlineOpponentDelegatedEffect`（テキスト指示 + 手動「完了」）のまま残す（[versus-online-known-gaps.md](./versus-online-known-gaps.md)）。Phase 6 で `optional_pick_member_wait_opp_blade_gap` / `live_start_side_cost_equal_opp_wait` を `stage_wait_members` プロトコルへ移行。
