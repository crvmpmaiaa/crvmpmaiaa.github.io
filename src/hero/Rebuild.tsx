"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BEATS, Q, ease, remap } from "./beats";
import { progress } from "./progress";
import { MODEL_VERSION } from "./Statue";
import { SETTLE } from "./Morph";
import { makeDissolve, applyDissolve } from "./dissolve";
import { rigState } from "./rigState";
import { screenAspect, portalCamState } from "./PortalScreen";

const COLUMN = `/models/column.glb?v=${MODEL_VERSION}`;
const LAPTOP = `/models/laptop.glb?v=${MODEL_VERSION}`;
const DRACO = "/draco/";
export const COLUMN_TOP = 1.2;
export const LID_OPEN_DEG = 110;

/** Shared with the camera rig: where the screen is and which way it faces, in world space. */
export const screenState = { centre: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), height: 0.19, ready: false, light: 0 };
/** Where the camera looks during the turn and the screen beat; the camera rig writes this each frame. */
export const stageTarget = { look: new THREE.Vector3(0, 0.66, 0), camPos: new THREE.Vector3(0, 0.95, 3.5), fov: 34 };

const rebuildDissolve = makeDissolve(COLUMN_TOP + 0.3, true);

/** Column and laptop surface beneath the settling dust, then turn, open and light up. */
export function Rebuild({ video, screenTexture }: { video: HTMLVideoElement | null; screenTexture?: THREE.Texture | null }) {
  const column = useGLTF(COLUMN, DRACO);
  const laptop = useGLTF(LAPTOP, DRACO);
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Object3D | null>(null);
  const screen = useRef<THREE.Mesh | null>(null);
  const screenMat = useRef<THREE.MeshBasicMaterial | null>(null);
  const tex = useRef<THREE.VideoTexture | null>(null);
  const shadows = useRef(true);

  const scenes = useMemo(() => {
    const c = column.scene;
    const l = laptop.scene;
    for (const s of [c, l]) {
      s.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat) {
            mat.side = THREE.DoubleSide;  // thin shells: the cut must show an inside, not a hole
            applyDissolve(mat, rebuildDissolve, "rebuild-dissolve");
          }
        }
      });
    }
    l.position.y = COLUMN_TOP;
    lid.current = l.getObjectByName("Lid") ?? null;
    const sc = l.getObjectByName("ScreenSurface") as THREE.Mesh | null;
    screen.current = sc;
    if (sc) {
      // the export dropped the quad's texture coordinates: rebuild them from the geometry's own plane
      const pos = sc.geometry.getAttribute("position");
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i));
      const n = new THREE.Vector3().crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0])).normalize();
      const up = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
      const uAxis = new THREE.Vector3().crossVectors(up, n).normalize();
      const vAxis = new THREE.Vector3().crossVectors(n, uAxis).normalize();
      const us = pts.map((q) => q.dot(uAxis)), vs = pts.map((q) => q.dot(vAxis));
      const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = 1 - (us[i] - u0) / (u1 - u0); uv[i * 2 + 1] = 1 - (vs[i] - v0) / (v1 - v0); }  // the quad faces the viewer, so u runs right to left; targets read bottom up
      sc.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      // unlit and untonemapped: the screen shows the portal target exactly as the direct render will draw it,
      // the backlight ramp is a plain multiply from black to white
      const sm = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, toneMapped: false });
      applyDissolve(sm as unknown as THREE.MeshStandardMaterial, rebuildDissolve, "rebuild-dissolve-screen");
      // the portal target holds raw shader output that the direct render shows untouched: the screen must not
      // encode it on the way out, or the picture on the screen is brighter than the picture inside
      const withDissolve = sm.onBeforeCompile;
      sm.onBeforeCompile = (shader, renderer) => {
        withDissolve.call(sm, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace("#include <colorspace_fragment>", "");
      };
      sc.material = sm;
      screenMat.current = sm;
      // find the quad's height for the camera framing
      sc.geometry.computeBoundingBox();
      const bb = sc.geometry.boundingBox!;
      const ext = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].sort((a, b) => b - a);
      screenState.height = ext[1];
      screenAspect.value = ext[0] / ext[1];
    }
    return { c, l };
  }, [column.scene, laptop.scene]);

  // the screen shows the offscreen universe when there is one, else the video
  useEffect(() => {
    const m = screenMat.current;
    if (!m) return;
    if (screenTexture) {
      screenTexture.flipY = false;
      screenTexture.colorSpace = THREE.NoColorSpace;
      m.map = screenTexture;
      m.needsUpdate = true;
      return;
    }
    if (!video) return;
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    tex.current = t;
    m.map = t;
    m.needsUpdate = true;
    return () => t.dispose();
  }, [video, screenTexture]);

  const tmpN = useMemo(() => new THREE.Vector3(), []);
  const tmpBox = useMemo(() => new THREE.Box3(), []);
  const tmpC = useMemo(() => new THREE.Vector3(), []);
  const tmpInv = useMemo(() => new THREE.Matrix4(), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = progress.p;
    // surface from the ground up in step with the settling dust
    const settle = ease.smooth(remap(p, SETTLE.start, SETTLE.end));
    // once fully surfaced the cut goes away entirely; when the pillar vanishes it runs back down from the top
    const unb = ease.smooth(remap(progress.q, Q.vanish[0], Q.vanish[1]));
    // the cut must sit exactly where the dust is launching: a point at normalised height h leaves when
    // unb > (1 - (0.85 h)) * spread, so the surviving surface is everything below h = (1 - unb / spread) / 0.85,
    // converted from the point buffer's height to the dissolve's own height scale
    const spread = 0.6, sweep = 0.9, grainMean = 0.03, maxY = 1.2124, height = COLUMN_TOP + 0.3;
    const cutForUnbuild = (((1 - unb / spread - grainMean) / sweep) * maxY + rigState.y) / height;
    rebuildDissolve.uCut.value = unb > 0 ? Math.max(-0.05, cutForUnbuild) : settle <= 0 ? -1 : settle >= 0.999 ? 1e3 : settle * 1.15;
    g.visible = unb < 0.999;
    const wantShadows = settle > 0 && unb < 0.5;
    if (shadows.current !== wantShadows) {
      shadows.current = wantShadows;
      g.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = shadows.current; });
    }

    // one full turn landing square, eased, a pure function of p
    const turn = ease.inOut(remap(p, BEATS.turn[0], BEATS.turn[1]));
    g.rotation.y = turn * Math.PI * 2;

    // the lid lifts from 0.80 to 0.89 to its open angle, then squares to vertical as the rig comes down
    const open = ease.inOut(remap(p, 0.79, 0.865));
    const down = ease.inOut(remap(p, BEATS.screen[0], BEATS.screen[1]));
    const lidDeg = THREE.MathUtils.lerp(LID_OPEN_DEG * open, 90, down);
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.degToRad(lidDeg);

    // screen beat, part one: the whole rig slides down until the screen is at the centre of the frame
    const l = scenes.l;
    l.position.set(0, COLUMN_TOP - 0.003, 0);  // sunk a hair so the base always reads as sitting on the marble
    g.position.y = 0;
    if (down > 0 && screen.current) {
      g.updateMatrixWorld(true);
      tmpBox.setFromObject(screen.current);
      tmpBox.getCenter(tmpC);
      g.position.y = -down * (tmpC.y - stageTarget.look.y);
    }
    rigState.y = g.position.y;
    (window as unknown as { __bdRig?: unknown }).__bdRig = { gy: +g.position.y.toFixed(3), rot: +g.rotation.y.toFixed(3), lid: +lidDeg.toFixed(1), down: +down.toFixed(3), sc: screenState.centre.toArray().map((v) => +v.toFixed(3)) };
    const light = ease.smooth(remap(p, 0.83, 0.86));
    screenState.light = light;
    if (screenMat.current) screenMat.current.color.setScalar(light);
    if (video && p > 0.62 && video.paused) video.play().catch(() => {});

    // publish the screen's world centre and normal for the camera
    const sc = screen.current;
    if (sc) {
      sc.updateWorldMatrix(true, false);
      tmpBox.setFromObject(sc);
      tmpBox.getCenter(screenState.centre);
      const na = sc.geometry.getAttribute("normal");
      tmpN.set(na.getX(0), na.getY(0), na.getZ(0)).transformDirection(sc.matrixWorld).normalize();
      // the lid opens away from the viewer, so the screen's outward side is the one with a forward component
      if (tmpN.z < 0) tmpN.negate();
      screenState.normal.copy(tmpN);
      (window as unknown as { __bdScreen?: unknown }).__bdScreen = { c: screenState.centre.toArray(), n: tmpN.toArray(), h: screenState.height, v: video ? [video.readyState, video.currentTime, video.paused] : null };
      screenState.ready = true;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scenes.c} />
      <primitive object={scenes.l} />
    </group>
  );
}

useGLTF.preload(COLUMN, DRACO);
useGLTF.preload(LAPTOP, DRACO);
