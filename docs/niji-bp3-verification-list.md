# 虹ヶ咲 3弾 / 夏、はじまる。（bp3）効果検証リスト

`PL!N-bp3-*`（ブースターパック **夏、はじまる。**）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-bp3.mjs`
- 全文監査: `node scripts/audit-niji-bp3-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–024）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!N-bp3-001-P | 上原歩夢 | live_start (energy under + grant) | ライブ開始: エネルギー1枚を下に置いてもよい→1ドロー→全メンバーブレード2 |
| [x] | 002 | PL!N-bp3-002-P | 中須かすみ | live_start:heart_color_pick_grant | 手札1枚捨て任意→ハート色指定→他虹ヶ咲1人にそのハート1 |
| [x] | 003 | PL!N-bp3-003-P | 桜坂しずく | toujou_wait_pick_trigger_ability | 控え室コスト4以下虹ヶ咲メンバー1枚→その**登場**能力1つ（コストあれば支払い） |
| [x] | 004 | PL!N-bp3-004-P | 朝香果林 | kidou_hand_cost_wait_pick_hand | 起動: 自らウェイト+手札1枚捨て→控え室虹ヶ咲ライブ1枚回収 |
| [x] | 005 | PL!N-bp3-005-P | 宮下愛 | jidou_stage_entry_draw_until / grant_jouji_session | 自動: ターン中3回登場→手札5までドロー / ライブ開始: 2回以上登場→合計スコア+1常時 |
| [x] | 006 | PL!N-bp3-006-P | 近江彼方 | toujou_self_wait_only | 登場: 強制ウェイト |
| [x] | 007 | PL!N-bp3-007-P | 優木せつ菜 | kidou_self_wait_hand_enter_energy | 起動: 自ら控え室→手札コスト13以下せつ菜登場→エネルギー1枚下 |
| [x] | 008 | PL!N-bp3-008-P | エマ・ヴェルデ | draw_from_deck / live_start_hand_discard_activate_wait_grant | 起動: 他虹ヶ咲1人ウェイト→1ドロー / ライブ開始 手札2枚捨て任意→他ウェイト1人アク→両者heart04 |
| [x] | 009 | PL!N-bp3-009-P | 天王寺璃奈 | live_start_waiting_deck_bottom_tiered | 控え室メンバー2枚→山札下→合計6/8/25で1ドロー/ALL/合計+1常時 |
| [x] | 010 | PL!N-bp3-010-P | 三船栞子 | live_start_pick_player_waiting_deck_bottom | ライブ開始: 自分か相手→その控え室メンバー2枚まで山札下 **ソロは相手代行** |
| [x] | 011 | PL!N-bp3-011-P | ミア・テイラー | toujou_opp_stage_member_match_grant | 相手ステージ1人選択→ハート同色ならブレード（コスト/元BL同も可）**ソロは相手代行** |
| [x] | 012 | PL!N-bp3-012-P | 鐘嵐珠 | deck_top_pick_recover | 手札1枚捨て任意→4枚見て虹ヶ咲1枚回収 |
| [x] | 013 | PL!N-bp3-013-N | 上原歩夢 | draw_from_deck | エネルギー1枚を下に置いてもよい→2ドロー |
| [x] | 014 | PL!N-bp3-014-N | 中須かすみ | live_start:heart_color_pick_grant | heart01/03/04から1色→元ハートがその色に変化 |
| [x] | 015 | PL!N-bp3-015-N | 桜坂しずく | live_start:heart_color_pick_grant | heart02/05/06から1色→元ハートがその色に変化 |
| [x] | 017 | PL!N-bp3-017-N | 宮下愛 | optional_self_wait_opp_stage | 登場/ライブ開始: 自ウェイト任意→相手コスト4以下1人ウェイト |
| [x] | 022 | PL!N-bp3-022-N | 三船栞子 | deck_top_look_reorder | 自ウェイト任意→2枚見て並べ替え |
| [x] | 023 | PL!N-bp3-023-N | ミア・テイラー | optional_self_wait_opp_stage | 017愛と同型 |
| [x] | 024 | PL!N-bp3-024-N | 鐘嵐珠 | draw_then_hand_discard | 2ドロー→手札2枚捨て |

## ライブ（025–031）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025 | PL!N-bp3-025-L | Awakening Promise | live_start_optional_energy_under_return_grant | メンバー下エネルギー任意枚EDK戻し→1枚につきheart02×3 |
| [x] | 026 | PL!N-bp3-026-L | サイコーハート | live_start_tiered_success_live_scores | 自成功置き場にスコア1 or 5→+1、両方→+2 |
| [x] | 027 | PL!N-bp3-027-L | La Bella Patria | live_success_surplus_heart_energy_wait | 成功時: 余剰heart04+かつ虹ヶ咲 on stage→EDK1枚ウェイト **2026-06-28再修正** |
| [x] | 028 | PL!N-bp3-028-L | ツナガルコネクト | live_start_per_series_member_deck_look_reveal_score | 虹ヶ咲1人につき1枚見て並べ替え→山札上公開→ライブならスコア+1 **2026-06-28修正** |
| [x] | 029 | PL!N-bp3-029-L | 未来ハーモニー | （能力なし） | |
| [x] | 030 | PL!N-bp3-030-L | Love U my friends | live_card_score_plus | 成功時: エール公開にALLブレード1枚+→スコア+1 **2026-06-28再修正** |
| [x] | 031 | PL!N-bp3-031-L | MONSTER GIRLS | live_card_score_plus_per_unit | 成功時: ウェイトメンバー1人につきスコア+1 |

## 検証結果（2026-06-28・ライブ 025–031）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp3-027-L | La Bella Patria | 余剰 heart04 条件を手動確認から機械判定へ（`countOwnLiveSurplusForHeartSlot`）。FAQ Q174 準拠 |
| PL!N-bp3-028-L | ツナガルコネクト | `deck_top_to_waiting` 誤分類 → `live_start_per_series_member_deck_look_reveal_score`（虹ヶ咲人数分の山札操作→上公開→ライブなら+1） |
| PL!N-bp3-030-L | Love U my friends | ALLブレード条件を「めくり」から「持つ」（b_all 印刷）へ修正 → `requiresYellRevealedAllBladeHeart` |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!N-bp3-025-L | Awakening Promise | ライブ開始: メンバー下エネルギー任意枚EDK戻し→1枚につき heart02×3 |
| PL!N-bp3-026-L | サイコーハート | ライブ開始: 自成功置き場にスコア1 or 5→+1、両方→+2 |
| PL!N-bp3-029-L | 未来ハーモニー | 能力なし |
| PL!N-bp3-031-L | MONSTER GIRLS | 成功時: ウェイトメンバー1人につきスコア+1 |
| PL!N-bp3-032-L | THE SECRET NiGHT | 能力なし（リスト外・同弾） |

## 2026-06-28 検証（メンバー・初回）

能力あり25種: **guided_manual=0**。

- **028-L ツナガルコネクト**: `deck_top_to_waiting` 誤分類を修正（上記ライブ表参照）。
- ライブ025–031: 分類・回帰テスト追加（`verify-niji-bp3.mjs`）。
