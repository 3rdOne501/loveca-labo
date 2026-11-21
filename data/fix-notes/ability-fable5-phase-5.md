# 能力実装 Phase 5/7 — live_success + ability_sequence

実施日: 2026-06-18

## 実施概要

`data/live_success-index.json` の全 template を対象に監査し、`ability_sequence` の step 逐次実行経路を確認。
`live_success` 前提判定漏れ防止のため、`executeAbilityBody` に共通ゲートを追加。

## live_success 全template（監査対象）

- `draw_then_hand_discard` (17)
- `yell_resolution_pick_hand` (13)
- `draw_from_deck` (11)
- `both_players_energy_deck_wait` (4)
- `live_success_deck_wait_pick_live` (4)
- `deck_top_count_live_score_plus` (4)
- `live_score_higher_energy_wait` (4)
- `live_success_enter_under_member` (4)
- `deck_top_reveal_hand_score_grant` (4)
- `yell_reveal_series_live_score_plus` (4)
- `yell_resolution_pick_deck_top` (4)
- `live_success_wait_skip_next_activate` (4)
- `optional_energy_live_score_plus` (3)
- `deck_top_pick_recover` (3)
- `live_success_self_wait_if_others` (3)
- `surplus_heart_score_modifier` (3)
- `yell_resolution_energy_wait` (2)
- `yell_resolution_pick_self_score` (2)
- `energy_less_than_opponent_wait` (2)
- `yell_resolution_count_energy_wait` (1)
- `deck_top_look_reorder` (1)

## 修正内容（template横断）

### 1) ライブ成功時前提チェックの共通化

- 変更: `js/simulator.js` `executeAbilityBody()`
- 追加:
  - `kind === "live_success"` 時に `checkAbilityLiveSuccessPreconditions(cl)` を共通評価
  - 未達時は `abortResolved("ライブ成功時効果の条件を満たしていません")`

```js
if (kind === "live_success" && !checkAbilityLiveSuccessPreconditions(cl)) {
  abortResolved("ライブ成功時効果の条件を満たしていません");
  return;
}
```

#### 影響

`live_success` handler で個別チェック漏れがあっても、共通ゲートで誤発動を抑止。

## 重点観点の確認結果

### live_card_score_plus の前提と加算先

- `checkCardScorePlusPreconditions()` にて:
  - `kind === "live_success"` で `checkAbilityLiveSuccessPreconditions(cl)`
  - `requiresCenterMemberMovedThisTurn` を評価
- 加算先:
  - `applyLiveCardScorePlus()` → `inst.playBonusLiveScore`（カード単体スコア）

### optional_energy_live_score_plus のコスト分岐

- `payAbilityCost(..., false, cb)` で任意コスト処理
- 不払い時は `_liveSuccessEffectDeclined=true` で解決完了
- 支払い時は `bumpLiveScoreEffectBonus()` で合計スコア加算

### abilityComposition の tiered_cost 展開整合

- `js/abilityComposition.js` の `classifyWaitingReorderTiered()` で
  - `tiered_cost_draw_if`
  - `tiered_cost_grant_jouji_score`
  - `tiered_cost_grant_jouji_session`
  を step に展開する実装を確認

### executeAbilitySequence の step完了連鎖

- `executeAbilitySequence()` は各 step の `finishResolved` 後に `runStep(i+1)` を呼び、
  最終 step 後に `finishResolved()` 到達

## 必須確認カード

- `PL!SP-bp4-025-L`（live_success）
  - 分類: `live_card_score_plus`
  - `requiresCenterMemberMovedThisTurn=true` 確認済み

## ability_sequence 代表5件（index抽出）

1. `kidou` `PL!SP-bp5-002-R＋` : `draw_then_hand_discard -> grant_jouji_session`
2. `kidou` `PL!SP-bp5-002-P` : `draw_then_hand_discard -> grant_jouji_session`
3. `kidou` `PL!SP-bp5-002-AR` : `draw_then_hand_discard -> grant_jouji_session`
4. `kidou` `PL!SP-bp5-002-SEC` : `draw_then_hand_discard -> grant_jouji_session`
5. `toujyou` `PL!N-bp1-009-R` : `deck_top_to_waiting -> toujou_wait_pick_hand`

## 共通ゲート結果

- `node scripts/build-ability-index.mjs` → OK
- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持

## 残件（Phase 6 へ）

- `jidou` / `jouji` の横断点検
- 常時と自動効果のライブ判定・スコア反映の最終整合
