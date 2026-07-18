// Data-driven diagram: how many programmes run online / blended / on-site (live
// catalog counts). Served as /diagrams/oppevorm.svg, rasterised after the build.
import { questionStats } from "../../data/questions";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export async function GET() {
  const f = questionStats.format;
  const rows = [
    { label: "Veebis", count: f.online, hot: true },
    { label: "Hübriidis", count: f.blended, hot: true },
    { label: "Kohapeal", count: f.onsite, hot: false }
  ];
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const BAR_X = 168;
  const BAR_MAX = 330;
  const Y = [176, 222, 268];
  const BAR_H = 28;

  const bars = rows
    .map((r, i) => {
      const yc = Y[i];
      const w = Math.max(2, (r.count / maxCount) * BAR_MAX);
      const fill = r.hot ? "#2f9e95" : "#d5dde4";
      const numFill = r.hot ? "#1f6f68" : "#7a8798";
      return `    <text x="44" y="${yc + 5}" font-size="15" font-weight="700" fill="#3a4a57">${r.label}</text>
    <rect x="${BAR_X}" y="${yc - BAR_H / 2}" width="${w.toFixed(1)}" height="${BAR_H}" rx="6" fill="${fill}"/>
    <text x="${(BAR_X + w + 10).toFixed(1)}" y="${yc + 5}" font-size="14" font-weight="700" fill="${numFill}">${r.count}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="t d" width="640" height="360">
  <title id="t">Mikrokvalifikatsioone saab läbida veebis, hübriidis või kohapeal</title>
  <desc id="d">Registris on ${f.online} täielikult veebipõhist ja ${f.blended} hübriidprogrammi — kokku ${f.onlineOrBlended} programmi saab läbida ilma iga kord kohale tulemata. Kohapeal toimub ${f.onsite}. Õpe käib enamasti töö kõrvalt.</desc>
  <rect width="640" height="360" fill="#ffffff"/>
  <g font-family="${FONT}">
    <text x="44" y="50" font-size="14" letter-spacing="2.5" font-weight="700" fill="#7a8798">ÕPPEVORM</text>
    <text x="44" y="92" font-size="29" font-weight="800" fill="#1a2733">Paljud saab läbida veebis</text>
    <text x="44" y="118" font-size="15.5" fill="#5a6b80">mitu programmi igas õppevormis</text>
${bars}
    <text x="44" y="330" font-size="14" fill="#5a6b80">Veebis või hübriidis <tspan font-weight="700" fill="#1a2733">saab õppida töö kõrvalt</tspan>.</text>
  </g>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
