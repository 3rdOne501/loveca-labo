#!/usr/bin/env node
/** まじかる♡とり～と期（bp8）の分類網羅と、新設ハンドラの最小ランタイム回帰。実プレイ確認の代替ではない。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { abilityEffectIsAutomated, cardAbilityRawText, classifyCardAbility, splitAbilityByTriggers, catalogCardMatchesPickFilters } from '../js/abilityEffects.js';
import { classifyJoujiSegment, listNativeJoujiSegmentRaws } from '../js/joujiEffects.js';
import { classifyJidouAutoSegment, jidouEffectIsAutomated, listNativeJidouSegmentRaws } from '../js/jidouAutoEffects.js';
import { catalogCardMatchesGroupTag } from '../js/cardGroups.js';

const db = JSON.parse(fs.readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'));
const src = fs.readFileSync(new URL('../js/simulator.js', import.meta.url), 'utf8');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('OK ' + name); }
function section(name) { const start = src.indexOf(`  function ${name}(`); const stop = src.indexOf('\n  function ', start + 3); assert.ok(start >= 0 && stop > start, name); return src.slice(start, stop); }
const covered = (t) => !!t && !['guided_manual', 'jidou_manual', 'unclassified'].includes(t) && (t === 'none' || t === 'passive_track' || abilityEffectIsAutomated(t) || jidouEffectIsAutomated(t));
const ACTIVE = ['kidou', 'toujyou', 'live_start', 'live_success'];

function segments(id) {
  const card = db[id];
  assert.ok(card, id);
  const out = [];
  for (const seg of splitAbilityByTriggers(cardAbilityRawText(card))) {
    if (ACTIVE.includes(seg.trigger)) out.push({ trigger: seg.trigger, cl: classifyCardAbility(card, seg.trigger, seg.text) });
  }
  for (const s of listNativeJoujiSegmentRaws(card)) out.push({ trigger: 'jouji', cl: classifyJoujiSegment(s) });
  for (const s of listNativeJidouSegmentRaws(card)) out.push({ trigger: 'jidou', cl: classifyJidouAutoSegment(s) });
  return out;
}
function cl(id, trigger, index = 0) {
  const seg = segments(id).filter((s) => s.trigger === trigger)[index];
  assert.ok(seg, `${id} ${trigger}#${index}`);
  return seg.cl;
}

const member = (id, extra = {}) => ({ id, name: id, type: 'メンバー', series: 'ラブライブ！蓮ノ空女学院スクールアイドルクラブ', cost: 4, ...extra });
const live = (id, extra = {}) => ({ id, name: id, type: 'ライブ', series: 'ラブライブ！虹ヶ咲学園スクールアイドル同好会', score: 2, ...extra });
const inst = (id) => ({ ...db[id], id: 'src-' + id });

function harness() {
  const state = { turnCount: 3, hand: [], waitingRoom: [], deck: [], stage: { left: [], center: [], right: [] }, liveArea: { left: [], center: [], right: [] }, successfulLiveArea: [], energyArea: [], liveSetLimitPenaltyPending: 0 };
  const log = { toasts: [], livePlaced: [], keepCalls: 0 };
  let picks = null;
  let keepDecline = 0;
  const c = {
    state, console, T_MEMBER: 'メンバー', T_LIVE: 'ライブ',
    mergedCatalogCard: (x) => x, catalogCardMatchesPickFilters, catalogCardMatchesGroupTag,
    showToast: (m) => log.toasts.push(m), pushHistoryBefore() {}, render() {}, finishJidouAutoRender() {}, syncJoujiPassiveEffectsAll() {}, markEffectFizzleVisual() {},
    waitingPickCandidates: (f) => state.waitingRoom.filter((x) => catalogCardMatchesPickFilters(x, f || {})),
    openPickFromWaitingDialog(pool, text, done) { done(picks ? picks.shift() ?? null : pool[0] && pool[0].id); },
    openHandKeepInHandDialog(keep, text, done) {
      log.keepCalls++;
      if (keepDecline > 0) { keepDecline--; done(false); return; }
      state.waitingRoom.push(...state.hand.splice(keep));
      done(true);
    },
    whenOpponentPlayMode: (h) => h.solo(),
    shuffleCardsInPlace(arr) { arr.reverse(); },
    fireJidouAfterLivePlacedOnFrame(card, o) { log.livePlaced.push([card.id, !!(o && o.fromWaiting)]); },
    jidouPerTurnMark() {}, presentAbilityDrawsToHand() {},
  };
  vm.createContext(c);
  for (const name of ['pickOrderedAbilityCards', 'moveWaitingCardsToDeckBottom', 'forceHandDiscardToWaiting', 'placeLiveFromWaitingToLiveAreaFaceUp', 'applyLiveCardNeedHeartReduceMap', 'executeCompletionActiveMore', 'executeCompletionJidou']) vm.runInContext(section(name), c);
  return {
    state, c, log,
    picks: (...ids) => { picks = ids; },
    declineKeep: (n) => { keepDecline = n; },
    run(source, classified, kind) {
      let finished = 0;
      const handled = c.executeCompletionActiveMore(source, classified, kind, () => { finished++; }, (msg) => { if (msg) log.toasts.push(msg); finished++; });
      assert.equal(handled, true, classified.template);
      assert.equal(finished, 1, `${classified.template} must finish exactly once`);
    },
  };
}

test('every bp8 segment in cards.json has an automated classification (including sequence steps)', () => {
  const ids = Object.keys(db).filter((id) => /-bp8-/.test(id));
  assert.ok(ids.length >= 68, `bp8 cards: ${ids.length}`);
  for (const id of ids) {
    for (const { trigger, cl: x } of segments(id)) {
      if (trigger === 'jouji') { assert.ok(x && x.kind, `${id} jouji`); continue; }
      assert.ok(covered(x.template), `${id} ${trigger} ${x.template}`);
      if (x.template === 'ability_sequence') for (const st of x.steps || []) assert.ok(covered(st.template), `${id} ${trigger} step ${st.template}`);
    }
  }
});

test('peek inline reference "能力と" does not split the copied-ability sentence (LL-bp8-001)', () => {
  const segs = segments('LL-bp8-001-R＋');
  assert.ok(segs.every((s) => covered(s.cl.template) || (s.trigger === 'jouji' && s.cl)));
  assert.equal(cl('LL-bp8-001-R＋', 'jouji').kind, 'mirror_under_card_kidou_live_start');
});

test('hand-discard recover pattern does not claim an energy-cost card (PL!SP-pb2-007)', () => {
  for (const id of Object.keys(db).filter((k) => k.startsWith('PL!SP-pb2-007'))) {
    for (const { cl: x } of segments(id)) assert.notEqual(x.template, 'live_success_recover_from_waiting', id);
  }
});

test('ordered waiting→deck bottom keeps pick order and skips unpicked cards', () => {
  const h = harness();
  h.state.waitingRoom = [member('w0'), member('w1'), member('w2')];
  h.state.deck = [member('d')];
  h.picks('w2', 'w0', null);
  h.run(inst('PL!-bp8-010-N'), cl('PL!-bp8-010-N', 'kidou'), 'kidou');
  assert.deepEqual(h.state.deck.map((x) => x.id), ['d', 'w2', 'w0']);
  assert.deepEqual(h.state.waitingRoom.map((x) => x.id), ['w1']);
});

for (const declines of [0, 1]) test(`both-trim hand to 6 (own side, ${declines} cancelled prompt)`, () => {
  const h = harness();
  const x = cl('PL!HS-bp8-003-P', 'toujyou');
  assert.equal(x.targetHandSize, 6);
  h.state.hand = Array.from({ length: 9 }, (_, i) => member('h' + i));
  h.declineKeep(declines);
  h.run(inst('PL!HS-bp8-003-P'), x, 'toujyou');
  assert.equal(h.state.hand.length, 6);
  assert.equal(h.state.waitingRoom.length, 3);
  assert.equal(h.log.keepCalls, 1 + declines);
});

test('both-trim does not prompt when own hand is already at or below the target', () => {
  const h = harness();
  h.state.hand = Array.from({ length: 5 }, (_, i) => member('h' + i));
  h.run(inst('PL!HS-bp8-003-P'), cl('PL!HS-bp8-003-P', 'toujyou'), 'toujyou');
  assert.equal(h.state.hand.length, 5);
  assert.equal(h.log.keepCalls, 0);
});

test('empty live area: Nijigasaki live from waiting is placed face-up and the set limit penalty applies', () => {
  const h = harness();
  h.state.waitingRoom = [live('other', { series: 'ラブライブ！' }), live('niji')];
  h.run(inst('PL!N-bp8-021-N'), cl('PL!N-bp8-021-N', 'kidou'), 'kidou');
  assert.deepEqual(Object.values(h.state.liveArea).flat().map((x) => x.id), ['niji']);
  assert.deepEqual(h.log.livePlaced, [['niji', true]]);
  assert.equal(h.state.liveSetLimitPenaltyPending, 1);
});

test('occupied live area: nothing is placed but the penalty still applies', () => {
  const h = harness();
  h.state.liveArea.center = [live('already')];
  h.state.waitingRoom = [live('niji')];
  h.run(inst('PL!N-bp8-021-N'), cl('PL!N-bp8-021-N', 'kidou'), 'kidou');
  assert.deepEqual(h.state.waitingRoom.map((x) => x.id), ['niji']);
  assert.equal(h.state.liveSetLimitPenaltyPending, 1);
});

test('shuffle-all to deck bottom only moves members at or below the printed cost cap', () => {
  const h = harness();
  const x = cl('PL!HS-bp8-019-L', 'live_start');
  const step = x.template === 'ability_sequence' ? x.steps.find((s) => s.template === 'waiting_all_shuffle_deck_bottom') : x;
  assert.equal(step.template, 'waiting_all_shuffle_deck_bottom');
  h.state.waitingRoom = [member('m4', { cost: 4 }), member('m9', { cost: 9 }), member('m10', { cost: 10 }), live('l')];
  h.state.deck = [member('d')];
  h.run(inst('PL!HS-bp8-019-L'), step, 'live_start');
  assert.deepEqual(h.state.waitingRoom.map((c) => c.id).sort(), ['l', 'm10']);
  assert.deepEqual(h.state.deck.map((c) => c.id), ['d', 'm9', 'm4']);
});

for (const fromWaiting of [false, true]) test(`need-heart reduction only when placed from waiting (fromWaiting=${fromWaiting})`, () => {
  const h = harness();
  const source = inst('PL!N-bp8-030-L');
  const x = cl('PL!N-bp8-030-L', 'jidou');
  let done = 0;
  const handled = h.c.executeCompletionJidou(source, x, '', 0, { fromWaiting, movedCard: source }, () => { done++; });
  assert.equal(handled, true);
  assert.equal(done, 1);
  assert.equal((source._needHeartDelta && source._needHeartDelta.heart0) || 0, fromWaiting ? -3 : 0);
});

console.log(`PASS bp8 abilities: ${tests} tests`);
