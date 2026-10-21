/* Supabase authentication and account-scoped sync for English So'z.
   The old Google Drive implementation remains available for rollback until migration is verified. */
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
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
    actions.innerHTML = '<button onclick="cloudLogin()" style="padding:10px 14px;border:0;border-radius:12px;cursor:pointer">🔐 Google orqali kirish va saqlash</button>';
    return;
  }
  status.textContent = sbBusy ? "☁️ Supabase bilan sinxronlanmoqda..." : (sbLastError ? "⚠️ Sinxronlash xatosi: " + sbLastError : "☁️ Supabase bilan sinxronlangan");
  const name = (window.__sbProfile && (window.__sbProfile.name || window.__sbProfile.email)) || "Google foydalanuvchisi";
  actions.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:13px;flex:1;min-width:90px">' + String(name).replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])) + '</div><button onclick="cloudUpload()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">☁️ Hozir saqlash</button><button onclick="cloudLogout()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">Chiqish</button></div>';
}

// Reuse the existing profile UI render hook, but display Supabase status.
cloudRender = sbRender;

async function sbLoadOrMigrate(user) {
  const {data: row, error} = await supabaseClient.from("user_data").select("user_id,data,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (row) {
    S = sbNormalizeState(row.data);
    if (typeof saveLocal === "function") saveLocal();
    if (typeof render === "function") render();
    return;
  }
  // First login only: preserve and migrate the current local state instead of overwriting it with an empty object.
  const initial = sbNormalizeState(S);
  const {error: insertError} = await supabaseClient.from("user_data").insert({user_id:user.id,data:initial,updated_at:new Date().toISOString()});
  if (insertError) throw insertError;
  S = initial;
  if (typeof saveLocal === "function") saveLocal();
}

async function sbHandleSession(session) {
  const user = session && session.user;
  if (!user) {
    sbUserId = null;
    window.__sbProfile = null;
    if (typeof cloud === "object") { cloud.user = null; cloud.ready = false; cloud.token = null; }
    sbRender();
    return;
  }
  if (sbHandlingUser === user.id) return;
  sbHandlingUser = user.id;
  sbBusy = true;
  sbLastError = "";
  sbUserId = user.id;
  window.__sbProfile = {email:user.email || "", name:user.user_metadata?.full_name || user.user_metadata?.name || user.email || "", picture:user.user_metadata?.avatar_url || user.user_metadata?.picture || ""};
  if (typeof cloud === "object") { cloud.user = {sub:user.id,email:user.email || "",name:window.__sbProfile.name,picture:window.__sbProfile.picture}; cloud.ready = true; }
  sbRender();
  try {
    await sbLoadOrMigrate(user);
    sbLastError = "";
  } catch (e) {
    console.error("Supabase load failed:", e);
    sbLastError = e?.message || "Ma'lumotlarni yuklab bo'lmadi";
    if (typeof toast === "function") toast("Supabase bilan ulanish xatosi. Ma'lumotlar qurilmada saqlanib qoladi.");
  } finally {
    sbBusy = false;
    sbHandlingUser = null;
    sbRender();
    if (typeof render === "function") render();
  }
}

async function cloudLogin() {
  try {
    const {error} = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {redirectTo: "https://asomiddinqobilov222-coder.github.io/english/"}
    });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    alert("Supabase Google login xatosi: " + (e?.message || "Noma'lum xato"));
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
    if (typeof saveLocal === "function") saveLocal();
    sbLastError = "";
    if (typeof toast === "function") toast("Ma'lumotlar Supabase'ga saqlandi.");
  } catch (e) {
    console.error("Supabase save failed:", e);
    sbLastError = e?.message || "Saqlash amalga oshmadi";
    if (typeof toast === "function") toast("Bulutga saqlash amalga oshmadi. Qurilmadagi nusxa saqlanadi.");
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
  if (!confirm("Supabase akkauntidan chiqilsinmi? Qurilmadagi mahalliy zaxira saqlanib qoladi.")) return;
  try {
    const {error} = await supabaseClient.auth.signOut();
    if (error) throw error;
    sbUserId = null;
    sbLastError = "";
    if (typeof cloud === "object") { cloud.user = null; cloud.ready = false; cloud.token = null; }
    if (typeof toast === "function") toast("Akkauntdan chiqildi. Qurilmadagi zaxira saqlanib qoldi.");
    if (typeof render === "function") render();
    sbRender();
  } catch (e) {
    console.error(e);
    alert("Chiqishda xatolik: " + (e?.message || "Noma'lum xato"));
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const {data, error} = await supabaseClient.auth.getSession();
    if (error) throw error;
    await sbHandleSession(data.session);
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => sbHandleSession(session), 0);
      }
    });
  } catch (e) {
    console.error("Supabase initialization failed:", e);
    sbLastError = e?.message || "Boshlashda xatolik";
    sbRender();
  }
});
