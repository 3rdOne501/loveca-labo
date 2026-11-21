# PR: jidou 未実装 handler 4 クラスタ（A/B/C）

## 対象 template クラスタ

| template | card_no | 件数 |
|----------|---------|------|
| `jidou_leave_stage_hand_pick_recover` | PL!S-bp2-002-R/P, PL!HS-bp6-017-N | 3 |
| `jidou_leave_stage_deck_look_pick` | PL!HS-bp2-012-N, PL!HS-bp2-013-N | 2 |
| `jidou_area_move_wait_pick_hand` | PL!SP-bp4-007-R/P | 2 |
| `jidou_leave_stage_position_change` | PL!HS-bp5-003-R+/P/AR/SEC | 4 |

## 変更内容

### Layer A — `js/jidouAutoEffects.js`
- `jidou_leave_stage_hand_pick_recover`: メンバー/ライブの pickType を能力文から判定
- HS-bp6-017-N 向け `pickDualLiveMember` フィルタ（ライブ+メンバー各1枚まで）

### Layer B — 前提条件
- 変更なし（leave_stage / area_move イベントは既存 `fireJidouAutoForMember` で発火）

### Layer C — `js/simulator.js` `runJidouAutoEffect`
- 上記 4 template の handler を追加
- guided_manual への退避なし

---

## 再現手順

### 1. `jidou_leave_stage_hand_pick_recover`（桜内梨子 PL!S-bp2-002-R）
1. ソロ対戦、桜内梨子をステージに配置
2. 手札1枚以上、控え室に『Aqours』ライブ1枚以上を用意
3. 梨子を控え室へ（効果でウェイト移動 or バトン退場）
4. 「手札を控え室へ（任意）」→ 1枚捨て → 控え室から Aqours ライブを手札へ

### 2. `jidou_leave_stage_hand_pick_recover` dual（日野下花帆 PL!HS-bp6-017-N）
1. 花帆をステージ配置、手札1枚、控え室にライブ+メンバー各1枚以上
2. 花帆を控え室へ
3. 手札1枚捨て → ライブ回収ダイアログ → メンバー回収ダイアログ（各スキップ可）

### 3. `jidou_leave_stage_deck_look_pick`（乙宗梢 PL!HS-bp2-012-N）
1. 梢をステージ、山札5枚以上
2. 梢を控え室へ
3. 山札上5枚表示 → メンバー1枚（任意）を手札、残り控え室

### 4. `jidou_area_move_wait_pick_hand`（米女メイ PL!SP-bp4-007-R）
1. メイをステージ、控え室にスコア3以下『Liella!』ライブ1枚
2. メイをポジションチェンジ or バトンでエリア移動
3. 控え室から対象ライブが手札へ

### 5. `jidou_leave_stage_position_change`（大沢瑠璃乃 PL!HS-bp5-003-R+）
1. 瑠璃乃+他メンバー2人以上をステージ
2. 瑠璃乃を控え室へ
3. 残りメンバー1人を選び → ポジションチェンジ先を選択

---

## verify コマンド結果

```
$ node scripts/verify-ability-handlers.mjs
=== verify-ability-handlers ===
runJidouAutoEffect handlers: 33  (was 29)
verify-ability-handlers OK
(warnings: 0)

$ node scripts/verify-ability-coverage.mjs
verify-ability-coverage OK

$ node --check js/simulator.js && node --check js/jidouAutoEffects.js
(syntax OK)
```
