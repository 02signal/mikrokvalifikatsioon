// Maakonna-andmekiht (#regional SEO/GEO). Seob KOLM telge ühe maakonna ümber:
//   1) ÕPE — kataloogi programmid, mille pakkuja asukoht on selles maakonnas (kohapeal),
//      pluss kõik veebis/hübriid programmid (selgelt "veebis kättesaadav").
//   2) TÖÖTURG — Töötukassa avatud töökohad maakonniti (banded, CC BY-NC 3.0).
//   3) PALK — Statistikaameti piirkondlik palgakontekst (CC BY-SA 4.0).
//
// Numbreid EI mõelda välja: tööturu/palga arvud tulevad otse snapshotitest. Kui
// maakonna kohta andmeid napib, ütleme seda ausalt (vt lehe loogika).

import { catalog, type CatalogEntryWithSlug } from "./catalog";

export interface Region {
  /** URL-slug: /maakond/<slug>/ — kattub labor/salary snapshoti regiooni-võtmega. */
  slug: string;
  /** Loomulik eestikeelne maakonnanimi ("Tartumaa"). */
  name: string;
  /** Formaalne nimi ("Tartu maakond") — kasutame pealkirjades/JSON-LD-s. */
  formalName: string;
  /** Maakonnakeskus (linn). */
  seat: string;
  /** Sobiv võti labor/salary snapshotis ("tartu"), või null kui andmed puuduvad. */
  laborRegionKey: string | null;
}

// 15 Eesti maakonda. `slug` = labor/salary snapshoti regiooni-võti (kõik 15 on
// snapshotis olemas, seega laborRegionKey === slug igal real). Hoiame need
// eraldi väljadena, et tulevikus saaks lahkneda, kui snapshoti võti muutub.
export const REGIONS: Region[] = [
  { slug: "harju",      name: "Harjumaa",       formalName: "Harju maakond",      seat: "Tallinn",      laborRegionKey: "harju" },
  { slug: "hiiu",       name: "Hiiumaa",        formalName: "Hiiu maakond",       seat: "Kärdla",       laborRegionKey: "hiiu" },
  { slug: "ida-viru",   name: "Ida-Virumaa",    formalName: "Ida-Viru maakond",   seat: "Jõhvi",        laborRegionKey: "ida-viru" },
  { slug: "jogeva",     name: "Jõgevamaa",      formalName: "Jõgeva maakond",     seat: "Jõgeva",       laborRegionKey: "jogeva" },
  { slug: "jarva",      name: "Järvamaa",       formalName: "Järva maakond",      seat: "Paide",        laborRegionKey: "jarva" },
  { slug: "laane",      name: "Läänemaa",       formalName: "Lääne maakond",      seat: "Haapsalu",     laborRegionKey: "laane" },
  { slug: "laane-viru", name: "Lääne-Virumaa",  formalName: "Lääne-Viru maakond", seat: "Rakvere",      laborRegionKey: "laane-viru" },
  { slug: "polva",      name: "Põlvamaa",       formalName: "Põlva maakond",      seat: "Põlva",        laborRegionKey: "polva" },
  { slug: "parnu",      name: "Pärnumaa",       formalName: "Pärnu maakond",      seat: "Pärnu",        laborRegionKey: "parnu" },
  { slug: "rapla",      name: "Raplamaa",       formalName: "Rapla maakond",      seat: "Rapla",        laborRegionKey: "rapla" },
  { slug: "saare",      name: "Saaremaa",       formalName: "Saare maakond",      seat: "Kuressaare",   laborRegionKey: "saare" },
  { slug: "tartu",      name: "Tartumaa",       formalName: "Tartu maakond",      seat: "Tartu",        laborRegionKey: "tartu" },
  { slug: "valga",      name: "Valgamaa",       formalName: "Valga maakond",      seat: "Valga",        laborRegionKey: "valga" },
  { slug: "viljandi",   name: "Viljandimaa",    formalName: "Viljandi maakond",   seat: "Viljandi",     laborRegionKey: "viljandi" },
  { slug: "voru",       name: "Võrumaa",        formalName: "Võru maakond",       seat: "Võru",         laborRegionKey: "voru" }
];

export const regionBySlug = new Map(REGIONS.map((r) => [r.slug, r]));

/**
 * PAKKUJA → MAAKOND (asukoha-maakond).
 *
 * KAARDISTUSE ALUS: iga kõrgkooli/ülikooli AMETLIK ASUKOHT (peamaja/kampuse linn)
 * ja selle maakond. Kaardistame AINULT üheselt mõistetavad pakkujad; kahtluse
 * korral jätame kaardistamata (→ käsitletakse "veebis/üle Eesti" õppena, mitte
 * kohapealse maakonna programmina). TÄPSUS > KATVUS.
 *
 *   TalTech (Tallinna Tehnikaülikool)        → Tallinn  → Harju
 *   Tallinna Ülikool                          → Tallinn  → Harju
 *   EBS (Estonian Business School)            → Tallinn  → Harju
 *   Eesti Kunstiakadeemia                     → Tallinn  → Harju
 *   Eesti Muusika- ja Teatriakadeemia         → Tallinn  → Harju
 *   Tallinna Tehnikakõrgkool                  → Tallinn  → Harju
 *   Eesti Ettevõtluskõrgkool Mainor           → Tallinn (peamaja) → Harju
 *   Tartu Ülikool                             → Tartu    → Tartu
 *   Eesti Maaülikool                          → Tartu    → Tartu
 *
 * Märkus: mitme kampusega koolidel (nt TÜ Pärnu/Narva kolledž, Mainori Tartu maja)
 * loeme PEAMAJA maakonna — programmi tegelik toimumiskoht on kooli enda lehel, mida
 * me ei dubleeri. Veebis/hübriid programmid kuvatakse igas maakonnas "veebis
 * kättesaadav" märkega, mitte kohapealsena.
 */
export const PROVIDER_REGION: Record<string, string> = {
  "TalTech": "harju",
  "Tallinna Ülikool": "harju",
  "EBS": "harju",
  "Eesti Kunstiakadeemia": "harju",
  "Eesti Muusika- ja Teatriakadeemia": "harju",
  "Tallinna Tehnikakõrgkool": "harju",
  "Eesti Ettevõtluskõrgkool Mainor": "harju",
  "Tartu Ülikool": "tartu",
  "Eesti Maaülikool": "tartu"
};

/** Kas programm on veebis kättesaadav (veebis VÕI hübriid) — ei eelda kohalolu. */
export function isOnlineAvailable(entry: CatalogEntryWithSlug): boolean {
  return entry.format === "veebis" || entry.format === "hübriid";
}

/**
 * Maakonna KOHAPEALNE õpe: pakkuja asub maakonnas JA programm toimub kohapeal
 * (format === "kohapeal"). Veebi/hübriid programme EI loeta kohapealseks — need
 * on omaette "veebis kättesaadav" plokis (kõigile maakondadele). Tundmatu vormiga
 * (null) programme ei VÄIDA me kohapealseks: TÄPSUS > KATVUS, et GEO-väited (mida
 * AI-mootorid tsiteerivad) oleksid usaldusväärsed — me ei väida kunagi, et veebi-
 * või tundmatu-vormiga programm toimub maakonnas kohapeal.
 */
export function localProgrammes(regionSlug: string): CatalogEntryWithSlug[] {
  return catalog.filter((e) => PROVIDER_REGION[e.provider] === regionSlug && e.format === "kohapeal");
}

/** Kõik veebis/hübriid programmid — kuvame igas maakonnas "veebis kättesaadav". */
export function onlineProgrammes(): CatalogEntryWithSlug[] {
  return catalog.filter(isOnlineAvailable);
}

/**
 * Maakonna programmide arv hubi-lehe jaoks: kohapealsed (asukoht maakonnas) +
 * veebis kättesaadavad (kõigile maakondadele). Dubleerimisteta.
 */
export function programmeCount(regionSlug: string): { local: number; online: number; total: number } {
  const local = localProgrammes(regionSlug);
  const online = onlineProgrammes();
  const seen = new Set(local.map((e) => e.slug));
  const onlineExtra = online.filter((e) => !seen.has(e.slug));
  return { local: local.length, online: onlineExtra.length, total: local.length + onlineExtra.length };
}
