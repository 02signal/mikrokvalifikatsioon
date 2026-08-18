// Item C follow-up: the COMMITTED LKG feed's own `retired[]` parsing (the
// `requirePairedLkgFeed` gate at the top of src/data/catalog/index.ts) must
// work in BOTH directions:
//   1) absent retired[] (backward compatible with every older committed
//      snapshot) parses cleanly and yields an empty retired list, and
//   2) a present, valid retired[] parses cleanly and the site actually
//      builds from it (the mechanism is usable, not just "doesn't throw").
//
// `requirePairedLkgFeed` is internal (not exported) and reads the committed
// JSON file at import time, so — same pattern as scripts/previous-ids.test.mjs
// and scripts/retired-kataloog-redirects.test.mjs — we exercise the REAL
// module against a disposable sandbox copy of the repo with the committed
// feed file swapped for a fixture, rather than reimplementing its logic here.
// The committed snapshot on the branch itself is never modified.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FEED_PATH = "src/data/catalog/credential-commons-lkg/catalog-feed.json";

function makeSandbox() {
  const sandbox = mkdtempSync(join(tmpdir(), "mkval-committed-lkg-retired-"));
  cpSync(ROOT, sandbox, {
    recursive: true,
    filter: (source) => ![".git", "node_modules", "dist"].includes(source.split("/").at(-1))
  });
  return sandbox;
}

/** Byte-identical with src/data/catalog/index.ts stableJson(), used ONLY to
 * keep a hand-built fixture internally consistent; the actual validation of
 * whatever we write is always done by the real committed-snapshot loader. */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function recomputeContentHash(feed) {
  const payload = { schemaVersion: feed.schemaVersion, checkedAt: feed.checkedAt, count: feed.count, programs: feed.programs };
  return `sha256:${createHash("sha256").update(stableJson(payload)).digest("hex")}`;
}

/** Import the REAL committed-snapshot loader in a child process against
 * whatever `catalog-feed.json` is sitting in the sandbox right now, and
 * report back what it parsed to. Never throws on a clean parse. */
function probeCommittedLoader(sandbox) {
  const probePath = join(sandbox, "__probe-committed-lkg.mjs");
  writeFileSync(
    probePath,
    [
      `import { catalog, catalogRetired, committedRetiredCount, committedActiveCount, catalogSource }`,
      `  from "./src/data/catalog/index.ts";`,
      `console.log(JSON.stringify({`,
      `  committedActiveCount, committedRetiredCount,`,
      `  catalogLength: catalog.length,`,
      `  catalogRetiredIds: catalogRetired.map((r) => r.id).sort(),`,
      `  catalogSource`,
      `}));`
    ].join("\n") + "\n"
  );
  return spawnSync(process.execPath, [probePath], { cwd: sandbox, encoding: "utf8" });
}

function lastJsonLine(stdout) {
  return JSON.parse(stdout.trim().split("\n").at(-1));
}

test("committed LKG feed WITHOUT retired[] parses cleanly and yields an empty retired list (backward compatible)", () => {
  const sandbox = makeSandbox();
  try {
    // Force absence deterministically, independent of whatever today's real
    // committed snapshot happens to contain, so this proves the RULE rather
    // than repeating a fact about today's data.
    const feedPath = join(sandbox, FEED_PATH);
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    delete feed.retired;
    writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");

    const run = probeCommittedLoader(sandbox);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.committedRetiredCount, 0);
    assert.deepEqual(out.catalogRetiredIds, []);
    assert.equal(out.catalogSource, "committed");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("committed LKG feed WITH a valid retired[] parses cleanly and the build succeeds (the mechanism is usable)", () => {
  const sandbox = makeSandbox();
  try {
    // Withdraw one real active programme into `retired[]` (a tombstone must
    // never also be an active id), recomputing count/contentHash the same
    // way AMOS does, so this is a realistic, self-consistent committed
    // snapshot — the exact real-data shape the operator reproduced by hand.
    const feedPath = join(sandbox, FEED_PATH);
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    const active = feed.programs.filter((p) => !p.status || p.status === "active");
    const target = active[0];
    feed.programs = feed.programs.filter((p) => p.id !== target.id);
    feed.count = feed.programs.length;
    feed.retired = [
      {
        id: target.id,
        name: target.name,
        provider: target.provider,
        providerType: target.providerType,
        field: target.field,
        url: target.url,
        withdrawnOn: "2026-08-18"
      }
    ];
    feed.contentHash = recomputeContentHash(feed);
    writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");

    const run = probeCommittedLoader(sandbox);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const out = lastJsonLine(run.stdout);
    assert.equal(out.committedRetiredCount, 1);
    assert.deepEqual(out.catalogRetiredIds, [target.id]);
    assert.equal(out.catalogLength, active.length - 1, "the retired programme must not remain in the active catalog");
    assert.equal(out.catalogSource, "committed");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
