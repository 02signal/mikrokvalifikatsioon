import type { CatalogEntryWithSlug } from "./catalog";

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

/**
 * Parsib hinna eurodes. Tundmatu/parsimatu = null (ära kunagi leiuta).
 * "tasuta" -> 0. "alates 1200 €" -> 1200 (esindushind).
 */
export function parsePriceEur(text: string | null | undefined): number | null {
  if (!text) return null;
  if (/tasuta/i.test(text)) return 0;
  const match = text.replace(/\s/g, "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

const COURSE_MODE: Record<string, string> = {
  veebis: "online",
  kohapeal: "onsite",
  hübriid: "blended"
};

/**
 * schema.org/Course ühe kirje kohta. Lisab ainult teadaolevad faktid
 * (tundmatu väli jäetakse välja) — toidab Google Course rich resultsi ja
 * AI-assistentide hinna/mahu väljavõtet.
 */
export function toCourse(entry: CatalogEntryWithSlug): Record<string, unknown> {
  const course: Record<string, unknown> = {
    "@type": "Course",
    name: entry.name,
    url: detailUrl(entry),
    description: entry.summary,
    inLanguage: entry.language ?? "et",
    provider: {
      "@type": "Organization",
      name: entry.provider,
      url: entry.url
    },
    educationalCredentialAwarded: {
      "@type": "EducationalOccupationalCredential",
      name: entry.name,
      credentialCategory: "mikrokvalifikatsioon"
    }
  };

  if (entry.ects != null) course.numberOfCredits = entry.ects;

  const price = parsePriceEur(entry.priceText);
  if (price != null) {
    course.offers = {
      "@type": "Offer",
      priceCurrency: "EUR",
      price,
      category: "Tuition",
      url: entry.url
    };
  }

  const courseMode = entry.format ? COURSE_MODE[entry.format] : undefined;
  course.hasCourseInstance = {
    "@type": "CourseInstance",
    ...(courseMode ? { courseMode } : {}),
    ...(entry.startDate ? { startDate: entry.startDate } : {}),
    inLanguage: entry.language ?? "et"
  };

  return course;
}
