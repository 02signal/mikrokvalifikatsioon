import { OGImageRoute } from "astro-og-canvas";
import { catalog, providersWithSlug, fieldsWithSlug } from "../../data/catalog";
import { topics } from "../../data/topics";
import { careers } from "../../data/careers";
import { comparisons } from "../../data/comparisons";
import { questions } from "../../data/questions";

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
  },
  vastused: {
    title: "Vastused mikrokraadi ja mikrokvalifikatsiooni kohta",
    description: "Lühikesed faktivastused: kestus, hind, EAP, pakkujad ja kandideerimine."
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

// Valdkonnalehed: võti = valdkonna slug (varem registreerimata → katkine OG igal /valdkond/ lehel).
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

// Per-lehetüüp aktsentvärv — kaart eristub tüübi kaupa (register/programm/teema/…),
// jäädes brändi-perekonda. Aktsent värvib nii alaserva kui gradiendi põhja.
const ACCENT: Record<string, [number, number, number]> = {
  content: [84, 194, 71],     // brändi-roheline — register / sisu
  programme: [56, 178, 172],  // teal — üks programm
  topic: [66, 153, 225],      // sinine — teema / oskus
  field: [128, 90, 213],      // violett — valdkond
  career: [221, 158, 55],     // merevaik — karjäär
  provider: [120, 134, 156],  // slate — koolitaja
  comparison: [214, 98, 140], // roosa — võrdlus
  question: [72, 187, 205]    // tsüaan — vastus (GEO)
};
// Gradiendi tume põhi: aktsendist tuletatud, et kaart oleks ühtne.
const tint = ([r, g, b]: [number, number, number]): [number, number, number] =>
  [Math.round(r * 0.2) + 12, Math.round(g * 0.2) + 12, Math.round(b * 0.2) + 10];
// Lisa igale lehe-kirjele tüübi-märgend (kind), ilma iga kirjet eraldi muutmata.
const tag = <T extends Record<string, { title: string; description: string }>>(map: T, kind: string) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { ...v, kind }]));

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages: {
    ...tag(contentPages, "content"),
    ...tag(programmePages, "programme"),
    ...tag(topicPages, "topic"),
    ...tag(providerPages, "provider"),
    ...tag(careerPages, "career"),
    ...tag(fieldPages, "field"),
    ...tag(comparisonPages, "comparison"),
    ...tag(questionPages, "question")
  },
  getImageOptions: (_path: string, page: { title: string; description: string; kind?: string }) => {
    const accent = ACCENT[page.kind ?? "content"] ?? ACCENT.content;
    return {
      title: page.title,
      description: page.description,
      logo: { path: "./public/mk-logo-white.png", size: [264] },
      bgImage: {
        path: "./public/og-bg.png",
        fit: "cover" as const,
        position: "center" as const
      },
      border: { color: accent, width: 18, side: "block-end" as const },
      padding: 84,
      font: {
        title: { color: [255, 255, 255] as [number, number, number], weight: "Bold" as const, size: 60, lineHeight: 1.2 },
        description: { color: [206, 214, 206] as [number, number, number], size: 30, lineHeight: 1.42 }
      }
    };
  }
});
