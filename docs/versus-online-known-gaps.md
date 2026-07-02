# 対戦モード online — 既知フォールバック / 未対応の棚卸し

Phase 4/5 で online 効果プロトコル（[versus-online-effect-protocol.md](./versus-online-effect-protocol.md)）を
確立したが、一部 template は今も `finishOnlineOpponentDelegatedEffect`（テキスト手動代行）に
フォールバックする。本書はその棚卸しと扱いの正本。

## 区分

| 区分 | 意味 | online の扱い |
|------|------|---------------|
| **A: 移行済み** | プロトコル（`runVersusOnlineOpponentMutate` / `runVersusOnlineOpponentChoice`）接続済み | 対象クライアントで自動適用・ソロ入力なし |
| **B: 意図的スコープ外** | localDual でも未実装 or ルール上 online 化に別設計が要る | 両モード fallback（テキスト代行 or 未実装）を明記 |
| **C: プロトコル未接続の dual_ok** | 本来接続できるが未接続（次版で移行） | 当面テキスト代行フォールバック |

---

## 1. 移行済み（A）

`whenOpponentPlayMode({ online })` で protocol を使う template:

| template | 経路 | patchKind |
|----------|------|-----------|
| `optional_self_wait_opp_stage`（single） | `runOptionalSelfWaitOppStageOnline` | `stage_wait_members` |
| `kidou_self_to_wait_opp_wait` | 同上 | `stage_wait_members` |
| `live_start_pick_player_waiting_deck_bottom` | `runVersusOnlineOpponentMutate` | `waiting_to_deck_bottom` |
| `toujou_wait_pick_opp_live` | `runVersusOnlineOpponentChoice` | live_pick_to_hand（Choice） |
| `optional_pick_member_wait_opp_blade_gap` | `runOnlineOpponentMemberWaitPick`（**Phase 6 移行**） | `stage_wait_members` |
| `live_start_side_cost_equal_opp_wait` | `runLiveStartSideCostEqualOppWaitOnline`（**Phase 6 移行**） | `stage_wait_members` |
| `toujou_opp_stage_member_match_grant` | 公開ステージ read_compare（相手盤無変更） | — |

対象側適用 `applyVersusEffectPatchLocally` は 15 patchKind に対応（protocol.md §3）。

---

## 2. 意図的スコープ外（B）

| カード / template | 内容 | 理由 |
|-------------------|------|------|
| `PL!HS-pb1-008`（相手アクティブ不可・常時） | 相手ステージメンバーがアクティブフェイズにアクティブにならない | **localDual でも未実装**（`joujiEffects.js` の `opponent_cannot_activate` は state 出力なし）。online 以前の課題。両モード fallback |
| guided_manual 全般 | 自由文・複雑分岐でテンプレ化されないカード | ソロでも手動誘導。online 非対応は仕様（スコープ外） |

---

## 3. プロトコル未接続の dual_ok（C）— 次版移行候補

Phase 6 時点で `finishOnlineOpponentDelegatedEffect` に残るテキスト代行（`js/simulator.js`）。
すべて localDual では実装済み。online は当面テキスト指示 + 手動「完了」で成立する。

| 行 | template | 効果 | 移行時の patchKind |
|----|----------|------|--------------------|
| 18075 | `ability_pick_one`（相手全員ウェイト分岐） | 条件合致の相手ステージ全員をウェイト | `stage_wait_members`（全 instIds） |
| 20746 | `toujou_both_sides_wait_all_printed_blade` | 元々ブレードN以下の相手全員ウェイト（both_players。自側は local 済み） | `stage_wait_members` + both 連鎖（Step 3 both_players） |
| 21384 | `optional_self_wait_opp_stage`（multi, oppCnt>1） | 最大N人をウェイト（発動側 multi-pick UI 要） | `stage_wait_members`（multi instIds） |
| 23567 | `live_start_pick_player_deck_top_peek` | 相手山札トップを見て任意で控え室へ | `opponent_choice`(Yes/No) → `deck_discard_top` |
| 28989 | `deck_top_look_reorder` | 相手山札上N枚を順序通り戻す/控え室 | **新規 `deck_top_reorder`** が必要（現行 patchKind で再配置不可） |
| 31633 | `toujou_opp_optional_live_discard_or_score` | 相手が手札ライブ1枚控え or 拒否で発動側スコア+1 | `opponent_choice`(Yes/No) → `hand_to_waiting` |

**移行方針**: 単純ウェイト系（18075 / 21384）は既存 `stage_wait_members` で移行可。Choice+mutate 合成
（23567 / 31633）と both_players（20746）は Phase 3 の both/choice 設計とセットで次版。`deck_top_reorder`
は再配置ゾーンの曖昧性があるため patchKind 追加を検討（protocol.md §3 の保留リスト参照）。

**UI 注記（任意）**: 上記カードを online デッキに入れた場合、相手操作は「テキスト指示 → 相手が手動で
盤を操作 →『完了』」で進む。ロビーに「一部カードはオンラインで手動操作」の注記を出すこともできる（未実装）。

---

## registry 参考

`docs/opponent-board-effects-registry.json` の `dual_ok` × `mutate_opponent_*` は 51 template / 181 行。
最多は `optional_self_wait_opp_stage`（44）で、これは protocol 接続済み（online 自動適用）。
残る C 区分は上表 6 サイト（テキスト代行）に集約される。
