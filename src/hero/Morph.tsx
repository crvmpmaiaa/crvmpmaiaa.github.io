"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BEATS, ease, remap } from "./beats";
import { progress } from "./progress";
import { MODEL_VERSION } from "./Statue";

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
  attribute float delay;
  attribute float seed;
  uniform float uProgress;   // 0..1 across the vaporise
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

  void main() {
    float t = clamp((uProgress - delay * uSpread) / (1.0 - uSpread), 0.0, 1.0);
    float te = easeOut(t);
    vT = t;
    // crumble: a small break away from the surface, then the wind takes over, with turbulence riding on it
    vec3 jitter = normalize(hash3(vec3(seed * 7.1, seed * 3.3, seed * 9.7)));
    vec3 wind = normalize(vec3(1.0, 0.22, 0.15));
    vec3 p = position;
    p += nrmA * smoothstep(0.0, 0.25, t) * 0.03;
    p += curl(position * 1.6 + vec3(uTime * 0.08, 0.0, 0.0) + t * 1.5) * (0.06 + 0.5 * t) * t;
    p += (wind + jitter * 0.35) * te * te * uScatter * (0.8 + 0.4 * seed);
    p.y += te * te * uRise * (0.5 + seed);
    // visible the moment the surface lets go, gone as it thins into the sky
    vFade = smoothstep(0.0, 0.02, t) * (1.0 - smoothstep(0.35, 1.0, t));
    // it stays stone: baked colour lifted out of its occlusion, drifting toward the sky's tint as it thins
    vec3 marble = clamp(colA * 1.35 + 0.08, 0.0, 1.0);
    vColor = mix(marble, vec3(0.88, 0.92, 0.97), smoothstep(0.3, 1.0, t));
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

type Buffers = { pos: Float32Array; nrm: Float32Array; col: Float32Array; delay: Float32Array; count: number };

async function loadPoints(set: "desktop" | "mobile"): Promise<Buffers> {
  const [bin, meta] = await Promise.all([
    fetch(`/points/${set}.bin?v=${MODEL_VERSION}`).then((r) => r.arrayBuffer()),
    fetch(`/points/${set}.json?v=${MODEL_VERSION}`).then((r) => r.json() as Promise<{ count: number }>),
  ]);
  const f = new Float32Array(bin);
  const n = meta.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3), delay = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * FLOATS;
    pos[i * 3] = f[o]; pos[i * 3 + 1] = f[o + 1]; pos[i * 3 + 2] = f[o + 2];
    nrm[i * 3] = f[o + 3]; nrm[i * 3 + 1] = f[o + 4]; nrm[i * 3 + 2] = f[o + 5];
    col[i * 3] = f[o + 6]; col[i * 3 + 1] = f[o + 7]; col[i * 3 + 2] = f[o + 8];
    delay[i] = f[o + 18];
  }
  return { pos, nrm, col, delay, count: n };
}

export const VAPORISE = { start: BEATS.vaporise[0], end: 0.97, spread: 0.6, sweep: 0.85 };

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
    const seed = new Float32Array(buf.count);
    for (let i = 0; i < buf.count; i++) seed[i] = ((i * 2654435761) % 4294967296) / 4294967296;
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), 6);
    return g;
  }, [buf]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uSpread: { value: VAPORISE.spread },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uScatter: { value: 3.4 },
      uRise: { value: 0.7 },
    }),
    [],
  );

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m || !points.current) return;
    const u = ease.smooth(remap(progress.p, VAPORISE.start, VAPORISE.end));
    m.uniforms.uProgress.value = u;
    (window as unknown as { __bdMorphU?: number }).__bdMorphU = u;
    m.uniforms.uPixelRatio.value = dpr;
    if (!frozen) m.uniforms.uTime.value += Math.min(dt, 0.05);
    points.current.visible = u > 0.001;
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
