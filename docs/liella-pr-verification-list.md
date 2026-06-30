# Liella! PR カード（PL!SP-PR）効果検証リスト

`PL!SP-PR-*`（PRカード / Liella!）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-pr.mjs`
- 全文監査: `node scripts/audit-liella-pr-text.mjs`
- エネルギー・能力なし（001–002, 005, 008, 014–015, 019, 023+）は対象外

## メンバー（能力付き）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 003/007/010 | PL!SP-PR-003/007/010-PR | 各種 | draw_from_deck | 登場: エネルギー7+→1ドロー |
| [x] | 004/006/013 | PL!SP-PR-004/006/013-PR | 各種 | energy_deck_to_wait | 登場: 任意1捨→エネルギーデッキからE1ウェイト |
| [x] | 009/011/012 | PL!SP-PR-009/011/012-PR | 各種 | ability_sequence | LS: 任意1捨→ブレード1 / ライブ捨てなら1ドロー **2026-06-28修正** |
| [x] | 016 | PL!SP-PR-016-PR | 嵐 千砂都 | yell_resolution_pick_hand | LS: エール回収 C2メンバー or スコア2ライブ（Niji 021 修正済） |
| [x] | 017 | PL!SP-PR-017-PR | ウィーン・マルガレーテ | draw_from_deck | 起動: 自ウェイト+手札1捨→1ドロー |
| [x] | 018 | PL!SP-PR-018-PR | 澁谷かのん | yell_resolution_count_energy_wait | LS: エール Liella!7+→E1ウェイト |
| [x] | 020 | PL!SP-PR-020-PR | 桜小路きな子 | toujou_hand_stage_enter | 登場: 低コストバトン→手札C4以下メンバー登場 |
| [x] | 021 | PL!SP-PR-021-PR | 澁谷かのん | live_start_opp_wait_if_stage_hearts | LS: 自ステージハート合計5+→相手C2以下1人ウェイト |
| [x] | 022 | PL!SP-PR-022-PR | 若菜四季 | passive_track | 常時: 両ステージ合計6人→heart02/03 |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-PR-009/011/012-PR | 米女メイ等 | `ability_sequence` が手札1捨コストを支払わずブレード付与・追撃ドローしていた → シーケンス開始前に `payAbilityCost` |

### 既存実装で問題なし

- 003/007/010 エネルギー7枚条件ドロー、016 エール OR 回収、017 起動コスト、018 Liella!7枚カウント、020 バトン条件、021/022 相手盤面参照
