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

let loadedFrom = "snapshot" as "feed" | "snapshot";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A feed must not shrink the universe by more than this share versus the committed snapshot. */
export const EHIS_FEED_MIN_SHARE_OF_SNAPSHOT = 0.9;

/** Pure gate for a remote feed. Returns null when acceptable, else a short reason.
 * Never downgrades: same envelope version, strict ISO day, not in the future, not older than the
 * committed snapshot, and not a partial feed (record_count/curricula must agree and keep >=90%). */
export function ehisFeedRejection(
  feed: EhisFactsSnapshot | null | undefined,
  committed: Pick<EhisFactsSnapshot, "snapshot_version" | "fetched_at" | "curricula">,
  today: string = new Date().toISOString().slice(0, 10)
): string | null {
  if (!feed || !Array.isArray(feed.curricula) || !feed.curricula.length) return "empty";
  if (feed.snapshot_version !== committed.snapshot_version) return "version";
  if (typeof feed.fetched_at !== "string" || !ISO_DAY.test(feed.fetched_at)) return "fetched_at_format";
  if (feed.fetched_at > today) return "fetched_at_future";
  if (feed.fetched_at < committed.fetched_at) return "older_than_snapshot";
  if (feed.record_count !== feed.curricula.length) return "record_count_mismatch";
  if (feed.curricula.length < committed.curricula.length * EHIS_FEED_MIN_SHARE_OF_SNAPSHOT) return "partial";
  return null;
}

async function load(): Promise<EhisFactsSnapshot> {
  if (FEED_URL) {
    try {
      const res = await fetch(FEED_URL);
      if (res.ok) {
        const data = (await res.json()) as EhisFactsSnapshot;
        const rejection = ehisFeedRejection(data, local);
        if (!rejection) {
          console.log(`[ehis] AMOS feed: ${data.curricula.length} õppekava (${FEED_URL})`);
          loadedFrom = "feed";
          return sanitize(data);
        }
        console.warn(`[ehis] feed lükati tagasi (${rejection}); kasutan kohalikku snapshotti`);
        return local;
      }
      console.warn(`[ehis] feed ei vasta (HTTP ${res.status}); kasutan kohalikku snapshotti`);
    } catch (e) {
      console.warn(`[ehis] feedi laadimine ebaõnnestus; kasutan kohalikku snapshotti: ${(e as Error).message}`);
    }
  }
  return local;
}

const data = await load();

/** "feed" = refreshed automatically from the AMOS host job; "snapshot" = the committed file. */
export const ehisLoadedFrom: "feed" | "snapshot" = loadedFrom;

/** Public wording of the refresh promise (HTM 08.10.2026: state last update and frequency).
 * The site is static, so the sentence describes the BUILD: it is shown only when the data really
 * came from the automatic AMOS feed AND is fresh enough (<= 45 days at build) for the promise to hold. */
export const EHIS_UPDATE_CADENCE_TEXT = "Uuendatakse automaatselt vähemalt kord kuus.";
export const EHIS_CADENCE_MAX_AGE_DAYS = 45;
export function ehisCadenceNoteFor(
  loadedFromFeed: boolean,
  fetchedAt: string,
  today: string = new Date().toISOString().slice(0, 10)
): string | null {
  if (!loadedFromFeed || !ISO_DAY.test(fetchedAt)) return null;
  const ageDays = (Date.parse(today) - Date.parse(fetchedAt)) / 86_400_000;
  return ageDays <= EHIS_CADENCE_MAX_AGE_DAYS ? EHIS_UPDATE_CADENCE_TEXT : null;
}
export const ehisCadenceNote: string | null = ehisCadenceNoteFor(ehisLoadedFrom === "feed", data.fetched_at);

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
  /** Set when several EHIS records share the name AND disagree on EAP. We do not
   * pick one silently — the entry is flagged "vajab kontrolli" (eapGuard.ts). */
  conflict?: EhisCurriculum[];
}

/** Drop listing decoration that is not part of the official curriculum name:
 * a "Mikrokraadiprogramm:" style prefix and a trailing intake year ("2026/2027",
 * "2026-2027", "2026"). Used only as an ADDITIONAL exact-match key. */
export function stripListingDecor(name: string): string {
  return name
    .replace(/^\s*(mikrokraadiprogramm|mikrokraadi programm|mikrokraad|mikrokvalifikatsioon(iõppe õppekava)?)\s*[:\-–]\s*/i, "")
    .replace(/\s*[\(\[]?\s*(20\d{2})\s*[\/\-–]\s*(20\d{2}|\d{2})\s*[\)\]]?\s*$/, "")
    .replace(/\s*[\(\[]?\s*20\d{2}\s*[\)\]]?\s*$/, "")
    .trim();
}

function recency(c: EhisCurriculum): string {
  return c.updated_at ?? c.registered_at ?? "";
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
  const stripped = norm(stripListingDecor(entry.name));
  const targets = new Set([target, ...(stripped ? [stripped] : [])]);

  // 1. exact normalized name match (et or en), with or without listing decoration.
  const exact = candidates.filter(
    (c) => targets.has(norm(c.name_et)) || (c.name_en != null && targets.has(norm(c.name_en)))
  );
  if (exact.length === 1) return { confidence: "exact", curriculum: exact[0] };
  if (exact.length > 1) {
    // Multiple identical names under one provider. If they agree on EAP, any of
    // them gives the same fact: take the most recently updated. If they disagree
    // we must NOT choose (a wrong EAP is a public factual error): report the
    // conflict so the entry is flagged for manual review.
    const eaps = new Set(exact.map((c) => c.eap));
    if (eaps.size === 1) {
      const newest = exact.slice().sort((a, b) => recency(b).localeCompare(recency(a)))[0];
      return { confidence: "exact", curriculum: newest };
    }
    return { confidence: "none", curriculum: null, conflict: exact };
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
