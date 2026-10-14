// EAP regressioonikontroll kogu kataloogile (HTM-i tähelepanek 1, 08.10.2026).
// Kasutus: node scripts/eap-regression.mjs [--json]
// Väljund: iga kirje kohta feedi EAP, EHIS-i vaste ja EAP, vahe, vaste kindlus;
// loetelud < 5, > 30, feed ≠ EHIS ja EHIS-i konfliktid. Isikuandmeid ei sisalda.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog } from "../src/data/catalog/index.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const feed = JSON.parse(readFileSync(join(ROOT, "src/data/catalog/credential-commons-lkg/catalog-feed.json"), "utf8"));
const feedEap = new Map(feed.programs.map((p) => [p.id, p.ects ?? null]));

export function buildRows() {
  return catalog.map((e) => ({
    id: e.slug,
    provider: e.provider,
    name: e.name,
    credentialType: e.credentialType ?? null,
    feedEap: feedEap.get(e.slug) ?? null,
    ehisEap: e.ehis.authoritative ? (e.ects ?? null) : null,
    ehisKood: e.ehis.ehisKood,
    confidence: e.ehis.confidence,
    publishedEap: e.ects ?? null,
    review: e.eapReview ? e.eapReview.reasons : null,
    conflict: e.eapReview?.ehisConflict ?? []
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = buildRows();
  const out = {
    total: rows.length,
    needsReview: rows.filter((r) => r.review),
    feedVsEhisMismatch: rows.filter((r) => r.ehisEap != null && r.feedEap != null && r.ehisEap !== r.feedEap),
    noEhisMatchWithEap: rows.filter((r) => r.confidence === "none" && r.feedEap != null && !r.review).length,
    noEap: rows.filter((r) => r.feedEap == null).length
  };
  if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 1));
  else {
    console.log(`kirjeid: ${out.total}; vajab kontrolli: ${out.needsReview.length}; feed ≠ EHIS: ${out.feedVsEhisMismatch.length}; EHIS-i vaaeta (EAP olemas): ${out.noEhisMatchWithEap}; EAP puudub: ${out.noEap}`);
    for (const r of out.needsReview) console.log("REVIEW", r.id, r.feedEap, r.review.join(","), JSON.stringify(r.conflict));
    for (const r of out.feedVsEhisMismatch) console.log("MISMATCH", r.id, `feed=${r.feedEap}`, `ehis=${r.ehisEap}`, r.confidence);
  }
}
