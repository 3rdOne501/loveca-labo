# 蓮ノ空 1弾（bp1）効果検証リスト

`PL!HS-bp1-*`（Link！Like！ラブライブ！ / 蓮ノ空女学院スクールアイドルクラブ）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-hasunosora-bp1.mjs`
- 全文監査: `node scripts/audit-hasunosora-bp1-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–014）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!HS-bp1-001-R | 日野下花帆 | activate_energy | 登場: E2枚アクティブ |
| [x] | 002 | PL!HS-bp1-002-R | 村野さやか | kidou_self_to_wait_recover | EE2・自ら控え室→控え室から蓮ノ空コスト15以下を同エリア登場 |
| [x] | 003 | PL!HS-bp1-003-R＋ | 乙宗梢 | kidou_wait_pick_hand | 常時付与 + 起動E・控え室から4コスト以下蓮ノ空メンバー1枚手札 |
| [x] | 004 | PL!HS-bp1-004-P | 夕霧綴理 | kidou_wait_pick_hand / live_start_optional_energy_blade_per_live_frame | 起動EEE・控え室から蓮ノ空ライブ1枚 / ライブ開始E任意・ライブ中1枚につきブレード |
| [x] | 005 | PL!HS-bp1-005-R | 大沢瑠璃乃 | toujou_optional_hand_discard_draw | 手札3枚まで捨て任意→枚数分ドロー |
| [x] | 006 | PL!HS-bp1-006-P | 藤島慈 | draw_then_hand_discard / heart_color_pick_grant | 登場1ドロー+手札1枚捨て / ライブ開始・他メンバー2枚以上でハート色付与 |
| [x] | 007 | PL!HS-bp1-007-R | 百生吟子 | draw_from_deck | 起動EEEE・1ドロー |
| [x] | 008 | PL!HS-bp1-008-R | 徒町小鈴 | toujou_deck_top_wait_if_all_members | 山札上3枚控え→すべてメンバーなら1ドロー |
| [x] | 009 | PL!HS-bp1-009-R | 安養寺姫芽 | deck_top_pick_recover | みらくらぱーく！1枚回収 |
| [x] | 010 | PL!HS-bp1-010-N | 日野下花帆 | draw_then_hand_discard | 登場1ドロー+手札1枚捨て |
| [x] | 011 | PL!HS-bp1-011-N | 村野さやか | deck_top_pick_recover | 5枚見て1枚 |
| [x] | 014 | PL!HS-bp1-014-N | 大沢瑠璃乃 | draw_then_hand_discard | 登場1ドロー+手札1枚捨て |

## ライブ（019–023）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!HS-bp1-019-L | Dream Believers | （能力なし） | special_heart スコア説明のみ |
| [x] | 020 | PL!HS-bp1-020-L | 365 Days | （能力なし） | ALLブレード説明のみ |
| [x] | 021 | PL!HS-bp1-021-L | Holiday∞Holiday | yell_resolution_pick_hand | ライブ成功時: エール公開から蓮ノ空ライブ1枚回収 |
| [x] | 022 | PL!HS-bp1-022-L | AWOKE | live_card_score_plus | ライブ成功時: エール公開蓮ノ空メンバー10枚+→+1 |
| [x] | 023 | PL!HS-bp1-023-L | ド！ド！ド！ | live_score_higher_energy_wait | ライブ成功時: 合計スコア＞相手＋蓮ノ空 on stage→Eウェイト |

## 2026-06-30 再監修（2回目・メンバー 001–014）

| ID | 内容 |
|----|------|
| （全体） | メンバー分類 OK。verify 18ケース（003 jouji / 004 kidou / 006 登場 追加） |

## 2026-06-30 再監修（2回目・ライブ 019–023）

| ID | 内容 |
|----|------|
| （全体） | 分類・ハンドラ OK。実行時バグなし。verify 20ケース（019/020 能力なし追加） |
| PL!HS-bp1-021-L | エール公開から蓮ノ空ライブ1枚手札（スコア比較なし） |
| PL!HS-bp1-022-L | エール公開蓮ノ空メンバー10枚+→スコア+1（括弧ドロー除外済） |
| PL!HS-bp1-023-L | 合計スコア＞相手 + 蓮ノ空 on stage→Eウェイト（2026-06-28 ソロ修正済を再確認） |

## 検証結果（2026-06-28・メンバー 001–014）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-bp1-003-R＋ | 乙宗梢 | 起動の「4コスト以下」を `parseAbilityPickFilters` で認識（`Nコスト以下` 表記） |
| PL!HS-bp1-004-P | 夕霧綴理 | ライブ開始時: ライブ枠枚数×ブレード（`live_start_optional_energy_blade_per_live_frame`） |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-bp1-001-R | 日野下花帆 | 登場: E2枚アクティブ |
| PL!HS-bp1-002-R | 村野さやか | 起動: 自ら控え室→蓮ノ空コスト15以下を同エリア登場 |
| PL!HS-bp1-005-R | 大沢瑠璃乃 | 登場: 手札3枚まで捨て任意→枚数分ドロー |
| PL!HS-bp1-006-P | 藤島慈 | 登場1ドロー+手札1枚捨て / ライブ開始ハート色付与（他メンバー2枚以上） |
| PL!HS-bp1-007-R | 百生吟子 | 起動EEEE・1ドロー |
| PL!HS-bp1-008-R | 徒町小鈴 | 山札上3枚控え→すべてメンバーなら1ドロー |
| PL!HS-bp1-009-R | 安養寺姫芽 | 登場: みらくらぱーく！1枚回収 |
| PL!HS-bp1-010-N | 日野下花帆 | 登場1ドロー+手札1枚捨て |
| PL!HS-bp1-011-N | 村野さやか | 5枚見て1枚回収 |
| PL!HS-bp1-014-N | 大沢瑠璃乃 | 登場1ドロー+手札1枚捨て |

## 検証結果（2026-06-28・ライブ 019–023）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-bp1-023-L | ド！ド！ド！ | ソロ時、相手スコア未入力の段階で合計スコア比較を先行判定しないよう変更（`ensureSoloOpponentLiveFrameScore` 経由に委譲。Liella 023-L / 虹 026-L と同型） |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!HS-bp1-019-L | Dream Believers | 能力なし |
| PL!HS-bp1-020-L | 365 Days | 能力なし（ALLブレード説明のみ） |
| PL!HS-bp1-021-L | Holiday∞Holiday | エール公開から蓮ノ空ライブ1枚手札 |
| PL!HS-bp1-022-L | AWOKE | エール公開蓮ノ空メンバー10枚+でスコア+1（括弧ドロー説明は分類除外済） |

## 横展開修正（2026-06-28・以前）

- **AWOKE bp1-022**: 括弧内ドロー説明で `isCompoundLiveScoreEffectText` が true → `stripLiveDrawYellReminderParenthetical` + `minYellRevealedSeriesMemberCount`
