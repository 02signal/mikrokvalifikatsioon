// Build the committed EHIS curriculum-facts snapshot from the official EHIS open data.
//
// Source (verified live 2026-06-24, HTTP-only):
//   http://enda.ehis.ee/avaandmed/rest/oppekavad/-/-/OK_LIIK_MKVOK/1/JSON
// Records live at body.oppekavad.oppekava[]. EHIS õpiväljundid is official open data
// (avaandmed.eesti.ee — reproducible verbatim WITH attribution to HTM/EHIS).
//
// Output: src/data/ehisFacts/snapshot.json — shape amos.ehis.curriculum_facts/v1.
// A parallel AMOS agent produces the EXACTLY identical shape; the build-time feed
// (PUBLIC_EHIS_FACTS_FEED_URL) consumed by index.ts is the same schema.
//
// Usage: node scripts/build-ehis-snapshot.mjs [--write]
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "src", "data", "ehisFacts", "snapshot.json");
const ENDPOINT = "http://enda.ehis.ee/avaandmed/rest/oppekavad/-/-/OK_LIIK_MKVOK/1/JSON";
const TODAY = "2026-06-24";

// Normalize collapsed/double whitespace in a name; trim.
function normName(s) {
  if (typeof s !== "string") return null;
  const n = s.replace(/\s+/g, " ").trim();
  return n.length ? n : null;
}

// DD.MM.YYYY -> YYYY-MM-DD (null-safe).
function isoFromDots(s) {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

// EHIS opivaljundid is a single string: an optional intro line ("Õppekava läbinud õppija:")
// followed by numbered outcomes "1. …\n2. …". Split into a clean numbered-list array.
function splitOutcomes(raw) {
  if (typeof raw !== "string") return [];
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  // Capture each "<n>. <body>" up to the next number or end.
  const items = [];
  const re = /(\d+)\.\s*([\s\S]*?)(?=\n\s*\d+\.\s|$)/g;
  let mm;
  while ((mm = re.exec(text)) !== null) {
    const body = mm[2].replace(/\s+/g, " ").trim();
    if (body) items.push(`${mm[1]}. ${body}`);
  }
  if (items.length) return items;
  // Fallback: no numbering — keep non-empty lines that aren't the intro.
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !/^Õppekava läbinud õppija:?$/i.test(l));
}

function languages(rec) {
  const ok = rec?.oppeKeeled?.oppeKeel;
  if (Array.isArray(ok)) return ok.map((x) => normName(x)).filter(Boolean);
  if (typeof ok === "string") {
    const one = normName(ok);
    return one ? [one] : [];
  }
  return [];
}

function intOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

function strOrNull(v) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

// official_pdf_url must be an http(s) URL or null (v1 contract). The live EHIS
// avalikOppekavaFailUrl is sometimes a placeholder ("Hetkel puudub") or a bare
// code ("AYC0439"), not a URL — coerce any non-URL value to null.
function httpUrlOrNull(v) {
  const s = typeof v === "string" ? v.trim() : "";
  return /^https?:\/\//i.test(s) ? s : null;
}

function mapRecord(rec) {
  return {
    ehis_kood: strOrNull(rec.oppekavaKood),
    registrikood: null, // EHIS curriculum record carries no provider registry code in this feed.
    provider: normName(rec.oppeasutus),
    provider_type: strOrNull(rec.oppeasutuseTyyp),
    name_et: normName(rec.oppekavaNimetus),
    name_en: normName(rec.oppekavaNimetusInglise),
    curriculum_type: strOrNull(rec.oppekavaLiik),
    eap: intOrNull(rec.maht),
    field_code: strOrNull(rec.ryhmaKood),
    field_name: strOrNull(rec.ryhmaNimetus),
    study_direction: strOrNull(rec.oppesuund),
    languages: languages(rec),
    outcomes: splitOutcomes(rec.opivaljundid),
    status: strOrNull(rec.kehtivStaatus),
    registered_at: isoFromDots(rec.registrKuupaev),
    updated_at: isoFromDots(rec.muudetud),
    official_pdf_url: httpUrlOrNull(rec.avalikOppekavaFailUrl),
  };
}

async function fetchRecords() {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`EHIS HTTP ${res.status}`);
  const data = await res.json();
  const arr = data?.body?.oppekavad?.oppekava;
  if (!Array.isArray(arr) || !arr.length) throw new Error("EHIS: no oppekava records");
  return arr;
}

async function main() {
  const write = process.argv.includes("--write");
  const records = await fetchRecords();
  const curricula = records
    .map(mapRecord)
    // Only keep records with a usable code + provider + Estonian name.
    .filter((c) => c.ehis_kood && c.provider && c.name_et)
    .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name_et.localeCompare(b.name_et, "et"));

  const snapshot = {
    snapshot_version: "amos.ehis.curriculum_facts/v1",
    source: "EHIS",
    source_endpoint: ENDPOINT,
    publisher: "Haridus- ja Teadusministeerium",
    attribution_text: "Allikas: EHIS (Eesti Hariduse Infosüsteem), Haridus- ja Teadusministeerium",
    licence: "avaandmed.eesti.ee — taaskasutatav, viitega allikale (HTM/EHIS)",
    fetched_at: TODAY,
    record_count: curricula.length,
    curricula,
  };

  const json = JSON.stringify(snapshot, null, 2) + "\n";
  console.log(`[ehis] mapped ${curricula.length} of ${records.length} records`);
  console.log(`[ehis] providers: ${[...new Set(curricula.map((c) => c.provider))].length}`);
  if (write) {
    writeFileSync(OUT, json);
    console.log(`[ehis] wrote ${OUT}`);
  } else {
    console.log("[ehis] dry run — pass --write to persist. First record:");
    console.log(JSON.stringify(curricula[0], null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
