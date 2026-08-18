// Item D: scripts/verify-lkg-refresh.mjs is the mechanism that turns the last
// manual step (a human refreshing the committed LKG snapshot after AMOS
// measures a withdrawal) into an automatic, verified proposal. These tests
// exercise the REAL script as a subprocess against disposable fixtures — same
// pattern as scripts/committed-lkg-retired.test.mjs and
// scripts/retired-kataloog-redirects.test.mjs — never a reimplementation of
// its logic.
//
// Every candidate fixture below is built by MUTATING a copy of today's real,
// already-consistent release bundle (feed + CC graph + receipt) just enough
// to test one thing, and recomputing exactly the fields that mutation
// invalidates — so a passing "accepted" fixture is a genuinely self-consistent
// bundle, not a fixture that only happens to slip past an incomplete check.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FEED_REL = "src/data/catalog/credential-commons-lkg/catalog-feed.json";
const CC_REL = "src/data/catalog/credential-commons-lkg/catalog.cc.jsonld";
const RECEIPT_REL = "src/data/catalog/credential-commons-lkg/cc-projection-receipt.json";

function makeSandbox() {
  const sandbox = mkdtempSync(join(tmpdir(), "mkval-verify-lkg-refresh-"));
  cpSync(ROOT, sandbox, {
    recursive: true,
    filter: (source) => ![".git", "node_modules", "dist"].includes(source.split("/").at(-1))
  });
  return sandbox;
}

/** Byte-identical with src/data/catalog/index.ts stableJson() — used ONLY to
 * keep a hand-built fixture internally consistent; the script under test
 * always recomputes and checks this itself against the real module. */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function sha256(text) {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}
function recomputeContentHash(feed) {
  const payload = { schemaVersion: feed.schemaVersion, checkedAt: feed.checkedAt, count: feed.count, programs: feed.programs };
  return sha256(stableJson(payload));
}

function runScript(sandbox, args) {
  return spawnSync(process.execPath, ["scripts/verify-lkg-refresh.mjs", ...args], { cwd: sandbox, encoding: "utf8" });
}

function lastJsonLine(stdout) {
  return JSON.parse(stdout.trim().split("\n").at(-1));
}

/** Build a self-consistent "AMOS just withdrew one previously-omitted-from-CC
 * programme" candidate bundle in `sandbox/candidate/`, by mutating copies of
 * the sandbox's OWN current release files. Picking a programme whose CC node
 * was already omitted (missing ECTS) means the @graph node set itself never
 * has to change — only the feed's programs/count/contentHash/retired[] and
 * the receipt's/graph's small set of fields that mutation invalidates. */
function buildWithdrawalCandidate(sandbox) {
  const feedPath = join(sandbox, FEED_REL);
  const ccPath = join(sandbox, CC_REL);
  const receiptPath = join(sandbox, RECEIPT_REL);
  const feed = JSON.parse(readFileSync(feedPath, "utf8"));
  const graph = JSON.parse(readFileSync(ccPath, "utf8"));
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));

  const graphIds = new Set(graph["@graph"].map((n) => n["@id"]));
  const active = feed.programs.filter((p) => !p.status || p.status === "active");
  const target = active.find((p) => !graphIds.has(`https://mikrokvalifikatsioon.ee/kataloog/${p.id}/`));
  assert.ok(target, "test fixture assumption broke: need at least one active programme omitted from the CC graph");

  feed.programs = feed.programs.filter((p) => p.id !== target.id);
  feed.count = feed.programs.length;
  feed.retired = [
    ...(feed.retired ?? []),
    {
      id: target.id,
      name: target.name,
      provider: target.provider,
      providerType: target.providerType,
      field: target.field,
      url: target.url,
      withdrawnOn: "2026-08-19"
    }
  ];
  feed.contentHash = recomputeContentHash(feed);

  // The @graph node set is untouched (target was already omitted from it);
  // only the top-level sourceFeedHash field changes, which changes the
  // graph's own bytes, so graph_sha256 must be recomputed too.
  graph.sourceFeedHash = feed.contentHash;
  const graphText = JSON.stringify(graph, null, 2) + "\n";

  receipt.feed_hash = feed.contentHash;
  receipt.graph_sha256 = sha256(graphText);
  receipt.view_count = feed.count; // active count only, mirrors the real receipt shape
  receipt.omitted_row_count -= 1;
  receipt.omitted_reason_counts = { ...receipt.omitted_reason_counts, missing_ects: receipt.omitted_reason_counts.missing_ects - 1 };

  const feedOut = join(sandbox, "candidate-feed.json");
  const ccOut = join(sandbox, "candidate-cc.jsonld");
  const receiptOut = join(sandbox, "candidate-receipt.json");
  writeFileSync(feedOut, JSON.stringify(feed, null, 2) + "\n");
  writeFileSync(ccOut, graphText);
  writeFileSync(receiptOut, JSON.stringify(receipt, null, 2) + "\n");

  return { targetId: target.id, feedOut, ccOut, receiptOut };
}

test("no-op: a candidate identical to the committed snapshot verifies, changed=false, writes nothing", () => {
  const sandbox = makeSandbox();
  try {
    const run = runScript(sandbox, [
      `--feed-url=${FEED_REL}`,
      `--cc-url=${CC_REL}`,
      `--receipt-url=${RECEIPT_REL}`,
      "--write"
    ]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.verified, true);
    assert.equal(out.changed, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("accepted withdrawal: verifies, changed=true, and --write updates the three committed files verbatim", () => {
  const sandbox = makeSandbox();
  try {
    const { targetId, feedOut, ccOut, receiptOut } = buildWithdrawalCandidate(sandbox);
    const summaryFile = join(sandbox, "summary.json");
    const prBodyFile = join(sandbox, "pr-body.md");
    const run = runScript(sandbox, [
      `--feed-url=${feedOut}`,
      `--cc-url=${ccOut}`,
      `--receipt-url=${receiptOut}`,
      "--write",
      `--summary-file=${summaryFile}`,
      `--pr-body-file=${prBodyFile}`
    ]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.verified, true);
    assert.equal(out.changed, true);
    assert.deepEqual(out.newlyWithdrawn.map((e) => e.id), [targetId]);
    assert.equal(out.newlyAdded.length, 0);

    // The committed files in the sandbox must now be BYTE-IDENTICAL to the
    // verified candidate — never a re-serialization.
    assert.equal(readFileSync(join(sandbox, FEED_REL), "utf8"), readFileSync(feedOut, "utf8"));
    assert.equal(readFileSync(join(sandbox, CC_REL), "utf8"), readFileSync(ccOut, "utf8"));
    assert.equal(readFileSync(join(sandbox, RECEIPT_REL), "utf8"), readFileSync(receiptOut, "utf8"));

    assert.ok(existsSync(summaryFile));
    assert.ok(existsSync(prBodyFile));
    const prBody = readFileSync(prBodyFile, "utf8");
    assert.match(prBody, new RegExp(targetId));
    assert.match(prBody, /EI MERGITA automaatselt/);

    // Downstream mechanisms must accept the newly-written snapshot: the
    // redirect generator (id-churn gate) and the committed-snapshot loader
    // itself (requirePairedLkgFeed). Probed as plain scripts, not nested
    // under `node --test`, to avoid the test runner's recursive-run guard.
    const redirects = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(redirects.status, 0, redirects.stderr || redirects.stdout);

    const probePath = join(sandbox, "__probe-written-snapshot.mjs");
    writeFileSync(
      probePath,
      [
        `import { catalog, catalogRetired, catalogSource } from "./src/data/catalog/index.ts";`,
        `console.log(JSON.stringify({ catalogLength: catalog.length, retiredIds: catalogRetired.map((r) => r.id).sort(), catalogSource }));`
      ].join("\n") + "\n"
    );
    const probe = spawnSync(process.execPath, [probePath], { cwd: sandbox, encoding: "utf8" });
    assert.equal(probe.status, 0, probe.stderr || probe.stdout);
    const probed = lastJsonLine(probe.stdout);
    assert.equal(probed.catalogSource, "committed");
    assert.ok(probed.retiredIds.includes(targetId), "the newly-written committed snapshot must carry the withdrawal");
    assert.equal(probed.catalogLength, out.candidateActiveCount);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("accepted withdrawal WITHOUT --write: verifies changed=true but touches no committed file", () => {
  const sandbox = makeSandbox();
  try {
    const { feedOut, ccOut, receiptOut } = buildWithdrawalCandidate(sandbox);
    const before = {
      feed: readFileSync(join(sandbox, FEED_REL), "utf8"),
      cc: readFileSync(join(sandbox, CC_REL), "utf8"),
      receipt: readFileSync(join(sandbox, RECEIPT_REL), "utf8")
    };
    const run = runScript(sandbox, [`--feed-url=${feedOut}`, `--cc-url=${ccOut}`, `--receipt-url=${receiptOut}`]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.changed, true);
    assert.equal(readFileSync(join(sandbox, FEED_REL), "utf8"), before.feed);
    assert.equal(readFileSync(join(sandbox, CC_REL), "utf8"), before.cc);
    assert.equal(readFileSync(join(sandbox, RECEIPT_REL), "utf8"), before.receipt);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("rejected: a tampered contentHash fails loudly, exits non-zero, and writes nothing (even with --write)", () => {
  const sandbox = makeSandbox();
  try {
    const feedPath = join(sandbox, FEED_REL);
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    feed.contentHash = `sha256:${"0".repeat(64)}`;
    const feedOut = join(sandbox, "candidate-feed.json");
    writeFileSync(feedOut, JSON.stringify(feed, null, 2) + "\n");
    const before = readFileSync(feedPath, "utf8");

    const run = runScript(sandbox, [`--feed-url=${feedOut}`, `--cc-url=${CC_REL}`, `--receipt-url=${RECEIPT_REL}`, "--write"]);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /contentHash/);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.verified, false);
    assert.equal(readFileSync(feedPath, "utf8"), before, "a rejected verification must never write the committed feed");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("rejected: retired[] naming a programme this snapshot has never known fails the identity gate", () => {
  const sandbox = makeSandbox();
  try {
    const feedPath = join(sandbox, FEED_REL);
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    feed.retired = [
      ...(feed.retired ?? []),
      {
        id: "tundmatu-programm-2026",
        name: "Väljamõeldud programm",
        provider: "Väljamõeldud Kool",
        providerType: feed.programs[0].providerType,
        field: feed.programs[0].field,
        url: "https://example.com/",
        withdrawnOn: "2026-08-19"
      }
    ];
    feed.contentHash = recomputeContentHash(feed);
    const feedOut = join(sandbox, "candidate-feed.json");
    writeFileSync(feedOut, JSON.stringify(feed, null, 2) + "\n");

    const run = runScript(sandbox, [`--feed-url=${feedOut}`, `--cc-url=${CC_REL}`, `--receipt-url=${RECEIPT_REL}`, "--write"]);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /tundmatu/);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.verified, false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("rejected: a feed that would drop entries (no explaining retired[]) fails the non-regression gate", () => {
  const sandbox = makeSandbox();
  try {
    const feedPath = join(sandbox, FEED_REL);
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    feed.programs = feed.programs.slice(1); // drop one active entry, explain nothing
    feed.count = feed.programs.length;
    feed.contentHash = recomputeContentHash(feed);
    const feedOut = join(sandbox, "candidate-feed.json");
    writeFileSync(feedOut, JSON.stringify(feed, null, 2) + "\n");

    const run = runScript(sandbox, [`--feed-url=${feedOut}`, `--cc-url=${CC_REL}`, `--receipt-url=${RECEIPT_REL}`, "--write"]);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /kaotaks kirjeid/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("rejected: a receipt whose feed_hash no longer matches the candidate feed fails the pairing gate", () => {
  const sandbox = makeSandbox();
  try {
    const before = readFileSync(join(sandbox, FEED_REL), "utf8");
    const { feedOut, ccOut, receiptOut } = buildWithdrawalCandidate(sandbox);
    const receipt = JSON.parse(readFileSync(receiptOut, "utf8"));
    receipt.feed_hash = `sha256:${"1".repeat(64)}`;
    writeFileSync(receiptOut, JSON.stringify(receipt, null, 2) + "\n");

    const run = runScript(sandbox, [`--feed-url=${feedOut}`, `--cc-url=${ccOut}`, `--receipt-url=${receiptOut}`, "--write"]);
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /CC-väljalase ei sobi feediga/);
    assert.equal(readFileSync(join(sandbox, FEED_REL), "utf8"), before);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("fetch failure (unreachable local path) fails loudly and writes nothing", () => {
  const sandbox = makeSandbox();
  try {
    const before = readFileSync(join(sandbox, FEED_REL), "utf8");
    const run = runScript(sandbox, ["--feed-url=./does-not-exist.json", `--cc-url=${CC_REL}`, `--receipt-url=${RECEIPT_REL}`, "--write"]);
    assert.notEqual(run.status, 0);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.verified, false);
    assert.equal(readFileSync(join(sandbox, FEED_REL), "utf8"), before);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
