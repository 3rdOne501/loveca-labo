# 能力実装 — systemic 修正記録

生成日: 2026-05-20

## 検証

| スクリプト | 結果 |
|-----------|------|
| `node scripts/verify-ability-coverage.mjs` | OK（guided_manual=0） |
| `node scripts/verify-ability-runtime.mjs` | OK（新規） |

## 新規: scripts/verify-ability-runtime.mjs

静的監査で以下を検査:

- index 上の automated template（ability_sequence の各 step 含む）に handler がある
- `executeAbilityBody` 内の `showToast` → `return` で `finishResolved` / `abortResolved` 未到達パスがない
- `checkAbility*Preconditions` の一貫性（kidou=盤面のみ、toujou/live_start/live_success=盤面+成功ライブ）
- 回帰ヘルパー: `successLiveAreaLiveCardCount`(T_LIVE)、`playBonusLiveScore`、`liveScoreEffectBonus`、マリガン順序、`grantHeartSlotUntilLiveEnd(0)`

## 共通基盤修正（js/simulator.js）

### 1. 能力解決のハング防止

**問題:** `executeAbilityBody` の多数の早期 `return` が `finishResolved()` を呼ばず、効果キューが止まる（登場/起動/ドロー系テンプレート横断）。

**修正:**

- `abortResolved(msg)` ヘルパー追加（toast + finishResolved）
- 以下パターンを修正:
  - 山札不足（`draw_from_deck`, `draw_then_hand_discard`, `deck_top_look_reorder`）
  - ステージ不在 / 前提未達（`toujou_wait_pick_hand`, `kidou_wait_pick_hand`, `toujou_hand_stage_enter` 等）
  - 選択 UI キャンセル / 失敗時の `finishResolved()` 呼び出し

**影響 template（代表）:**

| template | 件数（index） |
|----------|--------------|
| `toujou_wait_pick_hand` | 63 |
| `kidou_wait_pick_hand` | 25 |
| `kidou_stage_wait_pick_hand` | 54 |
| `draw_from_deck` | 16+36+11 |
| `draw_then_hand_discard` | 43+17 |
| `deck_top_look_reorder` | 18+6 |
| `deck_top_pick_recover` | 68+5 |
| `kidou_hand_cost_wait_pick_hand` | 25 |

### 2. kidou_stage_wait_pick_hand のコールバック統合

**問題:** `resolveKidouStageToWaitingEffect(inst)` が `finishResolved` を受け取らず、起動54件が解決完了しない。

**修正:** `resolveKidouStageToWaitingEffect(memberInst, onComplete)` に変更。全終了パスで `onComplete`（= `finishResolved`）を呼ぶ。

### 3. 既知回帰（前セッションから維持）

- マリガン: 戻すカードはドロー時点で山札に含めない → ドロー後に戻してシャッフル
- 成功ライブ置き場: `successLiveAreaLiveCardCount()` は T_LIVE のみ
- スコア: `applyLiveCardScorePlus` → `playBonusLiveScore` → `computeLiveFrameScoreParts`; `bumpLiveScoreEffectBonus` → 合計スコア
- `grantHeartSlotUntilLiveEnd(0)` で 1 付与されない

## 再現手順（代表）

### ハング防止

1. ソロ対戦、山札0枚で「1枚引き」登場/起動効果カードを登場
2. **修正前:** トースト後に次の効果が進まない
3. **修正後:** トースト後に効果解決完了

### kidou_stage_wait_pick_hand

1. ステージ上の起動メンバー（例: ステージ→控え室→手札回収型）で起動
2. 控え室から回収 or キャンセル
3. **修正後:** いずれも起動効果が「解決済み」になり次フェイズへ進める

## 残件

- verify は静的のみ。実プレイでの手動スモークは未実施
- versus 同期はスコープ外
- ユーザー追記バグ例セクションは未記入（下記参照）

## ユーザー追記バグ例

- [card_no]: [操作] → 期待 [X] / 実際 [Y]
- ...
