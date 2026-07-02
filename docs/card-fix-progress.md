# カード効果 修復進行リスト

シミュレータのカード文通り実装を、商品単位で進めるための一覧。**詳細は各 `*-verification-list.md` を正**とする。

## 凡例

| 記号 | 意味 |
|------|------|
| ✅ | **修復済み** — 分類・ハンドラ・静的検証 OK（`verify-*.mjs` / `audit-*-text.mjs` 通過、または能力なし確認済） |
| ⭕️ | **2回監修済み** — 上記に加え、ライブ（またはメンバー）区分の **2回目** 深掘り完了 |
| 🔄 | **一部済** — 詳細リストあり。未チェック `[ ]` または修正残あり |
| ⬜ | **未着手** — 専用検証リスト・スクリプトなし |
| — | **該当なし** — 実カード未発売・当該カテゴリのカードなし |

**1 行 = 1 作業単位**（メンバー一括 / ライブ一括）。各 bp は 3 ユニット分のカードを含むが、検証は **メンバー・ライブの 2 区分**で進める。

---

## サマリー（2026-06-30 時点）

| 区分 | 完全修復 ✅ | 一部済 🔄 | 未着手 ⬜ |
|------|------------|----------|----------|
| ブースター bp（行単位） | **13** | **6** | **49** |
| プレミアム pb（行単位） | **11** | 0 | **0** |
| アニバーサリー（12 区分） | **10**⭕️ | 0 | **2** |
| スタートデッキ（10 区分） | **6**⭕️ | 0 | **4** |
| PR | **6**⭕️ | 0 | 0 |

**完全修復 ✅（bp）**: 収録済み bp は **全区分 ⭕️⭕️**（2026-06-30 時点）。未収録: Aqours bp4、虹 bp2/bp6、Liella bp3/bp6、蓮 bp3/bp4

**完全修復 ✅（pb）**: 収録済み pb は全て完了（μ's / Aqours / 虹ヶ咲 / Liella! pb1、蓮 pb1、Liella pb2）。μ's に pb2–pb5 は**商品なし**

---

## 1. ブースターパック（bp1–bp6）

各スクール × 各弾。**メンバー**と**ライブ**を別行で管理（計 6 弾 × 5 スクール × 2 = 最大 60 行、実在分のみ記載）。

### μ's（`PL!-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | — | — | 本編未収録（エネルギーのみ） |
| bp2 | — | — | 実カード未発売 |
| bp3 | ⭕️ | ⭕️ | [muse-bp3-verification-list.md](./muse-bp3-verification-list.md) **2026-06-30 2回監修完了**（007 3分割山札、008 ウェイト対象heart03×2） |
| bp4 | ⭕️ | ⭕️ | [mus-bp4-verification-list.md](./mus-bp4-verification-list.md) **2026-06-30 2回監修完了**（002/005/019–023 再確認） |
| bp5 | ⭕️ | ⭕️ | [muse-bp5-verification-list.md](./muse-bp5-verification-list.md) **2026-06-30 2回監修完了**（004 E4、111 jouji、002/222 必須ウェイト） |
| bp6 | ⭕️ | ⭕️ | [muse-bp6-verification-list.md](./muse-bp6-verification-list.md) **2026-06-28 ライブ2回監修**（020 FAQ255 / 021任意確認） |

### Aqours（`PL!S-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | — | — | 本編未収録 |
| bp2 | ⭕️ | ⭕️ | [aqours-bp2-verification-list.md](./aqours-bp2-verification-list.md) **2026-06-30 2回監修完了**（008 全エリア条件・エール段階スコア） |
| bp3 | ⭕️ | ⭕️ | [aqours-bp3-verification-list.md](./aqours-bp3-verification-list.md) **2026-06-30 2回監修完了**（メンバー001/005/008、ライブは再確認のみ） |
| bp4 | — | — | 実カード未発売 |
| bp5 | ⭕️ | ⭕️ | [aqours-bp5-verification-list.md](./aqours-bp5-verification-list.md) **2026-06-30 2回監修完了**（007 heart04×2、006必須ウェイト） |
| bp6 | ⭕️ | ⭕️ | [aqours-bp6-verification-list.md](./aqours-bp6-verification-list.md) **2026-06-28 ライブ2回監修完了**（023 他） |

### 虹ヶ咲（`PL!N-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ⭕️ | ⭕️ | [niji-bp1-verification-list.md](./niji-bp1-verification-list.md) **2026-06-30 2回監修完了**（メンバー004/006/008） |
| bp2 | — | — | 実カード未発売 |
| bp3 | ⭕️ | ⭕️ | [niji-bp3-verification-list.md](./niji-bp3-verification-list.md) **2026-06-30 2回監修完了**（001 全ステージブレード、013 E下+ドロー） |
| bp4 | ⭕️ | ⭕️ | [niji-bp4-verification-list.md](./niji-bp4-verification-list.md) **2026-06-30 2回監修完了**（011 ライブ回収・007/025/026 再確認） |
| bp5 | ⭕️ | ⭕️ | [niji-bp5-verification-list.md](./niji-bp5-verification-list.md) **2026-06-30 2回監修完了**（015/026 全6色ハート合算、012/013 他） |
| bp6 | — | — | 実カード未発売 |

### Liella!（`PL!SP-bp*` / クロス `LL-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ⭕️ | ⭕️ | [liella-bp1-verification-list.md](./liella-bp1-verification-list.md) **2026-06-30 2回監修完了** |
| bp2 | ⭕️ | ⭕️ | [liella-bp2-verification-list.md](./liella-bp2-verification-list.md) **2026-06-30 2回監修完了** |
| bp3 | — | — | 実カード未発売 |
| bp4 | ⭕️ | ⭕️ | [liella-bp4-verification-list.md](./liella-bp4-verification-list.md) **2026-06-30 2回監修完了** |
| bp5 | ⭕️ | ⭕️ | [liella-bp5-verification-list.md](./liella-bp5-verification-list.md) **2026-06-30 2回監修完了**（005 ミル比例ブレード、015 センター限定、009/023 他） |
| bp6 | — | — | 実カード未発売 |

### 蓮ノ空（`PL!HS-bp*`）

| 弾 | メンバー | ライブ | 詳細リスト |
|----|---------|--------|-----------|
| bp1 | ⭕️ | ⭕️ | [hasunosora-bp1-verification-list.md](./hasunosora-bp1-verification-list.md) **2026-06-30 2回監修完了** |
| bp2 | ⭕️ | ⭕️ | [hasunosora-bp2-verification-list.md](./hasunosora-bp2-verification-list.md) **2026-06-30 2回監修完了** |
| bp3 | — | — | 実カード未発売 |
| bp4 | — | — | 実カード未発売 |
| bp5 | ⭕️ | ⭕️ | [hasunosora-bp5-verification-list.md](./hasunosora-bp5-verification-list.md) **2026-06-30 2回監修完了**（001 ミル条件ブレード、003 同グループメンバー付与、005/022 他） |
| bp6 | ⭕️ | ⭕️ | [hasunosora-bp6-verification-list.md](./hasunosora-bp6-verification-list.md) **2026-06-30 2回監修完了**（013 登場時 DOLLCHESTRA 除外） |

---

## 2. プレミアムブースター（pb1–pb5）

各スクール × pb1〜pb5。**メンバー / ライブ**の 2 区分（`cards.json` に存在する pb のみ）。

| スクール | pb1 メンバー | pb1 ライブ | pb2 | pb3 | pb4 | pb5 | 詳細リスト |
|---------|-------------|-----------|-----|-----|-----|-----|-----------|
| μ's | ⭕️ | ⭕️ | — | — | — | — | [muse-pb1-verification-list.md](./muse-pb1-verification-list.md) **2026-06-30 2回監修完了**（003/007 メンバー、029/030/032 ライブ） |
| Aqours | ⭕️ | ⭕️ | — | — | — | — | [aqours-pb1-verification-list.md](./aqours-pb1-verification-list.md) **2026-06-30 2回監修完了**（013–015/020/021） |
| 虹ヶ咲 | ⭕️ | ⭕️ | — | — | — | — | [niji-pb1-verification-list.md](./niji-pb1-verification-list.md) **2026-06-30 2回監修完了**（001/009 メンバー、038/039 ライブ） |
| Liella! | ⭕️ | ⭕️ | ⭕️ | — | — | — | pb1 [liella-pb1-verification-list.md](./liella-pb1-verification-list.md) **2026-06-30 2回監修完了** / pb2 [liella-pb2-verification-list.md](./liella-pb2-verification-list.md) **2026-06-30 2回監修完了** |
| 蓮ノ空 | ⭕️ | ⭕️ | — | — | — | — | [hasunosora-pb1-verification-list.md](./hasunosora-pb1-verification-list.md) **2026-06-30 2回監修完了**（008 自+相手一括ウェイト） |

> μ's は **pb1 のみ**（pb2–pb5 は発売なし）。Liella! は pb2 まで。他スクール・蓮ノ空は pb1 のみ。蓮 **bp**2 は [hasunosora-bp2-verification-list.md](./hasunosora-bp2-verification-list.md) 参照（pb とは別商品）。

---

## 3. アニバーサリー（12 区分）

5 コンテンツ ×（メンバー / ライブ）+ ライブのみ 2 区分 = **12 作業単位**。

| # | コンテンツ | 区分 | 状態 | 備考 |
|---|-----------|------|------|------|
| 1 | LL-bp1 クロス | メンバー | ⭕️ | [ll-anniversary-member-verification-list.md](./ll-anniversary-member-verification-list.md) **2026-06-30 2回監修**（001 任意コスト0枚スキップ） |
| 2 | LL-bp2 クロス | メンバー | ⭕️ | [ll-anniversary-member-verification-list.md](./ll-anniversary-member-verification-list.md) **2026-06-30 2回監修** |
| 3 | LL-bp3 クロス | メンバー | ⭕️ | 同上（園田海未&善子&璃奈） |
| 4 | LL-bp4 クロス | メンバー | ⭕️ | 同上（絢瀬絵里&果林&恋） |
| 5 | LL-bp6 クロス | メンバー | ⭕️ | 同上（ことり&ダイヤ&小鈴・ハート色和集合） |
| 6 | LL-bp5 | ライブ | ⭕️ | [ll-bp5-verification-list.md](./ll-bp5-verification-list.md) **2026-06-30 2回監修**（001 OR条件・002 FAQ225） |
| 7 | LL-bp5 | ライブ | ⭕️ | 同上 `LL-bp5-002-L` Bring the LOVE! |
| 8 | PL!HS-cl1 | メンバー | ⭕️ | [hasunosora-cl1-verification-list.md](./hasunosora-cl1-verification-list.md) **2026-06-30 2回監修** |
| 9 | PL!HS-cl1 | ライブ | ⭕️ | 同上 **009/010/011/012 再確認** |
| 10 | LL-PR | ライブ | ⭕️ | [ll-pr-verification-list.md](./ll-pr-verification-list.md) **2026-06-30 2回監修**（004 愛♡スクリ～ム！） |
| 11 | LL-PR | エネルギー | — | 能力なし PR（検証対象外） |
| 12 | （予備） | — | ⬜ | 新アニバ商品追加時に行を割当 |

> #11 LL-PR エネルギーは能力なし。#1–10 は **2026-06-30 2回監修完了**（計25 verify ケース）。

---

## 4. スタートデッキ（10 区分）

5 種類 ×（メンバー / ライブ）。

| デッキ | ID 接頭 | メンバー | ライブ | 状態 |
|--------|---------|---------|--------|------|
| μ's sd1 | `PL!-sd1` | ⭕️ | ⭕️ | [mus-sd1-verification-list.md](./mus-sd1-verification-list.md) **2026-06-30 2回監修完了**（006 SL空時スキップ修正） |
| Aqours sd1 | `PL!S-sd1` | ⭕️ | ⭕️ | [aqours-sd1-verification-list.md](./aqours-sd1-verification-list.md) **2026-06-30 2回監修完了** |
| 虹ヶ咲 sd1 | `PL!N-sd1` | ⭕️ | ⭕️ | [niji-sd1-verification-list.md](./niji-sd1-verification-list.md) **2026-06-30 2回監修完了** |
| Liella! sd1 | `PL!SP-sd1` | ⭕️ | ⭕️ | [liella-sd1-verification-list.md](./liella-sd1-verification-list.md) **2026-06-30 2回監修完了** |
| 蓮ノ空 sd1 | `PL!HS-sd1` | ⭕️ | ⭕️ | [hasunosora-sd1-verification-list.md](./hasunosora-sd1-verification-list.md) **2026-06-30 2回監修完了** |
| Liella! sd2 cheer | `PL!SP-sd2` | ⭕️ | ⭕️ | [liella-sd2-verification-list.md](./liella-sd2-verification-list.md) **2026-06-30 2回監修完了** |

> `PL!SP-sd2` は sd1 DUO とは別商品（cheer）。上記 6 行目として追加。

---

## 5. PR カード（全スクール一括）

能力付き PR はスクール接頭ごとに管理。エネルギー PR・能力なし・リマインダー文のみは対象外。

### 修復済み（play リスト等）

| ID | 名前 | 備考 |
|----|------|------|
| PL!SP-pb1-001-PR | 澁谷かのん | [play-verification-list](./play-verification-list.md) A |
| PL!-PR-014-PR | 園田海未 | play A — 相手手札公開 |
| PL!HS-PR-032-PR | セラス柳田リリエンフェルト | play A — スコア6+ライブ回収 |
| PL!SP-pb2-009-R | 鬼塚夏美 | 元々ブレード比較（登場/開始） |

### スクール別（2回監修 ⭕️）

| 接頭 | 能力付き | 状態 | リスト |
|------|---------|------|------|
| `PL!-PR` | 14 メンバー | ⭕️ | [muse-pr-verification-list.md](./muse-pr-verification-list.md) **2026-06-30 2回監修完了** |
| `PL!S-PR` | 20 メンバー | ⭕️ | [aqours-pr-verification-list.md](./aqours-pr-verification-list.md) **2026-06-30 2回監修完了** |
| `PL!N-PR` | 22 メンバー | ⭕️ | [niji-pr-verification-list.md](./niji-pr-verification-list.md) **2026-06-30 2回監修完了** |
| `PL!SP-PR` | 15 メンバー | ⭕️ | [liella-pr-verification-list.md](./liella-pr-verification-list.md) **2026-06-30 2回監修完了** |
| `PL!HS-PR` | 21 メンバー + 3 ライブ | ⭕️ | [hasunosora-pr-verification-list.md](./hasunosora-pr-verification-list.md) **2026-06-30 2回監修完了** |
| `LL-PR` | 1 ライブ | ⭕️ | [ll-pr-verification-list.md](./ll-pr-verification-list.md) **2026-06-30 2回監修完了** |

一括: `node scripts/audit-all-pr.mjs`（verify 6 + audit 6 = **12 スクリプト / 70 verify ケース**）

詳細索引: [complex-risky-cards.md](./complex-risky-cards.md) / [play-verification-list.md](./play-verification-list.md)

---

## 6. 推奨作業順（2026-06-30）

1. **Aqours bp4** / **虹 bp2** / **Liella bp3** — `cards.json` 未収録。追加後に verify/audit 新設
2. **PR** 全スクール ⭕️ 完了（2026-06-30 一括2回監修）。未収録 sd2 等（4 区分）
3. **🔄 一部済**の bp を `[ ]` 解消（収録済み商品があれば）

---

## 7. 関連コマンド

```bash
# 代表カード回帰（例）
node scripts/verify-niji-bp1.mjs
node scripts/verify-hasunosora-bp1.mjs
node scripts/verify-muse-pb1.mjs
node scripts/verify-aqours-pb1.mjs
node scripts/verify-niji-pb1.mjs
node scripts/verify-liella-pb1.mjs
node scripts/audit-pb1-text.mjs
node scripts/verify-aqours-bp6.mjs
node scripts/audit-aqours-bp6-text.mjs
node scripts/verify-hasunosora-bp6.mjs
node scripts/audit-hasunosora-bp6-text.mjs
node scripts/verify-muse-pb1.mjs
node scripts/audit-muse-pb1-text.mjs
node scripts/verify-aqours-pb1.mjs
node scripts/verify-niji-pb1.mjs
node scripts/verify-liella-pb1.mjs
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
node scripts/verify-mus-sd1.mjs
node scripts/verify-aqours-sd1.mjs
node scripts/verify-niji-sd1.mjs
node scripts/verify-liella-sd1.mjs
node scripts/verify-hasunosora-sd1.mjs
node scripts/verify-liella-sd2.mjs

# 全文監査（例）
node scripts/audit-niji-bp1-text.mjs
node scripts/audit-niji-pr-text.mjs
node scripts/audit-liella-pr-text.mjs
node scripts/audit-hasunosora-pr-text.mjs
node scripts/audit-ll-pr-text.mjs
node scripts/audit-mus-sd1-text.mjs
node scripts/audit-aqours-sd1-text.mjs
node scripts/audit-niji-sd1-text.mjs
node scripts/audit-liella-sd1-text.mjs
node scripts/audit-hasunosora-sd1-text.mjs
node scripts/audit-liella-sd2-text.mjs

# 横断カバレッジ
node scripts/audit-all-pr.mjs
node scripts/verify-ability-coverage.mjs
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-06-30 | **PR 全スクール一括2回監修**: 能力付き93枚相当を cards.json 全文+分類精査。guided_manual 0。新規修正なし。audit-all-pr 12本/verify 70ケース OK。⭕️ |
| 2026-06-30 | Liella! sd2 cheer 2回監修: 収録25枚精査。008/020 初回修正の再確認。024 リマインダー文のみ。新規修正なし。verify 10/audit OK。⭕️⭕️ |
| 2026-06-30 | 蓮 sd1 2回監修: 収録20枚精査。006 LS任意E→ブレード2含む再確認。新規修正なし。verify 15/audit OK。⭕️⭕️ |
| 2026-06-30 | Liella! sd1 DUO 2回監修: 収録26枚精査。新規修正なし。verify 14/audit OK。⭕️⭕️ |
| 2026-06-30 | 虹 sd1 2回監修: 収録28枚精査。025–027 リマインダー文のみ。新規修正なし。verify 30/audit OK。⭕️⭕️ |
| 2026-06-30 | Aqours sd1 2回監修: 収録22枚精査。新規修正なし。verify 22/audit OK。⭕️⭕️ |
| 2026-06-30 | μ's sd1 2回監修: 収録22枚精査。006 成功ライブ0枚時スキップ修正。verify 23/audit OK。⭕️⭕️ |
| 2026-06-30 | 虹 bp3 メンバー2回監修: 001 E下+全ステージブレード / 013 E下+2ドロー。verify 17ケース。bp3 完全⭕️ |
| 2026-06-30 | 蓮 bp5 メンバー2回監修: 001 ミル条件ブレード / 003 同グループメンバーheart01。verify 25ケース。bp5 完全⭕️ |
| 2026-06-30 | **アニバーサリー 2回監修完了**（#1–10）: LL-bp1 任意コスト0枚スキップ修正。verify 計25ケース。LL-bp5/cl1/LL-PR 再確認 |
| 2026-06-30 | Liella! bp2/bp4 2回監修: 再確認のみ。verify 14+33ケース。bp2/bp4 完全⭕️ |
| 2026-06-30 | 蓮ノ空 bp2 2回監修: 再確認のみ。verify 21ケース。bp2 完全⭕️ |
| 2026-06-30 | μ's bp4 2回監修: 全50枚再確認・新規修正なし。verify 29ケース。bp4 完全⭕️ |
| 2026-06-30 | 虹ヶ咲 bp4 2回監修: 全68枚再確認・新規修正なし。verify 39ケース。bp4 完全⭕️ |
| 2026-06-30 | Liella! pb2 メンバー2回監修（000–041）: **004 LS条件ドロー修正**（drawOrPreconditions）。verify 37ケース |
| 2026-06-30 | Liella! pb2 ライブ2回監修（045–050）: 6枚再確認・コード修正なし。046/047 verify 追加。計16ケース |
| 2026-06-30 | Liella! pb2 2回監修: 全51枚再確認・新規修正なし。verify 14ケース |
| 2026-06-30 | Liella! bp5 メンバー2回監修: 005 ミル比例ブレード / 015 センター登場限定。verify 35ケース。bp5 完全⭕️ |
| 2026-06-30 | 虹ヶ咲 bp5 メンバー2回監修: 012 起動E下+ドロー+heart / 013 E下前提。verify 36ケース。bp5 完全⭕️ |
| 2026-06-30 | μ's bp5 メンバー2回監修完了: 004 起動E4（割引説明のE除外）。verify 26ケース。bp5 完全⭕️ |
| 2026-06-30 | μ's bp3 メンバー2回監修: 007 3分割山札振り分け / 008 ウェイト対象heart03×2。verify 15ケース。bp3 完全⭕️ |
| 2026-06-30 | Aqours pb1 2回監修: 013–015 山札公開メンバーorライブ / 020–021 ステージハート合計+相手余剰0成功 |
| 2026-06-30 | μ's pb1 ライブ2回監修: 029/030/032 条件フィルタ修正 |
| 2026-06-30 | μ's pb1 メンバー2回監修: 003 Printemps人数×E活性 / 007 成功ライブ減コスト+μ'sライブ回収 |
| 2026-06-30 | Aqours bp5 メンバー2回監修: 007 heart04×2回収条件。verify 29ケース。bp5 完全⭕️ |
| 2026-06-30 | Aqours bp3 メンバー2回監修: 001 センター起動 / 005 エール枚数比較 / 008 回収スコア条件。verify 22ケース |
| 2026-06-30 | 虹ヶ咲 bp5 メンバー2回監修: 015/026 ステージ合算6色ハート前提。verify 38ケース。bp5 完全⭕️ |
| 2026-06-30 | 蓮ノ空 bp6 2回監修: 013 登場時 DOLLCHESTRA 除外フィルタ。verify 42ケース |
| 2026-06-30 | 蓮ノ空 pb1 2回監修: 008 自+相手ステージ・元々ブレード3以下一括ウェイト。verify 16ケース。**pb1 全5スクール 2回監修完了** |
| 2026-06-30 | Liella! pb1 2回監修: 010 jouji E10+、023 CatChu FAQ Q97。verify 28ケース |
| 2026-06-30 | 虹ヶ咲 bp1 メンバー2回監修: 004/006/008 実行時バグ3件、verify 18ケース |
| 2026-06-30 | LL-bp 合体メンバー（001-R＋×5弾）: 複数行 series から3グループ表示・登場時3ロゴ。進行リストの未発売 bp を — に整理 |
| 2026-06-30 | **未着手一括**: 蓮 bp6（verify 42/42）、全スクール pb1（μ's 39 / Aqours 25 / 虹 46 / Liella 28 ケース）。新規コード修正なし |
| 2026-06-30 | **bp5 全5スクール2回監修**: 実行時バグ9クラスタ（111 jouji、必須ウェイト+任意手札、Niji 001/004/027、Liella 009/023、HS 005/022）。verify 計147ケース |
| 2026-06-30 | **bp5 全スクール再監修**: PL!SP-025-L 任意E×4スコア+1、PL!HS-013-N 山札ミル→条件ブレード。verify カバレッジ拡充（計147ケース） |
| 2026-06-30 | 蓮ノ空 bp5（PL!HS-bp5）: verify/audit 新設、分類OK（新規修正なし）— **Anniversary2026 bp5 全5スクール完了** |
| 2026-06-30 | Liella! bp5（PL!SP-bp5）: verify/audit 新設、分類OK（新規修正なし） |
| 2026-06-28 | **pb1 全4スクール初回監修**（μ's/Aqours/虹/Liella）: guided_manual=0、verify 計114ケース、`audit-pb1-text.mjs` 横断監査 |
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
