// Fresh intake-date facts — re-collected from the 7 robots-allowed schools'
// own programme pages (AMOS gated source-refresh, robots/ToS-respecting).
// Build-time feed (PUBLIC_INTAKE_DATES_FEED_URL) with a committed-snapshot
// fallback, mirroring src/data/salary/index.ts. PUBLIC FACTS ONLY: registration
// deadline + start date + a short bounded intake label — no marketing text, no PII.

import snapshot from "./snapshot.json";

export interface IntakeDate {
  url: string;
  provider: string | null;
  /** ISO YYYY-MM-DD — registration deadline; null = page did not state it */
  registration_deadline: string | null;
  /** ISO YYYY-MM-DD — study start; null = page did not state it */
  start_date: string | null;
  /** short bounded Estonian label derived from the dates; null when no date */
  intake_text: string | null;
}

interface IntakeDatesSnapshot {
  version: string;
  fetched_at: string;
  dates: IntakeDate[];
}

const FEED_URL = import.meta.env.PUBLIC_INTAKE_DATES_FEED_URL as string | undefined;
const local = snapshot as unknown as IntakeDatesSnapshot;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function isUsable(data: unknown): data is IntakeDatesSnapshot {
  const s = data as IntakeDatesSnapshot;
  return !!s && typeof s.fetched_at === "string" && Array.isArray(s.dates);
}

async function load(): Promise<IntakeDatesSnapshot> {
  if (FEED_URL) {
    try {
      const res = await fetch(FEED_URL);
      if (res.ok) {
        const data = (await res.json()) as IntakeDatesSnapshot;
        if (isUsable(data)) return data;
      }
      console.warn(`[intakeDates] feed ${FEED_URL} unusable (HTTP ${res.status}); using snapshot`);
    } catch (e) {
      console.warn(`[intakeDates] feed fetch error: ${(e as Error).message}; using snapshot`);
    }
  }
  return local;
}

const data = await load();

/** When the dates were collected from the schools' pages (ISO instant). */
export const intakeDatesFetchedAt: string = data.fetched_at;

function isoOrNull(value: string | null | undefined): string | null {
  return typeof value === "string" && ISO.test(value.slice(0, 10)) ? value.slice(0, 10) : null;
}

const BY_URL = new Map<string, IntakeDate>(
  data.dates
    .filter((d) => typeof d.url === "string" && d.url.length > 0)
    .map((d) => [
      d.url,
      {
        url: d.url,
        provider: d.provider ?? null,
        registration_deadline: isoOrNull(d.registration_deadline),
        start_date: isoOrNull(d.start_date),
        intake_text: typeof d.intake_text === "string" && d.intake_text.length <= 80 ? d.intake_text : null
      }
    ])
);

/** Fresh intake dates for a programme URL, or null when none were collected. */
export function intakeDatesFor(url: string | null | undefined): IntakeDate | null {
  if (!url) return null;
  return BY_URL.get(url) ?? null;
}
