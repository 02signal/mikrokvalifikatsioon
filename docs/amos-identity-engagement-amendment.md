# Amendment — cross-brand identity, per-brand roles & unified engagement

Status: architecture amendment (extends the ratified AMOS learner-identity ADR and the mkval
account-layer plan to the full brand portfolio). Needs the matching amendment in the canonical
ADR (`02S-AMOS/docs/architecture/amos-outcome-package-and-learner-identity-adr.md`) + BACKLOG +
PR notification to all agents.
Companions: `docs/amos-account-layer-plan.md`, `docs/mkval-growth-plan.md`,
`docs/amos-catalog-agent-brief.md`, `docs/amos-labor-market-brief.md`. Honors CLAUDE.md +
embargo (CLAUDE.local.md) + the consolidation freeze (AMOS = brain, Twenty = operational CRM,
restricted person-data zone).

## Why this amendment

The account-layer plan was written mkval-first (ET face + EN `credentialstudy` face). But the
business is a **brand portfolio**, not one brand: the EVK website, mikrokvalifikatsioon.ee,
credentialstudy, **digiteekaart** (digitalisation + automation grant/support knowledge for
owners), teekaart, automatiseerimine/digitaliseerimine funnels, plus future brands and related
services. **One human can engage many brands, with different roles and needs in each**, and
**all** their messages / emails / issues must be managed systematically in **one** CRM +
engagement system, **independent of the brand or service** they came through.

The current foundation is multi-brand-*ready* (Twenty as the single canonical person; the
`source_site` capture enum already tags brands/funnels; the AMOS consent ledger + shared
identity spine). But the **explicit model** for cross-brand identity, per-brand roles,
brand-scoped consent, and a unified engagement/issue layer is not yet first-class. This
amendment makes it so.

## Decision (the amended model)

Person-centric, brand-agnostic identity with brand-scoped relationships and one engagement
plane:

1. **Canonical Person (Twenty) is brand-agnostic + identity-resolved.** One human = one Person,
   regardless of which brand they first touch. Add **identity resolution** (match/merge on
   email + other deterministic keys; manual-merge in Twenty for ambiguous cases) so a learner
   on mkval and a grant-seeking owner on digiteekaart who are the same person resolve to one
   Person — never duplicated per brand.

2. **Brand registry.** A first-class list of brands/services (seeded by the existing
   `source_site` enum: mikrokvalifikatsioon, credentialstudy, ettevotluskeskus, digiteekaart,
   teekaart, automatiseerimine, digitaliseerimine, events/conferences, …). Every interaction,
   consent, and relationship is tagged with the brand it belongs to.

3. **Relationship = Person × Brand × Role × stage/needs (many-to-many).** The same Person can
   be `learner@mikrokvalifikatsioon`, `owner/grant-seeker@digiteekaart`, `B2B-buyer@<brand>`,
   `provider@<brand>`, `partner@…` — each with its own role, stage, and needs. Roles are NOT a
   property of the Person; they are properties of the **Person–Brand relationship**. (Twenty
   custom objects/relations model this; define them explicitly.)

4. **Brand-scoped consent + purpose.** The consent ledger is keyed by **(person, brand/data-
   controller, purpose)**. Consent to mikrokvalifikatsioon `course_offers` does **not** grant
   digiteekaart grant-marketing. **Cross-brand use of a person's data needs its own lawful
   basis** (separate consent or a documented legitimate-interest assessment). Extend the
   existing per-purpose ledger with the brand/controller dimension; double-opt-in stays
   per-(brand, purpose).

5. **One unified engagement + issue plane.** All inbound (email, forms, messages) + outbound +
   **issues/tickets** land in **one** system (Twenty conversations/activities + the AMOS
   messaging/issue layer), **brand-tagged** but unified per Person. An operator sees a person's
   whole cross-brand history in one place; routing/SLAs can be brand-scoped, but the store is
   one. This subsumes the inbound-email→CRM idea and makes it brand-agnostic by design.

6. **Shared spine, brand faces (unchanged, reaffirmed).** Login once on the shared OPK/identity
   spine; each brand face shows its own services + that person's **per-brand role and data**.
   Apex public sites stay static.

## Governance
- **GDPR:** brand/controller-scoped consent; cross-brand data use requires its own lawful basis
  (consent or LIA), documented per brand; data minimization; per-(brand,purpose) DOI + withdraw;
  one erasure across the unified store (suppression-first, cascade across brands).
- **Embargo:** unchanged — no surface may state or imply any operator's own programme until the
  owner lifts it.
- **Consolidation freeze:** the Person/Brand/Relationship/consent/engagement model lives in
  **AMOS + Twenty**; brand faces (mkval, credentialstudy, EVK site, digiteekaart, …) stay thin
  consumers.

## Impact / required changes (notify all agents)
- **Canonical ADR** (`02S-AMOS/.../amos-outcome-package-and-learner-identity-adr.md`): amend —
  Person becomes cross-brand + identity-resolved; add **Brand**, **Relationship/Role**, and
  **brand-scoped consent** objects; promote the **unified engagement/issue plane**.
- **`lead_capture/v1` contract:** `source_site` already carries the brand tag; add an optional
  **relationship/role context** (role + stage) so capture can seed the right Person–Brand
  relationship.
- **Twenty schema:** define Brand, Person–Brand Relationship (with role/stage), and
  brand-scoped consent objects; identity-resolution/merge rules.
- **Inbound-email/issue layer:** build it brand-agnostic from the start (one queue, brand tag),
  not per-brand silos.
- **mkval account-layer plan + BACKLOG:** reference this amendment (done).
- **All brand faces:** read the person's **per-brand** role/data, never assume one role.

## Action
This amendment → AMOS ADR amendment + BACKLOG + **PR + merge to notify all agents**, so every
brand/agent builds against the same person-centric, multi-brand, unified-engagement model.
