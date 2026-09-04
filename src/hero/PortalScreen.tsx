"use client";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { progress } from "./progress";
import { BEATS, ease, remap } from "./beats";
import { PortalWorld, CARDS } from "@/portal/PortalScene";

/**
 * The portal scene rendered offscreen for the laptop screen. Its camera sits where the entry camera will be,
 * facing along the rail with the cards receding to the right, drifting gently on a clock. Rendered only once
 * the lid starts to open, at half resolution while the screen is small and full once it fills the frame.
 */
export function PortalScreen({ video, onTexture, frozen = false }: { video: HTMLVideoElement | null; onTexture: (t: THREE.Texture) => void; frozen?: boolean }) {
  const full = useFBO(1600, 1000, { samples: 2 });
  const half = useFBO(800, 500, { samples: 0 });
  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.PerspectiveCamera(34, 1.6, 0.1, 200), []);
  const gl = useThree((s) => s.gl);
  const clock = useRef(0);
  const lit = useMemo(() => CARDS.map(() => ({ current: 0.25 })), []);
  const current = useRef<THREE.WebGLRenderTarget | null>(null);

  useEffect(() => { onTexture(full.texture); current.current = full; }, [full, onTexture]);

  useFrame((_, dt) => {
    const p = progress.p;
    if (p < 0.79) return;
    if (!frozen) clock.current += Math.min(dt, 0.05);
    const t = clock.current;
    // entry pose: on the rail's near end, looking down the rail so the cards recede to the right
    const hold = ease.smooth(remap(p, BEATS.screen[1], 1.0));
    cam.position.set(-1.6 + Math.sin(t * 0.18) * 0.12, 0.12 + Math.sin(t * 0.13) * 0.06, 4.6 - hold * 0.6);
    cam.lookAt(2.2 + Math.sin(t * 0.09) * 0.2, 0.0, -1.5);
    // first card glows a little more as the hold settles
    lit[0].current = 0.25 + hold * 0.5;
    const target = p > 0.93 ? full : half;
    if (target !== current.current) { current.current = target; onTexture(target.texture); }
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
  }, -1);

  return createPortal(<PortalWorld video={video} lit={lit} />, scene);
}
