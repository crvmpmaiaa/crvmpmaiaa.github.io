"use client";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import { Float, Grid, Sparkles, Stars, useFBO } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { progress } from "./progress";
import { BEATS, ease, remap } from "./beats";

/**
 * The world behind the screen. Rendered to an offscreen target every frame with its own camera, and shown on
 * the laptop's ScreenSurface as an emissive map. When the laptop fills the page the target fills the page, so
 * the viewer is inside. The camera drifts forward on a wall clock and pushes in with the scroll hold.
 */

const INK = "#060913";
const CYAN = "#5ef2ff";
const VIOLET = "#8b7bff";
const ROSE = "#ff7ad9";

/** A procedurally drawn interface mock: a nav bar, a headline block, a row of cards. Drawn once to a canvas. */
function uiTexture(seed: number, accent: string): THREE.CanvasTexture {
  const w = 512, h = 320;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(10, 14, 28, 0.85)";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,0.10)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
  const rnd = (i: number) => (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
  // nav
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.fillRect(24, 22, 46, 8);
  for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(w - 40 - i * 56, 22, 34, 8); }
  // headline lines
  const lines = [0.62, 0.5, 0.3];
  lines.forEach((f, i) => { g.fillStyle = i < 2 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)"; g.fillRect(24, 62 + i * 26, w * f * (0.8 + Math.abs(rnd(i)) * 0.3), i < 2 ? 14 : 8); });
  // accent button
  g.fillStyle = accent; g.fillRect(24, 148, 96, 24);
  // cards
  for (let i = 0; i < 3; i++) {
    const x = 24 + i * 156;
    g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(x, 196, 140, 98);
    g.strokeStyle = "rgba(255,255,255,0.14)"; g.strokeRect(x, 196, 140, 98);
    g.fillStyle = accent; g.globalAlpha = 0.9; g.fillRect(x + 12, 208, 24, 24); g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(x + 12, 244, 90 * (0.7 + Math.abs(rnd(i + 7)) * 0.3), 8);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 12, 262, 110, 6); g.fillRect(x + 12, 276, 70, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Panel({ position, rotation, seed, accent, w = 1.6 }: { position: [number, number, number]; rotation: [number, number, number]; seed: number; accent: string; w?: number }) {
  const tex = useMemo(() => uiTexture(seed, accent), [seed, accent]);
  const h = w * 0.625;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), [w, h]);
  return (
    <Float speed={0.8} rotationIntensity={0.15} floatIntensity={0.4}>
      <group position={position} rotation={rotation}>
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={tex} transparent opacity={0.92} emissive={new THREE.Color(accent)} emissiveIntensity={0.06} roughness={0.35} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={accent} transparent opacity={0.85} />
        </lineSegments>
      </group>
    </Float>
  );
}

function World() {
  const knot = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (knot.current) { knot.current.rotation.y += d * 0.25; knot.current.rotation.x += d * 0.1; }
    if (ring.current) ring.current.rotation.z += d * 0.08;
  });
  return (
    <group>
      <color attach="background" args={[INK]} />
      <fog attach="fog" args={[INK, 6, 26]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 3, 2]} intensity={40} color={CYAN} distance={14} />
      <pointLight position={[-4, 1, -4]} intensity={30} color={VIOLET} distance={16} />
      <pointLight position={[5, -1, -6]} intensity={22} color={ROSE} distance={16} />
      <Stars radius={60} depth={30} count={2500} factor={3} saturation={0.4} fade speed={0.4} />
      <Grid position={[0, -1.6, 0]} args={[60, 60]} cellSize={0.5} cellThickness={0.6} cellColor="#1d2a4a" sectionSize={2.5} sectionThickness={1.1} sectionColor="#2f4a8a" fadeDistance={26} fadeStrength={1.4} infiniteGrid />
      {/* the object at the centre: a wireframe solid turning slowly, lit from inside */}
      <group position={[0, 0.2, -6]}>
        <mesh ref={knot}>
          <torusKnotGeometry args={[1.1, 0.32, 220, 28]} />
          <meshStandardMaterial color={CYAN} wireframe emissive={new THREE.Color(CYAN)} emissiveIntensity={0.9} />
        </mesh>
        <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[2.4, 0.012, 8, 160]} />
          <meshBasicMaterial color={VIOLET} />
        </mesh>
      </group>
      {/* interface panels hanging in space either side of the path */}
      <Panel position={[-2.9, 0.6, -3.2]} rotation={[0, 0.55, 0]} seed={1} accent={CYAN} />
      <Panel position={[3.0, -0.2, -4.0]} rotation={[0, -0.6, 0]} seed={2} accent={VIOLET} />
      <Panel position={[-2.2, -0.9, -8.5]} rotation={[0, 0.35, 0]} seed={3} accent={ROSE} w={1.3} />
      <Panel position={[2.6, 1.3, -9.5]} rotation={[0, -0.4, 0.05]} seed={4} accent={CYAN} w={1.4} />
      <Panel position={[0.2, 1.9, -13]} rotation={[0.1, 0, 0]} seed={5} accent={VIOLET} w={2.2} />
      {/* light streaks along the path */}
      {[-1.6, 1.6].map((x, i) => (
        <mesh key={i} position={[x, -1.55, -8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, 30]} />
          <meshBasicMaterial color={i ? VIOLET : CYAN} transparent opacity={0.7} />
        </mesh>
      ))}
      <Sparkles count={260} scale={[14, 6, 24]} position={[0, 0.5, -8]} size={2.2} speed={0.25} color={CYAN} opacity={0.7} />
    </group>
  );
}

/** Renders the world offscreen. Exposes the texture through `onTexture`. */
export function Universe({ onTexture, frozen = false }: { onTexture: (t: THREE.Texture) => void; frozen?: boolean }) {
  const fbo = useFBO(1280, 800, { samples: 2 });
  const scene = useMemo(() => new THREE.Scene(), []);
  const cam = useMemo(() => new THREE.PerspectiveCamera(48, 1.6, 0.1, 80), []);
  const gl = useThree((s) => s.gl);
  const clock = useRef(0);

  useEffect(() => { onTexture(fbo.texture); }, [fbo, onTexture]);

  useFrame((_, dt) => {
    const p = progress.p;
    // only worth rendering while the screen can be seen
    if (p < 0.82) return;
    if (!frozen) clock.current += Math.min(dt, 0.05);
    const t = clock.current;
    const hold = ease.smooth(remap(p, BEATS.screen[1], 1.0));
    // drift forward on the clock, push in a little further through the hold, gentle sway
    cam.position.set(Math.sin(t * 0.21) * 0.35, 0.15 + Math.sin(t * 0.17) * 0.12, 3.5 - (t * 0.12) % 6 - hold * 1.5);
    cam.lookAt(Math.sin(t * 0.1) * 0.4, 0.15, -8);
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
  }, -1);

  return createPortal(<World />, scene);
}
