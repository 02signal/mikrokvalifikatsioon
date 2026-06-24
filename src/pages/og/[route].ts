import { OGImageRoute } from "astro-og-canvas";
import { catalog, providersWithSlug } from "../../data/catalog";
import { topics } from "../../data/topics";
import { careers } from "../../data/careers";

// Sisulehed: võti = canonical-tee viimane segment (Seo.astro tuletab sama võtme).
const contentPages: Record<string, { title: string; description: string }> = {
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
  }
};

// Programmilehed: võti = slug, pealkiri = nimi, kirjeldus = pakkuja + maht + hind.
const programmePages = Object.fromEntries(
  catalog.map((entry) => {
    const facts = [
      entry.provider,
      entry.ects != null ? `${entry.ects} EAP` : null,
      entry.priceText
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

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages: { ...contentPages, ...programmePages, ...topicPages, ...providerPages, ...careerPages },
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    logo: { path: "./public/mk-logo-white.png", size: [300] },
    bgGradient: [
      [27, 27, 27],
      [33, 51, 26]
    ],
    border: { color: [84, 194, 71], width: 16, side: "block-end" },
    padding: 80,
    font: {
      title: { color: [255, 255, 255], weight: "Bold", size: 58, lineHeight: 1.25 },
      description: { color: [205, 215, 200], size: 30, lineHeight: 1.4 }
    }
  })
});
