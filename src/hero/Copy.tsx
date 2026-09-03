"use client";
import { useEffect, useRef } from "react";
import { COPY } from "./lines";
import { COPY_WINDOWS } from "./beats";
import { onProgress } from "./progress";

/** Copy blocks in DOM over the canvas. Opacity is a function of p, applied directly to style, no React state. */
export function Copy({ isStatic }: { isStatic: boolean }) {
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

  return (
    <div className={isStatic ? "hero__copy-stack" : undefined}>
      <h1 className="copy copy--wordmark" ref={set("headline1")} style={isStatic ? undefined : { opacity: 1, inset: 0 }}>
        <span className="word--build">{COPY.wordmark[0]}</span>
        <span className="word--different">{COPY.wordmark[1]}</span>
      </h1>
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
