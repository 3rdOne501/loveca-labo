# ll-ocg-tools — Cursor / GPT 共通引き継ぎ

最終作業日: 2026-11-12（日本時間）。共通ルール: [AGENTS.md](../AGENTS.md)。作業履歴: [WORKLOG.md](./WORKLOG.md)。

## 現在の依頼と判断

- 最新依頼（2026-11-12・日次自動化）: bp8「まじかる♡とり～と」の未対応能力を文言駆動の分類器＋最小実ハンドラで実装し、`docs/card-update-report.md` の68 IDの未カバーセグメントを0にする。**コミット・push・公開なし**、オンライン／対戦コード（`js/versusEffectPatch.js`・online*）は変更しない、カード番号分岐なし。結果は下の「bp8 まじかる♡とり～と — 実装（2026-11-12）」。
- 同日の前依頼: bp8 の未対応能力探索（実装なし）。結果は「bp8 — 探索結果」節に保持。
- 前依頼の「未対応32セグメント修正／案①説明」成果は保持。監査の「要確認」を対応済みと混同しない。
- 案②の盤面シナリオ生成、案③の外部AIレビューは実装しない。
- カード文から抽出する要求と、実装が扱う処理契約を独立させる。契約を分類結果から自動生成すると同じ誤りを正解扱いするため禁止。
- 「未対応」「不一致の疑い」「要確認」「既知ルール照合」を区別する。既知ルール照合はプレイ動作の保証ではない。
- 未登録テンプレート・未知の文言・未確認の枚数を合格扱いにしない。過去に修正済み／コードにIDがあるカードも除外しない。

## 今回の実装

- 共通ルール: `AGENTS.md`、`.cursor/rules/project-handoff.mdc`。
- 監査コア: `scripts/lib/ability-semantic-audit.mjs`。
- 人が確認して保守する処理契約: `data/ability-semantic-contracts.json`。
- 実行・レポート出力: `scripts/audit-ability-semantics.mjs`。
- 自動検証: `scripts/verify-ability-semantics.mjs`。
- 運用説明: [ability-semantic-audit-guide.md](./ability-semantic-audit-guide.md)。
- 日次カード更新と既存の能力検証にも監査を組み込み、データ差分が0でも日次監査は行う。
- 全件監査だけが下記の自動更新ブロックを更新する。単一カード監査・JSON出力・読み取り専用モードは全件結果を上書きしない。

## 最新の監査集計（この範囲だけスクリプトが更新）

<!-- semantic-audit:start -->
最新監査: 2026-11-16T18:13:23.215Z。対象2881枚／2378セグメント。未対応0／不一致の疑い45／要確認2021／既知ルール照合312。
結果: [Markdown](./ability-semantic-audit.md) / [JSON](./ability-semantic-audit.json)。実プレイ保証ではない。
<!-- semantic-audit:end -->

## 継続改善（2026-11-03）

- μ's DUO `PL!-pb2-000-R` / `PL!-pb2-000-DUO`（星空 凛&小泉花陽）の登場能力を修正。汎用の `toujou_multi_baton_recover_score` で、μ'sの2人バトン→μ'sライブ1枚回収→コスト合計15の場合のみライブ終了までスコア＋1。カード番号分岐なし。詳細: [限定検証リスト](./muse-duo-baton-verification-list.md)。商品全体の監修完了ではない。
- バトン元のグループ・コストを退場前に保存。領域移動／情報変更後も条件を保持し、退出で消去。公開領域の固定枚数回収はキャンセル省略を防ぐ。共通選択ダイアログに `required` を追加し、他の任意選択を保持。
- 監査の誤検出を修正: 山札を見る→上へ戻す→残り控え室、を控え室回収と混同しない。ブレードの全付与箇所を抽出。空／不正契約を拒否し、フラグだけで枚数を合格にしない。契約16テンプレート。
- 自動効果7種の実行メタデータ登録漏れを修正。既存ハンドラの有無を再確認し `JIDOU_AUTO_TEMPLATES` へ追加。新しい効果実装7件とは区別する。
- 最弱会議／ティアのFirestore模擬試験へGoogle認証オブジェクトを明示注入。匿名・認証のないキャッシュユーザーが拒否されることも検証。本番の認証判定は変更しない。
- `verify-ability-coverage.mjs` は独立した検証を最後まで実行し、失敗をまとめて終了1にする。新規DUO／既存Aqours cl1／実行ハンドラ検証を追加。閾値・未対応の除外は緩めない。
- 利用コマンド: `npm run test:abilities`（全体）、`npm run test:muse-duo-baton`（限定動作）、既存の監査コマンド。

## 今回の未対応修正（2026-11-03）

- 監査の未対応**32→0セグメント**（レアリティを含む）。能力索引もguided_manual／jidou_manual／常時未分類がすべて0。商品全体の監修完了とは区別する。
- 新規 `js/abilityCompletion.js` がカード文から条件・枚数を読み、既存分類器から呼ばれる。実ハンドラと発動イベントも `js/simulator.js` に実装し、自動化フラグだけを付ける対応はしない。
- 相手の元々ハート上限とコスト上限を独立化。複合任意コストは一括で任意支払い。次のアクティブフェイズ抑止・効果元はオンラインパッチにも伝達。
- 控え室から自身の下へ固定枚数、手札枚数から可変枚数を山札確認、成功ライブの所属・枚数によるエール追加、エール色変更、控え室枚数条件付き山札上回収を実装。
- ウェイトの原因をコスト／自分の効果／相手の効果／手動操作で区別。ウェイト起因の自動能力は元の効果中に選択画面を割り込ませず保持し、選択のあるものを順に解決。ターン1回／3回、下置き枚数上限、元カードの所属、指定名全員、センターとコスト条件も検証。
- 退場バトン相手へのコスト9以上・ライブ終了までのブレード、控え室から登場したメンバーによるドローを実装。下置きカードはステージ上の自動能力リスナーから除外。
- 常時は、正面へのウェイト登場、異名同グループ2人をウェイトにしてプレイコスト減少、lily whiteの効果内の成功ライブ枚数換算を実装。勝利判定・公開盤面の物理枚数へは換算を使わない。
- 同型検索でpb2-010のアクティブ化人数比例ブレード（R/P＋の2レアリティ）、pb2-033のハート上限も修正。アクティブ化は同ターンの異なるIDとして記録し、退出／次ターンで消去、Undo／盤面切替で復元。
- 従来失敗していたLiella! bp1-024の名前空白、Liella! bp4-023の複数能力保持、虹bp4-025のアイコン表記、虹bp5-005の汎用分岐先取りも修正。
- 対象・本文・検証: [未対応能力の限定検証](./pending-ability-verification-list.md)。関連変更は能力索引・修正レジストリ・相手盤効果レジストリにも反映。

## 最新の検証と未完了事項

- `npm run test:abilities`: **64コマンドすべて成功・終了0**。以前残っていた5スクリプト失敗とjidou手動12件の閾値未達を解消。閾値や除外条件は緩めていない。
- `npm run test:pending-abilities`: 元の32セグメントの分類と**40件の実処理／イベント・境界値検証**が通過。相手盤の各モードの対象条件、コスト、枚数、グループ、名前、ターン上限、イベント重複・ダイアログ割り込み防止、下置き、換算と勝利条件の分離を含む。
- `npm run test:ability-audit`: 37ケース通過。既存DUO16シナリオ＋選択UI、Aqours cl1、実行ハンドラ、山札選択検証も通過。
- `build-ability-index`: 起動310／登場637／ライブ開始377／ライブ成功133／自動145セグメントで手動0、常時未分類0。
- `npm run audit:abilities`: **2700枚／2169セグメント、未対応0／疑い28／要確認1842／既知ルール照合299**。疑い28は未解決。要確認は未登録契約等であり、全件不良でも動作保証済みでもない。
- `audit:abilities:check` は疑いが残るため終了1が正常。未対応0を理由に監査全体を合格にしない。
- `audit-verification-list-notes`: 49ファイル通過。相手盤レジストリも再生成。JS構文・空白差分・アプリ同期一致・監査入力ハッシュを確認する。
- 分類器・実処理は自動試験で確認。ブラウザ手動プレイ・実オンライン対戦は未検証。実カード取得を含む日次ジョブ全体は今回未実行（監査組込み経路の隔離試験は通過）。
- ビルド識別子はWeb／Macアプリとも**2026110303**。変更JS（新規モジュールを含む）・索引・修正履歴をMacアプリへ同期。公開・コミット・pushなし。

## 案①の使い方（ユーザー説明用）

- **開発用監査ツール**。サイト内のボタンや、閲覧中に常時走る監視ではない。検出だけではゲームの効果処理は変わらない。
- Macのターミナル: `cd /Users/kaneko_kai/projects/ll-ocg-tools` → `npm run audit:abilities`。
- 結果は `docs/ability-semantic-audit.md`（読みやすい一覧）／同名JSON（全件詳細）。全件監査は本資料の管理ブロックも更新。
- `npm run test:abilities` と `scripts/daily-card-update.sh` 実行時にも監査を実行する。新しいOS定期ジョブを登録したわけではない。
- カードを絞る場合: `node scripts/audit-ability-semantics.mjs --card 'PL!-pb2-000-R'`。全件結果を上書きせずscopedレポートを出す。
- 今回の実カード修正は別途、ゲームの分類器・実処理・イベント接続を変更したもの。
- 説明書: [監査ガイド](./ability-semantic-audit-guide.md)。

## 前作業の保持事項

- Aqoursクリアポケットの新規16枚を初回監修。未対応4枚と誤処理4枚を修正。詳細は [aqours-cl1-verification-list.md](./aqours-cl1-verification-list.md)。
- みらくらぱーく！は半角表記45枚を含む106枚を統一。取込・検索・保存済み絞り込みにも正規化を追加。
- 上記のフロントエンドとデータは `LovecaSimulator.app/Contents/Resources/www/` に同期済み。監査スクリプト・契約は開発用のためアプリへ同梱しない。今回の未対応能力と実カード修正も同梱した。
- 未コミットの前作業が多数ある。これらを戻したり、今回の成果だけに見せるために消したりしない。
- 公開サイトへのpush・デプロイは依頼されていない。公開済みと報告しない。

## bp8 まじかる♡とり～と — 実装（2026-11-12／再適用 2026-11-16）

- 消失対策: コミット禁止のため、差分を `/cursor/stores/self/artifacts/bp8-magical-treat-2026-11-12/SOURCE.patch` と `extract-and-replay.mjs`（`git apply`）に保存。復元元は cloud transcript `bc-328ec174` + `bc-7018433f`（search_replace 時系列 + `run_terminal_cmd` の simulator 編集）。
- 変更ファイル: `js/abilityCompletion.js`（新パターン分類、`COMPLETION_OWN_COST_TEMPLATES`）、`js/abilityEffects.js`（「能力と」インライン参照の分割修正、連続能力の `stepsPayOwnCost`）、`js/abilityRuntimeMeta.js`（自前コスト登録）、`js/joujiEffects.js`（常時新種の評価・`listMemberJoujiRulesOfKind`）、`js/simulator.js`（`executeCompletionActiveMore`、`executeCompletionJidou` 追加分、各種イベント接続とゲート）、新規 `scripts/verify-bp8-abilities.mjs`（`npm run test:bp8-abilities`、`verify-ability-coverage` に組込み）、`package.json`、`data/fix-notes/fixed-cards-registry.md` §0q、索引・監査レポート・分類スナップショット（スクリプト生成）。`js/jidouAutoEffects.js` は変更なし。
- simulator の主な追加: 下置きカードの起動＋ライブ開始ミラー（`live_start_mirror_<ID>`）、ライブ中コスト増減 `_liveSessionCostDelta`、手札コスト＝エネルギーデッキ残数分増、バトン減少+1付与、プレイ不可／起動封鎖／相手効果ウェイト耐性、成功ライブ合計参照、自動イベント（控え室→デッキ・リフレッシュ・ステージ状態・成功ライブ置き場配置・エール公開カード移動・控え室由来ライブ配置）。自動は効果解決／ダイアログ中は遅延して直列実行。
- 連続能力（`ability_sequence`）は各ステップが自分のコストを払う（HS-bp8-019 の任意E1、HS-bp8-020 の2段目）。強制の手札調整・手札捨ては1回だけ選び直し、その後は自動で控え室へ。
- 実行・結果:
  - `/tmp` の68 ID分類プローブ: **68 ID・未カバー0**（guided_manual／jidou_manual／未分類／常時null なし）。全カード分類スナップショット差分で bp8 以外の変化は PL!SP-bp4-023 のフラグ項目のみ（動作同一）。
  - `node scripts/build-ability-index.mjs`: guided_manual **28→2**、jidou_manual **11→2**、常時未分類 **20→0**。残り4件は非bp8の PL!N-PR-039-PR / PL!SP-PR-035-PR（成功・相手エール12枚以上）と PL!N-PR-038-PR / PL!SP-PR-034-PR（自動・バトン退場付与）で今回範囲外・既存。live_start が404→403 なのは LL-bp8-001 の誤分割解消による。
  - `node scripts/verify-ability-coverage.mjs`: 終了1。失敗は **既存2件のみ**（HEAD のワークツリーでも同一）: `jidou manual 2 exceeds max 0`（HEAD では11）、`verify-muse-bp5.mjs`（`PL!-bp5-010-N live_start parent optional cost`、出力はHEADと完全一致）。途中で自分の変更起因の失敗（ハンドラ検出・VM 抜き出し・toast→return）を出したが修正済み。
  - `npm run audit:abilities`: 2881枚／2378セグメント、**未対応75→4／疑い47→45／要確認1945→2017**／既知ルール照合312。要確認の増加は未対応70件・疑い2件が要確認へ移ったもの（悪化した記録0）。新テンプレの契約は未登録＝要確認であり、対応済みではない。
  - `npm run test:ability-audit` 37ケース、`test:pending-abilities`、`test:muse-duo-baton`、`test:bp8-abilities`（12件、意図的な改変で失敗することを確認）すべて通過。
  - ヘッドレス Chrome で `index.html` 読込と `js/simulator.js` の動的 import がエラーなし（HEAD と同じ）。**ブラウザ実操作・実プレイは未実施**。
- Mac アプリ同期: 変更JS 5本・能力索引・修正レジストリを `cp` で `LovecaSimulator.app/Contents/Resources/www/` へ同期（パッケージスクリプトは不使用）。ビルド識別子 `2026110303` は据え置き（ブラウザのキャッシュで旧JSが残る可能性あり）。
- 残課題（カードID・理由）:
  - PL!-bp8-023 ほか: `b_heart08`（新ブレードハート種）の意味が未定義。エール公開カードへの付与は記録して成功時判定にのみ使い、他のブレードハート判定・ハート数には反映しない。
  - PL!N-bp8-005: 常時「相手のステージのメンバー全員が heart02 を得る」は相手側未実装（自分の『虹ヶ咲』のみ）。
  - PL!HS-bp8-012（レポート外の bp8）: 2段目「『スリーズブーケ』が3枚以上デッキの下に置かれた場合」の条件を判定していない（既存の連続能力合成のまま）。監査でも疑い。
  - PL!HS-bp8-001 / PL!HS-bp8-005 / PL!-bp8-021 など: 相手盤を表示中（デュアル盤面切替中）はステージ状態・成功ライブ配置の自動判定をスキップする。
  - PL!HS-bp8-001: 控え室→デッキ移動の差分検知は、`runClassifiedCardAbility` 経由の自分の能力とリフレッシュのみ。自動能力内部や手動操作の移動では発火しない。
  - LL-bp8-001: ミラーした起動能力は下置きカードのインスタンスで実行する（既存 `mirror_under_card_kidou` と同じ扱い）。
  - PL!N-bp8-021: 「上限1枚減る」は置けたかどうかに関係なく適用する解釈。
  - PL!-bp8-025: デュアル盤面の相手メンバー比較はスナップショット値（相手の付与効果・常時を完全には再計算しない）。
  - 既存の監査疑い（今回不変）: PL!-bp8-007、PL!HS-bp8-006、PL!HS-bp8-022、PL!N-bp8-023（いずれもレポート68 ID外）。
  - 新テンプレの意味契約（`data/ability-semantic-contracts.json`）は未登録。人手監修で追加する。

## bp8 まじかる♡とり～と — 探索結果（2026-11-12・実装なし）

- 商品カード: `data/cards.json` に `-bp8-` キー **169**（エネルギー含む）。未対応一覧は `docs/card-update-report.md`（代表能力付き約68枚、レア差含む）。
- `verify-*-bp8*` / magical-treat 用スクリプトは **未作成**。雛形は `scripts/verify-hasunosora-bp6.mjs` 等。
- 代表33パターンを `classifyCardAbility` / `classifyJoujiSegment` / `classifyJidouAutoSegment` で実分類: 大半が `guided_manual` / `jidou_manual` / jouji `null`。
- 再利用候補の太い塊: `mirror_under_card_*`、`deck_top_pick_recover`、`waiting_to_deck_bottom*`、`kidou_hand_reveal_to_under`、`live_success_recover_from_waiting`、`yell_reveal_series_live_score_plus`、`live_success_surplus_heart_score_plus`、`toujou_main_phase_live_from_waiting`（`liveSetLimitPenalty`）、`live_start_need_heart_reduce_fixed`、`live_return_hand_then_discard`、`skipNextActivate` 配線。
- ほぼ確実に NEW: 名前付き下置き能力ミラー（起動+ライブ開始時）、退場→任意デッキ下→相手ハート≤4ウェイト、μ'sへのバトン減算=コスト+1付与、成功ライブ合計参照+2、控え室→デッキ時ブレード、DOLLCHESTRAプレイ制限／自退場、起動封鎖／相手効果ウェイト耐性、リフレッシュ自動、エール公開カード移動時スコア、みらくら同コスト入替（登場無効）、手札コスト=エネルギーデッキ枚数増、手札公開起動、余剰ハート2つにつき（上限3）等。
- 公開・コミット依頼なしの実装作業は未実施。本探索の引き継ぎ更新のみ。

## 次の作業

1. bp8: 上記「残課題」を処理（b_heart08 の意味確定、N-bp8-005 相手側付与、HS-bp8-012 の枚数条件）。ブラウザで代表カード（LL-bp8-001、HS-bp8-003、N-bp8-005、PL!-bp8-021）を実操作して確認する。必要ならビルド識別子を更新する。
2. 残る疑いセグメントをカード本文と実ハンドラで再現して確認する。既存失敗 `verify-muse-bp5`（PL!-bp5-010-N）と非bp8 PR 4枚の手動分類も未処理。
3. 新設テンプレートの契約登録は人手監修のみ。要確認を減らすだけの一括true指定は禁止。
4. ブラウザ実操作・実オンライン対戦は自動試験と混同しない。
