"use client";
import { useEffect, useRef, useState } from "react";
import { SERVICES } from "@/portal/services";
import { onProgress, progress } from "./progress";
import { Q, remap } from "./beats";
import { railX } from "@/portal/rail";
import { CARDS } from "@/portal/PortalScene";

/**
 * The services inside the laptop: a deck of cards driven by the scroll. Each card slides in from the right,
 * holds at the centre while its stretch of scroll plays out, then slides off to the left as the next arrives.
 * Position is a pure function of scroll, so it scrubs both ways.
 */
function deckPosition(q: number): number {
  const x = railX(remap(q, Q.truck[0], Q.truck[1]));
  for (let i = 0; i < CARDS.length - 1; i++) {
    const a = CARDS[i].x, b = CARDS[i + 1].x;
    if (x <= b) return i + Math.min(1, Math.max(0, (x - a) / (b - a)));
  }
  return CARDS.length - 1;
}

export function ServiceTabs() {
  const [visible, setVisible] = useState(false);
  const cards = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const apply = () => {
      const q = progress.q;
      const inside = q > Q.arrive[0] && q < Q.turnBack[1];
      setVisible(inside);
      // before the deck starts the first card is still off to the right; after it ends the last has left
      const lead = remap(q, Q.arrive[0] + 0.02, Q.truck[0]);          // first card arriving
      const tail = remap(q, Q.turnBack[0], Q.turnBack[1]);             // last card leaving
      const pos = q < Q.truck[0] ? -1 + lead : q > Q.turnBack[0] ? CARDS.length - 1 + tail : deckPosition(q);
      const step = window.innerWidth * 1.04;  // cards are wider now, so the stride grows with them
      cards.current.forEach((el, i) => {
        if (!el) return;
        const d = i - pos;                       // 0 centred, +1 one card to the right, -1 one to the left
        const x = d * step;
        const hidden = Math.abs(d) > 1.2;
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${(d * 1.5).toFixed(2)}deg)`;
        el.style.opacity = hidden ? "0" : (1 - Math.min(1, Math.abs(d)) * 0.25).toFixed(3);
        el.style.visibility = hidden ? "hidden" : "visible";
        el.setAttribute("aria-hidden", Math.abs(d) > 0.5 ? "true" : "false");
      });
    };
    apply();
    return onProgress(apply);
  }, []);

  return (
    <div className={`deck${visible ? " is-visible" : ""}`} aria-label="Services">
      {SERVICES.map((s, i) => (
        <section key={s.title} className="deck__card" ref={(el) => { cards.current[i] = el; }}>
          <div className="deck__text">
            <h3 className="deck__title">{s.title}</h3>
            <p className="deck__lead">{s.lead}</p>
            {s.points.length > 0 && (
              <ul className="deck__points">
                {s.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
          </div>
          <figure className="deck__figure">
            <img src={s.image} alt={s.alt} loading="lazy" width={1200} height={1200} />
          </figure>
        </section>
      ))}
    </div>
  );
}
