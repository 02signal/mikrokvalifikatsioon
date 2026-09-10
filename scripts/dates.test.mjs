// Unit test for src/data/dates.ts's start-date rendering (formatStartEt) and
// the registreerimine month-grouping (groupByStartMonth/sortedByStart).
//
// WHY: AMOS's catalog feed (PR-3c, 2026-09-08) added month-only precision for
// an announced study start — "algab septembris", where the school never
// stated a day. The owner's explicit rule: NEVER fabricate a day for that
// case (no 2026-09-01 stand-in). Before this, the site's startDate handling
// only ever knew a real ISO day; a month-only entry silently rendered
// nothing anywhere on the site. formatStartEt is the ONE place that decides
// what a visitor sees for a programme's start, used at all four render
// sites (kataloog/[slug].astro, registreerimine/index.astro, llms-full.txt,
// courseSchema.ts) — this test pins its three cases directly, and pins the
// grouping helper's month-only handling with a synthetic fixture (not the
// live catalogue, which — MEASURED 2026-09-09 — carries no month-precision
// entries yet: the committed snapshot predates PR-3c).
//
// Zero deps (node:test). Node imports the .ts source directly (native
// type-strip), mirroring price-guard.test.mjs / skill-match.test.mjs. Runs
// as part of `npm run build`.
import test from "node:test";
import assert from "node:assert/strict";

import { formatStartEt, groupByStartMonth, resolveCatalogStartDate, sortedByStart } from "../src/data/dates.ts";

test("formatStartEt: day precision renders the real day (DD.MM.YYYY)", () => {
  assert.equal(
    formatStartEt({ startDate: "2026-08-31", startMonth: "2026-08", startDatePrecision: "day" }),
    "31.08.2026"
  );
});

test("formatStartEt: a legacy record with startDate but no precision field also renders the real day", () => {
  assert.equal(formatStartEt({ startDate: "2026-08-31" }), "31.08.2026");
});

test("formatStartEt: month precision renders the month+year, never a fabricated day", () => {
  assert.equal(
    formatStartEt({ startDate: null, startMonth: "2026-09", startDatePrecision: "month" }),
    "september 2026 (täpne päev täpsustamisel)"
  );
});

test("formatStartEt: month precision with no startMonth (malformed) is null, not a guess", () => {
  assert.equal(formatStartEt({ startDate: null, startMonth: null, startDatePrecision: "month" }), null);
});

test("formatStartEt: no known start at all is null", () => {
  assert.equal(formatStartEt({}), null);
  assert.equal(formatStartEt({ startDate: null, startMonth: null, startDatePrecision: null }), null);
});

// --- registreerimine grouping ------------------------------------------

function entry(id, fields) {
  return { id, name: id, provider: "Fixture Provider", slug: id, ...fields };
}

test("groupByStartMonth: a month-only entry joins the same calendar-month group as day-precise siblings, sorted last within it", () => {
  const fixture = [
    entry("day-early", { startDate: "2026-09-05", startDatePrecision: "day" }),
    entry("month-only", { startDate: null, startMonth: "2026-09", startDatePrecision: "month" }),
    entry("day-late", { startDate: "2026-09-20", startDatePrecision: "day" })
  ];
  const groups = groupByStartMonth(fixture);
  assert.equal(groups.length, 1, "all three entries share the same September group");
  assert.equal(groups[0].key, "2026-09");
  assert.equal(groups[0].label, "September 2026");
  assert.deepEqual(
    groups[0].entries.map((e) => e.id),
    ["day-early", "day-late", "month-only"],
    "the month-only entry sorts AFTER every day-precise entry in the same month, never before or interleaved"
  );
});

test("groupByStartMonth: cross-month order stays chronological when an earlier month has only a month-only entry", () => {
  const fixture = [
    entry("september-day", { startDate: "2026-09-01", startDatePrecision: "day" }),
    entry("august-month-only", { startDate: null, startMonth: "2026-08", startDatePrecision: "month" })
  ];
  const groups = groupByStartMonth(fixture);
  assert.deepEqual(
    groups.map((g) => g.key),
    ["2026-08", "2026-09"],
    "August's month-only group must still come before September's day-precise group"
  );
});

test("groupByStartMonth / sortedByStart: an entry with no known start at all is excluded entirely", () => {
  const fixture = [
    entry("known", { startDate: "2026-09-01", startDatePrecision: "day" }),
    entry("unknown", { startDate: null, startMonth: null, startDatePrecision: null })
  ];
  assert.deepEqual(sortedByStart(fixture).map((e) => e.id), ["known"]);
  assert.equal(groupByStartMonth(fixture).flatMap((g) => g.entries).length, 1);
});

// --- PR-3g: hide past starts when no future intake ----------------------
//
// AMOS's catalog feed (PR-3g, mkval-catalog-feed-contract.mjs's
// deriveMkvalNextStartVisibility) adds `nextStartKnown: false` when a
// programme has no future intake start and no future registration
// deadline anywhere — startDate/startMonth/startDatePrecision are already
// null on that record from AMOS. The committed snapshot
// (src/data/catalog/credential-commons-lkg/catalog-feed.json, generatedAt
// 2026-08-31) predates this AMOS release and carries no nextStartKnown
// field at all — MEASURED, same as PR-3d/#131's month-precision case — so
// these tests use synthetic fixtures; the behaviour activates automatically
// once a real AMOS deploy serves a nextStartKnown: false entry.

test("formatStartEt: nextStartKnown false renders the honest placeholder, regardless of any stale startDate/startMonth still on the record", () => {
  assert.equal(
    formatStartEt({ nextStartKnown: false, startDate: null, startMonth: null, startDatePrecision: null }),
    "järgmine algus täpsustamisel"
  );
  // Defense-in-depth: nextStartKnown false wins even over a startDate a
  // future bug might leave on the record — AMOS's own blanking is not the
  // only thing this decision relies on.
  assert.equal(
    formatStartEt({ nextStartKnown: false, startDate: "2023-08-30", startDatePrecision: "day" }),
    "järgmine algus täpsustamisel"
  );
});

test("formatStartEt: nextStartKnown true (or absent, legacy) is unaffected — normal day/month rendering", () => {
  assert.equal(formatStartEt({ nextStartKnown: true, startDate: "2026-08-31" }), "31.08.2026");
  assert.equal(formatStartEt({ startDate: "2026-08-31" }), "31.08.2026", "absent nextStartKnown behaves exactly like true");
});

test("groupByStartMonth / sortedByStart: nextStartKnown false is excluded, even if startDate/startMonth were somehow still present", () => {
  const fixture = [
    entry("visible", { startDate: "2026-09-01", startDatePrecision: "day", nextStartKnown: true }),
    entry("hidden-clean", { startDate: null, startMonth: null, startDatePrecision: null, nextStartKnown: false }),
    // Defense-in-depth case: nextStartKnown false must exclude the entry
    // even if a stale startDate were somehow still attached to it.
    entry("hidden-stale-date", { startDate: "2023-08-30", startDatePrecision: "day", nextStartKnown: false })
  ];
  assert.deepEqual(sortedByStart(fixture).map((e) => e.id), ["visible"]);
  assert.equal(groupByStartMonth(fixture).flatMap((g) => g.entries).length, 1);
});

// resolveCatalogStartDate: src/data/catalog/index.ts's own startDate
// resolution (not just formatStartEt's rendering) — this is where a REAL
// regression would have shipped without PR-3g: nextStartKnown false must
// win over the legacy intakeText-parsed fallback, or an already-hidden
// programme would silently un-hide itself the moment AMOS's startDate
// went to null.
test("resolveCatalogStartDate: nextStartKnown false suppresses the legacy intakeText fallback entirely", () => {
  assert.equal(
    resolveCatalogStartDate({
      nextStartKnown: false,
      startDate: null,
      startDatePrecision: null,
      // A stale but still date-shaped free-text field — WITHOUT the
      // nextStartKnown check, parseIntakeDates would resurrect this exact
      // date as startDate, silently un-hiding the programme.
      intakeText: "Registreerimine avatud; õpe algab 15.01.2024"
    }),
    null,
    "the legacy fallback must never resurrect a stale intakeText date once AMOS has already hidden the start"
  );
});

test("resolveCatalogStartDate: nextStartKnown true (or absent) still applies the legacy intakeText fallback exactly as before PR-3g", () => {
  assert.equal(
    resolveCatalogStartDate({
      startDate: null,
      startDatePrecision: null,
      intakeText: "Registreerimine avatud; õpe algab 15.01.2027"
    }),
    "2027-01-15"
  );
});

test("resolveCatalogStartDate: month precision never falls back to the legacy intakeText day, regardless of nextStartKnown", () => {
  assert.equal(
    resolveCatalogStartDate({
      nextStartKnown: true,
      startDate: null,
      startDatePrecision: "month",
      intakeText: "õpe algab 15.01.2027"
    }),
    null,
    "a month-only announced start must never fabricate a day, even from intakeText"
  );
});

test("resolveCatalogStartDate: a real feed startDate wins over the legacy intakeText fallback", () => {
  assert.equal(
    resolveCatalogStartDate({
      startDate: "2027-02-01",
      startDatePrecision: "day",
      intakeText: "õpe algab 15.01.2027"
    }),
    "2027-02-01"
  );
});
