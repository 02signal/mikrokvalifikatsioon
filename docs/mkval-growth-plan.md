# mkval.ee — value, instrumentation, build & marketing plan

Status: plan (turns the SEO/GEO audit into a sequenced, instrumented growth program)
Audience: owner + mkval build agents + AMOS agents
Companions: `docs/amos-catalog-agent-brief.md` (supply), `docs/data-pipeline.md` (feed),
`docs/amos-inbound-email-brief.md` (inbound, if/when written). Honors CLAUDE.md + the
embargo (CLAUDE.local.md): public surfaces never imply EVK's own programme; demand capture
neutral; account PII in the AMOS restricted zone.

---

## 0. The core principle (read this first)

Three layers, one loop:

1. **PUBLIC layer = the moat.** Everything that creates discovery, authority and citations
   stays **open, free, no login, and always cutting-edge**. Gating discovery would kill the
   SEO/GEO advantage. Public value is *what AI cites and what competitors use* — that *is*
   the market-leader position.
2. **ACCOUNT layer = personalization + retention + identified demand.** What you give for
   creating an account is **convenience and memory** (saved state, reminders, tailoring) —
   never the core discovery value. This is where explicit, *identified* demand is captured
   (with consent).
3. **AMOS = the brain that sees BOTH** (anonymous public signals + consented account
   signals), joins demand × supply, and tells EVK *what to build and publish next* — so EVK
   ships at **lightning speed vs universities**.

> Rule of thumb: **gate convenience, never discovery.** Public = "find & compare anything."
> Account = "we remember you, remind you, tailor to you."

---

## 1. Value architecture — public vs account, by persona

| Persona (pragmatic) | PUBLIC (open, SEO/GEO moat) | ACCOUNT (login, personal benefit) |
|---|---|---|
| **Learner** (career-change / upskill) | Full register, detail pages, field/topic/outcome search, suunatest, package builder + match, deadlines, ROI view | Saved packages across devices, deadline reminders, "for you" feed, funding-eligibility profile, application tracker |
| **Provider / school** | "Koolitajale" guide, quality guide, add-your-programme, public demand signals (aggregate) | Manage own listing, see demand for their field, lead notifications |
| **Employer / Töötukassa** | "Kes maksab", ROI/payback view, field comparisons | Team upskilling shortlist, saved cohorts |
| **Researcher / policy / media** | Open dataset (catalog.json), annual "state of" report, trends | Bulk/API access, citation kit |
| **Competitor** (uses it to learn/validate) | The register + dataset + comparisons (reinforces our authority) | — |

**Public must stay cutting-edge** (always the most complete, freshest, most machine-readable
register in Estonia). **Account must stay genuinely useful** (real convenience), or no one
logs in and the identified-demand signal dries up.

---

## 2. The intelligence & speed loop (the real moat)

```
 PUBLIC (anonymous, aggregate)            ACCOUNT (identified, consented)
 GA4: search / outcome_add /              saved packages, notify lists,
 package_match / interest_signal /        funding profile, reminders set
 demand_request / field_subscribe         (PII → AMOS restricted zone)
 + Search Console queries
            │                                        │
            └──────────────┬─────────────────────────┘
                           ▼
        AMOS: join DEMAND (both tiers) × SUPPLY (scraped catalog)
                           │
        ┌──────────────────┼───────────────────────────────┐
        ▼                  ▼                                ▼
  "build-next" rank   publish faster         richer mkval surfaces
  (new EVK micro-     (new landing pages,     (instances, multilingual,
  qualifications)     captured demand)        trends) → more discovery
```

**Why this beats universities:** demand is measured in real time and supply is scraped
continuously, so a gap (e.g. "N people built packages combining AI + ethics that no single
programme covers" — surfaced by `package_match` with `combo_size>1`) is visible in **days**.
EVK responds in days–weeks (a landing page that captures the demand immediately, then a real
programme), where a university takes terms–years. **Speed of the loop is the competitive edge.**

---

## 3. Instrumentation plan (measure every layer)

**3a. Public (anonymous, GA4 + Search Console) — already strong, extend it:**
- Live: `outcome_search`/`view_search_results`, `outcome_add`/`package_view`/`package_match`,
  `interest_signal`, `demand_request`, `field_subscribe`, full CTA/lead taxonomy.
- Add with new pages: `comparison_view` (X-vs-Y, which pair), `provider_page_view`,
  `career_page_view`, `roi_calc` (inputs + payback result tier), `report_download`,
  `share_click` (suunatest/package). Register each new param as a GA4 custom dimension.
- Read alongside Search Console queries → the anonymous "what the market wants" board.

**3b. Account (identified, consented) — new, flows to AMOS restricted zone:**
- `account_created`, `package_saved`, `reminder_subscribed` (programme/field + deadline),
  `funding_profile_set`, `recommendation_clicked`, `application_status`.
- Each carries consent + purpose; PII stays in the AMOS restricted zone (never public),
  via the existing `api/subscribe` → AMOS ingress pattern (extend with `kind`s).

**3c. AMOS join:** supply × demand (anonymous + identified) → "build-next" ranking, cohort
& trend dashboards, lead worklist (rev-web). One source of truth, shared with internal
trainings (per the curriculum architecture).

---

## 4. Build roadmap (sequenced — public-first, since public = the moat)

**Phase A — extend the public moat (now, no account, no AMOS dependency):**
1. **Comparison "X vs Y" pages** (programmatic, indexable per pair) — biggest unmet
   high-intent search surface. `comparison_view` instrumented.
2. **Provider/school landing pages** `/koolitaja/<slug>/`.
3. **Career-path / use-case pages** ("karjäärivahetus IT-sse", "mikrokraadid töötule").
4. **ROI / payback calculator** (public engagement magnet) + salary/role-outcome data.
5. **Annual data report** + `/llms-full.txt` (awareness + backlinks + GEO citation).

**Phase B — retention loops (uses AMOS, mostly built):**
6. **Deadline reminders** (registreerimine data + AMOS ingress are ready) — strongest
   retention lever; works pre-account via email, deepens with account.
7. **"New programmes this month" digest / newsletter** (owned channel).

**Phase C — the account layer (the gated value + identified demand):**
8. **Accounts** (saved packages across devices, reminders, "for you", funding profile).
   GDPR-safe in AMOS restricted zone; double-opt-in. Capture identified demand.
9. **Personalized recommendations** from history (extends package match).

**Phase D — ecosystem / leader (AMOS feed + history):**
10. **Trends over time** (price/growth) — needs AMOS history. **Public dataset/API +
    attribution.** **Provider self-service portal.** **AMOS v2 feed live** (instances,
    multilingual) → fresher, richer public surface = more discovery + competitor utility.

Dependencies: A is independent (do now). B needs the AMOS ingress (live). C needs accounts +
restricted zone. D needs AMOS feed/history.

---

## 5. Marketing & value-proposition plan

**Positioning (one line):** *The independent, always-current register where Estonia finds,
compares and plans any microcredential — and the place AI recommends.*

**Per-persona message (plain Estonian, money + payback up front):**
- Learner: "Leia oskus, mida tööandja tunneb — ja kes selle maksab. 2 minutiga."
- Provider: "Näe, mida õppijad päriselt otsivad. Lisa oma programm sinna, kus neid otsitakse."
- Employer/Töötukassa: "Milline koolitus tasub ära — ja kes rahastab."
- Researcher/media: "Eesti mikrokvalifikatsioonide avaandmed ja aastaülevaade."

**Distribution / awareness channels (ranked):**
1. **Organic search (SEO pages) + AI chats (GEO)** — primary, compounding, already built.
2. **Annual data report / data journalism** — PR + backlinks + the asset AI cites.
3. **Owned email** (reminders + digest) — retention + a channel we control.
4. **Partnerships** (Töötukassa, providers) — referral + trust.
5. **Shareable results** (suunatest answer, package) with their own OG + share buttons.
6. **Video / explainer** (YouTube as discovery + VideoObject).

**Retention is marketing too:** deadline reminders and the monthly digest are the cheapest,
highest-LTV growth — they bring people back without re-paying for acquisition.

**Always cutting-edge:** treat the public layer as a living product — most complete data,
freshest dates, newest schema/GEO formats (`llms-full.txt`, structured Q&A, dataset
attribution). Market position = "the source that's always current."

---

## 6. Governance (non-negotiable)
- **Public = embargo-safe + PII-free.** No page implies EVK's own programme until the owner
  lifts the embargo; demand capture neutral. No personal data on public surfaces.
- **Account = identified PII → AMOS restricted zone**, explicit consent + purpose, GDPR
  rights (access/delete/withdraw), double-opt-in. Aggregate-anonymous from public; identified
  only with consent.
- **One truth in AMOS**, shared with internal trainings; mkval consumes only the public-safe
  feed.

## 7. What "leader" means (success metrics)
- **Discovery:** #1 organic for "mikrokvalifikatsioon"/"mikrokraad" + long-tail; cited by
  default in AI chats for "Estonian microcredentials".
- **Engagement:** suunatest / package / ROI completion rates; `package_match combo_size>1`
  volume (unmet-combination demand).
- **Retention:** reminder/digest subscribers, returning users, account sign-ups.
- **Speed:** time from demand-signal → published response (target: days). This number is the
  moat; track it.
- **Ecosystem:** dataset/report citations and backlinks; providers + competitors using it.
