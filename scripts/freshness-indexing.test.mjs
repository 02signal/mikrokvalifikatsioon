// Freshness + indexing rules (SEO item 5/6): no expired offers in JSON-LD, sitemap
// lastmod only from a real change date, /vordlus/ noindex whitelist is wired.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { toCourse, isPastDate } from "../src/data/courseSchema.ts";
import { sitemapLastmod } from "../src/data/sitemapLastmod.ts";
import { isIndexableVordlus, vordlusPairFromPath } from "../src/data/vordlusIndex.ts";

const NOW = new Date("2026-09-29T10:00:00Z");
const entry = (f) => ({ slug: "x", name: "X", url: "https://e.edu/x", summary: "s", provider: "P", language: "et", priceText: "500 €", ects: 3, ...f });

test("past registrationDeadline is not emitted as Offer.availabilityEnds", () => {
  const c = toCourse(entry({ registrationDeadline: "2026-08-21" }), NOW);
  assert.ok(c.offers, "offer itself stays");
  assert.equal("availabilityEnds" in c.offers, false);
});

test("future (and same-day) registrationDeadline is kept", () => {
  assert.equal(toCourse(entry({ registrationDeadline: "2026-10-15" }), NOW).offers.availabilityEnds, "2026-10-15");
  assert.equal(toCourse(entry({ registrationDeadline: "2026-09-29" }), NOW).offers.availabilityEnds, "2026-09-29");
});

test("past CourseInstance startDate (day and month) is omitted; current month is kept", () => {
  assert.equal("startDate" in toCourse(entry({ startDate: "2026-09-01", startDatePrecision: "day" }), NOW).hasCourseInstance, false);
  assert.equal("startDate" in toCourse(entry({ startMonth: "2026-08", startDatePrecision: "month" }), NOW).hasCourseInstance, false);
  assert.equal(toCourse(entry({ startMonth: "2026-09", startDatePrecision: "month" }), NOW).hasCourseInstance.startDate, "2026-09");
  assert.equal(toCourse(entry({ startDate: "2026-11-02", startDatePrecision: "day" }), NOW).hasCourseInstance.startDate, "2026-11-02");
});

test("isPastDate treats malformed values as past (omit rather than claim)", () => {
  assert.equal(isPastDate("soon", NOW), true);
});

test("toCourse never emits dateModified (no per-record change date exists)", () => {
  assert.equal("dateModified" in toCourse(entry({ sourceCheckedAt: "2026-09-28" }), NOW), false);
});

test("sitemap lastmod: omitted for programme/pair/other pages, dataUpdatedAt for catalogue listings", () => {
  assert.equal(sitemapLastmod("/kataloog/some-programme/", "2026-09-28"), undefined);
  assert.equal(sitemapLastmod("/vordlus/a-vs-b/", "2026-09-28"), undefined);
  assert.equal(sitemapLastmod("/maakond/harju/", "2026-09-28"), undefined);
  assert.equal(sitemapLastmod("/", "2026-09-28"), undefined);
  assert.equal(sitemapLastmod("/kataloog/", "2026-09-28"), "2026-09-28T00:00:00.000Z");
  assert.equal(sitemapLastmod("/kataloog/", null), undefined);
});

test("sitemap lastmod never comes from the checked date or the build date", () => {
  const config = readFileSync(new URL("../astro.config.mjs", import.meta.url), "utf8");
  assert.equal(/checkedAt/i.test(config.replace(/\/\/.*$/gm, "")), false, "astro.config must not use checkedAt");
  assert.equal(/lastmod:\s*new Date/.test(config), false, "no global stamped lastmod");
  assert.equal(/new Date\(\)/.test(readFileSync(new URL("../src/data/sitemapLastmod.ts", import.meta.url), "utf8")), false);
});

test("/vordlus/ whitelist: helper + page wiring", () => {
  assert.equal(vordlusPairFromPath("/vordlus/"), null);
  assert.equal(vordlusPairFromPath("/vordlus/a-vs-b/"), "a-vs-b");
  assert.equal(isIndexableVordlus("definitely-not-a-pair"), false);
  const page = readFileSync(new URL("../src/pages/vordlus/[pair].astro", import.meta.url), "utf8");
  assert.match(page, /noindex,follow/);
  assert.match(page, /isIndexableVordlus\(cmp\.pair\)/);
  assert.equal(/clip\(a\.name, 27\)/.test(page), false, "title is not clipped");
});
