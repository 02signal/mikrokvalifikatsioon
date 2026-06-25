// Regenerate the legacy-slug 301 redirect map for vercel.json so EVERY destination
// is a real CURRENT page. The legacy bug: some old catalog URLs encoded Estonian
// diacritics (and a couple of curly quotes) as HTML-entity name fragments BEFORE
// slugify, so e.g. `õ` became the token `otilde`. We rebuild the broken source
// form for every current diacritic-bearing catalog page and map it to the real
// current slug. PR #5's 19 known-real broken URLs are pinned and resolved against
// the SAME current slug set (several of PR #5's destinations are now stale).
//
// Source of truth for "what pages exist": the catalog data + the exact slugify in
// src/data/slug.ts (replicated here), cross-checked against the built dist/ tree.
//
// Usage: node scripts/gen-slug-redirects.mjs            (writes vercel.json)
//        node scripts/gen-slug-redirects.mjs --check     (verify only, no write)

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- exact replica of src/data/slug.ts -------------------------------------
const TRANSLIT = {
  õ: "o", ä: "a", ö: "o", ü: "u", š: "s", ž: "z",
  Õ: "o", Ä: "a", Ö: "o", Ü: "u", Š: "s", Ž: "z"
};
function slugify(input) {
  return input
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
function assignSlugs(items, key) {
  const used = new Map();
  const result = new Map();
  for (const item of items) {
    const base = slugify(key(item)) || "programm";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    result.set(item, seen === 0 ? base : `${base}-${seen + 1}`);
  }
  return result;
}

// --- entity-broken slugify (reproduces the legacy bug) ----------------------
// In the broken data, diacritics + a couple of curly quotes were stored as HTML
// entity NAMES (e.g. "&otilde;") before slugify, so the entity name leaked into
// the slug as its own token. Observed in PR #5: õ→otilde, ä→auml, ö→ouml,
// ü→uuml, š→scaron, ž→zcaron, „→bdquo, "/"→ldquo. Provider diacritics were NOT
// entity-broken (provider "Tartu Ülikool" → "tartu-ulikool"); only the programme
// NAME was. We therefore entity-encode the name and slugify provider+name.
const ENTITY = {
  õ: "otilde", Õ: "otilde",
  ä: "auml", Ä: "auml",
  ö: "ouml", Ö: "ouml",
  ü: "uuml", Ü: "uuml",
  š: "scaron", Š: "scaron",
  ž: "zcaron", Ž: "zcaron",
  "„": "bdquo", "“": "ldquo", "”": "ldquo"
};
const ENTITY_CHARS = Object.keys(ENTITY).join("");
function hasEntityChar(s) {
  return [...s].some((ch) => ENTITY[ch] !== undefined);
}
// Encode entity-bearing chars to " <name> " (space-separated so slugify makes
// them their own hyphen tokens, matching the observed `s-uuml-steemianal-...`).
function entityEncode(name) {
  return [...name].map((ch) => (ENTITY[ch] !== undefined ? ` ${ENTITY[ch]} ` : ch)).join("");
}

// --- load catalog data exactly like src/data/catalog/index.ts ---------------
function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}
const localEntries = [
  ...loadJson("src/data/catalog/taltech.json"),
  ...loadJson("src/data/catalog/tartu-ylikool.json"),
  ...loadJson("src/data/catalog/muud-koolid.json")
];
const sorted = localEntries
  .slice()
  .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));
const slugMap = assignSlugs(sorted, (e) => `${e.provider} ${e.name}`);

// Current valid catalog slug set (from data) + cross-check vs dist if present.
const currentCatalogSlugs = new Set([...slugMap.values()]);
const distKataloog = join(ROOT, "dist", "kataloog");
if (existsSync(distKataloog)) {
  const distSlugs = new Set(
    readdirSync(distKataloog, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  );
  // data-derived slugs must match the built tree exactly
  const onlyInData = [...currentCatalogSlugs].filter((s) => !distSlugs.has(s));
  const onlyInDist = [...distSlugs].filter((s) => !currentCatalogSlugs.has(s));
  if (onlyInData.length || onlyInDist.length) {
    console.error("[gen] data/dist slug mismatch (rebuild dist?):");
    if (onlyInData.length) console.error("  only in data:", onlyInData.slice(0, 8));
    if (onlyInDist.length) console.error("  only in dist:", onlyInDist.slice(0, 8));
    process.exit(2);
  }
}

// Field (valdkond) slugs + real top-level routes for destination validation.
const fields = [...new Set(sorted.map((e) => e.field))].filter((f) => f !== "muu");
const fieldSlugs = new Set(fields.map((f) => slugify(f)));

// A destination is valid iff it resolves to a real current page.
function destExists(dest) {
  const m = dest.match(/^\/kataloog\/([^/]+)\/$/);
  if (m) return currentCatalogSlugs.has(m[1]);
  const f = dest.match(/^\/valdkond\/([^/]+)\/$/);
  if (f) return fieldSlugs.has(f[1]);
  return dest === "/kataloog/"; // last-resort real route
}

// --- PR #5's 19 known-real broken source URLs, pinned -----------------------
// Several of PR #5's destinations are now stale; we remap them to the CURRENT
// slug. The "õpetajate akadeemia ... programmid" listing variants and any source
// with no surviving programme fall back to the haridus field page.
const HARIDUS = "/valdkond/haridus/";
const pr5 = [
  // teacher-education listing variants — no current single programme → field page
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-2/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-3/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-4/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-5/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-6/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-7/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-8/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-9/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-10/", HARIDUS],
  ["/kataloog/tartu-ulikool-otilde-petajate-akadeemia-mikrokraadi-ja-mikrokvalifikatsiooniprogrammid-11/", HARIDUS],
  // single programmes that survive — map to the CURRENT slug
  ["/kataloog/tartu-ulikool-andmep-otilde-hine-riskijuhtimine/", "/kataloog/tartu-ulikool-andmepohine-riskijuhtimine/"],
  ["/kataloog/tartu-ulikool-loovettev-otilde-tja-mikrokraadiprogramm/", "/kataloog/tartu-ulikool-loovettevotja/"],
  ["/kataloog/tartu-ulikool-loovettev-otilde-tluse-projektijuhtimise-mikrokraadiprogramm/", "/kataloog/tartu-ulikool-loovettevotluse-projektijuhtimine/"],
  ["/kataloog/tartu-ulikool-mikrokraadiprogramm-ouml-koloogia-ja-looduskaitse-globaalmuutuste-tingimustes/", "/kataloog/tartu-ulikool-okoloogia-ja-looduskaitse-globaalmuutuste-tingimustes/"],
  ["/kataloog/tartu-ulikool-mikrokraadiprogramm-bdquo-andmeanal-uuml-uuml-s-ldquo/", "/kataloog/tartu-ulikool-andmeanaluus/"],
  ["/kataloog/tartu-ulikool-mikrokraadiprogramm-bdquo-riigihangete-korraldamine-ldquo/", "/kataloog/tartu-ulikool-riigihangete-korraldamine/"],
  ["/kataloog/tartu-ulikool-s-uuml-steemianal-uuml-uuml-s/", "/kataloog/tartu-ulikool-susteemianaluus/"]
];

// --- build redirect list ----------------------------------------------------
const redirects = [];
const seenSources = new Set();
function add(source, destination) {
  if (seenSources.has(source)) return;
  if (source === destination) return; // never self-redirect
  seenSources.add(source);
  redirects.push({ source, destination, permanent: true });
}

// 1) PR #5's 19 known-wild broken URLs (highest priority).
for (const [source, destination] of pr5) add(source, destination);

// 2) Every CURRENT diacritic-bearing catalog page: generate its broken source.
//    This rescues any other legacy entity-broken URL the same bug would produce.
for (const entry of sorted) {
  const dest = `/kataloog/${slugMap.get(entry)}/`;
  if (!hasEntityChar(entry.name) && !hasEntityChar(entry.provider)) continue;
  // Reproduce the bug: entity-encode the NAME, keep provider transliterated.
  const brokenSlug = slugify(`${entry.provider} ${entityEncode(entry.name)}`);
  const brokenSource = `/kataloog/${brokenSlug}/`;
  if (brokenSlug && brokenSlug !== slugMap.get(entry)) add(brokenSource, dest);
}

// --- preserve pre-existing non-slug redirects (plural-domain catch-alls) -----
const vercelPath = join(ROOT, "vercel.json");
const existing = JSON.parse(readFileSync(vercelPath, "utf8"));
const preserved = (existing.redirects || []).filter(
  (r) => typeof r.source === "string" && !r.source.startsWith("/kataloog/")
);

const finalRedirects = [...redirects, ...preserved];

// --- verify: every destination must resolve to a real current page ----------
const dead = finalRedirects.filter((r) => {
  if (typeof r.destination !== "string") return false; // external/host redirects
  if (/^https?:\/\//.test(r.destination)) return false; // absolute external
  return !destExists(r.destination);
});

const slugRedirects = finalRedirects.filter((r) => r.source.startsWith("/kataloog/"));
console.log(`[gen] current catalog slugs: ${currentCatalogSlugs.size}`);
console.log(`[gen] field slugs: ${[...fieldSlugs].join(", ")}`);
console.log(`[gen] slug redirects: ${slugRedirects.length}`);
console.log(`[gen] preserved (non-slug) redirects: ${preserved.length}`);
console.log(`[gen] total redirects: ${finalRedirects.length}`);
const fallbackToField = slugRedirects.filter((r) => r.destination === HARIDUS);
console.log(`[gen] remapped to ${HARIDUS} fallback: ${fallbackToField.length}`);
if (dead.length) {
  console.error(`[gen] DEAD destinations (${dead.length}):`);
  for (const r of dead) console.error(`  ${r.source} -> ${r.destination}`);
  process.exit(1);
}
console.log("[gen] 0 dead destinations — every destination is a real current page.");

if (!process.argv.includes("--check")) {
  const out = JSON.stringify({ redirects: finalRedirects }, null, 2) + "\n";
  writeFileSync(vercelPath, out);
  console.log(`[gen] wrote ${vercelPath}`);
}
