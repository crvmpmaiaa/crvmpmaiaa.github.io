import { Hero } from "@/hero/Hero";
import { COPY } from "@/hero/lines";

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Hero />
      <main id="main">
        <section className="section" id="work" aria-labelledby="work-h">
          <h2 id="work-h">Work</h2>
          <p>Selected projects arrive here. Each one gets a plain account of what it does, who it is for and what changed after it shipped.</p>
        </section>
        <section className="section" id="approach" aria-labelledby="approach-h">
          <h2 id="approach-h">Approach</h2>
          <p>{COPY.block1}</p>
          <p>{COPY.block2} {COPY.block3}</p>
          <ul>
            <li>One idea per page, built to be read.</li>
            <li>Performance measured on real devices, not assumed.</li>
            <li>Accessible by default: keyboard, screen readers, reduced motion.</li>
          </ul>
        </section>
        <section className="section" id="contact" aria-labelledby="contact-h">
          <h2 id="contact-h">Contact</h2>
          <p>
            <a href="mailto:hello@builddifferent.co.uk">hello@builddifferent.co.uk</a>
          </p>
        </section>
        <footer className="section">
          <p>Build Different. Credits for third party assets are listed in <a href="/CREDITS.md">CREDITS.md</a>.</p>
        </footer>
      </main>
    </>
  );
}
