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
  /** assessment method(s) as stated by the provider; null until collected */
  assessmentText?: string | null;
  sourceCheckedAt: string;
};
