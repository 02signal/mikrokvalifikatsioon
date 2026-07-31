// Page-local helper for the two võrdlus landings: builds per-field (valdkond)
// comparison aggregates from REAL catalog data — programme count, EAP range,
// price range (min–max) and 1–2 example programmes per field. No invented
// numbers: ranges are emitted only from values the provider pages actually
// stated, and "muu" (the catch-all) is excluded from per-field views.
import type { CatalogEntryWithSlug } from "../data/catalog";
import { slugify } from "../data/slug";
import { plausiblePriceEur } from "../data/priceGuard";

export type FieldExample = { name: string; slug: string; provider: string };

export type FieldStat = {
  field: string;
  slug: string;
  count: number;
  ectsMin: number | null;
  ectsMax: number | null;
  priceMin: number | null;
  priceMax: number | null;
  withPrice: number;
  examples: FieldExample[];
};

const fmtEur = (n: number): string => `${Math.round(n)} €`;

/** EAP range as plain Estonian: "12–24 EAP", "12 EAP" or "kooli lehel". */
export function ectsRangeText(stat: Pick<FieldStat, "ectsMin" | "ectsMax">): string {
  if (stat.ectsMin == null || stat.ectsMax == null) return "kooli lehel";
  return stat.ectsMin === stat.ectsMax ? `${stat.ectsMin} EAP` : `${stat.ectsMin}–${stat.ectsMax} EAP`;
}

/** Price range as plain Estonian, e.g. a min–max span, a single value, or "vaata kataloogist". */
export function priceRangeText(stat: Pick<FieldStat, "priceMin" | "priceMax">): string {
  if (stat.priceMin == null || stat.priceMax == null) return "vaata kataloogist";
  return stat.priceMin === stat.priceMax ? fmtEur(stat.priceMin) : `${fmtEur(stat.priceMin)}–${fmtEur(stat.priceMax)}`;
}

/**
 * Per-field aggregates for a given catalog subset, sorted by programme count
 * (descending). "muu" is excluded so the field views stay meaningful. Examples
 * prefer entries with both a price and EAP stated, then fall back to any entry.
 */
export function fieldStats(entries: CatalogEntryWithSlug[]): FieldStat[] {
  const byField = new Map<string, CatalogEntryWithSlug[]>();
  for (const e of entries) {
    if (e.field === "muu") continue;
    const list = byField.get(e.field) ?? [];
    list.push(e);
    byField.set(e.field, list);
  }

  const stats: FieldStat[] = [];
  for (const [field, list] of byField) {
    const ects = list.map((e) => e.ects).filter((n): n is number => n != null);
    // plausiblePriceEur (not parsePriceEur): withholds a €/EAP outlier that is
    // almost certainly a bad source reading so this field's price range isn't
    // defined by one suspect value (see src/data/priceGuard.ts).
    const prices = list
      .map((e) => plausiblePriceEur(e))
      .filter((p): p is number => p != null && p > 0);

    const ranked = list
      .slice()
      .sort((a, b) => {
        const sa = (a.priceText ? 1 : 0) + (a.ects != null ? 1 : 0);
        const sb = (b.priceText ? 1 : 0) + (b.ects != null ? 1 : 0);
        return sb - sa || a.name.localeCompare(b.name, "et");
      });
    const examples: FieldExample[] = ranked
      .slice(0, 2)
      .map((e) => ({ name: e.name, slug: e.slug, provider: e.provider }));

    stats.push({
      field,
      slug: slugify(field),
      count: list.length,
      ectsMin: ects.length ? Math.min(...ects) : null,
      ectsMax: ects.length ? Math.max(...ects) : null,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      withPrice: prices.length,
      examples
    });
  }

  return stats.sort((a, b) => b.count - a.count || a.field.localeCompare(b.field, "et"));
}
