// VENDORED from AMOS `amos.outcome.fit/v1`
// (02S-AMOS: infra/contracts/outcome/outcome-fit-contract.mjs).
//
// The deterministic set-cover fit engine — single source of truth for "best
// single programme + minimal combination" across AMOS. Vendored here so the
// static /oskused page runs the SAME algorithm AMOS uses, instead of an ad-hoc
// local copy. Keep in sync with the AMOS contract; when this page consumes the
// published AMOS coverage projection (`/mkval-catalog/coverage-projection.json`,
// canonical out_ refs), the only change is the data source — this logic stays.
//
// ONE documented adaptation vs the AMOS source: `normalizePackage` accepts any
// non-empty string ref (the page currently keys outcomes by their lowercased
// text, not canonical out_ refs). The core algorithm (bestSingleVariant /
// minimalCombination / cmpCost) is byte-for-byte the AMOS logic.

export const OUTCOME_FIT_VERSION = "amos.outcome.fit/v1";

export interface CoverageRow {
  variant_ref: string;
  outcome_refs: string[];
  eap?: number | null;
  price_eur?: number | null;
  title?: string | null;
  school?: string | null;
}

interface Facts {
  variant_ref: string;
  eap: number | null;
  price_eur: number | null;
  title: string | null;
  school: string | null;
}

export interface BestSingle extends Facts {
  covered_refs: string[];
  covered_count: number;
  package_size: number;
  fully_covers: boolean;
}

export interface ComboVariant extends Facts {
  adds_refs: string[];
}

export interface Combination {
  variants: ComboVariant[];
  program_count: number;
  covered_refs: string[];
  uncovered_refs: string[];
  fully_covered: boolean;
  package_size: number;
  total_eap: number | null;
  total_price_eur: number | null;
}

export interface Fit {
  fit_version: string;
  package_size: number;
  best_single: BestSingle | null;
  combination: Combination;
}

/** Adaptation: accept any non-empty string ref (local text keys), dedup. */
export function normalizePackage(packageRefs: unknown): string[] {
  if (!Array.isArray(packageRefs)) return [];
  return [...new Set(packageRefs.map((r) => String(r)))].filter((r) => r.length > 0);
}

// Deterministic tie-break for EQUAL new coverage: cheaper (price), then lighter
// (EAP), then lexicographic variant_ref. Known cost sorts before unknown (null).
function cmpCost(a: Facts, b: Facts): number {
  const pa = a.price_eur, pb = b.price_eur;
  if (pa != null && pb != null && pa !== pb) return pa - pb;
  if (pa != null && pb == null) return -1;
  if (pa == null && pb != null) return 1;
  const ea = a.eap, eb = b.eap;
  if (ea != null && eb != null && ea !== eb) return ea - eb;
  if (ea != null && eb == null) return -1;
  if (ea == null && eb != null) return 1;
  return String(a.variant_ref) < String(b.variant_ref) ? -1 : 1;
}

function facts(v: CoverageRow): Facts {
  return {
    variant_ref: v.variant_ref,
    eap: v.eap ?? null,
    price_eur: v.price_eur ?? null,
    title: v.title ?? null,
    school: v.school ?? null,
  };
}

export function bestSingleVariant(packageRefs: string[], projection: CoverageRow[]): BestSingle | null {
  const want = new Set(normalizePackage(packageRefs));
  if (want.size === 0) return null;
  let best: (Facts & { covered_refs: string[]; covered_count: number }) | null = null;
  for (const v of projection) {
    const covered = (v.outcome_refs || []).filter((r) => want.has(r));
    if (covered.length === 0) continue;
    const cand = { ...facts(v), covered_refs: covered, covered_count: covered.length };
    if (
      best === null ||
      cand.covered_count > best.covered_count ||
      (cand.covered_count === best.covered_count && cmpCost(cand, best) < 0)
    ) {
      best = cand;
    }
  }
  if (!best) return null;
  return { ...best, package_size: want.size, fully_covers: best.covered_count === want.size };
}

export function minimalCombination(packageRefs: string[], projection: CoverageRow[]): Combination {
  const remaining = new Set(normalizePackage(packageRefs));
  const packageSize = remaining.size;
  const chosen: ComboVariant[] = [];
  const usedRefs = new Set<string>();
  while (remaining.size > 0) {
    let pick: (Facts & { adds_count: number }) | null = null;
    let pickAdds: string[] = [];
    for (const v of projection) {
      if (usedRefs.has(v.variant_ref)) continue;
      const adds = (v.outcome_refs || []).filter((r) => remaining.has(r));
      if (adds.length === 0) continue;
      const cand = { ...facts(v), adds_count: adds.length };
      if (
        pick === null ||
        cand.adds_count > pick.adds_count ||
        (cand.adds_count === pick.adds_count && cmpCost(cand, pick) < 0)
      ) {
        pick = cand;
        pickAdds = adds;
      }
    }
    if (!pick) break;
    usedRefs.add(pick.variant_ref);
    chosen.push({ variant_ref: pick.variant_ref, eap: pick.eap, price_eur: pick.price_eur, title: pick.title, school: pick.school, adds_refs: pickAdds });
    for (const r of pickAdds) remaining.delete(r);
  }
  const allEap = chosen.length > 0 && chosen.every((c) => c.eap != null);
  const allPrice = chosen.length > 0 && chosen.every((c) => c.price_eur != null);
  return {
    variants: chosen,
    program_count: chosen.length,
    covered_refs: normalizePackage(packageRefs).filter((r) => !remaining.has(r)),
    uncovered_refs: [...remaining],
    fully_covered: remaining.size === 0,
    package_size: packageSize,
    total_eap: allEap ? chosen.reduce((s, c) => s + (c.eap as number), 0) : null,
    total_price_eur: allPrice ? chosen.reduce((s, c) => s + (c.price_eur as number), 0) : null,
  };
}

export function computeFit(packageRefs: string[], projection: CoverageRow[]): Fit {
  const refs = normalizePackage(packageRefs);
  return {
    fit_version: OUTCOME_FIT_VERSION,
    package_size: refs.length,
    best_single: bestSingleVariant(refs, projection),
    combination: minimalCombination(refs, projection),
  };
}
