"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const ATLAS = "/models/atlas.glb?v=2026-09-05a";
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
    s.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
    return s;
  }, [gltf.scene]);
  const reduced = useRef(false);
  useEffect(() => { reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useFrame((_, dt) => {
    if (!group.current || reduced.current || qaYaw !== null) return;
    group.current.rotation.y += Math.min(dt, 0.05) * 0.22;
  });
  return (
    <group ref={group} position={[0, -1.1, 0]} rotation={[0, FRONT, 0]}>
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
      <Canvas dpr={[1, 1.75]} frameloop={visible ? "always" : "never"} gl={{ antialias: true, alpha: true }} shadows camera={{ fov: 30, position: [0, 0.35, 5.2], near: 0.1, far: 30 }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; gl.setClearColor(0x000000, 0); }}>
        <Suspense fallback={null}>
          <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={0.9} />
          <Atlas visible={visible} />
        </Suspense>
        <directionalLight position={[-3, 5, 3]} intensity={2.4} color="#fff3e6" castShadow shadow-mapSize={[1024, 1024]} />
        <hemisphereLight args={["#dfe8f2", "#6f6a63", 0.5]} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(ATLAS, DRACO);
