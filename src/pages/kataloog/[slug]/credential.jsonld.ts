import type { APIRoute } from "astro";
import { catalog, type CatalogEntryWithSlug } from "../../../data/catalog";
import { toCredentialCommons, CC_CONTEXT } from "../../../data/courseSchema";

// Per-programme Credential Commons resource: a stable, dereferenceable URL that
// returns ONLY this programme as `cc:MicroCredential` JSON-LD. This makes each
// credential its own Linked Data resource (not just embedded in the page or the
// bulk /catalog.cc.jsonld) — so AI agents, other institutions and Linked Data
// tools can fetch one credential directly.
// Validate: npx credential-commons validate <file> --profile micro-credential
export function getStaticPaths() {
  return catalog.map((entry) => ({ params: { slug: entry.slug }, props: { entry } }));
}

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: CatalogEntryWithSlug };
  const body = { "@context": CC_CONTEXT, ...toCredentialCommons(entry) };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/ld+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
