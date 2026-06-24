# Brief for AMOS agents — curriculum object model, scraping & two-way intelligence

Status: brief (input for the AMOS agents to expand into their own backlog + design)
Audience: AMOS agents / AMOS engineering
Companion: `docs/data-pipeline.md` (the feed contract & consumption — already agreed).
Owner constraints: family rules (CLAUDE.md) + embargo (CLAUDE.local.md).

This brief defines **what to model, scrape, store and sync** so that:
1. mikrokvalifikatsioon.ee can show seekers richer comparison/analysis (by field, date,
   outcome, delivery instance), and
2. AMOS gains a **competitive-intelligence + demand radar** for planning new
   microcredentials faster than universities.

It is intentionally a brief, not a final schema. AMOS agents should turn it into a proper
backlog, warehouse schema and services, **based on the whole** (holistic curriculum
architecture shared with EVK internal trainings).

---

## 1. The whole picture (why)

```
 PROVIDERS' public pages ──scrape──▶ AMOS warehouse (canonical objects)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                        ▼                        ▼
   public-safe FEED ──sync──▶ mkval   competitive-intel views   demand radar
   (mikrokvalifikatsioon.ee)          (plan EVK programmes)     (what to build)
                 ▲                                                  ▲
                 └──────────── mkval instrumentation (GA4) ─────────┘
                     interest_signal / demand_request / outcome_search /
                     field_subscribe / Search Console queries
```

- **AMOS → mkval:** the rich object feed powers discovery/comparison for seekers.
- **AMOS internal:** the same scraped objects let EVK, when planning a new programme,
  instantly see *what competitors offer, which school, when, what volume, price, outcomes*.
- **mkval → AMOS:** instrumentation (what people search / show interest in, incl.
  zero-result outcome searches and demand requests) feeds AMOS planning.

This loop is the moat: real supply data + real demand data → faster, better-targeted
own programmes.

---

## 2. Canonical object model

Model these as **separate objects** (not flattened into one programme row). The same
holistic curriculum architecture is used for EVK internal trainings — `source` and
`publicationState` distinguish what is aggregated vs owned, and what is published.

### 2.1 Provider
School / trainer. `name`, `type` (ülikool/rakenduskõrgkool/erakool), `homepageUrl`,
`country`, `sameAs` (official profiles). 1 provider → N programmes.

### 2.2 Programme  *(the curriculum — the "what")*
The stable definition of a microcredential / microdegree.
`title`, `provider`, `field` (+ EMTAK), `credentialType` (mikrokvalifikatsioon | mikrokraad),
`ektsNominal` (may also vary per instance), `summary`, `goalText`, `EKR/EQF level`,
`sourceUrl`, `sourceCheckedAt`, `status` (active|closed|candidate), `source` (aggregated|own),
`publicationState` (draft|public|embargoed). 1 programme → N instances, N outcomes, N modules.

### 2.3 ProgrammeInstance  *(the delivery event — the "when/how", NEW & important)*
A concrete run that delivers the content and learning experience. **One programme can have
many parallel or sequential instances**, each with its own:
`registrationOpen`, `registrationDeadline`, `startDate`, `endDate`, `durationText`,
`language` (et|en|ru|…), `format` (veebis|hübriid|kohapeal), `location`, `price`,
`intakeStatus` (open|closing|closed|waitlist), `cohortLabel`, `sourceUrl`, `sourceCheckedAt`.
→ schema.org maps to `CourseInstance`. mkval picks the relevant instance(s) per view
(soonest deadline, by start month, by language).

### 2.4 Outcome  *(learning outcome — searchable & comparable object, 1..N)*
Each learning outcome is its **own object** (the count is dynamic — some programmes have 1,
others 5+). `text`, `language`, optional `skillTag`/`competence` (normalised keyword for
search/compare), `sourceEvidence`. Powers `/oskused/` (search by skill) and outcome-level
comparison across programmes.

### 2.5 Module (1..N), Assessment, Credential
`Module`: `title`, `ects`, `order`. `Assessment`: `method`, `criteria`. `Credential`:
`EducationalOccupationalCredential`, `EKR/EQF level`, `awardedDocument`. All variable
cardinality, each described separately.

### 2.6 Localization (multilingual)
Programme/instance/outcome text fields can exist in **et / en / ru**. Model as localized
strings (e.g. `title.et`, `title.en`) or per-language records linked to the same entity.
Names "in another language" are first-class, not afterthoughts (needed for the EN site and
GEO). Unknown locale = absent, never machine-translated as if authoritative.

### 2.7 Cross-cutting on every object
`id` (stable), `sourceUrl`, `scrapedAt`, `sourceCheckedAt`, `parserConfidence` (0–1),
`sourceEvidenceHash`, `status`, `reviewState` (auto|needs-review|approved). **Unknown = null,
never invented.**

---

## 3. Dynamic scraping requirements

- **Per-object extraction, dynamic cardinality:** extract each instance / outcome / module
  as its own record. Handle 1-outcome and 10-outcome programmes equally; handle a programme
  with 3 parallel autumn cohorts in different languages.
- **JS-capable fetch** for JS-rendered providers (Töötukassa, some universities).
- **Multilingual:** capture each language variant present on the provider page.
- **Change detection:** diff per object; bump `sourceCheckedAt`; flag changes.
- **Discovery:** crawl provider listing pages → new programmes/instances as `candidate`.
- **Confidence + evidence:** every extracted value carries confidence + source evidence;
  low confidence / large change / new programme / curriculum facts / any own-programme
  publication change → **review queue** (human-in-the-loop). Auto-apply stays narrow.

---

## 4. Pipeline & feed (extends data-pipeline.md)

Scrape → normalise (field/EMTAK, language, date parse, dedup) → warehouse (canonical
objects) → validate → **publish public-safe feed** → mkval consumes at build + Vercel
Deploy Hook rebuild. The feed contract `amos.mkval.catalog/v1` (in `data-pipeline.md`) is a
flat programme projection. This brief implies a **v2** that carries the richer model:

```jsonc
{
  "schemaVersion": "amos.mkval.catalog/v2",
  "generatedAt": "…", "checkedAt": "…", "contentHash": "…", "count": 169,
  "programs": [
    {
      "id": "…", "title": "…", "title_en": "…",
      "provider": "…", "providerType": "ülikool", "url": "…", "field": "IT ja andmed",
      "credentialType": "mikrokraad", "ects": 12,
      "summary": "…", "goalText": "…",
      "outcomes": ["…", "…"],            // 1..N, separate objects upstream
      "assessmentText": "…",
      "instances": [                      // 0..N parallel/sequential runs
        { "language": "et", "format": "veebis", "registrationDeadline": "2026-08-21",
          "startDate": "2026-08-31", "endDate": null, "durationText": "1 semester",
          "price": "900 €", "intakeStatus": "open", "sourceCheckedAt": "2026-06-20" }
      ],
      "sourceCheckedAt": "…", "status": "active"
    }
  ]
}
```

**Consumer note (mkval, future):** mkval currently consumes flat fields incl.
`registrationDeadline`/`startDate`/`outcomes`. To adopt v2 it will: keep v1 fallback, and
when `instances[]` is present, derive the catalog row from the **most relevant instance**
(soonest open deadline) and feed `/registreerimine/` from all instances. Backward
compatible: if `instances` is absent, use the flat date fields. (Small consumer change,
gated on v2.)

---

## 5. Two-way intelligence

### 5.1 mkval → AMOS (demand)
mkval already emits, and should be ingested into AMOS planning:
`interest_signal` (programme), `demand_request` (unmet skill), `outcome_search`
(searched skills incl. **zero-result = gaps**), `field_subscribe` (field demand),
plus Search Console queries. → "what people want that nobody offers".

### 5.2 AMOS internal (supply / competitive intelligence)
From the warehouse, when planning a new EVK programme, answer instantly:
- In field X, what do competitors offer? Which providers, how many, what volume (EAP),
  price range, formats, languages?
- When are their intakes (so EVK can time its own)?
- Which outcomes are saturated vs uncovered (cross outcome objects with demand signals)?
→ position EVK's offering (gap + timing + price) faster than universities.

---

## 6. Governance (non-negotiable)
- **Public-safe feed only:** no person data (board members, isikukood, beneficial owners),
  no secrets, no raw private docs. Person data stays in the AMOS restricted zone.
- **Never invent:** unknown = null; AI may suggest, but cannot be canonical without source
  evidence + review.
- **Embargo:** any operator's own programmes (`publicationState ≠ public`) are excluded from
  the public feed until the owner lifts the embargo. See CLAUDE.local.md.
- **Evidence + rollback:** every object carries source evidence; keep previous-good feed.

---

## 7. Proposed backlog for AMOS agents (expand into stories)

1. **Object model & warehouse schema** — Provider, Programme, ProgrammeInstance, Outcome,
   Module, Assessment, Credential, Localization; cross-cutting evidence/confidence/state;
   publicationState separate from data existence. Map onto the existing AMOS curriculum
   architecture (one truth shared with internal trainings).
2. **Scrapers (per provider, JS-capable)** — per-object extraction with dynamic cardinality,
   multilingual capture, change detection, confidence + evidence.
3. **Normalisation** — field/EMTAK, language, date parsing (registration/start/end), dedup,
   outcome → skillTag normalisation for search/compare.
4. **Review queue & auto-apply policy** — narrow auto-apply; queue new/large/curriculum/
   publication-state changes.
5. **Public-safe feed publisher v2** — instances[]/outcomes[]/localized fields; validation
   gate (schemaVersion, counts, forbidden keys, freshness); previous-good retention.
6. **Competitive-intelligence views** — field/provider/instance/outcome rollups for EVK
   programme planning.
7. **Demand ingestion** — pull mkval GA4 demand events + Search Console into AMOS planning;
   join supply (warehouse) × demand (signals) → "build-next" ranking.
8. **Sync/ops** — Vercel Deploy Hook as AMOS secret, triggered only on validated feed diff;
   daily safety rebuild; post-deploy smoke test of public `/catalog.json`.

## 8. Definition of done
- Canonical objects in the warehouse with evidence + confidence + state.
- Validated public-safe v2 feed published; mkval builds from it with snapshot fallback.
- Competitive-intel views answer "what/where/when/how big/which language" per field.
- Demand × supply join available for "what to build next".
- No person data / embargoed own programmes ever in the public feed.
