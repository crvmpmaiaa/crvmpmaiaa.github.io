import { PROJECTS, MORE_PROJECTS } from "@/portal/work";

export const metadata = { title: "Work, Build Different" };

/** The portfolio page: everything, with room for a short article on each in time. */
export default function WorkPage() {
  const all = [...PROJECTS, ...MORE_PROJECTS];
  return (
    <main className="work-page">
      <h1>Work</h1>
      <p>Sites, apps and systems we have built or rebuilt. Each one will get its own page in time.</p>
      <div className="work-grid">
        {all.map((p) => (
          <article key={p.name}>
            <figure><img src={p.image} alt={p.alt} width={900} height={1950} loading="lazy" /></figure>
            <p className="kind">{p.kind}</p>
            <h2>{p.name}</h2>
            <p className="line">{p.line}</p>
          </article>
        ))}
      </div>
      <a className="back" href="/">Back to the front</a>
    </main>
  );
}
