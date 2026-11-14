/* Vorén — interactions
   GSAP + ScrollTrigger for motion, Lenis for smooth scrolling (self-hosted in js/vendor).
   Everything degrades gracefully: without the libraries or with
   reduced motion, the page is a normal, fully visible scrolling page. */

(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const animate = hasGsap && !reduce;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const FPS = 25;
  const timecode = (seconds) => {
    const total = Math.max(0, Math.floor(seconds * FPS));
    const f = total % FPS;
    const s = Math.floor(total / FPS);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
  };

  // Chat assistant: injected only after the intro, then faded in.
  let chatLoaded = false;
  const loadChat = () => {
    const cfg = document.getElementById("chat-widget");
    if (chatLoaded || !cfg) return;
    chatLoaded = true;
    const isHost = (n) => n.nodeType === 1 && n.parentElement === document.body && n.shadowRoot;
    const reveal = (host) => {
      host.style.opacity = "0";
      host.style.transition = "opacity 0.8s ease";
      requestAnimationFrame(() => requestAnimationFrame(() => { host.style.opacity = "1"; }));
    };
    const mo = new MutationObserver((records) => {
      records.forEach((r) => r.addedNodes.forEach((n) => {
        // The shadow root is attached right after insertion, so check on the next frame too.
        if (isHost(n)) { reveal(n); mo.disconnect(); }
        else if (n.nodeType === 1 && n.parentElement === document.body && n.tagName === "DIV") {
          requestAnimationFrame(() => { if (isHost(n)) { reveal(n); mo.disconnect(); } });
        }
      }));
    });
    if (!reduce) mo.observe(document.body, { childList: true });
    setTimeout(() => mo.disconnect(), 15000);
    const s = document.createElement("script");
    s.src = cfg.dataset.src;
    s.async = true;
    s.dataset.assistantId = cfg.dataset.assistantId;
    document.body.appendChild(s);
  };

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------------------------------------------------------------- Lenis */

  let lenis = null;
  if (!reduce && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      // Let third-party widgets (the baza.chat assistant lives in a shadow root
      // attached straight to <body>) scroll natively instead of the page.
      prevent: (node) => node.parentElement === document.body && Boolean(node.shadowRoot),
    });
    window.lenis = lenis;
    if (hasGsap) {
      lenis.on("scroll", window.ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  const scrollToTarget = (hash) => {
    const target = hash === "#top" ? 0 : $(hash);
    if (target === null) return;
    if (lenis) lenis.scrollTo(target);
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  $$("[data-scroll]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (!hash || !hash.startsWith("#")) return;
      e.preventDefault();
      scrollToTarget(hash);
    });
  });

  /* ------------------------------------------------------------------ Nav */

  const nav = $(".nav");
  let lastY = 0;
  const onScroll = (y) => {
    nav.classList.toggle("is-solid", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };
  if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });

  /* --------------------------------------------------------- Theme Toggle */

  const themeToggle = $(".theme-toggle");
  const metaTheme = $('meta[name="theme-color"]');

  const updateThemeUI = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#0e0e0e" : "#F8F8F5");
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      themeToggle.setAttribute("title", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  };

  const getActiveTheme = () => {
    return document.documentElement.getAttribute("data-theme") || "light";
  };

  if (themeToggle) {
    updateThemeUI(getActiveTheme());
    themeToggle.addEventListener("click", () => {
      const current = getActiveTheme();
      const next = current === "dark" ? "light" : "dark";
      updateThemeUI(next);
      try {
        localStorage.setItem("teo-theme", next);
      } catch (e) {}
    });
  }

  /* -------------------------------------------------------- Mobile Drawer */

  const burger = $(".nav__burger");
  const drawer = $(".nav__drawer");
  if (burger && drawer) {
    const toggleDrawer = (open) => {
      const isOpen = open !== undefined ? open : !nav.classList.contains("is-drawer-open");
      nav.classList.toggle("is-drawer-open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      drawer.setAttribute("aria-hidden", String(!isOpen));
      if (isOpen && lenis) lenis.stop();
      else if (!isOpen && lenis) lenis.start();
    };

    burger.addEventListener("click", () => toggleDrawer());

    $$(".nav__drawer-item", drawer).forEach((link) => {
      link.addEventListener("click", () => toggleDrawer(false));
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-drawer-open")) {
        toggleDrawer(false);
      }
    });
  }

  /* ------------------------------------------- Contact Interactive Hub */

  const chips = $$(".contact__chips .chip");
  const whatsappBtn = $("#inquiry-whatsapp");
  const emailBtn = $("#inquiry-email");

  const updateInquiryLinks = () => {
    const activeChips = chips.filter((c) => c.classList.contains("is-active"));
    const services = activeChips.map((c) => c.dataset.service || c.textContent.trim()).join(", ");
    const phrase = services.length > 0 ? services : "General Video & Motion Inquiry";

    if (whatsappBtn) {
      const waText = encodeURIComponent(`Hi Vorén, I'd like to discuss a project involving: ${phrase}.`);
      whatsappBtn.href = `https://wa.me/250789906133?text=${waText}`;
    }
    if (emailBtn) {
      const emSubject = encodeURIComponent(`New Project Inquiry: ${phrase}`);
      emailBtn.href = `mailto:Sam.kamo500@gmail.com?subject=${emSubject}`;
    }
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("is-active");
      // Guarantee at least one service is selected for seamless UX
      if (!chips.some((c) => c.classList.contains("is-active"))) {
        chip.classList.add("is-active");
      }
      updateInquiryLinks();
    });
  });

  // Copy email button
  const copyBtn = $(".contact-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const textToCopy = copyBtn.dataset.copy || "Sam.kamo500@gmail.com";
      try {
        await navigator.clipboard.writeText(textToCopy);
        copyBtn.classList.add("is-copied");
        setTimeout(() => copyBtn.classList.remove("is-copied"), 2200);
      } catch (err) {
        // Fallback for environments where clipboard API is restricted
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copyBtn.classList.add("is-copied");
        setTimeout(() => copyBtn.classList.remove("is-copied"), 2200);
      }
    });
  }

  /* --------------------------------------------------------------- Videos */

  const heroVideo = $(".hero__video");
  if (reduce && heroVideo) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  }

  // Previews load and play only while on screen.
  const previews = $$("video[data-src]");
  if (!reduce && !saveData && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.getAttribute("src")) v.src = v.dataset.src;
          const p = v.play();
          if (p) p.catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.35 });
    previews.forEach((v) => io.observe(v));
  }

  /* ------------------------------------------------------------- Lightbox */

  const lb = $(".lightbox");
  const lbVideo = $(".lightbox__video");
  const lbClose = $(".lightbox__close");
  let lastFocus = null;

  // The chat widget's host element (a shadow-root div on <body>), if it has loaded.
  const chatHost = () => Array.from(document.body.children).find((n) => n.shadowRoot);

  const openLightbox = (src) => {
    lastFocus = document.activeElement;
    const ch = chatHost();
    if (ch) ch.style.visibility = "hidden"; // keep it off the video controls
    lbVideo.src = src;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add("is-open"));
    if (lenis) lenis.stop();
    document.documentElement.style.overflow = "hidden";
    if (heroVideo) heroVideo.pause();
    const p = lbVideo.play();
    if (p) p.catch(() => {});
    lbClose.focus();
  };

  const closeLightbox = () => {
    lb.classList.remove("is-open");
    const ch = chatHost();
    if (ch) ch.style.visibility = "";
    lbVideo.pause();
    setTimeout(() => {
      lb.hidden = true;
      lbVideo.removeAttribute("src");
      lbVideo.load();
    }, 350);
    if (lenis) lenis.start();
    document.documentElement.style.overflow = "";
    if (heroVideo && !reduce) heroVideo.play().catch(() => {});
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  $$("[data-lightbox]").forEach((el) => {
    el.addEventListener("click", () => openLightbox(el.dataset.lightbox));
    if (el.tagName !== "BUTTON") {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(el.dataset.lightbox);
        }
      });
    }
  });
  lbClose.addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLightbox(); });

  /* ------------------------------------- Cursor, magnetic, hover previews */

  if (finePointer && hasGsap) {
    const cursor = $(".cursor");
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });

    const preview = $(".hover-preview");
    const pVideo = $("video", preview);
    const pxTo = gsap.quickTo(preview, "x", { duration: 0.6, ease: "power3" });
    const pyTo = gsap.quickTo(preview, "y", { duration: 0.6, ease: "power3" });

    window.addEventListener("mousemove", (e) => {
      if (cursor.classList.contains("is-hidden")) {
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        gsap.set(preview, { x: e.clientX, y: e.clientY });
        cursor.classList.remove("is-hidden");
      }
      xTo(e.clientX);
      yTo(e.clientY);
      pxTo(e.clientX + 150);
      pyTo(e.clientY);
    });
    document.addEventListener("mouseover", (e) => {
      cursor.classList.toggle("is-play", Boolean(e.target.closest('[data-cursor="play"]')));
    });
    document.documentElement.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
    document.documentElement.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));

    // Services show a floating clip that follows the pointer.
    if (!reduce && !saveData) {
      $$("[data-preview]").forEach((row) => {
        row.addEventListener("mouseenter", () => {
          if (pVideo.getAttribute("src") !== row.dataset.preview) pVideo.src = row.dataset.preview;
          pVideo.play().catch(() => {});
          preview.classList.add("is-active");
        });
        row.addEventListener("mouseleave", () => {
          preview.classList.remove("is-active");
          pVideo.pause();
        });
      });
    }

    // Phone stack follows the pointer a little.
    if (!reduce) {
      const fan = $(".hero__fan");
      const stage = $(".hero__stage");
      if (fan && stage) {
        const rx = gsap.quickTo(fan, "rotationY", { duration: 0.8, ease: "power3" });
        const ry = gsap.quickTo(fan, "rotationX", { duration: 0.8, ease: "power3" });
        gsap.set(stage, { perspective: 1200 });
        $(".hero").addEventListener("mousemove", (e) => {
          const r = stage.getBoundingClientRect();
          rx(((e.clientX - (r.left + r.width / 2)) / r.width) * 10);
          ry(-((e.clientY - (r.top + r.height / 2)) / r.height) * 8);
        });
        $(".hero").addEventListener("mouseleave", () => { rx(0); ry(0); });
      }
    }

    // Magnetic buttons.
    if (!reduce) {
      $$("[data-magnetic]").forEach((el) => {
        const mx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
        const my = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
        el.addEventListener("mousemove", (e) => {
          const r = el.getBoundingClientRect();
          mx((e.clientX - (r.left + r.width / 2)) * 0.3);
          my((e.clientY - (r.top + r.height / 2)) * 0.3);
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
        });
      });
    }
  }

  /* ------------------------------------------------- No-animation fallback */

  const loader = $(".loader");
  if (!animate) {
    if (loader) loader.remove();
    document.body.classList.remove("is-loading");
    if (document.readyState === "complete") loadChat();
    else window.addEventListener("load", loadChat, { once: true });
    return;
  }

  /* ------------------------------------------------------------ Animation */

  gsap.registerPlugin(ScrollTrigger);
  if (lenis) lenis.stop();

  // Starting states for the intro (hidden behind the loader).
  gsap.set(".hero__title .line > span", { yPercent: 120 });
  gsap.set("[data-hero]", { autoAlpha: 0, y: 20 });
  gsap.set(".nav", { autoAlpha: 0, y: -16 });
  // Animate inner layers only: CSS positions the outer .hero-phone / disc.
  gsap.set(".hero-phone__body", { y: 160, autoAlpha: 0 });
  gsap.set(".hero__disc", { x: 0, y: 0, xPercent: -50, yPercent: -48, scale: 0.7, autoAlpha: 0 });

  // Loader: logo builds, timecode runs, then a two-layer curtain lifts.
  const tcEl = $("[data-tc]");
  const barEl = $(".loader__bar span");
  const progress = { v: 0 };
  const render = () => {
    tcEl.textContent = timecode(progress.v * 3);
    barEl.style.transform = `scaleX(${progress.v})`;
  };

  gsap.from(".loader__path", {
    autoAlpha: 0,
    scale: 0.4,
    rotation: -60,
    transformOrigin: "50% 50%",
    stagger: 0.12,
    duration: 0.9,
    ease: "expo.out",
  });
  gsap.from([".loader__tc", ".loader__bar", ".loader__label"], {
    autoAlpha: 0,
    y: 14,
    stagger: 0.08,
    duration: 0.8,
    delay: 0.15,
    ease: "expo.out",
  });

  const minTime = new Promise((r) => setTimeout(r, 1300));
  const heroReady = new Promise((r) => {
    if (!heroVideo || heroVideo.readyState >= 3) return r();
    heroVideo.addEventListener("canplay", r, { once: true });
    heroVideo.addEventListener("error", r, { once: true });
  });
  const pageLoaded = new Promise((r) => {
    if (document.readyState === "complete") r();
    else window.addEventListener("load", r, { once: true });
  });
  const timeout = new Promise((r) => setTimeout(r, 3200));

  gsap.to(progress, { v: 0.86, duration: 1.3, ease: "power2.out", onUpdate: render });

  Promise.all([minTime, Promise.race([Promise.all([heroReady, pageLoaded]), timeout])]).then(() => {
    gsap.timeline()
      .to(progress, { v: 1, duration: 0.35, ease: "power2.inOut", onUpdate: render })
      .add(() => {
        document.body.classList.remove("is-loading");
        if (lenis) lenis.start();
      })
      .to(".loader__panel--front > *", { autoAlpha: 0, y: -20, stagger: 0.04, duration: 0.4, ease: "power2.in" })
      .to(".loader__panel--front", { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.1")
      .to(".loader__panel--back", { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.75")
      .to(".hero__disc", { scale: 1, autoAlpha: 1, duration: 1.4, ease: "expo.out" }, "-=0.55")
      .to(".hero-phone--center .hero-phone__body", { y: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out" }, "<0.1")
      .to([".hero-phone--left .hero-phone__body", ".hero-phone--right .hero-phone__body"], { y: 0, autoAlpha: 1, stagger: 0.08, duration: 1.4, ease: "expo.out" }, "<0.12")
      .to(".hero__title .line > span", { yPercent: 0, stagger: 0.09, duration: 1.2, ease: "expo.out" }, "-=1.2")
      .to("[data-hero]", { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.9, ease: "expo.out" }, "-=0.9")
      .to(".nav", { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out" }, "<")
      .add(() => {
        loader.remove();
        ScrollTrigger.refresh();
        loadChat();
      });
  });

  // Hero drifts as you leave it.
  gsap.to(".hero__fan", {
    yPercent: -10,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero__content", {
    yPercent: -18,
    autoAlpha: 0.15,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // Generic fade-up reveals.
  $$("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 40,
      autoAlpha: 0,
      duration: 1.1,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
    });
  });

  // About statement lights up word by word (keeps the italic <em> words).
  const statement = $("[data-words]");
  if (statement) {
    const frag = document.createDocumentFragment();
    Array.from(statement.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const span = document.createElement("span");
          span.className = "word";
          span.textContent = part;
          frag.appendChild(span);
        });
      } else {
        const span = document.createElement("span");
        span.className = "word";
        span.appendChild(node.cloneNode(true));
        frag.appendChild(span);
      }
    });
    statement.replaceChildren(frag);
    gsap.to($$(".word", statement), {
      opacity: 1,
      stagger: 0.06,
      ease: "none",
      scrollTrigger: { trigger: statement, start: "top 82%", end: "bottom 45%", scrub: true },
    });
  }

  // Parallax for anything with data-speed.
  $$("[data-speed]").forEach((el) => {
    const shift = (1 - parseFloat(el.dataset.speed)) * 220;
    gsap.fromTo(el, { y: -shift / 2 }, {
      y: shift / 2,
      ease: "none",
      scrollTrigger: { trigger: el.closest("section"), start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // Brand names light up one after another.
  gsap.from(".brands__list li", {
    yPercent: 60,
    autoAlpha: 0,
    stagger: 0.07,
    duration: 1,
    ease: "expo.out",
    scrollTrigger: { trigger: ".brands__list", start: "top 88%" },
  });

  // Vertical reels: pinned sideways scroll on larger screens.
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    const track = $(".reels__track");
    const distance = () => Math.max(1, track.scrollWidth - window.innerWidth);
    if (track.scrollWidth - window.innerWidth < 8) return;
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".reels",
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  });

  // Wide cards grow into place.
  $$(".wide-card__media").forEach((media) => {
    gsap.fromTo(media, { scale: 0.86, borderRadius: 48 }, {
      scale: 1,
      borderRadius: 18,
      ease: "none",
      scrollTrigger: { trigger: media, start: "top 98%", end: "top 45%", scrub: true },
    });
  });

  // Contact headline rises line by line.
  gsap.from(".contact__title .line > span", {
    yPercent: 140,
    stagger: 0.1,
    duration: 1.2,
    ease: "expo.out",
    scrollTrigger: { trigger: ".contact__title", start: "top 82%" },
  });

  // Footer wordmark slides up.
  gsap.from(".footer__wordmark > *", {
    yPercent: 70,
    autoAlpha: 0,
    stagger: 0.12,
    duration: 1.3,
    ease: "expo.out",
    scrollTrigger: { trigger: ".footer", start: "top 92%" },
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
