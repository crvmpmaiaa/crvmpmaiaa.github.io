import { TopBar } from "@/app/TopBar";
import { notFound } from "next/navigation";
import { ALL_PROJECTS } from "@/portal/work";
import { STORIES } from "../stories";

/** One page per project. Jack writes the story here; the live site is linked from here, not from the grid. */
export function generateStaticParams() {
  return ALL_PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = ALL_PROJECTS.find((x) => x.slug === slug);
  return { title: p ? `${p.name}, Build Different` : "Work, Build Different", description: p?.line };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = ALL_PROJECTS.find((x) => x.slug === slug);
  if (!p) notFound();
  const i = ALL_PROJECTS.indexOf(p);
  const next = ALL_PROJECTS[(i + 1) % ALL_PROJECTS.length];
  return (
    <main className="wp wp--article">
      <TopBar />
      <header className="wp__head wp__head--article">
        <a className="wp__back" href="/work">Back to work</a>
        <ul className="wp__tags" aria-label="Tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        <h1 className="wp__title">{p.name}</h1>
        <p className="wp__intro">{p.line}</p>
      </header>
      <figure className="wp__cover">
        <img src={p.site} alt={p.alt} width={1440} height={900} />
      </figure>
      <article className="wp__body">
        {(STORIES[p.slug]?.sections ?? []).map((sec) => (
          <section key={sec.h}>
            <h2>{sec.h}</h2>
            {sec.ps.map((t, i) => <p key={i}>{t}</p>)}
          </section>
        ))}
        {p.url ? (
          <p><a className="cta" href={p.url} target="_blank" rel="noreferrer">Visit the live site</a></p>
        ) : (
          <p className="wp__placeholder">This is a private build, so there is no public link.</p>
        )}
      </article>
      <nav className="wp__next" aria-label="Next project">
        <span>Next</span>
        <a href={`/work/${next.slug}`}>{next.name}</a>
      </nav>
    </main>
  );
}
