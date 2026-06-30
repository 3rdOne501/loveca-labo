# カード効果 修復進行リスト

シミュレータのカード文通り実装を、商品単位で進めるための一覧。**詳細は各 `*-verification-list.md` を正**とする。

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | **修復済み** — 分類・ハンドラ・静的検証 OK（`verify-*.mjs` / `audit-*-text.mjs` 通過、または能力なし確認済） |
| 🔄 | **一部済** — 詳細リストあり。未チェック `[ ]` または修正残あり |
| ⬜ | **未着手** — 専用検証リスト・スクリプトなし |
| — | **該当なし** — `cards.json` 未収録 or 当該カテゴリのカードなし |

**1 行 = 1 作業単位**（メンバー一括 / ライブ一括）。各 bp は 3 ユニット分のカードを含むが、検証は **メンバー・ライブの 2 区分**で進める。

---

## サマリー（2026-06-28 時点）

| 区分 | 完全修復 ✅ | 一部済 🔄 | 未着手 ⬜ |
|------|------------|----------|----------|
| ブースター bp（行単位） | **10** | **6** | **52** |
| プレミアム pb（行単位） | **4** | 0 | **6** |
| アニバーサリー（12 区分） | **1** | 0 | **11** |
| スタートデッキ（10 区分） | **6** | 0 | **4** |
| PR | 個別管理（下記 §5） | | |

**完全修復 ✅（bp）**: 蓮 bp1/bp2、虹 bp1、Liella bp1/bp2/bp4、μ's bp3/bp4（各メンバー+ライブ）

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
| bp5 | ⬜ | ⬜ | 未作成 |
| bp6 | ✅ | ✅ | `scripts/verify-muse-bp6.mjs` **2026-06-28 メンバー+ライブ修正**（020 jidou 能力種別、022 必要ハート減少 等） |

### Aqours（`PL!S-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | — | — | 本編未収録 |
| bp2 | ✅ | ✅ | [aqours-bp2-verification-list.md](./aqours-bp2-verification-list.md) **2026-06-28 ライブ修正** |
| bp3 | ✅ | ✅ | [aqours-bp3-verification-list.md](./aqours-bp3-verification-list.md) **2026-06-28 ライブ修正** |
| bp4 | ⬜ | ⬜ | 未作成 |
| bp5 | ⬜ | ⬜ | 未作成 |
| bp6 | ⬜ | ⬜ | 未作成 |

### 虹ヶ咲（`PL!N-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ✅ | ✅ | [niji-bp1-verification-list.md](./niji-bp1-verification-list.md) **2026-06-28 メンバー検証完了** |
| bp2 | ⬜ | ⬜ | 未作成 |
| bp3 | ✅ | ✅ | [niji-bp3-verification-list.md](./niji-bp3-verification-list.md) **2026-06-28 ライブ再修正** |
| bp4 | ✅ | ✅ | [niji-bp4-verification-list.md](./niji-bp4-verification-list.md) **2026-06-28 ライブ修正完了** |
| bp5 | ⬜ | ⬜ | 未作成 |
| bp6 | ⬜ | ⬜ | 未収録 |

### Liella!（`PL!SP-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ✅ | ✅ | [liella-bp1-verification-list.md](./liella-bp1-verification-list.md) **2026-06-28 ライブ修正完了** |
| bp2 | ✅ | ✅ | [liella-bp2-verification-list.md](./liella-bp2-verification-list.md) |
| bp3 | ⬜ | ⬜ | 未作成 |
| bp4 | ✅ | ✅ | [liella-bp4-verification-list.md](./liella-bp4-verification-list.md) **2026-06-28 メンバー+ライブ修正完了** |
| bp5 | ⬜ | ⬜ | 未作成 |
| bp6 | ⬜ | ⬜ | 未収録 |

### 蓮ノ空（`PL!HS-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ✅ | ✅ | [hasunosora-bp1-verification-list.md](./hasunosora-bp1-verification-list.md) |
| bp2 | ✅ | ✅ | [hasunosora-bp2-verification-list.md](./hasunosora-bp2-verification-list.md) |
| bp3 | ⬜ | ⬜ | 未収録 |
| bp4 | ⬜ | ⬜ | 未収録 |
| bp5 | ⬜ | ⬜ | 未作成 |
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
| 1 | LL-bp1 クロス | メンバー | ✅ | `LL-bp1-001-R＋` — [niji-bp1](./niji-bp1-verification-list.md) で横展開確認済 |
| 2 | LL-bp2 クロス | メンバー | ⬜ | `LL-bp2-001-R＋` |
| 3 | LL-bp3 クロス | メンバー | ⬜ | `LL-bp3-001-R＋` — muse-bp3 リスト内に言及 |
| 4 | LL-bp4 クロス | メンバー | ⬜ | `LL-bp4-001-R＋` — mus-bp4 リスト内に言及 |
| 5 | LL-bp6 クロス | メンバー | ⬜ | `LL-bp6-001-R＋` |
| 6 | LL-bp5 | ライブ | ⬜ | `LL-bp5-001-L` Live with a smile! |
| 7 | LL-bp5 | ライブ | ⬜ | `LL-bp5-002-L` Bring the LOVE! |
| 8 | PL!HS-cl1 | メンバー | ⬜ | 8 枚 — Edelied 等は [play-verification-list](./play-verification-list.md) B 項 |
| 9 | PL!HS-cl1 | ライブ | ⬜ | 4 枚 |
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

## 6. 推奨作業順

1. **🔄 一部済**の bp ライブ／メンバーを `[ ]` 解消（Aqours bp2/bp3、Liella bp4、Niji bp3/bp4、μ's bp3/bp4）
2. **⬜ 未着手** bp（各スクール bp5/bp6、虹 bp2、Liella bp3 等）
3. **pb1** 全スクール（蓮 pb1 ✅、Liella pb2 ✅ を横展開参考に）
4. **スタートデッキ** 5 種
5. **アニバーサリー** 12 区分
6. **PR** 個別（複雑カード・ユーザー報告優先）

---

## 7. 関連コマンド

```bash
# 代表カード回帰（例）
node scripts/verify-niji-bp1.mjs
node scripts/verify-hasunosora-bp1.mjs
node scripts/verify-muse-pr.mjs
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
| 2026-06-28 | PL!HS-PR-021-RM/PR 登場ミル条件成立時の heart01 付与漏れ（`toujou_deck_top_wait_if_all_heart` で inline 付与文未抽出） |
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
