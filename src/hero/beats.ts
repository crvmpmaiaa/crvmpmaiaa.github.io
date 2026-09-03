/**
 * The scroll sequence. One normalised progress value p in [0, 1] drives everything; every beat below is a
 * function of p. Ranges match the build spec so the table there stays the single source of truth.
 */
export const BEATS = {
  head: [0.0, 0.12],
  reveal: [0.12, 0.3],
  hold: [0.3, 0.45],
  vaporise: [0.45, 0.62],
  rebuild: [0.62, 0.78],
  turn: [0.78, 0.9],
  screen: [0.9, 1.0],
} as const;

export const SCROLL_LENGTH_VH = 700;

/** 0 before a, 1 after b, linear between. */
export function remap(p: number, a: number, b: number): number {
  if (b === a) return p < a ? 0 : 1;
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
}

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  smooth: (t: number) => t * t * (3 - 2 * t),
};

/** Fade window: in over [a, b], hold, out over [c, d]. */
export function window(p: number, a: number, b: number, c: number, d: number): number {
  return ease.smooth(remap(p, a, b)) * (1 - ease.smooth(remap(p, c, d)));
}

/** Copy timing, as windows on p. Headline 1 is on a wall clock at load and only fades out here. */
export const COPY_WINDOWS = {
  headline1: (p: number) => 1 - ease.smooth(remap(p, 0.1, 0.16)),
  block1: (p: number) => window(p, 0.17, 0.24, 0.4, 0.45),
  block2: (p: number) => window(p, 0.5, 0.58, 0.7, 0.75),
  block3: (p: number) => window(p, 0.78, 0.85, 0.96, 0.99),
  cta: (p: number) => ease.smooth(remap(p, 0.9, 0.96)),
  scrollHint: (p: number) => 1 - ease.smooth(remap(p, 0.02, 0.06)),
};
