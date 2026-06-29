# Liella! 2弾 / NEXTSTEP（bp2）効果検証リスト

`PL!SP-bp2-*`（ブースターパック NEXTSTEP）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-bp2.mjs`
- 全文監査: `node scripts/audit-liella-bp2-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–022）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!SP-bp2-001-P | 澁谷かのん | toujou_optional_disable_live_start_recover_wait | 任意: Liella!1人の**ライブ開始時**能力を無効→無効にしたら控え室からLiella!1枚回収 **2026-06-28修正** |
| [x] | 002 | PL!SP-bp2-002-P | 唐可可 | deck_top_pick_recover | 3枚見る→**コスト11以上**1枚回収（シリーズ指定なし） |
| [x] | 003 | PL!SP-bp2-003-P | 嵐千砂都 | jidou_area_move_energy_wait | 自動/ターン1回: ステージ内エリア移動時→エネルギーデッキ1枚ウェイト |
| [x] | 004 | PL!SP-bp2-004-P | 平安名すみれ | jouji passive | 常時: 自センターがステージ最大コストなら heart03 |
| [x] | 005 | PL!SP-bp2-005-P | 葉月恋 | deck_top_pick_recover | EE任意→7枚見て Liella!1枚回収 |
| [x] | 006 | PL!SP-bp2-006-P | 桜小路きな子 | toujou_baton_discarded_pick_hand / kidou_hand_discard_trigger_ability | 登場: バトンタッチで捨てた Liella!メンバー1枚回収 / 起動: 手札Liella!コスト4以下捨て→その登場能力1つ（コストあれば支払い） |
| [x] | 007 | PL!SP-bp2-007-P | 米女メイ | deck_top_pick_recover | 手札1枚捨て任意→5枚見て Liella!**メンバー**1枚回収（pickType修正） |
| [x] | 008 | PL!SP-bp2-008-P | 若菜四季 | live_start_position_change | 起動/ターン1回 E: 別エリアへ移動（在席メンバーと入れ替え） |
| [x] | 009 | PL!SP-bp2-009-P | 鬼塚夏美 | live_start_hand_blade_per / draw_then_hand_discard | ライブ開始: 手札2枚につきブレード / 成功時: 2ドロー→手札1枚捨て |
| [x] | 010 | PL!SP-bp2-010-P | ウィーン | jouji passive / live_start_yell_reveal_reduction | 常時: 相手ライブ置き場の必要 heart0+1 / ライブ開始: 他メンバー1人+→エール公開枚数-8 |
| [x] | 011 | PL!SP-bp2-011-P | 鬼塚冬毬 | toujou_wait_pick_opp_live | 控え室から**異名ライブ2枚**提示→**相手**が1枚選択→手札（2枚未満は不発・FAQ Q118）**ソロは相手代行ダイアログ** |
| [x] | 013 | PL!SP-bp2-013-N | 唐可可 | waiting_reorder_deck_top | 控え室1枚までデッキの一番上 |
| [x] | 014 | PL!SP-bp2-014-N | 嵐千砂都 | waiting_reorder_deck_top | 同上 |
| [x] | 015 | PL!SP-bp2-015-N | 平安名すみれ | jidou_yell_grant_jouji_no_bh | 自動/ターン1回: エール公開にBHなし→heart06（エール未実施なら不発） |
| [x] | 018 | PL!SP-bp2-018-N | 米女メイ | waiting_reorder_deck_top | 控え室1枚までデッキの一番上 |
| [x] | 019 | PL!SP-bp2-019-N | 若菜四季 | optional_energy_blade_until_live_end | ライブ開始 E任意→ライブ終了までブレード2 |
| [x] | 020 | PL!SP-bp2-020-N | 鬼塚夏美 | jidou_yell_grant_jouji_no_bh | 自動/ターン1回: エール公開にBHなし→heart02 |
| [x] | 021 | PL!SP-bp2-021-N | ウィーン | jidou_yell_grant_jouji_no_bh | 自動/ターン1回: エール公開にBHなし→heart03 |
| [x] | 022 | PL!SP-bp2-022-N | 鬼塚冬毬 | optional_energy_blade_until_live_end | ライブ開始 E任意→ライブ終了までブレード2 |

## ライブ（023–025）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 023 | PL!SP-bp2-023-L | Go!! リスタート | live_card_score_plus | ライブ開始: 自成功ライブ枚数＜相手→スコア+1 |
| [x] | 024 | PL!SP-bp2-024-L | ビタミンSUMMER！ | live_card_score_plus | ライブ成功: 自手札枚数＞相手→スコア+1 |
| [x] | 025 | PL!SP-bp2-025-L | Bubble Rise | yell_resolution_pick_hand | ライブ成功: かのん/ウィーン/冬毬のうち異名2人+→エール公開1枚手札（指名2人以上条件） **2026-06-28修正** |

## 2026-06-28 検証（再）

- **001-P**: `toujou_optional_disable_live_start_recover_wait` 新設。旧 bp2-010 専用 confirm ハック削除。
- **007-P**: `メンバーカードを1枚公開` の pickType 解析。
- **025-L**: `namedStageMemberList` + `minDistinctNamedStageMembersFromList: 2` 前置条件。
- 自動回帰: `verify-liella-bp2.mjs` 15ケース。
