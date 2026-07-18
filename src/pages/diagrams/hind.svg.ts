// Data-driven explainer diagram: microdegree price range (built at build time from
// the real catalog stats, so the numbers never go stale). Served as /diagrams/hind.svg
// and rasterised to PNG + OG by scripts/rasterize-diagrams.mjs after the build.
import { questionStats } from "../../data/questions";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

const fmt = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export async function GET() {
  const p = questionStats.price;
  const min = p.min ?? 300;
  const max = p.max ?? 4000;
  const p25 = p.p25 ?? 700;
  const p75 = p.p75 ?? 1800;
  const median = p.median ?? 1440;

  const X0 = 60;
  const X1 = 580;
  const span = Math.max(1, max - min);
  const x = (v: number): number => X0 + ((Math.min(max, Math.max(min, v)) - min) / span) * (X1 - X0);
  const y = 202;
  // Hoia mediaani silt servadest eemal.
  const mx = Math.min(X1 - 60, Math.max(X0 + 60, x(median)));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="t d" width="640" height="360">
  <title id="t">Mikrokraad maksab tavaliselt ${fmt(p25)}–${fmt(p75)}</title>
  <desc id="d">Registris avaldatud õppetasud ulatuvad ${fmt(min)}-st ${fmt(max)}-ni. Tüüpiline vahemik (25.–75. protsentiil) on ${fmt(p25)}–${fmt(p75)}, mediaan ${fmt(median)}. Hind sõltub mahust (EAP) ja koolist; osa programme on sihtrühmale rahastatud.</desc>
  <rect width="640" height="360" fill="#ffffff"/>
  <g font-family="${FONT}">
    <text x="44" y="52" font-size="14" letter-spacing="2.5" font-weight="700" fill="#7a8798">HIND</text>
    <text x="44" y="96" font-size="34" font-weight="800" fill="#1a2733">Tavaliselt ${fmt(p25)}–${fmt(p75)}</text>
    <text x="44" y="128" font-size="16" fill="#5a6b80">sõltub mahust (EAP) ja koolist</text>
    <line x1="${X0}" y1="${y}" x2="${X1}" y2="${y}" stroke="#e4e9ee" stroke-width="12" stroke-linecap="round"/>
    <line x1="${x(p25).toFixed(1)}" y1="${y}" x2="${x(p75).toFixed(1)}" y2="${y}" stroke="#2f9e95" stroke-width="12" stroke-linecap="round"/>
    <circle cx="${x(median).toFixed(1)}" cy="${y}" r="10" fill="#ffffff" stroke="#1f6f68" stroke-width="3"/>
    <text x="${mx.toFixed(1)}" y="${y - 22}" font-size="14" font-weight="700" fill="#1f6f68" text-anchor="middle">mediaan ${fmt(median)}</text>
    <text x="${X0}" y="${y + 34}" font-size="13" fill="#8a97a6">${fmt(min)}</text>
    <text x="${X1}" y="${y + 34}" font-size="13" fill="#8a97a6" text-anchor="end">${fmt(max)}</text>
    <text x="44" y="316" font-size="15" fill="#5a6b80">Teal = tüüpiline vahemik (25.–75. protsentiil). Osa on sihtrühmale rahastatud.</text>
    <text x="596" y="346" font-size="12" fill="#9aa7b4" text-anchor="end">mikrokvalifikatsioon.ee</text>
  </g>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
