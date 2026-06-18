# 能力実装 Phase 7/7 — 最終横断回帰

実施日: 2026-06-18

## 目的

Phase 1〜6 の漏れを index 横断で機械走査し、ソロ能力の最終品質を固める。

## 1) 全 index 横断（kidou/toujyou/live_start/live_success/jidou）

実施内容:

- `node scripts/build-ability-index.mjs` で全 index 再生成
- `scripts/verify-ability-runtime.mjs` で以下を横断検証
  - index 出現 automated template の handler 有無
  - `ability_sequence` の step handler 有無
  - `executeAbilityBody` の未解決 return パス（`showToast -> return`）
  - 前提チェック関数の整合
  - 回帰ヘルパー存在（T_LIVE, スコア経路, マリガン, heart count=0）

結果:

- classify/handler 不整合は検出されず（runtime verify OK）

## 2) verify-ability-runtime.mjs 最終強化

### 追加した強化

- `scripts/snapshots/ability-classify-snapshot.json` の自動出力を追加
  - 代表 50 card_no（template カバレッジ優先で抽出）
  - 各カードの trigger/template/filters を記録
- `jidou-index.json` に `byTemplate` 出力を追加
  - `scripts/build-ability-index.mjs` を更新
  - Phase 6/7 での機械監査粒度を向上

### 出力確認

- `scripts/snapshots/ability-classify-snapshot.json`
  - `sample_size: 50`
  - `cards[*].entries[*]` に `trigger/template/filters`

## 3) 受け入れチェック

- [x] `guided_manual=0`
- [x] 成功ライブカウントは T_LIVE のみ（`successLiveAreaLiveCardCount`）
- [x] `finishResolved` 未到達パス 0（runtime verify チェック）
- [x] スコア経路（`playBonusLiveScore` + `liveScoreEffectBonus` + `joujiLiveScoreBonus`）反映
- [x] マリガン順序（ドロー後に戻してシャッフル）

## 4) 共通ゲート結果

- `node scripts/build-ability-index.mjs` → OK
- `node scripts/verify-ability-runtime.mjs` → OK
- `node scripts/verify-ability-coverage.mjs` → OK
- `guided_manual=0` 維持

## 5) Phase 1〜7 サマリ

- Phase 1: 監査基盤・共通層（finish/前提/スコア/マリガン）整備
- Phase 2: `toujyou` 上位 template 横断（共通前提ゲート追加）
- Phase 3: `kidou` 上位 template 横断（共通前提ゲート追加）
- Phase 4: `live_start` 上位 template 横断（共通前提ゲート追加）
- Phase 5: `live_success` + `ability_sequence`（共通前提ゲート追加、加算経路確認）
- Phase 6: `jidou`/`jouji` 横断（`jidou byTemplate` 追加、granted segment 監査）
- Phase 7: 全 index 機械回帰 + snapshot 出力

## 6) 未解決/リスク

- verify は静的監査中心のため、全カードの実プレイ実行保証ではない
- `PL!SP-sd2-023-SD2` の「必要ハート変更」部分は別途実装余地あり
- `versus` 同期（online/localDual）スコープ外

## 7) 次アクション

1. ソロ実プレイのスモークセット（代表 50 card_no）を最小手順で回す
2. `scripts/snapshots/ability-classify-snapshot.json` を CI の差分監視に組み込む
3. 別プロジェクトとして versus 同期対応（相手対象効果の遠隔実行）へ移行
