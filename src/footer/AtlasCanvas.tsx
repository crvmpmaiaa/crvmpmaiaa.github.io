"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const ATLAS = `/models/atlas${typeof window !== "undefined" && window.innerWidth < 820 ? "-m" : ""}.glb?v=2026-09-05b`;
const DRACO = "/draco/";

/** the yaw at which Atlas faces the viewer; ?atlasYaw= on the URL overrides it and holds him still, for QA */
const qaYaw = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("atlasYaw") : null;
const FRONT = qaYaw !== null ? Number(qaYaw) : -Math.PI / 2;

function Atlas({ visible }: { visible: boolean }) {
  const gltf = useGLTF(ATLAS, DRACO);
  const group = useRef<THREE.Group>(null);
  // every time the footer comes into view he starts facing forward, then turns
  useEffect(() => { if (visible && group.current) group.current.rotation.y = FRONT; }, [visible]);
  const scene = useMemo(() => {
    const s = gltf.scene;
    s.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const m = o as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      const src = m.material as THREE.MeshStandardMaterial;
      const isGlobe = /sphere/i.test(m.name) || /sphere/i.test(src.name ?? "");
      if (isGlobe) {
        // the world stays bronze: the one warm note
        src.envMapIntensity = 0.9;
        return;
      }
      // the figure is carved in the site's marble, keeping the model's own surface detail
      m.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#e4e1dc"),
        roughness: 0.42,
        metalness: 0,
        clearcoat: 0.15,
        clearcoatRoughness: 0.6,
        normalMap: src.normalMap ?? null,
        normalScale: new THREE.Vector2(0.8, 0.8),
        envMapIntensity: 0.6,
      });
    });
    return s;
  }, [gltf.scene]);
  const reduced = useRef(false);
  useEffect(() => { reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useFrame((_, dt) => {
    if (!group.current || reduced.current || qaYaw !== null) return;
    group.current.rotation.y += Math.min(dt, 0.05) * 0.22;
  });
  return (
    <group ref={group} position={[0, -1.05, 0]} rotation={[0, FRONT, 0]} scale={1.12}>
      <primitive object={scene} />
    </group>
  );
}

/** Atlas turning on the footer: its own small canvas, only rendering while on screen. */
export function AtlasCanvas() {
  const [visible, setVisible] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="footer__atlas" ref={host} aria-hidden="true">
      <Canvas dpr={typeof window !== "undefined" && window.innerWidth < 820 ? [1, 1.25] : [1, 1.75]} frameloop={visible ? "always" : "never"} gl={{ antialias: true, alpha: true }} shadows camera={{ fov: 30, position: [0, 0.2, 5.4], near: 0.1, far: 30 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.setClearColor(0x000000, 0); }}>
        <Suspense fallback={null}>
          <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={0.45} />
          <Atlas visible={visible} />
          {/* a soft shadow on the ground so he stands rather than floats */}
          <ContactShadows position={[0, -1.06, 0]} opacity={0.32} scale={10} blur={3.2} far={3.5} resolution={512} color="#0b1a2e" />
        </Suspense>
        {/* the hero's light: warm key from the upper left, cool sky fill, a cold rim from behind */}
        <directionalLight position={[-3, 5, 3]} intensity={2.6} color="#fff3e6" castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[3, 2, -4]} intensity={1.2} color="#9fc4f0" />
        <hemisphereLight args={["#bcd6f2", "#6f6a63", 0.7]} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(ATLAS, DRACO);
