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

// NB: counts are derived from the loaded snapshot, not hard-coded. The snapshot is
// refreshed regularly (monthly), and a test pinned to "450" blocked the first
// refresh in 104 days — the same trap price-guard.test.mjs documents.
test("EHIS facts layer exposes the full committed universe, not only the enriched catalog subset", async () => {
  assert.ok(ehisProgrammeCount >= 450, "universe must not shrink below the 2026-07 baseline");
  assert.equal(ehisProgrammeCount, ehisCurricula.length);
  assert.ok(ehisProviderCount >= 30);
  assert.equal(ehisCurricula.every((entry) => entry.status === "Registreeritud"), true);
  assert.ok(ehisProviderStats.some((row) => row.label === "BCS Koolitus AS" && row.count >= 1));
  assert.ok(ehisProviderStats.some((row) => row.label === "Tallinna Ülikool" && row.count >= 100));
  assert.ok(ehisProviderStats.some((row) => row.label === "Tartu Ülikool" && row.count >= 100));
  assert.ok(ehisProviderTypeStats.some((row) => row.label === "kutseõppeasutus"));
  assert.ok(ehisProviderTypeStats.some((row) => row.label === "täienduskoolitusasutus"));
  assert.ok(ehisFieldStats.some((row) => row.label === "Juhtimine ja haldus"));

  const response = await getEhisCatalog();
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  const body = await response.json();
  assert.equal(body.count, ehisProgrammeCount);
  assert.equal(body.providerCount, ehisProviderCount);
  assert.equal(body.curricula.length, ehisProgrammeCount);
  assert.equal(body.curricula[0].ehisKood != null, true);
  assert.ok(body.providers.some((row) => row.label === "Tallinna Tehnikaülikool"));
});

const committed = (n, day = "2026-10-14") => ({ snapshot_version: "v", fetched_at: day, curricula: new Array(n).fill({}) });
const feedOf = (n, day, extra = {}) => ({ snapshot_version: "v", fetched_at: day, record_count: n, curricula: new Array(n).fill({}), ...extra });

test("feed gate: accepts a same-or-newer complete feed", async () => {
  const { ehisFeedRejection } = await import("../src/data/ehisFacts/index.ts");
  assert.equal(ehisFeedRejection(feedOf(461, "2026-10-14"), committed(461), "2026-10-20"), null);
  assert.equal(ehisFeedRejection(feedOf(470, "2026-11-04"), committed(461), "2026-11-05"), null);
});

test("feed gate: rejects stale, future, partial, malformed and mismatching feeds", async () => {
  const { ehisFeedRejection } = await import("../src/data/ehisFacts/index.ts");
  const today = "2026-10-20";
  assert.equal(ehisFeedRejection(feedOf(461, "2026-07-02"), committed(461), today), "older_than_snapshot");
  assert.equal(ehisFeedRejection(feedOf(461, "2099-01-01"), committed(461), today), "fetched_at_future");
  assert.equal(ehisFeedRejection(feedOf(3, "2026-10-14"), committed(461), today), "partial");
  assert.equal(ehisFeedRejection(feedOf(461, "14.10.2026"), committed(461), today), "fetched_at_format");
  assert.equal(ehisFeedRejection(feedOf(461, "2026-10-14T00:00Z"), committed(461), today), "fetched_at_format");
  assert.equal(ehisFeedRejection(feedOf(461, "2026-10-14", { record_count: 460 }), committed(461), today), "record_count_mismatch");
  assert.equal(ehisFeedRejection(feedOf(461, "2026-10-14", { snapshot_version: "v2" }), committed(461), today), "version");
  assert.equal(ehisFeedRejection({ ...feedOf(0, "2026-10-14") }, committed(461), today), "empty");
  assert.equal(ehisFeedRejection(null, committed(461), today), "empty");
});

test("cadence note: only from the feed and only while fresh (static-site promise must hold)", async () => {
  const { ehisCadenceNoteFor, EHIS_UPDATE_CADENCE_TEXT, ehisLoadedFrom, ehisCadenceNote } = await import("../src/data/ehisFacts/index.ts");
  assert.equal(ehisCadenceNoteFor(true, "2026-10-14", "2026-10-20"), EHIS_UPDATE_CADENCE_TEXT);
  assert.equal(ehisCadenceNoteFor(true, "2026-08-01", "2026-10-20"), null, "stale feed data must not carry the promise");
  assert.equal(ehisCadenceNoteFor(false, "2026-10-14", "2026-10-20"), null, "committed snapshot makes no promise");
  assert.match(EHIS_UPDATE_CADENCE_TEXT, /kord kuus/);
  if (!process.env.PUBLIC_EHIS_FACTS_FEED_URL) {
    assert.equal(ehisLoadedFrom, "snapshot");
    assert.equal(ehisCadenceNote, null);
  }
});
