// Item B: the id-churn guard (gen-slug-redirects.mjs) must stay green when an
// active programme moves to `retired[]` WITHOUT anyone hand-editing the legacy
// JSON files — and it must still catch a genuinely unexplained drop. Both
// directions are exercised against the REAL generator script in a disposable
// sandbox copy (same pattern as scripts/previous-ids.test.mjs), not a reimplementation.
import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function makeSandbox() {
  const sandbox = mkdtempSync(join(tmpdir(), "mkval-retired-kataloog-"));
  cpSync(ROOT, sandbox, {
    recursive: true,
    filter: (source) => ![".git", "node_modules", "dist"].includes(source.split("/").at(-1))
  });
  return sandbox;
}

/** Move one active programme in the sandbox's committed feed to `retired[]`
 * (or just delete it, when `explain` is false) — WITHOUT touching any legacy
 * JSON file. Returns the withdrawn programme's id. */
function withdrawOneProgramme(sandbox, { explain }) {
  const feedPath = join(sandbox, "src/data/catalog/credential-commons-lkg/catalog-feed.json");
  const feed = JSON.parse(readFileSync(feedPath, "utf8"));
  const active = feed.programs.filter((p) => !p.status || p.status === "active");
  const target = active[0];
  feed.programs = feed.programs.filter((p) => p.id !== target.id);
  feed.count = feed.programs.length;
  if (explain) {
    feed.retired = [
      ...(feed.retired ?? []),
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
  }
  writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");

  // Make sure the id-churn ledger actually walks this slug this run (it is a
  // growing ledger; ensure membership rather than assume it from prior runs).
  const ledgerPath = join(sandbox, "src/data/kataloog-known-slugs.json");
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  if (!ledger.includes(target.id)) {
    writeFileSync(ledgerPath, JSON.stringify([...ledger, target.id].sort(), null, 2) + "\n");
  }
  return target.id;
}

test("id-churn: a programme moved to retired[] (legacy JSON untouched) keeps the generator green and does NOT 301 its /kataloog/ page away", () => {
  const sandbox = makeSandbox();
  try {
    const id = withdrawOneProgramme(sandbox, { explain: true });
    const run = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.doesNotMatch(run.stderr, /id-churn/, "an explained withdrawal must not trip the id-churn guard");

    const { redirects } = JSON.parse(readFileSync(join(sandbox, "vercel.json"), "utf8"));
    const redirectForRetired = redirects.find((r) => r.source === `/kataloog/${id}/`);
    assert.equal(
      redirectForRetired,
      undefined,
      "a retired id's /kataloog/ page is a real destination now (item C) — it must never 301 away"
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("id-churn: a programme dropped from the feed with NO retired[] entry (unexplained) still fails loudly", () => {
  const sandbox = makeSandbox();
  try {
    withdrawOneProgramme(sandbox, { explain: false });
    const run = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(run.status, 2, run.stdout);
    assert.match(run.stderr, /id-churn/, "an unexplained drop (no retired[] entry) must still be caught");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
