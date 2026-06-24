# Brief for AMOS agents — labor-market layer (jobs × salary × skills × orgs)

Status: brief (input for the AMOS agents; needs warehouse-architecture + RIK + Twenty design)
Audience: AMOS agents / AMOS engineering + mkval consumer side
Companions: `docs/amos-catalog-agent-brief.md` (programme supply), `docs/data-pipeline.md`
(feed), `docs/mkval-growth-plan.md` (public vs account, the speed loop).
Owner constraints: CLAUDE.md + embargo (CLAUDE.local.md); the AMOS consolidation freeze
(Twenty = operational CRM, AMOS = brain, restricted person-data zone).

Adds a **labor-market data layer** to AMOS that ties programme **supply** (mkval catalog) to
labor **demand** (job postings, salary, application signals) and to **organizations** (across
the AMOS warehouse, Twenty, and RIK). It powers two surfaces from one source of truth:

- **Public (mkval, learner):** aggregate, embargo-safe market facts — "N openings for this
  skill now, salary split X–Y €, trend ↑" — on programme / field / career pages + the ROI
  calculator.
- **Private (Twenty / rev-web, B2B):** recruitment intelligence — which organizations are
  hiring (sales targets when a B2B user plans outreach). Restricted person/contact data.

---

## 1. The loop (why)

```
 SUPPLY  programmes/outcomes (mkval catalog, AMOS) ─┐
                                                    ├─► AMOS join (skill/occupation taxonomy)
 DEMAND  job postings + salary + application vol ───┘        │
 ORGS    employers (AMOS warehouse ⇄ Twenty ⇄ RIK)          │
                          ┌─────────────────────────────────┼──────────────────────┐
                          ▼                                  ▼                      ▼
        PUBLIC mkval aggregates              PRIVATE B2B/REV intel        "build-next" rank
        (ROI, career, market demand)         (who's hiring → sales)       (EVK new programmes)
```

Closes the speed loop: AMOS sees *who learns what* (mkval signals) **and** *who hires what*
(labor market) → EVK builds/publishes where demand is, faster than universities.

---

## 2. Canonical objects (extend the warehouse)

- **JobPosting** — `title`, `employerOrgId`, `occupationCode` (ESCO/ISCO or EMTAK-adjacent),
  `skillTags[]` (normalised, joinable to outcome `skillTag`), `location`, `seniority`
  (entry/mid/senior), `salaryMin/Max/period/currency` (when stated), `postedAt`, `closesAt`,
  `applicantCount` (only if the source exposes it — often absent), `sourceUrl`, `scrapedAt`,
  `status` (open|closed), `parserConfidence`.
- **SalaryObservation** — `occupationCode`/`skillTag`, `region`, `seniority`, `amount`,
  `period`, `source`, `observedAt`. (From postings + official stats; see §3.)
- **DemandSignal (rollup)** — per skill/occupation/region: `openingsNow`, `openings30dAgo`
  (trend), `medianSalary`, `salaryP25/P75` (the "split"), `entryShare` (share of entry-level
  postings). This is the public-safe aggregate mkval consumes.
- **Organization (employer)** — `name`, `regCode` (RIK), `emtak`, `size`, `sameAs`; the join
  key across **AMOS warehouse ⇄ Twenty (CRM) ⇄ RIK**. Public-safe identity only; beneficial
  owners / person data stay restricted (per the RIK beneficial-owners restricted zone).
- **Occupation/Skill taxonomy** — the bridge: `occupationCode ↔ skillTag ↔ programme outcomes`.
  Lets us answer "this programme → these jobs → this salary".

Cross-cutting (as in the catalog brief): source evidence, confidence, `reviewState`,
`publicationState`. **Unknown = null, never invented.**

---

## 3. Sources + caveats (be honest about what's gettable)

- **Job postings:** CV.ee, CVKeskus, Töötukassa, LinkedIn, employer sites. **Respect ToS /
  robots / rate limits**; some require API/agreement, some forbid scraping — prefer official
  APIs/feeds where they exist, store source + evidence, and **log what was skipped** (don't
  silently undercount).
- **Salary:** posted ranges are sparse and biased; combine with **official stats**
  (Statistikaamet wage data, Töötukassa) for credible splits. Mark estimates as estimates.
- **`applicantCount`:** rarely public. Where unavailable, **do not fabricate** — show
  openings + trend, and treat application-volume as a separate, often-missing field.
- **Organizations:** RIK for legal identity / EMTAK / size (public-safe parts). Person data
  (board, beneficial owners, contacts) = **restricted zone**, GDPR lawful basis required.

---

## 4. Public mkval surfaces (aggregates only, embargo-safe)

Consumed via a **public-safe labor feed** (analogous to the catalog feed): only `DemandSignal`
rollups + `SalaryObservation` aggregates, **no employer-specific or person data**.

- **ROI / payback calculator:** programme cost + duration vs **median salary uplift** for the
  target occupation (entry→post) → payback months. Inputs from `DemandSignal`/`SalaryObservation`.
- **Programme / field / career pages:** "≈N openings now (trend ↑/↓), salary split P25–P75,
  entry-level share" for the skills the programme teaches.
- **Career-path pages (#3) — the differentiated narrative (data-backed):** the real worry is
  *"beginners can't break through."* The honest, useful framing this data supports:
  > Applications arrive in the **hundreds (growing)**, but genuinely strong candidates are
  > **few** — employers increasingly weigh **personal qualities + demonstrated work
  > (portfolio)** over a CV line. So: pick learning that lets you **build a portfolio of real
  > work**, not just a certificate.
  → recommend **portfolio-friendly programmes** (filter catalog for practical/portfolio
  output). This is a true, high-engagement angle that also sets the stage for an **embargoed
  EVK portfolio-first offering** (see CLAUDE.local.md): **prepare the neutral ground now;
  name/imply nothing until it is approved and the owner lifts the embargo.**

All public copy stays neutral, money-and-payback-first, and **never implies EVK's own
programme** until the embargo is lifted.

---

## 5. Private B2B / REV surface (restricted)

In **Twenty + rev-web**: "organizations hiring for skill/occupation X in region Y" →
sales-target worklist for a B2B user planning outreach (e.g. offer EVK training to employers
who can't find candidates). Organizations joined across AMOS ⇄ Twenty ⇄ RIK; recruitment
context attached to the org/company view. Person/contact data restricted, consent-tracked.

---

## 6. Governance (non-negotiable)
- **Public = aggregates only**, no employer-identified or person data; embargo-safe.
- **Restricted zone** = applicant/person/contact data + employer beneficial owners (RIK) +
  B2B contacts (Twenty); GDPR lawful basis + retention.
- **Scraping** respects ToS/robots/rate limits; sources + evidence stored; skipped sources
  logged (no silent undercount).
- **Embargo:** no public mention or implication of EVK's own portfolio-first offering until
  approved + owner lifts it. Internal planning may prepare the ground.

## 7. Backlog for AMOS agents
1. Occupation/skill taxonomy + the `occupation ↔ skillTag ↔ outcome` bridge.
2. Job-posting ingestion (per source, ToS-aware) → JobPosting objects + evidence/confidence.
3. Salary model (postings + official stats) → SalaryObservation + DemandSignal rollups.
4. Organization join (warehouse ⇄ Twenty ⇄ RIK), public-safe identity vs restricted person data.
5. Public-safe **labor feed** (DemandSignal/Salary aggregates) for mkval — validation gate,
   forbidden-key check, freshness.
6. Twenty/rev-web B2B "who's hiring" worklist (restricted).
7. Wire mkval: ROI calculator + programme/field/career pages consume the labor feed
   (build-time, snapshot fallback, like the catalog feed).

## 8. Definition of done
- Labor objects in the warehouse with evidence + confidence + state.
- Public-safe labor feed live; mkval ROI + career/field/programme pages show openings/salary/
  trend; no employer-identified or person data public.
- B2B "who's hiring" worklist in Twenty (restricted) for sales planning.
- Demand (mkval signals) × labor (jobs) × supply (catalog) joined → "build-next" ranking.
- Embargo intact; portfolio narrative live and DACA-ready without naming it.
