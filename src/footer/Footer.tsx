"use client";
import { diag } from "@/hero/diag";
import { useEffect, useState } from "react";
import { qa } from "@/hero/qa";
import { AtlasCanvas } from "./AtlasCanvas";
import { WavesBackground } from "./WavesBackground";
import { FooterParallax } from "./Parallax";

const MAIL = "jack@builddifferent.dev";

/** One viewport at the end: Atlas turning, and how to reach us. Also the whole of the contact page. */
export function Footer({ standalone = false }: { standalone?: boolean }) {
  // ?plain leaves all the WebGL out of the footer; ?nowaves and ?noatlas each drop one piece.
  // Phones get no Waves shader by default: its fragment loop stalls the iPhone GPU and the tab is killed.
  const [flags, setFlags] = useState({ waves: true, atlas: true, still: false });
  useEffect(() => {
    diag("footer mounted");
    const phone = window.innerWidth < 820;
    setFlags({ waves: !qa("plain") && !qa("nowaves") && (!phone || qa("waves")), atlas: !qa("plain") && !qa("noatlas") && (!phone || qa("rig")), still: false });
  }, []);
  // No form: the address, a button that opens the visitor's mail app, and one that copies it for everyone else.
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(MAIL); setCopied(true); setTimeout(() => setCopied(false), 2400); } catch { /* clipboard may be blocked; the address is on the page */ }
  };
  // on the contact page this is the page heading
  const Title = standalone ? "h1" : "h2";
  return (
    <footer className={`footer${standalone ? " footer--page" : ""}`} id="contact">
      {flags.waves ? <WavesBackground /> : <div className="footer__waves footer__waves--still" aria-hidden="true" />}
      <FooterParallax />
      <div className="footer__inner">
        <div className="footer__copy">
          <Title className="footer__title">Let us take the weight<br />off your shoulders.</Title>
          <div className="footer__reach">
            <p className="footer__lede">Tell us what you are building. One email is enough to start: what it is, who it is for, and when you need it.</p>
            <a className="footer__address" href={`mailto:${MAIL}`}>{MAIL}</a>
            <div className="footer__actions">
              <a className="cta" href={`mailto:${MAIL}?subject=${encodeURIComponent("New project")}`}>Start a project</a>
              <button className="cta cta--quiet" type="button" onClick={copy}>{copied ? "Copied" : "Copy address"}</button>
            </div>
            <p className="sr-only" role="status" aria-live="polite">{copied ? "Email address copied" : ""}</p>
          </div>
        </div>
        {flags.atlas && <AtlasCanvas />}
        {flags.still && <div className="footer__atlas footer__atlas--still"><img src="/images/mobile/atlas.webp" alt="Atlas carrying the world, in marble and bronze" width={1134} height={1278} /></div>}
      </div>
      <nav className="footer__nav" aria-label="Site">
        <a href="/work">Work</a>
        <a href="/#services">Services</a>
        <a href="/about">About us</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy</a>
      </nav>
      <div className="footer__foot">
        <span className="footer__brand">Build Different</span>
        <a className="footer__mail" href={`mailto:${MAIL}`}>{MAIL}</a>
      </div>
    </footer>
  );
}
