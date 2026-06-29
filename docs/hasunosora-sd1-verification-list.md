# 蓮ノ空 スタートデッキ sd1（PL!HS-sd1）効果検証リスト

`PL!HS-sd1-*`（スタートデッキ ラブライブ！蓮ノ空女学院スクールアイドルクラブ）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-sd1.mjs`
- 全文監査: `node scripts/audit-hasunosora-sd1-text.mjs`
- エネルギー 021 以降の P カードは能力なしのため対象外

## メンバー（001–016）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!HS-sd1-001-SD | 日野下花帆 | jidou_baton_leave_activate_energy | 自動: C10+蓮ノ空バトン退場→E2アクティブ |
| [x] | 002 | PL!HS-sd1-002-SD | 村野さやか | ability_sequence | LS: 任意2捨→山札5見てメンバー公開＋蓮ノ空なら heart05+ブレード |
| [x] | 003 | PL!HS-sd1-003-SD | 大沢瑠璃乃 | grant_jouji_session | LS: 任意E→**ほかの**蓮ノ空1人に heart01+ブレード **2026-06-28修正** |
| [x] | 004 | PL!HS-sd1-004-SD | 百生吟子 | toujou_wait_pick_hand + jouji | 登場: 任意蓮ノ空手札1捨→控え室メンバー回収 |
| [x] | 005 | PL!HS-sd1-005-SD | 徒町小鈴 | toujou_wait_pick_hand + jouji | 登場: 徒町以外蓮ノ空からバトン→控え室ライブ **2026-06-28修正** |
| [x] | 006 | PL!HS-sd1-006-SD | 安養寺姫芽 | toujou_named_stage_activate_recover_wait | 登場: 指名3人のいずれか→E1アクティブ＋蓮ノ空ライブ **2026-06-28修正** |
| [x] | 007 | PL!HS-sd1-007-SD | セラス… | （能力なし） | |
| [x] | 008 | PL!HS-sd1-008-SD | 桂城泉 | draw_then_hand_discard / heart_color_pick_grant | 登場1ドロー2/捨1。LS: 任意蓮ノ空2捨→ハート色選択→**他メンバー**に2つ **2026-06-28修正** |
| [x] | 009 | PL!HS-sd1-009-SD | 日野下花帆 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室ライブ |
| [x] | 010–012 | PL!HS-sd1-010–012-SD | — | （能力なし） | |
| [x] | 013 | PL!HS-sd1-013-SD | 徒町小鈴 | toujou_deck_top_wait_if_all_heart | 登場: 山札上3枚ミル→全員heart05なら heart05常時 **2026-06-28修正** |
| [x] | 014 | PL!HS-sd1-014-SD | 安養寺姫芽 | toujou_wait_pick_hand | 登場: 任意1捨→控え室蓮ノ空回収 |
| [x] | 015 | PL!HS-sd1-015-SD | セラス… | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室メンバー |
| [x] | 016 | PL!HS-sd1-016-SD | 桂城泉 | （能力なし） | |

## ライブ（017–020）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 017 | PL!HS-sd1-017-SD | 夏めきペイン | draw_then_hand_discard | 成功: 蓮ノ空メンバーがステージにいる場合 1ドロー→1捨 |
| [x] | 018 | PL!HS-sd1-018-SD | Dream Believers | live_card_score_plus | LS: 蓮ノ空3人＋控え室DreamBelieversでスコア+1 |
| [x] | 019 | PL!HS-sd1-019-SD | アイドゥーミー！ | （能力なし） | |
| [x] | 020 | PL!HS-sd1-020-SD | Link to the FUTURE | live_start_hand_discard_series_member_blade_grant + jouji | LS: 手札蓮ノ空メンバー捨て→ステージ1人にブレード |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-sd1-003-SD | 大沢瑠璃乃 | 他メンバー付与が `optional_energy_blade_until_live_end`（自分）→ `grant_jouji_session` + `grantExcludeSelf` |
| PL!HS-sd1-004-SD | 百生吟子 | `手札の『蓮ノ空』のカード` 捨てコスト未分類 → `handDiscardSeriesTag` + シリーズ限定捨て |
| PL!HS-sd1-005-SD | 徒町小鈴 | バトン条件なしの控え室回収 → `requiresBatonFromSeriesTag` + `excludeBatonPartnerCharacterName` |
| PL!HS-sd1-006-SD | 安養寺姫芽 | 単純回収 → `toujou_named_stage_activate_recover_wait`（指名3人のいずれか＋E1アクティブ） |
| PL!HS-sd1-008-SD | 桂城泉 | LS ハート付与が自分のみ → `grantExcludeSelf` + 蓮ノ空手札2捨コスト + ハート2つ |
| PL!HS-sd1-013-SD | 徒町小鈴 | 山札ミルのみ → `toujou_deck_top_wait_if_all_heart`（heart05 条件付き常時） |

### 問題なし

001–002, 004, 007, 009–012, 014–020
