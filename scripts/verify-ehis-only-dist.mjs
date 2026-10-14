#!/usr/bin/env node
// Post-build gate (npm run build): in the BUILT site, no school-derived value of an EHIS-only
// (robots-blocked / unverified) programme may appear ANYWHERE in dist/ - pages, JSON-LD, client
// bundles (_astro/*.js), comparison/field/county/topic pages, English pages, SVG diagrams, catalog.json,
// llms*.txt, site-profile.json. Owner decision 14.10.2026 (PO orch-23, klass B).
//
// Scope: EVERY text file under dist/. The single named exception is catalog.cc.jsonld: a byte-intact
// AMOS release (hash-bound mirror). It is skipped only while ALLOW_CC_MIRROR is true and is reported
// loudly; AMOS arthunt/02S-AMOS CC export omits restricted rows (then set it to false).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOW_CC_MIRROR = true;
const CC_MIRROR = "catalog.cc.jsonld";
const TEXT_EXT = /\.(html|js|mjs|json|jsonld|txt|svg|xml|css|webmanifest|map)$/i;
const LONG = 25;       // prose long enough to be unique to one programme
const MIN_SHORT = 6;   // shortest school value worth looking for in non-listing files

const ENT = { "&amp;": "&", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
const norm = (t) => String(t).replace(/&(?:amp|quot|#39|apos|lt|gt|nbsp);/g, (m) => ENT[m])
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (TEXT_EXT.test(name)) yield full;
  }
}

// Two classes of school-derived value:
//  prose  - summary, goal, assessment, outcomes: unique to one programme, so forbidden in EVERY file;
//  facts  - prices, intake and duration strings: ordinary strings that other programmes legitimately share
//           ("2000 €", "Registreerimine kuni 2026-08-17"), so they are forbidden where no listing exists:
//           the programme's own page and catalog.json row, client bundles (.js/.mjs/.map/.css) and JSON
//           data files. (SVG diagrams are built from the sanitised catalogue; a bundle that imports the
//           raw feed - the 14.10 leak - is what the facts check catches.)
function schoolValues(raw) {
  const out = [];
  for (const field of ["summary", "goalText", "assessmentText"]) {
    const v = raw?.[field];
    if (typeof v === "string" && v.trim().length >= LONG) out.push(["prose", field, v.trim()]);
  }
  for (const o of raw?.outcomes ?? []) if (typeof o === "string" && o.trim().length >= LONG) out.push(["prose", "outcome", o.trim()]);
  for (const o of raw?.outcomeObjects ?? []) if (typeof o?.text === "string" && o.text.trim().length >= LONG) out.push(["prose", "outcomeObject", o.text.trim()]);
  for (const field of ["priceText", "intakeText", "durationText"]) {
    const v = raw?.[field];
    if (typeof v === "string" && v.trim().length >= MIN_SHORT) out.push(["fact", field, v.trim()]);
  }
  for (const inst of raw?.instances ?? []) {
    if (typeof inst.price === "string" && inst.price.trim().length >= MIN_SHORT) out.push(["fact", "instance.price", inst.price.trim()]);
  }
  return out;
}

/**
 * @returns {{problems: string[], checked: number, files: number, skipped: string[]}}
 */
export function scanDist({ distDir, feed, basis, publicTexts = [], allowCcMirror = ALLOW_CC_MIRROR, requireRestricted = true }) {
  const restrictedIds = new Set(basis.programmes.filter((p) => p.publicationBasis !== "provider_page_robots_allowed").map((p) => p.id));
  const known = new Set(basis.programmes.map((p) => p.id));
  for (const p of feed.programs) if (!known.has(p.id)) restrictedIds.add(p.id); // fail-closed
  const rawById = new Map(feed.programs.map((p) => [p.id, p]));
  const problems = [];
  // Anti-vacuity (review 14.10 r6): an empty feed, empty basis, nothing restricted or an empty dist must be
  // RED, never "ok". Restricted programmes may legitimately reach zero once schools cooperate; that is a
  // deliberate edit (requireRestricted: false), not a silent pass.
  if (!feed.programs.length) problems.push("vacuous: feed has no programmes");
  if (!basis.programmes.length) problems.push("vacuous: source-basis has no programmes");
  if (requireRestricted && restrictedIds.size === 0) problems.push("vacuous: no restricted programmes to check");
  const unmapped = feed.programs.filter((p) => !known.has(p.id)).map((p) => p.id);
  if (unmapped.length) problems.push(`source-basis is missing ${unmapped.length} feed programme(s), refresh src/data/source-basis.json: ${unmapped.slice(0, 5).join(", ")}`);
  // Prose that an OPEN programme or the official EHIS data legitimately publish too (a generic outcome
  // sentence shared by several schools, EHIS boilerplate) is public already, so it is not evidence of a leak.
  const openProse = norm(feed.programs
    .filter((p) => !restrictedIds.has(p.id))
    .flatMap((p) => [p.summary, p.goalText, p.assessmentText, ...(p.outcomes ?? []), ...(p.outcomeObjects ?? []).map((o) => o?.text)])
    .concat(publicTexts)
    .filter((t) => typeof t === "string")
    .join(" \n "));
  const skipped = [];
  let mirror = null;

  const files = [];
  for (const full of walk(distDir)) {
    const rel = relative(distDir, full).split(sep).join("/");
    if (rel === CC_MIRROR) {
      // Count the restricted programmes' nodes and school outcomes IN the AMOS-owned mirror: while the
      // exception is allowed they are reported (not hidden behind "skipped"); once allowCcMirror is false
      // they fail the build.
      try {
        const nodes = JSON.parse(readFileSync(full, "utf8"))["@graph"] ?? [];
        const restrictedNodes = nodes.filter((n) => [...restrictedIds].some((id) => String(n["@id"] ?? "").endsWith(`/kataloog/${id}/`)));
        const outcomes = restrictedNodes.reduce((sum, n) => sum + (Array.isArray(n.learningOutcome) ? n.learningOutcome.length : n.learningOutcome ? 1 : 0), 0);
        mirror = { restrictedNodes: restrictedNodes.length, outcomes };
      } catch { mirror = { restrictedNodes: -1, outcomes: -1 }; }
      if (allowCcMirror) { skipped.push(rel); continue; }
      if (mirror.restrictedNodes !== 0) problems.push(`${rel}: ${mirror.restrictedNodes} restricted programme node(s), ${mirror.outcomes} school outcome(s) in the CC mirror`);
    }
    // The EHIS layer is official open data by definition (school text can equal an EHIS outcome verbatim).
    if (rel === "ehis-catalog.json") continue;
    files.push({ rel, text: norm(readFileSync(full, "utf8")), raw: readFileSync(full, "utf8") });
  }
  if (!files.length) problems.push("vacuous: dist has no scannable files");
  const byRel = new Map(files.map((f) => [f.rel, f]));
  // Client bundles and data files have no legitimate reason to carry a restricted programme's facts.
  const isBundleOrData = (rel) => /\.(js|mjs|map|css)$/i.test(rel)
    || (/\.json$/i.test(rel) && !["catalog.json", "site-profile.json"].includes(rel));

  const catalogFile = byRel.get("catalog.json");
  const catalogPrograms = catalogFile ? JSON.parse(catalogFile.raw).programs : [];
  if (!catalogFile || !catalogPrograms.length) problems.push("vacuous: catalog.json missing or empty");

  for (const id of restrictedIds) {
    const raw = rawById.get(id);
    const values = schoolValues(raw);
    const pageRel = `kataloog/${id}/index.html`;
    const page = byRel.get(pageRel);
    if (!page) problems.push(`${id}: programme page missing from dist`);
    const row = catalogPrograms.find((p) => p.slug === id || p.id === id);
    if (catalogFile && !row) problems.push(`${id}: missing from catalog.json`);
    const rowText = row ? norm(JSON.stringify(row)) : "";
    const ehisText = norm((row?.ehis?.ehisOutcomes ?? []).join(" "));

    if (page && /"ectsCredits"|"learningOutcome"/.test(page.raw)) problems.push(`${id}: Credential Commons node embedded in page`);
    if (byRel.has(`kataloog/${id}/credential.jsonld`)) problems.push(`${id}: credential.jsonld still served`);
    if (row) {
      for (const key of ["priceText", "durationText", "intakeText", "goalText", "assessmentText", "startDate", "registrationDeadline"]) {
        if (row[key] !== null && row[key] !== undefined) problems.push(`${id}: catalog.json ${key} not null`);
      }
    }

    for (const [kind, field, rawValue] of values) {
      const value = norm(rawValue);
      // Text that is word-for-word part of an official EHIS outcome of the same programme is public EHIS text.
      if (kind === "prose" && (field === "outcome" || field === "outcomeObject") && ehisText.includes(value)) continue;
      if (kind === "prose" && openProse.includes(value)) continue;
      if (kind === "prose" && page && page.text.includes(value)) problems.push(`${id}: school ${field} found in its page`);
      if (kind === "prose" && rowText.includes(value)) problems.push(`${id}: school ${field} found in its catalog.json row`);
      if (kind === "fact") {
        if (field !== "durationText" && page && page.text.includes(value)) problems.push(`${id}: school ${field} found in its page`);
        if (rowText.includes(value) && field !== "durationText") problems.push(`${id}: school ${field} found in its catalog.json row`);
      }
      for (const f of files) {
        if (f.rel === pageRel || f.rel === "catalog.json") continue;
        const applies = kind === "prose" || isBundleOrData(f.rel);
        if (applies && f.text.includes(value)) problems.push(`${id}: school ${field} found in ${f.rel}`);
      }
    }
  }

  // Registry / basis internals must never ship to the browser.
  for (const f of files) {
    if (/ai_scraper_blocked|robots_blocked|"publicationBasis"|"fetchPolicy"/.test(f.raw)) problems.push(`${f.rel}: source-basis/registry internals shipped`);
  }
  return { problems, checked: restrictedIds.size, files: files.length, skipped, mirror };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  const DIST = join(ROOT, "dist");
  if (!existsSync(DIST)) {
    console.error("verify-ehis-only-dist: dist/ puudub (käivita pärast astro build)");
    process.exit(2);
  }
  const feed = JSON.parse(readFileSync(join(ROOT, "src/data/catalog/credential-commons-lkg/catalog-feed.json"), "utf8"));
  const basis = JSON.parse(readFileSync(join(ROOT, "src/data/source-basis.json"), "utf8"));
  // Official EHIS open data (outcomes of every registered curriculum) is public by definition.
  const ehis = JSON.parse(readFileSync(join(ROOT, "src/data/ehisFacts/snapshot.json"), "utf8"));
  const publicTexts = ehis.curricula.flatMap((c) => c.outcomes ?? []);
  const { problems, checked, files, skipped, mirror } = scanDist({ distDir: DIST, feed, basis, publicTexts });
  if (problems.length) {
    console.error(`verify-ehis-only-dist: FAIL (${problems.length})`);
    for (const p of problems.slice(0, 30)) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`verify-ehis-only-dist: ok (${checked} EHIS-only programmes, ${files} files scanned across ALL of dist/` +
    (skipped.length
      ? `; KNOWN EXCEPTION: ${skipped.join(", ")} (AMOS-owned CC mirror) currently carries ${mirror?.restrictedNodes} restricted node(s) / ${mirror?.outcomes} school outcome(s); set ALLOW_CC_MIRROR=false after the first AMOS cycle with arthunt/02S-AMOS#5727`
      : "") + ")");
}
