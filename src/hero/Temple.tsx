"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Q, ease, remap } from "./beats";
import { progress } from "./progress";
import { MODEL_VERSION } from "./Statue";

const TEMPLE = `/models/temple.glb?v=${MODEL_VERSION}`;
const DRACO = "/draco/";

/** The hand holding the temple. Rises out of the dust where the pillar stood and holds, turning slowly. */
export function Temple({ frozen = false }: { frozen?: boolean }) {
  const gltf = useGLTF(TEMPLE, DRACO);
  const group = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const scene = useMemo(() => {
    const s = gltf.scene;
    s.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
    return s;
  }, [gltf.scene]);

  const size = useThree((st) => st.size);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (!frozen) clock.current += Math.min(dt, 0.05);
    const rise = ease.out(remap(progress.q, Q.hand[0], Q.hand[1]));
    g.visible = rise > 0;
    g.position.y = THREE.MathUtils.lerp(-5.2, 0, rise);
    // during the work deck the hand sits on the left golden line and the cards take the right
    const work = ease.inOut(remap(progress.q, Q.work[0] - 0.03, Q.work[0] + 0.05));
    // on a phone the work cards run full width, so the temple only steps a little left and shows above them
    g.position.x = THREE.MathUtils.lerp(0, size.width / size.height > 1.2 ? -2.5 : -0.45, work);
    // clockwise seen from above, steady
    g.rotation.y = -0.35 + clock.current * 0.16;
  });

  return (
    <group ref={group} visible={false} scale={1.2}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(TEMPLE, DRACO);
