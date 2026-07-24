// EHIS curriculum-facts data layer — official open data from EHIS (Eesti Hariduse
// Infosüsteem), publisher Haridus- ja Teadusministeerium. Licence: avaandmed.eesti.ee
// (taaskasutatav, viitega allikale). EHIS õpiväljundid is official open data and may be
// reproduced verbatim WITH attribution (unlike schools' copyrighted marketing pages).
//
// Build-time feed (PUBLIC_EHIS_FACTS_FEED_URL) with a committed snapshot fallback,
// mirroring src/data/salary/index.ts. A parallel AMOS agent produces the EXACTLY
// identical shape (amos.ehis.curriculum_facts/v1), so the feed and the snapshot are
// interchangeable.

import snapshot from "./snapshot.json" with { type: "json" };
import type { CatalogEntry } from "../catalogSchema";

export interface EhisCurriculum {
  ehis_kood: string;
  registrikood: string | null;
  provider: string;
  provider_type: string | null;
  name_et: string;
  name_en: string | null;
  curriculum_type: string | null;
  eap: number | null;
  field_code: string | null;
  field_name: string | null;
  study_direction: string | null;
  languages: string[];
  outcomes: string[];
  status: string | null;
  registered_at: string | null;
  updated_at: string | null;
  official_pdf_url: string | null;
}

export interface EhisFactsSnapshot {
  snapshot_version: string;
  source: string;
  source_endpoint: string;
  publisher: string;
  attribution_text: string;
  licence: string;
  fetched_at: string;
  record_count: number;
  curricula: EhisCurriculum[];
}

// `import.meta.env` puudub mõnes kontekstis (nt `node --test` floor-gate'is);
// loeme turvaliselt (?.), et moodulit saaks importida ka väljaspool Astro buildi.
const FEED_URL = (import.meta as ImportMeta).env?.PUBLIC_EHIS_FACTS_FEED_URL as string | undefined;

/** v1 contract: official_pdf_url is an http(s) URL or null. The live EHIS field can be
 * a placeholder ("Hetkel puudub") or a bare code ("AYC0439"); coerce non-URLs to null so
 * the detail page never renders a broken PDF href. Applied to feed AND snapshot. */
function httpUrlOrNull(v: unknown): string | null {
  return typeof v === "string" && /^https?:\/\//i.test(v.trim()) ? v.trim() : null;
}

function sanitize(s: EhisFactsSnapshot): EhisFactsSnapshot {
  return {
    ...s,
    curricula: s.curricula.map((c) => ({ ...c, official_pdf_url: httpUrlOrNull(c.official_pdf_url) })),
  };
}

const local = sanitize(snapshot as unknown as EhisFactsSnapshot);

async function load(): Promise<EhisFactsSnapshot> {
  if (FEED_URL) {
    try {
      const res = await fetch(FEED_URL);
      if (res.ok) {
        const data = (await res.json()) as EhisFactsSnapshot;
        if (data?.curricula?.length && data.snapshot_version === local.snapshot_version) {
          console.log(`[ehis] AMOS feed: ${data.curricula.length} õppekava (${FEED_URL})`);
          return sanitize(data);
        }
      }
      console.warn(`[ehis] feed ei vasta (HTTP ${res.status}); kasutan kohalikku snapshotti`);
    } catch (e) {
      console.warn(`[ehis] feedi laadimine ebaõnnestus; kasutan kohalikku snapshotti: ${(e as Error).message}`);
    }
  }
  return local;
}

const data = await load();

export const ehisAttribution: string = data.attribution_text;
export const ehisPublisher: string = data.publisher;
export const ehisLicence: string = data.licence;
export const ehisFetchedAt: string = data.fetched_at;
export const ehisCurricula: EhisCurriculum[] = data.curricula;
export const ehisRegisteredCurricula: EhisCurriculum[] = ehisCurricula.filter((c) => c.status === "Registreeritud");

export interface EhisCountRow {
  key: string;
  label: string;
  count: number;
}

function countBy(items: EhisCurriculum[], keyOf: (item: EhisCurriculum) => string | null | undefined): EhisCountRow[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item)?.trim() || "Määramata";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: norm(label), label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "et"));
}

export const ehisProviderStats: EhisCountRow[] = countBy(ehisRegisteredCurricula, (c) => c.provider);
export const ehisProviderTypeStats: EhisCountRow[] = countBy(ehisRegisteredCurricula, (c) => c.provider_type);
export const ehisFieldStats: EhisCountRow[] = countBy(ehisRegisteredCurricula, (c) => c.field_name);

export const ehisProgrammeCount = ehisRegisteredCurricula.length;
export const ehisProviderCount = ehisProviderStats.length;
export const ehisFieldCount = ehisFieldStats.filter((row) => row.label !== "Määramata").length;

const BY_KOOD = new Map<string, EhisCurriculum>(data.curricula.map((c) => [c.ehis_kood, c]));

/** EHIS curriculum by its official code (oppekavaKood), or undefined. */
export function findByKood(kood: string): EhisCurriculum | undefined {
  return BY_KOOD.get(kood);
}

// ---- deterministic matching layer ----------------------------------------
// For each catalog entry we match to an EHIS record by provider + name.
// Provider must match (via a small alias map); name match is exact-normalized
// first, then a conservative contains/levenshtein threshold. We NEVER mis-merge
// on a weak guess — `none` keeps per-school facts untouched.

export type MatchConfidence = "exact" | "strong" | "none";

export interface EhisMatch {
  confidence: MatchConfidence;
  curriculum: EhisCurriculum | null;
}

/** Normalize an Estonian string for comparison: lowercase, strip diacritics,
 * drop punctuation/quotes, collapse whitespace. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Catalog provider label -> EHIS oppeasutus label. The catalog uses short brand
// names ("TalTech", "EBS") while EHIS uses the official institution names.
const PROVIDER_ALIASES: Record<string, string[]> = {
  TalTech: ["Tallinna Tehnikaülikool"],
  EBS: ["Estonian Business School"],
};

/** All EHIS provider labels a catalog provider may match (itself + aliases). */
function ehisProviderLabels(catalogProvider: string): string[] {
  return [catalogProvider, ...(PROVIDER_ALIASES[catalogProvider] ?? [])];
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// EHIS records grouped by normalized provider label, for a bounded per-entry scan.
const BY_PROVIDER = new Map<string, EhisCurriculum[]>();
for (const c of data.curricula) {
  const key = norm(c.provider);
  const list = BY_PROVIDER.get(key);
  if (list) list.push(c);
  else BY_PROVIDER.set(key, [c]);
}

/**
 * Match a catalog entry to an EHIS record. Deterministic and conservative:
 *  - provider must match (entry.provider or one of its aliases) — else `none`;
 *  - `exact`  : a candidate whose normalized name_et OR name_en equals the entry name;
 *  - `strong` : a single best candidate within a tight levenshtein/contains threshold;
 *  - `none`   : no confident match → per-school facts stay untouched.
 */
export function matchForCatalogEntry(entry: CatalogEntry): EhisMatch {
  const candidates: EhisCurriculum[] = [];
  for (const label of ehisProviderLabels(entry.provider)) {
    const list = BY_PROVIDER.get(norm(label));
    if (list) candidates.push(...list);
  }
  if (!candidates.length) return { confidence: "none", curriculum: null };

  const target = norm(entry.name);
  if (!target) return { confidence: "none", curriculum: null };

  // 1. exact normalized name match (et or en).
  const exact = candidates.filter((c) => norm(c.name_et) === target || (c.name_en != null && norm(c.name_en) === target));
  if (exact.length === 1) return { confidence: "exact", curriculum: exact[0] };
  if (exact.length > 1) {
    // Multiple identical names under one provider — ambiguous, do not merge.
    return { confidence: "none", curriculum: null };
  }

  // 2. conservative fuzzy: best single candidate within threshold.
  // Threshold scales with length but stays tight (<= ~12% edits), and we accept a
  // clean containment (one name fully inside the other) for sub-title variants.
  let best: EhisCurriculum | null = null;
  let bestDist = Infinity;
  let bestContains = false;
  for (const c of candidates) {
    const names = [norm(c.name_et), ...(c.name_en != null ? [norm(c.name_en)] : [])].filter(Boolean);
    for (const cn of names) {
      if (!cn) continue;
      const contains = cn.includes(target) || target.includes(cn);
      const dist = levenshtein(cn, target);
      if (dist < bestDist || (dist === bestDist && contains && !bestContains)) {
        bestDist = dist;
        best = c;
        bestContains = contains;
      }
    }
  }
  if (best) {
    const maxLen = Math.max(target.length, norm(best.name_et).length);
    const ratio = bestDist / Math.max(maxLen, 1);
    // Accept as strong only if clearly the same programme: small edit ratio, OR
    // a clean containment with a modest absolute edit distance. Require uniqueness
    // at this confidence to avoid two near-equal candidates.
    const within = ratio <= 0.12 || (bestContains && bestDist <= Math.ceil(maxLen * 0.25));
    if (within) {
      const tie = candidates.filter((c) => {
        const names = [norm(c.name_et), ...(c.name_en != null ? [norm(c.name_en)] : [])];
        return names.some((cn) => cn && cn !== norm(best!.name_et) && levenshtein(cn, target) === bestDist);
      });
      if (!tie.length) return { confidence: "strong", curriculum: best };
    }
  }

  return { confidence: "none", curriculum: null };
}

// ---- authoritative-facts + dual-description layer -------------------------
// Owner decision (2026-06-24, refined): on a matched (exact|strong) entry, EHIS
// is the AUTHORITATIVE source for the official FACTS — we OVERRIDE name / EAP /
// language from EHIS (official open data).
//
// For the DESCRIPTIVE/OUTCOMES layer we DO NOT replace — we show BOTH. The
// school's OWN content (summary, goalText, its original `outcomes`) is kept
// UNTOUCHED on the entry, and the EHIS official `outcomes` are carried
// SEPARATELY as `ehisOutcomes`. The detail page renders two labelled sections:
// "Õpiväljundid (ametlik – EHIS)" and "Kooli enda kirjeldus". Nothing
// disappears.
//
// We KEEP per-school: priceText, durationText, format, summary, goalText,
// outcomes (school original), assessmentText, url. Unmatched (`none`) entries
// stay entirely per-school.
//
// CRITICAL: we never replace the curated navigation taxonomy `field` (it powers
// /valdkond, catalog filters, and the comparison landings). EHIS's raw
// õppekavarühm (field_code + field_name) is ATTACHED as an extra authoritative
// classification, displayed on the detail page — not used for navigation/URLs.

/** Map EHIS `languages` (full ET strings like "eesti keel"/"inglise keel") back
 * to the catalog enum. Estonian present (alone or mixed) → "et"; otherwise if
 * English present → "en"; else null. Mirrors the catalog's "et|en|null" shape. */
export function ehisLanguageToCatalog(languages: string[] | null | undefined): "et" | "en" | null {
  if (!languages || !languages.length) return null;
  const lower = languages.map((l) => l.toLowerCase());
  if (lower.some((l) => l.includes("eesti"))) return "et";
  if (lower.some((l) => l.includes("inglise"))) return "en";
  return null;
}

/** The EHIS-authoritative fields attached to a matched catalog entry, plus the
 * provenance metadata the detail page renders. `null` `ehis` = unmatched. */
export interface EhisAuthoritative {
  /** true when EHIS is the authoritative source for this entry's facts. */
  authoritative: boolean;
  confidence: MatchConfidence;
  /** EHIS official code (oppekavaKood). */
  ehisKood: string | null;
  /** EHIS EN name, kept for EN context (not the override target for `name`). */
  nameEn: string | null;
  /** EHIS official õppekavarühm — ATTACHED, not used for nav/URLs. */
  fieldCode: string | null;
  fieldName: string | null;
  /** Valid http(s) official PDF URL or null. */
  officialPdfUrl: string | null;
  /** EHIS official õpiväljundid (open data, EHIS-attributed). Shown in the
   * "Õpiväljundid (ametlik – EHIS)" section ALONGSIDE the school's own. null
   * when EHIS has none for this curriculum. The school's own `outcomes` are
   * NOT replaced — both are displayed. */
  ehisOutcomes: string[] | null;
}

export interface EhisOverride {
  /** Authoritative FACTS to spread over the catalog entry (only name/EAP/
   * language). The descriptive layer (summary/goalText/outcomes) is NOT patched
   * — the school's own content stays on the entry and EHIS outcomes ride along
   * in `ehis.ehisOutcomes`. */
  patch: Partial<{
    name: string;
    ects: number | null;
    language: "et" | "en" | null;
  }>;
  ehis: EhisAuthoritative;
}

/** Compute the authoritative EHIS facts override for a catalog entry. On a
 * matched entry, returns the FACTS patch (name/EAP/language from EHIS) plus the
 * õppekavarühm, provenance, and the EHIS official outcomes carried SEPARATELY
 * (so the school's own outcomes/summary/goal are preserved for a dual view).
 * `factFallback` lets callers match with a historical identity while keeping
 * every missing official fact anchored to the current catalog row. On `none`,
 * returns an empty patch and `authoritative: false`. */
export function ehisOverrideFor(
  entry: CatalogEntry,
  factFallback: CatalogEntry = entry
): EhisOverride {
  const match = matchForCatalogEntry(entry);
  const c = match.curriculum;
  if (!c) {
    return {
      patch: {},
      ehis: {
        authoritative: false,
        confidence: "none",
        ehisKood: null,
        nameEn: null,
        fieldCode: null,
        fieldName: null,
        officialPdfUrl: null,
        ehisOutcomes: null,
      },
    };
  }

  const officialName = c.name_et.replace(/\s+/g, " ").trim();
  const ehisOutcomes = c.outcomes && c.outcomes.length > 0 ? c.outcomes : null;
  const language = ehisLanguageToCatalog(c.languages) ?? factFallback.language ?? null;

  return {
    // FACTS only — descriptive layer left to the school's own fields.
    patch: {
      name: officialName || factFallback.name,
      ects: c.eap ?? factFallback.ects ?? null,
      language,
    },
    ehis: {
      authoritative: true,
      confidence: match.confidence,
      ehisKood: c.ehis_kood,
      nameEn: c.name_en,
      fieldCode: c.field_code,
      fieldName: c.field_name,
      officialPdfUrl: httpUrlOrNull(c.official_pdf_url),
      ehisOutcomes,
    },
  };
}
