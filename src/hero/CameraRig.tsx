"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BEATS, ease, remap } from "./beats";
import { progress } from "./progress";
import { STATUE } from "./Statue";
import { COLUMN_TOP, stageTarget, screenState } from "./Rebuild";

/**
 * Camera as a pure function of p, plus a wall clock handheld drift in beat 1 that fades out with the dolly.
 * Beat 1: inches from the face, three quarter. Beat 2: a curved dolly back and down to the full figure.
 * Beat 3: no dolly, a slow parallax drift only.
 */
const HEAD = STATUE.head;
// opening frame: head and the upper half of the torso, three quarter
// +0.11 on x on both camera and target slides the figure about 100px left at 1440 wide
const CLOSE = {
  pos: new THREE.Vector3(HEAD.x + 0.3 + 1.0 * 0.925, HEAD.y - 0.26 + 0.12 * 0.925, HEAD.z + 1.55 * 0.925),
  look: new THREE.Vector3(HEAD.x + 0.3, HEAD.y - 0.26, HEAD.z),
  fov: 30,
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
const screenPos = new THREE.Vector3();

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

    // beat 3: the figure drifts from right of centre into the middle of the frame
    const hold = ease.inOut(remap(p, BEATS.hold[0], BEATS.hold[1]));
    tmpPos.x += hold * 0.55;
    tmpLook.x += hold * 0.6;
    tmpPos.y -= hold * 0.04;

    // beat 4 lean in toward the dust
    const lean = ease.smooth(remap(p, BEATS.vaporise[0], BEATS.vaporise[1]));
    tmpPos.z -= lean * 0.12;
    fov -= lean * 0.8;

    // rebuild and turn: hold on the pillar, target its middle
    const rb = ease.smooth(remap(p, BEATS.rebuild[0], BEATS.rebuild[0] + 0.06));
    tmpLook.y = THREE.MathUtils.lerp(tmpLook.y, COLUMN_TOP * 0.55, rb);
    tmpPos.y = THREE.MathUtils.lerp(tmpPos.y, 0.95, rb);
    // lens breathing through the turn
    const turn = remap(p, BEATS.turn[0], BEATS.turn[1]);
    fov += Math.sin(turn * Math.PI) * 0.6;

    // screen beat: the rig slides down to the look point (see Rebuild), then the camera dollies straight in,
    // level, until the screen fills the frame
    stageTarget.camPos.copy(tmpPos);
    stageTarget.look.copy(tmpLook);
    stageTarget.fov = fov;
    const dolly = ease.inOut(remap(p, BEATS.screen[0], BEATS.screen[1]));  // one motion with the slide down, then a hold
    if (dolly > 0 && screenState.ready) {
      const fovRad = THREE.MathUtils.degToRad(fov);
      const dist = (screenState.height / 2) / Math.tan(fovRad / 2) / 1.04;
      screenPos.set(screenState.centre.x, screenState.centre.y, screenState.centre.z + dist);
      tmpPos.lerp(screenPos, dolly);
      tmpLook.set(screenState.centre.x, screenState.centre.y, THREE.MathUtils.lerp(tmpLook.z, screenState.centre.z, dolly));
    }

    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
