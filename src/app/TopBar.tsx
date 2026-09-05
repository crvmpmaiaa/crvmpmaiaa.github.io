"use client";
import { useEffect, useRef } from "react";

/**
 * The bar across the top of the dark pages: BD in the middle, big and bold, that unfolds to BUILD DIFFERENT
 * under the pointer and folds back when it leaves. It sticks to the top, and once the page has scrolled a
 * little it shrinks to a slim strip so the work gets the screen back.
 */
export function TopBar({ light = false }: { light?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => { raf = 0; el.classList.toggle("is-compact", window.scrollY > 80); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className={`bar${light ? " bar--light" : ""}`} ref={ref}>
      <nav className="bar__nav bar__nav--l" aria-label="Site">
        <a href="/work">Work</a>
        <a href="/#services">Services</a>
      </nav>
      <a className="bd" href="/" aria-label="Build Different, home">
        <span className="bd__l">B</span><span className="bd__x" aria-hidden="true">UILD</span>
        <span className="bd__gap" aria-hidden="true" />
        <span className="bd__l">D</span><span className="bd__x" aria-hidden="true">IFFERENT</span>
      </a>
      <nav className="bar__nav bar__nav--r" aria-label="Site">
        <a href="/about">About us</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  );
}
