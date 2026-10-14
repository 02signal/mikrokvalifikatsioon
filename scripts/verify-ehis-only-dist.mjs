#!/usr/bin/env node
// Post-build gate (npm run build): in the BUILT site, no school-derived value of an EHIS-only
// (robots-blocked) programme may appear in its page, JSON-LD, catalog.json, llms*.txt or
// site-profile.json. Owner decision 14.10.2026 (PO orch-23, klass B).
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const feed = JSON.parse(readFileSync(join(ROOT, "src/data/catalog/credential-commons-lkg/catalog-feed.json"), "utf8"));
const basis = JSON.parse(readFileSync(join(ROOT, "src/data/source-basis.json"), "utf8"));
const restrictedIds = new Set(basis.programmes.filter((p) => p.publicationBasis !== "provider_page_robots_allowed").map((p) => p.id));
// Programmes the basis does not know are restricted too (fail-closed, see src/data/sourceBasis.ts).
const known = new Set(basis.programmes.map((p) => p.id));
for (const p of feed.programs) if (!known.has(p.id)) restrictedIds.add(p.id);

if (!existsSync(DIST)) {
  console.error("verify-ehis-only-dist: dist/ puudub (käivita pärast astro build)");
  process.exit(2);
}

const rawById = new Map(feed.programs.map((p) => [p.id, p]));
// Compare after HTML-entity decoding and whitespace collapsing (Astro escapes " & \' and nbsp).
const ENT = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
const norm = (t) => String(t).replace(/&(?:amp|quot|#39|apos|lt|gt|nbsp);/g, (m) => ENT[m]).replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
const read = (rel) => (existsSync(join(DIST, rel)) ? readFileSync(join(DIST, rel), "utf8") : "");
const machine = ["catalog.json", "llms.txt", "llms-full.txt", "site-profile.json"].map((f) => [f, read(f)]);
const problems = [];

function schoolValues(raw) {
  const out = [];
  for (const field of ["priceText", "summary", "goalText", "assessmentText", "intakeText"]) {
    const v = raw?.[field];
    if (typeof v === "string" && v.trim().length >= 12) out.push([field, v.trim()]);
  }
  for (const inst of raw?.instances ?? []) if (typeof inst.price === "string" && inst.price.trim().length >= 6) out.push(["instance.price", inst.price.trim()]);
  for (const o of raw?.outcomes ?? []) if (typeof o === "string" && o.trim().length >= 25) out.push(["outcome", o.trim()]);
  for (const o of raw?.outcomeObjects ?? []) if (typeof o?.text === "string" && o.text.trim().length >= 25) out.push(["outcomeObject", o.text.trim()]);
  return out;
}

// Short generic values ("2000 €", "Registreerimine kuni 2026-08-17") legitimately occur in OTHER
// (open) programmes, so global outputs are checked by LONG prose only; the programme's own page and its
// own catalog.json row are checked for every school value (catalog.json itself is covered by that row check).
const LONG = 25;
const catalogJson = machine.find(([f]) => f === "catalog.json")?.[1];
const catalogPrograms = catalogJson ? JSON.parse(catalogJson).programs : [];

for (const id of restrictedIds) {
  const raw = rawById.get(id);
  const values = schoolValues(raw);
  const pageRaw = read(join("kataloog", id, "index.html"));
  const page = norm(pageRaw);
  if (!page) problems.push(`${id}: programme page missing from dist`);
  const row = catalogPrograms.find((p) => p.slug === id || p.id === id);
  const rowText = row ? norm(JSON.stringify(row)) : "";
  if (catalogJson && !row) problems.push(`${id}: missing from catalog.json`);
  // The school-derived Credential Commons node (ectsCredits / learningOutcome) must not be embedded
  // in the page or served as a per-programme resource.
  if (/"ectsCredits"|"learningOutcome"/.test(pageRaw)) problems.push(`${id}: Credential Commons node embedded in page`);
  if (existsSync(join(DIST, "kataloog", id, "credential.jsonld"))) problems.push(`${id}: credential.jsonld still served`);
  // A school outcome that is word-for-word part of an OFFICIAL EHIS outcome of the same programme is
  // public EHIS text, not a leak (EHIS outcomes are numbered, so compare by containment).
  const ehisText = norm((row?.ehis?.ehisOutcomes ?? []).join(" "));
  for (const [field, rawValue] of values) {
    const value = norm(rawValue);
    if ((field === "outcome" || field === "outcomeObject") && ehisText.includes(value)) continue;
    if (page.includes(value)) problems.push(`${id}: school ${field} found in its page`);
    if (rowText.includes(value)) problems.push(`${id}: school ${field} found in its catalog.json row`);
    if (value.length >= LONG) {
      for (const [file, body] of machine) if (file !== "catalog.json" && norm(body).includes(value)) problems.push(`${id}: school ${field} found in ${file}`);
    }
  }
  if (row) {
    for (const key of ["priceText", "durationText", "intakeText", "goalText", "assessmentText", "startDate", "registrationDeadline"]) {
      if (row[key] !== null && row[key] !== undefined) problems.push(`${id}: catalog.json ${key} not null`);
    }
  }
}

if (problems.length) {
  console.error(`verify-ehis-only-dist: FAIL (${problems.length})`);
  for (const p of problems.slice(0, 25)) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`verify-ehis-only-dist: ok (${restrictedIds.size} EHIS-only programmes checked in pages + catalog.json + llms + site-profile)`);
