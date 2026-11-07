/* Supabase authentication and account-scoped sync for English So'z.
   The old Google Drive implementation remains available for rollback until migration is verified. */
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Keep the same key Supabase v2 derives by default, so existing sessions remain valid.
    storage: window.localStorage,
    storageKey: "sb-wxrcwqlqdjljqztnpvvs-auth-token",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce"
  }
});

let sbUserId = null;
let sbSaveTimer = null;
let sbBusy = false;
let sbLastError = "";
let sbHandlingUser = null;

function sbNormalizeState(data) {
  const d = typeof defaults === "function" ? defaults() : {words:[],progress:{},cache:{s:{},t:{}},set:{sound:true,vib:true,accent:"en-US",nativeLanguage:""},history:{}};
  const x = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  return {
    ...d, ...x,
    words: Array.isArray(x.words) ? x.words.map(w => ({...w, id:String(w.id || (typeof uid === "function" ? uid() : Date.now())), done:Array.isArray(w.done)?w.done:[], examples:typeof normalizeExamples==="function"?normalizeExamples(w.examples,w.example):(w.examples||{})})) : [],
    progress: x.progress && typeof x.progress === "object" ? x.progress : {},
    cache: x.cache && typeof x.cache === "object" ? x.cache : {s:{},t:{}},
    set: {...d.set, ...(x.set || {})},
    history: x.history && typeof x.history === "object" ? x.history : {}
  };
}

function sbRender() {
  const status = document.getElementById("cloud-status");
  const actions = document.getElementById("cloud-actions");
  if (!status || !actions) return;
  if (!sbUserId) {
    status.textContent = "Mehmon rejimi — ma’lumotlar ushbu qurilmada saqlanadi.";
    actions.innerHTML = '<button onclick="cloudLogin()" style="padding:10px 14px;border:0;border-radius:12px;cursor:pointer">Sign in / Sign up</button>';
    return;
  }
  status.textContent = sbBusy ? "☁️ Supabase bilan sinxronlanmoqda..." : (sbLastError ? "⚠️ Sinxronlash xatosi: " + sbLastError : "☁️ Supabase bilan sinxronlangan");
  const name = (window.__sbProfile && window.__sbProfile.name) || "Engliwords foydalanuvchisi";
  actions.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:13px;flex:1;min-width:90px">' + String(name).replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])) + '</div><button onclick="cloudUpload()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">☁️ Hozir saqlash</button><button onclick="cloudLogout()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">Chiqish</button></div>';
  sbEnsureAuthEntry();
}

// Reuse the existing profile UI render hook, but display Supabase status.
cloudRender = sbRender;

async function sbLoadOrMigrate(user) {
  const {data: row, error} = await supabaseClient.from("user_data").select("user_id,data,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (row) {
    S = sbNormalizeState(row.data);
    
    if (typeof render === "function") render();
    return;
  }
  // A new Supabase user must never inherit another profile’s browser state.
  const initial = sbNormalizeState(defaults());
  const {error: insertError} = await supabaseClient.from("user_data").insert({user_id:user.id,data:initial,updated_at:new Date().toISOString()});
  if (insertError) throw insertError;
  S = initial;
}

async function sbHandleSession(session) {
  const user = session && session.user;
  if (!user) {
    sbHandlingUser = null;
    sbUserId = null;
    sbBusy = false;
    window.__sbProfile = null;
    if (typeof cloud === "object") { cloud.user = null; cloud.ready = false; cloud.token = null; }
    try {
      const guest = JSON.parse(localStorage.getItem("eng-data:local") || "null");
      S = guest && typeof guest === "object" ? sbNormalizeState(guest) : sbNormalizeState(defaults());
    } catch { S = sbNormalizeState(defaults()); }
    sbRender();
    sbEnsureAuthEntry();
    if (typeof render === "function") render();
    return;
  }
  if (sbHandlingUser === user.id && sbUserId === user.id) return;
  if (sbUserId !== user.id) S = sbNormalizeState(defaults());
  sbHandlingUser = user.id;
  sbBusy = true;
  sbLastError = "";
  sbUserId = user.id;
  try {
    await sbLoadOrMigrate(user);
    const savedNative = String(S?.set?.nativeLanguage || user.user_metadata?.native_language || "");
    if (!S.set) S.set = {};
    if (!S.set.nativeLanguage && (window.ENG_LANGUAGES||[]).some(l=>l.code===user.user_metadata?.native_language)) S.set.nativeLanguage=user.user_metadata.native_language;
    if (!S.set.nativeLanguage && savedNative && (window.ENG_LANGUAGES||[]).some(l=>l.code===savedNative)) S.set.nativeLanguage=savedNative;
    let nickname = String(user.user_metadata?.nickname || "").trim();
    const metadataLanguage=String(user.user_metadata?.native_language||"");
    if (!nickname || !(window.ENG_LANGUAGES||[]).some(l=>l.code===String(S?.set?.nativeLanguage||metadataLanguage))) {
      await sbCompleteProfileSetup(user);
      nickname=String(user.user_metadata?.nickname||"").trim();
    }
    window.__sbProfile = {name:nickname, picture:user.user_metadata?.avatar_url || user.user_metadata?.picture || ""};
    if (typeof cloud === "object") {
      cloud.user = {sub:user.id, name:nickname, picture:window.__sbProfile.picture};
      cloud.ready = true;
      cloud.token = null;
    }
    if (typeof translator !== "undefined") translator.tl = String(S.set.nativeLanguage || "en");
    sbLastError = "";
  } catch (e) {
    console.error("Supabase profile setup failed:", e);
    sbLastError = e?.message || "Profil ma’lumotlarini yuklab bo‘lmadi";
    sbUserId = null;
    if (typeof cloud === "object") { cloud.user = null; cloud.ready = false; }
    try {
      const guest = JSON.parse(localStorage.getItem("eng-data:local") || "null");
      S = guest && typeof guest === "object" ? sbNormalizeState(guest) : sbNormalizeState(defaults());
    } catch { S = sbNormalizeState(defaults()); }
    if (typeof toast === "function") toast("Profil yuklanmadi. Mehmon rejimida davom etishingiz mumkin.");
  } finally {
    sbBusy = false;
    sbHandlingUser = null;
    sbRender();
    if (typeof render === "function") render();
  }
}

function cloudLogin(mode) {
  sbRenderAuthGate(mode || "choice");
}
async function sbSubmitAuth(mode) {
  const email = String(document.getElementById("sb-auth-email")?.value || "").trim();
  const password = String(document.getElementById("sb-auth-password")?.value || "");
  const nickname = String(document.getElementById("sb-auth-nickname")?.value || "").trim();
  const nativeLanguage = String(document.getElementById("sb-auth-native-language")?.value || "");
  const errorBox = document.getElementById("sb-auth-error");
  const submit = document.getElementById("sb-auth-submit");
  const showError = message => { if (errorBox) errorBox.textContent = message; };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("To‘g‘ri email manzil kiriting.");
  if (password.length < 6) return showError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak.");
  if (mode === "signup" && (nickname.length < 2 || nickname.length > 24)) return showError("Nickname must contain 2–24 characters.");
  if (mode === "signup" && !(window.ENG_LANGUAGES||[]).some(l=>l.code===nativeLanguage)) return showError("Choose your native language.");
  if (submit) { submit.disabled = true; submit.textContent = mode === "signup" ? "Profil yaratilmoqda…" : "Kirilmoqda…"; }
  try {
    if (mode === "signup") {
      const {data,error} = await supabaseClient.auth.signUp({
        email, password,
        options: {data:{nickname,native_language:nativeLanguage}}
      });
      if (error) throw error;
      if (data.session) {
        sbCloseAuthGate();
        await sbHandleSession(data.session);
        if (typeof toast === "function") toast("Profil yaratildi. Xush kelibsiz, " + nickname + "!");
      } else {
        sbRenderAuthGate("message", "Tasdiqlash xabari emailingizga yuborildi. Emailni tasdiqlagach, Sign in orqali kiring.");
      }
    } else {
      const {data,error} = await supabaseClient.auth.signInWithPassword({email,password});
      if (error) throw error;
      sbCloseAuthGate();
      await sbHandleSession(data.session);
      if (typeof toast === "function") toast("Profilga muvaffaqiyatli kirdingiz.");
    }
  } catch (e) {
    console.error("Email/password authentication failed:",e);
    showError(e?.message || "Kirishda xatolik yuz berdi.");
    if (submit) { submit.disabled = false; submit.textContent = mode === "signup" ? "Sign up" : "Sign in"; }
  }
}
window.sbSubmitAuth = sbSubmitAuth;

async function cloudUpload() {
  if (!sbUserId || sbBusy) return;
  sbBusy = true;
  sbLastError = "";
  sbRender();
  try {
    const {data: userResult, error: userError} = await supabaseClient.auth.getUser();
    if (userError || !userResult?.user || userResult.user.id !== sbUserId) throw userError || new Error("Akkaunt tasdiqlanmadi.");
    const {error} = await supabaseClient.from("user_data").upsert({
      user_id: sbUserId,
      data: sbNormalizeState(S),
      updated_at: new Date().toISOString()
    }, {onConflict:"user_id"});
    if (error) throw error;
    sbLastError = "";

  } catch (e) {
    console.error("Supabase save failed:", e);
    sbLastError = e?.message || "Saqlash amalga oshmadi";

  } finally {
    sbBusy = false;
    sbRender();
  }
}

function cloudSaveDebounced() {
  clearTimeout(sbSaveTimer);
  sbSaveTimer = setTimeout(async () => {
    if (sbUserId) { await cloudUpload(); return; }
    try { localStorage.setItem("eng-data:local", JSON.stringify(sbNormalizeState(S))); }
    catch (e) { console.warn("Guest save failed:", e); }
  }, 700);
}

async function cloudLogout() {
  try {
    const {error} = await supabaseClient.auth.signOut();
    if (error) throw error;
    sbUserId = null;
    S = typeof defaults === "function" ? defaults() : {words:[],progress:{},cache:{s:{},t:{}},set:{},history:{}};
    sbLastError = "";
    if (typeof cloud === "object") { cloud.user = null; cloud.ready = false; cloud.token = null; }

    if (typeof render === "function") render();
    sbRender();
  } catch (e) {
    console.error(e);
    alert("Chiqishda xatolik: " + (e?.message || "Noma'lum xato"));
  }
}

try { localStorage.removeItem("eng-cloud-profile"); localStorage.removeItem("eng-cloud-linked"); } catch {}

// Preserve guest-mode data locally; remove only the obsolete pre-account key.
try { localStorage.removeItem("eng"); } catch {}

// Re-read persisted auth state when the PWA becomes visible. Some Android
// standalone launches can deliver an early empty INITIAL_SESSION event while
// the persisted session is still being restored.
let sbSessionCheckInProgress = false;
async function sbRestoreSession(source) {
  if (sbSessionCheckInProgress) return;
  sbSessionCheckInProgress = true;
  try {
    const {data, error} = await supabaseClient.auth.getSession();
    if (error) throw error;
    await sbHandleSession(data.session);
  } catch (e) {
    console.error("Supabase session restore failed (" + source + "):", e);
    sbLastError = e?.message || "Sessiyani tiklab bo'lmadi";
    sbRender();
    sbEnsureAuthEntry();
  } finally {
    sbSessionCheckInProgress = false;
  }
}




function sbFilterNativeOptions(query){
 const q=String(query||"").trim().toLocaleLowerCase();
 document.querySelectorAll("#sb-native-options option").forEach(o=>{o.hidden=!!q&&!o.textContent.toLocaleLowerCase().includes(q);});
}
async function sbCompleteProfileSetup(user){
 const currentName=String(user.user_metadata?.nickname||"").trim();
 const currentLang=String(S?.set?.nativeLanguage||user.user_metadata?.native_language||"");
 const validLang=(window.ENG_LANGUAGES||[]).some(l=>l.code===currentLang);
 const root=document.createElement("div");root.id="sb-profile-setup";
 root.style.cssText="position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:18px;background:#030b18d9;backdrop-filter:blur(12px);color:#f3f7ff;font-family:inherit";
 const opts=(window.ENG_LANGUAGES||[]).map(l=>'<option value="'+sbGateEscape(l.code)+'" '+(l.code===(validLang?currentLang:"uz")?'selected':'')+'>'+sbGateEscape(l.name)+' — '+sbGateEscape(l.native)+'</option>').join('');
 root.innerHTML='<form id="sb-profile-setup-form" style="width:min(430px,100%);max-height:90dvh;overflow:auto;padding:25px 21px;border:1px solid #ffffff24;border-radius:24px;background:linear-gradient(145deg,#172b47,#101e34);box-shadow:0 24px 70px #0007"><h2 style="margin:0 0 8px">Complete your profile</h2><p style="color:#b5c6dc;font-size:13px;line-height:1.5">Choose a nickname and your native language. The app interface always stays in English. Your native language is used only for translations and learning exercises and cannot be changed later.</p><label for="sb-profile-nickname" style="display:block;margin:13px 0 6px;font-size:12px;color:#c7d6e8;font-weight:700">Nickname</label><input id="sb-profile-nickname" type="text" minlength="2" maxlength="24" autocomplete="nickname" placeholder="Your nickname" value="'+sbGateEscape(currentName)+'" required style="width:100%;padding:13px;border-radius:12px;border:1px solid #3a506d;background:#091629;color:#fff;font:inherit;box-sizing:border-box"><label for="sb-native-search" style="display:block;margin:13px 0 6px;font-size:12px;color:#c7d6e8;font-weight:700">Search native language</label><input id="sb-native-search" type="search" placeholder="Type a language name..." oninput="sbFilterNativeOptions(this.value)" style="width:100%;padding:13px;border-radius:12px;border:1px solid #3a506d;background:#091629;color:#fff;font:inherit;box-sizing:border-box"><select id="sb-native-options" size="6" required style="width:100%;margin-top:8px;padding:10px;border-radius:12px;border:1px solid #3a506d;background:#091629;color:#fff;font:inherit;box-sizing:border-box">'+opts+'</select><p id="sb-profile-error" style="color:#ff9aa5;font-size:12px"></p><button type="submit" style="width:100%;margin-top:12px;padding:13px;border:0;border-radius:13px;background:linear-gradient(120deg,#75e5d2,#a0f0dc);color:#071b20;font:inherit;font-weight:800">Save and continue</button></form>';
 document.body.appendChild(root);
 await new Promise(resolve=>root.querySelector("form").addEventListener("submit",e=>{e.preventDefault();resolve()}, {once:true}));
 const nickname=String(root.querySelector("#sb-profile-nickname").value||"").trim();
 const nativeLanguage=String(root.querySelector("#sb-native-options").value||"");
 if(nickname.length<2||nickname.length>24||!(window.ENG_LANGUAGES||[]).some(l=>l.code===nativeLanguage)){
  root.querySelector("#sb-profile-error").textContent="Enter a nickname (2–24 characters) and choose a language.";
  await new Promise(resolve=>setTimeout(resolve,900));
  root.remove();throw new Error("Profile details are incomplete.");
 }
 const {data,error}=await supabaseClient.auth.updateUser({data:{nickname,native_language:nativeLanguage}});
 if(error){root.remove();throw error;}
 S.set.nativeLanguage=nativeLanguage;
 if(typeof save==="function")save();
 if(typeof cloud==="object"&&cloud.user)cloud.user.name=nickname;
 window.__sbProfile={...(window.__sbProfile||{}),name:nickname};
 root.remove();
}

function sbGateEscape(v) {
  return String(v || "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function sbCloseAuthGate() {
  const root=document.getElementById("sb-auth-gate");
  if(root) root.remove();
}
function sbRenderAuthGate(mode="choice", message="") {
  let root=document.getElementById("sb-auth-gate");
  if(!root){root=document.createElement("div");root.id="sb-auth-gate";document.body.appendChild(root);}
  if(!document.getElementById("sb-auth-gate-css")){
    const style=document.createElement("style");style.id="sb-auth-gate-css";
    style.textContent="#sb-auth-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:#030b18b8;backdrop-filter:blur(12px);color:var(--text);font-family:inherit}#sb-auth-gate .gate-card{position:relative;width:min(430px,100%);max-height:90dvh;overflow:auto;padding:25px 21px;border:1px solid #ffffff24;border-radius:24px;background:linear-gradient(145deg,#172b47,#101e34);box-shadow:0 24px 70px #0007}#sb-auth-gate h2{margin:0 34px 8px 0;font-size:23px}#sb-auth-gate p{color:#b5c6dc;font-size:13px;line-height:1.5}#sb-auth-gate label{display:block;margin:13px 0 6px;font-size:12px;color:#c7d6e8;font-weight:700}#sb-auth-gate input{width:100%;padding:13px;border-radius:12px;border:1px solid #3a506d;background:#091629;color:#fff;font:inherit;box-sizing:border-box}#sb-auth-gate button{padding:13px;border:0;border-radius:13px;background:linear-gradient(120deg,#75e5d2,#a0f0dc);color:#071b20;font:inherit;font-weight:800;cursor:pointer}#sb-auth-gate button:disabled{opacity:.6}#sb-auth-gate .gate-primary{width:100%;margin-top:16px}#sb-auth-gate .gate-secondary{width:100%;margin-top:9px;background:#243b57;color:#edf4ff;border:1px solid #ffffff20}#sb-auth-gate .gate-close{position:absolute;right:15px;top:14px;width:34px;height:34px;padding:0;background:#ffffff12;color:#fff;border:1px solid #ffffff20;border-radius:50%;font-size:20px}#sb-auth-gate .gate-error{color:#ff9aa5;font-size:12px;overflow-wrap:anywhere}#sb-auth-gate .gate-note{font-size:11px;color:#9fb2ca}";
    document.head.appendChild(style);
  }
  const close='<button class="gate-close" type="button" onclick="sbCloseAuthGate()" aria-label="Close">×</button>';
  if(mode==="signin"||mode==="signup"){
    const isUp=mode==="signup";
    root.innerHTML='<form class="gate-card" onsubmit="event.preventDefault();sbSubmitAuth(\''+mode+'\')">'+close+'<h2>'+(isUp?"Create account":"Sign in")+'</h2><p>'+(isUp?"Create your personal Engliwords profile.":"Sign in to your existing Engliwords profile.")+'</p>'+
      (isUp?'<label for="sb-auth-nickname">Nickname</label><input id="sb-auth-nickname" type="text" minlength="2" maxlength="24" autocomplete="nickname" placeholder="Your nickname" required><label for="sb-auth-native-language">Your native language</label><select id="sb-auth-native-language" required style="width:100%;padding:13px;border-radius:12px;border:1px solid #3a506d;background:#091629;color:#fff;font:inherit;box-sizing:border-box">'+(window.ENG_LANGUAGES||[]).map(l=>'<option value="'+sbGateEscape(l.code)+'" '+(l.code==='uz'?'selected':'')+'>'+sbGateEscape(l.name)+' — '+sbGateEscape(l.native)+'</option>').join('')+'</select><p class="gate-note">The app interface stays in English. This language is used for translations and AI explanations and cannot be changed later.</p>':'')+
      '<label for="sb-auth-email">Gmail / Email</label><input id="sb-auth-email" type="email" autocomplete="email" placeholder="name@gmail.com" required><label for="sb-auth-password">Password</label><input id="sb-auth-password" type="password" minlength="6" autocomplete="'+(isUp?"new-password":"current-password")+'" placeholder="At least 6 characters" required><p class="gate-error" id="sb-auth-error">'+sbGateEscape(message)+'</p><button id="sb-auth-submit" class="gate-primary" type="submit">'+(isUp?"Sign up":"Sign in")+'</button><button class="gate-secondary" type="button" onclick="sbRenderAuthGate(\''+(isUp?"signin":"signup")+'\')">'+(isUp?"Already have an account? Sign in":"New here? Sign up")+'</button></form>';
    setTimeout(()=>document.getElementById("sb-auth-email")?.focus(),0);
  } else if(mode==="message"){
    root.innerHTML='<div class="gate-card">'+close+'<h2>Check your email</h2><p>'+sbGateEscape(message)+'</p><button class="gate-primary" onclick="sbRenderAuthGate(\'signin\')">Go to Sign in</button></div>';
  } else {
    root.innerHTML='<div class="gate-card">'+close+'<h2>Engliwords account</h2><p>Choose how you want to continue.</p><button class="gate-primary" onclick="sbRenderAuthGate(\'signin\')">Sign in</button><button class="gate-secondary" onclick="sbRenderAuthGate(\'signup\')">Sign up</button></div>';
  }
}
function sbEnsureAuthEntry(){
  const top=document.querySelector(".top2 .topr")||document.querySelector(".top");
  if(!top)return;
  let button=document.getElementById("sb-auth-entry");
  if(!button){button=document.createElement("button");button.id="sb-auth-entry";button.type="button";button.className="btn small";button.style.cssText="margin-left:8px;white-space:nowrap;flex:none";top.appendChild(button);}
  const signed=Boolean(sbUserId);
  button.textContent=signed?("👤 "+((window.__sbProfile&&window.__sbProfile.name)||"Profile")):"Sign in";
  button.classList.toggle("primary",!signed);
  button.classList.toggle("secondary",signed);
  button.onclick=()=>signed?(typeof page!=="undefined"?(page="profile",render()):sbRenderAuthGate("choice")):sbRenderAuthGate("choice");
}
function cloudSaveDebounced(){
  clearTimeout(sbSaveTimer);
  sbSaveTimer=setTimeout(async()=>{
    if(sbUserId){await cloudUpload();return;}
    try{localStorage.setItem("eng-data:local",JSON.stringify(sbNormalizeState(S)));}catch(e){console.warn("Guest save failed:",e);}
  },700);
}
window.sbCloseAuthGate=sbCloseAuthGate;
window.sbRenderAuthGate=sbRenderAuthGate;
window.cloudLogin=cloudLogin;

// Keep the optional account action visible after every app navigation/render.
const sbBaseRender = typeof render === "function" ? render : null;
if (sbBaseRender) {
  render = function() {
    sbBaseRender();
    sbEnsureAuthEntry();
  };
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" && !session) {
        // Do not clear a valid session based only on an early empty startup event.
        setTimeout(() => sbRestoreSession("INITIAL_SESSION"), 150);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => sbHandleSession(session), 0);
      }
    });

    await sbRestoreSession("startup");
  } catch (e) {
    console.error("Supabase initialization failed:", e);
    sbLastError = e?.message || "Boshlashda xatolik";
    sbRender();
    sbEnsureAuthEntry();
  }
});

// Check again whenever the installed app returns to the foreground.
window.addEventListener("pageshow", () => sbRestoreSession("pageshow"));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") sbRestoreSession("visible");
});
