// Unit + data-integrity test for the /oskused/ skill search expansion (CL-1).
//
// Two halves:
//   1) expandQuery LOGIC — driven by an INLINE FIXTURE (not the real data), so the
//      semantics are pinned independently of whatever concepts the data file ships.
//   2) DATA INTEGRITY — imports the REAL skillSynonyms and asserts only structural /
//      hygiene / PII-safety invariants, never specific concept content (the data file
//      is authored separately and will keep growing).
//
// Zero deps (node:test). Node imports the .ts source directly (native type-strip),
// mirroring how subscribe-wire.test.mjs imports app code straight from source.
// Runs as the first step of `npm run build` — the pre-commit gate.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { expandQuery } from "../src/lib/skill-match.ts";
import { skillSynonyms } from "../src/data/skillSynonyms.ts";

// Robust, self-contained fixture: a colloquial query ("graafikud excelis") must reach
// a formal outcome word ("excel"); two clusters so dedup + multi-label is exercised.
const FIXTURE = [
  { id: "graafik", label: "Graafikud ja Excel", terms: ["graafik", "graafikud", "excel", "tabel"] },
  { id: "audit", label: "Audit ja kontroll", terms: ["audit", "auditeerimine", "kontroll"] },
];

test("(a) colloquial query expands to include a real outcome word from the fixture", () => {
  const { terms } = expandQuery("graafikud excelis", FIXTURE);
  assert.ok(terms.includes("excel"), "expanded terms must include the formal word 'excel'");
  assert.ok(terms.includes("graafik"), "expanded terms must include sibling cluster term 'graafik'");
});

test("(b) query with no cluster hit falls back to [query]", () => {
  const out = expandQuery("täiesti tundmatu oskus", FIXTURE);
  assert.deepEqual(out, { terms: ["täiesti tundmatu oskus"], clusters: [] });
});

test("(c) empty / whitespace query → {terms:[],clusters:[]}", () => {
  assert.deepEqual(expandQuery("", FIXTURE), { terms: [], clusters: [] });
  assert.deepEqual(expandQuery("   ", FIXTURE), { terms: [], clusters: [] });
});

test("(d) substring matching works in BOTH directions", () => {
  // query is a substring of a term: "graaf" ⊂ "graafik"
  const short = expandQuery("graaf", FIXTURE);
  assert.ok(short.clusters.includes("Graafikud ja Excel"), "'graaf' should hit via term⊃query");
  // a term is a substring of the query: "audit" ⊂ "auditi aruanne"
  const long = expandQuery("auditi aruanne", FIXTURE);
  assert.ok(long.clusters.includes("Audit ja kontroll"), "'auditi aruanne' should hit via query⊃term");
});

test("(e) terms are de-duplicated AND always include the raw normalized query", () => {
  const { terms } = expandQuery("Excel", FIXTURE); // mixed case + already a fixture term
  assert.equal(new Set(terms).size, terms.length, "terms must contain no duplicates");
  assert.ok(terms.includes("excel"), "normalized raw query 'excel' must be present");
  // raw query is included even when it equals an existing cluster term (no extra dupe).
  assert.equal(terms.filter((t) => t === "excel").length, 1, "'excel' must appear exactly once");
});

test("(f) matched cluster LABELS are returned (de-duplicated)", () => {
  const { clusters } = expandQuery("kontroll", FIXTURE);
  assert.deepEqual(clusters, ["Audit ja kontroll"]);
  assert.equal(new Set(clusters).size, clusters.length, "labels must be de-duplicated");
});

test("expandQuery with the real skillSynonyms is deterministic and includes the raw query", () => {
  // We don't assert on content (data is authored separately) — only that the function
  // stays pure/deterministic with the real data and always carries the raw query.
  const a = expandQuery("andmeanalüüs", skillSynonyms);
  const b = expandQuery("andmeanalüüs", skillSynonyms);
  assert.deepEqual(a, b, "must be deterministic");
  assert.ok(Array.isArray(a.terms) && Array.isArray(a.clusters));
  assert.ok(a.terms.includes("andmeanalüüs"), "raw query is always among the terms");
});

// ---- DATA INTEGRITY: structural + hygiene + PII guard on the REAL data ----
// Asserts shape and safety ONLY — never specific concept content.

test("skillSynonyms: non-empty array of well-formed clusters", () => {
  assert.ok(Array.isArray(skillSynonyms), "skillSynonyms must be an array");
  assert.ok(skillSynonyms.length > 0, "skillSynonyms must be non-empty");
  for (const c of skillSynonyms) {
    assert.equal(typeof c.id, "string");
    assert.ok(c.id.trim().length > 0, "every cluster needs a non-empty id");
    assert.equal(typeof c.label, "string");
    assert.ok(c.label.trim().length > 0, "every cluster needs a non-empty label");
    assert.ok(Array.isArray(c.terms) && c.terms.length > 0, `cluster '${c.id}' needs non-empty terms`);
  }
});

test("skillSynonyms: cluster ids are unique", () => {
  const ids = skillSynonyms.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "cluster ids must be unique");
});

test("skillSynonyms: every term is lowercased, length>=3, and PII-safe", () => {
  const ELEVEN_DIGITS = /\d{11}/; // isikukood-like run guard
  for (const c of skillSynonyms) {
    for (const term of c.terms) {
      assert.equal(typeof term, "string", `cluster '${c.id}' has a non-string term`);
      // MIN_LEN in skill-match.ts is 3; a <3 term is dead weight on the query⊃term direction.
      assert.ok(term.length >= 3, `term '${term}' in '${c.id}' is shorter than MIN_LEN (3)`);
      assert.equal(term, term.toLowerCase(), `term '${term}' in '${c.id}' must be lowercased`);
      assert.ok(!term.includes("@"), `term '${term}' in '${c.id}' looks like an e-mail (no '@')`);
      assert.ok(!ELEVEN_DIGITS.test(term), `term in '${c.id}' contains an 11-digit (isikukood-like) run`);
    }
  }
});

// GROUNDING (the invariant that protects the map's VALUE): every cluster must have
// at least one term that actually appears as a substring in some real catalog outcome.
// An ungrounded term is pure noise — it can only over-match. Reads the catalog the
// same way /oskused/ does (every *.json in src/data/catalog/). Fails the build if the
// data drifts away from the catalog.
test("skillSynonyms: every cluster is GROUNDED in at least one real catalog outcome", () => {
  const dir = new URL("../src/data/catalog/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const outcomes = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    for (const e of arr) for (const o of e.outcomes || []) {
      const t = String(o).trim().toLowerCase();
      if (t) outcomes.push(t);
    }
  }
  assert.ok(outcomes.length > 100, `sanity: expected the real catalog outcomes to load (got ${outcomes.length})`);
  const ungrounded = skillSynonyms
    .filter((c) => !c.terms.some((t) => t.length >= 3 && outcomes.some((o) => o.includes(t))))
    .map((c) => c.id);
  assert.deepEqual(ungrounded, [],
    `these clusters have NO term that appears in any real outcome (add a grounded stem or remove): ${ungrounded.join(", ")}`);
});
