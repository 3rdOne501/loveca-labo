#!/usr/bin/env node
// Targeted regression; this does not certify every card in μ's DUO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseLiveTotalScorePlusFromText, classifyCardAbility, splitAbilityByTriggers, abilityRawSegmentForTrigger, cardAbilityRawText, extractGrantedJoujiTextsFromSegment, isPlainLiveEndHeartBladeGrantSegment } from '../js/abilityEffects.js';
import { catalogCardMatchesGroupTag } from '../js/cardGroups.js';
const db = JSON.parse(fs.readFileSync(new URL('../data/cards.json', import.meta.url)));
const sim = fs.readFileSync(new URL('../js/simulator.js', import.meta.url), 'utf8');
function section(name, end) {
  const start = sim.indexOf(`  function ${name}(`);
  const stop = end ? sim.indexOf(end, start) : sim.indexOf('\n  function ', start + 3);
  assert.ok(start >= 0 && stop > start, name);
  return sim.slice(start, stop);
}
const member = (id, cost, series = 'ラブライブ！') => ({ id, cost, type: 'メンバー', series });
const live = (id, series = 'ラブライブ！') => ({ id, type: 'ライブ', series });
let cases = 0;
for (const id of ['PL!-pb2-000-R', 'PL!-pb2-000-DUO']) {
  const sourceCard = db[id];
  const seg = splitAbilityByTriggers(sourceCard.ability).find((s) => s.trigger === 'toujyou');
  const cl = classifyCardAbility(sourceCard, seg.trigger, seg.text);
  assert.equal(cl.template, 'toujou_multi_baton_recover_score');
  for (const [members, waiting, selection, expectedHand, score] of [
    [[member('a', 7), member('b', 8)], [live('yes'), live('wrong', 'ラブライブ！サンシャイン!!')], 'yes', ['yes'], 1],
    [[member('a', 7), member('b', 7)], [live('yes')], 'yes', ['yes'], 0],
    [[member('a', 8), member('b', 8)], [live('yes')], 'yes', ['yes'], 0],
    [[member('a', 15)], [live('yes')], 'yes', [], 0],
    [[member('a', 7), member('b', 8, 'ラブライブ！サンシャイン!!')], [live('yes')], 'yes', [], 0],
    [[member('a', 7), member('b', 8)], [], null, [], 1],
    [[member('a', 7), member('b', 8)], [live('wrong', 'ラブライブ！サンシャイン!!')], null, [], 1],
    [[member('a', 7), member('b', 8)], [live('yes')], null, ['yes'], 1],
  ]) {
    const inst = { ...sourceCard, id: 'source' };
    const state = { stage: members.slice(), waitingRoom: waiting.slice(), hand: [] };
    let finished = 0;
    const context = {
      state, console, T_MEMBER: 'メンバー', T_LIVE: 'ライブ', mergedCatalogCard: (c) => c,
      catalogCardMatchesGroupTag, abilityRawSegmentForTrigger, cardAbilityRawText, extractGrantedJoujiTextsFromSegment, isPlainLiveEndHeartBladeGrantSegment,
      checkAbilityToujouPreconditionsForInst: () => true,
      findCardInstById: (id) => [...state.stage, ...state.waitingRoom].find((c) => c.id === id),
      stageColumnKeyHostingMember: (id) => state.stage.some((c) => c.id === id) ? 'center' : null,
      memberFlooredPrintedCost: (c) => c.cost,
      removeStageMemberToWaiting(c) { state.stage.splice(state.stage.indexOf(c), 1); state.waitingRoom.push(c); },
      waitingPickCandidates: (f) => state.waitingRoom.filter((c) => c.type === f.pickType && catalogCardMatchesGroupTag(c, f.seriesTag)),
      openPickFromWaitingDialog(pool, lead, done) { assert.ok(pool.every((c) => c.type === 'ライブ' && catalogCardMatchesGroupTag(c, "μ's"))); done(selection); },
      moveInstFromWaitingToHand(id) { const i = state.waitingRoom.findIndex((c) => c.id === id); assert.ok(i >= 0); state.hand.push(state.waitingRoom.splice(i, 1)[0]); },
      pushHistoryBefore() {}, showToast() {}, render() {}, syncJoujiPassiveEffectsAll() {}, ensureDeckRefreshedIfEmpty() {},
      instIsLiveCard: (c) => c.type === 'ライブ', parseLiveTotalScorePlusFromText, yellRevealLiveCountScoreBonusFromText: () => null, countOwnYellRevealedLiveCards: () => 0,
      resolveGrantJoujiTargetInsts: () => assert.fail('explicit self target expected'),
    };
    vm.createContext(context);
    for (const name of ['applySoloBatonIdsToWaitingRoom', 'clearLiveSessionGrantedState', 'clearToujouEffectStateOnLeaveStage', 'extractInlineLiveEndGrantJouji', 'pushGrantedJoujiSegments', 'applyGrantJoujiSessionEffect', 'sumLiveTotalScorePlusFromJoujiSegments']) vm.runInContext(section(name), context);
    vm.runInContext(section('executeAbilityBody', '\n  function kidouRecoverCandidatesFromWaiting('), context);
    context.applySoloBatonIdsToWaitingRoom(inst, [...members.map((c) => c.id), members[0].id]);
    assert.equal(inst._toujouBatonSnapshot.length, members.length, 'deduplicate baton IDs');
    // A leave-stage auto effect may move both sources away before arrival resolves.
    state.waitingRoom = state.waitingRoom.filter((c) => !members.includes(c));
    members.forEach((c) => { c.cost = 99; c.series = 'other'; });
    const run = () => context.executeAbilityBody(inst, cl, 'toujyou', () => { finished++; }, () => assert.fail('guided fallback'));
    run();
    assert.equal(finished, 1);
    assert.deepEqual(state.hand.map((c) => c.id), expectedHand);
    assert.equal(context.sumLiveTotalScorePlusFromJoujiSegments(inst._grantedJoujiSegmentRaws), score);
    if (score) { run(); assert.equal(context.sumLiveTotalScorePlusFromJoujiSegments(inst._grantedJoujiSegmentRaws), 1, 'do not double-stack the same grant'); }
    context.clearLiveSessionGrantedState(inst);
    assert.equal(context.sumLiveTotalScorePlusFromJoujiSegments(inst._grantedJoujiSegmentRaws), 0, 'live-end cleanup');
    inst._soloBatonMemberIds = ['a', 'b'];
    context.clearToujouEffectStateOnLeaveStage(inst);
    assert.equal(inst._toujouBatonSnapshot, undefined);
    assert.equal(inst._soloBatonMemberIds, undefined, 'no stale baton on re-entry');
    run(); assert.equal(context.sumLiveTotalScorePlusFromJoujiSegments(inst._grantedJoujiSegmentRaws), 0);
    cases++;
  }
}
console.log(`PASS μ's DUO baton: ${cases} actual-handler scenarios, recovery, cost sum, snapshot, cleanup`);

// Actual picker: mandatory public-zone choice survives Escape and hides cancel;
// optional callers keep their existing cancel behavior and button state is restored.
function element() {
  return { textContent: 'label', innerHTML: '', hidden: false, handlers: {},
    addEventListener(name, fn) { this.handlers[name] = fn; },
    removeEventListener(name) { delete this.handlers[name]; },
    appendChild() {}, querySelector: () => null, showModal() {}, close() {},
  };
}
const ids = Object.fromEntries(['dlg-pick-kidou-waiting', 'dlg-pick-kidou-waiting-list', 'dlg-pick-kidou-waiting-lead', 'dlg-pick-kidou-waiting-ok', 'dlg-pick-kidou-waiting-cancel', 'dlg-pick-kidou-waiting-title'].map((id) => [id, element()]));
ids['dlg-pick-kidou-waiting-list'].querySelector = () => ({ value: 'selected' });
const ui = {
  document: { getElementById: (id) => ids[id], createElement: element },
  EFFECT_CARD_PICK_DIALOG_DEFAULT_TITLE: 'choose', effectDialogPeekSourceInst: null,
  mergedCatalogCard: (c) => c, setEffectDialogResolveBtnLabel() {}, ensureDialogViewBoardButton() {}, hideEffectDialogResumeChipOnDialogCleanup() {}, showToast() {},
};
vm.createContext(ui); vm.runInContext(section('openPickFromWaitingDialog'), ui);
let picked = 'pending';
ui.openPickFromWaitingDialog([live('selected')], '', (id) => { picked = id; }, { required: true });
assert.equal(ids['dlg-pick-kidou-waiting-cancel'].hidden, true);
let prevented = false;
ids['dlg-pick-kidou-waiting'].handlers.cancel({ preventDefault() { prevented = true; } });
assert.equal(prevented, true); assert.equal(picked, 'pending');
ids['dlg-pick-kidou-waiting-ok'].handlers.click();
assert.equal(picked, 'selected'); assert.equal(ids['dlg-pick-kidou-waiting-cancel'].hidden, false);
ui.openPickFromWaitingDialog([live('selected')], '', (id) => { picked = id; });
ids['dlg-pick-kidou-waiting-cancel'].handlers.click(); assert.equal(picked, null);
console.log('PASS mandatory picker: Escape prevention, selection, cleanup and optional cancel');
