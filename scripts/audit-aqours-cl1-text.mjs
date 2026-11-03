#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { classifyCardAbility, splitAbilityByTriggers, cardAbilityRawText } from "../js/abilityEffects.js";
import { classifyJidouAutoSegment } from "../js/jidouAutoEffects.js";

const cards = JSON.parse(fs.readFileSync(new URL("../data/cards.json", import.meta.url)));
// Explicit text contract: upstream changes must trigger a new semantic review.
const evidence = [
  [/デッキの上からカードを5枚控え室/],
  [/『Aqours』のカードを3枚まで/, /好きな順番でデッキの下/],
  [/このメンバーをステージから控え室に置く：/, /『Aqours』のカードを1枚手札/],
  [/\[センター\]/, /turn1\.png/, /ライブカードが2枚以上/, /元々持つハートの数が4つ以下/],
  [/デッキの一番上のカードを見る/, /一番下に置いてもよい/],
  [/手札を1枚デッキの一番下に置いてもよい：/, /icon_blade\.png.*icon_blade\.png/],
  [/手札を1枚控え室に置いてもよい：/, /デッキの上から行う代わりにデッキの下から/],
  [/turn1\.png/, /このメンバーをウェイトにし、手札を1枚控え室に置く：カードを1枚引く/],
  [/このメンバーをステージから控え室に置く：/, /メンバーカードを1枚手札/],
  [/icon_score\.png/, /icon_b_all\.png/, /blade_heart07\.png/, /センターエリア/, /置いたカード1枚につき/],
  [/『Aqours』のメンバーが3人以上/, /それらのメンバーが同じ色のハート/, /その色のハートを持つ/],
  [/成功ライブカード置き場/, /各ライブカードにつき/, /同じカード名/, /好きな順番でデッキの上/],
  [/ブレードハートを持たない『Aqours』のメンバーカードを6枚まで/, /それらをシャッフル/, /置いたカード2枚につき/, /heart_05\.png.*heart_05\.png/],
];
for (let i = 0; i < evidence.length; i++) {
  const id = `PL!S-cl1-${String(i + 1).padStart(3, "0")}-CL`;
  const card = cards[id];
  const raw = cardAbilityRawText(card);
  for (const re of evidence[i]) assert.match(raw, re, id);
  const segments = splitAbilityByTriggers(raw);
  assert.equal(segments.length, 1, id);
  const seg = segments[0];
  const cl = seg.trigger === "jidou" ? classifyJidouAutoSegment(seg.text) : classifyCardAbility(card, seg.trigger, seg.text);
  assert.ok(!["guided_manual", "jidou_manual", "none"].includes(cl.template), id);
}
console.log("audit-aqours-cl1-text OK: 9 members / 4 lives; 3 energy cards have no abilities");
