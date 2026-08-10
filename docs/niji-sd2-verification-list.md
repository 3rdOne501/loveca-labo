# 虹ヶ咲 スタートデッキ cheer sd2（PL!N-sd2）効果検証リスト

`PL!N-sd2-*`（スタートデッキ ラブライブ！虹ヶ咲学園スクールアイドル同好会 **cheer**）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-sd2.mjs`
- 全文監査: `node scripts/audit-niji-sd2-text.mjs`
- エネルギー（000）は対象外

## メンバー（001–024）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!N-sd2-001-SD2 | kidou_wait_pick_hand | 起動T1: E2→控え室虹ヶ咲ライブ1枚手札 |
| [x] | 002 | PL!N-sd2-002-SD2 | （能力なし） | |
| [x] | 003 | PL!N-sd2-003-SD2 | jouji hand_cost_reduce | 成功ライブに虹ヶ咲があるかぎり手札コスト−2 |
| [x] | 004 | PL!N-sd2-004-SD2 | optional_energy_blade_until_live_end | LS: E任意→ブレード2 |
| [x] | 005 | PL!N-sd2-005-SD2 | heart_color_pick_grant | LS: 手札2捨て任意→好きなハート色を2つ得る |
| [x] | 006 | PL!N-sd2-006-SD2 | grant_jouji_session | LS: 虹ヶ咲1人ウェイト任意→このメンバーがブレード2 |
| [x] | 007 | PL!N-sd2-007-SD2/P | draw_then_conditional_extra_draw | 成功: 1ドロー。相手も同ターン成功ならさらに1ドロー＋手札1捨て |
| [x] | 008 | PL!N-sd2-008-SD2 | optional_energy_blade_until_live_end | 004同型 |
| [x] | 009 | PL!N-sd2-009-SD2 | deck_top_pick_recover | 登場: 上3見→虹ヶ咲1枚手札任意、残り控え室 |
| [x] | 010 | PL!N-sd2-010-SD2 | draw_from_deck + jidou_own_member_wait_discard_activate | 登場2ドロー。自動T1: 虹ヶ咲ウェイト時手札1捨て任意→アクティブ＋ブレード2 |
| [x] | 011 | PL!N-sd2-011-SD2 | toujou_wait_pick_hand | 手札1捨て任意→控え室虹ヶ咲ライブ |
| [x] | 012 | PL!N-sd2-012-SD2 | deck_top_pick_recover | 手札1捨て任意→上3見虹ヶ咲1枚 |
| [x] | 013 | PL!N-sd2-013-SD2 | optional_self_wait_opp_stage | 登場/LS: ステージが虹ヶ咲のみなら相手印刷ブレード≤2をウェイト |
| [x] | 014 | PL!N-sd2-014-SD2 | deck_top_pick_recover | 012同型 |
| [x] | 015 | PL!N-sd2-015-SD2 | draw_from_deck | 起動T1: 自ウェイト＋手札1捨て→1ドロー |
| [x] | 016 | PL!N-sd2-016-SD2 | kidou_stage_wait_pick_hand | 自控え→ライブ回収 |
| [x] | 017 | PL!N-sd2-017-SD2 | activate_stage_members_up_to | LS: E任意→ステージ1人アクティブ |
| [x] | 018 | PL!N-sd2-018-SD2 | （能力なし） | |
| [x] | 019 | PL!N-sd2-019-SD2 | grant_jouji_session + live_start_opp_wait_max_cost | 登場heart05。LS: 相手C≤2ウェイト |
| [x] | 020 | PL!N-sd2-020-SD2 | （能力なし） | |
| [x] | 021 | PL!N-sd2-021-SD2 | optional_self_wait_opp_stage | 登場: 相手C≤4ウェイト |
| [x] | 022 | PL!N-sd2-022-SD2 | （能力なし） | |
| [x] | 023 | PL!N-sd2-023-SD2 | （能力なし） | |
| [x] | 024 | PL!N-sd2-024-SD2 | kidou_stage_wait_pick_hand | 自控え→メンバー回収 |

## ライブ（025–027）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 025 | PL!N-sd2-025-SD2/P | activate_stage_members_up_to | LS: ステージの虹ヶ咲1人をアクティブ |
| [x] | 026 | PL!N-sd2-026-SD2/P | grant_jouji_session | LS: ブレード4以上の虹ヶ咲1人はライブ終了時までheart02×2 |
| [x] | 027 | PL!N-sd2-027-SD2/P | live_start_optional_wait_members_score_per | LS: 虹ヶ咲3人までウェイト任意→1人につきスコア＋1 |

## 2026-08-10 修正（メンバー初回監修）

| ID | 内容 |
|----|------|
| PL!N-sd2-003 | 手札コスト減に成功ライブ虹ヶ咲条件 |
| PL!N-sd2-005 | ハート色指定で2つ得る（1つのみだった） |
| PL!N-sd2-006 | ウェイトコスト後のブレード付与先を自分へ |
| PL!N-sd2-007 | 相手同ターン成功時のみ追加ドロー＋捨て |

## 2026-08-10 修正（ライブ初回監修）

| ID | 内容 |
|----|------|
| PL!N-sd2-026 | 条件のブレードアイコンを付与数に誤算／ブレード≥4の虹ヶ咲1人へheart02×2 |
