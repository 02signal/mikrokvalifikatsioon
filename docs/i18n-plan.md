# RU + EN Localization Plan — mikrokvalifikatsioon.ee

Status: PLANNED (owner directive 2026-06-12: professional, localized — not machine-dumped).
Prerequisite: Estonian content stabilized (suunatest + core pages live; catalog data verified).

## Why both languages, and in what order

- **RU** — conversion language. A large share of Estonian career-changers (notably
  Ida-Virumaa, Töötukassa-funded retraining) search and decide in Russian. Direct
  lead value. Recommended FIRST.
- **EN** — GEO/authority language. AI assistants and international queries
  ("micro-credentials Estonia") resolve in English; llms.txt is already EN. Builds
  the citation moat. Close SECOND.
Owner decides the order; both within one architecture.

## Architecture (Astro built-in i18n)

- Routing: `et` default WITHOUT prefix (current URLs unchanged — SEO preserved),
  `/ru/...` and `/en/...` prefixed trees.
- `hreflang` triple + `x-default` (et) on every localized page; localized sitemap.
- UI strings extracted to `src/i18n/{et,ru,en}.ts` — pages stop hardcoding labels.
- GA4: same event taxonomy, add `page_language` param; one property, language as
  dimension.
- llms.txt: add RU canonical answers; site-profile.json gets `languages` field.

## What gets localized, in priority order

1. Suunatest UI + result/funding hints (the conversion engine) + homepage.
2. /kes-maksab/ — Töötukassa content is MOST valuable in Russian (target audience).
3. /mis-on-mikrokvalifikatsioon/ + FAQ (FAQPage schema per language).
4. Catalog UI (filters, labels). Programme `summary` fields: phase 2, batched.
   Programme names stay in their original language with a language badge.
5. /privaatsus/ + cookie banner strings (legal requirement once RU/EN pages exist).

## Professional workflow (not machine-dumped)

1. Glossary FIRST, owner-approved, before any translation:
   - mikrokvalifikatsioon = микроквалификация / micro-credential
   - mikrokraad = микростепень / microdegree
   - täiendõpe = повышение квалификации / upskilling
   - ümberõpe = переобучение / career change (reskilling)
   - Töötukassa = Töötukassa (kassa по безработице — keep official name + gloss) / Estonian Unemployment Insurance Fund
   - EAP = EAP (ECTS) both languages
2. Draft translations generated against the glossary, then **human reviewer per
   language** (native, marketing-capable — not just correct, but selling) reviews
   tone against the persona: pragmatic adult learner, "что это даст и кто заплатит".
3. Owner spot-checks money/claims pages (kes-maksab) — legal-ish content.
4. Translation memory lives in the repo (`src/i18n/`), so future edits diff cleanly.

## Effort estimate

~2 500 words of page copy + ~80 UI strings per language. With glossary + review
loop: RU live in one focused work session + review day; EN same. Catalog summaries
(169 × ~15 words) are a separate batched phase with spot-check review.
