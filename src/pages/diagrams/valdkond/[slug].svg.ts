// Data-driven diagram: a compact profile per field (programme count, EAP range,
// price range) built at build time from the live catalog. One SVG per field at
// /diagrams/valdkond/<slug>.svg, rasterised (recursively) after the build.
import { catalog, fieldsWithSlug } from "../../../data/catalog";
import { parsePriceEur } from "../../../data/courseSchema";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const fmtEur = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export function getStaticPaths() {
  return fieldsWithSlug.map((f) => ({ params: { slug: f.slug }, props: { field: f.field } }));
}

export function GET({ props }: { props: { field: string } }) {
  const field = props.field;
  const fieldCap = field.charAt(0).toUpperCase() + field.slice(1);
  const entries = catalog.filter((e) => e.field === field);
  const providers = new Set(entries.map((e) => e.provider)).size;
  const degreeCount = entries.filter((e) => e.providerType === "ülikool").length;
  const ectsVals = entries.map((e) => e.ects).filter((n): n is number => n != null);
  const minEcts = ectsVals.length ? Math.min(...ectsVals) : null;
  const maxEcts = ectsVals.length ? Math.max(...ectsVals) : null;
  const prices = entries.map((e) => parsePriceEur(e.priceText)).filter((p): p is number => p != null && p > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const ectsText = minEcts != null && maxEcts != null ? (minEcts === maxEcts ? `${minEcts}` : `${minEcts}–${maxEcts}`) : "—";
  const priceText = minPrice != null && maxPrice != null ? (minPrice === maxPrice ? fmtEur(minPrice) : `${fmtEur(minPrice)}–${fmtEur(maxPrice)}`) : "kooli lehel";
  const priceFont = priceText.length > 12 ? 19 : 24;
  const headFont = fieldCap.length > 22 ? 25 : 30;

  const token = (x: number, value: string, label: string, valueFont: number) =>
    `    <rect x="${x}" y="168" width="168" height="104" rx="13" fill="#eaf6f4"/>
    <text x="${x + 84}" y="220" font-size="${valueFont}" font-weight="800" fill="#227b73" text-anchor="middle">${value}</text>
    <text x="${x + 84}" y="248" font-size="13" fill="#5a8f89" text-anchor="middle">${label}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="t d" width="640" height="360">
  <title id="t">${fieldCap}: mikrokraadid ja mikrokvalifikatsioonid</title>
  <desc id="d">${fieldCap} valdkonnas on ${entries.length} mikrokraadi ja mikrokvalifikatsiooni ${providers} koolist${degreeCount > 0 ? `, sh ${degreeCount} ülikooli mikrokraadi` : ""}. Maht ${ectsText === "—" ? "kooli lehel" : `${ectsText} EAP`}, hind ${priceText}.</desc>
  <rect width="640" height="360" fill="#ffffff"/>
  <g font-family="${FONT}">
    <text x="44" y="52" font-size="14" letter-spacing="2.5" font-weight="700" fill="#7a8798">VALDKOND</text>
    <text x="44" y="96" font-size="${headFont}" font-weight="800" fill="#1a2733">${fieldCap}</text>
    <text x="44" y="126" font-size="15.5" fill="#5a6b80">${providers} koolist${degreeCount > 0 ? ` · ${degreeCount} ülikooli mikrokraadi` : ""}</text>
${token(44, String(entries.length), "programmi", 40)}
${token(236, ectsText, "EAP maht", ectsText.length > 5 ? 26 : 32)}
${token(428, priceText, "hind", priceFont)}
    <text x="44" y="316" font-size="15" fill="#5a6b80">Võrdle mahtu, hinda ja õppevormi <tspan font-weight="700" fill="#1a2733">valdkonnalehel</tspan>.</text>
    <text x="596" y="346" font-size="12" fill="#9aa7b4" text-anchor="end">mikrokvalifikatsioon.ee</text>
  </g>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
