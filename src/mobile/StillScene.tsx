"use client";
import { useEffect, useRef } from "react";
import { BEATS, Q, ease, remap } from "@/hero/beats";
import { onProgress, progress } from "@/hero/progress";
import { signalStatueReady } from "@/hero/introState";

/**
 * The phone version of the 3D scene: one 2D canvas driven by the same scroll progress, drawing stills
 * rendered from the real models. The whole statue stands on the left and eases back as the camera would,
 * then breaks into square motes that blow off to the right; the bare pillar assembles from the left out of
 * the same motes on the right of the frame; a phone rises onto it; its screen zooms until it spans the
 * viewport, where a dark backdrop takes over under the card deck; on the way out the zoom reverses and
 * the pillar blows away. Nothing here touches WebGL.
 */

const SRC = {
  statue: "/images/mobile/statue-full.webp",  // the whole figure on its plinth, trimmed
  pillar: "/images/mobile/pillar-bare.webp",   // the column with nothing on top
};
const CELL = 6;  // css px per mote at the size the object is drawn when it breaks up

/** where the pillar stands: right of centre so the copy has the left */
const PILLAR = { cx: 0.7, bottom: 0.76, width: 0.3 };
/** the phone standing on the cap, in pillar widths */
const PHONE = { w: 0.5, h: 1.02, r: 0.075, bezel: 0.035 };

type Cell = { u: number; v: number; t: number; s1: number; s2: number; s3: number };
type Sprite = { img: HTMLImageElement; cells: Cell[]; cols: number; rows: number };

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function hash(n: number) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
/** grid the image into cells with a break-up order: bottom first, ragged */
function grid(img: HTMLImageElement, drawnWidth: number): Sprite {
  const cols = Math.max(8, Math.round(drawnWidth / CELL));
  const rows = Math.max(8, Math.round(cols * img.naturalHeight / img.naturalWidth));
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const yUp = 1 - r / rows;
    cells.push({ u: c / cols, v: r / rows, t: Math.min(1, yUp * 0.85 + hash(i) * 0.15), s1: hash(i + 1e4), s2: hash(i + 2e4), s3: hash(i + 3e4) });
  }
  return { img, cells, cols, rows };
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function StillScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let dead = false, raf = 0, W = 0, H = 0, dpr = 1;
    let statue: Sprite | null = null, pillar: Sprite | null = null;
    const clock = { t: 0 };

    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (statue) statue = grid(statue.img, (H * 0.62) * statue.img.naturalWidth / statue.img.naturalHeight);
      if (pillar) pillar = grid(pillar.img, W * PILLAR.width);
    };

    /** draw a sprite whole, or as motes blowing right (`out` 0..1) or assembling from the left (`assemble` 0..1) */
    const drawSprite = (sp: Sprite, x: number, y: number, w: number, h: number, out: number, assemble: number, seedShift: number) => {
      if (out <= 0 && assemble >= 1) { ctx.drawImage(sp.img, x, y, w, h); return; }
      const iw = sp.img.naturalWidth, ih = sp.img.naturalHeight;
      const cw = w / sp.cols, ch = h / sp.rows;
      const sw = iw / sp.cols, sh = ih / sp.rows;
      const frame = Math.floor(clock.t * 24);
      for (const c of sp.cells) {
        const local = out > 0
          ? Math.min(1, Math.max(0, (out * 1.45 - c.t) / 0.5))
          : 1 - Math.min(1, Math.max(0, (assemble * 1.45 - c.t) / 0.5));
        if (local >= 1) continue;
        const dx = x + c.u * w, dy = y + c.v * h;
        if (local <= 0) { ctx.drawImage(sp.img, c.u * iw, c.v * ih, sw, sh, dx, dy, cw + 0.5, ch + 0.5); continue; }
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
          ctx.drawImage(sp.img, c.u * iw, c.v * ih, sw, sh, px, py, cw * k, ch * k);
        }
      }
      ctx.globalAlpha = 1;
    };

    /** the dark ground inside the phone: near black with a soft blue glow rising from the bottom */
    const drawBackdrop = (x: number, y: number, w: number, h: number, drift: number) => {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#07090f"); g.addColorStop(0.55, "#0b1630"); g.addColorStop(1, "#173d7a");
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const rg = ctx.createRadialGradient(x + w * (0.5 + 0.1 * drift), y + h * (0.85 - 0.1 * drift), 0, x + w * 0.5, y + h * 0.85, w * 0.9);
      rg.addColorStop(0, "rgba(127, 176, 230, 0.35)"); rg.addColorStop(1, "rgba(127, 176, 230, 0)");
      ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
    };

    /** the phone, standing on the cap, in a coordinate space where (0,0) is the bottom centre of its body */
    const drawPhone = (cx: number, baseY: number, pw: number, alpha: number, screenDrift: number) => {
      const ph = pw * PHONE.h / PHONE.w, r = pw * PHONE.r / PHONE.w, b = pw * PHONE.bezel / PHONE.w;
      const x = cx - pw / 2, y = baseY - ph;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(20, 32, 46, 0.35)"; roundRect(ctx, x + pw * 0.05, baseY - ph * 0.02, pw * 0.9, ph * 0.04, r * 0.5); ctx.fill();  // contact shadow
      ctx.fillStyle = "#101418"; roundRect(ctx, x, y, pw, ph, r); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = Math.max(0.5, pw * 0.01); ctx.stroke();
      ctx.save(); roundRect(ctx, x + b, y + b, pw - 2 * b, ph - 2 * b, r * 0.7); ctx.clip();
      drawBackdrop(x + b, y + b, pw - 2 * b, ph - 2 * b, screenDrift);
      ctx.restore();
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
        const capY = py + ph * 0.045;                     // the top face of the cap sits a little below the image top
        const phoneW = pw * PHONE.w, phoneH = phoneW * PHONE.h / PHONE.w;
        const b = phoneW * PHONE.bezel / PHONE.w;
        const scx = W * PILLAR.cx, scy = capY - phoneH / 2;  // screen centre
        const sFull = (W / (phoneW - 2 * b)) * 1.02;
        const zz = inside ? 1 : zoom * (1 - back);
        const s = 1 + (sFull - 1) * zz;
        const tx = (W / 2 - scx) * zz, ty = (H / 2 - scy) * zz;
        ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (scx * (1 - s) + tx), dpr * (scy * (1 - s) + ty));
        drawSprite(pillar, px, py, pw, ph, gone, Math.max(0, rb), 3);
        if (rise > 0 && gone <= 0) drawPhone(W * PILLAR.cx, capY + (1 - rise) * phoneH * 0.25, phoneW, rise, Math.min(1, q / Q.pullOut[0]));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      // inside: the same backdrop fills the viewport under the deck
      if (inside) drawBackdrop(0, 0, W, H, Math.min(1, q / Q.pullOut[0]));
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const tick = () => {
      const p = progress.p, q = progress.q;
      const busy = (p > BEATS.vaporise[0] && p < BEATS.rebuild[1]) || (q > Q.vanish[0] && q < Q.vanish[1]);
      if (busy) { clock.t += 1 / 60; kick(); }
      if (!dead) setTimeout(tick, 1000 / 24);
    };

    const ro = new ResizeObserver(() => { size(); kick(); });
    ro.observe(canvas);
    const off = onProgress(kick);
    Promise.all([load(SRC.statue), load(SRC.pillar)]).then(([a, b]) => {
      if (dead) return;
      statue = grid(a, 1); pillar = grid(b, 1);
      size(); draw();
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
