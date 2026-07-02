# 虹ヶ咲 スタートデッキ sd1（PL!N-sd1）効果検証リスト

`PL!N-sd1-*`（スタートデッキ ラブライブ！虹ヶ咲学園スクールアイドル同好会）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-sd1.mjs`
- 全文監査: `node scripts/audit-niji-sd1-text.mjs`
- エネルギー 025–031 は能力なしのため対象外

## メンバー（001–024）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!N-sd1-001-SD | 上原歩夢 | deck_top_pick_recover / grant_jouji_session | 登場: 5枚見て虹ヶ咲ライブ1枚 / LS: 任意E→他虹ヶ咲メンバーブレード **2026-06-28修正** |
| [x] | 002 | PL!N-sd1-002-SD | 中須かすみ | deck_top_pick_recover | 登場: 任意1捨→3枚見て1枚 |
| [x] | 003 | PL!N-sd1-003-SD | 桜坂しずく | deck_top_pick_recover | 002と同型 |
| [x] | 004 | PL!N-sd1-004-SD | 朝香果林 | grant_jouji_session | LS: 任意1捨→ブレード2 |
| [x] | 005 | PL!N-sd1-005-SD | 宮下愛 | kidou_hand_cost_wait_pick_hand | 起動: 手札2捨→控え室虹ヶ咲メンバー |
| [x] | 006 | PL!N-sd1-006-SD | 近江彼方 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室メンバー |
| [x] | 007 | PL!N-sd1-007-SD | 優木せつ菜 | kidou_hand_cost_wait_pick_hand | 起動: 手札2捨→控え室虹ヶ咲ライブ |
| [x] | 008 | PL!N-sd1-008-SD | エマ・ヴェルデ | activate_energy | 登場: E2アクティブ |
| [x] | 009 | PL!N-sd1-009-SD | 天王寺璃奈 | kidou_hand_cost_wait_pick_hand | 起動 E2+1捨→控え室虹ヶ咲ライブ |
| [x] | 010 | PL!N-sd1-010-SD | 三船栞子 | draw_then_hand_discard / grant_jouji_session | 登場: 2ドロー1捨 / LS: 任意E2→heart04 |
| [x] | 011 | PL!N-sd1-011-SD | ミア・テイラー | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室ライブ |
| [x] | 012 | PL!N-sd1-012-SD | 鐘嵐珠 | （能力なし） | |
| [x] | 013 | PL!N-sd1-013-SD | 上原歩夢 | draw_then_hand_discard | 登場: 1ドロー1捨 |
| [x] | 014–020 | PL!N-sd1-014〜020-SD | — | （能力なし） | |
| [x] | 021 | PL!N-sd1-021-SD | 天王寺璃奈 | draw_then_hand_discard | 013と同型 |
| [x] | 022 | PL!N-sd1-022-SD | 三船栞子 | draw_then_hand_discard | 013と同型 |
| [x] | 023–024 | PL!N-sd1-023〜024-SD | — | （能力なし） | |

## ライブ（025–028）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025–027 | PL!N-sd1-025〜027-SD | — | （能力なし） | |
| [x] | 028 | PL!N-sd1-028-SD | Dream with You | live_card_score_plus | LS: ステージブレード合計10+でスコア+1 **2026-06-28修正** |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-sd1-001-SD | 上原歩夢 | LS: 他虹ヶ咲メンバーブレードが `optional_energy_blade_until_live_end`（自分付与）→ `grant_jouji_session`（grantExcludeSelf） |
| PL!N-sd1-001-SD | 上原歩夢 | 登場: 虹ヶ咲ライブ回収の pickType ライブが未設定 |
| PL!N-sd1-028-SD | Dream with You | ステージブレード合計10+条件なしでスコア+1 → `minStageMemberBladeSum` 条件追加 |

### 問題なし

002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 013, 021, 022 および能力なし 012, 014–020, 023–027

## 2026-06-30 2回監修（虹ヶ咲 sd1 収録カード群）

**対象**: メンバー 001–024（能力付き 15 枚 + 能力なし 9 枚）、ライブ 025–028（能力付き 1 枚 + リマインダー文 3 枚）。エネルギー 025–031 は対象外。

- verify 30 / audit 通過
- 025–027 は `special_heart` リマインダー（トリガー能力なし）— verify で no triggered ability 確認済

### 修正した

なし

### 再確認のみ（問題なし）

001–011, 013, 021–022, 028 および能力なし 012, 014–020, 023–024、リマインダー 025–027
