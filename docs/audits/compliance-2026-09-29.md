# Compliance audit of public copy — 2026-09-29

Scope: built `dist/` (all pages, `llms.txt`, `llms-full.txt`, `catalog.json`, `catalog.cc.jsonld`, `site-profile.json`), `src/` copy, meta/OG descriptions, JSON-LD, FAQ answers, diagram labels, form option labels/values.
Rules: (1) funding-copy ban, (2) embargo, (3) overclaims, (4) licence. Severity: H = clear violation / owner must decide, M = overclaim risk, L = note.
Status: FIXED = changed in this PR (old → new listed in the PR body); OPEN = owner decision, not changed.

## Rule 1 — Funding-copy ban: 0 violations

`grep -i 'töötukassa|tootukassa|koolituskaart'` over all built output: hits only on `/maakond/*`, `/karjaar/*`, `/ametiruhm/*` and only as the permitted open-data source credit (visible "Allikas:" line, `DataProvenance`, schema.org `Dataset` `creator`/`name`/`description`). None on `/kes-maksab/`, home, FAQ, `llms*.txt`, `catalog*.json`, diagram SVGs or form option labels/values (no `tootukassa` / `funding_segment` value in `src/`). `/kes-maksab/` speaks only of tööandja koolituseelarve, õppekava enda rahastus, ise makstes, and the abstract "support measures exist, we neither broker nor promise" line.

Not public but note: `docs/*.md`, `docs/prototype-konto-onboarding-v2/v3.html`, `docs/style-tile-pragmatic-momentum.html`, `docs/i18n-plan.md` still say "Töötukassa toetab" / "Töötukassa, tööandja, ise" (internal planning files, repo is public). Severity L; not changed (owner may want them scrubbed).

## Rule 2 — Embargo: 0 violations

No public string states or implies an Ettevõtluskeskus own programme/credential. Ettevõtluskeskus OÜ appears only as publisher/citation (`/aastaraport/`, organization schema). Capture wording is neutral. See open question Q1 on "sõltumatu".

## Rule 3 — Overclaims

| # | File / URL | Exact phrase | Severity | Status | Fix |
|---|---|---|---|---|---|
| 1 | `src/pages/index.astro:168` (H1 of `/`), `src/data/ogPages.ts:31` (OG card) | "Leia oskus, mida tööandjad tunnustavad — ja keegi, kes selle kinni maksab." | H | FIXED | "Leia sobiv mikrokvalifikatsioon — ja uuri, kes selle kinni võiks maksta." (promises recognition and a payer) |
| 2 | `src/pages/en/index.astro` H1 + ogDescription, `src/data/ogPages.ts:35` | "Find a recognised skill — and someone to fund it." / "who can fund it" | H | FIXED | "Find the right skill — and see who could fund it." |
| 3 | `src/pages/teema/[slug].astro:306` (all `/teema/*`) | "leia just sulle sobiv oskus ja kes selle kinni maksab" | M | FIXED | "… ja uuri, kes selle kinni võiks maksta" |
| 4 | `src/data/questions/index.ts:485` (`/vastused/kas-mikrokvalifikatsioon-on-ehises-tunnustatud/`) | "Tunnustamine tööturul tuleneb just sellest ametlikust staatusest" | H | FIXED | recognition outcome → "Ametlik staatus tähendab, et tunnistus tõendab EHIS-es kinnitatud õppekava läbimist; kuidas tööandja seda hindab, otsustab tööandja ise." |
| 5 | `src/pages/en/index.astro` FAQ | "Often the learner does not pay everything … can cover a large part." | M | FIXED | "Some learners do not pay everything … may cover part of it. Ask the provider." |
| 6 | `src/pages/en/index.astro` card | "…use in your CV, in Europass and in pay negotiations." | M | FIXED | drop "and in pay negotiations" (salary outcome) |
| 7 | `src/pages/kes-maksab/index.astro` | "jah-sõna tõenäosus kasvab kordades" | M | FIXED | "… kasvab" |
| 8 | `src/pages/kes-maksab/index.astro` | "Enamikus ettevõtetes on koolitusraha olemas" | M | FIXED | "Paljudes ettevõtetes …" |
| 9 | `src/pages/kes-maksab/index.astro` | "sageli kaetakse osa summast mujalt" | M | FIXED | "mõnikord on osa summast kaetud mujalt" |
| 10 | `src/pages/kkk/index.astro` (FAQ + FAQPage JSON-LD) | "Lisaks võib tööandja katta suure osa hinnast." | M | FIXED | "… katta osa hinnast." |
| 11 | site-wide (`organizationSchema.ts`, `ogPages.ts`, `llms.txt`, `site-profile.json`, `/kuidas-koostame/`, `/aastaraport/`, `/kkk/`, `/en/`, every `/koolitaja/*`) | "Sõltumatu … register" / "The independent register" (58 built occurrences) | H | OPEN | see Q1 |
| 12 | `Footer.astro:2`, `Seo.astro:106`, `ogPages.ts:30`, `llms.txt` | site titled "Eesti mikrokvalifikatsioonide ja mikrokraadide register" while `/kkk/` and `/andmed/` say "see ei ole ametlik riiklik register" | M | OPEN | see Q2 |
| 13 | `kes-maksab` example | "1 200 € programm … teenib end tagasi poole aastaga" | L | kept | clearly a labelled worked example, not a promise; add "näide" if owner wants |
| 14 | `LaborDemandStats.astro:41`, `SalaryStats.astro:35`, `DataProvenance.astro` | "Ametlik avaandmestik / Ametlik brutopalga mediaan" | L | kept | describes the source (open data by public bodies), not the site |
| 15 | `questions/index.ts`, `diagrams*.ts`, `andmed`, `kataloog` | "ametlikult tunnustatud", "riiklik register", "ametlik EHIS faktikiht" | L | kept | refers to EHIS / HTM, correctly attributed; the site disclaims being official |
| 16 | `/kkk/` | "Tunnistust saab kasutada CV-s ja Europassis kogu Euroopas" | L | kept | capability, not outcome |

Counts: H 5 (4 fixed, 1 open), M 8 (7 fixed, 1 open), L 4 (kept).

## Rule 4 — Licence

- Labour-market data (Töötukassa vacancy statistics, CC BY-NC 3.0) is NOT relicensed. `LaborDemandStats`, `DataProvenance`, and the `Dataset` JSON-LD on `/karjaar/*`, `/maakond/*`, `/ametiruhm/*` carry `license: creativecommons.org/licenses/by-nc/3.0/` and the visible "Allikas:" + "litsents CC BY-NC 3.0" line. Statistikaamet wages carry CC BY-SA 4.0 correctly.
- `/andmed/` and `/andmestandard/` (CC BY 4.0) cover only the catalogue and the EHIS layer; `catalog.json`, `catalog.cc.jsonld`, `llms*.txt`, `/aastaraport/` contain no labour-market data (checked by grep). The BY 4.0 grant therefore does not touch NC data.
- Residual (L): the per-page CC BY 4.0 on `/vastused/*` diagram images and `/aastaraport/` is not scoped to say "excludes third-party data", but none is embedded. A one-line "Kolmandate osapoolte andmed (Töötukassa, Statistikaamet) on oma litsentsi all" on `/andmed/` would remove any doubt (not added: new copy, owner review).
- Q3 below: whether a company (Ettevõtluskeskus OÜ) site displaying NC data is "non-commercial" is a legal question — not decided here.

## Open questions for the owner

- **Q1 "sõltumatu / independent"** (58 occurrences): is it still accurate while Ettevõtluskeskus OÜ has its own programme under assessment (embargo)? Independence is a claim about conflict of interest; safer neutral words are "avaandmetel põhinev" / "koostatud koolide avalike lehtede põhjal". Not changed because it is brand-level positioning and the reason touches the embargo.
- **Q2 "register"** as the site's self-name vs. "ei ole ametlik riiklik register": rename to "kataloog ja teejuht", or keep with the disclaimer?
- **Q3 CC BY-NC 3.0 + company site**: does showing banded vacancy statistics on a commercial company's site with lead capture count as non-commercial use? Possible routes: ask Töötukassa / Statistikaamet for written confirmation, or drop the labour layer from pages that sit next to lead forms. Legal call, owner's.
- **Q4** scrub the internal `docs/` "Töötukassa toetab" strings (public repo)?
