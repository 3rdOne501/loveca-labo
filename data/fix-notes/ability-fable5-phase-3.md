# 能力実装 Phase 3/7 — kidou（起動）上位 template 横断

実施日: 2026-06-18

## 実施概要

`data/kidou-index.json` の byTemplate 上位20を対象に、起動時の前提・コスト・遷移・回収を監査。
個別 handler 依存だった前提判定を共通化し、起動 template 全体の安定性を向上。

## template別監査対象（各2 card_no）

| template | 件数 | 代表 card_no |
|---|---:|---|
| `kidou_stage_wait_pick_hand` | 54 | `PL!-sd1-002-SD`, `PL!-sd1-005-SD` |
| `kidou_hand_cost_wait_pick_hand` | 25 | `PL!-PR-003-PR`, `PL!-PR-004-PR` |
| `kidou_wait_pick_hand` | 25 | `PL!N-bp1-012-R＋`, `PL!N-bp1-012-P` |
| `draw_from_deck` | 16 | `PL!-PR-012-PR`, `PL!S-PR-038-PR` |
| `grant_jouji_session` | 16 | `PL!S-pb1-006-R`, `PL!S-pb1-006-P＋` |
| `live_start_position_change` | 10 | `PL!SP-bp2-008-R`, `PL!SP-bp2-008-P` |
| `activate_energy` | 9 | `PL!N-bp1-006-R＋`, `PL!N-bp1-006-P` |
| `heart_color_pick_grant` | 8 | `PL!-bp3-009-R＋`, `PL!-bp3-009-P` |
| `energy_deck_to_wait` | 6 | `PL!SP-sd1-011-SD`, `PL!SP-bp4-010-R` |
| `kidou_self_wait_stage_member_swap_recover` | 6 | `PL!S-bp3-006-R＋`, `PL!S-bp3-006-P` |
| `deck_top_pick_recover` | 5 | `PL!N-PR-003-PR`, `PL!N-PR-008-PR` |
| `draw_then_hand_discard` | 5 | `PL!SP-bp1-009-R`, `PL!SP-bp1-009-P` |
| `kidou_self_to_wait_recover` | 5 | `PL!HS-bp1-002-R`, `PL!HS-bp1-002-P` |
| `kidou_waiting_to_empty_stage` | 5 | `PL!HS-bp5-002-R＋`, `PL!HS-bp5-002-P` |
| `kidou_wait_to_stage` | 4 | `PL!N-bp1-002-R＋`, `PL!N-bp1-002-P` |
| `kidou_reveal_hand_cost_threshold` | 4 | `PL!SP-bp1-003-R＋`, `PL!SP-bp1-003-P` |
| `kidou_hand_discard_trigger_ability` | 4 | `PL!SP-bp2-006-R＋`, `PL!SP-bp2-006-P` |
| `kidou_wait_member_grant_jouji` | 4 | `PL!S-bp3-001-R＋`, `PL!S-bp3-001-P` |
| `kidou_hand_discard_series_branch` | 4 | `PL!-bp5-003-R＋`, `PL!-bp5-003-P` |
| `kidou_opp_wait_group_discount_energy` | 4 | `PL!-bp5-004-R＋`, `PL!-bp5-004-P` |

## 修正内容（template横断）

### 1) 起動時前提チェックの共通化

- 変更: `js/simulator.js` `executeAbilityBody()`
- 追加:
  - `kind === "kidou"` 時に共通で `checkAbilityKidouPreconditions(cl)` を評価
  - 未達時は `abortResolved("起動効果の条件を満たしていません")`

```js
if (kind === "kidou" && !checkAbilityKidouPreconditions(cl)) {
  abortResolved("起動効果の条件を満たしていません");
  return;
}
```

#### 影響

個別 handler に依存していた前提判定（`filters`/`requiresSeriesOnStage`）を、
起動 template 全体へ一律適用。条件未達での誤発動を抑止。

### 2) 重点観点の再確認（既存修正を維持）

- `requiresOnStage / requiresInWaiting / perTurnLimit`:
  - `runClassifiedCardAbility()` / `runEffectBody()` / `memberKidouGlowOnStage()` 経路で維持
- `kidou_stage_wait_pick_hand`:
  - `resolveKidouStageToWaitingEffect(memberInst, onComplete)` が
    「ステージ→控え室→回収」の順序で、全終了パス `onComplete` 呼び出し
- `kidou_hand_cost_wait_pick_hand`:
  - キャンセル/失敗時 `finishResolved()` で解決完了
- `kidou_wait_to_stage`:
  - 控え室在籍判定（`instIsInWaitingRoom`）と登場失敗時 abort を維持

## 必須確認カード（分類）

- `PL!S-bp3-006-P` → `kidou_self_wait_stage_member_swap_recover`

## 共通ゲート結果

- `node scripts/build-ability-index.mjs` → OK
- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持

## 残件（Phase 4 へ）

- `live_start` 上位 template（選択肢・常時付与・成功ライブ条件）の横断点検
- 実プレイでの起動系スモークは別途継続
