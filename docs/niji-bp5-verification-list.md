# 虹ヶ咲 bp5 / Anniversary2026（PL!N-bp5）効果検証リスト

`PL!N-bp5-*`（ブースターパック Anniversary2026 / 虹ヶ咲）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-niji-bp5.mjs`
- 全文監査: `node scripts/audit-niji-bp5-text.mjs`

## メンバー（001–024）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!N-bp5-001-P | jidou_yell_distinct_bh_tier_grant | エール公開BH3種+→heart01 / 6種+→スコア+1常時 |
| [x] | 002 | PL!N-bp5-002-P | jouji (live_score_plus) | 両者ステージで最多ハート→合計スコア+1 |
| [x] | 003 | PL!N-bp5-003-P | kidou_hand_discard_wait_live_score_pay | 任意手札1捨→控え室ライブ回収→スコア支払 |
| [x] | 004 | PL!N-bp5-004-P | optional_self_wait_opp_stage | 登場/LS: 任意自ウェイト→相手元々ブレードちょうど4をウェイト |
| [x] | 005 | PL!N-bp5-005-P | jidou_leave_baton_partner_bh_threshold_energy | バトン退場: 虹ヶ咲相手がコスト10+/15+BHなし→E2枚 / 後者で+1ドロー |
| [x] | 006 | PL!N-bp5-006-P | jouji + live_success_self_wait_if_others | 常時: 自アクティブ不可 / LS: 他メンバーいれば自ウェイト |
| [x] | 007 | PL!N-bp5-007-P | grant_jouji_session + draw_then_hand_discard | LS: 成功ライブ枚数同数→ブレード2 / LS成功2ドロー1捨 |
| [x] | 008–012 | PL!N-bp5-008-P 他 | kidou / deck_top_pick / surplus_heart / ability_pick_one 等 | 008起動E / 009山札見回収 / 010余剰0スコア+1 / 011 2択 / 012起動+LS |
| [x] | 012 | PL!N-bp5-012-P | grant_jouji_session / live_score_higher_energy_wait | 起動 E下→1ドロー+heart01 / LS成功 スコア優位→Eウェイト **2026-06-30: 起動コスト+ドロー** |
| [x] | 013 | PL!N-bp5-013-N | grant_jouji_session | LS: E下メンバー在席→heart01 **2026-06-30: 前提チェック** |
| [x] | 015 | PL!N-bp5-015-N | grant_jouji_session | ステージ合算で全6色ハート→ブレード2 **2026-06-30: collective heart 前提** |
| [x] | 017 / 018 / 020 / 024 | — | — | 能力なし |
| [x] | 019 | PL!N-bp5-019-N | toujou_wait_pick_hand | 任意手札1捨→控え室ライブ回収 |
| [x] | 021 | PL!N-bp5-021-N | ability_sequence | 山札2ミル→控え室ライブをデッキ上4枚目へ（任意） |
| [x] | 022 | PL!N-bp5-022-N | toujou_wait_pick_hand | 任意手札1捨→虹ヶ咲ライブ回収 |
| [x] | 023 | PL!N-bp5-023-N | draw_then_hand_discard | LS成功2ドロー1捨 |

## ライブ（025–030）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 025 | PL!N-bp5-025-L | SINGING, DREAMING, NOW! | — | 能力なし |
| [x] | 026 | PL!N-bp5-026-L | TOKIMEKI Runners | live_card_score_plus + live_success_recover_from_waiting | 全色ハート在席→スコア+1 / 自スコア3で虹ヶ咲回収 |
| [x] | 027 | PL!N-bp5-027-L | ミラクル STAY TUNE！ | live_card_score_plus | 成功ライブ2+かつ異名3人→スコア+1 |
| [x] | 028 | PL!N-bp5-028-L | CHASE! | live_start_need_heart_set_fixed | 必要ハートheart02×6固定＋スコア+2 |
| [x] | 029 | PL!N-bp5-029-L | 無敵級*ビリーバー | deck_top_to_waiting | 中須かすみ在席→山札上4枚ミル |
| [x] | 030 | PL!N-bp5-030-L | 繚乱！ビクトリーロード | jidou_member_live_start_grant_all_heart + jidou_member_live_success_draw | メンバーLS/LS成功時の自動付与・ドロー |

## 2026-06-30 初回修正

| ID | 内容 |
|----|------|
| PL!N-bp5-005-P | `jidou_leave_baton_partner_bh_threshold_energy` 新設（バトン相手BHコスト閾値でE活性+条件ドロー） |

## 2026-06-30 再監修（2回目）

| ID | 内容 |
|----|------|
| PL!N-bp5-012-P | kidou: E下コスト+1ドロー+heart01常時が未実装 → `energyUnderCount`+`deckDrawCount` on `grant_jouji_session` |
| PL!N-bp5-013-N | live_start: ステージにE下メンバー前提が未チェック → `requiresAnyStageMemberWithEnergyUnder` |
| PL!N-bp5-001-P | `jidou_yell_distinct_bh_tier_grant`（エール公開BH種類数ティア） |
| PL!N-bp5-004-P | `oppWaitExactPrintedBlade`（ちょうど4ブレード） |
| PL!N-bp5-015-N / 026-L | `requiresStageCollectiveHeartSlots` — ステージ合算で全6色ハート前提（FAQ Q216） |
| PL!N-bp5-027-L | `minDistinctStageMemberNames`（異名3人） |
| （横展開） | `audit-common-patterns.mjs` 手札回収ミルルールの誤検知修正（021 デッキ上配置は除外） |

### 問題なし（再確認）

002–011、014–016、019–024、017/018/020/025 能力なし。ライブ 026–030 は初回修正済みの再確認のみ。
