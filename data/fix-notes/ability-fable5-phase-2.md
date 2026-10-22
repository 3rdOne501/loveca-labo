# 能力実装 Phase 2/7 — toujyou（登場）上位 template 横断

実施日: 2026-06-18

## 実施概要

`data/toujyou-index.json` の byTemplate 上位20を対象に、handler の前提/完了パスを横断監査。
登場時前提チェック漏れを共通修正し、複数 template で同時に再発防止。

## template別監査対象（各2 card_no）

| template | 件数 | 代表 card_no |
|---|---:|---|
| `deck_top_pick_recover` | 68 | `PL!-sd1-004-SD`, `PL!-sd1-015-SD` |
| `toujou_wait_pick_hand` | 63 | `PL!-sd1-003-SD`, `PL!-PR-018-PR` |
| `draw_then_hand_discard` | 43 | `PL!N-bp1-014-PRproteinbar`, `PL!N-bp1-015-PRproteinbar` |
| `deck_top_to_waiting` | 40 | `PL!-sd1-011-SD`, `PL!-sd1-012-SD` |
| `draw_from_deck` | 36 | `PL!-sd1-007-SD`, `PL!S-PR-041-PR` |
| `optional_self_wait_opp_stage` | 33 | `PL!-PR-007-PR`, `PL!-PR-009-PR` |
| `grant_jouji_session` | 21 | `PL!S-PR-016-PR`, `PL!S-PR-020-PR` |
| `deck_top_look_reorder` | 18 | `PL!-bp3-014-PR`, `PL!S-PR-028-PR` |
| `activate_energy` | 17 | `PL!N-bp1-004-R`, `PL!N-bp1-004-P` |
| `ability_pick_one` | 16 | `PL!-PR-005-PR`, `PL!-PR-006-PR` |
| `energy_deck_to_wait` | 14 | `PL!SP-PR-004-PR`, `PL!SP-PR-006-PR` |
| `ability_sequence` | 12 | `PL!N-bp1-009-R`, `PL!N-bp1-009-P` |
| `toujou_hand_stage_enter` | 11 | `PL!-PR-015-PR`, `PL!SP-PR-020-PR` |
| `toujou_deck_top_liella_live_pick` | 5 | `PL!SP-bp4-002-R`, `PL!SP-bp4-002-P` |
| `waiting_to_deck_bottom` | 4 | `PL!S-bp2-008-R＋`, `PL!S-bp2-008-P` |
| `toujou_baton_discarded_pick_hand` | 4 | `PL!SP-bp2-006-R＋`, `PL!SP-bp2-006-P` |
| `draw_per_stage_member_discard` | 4 | `PL!-bp3-004-R＋`, `PL!-bp3-004-P` |
| `activate_stage_members_up_to` | 4 | `PL!S-bp3-010-N`, `PL!S-bp3-011-N` |
| `success_live_waiting_swap` | 4 | `PL!N-bp4-010-R＋`, `PL!N-bp4-010-P` |
| `toujou_liella_double_baton_center` | 4 | `PL!SP-bp4-004-R＋`, `PL!SP-bp4-004-P` |

## 修正内容（template横断）

### 1) 登場時前提チェック漏れの共通補完

- 変更: `js/simulator.js` `executeAbilityBody()`
- 追加:
  - `kind === "toujyou"` 時に共通で `checkAbilityToujouPreconditions(cl)` を評価
  - 未達時は `abortResolved("登場時効果の条件を満たしていません")`

```js
if (kind === "toujyou" && !checkAbilityToujouPreconditions(cl)) {
  abortResolved("登場時効果の条件を満たしていません");
  return;
}
```

#### 影響

個別 handler で前提判定を書き漏らしていた `toujyou` template（上位20含む）に、
共通ガードが適用されるため、条件未達時の誤発動を抑止。

## 必須確認カード（分類パス）

- `PL!S-sd1-002-SD` → `toujou_wait_pick_hand`
- `PL!S-sd1-017-SD` → `draw_then_hand_to_deck_bottom`
- `PL!S-bp2-005-P` → `deck_top_pick_recover`（`heartSlotsAny: [2,4,5]`）
- `PL!S-bp5-004-P` → `ability_pick_one`

## 共通ゲート結果

- `node scripts/build-ability-index.mjs` → OK
- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持

## 残件（Phase 3 へ）

- `kidou` 上位templateの同様監査（コスト/キャンセル/finishResolved）
- 実プレイでの動作差分は別途スモーク確認（本 Phase は静的監査中心）
