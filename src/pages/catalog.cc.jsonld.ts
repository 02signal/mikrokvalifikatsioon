import { credentialCommonsRelease } from "../data/credentialCommons";

// The warehouse emits the canonical CC graph. Keep its bytes intact: this site
// is a public mirror, not a second feed→CC transformation.
export async function GET() {
  return new Response(
    credentialCommonsRelease.graphText,
    {
      headers: {
        "Content-Type": "application/ld+json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
}
