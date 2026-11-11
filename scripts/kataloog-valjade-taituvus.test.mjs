// Unit test for scripts/kataloog-valjade-taituvus.mjs (amos-ops#1770): täituvus
// pakkujate kaupa ja €/EAP. Zero deps (node:test), sünteetiline fixture.
import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, eurPerEap } from "./kataloog-valjade-taituvus.mjs";

test("eurPerEap: summa eurodes jagatud mahuga, muidu null", () => {
  assert.equal(eurPerEap({ priceText: "600 €", ects: 6 }), 100);
  assert.equal(eurPerEap({ priceText: "tasuta", ects: 6 }), null);
  assert.equal(eurPerEap({ priceText: "600 €", ects: null }), null);
});

test("buildReport: tühjad väärtused ei lähe täituvusse, pakkujad järjestatud suuruse järgi", () => {
  const r = buildReport({
    programs: [
      { provider: "A", priceText: "100 €", ects: 1, outcomes: [] },
      { provider: "A", priceText: "", ects: 2, outcomes: ["x"] },
      { provider: "B", priceText: "300 €", ects: 3 },
    ],
  });
  assert.equal(r.count, 3);
  assert.equal(r.providers[0].provider, "A");
  assert.equal(r.providers[0].coverage.priceText, 50);
  assert.equal(r.providers[0].coverage.outcomes, 50);
  assert.deepEqual(r.eurPerEap, { n: 2, min: 100, median: 100, max: 100 });
});
