(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.EngliwordsAssessmentCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const LEVELS=['A1','A2','B1','B2','C1','C2'];
  const START_LEVEL='A2';
  const QUESTIONS_PER_SKILL=10;
  const DECISION_BATCH_SIZE=4;
  const PASS_THRESHOLD=3;
  const FAIL_THRESHOLD=1;
  const MAX_INITIAL_CONFIDENCE='medium';

  function levelIndex(level){
    const index=LEVELS.indexOf(String(level||'').toUpperCase());
    return index<0?0:index;
  }
  function levelName(index){return LEVELS[Math.max(0,Math.min(LEVELS.length-1,Number(index)||0))]}
  function createSkillSession(skill,start=START_LEVEL){
    return {
      skill:String(skill),
      currentLevelIndex:levelIndex(start),
      highestPassedIndex:-1,
      askedIds:[],
      answers:[],
      pair:[],
      levelStats:{},
      startedAt:Date.now()
    };
  }
  function validateBank(bank){
    const errors=[],seen=new Set();
    if(!Array.isArray(bank)||!bank.length)return ['Question bank is empty.'];
    for(const q of bank){
      if(!q||!q.id||seen.has(q.id))errors.push('Missing or duplicate question id: '+String(q?.id||''));
      else seen.add(q.id);
      if(!LEVELS.includes(q.level))errors.push('Invalid CEFR level on '+String(q?.id||'unknown'));
      if(!['vocabulary','grammar'].includes(q.skill))errors.push('Invalid skill on '+String(q?.id||'unknown'));
      if(!Array.isArray(q.choices)||q.choices.length<3||q.choices.length>5)errors.push('Invalid choices on '+String(q?.id||'unknown'));
      if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=((q.choices||[]).length))errors.push('Invalid answer key on '+String(q?.id||'unknown'));
      if(!String(q.prompt||'').trim()||!String(q.explanation||'').trim())errors.push('Missing prompt or explanation on '+String(q?.id||'unknown'));
    }
    return errors;
  }
  function nextQuestion(session,bank,rng=Math.random){
    if(!session||session.answers.length>=QUESTIONS_PER_SKILL)return null;
    const used=new Set(session.askedIds);
    const skillBank=(Array.isArray(bank)?bank:[]).filter(q=>q.skill===session.skill&&!used.has(q.id));
    if(!skillBank.length)return null;
    let target=session.currentLevelIndex;
    let candidates=skillBank.filter(q=>levelIndex(q.level)===target);
    if(!candidates.length){
      const available=[...new Set(skillBank.map(q=>levelIndex(q.level)))];
      available.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b);
      target=available[0];
      candidates=skillBank.filter(q=>levelIndex(q.level)===target);
      // Do not combine answers from two difficulty bands into one decision pair.
      if(session.pair.length)session.pair=[];
      session.currentLevelIndex=target;
    }
    const raw=Number(rng());
    const index=Math.max(0,Math.min(candidates.length-1,Math.floor((Number.isFinite(raw)?raw:0)*candidates.length)));
    const question=candidates[index];
    session.askedIds.push(question.id);
    return question;
  }
  function recordAnswer(session,question,selectedIndex,elapsedMs=0){
    if(!session||!question)throw new Error('A session and question are required.');
    if(session.answers.some(a=>a.questionId===question.id))throw new Error('This question has already been answered.');
    const skipped=selectedIndex===null||selectedIndex===undefined||selectedIndex<0;
    const correct=!skipped&&Number(selectedIndex)===Number(question.answer);
    const index=levelIndex(question.level);
    const answer={
      questionId:question.id,level:question.level,topic:question.topic||'general',
      selectedIndex:skipped?null:Number(selectedIndex),correct,skipped,
      elapsedMs:Math.max(0,Number(elapsedMs)||0),answeredAt:Date.now()
    };
    session.answers.push(answer);
    const key=question.level;
    if(!session.levelStats[key])session.levelStats[key]={correct:0,incorrect:0,skipped:0,total:0,topics:[]};
    const stats=session.levelStats[key];
    stats.total++;
    if(skipped)stats.skipped++;
    else if(correct)stats.correct++;
    else stats.incorrect++;
    if(question.topic&&!stats.topics.includes(question.topic))stats.topics.push(question.topic);
    session.pair.push({correct,levelIndex:index});
    if(session.pair.length===DECISION_BATCH_SIZE){
      const pair=session.pair;
      const sameLevel=pair.every(item=>item.levelIndex===pair[0].levelIndex);
      if(sameLevel){
        const pairLevel=pair[0].levelIndex;
        const pairCorrect=pair.filter(item=>item.correct).length;
        if(pairCorrect>=PASS_THRESHOLD){
          session.highestPassedIndex=Math.max(session.highestPassedIndex,pairLevel);
          session.currentLevelIndex=Math.min(LEVELS.length-1,pairLevel+1);
        }else if(pairCorrect<=FAIL_THRESHOLD){
          session.currentLevelIndex=Math.max(0,pairLevel-1);
        }else{
          session.currentLevelIndex=pairLevel;
        }
      }
      session.pair=[];
    }
    return answer;
  }
  function finalizeSkill(session){
    if(!session)return null;
    const answers=session.answers||[];
    if(answers.length<6)return null;
    const correct=answers.filter(a=>a.correct).length;
    const skipped=answers.filter(a=>a.skipped).length;
    const testedLevels=[...new Set(answers.map(a=>a.level))].sort((a,b)=>levelIndex(a)-levelIndex(b));
    const attemptedIndexes=answers.map(a=>levelIndex(a.level));
    const highestAttempted=attemptedIndexes.length?Math.max(...attemptedIndexes):0;
    const practiceIndex=Math.max(0,session.highestPassedIndex);
    const borderlineIndexes=LEVELS.map((level,index)=>{
      const s=session.levelStats[level];
      if(!s||s.total<2)return -1;
      const rate=s.correct/s.total;
      return rate>=0.35&&rate<=0.65?index:-1;
    }).filter(index=>index>=0);
    const rangeHigh=Math.max(practiceIndex,...borderlineIndexes.filter(index=>index>practiceIndex));
    const fastCount=answers.filter(a=>!a.skipped&&a.elapsedMs>0&&a.elapsedMs<1200).length;
    const fastRate=answers.length?fastCount/answers.length:0;
    const answered=answers.length;
    const distinctTopics=new Set(answers.map(a=>a.topic).filter(Boolean)).size;
    const passedStats=session.levelStats[levelName(practiceIndex)];
    const hasClearEvidence=session.highestPassedIndex>=0&&Boolean(passedStats&&passedStats.total>=DECISION_BATCH_SIZE&&passedStats.correct>=PASS_THRESHOLD);
    const confidence=answered>=9&&hasClearEvidence&&testedLevels.length>=2&&distinctTopics>=4&&fastRate<0.5&&skipped<=1
      ? 'medium':'low';
    return {
      skill:session.skill,
      level:levelName(practiceIndex),
      levelIndex:practiceIndex,
      rangeLow:levelName(practiceIndex),
      rangeHigh:levelName(rangeHigh),
      range:rangeHigh>practiceIndex?levelName(practiceIndex)+'–'+levelName(rangeHigh):levelName(practiceIndex),
      score:answered?Math.round(correct/answered*100):null,
      correct,answered,skipped,
      confidence,
      testedLevels,
      topicCount:distinctTopics,
      fastResponseRate:Math.round(fastRate*100),
      levelStats:session.levelStats,
      nextLevelToCheck:session.highestPassedIndex<LEVELS.length-1?levelName(session.highestPassedIndex+1):null,
      highestAttempted:levelName(highestAttempted),
      assessedAt:new Date().toISOString()
    };
  }
  function combineResults(vocabulary,grammar){
    if(!vocabulary||!grammar||vocabulary.answered<9||grammar.answered<9){
      return {status:'incomplete',level:null,range:null,practiceLevel:null,confidence:'low',coverage:'At least 9 answers per skill are required'};
    }
    const low=Math.min(vocabulary.levelIndex,grammar.levelIndex);
    const high=Math.max(vocabulary.levelIndex,grammar.levelIndex);
    const confidence=vocabulary.confidence==='medium'&&grammar.confidence==='medium'&&high-low<=1?'medium':'low';
    return {
      status:'provisional',
      level:levelName(low),
      range:high>low?levelName(low)+'–'+levelName(high):levelName(low),
      practiceLevel:levelName(low),
      levelIndex:low,
      rangeHigh:levelName(high),
      confidence,
      coverage:'2 of 6 skills',
      skills:{vocabulary,grammar}
    };
  }
  function exerciseDifficulty(level){
    const index=levelIndex(level);
    if(index<=1)return 'easy';
    if(index<=3)return 'normal';
    return 'hard';
  }
  function summarizeBank(bank){
    const result={vocabulary:{},grammar:{}};
    for(const q of bank||[]){
      if(!result[q.skill])continue;
      result[q.skill][q.level]=(result[q.skill][q.level]||0)+1;
    }
    return result;
  }
  return {
    LEVELS,START_LEVEL,QUESTIONS_PER_SKILL,DECISION_BATCH_SIZE,PASS_THRESHOLD,FAIL_THRESHOLD,MAX_INITIAL_CONFIDENCE,
    levelIndex,levelName,createSkillSession,validateBank,nextQuestion,
    recordAnswer,finalizeSkill,combineResults,exerciseDifficulty,summarizeBank
  };
});
