"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** A small note on phones, shown once the wordmark has landed, pointing people at a bigger screen. Goes on scroll or tap. */
export function PhoneNotice() {
  const [state, setState] = useState<"hidden" | "shown" | "gone">("hidden");
  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem("bd-notice") === "1"; } catch { /* storage may be off */ }
    if (dismissed) return;
    const show = () => setState("shown");
    const obs = new MutationObserver(() => { if (document.querySelector(".is-revealed")) { obs.disconnect(); setTimeout(show, 600); } });
    if (document.querySelector(".is-revealed")) setTimeout(show, 600); else obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (state !== "shown") return;
    const go = () => { setState("gone"); try { sessionStorage.setItem("bd-notice", "1"); } catch { /* ignore */ } };
    const t = setTimeout(go, 7000);
    const onScroll = () => { if (window.scrollY > 40) go(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, [state]);
  if (state === "hidden") return null;
  // into the body: the hero stage is where the intro moves nodes about, and React must not insert there
  return createPortal(
    <div className={`notice${state === "gone" ? " is-gone" : ""}`} role="status">
      <span>Built for a big screen. Open it on a desktop for the full experience.</span>
      <button type="button" aria-label="Dismiss" onClick={() => setState("gone")}>×</button>
    </div>,
    document.body,
  );
}
