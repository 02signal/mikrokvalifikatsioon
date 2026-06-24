import { catalog } from "./catalog";

// Karjäärilehed (#3). Iga karjäär seob rolli kataloogi programmidega ja tõstab esile
// "portfoolio-sõbralikud" programmid (kus saab teha päris töid / praktilise väljundi).
// Tööturu-andmed (avatud kohad, palk) tulevad hiljem AMOS labor-feedist — siin numbreid
// EI mõtle välja. Embargo-ohutu: ei nimeta ega vihja EVK enda programmile.

type Entry = (typeof catalog)[number];

export interface CareerDef {
  slug: string;
  role: string;
  intro: string;
  match: string[];
}

export const CAREER_DEFS: CareerDef[] = [
  { slug: "andmeanaluutik", role: "Andmeanalüütik", intro: "Andmeanalüütik kogub, korrastab ja tõlgendab andmeid, et ettevõte saaks paremaid otsuseid.", match: ["andmeanal", "andmeteadus", "data analy", "analüütik", "statisti", "power bi", "visualiseeri andmeid"] },
  { slug: "tarkvaraarendaja", role: "Tarkvaraarendaja", intro: "Tarkvaraarendaja ehitab ja hooldab rakendusi ning veebilahendusi.", match: ["programmeeri", "tarkvaraaren", "veebiaren", "arendaja", "full-stack", "pythoni", "tarkvara aren"] },
  { slug: "projektijuht", role: "Projektijuht", intro: "Projektijuht viib projekti algusest lõpuni: plaan, meeskond, eelarve, tähtajad.", match: ["projektijuh", "projekti juht", "agiil", "scrum", "project manag"] },
  { slug: "raamatupidaja", role: "Raamatupidaja", intro: "Raamatupidaja hoiab ettevõtte arvepidamise korras ja aruanded õiged.", match: ["raamatupida", "arvestus", "maksund", "accounting", "finantsarvestus"] },
  { slug: "turundusspetsialist", role: "Turundusspetsialist", intro: "Turundusspetsialist toob kliendid kohale ja kasvatab brändi.", match: ["turund", "marketing", "bränd", "sotsiaalmeedia", "sisuturund", "reklaam"] },
  { slug: "personalijuht", role: "Personalijuht (HR)", intro: "Personalijuht hoolitseb värbamise, töösuhete ja inimeste arengu eest.", match: ["personalijuh", "personali juht", "värbami", "töösuhe", "talendijuh", "human resource"] },
  { slug: "kuberturve", role: "Küberturbe spetsialist", intro: "Küberturbe spetsialist kaitseb ettevõtte andmeid ja süsteeme.", match: ["küberturve", "küberturbe", "infoturve", "infoturbe", "cyber", "andmekaitse"] },
  { slug: "ux-disainer", role: "UX-disainer", intro: "UX-disainer teeb toote kasutajale lihtsaks, selgeks ja meeldivaks.", match: ["kasutajakogemus", "ux", "kasutajaliides", "teenusedisain", "disain"] }
];

function blob(e: Entry): string {
  return [e.name, e.summary, e.goalText, e.assessmentText, e.field, ...(e.outcomes ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// Portfoolio-sõbralik = programm, kus saab teha päris töid / praktilise väljundi.
const PORTFOLIO_RE = /portfoolio|portfolio|praktilis|päris projekt|reaalse?\s*projekt|oma töö|praktiline töö|töönäidis|päristöö/;
export function isPortfolioFriendly(e: Entry): boolean {
  return PORTFOLIO_RE.test(blob(e));
}

export interface Career extends CareerDef {
  entries: Entry[];
  portfolio: Entry[];
}

export const careers: Career[] = CAREER_DEFS.map((def) => {
  const entries = catalog.filter((e) => {
    const b = blob(e);
    return def.match.some((m) => b.includes(m));
  });
  const portfolio = entries.filter(isPortfolioFriendly);
  return { ...def, entries, portfolio };
}).filter((c) => c.entries.length >= 1);

export const careerBySlug = new Map(careers.map((c) => [c.slug, c]));
