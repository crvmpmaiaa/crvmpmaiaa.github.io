"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BEATS, ease, remap } from "./beats";
import { VAPORISE } from "./Morph";
import { makeDissolve, applyDissolve } from "./dissolve";
import { signalStatueReady } from "./introState";
import { progress } from "./progress";

// the version stamp defeats browser caching whenever the bake changes
export const MODEL_VERSION = "2026-09-05b";
/** phones get the 1024 texture bake: the 2048 set is about 130 MB of GPU memory per LOD and Safari kills the tab */
export const PHONE = typeof window !== "undefined" && window.innerWidth < 820;
export const STATUE = {
  lod0: `/models/statue-lod0${PHONE ? "-m" : ""}.glb?v=${MODEL_VERSION}`,
  lod1: `/models/statue-lod1${PHONE ? "-m" : ""}.glb?v=${MODEL_VERSION}`,
  /** LOD1 takes over during the dolly back */
  lodSwapAt: 0.2,
  height: 1.8,
  /** approximate head centre in the statue's own space (Y up, front is +Z) */
  head: new THREE.Vector3(-0.02, 1.62, 0.06),
  idleRadPerSec: 0.05,
};

const DRACO = "/draco/";

export const statueDissolve = makeDissolve(1.8, false, 0.4);

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
      applyDissolve(mat, statueDissolve, "statue-dissolve");
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
    // one frame after the first model is in the scene graph, the intro can start
    const id = requestAnimationFrame(() => signalStatueReady());
    return () => cancelAnimationFrame(id);
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
    statueDissolve.uCut.value = u <= 0 ? -1 : u / VAPORISE.spread / VAPORISE.sweep;
    const gone = statueDissolve.uCut.value > 1.3;
    const useLod0 = p < STATUE.lodSwapAt;
    scenes.a.visible = useLod0 && !gone;
    scenes.b.visible = !useLod0 && !gone;
    // the shadow pass ignores the dissolve: drop the shadow once the figure is more than half gone
    const shadow = statueDissolve.uCut.value < 0.6;
    for (const sc of [scenes.a, scenes.b]) sc.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = shadow; });
  });

  return (
    <group ref={group}>
      <primitive object={scenes.a} />
      <primitive object={scenes.b} />
    </group>
  );
}

useGLTF.preload(STATUE.lod0, DRACO);
