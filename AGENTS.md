# Agent Entry Point

<!-- AMOS-TÖÖKORD:ALGUS (allikas: arthunt/amos-ops agents/amos-tookord-plokk.md – ära muuda siin) -->
## AMOS-i ühine töökord (omanik 16.10.2026)

Kehtib igale sessioonile ja agendile (Claude Code, Codex, pilv) selles repos. Täistekst: `arthunt/amos-ops` → `agents/uhised-reeglid.md` ja `docs/po-harta.md`.

- **Kohustus = GitHub issue.** Selle repo töö issue on selles repos. Kui töö puudutab mitut repot või hosti, tee issue repos `arthunt/amos-ops`. Sõnum ilma issue'ta ununeb.
- **Sildid:** `ala:<ala>` (üks), `olek:töös` / `olek:blokeeritud`, `omanik` (vajab omaniku otsust), `teise-ala`, `prio:kõrge`. Issue keha: `Väärtus:` (konversioon / õppija edu / CS aeg) ja `Valmis, kui:`.
- **Alustades** vaata oma ala järjekorda ja võta suurima väärtusega asi, mitte kõige uuem sõnum. WIP ≤ 5 `olek:töös`; GO + pakett valmis ja ootab ainult live'i akent → `olek:ootab-akent` (ei loe WIP-i). Sulge ainult tõendiga (PR, readback, link).
- **Merge klassi järgi** (autor ≠ kontrollija):
  - **A** (docs, logid, mälu): ise, kui CI on roheline. **Agentide reeglid (CLAUDE.md, AGENTS.md, `.claude/`) on B.**
  - **B** (õppijale/kliendile minev sisu): ise pärast valideerija GO-d (silt `valideerija-go`), tarne merge'itud sha-st;
  - **C** (tootmiskood ja juurutus, host, õigused, raha, kustutamine, www release): merge ise pärast VM GO-d; juurutus kohe GO + readback'iga, aken ainult juurele (ADR-015). **≤ 1 avatud C-PR ala kohta** (tööriistade PR-id, kaart amos-ops#224, on erand).
  - Kahtluse korral vali kõrgem klass. **GO: C → `valideerija` (VM), B → `valideerija - mac` (Maci enda PR-id → VM).**
- **Õppematerjalid** (kõik programmid): kaanon `arthunt/amos-ops` → `docs/kaanon/oppematerjalide-puu.md` (juur → tüvi → oks, `variant_of`).
- **Sõnumid ainult üleandmiseks**, alati issue lingiga. Kui avastus puudutab teist ala, tee issue sinna sildiga `teise-ala`.
- **Andmed AMOS-i sees on avatud** (omanik 31.10, `state/omaniku-otsused.md` r589): kasuta otsuseks vajalikke andmeid, ka nimesid, – *just enough*, mitte rohkem. Privaatne AMOS-i repo, issue ja sessioonide sõnum on AMOS-i sees (GitHub on usaldatud). **Keelatud:** saladused (paroolid, võtmed, tokenid) kuskil; isikuandmed avalikku repo'sse, avalikku veebi või kolmandale osapoolele. **Avalik AMOS-i repo** (nt `02signal/*`, `credential-commons`) on AMOS-ist väljas: selle issue'desse, PR-idesse ja commit'idesse isikuandmeid ei panda.
<!-- AMOS-TÖÖKORD:LÕPP -->

Read `CLAUDE.md` first — especially the **PUBLISHING GATE** section at the top, and `CLAUDE.local.md` if it exists (owner-only constraints that override everything). Hard rule: no public artifact may announce any Ettevõtluskeskus own training programme or credential without the owner's explicit written approval.

Before planning or finishing work, also check `BACKLOG.md`.

Do not deploy, rename domains, change analytics IDs, or alter lead-routing behavior unless the user explicitly asks for it.

## Catalog Architecture

- `src/data/catalog/*.json` — source of truth, one file per provider group; entries follow the schema in `src/data/catalogSchema.ts`.
- Facts only from provider pages, `sourceCheckedAt` on every entry, null for unknowns.
- `/kataloog/` and `/mikrokraadid/` render from the data layer; never hardcode programme facts in pages.
- The catalog section must stay spin-out-ready: own data layer, clean `/kataloog/` URL space, no cross-imports from page-specific code into the data layer.
