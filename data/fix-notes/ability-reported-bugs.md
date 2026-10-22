# 報告バグ11件 — 修正記録

生成日: 2026-05-20

`node scripts/verify-ability-coverage.mjs` → **OK**（guided_manual=0 維持）

## 共通基盤修正

| 箇所 | 内容 |
|------|------|
| `js/cardGroups.js` | Aqours / SaintSnow タグ追加、EdelNote マッチ拡張 |
| `js/abilityEffects.js` | 「」内トリガーを分割しない、`parseAbilityPickFilters` の成功ライブ誤マッチ修正、`heartSlotsAny` / `deckTopPickMax` |
| `js/simulator.js` | `grantHeartSlotUntilLiveEnd(0)` 対応、ALLハートの有色代用、新 template handler、選択肢実行拡張 |

## 新規 template

- `draw_then_hand_to_deck_bottom`
- `kidou_self_wait_stage_member_swap_recover`
- `live_start_center_series_blade_set`
- `live_start_edelnote_blade_heart_pair`

---

## 1. PL!S-sd1-002-SD（桜内梨子・登場）

**template:** `toujou_wait_pick_hand`（filters.seriesTag=Aqours）

**修正:** `cardGroups.js` に Aqours ルール追加 → `catalogCardMatchesGroupTag` がサンシャイン!! カードを Aqours 判定

**再現手順:**
1. ソロ対戦、控え室に Aqours メンバー or ライブを1枚以上
2. 桜内梨子を登場
3. 任意で手札1枚捨て → 控え室から Aqours を1枚手札へ

---

## 2. PL!S-sd1-017-SD（小原鞠莉・登場）

**template:** `draw_then_hand_to_deck_bottom`

**修正:** 分類追加 + handler（1枚ドロー → 手札1枚を山札の一番下へ）

**再現手順:**
1. 山札2枚以上、手札1枚以上
2. 小原鞠莉登場 → 1枚引く → 手札から1枚選び山札下へ

---

## 3. PL!S-bp3-006-P（津島善子・起動）

**template:** `kidou_self_wait_stage_member_swap_recover`

**修正:** 善子をウェイト → 他 Aqours をステージから控え室 → コスト（退場者+2）で同エリアに登場

**再現手順:**
1. 善子をセンター、他 Aqours をステージ、控え室にコスト合致メンバー
2. 起動（手札1枚捨て）→ 退場する Aqours 選択 → 控え室から回収

---

## 4. PL!S-bp5-004-P（黒澤ダイヤ・登場）

**template:** `ability_pick_one`

**修正:** `executeAbilityChoiceText` に Aqours ブレード付与・SaintSnow ポジションチェンジ分岐

**再現手順:**
1. ダイヤ登場 → 3択表示
2. Aqours 選択 → ステージメンバー選択 → ブレード付与
3. または SaintSnow 選択 → ポジションチェンジ

---

## 5. PL!S-bp6-020-L（冒険Type A, B, C!!・ライブ開始）

**template:** `ability_pick_one`（3択）

**修正:** `splitAbilityByTriggers` が「」内 `{{live_success}}` で本文切断しないよう変更

**再現手順:**
1. ライブ開始 → 3択ダイアログ
2. ① 成功時ドロー付与 ② バトン Aqours にハート ③ 成功ライブ2+で+1

---

## 6. PL!HS-pb1-030-L（Edelied・ライブ開始）

**template:** `live_start_edelnote_blade_heart_pair`

**修正:** 2段階選択（EdelNote にブレード2 → 別名 EdelNote に紫ハート2）

**再現手順:**
1. ステージに EdelNote メンバー2人以上
2. ライブ開始 → ブレード対象選択 → ハート対象選択

---

## 7. PL!-bp5-011-N / PL!-bp3-012-N（ライブ開始）

**template:** `heart_color_pick_grant`（heartPerSuccessLive=true）

**修正:**
- `grantHeartSlotUntilLiveEnd`: `count||1` バグ修正（0枚で1付与されない）
- 成功ライブ0枚時はダイアログ前にスキップ
- `successLiveAreaLiveCardCount()` はライブカードのみカウント

**再現手順:**
1. 成功ライブ置き場0枚 → ハート色選択前にスキップ（0付与）
2. ライブ2枚置き場 → 色選択 → 2ハート付与

---

## 8. PL!S-bp2-005-P（渡辺曜・登場）

**template:** `deck_top_pick_recover`（deckTopPickMax=3, heartSlotsAny=[2,4,5]）

**修正:** 山札7枚見て最大3枚まで連続選択で手札に

**再現手順:**
1. 任意コスト後、山札7枚以上
2. heart02/04/05 メンバーを最大3枚まで選択

---

## 9. PL!SP-sd2-023-SD2（始まりは君の空・ライブ開始）

**template:** `live_card_score_plus`（minSuccessLiveCount=2）

**修正:** `parseAbilityPickFilters` が「成功ライブ」を「ライブ枠」に誤マッチしないよう修正

**再現手順:**
1. 成功ライブ置き場にライブ2枚以上
2. ライブ開始 → このカードのスコア+5

---

## 10. PL!SP-bp4-025-L（Special Color）

**live_start template:** `live_start_center_series_blade_set`（bladeSetCount=3）  
**live_success template:** `live_card_score_plus`（requiresCenterMemberMovedThisTurn=true）

**修正:** センター Liella! ブレード3固定、成功時は移動条件チェック

**再現手順:**
1. ライブ開始 → センター Liella! のブレードが3に
2. ライブ成功 → センター Liella! がこのターン移動していれば+1（未移動なら不発）

---

## 11. PL!N-bp1-012-P（鐘嵐珠・常時）

**jouji kind:** `blade_conditional`（ALL slot7 ×2 + ブレード2）

**修正:** `evaluateLiveMechanicalFulfillmentBundle` でメンバー ALL を `wildcardBhAllFlex` に合成 → 有色ハート不足の代用に使用

**再現手順:**
1. ライブ枠にライブ3枚以上、うち虹ヶ咲ライブ1枚以上
2. 嵐珠の常時で ALL+2 表示
3. ライブ判定で桃/赤等の不足が ALL で充当されること

---

## 残件・要プレイ確認

- 実プレイでの手動確認は未実施（verify は handler 存在 + 分類のみ）
- 対戦（versus）同期はスコープ外
- `PL!SP-sd2-023-SD2` はスコア+5 のみ自動化（必要ハート変更は別途）
