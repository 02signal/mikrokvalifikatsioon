// Sitemap `lastmod` = lehe viimane TÕELINE sisumuutus — kunagi mitte build-kuupäev
// ega kontrollkuupäev (`checkedAt` liigub igal nädalal, ka kui miski ei muutunud).
//
// Ainus päris muutuskuupäev, mis meil on, on AMOS-i feedi `dataUpdatedAt`
// (kogu kataloogi kohta, mitte programmi kohta). Seepärast saavad lastmodi AINULT
// lehed, mille sisu on tervikuna kataloogi loend/koond; programmi enda leht
// (/kataloog/<id>/), /vordlus/, /maakond/ jt saavad lastmodi ära jätta, sest
// programmikirjel ei ole oma muutuskuupäeva (ainult sourceCheckedAt = kontrollitud).

const CATALOG_LISTING_EXACT = new Set(["/kataloog/", "/registreerimine/"]);
const CATALOG_LISTING_PREFIXES = ["/valdkond/", "/koolitaja/"];

export function sitemapLastmod(pathname: string, dataUpdatedAt: string | null | undefined): string | undefined {
  if (!dataUpdatedAt || !/^\d{4}-\d{2}-\d{2}/.test(dataUpdatedAt)) return undefined;
  const isListing =
    CATALOG_LISTING_EXACT.has(pathname) || CATALOG_LISTING_PREFIXES.some((p) => pathname.startsWith(p));
  return isListing ? new Date(dataUpdatedAt.slice(0, 10)).toISOString() : undefined;
}
