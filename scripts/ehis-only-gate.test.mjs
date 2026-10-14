// Mutation tests for the post-build gate (scripts/verify-ehis-only-dist.mjs): a leak planted in ANY
// public file class must turn the gate red, and a clean dist must pass. Review 14.10 (#145 r4): the
// first gate missed a 1.4 MB client bundle that shipped the raw feed.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

import { scanDist } from "./verify-ehis-only-dist.mjs";

const SUMMARY = "Õpetab alustavale ettevõtjale, kuidas oma äriidee mentorite abiga ellu viia.";
const feed = {
  programs: [
    { id: "blocked-1", provider: "TLÜ", summary: SUMMARY, priceText: "1 175–1 305 €", intakeText: "Registreerimine kuni 2026-08-17", goalText: null, outcomes: [], instances: [{ price: "1 175–1 305 €" }] },
    { id: "open-1", provider: "TalTech", summary: "Avatud programmi kokkuvõte, mis ei ole piiratud.", priceText: "960 €" },
  ],
};
const basis = { programmes: [
  { id: "blocked-1", publicationBasis: "ehis_open_data_and_manual_review" },
  { id: "open-1", publicationBasis: "provider_page_robots_allowed" },
] };

function makeDist(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ehis-gate-"));
  const files = {
    "kataloog/blocked-1/index.html": "<html><body>Ametlik EHIS: Blocked 1, TLÜ</body></html>",
    "kataloog/open-1/index.html": "<html><body>Hind 960 € Avatud programmi kokkuvõte, mis ei ole piiratud.</body></html>",
    "catalog.json": JSON.stringify({ programs: [
      { slug: "blocked-1", priceText: null, durationText: null, intakeText: null, goalText: null, assessmentText: null, startDate: null, registrationDeadline: null, ehis: { ehisOutcomes: [] } },
      { slug: "open-1", priceText: "960 €" },
    ] }),
    "_astro/app.abc123.js": "console.log('hello')",
    "vordlus/a-vs-b/index.html": "<html>2000 € võrdlus</html>",
    ...extra,
  };
  for (const [rel, text] of Object.entries(files)) {
    if (text === null) continue;
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}
const scan = (extra) => {
  const dir = makeDist(extra);
  try { return scanDist({ distDir: dir, feed, basis }); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test("clean dist passes and every file is scanned", () => {
  const r = scan();
  assert.deepEqual(r.problems, []);
  assert.ok(r.files >= 5);
});

test("MUTATION: raw feed bundled into a client script (the 14.10 leak) turns the gate red", () => {
  const r = scan({ "_astro/index.astro_astro_type_script_index_0_lang.zzz.js": `var d=${JSON.stringify(feed)};` });
  assert.ok(r.problems.some((p) => /blocked-1: school (summary|priceText|instance\.price) found in _astro\//.test(p)), r.problems.join("\n"));
});

test("MUTATION: school prose on a comparison page, a field page or an English page turns the gate red", () => {
  for (const rel of ["vordlus/x-vs-y/index.html", "valdkond/haridus/index.html", "en/kataloog/index.html"]) {
    const r = scan({ [rel]: `<html>${SUMMARY}</html>` });
    assert.ok(r.problems.some((p) => p.includes(rel)), `${rel}: ${r.problems.join("\n")}`);
  }
});

test("MUTATION: school prose in an SVG diagram or a data JSON turns the gate red", () => {
  for (const rel of ["diagrams/valdkond/haridus.svg", "some-feed.json"]) {
    const r = scan({ [rel]: `<svg><text>${SUMMARY}</text></svg>` });
    assert.ok(r.problems.some((p) => p.includes(rel)), `${rel}: ${r.problems.join("\n")}`);
  }
});

test("MUTATION: a restricted price in the programme's own page or catalog.json row turns the gate red", () => {
  const page = scan({ "kataloog/blocked-1/index.html": "<html>Hind 1 175–1 305 €</html>" });
  assert.ok(page.problems.some((p) => /found in its page/.test(p)));
  const row = scan({ "catalog.json": JSON.stringify({ programs: [{ slug: "blocked-1", priceText: "1 175–1 305 €", ehis: {} }, { slug: "open-1" }] }) });
  assert.ok(row.problems.some((p) => /catalog\.json/.test(p)));
});

test("MUTATION: source-basis / registry internals shipped to the browser turn the gate red", () => {
  for (const marker of ["ai_scraper_blocked", "robots_blocked", '"publicationBasis":"x"', '"fetchPolicy":"x"']) {
    const r = scan({ "_astro/chunk.js": `var s='${marker}'` });
    assert.ok(r.problems.some((p) => /internals shipped/.test(p)), marker);
  }
});

test("MUTATION: an embedded CC node or a served per-programme credential.jsonld turns the gate red", () => {
  assert.ok(scan({ "kataloog/blocked-1/index.html": '<script type="application/ld+json">{"ectsCredits":6}</script>' }).problems.some((p) => /Credential Commons node/.test(p)));
  assert.ok(scan({ "kataloog/blocked-1/credential.jsonld": "{}" }).problems.some((p) => /credential\.jsonld/.test(p)));
});

test("an unknown programme (no basis row) is restricted fail-closed; a missing programme page is reported", () => {
  const dir = makeDist({ "_astro/x.js": "var p='9 999 € ei ole siin'" });
  try {
    const r = scanDist({ distDir: dir, feed: { programs: [...feed.programs, { id: "new-2", provider: "X", priceText: "9 999 €" }] }, basis });
    assert.ok(r.problems.some((p) => /new-2: programme page missing/.test(p)));
    assert.ok(r.problems.some((p) => /new-2: school priceText found in _astro\/x\.js/.test(p)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the AMOS-owned CC mirror is the only named exception and is reported, not silent", () => {
  const r = scan({ "catalog.cc.jsonld": JSON.stringify({ "@graph": [{ learningOutcome: [SUMMARY] }] }) });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.skipped, ["catalog.cc.jsonld"]);
});

test("client outcome-ref lookup is key-compatible with the server map (no data import in the client)", async () => {
  const { makeOutcomeRefLookup } = await import("../src/lib/outcome-ref-lookup.ts");
  const { outcomeRefMap, outcomeRefForText } = await import("../src/data/outcomeRefs.ts");
  const lookup = makeOutcomeRefLookup(Object.fromEntries(Object.entries(outcomeRefMap).map(([k, v]) => [k, { outcome_ref: v.outcome_ref }])));
  const samples = Object.keys(outcomeRefMap).slice(0, 50);
  assert.ok(samples.length > 0);
  for (const key of samples) {
    assert.equal(lookup(`  ${key.toUpperCase()}  `), outcomeRefForText(key), "same dedup key and same ref as the server module");
  }
  assert.equal(lookup("not in the catalogue"), null);
  assert.equal(lookup(undefined), null);
});

// ---- Anti-vacuity (review r6): the gate must never say "ok" because there was nothing to check ----
test("VACUITY: empty feed, empty basis, nothing restricted or an empty dist is RED, never ok", () => {
  const dir = makeDist();
  try {
    assert.ok(scanDist({ distDir: dir, feed: { programs: [] }, basis }).problems.some((p) => /vacuous: feed/.test(p)));
    assert.ok(scanDist({ distDir: dir, feed, basis: { programmes: [] } }).problems.some((p) => /vacuous: source-basis/.test(p)));
    const noneRestricted = { programmes: basis.programmes.map((p) => ({ ...p, publicationBasis: "provider_page_robots_allowed" })) };
    assert.ok(scanDist({ distDir: dir, feed, basis: noneRestricted }).problems.some((p) => /no restricted programmes/.test(p)));
    // A deliberate, explicit opt-out is the only way to run with zero restricted programmes.
    assert.ok(!scanDist({ distDir: dir, feed, basis: noneRestricted, requireRestricted: false }).problems.some((p) => /no restricted programmes/.test(p)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const empty = mkdtempSync(join(tmpdir(), "ehis-gate-empty-"));
  try {
    const r = scanDist({ distDir: empty, feed, basis });
    assert.ok(r.problems.some((p) => /dist has no scannable files/.test(p)));
    assert.ok(r.problems.some((p) => /catalog\.json missing or empty/.test(p)));
  } finally { rmSync(empty, { recursive: true, force: true }); }
});

test("VACUITY: a feed programme without a source-basis row fails the gate with the refresh instruction", () => {
  const dir = makeDist();
  try {
    const r = scanDist({ distDir: dir, feed: { programs: [...feed.programs, { id: "brand-new", provider: "X" }] }, basis });
    assert.ok(r.problems.some((p) => /source-basis is missing 1 feed programme.*brand-new/.test(p)), r.problems.join("\n"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CC mirror: restricted nodes and school outcomes are COUNTED while allowed, and FAIL the build once the exception is switched off", () => {
  const mirror = JSON.stringify({ "@graph": [
    { "@id": "https://mikrokvalifikatsioon.ee/kataloog/blocked-1/", learningOutcome: ["a school outcome", "another one"] },
    { "@id": "https://mikrokvalifikatsioon.ee/kataloog/open-1/", learningOutcome: ["open outcome"] },
  ] });
  const dir = makeDist({ "catalog.cc.jsonld": mirror });
  try {
    const allowed = scanDist({ distDir: dir, feed, basis, allowCcMirror: true });
    assert.deepEqual(allowed.mirror, { restrictedNodes: 1, outcomes: 2 });
    assert.deepEqual(allowed.skipped, ["catalog.cc.jsonld"]);
    assert.deepEqual(allowed.problems, []);
    const strict = scanDist({ distDir: dir, feed, basis, allowCcMirror: false });
    assert.ok(strict.problems.some((p) => /catalog\.cc\.jsonld: 1 restricted programme node\(s\), 2 school outcome\(s\)/.test(p)), strict.problems.join("\n"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const clean = makeDist({ "catalog.cc.jsonld": JSON.stringify({ "@graph": [{ "@id": "https://mikrokvalifikatsioon.ee/kataloog/open-1/" }] }) });
  try {
    assert.deepEqual(scanDist({ distDir: clean, feed, basis, allowCcMirror: false }).problems, [], "a mirror without restricted nodes passes once the exception is off");
  } finally { rmSync(clean, { recursive: true, force: true }); }
});
