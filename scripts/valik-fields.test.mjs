// /valik/ lehtede valdkonnad = suunatesti valdkonnad; sama värav, ebaseotud programme ei tohi sisse tulla.
import test from "node:test";
import assert from "node:assert/strict";
import { FIELD_ISCED, FIELD_OTHER, matchProgrammes } from "../src/lib/suunatest-match.ts";
import { VALIK_FIELDS } from "../src/lib/valik-fields.ts";
import { catalog } from "../src/data/catalog/index.ts";

test("valik: slug'id on unikaalsed ja katavad suunatesti kõik valdkonnad", () => {
  assert.equal(new Set(VALIK_FIELDS.map((f) => f.slug)).size, VALIK_FIELDS.length);
  assert.deepEqual(VALIK_FIELDS.map((f) => f.field), [...Object.keys(FIELD_ISCED), FIELD_OTHER]);
  for (const f of VALIK_FIELDS) assert.match(f.slug, /^[a-z0-9-]+$/);
});

test("valik: iga EHIS-i rühmaga programm on täpselt ühe valdkonna lehel ja ainult õige prefiksiga", () => {
  const seen = new Map();
  for (const f of VALIK_FIELDS) {
    const rows = matchProgrammes(catalog, { field: f.field, format: "", budget: "" }, catalog.length).matches;
    for (const { p } of rows) {
      const code = p.ehis?.fieldCode;
      if (code && f.field !== FIELD_OTHER) {
        assert.ok(FIELD_ISCED[f.field].some((x) => code.startsWith(x)), `${p.slug} (${code}) ei kuulu valdkonda ${f.field}`);
      }
      seen.set(p.slug, (seen.get(p.slug) ?? 0) + 1);
    }
  }
  // "tehnika ja tootmine" (07) sisaldab teadlikult ehituse (0731/0732) ja energeetika (0713) alamrühmi:
  // ainult need võivad olla kahel lehel; muu kattumine on viga.
  const overlapping = new Set(catalog.filter((p) => /^(0713|0731|0732)/.test(p.ehis?.fieldCode ?? "")).map((p) => p.slug));
  const stray = [...seen].filter(([slug, n]) => n > 1 && !overlapping.has(slug));
  assert.deepEqual(stray, []);
});
