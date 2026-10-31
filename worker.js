/**
 * Engliwords Groq proxy — deploy as Cloudflare Worker.
 * Required secrets/vars:
 *   GROQ_API_KEY (Secret)
 *   SUPABASE_URL (Variable): https://wxrcwqlqdjljqztnpvvs.supabase.co
 *   SUPABASE_PUBLISHABLE_KEY (Variable): sb_publishable_...
 * Optional APP_ORIGINS comma-separated origins.
 */
const DEFAULT_ORIGINS = [
 'https://asomiddinqobilov222-coder.github.io',
 'https://engliwords.uz',
 'https://www.engliwords.uz'
];
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}})}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path!=='/models'&&path!=='/chat/completions')return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin')||'';
  const allowed=[...DEFAULT_ORIGINS,...String(env.APP_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)];
  const cors={'access-control-allow-origin':allowed.includes(origin)?origin:'null','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'Authorization, Content-Type','access-control-max-age':'86400','vary':'Origin'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(!allowed.includes(origin))return json({error:'Origin not allowed'},403,cors);
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405,cors);
  if(!env.GROQ_API_KEY)return json({error:'Server AI key is not configured'},503,cors);
  if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return json({error:'Authentication is not configured'},503,cors);
  const auth=request.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return json({error:'Sign-in required'},401,cors);
  try{
   const verify=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:auth}});
   if(!verify.ok)return json({error:'Session expired; sign in again'},401,cors);
  }catch{return json({error:'Could not verify sign-in'},502,cors)}
  if(path!=='/models'&&path!=='/chat/completions')return json({error:'Not found'},404,cors);
  if(path==='/models'&&request.method!=='GET')return json({error:'GET required'},405,cors);
  if(path==='/chat/completions'&&request.method!=='POST')return json({error:'POST required'},405,cors);
  let body;
  if(path==='/chat/completions'){
   const len=Number(request.headers.get('content-length')||0);
   if(len>50000)return json({error:'Request too large'},413,cors);
   try{body=await request.json()}catch{return json({error:'Invalid JSON'},400,cors)}
   if(!body||!Array.isArray(body.messages)||body.messages.length>30)return json({error:'Invalid chat request'},400,cors);
   body.model=String(body.model||'openai/gpt-oss-20b').slice(0,120);
   body.max_completion_tokens=Math.min(Math.max(Number(body.max_completion_tokens)||500,1),900);
  }
  try{
   const upstream=await fetch('https://api.groq.com/openai/v1'+path,{
    method:path==='/models'?'GET':'POST',
    headers:{Authorization:'Bearer '+env.GROQ_API_KEY,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
   });
   const result=await upstream.text();
   return new Response(result,{status:upstream.status,headers:{...cors,...JSON_HEADERS}});
  }catch{return json({error:'Could not connect to Groq'},502,cors)}
 }
};
