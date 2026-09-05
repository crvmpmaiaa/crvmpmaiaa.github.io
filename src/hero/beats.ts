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
export const HERO_VH = 900;
export const PORTAL_VH = 1140;
export const SCROLL_LENGTH_VH = HERO_VH + PORTAL_VH;
export const HERO_FRACTION = HERO_VH / SCROLL_LENGTH_VH;

/** portal section beats on q in [0, 1]. The first 600vh worth is the portal, then the pillar vanishes and the hand rises. */
const K = 600 / 1140;
const K2 = 840 / 1140;
export const Q = {
  through: [0.0, 0.08 * K],
  cross: 0.04 * K,
  arrive: [0.08 * K, 0.14 * K],
  truck: [0.14 * K, 0.8 * K],
  turnBack: [0.8 * K, 0.86 * K],
  backThrough: [0.86 * K, 0.92 * K],
  crossBack: 0.9 * K,
  pullOut: [0.92 * K, 1.0 * K],
  vanish: [0.74 * K2, 0.86 * K2],
  hand: [0.84 * K2, 0.97 * K2],
  /** the work deck plays over the hand */
  work: [0.74, 0.98],
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
  // the button belongs to the exit: it appears on the pull out, after the return crossing
  cta: (_p: number, q = 0) => ease.smooth(remap(q, Q.pullOut[1] - 0.03, Q.pullOut[1])),
  scrollHint: (p: number) => 1 - ease.smooth(remap(p, 0.02, 0.06)),
};
