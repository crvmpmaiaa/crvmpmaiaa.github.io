import { TopBar } from "@/app/TopBar";
import { shareCard, SITE_EMAIL } from "@/app/site";

const description = "How Build Different handles the details you send through this site: what we collect, why, where it is kept and how to have it removed.";
export const metadata = {
  title: "Privacy, Build Different",
  description,
  alternates: { canonical: "/privacy/" },
  openGraph: shareCard("Privacy, Build Different", "/privacy/", description),
};

/** The privacy notice. Update the "who we are" section when the company is formed. */
export default function PrivacyPage() {
  return (
    <main className="wp wp--article">
      <TopBar />
      <header className="wp__head wp__head--article">
        <h1 className="wp__title">Privacy</h1>
        <p className="wp__intro">What we collect through this site, why, where it is kept and how to have it removed. Last updated 18 September 2026.</p>
      </header>
      <article className="wp__body">
        <section>
          <h2>Who we are</h2>
          <p>Build Different is a web design and development studio based in Liverpool, UK, run by Jack Crump. Jack Crump, trading as Build Different, is the data controller for anything you send through this site. You can reach us at <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.</p>
        </section>
        <section>
          <h2>What we collect</h2>
          <p>Only what you type into the enquiry form: your name, your email address and your message. We do not ask for anything else, and you should not put sensitive information in the message.</p>
          <p>This site has no analytics, no advertising trackers and sets no cookies. It keeps two small notes in your own browser: one that remembers you have dismissed a notice, and one that records how far the 3D scene loaded so we can fix crashes. Neither leaves your device.</p>
        </section>
        <section>
          <h2>Why we collect it</h2>
          <p>To reply to your enquiry and, if you want to go ahead, to quote for and carry out the work. The lawful basis is our legitimate interest in answering people who contact us, and taking steps towards a contract at your request. We do not add you to a mailing list and we do not sell or share your details for marketing.</p>
        </section>
        <section>
          <h2>Where it goes</h2>
          <p>The form is handled by Netlify, which hosts this site, and the enquiry is then sent to our inbox, which is run by Google Workspace. Both companies may store data in the United States, under the UK International Data Transfer Addendum and the UK extension to the EU and US Data Privacy Framework. Netlify also keeps standard server logs, including IP addresses, for security.</p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <p>If an enquiry does not lead to work, we delete it within twelve months. If it does, we keep the correspondence for as long as we work together and for six years afterwards, which is what UK tax and contract law expects.</p>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>You can ask to see what we hold about you, have it corrected or deleted, or object to how we use it. Email <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a> and we will deal with it within one month. If you are unhappy with the answer you can complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">ico.org.uk</a>.</p>
        </section>
      </article>
    </main>
  );
}
