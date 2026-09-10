export type ProviderType = "ülikool" | "rakenduskõrgkool" | "erakool";

export const CATALOG_FIELDS = [
  "IT ja andmed",
  "tehnika ja tootmine",
  "ehitus",
  "energeetika",
  "majandus ja juhtimine",
  "õigus",
  "terviseteadus",
  "haridus",
  "disain ja loovus",
  "muu"
] as const;

export type CatalogField = (typeof CATALOG_FIELDS)[number];

export const PROVIDER_TYPES = ["ülikool", "rakenduskõrgkool", "erakool"] as const;

/**
 * Public-safe fields for a programme AMOS has MEASURED as withdrawn (feed.retired[]).
 * Deliberately a small, closed set — matches AMOS's buildMkvalCatalogFeedV2 output
 * exactly. NO summary/goalText/outcomes/assessmentText/price/intake/EAP: a withdrawn
 * programme's public page must never look like a live, buyable offer.
 */
export type RetiredCatalogEntry = {
  /** Identical to the id this programme had while active. */
  id: string;
  name: string;
  provider: string;
  providerType: ProviderType;
  field: CatalogField;
  /** The programme's own page — the one that 404'd/410'd. Informational only, never an outbound CTA. */
  url: string;
  /** ISO date (YYYY-MM-DD) — when AMOS measured the withdrawal (http_404/http_410 + confirmed). */
  withdrawnOn: string;
};

export type CatalogEntry = {
  /** AMOS programme_ref; when present this is the canonical public catalogue slug. */
  id?: string | null;
  /** Public feed lifecycle state; absent means active for legacy source files. */
  status?: string | null;
  name: string;
  provider: string;
  providerType: ProviderType;
  url: string;
  field: CatalogField;
  /** EAP (ECTS). null = page did not state it */
  ects: number | null;
  durationText: string | null;
  priceText: string | null;
  format: "veebis" | "hübriid" | "kohapeal" | null;
  language: "et" | "en" | null;
  intakeText: string | null;
  /** one plain-Estonian sentence: what skill, for whom */
  summary: string;
  /** programme goal, 1 compressed sentence from the provider page; null until collected */
  goalText?: string | null;
  /** learning outcomes, short compressed bullets from the provider page; null until collected */
  outcomes?: string[] | null;
  /** structured learning outcomes from AMOS feed; `language`/`textLanguage` = text language, `teachingLanguage` = programme language */
  outcomeObjects?: CatalogOutcomeObject[] | null;
  /** assessment method(s) as stated by the provider; null until collected */
  assessmentText?: string | null;
  /** ISO date (YYYY-MM-DD) — registration deadline; from feed or parsed from intakeText */
  registrationDeadline?: string | null;
  /**
   * ISO date (YYYY-MM-DD) — study start; from feed or parsed from intakeText.
   * A legacy record may carry this alone. A current-feed record only carries
   * it when `startDatePrecision` is "day" — never fabricated from `startMonth`.
   */
  startDate?: string | null;
  /** "YYYY-MM" — the announced start month when only the month is known ("algab septembris", no day ever stated). Also derived/present alongside `startDate` when precision is "day". */
  startMonth?: string | null;
  /** "day" when `startDate` is a real, provider-stated day; "month" when only `startMonth` is known — never fabricate a day for a month-only announcement. Absent/null for legacy records that predate this distinction. */
  startDatePrecision?: "day" | "month" | null;
  /**
   * PR-3g, owner decision ("peida, kui ühtki tulevast pole" — hide, when
   * none is future): false when AMOS found no future intake start AND no
   * future registration deadline anywhere on the programme — startDate/
   * startMonth/startDatePrecision are then null too (AMOS's own blanking,
   * see mkval-catalog-feed-contract.mjs's deriveMkvalNextStartVisibility).
   * Absent/undefined for a legacy record that predates this field — that
   * is treated exactly like `true` (never hides anything that was not
   * already going to be hidden before this field existed).
   */
  nextStartKnown?: boolean | null;
  /** ISO date (YYYY-MM-DD) or ISO month (YYYY-MM) — the historical start AMOS last observed, kept ONLY when `nextStartKnown` is false. Informational; the site never renders it as if it were the next start. */
  lastKnownStart?: string | null;
  sourceCheckedAt: string;
};

export type CatalogLanguage = "et" | "en" | "ru";

export type OutcomeQualityState = "approved" | "needs_review" | "rejected_fragment";

export type CatalogOutcomeObject = {
  id?: string | null;
  text: string;
  /** legacy v2 field: language of the outcome text */
  language?: CatalogLanguage | null;
  textLanguage?: CatalogLanguage | null;
  teachingLanguage?: CatalogLanguage | null;
  skillTag?: string | null;
  qualityState?: OutcomeQualityState | null;
  fragmentReason?: string | null;
  translationEt?: string | null;
  translationEn?: string | null;
  translationSource?: string | null;
  sourceUrl?: string | null;
  sourceCheckedAt?: string | null;
};
