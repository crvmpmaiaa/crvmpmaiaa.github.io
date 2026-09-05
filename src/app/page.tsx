import { Hero } from "@/hero/Hero";
import { Footer } from "@/footer/Footer";

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#contact">Skip to contact</a>
      <Hero />
      <main id="main">
        <Footer />
      </main>
    </>
  );
}
