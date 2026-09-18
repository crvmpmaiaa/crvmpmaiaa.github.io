import { Footer } from "@/footer/Footer";
import { TopBar } from "@/app/TopBar";
import { shareCard } from "@/app/site";

const description = "Start a project with Build Different. Tell us what you are building and we will come back with a plan and a price.";
export const metadata = {
  title: "Contact, Build Different",
  description,
  alternates: { canonical: "/contact/" },
  openGraph: shareCard("Contact, Build Different", "/contact/", description),
};

/** The contact page: the same form and Atlas as the foot of the front page, on its own. */
export default function ContactPage() {
  return (
    <main className="page page--contact">
      <TopBar light />
      <Footer standalone />
    </main>
  );
}
