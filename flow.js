// flow.js (animated)
// Keeps your AI logic but adds premium transitions with GSAP.
// Requires gsap on the page. If gsap isn't present, everything still works.

const steps = Array.from(document.querySelectorAll(".step"));
const progressLabel = document.getElementById("progressLabel");
const dots = Array.from(document.querySelectorAll(".progress__dot"));

let current = 1;

// state
const state = {
  bagUrl: "assets/bag-red.png",
  fabricFile: null,
  personFile: null,
  generatedBagDataUrl: null,
  tryOnDataUrl: null,
};

function setStatus(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

/* ==========================
   ANIMATION HELPERS
   ========================== */
const hasGSAP = typeof window.gsap !== "undefined";

function animEnterStep(stepEl) {
  if (!hasGSAP || !stepEl) return;

  // gentle premium entrance
  gsap.fromTo(
    stepEl,
    { opacity: 0, y: 12, scale: 0.995 },
    { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out" }
  );
}

function animSwapImg(imgEl) {
  if (!hasGSAP || !imgEl) return;

  gsap.fromTo(
    imgEl,
    { opacity: 0, scale: 0.985 },
    { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }
  );
}

function animDotActive(dotEl) {
  if (!hasGSAP || !dotEl) return;

  gsap.fromTo(
    dotEl,
    { scale: 0.8 },
    { scale: 1.15, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }
  );
}

function animSuccessPulse(el) {
  if (!hasGSAP || !el) return;

  gsap.fromTo(
    el,
    { boxShadow: "0 0 0 0 rgba(138,92,16,0.0)" },
    {
      boxShadow: "0 0 0 8px rgba(138,92,16,0.14)",
      duration: 0.22,
      yoyo: true,
      repeat: 1,
      ease: "power2.out",
    }
  );
}

/* ==========================
   PROGRESS + STEP SWITCH
   ========================== */
function setProgressUI() {
  if (progressLabel) progressLabel.textContent = `Step ${current} of ${steps.length}`;

  dots.forEach((d) => {
    const n = Number(d.dataset.dot);
    d.classList.remove("is-active", "is-done");
    if (n < current) d.classList.add("is-done");
    if (n === current) d.classList.add("is-active");
  });

  // animate active dot
  const activeDot = dots.find((d) => Number(d.dataset.dot) === current);
  animDotActive(activeDot);
}

function showStep(n) {
  const prev = current;
  current = Math.max(1, Math.min(steps.length, n));

  steps.forEach((s) => {
    s.classList.toggle("is-active", Number(s.dataset.step) === current);
  });

  const activeStep = steps.find((s) => Number(s.dataset.step) === current);
  const backBtn = activeStep?.querySelector('[data-action="back"]');
  if (backBtn) backBtn.disabled = current === 1;

  setProgressUI();

  // small scroll reset like you had
  window.scrollTo({ top: 0, behavior: "smooth" });

  // animate entering step (only when changing steps)
  if (prev !== current) animEnterStep(activeStep);
}

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

    document.getElementById("fabricLabel").textContent = "Upload or drag & drop fabric image...";
    document.getElementById("personLabel").textContent = "Upload or drag & drop full-body image...";

    const fabricMini = document.getElementById("fabricMini");
    const fabricMiniEmpty = document.getElementById("fabricMiniEmpty");
    fabricMini.style.display = "none";
    fabricMiniEmpty.style.display = "block";

    document.getElementById("generatedBagImg").src = state.bagUrl;
    document.getElementById("tryOnImg").src = "assets/wear.png";

    setStatus("status3", "");
    setStatus("status4", "");
    setStatus("status5", "");

    // reset swatch visual
    const swatches = Array.from(document.querySelectorAll(".swatch"));
    swatches.forEach((s) => s.classList.remove("is-active"));

    showStep(1);
  }
});

/* ==========================
   STEP 1: bag selection
   ========================== */
const formThumbs = document.getElementById("formThumbs");
const bagPreview = document.getElementById("bagPreview");
const bagPreview2 = document.getElementById("bagPreview2");
const bagMini = document.getElementById("bagMini");
const selectedBagName = document.getElementById("selectedBagName");

if (formThumbs) {
  formThumbs.addEventListener("click", (e) => {
    const t = e.target.closest(".bagTile");
    if (!t) return;

    formThumbs.querySelectorAll(".bagTile").forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");

    const bag = t.dataset.bag;
    if (!bag) return;

    state.bagUrl = bag;
    selectedBagName.textContent = bag;

    bagPreview.src = bag;
    bagPreview2.src = bag;
    bagMini.src = bag;

    animSwapImg(bagPreview);
    animSwapImg(bagPreview2);
    animSwapImg(bagMini);

    // if bag not generated yet, keep step 4 preview synced
    if (!state.generatedBagDataUrl) {
      const gen = document.getElementById("generatedBagImg");
      gen.src = bag;
      animSwapImg(gen);
    }
  });
}

/* ==========================
   STEP 2: swatch selection (visual only)
   ========================== */
const swatchesRow = document.getElementById("swatchesRow");
if (swatchesRow) {
  swatchesRow.addEventListener("click", (e) => {
    const sw = e.target.closest(".swatch");
    if (!sw) return;
    swatchesRow.querySelectorAll(".swatch").forEach((x) => x.classList.remove("is-active"));
    sw.classList.add("is-active");

    animDotActive(sw); // subtle little pop
  });
}

/* ==========================
   STEP 3: fabric upload
   ========================== */
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
    fabricLabel.textContent = file.name;

    const url = URL.createObjectURL(file);
    fabricMini.src = url;
    fabricMini.style.display = "block";
    fabricMiniEmpty.style.display = "none";

    animSwapImg(fabricMini);
    animSuccessPulse(fabricBtn);
  });
}

async function fileToBlobFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load local bag image: " + url);
  return await res.blob();
}

generateBagBtn.addEventListener("click", async () => {
  if (!state.fabricFile) {
    setStatus("status3", "Upload a fabric image first.");
    return;
  }

  setStatus("status3", "Generating bag...");

  // loading micro animation on button
  if (hasGSAP) gsap.to(generateBagBtn, { opacity: 0.75, duration: 0.15 });

  try {
    const bagBlob = await fileToBlobFromUrl(state.bagUrl);

    const fd = new FormData();
    fd.append("bag", bagBlob, "bag.png");
    fd.append("fabric", state.fabricFile, state.fabricFile.name);
    fd.append("prompt", "wrap the bag of image 1 in the texture of image 2");

    const res = await fetch("/api/generate-bag", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) throw new Error(data?.error || "Generation failed");

    state.generatedBagDataUrl = data.image;

    const genImg = document.getElementById("generatedBagImg");
    genImg.src = state.generatedBagDataUrl;
    animSwapImg(genImg);

    setStatus("status3", "Done.");
    if (hasGSAP) gsap.to(generateBagBtn, { opacity: 1, duration: 0.15 });

    showStep(4);
  } catch (err) {
    setStatus("status3", "Error: " + err.message);
    if (hasGSAP) gsap.to(generateBagBtn, { opacity: 1, duration: 0.15 });
  }
});

/* ==========================
   STEP 4: download + continue
   ========================== */
document.getElementById("downloadBagBtn").addEventListener("click", () => {
  if (!state.generatedBagDataUrl) return;
  downloadDataUrl(state.generatedBagDataUrl, "rebirth-bag.png");
});

document.getElementById("toTryOnBtn").addEventListener("click", () => {
  showStep(5);
});

/* ==========================
   STEP 5: person upload + try-on
   ========================== */
const personInput = document.getElementById("personInput");
const personBtn = document.getElementById("personBtn");
const personLabel = document.getElementById("personLabel");
const generateTryOnBtn = document.getElementById("generateTryOnBtn");

if (personBtn && personInput) {
  personBtn.addEventListener("click", () => personInput.click());

  personInput.addEventListener("change", () => {
    const file = personInput.files?.[0];
    if (!file) return;
    state.personFile = file;
    personLabel.textContent = file.name;

    animSuccessPulse(personBtn);
  });
}

generateTryOnBtn.addEventListener("click", async () => {
  if (!state.generatedBagDataUrl) {
    setStatus("status5", "Generate the bag first.");
    return;
  }
  if (!state.personFile) {
    setStatus("status5", "Upload a full-body photo first.");
    return;
  }

  setStatus("status5", "Generating try-on...");

  if (hasGSAP) gsap.to(generateTryOnBtn, { opacity: 0.75, duration: 0.15 });

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
    tryImg.src = state.tryOnDataUrl;
    animSwapImg(tryImg);

    setStatus("status5", "Done.");
    if (hasGSAP) gsap.to(generateTryOnBtn, { opacity: 1, duration: 0.15 });
  } catch (err) {
    setStatus("status5", "Error: " + err.message);
    if (hasGSAP) gsap.to(generateTryOnBtn, { opacity: 1, duration: 0.15 });
  }
});

document.getElementById("downloadTryOnBtn").addEventListener("click", () => {
  if (!state.tryOnDataUrl) return;
  downloadDataUrl(state.tryOnDataUrl, "rebirth-tryon.png");
});

/* ==========================
   helpers
   ========================== */
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

showStep(1);
