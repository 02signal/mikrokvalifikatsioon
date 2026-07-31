// Andmepõhine "vastused" (GEO) generaator: lühike AI-tsiteeritav faktivastus
// kõrge kavatsusega Eesti otsingupäringutele. Iga kirje lühivastus (shortAnswer)
// on 1–3 väljavõetavat lauset; andmepõhised vastused arvutatakse REAALSEST
// kataloogist build-ajal (kestus, hind, EAP-jaotus, pakkujad, programmide arv).
// Ei dubleeri /kkk, /mis-on-mikrokvalifikatsioon ega /kes-maksab lehti — need
// katavad sissejuhatuse ja rahastuse; siin on üksikküsimuste faktilehed.
import { catalog, providers, catalogUpdatedAt } from "../catalog";
import { plausiblePriceEur } from "../priceGuard";
import { ehisProgrammeCount, ehisProviderCount } from "../ehisFacts";

export type QuestionEntry = {
  /** URL-segment: /vastused/<slug>/ — püsiv aadress, ära muuda hooletult. */
  slug: string;
  /** H1 ja JSON-LD Question.name — täpne loomulik otsingupäring. */
  question: string;
  /**
   * Valikuline SERP-pealkiri (title-silt). Kui määratud, kasutatakse seda
   * otsingutulemuse pealkirjana H1/küsimuse asemel — nii saab pealkirja panna
   * otsevastuse (nt "1 EAP = 26 tundi"), mis tõstab klõpsumäära. H1 jääb
   * küsimuseks. Kui puudub, kasutatakse `${question} | Mikrokvalifikatsioon.ee`.
   */
  seoTitle?: string;
  /** 1–3 väljavõetavat lauset; kuvatakse rasvaselt esimesena (AI-tsiteeritav). */
  shortAnswer: string;
  /**
   * Valikuline selgitav joonis (Knaflic-stiilis SVG): üks selge sõnum, minimaalne
   * kaunistus. Kuvatakse lühivastuse järel ja annab ImageObject struktuurandmed
   * (SEO + GEO + Google Images visuaalotsing).
   *
   * `stacked` on sama joonise püstine variant kitsale ekraanile — lai joonis
   * kahaneks telefonis loetamatuks (vt `src/lib/diagram.ts`).
   */
  figure?: { src: string; alt: string; caption: string; width: number; height: number; stacked?: string };
  /** Toetav sisu lõikudena (HTML-vaba, loomulik eesti keel). */
  body: string[];
  /** Seotud lingid edasiliikumiseks (ankur + tee). */
  relatedLinks: { label: string; href: string }[];
};

// ---------------------------------------------------------------------------
// Reaalsed kataloogiarvud (arvutatud build-ajal, mitte sisse kirjutatud)
// ---------------------------------------------------------------------------

// Eesti hinnavorming: tuhik tuhandeliste eraldajana (nt "1 800 €"), nagu mujal saidil.
const fmtEur = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

const ects = catalog.map((e) => e.ects).filter((n): n is number => n != null).sort((a, b) => a - b);
const ectsMin = ects.length ? ects[0] : null;
const ectsMax = ects.length ? ects[ects.length - 1] : null;
const ectsMedian = ects.length ? ects[Math.floor(ects.length / 2)] : null;

// EAP-jaotus vahemikesse (väljavõetav tabelina).
const ectsBuckets = [
  { label: "6–11 EAP", lo: 6, hi: 11, count: 0 },
  { label: "12–18 EAP", lo: 12, hi: 18, count: 0 },
  { label: "19–24 EAP", lo: 19, hi: 24, count: 0 },
  { label: "25–33 EAP", lo: 25, hi: 99, count: 0 }
];
for (const n of ects) {
  const b = ectsBuckets.find((x) => n >= x.lo && n <= x.hi);
  if (b) b.count += 1;
}
const ectsCommonBucket = ectsBuckets.slice().sort((a, b) => b.count - a.count)[0] ?? null;

// plausiblePriceEur (not parsePriceEur): withholds a €/EAP outlier that is
// almost certainly a bad source reading (see src/data/priceGuard.ts) so the
// site's own "hind" claims aren't defined by one suspect value.
const prices = catalog
  .map((e) => plausiblePriceEur(e))
  .filter((p): p is number => p != null && p > 0)
  .sort((a, b) => a - b);
const priceMin = prices.length ? prices[0] : null;
const priceMax = prices.length ? prices[prices.length - 1] : null;
const priceMedian = prices.length ? prices[Math.floor(prices.length / 2)] : null;
// "Tüüpiline" vahemik = 25.–75. protsentiil (väldib üksikute äärmuste moonutust).
const priceP25 = prices.length ? prices[Math.floor(prices.length * 0.25)] : null;
const priceP75 = prices.length ? prices[Math.floor(prices.length * 0.75)] : null;

const programmeCount = catalog.length;
const providerCount = providers.length;
const universityCount = catalog.filter((e) => e.providerType === "ülikool").length;
const universities = [...new Set(catalog.filter((e) => e.providerType === "ülikool").map((e) => e.provider))];
const otherProviders = [...new Set(catalog.filter((e) => e.providerType !== "ülikool").map((e) => e.provider))];

// Pakkujad koos programmide arvuga (väljavõetav loend), suuremad ees.
const providerRows = providers
  .map((provider) => ({
    provider,
    count: catalog.filter((e) => e.provider === provider).length,
    type: catalog.find((e) => e.provider === provider)?.providerType ?? null
  }))
  .sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider, "et"));

const updatedAtText = catalogUpdatedAt.split("-").reverse().join(".");

// Inimloetav loend ("A, B ja C").
const etList = (items: string[]): string => {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ja ${items[items.length - 1]}`;
};

const ectsRangeText = ectsMin != null && ectsMax != null ? `${ectsMin}–${ectsMax} EAP` : "6–30 EAP";
const priceTypicalText =
  priceP25 != null && priceP75 != null ? `${fmtEur(priceP25)}–${fmtEur(priceP75)}` : "700–1 800 €";

// EAP -> tundide vahemik (ametlik teisendus 1 EAP = 26 tundi õppija tööd).
const hoursLo = ectsMin != null ? ectsMin * 26 : null;
const hoursHi = ectsMax != null ? ectsMax * 26 : null;

// Valdkonnad programmide arvu järgi (väljavõetav "populaarseimad valdkonnad" loend).
type FieldRow = { field: string; count: number };
const fieldCounts = new Map<string, number>();
for (const e of catalog) fieldCounts.set(e.field, (fieldCounts.get(e.field) ?? 0) + 1);
// "muu" on koondkategooria, mitte sisuline valdkond — jäta populaarsuse loendist välja.
const fieldRows: FieldRow[] = [...fieldCounts.entries()]
  .filter(([field]) => field !== "muu")
  .map(([field, count]) => ({ field, count }))
  .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field, "et"));
const fieldCountExclMuu = fieldRows.length;
const topFields = fieldRows.slice(0, 3);

// Õppevorm: mitu programmi saab läbida veebis või hübriidõppes (töö kõrvalt).
const onlineCount = catalog.filter((e) => e.format === "veebis").length;
const blendedCount = catalog.filter((e) => e.format === "hübriid").length;
const onlineOrBlendedCount = onlineCount + blendedCount;
const onsiteCount = catalog.filter((e) => e.format === "kohapeal").length;

// Õppekeel: eestikeelsed vs ingliskeelsed programmid.
const estonianCount = catalog.filter((e) => e.language === "et").length;
const englishCount = catalog.filter((e) => e.language === "en").length;

// ---------------------------------------------------------------------------
// Eksporditavad andmed lehtede jaoks (et /vastused/index ja [slug] saaks tabelid)
// ---------------------------------------------------------------------------

export const questionStats = {
  programmeCount,
  providerCount,
  ehisProgrammeCount,
  ehisProviderCount,
  universityCount,
  universities,
  otherProviders,
  providerRows,
  ects: { min: ectsMin, max: ectsMax, median: ectsMedian, buckets: ectsBuckets, commonBucket: ectsCommonBucket },
  price: { min: priceMin, max: priceMax, median: priceMedian, p25: priceP25, p75: priceP75, withPrice: prices.length },
  hours: { lo: hoursLo, hi: hoursHi },
  fields: { count: fieldCountExclMuu, rows: fieldRows, top: topFields },
  format: { online: onlineCount, blended: blendedCount, onlineOrBlended: onlineOrBlendedCount, onsite: onsiteCount },
  language: { estonian: estonianCount, english: englishCount },
  updatedAtText
};

// ---------------------------------------------------------------------------
// Küsimuste kogum (kureeritud, ~8–12) — ainult lüngad, mida olemasolevad
// lehed EI kata eraldi lehena.
// ---------------------------------------------------------------------------

export const questions: QuestionEntry[] = [
  {
    slug: "kui-kaua-mikrokraad-kestab",
    question: "Kui kaua mikrokraad kestab?",
    figure: {
      src: "/diagrams/kui-kaua-kestab.svg",
      alt: "Joonis: mikrokraad kestab tavaliselt 1–2 semestrit töö kõrvalt — kuud, mitte aastad; maht 6–30 EAP ehk umbes 156–780 tundi.",
      caption: "Tavaliselt 1–2 semestrit töö kõrvalt — lühemad ühe, mahukamad kahe semestriga. 6–30 EAP ≈ 156–780 tundi.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/kui-kaua-kestab.svg"
    },
    shortAnswer:
      `Mikrokraad kestab tavaliselt üks kuni kaks semestrit töö kõrvalt — kuud, mitte aastad. ` +
      `Registris on tüüpiline maht ${ectsRangeText}, mis tähendab umbes ${hoursLo}–${hoursHi} tundi õppija tööd kokku (1 EAP ≈ 26 tundi). ` +
      `Lühemad praktilised programmid kestavad paar kuud, mahukamad kuni aasta.`,
    body: [
      `Mikrokraadi kestust mõõdetakse õppija töö kogumahuna, mitte ainult kontakttundidena. Ametlik teisendus on 1 EAP (Euroopa ainepunkt) ≈ 26 tundi õppija tööd, mis hõlmab nii auditoorset kui iseseisvat tööd.`,
      `Meie registri ${programmeCount} programmi mahud jäävad vahemikku ${ectsRangeText}, mediaan on ${ectsMedian} EAP. Kõige sagedasem mahuklass on ${ectsCommonBucket ? ectsCommonBucket.label : "12–18 EAP"} (${ectsCommonBucket ? ectsCommonBucket.count : ""} programmi). See vastab tüüpiliselt ühele kuni kahele semestrile töö kõrvalt.`,
      `Kalendris tähendab see enamasti õppeaastat hooti: üks semester (sügis või kevad) lühematel programmidel ja kaks semestrit mahukamatel. Täpne algus- ja lõpukuupäev on iga programmi juures kataloogis ja lõplik info alati kooli enda lehel.`
    ],
    relatedLinks: [
      { label: "Mitu EAP-d on mikrokraadil?", href: "/vastused/mitu-eap-d-on-mikrokraadil/" },
      { label: "Kui palju mikrokraad maksab?", href: "/vastused/kui-palju-mikrokraad-maksab/" },
      { label: "Vaata kõiki programme kataloogis", href: "/kataloog/" }
    ]
  },
  {
    slug: "kui-palju-mikrokraad-maksab",
    question: "Kui palju mikrokraad maksab?",
    figure: {
      src: "/diagrams/hind.svg",
      alt: "Joonis: mikrokraadi hinnavahemik — tüüpiline vahemik (25.–75. protsentiil), mediaan ja avaldatud hindade äärmused registri andmetest.",
      caption: "Tüüpiline hind on keskmine pool kõigist hindadest (25.–75. protsentiil); punkt on mediaan. Sõltub mahust (EAP) ja koolist.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/hind.svg"
    },
    shortAnswer:
      `Mikrokraad maksab Eestis enamasti ${priceTypicalText} (tüüpiline vahemik, mediaan ${priceMedian != null ? fmtEur(priceMedian) : "~1 440 €"}). ` +
      `Registris avaldatud hinnad ulatuvad ${priceMin != null ? fmtEur(priceMin) : "~300 €"}-st ${priceMax != null ? fmtEur(priceMax) : "~4 000 €"}-ni, sõltuvalt mahust (EAP) ja koolist. ` +
      `Sageli ei maksa õppija kogu summat ise — tööandja või Töötukassa võib selle katta.`,
    body: [
      `Hind sõltub kõige rohkem mahust: 12–18 EAP programm maksab vähem kui 24–30 EAP oma. Meie registris on hind avaldatud ${prices.length} programmil ${programmeCount}-st. Avaldatud hinnad ulatuvad ${priceMin != null ? fmtEur(priceMin) : "~300 €"}-st ${priceMax != null ? fmtEur(priceMax) : "~4 000 €"}-ni; tüüpiline (keskmine pool kõikidest hindadest) vahemik on ${priceTypicalText} ja mediaan ${priceMedian != null ? fmtEur(priceMedian) : "~1 440 €"}.`,
      `Õppija ei pea sageli kogu summat ise maksma. Kolm rahastusrada on tööandja koolituseelarve, Töötukassa toetused ja ise makstes. Osa programme on lisaks kindlale sihtrühmale rahastatud (näiteks töötavatele õpetajatele EL-i kaasrahastusel) — need on kataloogis märgitud.`,
      `Lõplik ja siduv hind on alati kooli enda registreerimislehel; meie register koondab avaldatud hinnad koos kontrollkuupäevaga. Kui kool pole hinda avaldanud, jätame välja, mitte ei leiuta.`
    ],
    relatedLinks: [
      { label: "Kes maksab mikrokvalifikatsiooni eest?", href: "/kes-maksab/" },
      { label: "Kui kaua mikrokraad kestab?", href: "/vastused/kui-kaua-mikrokraad-kestab/" },
      { label: "Võrdle programme hinna järgi", href: "/mikrokraadide-vordlus/" }
    ]
  },
  {
    slug: "mitu-eap-d-on-mikrokraadil",
    question: "Mitu EAP-d on mikrokraadil?",
    figure: {
      src: "/diagrams/eap-jaotus.svg",
      alt: "Joonis: mitu mikrokraadi jääb igasse EAP-vahemikku (6–11, 12–18, 19–24, 25–33 EAP); kõige sagedasem maht on esile tõstetud.",
      caption: "Mikrokraadi maht EAP-vahemike kaupa; esile tõstetud on kõige sagedasem vahemik. 1 EAP ≈ 26 tundi.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/eap-jaotus.svg"
    },
    shortAnswer:
      `Mikrokraadil on Eestis tavaliselt ${ectsRangeText}, mediaan ${ectsMedian} EAP. ` +
      `Kõige sagedasem maht on ${ectsCommonBucket ? ectsCommonBucket.label : "12–18 EAP"} — see katab registris ${ectsCommonBucket ? ectsCommonBucket.count : ""} programmi. ` +
      `1 EAP võrdub umbes 26 tunni õppija tööga, seega ${ectsMedian} EAP tähendab umbes ${ectsMedian != null ? ectsMedian * 26 : "390"} tundi.`,
    body: [
      `EAP ehk Euroopa ainepunkt (ECTS) mõõdab õppija töö kogumahtu: 1 EAP ≈ 26 tundi, mis sisaldab nii loenguid kui iseseisvat tööd. Mikrokvalifikatsiooni reguleerib täiskasvanute koolituse seadus ja mikrokraadid jäävad tüüpiliselt 5–30 EAP vahemikku.`,
      `Meie registri ${ects.length} EAP-ga programmi jaotuvad nii: ${ectsBuckets.map((b) => `${b.label} — ${b.count} programmi`).join("; ")}. Mediaanmaht on ${ectsMedian} EAP ja kõige sagedasem klass on ${ectsCommonBucket ? ectsCommonBucket.label : "12–18 EAP"}.`,
      `Ülikooli mikrokraadi EAP-d on ECTS-ainepunktid, mida saab sageli hiljem tasemeõppes (kraadiõppes) arvestada — see eristab mikrokraadi koolitusettevõtte mikrokvalifikatsioonist, mis ei pruugi EAP-sid anda. Iga programmi täpne EAP-maht on kataloogis.`
    ],
    relatedLinks: [
      { label: "Mis on EAP?", href: "/vastused/mis-on-eap/" },
      { label: "Kui kaua mikrokraad kestab?", href: "/vastused/kui-kaua-mikrokraad-kestab/" },
      { label: "Mikrokraad vs mikrokvalifikatsioon", href: "/vastused/mikrokraad-vs-mikrokvalifikatsioon/" }
    ]
  },
  {
    slug: "mis-on-eap",
    question: "Mis on EAP?",
    seoTitle: "Mis on EAP? 1 EAP = 26 tundi õppetööd | Mikrokvalifikatsioon.ee",
    figure: {
      src: "/diagrams/eap-26-tundi.svg",
      alt: "Joonis: 1 EAP võrdub umbes 26 tundi õppija tööd (loengud ja iseseisev töö); mikrokraad on tavaliselt 6–30 EAP ehk umbes 156–780 tundi.",
      caption: "1 EAP ≈ 26 tundi õppija tööd — loengud ja iseseisev töö kokku. Mikrokraad tavaliselt 6–30 EAP.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/eap-26-tundi.svg"
    },
    shortAnswer:
      `EAP on Euroopa ainepunkt (ECTS — European Credit Transfer System), õppemahu ühik. ` +
      `1 EAP võrdub umbes 26 tunni õppija tööga, mis hõlmab nii loenguid kui iseseisvat tööd. ` +
      `Mikrokraadid annavad Eestis tavaliselt ${ectsRangeText}, seega umbes ${hoursLo}–${hoursHi} tundi õppimist.`,
    body: [
      `EAP (lühend sõnadest Euroopa ainepunkt) on sama mis rahvusvaheline ECTS. See mõõdab, kui palju aega õppimine keskmiselt nõuab — mitte ainult kontakttunde, vaid kogu õppija töö: loengud, praktikumid, lugemine, ülesanded ja eksamiks valmistumine.`,
      `Üks EAP vastab umbes 26 tunnile õppija tööd. Nii saab mahtu kiiresti tundideks teisendada: ${ectsMedian} EAP (registri mediaan) ≈ ${ectsMedian != null ? ectsMedian * 26 : 390} tundi, 24 EAP ≈ 624 tundi. See aitab hinnata, kui palju koormust programm töö kõrvalt tekitab.`,
      `EAP-d on olulised kahel põhjusel: need on kogu Euroopas üheselt mõistetavad (ECTS), ja ülikooli mikrokraadi EAP-sid saab sageli hiljem kraadiõppes arvestada. Koolitusettevõtte mikrokvalifikatsioon ei pruugi EAP-sid anda — siis kuvatakse kestus tundides.`
    ],
    relatedLinks: [
      { label: "Mitu EAP-d on mikrokraadil?", href: "/vastused/mitu-eap-d-on-mikrokraadil/" },
      { label: "Mikrokraad vs mikrokvalifikatsioon", href: "/vastused/mikrokraad-vs-mikrokvalifikatsioon/" },
      { label: "Mis on mikrokvalifikatsioon?", href: "/mis-on-mikrokvalifikatsioon/" }
    ]
  },
  {
    slug: "mikrokraad-vs-mikrokvalifikatsioon",
    question: "Mikrokraad vs mikrokvalifikatsioon — mis vahe on?",
    figure: {
      src: "/diagrams/mikrokraad-vs-mikrokvalifikatsioon.svg",
      alt: "Joonis: mikrokraad on üks mikrokvalifikatsiooni liik — ülikooli pakutav, annab EAP-d. Iga mikrokraad on mikrokvalifikatsioon, aga mitte vastupidi.",
      caption: "Mikrokvalifikatsioon on katusmõiste; mikrokraad on selle ülikooli-liik, mis annab EAP-d. Iga mikrokraad on mikrokvalifikatsioon — aga mitte vastupidi.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/mikrokraad-vs-mikrokvalifikatsioon.svg"
    },
    shortAnswer:
      `Mikrokvalifikatsioon on katusmõiste igale lühikesele tunnustatud õppele ühe oskuse kohta. ` +
      `Mikrokraad on selle ülikooli versioon: see annab EAP-sid (ainepunkte), mida saab sageli hiljem kraadiõppes arvestada, ja vähemalt pool õppekavast on kõrghariduse tasemel. ` +
      `Lihtsalt: iga mikrokraad on mikrokvalifikatsioon, aga mitte iga mikrokvalifikatsioon pole mikrokraad.`,
    body: [
      `Mõisted on hierarhilised. „Mikrokvalifikatsioon“ on lai katusmõiste — pakkuja võib olla ülikool, rakenduskõrgkool või koolitusettevõte. „Mikrokraad“ on kitsam: see on ülikooli (või rakenduskõrgkooli) pakutav mikrokvalifikatsioon, mis annab Euroopa ainepunkte (EAP) ja on kõrghariduse tasemel.`,
      `Peamine praktiline vahe on ainepunktid. Mikrokraadi EAP-sid saab sageli hiljem tasemeõppes arvestada — see on väärtuslik, kui plaanid edaspidi kraadiõpet. Koolitusettevõtte mikrokvalifikatsioon keskendub kiirele praktilisele oskusele ega pruugi EAP-sid anda.`,
      `Meie registris on ${universityCount} ülikooli mikrokraadi (pakkujad: ${etList(universities)}) ja lisaks rakenduskõrgkoolide lühiõpe (${etList(otherProviders)}). Vali ülikooli mikrokraad, kui tahad ainepunkte ja kõrgharidustasemel õpet; vali koolitusettevõtte mikrokvalifikatsioon, kui tahad kiiret praktilist oskust.`
    ],
    relatedLinks: [
      { label: "Mis on mikrokvalifikatsioon?", href: "/mis-on-mikrokvalifikatsioon/" },
      { label: "Mitu EAP-d on mikrokraadil?", href: "/vastused/mitu-eap-d-on-mikrokraadil/" },
      { label: "Kuidas valida mikrokraadi?", href: "/mikrokraadi-valimine/" }
    ]
  },
  {
    slug: "kus-saab-mikrokraadi-oppida",
    question: "Kus saab mikrokraadi õppida?",
    shortAnswer:
      `EHIS ametlik faktikiht näitab ${ehisProviderCount} pakkujat ja ${ehisProgrammeCount} registreeritud mikrokvalifikatsiooni õppekava. ` +
      `Õppijale võrreldavas kataloogis on ${programmeCount} kirjet ${providerCount} pakkujalt, sh ${etList(providerRows.slice(0, 5).map((r) => r.provider))} ja teised. ` +
      `Ametlik täiskiht ja praktiline kataloog täiendavad teineteist: üks annab turu ulatuse, teine aitab valida.`,
    body: [
      `Mikrokraade ja mikrokvalifikatsioone pakuvad Eestis nii avalik-õiguslikud ülikoolid kui rakenduskõrgkoolid ja erakoolid. EHIS ametlik avaandmete kiht sisaldab praegu ${ehisProgrammeCount} registreeritud mikrokvalifikatsiooni õppekava ${ehisProviderCount} pakkujalt.`,
      `Õppijale võrreldav kataloog koondab neist avalike koolilehtede põhjal ${programmeCount} kirjet ${providerCount} pakkujalt. Pakkujad programmide arvu järgi võrreldavas kataloogis: ${providerRows.map((r) => `${r.provider} — ${r.count} programmi`).join("; ")}.`,
      `Õppima saab enamasti veebis, hübriidõppes või kohapeal — õppevorm on iga programmi juures kataloogis. Registreerumine käib alati kooli enda lehel; meie kataloog suunab sind õigesse kohta ja näitab enne maht, hind ja valdkond kõrvuti.`
    ],
    relatedLinks: [
      { label: "Vaata kõiki koole ja programme", href: "/kataloog/" },
      { label: "Mikrokraadid koolide kaupa", href: "/mikrokraadid/" },
      { label: "Kuidas valida mikrokraadi?", href: "/mikrokraadi-valimine/" }
    ]
  },
  {
    slug: "kas-mikrokraad-annab-korghariduse",
    question: "Kas mikrokraad annab kõrghariduse või kraadi?",
    figure: {
      src: "/diagrams/kas-annab-korghariduse.svg",
      alt: "Joonis: mikrokraad ei ole kraad (lõpeb tunnistusega), aga annab EAP-sid, mida saab sageli hiljem kraadiõppes arvestada.",
      caption: "Mikrokraad lõpeb tunnistusega, mitte kraadiga — aga EAP-sid saab sageli hiljem kraadiõppes arvestada.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/kas-annab-korghariduse.svg"
    },
    shortAnswer:
      `Ei — mikrokraad ei ole kõrgharidust andev kraad ega diplom. ` +
      `See on lühike kõrghariduse tasemel õpe ühe oskuse kohta, mis lõpeb tunnistusega, mitte bakalaureuse- ega magistrikraadiga. ` +
      `Mikrokraadi EAP-sid saab aga sageli hiljem päris kraadiõppes arvestada, nii et see võib olla samm kraadi suunas.`,
    body: [
      `Mikrokraad on tahtlikult „mikro“: see tõendab ühe konkreetse oskuse või teadmiste valdkonna, mitte tervet eriala. Lõpus saad tunnistuse, mis kinnitab läbitud õpet ja saavutatud õpiväljundeid — see ei ole akadeemiline kraad (bakalaureus, magister, doktor).`,
      `Kuigi mikrokraad ise kraadi ei anna, on see kõrghariduse tasemel ja annab Euroopa ainepunkte (EAP/ECTS). Neid ainepunkte saab paljudes ülikoolides hiljem tasemeõppes arvestada, mis vähendab kraadiõppe mahtu, kui otsustad selle kasuks.`,
      `Tööturul on mikrokraadi tunnistus tugev signaal: konkreetne, tõendatud ja Euroopas mõistetav oskus, mille saab CV-sse ja Europassi. See sobib oskuse tõendamiseks ilma aastatepikkuse kraadiõppeta.`
    ],
    relatedLinks: [
      { label: "Mis on mikrokvalifikatsioon?", href: "/mis-on-mikrokvalifikatsioon/" },
      { label: "Mitu EAP-d on mikrokraadil?", href: "/vastused/mitu-eap-d-on-mikrokraadil/" },
      { label: "Mikrokraad vs mikrokvalifikatsioon", href: "/vastused/mikrokraad-vs-mikrokvalifikatsioon/" }
    ]
  },
  {
    slug: "kuidas-mikrokraadile-kandideerida",
    question: "Kuidas mikrokraadile kandideerida?",
    figure: {
      src: "/diagrams/kuidas-kandideerida.svg",
      alt: "Joonis: mikrokraadile kandideerimine kolmes sammus — 1) vali programm, 2) kontrolli eeldusi ja tähtaega, 3) registreeru kooli enda lehel.",
      caption: "Kolm sammu: vali programm → kontrolli eeldusi ja tähtaega → registreeru. Lõplik registreerimine käib alati kooli enda lehel.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/kuidas-kandideerida.svg"
    },
    shortAnswer:
      `Mikrokraadile kandideerimiseks vali kataloogist sobiv programm, kontrolli eeldusi ja tähtaega ning registreeru kooli enda lehel. ` +
      `Osa mikrokraade nõuab varasemat kõrgharidust, osa on avatud kõigile — nõue on iga programmi juures. ` +
      `Lõplik ja siduv registreerimine käib alati ülikooli või kooli enda lehel, mitte meie registris.`,
    body: [
      `Samm 1 — vali programm. Kasuta filtreeritavat kataloogi (valdkond, kool, hind, maht) või tee avalehel 2-minutiline suunatest, mis pakub sulle sobivad programmid. Märgi kuni kolm ja võrdle neid kõrvuti.`,
      `Samm 2 — kontrolli eeldusi ja tähtaega. Vaata programmi lehelt, kas on vastuvõtu eeldusi (näiteks varasem kõrgharidus või töökogemus) ja millal on registreerimise tähtaeg ning õppe algus. Need on iga programmi juures kataloogis ja kooli lehel.`,
      `Samm 3 — registreeru kooli lehel. Meie register suunab sind kooli enda registreerimislehele. Seal esitad andmed, valid rahastuse (ise, tööandja või Töötukassa kaudu) ja kinnitad osaluse. Meie ei vahenda registreerumist ega salvesta sinu andmeid.`
    ],
    relatedLinks: [
      { label: "Registreerimine ja algusajad", href: "/registreerimine/" },
      { label: "Kuidas valida mikrokraadi?", href: "/mikrokraadi-valimine/" },
      { label: "Ava filtreeritav kataloog", href: "/kataloog/" }
    ]
  },
  {
    slug: "kas-mikrokvalifikatsioon-aitab-toold-leida",
    question: "Kas mikrokvalifikatsioon aitab tööd leida või edutamisel?",
    shortAnswer:
      `Jah — mikrokvalifikatsioon on tööturul konkreetne, tõendatud signaal ühe oskuse kohta, mille saab panna CV-sse, Europassi ja LinkedIni profiilile. ` +
      `See sobib eriti karjäärisammuks, ümberõppeks või edutamise toetamiseks, sest tõendab täpselt seda oskust, mida tööandja otsib — kiiremini kui terve kraadiõpe. ` +
      `Mõju on suurim, kui valid oskuse, mille järele on sinu valdkonnas nõudlust.`,
    body: [
      `Mikrokvalifikatsiooni väärtus tööturul tuleneb selle täpsusest: see ei tõenda mitte üldist haridustaset, vaid ühte konkreetset, ajakohast oskust. Tööandja jaoks on see kergesti loetav — tunnistus ütleb otse, mida sa oskad ja millisel tasemel. Ülikooli mikrokraadi puhul on oskus lisaks kõrghariduse tasemel ja Euroopas ECTS-ainepunktidena mõistetav.`,
      `Edutamisel ja palgaläbirääkimistel toimib mikrokvalifikatsioon tõendina, et oled võtnud initsiatiivi ja täiendanud end suunatult. Paljud valivad mikrokvalifikatsiooni just selleks, et liikuda kõrgemale rollile või laiendada vastutusala ilma tööd katkestamata — õpe käib enamasti töö kõrvalt.`,
      `Suurim mõju tekib siis, kui oskus on valdkonnas nõutud. Vaata enne valikut, milliseid oskusi ja ameteid programm toetab — meie karjääri- ja oskuste lehed seovad programmid konkreetsete ametite ja tööturu signaalidega, et saaksid valida tõendatud nõudluse järgi.`
    ],
    relatedLinks: [
      { label: "Karjäär ja ametid mikrokvalifikatsiooni järgi", href: "/karjaar/" },
      { label: "Oskused, mida programmid annavad", href: "/oskused/" },
      { label: "Kuidas valida mikrokvalifikatsiooni?", href: "/mikrokvalifikatsiooni-valimine/" }
    ]
  },
  {
    slug: "kas-tooandja-saab-mikrokvalifikatsiooni-rahastada",
    question: "Kas tööandja saab mikrokvalifikatsiooni rahastada?",
    figure: {
      src: "/diagrams/rahastus-kolm-rada.svg",
      alt: "Joonis: õppetasule on kolm rahastusrada — õppija ise, tööandja koolituseelarve või Töötukassa toetus.",
      caption: "Kolm rahastusrada: sina ise, tööandja koolituseelarve või Töötukassa. Osa programme on sihtrühmale eraldi rahastatud.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/rahastus-kolm-rada.svg"
    },
    shortAnswer:
      `Jah — tööandja koolituseelarve on üks kolmest peamisest rahastusrajast (tööandja, Töötukassa või ise). ` +
      `Paljud ettevõtted katavad töötaja mikrokvalifikatsiooni õppetasu täielikult või osaliselt, sest oskus jääb ettevõttesse ja õpe käib töö kõrvalt. ` +
      `Lisaks pakub Töötukassa täiendusõppe toetusi nii töötavatele kui tööd otsivatele inimestele.`,
    body: [
      `Tööandja rahastus on tavaline rada: õppetasu tasub ettevõte koolituseelarvest ja töötaja saab oskuse, mida saab kohe töös rakendada. See on tööandjale sageli soodsam ja kiirem kui uue inimese värbamine — eriti mikrokvalifikatsiooni puhul, mis on kitsas ja praktiline. Kokkulepe õppe ja võimaliku siduvusaja kohta sõlmitakse tööandjaga.`,
      `Töötukassa on teine avalik rada. Töötukassa toetab täiendus- ja ümberõpet erinevate teenuste kaudu — näiteks töötava inimese tasemeõppes osalemise toetus või koolituskaart tööd otsivale inimesele. Tingimused ja sihtrühm sõltuvad konkreetsest teenusest ja need on kirjas Töötukassa enda lehel.`,
      `Kolmas rada on ise tasumine. Sõltumata rajast on lõplik ja siduv õppetasu ning maksetingimused alati kooli enda registreerimislehel. Mõned programmid on lisaks kindlale sihtrühmale eraldi rahastatud (näiteks Euroopa Liidu kaasrahastusel) — see on iga programmi juures kataloogis märgitud.`
    ],
    relatedLinks: [
      { label: "Kes maksab mikrokvalifikatsiooni eest?", href: "/kes-maksab/" },
      { label: "Kui palju mikrokraad maksab?", href: "/vastused/kui-palju-mikrokraad-maksab/" },
      { label: "Ava kataloog ja vaata hindu", href: "/kataloog/" }
    ]
  },
  {
    slug: "kas-mitut-mikrokvalifikatsiooni-saab-korraga-teha",
    question: "Kas mitut mikrokvalifikatsiooni saab korraga teha?",
    shortAnswer:
      `Jah — mikrokvalifikatsioonid on disainilt iseseisvad ja lühikesed, seega neid saab läbida ükshaaval või mitu kõrvuti, kui ajakulu jõuad. ` +
      `Enamik programme on ${ectsRangeText} (mediaan ${ectsMedian} EAP ≈ ${ectsMedian != null ? ectsMedian * 26 : 390} tundi õppija tööd), nii et kahe väiksema kombineerimine on töö kõrvalt jõukohane. ` +
      `Mitu mikrokvalifikatsiooni kokku võivad katta laiema oskuste komplekti kui üks üksik.`,
    body: [
      `Mikrokvalifikatsioon on tahtlikult moodulpõhine: iga programm tõendab ühe oskuse ega eelda teiste läbimist. See tähendab, et saad neid laduda nagu ehituskive — alustada ühest, lisada hiljem teise, või võtta kaks korraga, kui ajakava lubab. Koormust mõõda EAP-des: 1 EAP ≈ 26 tundi õppija tööd, nii saad enne otsust kokku liita, kui palju aega kulub.`,
      `Mitme mikrokvalifikatsiooni kombineerimine sobib eriti siis, kui liigud uude valdkonda või tahad katta ühe rolli mitut oskust. Näiteks võib üks programm anda tehnilise oskuse ja teine juhtimise või andmete oskuse — koos moodustavad need tugevama profiili kui kumbki üksi.`,
      `Ülikooli mikrokraadide puhul on lisaboonus: kogutud EAP-sid saab paljudes ülikoolides hiljem tasemeõppes arvestada, nii et mitu mikrokraadi võivad olla samm kraadiõppe suunas. Vaata kataloogist iga programmi maht ja algusaeg ning planeeri kombinatsioon nii, et ajakavad ei kattu üle jõu.`
    ],
    relatedLinks: [
      { label: "Mitu EAP-d on mikrokraadil?", href: "/vastused/mitu-eap-d-on-mikrokraadil/" },
      { label: "Võrdle programme kõrvuti", href: "/mikrokvalifikatsioonide-vordlus/" },
      { label: "Ava filtreeritav kataloog", href: "/kataloog/" }
    ]
  },
  {
    slug: "kas-mikrokvalifikatsiooni-saab-labida-veebis",
    question: "Kas mikrokvalifikatsiooni saab läbida veebis või töö kõrvalt?",
    figure: {
      src: "/diagrams/oppevorm.svg",
      alt: "Joonis: mitu mikrokvalifikatsiooni saab läbida veebis, hübriidis või kohapeal — paljud on veebi- või hübriidõppes ja sobivad töö kõrvale.",
      caption: "Mitu programmi igas õppevormis. Veebis või hübriidis saab õppida töö kõrvalt.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/oppevorm.svg"
    },
    shortAnswer:
      `Jah — paljud mikrokvalifikatsioonid on disainitud töötavale inimesele ja neid saab läbida veebis või hübriidõppes. ` +
      `Registris on ${onlineOrBlendedCount} programmi ${programmeCount}-st veebi- või hübriidõppes (${onlineCount} täielikult veebis, ${blendedCount} hübriidis); enamik ülejäänutest toimub kohapeal. ` +
      `Õpe käib enamasti töö kõrvalt, sest maht on tüüpiliselt ${ectsRangeText} ühe kuni kahe semestri jooksul.`,
    body: [
      `Õppevorm on iga programmi juures eraldi märgitud: veebis (kogu õpe internetis), hübriidõppes (osa veebis, osa kohapeal) või kohapeal. Meie registris on ${onlineCount} täielikult veebipõhist ja ${blendedCount} hübriidprogrammi — kokku ${onlineOrBlendedCount} programmi ${programmeCount}-st, mille saab läbida ilma iga kord kohale tulemata. Kohapeal toimub ${onsiteCount} programmi, sageli kompaktselt mõne sessioonina.`,
      `Töö kõrvalt õppimine on mikrokvalifikatsiooni üks peamisi eeliseid. Maht on tüüpiliselt ${ectsRangeText} (mediaan ${ectsMedian} EAP ≈ ${ectsMedian != null ? ectsMedian * 26 : 390} tundi õppija tööd kokku), mis jaguneb ühe kuni kahe semestri peale. See tähendab paari- kuni mõnetunnist nädalakoormust, mitte täiskohaga õpet.`,
      `Kui tahad just paindlikku õpet, filtreeri kataloogis õppevormi järgi ja vaata programmi lehelt täpne sessioonide rütm ning kas kohapealsed kohtumised on kohustuslikud. Lõplik info õppevormi ja ajakava kohta on alati kooli enda lehel.`
    ],
    relatedLinks: [
      { label: "Ava kataloog ja filtreeri õppevormi järgi", href: "/kataloog/" },
      { label: "Kui kaua mikrokraad kestab?", href: "/vastused/kui-kaua-mikrokraad-kestab/" },
      { label: "Kuidas valida mikrokvalifikatsiooni?", href: "/mikrokvalifikatsiooni-valimine/" }
    ]
  },
  {
    slug: "kellele-mikrokvalifikatsioon-sobib",
    question: "Kellele mikrokvalifikatsioon sobib?",
    shortAnswer:
      `Mikrokvalifikatsioon sobib töötavale inimesele, kes tahab tõendada ühe konkreetse oskuse ilma aastatepikkuse kraadiõppeta. ` +
      `Tüüpilised sihtrühmad on karjääri täiendajad, valdkonnavahetajad, edutamist taotlevad spetsialistid ja tööandjad, kes täiendavad meeskonda. ` +
      `Õpe käib töö kõrvalt ja maht on tüüpiliselt ${ectsRangeText}, seega see sobib ka kiire ajakavaga inimesele.`,
    body: [
      `Kõige selgemini sobib mikrokvalifikatsioon inimesele, kellel on juba töökogemus või haridus, aga vaja täiendada üht kindlat oskust — näiteks andmete, juhtimise, tehnoloogia või valdkonnaspetsiifilist oskust. Õpe on lühike, suunatud ja praktiline, mistõttu seda saab teha töö kõrvalt ühe kuni kahe semestriga.`,
      `Teine selge sihtrühm on valdkonnavahetajad ja ümberõppijad: mikrokvalifikatsioon võimaldab uut suunda proovida väiksema riskiga kui terve kraadiõpe. Ülikooli mikrokraadi puhul saab kogutud EAP-sid hiljem tasemeõppes arvestada, nii et see võib olla esimene samm suurema muutuse poole.`,
      `Sobib ka tööandjale, kes tahab meeskonda kiiresti ja tõendatult täiendada, ning spetsialistile, kes valmistub edutamiseks. Kui sa pole kindel, kas konkreetne programm sobib just sulle, tee avalehel lühike suunatest või vaata valimisteejuhti — need aitavad sobivuse valdkonna, taseme ja eesmärgi järgi kokku viia.`
    ],
    relatedLinks: [
      { label: "Kuidas valida mikrokvalifikatsiooni?", href: "/mikrokvalifikatsiooni-valimine/" },
      { label: "Karjäär ja ametid", href: "/karjaar/" },
      { label: "Ava filtreeritav kataloog", href: "/kataloog/" }
    ]
  },
  {
    slug: "kas-mikrokvalifikatsioon-on-ehises-tunnustatud",
    question: "Kas mikrokvalifikatsioon on EHIS-es ja ametlikult tunnustatud?",
    figure: {
      src: "/diagrams/ehis-tunnustatud.svg",
      alt: "Joonis: mikrokvalifikatsioonid on EHIS-es (Eesti Hariduse Infosüsteem) registreeritud õppekavad — riiklik register; näidatud registreeritud õppekavade ja pakkujate arv.",
      caption: "Mikrokvalifikatsioonid on EHIS-es registreeritud õppekavad (riiklik register). Tunnistus tõendab kinnitatud õppekava läbimist.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/ehis-tunnustatud.svg"
    },
    shortAnswer:
      `Jah — mikrokvalifikatsioonid on Eesti Hariduse Infosüsteemis (EHIS) registreeritud õppekavad ja seega ametlikult tunnustatud õpe. ` +
      `EHIS-es on praegu ${ehisProgrammeCount} registreeritud mikrokvalifikatsiooni õppekava ${ehisProviderCount} pakkujalt; meie võrreldav kataloog koondab neist ${programmeCount} õppijale kasutatavat kirjet ja kuvab sobitatud ametlikud andmed otse EHIS-ist. ` +
      `EHIS-i peab Haridus- ja Teadusministeerium ning andmed on avaandmed.`,
    body: [
      `EHIS (Eesti Hariduse Infosüsteem) on riiklik haridusandmete register, mida peab Haridus- ja Teadusministeerium. Kui mikrokvalifikatsiooni õppekava on EHIS-es registreeritud, tähendab see, et see on ametlikult kinnitatud õpe ja sellel on ametlik õppekavakood, kinnitatud maht (EAP) ning õpiväljundid.`,
      `Meie register kasutab EHIS-i ametliku tõeallikana: iga sobitatud programmi nimi, EAP-maht, õppekeel ja ametlikud õpiväljundid pärinevad otse EHIS-ist (avaandmed, taaskasutatav viitega allikale). Nii ei tugine andmed üksnes kooli turunduslehele, vaid riiklikule registrile — see on usaldusväärsuse alus. EHIS-es on praegu ${ehisProgrammeCount} registreeritud mikrokvalifikatsiooni õppekava ${ehisProviderCount} pakkujalt; õppijale võrreldav kataloog koondab neist ${programmeCount} kasutatavat kirjet.`,
      `Tunnustamine tööturul tuleneb just sellest ametlikust staatusest: tunnistus tõendab EHIS-es kinnitatud õppekava läbimist. Ülikooli mikrokraadi EAP-d on lisaks Euroopa ainepunktid (ECTS), mis on mõistetavad kogu Euroopas ja sageli hiljem kraadiõppes arvestatavad.`
    ],
    relatedLinks: [
      { label: "Kuidas me andmeid koostame", href: "/andmed/" },
      { label: "Mis on mikrokvalifikatsioon?", href: "/mis-on-mikrokvalifikatsioon/" },
      { label: "Kas mikrokraad annab kõrghariduse?", href: "/vastused/kas-mikrokraad-annab-korghariduse/" }
    ]
  },
  {
    slug: "mikrokvalifikatsioon-vs-taiendkoolitus",
    question: "Mille poolest erineb mikrokvalifikatsioon täiendkoolitusest?",
    figure: {
      src: "/diagrams/vs-taiendkoolitus.svg",
      alt: "Joonis: mikrokvalifikatsioon on EHIS-registreeritud õppekava EAP-de ja tunnistusega; täiendkoolitus on vabamas vormis ega pruugi anda ainepunkte.",
      caption: "Mikrokvalifikatsioon: EHIS-registreeritud, EAP ainepunktid, tunnistus. Täiendkoolitus on vabam ega pruugi anda EAP-d.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/vs-taiendkoolitus.svg"
    },
    shortAnswer:
      `Mikrokvalifikatsioon on EHIS-es registreeritud õppekava kinnitatud mahu (EAP), õpiväljundite ja tunnistusega; tavaline täiendkoolitus on vabamas vormis ega pruugi olla riiklikus registris ega anda ainepunkte. ` +
      `Mikrokvalifikatsioon on seega tõendatum ja ülekantavam: ülikooli mikrokraadi EAP-sid saab sageli hiljem kraadiõppes arvestada. ` +
      `Täiendkoolitus on tüüpiliselt lühem ja vähem formaalne, mikrokvalifikatsioon on struktureeritud ja ametlikult tunnustatud.`,
    body: [
      `Peamine vahe on formaalsuses ja tõendatuses. Mikrokvalifikatsioon on registreeritud õppekava: sellel on kinnitatud maht Euroopa ainepunktides (EAP/ECTS), määratletud õpiväljundid ja lõpus tunnistus, mis kinnitab nende saavutamist. Tavaline täiendkoolitus võib olla ühepäevane seminar või lühikursus, mille väljundid pole alati ametlikult kinnitatud.`,
      `See teeb mikrokvalifikatsioonist tugevama signaali tööturul: tööandja näeb täpselt, millise oskuse ja millisel tasemel oled tõendanud, ja see on Euroopas ECTS-ina mõistetav. Ülikooli mikrokraadi EAP-sid saab lisaks paljudes ülikoolides hiljem tasemeõppes arvestada — täiendkoolitus seda võimalust üldjuhul ei anna.`,
      `Vali mikrokvalifikatsioon, kui tahad struktureeritud, tõendatud ja ülekantavat õpet, mis CV-s selgelt loeb. Vali lühike täiendkoolitus, kui vajad kiiret sissejuhatust ilma formaalse tunnistuseta. Meie register koondab just mikrokvalifikatsioone ja mikrokraade koos nende ametlike andmetega.`
    ],
    relatedLinks: [
      { label: "Mis on mikrokvalifikatsioon?", href: "/mis-on-mikrokvalifikatsioon/" },
      { label: "Mis on EAP?", href: "/vastused/mis-on-eap/" },
      { label: "Kas mikrokvalifikatsioon on EHIS-es tunnustatud?", href: "/vastused/kas-mikrokvalifikatsioon-on-ehises-tunnustatud/" }
    ]
  },
  {
    slug: "kuidas-valida-oiget-mikrokvalifikatsiooni",
    question: "Kuidas valida õiget mikrokvalifikatsiooni?",
    shortAnswer:
      `Vali mikrokvalifikatsioon kolme küsimuse järgi: millist oskust tööturg sinu valdkonnas vajab, kui suur maht ja õppevorm sinu ajakavasse mahub ning kas vajad ülekantavaid ainepunkte (EAP). ` +
      `Filtreeri ${programmeCount} programmi valdkonna, kooli, hinna ja mahu järgi ning võrdle kuni kolme kõrvuti. ` +
      `Lõpliku otsuse tee programmi õpiväljundite ja algusaja põhjal kooli enda lehel.`,
    body: [
      `Alusta eesmärgist: kas tahad edutamist, valdkonnavahetust, kindla oskuse tõendamist või sammu kraadiõppe poole. Eesmärk määrab, kas vajad ülikooli mikrokraadi (annab ülekantavad EAP-d) või praktilisemat koolitusettevõtte mikrokvalifikatsiooni. Vaata programmi õpiväljundeid — need ütlevad täpselt, mida pärast õpet oskad.`,
      `Seejärel kontrolli mahtu ja vormi. Registri programmid on tüüpiliselt ${ectsRangeText} (mediaan ${ectsMedian} EAP) ja saadaval veebis, hübriidis või kohapeal — vali see, mis sinu töö kõrvale mahub. Kasuta filtreeritavat kataloogi, et kitsendada valik valdkonna, kooli, hinna ja õppevormi järgi, ja võrdle kuni kolme programmi kõrvuti.`,
      `Lõpuks vaata nõudlust ja tähtaegu. Meie valimisteejuht ja karjäärilehed seovad programmid ametite ja tööturu signaalidega, et saaksid valida tõendatud nõudluse järgi. Kontrolli registreerimise tähtaega ja õppe algust ning tee lõplik otsus kooli enda lehel, kus on siduv info.`
    ],
    relatedLinks: [
      { label: "Mikrokvalifikatsiooni valimise teejuht", href: "/mikrokvalifikatsiooni-valimine/" },
      { label: "Võrdle programme kõrvuti", href: "/mikrokvalifikatsioonide-vordlus/" },
      { label: "Ava filtreeritav kataloog", href: "/kataloog/" }
    ]
  },
  {
    slug: "populaarseimad-mikrokvalifikatsiooni-valdkonnad",
    question: "Millised on populaarseimad mikrokvalifikatsiooni valdkonnad?",
    figure: {
      src: "/diagrams/valdkonnad.svg",
      alt: "Joonis: populaarseimad mikrokvalifikatsiooni valdkonnad programmide arvu järgi (top 5), suurim esile tõstetud.",
      caption: "Enim pakutavad valdkonnad programmide arvu järgi. Iga valdkonda saab vaadata eraldi valdkonnalehel.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/valdkonnad.svg"
    },
    shortAnswer:
      `Registri ${programmeCount} programmi jagunevad ${fieldCountExclMuu} valdkonna vahel ja enim pakutavad on ${etList(topFields.map((f) => `${f.field} (${f.count} programmi)`))}. ` +
      `Need kolm katavad suure osa kogu valikust. ` +
      `Iga valdkonna programme saab vaadata eraldi valdkonnalehel koos mahu, hinna ja koolidega.`,
    body: [
      `Valdkond näitab, mis teemal oskust õpetatakse. Meie registris on ${fieldCountExclMuu} sisulist valdkonda ja programmide arv jaguneb nende vahel ebaühtlaselt: ${etList(topFields.map((f) => `${f.field} on ${f.count} programmi`))}. Need on praegu kõige laiema valikuga teemad.`,
      `Suur valik ühes valdkonnas tähendab tavaliselt suuremat tööturu nõudlust ja rohkem koole, kes seda pakuvad — see annab sulle rohkem võimalusi mahu, hinna ja õppevormi järgi valida. Väiksema valikuga valdkonnad (näiteks õigus või energeetika) on kitsamad, kuid sageli väga spetsiifilised ja sihitud.`,
      `Vali valdkond, mis seostub sinu praeguse või soovitud rolliga, ja vaata selle valdkonnalehelt kõik programmid kõrvuti. Kui sa pole kindel, milline valdkond sobib, aitab avalehe suunatest või valimisteejuht oskuse ja eesmärgi järgi õige teema leida.`
    ],
    relatedLinks: [
      { label: "Vaata kõiki valdkondi", href: "/valdkond/it-ja-andmed/" },
      { label: "Ava filtreeritav kataloog", href: "/kataloog/" },
      { label: "Kuidas valida mikrokvalifikatsiooni?", href: "/mikrokvalifikatsiooni-valimine/" }
    ]
  },
  // ---------------------------------------------------------------------------
  // Koolitajale / HAKA / arendajale suunatud küsimused — sama GEO-primitiiv
  // (WebPage + FAQPage + BreadcrumbList JSON-LD [slug].astro-s), varem kasutamata
  // sihtrühmale. Faktid: HAKA ametlik raamistik (vt /koolitajale/kvaliteedihindamine/).
  // ---------------------------------------------------------------------------
  {
    slug: "kuidas-saada-mikrokvalifikatsiooni-pakkujaks",
    question: "Kuidas saab õppeasutus mikrokvalifikatsiooni pakkujaks?",
    figure: {
      src: "/diagrams/pakkujaks-saamise-sammud.svg",
      alt: "Joonis: mikrokvalifikatsiooni pakkujaks saamine kolmes sammus — HAKA hindab õppekavarühma, tegevusluba või registreerimine, registreeri õppekava EHIS-es.",
      caption: "Kolm sammu pakkujaks saamiseni: HAKA hindamine, tegevusluba/registreerimine, EHIS-registreerimine.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/pakkujaks-saamise-sammud.svg"
    },
    shortAnswer:
      `Uude õppekavarühma sisenedes on tee kolmeastmeline: HAKA (Eesti Hariduse Kvaliteediagentuur) kvaliteedihindamine õppekavarühma kaupa, seejärel tegevusluba või registreerimine ja lõpuks õppekava enda registreerimine Eesti Hariduse Infosüsteemis (EHIS). ` +
      `Kui sinu asutusel on samas õppekavarühmas juba varasem õppeõigus, piisab sageli ainult uue õppekava registreerimisest EHIS-es. ` +
      `Täpne menetluskäik ja tähtajad sõltuvad valdkonnast — kontrolli neid alati HAKA ja EHIS ametlikelt lehtedelt.`,
    body: [
      `Esimene samm neile, kel selles õppekavarühmas veel õppeõigust pole, on HAKA kvaliteedihindamine. HAKA hindab asutuse võimekust kogu õppekavarühmas, mitte üht üksikut õppekava — kaheksa valdkonda ja 27 kriteeriumi kolmeastmelisel skaalal (vastab / vastab osaliselt / ei vasta). Positiivne otsus on eeldus, et tohid valdkonnas mikrokvalifikatsiooni üldse pakkuma hakata, ja see kehtib viis aastat.`,
      `Teine samm on tegevusluba või registreerimine — sõltuvalt sellest, kas tegemist on täiesti uue valdkonnaga asutuse jaoks või juba tuttava valdkonna laiendamisega. Kui asutusel on samas õppekavarühmas juba varasem õppeõigus, on protsess enamasti lühem: sageli piisab uue õppekava registreerimisest, ilma uue kvaliteedihindamiseta.`,
      `Kolmas samm on õppekava enda registreerimine EHIS-es: nimi, maht (EAP), õpiväljundid, sihtrühm ja muud kohustuslikud andmed kantakse riiklikku registrisse. Alles pärast seda on õppekava ametlikult mikrokvalifikatsioonina õppijale nähtav ja tunnistus kehtib. Täpne samm-sammuline juhend koos tähtaegade ja vormidega on meie koolitajale lehel.`
    ],
    relatedLinks: [
      { label: "Koolitajale: ametlik raamistik ja sammud", href: "/koolitajale/" },
      { label: "Kvaliteedihindamine: 8 valdkonda ja ettevalmistus", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Kuidas ehitada oma õppekava", href: "/koolitajale/kuidas-ehitada/" }
    ]
  },
  {
    slug: "mida-haka-mikrokvalifikatsiooni-hindamisel-hindab",
    question: "Mida HAKA hindab — ühte õppekava või kogu kooli?",
    figure: {
      src: "/diagrams/haka-hindab-oppekavaruhma.svg",
      alt: "Joonis: HAKA hindab kogu õppekavarühma võimekust (8 valdkonda, 27 kriteeriumi), mitte üht õppekava — üks hea õppekava on vajalik, aga üksi ei piisa.",
      caption: "HAKA hindab asutuse kogu õppekavarühma võimekust, mitte üht õppekava eraldi.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/haka-hindab-oppekavaruhma.svg"
    },
    shortAnswer:
      `HAKA ei hinda üht õppekava, vaid asutuse võimekust tervele õppekavarühmale kvaliteeti järjepidevalt tagada. ` +
      `Hindamine jaguneb kaheksaks valdkonnaks ja kokku 27 kriteeriumiks, igaüht hinnatakse kolmeastmelisel skaalal: vastab / vastab osaliselt / ei vasta. ` +
      `Positiivseks otsuseks peavad kõik kaheksa valdkonda nõuetele vastama; otsus kehtib viis aastat.`,
    body: [
      `Levinud eksiarvamus on, et piisab ühest heast õppekavast. Tegelikult vaatab HAKA asutuse tervikvõimekust — kas õppekavaarendus, õppeprotsess, koolitajate pädevus, kvaliteedijuhtimine ja ressursid on läbimõeldud ja tõenduspõhised kogu õppekavarühmas, mitte ainult ühes näidisprogrammis.`,
      `Kaheksa valdkonda katavad õppekavaarendust, õppekava ennast, õppeprotsessi kavandamist ja läbiviimist, hindamist ja lõpudokumente, koolitajate kompetentsust, kvaliteedijuhtimist ning ressursse. Iga valdkonna sees on mitu kriteeriumit, kokku 27, ja kõiki hinnatakse eraldi skaalal vastab / vastab osaliselt / ei vasta.`,
      `Kuna otsus tehakse valdkonniti ja kõik kaheksa peavad olema korras, ei aita üks tugev valdkond nõrka üles. Mitu „vastab osaliselt“ hinnangut võivad langetada terve valdkonna ja koos sellega otsuse — seepärast tasub valmistuda süstemaatiliselt, mitte panustada ainult ühele näidisele.`
    ],
    relatedLinks: [
      { label: "Kvaliteedihindamine: 8 valdkonda ja tüüpvead", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Mis on eneseanalüüs?", href: "/vastused/mis-on-haka-eneseanalyys/" },
      { label: "Koolitajale: ametlik raamistik", href: "/koolitajale/" }
    ]
  },
  {
    slug: "mis-on-haka-eneseanalyys",
    question: "Mis on eneseanalüüs ja kas see on kohustuslik?",
    figure: {
      src: "/diagrams/eneseanalyys-vaide-toend.svg",
      alt: "Joonis: eneseanalüüsis muudab väide + konkreetne tõend selle usutavaks — hindaja saab seda kontrollida; üldsõnaline väide ilma tõendita ei loe.",
      caption: "Väide + konkreetne tõend teeb eneseanalüüsi usutavaks; üldsõnaline väide ei loe.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/eneseanalyys-vaide-toend.svg"
    },
    shortAnswer:
      `Eneseanalüüs on hindamise alusdokument, mille asutus ise koostab enne HAKA kvaliteedihindamist — see on kohustuslik osa taotlusest. ` +
      `Selles kirjeldab asutus ise, kuidas ta iga kriteeriumi täidab, ja toob iga väite kohta konkreetse tõendi. ` +
      `Hindamiskomisjon kasutab eneseanalüüsi koos veebilehel avaldatud infoga ja vestlustega, et otsustada, kas asutus vastab nõuetele.`,
    body: [
      `Eneseanalüüs ei ole vabas vormis tutvustus, vaid struktureeritud enesehinnang: asutus käib süstemaatiliselt läbi kõik kaheksa valdkonda ja 27 kriteeriumi ning kirjeldab, kuidas ta neid täidab. Iga väite juures peab olema konkreetne tõend — dokument, näide või protsess —, mitte üldsõnaline kinnitus tüübis „me peame seda oluliseks“.`,
      `Eneseanalüüs on kohustuslik osa taotlusest: ilma selleta ei saa hindamist läbi viia. Praktikas on see ka kõige rohkem aega nõudev ettevalmistuse osa, sest see sunnib asutust oma tegelikku olukorda ausalt kaardistama, mitte ainult marketingikeeles kirjeldama.`,
      `Hindamiskomisjon ei tugine ainult eneseanalüüsile — ta võrdleb seda asutuse veebilehel avaldatud infoga ja täpsustab detaile vestluste käigus. Kui eneseanalüüs, veebileht ja tegelik praktika lähevad lahku, on see levinud parenduskoht: samad numbrid, nimed ja väited peavad kõikjal klappima.`
    ],
    relatedLinks: [
      { label: "Kvaliteedihindamine: 8 valdkonda ja ettevalmistus", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Mida HAKA hindab?", href: "/vastused/mida-haka-mikrokvalifikatsiooni-hindamisel-hindab/" },
      { label: "Levinumad vead hindamiseks valmistumisel", href: "/vastused/haka-mikrokvalifikatsiooni-hindamise-tuupvead/" }
    ]
  },
  {
    slug: "kui-palju-maksab-haka-mikrokvalifikatsiooni-hindamine",
    question: "Kui palju HAKA hindamine ja registreerimine maksavad?",
    figure: {
      src: "/diagrams/haka-hinnad-kaks-tasu.svg",
      alt: "Joonis: kaks eri riigilõivu — suurusjärgus 1450 € õppekavarühma hindamine (kord viie aasta jooksul) ja suurusjärgus 100 € iga õppekava registreerimine EHIS-es.",
      caption: "Suurusjärgu numbrid: hindamine ~1450 € (kord rühma kohta), registreerimine ~100 € (iga õppekava kohta).",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/haka-hinnad-kaks-tasu.svg"
    },
    shortAnswer:
      `Suurusjärgus: õppekavarühma kvaliteedihindamine maksab riigilõivuna umbes 1450 €, ja iga õppekava registreerimine EHIS-es lisaks umbes 100 €. ` +
      `Need on suurusjärgu numbrid, mitte lõplik hinnakiri — täpsed ja ajakohased summad kontrolli alati ametlikust allikast (HAKA, Haridus- ja Teadusministeerium või EHIS). ` +
      `Kvaliteedihindamise tasu kehtib õppekavarühma kohta, seega mitme õppekava lisamine samasse rühma ei tähenda uut hindamistasu — ainult registreerimistasu iga uue õppekava eest.`,
    body: [
      `Kulu jaguneb kaheks: hindamistasu, mille asutus maksab HAKA-le kvaliteedihindamise eest, ja registreerimistasu, mille asutus maksab iga õppekava EHIS-esse kandmisel. Suurusjärgus on kvaliteedihindamine ~1450 € ja iga õppekava registreerimine ~100 €.`,
      `Kuna kvaliteedihindamine tehakse õppekavarühma, mitte üksiku õppekava kohta, tuleb hindamistasu tasuda korra rühma sisenemisel (ja uuesti alles viie aasta möödudes, kui otsust tuleb uuendada). Registreerimistasu tuleb aga iga uue õppekava kohta eraldi, kui lisad rühma järgmisi programme.`,
      `Need summad on suurusjärgu numbrid, mille aluseks on ametlikud allikad meie kvaliteedihindamise juhendi koostamise ajal — riigilõivud võivad ajas muutuda. Enne otsuse tegemist kontrolli kehtivat summat alati HAKA, Haridus- ja Teadusministeeriumi või EHIS ametlikult lehelt.`
    ],
    relatedLinks: [
      { label: "Kvaliteedihindamine: 8 valdkonda ja riigilõivud", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Hinnastamine koolitajale", href: "/koolitajale/hinnastamine/" },
      { label: "Koolitajale: ametlik raamistik", href: "/koolitajale/" }
    ]
  },
  {
    slug: "haka-mikrokvalifikatsiooni-hindamise-tuupvead",
    question: "Millised on levinuimad vead HAKA hindamiseks valmistumisel?",
    figure: {
      src: "/diagrams/haka-tuupvead-kolm.svg",
      alt: "Joonis: kolm kõige sagedasemat viga HAKA hindamiseks valmistumisel — maht ei klapi, dokumendid ei klapi omavahel, väide ilma tõendita.",
      caption: "Kolm sagedasemat lõksu: maht ei klapi, dokumendid ei klapi, väide ilma tõendita.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/haka-tuupvead-kolm.svg"
    },
    shortAnswer:
      `Kõige sagedasemad vead on mahuarvestuse mittevastavus (akadeemilised ja astronoomilised tunnid segamini), dokumendid, mis ei klapi omavahel (õppekava, veebileht ja eneseanalüüs räägivad erinevat juttu), ning üldsõnaline eneseanalüüs ilma konkreetse tõendita. ` +
      `Lisaks langetatakse hindeid sageli sellepärast, et tagasisidet kogutakse, aga ei analüüsita ega kasutata, ja koolitajate pädevus pole avalikult tõendatud. ` +
      `Enamik neist vigadest on ennetatavad — need on pigem korrastamise, mitte sisu puudujäägid.`,
    body: [
      `Mahuarvestuse viga on dokumenteeritult üks levinumaid: 1 EAP = 26 astronoomilist tundi ja 1 akadeemiline tund (45 min) = 0,75 astronoomilist tundi, aga neid ühikuid aetakse sageli segamini või kontaktõpe ja iseseisev töö ei summeeru lõpuks kogumahuks. Kui sama mahunumber ei klapi õppekavas, veebilehel ja eneseanalüüsis, on see kohe nähtav vastuolu.`,
      `Teine sage viga on üldsõnaline, tõendita eneseanalüüs — väited tüübis „me peame seda oluliseks“ ilma konkreetse dokumendi, näite või protsessita, mis väidet toetaks. Samuti langetab hinnet see, kui asutus kogub õppijatelt tagasisidet, aga ei suuda näidata, et see on päriselt analüüsitud ja mingit muudatust esile kutsunud.`,
      `Kolmas korduv puudujääk on koolitajate kompetentsuse nähtavus: haridus, erialane kogemus ja koolituskogemus peavad olema avalikult ja ühtses stiilis kirjas, sama ka külalislektoritel. Kõiki neid vigu saab vältida, kui lukustada mahunumbrid ühte kohta, kontrollida dokumentide sisulist kooskõla ja toetada iga väidet konkreetse tõendiga enne esitamist.`
    ],
    relatedLinks: [
      { label: "Kvaliteedihindamine: täielik juhend ja kontrollnimekiri", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Kuidas arvutada EAP-mahtu õigesti?", href: "/vastused/kuidas-arvutada-oppekava-eap-mahtu/" },
      { label: "Mis on eneseanalüüs?", href: "/vastused/mis-on-haka-eneseanalyys/" }
    ]
  },
  {
    slug: "kuidas-arvutada-oppekava-eap-mahtu",
    question: "Kuidas arvutada õppekava EAP-mahtu õigesti?",
    figure: {
      src: "/diagrams/eap-mahu-arvutus.svg",
      alt: "Joonis: näide EAP-mahu arvutamisest — 208 akadeemilist tundi × 0,75 = 156 astronoomilist tundi; 156 ÷ 26 = 6 EAP.",
      caption: "Näide: 208 akadeemilist tundi × 0,75 = 156 astronoomilist tundi; 156 ÷ 26 = 6 EAP.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/eap-mahu-arvutus.svg"
    },
    shortAnswer:
      `1 EAP (Euroopa ainepunkt) võrdub 26 astronoomilise tunniga õppija tööd; 1 akadeemiline tund (45 minutit) võrdub 0,75 astronoomilise tunniga. ` +
      `Kontaktõppe ja iseseisva töö tunnid tuleb kõigepealt viia samasse ühikusse (astronoomilised tunnid) ja alles siis liita kokku kogumahuks. ` +
      `Sama mahunumber peab kajastuma täht-täheliselt õppekavas, veebilehel ja eneseanalüüsis — see on üks kõige levinumaid vigu hindamiseks valmistumisel.`,
    body: [
      `Esimene samm on kõik ajamahud viia samasse ühikusse. Kui õppekavas on osad tunnid märgitud akadeemiliste tundidena (45 min), teisenda need astronoomilisteks: astronoomilised tunnid = akadeemilised tunnid × 0,75. Alles siis, kui kõik on samas ühikus, saab neid omavahel kokku liita.`,
      `Teine samm on kontaktõppe ja iseseisva töö liitmine kogumahuks. Mõlemad koosseisud (auditoorne töö ja iseseisev töö, näiteks lugemine, ülesanded, praktika) lähevad kokku ühte summasse. Seda summat astronoomilistes tundides jagatakse seejärel 26-ga, et saada EAP-de arv: EAP = kogutunnid ÷ 26.`,
      `Kolmas ja kõige olulisem samm on sisemine kooskõla: lukusta lõplik mahunumber ühte kohta ja kasuta sealt edasi kõikjal — õppekavas, kooli veebilehel ja (kui koostad) eneseanalüüsis. Illustreeriv näide loogikast: 208 akadeemilist tundi × 0,75 = 156 astronoomilist tundi; 156 ÷ 26 = 6 EAP. Sinu programmi tegelikud numbrid tulevad muidugi sinu enda õppekavast.`
    ],
    relatedLinks: [
      { label: "Kvaliteedihindamine: maht ja EAP põhjalikult", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Mis on EAP õppijale?", href: "/vastused/mis-on-eap/" },
      { label: "Levinumad vead hindamiseks valmistumisel", href: "/vastused/haka-mikrokvalifikatsiooni-hindamise-tuupvead/" }
    ]
  },
  {
    slug: "kas-koolitaja-vajab-taiskasvanud-koolitaja-kutset",
    question: "Kas mu koolitajad vajavad täiskasvanud koolitaja kutset?",
    figure: {
      src: "/diagrams/koolitaja-kutse-pole-kohustuslik.svg",
      alt: "Joonis: seaduse järgi ei ole täiskasvanud koolitaja kutse kohustuslik, aga HAKA hindamisel on koolitaja pädevus eraldi valdkond ja kutse on üks tõend paljude seas.",
      caption: "Kutse pole seadusest kohustuslik; HAKA hindab koolitaja pädevust ja kutse on üks võimalik tõend.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/koolitaja-kutse-pole-kohustuslik.svg"
    },
    shortAnswer:
      `Seaduse järgi ei ole täiskasvanud koolitaja kutse kohustuslik. ` +
      `HAKA kvaliteedihindamisel on koolitajate kompetentsus aga eraldi hindamisvaldkond, ja täiskasvanud koolitaja kutse (Andras, EKR tase 5 või 6) on üks tõend, mida hindaja saab arvesse võtta osana koolitaja pädevuse kirjeldusest. ` +
      `Kutse ei asenda erialast kompetentsi ega koolituskogemust — need tuleb samuti eraldi ja avalikult tõendada.`,
    body: [
      `Täiskasvanute koolituse seadus ei nõua otseselt, et iga koolitaja omaks kutsetunnistust. HAKA hindamisel vaadatakse aga eraldi valdkonnana, kas igal koolitajal on tõendatud eriala- ja täiskasvanute koolitaja pädevus ning kas see info on avalik ja ühtses stiilis kirjas — nii oma töötajate kui külalislektorite puhul.`,
      `Täiskasvanud koolitaja kutse (mida annab välja Andras, tasemetel EKR 5 ja EKR 6) on üks võimalik ja tunnustatud viis seda pädevust tõendada, kuna see põhineb riiklikult tunnustatud kutsestandardil. See ei ole ainuvõimalik viis — sama pädevust saab tõendada ka erialase hariduse, dokumenteeritud koolituskogemuse ja tulemuslikkuse hindamise kaudu.`,
      `Oluline on eristada kahte asja: kutsetunnistuse olemasolu on üks tõend paljude seas, mitte automaatne garantii positiivsele hindamisotsusele. Lõpliku hinnangu koolitajate valdkonnale annab HAKA komisjon, lähtudes kõigist esitatud tõenditest tervikuna — kontrolli täpseid nõudeid alati HAKA enda materjalidest.`
    ],
    relatedLinks: [
      { label: "Kvaliteedihindamine: koolitajate kompetentsus", href: "/koolitajale/kvaliteedihindamine/" },
      { label: "Koolitajale: ametlik raamistik", href: "/koolitajale/" },
      { label: "Turule toomine koolitajale", href: "/koolitajale/turule-toomine/" }
    ]
  },
  {
    slug: "credential-commons-vs-ehis",
    question: "Mis vahe on Credential Commonsil ja EHIS-el?",
    figure: {
      src: "/diagrams/ehis-vs-credential-commons.svg",
      alt: "Joonis: EHIS on Eesti riiklik register ja kohustuslik samm; Credential Commons on avatud masinloetav andmestandard, mis täiendab EHIS-t, mitte ei asenda seda.",
      caption: "EHIS on kohustuslik riiklik register; Credential Commons on täiendav masinloetav kiht, mitte asendus.",
      width: 960,
      height: 504,
      stacked: "/diagrams/stacked/ehis-vs-credential-commons.svg"
    },
    shortAnswer:
      `EHIS (Eesti Hariduse Infosüsteem) on Eesti riiklik register, kuhu mikrokvalifikatsiooni õppekavad ja tunnistused ametlikult kantakse. ` +
      `Credential Commons on avatud, masinloetav andmestandard, mille järgi sama sisu saab avaldada nii, et see on loetav ja mõistetav ka väljaspool riiklikku registrit — näiteks AI-abilistele ja kolmandate osapoolte rakendustele. ` +
      `Need kaks täiendavad teineteist: EHIS on ametlik tõeallikas, Credential Commons teeb sama info laiemalt kättesaadavaks ja koostöövõimeliseks.`,
    body: [
      `EHIS on Haridus- ja Teadusministeeriumi hallatav riiklik andmekogu — kui õppekava on seal registreeritud, on see ametlikult kinnitatud ja sellel on riiklik õppekavakood, kinnitatud maht ja õpiväljundid. EHIS-esse registreerimine on mikrokvalifikatsiooni pakkumiseks kohustuslik samm.`,
      `Credential Commons ei ole riiklik register, vaid avatud tehniline standard (Linked Data, JSON-LD), mis kirjeldab, kuidas ühe õppekava või tunnistuse andmed masinloetavalt üles kirjutada. See ei asenda EHIS-t — see on täiendav kiht, mis muudab sama sisu kolmandatele osapooltele (teised koolid, tööandjad, AI-teenused) otse ja koostöövõimeliselt kasutatavaks, ilma et nad peaksid iga saiti eraldi kraapima.`,
      `Praktikas tähendab see: EHIS-registreerimine annab õppekavale ametliku staatuse, Credential Commons annab samale sisule masinloetava kuju, mille abil võivad teised asutused ja rakendused seda kirjet lugeda ja mõista. Mikrokvalifikatsioon.ee avaldab oma kataloogi vastavuskontrolli läbinud kirjed selles standardis — vaata täpsemalt andmestandardi lehelt.`
    ],
    relatedLinks: [
      { label: "Avatud andmestandard (Credential Commons)", href: "/andmestandard/" },
      { label: "Kas mikrokvalifikatsioon on EHIS-es tunnustatud?", href: "/vastused/kas-mikrokvalifikatsioon-on-ehises-tunnustatud/" },
      { label: "Koolitajale: ametlik raamistik", href: "/koolitajale/" }
    ]
  }
];

export const questionBySlug = new Map(questions.map((q) => [q.slug, q]));
