"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BEATS, ease, remap } from "./beats";
import { progress } from "./progress";
import { STATUE } from "./Statue";
import { COLUMN_TOP, stageTarget, screenState } from "./Rebuild";
import { Q } from "./beats";
import { portalCamState } from "./PortalScreen";
import { PORTAL_LAYER, CARDS, portalLit } from "@/portal/PortalScene";
import { ENTRY, PORTAL_OFFSET, RAIL_Y, RAIL_Z, railX, litFor, portalClock, entryDrift } from "@/portal/rail";
import { pointer, bindPointer } from "./pointer";

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
const screenLook = new THREE.Vector3();

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
  const inside = useRef(false);
  useEffect(() => { bindPointer(); }, []);
  const noise = useMemo(() => {
    // three incommensurate sines make a cheap, loopless handheld drift
    return (t: number, k: number) => Math.sin(t * 0.7 + k) * 0.5 + Math.sin(t * 1.3 + k * 2.1) * 0.3 + Math.sin(t * 2.9 + k * 0.7) * 0.2;
  }, []);

  useFrame((_, dt) => {
    const p = progress.p;
    if (!frozen) clock.current += Math.min(dt, 0.05);
    const t = clock.current;
    if (!frozen) portalClock.t += Math.min(dt, 0.05);

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
      // both ends are fixed: the screen finishes on the look point's height, so aim there from the start
      // and let the rig bring the screen to meet the camera. No snap at the first frame.
      const fovRad = THREE.MathUtils.degToRad(fov);
      const dist = (screenState.height / 2) / Math.tan(fovRad / 2) / portalCamState.fill;
      screenPos.set(screenState.centre.x, tmpLook.y, screenState.centre.z + dist);
      screenLook.set(screenState.centre.x, tmpLook.y, screenState.centre.z);
      tmpPos.lerp(screenPos, dolly);
      tmpLook.lerp(screenLook, dolly);
    }

    // ---------- portal section ----------
    const q = progress.q;
    const isInside = q > Q.cross && q < Q.crossBack;
    if (isInside !== inside.current) {
      inside.current = isInside;
      camera.layers.set(isInside ? PORTAL_LAYER : 0);
    }
    if (isInside) {
      const mx = pointer.active ? pointer.x : 0, my = pointer.active ? pointer.y : 0;
      // arrive: decelerate forward from the entry pose, turning to look along the rail
      const arrive = ease.inOut(remap(q, Q.cross, Q.arrive[1]));  // starts from rest, so the crossing has no velocity step
      // truck: rail position with plateaus
      const u = remap(q, Q.truck[0], Q.truck[1]);
      const x = railX(u);
      // turn back and reverse toward the screen plane
      const backTurn = ease.inOut(remap(q, Q.turnBack[0], Q.turnBack[1]));
      const reverse = ease.inOut(remap(q, Q.turnBack[1], Q.crossBack));
      // the entry pose carries the same drift the screen camera had, fading out over the arrival,
      // so the crossing frame is the same camera
      const drift = entryDrift(portalClock.t, mx, my);
      const carry = 1 - arrive;
      const entryPos = new THREE.Vector3(ENTRY.pos[0] + drift.pos[0] * carry, ENTRY.pos[1] + drift.pos[1] * carry, ENTRY.pos[2] - 0.9);
      const entryLook = new THREE.Vector3(ENTRY.look[0] + drift.look[0] * carry, ENTRY.look[1] + drift.look[1] * carry, ENTRY.look[2]);
      const railPos = new THREE.Vector3(x, RAIL_Y, RAIL_Z);
      const railLook = new THREE.Vector3(x + mx * 0.9, RAIL_Y + my * 0.5, RAIL_Z - 4);
      const pos = new THREE.Vector3().lerpVectors(entryPos, railPos, arrive);
      const look = new THREE.Vector3().lerpVectors(entryLook, railLook, arrive);
      // exit: turn to face back the way we came, then reverse to the entry pose
      if (backTurn > 0) {
        const backLook = new THREE.Vector3(x - 4, RAIL_Y, RAIL_Z + 1.5);
        look.lerp(backLook, backTurn);
        pos.lerp(entryPos, reverse);
        look.lerp(entryLook, reverse);
      }
      pos.x += mx * 0.15 * arrive; pos.y += my * 0.08 * arrive;
      camera.position.set(PORTAL_OFFSET[0] + pos.x, PORTAL_OFFSET[1] + pos.y, PORTAL_OFFSET[2] + pos.z);
      camera.lookAt(PORTAL_OFFSET[0] + look.x, PORTAL_OFFSET[1] + look.y, PORTAL_OFFSET[2] + look.z);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      for (let i = 0; i < CARDS.length; i++) portalLit[i].current = litFor(CARDS[i].x, pos.x) * (1 - backTurn * 0.7);
      (window as unknown as { __bdCam?: unknown }).__bdCam = { q: +q.toFixed(3), inside: true, pos: pos.toArray().map((v) => +v.toFixed(3)), look: look.toArray().map((v) => +v.toFixed(3)), fov: +fov.toFixed(2) };
      return;
    }
    // outside after the return crossing: pull back and up to a composition of pillar and laptop against the sky
    const out = ease.inOut(remap(q, Q.pullOut[0], Q.pullOut[1]));
    if (out > 0) {
      // pillar and laptop central against the sky, laptop still open and playing
      const endPos = new THREE.Vector3(0, 1.3, 4.0);
      const endLook = new THREE.Vector3(0, 0.55, 0);
      tmpPos.lerp(endPos, out);
      tmpLook.lerp(endLook, out);
      // the hand and temple are taller than the pillar: ease back and up to frame the whole piece as it rises
      const hand = ease.inOut(remap(q, Q.hand[0], Q.hand[1]));
      const handPos = new THREE.Vector3(0, 1.7, 7.2);
      const handLook = new THREE.Vector3(0, 1.45, 0);
      tmpPos.lerp(handPos, hand);
      tmpLook.lerp(handLook, hand);
    }
    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    (window as unknown as { __bdCam?: unknown }).__bdCam = { p: +p.toFixed(3), fill: +portalCamState.fill.toFixed(3), sh: +screenState.height.toFixed(4), pos: tmpPos.toArray().map((v) => +v.toFixed(3)), look: tmpLook.toArray().map((v) => +v.toFixed(3)), fov: +fov.toFixed(2), dolly: +dolly.toFixed(3) };
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
