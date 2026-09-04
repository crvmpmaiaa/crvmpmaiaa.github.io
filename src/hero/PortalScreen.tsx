"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { progress } from "./progress";
import { Q, ease, remap } from "./beats";
import { PORTAL_LAYER } from "@/portal/PortalScene";
import { ENTRY, PORTAL_OFFSET } from "@/portal/rail";
import { pointer } from "./pointer";

/**
 * Renders the portal world (layer 1 of the main scene) to a target for the laptop screen, from the entry
 * camera. The target's camera is wider than the main camera by the screen's overfill, so when the main camera
 * takes over at the crossing the visible picture is identical. Half resolution while the screen is small.
 */
export const portalCamState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fill: 1.0 };
export const screenAspect = { value: 1.475 };

export function PortalScreen({ onTexture, frozen = false }: { onTexture: (t: THREE.Texture) => void; frozen?: boolean }) {
  const full = useFBO(1600, Math.round(1600 / 1.475), { samples: 2 });
  const half = useFBO(800, Math.round(800 / 1.475), { samples: 0 });
  const cam = useMemo(() => { const c = new THREE.PerspectiveCamera(34, 1.475, 0.1, 400); c.layers.set(PORTAL_LAYER); return c; }, []);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const mainCam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const clock = useRef(0);
  const current = useRef<THREE.WebGLRenderTarget | null>(null);
  const clear = useMemo(() => new THREE.Color(), []);

  useEffect(() => { onTexture(full.texture); current.current = full; }, [full, onTexture]);

  useFrame((_, dt) => {
    const p = progress.p, q = progress.q;
    if (p < 0.79) return;
    if (q > Q.cross && q < Q.crossBack) return;  // inside: the main camera draws the world directly
    if (!frozen) clock.current += Math.min(dt, 0.05);
    const t = clock.current;
    // entry pose with a gentle drift; pushes forward a little through the first beat so the crossing has motion
    const through = ease.inOut(remap(q, Q.through[0], Q.cross));
    const back = 1 - ease.inOut(remap(q, Q.crossBack, Q.backThrough[1]));  // symmetric on the way out
    const push = q < Q.cross ? through : back;
    const mx = pointer.active ? pointer.x : 0, my = pointer.active ? pointer.y : 0;
    portalCamState.pos.set(ENTRY.pos[0] + Math.sin(t * 0.18) * 0.1 + mx * 0.08, ENTRY.pos[1] + Math.sin(t * 0.13) * 0.05 + my * 0.05, ENTRY.pos[2] - push * 0.9);
    portalCamState.look.set(ENTRY.look[0] + Math.sin(t * 0.09) * 0.15 + mx * 0.4, ENTRY.look[1] + my * 0.25, ENTRY.look[2]);
    cam.position.set(PORTAL_OFFSET[0] + portalCamState.pos.x, PORTAL_OFFSET[1] + portalCamState.pos.y, PORTAL_OFFSET[2] + portalCamState.pos.z);
    cam.lookAt(PORTAL_OFFSET[0] + portalCamState.look.x, PORTAL_OFFSET[1] + portalCamState.look.y, PORTAL_OFFSET[2] + portalCamState.look.z);
    // match the main camera through the screen: the screen overfills the viewport by `fill`, so this camera
    // sees `fill` times more than the main one, and the visible centre lines up exactly
    const vAspect = size.width / size.height;
    const fill = Math.max(1, vAspect / screenAspect.value) * 1.01;
    portalCamState.fill = fill;
    const mainFov = THREE.MathUtils.degToRad(mainCam.fov);
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(mainFov / 2) * fill));
    cam.aspect = screenAspect.value;
    cam.updateProjectionMatrix();
    const target = p > 0.93 ? full : half;
    if (target !== current.current) { current.current = target; onTexture(target.texture); }
    const prev = gl.getRenderTarget();
    gl.getClearColor(clear);
    const prevAlpha = gl.getClearAlpha();
    gl.setRenderTarget(target);
    gl.setClearColor(0x050607, 1);
    gl.clear();
    gl.render(scene, cam);
    gl.setClearColor(clear, prevAlpha);
    gl.setRenderTarget(prev);
  }, -1);

  return null;
}
