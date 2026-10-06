/* =========================================================
   English So'z — Google Drive Cloud Sync
   ========================================================= */

const cloud = {
  token: null,
  user: null,
  fileId: null,
  ready: false,
  saving: false,
  saveTimer: null,
  autoLoginTried: false
};

const CLOUD_LINKED_KEY = "eng-cloud-linked";


/* ---------------------------------------------------------
   1. Google API orqali so'rov yuborish
   --------------------------------------------------------- */

async function cloudApi(url, options = {}) {
  const headers = new Headers(options.headers || {});

  headers.set("Authorization", "Bearer " + cloud.token);

  if (options.body && !(options.body instanceof Blob)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Google API xatosi");
  }

  return response;
}


/* ---------------------------------------------------------
   2. Google login
   --------------------------------------------------------- */

function cloudLogin() {

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

      try {

        await cloudLoadUser();

        await cloudLoadFile();

        cloud.ready = true;

        localStorage.setItem(
        CLOUD_LINKED_KEY,
        "1"
      );

cloudRender();

      } catch (error) {

        console.error(error);

        alert(
          "Google Drive bilan ulanishda xatolik yuz berdi.\n\n" +
          error.message
        );

      }
    }
  });

  client.requestAccessToken({
    prompt: "consent"
  });
}

/* ---------------------------------------------------------
   Oldin ulangan Google accountni avtomatik qayta ulash
   --------------------------------------------------------- */

function cloudAutoLogin() {

  if (cloud.autoLoginTried) {
    return;
  }

  cloud.autoLoginTried = true;

  if (localStorage.getItem(CLOUD_LINKED_KEY) !== "1") {
    return;
  }

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

        cloudRenderAutoLoginFailed();

        return;
      }

      cloud.token = response.access_token;

      try {

        await cloudLoadUser();

        await cloudLoadFile();

        cloud.ready = true;

        cloudRender();

      } catch (error) {

        console.error(
          "Automatic Google Drive connection failed:",
          error
        );

        cloud.token = null;
        cloud.ready = false;

        cloudRenderAutoLoginFailed();
      }
    }
  });

  client.requestAccessToken({
    prompt: ""
  });
}


function cloudRenderAutoLoginFailed() {

  const status =
    document.getElementById("cloud-status");

  const actions =
    document.getElementById("cloud-actions");

  if (!status || !actions) {
    return;
  }

  status.textContent =
    "Google Drive ulanishini tasdiqlash kerak";

  actions.innerHTML =
    '<button onclick="cloudLogin()" ' +
    'style="padding:10px 14px;border:0;border-radius:12px;cursor:pointer;">' +
    '🔐 Google orqali kirish' +
    '</button>';
}


window.addEventListener("load", () => {

  setTimeout(cloudAutoLogin, 300);

});

/* ---------------------------------------------------------
   3. Google user ma'lumotlarini olish
   --------------------------------------------------------- */

async function cloudLoadUser() {

  const response = await cloudApi(
    "https://www.googleapis.com/oauth2/v3/userinfo"
  );

  cloud.user = await response.json();
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

    // Hozirgi qurilmadagi ma'lumotlarni
    // birinchi marta Drive'ga yuklaymiz.
    await cloudUpload();

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

  if (!data || typeof data !== "object") {
    return;
  }

  if (data.words !== undefined) {
    S.words = data.words;
  }

  if (data.progress !== undefined) {
    S.progress = data.progress;
  }

  if (data.cache !== undefined) {
    S.cache = data.cache;
  }

  if (data.set !== undefined) {
    S.set = data.set;
  }

  saveLocal();
}


/* ---------------------------------------------------------
   6. LocalStorage'ga saqlash
   --------------------------------------------------------- */

function saveLocal() {

  localStorage.setItem(
    "eng",
    JSON.stringify(S)
  );
}


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

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    {
      method: "POST",

      headers: {
        Authorization:
          "Bearer " + cloud.token
      },

      body: form
    }
  );

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

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

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files/" +
    cloud.fileId +
    "?uploadType=media",
    {
      method: "PATCH",

      headers: {
        Authorization:
          "Bearer " + cloud.token,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify(S)
    }
  );

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }
}


/* ---------------------------------------------------------
   9. Saqlash
   --------------------------------------------------------- */

async function cloudUpload() {

  if (!cloud.token) {
    return;
  }

  if (cloud.saving) {
    return;
  }

  cloud.saving = true;

  cloudRender();

  try {

    saveLocal();

    await cloudUpdateFile();

  } catch (error) {

    console.error(
      "Cloud save error:",
      error
    );

  } finally {

    cloud.saving = false;

    cloudRender();
  }
}


/* ---------------------------------------------------------
   10. Har safar save() bo'lganda Drive'ga yuborish
   --------------------------------------------------------- */

function cloudSaveDebounced() {

  if (!cloud.ready) {
    return;
  }

  clearTimeout(cloud.saveTimer);

  cloud.saveTimer = setTimeout(() => {

    cloudUpload();

  }, 1200);
}


/* ---------------------------------------------------------
   11. Google'dan chiqish
   --------------------------------------------------------- */

function cloudLogout() {

  if (cloud.token) {

    google.accounts.oauth2.revoke(
      cloud.token,
      () => {}
    );
  }

  cloud.token = null;
  cloud.user = null;
  cloud.fileId = null;
  cloud.ready = false;
  localStorage.removeItem(CLOUD_LINKED_KEY);
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


  if (cloud.saving) {

    status.textContent =
      "☁️ Google Drive'ga saqlanmoqda...";

  } else {

    status.textContent =
      "☁️ Google Drive ulangan";
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

    <div style="
      display:flex;
      align-items:center;
      gap:10px;
    ">

      ${picture}

      <div style="font-size:13px;">
        ${cloud.user.name || ""}
      </div>

      <button
        onclick="cloudUpload()"
        style="
          padding:8px 10px;
          border:0;
          border-radius:10px;
          cursor:pointer;
        "
      >
        ☁️
      </button>

      <button
        onclick="cloudLogout()"
        style="
          padding:8px 10px;
          border:0;
          border-radius:10px;
          cursor:pointer;
        "
      >
        Chiqish
      </button>

    </div>
  `;
}
