// Ametirühma (ISCO major group) mudel — tööturg ↔ õpe SILD.
//
// Iga ametirühm seob KOLM asja:
//   1. Töötukassa NÕUDLUSE (avaandmed, banded, ametirühma tasemel, CC BY-NC 3.0),
//   2. Statistikaameti PALGAKONTEKSTI (PA626, brutopalga mediaan, CC BY-SA 4.0),
//   3. KÄSITSI KONTROLLITUD õpitee — lingid OLEMASOLEVATELE /valdkond/ ja /karjaar/
//      lehtedele, kus täpne programmide sobitus juba elab.
//
// TÄPSUSE REEGEL: siin EI väideta "programm X annab kvalifikatsiooni ametiks Y".
// Õpitee on konservatiivne, käsitsi kontrollitud viide HUB-lehtedele — sobivuse
// otsus jääb valdkonna-/karjäärilehe enda kanda. Ühtegi numbrit siin välja ei mõelda:
// nõudlus ja palk tulevad otse feedidest (labor/index.ts, salary/index.ts).
//
// ── Õpitee kaardistuse ALUS (käsitsi, kontrollitav) ─────────────────────────────
// studyValdkonnad ja studyKarjaarid viitavad AINULT reaalsetele marsruutidele:
//   /valdkond/<slug>/  slugid: it-ja-andmed, disain-ja-loovus, ehitus, energeetika,
//      haridus, majandus-ja-juhtimine, tehnika-ja-tootmine, terviseteadus, oigus
//      ("muu" koondkategooriale eraldi lehte ei tehta — seda ei kaardista).
//   /karjaar/<slug>/   slugid: andmeanaluutik, tarkvaraarendaja, projektijuht,
//      raamatupidaja, turundusspetsialist, personalijuht, kuberturve, ux-disainer.
// Kaardistus on tahtlikult kitsas: mappime ainult need lingid, mis on ametirühmaga
// päriselt seotud, ja oleme ausad, kui mikrokvalifikatsioone on rühmale vähe.

import { laborSignals, laborLabels, trendInfo } from "./labor";
import type { LaborDemandSignal } from "./laborSchema";
import { medianMonthlyFor, professionalsHourlyFor } from "./salary";

export interface OccupationGroup {
  /** URL-i slug (/ametiruhm/<slug>/). */
  slug: string;
  /** ISCO major group "0".."9". */
  iscoMajor: string;
  /** Kuvanimi — VÕETUD laborLabels'ist (isco_major_group_labels), mitte käsitsi kirjutatud. */
  label: string;
  /** 1–2 lauset rühma kirjeldust (üldine, ei väida programmiseost). */
  blurb: string;
  /** Loomulik eestikeelne sisseütlev fraas, nt "juhina" / "tippspetsialistina" —
   *  EI liimita käändelõppu kuvanimele (see tekitaks katki fraase). Käsitsi kontrollitud. */
  workPhrase: string;
  /** Reaalsed /valdkond/<slug>/ slugid (õpitee). */
  studyValdkonnad: string[];
  /** Reaalsed /karjaar/<slug>/ slugid (õpitee). */
  studyKarjaarid: string[];
}

// Loomulikud eestikeelsed valdkonna-/karjäärinimed (kuvamiseks õpitee kaartidel).
// Slug → kuvanimi. Hoiame ühes kohas, et tekst püsiks loomulik.
export const VALDKOND_LABEL: Record<string, string> = {
  "it-ja-andmed": "IT ja andmed",
  "disain-ja-loovus": "Disain ja loovus",
  ehitus: "Ehitus",
  energeetika: "Energeetika",
  haridus: "Haridus",
  "majandus-ja-juhtimine": "Majandus ja juhtimine",
  "tehnika-ja-tootmine": "Tehnika ja tootmine",
  terviseteadus: "Terviseteadus",
  oigus: "Õigus",
};

export const KARJAAR_LABEL: Record<string, string> = {
  andmeanaluutik: "Andmeanalüütik",
  tarkvaraarendaja: "Tarkvaraarendaja",
  projektijuht: "Projektijuht",
  raamatupidaja: "Raamatupidaja",
  turundusspetsialist: "Turundusspetsialist",
  personalijuht: "Personalijuht (HR)",
  kuberturve: "Küberturbe spetsialist",
  "ux-disainer": "UX-disainer",
};

// Kõik 9 tsiviil-ametirühma (sõjaväelased "0" jäetakse teadlikult välja: pole
// mikrokvalifikatsioone ega avalikku nõudlust). NB: PAGES ehitatakse ainult nende
// rühmade jaoks, millel on KORRAGA reaalne nõudlus JA mittetühi õpitee — vt allpool
// buildableGroups. Rühmad ilma õpiteeta on siin dokumenteeritud, aga lehte ei saa.
export const OCCUPATION_GROUPS: OccupationGroup[] = [
  {
    slug: "juhid",
    iscoMajor: "1",
    label: laborLabels["1"] ?? "Juhid",
    blurb:
      "Juhid kavandavad, suunavad ja koordineerivad ettevõtete, asutuste ja üksuste tööd. " +
      "Sellesse rühma kuuluvad tegev-, äri-, tootmis- ja teenindusjuhid ning valdkonnajuhid.",
    workPhrase: "juhina",
    // Juhtimine + ärioskused on mikrokvalifikatsioonide tugevaim juhirühma kate.
    studyValdkonnad: ["majandus-ja-juhtimine"],
    studyKarjaarid: ["projektijuht", "personalijuht", "raamatupidaja"],
  },
  {
    slug: "tippspetsialistid",
    iscoMajor: "2",
    label: laborLabels["2"] ?? "Tippspetsialistid",
    blurb:
      "Tippspetsialistid teevad keerukat erialast tööd, mis eeldab põhjalikke teadmisi. " +
      "Sellesse rühma kuuluvad IT-, inseneri-, tervise-, haridus-, äri- ja kultuurispetsialistid.",
    workPhrase: "tippspetsialistina",
    // Laiim kate: enamik kõrgema oskustaseme mikrokvalifikatsioone ja mikrokraade.
    studyValdkonnad: [
      "it-ja-andmed",
      "majandus-ja-juhtimine",
      "haridus",
      "terviseteadus",
      "disain-ja-loovus",
      "oigus",
    ],
    studyKarjaarid: [
      "andmeanaluutik",
      "tarkvaraarendaja",
      "kuberturve",
      "ux-disainer",
      "turundusspetsialist",
      "personalijuht",
    ],
  },
  {
    slug: "tehnikud-ja-keskastme-spetsialistid",
    iscoMajor: "3",
    label: laborLabels["3"] ?? "Tehnikud ja keskastme spetsialistid",
    blurb:
      "Tehnikud ja keskastme spetsialistid toetavad spetsialiste tehnilise ja korraldusliku tööga. " +
      "Sellesse rühma kuuluvad nt IT-tehnikud, müügiesindajad ning äri- ja haldustugitöötajad.",
    workPhrase: "tehniku või keskastme spetsialistina",
    // Praktilise väljundiga andme-, tehnika- ja äritöö mikrokvalifikatsioonid.
    studyValdkonnad: ["it-ja-andmed", "tehnika-ja-tootmine", "majandus-ja-juhtimine"],
    studyKarjaarid: ["andmeanaluutik", "turundusspetsialist"],
  },
  {
    slug: "kontoritootajad-ja-klienditeenindajad",
    iscoMajor: "4",
    label: laborLabels["4"] ?? "Kontoritöötajad ja klienditeenindajad",
    blurb:
      "Kontoritöötajad ja klienditeenindajad korraldavad dokumente, arvepidamist ja kliendisuhtlust. " +
      "Sellesse rühma kuuluvad nt sekretärid, arveametnikud ja klienditeenindajad.",
    workPhrase: "kontoritöötaja või klienditeenindajana",
    // Tagasihoidlik, aga päris kate: arvestus- ja ärihalduse mikrokvalifikatsioonid.
    studyValdkonnad: ["majandus-ja-juhtimine"],
    studyKarjaarid: ["raamatupidaja"],
  },
];

// ── Riiklik nõudlus: agregeerimine maakondade ÜLE ───────────────────────────────
// Avaandmetes on nõudlus AINULT maakonniti (15 maakonda) + üks "maakond määramata"
// ("unknown") ämber. "unknown" EI ole riiklik koond, seega seda eraldi kuvades ei
// nimetata kunagi "kogu Eestiks".
//
// Bändid on AVATUD JA MITTE-ADITIIVSED vahemikud (nt "üle 50 koha"), seega bände
// liita oleks ebakorrektne. Ainus kaitstav riiklik bänd on MAX bänd maakondade üle:
// "vähemalt ühes maakonnas on selle ametirühma nõudlus tasemel X". Lisaks toome
// AUSA skaala-konteksti: mitmes maakonnas on üldse vabu kohti (band != none).
const BAND_ORDER = ["none", "band_1_5", "band_6_20", "band_21_50", "band_gt_50"];

export interface NationalDemand {
  /** Kõrgeim bänd üle maakondade (riiklik tipp-tase). */
  topBand: string;
  /** Mitu (nimelist) maakonda on andmestikus selle rühma kohta. */
  regionCount: number;
  /** Mitmes maakonnas on vabu kohti (band != none) — aus skaala-kontekst. */
  activeRegions: number;
  /** Domineeriv trend üle maakondade (tasavõrdsel "flat"). */
  trend: string;
  /** Andmeseisu kuupäev (kõigil ridadel sama as_of). */
  asOf: string;
}

/** Riiklik nõudlus ühe ISCO major-rühma kohta, agregeeritud maakondade üle.
 *  Tagastab null, kui andmeid pole. Meetod: MAX bänd (mitte summa), + aktiivsete
 *  maakondade arv skaalakontekstiks, + domineeriv trend. */
export function nationalDemandFor(iscoMajor: string): NationalDemand | null {
  const rows: LaborDemandSignal[] = laborSignals.filter(
    (s) => s.isco_major_group === iscoMajor && s.region !== "unknown",
  );
  if (!rows.length) return null;

  const topBand = rows
    .map((r) => r.openings_now_band)
    .sort((a, b) => BAND_ORDER.indexOf(b) - BAND_ORDER.indexOf(a))[0];

  const activeRegions = rows.filter((r) => r.openings_now_band !== "none").length;

  // Domineeriv trend: loendame, valime sageduselt suurima; "flat" võidab tasavõrdsel.
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.trend] = (counts[r.trend] ?? 0) + 1;
  const trend = Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0] === "flat") return -1;
    if (b[0] === "flat") return 1;
    return 0;
  })[0][0];

  const asOf = rows[0].as_of;
  return { topBand, regionCount: rows.length, activeRegions, trend, asOf };
}

export function trendArrow(t: string): string {
  return trendInfo(t).arrow;
}
export function trendLabel(t: string): string {
  return trendInfo(t).label;
}

// ── Palgakontekst: brutopalga mediaani VAHEMIK alarühmade üle ────────────────────
// Palk (PA626) on alarühma (2-kohaline ISCO submajor) tasemel, mitte major-rühma
// tasemel. Major-rühma jaoks toome AUSA vahemiku: min–max brutopalga mediaan selle
// rühma alarühmade lõikes. Kõik numbrid otse feedist — midagi ei interpoleerita.
const SUBMAJORS_BY_MAJOR: Record<string, string[]> = {
  "1": ["11", "12", "13", "14"],
  "2": ["21", "22", "23", "24", "25", "26"],
  "3": ["31", "32", "33", "34", "35"],
  "4": ["41", "42", "43", "44"],
};

export interface SalaryRange {
  min: number;
  max: number;
  /** Kas vahemik taandub üheks arvuks (min === max). */
  single: boolean;
}

/** Brutopalga mediaani vahemik (€/kuu) ISCO major-rühma alarühmade üle, või null. */
export function salaryRangeFor(iscoMajor: string): SalaryRange | null {
  const subs = SUBMAJORS_BY_MAJOR[iscoMajor] ?? [];
  const meds: number[] = [];
  for (const s of subs) {
    const r = medianMonthlyFor(s);
    if (r?.median != null) meds.push(r.median);
  }
  if (!meds.length) return null;
  const min = Math.min(...meds);
  const max = Math.max(...meds);
  return { min, max, single: min === max };
}

/** ISCO-2 (tippspetsialistid) piirkondlik tunnitasu — ainult rühm "2" kontekst.
 *  Kasutame riikliku kontekstina Harju maakonda (suurim turg), või null. */
export function professionalsHourlyHarju(): number | null {
  return professionalsHourlyFor("harju");
}

// ── Ehitatavad rühmad: nõudlus JA mittetühi õpitee ──────────────────────────────
/** Rühmad, mille jaoks lehe ehitame: peab olema reaalne nõudlus JA vähemalt üks
 *  õpitee link (valdkond või karjäär). Õhukesi (ilma õpiteeta) lehti ei tehta. */
export const buildableGroups: OccupationGroup[] = OCCUPATION_GROUPS.filter(
  (g) =>
    nationalDemandFor(g.iscoMajor) != null &&
    g.studyValdkonnad.length + g.studyKarjaarid.length > 0,
);

export const groupBySlug = new Map(buildableGroups.map((g) => [g.slug, g]));
