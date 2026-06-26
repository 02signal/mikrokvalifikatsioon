# Konto (account) system — state + the remaining owner / Codex work

The master map of the account-value workstream: what is **built and merged**, what the
**owner** must do to go live, and what **Codex / dev** should build next (prioritised).
Companion: `docs/konto-go-live-runbook.md` (the exact go-live commands).

---

## 1. DONE — built, tested, merged (code-complete v1)

A learner can: phrase a skill in their own words → build ~5-outcome packages → keep
several named packages → (with the flag on) log in by magic-link → their packages persist
server-side, cross-device → see "Sind huvitab" → delete the account. Logged-out is untouched.

**mkval** (`mikrokvalifikatsioon`):
- CL-1 synonym/proximity skill search + CL-2 ~5-outcome builder frame (#36)
- CL-4 multiple named packages (`9a92ed6`)
- Antigravity OG bg + hero (#37) + category marks (#39); vastused hero contrast fix (#41)
- **OPK-S4** deterministic `out_` refs + skillTags for every catalog outcome (#42)
- **Konto face** wired to the real API behind `PUBLIC_KONTO_API_BASE`, demo fallback (#43)
- Browser-safe `outcome-ref` (pure-JS sha256, pinned to AMOS) + **account-delete** (#44)

**AMOS** (`02S-AMOS`):
- **CL-3** `amos_learner_package` PII-free store + identity keystone reuse (#1190)
- **CL-5** konto spine: magic-link login + session + state + sync (#1197)
- Gated magic-link **email send** + dedicated konto token secret (#1200)
- Konto **account-delete** endpoint (#1205)

PII posture (by construction): the warehouse holds only opaque refs + banded coverage; the
face sends only `email` (to login) + `out_`/`package_ref` + the session — **names and outcome
text stay in the browser**, never sent. Cross-person package overwrite (IDOR) is fixed +
regression-tested. The magic-link **send is gated** (`OUTREACH_SEND_MODE=disabled`) — nothing
is emailed until the owner flips it.

---

## 2. OWNER — go live (config + deploy, no code; see the runbook)
1. Apply `infra/sql/2026-06-25-learner-package.sql` on the prod Postgres (idempotent).
2. Secrets: `OUTREACH_SUPPRESSION_PEPPER`, `OUTREACH_CONFIRM_TOKEN_SECRET`, `OUTREACH_KONTO_TOKEN_SECRET`.
3. Create the konto magic-link Listmonk template → `LISTMONK_KONTO_MAGIC_LINK_TEMPLATE_ID`.
4. Deploy the AMOS outreach-capture service; expose `/api/konto/*` via Caddy at a public host.
5. `OUTREACH_SEND_MODE`: `disabled` → `allowlist` (test) → `live`.
6. Set mkval `PUBLIC_KONTO_API_BASE` to that host; deploy mkval → the real path replaces the demo.
7. Verify (runbook curls + a full login round-trip). Rollback = unset the flag / set send-mode disabled.

---

## 3. CODEX / dev — next code work (prioritised)

### P1 — The live MATCH + notify (the core user value + the moat) — **biggest, do first**
Today "Sind huvitab" lists the packages but not the *best programme* (the match), and the
delta-notify isn't running. OPK-S4 removed the only data block (refs + skillTags exist).
- **mkval**: publish an outcome-coverage feed — each programme (variant) → its `out_` refs
  (reuse `src/data/outcomeRefs.ts` + the catalog's per-programme outcomes). A static JSON/endpoint.
- **AMOS**: feed it through `infra/scripts/build-outcome-coverage-projection.mjs` (OPK-S3, now
  unblocked) → the `amos.outcome.coverage_projection/v1` (programmes → covered refs). In the
  konto **sync** handler, compute each package's coverage via `computeFit(package.outcome_refs,
  projection)` and store it (the `last_*` columns). `state` then returns the real "parim kate".
- **AMOS CL-3 live**: the delta worker — on a catalog change, recompute only the packages whose
  refs intersect the changed variant (`evaluateFitImprovement`, already built) → queue a neutral
  notification via the topic-notify chain. Schedule it (cron/n8n).
Deps: none new (refs done). Effort: medium-large (cross-repo + a scheduled worker).

### P2 — Security hardening before full `live` (from the CL-5 security review)
- **S2** rate-limit the GET surfaces (`/api/konto/v1/state`, GET `/login/verify`).
- **S3** single-use magic-link (consume the login token's jti on first verify) — today short-TTL reuse.
- **N1** make `/login/verify` POST-only for session issuance (no session bearer in a GET URL/history).
Effort: small. **Gate full go-live on these.**

### P3 — Full-PII erasure from account-delete
`POST /api/konto/v1/account/delete` today erases the **package** zone. For a complete GDPR delete,
also cascade the PII zone: resolve `person_ref → email_hmac` (add a reverse lookup on
`person_identity`) → `eraseByEmailHmac` (consent ledger suppression-first). Today the email/consent
erasure is the separate by-email `/api/outreach/v1/erasure`. Effort: small-medium.

### P4 — Non-package account features, server-backed
Reminders, notify-lists (field / skill / **combination**), funding-profile are today demo/`/api/subscribe`
capture only. Each needs server storage (mostly the existing topic-notify subscription + consent ledger)
+ konto-face wiring. The **combination** notify-list is the highest-value (it is the "küsi koos" demand
seed → CL-6). Effort: medium each.

### P5 — Owner intelligence surface (the build-next moat)
A ranked "build next" view over the accumulated `amos_learner_package` data: unmet-combination
magnitude × conviction (named waitlist count) × fundability × supply gap × labor pull. Lands in the
AMOS/rev-web worklist (per the ratified account ADR), not this repo. Needs post-live data. Effort: large.

### P6 — Observability
Dashboards/alerts for: login requests + sends (outbox depth, send failures), sync errors, session
verify failures, consent/erasure events. Mostly reads the existing audit + outbox. Effort: small-medium.

---

## 4. Architecture notes / standing risks
- **`skillSynonyms` is stability-critical**: the `out_` ref hashes the skillTag, which is derived
  from `src/data/skillSynonyms.ts`. A term/order change that flips an outcome's longest-match
  **re-keys its ref** = a re-canonicalisation (migration for already-synced packages). Treat it as a
  versioned taxonomy. The grounding + drift tests guard accidental breakage.
- **The ref derivation is vendored** in mkval (`src/lib/outcome-ref.ts`, pure-JS sha256) and **pinned**
  byte-for-byte to AMOS `amos.outcome.registry/v1` by `scripts/outcome-ref.test.mjs`. Keep them in
  lockstep; never edit one side's `deriveOutcomeRef`/`normalizeOutcomeText` without the other.
- **Apex stays static**; konto is a client island calling the AMOS API. The session token lives in
  `localStorage` (the S1/N1 hardening reduces the XSS-theft surface; a dedicated konto secret is wired).
- **Flag discipline**: `PUBLIC_KONTO_API_BASE` unset == the demo, byte-for-byte. All real-path code is
  `if (kontoEnabled()) … else <demo>`. Unset the flag to roll back instantly.
