# Konto go-live runbook (owner steps)

All the CODE for a real account (login → packages → "Sind huvitab") is built, tested,
and merged across mkval + AMOS. The face is **flag-gated**: with the flag unset, `/konto/`
is the existing demo, byte-for-byte. Going live = the **config + deploy** steps below
(no code change). Until step 5, nothing is sent and no real session exists.

## What's already done (code)
- AMOS: `amos_learner_package` store (PII-free), the konto endpoints (`/api/konto/v1/login/request`,
  `/login/verify`, `/state`, `/packages/sync`), magic-link + session tokens, the gated
  `sendKontoMagicLink` send seam, the cross-person IDOR guard. (PRs #1190, #1197, #1200.)
- OPK-S4: every catalog outcome has a deterministic, AMOS-identical `out_` ref (PR #42).
- mkval: the konto-face real path (api client + sync + "Sind huvitab"), demo fallback (this PR).

## Go-live steps (owner / ops)
1. **DB** — apply the learner-package migration on the prod Listmonk Postgres:
   `infra/sql/2026-06-25-learner-package.sql` (also shipped as `initdb/07-amos-learner-package.sql`
   for a fresh init). Idempotent (`CREATE … IF NOT EXISTS`).
2. **Secrets** (AMOS host `/opt/amos/secrets`, never Git):
   - `OUTREACH_SUPPRESSION_PEPPER` (≥16) — email→hmac pepper (already set if capture is live).
   - `OUTREACH_CONFIRM_TOKEN_SECRET` (≥16) — already set if confirm is live.
   - `OUTREACH_KONTO_TOKEN_SECRET` (≥16) — **new, recommended** (defaults to the confirm secret if unset).
3. **Email template** — create the konto magic-link transactional template in Listmonk; set
   `LISTMONK_KONTO_MAGIC_LINK_TEMPLATE_ID`. The link body must use only the token URL
   (`{base}/konto/kinnita/?token=…`) — never the raw email (the send seam enforces this).
4. **Deploy AMOS** — deploy the outreach-capture service (it already serves `/api/konto/*` on
   loopback :8085) and **expose `/api/konto/*` via Caddy** (mirror the existing `/api/outreach/*`
   reverse-proxy rule) at a public host, e.g. `https://konto-api.mikrokvalifikatsioon.ee`.
5. **Flip the send gate** — `OUTREACH_SEND_MODE`: `disabled` → `allowlist` (test recipients) →
   `live`. Until `allowlist`/`live`, login emails are NOT sent (a PII-free outbox job is queued).
6. **Point mkval at it** — set `PUBLIC_KONTO_API_BASE` (e.g. `https://konto-api.mikrokvalifikatsioon.ee`)
   and **deploy mkval**. This flips `kontoEnabled()` → the real path replaces the demo.
7. **(Optional) Twenty** — when Twenty is live, the confirmed-capture→Twenty queue upserts the person.

## Verify (after step 6)
- `curl -s -X POST {base}/api/konto/v1/login/request -d '{"email":"you@allowlisted"}' -H 'content-type: application/json'` → `{"ok":true}`.
- Click the emailed link → `/konto/kinnita/?token=…` logs in → `/konto/` shows "Sind huvitab" with your packages.
- DB: `select count(*) from amos_crm.learner_package where person_ref = …;` reflects the synced packages.

## Pre-prod hardening (close before full `live`) — from the security review
- **S2** rate-limit the GET surfaces (`/login/verify` GET, `/state`).
- **S3** single-use magic-link (consume the login token's jti on first verify) — today short-TTL reuse-until-expiry (15 min).
- **N1** make `/login/verify` POST-only for session issuance (avoid a session bearer in a GET URL/history).

## Rollback (instant, no deploy)
- mkval: unset `PUBLIC_KONTO_API_BASE` + redeploy → reverts to the demo path.
- AMOS: `OUTREACH_SEND_MODE=disabled` → no emails sent. The store/endpoints stay up but inert.

## Known scope (post-live follow-ups)
- Only PACKAGES are server-backed today. Reminders / notify-lists / funding-profile stay the
  demo/`/api/subscribe` capture path until their server storage lands.
- The live **match/notify** (CL-3 delta engine) needs the AMOS outcome **coverage projection**
  populated from the mkval `{text, skillTag}` feed (OPK-S4 produced the refs; the projection
  build is the next AMOS step). Until then "Sind huvitab" shows packages; "best match" lights up
  once the projection is live.
