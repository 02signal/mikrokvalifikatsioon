// Unit test for src/data/courseSchema.ts's toCourse() JSON-LD startDate
// handling — one of PR-3g's four render sites (kataloog/[slug].astro,
// registreerimine/index.astro, llms-full.txt, courseSchema.ts).
//
// WHY: hasCourseInstance.startDate is a MACHINE CLAIM to Google, not just
// page copy — a stale startDate surviving into JSON-LD after AMOS has
// already decided nextStartKnown: false would tell search engines a
// programme starts on a date years in the past. This pins that the field
// is omitted entirely in that case, the same way it is already omitted for
// an entry with no known start at all.
import test from "node:test";
import assert from "node:assert/strict";

import { toCourse } from "../src/data/courseSchema.ts";

function baseEntry(fields) {
  return {
    slug: "fixture",
    name: "Fixture programme",
    url: "https://example.edu/fixture",
    summary: "Fixture summary",
    provider: "Fixture Provider",
    language: "et",
    ...fields
  };
}

test("toCourse: nextStartKnown false omits hasCourseInstance.startDate, even with a stale startDate still on the record", () => {
  const course = toCourse(baseEntry({
    nextStartKnown: false,
    startDate: "2023-08-30",
    startDatePrecision: "day"
  }));
  assert.equal("startDate" in course.hasCourseInstance, false);
});

test("toCourse: nextStartKnown true (or absent, legacy) still emits the real day startDate", () => {
  const course = toCourse(baseEntry({
    startDate: "2027-01-15",
    startDatePrecision: "day"
  }));
  assert.equal(course.hasCourseInstance.startDate, "2027-01-15");
});

test("toCourse: month precision still emits the YYYY-MM value, unaffected by the nextStartKnown check", () => {
  const course = toCourse(baseEntry({
    startDate: null,
    startMonth: "2027-02",
    startDatePrecision: "month"
  }));
  assert.equal(course.hasCourseInstance.startDate, "2027-02");
});
