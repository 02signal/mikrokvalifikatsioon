// Unit test for the konto sync/mapping pure layer (konto face, flag-gated AMOS).
//
// Pins the CONTRACT that the konto page wires against: what JSON is sent to the
// AMOS sync endpoint (NON-PII out_… refs only), and how the server response is
// reflected back into the local name map. Everything is deterministic — the
// text->ref resolver is INJECTED via a fixture `refOf`, so assertions are exact.
//
// Imports ONLY konto-sync.ts (pure: no DOM/network/import.meta), so Node can
// type-strip the .ts source directly — same pattern as packages.test.mjs.
// konto-api.ts is NOT imported here (it uses import.meta.env, browser-only).
// Runs as the first step of `npm run build` via the scripts/*.test.mjs glob.
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSyncPayload,
  namesFromSync,
  packagesUnsyncable,
} from "../src/lib/konto-sync.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────

// item.key is the lowercased outcome text (matches packages.ts / outcomeRefs.ts).
const item = (key, text = key, progs) => (progs ? { key, text, progs } : { key, text });

const pkg = (id, name, items, createdAt = 1000) => ({ id, name, items, createdAt });

const state = (packages, activeId = null) => ({ v: 2, packages, activeId });

// Fixture resolver: only these two texts resolve to out_ refs; everything else
// returns null (unresolvable) — exercises the skip/unsyncable paths.
const REFS = {
  excel: "out_0000000000000000000000a1",
  graafik: "out_0000000000000000000000b2",
};
const refOf = (text) => (typeof text === "string" && text in REFS ? REFS[text] : null);

// ── buildSyncPayload — happy path: text -> ref ────────────────────────────────
test("buildSyncPayload maps item keys to out_ refs, client_id = pkg.id, weight 0", () => {
  const s = state([pkg("p-a", "Raamatupidaja", [item("excel"), item("graafik")])]);
  const payload = buildSyncPayload(s, refOf);
  assert.equal(payload.length, 1);
  assert.deepEqual(payload[0], {
    client_id: "p-a",
    outcome_refs: [REFS.excel, REFS.graafik],
    weight: 0,
  });
  // Privacy: NO name, NO outcome text in the payload.
  assert.equal("coverage" in payload[0], false, "coverage omitted in v1");
  assert.equal(JSON.stringify(payload).includes("Raamatupidaja"), false, "name never sent");
});

// ── buildSyncPayload — weight encodes the visible reprioritise order ───────────
test("buildSyncPayload sends a dense ascending weight = visible package order", () => {
  const s = state([
    pkg("p-a", "A", [item("excel")]),
    pkg("p-b", "B", [item("graafik")]),
  ]);
  const payload = buildSyncPayload(s, refOf);
  assert.equal(payload[0].weight, 0, "first package is top priority (weight 0)");
  assert.equal(payload[1].weight, 1, "second package is next");
});

// ── buildSyncPayload — weight stays dense when an unsyncable package is skipped ─
test("buildSyncPayload weight is dense (skips do not leave gaps)", () => {
  const s = state([
    pkg("p-a", "A", [item("excel")]),                 // weight 0
    pkg("p-skip", "Skip", [item("tundmatu")]),        // dropped (0 refs)
    pkg("p-c", "C", [item("graafik")]),               // weight 1, NOT 2
  ]);
  const payload = buildSyncPayload(s, refOf);
  assert.equal(payload.length, 2);
  assert.deepEqual(payload.map((p) => [p.client_id, p.weight]), [["p-a", 0], ["p-c", 1]]);
});

// ── buildSyncPayload — unresolvable outcomes dropped ──────────────────────────
test("buildSyncPayload drops items whose text does not resolve to a ref", () => {
  const s = state([pkg("p-a", "Mix", [item("excel"), item("tundmatu"), item("graafik")])]);
  const payload = buildSyncPayload(s, refOf);
  assert.deepEqual(payload[0].outcome_refs, [REFS.excel, REFS.graafik], "only resolvable kept");
});

// ── buildSyncPayload — EDGE: a package with ALL outcomes unresolvable ─────────
test("buildSyncPayload SKIPS a package whose refs end up empty", () => {
  const s = state([
    pkg("p-a", "Lahendub", [item("excel")]),
    pkg("p-empty", "Ei lahendu", [item("tundmatu"), item("muu")]), // 0 resolvable
  ]);
  const payload = buildSyncPayload(s, refOf);
  assert.equal(payload.length, 1, "the all-unresolvable package is skipped");
  assert.equal(payload[0].client_id, "p-a");
});

test("buildSyncPayload on an empty state returns an empty array", () => {
  assert.deepEqual(buildSyncPayload(state([]), refOf), []);
});

// ── buildSyncPayload — dedup of refs within a package ─────────────────────────
test("buildSyncPayload dedupes refs (keep first occurrence) within a package", () => {
  // Two distinct keys can resolve to the same ref → deduped to one.
  const dupRefOf = (t) => (t === "a" || t === "b" ? "out_dup" : t === "graafik" ? REFS.graafik : null);
  const s = state([pkg("p-a", "Dup", [item("a"), item("b"), item("graafik")])]);
  const payload = buildSyncPayload(s, dupRefOf);
  assert.deepEqual(payload[0].outcome_refs, ["out_dup", REFS.graafik], "dup ref appears once");
});

// ── buildSyncPayload — idempotent re-sync: known package_ref echoed back ──────
test("buildSyncPayload includes a known, valid package_ref (idempotent re-sync)", () => {
  const s = state([
    pkg("p-a", "A", [item("excel")]),
    pkg("p-b", "B", [item("graafik")]),
  ]);
  const VALID = "pkg_" + "a".repeat(24);
  const known = (id) => (id === "p-a" ? VALID : id === "p-b" ? "not-a-pkg-ref" : undefined);
  const payload = buildSyncPayload(s, refOf, known);
  const a = payload.find((p) => p.client_id === "p-a");
  const b = payload.find((p) => p.client_id === "p-b");
  assert.equal(a.package_ref, VALID, "valid known ref is echoed so the server reuses it");
  assert.equal("package_ref" in b, false, "an invalid known ref is NOT sent (server would mint a fresh one)");
  // No 3rd arg → no package_ref at all (backward compatible).
  const plain = buildSyncPayload(s, refOf);
  assert.equal("package_ref" in plain[0], false, "2-arg call carries no package_ref");
});

// ── buildSyncPayload — server caps (50 packages, 50 refs each) ────────────────
test("buildSyncPayload caps at 50 packages", () => {
  const packages = Array.from({ length: 60 }, (_, i) =>
    pkg(`p-${i}`, `Pakett ${i}`, [item("excel")]),
  );
  const payload = buildSyncPayload(state(packages), refOf);
  assert.equal(payload.length, 50, "no more than 50 packages sent");
  assert.equal(payload[0].client_id, "p-0", "first 50 kept, in order");
  assert.equal(payload[49].client_id, "p-49");
});

test("buildSyncPayload caps at 50 refs per package", () => {
  // 60 distinct keys, each resolving to a distinct ref.
  const items = Array.from({ length: 60 }, (_, i) => item(`k${i}`));
  const manyRefOf = (t) => {
    const m = /^k(\d+)$/.exec(t);
    return m ? `out_${m[1].padStart(24, "0")}` : null;
  };
  const payload = buildSyncPayload(state([pkg("p-a", "Suur", items)]), manyRefOf);
  assert.equal(payload[0].outcome_refs.length, 50, "no more than 50 refs per package");
  assert.equal(payload[0].outcome_refs[0], "out_000000000000000000000000");
});

// ── namesFromSync — ref -> name join ──────────────────────────────────────────
test("namesFromSync maps package_ref -> local name via client_id join", () => {
  const s = state([
    pkg("p-a", "Raamatupidaja", [item("excel")]),
    pkg("p-b", "Müügijuht", [item("graafik")]),
  ]);
  const synced = [
    { client_id: "p-a", package_ref: "pkg_aaa" },
    { client_id: "p-b", package_ref: "pkg_bbb" },
  ];
  assert.deepEqual(namesFromSync(s, synced), {
    pkg_aaa: "Raamatupidaja",
    pkg_bbb: "Müügijuht",
  });
});

test("namesFromSync ignores synced rows with no matching local package", () => {
  const s = state([pkg("p-a", "Raamatupidaja", [item("excel")])]);
  const synced = [
    { client_id: "p-a", package_ref: "pkg_aaa" },
    { client_id: "p-ghost", package_ref: "pkg_zzz" }, // no local pkg → skipped
  ];
  assert.deepEqual(namesFromSync(s, synced), { pkg_aaa: "Raamatupidaja" });
});

test("namesFromSync on an empty server response is an empty map", () => {
  const s = state([pkg("p-a", "Raamatupidaja", [item("excel")])]);
  assert.deepEqual(namesFromSync(s, []), {});
});

// ── packagesUnsyncable — gentle UI note count ─────────────────────────────────
test("packagesUnsyncable counts packages with zero resolvable refs", () => {
  const s = state([
    pkg("p-a", "Lahendub", [item("excel")]),            // syncable
    pkg("p-empty", "Ei lahendu", [item("tundmatu")]),   // 0 refs
    pkg("p-blank", "Tühi", []),                          // 0 items → 0 refs
  ]);
  assert.equal(packagesUnsyncable(s, refOf), 2);
});

test("packagesUnsyncable is 0 when every package has a resolvable outcome", () => {
  const s = state([
    pkg("p-a", "A", [item("excel"), item("tundmatu")]), // at least one resolves
    pkg("p-b", "B", [item("graafik")]),
  ]);
  assert.equal(packagesUnsyncable(s, refOf), 0);
});

// ── EDGE consistency: skipped-in-payload == unsyncable count ───────────────────
test("packages skipped by buildSyncPayload equal packagesUnsyncable count", () => {
  const s = state([
    pkg("p-a", "A", [item("excel")]),
    pkg("p-b", "B", [item("tundmatu")]),
    pkg("p-c", "C", [item("graafik")]),
    pkg("p-d", "D", []),
  ]);
  const sent = buildSyncPayload(s, refOf).length;
  const unsyncable = packagesUnsyncable(s, refOf);
  assert.equal(sent, 2, "p-a and p-c are syncable");
  assert.equal(unsyncable, 2, "p-b and p-d are not");
  assert.equal(sent + unsyncable, s.packages.length, "every package is accounted for");
});
