# Konto (account) system — state + the remaining owner / Codex work

The master map of the account-value workstream: what is **built and merged**, what the
**owner** must do to go live, and what **Codex / dev** should build next (prioritised).
Companion: `docs/konto-go-live-runbook.md` (the exact go-live commands).

---

## 1. DONE — built, tested, merged (LIVE as of 2026-06-26)

The konto account is **live** (login API at `liitu.mikrokvalifikatsioon.ee`, face on the apex,
`OUTREACH_SEND_MODE` live). A learner can: phrase a skill in their own words → build ~5-outcome
packages → keep several named packages → log in by magic-link → their packages persist
server-side, cross-device → see "Sind huvitab" with the **server-computed match** → delete the
account (full GDPR erasure). Logged-out is untouched.

**mkval** (`mikrokvalifikatsioon`):
- CL-1 synonym/proximity skill search + CL-2 ~5-outcome builder frame (#36)
- CL-4 multiple named packages (`9a92ed6`)
- Antigravity OG bg + hero (#37) + category marks (#39); vastused hero contrast fix (#41)
- **OPK-S4** deterministic `out_` refs + skillTags for every catalog outcome (#42)
- **Konto face** wired to the real API behind `PUBLIC_KONTO_API_BASE`, demo fallback (#43)
- Browser-safe `outcome-ref` (pure-JS sha256, pinned to AMOS) + **account-delete** (#44)
- **Server-computed package fit** shown in /konto/ (#46); editorial Q&A → FAQPage GSC fix (#47)

**AMOS** (`02S-AMOS`):
- **CL-3** `amos_learner_package` PII-free store + identity keystone reuse (#1190)
- **CL-5** konto spine: magic-link login + session + state + sync (#1197)
- Gated magic-link **email send** + dedicated konto token secret (#1200)
- Konto **account-delete** endpoint (#1205)
- **Live MATCH**: konto computes each package's fit vs the coverage projection (#1209)
- **LIVE hardening**: single-use + latest-link-only magic-link, `/state` rate-limit,
  POST-only verify, + **full-PII delete cascade** (person_ref→email_hmac→consent erasure) (#1225)
- **CL-3 delta-notify worker**: rescans saved packages, queues a PII-free `konto_match_improved`
  job on a genuine match improvement, idempotent + a cron entry + `KONTO-LIVE-OPS.md` (#1226)

PII posture (by construction): the warehouse holds only opaque refs + banded coverage; the
face sends only `email` (to login) + `out_`/`package_ref` + the session — **names and outcome
text stay in the browser**, never sent. Cross-person overwrite (IDOR) fixed + regression-tested;
every warehouse text column has a SQL CHECK; the single-use nonce + match-notify jobs are all refs/hashes only.

---

## 2. OWNER — go live ✅ DONE (2026-06-26)
The original go-live (DB migration, secrets, Caddy `/api/konto/*`, `OUTREACH_SEND_MODE` live,
`PUBLIC_KONTO_API_BASE=https://liitu.mikrokvalifikatsioon.ee`, mkval deploy) is complete and
verified (/konto/ 200, state 401, CORS 204, projection mounted, container healthy). Runbook:
`docs/konto-go-live-runbook.md`. Rollback = unset `PUBLIC_KONTO_API_BASE` / set send-mode disabled.

**Residual owner steps:**
- Apply `infra/sql/2026-06-26-konto-login-nonce.sql` (the single-use table; idempotent) on prod —
  required for the #1225 hardening. *(In-flight pre-hardening links become invalid → users re-request; impact ~nil at 0 rows.)*
- Schedule the CL-3 delta-notify cron (see P-NOW) once the match-improved send is wired.
- A real end-to-end login smoke (your own email, since send is live) to fill `learner_package`.
- Optional: remove the stray Vercel project `mkval-konto-prod-deploy` (dashboard → Delete Project).

---

## 3. CODEX / dev — next code work

### ✅ Shipped 2026-06-26 (was P1/P2/P3/P6 + CL-3)
- **P1 live MATCH** — DONE: konto computes each package's fit vs the projection and /konto/ shows
  it (#1209/#46). The coverage projection is built + mounted live.
- **CL-3 delta-notify** — DONE (detection + queue + idempotent baseline): the worker queues a
  PII-free `konto_match_improved` job on a genuine improvement (#1226). *(Send wiring = P-NOW below.)*
- **P2 security hardening** — DONE: single-use + latest-link-only magic-link, `/state` rate-limit,
  POST-only verify (#1225).
- **P3 full-PII delete cascade** — DONE: account/delete erases the PII zone too (#1225).
- **P6 observability** — DONE (first cut): `KONTO-LIVE-OPS.md` (audit events, outbox, red flags,
  health). Dashboards/alerts on top of it remain ops.

### P-NOW — wire the `konto_match_improved` SEND + schedule the worker — **the one gap to finish CL-3**
The delta worker QUEUES the notify; nothing emails it yet. Mirror `sendKontoMagicLink`:
- **AMOS**: a Listmonk template for "your saved package now has a better match" (neutral, embargo-safe:
  "lisandus sobiv programm/kombinatsioon" — never implies EVK's own programme) + an outbox→send
  dispatch for `kind:"konto_match_improved"` (resolve person_ref→email in the PII zone, gated by
  `OUTREACH_SEND_MODE`). + a deep link back to /konto/.
- **Owner**: schedule `node infra/scripts/konto-delta-notify.mjs` (after each projection rebuild /
  daily) via n8n-ops/cron, with `OUTREACH_KONTO_COVERAGE_PROJECTION_PATH` set. Effort: small-medium.

### P4 — Non-package account features, server-backed
Reminders, notify-lists (field / skill / **combination**), funding-profile are today demo/`/api/subscribe`
capture only. Each needs server storage (mostly the existing topic-notify subscription + consent ledger)
+ konto-face wiring. The **combination** notify-list is the highest-value (it is the "küsi koos" demand
seed → CL-6). Effort: medium each.

### P5 — Owner intelligence surface (the build-next moat)
A ranked "build next" view over the accumulated `amos_learner_package` data: unmet-combination
magnitude × conviction (named waitlist count) × fundability × supply gap × labor pull. Lands in the
AMOS/rev-web worklist (per the ratified account ADR), not this repo. Needs post-live data. Effort: large.

### Monitoring (ops, on top of P6)
Dashboards/alerts over the audit + outbox per `KONTO-LIVE-OPS.md`: login requests + sends (outbox
depth, send failures), `link_already_used`/`rate_limited` spikes, sync errors, consent/erasure,
`learner_package` growth (adoption), delta-notify run summaries.

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
  `localStorage`; a dedicated konto token secret is wired, the magic link is single-use +
  latest-link-only, verify is POST-only, and `/state` is rate-limited (#1225).
- **Single-use is face-safe**: the magic link lands on `/konto/kinnita/` (static), whose JS POSTs the
  token to verify — email scanners that only GET the link can't consume it; only the real click does.
  A consumed/superseded link shows "aegus või on juba kasutatud. Telli uus link."
- **Flag discipline**: `PUBLIC_KONTO_API_BASE` unset == the demo, byte-for-byte. All real-path code is
  `if (kontoEnabled()) … else <demo>`. Unset the flag to roll back instantly.
