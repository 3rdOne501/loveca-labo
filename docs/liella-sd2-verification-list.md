# Liella! スタートデッキ cheer sd2（PL!SP-sd2）効果検証リスト

`PL!SP-sd2-*`（スタートデッキ ラブライブ！スーパースター!! **cheer**）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-liella-sd2.mjs`
- 全文監査: `node scripts/audit-liella-sd2-text.mjs`
- エネルギー 000-P/SECS、能力なしメンバー 015/018/019/021、能力なしライブ 024 は対象外

## メンバー（001–022）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!SP-sd2-001-SD2 | 澁谷かのん | live_start_draw_then_formation_change | LS: 1ドロー→任意フォーメーションチェンジ |
| [x] | 002 | PL!SP-sd2-002-SD2 | 唐 可可 | live_start_position_change / jidou_area_move_grant_jouji | 起動 E2 ポジチェン / 自動 移動→heart06 |
| [x] | 003 | PL!SP-sd2-003-SD2 | 嵐 千砂都 | draw_then_conditional_extra_draw | LS成功: 1ドロー＋当ターン移動時追加1ドロー |
| [x] | 004 | PL!SP-sd2-004-SD2 | 平安名すみれ | passive_track | 常時 センター ブレード4 |
| [x] | 005 | PL!SP-sd2-005-SD2 | 葉月 恋 | live_start_position_change | 登場: 任意ポジチェン（入替え） |
| [x] | 006 | PL!SP-sd2-006-SD2 | 桜小路きな子 | kidou_hand_cost_wait_pick_hand | 起動 E2+手札1捨→控え室 Liella! ライブ |
| [x] | 007 | PL!SP-sd2-007-SD2 | 米女メイ | live_start_position_change | 005と同型 |
| [x] | 008 | PL!SP-sd2-008-SD2 | 若菜四季 | passive_track | 常時: 自ステージ C13+→heart03 **2026-06-28修正** |
| [x] | 009 | PL!SP-sd2-009-SD2 | 鬼塚夏美 | draw_from_deck | 登場: 1ドロー |
| [x] | 010 | PL!SP-sd2-010-SD2 | ウィーン・マルガレーテ | kidou_stage_wait_pick_hand | 起動: 自ステージ→控え室、ライブ回収 |
| [x] | 011–013 | PL!SP-sd2-011–013-SD2 | 冬毬/すみれ/唐可可 | jidou_area_move_grant_jouji | 自動 移動→各ハート付与 |
| [x] | 014 | PL!SP-sd2-014-SD2 | 嵐 千砂都 | kidou_stage_wait_pick_hand | 起動: 自ステージ→控え室、メンバー回収 |
| [x] | 015 | PL!SP-sd2-015-SD2 | 平安名すみれ | （能力なし） | |
| [x] | 016 | PL!SP-sd2-016-SD2 | 葉月 恋 | live_start_position_change | 005と同型 |
| [x] | 017 | PL!SP-sd2-017-SD2 | 桜小路きな子 | draw_then_hand_discard | LS成功: 1ドロー＋手札1捨 |
| [x] | 018–019 | PL!SP-sd2-018/019-SD2 | メイ/四季 | （能力なし） | |
| [x] | 020 | PL!SP-sd2-020-SD2 | 鬼塚夏美 | grant_jouji_session | LS: E7+→自＋他Liella!1人ブレード **2026-06-28修正** |
| [x] | 021 | PL!SP-sd2-021-SD2 | ウィーン・マルガレーテ | （能力なし） | |
| [x] | 022 | PL!SP-sd2-022-SD2 | 鬼塚冬毬 | jidou_area_move_grant_jouji | 011と同型 |

## ライブ（023–025）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 023 | PL!SP-sd2-023-SD2 | 始まりは君の空 | live_start_need_heart_set_fixed | LS: 成功ライブ2+→スコア+5・必要ハート変更 |
| [x] | 024 | PL!SP-sd2-024-SD2 | アイコトバ！ | （能力なし） | ALLブレードハートはリマインダー |
| [x] | 025 | PL!SP-sd2-025-SD2 | Aspire | live_start_moved_members_blade_grant | LS: 当ターン移動した Liella! 全員ブレード |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!SP-sd2-008-SD2 | 若菜四季 | 常時「自ステージ C13+→heart03」の条件未解析 → `minCost13OnAnyStage` に「自分のステージにコスト13以上」を追加 |
| PL!SP-sd2-020-SD2 | 鬼塚夏美 | LS ブレード付与が他 Liella! を先頭1体に自動固定 → 複数時は対象を選択（自体は常に付与） |

### 問題なし

001–007, 009–017, 022–025 および能力なし 015, 018–019, 021, 024
