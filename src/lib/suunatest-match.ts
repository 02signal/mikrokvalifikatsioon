// Suunatesti sobitamisloogika (puhas moodul: ei impordi andmemoodulit ega puutu DOM-i).
//
// HTM tähelepanek 08.10.2026: valdkonna valik (nt "haridus") pakkus ebaseotud programme. Põhjused (tõendatud):
//  1. valdkonna filter oli ainult meie 10-väärtuseline kureeritud `field`, mis on liiga jäme: "haridus" sisaldas
//     aiandust, elektrienergiat jm;
//  2. skoor ei vaadanud teemat (kõik valdkonnas +3, järjekorra tegid hinna/keele boonused);
//  3. tühja valdkonna korral täideti tulemus suvaliste programmidega ja pealkiri väitis "sinu valdkonnas";
//  4. tühi eelarve loeti "loodan toetusele" ja tasuta programmid said boonuse, eelarvet ei rakendatud filtrina.
//
// Reeglid siin: TEEMA ON VÄRAV (EHIS-i õppekavarühm esimesena, kureeritud valdkond ainult siis, kui EHIS-i rühma
// pole), logistika (keel, hind, vastuvõtt) on ainult järjestus. Kui teema ei sobi, ütleme seda ausalt, mitte
// ei täida tulemust. Järjestus on deterministlik (viimane võti on slug/nimi).

export type MatchProgram = {
  slug?: string;
  name: string;
  provider: string;
  url: string;
  field: string;
  ects: number | null;
  priceText: string | null;
  format: string | null;
  language: string | null;
  intakeText: string | null;
  summary: string;
  publicBasis?: string;
  ehis?: { fieldCode?: string | null; fieldName?: string | null; authoritative?: boolean } | null;
};

export type Answers = { field: string; format: string; budget: string };

/**
 * Vormi valdkond -> EHIS-i õppekavarühma (ISCED-F 2013) koodiprefiksid. EHIS `fieldCode` on 4-kohaline
 * ("0215"). Toimetuslik valik, mida omanik võib muuta: psühholoogia (0313) on "terviseteadus" all,
 * kunstid (0211-0215) on "disain ja loovus". "muu" = kõik, mida ükski teine rida ei kata.
 */
export const FIELD_ISCED: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "IT ja andmed": ["06"],
  "majandus ja juhtimine": ["0311", "041"],
  "haridus": ["01"],
  "tehnika ja tootmine": ["07"],
  "ehitus": ["0731", "0732"],
  "energeetika": ["0713"],
  "terviseteadus": ["09", "0313"],
  "disain ja loovus": ["0211", "0212", "0213", "0214", "0215"],
  "õigus": ["042"]
});

export const FIELD_OTHER = "muu";

const codeOf = (p: MatchProgram): string | null => {
  const code = p.ehis?.fieldCode;
  return typeof code === "string" && /^\d{3,4}$/.test(code.trim()) ? code.trim() : null;
};

const matchesPrefixes = (code: string, prefixes: readonly string[]): boolean => prefixes.some((prefix) => code.startsWith(prefix));

/**
 * Teemaskoor: 5 = EHIS-i õppekavarühm sobib; 2 = EHIS-i rühma pole ja kureeritud valdkond sobib;
 * 0 = ei sobi (programm välistatakse). EHIS-i rühm, mis EI sobi, välistab ka siis, kui kureeritud valdkond
 * kattub (see parandab "haridus" alla sattunud aianduse jms).
 */
export function topicScore(p: MatchProgram, field: string): number {
  if (!field) return 1;
  const code = codeOf(p);
  if (code) {
    if (field === FIELD_OTHER) {
      return Object.values(FIELD_ISCED).some((prefixes) => matchesPrefixes(code, prefixes)) ? 0 : 5;
    }
    const prefixes = FIELD_ISCED[field];
    return prefixes && matchesPrefixes(code, prefixes) ? 5 : 0;
  }
  return p.field === field ? 2 : 0;
}

/**
 * Hind eurodes hinnatekstist: esimene number ("1 175–1 305 €" -> 1175; "1 200 € (sihtrühmale tasuta)" -> 1200).
 * "Tasuta" = 0 AINULT siis, kui tekst on lihtsalt "tasuta". Number puudub ja "tasuta" esineb osana ("sihtrühmale
 * tasuta (EL-i kaasrahastusel)") = hind teadmata (null): see EI tähenda tasuta kõigile.
 */
export function parsePriceEur(text: string | null | undefined): number | null {
  if (!text) return null;
  const digits = text.replace(/[\s\u00a0\u202f]/g, "").match(/\d+/);
  if (digits) return Number(digits[0]);
  return /^\s*tasuta\s*$/i.test(text) ? 0 : null;
}

export type Scored = { p: MatchProgram; topic: number; logistics: number; price: number | null };

export type MatchResult = {
  /** "any" = valdkonda pole valitud; "good" = on sobivaid; "none" = teema ei sobi ühegi programmiga;
   *  "none-filtered" = teema sobib, aga vorm/eelarve välistas kõik. */
  kind: "any" | "good" | "none" | "none-filtered";
  matches: Scored[];
  /** Mitu programmi sobis teemaga enne vormi/eelarve filtreid. */
  topicalCount: number;
};

const byRank = (a: Scored, b: Scored): number =>
  b.topic - a.topic ||
  b.logistics - a.logistics ||
  String(a.p.slug ?? a.p.name).localeCompare(String(b.p.slug ?? b.p.name), "et");

/**
 * Sobita programmid vastustega. Vorm "veebis" välistab ainult selgelt kohapealsed; "ka kohapeal" on piiranguta.
 * Eelarve "kuni X" välistab teadaoleva hinnaga programmid, mis on kallimad; tundmatu hind jääb (märgitud kaardil);
 * tühi eelarve, "üle 2 000 €" ja "loodan toetusele või tööandjale" ei filtreeri ega anna boonust.
 */
export function matchProgrammes(programs: readonly MatchProgram[], answers: Answers, limit = 3): MatchResult {
  const field = answers.field;
  const budget = Number(answers.budget || 0);
  const capped = budget > 0 && budget < 99999 ? budget : 0;

  const topical = programs
    .map((p) => ({ p, topic: topicScore(p, field) }))
    .filter((s) => s.topic > 0);

  const scored: Scored[] = topical
    .filter(({ p }) => !(answers.format === "veebis" && p.format === "kohapeal"))
    .map(({ p, topic }) => {
      const price = parsePriceEur(p.priceText);
      return { p, topic, price, logistics: (p.language === "et" ? 1 : 0) + (price !== null ? 1 : 0) + (p.intakeText ? 1 : 0) };
    })
    .filter((s) => !(capped && s.price !== null && s.price > capped))
    .sort(byRank);

  if (!scored.length) {
    return { kind: field && !topical.length ? "none" : "none-filtered", matches: [], topicalCount: topical.length };
  }
  return { kind: field ? "good" : "any", matches: scored.slice(0, limit), topicalCount: topical.length };
}
