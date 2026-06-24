// Salary facts data layer — Statistikaamet (Statistics Estonia) open data, CC BY-SA 4.0.
// Build-time feed (PUBLIC_SALARY_FEED_URL) with a committed snapshot fallback, mirroring the
// catalog/labour pattern. Aggregates only (medians) — no microdata. Attribution + ShareAlike
// are mandatory wherever shown.

import snapshot from "./snapshot.json";

interface OccMonthly { isco_submajor: string; label_en: string; median_eur_monthly: number | null; }
interface RegionHourly { region: string; median_eur_hourly: number | null; }
interface SalarySnapshot {
  snapshot_version: string;
  attribution_text: string;
  licence: string;
  occupation_monthly: { source: string; year: number; unit: string; median: boolean; occupations: OccMonthly[] };
  regional_professionals_hourly: { source: string; year: number; unit: string; isco_major_group: string; median: boolean; regions: RegionHourly[] };
}

const FEED_URL = import.meta.env.PUBLIC_SALARY_FEED_URL as string | undefined;
const local = snapshot as unknown as SalarySnapshot;

async function load(): Promise<SalarySnapshot> {
  if (FEED_URL) {
    try {
      const res = await fetch(FEED_URL);
      if (res.ok) {
        const data = (await res.json()) as SalarySnapshot;
        if (data?.occupation_monthly?.occupations?.length) return data;
      }
      console.warn(`[salary] feed ${FEED_URL} unusable (HTTP ${res.status}); using snapshot`);
    } catch (e) {
      console.warn(`[salary] feed fetch error: ${(e as Error).message}; using snapshot`);
    }
  }
  return local;
}

const data = await load();

export const salaryAttribution: string = data.attribution_text;
export const salaryMonthlyYear: number = data.occupation_monthly.year;
export const salaryRegionalYear: number = data.regional_professionals_hourly.year;

const BY_SUBMAJOR = new Map<string, OccMonthly>(
  data.occupation_monthly.occupations.map((o) => [o.isco_submajor, o]),
);
const TOTAL = data.occupation_monthly.occupations.find((o) => o.isco_submajor === "_T");

/** Gross monthly median (€) for an ISCO 2-digit submajor group, or null if absent/suppressed. */
export function medianMonthlyFor(submajor: string): { median: number | null; label: string } | null {
  const o = BY_SUBMAJOR.get(submajor);
  if (!o) return null;
  return { median: o.median_eur_monthly, label: o.label_en };
}

/** National "occupations total" median monthly (€) — context baseline. */
export function nationalMedianMonthly(): number | null {
  return TOTAL?.median_eur_monthly ?? null;
}

const REGION_HOURLY = new Map<string, number | null>(
  data.regional_professionals_hourly.regions.map((r) => [r.region, r.median_eur_hourly]),
);
/** Median hourly (€) for ISCO-1 Professionals in a region (regional context), or null. */
export function professionalsHourlyFor(region: string): number | null {
  return REGION_HOURLY.get(region) ?? null;
}

/** "1 700" — Estonian thousands grouping with a thin space. */
export function eur(n: number | null): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("et-EE").replace(/ /g, " ");
}
