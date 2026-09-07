"use client";
import { useEffect, useRef } from "react";
import { BEATS, Q, ease, remap } from "@/hero/beats";
import { onProgress, progress } from "@/hero/progress";
import { signalStatueReady } from "@/hero/introState";
import { createGeode, type Geode } from "./geode";

/**
 * The phone version of the 3D scene: one 2D canvas driven by the same scroll progress, drawing stills
 * rendered from the real models. The whole statue stands on the left and eases back as the camera would,
 * then breaks into square motes that blow off to the right; the bare pillar assembles from the left out of
 * the same motes on the right of the frame; a phone rises onto it; its screen zooms until it spans the
 * viewport, where a dark backdrop takes over under the card deck; on the way out the zoom reverses and
 * the pillar blows away. Nothing here touches WebGL.
 */

const SRC = {
  statue: "/images/mobile/statue-full.webp",  // the whole figure on its plinth, trimmed (1220 x 2395)
  pillar: "/images/mobile/pillar-bare.webp",   // the column with nothing on top (656 x 1700)
  laptop: "/images/mobile/laptop.webp",        // the open laptop cut from the same framing (658 x 268)
};
/** the laptop against the pillar, in the pillar's pixel scale: same width, its base 39px below the cap's top edge */
const LAPTOP = { w: 658 / 656, drop: 39 / 656 };
/** the screen inside the laptop cutout, as fractions of it */
const SCREEN = { x: 141 / 658, y: 16 / 268, w: 381 / 658, h: 221 / 268 };
const CELL = 8;  // css px per mote at the size the object is drawn when it breaks up
const GEODE_SPEED = 0.3, GEODE_EXPOSURE = 0.55;  // the dials the desktop uses

/** where the pillar stands: right of centre so the copy has the left */
const PILLAR = { cx: 0.7, bottom: 0.76, width: 0.3 };

type Cell = { u: number; v: number; t: number; s1: number; s2: number; s3: number };
type Sprite = { img: HTMLImageElement; src: CanvasImageSource; sw: number; sh: number; cells: Cell[]; cols: number; rows: number };

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function hash(n: number) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
/** grid the image into cells with a break-up order: bottom first, ragged */
function grid(img: HTMLImageElement, drawnWidth: number, dpr = 1): Sprite {
  const cols = Math.max(8, Math.round(drawnWidth / CELL));
  const rows = Math.max(8, Math.round(cols * img.naturalHeight / img.naturalWidth));
  // pre-scale once to the size it will be drawn at, so the per-mote draws copy pixels instead of resampling
  const sw = Math.max(1, Math.round(drawnWidth * dpr)), sh = Math.max(1, Math.round(sw * img.naturalHeight / img.naturalWidth));
  let src: CanvasImageSource = img;
  if (drawnWidth > 1) {
    const c = document.createElement("canvas"); c.width = sw; c.height = sh;
    const cx = c.getContext("2d"); if (cx) { cx.drawImage(img, 0, 0, sw, sh); src = c; }
  }
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const yUp = 1 - r / rows;
    cells.push({ u: c / cols, v: r / rows, t: Math.min(1, yUp * 0.85 + hash(i) * 0.15), s1: hash(i + 1e4), s2: hash(i + 2e4), s3: hash(i + 3e4) });
  }
  return { img, src, sw: src === img ? img.naturalWidth : sw, sh: src === img ? img.naturalHeight : sh, cells, cols, rows };
}

export function StillScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let dead = false, raf = 0, W = 0, H = 0, dpr = 1;
    let statue: Sprite | null = null, pillar: Sprite | null = null, laptop: HTMLImageElement | null = null;
    let geode: Geode | null = null, geodeFailed = false;
    const clock = { t: 0 };

    const size = () => {
      // the wrapper is sized to the largest viewport, so the toolbar collapsing never resizes the canvas mid scroll
      const d = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === W && h === H && d === dpr) return false;
      dpr = d; W = w; H = h;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (statue) statue = grid(statue.img, (H * 0.8) * statue.img.naturalWidth / statue.img.naturalHeight, dpr);
      if (pillar) pillar = grid(pillar.img, W * PILLAR.width, dpr);
      geode?.resize(Math.round(W / 3), Math.round(H / 3));
      return true;
    };

    /** draw a sprite whole, or as motes blowing right (`out` 0..1) or assembling from the left (`assemble` 0..1) */
    const drawSprite = (sp: Sprite, x: number, y: number, w: number, h: number, out: number, assemble: number, seedShift: number) => {
      if (out <= 0 && assemble >= 1) { ctx.drawImage(sp.src, 0, 0, sp.sw, sp.sh, x, y, w, h); return; }
      const iw = sp.sw, ih = sp.sh;
      const cw = w / sp.cols, ch = h / sp.rows;
      const sw = iw / sp.cols, sh = ih / sp.rows;
      const frame = Math.floor(clock.t * 24);
      for (const c of sp.cells) {
        const local = out > 0
          ? Math.min(1, Math.max(0, (out * 1.45 - c.t) / 0.5))
          : 1 - Math.min(1, Math.max(0, (assemble * 1.45 - c.t) / 0.5));
        if (local >= 1) continue;
        const dx = x + c.u * w, dy = y + c.v * h;
        if (local <= 0) { ctx.drawImage(sp.src, c.u * iw, c.v * ih, sw, sh, dx, dy, cw + 0.5, ch + 0.5); continue; }
        const e = local * local * (3 - 2 * local);
        const dir = out > 0 ? 1 : -1;
        const px = dx + dir * Math.pow(local, 1.4) * W * (0.7 + 0.5 * c.s1) + Math.sin(local * 7 + c.s2 * 12 + seedShift) * 16 * local;
        const py = dy - e * H * 0.22 * (c.s2 - 0.25) + Math.sin(local * 5 + c.s1 * 9) * 10 * local;
        const k = 1 - 0.45 * e;
        ctx.globalAlpha = 1 - e * e;
        if (c.s3 < 0.14 && local > 0.04 && local < 0.85) {
          const n = (frame + Math.floor(c.s1 * 40)) % 7;
          ctx.fillStyle = ["#ff2d55", "#37ff6a", "#3a6bff", "#ffffff", "#0c0c0c", "#ffffff", "#f5f5f5"][n];
          ctx.fillRect(px, py, cw * k, ch * k);
        } else {
          ctx.drawImage(sp.src, c.u * iw, c.v * ih, sw, sh, px, py, cw * k, ch * k);
        }
      }
      ctx.globalAlpha = 1;
    };

    /** the ground inside the laptop: the geode, covering the rect; a dark gradient if WebGL is not there */
    const drawBackdrop = (x: number, y: number, w: number, h: number) => {
      if (geode) {
        const gw = geode.canvas.width, gh = geode.canvas.height, ga = gw / gh, ra = w / h;
        let dw = w, dh = h;
        if (ga > ra) { dh = h; dw = h * ga; } else { dw = w; dh = w / ga; }
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.drawImage(geode.canvas, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        ctx.restore();
        return;
      }
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#07090f"); g.addColorStop(0.55, "#0b1630"); g.addColorStop(1, "#173d7a");
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    };

    /** the laptop on the cap, its screen showing the same ground the inside will show */
    const drawLaptop = (x: number, y: number, w: number, alpha: number) => {
      if (!laptop) return;
      const h = w * laptop.naturalHeight / laptop.naturalWidth;
      ctx.globalAlpha = alpha;
      ctx.drawImage(laptop, x, y, w, h);
      drawBackdrop(x + SCREEN.x * w, y + SCREEN.y * h, SCREEN.w * w, SCREEN.h * h);
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      raf = 0;
      if (dead || !statue || !pillar) return;
      const p = progress.p, q = progress.q;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // statue: the whole figure on the left, large at the open, easing back and down as the copy arrives
      const reveal = ease.inOut(remap(p, BEATS.reveal[0], BEATS.reveal[1]));
      const hold = ease.inOut(remap(p, BEATS.hold[0], BEATS.hold[1]));
      const vap = remap(p, BEATS.vaporise[0], BEATS.vaporise[1]);
      if (vap < 1) {
        const sh = H * (0.8 - 0.18 * reveal - 0.02 * hold);
        const sw = sh * statue.img.naturalWidth / statue.img.naturalHeight;
        const sx = W * (0.04 - 0.02 * reveal) + (W * 0.12) * hold;
        const sy = H - sh - H * (0.05 + 0.06 * reveal);
        drawSprite(statue, sx, sy, sw, sh, vap, 1, 0);
      }

      // pillar: assembles on the right as the dust settles; the phone rises onto it; its screen fills the frame
      const rb = remap(p, BEATS.rebuild[0], BEATS.rebuild[1]);
      const rise = ease.out(remap(p, BEATS.turn[0], BEATS.turn[1]));
      const zoom = ease.inOut(remap(p, BEATS.screen[0], BEATS.screen[1]));
      const back = ease.inOut(remap(q, Q.pullOut[0], Q.pullOut[1]));  // 1 = fully out again
      const gone = remap(q, Q.vanish[0], Q.vanish[1]);                  // pillar blows away on the way out
      const inside = p >= BEATS.screen[1] - 0.001 && back < 1;
      if (rb > 0 && gone < 1) {
        const pw = W * PILLAR.width, ph = pw * pillar.img.naturalHeight / pillar.img.naturalWidth;
        const px = W * PILLAR.cx - pw / 2, py = H * PILLAR.bottom - ph;
        const lw = pw * LAPTOP.w, lh = lw * laptop!.naturalHeight / laptop!.naturalWidth;
        const lx = W * PILLAR.cx - lw / 2, ly = py + pw * LAPTOP.drop - lh;   // resting on the cap
        const scx = lx + (SCREEN.x + SCREEN.w / 2) * lw, scy = ly + (SCREEN.y + SCREEN.h / 2) * lh;  // screen centre
        const sFull = Math.max(W / (SCREEN.w * lw), H / (SCREEN.h * lh)) * 1.02;
        const zz = inside ? 1 : zoom * (1 - back);
        const s = 1 + (sFull - 1) * zz;
        const tx = (W / 2 - scx) * zz, ty = (H / 2 - scy) * zz;
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (scx * (1 - s) + tx), dpr * (scy * (1 - s) + ty));
        drawSprite(pillar, px, py, pw, ph, gone, Math.max(0, rb), 3);
        if (rise > 0 && gone <= 0) drawLaptop(lx, ly - (1 - rise) * lh * 0.35, lw, rise);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      // inside: the same backdrop fills the viewport under the deck
      if (inside) drawBackdrop(0, 0, W, H);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    let last = 0;
    const tick = (now: number) => {
      if (dead) return;
      const p = progress.p, q = progress.q;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      const dusty = (p > BEATS.vaporise[0] && p < BEATS.rebuild[1]) || (q > Q.vanish[0] && q < Q.vanish[1]);
      const screenOn = p > BEATS.turn[0] && q < Q.pullOut[1] && !(q > Q.vanish[0]);
      if (screenOn && !geode && !geodeFailed) { geode = createGeode(GEODE_EXPOSURE); if (geode) geode.resize(Math.round(W / 3), Math.round(H / 3)); else geodeFailed = true; }
      if (!screenOn && geode) { geode.dispose(); geode = null; }
      if (geode) { clock.t += dt; geode.render(clock.t * GEODE_SPEED); if (raf) cancelAnimationFrame(raf); draw(); }
      else if (dusty) { clock.t += dt; kick(); }
      requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(() => { if (size()) draw(); });
    ro.observe(canvas);
    const off = onProgress(kick);
    Promise.all([load(SRC.statue), load(SRC.pillar), load(SRC.laptop)]).then(([a, b, c]) => {
      if (dead) return;
      statue = grid(a, 1); pillar = grid(b, 1); laptop = c;
      size(); draw();
      signalStatueReady();
      requestAnimationFrame(tick);
    }).catch(() => { signalStatueReady(); });
    return () => { dead = true; ro.disconnect(); off(); if (raf) cancelAnimationFrame(raf); geode?.dispose(); };
  }, []);

  return (
    <div className="hero__canvas hero__canvas--statue still-wrap">
      <canvas ref={ref} className="still-scene" aria-hidden="true" />
    </div>
  );
}
