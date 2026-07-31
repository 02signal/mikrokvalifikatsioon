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
// ALSO regenerates /kataloog/<slug>/ AND /vordlus/<a>-vs-<b>/ redirects for a
// SITE-WIDE link-rot mechanism: "id churn" (see the section below). A
// catalogue entry's canonical id is not actually permanent — AMOS re-issues it
// whenever a programme is renamed (dropped intake-year suffix, English
// marketing title normalized to the EHIS-authoritative Estonian one, e.g.
// "Chip Design" -> "Kiibidisain"), even though the programme itself never left
// the catalogue. Every /kataloog/<old-id>/ page and every /vordlus/ comparison
// built from that id dies at that moment — including already-indexed,
// already-clicked URLs. `src/data/kataloog-known-slugs.json` and
// `src/data/vordlus-known-slugs.json` are growing ledgers of every slug ever
// generated for each section; any ledger entry no longer live gets a 301 to
// the best surviving destination, computed fresh from the CURRENT catalogue
// every run (never hand-written).
//
// Usage: node scripts/gen-slug-redirects.mjs            (writes vercel.json)
//        node scripts/gen-slug-redirects.mjs --check     (verify only, no write)

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { explicitPreviousIdAliases } from "./previous-ids.mjs";

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

// A destination is valid iff it resolves to a real current page. `liveFieldSlugs`
// is assigned further down (from the active feed, the TRUE current field set —
// see the id-churn section); referenced here by closure, safe because this
// function is only ever CALLED later, in the verify section at the bottom.
function destExists(dest) {
  const m = dest.match(/^\/kataloog\/([^/]+)\/$/);
  if (m) return currentCatalogSlugs.has(m[1]);
  const f = dest.match(/^\/valdkond\/([^/]+)\/$/);
  if (f) return fieldSlugs.has(f[1]) && liveFieldSlugs.has(f[1]);
  return dest === "/kataloog/" || dest === "/mikrokraadid/" || dest === "/teema/" || dest === "/valdkond/"; // last-resort real routes
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
// --- id-churn link rot: shared catalogue-id resolution ----------------------
// ============================================================================
// Both /kataloog/<id>/ (the programme page itself) and /vordlus/<a>-vs-<b>/
// (pairs derived from two ids, src/data/comparisons.ts) die when an id churns
// or a programme rotates out entirely. Measured (GSC, 45-day window):
//   /kataloog/  78 of 212 checkable URLs dead (587 impressions, 15 clicks)
//   /vordlus/   83 of 121 URLs dead           (302 impressions,  4 clicks)
// This section builds ONE shared resolver, reused by both ledgers below.

const feed = loadJson("src/data/catalog/credential-commons-lkg/catalog-feed.json");
const activePrograms = feed.programs.filter((p) => !p.status || p.status === "active");
const liveIds = new Set(activePrograms.map((p) => p.id));
// A v2 row that carries explicit lineage is AMOS's decision, not a hint. The
// helper validates it before any name-derived alias is considered; old feeds
// that omit both fields continue through the existing ledger/inference path.
const explicitAliasToId = explicitPreviousIdAliases(activePrograms);

// Sanity: the LKG feed's active id set must be the SAME catalogue as the
// legacy-JSON-derived `currentCatalogSlugs` above (both describe "what
// /kataloog/ pages exist right now"). If they ever diverge, something is
// stale (rebuild dist / resync a data source) — fail loudly rather than
// silently redirecting into the wrong catalogue snapshot.
{
  const onlyInFeed = [...liveIds].filter((s) => !currentCatalogSlugs.has(s));
  const onlyInLegacy = [...currentCatalogSlugs].filter((s) => !liveIds.has(s));
  if (onlyInFeed.length || onlyInLegacy.length) {
    console.error("[gen] id-churn: LKG feed id set != legacy-derived catalog slug set:");
    if (onlyInFeed.length) console.error("  only in feed:", onlyInFeed.slice(0, 8));
    if (onlyInLegacy.length) console.error("  only in legacy set:", onlyInLegacy.slice(0, 8));
    process.exit(2);
  }
}

// The field (valdkond) pages that ACTUALLY exist today, derived from the
// active feed. NOT the same as `fieldSlugs` above (legacy-JSON-derived): two
// legacy fields ("õigus", "energeetika") currently have zero active
// programmes and hence no live /valdkond/ page, even though the legacy JSON
// snapshot still tags a few (stale, non-active) rows with them.
const liveFieldSlugs = new Set([...new Set(activePrograms.map((p) => p.field))].filter((f) => f !== "muu").map(slugify));

// "Computed-name" alias: reproduce the id an active programme's CURRENT
// provider+name would slugify to, sorted exactly like src/data/catalog/index.ts
// sorts (provider then name, "et" locale) before de-dup suffixes are assigned.
// When AMOS re-issues a canonical id for the same programme, this computed
// value is what the OLD id used to be — i.e. exactly the fragment baked into
// an already-indexed dead /kataloog/ or /vordlus/ URL. Differs from the live
// `id` for ~44-46 of 169 current programmes (verified against the 2026-07 GSC
// export).
const feedSortedActive = activePrograms
  .slice()
  .sort((a, b) => a.provider.localeCompare(b.provider, "et") || a.name.localeCompare(b.name, "et"));
const computedIdByProgram = assignSlugs(feedSortedActive, (p) => `${p.provider} ${p.name}`);

// Collision guard: when >1 active programme shares the exact same
// provider+name text (a generic shared "listing" title — e.g. 12 different
// Tartu Ülikool teacher-education programmes all literally named "Õpetajate
// akadeemia mikrokraadi- ja mikrokvalifikatsiooniprogrammid"), assignSlugs'
// numbered suffix ("-3", "-12", ...) is an artifact of array order, NOT a
// stable correspondence to which specific programme a historical URL meant.
// Resolving such a base as a single-programme alias would silently send users
// to an arbitrary, possibly-wrong programme. Detect every RAW (pre-dedup)
// base collision and refuse to alias any of its numbered variants to one id;
// if every member of the collision group unanimously agrees on `field`, that
// field page is still a safe, honestly-derived fallback (see report for the
// one known case — flagged there as a data-quality caveat, not silently hidden).
const rawBaseGroups = new Map(); // raw slugify(provider+name), BEFORE dedup suffixing -> [program]
for (const p of activePrograms) {
  const raw = slugify(`${p.provider} ${p.name}`);
  if (!rawBaseGroups.has(raw)) rawBaseGroups.set(raw, []);
  rawBaseGroups.get(raw).push(p);
}
const ambiguousBases = new Map(); // every de-dup-suffixed variant of a colliding raw base -> unanimous field (or null)
for (const [, group] of rawBaseGroups) {
  if (group.length <= 1) continue;
  const fields = new Set(group.map((p) => p.field));
  const unanimousField = fields.size === 1 ? [...fields][0] : null;
  for (const p of group) ambiguousBases.set(computedIdByProgram.get(p), unanimousField);
}

const aliasToId = new Map(); // inferred computed slug -> live id (only where they differ, never a collision group)
for (const p of activePrograms) {
  const computed = computedIdByProgram.get(p);
  if (ambiguousBases.has(computed)) continue;
  if (computed !== p.id && !aliasToId.has(computed)) aliasToId.set(computed, p.id);
}

const MIKROKRAADID = "/mikrokraadid/";

/** Resolve a single catalogue-id-shaped slug against the current catalogue.
 * Returns { id, kind } for a specific surviving programme, { destination,
 * kind: "ambiguous" } when only a shared field can be honestly recovered, or
 * null when nothing about it is derivable from current data. */
function resolveSlug(slug) {
  if (liveIds.has(slug)) return { id: slug, kind: "direct" };
  if (explicitAliasToId.has(slug)) return { id: explicitAliasToId.get(slug), kind: "explicit-lineage" };
  if (ambiguousBases.has(slug)) {
    const f = ambiguousBases.get(slug);
    const fs = f ? slugify(f) : null;
    return { destination: fs && liveFieldSlugs.has(fs) ? `/valdkond/${fs}/` : MIKROKRAADID, kind: "ambiguous", field: f };
  }
  if (aliasToId.has(slug)) return { id: aliasToId.get(slug), kind: "alias" };
  const stripped = slug.replace(/-\d+$/, "");
  if (stripped !== slug) {
    if (liveIds.has(stripped)) return { id: stripped, kind: "direct-desuffixed" };
    if (ambiguousBases.has(stripped)) {
      const f = ambiguousBases.get(stripped);
      const fs = f ? slugify(f) : null;
      return { destination: fs && liveFieldSlugs.has(fs) ? `/valdkond/${fs}/` : MIKROKRAADID, kind: "ambiguous-desuffixed", field: f };
    }
    if (explicitAliasToId.has(stripped)) return { id: explicitAliasToId.get(stripped), kind: "explicit-lineage-desuffixed" };
    if (aliasToId.has(stripped)) return { id: aliasToId.get(stripped), kind: "alias-desuffixed" };
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

/** Grow a ledger file with newly-observed live slugs and report. */
function growLedger(relPath, ledger, liveSet) {
  const grown = [...new Set([...ledger, ...liveSet])].sort((a, b) => a.localeCompare(b));
  if (grown.length !== ledger.length && !process.argv.includes("--check")) {
    writeFileSync(join(ROOT, relPath), JSON.stringify(grown, null, 2) + "\n");
    console.log(`[gen] ${relPath}: ledger grown ${ledger.length} -> ${grown.length}`);
  }
}

// ============================================================================
// --- /vordlus/ ledger --------------------------------------------------------
// ============================================================================
const vordlusLedger = loadJson("src/data/vordlus-known-slugs.json");
const distVordlus = join(ROOT, "dist", "vordlus");
const livePairs = existsSync(distVordlus)
  ? new Set(readdirSync(distVordlus, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name))
  : null;

const vordlusRedirects = [];
if (!livePairs) {
  console.warn("[gen] vordlus: dist/vordlus not found — run `npm run build` first; skipping vordlus redirect generation this run.");
} else {
  const unresolvedPairs = [];
  for (const pair of vordlusLedger) {
    if (livePairs.has(pair)) continue; // still a real page — never redirect a live URL
    let destination = null;
    for (const { a, b } of splitPair(pair)) {
      const ra = resolveSlug(a);
      const rb = resolveSlug(b);
      if (!ra && !rb) continue;
      // Prefer a specific surviving programme over an ambiguous field-page
      // fallback; among two specific programmes, prefer the one STILL live
      // under its OWN current id (no rename/alias needed) — "a" breaks ties.
      const scoreOf = (r, raw) => (!r ? -1 : r.kind === "ambiguous" || r.kind === "ambiguous-desuffixed" ? 0 : liveIds.has(raw) ? 2 : 1);
      const sa = scoreOf(ra, a), sb = scoreOf(rb, b);
      const chosen = sa >= sb ? ra : rb;
      destination = chosen.id ? `/kataloog/${chosen.id}/` : chosen.destination;
      break;
    }
    if (!destination) {
      destination = MIKROKRAADID; // neither half resolves to any known id/alias/field
      unresolvedPairs.push(pair);
    }
    vordlusRedirects.push({ source: `/vordlus/${pair}/`, destination, permanent: true });
  }
  const stillLive = vordlusLedger.filter((p) => livePairs.has(p)).length;
  const viaProgramme = vordlusRedirects.filter((r) => r.destination !== MIKROKRAADID).length;
  console.log(`[gen] vordlus: ledger ${vordlusLedger.length}, still live ${stillLive}, redirected ${vordlusRedirects.length}`);
  console.log(`[gen] vordlus: -> surviving programme/field: ${viaProgramme}, -> ${MIKROKRAADID} fallback: ${unresolvedPairs.length}`);
  if (unresolvedPairs.length) {
    console.log(`[gen] vordlus: fallback pairs (neither half resolves to any known id/alias):`);
    for (const p of unresolvedPairs) console.log(`  ${p}`);
  }
  // Grow the ledger with any newly-observed live pair so future rotations of
  // THIS pair are caught too, next time a programme in it disappears.
  growLedger("src/data/vordlus-known-slugs.json", vordlusLedger, livePairs);
}

// ============================================================================
// --- /kataloog/ ledger (id-churn, DISTINCT from the entity-bug redirects) ---
// ============================================================================
const kataloogLedger = loadJson("src/data/kataloog-known-slugs.json");
const kataloogRedirects = [];
{
  const unresolvedSlugs = [];
  const ambiguousSlugs = [];
  for (const slug of kataloogLedger) {
    if (currentCatalogSlugs.has(slug)) continue; // still a real page — never redirect a live URL
    if (seenSources.has(`/kataloog/${slug}/`)) continue; // already handled by the entity-bug redirects above
    const r = resolveSlug(slug);
    let destination;
    if (!r) {
      destination = MIKROKRAADID;
      unresolvedSlugs.push(slug);
    } else if (r.kind === "ambiguous" || r.kind === "ambiguous-desuffixed") {
      destination = r.destination;
      ambiguousSlugs.push({ slug, destination, field: r.field });
    } else {
      destination = `/kataloog/${r.id}/`;
    }
    kataloogRedirects.push({ source: `/kataloog/${slug}/`, destination, permanent: true });
  }
  const stillLive = kataloogLedger.filter((s) => currentCatalogSlugs.has(s)).length;
  const viaProgramme = kataloogRedirects.filter((r) => r.destination.startsWith("/kataloog/")).length;
  console.log(`[gen] kataloog (id-churn): ledger ${kataloogLedger.length}, still live ${stillLive}, redirected ${kataloogRedirects.length}`);
  console.log(`[gen] kataloog (id-churn): -> surviving programme: ${viaProgramme}, -> field (ambiguous): ${ambiguousSlugs.length}, -> ${MIKROKRAADID} fallback: ${unresolvedSlugs.length}`);
  if (ambiguousSlugs.length) {
    console.log(`[gen] kataloog: ambiguous collision-group sources (routed to a shared field page, not one specific programme — data-quality caveat, see report):`);
    for (const a of ambiguousSlugs) console.log(`  ${a.slug} -> ${a.destination} (shared field: ${a.field})`);
  }
  if (unresolvedSlugs.length) {
    console.log(`[gen] kataloog: fallback slugs (no surviving id/alias/field):`);
    for (const s of unresolvedSlugs) console.log(`  ${s}`);
  }
  growLedger("src/data/kataloog-known-slugs.json", kataloogLedger, currentCatalogSlugs);
}

// ============================================================================
// --- /teema/ and /valdkond/: one-off pinned fixes ---------------------------
// ============================================================================
// Both sections generate a page only while >= a minimum number of CURRENT
// catalogue entries match (src/data/topics.ts MIN_MATCHES=3 for topics; any
// field with 0 active entries has no /valdkond/ page). GSC shows exactly one
// dead URL in each section: /teema/avalik-haldus/ (topic dropped below
// threshold) and /valdkond/oigus/ (the "õigus" field has 0 active programmes
// — confirmed against the feed). Neither has a surviving specific
// programme/topic to point to, so each 301s to its section's own hub page
// (still live, indexable, real content) rather than /mikrokraadid/.
const teemaValdkondPins = [
  ["/teema/avalik-haldus/", "/teema/"],
  ["/valdkond/oigus/", "/valdkond/"]
];
for (const [source, destination] of teemaValdkondPins) add(source, destination);

// --- preserve pre-existing redirects not otherwise regenerated this run -----
// Excludes /kataloog/ and /vordlus/ (both fully regenerated above) and
// anything already added via `add()` this run (pr5 pins, entity-bug, and the
// teema/valdkond one-offs) — so re-running the script never duplicates a
// pinned source that was already written to vercel.json by a previous run.
const vercelPath = join(ROOT, "vercel.json");
const existing = JSON.parse(readFileSync(vercelPath, "utf8"));
const preserved = (existing.redirects || []).filter(
  (r) =>
    typeof r.source === "string" &&
    !r.source.startsWith("/kataloog/") &&
    !r.source.startsWith("/vordlus/") &&
    !seenSources.has(r.source)
);

const finalRedirects = [...redirects, ...vordlusRedirects, ...kataloogRedirects, ...preserved];

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

const entityBugRedirects = redirects.filter((r) => r.source.startsWith("/kataloog/"));
const allKataloogRedirects = finalRedirects.filter((r) => r.source.startsWith("/kataloog/"));
const vordlusRedirectCount = finalRedirects.filter((r) => r.source.startsWith("/vordlus/")).length;
console.log(`[gen] current catalog slugs: ${currentCatalogSlugs.size}`);
console.log(`[gen] field slugs (legacy-derived, may include stale non-live fields): ${[...fieldSlugs].join(", ")}`);
console.log(`[gen] live field slugs (active feed): ${[...liveFieldSlugs].join(", ")}`);
console.log(`[gen] kataloog redirects — entity-bug (pr5 + generated): ${entityBugRedirects.length}, id-churn (ledger): ${kataloogRedirects.length}, total: ${allKataloogRedirects.length}`);
console.log(`[gen] vordlus redirects: ${vordlusRedirectCount}`);
console.log(`[gen] teema/valdkond pins: ${teemaValdkondPins.length}`);
console.log(`[gen] preserved (untouched) redirects: ${preserved.length}`);
console.log(`[gen] total redirects: ${finalRedirects.length}`);
const fallbackToField = entityBugRedirects.filter((r) => r.destination === HARIDUS);
console.log(`[gen] entity-bug remapped to ${HARIDUS} fallback: ${fallbackToField.length}`);
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
