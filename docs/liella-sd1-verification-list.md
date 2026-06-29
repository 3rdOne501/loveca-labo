# Liella! スタートデッキ DUO sd1（PL!SP-sd1）効果検証リスト

`PL!SP-sd1-*`（スタートデッキ ラブライブ！スーパースター!! / Liella!）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-sd1.mjs`
- 全文監査: `node scripts/audit-liella-sd1-text.mjs`
- エネルギー 027–037 は能力なしのため対象外

## メンバー（001–022）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!SP-sd1-001-SD | 澁谷かのん | toujou_draw_per_energy_unit | 登場: エネルギー6枚につき1ドロー **2026-06-28修正** |
| [x] | 002 | PL!SP-sd1-002-SD | 唐 可可 | toujou_hand_stage_enter | 登場: 手札 C4以下 Liella! 登場（占有エリア可・当ターン登場列不可） **2026-06-28修正** |
| [x] | 003 | PL!SP-sd1-003-SD | 嵐 千砂都 | grant_jouji_session | LS: 任意2捨→ブレード5 |
| [x] | 004 | PL!SP-sd1-004-SD | 平安名すみれ | grant_jouji_session | 登場: 常時ライブ合計スコア+1 |
| [x] | 005 | PL!SP-sd1-005-SD | 葉月 恋 | kidou_wait_pick_hand | 起動: E3→控え室ライブ回収 |
| [x] | 006 | PL!SP-sd1-006-SD | 桜小路きな子 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室ライブ |
| [x] | 007 | PL!SP-sd1-007-SD | 米女メイ | toujou_wait_pick_hand | 登場: 任意E2→控え室 Liella! メンバー |
| [x] | 008 | PL!SP-sd1-008-SD | 若菜四季 | deck_top_pick_recover | 登場: 任意E1→山札3枚見て1枚 |
| [x] | 009 | PL!SP-sd1-009-SD | 鬼塚夏美 | deck_top_pick_recover | 登場: E9+かつ任意E1→山札5枚見て1枚 |
| [x] | 010 | PL!SP-sd1-010-SD | 澁谷かのん | （能力なし） | |
| [x] | 011 | PL!SP-sd1-011-SD | 鬼塚冬毬 | energy_deck_to_wait | 起動: E2→エネルギーデッキからウェイト1枚 |
| [x] | 012–013 | PL!SP-sd1-012/013-SD | 澁谷かのん/唐可可 | （能力なし） | |
| [x] | 014 | PL!SP-sd1-014-SD | 嵐 千砂都 | energy_deck_to_wait | 登場: 任意1捨→エネルギーデッキからウェイト |
| [x] | 015 | PL!SP-sd1-015-SD | 平安名すみれ | （能力なし） | |
| [x] | 016 | PL!SP-sd1-016-SD | 葉月 恋 | energy_deck_to_wait | 014と同型 |
| [x] | 017 | PL!SP-sd1-017-SD | 桜小路きな子 | deck_top_pick_recover | 登場: 任意E1→山札3枚見て1枚 |
| [x] | 018–022 | PL!SP-sd1-018–022-SD | — | （能力なし） | |

## ライブ（023–026）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 023 | PL!SP-sd1-023-SD | WE WILL!! | （リマインダー文のみ） | スコア特殊ハート（エール解決時） |
| [x] | 024 | PL!SP-sd1-024-SD | シェキラ☆☆☆ | （リマインダー文のみ） | ALLブレード→任意ハート（必要ハート確認時） |
| [x] | 025 | PL!SP-sd1-025-SD | 未来は風のように | （リマインダー文のみ） | 024と同型 |
| [x] | 026 | PL!SP-sd1-026-SD | 私のSymphony | live_card_score_plus | LS: E9+でスコア+1 |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-sd1-001-SD | 澁谷かのん | 「エネルギー6枚につき1ドロー」が `draw_from_deck`（常に1枚）→ `toujou_draw_per_energy_unit` 新設 |
| PL!SP-sd1-002-SD | 唐 可可 | 占有エリアへの手札登場が空列のみ選択 → `allowOccupiedStageColumn`（当ターン登場列・登場不可列は除外） |

### 問題なし

003–011, 014, 016–017, 026 および能力なし 010, 012–013, 015, 018–022、リマインダー文のみ 023–025
