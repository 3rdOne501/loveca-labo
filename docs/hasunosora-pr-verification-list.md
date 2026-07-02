# 蓮ノ空 PR カード（PL!HS-PR）効果検証リスト

`PL!HS-PR-*`（PRカード / 蓮ノ空）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-pr.mjs`
- 任意E自動ウェイト: `node scripts/verify-optional-energy-auto-pay.mjs`
- 全文監査: `node scripts/audit-hasunosora-pr-text.mjs`
- エネルギー・能力なし（003–009, 013, 015, 024–025, 030, 033–034+）は対象外

## メンバー（能力付き）

| 状態 | 番号 | ID | 主テンプレート | 備考 |
|------|------|-----|----------------|------|
| [x] | 001–002, 005 | PL!HS-PR-001/002/005-PR | deck_top_pick_recover + optional_energy_blade_until_live_end | 登場: 任意1捨→山札3見 / LS: 任意E2→ブレード2 |
| [x] | 014, 026 | PL!HS-PR-014/026-PR | kidou_stage_wait_pick_hand | 起動退場→控え室回収 |
| [x] | 016–017 | PL!HS-PR-016/017-PR | live_start_hand_discard_same_unit_grant | LS: 同ユニット2枚捨→ブレード2 |
| [x] | 018, 022 | PL!HS-PR-018/022-PR | optional_energy_blade_until_live_end | LS: 任意E→ブレード。解決時E自動ウェイト（支払いダイアログ省略） |
| [x] | 019 | PL!HS-PR-019-PR / 019-RM | toujou_deck_top_wait_if_all_heart | 登場: 山札3ミル→全員heart04→heart04付与 |
| [x] | 021 | PL!HS-PR-021-PR / 021-RM | toujou_deck_top_wait_if_all_heart | 登場: 山札3ミル→全員heart01→heart01付与 **2026-06-28 付与漏れ修正** |
| [x] | 020, 023 | PL!HS-PR-020/023-PR | live_start_optional_energy_waiting_reorder_deck_top | LS: 任意E→控え室2枚山札上 |
| [x] | 029 | PL!HS-PR-029-PR | grant_jouji_session | LS: 任意E→heart01 |
| [x] | 031 | PL!HS-PR-031-PR | draw_until_hand_size | 登場: 2捨任意→手札5枚まで |
| [x] | 032 | PL!HS-PR-032-PR | toujou_wait_pick_hand | 登場: 控え室スコア6+ライブ回収 |

## ライブ（能力付き）

| 状態 | 番号 | ID | 名前 | 備考 |
|------|------|-----|------|------|
| [x] | 010–012 | PL!HS-PR-010–012-PR | Reflection 等 | 常時: エールALL BH→任意色（triggerなし・BH flex は fulfillment 既存） **手動ガイド維持** |
| [x] | 027 | PL!HS-PR-027-PR | — | LS: エール回収 C2メンバー or スコア2ライブ |
| [x] | 028 | PL!HS-PR-028-PR | Echoes Beyond | LS: 余剰ハート持ちメンバー→1ドロー **2026-06-28修正** |

## 2026-06-28 検証

### 修正した

| ID | 内容 |
|----|------|
| PL!HS-PR-019-PR / 019-RM | `deck_top_to_waiting` 誤分類 → `toujou_deck_top_wait_if_all_heart`（heart04） |
| PL!HS-PR-021-PR / 021-RM | 同上（heart01）。条件成立時も付与されない → `extractInlineLiveEndGrantJouji` 併用で修正 |
| PL!HS-PR-028-PR | 余剰ハート条件なしで無条件ドロー → `minStageOverflowHeartMembers: 1` |

### 既存実装で問題なし

- 001/005 山札見・E2ブレード、016 同ユニット2枚、020/023 控え室並べ替え、027 エール OR 回収、029 E→heart01、032 スコア6+ライブ

### 手動ガイド（意図的）

- 010–012: トリガーなしのライブ常時効果（エール BH 柔軟充当は `resolutionBladeHeartContributionForFulfillment` で ALL BH 対応）

## 2026-06-30 2回監修

- 能力付き21枚 + 019-RM/021-RM 同型。010–012 リマインダーは手動ガイド維持
- 028 余剰ハート条件ドロー・019/021 山札ミル付与を再確認
- verify 13 / audit 通過。新規修正なし
