import { parseBugReport, looksLikeBugReport } from "./parseBugReport.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed");
}

{
  const r = parseBugReport(`カード番号：PL!S-bp3-006-SEC
バグ内容：起動使うと善子も控え行く
追記（あれば）：急ぎ`);
  assert(r.ok, "ok");
  assert(r.cardNos[0] === "PL!S-bp3-006-SEC", "card");
  assert(r.bug.includes("控え"), "bug");
  assert(r.note === "急ぎ", "note");
}

{
  const r = parseBugReport(`カード番号：PL!A-1, PL!B-2
バグ内容：壊れてる`);
  assert(r.ok && r.cardNos.length === 2, "multi");
  assert(r.note === "", "empty note");
}

{
  const r = parseBugReport("ただの雑談");
  assert(!r.ok, "reject");
  assert(!looksLikeBugReport("ただの雑談"), "looks");
}

console.log("parseBugReport.test.js OK");
