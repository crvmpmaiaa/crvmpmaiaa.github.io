"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BEATS, ease, remap } from "./beats";
import { VAPORISE } from "./Morph";
import { progress } from "./progress";

// the version stamp defeats browser caching whenever the bake changes
export const MODEL_VERSION = "2026-09-04b";
export const STATUE = {
  lod0: `/models/statue-lod0.glb?v=${MODEL_VERSION}`,
  lod1: `/models/statue-lod1.glb?v=${MODEL_VERSION}`,
  /** LOD1 takes over during the dolly back */
  lodSwapAt: 0.2,
  height: 1.8,
  /** approximate head centre in the statue's own space (Y up, front is +Z) */
  head: new THREE.Vector3(-0.02, 1.62, 0.06),
  idleRadPerSec: 0.05,
};

const DRACO = "/draco/";

/** Shared dissolve uniforms: the cut height sweeps up the figure in step with the point launches. */
const dissolve = { uCut: { value: -1.0 }, uEdge: { value: 0.06 } };

const DISSOLVE_PARS = /* glsl */ `
  uniform float uCut;
  uniform float uEdge;
  varying vec3 vWorldPos;
  float dHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
  float dNoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dHash(i), dHash(i + vec3(1,0,0)), f.x), mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), f.x), mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
`;

function withDissolve(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCut = dissolve.uCut;
    shader.uniforms.uEdge = dissolve.uEdge;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + DISSOLVE_PARS)
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        // crumble from the feet up along a ragged, grainy edge that matches the point delays
        float h = vWorldPos.y / 1.8;
        float grain = dNoise(vWorldPos * 28.0) * 0.6 + dNoise(vWorldPos * 6.0) * 0.4;
        float edge = h + (grain - 0.5) * 0.22;
        if (edge < uCut) discard;
        // a faint darkening right at the edge, like stone breaking
        float rim = 1.0 - smoothstep(0.0, uEdge, edge - uCut);
        gl_FragColor.rgb *= 1.0 - rim * 0.35;`,
      );
  };
  mat.customProgramCacheKey = () => "dissolve";
}

function prepare(scene: THREE.Group) {
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const m = o as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.7;
      for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) if (t) t.anisotropy = 8;
      withDissolve(mat);
    }
  });
}

export function Statue({ frozen = false }: { frozen?: boolean }) {
  const lod0 = useGLTF(STATUE.lod0, DRACO);
  const lod1 = useGLTF(STATUE.lod1, DRACO);
  const group = useRef<THREE.Group>(null);
  const idle = useRef(0);

  const scenes = useMemo(() => {
    const a = lod0.scene;
    const b = lod1.scene;
    prepare(a);
    prepare(b);
    return { a, b };
  }, [lod0.scene, lod1.scene]);

  useEffect(() => {
    scenes.b.visible = false;
  }, [scenes]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = progress.p;
    // idle rotation runs on the wall clock in beat 1, then its weight eases to zero so the statue lands square at 0.30
    if (!frozen) idle.current += STATUE.idleRadPerSec * Math.min(dt, 0.05);
    const w = 1 - ease.inOut(remap(p, BEATS.reveal[0], BEATS.reveal[1]));
    g.rotation.y = idle.current * w;
    // the surface is cut away exactly where its points have launched: a point with delay d leaves when
    // u > d * spread, and d is roughly sweep * height, so the cut height is (u / spread) / sweep
    const u = ease.smooth(remap(p, VAPORISE.start, VAPORISE.end));
    dissolve.uCut.value = u <= 0 ? -1 : u / VAPORISE.spread / VAPORISE.sweep;
    const gone = dissolve.uCut.value > 1.3;
    const useLod0 = p < STATUE.lodSwapAt;
    scenes.a.visible = useLod0 && !gone;
    scenes.b.visible = !useLod0 && !gone;
  });

  return (
    <group ref={group}>
      <primitive object={scenes.a} />
      <primitive object={scenes.b} />
    </group>
  );
}

useGLTF.preload(STATUE.lod0, DRACO);
