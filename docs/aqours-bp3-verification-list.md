# Aqours 3弾 / 夏、はじまる。（bp3）効果検証リスト

`PL!S-bp3-*`（ブースターパック **夏、はじまる。** / Aqours）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-bp3.mjs`
- 全文監査: `node scripts/audit-aqours-bp3-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–018）

| 状態 | 番号 | 代表ID | 名前 | 主テンプレート | 備考 |
|------|------|--------|------|----------------|------|
| [x] | 001 | PL!S-bp3-001-P | 高海千歌 | kidou_wait_member_grant_jouji | 起動/センター/ターン1回: 1人ウェイト→そのメンバーに合計+1常時 **センターのみ** |
| [x] | 002 | PL!S-bp3-002-P | 桜内梨子 | yell_resolution_pick_self_score | ライブ成功: 合計スコア>相手→**このカード**（エール公開中のみ）を手札 |
| [x] | 003 | PL!S-bp3-003-P | 松浦果南 | draw_from_deck / live_start_hand_discard_optional_blade_per | 登場 手札ライブ捨て任意→3ドロー / ライブ開始 手札2枚まで捨て→1枚につきブレード2 |
| [x] | 004 | PL!S-bp3-004-P | 黒澤ダイヤ | deck_top_pick_recover | 手札1枚捨て任意→4枚見てメンバー1枚回収 |
| [x] | 005 | PL!S-bp3-005-P | 渡辺曜 | draw_from_deck | ライブ成功: 自エール公開枚数<相手→1ドロー |
| [x] | 006 | PL!S-bp3-006-P | 津島善子 | kidou_self_wait_stage_member_swap_recover | 起動/センター/ターン1回 自ウェイト+手札1枚→他Aqours退場→控え室からコスト+2で同エリア登場 |
| [x] | 007 | PL!S-bp3-007-P | 国木田花丸 | draw_from_deck | 起動/ターン1回 E: 自分か相手→その控え室ライブ1枚山札下→1ドロー **ソロは相手代行** |
| [x] | 008 | PL!S-bp3-008-P | 小原鞠莉 | kidou_stage_wait_pick_hand | 起動: 自ら控え室→ライブ回収、Aqoursスコア6+ならエネルギー4枚アクティブ |
| [x] | 009 | PL!S-bp3-009-P | 黒澤ルビィ | deck_top_pick_recover | 手札1枚捨て任意→6枚見てAqoursメンバー1枚回収 |
| [x] | 010 | PL!S-bp3-010-N | 高海千歌 | activate_stage_members_up_to | メンバー1人までアクティブ |
| [x] | 011 | PL!S-bp3-011-N | 桜内梨子 | activate_stage_members_up_to | 同上 |
| [x] | 012 | PL!S-bp3-012-N | 松浦果南 | optional_self_wait_opp_stage | 登場/ライブ開始: 自ウェイト任意→相手コスト4以下1人ウェイト |
| [x] | 016 | PL!S-bp3-016-N | 国木田花丸 | jouji passive | 常時: 自成功ライブ1枚につきこのメンバーのコスト+1 |
| [x] | 017 | PL!S-bp3-017-N | 小原鞠莉 | optional_self_wait_opp_stage | 012果南と同型 |

## ライブ（019–025）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 019 | PL!S-bp3-019-L | MIRACLE WAVE | live_card_score_set_fixed | 成功時: エール公開全BH or 余剰ハート2+→**スコア=4** |
| [x] | 020 | PL!S-bp3-020-L | ダイスキだったらダイジョウブ！ | jidou_yell_retry_low_bh | 自動/ターン1回: エール公開BH2枚以下→全捨て→BH失って再エール |
| [x] | 021 | PL!S-bp3-021-L | 想いよひとつになれ | grant_jouji_session | ライブ開始: 控え室メンバー1枚山札上任意→メンバー1人にブレード **2026-06-28修正** |
| [x] | 022 | PL!S-bp3-022-L | Fantastic Departure! | （能力なし） | |
| [x] | 023 | PL!S-bp3-023-L | KOKORO Magic "A to Z" | （能力なし） | |
| [x] | 024 | PL!S-bp3-024-L | Deep Resonance | ability_pick_one | ライブ開始: センターAqoursコスト9+→**ブレード2付与 or 相手コスト4以下ウェイト** |
| [x] | 025 | PL!S-bp3-025-L | SUKI for you, DREAM for you! | live_card_score_plus | ライブ開始: Aqours1人選択→BL6+ならスコア+1 **2026-06-28修正** |

## 検証結果（2026-06-28・ライブ 019–025）

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!S-bp3-019-L | MIRACLE WAVE | エール公開全BH / 余剰ハート2+ の OR 条件を機械判定（`minSurplusHeartsOrYellAllBh` + `yellRevealedAllHaveBladeHeart`） |
| PL!S-bp3-021-L | 想いよひとつになれ | 控え室→山札上の任意コスト未実装 → `optionalWaitingMemberToDeckTop` で確認→配置後にブレード付与 |
| PL!S-bp3-025-L | SUKI for you, DREAM for you! | Aqours1人選択＋BL6+条件なしで常に+1 → `grantPickStageMembersMax` + `minPickedMemberBlade` |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!S-bp3-020-L | ダイスキだったらダイジョウブ！ | 自動: エール公開BH2枚以下→再エール |
| PL!S-bp3-022-L | Fantastic Departure! | 能力なし |
| PL!S-bp3-023-L | KOKORO Magic "A to Z" | 能力なし |
| PL!S-bp3-024-L | Deep Resonance | センターAqours9+→2択（BL2 / 相手ウェイト） |

## 2026-06-28 検証（メンバー）

能力あり16枚（メンバー）: **guided_manual=0**。
