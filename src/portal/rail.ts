import { CARDS } from "./PortalScene";
import { Q, ease, remap } from "@/hero/beats";

/** camera rail in portal space: eye level with the cards, a fixed distance in front of them */
export const RAIL_Z = 3.1;
export const RAIL_Y = 0.05;
/** where the entry camera sits and looks before the truck begins */
export const ENTRY = { pos: [-1.6, 0.12, 4.6] as const, look: [2.2, 0.0, -1.5] as const };
/** the portal world lives far from the hero so the two never overlap in one scene */
export const PORTAL_OFFSET = [0, -600, 0] as const;

/** hold weights: the three long cards get longer plateaus */
const HOLD = CARDS.map((c) => (c.long ? 1.35 : 0.8));
const TRAVEL = 0.42;

type Seg = { from: number; to: number; x0: number; x1: number; hold: boolean };
function buildSegments(): Seg[] {
  const total = HOLD.reduce((a, b) => a + b, 0) + TRAVEL * (CARDS.length - 1);
  const segs: Seg[] = [];
  let t = 0;
  for (let i = 0; i < CARDS.length; i++) {
    const h = HOLD[i] / total;
    segs.push({ from: t, to: t + h, x0: CARDS[i].x, x1: CARDS[i].x, hold: true });
    t += h;
    if (i < CARDS.length - 1) {
      const tr = TRAVEL / total;
      segs.push({ from: t, to: t + tr, x0: CARDS[i].x, x1: CARDS[i + 1].x, hold: false });
      t += tr;
    }
  }
  return segs;
}
const SEGS = buildSegments();

/** rail x for truck progress u in [0, 1]: flat plateaus at each card, eased travel between */
export function railX(u: number): number {
  for (const s of SEGS) {
    if (u <= s.to) {
      if (s.hold) return s.x0;
      const k = ease.inOut((u - s.from) / (s.to - s.from));
      return s.x0 + (s.x1 - s.x0) * k;
    }
  }
  return CARDS[CARDS.length - 1].x;
}

/** truck progress u at the centre of card i's hold, for click to navigate */
export function holdCentre(i: number): number {
  const holds = SEGS.filter((s) => s.hold);
  const s = holds[i];
  return (s.from + s.to) / 2;
}

/** section q for a given truck progress u */
export function qForTruck(u: number): number {
  return Q.truck[0] + (Q.truck[1] - Q.truck[0]) * u;
}

/** card lighting from camera distance along the rail, not from scroll, so it survives reverse scrubbing */
export function litFor(cardX: number, camX: number): number {
  const d = Math.abs(cardX - camX);
  return 1 - ease.smooth(remap(d, 0.35, 1.6));
}

/** shared wall clock for the portal cameras, advanced once per frame by the camera rig */
export const portalClock = { t: 0 };

/** the entry camera's handheld drift and mouse look, used identically by the screen camera and the inside camera */
export function entryDrift(t: number, mx: number, my: number) {
  return {
    pos: [Math.sin(t * 0.18) * 0.1 + mx * 0.08, Math.sin(t * 0.13) * 0.05 + my * 0.05, 0] as const,
    look: [Math.sin(t * 0.09) * 0.15 + mx * 0.4, my * 0.25, 0] as const,
  };
}
