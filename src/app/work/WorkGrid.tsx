"use client";
import { useEffect, useRef } from "react";
import type { Project } from "@/portal/work";
import { Distort } from "./Distort";

/**
 * The grid, with two things the scroll and the mouse do:
 * focus: each card fades and lifts in as it enters, and dims a little when it is far from the middle of the
 * viewport, so the one you are looking at is the one in focus;
 * hover: the preview zooms and tilts slightly with the pointer, and a "View" label follows the cursor.
 */
export function WorkGrid({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".wp__card"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        const centre = r.top + r.height / 2;
        const d = Math.abs(centre - vh / 2) / (vh / 2);       // 0 in the middle, 1 at the edges
        const entered = r.top < vh * 0.92;
        c.classList.toggle("is-in", entered);
        const focus = reduced ? 1 : 1 - Math.min(1, Math.max(0, d - 0.35) / 0.65) * 0.55;
        c.style.setProperty("--focus", focus.toFixed(3));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // hover: tilt and a cursor label
    const offs: (() => void)[] = [];
    if (!reduced) {
      for (const c of cards) {
        const fig = c.querySelector<HTMLElement>(".wp__preview");
        const label = c.querySelector<HTMLElement>(".wp__view");
        if (!fig || !label) continue;
        const move = (e: PointerEvent) => {
          const r = fig.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          fig.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
          label.style.transform = `translate(${(e.clientX - r.left).toFixed(0)}px, ${(e.clientY - r.top).toFixed(0)}px) translate(-50%, -50%)`;
        };
        const leave = () => { fig.style.transform = ""; };
        fig.addEventListener("pointermove", move);
        fig.addEventListener("pointerleave", leave);
        offs.push(() => { fig.removeEventListener("pointermove", move); fig.removeEventListener("pointerleave", leave); });
      }
    }
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); offs.forEach((f) => f()); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <ul className="wp__grid" ref={root}>
      {projects.map((p) => (
        <li key={p.slug} className="wp__card">
          <a className="wp__link" href={`/work/${p.slug}`}>
            <figure className="wp__preview" style={{ "--img": `url(${p.site})` } as React.CSSProperties}>
              <img src={p.site} alt={p.alt} width={1440} height={900} />
              {/* the glitch: two offset copies of the image in red and cyan, sliced and jittered for a moment */}
              <span className="wp__glitch wp__glitch--r" aria-hidden="true" />
              <span className="wp__glitch wp__glitch--c" aria-hidden="true" />
              <Distort src={p.site} />
              <span className="wp__view" aria-hidden="true">View</span>
            </figure>
            <ul className="wp__tags" aria-label="Tags">
              {p.tags.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <h3 className="wp__name">{p.name}</h3>
            <p className="wp__line">{p.line}</p>
            <span className="wp__cta">Read about it</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
