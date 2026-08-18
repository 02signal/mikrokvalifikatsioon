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

test("id-churn: a programme dropped from the feed with NO retired[] entry (unexplained) still fails loudly, and writes no redirect for it", () => {
  // This is the exact failure the guard exists for: an id the legacy catalog
  // still knows, which the feed no longer explains as either active or
  // retired — i.e. a live /kataloog/<id>/ page about to die silently, with
  // nothing accounting for why. It must fail loudly and must NOT produce a
  // redirect (the run aborts before vercel.json is (re)written at all).
  const sandbox = makeSandbox();
  try {
    const vercelPath = join(sandbox, "vercel.json");
    const before = readFileSync(vercelPath, "utf8");
    withdrawOneProgramme(sandbox, { explain: false });
    const run = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(run.status, 2, run.stdout);
    assert.match(run.stderr, /id-churn/, "an unexplained drop (no retired[] entry) must still be caught");
    // The run must abort before writing ANY redirect for this — vercel.json
    // (including whatever it already contained) is left byte-for-byte alone.
    assert.equal(readFileSync(vercelPath, "utf8"), before, "a rejected run must never write/rewrite vercel.json");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

/** Remove the legacy JSON entry (in whichever of the three per-provider files
 * carries it) matching `provider`+`name`, mirroring the OLD manual withdrawal
 * path (today's real state: EBS's withdrawn programme was hand-deleted from
 * `muud-koolid.json` earlier, independent of this mechanism). Returns true if
 * an entry was removed. */
function removeFromLegacyJson(sandbox, provider, name) {
  for (const rel of ["src/data/catalog/taltech.json", "src/data/catalog/tartu-ylikool.json", "src/data/catalog/muud-koolid.json"]) {
    const path = join(sandbox, rel);
    const entries = JSON.parse(readFileSync(path, "utf8"));
    const next = entries.filter((e) => !(e.provider === provider && e.name === name));
    if (next.length !== entries.length) {
      writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
      return true;
    }
  }
  return false;
}

test("id-churn: a programme moved to retired[] AND already removed from legacy JSON (today's real state) still keeps the generator green", () => {
  // Reproduces exactly what the operator proved by hand: the legacy JSON no
  // longer lists the withdrawn programme (old manual path, already applied),
  // while the LKG feed now explains the SAME id via `retired[]`. The two
  // sides disagree in COUNT (legacy lost one id outright) but not in
  // COVERAGE (the feed still accounts for that id) — set equality would
  // wrongly reject this; the one-directional "legacy ⊆ feed-known" rule must
  // accept it.
  const sandbox = makeSandbox();
  try {
    const feedPath = join(sandbox, "src/data/catalog/credential-commons-lkg/catalog-feed.json");
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    const active = feed.programs.filter((p) => !p.status || p.status === "active");
    const target = active[0];

    const removed = removeFromLegacyJson(sandbox, target.provider, target.name);
    assert.ok(removed, "test fixture assumption broke: target programme must exist in a legacy JSON file");

    const id = withdrawOneProgramme(sandbox, { explain: true });
    assert.equal(id, target.id, "test fixture assumption broke: withdrawOneProgramme must pick the same programme we removed from legacy JSON");

    const run = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.doesNotMatch(run.stderr, /id-churn/, "legacy JSON already lacking the id must not trip the guard when the feed explains it via retired[]");

    const { redirects } = JSON.parse(readFileSync(join(sandbox, "vercel.json"), "utf8"));
    assert.equal(
      redirects.find((r) => r.source === `/kataloog/${id}/`),
      undefined,
      "the retired id's own /kataloog/ page is a real destination (item C) — never 301 it away"
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("id-churn: a brand-new active programme id the legacy JSON never had (candidate approved) keeps the generator green", () => {
  // 41 newly discovered programmes are waiting to be approved; each becomes a
  // new id in the feed's active set with no corresponding legacy JSON entry
  // at all. That is healthy growth, not churn, and must never fail the build.
  const sandbox = makeSandbox();
  try {
    const feedPath = join(sandbox, "src/data/catalog/credential-commons-lkg/catalog-feed.json");
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    const template = feed.programs.find((p) => !p.status || p.status === "active");
    const newProgram = {
      ...template,
      id: "uus-kool-uus-mikrokraad-2026",
      name: "Uus mikrokraad, mida legacy JSON ei ole kunagi näinud",
      provider: "Täiesti Uus Kool",
      status: "active"
    };
    feed.programs = [...feed.programs, newProgram];
    feed.count = feed.programs.length;
    writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");

    const run = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.doesNotMatch(run.stderr, /id-churn/, "a brand-new id absent from legacy JSON must not trip the guard");
    // Assert the new id is reported as healthy growth, not an exact "feed
    // knows N id(s)" count: the sandbox is a copy of the live repo's OWN
    // committed feed (see makeSandbox), which may already carry its own
    // real retired[] entries (e.g. a genuine AMOS-measured withdrawal not
    // yet reflected in the legacy JSON) independent of this test's fixture.
    // Hardcoding "1" here would make this test hostage to that unrelated,
    // time-varying fact — the exact same "today's data as the rule" defect
    // this PR exists to eliminate elsewhere (see catalog-floor.test.mjs).
    assert.match(run.stdout, /id-churn: feed knows \d+ id\(s\) legacy JSON does not/);
    assert.match(run.stdout, /uus-kool-uus-mikrokraad-2026/, "the new candidate id must be reported as feed-only growth");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
