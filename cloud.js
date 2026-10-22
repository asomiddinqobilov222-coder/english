/* =========================================================
   English So'z — Google Drive Cloud Sync
   ========================================================= */

const cloud = {
  token: null,
  user: null,
  fileId: null,
  ready: false,
  saving: false,
  pendingSave: false,
  lastError: "",
  needsAuthorization: false,
  refreshingToken: null,
  preserveCurrentIfMissing: false,
  saveTimer: null,
  autoLoginTried: false
};

const CLOUD_LINKED_KEY = "eng-cloud-linked";
const CLOUD_PROFILE_KEY = "eng-cloud-profile";

function cloudDataStorageKey(user = cloud.user) {
  const identity = user?.sub || user?.email;
  return identity ? "eng-data:" + encodeURIComponent(String(identity).toLowerCase()) : "eng-data:local";
}
function saveLocal() {
  try { localStorage.setItem(cloudDataStorageKey(), JSON.stringify(S)); }
  catch (error) { console.warn("Local backup could not be saved:", error); if (typeof toast === "function") toast("Qurilmadagi zaxira saqlanmadi. Xotira joyini tekshiring."); }
}
try {
  const remembered = JSON.parse(localStorage.getItem(CLOUD_PROFILE_KEY) || "null");
  if (remembered && remembered.email) cloud.user = remembered;
} catch {}
function cloudRememberProfile(user) {
  const previousIdentity = String(cloud.user?.sub || cloud.user?.email || "").trim().toLowerCase();
  const nextIdentity = String(user?.sub || user?.email || "").trim().toLowerCase();
  cloud.user = user;
  try { if (user && user.email) localStorage.setItem(CLOUD_PROFILE_KEY, JSON.stringify(user)); } catch {}
  // Refreshing the same Google profile must not erase the AI key kept in memory.
  // Clear it only when switching to a different account.
  if (previousIdentity !== nextIdentity && typeof restoreAiKeyForCurrentProfile === "function") restoreAiKeyForCurrentProfile();
}


/* ---------------------------------------------------------
   1. Google API orqali so'rov yuborish
   --------------------------------------------------------- */

async function cloudRequestAccessToken(prompt = "") {
  if (cloud.refreshingToken) return cloud.refreshingToken;
  if (typeof google === "undefined" || !google.accounts?.oauth2) {
    throw new Error("Google ruxsat xizmati yuklanmagan.");
  }
  cloud.refreshingToken = new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error("Google Drive ruxsatini avtomatik yangilab bo‘lmadi. Profil ichidagi Drive’ni ulash tugmasini bosing.")), 15000);
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile https://www.googleapis.com/auth/drive.file",
        callback: response => {
          if (response?.error || !response?.access_token) {
            finish(reject, new Error("Google Drive ruxsati yangilanishi kerak. Profil ichidagi Drive’ni ulash tugmasini bosing."));
            return;
          }
          cloud.token = response.access_token;
          cloud.needsAuthorization = false;
          cloud.lastError = "";
          finish(resolve, response.access_token);
        },
        error_callback: error => finish(reject, new Error(error?.message || "Google ruxsat oynasi ochilmadi. Drive’ni qo‘lda ulang."))
      });
      client.requestAccessToken({prompt});
    } catch (error) {
      finish(reject, error);
    }
  }).finally(() => { cloud.refreshingToken = null; });
  return cloud.refreshingToken;
}

async function cloudAuthorizedFetch(url, options = {}) {
  const send = () => {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", "Bearer " + (cloud.token || ""));
    return fetch(url, {...options, headers});
  };
  let response = await send();
  if (response.status === 401) {
    try {
      await cloudRequestAccessToken("none");
      response = await send();
    } catch (error) {
      cloud.needsAuthorization = true;
      cloud.lastError = error?.message || "Google Drive ruxsati yangilanishi kerak.";
      throw new Error(cloud.lastError);
    }
  }
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401) cloud.needsAuthorization = true;
    throw new Error(detail || ("Google API HTTP " + response.status));
  }
  cloud.needsAuthorization = false;
  return response;
}

async function cloudApi(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return cloudAuthorizedFetch(url, {...options, headers});
}


/* ---------------------------------------------------------
   2. Google login
   --------------------------------------------------------- */

function cloudLogin() {
  const previousUser = cloud.user ? {...cloud.user} : null;
  const previousIdentity = previousUser?.email?.toLowerCase() || "";
  const localSnapshot = JSON.parse(JSON.stringify(S));

  if ( 
    typeof google === "undefined" ||
    !google.accounts ||
    !google.accounts.oauth2
  ) {
    alert("Google login hali yuklanmadi. Bir necha soniya kutib qayta urinib ko‘r.");
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,

    scope:
      "openid email profile https://www.googleapis.com/auth/drive.file",

    callback: async (response) => {

      if (response.error) {
        console.error(response);
        alert("Google login amalga oshmadi.");
        return;
      }

      cloud.token = response.access_token;
      cloud.lastError = "";
      cloud.needsAuthorization = false;

      try {
        await cloudLoadUser();
        const currentIdentity = cloud.user?.email?.toLowerCase() || "";
        let profileSnapshot = null;
        try {
          const raw = localStorage.getItem(cloudDataStorageKey());
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && Array.isArray(parsed.words)) profileSnapshot = parsed;
          }
        } catch {}
        cloud.preserveCurrentIfMissing = Boolean(profileSnapshot) || !previousIdentity || previousIdentity === currentIdentity;
        S = profileSnapshot
          ? {...defaults(), ...profileSnapshot}
          : cloud.preserveCurrentIfMissing ? localSnapshot : defaults();

        await cloudLoadFile();

        cloud.preserveCurrentIfMissing = false;
        cloud.ready = true;

        localStorage.setItem(
        CLOUD_LINKED_KEY,
        "1"
      );

cloudRender();

      } catch (error) {
        console.error(error);
        cloud.token = null;
        cloud.user = previousUser;
        S = localSnapshot;
        cloud.ready = false;
        cloud.preserveCurrentIfMissing = false;
        cloud.lastError = error?.message || "Noma'lum xato";
        if (typeof restoreAiKeyForCurrentProfile === "function") restoreAiKeyForCurrentProfile();
        saveLocal();
        cloudRender();
        alert("Google Drive bilan ulanishda xatolik yuz berdi.\n\n" + cloud.lastError);
      }
    }
  });

  client.requestAccessToken({
    // Do not force the consent screen on every manual sign-in.
    prompt: ""
  });
}

/* ---------------------------------------------------------
   Oldin ulangan Google accountni avtomatik qayta ulash
   --------------------------------------------------------- */

function cloudAutoLogin() {

  if (cloud.autoLoginTried) {
    return;
  }
  // Retry only an account previously connected by the user.
  if (localStorage.getItem(CLOUD_LINKED_KEY) !== "1" || !cloud.user) return;

  cloud.autoLoginTried = true;

  if (
    typeof google === "undefined" ||
    !google.accounts ||
    !google.accounts.oauth2
  ) {
    cloud.autoLoginTried = false;
    setTimeout(cloudAutoLogin, 1000);
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({

    client_id: GOOGLE_CLIENT_ID,

    scope:
      "openid email profile https://www.googleapis.com/auth/drive.file",

    callback: async (response) => {

      if (response.error) {

        console.warn(
          "Automatic Google login:",
          response
        );
        cloud.needsAuthorization = true;
        cloud.lastError = "Google Drive ruxsatini qayta olish kerak.";

        cloudRenderAutoLoginFailed();

        return;
      }

      cloud.token = response.access_token;
      cloud.lastError = "";
      cloud.needsAuthorization = false;
      cloud.preserveCurrentIfMissing = true;

      try {
        await cloudLoadUser();
        await cloudLoadFile();
        cloud.preserveCurrentIfMissing = false;
        cloud.ready = true;

        cloudRender();

      } catch (error) {

        console.error(
          "Automatic Google Drive connection failed:",
          error
        );

        cloud.token = null;
        cloud.ready = false;
        cloud.needsAuthorization = true;
        cloud.preserveCurrentIfMissing = false;
        cloud.lastError = error?.message || "Noma'lum xato";

        cloudRenderAutoLoginFailed();
      }
    }
  });

  // Attempt silent token acquisition on page load; browsers may block popups without a user gesture.
  client.requestAccessToken({
    prompt: "none"
  });
}


function cloudRenderAutoLoginFailed() {
  const status = document.getElementById("cloud-status");
  const actions = document.getElementById("cloud-actions");
  if (!status || !actions) return;
  status.textContent = "Profil saqlangan. Drive ruxsati yangilanishi kerak.";
  actions.innerHTML = '<button onclick="cloudLogin()" style="padding:10px 14px;border:0;border-radius:12px;cursor:pointer;">☁️ Drive’ni qayta ulash</button> <button onclick="cloudLogout()" style="padding:10px 14px;border:0;border-radius:12px;cursor:pointer;">Chiqish</button>';
}


// Supabase now restores the app session automatically. Do not run the legacy
// Google Drive OAuth flow on page load; it can unexpectedly open Google UI.
// Keep cloudAutoLogin defined only for legacy rollback/debugging, but do not call it.

/* ---------------------------------------------------------
   3. Google user ma'lumotlarini olish
   --------------------------------------------------------- */

async function cloudLoadUser() {

  const response = await cloudApi(
    "https://www.googleapis.com/oauth2/v3/userinfo"
  );

  cloudRememberProfile(await response.json());
}


/* ---------------------------------------------------------
   4. Drive'dagi English So'z faylini topish
   --------------------------------------------------------- */

async function cloudLoadFile() {

  const query =
    "name='english-soz-data.json' " +
    "and trashed=false " +
    "and appProperties has { key='app' and value='english-soz' }";

  const url =
    "https://www.googleapis.com/drive/v3/files" +
    "?q=" +
    encodeURIComponent(query) +
    "&spaces=drive" +
    "&fields=files(id,name)";

  const response = await cloudApi(url);

  const data = await response.json();

  if (data.files && data.files.length > 0) {

    cloud.fileId = data.files[0].id;

    await cloudDownload();

  } else {
    cloud.fileId = null;
    if (!cloud.preserveCurrentIfMissing) S = defaults();
    await cloudCreateFile();
    saveLocal();
  }
}


/* ---------------------------------------------------------
   5. Drive'dan ma'lumotni yuklash
   --------------------------------------------------------- */

async function cloudDownload() {

  const response = await cloudApi(
    "https://www.googleapis.com/drive/v3/files/" +
    cloud.fileId +
    "?alt=media"
  );

  const data = await response.json();

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Google Drive fayli noto'g'ri formatda");
  }

  // Butun holatni almashtiramiz; oldingi profil ma'lumotlari qo'shilmaydi.
  S = {
    ...defaults(),
    ...data,
    words: Array.isArray(data.words) ? data.words : [],
    progress: data.progress && typeof data.progress === "object" ? data.progress : {},
    cache: data.cache && typeof data.cache === "object" ? data.cache : {s:{},t:{}},
    set: {...defaults().set, ...(data.set || {})},
    history: data.history && typeof data.history === "object" ? data.history : {}
  };
  S.words = S.words.map(w => ({...w, id:String(w.id || uid()), done:Array.isArray(w.done) ? w.done : [], examples:normalizeExamples(w.examples,w.example)}));
  saveLocal();
}


/* ---------------------------------------------------------
   6. LocalStorage'ga saqlash
   --------------------------------------------------------- */

// saveLocal() above stores an account-scoped local backup.


/* ---------------------------------------------------------
   7. Drive'ga yangi fayl yaratish
   --------------------------------------------------------- */

async function cloudCreateFile() {

  const metadata = {
    name: "english-soz-data.json",

    mimeType: "application/json",

    appProperties: {
      app: "english-soz",
      version: "1"
    }
  };

  const content = JSON.stringify(S);

  const form = new FormData();

  form.append(
    "metadata",
    new Blob(
      [JSON.stringify(metadata)],
      { type: "application/json" }
    )
  );

  form.append(
    "file",
    new Blob(
      [content],
      { type: "application/json" }
    )
  );

  const response = await cloudAuthorizedFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {method: "POST", body: form}
  );

  const data = await response.json();

  cloud.fileId = data.id;
}


/* ---------------------------------------------------------
   8. Drive'dagi mavjud faylni yangilash
   --------------------------------------------------------- */

async function cloudUpdateFile() {

  if (!cloud.fileId) {
    await cloudCreateFile();
    return;
  }

  const response = await cloudAuthorizedFetch(
    "https://www.googleapis.com/upload/drive/v3/files/" + cloud.fileId + "?uploadType=media",
    {method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify(S)}
  );
}


/* ---------------------------------------------------------
   9. Saqlash
   --------------------------------------------------------- */

async function cloudUpload() {
  if (!cloud.token || !cloud.ready) return;
  if (cloud.saving) { cloud.pendingSave = true; return; }
  cloud.saving = true;
  cloud.pendingSave = false;
  cloud.lastError = "";
  if (cloud.saveTimer) clearTimeout(cloud.saveTimer);
  cloud.saveTimer = null;
  cloudRender();
  try {
    saveLocal();
    await cloudUpdateFile();
  } catch (error) {
    cloud.lastError = error?.message || "Noma'lum xato";
    console.error("Cloud save error:", error);
  } finally {
    cloud.saving = false;
    cloudRender();
    if (cloud.pendingSave && cloud.ready && cloud.token) {
      cloud.pendingSave = false;
      if (cloud.saveTimer) clearTimeout(cloud.saveTimer);
      cloud.saveTimer = setTimeout(() => cloudUpload(), 250);
    }
  }
}


/* ---------------------------------------------------------
   10. Har safar save() bo'lganda Drive'ga yuborish
   --------------------------------------------------------- */

function cloudSaveDebounced() {
  saveLocal();
  if (!cloud.ready || !cloud.token) return;
  cloud.pendingSave = true;
  if (cloud.saveTimer) clearTimeout(cloud.saveTimer);
  cloud.saveTimer = setTimeout(() => cloudUpload(), 1200);
}


/* ---------------------------------------------------------
   11. Google'dan chiqish
   --------------------------------------------------------- */

async function cloudLogout() {
  // Chiqishdan oldin rejalashtirilgan va davom etayotgan saqlashlarni tugatamiz.
  let attempts = 0;
  while (cloud.ready && cloud.token && attempts < 5) {
    if (cloud.saving) {
      await new Promise(resolve => {
        const poll = () => cloud.saving ? setTimeout(poll, 50) : resolve();
        poll();
      });
    }
    const scheduled = !!cloud.saveTimer;
    if (cloud.saveTimer) clearTimeout(cloud.saveTimer);
    cloud.saveTimer = null;
    if (cloud.lastError) {
      alert("Google Drive'ga oxirgi o'zgarishlarni saqlashda xatolik yuz berdi. Qurilmadagi zaxira saqlanib qoldi.");
      break;
    }
    if (!scheduled && !cloud.pendingSave) break;
    cloud.pendingSave = false;
    await cloudUpload();
    attempts++;
    if (cloud.lastError) {
      alert("Google Drive'ga oxirgi o'zgarishlarni saqlashda xatolik yuz berdi. Qurilmadagi zaxira saqlanib qoldi.");
      break;
    }
  }

  try { saveLocal(); } catch {}
  if (cloud.saveTimer) clearTimeout(cloud.saveTimer);
  cloud.saveTimer = null;
  if (cloud.token && typeof google !== "undefined" && google.accounts?.oauth2?.revoke) {
    try { google.accounts.oauth2.revoke(cloud.token, () => {}); } catch {}
  }
  cloud.token = null;
  cloud.user = null;
  cloud.fileId = null;
  cloud.ready = false;
  cloud.needsAuthorization = false;
  cloud.saving = false;
  cloud.pendingSave = false;
  cloud.lastError = "";
  cloud.preserveCurrentIfMissing = false;
  try { localStorage.removeItem(CLOUD_PROFILE_KEY); localStorage.removeItem(CLOUD_LINKED_KEY); } catch {}
  if (typeof groqApiKey !== "undefined") groqApiKey = "";
  S = defaults();
  cloudRender();
}


/* ---------------------------------------------------------
   12. Cloud UI
   --------------------------------------------------------- */

function cloudCard() {

  return `
    <div id="cloud-card"
         style="
           margin:12px 0;
           padding:16px;
           border-radius:18px;
           background:rgba(255,255,255,.06);
           border:1px solid rgba(255,255,255,.10);
         ">

      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      ">

        <div>

          <div style="
            font-size:16px;
            font-weight:700;
          ">
            ☁️ Google Cloud Sync
          </div>

          <div id="cloud-status"
               style="
                 margin-top:5px;
                 opacity:.7;
                 font-size:13px;
               ">
            Qurilmaga saqlanmoqda
          </div>

        </div>

        <div id="cloud-actions">
          <button
            onclick="cloudLogin()"
            style="
              padding:10px 14px;
              border:0;
              border-radius:12px;
              cursor:pointer;
            "
          >
            🔐 Google orqali kirish
          </button>
        </div>

      </div>

    </div>
  `;
}


/* ---------------------------------------------------------
   13. Cloud UI yangilash
   --------------------------------------------------------- */

function cloudRender() {

  const status =
    document.getElementById("cloud-status");

  const actions =
    document.getElementById("cloud-actions");

  if (!status || !actions) {
    return;
  }

  if (!cloud.user) {

    status.textContent =
      "Ma'lumotlar faqat shu qurilmada saqlanmoqda";

    actions.innerHTML = `
      <button
        onclick="cloudLogin()"
        style="
          padding:10px 14px;
          border:0;
          border-radius:12px;
          cursor:pointer;
        "
      >
        🔐 Google orqali kirish
      </button>
    `;

    return;
  }


  if (cloud.needsAuthorization) {
    status.textContent = "Profil saqlangan. Drive ruxsatini yangilash kerak; ilovadan chiqilmadi.";
  } else if (cloud.saving) {
    status.textContent = "☁️ Google Drive'ga saqlanmoqda...";
  } else if (cloud.lastError && cloud.ready && cloud.token) {
    status.textContent = "⚠️ Saqlash xatosi. Qayta saqlash tugmasini bosing.";
  } else if (cloud.ready && cloud.token) {
    status.textContent = "☁️ Google Drive ulangan";
  } else {
    status.textContent = "Profil eslab qolingan — Drive’ni qayta ulash kerak";
  }


  const picture =
    cloud.user.picture
      ? `<img
           src="${cloud.user.picture}"
           style="
             width:38px;
             height:38px;
             border-radius:50%;
           "
         >`
      : "";


  actions.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      ${picture}
      <div style="font-size:13px;flex:1;min-width:90px">${cloud.user.name || cloud.user.email || ""}</div>
      ${cloud.ready && cloud.token && !cloud.needsAuthorization
        ? '<button onclick="cloudUpload()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">☁️ Saqlash / qayta urinish</button>'
        : '<button onclick="cloudLogin()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">Drive’ni ulash / ruxsatni yangilash</button>'}
      <button onclick="cloudLogout()" style="padding:8px 10px;border:0;border-radius:10px;cursor:pointer">Chiqish</button>
    </div>
  `;
}
