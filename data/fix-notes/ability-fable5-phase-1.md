# 能力実装 Phase 1/7 — 監査基盤 + 共通レイヤー

実施日: 2026-06-18

## 1) 監査実行

- `node scripts/build-ability-index.mjs` 実行済み
- `data/*-index.json` を再生成
- 既存修正ノート確認:
  - `data/fix-notes/ability-reported-bugs.md`
  - `data/fix-notes/ability-systemic-fix.md`

### byTemplate 上位（監査結果）

- `kidou`
  - `kidou_stage_wait_pick_hand` 54
  - `kidou_hand_cost_wait_pick_hand` 25
  - `kidou_wait_pick_hand` 25
  - `draw_from_deck` 16
  - `grant_jouji_session` 16
- `toujyou`
  - `deck_top_pick_recover` 68
  - `toujou_wait_pick_hand` 63
  - `draw_then_hand_discard` 43
  - `deck_top_to_waiting` 40
  - `draw_from_deck` 36
- `live_start`
  - `grant_jouji_session` 98
  - `optional_energy_blade_until_live_end` 39
  - `heart_color_pick_grant` 34
  - `live_start_position_change` 12
  - `optional_self_wait_opp_stage` 11
- `live_success`
  - `draw_then_hand_discard` 17
  - `yell_resolution_pick_hand` 13
  - `draw_from_deck` 11
  - 4件グループが複数（`live_success_deck_wait_pick_live` 等）

## 2) verify-ability-runtime.mjs（Phase 1 要件）

本スクリプトはすでに以下を満たしていることを再確認:

- `ability_sequence` の step handler 整合チェック
- `executeAbilityBody` の `showToast -> return` 未解決パス検出
- `checkAbility*Preconditions` 一貫性チェック（kidou/toujou/live_start/live_success）
- 回帰ヘルパー存在チェック:
  - `successLiveAreaLiveCardCount(T_LIVE)`
  - `playBonusLiveScore`
  - `liveScoreEffectBonus`
  - マリガン順序
  - `grantHeartSlotUntilLiveEnd(0)`

## 3) 共通基盤（実装状態の再確認）

Phase 1 対象の共通修正は実装済みであることを確認:

- `js/cardGroups.js`
  - Aqours / SaintSnow / EdelNote / Liella! タグ判定
- `js/abilityEffects.js`
  - `splitAbilityByTriggers`（「」内トリガー対策）
  - `parseAbilityPickFilters`（成功ライブ vs ライブ枠）
  - `parseAbilityBulletChoices`
- `js/simulator.js`
  - `abortResolved` 導入、`finishResolved` 未到達パス対策
  - `successLiveAreaLiveCardCount`（T_LIVE のみ）
  - `grantHeartSlotUntilLiveEnd(0)` 取り扱い
  - `executeAbilitySequence` 逐次実行
  - マリガンの「ドロー後に戻してシャッフル」
- `js/joujiEffects.js + simulator`
  - ALL ハート（slot7）の有色代用（`wildcardBhAllFlex`）

## 4) 検証結果（ゲート）

- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持（coverage 出力で確認）

## 5) 既知11件バグの扱い

- `data/fix-notes/ability-reported-bugs.md` の 11件修正は反映済み状態を維持
- 本 Phase では regression 観点で分類/handler パス整合を再確認

## 6) 残件（Phase 2 以降）

- ここからは trigger 別の上位 template 横断点検に進む
  - Phase 2: `toujyou` 上位20
  - Phase 3: `kidou` 上位20
- 実プレイでの手動スモークは別途（本 Phase では静的/構造監査）
