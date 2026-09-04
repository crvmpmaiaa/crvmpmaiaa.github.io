/**
 * The scroll sequence. One normalised progress value p in [0, 1] drives everything; every beat below is a
 * function of p. Ranges match the build spec so the table there stays the single source of truth.
 */
export const BEATS = {
  head: [0.0, 0.12],
  reveal: [0.12, 0.3],
  hold: [0.3, 0.45],
  vaporise: [0.45, 0.64],
  rebuild: [0.62, 0.78],
  turn: [0.78, 0.87],
  screen: [0.87, 0.965],
} as const;

/** hero 700vh, then the portal section 600vh, all in one pin */
export const HERO_VH = 700;
export const PORTAL_VH = 600;
export const SCROLL_LENGTH_VH = HERO_VH + PORTAL_VH;
export const HERO_FRACTION = HERO_VH / SCROLL_LENGTH_VH;

/** portal section beats on q in [0, 1] */
export const Q = {
  through: [0.0, 0.08],
  cross: 0.04,
  arrive: [0.08, 0.14],
  truck: [0.14, 0.8],
  turnBack: [0.8, 0.86],
  backThrough: [0.86, 0.92],
  crossBack: 0.9,
  pullOut: [0.92, 1.0],
} as const;

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
  block2: (p: number) => window(p, 0.49, 0.55, 0.6, 0.64),
  block3: (p: number) => window(p, 0.66, 0.72, 0.85, 0.88),
  cta: (p: number) => ease.smooth(remap(p, 0.965, 0.985)),
  scrollHint: (p: number) => 1 - ease.smooth(remap(p, 0.02, 0.06)),
};
