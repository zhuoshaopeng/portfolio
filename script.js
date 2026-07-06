const getTargetTop = (selector) => {
  if (selector === "#project4-contact") {
    return Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  }

  const target = selector === "#artworks" ? document.querySelector(".artworks__grid") : document.querySelector(selector);

  if (!target) {
    return null;
  }

  const top = target.getBoundingClientRect().top + window.scrollY;

  if (selector === "#experience") {
    return Math.max(top, 0);
  }

  if (selector === "#artworks") {
    return top + target.offsetHeight / 2 - window.innerHeight / 2;
  }

  return top;
};

const scrollToTarget = (selector) => {
  const top = getTargetTop(selector);

  if (top == null) {
    return;
  }

  if (window.siteLenis) {
    window.siteLenis.scrollTo(top, {
      duration: 1.35,
      lock: true,
      force: true,
      easing: (t) => 1 - Math.pow(1 - t, 4)
    });
    return;
  }

  window.scrollTo({ top, behavior: "smooth" });
};

const jumpToTarget = (selector) => {
  const top = getTargetTop(selector);

  if (top == null) {
    return;
  }

  if (window.siteLenis) {
    window.siteLenis.scrollTo(top, {
      immediate: true,
      duration: 0,
      lock: true,
      force: true
    });
  }

  window.scrollTo(0, top);
};

const jumpToTargetWithoutSmooth = (selector) => {
  const top = getTargetTop(selector);

  if (top == null) {
    return;
  }

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";

  if (window.siteLenis) {
    window.siteLenis.scrollTo(top, {
      immediate: true,
      duration: 0,
      lock: true,
      force: true
    });
  }

  window.scrollTo({ top, left: 0, behavior: "auto" });
  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousScrollBehavior;
  });
};

const jumpToBrandingSectionTop = () => {
  const top = getTargetTop("#artworks-brand-branding");

  if (top == null) {
    return;
  }

  const targetTop = top + 2;

  if (window.siteLenis) {
    window.siteLenis.scrollTo(targetTop, {
      immediate: true,
      duration: 0,
      lock: true,
      force: true
    });
    window.siteLenis.resize?.();
  }

  window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const easeMove = (value) => value * value * (3 - 2 * value);
const pageTop = (element) => element.getBoundingClientRect().top + window.scrollY;
const imageFilePattern = /\.(png|jpe?g|webp)$/i;
const optimizedImageUrl = (path, variant = "display") => {
  if (!imageFilePattern.test(path)) {
    return encodeURI(path);
  }

  return encodeURI(path.replace(/^images\//, `images-optimized/${variant}/`).replace(imageFilePattern, ".webp"));
};

const loader = document.querySelector(".route-loader");
let routeTransitionPromise = Promise.resolve();
let packagingEntryUnlocked = false;
let brandingEntryReady = false;
let contactJumpActive = false;
let loaderProgressTimer = 0;
let specialProjectScrollFrame = 0;

const sleep = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
const waitForFluidGlassReady = () => {
  if (document.body.classList.contains("is-fluid-glass-ready")) {
    return Promise.resolve();
  }

  return Promise.race([
    new Promise((resolve) => window.addEventListener("fluid-glass-ready", resolve, { once: true })),
    sleep(2000)
  ]);
};

const preloadImage = (image) => new Promise((resolve) => {
  if (!image || image.complete) {
    resolve();
    return;
  }

  image.loading = "eager";
  image.addEventListener("load", resolve, { once: true });
  image.addEventListener("error", resolve, { once: true });
});

const preloadVideo = (video) => new Promise((resolve) => {
  if (!video) {
    resolve();
    return;
  }

  if (video.readyState >= 1) {
    resolve();
    return;
  }

  video.preload = "metadata";
  video.addEventListener("loadedmetadata", resolve, { once: true });
  video.addEventListener("error", resolve, { once: true });
  video.load();
});

const loadDeferredMedia = (element) => {
  if (!element?.dataset?.src) {
    return;
  }

  element.src = element.dataset.src;
  element.removeAttribute("data-src");
};

const updateStageScale = () => {
  const scale = Math.max(0.1, Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
  document.documentElement.style.setProperty("--stage-scale", scale.toFixed(5));
};

const initStaticMediaLoading = () => {
  document.querySelectorAll("img").forEach((image) => {
    image.decoding = "async";

    if (image.closest(".hero, .global-nav, .section-nav, .hero-local-nav, .route-loader")) {
      return;
    }

    if (!image.hasAttribute("loading")) {
      image.loading = "lazy";
    }
  });
};

updateStageScale();
window.addEventListener("resize", updateStageScale);

const preloadSectionMedia = async (selector) => {
  const targetSelector = selector === "#project4-contact" ? "#artworks-special" : selector;
  const target = document.querySelector(targetSelector);

  if (!target) {
    return;
  }

  const preloadLimit = selector === "#artworks" ? 10 : selector === "#artworks-packaging" ? 18 : 14;
  const images = Array.from(target.querySelectorAll("img")).slice(0, preloadLimit);
  const videos = Array.from(target.querySelectorAll("video")).slice(0, 2);
  const timeout = sleep(900);
  const assets = Promise.all([...images.map(preloadImage), ...videos.map(preloadVideo)]);

  await Promise.race([assets, timeout]);
};

const isSpecialProjectTarget = (selector) => selector === "#artworks-special" || selector === "#project4-contact";
const normalizeNavTarget = (selector, link) => {
  if (link?.dataset?.target) {
    return link.dataset.target;
  }

  if (!link?.closest(".hero-local-nav, .global-nav, .section-nav")) {
    return selector;
  }

  const label = link.textContent.trim().toLowerCase();

  if (label === "about me") {
    return "#about";
  }

  if (label === "experience") {
    return "#experience";
  }

  if (label === "artworks") {
    return "#artworks";
  }

  if (label === "contacts") {
    return "#project4-contact";
  }

  return selector;
};

const setSpecialProjectNavState = (contactActive = false) => {
  document.body.dataset.activeSection = contactActive ? "contact" : "artworks";
  document.body.dataset.currentSection = contactActive ? "contact" : "artworks";
  document.body.dataset.sectionTone = "dark";
  document.body.dataset.navVisible = "true";
  document.body.classList.remove("is-fluid-glass-enabled");
  document.documentElement.style.setProperty("--global-nav-opacity", "1.000");
  document.documentElement.style.setProperty("--global-nav-y", "0px");
};

const openSpecialProject = (selector = "#artworks-special") => {
  const special = document.querySelector("#artworks-special");

  if (!special) {
    return;
  }

  const contactActive = selector === "#project4-contact";
  contactJumpActive = contactActive;
  document.body.classList.toggle("is-contact-jump", contactActive);
  document.body.classList.add("special-project-open");
  window.siteLenis?.stop?.();

  window.requestAnimationFrame(() => {
    const targetTop = contactActive ? Math.max(special.scrollHeight - special.clientHeight, 0) : 0;
    const video = special.querySelector("video");
    special.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
    special.focus({ preventScroll: true });
    setSpecialProjectNavState(contactActive);
    if (video && !contactActive) {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
    window.dispatchEvent(new Event("special-project-open"));
  });
};

const closeSpecialProject = () => {
  const special = document.querySelector("#artworks-special");

  if (!document.body.classList.contains("special-project-open")) {
    return;
  }

  const video = special?.querySelector("video");

  if (video) {
    video.muted = true;
  }

  document.body.classList.remove("special-project-open");
  document.body.classList.remove("is-contact-jump");
  contactJumpActive = false;

  if (special) {
    special.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  window.siteLenis?.start?.();
};

const setLoaderVisible = (visible, mode = "") => {
  if (!loader) {
    return;
  }

  window.clearInterval(loaderProgressTimer);

  if (visible) {
    loader.dataset.mode = mode;
    loader.dataset.tone = Math.random() > 0.5 ? "red" : "gray";
    loader.dataset.progress = "000%";

    if (mode === "brand") {
      let progressValue = 0;
      loaderProgressTimer = window.setInterval(() => {
        progressValue = Math.min(100, progressValue + Math.ceil(8 + Math.random() * 17));
        loader.dataset.progress = `${String(progressValue).padStart(3, "0")}%`;
      }, 34);
    }
  } else {
    loader.dataset.progress = "";
  }

  loader.classList.toggle("is-visible", visible);
  document.body.classList.toggle("is-route-loading", visible);

  if (!visible) {
    window.dispatchEvent(new Event("route-loader-hidden"));
  }
};

const transitionToTarget = (selector) => {
  routeTransitionPromise = routeTransitionPromise.then(async () => {
    setLoaderVisible(true);
    const minDuration = sleep(620);
    await Promise.all([preloadSectionMedia(selector), minDuration]);

    if (isSpecialProjectTarget(selector)) {
      openSpecialProject(selector);
      await sleep(80);
      setLoaderVisible(false);
      return;
    }

    closeSpecialProject();
    contactJumpActive = selector === "#project4-contact";
    document.body.classList.toggle("is-contact-jump", contactJumpActive);
    jumpToTarget(selector);
    updateActiveSection();
    await sleep(80);
    setLoaderVisible(false);
  });

  return routeTransitionPromise;
};

const transitionDirectToTarget = (selector) => {
  routeTransitionPromise = routeTransitionPromise.then(async () => {
    setLoaderVisible(true);
    const minDuration = sleep(420);
    await Promise.all([preloadSectionMedia(selector), minDuration]);

    closeSpecialProject();
    contactJumpActive = false;
    document.body.classList.remove("is-contact-jump");
    jumpToTargetWithoutSmooth(selector);
    updateActiveSection();
    await sleep(40);
    setLoaderVisible(false);
  });

  return routeTransitionPromise;
};

const transitionToBranding = () => {
  if (brandingEntryReady) {
    closeSpecialProject();
    jumpToTarget("#artworks-brand-branding");
    contactJumpActive = false;
    document.body.classList.remove("is-contact-jump");
    updateActiveSection();
    return;
  }

  routeTransitionPromise = routeTransitionPromise.then(async () => {
    setLoaderVisible(true, "brand");
    const minDuration = sleep(260);
    const assets = Promise.race([preloadBrandingCovers(), sleep(360)]);
    await Promise.all([assets, minDuration]);
    brandingEntryReady = true;
    closeSpecialProject();
    jumpToTarget("#artworks-brand-branding");
    contactJumpActive = false;
    document.body.classList.remove("is-contact-jump");
    updateActiveSection();
    await sleep(40);
    setLoaderVisible(false);
  });
};

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const href = normalizeNavTarget(link.getAttribute("href"), link);
    const isNavbarLink = Boolean(link.closest(".section-nav, .global-nav, .hero-local-nav"));
    const isProjectCard = Boolean(link.closest(".project-card"));
    const isPackagingCard = href === "#artworks-packaging" && isProjectCard;
    const isDirectSectionLink = link.classList.contains("brand-branding-project__next") || link.classList.contains("popup-project__next");

    if (isNavbarLink && document.body.classList.contains("brand-detail-open")) {
      const brandDetail = document.querySelector(".brand-detail");
      brandDetail?.classList.remove("is-open");
      brandDetail?.querySelector(".brand-detail__media")?.replaceChildren();
      if (brandDetail) {
        brandDetail.hidden = true;
      }
      document.body.classList.remove("brand-detail-open");
      window.siteLenis?.start?.();
    }

    if (isProjectCard) {
      packagingEntryUnlocked = isPackagingCard;
      contactJumpActive = false;
      document.body.classList.remove("is-contact-jump");
      transitionToTarget(href);
      return;
    }

    if (link.classList.contains("brand-branding-project__next")) {
      contactJumpActive = false;
      document.body.classList.remove("is-contact-jump");
      transitionDirectToTarget(href);
      return;
    }

    if (isDirectSectionLink) {
      contactJumpActive = false;
      document.body.classList.remove("is-contact-jump");
      transitionToTarget(href);
      return;
    }

    if (isNavbarLink) {
      if (href !== "#artworks-packaging") {
        packagingEntryUnlocked = false;
      }
      transitionToTarget(href);
      return;
    }

    if (isSpecialProjectTarget(href)) {
      transitionToTarget(href);
      return;
    }

    contactJumpActive = href === "#project4-contact";
    document.body.classList.toggle("is-contact-jump", contactJumpActive);
    scrollToTarget(href);
  });
});

document.querySelector(".hero")?.setAttribute("data-section", "hero");
document.querySelector(".hero")?.setAttribute("data-section-tone", "dark");

const aboutSection = document.querySelector("#about");
const artworksGrid = document.querySelector(".artworks__grid");
const packagingSection = document.querySelector("#artworks-packaging");
const brandSection = document.querySelector("#artworks-brand-branding");
let artworksSnapFrame = 0;
let artworksSnapLockedUntil = 0;

const getArtworksCenterTop = () => {
  if (!artworksGrid) {
    return null;
  }

  return pageTop(artworksGrid) + artworksGrid.offsetHeight / 2 - window.innerHeight / 2;
};

const sections = [
  ["about", aboutSection],
  ["experience", document.querySelector("#experience")],
  ["artworks", document.querySelector("#artworks")]
].filter(([, element]) => element);

sections.forEach(([name, element]) => {
  element.dataset.section = name;
  element.dataset.sectionTone = name === "contact" ? "dark" : "light";
});

let lastScrollY = window.scrollY;
let glassResumeTimer;

const pauseFluidGlassForScroll = () => {
  document.body.classList.add("is-glass-paused");
  window.clearTimeout(glassResumeTimer);
  glassResumeTimer = window.setTimeout(() => {
    document.body.classList.remove("is-glass-paused");
  }, 1000);
};

const updateActiveSection = () => {
  if (document.body.classList.contains("special-project-open")) {
    const special = document.querySelector("#artworks-special");
    const contact = document.querySelector("#project4-contact");
    const contactActive = Boolean(special && contact && contact.offsetTop <= special.scrollTop + special.clientHeight * 0.58);

    contactJumpActive = contactActive;
    document.body.classList.toggle("is-contact-jump", contactActive);
    setSpecialProjectNavState(contactActive);
    return;
  }

  const marker = window.scrollY + 180;
  let active = "hero";
  const aboutTop = aboutSection ? pageTop(aboutSection) : 1;
  let current = window.scrollY < aboutTop - 1 ? "hero" : "about";

  sections.forEach(([name, element]) => {
    const elementTop = pageTop(element);

    if (elementTop <= marker) {
      active = name;
      current = element.dataset.section || name;
    }
  });

  document.body.dataset.activeSection = active;
  document.body.dataset.currentSection = current;
  if (contactJumpActive && active !== "contact") {
    contactJumpActive = false;
    document.body.classList.remove("is-contact-jump");
  }
  document.body.dataset.sectionTone = current === "hero" || current === "contact" ? "dark" : "light";
  document.body.classList.toggle("is-fluid-glass-enabled", current === "hero" || current === "about");
  document.body.dataset.scrollingStarted = window.scrollY > 50 ? "true" : "false";
  document.body.dataset.scrollingDirection = window.scrollY >= lastScrollY ? "down" : "up";
  document.body.dataset.navVisible = window.scrollY >= aboutTop - 1;
  const navProgress = clamp((window.scrollY - 160) / Math.max(aboutTop - 320, 1), 0, 1);
  document.documentElement.style.setProperty("--global-nav-opacity", navProgress.toFixed(3));
  document.documentElement.style.setProperty("--global-nav-y", `${((1 - navProgress) * 28).toFixed(2)}px`);
  lastScrollY = window.scrollY;
};

let activeSectionFrame = 0;
const requestActiveSectionUpdate = () => {
  if (activeSectionFrame) {
    return;
  }

  activeSectionFrame = window.requestAnimationFrame(() => {
    activeSectionFrame = 0;
    updateActiveSection();
  });
};

window.addEventListener("scroll", () => {
  pauseFluidGlassForScroll();
  requestActiveSectionUpdate();
}, { passive: true });
window.addEventListener("resize", requestActiveSectionUpdate);
updateActiveSection();

window.addEventListener(
  "wheel",
  (event) => {
    if (document.body.classList.contains("special-project-open")) {
      return;
    }

    if (event.deltaY <= 0 || packagingEntryUnlocked) {
      return;
    }

    const detailOpen = document.body.classList.contains("brand-detail-open") || document.body.classList.contains("popup-detail-open");

    if (!artworksGrid || detailOpen) {
      return;
    }

    const gridTop = pageTop(artworksGrid);
    const gridBottom = gridTop + artworksGrid.offsetHeight;
    const centerTop = getArtworksCenterTop();

    if (centerTop == null) {
      return;
    }

    const isEnteringGrid = window.scrollY + window.innerHeight >= gridTop + 40 && window.scrollY < centerTop - 8;

    if (isEnteringGrid) {
      if (!artworksSnapFrame) {
        artworksSnapFrame = window.requestAnimationFrame(() => {
          artworksSnapFrame = 0;
          artworksSnapLockedUntil = performance.now() + 760;
          scrollToTarget("#artworks");
        });
      }

      return;
    }

    const isCentered = Math.abs(window.scrollY - centerTop) <= 24 || performance.now() < artworksSnapLockedUntil;

    if (isCentered && window.scrollY >= centerTop - 24 && window.scrollY < gridBottom - 4) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  { passive: false, capture: true }
);

window.addEventListener(
  "wheel",
  (event) => {
    if (document.body.classList.contains("special-project-open")) {
      return;
    }

    if (event.deltaY <= 0 || brandingEntryReady) {
      return;
    }

    const detailOpen = document.body.classList.contains("brand-detail-open") || document.body.classList.contains("popup-detail-open");

    if (!packagingSection || !brandSection || detailOpen) {
      return;
    }

    const packagingBottom = pageTop(packagingSection) + packagingSection.offsetHeight;
    const isLeavingPackaging = window.scrollY + window.innerHeight >= packagingBottom - 18 && window.scrollY < pageTop(brandSection);

    if (!isLeavingPackaging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    transitionToBranding();
  },
  { passive: false, capture: true }
);

Promise.all([
  preloadSectionMedia(".hero"),
  preloadSectionMedia("#about"),
  sleep(920),
  waitForFluidGlassReady()
]).then(() => {
  setLoaderVisible(false);
});

const initHeroAboutTransition = () => {
  const transition = document.querySelector(".hero-about-transition");
  const hero = document.querySelector(".hero");
  const about = document.querySelector("#about");
  const replacement = document.querySelector(".about-photo-replacement");

  if (!transition || !hero || !about || !replacement) {
    return;
  }

  const start = {
    left: 0,
    top: 0,
    width: 960,
    height: 1080,
    radius: 0,
    sizeW: 1620,
    sizeH: 1080,
    bgX: -230,
    bgY: 0
  };

  const target = {
    left: 480,
    top: 74,
    width: 960,
    height: 382,
    radius: 8,
    sizeW: 1040,
    sizeH: 693,
    bgX: -25,
    bgY: -210
  };

  const update = () => {
    const aboutTop = about.offsetTop;
    const scrollY = window.scrollY;
    const raw = clamp(scrollY / Math.max(aboutTop - 160, 1), 0, 1);
    const eased = easeMove(raw);
    const targetTopInView = aboutTop + target.top - scrollY;
    const top = lerp(start.top, targetTopInView, eased);
    const left = lerp(start.left, target.left, eased);
    const width = lerp(start.width, target.width, eased);
    const height = lerp(start.height, target.height, eased);
    const radius = lerp(start.radius, target.radius, eased);
    const sizeW = lerp(start.sizeW, target.sizeW, eased);
    const sizeH = lerp(start.sizeH, target.sizeH, eased);
    const bgX = lerp(start.bgX, target.bgX, eased);
    const bgY = lerp(start.bgY, target.bgY, eased);
    const isTransitioning = scrollY > 4 && raw < 0.995;
    const movingOpacity = isTransitioning ? "1" : "0";
    const maskOpacity = isTransitioning ? 1 : 0;
    const navMaskOpacity = raw > 0.02 && raw < 0.995 ? 1 : 0;
    const textShiftOpacity = isTransitioning ? 1 : 0;
    const staticPhotoOpacity = scrollY <= 4 ? 1 : 0;
    const staticNavOpacity = scrollY <= 4 ? 1 : 0;
    const htmlTextOpacity = 1;
    const heroRect = hero.getBoundingClientRect();
    const localRedLeft = left - heroRect.left;
    const localRedTop = top - heroRect.top;

    transition.style.left = `${left.toFixed(2)}px`;
    transition.style.top = `${top.toFixed(2)}px`;
    transition.style.width = `${width.toFixed(2)}px`;
    transition.style.height = `${height.toFixed(2)}px`;
    transition.style.borderRadius = `${radius.toFixed(2)}px`;
    transition.style.backgroundSize = `${sizeW.toFixed(2)}px ${sizeH.toFixed(2)}px`;
    transition.style.backgroundPosition = `${bgX.toFixed(2)}px ${bgY.toFixed(2)}px`;
    transition.style.filter = `saturate(${(1 + eased * 0.08).toFixed(3)}) contrast(${(1 + eased * 0.04).toFixed(3)})`;
    transition.style.opacity = movingOpacity;
    document.documentElement.style.setProperty("--hero-mask-opacity", maskOpacity.toFixed(3));
    document.documentElement.style.setProperty("--hero-nav-mask-opacity", navMaskOpacity.toFixed(3));
    document.documentElement.style.setProperty("--hero-text-shift-opacity", textShiftOpacity.toFixed(3));
    document.documentElement.style.setProperty("--hero-static-photo-opacity", staticPhotoOpacity.toFixed(3));
    document.documentElement.style.setProperty("--hero-static-nav-opacity", staticNavOpacity.toFixed(3));
    document.documentElement.style.setProperty("--hero-html-text-opacity", htmlTextOpacity.toFixed(3));
    document.documentElement.style.setProperty("--hero-red-left", `${localRedLeft.toFixed(2)}px`);
    document.documentElement.style.setProperty("--hero-red-top", `${localRedTop.toFixed(2)}px`);
    document.documentElement.style.setProperty("--hero-red-width", `${width.toFixed(2)}px`);
    document.documentElement.style.setProperty("--hero-red-height", `${height.toFixed(2)}px`);
    document.body.dataset.aboutPhotoReady = raw >= 0.995 || scrollY >= aboutTop - 4 ? "true" : "false";
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
};

initHeroAboutTransition();

const initHeroNavTransition = () => {
  const about = document.querySelector("#about");

  if (!about) {
    return;
  }

  const layer = document.createElement("div");
  layer.className = "hero-nav-transition";

  const words = [
    { label: "About me", fromX: 1760, fromY: 65, toX: 1254, toY: 50 },
    { label: "Experience", fromX: 1760, fromY: 106, toX: 1428, toY: 50 },
    { label: "Artworks", fromX: 1760, fromY: 147, toX: 1614, toY: 50 },
    { label: "Contacts", fromX: 1760, fromY: 188, toX: 1768, toY: 50 }
  ];

  const spans = words.map((word) => {
    const span = document.createElement("span");
    span.className = "hero-nav-transition__word";
    span.textContent = word.label;
    layer.appendChild(span);
    return { ...word, element: span };
  });

  document.body.appendChild(layer);

  const update = () => {
    const aboutTop = about.offsetTop;
    const raw = clamp((window.scrollY - 24) / Math.max(aboutTop - 240, 1), 0, 1);
    const eased = easeMove(raw);
    const visible = raw > 0.01 && raw < 0.995;

    layer.style.opacity = visible ? "1" : "0";

    spans.forEach((word, index) => {
      const delay = index * 0.035;
      const itemProgress = clamp((eased - delay) / (1 - delay), 0, 1);
      const x = lerp(word.fromX, word.toX, itemProgress);
      const y = lerp(word.fromY, word.toY, itemProgress);

      word.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
};

initHeroNavTransition();

const initAboutBrandCards = () => {
  const cards = document.querySelectorAll(".about-brand-card");

  if (!cards.length) {
    return;
  }

  const brandSources = Array.from({ length: 27 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return `images/about-brand-${number}.png`;
  });

  const initialSources = [
    "images/about-brand-01.png",
    "images/about-brand-03.png",
    "images/about-brand-08.png",
    "images/about-brand-21.png",
    "images/about-brand-02.png",
    "images/about-brand-13.png",
    "images/about-brand-04.png",
    "images/about-brand-05.png"
  ];

  const pickAvailableBrand = () => {
    const used = new Set(Array.from(cards).map((card) => card.querySelector("img")?.getAttribute("src")));
    const available = brandSources.filter((source) => !used.has(source));

    if (!available.length) {
      return null;
    }

    return available[Math.floor(Math.random() * available.length)];
  };

  cards.forEach((card, index) => {
    const img = card.querySelector("img");
    if (img && initialSources[index]) {
      img.src = initialSources[index];
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const index = Array.from(cards).indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.max(index, 0) * 55}ms`;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  cards.forEach((card) => observer.observe(card));

  window.setInterval(() => {
    const card = cards[Math.floor(Math.random() * cards.length)];
    const img = card?.querySelector("img");
    const nextSource = pickAvailableBrand();

    if (!card || !img || !nextSource) {
      return;
    }

    card.classList.add("is-switching");
    window.setTimeout(() => {
      img.src = nextSource;
      card.classList.remove("is-switching");
    }, 260);
  }, 2200);
};

initAboutBrandCards();

const initArtworksTextCursor = () => {
  const target = document.querySelector(".artworks__grid");
  const root = document.querySelector("#artworks-text-cursor");

  if (!target || !root) {
    return;
  }

  const spacing = 80;
  const maxPoints = 10;
  const removalInterval = 20;
  const exitDuration = 300;
  const text = "ZHUO";
  let trail = [];
  let lastPoint = null;
  let lastMoveTime = 0;
  let removalTimer = 0;
  let id = 0;

  const createRandomData = () => ({
    x: Math.random() * 10 - 5,
    y: Math.random() * 10 - 5,
    rotate: Math.random() * 10 - 5
  });

  const removeItem = (item) => {
    item.element.classList.add("is-exiting");
    item.element.style.transition = "opacity 300ms ease-out, transform 300ms ease-out";
    item.element.style.opacity = "0";
    item.element.style.transform += " scale(0)";
    window.setTimeout(() => item.element.remove(), exitDuration);
  };

  const trimTrail = () => {
    while (trail.length > maxPoints) {
      const item = trail.shift();
      if (item) {
        removeItem(item);
      }
    }
  };

  const addPoint = (x, y, angle) => {
    const random = createRandomData();
    const element = document.createElement("span");
    element.className = "artworks-text-cursor__item";
    element.textContent = text;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.transform = `translate(-50%, -50%) translate(${random.x}px, ${random.y}px) rotate(${angle + random.rotate}deg)`;
    root.appendChild(element);
    trail.push({ id: id++, element });
    trimTrail();
  };

  const clearTrail = () => {
    trail.forEach(removeItem);
    trail = [];
    lastPoint = null;
  };

  const handleMove = (event) => {
    const rect = target.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return;
    }

    root.classList.add("is-visible");
    document.body.classList.add("is-artworks-text-cursor-active");

    if (!lastPoint) {
      lastPoint = { x, y };
      addPoint(x, y, 0);
      lastMoveTime = Date.now();
      return;
    }

    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= spacing) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const steps = Math.floor(distance / spacing);

      for (let index = 1; index <= steps; index += 1) {
        const progress = (spacing * index) / distance;
        addPoint(lastPoint.x + dx * progress, lastPoint.y + dy * progress, angle);
      }

      lastPoint = { x, y };
    }

    lastMoveTime = Date.now();
  };

  const handleLeave = () => {
    root.classList.remove("is-visible");
    document.body.classList.remove("is-artworks-text-cursor-active");
    clearTrail();
  };

  target.addEventListener("mousemove", handleMove);
  target.addEventListener("mouseleave", handleLeave);
  removalTimer = window.setInterval(() => {
    if (Date.now() - lastMoveTime > 100 && trail.length) {
      const item = trail.shift();
      if (item) {
        removeItem(item);
      }
    }
  }, removalInterval);

  window.addEventListener("beforeunload", () => window.clearInterval(removalTimer), { once: true });
};

initArtworksTextCursor();

const initPackagingLightbox = () => {
  const track = document.querySelector(".packaging-scroll__track");
  const lightbox = document.querySelector(".packaging-lightbox");
  const panel = lightbox?.querySelector(".packaging-lightbox__panel");
  const controls = document.createElement("div");
  const prevButton = document.createElement("button");
  const nextButton = document.createElement("button");

  if (!track || !lightbox || !panel) {
    return;
  }

  controls.className = "packaging-lightbox__controls";
  prevButton.className = "packaging-lightbox__arrow packaging-lightbox__arrow--prev";
  nextButton.className = "packaging-lightbox__arrow packaging-lightbox__arrow--next";
  prevButton.type = "button";
  nextButton.type = "button";
  prevButton.setAttribute("aria-label", "Previous packaging detail image");
  nextButton.setAttribute("aria-label", "Next packaging detail image");
  prevButton.textContent = "↑";
  nextButton.textContent = "↓";
  controls.append(prevButton, nextButton);
  lightbox.appendChild(controls);

  const images = Array.from(track.querySelectorAll("img"));
  const detailMap = {
    "01": ["01-card-detail.webp"],
    "04": ["04-card-detail.webp"],
    "09": ["09-card-detail-01.webp", "09-card-detail-02.webp"],
    "12": [
      "12-card-detail-01.png",
      "12-card-detail-02.png",
      "12-card-detail-03.png",
      "12-card-detail-04.png",
      "12-card-detail-05.png",
      "12-card-detail-06.png",
      "12-card-detail-07.png",
      "12-card-detail-08.png",
      "12-card-detail-09.png",
      "12-card-detail-10.png"
    ]
  };
  const getGroupKey = (src) => {
    const fileName = decodeURIComponent(src.split("/").pop().split("?", 1)[0]);
    const match = fileName.match(/^(\d+)-/);
    return match ? match[1] : fileName;
  };
  const imageData = images.map((image) => ({
    key: getGroupKey(image.getAttribute("src") || image.src),
    isTrigger: /hover/i.test(image.getAttribute("src") || image.src)
  }));
  let activeIndex = 0;
  let slideGestureLocked = false;
  let slideGestureTimer = 0;
  let slides = null;
  let slideImages = [];

  const updateSlides = () => {
    if (!slides) {
      return;
    }

    slides.style.transform = `translate3d(0, ${-activeIndex * panel.clientHeight}px, 0)`;
  };

  const goToSlide = (index) => {
    if (!slides || !slideImages.length) {
      return;
    }

    activeIndex = clamp(index, 0, slideImages.length - 1);
    prevButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === slideImages.length - 1;
    updateSlides();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    panel.replaceChildren();
    slides = null;
    slideImages = [];
    activeIndex = 0;
    slideGestureLocked = false;
    window.clearTimeout(slideGestureTimer);
    window.siteLenis?.start?.();
  };

  images.forEach((image, index) => {
    if (!imageData[index]?.isTrigger) {
      return;
    }

    image.classList.add("is-packaging-preview-trigger");
    image.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const key = imageData[index]?.key;
      const group = detailMap[key] || [];
      if (!group.length) {
        return;
      }

      panel.replaceChildren();
      activeIndex = 0;
      slides = document.createElement("div");
      slides.className = "packaging-lightbox__slides";
      slideImages = [];

      group.forEach((fileName, groupIndex) => {
        const slide = document.createElement("div");
        slide.className = "packaging-lightbox__slide";
        const preview = document.createElement("img");
        preview.src = `images-optimized/display/packaging-longpicture/${fileName.replace(imageFilePattern, ".webp")}?v=20260706-viewport-bleed-01`;
        preview.alt = "";
        preview.decoding = "async";
        preview.loading = groupIndex < 2 ? "eager" : "lazy";
        slide.appendChild(preview);
        slides.appendChild(slide);
        slideImages.push(preview);
      });

      panel.appendChild(slides);
      lightbox.hidden = false;
      goToSlide(0);
      window.siteLenis?.stop?.();
    });
  });

  panel.addEventListener("click", (event) => event.stopPropagation());
  controls.addEventListener("click", (event) => event.stopPropagation());
  prevButton.addEventListener("click", () => goToSlide(activeIndex - 1));
  nextButton.addEventListener("click", () => goToSlide(activeIndex + 1));
  panel.addEventListener("wheel", (event) => {
    event.preventDefault();
    event.stopPropagation();

    window.clearTimeout(slideGestureTimer);
    slideGestureTimer = window.setTimeout(() => {
      slideGestureLocked = false;
    }, 260);

    if (Math.abs(event.deltaY) < 8 || slideGestureLocked) {
      return;
    }

    slideGestureLocked = true;
    goToSlide(activeIndex + (event.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  lightbox.addEventListener("click", closeLightbox);
  window.addEventListener("resize", updateSlides);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
};

initPackagingLightbox();

const brandBrandingProjects = [
  {
    title: "OR",
    category: "Shampoo & Conditioner",
    year: "2026",
    externalLink: "",
    basePath: "images/brand-branding/01-project-OR",
    cover: "cover.png",
    media: ["01.png", "02.png", "03.png", "04.png", "05.png", "06.png", "07.png", "08.png", "09.png", "10.png", "11.png", "12.png"]
  },
  {
    title: "illombo",
    category: "Manicure & Body Care & Makeup",
    year: "2021",
    externalLink: "",
    basePath: "images/brand-branding/02-project-illombo",
    cover: "cover.webp",
    media: ["01.webp", "02.webp", "03.webp", "04.webp", "05.webp", "06.webp", "07.webp", "08.webp", "09.webp"]
  },
  {
    title: "illombo upgrate",
    category: "Skin Care",
    year: "2024",
    externalLink: "",
    basePath: "images/brand-branding/03-project-illombo upgrate",
    cover: "cover.png",
    media: ["01.png", "02.png", "03.png", "04.png", "05.png", "06.png", "07.png", "08.png", "09.png", "10.png", "11.png"]
  },
  {
    title: "little freddie",
    category: "Children's Food",
    year: "2022",
    externalLink: "",
    basePath: "images/brand-branding/04-project-little freddie",
    cover: "cover.webp",
    media: ["01.webp", "02.webp", "03.webp", "04.webp", "05.webp", "06.webp", "07.webp"]
  },
  {
    title: "synvia",
    category: "Skin Care",
    year: "2023",
    externalLink: "",
    basePath: "images/brand-branding/05-project-synvia",
    cover: "cover.webp",
    media: ["01.png", "02.png", "03.png", "04.png", "05.png", "06.webp", "07.webp", "08.webp", "09.webp", "10.webp"]
  },
  {
    title: "1939",
    category: "Men's Skin Care & Hair Gel",
    year: "2018",
    externalLink: "",
    basePath: "images/brand-branding/06-project-1939",
    cover: "cover.webp",
    media: ["01.webp", "02.webp", "03.webp"]
  },
  {
    title: "omma",
    category: "Diffuser & Holistic Care",
    year: "2023",
    externalLink: "",
    basePath: "images/brand-branding/07-project-omma",
    cover: "cover.webp",
    media: ["01.webp", "02.webp", "03.webp", "04.webp", "05.webp", "06.webp", "07.webp"]
  },
  {
    title: "heysee",
    category: "Railway Identification System & Vending Machine",
    year: "2022",
    externalLink: "",
    basePath: "images/brand-branding/08-project-heysee",
    cover: "cover.webp",
    media: ["01.jpg", "02.webp", "03.webp", "04.webp"]
  },
  {
    title: "oilfree",
    category: "Skin Care",
    year: "2018",
    externalLink: "",
    basePath: "images/brand-branding/09-project-oilfree",
    cover: "cover.webp",
    media: ["01.webp", "02.webp", "03.webp"]
  },
  {
    title: "蓬余",
    category: "Agricultural Products & Healthy Food",
    year: "2025",
    externalLink: "",
    basePath: "images/brand-branding/10-project-蓬余",
    cover: "cover.png",
    media: ["01.png", "02.png", "03.png", "04.png", "05.png", "06.png", "07.png", "08.png", "09.png", "10.png", "11.png"]
  },
  {
    title: "logo design",
    year: "",
    externalLink: "",
    basePath: "images/brand-branding/12-project-logo design",
    cover: "cover.jpg",
    media: ["01-circleclean.webp", "02-DICKWELL.webp", "03-fangfangfang.webp", "04-HUAXIALINHAI.jpg", "05-careygift.jpg", "06-ZHOUJI noddleshouse.jpg"]
  }
];

const preloadBrandingCovers = () => Promise.all(
  brandBrandingProjects.map((project) => preloadImage(Object.assign(new Image(), {
    src: optimizedImageUrl(`${project.basePath}/${project.cover}`, "thumb")
  })))
);

const parseBrandProjectMd = (text) => {
  const data = {};
  const media = [];
  let readingMedia = false;

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith("- ")) {
      if (readingMedia) {
        media.push(trimmed.slice(2).trim());
      }
      return;
    }

    const splitIndex = trimmed.indexOf(":");
    if (splitIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim();
    readingMedia = key === "detail_media_order";

    if (key && key !== "detail_media_order") {
      data[key] = value;
    }
  });

  if (media.length) {
    data.detail_media_order = media;
  }

  return data;
};

const hydrateBrandBrandingProjects = async () => {
  const hydrated = await Promise.all(
    brandBrandingProjects.map(async (project) => {
      try {
        const response = await fetch(encodeURI(`${project.basePath}/project.md`), { cache: "no-store" });

        if (!response.ok) {
          return project;
        }

        const data = parseBrandProjectMd(await response.text());

        return {
          ...project,
          title: data.title || project.title,
          category: data.category || project.category || "",
          year: data.year || project.year,
          externalLink: data.external_link || project.externalLink,
          cover: data.cover || project.cover,
          media: data.detail_media_order || project.media
        };
      } catch {
        return project;
      }
    })
  );

  brandBrandingProjects.splice(0, brandBrandingProjects.length, ...hydrated);
};

const initBrandBrandingProjects = async () => {
  const root = document.querySelector(".brand-branding-project");
  const names = root?.querySelector(".brand-branding-project__names");
  const cover = root?.querySelector(".brand-branding-project__cover");
  const metaTitle = root?.querySelector(".brand-branding-project__meta h3");
  const metaYear = root?.querySelector(".brand-branding-project__year");
  const metaLink = root?.querySelector(".brand-branding-project__link");
  const detail = document.querySelector(".brand-detail");
  const detailBack = detail?.querySelector(".brand-detail__back");
  const detailTitle = detail?.querySelector(".brand-detail__title");
  const detailCategory = detail?.querySelector(".brand-detail__category");
  const detailInfoYear = detail?.querySelector(".brand-detail__info-year");
  const detailInfoLink = detail?.querySelector(".brand-detail__info-link");
  const detailYear = detail?.querySelector(".brand-detail__year");
  const detailLink = detail?.querySelector(".brand-detail__link");
  const detailMedia = detail?.querySelector(".brand-detail__media");

  if (!root || !names || !cover || !metaTitle || !metaYear || !metaLink || !detail || !detailBack || !detailTitle || !detailCategory || !detailInfoYear || !detailInfoLink || !detailYear || !detailLink || !detailMedia) {
    return;
  }

  await hydrateBrandBrandingProjects();
  root.style.setProperty("--brand-project-count", brandBrandingProjects.length);

  let activeIndex = -1;
  let revealObserver = null;
  let detailMotionFrame = 0;

  const projectUrl = (project, file, variant = "display") => optimizedImageUrl(`${project.basePath}/${file}`, variant);

  const setLink = (link, url) => {
    if (!url) {
      link.hidden = true;
      link.removeAttribute("href");
      return;
    }

    link.hidden = false;
    link.href = url;
  };

  const setActiveProject = (index) => {
    const project = brandBrandingProjects[index];

    if (!project) {
      return;
    }

    if (activeIndex === index && cover.querySelector(".brand-branding-project__cover-img.is-active")) {
      return;
    }

    activeIndex = index;
    names.querySelectorAll(".brand-branding-project__name").forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
    });

    const previous = cover.querySelector(".brand-branding-project__cover-img.is-active");
    const image = document.createElement("img");
    image.className = "brand-branding-project__cover-img";
    image.src = projectUrl(project, project.cover, "thumb");
    image.alt = project.title;
    cover.appendChild(image);

    window.requestAnimationFrame(() => {
      image.classList.add("is-active");
      if (previous) {
        previous.classList.remove("is-active");
        window.setTimeout(() => previous.remove(), 820);
      }
    });

    metaTitle.textContent = project.category || project.title;
    metaYear.textContent = project.year;
    setLink(metaLink, project.externalLink);
  };

  const updateDetailImageMotion = () => {
    detailMotionFrame = 0;

    if (!detail.classList.contains("is-open")) {
      return;
    }

    const detailRect = detail.getBoundingClientRect();
    const centerY = detailRect.top + detailRect.height / 2;
    const range = Math.max(detailRect.height * 0.82, 1);

    detailMedia.querySelectorAll("img").forEach((image) => {
      const rect = image.getBoundingClientRect();
      const imageCenter = rect.top + rect.height / 2;
      const distance = Math.min(Math.abs(imageCenter - centerY) / range, 1);
      const focus = 1 - distance;
      const width = 62 + focus * 38;

      image.style.setProperty("--detail-image-width", `${width.toFixed(2)}%`);
      image.style.zIndex = `${Math.round(focus * 100)}`;
    });
  };

  const requestDetailImageMotion = () => {
    if (detailMotionFrame) {
      return;
    }

    detailMotionFrame = window.requestAnimationFrame(updateDetailImageMotion);
  };

  const normalizeLoopedDetailScroll = () => {
    if (detailMedia.dataset.looped !== "true") {
      return;
    }

    const thirdHeight = detail.scrollHeight / 3;

    if (thirdHeight <= 1) {
      return;
    }

    if (detail.scrollTop < thirdHeight * 0.25) {
      detail.scrollTop += thirdHeight;
      window.requestAnimationFrame(requestDetailImageMotion);
    } else if (detail.scrollTop > thirdHeight * 1.75) {
      detail.scrollTop -= thirdHeight;
      window.requestAnimationFrame(requestDetailImageMotion);
    }
  };

  const revealDetailImages = () => {
    revealObserver?.disconnect();
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadDeferredMedia(entry.target);
            entry.target.classList.add("is-visible");
          }
        });
      },
      {
        root: detail,
        threshold: 0.06,
        rootMargin: "24% 0px 24% 0px"
      }
    );

    detailMedia.querySelectorAll("img").forEach((image, index) => {
      if (detailMedia.dataset.looped === "true" || index < 2) {
        image.classList.add("is-visible");
      }
      revealObserver.observe(image);
    });
    requestDetailImageMotion();
  };

  const openDetail = async (index) => {
    const project = brandBrandingProjects[index];

    if (!project) {
      return;
    }

    setLoaderVisible(true, "brand");
    const mediaUrls = project.media.map((file) => projectUrl(project, file, "display"));
    await Promise.all([
      Promise.race([
        Promise.all(mediaUrls.map((src) => preloadImage(Object.assign(new Image(), {
          src
        })))),
        sleep(1600)
      ]),
      sleep(520)
    ]);

    detailTitle.textContent = project.title;
    detailCategory.textContent = project.category || project.title;
    detailInfoYear.textContent = project.year;
    setLink(detailInfoLink, project.externalLink);
    detailYear.textContent = project.year;
    detail.classList.toggle("popup-detail--video-pair", project.title === "OR水境愈所」上海站");
    setLink(detailLink, project.externalLink);
    detailMedia.replaceChildren();
    detailMedia.dataset.looped = "true";
    const originalMediaLength = mediaUrls.length;
    const files = [...mediaUrls, ...mediaUrls, ...mediaUrls];
    const loopedImages = [];

    files.forEach((src) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = project.title;
      image.loading = "eager";
      image.decoding = "async";
      image.classList.add("is-visible");
      detailMedia.appendChild(image);
      loopedImages.push(image);
    });

    detail.hidden = false;
    detail.scrollTop = 0;
    document.body.classList.add("brand-detail-open");
    window.siteLenis?.stop?.();
    window.requestAnimationFrame(() => {
      detail.classList.add("is-open");
      revealDetailImages();
      Promise.all(loopedImages.slice(originalMediaLength, originalMediaLength + 3).map((image) => image.decode?.().catch(() => {}) || Promise.resolve())).finally(() => {
        window.requestAnimationFrame(() => {
          detail.scrollTop = detail.scrollHeight / 3;
          requestDetailImageMotion();
        });
      });
    });
    setLoaderVisible(false);
  };

  const closeDetail = () => {
    detail.classList.remove("is-open");
    detail.classList.remove("popup-detail--video-pair");
    document.body.classList.remove("brand-detail-open");
    window.siteLenis?.start?.();
    window.setTimeout(() => {
      revealObserver?.disconnect();
      detailMedia.replaceChildren();
      detail.hidden = true;
      jumpToBrandingSectionTop();
      window.requestAnimationFrame(jumpToBrandingSectionTop);
    }, 430);
  };

  brandBrandingProjects.forEach((project, index) => {
    const button = document.createElement("button");
    button.className = "brand-branding-project__name";
    button.type = "button";
    button.textContent = project.title;
    button.addEventListener("mouseenter", () => setActiveProject(index));
    button.addEventListener("focus", () => setActiveProject(index));
    button.addEventListener("click", () => {
      setActiveProject(index);
      openDetail(index);
    });
    names.appendChild(button);
  });

  cover.addEventListener("click", () => openDetail(activeIndex));
  cover.style.cursor = "pointer";
  detailBack.addEventListener("click", closeDetail);
  detail.addEventListener("click", (event) => {
    if (event.target === detail) {
      closeDetail();
    }
  });
  detail.addEventListener(
    "wheel",
    (event) => {
      if (!detail.classList.contains("is-open")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      detail.scrollTop += event.deltaY;
      normalizeLoopedDetailScroll();
      requestDetailImageMotion();
    },
    { passive: false }
  );
  detail.addEventListener("scroll", () => {
    normalizeLoopedDetailScroll();
    requestDetailImageMotion();
  }, { passive: true });
  window.addEventListener("resize", requestDetailImageMotion);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detail.classList.contains("is-open")) {
      closeDetail();
    }
  });

  const updateProjectFromScroll = () => {
    const rect = root.getBoundingClientRect();
    const scrollable = Math.max(root.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / scrollable, 0, 1);
    const index = Math.min(brandBrandingProjects.length - 1, Math.floor(progress * brandBrandingProjects.length));

    if (rect.top <= 1 && rect.bottom >= window.innerHeight - 1) {
      setActiveProject(index);
    }
  };

  window.addEventListener("scroll", updateProjectFromScroll, { passive: true });
  window.addEventListener("resize", updateProjectFromScroll);
  setActiveProject(0);
  updateProjectFromScroll();
};

initBrandBrandingProjects();

const popupProjects = [
  {
    title: "111skin Spa sharing activity",
    year: "",
    externalLink: "",
    basePath: "images/popup/111skin Spa sharing activity",
    cover: "cover-01.jpg",
    media: ["01.jpg", "02.jpg", "03.jpg", "04.jpg", "05.jpg", "06.jpg"]
  },
  {
    title: "BAZZAR BEAUTY AWARD 2023 — ARgENTUM欧臻廷",
    year: "",
    externalLink: "",
    basePath: "images/popup/BAZZAR BEAUTY AWARD 2023 — ARgENTUM欧臻廷",
    cover: "cover.JPG",
    media: ["01.JPG", "02.JPG", "03.JPG", "04.JPG", "05.JPG", "06.JPG"]
  },
  {
    title: "BULK HOMME pop-up NANJINGXI road",
    year: "",
    externalLink: "",
    basePath: "images/popup/BULK HOMME pop-up NANJINGXI road",
    cover: "cover.JPG",
    media: ["01.JPG", "02.JPG", "03.JPG", "04.JPG", "05.JPG", "06.JPG", "07.JPG"]
  },
  {
    title: "OR spring limited pop-up store - HANGZHOU botanical garden",
    year: "",
    externalLink: "",
    basePath: "images/popup/OR spring limited pop-up store - HANGZHOU botanical garden",
    cover: "cover.png",
    media: ["01.png", "02.png", "03.png", "04.png", "05.png", "06.png"]
  },
  {
    title: "OR水境愈所」上海站",
    year: "",
    externalLink: "",
    basePath: "images/popup/OR水境愈所」上海站",
    cover: "cover.JPG",
    media: ["在愚园路1018号，赴一场与水的私晤 - OffRelax.mp4", "水境愈所｜全新限时空间 静候启幕 - OffRelax.mp4"]
  }
];

const hydratePopupProjects = async () => {
  const hydrated = await Promise.all(
    popupProjects.map(async (project) => {
      try {
        const response = await fetch(encodeURI(`${project.basePath}/project.md`), { cache: "no-store" });

        if (!response.ok) {
          return project;
        }

        const data = parseBrandProjectMd(await response.text());

        return {
          ...project,
          title: data.title || project.title,
          year: data.year || project.year,
          externalLink: data.external_link || project.externalLink,
          cover: data.cover || project.cover,
          media: data.detail_media_order || project.media
        };
      } catch {
        return project;
      }
    })
  );

  popupProjects.splice(0, popupProjects.length, ...hydrated);
};

const initPopupProjects = async () => {
  const root = document.querySelector(".popup-project");
  const names = root?.querySelector(".popup-project__names");
  const stage = root?.querySelector(".popup-project__stage");
  const hoverImage = root?.querySelector(".popup-project__hover-image");
  const detail = document.querySelector(".popup-detail");
  const detailBack = detail?.querySelector(".popup-detail__back");
  const detailTitle = detail?.querySelector(".popup-detail__title");
  const detailCounter = detail?.querySelector(".popup-detail__counter");
  const detailYear = detail?.querySelector(".popup-detail__year");
  const detailLink = detail?.querySelector(".popup-detail__link");
  const detailMedia = detail?.querySelector(".popup-detail__media");

  if (!root || !names || !stage || !hoverImage || !detail || !detailBack || !detailTitle || !detailCounter || !detailYear || !detailLink || !detailMedia) {
    return;
  }

  await hydratePopupProjects();

  let detailSpreads = [];
  let detailDeferredMedia = [];
  const isVideo = (file) => /\.(mp4|webm|mov|m4v)$/i.test(file);
  const projectUrl = (project, file, variant = "display") => {
    const path = `${project.basePath}/${file}`;

    return isVideo(file) ? encodeURI(path) : optimizedImageUrl(path, variant);
  };

  const setLink = (link, url) => {
    if (!url) {
      link.hidden = true;
      link.removeAttribute("href");
      return;
    }

    link.hidden = false;
    link.href = url;
  };

  const updateDetailCounter = () => {
    const total = detailSpreads.length || 1;
    const center = detailMedia.scrollLeft + detailMedia.clientWidth / 2;
    let active = 0;
    let minDistance = Infinity;

    detailSpreads.forEach((spread, index) => {
      const spreadCenter = spread.offsetLeft + spread.offsetWidth / 2;
      const distance = Math.abs(spreadCenter - center);

      if (distance < minDistance) {
        minDistance = distance;
        active = index;
      }
    });

    detailCounter.textContent = `${active + 1}/${total}`;
  };

  const openDetail = (index) => {
    const project = popupProjects[index];

    if (!project) {
      return;
    }

    detailTitle.textContent = project.title;
    detailYear.textContent = project.year;
    setLink(detailLink, project.externalLink);
    detailMedia.replaceChildren();
    detailSpreads = [];
    detailDeferredMedia = [];

    project.media.forEach((file, mediaIndex) => {
      const spread = document.createElement("figure");
      spread.className = "popup-detail__spread";
      if (project.title === "OR水境愈所」上海站") {
        spread.classList.add("popup-detail__spread--video-pair");
      }
      if (mediaIndex % 5 === 0) {
        spread.classList.add("popup-detail__spread--wide");
      } else if (mediaIndex % 5 === 1 || mediaIndex % 5 === 4) {
        spread.classList.add("popup-detail__spread--narrow");
      }
      if (mediaIndex % 4 === 2) {
        spread.classList.add("popup-detail__spread--offset");
      }

      const media = isVideo(file) ? document.createElement("video") : document.createElement("img");
      media.dataset.src = projectUrl(project, file);

      if (isVideo(file)) {
        media.preload = "metadata";
        media.muted = true;
        media.loop = true;
        media.playsInline = true;
        media.autoplay = true;
        media.controls = true;
      } else {
        media.alt = project.title;
        media.loading = mediaIndex < 2 ? "eager" : "lazy";
        media.decoding = "async";
      }

      if (mediaIndex < 2) {
        loadDeferredMedia(media);
      } else {
        detailDeferredMedia.push({ media, spread });
      }

      spread.appendChild(media);
      detailMedia.appendChild(spread);
      detailSpreads.push(spread);
    });

    detail.hidden = false;
    detail.scrollTop = 0;
    detailMedia.scrollLeft = 0;
    document.body.classList.add("popup-detail-open");
    window.siteLenis?.stop?.();
    window.requestAnimationFrame(() => {
      detail.classList.add("is-open");
      detailMedia.scrollLeft = 0;
      updateDetailCounter();
    });
  };

  const closeDetail = () => {
    detail.classList.remove("is-open");
    document.body.classList.remove("popup-detail-open");
    window.siteLenis?.start?.();
    window.setTimeout(() => {
      detailMedia.replaceChildren();
      detailSpreads = [];
      detailDeferredMedia = [];
      detail.hidden = true;
      jumpToTargetWithoutSmooth("#artworks-popup");
      updateActiveSection();
    }, 430);
  };

  popupProjects.forEach((project, index) => {
    const button = document.createElement("button");
    button.className = `popup-project__item popup-project__item--${index + 1}`;
    button.type = "button";
    button.innerHTML = "";

    const image = document.createElement("img");
    image.className = "popup-project__item-media";
    image.src = projectUrl(project, project.cover, "thumb");
    image.alt = project.title;
    image.decoding = "async";

    const title = document.createElement("div");
    title.className = "popup-project__item-title";
    title.textContent = project.title;

    button.append(image, title);
    const setHoverBackground = () => {
      hoverImage.src = projectUrl(project, project.cover, "display");
      stage.classList.add("is-hovering");
    };
    const moveHoverBackground = (event) => {
      const rect = image.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100, 0, 100);
      const y = clamp(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100, 0, 100);
      const panX = ((50 - x) / 50) * 520;
      const panY = ((50 - y) / 50) * 380;

      root.style.setProperty("--popup-hover-pan-x", `${panX.toFixed(2)}px`);
      root.style.setProperty("--popup-hover-pan-y", `${panY.toFixed(2)}px`);
    };
    const clearHoverBackground = () => {
      stage.classList.remove("is-hovering");
      hoverImage.removeAttribute("src");
      root.style.removeProperty("--popup-hover-pan-x");
      root.style.removeProperty("--popup-hover-pan-y");
    };

    button.addEventListener("mouseenter", setHoverBackground);
    button.addEventListener("focus", setHoverBackground);
    button.addEventListener("mousemove", moveHoverBackground);
    button.addEventListener("mouseleave", clearHoverBackground);
    button.addEventListener("blur", clearHoverBackground);
    button.addEventListener("click", () => openDetail(index));
    names.appendChild(button);
  });

  detailBack.addEventListener("click", closeDetail);
  detail.addEventListener("click", (event) => {
    if (event.target === detail) {
      closeDetail();
    }
  });
  detail.addEventListener(
    "wheel",
    (event) => {
      if (!detail.classList.contains("is-open")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      detailMedia.scrollLeft += event.deltaY * 1.35;
      updateDetailCounter();
    },
    { passive: false }
  );
  detailMedia.addEventListener("scroll", updateDetailCounter, { passive: true });
  detailMedia.addEventListener("scroll", () => {
    const preloadLeft = detailMedia.scrollLeft + detailMedia.clientWidth * 1.8;

    detailDeferredMedia = detailDeferredMedia.filter(({ media, spread }) => {
      if (spread.offsetLeft < preloadLeft) {
        loadDeferredMedia(media);
        return false;
      }

      return true;
    });
  }, { passive: true });
  window.addEventListener(
    "wheel",
    (event) => {
      if (detail.classList.contains("is-open") || event.deltaY <= 0) {
        return;
      }

      const rect = root.getBoundingClientRect();
      const isLocked = Math.abs(rect.top) < 4;

      if (!isLocked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    { passive: false, capture: true }
  );
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detail.classList.contains("is-open")) {
      closeDetail();
    }
  });
};

initPopupProjects();
initStaticMediaLoading();

const initSectionScrollLocks = () => {
  const brand = document.querySelector("#artworks-brand-branding");
  const popup = document.querySelector("#artworks-popup");

  if (!brand || !popup) {
    return;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      const detailOpen = document.body.classList.contains("brand-detail-open") || document.body.classList.contains("popup-detail-open");

      if (detailOpen) {
        return;
      }

      const viewportBottom = window.scrollY + window.innerHeight;
      const brandTop = pageTop(brand);
      const brandBottom = brandTop + brand.offsetHeight;
      const popupTop = pageTop(popup);
      const popupBottom = popupTop + popup.offsetHeight;
      const threshold = 18;
      const brandAtTop = window.scrollY <= brandTop + threshold && viewportBottom > brandTop + threshold;
      const brandAtBottom = viewportBottom >= brandBottom - threshold && window.scrollY < brandBottom - threshold;
      const popupAtTop = window.scrollY <= popupTop + threshold && viewportBottom > popupTop + threshold;
      const popupAtBottom = viewportBottom >= popupBottom - threshold && window.scrollY < popupBottom - threshold;
      const locksPreviousSection = event.deltaY < 0 && (brandAtTop || popupAtTop);
      const locksNextSection = event.deltaY > 0 && (brandAtBottom || popupAtBottom);

      if (locksPreviousSection || locksNextSection) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { passive: false, capture: true }
  );
};

initSectionScrollLocks();

const initSpecialProjectIdle = () => {
  const special = document.querySelector(".special-project");

  if (!special) {
    return;
  }

  const video = special.querySelector(".special-project__stage video");
  const playButton = special.querySelector(".special-project__control--play");
  const backButton = special.querySelector(".special-project__control--back");
  const forwardButton = special.querySelector(".special-project__control--forward");
  const muteButton = special.querySelector(".special-project__control--mute");
  let idleTimer;

  const updateVideoControls = () => {
    const playLabel = playButton?.querySelector("em");
    const playIcon = playButton?.querySelector("span");
    const muteLabel = muteButton?.querySelector("em");
    const muteIcon = muteButton?.querySelector("span");

    if (playLabel && playIcon && video) {
      playLabel.textContent = video.paused ? "PLAY" : "PAUSE";
      playIcon.textContent = video.paused ? "▶" : "Ⅱ";
    }

    if (muteLabel && muteIcon && video) {
      muteLabel.textContent = video.muted ? "MUTED" : "VOLUME";
      muteIcon.textContent = video.muted ? "◌" : "●";
    }
  };

  const toggleVideo = () => {
    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    updateVideoControls();
  };

  const seekVideo = (event, offset) => {
    event.preventDefault();
    event.stopPropagation();

    if (!video) {
      return;
    }

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    const rawTime = video.currentTime + offset;
    const maxTime = duration === null ? rawTime : Math.max(0, duration - 0.08);
    video.currentTime = duration === null ? Math.max(0, rawTime) : clamp(rawTime, 0, maxTime);
    updateVideoControls();
  };

  const muteIfAudible = () => {
    if (!video || video.paused || video.muted || video.volume <= 0) {
      return;
    }

    video.muted = true;
    updateVideoControls();
  };

  const muteWhenVideoLeavesView = () => {
    if (!video) {
      return;
    }

    const rect = video.getBoundingClientRect();
    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;

    if (!isVisible) {
      muteIfAudible();
    }
  };

  const showOverlay = () => {
    special.classList.remove("is-idle");
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      special.classList.add("is-idle");
    }, 1000);
  };

  special.addEventListener("mousemove", showOverlay, { passive: true });
  special.addEventListener("pointermove", showOverlay, { passive: true });
  special.addEventListener("wheel", showOverlay, { passive: true });
  special.addEventListener("touchstart", showOverlay, { passive: true });
  special.addEventListener("scroll", () => {
    if (!document.body.classList.contains("special-project-open")) {
      return;
    }

    if (specialProjectScrollFrame) {
      return;
    }

    specialProjectScrollFrame = window.requestAnimationFrame(() => {
      specialProjectScrollFrame = 0;
      updateActiveSection();
    });
  }, { passive: true });
  special.addEventListener("mouseleave", () => {
    special.classList.add("is-idle");
  });

  video?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleVideo();
  });
  video?.addEventListener("play", updateVideoControls);
  video?.addEventListener("pause", updateVideoControls);
  playButton?.addEventListener("click", toggleVideo);
  backButton?.addEventListener("click", (event) => seekVideo(event, -5));
  forwardButton?.addEventListener("click", (event) => seekVideo(event, 5));
  muteButton?.addEventListener("click", () => {
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    updateVideoControls();
  });
  window.addEventListener("scroll", muteWhenVideoLeavesView, { passive: true });
  window.addEventListener("resize", muteWhenVideoLeavesView, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      muteIfAudible();
    }
  });
  window.addEventListener("pagehide", muteIfAudible);

  updateVideoControls();
  showOverlay();
};

initSpecialProjectIdle();

const initSpecialProjectGallery = () => {
  const gallery = document.querySelector(".special-project__gallery");

  if (!gallery) {
    return;
  }

  let isDragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  gallery.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      const maxScrollLeft = gallery.scrollWidth - gallery.clientWidth;
      const nextScrollLeft = clamp(gallery.scrollLeft + event.deltaY * 1.25, 0, maxScrollLeft);
      const canMoveHorizontally = Math.abs(nextScrollLeft - gallery.scrollLeft) > 0.5;

      if (!canMoveHorizontally) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      gallery.scrollLeft = nextScrollLeft;
    },
    { passive: false }
  );

  gallery.addEventListener("pointerdown", (event) => {
    isDragging = true;
    dragStartX = event.clientX;
    dragStartScroll = gallery.scrollLeft;
    gallery.setPointerCapture?.(event.pointerId);
  });

  gallery.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    gallery.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
  });

  const stopDragging = (event) => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    gallery.releasePointerCapture?.(event.pointerId);
  };

  gallery.addEventListener("pointerup", stopDragging);
  gallery.addEventListener("pointercancel", stopDragging);
  gallery.addEventListener("pointerleave", stopDragging);
};

initSpecialProjectGallery();

const initSpecialProjectWheelBridge = () => {
  const special = document.querySelector("#artworks-special");
  const gallery = document.querySelector(".special-project__gallery");

  if (!special) {
    return;
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (!document.body.classList.contains("special-project-open")) {
        return;
      }

      if (gallery) {
        const rect = gallery.getBoundingClientRect();
        const viewportHeight = special.clientHeight || window.innerHeight;
        const galleryTargetTop = viewportHeight * 0.66 - 60;
        const isOverGallery = event.target.closest(".special-project__gallery");
        const canScrollGallery = gallery.scrollWidth > gallery.clientWidth + 2;
        const maxScrollLeft = gallery.scrollWidth - gallery.clientWidth;
        const nextScrollLeft = clamp(gallery.scrollLeft + event.deltaY * 1.25, 0, maxScrollLeft);
        const canMoveHorizontally = Math.abs(nextScrollLeft - gallery.scrollLeft) > 0.5;

        if (isOverGallery && canScrollGallery && canMoveHorizontally) {
          event.preventDefault();
          event.stopPropagation();
          gallery.scrollLeft = nextScrollLeft;
          return;
        }

        if (event.deltaY > 0 && canScrollGallery && canMoveHorizontally && rect.top > galleryTargetTop) {
          event.preventDefault();
          event.stopPropagation();
          const targetScrollTop = clamp(gallery.offsetTop - galleryTargetTop, 0, special.scrollHeight - special.clientHeight);
          special.scrollTop = clamp(special.scrollTop + event.deltaY, 0, targetScrollTop);
          updateActiveSection();
          return;
        }
      }

      const maxScrollTop = special.scrollHeight - special.clientHeight;
      const nextScrollTop = clamp(special.scrollTop + event.deltaY, 0, maxScrollTop);

      if (Math.abs(nextScrollTop - special.scrollTop) > 0.5) {
        event.preventDefault();
        event.stopPropagation();
        special.scrollTop = nextScrollTop;
        updateActiveSection();
      }
    },
    { passive: false, capture: true }
  );
};

initSpecialProjectWheelBridge();

document.querySelectorAll(".global-nav").forEach((nav) => {
  nav.querySelectorAll(".section-nav__links a, .section-nav__home").forEach((link) => {
    link.addEventListener("mouseenter", () => nav.classList.add("nav-hover"));
    link.addEventListener("mouseleave", () => nav.classList.remove("nav-hover"));
  });
});

const burstNavParticles = (element, point) => {
  const rect = element.getBoundingClientRect();
  const stageScale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stage-scale")) || 1;
  const centerX = (point?.x ?? rect.left + rect.width / 2) / stageScale;
  const centerY = (point?.y ?? rect.top + rect.height / 2) / stageScale;
  const count = 10;
  const radius = 105;

  document.body.classList.add("is-click-sparking");
  window.setTimeout(() => document.body.classList.remove("is-click-sparking"), 430);

  for (let index = 0; index < count; index += 1) {
    const angle = ((Math.PI * 2) / count) * index;
    const particle = document.createElement("span");

    particle.className = "nav-gooey-particle";
    particle.style.setProperty("--particle-x", `${centerX.toFixed(2)}px`);
    particle.style.setProperty("--particle-y", `${centerY.toFixed(2)}px`);
    particle.style.setProperty("--particle-end-x", `${(Math.cos(angle) * radius).toFixed(2)}px`);
    particle.style.setProperty("--particle-end-y", `${(Math.sin(angle) * radius).toFixed(2)}px`);
    particle.style.setProperty("--particle-angle", `${(angle * 180 / Math.PI + 90).toFixed(2)}deg`);
    particle.style.setProperty("--particle-time", "400ms");
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), 430);
  }
};

document.addEventListener("click", (event) => {
  const clickable = event.target.closest([
    'a[href]',
    "button",
    '[role="button"]',
    ".project-card",
    ".brand-branding-project__cover",
    ".brand-branding-project__name",
    ".popup-project__item",
    ".special-project__video",
    ".special-project__gallery",
    ".special-project__control",
    ".is-packaging-preview-trigger"
  ].join(", "));

  if (!clickable || clickable.disabled || clickable.closest(".route-loader, #fluid-glass-root")) {
    return;
  }

  burstNavParticles(clickable, { x: event.clientX, y: event.clientY });
}, true);
