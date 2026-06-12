# Agent Entry Point

Read `CLAUDE.md` first — especially the **PUBLISHING GATE** section at the top, and `CLAUDE.local.md` if it exists (owner-only constraints that override everything). Hard rule: no public artifact may announce any Ettevõtluskeskus own training programme or credential without the owner's explicit written approval.

Before planning or finishing work, also check `BACKLOG.md`.

Do not deploy, rename domains, change analytics IDs, or alter lead-routing behavior unless the user explicitly asks for it.

## Catalog Architecture

- `src/data/catalog/*.json` — source of truth, one file per provider group; entries follow the schema in `src/data/catalogSchema.ts`.
- Facts only from provider pages, `sourceCheckedAt` on every entry, null for unknowns.
- `/kataloog/` and `/mikrokraadid/` render from the data layer; never hardcode programme facts in pages.
- The catalog section must stay spin-out-ready: own data layer, clean `/kataloog/` URL space, no cross-imports from page-specific code into the data layer.
