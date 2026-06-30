# μ's PR カード（PL!-PR）効果検証リスト

`PL!-PR-*`（PRカード / μ's）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-muse-pr.mjs`
- 全文監査: `node scripts/audit-muse-pr-text.mjs`
- エネルギー PR（010+/013+/016+/019+）・能力なしは対象外

## メンバー

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!-PR-001-PR | 高坂穂乃果 | jidou_leave_stage_activate_one | 自動: 退場→任意でウェイト1人を選択してアクティブ **2026-06-28修正** |
| [x] | 002 | PL!-PR-002-PR | 絢瀬絵里 | jidou_leave_stage_activate_one | 001と同型 **2026-06-28修正** |
| [x] | 003 | PL!-PR-003-PR | 南ことり | kidou_hand_cost_wait_pick_hand | 起動: 手札2捨→控え室ライブ（heart03×3+） **2026-06-28修正** |
| [x] | 004 | PL!-PR-004-PR | 園田海未 | kidou_hand_cost_wait_pick_hand | 起動: 手札2捨→控え室ライブ（heart01×3+） **2026-06-28修正** |
| [x] | 005 | PL!-PR-005-PR | 星空 凛 | ability_pick_one | 1ドロー1捨 or 相手C2以下**全員**ウェイト **2026-06-28修正** |
| [x] | 006 | PL!-PR-006-PR | 西木野真姫 | ability_pick_one | 005と同型 **2026-06-28修正** |
| [x] | 007 | PL!-PR-007-PR | 東條 希 | optional_self_wait_opp_stage | 登場/LS: 任意自ウェイト→相手C4以下1人ウェイト |
| [x] | 008 | PL!-PR-008-PR | 小泉花陽 | ability_pick_one | 005と同型 **2026-06-28修正** |
| [x] | 009 | PL!-PR-009-PR | 矢澤にこ | optional_self_wait_opp_stage | 007と同型 |
| [x] | 012 | PL!-PR-012-PR | 小泉花陽 | draw_from_deck | 起動: 自ウェイト+手札1捨→1ドロー |
| [x] | 014 | PL!-PR-014-PR | 園田海未 | toujou_opp_hand_reveal_no_live_draw | 登場: 相手手札3枚非公開選択→公開、ライブなしで1ドロー |
| [x] | 015 | PL!-PR-015-PR | 西木野真姫 | toujou_hand_stage_enter | 登場: 低コストバトン登場時のみ手札C4以下登場 **2026-06-28修正** |
| [x] | 017 | PL!-PR-017-PR | 矢澤にこ | kidou_stage_wait_pick_hand | 起動: 自退場→控え室μ'sライブ、成功ライブ合計9+でE2アクティブ |
| [x] | 018 | PL!-PR-018-PR | 東條 希 | toujou_wait_pick_hand | 登場: 控え室スコア6+ライブ回収 |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!-PR-001/002-PR | 穂乃果/絵里 | 自動: 退場時に先頭ウェイトを強制アクティブ → **任意で1人選択** |
| PL!-PR-005/006/008-PR | 凛/真姫/花陽 | 登場選択肢「相手C2以下**すべて**ウェイト」が1人選択のみ → **該当全員をウェイト** |
| PL!-PR-003-PR | 南ことり | 控え室回収の「必要ハート heart03×3以上」フィルタ未設定 → `enrichPickFiltersFromSegRaw` でアイコン解析 |
| PL!-PR-004-PR | 園田海未 | 同上（heart01×3） |
| PL!-PR-015-PR | 西木野真姫 | 低コストバトン登場条件なしで手札登場可 → `requiresBatonFromLowerCostMember` |

### 問題なし

007/009（任意自ウェイト→相手C4ウェイト、ライブ開始時も同型）、012、014、017–018
