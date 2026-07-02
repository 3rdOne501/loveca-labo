# 蓮ノ空 cl1（PL!HS-cl1）効果検証リスト

コレクションクリアポケット（`PL!HS-cl1-*`）を検証する。

- 自動回帰: `node scripts/verify-hs-cl1.mjs`
- 全文監査: `node scripts/audit-hs-cl1-text.mjs`
- エネルギー（013–016）は対象外

## ライブ（009–012）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 009 | PL!HS-cl1-009-CL | 水彩世界 | yell_resolution_pick_hand | エール公開から蓮ノ空メンバー C4–9 を1枚回収 **2026-06-28: maxCost 9** |
| [x] | 010 | PL!HS-cl1-010-CL | AWOKE | grant_jouji_session | C10+蓮ノ空メンバー1人にブレード2 **2026-06-28: grantToStageSeriesTag+minCost** |
| [x] | 011 | PL!HS-cl1-011-CL | ド！ド！ド！ | live_success_pick_options | 任意E1→控え室メンバー or ライブ枠2+で蓮ノ空ライブ回収 **2026-06-28: ライブ選択肢ハンドラ** |
| [x] | 012 | PL!HS-cl1-012-CL | Edelied | yell_resolution_pick_hand | 自/相ライブ合計同点→エールからC9+メンバー1枚（[play-verification-list](./play-verification-list.md) B項修正済） |

## メンバー（001–008）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 001 | PL!HS-cl1-001-CL | 日野下花帆 | deck_top_peek_optional_wait | 山札1枚見て任意控え室 **2026-06-28: peek 分類・ハンドラ** |
| [x] | 002 | PL!HS-cl1-002-CL | 村野さやか | toujou_wait_pick_hand | 任意E1→控え室から『DOLLCHESTRA』回収 |
| [x] | 003 | PL!HS-cl1-003-CL | 大沢瑠璃乃 | grant_jouji_session | 自ウェイト→みらくらぱーく！1人にブレード1 |
| [x] | 004 | PL!HS-cl1-004-CL | 百生 吟子 | ability_pick_one | 山札上3枚控え室 or 相手C2以下ウェイト **2026-06-28: 山札ミル選択肢** |
| [x] | 005 | PL!HS-cl1-005-CL | 徒町 小鈴 | optional_energy_blade_until_live_end | 任意E1→ブレード2 |
| [x] | 006 | PL!HS-cl1-006-CL | 安養寺 姫芽 | grant_jouji_session | 登場時ブレード3 |
| [x] | 007 | PL!HS-cl1-007-CL | セラス柳田 | deck_top_pick_recover | 任意手札1捨→山札3見て1枚手札 |
| [x] | 008 | PL!HS-cl1-008-CL | 桂城 泉 | kidou_stage_wait_pick_hand | 自退場→控え室から蓮ノ空1枚手札 |

## 2026-06-28 修正（メンバー）

| ID | 内容 |
|----|------|
| PL!HS-cl1-001-CL | `deck_top_to_waiting` 誤分類→ `deck_top_peek_optional_wait`（見て任意控え室） |
| PL!HS-cl1-004-CL | `executeAbilityChoiceText`: 1択目（山札上3枚控え室）未実装 |

## 2026-06-28 修正（ライブ）

| ID | 内容 |
|----|------|
| PL!HS-cl1-009-CL | `parseAbilityPickFilters`: 「コストN以上M以下」で maxCost が欠落 |
| PL!HS-cl1-010-CL | `grant_jouji_session`: コスト条件入り「メンバー1人は」が付与先未設定→ライブカード自身に常時付与される不具合 |
| PL!HS-cl1-011-CL | `executeAbilityChoiceText`: 2択目（控え室ライブ回収）が未実装 |

## 2026-06-30 2回監修

| ID | 内容 |
|----|------|
| （全体） | 12枚（能力付き）再確認。`guided_manual=0`。新規コード修正なし |
| PL!HS-cl1-001-CL | 山札1枚見て任意控え室（peek）を再確認 |
| PL!HS-cl1-004-CL | 3枚ミル or 相手C2以下ウェイト選択肢を再確認 |
| PL!HS-cl1-010-CL | C10+蓮ノ空1人ブレード付与先を再確認 |
| PL!HS-cl1-011-CL | 任意E / ライブ枠2+時の控え室ライブ回収を再確認 |
| PL!HS-cl1-012-CL | 自/相ライブ同点→エールC9+メンバー回収を再確認 |
| verify | 12ケース通過 |
