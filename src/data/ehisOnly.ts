// Avalik EHIS-only kirje: valge nimekirja põhine, et ükski (ka tulevikus lisatud) kooli lehelt
// korjatud väli ei pääseks läbi. Ainult identiteet, viide kooli lehele ja meie enda klassifikatsioon;
// ametlikud faktid (nimi, EAP, keel, õppekavarühm, õpiväljundid) lisab EHIS-i override pärast.
import type { CatalogEntry } from "./catalogSchema";

/** Väljad, mis EHIS-only kirjel EHIS-ist eraldi säilivad (identiteet + oma taksonoomia). */
export const EHIS_ONLY_KEPT_KEYS = Object.freeze([
  "id", "status", "name", "provider", "providerType", "url", "sourceUrl", "field", "credentialType", "source"
] as const);

export function ehisOnlyBase(entry: CatalogEntry, ehisFetchedAt: string): CatalogEntry {
  const kept: Record<string, unknown> = {};
  for (const key of EHIS_ONLY_KEPT_KEYS) {
    if ((entry as unknown as Record<string, unknown>)[key] !== undefined) {
      kept[key] = (entry as unknown as Record<string, unknown>)[key];
    }
  }
  return {
    ...kept,
    ects: null,
    durationText: null,
    priceText: null,
    format: null,
    language: null,
    intakeText: null,
    summary: `${entry.name} – ${entry.provider}.`,
    sourceCheckedAt: ehisFetchedAt,
    goalText: null,
    outcomes: [],
    outcomeObjects: [],
    assessmentText: null,
    registrationDeadline: null,
    startDate: null,
    startMonth: null,
    startDatePrecision: null,
    nextStartKnown: false,
    lastKnownStart: null
  } as unknown as CatalogEntry;
}
