import test from "node:test";
import assert from "node:assert/strict";

import {
  ehisCurricula,
  ehisFieldStats,
  ehisProgrammeCount,
  ehisProviderCount,
  ehisProviderStats,
  ehisProviderTypeStats
} from "../src/data/ehisFacts/index.ts";
import { GET as getEhisCatalog } from "../src/pages/ehis-catalog.json.ts";

test("EHIS facts layer exposes the full committed universe, not only the enriched catalog subset", async () => {
  assert.equal(ehisProgrammeCount, 450);
  assert.equal(ehisProviderCount, 30);
  assert.equal(ehisCurricula.every((entry) => entry.status === "Registreeritud"), true);
  assert.ok(ehisProviderStats.some((row) => row.label === "BCS Koolitus AS" && row.count === 1));
  assert.ok(ehisProviderStats.some((row) => row.label === "Tallinna Ülikool" && row.count === 114));
  assert.ok(ehisProviderStats.some((row) => row.label === "Tartu Ülikool" && row.count === 100));
  assert.ok(ehisProviderTypeStats.some((row) => row.label === "kutseõppeasutus"));
  assert.ok(ehisProviderTypeStats.some((row) => row.label === "täienduskoolitusasutus"));
  assert.ok(ehisFieldStats.some((row) => row.label === "Juhtimine ja haldus"));

  const response = await getEhisCatalog();
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  const body = await response.json();
  assert.equal(body.count, 450);
  assert.equal(body.providerCount, 30);
  assert.equal(body.curricula.length, 450);
  assert.equal(body.curricula[0].ehisKood != null, true);
  assert.ok(body.providers.some((row) => row.label === "Tallinna Tehnikaülikool"));
});
