"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A raymarched cathedral of arches, rendered once per frame to a small target and used as the portal backdrop.
 * Source shader supplied by Jack (Shadertoy style, licence to confirm before launch). Runs on a wall clock.
 */
const FRAG = /* glsl */ `
  in vec2 vUv;
  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;
  uniform float uVariant;   // 0: as supplied, 1: camera fixed forward
  uniform float uExposure;
  // original, verbatim apart from the variant switch and the exposure dial
  void mainImage(out vec4 fragColor, in vec2 fragCoord)
  {
      vec2  r  = iResolution.xy;
      float t  = iTime;
      vec3  FC = vec3(fragCoord, uVariant > 0.5 ? 0.5 * r.x : t);
      vec4  o  = vec4(0.0);
      vec3 p;
      for (float i, z, d; i++ < 5e1; o += (sin(p.y + vec4(6., 1., 2., 3.)) + 2.) / d / z)
      {
          p = z * normalize(FC.rgb * 2. - r.xyx) + t;
          z += d = length(vec2(
              length(cos(sin(.5 * p) + p).xy + 1.) - 2.,
              min(d = p.z - t + 9., d * .1) * .5
          ));
      }
      o = tanh(o * uExposure / 5e1);
      fragColor = vec4(o.rgb, 1.0);
  }
  void main() { mainImage(fragColor, vUv * iResolution.xy); }
`;

const FRAG_GEODE = /* glsl */ `
  in vec2 vUv;
  out vec4 fragColor;
  uniform vec3 iResolution;
  uniform float iTime;
  uniform float uVariant;
  uniform float uExposure;
  // "Geode", supplied by Jack, loop order corrected
  void mainImage(out vec4 fragColor, in vec2 fragCoord)
  {
    vec2  r  = iResolution.xy;
    float t  = iTime;
    vec3  FC = vec3(fragCoord, t);
    vec4  o  = vec4(0.0);
    vec3 p = vec3(0.0), v;
    // the supplied loop accumulated before the first march step, dividing by a zero distance and blowing the
    // frame out to white; accumulating after the step is what the shader clearly intends
    for (float i = 0.0, z = 0.0, d = 0.0; i++ < 40.0; )
    {
      p = z * normalize(FC.rgb * 2.0 - r.xyy);
      v = normalize(cos(t * 0.25 + vec3(0.0, 1.0, 4.0)));
      p = dot(v, p) * v + cross(v, p);
      p.z -= t;
      vec3 q = abs(fract(p) - 0.5);
      p = q + q.yzx - sin(z * 0.7);
      d = 0.3 * length(min(p, p.yzx));
      z += d;
      o += (cos(i * 0.2 + t + vec4(0.0, 1.0, 3.0, 0.0)) + 1.0) / max(d, 1e-4);
    }
    o = tanh(o * uExposure / 2000.0);
    fragColor = vec4(o.rgb, 1.0);
  }
  void main() { mainImage(fragColor, vUv * iResolution.xy); }
`;

export const SHADERS = { cathedral: FRAG, geode: FRAG_GEODE } as const;
export type ShaderName = keyof typeof SHADERS;

const VERT = /* glsl */ `
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/**
 * Screen space background on the portal layer: a fullscreen triangle drawn first, behind everything, with the
 * raymarch running per pixel. Works identically in the laptop's target and in the direct render, because it
 * ignores the camera and reads the size of whatever is being rendered to.
 */
export function ShaderQuad({ frozen = false, variant = 0, shader = "geode", exposure = 1 }: { frozen?: boolean; variant?: number; shader?: ShaderName; exposure?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: SHADERS[shader],
    uniforms: { iResolution: { value: new THREE.Vector3(1, 1, 1) }, iTime: { value: 0 }, uVariant: { value: variant }, uExposure: { value: exposure } },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }), [shader]);
  const clock = useRef(0);
  const size = useMemo(() => new THREE.Vector2(), []);
  useFrame((_, dt) => {
    if (!frozen) clock.current += Math.min(dt, 0.05);
    mat.uniforms.iTime.value = clock.current;
    mat.uniforms.uVariant.value = variant;
    mat.uniforms.uExposure.value = exposure;
  });
  return (
    <mesh
      frustumCulled={false}
      renderOrder={-1000}
      material={mat}
      onBeforeRender={(renderer) => {
        const t = renderer.getRenderTarget();
        if (t) size.set(t.width, t.height); else renderer.getDrawingBufferSize(size);
        mat.uniforms.iResolution.value.set(size.x, size.y, 1);
      }}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
