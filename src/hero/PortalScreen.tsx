"use client";
import { PHONE } from "./Statue";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { progress } from "./progress";
import { Q, ease, remap } from "./beats";
import { PORTAL_LAYER } from "@/portal/PortalScene";
import { ENTRY, PORTAL_OFFSET, portalClock, entryDrift } from "@/portal/rail";
import { pointer } from "./pointer";

/**
 * Renders the portal world (layer 1 of the main scene) to a target for the laptop screen, from the entry
 * camera. The target's camera is wider than the main camera by the screen's overfill, so when the main camera
 * takes over at the crossing the visible picture is identical. Half resolution while the screen is small.
 */
export const portalCamState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fill: 1.0 };
export const screenAspect = { value: 1.475 };

export function PortalScreen({ onTexture, frozen = false }: { onTexture: (t: THREE.Texture) => void; frozen?: boolean }) {
  // one target, sized to the display's own pixels so the screen never shows a rescaled image
  const target = useRef<THREE.WebGLRenderTarget | null>(null);
  const bufSize = useMemo(() => new THREE.Vector2(), []);
  const cam = useMemo(() => { const c = new THREE.PerspectiveCamera(34, 1.475, 0.1, 400); c.layers.set(PORTAL_LAYER); return c; }, []);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const mainCam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const clear = useMemo(() => new THREE.Color(), []);

  useEffect(() => () => { target.current?.dispose(); }, []);

  useFrame((_, dt) => {
    const p = progress.p, q = progress.q;
    if (p < 0.79) return;
    if (q > Q.cross && q < Q.crossBack) return;  // inside: the main camera draws the world directly
    const t = portalClock.t;
    // entry pose with a gentle drift; pushes forward a little through the first beat so the crossing has motion
    const through = ease.inOut(remap(q, Q.through[0], Q.cross));
    const back = 1 - ease.inOut(remap(q, Q.crossBack, Q.backThrough[1]));  // symmetric on the way out
    const push = q < Q.cross ? through : back;
    const mx = pointer.active ? pointer.x : 0, my = pointer.active ? pointer.y : 0;
    const drift = entryDrift(t, mx, my);
    portalCamState.pos.set(ENTRY.pos[0] + drift.pos[0], ENTRY.pos[1] + drift.pos[1], ENTRY.pos[2] - push * 0.9);
    portalCamState.look.set(ENTRY.look[0] + drift.look[0], ENTRY.look[1] + drift.look[1], ENTRY.look[2]);
    cam.position.set(PORTAL_OFFSET[0] + portalCamState.pos.x, PORTAL_OFFSET[1] + portalCamState.pos.y, PORTAL_OFFSET[2] + portalCamState.pos.z);
    cam.lookAt(PORTAL_OFFSET[0] + portalCamState.look.x, PORTAL_OFFSET[1] + portalCamState.look.y, PORTAL_OFFSET[2] + portalCamState.look.z);
    // match the main camera through the screen: the screen overfills the viewport by `fill`, so this camera
    // sees `fill` times more than the main one, and the visible centre lines up exactly
    const vAspect = size.width / size.height;
    const fill = Math.max(1, vAspect / screenAspect.value);
    portalCamState.fill = fill;
    const mainFov = THREE.MathUtils.degToRad(mainCam.fov);
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(mainFov / 2) * fill));
    cam.aspect = screenAspect.value;
    cam.updateProjectionMatrix();
    // the target covers the viewport times the overfill, in device pixels, so what shows through the screen
    // is drawn at exactly the density the direct render will use
    gl.getDrawingBufferSize(bufSize);
    const tw = Math.round(bufSize.y * fill * screenAspect.value);
    const th = Math.round(bufSize.y * fill);
    if (!target.current || target.current.width !== tw || target.current.height !== th) {
      target.current?.dispose();
      target.current = new THREE.WebGLRenderTarget(tw, th, { samples: PHONE ? 0 : 2, depthBuffer: true });  // no MSAA target on phones, it doubles the memory
      target.current.texture.colorSpace = THREE.NoColorSpace;  // raw shader output, no GPU encode on write
      onTexture(target.current.texture);
    }
    const prev = gl.getRenderTarget();
    gl.getClearColor(clear);
    const prevAlpha = gl.getClearAlpha();
    gl.setRenderTarget(target.current);
    gl.setClearColor(0x050607, 1);
    gl.clear();
    gl.render(scene, cam);
    gl.setClearColor(clear, prevAlpha);
    gl.setRenderTarget(prev);
  }, -1);

  return null;
}
