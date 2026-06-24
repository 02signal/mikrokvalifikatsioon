// Generate docs/ehis-facts-merge-report.md from the deterministic matcher.
// For owner review: per matched catalog entry, where EHIS DIFFERS from the current
// display (name, EAP, field) — so the owner can later approve a full override —
// plus match stats (exact/strong/none breakdown).
//
// Plain node cannot import the TypeScript data layer directly, so this script mirrors
// the same normalization + provider-alias + match rules as src/data/ehisFacts/index.ts.
// Kept in deliberate lockstep with that module.
//
// Usage: node scripts/build-ehis-merge-report.mjs [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "src", "data");
const OUT = join(HERE, "..", "docs", "ehis-facts-merge-report.md");

const snapshot = JSON.parse(readFileSync(join(DATA, "ehisFacts", "snapshot.json"), "utf8"));
const catalog = [
  ...JSON.parse(readFileSync(join(DATA, "catalog", "taltech.json"), "utf8")),
  ...JSON.parse(readFileSync(join(DATA, "catalog", "tartu-ylikool.json"), "utf8")),
  ...JSON.parse(readFileSync(join(DATA, "catalog", "muud-koolid.json"), "utf8")),
];

// ---- mirror of index.ts matching rules (keep in lockstep) ----
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const PROVIDER_ALIASES = {
  TalTech: ["Tallinna Tehnikaülikool"],
  EBS: ["Estonian Business School"],
};
function ehisProviderLabels(p) {
  return [p, ...(PROVIDER_ALIASES[p] ?? [])];
}
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
const BY_PROVIDER = new Map();
for (const c of snapshot.curricula) {
  const k = norm(c.provider);
  (BY_PROVIDER.get(k) ?? BY_PROVIDER.set(k, []).get(k)).push(c);
}
function matchForCatalogEntry(entry) {
  const candidates = [];
  for (const label of ehisProviderLabels(entry.provider)) {
    const list = BY_PROVIDER.get(norm(label));
    if (list) candidates.push(...list);
  }
  if (!candidates.length) return { confidence: "none", curriculum: null };
  const target = norm(entry.name);
  if (!target) return { confidence: "none", curriculum: null };
  const exact = candidates.filter((c) => norm(c.name_et) === target || (c.name_en != null && norm(c.name_en) === target));
  if (exact.length === 1) return { confidence: "exact", curriculum: exact[0] };
  if (exact.length > 1) return { confidence: "none", curriculum: null };
  let best = null, bestDist = Infinity, bestContains = false;
  for (const c of candidates) {
    const names = [norm(c.name_et), ...(c.name_en != null ? [norm(c.name_en)] : [])].filter(Boolean);
    for (const cn of names) {
      const contains = cn.includes(target) || target.includes(cn);
      const dist = levenshtein(cn, target);
      if (dist < bestDist || (dist === bestDist && contains && !bestContains)) {
        bestDist = dist; best = c; bestContains = contains;
      }
    }
  }
  if (best) {
    const maxLen = Math.max(target.length, norm(best.name_et).length);
    const ratio = bestDist / Math.max(maxLen, 1);
    const within = ratio <= 0.12 || (bestContains && bestDist <= Math.ceil(maxLen * 0.25));
    if (within) {
      const tie = candidates.filter((c) => {
        const names = [norm(c.name_et), ...(c.name_en != null ? [norm(c.name_en)] : [])];
        return names.some((cn) => cn && cn !== norm(best.name_et) && levenshtein(cn, target) === bestDist);
      });
      if (!tie.length) return { confidence: "strong", curriculum: best };
    }
  }
  return { confidence: "none", curriculum: null };
}

// ---- run + report ----
const rows = [];
const stats = { exact: 0, strong: 0, none: 0 };
for (const entry of catalog) {
  const m = matchForCatalogEntry(entry);
  stats[m.confidence]++;
  if (m.curriculum) {
    rows.push({ entry, ehis: m.curriculum, confidence: m.confidence });
  }
}

const fieldEq = (a, b) => norm(a) === norm(b);
const diffRows = rows.filter((r) => {
  const nameDiff = norm(r.entry.name) !== norm(r.ehis.name_et);
  const eapDiff = r.entry.ects != null && r.ehis.eap != null && r.entry.ects !== r.ehis.eap;
  const fieldDiff = !fieldEq(r.entry.field, r.ehis.field_name ?? "");
  return nameDiff || eapDiff || fieldDiff;
});

const esc = (s) => String(s ?? "—").replace(/\|/g, "\\|");
const lines = [];
lines.push("# EHIS official facts — merge & diff report");
lines.push("");
lines.push(`> Genereeritud: ${snapshot.fetched_at}. Allikas: ${snapshot.attribution_text}.`);
lines.push(`> Litsents: ${snapshot.licence}.`);
lines.push("");
lines.push("Deterministlik sobitus (provider + nimi). EHIS-i õpiväljundid on ametlik avaandmestik,");
lines.push("mida tohib viitega taasesitada. See raport ei muuda kuvatavat — see näitab omanikule,");
lines.push("**kus EHIS erineb praegusest kuvast**, et omanik saaks hiljem täieliku ülekirjutuse heaks kiita.");
lines.push("");
lines.push("## Sobituse statistika");
lines.push("");
lines.push(`- Kataloogi kirjeid kokku: **${catalog.length}**`);
lines.push(`- Sobitatud: **${stats.exact + stats.strong}** (täpne: ${stats.exact}, tugev: ${stats.strong})`);
lines.push(`- Sobimata (per-school faktid puutumata): **${stats.none}**`);
lines.push(`- EHIS õppekavasid snapshotis: **${snapshot.record_count}** (${[...new Set(snapshot.curricula.map((c) => c.provider))].length} õppeasutust)`);
lines.push("");
lines.push("## Erinevused (sobitatud kirjed, kus EHIS erineb praegusest kuvast)");
lines.push("");
if (!diffRows.length) {
  lines.push("_Erinevusi ei leitud sobitatud kirjete seas._");
} else {
  lines.push("| Pakkuja | Kataloogi nimi | EHIS name_et | Kataloogi EAP | EHIS maht | Kataloogi valdkond | EHIS field_name | Usaldus | EHIS kood |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of diffRows) {
    lines.push(
      `| ${esc(r.entry.provider)} | ${esc(r.entry.name)} | ${esc(r.ehis.name_et)} | ${esc(r.entry.ects)} | ${esc(r.ehis.eap)} | ${esc(r.entry.field)} | ${esc(r.ehis.field_name)} | ${r.confidence} | ${esc(r.ehis.ehis_kood)} |`,
    );
  }
}
lines.push("");
lines.push("## Kõik sobitatud kirjed");
lines.push("");
lines.push("| Pakkuja | Kataloogi nimi | EHIS kood | Usaldus | EHIS PDF |");
lines.push("|---|---|---|---|---|");
for (const r of rows.sort((a, b) => a.entry.provider.localeCompare(b.entry.provider, "et") || a.entry.name.localeCompare(b.entry.name, "et"))) {
  const pdf = r.ehis.official_pdf_url ? `[PDF](${r.ehis.official_pdf_url})` : "—";
  lines.push(`| ${esc(r.entry.provider)} | ${esc(r.entry.name)} | ${esc(r.ehis.ehis_kood)} | ${r.confidence} | ${pdf} |`);
}
lines.push("");

const md = lines.join("\n");
console.log(`[ehis] match stats: exact=${stats.exact} strong=${stats.strong} none=${stats.none} (matched ${stats.exact + stats.strong}/${catalog.length})`);
console.log(`[ehis] diff rows (EHIS differs from display): ${diffRows.length}`);
if (process.argv.includes("--write")) {
  writeFileSync(OUT, md);
  console.log(`[ehis] wrote ${OUT}`);
} else {
  console.log("[ehis] dry run — pass --write to persist.");
}
