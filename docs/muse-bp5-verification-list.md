# μ's bp5 / Anniversary2026（PL!-bp5）効果検証リスト

`PL!-bp5-*`（ブースターパック Anniversary2026 / μ's）メンバー・ライブをカード番号順に検証する。

- 自動回帰: `node scripts/verify-muse-bp5.mjs`
- 全文監査: `node scripts/audit-muse-bp5-text.mjs`

## メンバー（001–018 / 111 / 222 / 333）

| 状態 | 番号 | ID（代表） | 主テンプレート | 備考 |
|------|------|------------|----------------|------|
| [x] | 001 | PL!-bp5-001-P | deck_top_count_live_score_plus | LS: 任意手札1捨→山札見る枚数=合計スコア+2→1枚回収 |
| [x] | 002 | PL!-bp5-002-P | deck_top_pick_recover | 自ウェイト+任意手札1捨→山札5見→µ's C9+メンバー回収 |
| [x] | 003 | PL!-bp5-003-P | jouji + kidou_hand_discard_series_branch | 異名3人以上→heart03 / 起動E2手札1捨→µ's分岐 |
| [x] | 004 | PL!-bp5-004-P | kidou_opp_wait_group_discount_energy + jidou_yell_grant_jouji_nobh_members | 相手C10↓ウェイト（E4・グループ割引）/ エール無BH3枚+→icon_all heart **2026-06-30: E5誤認識修正** |
| [x] | 005 | PL!-bp5-005-P | energy_deck_to_active | 成功ライブ合計スコア6+→エネルギー1枚アクティブ |
| [x] | 006 | PL!-bp5-006-P | draw_from_deck | ライブ枠2枚以上→1ドロー |
| [x] | 007 | PL!-bp5-007-P | toujou_baton_both_trim_hand_draw | 低コストバトン登場→両者手札3枚調整→各3ドロー |
| [x] | 008 | PL!-bp5-008-P | jouji (blade_conditional) | 成功ライブ合計スコア6+→heart03×2 |
| [x] | 009 | PL!-bp5-009-P | kidou_hand_cost_wait_pick_hand | 手札2捨→控え室からheart06×3以上ライブ回収 |
| [x] | 010 | PL!-bp5-010-N | ability_sequence | LS: 任意手札1捨→山札3控え室→A-RISEメンバー回収 |
| [x] | 011 | PL!-bp5-011-N | heart_color_pick_grant | heart04/05/06選択→成功ライブ1枚につき付与 |
| [x] | 012–018 | PL!-bp5-012-N 他 | — / jouji | 012/016/017/018 能力なし |
| [x] | 013 | PL!-bp5-013-N | optional_self_wait_opp_stage | 相手C4以下ウェイト（必須） |
| [x] | 014 | PL!-bp5-014-N | deck_top_pick_recover | 任意手札1捨→山札4見→heart05/06メンバー回収 |
| [x] | 015 | PL!-bp5-015-N | draw_from_deck | 成功ライブ合計スコア3+→1ドロー |
| [x] | 111 | PL!-bp5-111-P＋ | jouji + kidou_hand_discard_activate_wait_opp_bonus | A-RISE他1人につきheart05 / 手札1捨→ウェイト復帰+相手時ボーナス |
| [x] | 222 | PL!-bp5-222-P＋ | deck_top_pick_recover | 自ウェイト必須+任意手札1捨→山札3見→1枚手札回収 |
| [x] | 333 | PL!-bp5-333-P＋ | optional_self_wait_opp_stage + jouji | 任意自ウェイト→相手C9↓ウェイト / 自ウェイト時heart05 |

## ライブ（019–024）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!-bp5-019-L | それは僕たちの奇跡 | — | 能力なし |
| [x] | 020 | PL!-bp5-020-L | Wonder zone | live_start_need_heart_reduce_per_unit | センターµ'sのheart03÷2→heart0減（最大3） |
| [x] | 021 | PL!-bp5-021-L | SUNNY DAY SONG | live_start_sunny_day_song_tiered | 段階: 両者1ドロー+捨て / µ'sハート / 3人別名でスコア+1 |
| [x] | 022 | PL!-bp5-022-L | A song for You! You? You!! | live_start_score_plus_per_success_live | 成功ライブ1枚につきスコア+2＋必要ハート増 |
| [x] | 023 | PL!-bp5-023-L | 乙姫心で恋宮殿 | live_start_need_heart_reduce_per_unit | heart01/06以外の色を持つメンバー1人につきheart0-1 |
| [x] | 024 | PL!-bp5-024-L | Private Wars | ability_pick_one | A-RISE在席: ウェイト復帰+ブレード1 or 相手元々ブレード3↓ウェイト |

## 2026-06-30 再監修（2回目）

| ID | 内容 |
|----|------|
| PL!-bp5-004-P | kidou: 起動コスト E4 が割引説明の E アイコン込みで E5 になっていた → `countWikiEnergyIconsInCostPart` |
| PL!-bp5-111-P＋ | jouji: A-RISE 他メンバー数×heart05（`evaluateJoujiRule`） |
| PL!-bp5-002-P / 222-P＋ | `costHandDiscardOptional`: 必須ウェイト＋任意手札1枚 |

## 2026-06-30 メンバー3回監修

| ID | 内容 |
|----|------|
| PL!-bp5-002-P / 222-P＋ | `costHandDiscardOptional` 時に効果本文の「〜してもよい」で `optional:true` になり「支払わない」で必須ウェイトごとスキップ可能 → `optional:false` 明示 |

### 問題なし（3回目再確認）

001/003–015、111 jouji/kidou、333 toujyou/jouji。004 jidou icon_all、003 jouji 異名3人、006 live_start ドロー、013 相手C4ウェイト、014 heart05/06 回収、005/007/009/010/011 各分類・ハンドラ OK。

## 2026-06-30 初回修正

| ID | 内容 |
|----|------|
| PL!-bp5-010-N | `ability_sequence`: 任意コストが `deck_top_to_waiting` ステップに継承（`abilityComposition` 横展開） |
| PL!-bp5-333-P＋ | `blade_if_self_wait`: heart05 の `heartFlat` 分類漏れ |
| PL!-bp5-024-L | `parseAbilityBulletChoices` 選択肢ブレードラベル保持 / `executeAbilityChoiceText` ウェイト復帰→対象へブレード |
| （横展開） | `toujou_wait_pick_hand`: live_start/LS 前提チェック、`parseAbilityBulletChoices` wikiラベル保持 |
