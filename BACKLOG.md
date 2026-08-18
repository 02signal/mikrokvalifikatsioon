# Mikrokvalifikatsioon.ee Backlog

## Resume point — 2026-08-18 (current)

**LKG snapshot refresh is now automatic (proposal-only).** The last manual step in the
catalog-withdrawal mechanism — a human copying the AMOS release's `catalog-feed.json` +
`catalog.cc.jsonld` + `cc-projection-receipt.json` into
`src/data/catalog/credential-commons-lkg/` after AMOS measures a withdrawal — is now done by
`.github/workflows/lkg-refresh.yml` (daily + `workflow_dispatch`), which calls
`node scripts/verify-lkg-refresh.mjs`. It fetches the published AMOS bundle, verifies it by
REUSING the site's own real gates (contentHash, CC graph/receipt pairing, non-regression +
`retired[]` identity — see that script's header), and only if verified AND different from
today's committed snapshot writes the three files, regenerates `vercel.json`, runs the test
suite + build, and opens/updates a PR on branch `automated/lkg-refresh`. **It never merges.**
Local proof: ran against the real live release
(`https://status.amos.02signal.com/mkval-catalog/catalog-feed.json` etc.) — verified clean,
`changed=false` (today's committed snapshot is already current). 8 new sandboxed tests in
`scripts/verify-lkg-refresh.test.mjs` cover both the accept and reject paths.

- **FOLLOW-UP (owner/ops, no code):** the workflow's `gh pr create`/`gh pr edit` step needs the
  repo setting **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to
  create and approve pull requests"** enabled — off by default, and `permissions:
  pull-requests: write` in the workflow YAML does not substitute for it. Until that box is
  checked, the PR-open step will fail even though verification itself is correct; the failure
  will say something like "GitHub Actions is not permitted to create or approve pull requests."
  Not verifiable from a worktree (no `gh`/deploy access here) — needs a human with repo admin.

## Resume point — 2026-07-29 (current)

**Lead capture is LIVE and works for real people.** The koolitaja `SubscribeForm` (PR #98, refined by
#99/#100) posts pattern-B to Listmonk **list 13** `d1615885-494d-42b7-b2e1-c51ec2530893` (public,
double opt-in) + newsletter `71669060-5e8e-4473-a2d5-0e0c92806077`. Verified end-to-end (POST → HTTP
200 → "Confirm subscription" mail accepted by Resend). **Listmonk SMTP had regressed (535) and was
re-fixed** with a fresh ettevotluskeskus Resend sending key — this also unblocked all EVK Listmonk
email (newsletter, konto magic-link).

**Follow-ups discovered this session:**
- **Welcome-email on confirm (owner wants "enter → confirm → GET the checklist"):** today confirm only
  adds the person to the list; nothing is auto-delivered. There is no welcome campaign on list 13, and
  the opt-in mail uses Listmonk's GLOBAL default template (per-brand content there is not clean). PLAN:
  a separate welcome email to newly-confirmed list-13 subscribers, deliverable = links to the existing
  public guide pages (/koolitajale/hinnastamine, /turule-toomine, /eneseanalyys, /kvaliteedihindamine);
  PDF optional later. Mechanism = a small list-13 trigger (AMOS n8n-ops or host poller) sending a new tx
  template. AWAITING owner pick (links vs PDF). Note: those checklists are already public pages.
- **Twenty provider layer** + **info@evk per-lead signal** — still pending (AMOS-side; owner gate off).
  Listmonk already fires a built-in admin notification on subscribe, which could feed info@evk with a
  recipient config — but that is global/noisy, so a per-list signal via the AMOS producer is cleaner.
- **OG/GEO gaps:** the 8 new koolitaja/HAKA answers in `src/data/questions/index.ts` have NO `figure:`,
  and the 5 koolitaja pages (hinnastamine, turule-toomine, eneseanalyys, kvaliteedihindamine,
  kuidas-ehitada) have NO `ogImage`. The `astro-og-canvas` + `scripts/rasterize-diagrams.mjs` pipeline
  already exists — just add self-contained SVG diagrams + wire `figure:`/`ogImage` (auto → 1200×630
  og.png). Cross-repo visual plan with sample cards (CC "two trees", mkval "HAKA hindab asutust", mkval
  "payback"): artifact `https://claude.ai/code/artifact/048e1849-edb9-4047-b395-26c82b153d82`. Priority
  P2 here (the CC og:image foundation is P1, tracked in the credential-commons repo).

## Next steps (resume point — 2026-06-29)

The konto unified-account + brand + email are all LIVE end-to-end (see the 2026-06-29 entry under
"Done"). Remaining items, none blocking — most are owner/ops actions, not code:

**Owner / ops (no code change):**
1. **GSC Q&A warnings** — GSC flags 8 `/vastused/<slug>/` URLs for missing QAPage fields, but the live
   pages are already `FAQPage` (verified 2026-06-29; stale 25-Jun crawl). FIX: in Search Console →
   URL Inspection → **Request indexing** on the 8 `/vastused/` URLs (or just wait for re-crawl). No code.
2. **Match-notify emails** — detection deployed (AMOS #1342); to make "udue match → teade" emails send,
   Codex/ops must schedule the `konto-delta-notify` worker + set `OUTREACH_SEND_MODE=live` + enable the
   feature-flagged `sendKontoSubscriptionMatched`.
3. **DMARC** — add TXT `_dmarc.mikrokvalifikatsioon.ee` = `v=DMARC1; p=none; rua=mailto:postmaster@mikrokvalifikatsioon.ee` (DNS).
4. **Revoke** the old 02signal Resend key (fingerprint `e74421da263f`) in that account's dashboard.

**Dev follow-ups (when wanted):**
5. Apply the animated `Logo` at the konto save-confirmation moment ("Sinu valikud on hoitud") — strongest brand moment.
6. Self-host Sora (woff2) instead of the Google Fonts link in `Seo.astro`.

**Lead capture — 2026-07-18 (site done, owner switches pending):**
10. **Done 2026-07-18** — audit found the main lead forms captured nothing (unset
    `PUBLIC_SITE_LEAD_WEBHOOK_URL` → silent `mailto:` fallback). Migrated all 6 forms
    (suunatest, kataloog demand, valdkond, kataloog/[slug] interest, en, koolitajale) to the
    ratified `/api/subscribe` → AMOS ingress; `b2b_koolitus`+`b2b_outreach` for the provider
    contact. See `docs/lead-capture-go-live-runbook.md`. No regression until AMOS on.
11. **Owner/ops go-live (blocks real capture):** set Vercel `AMOS_TOPIC_CAPTURE_URL` +
    `AMOS_CAPTURE_TOKEN`; un-gate AMOS ingress; provision Listmonk lists + Twenty
    `personbrandisuhted`. Details in the runbook.
12. **AMOS code (Codex):** map `topic_subscribe`→learner and `b2b_koolitus`→b2b_buyer/provider
    role in `service.mjs` `ACCOUNT_KIND_MAP`; per-topic Listmonk lists; enable `OUTREACH_SEND_MODE`.
13. **GA nicety:** `lead_form_start` uses one hardcoded `form_name` (`Analytics.astro`) — make it
    per-surface so start events attribute to the right form.
14. **mkval koolitaja checklist (2026-07-28):** the two checklist pages use one dedicated
    Listmonk double-opt-in trainer/provider audience. The required checkbox maps exactly to
    `newsletter`; the visible promise is bounded to provider guidance and does not imply a
    second/general newsletter. The earlier optional general-list/course-offers mismatch was
    removed before activation. `lead_form_submit_attempt` is honest click intent; confirmed
    membership is measured in Listmonk. AMOS owns the 15-minute confirmed→Twenty
    `provider/prospect` projection. Per the owner's 2026-07-28 decision, AMOS also emits one
    idempotent post-confirmation attention email to `info@ettevotluskeskus.ee`; FreeScout may
    surface that email, but Twenty remains the durable CRM and no duplicate contact is created.

**SEO/GEO — CTR uplift 2026-07-16 (done + follow-ups):**
7. **Done 2026-07-16** — 28-day GSC review found page-1 impressions with near-zero clicks (title/snippet
   problem, not ranking): `/koolitaja/tartu-ulikool` 270 impr @ 0.74%, `/koolitaja/taltech` 94 @ 1.06%,
   `/vastused/mis-on-eap` 141 @ 1.42%. Rewrote titles/meta to lead with programme count + concrete
   EAP/price facts; added per-question `seoTitle` (mis-on-eap now answers in the title); de-jargoned the
   `/mikrokraadid/` hub title; added EAP-hours + duration canonical answers to `llms.txt` (GEO). Commit
   `seo: lift CTR on provider, EAP and hub pages`. **Measure again after next GSC window (~2026-08-13).**
8. **Position follow-up (content depth):** several high-intent queries rank poorly on thin/near-miss pages —
   e.g. "finantsjuhtimine" pos 52, "tootehaldus" pos 79, "küberturvalisus" pos 88, "haridusjuhtimine" pos 8.5
   (page-1 but 0 clicks). Consider dedicated field/topic depth or intro copy where a matching page is thin.
9. **Irrelevant-query noise:** job-board queries ("tööpakkumised hiiumaal/põlvamaal" etc) leak impressions via
   `/maakond/*` pages — confirm these pages serve *learning+labour context*, not job listings, so intent matches.

Cross-repo note: mkval deploys on merge→main (Vercel); the AMOS konto backend deploys are host-side
(Codex). AMOS is a busy multi-agent repo — check `origin/main` before building backend features (a
parallel-build collision already happened: my #1341 closed in favour of Codex's #1342).

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

> **Status: LIVE 2026-06-26 — CL-1…CL-5 SHIPPED; the retention loop (CL-3 incl. send) is CODE-COMPLETE.**
> The konto account is in production (API at `liitu.mikrokvalifikatsioon.ee`, face on the apex, send-mode
> live): phrase a skill your way → ~5-outcome packages → several named packages → magic-link login →
> server-computed match ("Sind huvitab") → delete (full GDPR erasure). Hardened (single-use + latest-link
> magic-link, `/state` rate-limit, POST-only verify); the delta-notify worker now **detects → queues →
> advances → SENDS** (gated, consent-respecting) the "your match improved" email.
> **Remaining = owner config to turn the send ON** (Listmonk template + cron + `OUTREACH_SEND_MODE`) +
> **CL-6** (invitation) + the bigger non-package features (P4) and the owner build-next surface (P5).
> Full map: `docs/account-system-status-and-todo.md` + the AMOS ADR
> `docs/architecture/amos-outcome-package-and-learner-identity-adr.md` (Implementation status).
> Owner direction 2026-06-25: get the **core loop flawless** before any virality — the account's worth is
> **"see mõistab mu sõnu ja jälgib mu eest"**, not (yet) "invite others" (CL-6 / growth Phase 2).

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
| **CL-5** Flawless login → "Sind huvitab" landing | konto face (cross-repo, on the spine) | Magic-link login end-to-end (no PII in URL); first view = plain-Estonian "Sind huvitab" (your packages + current best match + any pending notice), **not** an empty dashboard. Logged-out site 100% functional; apex stays static. Owner-gated publish (privacy section + embargo check). **Also: konto must union ALL `mkval:paketid` packages into the account** — today the legacy mirror carries only the *active* package, so the account CTA was scoped to "this package" (deferred from CL-4 to avoid expanding the konto placeholder). | CL-3 + CL-4 + shared spine |
| **CL-6** Invitation / "küsi koos" (Phase 2) | mkval face + AMOS | **Later — explicitly not started now.** Once a person has a package they care about and the match actually changes, the share / collective-demand mechanic (invite others who want the same combo → faster build + shared launch cohort) gains real pull. The identity/consent spine (AMOS #1169) can carry referral attribution; the user-facing referral *value* is this slice. | CL-1..CL-5 |

**Sequence:** **CL-1 + CL-2 now** (mkval, logged-out, PII-free, improves the public moat
immediately) → **CL-4** then **CL-3** (AMOS store, then the diff that needs it) → **CL-5** (konto
face, owner-gated publish) → **CL-6** later. **GA4:** reuse `outcome_search`/`view_search_results`
(now synonym-expanded), `outcome_add`/`package_view`/`package_match` (`combo_size>1` = build-next),
the `lead_capture/v1` account kinds (`package_saved`/`reminder_subscribed`/`combo_waitlist`); add
`match_changed` when CL-3's notice renders. **Verify each slice:** logged-out fully functional,
apex static, build green, no own-programme implication, warehouse PII-free by construction.
Cross-refs: `docs/amos-account-layer-plan.md`, `docs/mkval-growth-plan.md` (Phase C).

**Implementation status (2026-06-26):** ✅ **CL-1, CL-2** (mkval) · ✅ **CL-4** (mkval + AMOS store, incl.
the multi-package union into the account) · ✅ **CL-5** (konto spine + face, live) · ✅ **CL-3** (AMOS
delta-notify: detect → queue → advance → gated consent-respecting **send**, code-complete — owner turns
the send on via the Listmonk template + cron + send-mode). ⬜ **CL-6** (invitation / "küsi koos") — not
started, by design. AMOS PRs: #1190/#1197/#1200/#1205/#1209/#1225/#1226/#1232. mkval: #42/#43/#44/#46.

## Done

- 2026-06-29: **Brand identity site-wide + konto unified-account + email pipeline, all LIVE end-to-end.**
  (1) **Design system "pragmaatiline liikumine"** rolled out across the whole site (global.css token remap +
  shared components + logo kit + `docs/brand-manual.*`; favicon/OG/EN-logo from the SVG kit) — mkval #57-#61.
  (2) **Email fixed:** magic-link delivers. Root causes, in order: stale send-wrapper + Listmonk tx-cache
  (Codex redeploy/restart); then Listmonk SMTP was using the **wrong Resend account** (02signal, domain
  unverified) → switched to the ettevotluskeskus-account key `amos-listmonk-evk-smtp`; then the magic-link
  pointed at the API host `liitu.` (404) → now built from the **apex** via `OUTREACH_KONTO_FACE_BASE_URL`
  (AMOS #1324). Erasure endpoint ownership-gated (AMOS #1334). DNS for mikrokvalifikatsioon.ee verified in Resend.
  (3) **Konto unified-account** ("sinu e-post on sinu keskus"): account in nav + value, login-aware CTAs,
  distinct Logi sisse/Liitu flows, masked email shown, skills reprioritise(weight)+single-delete,
  subscriptions (field/funding/programme_reminder/skill) round-trip via `amos_crm.package_subscription`,
  `/state` returns `{email_masked, subscriptions, packages}`, confirmation-gated unsubscribe. mkval
  #62/#63/#64/#65; AMOS #1335 (state contract) + #1342 (subscription CRUD + match-notify detection; my
  duplicate #1341 closed). Frontend↔backend contract reconciled (kind enum, target_ref grammar, `{ref}`).
  **Pending follow-ups:** match-notify *emails* (detection deployed; sends need the delta-notify worker
  scheduled + `OUTREACH_SEND_MODE` live + the feature-flagged `sendKontoSubscriptionMatched`) · add a
  **DMARC** TXT for mikrokvalifikatsioon.ee (`v=DMARC1; p=none; rua=mailto:postmaster@mikrokvalifikatsioon.ee`)
  · revoke the old 02signal Resend key (fingerprint e74421da263f).

- 2026-06-26: **Konto account LIVE + the retention loop code-complete.** The account went to production
  (login API `liitu.mikrokvalifikatsioon.ee`, face on the apex, `OUTREACH_SEND_MODE` live) and this round
  finished the remaining slices, each built by a team of agents + adversarially reviewed + gated.
  **CL-5 spine + face** (#1197/#43): magic-link login/verify/state/sync + the konto face (real path behind
  `PUBLIC_KONTO_API_BASE`, demo fallback). **Live MATCH** (#1209/#46): konto computes + shows each package's
  server-side fit ("Sind huvitab"). **Security hardening** (#1225): single-use + latest-link-only magic-link
  (new `amos_crm.konto_login_nonce`), `/state` rate-limit, POST-only verify. **Full-PII delete cascade**
  (#1225): account-delete erases the PII zone too (person_ref → email_hmac → suppression-first erasure).
  **CL-3 delta-notify** (#1226 + #1232): a scheduled worker detects a genuine match improvement → queues a
  PII-free `konto_match_improved` job → advances the baseline (idempotent) → **sends** a gated,
  consent-respecting email (token-free link; address resolved transiently from a confirmed, non-erased
  envelope; copy in the owner's Listmonk template). Plus the GSC Q&A fix (QAPage → FAQPage, #47) and the
  build-unbreak (browser-safe pure-JS sha256 outcome-ref, #44). Warehouse PII-free by construction (SQL
  CHECK on every text column). Status maps: `docs/account-system-status-and-todo.md`,
  AMOS `KONTO-LIVE-OPS.md` + the learner-identity ADR (Implementation status). **Remaining = owner config**
  (turn the send on) + CL-6 + P4/P5.
- 2026-06-25: **CL-4 (mkval-half) — multiple named packages on `/oskused/`.** Built by a team of agents (pure data module + tests · UI wiring · cross-page audit), adversarially reviewed (one blocker caught + fixed), integrated by hand. New pure `src/lib/packages.ts` (`PackagesState` v2: N named packages, one active; non-mutating, ids/timestamps injected) + `scripts/packages.test.mjs` (26 tests). `/oskused/` now keeps several named target profiles in localStorage — `mkval:paketid` is the source of truth; the **active** package is mirrored to legacy `mkval:pakett` so `/konto/` keeps working unchanged. Plain-Estonian switcher (Uus pakett / Nimeta ümber / Kustuta pakett). **Lossless** migration from the old single package (the `migrateLegacy(legacy, null, …)` path); first add auto-creates "Minu pakett 1"; "Tühjenda see pakett" empties only the active package; delete disabled at the last package; future-version store not clobbered. Package **NAMES stay local** — never sent to GA4 or `/api/subscribe` (additive count-only params `package_count` + new `package_switch`/`package_create`/`package_delete`). Account CTA scoped honestly to the active package; full multi-package→account **union sync deferred to CL-5**. Build green (440 pages, 41/41 tests). Logged-out, PII-free, embargo-safe.
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

- **Code-ready 2026-07-31 — explicit AMOS programme-id lineage (AMOS #2613):**
  the redirect generator prefers validated v2 `previousIds[]` +
  `lineageDecisionRef` over name-based inference and fails closed on self,
  active-id, duplicate, or cross-programme collisions. Old feeds keep the
  existing ledger/inference fallback. A generator-level regression proves an
  explicit alias wins a conflicting inferred alias. **Rollout remains
  separate:** enable only with the corresponding AMOS v2 producer release and
  owner-approved consumer deploy gate; no production deployment was performed.
- **Done in code 2026-07-24 — canonical Credential Commons consumer:** human pages
  remain on the trusted feed, while `/catalog.cc.jsonld` now mirrors a receipt-bound
  warehouse graph. The committed default is now a coordinated feed+graph+receipt
  pair; canonical AMOS `program.id` values are the public slugs. Remote use is
  opt-in and fails the build (rather than mixing generations) when timeout,
  content-type, hash/profile/run/feed identity checks fail. **Ops follow-up:** set
  the three `PUBLIC_CATALOG_CC_*` Vercel variables only after the AMOS public release
  URLs are live; then verify graph and receipt against the same weekly feed generation.
- **Gap audit (2026-07-01):** the catalog is a static, manually-committed snapshot (last data
  commit `55ae782`, 2026-06-24; the on-page "kontrollitud" date is hardcoded `2026-06-12`).
  `PUBLIC_CATALOG_FEED_URL`/`PUBLIC_CATALOG_FEED_TRUSTED` are unset everywhere on this side, so
  every build falls through to the committed fallback.
- **Re-investigation (2026-07-01, deeper):** the AMOS-side pipeline (source refresh → Groq review
  → public feed → `https://status.amos.02signal.com/mkval-catalog/catalog-feed.json` → Vercel
  Deploy Hook → readiness audit) turned out to be **fully built and code-complete** — it was simply
  never switched on host-side. The one genuine code gap was that nothing in it wrote to a relational
  warehouse (every artifact was a file). That gap **shipped 2026-07-01** in AMOS
  (`amos_registry.mkval_catalog_programme` / `_change_history` / `_intake_event`, see
  `PBI-MKVAL-DATA-002` in AMOS `BACKLOG.md`). Change-history rows reuse AMOS's existing bounded,
  privacy-safe descriptor (a `change_kind` + a short clamped `detail`) — **never raw marketing
  text**; intake-event rows store raw observed dates only, cadence is a SQL query over them, not a
  precomputed "popularity score".
- **CONFIRMED LIVE 2026-07-06.** Owner/Codex completed the activation checklist between 2026-07-02
  and 2026-07-03 (Vercel Deploy Hook created, `/opt/amos/secrets/env/mkval-catalog-pipeline.env`
  populated, `source-registry.json` provisioned, weekly systemd timers enabled — Monday 03:15
  source-refresh → 03:32 review → 03:45 catalog-refresh, per the runbook). Verified end-to-end via
  Vercel build logs, not just config presence:
  - 2026-07-02 09:35 EEST build: `PUBLIC_CATALOG_FEED_URL` set but `PUBLIC_CATALOG_FEED_TRUSTED!=1`
    → still fell back to the committed snapshot (169 programmes) — activation in progress.
  - 2026-07-03 10:54 EEST build: `[catalog] usaldatud AMOS feed: 250 programmi` — first successful
    trusted-feed build.
  - 2026-07-06 (Monday) 03:46 EEST: a fresh production deploy landed 1 minute after the documented
    03:45 catalog-refresh timer — the weekly automatic cycle firing on schedule, independently
    confirmed (not a manual push). Live `/catalog.json` and the AMOS feed both report 250
    programmes.
  **Cadence going forward: weekly, Monday ~03:15–03:46 Estonia time** (systemd timers, not the
  n8n daily-cron alternative).
- **Warehouse-apply also confirmed 2026-07-06** (EX63 host read-only check, relayed via AMOS
  `BACKLOG.md` PBI-MKVAL-DATA-002): `amos_registry.mkval_catalog_programme=250`,
  `mkval_catalog_change_history=687`, `mkval_catalog_intake_event=198` (plus a
  `mkval_catalog_learning_outcome=707` table added on the AMOS side since). The relational warehouse
  is genuinely populated, not just planning dry-runs — `PBI-MKVAL-DATA-002` is fully closed end to
  end (file feed + Vercel + Postgres). Only a non-blocking observability nit remains on the AMOS
  side (a missing job-report file for non-SSH visibility). The committed JSON snapshot in this repo remains the manually
  -maintained fallback/floor — it is intentionally NOT part of the automatic loop and last changed
  2026-06-24; that is expected, not a regression.
- **Done 2026-07-13 — truthful "kontrollitud" date (checkedAt no longer freezes).** Root cause of
  the stuck `checkedAt` (observed frozen at 2026-07-02 across two weekly cycles): the feed's
  `checkedAt` was DERIVED as `max(record.sourceCheckedAt)`, and a record's `sourceCheckedAt` only
  advanced when it was re-promoted (i.e. when it CHANGED). On a no-change week the AMOS approved
  store was not rewritten, so the date meant "last content change", not "last check". Fixed in AMOS
  (`fix/mkval-checkedat-truthful-run-date`): the promote step now rewrites the approved store every
  cycle stamping a run-level `checkedAt`; the catalog-refresh threads it into the feed; and the feed
  now carries TWO distinct dates — `checkedAt` (last verified against schools, advances weekly) and
  new `dataUpdatedAt` (last content change). Because `checkedAt` is in the content hash, a no-change
  week now flips the hash → deploy hook fires → the site rebuilds and shows a fresh "Kontrollitud"
  while honestly reporting 0 programme changes. Site consumer (`src/data/catalog/index.ts`) now
  sources "Kontrollitud" from `checkedAt` and "Andmestik uuendatud" from `dataUpdatedAt` (falls back
  to `generatedAt` for older feeds). E2e-proven: two no-change weeks → checkedAt 07-06→07-13,
  dataUpdatedAt stays 06-12. This closes the observability nit noted below (staleness was invisible
  because "checked" and "changed" were conflated).
- **Site-side hardening shipped 2026-07-01 (this repo):** `src/data/catalog/index.ts`'s
  `chooseCatalogSource` now also rejects a trusted feed with an unknown `schemaVersion`, a `count`
  that disagrees with `programs.length`, or any forbidden field (email/token/secret/raw_html/…) —
  closing the gap between what `docs/data-pipeline.md` specified and what the code checked. These
  gates only reject a *present-but-wrong* value, so the existing pinned stale-feed-bug tests in
  `scripts/catalog-floor.test.mjs` are untouched; four new tests cover the added gates.
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
  8. **DONE 2026-07-01 (AMOS):** change-history log — `amos_registry.mkval_catalog_change_history`,
     append-only, one row per detected marketing/positioning change (name/summary/goalText/
     outcomes/ects/priceText/durationText), reusing the existing bounded privacy-safe descriptor
     (never raw text). See AMOS `BACKLOG.md §2026-07-01`.
  9. **DONE 2026-07-01 (AMOS):** intake-date cadence fact — `amos_registry.mkval_catalog_intake_event`,
     append-only observed intake/instance dates; cadence is a SQL aggregate over this table, not a
     precomputed score.
  10. **DONE 2026-07-01 (this repo):** site-side defense-in-depth (`schemaVersion`/`count`/
      forbidden-key checks in `chooseCatalogSource`, §above). **DONE + CONFIRMED LIVE 2026-07-06:**
      the deploy-hook trigger is active and running weekly (Monday ~03:15–03:46, see §above) —
      basic robustness (fail-closed non-regression guard + committed-snapshot fallback) was already
      in the code and is now proven against real weekly cycles. Monitoring/alerting on staleness and
      an automatic rollback-on-failure are not yet built — worth a small follow-up once the weekly
      cycle has run a few more times, but not blocking (a failed AMOS run today just leaves the
      previous build live, per the fail-closed design; it does not need to be attended in real time).
- Done: `license` (CC BY 4.0) added to Dataset schema (homepage + /andmed/) — fixes Search
  Console "Missing field 'license'". (Owner may change the licence.)

## Search Console housekeeping
- Phantom URLs from a PREVIOUS site on this domain (HiStudy LMS demo: /courses/, /en/courses/,
  /ru/courses/, ~10 YouTube-embed "videos", queries like "client/server model", "react",
  "histudy") are indexed but now 404. They self-de-index; optionally speed via GSC Removals.
  Not our pages — no code action needed. Watch that no REAL page sits in 404/5xx/noindex buckets.

## Next

- **Price plausibility guard — extend to remaining aggregate surfaces (found while fixing AMOS #2613).**
  `src/data/priceGuard.ts` (`plausiblePriceEur`) now protects the "hind" diagram, `/teema/` + `/valdkond/`
  price ranges, `questionStats.price`, the affected programme's OG card, and JSON-LD `offers` from the
  known bad TLÜ price (75 € for 30 EAP — AMOS #2613/#2614, human review stays authoritative, so this
  value keeps shipping in the feed). NOT yet applied to a few other aggregate price-range surfaces that
  are the same class of "claim" and would show the same contaminated floor: `aastaraport/index.astro`,
  `andmed/index.astro`, `koolitaja/index.astro` (per-provider row ranges) and `koolitaja/[slug].astro`
  (Tallinna Ülikool's own aggregate page would show min 75 €). Left out of this pass to keep the diff
  scoped to the task's named surfaces — swap their `parsePriceEur` calls for `plausiblePriceEur` the same
  way when touched next. Do NOT touch `catalog.json`/`llms-full.txt`'s per-entry `priceText` (verbatim
  register mirror, same exception as the programme page body) or `oskused`/`konto`'s client-side
  per-entry price display.
- **Konto — turn the match-improved send ON (owner config, no code).** Create the Listmonk template +
  set `LISTMONK_KONTO_MATCH_IMPROVED_TEMPLATE_ID` (embargo-safe/neutral copy — "lisandus sobiv programm/
  kombinatsioon", never EVK's own; the code passes only `konto_url` + bounded counts); schedule
  `node infra/scripts/konto-delta-notify.mjs` (after each projection rebuild / daily) with the Listmonk
  creds + `OUTREACH_KONTO_COVERAGE_PROJECTION_PATH` + `OUTREACH_CAPTURE_PUBLIC_BASE_URL`; then
  `OUTREACH_SEND_MODE` allowlist → live. See AMOS `KONTO-LIVE-OPS.md`.
- **Konto — possible developments** (see the ADR Implementation status + `docs/account-system-status-and-todo.md`):
  dedicated `OUTREACH_KONTO_TOKEN_SECRET` (key separation, cheapest now at ≈0 sessions); a *separate*
  explicit "match-notify" opt-in (today the gate is "confirmed subscriber"); **P4** non-package features
  (reminders, notify-lists incl. the **combination** "küsi koos" seed, funding-profile — server-backed);
  **P5** owner build-next intelligence surface (rev-web); **CL-6** invitation. A real end-to-end login
  smoke (owner's email) to seed `learner_package`; remove the stray Vercel project `mkval-konto-prod-deploy`.
- Verify and complete the first data wave — **substantially done 2026-06-24 (#14, source-verified pass)**: 162 fields filled across 86 records, 77 programmes now have a registration deadline. Residual: assessmentText (70, mostly genuinely unstated), outcomes (34), durationText (26), format (16). Next pass: re-fetch the records the finder didn't propose a price for (some pages state a price that wasn't captured), and consider a "Maht (tunnid)" field for the contact/self-study hour-load.
- ~~Töötukassa facts on /kes-maksab/~~ — dropped 2026-08-04: naming Töötukassa as a funding route for free-market training is not permitted (see "Funding copy" rule in CLAUDE.md).
- **SEO/GEO audit follow-ups** (deferred from #17; the team audit's exact specs are captured — high→low): (1) **Article `publisher.logo` + `image`** on the 6 Article pages (mis-on, kes-maksab, aastaraport, mikrokraadid, koolitajale, kvaliteedihindamine) — swap their inline bare Organization node for the shared `organizationSchema.ts` (logo'd) + add `image` (the generated `/og/<key>.png`); makes them Article-rich-result eligible. (2) **Dataset `DataDownload` distribution** on the homepage Dataset (→ `/catalog.json`), a new `kuidas-koostame` Dataset (→ `/site-profile.json` + `/llms-full.txt`), and the karjaar labour Dataset (real `andmed.eesti.ee` URL or drop) + ISO-interval `temporalCoverage`. (3) **Hub ItemLists**: `mikrokraadid` directory + `oskused` `CollectionPage.mainEntity`. (4) **WebSite+SearchAction** on the homepage (add `@id`) + `kataloog` (canonical search page). (5) Low: `privaatsus` JSON-LD graph; `CollectionPage`/`DataCatalog` typing + `spatialCoverage`/`keywords` on data pages; GEO `speakable`/`DefinedTermSet` on definitional pages. (OG is otherwise fully wired — the old "none exist" note was stale.)
- **Brand follow-ups** (from the brand-manual + logo work, `docs/brand-manual.md`; logo evolved to
  the v3 "pragmatic momentum" mark, old logo preserved as `public/logo/old_*.svg`): (1) apply the
  animated `Logo` at the konto save-confirmation moment ("Sinu valikud on hoitud") - the strongest
  brand moment per the manual, deliberately not done yet to avoid over-applying; (2) **DONE
  (2026-06-28):** favicon (`favicon.ico` + `icon.png`), `logo-square.png` (JSON-LD) and OG-card logo
  (`og-logo-white.png`, swapped in `og/[route].ts`) now rasterised from the v3 SVG kit via
  `scripts/gen-brand-rasters.mjs` (re-run when the SVGs change); old `mk-logo*.png` kept but
  unreferenced by live code; (3) **DONE (2026-06-28):** EN homepage now uses the `Logo` component;
  (4) consider self-hosting Sora (woff2) instead of the Google Fonts link now added in `Seo.astro`.
- Private-provider entries (3-4 known) once their public pages are verified.
- mikrokvalifikatsioonid.ee → 301 to /kataloog/ (DNS/Vercel config, owner-gated).
- Lead webhook + email list backend (family pattern, PUBLIC_SITE_LEAD_WEBHOOK_URL).
- Until the AMOS feed is live: keep the weekly catalog freshness re-check loop (intakes
  change) and add a `roundsCheckedAt`-style stamp to catalog.json or the future feed.
- Owner-gated future item: see CLAUDE.local.md.
