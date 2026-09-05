import { ALL_PROJECTS } from "@/portal/work";
import { WorkGrid } from "./WorkGrid";

export const metadata = { title: "Work, Build Different", description: "Sites, apps and systems built by Build Different." };

/** The work page: heading and a line, then every project as a large preview with tags, name, line and a link to its story. */
export default function WorkPage() {
  return (
    <main className="wp">
      <header className="wp__head">
        <a className="wp__home" href="/">Build Different</a>
        <h1 className="wp__title">Work built<br />to stand.</h1>
        <p className="wp__intro">Sites, apps and systems for people who needed the thing to hold up: read well, load fast, and still look right in five years.</p>
      </header>
      <h2 className="wp__sub">Selected projects</h2>
      <WorkGrid projects={ALL_PROJECTS} />
      <footer className="wp__foot">
        <a href="/#contact" className="cta">Start a project</a>
      </footer>
    </main>
  );
}
