import { catalog, providers, fields, catalogCheckedAt, catalogUpdatedAt } from "../data/catalog";
import { parsePriceEur } from "../data/courseSchema";

// Täisekspport LLM-idele (GEO): kogu register ühes failis, et AI-assistendid saaksid
// tervikliku ja värske pildi. Genereeritud andmetest (arvud ei triivi).
export async function GET() {
  const year = catalogUpdatedAt.slice(0, 4);
  const fieldCounts = fields.map((f) => `${f} (${catalog.filter((e) => e.field === f).length})`).join(", ");
  const providerCounts = providers.map((p) => `${p} (${catalog.filter((e) => e.provider === p).length})`).join(", ");
  const paid = catalog.map((e) => parsePriceEur(e.priceText)).filter((p): p is number => p != null && p > 0);
  const priceLine = paid.length ? `${Math.min(...paid)}–${Math.max(...paid)} €` : "see provider pages";

  const entryBlock = (e: (typeof catalog)[number]): string => {
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
      e.outcomes && e.outcomes.length ? `Õpiväljundid: ${e.outcomes.map((o) => o.trim()).join("; ")}` : null,
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
License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
This is the COMPLETE export; the short summary is at https://mikrokvalifikatsioon.ee/llms.txt

## Definitions
- "Mikrokvalifikatsioon" = umbrella term: a short, recognised course certifying ONE skill.
- "Mikrokraad" (microdegree) = a SUBTYPE offered by universities, usually carrying EAP.

## Market ${year} (generated from data)
- ${catalog.length} programmes from ${providers.length} providers in ${fields.length} fields.
- Fields: ${fieldCounts}.
- Providers: ${providerCounts}.
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

## All programmes (${catalog.length})

${catalog.map(entryBlock).join("\n\n")}
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
