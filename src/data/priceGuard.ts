// Hinna usutavuse valvur — kaitseb saidi HINNAVÄITEID ühe vigase kirje eest.
//
// MIKS: register on providerite endi lehtedelt kokku korjatud ja üks hind võib
// olla valesti loetud (nt vahemiku "75–2 250 €" asemel jäi kirja ainult "75 €").
// AMOS on selle konkreetse juhtumi tuvastanud (#2613: Tallinna Ülikooli
// "Sooritus- ja spordipsühholoogia", 75 € 30 EAP kohta ehk 2,50 €/EAP — samas kui
// kataloogi mediaan on ~146 €/EAP). AMOS PR #2614 lisas tootja poolel läbivaatuse
// signaali, aga TEADLIKULT ei paranda hinda ise — inimese ülevaatus jääb
// autoriteetseks. Seega see väärtus jääb feedi sisse, kuni keegi TLÜ lehe üle
// vaatab, ja saidi pool peab suutma seda ise ära tunda.
//
// SAMA LÄVI MIS AMOS: `amos.mkval.price_integrity/v1` loeb hinna kahtlaseks, kui
// €/EAP jääb alla `min(20, kataloogi_mediaan_€/EAP × 0.25)`. Kordame SEDA SAMA
// valemit siin, tootja- ja tarbijapoolne kontrakt ei tohi lahku minna — kui AMOS
// muudab lävendit, tuleb see kommentaar (ja väärtus) siin sünkroonis uuendada.
//
// KUS KEHTIB: ainult AGREGAATVÄITED (hinnavahemikud, mediaanid, OG-kaardi
// alapealkiri, JSON-LD offers) — kohad, kus SAIT ISE midagi väidab. Programmi
// enda lehe sisu (mis peegeldab registrit sõna-sõnalt) EI LÄBI seda valvurit —
// vt src/pages/kataloog/[slug].astro, kus entry.priceText kuvatakse muutmata.
import { parsePriceEur } from "./priceText.ts";
import { catalog } from "./catalog/index.ts";

type PriceEvidence = {
  priceText?: string | null;
  ects?: number | null;
};

function pricePerEap(priceText: string | null | undefined, ects: number | null | undefined): number | null {
  const price = parsePriceEur(priceText);
  // 0 € ("tasuta") on TEADLIK signaal (nt sihtrühmale rahastatud), mitte kahtlane
  // väärtus — jäta mediaani arvutusest ja lävendist välja.
  if (price == null || price <= 0 || !ects) return null;
  return price / ects;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Kataloogi mediaan €/EAP — arvutatud üks kord kõigist kirjetest, millel on
// NII hind KUI EAP teada (ilma EAP-ta ei saa €/EAP-d hinnata).
const CATALOGUE_MEDIAN_EUR_PER_EAP = median(
  catalog
    .map((entry) => pricePerEap(entry.priceText, entry.ects))
    .filter((n): n is number => n != null)
);

/** amos.mkval.price_integrity/v1 lävend: min(20, kataloogi mediaan × 0.25) €/EAP. */
export const PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP =
  CATALOGUE_MEDIAN_EUR_PER_EAP != null ? Math.min(20, CATALOGUE_MEDIAN_EUR_PER_EAP * 0.25) : 20;

/**
 * Tagastab parsitud hinna, VÄLJA ARVATUD kui €/EAP on ebausutavalt madal
 * (kahtlane lähteväärtus, mitte tõend odavast programmist). Kui EAP puudub
 * või on 0, pole hinna kohta tõendit — käsitle hinda usutavana (ei blokeeri).
 * Tasuta ("0 €") on alati usutav — see on tootja teadlik signaal, mitte viga.
 */
export function plausiblePriceEur(entry: PriceEvidence): number | null {
  const price = parsePriceEur(entry.priceText);
  if (price == null || price <= 0) return price; // null või "tasuta" (0) — mõlemad läbivad muutmata
  if (!entry.ects) return price; // pole EAP-tõendit, mille vastu hinnata → usutav
  const perEap = price / entry.ects;
  return perEap < PRICE_PLAUSIBILITY_FLOOR_EUR_PER_EAP ? null : price;
}
