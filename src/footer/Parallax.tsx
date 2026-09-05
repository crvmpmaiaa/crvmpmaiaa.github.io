"use client";
import { useEffect } from "react";

/** As the footer scrolls into view its layers move at different rates: title slowest, form, then Atlas fastest. */
export function FooterParallax() {
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".footer");
    if (!footer) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const layers: [string, number][] = [[".footer__title", 40], [".footer__form", 80], [".footer__atlas", 140], [".footer__foot", 20]];
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = footer.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the footer's top reaches the bottom of the viewport, 1 when it has fully arrived
      const t = Math.min(1, Math.max(0, (vh - r.top) / Math.min(vh, r.height)));
      for (const [sel, amount] of layers) {
        const el = footer.querySelector<HTMLElement>(sel);
        if (el) el.style.transform = `translate3d(0, ${((1 - t) * amount).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return null;
}
