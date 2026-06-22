# Mikrokvalifikatsioon.ee Backlog

## Current Priority

- Build the catalog into the most complete register of Estonian mikrokvalifikatsioonid + mikrokraadid (the moat).
- Own the defining content: "mikrokraad on üks mikrokvalifikatsiooni liik".
- Every conversion path measurable in GA4 with the family event taxonomy.
- Publishing gate active: see CLAUDE.md (and CLAUDE.local.md where present).

## Done

- 2026-06-12: repo skeleton, site rules (incl. publishing-gate hard rule), catalog data schema, first university microdegree data wave (169 programmes, 9 schools), homepage + /kataloog/ + /mikrokraadid/ + llms.txt/robots/catalog.json.
- 2026-06-12: suunatest on the homepage (instant top-3 answer from catalog.json + funding hint, full GA4 funnel: tool_start/tool_completed/result_high_intent/lead_form_*, webhook + mailto fallback); /mis-on-mikrokvalifikatsioon/ (definitions, comparison, FAQ + FAQPage schema); /kes-maksab/ (three funding paths, no unverified amounts); site-profile.json.

- 2026-06-12: consent-gated analytics (Consent Mode v2 basic, equal-buttons banner, footer "Küpsised" reopen) — reference implementation for the whole site family (`docs/cookie-consent-standard.md`); /privaatsus/ page (data, retention, rights, cookie section); RU+EN localization architecture and professional workflow planned (`docs/i18n-plan.md`).

- 2026-06-13: SEO/GEO instrumentation wave. Per-programme indexable pages `/kataloog/<slug>/` (169, stable Estonian-aware slug, full schema.org `Course` with offers/credits/courseMode + `BreadcrumbList`, real content: goal/outcomes/assessment) — biggest long-tail lever and spin-out marketplace foundation. Catalog cards + mikrokraadid hub now link internally to detail pages; index `ItemList` points to them. Shared `Seo.astro` head (og:site_name/locale, twitter, hreflang, JSON-LD, alternates) adopted by all 7 pages. Homepage `Organization` (logo/areaServed/description) + `WebSite` `SearchAction` (`/kataloog/?q=`, deep-link prefill wired). `llms.txt` + `site-profile.json` now generated from catalog data (live counts/providers/fields/price range — kills drift); `catalog.json` carries `slug`+`pageUrl`. Outbound provider links carry UTM (lead-gen proof). `mikrokvalifikatsioonid.ee` 301 → `/kataloog/?utm_source=mikrokvalifikatsioonid.ee&utm_medium=domain_redirect` (measures plural-domain demand before any spin-out). Sitemap priorities/lastmod; robots.txt extra AI crawlers. `npm run build` green (176 pages, 0 check errors).

## Demand radar (interest intelligence)
- Done: per-programme "Mind huvitab" button on every detail page → GA4 `interest_signal` (programme_slug/field/provider) + optional waitlist email (`interest_waitlist`); "Ei leidnud sobivat? Küsi uut oskust" form on the catalog → GA4 `demand_request` (skill/field). Lets EVK rank programme interest and surface unmet demand to build new microcredentials fast.
- Next: GA4 exploration / Looker Studio board (top interest_signal by programme, top demand_request skills) + n8n routing of `interest_waitlist`/`demand_request` to a demand list. Optional phase 2: public "X huvitatud" social-proof counter (needs a small datastore, e.g. Vercel KV).

## Data freshness / AMOS
- Plan: automate catalog check + enrichment in AMOS (source of truth, holistic curriculum
  architecture shared with internal trainings); this site consumes a public-safe feed at
  build + auto-rebuilds via a Vercel Deploy Hook. Full architecture + feed contract in
  `docs/data-pipeline.md`. Consumer change (env `PUBLIC_CATALOG_FEED_URL` + fallback) is
  small and pending the AMOS feed.
- Done: `license` (CC BY 4.0) added to Dataset schema (homepage + /andmed/) — fixes Search
  Console "Missing field 'license'". (Owner may change the licence.)

## Search Console housekeeping
- Phantom URLs from a PREVIOUS site on this domain (HiStudy LMS demo: /courses/, /en/courses/,
  /ru/courses/, ~10 YouTube-embed "videos", queries like "client/server model", "react",
  "histudy") are indexed but now 404. They self-de-index; optionally speed via GSC Removals.
  Not our pages — no code action needed. Watch that no REAL page sits in 404/5xx/noindex buckets.

## Next

- Verify and complete the first data wave (prices/EAP/intakes have nulls where pages did not state facts — especially Tallinna Ülikool and EBS; re-check before any paid traffic).
- Töötukassa facts: their site is JS-rendered and unverifiable by fetch — verify koolituskaart/toetuste amounts manually and add concrete numbers to /kes-maksab/ with a checked-date stamp.
- OG images for all pages (none exist yet — social/AI previews are bare).
- Private-provider entries (3-4 known) once their public pages are verified.
- mikrokvalifikatsioonid.ee → 301 to /kataloog/ (DNS/Vercel config, owner-gated).
- Lead webhook + email list backend (family pattern, PUBLIC_SITE_LEAD_WEBHOOK_URL).
- Weekly catalog freshness re-check loop (intakes change); add `roundsCheckedAt`-style stamp to catalog.json.
- Owner-gated future item: see CLAUDE.local.md.
