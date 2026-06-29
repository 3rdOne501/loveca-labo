# Liella! 1弾（bp1）効果検証リスト

`PL!SP-bp1-*`（ラブライブ！スーパースター!! / Liella!）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-bp1.mjs`
- 全文監査: `node scripts/audit-liella-bp1-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–012）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!SP-bp1-001-R | 澁谷かのん | jouji passive | 他メンバーなし→ライブ不可 |
| [x] | 002 | PL!SP-bp1-002-R＋ | 唐可可 | draw_from_deck | EE任意・**左サイド登場時のみ**2枚引き |
| [x] | 003 | PL!SP-bp1-003-R＋ | 嵐千砂都 | kidou_reveal_hand_cost_threshold | 公開コスト合計→常時スコア+1 |
| [x] | 004 | PL!SP-bp1-004-R | 平安名すみれ | jouji passive | |
| [x] | 005 | PL!SP-bp1-005-R | 葉月恋 | deck_top_pick_recover | Liella! 1枚回収 |
| [x] | 006 | PL!SP-bp1-006-R | 桜小路きな子 | optional_energy_blade_until_live_end | |
| [x] | 007 | PL!SP-bp1-007-R＋ | 米女メイ | toujou_wait_pick_hand | エネルギー11枚以上→控え室ライブ回収 |
| [x] | 008 | PL!SP-bp1-008-R | 若菜四季 | draw_then_conditional_extra_draw | 米女メイ on stage で追加1枚 |
| [x] | 009 | PL!SP-bp1-009-R | 鬼塚夏美 | draw_then_hand_discard | EEE起動 |
| [x] | 010 | PL!SP-bp1-010-R | ウィーン | deck_top_pick_recover | EE+手札1→Liella!回収 |
| [x] | 011 | PL!SP-bp1-011-R | 鬼塚冬毬 | kidou_stage_wait_pick_hand | |
| [x] | 012 | PL!SP-bp1-012-N | 澁谷かのん | deck_top_pick_recover | EE任意・3枚見て1枚 |

## ライブ（023–027）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 023 | PL!SP-bp1-023-L | START!! True dreams | live_score_higher_energy_wait | **ライブ成功時**: 自ライブ合計スコア＞相手→Eデッキ1枚ウェイト（相手ライブなし=0扱い FAQ Q66） |
| [x] | 024 | PL!SP-bp1-024-L | Tiny Stars | live_start_named_member_heart_blades / live_success_characters_draw | LS: かのんh05+刃/可可h01+刃（**ライブ終了時まで**）/ LS成功: 両名在席で1ドロー **2026-06-28修正** |
| [x] | 025 | PL!SP-bp1-025-L | Starlight Prologue | （能力なし） | ALLブレード説明のみ |
| [x] | 026 | PL!SP-bp1-026-L | 未来予報ハレルヤ！ | live_start_need_heart_set_fixed | 異名Liella!5人（ステージ+控え室）→必要ハート桃2/黄2/紫2に固定 **2026-06-28修正** |
| [x] | 027 | PL!SP-bp1-027-L | Sing! Shine! Smile! | live_card_score_plus | エネルギー12枚+1（括弧ドロー説明は除外済） |

## ライブ修正（2026-06-28）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-bp1-024-L | Tiny Stars | 指名メンバーへのハート+ブレードを `playBonusHeartSlotsAlways` / `playBonusBladeAlways` に変更（ライブ終了時まで） |
| PL!SP-bp1-026-L | 未来予報ハレルヤ！ | ステージ+控え室の異名カウントで Liella! シリーズ行のキャラ名キーを使用（FAQ Q105 系） |
| PL!SP-bp1-023-L | START!! True dreams | ソロ時の相手ライブ合計スコア入力を `ensureSoloOpponentLiveFrameScore` 経由に統一 |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-bp1-025-L | Starlight Prologue | 能力なし（ALLブレード説明のみ） |
| PL!SP-bp1-027-L | Sing! Shine! Smile! | エネルギー12枚以上でスコア+1 |

## 横展開修正（2026-06-28）

- **唐可可 bp1-002（4レア）**: `登場しているなら` + 左サイド → `twT` で `stageArea: left`（`abilityInstMatchesStageArea` で実行前チェック）
