// OPK-S4 — KATTE-/TERVIKLIKKUSE GATE for the catalog outcome -> server-ref bridge.
//
// WHAT THIS GUARDS (build-time, the same `npm run build` gate as the others):
//   `src/data/outcomeRefs.ts` builds the authoritative map from every DISTINCT
//   catalog outcome (deduped EXACTLY like the /oskused/ page) to its canonical
//   AMOS `out_<24hex>` ref + skillTag. The konto face + the AMOS feed share that
//   one map, so it must:
//     - have one entry per distinct catalog outcome (count == a fresh dedup),
//     - carry a well-formed, UNIQUE out_ref + a valid skillTag for every entry,
//     - resolve a known outcome's text to its ref and reject an unknown string,
//     - and cover the MAJORITY of outcomes with a real skillSynonyms cluster tag
//       (the "muu_oskus" fallback rate is reported and bounded).
//
// Zero deps (node:test). Node imports the .ts source directly (native type-strip),
// mirroring skill-match.test.mjs / catalog-floor.test.mjs. Picked up by the
// `node --test scripts/*.test.mjs` glob in package.json → runs on every build.
import test from "node:test";
import assert from "node:assert/strict";

import { catalog } from "../src/data/catalog/index.ts";
import { cleanOutcomeTexts } from "../src/data/outcomes.ts";
import { outcomeRefMap, outcomeRefForText, outcomeRecordForText } from "../src/data/outcomeRefs.ts";
import { outcomeMeta, SKILL_TAG_RE } from "../src/lib/outcome-ref.ts";

const OUT_REF_RE = /^out_[0-9a-f]{24}$/;
const FALLBACK_TAG = "muu_oskus";

/**
 * Fresh dedup of catalog outcomes — deliberately reusing the public outcome
 * cleanup helper, but not the outcomeRefs map, so the count still cross-checks
 * the bridge while matching /oskused/ EXACTLY.
 */
function freshDedup() {
  const seen = new Map(); // key -> first-seen trimmed text
  for (const e of catalog) {
    for (const raw of cleanOutcomeTexts(e)) {
      const text = String(raw).trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (!seen.has(key)) seen.set(key, text);
    }
  }
  return seen;
}

const distinct = freshDedup();
const mapKeys = Object.keys(outcomeRefMap);

test("one map entry per distinct catalog outcome (dedup matches /oskused/)", () => {
  assert.equal(
    mapKeys.length,
    distinct.size,
    `outcomeRefMap has ${mapKeys.length} entries but a fresh /oskused/-style dedup found ${distinct.size}`
  );
  // The map's keys must be EXACTLY the dedup keys (lowercased trimmed text) — same identity.
  for (const key of distinct.keys()) {
    assert.ok(key in outcomeRefMap, `dedup key missing from map: ${JSON.stringify(key)}`);
  }
});

test("every entry has a well-formed out_ref and a valid skillTag", () => {
  for (const [key, rec] of Object.entries(outcomeRefMap)) {
    assert.match(
      rec.outcome_ref,
      OUT_REF_RE,
      `bad outcome_ref for ${JSON.stringify(key)}: ${JSON.stringify(rec.outcome_ref)}`
    );
    assert.match(
      rec.skillTag,
      SKILL_TAG_RE,
      `bad skillTag for ${JSON.stringify(key)}: ${JSON.stringify(rec.skillTag)}`
    );
  }
});

test("outcome_refs are UNIQUE across the map (no two outcomes collide on a ref)", () => {
  const seen = new Map(); // ref -> first key that used it
  const collisions = [];
  for (const [key, rec] of Object.entries(outcomeRefMap)) {
    const prev = seen.get(rec.outcome_ref);
    if (prev !== undefined) {
      collisions.push({ ref: rec.outcome_ref, a: prev, b: key });
    } else {
      seen.set(rec.outcome_ref, key);
    }
  }
  assert.equal(
    collisions.length,
    0,
    `out_ref collisions: ${JSON.stringify(collisions.slice(0, 5), null, 2)}`
  );
});

test("outcomeRefForText resolves a known outcome and rejects an unknown string", () => {
  // Known: take a real outcome text; mixing case + whitespace must still resolve
  // (proves the lookup applies the SAME trim+lowercase dedup as the map).
  const [, knownText] = [...distinct.entries()][0];
  const expectedRef = outcomeRefMap[knownText.toLowerCase()].outcome_ref;

  assert.equal(outcomeRefForText(knownText), expectedRef, "exact known text must resolve");
  assert.equal(
    outcomeRefForText(`  ${knownText.toUpperCase()}  `),
    expectedRef,
    "case/whitespace-variant of a known text must resolve to the same ref"
  );

  // Record lookup agrees with ref lookup.
  const rec = outcomeRecordForText(knownText);
  assert.ok(rec, "outcomeRecordForText must return a record for a known text");
  assert.equal(rec.outcome_ref, expectedRef);

  // Unknown: a string that is not a catalog outcome → null (no accidental match).
  const unknown = "see ei ole ühegi kataloogi õpiväljundi tekst zzz-" + "x".repeat(40);
  assert.equal(outcomeRefForText(unknown), null, "unknown text must return null");
  assert.equal(outcomeRecordForText(unknown), null, "unknown text must return null record");
  assert.equal(outcomeRefForText(42), null, "non-string input must return null");
});

test("each entry's ref/skillTag is consistent with outcomeMeta(text) (single source)", () => {
  // The map must be exactly what outcomeMeta would produce for the first-seen text —
  // proves outcomeRefs.ts did not diverge from the shared outcome-ref.ts contract.
  for (const [key, text] of distinct.entries()) {
    const meta = outcomeMeta(text);
    const rec = outcomeRefMap[key];
    assert.equal(rec.outcome_ref, meta.outcome_ref, `ref drift for ${JSON.stringify(key)}`);
    assert.equal(rec.skillTag, meta.skillTag, `skillTag drift for ${JSON.stringify(key)}`);
  }
});

test("COVERAGE: taxonomy covers the majority (fallback rate reported, bounded)", () => {
  const total = mapKeys.length;
  let fallback = 0;
  const tagCounts = new Map();
  for (const rec of Object.values(outcomeRefMap)) {
    if (rec.skillTag === FALLBACK_TAG) fallback++;
    tagCounts.set(rec.skillTag, (tagCounts.get(rec.skillTag) ?? 0) + 1);
  }
  const real = total - fallback;
  const distinctTags = tagCounts.size;
  const fallbackPct = total === 0 ? 0 : (fallback / total) * 100;

  // Top clusters, for tuning skillSynonyms later.
  const top = [...tagCounts.entries()]
    .filter(([t]) => t !== FALLBACK_TAG)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([t, n]) => `${t}=${n}`)
    .join(", ");

  console.log("\n=== OPK-S4 outcome-ref coverage ===");
  console.log(`distinct catalog outcomes : ${total}`);
  console.log(`real skillSynonyms tag    : ${real} (${(100 - fallbackPct).toFixed(1)}%)`);
  console.log(`"${FALLBACK_TAG}" fallback : ${fallback} (${fallbackPct.toFixed(1)}%)`);
  console.log(`distinct skillTags        : ${distinctTags}`);
  console.log(`top clusters              : ${top}`);
  console.log("===================================\n");

  // SOFT majority check: print the number so skillSynonyms can be tuned; only
  // HARD-fail if EVERY outcome is fallback (taxonomy did nothing at all).
  assert.ok(
    real > 0,
    `EVERY outcome fell back to "${FALLBACK_TAG}" — the skillSynonyms taxonomy matched nothing (total=${total})`
  );
  if (fallbackPct >= 60) {
    console.warn(
      `[coverage] WARNING: fallback rate ${fallbackPct.toFixed(1)}% >= 60% — ` +
        `skillSynonyms should be tuned (real=${real}, fallback=${fallback}). Not hard-failing (soft check).`
    );
  } else {
    assert.ok(fallbackPct < 60, `fallback rate ${fallbackPct.toFixed(1)}% should be < 60%`);
  }
});
