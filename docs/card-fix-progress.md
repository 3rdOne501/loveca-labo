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
| bp6 | ⬜ | ⬜ | 未作成 |

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
| 10 | LL-PR | ライブ | ⬜ | `LL-PR-004-PR` 愛♡スクリ～ム！ — 複雑カード #67 |
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

> `PL!SP-sd2` は別商品のため本リスト 5 種には含めない（必要なら行を追加）。

---

## 5. PR カード（個別）

能力付き PR は **1 カード = 1 行**で管理。エネルギー PR・能力なしは除外。

### 修復済み（代表・play リスト / 個別修正済）

| ID | 名前 | 備考 |
|----|------|------|
| PL!SP-pb1-001-PR | 澁谷かのん | [play-verification-list](./play-verification-list.md) A |
| PL!-PR-014-PR | 園田海未 | play A — 相手手札公開 |
| PL!HS-PR-032-PR | セラス柳田リリエンフェルト | play A — スコア6+ライブ回収 |
| PL!SP-pb2-009-R | 鬼塚夏美 | 元々ブレード比較（登場/開始） |

### 未着手（能力付き PR 一覧 — 要個別検証）

| 接頭 | 枚数（メンバー/ライブ） | 状態 |
|------|------------------------|------|
| `PL!-PR` | 14 メンバー | ⬜ 個別 |
| `PL!S-PR` | 26 メンバー + 3 ライブ | ⬜ 個別 |
| `PL!N-PR` | 25 メンバー | ⬜ 個別 |
| `PL!SP-PR` | 17 メンバー | ⬜ 個別 |
| `PL!HS-PR` | 27 メンバー + 4 ライブ | ⬜ 個別 |
| `LL-PR` | 1 ライブ + 複雑 1 件 | ⬜ 個別 |

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

# 全文監査（例）
node scripts/audit-niji-bp1-text.mjs

# 横断カバレッジ
node scripts/verify-ability-coverage.mjs
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-06-28 | 蓮ノ空 sd1 修正（003/005/006/008/013）。スタートデッキ 6/10 完了 |
| 2026-06-28 | Liella! sd1 DUO 修正（001 エネルギー枚数ドロー、002 占有エリア登場）。スタートデッキ 5/10 完了 |
| 2026-06-28 | μ's bp3 ライブ修正（019/023/025）。完全修復 bp +1 |
