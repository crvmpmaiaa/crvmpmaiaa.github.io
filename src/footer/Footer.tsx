"use client";
import { useEffect, useState } from "react";
import { qa } from "@/hero/qa";
import { AtlasCanvas } from "./AtlasCanvas";
import { WavesBackground } from "./WavesBackground";
import { FooterParallax } from "./Parallax";

/** One viewport at the end: Atlas turning, and the form. Also the whole of the contact page. */
export function Footer({ standalone = false }: { standalone?: boolean }) {
  const [plain, setPlain] = useState(false);  // QA switch: ?plain leaves the WebGL out of the footer
  useEffect(() => { setPlain(qa("plain")); }, []);
  return (
    <footer className={`footer${standalone ? " footer--page" : ""}`} id="contact">
      {!plain && <WavesBackground />}
      {!plain && <FooterParallax />}
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
        {!plain && <AtlasCanvas />}
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
