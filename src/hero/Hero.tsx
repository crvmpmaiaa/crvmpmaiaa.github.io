"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Copy } from "./Copy";
import { SCROLL_LENGTH_VH } from "./beats";
import { setProgress } from "./progress";

const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), { ssr: false });
const SkyScene = dynamic(() => import("./Scene").then((m) => m.SkyScene), { ssr: false });

type Mode = "pending" | "scroll" | "reduced" | "static";

function detectMode(): Mode {
  if (typeof window === "undefined") return "pending";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory < 4;
  let webgl2 = false;
  try {
    const c = document.createElement("canvas");
    webgl2 = !!c.getContext("webgl2");
  } catch {
    webgl2 = false;
  }
  if (!webgl2 || lowMemory) return "static";
  if (reduced) return "reduced";
  return "scroll";
}

export function Hero() {
  const [mode, setMode] = useState<Mode>("pending");
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    setMode(detectMode());
  }, []);

  useEffect(() => {
    if (mode !== "scroll" || !section.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);

    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => setProgress(self.progress),
    });
    setProgress(st.progress);

    return () => {
      st.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [mode]);

  const isStatic = mode === "static" || mode === "reduced";
  const frozen = mode === "reduced";

  return (
    <section
      ref={section}
      className={`hero${isStatic ? " is-static" : ""}`}
      aria-label="Introduction"
      style={isStatic ? undefined : { height: `${SCROLL_LENGTH_VH}svh` }}
    >
      <div className="hero__stage">
        {mode === "static" || mode === "pending" ? (
          <img className="hero__still" src="/hero-still.png" alt="A marble figure of Hercules, leaning on his club" width={1280} height={1280} />
        ) : (
          <>
            <SkyScene frozen={frozen} />
            <Copy isStatic={false} layer="behind" />
            <Scene frozen={frozen} />
          </>
        )}
        {!isStatic && <Copy isStatic={false} layer="front" />}
      </div>
      {isStatic && <Copy isStatic />}
    </section>
  );
}
