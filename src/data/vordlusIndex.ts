import indexable from "./vordlus-indexable.json" with { type: "json" };

// /vordlus/<a>-vs-<b>/ paarilehed on tavaliselt noindex,follow (õhuke, kataloogi
// andmetest genereeritud sisu, ~130 lehte). Indekseeritavad on AINULT need, mis
// Search Console'i järgi juba töötavad — nimekiri ja värskendamise juhis on
// vordlus-indexable.json-is.
const indexablePairs = new Set<string>(indexable.pairs);

export function isIndexableVordlus(pair: string): boolean {
  return indexablePairs.has(pair);
}

/** `/vordlus/<pair>/` tee → paar, või null kui tee ei ole paarileht (nt `/vordlus/`). */
export function vordlusPairFromPath(pathname: string): string | null {
  const m = /^\/vordlus\/([^/]+)\/$/.exec(pathname);
  return m ? m[1] : null;
}
