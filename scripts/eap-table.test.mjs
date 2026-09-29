// /vastused/mis-on-eap/ tabel: tunnid = EAP × 26, näidisprogrammid on tegelikus
// (aktiivses) kataloogis ja jaotuse summa klapib. Zero deps (node:test).
import test from "node:test";
import assert from "node:assert/strict";

import { eapRows, eapProgrammeGroups, pickProgrammes, eapDistribution, HOURS_PER_EAP } from "../src/data/eapTable.ts";
import { catalog, bySlug } from "../src/data/catalog/index.ts";
import { readFileSync } from "node:fs";

test("1 EAP = 26 tundi, nagu lehe enda tekst", () => {
  assert.equal(HOURS_PER_EAP, 26);
  const src = readFileSync(new URL("../src/data/questions/index.ts", import.meta.url), "utf8");
  assert.match(src, /1 EAP võrdub umbes 26 tunni/);
});

test("tabeli tunnid ja nädalakoormus on arvutatud, mitte sisse kirjutatud", () => {
  assert.deepEqual(eapRows.map((r) => r.eap), [6, 12, 20, 30]);
  for (let i = 1; i < eapRows.length; i++) {
    assert.ok(eapRows[i].hoursPerWeekOneSemester > eapRows[i - 1].hoursPerWeekOneSemester);
    assert.ok(eapRows[i].hoursPerWeekTwoSemesters > eapRows[i - 1].hoursPerWeekTwoSemesters);
  }
  for (const r of eapRows) {
    assert.equal(r.hours, r.eap * 26);
    assert.ok(Math.abs(r.hoursPerWeekOneSemester - r.hours / (1 * 20)) < 0.05);
    assert.ok(Math.abs(r.hoursPerWeekTwoSemesters - r.hours / (2 * 20)) < 0.05);
    assert.ok(r.hoursPerWeekTwoSemesters < r.hoursPerWeekOneSemester);
  }
});

test("näidisprogrammid on olemas praeguses kataloogis ja mahuvahemikus", () => {
  assert.ok(eapProgrammeGroups.length >= 3, "vähemalt 3 mahurühma peab programme leidma");
  const total = eapProgrammeGroups.reduce((n, g) => n + g.programmes.length, 0);
  assert.ok(total >= 6 && total <= 10, `6–10 linki, tuli ${total}`);
  for (const g of eapProgrammeGroups) {
    for (const p of g.programmes) {
      assert.equal(bySlug.get(p.slug), p);
      assert.ok(p.ects >= g.lo && p.ects <= g.hi);
    }
  }
});

test("tagasi võetud (kataloogist puuduv) programm kukub valikust välja", () => {
  const gone = new Set(eapProgrammeGroups.flatMap((g) => g.programmes.map((p) => p.slug)));
  const reduced = catalog.filter((e) => !gone.has(e.slug));
  const after = pickProgrammes(reduced).flatMap((g) => g.programmes.map((p) => p.slug));
  for (const s of after) assert.ok(!gone.has(s));
});

test("EAP-jaotuse vahemike summa = programmid, millel EAP on teada", () => {
  const d = eapDistribution();
  assert.equal(d.buckets.reduce((n, b) => n + b.count, 0), d.total);
  assert.equal(d.total, catalog.filter((e) => e.ects != null).length);
});
