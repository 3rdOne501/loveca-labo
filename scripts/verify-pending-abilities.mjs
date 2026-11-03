#!/usr/bin/env node
/** Regression of the previously unimplemented segments; not a whole-product review. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { classifyCardAbility, splitAbilityByTriggers, catalogCardMatchesPickFilters, abilityEffectIsAutomated } from '../js/abilityEffects.js';
import { classifyJidouAutoSegment, jidouEffectIsAutomated, listNativeJidouSegmentRaws } from '../js/jidouAutoEffects.js';
import { classifyJoujiSegment, listNativeJoujiSegmentRaws, cardPlayCostOptionJouji } from '../js/joujiEffects.js';
import { catalogCardMatchesGroupTag } from '../js/cardGroups.js';
import { applyVersusEffectPatch } from '../js/versusEffectPatch.js';
const db = JSON.parse(fs.readFileSync(new URL('../data/cards.json', import.meta.url)));
const src = fs.readFileSync(new URL('../js/simulator.js', import.meta.url), 'utf8');
const initial = [
 ['PL!-pb2-002-PP','jouji'],['PL!-pb2-002-R','jouji'],['PL!-pb2-004-PP','jidou'],['PL!-pb2-004-R','jidou'],['PL!-pb2-006-R','kidou'],['PL!-pb2-006-PP','kidou'],['PL!-pb2-012-P＋','jouji'],['PL!-pb2-011-P＋','jidou'],['PL!-pb2-011-R','jidou'],['PL!-pb2-012-R','jouji'],['PL!-pb2-015-P＋','jidou'],['PL!-pb2-015-R','jidou'],['PL!-pb2-017-P＋','toujyou'],['PL!-pb2-017-R','toujyou'],['PL!-pb2-021-N','jidou'],['PL!-pb2-039-L','live_start'],['PL!-pb2-041-L','jouji'],['PL!-pb2-042-L','jidou'],['PL!-pb2-040-L','live_start'],['PL!SP-bp4-023-SRL','live_start'],['PL!N-bp4-025-L','live_start'],['PL!SP-bp4-023-L','live_start'],['PL!-PR-023-PR','jidou'],['PL!-PR-025-PR','jidou'],['PL!HS-PR-039-PR','toujyou'],['PL!HS-PR-040-PR','jidou'],['PL!HS-PR-038-PR','live_success'],['PL!N-PR-033-PR','jidou'],['PL!S-PR-047-PR','jidou'],['PL!S-PR-048-PR','live_start'],['PL!SP-PR-027-PR','live_start'],['PL!SP-PR-028-PR','toujyou'],
];
function cl(id, trigger) { const card = db[id]; assert.ok(card, id); const seg = splitAbilityByTriggers(card.ability).find((s) => s.trigger === trigger); assert.ok(seg); return trigger === 'jouji' ? classifyJoujiSegment(seg.text) : trigger === 'jidou' ? classifyJidouAutoSegment(seg.text) : classifyCardAbility(card, trigger, seg.text); }
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('OK ' + name); }
function section(name, end) { const start = src.indexOf(`  function ${name}(`); const stop = end ? src.indexOf(end, start) : src.indexOf('\n  function ', start + 3); assert.ok(start >= 0 && stop > start, name); return src.slice(start, stop); }
const member = (id, extra = {}) => ({ id, name: id, type: 'メンバー', series: 'ラブライブ！', unit: 'BiBi', cost: 9, base_heart: { heart01: 1 }, ...extra });
const live = (id, extra = {}) => ({ id, type: 'ライブ', series: 'ラブライブ！', ...extra });
const inst = (id) => ({ ...db[id], id });
function harness() {
 const state = { turnCount: 3, hand: [], waitingRoom: [], deck: [], stage: { left: [], center: [], right: [] }, successfulLiveArea: [], energyArea: [], liveArea: { left: [], center: [], right: [] } };
 let picks = [], mode = 'solo', enemy = { stage: { left: [], center: [], right: [] } };
 const microtasks = [];
 const c = {
  state, console, T_MEMBER: 'メンバー', T_LIVE: 'ライブ', abilityResolvingSourceInst: null, effectDialogPeekSourceInst: null,
  completionCostSourceInst: null, completionWaitEvents: [], completionWaitDrainScheduled: false, completionInteractiveQueue: [], completionInteractiveBusy: false,
  mergedCatalogCard: (c) => c, catalogCardMatchesGroupTag, catalogCardMatchesPickFilters, classifyJoujiSegment, listNativeJoujiSegmentRaws, classifyJidouAutoSegment, listNativeJidouSegmentRaws, cardPlayCostOptionJouji,
  runPlayFxBeforeAction(source, kind, done) { done(); }, ensureCardBoardFields() {}, showToast() {}, pushHistoryBefore() {}, render() {}, logReplay() {}, finishJidouAutoRender() {}, syncJoujiPassiveEffectsAll() {}, ensureDeckRefreshedIfEmpty() {},
  presentAbilityDrawsToHand() {}, describePickFilters: () => '', revealCardsSentFromDeckToWaiting(cards, text, done) { done(); },
  checkAbilityKidouPreconditions: () => true, checkAbilityToujouPreconditionsForInst: () => true, checkAbilityLiveSuccessPreconditions: () => true, checkAbilityLiveStartPreconditionsForInst: () => true, checkAbilityLiveStartPreconditions: () => true,
  shiftDeckTopCards: (n) => state.deck.splice(0, n), memberFlooredPrintedCost: (m) => Number(m.cost), memberPrintedBaseHeartTotal: (m) => Object.values(m.base_heart || {}).reduce((a,b) => a+b,0),
  memberPrintedBladeCount: (m) => Number(m.blade || 0), isPlayManualMode: () => false,
  queueMicrotask: (fn) => microtasks.push(fn), isOpponentBoardSwapped: () => !!c.swapped,
  eachStageColumnMemberInsts: () => Object.values(state.stage).flat().filter((m) => m.type === 'メンバー'),
  eachJidouListenerMemberInsts: () => c.eachStageColumnMemberInsts().filter((m) => c.memberIsStageStackTop(m)),
  eachLiveFrameLiveCardInsts: () => Object.values(state.liveArea).flat().filter((m) => m.type === 'ライブ'),
  stageColumnKeyHostingMember: (id) => Object.keys(state.stage).find((col) => state.stage[col].some((m) => m.id === id)) || null,
  memberIsStageStackTop: (m) => { const col = c.stageColumnKeyHostingMember(m.id); return !!col && state.stage[col].filter((m) => m.type === 'メンバー').at(-1)?.id === m.id; },
  findCardInstById: (id) => [...c.eachStageColumnMemberInsts(), ...state.hand, ...state.waitingRoom].find((m) => m.id === id),
  waitingPickCandidates: (f) => state.waitingRoom.filter((card) => catalogCardMatchesPickFilters(card, f)),
  listYellRevealedCardsForPick: () => c.revealed || [], stageCenterMemberInst: () => state.stage.center.at(-1),
  openPickFromWaitingDialog(pool, text, done) { const pick = picks.length ? picks.shift() : pool[0]?.id; done(pick); },
  openAbilityMultiChoiceDialog(choices, min, max, text, done) { done([choices[c.choice || 0]]); },
  openPickMultipleFromDeckLookDialog(cards, min, max, text, done) { done(cards.slice(0, max).map((c) => c.id)); },
  activateEnergyCount(n) { c.energyActivated = n; },
  whenOpponentPlayMode: (handlers) => handlers[mode](), isDualOpponentBoardMode: () => mode === 'dual', versusOnlineActive: () => mode === 'online',
  getInactiveOpponentSnapshot: () => enemy,
  readInactiveOpponentBoard(fn) { const before = state.stage; state.stage = enemy.stage; c.swapped = true; try { return fn(); } finally { state.stage = before; c.swapped = false; } },
  mutateInactiveOpponentBoard(fn) { return c.readInactiveOpponentBoard(fn); },
  soloOpponentActiveStageMemberCandidates: () => c.enemies || [], listOnlineOpponentStageMembers: (filter) => (c.enemies || []).filter(filter || (() => true)),
  openOppWaitPickFromPool(pool, text, done, options) { c.targetIds = pool.map((m) => m.id); c.waitOptions = options; done(true); },
  runOptionalSelfWaitOppStageOnline(source, cl, kind, done, predicate) { c.targetIds = (c.enemies || []).filter(predicate).map((m) => m.id); done(); },
  memberImmuneToOpponentWaitEffect: () => false,
  isStageColumnEntryBlocked: () => false, handMemberStageSideInfo: () => ({ canEnter: true }),
  confirmEnergyThenPlaceHandMember(m) { c.enterCostReduction = m._playCostReduce || 0; return true; },
  successLiveAreaCardIsLive: (m) => m.type === 'ライブ',
 };
 vm.createContext(c);
 for (const name of ['sanitizeNonNegativeInt','memberNameMatchesCharacter','jidouPerTurnKey','jidouPerTurnBlocked','jidouPerTurnMark','addLiveSessionBladeBonus','applyLiveCardNeedHeartReduceMap','placeWaitingMemberUnderStageMember','pickOrderedAbilityCards','executeCompletionJidou','activateMemberFromAbility','noteMemberActivatedByGroup','completionMemberStances','noteCompletionStanceChanges','queueCompletionWaitEvent','flushCompletionWaitEvents','drainCompletionInteractiveQueue','waitMemberInst','applyOpponentFrontEntryWait','successLiveCountForEffect','successLiveAreaLiveCardCount','placeHandMemberOnStageSide','runJidouAutoEffect','executeJidouAutoEffect','fireJidouAutoForMember','runJidouLiveCardAutoEffect','executeJidouLiveCardAutoEffect','fireJidouAutoForLiveCard','fireJidouAfterStageEntries','fireJidouAutoYellAll']) vm.runInContext(section(name), c);
 vm.runInContext(section('executeAbilityBody', '\n  function kidouRecoverCandidatesFromWaiting('), c);
 return { state, c, picks: (...ids) => { picks = ids; }, mode: (m, board) => { mode = m; if (board) enemy = board; }, flush: () => { while (microtasks.length) microtasks.shift()(); c.flushCompletionWaitEvents(); }, run(id, tr) { let done = 0; c.executeAbilityBody(inst(id), cl(id,tr), tr, () => { done++; }, () => assert.fail('guided fallback')); assert.equal(done, 1); } };
}

test('all 32 former unimplemented segments have a real automated classification', () => { for (const [id,tr] of initial) { const x=cl(id,tr); assert.ok(x && !['unclassified','guided_manual','jidou_manual'].includes(x.template || x.kind),id); if(tr==='jidou')assert.ok(jidouEffectIsAutomated(x.template),id); else if(tr!=='jouji')assert.ok(abilityEffectIsAutomated(x.template),id); } });
test('compound optional cost is all-or-nothing; mandatory kidou keeps both costs', () => { const k=cl('PL!-pb2-006-R','kidou'), l=cl('PL!-pb2-006-R','live_start'); assert.ok(k.costSelfWait && k.handDiscardToWaiting===1 && !k.hasOptionalCost); assert.ok(l.costSelfWait && l.handDiscardToWaiting===1 && l.hasOptionalCost && !l.costHandDiscardOptional); });
for (const mode of ['solo','dual','online']) test(`${mode}: original-heart limit ignores cost and granted hearts`, () => { const h=harness(); const highCost=member('eligible',{ cost: 20, base_heart:{heart01:1}, playBonusHeartSlotsAlways:{1:9}, _soloOpponentProxy:true }); const highHearts=member('wrong',{cost:1,base_heart:{heart01:2}}); const waited=member('already',{lcWait:true}); h.c.enemies=[highCost,highHearts,waited]; h.mode(mode,{stage:{left:[highCost],center:[highHearts],right:[waited]}}); h.run('PL!-pb2-006-R','kidou'); assert.deepEqual(Array.from(h.c.targetIds), ['eligible']); });
test('opponent skip-next-active option reaches the picker and online patch', () => { const h=harness(); h.c.enemies=[member('enemy',{_soloOpponentProxy:true})]; h.run('PL!HS-PR-038-PR','live_success'); assert.equal(h.c.waitOptions.skipNextActivate,true); const m=member('remote');const b={turnCount:3,stage:{left:[m],center:[],right:[]}}; assert.equal(applyVersusEffectPatch(b,{patchKind:'stage_wait_members',instIds:['remote'],skipNextActivate:true}).applied,1); assert.equal(m._skipAutoActivateUntilTurn,4); });
test('under-self moves four eligible members and leaves unrelated cards', () => { const h=harness(); const source=inst('PL!-pb2-017-R'); h.state.stage.center=[source]; h.state.waitingRoom=Array.from({length:5},(_,i)=>member('w'+i,{unit:'Printemps'})).concat(member('wrong')); h.c.executeAbilityBody(source,cl('PL!-pb2-017-R','toujyou'),'toujyou',()=>{},()=>assert.fail()); assert.equal(h.state.stage.center.length,5);assert.equal(h.state.stage.center.at(-1).id,source.id);assert.equal(h.state.waitingRoom.length,2); });
for(const handCount of [0,8,10,12]) test(`dynamic deck look with ${handCount} cards in hand`,()=>{const h=harness();h.state.hand=Array.from({length:handCount},(_,i)=>member('h'+i));h.state.deck=Array.from({length:12},(_,i)=>live('d'+i));h.run('PL!HS-PR-039-PR','toujyou');const look=Math.max(0,10-handCount);assert.equal(h.state.deck.length,12-look);assert.equal(h.state.hand.length,handCount+Math.min(2,look));assert.equal(h.state.waitingRoom.length,Math.max(0,look-2));});
for(const count of [8,9,10]) test(`waiting ${count}: conditional top ordering and count boundary`,()=>{const h=harness();h.state.waitingRoom=Array.from({length:count},(_,i)=>live('w'+i));h.state.deck=[live('deck')];h.picks('w2','w0',null);h.run('PL!S-PR-048-PR','live_start');assert.deepEqual(h.state.deck.map(c=>c.id),count<=9?['w2','w0','deck']:['deck']);});
for(const count of [1,2]) test(`success group ${count}: extra yell threshold`,()=>{const h=harness();h.state.successfulLiveArea=Array.from({length:count},(_,i)=>live('s'+i));h.state.successfulLiveArea.push(live('wrong',{series:'ラブライブ！サンシャイン!!'}));h.run('PL!-pb2-039-L','live_start');assert.equal(h.state.extraYellRevealAllowance||0,count===2?10:0);});
for(const count of [0,1,2,3]) test(`${count} distinct Printemps activations reduce hearts by the proper tier`,()=>{const h=harness();const source=inst('PL!-pb2-040-L');for(let i=0;i<count;i++){const m=member('a'+i,{lcWait:true});h.state.stage[['left','center','right'][i]]=[m];h.c.activateMemberFromAbility(m,member('origin',{unit:'Printemps'}));m.lcWait=true;h.c.activateMemberFromAbility(m,member('origin',{unit:'Printemps'}));}h.c.executeAbilityBody(source,cl('PL!-pb2-040-L','live_start'),'live_start',()=>{},()=>assert.fail());assert.equal(source._needHeartDelta?.heart0||0,([0,-3,-5,-6][count]));});
test('extra yell counts only score-bearing cards of the required group once per turn',()=>{const h=harness();const source=inst('PL!-pb2-004-R');h.state.stage.center=[source];h.c.revealed=[live('yes',{score:2}),live('zero',{score:0}),live('wrong',{score:3,series:'ラブライブ！サンシャイン!!'})];h.c.fireJidouAutoForMember(source,'yell',{});h.c.fireJidouAutoForMember(source,'yell',{});assert.equal(h.state.extraYellRevealAllowance,1);assert.equal(h.c.jidouPerTurnBlocked(source,0,1),true);});
test('baton grant requires partner cost at least 9 and applies until live end',()=>{const h=harness();const source=inst('PL!-PR-025-PR'),x=cl('PL!-PR-025-PR','jidou');const low=member('low',{cost:8}),yes=member('yes',{cost:9});h.c.executeCompletionJidou(source,x,'',0,{batonPartner:low});assert.equal(low.playBonusBladeAlways,undefined);h.c.executeCompletionJidou(source,x,'',0,{batonPartner:yes});assert.equal(yes.playBonusBladeAlways,2);});
test('waiting-entry draw distinguishes the origin and works for another member',()=>{const h=harness();const source=inst('PL!N-PR-033-PR'),x=cl('PL!N-PR-033-PR','jidou');h.state.deck=[live('draw')];h.c.executeCompletionJidou(source,x,'',0,{enteredInst:member('fromHand')});assert.equal(h.state.hand.length,0);h.c.executeCompletionJidou(source,x,'',0,{enteredInst:member('fromWaiting',{_enteredFromWaitingRoom:true})});assert.equal(h.state.hand.length,1);});
test('self-wait reaction only for own ability or cost; both players wait reaction has limit 3',()=>{const h=harness();const self=inst('PL!-pb2-021-N'),any=inst('PL!-PR-023-PR');h.state.stage.center=[self];h.state.stage.left=[any];h.c.queueCompletionWaitEvent(self,null,false,false);h.flush();assert.equal(self.playBonusBladeAlways,undefined);h.c.queueCompletionWaitEvent(self,member('ownSource'),false,false);h.flush();assert.equal(self.playBonusBladeAlways,1);h.c.queueCompletionWaitEvent(self,member('opponentSource'),true,false);h.flush();h.c.queueCompletionWaitEvent(member('enemy'),member('ownSource'),false,true);h.flush();assert.equal(any.playBonusBladeAlways,3);assert.equal(self.playBonusBladeAlways,1);});
test('central waits and cost scanner do not duplicate one wait event',()=>{const h=harness();const target=inst('PL!-PR-023-PR');h.state.stage.center=[target];const before=h.c.completionMemberStances();h.c.abilityResolvingSourceInst=member('source');h.c.waitMemberInst(target);h.c.noteCompletionStanceChanges(before,h.c.abilityResolvingSourceInst);h.c.abilityResolvingSourceInst=null;h.flush();assert.equal(target.playBonusBladeAlways,1);});
test('under-group cap counts energy too and permits exactly one third card',()=>{const h=harness();const source=inst('PL!-pb2-011-R'),x=cl('PL!-pb2-011-R','jidou');h.state.stage.center=[{id:'e1',type:'エネルギー'},{id:'e2',type:'エネルギー'},source];h.state.waitingRoom=[member('bibi'),member('bibi2')];h.c.executeCompletionJidou(source,x,'',0,{sourceInst:member('source')});assert.equal(h.state.stage.center.length,4);h.c.executeCompletionJidou(source,x,'',0,{sourceInst:member('source')});assert.equal(h.state.stage.center.length,4);});
test('BiBi choice checks source group and activates only its own eligible member',()=>{const h=harness();const source=inst('PL!-pb2-015-R'),target=member('target',{lcWait:true});h.state.stage.center=[source];h.state.stage.left=[target];h.picks('target');h.c.executeCompletionJidou(source,cl('PL!-pb2-015-R','jidou'),'',0,{sourceInst:member('wrong',{unit:'Printemps'})});assert.equal(target.lcWait,true);h.c.executeCompletionJidou(source,cl('PL!-pb2-015-R','jidou'),'',0,{sourceInst:member('yes')});assert.equal(target.lcWait,false);assert.ok(h.c.jidouPerTurnBlocked(source,0,1));});
test('two simultaneous BiBi waits open a single choice',()=>{const h=harness();const source=inst('PL!-pb2-015-R');h.state.stage.center=[source];let choices=0;h.c.openAbilityMultiChoiceDialog=(xs,a,b,text,done)=>{choices++;done([xs[1]]);};h.c.queueCompletionWaitEvent(member('enemy1'),member('source'),false,true);h.c.queueCompletionWaitEvent(member('enemy2'),member('source'),false,true);h.flush();assert.equal(choices,1);assert.equal(h.c.energyActivated,2);});
test('lily-white count is contextual and never changes victory card count',()=>{const h=harness();h.state.successfulLiveArea=[inst('PL!-pb2-041-L'),live('other')];assert.equal(h.c.successLiveCountForEffect(member('source',{unit:'lily white'})),3);assert.equal(h.c.successLiveCountForEffect(member('source',{unit:'BiBi'})),2);assert.equal(h.c.successLiveAreaLiveCardCount(),2);});
for(const hearts of [4,5]) test(`entry replacement ${hearts} printed hearts across the correct column`,()=>{const h=harness();const source=inst('PL!-pb2-002-R'),entry=member('entry',{base_heart:{heart01:hearts}});h.state.stage.center=[entry];h.mode('dual',{stage:{left:[],center:[source],right:[]}});h.c.applyOpponentFrontEntryWait(entry);assert.equal(entry.lcWait===true,hearts<=4);});
test('two-member play cost reduction requires distinct names and full payment',()=>{const h=harness();const source=inst('PL!-pb2-012-R');h.state.hand=[source];h.state.stage.left=[member('one',{unit:'Printemps',name:'南ことり'})];h.state.stage.center=[member('two',{unit:'Printemps',name:'高坂穂乃果'})];h.c.placeHandMemberOnStageSide(source,'right');assert.equal(h.c.enterCostReduction,2);assert.ok(h.state.stage.left[0].lcWait&&h.state.stage.center[0].lcWait);const skipped=harness();skipped.state.hand=[source];skipped.state.stage.left=[member('one',{unit:'Printemps'})];skipped.picks(null);skipped.c.placeHandMemberOnStageSide(source,'right');assert.equal(skipped.c.enterCostReduction,0);assert.equal(skipped.state.stage.left[0].lcWait,undefined);});
test('named live yell requires all three names and center cost/group; target printed hearts remain bounded',()=>{
 const h=harness(), source=inst('PL!-pb2-042-L');h.c.enemies=[member('four',{base_heart:{heart01:4}}),member('five',{base_heart:{heart01:5}})];
 h.state.stage.center=[member('center',{cost:11})];h.c.revealed=['矢澤にこ','西木野真姫'].map((name,i)=>member('r'+i,{name}));
 h.c.fireJidouAutoForLiveCard(source,'yell',{});assert.equal(h.c.targetIds,undefined);
 h.c.revealed.push(member('r2',{name:'絢瀬絵里'}));h.state.stage.center[0].cost=10;h.c.fireJidouAutoForLiveCard(source,'yell',{});assert.equal(h.c.targetIds,undefined);
 h.state.stage.center[0].cost=11;h.c.fireJidouAutoForLiveCard(source,'yell',{});assert.deepEqual(Array.from(h.c.targetIds),['four']);assert.ok(h.c.jidouPerTurnBlocked(source,0,1));
});
test('dual wait queue awards both players exactly one any-wait trigger',()=>{
 const h=harness(),own=inst('PL!-PR-023-PR'),opponent={...inst('PL!-PR-023-PR'),id:'opponent'};
 h.state.stage.left=[own];h.mode('dual',{stage:{left:[opponent],center:[],right:[]}});
 h.c.queueCompletionWaitEvent(member('target'),member('source'),false,true);h.flush();
 assert.equal(own.playBonusBladeAlways,1);assert.equal(opponent.playBonusBladeAlways,1);
});
test('selection-bearing reactions are serialized and their cap is rechecked',()=>{
 const h=harness(), source=inst('PL!-pb2-011-R');h.state.stage.center=[member('under1'),member('under2'),source];h.state.waitingRoom=[member('a'),member('b')];
 let selections=0,pending;
 h.c.openPickFromWaitingDialog=(pool,text,done)=>{selections++;pending=()=>done(pool[0].id);};
 h.c.queueCompletionWaitEvent(member('enemy1'),member('source'),false,true);h.c.queueCompletionWaitEvent(member('enemy2'),member('source'),false,true);h.flush();
 assert.equal(selections,1);assert.equal(h.c.completionInteractiveBusy,true);pending();assert.equal(selections,1);assert.equal(h.state.stage.center.length,4);assert.equal(h.c.completionInteractiveBusy,false);
});
test('card under a member is not a listener or eligible activation target',()=>{
 const h=harness(),under=inst('PL!-PR-023-PR');h.state.stage.center=[under,member('host')];h.c.queueCompletionWaitEvent(member('target'),null,false,false);h.flush();assert.equal(under.playBonusBladeAlways,undefined);
});
test('stage-entry and yell emitters ignore covered automatic cards',()=>{
 const h=harness(),under=inst('PL!N-PR-033-PR');h.state.stage.center=[under,member('host')];h.state.deck=[live('one')];h.c.fireJidouAfterStageEntries([member('new',{_enteredFromWaitingRoom:true})]);assert.equal(h.state.hand.length,0);
 h.state.stage.center=[inst('PL!-pb2-004-R'),member('host')];h.c.revealed=[live('scored',{score:1})];h.c.fireJidouAutoYellAll({});assert.equal(h.state.extraYellRevealAllowance,undefined);
});
test('same activation history powers both blade-per-member variants and counts a member once',()=>{
 const h=harness();const source=inst('PL!-pb2-010-R');h.state.stage.center=[source];h.state.stage.left=[member('a')];h.state.effectActivatedMemberIdsByGroup={Printemps:['a']};
 const x=cl('PL!-pb2-010-R','live_start');assert.equal(x.template,'live_start_group_activated_blade_per');assert.equal(cl('PL!-pb2-010-P＋','live_start').template,x.template);
 h.c.executeAbilityBody(source,x,'live_start',()=>{},()=>assert.fail());assert.equal(source.playBonusBladeAlways,1);
});
test('group-specific success threshold is kept independently of total success count',()=>{
 const x=cl('PL!-pb2-041-L','live_start');assert.equal(x.filters.minSuccessLiveSeriesTag,'lilywhite');assert.equal(x.filters.minSuccessLiveSeriesCount,2);
});
test('a queued cost reaction cannot interrupt an unresolved effect dialog',()=>{
 const h=harness(),source=inst('PL!-PR-023-PR');h.state.stage.center=[source];h.c.queueCompletionWaitEvent(member('waited'),member('actor'),false,false);
 h.c.abilityResolvingSourceInst=member('actor');h.flush();assert.equal(source.playBonusBladeAlways,undefined);assert.equal(h.c.completionWaitEvents.length,1);
 h.c.abilityResolvingSourceInst=null;h.flush();assert.equal(source.playBonusBladeAlways,1);
});
console.log(`PASS pending abilities: ${initial.length} classifications, ${tests} runtime/boundary tests`);
