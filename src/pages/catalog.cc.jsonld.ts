import { catalog, catalogCheckedAt, catalogUpdatedAt } from "../data/catalog";
import { toCredentialCommons, CC_CONTEXT } from "../data/courseSchema";

// Credential Commons -conformant representation of the whole catalogue, served
// from mikrokvalifikatsioon.ee's own domain. STRUCTURE layer (interop), separate
// from the human pages and their marketing copy: each programme is a
// `cc:MicroCredential` against the shared Credential Commons profile, reusable by
// other institutions, AI agents and Linked Data tools.
// Validate: npx credential-commons validate <file> --profile micro-credential
export async function GET() {
  return new Response(
    JSON.stringify(
      { "@context": CC_CONTEXT, checkedAt: catalogCheckedAt, dataUpdatedAt: catalogUpdatedAt, "@graph": catalog.map(toCredentialCommons) },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
}
