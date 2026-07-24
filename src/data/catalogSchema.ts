export type ProviderType = "ülikool" | "rakenduskõrgkool" | "erakool";

export type CatalogField =
  | "IT ja andmed"
  | "tehnika ja tootmine"
  | "ehitus"
  | "energeetika"
  | "majandus ja juhtimine"
  | "õigus"
  | "terviseteadus"
  | "haridus"
  | "disain ja loovus"
  | "muu";

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
  /** ISO date (YYYY-MM-DD) — study start; from feed or parsed from intakeText */
  startDate?: string | null;
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
