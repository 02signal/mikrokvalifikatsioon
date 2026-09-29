import type { CatalogEntryWithSlug } from "./catalog";
import { cleanOutcomeTexts } from "./outcomes.ts";
import { plausiblePriceEur } from "./priceGuard.ts";
// Re-exported for the many existing consumers that import parsePriceEur from
// this module — the parser itself lives in ./priceText (a leaf module) so
// ./priceGuard can use it too without a circular import back through here.
export { parsePriceEur } from "./priceText.ts";

export const SITE = "https://mikrokvalifikatsioon.ee";

/** Programmi siselehe aadress. */
export function detailUrl(entry: CatalogEntryWithSlug): string {
  return `${SITE}/kataloog/${entry.slug}/`;
}

/**
 * Väljaminev link kooli lehele koos UTM-märgenditega — see on freemium-mudeli
 * lead-gen tõend (kataloog saadab kooli kliendi). Säilitab kooli enda parameetrid.
 */
export function outboundUrl(entry: CatalogEntryWithSlug, medium: string): string {
  const params = new URLSearchParams({
    utm_source: "mikrokvalifikatsioon.ee",
    utm_medium: medium,
    utm_campaign: "mikrokvalifikatsioon",
    utm_content: entry.slug
  });
  return `${entry.url}${entry.url.includes("?") ? "&" : "?"}${params.toString()}`;
}

const COURSE_MODE: Record<string, string> = {
  veebis: "online",
  kohapeal: "onsite",
  hübriid: "blended"
};

/**
 * Kas ISO kuupäev (YYYY-MM-DD) või kuu (YYYY-MM) on `now` suhtes minevikus.
 * Kuu on minevikus alles siis, kui kuu ise on läbi (jooksev kuu on veel "tulevik").
 * Tundmatu/vigane väärtus loetakse minevikuks — parem jätta välja kui väita.
 */
export function isPastDate(value: string, now: Date): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value < now.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(value)) return value < now.toISOString().slice(0, 7);
  return true;
}

/**
 * schema.org/Course ühe kirje kohta. Lisab ainult teadaolevad faktid
 * (tundmatu väli jäetakse välja) — toidab Google Course rich resultsi ja
 * AI-assistentide hinna/mahu väljavõtet.
 */
export function toCourse(entry: CatalogEntryWithSlug, now: Date = new Date()): Record<string, unknown> {
  const course: Record<string, unknown> = {
    "@type": "Course",
    name: entry.name,
    url: detailUrl(entry),
    description: entry.summary,
    inLanguage: entry.language ?? "et",
    provider: {
      // Schools are always educational organisations — sharpen the typing for rich results.
      "@type": "EducationalOrganization",
      name: entry.provider,
      url: entry.url
    },
    educationalCredentialAwarded: {
      "@type": "EducationalOccupationalCredential",
      name: entry.name,
      // A DefinedTerm is machine-resolvable where a bare localized string is not.
      credentialCategory: {
        "@type": "DefinedTerm",
        name: "Mikrokvalifikatsioon",
        termCode: "microcredential"
      }
    }
  };

  if (entry.ects != null) course.numberOfCredits = entry.ects;
  // Real learning outcomes power Course/AI extraction; only added when collected.
  const outcomes = cleanOutcomeTexts(entry);
  if (outcomes.length) course.teaches = outcomes;

  // plausiblePriceEur (not parsePriceEur): JSON-LD offers is a machine-readable
  // claim to Google — a €/EAP outlier that is almost certainly a bad source
  // reading does not belong there, even though the programme's own page still
  // shows entry.priceText verbatim (see src/data/priceGuard.ts).
  const price = plausiblePriceEur(entry);
  if (price != null) {
    course.offers = {
      "@type": "Offer",
      priceCurrency: "EUR",
      price,
      category: "Tuition",
      url: entry.url,
      // Registration deadline is a real date when known — but an already-passed
      // one would present an expired offer as current, so it is left out.
      ...(entry.registrationDeadline && !isPastDate(entry.registrationDeadline, now)
        ? { availabilityEnds: entry.registrationDeadline }
        : {})
    };
  }

  const courseMode = entry.format ? COURSE_MODE[entry.format] : undefined;
  // schema.org's Date type accepts ISO 8601 reduced precision, so a month-only
  // announced start ("algab septembris", the school never stated a day) emits
  // startDate as "YYYY-MM" (entry.startMonth) — still a valid Date value, never
  // a fabricated day-of-month. Day precision (or a legacy record with no
  // precision field at all) emits the real day as before.
  // PR-3g: `nextStartKnown === false` means AMOS already found nothing
  // future on this programme (entry.startDate/startMonth are already null
  // for this case) — checked explicitly, not only relied on implicitly,
  // since a stale/future-known-later JSON-LD startDate is a machine claim
  // to Google, not just page copy.
  const rawStartDateJsonLd = entry.nextStartKnown === false
    ? null
    : entry.startDatePrecision === "month"
      ? (entry.startMonth ?? null)
      : (entry.startDate ?? null);
  // A start that already passed is not an upcoming instance — never emit it.
  const startDateJsonLd = rawStartDateJsonLd && !isPastDate(rawStartDateJsonLd, now) ? rawStartDateJsonLd : null;
  // Always a NON-EMPTY, valid CourseInstance: an instance with only @type+inLanguage is treated by
  // Google as incomplete and can disqualify the whole Course rich result. name+description use real
  // data; courseMode/startDate are added only when actually known (never fabricated).
  course.hasCourseInstance = {
    "@type": "CourseInstance",
    name: entry.name,
    description: entry.summary,
    ...(courseMode ? { courseMode } : {}),
    ...(startDateJsonLd ? { startDate: startDateJsonLd } : {}),
    inLanguage: entry.language ?? "et"
  };

  return course;
}
