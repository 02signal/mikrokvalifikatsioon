import { catalog } from "./catalog";

// Programmaatilised teema-/oskusemaandumislehed (pSEO).
// Kureeritud mõistekaart: iga teema seob otsingusõna(d) andmete vastu. Leht tekib
// ainult kui katet on (>=MIN_MATCHES programmi) — nii väldime "õhukesi" lehti.
//
// match[]  = väiketähelised tüved (eesti + inglise), mille substring-vaste programmi
//            tekstis (nimi + kokkuvõte + eesmärk + õpiväljundid + valdkond) loeb katteks.
// synonyms = inimloetavad sünonüümid, mis kuvatakse lehel (et leht vastaks ka neile
//            otsingutele) — üks mõiste = üks leht, variandid mainitud sees.

export interface TopicDef {
  slug: string;
  label: string;
  synonyms: string[];
  match: string[];
  blurb?: string;
}

export const MIN_MATCHES = 3;

export const TOPIC_DEFS: TopicDef[] = [
  { slug: "andmeanaluus", label: "Andmeanalüüs", synonyms: ["andmeteadus", "andmeanalüütik", "statistika", "data analytics"], match: ["andmeanal", "andmeteadus", "andmete analüüs", "data analy", "data scien", "analüütik", "statisti", "power bi", "visualiseeri andmeid"] },
  { slug: "tehisintellekt", label: "Tehisintellekt (AI)", synonyms: ["AI", "masinõpe", "generatiivne tehisintellekt", "machine learning"], match: ["tehisintellekt", "tehisaru", "masinõpe", "machine learning", "artificial intel", "generatiiv", "tehisnärvi", "neurovõr"] },
  { slug: "projektijuhtimine", label: "Projektijuhtimine", synonyms: ["project management", "agiilne juhtimine", "scrum"], match: ["projektijuh", "projekti juht", "project manag", "agiil", "scrum"] },
  { slug: "juhtimine", label: "Juhtimine ja eestvedamine", synonyms: ["leadership", "eestvedamine", "liidrioskused"], match: ["juhtimi", "eestvedami", "leadership", "liidri", "meeskonna juht"] },
  { slug: "raamatupidamine", label: "Raamatupidamine ja finants", synonyms: ["accounting", "maksundus", "arvestus", "finantsjuhtimine"], match: ["raamatupida", "finants", "maksund", "arvestus", "accounting", "eelarve"] },
  { slug: "turundus", label: "Turundus", synonyms: ["marketing", "digiturundus", "bränding", "sisuturundus"], match: ["turund", "marketing", "bränd", "reklaam", "sotsiaalmeedia"] },
  { slug: "muuk", label: "Müük ja kliendisuhted", synonyms: ["sales", "kliendihaldus", "läbirääkimised"], match: ["müügi", "müük", "sales", "kliendisuh", "kliendihald", "läbirääki"] },
  { slug: "personalijuhtimine", label: "Personalijuhtimine (HR)", synonyms: ["HR", "värbamine", "talendijuhtimine", "human resources"], match: ["personalijuh", "personali juht", "värbami", "human resource", "töösuhe", "talendijuh"] },
  { slug: "kuberturve", label: "Küberturve ja infoturve", synonyms: ["cybersecurity", "infoturve", "andmekaitse", "GDPR"], match: ["küberturve", "küberturbe", "infoturve", "infoturbe", "cyber", "andmekaitse", "gdpr"] },
  { slug: "programmeerimine", label: "Programmeerimine ja tarkvaraarendus", synonyms: ["coding", "tarkvaraarendus", "veebiarendus", "Python"], match: ["programmeeri", "tarkvaraaren", "tarkvara aren", "veebiaren", "full-stack", "arendaja", "pythoni"] },
  { slug: "haridus", label: "Õpetaja ja haridus", synonyms: ["pedagoogika", "õpetajakoolitus", "didaktika"], match: ["õpetaj", "pedagoog", "didaktik", "kasvataja", "haridusvald"] },
  { slug: "haridustehnoloogia", label: "Haridustehnoloogia ja e-õpe", synonyms: ["e-õpe", "digiõpe", "õpidisain"], match: ["haridustehnoloog", "e-õpe", "e-õppe", "digiõpe", "õpidisain"] },
  { slug: "tervishoid", label: "Tervishoid ja hooldus", synonyms: ["tervis", "õendus", "hooldustöö"], match: ["tervishoid", "tervisedend", "hooldus", "õendus", "meditsiin", "patsiendi"] },
  { slug: "kestlikkus", label: "Kestlikkus ja rohepööre", synonyms: ["jätkusuutlikkus", "rohepööre", "ESG", "ringmajandus"], match: ["kestlik", "jätkusuutlik", "rohepööre", "rohepöörde", "ringmajandus", "sustainab", "kliimamuut"] },
  { slug: "ettevotlus", label: "Ettevõtlus ja äriarendus", synonyms: ["entrepreneurship", "äriarendus", "startup", "ärimudel"], match: ["ettevõtl", "äriaren", "äri aren", "startup", "start-up", "äriplaan", "ärimudel"] },
  { slug: "oigus", label: "Õigus ja juriidika", synonyms: ["juriidika", "lepinguõigus", "legal"], match: ["õigus", "juriidi", "lepingu", "seadusand"] },
  { slug: "psuhholoogia", label: "Psühholoogia ja nõustamine", synonyms: ["coaching", "nõustamine", "mentorlus", "supervisioon"], match: ["psühholoog", "nõustami", "coaching", "supervisioon", "mentorl"] },
  { slug: "logistika", label: "Logistika ja tarneahel", synonyms: ["supply chain", "tarneahel", "transport"], match: ["logistika", "tarneahel", "supply chain", "varustus"] },
  { slug: "kvaliteedijuhtimine", label: "Kvaliteedijuhtimine", synonyms: ["lean", "kvaliteet", "auditeerimine"], match: ["kvaliteedijuh", "kvaliteedi juht", "lean", "auditeeri"] },
  { slug: "disain", label: "Disain ja kasutajakogemus", synonyms: ["UX", "UI", "kasutajakogemus"], match: ["disain", "kasutajakogemus", "ux-", "ux ", "design"] },
  { slug: "kommunikatsioon", label: "Suhtlus ja kommunikatsioon", synonyms: ["kommunikatsioon", "suhtekorraldus", "esinemine"], match: ["kommunikatsioon", "suhtekorraldus", "esinemis", "meediasuhe", "communication"] },
  { slug: "tootmine", label: "Tootmine ja inseneeria", synonyms: ["tootmine", "inseneeria", "automaatika"], match: ["tootmi", "insener", "masinaehit", "automaatika", "mehhatroonika", "engineering"] },
  { slug: "turism", label: "Turism ja toitlustus", synonyms: ["turism", "toitlustus", "hospitality"], match: ["turism", "toitlustus", "hotelli", "hospitality"] },
  { slug: "avalik-haldus", label: "Avalik haldus", synonyms: ["riigihaldus", "public administration"], match: ["avalik haldus", "avaliku halduse", "riigihald", "public administration"] },
  { slug: "digioskused", label: "Digioskused", synonyms: ["digipädevus", "arvutioskus", "digitaalsed oskused"], match: ["digioskus", "digipäde", "digitaalsed oskus", "arvutioskus", "exceli"] },
  { slug: "sotsiaaltoo", label: "Sotsiaaltöö ja hoolekanne", synonyms: ["sotsiaaltöö", "hoolekanne", "social work"], match: ["sotsiaaltöö", "sotsiaalhoolekanne", "sotsiaaltöötaja", "social work"] },
  { slug: "keeled", label: "Keeled ja keeleõpe", synonyms: ["keeleõpe", "inglise keel", "erialakeel"], match: ["keeleõpe", "inglise keel", "erialane keel", "erialakeel"] },
  { slug: "robootika", label: "Robootika ja automaatika", synonyms: ["robotics", "automaatika"], match: ["robootika", "roboti", "robot "] }
];

type Entry = (typeof catalog)[number];

function blob(e: Entry): string {
  return [e.name, e.summary, e.goalText, e.field, ...(e.outcomes ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export interface Topic extends TopicDef {
  entries: Entry[];
}

// Ehita teemad: seo iga teema vastavate programmidega, jäta alles vaid katvad teemad.
export const topics: Topic[] = TOPIC_DEFS.map((def) => {
  const entries = catalog.filter((e) => {
    const b = blob(e);
    return def.match.some((m) => b.includes(m));
  });
  return { ...def, entries };
})
  .filter((t) => t.entries.length >= MIN_MATCHES)
  .sort((a, b) => b.entries.length - a.entries.length);

export const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

// Õpiväljundid, mis sisaldavad teema otsingusõna — "õpiväljundite järgi" vaade lehel.
export function topicOutcomes(t: Topic): { text: string; slug: string; name: string }[] {
  const out: { text: string; slug: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const e of t.entries) {
    for (const o of e.outcomes ?? []) {
      const lo = o.toLowerCase();
      if (!t.match.some((m) => lo.includes(m))) continue;
      const key = lo.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text: o.trim(), slug: e.slug, name: e.name });
    }
  }
  return out;
}
