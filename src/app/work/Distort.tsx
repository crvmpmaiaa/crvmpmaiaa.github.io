"use client";
import { useEffect, useRef } from "react";

/**
 * The hover distortion on a work preview, the way Zera does it: the image is redrawn on a 2D canvas as
 * horizontal bands, and each band is pushed sideways by how fast the pointer is moving, with a sine that
 * flips direction from one band to the next so neighbouring slices shear against each other. The push is
 * strongest around the cursor's row and fades with distance, and the velocity decays so the image settles
 * a moment after the pointer stops. Pure canvas, no WebGL, nothing runs while the pointer is still.
 */
export function Distort({ src, bands = 42 }: { src: string; bands?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, active: false });
  const kick = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let raf = 0, dead = false, running = false;
    const img = new Image();
    img.decoding = "async";

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(r.width * dpr)), h = Math.max(1, Math.floor(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    // cover-fit, then offset by (dx, dy)
    const cover = (dx: number, dy: number) => {
      const W = canvas.width, H = canvas.height;
      const ia = img.naturalWidth / img.naturalHeight, ca = W / H;
      let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
      if (ia > ca) { sw = img.naturalHeight * ca; sx = (img.naturalWidth - sw) / 2; }
      else { sh = img.naturalWidth / ca; sy = (img.naturalHeight - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, W, H);
    };
    const draw = () => {
      if (dead) return;
      const W = canvas.width, H = canvas.height, s = state.current;
      ctx.clearRect(0, 0, W, H);
      const strength = Math.min(1, 18 * Math.hypot(s.vx, s.vy));
      const bh = Math.ceil(H / bands);
      const t = performance.now();
      for (let i = 0; i < bands; i++) {
        const y0 = i * bh;
        const d = y0 / H - s.y;
        const near = Math.exp(-(d * d) / 0.018);
        const wave = Math.sin(0.82 * i + 0.012 * t) * strength * near;
        const dx = (0.34 * s.vx + 0.55 * wave) * W * near;
        const dy = s.vy * H * 0.055 * near;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y0, W, bh + 1);
        ctx.clip();
        cover(dx, dy);
        ctx.restore();
      }
      const decay = s.active ? 0.88 : 0.82;
      s.vx *= decay; s.vy *= decay;
      if (s.active || Math.abs(s.vx) > 5e-4 || Math.abs(s.vy) > 5e-4) raf = requestAnimationFrame(draw);
      else { running = false; raf = 0; canvas.classList.remove("is-live"); }
    };
    const start = () => { if (dead || running) return; running = true; canvas.classList.add("is-live"); raf = requestAnimationFrame(draw); };
    kick.current = start;
    img.onload = () => { if (!dead) size(); };
    img.src = src;
    const ro = new ResizeObserver(() => size());
    ro.observe(canvas);
    return () => { dead = true; kick.current = null; ro.disconnect(); cancelAnimationFrame(raf); };
  }, [src, bands]);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const s = state.current;
    s.vx += x - s.px; s.vy += y - s.py;
    s.x = x; s.y = y; s.px = x; s.py = y; s.active = true;
    kick.current?.();
  };
  const leave = () => { state.current.active = false; };

  return <canvas ref={ref} className="wp__distort" aria-hidden="true" onPointerMove={move} onPointerEnter={move} onPointerLeave={leave} style={{ pointerEvents: "auto" }} />;
}
