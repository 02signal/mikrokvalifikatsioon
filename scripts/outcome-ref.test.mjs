// Anti-drift + invariant test for the OPK-S4 outcome-ref derivation (src/lib/outcome-ref.ts).
//
// Two halves:
//   1) CROSS-REPO ANTI-DRIFT (the load-bearing one): import the REAL AMOS
//      deriveOutcomeRef + normalizeOutcomeText from the 02S-AMOS contract AND
//      mkval's vendored copies, and assert they produce IDENTICAL output for a
//      battery of inputs (Estonian diacritics, punctuation, mixed case, weird
//      whitespace, NFKC oddities). If the vendored copy ever drifts from AMOS,
//      the refs stop matching and konto↔AMOS sync silently breaks — this test
//      fails first. If the AMOS path is unreadable, that half is SKIPPED with a
//      clear reason, but the local invariants still run.
//   2) LOCAL INVARIANTS: outcomeSkillTag is always SKILL_TAG_RE-valid (real
//      outcomes + the fallback), outcomeRefFor matches /^out_[0-9a-f]{24}$/,
//      outcomeMeta shape, and determinism (same input → same output twice).
//
// Zero deps (node:test). Node imports the .ts source directly (native type-strip),
// mirroring skill-match.test.mjs / subscribe-wire.test.mjs. Runs as the first step
// of `npm run build` via the scripts/*.test.mjs glob — the pre-commit gate.
import test from "node:test";
import assert from "node:assert/strict";

import {
  SKILL_TAG_RE,
  normalizeOutcomeText,
  deriveOutcomeRef,
  outcomeSkillTag,
  outcomeRefFor,
  outcomeMeta,
} from "../src/lib/outcome-ref.ts";

const OUT_REF_RE = /^out_[0-9a-f]{24}$/;

// The real AMOS source of truth — absolute path, loaded best-effort. A sibling
// repo may not be checked out in every environment (CI, a fresh clone), so we
// degrade to SKIP rather than fail when it cannot be imported.
const AMOS_CONTRACT = "/Users/ak/GitHub/02S-AMOS/infra/contracts/outcome/outcome-registry-contract.mjs";
let amos = null;
let amosLoadError = null;
try {
  amos = await import(AMOS_CONTRACT);
} catch (err) {
  amosLoadError = err;
}

// A deliberately nasty battery: diacritics, casing, punctuation, collapsing
// whitespace, leading/trailing junk, NFKC-normalisable forms, and empties.
const TEXT_BATTERY = [
  "Programmeerib Pythonis",
  "Analüüsib andmeid ja koostab graafikuid Excelis",
  "Õpiväljund: õpilane OSKAB ÕIGESTI kasutada tehisintellekti!",
  "  juhib   meeskonda   ja   eestvedamine  ",
  "Raamatupidamine — kontodel arvestust pidada.",
  "Müük & kliendisuhted (B2B)",
  "ÄÄÄ ÖÖÖ ÜÜÜ ÕÕÕ Š Ž",
  "tab\tja\nreavahetus  segamini",
  "Café résumé naïve — ÅÄÖ",
  "...kõik kirjavahemärgid ümber!!!???",
  "ﬀ ﬁ ligatuurid ½ ¼ NFKC",
  "Ⅻ rooma number ① ringitatud",
  "SQL päringud andmebaasidele",
  "ESG ja kestlikkusaruandlus (CSRD)",
  "",
  "   ",
  "x",
  "АБВ kirillitsa segab",
];

// ---- HALF 1: CROSS-REPO ANTI-DRIFT (skipped if AMOS unreadable) ----

test("AMOS cross-check: normalizeOutcomeText is byte-identical to the AMOS contract", { skip: amos ? false : `AMOS contract unreadable at ${AMOS_CONTRACT}: ${amosLoadError?.message}` }, () => {
  for (const text of TEXT_BATTERY) {
    assert.equal(
      normalizeOutcomeText(text),
      amos.normalizeOutcomeText(text),
      `normalizeOutcomeText drifted for input ${JSON.stringify(text)}`
    );
  }
});

test("AMOS cross-check: deriveOutcomeRef is byte-identical to the AMOS contract", { skip: amos ? false : `AMOS contract unreadable at ${AMOS_CONTRACT}: ${amosLoadError?.message}` }, () => {
  // Vary all three derivation inputs (language, skillTag, canonicalText) so we
  // pin the EXACT field order and join ("${language}\n${skillTag}\n${norm}").
  const cases = [];
  const langs = ["et", "en", "ru"];
  const tags = ["programmeerimine", "muu_oskus", "andmete_visualiseerimine"];
  for (const language of langs) {
    for (const skillTag of tags) {
      for (const canonicalText of TEXT_BATTERY) {
        cases.push({ language, skillTag, canonicalText });
      }
    }
  }
  for (const c of cases) {
    assert.equal(
      deriveOutcomeRef(c),
      amos.deriveOutcomeRef(c),
      `deriveOutcomeRef drifted for ${JSON.stringify(c)}`
    );
  }
});

test("AMOS cross-check: end-to-end outcomeRefFor matches what AMOS would derive for the same (language, skillTag, text)", { skip: amos ? false : `AMOS contract unreadable at ${AMOS_CONTRACT}: ${amosLoadError?.message}` }, () => {
  // outcomeRefFor picks the skillTag locally (AMOS doesn't have our taxonomy),
  // but once the tag is fixed the ref MUST be reproducible by AMOS's own derive.
  for (const text of TEXT_BATTERY) {
    const tag = outcomeSkillTag(text);
    const ours = outcomeRefFor(text);
    const theirs = amos.deriveOutcomeRef({ language: "et", skillTag: tag, canonicalText: text });
    assert.equal(ours, theirs, `outcomeRefFor not reproducible by AMOS for ${JSON.stringify(text)}`);
  }
});

// ---- HALF 2: LOCAL INVARIANTS (always run) ----

test("outcomeSkillTag always returns a SKILL_TAG_RE-valid string (real outcomes + fallback)", () => {
  const realOutcomes = [
    "Programmeerib Pythonis ja kirjutab koode",
    "Koostab graafikuid ja diagramme Excelis",
    "Analüüsib andmeid andmepõhiselt",
    "Kirjutab SQL päringuid andmebaasidele",
    "Juhib meeskonda ja eestvedamine",
    "Peab raamatupidamist ja arvepidamist",
    "Kasutab tehisintellekti ja masinõpet",
    "Automatiseerib korduva töö",
    "Koostab ESG kestlikkusaruandlust",
    "Disainib kasutajakogemust (UX)",
    // A string that should match NOTHING in the taxonomy → fallback path:
    "zzz qqq xyzzy täiesti seosetu lause 1234",
    "",
    "   ",
  ];
  for (const o of realOutcomes) {
    const tag = outcomeSkillTag(o);
    assert.equal(typeof tag, "string");
    assert.ok(SKILL_TAG_RE.test(tag), `skillTag ${JSON.stringify(tag)} for ${JSON.stringify(o)} is not SKILL_TAG_RE-valid`);
  }
});

test("outcomeSkillTag fallback is exactly 'muu_oskus' for a no-match outcome", () => {
  const tag = outcomeSkillTag("zzz qqq xyzzy täiesti seosetu lause 1234");
  assert.equal(tag, "muu_oskus");
});

test("outcomeSkillTag picks the LONGEST matching term (most specific), tie-break by cluster order", () => {
  // "graafik excelis" is a long term in the 'andmete-visualiseerimine' cluster,
  // longer than the short generic terms — the most specific cluster must win.
  assert.equal(outcomeSkillTag("Koostab graafik excelis vaateid"), "andmete_visualiseerimine");
  // 'python' (6) beats nothing else in a pure programming sentence.
  assert.equal(outcomeSkillTag("Õpetab pythoni põhitõdesid"), "programmeerimine");
});

test("outcomeSkillTag never emits hyphens (id hyphens become underscores)", () => {
  // 'andmete-visualiseerimine' id has a hyphen → tag must use underscore.
  const tag = outcomeSkillTag("Loob dashboard ja töölaud vaateid");
  assert.ok(!tag.includes("-"), `tag ${JSON.stringify(tag)} must not contain a hyphen`);
  assert.ok(SKILL_TAG_RE.test(tag));
});

test("outcomeRefFor matches /^out_[0-9a-f]{24}$/ for a battery of inputs", () => {
  for (const text of TEXT_BATTERY) {
    const ref = outcomeRefFor(text);
    assert.match(ref, OUT_REF_RE, `outcomeRefFor produced a malformed ref for ${JSON.stringify(text)}: ${ref}`);
  }
});

test("outcomeMeta has the exact bridge-record shape", () => {
  const meta = outcomeMeta("Programmeerib Pythonis");
  assert.deepEqual(Object.keys(meta).sort(), ["language", "outcome_ref", "skillTag", "text"].sort());
  assert.equal(meta.text, "Programmeerib Pythonis"); // text kept verbatim, client-side
  assert.equal(meta.language, "et");
  assert.ok(SKILL_TAG_RE.test(meta.skillTag));
  assert.match(meta.outcome_ref, OUT_REF_RE);
  // outcome_ref must be reproducible from (language, skillTag, text).
  assert.equal(meta.outcome_ref, deriveOutcomeRef({ language: meta.language, skillTag: meta.skillTag, canonicalText: meta.text }));
});

test("determinism: same input → same output twice (skillTag, ref, meta)", () => {
  for (const text of TEXT_BATTERY) {
    assert.equal(outcomeSkillTag(text), outcomeSkillTag(text));
    assert.equal(outcomeRefFor(text), outcomeRefFor(text));
    assert.deepEqual(outcomeMeta(text), outcomeMeta(text));
  }
});

test("normalizeOutcomeText local invariants (idempotent, no surrounding punctuation/space)", () => {
  for (const text of TEXT_BATTERY) {
    const once = normalizeOutcomeText(text);
    assert.equal(once, normalizeOutcomeText(once), `not idempotent for ${JSON.stringify(text)}`);
    assert.equal(once, once.trim(), "must be trimmed");
    assert.ok(!/\s{2,}/.test(once), "must collapse internal whitespace runs");
  }
});
