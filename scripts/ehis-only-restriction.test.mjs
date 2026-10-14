// Omaniku otsus 14.10.2026 (PO orch-23, klass B): kus allikas (kooli veebileht) automaatset
// kogumist keelab, näitab avalik sait AINULT EHIS-i andmeid (hind, kuupäevad, kokkuvõte, kirjeldus
// eemaldatud). Andmeladu AMOS-is jääb sisekasutusse. Avalikku kuva juhib source-basis.json.
//
// Testid ei sõltu konkreetsetest hindadest: need tuletatakse toorfeedist ja basis-failist.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { catalog } from "../src/data/catalog/index.ts";
import { EHIS_ONLY_KEPT_KEYS, ehisOnlyBase } from "../src/data/ehisOnly.ts";
import { PAGE_DERIVED_BASIS, hasBasisRow, isEhisOnly, publicationBasisOf } from "../src/data/sourceBasis.ts";

const rawFeed = JSON.parse(readFileSync(new URL("../src/data/catalog/credential-commons-lkg/catalog-feed.json", import.meta.url), "utf8"));
const rawById = new Map(rawFeed.programs.map((p) => [p.id, p]));
const restricted = catalog.filter((e) => e.publicBasis === "ehis_only");

// Võtmed, mida EHIS-only avalik kirje üldse kanda tohib (valge nimekiri + EHIS-i override + meie enda tuletised).
const ALLOWED_PUBLIC_KEYS = new Set([
  ...EHIS_ONLY_KEPT_KEYS,
  // EHIS-i override ja alati-olemas olevad tuletised
  "ects", "language", "slug", "ehis", "eapReview", "publicBasis", "topicField",
  // tüübi nõutavad, ent tühjaks/nulliks seatud väljad
  "durationText", "priceText", "format", "intakeText", "summary", "sourceCheckedAt", "goalText", "outcomes",
  "outcomeObjects", "assessmentText", "registrationDeadline", "startDate", "startMonth", "startDatePrecision",
  "nextStartKnown", "lastKnownStart"
]);

test("every catalogue programme has a publication-basis row (a new programme without one must fail the build, not leak)", () => {
  const missing = catalog.filter((e) => !hasBasisRow(e.slug)).map((e) => e.slug);
  assert.deepEqual(missing, [], "refresh src/data/source-basis.json from AMOS source-basis.json");
});

test("restricted set is exactly the programmes whose basis is not provider_page_robots_allowed (and is not empty)", () => {
  const expected = catalog.filter((e) => publicationBasisOf(e.slug) !== PAGE_DERIVED_BASIS).map((e) => e.slug).sort();
  assert.deepEqual(restricted.map((e) => e.slug).sort(), expected);
  assert.ok(restricted.length > 0, "the committed basis marks robots-blocked sources; the set must not silently become empty");
});

test("a restricted programme's public record carries ONLY EHIS-backed fields (no price, dates, summary, description, school outcomes)", () => {
  for (const e of restricted) {
    for (const key of Object.keys(e)) assert.ok(ALLOWED_PUBLIC_KEYS.has(key), `${e.slug}: unexpected public key ${key}`);
    assert.equal(e.priceText, null, e.slug);
    assert.equal(e.durationText, null, e.slug);
    assert.equal(e.intakeText, null, e.slug);
    assert.equal(e.format, null, e.slug);
    assert.equal(e.goalText, null, e.slug);
    assert.equal(e.assessmentText, null, e.slug);
    assert.deepEqual(e.outcomes, [], e.slug);
    assert.deepEqual(e.outcomeObjects, [], e.slug);
    assert.equal(e.startDate, null, e.slug);
    assert.equal(e.startMonth, null, e.slug);
    assert.equal(e.registrationDeadline, null, e.slug);
    assert.equal(e.nextStartKnown, false, e.slug);
    assert.equal(e.summary, `${rawById.get(e.slug).name} – ${e.provider}.`, `${e.slug}: summary must be the neutral identity line`);
    // EAP and language exist ONLY if EHIS vouches for them.
    if (!e.ehis.authoritative) {
      assert.equal(e.ects, null, `${e.slug}: unmatched record must not carry the school's EAP`);
      assert.equal(e.language, null, e.slug);
    }
  }
});

test("restricted record keeps no school-derived text anywhere: raw school values never appear in the record", () => {
  for (const e of restricted) {
    const raw = rawById.get(e.slug);
    const serialized = JSON.stringify(e);
    for (const field of ["priceText", "summary", "goalText", "assessmentText", "intakeText", "durationText"]) {
      const value = raw?.[field];
      if (typeof value === "string" && value.trim().length >= 8) {
        assert.ok(!serialized.includes(value), `${e.slug}: school ${field} leaked`);
      }
    }
    for (const instance of raw?.instances ?? []) {
      if (instance.price) assert.ok(!serialized.includes(instance.price), `${e.slug}: instance price leaked`);
    }
    assert.equal(e.eapReview?.feedEap ?? null, null, `${e.slug}: the school's EAP must not ride along in eapReview`);
  }
});

test("unrestricted programmes are untouched (the restriction is not a blanket removal)", () => {
  const open = catalog.filter((e) => e.publicBasis !== "ehis_only");
  assert.ok(open.length > restricted.length);
  assert.ok(open.some((e) => e.priceText), "page-derived programmes keep their price");
});

test("ehisOnlyBase is a WHITELIST: a future/unknown school field cannot pass through", () => {
  const base = ehisOnlyBase({
    id: "x", name: "N", provider: "P", providerType: "ülikool", url: "https://s.example/x", field: "IT ja andmed",
    priceText: "999 €", summary: "school prose", ects: 6, instances: [{ price: "999 €" }], futureSchoolField: "secret copy"
  }, "2026-10-14");
  assert.equal(base.priceText, null);
  assert.equal(base.ects, null);
  assert.equal("instances" in base, false);
  assert.equal("futureSchoolField" in base, false);
  assert.equal(base.name, "N");
  assert.equal(base.url, "https://s.example/x");
});

// Rendered pages and machine outputs (catalog.json, llms*.txt, site-profile.json, JSON-LD in HTML) are
// verified AFTER the build by scripts/verify-ehis-only-dist.mjs (Astro page modules cannot be imported by node:test).
