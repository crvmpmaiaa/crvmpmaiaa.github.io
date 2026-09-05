"use client";
import { useEffect, useRef } from "react";
import { SERVICES } from "@/portal/services";
import { PROJECTS } from "@/portal/work";

/**
 * The phone version of the front page. The same story as the scroll rig, told as a normal page with stills
 * of the real scene: the statue, the dust, the pillar, the temple. No WebGL, so nothing for the phone to
 * run out of. Sections fade up as they enter.
 */
export function MobileHome() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });
    el.querySelectorAll(".m-reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="m" ref={root}>
      {/* the opening frame */}
      <section className="m-hero">
        <img className="m-hero__sky" src="/media/sky-poster.jpg" alt="" aria-hidden="true" />
        <nav className="m-nav" aria-label="Site">
          <a href="/work">Work</a><a href="#services">Services</a><a href="/about">About us</a><a href="/contact">Contact</a>
        </nav>
        <span className="m-hero__word m-hero__word--top">Build</span>
        <img className="m-hero__statue" src="/images/mobile/statue.webp" alt="The Farnese Hercules, carved in marble" width={933} height={1876} />
        <span className="m-hero__word m-hero__word--bottom">Different</span>
        <span className="m-hero__hint">Scroll</span>
      </section>

      {/* the story, beat by beat */}
      <section className="m-story">
        <div className="m-beat m-reveal">
          <p className="m-line">Carved to be remembered.<br />It worked.</p>
          <p className="m-line m-line--soft">People have always wanted the same thing: to build something that outlives them and carries their name.</p>
        </div>
        <div className="m-beat m-beat--dust m-reveal">
          <img className="m-beat__dust" src="/images/mobile/dust.webp" alt="The statue breaking into digital dust and blowing away" width={868} height={1553} />
          <p className="m-line">Yet your brand lives somewhere that forgets everything by next year.</p>
          <p className="m-line m-line--right">Online, most names are written in sand.</p>
        </div>
        <div className="m-beat m-beat--pillar m-reveal">
          <div>
            <p className="m-line">It does not have to be.</p>
            <p className="m-line m-line--soft">Your brand can feel</p>
            <p className="m-line m-line--big">Considered.</p>
            <p className="m-line m-line--big">Permanent.</p>
            <p className="m-line m-line--big">Built to stand.</p>
          </div>
          <img className="m-beat__pillar" src="/images/mobile/pillar.webp" alt="A marble pillar with a laptop open on top" width={284} height={835} />
        </div>
        <div className="m-beat m-reveal">
          <p className="m-line">Whatever you can imagine,<br />we can build.</p>
          <p className="m-line m-line--right">Something worthy<br />of your name.</p>
          <p className="m-line m-line--centre">Faster and cheaper than has ever been possible.</p>
        </div>
      </section>

      {/* services: the six cards from inside the laptop, stacked */}
      <section className="m-services" id="services">
        <h2 className="m-h">What we build</h2>
        <ol className="m-services__list">
          {SERVICES.map((s, i) => (
            <li key={s.title} className="m-service m-reveal">
              <span className="m-service__n">{String(i + 1).padStart(2, "0")} <em>/ {String(SERVICES.length).padStart(2, "0")}</em></span>
              <h3 className="m-service__title">{s.title}</h3>
              <p className="m-service__lead">{s.lead}</p>
              <img className="m-service__img" src={s.image} alt={s.alt} width={800} height={600} loading="lazy" />
              <ul className="m-service__points">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </li>
          ))}
        </ol>
      </section>

      {/* work: the temple, then the projects */}
      <section className="m-work">
        <img className="m-work__temple m-reveal" src="/images/mobile/temple.webp" alt="A marble temple on a floating island of grass" width={1214} height={1207} loading="lazy" />
        <h2 className="m-h m-h--ink">Selected work</h2>
        <ul className="m-work__list">
          {PROJECTS.map((p, i) => (
            <li key={p.slug} className="m-project m-reveal">
              <a href={`/work/${p.slug}`}>
                {p.image && <img className="m-project__phone" src={p.image} alt={p.alt} width={390} height={844} loading="lazy" />}
                <div className="m-project__text">
                  <span className="m-project__n">{String(i + 1).padStart(2, "0")} <em>/ {String(PROJECTS.length).padStart(2, "0")}</em></span>
                  <span className="m-project__kind">{p.kind}</span>
                  <h3 className="m-project__name">{p.name}</h3>
                  <p className="m-project__line">{p.line}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
        <p className="m-work__more"><a className="cta" href="/work">See all work</a></p>
      </section>
    </div>
  );
}
