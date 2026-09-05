"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BEATS, Q, ease, remap } from "./beats";
import { progress } from "./progress";
import { MODEL_VERSION } from "./Statue";
import { rigState } from "./rigState";
import { pointsState } from "./pointsState";

/**
 * The vaporise. One THREE.Points over the statue's sampled surface (tools/blender/03_sample_points.py).
 * Per point: t = clamp((u - delay * spread) / (1 - spread)), eased, so the dissolve sweeps up the figure.
 * Points push out along their normals, get caught in curl noise, drift up, scatter wide, and fade into the sky.
 * Colour goes marble to a spectrum with a hot white flash mid flight. Everything is a function of scroll.
 */
const FLOATS = 19; // posA nrmA colA posB nrmB colB delay

const vert = /* glsl */ `
  attribute vec3 nrmA;
  attribute vec3 colA;
  attribute vec3 posB;
  attribute vec3 colB;
  attribute float delayB;
  attribute float delay;
  attribute float seed;
  uniform float uProgress;   // 0..1 across the vaporise
  uniform float uRebuild;    // 0..1 across the rebuild
  uniform float uUnbuild;    // 0..1 as the pillar and laptop come apart again, top down
  uniform float uRigY;       // where the pillar rig sits now, relative to where it was sampled
  uniform float uSettle;     // 0..1 as the meshes surface and the settled dust dies from the base up
  uniform float uSpread;     // how much of the range the delay sweep takes
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScatter;
  uniform float uRise;
  varying vec3 vColor;
  varying float vT;
  varying float vFade;

  // cheap 3d noise and a curl built from it
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), f.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), f.x), f.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), f.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), f.x), f.y), f.z);
  }
  vec3 curl(vec3 p) {
    float e = 0.08;
    float nx1 = noise(p + vec3(0, e, 0)), nx2 = noise(p - vec3(0, e, 0));
    float ny1 = noise(p + vec3(0, 0, e)), ny2 = noise(p - vec3(0, 0, e));
    float nz1 = noise(p + vec3(e, 0, 0)), nz2 = noise(p - vec3(e, 0, 0));
    // three offset noise fields give a divergence free-ish swirl
    vec3 a = vec3(noise(p + 31.4 + vec3(0, e, 0)) - noise(p + 31.4 - vec3(0, e, 0)), ny1 - ny2, nx1 - nx2);
    vec3 b = vec3(nz1 - nz2, noise(p + 17.2 + vec3(e, 0, 0)) - noise(p + 17.2 - vec3(e, 0, 0)), noise(p + 5.1 + vec3(0, 0, e)) - noise(p + 5.1 - vec3(0, 0, e)));
    return (a - b) / (2.0 * e);
  }
  float easeOut(float t) { return 1.0 - pow(1.0 - t, 3.0); }

  float easeOutBack(float t) { float c1 = 1.70158; float c3 = c1 + 1.0; return 1.0 + c3 * pow(t - 1.0, 3.0) + c1 * pow(t - 1.0, 2.0); }

  void main() {
    if (uUnbuild > 0.0) {
      // the pillar and laptop come apart from the top, dust drifting up and left into the sky
      float t = clamp((uUnbuild - (1.0 - delayB) * uSpread) / (1.0 - uSpread), 0.0, 1.0);
      float te = easeOut(t);
      vT = t;
      vec3 jitter = normalize(hash3(vec3(seed * 5.3, seed * 8.9, seed * 2.7)));
      vec3 wind = normalize(vec3(-0.8, 0.9, 0.2));
      vec3 p = posB + vec3(0.0, uRigY, 0.0);
      float w = t * t;   // from rest, gathering speed
      p += curl(posB * 1.6 + vec3(uTime * 0.08, 0.0, 0.0) + t * 1.5) * (0.3 * sin(t * 3.14159) + 0.25 * t);
      p += (wind + jitter * 0.35) * w * 2.4 * (0.8 + 0.4 * seed);
      vFade = smoothstep(0.0, 0.02, t) * (1.0 - smoothstep(0.35, 1.0, t));
      vec3 stone = clamp(colB * 1.25 + 0.06, 0.0, 1.0);
      vec3 col = mix(stone, vec3(0.88, 0.92, 0.97), smoothstep(0.3, 1.0, t));
      float kind = fract(seed * 91.7);
      float flicker = step(0.5, fract(sin(seed * 517.3 + floor(uTime * 14.0 + seed * 40.0)) * 43758.5));
      float glitchShare = 0.10 + 0.35 * smoothstep(0.1, 0.8, t);
      if (kind < glitchShare) {
        float c = fract(seed * 13.1 + floor(uTime * 6.0 + seed * 20.0) * 0.37);
        vec3 prim = c < 0.33 ? vec3(1.0, 0.05, 0.1) : (c < 0.66 ? vec3(0.05, 1.0, 0.15) : vec3(0.1, 0.25, 1.0));
        col = mix(col, prim, flicker);
      } else if (kind > 0.96) {
        col = vec3(0.02);
      }
      vColor = col;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float size = (1.0 + 0.5 * smoothstep(0.0, 0.3, t)) * (1.0 - 0.5 * smoothstep(0.5, 1.0, t));
      gl_PointSize = max(1.0, floor(size * uPixelRatio * (7.5 / -mv.z) + 0.5));
      gl_Position = projectionMatrix * mv;
      return;
    }
    if (uRebuild > 0.0) {
      // phase B: the same motes come in from the left and settle onto the pillar and laptop, ground up
      float t = clamp((uRebuild - delayB * uSpread) / (1.0 - uSpread), 0.0, 1.0);
      float te = easeOutBack(t);
      vT = t;
      vec3 jitter = normalize(hash3(vec3(seed * 5.3, seed * 8.9, seed * 2.7)));
      vec3 from = posB + vec3(-4.5, 0.6, 0.0) + jitter * vec3(1.6, 1.2, 1.2) * (0.5 + seed);
      vec3 p = mix(from, posB, te);
      p += curl(posB * 1.6 + vec3(uTime * 0.08, 0.0, 0.0) + t * 1.5) * 0.35 * sin(t * 3.14159);
      // settled motes die from the base up as the marble surfaces beneath them
      float hB = clamp(posB.y / 1.35, 0.0, 1.0);
      float dead = smoothstep(hB - 0.05, hB + 0.05, uSettle);
      vFade = smoothstep(0.0, 0.03, t) * (1.0 - dead);
      vec3 stone = clamp(colB * 1.25 + 0.06, 0.0, 1.0);
      vec3 col = mix(vec3(0.88, 0.92, 0.97), stone, smoothstep(0.4, 1.0, t));
      float kind = fract(seed * 91.7);
      float flicker = step(0.5, fract(sin(seed * 517.3 + floor(uTime * 14.0 + seed * 40.0)) * 43758.5));
      float glitchShare = 0.10 + 0.35 * (1.0 - smoothstep(0.2, 0.9, t));
      if (kind < glitchShare) {
        float c = fract(seed * 13.1 + floor(uTime * 6.0 + seed * 20.0) * 0.37);
        vec3 prim = c < 0.33 ? vec3(1.0, 0.05, 0.1) : (c < 0.66 ? vec3(0.05, 1.0, 0.15) : vec3(0.1, 0.25, 1.0));
        col = mix(col, prim, flicker);
      } else if (kind > 0.96) {
        col = vec3(0.02);
      }
      vColor = col;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float size = 1.0 + 0.5 * (1.0 - smoothstep(0.6, 1.0, t));
      gl_PointSize = max(1.0, floor(size * uPixelRatio * (7.5 / -mv.z) + 0.5));
      gl_Position = projectionMatrix * mv;
      return;
    }
    float t = clamp((uProgress - delay * uSpread) / (1.0 - uSpread), 0.0, 1.0);
    float te = easeOut(t);
    vT = t;
    // crumble: a small break away from the surface, then the wind takes over, with turbulence riding on it
    vec3 jitter = normalize(hash3(vec3(seed * 7.1, seed * 3.3, seed * 9.7)));
    vec3 wind = normalize(vec3(1.0, 0.22, 0.15));
    vec3 p = position;
    p += nrmA * smoothstep(0.0, 0.25, t) * 0.03;
    // the same swirl the pillar arrives on: curl noise that peaks mid flight, on top of the wind
    p += curl(position * 1.6 + vec3(uTime * 0.08, 0.0, 0.0) + t * 1.5) * (0.45 * sin(t * 3.14159) + 0.35 * t);
    // and a slow vortex around the figure's axis as the dust lifts, so it spirals up and out
    float ang = t * t * 2.2 * (0.7 + 0.6 * seed);
    vec2 rel = p.xz - vec2(0.0, 0.0);
    p.xz = vec2(rel.x * cos(ang) - rel.y * sin(ang), rel.x * sin(ang) + rel.y * cos(ang));
    p += (wind + jitter * 0.35) * te * te * uScatter * (0.8 + 0.4 * seed);
    p.y += te * te * uRise * (0.5 + seed);
    // visible the moment the surface lets go, gone as it thins into the sky
    vFade = smoothstep(0.0, 0.02, t) * (1.0 - smoothstep(0.35, 1.0, t));
    // mostly stone, lifted out of its occlusion and drifting toward the sky's tint as it thins
    vec3 marble = clamp(colA * 1.35 + 0.08, 0.0, 1.0);
    vec3 col = mix(marble, vec3(0.88, 0.92, 0.97), smoothstep(0.3, 1.0, t));
    // signal breaking up: a share of motes become sub pixels in pure primaries, flickering on and off,
    // a few go dead black. More of them the further the dust has travelled.
    float kind = fract(seed * 91.7);
    float flicker = step(0.5, fract(sin(seed * 517.3 + floor(uTime * 14.0 + seed * 40.0)) * 43758.5));
    float glitchShare = 0.10 + 0.35 * smoothstep(0.1, 0.8, t);
    if (kind < glitchShare) {
      float c = fract(seed * 13.1 + floor(uTime * 6.0 + seed * 20.0) * 0.37);
      vec3 prim = c < 0.33 ? vec3(1.0, 0.05, 0.1) : (c < 0.66 ? vec3(0.05, 1.0, 0.15) : vec3(0.1, 0.25, 1.0));
      if (c > 0.9) prim = vec3(1.0, 0.1, 0.9);
      col = mix(col, prim, flicker);
    } else if (kind > 0.96) {
      col = vec3(0.02);  // dead pixel
    }
    vColor = col;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // whole device pixels so every mote sits on the pixel grid: 2 on the body, 3 in flight, 1 as it thins
    float size = (1.0 + 0.5 * smoothstep(0.0, 0.3, t)) * (1.0 - 0.5 * smoothstep(0.5, 1.0, t));
    gl_PointSize = max(1.0, floor(size * uPixelRatio * (7.5 / -mv.z) + 0.5));
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vT;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float soft = 1.0 - smoothstep(0.12, 0.25, d);
    float a = soft * vFade;
    // brighter and more additive while the dust is hot, then it settles to plain blending into the sky
    gl_FragColor = vec4(vColor * a, a);
  }
`;

type Buffers = { pos: Float32Array; nrm: Float32Array; col: Float32Array; delay: Float32Array; posB: Float32Array; colB: Float32Array; delayB: Float32Array; count: number };

async function loadPoints(set: "desktop" | "mobile"): Promise<Buffers> {
  const [bin, meta] = await Promise.all([
    fetch(`/points/${set}.bin?v=${MODEL_VERSION}`).then((r) => r.arrayBuffer()),
    fetch(`/points/${set}.json?v=${MODEL_VERSION}`).then((r) => r.json() as Promise<{ count: number }>),
  ]);
  const f = new Float32Array(bin);
  const n = meta.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3), delay = new Float32Array(n);
  const posB = new Float32Array(n * 3), colB = new Float32Array(n * 3), delayB = new Float32Array(n);
  let maxY = 0;
  for (let i = 0; i < n; i++) maxY = Math.max(maxY, f[i * FLOATS + 10]);
  pointsState.maxYB = maxY;
  pointsState.loaded = true;
  for (let i = 0; i < n; i++) {
    const o = i * FLOATS;
    pos[i * 3] = f[o]; pos[i * 3 + 1] = f[o + 1]; pos[i * 3 + 2] = f[o + 2];
    nrm[i * 3] = f[o + 3]; nrm[i * 3 + 1] = f[o + 4]; nrm[i * 3 + 2] = f[o + 5];
    col[i * 3] = f[o + 6]; col[i * 3 + 1] = f[o + 7]; col[i * 3 + 2] = f[o + 8];
    posB[i * 3] = f[o + 9]; posB[i * 3 + 1] = f[o + 10]; posB[i * 3 + 2] = f[o + 11];
    colB[i * 3] = f[o + 15]; colB[i * 3 + 1] = f[o + 16]; colB[i * 3 + 2] = f[o + 17];
    delay[i] = f[o + 18];
    // rebuild order: ground up on the pillar, with a little grain so the front is ragged
    delayB[i] = Math.min(1, (f[o + 10] / maxY) * 0.9 + ((i * 7919) % 1000) / 1000 * 0.06);
  }
  return { pos, nrm, col, delay, posB, colB, delayB, count: n };
}

export const VAPORISE = { start: BEATS.vaporise[0], end: BEATS.vaporise[1], spread: 0.6, sweep: 0.85 };
export const REBUILD = { start: BEATS.rebuild[0], end: BEATS.rebuild[1], spread: 0.6 };
/** the meshes surface and the settled dust dies over the last part of the rebuild */
export const SETTLE = { start: 0.7, end: 0.8 };

export function Morph({ set = "desktop", frozen = false }: { set?: "desktop" | "mobile"; frozen?: boolean }) {
  const [buf, setBuf] = useState<Buffers | null>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const points = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  // fetch during beat 1 and 2, not up front
  useEffect(() => {
    let alive = true;
    const t = setTimeout(
      () =>
        loadPoints(set)
          .then((b) => {
            (window as unknown as { __bdMorph?: unknown }).__bdMorph = { loaded: true, count: b.count };
            if (alive) setBuf(b);
          })
          .catch((e) => {
            (window as unknown as { __bdMorph?: unknown }).__bdMorph = { error: String(e) };
          }),
      1200,
    );
    return () => { alive = false; clearTimeout(t); };
  }, [set]);

  const geometry = useMemo(() => {
    if (!buf) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(buf.pos, 3));
    g.setAttribute("nrmA", new THREE.BufferAttribute(buf.nrm, 3));
    g.setAttribute("colA", new THREE.BufferAttribute(buf.col, 3));
    g.setAttribute("delay", new THREE.BufferAttribute(buf.delay, 1));
    g.setAttribute("posB", new THREE.BufferAttribute(buf.posB, 3));
    g.setAttribute("colB", new THREE.BufferAttribute(buf.colB, 3));
    g.setAttribute("delayB", new THREE.BufferAttribute(buf.delayB, 1));
    const seed = new Float32Array(buf.count);
    for (let i = 0; i < buf.count; i++) seed[i] = ((i * 2654435761) % 4294967296) / 4294967296;
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 6);
    return g;
  }, [buf]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uRebuild: { value: 0 },
      uUnbuild: { value: 0 },
      uRigY: { value: 0 },
      uSettle: { value: 0 },
      uSpread: { value: VAPORISE.spread },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uScatter: { value: 3.0 },
      uRise: { value: 1.4 },
    }),
    [],
  );

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m || !points.current) return;
    const p = progress.p;
    const u = ease.smooth(remap(p, VAPORISE.start, VAPORISE.end));
    const r = ease.smooth(remap(p, REBUILD.start, REBUILD.end));
    const settle = ease.smooth(remap(p, SETTLE.start, SETTLE.end));
    const unb = ease.smooth(remap(progress.q, Q.vanish[0], Q.vanish[1]));
    m.uniforms.uProgress.value = u;
    m.uniforms.uRebuild.value = r;
    m.uniforms.uSettle.value = settle;
    m.uniforms.uUnbuild.value = unb;
    m.uniforms.uRigY.value = rigState.y;
    (window as unknown as { __bdMorphU?: number }).__bdMorphU = u;
    m.uniforms.uPixelRatio.value = dpr;
    if (!frozen) m.uniforms.uTime.value += Math.min(dt, 0.05);
    points.current.visible = (u > 0.001 && settle < 0.999) || (unb > 0.001 && unb < 0.999);
  });

  if (!geometry) return null;
  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={10}>
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest
        blending={THREE.CustomBlending}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneMinusSrcAlphaFactor}
        blendSrcAlpha={THREE.OneFactor}
        blendDstAlpha={THREE.OneMinusSrcAlphaFactor}
      />
    </points>
  );
}
