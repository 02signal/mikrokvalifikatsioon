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
// ALSO regenerates /vordlus/<a>-vs-<b>/ comparison-page redirects (see the
// "vordlus link-rot" section below). Comparison pairs are derived from the
// catalogue and disappear whenever a programme rotates out at a catalogue
// refresh (or is renamed/re-issued a new AMOS programme_ref) — including pairs
// Google has indexed and users have clicked. `src/data/vordlus-known-slugs.json`
// is a growing ledger of every comparison slug ever generated; any ledger entry
// that is no longer live gets a 301 to the best surviving destination, computed
// fresh from the CURRENT catalogue every run (never hand-written).
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
  return dest === "/kataloog/" || dest === "/mikrokraadid/"; // last-resort real routes
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

// ============================================================================
// --- vordlus link-rot: comparison-page redirects (ledger-driven) -----------
// ============================================================================
// Comparison pages are /vordlus/<idA>-vs-<idB>/, generated only for same-field
// pairs (src/data/comparisons.ts, TOP_K nearest by shared outcomes). A pair
// 404s whenever either programme rotates out of the catalogue OR AMOS
// re-issues a new canonical id for the SAME programme (dropping an
// intake-year suffix, or normalizing an English marketing title to the
// EHIS-authoritative Estonian one, e.g. "Chip Design" -> "Kiibidisain"). This
// happens silently at every catalogue refresh, well before Google re-crawls —
// measured: 83 of 121 /vordlus/ URLs Search Console saw in a 45-day window
// were already 404, holding 302 of 418 impressions and 4 of 5 clicks.
//
// `src/data/vordlus-known-slugs.json` is a growing, human-diffable ledger of
// every comparison slug ever generated. Any ledger entry that is no longer a
// live page gets a 301, computed FRESH every run against the CURRENT
// catalogue (never hand-written), preferring: (1) a surviving half of the
// pair — resolved either directly by id, or via a "computed-name" alias that
// catches an id-churn rename, or after stripping a de-dup suffix that shifted
// because a same-named sibling vanished entirely; else (2) /mikrokraadid/
// (no safe, data-derived way to recover a shared field once BOTH halves and
// their ids are gone — see the report this script prints for any such case).

const feed = loadJson("src/data/catalog/credential-commons-lkg/catalog-feed.json");
const activePrograms = feed.programs.filter((p) => !p.status || p.status === "active");
const liveIds = new Set(activePrograms.map((p) => p.id));

// Sanity: the LKG feed's active id set must be the SAME catalogue as the
// legacy-JSON-derived `currentCatalogSlugs` above (both describe "what
// /kataloog/ pages exist right now"). If they ever diverge, something is
// stale (rebuild dist / resync a data source) — fail loudly rather than
// silently redirecting into the wrong catalogue snapshot.
{
  const onlyInFeed = [...liveIds].filter((s) => !currentCatalogSlugs.has(s));
  const onlyInLegacy = [...currentCatalogSlugs].filter((s) => !liveIds.has(s));
  if (onlyInFeed.length || onlyInLegacy.length) {
    console.error("[gen] vordlus: LKG feed id set != legacy-derived catalog slug set:");
    if (onlyInFeed.length) console.error("  only in feed:", onlyInFeed.slice(0, 8));
    if (onlyInLegacy.length) console.error("  only in legacy set:", onlyInLegacy.slice(0, 8));
    process.exit(2);
  }
}

// "Computed-name" alias: reproduce the id an active programme's CURRENT
// provider+name would slugify to, sorted exactly like src/data/catalog/index.ts
// sorts (provider then name, "et" locale) before de-dup suffixes are assigned.
// When AMOS re-issues a canonical id for the same programme, this computed
// value is what the OLD id used to be — i.e. exactly the fragment baked into
// an already-indexed dead /vordlus/ URL. Differs from the live `id` for ~44 of
// 169 current programmes (verified against the 2026-07 GSC export).
const feedSortedActive = activePrograms
  .slice()
  .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));
const computedIdByProgram = assignSlugs(feedSortedActive, (p) => `${p.provider} ${p.name}`);
const aliasToId = new Map(); // historical computed slug -> live id (only where they differ)
for (const p of activePrograms) {
  const computed = computedIdByProgram.get(p);
  if (computed !== p.id && !aliasToId.has(computed)) aliasToId.set(computed, p.id);
}

/** Resolve one half of a "<a>-vs-<b>" ledger pair to a live catalog id. */
function resolveHalfToLiveId(slug) {
  if (liveIds.has(slug)) return slug;
  if (aliasToId.has(slug)) return aliasToId.get(slug);
  const stripped = slug.replace(/-\d+$/, "");
  if (stripped !== slug) {
    if (liveIds.has(stripped)) return stripped;
    if (aliasToId.has(stripped)) return aliasToId.get(stripped);
  }
  return null;
}

/** Every "-vs-" split point (>1 only if an id itself contained that literal
 * substring; none do today, but we don't assume it stays that way). */
function splitPair(pair) {
  const splits = [];
  let idx = pair.indexOf("-vs-");
  while (idx !== -1) {
    splits.push({ a: pair.slice(0, idx), b: pair.slice(idx + 4) });
    idx = pair.indexOf("-vs-", idx + 1);
  }
  return splits;
}

const MIKROKRAADID = "/mikrokraadid/";
const ledger = loadJson("src/data/vordlus-known-slugs.json");
const distVordlus = join(ROOT, "dist", "vordlus");
const livePairs = existsSync(distVordlus)
  ? new Set(readdirSync(distVordlus, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name))
  : null;

const vordlusRedirects = [];
if (!livePairs) {
  console.warn("[gen] vordlus: dist/vordlus not found — run `npm run build` first; skipping vordlus redirect generation this run.");
} else {
  const unresolvedPairs = [];
  for (const pair of ledger) {
    if (livePairs.has(pair)) continue; // still a real page — never redirect a live URL
    let destination = null;
    for (const { a, b } of splitPair(pair)) {
      const idA = resolveHalfToLiveId(a);
      const idB = resolveHalfToLiveId(b);
      if (!idA && !idB) continue;
      // Prefer the half that is STILL live under its OWN current id (no
      // rename/alias needed to explain it) over one recovered indirectly;
      // "a" (the alphabetically-first original half) breaks ties.
      const aDirect = idA != null && liveIds.has(a);
      const bDirect = idB != null && liveIds.has(b);
      const chosenId = idA && idB ? (aDirect || !bDirect ? idA : idB) : (idA ?? idB);
      destination = `/kataloog/${chosenId}/`;
      break;
    }
    if (!destination) {
      destination = MIKROKRAADID; // neither half resolves to any known id/alias
      unresolvedPairs.push(pair);
    }
    vordlusRedirects.push({ source: `/vordlus/${pair}/`, destination, permanent: true });
  }
  const stillLive = ledger.filter((p) => livePairs.has(p)).length;
  const viaProgramme = vordlusRedirects.filter((r) => r.destination !== MIKROKRAADID).length;
  console.log(`[gen] vordlus: ledger ${ledger.length}, still live ${stillLive}, redirected ${vordlusRedirects.length}`);
  console.log(`[gen] vordlus: -> surviving programme: ${viaProgramme}, -> ${MIKROKRAADID} fallback: ${unresolvedPairs.length}`);
  if (unresolvedPairs.length) {
    console.log(`[gen] vordlus: fallback pairs (neither half resolves to any known id/alias):`);
    for (const p of unresolvedPairs) console.log(`  ${p}`);
  }
  // Grow the ledger with any newly-observed live pair so future rotations of
  // THIS pair are caught too, next time a programme in it disappears.
  const grown = [...new Set([...ledger, ...livePairs])].sort((a, b) => a.localeCompare(b));
  if (grown.length !== ledger.length && !process.argv.includes("--check")) {
    writeFileSync(join(ROOT, "src/data/vordlus-known-slugs.json"), JSON.stringify(grown, null, 2) + "\n");
    console.log(`[gen] vordlus: ledger grown ${ledger.length} -> ${grown.length}`);
  }
}

// --- preserve pre-existing non-slug, non-vordlus redirects -------------------
const vercelPath = join(ROOT, "vercel.json");
const existing = JSON.parse(readFileSync(vercelPath, "utf8"));
const preserved = (existing.redirects || []).filter(
  (r) => typeof r.source === "string" && !r.source.startsWith("/kataloog/") && !r.source.startsWith("/vordlus/")
);

const finalRedirects = [...redirects, ...vordlusRedirects, ...preserved];

// --- verify: every destination must resolve to a real current page ----------
const dead = finalRedirects.filter((r) => {
  if (typeof r.destination !== "string") return false; // external/host redirects
  if (/^https?:\/\//.test(r.destination)) return false; // absolute external
  return !destExists(r.destination);
});

// --- verify: no redirect chains (a destination must never itself be a source) -
const sourceSet = new Set(finalRedirects.map((r) => r.source));
const chains = finalRedirects.filter(
  (r) => typeof r.destination === "string" && !/^https?:\/\//.test(r.destination) && sourceSet.has(r.destination)
);

const slugRedirects = finalRedirects.filter((r) => r.source.startsWith("/kataloog/"));
const vordlusRedirectCount = finalRedirects.filter((r) => r.source.startsWith("/vordlus/")).length;
console.log(`[gen] current catalog slugs: ${currentCatalogSlugs.size}`);
console.log(`[gen] field slugs: ${[...fieldSlugs].join(", ")}`);
console.log(`[gen] slug redirects: ${slugRedirects.length}`);
console.log(`[gen] vordlus redirects: ${vordlusRedirectCount}`);
console.log(`[gen] preserved (non-slug, non-vordlus) redirects: ${preserved.length}`);
console.log(`[gen] total redirects: ${finalRedirects.length}`);
const fallbackToField = slugRedirects.filter((r) => r.destination === HARIDUS);
console.log(`[gen] remapped to ${HARIDUS} fallback: ${fallbackToField.length}`);
if (chains.length) {
  console.error(`[gen] REDIRECT CHAINS (${chains.length}) — a destination is itself a redirect source:`);
  for (const r of chains) console.error(`  ${r.source} -> ${r.destination} (which is also a source)`);
  process.exit(1);
}
if (dead.length) {
  console.error(`[gen] DEAD destinations (${dead.length}):`);
  for (const r of dead) console.error(`  ${r.source} -> ${r.destination}`);
  process.exit(1);
}
console.log("[gen] 0 dead destinations, 0 redirect chains — every destination is a real current page.");

if (!process.argv.includes("--check")) {
  const out = JSON.stringify({ redirects: finalRedirects }, null, 2) + "\n";
  writeFileSync(vercelPath, out);
  console.log(`[gen] wrote ${vercelPath}`);
}
