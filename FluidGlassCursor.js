import React, { useEffect, useRef } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import html2canvas from "https://esm.sh/html2canvas@1.4.1";

const e = React.createElement;

function FluidGlass({ lensProps = {} }) {
  return e(FluidPointer, { lensProps });
}

function FluidPointer() {
  const ref = useRef(null);
  const captureRef = useRef(null);
  const target = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const current = useRef({ x: target.current.x, y: target.current.y });

  useEffect(() => {
    const radius = 66;
    const scale = 1.18;
    const captureScale = Math.min(window.devicePixelRatio || 1, 1.35);
    let captureImage = "";
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let isCapturing = false;
    let captureQueued = true;
    let lastCaptureAt = 0;
    let isScrollPaused = false;
    let scrollResumeTimer;
    let lastStageScale = 0;
    let hasPointerPosition = false;
    const captureInterval = 280;
    const getStageScale = () => {
      const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stage-scale"));
      return Number.isFinite(value) && value > 0 ? value : 1;
    };

    const canCapture = () => {
      const root = document.querySelector("#fluid-glass-root");
      return root && getComputedStyle(root).display !== "none" && !document.body.classList.contains("is-route-loading");
    };

    const captureViewport = async () => {
      if (isCapturing) {
        captureQueued = true;
        return;
      }

      if (!canCapture()) {
        captureQueued = true;
        lastCaptureAt = performance.now();
        return;
      }

      isCapturing = true;
      captureQueued = false;

      try {
        const stageScale = getStageScale();
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        const logicalWidth = viewportWidth / stageScale;
        const logicalHeight = viewportHeight / stageScale;
        const canvas = await html2canvas(document.body, {
          backgroundColor: null,
          imageTimeout: 0,
          logging: false,
          scale: captureScale,
          useCORS: true,
          width: logicalWidth,
          height: logicalHeight,
          windowWidth: logicalWidth,
          windowHeight: logicalHeight,
          scrollX: -window.scrollX / stageScale,
          scrollY: -window.scrollY / stageScale,
          onclone: (clonedDocument) => {
            clonedDocument.documentElement.style.setProperty("--stage-scale", "1");
            clonedDocument.body.style.zoom = "1";
          },
          ignoreElements: (element) => element.id === "fluid-glass-root" || element.classList?.contains("packaging-project")
        });

        captureImage = canvas.toDataURL("image/png");
        lastCaptureAt = performance.now();
      } catch (error) {
        captureImage = "";
      } finally {
        isCapturing = false;
      }
    };

    const queueCapture = () => {
      captureQueued = true;
    };

    const onPointerMove = (event) => {
      target.current.x = event.clientX;
      target.current.y = event.clientY;

      if (!hasPointerPosition) {
        hasPointerPosition = true;
        current.current.x = event.clientX;
        current.current.y = event.clientY;
      }

      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const isOverNav = Boolean(hit?.closest(".global-nav, .section-nav, .hero-local-nav"));
      document.body.classList.toggle("is-glass-over-nav", isOverNav);
    };

    const onViewportChange = () => {
      queueCapture();
    };

    const onRouteLoaderHidden = () => {
      lastCaptureAt = 0;
      queueCapture();
    };

    const onSpecialProjectOpen = () => {
      lastCaptureAt = 0;
      queueCapture();
    };

    const update = () => {
      current.current.x += (target.current.x - current.current.x) * 0.58;
      current.current.y += (target.current.y - current.current.y) * 0.58;

      const stageScale = getStageScale();

      if (ref.current) {
        const x = current.current.x / stageScale;
        const y = current.current.y / stageScale;

        if (stageScale !== lastStageScale) {
          lastStageScale = stageScale;
          ref.current.style.width = `${132 / stageScale}px`;
          ref.current.style.height = `${132 / stageScale}px`;
        }

        ref.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }

      if (captureRef.current && captureImage) {
        const logicalPointerX = current.current.x / stageScale;
        const logicalPointerY = current.current.y / stageScale;
        const logicalViewportWidth = viewportWidth / stageScale;
        const logicalViewportHeight = viewportHeight / stageScale;
        const lensRadius = radius / stageScale;
        const backgroundWidth = logicalViewportWidth * scale;
        const backgroundHeight = logicalViewportHeight * scale;
        const x = lensRadius - logicalPointerX * scale;
        const y = lensRadius - logicalPointerY * scale;
        captureRef.current.style.backgroundImage = `url("${captureImage}")`;
        captureRef.current.style.backgroundSize = `${backgroundWidth.toFixed(2)}px ${backgroundHeight.toFixed(2)}px`;
        captureRef.current.style.backgroundPosition = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      }

      if (captureQueued && !isCapturing && !isScrollPaused && performance.now() - lastCaptureAt > captureInterval) {
        void captureViewport();
      }

      requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    const onScroll = () => {
      isScrollPaused = true;
      window.clearTimeout(scrollResumeTimer);
      scrollResumeTimer = window.setTimeout(() => {
        isScrollPaused = false;
        queueCapture();
      }, 1000);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("route-loader-hidden", onRouteLoaderHidden);
    window.addEventListener("special-project-open", onSpecialProjectOpen);
    void captureViewport();
    update();

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("route-loader-hidden", onRouteLoaderHidden);
      window.removeEventListener("special-project-open", onSpecialProjectOpen);
      window.clearTimeout(scrollResumeTimer);
      document.body.classList.remove("is-glass-over-nav");
    };
  }, []);

  return e("div", { className: "fluid-glass-pointer", ref }, e("div", { className: "fluid-glass-capture", ref: captureRef }));
}

const rootElement = document.querySelector("#fluid-glass-root");

if (rootElement) {
  createRoot(rootElement).render(
    e(FluidGlass, {
      lensProps: {
        scale: 0.25,
        ior: 1.15,
        thickness: 5,
        chromaticAberration: 0.1,
        anisotropy: 0.01
      }
    })
  );
}
