"use client";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { PortalWorld, CARDS } from "@/portal/PortalScene";

/** Debug view of the portal scene. ?material=glass for the glass option, ?card=n to look at one card. */
export default function PortalDebug() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const material = (params.get("material") as "marble" | "glass") ?? "marble";
  const card = Number(params.get("card") ?? -1);
  const lit = useMemo(() => CARDS.map((_, i) => ({ current: card < 0 ? (i === 0 ? 1 : 0.15) : i === card ? 1 : 0.1 })), [card]);
  const target = card >= 0 ? CARDS[card] : { x: 3.0, z: -0.5 };
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#050607" }}>
      <video ref={(el) => { if (el && el !== video) { setVideo(el); el.play().catch(() => {}); } }} muted loop playsInline autoPlay preload="auto" style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}>
        <source src="/media/cosmos.mp4" type="video/mp4" />
      </video>
      <Canvas dpr={[1, 2]} camera={{ fov: 34, position: [target.x, 0.1, target.z + (card >= 0 ? 2.4 : 6.5)], near: 0.05, far: 200 }}
        gl={{ antialias: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}>
        <Suspense fallback={null}>
          <Environment files="/hdri/brown_photostudio_02_1k.hdr" environmentIntensity={0.35} />
          <PortalWorld material={material} lit={lit} video={video} standalone />
        </Suspense>
        <OrbitControls target={[target.x, 0, target.z]} />
      </Canvas>
    </div>
  );
}
