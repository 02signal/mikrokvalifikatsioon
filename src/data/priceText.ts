// Väikseim ühine hinnaparser — omaette failis, et src/data/courseSchema.ts ja
// src/data/priceGuard.ts saaksid mõlemad seda kasutada ilma ringsõltuvuseta
// (courseSchema kasutab priceGuard'i JSON-LD offers jaoks; priceGuard kasutab
// seda parserit — kui see elaks courseSchema.ts sees, tekiks tsükkel).

/**
 * Parsib hinna eurodes. Tundmatu/parsimatu = null (ära kunagi leiuta).
 * "tasuta" -> 0. "alates 1200 €" -> 1200 (esindushind).
 */
export function parsePriceEur(text: string | null | undefined): number | null {
  if (!text) return null;
  if (/tasuta/i.test(text)) return 0;
  const match = text.replace(/\s/g, "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}
