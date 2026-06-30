# カード効果 修復進行リスト

シミュレータのカード文通り実装を、商品単位で進めるための一覧。**詳細は各 `*-verification-list.md` を正**とする。

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | **修復済み** — 分類・ハンドラ・静的検証 OK（`verify-*.mjs` / `audit-*-text.mjs` 通過、または能力なし確認済） |
| ⭕️ | **2回監修済み** — 上記に加え、ライブ（またはメンバー）区分の **2回目** 深掘り完了 |
| 🔄 | **一部済** — 詳細リストあり。未チェック `[ ]` または修正残あり |
| ⬜ | **未着手** — 専用検証リスト・スクリプトなし |
| — | **該当なし** — `cards.json` 未収録 or 当該カテゴリのカードなし |

**1 行 = 1 作業単位**（メンバー一括 / ライブ一括）。各 bp は 3 ユニット分のカードを含むが、検証は **メンバー・ライブの 2 区分**で進める。

---

## サマリー（2026-06-28 時点）

| 区分 | 完全修復 ✅ | 一部済 🔄 | 未着手 ⬜ |
|------|------------|----------|----------|
| ブースター bp（行単位） | **12** | **6** | **50** |
| プレミアム pb（行単位） | **4** | 0 | **6** |
| アニバーサリー（12 区分） | **9** | 0 | **3** |
| スタートデッキ（10 区分） | **6** | 0 | **4** |
| PR | 個別管理（下記 §5） | | |

**完全修復 ✅（bp）**: 蓮 bp1/bp2/bp5、虹 bp1/bp5、Liella bp1/bp2/bp4/bp5、μ's bp3/bp4/bp5、Aqours bp5（各メンバー+ライブ）

---

## 1. ブースターパック（bp1–bp6）

各スクール × 各弾。**メンバー**と**ライブ**を別行で管理（計 6 弾 × 5 スクール × 2 = 最大 60 行、実在分のみ記載）。

### μ's（`PL!-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | — | — | 本編未収録（エネルギーのみ） |
| bp2 | — | — | 未収録 |
| bp3 | ✅ | ✅ | [muse-bp3-verification-list.md](./muse-bp3-verification-list.md) **2026-06-28 ライブ修正** |
| bp4 | ✅ | ✅ | [mus-bp4-verification-list.md](./mus-bp4-verification-list.md) **2026-06-28 メンバー+ライブ修正完了** |
| bp5 | ✅ | ⭕️ | [muse-bp5-verification-list.md](./muse-bp5-verification-list.md) **2026-06-30 2回監修**（111 jouji heart×人数、002/222 必須ウェイト） |
| bp6 | ⭕️ | ⭕️ | [muse-bp6-verification-list.md](./muse-bp6-verification-list.md) **2026-06-28 ライブ2回監修**（020 FAQ255 / 021任意確認） |

### Aqours（`PL!S-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | — | — | 本編未収録 |
| bp2 | ✅ | ✅ | [aqours-bp2-verification-list.md](./aqours-bp2-verification-list.md) **2026-06-28 ライブ修正** |
| bp3 | ✅ | ✅ | [aqours-bp3-verification-list.md](./aqours-bp3-verification-list.md) **2026-06-28 ライブ修正** |
| bp4 | ⬜ | ⬜ | 未作成 |
| bp5 | ✅ | ⭕️ | [aqours-bp5-verification-list.md](./aqours-bp5-verification-list.md) **2026-06-30 2回監修**（006 必須ウェイト横展開） |
| bp6 | ⭕️ | ⭕️ | [aqours-bp6-verification-list.md](./aqours-bp6-verification-list.md) **2026-06-28 ライブ2回監修完了**（023 他） |

### 虹ヶ咲（`PL!N-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ✅ | ✅ | [niji-bp1-verification-list.md](./niji-bp1-verification-list.md) **2026-06-28 メンバー検証完了** |
| bp2 | ⬜ | ⬜ | 未作成 |
| bp3 | ✅ | ✅ | [niji-bp3-verification-list.md](./niji-bp3-verification-list.md) **2026-06-28 ライブ再修正** |
| bp4 | ✅ | ✅ | [niji-bp4-verification-list.md](./niji-bp4-verification-list.md) **2026-06-28 ライブ修正完了** |
| bp5 | ✅ | ⭕️ | [niji-bp5-verification-list.md](./niji-bp5-verification-list.md) **2026-06-30 2回監修**（001 jidou BH、004 ちょうど4、027 異名3） |
| bp6 | ⬜ | ⬜ | 未収録 |

### Liella!（`PL!SP-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ✅ | ✅ | [liella-bp1-verification-list.md](./liella-bp1-verification-list.md) **2026-06-28 ライブ修正完了** |
| bp2 | ✅ | ✅ | [liella-bp2-verification-list.md](./liella-bp2-verification-list.md) |
| bp3 | ⬜ | ⬜ | 未作成 |
| bp4 | ✅ | ✅ | [liella-bp4-verification-list.md](./liella-bp4-verification-list.md) **2026-06-28 メンバー+ライブ修正完了** |
| bp5 | ✅ | ⭕️ | [liella-bp5-verification-list.md](./liella-bp5-verification-list.md) **2026-06-30 2回監修**（009 ミル継続、023 エール前提） |
| bp6 | ⬜ | ⬜ | 未収録 |

### 蓮ノ空（`PL!HS-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ✅ | ✅ | [hasunosora-bp1-verification-list.md](./hasunosora-bp1-verification-list.md) |
| bp2 | ✅ | ✅ | [hasunosora-bp2-verification-list.md](./hasunosora-bp2-verification-list.md) |
| bp3 | ⬜ | ⬜ | 未収録 |
| bp4 | ⬜ | ⬜ | 未収録 |
| bp5 | ✅ | ⭕️ | [hasunosora-bp5-verification-list.md](./hasunosora-bp5-verification-list.md) **2026-06-30 2回監修**（005 DOLLCHESTRA、022 Retrofuture） |
| bp6 | ⬜ | ⬜ | 未作成 |

---

## 2. プレミアムブースター（pb1–pb5）

各スクール × pb1〜pb5。**メンバー / ライブ**の 2 区分（`cards.json` に存在する pb のみ）。

| スクール | pb1 メンバー | pb1 ライブ | pb2 | pb3 | pb4 | pb5 | 詳細リスト |
|---------|-------------|-----------|-----|-----|-----|-----|-----------|
| μ's | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 未作成 |
| Aqours | ⬜ | ⬜ | — | — | — | — | 未作成（pb1 のみ収録） |
| 虹ヶ咲 | ⬜ | ⬜ | — | — | — | — | 未作成 |
| Liella! | ⬜ | ⬜ | ✅ | — | — | — | [liella-pb2-verification-list.md](./liella-pb2-verification-list.md) |
| 蓮ノ空 | ✅ | ✅ | — | — | — | — | [hasunosora-pb1-verification-list.md](./hasunosora-pb1-verification-list.md) |

> pb2–pb5 の Liella! / 他スクールは `cards.json` 追加後に行を足す。蓮 pb2 は未収録（[hasunosora-bp2-verification-list.md](./hasunosora-bp2-verification-list.md) 注記参照）。

---

## 3. アニバーサリー（12 区分）

5 コンテンツ ×（メンバー / ライブ）+ ライブのみ 2 区分 = **12 作業単位**。

| # | コンテンツ | 区分 | 状態 | 備考 |
|---|-----------|------|------|------|
| 1 | LL-bp1 クロス | メンバー | ✅ | [ll-anniversary-member-verification-list.md](./ll-anniversary-member-verification-list.md) **2026-06-30 一括監修** |
| 2 | LL-bp2 クロス | メンバー | ✅ | [ll-anniversary-member-verification-list.md](./ll-anniversary-member-verification-list.md) **2026-06-30** |
| 3 | LL-bp3 クロス | メンバー | ✅ | 同上（園田海未&善子&璃奈） |
| 4 | LL-bp4 クロス | メンバー | ✅ | 同上（絢瀬絵里&果林&恋） |
| 5 | LL-bp6 クロス | メンバー | ✅ | 同上（ことり&ダイヤ&小鈴・ハート色和集合修正） |
| 6 | LL-bp5 | ライブ | ✅ | [ll-bp5-verification-list.md](./ll-bp5-verification-list.md) **2026-06-28** `LL-bp5-001-L` OR条件スコア+1 |
| 7 | LL-bp5 | ライブ | ✅ | 同上 `LL-bp5-002-L` Bring the LOVE! |
| 8 | PL!HS-cl1 | メンバー | ✅ | [hasunosora-cl1-verification-list.md](./hasunosora-cl1-verification-list.md) **2026-06-28** 001 peek / 004 選択肢 |
| 9 | PL!HS-cl1 | ライブ | ✅ | [hasunosora-cl1-verification-list.md](./hasunosora-cl1-verification-list.md) **2026-06-28** 009/010/011 修正 |
| 10 | LL-PR | ライブ | ✅ | [ll-pr-verification-list.md](./ll-pr-verification-list.md) **2026-06-28** |
| 11 | LL-PR | エネルギー | — | 能力なし PR（検証対象外） |
| 12 | （予備） | — | ⬜ | 新アニバ商品追加時に行を割当 |

---

## 4. スタートデッキ（10 区分）

5 種類 ×（メンバー / ライブ）。

| デッキ | ID 接頭 | メンバー | ライブ | 状態 |
|--------|---------|---------|--------|------|
| μ's sd1 | `PL!-sd1` | ✅ | ✅ | [mus-sd1-verification-list.md](./mus-sd1-verification-list.md) **2026-06-28** |
| Aqours sd1 | `PL!S-sd1` | ✅ | ✅ | [aqours-sd1-verification-list.md](./aqours-sd1-verification-list.md) **2026-06-28** |
| 虹ヶ咲 sd1 | `PL!N-sd1` | ✅ | ✅ | [niji-sd1-verification-list.md](./niji-sd1-verification-list.md) **2026-06-28** |
| Liella! sd1 | `PL!SP-sd1` | ✅ | ✅ | [liella-sd1-verification-list.md](./liella-sd1-verification-list.md) **2026-06-28** |
| 蓮ノ空 sd1 | `PL!HS-sd1` | ✅ | ✅ | [hasunosora-sd1-verification-list.md](./hasunosora-sd1-verification-list.md) **2026-06-28** |
| Liella! sd2 cheer | `PL!SP-sd2` | ✅ | ✅ | [liella-sd2-verification-list.md](./liella-sd2-verification-list.md) **2026-06-28** |

> `PL!SP-sd2` は sd1 DUO とは別商品（cheer）。上記 6 行目として追加。

---

## 5. PR カード（個別）

能力付き PR は **1 カード = 1 行**で管理。エネルギー PR・能力なしは除外。

### 修復済み（代表・play リスト / 個別修正済）

| ID | 名前 | 備考 |
|----|------|------|
| PL!SP-pb1-001-PR | 澁谷かのん | [play-verification-list](./play-verification-list.md) A |
| PL!-PR-014-PR | 園田海未 | play A — 相手手札公開 |
| PL!-PR-003/004/015-PR | ことり/海未/真姫 | [muse-pr-verification-list.md](./muse-pr-verification-list.md) **2026-06-28** |
| PL!S-PR-029–042-PR | 曜/善子/花丸/ルビィ等 | [aqours-pr-verification-list.md](./aqours-pr-verification-list.md) **2026-06-28** |
| PL!HS-PR-032-PR | セラス柳田リリエンフェルト | play A — スコア6+ライブ回収 |
| PL!SP-pb2-009-R | 鬼塚夏美 | 元々ブレード比較（登場/開始） |

### 未着手（能力付き PR 一覧 — 要個別検証）

| 接頭 | 枚数（メンバー/ライブ） | 状態 |
|------|------------------------|------|
| `PL!-PR` | 14 メンバー | ✅ | [muse-pr-verification-list.md](./muse-pr-verification-list.md) **2026-06-28** |
| `PL!S-PR` | 26 メンバー + 3 ライブ | ✅ | [aqours-pr-verification-list.md](./aqours-pr-verification-list.md) **2026-06-28** |
| `PL!N-PR` | 25 メンバー | ✅ | [niji-pr-verification-list.md](./niji-pr-verification-list.md) **2026-06-28** |
| `PL!SP-PR` | 17 メンバー | ✅ | [liella-pr-verification-list.md](./liella-pr-verification-list.md) **2026-06-28** |
| `PL!HS-PR` | 27 メンバー + 4 ライブ | ✅ | [hasunosora-pr-verification-list.md](./hasunosora-pr-verification-list.md) **2026-06-28** |
| `LL-PR` | 1 ライブ + 複雑 1 件 | ✅ | [ll-pr-verification-list.md](./ll-pr-verification-list.md) **2026-06-28** |

詳細索引: [complex-risky-cards.md](./complex-risky-cards.md) / [play-verification-list.md](./play-verification-list.md)

---

## 6. 推奨作業順（2026-06-30）

1. **μ's pb1**（complex-risky 上位: 絢瀬絵里002, 真姫015）— pb 未着手6行の塊
2. **蓮 cl1 メンバー**（8枚, progress ⬜）— Edelied 周辺は play-verification B 項と連動
3. **🔄 一部済**の bp ライブ／メンバーを `[ ]` 解消（Aqours bp4、虹 bp2/bp6、Liella bp3 等）
4. **pb1** 全スクール（蓮 pb1 ✅、Liella pb2 ✅ を横展開参考に）
5. **スタートデッキ** 5 種 / **アニバーサリー** 12 区分 / **PR** 個別（複雑カード・ユーザー報告優先）

---

## 7. 関連コマンド

```bash
# 代表カード回帰（例）
node scripts/verify-niji-bp1.mjs
node scripts/verify-hasunosora-bp1.mjs
node scripts/verify-aqours-bp6.mjs
node scripts/audit-aqours-bp6-text.mjs
node scripts/verify-hasunosora-bp5.mjs
node scripts/audit-hasunosora-bp5-text.mjs
node scripts/verify-liella-bp5.mjs
node scripts/audit-liella-bp5-text.mjs
node scripts/verify-niji-bp5.mjs
node scripts/audit-niji-bp5-text.mjs
node scripts/verify-aqours-bp5.mjs
node scripts/audit-aqours-bp5-text.mjs
node scripts/verify-muse-bp5.mjs
node scripts/audit-muse-bp5-text.mjs
node scripts/verify-muse-bp6.mjs
node scripts/verify-aqours-pr.mjs
node scripts/verify-niji-pr.mjs
node scripts/verify-liella-pr.mjs
node scripts/verify-hasunosora-pr.mjs
node scripts/verify-ll-pr.mjs

# 全文監査（例）
node scripts/audit-niji-bp1-text.mjs
node scripts/audit-niji-pr-text.mjs
node scripts/audit-liella-pr-text.mjs
node scripts/audit-hasunosora-pr-text.mjs
node scripts/audit-ll-pr-text.mjs

# 横断カバレッジ
node scripts/audit-all-pr.mjs
node scripts/verify-ability-coverage.mjs
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-06-30 | **bp5 全5スクール2回監修**: 実行時バグ9クラスタ（111 jouji、必須ウェイト+任意手札、Niji 001/004/027、Liella 009/023、HS 005/022）。verify 計147ケース |
| 2026-06-30 | **bp5 全スクール再監修**: PL!SP-025-L 任意E×4スコア+1、PL!HS-013-N 山札ミル→条件ブレード。verify カバレッジ拡充（計147ケース） |
| 2026-06-30 | 蓮ノ空 bp5（PL!HS-bp5）: verify/audit 新設、分類OK（新規修正なし）— **Anniversary2026 bp5 全5スクール完了** |
| 2026-06-30 | Liella! bp5（PL!SP-bp5）: verify/audit 新設、分類OK（新規修正なし） |
| 2026-06-28 | Aqours bp6 004-P: 「その中から{{live_start}}能力を持たない」インライン参照の分割誤り→`live_start_live_frame_pick_deck_top` 復帰。verify/audit 20/20 |
| 2026-06-30 | Aqours bp5（PL!S-bp5）: 005 今ターン登場非Aqoursハート付与、verify/audit ライブ節、audit-common-patterns |
| 2026-06-30 | μ's bp5 ライブ（019–024）: 024 Private Wars 2択（ブレードラベル保持・ウェイト復帰ハンドラ）、`audit-common-patterns.mjs` 追加、verify 26/26 |
| 2026-06-30 | μ's bp5 メンバー（PL!-bp5）: 010 ability_sequence 任意コスト継承バグ、333 自ウェイト heart05 分類。verify/audit 追加 |
| 2026-06-28 | Aqours bp5 メンバー（PL!S-bp5）初回監修: 001 トリガー分割・無能力バトンドロー条件 |
| 2026-06-28 | μ's bp5 ライブ（019–023）初回監修: 022 成功ライブ枚数×スコア+必要ハート増の分類・ハンドラ |
| 2026-06-28 | 蓮ノ空 cl1 メンバー（001–008）初回監修: 001 peek任意控え室、004 山札ミル選択肢 |
| 2026-06-28 | 蓮ノ空 cl1 ライブ（009–012）初回監修: 009 コスト上限、010 付与先、011 2択目ハンドラ |
| 2026-06-28 | μ's bp6 ライブ（019–024）2回監修: 020 FAQ255 センター離脱後誘発、021 任意確認。Aqours bp6 ライブ ⭕️ 確定 |
| 2026-06-28 | Aqours bp6（PL!S-bp6）監修着手: 019-L 自動化、006 控え室付与分割修正、022 エネルギー条件、024 相手余剰ハート新テンプレ |
| 2026-06-28 | 全スクール PR 再監査（`audit-all-pr.mjs` 12 本通過）。μ's 以外は新規不具合なし。verify 拡充（Aqours 15 / Niji 13 / Liella 12 / Hasunosora 11 ケース）、横断 `pr-audit-common.mjs` |
| 2026-06-28 | μ's bp6 ライブ（019–024-L）修正（022 成功ライブ常時の必要ハート減少、020 jidou の能力種別フィルタ・移動判定） |
| 2026-06-28 | μ's bp6 メンバー（PL!-bp6）修正（µ/μ タグ、001 エール前提、003/006 新テンプレ、009 左右サイドブレード2、012–015 成功ライブ条件） |
| 2026-06-28 | LL-PR（004 愛♡スクリ～ム！）修正（ライブ終了までブレード、味回答の部分実行、ソロ相手ドロー案内） |
| 2026-06-28 | 蓮ノ空 PR（PL!HS-PR）修正（019/021 山札3ミル heart04 付与、028 余剰ハート条件ドロー） |
| 2026-06-28 | Liella! PR（PL!SP-PR）修正（009/011/012 ability_sequence の手札捨てコスト未処理） |
| 2026-06-28 | 虹ヶ咲 PR（PL!N-PR）修正（003/008/010 手札全公開起動、021 エール回収 OR フィルタ） |
| 2026-06-28 | Aqours PR（PL!S-PR）修正（029–031 相手C13+、040 エール条件、041 自/相手ライブ山札下、042 両ステージ6人） |
| 2026-06-28 | μ's PR（PL!-PR）再監査（001/002 任意アクティブ選択、005/006/008 相手全員ウェイト） |
| 2026-06-28 | μ's PR（PL!-PR）修正（003/004 必要ハート回収フィルタ、015 低コストバトン条件） |
| 2026-06-28 | Liella! sd2 cheer 修正（008 常時 C13+条件、020 他 Liella! 選択付与）。スタートデッキ 7/11 完了 |
| 2026-06-28 | 蓮ノ空 sd1 修正（003/005/006/008/013）。スタートデッキ 6/10 完了 |
| 2026-06-28 | Liella! sd1 DUO 修正（001 エネルギー枚数ドロー、002 占有エリア登場）。スタートデッキ 5/10 完了 |
| 2026-06-28 | μ's bp3 ライブ修正（019/023/025）。完全修復 bp +1 |
