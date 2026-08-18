// Item D: the LAST manual step (a human refreshing the committed LKG snapshot
// after AMOS measures a withdrawal) becomes an automatic, REVIEWABLE proposal.
//
// This script does the verification and, only once verification passes AND
// the candidate actually differs, the file write. It never opens a PR itself
// (see .github/workflows/lkg-refresh.yml for that) and it NEVER pushes or
// merges anything — it only ever touches files inside this working tree, and
// only after every gate below passes.
//
// Every gate below REUSES the site's own real validation code — nothing here
// reimplements the content hash, the receipt/graph pairing, or the
// non-regression + retired[] identity rules. That is the whole point: a
// candidate this script accepts is BY CONSTRUCTION a candidate the site's own
// runtime loader (src/data/catalog/index.ts, src/data/credentialCommons.ts)
// would also accept as a trusted feed.
//
//   1. fetch the three published AMOS release files (feed, CC graph, receipt),
//   2. verify the feed's declared contentHash recomputes exactly
//      (declaredContentHashError -> recomputeCatalogContentHash -> stableJson,
//      all imported from src/data/catalog/index.ts, none reimplemented here),
//   3. verify the graph<->receipt<->feed pairing the exact way the site's own
//      committed-release gate demands (validateCredentialCommonsRelease,
//      imported from src/data/credentialCommons.ts),
//   4. verify the SAME non-regression + retired[] identity rules the site
//      already enforces at runtime (chooseCatalogSource), evaluated against
//      the CURRENT committed snapshot (committedActiveCount,
//      committedRetiredCount, committedKnownIds — also imported, not redone),
//   5. only if ALL of the above hold AND the candidate's raw bytes differ from
//      the committed files on disk, write the three files verbatim (the exact
//      bytes we just verified — never a re-serialization) and print a
//      machine-readable summary + a plain-Estonian PR-body fragment.
//
// Any failure at 2-4 is loud: non-zero exit, a clear reason on stderr, and no
// file is ever touched. Usage:
//
//   node scripts/verify-lkg-refresh.mjs [--write]
//     [--feed-url=URL] [--cc-url=URL] [--receipt-url=URL]
//     [--summary-file=PATH] [--pr-body-file=PATH]
//
// A `--*-url` value starting with "http://" or "https://" is fetched over the
// network; any other value is read as a local file path (this is what makes
// the script's own test suite exercise it end-to-end without a live server).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LKG_DIR = join(ROOT, "src/data/catalog/credential-commons-lkg");
const FEED_PATH = join(LKG_DIR, "catalog-feed.json");
const CC_PATH = join(LKG_DIR, "catalog.cc.jsonld");
const RECEIPT_PATH = join(LKG_DIR, "cc-projection-receipt.json");

const DEFAULT_FEED_URL = "https://status.amos.02signal.com/mkval-catalog/catalog-feed.json";
const DEFAULT_CC_URL = "https://status.amos.02signal.com/mkval-catalog/catalog.cc.jsonld";
const DEFAULT_RECEIPT_URL = "https://status.amos.02signal.com/mkval-catalog/cc-projection-receipt.json";

// Reuse the SAME modules the site itself imports at build/runtime. No env
// vars are set here, so index.ts's own top-level `loadCatalogSource()` and
// credentialCommons.ts's own top-level `loadReleaseWithCatalogCount()` load
// the COMMITTED snapshot with zero network calls — this doubles as proof the
// committed snapshot we are about to compare against is itself still valid.
import {
  chooseCatalogSource,
  committedActiveCount,
  committedKnownIds,
  committedRetired,
  committedRetiredCount,
  declaredContentHashError,
  matchesJsonContentType,
  catalog as committedCatalog
} from "../src/data/catalog/index.ts";
import { matchesContentType, validateCredentialCommonsRelease } from "../src/data/credentialCommons.ts";

function argValue(flag) {
  const prefix = `--${flag}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}
function hasFlag(flag) {
  return process.argv.includes(`--${flag}`);
}

function isHttpUrl(value) {
  return /^https?:\/\//.test(value);
}

/** Fetch (network) or read (local path) a source, returning its raw text and
 * an HTTP content-type when one applies (`null` for local paths — nothing to
 * check). 10s timeout on network fetches, same as the site's own loaders. */
async function loadText(source) {
  if (isHttpUrl(source)) {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10_000);
    try {
      const res = await fetch(source, { signal: abort.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${source}`);
      return { text: await res.text(), contentType: res.headers.get("content-type") };
    } finally {
      clearTimeout(timeout);
    }
  }
  if (!existsSync(source)) throw new Error(`fail ei leia allikat: ${source}`);
  return { text: readFileSync(source, "utf8"), contentType: null };
}

class VerificationError extends Error {}

function summaryReasonEntries(entries) {
  return entries.map((e) => ({ id: e.id, name: e.name, provider: e.provider }));
}

async function verify({ feedUrl, ccUrl, receiptUrl }) {
  // 1) fetch -----------------------------------------------------------
  const feedFetch = await loadText(feedUrl);
  if (isHttpUrl(feedUrl) && !matchesJsonContentType(feedFetch.contentType)) {
    throw new VerificationError(`feedi HTTP Content-Type ei ole application/json (${feedFetch.contentType})`);
  }
  let feedData;
  try {
    feedData = JSON.parse(feedFetch.text);
  } catch {
    throw new VerificationError("feed ei ole valiidne JSON");
  }

  // 2) declared contentHash must recompute exactly ---------------------
  // (declaredContentHashError itself calls the site's own
  // recomputeCatalogContentHash/stableJson — not reimplemented here.)
  const hashError = declaredContentHashError(feedData);
  if (hashError) throw new VerificationError(`feedi contentHash: ${hashError}`);

  // 3) same non-regression + retired[] identity rules the site enforces,
  // evaluated against the CURRENT committed snapshot ---------------------
  const decision = chooseCatalogSource({
    feedUrl,
    trusted: true,
    data: feedData,
    committedCount: committedActiveCount + committedRetiredCount,
    committedKnownIds
  });
  if (decision.use !== "feed") {
    throw new VerificationError(`kandidaatfeed lükati tagasi: ${decision.reason}`);
  }

  // 4) CC graph <-> receipt <-> feed pairing, exactly as the site's own
  // committed-release gate demands -----------------------------------
  const ccFetch = await loadText(ccUrl);
  if (isHttpUrl(ccUrl) && !matchesContentType(ccFetch.contentType, "application/ld+json")) {
    throw new VerificationError(`CC-graafi HTTP Content-Type ei ole application/ld+json (${ccFetch.contentType})`);
  }
  const receiptFetch = await loadText(receiptUrl);
  if (isHttpUrl(receiptUrl) && !matchesJsonContentType(receiptFetch.contentType)) {
    throw new VerificationError(`kviitungi HTTP Content-Type ei ole application/json (${receiptFetch.contentType})`);
  }
  let receiptData;
  try {
    receiptData = JSON.parse(receiptFetch.text);
  } catch {
    throw new VerificationError("kviitung ei ole valiidne JSON");
  }
  const validated = validateCredentialCommonsRelease({
    graphText: ccFetch.text,
    receiptData,
    feedIdentity: {
      contentHash: feedData.contentHash,
      generatedAt: feedData.generatedAt,
      checkedAt: decision.checkedAt,
      count: decision.entries.length,
      programmeIds: decision.entries.map((e) => e.id)
    }
  });
  if (!validated.ok) throw new VerificationError(`CC-väljalase ei sobi feediga: ${validated.reason}`);

  // 5) diff against the CURRENT committed bytes on disk -----------------
  const committedFeedText = readFileSync(FEED_PATH, "utf8");
  const committedCcText = readFileSync(CC_PATH, "utf8");
  const committedReceiptText = readFileSync(RECEIPT_PATH, "utf8");
  const changed =
    feedFetch.text !== committedFeedText || ccFetch.text !== committedCcText || receiptFetch.text !== committedReceiptText;

  const committedRetiredIds = new Set(committedRetired.map((e) => e.id));
  const committedActiveIds = new Set(committedCatalog.map((e) => e.id));
  const newlyWithdrawn = summaryReasonEntries(decision.retired.filter((r) => !committedRetiredIds.has(r.id)));
  const newlyAdded = summaryReasonEntries(
    decision.entries.filter((e) => !committedKnownIds.has(e.id) && !committedActiveIds.has(e.id))
  );

  return {
    changed,
    files: { feed: feedFetch.text, cc: ccFetch.text, receipt: receiptFetch.text },
    summary: {
      verified: true,
      changed,
      committedActiveCount,
      committedRetiredCount,
      candidateActiveCount: decision.entries.length,
      candidateRetiredCount: decision.retired.length,
      newlyWithdrawn,
      newlyAdded,
      contentHash: feedData.contentHash,
      generatedAt: feedData.generatedAt,
      checkedAt: decision.checkedAt
    }
  };
}

function prBody(summary) {
  const lines = [];
  lines.push("## AMOS-i kataloogi hetktõmmis muutus");
  lines.push("");
  lines.push(
    `Automaatne kontroll leidis AMOS-i avaldatud väljalaskest ${summary.candidateActiveCount} aktiivset ja ` +
      `${summary.candidateRetiredCount} mahavõetud programmi (praegu saidil ${summary.committedActiveCount} aktiivset ` +
      `ja ${summary.committedRetiredCount} mahavõetut).`
  );
  lines.push("");
  if (summary.newlyWithdrawn.length) {
    lines.push(`**Mahavõetud (${summary.newlyWithdrawn.length}):**`);
    for (const e of summary.newlyWithdrawn) lines.push(`- ${e.name} — ${e.provider} (\`${e.id}\`)`);
    lines.push("");
  } else {
    lines.push("Uusi mahavõtte ei ole.");
    lines.push("");
  }
  if (summary.newlyAdded.length) {
    lines.push(`**Uued programmid (${summary.newlyAdded.length}):**`);
    for (const e of summary.newlyAdded) lines.push(`- ${e.name} — ${e.provider} (\`${e.id}\`)`);
    lines.push("");
  } else {
    lines.push("Uusi programme ei lisandunud.");
    lines.push("");
  }
  lines.push(
    "Kõik kontrollid (contentHash, retired[]-identiteet, mitte-regressioon, CC-graafi ja kviitungi paardumine) on läbitud " +
      "enne selle PR-i avamist. Seda PR-i EI MERGITA automaatselt — inimene vaatab andmed üle ja mergib käsitsi."
  );
  lines.push("");
  lines.push(`AMOS genereeris väljalaske: ${summary.generatedAt} (checkedAt ${summary.checkedAt}).`);
  return lines.join("\n") + "\n";
}

async function main() {
  const feedUrl = argValue("feed-url") ?? DEFAULT_FEED_URL;
  const ccUrl = argValue("cc-url") ?? DEFAULT_CC_URL;
  const receiptUrl = argValue("receipt-url") ?? DEFAULT_RECEIPT_URL;
  const write = hasFlag("write");
  const summaryFile = argValue("summary-file");
  const prBodyFile = argValue("pr-body-file");

  let result;
  try {
    result = await verify({ feedUrl, ccUrl, receiptUrl });
  } catch (error) {
    const reason = error instanceof VerificationError ? error.message : `ootamatu viga: ${error.stack ?? error.message}`;
    console.error(`[lkg-refresh] VERIFITSEERIMINE EBAÕNNESTUS — ei kirjuta ega ava midagi. Põhjus: ${reason}`);
    const failSummary = { verified: false, changed: false, reason };
    if (summaryFile) writeFileSync(summaryFile, JSON.stringify(failSummary, null, 2) + "\n");
    console.log(JSON.stringify(failSummary));
    process.exitCode = 1;
    return;
  }

  console.log(
    `[lkg-refresh] verifitseeritud: ${result.summary.candidateActiveCount} aktiivset, ` +
      `${result.summary.candidateRetiredCount} mahavõetud, changed=${result.changed}`
  );

  if (result.changed && write) {
    // Write the EXACT verified bytes — never a re-serialization — so what we
    // write is byte-identical to what every gate above just validated.
    writeFileSync(FEED_PATH, result.files.feed);
    writeFileSync(CC_PATH, result.files.cc);
    writeFileSync(RECEIPT_PATH, result.files.receipt);
    console.log("[lkg-refresh] kirjutasin kolm faili (feed, CC-graaf, kviitung).");
  } else if (result.changed) {
    console.log("[lkg-refresh] muutus leitud, aga --write puudub — ei kirjuta (kuiv käivitus).");
  } else {
    console.log("[lkg-refresh] kandidaat on kommititud hetktõmmisega identne — midagi teha ei ole.");
  }

  if (summaryFile) writeFileSync(summaryFile, JSON.stringify(result.summary, null, 2) + "\n");
  if (prBodyFile && result.changed) writeFileSync(prBodyFile, prBody(result.summary));

  console.log(JSON.stringify(result.summary));
}

await main();
