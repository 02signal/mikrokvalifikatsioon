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
