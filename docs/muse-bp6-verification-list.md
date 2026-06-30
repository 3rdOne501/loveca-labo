# μ's bp6 / RoyalHoliday（PL!-bp6）効果検証リスト

`PL!-bp6-*`（ブースターパック RoyalHoliday / μ's）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-muse-bp6.mjs`
- 全文監査: `node scripts/audit-muse-bp6-text.mjs`
- エネルギー（E01–E20）は対象外

## メンバー（001–018）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!-bp6-001-P | grant_jouji_session + draw_then_hand_discard | センター・ライブ枠µ's→**全ステージμ's**にブレード1 / LS: エール無BHμ's→1ドロー1捨て **2026-06-28(2): grantToStageSeriesTag** |
| [x] | 002 | PL!-bp6-002-P | deck_top_pick_no_ability_or_jouji | 山札2見→能力なし or 常時μ's 1枚回収（任意） **2026-06-28(2): 見る処理は必須** |
| [x] | 003 | PL!-bp6-003-P | live_start_hand_reveal_under_heart_grant / live_success_enter_under_member | 手札C2以下公開→下置き+ハート / 下からC2以下を空きエリア登場（任意） **2026-06-28(2): LS任意確認** |
| [x] | 004 | PL!-bp6-004-P | deck_top_pick_recover | 任意コスト手札1捨→山札5見→μ'sメンバー回収 |
| [x] | 005 | PL!-bp6-005-P | toujou_hand_discard_wait_heart_dual_pick | 手札2捨任意→heart03メンバー+heart03ライブ回収 |
| [x] | 006 | PL!-bp6-006-P | kidou_heart_color_deck_reveal_pick | 手札1捨→色指定→山札5公開→μ's一致5枚→ブレード3 |
| [x] | 007 | PL!-bp6-007-P | deck_top_reveal_hand_score_grant | 山札上公開→手札、非BHメンバーなら合計スコア+1 |
| [x] | 008 | PL!-bp6-008-P | kidou_self_wait_activate_other | 自ウェイト→他メンバー1人アクティブ（ターン1回） |
| [x] | 009 | PL!-bp6-009-P | jouji (live_score_plus) | 左右サイドに元々ブレード2→合計スコア+1 |
| [x] | 010 | PL!-bp6-010-N | kidou_self_to_wait_opp_wait | 自退場→相手C4以下ウェイト |
| [x] | 011 | PL!-bp6-011-N | draw_then_hand_discard | 2ドロー+手札2捨て |
| [x] | 012–015 | PL!-bp6-012-N 他 | jouji (blade_conditional) | 成功ライブに Printemps / lilywhite / BiBi → heart付与 |
| [x] | 013 | PL!-bp6-013-N | toujou_wait_pick_hand | 自SL合計スコア6+→控え室からμ'sライブ回収 |
| [x] | 016 | PL!-bp6-016-N | deck_top_look_reorder | 山札3見→並べ替え |
| [x] | 017–018 | PL!-bp6-017-N / 018-N | — | 能力なし |

## ライブ（019–024）

| 状態 | 番号 | ID | 主テンプレート | 備考 |
|------|------|-----|----------------|------|
| [x] | 019 | PL!-bp6-019-L | jouji grant_hand_series_cost_reduce | 成功ライブ在席時・手札µ's C17+登場コスト-2 **2回目: OK** |
| [x] | 020 | PL!-bp6-020-L | jidou_center_muse_ability ×2 | LS解決時ポジチェン / 移動済みならスコア+1 **2026-06-28(2): FAQ255 センター離脱後も誘発** |
| [x] | 021 | PL!-bp6-021-L | live_success_optional_stage_to_waiting_score_recover | 任意: メンバー退場→+1・控え室µ'sライブ回収 **2026-06-28(2): 任意確認** |
| [x] | 022 | PL!-bp6-022-L | jouji success_live_live_need_heart_reduce | 成功ライブ在席・µ'sスコア5+ライブの必要heart0-2 **2回目: OK** |
| [x] | 023 | PL!-bp6-023-L | draw_then_conditional_extra_draw | 1ドロー+成功ライブにµ'sカードで追加1ドロー **2回目: OK** |
| [x] | 024 | PL!-bp6-024-L | jouji success_live_waiting_substitute | 成功ライブ置き場へ控え室µ'sライブ代置 **2回目: OK** |

## 2026-06-28 修正（2回目・メンバー深掘り）

| ID | 内容 |
|----|------|
| PL!-bp6-001-P | `grant_jouji_session`: 「すべての『μ's』のメンバーは」→ `grantToStageSeriesTag`（全員ブレード付与） |
| PL!-bp6-002-P | `deck_top_pick_no_ability_or_jouji`: 山札を見る処理がスキップ可能になっていたのを修正（手札加えのみ任意） |
| PL!-bp6-003-P | `live_success_enter_under_member`: 「登場させてもよい」に確認ダイアログ追加 |

## 2026-06-28 修正（2回目・ライブ深掘り）

| ID | 内容 |
|----|------|
| PL!-bp6-020-L | `jidou_center_muse_*`: 能力解決時点でセンターを離れていても誘発（FAQ Q255・解決開始時のセンター判定を記録） |
| PL!-bp6-021-L | `live_success_optional_stage_to_waiting_score_recover`: 「置いてもよい」に確認ダイアログ追加 |
