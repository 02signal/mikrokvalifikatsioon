# Account layer — registered-user plan (mkval brand face + AMOS spine)

Status: plan/brief (operationalizes the ratified AMOS learner-identity ADR for mikrokvalifikatsioon.ee)
Audience: owner + AMOS agents + credentialstudy/konto brand-face agents
Companions: `docs/mkval-growth-plan.md` (public-vs-account split, the speed loop),
`docs/amos-catalog-agent-brief.md` (supply), `docs/amos-labor-market-brief.md` (labor),
`docs/data-pipeline.md` (feed). Honors CLAUDE.md + the embargo (CLAUDE.local.md) + the AMOS
consolidation freeze (Twenty = operational CRM, AMOS = brain, restricted person-data zone).

The account layer is the "gate convenience, never discovery" tier: it adds memory /
personalization / retention to the public moat AND turns anonymous demand into **identified,
consented, fundable demand** that lets EVK rank "build-next" and respond to the market faster
than universities. This brief makes the **already-RATIFIED** AMOS decision concrete for the ET
brand face (`02S-AMOS/docs/architecture/amos-outcome-package-and-learner-identity-adr.md`,
D4/D5): magic-link auth, Twenty-as-person-home, AMOS-owned packages, the `confirm-token` +
`lead_capture/v1` seams. **All new account/identity/scoring logic lands in AMOS/Twenty/rev-web,
not in the mkval repo** (consolidation freeze); mkval gains only a thin brand face + passthrough.

---

## 0. Confirmed owner decisions
- **A2 — one shared OPK/identity spine, brand faces.** ET face `konto.mikrokvalifikatsioon.ee`,
  EN face `credentialstudy.com`, over one AMOS account/identity spine. The public apex stays
  `output:"static"` (moat untouched, no auth in the crawl path).
- **MVP = 4 features:** account + saved-package sync · deadline reminders · notify-lists
  (field / skill / unmet **combination**) · funding-eligibility profile.
- **Twenty bridge:** the person lives in the AMOS consent ledger (`contact_ref` nullable) now;
  linked to a Twenty person when Twenty is deployed. Accounts are not blocked on Twenty.
- **Auth = passwordless magic-link** (reuse `confirm-token` HMAC seam); no password store, no
  third-party CIAM.

---

## 1. Architecture (A2 — one spine, many faces)

```
 PUBLIC STATIC APEX            BRAND FACES (SSR, noindex)         AMOS SPINE (brain + restricted PII)
 mikrokvalifikatsioon.ee       konto.mikrokvalifikatsioon.ee      • magic-link issue/verify (confirm-token seam)
 output:"static"               credentialstudy.com (EN, later)    • amos_consent ledger (email + DOI, EU)  [PII]
 catalog/search/package/            │  magic-link login           • amos_learner_package (outcome refs)    [non-PII]
 deadlines/dataset             ─────┤  session = opaque ref       • Twenty person (canonical)  ← bridge until live
 only backend call:                 │  thin validate + forward    • amos_restricted (funding enrichment)   [never public]
 POST /api/subscribe                ▼                             • build-next loop → rev-web worklist (staff)
 logged-out = 100% functional   account features                  freeze: all new logic lands HERE
```

- **Apex never SSR, never holds an auth cookie.** The account cookie is scoped to `konto.*`
  only. If the account face is down, the moat is unaffected (no shared runtime).
- **Auth is one act:** magic-link click verifies the email AND records double-opt-in consent.
  No PII in any URL (the `confirm-token` contract throws on email-shaped payloads). The session
  carries an opaque `person_ref` only — never email/name.
- **Storage homes:** email + consent → `amos_consent` (PII zone); saved package / interests /
  reminders / funding inputs → `amos_learner_package` (non-PII, outcome refs); funding
  enrichment → `amos_restricted` (never exported). Twenty = canonical person (bridged).
- **Thin face role:** bounded validate + token-gated forward (the `api/subscribe.js` pattern),
  hold a signed session, render. No scoring, no PII storage on the face.

---

## 2. Data flow (register → verify → sync → loop)

```
anon visitor builds package (mkval:pakett, localStorage)
  └─ "Salvesta / Loo konto" → konto.* : email + consent tick
        → POST (token-gated passthrough) → AMOS account-register (kind:account_created)
            • validate bounded envelope (lead_capture/v1: email, purposes, capture_site, outcome refs)
            • consent_records: double_opt_in = pending
            • mint magic-link token (purpose account_login; PII-free, HMAC, short expiry)
            • brand-sender emails the link
        ◄ "Kontrolli e-posti" (neutral, embargo-safe)
  └─ click magic link → konto.*/verify → AMOS opt-in/confirm (fail-closed)
            • pending → confirmed (DOI done)
            • person: Twenty upsert when live, else consent-ledger person (contact_ref null)
            • create amos_learner_package; ingest migrated package (outcome refs, NON-PII)
        ◄ signed session cookie on konto.* (HttpOnly, Secure, SameSite=Lax)
  └─ logged in: saved packages, reminders, notify-lists, funding profile
        → consented signals → AMOS build-next loop → rev-web worklist (staff)
```

Abandoned registrations leave only a `pending` consent row that expires — no person, no CRM
contact. The apex static site is never in this path beyond the existing thin `POST`.

---

## 3. MVP — 4 features (each reuses what exists; each yields identified demand)

| Feature | Persona pain | Reuses | Identified signal → AMOS |
|---|---|---|---|
| Account + saved-package **sync** | "built on phone, gone on laptop" | `mkval:pakett` + match (oskused/index.astro) | `account_created`, `package_saved` |
| **Deadline reminders** | "missed the registration window" | `/registreerimine/` + `src/data/dates.ts` | `reminder_subscribed` (programme/field + intake) |
| **Notify-lists** by field / skill / **combination** | "tell me when something for MY skill appears" | package-match `combo_size>1` (the unmet combo) | `field_subscribe` (identified) + **`combo_waitlist`** |
| **Funding-eligibility profile** | "who pays for ME?" | the site's "kes maksab" thesis | `funding_profile_set` → `funding_segment` |

**Migration (lossless):** on first login the face reads `mkval:pakett` + `mkval:interest:<slug>`
into a pending snapshot, fetches server state, **union-merges by stable key** (never
overwrite), writes back, then clears local only after the server confirms. `mkval:compare`
(sessionStorage, transient) is intentionally NOT migrated. localStorage stays a cache, so
logged-out / offline behaviour is unchanged. Merging local content implies no consent — consent
is the explicit DOI tick.

---

## 4. `api/subscribe` contract extension (the only mkval-relevant code change)

Extend the ratified `amos.outreach.lead_capture/v1` envelope **deliberately** (the contract is
designed to require an explicit enum addition) rather than forking it:
- Add account `kind`s: `account_created`, `package_saved`, `reminder_subscribed`,
  `funding_profile_set`, `combo_waitlist`.
- Reuse `ALLOWED_CONSENT_PURPOSES` (account signup is purpose-bound, not a blanket flag).
- Reuse the erasure shape (suppression-before-deletion) for account deletion.
- Add an `account_login` token kind to the `confirm-token` seam (short expiry; PII-free guard
  already enforced).

mkval-side: `api/subscribe.js` stays as-is for anonymous capture; account endpoints
(`/api/account/*`) are added **on the `konto.*` face** (thin validators + token-gated
forwarders over the same `AMOS_*` ingress), only once that face exists. One taxonomy, one
consent ledger, one erasure surface across anonymous + account capture.

---

## 5. The EVK intelligence + rapid-planning loop

Identified account signals (restricted) join the anonymous GA4 demand radar + the AMOS
catalog/labor feeds **inside AMOS** to produce a **build-next ranking**, scored by:
1. **Unmet-demand magnitude** — anonymous `package_match combo_size>1`, zero-result
   `outcome_search`, `demand_request`.
2. **Conviction** — identified `combo_waitlist` / `reminder_subscribed` (named people who will
   enrol); the anon→identified ratio is a confidence weight.
3. **Fundability** — `funding_segment` mix behind the demand (Töötukassa / employer / self).
4. **Supply gap** — scraped catalog: how few/no programmes cover the combination + competitor
   intake timing.
5. **Labor pull** — labor feed: openings + salary split + trend for the matched occupation.

Output: a ranked, evidence-backed list of which microcredentials the market needs next, each
with a **ready, consented launch cohort** (the waitlist) and a **funding story**. Because supply
is scraped continuously and demand is measured in real time, a gap is visible in days — a
capture landing page ships immediately, the programme follows. Speed of the loop is the moat.

---

## 6. GDPR + governance (non-negotiable)
- **Double-opt-in** at signup; one `consent_records` row per purpose with text version + DOI
  evidence. Rights (access / export / rectify / erasure / withdraw) served by the face → AMOS.
- **Erasure cascade (suppression-first):** suppression tombstone (`email_hmac`) → mark consent
  erased → delete `amos_learner_package` → erase/anonymize Twenty person → revoke sessions.
- **Withdraw ≠ delete:** withdraw flips consent + adds suppression (no more email); the account
  can still exist; returning to mailing needs a fresh DOI.
- **EU-hosted; AMOS = restricted-zone master; no third-party CIAM.** Account auth is a
  functional necessity, separable from the analytics-storage consent (banner stays).
- **Public vs identified:** identified data never leaves the restricted zone; anything surfaced
  publicly (provider dashboards, market report, "N waiting") is **aggregate + k-anonymised**.
- **Embargo:** no account feature, email, or copy may state or imply that Ettevõtluskeskus has
  (or is about to have) its own mikrokvalifikatsioon until the owner lifts the embargo. The
  funding profile captures the *learner's* eligibility and matches *third-party* catalog only;
  demand capture stays the neutral form ("Anna teada / teavitame, kui Eestis lisandub sobiv
  programm või kombinatsioon") — which is also the mechanism to email a consented cohort the
  moment any matching programme is added to the register.

---

## 7. Phased roadmap
- **MVP (Account v1):** the 4 features above. Deps: shared spine + magic-link + AMOS account
  store (Twenty bridge). No labor feed needed.
- **B — retention:** monthly "new programmes" digest (funding-segmented), reminder lead-time
  prefs, application tracker (`application_status`).
- **C — personalization:** "for you" feed (`recommendation_clicked`), ROI-personalized cards.
  Deps: AMOS labor feed + catalog v2 (`instances[]`, `skillTag`).
- **D — ecosystem/B2B:** provider self-service (claim + aggregate demand), employer shortlist/
  cohort + org ROI, researcher API keys + citation kit + trends. Deps: Twenty live + labor feed.

---

## 8. Privacy-page update (applied when the account ships — publishing gate)
Add a section to `src/pages/privaatsus/index.astro`: what the account stores (email + consent
in the EU AMOS zone; saved packages as non-PII outcome refs), the magic-link model (no
password), EU hosting, and **self-service rights** at `konto.*` (access / export / delete /
withdraw) alongside the email fallback. Owner sign-off required before publishing.

## 9. Success metrics
- **Registration:** `account_created`/week; rate = accounts ÷ package-builders; lossless-merge rate.
- **Retention:** reminder/digest subscribers, open/CTR, returning logged-in users (W1/W4),
  reminder-attributed detail visits.
- **Identified demand:** `package_saved` / `reminder_subscribed` / `combo_waitlist` /
  `funding_profile_set` volume; **identified-to-anonymous ratio per gap**; `funding_segment` mix.
- **Demand → publish speed (the moat number):** days from gap detected → a ready consented
  cohort exists; launch-cohort conversion (`application_status` ÷ waitlist).

## 10. Cross-repo execution (tracked here, built elsewhere)
- `konto.*` brand-face app on the shared spine (SSR, noindex, magic-link, session, CSRF).
- AMOS: account endpoints, consent + package stores, the `account_login` token kind, the
  build-next loop, the rev-web worklist surface; Twenty standup (owner-gated) for the person home.
- mkval repo near-term: this brief, the contract-extension spec (§4), the privacy-page spec
  (§8), BACKLOG. No account logic in the static site.
