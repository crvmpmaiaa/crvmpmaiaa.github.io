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

function prepare(scene: THREE.Group) {
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const m = o as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.7;
      mat.transparent = true;
      mat.depthWrite = true;
      for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) if (t) t.anisotropy = 8;
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
    // the mesh leaves over the first part of the vaporise while the points take over
    const u = ease.smooth(remap(p, VAPORISE.start, VAPORISE.end));
    const opacity = 1 - remap(u, 0.02, 0.2);
    const useLod0 = p < STATUE.lodSwapAt;
    scenes.a.visible = useLod0 && opacity > 0;
    scenes.b.visible = !useLod0 && opacity > 0;
    for (const sc of [scenes.a, scenes.b]) {
      sc.traverse((o) => {
        const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mm && mm.opacity !== opacity) mm.opacity = opacity;
      });
    }
  });

  return (
    <group ref={group}>
      <primitive object={scenes.a} />
      <primitive object={scenes.b} />
    </group>
  );
}

useGLTF.preload(STATUE.lod0, DRACO);
