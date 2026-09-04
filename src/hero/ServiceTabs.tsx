"use client";
import { useEffect, useState } from "react";
import { SERVICES, SECTION_HEADING } from "@/portal/services";
import { onProgress, progress, scrollControl } from "./progress";
import { HERO_FRACTION, Q, remap } from "./beats";
import { holdCentre, qForTruck, railX } from "@/portal/rail";
import { CARDS } from "@/portal/PortalScene";

/**
 * The services inside the laptop. A row of tabs over the screen; the scroll opens each in turn as the rail
 * reaches its card, the open one shows the service's sentence and points. Click a tab to glide the scroll there.
 */
function activeIndex(q: number): number {
  const u = remap(q, Q.truck[0], Q.truck[1]);
  const x = railX(u);
  let best = 0, bd = Infinity;
  CARDS.forEach((c, i) => { const d = Math.abs(c.x - x); if (d < bd) { bd = d; best = i; } });
  return best;
}

export function ServiceTabs() {
  const [active, setActive] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [heading, setHeading] = useState(false);
  const [rail, setRail] = useState(0);

  useEffect(() => {
    const apply = () => {
      const q = progress.q;
      const inside = q > Q.arrive[0] && q < Q.turnBack[1];
      setVisible(inside);
      setHeading(q > Q.arrive[0] && q < Q.truck[0] - 0.005);
      setActive(q >= Q.truck[0] && q <= Q.turnBack[0] ? activeIndex(q) : -1);
      const u = remap(q, Q.truck[0], Q.truck[1]);
      setRail(Math.round(u * 1000) / 1000);
    };
    apply();
    return onProgress(apply);
  }, []);

  const go = (i: number) => scrollControl.toSection(HERO_FRACTION + (1 - HERO_FRACTION) * qForTruck(holdCentre(i)));

  return (
    <div className={`tabs${visible ? " is-visible" : ""}`} aria-label="Services">
      <h2 className={`tabs__heading${heading ? " is-on" : ""}`}>{SECTION_HEADING}</h2>
      <div className="tabs__bar" role="tablist" style={{ "--rail": rail } as React.CSSProperties}>
        <span className="tabs__rail" aria-hidden="true" />
        {SERVICES.map((s, i) => (
          <button
            key={s.title}
            role="tab"
            type="button"
            className={`tabs__tab${active === i ? " is-active" : ""}`}
            aria-selected={active === i}
            aria-controls={`service-${i}`}
            onClick={() => go(i)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="tabs__panels">
        {SERVICES.map((s, i) => (
          <section key={s.title} id={`service-${i}`} role="tabpanel" className={`tabs__panel${active === i ? " is-open" : ""}`} aria-hidden={active !== i}>
            <h3 className="tabs__title tabs__in" style={{ "--i": 0 } as React.CSSProperties}>{s.title}</h3>
            <p className="tabs__lead tabs__in" style={{ "--i": 1 } as React.CSSProperties}>{s.lead}</p>
            {s.points.length > 0 && (
              <ul className="tabs__points">
                {s.points.map((p, j) => <li key={p} className="tabs__in" style={{ "--i": 2 + j * 0.5 } as React.CSSProperties}>{p}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
