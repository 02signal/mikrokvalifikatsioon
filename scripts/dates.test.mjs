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

import { formatStartEt, groupByStartMonth, sortedByStart } from "../src/data/dates.ts";

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
