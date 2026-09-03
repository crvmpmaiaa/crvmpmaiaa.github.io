"use client";
import { useEffect, useRef } from "react";
import { COPY } from "./lines";
import { COPY_WINDOWS } from "./beats";
import { onProgress } from "./progress";

/** Copy blocks in DOM over the canvas. Opacity is a function of p, applied directly to style, no React state. */
type Layer = "behind" | "front" | "all";

/** layer "behind" renders only the wordmark (between sky and statue), "front" the rest, "all" for the static page. */
export function Copy({ isStatic, layer = "all" }: { isStatic: boolean; layer?: Layer }) {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (isStatic) return;
    const apply = (p: number) => {
      for (const key of Object.keys(COPY_WINDOWS) as (keyof typeof COPY_WINDOWS)[]) {
        const el = refs.current[key];
        if (!el) continue;
        const o = COPY_WINDOWS[key](p);
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
    };
    apply(0);
    return onProgress(apply);
  }, [isStatic]);

  const set = (k: string) => (el: HTMLElement | null) => {
    refs.current[k] = el;
  };

  // each letter is its own span so the entrance can stagger; the word stays one accessible string
  const word = (text: string, cls: string, delay: number) => (
    <span className={`word ${cls}`} aria-label={text} role="text">
      {Array.from(text).map((ch, i) => (
        <span className="letter" aria-hidden="true" key={i} style={{ animationDelay: `${delay + i * 45}ms` }}>
          {ch}
        </span>
      ))}
    </span>
  );
  const wordmark = (
    <h1 className="copy copy--wordmark" ref={set("headline1")} style={isStatic ? undefined : { opacity: 1, inset: 0 }}>
      {word(COPY.wordmark[0], "word--top", 150)}
      {word(COPY.wordmark[1], "word--bottom", 450)}
    </h1>
  );
  if (layer === "behind") return <div className="hero__layer hero__layer--behind">{wordmark}</div>;

  return (
    <div className={isStatic ? "hero__copy-stack" : "hero__layer hero__layer--front"}>
      {layer === "all" && wordmark}
      <p className="copy copy--block" ref={set("block1")}>
        {COPY.block1}
      </p>
      <p className="copy copy--block copy--right" ref={set("block2")}>
        {COPY.block2}
      </p>
      <p className="copy copy--block" ref={set("block3")}>
        {COPY.block3}
      </p>
      <p className="copy copy--cta" ref={set("cta")}>
        <a className="cta" href="#contact">
          {COPY.cta}
        </a>
      </p>
      {!isStatic && (
        <p className="scroll-hint" ref={set("scrollHint")} aria-hidden="true">
          {COPY.scrollHint}
        </p>
      )}
    </div>
  );
}
