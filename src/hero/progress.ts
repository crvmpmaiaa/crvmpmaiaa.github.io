/** Shared scroll progress. ScrollTrigger writes, the R3F frame loop and the DOM copy read. No React state on the hot path. */
export const progress = { p: 0, target: 0 };

type Listener = (p: number) => void;
const listeners = new Set<Listener>();

export function onProgress(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setProgress(p: number) {
  progress.p = p;
  for (const fn of listeners) fn(p);
}
