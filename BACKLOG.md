# Mikrokvalifikatsioon.ee Backlog

## Current Priority

- Build the catalog into the most complete register of Estonian mikrokvalifikatsioonid + mikrokraadid (the moat).
- Own the defining content: "mikrokraad on üks mikrokvalifikatsiooni liik".
- Every conversion path measurable in GA4 with the family event taxonomy.
- Publishing gate active: see CLAUDE.md (and CLAUDE.local.md where present).
- **Cross-brand identity & unified engagement amendment:** `docs/amos-identity-engagement-amendment.md`
  — makes the identity model person-centric across the whole brand portfolio (EVK site,
  mikrokvalifikatsioon, credentialstudy, digiteekaart, automatiseerimine, teekaart, future
  brands): one canonical Twenty Person (identity-resolved), **per-brand roles** (learner /
  owner-grant-seeker / B2B buyer / provider / partner), **brand-scoped consent + cross-brand-use
  lawful basis**, and **one unified messaging/email/issue plane** independent of brand/service.
  Requires the matching amendment to the canonical AMOS learner-identity ADR + PR notification
  to all agents. The `source_site` capture enum is already multi-brand; Twenty-as-person is the
  base — this makes roles/relationships, brand-scoped consent, and the unified engagement layer
  first-class.
- **Account layer plan (Phase C):** `docs/amos-account-layer-plan.md` — registered-user layer
  as a brand face on the shared AMOS OPK/identity spine (ET `konto.mikrokvalifikatsioon.ee`,
  EN `credentialstudy.com`); magic-link auth, Twenty-as-person (bridged via the consent ledger
  until Twenty is live), AMOS-owned packages. MVP = account+saved-package sync · deadline
  reminders · notify-lists (field/skill/combination) · funding-eligibility profile. Identified
  consented demand → AMOS build-next ranking (magnitude × conviction × fundability × supply gap
  × labor pull). Operationalizes the ratified AMOS learner-identity ADR; account brain lands in
  AMOS/Twenty/rev-web (freeze), mkval gets only a thin face + `lead_capture/v1` `kind` extension
  (`account_created`/`package_saved`/`reminder_subscribed`/`funding_profile_set`/`combo_waitlist`)
  + a privacy-page section (owner-gated). Apex stays static; embargo intact.
- **Growth program:** `docs/mkval-growth-plan.md` — public moat (SEO/GEO, always cutting-edge) vs account-gated personalization, the AMOS demand×supply speed loop (build/publish faster than universities), instrumentation per layer, sequenced build roadmap (Phase A public-first → B retention → C accounts → D ecosystem), and the marketing/value-prop plan per persona.

## Done

- 2026-06-24: **Account-flow wire hardening (AMOS PBI-ACC-HARDEN-01/04, mkval-half) — all merged.** Closed the three silent drops at the mkval→AMOS capture hop (the AMOS ingress allow-lists payload keys and 422s unknown ones): (1) `account_delete` now routes to the AMOS **erasure** endpoint and never falls through to a subscription (GDPR Art. 17, #8); (2) `funding_route` folds into the accepted `field` slot as `rahastus_<route>` (#9); (3) `combo`/`slugs` demand context (the unmet-combination build-next signal + watched-programme reminders) folds into the accepted `outcomes` array (#10). Pinned with a zero-dep `node:test` wire-contract test gated into `npm run build` (#11) — every kind must forward only AMOS-allow-listed keys; drift-proof, not just drift-free. **Remaining (AMOS-side, not mkval):** PBI-04 full = one shared capture-contract source both repos consume (today the allow-list is mirrored, not shared); plus PBI-02 deploy-wiring, PBI-03 split-brain `amos_crm`, PBI-05 Twenty+identity resolution, PBI-06 pg/CI nits — tracked in AMOS `agent-prompts/2026-06-24-account-flow-hardening-task-board.md`.
- 2026-06-12: repo skeleton, site rules (incl. publishing-gate hard rule), catalog data schema, first university microdegree data wave (169 programmes, 9 schools), homepage + /kataloog/ + /mikrokraadid/ + llms.txt/robots/catalog.json.
- 2026-06-12: suunatest on the homepage (instant top-3 answer from catalog.json + funding hint, full GA4 funnel: tool_start/tool_completed/result_high_intent/lead_form_*, webhook + mailto fallback); /mis-on-mikrokvalifikatsioon/ (definitions, comparison, FAQ + FAQPage schema); /kes-maksab/ (three funding paths, no unverified amounts); site-profile.json.

- 2026-06-12: consent-gated analytics (Consent Mode v2 basic, equal-buttons banner, footer "Küpsised" reopen) — reference implementation for the whole site family (`docs/cookie-consent-standard.md`); /privaatsus/ page (data, retention, rights, cookie section); RU+EN localization architecture and professional workflow planned (`docs/i18n-plan.md`).

- 2026-06-24: **Growth Phase A #5 — annual market report + full LLM export.** `/aastaraport/` — data-driven "Eesti mikrokvalifikatsioonide ja mikrokraadide turg <year>" (all numbers generated from the catalog, no invented data): headline stats, field + provider distribution (CSS bar charts), price/EAP/format/language/outcomes breakdown, methodology + citation block (CC BY 4.0), Article+Dataset JSON-LD. Awareness + backlink + GEO-citation asset; refreshes with the data. `/llms-full.txt` — complete register export (132 KB, all 169 programmes with facts + outcomes + URLs) for LLM ingestion, linked as `rel=alternate` in every page head + from llms.txt. Linked from footer + llms.txt; OG for /aastaraport/. Build green (404 pages, 0 errors).
- 2026-06-24: **Growth Phase A #3 — career-path pages.** `/karjaar/<role-slug>/` (8: andmeanalüütik, tarkvaraarendaja, projektijuht, raamatupidaja, turundusspetsialist, personalijuht, küberturbe spetsialist, UX-disainer) + `/karjaar/` hub. Data-backed breakthrough/portfolio narrative ("hundreds of applications but few strong candidates → employers weigh personal qualities + portfolio"), portfolio-friendly programmes highlighted (catalog text match: portfoolio/praktiline/päris töö), all matching programmes, FAQPage/ItemList/Breadcrumb, `career_page_view`, per-role OG. Market-data block is a neutral placeholder (no invented numbers) — fills from the AMOS labor feed later (`docs/amos-labor-market-brief.md`). Embargo-safe: portfolio narrative stays provider-neutral; no operator's own programme named or implied. `src/data/careers.ts`. Linked from footer/catalog/llms.txt. Sitemap 393→402. Build green (403 pages, 0 errors).
- 2026-06-24: **Growth Phase A #1 — provider pages + "X vs Y" comparison pages.** `/koolitaja/<slug>/` (9, all programmes per school: table, fields covered, EducationalOrganization+ItemList schema, `provider_page_view`, per-school OG). `/vordlus/<slugA>-vs-<slugB>/` (171 bounded head-to-head comparisons — same field, cross-provider, both have outcomes, top-2 most-similar per programme, deduped via `src/data/comparisons.ts`; side-by-side facts + shared/only-A/only-B õpiväljundid + FAQPage/ItemList/Breadcrumb, `comparison_view`). Crawl paths: catalog "Koolide kaupa" nav + detail-page "Seotud" chips (provider + related comparisons) + llms.txt. Sitemap filter fixed to keep `/vordlus/<pair>/` while excluding the noindex `/vordlus/` tool. Sitemap 214→393. Build green (394 pages, 0 errors).
- 2026-06-23: **outcome package builder** on /oskused/ — visitors collect learning outcomes ("+ Lisa paketti", localStorage `mkval:pakett`) into a personal package + floating bar + "Minu pakett" panel with neutral demand capture (email → webhook gets the full outcome list; mailto fallback). GA4: `outcome_add` (outcome, package_size — desired skill combinations = persona/pain), `package_view`, `lead_form_submit` form_name `outcome_package`. New keyword work: plain-language synonyms for "õpiväljund" (mida sa pärast oskad / mida õpetatakse / õpitulemused / kursuse sisu) in copy + meta. Embargo-safe (neutral; no own-programme implication). Build green (214 pages, 0 errors).
- 2026-06-23: **package match/combination** — /oskused/ package now shows the best single programme (max coverage of the selected outcomes) + the best **combination** (greedy set-cover) that covers them all. Client-side from a small embedded slug→meta index (26 KB); each package item carries its programme slugs (read from the DOM on add). GA4 `package_match` (count, best_coverage, combo_size, all_in_one) — `combo_size > 1` = a desired skill combination no single programme covers (build-next signal). Package email posts to `/api/subscribe` → AMOS (mailto fallback until the backend PR #1 merges + Vercel env set). **Later: account + GDPR-safe lead in AMOS (vision).**
- 2026-06-23: **AMOS feed freshness semantics** — mkval now separates feed/build freshness from public fact verification. `generatedAt`/`updatedAt` is exposed as `updatedAt` in public surfaces, while `checkedAt` remains the date of public source facts. Visible catalog/data pages, `/catalog.json`, `/llms.txt`, and `/site-profile.json` show both values so E2E checks can verify the AMOS → mkval consumer path without falsely implying unreviewed source facts were promoted.
- 2026-06-22: **programmatic SEO topic/skill landing pages** `/teema/<slug>/` + hub `/teema/`. Curated concept map (`src/data/topics.ts`, ~28 topics, et+en synonyms) matched against catalog text; a page is emitted only at ≥3 matching programmes (20 live, 8 thin ones auto-dropped) — turns free-text searches ("andmeanalüüs", "projektijuhtimine", "tehisintellekt"…) into indexable landing pages instead of non-indexable `?q=` params. Each page: matching programmes + matching õpiväljundid (server-rendered), FAQPage+ItemList+BreadcrumbList JSON-LD, self-canonical, per-topic OG image, links to `/oskused/?q=`, related topics + field pages. Hub + topics in footer/catalog/oskused/llms.txt. Grows from Search Console + GA4 `outcome_search` demand terms. Build green (214 pages, 0 errors).
- 2026-06-22: time view `/registreerimine/` (registration deadlines with live client-side urgency + start dates grouped by month; SEO/GEO, dates parsed into `registrationDeadline`/`startDate`, exposed in `catalog.json` + Course `startDate`) and outcome explorer `/oskused/` (605 deduped learning outcomes as a searchable + comparable object: search by skill → matching programmes; `?q=` deep-link; GA4 `outcome_search` incl. zero-result demand gaps). Linked from catalog/footer/llms.txt. AMOS agent brief written (`docs/amos-catalog-agent-brief.md`).
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
- **Object model & two-way intelligence brief for the AMOS agents:**
  `docs/amos-catalog-agent-brief.md`. Defines the canonical curriculum objects to scrape →
  warehouse → sync (Provider, Programme, **ProgrammeInstance** = parallel/sequential runs
  with own dates/language/format/price, Outcome 1..N, Module, Assessment, Credential,
  multilingual et/en/ru), dynamic-cardinality scraping, the **v2** feed (`instances[]` +
  `outcomes[]` + localized fields, mkval consumes the soonest-deadline instance), and the
  two-way loop (mkval demand signals → AMOS planning; AMOS competitive-intel views → EVK
  programme planning). Hand to the AMOS agents to expand into their backlog.
- **Labor-market layer brief for the AMOS agents:** `docs/amos-labor-market-brief.md`.
  CV-portal job postings + salary + application signals + employer orgs (joined across AMOS ⇄
  Twenty ⇄ RIK) → one source feeding TWO surfaces: public mkval aggregates (ROI calculator,
  career/field/programme pages — "N openings now, salary split, trend") and private B2B/REV
  "who's hiring" sales intel (restricted). Powers the data-backed career-path narrative
  (#3: hundreds of applications but few strong candidates → portfolio-friendly programmes),
  while staying provider-neutral (no operator's own programme named or implied; per
  CLAUDE.local.md). Needs AMOS warehouse + RIK + Twenty design.
- Delivery backlog:
  1. AMOS contract: define `amos.mkval.catalog/v1`, valid/poisoned fixtures, and validator
     tests for missing freshness, forbidden keys, candidate rows, invalid counts, and
     owner-gated rows.
  2. AMOS model: add provider/programme source registry, publication state separate from
     data state, source evidence hash, fetch timestamp, parser status, and imported
     `aggregated` rows for today's catalog.
  3. AMOS refresh job: scheduled fetch/diff pipeline with JS-capable fetch where needed;
     narrow auto-apply for deterministic changes; review queue for new programmes, large
     changes, curriculum/assessment facts, and any publication-state transition.
  4. AMOS public feed publisher: generate validated feed with `schemaVersion`,
     `generatedAt`, `checkedAt`, `contentHash`, `count`, and public rows only; retain a
     previous-good artifact for rollback.
  5. mkval consumer: implement build-time `PUBLIC_CATALOG_FEED_URL` loading, schema
     validation, and committed-snapshot fallback while preserving slug generation,
     `/catalog.json`, `/kataloog/`, `/valdkond/`, `llms.txt`, `site-profile.json`, and
     existing analytics.
  6. Operations: store Vercel Deploy Hook as an AMOS secret, call it only after a validated
     feed diff changes public output, rate-limit triggers, add daily safety rebuild, and
     smoke-test public `/catalog.json` count/content hash after deploy.
  7. Cutover: run feed and snapshot side by side, compare counts/provider distribution/null
     counts/sample pages, switch Vercel env to the feed, and document rollback by unsetting
     the env var or restoring the previous-good feed.
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
- Until the AMOS feed is live: keep the weekly catalog freshness re-check loop (intakes
  change) and add a `roundsCheckedAt`-style stamp to catalog.json or the future feed.
- Owner-gated future item: see CLAUDE.local.md.
