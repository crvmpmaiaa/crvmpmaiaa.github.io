"use client";
import { diag } from "@/hero/diag";
import { useEffect, useState, type FormEvent } from "react";
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
    setFlags({ waves: !qa("plain") && !qa("nowaves") && (!phone || qa("waves")), atlas: !qa("plain") && !qa("noatlas") && (!phone || qa("rig")), still: false });
  }, []);
  // The form is registered with Netlify by public/__forms.html; this posts to it and Netlify emails the enquiry on.
  const [sent, setSent] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setSent("sending");
    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(Array.from(data, ([k, v]) => [k, String(v)])).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setSent("done");
    } catch {
      setSent("failed");
    }
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
          <form className="footer__form" name="quote" action="/__forms.html" method="post" onSubmit={submit}>
            <input type="hidden" name="form-name" value="quote" />
            <label className="field field--trap" aria-hidden="true">
              <span>Company</span>
              <input name="company" type="text" tabIndex={-1} autoComplete="off" />
            </label>
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
            <p className="footer__consent">We use what you send only to reply to you. <a href="/privacy">Privacy</a></p>
            <button className="cta" type="submit" disabled={sent === "sending"}>{sent === "sending" ? "Sending" : "Start a project"}</button>
            <p className="footer__status" role="status" aria-live="polite">
              {sent === "done" && "Thank you. Your message is with us and we will be in touch shortly."}
              {sent === "failed" && <>That did not send. Please email <a href="mailto:jack@builddifferent.dev">jack@builddifferent.dev</a> instead.</>}
            </p>
          </form>
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
        <a className="footer__mail" href="mailto:jack@builddifferent.dev">jack@builddifferent.dev</a>
      </div>
    </footer>
  );
}
