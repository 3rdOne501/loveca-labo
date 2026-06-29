# Liella! 4弾 / SAPPHIREMOON（bp4）効果検証リスト

`PL!SP-bp4-*`（ブースターパック **SAPPHIREMOON**）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-bp4.mjs`
- 全文監査: `node scripts/audit-liella-bp4-text.mjs`
- 横展開ルール: `.cursor/rules/card-fix-similarity-batch.mdc`

## メンバー（001–022）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!SP-bp4-001-P | 澁谷かのん | energy_deck_to_wait | 登場: ステージLiella!のみ＋E7→ED1枚ウェイト **2026-06-28修正**（`requiresStageOnlySeries`） |
| [x] | 002 | PL!SP-bp4-002-P | 唐可可 | toujou_deck_top_liella_live_pick | 登場: 必要ハート合計8+→山札上Liella!ライブ1枚 |
| [x] | 003 | PL!SP-bp4-003-P | 嵐千砂都 | draw_then_hand_discard / jouji | 左/右サイド別登場＋常時ブレード×2 |
| [x] | 004 | PL!SP-bp4-004-P | 平安名すみれ | toujou_liella_double_baton_center | バトン2 Liella!→センター登場 |
| [x] | 005 | PL!SP-bp4-005-P | 葉月恋 | energy_deck_to_wait / jouji | バトンLiella!条件＋常時ブレード×3（E10+） |
| [x] | 006 | PL!SP-bp4-006-P | 桜小路きな子 | yell_resolution_pick_hand | LS: エール異名Liella!3+→手札 |
| [x] | 007 | PL!SP-bp4-007-P | 米女メイ | jidou_area_move_wait_pick_hand | 自動: 移動→控え室からスコア3以下ライブ |
| [x] | 008 | PL!SP-bp4-008-P | 若菜四季 | ability_sequence / live_start_position_change | 登場: 左2ドロー1捨て＋右E2枚アク **2026-06-28修正** |
| [x] | 009 | PL!SP-bp4-009-P | 鬼塚夏美 | jouji blade_if_lower_stage_cost_sum | 常時: ステージ合計コストが低い側ブレード×3 |
| [x] | 010 | PL!SP-bp4-010-P | ウィーン | kidou energy_deck_to_wait | 起動: E+自ウェイト→ED1枚ウェイト |
| [x] | 011 | PL!SP-bp4-011-P | 鬼塚冬毬 | jidou_area_move_opp_wait | 自動: 登場/移動→相手元BH3以下ウェイト **2026-06-28修正** |
| [x] | 012 | PL!SP-bp4-012-N | 澁谷かのん | grant_jouji_session | LS: 任意E→heart02 |
| [x] | 013 | PL!SP-bp4-013-N | 唐可可 | live_start_position_change | 登場: 任意ポジションチェンジ |
| [x] | 014 | PL!SP-bp4-014-N | 嵐千砂都 | （能力なし） | |
| [x] | 015 | PL!SP-bp4-015-N | 平安名すみれ | kidou_stage_wait_pick_hand | 起動: 自ウェイト→控え室メンバー |
| [x] | 016 | PL!SP-bp4-016-N | 葉月恋 | jidou_energy_placed_grant | 自動: E配置→heart06 |
| [x] | 017 | PL!SP-bp4-017-N | 桜小路きな子 | grant_jouji_session | LS: 自移動＋左→ブレード×2 **2026-06-28修正** |
| [x] | 018 | PL!SP-bp4-018-N | 米女メイ | kidou_stage_wait_pick_hand | 起動: 自ウェイト→Liella!カード |
| [x] | 019 | PL!SP-bp4-019-N | 若菜四季 | kidou_stage_wait_pick_hand | 起動: 自ウェイト→メンバー |
| [x] | 020 | PL!SP-bp4-020-N | 鬼塚夏美 | grant_jouji_session | LS: 自移動＋右→ブレード×2 **2026-06-28修正** |
| [x] | 021 | PL!SP-bp4-021-N | ウィーン | jouji passive_track | 常時: 自E>相手→heart06 |
| [x] | 022 | PL!SP-bp4-022-N | 鬼塚冬毬 | optional_energy_blade_until_live_end | LS: E0–2枚任意→枚数分ブレード **2026-06-28修正** |

## ライブ（023–030）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 023 | PL!SP-bp4-023-L | Dazzling Game | ability_sequence | LS: 指名3人から1人+別Liella!1人にBH付与 / LS: エール公開BH→紫BH（FAQ187: 別メンバー選択必須） |
| [x] | 024 | PL!SP-bp4-024-L | ノンフィクション!! | ability_sequence | LS: センターLiella!コスト>相手センター→スコア+1 / LS: 左サイドLiella! heart02×3+→BH×2 |
| [x] | 025 | PL!SP-bp4-025-L | Special Color | live_start_center_series_blade_set / live_card_score_plus | LS: センターLiella!の元BH数を3に / 成功: センターLiella!がこのターン移動→スコア+1（FAQ195: 他効果のBH加算は後） |
| [x] | 026 | PL!SP-bp4-026-L | Wish Song | ability_sequence | 成功: エール異名Liella!5枚+→スコア+1 **と** E11枚+→2ドロー1捨て（独立） **2026-06-28修正** |
| [x] | 027 | PL!SP-bp4-027-L | Chance Day, Chance Way! | live_success_formation_change | 成功: ステージLiella!のみなら任意フォーメーションチェンジ |
| [x] | 028 | PL!SP-bp4-028-L | DAISUKI FULL POWER | live_card_score_plus | LS: アクティブEが1枚以上→スコア+1 **2026-06-28修正** |
| [x] | 029 | PL!SP-bp4-029-L | 追いかける夢の先で | （能力なし） | |
| [x] | 030 | PL!SP-bp4-030-L | Second Sparkle | （能力なし） | |

## 2026-06-28 メンバー検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-bp4-001-P | 澁谷かのん | `のみで` → `requiresStageOnlySeries`（Liella!在籍のみ＋E7） |
| PL!SP-bp4-008-P | 若菜四季 | 登場2段（左2ドロー1捨て / 右E2枚アク）を `ability_sequence` に |
| PL!SP-bp4-011-P | 鬼塚冬毬 | 自動: 元BH≤3フィルタ・登場/移動イベント（`enter_or_baton`） |
| PL!SP-bp4-017-N | 桜小路きな子 | `requiresSelfMovedThisTurn`＋左サイド→ブレード×2 |
| PL!SP-bp4-020-N | 鬼塚夏美 | 017と同様（右サイド） |
| PL!SP-bp4-022-N | 鬼塚冬毬 | E0–2枚可変支払×枚数分ブレード（`costEnergyVariable`） |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-bp4-002-P | 唐可可 | 必要ハート合計8+→山札上Liella!ライブ1枚 |
| PL!SP-bp4-003-P | 嵐千砂都 | 左/右登場2ドロー2捨て＋常時センターブレード×2 |
| PL!SP-bp4-004-P | 平安名すみれ | バトン2 Liella!→センター登場 |
| PL!SP-bp4-005-P | 葉月恋 | バトンLiella!＋E7→ED2枚ウェイト＋常時E10+ブレード×3 |
| PL!SP-bp4-006-P | 桜小路きな子 | LS: エール異名Liella!3+→手札 |
| PL!SP-bp4-007-P | 米女メイ | 自動: 移動→控え室スコア3以下Liella!ライブ |
| PL!SP-bp4-009-P | 鬼塚夏美 | 常時: ステージ合計コスト低い側ブレード×3 |
| PL!SP-bp4-010-P | ウィーン | 起動: 自ウェイト→ED1枚ウェイト |
| PL!SP-bp4-012-N | 澁谷かのん | LS: 任意E→heart02 |
| PL!SP-bp4-013-N | 唐可可 | 登場: 任意ポジションチェンジ |
| PL!SP-bp4-014-N | 嵐千砂都 | 能力なし |
| PL!SP-bp4-015-N | 平安名すみれ | 起動: 自ウェイト→控え室メンバー |
| PL!SP-bp4-016-N | 葉月恋 | 自動: E配置→heart06 |
| PL!SP-bp4-018-N | 米女メイ | 起動: 自ウェイト→Liella!カード |
| PL!SP-bp4-019-N | 若菜四季 | 起動: 自ウェイト→メンバー |
| PL!SP-bp4-021-N | ウィーン | 常時: 自E>相手→heart06 |

## 2026-06-28 ライブ検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-bp4-026-L | Wish Song | 2つのライブ成功時が1テンプレに混ざり条件が同時必須に → `ability_sequence`（エール異名5+スコア+1 / E11+2ドロー1捨て） |
| PL!SP-bp4-028-L | DAISUKI FULL POWER | アクティブE条件なしで常時スコア+1 → `requiresAnyActiveEnergy` |

### 問題なし

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-bp4-023-L | Dazzling Game | LS: 指名1人+別Liella!1人BH / エールBH→紫BH |
| PL!SP-bp4-024-L | ノンフィクション!! | LS: センターコスト比較スコア+1 / 左サイド heart02×3+→BH×2 |
| PL!SP-bp4-025-L | Special Color | LS: センターLiella!元BH→3 / 成功: センター移動→スコア+1 |
| PL!SP-bp4-027-L | Chance Day, Chance Way! | 成功: ステージLiella!のみ→任意フォーメーションチェンジ |
| PL!SP-bp4-029-L | 追いかける夢の先で | 能力なし |
| PL!SP-bp4-030-L | Second Sparkle | 能力なし |
