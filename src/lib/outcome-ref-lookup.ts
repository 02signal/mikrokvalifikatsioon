// Kliendipoolne õpiväljundi teksti -> serveri-viite otsing, MITTE ühtegi andmemoodulit importides.
//
// MIKS: konto-lehe klienditskript importis varem `data/outcomeRefs.ts`, mis impordib `data/catalog`,
// ja nii bundliti avalikku /_astro/*.js faili kogu RAW feed (ka robots-keeluga allikate hinnad ja
// kokkuvõtted). Nüüd ehitab server kitsa kaardi (`outcomeRefMap`, ainult tekst-võti -> viide) ja annab
// selle lehele JSON-ina; klient teeb vaid selle otsingu. Dedup-võti on SAMA mis `data/outcomeRefs.ts`.

export type OutcomeRefLookupMap = Record<string, { outcome_ref: string }>;

function dedupKey(text: string): string {
  return text.trim().toLowerCase();
}

/** @returns `out_<24 hex>` viide või `null`, kui tekst pole kaardil. */
export function makeOutcomeRefLookup(map: OutcomeRefLookupMap): (text: string) => string | null {
  return (text: string) => {
    if (typeof text !== "string") return null;
    const rec = map[dedupKey(text)];
    return rec ? rec.outcome_ref : null;
  };
}
