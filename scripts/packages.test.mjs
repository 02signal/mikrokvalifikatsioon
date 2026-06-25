// Unit test for the multi-package data layer (CL-4, mkval-half).
//
// Pins the SHARED CONTRACT that three agents code against: the data layer
// (this module), the /oskused/ UI wiring, and the consumer audit. Everything
// here is deterministic — ids and timestamps are INJECTED via `seed`, never
// generated inside the module — so assertions are exact, not "best effort".
//
// Zero deps (node:test). Node imports the .ts source directly (native
// type-strip), mirroring skill-match.test.mjs / subscribe-wire.test.mjs.
// Runs as the first step of `npm run build` — the pre-commit gate.
import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  migrateLegacy,
  activePackage,
  ensureActive,
  createPackage,
  renamePackage,
  deletePackage,
  setActive,
  addItem,
  removeItem,
} from "../src/lib/packages.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────
const SEED_A = { id: "p-a", name: "Raamatupidaja", createdAt: 1000 };
const SEED_B = { id: "p-b", name: "Müügijuht", createdAt: 2000 };
const SEED_C = { id: "p-c", name: "Laojuht", createdAt: 3000 };

const item = (key, text = key, progs) => (progs ? { key, text, progs } : { key, text });

// ── emptyState ────────────────────────────────────────────────────────────────
test("emptyState has the exact v2 shape", () => {
  assert.deepEqual(emptyState(), { v: 2, packages: [], activeId: null });
});

// ── migrateLegacy — the lossless one ──────────────────────────────────────────
test("migrateLegacy: legacy array → ONE package, all items preserved", () => {
  const legacy = [item("excel"), item("graafik"), item("audit")];
  const s = migrateLegacy(legacy, null, SEED_A);
  assert.equal(s.v, 2);
  assert.equal(s.packages.length, 1);
  assert.equal(s.activeId, SEED_A.id);
  const pkg = s.packages[0];
  assert.equal(pkg.id, SEED_A.id);
  assert.equal(pkg.name, "Raamatupidaja");
  assert.equal(pkg.createdAt, 1000);
  // LOSSLESS: every legacy key survives, in order.
  assert.deepEqual(pkg.items.map((i) => i.key), ["excel", "graafik", "audit"]);
});

test("migrateLegacy: legacy items deduped by key (lossless = no dupes, keep first)", () => {
  const legacy = [item("excel", "esimene"), item("graafik"), item("excel", "teine")];
  const s = migrateLegacy(legacy, null, SEED_A);
  assert.deepEqual(s.packages[0].items.map((i) => i.key), ["excel", "graafik"]);
  // first occurrence wins (its text, not the later duplicate's)
  assert.equal(s.packages[0].items[0].text, "esimene");
});

test("migrateLegacy: valid v2 existing → returned UNCHANGED (already migrated)", () => {
  const existing = createPackage(emptyState(), SEED_B);
  // legacy is non-empty but must be IGNORED because existing is already v2.
  const s = migrateLegacy([item("ignored")], existing, SEED_A);
  assert.equal(s, existing, "must return the same reference, no re-migration");
  assert.equal(s.packages.length, 1);
  assert.equal(s.packages[0].id, SEED_B.id);
});

test("migrateLegacy: no legacy and no existing → emptyState", () => {
  assert.deepEqual(migrateLegacy(null, null, SEED_A), emptyState());
  assert.deepEqual(migrateLegacy([], null, SEED_A), emptyState());
});

// ── activePackage ─────────────────────────────────────────────────────────────
test("activePackage returns the active one or null", () => {
  assert.equal(activePackage(emptyState()), null);
  const s = createPackage(emptyState(), SEED_A);
  assert.equal(activePackage(s).id, SEED_A.id);
});

// ── ensureActive ──────────────────────────────────────────────────────────────
test("ensureActive creates a default when empty and makes it active", () => {
  const s = ensureActive(emptyState(), SEED_A);
  assert.equal(s.packages.length, 1);
  assert.equal(s.activeId, SEED_A.id);
  assert.deepEqual(s.packages[0].items, []);
});

test("ensureActive is a no-op (same ref) when an active package exists", () => {
  const base = createPackage(emptyState(), SEED_A);
  const s = ensureActive(base, SEED_B);
  assert.equal(s, base, "no new package, same reference");
  assert.equal(s.packages.length, 1);
});

test("ensureActive recreates when activeId dangles (points at no package)", () => {
  const broken = { v: 2, packages: [], activeId: "ghost" };
  const s = ensureActive(broken, SEED_A);
  assert.equal(s.packages.length, 1);
  assert.equal(s.activeId, SEED_A.id);
});

// ── createPackage ─────────────────────────────────────────────────────────────
test("createPackage adds a new empty package and makes IT active", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = createPackage(s, SEED_B);
  assert.equal(s.packages.length, 2);
  assert.equal(s.activeId, SEED_B.id, "newest becomes active");
  assert.deepEqual(activePackage(s).items, []);
});

// ── addItem ───────────────────────────────────────────────────────────────────
test("addItem adds to the ACTIVE package", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = createPackage(s, SEED_B); // B is active
  s = addItem(s, item("excel"));
  assert.deepEqual(s.packages.find((p) => p.id === SEED_B.id).items.map((i) => i.key), ["excel"]);
  assert.deepEqual(s.packages.find((p) => p.id === SEED_A.id).items, [], "A untouched");
});

test("addItem dedupes by key — no duplicate keys in a package", () => {
  let s = addItem(ensureActive(emptyState(), SEED_A), item("excel", "first"));
  s = addItem(s, item("excel", "second"));
  assert.equal(activePackage(s).items.length, 1);
  assert.equal(activePackage(s).items[0].text, "first", "existing kept, dup ignored");
});

test("addItem does NOT mutate the input state or its arrays", () => {
  const base = ensureActive(emptyState(), SEED_A);
  const snapshotLen = base.packages[0].items.length;
  const next = addItem(base, item("excel"));
  assert.notEqual(next, base, "returns a new state");
  assert.notEqual(next.packages, base.packages, "new packages array");
  assert.notEqual(next.packages[0].items, base.packages[0].items, "new items array");
  assert.equal(base.packages[0].items.length, snapshotLen, "input items unchanged");
});

// ── removeItem ────────────────────────────────────────────────────────────────
test("removeItem removes by key from the active package", () => {
  let s = ensureActive(emptyState(), SEED_A);
  s = addItem(s, item("excel"));
  s = addItem(s, item("graafik"));
  s = removeItem(s, "excel");
  assert.deepEqual(activePackage(s).items.map((i) => i.key), ["graafik"]);
});

test("removeItem of a missing key is a no-op (same ref)", () => {
  let base = addItem(ensureActive(emptyState(), SEED_A), item("excel"));
  const s = removeItem(base, "puudub");
  assert.equal(s, base);
});

// ── renamePackage — name hygiene ──────────────────────────────────────────────
test("renamePackage trims and collapses internal whitespace", () => {
  const base = createPackage(emptyState(), SEED_A);
  const s = renamePackage(base, SEED_A.id, "   Pea   raamatu\tpidaja  ");
  assert.equal(activePackage(s).name, "Pea raamatu pidaja");
});

test("renamePackage caps at 60 chars", () => {
  const base = createPackage(emptyState(), SEED_A);
  const long = "x".repeat(120);
  const s = renamePackage(base, SEED_A.id, long);
  assert.equal(activePackage(s).name.length, 60);
});

test("renamePackage empty-after-trim falls back to the existing name", () => {
  const base = createPackage(emptyState(), SEED_A); // name "Raamatupidaja"
  const s = renamePackage(base, SEED_A.id, "    ");
  assert.equal(activePackage(s).name, "Raamatupidaja", "empty rename keeps old name");
});

test("renamePackage on unknown id is a no-op (same ref)", () => {
  const base = createPackage(emptyState(), SEED_A);
  assert.equal(renamePackage(base, "ghost", "X"), base);
});

// ── deletePackage — active-fallback semantics ─────────────────────────────────
test("deletePackage active → first remaining becomes active", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = createPackage(s, SEED_B);
  s = createPackage(s, SEED_C); // C active, order [A, B, C]
  s = deletePackage(s, SEED_C.id);
  assert.deepEqual(s.packages.map((p) => p.id), [SEED_A.id, SEED_B.id]);
  assert.equal(s.activeId, SEED_A.id, "falls back to FIRST remaining");
});

test("deletePackage of a non-active package keeps activeId stable", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = createPackage(s, SEED_B); // B active
  s = deletePackage(s, SEED_A.id);
  assert.equal(s.activeId, SEED_B.id, "active untouched when deleting another");
});

test("deletePackage of the last package → activeId null", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = deletePackage(s, SEED_A.id);
  assert.deepEqual(s.packages, []);
  assert.equal(s.activeId, null);
});

test("deletePackage of unknown id is a no-op (same ref)", () => {
  const base = createPackage(emptyState(), SEED_A);
  assert.equal(deletePackage(base, "ghost"), base);
});

// ── setActive ─────────────────────────────────────────────────────────────────
test("setActive switches the active package", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = createPackage(s, SEED_B); // B active
  s = setActive(s, SEED_A.id);
  assert.equal(s.activeId, SEED_A.id);
});

test("setActive to an unknown id is a no-op (same ref)", () => {
  const base = createPackage(emptyState(), SEED_A);
  assert.equal(setActive(base, "ghost"), base);
});

// ── immutability sweep across the mutating ops ────────────────────────────────
test("renamePackage / deletePackage / setActive do not mutate input", () => {
  let s = createPackage(emptyState(), SEED_A);
  s = createPackage(s, SEED_B);
  const frozen = JSON.stringify(s);
  renamePackage(s, SEED_A.id, "uus");
  deletePackage(s, SEED_A.id);
  setActive(s, SEED_A.id);
  assert.equal(JSON.stringify(s), frozen, "original state object is untouched");
});
