import { ALL_PROJECTS } from "@/portal/work";

export const metadata = { title: "Work, Build Different", description: "Sites, apps and systems built by Build Different." };

/** The work page: heading, a line, one cover, then every project as a large preview with tags, name, line and a link. */
export default function WorkPage() {
  return (
    <main className="wp">
      <header className="wp__head">
        <a className="wp__home" href="/">Build Different</a>
        <h1 className="wp__title">Work built<br />to stand.</h1>
        <p className="wp__intro">Sites, apps and systems for people who needed the thing to hold up: read well, load fast, and still look right in five years.</p>
      </header>
      <h2 className="wp__sub">Selected projects</h2>
      <ul className="wp__grid">
        {ALL_PROJECTS.map((p) => (
          <li key={p.slug} className="wp__card">
            <a className="wp__link" href={`/work/${p.slug}`}>
              <figure className="wp__preview">
                <img src={p.site} alt={p.alt} width={1440} height={900} />
                <span className="wp__view" aria-hidden="true">View</span>
              </figure>
              <ul className="wp__tags" aria-label="Tags">
                {p.tags.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <h3 className="wp__name">{p.name}</h3>
              <p className="wp__line">{p.line}</p>
              <span className="wp__cta">Read about it</span>
            </a>
          </li>
        ))}
      </ul>
      <footer className="wp__foot">
        <a href="/#contact" className="cta">Start a project</a>
      </footer>
    </main>
  );
}
