// Owner decision 2026-09-29: the site does not call itself "sõltumatu" / "independent"
// (Ettevõtluskeskus OÜ has an interest in the field), and describes itself as a
// "kataloog"/"catalogue", not a "register". Scans the copy sources (pages, components,
// copy data) — third-party data (provider texts, EHIS snapshot) is out of scope.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP = /src[\\/]data[\\/](catalog|ehisFacts|labor|salary)[\\/]/;
const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk("src").filter((f) => /\.(astro|ts)$/.test(f) && !SKIP.test(f));

const BANNED = [
  [/sõltumatu/i, "sõltumatu"],
  [/independent(?!ly| study)/i, "independent"],
  [/mikrokraadide register\b/i, "self-named as register"],
  [/microdegrees register\b/i, "self-named as register"],
];

test("public copy makes no independence claim and does not call the site a register", () => {
  const hits = [];
  for (const f of files) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      for (const [re, why] of BANNED) if (re.test(line)) hits.push(`${f}:${i + 1} (${why}) ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(hits, []);
});
