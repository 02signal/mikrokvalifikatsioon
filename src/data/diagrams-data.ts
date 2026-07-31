/**
 * Andmepõhised selgitavad joonised — ehitatud REAALSEST kataloogist (mitte
 * sisse kirjutatud), aga kirjeldatud sama `Diagram`-kujundussüsteemi kaudu mis
 * `src/data/diagrams.ts`. Nii näevad ka arvutuslikud joonised täpselt samamoodi
 * välja kui käsitsi kirjutatud omad, ja üks parandus `src/lib/diagram.ts`-is
 * parandab kõiki korraga.
 *
 * `dataDiagrams()` annab tagasi need viis üldist joonist, mis on kunagi olnud
 * omaette käsitsi kirjutatud SVG-lõpp-punktid:
 *   hind, eap-jaotus, valdkonnad, oppevorm, ehis-tunnustatud
 * Need lisatakse `src/pages/diagrams/[id].svg.ts` ja `stacked/[id].svg.ts`
 * registrisse, nii et URL-id (`/diagrams/hind.svg` jne) ei muutu.
 *
 * `fieldDiagram(field)` ehitab per-valdkonna profiili joonise
 * (`/diagrams/valdkond/<slug>.svg`), kasutades otse kataloogi kirjeid.
 */
import { catalog } from "./catalog";
import { plausiblePriceEur } from "./priceGuard";
import { questionStats } from "./questions";
import type { Diagram } from "../lib/diagram";

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtEur = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

/** Viis andmepõhist joonist, mis varem olid omaette käsitsi kirjutatud SVG-d. */
export function dataDiagrams(): Diagram[] {
  return [hindDiagram(), eapJaotusDiagram(), valdkonnadDiagram(), oppevormDiagram(), ehisTunnustatudDiagram()];
}

function hindDiagram(): Diagram {
  const p = questionStats.price;
  const min = p.min ?? 300;
  const max = p.max ?? 4000;
  const p25 = p.p25 ?? 700;
  const p75 = p.p75 ?? 1800;
  const median = p.median ?? 1440;

  return {
    id: "hind",
    kicker: "Hind",
    headline: `Tavaliselt ${fmtEur(p25)}–${fmtEur(p75)}`,
    deck: "sõltub mahust (EAP) ja koolist",
    body: {
      kind: "range",
      min,
      max,
      band: [p25, p75],
      marker: { value: median, label: `mediaan ${fmtEur(median)}` },
      minLabel: fmtEur(min),
      maxLabel: fmtEur(max),
      bandLabel: "tüüpiline vahemik",
    },
    takeaway: "Küsi kõigepealt tööandjalt või Töötukassalt — sageli ei maksa õppija kogu summat ise.",
    alt:
      `Registris avaldatud õppetasud ulatuvad ${fmtEur(min)}-st ${fmtEur(max)}-ni. Tüüpiline vahemik ` +
      `(25.–75. protsentiil) on ${fmtEur(p25)}–${fmtEur(p75)}, mediaan ${fmtEur(median)}. Hind sõltub mahust ` +
      `(EAP) ja koolist; osa programme on sihtrühmale rahastatud.`,
    caption: "Tüüpiline vahemik on 25.–75. protsentiil kõigist hindadest; punkt on mediaan. Sõltub mahust ja koolist.",
  };
}

function eapJaotusDiagram(): Diagram {
  const buckets = questionStats.ects.buckets;
  const common = questionStats.ects.commonBucket;
  const commonLabel = common ? common.label : "12–18 EAP";
  const hoursLo = questionStats.hours.lo ?? 156;
  const hoursHi = questionStats.hours.hi ?? 780;

  return {
    id: "eap-jaotus",
    kicker: "Maht (EAP)",
    headline: `Enamik on ${commonLabel}`,
    deck: "mitu mikrokraadi jääb igasse vahemikku",
    body: {
      kind: "bars",
      bars: buckets.map((b) => ({
        label: b.label,
        value: b.count,
        display: String(b.count),
        emphasis: common ? b.label === common.label : true,
      })),
    },
    takeaway: `1 EAP ≈ 26 tundi — tüüpiline maht tähendab umbes ${hoursLo}–${hoursHi} tundi õppija tööd kokku.`,
    alt:
      `Registri mikrokraadid EAP-vahemike kaupa: ${buckets.map((b) => `${b.label} — ${b.count}`).join("; ")}. ` +
      `Kõige sagedasem maht on ${commonLabel}. 1 EAP ≈ 26 tundi õppija tööd.`,
    caption: "Mikrokraadi maht EAP-vahemike kaupa; esile tõstetud on kõige sagedasem vahemik.",
  };
}

function valdkonnadDiagram(): Diagram {
  const rows = questionStats.fields.rows.slice(0, 5);
  const total = questionStats.fields.count;
  const topLabel = rows.length ? cap(rows[0].field) : "IT ja andmed";

  return {
    id: "valdkonnad",
    kicker: "Valdkonnad",
    headline: `${topLabel} on populaarseim valdkond`,
    deck: `top 5 valdkonda ${total}-st`,
    body: {
      kind: "bars",
      bars: rows.map((r, i) => ({ label: cap(r.field), value: r.count, display: String(r.count), emphasis: i === 0 })),
    },
    takeaway: `${total} valdkonda kokku — vaata igaüht valdkonnalehel.`,
    alt:
      `Registri programmid jagunevad ${total} valdkonna vahel. Enim pakutavad on ` +
      `${rows.map((r) => `${cap(r.field)} (${r.count})`).join(", ")}. Iga valdkonna programme saab vaadata eraldi valdkonnalehel.`,
    caption: "Enim pakutavad valdkonnad programmide arvu järgi. Iga valdkonda saab vaadata eraldi valdkonnalehel.",
  };
}

function oppevormDiagram(): Diagram {
  const f = questionStats.format;
  const rows = [
    { label: "Veebis", count: f.online, hot: true },
    { label: "Hübriidis", count: f.blended, hot: true },
    { label: "Kohapeal", count: f.onsite, hot: false },
  ];

  return {
    id: "oppevorm",
    kicker: "Õppevorm",
    headline: "Paljud saab läbida veebis",
    deck: "mitu programmi igas õppevormis",
    body: {
      kind: "bars",
      bars: rows.map((r) => ({ label: r.label, value: r.count, display: String(r.count), emphasis: r.hot })),
    },
    takeaway: "Veebis või hübriidis saab õppida töö kõrvalt.",
    alt:
      `Registris on ${f.online} täielikult veebipõhist ja ${f.blended} hübriidprogrammi — kokku ` +
      `${f.onlineOrBlended} programmi saab läbida ilma iga kord kohale tulemata. Kohapeal toimub ${f.onsite}. ` +
      `Õpe käib enamasti töö kõrvalt.`,
    caption: "Mitu programmi igas õppevormis. Veebis või hübriidis saab õppida töö kõrvalt.",
  };
}

function ehisTunnustatudDiagram(): Diagram {
  const programmes = questionStats.ehisProgrammeCount;
  const providers = questionStats.ehisProviderCount;

  return {
    id: "ehis-tunnustatud",
    kicker: "Ametlik",
    headline: "EHIS-es registreeritud",
    deck: "riiklik register — Haridus- ja Teadusministeerium",
    body: {
      kind: "cards",
      cards: [
        { label: String(programmes), sub: "registreeritud õppekava" },
        { label: String(providers), sub: "pakkujat" },
      ],
    },
    takeaway: "Tunnistus tõendab EHIS-es kinnitatud õppekava läbimist.",
    alt:
      `Mikrokvalifikatsioonid on Eesti Hariduse Infosüsteemis (EHIS) registreeritud õppekavad — riiklik register, ` +
      `mida peab Haridus- ja Teadusministeerium. EHIS-es on ${programmes} registreeritud mikrokvalifikatsiooni ` +
      `õppekava ${providers} pakkujalt. Tunnistus tõendab EHIS-es kinnitatud õppekava läbimist.`,
    caption: "Mikrokvalifikatsioonid on EHIS-es registreeritud õppekavad (riiklik register). Tunnistus tõendab kinnitatud õppekava läbimist.",
  };
}

/** Valdkonna profiil-joonis (`/diagrams/valdkond/<slug>.svg`) — programmide arv,
 *  EAP-maht ja hinnavahemik selle valdkonna kirjetest. */
export function fieldDiagram(field: string): Diagram {
  const fieldCap = cap(field);
  const entries = catalog.filter((e) => e.field === field);
  const providersInField = new Set(entries.map((e) => e.provider)).size;
  const degreeCount = entries.filter((e) => e.providerType === "ülikool").length;

  const ectsVals = entries.map((e) => e.ects).filter((n): n is number => n != null);
  const minEcts = ectsVals.length ? Math.min(...ectsVals) : null;
  const maxEcts = ectsVals.length ? Math.max(...ectsVals) : null;
  const ectsText =
    minEcts != null && maxEcts != null ? (minEcts === maxEcts ? `${minEcts} EAP` : `${minEcts}–${maxEcts} EAP`) : "kooli lehel";

  // plausiblePriceEur (not parsePriceEur): a €/EAP outlier that is almost
  // certainly a bad source reading must not define this field's diagram card
  // (see src/data/priceGuard.ts).
  const prices = entries.map((e) => plausiblePriceEur(e)).filter((p): p is number => p != null && p > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const priceText =
    minPrice != null && maxPrice != null ? (minPrice === maxPrice ? fmtEur(minPrice) : `${fmtEur(minPrice)}–${fmtEur(maxPrice)}`) : "kooli lehel";

  return {
    id: `valdkond-${field}`,
    kicker: "Valdkond",
    headline: `${fieldCap}: ${entries.length} programmi valikus`,
    deck: `${providersInField} koolist${degreeCount > 0 ? ` · ${degreeCount} ülikooli mikrokraadi` : ""}`,
    body: {
      kind: "cards",
      cards: [
        { label: String(entries.length), sub: "programmi", emphasis: true },
        { label: ectsText, sub: "EAP maht" },
        { label: priceText, sub: "hind" },
      ],
    },
    takeaway: "Võrdle mahtu, hinda ja õppevormi tabelis allpool.",
    alt:
      `${fieldCap} valdkonnas on ${entries.length} mikrokraadi ja mikrokvalifikatsiooni ${providersInField} koolist` +
      `${degreeCount > 0 ? `, sh ${degreeCount} ülikooli mikrokraadi` : ""}. Maht ${ectsText}, hind ${priceText}.`,
    caption: `${fieldCap}: programmide arv, EAP-maht ja hinnavahemik registri andmetel.`,
  };
}
