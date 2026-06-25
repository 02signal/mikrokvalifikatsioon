// Andmepõhine "vastused" (GEO) generaator: lühike AI-tsiteeritav faktivastus
// kõrge kavatsusega Eesti otsingupäringutele. Iga kirje lühivastus (shortAnswer)
// on 1–3 väljavõetavat lauset; andmepõhised vastused arvutatakse REAALSEST
// kataloogist build-ajal (kestus, hind, EAP-jaotus, pakkujad, programmide arv).
// Ei dubleeri /kkk, /mis-on-mikrokvalifikatsioon ega /kes-maksab lehti — need
// katavad sissejuhatuse ja rahastuse; siin on üksikküsimuste faktilehed.
import { catalog, providers, catalogUpdatedAt } from "../catalog";
import { parsePriceEur } from "../courseSchema";

export type QuestionEntry = {
  /** URL-segment: /vastused/<slug>/ — püsiv aadress, ära muuda hooletult. */
  slug: string;
  /** H1 ja JSON-LD Question.name — täpne loomulik otsingupäring. */
  question: string;
  /** 1–3 väljavõetavat lauset; kuvatakse rasvaselt esimesena (AI-tsiteeritav). */
  shortAnswer: string;
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

const prices = catalog
  .map((e) => parsePriceEur(e.priceText))
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

// ---------------------------------------------------------------------------
// Eksporditavad andmed lehtede jaoks (et /vastused/index ja [slug] saaks tabelid)
// ---------------------------------------------------------------------------

export const questionStats = {
  programmeCount,
  providerCount,
  universityCount,
  universities,
  otherProviders,
  providerRows,
  ects: { min: ectsMin, max: ectsMax, median: ectsMedian, buckets: ectsBuckets, commonBucket: ectsCommonBucket },
  price: { min: priceMin, max: priceMax, median: priceMedian, p25: priceP25, p75: priceP75, withPrice: prices.length },
  hours: { lo: hoursLo, hi: hoursHi },
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
      `Eestis pakuvad mikrokraade ${providerCount} kõrgkooli ja koolitajat: ${etList(providerRows.slice(0, 5).map((r) => r.provider))} ja teised. ` +
      `Suurim valik on Tartu Ülikoolis ja TalTechis. ` +
      `Meie register koondab ${programmeCount} programmi nendest ${providerCount} pakkujast — kõik ühes filtreeritavas kataloogis.`,
    body: [
      `Mikrokraade ja mikrokvalifikatsioone pakuvad Eestis nii avalik-õiguslikud ülikoolid kui rakenduskõrgkoolid ja erakoolid. Meie registris on praegu ${programmeCount} programmi ${providerCount} pakkujalt.`,
      `Pakkujad programmide arvu järgi: ${providerRows.map((r) => `${r.provider} — ${r.count} programmi`).join("; ")}.`,
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
  }
];

export const questionBySlug = new Map(questions.map((q) => [q.slug, q]));
