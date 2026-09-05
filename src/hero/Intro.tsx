"use client";
import { useEffect, useRef } from "react";
import { onStatueReady, introState } from "./introState";
import { scrollControl } from "./progress";

/**
 * The load sequence. BD sits centred over the sky. Once the statue is ready (or after a ceiling wait) the B flies
 * to the head of BUILD and the D to the head of DIFFERENT, measured from the real letters, while the statue fades
 * up. When they land the stage gets `is-revealed`, which lets the remaining letters rise. Runs on every load.
 */
export function Intro({ stage }: { stage: React.RefObject<HTMLDivElement | null> }) {
  const b = useRef<HTMLSpanElement>(null);
  const d = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let done = false;
    // no scrolling until the sequence has played out
    introState.locked = true;
    scrollControl.lock();
    window.scrollTo(0, 0);
    const release = () => { introState.locked = false; scrollControl.unlock(); };
    // whatever happens, the page is never locked for more than a few seconds
    const safety = window.setTimeout(release, 6000);
    const finish = () => {
      if (done) return;
      done = true;
      st.classList.add("is-entering", "is-revealed");
      overlay.current?.remove();
      release();
    };
    if (reduced) { finish(); return; }

    const fly = () => {
      if (done) return;
      const leadB = st.querySelector<HTMLElement>(".word--top .letter--lead");
      const leadD = st.querySelector<HTMLElement>(".word--bottom .letter--lead");
      if (!b.current || !d.current || !leadB || !leadD) { finish(); return; }
      const pairs: [HTMLElement, HTMLElement][] = [[b.current, leadB], [d.current, leadD]];
      const anims = pairs.map(([from, to]) => {
        const a = from.getBoundingClientRect();
        // the lead letter is parked below its line until the reveal: measure it where it will land
        const savedTransform = to.style.transform;
        to.style.transform = "none";
        const t = to.getBoundingClientRect();
        to.style.transform = savedTransform;
        const s = t.height / a.height;
        const dx = t.left + t.width / 2 - (a.left + a.width / 2);
        const dy = t.top + t.height / 2 - (a.top + a.height / 2);
        return from.animate(
          [{ transform: "translate(0, 0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${s})` }],
          { duration: 1100, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "forwards" },
        );
      });
      Promise.all(anims.map((a) => a.finished)).then(() => {
        done = true;
        st.classList.add("is-revealed");
        overlay.current?.remove();
        // the wordmark has landed: the scroll hint shows and the page is free straight away
        release();
      }).catch(finish);
    };

    // hold the BD for a beat once the statue is in, but never wait more than a few seconds
    let holdTimer = 0;
    const off = onStatueReady(() => { holdTimer = window.setTimeout(fly, 450); });
    const ceiling = window.setTimeout(fly, 4000);
    return () => { off(); clearTimeout(holdTimer); clearTimeout(ceiling); clearTimeout(safety); release(); };
  }, [stage]);

  return (
    <div className="intro" ref={overlay} aria-hidden="true">
      <span className="intro__mark">
        <span className="intro__letter" ref={b}>B</span>
        <span className="intro__letter" ref={d}>D</span>
      </span>
    </div>
  );
}
