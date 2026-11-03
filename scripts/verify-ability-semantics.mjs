#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auditAbilityCatalog, discoverAbilityHandlers, extractAbilityRequirements, updateSemanticAuditHandoff, validateSemanticContracts } from "./lib/ability-semantic-audit.mjs";
import { classifyCardAbility } from "../js/abilityEffects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = JSON.parse(fs.readFileSync(path.join(ROOT, "data/cards.json")));
const contracts = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ability-semantic-contracts.json")));
const handlers = discoverAbilityHandlers([fs.readFileSync(path.join(ROOT, "js/simulator.js"), "utf8")]);
let tests = 0;
function test(name, fn) { fn(); tests++; console.log(`OK ${name}`); }
const scan = (card, options = {}, rules = contracts) => auditAbilityCatalog({ [card.card_no]: card }, rules, { handlers, ...options });
const issueKinds = (result) => result.records.flatMap((r) => r.issues.map((i) => `${i.code}:${i.kind}`));
const card = (ability, id = "TEST-001") => ({ card_no: id, name: "監査用", type: "メンバー", ability });

test("requirements are derived independently, with full-width numbers and cost destination", () => {
  const r = extractAbilityRequirements("手札を２枚デッキの一番下に置いてもよい：カードを３枚引く。");
  assert.ok(r.requirements.some((x) => x.kind === "cost.hand_to_bottom" && x.amount === 2));
  assert.ok(!r.requirements.some((x) => x.kind === "cost.hand_to_waiting"));
  assert.ok(r.requirements.some((x) => x.kind === "effect.draw" && x.amount === 3));
});
test("E2 / Eを支払う are not ignored", () => {
  assert.ok(extractAbilityRequirements("E2を支払う：カードを1枚引く。").requirements.some((r) => r.kind === "cost.energy" && r.amount === 2));
  assert.ok(extractAbilityRequirements("Eを支払う：カードを1枚引く。").requirements.some((r) => r.kind === "cost.energy"));
});
test("known implementation is checked without certifying all gameplay", () => {
  const r = scan(db["PL!S-cl1-001-CL"]);
  assert.equal(r.records[0].status, "checked_known_rules");
  assert.match(r.limitation, /保証しない/);
});
test("Yoshiko missing cost is detected despite an automated grant template", () => {
  const c = db["PL!S-cl1-006-CL"];
  const r = scan(c, { classify: (_, seg) => ({ ...classifyCardAbility(c, seg.trigger, seg.text), handDiscardToWaiting: null }) });
  assert.ok(issueKinds(r).includes("contract_mismatch:cost.hand_to_bottom"));
  assert.equal(r.records[0].status, "suspect");
});
test("wrong cost destination is detected", () => {
  const c = db["PL!S-cl1-006-CL"];
  const r = scan(c, { classify: (_, seg) => ({ ...classifyCardAbility(c, seg.trigger, seg.text), costHandToDeckBottom: false }) });
  assert.ok(issueKinds(r).includes("contract_mismatch:cost.hand_to_bottom"));
});
test("numeric mismatch is detected", () => {
  const c = db["PL!S-cl1-001-CL"];
  const r = scan(c, { classify: (_, seg) => ({ ...classifyCardAbility(c, seg.trigger, seg.text), deckTopCount: 4 }) });
  assert.ok(issueKinds(r).includes("contract_mismatch:effect.mill"));
});
test("missing shared-color condition is detected", () => {
  const c = db["PL!S-cl1-011-CL"];
  const r = scan(c, { classify: (_, seg) => ({ ...classifyCardAbility(c, seg.trigger, seg.text), requiresStageSharedHeartColor: false }) });
  assert.ok(issueKinds(r).includes("contract_mismatch:condition.shared_stage_color"));
});
test("wrong stage group count and group tag are detected", () => {
  const c = db["PL!S-cl1-011-CL"];
  const r = scan(c, { classify: (_, seg) => ({ ...classifyCardAbility(c, seg.trigger, seg.text), preconditionFilters: { minStageSeriesMembers: 2, minStageSeriesMembersTag: "Liella!" } }) });
  assert.ok(issueKinds(r).includes("contract_mismatch:condition.stage_group_count"));
});
test("DUO recovery cannot disappear into a simple grant", () => {
  const r = scan(db["PL!-pb2-000-R"], { classify: () => ({ template: "grant_jouji_session", liveScoreGrant: 1 }) });
  assert.ok(issueKinds(r).includes("missing_processing_contract:effect.waiting_to_hand"));
  const reqs = r.records.flatMap((r) => r.requirements);
  assert.ok(reqs.some((r) => r.kind === "condition.baton_two" && r.amount === 2));
  assert.ok(reqs.some((r) => r.kind === "condition.baton_cost_sum" && r.amount === 15));
});
test("fixed DUO recovery and baton conditions are verified independently", () => {
  const r = scan(db["PL!-pb2-000-R"]);
  const arrival = r.records.find((x) => x.trigger === "toujyou");
  assert.equal(arrival.template, "toujou_multi_baton_recover_score");
  assert.ok(arrival.requirements.every((x) => x.status === "matched"));
  const wrong = scan(db["PL!-pb2-000-R"], { classify: (_, seg) => ({ ...classifyCardAbility(db["PL!-pb2-000-R"], seg.trigger, seg.text), batonSeriesTag: "Aqours" }) });
  assert.ok(issueKinds(wrong).includes("contract_mismatch:condition.baton_two"));
});
test("all blade branches are extracted, not only the first grant", () => {
  const r = extractAbilityRequirements("ブレードを得る。さらに、ブレードブレードを得る。");
  assert.deepEqual(r.requirements.filter((x) => x.kind === "effect.grant_blade").map((x) => x.amount), [1, 2]);
});
test("waiting-room mentions cannot turn a deck peek into waiting-to-top recovery", () => {
  const r = extractAbilityRequirements("自分のデッキの上からカードを3枚見る。その中から1枚を手札に加え、1枚をデッキの一番上に置き、残りを控え室に置く。");
  assert.ok(!r.requirements.some((x) => x.kind === "effect.waiting_to_top"));
  for (const text of ["自分の控え室にあるライブカードを1枚選び、デッキの一番上に置く。", "自分の控え室からカードを2枚まで選ぶ。それらを好きな順番でデッキの下に置く。"]) {
    assert.ok(extractAbilityRequirements(text).requirements.some((x) => x.kind.startsWith("effect.waiting_to_")));
  }
});
test("malformed or empty contracts fail closed", () => {
  for (const spec of [{}, { default: 1 }, { field: "" }, { flags: [] }, { typo: true }, false, { heartGrant: false }]) {
    assert.throws(() => validateSemanticContracts({ version: 1, templates: { draw: { capabilities: { "effect.draw": spec } } } }), /Invalid contract/);
  }
  validateSemanticContracts(contracts);
});
test("a presence flag cannot certify a numeric count", () => {
  const c = card("{{toujyou.png|登場}}カードを3枚引く。");
  const r = scan(c, { classify: () => ({ template: "draw_from_deck", implemented: true }) }, { version: 1, templates: { draw_from_deck: { capabilities: { "effect.draw": { flag: "implemented" } } } } });
  assert.ok(issueKinds(r).includes("amount_not_verified:effect.draw"));
});
test("unregistered templates are review, not success", () => {
  const r = scan(db["PL!S-cl1-001-CL"], {}, { version: 1, templates: {} });
  assert.equal(r.records[0].status, "needs_review");
  assert.ok(issueKinds(r).includes("template_contract_missing:contract"));
});
test("unknown text with a valid cost is still review", () => {
  const c = card("{{live_start.png|ライブ開始時}}手札を1枚控え室に置く：未知の処理を行う。");
  const r = scan(c, { classify: () => ({ template: "grant_jouji_session", handDiscardToWaiting: 1 }) });
  assert.ok(issueKinds(r).includes("body_not_understood:text.body"));
  assert.notEqual(r.records[0].status, "checked_known_rules");
});
test("an unknown follow-up never receives a green result", () => {
  const c = card("{{toujyou.png|登場}}自分のデッキの上からカードを5枚控え室に置く。その後、未知の処理を行う。");
  const r = scan(c, { classify: () => ({ template: "deck_top_to_waiting", deckTopCount: 5 }) });
  assert.ok(issueKinds(r).includes("followup_needs_review:text.followup"));
});
test("same action twice requires multiplicity review", () => {
  const c = card("{{toujyou.png|登場}}カードを1枚引く。さらにカードを1枚引く。");
  const r = scan(c, { classify: () => ({ template: "draw_from_deck", deckDrawCount: 1 }) });
  assert.ok(issueKinds(r).includes("repeated_action_needs_review:effect.draw"));
});
test("all six triggers and live cards are included; metadata and no-ability energy are skipped correctly", () => {
  const catalog = { _meta: { updated: "test" }, energy: { card_no: "E", type: "エネルギー" } };
  for (const trigger of ["kidou", "toujyou", "live_start", "live_success", "jidou", "jouji"]) catalog[trigger] = card(`{{${trigger}.png|${trigger}}}未知の能力。`, trigger);
  catalog.live_success.type = "ライブ";
  const r = auditAbilityCatalog(catalog, contracts, { handlers });
  assert.equal(r.summary.cards, 7); assert.equal(r.summary.segments, 6); assert.equal(r.summary.without_ability, 1);
  assert.equal(new Set(r.records.map((r) => r.trigger)).size, 6);
  assert.ok(r.records.every((r) => r.status !== "checked_known_rules"));
});
test("shared trigger text is audited under both triggers", () => {
  const c = card("{{toujyou.png|登場}}/{{live_start.png|ライブ開始時}}未知の能力。");
  const r = scan(c);
  assert.equal(r.records.length, 2);
  assert.ok(r.records.every((x) => x.text.includes("未知")));
});
test("manual / passive_track / none are not automation proof", () => {
  for (const template of ["guided_manual", "jidou_manual", "passive_track", "none"]) {
    const r = scan(db["PL!S-cl1-001-CL"], { classify: () => ({ template }) });
    assert.equal(r.records[0].status, "unimplemented");
  }
});
test("a declared template with no located handler cannot pass", () => {
  const r = scan(db["PL!S-cl1-001-CL"], { handlers: new Set() });
  assert.ok(issueKinds(r).includes("handler_not_found:runtime"));
});
test("classifier exceptions are reported per card", () => {
  const r = scan(db["PL!S-cl1-001-CL"], { classify: () => { throw Error("test failure"); } });
  assert.ok(issueKinds(r).includes("classification_error:classification"));
});
test("classification sequence checks leaf actions", () => {
  const c = card("{{toujyou.png|登場}}自分のデッキの上からカードを5枚控え室に置く。カードを1枚引く。");
  const r = scan(c, { classify: () => ({ template: "ability_sequence", steps: [{ template: "deck_top_to_waiting", deckTopCount: 5 }, { template: "draw_from_deck", deckDrawCount: 1 }] }) });
  assert.ok(r.records[0].requirements.every((x) => x.status === "matched"));
});
test("a sequence cannot hide an unpaid parent cost in a leaf", () => {
  const c = card("{{toujyou.png|登場}}手札を1枚控え室に置く：カードを1枚引く。");
  const r = scan(c, { classify: () => ({ template: "ability_sequence", handDiscardToWaiting: null, steps: [{ template: "draw_from_deck", handDiscardToWaiting: 1, deckDrawCount: 1 }] }) });
  assert.ok(issueKinds(r).includes("contract_mismatch:cost.hand_to_waiting"));
});
test("heart grant color and count cannot be replaced by a generic grant label", () => {
  const c = card("{{live_start.png|ライブ開始時}}ライブ終了時まで、{{heart_03.png|heart03}}{{heart_03.png|heart03}}を得る。");
  const wrong = scan(c, { classify: () => ({ template: "grant_jouji_session", requiredHeartSlot: 4, grantHeartSlotCount: 2 }) });
  assert.ok(issueKinds(wrong).includes("contract_mismatch:effect.grant_heart"));
  const good = scan(c, { classify: () => ({ template: "grant_jouji_session", requiredHeartSlot: 3, grantHeartSlotCount: 2 }) });
  assert.equal(good.records[0].status, "checked_known_rules");
});
test("reminder blade icons do not create a grant", () => {
  const r = extractAbilityRequirements("{{heart_03.png|heart03}}を得る。（ウェイト状態のメンバーが持つ{{icon_blade.png|ブレード}}は、エールで公開する枚数を増やさない。）");
  assert.ok(r.requirements.some((x) => x.kind === "effect.grant_heart"));
  assert.ok(!r.requirements.some((x) => x.kind === "effect.grant_blade"));
});
test("scope does not depend on touched / prior-fix exclusions", () => {
  const c = { ...db["PL!-pb2-000-R"], touched: true, fixed: true };
  const r = scan(c, { classify: () => ({ template: "grant_jouji_session", liveScoreGrant: 1 }) }); assert.ok(r.records.some((x) => x.status === "suspect"));
});
test("handoff updates preserve both human-maintained sections", () => {
  const previous = "MANUAL BEFORE\n<!-- semantic-audit:start -->\nOLD\n<!-- semantic-audit:end -->\nMANUAL AFTER";
  const report = scan(db["PL!S-cl1-001-CL"]); report.generated_at = "TEST-TIME";
  const updated = updateSemanticAuditHandoff(previous, report);
  assert.ok(updated.startsWith("MANUAL BEFORE\n")); assert.ok(updated.endsWith("\nMANUAL AFTER"));
  assert.ok(updated.includes("TEST-TIME")); assert.ok(!updated.includes("\nOLD\n"));
  assert.equal(updateSemanticAuditHandoff(updated, report), updated);
});
test("invalid or duplicate handoff markers fail without overwriting notes", () => {
  const report = scan(db["PL!S-cl1-001-CL"]);
  assert.throws(() => updateSemanticAuditHandoff("MANUAL ONLY", report), /marker/);
  assert.throws(() => updateSemanticAuditHandoff("<!-- semantic-audit:end --><!-- semantic-audit:start -->", report), /marker/);
  assert.throws(() => updateSemanticAuditHandoff("<!-- semantic-audit:start --><!-- semantic-audit:start --><!-- semantic-audit:end -->", report), /marker/);
});
test("a scoped report cannot masquerade as a full-catalog handoff", () => {
  const report = scan(db["PL!S-cl1-001-CL"]); report.scope = "selected_cards";
  assert.throws(() => updateSemanticAuditHandoff("<!-- semantic-audit:start --><!-- semantic-audit:end -->", report), /scoped/);
});

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "loveca-semantic-test-"));
try {
  const run = (...args) => spawnSync(process.execPath, ["scripts/audit-ability-semantics.mjs", ...args], { cwd: ROOT, encoding: "utf8", timeout: 30000, maxBuffer: 2 ** 22 });
  test("CLI scoped output cannot replace the full report or handoff", () => {
    fs.writeFileSync(path.join(temp, "ability-semantic-audit.json"), "KEEP FULL");
    const handoff = path.join(ROOT, "docs/HANDOFF.md");
    const old = fs.existsSync(handoff) ? fs.readFileSync(handoff, "utf8") : null;
    const r = run("--card", "PL!-pb2-003-R", "--out-dir", temp, "--check");
    assert.equal(r.status, 1, r.stderr);
    assert.equal(fs.readFileSync(path.join(temp, "ability-semantic-audit.json"), "utf8"), "KEEP FULL");
    assert.ok(fs.existsSync(path.join(temp, "ability-semantic-audit-scoped.md")));
    if (old != null) assert.equal(fs.readFileSync(handoff, "utf8"), old);
  });
  test("CLI JSON is read-only and machine readable", () => {
    const r = run("--card", "PL!S-cl1-001-CL", "--json", "--check");
    assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).summary.cards, 1);
  });
  test("CLI strict mode rejects review-only findings that check mode allows", () => {
    const normal = run("--card", "PL!-pb2-005-PP", "--json", "--check");
    const strict = run("--card", "PL!-pb2-005-PP", "--json", "--strict");
    const report = JSON.parse(strict.stdout);
    assert.equal(report.summary.statuses.unimplemented + report.summary.statuses.suspect, 0);
    assert.ok(report.summary.statuses.needs_review > 0);
    assert.equal(normal.status, 0); assert.equal(strict.status, 1);
  });
  test("CLI errors are distinct from audit findings", () => {
    const r = run("--card", "MISSING-CARD", "--no-write");
    assert.equal(r.status, 2); assert.match(r.stderr, /Card not found/);
  });
  // Exercise the actual daily shell script in isolation, replacing all network/data operations.
  const daily = path.join(temp, "daily");
  fs.mkdirSync(path.join(daily, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(daily, "bin"));
  fs.copyFileSync(path.join(ROOT, "scripts/daily-card-update.sh"), path.join(daily, "scripts/daily-card-update.sh"));
  fs.writeFileSync(path.join(daily, "scripts/sync-cards-json.sh"), "#!/bin/bash\nexit 0\n");
  fs.writeFileSync(path.join(daily, "scripts/package-lovecasimulator-app.sh"), "#!/bin/bash\nexit 0\n");
  fs.writeFileSync(path.join(daily, "bin/uname"), "#!/bin/bash\necho Linux\n", { mode: 0o755 });
  const nodeShim = "#!/bin/bash\ncase \"${1##*/}\" in\ncheck-new-cards.mjs) echo '{\"added\":0,\"removed\":0,\"abilityChanged\":0,\"totalCards\":2700,\"needsWorkCount\":0}';;\naudit-ability-semantics.mjs) echo audited >> \"$SEMANTIC_DAILY_TEST_MARKER\"; exit \"$SEMANTIC_DAILY_TEST_EXIT\";;\n*) exec \"$SEMANTIC_DAILY_TEST_NODE\" \"$@\";;\nesac\n";
  fs.writeFileSync(path.join(daily, "bin/node"), nodeShim, { mode: 0o755 });
  const marker = path.join(daily, "audits.txt");
  function runDaily(code) {
    return spawnSync("bash", [path.join(daily, "scripts/daily-card-update.sh"), "--quiet"], {
      encoding: "utf8", timeout: 10000,
      env: { ...process.env, PATH: path.join(daily, "bin") + path.delimiter + process.env.PATH, SEMANTIC_DAILY_TEST_MARKER: marker, SEMANTIC_DAILY_TEST_EXIT: String(code), SEMANTIC_DAILY_TEST_NODE: process.execPath },
    });
  }
  test("daily update audits even when no cards changed", () => {
    const r = runDaily(0); assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.readFileSync(marker, "utf8"), "audited\n");
  });
  test("daily findings warn but operational audit failures stop the update", () => {
    assert.equal(runDaily(1).status, 0);
    assert.equal(runDaily(2).status, 2);
    assert.equal(fs.readFileSync(marker, "utf8").trim().split("\n").length, 3);
  });
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log(`verify-ability-semantics OK (${tests} cases)`);
