// Data-driven diagram: the official EHIS register footprint (trust signal, live
// numbers). Served as /diagrams/ehis-tunnustatud.svg, rasterised after the build.
import { questionStats } from "../../data/questions";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export async function GET() {
  const programmes = questionStats.ehisProgrammeCount;
  const providers = questionStats.ehisProviderCount;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-labelledby="t d" width="640" height="360">
  <title id="t">Mikrokvalifikatsioonid on EHIS-es ametlikult registreeritud</title>
  <desc id="d">Mikrokvalifikatsioonid on Eesti Hariduse Infosüsteemis (EHIS) registreeritud õppekavad — riiklik register, mida peab Haridus- ja Teadusministeerium. EHIS-es on ${programmes} registreeritud mikrokvalifikatsiooni õppekava ${providers} pakkujalt. Tunnistus tõendab EHIS-es kinnitatud õppekava läbimist.</desc>
  <rect width="640" height="360" fill="#ffffff"/>
  <g font-family="${FONT}">
    <text x="44" y="52" font-size="14" letter-spacing="2.5" font-weight="700" fill="#7a8798">AMETLIK</text>
    <text x="44" y="96" font-size="32" font-weight="800" fill="#1a2733">EHIS-es registreeritud</text>
    <text x="44" y="128" font-size="16" fill="#5a6b80">riiklik register — Haridus- ja Teadusministeerium</text>

    <rect x="44" y="168" width="256" height="104" rx="14" fill="#eaf6f4"/>
    <text x="172" y="228" font-size="46" font-weight="800" fill="#227b73" text-anchor="middle">${programmes}</text>
    <text x="172" y="252" font-size="15" fill="#5a8f89" text-anchor="middle">registreeritud õppekava</text>

    <rect x="312" y="168" width="256" height="104" rx="14" fill="#eaf6f4"/>
    <text x="440" y="228" font-size="46" font-weight="800" fill="#227b73" text-anchor="middle">${providers}</text>
    <text x="440" y="252" font-size="15" fill="#5a8f89" text-anchor="middle">pakkujat</text>

    <text x="44" y="316" font-size="15" fill="#5a6b80">Tunnistus tõendab <tspan font-weight="700" fill="#1a2733">EHIS-es kinnitatud õppekava</tspan> läbimist.</text>
    <text x="596" y="346" font-size="12" fill="#9aa7b4" text-anchor="end">mikrokvalifikatsioon.ee</text>
  </g>
</svg>
`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
}
