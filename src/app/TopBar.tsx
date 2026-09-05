/**
 * The bar across the top of the dark pages: BD in the middle, big and bold, that unfolds to BUILD DIFFERENT
 * under the pointer and folds back when it leaves. The hidden letters take no width until hover, so the B
 * and D slide apart as the words grow between them.
 */
export function TopBar() {
  return (
    <div className="bar">
      <a className="bd" href="/" aria-label="Build Different, home">
        <span className="bd__l">B</span><span className="bd__x" aria-hidden="true">UILD</span>
        <span className="bd__gap" aria-hidden="true" />
        <span className="bd__l">D</span><span className="bd__x" aria-hidden="true">IFFERENT</span>
      </a>
    </div>
  );
}
