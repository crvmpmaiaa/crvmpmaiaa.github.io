"use client";
import { useEffect, useRef } from "react";
import { BEATS, Q, ease, remap } from "@/hero/beats";
import { onProgress, progress } from "@/hero/progress";
import { signalStatueReady } from "@/hero/introState";

/**
 * The phone version of the 3D scene: one 2D canvas driven by the same scroll progress, drawing stills
 * rendered from the real models. The statue parallaxes as the camera would, then breaks into square motes
 * that blow off to the right; the pillar assembles from the left out of the same motes; the lid opens as a
 * crossfade; the screen zooms until it fills the viewport, where the geode frame takes over and the card deck
 * runs; on the way out the pillar blows away again. Nothing here touches WebGL.
 */

const SRC = {
  statue: "/images/mobile/statue.webp",       // 933 x 1876, trimmed
  closed: "/images/mobile/pillar-closed.webp", // 270 x 681
  open: "/images/mobile/pillar.webp",          // 284 x 835
  geode: "/images/mobile/geode.webp",          // 860 x 1864, a full portrait frame
};
/** the laptop screen inside the open still, as fractions of the image */
const SCREEN = { x: 61 / 284, y: 7 / 835, w: 161 / 284, h: 94 / 835 };
const CELL = 6;  // css px per mote at the size the object is drawn when it breaks up

type Cell = { u: number; v: number; t: number; s1: number; s2: number; s3: number };
type Sprite = { img: HTMLImageElement; cells: Cell[]; cols: number; rows: number };

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
/** a cheap deterministic hash for per-cell randomness */
function hash(n: number) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
/** grid the image into cells with a break-up order: bottom first (higher cells later), ragged */
function grid(img: HTMLImageElement, drawnWidth: number): Sprite {
  const cols = Math.max(8, Math.round(drawnWidth / CELL));
  const rows = Math.max(8, Math.round(cols * img.naturalHeight / img.naturalWidth));
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const yUp = 1 - r / rows;  // 1 at the top
    cells.push({ u: c / cols, v: r / rows, t: Math.min(1, yUp * 0.85 + hash(i) * 0.15), s1: hash(i + 1e4), s2: hash(i + 2e4), s3: hash(i + 3e4) });
  }
  return { img, cells, cols, rows };
}

export function StillScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let dead = false, raf = 0, W = 0, H = 0, dpr = 1;
    let statue: Sprite | null = null, closed: Sprite | null = null, open: HTMLImageElement | null = null, geode: HTMLImageElement | null = null;
    const clock = { t: 0 };

    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (statue) statue = grid(statue.img, W * 0.6);
      if (closed) closed = grid(closed.img, W * 0.3);
    };

    /** draw a sprite whole, or as motes blowing to the right (`out` 0..1) or assembling from the left (`in` 0..1) */
    const drawSprite = (sp: Sprite, x: number, y: number, w: number, h: number, out: number, assemble: number, seedShift: number) => {
      if (out <= 0 && assemble >= 1) { ctx.drawImage(sp.img, x, y, w, h); return; }
      const iw = sp.img.naturalWidth, ih = sp.img.naturalHeight;
      const cw = w / sp.cols, ch = h / sp.rows;
      const sw = iw / sp.cols, sh = ih / sp.rows;
      const frame = Math.floor(clock.t * 24);
      for (const c of sp.cells) {
        let local = 0;
        if (out > 0) local = Math.min(1, Math.max(0, (out * 1.45 - c.t) / 0.5));
        else local = 1 - Math.min(1, Math.max(0, (assemble * 1.45 - c.t) / 0.5));
        if (local >= 1) continue;
        const dx = x + c.u * w, dy = y + c.v * h;
        if (local <= 0) { ctx.drawImage(sp.img, c.u * iw, c.v * ih, sw, sh, dx, dy, cw + 0.5, ch + 0.5); continue; }
        const e = local * local * (3 - 2 * local);
        const dir = out > 0 ? 1 : -1;
        const px = dx + dir * Math.pow(local, 1.4) * W * (0.7 + 0.5 * c.s1) + Math.sin(local * 7 + c.s2 * 12 + seedShift) * 16 * local;
        const py = dy - e * H * 0.22 * (c.s2 - 0.25) + Math.sin(local * 5 + c.s1 * 9) * 10 * local;
        const k = 1 - 0.45 * e;
        ctx.globalAlpha = 1 - e * e;
        const flick = c.s3 < 0.14 && local > 0.04 && local < 0.85;
        if (flick) {
          const n = (frame + Math.floor(c.s1 * 40)) % 7;
          ctx.fillStyle = ["#ff2d55", "#37ff6a", "#3a6bff", "#ffffff", "#0c0c0c", "#ffffff", "#f5f5f5"][n];
          ctx.fillRect(px, py, cw * k, ch * k);
        } else {
          ctx.drawImage(sp.img, c.u * iw, c.v * ih, sw, sh, px, py, cw * k, ch * k);
        }
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      raf = 0;
      if (dead || !statue || !closed || !open || !geode) return;
      const p = progress.p, q = progress.q;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;

      // statue: opening pose bottom left and large, pulling back to the centre through reveal and hold
      const reveal = ease.inOut(remap(p, BEATS.reveal[0], BEATS.reveal[1]));
      const hold = ease.inOut(remap(p, BEATS.hold[0], BEATS.hold[1]));
      const vap = remap(p, BEATS.vaporise[0], BEATS.vaporise[1]);
      if (vap < 1) {
        const sw = W * (0.78 - 0.16 * reveal - 0.04 * hold);
        const sh = sw * statue.img.naturalHeight / statue.img.naturalWidth;
        const sx = -0.04 * W + (0.5 * W - sw / 2 + 0.04 * W) * hold;
        const sy = H + 0.02 * H - sh - (0.1 * H) * reveal - (0.06 * H) * hold;
        drawSprite(statue, sx, sy, sw, sh, vap, 1, 0);
      }

      // pillar: assembles from the left as the dust settles, then the lid opens, then the screen fills the frame
      const rb = remap(p, BEATS.rebuild[0], BEATS.rebuild[1]);
      const lid = ease.inOut(remap(p, BEATS.turn[0] + 0.03, BEATS.turn[1] + 0.02));
      const zoom = ease.inOut(remap(p, BEATS.screen[0], BEATS.screen[1]));
      const back = ease.inOut(remap(q, Q.pullOut[0], Q.pullOut[1]));  // 1 = fully out again
      const gone = remap(q, Q.vanish[0], Q.vanish[1]);                  // pillar blows away on the way out
      const inside = p >= BEATS.screen[1] - 0.001 && back < 1;
      if (rb > 0 && gone < 1) {
        // both stills share a pixel scale; anchor them bottom centre
        const k = (W * 0.3) / closed.img.naturalWidth;
        const cw = closed.img.naturalWidth * k, ch = closed.img.naturalHeight * k;
        const ow = open.naturalWidth * k, oh = open.naturalHeight * k;
        const baseX = W / 2, baseY = H * 0.78;
        // the zoom: scale about the screen centre until the screen spans the viewport, then hold while inside
        const z = inside ? 1 : Math.max(zoom, 0) * (1 - back) + zoom * 0;
        const zz = inside ? 1 : zoom * (1 - back);
        const scx = baseX - ow / 2 + (SCREEN.x + SCREEN.w / 2) * ow, scy = baseY - oh + (SCREEN.y + SCREEN.h / 2) * oh;
        const sFull = W / (SCREEN.w * ow) * 1.02;
        const s = 1 + (sFull - 1) * zz;
        const tx = (W / 2 - scx) * zz, ty = (H / 2 - scy) * zz;
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (scx * (1 - s) + tx), dpr * (scy * (1 - s) + ty));
        void z;
        if (lid < 1 || gone > 0) {
          ctx.globalAlpha = 1 - lid;
          drawSprite(closed, baseX - cw / 2, baseY - ch, cw, ch, gone, Math.max(0, rb), 3);
          ctx.globalAlpha = 1;
        }
        if (lid > 0 && gone <= 0) {
          ctx.globalAlpha = lid;
          ctx.drawImage(open, baseX - ow / 2, baseY - oh, ow, oh);
          // the screen shows the same frame the inside will show, so the zoom lands seamlessly
          const rx = baseX - ow / 2 + SCREEN.x * ow, ry = baseY - oh + SCREEN.y * oh, rw = SCREEN.w * ow, rh = SCREEN.h * oh;
          ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
          const ga = geode.naturalWidth / geode.naturalHeight, ra = rw / rh;
          let gw = rw, gh = rh;  // cover the screen with the middle of the frame
          if (ga > ra) { gh = rh; gw = rh * ga; } else { gw = rw; gh = rw / ga; }
          ctx.drawImage(geode, rx + (rw - gw) / 2, ry + (rh - gh) / 2, gw, gh);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // inside: the geode frame fills the viewport under the deck, drifting a little with the scroll
      if (inside) {
        const drift = 1 + 0.08 * Math.min(1, q / Q.pullOut[0]);
        const ga = geode.naturalWidth / geode.naturalHeight;
        let gw = W, gh = W / ga;
        if (gh < H) { gh = H; gw = H * ga; }
        gw *= drift; gh *= drift;
        ctx.drawImage(geode, (W - gw) / 2, (H - gh) / 2, gw, gh);
      }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const tick = () => {
      // the motes flicker on a clock only while they are on screen
      const p = progress.p, q = progress.q;
      const busy = (p > BEATS.vaporise[0] && p < BEATS.rebuild[1]) || (q > Q.vanish[0] && q < Q.vanish[1]);
      if (busy) { clock.t += 1 / 60; kick(); }
      if (!dead) setTimeout(tick, 1000 / 24);
    };

    const ro = new ResizeObserver(() => { size(); kick(); });
    ro.observe(canvas);
    const off = onProgress(kick);
    Promise.all([load(SRC.statue), load(SRC.closed), load(SRC.open), load(SRC.geode)]).then(([a, b, c, d]) => {
      if (dead) return;
      statue = grid(a, 1); closed = grid(b, 1); open = c; geode = d;
      size();
      draw();
      signalStatueReady();
      tick();
    }).catch(() => { signalStatueReady(); });
    return () => { dead = true; ro.disconnect(); off(); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="hero__canvas hero__canvas--statue">
      <canvas ref={ref} className="still-scene" aria-hidden="true" />
    </div>
  );
}
