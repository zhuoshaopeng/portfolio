import Lenis from "https://esm.sh/lenis@1.1.20";

const projectCards = Array.from(document.querySelectorAll(".project-card"));
const experienceCards = Array.from(document.querySelectorAll(".experience-stack__card"));
const experienceSettledCards = Array.from(document.querySelectorAll(".experience-settled__card"));
const experience = document.querySelector("#experience");
const experienceImage = document.querySelector(".experience__image");
const packagingScroll = document.querySelector(".packaging-scroll");
const packagingTrack = document.querySelector(".packaging-scroll__track");
const packagingImages = Array.from(document.querySelectorAll(".packaging-scroll__track img"));

const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 2,
    infinite: false,
    wheelMultiplier: 1,
    lerp: 0.125,
    syncTouch: true,
    syncTouchLerp: 0.075
  });

window.siteLenis = lenis;

if (projectCards.length || experienceCards.length || packagingScroll) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const progress = (value, start, end) => {
    if (value < start) return 0;
    if (value > end) return 1;
    return (value - start) / (end - start);
  };
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
  const stageScale = () => {
    const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stage-scale"));
    return Number.isFinite(value) && value > 0 ? value : 1;
  };
  const logicalScrollY = () => window.scrollY / stageScale();
  const logicalViewportWidth = () => window.innerWidth / stageScale();
  const logicalViewportHeight = () => window.innerHeight / stageScale();

  experienceCards.forEach((card) => {
    card.style.transformOrigin = "top center";
    card.style.backfaceVisibility = "hidden";
    card.style.willChange = "transform, filter";
  });

  const updateExperienceCards = () => {
    if (!experienceCards.length || !experience) {
      return;
    }

    const localScroll = logicalScrollY() - experience.offsetTop;
    const cardStart = 28;
    const cardEnter = 360;
    const cardHold = 240;
    const firstCardExtraHold = 760;
    const cardGap = cardEnter + cardHold;
    const finalStart = cardStart + firstCardExtraHold + (experienceCards.length - 1) * cardGap + cardEnter + 20;
    const finalMorph = progress(localScroll, finalStart, finalStart + 360);
    const smallReveal = finalMorph >= 1 ? 1 : 0;
    const baseStackY = 0;
    const stackOffset = 20;
    const firstCompleteY = 0;
    const smallTop = 630;
    const previewY = smallTop - 134;
    const smallScale = 0.225;
    const previewTargets = [
      { x: -708, y: previewY, scale: smallScale },
      { x: -370, y: previewY, scale: smallScale },
      { x: -34, y: previewY, scale: smallScale },
      { x: 302, y: previewY, scale: smallScale },
      { x: 639, y: previewY, scale: smallScale }
    ];
    const settledTargets = [
      { x: 0, y: 0 },
      { x: 333, y: 0 },
      { x: 666, y: 0 },
      { x: 999, y: 0 },
      { x: 1332, y: 0 }
    ];

    experienceCards.forEach((card, index) => {
      const start = cardStart + index * cardGap + (index > 0 ? firstCardExtraHold : 0);
      const enterEnd = start + cardEnter;
      const cardProgress = progress(localScroll, start, enterEnd);
      const hasEntered = localScroll >= start;
      const startY = 720;
      let stackedY = index === 0 ? firstCompleteY : baseStackY + index * stackOffset;

      let x = 0;
      let y = stackedY + (1 - cardProgress) * startY;
      let scale = 1;
      let opacity = hasEntered && smallReveal < 1 ? 1 : 0;

      if (finalMorph > 0) {
        const target = previewTargets[index];
        const fanIn = easeOutCubic(finalMorph);
        x = target.x * fanIn;
        y = stackedY + (target.y - stackedY) * fanIn;
        scale = 1 - (1 - target.scale) * fanIn;
      }

      card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = "";
      card.style.zIndex = `${index + 1}`;
    });

    if (experienceImage) {
      experienceImage.style.transform = `translate3d(0, ${(-520 * finalMorph).toFixed(2)}px, 0)`;
    }

    experienceSettledCards.forEach((card, index) => {
      const target = settledTargets[index] || { x: 0, y: 0 };
      const opacity = smallReveal >= 1 ? 1 : 0;

      card.style.opacity = opacity.toFixed(3);
      card.style.transform = `translate3d(${target.x.toFixed(2)}px, ${target.y.toFixed(2)}px, 0) scale(${smallScale})`;
      card.style.zIndex = `${30 + index}`;
    });
  };

  const updatePackagingScroll = () => {
    if (!packagingScroll || !packagingTrack || !packagingImages.length) {
      return;
    }

    const trackWidth = packagingTrack.scrollWidth;
    const maxTranslate = Math.max(trackWidth - logicalViewportWidth(), 0);
    const wheelSpeedRatio = 1.8;
    const scrollDistance = maxTranslate / wheelSpeedRatio;
    packagingScroll.style.height = `${Math.max(logicalViewportHeight(), logicalViewportHeight() + scrollDistance)}px`;

    const rect = packagingScroll.getBoundingClientRect();
    const scrollRange = Math.max(packagingScroll.offsetHeight - logicalViewportHeight(), 1);
    const localProgress = clamp((-rect.top / stageScale()) / scrollRange, 0, 1);
    const translateX = -maxTranslate * localProgress;

    packagingTrack.style.transform = `translate3d(${translateX.toFixed(2)}px, 0, 0)`;
  };

  const updateCards = () => {
    updateExperienceCards();
    updatePackagingScroll();
  };
  let cardsFrame = 0;
  const requestCardsUpdate = () => {
    if (cardsFrame) {
      return;
    }

    cardsFrame = requestAnimationFrame(() => {
      cardsFrame = 0;
      updateCards();
    });
  };

  lenis.on("scroll", requestCardsUpdate);
  window.addEventListener("scroll", requestCardsUpdate, { passive: true });
  window.addEventListener("resize", requestCardsUpdate);

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };

  updateCards();
  requestAnimationFrame(raf);
}
