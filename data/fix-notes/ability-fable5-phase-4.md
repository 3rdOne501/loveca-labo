# 能力実装 Phase 4/7 — live_start（ライブ開始）上位 template 横断

実施日: 2026-06-18

## 実施概要

`data/live_start-index.json` の byTemplate 上位25を対象に、ライブ開始時の前提・選択肢・常時付与経路を監査。
前提チェック漏れ防止のため、`executeAbilityBody` に `live_start` 共通ゲートを追加。

## template別監査対象（各2 card_no）

| template | 件数 | 代表 card_no |
|---|---:|---|
| `grant_jouji_session` | 98 | `PL!-sd1-009-SD`, `PL!HS-PR-016-PR` |
| `optional_energy_blade_until_live_end` | 39 | `PL!S-PR-013-PR`, `PL!S-PR-019-PR` |
| `heart_color_pick_grant` | 34 | `PL!-sd1-003-SD`, `PL!-bp3-012-PR` |
| `live_start_position_change` | 12 | `PL!-bp4-005-R＋`, `PL!-bp4-005-P` |
| `optional_self_wait_opp_stage` | 11 | `PL!-PR-007-PR`, `PL!-PR-009-PR` |
| `draw_from_deck` | 10 | `PL!-bp4-001-R`, `PL!-bp4-001-P` |
| `deck_top_look_reorder` | 6 | `PL!HS-bp2-003-R`, `PL!HS-bp2-003-P` |
| `ability_sequence` | 5 | `PL!SP-PR-009-PR`, `PL!SP-PR-011-PR` |
| `energy_deck_to_wait` | 4 | `PL!SP-pb1-004-R`, `PL!SP-pb1-004-P＋` |
| `live_start_hand_live_to_deck_bottom_look` | 4 | `PL!S-bp2-007-R＋`, `PL!S-bp2-007-P` |
| `live_start_hand_blade_per` | 4 | `PL!SP-bp2-009-R＋`, `PL!SP-bp2-009-P` |
| `live_start_yell_reveal_reduction` | 4 | `PL!SP-bp2-010-R＋`, `PL!SP-bp2-010-P` |
| `toujou_success_live_pick_hand` | 4 | `PL!-bp3-004-R＋`, `PL!-bp3-004-P` |
| `live_start_waiting_deck_bottom_tiered` | 4 | `PL!N-bp3-009-R＋`, `PL!N-bp3-009-P` |
| `live_start_draw_opp_wait` | 4 | `PL!N-bp4-004-R＋`, `PL!N-bp4-004-P` |
| `waiting_to_deck_top_by_opp_wait_count` | 4 | `PL!N-bp4-004-R＋`, `PL!N-bp4-004-P` |
| `live_start_side_cost_equal_opp_wait` | 4 | `PL!S-bp5-002-R＋`, `PL!S-bp5-002-P` |
| `ability_pick_one` | 4 | `PL!SP-bp5-001-R＋`, `PL!SP-bp5-001-P` |
| `live_start_activate_liella_and_energy` | 4 | `PL!SP-bp5-003-R＋`, `PL!SP-bp5-003-P` |
| `live_start_live_frame_pick_deck_top` | 4 | `PL!S-bp6-004-R＋`, `PL!S-bp6-004-P` |
| `live_start_pay_or_hand_discard` | 3 | `PL!SP-pb1-001-PR`, `PL!SP-pb1-001-R` |
| `deck_top_to_waiting` | 3 | `PL!-bp3-007-R`, `PL!-bp3-007-P` |
| `live_start_optional_energy_waiting_reorder_deck_top` | 2 | `PL!HS-PR-020-PR`, `PL!HS-PR-023-PR` |
| `activate_energy` | 2 | `PL!SP-pb1-007-R`, `PL!SP-pb1-007-P＋` |
| `live_start_optional_hearts_wild` | 2 | `PL!S-pb1-003-R`, `PL!S-pb1-003-P＋` |

## 修正内容（template横断）

### 1) ライブ開始時前提チェックの共通化

- 変更: `js/simulator.js` `executeAbilityBody()`
- 追加:
  - `kind === "live_start"` 時に共通で `checkAbilityLiveStartPreconditions(cl)` を評価
  - 未達時は `abortResolved("ライブ開始時効果の条件を満たしていません")`

```js
if (kind === "live_start" && !checkAbilityLiveStartPreconditions(cl)) {
  abortResolved("ライブ開始時効果の条件を満たしていません");
  return;
}
```

#### 影響

`live_start` の個別 handler で前提判定を書き漏らした場合でも、共通ゲートで誤発動を抑止。

## 重点観点の確認結果

- `checkAbilityLiveStartPreconditions`
  - 共通ゲート + 既存個別判定で担保
- `grant_jouji_session` 適用経路
  - 常時付与 + 合計スコア経路（`bumpLiveScoreEffectBonus` / `syncJoujiPassiveEffectsAll`）維持
- `heart_color_pick_grant`
  - 成功ライブ0枚時はプレビュー時点でスキップ維持
- `splitAbilityByTriggers`
  - `「」` 内トリガー切断回避の実装を維持
- `ability_pick_one`
  - `parseAbilityBulletChoices` による選択肢全文保持を維持

## 必須確認カード（分類）

- `PL!S-bp6-020-L` → `ability_pick_one`（`choices=3`）
- `PL!HS-pb1-030-L` → `live_start_edelnote_blade_heart_pair`
- `PL!-bp5-011-N` → `heart_color_pick_grant`
- `PL!SP-sd2-023-SD2` → `live_card_score_plus`
- `PL!SP-bp4-025-L`（live_start）→ `live_start_center_series_blade_set`

## 共通ゲート結果

- `node scripts/build-ability-index.mjs` → OK
- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持

## 残件（Phase 5 へ）

- `live_success` と `ability_sequence` の横断点検
- スコア加算（カード単体 + 合計）の実行経路を trigger 横断で最終確認
