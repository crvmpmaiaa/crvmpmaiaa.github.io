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
  // original, verbatim apart from the variant switch on the third ray component
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
      o = tanh(o / 5e1);
      fragColor = vec4(o.rgb, 1.0);
  }
  void main() { mainImage(fragColor, vUv * iResolution.xy); }
`;

const VERT = /* glsl */ `
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/**
 * Screen space background on the portal layer: a fullscreen triangle drawn first, behind everything, with the
 * raymarch running per pixel. Works identically in the laptop's target and in the direct render, because it
 * ignores the camera and reads the size of whatever is being rendered to.
 */
export function ShaderQuad({ frozen = false, variant = 0 }: { frozen?: boolean; variant?: number }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { iResolution: { value: new THREE.Vector3(1, 1, 1) }, iTime: { value: 0 }, uVariant: { value: variant } },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }), []);
  const clock = useRef(0);
  const size = useMemo(() => new THREE.Vector2(), []);
  useFrame((_, dt) => {
    if (!frozen) clock.current += Math.min(dt, 0.05);
    mat.uniforms.iTime.value = clock.current;
    mat.uniforms.uVariant.value = variant;
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

/** the latest backdrop texture, read by the portal Backdrop */
export const shaderBackdrop: { texture: THREE.Texture | null } = { texture: null };

export function ShaderBackdrop({ frozen = false, width = 1280, height = 800, active = () => true, variant = 1 }: { frozen?: boolean; width?: number; height?: number; active?: () => boolean; variant?: number }) {
  const fbo = useFBO(width, height, { samples: 0, depthBuffer: false });
  const gl = useThree((s) => s.gl);
  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { iResolution: { value: new THREE.Vector3(width, height, 1) }, iTime: { value: 0 }, uVariant: { value: 1 } },
    depthTest: false,
    depthWrite: false,
  }), [width, height]);
  const clock = useRef(0);

  useEffect(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);
    // the shader writes display ready colour; do not re-encode it on the way out
    fbo.texture.colorSpace = THREE.SRGBColorSpace;
    shaderBackdrop.texture = fbo.texture;
    return () => { scene.remove(quad); quad.geometry.dispose(); shaderBackdrop.texture = null; };
  }, [scene, mat, fbo]);

  useFrame((_, dt) => {
    if (!active()) return;
    if (!frozen) clock.current += Math.min(dt, 0.05);
    mat.uniforms.iTime.value = clock.current;
    mat.uniforms.uVariant.value = variant;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
  }, -2);

  return null;
}
