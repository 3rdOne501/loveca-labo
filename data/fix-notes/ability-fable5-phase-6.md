# 能力実装 Phase 6/7 — jidou + jouji

実施日: 2026-06-18

## 実施概要

`jidou-index` 全template・`runJidouAutoEffect` の網羅・`jouji` 合成経路を監査。
ライフサイクル上の取りこぼし（付与トリガーの掃除漏れ）を1件修正。

## 1) data/jidou-index.json の全template点検

Phase 6 で点検しやすいよう、`scripts/build-ability-index.mjs` を更新して
`jidou-index.json` に `byTemplate` を追加。

### 追加した出力

- `data/jidou-index.json`:
  - `byTemplate: { [template]: count }`

### 上位 template（監査対象例）

- `jidou_area_move_grant_jouji` 8
- `jidou_yell_grant_jouji` 7
- `jidou_leave_stage_draw_discard` 6
- `jidou_area_move_opp_wait` 6
- `jidou_yell_draw` 4
- `jidou_stage_entry_draw_until` 4
- `jidou_yell_grant_jouji_nobh_members` 4
- `jidou_move_or_energy_draw_grant` 4
- `jidou_card_to_waiting_pick_hand` 4
- `jidou_leave_stage_position_change` 4

（残り含め全33 template を点検）

## 2) runJidouAutoEffect の handler 網羅確認

- `data/jidou-index.json` 由来 template 数: 33
- `abilityRuntimeMeta.js` `JIDOU_AUTO_TEMPLATES` 数: 33
- 差分:
  - runtime list に無い index template: 0
  - index に未出現の runtime template: 0

→ `runJidouAutoEffect` 側の網羅は一致。

## 3) jouji 合成確認

### 確認ポイント

- `blade_conditional`（条件付きブレード付与）
- heart 付与（常時 + 一時付与）
- live total score+（`live_score_plus` / `joujiLiveScoreBonus`）
- ALL/heart0 wildcard 代用（`wildcardBhAllFlex`）

### 監査結果

- `simulator.js` `evaluateLiveMechanicalFulfillmentBundle` で
  `wildcardBhAllFlex` 経由の有色不足補完経路を確認
- `syncJoujiPassiveEffectsAll()` が
  付与セグメント（`_grantedJoujiSegmentRaws`）を常時評価へ統合する経路を確認

## 4) granted segment のライフサイクル

対象:

- `_grantedJoujiSegmentRaws`
- `_grantedTriggerSegmentRaws`

### 修正

- 変更: `js/simulator.js` `clearLiveSessionGrantedState(inst)`
- 追加:
  - `delete inst._grantedTriggerSegmentRaws;`

```js
function clearLiveSessionGrantedState(inst) {
  if (!inst) return;
  delete inst._liveSessionYellRevealReduction;
  delete inst._grantedJoujiSegmentRaws;
  delete inst._grantedTriggerSegmentRaws;
  if (inst.playBonusLiveScore != null) inst.playBonusLiveScore = 0;
}
```

### 意図

`live_start` 等で一時付与された trigger セグメントがライブ終了後に残留し、
次ライブへ持ち越されるリスクを防止。

## 必須確認カード

- `PL!N-bp1-012-P`
  - `listNativeJoujiSegmentRaws` + `classifyJoujiSegment` で
    `blade_conditional` として分類されることを確認
  - ALL ハート代用は `wildcardBhAllFlex` 経路で補完される設計を確認

## 共通ゲート結果

- `node scripts/build-ability-index.mjs` → OK
- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持

## 残件（Phase 7 へ）

- 全 index 横断での最終不整合掃除
- 代表 card の classify snapshot 出力（最終回帰）
