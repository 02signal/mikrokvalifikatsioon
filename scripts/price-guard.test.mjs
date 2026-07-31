// Anti-regression test for the price plausibility guard (src/data/priceGuard.ts).
//
// WHY: AMOS issue #2613 found one bad catalogue price — Tallinna Ülikool's
// "Sooritus- ja spordipsühholoogia" states 75 € for 30 EAP (2.50 €/EAP),
// against a catalogue median of ~146 €/EAP. AMOS PR #2614 adds a producer-side
// review signal but deliberately does NOT correct the price (a human review
// stays authoritative), so this value keeps shipping until someone checks the
// TLÜ page. `plausiblePriceEur` mirrors AMOS's own threshold
// (`amos.mkval.price_integrity/v1`: min(20, catalogueMedian × 0.25) €/EAP) so
// the site's own price CLAIMS (diagrams, teema/valdkond ranges, questionStats,
// OG cards, structured data) aren't defined by this one suspect value.
//
// Zero deps (node:test). Node imports the .ts source directly (native
// type-strip), mirroring outcome-ref.test.mjs / skill-match.test.mjs. Runs as
// part of `npm run build` via the scripts/*.test.mjs glob.
import test from "node:test";
import assert from "node:assert/strict";

import { catalog } from "../src/data/catalog/index.ts";
import { plausiblePriceEur, PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP } from "../src/data/priceGuard.ts";
import { parsePriceEur } from "../src/data/priceText.ts";

const KNOWN_BAD_ID = "tallinna-ulikool-sooritus-ja-spordipsuhholoogia";

test("the guard withholds the known AMOS #2613 outlier (TLÜ sooritus- ja spordipsühholoogia)", () => {
  const entry = catalog.find((e) => e.id === KNOWN_BAD_ID);
  assert.ok(entry, `fixture expects ${KNOWN_BAD_ID} to still be in the catalogue`);
  assert.equal(entry.ects, 30, "test assumes the known 30 EAP volume — re-check the fixture if this changes");
  assert.equal(parsePriceEur(entry.priceText), 75, "test assumes the known 75 € source value — re-check the fixture if this changes");
  assert.equal(plausiblePriceEur(entry), null, "the guard must withhold this entry's price");
});

test("the guard excludes NOTHING else at today's catalogue data", () => {
  const withheld = catalog.filter((entry) => {
    const parsed = parsePriceEur(entry.priceText);
    return parsed != null && parsed > 0 && plausiblePriceEur(entry) == null;
  });
  assert.deepEqual(
    withheld.map((e) => e.id),
    [KNOWN_BAD_ID],
    "exactly one entry (the known AMOS #2613 outlier) should be withheld — a new withheld entry means either a new bad price or a threshold regression"
  );
});

test("missing or zero EAP is never evidence against a price (always plausible)", () => {
  assert.equal(plausiblePriceEur({ priceText: "75 €", ects: null }), 75, "no EAP -> can't judge -> plausible");
  assert.equal(plausiblePriceEur({ priceText: "75 €", ects: 0 }), 75, "zero EAP -> can't judge -> plausible");
});

test("a price above the €/EAP floor is always plausible", () => {
  // Exactly at the catalogue's real median (~146 €/EAP) — comfortably plausible.
  assert.equal(plausiblePriceEur({ priceText: "1460 €", ects: 10 }), 1460);
});

test("'tasuta' (free, 0 €) is always plausible — it's a deliberate signal, not a suspect value", () => {
  assert.equal(plausiblePriceEur({ priceText: "tasuta", ects: 30 }), 0);
});

test("a missing price stays null (nothing to withhold)", () => {
  assert.equal(plausiblePriceEur({ priceText: null, ects: 30 }), null);
});

test("the live threshold mirrors amos.mkval.price_integrity/v1: min(20, catalogueMedian × 0.25)", () => {
  // Re-derive the catalogue median independently (same rule, computed fresh from
  // the built catalog) rather than hardcoding a number — the built catalog's EAP
  // values can shift slightly from the raw feed (EHIS may override `ects`).
  const perEapValues = catalog
    .map((entry) => {
      const price = parsePriceEur(entry.priceText);
      return price != null && price > 0 && entry.ects ? price / entry.ects : null;
    })
    .filter((n) => n != null)
    .sort((a, b) => a - b);
  const mid = Math.floor(perEapValues.length / 2);
  const median = perEapValues.length % 2 ? perEapValues[mid] : (perEapValues[mid - 1] + perEapValues[mid]) / 2;
  const expectedFloor = Math.min(20, median * 0.25);
  assert.equal(PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP, expectedFloor);
  assert.ok(expectedFloor > 0 && expectedFloor <= 20, "floor must be a positive €/EAP value capped at 20");
});
