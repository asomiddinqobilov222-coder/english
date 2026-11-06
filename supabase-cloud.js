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
  const d = typeof defaults === "function" ? defaults() : {words:[],progress:{},cache:{s:{},t:{}},set:{sound:true,vib:true,accent:"en-US"},history:{}};
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
    status.textContent = "Hozircha qurilmada saqlanmoqda. Google orqali kirib, bulutli saqlashni yoqing.";
    actions.innerHTML = '<button onclick="cloudLogin()" style="padding:10px 14px;border:0;border-radius:12px;cursor:pointer">🔐 Gmail bilan ro‘yxatdan o‘tish</button>';
    return;
  }
  status.textContent = sbBusy ? "☁️ Supabase bilan sinxronlanmoqda..." : (sbLastError ? "⚠️ Sinxronlash xatosi: " + sbLastError : "☁️ Supabase bilan sinxronlangan");
  const name = (window.__sbProfile && window.__sbProfile.name) || "Engliwords foydalanuvchisi";
  actions.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:13px;flex:1;min-width:90px">' + String(name).replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])) + '</div><button onclick="cloudUpload()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">☁️ Hozir saqlash</button><button onclick="cloudLogout()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">Chiqish</button></div>';
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
  let user = session && session.user;
  if (!user) {
    sbHandlingUser = null;
    sbUserId = null;
    sbBusy = false;
    S = typeof defaults === "function" ? defaults() : {words:[],progress:{},cache:{s:{},t:{}},set:{},history:{}};
    window.__sbProfile = null;
    if (typeof cloud === "object") { cloud.user = null; cloud.ready = false; cloud.token = null; }
    sbRender();
    sbRenderAuthGate("signup");
    return;
  }
  if (sbHandlingUser === user.id && sbUserId === user.id) return;
  if (sbUserId !== user.id) S = typeof defaults === "function" ? defaults() : {words:[],progress:{},cache:{s:{},t:{}},set:{},history:{}};
  sbHandlingUser = user.id;
  sbBusy = true;
  sbLastError = "";
  sbUserId = user.id;
  sbRenderAuthGate("loading");
  try {
    await sbLoadOrMigrate(user);
    let nickname = String(user.user_metadata?.nickname || "").trim();
    if (!nickname) {
      sbRenderAuthGate("nickname");
      user = await new Promise(resolve => { sbNicknameResolver = resolve; });
      nickname = String(user.user_metadata?.nickname || "").trim();
    }
    window.__sbProfile = {name:nickname, picture:user.user_metadata?.avatar_url || user.user_metadata?.picture || ""};
    if (typeof cloud === "object") {
      cloud.user = {sub:user.id, name:nickname, picture:window.__sbProfile.picture};
      cloud.ready = true;
      cloud.token = null;
    }
    sbLastError = "";
    sbRenderAuthGate("hidden");
  } catch (e) {
    console.error("Supabase profile setup failed:", e);
    sbLastError = e?.message || "Profil ma’lumotlarini yuklab bo‘lmadi";
    sbRenderAuthGate("signup", sbLastError);
  } finally {
    sbBusy = false;
    sbHandlingUser = null;
    sbRender();
    if (typeof render === "function") render();
  }
}

async function cloudLogin() {
  try {
    sbRenderAuthGate("loading");
    const {error} = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {redirectTo: "https://asomiddinqobilov222-coder.github.io/english/"}
    });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    sbRenderAuthGate("signup", "Ro‘yxatdan o‘tishda xatolik: " + (e?.message || "Noma’lum xato"));
  }
}

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
  if (!sbUserId) return;
  clearTimeout(sbSaveTimer);
  sbSaveTimer = setTimeout(() => cloudUpload(), 900);
}

async function cloudLogout() {
  if (!confirm("Profildan chiqilsinmi?")) return;
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

// Remove legacy local copies of vocabulary/progress so they cannot leak across profiles.
try {
  for (const key of Object.keys(localStorage)) {
    if (key === "eng" || key.startsWith("eng-data:")) localStorage.removeItem(key);
  }
} catch (e) { console.warn("Legacy local data cleanup failed:", e); }

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
  } finally {
    sbSessionCheckInProgress = false;
  }
}


let sbNicknameResolver = null;
function sbGateEscape(v) {
  return String(v || "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function sbRenderAuthGate(mode, errorText="") {
  if (!document.body) return;
  let root = document.getElementById("sb-auth-gate");
  if (mode === "hidden") { if (root) root.remove(); return; }
  if (!root) { root = document.createElement("div"); root.id = "sb-auth-gate"; document.body.appendChild(root); }
  if (!document.getElementById("sb-auth-gate-css")) {
    const style = document.createElement("style");
    style.id = "sb-auth-gate-css";
    style.textContent = "#sb-auth-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:linear-gradient(155deg,#071326f7,#102b43f7);backdrop-filter:blur(18px);color:#f3f7ff;font-family:inherit}#sb-auth-gate .gate-card{width:min(430px,100%);padding:26px 22px;border:1px solid #ffffff24;border-radius:24px;background:linear-gradient(145deg,#172b47,#101e34);box-shadow:0 24px 70px #0007;text-align:center}#sb-auth-gate h2{margin:0 0 10px;font-size:23px}#sb-auth-gate p{color:#b5c6dc;font-size:14px;line-height:1.5}#sb-auth-gate input{width:100%;padding:14px;border-radius:13px;border:1px solid #3a506d;background:#091629;color:#fff;font:inherit;box-sizing:border-box}#sb-auth-gate button{width:100%;margin-top:14px;padding:14px;border:0;border-radius:14px;background:linear-gradient(120deg,#75e5d2,#a0f0dc);color:#071b20;font:inherit;font-weight:800;cursor:pointer}#sb-auth-gate .gate-note{font-size:11px;color:#9fb2ca}#sb-auth-gate .gate-error{color:#ff9aa5;font-size:12px}";
    document.head.appendChild(style);
  }
  if (mode === "loading") {
    root.innerHTML = '<div class="gate-card"><h2>Engliwords</h2><p>Profilingiz tekshirilmoqda…</p><div class="loading"></div></div>';
  } else if (mode === "nickname") {
    root.innerHTML = '<form class="gate-card" onsubmit="event.preventDefault();sbSaveNickname()"><h2>Profilingizni yarating</h2><p>Sizga qanday murojaat qilishimiz uchun nickname tanlang.</p><label for="sb-nickname">Nickname</label><input id="sb-nickname" type="text" minlength="2" maxlength="24" autocomplete="nickname" placeholder="Masalan, Asomiddin" required><p class="gate-error" id="sb-nickname-error">' + sbGateEscape(errorText) + '</p><button id="sb-nickname-submit" type="submit">Profilni yaratish</button><p class="gate-note">Keyingi kirishlarda ham shu nickname ishlatiladi.</p></form>';
    setTimeout(() => document.getElementById("sb-nickname")?.focus(), 0);
  } else {
    root.innerHTML = '<div class="gate-card"><h2>Engliwords’ga xush kelibsiz</h2><p>Davom etish uchun Gmail bilan shaxsiy profil yarating.</p><button type="button" onclick="cloudLogin()">Gmail bilan ro‘yxatdan o‘tish</button><p class="gate-note">Gmail manzilingiz Engliwords ichida ko‘rsatilmaydi.</p>' + (errorText ? '<p class="gate-error">' + sbGateEscape(errorText) + '</p>' : '') + '</div>';
  }
}
async function sbSaveNickname() {
  if (!sbNicknameResolver) return;
  const input = document.getElementById("sb-nickname");
  const nickname = String(input?.value || "").trim();
  const error = document.getElementById("sb-nickname-error");
  if (nickname.length < 2 || nickname.length > 24) {
    if (error) error.textContent = "Nickname 2–24 ta belgidan iborat bo‘lishi kerak.";
    input?.focus();
    return;
  }
  const button = document.getElementById("sb-nickname-submit");
  if (button) { button.disabled = true; button.textContent = "Saqlanmoqda…"; }
  try {
    const {data, error: updateError} = await supabaseClient.auth.updateUser({data:{nickname}});
    if (updateError) throw updateError;
    let updatedUser = data?.user;
    if (!updatedUser) {
      const {data: current, error: getError} = await supabaseClient.auth.getUser();
      if (getError) throw getError;
      updatedUser = current?.user;
    }
    if (!updatedUser) throw new Error("Profil ma’lumotlari olinmadi.");
    const resolve = sbNicknameResolver;
    sbNicknameResolver = null;
    resolve(updatedUser);
  } catch (e) {
    console.error("Nickname save failed:", e);
    if (error) error.textContent = e?.message || "Nickname saqlanmadi. Qayta urinib ko‘ring.";
    if (button) { button.disabled = false; button.textContent = "Profilni yaratish"; }
  }
}
window.sbSaveNickname = sbSaveNickname;

window.addEventListener("DOMContentLoaded", async () => {
  sbRenderAuthGate("loading");
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
  }
});

// Check again whenever the installed app returns to the foreground.
window.addEventListener("pageshow", () => sbRestoreSession("pageshow"));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") sbRestoreSession("visible");
});
