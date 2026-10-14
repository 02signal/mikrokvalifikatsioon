// Regressioon: HTM-i tähelepanek 08.10.2026 — EMTA "Muusikapsühholoogia" oli
// 3 EAP-ga (mooduli maht), õige on 15 (programm). Vt src/data/eapGuard.ts.
//
// Käitumist testime SÜNTEETILISTE kirjetega (mitte praeguse feedi väärtustega,
// mis võivad homme AMOS-i poolt parandatud olla — vt price-guard.test.mjs
// õppetund). Ainus live-andme väide on invariant, mis ei vanane.
import test from "node:test";
import assert from "node:assert/strict";

import { eapReviewFor, MICRODEGREE_MIN_EAP, MICRODEGREE_MAX_EAP } from "../src/data/eapGuard.ts";
import { matchForCatalogEntry, stripListingDecor, ehisCurricula } from "../src/data/ehisFacts/index.ts";
import { catalog } from "../src/data/catalog/index.ts";

const base = { credentialType: "mikrokraad", feedEap: null };

test("vahemik on TäKS-i järgi 5–30 EAP, piirid kaasa arvatud", () => {
  assert.equal(MICRODEGREE_MIN_EAP, 5);
  assert.equal(MICRODEGREE_MAX_EAP, 30);
  assert.equal(eapReviewFor({ ...base, ects: 4 })?.reasons[0], "alla-vahemiku");
  assert.equal(eapReviewFor({ ...base, ects: 5 }), null);
  assert.equal(eapReviewFor({ ...base, ects: 30 }), null);
  assert.equal(eapReviewFor({ ...base, ects: 31 })?.reasons[0], "yle-vahemiku");
});

test("EMTA Muusikapsühholoogia kuju: 3 EAP mikrokraadil märgitakse", () => {
  const r = eapReviewFor({ ...base, ects: 3, feedEap: 3 });
  assert.ok(r?.needsReview);
  assert.equal(r.feedEap, 3);
});

test("teadmata EAP ei ole viga (unknown = null)", () => {
  assert.equal(eapReviewFor({ ...base, ects: null }), null);
});

test("mikrokvalifikatsioon (mitte mikrokraad) võib olla lühem", () => {
  assert.equal(eapReviewFor({ credentialType: "mikrokvalifikatsioon", ects: 2, feedEap: 2 }), null);
});

test("teadmata credentialType kuulub vahemiku alla (konservatiivne)", () => {
  assert.ok(eapReviewFor({ credentialType: null, ects: 3, feedEap: 3 }));
});

test("EHIS-i konflikt märgitakse ja kannab mõlemat kirjet", () => {
  const conflict = [
    { ehis_kood: "A1", registered_at: "2025-07-03", eap: 14 },
    { ehis_kood: "B2", registered_at: "2026-06-02", eap: 15 }
  ];
  const r = eapReviewFor({ ...base, ects: 15, feedEap: 15, conflict });
  assert.deepEqual(r?.reasons, ["ehis-konflikt"]);
  assert.deepEqual(r?.ehisConflict.map((c) => c.kood), ["A1", "B2"]);
});

test("stripListingDecor eemaldab prefiksi ja aasta, ei puutu päris nime", () => {
  assert.equal(stripListingDecor("Mikrokraadiprogramm: Muusikapsühholoogia 2026/2027"), "Muusikapsühholoogia");
  assert.equal(stripListingDecor("Mikrokraad: Andmeteadus (2026)"), "Andmeteadus");
  assert.equal(stripListingDecor("Muusikapsühholoogia"), "Muusikapsühholoogia");
  assert.equal(stripListingDecor("Python 3"), "Python 3");
});

test("EHIS-i vaste leiab nime ka dekoratsiooniga ja lahendab sama-EAP duplikaadi", () => {
  const any = ehisCurricula.find((c) => c.eap != null);
  assert.ok(any);
  const m = matchForCatalogEntry({ provider: any.provider, name: `Mikrokraadiprogramm: ${any.name_et} 2026/2027` });
  // Sama nimega erinevate EAP-dega duplikaat annab konflikti, mitte vaikset valikut.
  if (m.confidence === "none") assert.ok(m.conflict?.length >= 2 || !ehisCurricula.length);
  else assert.equal(m.curriculum.name_et.replace(/\s+/g, " ").trim(), any.name_et.replace(/\s+/g, " ").trim());
});

test("EHIS-i duplikaadid erineva EAP-ga ei vali vaikselt (EMTA kuju)", () => {
  const dup = ehisCurricula.filter((c) => c.provider === "Eesti Muusika- ja Teatriakadeemia" && c.name_et === "Muusikapsühholoogia");
  if (new Set(dup.map((c) => c.eap)).size > 1) {
    const m = matchForCatalogEntry({ provider: "Eesti Muusika- ja Teatriakadeemia", name: "Mikrokraadiprogramm: Muusikapsühholoogia 2026/2027" });
    assert.equal(m.confidence, "none");
    assert.equal(m.conflict.length, dup.length);
  }
});

test("invariant: ükski avaldatud mikrokraadi EAP ei ole väljaspool 5–30 ja märgitud kirjel EAP puudub", () => {
  for (const e of catalog) {
    if (e.eapReview) {
      assert.equal(e.ects, null, `${e.slug}: märgitud kirje ei tohi EAP-d avaldada`);
      assert.ok(!/\bEAP\b/i.test(e.durationText ?? ""), `${e.slug}: durationText kordab märgitud mahtu`);
    } else if (e.ects != null && (e.credentialType == null || e.credentialType === "mikrokraad")) {
      assert.ok(e.ects >= MICRODEGREE_MIN_EAP && e.ects <= MICRODEGREE_MAX_EAP, `${e.slug}: ${e.ects} EAP`);
    }
  }
});

test("invariant: valvur ei peida suurt osa kataloogist", () => {
  const flagged = catalog.filter((e) => e.eapReview).length;
  assert.ok(flagged / catalog.length < 0.1, `${flagged}/${catalog.length} märgitud`);
});

// ---- Käsitsi kinnitatud EHIS-i konfliktilahendused (omanik 14.10.2026: Muusikapsühholoogia 2026/27 = 15 EAP) ----
import conflictResolutions from "../src/data/ehisConflictResolutions.json" with { type: "json" };

test("kinnitatud lahendus: iga rida viitab olemasolevale EHIS-i kandidaadile ja annab selle EAP-d ilma 'vajab kontrolli' märketa", () => {
  const rows = Object.entries(conflictResolutions.resolutions);
  assert.ok(rows.length >= 1);
  for (const [id, row] of rows) {
    const e = catalog.find((x) => x.slug === id);
    assert.ok(e, `${id}: programmi pole kataloogis (surnud rida)`);
    const candidate = ehisCurricula.find((c) => c.ehis_kood === row.ehis_kood);
    assert.ok(candidate, `${id}: EHIS-i koodi ${row.ehis_kood} pole snapshotis`);
    assert.equal(e.ehis.authoritative, true, id);
    assert.equal(e.ehis.ehisKood, row.ehis_kood);
    assert.equal(e.ects, candidate.eap, `${id}: EAP peab tulema kinnitatud EHIS-i kirjest`);
    assert.equal(e.eapReview, undefined, `${id}: kinnitatud rida ei tohi olla märgitud`);
    assert.ok(row.evidence && row.decided_by && row.reviewed_at, `${id}: tõend ja otsustaja on kohustuslikud`);
  }
});

test("Muusikapsühholoogia 2026/27 näitab 15 EAP-d; kinnitamata konfliktikirjed jäävad märgituks (ei valita vaikselt)", () => {
  const music = catalog.find((x) => x.slug === "eesti-muusika-ja-teatriakadeemia-muusikapsuhholoogia");
  assert.equal(music.ects, 15);
  // Kinnitamata konfliktikirjed (sama nimi, erinev EAP) ei tohi saada EAP-d automaatselt.
  for (const e of catalog.filter((x) => x.eapReview?.reasons.includes("ehis-konflikt"))) {
    assert.equal(e.ects, null, `${e.slug}: kinnitamata konflikt ei tohi EAP-d avaldada`);
    assert.ok(!(e.slug in conflictResolutions.resolutions));
  }
});
