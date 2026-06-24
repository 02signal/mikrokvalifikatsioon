import { catalog } from "./catalog";

// "X vs Y" võrdluslehed (pSEO). Et vältida õhukesi/doorway-lehti, genereerime AINULT
// mõttekaid paare: sama valdkond, eri kool, MÕLEMAL on õpiväljundid (et lehel oleks päris
// võrdlussisu), iga programmi kohta kuni TOP_K kõige sarnasemat. Paarid dedupitakse.

type Entry = (typeof catalog)[number];

const TOP_K = 2;

function outcomeKeys(e: Entry): Set<string> {
  return new Set((e.outcomes ?? []).map((o) => o.trim().toLowerCase()).filter(Boolean));
}

export interface Comparison {
  pair: string; // "<slugA>-vs-<slugB>", slugA < slugB
  a: Entry;
  b: Entry;
  shared: string[];
  aOnly: string[];
  bOnly: string[];
}

const withOutcomes = catalog.filter((e) => (e.outcomes?.length ?? 0) > 0);

function similarity(a: Entry, b: Entry): number {
  const sa = outcomeKeys(a);
  let shared = 0;
  for (const k of outcomeKeys(b)) if (sa.has(k)) shared += 1;
  return shared;
}

const seen = new Map<string, Comparison>();

for (const a of withOutcomes) {
  const candidates = withOutcomes
    .filter((b) => b.slug !== a.slug && b.field === a.field && b.provider !== a.provider)
    .map((b) => ({
      b,
      shared: similarity(a, b),
      ectsGap: a.ects != null && b.ects != null ? Math.abs(a.ects - b.ects) : 999
    }))
    .sort((x, y) => y.shared - x.shared || x.ectsGap - y.ectsGap)
    .slice(0, TOP_K);

  for (const { b } of candidates) {
    const [first, second] = a.slug < b.slug ? [a, b] : [b, a];
    const key = `${first.slug}-vs-${second.slug}`;
    if (seen.has(key)) continue;
    const aKeys = outcomeKeys(first);
    const bKeys = outcomeKeys(second);
    const shared = (first.outcomes ?? []).filter((o) => bKeys.has(o.trim().toLowerCase()));
    const aOnly = (first.outcomes ?? []).filter((o) => !bKeys.has(o.trim().toLowerCase()));
    const bOnly = (second.outcomes ?? []).filter((o) => !aKeys.has(o.trim().toLowerCase()));
    seen.set(key, { pair: key, a: first, b: second, shared, aOnly, bOnly });
  }
}

export const comparisons: Comparison[] = [...seen.values()].sort((x, y) => x.pair.localeCompare(y.pair));
export const comparisonByPair = new Map(comparisons.map((c) => [c.pair, c]));

// Iga programmi seotud võrdlused (detaillehe ristlinkimiseks).
export function comparisonsFor(slug: string): Comparison[] {
  return comparisons.filter((c) => c.a.slug === slug || c.b.slug === slug);
}
