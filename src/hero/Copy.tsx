"use client";
import { useEffect, useRef } from "react";
import { LINES, WORDMARK, CTA, SCROLL_HINT } from "./lines";
import { COPY_WINDOWS, window as win } from "./beats";
import { onProgress, progress } from "./progress";

type Layer = "behind" | "front" | "all";

/** Copy blocks in DOM over the canvas. Opacity is a function of p, applied to style, no React state. */
export function Copy({ isStatic, layer = "all" }: { isStatic: boolean; layer?: Layer }) {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (isStatic) return;
    const apply = (p: number) => {
      const q = progress.q;
      for (const key of Object.keys(refs.current)) {
        const el = refs.current[key];
        if (!el) continue;
        let o = 0;
        const line = LINES.find((l) => l.key === key);
        if (line) o = win(p, line.in[0], line.in[1], line.out[0], line.out[1]);
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
      {LINES.map((l) => (
        <p key={l.key} className={`copy copy--line ${l.place.split(" ").map((c) => `copy--${c}`).join(" ")}`} ref={set(l.key)}>
          {l.text}
        </p>
      ))}
      <p className="copy copy--cta" ref={set("cta")}>
        <a className="cta" href="#contact">{CTA}</a>
      </p>
      {!isStatic && (
        <p className="scroll-hint" ref={set("scrollHint")} aria-hidden="true">{SCROLL_HINT}</p>
      )}
    </div>
  );
}
