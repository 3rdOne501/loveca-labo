# プレミアムブースター pb1 横断検証（Aqours / 虹ヶ咲 / Liella!）

μ's は [muse-pb1-verification-list.md](./muse-pb1-verification-list.md)、蓮ノ空は [hasunosora-pb1-verification-list.md](./hasunosora-pb1-verification-list.md) を参照。

## コマンド

```bash
node scripts/verify-aqours-pb1.mjs   # 22 cases
node scripts/verify-niji-pb1.mjs     # 38 cases
node scripts/verify-liella-pb1.mjs   # 22 cases
node scripts/audit-pb1-text.mjs      # 全4スクール全文監査
```

## Aqours（PL!S-pb1）

| 状態 | 区分 | 能力あり枚数 | 結果 |
|------|------|-------------|------|
| [x] | メンバー+ライブ | 22 トリガー | verify 22/22、guided_manual=0 |

代表: 002 桜内梨子 `toujou_opp_optional_live_discard_or_score`、008 小原鞠莉 `deck_top_look_reorder`（自/相手山札2枚）

## 虹ヶ咲（PL!N-pb1）

| 状態 | 区分 | 能力あり枚数 | 結果 |
|------|------|-------------|------|
| [x] | メンバー+ライブ | 38 トリガー | verify 38/38、guided_manual=0 |

## Liella!（PL!SP-pb1）

| 状態 | 区分 | 能力あり枚数 | 結果 |
|------|------|-------------|------|
| [x] | メンバー+ライブ | 22 トリガー | verify 22/22、guided_manual=0 |

## 2026-06-28 初回監修

全3スクール分類OK。新規ハンドラ修正なし。`scripts/lib/pb1-verify.mjs` でケース自動生成。
