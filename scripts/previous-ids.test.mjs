import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { explicitPreviousIdAliases } from "./previous-ids.mjs";

const program = (id, extra = {}) => ({ id, ...extra });
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("explicit previousIds take precedence and retain every declared rename", () => {
  const aliases = explicitPreviousIdAliases([
    program("current-program", {
      previousIds: ["old-program", "older-program"],
      lineageDecisionRef: "lineage/2613/current-program"
    })
  ]);
  assert.deepEqual([...aliases], [["old-program", "current-program"], ["older-program", "current-program"]]);
});

test("old feeds without explicit lineage keep the inference path available", () => {
  assert.deepEqual([...explicitPreviousIdAliases([program("current-program")])], []);
});

for (const [name, programs] of [
  ["missing decision reference", [program("current-program", { previousIds: ["old-program"] })]],
  ["missing previous ids", [program("current-program", { lineageDecisionRef: "lineage/2613" })]],
  ["self id", [program("current-program", { previousIds: ["current-program"], lineageDecisionRef: "lineage/2613" })]],
  ["active id", [program("current-program", { previousIds: ["active-program"], lineageDecisionRef: "lineage/2613" }), program("active-program")]],
  ["collision", [program("current-one", { previousIds: ["old-program"], lineageDecisionRef: "lineage/one" }), program("current-two", { previousIds: ["old-program"], lineageDecisionRef: "lineage/two" })]]
]) {
  test(`explicit lineage rejects ${name} instead of fuzzy mapping it`, () => {
    assert.throws(() => explicitPreviousIdAliases(programs), /explicit lineage/);
  });
}

test("generator prefers explicit previousIds over a conflicting computed-name alias", () => {
  // Exercise the real generator against a disposable feed copy. Pick a current
  // row whose name-derived historic id differs from its canonical id, then
  // declare that old id for another live programme. The generated 301 must
  // honour AMOS's explicit lineage decision, not the heuristic's guess.
  const sandbox = mkdtempSync(join(tmpdir(), "mkval-previous-ids-"));
  try {
    cpSync(ROOT, sandbox, {
      recursive: true,
      filter: (source) => ![".git", "node_modules", "dist"].includes(source.split("/").at(-1))
    });
    const feedPath = join(sandbox, "src/data/catalog/credential-commons-lkg/catalog-feed.json");
    const feed = JSON.parse(readFileSync(feedPath, "utf8"));
    const active = feed.programs.filter((p) => !p.status || p.status === "active");
    const translit = { õ: "o", ä: "a", ö: "o", ü: "u", š: "s", ž: "z", Õ: "o", Ä: "a", Ö: "o", Ü: "u", Š: "s", Ž: "z" };
    const slugify = (input) => input.split("").map((ch) => translit[ch] ?? ch).join("").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
    const sorted = active.slice().sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));
    const used = new Map();
    const computed = new Map();
    for (const row of sorted) {
      const base = slugify(`${row.provider} ${row.name}`) || "programm";
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      computed.set(row, seen === 0 ? base : `${base}-${seen + 1}`);
    }
    const liveIds = new Set(active.map((row) => row.id));
    const rawCounts = new Map();
    for (const row of active) {
      const raw = slugify(`${row.provider} ${row.name}`);
      rawCounts.set(raw, (rawCounts.get(raw) ?? 0) + 1);
    }
    const inferred = sorted.find((row) =>
      computed.get(row) !== row.id &&
      !liveIds.has(computed.get(row)) &&
      rawCounts.get(slugify(`${row.provider} ${row.name}`)) === 1
    );
    assert.ok(inferred, "fixture must contain a computed-name alias");
    const declaredTarget = active.find((row) => row !== inferred);
    assert.ok(declaredTarget, "fixture needs a second active programme");
    const oldId = computed.get(inferred);
    declaredTarget.previousIds = [oldId];
    declaredTarget.lineageDecisionRef = "lineage/test/explicit-wins";
    writeFileSync(feedPath, JSON.stringify(feed, null, 2) + "\n");

    const ledgerPath = join(sandbox, "src/data/kataloog-known-slugs.json");
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    if (!ledger.includes(oldId)) writeFileSync(ledgerPath, JSON.stringify([...ledger, oldId], null, 2) + "\n");

    const run = spawnSync(process.execPath, ["scripts/gen-slug-redirects.mjs"], { cwd: sandbox, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const redirects = JSON.parse(readFileSync(join(sandbox, "vercel.json"), "utf8")).redirects;
    assert.deepEqual(
      redirects.find((redirect) => redirect.source === `/kataloog/${oldId}/`),
      { source: `/kataloog/${oldId}/`, destination: `/kataloog/${declaredTarget.id}/`, permanent: true }
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
