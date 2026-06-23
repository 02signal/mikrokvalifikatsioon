# Mikrokvalifikatsioon.ee Site Rules

This repository is part of the Ettevõtluskeskus OÜ / 02Signal sales-site group.

## PUBLISHING GATE — HARD RULE, CHECK BEFORE EVERY PUBLIC CHANGE

Read `CLAUDE.local.md` first if it exists — it contains owner-only publishing constraints that override everything here.

- NO public page, llms.txt, JSON file, schema markup, meta tag, commit message, or PR text may announce or imply any Ettevõtluskeskus own training programme or credential without the owner's explicit written approval.
- Demand capture is allowed only in neutral form: "Anna teada, kui Eestis lisandub uusi mikrokvalifikatsioone" (email list).

## Audience

Write for an Estonian adult learner, 25-55, considering ümberõpe (career change) or täiendõpe (upskilling). Pragmatic, busy, often paying themselves or via Töötukassa. Not a 65+ owner — tone can be a notch more energetic than the digiteekaart family, but still plain Estonian.

Prefer concrete words: "uus oskus", "palk", "maksab", "kestab", "tasub ära", "tunnistus, mida tööandja tunneb". Avoid: "kompetentsimudel", "elukestev õpe" as filler, EU-jargon without translation.

## Core Positioning

One sentence that anchors all content and SEO: **"Mikrokraad on üks mikrokvalifikatsiooni liik."** Mikrokvalifikatsioon is the legal umbrella term; mikrokraadid (universities, ~200 programmes) are a subtype. We own the umbrella term AND capture the 10x-larger "mikrokraad" search volume through the catalog.

## Domain Strategy

- `mikrokvalifikatsioon.ee` — THE site: authority hub + catalog (`/kataloog/`, `/mikrokraadid/`); future owner-gated additions per `CLAUDE.local.md`.
- `mikrokvalifikatsioonid.ee` — 301 redirect to `/kataloog/`. Do NOT build content there. The catalog section is built spin-out-ready (own data layer, clean URL space) in case it becomes a standalone marketplace later — that is an owner decision, not a default.

## Commercial Rule

Every main page should answer: what skill the learner gets, how long it takes, what it costs, who can pay for it (ise / Töötukassa / tööandja), what it is worth (salary/role outcome), and the next safe step. Show money and payback logic wherever possible.

## Catalog Data Rules

- The catalog (`src/data/catalog/`) is the crown asset. Only verified facts from provider pages; never invent prices, EAP, or dates — unknown = null.
- Every entry carries `sourceCheckedAt` and the provider URL.
- Public machine-readable mirror: `public/catalog.json` (+ `llms.txt` summary). Schema.org: `Course` + `EducationalOccupationalCredential` per entry, `Dataset` for the whole register.
- Provider corrections come through a public "paranda andmeid" form, never silent edits without a source.

## Tracking

Same GA4 taxonomy as the site family — keep events stable:
`tool_start`, `tool_completed`, `result_high_intent`, `cta_click`, `phone_click`, `email_click`, `partner_site_click`, `lead_form_start`, `lead_form_submit_attempt`, `lead_form_submit`.

Catalog-specific parameters: `tool_name` ("suunatest" | "kataloogifilter"), `provider`, `field`, `result_route`. Every outbound provider link fires `partner_site_click` with UTM tags — this is the future lead-gen proof for the freemium model.

**Demand radar** (intelligence for building new microcredentials faster than universities): `interest_signal` (`programme_slug`, `field`, `provider`) = per-programme "Mind huvitab" click → ranks which programmes draw interest; `demand_request` (`skill`, `field`) = request for a skill NOT in the catalog → surfaces unmet demand; `lead_form_submit` with `form_name` `interest_waitlist` = email captured against a programme; `field_subscribe` (`field`) = field-level notify; `outcome_search` (`term`, `results`) = what skills/outcomes people search on /oskused/ (incl. zero-result terms → demand gaps). Both the catalog search and /oskused/ also emit GA4-native `view_search_results` (`search_term`, `results`, `source`) on settled input (600ms debounce) so searched words appear in GA4's built-in "Search terms" report with no custom-dimension setup. **Outcome package (/oskused/):** `outcome_add` (`outcome`, `package_size`) = a learning outcome the visitor added to their self-assembled package → reveals desired skill *combinations* (persona + pain); `package_view` (`count`); `package_match` (`count`, `best_coverage`, `combo_size`, `all_in_one`) = the recommendation computed for a package — `combo_size > 1` with `all_in_one=ei` means a desired skill *combination* no single programme covers = a build-next opportunity; `lead_form_submit` with `form_name` `outcome_package` (`count`, `delivery`) = email left against a package (posts to `/api/subscribe` → AMOS, mailto fallback). Embargo-safe: neutral capture only ("teavitame, kui sobiv programm/kombinatsioon lisandub"); the best-match/combination recommendation is a later step. Read these in GA4 (and a Looker Studio demand board) alongside Search Console queries to decide what to build next. Keep them stable.

## Conversion Design

Value before contact (proven on digiteekaart): the suunatest gives an instant answer (2-3 matching programmes + who pays + payback logic) BEFORE asking for contact. Contact is asked only for the personal/verified answer. No tool may dead-end without a next step.

## Privacy

No raw personal data, secrets, or tokens in the repo or public files. Lead forms explain what is collected and why.

## Technical

Astro static site (Vercel + Cloudflare DNS, same family pattern). Before completing code work:
1. Run `npm run build`.
2. Commit the scoped change.
3. Push and deploy only when requested.
4. Verify the live domain when deployed.
5. Update `BACKLOG.md` if a new follow-up is discovered.
