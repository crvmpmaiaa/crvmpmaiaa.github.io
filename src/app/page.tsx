import { Hero } from "@/hero/Hero";

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Hero />
      <main id="main">
        <section className="section" id="work" aria-labelledby="work-h">
          <h2 id="work-h">Work</h2>
          <p>Selected projects, each with what it does, who it is for and what changed after it shipped.</p>
        </section>
        <section className="section" id="approach" aria-labelledby="approach-h">
          <h2 id="approach-h">Approach</h2>
          <p>Carved to be remembered. It worked. People have always wanted the same thing: to build something that outlives them and carries their name.</p>
          <p>Online, most names are written in sand. It does not have to be. Your brand can feel considered, permanent, built to stand.</p>
          <ul>
            <li>One idea per page.</li>
            <li>Speed measured on real phones and laptops before launch.</li>
            <li>Works with a keyboard, a screen reader and reduced motion.</li>
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
