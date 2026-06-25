// Synonym/proximity query expansion for the /oskused/ skill search (CL-1).
//
// Inimene otsib argikeeles ("graafikud excelis", "raamatupidamine") — õpiväljundid
// on aga sõnastatud ametlikult. See teisendab otsingusõna lähedaste mõistete pakiks,
// nii et otsing leiab ka siis, kui sõnastus erineb. Andmed (mõisteklastrid) elavad
// eraldi failis (skillSynonyms.ts); siin on AINULT puhas, deterministlik loogika —
// ei DOM-i, ei võrku — et seda saaks Node-testiga (scripts/skill-match.test.mjs)
// üksinda läbi mängida ja fikstuuriga süstida.
//
// Vasted on tahtlikult "leebed" (alamsõne mõlemas suunas), et katta käändeid ja
// liitsõnu. Liiga lühikesed/üldised terminid võivad otsingu üle-laiendada — seetõttu
// nõuab vaste pikkust >= 3 mõlemal poolel.

// Type-only import: node's TS type-stripping erases this entirely, so importing
// expandQuery in `node --test` never tries to resolve the data module. The caller
// (the /oskused/ <script>) injects the real `skillSynonyms`; tests inject a fixture.
import type { SkillCluster } from "../data/skillSynonyms";

export type { SkillCluster };

export interface ExpandedQuery {
  /** De-dupped union of every matched cluster's terms PLUS the raw normalized query. */
  terms: string[];
  /** De-dupped human labels of matched clusters — for a "näitan ka lähedasi" hint. */
  clusters: string[];
}

const MIN_LEN = 3;

/** A cluster matches when any term and the query overlap as a substring (either way). */
function clusterMatches(query: string, cluster: SkillCluster): boolean {
  for (const term of cluster.terms) {
    if (term.length >= MIN_LEN && query.includes(term)) return true;
    if (query.length >= MIN_LEN && term.includes(query)) return true;
  }
  return false;
}

/**
 * Expand a raw search string into related surface terms + matched cluster labels.
 *
 * @param raw      The user's query as typed.
 * @param clusters Concept clusters to match against (injected — `skillSynonyms`
 *                 in production, a fixture in tests).
 * @returns        `{ terms, clusters }`. Empty query → `{ terms: [], clusters: [] }`.
 *                 No cluster hit → `{ terms: [query], clusters: [] }` (literal fallback).
 * @example
 * expandQuery("graafikud excelis", skillSynonyms);
 * // → { terms: ["graafik", "excel", ..., "graafikud excelis"], clusters: ["andmete visualiseerimine"] }
 */
export function expandQuery(raw: string, clusters: SkillCluster[]): ExpandedQuery {
  const query = String(raw ?? "").trim().toLowerCase();
  if (!query) return { terms: [], clusters: [] };

  const terms = new Set<string>();
  const labels = new Set<string>();
  for (const cluster of clusters) {
    if (!clusterMatches(query, cluster)) continue;
    for (const term of cluster.terms) terms.add(term);
    labels.add(cluster.label);
  }

  // The raw query always searches literally, even when a cluster also matched.
  terms.add(query);

  if (labels.size === 0) return { terms: [query], clusters: [] };
  return { terms: [...terms], clusters: [...labels] };
}
