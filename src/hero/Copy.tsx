"use client";
import { useEffect, useRef } from "react";
import { LINES, WORDMARK, CTA, SCROLL_HINT } from "./lines";
import { COPY_WINDOWS, window as win, ease, remap } from "./beats";
import { onProgress, progress, scrollControl } from "./progress";
import { HERO_FRACTION, Q } from "./beats";

type Layer = "behind" | "front" | "all";

/** Copy blocks in DOM over the canvas. Opacity is a function of p, applied to style, no React state. */
export function Copy({ isStatic, layer = "all" }: { isStatic: boolean; layer?: Layer }) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const letterRefs = useRef<Record<string, (HTMLElement | null)[]>>({});

  useEffect(() => {
    if (isStatic) return;
    const apply = (p: number) => {
      const q = progress.q;
      for (const key of Object.keys(refs.current)) {
        const el = refs.current[key];
        if (!el) continue;
        let o = 0;
        const line = LINES.find((l) => l.key === key);
        if (line) {
          // the line as a whole only fades on the way out; on the way in the letters type themselves
          const exit = 1 - ease.smooth(remap(p, line.out[0], line.out[1]));
          const typed = remap(p, line.in[0], line.in[1]);
          o = typed > 0 ? exit : 0;
          const letters = letterRefs.current[key] ?? [];
          const n = letters.length;
          // each letter arrives over a short run of the type head, sliding in from the right and sharpening
          const head = typed * (n + 3);
          for (let i = 0; i < n; i++) {
            const k = Math.min(1, Math.max(0, (head - i) / 3));
            const el2 = letters[i];
            if (!el2) continue;
            el2.style.opacity = k.toFixed(3);
            el2.style.transform = k >= 1 ? "" : `translate(${((1 - k) * 0.6).toFixed(3)}em, ${((1 - k) * -0.25).toFixed(3)}em) rotate(${((1 - k) * 6).toFixed(2)}deg)`;
            el2.style.filter = k >= 1 ? "" : `blur(${((1 - k) * 4).toFixed(2)}px)`;
          }
        }
        else if (key === "headline1" || key === "headline1-front") o = COPY_WINDOWS.headline1(p);
        else if (key === "cta") o = COPY_WINDOWS.cta(p, q);
        else if (key === "scrollHint") o = COPY_WINDOWS.scrollHint(p);
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
        // lines rise a little as they arrive
        if (line) el.style.setProperty("--rise", (1 - o).toFixed(3));
      }
    };
    apply(progress.p);
    return onProgress(apply);
  }, [isStatic]);

  const set = (k: string) => (el: HTMLElement | null) => { refs.current[k] = el; };

  const word = (text: string, cls: string, delay: number) => (
    <span className={`word ${cls}`} aria-label={text} role="text">
      {Array.from(text).map((ch, i) => (
        <span className={i === 0 ? "letter letter--lead" : "letter"} aria-hidden="true" key={i} style={{ animationDelay: `${delay + i * 45}ms` }}>{ch}</span>
      ))}
    </span>
  );
  const wordmark = (
    <h1 className="copy copy--wordmark" ref={set("headline1")} style={isStatic ? undefined : { opacity: 1, inset: 0 }}>
      {word(WORDMARK[0], "word--top", 150)}
      <span className={layer === "behind" ? "sr-only" : "word word--bottom"}>{layer === "behind" ? WORDMARK[1] : null}</span>
      {layer !== "behind" && word(WORDMARK[1], "word--bottom", 450)}
    </h1>
  );
  const different = (
    <div className="copy copy--wordmark" ref={set("headline1-front")} style={{ opacity: 1, inset: 0 }} aria-hidden="true">
      {word(WORDMARK[1], "word--bottom", 450)}
    </div>
  );
  if (layer === "behind") return <div className="hero__layer hero__layer--behind">{wordmark}</div>;

  return (
    <div className={isStatic ? "hero__copy-stack" : "hero__layer hero__layer--front"}>
      {layer === "all" && wordmark}
      {layer === "front" && different}
      {LINES.map((l) => {
        letterRefs.current[l.key] = letterRefs.current[l.key] ?? [];
        let idx = 0;
        return (
          <p key={l.key} className={`copy copy--line ${l.place.split(" ").map((c) => `copy--${c}`).join(" ")}`} ref={set(l.key)} aria-label={l.text.replace(/\n/g, " ")}>
            {l.text.split("\n").map((row, r) => (
              <span className="row" key={r} aria-hidden="true">
                {row.split(" ").map((wordText, w) => (
                  <span className="w" key={w}>
                    {Array.from(wordText).map((ch) => {
                      const i = idx++;
                      return <span className="l" key={i} ref={(el) => { letterRefs.current[l.key][i] = el; }}>{ch}</span>;
                    })}
                    {w < row.split(" ").length - 1 ? " " : ""}
                  </span>
                ))}
              </span>
            ))}
          </p>
        );
      })}
      <p className="copy copy--cta" ref={set("cta")}>
        <a className="cta" href="/contact">{CTA}</a>
      </p>
      {!isStatic && (
        <nav className="hero-nav" aria-label="Site">
          <a href="/work">Work</a>
          <a href="#services" onClick={(e) => { e.preventDefault(); scrollControl.toSection(HERO_FRACTION + (1 - HERO_FRACTION) * Q.arrive[0]); }}>Services</a>
          <a href="/about">About us</a>
          <a href="/contact">Contact</a>
        </nav>
      )}
      {!isStatic && (
        <p className="scroll-hint" ref={set("scrollHint")} aria-hidden="true">{SCROLL_HINT}</p>
      )}
    </div>
  );
}
