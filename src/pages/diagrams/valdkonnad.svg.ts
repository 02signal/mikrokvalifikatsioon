// Data-driven diagram: which fields have the most programmes (live catalog).
// Served as /diagrams/valdkonnad.svg, rasterised after the build.
import { questionStats } from "../../data/questions";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clip = (s: string): string => (s.length > 22 ? `${s.slice(0, 21)}…` : s);

export async function GET() {
  const rows = questionStats.fields.rows.slice(0, 5);
  const total = questionStats.fields.count;
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const BAR_X = 250;
  const BAR_MAX = 300;
  const Y = [164, 196, 228, 260, 292];
  const BAR_H = 20;

  const bars = rows
    .map((r, i) => {
      const yc = Y[i];
      const w = Math.max(2, (r.count / maxCount) * BAR_MAX);
      const hot = i === 0;
      const fill = hot ? "#2f9e95" : "#d5dde4";
      const numFill = hot ? "#1f6f68" : "#7a8798";
      return `    <text x="44" y="${yc + 5}" font-size="14" font-weight="${hot ? 700 : 600}" fill="#3a4a57">${clip(cap(r.field))}</text>
    <rect x="${BAR_X}" y="${yc - BAR_H / 2}" width="${w.toFixed(1)}" height="${BAR_H}" rx="5" fill="${fill}"/>
    <text x="${(BAR_X + w + 10).toFixed(1)}" y="${yc + 5}" font-size="13.5" font-weight="700" fill="${numFill}">${r.count}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="t d" width="640" height="360">
  <title id="t">Populaarseimad mikrokvalifikatsiooni valdkonnad</title>
  <desc id="d">Registri programmid jagunevad ${total} valdkonna vahel. Enim pakutavad on ${rows.map((r) => `${cap(r.field)} (${r.count})`).join(", ")}. Iga valdkonna programme saab vaadata eraldi valdkonnalehel.</desc>
  <rect width="640" height="360" fill="#ffffff"/>
  <g font-family="${FONT}">
    <text x="44" y="50" font-size="14" letter-spacing="2.5" font-weight="700" fill="#7a8798">VALDKONNAD</text>
    <text x="44" y="92" font-size="29" font-weight="800" fill="#1a2733">Populaarseimad teemad</text>
    <text x="44" y="118" font-size="15.5" fill="#5a6b80">mitu programmi igas valdkonnas (top 5)</text>
${bars}
    <text x="44" y="332" font-size="14" fill="#5a6b80"><tspan font-weight="700" fill="#1a2733">${total} valdkonda</tspan> kokku — vaata igaüht valdkonnalehel.</text>
  </g>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
