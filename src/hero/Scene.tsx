"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { BEATS, remap } from "./beats";
import { progress } from "./progress";
import { CameraRig } from "./CameraRig";
import { Sky } from "./Sky";
import { Statue } from "./Statue";
import { Morph } from "./Morph";
import { Rebuild } from "./Rebuild";
import { PortalScreen } from "./PortalScreen";
import { useCallback, useState } from "react";
import type { Texture } from "three";

/** Key light orbits the statue through the hold, so the light moves instead of the model. */
function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (!key.current) return;
    const hold = remap(progress.p, BEATS.hold[0], BEATS.hold[1]);
    const a = -0.6 + hold * 1.9;
    key.current.position.set(Math.sin(a) * 3.2, 3.4, Math.cos(a) * 3.2);
    key.current.target.position.set(0, 1.0, 0);
    key.current.target.updateMatrixWorld();
  });
  return (
    <>
      <directionalLight
        ref={key}
        intensity={3.0}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        position={[-1.8, 3.4, 2.6]}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-1.5, 1.5, 2.4, -0.4, 0.5, 8]}
        />
      </directionalLight>
      <hemisphereLight args={["#bcd6f2", "#6f6a63", 0.4]} />
    </>
  );
}

/** The sky is its own canvas at the back, so DOM text can sit between the sky and the statue. */
export function SkyScene({ frozen = false }: { frozen?: boolean }) {
  return (
    <div className="hero__canvas hero__canvas--sky">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          depth: false,
          stencil: false,
        }}
        frameloop="always"
      >
        <Sky frozen={frozen} />
      </Canvas>
    </div>
  );
}

/** The statue renders on a transparent canvas above the wordmark. */
export function Scene({
  frozen = false,
  onReady,
  video = null,
}: {
  frozen?: boolean;
  onReady?: () => void;
  video?: HTMLVideoElement | null;
}) {
  const mobile = typeof window !== "undefined" && window.innerWidth < 820;
  const [screenTexture, setScreenTexture] = useState<Texture | null>(null);
  const onTexture = useCallback((t: Texture) => setScreenTexture(t), []);
  return (
    <div className="hero__canvas hero__canvas--statue">
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
          premultipliedAlpha: true,
        }}
        shadows
        camera={{ fov: 32, near: 0.05, far: 60, position: [0.3, 1.6, 0.6] }}
        frameloop="always"
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.92;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(0x000000, 0);
          onReady?.();
        }}
      >
        <Suspense fallback={null}>
          <Environment
            files="/hdri/brown_photostudio_02_1k.hdr"
            environmentIntensity={0.5}
          />
          <Statue frozen={frozen} />
        </Suspense>
        <Suspense fallback={null}>
          <Morph set={mobile ? "mobile" : "desktop"} frozen={frozen} />
          <Rebuild video={video} screenTexture={screenTexture} />
          <PortalScreen video={video} onTexture={onTexture} frozen={frozen} />
        </Suspense>
        <Lights />
        <CameraRig frozen={frozen} />
      </Canvas>
    </div>
  );
}
