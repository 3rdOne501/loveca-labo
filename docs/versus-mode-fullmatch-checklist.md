# 対戦モード — 実プレイ検証チェックリスト（2ブラウザ）

online 対戦のリリース判定に必要な**手動検証**の記録用。`[ ]` → `[x]` に更新。
コード・静的CIは緑（`verify-versus-online-static` 31 / `verify-dual-mode-smoke` 86 / `verify-ability-coverage` OK）。

## 準備
- ゲスト（匿名）ログインで別UID2つ。別オリジン2タブ推奨（例: `localhost:8125` host / `localhost:8126` guest）。
- ルーム作成 → コード共有 → 参加 → 両者「準備完了」→ ホスト「対戦開始」。
- 共通合格: **クラッシュ・デッドロックなし / ソロ入力ダイアログが出ない / 待ちバナーが永久残留しない**。

---

## A. フルマッチ完走（Phase 6 Step 1・必須3）

| # | シナリオ | 合格条件 | 結果 |
|---|----------|----------|:----:|
| 1 | 標準完走 | マリガン→先攻通常→後攻通常→ライブ set/perf/judgment→成功ライブ移動→ターン終了が両者で矛盾なし | [ ] |
| 2 | 勝敗判定 | 成功ライブ3+ & 相手2以下で自動勝敗（総合ルール 1.2.1）。投了も動作 | [ ] |
| 3 | 相手効果込み完走 | デッキに 017愛 / 011冬毬 / 010栞子 等を各1枚以上入れ、online で mutate or choice が1回以上発火 | [ ] |

## B. 切断・復帰・リマッチ（Phase 6 Step 2・耐久4）

| # | 操作 | 合格条件 | 結果 |
|---|------|----------|:----:|
| 1 | 途中 Hard Reload（両者） | ルーム復帰 or ロビー誘導。盤面・フェーズが破綻しない | [ ] |
| 2 | 相手 EffectRequest pending 中にリロード | 120s タイムアウト → cancelled。発動側がスタックせず続行可 | [ ] |
| 3 | 投了 → リマッチ | 新対局開始。前試合 state が混入しない | [ ] |
| 4 | undo 承認 pending 中に効果リクエスト | throw で排他（効果は成立せず toast） | [ ] |

## C. passive_track online（Phase 5・代表7）

各カードを両端末デッキに入れ、常時ボーナスが localDual と同等に UI/スコアへ反映されるか。

| ID | 確認要点 | 結果 |
|----|----------|:----:|
| PL!SP-bp2-010-P | 相手 liveArea → 必要ハート+1（B型 `imposeOpponentLiveNeedHeartDelta`） | [ ] |
| PL!S-bp2-001-P | 自成功0 & 相手成功1+ → ブレード3 | [ ] |
| PL!-bp3-002-P | 相手ウェイト人数に追従 | [ ] |
| PL!N-bp4-012-P | 相手成功ライブ合計6+ | [ ] |
| PL!N-bp4-007-P | 両者E合計15+（常時枝） | [ ] |
| PL!-bp4-018-N | read_compare 常時（自>相 成功スコア） | [ ] |
| PL!N-bp5-002-P | 相手ウェイト+read 複合（両ステージ最多ハート） | [ ] |

## D. Phase 1 手動20件 online 再検証（Phase 5 Step 4）

合格: ソロ入力ダイアログなし・localDual と同一盤面・クラッシュなし。

- [ ] PL!SP-bp2-011-P / [ ] PL!SP-bp2-023-L / [ ] PL!SP-bp2-024-L
- [ ] PL!S-bp2-001-P
- [ ] PL!N-bp3-010-P / [ ] PL!N-bp3-011-P / [ ] PL!N-bp3-017-N
- [ ] PL!S-bp3-002-P / [ ] PL!S-bp3-007-P / [ ] PL!S-bp3-024-L
- [ ] PL!-bp3-002-P / [ ] PL!-bp3-022-L / [ ] PL!-bp3-026-L
- [ ] PL!HS-cl1-012-CL / [ ] PL!N-bp1-026-L / [ ] PL!S-bp5-019-L
- [ ] PL!N-bp4-001-P / [ ] PL!N-bp4-002-P / [ ] PL!N-bp4-004-P / [ ] PL!N-bp4-007-P / [ ] PL!N-bp4-012-P

## E. Phase 5 サンプリング代表（Phase 5 §8）

| 相互作用 | 代表 ID | 結果 |
|----------|---------|:----:|
| mutate_opponent_stage | PL!N-bp3-017-N | [ ] |
| opponent_choice | PL!SP-bp2-011-P | [ ] |
| mutate_opponent_deck | PL!S-bp3-007-P | [ ] |
| read_compare | PL!HS-cl1-012-CL | [ ] |
| passive_track | PL!SP-bp2-010-P | [ ] |

---

## 失敗時の連絡ポイント（開発側で修正）
- template 単位で修正（card_no 分岐禁止）。
- 相手盤 mutate が効かない: `applyVersusEffectPatchLocally` の patchKind / 発動側 `onlineReq` 接続。
- 常時が追従しない: `applyVersusOpponentBoardFromRemote` の再計算トリガー / jouji ctx online 分岐 / v2 集計。
- 選択が来ない: `runVersusOnlineOpponentChoice` / `#dlg-versus-remote-choice` / `syncVersusEffectProtocol`。
- タイムアウト/排他: `js/versusMatch.js` / `VERSUS_EFFECT_TIMEOUT_MS` / `boardActionRequest` 排他。

関連: [known-gaps](./versus-online-known-gaps.md) / [effect-protocol §10](./versus-online-effect-protocol.md) / [user-guide](./versus-mode-user-guide.md)
