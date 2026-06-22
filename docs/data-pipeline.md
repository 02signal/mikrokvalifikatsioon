# Catalog data pipeline — AMOS → mikrokvalifikatsioon.ee

How the catalog stays fresh automatically. **AMOS is the brain (source of truth +
automation); mikrokvalifikatsioon.ee is a thin public consumer** of a published,
public-safe feed. This mirrors the family decision (digiteekaart → thin public cache;
data brain in AMOS).

Today: catalog = hand-curated JSON in this repo (`src/data/catalog/*.json`), rebuilt
manually. Target: AMOS owns the data and automation; this site consumes a feed and
rebuilds on change.

## 1. Data model in AMOS (per the holistic curriculum architecture)

Model programmes with the SAME objects used to describe EVK's internal trainings, so the
external catalog and own programmes share one architecture (a `source` flag distinguishes
them: `aggregated` = scraped from a provider; `own` = authored by EVK).

- **Provider** — name, type (ülikool/rakenduskõrgkool/erakool), url, country.
- **Programme** (mikrokvalifikatsioon | mikrokraad) — name, provider, field, EAP,
  priceText, durationText, format, language, intakeText, summary, goalText, outcomes[],
  assessmentText, credentialType, EKR/EQF level, sourceUrl, **sourceCheckedAt**,
  **status** (active | closed | candidate), **source** (aggregated | own).
- **Module** — programmes consist of modules (matches the internal-training model).
- **Outcome / Assessment** — learning outcomes & assessment methods (same objects as
  internal trainings → one curriculum architecture across the org).

Rule (unchanged): **only verified facts; unknown = null; never invent.** EVK's own
programmes stay out of the public feed until the owner lifts the embargo.

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

## 3. The published feed (contract)

AMOS publishes a **public-safe** JSON artifact to a stable URL (AMOS API endpoint, CDN, or
storage bucket). Shape = exactly what this site already consumes (one array of entries):

```jsonc
{
  "checkedAt": "2026-06-22",
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

## 4. Consumption by this site

Keep the site fully static (fast, SEO-friendly) but auto-refreshing:
- **Build-time fetch:** `src/data/catalog/index.ts` fetches the feed when
  `PUBLIC_CATALOG_FEED_URL` is set; otherwise falls back to the committed JSON snapshot
  (resilience if the feed is down). Astro then generates all pages from it as today.
- **Auto-rebuild on change:** AMOS n8n calls a **Vercel Deploy Hook** after a data update
  → the static site rebuilds with fresh data within minutes. (Plus a daily safety rebuild.)
- Result: AMOS edits data → site updates itself; no manual repo edits.

The consumer change here is small and isolated to the data layer; the page templates,
schema, OG, and `/valdkond/`, `/kataloog/<slug>/` generation are unchanged.

## 5. Boundary / governance
- This site stays a **thin public consumer**; the catalog remains spin-out-ready (the same
  feed could power a standalone marketplace later).
- Freshness stamps (`sourceCheckedAt`) stay per entry and surface on every page.
- The weekly manual re-check (current BACKLOG item) is replaced by the AMOS job once live.
