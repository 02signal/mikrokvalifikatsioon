import type { CatalogEntry } from "../catalogSchema";
import taltech from "./taltech.json";
import tartuYlikool from "./tartu-ylikool.json";
import muudKoolid from "./muud-koolid.json";
import { assignSlugs, slugify } from "../slug";
import { parseIntakeDates } from "../dates";

/** Kohalik snapshot — fallback, kui AMOS feedi pole seatud või see ei vasta. */
const LOCAL_CHECKED_AT = "2026-06-12";
const localEntries: CatalogEntry[] = [
  ...(taltech as unknown as CatalogEntry[]),
  ...(tartuYlikool as unknown as CatalogEntry[]),
  ...(muudKoolid as unknown as CatalogEntry[])
];

/**
 * Andmeallikas. Kui PUBLIC_CATALOG_FEED_URL on seatud, tarbime AMOS-i avaldatud
 * public-safe feedi build-ajal; muidu kasutame kohalikku snapshotti (resilientne).
 * Feedi kuju: { checkedAt, generatedAt, contentHash, programs: CatalogEntry[] } VÕI lihtsalt CatalogEntry[].
 * Ainult `status: "active"` (või staatuseta) kirjed lähevad avalikku saiti.
 * Vt docs/data-pipeline.md.
 */
const FEED_URL = import.meta.env.PUBLIC_CATALOG_FEED_URL as string | undefined;

function isoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

async function loadFeed(): Promise<{ entries: CatalogEntry[]; checkedAt: string; updatedAt: string; contentHash: string | null }> {
  if (FEED_URL) {
    try {
      const res = await fetch(FEED_URL);
      if (res.ok) {
        const data = await res.json();
        const raw = (Array.isArray(data) ? data : data?.programs) as Array<CatalogEntry & { status?: string }> | undefined;
        if (Array.isArray(raw) && raw.length) {
          const entries = raw.filter((p) => !p.status || p.status === "active");
          const checkedAt = !Array.isArray(data) ? (isoDate(data?.checkedAt) ?? LOCAL_CHECKED_AT) : LOCAL_CHECKED_AT;
          const updatedAt = !Array.isArray(data) ? (isoDate(data?.generatedAt) ?? isoDate(data?.updatedAt) ?? checkedAt) : checkedAt;
          const contentHash = !Array.isArray(data) && typeof data?.contentHash === "string" ? data.contentHash : null;
          console.log(`[catalog] AMOS feed: ${entries.length} programmi (${FEED_URL})`);
          return { entries, checkedAt, updatedAt, contentHash };
        }
      }
      console.warn(`[catalog] feed ei vasta (HTTP ${res.status}); kasutan kohalikku snapshotti`);
    } catch (e) {
      console.warn(`[catalog] feedi laadimine ebaõnnestus; kasutan kohalikku snapshotti: ${(e as Error).message}`);
    }
  }
  return { entries: localEntries, checkedAt: LOCAL_CHECKED_AT, updatedAt: LOCAL_CHECKED_AT, contentHash: null };
}

const feed = await loadFeed();

export const catalogCheckedAt = feed.checkedAt;
export const catalogUpdatedAt = feed.updatedAt;
export const catalogContentHash = feed.contentHash;

/** Kataloogi kirje koos püsiva slugiga (/kataloog/<slug>/). */
export type CatalogEntryWithSlug = CatalogEntry & { slug: string };

const sorted: CatalogEntry[] = feed.entries
  .slice()
  .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));

const slugs = assignSlugs(sorted, (entry) => `${entry.provider} ${entry.name}`);

export const catalog: CatalogEntryWithSlug[] = sorted.map((entry) => {
  const parsed = parseIntakeDates(entry.intakeText);
  return {
    ...entry,
    slug: slugs.get(entry) as string,
    registrationDeadline: entry.registrationDeadline ?? parsed.registrationDeadline,
    startDate: entry.startDate ?? parsed.startDate
  };
});

/** Slug -> kirje, programmilehe (getStaticPaths) ja masinliideste jaoks. */
export const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));

export const providers = [...new Set(catalog.map((entry) => entry.provider))];
export const fields = [...new Set(catalog.map((entry) => entry.field))].sort((a, b) => a.localeCompare(b, "et"));

/** Valdkonnad koos slugiga (/valdkond/<slug>/). "muu" on koondkategooria — sellele eraldi lehte ei tee. */
export const fieldsWithSlug = fields
  .filter((field) => field !== "muu")
  .map((field) => ({ field, slug: slugify(field) }));
export const fieldBySlug = new Map(fieldsWithSlug.map((f) => [f.slug, f.field]));

/** Pakkujad koos slugiga (/koolitaja/<slug>/). */
export const providersWithSlug = providers.map((provider) => ({ provider, slug: slugify(provider) }));
export const providerBySlug = new Map(providersWithSlug.map((p) => [p.slug, p.provider]));
