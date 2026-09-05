import { Footer } from "@/footer/Footer";

export const metadata = { title: "Contact, Build Different", description: "Start a project with Build Different." };

/** The contact page: the same form and Atlas as the foot of the front page, on its own. */
export default function ContactPage() {
  return (
    <main className="page page--contact">
      <a className="wp__home page__home" href="/">Build Different</a>
      <Footer standalone />
    </main>
  );
}
