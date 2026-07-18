# Lead-capture go-live runbook

Status: **site half DONE** (this change). AMOS + owner switches are the remaining last mile.

Context: a 2026-07-18 audit found the most prominent lead forms captured **nothing**
server-side — they depended on `PUBLIC_SITE_LEAD_WEBHOOK_URL`, which is unset in
production, so they silently fell back to opening the user's mail client (`mailto:`).
Confirmed on the live site (`data-webhook-url` rendered empty).

## Done in the site repo (this change)

Every public lead form now posts to the **ratified AMOS ingress** via `/api/subscribe`
(the same pipe the `/oskused/` package and `/konto/` flows already used), with the
`mailto:` path kept only as a fallback on any non-2xx (so there is **no regression** when
AMOS is off — it behaves exactly like today until the switches below are flipped):

| Form | File | kind / topic |
|---|---|---|
| Suunatest (home) | `src/pages/index.astro` | `topic_subscribe` / `mikrokvalifikatsioon` |
| Kataloogi nõudlus | `src/pages/kataloog/index.astro` | `topic_subscribe` / `mikrokvalifikatsioon` (only if email given) |
| Valdkonna teavitus | `src/pages/valdkond/[slug].astro` | `topic_subscribe` / `mikrokvalifikatsioon` (valdkond → `field`) |
| Programmi huvi | `src/pages/kataloog/[slug].astro` | `topic_subscribe` / `mikrokvalifikatsioon` |
| EN notify | `src/pages/en/index.astro` | `topic_subscribe` / `mikrokvalifikatsioon` |
| Koolitaja "lisa programm" | `src/pages/koolitajale/index.astro` | `topic_subscribe` / `b2b_koolitus` (contact capture) + `mailto:` for programme details |

`api/subscribe.js` now sets `consent_purpose=b2b_outreach` for `b2b_koolitus` (learner
topics stay `course_offers`) — both are ratified purposes in `amos.outreach.lead_capture/v1`.
`PUBLIC_SITE_LEAD_WEBHOOK_URL` is now unused and can be removed from Vercel.

## Owner switches — irreducible, required to actually go live

Until these are set, `/api/subscribe` returns 503 and forms fall back to `mailto:`.

1. **Vercel env (mikrokvalifikatsioon project):**
   - `AMOS_TOPIC_CAPTURE_URL` = AMOS ingress `https://…/api/outreach/v1/mkval-topic-capture`
   - `AMOS_CAPTURE_TOKEN` = shared bearer (must match AMOS `mkvalTopicCaptureToken`)
   - (optional) `AMOS_ERASURE_URL` — else derived as `…/erasure` from the capture URL.
2. **AMOS ingress:** set `mkvalTopicCaptureToken` and un-gate the capture loop
   (owner-gated per `agent-prompts/2026-06-24-account-flow-hardening-task-board.md`, PBI-02/03/05).
3. **Listmonk:** set `LISTMONK_CONFIRMED_SUBSCRIBER_LIST_IDS`; provision the per-topic
   lists (learner vs B2B) per `agent-prompts/2026-07-01-lead-durability-listmonk-twenty-direction-task-board.md` P1.3.
4. **Twenty:** provision the `personbrandisuhted` custom object, set `AMOS_TWENTY_API_TOKEN`
   and `AMOS_TWENTY_PROSPECT_OWNER_APPROVED=yes` — else the projection runner fails closed.

## AMOS code gaps — for Codex (ratified contracts, not new architecture)

These make role/stage positioning correct once the loop is on:

1. **Role for plain subscribe:** `infra/services/outreach-capture/app/service.mjs`
   `ACCOUNT_KIND_MAP` — a plain `topic_subscribe` seeds **no** person×brand role at capture
   (`service.mjs:796` only fires `if (ctx.role && ctx.stage)`). Add
   `topic_subscribe → role=learner, stage=huviline`.
2. **B2B / provider role:** a `topic=b2b_koolitus` capture should map to `role=b2b_buyer`
   (or `provider`) per the ratified enum in
   `infra/contracts/crm/amos-person-brand-relationship-contract.mjs`. Today it collapses to
   learner/none — provider & B2B are unreachable from mkval.
3. **Listmonk segmentation:** confirmed subscribers go to one flat list
   (`LISTMONK_CONFIRMED_SUBSCRIBER_LIST_IDS`); map by `interest_topic` to the learner vs B2B
   lists (P1.3).
4. **Re-contact send mode:** `run-topic-notify.mjs` + welcome cycle run
   `OUTREACH_SEND_MODE=disabled` by default — enable when ready.

## End-state once switches are on

`site form → /api/subscribe → AMOS ingress (double opt-in) → Listmonk confirmed list
→ Twenty person×brand edge (role/stage) → worklist / re-contact`. Learner and B2B leads
are distinguishable by `interest_topic` + `consent_purpose`.
