"use client";
import { useEffect, useRef, useState } from "react";
import { PROJECTS, WORK_MORE } from "@/portal/work";
import { onProgress, progress } from "./progress";
import { Q, remap, ease } from "./beats";

/**
 * Selected work as a stack. Each project rises from below and lands on top of the last; the ones underneath
 * shrink a step and tuck up behind it, so the pile stays in view. Position is a pure function of scroll.
 */
const N = PROJECTS.length;
const STEP_SCALE = 0.05;
const STEP_UP = 26;   // px each covered card tucks up

export function WorkDeck() {
  const [visible, setVisible] = useState(false);
  const cards = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const apply = () => {
      const q = progress.q;
      setVisible(q > Q.work[0] - 0.02 && q < Q.work[1] + 0.05);
      // N arrivals spread over the window, each followed by a hold. pos = how many cards have landed (continuous).
      const u = remap(q, Q.work[0], Q.work[1]);
      const seg = 1 / N;
      const i = Math.min(N - 1, Math.floor(u / seg));
      const f = (u - i * seg) / seg;
      const arrive = ease.inOut(remap(f, 0, 0.55));   // the card comes up over the first part of its segment
      const pos = i + arrive;                          // e.g. 2.4: cards 0 and 1 landed, card 2 arriving
      const vh = window.innerHeight;
      cards.current.forEach((el, k) => {
        if (!el) return;
        const d = k - pos;
        let y = 0, s = 1, vis = true;
        if (d >= 1) { y = vh * 1.1; vis = false; }             // still below
        else if (d > 0) { y = d * vh * 1.1; }                   // rising
        else { const depth = Math.min(N, -d); s = 1 - depth * STEP_SCALE; y = -depth * STEP_UP; }  // landed, tucked
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
        el.style.visibility = vis ? "visible" : "hidden";
        el.style.zIndex = String(10 + k);
        el.setAttribute("aria-hidden", d > 0.5 || d < -0.5 ? "true" : "false");
        const img = el.querySelector<HTMLElement>(".work__phone img");
        if (img) img.style.transform = `scale(${(1 + Math.max(0, Math.min(1, d)) * 0.25).toFixed(3)})`;
      });
    };
    apply();
    return onProgress(apply);
  }, []);

  return (
    <div className={`work${visible ? " is-visible" : ""}`} aria-label="Selected work">
      {PROJECTS.map((p, i) => (
        <article key={p.name} className="work__card" ref={(el) => { cards.current[i] = el; }}>
          <div className="work__text">
            <span className="work__index" aria-hidden="true">{String(i + 1).padStart(2, "0")}<span className="work__of"> / {String(N).padStart(2, "0")}</span></span>
            <p className="work__kind">{p.kind}</p>
            <h3 className="work__name">{p.name}</h3>
            <p className="work__line">{p.line}</p>
            {i === N - 1 && <a className="work__more" href={WORK_MORE.href}>{WORK_MORE.label}</a>}
          </div>
          <figure className="work__phone">
            <img src={p.image} alt={p.alt} loading="lazy" width={900} height={1950} />
          </figure>
        </article>
      ))}
    </div>
  );
}
