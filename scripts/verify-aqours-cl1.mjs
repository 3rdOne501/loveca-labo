#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { classifyCardAbility, abilityEffectIsAutomated, splitAbilityByTriggers, cardAbilityRawText } from "../js/abilityEffects.js";
import { classifyJidouAutoSegment, jidouEffectIsAutomated } from "../js/jidouAutoEffects.js";
import { catalogCardMatchesGroupTag } from "../js/cardGroups.js";
import { cardIsNoteLiveCatalog, liveCardHasExcludedAllBladeHeart, cardIsDoubleColorlessYellLiveCatalog, uniqueUnits, filterCards } from "../js/cards.js";
import { cardHasBladeHeart, parseHeartColorSlotFromKey } from "../js/bladeHeart.js";

const db = JSON.parse(fs.readFileSync(new URL("../data/cards.json", import.meta.url)));
const sim = fs.readFileSync(new URL("../js/simulator.js", import.meta.url), "utf8");
const expected = ["deck_top_to_waiting", "yell_resolution_pick_deck_bottom", "kidou_stage_wait_pick_hand", "jidou_yell_opp_wait_printed_hearts", "deck_peek_relocate", "grant_jouji_session", "live_start_yell_from_bottom", "draw_from_deck", "kidou_stage_wait_pick_hand", "waiting_live_categories_to_bottom_grant", "yell_resolution_pick_hand", "success_live_names_waiting_to_deck_top", "waiting_no_bh_bottom_heart_per"];
const classes = [];
for (let n = 1; n <= 16; n++) {
  const card = db[`PL!S-cl1-${String(n).padStart(3, "0")}-CL`];
  assert.ok(card);
  if (n > 13) { assert.equal(card.type, "エネルギー"); continue; }
  const [seg] = splitAbilityByTriggers(cardAbilityRawText(card));
  const cl = seg.trigger === "jidou" ? classifyJidouAutoSegment(seg.text) : classifyCardAbility(card, seg.trigger, seg.text);
  assert.equal(cl.template, expected[n - 1], card.card_no);
  assert.ok(seg.trigger === "jidou" ? jidouEffectIsAutomated(cl.template) : abilityEffectIsAutomated(cl.template));
  classes[n] = cl;
}
assert.equal(classes[2].deckPickMax, 3);
assert.equal(classes[2].filters.pickType, null);
assert.deepEqual([classes[4].requiresCenter, classes[4].perTurnLimit, classes[4].minYellLiveCards, classes[4].maxPrintedHearts], [true, 1, 2, 4]);
assert.equal(classes[6].costHandToDeckBottom, true);
assert.equal(classes[6].handDiscardToWaiting, 1);
assert.equal(classes[6].bladeGain, 2);
assert.equal(classes[7].handDiscardToWaiting, 1);
assert.equal(classes[11].requiresStageSharedHeartColor, true);
assert.deepEqual(classes[13].grantHeartSlotMap, { heart05: 2 });

// Run real simulator handlers with deterministic dialog selections, no browser/network.
function section(name, end) {
  const start = sim.indexOf(`  function ${name}(`);
  const stop = end ? sim.indexOf(end, start) : sim.indexOf("\n  function ", start + 3);
  assert.ok(start >= 0 && stop > start, name);
  return sim.slice(start, stop);
}
const member = (id, extra = {}) => ({ id, name: id, type: "メンバー", series: "ラブライブ！サンシャイン!!", base_heart: { heart05: 1 }, ...extra });
const live = (id, extra = {}) => ({ id, name: id, type: "ライブ", series: "ラブライブ！サンシャイン!!", ...extra });
function harness(waiting = [], picks = []) {
  const state = { deck: [live("deck")], waitingRoom: waiting, hand: [], successfulLiveArea: [], resolutionArea: [], stage: [] };
  const context = {
    state, console, T_MEMBER: "メンバー", T_LIVE: "ライブ", mergedCatalogCard: (c) => c,
    catalogCardMatchesGroupTag, cardHasBladeHeart, cardIsNoteLiveCatalog, liveCardHasExcludedAllBladeHeart, cardIsDoubleColorlessYellLiveCatalog, parseHeartColorSlotFromKey,
    checkAbilityLiveSuccessPreconditions: () => true, checkAbilityLiveStartPreconditionsForInst: () => true, checkAbilityToujouPreconditionsForInst: () => true,
    ensureDeckRefreshedIfEmpty() {}, ensureDeckHasAtLeast() {}, pushHistoryBefore() {}, showToast() {}, render() {},
    waitingPickCandidates: (f) => state.waitingRoom.filter((c) => (!f.pickType || c.type === f.pickType) && (!f.seriesTag || catalogCardMatchesGroupTag(c, f.seriesTag))),
    stageMemberPickCandidates: (f) => state.stage.filter((c) => !f.seriesTag || catalogCardMatchesGroupTag(c, f.seriesTag)),
    eachStageColumnMemberInsts: () => state.stage, stageColumnKeyHostingMember: (id) => state.stage.find((c) => c.id === id)?.column || null,
    memberHeldHeartCountBySlot: (c, slot) => Number(c.base_heart?.[`heart0${slot}`] || 0),
    openPickFromWaitingDialog(pool, lead, done) {
      const id = picks.shift() ?? null;
      if (id != null) assert.ok(pool.some((c) => c.id === id), `invalid target ${id}: ${lead}`);
      done(id);
    },
    shuffleCardsInPlace: (cards) => cards.reverse(),
    addLiveSessionBladeBonus: (c, n) => { c.bonusBlade = (c.bonusBlade || 0) + n; },
    grantHeartSlotUntilLiveEnd: (c, slot, n) => { c.granted = { slot, count: n }; },
    ensureLiveVerdictSnapshotLocked() {}, yellResolutionRevealPool: (f) => state.resolutionArea.filter((c) => catalogCardMatchesGroupTag(c, f.seriesTag)),
    removeCardFromResolutionOrWaiting(id) {
      for (const zone of [state.resolutionArea, state.waitingRoom]) { const i = zone.findIndex((c) => c.id === id); if (i >= 0) return zone.splice(i, 1)[0]; }
      return null;
    },
  };
  vm.createContext(context);
  for (const name of ["pickOrderedAbilityCards", "successLiveNamePickAllowed", "stageSeriesSharedHeartSlots"]) vm.runInContext(section(name), context);
  vm.runInContext(section("executeAbilityBody", "\n  function kidouRecoverCandidatesFromWaiting("), context);
  return { state, context, run(n) { let finished = false; context.executeAbilityBody(member("source"), classes[n], classes[n].trigger, () => { finished = true; }, () => assert.fail("guided")); assert.ok(finished); } };
}

const r = harness([], ["r2", "r1", null]);
r.state.resolutionArea = [member("r1"), live("r2"), member("r3")];
r.run(2);
assert.deepEqual(r.state.deck.map((c) => c.id), ["deck", "r2", "r1"]);
assert.deepEqual(r.state.resolutionArea.map((c) => c.id), ["r3"]);
const bottom = harness(); bottom.run(7); assert.equal(bottom.state.liveSessionYellFromBottom, true);


const k = harness([live("a"), live("b"), live("c", { name: "a" })], ["b", "a"]);
k.state.successfulLiveArea = [live("s1", { name: "a" }), live("s2", { name: "b" })];
k.run(12);
assert.deepEqual(k.state.deck.map((c) => c.id), ["b", "a", "deck"]);
assert.deepEqual(k.state.waitingRoom.map((c) => c.id), ["c"]);

const h = harness([live("score"), live("all", { blade_heart: { b_all: 1 } }), live("double", { blade_heart: { b_heart07: 1 } })], ["score", "all", "double", "double", "score", "all"]);
h.state.stage = [member("center", { column: "center" })]; h.run(10);
assert.equal(h.state.stage[0].bonusBlade, 3);
assert.deepEqual(h.state.deck.map((c) => c.id), ["deck", "double", "score", "all"]);
for (const count of [0, 1, 2, 3, 6]) {
  const cards = Array.from({ length: count }, (_, i) => member(`m${i}`));
  const w = harness(cards, [...cards.map((c) => c.id), ...(count >= 2 ? ["target"] : [])]);
  w.state.stage = [member("target", { lcWait: true })]; w.run(13);
  assert.equal(w.state.deck.length, count + 1);
  assert.equal(w.state.stage[0].granted?.count || 0, Math.floor(count / 2) * 2);
  if (count >= 2) assert.equal(w.state.stage[0].granted.slot, 5);
}
const shared = harness(); shared.state.stage = [member("x"), member("y"), member("z")];
assert.deepEqual(Array.from(shared.context.stageSeriesSharedHeartSlots("Aqours")), [5]);
shared.state.stage[1].base_heart = { heart04: 1 };
assert.deepEqual(Array.from(shared.context.stageSeriesSharedHeartSlots("Aqours")), []);
const poolCheck = harness([member("waiting")]);
const inResolution = member("resolution");
poolCheck.state.resolutionArea = [inResolution];
Object.assign(poolCheck.context, {
  catalogCardMatchesPickFilters: () => true,
  listYellRevealedCardsForPick: () => [inResolution, poolCheck.state.waitingRoom[0], member("already-in-hand")],
});
vm.runInContext(section("yellResolutionRevealPool"), poolCheck.context);
assert.deepEqual(Array.from(poolCheck.context.yellResolutionRevealPool({}), (c) => c.id), ["resolution", "waiting"]);
const dia = harness();
Object.assign(dia.context, {
  isPlayManualMode: () => false,
  listYellRevealedCardsForPick: () => dia.state.resolutionArea,
  memberPrintedBaseHeartTotal: (m) => Object.values(m.base_heart || {}).reduce((a, b) => a + b, 0),
  versusOnlineActive: () => false,
  jidouPerTurnMark: () => { dia.context.marked = true; },
  finishJidouAutoRender() {},
  openSoloOpponentMemberWaitPickMultiDialog(maxCost, count, lead, done, opts) {
    assert.equal(maxCost, 99); assert.equal(count, 1); assert.equal(opts.maxPrintedHearts, 4); done(true);
  },
  runOptionalSelfWaitOppStageOnline(inst, cl, kind, done, matches) {
    assert.equal(kind, "jidou");
    assert.ok(matches(member("four", { base_heart: { heart01: 4 } })));
    assert.ok(!matches(member("five", { base_heart: { heart01: 5 } })));
    assert.ok(!matches(member("waited", { lcWait: true })));
    done();
  },
});
vm.runInContext(section("executeCompletionJidou"), dia.context);
vm.runInContext(section("executeJidouAutoEffect"), dia.context);
const diaInst = member("dia", { column: "center" }); dia.state.stage = [diaInst];
dia.state.resolutionArea = [live("one")];
dia.context.executeJidouAutoEffect(diaInst, classes[4], "", 0, {});
assert.equal(dia.context.marked, undefined);
dia.state.resolutionArea.push(live("two"));
dia.context.executeJidouAutoEffect(diaInst, classes[4], "", 0, {});
assert.equal(dia.context.marked, true);
dia.context.marked = false; diaInst.column = "left";
dia.context.executeJidouAutoEffect(diaInst, classes[4], "", 0, {});
assert.equal(dia.context.marked, false);
diaInst.column = "center"; dia.context.versusOnlineActive = () => true;
dia.context.executeJidouAutoEffect(diaInst, classes[4], "", 0, {});
assert.equal(dia.context.marked, true);

// The effect applies to the player until live end, even after the source leaves.
Object.assign(bottom.context, { cardHasYellFromDeckBottomJouji: () => false, eachLiveFrameLiveCardInsts: () => [] });
for (const name of ["boardHasYellFromDeckBottomJouji", "takeDeckCardForYellReveal", "clearLiveSessionGlobalFlags"]) vm.runInContext(section(name), bottom.context);
bottom.state.deck = [live("top"), live("bottom")];
assert.equal(bottom.context.takeDeckCardForYellReveal().id, "bottom");
bottom.context.clearLiveSessionGlobalFlags();
assert.equal(bottom.state.liveSessionYellFromBottom, false);
assert.equal(bottom.context.takeDeckCardForYellReveal().id, "top");

const unitCards = [{ unit: "みらくらぱーく!", type: "メンバー" }, { unit: "みらくらぱーく！", type: "メンバー" }, { unit: "DOLLCHESTRA", type: "メンバー" }];
for (const unit of ["みらくらぱーく!", "みらくらぱーく！"]) assert.equal(filterCards(unitCards, { unit, types: {} }).length, 2);
assert.deepEqual(uniqueUnits([{ unit: "みらくらぱーく!" }, { unit: "みらくらぱーく！" }]), ["みらくらぱーく！"]);
console.log("PASS Aqours cl1: 16 cards, classification and actual ordered movement/grants/shared-color handlers");
