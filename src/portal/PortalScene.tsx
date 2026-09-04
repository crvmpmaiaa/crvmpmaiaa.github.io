"use client";
import { useFrame, useLoader } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { ShaderQuad } from "./ShaderBackdrop";
import * as THREE from "three";

/**
 * The cosmic space behind the screen. Black, marble whites and greys, one cold blue grey accent.
 * Backdrop: a slightly cylindrical plane far behind everything with the cosmos video (poster until the clip
 * arrives). Dust between camera and backdrop. Six service cards along a straight rail at varying depths.
 * One cold key from above left.
 */
export const ACCENT = "#7f93ad";
export const PALETTE = { black: "#050607", marble: "#dedcd8", vein: "#474748", accent: ACCENT };

export type CardSpec = { title: string; x: number; z: number; rotY: number; long: boolean };
/** left to right along the rail; z is depth from the rail (negative is further away) */
export const CARDS: CardSpec[] = [
  { title: "3D Experiences", x: 0, z: -0.3, rotY: 0.12, long: true },
  { title: "Web Development", x: 2.6, z: -1.1, rotY: -0.18, long: true },
  { title: "Growth System", x: 5.1, z: 0.1, rotY: 0.08, long: true },
  { title: "Custom Application Builds", x: 7.6, z: -0.8, rotY: -0.1, long: false },
  { title: "Lead Generation", x: 10.0, z: -0.2, rotY: 0.16, long: false },
  { title: "AI Consulting", x: 12.4, z: -1.3, rotY: -0.14, long: false },
];
export const CARD = { w: 1.5, h: 0.95, d: 0.035 };
/** per card light 0..1 from camera distance (written by the camera rig) and hover (written by pointer events) */
export const portalLit = CARDS.map(() => ({ current: 0.2 }));
export const portalHover = CARDS.map(() => ({ current: 0 }));
/** everything in the portal world lives on layer 1 so the hero camera never sees it and vice versa */
export const PORTAL_LAYER = 1;

/** Marble card: thin slab of the pillar's marble with the service name glowing through as an inscription. */
function MarbleCard({ spec, lit, index, onSelect }: { spec: CardSpec; lit: React.MutableRefObject<number>; index: number; onSelect?: (i: number) => void }) {
  const base = useLoader(THREE.TextureLoader, "/textures/marble-card.webp");
  // each card gets its own slice of the veining so no two read the same
  const marble = useMemo(() => {
    const t = base.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    t.repeat.set(0.9, 0.9);
    t.offset.set((spec.x * 0.137) % 0.1, (spec.z * 0.31 + 0.5) % 0.1);
    t.needsUpdate = true;
    return t;
  }, [base, spec.x, spec.z]);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const text = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const l = Math.min(1, lit.current + portalHover[index].current * 0.6);
    if (mat.current) mat.current.emissiveIntensity = 0.05 + l * 0.25;
    if (text.current) {
      const m = text.current.material as THREE.MeshBasicMaterial;
      m.toneMapped = false;
      // engraved grey at rest; when the camera arrives the inscription goes deep cold blue, the one accent
      m.color.set("#676d74").lerp(new THREE.Color("#3a5f92"), l);
    }
  });
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotY, 0]}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); portalHover[index].current = 1; document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { portalHover[index].current = 0; document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onSelect?.(index); }}
      >
        <boxGeometry args={[CARD.w, CARD.h, CARD.d]} />
        <meshPhysicalMaterial ref={mat} map={marble} roughness={0.28} metalness={0} clearcoat={0.7} clearcoatRoughness={0.22} emissive={new THREE.Color(ACCENT)} emissiveIntensity={0.05} envMapIntensity={0.9} toneMapped={false} />
      </mesh>
      {/* inscription: sits a hair in front of the face so it reads as cut into the surface and lit from behind */}
      <Text ref={text} font="/fonts/CormorantGaramond-Regular.ttf" position={[0, 0, CARD.d / 2 + 0.002]} fontSize={0.15} maxWidth={CARD.w * 0.84} textAlign="center" anchorX="center" anchorY="middle" letterSpacing={-0.005} color={ACCENT}>
        {spec.title}
      </Text>
    </group>
  );
}

/** Frosted glass card: transmission with roughness, cold edge light, refraction of the backdrop. */
function GlassCard({ spec, lit }: { spec: CardSpec; lit: React.MutableRefObject<number> }) {
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const text = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const l = lit.current;
    if (mat.current) mat.current.emissiveIntensity = 0.02 + l * 0.12;
    if (text.current) (text.current.material as THREE.MeshBasicMaterial).color.setStyle("#e8edf3").multiplyScalar(0.6 + l * 0.8);
  });
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotY, 0]}>
      <mesh>
        <boxGeometry args={[CARD.w, CARD.h, CARD.d]} />
        <meshPhysicalMaterial ref={mat} color="#c9d3de" transmission={0.92} thickness={0.3} roughness={0.45} ior={1.45} clearcoat={1} clearcoatRoughness={0.15} emissive={new THREE.Color(ACCENT)} emissiveIntensity={0.02} attenuationColor={new THREE.Color("#9fb1c6")} attenuationDistance={0.6} envMapIntensity={1.2} />
      </mesh>
      <Text ref={text} font="/fonts/CormorantGaramond-Regular.ttf" position={[0, 0, CARD.d / 2 + 0.002]} fontSize={0.15} maxWidth={CARD.w * 0.84} textAlign="center" anchorX="center" anchorY="middle" letterSpacing={-0.005} color="#e8edf3">
        {spec.title}
      </Text>
    </group>
  );
}

/** Slightly cylindrical backdrop far behind the rail so lateral moves keep parallax and never show an edge. */
function Backdrop({ video, shader = true }: { video?: HTMLVideoElement | null; shader?: boolean }) {
  const poster = useLoader(THREE.TextureLoader, "/media/cosmos-poster.jpg");
  poster.colorSpace = THREE.SRGBColorSpace;
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => {
    const t = video ? new THREE.VideoTexture(video) : poster.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    // tiled and mirrored across the arc so the field reads as distant and endless rather than one big picture
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    t.repeat.set(3.4, 1.7);
    t.needsUpdate = true;
    return t;
  }, [video, poster]);
  if (shader) return null;
  // a shallow arc of radius 60 centred on the rail, its surface about 46 units behind the cards.
  // three's cylinder puts theta 0 on +Z, so the arc is cut around pi to sit on the far side.
  const geo = useMemo(() => new THREE.CylinderGeometry(60, 60, 90, 128, 1, true, Math.PI - 1.3, 2.6), []);
  return (
    <mesh geometry={geo} position={[6.2, 0.4, 14]}>
      {/* fog is for the cards and dust; the backdrop is the far distance itself */}
      <meshBasicMaterial ref={matRef} map={tex} side={THREE.DoubleSide} toneMapped={false} fog={false} />
    </mesh>
  );
}

/** Sparse slow dust between the camera and the backdrop, square motes like the hero's. */
function Dust({ count = 1600 }: { count?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { p[i * 3] = -4 + Math.random() * 22; p[i * 3 + 1] = -4 + Math.random() * 8; p[i * 3 + 2] = -14 + Math.random() * 15; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  const mat = useRef<THREE.PointsMaterial>(null);
  const pts = useRef<THREE.Points>(null);
  useFrame((_, dt) => { if (pts.current) pts.current.position.x = (pts.current.position.x + dt * 0.02) % 1; });
  return (
    <points ref={pts} geometry={geo}>
      <pointsMaterial ref={mat} size={2.2} sizeAttenuation={false} color="#c9d0d8" transparent opacity={0.55} depthWrite={false} toneMapped={false} />
    </points>
  );
}

export function PortalWorld({ material = "marble", video, lit, onSelect, standalone = false, backdrop = "shader", frozen = false, active, bare = false, variant = 0 }: { material?: "marble" | "glass"; video?: HTMLVideoElement | null; lit: React.MutableRefObject<number>[]; onSelect?: (i: number) => void; standalone?: boolean; backdrop?: "shader" | "video"; frozen?: boolean; active?: () => boolean; bare?: boolean; variant?: number }) {
  const root = useRef<THREE.Group>(null);
  useEffect(() => {
    if (standalone || !root.current) return;
    root.current.traverse((o) => o.layers.set(PORTAL_LAYER));
  });
  return (
    <group ref={root}>
      {standalone && <color attach="background" args={[PALETTE.black]} />}
      {/* inside the hero canvas there is no scene background, so the portal carries its own black sky */}
      {!standalone && backdrop !== "shader" && (
        <mesh>
          <sphereGeometry args={[150, 16, 12]} />
          <meshBasicMaterial color={PALETTE.black} side={THREE.BackSide} fog={false} />
        </mesh>
      )}
      <ambientLight intensity={0.12} color="#9fb1c6" />
      <directionalLight position={[-6, 8, 6]} intensity={2.4} color="#dfe8f2" />
      <directionalLight position={[10, 2, -4]} intensity={0.5} color={ACCENT} />
      {backdrop === "shader" && <ShaderQuad frozen={frozen} variant={variant} />}
      <Backdrop video={video} shader={backdrop === "shader"} />
      {!bare && <Dust />}
      {!bare && CARDS.map((c, i) => material === "glass" ? <GlassCard key={c.title} spec={c} lit={lit[i]} /> : <MarbleCard key={c.title} spec={c} lit={lit[i]} index={i} onSelect={onSelect} />)}
    </group>
  );
}
