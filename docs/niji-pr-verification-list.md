# 虹ヶ咲 PR カード（PL!N-PR）効果検証リスト

`PL!N-PR-*`（PRカード / 虹ヶ咲）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-pr.mjs`
- 全文監査: `node scripts/audit-niji-pr-text.mjs`
- エネルギー・能力なし（001–002, 015–018, 029–030+）は対象外

## メンバー（能力付き）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 003 | PL!N-PR-003-PR | 上原歩夢 | kidou_reveal_all_hand_deck_top_live | 起動: 全公開→他メンバー在席・手札無ライブ→山札5見ライブ回収 **2026-06-28修正** |
| [x] | 004–007 | PL!N-PR-004–007-PR | 各種 | deck_top_pick_recover / draw_then_hand_discard | 登場: 山札見・2引2捨 |
| [x] | 008 | PL!N-PR-008-PR | 近江彼方 | kidou_reveal_all_hand_deck_top_live | 003と同型 |
| [x] | 009–014 | PL!N-PR-009–014-PR | 各種 | kidou_stage_wait_pick_hand / deck_top_pick_recover | 起動退場回収・登場山札見 |
| [x] | 010 | PL!N-PR-010-PR | 優木せつ菜 | kidou_reveal_all_hand_deck_top_live | 003と同型 |
| [x] | 011 | PL!N-PR-011-PR | エマ・ヴェルデ | draw_then_hand_discard | 登場: 2引2捨 |
| [x] | 019 | PL!N-PR-019-PR | 三船栞子 | kidou_stage_wait_pick_hand | 起動退場回収 |
| [x] | 020 | PL!N-PR-020-PR | 桜坂しずく | passive_track | 常時: 自ステージ2人→ブレード1 |
| [x] | 021 | PL!N-PR-021-PR | 鐘 嵐珠 | yell_resolution_pick_hand | LS: エール公開から C2以下メンバー or スコア2以下ライブ **2026-06-28修正** |
| [x] | 022 | PL!N-PR-022-PR | エマ・ヴェルデ | toujou_opp_emma_punch_answer | 登場: エマパンチ（相手ステージ全員ブレード） |
| [x] | 023 | PL!N-PR-023-PR | 上原歩夢 | jidou_yell_grant_jouji | 自動: エール同グループ3+→heart01/04 |
| [x] | 024 | PL!N-PR-024-PR | 桜坂しずく | passive_track | 常時: 両者成功ライブ合計4+→ブレード2 |
| [x] | 025 | PL!N-PR-025-PR | 近江彼方 | jidou_enter_or_baton_draw | 自動: 登場/バトン→1ドロー（ターン2回） |
| [x] | 026 | PL!N-PR-026-PR | 天王寺璃奈 | toujou_wait_to_member_under + passive_track | 登場: 控え室虹ヶ咲C9以下を下に / 常時: 下の能力継承 |
| [x] | 027 | PL!N-PR-027-PR | 朝香果林 | passive_track | 常時: 両ステージ合計6人→heart02/05 |
| [x] | 028 | PL!N-PR-028-PR | 三船栞子 | draw_until_hand_size | 登場: 2捨任意→手札5枚まで引く |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-PR-003/008/010-PR | 歩夢/彼方/せつ菜 | `deck_top_pick_recover` 誤分類 → 手札全公開コスト・他メンバー在席・手札無ライブ条件・ライブのみ回収の `kidou_reveal_all_hand_deck_top_live` |
| PL!N-PR-021-PR | 鐘 嵐珠 | エール回収がメンバーC2のみ判定 → メンバーC2以下 or ライブスコア2以下の OR フィルタ |
| parseAbilityPickFilters | — | 「ほかのメンバーがおり」→ minStageMembers=2 |

### 既存実装で問題なし

- 022 エマパンチ、023 エール同グループ、024/027 相手盤面参照、026 能力継承
