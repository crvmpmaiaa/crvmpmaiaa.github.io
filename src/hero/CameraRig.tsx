"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BEATS, ease, remap } from "./beats";
import { progress } from "./progress";
import { STATUE } from "./Statue";

/**
 * Camera as a pure function of p, plus a wall clock handheld drift in beat 1 that fades out with the dolly.
 * Beat 1: inches from the face, three quarter. Beat 2: a curved dolly back and down to the full figure.
 * Beat 3: no dolly, a slow parallax drift only.
 */
const HEAD = STATUE.head;
const CLOSE = {
  pos: new THREE.Vector3(HEAD.x + 0.34, HEAD.y + 0.02, HEAD.z + 0.46),
  look: new THREE.Vector3(HEAD.x - 0.02, HEAD.y - 0.02, HEAD.z),
  fov: 32,
};
// the figure sits right of centre at the wide shot so the copy column on the left never touches it
const WIDE = {
  pos: new THREE.Vector3(-0.55, 1.0, 3.5),
  look: new THREE.Vector3(-0.6, 0.9, 0),
  fov: 34,
};
// control point pulls the path out to the side and down so the move reads as an arc, not a straight pull
const CTRL = new THREE.Vector3(1.6, 1.25, 2.2);

const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();

function bezier(out: THREE.Vector3, a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) {
  const u = 1 - t;
  out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
  return out;
}

export function CameraRig({ frozen = false }: { frozen?: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const clock = useRef(0);
  const noise = useMemo(() => {
    // three incommensurate sines make a cheap, loopless handheld drift
    return (t: number, k: number) => Math.sin(t * 0.7 + k) * 0.5 + Math.sin(t * 1.3 + k * 2.1) * 0.3 + Math.sin(t * 2.9 + k * 0.7) * 0.2;
  }, []);

  useFrame((_, dt) => {
    const p = progress.p;
    if (!frozen) clock.current += Math.min(dt, 0.05);
    const t = clock.current;

    const reveal = ease.inOut(remap(p, BEATS.reveal[0], BEATS.reveal[1]));
    bezier(tmpPos, CLOSE.pos, CTRL, WIDE.pos, reveal);
    tmpLook.lerpVectors(CLOSE.look, WIDE.look, ease.smooth(reveal));
    let fov = THREE.MathUtils.lerp(CLOSE.fov, WIDE.fov, reveal);

    // beat 1 handheld drift, fading out with the dolly
    const drift = (1 - reveal) * 0.012;
    tmpPos.x += noise(t, 1) * drift;
    tmpPos.y += noise(t, 2) * drift * 0.6;
    tmpLook.x += noise(t, 3) * drift * 0.5;

    // beat 3 parallax: a slow lateral drift as p moves through the hold
    const hold = remap(p, BEATS.hold[0], BEATS.hold[1]);
    tmpPos.x += Math.sin(hold * Math.PI) * 0.18;
    tmpPos.y -= hold * 0.06;

    // beat 4 lean in toward the dust
    const lean = ease.smooth(remap(p, BEATS.vaporise[0], BEATS.vaporise[1]));
    tmpPos.z -= lean * 0.35;
    fov -= lean * 1.5;

    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
