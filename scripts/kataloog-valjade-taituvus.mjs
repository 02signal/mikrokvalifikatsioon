// Kataloogi väljade täituvus pakkujate kaupa + hind €/EAP (turu-luure aruanne,
// amos-ops#1770). Loeb avalikku /catalog.json struktuuri (fail või URL), ei
// kirjuta midagi ega sisalda isikuandmeid.
//
// Kasutus:
//   node scripts/kataloog-valjade-taituvus.mjs https://mikrokvalifikatsioon.ee/catalog.json
//   node scripts/kataloog-valjade-taituvus.mjs path/to/catalog.json
//
// Tühi väärtus = null, undefined, "", [] või {}. Hind €/EAP arvutatakse ainult
// kirjetele, kus priceText sisaldab summat eurodes ja ects on arv.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const FIELDS = [
  "priceText",
  "durationText",
  "intakeText",
  "registrationDeadline",
  "startDate",
  "format",
  "assessmentText",
  "outcomes",
];

const isFilled = (v) =>
  !(v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0));

export function eurPerEap(program) {
  const m = /(\d[\d\s.,]*)\s*(€|eur)/i.exec(program.priceText ?? "");
  const ects = Number(program.ects);
  if (!m || !Number.isFinite(ects) || ects <= 0) return null;
  // "1.200 €" on tuhandeline punkt (1200), "1 200,50 €" ja "99.5 €" on kümnendmärgiga.
  const raw = m[1].trim().replace(/\s/g, "");
  const eur = Number(/^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, "") : raw.replace(",", "."));
  return Number.isFinite(eur) ? eur / ects : null;
}

export function buildReport(catalog) {
  const programs = catalog.programs ?? [];
  const byProvider = new Map();
  for (const p of programs) {
    const key = p.provider ?? "(tundmatu)";
    if (!byProvider.has(key)) byProvider.set(key, []);
    byProvider.get(key).push(p);
  }
  const pct = (list, field) => Math.floor((100 * list.filter((p) => isFilled(p[field])).length) / list.length);
  const providers = [...byProvider.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([provider, list]) => ({
      provider,
      count: list.length,
      coverage: Object.fromEntries(FIELDS.map((f) => [f, pct(list, f)])),
    }));
  const prices = programs.map(eurPerEap).filter((x) => x !== null).sort((a, b) => a - b);
  return {
    count: programs.length,
    providers,
    eurPerEap: prices.length
      ? { n: prices.length, min: prices[0], median: prices[Math.floor(prices.length / 2)], max: prices[prices.length - 1] }
      : null,
  };
}

export function formatReport(report) {
  const lines = [`Programme: ${report.count}`, `provider | n | ${FIELDS.join(" | ")}`];
  for (const p of report.providers) {
    lines.push(`${p.provider} | ${p.count} | ${FIELDS.map((f) => `${p.coverage[f]}%`).join(" | ")}`);
  }
  const e = report.eurPerEap;
  lines.push(e ? `€/EAP (n=${e.n}): min ${e.min.toFixed(0)}, mediaan ${e.median.toFixed(0)}, max ${e.max.toFixed(0)}` : "€/EAP: andmeid pole");
  return lines.join("\n");
}

async function load(src) {
  if (/^https?:\/\//.test(src)) return (await fetch(src)).json();
  return JSON.parse(await readFile(src, "utf8"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = process.argv[2];
  if (!src) {
    console.error("kasutus: node scripts/kataloog-valjade-taituvus.mjs <catalog.json fail või URL>");
    process.exit(2);
  }
  console.log(formatReport(buildReport(await load(src))));
}
