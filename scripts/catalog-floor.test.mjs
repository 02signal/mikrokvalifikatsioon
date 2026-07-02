// Build-time FLOOR GATE for the catalog source of truth (self-correcting register).
//
// WHY: the catalog content lands via repo PRs (e.g. EHIS overrides), so the
// committed snapshot (`src/data/catalog/*.json`) is the AUTHORITATIVE source. A
// stale or bad data source must NEVER silently degrade the live site (fewer
// programmes shown, fewer EHIS-verified matches in the hero "X programmi" count).
//
// HOW: using the SAME modules the site uses, this gate asserts the built
// `catalog` never regresses below the committed snapshot — neither in entry
// count nor in EHIS matches. It is self-adjusting (no hardcoded 148/169): the
// floor is recomputed from the committed JSON every build, plus a sane absolute
// backstop. Any future regression (a bad feed, an edit that breaks matching)
// FAILS `npm run build` → caught before deploy.
//
// Zero deps (node:test). Node imports the .ts source directly (native
// type-strip) and the committed JSON directly, mirroring how the site loads
// them. Runs as the first step of `npm run build` — the pre-commit/pre-deploy gate.
import test from "node:test";
import assert from "node:assert/strict";

// The committed snapshot — the AUTHORITATIVE source of truth.
import taltech from "../src/data/catalog/taltech.json" with { type: "json" };
import tartuYlikool from "../src/data/catalog/tartu-ylikool.json" with { type: "json" };
import muudKoolid from "../src/data/catalog/muud-koolid.json" with { type: "json" };

// The built catalog (whatever source the loader chose) + the EHIS matcher — the
// SAME modules the site renders from. `catalogSource` tells us which source won.
// `chooseCatalogSource` is the pure source-selection decision (trust + shape +
// non-regression), exercised below with fixtures.
import { catalog, catalogSource, chooseCatalogSource } from "../src/data/catalog/index.ts";
import { matchForCatalogEntry } from "../src/data/ehisFacts/index.ts";

// ── Recompute the committed floor directly from the *.json (self-adjusting) ──
// Only `status: "active"` (or status-less) entries reach the public site — match
// the loader's `activeOnly` filter so the floor is apples-to-apples.
const committedActive = [...taltech, ...tartuYlikool, ...muudKoolid].filter(
  (p) => !p.status || p.status === "active"
);
const committedCount = committedActive.length;
const committedMatches = committedActive.filter(
  (e) => matchForCatalogEntry(e).confidence !== "none"
).length;

// ── What the site will actually render ──────────────────────────────────────
const builtCount = catalog.length;
const builtMatches = catalog.filter((e) => matchForCatalogEntry(e).confidence !== "none").length;

test("catalog floor: built entry count never drops below the committed snapshot", () => {
  assert.ok(
    builtCount >= committedCount,
    `catalog REGRESSION: built ${builtCount} programmi < committed ${committedCount} ` +
      `(source=${catalogSource}). The committed snapshot is authoritative — a feed or ` +
      `data edit must never drop entries.`
  );
});

test("catalog floor: built EHIS matches never drop below the committed snapshot", () => {
  // This is the hero "X programmi" (EHIS-verified) number. The stale-feed bug
  // showed 122 instead of 148 because the feed had older programme NAMES that
  // broke EHIS name-matching. This assertion catches exactly that class of bug.
  assert.ok(
    builtMatches >= committedMatches,
    `EHIS-match REGRESSION: built ${builtMatches} matches < committed ${committedMatches} ` +
      `(source=${catalogSource}). A stale source with older names breaks EHIS name-matching ` +
      `and silently shrinks the hero count.`
  );
});

test("catalog floor: absolute backstop (count >= 150, matches >= 140)", () => {
  // A conservative absolute floor so even a wholesale data corruption is caught,
  // independent of the committed-vs-built comparison above.
  assert.ok(builtCount >= 150, `catalog below absolute floor: ${builtCount} programmi < 150`);
  assert.ok(builtMatches >= 140, `EHIS matches below absolute floor: ${builtMatches} < 140`);
});

// ── Source-selection decision (the stale-feed bug, pinned) ───────────────────
// `chooseCatalogSource` is the pure trust + shape + non-regression gate. These
// fixtures simulate the exact production scenarios the fix targets.
const C = committedCount; // committed active count (the non-regression floor)

test("source: feed URL set but NOT trusted → committed (the production default today)", () => {
  // Today production has PUBLIC_CATALOG_FEED_URL set and no trust flag → must use
  // the committed snapshot, NO Vercel env change needed.
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: false,
    data: { programs: Array.from({ length: C + 50 }, (_, i) => ({ provider: "X", name: `p${i}` })) },
    committedCount: C
  });
  assert.equal(d.use, "committed", "untrusted feed must never be used");
  assert.match(d.reason, /PUBLIC_CATALOG_FEED_TRUSTED/);
});

test("source: trusted feed that DROPS entries (stale-feed regression) → committed", () => {
  // The actual bug: a stale feed with fewer/older entries (122 vs 148). Even when
  // trusted, the non-regression guard must REJECT it and fall back to committed.
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: true,
    data: { programs: Array.from({ length: C - 1 }, (_, i) => ({ provider: "X", name: `p${i}` })) },
    committedCount: C
  });
  assert.equal(d.use, "committed", "a feed that drops entries must be rejected");
  assert.match(d.reason, /kaotaks kirjeid/);
});

test("source: trusted, well-formed, NON-regressing feed → feed (opt-in works)", () => {
  // When the AMOS feed is fixed + known-good, trusting it re-enables it.
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => ({ provider: "X", name: `p${i}` }));
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: true,
    data: { programs: feedEntries, checkedAt: "2026-06-25", generatedAt: "2026-06-25", contentHash: "abc" },
    committedCount: C
  });
  assert.equal(d.use, "feed", "a trusted non-regressing feed should be accepted");
  if (d.use === "feed") {
    assert.equal(d.entries.length, feedEntries.length);
    assert.equal(d.contentHash, "abc");
  }
});

test("source: trusted but malformed feed (no programs[]) → committed", () => {
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: true,
    data: { unexpected: true },
    committedCount: C
  });
  assert.equal(d.use, "committed");
  assert.match(d.reason, /vigase kujuga/);
});

test("source: trusted but fetch failed (data null) → committed", () => {
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: true,
    data: null,
    committedCount: C
  });
  assert.equal(d.use, "committed");
});

test("source: feed accepts an active-only count that meets the floor (status filtered)", () => {
  // Inactive entries are filtered before the non-regression check — a feed with
  // exactly `committedCount` ACTIVE entries (plus some inactive) is accepted.
  const data = {
    programs: [
      ...Array.from({ length: C }, (_, i) => ({ provider: "X", name: `a${i}`, status: "active" })),
      { provider: "X", name: "archived", status: "archived" }
    ]
  };
  const d = chooseCatalogSource({ feedUrl: "u", trusted: true, data, committedCount: C });
  assert.equal(d.use, "feed");
  if (d.use === "feed") assert.equal(d.entries.length, C, "archived entry filtered out");
});

// ── Defense-in-depth gates (2026-07-01): schemaVersion / count / forbidden keys ──
// Real AMOS feeds always carry schemaVersion + count (see
// mkval-catalog-feed-contract.mjs), so these gates only ever REJECT a present-
// but-wrong value — they never affect the bare fixtures above (no schemaVersion
// field there), keeping the pinned stale-feed-bug tests unchanged.
test("source: trusted feed with an unknown schemaVersion → committed", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => ({ provider: "X", name: `p${i}` }));
  const d = chooseCatalogSource({
    feedUrl: "u",
    trusted: true,
    data: { schemaVersion: "amos.mkval.catalog/v99", programs: feedEntries },
    committedCount: C
  });
  assert.equal(d.use, "committed");
  assert.match(d.reason, /schemaVersion/);
});

test("source: trusted feed whose count disagrees with programs.length → committed", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => ({ provider: "X", name: `p${i}` }));
  const d = chooseCatalogSource({
    feedUrl: "u",
    trusted: true,
    data: { schemaVersion: "amos.mkval.catalog/v1", count: feedEntries.length - 1, programs: feedEntries },
    committedCount: C
  });
  assert.equal(d.use, "committed");
  assert.match(d.reason, /count/);
});

test("source: trusted feed carrying a forbidden field (e.g. email) → committed", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => ({ provider: "X", name: `p${i}` }));
  feedEntries[0].email = "leak@example.com";
  const d = chooseCatalogSource({
    feedUrl: "u",
    trusted: true,
    data: { programs: feedEntries },
    committedCount: C
  });
  assert.equal(d.use, "committed");
  assert.match(d.reason, /keelatud/);
});

test("source: trusted feed with correct schemaVersion + count is still accepted", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => ({ provider: "X", name: `p${i}` }));
  const d = chooseCatalogSource({
    feedUrl: "u",
    trusted: true,
    data: { schemaVersion: "amos.mkval.catalog/v1", count: feedEntries.length, programs: feedEntries },
    committedCount: C
  });
  assert.equal(d.use, "feed");
});

// Visible during the build so the chosen source + counts are auditable in logs.
console.log(
  `[catalog-floor] source=${catalogSource} | committed: ${committedCount} entries / ${committedMatches} EHIS matches` +
    ` | built: ${builtCount} entries / ${builtMatches} EHIS matches`
);
