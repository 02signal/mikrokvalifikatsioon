// Apply source-verified catalog facts (from the catalog-source-verify workflow) to the three
// catalog JSON files — deterministically, conservatively, with a clean line-oriented diff.
//
// Safety contract:
//  - Fills ONLY currently-absent/null fields (never overwrites an existing fact).
//  - Validates every value (format enum, integer EAP, bounded outcomes, price/date shape).
//  - Verifies record identity by url before touching it.
//  - Drift (page contradicts an existing fact) is REPORTED, never auto-applied.
//  - Serializer self-check: reconstructing each file UNCHANGED must equal the original byte-for-byte,
//    or we abort — guarantees the only diff is the fills we intend.
//
// Usage: node scripts/apply-catalog-verify.mjs <workflow-result.json> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "src", "data", "catalog");
const FILES = ["taltech", "tartu-ylikool", "muud-koolid"]; // index 0,1,2 == workflow `f`
const TODAY = "2026-06-24";

// Canonical key order (union across records) — added keys land in the right place for a clean diff.
const KEY_ORDER = [
  "name", "provider", "providerType", "url", "field", "ects", "durationText", "priceText",
  "format", "language", "intakeText", "summary", "sourceCheckedAt", "goalText", "outcomes", "assessmentText",
];
const FILLABLE = ["priceText", "ects", "durationText", "format", "intakeText", "goalText", "outcomes", "assessmentText"];
const FORMATS = new Set(["veebis", "hübriid", "kohapeal"]);

const orderKeys = (r) => {
  const o = {};
  for (const k of KEY_ORDER) if (k in r && r[k] !== undefined) o[k] = r[k];
  for (const k of Object.keys(r)) if (!(k in o)) o[k] = r[k]; // any stragglers, end
  return o;
};
const serialize = (arr) => "[\n" + arr.map((r) => "  " + JSON.stringify(orderKeys(r))).join(",\n") + "\n]\n";

// ---- value validators: return a cleaned value, or null to skip ----
const clean = {
  format: (v) => {
    if (typeof v !== "string") return null;
    let s = v.trim().toLowerCase();
    const map = { põimõpe: "hübriid", blended: "hübriid", hybrid: "hübriid", auditoorne: "kohapeal", kontaktõpe: "kohapeal", "in-person": "kohapeal", online: "veebis", veebipõhine: "veebis" };
    s = map[s] || s;
    return FORMATS.has(s) ? s : null;
  },
  ects: (v) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isInteger(n) && n >= 1 && n <= 120 ? n : (Number.isFinite(n) && n >= 1 && n <= 120 ? Math.round(n) : null);
  },
  outcomes: (v) => {
    if (!Array.isArray(v)) return null;
    const seen = new Set(), out = [];
    for (const it of v) {
      const t = String(it || "").trim().replace(/^[-•\d.\s]+/, "").replace(/[.;]+$/, "").slice(0, 300);
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); out.push(t);
      if (out.length >= 12) break;
    }
    return out.length >= 1 ? out : null;
  },
  priceText: (v) => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    // "free" is a valid price; qualify it when the page scopes it to a target group (avoid misleading "Tasuta").
    if (/tasuta/i.test(s)) return /sihtrühm|õpetaja|kõrgharidus/i.test(s) ? "Tasuta sihtrühmale" : "Tasuta";
    if (/\d/.test(s) && /€|eur/i.test(s)) return s.replace(/\s*euro?t?\b/i, " €").replace(/\s+/g, " ").trim();
    return /\d/.test(s) ? s.replace(/\s+/g, " ").trim() : null;
  },
  intakeText: (v) => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!/\d{1,2}\.\d{1,2}\.\d{4}/.test(s)) return null; // must carry a parseable date
    // chronology sanity: a start BEFORE the registration deadline is impossible → suspect extraction, drop.
    const dl = s.match(/kuni\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
    const st = s.match(/alga\w*\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i);
    if (dl && st) {
      const k = (d, m, y) => y + m.padStart(2, "0") + d.padStart(2, "0");
      if (k(st[1], st[2], st[3]) < k(dl[1], dl[2], dl[3])) return null;
    }
    return s;
  },
  // durationText renders under "Kestus" (calendar period). Reject academic-hour WORKLOAD — that's
  // "Maht" (already shown as EAP). Accept genuine duration/period phrasings (semester counts,
  // month/date ranges like "september–veebruar" or "01.11.2026 - 27.06.2027").
  durationText: (v) => {
    if (typeof v !== "string" || !v.trim()) return null;
    const s = v.trim();
    if (/ak\.?\s*tund|akadeemil|õppetund|EAP/i.test(s)) return null;
    return s.slice(0, 80);
  },
  goalText: (v) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, 400) : null),
  assessmentText: (v) => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, 400) : null),
};

// ---- load ----
const resultPath = process.argv[2];
const WRITE = process.argv.includes("--write");
if (!resultPath) { console.error("usage: node scripts/apply-catalog-verify.mjs <result.json> [--write]"); process.exit(1); }
const result = JSON.parse(readFileSync(resultPath, "utf8"));
const verified = Array.isArray(result.results) ? result.results : (Array.isArray(result) ? result : []);
console.log(`workflow results: ${verified.length} records returned`);

const files = FILES.map((f) => {
  const path = join(DATA, `${f}.json`);
  const orig = readFileSync(path, "utf8");
  const arr = JSON.parse(orig);
  // serializer self-check: unchanged reconstruction must be byte-identical
  if (serialize(arr) !== orig) {
    console.error(`ABORT: serializer does not reproduce ${f}.json byte-for-byte — refusing to write (diff would be noisy).`);
    process.exit(2);
  }
  return { f, path, orig, arr };
});
console.log("serializer self-check: all 3 files reproduce byte-for-byte ✓");

// ---- apply ----
const byField = {};
const drift = [];
const skipped = [];
let touchedRecords = 0;
for (const r of verified) {
  const fileIdx = r.f;
  const bucket = files[fileIdx];
  if (!bucket) { skipped.push({ url: r.url, why: `bad file index ${fileIdx}` }); continue; }
  const rec = bucket.arr[r.i];
  if (!rec) { skipped.push({ url: r.url, why: `no record at ${fileIdx}/${r.i}` }); continue; }
  if (rec.url !== r.url) { skipped.push({ url: r.url, why: `url mismatch (record has ${rec.url})` }); continue; }
  const confirmed = r.confirmed || {};
  let touched = false;
  for (const field of FILLABLE) {
    const present = rec[field] != null && !(Array.isArray(rec[field]) && rec[field].length === 0);
    if (present) continue; // never overwrite an existing fact
    const raw = confirmed[field];
    if (raw == null) continue;
    const val = clean[field](raw);
    if (val == null) { skipped.push({ url: r.url, field, why: "failed validation", raw }); continue; }
    rec[field] = val;
    byField[field] = (byField[field] || 0) + 1;
    touched = true;
  }
  if (touched) { rec.sourceCheckedAt = TODAY; touchedRecords++; }
  for (const d of (r.driftConfirmed || [])) drift.push({ url: r.url, provider: rec.provider, name: rec.name, ...d, current: rec[d.field] });
}

// ---- report ----
console.log(`\n=== APPLY ${WRITE ? "(WRITE)" : "(DRY-RUN)"} ===`);
console.log(`records touched: ${touchedRecords}`);
console.log("fills by field:", JSON.stringify(byField));
console.log(`drift flags (NOT auto-applied): ${drift.length}`);
if (drift.length) for (const d of drift.slice(0, 40)) console.log(`  DRIFT ${d.provider} | ${d.field}: record="${d.current}" vs source="${d.sourceValue}" — "${(d.quote || "").slice(0, 90)}"`);
if (skipped.length) { console.log(`skipped: ${skipped.length}`); for (const s of skipped.slice(0, 30)) console.log("  -", JSON.stringify(s).slice(0, 160)); }

if (WRITE) {
  for (const b of files) writeFileSync(b.path, serialize(b.arr));
  console.log("\nwrote 3 catalog files.");
  // emit drift report for manual review
  writeFileSync(join(HERE, "..", "catalog-drift-report.json"), JSON.stringify(drift, null, 2));
  console.log(`drift report → catalog-drift-report.json (${drift.length})`);
} else {
  console.log("\nDRY-RUN — pass --write to apply.");
}
