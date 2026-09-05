/** Shared scroll progress. ScrollTrigger writes, the R3F frame loop and the DOM copy read. No React state on the hot path. */
import { HERO_FRACTION } from "./beats";

/** s: whole pinned section 0..1. p: hero 0..1. q: portal 0..1. */
export const progress = { s: 0, p: 0, q: 0, target: 0 };

type Listener = (p: number) => void;
const listeners = new Set<Listener>();

export function onProgress(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setProgress(s: number) {
  progress.s = s;
  progress.p = Math.min(1, s / HERO_FRACTION);
  progress.q = Math.max(0, (s - HERO_FRACTION) / (1 - HERO_FRACTION));
  if (typeof window !== "undefined") (window as unknown as { __bdProgress?: number; __bdQ?: number }).__bdProgress = progress.p;
  if (typeof window !== "undefined") (window as unknown as { __bdQ?: number }).__bdQ = progress.q;
  for (const fn of listeners) fn(progress.p);
}

/** set by the Hero once Lenis exists: scroll the page so the section progress equals s */
export const scrollControl: { toSection: (s: number) => void; lock: () => void; unlock: () => void } = { toSection: () => {}, lock: () => {}, unlock: () => {} };
