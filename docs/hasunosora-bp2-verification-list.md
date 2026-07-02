# 蓮ノ空 2弾 / NEXTSTEP（bp2）効果検証リスト

`PL!HS-bp2-*`（ブースターパック NEXTSTEP）をカード番号順に検証する。

> **蓮ノ空 pb2 について**: `PL!HS-pb2-*` は `cards.json` 未収録（2026-06時点）。プレミアムブースター2弾の蓮ノ空カードが追加されたら本リストと同型の `verify-hasunosora-pb2.mjs` を作成する。

- 自動回帰: `node scripts/verify-hasunosora-bp2.mjs`
- 全文監査: `node scripts/audit-hasunosora-bp2-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–018）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!HS-bp2-001-P | 日野下花帆 | kidou_wait_pick_hand | 起動/ターン1回 EE: 控え室スコア3以下の蓮ノ空ライブ1枚回収 |
| [x] | 002 | PL!HS-bp2-002-P | 村野さやか | toujou_wait_pick_hand / jouji passive | 登場: 控え室コスト2以下メンバー2枚まで回収 / 常時: より高コストメンバーがいればブレード3 |
| [x] | 003 | PL!HS-bp2-003-P | 乙宗梢 | deck_top_look_reorder | ライブ開始 手札1枚捨て任意→3枚見て並べ替え |
| [x] | 004 | PL!HS-bp2-004-P | 夕霧綴理 | kidou_stage_wait_pick_hand | 起動: 自ら控え室へ→控え室ライブ1枚回収 |
| [x] | 005 | PL!HS-bp2-005-P | 大沢瑠璃乃 | toujou_wait_pick_hand / optional_energy_blade_until_live_end | 登場: 他メンバー+みらくらぱーく1枚回収 / LS: 全エリア+E→BH2 **2026-06-28修正** |
| [x] | 006 | PL!HS-bp2-006-P | 藤島慈 | toujou_optional_all_members_relocate / jouji passive | 登場: 全メンバー任意移動 / 常時: 他みらくらぱーく1人につきブレード1 |
| [x] | 007 | PL!HS-bp2-007-P | 百生吟子 | toujou_wait_pick_hand / grant_jouji_session | 登場: SBバトン→蓮ノ空ライブ1枚 / LS: 同名付与 **2026-06-28修正** |
| [x] | 008 | PL!HS-bp2-008-P | 徒町小鈴 | grant_jouji_session | 登場: 低コストDOLLCHESTRAからバトン→ブレード2 |
| [x] | 009 | PL!HS-bp2-009-P | 安養寺姫芽 | toujou_baton_series_heart_grant | 登場 E任意: 低コストみらくらぱーくからバトン→heart01×2 |
| [x] | 010 | PL!HS-bp2-010-N | 日野下花帆 | deck_top_pick_recover | 手札1枚捨て任意→5枚見てメンバー1枚回収 |
| [x] | 011 | PL!HS-bp2-011-N | 村野さやか | deck_top_to_waiting | デッキ上5枚→すべて控え室（手札回収なし） |
| [x] | 012 | PL!HS-bp2-012-N | 乙宗梢 | jidou_leave_stage_deck_look_pick | 退場時 5枚見てメンバー1枚回収 |
| [x] | 013 | PL!HS-bp2-013-N | 夕霧綴理 | jidou_leave_stage_deck_look_pick | 退場時 5枚見て**ライブ**1枚回収 |
| [x] | 014 | PL!HS-bp2-014-N | 大沢瑠璃乃 | draw_from_deck | 1ドロー→**ライブ終了までライブ不可** **2026-06-28修正** |
| [x] | 015 | PL!HS-bp2-015-N | 藤島慈 | jidou_leave_stage_draw_discard | 退場時 2ドロー→手札1枚捨て |
| [x] | 016 | PL!HS-bp2-016-N | 百生吟子 | deck_top_look_reorder | 2枚見て並べ替え |
| [x] | 017 | PL!HS-bp2-017-N | 徒町小鈴 | draw_from_deck | 控え室10枚+なら1ドロー **2026-06-28修正** |
| [x] | 018 | PL!HS-bp2-018-N | 安養寺姫芽 | toujou_main_phase_live_from_waiting | メインフェイズ E任意→控え室ライブをライブ置き場へ（次セット上限-1） |

## ライブ（019–026）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!HS-bp2-019-L | Bloom the smile, Bloom the dream! | live_start_need_heart_set_choice | ライブ開始 蓮ノ空 on stage→必要ハートを heart01×2+0 / heart04×2+0 / heart05×2+0 から選択 |
| [x] | 020 | PL!HS-bp2-020-L | Link to the FUTURE | jouji passive / live_card_score_plus_per_unit | 常時: 3グループ扱い / ライブ開始: 異名蓮ノ空1人につきスコア+2 |
| [x] | 021 | PL!HS-bp2-021-L | 眩耀夜行 | live_start_need_heart_reduce_fixed | ライブ開始: ターン中バトン登場蓮ノ空2人+→必要heart04-1 |
| [x] | 022 | PL!HS-bp2-022-L | アオクハルカ | live_card_score_plus | ライブ開始: 控え室スリーズブーケライブ3枚+→スコア+1 |
| [x] | 023 | PL!HS-bp2-023-L | Mirage Voyage | live_start_need_heart_reduce_fixed | ライブ開始: ターン中バトン登場蓮ノ空2人+→必要heart05-1 |
| [x] | 024 | PL!HS-bp2-024-L | レディバグ | live_start_need_heart_reduce_fixed | ライブ開始: 徒町小鈴+より高コスト村野さやか→必要heart0-3 |
| [x] | 025 | PL!HS-bp2-025-L | ココン東西 | live_start_need_heart_reduce_fixed | ライブ開始: ターン中バトン登場蓮ノ空2人+→必要heart01-1 |
| [x] | 026 | PL!HS-bp2-026-L | みらくりえーしょん | live_card_score_plus | 右瑠璃乃・左姫芽・中慈→スコア+2 **2026-06-28修正**（エリア条件） |

## 2026-06-28 メンバー検証

メンバー001–018を再監査。

- **007-P 百生吟子**: 登場時の回収対象がスリーズブーケ誤り→蓮ノ空ライブ、低コストスリーズブーケからのバトン条件未チェックを修正。
- **005-P 大沢瑠璃乃**: 登場「ほかのメンバー」条件・ライブ開始「全エリアにメンバー」条件を追加。
- **014-N 大沢瑠璃乃**: 「ライブできない」状態（8.3.4.1）が未実装だったため追加。
- **017-N 徒町小鈴**: 控え室10枚+条件が未チェックだったため `minWaitingAnyCardCount` を追加。

## 2026-06-28 ライブ検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-bp2-026-L | みらくりえーしょん | 右瑠璃乃・左姫芽・中慈のエリア配置条件（`requiresStageNamedMemberAreas`）を追加 |
| PL!HS-bp2-020-L | Link to the FUTURE | 異名カウントを FAQ Q105 準拠（`seriesMemberDistinctNameKeys`）に修正 |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-bp2-019-L | Bloom the smile, Bloom the dream! | 蓮ノ空 on stage→必要ハート3択（heart01/04/05×2+0） |
| PL!HS-bp2-021-L | 眩耀夜行 | バトン登場蓮ノ空2人+→必要heart04-1 |
| PL!HS-bp2-022-L | アオクハルカ | 控え室スリーズブーケライブ3枚+→+1 |
| PL!HS-bp2-023-L | Mirage Voyage | バトン登場蓮ノ空2人+→必要heart05-1 |
| PL!HS-bp2-024-L | レディバグ | 徒町小鈴+高コスト村野さやか→必要heart0-3 |
| PL!HS-bp2-025-L | ココン東西 | バトン登場蓮ノ空2人+→必要heart01-1 |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 全60枚再確認。`guided_manual=0`。新規コード修正なし |
| PL!HS-bp2-005-P | 全エリア+E→BH2（`optional_energy_blade_until_live_end`）を再確認 |
| PL!HS-bp2-007-P | SBバトン→ライブ回収・同名付与を再確認 |
| PL!HS-bp2-020-L / 026-L | 異名カウント・指名エリア配置条件を再確認 |
| verify | 21ケースすべて通過 |
