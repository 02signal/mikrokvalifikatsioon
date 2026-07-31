// Anti-regression test for the price plausibility guard (src/data/priceGuard.ts).
//
// WHY: AMOS issue #2613 found one bad catalogue price — Tallinna Ülikool's
// "Sooritus- ja spordipsühholoogia" published 75 € for 30 EAP (2.50 €/EAP)
// against a catalogue median of ~146 €/EAP. The TLÜ page states BOTH numbers:
// "Koolituse hind 2250 eurot, 1 EAP on 75 eurot" — the parser took the unit
// price into a field that means total. AMOS has since fixed it at source
// (#2646 now recognises "Hind kokku / Maksumus kokku"; ambiguous cases stay in
// review instead of shipping a guessed price), and production serves 2 250 €.
//
// The guard stays as DEFENCE IN DEPTH: it mirrors AMOS's own threshold
// (`amos.mkval.price_integrity/v1`: min(20, catalogueMedian × 0.25) €/EAP) so
// the site's own price CLAIMS (diagrams, teema/valdkond ranges, questionStats,
// OG cards, structured data, meta descriptions) can never be defined by a
// suspect value that slips through upstream.
//
// TESTING NOTE — this is why the first version of this file was rejected in
// review. It asserted that the guard withholds one NAMED live catalogue entry
// at 75 €. When AMOS corrected the data, the test encoded a fact that had
// become false, and blocked its own PR. A guard's behaviour is "withhold when
// €/EAP is implausible" — that is a property of the FUNCTION, not of today's
// data. Behaviour is therefore tested with synthetic fixtures, and the only
// live-data assertion left is an invariant that cannot rot: the guard must stay
// self-consistent and must not start withholding a large share of the
// catalogue. Note also that production builds from a LIVE feed
// (PUBLIC_CATALOG_FEED_URL when trusted); the committed snapshot can be days
// behind, so any test keyed to a specific committed value is brittle by design.
//
// Zero deps (node:test). Node imports the .ts source directly (native
// type-strip), mirroring outcome-ref.test.mjs / skill-match.test.mjs. Runs as
// part of `npm run build` via the scripts/*.test.mjs glob.
import test from "node:test";
import assert from "node:assert/strict";

import { catalog } from "../src/data/catalog/index.ts";
import { plausiblePriceEur, PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP } from "../src/data/priceGuard.ts";
import { parsePriceEur } from "../src/data/priceText.ts";

test("withholds a unit-price-in-a-total-field value — the AMOS #2613 shape", () => {
  // The real case, as a fixture: TLÜ published "1 EAP on 75 eurot" into a field
  // that means the total. Kept as a synthetic entry so the test survives the
  // source data being corrected — which is exactly what happened.
  assert.equal(plausiblePriceEur({ priceText: "75 €", ects: 30 }), null);
});

test("withholds regardless of programme size, as long as €/EAP is implausible", () => {
  // A small programme can carry the same defect; the guard must not depend on
  // the volume being large.
  assert.equal(plausiblePriceEur({ priceText: "50 €", ects: 6 }), null);
  assert.equal(plausiblePriceEur({ priceText: "12 €", ects: 12 }), null);
});

test("keeps a genuinely cheap but plausible price", () => {
  // Well below the catalogue median but far above the floor — a real bargain
  // must NOT be silently withheld.
  const floor = PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP;
  const justAbove = Math.ceil((floor + 1) * 10);
  assert.equal(plausiblePriceEur({ priceText: `${justAbove} €`, ects: 10 }), justAbove);
});

test("every withheld live entry is genuinely below the floor (self-consistency)", () => {
  // A live-data invariant that cannot rot: it asserts the guard agrees with its
  // own threshold, not that any particular programme is priced any particular
  // way. Names no entry and needs no update when the catalogue changes.
  for (const entry of catalog) {
    const parsed = parsePriceEur(entry.priceText);
    if (parsed == null || parsed <= 0 || !entry.ects) continue;
    if (plausiblePriceEur(entry) != null) continue;
    assert.ok(
      parsed / entry.ects < PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP,
      `${entry.id} was withheld at ${(parsed / entry.ects).toFixed(2)} €/EAP but the floor is ${PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP} — the guard contradicts itself`
    );
  }
});

test("the guard stays a last resort, not a bulk filter", () => {
  // Canary: upstream (AMOS #2646) is the primary control, so this guard should
  // only ever catch stragglers. If it starts withholding a large share of the
  // catalogue, the threshold logic has regressed or the feed has broken —
  // either way a human should look before the site quietly stops showing prices.
  const priced = catalog.filter((e) => {
    const p = parsePriceEur(e.priceText);
    return p != null && p > 0 && e.ects;
  });
  const withheld = priced.filter((e) => plausiblePriceEur(e) == null);
  assert.ok(priced.length > 0, "expected at least some priced entries with a volume");
  assert.ok(
    withheld.length <= Math.max(3, Math.ceil(priced.length * 0.05)),
    `guard withheld ${withheld.length} of ${priced.length} priced entries (${withheld.map((e) => e.id).join(", ")}) — that is too many for a last-resort net`
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
