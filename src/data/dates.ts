// Kuupäevade tuletamine vabatekstist (intakeText) ja eestikeelne vormindus.
// Konservatiivne: ainult selge "kuni DD.MM.YYYY" / "algab DD.MM.YYYY" → muidu null.

const ET_MONTHS = [
  "jaanuar", "veebruar", "märts", "aprill", "mai", "juuni",
  "juuli", "august", "september", "oktoober", "november", "detsember"
];

function toIso(d: string, m: string, y: string): string | null {
  const dd = Number(d), mm = Number(m), yy = Number(y);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 2024 || yy > 2100) return null;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function parseIntakeDates(intakeText?: string | null): {
  registrationDeadline: string | null;
  startDate: string | null;
} {
  if (!intakeText) return { registrationDeadline: null, startDate: null };
  const dl = intakeText.match(/kuni\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  const st = intakeText.match(/alga\w*\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
  return {
    registrationDeadline: dl ? toIso(dl[1], dl[2], dl[3]) : null,
    startDate: st ? toIso(st[1], st[2], st[3]) : null
  };
}

/**
 * Resolves the catalog's own `startDate` field for one entry — used ONLY by
 * src/data/catalog/index.ts's entry mapping. Extracted as its own pure,
 * exported function (unlike the render-only formatStartEt below) so this
 * decision is independently testable without needing the live committed
 * snapshot catalog/index.ts otherwise always loads at import time.
 *
 * PR-3g: `nextStartKnown === false` (AMOS already found nothing future on
 * this programme) wins over everything else, INCLUDING the legacy
 * intakeText-parsed fallback — without this an already-hidden programme
 * would silently un-hide itself the moment AMOS's own startDate went to
 * null, via a stale date shape still sitting in intakeText's free text.
 *
 * A month-only announced start (`startDatePrecision === "month"`) must
 * also never fall back to the legacy intakeText-parsed startDate — that
 * would fabricate a day AMOS explicitly declined to state ("algab
 * septembris" must never become 2026-09-01). The legacy fallback
 * (`parseIntakeDates(entry.intakeText).startDate`) only ever applies to a
 * record that predates the month/day precision split (both `startDate`
 * and `startDatePrecision` absent from the feed).
 */
export function resolveCatalogStartDate(entry: {
  startDate?: string | null;
  startDatePrecision?: "day" | "month" | null;
  nextStartKnown?: boolean | null;
  intakeText?: string | null;
}): string | null {
  if (entry.nextStartKnown === false) return null;
  if (entry.startDatePrecision === "month") return null;
  return entry.startDate ?? parseIntakeDates(entry.intakeText).startDate;
}

/** ISO YYYY-MM-DD → "21.08.2026" */
export function formatEt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** ISO → "2026-08" (kuu-võti grupeerimiseks) */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** ISO → "August 2026" */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const name = ET_MONTHS[Number(m) - 1] ?? m;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** "2026-09" → "september 2026" (väiketäht, jooksva teksti jaoks — vt monthLabel pealkirja jaoks) */
function monthYearEt(monthKeyValue: string): string {
  const [y, m] = monthKeyValue.split("-");
  const name = ET_MONTHS[Number(m) - 1] ?? m;
  return `${name} ${y}`;
}

/**
 * Programmi teadaoleva õppe alguse eestikeelne kuvand ühest allikast kõigi
 * kuvamiskohtade jaoks (kataloogileht, registreerimise grupeering, llms.txt,
 * JSON-LD).
 *
 * PR-3g, omaniku otsus ("peida, kui ühtki tulevast pole"): `nextStartKnown
 * === false` — AMOS on juba tuvastanud, et programmil ei ole ühtki
 * tulevast algust ega tulevast registreerimistähtaega — annab TEKSTI
 * "järgmine algus täpsustamisel", sõltumata sellest, mis startDate/
 * startMonth samal kirjel veel oleks (need on AMOS-i poolt juba nulliti,
 * see kontroll on siin lisakaitseks). See VÕIDAB kõik teised harud allpool.
 *
 * precision "day" (või puudub täpsus, aga startDate on olemas — legacy
 * kirjed): täpne kuupäev, `formatEt(startDate)`.
 * precision "month": ainult kuu on teada ("algab septembris", kool ei ole
 * kunagi päeva öelnud) → "<kuu nimi> <aasta> (täpne päev täpsustamisel)".
 * MITTE KUNAGI väljamõeldud 1. kuupäev — omaniku otsus 2026-09-08, vt AMOS
 * mkval-catalog-feed-contract.mjs.
 * Teadmata algus (kumbki väli puudub) → null.
 */
export function formatStartEt(entry: {
  startDate?: string | null;
  startMonth?: string | null;
  startDatePrecision?: "day" | "month" | null;
  nextStartKnown?: boolean | null;
}): string | null {
  if (entry.nextStartKnown === false) return "järgmine algus täpsustamisel";
  if (entry.startDatePrecision === "month") {
    return entry.startMonth ? `${monthYearEt(entry.startMonth)} (täpne päev täpsustamisel)` : null;
  }
  return entry.startDate ? formatEt(entry.startDate) : null;
}

type EntryWithStart = {
  startDate?: string | null;
  startMonth?: string | null;
  startDatePrecision?: "day" | "month" | null;
  nextStartKnown?: boolean | null;
};

/**
 * A month-only announced start ("algab septembris", startDatePrecision
 * "month") has no real day to sort by — its sort key is the announced month
 * with a day segment ("-99") no real day ever reaches, so it always sorts
 * AFTER every day-precise start in the same calendar month, never before or
 * interleaved with one. Cross-month ordering is unaffected: "2026-08-99" <
 * "2026-09-01" still holds.
 */
function startSortKey(entry: EntryWithStart): string {
  return entry.startDatePrecision === "month" ? `${entry.startMonth}-99` : (entry.startDate as string);
}

function startMonthGroupKey(entry: EntryWithStart): string {
  return entry.startDatePrecision === "month" ? (entry.startMonth as string) : monthKey(entry.startDate as string);
}

/**
 * Every entry with a known start (day OR month precision), earliest first —
 * month-only entries within a month sort last, see startSortKey.
 *
 * PR-3g: `nextStartKnown === false` is excluded explicitly, on top of the
 * existing startDate/startMonth check — AMOS already nulls both fields for
 * such an entry, so this filter alone would already exclude it, but the
 * explicit check keeps this correct even if a future/legacy record ever
 * carries a stale startDate alongside nextStartKnown: false.
 */
export function sortedByStart<T extends EntryWithStart>(entries: T[]): T[] {
  return entries
    .filter((e) => e.nextStartKnown !== false && (e.startDate || (e.startDatePrecision === "month" && e.startMonth)))
    .sort((a, b) => startSortKey(a).localeCompare(startSortKey(b)));
}

/** `sortedByStart`, grouped by calendar month — grouping key is `startMonth` when precision is "month", else the month derived from `startDate`. Group order follows `sortedByStart`'s own chronological order. */
export function groupByStartMonth<T extends EntryWithStart>(entries: T[]): { key: string; label: string; entries: T[] }[] {
  const groups: { key: string; label: string; entries: T[] }[] = [];
  for (const e of sortedByStart(entries)) {
    const k = startMonthGroupKey(e);
    let g = groups.find((x) => x.key === k);
    if (!g) { g = { key: k, label: monthLabel(k), entries: [] }; groups.push(g); }
    g.entries.push(e);
  }
  return groups;
}
