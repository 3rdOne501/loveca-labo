# 修正済みカード台帳

カード効果修正の**正本記録**。前チャット [fb299c07](fb299c07-066c-458f-946b-4cf93726a9cc)・[d7ba868c](d7ba868c-2fb7-475a-98bb-ce2d64819f7e)・[cd299e25](cd299e25-5fbb-46e3-a736-63f87a9cbb25) の履歴を集約。以降の修正もここに追記する。

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
| PL!S-bp5-003-P | 松浦果南 | 登場 | BHなしメンバー最大2枚捨→同数Aqoursライブ回収 | コード |
| PL!S-bp5-004-P | 黒澤ダイヤ | 登場 | 2択: 他Aqoursブレード / SaintSnow PC | コード |
| PL!S-bp5-009-P | 黒澤ルビィ | 登場 | 任意E→SaintSnow回収→ブレード2 | コード |
| PL!S-bp6-020-L | 冒険Type A,B,C!! | ライブ開始 | 「」内 live_success 誤分割防止 | コード |
| PL!HS-pb1-030-L | Edelied | ライブ開始 | `live_start_edelnote_blade_heart_pair` | コード |
| PL!-bp5-011-N | （ライブ） | ライブ開始 | `grantHeartSlotUntilLiveEnd(0)` バグ修正 | コード |
| PL!-bp3-012-N | （ライブ） | ライブ開始 | 同上 + 成功ライブ0枚スキップ | コード |
| PL!S-bp2-005-P | 渡辺曜 | 登場 | 山札7枚見て heart02/04/05 最大3枚回収 | コード |
| PL!SP-sd2-023-SD2 | 始まりは君の空 | ライブ開始 | 成功ライブ誤マッチ修正 → スコア+5 | コード |
| PL!SP-bp4-025-L | Special Color | 開始/成功 | センター Liella! ブレード3 + 移動条件+1 | コード |
| PL!N-bp1-012-P | 鐘嵐珠 | 常時 | ALL ハート代用（`wildcardBhAllFlex`） | コード |
| PL!N-bp4-030-L | Daydream Mermaid | ライブ成功 | 虹ヶ咲成功ライブ有無は複数選択ブーストのみ（発動条件ではない） | コード |

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
| PL!SP-bp4-024-L 他 | ノンフィクション!! 等 | 複数 `live_start` の `ability_sequence` が外側 filters で AND 化され後段（赤ハート条件→ブレード2）が発動不能 | 外側 filters 空＋段ごと前提判定（横展開13枚: bp4-023/024・果林004・夏色えがお・ジョーショーキリュー・百生吟子 等） | コード |
| PL!SP-bp4-006-P 他 | 桜小路きな子 / Poppin' Up! / Bubble Rise 等 | 成功判定後にエール回収すると UI が失敗に戻る | 仕様: 判定ロックを render bundle に反映（8.3.15/8.4.4）。`yell_resolution_*` 全体 | コード |

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
| PL!SP-pb2-004-R | 平安名すみれ | ライブ成功 | `draw_from_deck` + `drawOrPreconditions` | コード |
| PL!SP-pb2-005-R | 葉月恋 | 登場 | `toujou_baton_discarded_under` + 常時起動ミラー | コード |
| PL!SP-pb2-007-R | 米女メイ | ライブ成功 | `live_success_optional_energy_recover_waiting` | コード |
| PL!HS-PR-022-PR 他 | 任意Eのみ blade/score/recover/grant | 固定E未徴収→自動ウェイト（`TEMPLATE_OPTIONAL_ENERGY_ONLY_AUTO_PAY`） | 横展開 ~30枚 |
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
| PL!HS-bp5-021-L | ジョーショーキリュー | 元々ハート→heart01 リマップが syncJouji で消える不具合修正 + 桃チップ表示 | コード |
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
| PL!HS-bp6-013-R | 徒町小鈴 | 登場 | `buildOppWaitStageMeta` + `excludedUnit` | 元々ブレード3以下・DOLLCHESTRA以外ウェイト（登場時プール誤り） | コード |
| PL!HS-pb1-008-R | 桂城泉 | 登場 | `toujou_both_sides_wait_all_printed_blade` | 自+相手ステージ・元々ブレード3以下を一括ウェイト（旧 `optional_self_wait_opp_stage` は相手1人のみ） | コード |
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

## 15. アニバーサリー クロスメンバー（2026-06-30）

| カード番号 | 名前 | 問題 | 修正 | 検証 |
|-----------|------|------|------|------|
| LL-bp1-001-R＋ | 歩夢&かのん&花帆 | `parseQuotedCharacterNames` が付与文を名前に誤収録 | コスト部分のみ名前解析（`：ライブ終了` 前） | verify-ll-anniversary-member |
| LL-bp1-001-R＋ | 歩夢&かのん&花帆 | **2回監修** 任意コスト「0枚スキップ」が `minPick:3` で不可 | `openPickHandOptionalMultiToWaiting` を `minPick:0` / `maxPick:N`（0 or ちょうどN） | 横展開3テンプレ |
| LL-bp6-001-R＋ | ことり&ダイヤ&小鈴 | 捨て札ハート色が枚数分重複・ターン限定 `playBonusHeartSlotsTurn` | `grantUnionHeartColorsFromDiscardedUntilLiveEnd`（FAQ Q246 和集合・ライブ終了まで） | verify-ll-anniversary-member |
| kidou_wait_shuffle（横展開） | — | 控え室名前が完全一致のみ | `memberNameMatchesCharacter` 照合 | 同上 |
| live_start_hand_discard_same_unit_grant / _same_group_grant | — | 同上 minPick 不具合 | `minPick:0` 横展開 | simulator |

2回監修のみ（修正なし）: LL-bp2〜4 クロス、LL-bp5 ライブ2枚、PL!HS-cl1 全12枚、LL-PR-004。

---

## 14. μ's bp5 メンバー（2026-06-30）

| カード番号 | 名前 | 問題 | 修正 | 横展開 |
|-----------|------|------|------|--------|
| PL!-bp5-010-N | 高坂穂乃果 | `ability_sequence` ステップ0が任意コスト継承で山札ミル必須処理がスキップ可能 | `abilityComposition.stripStepCostsWhenParentPaid` | 同型5枚（登場/ライブ開始・手札任意→山札控え室→控え室回収） |
| PL!-bp5-333-P＋ | 統堂英玲奈 | 常時「自ウェイト時 heart05」が `heartFlat` 未設定 | `blade_if_self_wait` に `countHeartIconsBySlot` 付与 | 同文言1枚 |

`toujou_wait_pick_hand`: `live_start` / `live_success` 文脈でライブ開始時・成功時前提チェックに切替（登場時誤判定防止）。

検証: `verify-muse-bp5.mjs` 26/26、`audit-muse-bp5-text.mjs` OK。

---

## 15. μ's bp5 ライブ（2026-06-30）

| カード番号 | 名前 | 問題 | 修正 | 横展開 |
|-----------|------|------|------|--------|
| PL!-bp5-024-L | Private Wars | `parseAbilityBulletChoices` が `{{icon_blade}}` を除去し選択肢が「…はを得る」に／選択肢1がライブカードへブレード付与 | `plainTextFromAbilityWikiMarkup` + `executeAbilityChoiceText` ウェイト復帰→対象メンバーへブレード | `ability_pick_one` + icon_blade 全般 |

`verify-p2-ability-smoke.mjs`: `optional_self_wait_opp_stage` ソロ相手盤チェックのハンドラ窓 4000→8000（既存実装は正、検出漏れのみ）。

検証: `verify-muse-bp5.mjs` 26/26、`audit-muse-bp5-text.mjs` OK（`audit-common-patterns.mjs` 経由）。

---

## 16. Aqours bp5（2026-06-30）

| カード番号 | 名前 | 問題 | 修正 | 横展開 |
|-----------|------|------|------|--------|
| PL!S-bp5-005-P | 渡辺 曜 | `heart_color_pick_grant` が自カードのみ付与／「今ターン登場の非Aqours全員」未処理 | `grantToEnteredMembersThisTurn` + `grantExcludeSeriesTag` 分類、`listEnteredStageMembersThisTurn` ハンドラ | 同文言4レアリティ |

検証: `verify-aqours-bp5.mjs` 24/24、`audit-aqours-bp5-text.mjs` OK。

---

## 17. 虹ヶ咲 bp5（2026-06-30）

| カード番号 | 名前 | 問題 | 修正 | 横展開 |
|-----------|------|------|------|--------|
| PL!N-bp5-005-P | 宮下 愛 | `jidou_leave_baton_partner_bh_threshold_energy` 新設（バトン相手BH閾値+E活性+条件ドロー） | 同文言4レアリティ |

検証: `verify-niji-bp5.mjs` 35/35、`audit-niji-bp5-text.mjs` OK。

---

## 18. Liella! bp5（2026-06-30）

| 代表ID | 内容 |
|--------|------|
| PL!SP-bp5-025-L | `optional_energy_card_score_plus_per_unit`（初回: E4枚につきスコア+1 誤分類修正） |
| PL!SP-bp5-009-P / 023-L | 2回監修: ミル継続・エール公開スコアライブ前提 |

検証: `verify-liella-bp5.mjs` 35/35、`audit-liella-bp5-text.mjs` OK。

---

## 19. 蓮ノ空 bp5（2026-06-30）

| 代表ID | 内容 |
|--------|------|
| PL!HS-bp5-013-N | `live_start_deck_top_if_all_members_grant`（初回: ミル未実行バグ） |
| PL!HS-bp5-005-P / 022-L | 2回監修: DOLLCHESTRA手札・Retrofuture 2択 |

検証: `verify-hasunosora-bp5.mjs` 24/24、`audit-hasunosora-bp5-text.mjs` OK。

---

## 20. Anniversary2026 bp5 再監修（2026-06-30・2回目）

横展開を含む実行時バグ修正。

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!-bp5-111-P＋ | jouji A-RISE 他1人につき heart05 が人数倍されない | `evaluateJoujiRule` heartFlat×series count |
| PL!-bp5-002-P / 222-P＋ | 必須ウェイト＋任意手札捨てが全体スキップ可能 | `costHandDiscardOptional` + `optional:false`（全5スクール 002/006/008/009 系） |
| PL!N-bp5-001-P | エール公開BH種類数→heart01＋6種で常時スコア+1 | `jidou_yell_distinct_bh_tier_grant` |
| PL!N-bp5-004-P | 相手ウェイト「ちょうど4ブレード」 | `oppWaitExactPrintedBlade` |
| PL!N-bp5-015-N | 桜坂しずく | ライブ開始 | `requiresStageCollectiveHeartSlots` | ステージ合算で全6色ハート→ブレード2（FAQ Q216） | コード |
| PL!N-bp5-026-L 他 | — | 同上パターン | 横展開 | ライブ開始スコア+1 |
| PL!N-bp5-027-L | 自ステージ異名3人条件 | `minDistinctStageMemberNames` |
| PL!SP-bp5-009-P | ミル後も自ウェイト後に続行（FAQ Q222） | `live_start_mill_loop_blade_grant` |
| PL!SP-bp5-023-L | エール公開スコアライブ前提 | `icon_score` wiki 平文化対応 |
| PL!HS-bp5-005-P | DOLLCHESTRA 手札捨て二重UI | 分類から `handDiscardToWaiting` 除去 |
| PL!HS-bp5-022-L | Retrofuture 2択ハンドラ＋EdelNote C9+前提 | `executeAbilityChoiceText` |

検証: 全5スクール verify/audit OK（計147ケース）。

---

## 21. 蓮ノ空 bp6（2026-06-30）

監修のみ（新規コード修正なし）。`verify-hasunosora-bp6.mjs` 42/42、`audit-hasunosora-bp6-text.mjs` OK。

---

## 22. 全スクール pb1（2026-06-30）

監修のみ（新規コード修正なし）。各スクール verify/audit 新設。

| スクール | 検証 |
|---------|------|
| μ's | `verify-muse-pb1.mjs` 39/39 |
| Aqours | `verify-aqours-pb1.mjs` 25/25 |
| 虹ヶ咲 | `verify-niji-pb1.mjs` 46/46 |
| Liella! | `verify-liella-pb1.mjs` 28/28 |

---

## 23. bp1 2回監修（2026-06-30）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!N-bp1-004-R | ほかのシリーズ on stage 条件が未設定 | `parseAbilityPickFilters` minStageSeriesMembers:2 |
| PL!N-bp1-006-R＋ | このターン登場の虹ヶ咲条件 | `requiresSeriesEnteredThisTurn` |
| PL!N-bp1-008-R | 捨てたメンバーより低コストのみ回収 | `pickMaxCostBelowHandDiscarded` |

検証: `verify-niji-bp1.mjs` 18/18、Liella/蓮 bp1 verify 拡充。

## 24. bp1 ライブ2回監修（2026-06-30）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| （全体） | 虹/Liella/蓮 bp1 ライブ 15枚: 実行時バグなし | `audit-common-patterns` ライブルール6件追加 |

検証: niji 19 / liella 16 / hasu 20 ケース。

## 25. μ's pb1 メンバー2回監修（2026-06-30）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!-pb1-003-R | Printemps on stage 人数×E1枚アクティブ未実装 | `energyActiveUnitKind: series_stage_members` |
| PL!-pb1-007-R | 成功ライブ減コスト・ライブ回収フィルタ | `handDiscardReducedPerSuccessLive`、控え室からシリーズ優先 |

---

## 26. μ's pb1 ライブ2回監修（2026-06-30）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!-pb1-029-L | 成功ライブ0枚条件未設定 | `maxOwnSuccessLiveCount`（`成功ライブカード置き場のカードが0枚`） |
| PL!-pb1-030-L | BiBi異名2人→単純人数カウント誤り | `minDistinctSeriesMemberNames` + `distinctSeriesMemberNamesTag` |
| PL!-pb1-032-L | 成功ライブ置き場→ライブ置き場誤判定 | `minSuccessLiveSeriesTag`、`(?<!成功)ライブカード置き場` |

---

## 27. Aqours pb1 2回監修（2026-06-30）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!S-pb1-013-N〜015-N | 山札公開がライブ固定・ハート2+未判定 | `pickFilterAlternatives`（メンバー印刷ハート / ライブ必要ハート） |
| PL!S-pb1-020-L | ステージAqoursハート合計条件なしで常時+2 | `minStageSeriesHeartSlotTotal` + `segRaw` ハート色 |
| PL!S-pb1-021-L | 同上 + 相手余剰0成功未判定 | `requiresOpponentSucceededLiveZeroSurplusThisTurn`、`surplusAtSuccess` |

### 虹ヶ咲 pb1 2回監修（2026-06-30）

| 代表ID | 症状 | 横展開 |
|--------|------|--------|
| PL!N-pb1-038-L | PHOENIX: 成功ライブ/ライブ中の必要heart01≥4 未判定で常時+1 | `parseSuccessOrLiveFrameNeedHeartExact` + `checkCardScorePlusPreconditions` |
| PL!N-pb1-001-R | 登場: 「このメンバー以外コスト11」が自己含む/未解析 | `minExactCostMemberOnStage` + `excludeSelfFromStageCostCheck` |
| PL!N-pb1-009-R | ライブ開始: BHなしメンバー live枠→控え未追跡・ドロー/3色ハート未実装 | `requiresNoBhMemberFromLiveFrameToWaitingThisTurn` + `grantHeartSlotMap` |
| PL!N-pb1-039-L | Stellar Stream: need-heart 解析を共通関数へ | 同上（実行時は既存 `hasQualifyingLiveForNeedHeart`） |

### Liella! pb1 2回監修（2026-06-30）

| 代表ID | 症状 | 横展開 |
|--------|------|--------|
| PL!SP-pb1-010-R | E10+「ある場合」未判定で常時コスト+4 | jouji `stage_cost_plus` の `minEnergy`（`あるかぎり`/`ある場合`） |
| PL!SP-pb1-023-L | CatChu 2人未満でスコア+1も封鎖（FAQ Q97 違反） | `live_start_activate_energy_all_active_score` 活性化とスコア判定分離 |

### Liella! bp5 メンバー3回監修（2026-06-30）

| 代表ID | 症状 | 横展開 |
|--------|------|--------|
| PL!SP-bp5-006-P | 起動「山札3ミル→ポジチェン」が `live_start_position_change` 誤分類（ミル未実行） | `kidou_deck_top_wait_position_change` |
| PL!SP-bp5-013-N | 山札公開 OR（SunnyPassion / Liella!+BH）が SunnyPassion のみ | `pickFilterAlternatives` + `requiresHasBladeHeart` |
| PL!SP-bp5-014-N | 登場「ほかのメンバー移動時1ドロー」が無条件 | `requiresOtherStageMemberMovedThisTurn` |
| PL!SP-bp5-017-N | 常時手札-2が Liella!移動条件なし | `requiresSeriesMemberMovedThisTurn` + ステージ常時→手札伝播 |

### 蓮ノ空 bp5 メンバー3回監修（2026-06-30）

| 代表ID | 症状 | 横展開 |
|--------|------|--------|
| PL!HS-bp5-001-P | 起動「手札ライブ公開→名前包含回収」が汎用 `kidou_wait_pick_hand` | `kidou_reveal_live_wait_pick_name_contains`（FAQ Q236/Q237） |
| PL!HS-bp5-013-N | ミル3枚全メンバー判定が `inst.type` 直参照 | `mergedCatalogCard(c).type` |

---

## 28. 虹ヶ咲 bp5 メンバー3回監修（2026-06-30）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!N-bp5-011-P | 2択登場: 異名/異グループライブ3+ 前提・2枚回収 | `abilityChoiceTextPreconditionMet` / `ability_pick_one` 選択肢フィルタ |
| PL!N-bp5-014-N | 起動 E2+手札1捨→控え室ライブ回収で E 未支払い | `kidou_hand_cost_wait_pick_hand` 先頭 `payAbilityCost`（Liella/Aqours 同型 kidou） |

---

## 29. localDual Phase 1 — 相手余剰ハート剥奪（2026-07-02）

| 代表ID | 内容 | 横展開 |
|--------|------|--------|
| PL!S-bp6-024-L | `live_success_opp_lose_surplus_score`: dual 時 `mutateInactiveOpponentBoard` 経由で相手ステージの余剰ハートを剥奪・UI 同期 | `stripOpponentBonusHeartsAndCount` 共通 + `eachOpponentStageColumnMemberInsts` を dual 委譲ヘルパー登録（レジストリ dual_gap 0 件） |

---

## 30. localDual Phase 1 完了 + Phase 2 常時追従（2026-07-02）

| 代表ID / template | 症状 | 横展開 |
|--------|------|--------|
| PL!N-bp3-010-P `live_start_pick_player_waiting_deck_bottom` | 非同期ダイアログ内ミューテーションが盤スワップ解除後に走り**自分の盤**を書き換え | 候補ID読取→ダイアログ→`mutateInactiveOpponentBoard` 内で ID 突合 splice の3段構成へ。`live_start_pick_player_deck_top_peek`（PL!N-bp4-002-P）/ `deck_top_look_reorder` も同型修正 |
| PL!SP-bp2-010-P `passive_track`（ウィーン） | `snapshotBoard()` が `joujiLiveScoreBonus` / `joujiOpponentLiveNeedHeartBump` を保存せず、盤切替で常時効果消失 | `snapshotBoard`/`applyBoard` に jouji フィールド追加。全 passive_track 50件に効く |
| PL!N-bp4-012-P `passive_opp_success_score`（鐘嵐珠） | `opponentSuccessLiveScoreSum` が `readInactiveOpponentBoard` 経由で `applyBoard→sync` 再帰 | `successLiveScoreSumFromSnapshot` でスナップ直読み。`opponentSuccessLiveCount` 同型 |
| opponentBoard.js swap 全般 | `read/mutateInactiveOpponentBoard` 中は `ctx.opponent*` が**自陣を相手扱い** | `swapActiveSnap` 導入: スワップ中 `getInactiveOpponentSnapshot()` がアクティブ側スナップを返す |
| `mutateInactiveOpponentBoard` | 相手盤変更後に常時が未同期のままスナップ保存 | `deps.syncPassiveEffects`（=`syncJoujiPassiveEffectsAll`）をスナップ前に呼ぶフック追加 |
| PL!N-bp5-002-P `mostHeartsOnBothStages` | 「自分と相手のステージの中で」なのに自ステージのみ比較 | `ctx.eachOpponentStageColumnMembers()` も比較対象に |
| PL!S-bp2-001-P `opponentExtraHeartSurplus` | jouji ctx がソロ入力値のみ参照（dual 非対応） | `countOpponentBonusHeartTokens`（dual-aware）へ |
| scripts/audit-verification-list-notes.mjs | 複合ID表記（`001-P/R`・`025–028-PR`・`008-P 他`）を「存在しない」誤検知 | `resolveRepresentativeId` で代表IDへ解決 |

---

## 31. 対戦モード Phase 3 — online read_compare 同期（2026-07-02）

| 対象 / template | 内容 | 横展開 |
|--------|------|--------|
| `VersusPublicBoard` v1→v2（versusBoardSync.js） | 公開ボードに read_compare 用の数値集計9種を追加（`liveFrameScore`・`successLiveCount`・`successLiveScoreSum`・`stageHeartTotal`・`stageWaitCount`・`energyCount` 等）。v1 読み取り互換・fingerprint に集計を追加 | read_compare 88件の online 判定が加点・常時込みで localDual と同式に |
| `opponentLiveScoreEstimate` ほか read ヘルパー | online 分岐が印刷スコア合計のみ／ソロ入力値参照だった | v2 集計優先 → v1 fallback → ソロ入力の3段に統一。jouji ctx の `opponentSuccessLiveScoreSum`・`opponentStageWaitCount`・`opponentStageMemberCount`・`opponentEnergyCount` に online 分岐追加 |
| `bumpLiveScoreEffectBonus` | スコア加点が render を経ず公開ボード未同期 | `scheduleVersusBoardPublicSync()` 明示呼び出し + `getVersusOpponentPublicBoardNow` メモ化 |

設計メモ: [docs/versus-online-read-sync.md](../../docs/versus-online-read-sync.md)。mutate / 相手選択 UI は Phase 4。

---

## 32. 対戦モード Phase 4 — online mutate/choice プロトコル（2026-07-02）

| 対象 / template | 内容 | 横展開 |
|--------|------|--------|
| `runOnTargetPlayerBoard`（online 全面ブロック） | online で相手対象 mutate が `return false` 固定 | `onlineReq`（patchKind 付き）指定時に `runVersusOnlineOpponentMutate` でリクエスト送信。Peer-authoritative: 相手盤は相手クライアントのみが変更 |
| `optional_self_wait_opp_stage`（PL!N-bp3-017-N） | online がテキスト指示+手動完了のみ | `stage_wait_members` パッチ送信 → 対象側自動適用 → ack |
| `toujou_opp_stage_member_match_grant`（PL!N-bp3-011-P） | online がソロ代行ダミー参照（相手実盤を見ない） | 公開ステージ（`bonusHearts` 込み。`publicVersusCardToPickInst` に写像追加）から選択 |
| `live_start_pick_player_waiting_deck_bottom`（PL!N-bp3-010-P） | online がテキスト指示のみ | 発動側が公開控え室から選択（カード文「自分は…置く」）→ `waiting_to_deck_bottom` パッチ |
| `toujou_wait_pick_opp_live`（PL!SP-bp2-011-P） | 「相手が選ぶ」を発動側端末で代行 | `ChoiceRequest`/`ChoiceResponse` で相手クライアントが実選択 → 発動側手札へ |
| versusMatch.js API | — | `requestVersusEffectAction` 等7関数・8 Firestore フィールド（host/guest 対称）。requestId 冪等・120s タイムアウト・boardActionRequest 排他 |

設計書: [docs/versus-online-effect-protocol.md](../../docs/versus-online-effect-protocol.md)。未対応 template は `finishOnlineOpponentDelegatedEffect`（テキスト指示）に fallback。

**実カード盤面フロー検証（2026-07-02）**: 対象4種入りデッキで実 Firestore 2クライアント実プレイ。4件 + タイムアウト（切断→120s cancelled→スキップ続行）すべて合格（protocol.md §9）。付随修正: `opponentDecisionLeadPrefix` / `opponentDecisionDialogTitle` に online 分岐追加（online 中の相手対象ダイアログが「ソロプレイ: 相手として…」と誤表記されていた）。

---

## 33. 対戦モード Phase 5 — 常時 online 追従 + patchKind 横展開（2026-07-02）

**passive_track online 同期（コード）**: 相手公開盤の変化検知（`applyVersusOpponentBoardFromRemote`）時に
`syncJoujiPassiveEffectsAll()` を実行して相手依存の常時を再計算。jouji ctx に online 分岐追加。

| 対応 | 内容 |
|------|------|
| 再計算トリガー | 相手公開盤 fp 変化→自盤常時を再評価（A型48件が追従） |
| `eachOpponentStageColumnMemberInsts` online | 公開ステージ→合成 inst（両ステージ最多ハート/コスト系） |
| `totalMembersBothStages` online | `this.opponentStageMemberCount()`（sibling bare 参照バグも修正） |
| `opponentExtraHeartSurplus` online | v2 新規 `bonusHeartSurplusTotal` を参照 |
| B型 `inactiveOpponentJoujiLiveNeedHeartBump` online | v2 新規 `imposeOpponentLiveNeedHeartDelta`（PL!SP-bp2-010: 相手が課す必要ハート+1 を peer が読む） |

**patchKind 横展開（`applyVersusEffectPatchLocally` 対象側適用）**: Phase 4 の5種に加え11種追加
（`stage_activate_members` / `stage_return_waiting` / `hand_discard_pick` / `hand_to_waiting` /
`waiting_to_hand` / `live_to_waiting` / `energy_to_wait` / `energy_discard` /
`success_live_to_waiting` / `deck_discard_top` / `deck_shuffle`）。registry kind に対応・card_no 分岐なし。

verify-dual-mode-smoke 86件 OK（P5 チェック18件追加）。behavioral skip 0 / findings 0 / dual_gap 0 維持。app 同期済み。
未了: 各 mutate template の発動側 onlineReq 接続（Step 2 横展開）・both_players（Step 3）・実プレイ手動検証（passive 7 / Phase 1 20 / サンプリング）。

設計: [read-sync §6](../../docs/versus-online-read-sync.md) / [effect-protocol §3](../../docs/versus-online-effect-protocol.md)。

---

## 34. 対戦モード Phase 6 — 運用・耐久・リリース準備（コード面 2026-07-03）

実プレイ非依存の部分を実装（ユーザー選択 `code_only`）。フルマッチ・耐久・手動回帰は実プレイ検証保留。

| 対応 | 内容 |
|------|------|
| CI static | `scripts/verify-versus-online-static.mjs` 新規（patchKind 15種 / 関数 / フック / v2 出力 / 代表非skip = 31チェック）。`verify-ability-coverage` から連鎖 |
| フォールバック棚卸し | `docs/versus-online-known-gaps.md` 新規（区分 A 移行済 / B 意図的除外 / C 未接続 dual_ok 6サイト） |
| template 移行（2件） | `optional_pick_member_wait_opp_blade_gap`（`runOnlineOpponentMemberWaitPick`）・`live_start_side_cost_equal_opp_wait` を `stage_wait_members` プロトコルへ（テキスト代行 → 自動適用） |
| UX | ロビー文言を Phase 3–5 実態に更新・待ちバナーに経過秒/残り秒/キャンセル不可・remote-choice 表示時に opp-effect ミラーを閉じる |
| docs | effect-protocol §10 運用/障害時、read-sync §7 push頻度/fingerprint、user-guide 新規、implementation-plan Phase 6 行、play-verification-list B 節、card-fix-progress 対戦行 |

残 fallback: `finishOnlineOpponentDelegatedEffect` 定義1 + 呼び出し6サイト（known-gaps §3）。verify-versus-online-static 31 / smoke 86 / ability-coverage OK。app 同期済み。

---

## 35. 対戦モード Phase 6b — online 検証の自動化（2026-07-03）

「2ブラウザ手動検証が難しい」との判断を受け、プロトコル往復を Node でヘッドレス検証できるようにした。

| 対応 | 内容 |
|------|------|
| 純粋コア抽出 | `applyVersusEffectPatchLocally` の 15 patchKind 盤面変更ロジックを **`js/versusEffectPatch.js`**（DOM 非依存 `applyVersusEffectPatch(board, payload, hooks)`）へ切り出し。simulator.js は hooks 注入の薄いラッパーで委譲（挙動不変） |
| テスト注入口 | `js/cloudAuth.js` に `__setTestCloudFirestore()`（テスト専用・本番非経路）を追加し、実 `versusMatch.js` を in-memory Firestore モックで駆動可能に |
| 統合ハーネス | **`scripts/verify-versus-online-sim.mjs`** 新規。host/guest 2クライアントで 15 patchKind 往復・choice 往復・冪等・排他（処理待ち/`boardActionRequest`）・タイムアウト cancel・v2 集計契約 = 22チェック。`verify-ability-coverage` から連鎖 |
| 静的更新 | verify-versus-online-static / verify-dual-mode-smoke の patchKind チェックを純粋モジュール参照＋機能適用に更新（static 32 / smoke 87） |
| docs | fullmatch-checklist に「自動化された検証」節を追加（真の手動は 実 Firestore 遅延・UI 描画・カード固有配線の 3 点のみに縮小） |

これで手動 2ブラウザは「実 Firestore の遅延/再接続」「UI 描画・ダイアログ」「発動側配線がプロトコルへ繋がるか」の実機確認に限定。verify-versus-online-sim 22 / static 32 / smoke 87 / ability-coverage OK。app 同期済み（simulator.js / cloudAuth.js / versusEffectPatch.js）。

---

## 36. 対戦モード UX 改善 — リロード復帰 / 演出同期 / フェーズ告知 / 手札ドック / 盤面視認性（2026-07-03）

ユーザー要望 4 件を実装。

| 対応 | 内容 |
|------|------|
| リロードで自盤消失を修正 | `teardownVersusModeSession({skipLeaveRoom:true})` が pagehide の直後に `clearPlayResumeStorage()` を呼び、flush 済みの自盤スナップショットを削除していた（根因）。skip 分岐では resume を消さないよう変更（`js/versusMode.js`）。再入場が新規開幕デッキで始まる問題を解消 |
| 演出の相手同期 | 一過性演出チャネル `{role}PlayFxEvent` を追加（`js/versusMatch.js` `pushVersusPlayFxEvent`）。登場（`triggerPlayFxOnBoardDrop`）・効果使用（`runPlayFxBeforeAction`）で emit、`applyRemoteVersusMatch` で id 差分検出し `flashVersusOpponentPlayFx`（`js/versusBoardSync.js`）で相手盤面の該当カードにパルス＋チップ。初回同期の過去イベントは再生しない |
| フェーズ告知 | `applyRemoteVersusMatch` で prev/cur を比較し `maybeShowVersusPhaseAnnounce`。優先権/フェーズ/liveStep/turn 変化を viewer 相対文言（あなたのターン / 相手のメインフェイズ / ライブターン / 相手のライブ開始 等）で両画面に大きく表示。軽量モードはトースト代替 |
| 手札を中央下に固定 | ツールバー「手札を下に固定」トグル（`#btn-hand-dock`）。`STORAGE_HAND_DOCK_BOTTOM` に永続、`body.play-hand-docked-bottom` で `#hand-stick-fold` を `position:fixed` 中央下ドック。ソロ・対戦・全レイアウト共通 |
| 相手盤面の視認性 | ゾーンを枠線で明確化、見出し強調、成功ライブ（勝利条件 1.2.1）をアクセント枠で強調、ステージ見出しを強調（CSS のみ・DOM 非改変の第1弾） |

verify-ability-coverage OK / versus-online-sim 22 / static 32 / smoke 87。app 同期済み（simulator.js / versusMatch.js / versusBoardSync.js / versusMode.js / config.js / index.html / styles.css）。

### 追補（同日・微調整 4 件）

| 対応 | 内容 |
|------|------|
| フェーズ告知フェードアウト | `showVersusPhaseAnnounce` を 2.5 秒表示 → CSS `opacity` トランジション（0.55s）でフェードアウト → 非表示に変更（`versus-phase-announce-overlay--out`）。旧: 2.4 秒で即消し。**追修正**: overlay の `display:flex` が `[hidden]` を上書きして実際は隠れず、非表示時に `--out` を外すと opacity 0→1 逆再生で即再表示していた → `.versus-phase-announce-overlay[hidden]{display:none!important}` を追加し、非表示時は `--out` を保持（次回表示の冒頭で除去） |
| 残りエール数を対戦に表示 | 当初チェイン帯にチップ表示 → **要望によりソロと同じ場所に変更**。full versus UI で `.zone-block-deck-live-sim-under-preview` を表示したまま `deck-live-sim--versus-yell-only` を付与し、確率計算・操作系（見出し/undo redo/モード/blade-note/block）を CSS 非表示にして「残りエール数」行だけ残す。`#deck-flip-k-display` を `max(0, ブレード計 − 解決済み)` で更新 |
| 下部固定手札のはみ出し修正 | `#hand-stick-fold` に `box-sizing:border-box` + `width:min(100%,1040px)` + `max-width:calc(100vw-12px)` + `overflow-x:hidden`。内側 body/hand-row を border-box・`width:100%`・`overflow-x:hidden`、`#zone-hand`・ヘッダー行・アクション群を `flex-wrap:wrap` |
| 下部固定時の「次のターンへ」＋背景透過 | `#btn-hand-dock-turn`（`#btn-turn-start` に委譲）を `body.play-hand-docked-bottom` の時だけ表示。ドック背景を薄く（alpha 0.72/0.97 → 0.2/0.52、blur 12→5px） |
| 登場/効果使用演出の相手ミラーが出ない不具合 | `maybeFlashOpponentPlayFxFromRemote` の初回スキップ判定が「初めて見た fx イベント」を stale 扱いしていたため、マウント時に fx イベントが無い通常ケースで相手の“最初の”登場演出が握り潰されていた。初回同期時に現在値をベースライン化する方式（`versusOppPlayFxBaselineDone`）に変更し、マウント時に `applyVersusPlayModeDefaults` で再初期化 |

---

## 37. 2人バトンタッチ / ドラッグでのエリア移動自動効果（2026-07-25）

ユーザー報告 3 件（自動効果が唐突に始まる / 2人バトンが効かない / ドラッグ移動で自動が出ない）。

| 対応 | 内容 |
|------|------|
| 自動効果の演出時間 | `playFxDurationMs` の `jidou` を `PLAY_FX_FIELD_MS`(700ms) → 新設 `PLAY_FX_JIDOU_MS`(1100ms)。ボタン操作を挟まない自動効果を認識できるようにする（`js/playFx.js`） |
| PL!SP-bp4-004（平安名すみれ 4種） | 登場時解決中に2人バトンを選び直した場合、`_soloBatonMemberIds` を設定するだけでステージから退場させていなかった（根因）。新ヘルパー `applySoloBatonIdsToWaitingRoom(inst)` を追加し、選択メンバーを控え室へ送ってから `runToujouLiellaDoubleBatonCenter` を実行。`countLiellaBatonSourcesOnInst` も控え室を明示的に探索し、メンバー種別＋『Liella!』で判定するよう修正。**再発修正(2026-07-25)**: 手札DnD→センター時 `applyBoard(structuredClone)` 後の古い手札参照へバトンIDを付けていたためサイドが控え室に行かない → `state.hand` 再解決＋`opts.soloBatonMemberIds` |
| PL!SP-pb2-000（DUO 2種） | `toujou_baton_discarded_series_per_card` がブレードを**控え室のバトン元メンバー**に付与していた（根因）。カード文は「BHを持たない『Liella!』1枚につき（登場した）このカードがブレード2を得る」→ 対象を `inst` に変更し、該当枚数×2 をまとめて付与 |
| 重複関数の整理 | 同一スコープに `removeStageMemberToWaiting` が2定義（`~6128` / `~31854`）。後者を削除し、`placeHandMemberOnStageSideCore` の2人バトン経路も新ヘルパー経由に統一。監査/検証5スクリプトが後者を `executeAbilityBody` の終端マーカーに使っていたため、マーカーを `kidouRecoverCandidatesFromWaiting` に更新 |
| PL!SP-pb2-011 / PL!SP-pb1-006 ほか | Sortable のステージ D&D（`onEnd`）が列移動で自動効果を一切発火していなかった（根因）。`fireJidouAfterStageAreaMovesFromSnap(snap)` を追加し、ドロップ前スナップとの列差分から `area_move` / `center_member_area_move` / `member_to_center` を発火（`markMemberMovedThisTurn` 含む）。対象は `area_move` 25枚 + `center_member_area_move` 2枚 + `member_to_center` 2枚 |
| ポジションチェンジの押し出され側 | `swapStageMemberPositionChange` が入れ替え相手（`toMem`）の移動で自動効果を発火していなかった。`toMem` にも `area_move`＋センター出入りの発火を追加（PL!SP-pb2-011 がセンターから押し出される場合に未発火だった） |

verify-ability-coverage OK / verify-ability-handlers OK / verify-ability-runtime OK / verify-deck-pick-hand-patterns OK。app 同期済み（simulator.js / playFx.js）。

---

## 38. 条件未評価の常時／ライブ開始時ゲート（2026-07-25）

ユーザー報告 3 件。いずれも「条件文は分類されているが実行時に評価されず、常に効果が乗る」型。

| 代表ID | 名前 | 問題 | 修正 | 横展開 |
|--------|------|------|------|--------|
| PL!SP-bp5-026-L | Let's be ONE | `『Liella!』のメンバーが持つハートの総数が11以上` を `parseConditionalPrefixFilters` が解析せず、`live_card_score_plus` が無条件に +1 | 新フィルタ `minStageSeriesHeartTotal` / `minStageSeriesHeartTotalTag`（色不問のハート総数）を追加し、`checkAbilityBoardPickFilters` にヘルパー `sumStageSeriesHeldHeartTotal(seriesTag)` で判定を追加 | 同型テキスト 1 枚（本カードのみ）。フィルタは全 `live_start` / `live_success` / `toujyou` 系の前提チェック経路で共通に効く |
| PL!SP-bp5-012-N | 澁谷かのん | jouji `blade_if_liella_live_need_sum` が `conditionMet` で評価されず heart03 が常時付与 | 分類器を Liella!/8 ハードコードから正規表現 `ライブカード置き場に必要ハートの合計がN以上の『…』` へ一般化し kind を `blade_if_live_need_sum` に改称（旧 kind もエイリアス受理）。ctx に `liveAreaHasSeriesLiveMinNeedHeart(tag, min)` を追加して判定 | 同型テキスト 1 枚。正規表現化により今後の同型カードは分類器のみで対応可 |
| PL!N-pb1-007-R | 優木せつ菜 | jouji `blade_if_live_need_all_colors` も同様に未評価で ALL ハートが常時付与 | ctx に `liveAreaNeedHeartCoversAllColors()` を追加（FAQ Q205 に従いライブ中の複数枚を合算）し `conditionMet` で判定 | `PL!N-pb1-007-P＋` を含む 2 枚 |
| PL!-pb1-018-R | 矢澤にこ | 相手側の蘇生処理まで対話で進めていた（ユーザー要望により削除） | `toujou_both_wait_to_empty_stage` を自分側 1 パスのみに変更。空きエリア判定・このターンの登場ブロックは自分側で維持 | template 変更のため `PL!-pb1-018-P＋` も同時に反映（card_no 分岐なし） |

検証: `verify-ability-coverage`（全 verify/audit 連鎖）OK、`verify-ability-handlers` OK、`verify-ability-runtime` OK、`verify-deck-pick-hand-patterns` OK、`build-ability-index` guided_manual/jidou_manual = 0。`audit-opponent-board-effects` 再生成済み。app 同期済み（abilityEffects.js / simulator.js / joujiEffects.js）。

---

## 39. 効果による「メンバーのいないエリアに登場」と下に置いたカードの扱い（2026-07-27）

ユーザー報告 2 枚。根因は 3 系統。

| 代表ID | 名前 | 問題 | 修正 | 横展開 |
|--------|------|------|------|--------|
| PL!-bp6-003-P | 南ことり | ライブ成功時に「このメンバーの下」から空きエリアへ登場させると、`finalizeWaitingMemberStageEntry` が新規ステージメンバーとみなして登場コスト分の側面エネをウェイトにしていた。向きも未設定でウェイト表示のまま。下候補が複数でも先頭固定 | 共通ヘルパー `placeEffectMemberOnEmptyStageColumn(memberInst, col, {waitState, blockEntry, fromWaiting})` を新設。`_appearEnergyOverride = 0`（効果登場は E を支払わない／総合ルール 5.9.1 は能力コスト側）、カード文に「ウェイト状態で登場」がなければアクティブ、下候補が 2 枚以上なら選択ダイアログを先に開く | `PL!-bp6-003-R＋/P＋/SEC` を含む 4 枚。ヘルパーは効果登場の全経路（`placeWaitingMemberToStage(Column)` 経由の各 template、`deck_top_pick_enter_or_hand`、控え室合計コスト登場）にも適用し、効果登場での誤エネ消費を一掃 |
| PL!-bp6-003-P | 南ことり | 「下に置いたカード」が列配列でホストより前に挿入されるため、`stageColumnIncumbentMember` が**下のカード**を面メンバーとして返し、バトンタッチ相手・所持ハート集計に混入していた | 列の末尾側から探す `stageColumnTopMember(col)` を新設し、`stageColumnIncumbentMember` / `boardHeldHeartSlotAccum` / `stageHeldHeartSlotAccum` を一番上のメンバーのみに限定（FAQ Q247 のハート二重取り防止と同趣旨） | 下置きを行う全カード（`live_start_hand_reveal_under_heart_grant`、`runJidouWaitUnderFromWaiting` 経由）に共通で効く |
| PL!HS-bp5-022-L | Retrofuture | ①`parseAbilityPickFilters` が「ステージにコスト9以上の『EdelNote』のメンバーがいる」の 9 を発動条件 `minCostMemberOnStage` と選択対象 `minCost` の両方に入れていた ②選択肢の控え室登場が常にウェイト＋当ターン登場不可を強制（カード文に記載なし） | ①ステージ存在節の検出を汎用 minCost パーサより前に移し、その節を除いた文から `コストN以上` を拾う。あわせて『…』から `minCostMemberOnStageSeriesTag` を設定 ②`executeAbilityChoiceText` の控え室登場分岐を `effectEntryTextRules(text)`（「ウェイト状態で登場」「このターン…登場できない」の有無）でテキスト駆動化 | ①minCost 汚染は 12 枚（`PL!S-bp3-024-L` / `PL!HS-pb1-010-R,P＋` / `PL!-bp3-009` 4種 / `PL!S-PR-029〜031` / `PL!SP-sd2-008-SD2`）。`verify-aqours-bp3` / `verify-hasunosora-bp5` の期待値も汚染前提から修正 ②`kidou_waiting_to_empty_stage` も同じテキスト駆動に統一。`PL!HS-bp5-002`（4種）・`PL!HS-bp6-016-R` はウェイト記載なしのためアクティブ登場へ、`PL!S-sd1-006-SD` はウェイトなし＋当ターン登場不可のみ |

検証: `verify-ability-coverage`（全 verify/audit 連鎖）OK、`verify-ability-handlers` OK、`verify-ability-runtime` OK、`verify-deck-pick-hand-patterns` OK、`verify-play-checklist` 37/37、`verify-p2-ability-smoke` OK、`verify-dual-mode-smoke` OK、`build-ability-index` jidou_manual = 0。app 同期済み（abilityEffects.js / simulator.js）。

---

## 40. コスト／効果の取り違えと二重適用 4 件（2026-07-29）

ユーザー報告 4 枚。根因は「コスト部と効果本文の取り違え」「常時セグメント再生成による二重適用」「効果側ドローの全払い要求」の 3 系統。

| 代表ID | 名前 | 問題 | 修正 | 横展開 |
|--------|------|------|------|--------|
| PL!S-bp3-006-SEC | 津島善子 | 起動コストの「このメンバーをウェイトにする」は `payAbilityCost` が既に処理しているのに、`kidou_self_wait_stage_member_swap_recover` ハンドラが追加で `moveStageMemberInstToWaiting(inst)` を呼び、自分が**控え室**へ落ちていた（ウェイト≠控え室／総合ルール 5.9.1・9.4） | ハンドラから自分の控え室送りを削除。エリア判定を center 固定から共通 `abilityInstMatchesStageArea(col, cl)` に変更し、対象候補をカード文どおり「このメンバー以外の『Aqours』のメンバー」に限定して提示。控え室回収の候補から自分を除外 | 同型テキスト・同テンプレート 6 枚（`PL!S-bp3-006-R＋/P/P＋/SEC` 4 枚 + `PL!S-bp6-003-R/P` 2 枚） |
| PL!S-bp6-003-R | 松浦果南 | 同テンプレートの分類器が `costSelfWait: true` を**カード文と無関係に固定**していたため、EE＋手札1枚が支払いコストの果南にも「自分をウェイト」が要求されていた（センター限定も不要） | 分類器の当該分岐から `costSelfWait` / `handDiscardToWaiting` のハードコードを削除し、コスト部の解析結果（base）をそのまま使うよう変更。センター条件は既存の `{{center}}` アイコン解析（`stageArea`）に一本化 | 上記 6 枚が同分岐を共有。`verify-aqours-bp6` に「自ウェイトなし・EE2・エリア制限なし」の回帰を追加 |
| PL!S-bp6-011-N | 桜内梨子 | 「カードを2枚引き、手札を1枚控え室に置く」の後半を分類器が `handDiscardToWaiting`（=コスト）に入れていたため、コスト支払いで1枚捨て→2枚ドロー→本文でもう1枚捨て、と**捨てが二重**になっていた | `toujou_draw_discard_if_from_waiting` を `effectDiscardCount` に変更（`handDiscardToWaiting` は null 固定）。ハンドラは共通の `scheduleHandDiscardAfterAbilityDraw` に統一。`draw_then_hand_discard` 等と同じ null 化リストにも追加。あわせて「控え室から登場している場合」をコスト支払い前の共通ゲートに昇格（`requiresEnteredFromWaiting`） | 当該テンプレートは本カードのみ。共通ゲート化は `requiresEnteredFromWaiting` を持つ全テンプレートに効く。`verify-aqours-bp6` の期待値も更新 |
| PL!N-bp4-029-L | Rise Up High! | `extractInlineLiveEndGrantJouji` が「ライブ終了時まで、…{{icon_blade}}を得る」から常時セグメントを**作り直す**ため、`addLiveSessionBladeBonus`（`cl.bladeGain`）と合わせてブレードが 2 個付いていた | `extractStageMemberGrantJouji`（3827 行）と同じハート／ブレードアイコンのガードを追加。アイコン付与は `cl.bladeGain` / `requiredHeartSlot` / `grantHeartSlotCount` 側で適用されるため、常時セグメント化しない | 同型の二重適用は 16 セグメント／10 枚: `PL!SP-bp4-024-L/-SRL/-SECL`（ブレード2→4）、`PL!SP-bp4-023-L/-SRL`（Dazzling Game）、`PL!N-pb1-039-L`（Stellar Stream heart06 4→8）、`PL!S-bp5-013-N`、`PL!S-bp5-017-N`、`PL!S-bp6-010-N`。inline を唯一の付与元にしている template（`jidou_hand_to_waiting_grant` 等）は該当カードなしを全数走査で確認 |
| PL!SP-bp4-004-P | 平安名すみれ | `runToujouLiellaDoubleBatonCenter` が `state.deck.length < drawN` でドローも控え室登場も両方中止していた（総合ルール 1.3.2「可能な限り実行する」違反） | 中止をやめ `Math.min(drawN, state.deck.length)` の部分ドローにし、控え室からの登場処理へそのまま進む。山札不足はトーストで告知 | 共通ハンドラ経由で `PL!SP-bp4-004-R＋/P/P＋/SEC` 4 枚。コスト側のデッキミル（全額支払い必須）は従来どおり厳格のまま |

検証: `verify-ability-coverage`（全 verify/audit 連鎖）OK、`verify-ability-handlers` OK、`verify-ability-runtime` OK、`verify-deck-pick-hand-patterns` OK、`build-ability-index` guided_manual/jidou_manual 増減なし。`verify-aqours-bp3` 22 / `verify-aqours-bp6` 20 / `verify-niji-bp4` 39 / `verify-liella-bp4` 33 / `verify-niji-pb1` 46 / `verify-muse-bp5` 26 / `verify-aqours-bp5` 29 OK。`audit-opponent-board-effects` 再生成済み。app 同期済み（abilityEffects.js / simulator.js）。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-08-10 | W無色特殊BH（`b_heart07`）: エール時に無色ハート×2。`special_heart.colorless`＋カード詳細「特殊BH」行（ドロー／スコア／W無色）。代表 PL!N-bp7-030-L / PL!SP-bp7-028-L / PL!S-bp7-022-L（SECL含む4枚）。`b_all` とは分離 |
| 2026-08-10 | 虹ヶ咲 sd2 cheer ライブ: `bladeGainFromIcons` が条件節の blade アイコンを付与数に誤算していたのを付与節のみに修正（代表 026・2枚）。あわせて「ブレードN以上持つ『シリーズ』のメンバー1人は」→`grantToStageSeriesTag`+`minPickedMemberBlade`、シリーズ1人付与の選択プール再構築 |
| 2026-08-10 | 虹ヶ咲 sd2 cheer メンバー: ①`hand_cost_reduce`+`requiresSuccessLiveSeriesTag`（003）②`そのハートをNつ得る`→`grantHeartSlotCount`（005・横展開既存カードは1のまま）③任意ウェイト付与で「そのメンバーは」なしは自分へ（006）④`draw_then_conditional_extra_draw` + `opponentLiveSuccessThisTurn`（007・2枚） |
| 2026-08-10 | LL-bp7 クロス初回監修: `LL-bp7-001-R＋`（花丸&せつ菜&千砂都）。`play_cost_set_named_hand_discard`＋登場ライブ回収＋成功メンバー回収。カード文どおりで新規コード修正なし。PENDING `/-bp7-/` 除外を解除 |
| 2026-08-10 | Liella! bp7 ライブ: ①`minEnergyAdvantageOverOpponent`（024・2枚、相手よりN枚以上多い）②`live_start_optional_waiting_shuffle_deck_bottom_grant`（028・9枚 exact シャッフルデッキ下→全メンバーブレード）③`requiresYellRevealedAllSeriesTag`（028成功・エール公開すべてシリーズ） |
| 2026-08-10 | Liella! bp7 メンバー初回監修: ①`stage_cost_plus` minEnergy+opponentMoreEnergy（002・2枚）②`blade_per_member_under` + `minMemberCardsUnder`（003・4枚）③`kidou_hand_reveal_to_under` costsAnyOf 10\|20→draw（003）④`waiting_to_deck_bottom_blade_if_moved_no_bh`（004・2枚）⑤grant live_success に `requiresEnergyReturnedToDeckThisTurn`+center 実判定（006）⑥`energyToDeckCount`+`pickAny`（010）⑦`costHandDiscardAll`（011）⑧`costHandDiscardPickType` ライブ＋effect pickType分離（018・横展開 PL!S-bp3-003 / PL!N-bp4-011）⑨ステージ人数タグと回収seriesTag分離（019）⑩jouji `minStageSeriesMembers`（013） |
| 2026-08-10 | 虹ヶ咲 bp7 ライブ+メンバー019–024: ①`deck_mill_conditional_grant` top+`millRequireDistinctBladeHeartColors`（020）②`minYellRevealedHeartColorKinds`（025・2枚）③`live_start_hand_discard_optional_blade_pick_equal`（026・2枚）④`minYellRevealedNoBladeHeartMembers`（026・横展開で bp5-004 jidou も件数化）⑤`requiresStrictlyMostBladesBothStages`（027）⑥`live_start_optional_shuffle_all_waiting_grant`（028）⑦`live_success_under_energy_to_area_score`（029） |
| 2026-08-10 | 虹ヶ咲 bp7 メンバー初回監修: ①`kidou_mill_waiting_under_copy_printed_hearts` + `_printedHeartsCopyMapUntilLiveEnd`（PL!N-bp7-003・4枚）②`bladePerDistinctNameUnder`（同LS）③`deck_mill_conditional_pick_one`（006・4枚）④jouji `heart_per_energy_below` / `heart_per_energy_above`（007・4枚）＋横展開 `blade_per_success_live_above_opponent`（PL!S-bp6-009・4枚）⑤`waiting_to_deck_bottom_activate_per`（008・2枚）⑥`millBothPlayers` on `deck_top_to_waiting`（009・2枚）⑦「N人いる」ステージ人数（005/013 + Liella bp7 013/015）⑧任意ウェイト→`heart_color_pick_grant`（012・2枚）⑨`requiresNoBladeHeart` on deck_top_pick（018） |
| 2026-08-10 | Aqours bp7 ライブ3件: ①`boardHasYellFromDeckBottomJouji` が `liveArea` オブジェクトを forEach して常時エール下向き判定が壊れていた → `eachLiveFrameLiveCardInsts()`（PL!S-bp7-022-L/SECL・横展開2枚の jouji 連動）②PL!S-bp7-020-L seg1 `requiresAllStageMembersActive` + seg2 新テンプレ `deck_mill_conditional_need_heart_reduce`（デッキ下ミル→Aqoursメンバーで必要ハート減、2枚）③PL!S-bp7-025-L 選択肢「2人までウェイト＋次ターン非アクティブ」: `executeAbilityChoiceText` が1人固定＋`_skipAutoActivateUntilTurn` 未設定 → `maxWaitN` 解析・multi-pick・skip 付与（登場同型の2人までは既存 template 経由で別） |
| 2026-08-10 | 残常時 jouji 4 系統（unclassified 0）: ①`opp_across_lose_blade`（正面コストN以下がブレード失う、代表 PL!S-bp7-009・横展開 2）②`yell_from_deck_bottom`（エールをデッキ下から、代表 PL!S-bp7-022・横展開 2）③`play_cost_reduce_shuffle_waiting_members`（控え室全メンバー→デッキ下でコスト減、代表 PL!N-bp7-011・横展開 4）④`play_cost_set_named_hand_discard`（指名手札各1捨てでコスト固定、代表 LL-bp7-001・横展開 1）。あわせて `live_card_score_plus` に `requiresYellRevealedSeriesHeartSlots`（PL!S-bp7-022 の heart02/04/05×Aqours）。`listNativeJoujiSegmentRaws` の誤結合も修正 |
| 2026-08-10 | Aqours bp7 メンバー Part2（004/007/008/001/012/003）: ①`toujou_baton_both_keep_hand_shuffle_deck_bottom_draw` 新設（PL!S-bp7-004-R/P のみ・2枚）— `requiresBatonFromSeriesTag` + `openHandKeepInHandDialog` `discardTo:deck_bottom_shuffle` + `runOpponentHandKeepShuffleDeckBottomDraw` ②`deck_top_look_reorder` + `deckLookRemainTo:bottom`（008 登場・1クラスタ2枚）③`toujou_wait_pick_hand` + `optionalEnterRecoveredNames`（007 登場・4枚）④`waiting_to_deck_bottom_blade_per`（007 LS・4枚）⑤`abilityComposition.applyGrantIfRecoveredNames` → `grantIfRecoveredNames` + `state._lastWaitPickHandRecoveredInst`（001・2枚）⑥`toujou_optional_all_members_relocate` + `requiresStageOnlySeriesAny` + SaintSnow FC 移動時 blade（012-N）⑦`ability_pick_one` 003: `_joujiImmuneOppWaitMaxPrintedBlade` + 自身 PC 至 Aqours/SaintSnow エリア | `base.costEnergyToDeck` / `costEnergyToDeckCount` を `_classifyCardAbilityCore` のコスト解析（`：`より前）に追加したため `withTrigger` 経由で**全テンプレートが自動的に対応**。E支払い（総合ルール 5.9.1 のウェイト化）とは別コストで、共通コスト支払いダイアログに専用ピック（`appendCostPayEnergyToDeckGrid`、ウェイト状態も選択可）を追加。**既存の PL!SP-bp7-022 / 026-L / 007 / 027-L はテンプレートには載っていたがコストを無視して効果だけ実行していた**。`moveEnergyAreaCardsToEnergyDeck` に集約し `state._turnEnergyReturnedToDeck`（ターン開始でリセット）と `energy_returned_to_deck` 自動効果イベントを発火。`kidou_energy_deck_pick_live`（PL!SP-bp5-111）の inline pop も同ヘルパーへ寄せた。あわせて ①`toujou_wait_pick_hand` の回収判定が「控え室**から**」表記のみで「控え室に**ある**」を取りこぼしていた（PL!SP-bp7-006）②`live_card_score_plus` に `requiresMoreEnergyThanOpponent`（PL!SP-bp7-027-L）③ライブ成功時「このターン置き場→エネルギーデッキが発生していた場合、合計スコア+1」= `requiresEnergyReturnedToDeckThisTurn`（PL!SP-bp7-006） |
| 2026-08-10 | `jidou_move_or_energy_draw_grant` の3系統バグ + bp7 横展開（5 セグメント自動化）: ①`eventKind: "area_move_or_energy"` はどこからも発火されておらず **PL!SP-bp5-004（R＋/P/P＋/SEC）の自動効果が一度も動いていなかった** → `eventKind: "energy_placed"` + `altEventKind: "area_move"` に分割 ②ハンドラが常時「ライブの合計スコアを＋１する」を**ハードコード**しており、カード文の heart02 付与を無視していた → `applyJidouPlainLiveEndHeartBladeGrant` を先に通しカード文どおりに付与（指定が無い形のみスコア+1へフォールバック）③分類がドロー必須だったためドローの無い同型（PL!SP-bp7-005 能力2 / PL!SP-bp7-016）が `jidou_manual` に落ちていた → `自分のエネルギー置き場にエネルギーが置かれたとき` を主条件にし `deckDrawCount` 既定を 0 に。エネルギーフェイズの配置は `addEnergyFromDeckToArea` を通らないため、`energy_placed` は元々「カードの効果による配置」のみで発火する |
| 2026-08-10 | 「そのエネルギーは次のターンのアクティブフェイズにアクティブしない」を実装（新テンプレなし・8 セグメント自動化）: `markEnergySkipNextActivatePhase` でエネルギー inst に `_skipActivatePhaseUntilTurn` を持たせ、ターン開始のアクティブフェイズが該当ターンだけ縦戻しを飛ばす（FAQ Q280: 途中でアクティブ→再ウェイトになっても対象ターンは飛ばす）。`addEnergyFromDeckToArea(n, rotated, {skipNextActivatePhase})` + 分類側 `energySkipNextActivate` を `energy_deck_to_wait` 全 3 箇所へ。**既存の PL!SP-bp7-017 は `energy_deck_to_wait` に載っていたが当該節を黙って無視していた**。あわせてライブ成功時に `energy_deck_to_wait` / `activate_energy`（`requiresMoreEnergyThanOpponent` + `soloEnergyMoreThanOpponent`）分岐を fallback 直前に追加（PL!SP-bp7-007 / PL!SP-bp7-027-L）。`live_success_surplus_heart_energy_wait`（PL!N-bp3-027-L）を奪わない配置順に修正済み |
| 2026-08-10 | bp7 第5バッチ続き: ⑩`pick_stage_member_to_center`（PL!S-bp7-018）⑪`live_start_optional_wait_members_score_per`（PL!N-sd2-027）⑫`live_return_hand_then_discard`（PL!N-bp7-030）⑬`deck_bottom_optional_mill_named_hand`（PL!S-bp7-008）⑭`deck_top_look_reorder` を下から見る形へ拡張（PL!S-bp7-004）⑮`waiting_member_under_stage`（PL!S-bp7-005 登場）⑯`kidou_self_and_other_resolve_toujou`（同起動）⑰`live_start_deck_bottom_mill_member_tier`（PL!S-bp7-021）⑱`live_start_optional_energy_to_deck_opp_adv_score`（PL!S-bp7-023）⑲共通コスト `costEnergyUnderSelf` + `kidou_energy_under_opp_wait_by_under` / `kidou_energy_under_waiting_enter`（PL!N-bp7-004 / 010）⑳`jidou_self_deck_to_waiting_discard_recover`（PL!N-bp7-011）㉑`jidou_ability_mill_pick_live_score` + `fireJidouAfterDeckMilledByAbility`（PL!N-bp7-031）㉒`jidou_leave_baton_self_under_partner`（PL!SP-bp7-001）㉓`grant_jouji_session` + `minLiveAreaScoreSum`（PL!-PR-020）㉔常時 `blade_grant_series_with_member_under` / `blade_while_under_series_host`（PL!S-bp7-005 / PL!SP-bp7-001）。index 上 `guided_manual=0` / `jidou_manual=0` |
| 2026-08-10 | bp7 第5バッチ（共通テンプレ新設・横断）: ①`energy_deck_under_member`（エネルギーデッキ→メンバー下、置き場経由なし）+ `placeEnergyFromDeckUnderStageMember` / `energy_placed_under_member` 自動イベント（代表 PL!N-bp7-007 / 017）②`jidou_energy_under_placed_energy_wait`（PL!N-bp7-001）③`jidou_own_member_wait_discard_activate`（ウェイト時手札捨て→アクティブ±付与、PL!N-bp7-022 / PL!N-sd2-010）④`jidou_leave_stage_recover_no_cost`（PL!N-bp7-014）⑤`jidou_leave_baton_partner_energy_under`（PL!N-bp7-019）⑥`deck_peek_relocate`（1枚覗き→別位置、PL!S-bp7-003 / 010）⑦`waiting_pick_to_deck`（控え室→デッキ上/下、3タグ同時含む、PL!S-bp7-019 / PL!N-bp7-011 LS / PL!SP-bp7-012；既存 `waiting_reorder_deck_top` より後に配置）⑧`jidou_self_wait_area_move_activate`（PL!SP-bp7-008）⑨`jidou_enter_or_energy_returned_energy_wait` + skipNextActivate（PL!SP-bp7-005 能力1） |
| 2026-08-10 | bp7 / 虹ヶ咲 sd2 の分類漏れ 5 系統を既存ハンドラへ横展開（新テンプレなし・8 セグメント自動化）: ①登場でハートのみ付与する形が `grant_jouji_session` に載らず `liveScoreGrant` も誤って 1 になっていた（PL!N-sd2-019 heart05 / PL!N-bp7-024 heart01）②`live_start_pick_stage_member_printed_hearts_remap` が heart01 と「ハートをすべて」表記に固定（PL!S-bp7-024-L heart04「ハートがすべて…になる」）③ライブ開始時に相手ステージのウェイト分岐がなく登場時と非対称（`buildOppWaitStageMeta` 汎用分岐を追加、PL!N-sd2-013 / PL!SP-bp7-009）④「自分のステージにいる『X』のメンバー1人をアクティブ」が `activate_stage_members_up_to` に載らず E コストも落ちていた（PL!N-sd2-025 / PL!N-sd2-017）⑤`live_start_pick_player_waiting_deck_bottom` が「デッキの一番下」表記とライブ開始時トリガーに固定（PL!S-bp7-013 登場・「デッキの下」）／ライブ成功時の必発ミル `deck_top_to_waiting`（PL!N-bp7-031-L） |
| 2026-07-29 | コスト／効果の取り違えと二重適用4件: ①`kidou_self_wait_stage_member_swap_recover` の自分控え室送りを削除＋コストフラグのハードコードをカード文駆動に（PL!S-bp3-006 善子 / PL!S-bp6-003 果南、計6枚）②`toujou_draw_discard_if_from_waiting` の手札捨てを `effectDiscardCount` へ移し二重捨てを解消（PL!S-bp6-011 梨子）。`requiresEnteredFromWaiting` をコスト前の共通ゲートに ③`extractInlineLiveEndGrantJouji` にハート／ブレードアイコンのガードを追加し常時セグメント再生成による二重付与を解消（PL!N-bp4-029-L ほか10枚）④`runToujouLiellaDoubleBatonCenter` の山札不足時中止を部分ドローに（総合ルール1.3.2、PL!SP-bp4-004 4枚） |
| 2026-07-27 | 効果登場まわり3系統: ①効果による空きエリア登場で登場コストEを消費していた問題を共通ヘルパー `placeEffectMemberOnEmptyStageColumn`＋`_appearEnergyOverride=0` で解消（ウェイト／当ターン登場不可はカード文駆動）②`stageColumnTopMember` 新設で「下に置いたカード」を面メンバー・所持ハートから除外（PL!-bp6-003 南ことり）③`parseAbilityPickFilters` のステージ存在節→選択対象 minCost 汚染を除去し `minCostMemberOnStageSeriesTag` を追加（PL!HS-bp5-022-L Retrofuture ほか12枚） |
| 2026-07-25 | PL!SP-bp4-004 手札DnD→2人バトン: `applyBoard(structuredClone)` 後に古い手札インスタンスへ `_soloBatonMemberIds` を付けていたためサイド退場がスキップ。`state.hand` 再解決＋`opts.soloBatonMemberIds` で core に渡す。DUO 等 `cardAllowsTwoMemberBaton` 全体に効く |
| 2026-07-25 | 条件未評価ゲート3件+要望1件: ①PL!SP-bp5-026-L `minStageSeriesHeartTotal`（『Liella!』ハート総数11以上）新設 ②PL!SP-bp5-012-N jouji `blade_if_live_need_sum` へ一般化＋`liveAreaHasSeriesLiveMinNeedHeart` で実判定 ③PL!N-pb1-007-R `blade_if_live_need_all_colors` を `liveAreaNeedHeartCoversAllColors`（FAQ Q205 合算）で実判定 ④PL!-pb1-018-R/P＋ 相手側の蘇生処理を削除し自分side のみに |
| 2026-07-25 | 仕様: ライブ成功判定ロックを UI/成功時効果に徹底（8.3.15/8.4.4）。成功時効果でエール回収しても失敗表示に戻さない。代表 PL!SP-bp4-006-P / PL!N-bp1-026-L / PL!SP-bp2-025-SRL。`overlayLockedLiveVerdictOnBundle` + live_success 解決前 `ensureLiveVerdictSnapshotLocked`。yell_resolution_* 全体に適用 |
| 2026-07-25 | 複数 live_start/live_success → ability_sequence: 外側 filters の AND 化で後段が死ぬ問題を修正（代表: PL!SP-bp4-024-L ノンフィクション!!）。段ごと前提スキップ＋collectPending は any-step OK。横展開13枚 |
| 2026-07-25 | 2人バトン＋D&D自動効果: ①jidou 演出 1100ms ②PL!SP-bp4-004 効果内バトン選択が控え室に行かない（`applySoloBatonIdsToWaitingRoom` 追加）③PL!SP-pb2-000 ブレード付与先を登場カードへ ④ステージD&D列移動で `area_move`/`center_member_area_move`/`member_to_center` 未発火（29枚に影響）⑤`removeStageMemberToWaiting` 重複定義削除＋検証スクリプトのマーカー更新 |
| 2026-07-15 | 自動効果バグ5件: ①`jidou_yell_grant_jouji_no_bh`/`jidou_area_move_grant_jouji` に `applyJidouPlainLiveEndHeartBladeGrant` 追加（PL!SP-bp2-015/020/021-N の heart06 誤スコア+1 修正）②`登場か、エリアを移動するたび` に altEventKind `enter_or_baton`（PL!SP-pb1-006-R 登場時未発火）③`applyStageFormationAssignment` センター離脱時 `fireJidouOnCenterMemberAreaMove`（PL!SP-pb2-011）④新template `heart_color_pick_replace`（元々ハート差し替え、横展開5枚: PL!N-bp3-014/015-N, PL!N-pb1-034/036-N, PL!SP-pb2-030-N）⑤デッキビルダー仮想スクロール rowH 再計測時のスクロールアンカー保持 |
| 2026-07-03 | 対戦 Phase 6b（自動検証）: patchKind コアを js/versusEffectPatch.js へ抽出、cloudAuth に __setTestCloudFirestore、verify-versus-online-sim.mjs 新設（2クライアント 22チェック）を coverage 連鎖 |
| 2026-07-03 | 対戦 Phase 6（コード）: verify-versus-online-static 新設 + coverage 連鎖、known-gaps.md、2 template を stage_wait_members へ移行、待ちバナー/ロビー文言/ダイアログ重複の UX、user-guide 新設 |
| 2026-07-02 | 対戦 Phase 5（コード）: passive online 再計算トリガー + ctx online 分岐 + v2 集計2種（imposeOpponentLiveNeedHeartDelta/bonusHeartSurplusTotal）+ patchKind 11種追加。smoke 86件 |
| 2026-07-02 | 対戦 Phase 4 完了: 代表4カード + タイムアウトを実プレイで検証（online 手動 5/5）。opponentDecision 文言の online 分岐追加 |
| 2026-07-02 | 対戦: ゲスト（匿名）ログイン追加（`signInAsGuest`）。ルーム作成/参加が Google 不要に。Phase 4 プロトコル E2E を実 Firestore 2クライアントで検証 |
| 2026-07-02 | 対戦 Phase 4: online mutate/choice プロトコル（EffectRequest/ChoiceRequest）、代表4 template 実装、versus-online-effect-protocol.md 新設 |
| 2026-07-02 | 対戦 Phase 3: VersusPublicBoard v2（read 集計9種）、online read_compare を localDual 同式に統一、versus-online-read-sync.md 新設 |
| 2026-07-02 | localDual Phase 1 全20件 [x] + Phase 2 常時7件: async ダイアログ×相手盤分離、jouji スナップ永続化、swapActiveSnap、syncPassiveEffects フック、dual-mode-smoke 39件 |
| 2026-07-02 | localDual Phase 1: stripOpponentBonusHeartsAndCount dual 同期、verify-dual-mode-phase1.mjs 追加、dual_gap 監査 0 件 |
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
| 2026-06-30 | 未着手一括: 蓮 bp6 + 全スクール pb1 verify/audit 新設（新規コード修正なし） |
| 2026-06-30 | チャット 0dd2c58a 着手: 共通ルール確定・`card-fix-workflow.mdc` 追加 |
| 2026-06-30 | アニバーサリー クロスメンバー LL-bp1〜6（001-R＋）一括監修。LL-bp6-001 ハート色和集合+ライブ終了まで修正 |
| 2026-06-30 | 蓮ノ空 bp5: 013-N ミル未実行修正、verify/audit 新設 |
| 2026-06-30 | 虹ヶ咲 bp5 メンバー3回監修: 011 2択前提 / 014 E2。verify 36/audit OK |
| 2026-06-30 | Liella! bp5 メンバー3回監修: 006 ミル→ポジチェン / 013 OR回収 / 014 移動条件ドロー / 017 手札コスト減。verify 35/audit OK |
| 2026-06-30 | μ's bp5 メンバー3回監修: 002/222 `costHandDiscardOptional` 時 `optional:false`。verify 26/audit OK |
| 2026-06-30 | 虹ヶ咲 bp5: 005 `jidou_leave_baton_partner_bh_threshold_energy`、verify/audit 新設 |
| 2026-06-30 | Aqours bp5: 005 `grantToEnteredMembersThisTurn`、verify/audit ライブ節 |
| 2026-06-30 | μ's bp5 ライブ: 024 `parseAbilityBulletChoices` / `executeAbilityChoiceText`、`audit-common-patterns.mjs`、p2 smoke 窓拡張 |
| 2026-06-30 | μ's bp5 メンバー（PL!-bp5）: `abilityComposition` 任意コスト→必須ステップ誤継承修正（横展開5枚）、`blade_if_self_wait` heartFlat、`toujou_wait_pick_hand` live_start/LS 前提 |
