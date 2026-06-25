# Catalog data pipeline — AMOS → mikrokvalifikatsioon.ee

Status: implementation plan
Updated: 2026-06-22

How the catalog stays fresh automatically. **AMOS is the brain (source of truth +
automation); mikrokvalifikatsioon.ee is a thin public consumer** of a published,
public-safe feed. This mirrors the family decision (digiteekaart → thin public cache;
data brain in AMOS).

Today: catalog = hand-curated JSON in this repo (`src/data/catalog/*.json`), rebuilt
manually. Target: AMOS owns the data and automation; this site consumes a feed and
rebuilds on change.

## Catalog source of truth (authoritative committed snapshot)

The catalog content lands via **repo PRs** (e.g. the EHIS facts override #25), so the
**committed snapshot `src/data/catalog/*.json` is the AUTHORITATIVE source of truth**.
The site builds from it by default.

The AMOS-published feed (`PUBLIC_CATALOG_FEED_URL`) is **opt-in only**. It is used for a
build **only when ALL** of the following hold:

1. `PUBLIC_CATALOG_FEED_URL` is set, **and**
2. `PUBLIC_CATALOG_FEED_TRUSTED=1` is set (explicit opt-in flag), **and**
3. the fetched feed parses and is the expected shape (`programs[]` non-empty, or a bare
   array), **and**
4. its active-entry count is **≥ the committed snapshot's active count** — a feed that
   would **drop entries is rejected** (non-regression guard).

If any of those fail (flag absent, validation/regression fails, fetch errors), the build
**falls back to the committed snapshot** and logs a clear `console.warn` saying which
source it used and why. The Vercel env var **`PUBLIC_CATALOG_FEED_URL` can stay set** — it
is now **harmless**: ignored unless `PUBLIC_CATALOG_FEED_TRUSTED=1` is also set.

**Why:** a stale AMOS feed once shipped older programme *names*, which broke EHIS
name-matching (122 matches instead of 148) and shrank the hero "X programmi" count. With
the committed snapshot authoritative, production self-corrects to the right number with no
Vercel change. When the AMOS feed is fixed and known-good, set
`PUBLIC_CATALOG_FEED_TRUSTED=1` to re-enable it (the non-regression guard still protects).

**Floor gate:** `scripts/catalog-floor.test.mjs` runs as the first step of `npm run build`
(`node --test scripts/*.test.mjs`). Using the SAME modules the site renders from, it
recomputes the committed `count` + EHIS-`matches` from the JSON and asserts the built
`catalog` never regresses below them (plus an absolute backstop: count ≥ 150, matches
≥ 140). It is self-adjusting (no hardcoded 148/169). Any future change — a bad feed, or a
data edit that breaks EHIS matching — **fails the build before deploy**, so the live site
never silently degrades.

## 0. Delivery goal

Make the data pipeline production-ready without turning this repository into the
data warehouse:

1. AMOS stores and refreshes programme facts.
2. AMOS publishes one public-safe catalog feed.
3. This Astro site fetches that feed at build time.
4. If the feed is unavailable or invalid, the site falls back to the committed
   snapshot.
5. AMOS triggers a Vercel rebuild only after the feed changes and passes validation.

The public site remains static, fast, SEO-friendly, and independent of AMOS at
request time.

Non-negotiables:

- verified facts only; unknown values are `null`;
- no person data, secrets, raw private documents, or owner-only publication details
  in the feed;
- candidate and owner-gated rows are excluded from the public feed;
- AI can suggest extracted values, but cannot be canonical without source evidence
  and review rules;
- every public row carries a provider source URL and `sourceCheckedAt`.

## 1. Data model in AMOS (per the holistic curriculum architecture)

Model programmes with the SAME objects used to describe internal trainings, so the
external catalog and owner-authored rows share one architecture (a `source` flag
distinguishes them: `aggregated` = scraped from a provider; `own` = authored
internally and separately owner-approved before any public output).

- **Provider** — name, type (ülikool/rakenduskõrgkool/erakool), url, country.
- **Programme** (mikrokvalifikatsioon | mikrokraad) — name, provider, field, EAP,
  priceText, durationText, format, language, intakeText, summary, goalText, outcomes[],
  assessmentText, credentialType, EKR/EQF level, sourceUrl, **sourceCheckedAt**,
  **status** (active | closed | candidate), **source** (aggregated | own).
- **Module** — programmes consist of modules (matches the internal-training model).
- **Outcome / Assessment** — learning outcomes & assessment methods (same objects as
  internal trainings → one curriculum architecture across the org).

Rule (unchanged): **only verified facts; unknown = null; never invent.** Owner-gated
rows stay out of the public feed until explicitly approved for public publication.

AMOS implementation should map these objects onto the existing AMOS learning-content
architecture rather than create a second curriculum truth:

- public provider/programme listing rows: source-frontier + catalog projection;
- curriculum-bearing fields (`outcomes`, `assessmentText`, module structure): governed
  learning-content objects for owner-authored rows; bounded extracted facts with
  provider evidence when the programme is aggregated from public providers;
- publication state: separate from data existence. A row may exist in AMOS while still
  being absent from the public feed.

## 2. Automated check + enrichment (AMOS n8n-ops)

Scheduled (e.g. weekly) per Programme:
1. **Fetch** the `sourceUrl` — use a headless/JS-capable fetch for JS-rendered provider
   sites (e.g. Töötukassa, some university pages) that a plain fetch can't read.
2. **Extract** price, EAP, intake, status from the page.
3. **Diff** against stored values → classify:
   - high-confidence, unambiguous (e.g. price unchanged, intake parsed cleanly) →
     **auto-apply** + bump `sourceCheckedAt`.
   - ambiguous / large change / page gone → **review queue** (human-in-the-loop, keeps the
     "never invent" rule).
4. **Discover** new programmes by crawling provider listing pages → add as `candidate`
   for review. Removed/404 programmes → `status: closed`.
5. **Enrich** nulls (goalText, outcomes, assessmentText), normalise field/EMTAK, dedupe.

Auto-apply must stay narrow. Good candidates:

- `sourceCheckedAt` when the source was fetched and parsed successfully;
- closed/404 status when the source has a repeated deterministic failure;
- exact unchanged values and simple bounded date/price/intake changes.

Review queue required:

- new programmes;
- changed provider identity, URL, name, EAP, price, intake, outcomes, assessment, or
  credential type;
- extracted values with low confidence;
- pages with contradictory facts;
- any publication-state transition.

## 3. The published feed (contract)

AMOS publishes a **public-safe** JSON artifact to a stable URL (AMOS API endpoint, CDN, or
storage bucket). Shape = exactly what this site already consumes (one array of entries):

```jsonc
{
  "schemaVersion": "amos.mkval.catalog/v1",
  "generatedAt": "2026-06-22T09:00:00.000Z",
  "checkedAt": "2026-06-22",
  "contentHash": "sha256:…",
  "count": 169,
  "programs": [
    {
      "name": "…", "provider": "…", "providerType": "ülikool",
      "url": "https://…", "field": "IT ja andmed",
      "ects": 12, "durationText": "1 semester", "priceText": "900 €",
      "format": "kohapeal", "language": "et", "intakeText": "…",
      "summary": "…", "goalText": "…", "outcomes": ["…"], "assessmentText": "…",
      "sourceCheckedAt": "2026-06-20", "status": "active"
    }
  ]
}
```

Public-safe = catalog facts only. **No person data** (board members, isikukood, beneficial
owners) ever in this feed — that stays in the AMOS restricted zone.

Feed validation gate:

- `schemaVersion` must be `amos.mkval.catalog/v1`;
- `programs.length === count`;
- every programme has `name`, `provider`, `providerType`, `url`, `field`,
  `sourceCheckedAt`;
- unknown optional facts are `null`, not invented filler;
- candidates and owner-gated rows are absent;
- forbidden keys fail the build (`email`, `phone`, `personalCode`, `isikukood`,
  `token`, `secret`, raw HTML, private notes);
- provider URLs must be HTTP(S) and point to the public source;
- slugs/page URLs are generated by this site, not supplied as authority by AMOS.

## 4. Consumption by this site

Keep the site fully static (fast, SEO-friendly) but auto-refreshing:
- **Build-time source selection:** `src/data/catalog/index.ts` builds from the
  **committed snapshot by default** (authoritative). It uses the feed only when
  `PUBLIC_CATALOG_FEED_URL` **and** `PUBLIC_CATALOG_FEED_TRUSTED=1` are both set **and** the
  feed validates and does not drop entries — see *Catalog source of truth* above. Astro
  then generates all pages from the chosen source as today.
- **Auto-rebuild on change:** AMOS n8n calls a **Vercel Deploy Hook** after a data update
  → the static site rebuilds with fresh data within minutes. (Plus a daily safety rebuild.)
- Result: AMOS edits data → site updates itself; no manual repo edits.

The consumer change here is small and isolated to the data layer; the page templates,
schema, OG, and `/valdkond/`, `/kataloog/<slug>/` generation are unchanged.

Consumer acceptance criteria:

- `npm run build` works with no `PUBLIC_CATALOG_FEED_URL`;
- `npm run build` works with a valid remote/public feed;
- an invalid or unreachable feed falls back to the committed snapshot and prints a
  clear build warning;
- generated `/catalog.json`, `/kataloog/`, `/kataloog/<slug>/`, `/valdkond/<slug>/`,
  `llms.txt`, and `site-profile.json` keep the same public shape;
- no runtime request from the browser is needed to render catalog pages.

## 5. Boundary / governance
- This site stays a **thin public consumer**; the catalog remains spin-out-ready (the same
  feed could power a standalone marketplace later).
- Freshness stamps (`sourceCheckedAt`) stay per entry and surface on every page.
- The weekly manual re-check (current BACKLOG item) is replaced by the AMOS job once live.

## 6. Implementation slices

### Slice A — Contract and fixtures

Owner repo: AMOS, with mirror notes here.

- Define `amos.mkval.catalog/v1` as a machine-checkable contract.
- Add sample valid feed and poisoned feed fixtures.
- Add validator tests for forbidden keys, missing source URLs, missing freshness, invalid
  counts, candidate rows, and owner-gated rows.

Done when: a sample feed can be validated independently of AMOS runtime and this site.

### Slice B — AMOS source registry and data model

Owner repo: AMOS.

- Add provider and programme source registry rows.
- Map existing hand-curated mkval entries into imported `aggregated` rows.
- Add publication state separate from data state.
- Store source evidence hash, fetch timestamp, and parser status.

Done when: AMOS can represent today's catalog without changing public output.

### Slice C — AMOS fetch/diff/review queue

Owner repo: AMOS.

- Add n8n job or scheduled job wrapper for provider source refresh.
- Use JS-capable fetch for sources that do not render in plain HTTP.
- Classify diffs into auto-apply vs review-required.
- Expose review-required rows with source evidence and suggested change.

Done when: a weekly dry-run produces a bounded report without mutating public output.

### Slice D — Public feed publisher

Owner repo: AMOS.

- Generate the validated feed artifact.
- Write `generatedAt`, `checkedAt`, `contentHash`, and `count`.
- Exclude candidate, restricted, and owner-gated rows.
- Keep a previous-good artifact for rollback.

Done when: AMOS can publish a valid `amos.mkval.catalog/v1` feed from warehouse data.

### Slice E — mikrokvalifikatsioon.ee consumer

Owner repo: this repo.

- Add a catalog loader that reads `PUBLIC_CATALOG_FEED_URL` at build time.
- Validate the feed shape before using it.
- Fall back to committed `src/data/catalog/*.json` snapshot if the feed is missing or
  invalid.
- Preserve slug generation, page generation, schema.org, `llms.txt`, and analytics.

Done when: builds pass in snapshot mode and remote-feed mode.

### Slice F — Deploy hook and operations

Owner repos: AMOS + Vercel project settings.

- Store Vercel Deploy Hook URL as an AMOS secret, never in Git.
- Call the hook only after a validated feed diff changes public output.
- Rate-limit repeated triggers.
- Add a daily safety rebuild.
- Add operational smoke: feed fetch, content hash, Vercel deployment status, public
  `/catalog.json` count.

Done when: a validated AMOS data change rebuilds the static site without manual repo edits.

### Slice G — Cutover and rollback

Owner repos: AMOS + this repo.

- Run snapshot and feed outputs side by side.
- Compare counts, provider distribution, fields, null counts, and sample programme pages.
- Switch Vercel env to `PUBLIC_CATALOG_FEED_URL`.
- Keep committed snapshot as rollback.
- Document manual recovery: unset env var or restore previous-good feed.

Done when: production uses the feed, but can return to the snapshot path quickly.
