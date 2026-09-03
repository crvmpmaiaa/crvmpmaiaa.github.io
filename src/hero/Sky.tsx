"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Fullscreen sky behind everything: a blue gradient with two layers of drifting cumulus from FBM noise.
 * Runs on a wall clock, independent of scroll. Under reduced motion the clock is frozen.
 */
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 6; i++) { v += a * noise(p); p = r * p * 2.05; a *= 0.5; }
    return v;
  }
  // soft cumulus: fbm shaped by a threshold, with a lit top and a shaded base
  vec4 cloudLayer(vec2 uv, float scale, float speed, float cover, float y0, float softness) {
    // cumulus are wider than they are tall: squash the noise domain horizontally, warp it gently
    vec2 p = vec2(uv.x * uAspect * scale * 0.55 + uTime * speed, uv.y * scale * 1.5);
    float d = fbm(p + (fbm(p * 0.7 + uTime * speed * 0.3) - 0.5) * 0.45);
    float band = smoothstep(y0 - 0.35, y0 + 0.05, uv.y) * (1.0 - smoothstep(y0 + 0.25, y0 + 0.6, uv.y));
    float a = smoothstep(cover, cover + softness, d) * band;
    float lit = smoothstep(cover - 0.05, cover + 0.35, d);
    vec3 col = mix(vec3(0.74, 0.79, 0.86), vec3(1.0), lit);
    return vec4(col, a);
  }
  void main() {
    float y = vUv.y;
    vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.45, y));
    sky = mix(sky, uTop, smoothstep(0.45, 1.0, y));
    vec4 c1 = cloudLayer(vUv, 1.7, 0.010, 0.50, 0.58, 0.16);
    vec4 c2 = cloudLayer(vUv + vec2(0.3, 0.1), 2.8, 0.018, 0.55, 0.32, 0.14);
    vec3 col = mix(sky, c2.rgb, c2.a * 0.85);
    col = mix(col, c1.rgb, c1.a * 0.95);
    // haze toward the horizon
    col = mix(col, uHorizon, (1.0 - smoothstep(0.0, 0.35, y)) * 0.35);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Sky({ frozen = false }: { frozen?: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uTop: { value: new THREE.Color("#2a63c4") },
      uMid: { value: new THREE.Color("#7fb0e6") },
      uHorizon: { value: new THREE.Color("#dbe9f6") },
    }),
    [],
  );
  useFrame((_, dt) => {
    if (!mat.current) return;
    mat.current.uniforms.uAspect.value = size.width / size.height;
    if (!frozen) mat.current.uniforms.uTime.value += Math.min(dt, 0.05);
  });
  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  );
}
