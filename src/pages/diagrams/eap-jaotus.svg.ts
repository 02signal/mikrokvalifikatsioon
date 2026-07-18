// Data-driven explainer diagram: how many microdegrees fall in each EAP band
// (built at build time from the real catalog, so counts stay current). Served as
// /diagrams/eap-jaotus.svg and rasterised to PNG + OG after the build.
import { questionStats } from "../../data/questions";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export async function GET() {
  const buckets = questionStats.ects.buckets;
  const common = questionStats.ects.commonBucket;
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const LABEL_X = 44;
  const BAR_X = 168;
  const BAR_MAX = 320; // px at maxCount
  const ROW_Y = [172, 212, 252, 292];
  const BAR_H = 26;

  const rows = buckets
    .slice(0, 4)
    .map((b, i) => {
      const yc = ROW_Y[i];
      const w = Math.max(2, (b.count / maxCount) * BAR_MAX);
      const isCommon = common && b.label === common.label;
      const fill = isCommon ? "#2f9e95" : "#d5dde4";
      const numFill = isCommon ? "#1f6f68" : "#7a8798";
      return `    <text x="${LABEL_X}" y="${yc + 5}" font-size="14.5" font-weight="${isCommon ? 700 : 600}" fill="#3a4a57">${b.label}</text>
    <rect x="${BAR_X}" y="${yc - BAR_H / 2}" width="${w.toFixed(1)}" height="${BAR_H}" rx="5" fill="${fill}"/>
    <text x="${(BAR_X + w + 10).toFixed(1)}" y="${yc + 5}" font-size="14" font-weight="700" fill="${numFill}">${b.count}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="t d" width="640" height="360">
  <title id="t">Mikrokraadi maht: enamik ${common ? common.label : "12–18 EAP"}</title>
  <desc id="d">Registri mikrokraadid EAP-vahemike kaupa: ${buckets.map((b) => `${b.label} — ${b.count}`).join("; ")}. Kõige sagedasem maht on ${common ? common.label : "12–18 EAP"}. 1 EAP ≈ 26 tundi õppija tööd.</desc>
  <rect width="640" height="360" fill="#ffffff"/>
  <g font-family="${FONT}">
    <text x="44" y="50" font-size="14" letter-spacing="2.5" font-weight="700" fill="#7a8798">MAHT (EAP)</text>
    <text x="44" y="92" font-size="29" font-weight="800" fill="#1a2733">Enamik ${common ? common.label : "12–18 EAP"}</text>
    <text x="44" y="118" font-size="15.5" fill="#5a6b80">mitu mikrokraadi jääb igasse vahemikku</text>
${rows}
    <text x="44" y="336" font-size="14" fill="#5a6b80">1 EAP ≈ 26 tundi → tüüpiline maht umbes 156–780 tundi.</text>
  </g>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
