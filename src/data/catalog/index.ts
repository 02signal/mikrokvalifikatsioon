import type { CatalogEntry } from "../catalogSchema";
import taltech from "./taltech.json";
import tartuYlikool from "./tartu-ylikool.json";
import muudKoolid from "./muud-koolid.json";

export const catalogCheckedAt = "2026-06-12";

export const catalog: CatalogEntry[] = [
  ...(taltech as unknown as CatalogEntry[]),
  ...(tartuYlikool as unknown as CatalogEntry[]),
  ...(muudKoolid as unknown as CatalogEntry[])
].sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));

export const providers = [...new Set(catalog.map((entry) => entry.provider))];
export const fields = [...new Set(catalog.map((entry) => entry.field))].sort((a, b) => a.localeCompare(b, "et"));
