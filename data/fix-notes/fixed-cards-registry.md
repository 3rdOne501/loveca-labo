# 修正済みカード台帳

このチャット以降、カード効果修正の正本記録として使用する。

- **正本ルール**: [総合ルール ver.1.06](https://llofficial-cardgame.com/wordpress/wp-content/uploads/2026/04/28140005/LoveLiveTCG_cr_1.06_260428.pdf)
- **「修正」の定義**: テキスト読み返し + 条件・効果・タイミング・効果条件の一致 + シミュレーション検証
- **自動化状態（2026-06-28）**: `guided_manual=0`, `jidou_manual=0`, `automated-bug-suspects=0`
- **関連**: [実プレイ確認リスト](../../docs/play-verification-list.md)（**2026-06-28: 自動検証37/37 OK**）

凡例:

| 検証 | 意味 |
|------|------|
| **コード** | 分類・ハンドラ・静的検証スクリプト通過 |
| **プレイ** | 実盤面操作でユーザー確認済み |

---

## 1. 報告バグ11件（2026-05-20）

出典: `data/fix-notes/ability-reported-bugs.md`

| カード番号 | 名前 | トリガー | 修正概要 | 検証 |
|-----------|------|---------|---------|------|
| PL!S-sd1-002-SD | 桜内梨子 | 登場 | Aqours グループ判定（`cardGroups.js`） | コード |
| PL!S-sd1-017-SD | 小原鞠莉 | 登場 | `draw_then_hand_to_deck_bottom` 新規 | コード |
| PL!S-bp3-006-P | 津島善子 | 起動 | `kidou_self_wait_stage_member_swap_recover` | コード |
| PL!S-bp5-004-P | 黒澤ダイヤ | 登場 | 3択 Aqours ブレード / SaintSnow PC | コード |
| PL!S-bp6-020-L | 冒険Type A,B,C!! | ライブ開始 | 「」内 live_success 誤分割防止 | コード |
| PL!HS-pb1-030-L | Edelied | ライブ開始 | `live_start_edelnote_blade_heart_pair` | コード |
| PL!-bp5-011-N | （ライブ） | ライブ開始 | `grantHeartSlotUntilLiveEnd(0)` バグ修正 | コード |
| PL!-bp3-012-N | （ライブ） | ライブ開始 | 同上 + 成功ライブ0枚スキップ | コード |
| PL!S-bp2-005-P | 渡辺曜 | 登場 | 山札7枚見て heart02/04/05 最大3枚回収 | コード |
| PL!SP-sd2-023-SD2 | 始まりは君の空 | ライブ開始 | 成功ライブ誤マッチ修正 → スコア+5 | コード |
| PL!SP-bp4-025-L | Special Color | 開始/成功 | センター Liella! ブレード3 + 移動条件+1 | コード |
| PL!N-bp1-012-P | 鐘嵐珠 | 常時 | ALL ハート代用（`wildcardBhAllFlex`） | コード |

---

## 2. 自動(jidou)ハンドラ欠落（2026-05）

出典: `data/fix-notes/pr-jidou-missing-handlers.md`

| カード番号 | 名前 | テンプレート | 検証 |
|-----------|------|-------------|------|
| PL!S-bp2-002-R/P | 桜内梨子 | `jidou_leave_stage_hand_pick_recover` | コード |
| PL!HS-bp6-017-N | 日野下花帆 | 同上（dual） | コード |
| PL!HS-bp2-012-N | 乙宗梢 | `jidou_leave_stage_deck_look_pick` | コード |
| PL!HS-bp2-013-N | （メンバー） | 同上 | コード |
| PL!SP-bp4-007-R/P | 米女メイ | `jidou_area_move_wait_pick_hand` | コード |
| PL!HS-bp5-003-R+/P/AR/SEC | 大沢瑠璃乃 | `jidou_leave_stage_position_change` | コード |

---

## 3. コード監査 A/B/C/E（2026-06-23）

出典: `docs/play-verification-list.md`

| カード番号 | 名前 | 問題 | 修正 | 検証 |
|-----------|------|------|------|------|
| PL!S-bp5-002-R＋ | 桜内梨子 | サイド条件なのに全エリア発動 | `parseStageAreaConstraints` 修正 | コード・プレイ[x] |
| PL!S-bp5-020-L | Landing action Yeah!! | 余剰ハート喪失がトーストのみ | `consumeAllOwnLiveSurplusHearts()` | コード・プレイ[x] |
| PL!SP-pb2-009-R | 鬼塚夏美 | Wikiトークン除去後ブレード欠落→ハート比較に誤分類 | `oppBladeGapMin` + `abilityReferencesPrintedBlade(segRaw)` | コード |
| PL!HS-cl1-012-CL | Edelied | ソロ相手ライブ合計スコア常に0 | `soloOpponentLiveFrameScoreSum` | コード |
| PL!N-bp1-026-L | Poppin' Up! | 同上 | 同上 | コード |
| PL!N-bp5-007-R＋ | 優木せつ菜 | 余剰ハート条件なしに2ドロー1捨て | `minSurplusHearts: 1` | コード |
| PL!-pb1-004-R | 園田海未 | 段階効果 minSuccessLiveCount 誤り | 段階1枚から判定 | コード |
| PL!S-bp6-020-L | 冒険Type A,B,C!! | 3択全体が成功ライブ2枚前提 / バトン候補漏れ | 選択肢条件分離 + `_toujouBatonPartnerId` | コード |
| PL!SP-pb1-023-L | （ライブ） | E復帰なし live_card_score_plus のみ | `live_start_activate_energy_all_active_score` | コード |

| PL!SP-bp4-024-L | ノンフィクション!! | 左サイド heart02×3+ 付与条件が分類から脱落 | `parseMemberLocationStageArea` | コード |

---

## 4. P0 相手盤操作（チャット d7ba868c）

| カード番号 | 名前 | トリガー | 修正概要 | 検証 |
|-----------|------|---------|---------|------|
| PL!S-bp5-002-R＋ | 桜内梨子 | ライブ開始 | 相手ステージをウェイト（自盤操作バグ）+ 元々ブレード≤3 | コード |
| PL!S-pb1-002-R | 桜内梨子 | 登場 | 相手手札ライブ捨て（自手札操作バグ） | コード |
| PL!-PR-014-PR | 園田海未 | 登場 | 相手手札3枚非公開→公開→ライブなし1ドロー | コード |
| PL!-pb1-015-R | 西木野真姫 | 登場 | 相手アクティブのみ選択可 | コード |

---

## 5. P2 DUO pb2 未自動化8件 + pb2-010（チャット d7ba868c）

| カード番号 | 名前 | トリガー | テンプレート | 検証 |
|-----------|------|---------|-------------|------|
| PL!SP-pb2-003-R | 嵐千砂都 | ライブ成功 | `live_success_liella_effect_moved_score` | コード |
| PL!SP-pb2-005-R | 葉月恋 | 登場 | `toujou_baton_discarded_under` + 常時起動ミラー | コード |
| PL!SP-pb2-007-R | 米女メイ | ライブ成功 | `live_success_optional_energy_recover_waiting` | コード |
| PL!SP-pb2-008-R | 唐可可 | ライブ成功 | `live_success_yell_nobh_series_score_capped` | コード |
| PL!SP-pb2-009-R | 鬼塚夏美 | 登場/開始 | `optional_pick_member_wait_opp_blade_gap` | コード |
| PL!SP-pb2-010-R | ウィーン・マルガレーテ | ライブ開始 | `live_start_mandatory_energy_deck_unless_hand_discard` | コード |
| PL!SP-pb2-045-L | 絶対的LOVER!! | ライブ開始 | `live_card_score_plus_per_unit` | コード |
| PL!SP-pb2-050-L | Jellyfish | ライブ開始 | `live_start_optional_formation_change` | コード |

---

## 6. jidou_manual 6件（チャット d7ba868c）

| カード番号 | 名前 | トリガー | テンプレート | 検証 |
|-----------|------|---------|-------------|------|
| PL!SP-pb2-006-R | 桜小路きな子 | 常時/自動 | 下 Liella! コスト+1 / 成功or移動で下配置 | コード |
| PL!SP-pb2-020-R | 鬼塚夏美 | 自動 | エール時手札 Liella! ライブ任意捨て→追加2枚エール | コード |
| PL!SP-pb2-022-R | 鬼塚冬毬 | 自動 | 5yncri5e! センター移動→ブレード4 | コード |

---

## 7. passive_track / 常時ライブ（チャット d7ba868c）

| カード番号 | 名前 | 修正概要 | 検証 |
|-----------|------|---------|------|
| PL!-bp4-019-L | Angelic Angel | 成功ライブ置き場＋μ's → スコア+5 | コード |
| PL!-bp6-019-L | Music S.T.A.R.T!! | 成功ライブ置き場 → μ's コスト17+ 手札登場-2 | コード |
| PL!SP-pb2-046-L | Butterfly Wing | ステージメンバーのライブ開始時能力ブロック | コード |
| PL!HS-bp2-020-L | Link to the FUTURE | 全領域複数シリーズ扱い | コード |
| PL!HS-bp5-018-L | AURORA FLOWER | 同上 | コード |
| PL!S-bp2-024-L | 君のこころは輝いてるかい？ | 成功ライブ置き場への配置禁止 | コード |

---

## 8. grant_jouji 専用化6件（チャット d7ba868c）

| カード番号 | 名前 | テンプレート | 検証 |
|-----------|------|-------------|------|
| PL!HS-bp2-007-P | 百生吟子 | 同名付与 grant | コード |
| PL!HS-bp6-014-R | 安養寺姫芽 | `kidou_discard_self_draw_grant` | コード |
| PL!N-pb1-003-P＋ | 桜坂しずく | 同上 + EE コスト | コード |
| PL!N-bp3-025-L | Awakening Promise | `live_start_optional_energy_under_return_grant` | コード |
| PL!N-pb1-039-L | Stellar Stream | `live_start_stellar_stream_grant` | コード |
| PL!SP-pb2-000-DUO | 千砂都＆夏美 | `toujou_baton_discarded_series_per_card` | コード |

---

## 9. その他単体修正（チャット d7ba868c）

| カード番号 | 名前 | 修正概要 | 検証 |
|-----------|------|---------|------|
| PL!HS-bp5-021-L | ジョーショーキリュー | 元々ハート→heart01 リマップ + スコア+1 | コード |
| PL!S-bp2-004-P/R | 黒澤ダイヤ | `jidou_yell_retry_no_live` composition 退行修正 | コード |
| PL!N-bp4-010-R＋ | 三船栞子 | `live_start_pick_live_frame_match_success_live_grant` 自動化登録 | コード |
| PL!N-bp4-027-L | EMOTION | `live_start_score_plus_per_named_success_live`（成功ライブ枚数比例+必要heart0） | verify-niji-bp4 |
| PL!N-bp4-029-L | Rise Up High! | `grant_jouji_session` + `requiresFirstGameLivePhase` + `cardScoreGrant` | verify-niji-bp4 |
| PL!N-bp4-031-L | NEO SKY, NEO MAP! | `draw_then_hand_to_deck_top`（全エリア+コスト20+） | verify-niji-bp4 |
| PL!SP-bp4-026-L | Wish Song | 複数 `live_success` → `ability_sequence` | verify-liella-bp4 |
| PL!SP-bp4-028-L | DAISUKI FULL POWER | `requiresAnyActiveEnergy` + スコア+1 | verify-liella-bp4 |
| PL!-bp6-024-L | 錯覚CROSSROADS | `jouji_success_live_waiting_substitute` 分類接続 | コード |
| PL!-pb1-015-R | 西木野真姫 | ライブ開始時 BiBi+相手アクティブウェイト 誤分類修正 | コード |
| PL!S-pb1-001-R | 高海千歌 | 相手ライブ必要ハート+ / 手札枚数比較 | コード |
| PL!-pb1-009-R | 矢澤にこ | `oppWaitMaxPrintedBlade: 1` | コード |
| PL!S-bp5-019-L | not ALONE not HITORI | `minEitherSuccessLiveCount` / handPickMax:2 / フォーメーション | コード |
| PL!SP-pb2-014-R | 嵐千砂都 | フォーメーションチェンジ（11.11） | コード |

---

## 10. ユーザー報告バッチ（2026-06、チャット d7ba868c）

| カード番号 | 名前 | 修正概要 | 検証 |
|-----------|------|---------|------|
| PL!SP-bp5-002-R＋ | 唐可可 | 起動 BH2枚捨て条件付きブレード（composition統合） | コード |
| PL!SP-bp4-006-P | 桜小路きな子 | ライブのみ回収 + エール前提 | コード |
| PL!SP-pb2-011-PP | 鬼塚冬毬 | `jidou_center_member_move_choice` 3択 | コード |
| PL!SP-pb1-025-L | （ライブ） | 冬毬移動後必要ハート軽減再計算 | コード |
| PL!HS-PR-032-PR | セラス柳田リリエンフェルト | スコア6以上ライブのみ回収 | コード |
| PL!SP-bp5-008-AR | 若菜四季 | デッキ上 Liella! **メンバー**手札追加 | コード |
| PL!S-bp2-005-R＋ | 渡辺曜 | ダイアログボタン「手札に加える」 | コード |
| PL!SP-pb1-001-PR | 澁谷かのん | E支払い/手札2枚破棄 二択整理 | コード |
| PL!SP-pb2-048-L | ディストーション | `live_start_distinct_series_need_heart_shift_score` | コード |
| PL!SP-pb2-018-R | 米女メイ | Eウェイト復帰のみ × CatChu!人数 | コード |
| PL!SP-pb2-007-R | 米女メイ | 二重コスト支払い防止 | コード |
| PL!SP-bp4-027-L | Chance Day, Chance Way! | 成功置き場から成功解決 + フォーメーション | コード |

---

## 11. Phase 2 個別実装（チャット fb299c07）

| カード番号 | 名前 | トリガー | テンプレート | 検証 |
|-----------|------|---------|-------------|------|
| PL!SP-bp4-002-R | 唐可可 | 登場 | `toujou_deck_top_liella_live_pick` | コード |
| PL!SP-bp1-024-L | Tiny Stars | 開始/成功 | `live_start_named_member_heart_blades` / `live_success_characters_draw` | コード |

---

## 12. 分類基盤修正（横展開・カード個別番号なし）

| 日付 | 内容 | 影響 |
|------|------|------|
| 2026-05-20 | 能力解決ハング防止（`abortResolved`） | draw/toujou/kidou 系テンプレート横断 |
| 2026-05-20 | `kidou_stage_wait_pick_hand` コールバック統合 | 起動54件 |
| 2026-06-23 | 成功ライブカード置き場の pickType 誤解析除外 | 複数カード |
| 2026-06-23 | エール前置条件（同点スコア等）の filters 分離 | Edelied / Poppin' Up! 等 |
| 2026-06 | `optional_self_wait_opp_stage` 分類追加 | 33+件 |
| 2026-06 | 相手盤ヘルパー群（`soloOpponentActiveStageMemberCandidates` 等） | 相手操作系全般 |

---

## 未完了リスト（目標: 0）

### A. コード未修正

**現在 0件**（`guided_manual=0`, `jidou_manual=0`, `automated-bug-suspects=0`）

### B. 実プレイ未確認（コードOK・要最終確認）

**2026-06-28: 0件** — `scripts/verify-play-checklist.mjs` で37ユニークカード（`docs/play-verification-list.md` 表43行）を分類・ハンドラ・既知バグパターンで一括検証済み。`verify-ability-coverage` 通過。

手動の実盤面確認は任意。必要なら [play-verification-list.md](../../docs/play-verification-list.md) の手順欄を参照。

---

## 13. ユーザー報告（2026-06-28）

| カード番号 | 名前 | 問題 | 修正 | 検証 |
|-----------|------|------|------|------|
| PL!S-bp2-005-P | 渡辺曜 | 3枚回収が1枚ずつ連続選択 | `deck_top_pick_recover` で `openPickMultipleFromDeckLookDialog`（最大3枚同時） | コード |
| PL!HS-pb1-011-R 他29件 | — | 「1枚手札に加え残り控え室」が `deck_top_to_waiting` で全枚控え室 | `classifyDeckTopPickToHandPatch` → `deck_top_pick_recover` | コード |
| LL-bp1-001-R＋ | 上原歩夢&… | 手札3枚コスト未処理、スコア+6（+3二重） | `live_start_hand_named_discard_grant_jouji` + grant スコア重複除去 | コード |

---

## 14. 類似パターン一括横展開（2026-06-28）

| パターン | 件数目安 | テンプレート / 修正 |
|---------|---------|-------------------|
| 山札見る→手札→残り控え室（N枚まで・各グループ1枚） | 29+3 | `classifyDeckTopPickToHandPatch`（`deckTopPickMax` / `deckTopPickDistinctGroup`） |
| 登場 or 手札 | 2 | `deck_top_pick_enter_or_hand`（PL!SP-pb2-001-R/PP） |
| 手札・同ユニット名N枚→常時付与 | 複数 | `live_start_hand_discard_same_unit_grant` |
| 手札・同グループ名N枚→常時付与 | 複数 | `live_start_hand_discard_same_group_grant` |
| 手札N枚まで→1枚につきブレード | 複数 | `live_start_hand_discard_optional_blade_per` |
| 手札・シリーズメンバー→ステージ付与 | 1+ | `live_start_hand_discard_series_member_blade_grant` |
| 登場時・左/右/センターに登場しているなら | 4 | `twT` + `parseMemberLocationStageArea` → `stageArea`（唐可可 bp1-002 全レア） |
| ライブ成功時・エール公開シリーズメンバーN枚+→スコア+ | 1 | `live_card_score_plus` + `minYellRevealedSeriesMemberCount`（AWOKE bp1-022） |

回帰: `scripts/verify-deck-pick-hand-patterns.mjs`（`verify-ability-coverage` 連携）。  
虹ヶ咲 bp1: `scripts/verify-niji-bp1.mjs` + `docs/niji-bp1-verification-list.md`。  
Liella! bp1: `scripts/verify-liella-bp1.mjs` + `docs/liella-bp1-verification-list.md`。  
蓮ノ空 bp1: `scripts/verify-hasunosora-bp1.mjs` + `docs/hasunosora-bp1-verification-list.md`。  
蓮ノ空 pb1: `scripts/verify-hasunosora-pb1.mjs` + `docs/hasunosora-pb1-verification-list.md`（2026-06-28 分類OK・回帰追加）。  
蓮ノ空 bp2: `scripts/verify-hasunosora-bp2.mjs` + `docs/hasunosora-bp2-verification-list.md`（NEXTSTEP・2026-06-28 分類OK）。  
Liella! pb2: `scripts/verify-liella-pb2.mjs` + `docs/liella-pb2-verification-list.md`（DB上唯一の pb2・2026-06-28 分類OK）。  
Aqours bp2 / NEXTSTEP: `scripts/verify-aqours-bp2.mjs` + `docs/aqours-bp2-verification-list.md`（2026-06-28 分類OK）。  
Liella! bp2 / NEXTSTEP: `scripts/verify-liella-bp2.mjs` + `docs/liella-bp2-verification-list.md`（2026-06-28 分類OK）。  
ルール: `.cursor/rules/card-fix-similarity-batch.mdc`（以降のカード修正でも類似検索必須）。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-06-28 | 前チャット全件（fb299c07, d7ba868c）+ fix-notes + play-verification-list から初版作成 |
| 2026-06-28 | 再検証: 鬼塚夏美 ブレード比較の誤分類修正、ノンフィクション!! 左サイド条件付与の復元 |
| 2026-06-28 | play-verification-list 43行: verify-play-checklist.mjs 37/37 OK。未完了リスト B → 0件 |
| 2026-06-28 | PL!S-bp2-005-P 複数同時選択、PL!HS-pb1-011-R 等29件 deck_top_pick_recover 誤分類、LL-bp1-001-R＋ 手札コスト+スコア二重加算 |
| 2026-06-28 | 類似パターン一括: 手札コスト付 grant テンプレ群、登場or手札、verify-deck-pick-hand-patterns、card-fix-similarity-batch ルール |
| 2026-06-28 | 虹ヶ咲 bp1: ライブ027–029 括弧ドロー誤分類修正、Solitude Rain ハート色比例スコア、verify-niji-bp1 |
| 2026-06-28 | Liella! bp1: 唐可可002 左サイド登場条件、verify-liella-bp1 + audit-liella-bp1-text |
| 2026-06-28 | 蓮ノ空 bp1: AWOKE022 エール公開メンバー10枚+スコア+1、verify-hasunosora-bp1 + audit-hasunosora-bp1-text |
| 2026-06-28 | 蓮ノ空 pb1: 全28枚分類OK（新規修正なし）、verify-hasunosora-pb1 + audit-hasunosora-pb1-text 追加 |
| 2026-06-28 | 蓮ノ空 bp2（NEXTSTEP）+ Liella! pb2: 分類OK・verify/audit スクリプト追加（HS pb2 未収録） |
| 2026-06-28 | Aqours bp2 / NEXTSTEP: 16枚分類OK、verify-aqours-bp2 + audit-aqours-bp2-text 追加 |
| 2026-06-28 | Liella! bp2 / NEXTSTEP: 22枚分類OK、verify-liella-bp2 + audit-liella-bp2-text 追加 |
| 2026-06-28 | 虹ヶ咲 bp4 ライブ027/029/031: 成功ライブ比例・1T目条件・ドロー+山札上 |
| 2026-06-28 | Liella! bp4 ライブ026/028: 複数live_success分離・アクティブE条件 |
