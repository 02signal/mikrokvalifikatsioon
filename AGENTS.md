# Agent Entry Point

<!-- AMOS-TÖÖKORD:ALGUS (levitatud allikast – ära muuda siin) -->
## AMOS-i ühine töökord (omanik 16.10.2026)

Kehtib igale sessioonile ja agendile (Claude Code, Codex, pilv) selles repos.

- **Kohustus = GitHub issue.** Selle repo töö issue on selles repos. Sõnum ilma issue'ta ununeb.
- **Sildid:** `ala:<ala>` (üks), `olek:töös` / `olek:blokeeritud`, `omanik` (vajab omaniku otsust), `teise-ala`, `prio:kõrge`. Issue keha: `Väärtus:` (konversioon / õppija edu / CS aeg) ja `Valmis, kui:`.
- **Alustades** vaata oma ala järjekorda ja võta suurima väärtusega asi, mitte kõige uuem sõnum. WIP ≤ 5 `olek:töös`; GO + pakett valmis ja ootab ainult live'i akent → `olek:ootab-akent` (ei loe WIP-i). Sulge ainult tõendiga (PR, readback, link).
- **Sõnumid ainult üleandmiseks**, alati issue lingiga.
- **Andmed:** saladusi (paroole, võtmeid, tokeneid) ei kirjutata kuhugi. Selle repo issue'desse, PR-idesse ja commit'idesse isikuandmeid ei panda.
- **Muudatus läheb sisse PR-i ja sõltumatu ülevaatusega** (autor ≠ kontrollija).
<!-- AMOS-TÖÖKORD:LÕPP -->

Read `CLAUDE.md` first — especially the **PUBLISHING GATE** section at the top, and `CLAUDE.local.md` if it exists (owner-only constraints that override everything). Hard rule: no public artifact may announce any Ettevõtluskeskus own training programme or credential without the owner's explicit written approval.

Before planning or finishing work, also check `BACKLOG.md`.

Do not deploy, rename domains, change analytics IDs, or alter lead-routing behavior unless the user explicitly asks for it.

## Catalog Architecture

- `src/data/catalog/*.json` — source of truth, one file per provider group; entries follow the schema in `src/data/catalogSchema.ts`.
- Facts only from provider pages, `sourceCheckedAt` on every entry, null for unknowns.
- `/kataloog/` and `/mikrokraadid/` render from the data layer; never hardcode programme facts in pages.
- The catalog section must stay spin-out-ready: own data layer, clean `/kataloog/` URL space, no cross-imports from page-specific code into the data layer.
