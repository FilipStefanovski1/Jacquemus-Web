/* =========================
   CONFIG (IMPORTANT)
   =========================
   If your API is NOT on the same origin, set it here.

   Example:
   const API_BASE = "http://localhost:8787";

   If you deploy to Vercel and your API functions live on the same site:
   const API_BASE = "";
*/
const API_BASE = ""; // <-- change if needed

// API endpoints (kept as /api/* to match your HTML + backend functions)
const ENDPOINTS = {
  generateBag: "/api/generate-bag",
  tryOn: "/api/try-on",
};

/* =========================
   DOM
   ========================= */
const steps = Array.from(document.querySelectorAll(".step"));
const progressLabel = document.getElementById("progressLabel");
const dots = Array.from(document.querySelectorAll(".progress__dot"));
let current = 1;

/* =========================
   STATE
   ========================= */
const BAG_OPTIONS = [
  { src: "assets/Black Large Bambino.png", name: "The Large Bambino (Black)" },
  { src: "assets/Black The Bambino.png", name: "The Bambino (Black)" },
  { src: "assets/Black The Bisou Perle.png", name: "The Bisou Perle (Black)" },
  { src: "assets/The Large Chiquito.png", name: "The Large Chiquito" },
];

const state = {
  bagUrl: BAG_OPTIONS[0].src,
  bagName: BAG_OPTIONS[0].name,

  fabricFile: null,
  personFile: null,

  generatedBagDataUrl: null,
  tryOnDataUrl: null,
};

function setStatus(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg || "";
}

function setProgressUI() {
  if (progressLabel) progressLabel.textContent = `Step ${current} of ${steps.length}`;

  dots.forEach((d) => {
    const n = Number(d.dataset.dot);
    d.classList.remove("is-active", "is-done");
    if (n < current) d.classList.add("is-done");
    if (n === current) d.classList.add("is-active");
  });
}

function showStep(n) {
  current = Math.max(1, Math.min(steps.length, n));

  steps.forEach((s) => {
    s.classList.toggle("is-active", Number(s.dataset.step) === current);
  });

  const activeStep = steps.find((s) => Number(s.dataset.step) === current);
  const backBtn = activeStep?.querySelector('[data-action="back"]');
  if (backBtn) backBtn.disabled = current === 1;

  setProgressUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================
   API HELPERS (FIXES JSON + 404 HTML)
   ========================= */
function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function safeJson(res) {
  // Handles:
  // - JSON response -> returns object
  // - HTML error page -> throws a clean error
  // - empty -> returns null
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const isHtml = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html");
    if (isHtml) {
      throw new Error(
        `API returned HTML (not JSON). This usually means the route doesn't exist or you're hitting the wrong server. Status: ${res.status}`
      );
    }
    throw new Error(`API returned non-JSON. Status: ${res.status}`);
  }
}

function explainLikelyCause(status, endpointPath) {
  if (status === 404) {
    return (
      `\n\nLikely cause: Your frontend is running, but the API route "${endpointPath}" is not available on this server.\n` +
      `Fix: Run the backend that exposes /api/* (or deploy it), OR set API_BASE to your backend URL.`
    );
  }
  return "";
}

/* =========================
   NAV BUTTONS
   ========================= */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  if (action === "next") showStep(current + 1);
  if (action === "back") showStep(current - 1);

  if (action === "restart") {
    state.fabricFile = null;
    state.personFile = null;
    state.generatedBagDataUrl = null;
    state.tryOnDataUrl = null;

    // reset labels
    const fabricLabel = document.getElementById("fabricLabel");
    const personLabel = document.getElementById("personLabel");
    if (fabricLabel) fabricLabel.textContent = "Upload or drag & drop fabric image...";
    if (personLabel) personLabel.textContent = "Upload or drag & drop full-body image...";

    // reset fabric preview
    const fabricMini = document.getElementById("fabricMini");
    const fabricMiniEmpty = document.getElementById("fabricMiniEmpty");
    if (fabricMini) fabricMini.style.display = "none";
    if (fabricMiniEmpty) fabricMiniEmpty.style.display = "block";

    // reset images
    const genImg = document.getElementById("generatedBagImg");
    const tryImg = document.getElementById("tryOnImg");
    if (genImg) genImg.src = state.bagUrl;

    // IMPORTANT: make sure this file exists exactly:
    // - If your file is assets/wear.png keep as is
    // - If your file is wear.png in root, change to "wear.png"
    if (tryImg) tryImg.src = "assets/wear.png";

    setStatus("status2", "");
    setStatus("status3", "");
    setStatus("status4", "");

    showStep(1);
  }
});

/* =========================
   STEP 1: BAG SELECTION
   ========================= */
const formThumbs = document.getElementById("formThumbs");
const bagPreview = document.getElementById("bagPreview");
const bagPreview2 = document.getElementById("bagPreview2");
const bagMini = document.getElementById("bagMini");
const selectedBagName = document.getElementById("selectedBagName");

function syncBagEverywhere() {
  if (selectedBagName) selectedBagName.textContent = state.bagName;
  if (bagPreview) bagPreview.src = state.bagUrl;
  if (bagPreview2) bagPreview2.src = state.bagUrl;
  if (bagMini) bagMini.src = state.bagUrl;

  // If bag not generated yet, Step 3 result should show selected base
  const genImg = document.getElementById("generatedBagImg");
  if (genImg && !state.generatedBagDataUrl) genImg.src = state.bagUrl;
}

if (formThumbs) {
  formThumbs.addEventListener("click", (e) => {
    const t = e.target.closest(".bagTile");
    if (!t) return;

    formThumbs.querySelectorAll(".bagTile").forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");

    const bag = t.dataset.bag;
    const name = t.dataset.name;

    if (!bag) return;

    state.bagUrl = bag;
    state.bagName = name || bag;

    // Optional: changing base bag resets generated content so UI stays consistent
    state.generatedBagDataUrl = null;
    state.tryOnDataUrl = null;

    syncBagEverywhere();

    // reset try-on preview
    const tryImg = document.getElementById("tryOnImg");
    if (tryImg) tryImg.src = "assets/wear.png";
  });
}

syncBagEverywhere();

/* =========================
   DRAG & DROP HELPERS
   ========================= */
function wireDropZone(buttonEl, onFile) {
  if (!buttonEl) return;

  buttonEl.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  buttonEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    onFile(file);
  });
}

/* =========================
   STEP 2: FABRIC UPLOAD + GENERATE BAG
   ========================= */
const fabricInput = document.getElementById("fabricInput");
const fabricBtn = document.getElementById("fabricBtn");
const fabricLabel = document.getElementById("fabricLabel");
const fabricMini = document.getElementById("fabricMini");
const fabricMiniEmpty = document.getElementById("fabricMiniEmpty");
const generateBagBtn = document.getElementById("generateBagBtn");

function setFabricFile(file) {
  state.fabricFile = file;
  if (fabricLabel) fabricLabel.textContent = file.name;

  const url = URL.createObjectURL(file);
  if (fabricMini) {
    fabricMini.src = url;
    fabricMini.style.display = "block";
  }
  if (fabricMiniEmpty) fabricMiniEmpty.style.display = "none";

  setStatus("status2", "");
}

if (fabricBtn && fabricInput) {
  fabricBtn.addEventListener("click", () => fabricInput.click());

  fabricInput.addEventListener("change", () => {
    const file = fabricInput.files?.[0];
    if (!file) return;
    setFabricFile(file);
  });

  wireDropZone(fabricBtn, (file) => setFabricFile(file));
}

// IMPORTANT FIX: filenames have spaces -> use encodeURI
async function fileToBlobFromUrl(url) {
  const res = await fetch(encodeURI(url));
  if (!res.ok) throw new Error("Failed to load local bag image: " + url);
  return await res.blob();
}

if (generateBagBtn) {
  generateBagBtn.addEventListener("click", async () => {
    if (!state.fabricFile) {
      setStatus("status2", "Upload a fabric image first.");
      return;
    }

    setStatus("status2", "Generating bag...");

    try {
      const bagBlob = await fileToBlobFromUrl(state.bagUrl);

      const fd = new FormData();
      fd.append("bag", bagBlob, "bag.png");
      fd.append("fabric", state.fabricFile, state.fabricFile.name);
      fd.append("prompt", "wrap the bag of image 1 in the texture of image 2");

      const url = apiUrl(ENDPOINTS.generateBag);

      const res = await fetch(url, { method: "POST", body: fd });

      // Safely parse
      let data;
      try {
        data = await safeJson(res);
      } catch (parseErr) {
        // If route missing / returned HTML, show a helpful explanation
        const extra = explainLikelyCause(res.status, ENDPOINTS.generateBag);
        throw new Error(parseErr.message + extra);
      }

      if (!res.ok) {
        const extra = explainLikelyCause(res.status, ENDPOINTS.generateBag);
        throw new Error((data?.error || `Generation failed (${res.status})`) + extra);
      }

      if (!data?.image) {
        throw new Error("API response missing 'image'.");
      }

      state.generatedBagDataUrl = data.image;

      const genImg = document.getElementById("generatedBagImg");
      if (genImg) genImg.src = state.generatedBagDataUrl;

      setStatus("status2", "Done.");
      setStatus("status3", "");
      showStep(3);
    } catch (err) {
      setStatus("status2", "Error: " + err.message);
    }
  });
}

/* =========================
   STEP 3: DOWNLOAD / SHARE / GO TRY-ON
   ========================= */
const downloadBagBtn = document.getElementById("downloadBagBtn");
const toTryOnBtn = document.getElementById("toTryOnBtn");
const shareBagBtn = document.getElementById("shareBagBtn");

if (downloadBagBtn) {
  downloadBagBtn.addEventListener("click", () => {
    const src = state.generatedBagDataUrl || state.bagUrl;
    downloadAny(src, "rebirth-bag.png");
  });
}

if (toTryOnBtn) {
  toTryOnBtn.addEventListener("click", () => showStep(4));
}

if (shareBagBtn) {
  shareBagBtn.addEventListener("click", async () => {
    const src = state.generatedBagDataUrl;
    if (!src) {
      setStatus("status3", "Generate a bag first.");
      return;
    }

    try {
      if (!navigator.share) {
        setStatus("status3", "Sharing not supported on this device/browser.");
        return;
      }

      const blob = dataUrlToBlob(src);
      const file = new File([blob], "rebirth-bag.png", { type: blob.type });

      await navigator.share({
        title: "Rebirth Bag Design",
        text: "My Rebirth bag design",
        files: [file],
      });

      setStatus("status3", "Shared.");
    } catch {
      setStatus("status3", "Share cancelled.");
    }
  });
}

/* =========================
   STEP 4: PERSON UPLOAD + TRY-ON
   ========================= */
const personInput = document.getElementById("personInput");
const personBtn = document.getElementById("personBtn");
const personLabel = document.getElementById("personLabel");
const generateTryOnBtn = document.getElementById("generateTryOnBtn");
const downloadTryOnBtn = document.getElementById("downloadTryOnBtn");
const shareTryOnBtn = document.getElementById("shareTryOnBtn");

function setPersonFile(file) {
  state.personFile = file;
  if (personLabel) personLabel.textContent = file.name;
  setStatus("status4", "");
}

if (personBtn && personInput) {
  personBtn.addEventListener("click", () => personInput.click());

  personInput.addEventListener("change", () => {
    const file = personInput.files?.[0];
    if (!file) return;
    setPersonFile(file);
  });

  wireDropZone(personBtn, (file) => setPersonFile(file));
}

if (generateTryOnBtn) {
  generateTryOnBtn.addEventListener("click", async () => {
    if (!state.generatedBagDataUrl) {
      setStatus("status4", "Generate the bag first.");
      return;
    }
    if (!state.personFile) {
      setStatus("status4", "Upload a full-body photo first.");
      return;
    }

    setStatus("status4", "Generating try-on...");

    try {
      const fd = new FormData();
      fd.append("person", state.personFile, state.personFile.name);

      const bagBlob = dataUrlToBlob(state.generatedBagDataUrl);
      fd.append("bag", bagBlob, "generated-bag.png");

      fd.append("prompt", "make the woman hold the bag");

      const url = apiUrl(ENDPOINTS.tryOn);

      const res = await fetch(url, { method: "POST", body: fd });

      let data;
      try {
        data = await safeJson(res);
      } catch (parseErr) {
        const extra = explainLikelyCause(res.status, ENDPOINTS.tryOn);
        throw new Error(parseErr.message + extra);
      }

      if (!res.ok) {
        const extra = explainLikelyCause(res.status, ENDPOINTS.tryOn);
        throw new Error((data?.error || `Try-on failed (${res.status})`) + extra);
      }

      if (!data?.image) {
        throw new Error("API response missing 'image'.");
      }

      state.tryOnDataUrl = data.image;

      const tryImg = document.getElementById("tryOnImg");
      if (tryImg) tryImg.src = state.tryOnDataUrl;

      setStatus("status4", "Done.");
    } catch (err) {
      setStatus("status4", "Error: " + err.message);
    }
  });
}

if (downloadTryOnBtn) {
  downloadTryOnBtn.addEventListener("click", () => {
    if (!state.tryOnDataUrl) return;
    downloadAny(state.tryOnDataUrl, "rebirth-tryon.png");
  });
}

if (shareTryOnBtn) {
  shareTryOnBtn.addEventListener("click", async () => {
    const src = state.tryOnDataUrl;
    if (!src) {
      setStatus("status4", "Generate the try-on first.");
      return;
    }

    try {
      if (!navigator.share) {
        setStatus("status4", "Sharing not supported on this device/browser.");
        return;
      }

      const blob = dataUrlToBlob(src);
      const file = new File([blob], "rebirth-tryon.png", { type: blob.type });

      await navigator.share({
        title: "Rebirth Try-On",
        text: "My Rebirth try-on",
        files: [file],
      });

      setStatus("status4", "Shared.");
    } catch {
      setStatus("status4", "Share cancelled.");
    }
  });
}

/* =========================
   HELPERS
   ========================= */
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function downloadAny(src, filename) {
  // Normal URL (assets/...) or data URL both work
  const a = document.createElement("a");
  a.href = src.startsWith("data:") ? src : encodeURI(src);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Start
showStep(1);