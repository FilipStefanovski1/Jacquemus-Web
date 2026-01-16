/* =========================
   CONFIG (IMPORTANT)
   ========================= */
const API_BASE = "";

// API endpoints
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
  { src: "/assets/black-large-bambino.png", name: "The Large Bambino (Black)" },
  { src: "/assets/black-the-bambino.png", name: "The Bambino (Black)" },
  { src: "/assets/black-the-bisou-perle.png", name: "The Bisou Perle (Black)" },
  { src: "/assets/the-large-chiquito.png", name: "The Large Chiquito" },
];

const state = {
  bagUrl: BAG_OPTIONS[0].src,
  bagName: BAG_OPTIONS[0].name,
  fabricFile: null, // will store the COMPRESSED file
  personFile: null, // will store the COMPRESSED file
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
   API HELPERS
   ========================= */
function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function safeJson(res) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    const head = text.slice(0, 400);
    throw new Error(`API returned non-JSON. Status: ${res.status}\n\nFirst bytes:\n${head}`);
  }
}

function explainLikelyCause(status, endpointPath) {
  if (status === 404) {
    return (
      `\n\nLikely cause: API route "${endpointPath}" is not available on this server.\n` +
      `Fix: Run with "npx vercel dev" or deploy the /api functions.`
    );
  }
  if (status === 401 || status === 403) {
    return (
      `\n\nLikely cause: Key/model permissions or API restrictions (Gemini returned ${status}).\n` +
      `Fix: Check GEMINI_API_KEY + GEMINI_IMAGE_MODEL in .env.local (and Vercel env).`
    );
  }
  if (status === 413) {
    return `\n\nLikely cause: Upload too large (payload limit).\nFix: Use smaller images or let the app compress them.`;
  }
  return "";
}

function formatApiError(data, status, endpointPath) {
  const extra = explainLikelyCause(status, endpointPath);
  if (!data) return `Request failed (${status})` + extra;

  const msg = data?.error || `Request failed (${status})`;
  const raw = data?.raw ? `\n\nRaw:\n${String(data.raw).slice(0, 600)}` : "";
  return msg + extra + raw;
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

    const fabricLabel = document.getElementById("fabricLabel");
    const personLabel = document.getElementById("personLabel");
    if (fabricLabel) fabricLabel.textContent = "Upload or drag & drop fabric image...";
    if (personLabel) personLabel.textContent = "Upload or drag & drop full-body image...";

    const fabricMini = document.getElementById("fabricMini");
    const fabricMiniEmpty = document.getElementById("fabricMiniEmpty");
    if (fabricMini) fabricMini.style.display = "none";
    if (fabricMiniEmpty) fabricMiniEmpty.style.display = "block";

    const genImg = document.getElementById("generatedBagImg");
    if (genImg) genImg.src = state.bagUrl;

    const tryImg = document.getElementById("tryOnImg");
    if (tryImg) {
      tryImg.removeAttribute("src");
      tryImg.style.display = "none";
    }

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

    state.generatedBagDataUrl = null;
    state.tryOnDataUrl = null;

    syncBagEverywhere();

    const tryImg = document.getElementById("tryOnImg");
    if (tryImg) {
      tryImg.removeAttribute("src");
      tryImg.style.display = "none";
    }
  });
}

syncBagEverywhere();

/* =========================
   DRAG & DROP
   ========================= */
function wireDropZone(buttonEl, onFile) {
  if (!buttonEl) return;

  buttonEl.addEventListener("dragover", (e) => e.preventDefault());
  buttonEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    onFile(file);
  });
}

/* =========================
   COMPRESSION
   ========================= */
// Target: keep each upload under ~2.2MB
const TARGET_BYTES = 2.2 * 1024 * 1024;
const HARD_STOP_BYTES = 3.2 * 1024 * 1024;

function bytesToNice(n) {
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

async function fileToBitmap(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {}
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToBlob(canvas, quality) {
  return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function compressToTarget(file, { maxDim = 1200 } = {}) {
  if (file.size <= TARGET_BYTES) return file;

  const img = await fileToBitmap(file);

  const w = img.width;
  const h = img.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, tw, th);

  let blob = await canvasToBlob(canvas, 0.82);
  if (!blob) return file;

  if (blob.size > TARGET_BYTES) blob = await canvasToBlob(canvas, 0.72);
  if (blob && blob.size > TARGET_BYTES) blob = await canvasToBlob(canvas, 0.62);

  if (blob && blob.size > TARGET_BYTES) {
    const maxDim2 = Math.max(800, Math.round(maxDim * 0.75));
    return await compressToTarget(file, { maxDim: maxDim2 });
  }

  const outName = file.name.replace(/\.\w+$/, ".jpg");
  return new File([blob], outName, { type: "image/jpeg" });
}

/* =========================
   BASE64 HELPERS (JSON ROUTE)
   ========================= */
function dataUrlToBase64Parts(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "application/octet-stream";
  return { mimeType: mime, data: b64 };
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/* =========================
   STEP 2: FABRIC UPLOAD + GENERATE
   ========================= */
const fabricInput = document.getElementById("fabricInput");
const fabricBtn = document.getElementById("fabricBtn");
const fabricLabel = document.getElementById("fabricLabel");
const fabricMini = document.getElementById("fabricMini");
const fabricMiniEmpty = document.getElementById("fabricMiniEmpty");
const generateBagBtn = document.getElementById("generateBagBtn");

async function setFabricFile(file) {
  setStatus("status2", `Compressing fabric... (${bytesToNice(file.size)})`);

  const compressed = await compressToTarget(file, { maxDim: 1200 });
  state.fabricFile = compressed;

  if (fabricLabel) fabricLabel.textContent = `${compressed.name} (${bytesToNice(compressed.size)})`;

  const url = URL.createObjectURL(compressed);
  if (fabricMini) {
    fabricMini.src = url;
    fabricMini.style.display = "block";
  }
  if (fabricMiniEmpty) fabricMiniEmpty.style.display = "none";

  if (compressed.size > HARD_STOP_BYTES) {
    setStatus(
      "status2",
      `Fabric still too big after compression (${bytesToNice(compressed.size)}). Use a smaller image.`
    );
    return;
  }

  setStatus("status2", "Ready.");
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

async function fileToBlobFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load local bag image: " + url);
  return await res.blob();
}

if (generateBagBtn) {
  generateBagBtn.addEventListener("click", async () => {
    if (!state.fabricFile) return setStatus("status2", "Upload a fabric image first.");
    if (state.fabricFile.size > HARD_STOP_BYTES) {
      return setStatus(
        "status2",
        `Fabric too big to upload (${bytesToNice(state.fabricFile.size)}). Pick a smaller image.`
      );
    }

    setStatus("status2", "Generating bag...");

    try {
      const bagBlob = await fileToBlobFromUrl(state.bagUrl);
      const fabricBlob = state.fabricFile;

      const bagDataUrl = await blobToDataUrl(bagBlob);
      const fabricDataUrl = await blobToDataUrl(fabricBlob);

      const payload = {
        prompt: "wrap the bag of image 1 in the texture of image 2",
        bag: dataUrlToBase64Parts(bagDataUrl),
        fabric: dataUrlToBase64Parts(fabricDataUrl),
      };

      const url = apiUrl(ENDPOINTS.generateBag);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await safeJson(res);
      } catch (parseErr) {
        const extra = explainLikelyCause(res.status, ENDPOINTS.generateBag);
        throw new Error(parseErr.message + extra);
      }

      if (!res.ok) throw new Error(formatApiError(data, res.status, ENDPOINTS.generateBag));
      if (!data?.image) throw new Error("No image returned by API.");

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
   STEP 3
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
    if (!src) return setStatus("status3", "Generate a bag first.");

    try {
      if (!navigator.share) return setStatus("status3", "Sharing not supported on this device/browser.");

      const blob = dataUrlToBlob(src);
      const file = new File([blob], "rebirth-bag.png", { type: blob.type });

      await navigator.share({ title: "Rebirth Bag Design", text: "My Rebirth bag design", files: [file] });
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

async function setPersonFile(file) {
  setStatus("status4", `Compressing photo... (${bytesToNice(file.size)})`);

  const compressed = await compressToTarget(file, { maxDim: 1400 });
  state.personFile = compressed;

  if (personLabel) personLabel.textContent = `${compressed.name} (${bytesToNice(compressed.size)})`;

  if (compressed.size > HARD_STOP_BYTES) {
    setStatus(
      "status4",
      `Photo still too big after compression (${bytesToNice(compressed.size)}). Use a smaller image.`
    );
    return;
  }

  setStatus("status4", "Ready.");
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
    if (!state.generatedBagDataUrl) return setStatus("status4", "Generate the bag first.");
    if (!state.personFile) return setStatus("status4", "Upload a full-body photo first.");

    if (state.personFile.size > HARD_STOP_BYTES) {
      return setStatus(
        "status4",
        `Photo too big to upload (${bytesToNice(state.personFile.size)}). Pick a smaller image.`
      );
    }

    setStatus("status4", "Generating try-on...");

    try {
      const personBlob = state.personFile; // File/Blob
const bagBlob = dataUrlToBlob(state.generatedBagDataUrl); // Blob

const personDataUrl = await blobToDataUrl(personBlob);
const bagDataUrl = await blobToDataUrl(bagBlob);

const payload = {
  prompt: "make the woman hold the bag",
  person: dataUrlToBase64Parts(personDataUrl),
  bag: dataUrlToBase64Parts(bagDataUrl),
};

const url = apiUrl(ENDPOINTS.tryOn);
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

      let data;
      try {
        data = await safeJson(res);
      } catch (parseErr) {
        const extra = explainLikelyCause(res.status, ENDPOINTS.tryOn);
        throw new Error(parseErr.message + extra);
      }

      if (!res.ok) throw new Error(formatApiError(data, res.status, ENDPOINTS.tryOn));
      if (!data?.image) throw new Error("API response missing 'image'.");

      state.tryOnDataUrl = data.image;

      const tryImg = document.getElementById("tryOnImg");
      if (tryImg) {
        tryImg.src = state.tryOnDataUrl;
        tryImg.style.display = "block";
      }

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
    if (!src) return setStatus("status4", "Generate the try-on first.");

    try {
      if (!navigator.share) return setStatus("status4", "Sharing not supported on this device/browser.");

      const blob = dataUrlToBlob(src);
      const file = new File([blob], "rebirth-tryon.png", { type: blob.type });

      await navigator.share({ title: "Rebirth Try-On", text: "My Rebirth try-on", files: [file] });
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
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Start
showStep(1);
