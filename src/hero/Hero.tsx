"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { Copy } from "./Copy";
import { SCROLL_LENGTH_VH } from "./beats";
import { setProgress, scrollControl } from "./progress";

const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), { ssr: false });
import { SkyVideo } from "./SkyVideo";
import { ScreenVideo } from "./ScreenVideo";
import { Intro } from "./Intro";
import { introState } from "./introState";
import { ServiceTabs } from "./ServiceTabs";
import { WorkDeck } from "./WorkDeck";

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
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const videoRef = (el: HTMLVideoElement | null) => setVideo(el);

  // the video only feeds the laptop screen texture; the element itself stays hidden

  useEffect(() => {
    // every visit starts at the top: the browser must not restore a mid sequence scroll position on refresh
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    setMode(detectMode());
  }, []);

  useEffect(() => {
    if (mode !== "scroll" || !section.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    lenis.scrollTo(0, { immediate: true });
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
    scrollControl.toSection = (s) => {
      const y = st.start + (st.end - st.start) * Math.min(1, Math.max(0, s));
      lenis.scrollTo(y, { duration: 1.2 });
    };
    // the intro holds the page at the top until the wordmark and the statue are fully in
    scrollControl.lock = () => { lenis.stop(); document.documentElement.classList.add("is-locked"); };
    scrollControl.unlock = () => {
      document.documentElement.classList.remove("is-locked");
      lenis.start();
      // Lenis measured the page while it was locked: measure again now the page has its full height
      requestAnimationFrame(() => { lenis.resize(); ScrollTrigger.refresh(); });
    };
    if (introState.locked) scrollControl.lock();

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
      <div className="hero__stage" ref={stage}>
        {mode === "static" || mode === "pending" ? (
          <img className="hero__still" src="/hero-still.png" alt="A marble figure of Hercules, leaning on his club" width={1280} height={1280} />
        ) : (
          <>
            <SkyVideo frozen={frozen} />
            <Copy isStatic={false} layer="behind" />
            <Scene frozen={frozen} video={video} />
            <ScreenVideo ref={videoRef} />
            <Intro stage={stage} />
          </>
        )}
        {!isStatic && <Copy isStatic={false} layer="front" />}
        {!isStatic && <ServiceTabs />}
        {!isStatic && <WorkDeck />}
      </div>
      {isStatic && <Copy isStatic />}
    </section>
  );
}
