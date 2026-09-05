"use client";
import { useEffect, useRef } from "react";
import { WAVES_FRAG } from "./waves.frag";

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
const COLORS = [
  [0.102, 0.078, 0.137],
  [0.718, 0.365, 0.412],
  [0.918, 0.804, 0.761],
  [1.0, 0.961, 0.922],
];

/**
 * The Waves shader as a canvas behind the footer. Plain WebGL1, a fullscreen triangle, no libraries.
 * The loop pauses when the tab is hidden or the footer is off screen. Cursor off.
 */
export function WavesBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, WAVES_FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const flat = new Float32Array(24);
    COLORS.forEach((c, i) => { flat[i * 3] = c[0]; flat[i * 3 + 1] = c[1]; flat[i * 3 + 2] = c[2]; });
    gl.uniform3fv(u("u_colors"), flat);
    gl.uniform4f(u("u_shape"), 1.32, 0.49, 0.84, 0.01);
    gl.uniform4f(u("u_surface"), 1.73, 1.08, 0.07, 2.0);
    gl.uniform4f(u("u_finish"), 2.27, 0.0, 0.04, 0.35);
    gl.uniform4f(u("u_transform"), 4984.0, 3.37, 0.4, 1.0);
    gl.uniform4f(u("u_space"), -0.13, 0.05, 0.0, 0.0);
    gl.uniform4f(u("u_cursor"), 0.0, 3.0, 0.54, 0.56);
    const uScene = u("u_scene");

    let w = 0, h = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      w = Math.max(1, Math.floor(cw * dpr)); h = Math.max(1, Math.floor(ch * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    const ro = new ResizeObserver(size);
    ro.observe(canvas);
    size();

    let raf = 0, running = false, onScreen = false;
    const t0 = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = () => {
      raf = 0;
      if (!running) return;
      const seconds = reduced ? 0 : (performance.now() - t0) / 1000;
      gl.uniform4f(uScene, w, h, seconds * -0.67, 4.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    const update = () => {
      const should = onScreen && document.visibilityState === "visible";
      if (should && !running) { running = true; if (!raf) raf = requestAnimationFrame(frame); }
      if (!should) { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    };
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { threshold: 0.01 });
    io.observe(canvas);
    document.addEventListener("visibilitychange", update);
    return () => { running = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <canvas className="footer__waves" ref={ref} aria-hidden="true" />;
}
