// main.js
// GSAP animations for Rebirth Creative Studio AI (landing + about)
// + Mobile nav toggle (About/Contact visible on mobile)

(function () {
  /* =========================
     MOBILE NAV TOGGLE
     ========================= */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  function closeNav() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  function openNav() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.contains("is-open");
      if (isOpen) closeNav();
      else openNav();
    });

    // close when clicking outside
    document.addEventListener("click", (e) => {
      if (!navLinks.classList.contains("is-open")) return;

      const clickedInsideNav =
        navLinks.contains(e.target) || navToggle.contains(e.target);

      if (!clickedInsideNav) closeNav();
    });

    // close when clicking a link
    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => closeNav());
    });

    // close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* =========================
     SMOOTH SCROLL FOR ANCHORS
     ========================= */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      closeNav();
    });
  });

  // If GSAP isn't loaded, just exit (page still works)
  if (!window.gsap) return;

  gsap.registerPlugin(ScrollTrigger);

  /* =========================
     HERO INTRO (index)
     ========================= */
  const heroTitle = document.querySelector(".hero__title");
  const heroSub = document.querySelector(".hero__sub");
  const heroBtn = document.querySelector(".hero__btn");
  const collage = document.querySelector(".heroCollage");
  const leftCard = document.querySelector(".heroCard--left");
  const mainCard = document.querySelector(".heroCard--main");
  const rightCard = document.querySelector(".heroCard--right");

  if (heroTitle && collage) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(heroTitle, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 })
      .fromTo(heroSub, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.35")
      .fromTo(heroBtn, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, "-=0.3")
      .fromTo(collage, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.25");

    if (leftCard && mainCard && rightCard) {
      tl.fromTo(leftCard, { rotate: -16, y: 26, opacity: 0 }, { rotate: -10, y: 0, opacity: 1, duration: 0.6 }, "-=0.35")
        .fromTo(mainCard, { rotate: -7, y: 28, opacity: 0, scale: 0.985 }, { rotate: -2, y: 0, opacity: 1, scale: 1, duration: 0.7 }, "-=0.45")
        .fromTo(rightCard, { rotate: 16, y: 26, opacity: 0 }, { rotate: 10, y: 0, opacity: 1, duration: 0.6 }, "-=0.5");
    }
  }

  /* =========================
     SCROLL REVEALS
     ========================= */
  const revealTargets = [
    ".how .sectionTitle",
    ".how .howSteps",
    ".how .how__btn",
    ".gallery .sectionTitle",
    ".gallery .sectionSub",
    ".gallery .galleryGrid",
    ".cta .ctaBox",
    ".footer",
  ];

  revealTargets.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      gsap.fromTo(
        el,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        }
      );
    });
  });

  /* =========================
     PARALLAX FLOAT (mouse move)
     ========================= */
  if (collage && leftCard && mainCard && rightCard) {
    const strength = 14;

    collage.addEventListener("mousemove", (e) => {
      const r = collage.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;

      gsap.to(mainCard, { x: mx * strength, y: my * strength, duration: 0.35, ease: "power2.out" });
      gsap.to(leftCard, { x: mx * (strength * 0.65), y: my * (strength * 0.75), duration: 0.35, ease: "power2.out" });
      gsap.to(rightCard, { x: mx * (strength * 0.75), y: my * (strength * 0.6), duration: 0.35, ease: "power2.out" });
    });

    collage.addEventListener("mouseleave", () => {
      gsap.to([leftCard, mainCard, rightCard], { x: 0, y: 0, duration: 0.5, ease: "power3.out" });
    });
  }

  /* =========================
     GALLERY TILE HOVER TILT
     ========================= */
  document.querySelectorAll(".galleryGrid .tile").forEach((tile) => {
    tile.style.transformStyle = "preserve-3d";

    tile.addEventListener("mousemove", (e) => {
      const r = tile.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;

      gsap.to(tile, {
        rotateY: x * 6,
        rotateX: -y * 6,
        scale: 1.01,
        duration: 0.25,
        ease: "power2.out",
      });
    });

    tile.addEventListener("mouseleave", () => {
      gsap.to(tile, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.35,
        ease: "power3.out",
      });
    });
  });

  /* =========================
     BUTTON MICRO-INTERACTION
     ========================= */
  document.querySelectorAll(".btn, .launch").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      gsap.to(btn, { y: -1, duration: 0.18, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { y: 0, duration: 0.18, ease: "power2.out" });
    });
  });
})();
