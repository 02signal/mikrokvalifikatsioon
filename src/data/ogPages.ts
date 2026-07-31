// Jagatud OG-kaardi register: SAMA andmestik toidab nii kaardigeneraatorit
// (src/pages/og/[route].ts) kui Seo.astro fallback-otsust.
//
// MIKS ERALDI FAIL: varem elas see register ainult og/[route].ts sees ja
// Seo.astro "arvas", et iga canonicalPath'i viimasele segmendile vastab kaart —
// see ei kehtinud (27 lehte said katkise og:image, vt CLAUDE-agent töölogi).
// Nüüd on üks tõe allikas: kui võti on siin, saab leht PÄRIS kaardi; kui ei,
// kasutab Seo.astro turvalist vaikekaarti (/og-default.png). Uue lehetüübi
// lisamisel REGISTREERI see siin — muidu läheb see vaikimisi vaikekaardile
// (turvaline, aga vähem eristuv).

import { catalog, providersWithSlug, fieldsWithSlug } from "./catalog";
import { plausiblePriceEur } from "./priceGuard";
import { topics } from "./topics";
import { careers } from "./careers";
import { comparisons } from "./comparisons";
import { questions } from "./questions";
import { REGIONS } from "./regions";
import { OCCUPATION_GROUPS } from "./occupations";

export interface OgPageEntry {
  title: string;
  description: string;
  kind?: string;
}

// Sisulehed: võti = canonical-tee viimane segment (Seo.astro tuletab sama võtme).
const contentPages: Record<string, OgPageEntry> = {
  home: {
    title: "Eesti mikrokvalifikatsioonide ja mikrokraadide register",
    description: "Leia oskus, mida tööandjad tunnustavad — ja keegi, kes selle kinni maksab."
  },
  en: {
    title: "Microcredentials & microdegrees in Estonia",
    description: "The independent register: field, ECTS, price and who can fund it. Find a recognised skill."
  },
  kataloog: {
    title: "Kataloog — kõik mikrokvalifikatsioonid ühes kohas",
    description: "Filtreeri valdkonna, kooli ja hinna järgi. Iga programmi juures maht, hind ja link kooli lehele."
  },
  mikrokraadid: {
    title: "Mikrokraadid Eestis",
    description: "Kõikide ülikoolide mikrokraadid ühes kohas — mis need on ja kust neid leida."
  },
  "mis-on-mikrokvalifikatsioon": {
    title: "Mis on mikrokvalifikatsioon?",
    description: "Lihtne selgitus ja võrdlus: mikrokraad, kutsetunnistus ja sertifikaat."
  },
  "kes-maksab": {
    title: "Kes maksab mikrokvalifikatsiooni eest?",
    description: "Kolm rada: Töötukassa, tööandja või ise — ja kuidas igaüht küsida."
  },
  koolitaja: {
    title: "Mikrokraadid koolide kaupa — kõik koolitajad",
    description: "Kõik Eesti mikrokraade ja mikrokvalifikatsioone pakkuvad koolid ühes kohas. Vali kool ja vaata kõiki selle programme."
  },
  koolitajale: {
    title: "Koolitajale — kuidas pakkuda mikrokvalifikatsiooni",
    description: "Ametlik raamistik, sammud pakkujaks saamiseks ja võimalus lisada oma programm registrisse."
  },
  kvaliteedihindamine: {
    title: "Kvaliteedihindamine: 8 valdkonda ja kuidas valmistuda",
    description: "Mida hindaja vaatab, tüüpvead ja praktiline ettevalmistus koolitajale."
  },
  andmed: {
    title: "Eesti mikrokvalifikatsioonide turg andmetes",
    description: "Turukaart ja avaandmed: programmid, pakkujad, valdkonnad, hinnad ja mahud."
  },
  "kuidas-koostame": {
    title: "Kuidas me registrit koostame",
    description: "Metoodika ja sõltumatus: allikad, kontrollkuupäevad, neutraalsus."
  },
  kkk: {
    title: "Korduma kippuvad küsimused",
    description: "Aeg, raha, rahastus, tunnustus ja koolitajale — lühikesed selged vastused."
  },
  vordlus: {
    title: "Programmide võrdlus",
    description: "Võrdle kuni 3 mikrokvalifikatsiooni kõrvuti: hind, maht, kestus, õpiväljundid."
  },
  oskused: {
    title: "Otsi mikrokraadi oskuse järgi",
    description: "Sisesta oskus ja näe kohe, millised programmid selle õpiväljundi annavad."
  },
  registreerimine: {
    title: "Registreerimine ja algusajad",
    description: "Mis on kohe lõppemas ja millal õpingud algavad — planeeri kalendri järgi."
  },
  teema: {
    title: "Mikrokraadid teemade ja oskuste kaupa",
    description: "Leia mikrokvalifikatsioon oskuse järgi — andmeanalüüs, juhtimine, AI, turundus ja muu."
  },
  karjaar: {
    title: "Karjäärirajad: kuidas alustada ja läbi lüüa",
    description: "Portfoolio ja isikuomadused otsustavad — vali roll ja sobiv õpe."
  },
  aastaraport: {
    title: "Eesti mikrokvalifikatsioonide ja mikrokraadide turg",
    description: "Sõltumatu registri turuülevaade arvudes: programmid, koolid, hinnad, mahud."
  },
  privaatsus: {
    title: "Privaatsus ja küpsised",
    description: "Mis andmeid kogume, milleks ja millised on sinu õigused."
  },
  vastused: {
    title: "Vastused mikrokraadi ja mikrokvalifikatsiooni kohta",
    description: "Lühikesed faktivastused: kestus, hind, EAP, pakkujad ja kandideerimine."
  },
  // Allpool lisatud lehed olid varem registreerimata (katkine og:image, vt CLAUDE-
  // agent töölogi). Iga leht on kordumatu, standalone — reaalne kaart tasub ära.
  valdkond: {
    title: "Mikrokraadid valdkondade kaupa",
    description: "Sirvi Eesti mikrokvalifikatsioone ja mikrokraade valdkondade järgi — IT ja andmed, majandus ja juhtimine, tehnika, haridus ja palju muud."
  },
  maakond: {
    title: "Mikrokraadid maakonniti — õpe, tööturg, palk",
    description: "Vali maakond ja vaata kohapealset õpet, veebiõpet, Töötukassa nõudlust ja palgakonteksti."
  },
  ametiruhm: {
    title: "Ametirühmad: tööturu nõudlus ja sobiv õpe",
    description: "Millised ametid on Eestis nõutud? Vali ametirühm ja näe nõudlust, palgakonteksti ja sobivat õpiteed."
  },
  andmestandard: {
    title: "Avatud andmestandard — Credential Commons",
    description: "Vastavuskontrolli läbinud kataloogikirjed on avaldatud avatud, masinloetava standardi järgi (Credential Commons)."
  },
  konto: {
    title: "Minu konto — hoia oma oskuste pakett alles",
    description: "Loo konto: hoiame su valitud oskuste paketi alles ja anname märku, kui sobiv programm või tähtaeg lisandub."
  },
  kinnita: {
    title: "Logime sind sisse — Minu konto",
    description: "Kinnitame su e-posti ja viime su kontole."
  },
  "mikrokraadi-valimine": {
    title: "Mikrokraadi valimine: kuidas valida õige?",
    description: "Otsustusraamistik ja kõik valikud valdkonniti — kuidas valida õige ülikooli mikrokraad, päris Eesti andmetega."
  },
  "mikrokvalifikatsiooni-valimine": {
    title: "Mikrokvalifikatsiooni valimine: kuidas valida õige?",
    description: "Otsustusraamistik ja kõik valikud valdkonniti — kuidas valida õige mikrokvalifikatsioon, päris Eesti andmetega."
  }
};

// Programmilehed: võti = slug, pealkiri = nimi, kirjeldus = pakkuja + maht + hind.
// Hind jäetakse kaardilt VÄLJA, kui plausiblePriceEur peab seda kahtlaseks
// (€/EAP ebausutavalt madal, vt src/data/priceGuard.ts) — jagatav kaart on
// väide, mitte registri sõna-sõnaline peegeldus (see jääb programmi enda lehele).
const programmePages = Object.fromEntries(
  catalog.map((entry) => {
    const priceIsPlausible = plausiblePriceEur(entry) != null;
    const facts = [
      entry.provider,
      entry.ects != null ? `${entry.ects} EAP` : null,
      priceIsPlausible ? entry.priceText : null
    ].filter(Boolean).join(" · ");
    return [entry.slug, { title: entry.name, description: facts }];
  })
);

// Teemalehed: võti = teema slug (ei kattu programmislugidega — teemad on üksiksõnad).
const topicPages = Object.fromEntries(
  topics.map((t) => [t.slug, { title: `${t.label} — mikrokraadid`, description: `${t.entries.length} programmi · õpiväljundid, maht ja hind` }])
);

// Koolilehed: võti = pakkuja slug.
const providerPages = Object.fromEntries(
  providersWithSlug.map((p) => {
    const n = catalog.filter((e) => e.provider === p.provider).length;
    return [p.slug, { title: `${p.provider} — mikrokraadid`, description: `${n} programmi · maht, hind, õpiväljundid` }];
  })
);

// Karjäärilehed: võti = karjääri slug.
const careerPages = Object.fromEntries(
  careers.map((c) => [c.slug, { title: `${c.role} — karjäärirada`, description: `${c.entries.length} programmi · portfoolio + sobiv õpe` }])
);

// Valdkonnalehed: võti = valdkonna slug (individuaalne valdkond, nt "it-ja-andmed").
const fieldPages = Object.fromEntries(
  fieldsWithSlug.map((f) => {
    const n = catalog.filter((e) => e.field === f.field).length;
    const fieldCap = f.field.charAt(0).toUpperCase() + f.field.slice(1);
    return [f.slug, { title: `${fieldCap} — mikrokraadid`, description: `${n} programmi · maht, hind, õppevorm` }];
  })
);

// Võrdluslehed: võti = paari slug — annab igale pSEO X-vs-Y lehele oma kaardi (mitte ühe geneerilise).
const comparisonPages = Object.fromEntries(
  comparisons.map((c) => [c.pair, { title: `${c.a.name} vs ${c.b.name}`, description: `${c.a.field} · ${c.a.provider} vs ${c.b.provider}` }])
);

// Vastuselehed (GEO): võti = küsimuse slug; pealkiri = küsimus, kirjeldus = lühivastuse esimene lause.
const questionPages = Object.fromEntries(
  questions.map((q) => [q.slug, { title: q.question, description: `${q.shortAnswer.split(". ")[0]}.` }])
);

// Maakonnalehed: võti = maakonna slug (/maakond/<slug>/). "maakond" (indeks) on
// contentPages sees, siin ainult 15 üksikmaakonda.
const regionPages = Object.fromEntries(
  REGIONS.map((r) => [r.slug, { title: `${r.formalName} — õpe, tööturg, palk`, description: `Õppimisvõimalused, Töötukassa nõudlus ja palgakontekst ${r.name} kohta.` }])
);

// Ametirühmalehed: võti = rühma slug (/ametiruhm/<slug>/). "ametiruhm" (indeks)
// on contentPages sees, siin ainult 4 üksikrühma.
const occupationPages = Object.fromEntries(
  OCCUPATION_GROUPS.map((g) => [g.slug, { title: `${g.label} — tööturu nõudlus ja õpe`, description: g.blurb }])
);

// Per-lehetüüp aktsentvärv — kaart eristub tüübi kaupa (register/programm/teema/…),
// jäädes brändi-perekonda. Aktsent värvib nii alaserva kui gradiendi põhja.
export const ACCENT: Record<string, [number, number, number]> = {
  content: [84, 194, 71],     // brändi-roheline — register / sisu
  programme: [56, 178, 172],  // teal — üks programm
  topic: [66, 153, 225],      // sinine — teema / oskus
  field: [128, 90, 213],      // violett — valdkond
  career: [221, 158, 55],     // merevaik — karjäär
  provider: [120, 134, 156],  // slate — koolitaja
  comparison: [214, 98, 140], // roosa — võrdlus
  question: [72, 187, 205],   // tsüaan — vastus (GEO)
  region: [58, 143, 117],     // rohekas-teal — maakond
  occupation: [176, 128, 52]  // pruunikas-merevaik — ametirühm
};

// Lisa igale lehe-kirjele tüübi-märgend (kind), ilma iga kirjet eraldi muutmata.
const tag = <T extends Record<string, OgPageEntry>>(map: T, kind: string): Record<string, OgPageEntry> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { ...v, kind }]));

// ÜKS TÕE ALLIKAS: og/[route].ts genereerib kaardi iga siin oleva võtme jaoks;
// Seo.astro kasutab `/og/<key>.png` AINULT kui võti on selles registris, muidu
// langeb tagasi /og-default.png peale (vt Seo.astro `hasOgCard`).
export const ogPages: Record<string, OgPageEntry> = {
  ...tag(contentPages, "content"),
  ...tag(programmePages, "programme"),
  ...tag(topicPages, "topic"),
  ...tag(providerPages, "provider"),
  ...tag(careerPages, "career"),
  ...tag(fieldPages, "field"),
  ...tag(comparisonPages, "comparison"),
  ...tag(questionPages, "question"),
  ...tag(regionPages, "region"),
  ...tag(occupationPages, "occupation")
};
