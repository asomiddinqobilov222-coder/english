'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../assessment-core.js');

function makeBank(skill='vocabulary',count=12){
  return Array.from({length:count},(_,i)=>({
    id:skill+'-'+i,skill,level:'A2',prompt:'Question '+i,
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
test('two correct answers at the same band move one band up',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank();
  const q1=core.nextQuestion(session,bank,()=>0);
  core.recordAnswer(session,q1,0,3000);
  const q2=core.nextQuestion(session,bank,()=>0);
  core.recordAnswer(session,q2,0,3000);
  assert.equal(session.currentLevelIndex,2);
  assert.equal(session.highestPassedIndex,1);
});
test('two incorrect answers move one band down',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank();
  const q1=core.nextQuestion(session,bank,()=>0);
  core.recordAnswer(session,q1,1,3000);
  const q2=core.nextQuestion(session,bank,()=>0);
  core.recordAnswer(session,q2,1,3000);
  assert.equal(session.currentLevelIndex,0);
  assert.equal(session.highestPassedIndex,-1);
});
test('a split pair does not raise the learner level',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank();
  const q1=core.nextQuestion(session,bank,()=>0);
  core.recordAnswer(session,q1,0,3000);
  const q2=core.nextQuestion(session,bank,()=>0);
  core.recordAnswer(session,q2,1,3000);
  assert.equal(session.currentLevelIndex,1);
  assert.equal(session.highestPassedIndex,-1);
});
test('questions are never repeated in one skill session',()=>{
  const session=core.createSkillSession('vocabulary','A2');
  const bank=makeBank();
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
test('exercise difficulty is conservative and follows vocabulary level',()=>{
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
