# Codex/Fable5 用 — 全カード能力を「カードテキスト通り」に近づける改訂命令文（Phase 1〜7）

`data/cards.json`（約1153枚）を**ソロ対戦でカードテキストどおりに動作**させるための、改訂版 7 Phase 命令です。
旧版より「正しく動いたか」の判定基準を強化しています。

## 重要な前提

- 目標は「全カード手動確認」ではなく、**共通層 + 高頻度 template + 回帰防止**で正答率を上げること
- **Phase を飛ばさない**
- 各 Phase は、次に進む前に **ゲート条件**を満たすこと

## 全 Phase 共通ルール（必ず毎回貼る）

- リポジトリ: `ll-ocg-tools`
- 対象は **ソロ対戦のみ**（`versus / online / localDual` の同期ロジックは触らない）
- `guided_manual=0` を維持（不明なものを guided_manual に戻さない）
- 既存 template 設計に合わせる（大規模リファクタ禁止）
- 推測で template を増やさない（既存分類/既存handler修正を優先）
- 変更のたびに `data/fix-notes/ability-fable5-phase-N.md` を更新

### 共通ゲート（全 Phase 必須）

1. `node scripts/build-ability-index.mjs`
2. `node scripts/verify-ability-runtime.mjs` が OK
3. `node scripts/verify-ability-coverage.mjs` が OK
4. 失敗時は次 Phase に進まず、失敗理由と修正内容を記録

---

# Phase 1 / 7 — 監査基盤 + 共通エンジン修正

```
ll-ocg-tools の能力実装 Phase 1/7 を実行してください。

【目的】
カード単位ではなく、共通層の不具合を先に潰して全体の誤動作率を下げる。

【作業】
1) 監査:
   - node scripts/build-ability-index.mjs
   - data/*-index.json の byTemplate 上位を確認
   - 既存ノート確認: data/fix-notes/ability-reported-bugs.md, ability-systemic-fix.md

2) verify-ability-runtime.mjs 強化:
   - ability_sequence の step に handler があること
   - executeAbilityBody で showToast→return の未解決パス（finishResolved未到達）を検出
   - checkAbility*Preconditions の一貫性チェック
   - 回帰チェック:
     - successLiveAreaLiveCardCount が T_LIVE のみ
     - playBonusLiveScore / liveScoreEffectBonus / joujiLiveScoreBonus の経路
     - マリガン順序（戻すカードはドロー後に戻してシャッフル）
     - grantHeartSlotUntilLiveEnd(0)

3) 共通修正:
   - js/cardGroups.js: Aqours / SaintSnow / EdelNote / Liella! タグ
   - js/abilityEffects.js: splitAbilityByTriggers, parseAbilityPickFilters, parseAbilityBulletChoices
   - js/simulator.js: 前提判定・終了コールバック・スコア経路・マリガン
   - js/joujiEffects.js(+simulator): ALLハート代用（slot7）

4) 既知11件パターンが再発しないことを regression 観点で確認

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-1.md に
  「修正した共通関数」「影響 template」「未解決」を記録
```

---

# Phase 2 / 7 — 登場（toujyou）上位 template

```
ll-ocg-tools の能力実装 Phase 2/7（toujyou）を実行してください。

【目的】
toujyou-index の上位 template を先に直し、登場時の誤動作を横断改善する。

【作業】
1) data/toujyou-index.json の byTemplate 上位20を対象化
2) 各 template で代表 card_no を抽出（最低2件/template）
3) 下記観点で修正:
   - 前提: checkAbilityToujouPreconditions
   - コスト: payAbilityCost / templateHandlesOwnCost
   - UI: pick/reveal/reorder の候補・キャンセル
   - 終了: finishResolved 必達
   - ability_sequence の step連鎖

【必須確認カード】
- PL!S-sd1-002-SD
- PL!S-sd1-017-SD
- PL!S-bp2-005-P
- PL!S-bp5-004-P

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-2.md に
  「template別の修正内容」「代表card_no」「残件」を記録
```

---

# Phase 3 / 7 — 起動（kidou）上位 template

```
ll-ocg-tools の能力実装 Phase 3/7（kidou）を実行してください。

【目的】
kidou-index 上位 template を修正し、起動時のコスト/遷移/回収を安定化する。

【作業】
1) data/kidou-index.json byTemplate 上位20を対象
2) 重点観点:
   - requiresOnStage / requiresInWaiting / perTurnLimit
   - kidou_stage_wait_pick_hand の順序（ステージ→控え室→回収）
   - kidou_hand_cost_wait_pick_hand のキャンセル/失敗時 finishResolved
   - kidou_wait_to_stage の登場可否判定
   - resolveKidouStageToWaitingEffect と onComplete の整合

【必須確認カード】
- PL!S-bp3-006-P

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-3.md 記録
```

---

# Phase 4 / 7 — ライブ開始（live_start）

```
ll-ocg-tools の能力実装 Phase 4/7（live_start）を実行してください。

【目的】
ライブ開始時の選択肢・常時付与・ハート/ブレード処理を正しくする。

【作業】
1) data/live_start-index.json byTemplate 上位25を対象
2) 重点観点:
   - checkAbilityLiveStartPreconditions
   - grant_jouji_session の適用経路（常時/合計スコア）
   - heart_color_pick_grant（成功ライブ0枚なら0付与）
   - splitAbilityByTriggers が「」内トリガーで切断しない
   - ability_pick_one の選択肢全文保持と実行分岐

【必須確認カード】
- PL!S-bp6-020-L
- PL!HS-pb1-030-L
- PL!-bp5-011-N
- PL!SP-sd2-023-SD2
- PL!SP-bp4-025-L（live_start）

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-4.md 記録
```

---

# Phase 5 / 7 — ライブ成功（live_success）+ ability_sequence

```
ll-ocg-tools の能力実装 Phase 5/7（live_success + ability_sequence）を実行してください。

【目的】
「このカードのスコア+N」と「ライブ合計スコア+N」を判定へ正しく反映し、
複合効果（ability_sequence）を確実に逐次実行する。

【作業】
1) data/live_success-index.json 全 template を対象
2) 全 trigger の ability_sequence を対象
3) 重点観点:
   - live_card_score_plus の前提と加算先
   - optional_energy_live_score_plus のコスト分岐
   - abilityComposition の tiered_cost 展開整合
   - executeAbilitySequence の step完了連鎖
   - requiresCenterMemberMovedThisTurn

【必須確認カード】
- PL!SP-bp4-025-L（live_success）
- ability_sequence 代表5件（indexから抽出）

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-5.md 記録
```

---

# Phase 6 / 7 — 自動（jidou）+ 常時（jouji）

```
ll-ocg-tools の能力実装 Phase 6/7（jidou + jouji）を実行してください。

【目的】
自動効果と常時効果を、ライブ判定/スコア/ハート充足に整合させる。

【作業】
1) data/jidou-index.json の全 template を点検
2) runJidouAutoEffect の handler 網羅確認
3) jouji の合成確認:
   - blade_conditional
   - heart 付与
   - live total score+
   - ALL/heart0 wildcard 代用
4) granted segment のライフサイクル確認:
   - _grantedJoujiSegmentRaws
   - _grantedTriggerSegmentRaws

【必須確認カード】
- PL!N-bp1-012-P

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-6.md 記録
```

---

# Phase 7 / 7 — 最終横断回帰（漏れ掃除）

```
ll-ocg-tools の能力実装 Phase 7/7（最終回帰）を実行してください。

【目的】
Phase 1〜6 の漏れを機械走査で潰し、ソロ能力の最終品質を固める。

【作業】
1) 全 index（kidou/toujyou/live_start/live_success/jidou）走査:
   - classify と handler の不整合を修正
2) verify-ability-runtime.mjs 最終強化:
   - index 全 template の handler チェック
   - 代表50 card_no の classify snapshot（trigger/template/filters）を scripts/snapshots/ に出力
3) 受け入れチェック:
   - guided_manual=0
   - 成功ライブカウントはT_LIVEのみ
   - finishResolved 未到達パス 0
   - スコア経路（playBonus + effectBonus + joujiBonus）反映
   - マリガン順序OK

【完了条件】
- 共通ゲート4つすべて OK
- data/fix-notes/ability-fable5-phase-7.md に
  全Phaseサマリ、未解決、次アクションを記録
```

---

## 受け入れ基準（全 Phase 完了時）

- `guided_manual=0` を維持
- verify 2本が OK（coverage/runtime）
- ソロ対戦の主要 template がカードテキスト通りに実行
- 残件は「理由付き」で明文化（黙ってスキップしない）

## Fable/Codex へ毎回追記する1行

```
1153枚手動全検証は不要。ソロのみ対象。versusは変更禁止。guided_manual=0維持。Phase完了ごとに verify 2本を実行し、失敗時は次へ進まないで修正内容を報告。
```
