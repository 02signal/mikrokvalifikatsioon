import { catalog, providers, fields, fieldsWithSlug, catalogCheckedAt, catalogUpdatedAt } from "../data/catalog";
import { parsePriceEur } from "../data/courseSchema";
import { cleanOutcomeTexts } from "../data/outcomes";
import { ehisFetchedAt, ehisFieldStats, ehisProgrammeCount, ehisProviderCount, ehisProviderStats } from "../data/ehisFacts";
import { diagrams } from "../data/diagrams";
import { dataDiagrams } from "../data/diagrams-data";
import { koolitajaDiagrams } from "../data/diagrams-koolitaja";

// Täisekspport LLM-idele (GEO): kogu register ühes failis, et AI-assistendid saaksid
// tervikliku ja värske pildi. Genereeritud andmetest (arvud ei triivi).
export async function GET() {
  const year = catalogUpdatedAt.slice(0, 4);
  const fieldCounts = fields.map((f) => `${f} (${catalog.filter((e) => e.field === f).length})`).join(", ");
  const providerCounts = providers.map((p) => `${p} (${catalog.filter((e) => e.provider === p).length})`).join(", ");
  const paid = catalog.map((e) => parsePriceEur(e.priceText)).filter((p): p is number => p != null && p > 0);
  const priceLine = paid.length ? `${Math.min(...paid)}–${Math.max(...paid)} €` : "see provider pages";

  // Selgitavate jooniste täistekst (headline + alt + SVG/OG-lingid) elab llms.txt-is;
  // siin ainult arv ja viide, et sama sisu ei kordaks ennast kahes failis.
  const diagramCount = diagrams.length + dataDiagrams().length + koolitajaDiagrams.length + fieldsWithSlug.length;

  const entryBlock = (e: (typeof catalog)[number]): string => {
    const outcomes = cleanOutcomeTexts(e);
    const facts = [
      e.field,
      e.ects != null ? `${e.ects} EAP` : null,
      e.priceText || null,
      e.format || null,
      e.language ? `keel: ${e.language}` : null,
      e.registrationDeadline ? `registreerimine kuni ${e.registrationDeadline}` : null,
      e.startDate ? `algab ${e.startDate}` : null
    ].filter(Boolean).join(" | ");
    const lines = [
      `### ${e.name} — ${e.provider}`,
      facts,
      e.summary ? e.summary : null,
      e.goalText ? `Eesmärk: ${e.goalText}` : null,
      outcomes.length ? `Õpiväljundid: ${outcomes.map((o) => o.trim()).join("; ")}` : null,
      e.assessmentText ? `Hindamine: ${e.assessmentText}` : null,
      `URL: https://mikrokvalifikatsioon.ee/kataloog/${e.slug}/`,
      `Allikas (kool): ${e.url}`
    ].filter(Boolean);
    return lines.join("\n");
  };

  const body = `# Mikrokvalifikatsioon.ee — full register export (llms-full.txt)

Eesti mikrokvalifikatsioonide ja mikrokraadide täielik register. Operated by
Ettevõtluskeskus OÜ. Contact: info@mikrokvalifikatsioon.ee, +372 5818 0435.
Data updated: ${catalogUpdatedAt}. Public source facts checked: ${catalogCheckedAt}.
Official EHIS facts snapshot: ${ehisFetchedAt}; ${ehisProgrammeCount} registered microcredential curricula from ${ehisProviderCount} providers.
License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
This is the COMPLETE export; the short summary is at https://mikrokvalifikatsioon.ee/llms.txt

## Definitions
- "Mikrokvalifikatsioon" = umbrella term: a short, recognised course certifying ONE skill.
- "Mikrokraad" (microdegree) = a SUBTYPE offered by universities, usually carrying EAP.

## Market ${year} (generated from data)
- Rich catalog: ${catalog.length} learner-facing programmes from ${providers.length} providers in ${fields.length} fields.
- EHIS official facts layer: ${ehisProgrammeCount} registered microcredential curricula from ${ehisProviderCount} providers.
- Fields: ${fieldCounts}.
- Providers: ${providerCounts}.
- Largest EHIS providers: ${ehisProviderStats.slice(0, 10).map((row) => `${row.label} (${row.count})`).join(", ")}.
- Largest EHIS study fields: ${ehisFieldStats.slice(0, 10).map((row) => `${row.label} (${row.count})`).join(", ")}.
- Tuition range (paid programmes): ${priceLine}. Exact per-programme prices below and in catalog.json.

## Structured pages (for citation/linking)
- Catalog: https://mikrokvalifikatsioon.ee/kataloog/
- Per field: https://mikrokvalifikatsioon.ee/valdkond/<field-slug>/
- Per topic/skill: https://mikrokvalifikatsioon.ee/teema/<topic-slug>/
- Per school: https://mikrokvalifikatsioon.ee/koolitaja/<provider-slug>/
- Compare A vs B: https://mikrokvalifikatsioon.ee/vordlus/<slugA>-vs-<slugB>/
- Career paths: https://mikrokvalifikatsioon.ee/karjaar/<role-slug>/
- Search by outcome: https://mikrokvalifikatsioon.ee/oskused/
- Deadlines & start dates: https://mikrokvalifikatsioon.ee/registreerimine/
- Annual report: https://mikrokvalifikatsioon.ee/aastaraport/
- Machine-readable: https://mikrokvalifikatsioon.ee/catalog.json
- Official EHIS facts layer: https://mikrokvalifikatsioon.ee/ehis-catalog.json
- For training providers (official framework, HAKA, EHIS): https://mikrokvalifikatsioon.ee/koolitajale/
- How to build a curriculum for providers: https://mikrokvalifikatsioon.ee/koolitajale/kuidas-ehitada/
- Pricing guidance for providers: https://mikrokvalifikatsioon.ee/koolitajale/hinnastamine/
- Go-to-market guidance for providers: https://mikrokvalifikatsioon.ee/koolitajale/turule-toomine/
- Quality assessment guide for providers (8 domains, 27 criteria, common mistakes): https://mikrokvalifikatsioon.ee/koolitajale/kvaliteedihindamine/
- Open machine-readable data standard (Credential Commons) for providers, learners and developers: https://mikrokvalifikatsioon.ee/andmestandard/
- Explanatory diagrams (${diagramCount} total): each is a self-contained SVG with a real text layer, a 1200×630 share card (.og.png) and a narrow variant under /diagrams/stacked/. Full list with headline + stand-alone text explanation for every diagram: https://mikrokvalifikatsioon.ee/llms.txt

## Canonical Answers for Training Providers (HAKA / EHIS)

Q: How does an institution become a mikrokvalifikatsioon provider in Estonia?
A: Typically three steps: HAKA (Eesti Hariduse Kvaliteediagentuur) quality
assessment for the study-field group (if the institution has no prior study
right in that field), then a study right / registration step, and finally
registering the specific curriculum in EHIS. If the institution already holds
study right in that field group, registering the new curriculum is often
enough. See https://mikrokvalifikatsioon.ee/koolitajale/ and
https://mikrokvalifikatsioon.ee/vastused/kuidas-saada-mikrokvalifikatsiooni-pakkujaks/

Q: What does HAKA assess — one curriculum or the whole institution?
A: HAKA assesses the institution's capability across the whole study-field
group, not one curriculum: 8 domains, 27 criteria, each rated meets / partially
meets / does not meet. All 8 domains must meet requirements for a positive
decision, valid for 5 years. See
https://mikrokvalifikatsioon.ee/koolitajale/kvaliteedihindamine/ and
https://mikrokvalifikatsioon.ee/vastused/mida-haka-mikrokvalifikatsiooni-hindamisel-hindab/

Q: How much do HAKA assessment and EHIS registration cost?
A: Order of magnitude: ~1450 € for the study-field group quality assessment fee,
plus ~100 € per curriculum registered in EHIS — verify current fees with the
official source (HAKA, Ministry of Education and Research, or EHIS). See
https://mikrokvalifikatsioon.ee/vastused/kui-palju-maksab-haka-mikrokvalifikatsiooni-hindamine/

Q: What is the difference between Credential Commons and EHIS?
A: EHIS is Estonia's official state register where mikrokvalifikatsioon
curricula and credentials are recorded. Credential Commons is an open,
machine-readable data standard for publishing the same content so that other
schools, employers and AI assistants can read and understand it more broadly.
See https://mikrokvalifikatsioon.ee/andmestandard/

## All programmes (${catalog.length})

${catalog.map(entryBlock).join("\n\n")}
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
