'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../assessment-core.js');

function makeBank(skill='vocabulary',count=12,level='A2'){
  return Array.from({length:count},(_,i)=>({
    id:skill+'-'+level+'-'+i,skill,level,prompt:'Question '+i,
    choices:['a','b','c','d'],answer:0,topic:'topic-'+i,explanation:'Explanation'
  }));
}
test('validates the shipped bank and covers both skills at every CEFR band',()=>{
  const bank=require('../assessment-bank.js');
  const errors=core.validateBank(global.ENG_ASSESSMENT_BANK||bank);
  assert.deepEqual(errors,[]);
  const summary=core.summarizeBank(global.ENG_ASSESSMENT_BANK||bank);
  for(const skill of ['vocabulary','grammar']){
    for(const level of core.LEVELS)assert.ok(summary[skill][level]>=6,skill+' '+level+' has too few items');
  }
});
test('requires a four-question evidence batch and at least three correct answers to move up',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank('vocabulary',8,'A2').concat(makeBank('vocabulary',8,'B1'));
  for(let i=0;i<4;i++){
    const q=core.nextQuestion(session,bank,()=>i/4);
    core.recordAnswer(session,q,i===3?1:0,3000);
  }
  assert.equal(session.currentLevelIndex,2);
  assert.equal(session.highestPassedIndex,1);
});
test('one or zero correct answers in a four-question batch move down',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank();
  for(let i=0;i<4;i++){
    const q=core.nextQuestion(session,bank,()=>i/4);
    core.recordAnswer(session,q,i===0?0:1,3000);
  }
  assert.equal(session.currentLevelIndex,0);
  assert.equal(session.highestPassedIndex,-1);
});
test('two correct answers in a four-question batch are inconclusive',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank();
  for(let i=0;i<4;i++){
    const q=core.nextQuestion(session,bank,()=>i/4);
    core.recordAnswer(session,q,i<2?0:1,3000);
  }
  assert.equal(session.currentLevelIndex,1);
  assert.equal(session.highestPassedIndex,-1);
});
test('questions are never repeated in one skill session',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank('vocabulary',12,'A2').concat(makeBank('vocabulary',12,'B1'));
  const ids=new Set();
  for(let i=0;i<10;i++){
    const q=core.nextQuestion(session,bank,()=>0);
    assert.ok(q);
    assert.ok(!ids.has(q.id));
    ids.add(q.id);
    core.recordAnswer(session,q,0,2500);
  }
  assert.equal(ids.size,10);
  assert.equal(session.answers.length,10);
});
test('exercise difficulty remains conservative',()=>{
  assert.equal(core.exerciseDifficulty('A1'),'easy');
  assert.equal(core.exerciseDifficulty('A2'),'easy');
  assert.equal(core.exerciseDifficulty('B1'),'normal');
  assert.equal(core.exerciseDifficulty('B2'),'normal');
  assert.equal(core.exerciseDifficulty('C1'),'hard');
  assert.equal(core.exerciseDifficulty('C2'),'hard');
});
test('overall estimate requires at least nine answers in each skill',()=>{
  const vocabulary={level:'B2',levelIndex:3,rangeHigh:'C1',answered:8,confidence:'medium'};
  const grammar={level:'A2',levelIndex:1,rangeHigh:'B1',answered:10,confidence:'medium'};
  assert.equal(core.combineResults(vocabulary,grammar).status,'incomplete');
});
test('overall estimate uses the lower skill level rather than averaging upward',()=>{
  const vocabulary={level:'B2',levelIndex:3,rangeHigh:'C1',answered:10,confidence:'medium'};
  const grammar={level:'A2',levelIndex:1,rangeHigh:'B1',answered:10,confidence:'medium'};
  const overall=core.combineResults(vocabulary,grammar);
  assert.equal(overall.level,'A2');
  assert.equal(overall.practiceLevel,'A2');
  assert.equal(overall.range,'A2–B2');
});
test('assessment exit confirmation is layered above the assessment overlay',()=>{
  const source=fs.readFileSync(require.resolve('../assessment.js'),'utf8');
  assert.match(source,/#modal-root \.modal-back\{z-index:100600\}/);
});
