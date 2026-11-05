// isStaleSource (src/data/dates.ts): "Andmed võivad olla vananenud" lävi, amos-ops#737.
// Täpselt 7 päeva on veel värske, 8 päeva vananenud; puuduv/vigane kuupäev on vananenud.
import test from "node:test";
import assert from "node:assert/strict";

import { STALE_AFTER_DAYS, isStaleSource } from "../src/data/dates.ts";

test("isStaleSource: lävi on 7 päeva, täpselt 7 ei ole vananenud", () => {
  assert.equal(STALE_AFTER_DAYS, 7);
  assert.equal(isStaleSource("2026-10-26", "2026-11-02"), false);
  assert.equal(isStaleSource("2026-10-25", "2026-11-02"), true);
  assert.equal(isStaleSource("2026-11-02", "2026-11-02"), false);
});

test("isStaleSource: puuduv või vigane kuupäev loetakse vananenuks", () => {
  assert.equal(isStaleSource(null, "2026-11-02"), true);
  assert.equal(isStaleSource(undefined, "2026-11-02"), true);
  assert.equal(isStaleSource("eile", "2026-11-02"), true);
});
