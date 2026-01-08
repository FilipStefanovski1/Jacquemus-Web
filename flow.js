// flow.js (4-step, with correct bag asset names)
// NOTE: This will NOT work reliably if you open the HTML via file://
// Run a local server (Vite / Live Server / python http.server) and it will work.

const steps = Array.from(document.querySelectorAll(".step"));
const progressLabel = document.getElementById("progressLabel");
const dots = Array.from(document.querySelectorAll(".progress__dot"));

let current = 1;

// --------- STATE ----------
const BAG_OPTIONS = [
  { src: "assets/Black Large Bambino.png", name: "Black Large Bambino" },
  { src: "assets/Black The Bambino.png", name: "Black The Bambino" },
  { src: "assets/Black The Bisou Perle.png", name: "Black The Bisou Perle" },
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

// --------- NAV BUTTONS ----------
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

    // reset images back to base
    const genImg = document.getElementById("generatedBagImg");
    const tryImg = document.getElementById("tryOnImg");
    if (genImg) genImg.src = state.bagUrl;
    if (tryImg) tryImg.src = "assets/wear.png";

    setStatus("status2", "");
    setStatus("status3", "");
    setStatus("status4", "");

    showStep(1);
  }
});

// --------- STEP 1: BAG SELECTION ----------
const formThumbs = document.getElementById("formThumbs");
const bagPreview = document.getElementById("bagPreview");
const bagMini = document.getElementById("bagMini");
const selectedBagName = document.getElementById("selectedBagName");

function syncBagEverywhere() {
  if (selectedBagName) selectedBagName.textContent = state.bagName;
  if (bagPreview) bagPreview.src = state.bagUrl;
  if (bagMini) bagMini.src = state.bagUrl;

  // Step 3 left mini bag might exist on screen later
  const bagMini2 = document.getElementById("bagMini2");
  if (bagMini2) bagMini2.src = state.bagUrl;

  // If bag not generated yet, Step 3 result should show selected base
  const genImg = document.getElementById("generatedBagImg");
  if (genImg && !state.generatedBagDataUrl) genImg.src = state.bagUrl;
}

if (formThumbs) {
  formThumbs.addEventListener("click", (e) => {
    const t = e.target.closest(".bagTile");
    if (!t) return;

    // UI
    formThumbs.querySelectorAll(".bagTile").forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");

    // data
    const bag = t.dataset.bag;
    const name = t.dataset.name;

    if (!bag) return;

    state.bagUrl = bag;
    state.bagName = name || bag;

    // if user changes base bag after generating, reset generated result (optional but cleaner)
    // comment this out if you want to keep old generated bag
    state.generatedBagDataUrl = null;
    state.tryOnDataUrl = null;

    // sync previews
    syncBagEverywhere();

    // also reset try-on preview image placeholder
    const tryImg = document.getElementById("tryOnImg");
    if (tryImg) tryImg.src = "assets/wear.png";
  });
}

// Initial sync
syncBagEverywhere();

// --------- STEP 2: FABRIC UPLOAD + GENERATE BAG ----------
const fabricInput = document.getElementById("fabricInput");
const fabricBtn = document.getElementById("fabricBtn");
const fabricLabel = document.getElementById("fabricLabel");
const fabricMini = document.getElementById("fabricMini");
const fabricMiniEmpty = document.getElementById("fabricMiniEmpty");
const generateBagBtn = document.getElementById("generateBagBtn");

if (fabricBtn && fabricInput) {
  fabricBtn.addEventListener("click", () => fabricInput.click());

  fabricInput.addEventListener("change", () => {
    const file = fabricInput.files?.[0];
    if (!file) return;

    state.fabricFile = file;
    if (fabricLabel) fabricLabel.textContent = file.name;

    const url = URL.createObjectURL(file);
    if (fabricMini) {
      fabricMini.src = url;
      fabricMini.style.display = "block";
    }
    if (fabricMiniEmpty) fabricMiniEmpty.style.display = "none";
  });
}

// Helper: fetch local bag image as blob (works when served over http://, not file://)
async function fileToBlobFromUrl(url) {
  const res = await fetch(url);
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

      // IMPORTANT: This only works if you have the Vercel function locally or deployed.
      // If you're running just static HTML, this will fail ("Failed to fetch").
      const res = await fetch("/api/generate-bag", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Generation failed");

      state.generatedBagDataUrl = data.image;

      const genImg = document.getElementById("generatedBagImg");
      if (genImg) genImg.src = state.generatedBagDataUrl;

      setStatus("status2", "Done.");
      showStep(3);
    } catch (err) {
      setStatus("status2", "Error: " + err.message);
    }
  });
}

// --------- STEP 3: DOWNLOAD / SHARE / GO TRY-ON ----------
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

// Optional share button (if you added it in HTML)
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
    } catch (err) {
      setStatus("status3", "Share cancelled.");
    }
  });
}

// --------- STEP 4: PERSON UPLOAD + TRY-ON ----------
const personInput = document.getElementById("personInput");
const personBtn = document.getElementById("personBtn");
const personLabel = document.getElementById("personLabel");
const generateTryOnBtn = document.getElementById("generateTryOnBtn");
const downloadTryOnBtn = document.getElementById("downloadTryOnBtn");

if (personBtn && personInput) {
  personBtn.addEventListener("click", () => personInput.click());

  personInput.addEventListener("change", () => {
    const file = personInput.files?.[0];
    if (!file) return;
    state.personFile = file;
    if (personLabel) personLabel.textContent = file.name;
  });
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

      const res = await fetch("/api/try-on", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Try-on failed");

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

// --------- HELPERS ----------
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function downloadAny(src, filename) {
  // if it's a normal URL (assets/...), just download it
  if (typeof src === "string" && !src.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // if it's a dataURL
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

showStep(1);
