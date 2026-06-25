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

## Active workstream — Skill-match core loop (the account value)

> **Status: IN PROGRESS — CL-1 + CL-2 SHIPPED 2026-06-25** (synonym/proximity skill
> search + ~5-outcome builder frame, logged-out & PII-free). Next: CL-4 → CL-3 → CL-5.
> Owner direction
> 2026-06-25. This is the registered-user value, stated by the owner as the right *order*:
> get the **core loop flawless** before any virality. The account's worth is not (yet)
> "invite others" — it is **"see mõistab mu sõnu ja jälgib mu eest"** (it understands how I
> phrase things, and watches for me). Invitation / "küsi koos" is a downstream consequence
> (CL-6 / growth Phase 2), not the start.

**The loop the owner described (in order):**
1. Login works **veatult ja arusaadavalt** → lands on "see huvitab sind", not an empty dashboard.
2. Skill phrased **omal moel → sarnased õpiväljundid** (proximity, not the literal word).
3. **~5 õpiväljundit → pakett** (the microcredential "good form" norm; sometimes more, not much).
4. **Mitu erinevat "programmi"** (several saved target profiles) per person.
5. **We track continuously and notify when the match changes.**

**Freeze split (CLAUDE.md):** the matching engine, saved-package store, match-diff and notify
live in **AMOS** (brain); mkval is a **thin face** — synonym search UI, builder frame,
multi-package UI, token-gated passthrough. No scoring/PII storage in this repo. Warehouse stays
PII-free (refs/hashes; synonym map carries no PII). All notify wording **neutral** ("su paketile
lisandus lähedasem programm / parem kate") — never "EVK ehitab"; that same neutral message is
also the launch-cohort email when the embargo lifts. Magic-link auth, no PII in any URL.

| PBI | Where | What | Depends |
|---|---|---|---|
| **CL-1** Synonym/proximity skill search | mkval (logged-out, PII-free) | **The heart.** `/oskused/` search is today a literal substring (`text.includes(term)`) — "graafikud Excelis" finds nothing though "andmete visualiseerimine" exists. Add a curated et plain-language **synonym/alias map** (`src/data/skillSynonyms.ts`, extends the `topics.ts` idea); the query expands through it before matching, still client-side. **Embeddings are explicitly NOT step 1.** | — (do now) |
| **CL-2** Builder ~5-outcome target frame | mkval (logged-out) | Encode the norm: builder **suggests ~5** as the target, shows progress ("3/≈5"), softly notes when a package grows large — **never a hard cap**. Makes each package a clean, comparable demand atom (≈ a buildable unit). | — (with CL-1) |
| **CL-3** Continuous match-diff + change notification | **AMOS** | Today match is a one-shot client compute. Add a recurring job: on catalog change (new/changed programme) re-run `amos.outcome.fit/v1` over each saved package; if coverage improves or a closer programme appears, queue **exactly one** neutral, consented notification. The retention engine + the launch-cohort channel. | CL-4 store + consent ledger (live) |
| **CL-4** Multiple named saved packages | mkval face + **AMOS** store | Today one `mkval:pakett`. Allow several **named** packages (each ~5 outcomes), synced on login via the lossless union-merge in `docs/amos-account-layer-plan.md`. AMOS `amos_learner_package` holds N packages/person (outcome refs, non-PII). | account spine |
| **CL-5** Flawless login → "Sind huvitab" landing | konto face (cross-repo, on the spine) | Magic-link login end-to-end (no PII in URL); first view = plain-Estonian "Sind huvitab" (your packages + current best match + any pending notice), **not** an empty dashboard. Logged-out site 100% functional; apex stays static. Owner-gated publish (privacy section + embargo check). | CL-3 + CL-4 + shared spine |
| **CL-6** Invitation / "küsi koos" (Phase 2) | mkval face + AMOS | **Later — explicitly not started now.** Once a person has a package they care about and the match actually changes, the share / collective-demand mechanic (invite others who want the same combo → faster build + shared launch cohort) gains real pull. The identity/consent spine (AMOS #1169) can carry referral attribution; the user-facing referral *value* is this slice. | CL-1..CL-5 |

**Sequence:** **CL-1 + CL-2 now** (mkval, logged-out, PII-free, improves the public moat
immediately) → **CL-4** then **CL-3** (AMOS store, then the diff that needs it) → **CL-5** (konto
face, owner-gated publish) → **CL-6** later. **GA4:** reuse `outcome_search`/`view_search_results`
(now synonym-expanded), `outcome_add`/`package_view`/`package_match` (`combo_size>1` = build-next),
the `lead_capture/v1` account kinds (`package_saved`/`reminder_subscribed`/`combo_waitlist`); add
`match_changed` when CL-3's notice renders. **Verify each slice:** logged-out fully functional,
apex static, build green, no own-programme implication, warehouse PII-free by construction.
Cross-refs: `docs/amos-account-layer-plan.md`, `docs/mkval-growth-plan.md` (Phase C).

## Done

- 2026-06-25: **CL-1 + CL-2 — synonym/proximity skill search + ~5-outcome builder frame (account-value core loop, mkval-half).** Built by a team of agents (grounded data authoring + matching logic/test + builder UX), adversarially reviewed (no blockers), integrated by hand. **CL-1:** `/oskused/` search was a literal substring — a skill phrased in the owner's own words ("graafikud excelis") found nothing though the outcome "andmete visualiseerimine" exists. New curated Estonian concept map `src/data/skillSynonyms.ts` (46 grounded clusters) + pure `src/lib/skill-match.ts` `expandQuery()` (substring-both-directions, MIN_LEN 3, data injected so it's node-testable) expand the query to the words that actually appear in real outcomes, with a "Näitan ka lähedasi: …" hint (shown only when there are results). Verified against the real 656-outcome catalog: "graafikud excelis" 0→6, "arvepidamine" 0→8, "küberturve" 0→8, "värbamine" 0→5, "koolitamine" 0→13; **0 ungrounded clusters**. Backward-compatible (raw query always included → literal search unchanged). **CL-2:** the package builder shows progress toward ~5 outcomes ("N / ≈5") + a warm tone-coloured hint (encourage <5 / affirm 5-6 / soft note 7+) — the microcredential good-form norm — **never a hard cap, never blocks adding.** GA4: `outcome_search` gains `expanded` (additive; names unchanged). Tests: `scripts/skill-match.test.mjs` (15 cases — fixture-driven logic + real-data integrity/PII + a permanent **grounding** guard that fails the build if any cluster drifts off the catalog), gated into `npm run build`. Build green (440 pages, 15/15 tests). Embargo-safe (no own-programme implication); all copy plain Estonian. Logged-out & PII-free — no AMOS dependency.
- 2026-06-24: **SEO/GEO structured-data + OG hardening (#17)** — from a team audit of all 24 page types vs Google rich-results + schema.org. Fixed a **sitewide Course rich-result bug** (`toCourse()` emitted an empty `CourseInstance` when format+startDate were both missing → Google flags incomplete → can disqualify the whole Course; now always non-empty from real data) + sharpened typing (provider `EducationalOrganization`, credentialCategory `DefinedTerm`, `teaches`←outcomes, `Offer.availabilityEnds`←deadline); nested `toCourse()` into the 6 list pages that emitted bare `name+url` ListItems (Course Carousel eligibility). Fixed the **broken `/valdkond/` OG** (field slugs were unregistered → 404 og:image) via a `fieldPages` map; gave each pSEO X-vs-Y page a **unique** card via `comparisonPages`. Fixed the EN homepage's **invalid cross-language BreadcrumbList** + added the missing WebSite `SearchAction`. New shared `src/data/organizationSchema.ts` (EducationalOrganization + logo). Build green (427 pages), verified in `dist`; no invented data.
- 2026-06-24: **Source-verified catalog fact completeness pass (#14)** — a team of agents fetched each programme's own provider page and filled missing facts, verified twice (extractor + independent adversarial confirmer, each grounding every value in an exact on-page quote; no invented numbers). **162 fields across 86 of 169 records** — durationText 49, format 33, assessmentText 23, intakeText 20, outcomes 12, ects 11, goalText 8, priceText 6. Fills only previously-absent fields, never overwrites; strict post-apply check passed 0 violations. The 20 new intakeText values are canonical so `parseIntakeDates` derives deadlines → **77 programmes now carry a registration deadline**. Records with ≥1 gap: 131 → 99. Apply tooling + verification rules in `scripts/apply-catalog-verify.mjs`. Residual nulls (mostly genuinely "NOT STATED" on the source): assessmentText 70, outcomes 34, durationText 26, format 16, goalText 10, ects 8, priceText 6, intakeText 5 — honest gaps for a future pass. Possible follow-up: a dedicated "Maht (kontakt/iseseisev tunnid)" field (academic-hour workload was deliberately kept out of `durationText`/"Kestus").
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

- Verify and complete the first data wave — **substantially done 2026-06-24 (#14, source-verified pass)**: 162 fields filled across 86 records, 77 programmes now have a registration deadline. Residual: assessmentText (70, mostly genuinely unstated), outcomes (34), durationText (26), format (16). Next pass: re-fetch the records the finder didn't propose a price for (some pages state a price that wasn't captured), and consider a "Maht (tunnid)" field for the contact/self-study hour-load.
- Töötukassa facts: their site is JS-rendered and unverifiable by fetch — verify koolituskaart/toetuste amounts manually and add concrete numbers to /kes-maksab/ with a checked-date stamp.
- **SEO/GEO audit follow-ups** (deferred from #17; the team audit's exact specs are captured — high→low): (1) **Article `publisher.logo` + `image`** on the 6 Article pages (mis-on, kes-maksab, aastaraport, mikrokraadid, koolitajale, kvaliteedihindamine) — swap their inline bare Organization node for the shared `organizationSchema.ts` (logo'd) + add `image` (the generated `/og/<key>.png`); makes them Article-rich-result eligible. (2) **Dataset `DataDownload` distribution** on the homepage Dataset (→ `/catalog.json`), a new `kuidas-koostame` Dataset (→ `/site-profile.json` + `/llms-full.txt`), and the karjaar labour Dataset (real `andmed.eesti.ee` URL or drop) + ISO-interval `temporalCoverage`. (3) **Hub ItemLists**: `mikrokraadid` directory + `oskused` `CollectionPage.mainEntity`. (4) **WebSite+SearchAction** on the homepage (add `@id`) + `kataloog` (canonical search page). (5) Low: `privaatsus` JSON-LD graph; `CollectionPage`/`DataCatalog` typing + `spatialCoverage`/`keywords` on data pages; GEO `speakable`/`DefinedTermSet` on definitional pages. (OG is otherwise fully wired — the old "none exist" note was stale.)
- Private-provider entries (3-4 known) once their public pages are verified.
- mikrokvalifikatsioonid.ee → 301 to /kataloog/ (DNS/Vercel config, owner-gated).
- Lead webhook + email list backend (family pattern, PUBLIC_SITE_LEAD_WEBHOOK_URL).
- Until the AMOS feed is live: keep the weekly catalog freshness re-check loop (intakes
  change) and add a `roundsCheckedAt`-style stamp to catalog.json or the future feed.
- Owner-gated future item: see CLAUDE.local.md.
