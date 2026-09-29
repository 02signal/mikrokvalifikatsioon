// EAP -> tundide tabel ja näidisprogrammid /vastused/mis-on-eap/ ning
// /vastused/mitu-eap-d-on-mikrokraadil/ lehtede jaoks. Kõik programmid ja arvud
// tulevad build-ajal tegelikust kataloogist (`catalog` = ainult aktiivsed kirjed),
// nii et tagasi võetud programm kaob siit ise. Ühtegi programmi ei kirjutata käsitsi sisse.
import { catalog, catalogUpdatedAt, type CatalogEntryWithSlug } from "./catalog/index.ts";

/** Ametlik teisendus (Euroopa ainepunkt): 1 EAP = 26 tundi õppija tööd. Sama arv on lehe tekstis. */
export const HOURS_PER_EAP = 26;
/** Eeldus tabeli jaoks: üks semester ≈ 20 õppenädalat (keskmine, mitte lubadus). */
export const WEEKS_PER_SEMESTER = 20;

export type EapRow = {
  eap: number;
  hours: number;
  semesters: number;
  weeks: number;
  hoursPerWeek: number;
};

/** Lühemad mahud (6, 12) ühe semestriga, mahukamad (20, 30) kahega — nagu lehe muu tekst. */
const ROWS: Array<{ eap: number; semesters: number }> = [
  { eap: 6, semesters: 1 },
  { eap: 12, semesters: 1 },
  { eap: 20, semesters: 2 },
  { eap: 30, semesters: 2 }
];

export const eapRows: EapRow[] = ROWS.map(({ eap, semesters }) => {
  const hours = eap * HOURS_PER_EAP;
  const weeks = semesters * WEEKS_PER_SEMESTER;
  return { eap, hours, semesters, weeks, hoursPerWeek: Math.round((hours / weeks) * 10) / 10 };
});

/** Kataloogi EAP-vahemik, mille programme iga tabelirea all näidatakse. */
const BANDS: Array<{ eap: number; lo: number; hi: number }> = [
  { eap: 6, lo: 5, hi: 9 },
  { eap: 12, lo: 10, hi: 15 },
  { eap: 20, lo: 16, hi: 24 },
  { eap: 30, lo: 25, hi: 30 }
];
const PER_BAND = 2;

export type EapProgrammeGroup = {
  eap: number;
  lo: number;
  hi: number;
  programmes: CatalogEntryWithSlug[];
};

/** Iga vahemiku lähimad programmid (eri pakkujad ees), määratud järjestus. */
export function pickProgrammes(entries: CatalogEntryWithSlug[] = catalog): EapProgrammeGroup[] {
  return BANDS.map(({ eap, lo, hi }) => {
    const pool = entries
      .filter((e) => e.ects != null && e.ects >= lo && e.ects <= hi)
      .sort(
        (a, b) =>
          Math.abs((a.ects as number) - eap) - Math.abs((b.ects as number) - eap) ||
          a.provider.localeCompare(b.provider, "et") ||
          a.name.localeCompare(b.name, "et")
      );
    const picked: CatalogEntryWithSlug[] = [];
    for (const e of pool) {
      if (picked.length >= PER_BAND) break;
      if (!picked.some((p) => p.provider === e.provider)) picked.push(e);
    }
    for (const e of pool) {
      if (picked.length >= PER_BAND) break;
      if (!picked.includes(e)) picked.push(e);
    }
    return { eap, lo, hi, programmes: picked };
  }).filter((g) => g.programmes.length > 0);
}

export const eapProgrammeGroups = pickProgrammes();

/** Tegelik EAP-jaotus kataloogis (vahemike kaupa), arvutatud build-ajal. */
export const EAP_DISTRIBUTION_BUCKETS = [
  { label: "alla 6 EAP", lo: 0, hi: 5 },
  { label: "6–11 EAP", lo: 6, hi: 11 },
  { label: "12–18 EAP", lo: 12, hi: 18 },
  { label: "19–24 EAP", lo: 19, hi: 24 },
  { label: "25 EAP ja rohkem", lo: 25, hi: 999 }
];

export function eapDistribution(entries: CatalogEntryWithSlug[] = catalog) {
  const withEap = entries.filter((e) => e.ects != null) as Array<CatalogEntryWithSlug & { ects: number }>;
  return {
    total: withEap.length,
    buckets: EAP_DISTRIBUTION_BUCKETS.map((b) => ({
      ...b,
      count: withEap.filter((e) => e.ects >= b.lo && e.ects <= b.hi).length
    }))
  };
}

export const eapDistributionNow = eapDistribution();
export const eapDataDateText = catalogUpdatedAt.split("-").reverse().join(".");
