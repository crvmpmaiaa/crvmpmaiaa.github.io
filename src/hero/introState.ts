/** Load intro state: the statue signals when its first model is on screen, the intro sequence listens. */
const listeners = new Set<() => void>();
export const introState = { statueReady: false, locked: true };
export function signalStatueReady() {
  if (introState.statueReady) return;
  introState.statueReady = true;
  for (const fn of listeners) fn();
}
export function onStatueReady(fn: () => void): () => void {
  if (introState.statueReady) fn();
  listeners.add(fn);
  return () => listeners.delete(fn);
}
