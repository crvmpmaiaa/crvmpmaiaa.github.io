"use client";
import { diag } from "@/hero/diag";
import { useEffect, useState } from "react";
import { qa } from "@/hero/qa";
import { AtlasCanvas } from "./AtlasCanvas";
import { WavesBackground } from "./WavesBackground";
import { FooterParallax } from "./Parallax";

/** One viewport at the end: Atlas turning, and the form. Also the whole of the contact page. */
export function Footer({ standalone = false }: { standalone?: boolean }) {
  // ?plain leaves all the WebGL out of the footer; ?nowaves and ?noatlas each drop one piece.
  // Phones get no Waves shader by default: its fragment loop stalls the iPhone GPU and the tab is killed.
  const [flags, setFlags] = useState({ waves: true, atlas: true, still: false });
  useEffect(() => {
    diag("footer mounted");
    const phone = window.innerWidth < 820;
    setFlags({ waves: !qa("plain") && !qa("nowaves") && (!phone || qa("waves")), atlas: !qa("plain") && !qa("noatlas") && (!phone || qa("rig")), still: phone && !qa("rig") });
  }, []);
  return (
    <footer className={`footer${standalone ? " footer--page" : ""}`} id="contact">
      {flags.waves ? <WavesBackground /> : <div className="footer__waves footer__waves--still" aria-hidden="true" />}
      <FooterParallax />
      <div className="footer__inner">
        <div className="footer__copy">
          <h2 className="footer__title">Let us take the weight<br />off your shoulders.</h2>
          <form className="footer__form" action="mailto:jack@builddifferent.dev" method="post" encType="text/plain">
            <label className="field">
              <span>Your name</span>
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field field--wide">
              <span>What are you building?</span>
              <textarea name="message" rows={4} required />
            </label>
            <button className="cta" type="submit">Start a project</button>
          </form>
        </div>
        {flags.atlas && <AtlasCanvas />}
        {flags.still && <div className="footer__atlas footer__atlas--still"><img src="/images/mobile/atlas.webp" alt="Atlas carrying the world, in marble and bronze" width={1134} height={1278} /></div>}
      </div>
      <div className="footer__foot">
        <span className="footer__brand">Build Different</span>
        <nav className="footer__links" aria-label="Footer">
          <a href="/work">Work</a>
          <a href="mailto:jack@builddifferent.dev">jack@builddifferent.dev</a>
        </nav>
      </div>
    </footer>
  );
}
