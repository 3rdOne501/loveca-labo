# Aqours PR カード（PL!S-PR）効果検証リスト

`PL!S-PR-*`（PRカード / Aqours）をカード番号順に検証する。

- 自動回帰: `node scripts/verify-aqours-pr.mjs`
- 全文監査: `node scripts/audit-aqours-pr-text.mjs`
- エネルギー・能力なし（001–012, 014–015, 017–018, 022–024, 034–036, 043）は対象外

## メンバー（能力付き）

| 状態 | 番号 | ID | 名前 | 主テンプレート | 備考 |
|------|------|-----|------|----------------|------|
| [x] | 013 | PL!S-PR-013-PR | 高海千歌 | deck_top_pick_recover / optional_energy_blade_until_live_end | 登場: 任意1捨→山札3見 / LS: 任意E2→ブレード2 |
| [x] | 016 | PL!S-PR-016-PR | 黒澤ダイヤ | grant_jouji_session | 登場: ライブ終了時までブレード1 |
| [x] | 019 | PL!S-PR-019-PR | 国木田花丸 | 013と同型 | |
| [x] | 020 | PL!S-PR-020-PR | 小原鞠莉 | grant_jouji_session | 016と同型 |
| [x] | 021 | PL!S-PR-021-PR | 黒澤ルビィ | grant_jouji_session | 016と同型 |
| [x] | 025–028 | PL!S-PR-025–028-PR | 各種 | kidou_stage_wait_pick_hand / deck_top_look_reorder | 起動退場回収・山札3見並べ替え |
| [x] | 029–031 | PL!S-PR-029–031-PR | 曜/善子/花丸 | passive_track | 常時: 自or相手ステージ C13+→ブレード2 **2026-06-28修正** |
| [x] | 032–033 | PL!S-PR-032/033-PR | 鞠莉/ルビィ | deck_top_look_reorder | 028と同型 |
| [x] | 037 | PL!S-PR-037-PR | 松浦果南 | passive_track | 常時: 自ステージ2人→heart05 |
| [x] | 038 | PL!S-PR-038-PR | 津島善子 | draw_from_deck | 起動: 自ウェイト+手札1捨→1ドロー |
| [x] | 039 | PL!S-PR-039-PR | 渡辺 曜 | passive_track | 常時: 成功ライブ合計4+→ブレード2 |
| [x] | 040 | PL!S-PR-040-PR | 国木田花丸 | jidou_yell_grant_jouji | 自動: エール同グループ3+→heart01/04 **2026-06-28修正** |
| [x] | 041 | PL!S-PR-041-PR | 黒澤ルビィ | live_start_pick_player_waiting_deck_bottom | 登場: 自/相手選び控え室ライブ→山札下→1ドロー **2026-06-28修正** |
| [x] | 042 | PL!S-PR-042-PR | 小原鞠莉 | passive_track | 常時: 両ステージ合計6人→heart02/04 **2026-06-28修正** |

## ライブ

| 状態 | 番号 | ID | 名前 | 備考 |
|------|------|-----|------|------|
| [x] | 022–024 | PL!S-PR-022–024-PR | HAPPY PARTY TRAIN 等 | 能力なし |

## 2026-06-28 検証

### 修正した

| ID | 名前 | 内容 |
|----|------|------|
| PL!S-PR-029/030/031-PR | 曜/善子/花丸 | 常時「自分か相手のステージ C13+」が自ステージのみ判定 → 相手ステージも参照 |
| PL!S-PR-040-PR | 国木田花丸 | エール同グループ3+未チェック・誤って合計スコア+1付与 → 条件チェック＋heart01/04付与 |
| PL!S-PR-041-PR | 黒澤ルビィ | `draw_from_deck` 誤分類 → 自/相手選択・控え室ライブ山札下・成功時1ドロー |
| PL!S-PR-042-PR | 小原鞠莉 | ソロ時の両ステージ人数が成功ライブ枚数を誤参照 → 相手ステージ人数を正しく加算 |

### 問題なし

013/016/019–021, 025–028, 032–033, 037–039, 038
