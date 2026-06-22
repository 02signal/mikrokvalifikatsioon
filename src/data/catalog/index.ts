import type { CatalogEntry } from "../catalogSchema";
import taltech from "./taltech.json";
import tartuYlikool from "./tartu-ylikool.json";
import muudKoolid from "./muud-koolid.json";
import { assignSlugs, slugify } from "../slug";

export const catalogCheckedAt = "2026-06-12";

/** Kataloogi kirje koos püsiva slugiga (/kataloog/<slug>/). */
export type CatalogEntryWithSlug = CatalogEntry & { slug: string };

const sorted: CatalogEntry[] = [
  ...(taltech as unknown as CatalogEntry[]),
  ...(tartuYlikool as unknown as CatalogEntry[]),
  ...(muudKoolid as unknown as CatalogEntry[])
].sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));

const slugs = assignSlugs(sorted, (entry) => `${entry.provider} ${entry.name}`);

export const catalog: CatalogEntryWithSlug[] = sorted.map((entry) => ({
  ...entry,
  slug: slugs.get(entry) as string
}));

/** Slug -> kirje, programmilehe (getStaticPaths) ja masinliideste jaoks. */
export const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));

export const providers = [...new Set(catalog.map((entry) => entry.provider))];
export const fields = [...new Set(catalog.map((entry) => entry.field))].sort((a, b) => a.localeCompare(b, "et"));

/** Valdkonnad koos slugiga (/valdkond/<slug>/). "muu" on koondkategooria — sellele eraldi lehte ei tee. */
export const fieldsWithSlug = fields
  .filter((field) => field !== "muu")
  .map((field) => ({ field, slug: slugify(field) }));
export const fieldBySlug = new Map(fieldsWithSlug.map((f) => [f.slug, f.field]));
