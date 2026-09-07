/**
 * The geode raymarch on its own small WebGL2 canvas, for phones. A raymarch costs per pixel, so at a fifth of
 * the screen's size it is cheap, and the 2D scene draws it scaled up into the laptop screen and, once inside,
 * across the whole viewport. One context, one triangle, no models, so nothing for the phone to run out of.
 */
import { SHADERS } from "@/portal/ShaderBackdrop";

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export type Geode = { canvas: HTMLCanvasElement; render: (t: number) => void; resize: (w: number, h: number) => void; dispose: () => void };

export function createGeode(exposure = 0.55): Geode | null {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "low-power" });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!; gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(sh)); return null; }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float;\n" + SHADERS.geode);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const u = {
    res: gl.getUniformLocation(prog, "iResolution"), time: gl.getUniformLocation(prog, "iTime"),
    variant: gl.getUniformLocation(prog, "uVariant"), exposure: gl.getUniformLocation(prog, "uExposure"), scale: gl.getUniformLocation(prog, "uScale"),
  };
  gl.uniform1f(u.variant, 0); gl.uniform1f(u.exposure, exposure); gl.uniform2f(u.scale, 1, 1);
  const resize = (w: number, h: number) => {
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform3f(u.res, w, h, 1);
  };
  resize(144, 312);
  const render = (t: number) => { gl.uniform1f(u.time, t); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const dispose = () => { gl.getExtension("WEBGL_lose_context")?.loseContext(); };
  return { canvas, render, resize, dispose };
}
