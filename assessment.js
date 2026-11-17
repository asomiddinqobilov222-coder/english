(function(){
  'use strict';
  const Core=window.EngliwordsAssessmentCore;
  const BANK=window.ENG_ASSESSMENT_BANK||[];
  if(!Core)throw new Error('Engliwords assessment engine did not load.');
  const bankErrors=Core.validateBank(BANK);
  let run=null,timerId=null;
  const SKILLS=['vocabulary','grammar'];
  const SKILL_LABELS={vocabulary:'Vocabulary',grammar:'Grammar'};
  const TIME_LIMIT_MS=15*60*1000;

  const style=document.createElement('style');
  style.id='engliwords-assessment-style';
  style.textContent=`
    .assessment-card{position:relative;overflow:hidden}
    .assessment-card .assessment-level{font-size:34px;font-weight:900;letter-spacing:-1px;line-height:1.1;color:var(--cyan)}
    .assessment-card .assessment-meta{font-size:12px;color:var(--muted);margin-top:5px}
    .assessment-card .assessment-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
    .assessment-card .assessment-actions button{flex:1;min-width:125px}
    #assessment-overlay{position:fixed;inset:0;z-index:100500;overflow-y:auto;background:linear-gradient(180deg,#081426,#102744 60%,#0a192d);color:#f3f7ff;padding:calc(14px + env(safe-area-inset-top)) 14px calc(22px + env(safe-area-inset-bottom));}
    #assessment-overlay .assessment-shell{width:min(720px,100%);margin:0 auto}
    #assessment-overlay .assessment-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
    #assessment-overlay .assessment-brand{font-weight:850;letter-spacing:-.3px}
    #assessment-overlay .assessment-timer{font-variant-numeric:tabular-nums;font-weight:850;color:#83e8d8;background:#18384a;border:1px solid #31556a;border-radius:12px;padding:8px 12px}
    #assessment-overlay .assessment-panel{background:linear-gradient(145deg,#172b47,#102039);border:1px solid #ffffff20;border-radius:22px;padding:20px;box-shadow:0 18px 45px #0003;margin-bottom:14px}
    #assessment-overlay .assessment-eyebrow{font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#83e8d8;font-weight:850}
    #assessment-overlay h2{font-size:clamp(24px,5vw,32px);line-height:1.15;letter-spacing:-.8px;margin:7px 0 10px}
    #assessment-overlay .assessment-muted{color:#b5c6dc;font-size:13px;line-height:1.55}
    #assessment-overlay .assessment-progress{height:7px;background:#2b3c56;border-radius:20px;overflow:hidden;margin:12px 0}
    #assessment-overlay .assessment-progress>i{display:block;height:100%;background:linear-gradient(90deg,#67cfc1,#8aa8ff);border-radius:inherit;transition:width .2s}
    #assessment-overlay .assessment-question{font-size:clamp(19px,4.5vw,24px);font-weight:780;line-height:1.45;margin:20px 0}
    #assessment-overlay .assessment-options{display:grid;gap:9px}
    #assessment-overlay .assessment-option{width:100%;text-align:left;padding:13px 14px;border:1px solid #49617d!important;border-radius:14px!important;background:#1b304c!important;color:#f3f7ff!important;font-weight:650;min-height:50px}
    #assessment-overlay .assessment-option:focus-visible{outline:2px solid #83e8d8;outline-offset:2px}
    #assessment-overlay .assessment-option.is-selected{border-color:#83e8d8!important;background:#214b54!important}
    #assessment-overlay .assessment-option.is-correct{border-color:#5dd7a2!important;background:#174638!important}
    #assessment-overlay .assessment-option.is-wrong{border-color:#ff8793!important;background:#512b3a!important}
    #assessment-overlay .assessment-feedback{padding:13px 14px;border-radius:13px;background:#1b304c;margin-top:13px;font-size:13px;line-height:1.5}
    #assessment-overlay .assessment-actions{display:flex;gap:9px;margin-top:18px}
    #assessment-overlay .assessment-actions button{flex:1;min-height:47px;border:1px solid #ffffff25;border-radius:13px;padding:11px 14px;font-weight:800}
    #assessment-overlay .assessment-primary{background:linear-gradient(120deg,#75e5d2,#a0f0dc);color:#071b20}
    #assessment-overlay .assessment-secondary{background:#263b58;color:#f3f7ff}
    #assessment-overlay .assessment-level-pill{display:inline-block;padding:5px 9px;border-radius:99px;background:#203d55;border:1px solid #3a5b76;color:#bceee6;font-size:11px;font-weight:800}
    #assessment-overlay .assessment-result-row{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #ffffff18}
    #assessment-overlay .assessment-result-row:last-child{border-bottom:0}
    #assessment-overlay .assessment-small{font-size:11px;color:#aabbd2;line-height:1.5}
    #assessment-overlay .assessment-close{border:1px solid #ffffff28;background:#20344f;color:#fff;border-radius:12px;padding:8px 12px}
    body[data-theme="day"] #assessment-overlay{background:linear-gradient(180deg,#eaf6ff,#d7edfc 60%,#edf8ff);color:#20364e}
    body[data-theme="day"] #assessment-overlay .assessment-panel{background:#ffffffed;border-color:#cfe2f1;box-shadow:0 15px 35px #4a86b51a}
    body[data-theme="day"] #assessment-overlay .assessment-muted,body[data-theme="day"] #assessment-overlay .assessment-small{color:#607990}
    body[data-theme="day"] #assessment-overlay .assessment-option{background:#f1f7fd!important;color:#20364e!important;border-color:#c7dceb!important}
    body[data-theme="day"] #assessment-overlay .assessment-option.is-selected{background:#dff6f1!important;border-color:#168c91!important}
    body[data-theme="day"] #assessment-overlay .assessment-timer{background:#e1f7f3;color:#176f72;border-color:#b5e5db}
    body[data-theme="day"] #assessment-overlay .assessment-secondary{background:#eaf2fa;color:#294b69;border-color:#d0e2f1}
    @media(max-width:520px){#assessment-overlay .assessment-panel{padding:17px;border-radius:19px}#assessment-overlay .assessment-question{margin:16px 0}#assessment-overlay .assessment-actions{flex-direction:column}}
  `;
  document.head.appendChild(style);

  function store(){
    if(!S.assessment||typeof S.assessment!=='object'||Array.isArray(S.assessment))S.assessment={};
    if(!Array.isArray(S.assessment.history))S.assessment.history=[];
    return S.assessment;
  }
  function signedIn(){return Boolean(typeof cloud!=='undefined'&&cloud&&cloud.ready&&cloud.user)}
  function latest(){return store().latest||null}
  function levelText(result){return result?result.range||result.level||'—':'Not assessed'}
  function confidenceLabel(value){return value==='medium'?'Moderate confidence':'Low confidence'}
  function cardHtml(){
    const result=latest();
    if(!signedIn()){
      return '<section class="panel assessment-card"><div class="eyebrow">ENGLISH LEVEL</div><h3 class="section-title" style="margin:6px 0">Personal level assessment</h3><p class="subhead">Sign in to save your assessment and use it to adjust your practice.</p><div class="assessment-actions"><button class="btn primary" onclick="cloudLogin()">Sign in</button></div></section>';
    }
    if(!result){
      const partial=store().lastAttempt?.overall?.status==='incomplete';
      return '<section class="panel assessment-card"><div class="eyebrow">ENGLISH LEVEL</div><h3 class="section-title" style="margin:6px 0">'+(partial?'Assessment not completed':'Your current level')+'</h3><div class="assessment-level">'+(partial?'—':'Not assessed')+'</div><p class="assessment-meta">15-minute Vocabulary + Grammar diagnostic</p><div class="assessment-actions"><button class="btn primary" onclick="window.startEngliwordsAssessment()">Start assessment</button></div></section>';
    }
    const overall=result.overall||{};
    const value=overall.range||overall.level||'—';
    return '<section class="panel assessment-card" role="group" aria-label="English level assessment"><div class="row spread"><div class="eyebrow">ENGLISH LEVEL</div><span class="badge">'+(overall.confidence==='medium'?'Provisional':'Preliminary')+'</span></div><div class="assessment-level" style="margin-top:9px">'+esc(value)+'</div><div class="assessment-meta">Current learning estimate · Vocabulary + Grammar</div><div class="assessment-actions"><button class="btn secondary" onclick="window.showEngliwordsAssessmentDetails()">View breakdown</button><button class="btn primary" onclick="window.startEngliwordsAssessment()">Retake assessment</button></div></section>';
  }
  const previousProfilePage=profilePage;
  profilePage=function(){
    const html=previousProfilePage();
    const marker='</section>';
    const index=html.indexOf(marker);
    return index>=0?html.slice(0,index+marker.length)+cardHtml()+html.slice(index+marker.length):cardHtml()+html;
  };

  function detailHtml(result){
    const skills=result?.skills||{};
    const rows=SKILLS.map(skill=>{
      const item=skills[skill];
      if(!item)return '<div class="assessment-result-row"><span>'+SKILL_LABELS[skill]+'</span><b>Not assessed</b></div>';
      return '<div class="assessment-result-row"><span><b>'+SKILL_LABELS[skill]+'</b><div class="assessment-small">'+confidenceLabel(item.confidence)+' · '+item.answered+'/10 answers · '+item.score+'% correct</div></span><b>'+esc(levelText(item))+'</b></div>';
    }).join('');
    const overall=result?.overall||{};
    return '<div class="assessment-detail"><div class="assessment-result-row"><span>Overall estimate</span><b>'+esc(overall.range||overall.level||'Incomplete')+'</b></div>'+rows+
      '<p class="assessment-small" style="margin-top:13px">This is a preliminary learning estimate based on Vocabulary and Grammar only. It is not an official CEFR certificate and does not measure Reading, Listening, Writing, or Speaking. Practice difficulty uses the lower confirmed skill level when evidence is uncertain.</p>'+
      '<p class="assessment-small">Last assessment: '+esc(new Date(result.completedAt||Date.now()).toLocaleString())+'</p></div>';
  }
  window.showEngliwordsAssessmentDetails=async function(){
    const result=latest();
    if(!result)return window.startEngliwordsAssessment();
    const action=await modal('Your English level',detailHtml(result),[
      {text:'Close',value:false},
      {text:'Retake assessment',value:'retake',primary:true}
    ]);
    if(action==='retake')window.startEngliwordsAssessment();
  };

  function removeOverlay(){
    if(timerId){clearInterval(timerId);timerId=null}
    document.getElementById('assessment-overlay')?.remove();
    run=null;
  }
  function overlay(){
    let root=document.getElementById('assessment-overlay');
    if(!root){root=document.createElement('div');root.id='assessment-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');document.body.appendChild(root)}
    return root;
  }
  function renderIntro(){
    const root=overlay();
    root.innerHTML='<div class="assessment-shell"><div class="assessment-top"><div class="assessment-brand">Engliwords · Level check</div><button class="assessment-close" onclick="window.cancelEngliwordsAssessment()">Close</button></div><section class="assessment-panel"><div class="assessment-eyebrow">15-MINUTE DIAGNOSTIC</div><h2>Find your starting level</h2><p class="assessment-muted">This check contains 10 Vocabulary questions and 10 Grammar questions. Questions adapt to your answers. You will see a preliminary learning estimate, not an official CEFR result.</p><div class="assessment-result-row"><span>Vocabulary</span><b>10 questions · about 7 minutes</b></div><div class="assessment-result-row"><span>Grammar</span><b>10 questions · about 7 minutes</b></div><div class="assessment-result-row"><span>Difficulty</span><b>A1–C2 screening</b></div><p class="assessment-small" style="margin-top:14px">Answer without a translator or outside help. Take your time; speed does not increase your score. If you are unsure, choose the best answer or skip. Your result is saved to your Engliwords profile.</p><div class="assessment-actions"><button class="assessment-primary" onclick="window.beginEngliwordsAssessment()">Begin 15-minute check</button></div></section></div>';
  }
  function formatTime(ms){
    const seconds=Math.max(0,Math.ceil(ms/1000));
    return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  }
  function updateTimer(){
    if(!run)return;
    const remaining=run.deadlineAt-Date.now();
    const timer=document.getElementById('assessment-timer');
    if(timer)timer.textContent=formatTime(remaining);
    if(remaining<=0)finishAssessment(true);
  }
  function startTimer(){
    if(timerId)clearInterval(timerId);
    timerId=setInterval(updateTimer,1000);
    updateTimer();
  }
  function currentSession(){return run?.sessions?.[run.skillIndex]||null}
  function currentSkill(){return SKILLS[run?.skillIndex]||null}
  function shufflePresentation(question){
    const order=question.choices.map((_,index)=>index);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    return {...question,choices:order.map(index=>question.choices[index]),answer:order.indexOf(question.answer)};
  }
  function getNextQuestion(){
    while(run.skillIndex<SKILLS.length){
      const session=currentSession();
      if(session.answers.length>=Core.QUESTIONS_PER_SKILL){
        run.skillIndex++;
        continue;
      }
      const question=Core.nextQuestion(session,BANK);
      if(!question){
        run.skillIndex++;
        continue;
      }
      run.question=shufflePresentation(question);
      run.questionStartedAt=Date.now();
      run.feedback=null;
      renderQuestion();
      return;
    }
    finishAssessment(false);
  }
  function renderQuestion(){
    const root=overlay(),session=currentSession(),skill=currentSkill(),question=run.question;
    if(!session||!skill||!question){finishAssessment(false);return}
    const number=session.answers.length+1;
    const progress=(session.answers.length/Core.QUESTIONS_PER_SKILL)*100;
    const options=question.choices.map((choice,index)=>{
      let state='';
      if(run.feedback&&index===run.feedback.selectedIndex)state=' is-selected';
      return '<button type="button" class="assessment-option'+state+'" '+(run.feedback?'disabled':'')+' onclick="window.answerEngliwordsAssessment('+index+')">'+String.fromCharCode(65+index)+'. '+esc(choice)+'</button>';
    }).join('');
    const feedback=run.feedback?
      '<div class="assessment-feedback"><b>'+(run.feedback.skipped?'Question skipped':'Answer recorded')+'</b><div style="margin-top:5px">'+(run.feedback.skipped?'This is counted as missing evidence.':'The next question will adapt to your answers.')+'</div></div>':'';
    const actions=run.feedback?
      '<div class="assessment-actions"><button class="assessment-primary" onclick="window.nextEngliwordsAssessmentQuestion()">Next question</button></div>':
      '<div class="assessment-actions"><button class="assessment-secondary" onclick="window.skipEngliwordsAssessmentQuestion()">Skip question</button></div>';
    root.innerHTML='<div class="assessment-shell"><div class="assessment-top"><div><div class="assessment-brand">Engliwords · Level check</div><div class="assessment-small">'+SKILL_LABELS[skill]+' · '+number+'/10</div></div><div class="row" style="gap:8px"><span class="assessment-timer" id="assessment-timer">'+formatTime(run.deadlineAt-Date.now())+'</span><button class="assessment-close" onclick="window.cancelEngliwordsAssessment()">×</button></div></div><section class="assessment-panel"><div class="row spread"><span class="assessment-eyebrow">'+SKILL_LABELS[skill]+'</span><span class="assessment-level-pill">'+question.level+'</span></div><div class="assessment-progress"><i style="width:'+progress+'%"></i></div><div class="assessment-muted">Question '+number+' of 10</div><div class="assessment-question">'+esc(question.prompt)+'</div><div class="assessment-options">'+options+'</div>'+feedback+actions+'</section><p class="assessment-small">Your level is estimated from a pattern of answers, not from one question. Skipped questions count as missing evidence.</p></div>';
  }
  window.answerEngliwordsAssessment=function(index){
    if(!run||run.feedback||!run.question)return;
    const question=run.question,session=currentSession();
    if(!Number.isInteger(index)||index<0||index>=question.choices.length)return;
    const elapsed=Date.now()-run.questionStartedAt;
    const answer=Core.recordAnswer(session,question,index,elapsed);
    run.feedback={...answer,selectedIndex:index};
    renderQuestion();
  };
  window.skipEngliwordsAssessmentQuestion=function(){
    if(!run||run.feedback||!run.question)return;
    const answer=Core.recordAnswer(currentSession(),run.question,null,Date.now()-run.questionStartedAt);
    run.feedback={...answer,selectedIndex:-1};
    renderQuestion();
  };
  window.nextEngliwordsAssessmentQuestion=function(){
    if(!run||!run.feedback)return;
    run.question=null;
    getNextQuestion();
  };
  window.beginEngliwordsAssessment=function(){
    if(!run)return;
    run.status='running';
    run.deadlineAt=Date.now()+TIME_LIMIT_MS;
    startTimer();
    getNextQuestion();
  };
  function renderResult(result){
    const root=overlay(),overall=result.overall||{};
    const value=overall.range||overall.level||'Not enough evidence';
    const rows=SKILLS.map(skill=>{
      const item=result.skills[skill];
      return '<div class="assessment-result-row"><span>'+SKILL_LABELS[skill]+'</span><b>'+(item?esc(levelText(item))+' · '+confidenceLabel(item.confidence):'Incomplete')+'</b></div>';
    }).join('');
    root.innerHTML='<div class="assessment-shell"><div class="assessment-top"><div class="assessment-brand">Engliwords · Results</div><button class="assessment-close" onclick="window.closeEngliwordsAssessment()">Close</button></div><section class="assessment-panel"><div class="assessment-eyebrow">YOUR LEARNING ESTIMATE</div><h2>'+esc(value)+'</h2><p class="assessment-muted">'+(overall.status==='provisional'?'This is a conservative preliminary estimate based on two skills.':'The assessment ended before enough evidence was collected for an overall estimate.')+'</p>'+rows+'<p class="assessment-small" style="margin-top:14px">This is not an official CEFR certificate. Reading, Listening, Writing, and Speaking have not been assessed yet. The first result has low-to-moderate confidence and can change as more evidence is collected.</p><div class="assessment-actions"><button class="assessment-primary" onclick="window.closeEngliwordsAssessment()">View profile</button></div></section></div>';
  }
  function finishAssessment(timedOut){
    if(!run||run.status==='finished')return;
    run.status='finished';
    if(timerId){clearInterval(timerId);timerId=null}
    const skills={
      vocabulary:Core.finalizeSkill(run.sessions[0]),
      grammar:Core.finalizeSkill(run.sessions[1])
    };
    const overall=Core.combineResults(skills.vocabulary,skills.grammar);
    const result={
      version:1,
      source:'initial_adaptive_assessment',
      completedAt:new Date().toISOString(),
      durationMs:Date.now()-run.startedAt,
      timedOut:Boolean(timedOut),
      skills,overall
    };
    const data=store();
    data.lastAttempt=result;
    data.history.unshift(result);
    data.history=data.history.slice(0,10);
    if(overall.status==='provisional')data.latest=result;
    save();
    renderResult(result);
  }
  window.closeEngliwordsAssessment=function(){
    removeOverlay();
    if(typeof render==='function')render();
  };
  window.cancelEngliwordsAssessment=async function(){
    if(!run)return;
    const ok=await modal('Exit level check?','<p class="subhead">Your unfinished answers will not change your saved level.</p>',[
      {text:'Continue assessment',value:false},
      {text:'Exit',value:true,primary:true}
    ]);
    if(ok)window.closeEngliwordsAssessment();
  };
  window.startEngliwordsAssessment=function(){
    if(!signedIn()){
      toast('Sign in to save your level assessment.');
      if(typeof cloudLogin==='function')cloudLogin();
      return;
    }
    if(bankErrors.length){
      console.error('Assessment question bank validation failed:',bankErrors);
      toast('The level check is temporarily unavailable. Please try again later.');
      return;
    }
    run={
      status:'intro',startedAt:Date.now(),deadlineAt:0,skillIndex:0,
      sessions:SKILLS.map(skill=>Core.createSkillSession(skill)),
      question:null,questionStartedAt:0,feedback:null
    };
    renderIntro();
  };

  function vocabularyPracticeBand(){
    const result=latest(),skill=result?.skills?.vocabulary;
    return Core.exerciseDifficulty(skill?.level||'A1');
  }
  if(typeof sentenceLevel==='function')sentenceLevel=function(){return vocabularyPracticeBand()};
  if(typeof levelFor==='function')levelFor=function(){return vocabularyPracticeBand()};
  if(typeof buildMissingWordQuestion==='function'){
    buildMissingWordQuestion=function(word,preferredLevel){
      const order=preferredLevel==='hard'?['hard','normal','easy']:preferredLevel==='normal'?['normal','easy','hard']:['easy','normal','hard'];
      let selected=null;
      for(const level of order){
        const ex=word.examples?.[level];
        if(!ex?.en||(word.examples?.nativeLanguage&&word.examples.nativeLanguage!==window.engNativeCode()))continue;
        const pattern=new RegExp('(^|[^A-Za-z])('+escapeMissingWordRegex(word.word)+')(?=$|[^A-Za-z])','i');
        if(pattern.test(String(ex.en))){selected={level,ex,pattern};break}
      }
      if(!selected)return null;
      const sentence=String(selected.ex.en).replace(selected.pattern,(whole,prefix)=>prefix+'________');
      const seen=new Set([String(word.word||'').trim().toLocaleLowerCase()]);
      const options=[{word:String(word.word).trim(),correct:true}];
      const personal=shuffleMissingWord((S.words||[]).filter(x=>x&&x.id!==word.id&&String(x.word||'').trim()));
      for(const item of personal){
        const label=String(item.word).trim(),key=label.toLocaleLowerCase();
        if(!key||seen.has(key))continue;
        seen.add(key);options.push({word:label,correct:false});if(options.length===4)break;
      }
      if(options.length<4){
        for(const label of shuffleMissingWord(MISSING_WORD_FALLBACK)){
          const key=label.toLocaleLowerCase();if(seen.has(key))continue;
          seen.add(key);options.push({word:label,correct:false});if(options.length===4)break;
        }
      }
      if(options.length!==4)return null;
      return {wordId:word.id,level:selected.level,sentence,translation:selected.ex.uz||word.translation||'',options:shuffleMissingWord(options),selected:null,checked:false,correctWord:word.word};
    };
  }
  window.engliwordsAssessmentPracticeBand=vocabularyPracticeBand;
  window.EngliwordsAssessment={core:Core,bank:()=>BANK,validateBank:()=>bankErrors.slice()};
  if(typeof render==='function')render();
})();
