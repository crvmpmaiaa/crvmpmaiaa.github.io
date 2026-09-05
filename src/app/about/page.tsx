import { TopBar } from "@/app/TopBar";
export const metadata = { title: "About, Build Different" };

/** About us. Jack writes this; the shape is here. */
export default function AboutPage() {
  return (
    <main className="wp wp--article">
      <TopBar />
      <header className="wp__head wp__head--article">
        <h1 className="wp__title">About us</h1>
        <p className="wp__intro">Who we are, how we work, and why the site you are on looks like this.</p>
      </header>
      <article className="wp__body">
        <p className="wp__placeholder">Jack is writing this one.</p>
        <p><a className="cta" href="/contact">Start a project</a></p>
      </article>
    </main>
  );
}
