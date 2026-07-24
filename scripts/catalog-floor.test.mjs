// Build-time FLOOR GATE for the canonical catalog (self-correcting register).
//
// WHY: the coordinated LKG feed is the committed source for public facts. The
// older `src/data/catalog/*.json` files are NOT a fallback; they retain only the
// historical EHIS identity/floor needed when listing names change. A stale or
// bad data source must NEVER silently degrade the live site (fewer programmes
// shown, fewer EHIS-verified matches in the hero "X programmi" count).
//
// HOW: using the SAME modules the site uses, this gate asserts the built
// `catalog` never regresses below the canonical LKG entry count or historical
// EHIS match floor. It is self-adjusting (no hardcoded 148/169), plus a sane
// absolute backstop. Any future regression FAILS `npm run build`.
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
import lkgFeed from "../src/data/catalog/credential-commons-lkg/catalog-feed.json" with { type: "json" };

// The built catalog (whatever source the loader chose) + the EHIS matcher — the
// SAME modules the site renders from. `catalogSource` tells us which source won.
// `chooseCatalogSource` is the pure source-selection decision (trust + shape +
// non-regression), exercised below with fixtures.
import {
  catalog,
  catalogSource,
  chooseCatalogSource,
  declaredContentHashError,
  entryForEhisMatch,
  matchesJsonContentType,
  recomputeCatalogContentHash
} from "../src/data/catalog/index.ts";
import { matchForCatalogEntry } from "../src/data/ehisFacts/index.ts";

// ── Recompute canonical count + historical EHIS floor (self-adjusting) ───────
// Only `status: "active"` (or status-less) entries reach the public site.
const legacyActive = [...taltech, ...tartuYlikool, ...muudKoolid].filter(
  (p) => !p.status || p.status === "active"
);
const canonicalActive = lkgFeed.programs.filter((p) => !p.status || p.status === "active");
const canonicalCount = canonicalActive.length;
const legacyEhisFloor = legacyActive.filter(
  (e) => matchForCatalogEntry(e).confidence !== "none"
).length;

// ── What the site will actually render ──────────────────────────────────────
const builtCount = catalog.length;
// The catalog already carries the actual match decision and official EHIS
// metadata. Do not rematch an official normalized display name: duplicate
// official names can be ambiguous even though the original identity resolved.
const builtMatches = catalog.filter((e) => e.ehis.authoritative).length;

test("catalog floor: built entry count never drops below the committed snapshot", () => {
  assert.ok(
    builtCount >= canonicalCount,
    `catalog REGRESSION: built ${builtCount} programmi < committed ${canonicalCount} ` +
      `(source=${catalogSource}). The committed LKG is authoritative — a feed or ` +
      `data edit must never drop entries.`
  );
});

test("catalog floor: built EHIS matches never drop below the committed snapshot", () => {
  // This is the hero "X programmi" (EHIS-verified) number. The stale-feed bug
  // showed 122 instead of 148 because the feed had older programme NAMES that
  // broke EHIS name-matching. This assertion catches exactly that class of bug.
  assert.ok(
    builtMatches >= legacyEhisFloor,
    `EHIS-match REGRESSION: built ${builtMatches} matches < historical floor ${legacyEhisFloor} ` +
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

test("EHIS identity aliases restore the historical floor without becoming catalog facts", () => {
  const directMatches = canonicalActive.filter(
    (entry) => matchForCatalogEntry(entry).confidence !== "none"
  ).length;
  const resolvedMatches = canonicalActive.filter(
    (entry) =>
      matchForCatalogEntry(entry).confidence !== "none" ||
      matchForCatalogEntry(entryForEhisMatch(entry)).confidence !== "none"
  ).length;

  assert.ok(resolvedMatches > directMatches, "the current LKG must exercise the bounded identity-alias path");
  assert.ok(
    resolvedMatches >= legacyEhisFloor,
    `current identity + aliases resolved ${resolvedMatches} EHIS matches < historical floor ${legacyEhisFloor}`
  );

  const recovered = canonicalActive.find(
    (entry) =>
      matchForCatalogEntry(entry).confidence === "none" &&
      matchForCatalogEntry(entryForEhisMatch(entry)).confidence !== "none"
  );
  assert.ok(recovered, "expected at least one current AMOS row recovered by a legacy identity alias");
  const matchInput = entryForEhisMatch(recovered);
  for (const key of [
    "id", "url", "summary", "goalText", "intakeText", "priceText", "durationText",
    "format", "outcomes", "outcomeObjects", "assessmentText", "field",
    "providerType", "sourceCheckedAt"
  ]) {
    assert.deepEqual(
      matchInput[key],
      recovered[key],
      `legacy EHIS alias must not replace current AMOS ${key}`
    );
  }
});

test("a legacy alias never suppresses a valid current-identity EHIS match", () => {
  const outputById = new Map(catalog.map((entry) => [entry.id, entry]));
  const currentOnlyMatches = canonicalActive.filter(
    (entry) =>
      matchForCatalogEntry(entry).confidence !== "none" &&
      matchForCatalogEntry(entryForEhisMatch(entry)).confidence === "none"
  );
  assert.ok(currentOnlyMatches.length > 0, "fixture must exercise current-match precedence over a stale alias");
  for (const current of currentOnlyMatches) {
    assert.equal(
      outputById.get(current.id)?.ehis.authoritative,
      true,
      `valid current EHIS match must survive for ${current.id}`
    );
  }
});

test("catalog output keeps current AMOS facts; only official EHIS facts may override", () => {
  const outputById = new Map(catalog.map((entry) => [entry.id, entry]));
  const officialOverrideKeys = new Set(["name", "ects", "language"]);
  for (const current of canonicalActive) {
    const output = outputById.get(current.id);
    assert.ok(output, `missing canonical AMOS row ${current.id}`);
    for (const [key, value] of Object.entries(current)) {
      if (officialOverrideKeys.has(key)) continue;
      assert.deepEqual(output[key], value, `catalog must preserve current AMOS ${key} for ${current.id}`);
    }
  }
});

test("canonical IDs absent from the legacy crosswalk use current EHIS matching", () => {
  const directMatch = canonicalActive.find(
    (entry) => matchForCatalogEntry(entry).confidence !== "none"
  );
  assert.ok(directMatch, "fixture must contain a current-identity EHIS match");
  const newProgramme = { ...directMatch, id: "future-canonical-programme" };
  assert.strictEqual(
    entryForEhisMatch(newProgramme),
    newProgramme,
    "unknown canonical id must use the current AMOS record unchanged"
  );
  assert.notEqual(
    matchForCatalogEntry(entryForEhisMatch(newProgramme)).confidence,
    "none",
    "unknown canonical id must still use normal current-identity matching"
  );
});

// ── Source-selection decision (the stale-feed bug, pinned) ───────────────────
// `chooseCatalogSource` is the pure trust + shape + non-regression gate. These
// fixtures simulate the exact production scenarios the fix targets.
const C = canonicalCount; // committed LKG active count (the non-regression floor)
const canonicalRow = (i, prefix = "p") => ({ provider: "X", name: `${prefix}${i}`, id: `${prefix}-${i}` });

test("source: feed URL set but NOT trusted → committed (the production default today)", () => {
  // Today production has PUBLIC_CATALOG_FEED_URL set and no trust flag → must use
  // the committed snapshot, NO Vercel env change needed.
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: false,
    data: { programs: Array.from({ length: C + 50 }, (_, i) => canonicalRow(i)) },
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
    data: { programs: Array.from({ length: C - 1 }, (_, i) => canonicalRow(i)) },
    committedCount: C
  });
  assert.equal(d.use, "committed", "a feed that drops entries must be rejected");
  assert.match(d.reason, /kaotaks kirjeid/);
});

test("source: trusted, well-formed, NON-regressing feed → feed (opt-in works)", () => {
  // When the AMOS feed is fixed + known-good, trusting it re-enables it.
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
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

test("source: 'kontrollitud' tuleb checkedAt-st ja 'uuendatud' dataUpdatedAt-st (mitte generatedAt)", () => {
  // Nädalane kontroll ilma sisumuutuseta: checkedAt/generatedAt on värske
  // (13.07), aga andmed muutusid viimati 06.06. "Uuendatud" peab näitama
  // tegelikku muutuse kuupäeva, "kontrollitud" viimast kontrolli.
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: true,
    data: {
      programs: feedEntries,
      checkedAt: "2026-07-13",
      dataUpdatedAt: "2026-06-06",
      generatedAt: "2026-07-13T00:45:00.000Z",
      contentHash: "abc",
    },
    committedCount: C,
  });
  assert.equal(d.use, "feed");
  if (d.use === "feed") {
    assert.equal(d.checkedAt, "2026-07-13", "kontrollitud = checkedAt");
    assert.equal(d.updatedAt, "2026-06-06", "uuendatud = dataUpdatedAt, mitte generatedAt");
  }
});

test("source: dataUpdatedAt puudumisel taandub 'uuendatud' generatedAt-le (tagasiühilduvus)", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
  const d = chooseCatalogSource({
    feedUrl: "https://amos.example/catalog-feed.json",
    trusted: true,
    data: { programs: feedEntries, checkedAt: "2026-07-13", generatedAt: "2026-07-10", contentHash: "abc" },
    committedCount: C,
  });
  assert.equal(d.use, "feed");
  if (d.use === "feed") assert.equal(d.updatedAt, "2026-07-10");
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
      ...Array.from({ length: C }, (_, i) => ({ ...canonicalRow(i, "active"), status: "active" })),
      { provider: "X", name: "archived", id: "archived-1", status: "archived" }
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
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
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
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
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
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
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
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i));
  const d = chooseCatalogSource({
    feedUrl: "u",
    trusted: true,
    data: { schemaVersion: "amos.mkval.catalog/v1", count: feedEntries.length, programs: feedEntries },
    committedCount: C
  });
  assert.equal(d.use, "feed");
});

test("source: duplicate canonical programme id → committed fallback", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i, "programme"));
  feedEntries[1].id = feedEntries[0].id;
  const d = chooseCatalogSource({ feedUrl: "u", trusted: true, data: { programs: feedEntries }, committedCount: C });
  assert.equal(d.use, "committed");
  if (d.use === "committed") assert.match(d.reason, /dubleeritud programmi id/);
});

test("source: malformed canonical programme id → committed fallback", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i, "programme"));
  feedEntries[0].id = "not a canonical id";
  const d = chooseCatalogSource({ feedUrl: "u", trusted: true, data: { programs: feedEntries }, committedCount: C });
  assert.equal(d.use, "committed");
  if (d.use === "committed") assert.match(d.reason, /vigane programmi id/);
});

test("source: AMOS programme id accepts underscore", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i, "underscore"));
  feedEntries[0].id = "programme_ref_1";
  const d = chooseCatalogSource({ feedUrl: "u", trusted: true, data: { programs: feedEntries }, committedCount: C });
  assert.equal(d.use, "feed");
});

test("source: AMOS programme id over 121 characters → committed fallback", () => {
  const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i, "length"));
  feedEntries[0].id = "a".repeat(122);
  const d = chooseCatalogSource({ feedUrl: "u", trusted: true, data: { programs: feedEntries }, committedCount: C });
  assert.equal(d.use, "committed");
  if (d.use === "committed") assert.match(d.reason, /vigane programmi id/);
});

test("source: missing or null canonical programme id → committed fallback", () => {
  for (const missingValue of [undefined, null]) {
    const feedEntries = Array.from({ length: C + 5 }, (_, i) => canonicalRow(i, "required"));
    if (missingValue === undefined) delete feedEntries[0].id;
    else feedEntries[0].id = missingValue;
    const d = chooseCatalogSource({ feedUrl: "u", trusted: true, data: { programs: feedEntries }, committedCount: C });
    assert.equal(d.use, "committed");
    if (d.use === "committed") assert.match(d.reason, /puuduv programmi id/);
  }
});

test("LKG feed: AMOS stable-JSON contentHash recomputes exactly", () => {
  assert.equal(declaredContentHashError(lkgFeed), null);
  assert.equal(recomputeCatalogContentHash(lkgFeed), lkgFeed.contentHash);
});

test("feed hash: one programme fact change with old declared hash is rejected", () => {
  const altered = {
    ...lkgFeed,
    programs: lkgFeed.programs.map((program, index) => index === 0 ? { ...program, name: `${program.name} muutunud` } : program)
  };
  assert.match(declaredContentHashError(altered) ?? "", /stable-JSON/);
});

test("feed transport: only application/json (with optional charset) is accepted", () => {
  assert.equal(matchesJsonContentType("application/json; charset=utf-8"), true);
  assert.equal(matchesJsonContentType("application/json"), true);
  assert.equal(matchesJsonContentType("application/ld+json"), false);
  assert.equal(matchesJsonContentType(null), false);
});

// Visible during the build so the chosen source + counts are auditable in logs.
console.log(
  `[catalog-floor] source=${catalogSource} | committed LKG: ${canonicalCount} entries` +
    ` | historical EHIS floor: ${legacyEhisFloor} | built: ${builtCount} entries / ${builtMatches} EHIS matches`
);
