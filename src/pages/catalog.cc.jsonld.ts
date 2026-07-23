import { catalog, catalogCheckedAt, catalogUpdatedAt } from "../data/catalog";
import { detailUrl } from "../data/courseSchema";
import { cleanOutcomeTexts } from "../data/outcomes";

// Credential Commons -conformant representation of the catalogue, served from
// mikrokvalifikatsioon.ee's own domain. This is the STRUCTURE layer (interop),
// separate from the human page and its marketing copy: each programme is a
// `cc:MicroCredential` typed against the shared Credential Commons profile, so
// other institutions, AI agents and Linked Data tools can reuse it directly.
// Validate with:  npx cc validate  (github.com/credential-commons/credential-commons)
const CC_CONTEXT = "https://credentialcommons.org/profiles/context/haridus.jsonld";

export async function GET() {
  const graph = catalog.map((entry) => {
    const node: Record<string, unknown> = {
      "@type": "MicroCredential",
      "@id": detailUrl(entry),
      name: entry.name
    };
    if (entry.summary) node.summary = entry.summary;
    if (entry.url) node.url = entry.url;
    if (entry.field) node.field = entry.field;
    if (entry.language) node.language = entry.language;
    if (entry.ects != null) node.ectsCredits = entry.ects;
    if (entry.provider) node.provider = { "@type": "Organization", name: entry.provider };
    const outcomes = cleanOutcomeTexts(entry);
    if (outcomes.length) node.learningOutcome = outcomes;
    if (entry.registrationDeadline) node.registrationDeadline = entry.registrationDeadline;
    if (entry.startDate) node.startDate = entry.startDate;
    return node;
  });

  return new Response(
    JSON.stringify({ "@context": CC_CONTEXT, checkedAt: catalogCheckedAt, dataUpdatedAt: catalogUpdatedAt, "@graph": graph }, null, 2),
    {
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
}
