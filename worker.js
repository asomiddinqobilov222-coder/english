/**
 * English So'z AI proxy for Cloudflare Workers.
 * Configure OPENROUTER_API_KEY as a Worker SECRET, not a plain variable.
 * Set APP_ORIGIN to https://asomiddinqobilov222-coder.github.io
 */
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}})}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=env.APP_ORIGIN||'https://asomiddinqobilov222-coder.github.io';
  const cors={'access-control-allow-origin':origin===allowed?origin:allowed,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'Content-Type','vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(origin!==allowed)return json({error:'Origin not allowed'},403,cors);
  if(request.method!=='POST')return json({error:'POST only'},405,cors);
  if(!env.OPENROUTER_API_KEY)return json({error:'Server AI key is not configured'},503,cors);
  const path=new URL(request.url).pathname;
  if(path!=='/examples')return json({error:'Not found'},404,cors);
  let body;try{body=await request.json()}catch{return json({error:'Invalid JSON'},400,cors)}
  const word=String(body.word||'').trim(),translation=String(body.translation||'').trim();
  if(!word||!translation||word.length>100||translation.length>180)return json({error:'A valid word and translation are required'},400,cors);
  const prompt=`Create three natural English example sentences for an English learner studying the word "${word}" (Uzbek meaning: "${translation}"). Return ONLY valid JSON with keys easy, normal, hard. Each key must have an object {"en":"...","uz":"..."}. Easy: A1-A2, short and simple. Normal: B1, natural everyday sentence. Hard: B2-C1, more complex but still natural. Every English sentence must use the exact target word or a natural inflected form. Uzbek translation must accurately translate the sentence. Do not add Markdown or commentary.`;
  try{
   const upstream=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':allowed,'X-Title':'English Soz'},body:JSON.stringify({model:'openrouter/free',messages:[{role:'system',content:'You are a careful English teaching assistant. Follow the requested JSON schema exactly.'},{role:'user',content:prompt}],temperature:0.4,max_tokens:700})});
   if(!upstream.ok){const detail=(await upstream.text()).slice(0,500);return json({error:'OpenRouter request failed',detail},502,cors)}
   const result=await upstream.json();let content=result?.choices?.[0]?.message?.content;if(Array.isArray(content))content=content.map(x=>x.text||'').join('');content=String(content||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
   let parsed;try{parsed=JSON.parse(content)}catch{const match=content.match(/\{[\s\S]*\}/);if(!match)throw new Error('AI response was not JSON');parsed=JSON.parse(match[0])}
   const clean={};for(const level of ['easy','normal','hard']){const ex=parsed[level];if(!ex||typeof ex.en!=='string'||typeof ex.uz!=='string')throw new Error('Missing '+level+' example');clean[level]={en:ex.en.trim().slice(0,400),uz:ex.uz.trim().slice(0,500)}}
   return json({examples:clean,model:result.model||'openrouter/free'},200,cors);
  }catch(error){return json({error:'Could not generate examples',detail:String(error.message||error).slice(0,250)},502,cors)}
 }
};
